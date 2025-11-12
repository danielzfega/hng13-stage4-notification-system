import os
import asyncio
import json
import aio_pika
from aio_pika import Message, DeliveryMode, ExchangeType
from .email_sender import send_email
from .idempotency import create_redis_pool, Idempotency
from .schemas import EmailMessagePayload
from typing import Any

RABBIT_URL = os.getenv("RABBIT_URL", "amqp://guest:guest@rabbitmq:5672")
EXCHANGE_NAME = os.getenv("EXCHANGE", "notifications.direct")
QUEUE_NAME = os.getenv("EMAIL_QUEUE", "email.queue")
DLQ_NAME = os.getenv("DEAD_LETTER_QUEUE", "failed.queue")
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "5"))
BASE_BACKOFF = int(os.getenv("BASE_BACKOFF_SECONDS", "2"))

redis_pool = None
idemp = None

async def exponential_backoff_sleep(attempt: int):
    await asyncio.sleep(BASE_BACKOFF * (2 ** (attempt - 1)))

async def process_message(body: bytes, headers: dict[str, Any]):
    payload_json = json.loads(body.decode())
    payload = EmailMessagePayload(**payload_json)
    # Idempotency check
    if await idemp.is_processed(payload.request_id):
        return {"skipped_duplicate": True}

    # Try to send email
    await send_email(payload.dict())
    # mark processed
    await idemp.mark_processed(payload.request_id)
    return {"sent": True}

async def consume():
    global redis_pool, idemp
    redis_pool = await create_redis_pool()
    idemp = Idempotency(redis_pool)

    connection = await aio_pika.connect_robust(RABBIT_URL)
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=10)

        exchange = await channel.declare_exchange(EXCHANGE_NAME, ExchangeType.DIRECT, durable=True)
        # declare DLQ
        dlq = await channel.declare_queue(DLQ_NAME, durable=True)

        # declare main queue with dead-lettering to DLQ
        # Note: many brokers allow queue args like x-dead-letter-exchange; here we use direct re-publish logic on failure
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)
        await queue.bind(exchange, routing_key=os.getenv("ROUTING_KEY", "email"))

        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process(requeue=False):
                    headers = message.headers or {}
                    retries = int(headers.get("x-retries", 0))
                    try:
                        result = await process_message(message.body, headers)
                        print("Processed message:", result)
                    except Exception as exc:
                        print("Processing failed:", exc)
                        # decide retry or move to dead-letter
                        retries += 1
                        if retries <= MAX_RETRIES:
                            # exponential backoff before re-publishing so we don't hammer SMTP
                            await exponential_backoff_sleep(retries)
                            await exchange.publish(
                                Message(
                                    message.body,
                                    delivery_mode=DeliveryMode.PERSISTENT,
                                    headers={"x-retries": retries}
                                ),
                                routing_key=os.getenv("ROUTING_KEY", "email")
                            )
                            print(f"Requeued message, attempt {retries}")
                        else:
                            # publish to DLQ for manual inspection
                            await dlq.publish(Message(message.body, delivery_mode=DeliveryMode.PERSISTENT))
                            print("Moved message to DLQ")
