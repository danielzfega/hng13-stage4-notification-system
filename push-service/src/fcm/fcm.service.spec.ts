import { Test, TestingModule } from '@nestjs/testing';
import { FcmService } from './fcm.service';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

describe('FcmService', () => {
  let service: FcmService;
  let configService: ConfigService;
  let circuitBreaker: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                FCM_SERVICE_ACCOUNT_PATH: './firebase-service-account.json',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: CircuitBreakerService,
          useValue: {
            execute: jest.fn((fn) => fn()),
            getState: jest.fn(() => ({ state: 'CLOSED', failureCount: 0 })),
          },
        },
      ],
    }).compile();

    service = module.get<FcmService>(FcmService);
    configService = module.get<ConfigService>(ConfigService);
    circuitBreaker = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapPriority', () => {
    it('should map high priority correctly', () => {
      const result = service['mapPriority']('high');
      expect(result).toBe('high');
    });

    it('should default to normal priority', () => {
      const result = service['mapPriority']('low');
      expect(result).toBe('normal');
    });
  });
});
