import time
from typing import Callable

class CircuitOpen(Exception):
    pass

class CircuitBreaker:
    def __init__(self, fail_threshold=5, reset_timeout=30):
        self.fail_threshold = fail_threshold
        self.reset_timeout = reset_timeout
        self._failure_count = 0
        self._last_failure_time = None
        self._state = "CLOSED"  # CLOSED, OPEN, HALF

    def record_success(self):
        self._failure_count = 0
        self._state = "CLOSED"

    def record_failure(self):
        self._failure_count += 1
        self._last_failure_time = time.time()
        if self._failure_count >= self.fail_threshold:
            self._state = "OPEN"

    def allow_request(self) -> bool:
        if self._state == "OPEN":
            elapsed = time.time() - (self._last_failure_time or 0)
            if elapsed > self.reset_timeout:
                self._state = "HALF"
                return True
            return False
        return True

    def __call__(self, fn: Callable):
        async def wrapper(*args, **kwargs):
            if not self.allow_request():
                raise CircuitOpen("Circuit is open")
            try:
                result = await fn(*args, **kwargs)
                self.record_success()
                return result
            except Exception as e:
                self.record_failure()
                raise
        return wrapper
