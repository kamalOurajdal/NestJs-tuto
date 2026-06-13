import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { OTP_LENGTH } from '../constants/otp.constants';

export class OtpVerifyDto {
  @ApiProperty({ example: 'otp_random_opaque_token' })
  @IsString()
  @IsNotEmpty()
  otpToken: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(OTP_LENGTH)
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    example: 'signup',
    description: 'Same reason used when the OTP was requested.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[a-z0-9][a-z0-9-_.:]*$/i)
  reason: string;
}
