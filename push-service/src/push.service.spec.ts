import { Test, TestingModule } from '@nestjs/testing';
import { PushService } from './push.service';
import { ConfigService } from '@nestjs/config';

describe('PushService', () => {
  let service: PushService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<PushService>(PushService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return health status', () => {
    const health = service.getHealth();
    expect(health.service).toBe('push-service');
    expect(health.status).toBe('up');
  });
});
