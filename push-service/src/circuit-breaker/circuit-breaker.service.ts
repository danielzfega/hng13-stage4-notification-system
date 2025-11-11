import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerState } from '../common/interfaces/push-notification.interface';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private state: CircuitBreakerState = {
    state: 'CLOSED',
    failureCount: 0,
  };

  private readonly failureThreshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;

  constructor(private configService: ConfigService) {
    this.failureThreshold = this.configService.get<number>(
      'CIRCUIT_BREAKER_THRESHOLD',
      5,
    );
    this.timeout = this.configService.get<number>(
      'CIRCUIT_BREAKER_TIMEOUT',
      60000,
    );
    this.resetTimeout = this.configService.get<number>(
      'CIRCUIT_BREAKER_RESET_TIMEOUT',
      30000,
    );
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.state === 'OPEN') {
      if (Date.now() > this.state.nextAttemptTime) {
        this.logger.log('Circuit breaker moving to HALF_OPEN state');
        this.state.state = 'HALF_OPEN';
      } else {
        const error = new Error('Circuit breaker is OPEN');
        this.logger.warn(
          `Circuit breaker is OPEN. Next attempt at ${new Date(this.state.nextAttemptTime).toISOString()}`,
        );
        throw error;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state.state === 'HALF_OPEN') {
      this.logger.log('Circuit breaker CLOSED after successful call');
      this.state = {
        state: 'CLOSED',
        failureCount: 0,
      };
    } else if (this.state.state === 'CLOSED') {
      this.state.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    this.logger.warn(
      `Circuit breaker failure count: ${this.state.failureCount}/${this.failureThreshold}`,
    );

    if (this.state.failureCount >= this.failureThreshold) {
      this.state.state = 'OPEN';
      this.state.nextAttemptTime = Date.now() + this.resetTimeout;
      this.logger.error(
        `Circuit breaker OPENED. Next attempt at ${new Date(this.state.nextAttemptTime).toISOString()}`,
      );

      // Auto-reset after timeout
      setTimeout(() => {
        if (this.state.state === 'OPEN') {
          this.logger.log('Circuit breaker auto-transitioning to HALF_OPEN');
          this.state.state = 'HALF_OPEN';
        }
      }, this.resetTimeout);
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  reset(): void {
    this.logger.log('Circuit breaker manually reset');
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
    };
  }
}
