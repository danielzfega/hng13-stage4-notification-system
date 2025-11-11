import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from './circuit-breaker.service';
import { ConfigService } from '@nestjs/config';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                CIRCUIT_BREAKER_THRESHOLD: 5,
                CIRCUIT_BREAKER_TIMEOUT: 60000,
                CIRCUIT_BREAKER_RESET_TIMEOUT: 30000,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should start in CLOSED state', () => {
    const state = service.getState();
    expect(state.state).toBe('CLOSED');
    expect(state.failureCount).toBe(0);
  });

  it('should execute function successfully when CLOSED', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const result = await service.execute(mockFn);
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalled();
  });

  it('should reset on manual reset', () => {
    service.reset();
    const state = service.getState();
    expect(state.state).toBe('CLOSED');
    expect(state.failureCount).toBe(0);
  });
});
