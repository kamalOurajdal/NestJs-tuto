export const OTP_REDIS_KEYS = {
  challenge: (namespace: string, otpTokenHash: string) =>
    `${namespace}:otp:challenge:${otpTokenHash}`,

  latest: (namespace: string, subjectHash: string) =>
    `${namespace}:otp:latest:${subjectHash}`,

  block: (namespace: string, subjectHash: string) =>
    `${namespace}:otp:block:${subjectHash}`,

  verification: (namespace: string, otpVerificationTokenHash: string) =>
    `${namespace}:otp:verification:${otpVerificationTokenHash}`,
} as const;

export const OTP_LENGTH = 6;
