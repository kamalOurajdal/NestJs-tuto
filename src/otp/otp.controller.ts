import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { normalize } from '../../common/utils/string.util';
import { Public } from '../auth/decorators';
import { OtpRequestDto } from './dto/otp-request.dto';
import {
  OtpChallengeResponseDto,
  OtpVerificationResponseDto,
} from './dto/otp-response.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { OtpService } from './otp.service';
import { SmsService } from 'src/common/modules/sms/sms.service';

@ApiTags('OTP')
@Controller('otp')
export class OtpController {
  constructor(
    private readonly otpService: OtpService,
    private readonly smsService: SmsService,
  ) {}

  @Post('request')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request an OTP challenge for a reason.' })
  @ApiResponse({ status: 200, type: OtpChallengeResponseDto })
  @ApiTooManyRequestsResponse({
    description: 'OTP is blocked or rate limited.',
  })
  requestOtp(@Body() body: OtpRequestDto): Promise<OtpChallengeResponseDto> {
    const subject = normalize(body.subject);
    const reason = normalize(body.reason);

    return this.otpService.requestOtp({
      subject,
      reason,
      deliver: (target, code) => {
        const message = `Your OTP is ${code}`;
        return this.smsService.sendSMS(target, message);
      },
    });
  }

  @Post('verify')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an OTP challenge for a reason.' })
  @ApiResponse({ status: 200, type: OtpVerificationResponseDto })
  @ApiBadRequestResponse({ description: 'OTP is invalid.' })
  @ApiUnauthorizedResponse({ description: 'OTP token is invalid or expired.' })
  @ApiTooManyRequestsResponse({ description: 'OTP challenge is blocked.' })
  async verifyOtp(
    @Body() body: OtpVerifyDto,
  ): Promise<OtpVerificationResponseDto> {
    const verified = await this.otpService.verifyOtp({
      otpToken: body.otpToken,
      code: body.code,
      reason: normalize(body.reason),
    });

    return {
      otpVerificationToken: verified.otpVerificationToken,
      subject: verified.subject,
      reason: verified.reason,
      verifiedAt: verified.verifiedAt,
      expiresIn: verified.expiresIn,
    };
  }
}
