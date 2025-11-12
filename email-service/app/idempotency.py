
import aioredis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
IDEMPOTENCY_TTL = int(os.getenv("IDEMPOTENCY_TTL", "86400"))

class Idempotency:
    def __init__(self, redis: aioredis.Redis):
        self.redis = redis

    async def is_processed(self, request_id: str) -> bool:
        return await self.redis.exists(request_id) == 1

    async def mark_processed(self, request_id: str):
        await self.redis.set(request_id, "1", ex=IDEMPOTENCY_TTL)

async def create_redis_pool():
    return await aioredis.from_url(REDIS_URL)
