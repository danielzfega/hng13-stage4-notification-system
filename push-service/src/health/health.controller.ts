import { Controller, Get } from '@nestjs/common';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

@Controller()
export class HealthController {
  constructor(private circuitBreaker: CircuitBreakerService) {}

  @Get('/health')
  getHealth() {
    const circuitBreakerState = this.circuitBreaker.getState();

    return {
      success: true,
      message: 'Push service is healthy',
      data: {
        service: 'push-service',
        status: 'up',
        timestamp: new Date().toISOString(),
        circuit_breaker: circuitBreakerState,
      },
    };
  }

  @Get('/health/ready')
  getReadiness() {
    const circuitBreakerState = this.circuitBreaker.getState();
    const isReady = circuitBreakerState.state !== 'OPEN';

    return {
      success: isReady,
      message: isReady ? 'Service is ready' : 'Service is not ready',
      data: {
        ready: isReady,
        circuit_breaker: circuitBreakerState,
      },
    };
  }

  @Get('/health/live')
  getLiveness() {
    return {
      success: true,
      message: 'Service is alive',
      data: {
        alive: true,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
