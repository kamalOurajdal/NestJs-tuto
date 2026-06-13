import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class OtpRequestDto {
  @ApiProperty({
    example: '+212600000000',
    description: 'Phone number, email, or any value that receives the OTP.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  subject: string;

  @ApiProperty({
    example: 'signup',
    description:
      'OTP use case, for example signup, phone-change, confirmation.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[a-z0-9][a-z0-9-_.:]*$/i)
  reason: string;
}
