import { Module } from '@nestjs/common';
import { FcmService } from './fcm.service';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';

@Module({
  imports: [CircuitBreakerModule],
  providers: [FcmService],
  exports: [FcmService],
})
export class FcmModule {}
