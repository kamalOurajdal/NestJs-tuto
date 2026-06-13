import { ApiProperty } from '@nestjs/swagger';

export class OtpChallengeResponseDto {
  @ApiProperty({ example: 'otp_random_opaque_token' })
  otpToken: string;

  @ApiProperty({ example: 300 })
  expiresIn: number;

  @ApiProperty({ example: 60 })
  resendAfter: number;

  @ApiProperty({ example: 3 })
  maxAttempts: number;

  @ApiProperty({ example: 3 })
  remainingAttempts: number;

  @ApiProperty({ nullable: true, example: null })
  blockedUntil: string | null;
}

export class OtpVerificationResponseDto {
  @ApiProperty({ example: 'otp_verification_random_opaque_token' })
  otpVerificationToken: string;

  @ApiProperty({ example: '+212600000000' })
  subject: string;

  @ApiProperty({ example: 'signup' })
  reason: string;

  @ApiProperty({ example: '2026-05-13T12:00:00.000Z' })
  verifiedAt: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;
}
