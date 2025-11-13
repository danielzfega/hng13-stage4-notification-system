import time
import asyncio
import logging
from typing import Callable, Any
from functools import wraps

logger = logging.getLogger(__name__)


class CircuitOpen(Exception):
    """Exception raised when circuit breaker is open"""
    pass


class CircuitBreaker:
    """
    Circuit Breaker pattern implementation
    States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
    """

    def __init__(self, fail_threshold=5, reset_timeout=60):
        self.fail_threshold = fail_threshold
        self.reset_timeout = reset_timeout
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = None
        self._state = "CLOSED"
        logger.info(
            f"Circuit breaker initialized: threshold={fail_threshold}, "
            f"timeout={reset_timeout}s"
        )

    @property
    def state(self):
        """Get current circuit breaker state"""
        return self._state

    def record_success(self):
        """Record successful operation"""
        self._success_count += 1
        if self._state == "HALF_OPEN":
            # After successful test in half-open, close the circuit
            logger.info(
                "Circuit breaker recovery successful - closing circuit")
            self._failure_count = 0
            self._state = "CLOSED"
        elif self._state == "CLOSED":
            self._failure_count = max(0, self._failure_count - 1)

    def record_failure(self):
        """Record failed operation"""
        self._failure_count += 1
        self._last_failure_time = time.time()

        if self._state == "HALF_OPEN":
            # Failed during test, reopen circuit
            logger.warning("Circuit breaker test failed - reopening circuit")
            self._state = "OPEN"
        elif self._failure_count >= self.fail_threshold:
            logger.error(
                f"Circuit breaker threshold reached ({self._failure_count} failures) "
                f"- opening circuit"
            )
            self._state = "OPEN"

    def allow_request(self) -> bool:
        """Check if request is allowed based on circuit state"""
        if self._state == "CLOSED":
            return True

        if self._state == "OPEN":
            elapsed = time.time() - (self._last_failure_time or 0)
            if elapsed > self.reset_timeout:
                logger.info(
                    "Circuit breaker timeout reached - entering half-open state")
                self._state = "HALF_OPEN"
                return True
            return False

        # HALF_OPEN state - allow limited requests for testing
        return True

    def get_stats(self) -> dict:
        """Get circuit breaker statistics"""
        return {
            "state": self._state,
            "failure_count": self._failure_count,
            "success_count": self._success_count,
            "last_failure_time": self._last_failure_time,
        }

    def __call__(self, fn: Callable):
        """Decorator to wrap functions with circuit breaker"""
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            if not self.allow_request():
                raise CircuitOpen(
                    f"Circuit breaker is OPEN. Service unavailable. "
                    f"Last failure: {self._last_failure_time}"
                )
            try:
                result = await fn(*args, **kwargs)
                self.record_success()
                return result
            except Exception as e:
                self.record_failure()
                logger.error(f"Circuit breaker caught exception: {e}")
                raise
        return wrapper


class RetryPolicy:
    """
    Retry policy with exponential backoff
    """

    def __init__(self, max_retries=3, base_delay=1, max_delay=30):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    def calculate_delay(self, attempt: int) -> float:
        """Calculate exponential backoff delay"""
        delay = min(self.base_delay * (2 ** attempt), self.max_delay)
        return delay

    def __call__(self, fn: Callable):
        """Decorator to add retry logic to functions"""
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(self.max_retries + 1):
                try:
                    return await fn(*args, **kwargs)
                except CircuitOpen:
                    # Don't retry if circuit is open
                    raise
                except Exception as e:
                    last_exception = e
                    if attempt < self.max_retries:
                        delay = self.calculate_delay(attempt)
                        logger.warning(
                            f"Retry attempt {attempt + 1}/{self.max_retries} "
                            f"after {delay}s due to: {e}"
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"All retry attempts exhausted ({self.max_retries}). "
                            f"Last error: {e}"
                        )

            raise last_exception
        return wrapper
