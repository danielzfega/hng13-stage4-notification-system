# app/idempotency.py
import os
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
IDEMPOTENCY_TTL = int(os.getenv("IDEMPOTENCY_TTL", "86400"))  # 1 day default


class Idempotency:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def is_processed(self, request_id: str) -> bool:
        exists = await self.redis.exists(request_id)
        return exists == 1

    async def mark_processed(self, request_id: str):
        await self.redis.set(request_id, "1", ex=IDEMPOTENCY_TTL)


async def create_redis_pool() -> redis.Redis:
    return redis.from_url(REDIS_URL, decode_responses=True)
