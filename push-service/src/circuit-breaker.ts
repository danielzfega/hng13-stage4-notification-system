import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

@Injectable()
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private readonly failThreshold: number;
  private readonly resetTimeout: number;

  constructor(failThreshold = 5, resetTimeout = 60000) {
    this.failThreshold = failThreshold;
    this.resetTimeout = resetTimeout;
    this.logger.log(
      `Circuit breaker initialized: threshold=${failThreshold}, timeout=${resetTimeout}ms`,
    );
  }

  getState(): CircuitState {
    return this.state;
  }

  recordSuccess(): void {
    this.successCount++;
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit breaker recovery successful - closing circuit');
      this.failureCount = 0;
      this.state = CircuitState.CLOSED;
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn('Circuit breaker test failed - reopening circuit');
      this.state = CircuitState.OPEN;
    } else if (this.failureCount >= this.failThreshold) {
      this.logger.error(
        `Circuit breaker threshold reached (${this.failureCount} failures) - opening circuit`,
      );
      this.state = CircuitState.OPEN;
    }
  }

  allowRequest(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const elapsed = Date.now() - (this.lastFailureTime || 0);
      if (elapsed > this.resetTimeout) {
        this.logger.log(
          'Circuit breaker timeout reached - entering half-open state',
        );
        this.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow limited requests for testing
    return true;
  }

  getStats() {
    return {
      state: this.state,
      failure_count: this.failureCount,
      success_count: this.successCount,
      last_failure_time: this.lastFailureTime,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.allowRequest()) {
      throw new CircuitOpenError(
        `Circuit breaker is OPEN. Service unavailable. Last failure: ${this.lastFailureTime}`,
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      this.logger.error(`Circuit breaker caught exception: ${error.message}`);
      throw error;
    }
  }
}

export class RetryPolicy {
  private readonly logger = new Logger(RetryPolicy.name);
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 30000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  calculateDelay(attempt: number): number {
    const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
    return delay;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (error instanceof CircuitOpenError) {
          // Don't retry if circuit is open
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          this.logger.warn(
            `Retry attempt ${attempt + 1}/${this.maxRetries} after ${delay}ms due to: ${error.message}`,
          );
          await this.sleep(delay);
        } else {
          this.logger.error(
            `All retry attempts exhausted (${this.maxRetries}). Last error: ${error.message}`,
          );
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
