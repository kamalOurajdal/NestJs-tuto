import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../core/redis/redis.module';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { SmsService } from 'src/common/modules/sms/sms.service';

@Module({
  imports: [ConfigModule, RedisModule],
  controllers: [OtpController],
  providers: [OtpService, SmsService],
  exports: [OtpService, SmsService],
})
export class OtpModule {}
