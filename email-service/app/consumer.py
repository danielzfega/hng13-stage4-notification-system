import os
import asyncio
import json
import aio_pika
from aio_pika import Message, DeliveryMode, ExchangeType
from app.email_sender import send_email
from app.idempotency import create_redis_pool, Idempotency
from app.schemas import EmailMessagePayload
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
    try:
        print(f"Connecting to Redis...")
        redis_pool = await create_redis_pool()
        idemp = Idempotency(redis_pool)
        print(f"Redis connected successfully")

        print(f"Connecting to RabbitMQ at {RABBIT_URL}...")
        connection = await aio_pika.connect_robust(RABBIT_URL)
        print(f"RabbitMQ connected successfully")

        async with connection:
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=10)

            exchange = await channel.declare_exchange(EXCHANGE_NAME, ExchangeType.DIRECT, durable=True)
            print(f"Exchange '{EXCHANGE_NAME}' declared")

            # declare DLQ
            dlq = await channel.declare_queue(DLQ_NAME, durable=True)
            print(f"DLQ '{DLQ_NAME}' declared")

            # declare main queue with dead-lettering to DLQ
            queue = await channel.declare_queue(QUEUE_NAME, durable=True)
            await queue.bind(exchange, routing_key=os.getenv("ROUTING_KEY", "email"))
            print(
                f"Queue '{QUEUE_NAME}' declared and bound to routing key 'email'")
            print(f"✅ Email consumer ready and listening for messages...")

            async with queue.iterator() as queue_iter:
                async for message in queue_iter:
                    async with message.process(requeue=False):
                        headers = message.headers or {}
                        retries = int(headers.get("x-retries", 0))
                        try:
                            print(f"📧 Received email notification message")
                            print(f"📄 Message body: {message.body.decode()}")
                            result = await process_message(message.body, headers)
                            print(f"✅ Processed message successfully:", result)
                        except Exception as exc:
                            print(
                                f"❌ Processing failed with exception: {type(exc).__name__}")
                            print(f"❌ Error details: {str(exc)}")
                            import traceback
                            print(f"❌ Traceback: {traceback.format_exc()}")
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
                                    routing_key=os.getenv(
                                        "ROUTING_KEY", "email")
                                )
                                print(
                                    f"🔄 Requeued message, attempt {retries}/{MAX_RETRIES}")
                            else:
                                # publish to DLQ for manual inspection
                                await channel.default_exchange.publish(
                                    Message(
                                        message.body, delivery_mode=DeliveryMode.PERSISTENT),
                                    routing_key=DLQ_NAME
                                )
                                print(
                                    f"💀 Moved message to DLQ after {MAX_RETRIES} retries")
    except Exception as e:
        print(f"❌ Consumer error: {e}")
        import traceback
        traceback.print_exc()
        raise
