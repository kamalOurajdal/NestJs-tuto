import { createHmac, randomInt } from 'node:crypto';
import { OTP_LENGTH } from '../constants/otp.constants';

export function createOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  return randomInt(0, max).toString().padStart(OTP_LENGTH, '0');
}

export function hashOtpCode(params: {
  code: string;
  otpTokenHash: string;
  secret: string;
}): string {
  return createHmac('sha256', params.secret)
    .update(`${params.otpTokenHash}:${params.code}`, 'utf8')
    .digest('hex');
}
