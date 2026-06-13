export interface OtpRequestOptions {
  subject: string; // Phone number, email address, etc.
  reason: string; // Signup, password reset, etc.
  deliver: (subject: string, code: string) => Promise<void>;
}

export interface OtpVerifyOptions {
  otpToken: string; // The token used to verify the OTP.
  code: string;
  reason: string;
}

export interface OtpVerificationTokenOptions {
  otpVerificationToken: string; // The token used to verify that the OTP was verified correctly.
  reason: string;
}

export interface OtpChallenge {
  subject: string;
  subjectHash: string;
  otpTokenHash: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  resendAfter: string;
  blockedUntil: string | null;
  createdAt: string;
}

export interface OtpChallengeResult {
  otpToken: string;
  expiresIn: number;
  resendAfter: number;
  maxAttempts: number;
  remainingAttempts: number;
  blockedUntil: string | null;
}

export interface VerifiedOtpChallenge {
  otpVerificationToken: string;
  subject: string;
  subjectHash: string;
  reason: string;
  verifiedAt: string;
  expiresIn: number;
}

export interface OtpVerification {
  subject: string;
  subjectHash: string;
  reason: string;
  verifiedAt: string;
  expiresAt: string;
}
