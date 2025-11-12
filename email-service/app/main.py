import asyncio
import os
from fastapi import FastAPI, HTTPException
from app.consumer import consume
from app.idempotency import create_redis_pool
from app.idempotency import Idempotency
from pydantic import BaseModel
import aio_pika
import json

app = FastAPI(title="Email Service")

consumer_task = None

@app.on_event("startup")
async def startup_event():
    # Start background consumer
    global consumer_task
    consumer_task = asyncio.create_task(consume())
    print("Started RabbitMQ consumer task")

@app.on_event("shutdown")
async def shutdown_event():
    global consumer_task
    if consumer_task:
        consumer_task.cancel()
        await asyncio.sleep(0.1)

@app.get("/health")
async def health():
    return {"status": "ok"}

class SendRequest(BaseModel):
    request_id: str
    to: str
    subject: str | None = None
    body: str | None = None
    template_name: str | None = None
    variables: dict | None = None

@app.post("/send", status_code=202)
async def send_manual(req: SendRequest):
    """
    Manual endpoint to publish an email message into RabbitMQ (for testing).
    """
    RABBIT_URL = os.getenv("RABBIT_URL", "amqp://guest:guest@rabbitmq:5672")
    EXCHANGE = os.getenv("EXCHANGE", "notifications.direct")
    ROUTING_KEY = os.getenv("ROUTING_KEY", "email")

    connection = await aio_pika.connect_robust(RABBIT_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(EXCHANGE, aio_pika.ExchangeType.DIRECT, durable=True)
        payload = req.dict()
        await exchange.publish(
            aio_pika.Message(
                json.dumps(payload).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                headers={"x-retries": 0}
            ),
            routing_key=ROUTING_KEY
        )
    return {"success": True, "message": "queued", "request_id": req.request_id}
