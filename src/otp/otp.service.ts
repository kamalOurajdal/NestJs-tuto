import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { safeEqualHex } from '../../common/utils/hash.util';
import {
  dateAfter,
  isFutureDate,
  secondsUntil,
} from '../../common/utils/date.util';
import { normalize } from '../../common/utils/string.util';
import { AppConfig } from '../../core/config/configuration';
import { RedisService } from '../../core/redis/redis.service';
import { createOpaqueToken, hashToken } from '../auth/utils/token.util';
import { OTP_REDIS_KEYS } from './constants/otp.constants';
import { OtpErrorCode } from './enums/otp-error-code.enum';
import {
  OtpChallenge,
  OtpChallengeResult,
  OtpVerification,
  OtpVerificationTokenOptions,
  OtpRequestOptions,
  OtpVerifyOptions,
  VerifiedOtpChallenge,
} from './models/otp-challenge.model';
import { createOtpCode, hashOtpCode } from './utils/otp.util';

type LegacySignupOtpChallenge = OtpChallenge & {
  phone?: string;
  phoneHash?: string;
};

@Injectable()
export class OtpService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async requestOtp(options: OtpRequestOptions): Promise<OtpChallengeResult> {
    const reason = this.normalizeReason(options.reason);
    const subjectHash = hashToken(options.subject);

    await this.ensureSubjectIsNotBlocked(reason, subjectHash);
    await this.ensureOtpCanBeRequested(reason, subjectHash);

    const otpToken = createOpaqueToken(`${reason}:challenge`);
    const otpTokenHash = hashToken(otpToken);
    const code = createOtpCode();

    const challenge = this.createOtpChallenge({
      subject: options.subject,
      subjectHash,
      otpTokenHash,
      code,
    });

    await this.saveOtpChallenge(reason, challenge);
    await options.deliver(options.subject, code);

    return this.buildOtpChallengeResponse(otpToken, challenge);
  }

  async verifyOtp(options: OtpVerifyOptions): Promise<VerifiedOtpChallenge> {
    const reason = this.normalizeReason(options.reason);
    const otpTokenHash = hashToken(options.otpToken);
    const challengeKey = OTP_REDIS_KEYS.challenge(reason, otpTokenHash);

    const challenge = await this.getOtpChallengeOrThrow(challengeKey);

    await this.ensureSubjectIsNotBlocked(reason, challenge.subjectHash);
    await this.ensureOtpIsNotExpired(challengeKey, challenge);

    const isCodeValid = this.isOtpCodeValid({
      code: options.code,
      otpTokenHash,
      challenge,
    });

    if (!isCodeValid) {
      return this.handleWrongOtp(reason, challengeKey, challenge);
    }

    const otpVerificationToken = createOpaqueToken(`${reason}:verification`);
    const otpVerificationTokenHash = hashToken(otpVerificationToken);
    const verifiedAt = new Date().toISOString();

    await this.saveOtpVerification(
      reason,
      otpVerificationTokenHash,
      this.createOtpVerification(reason, challenge, verifiedAt),
    );
    await this.deleteOtpChallenge(reason, challengeKey, challenge.subjectHash);

    return {
      otpVerificationToken,
      subject: challenge.subject,
      subjectHash: challenge.subjectHash,
      reason,
      verifiedAt,
      expiresIn: this.otpVerificationTokenTtlSeconds,
    };
  }

  async getVerifiedOtp(
    options: OtpVerificationTokenOptions,
  ): Promise<OtpVerification> {
    const reason = this.normalizeReason(options.reason);
    const tokenHash = hashToken(options.otpVerificationToken);
    const verification = await this.redis.getJson<OtpVerification>(
      OTP_REDIS_KEYS.verification(reason, tokenHash),
    );

    if (!verification) {
      throw new UnauthorizedException({
        code: OtpErrorCode.TOKEN_INVALID,
        message: 'OTP verification token is invalid or expired',
      });
    }

    return verification;
  }

  private async ensureSubjectIsNotBlocked(
    reason: string,
    subjectHash: string,
  ): Promise<void> {
    const block = await this.redis.getJson<{ blockedUntil: string }>(
      OTP_REDIS_KEYS.block(reason, subjectHash),
    );

    if (block && isFutureDate(block.blockedUntil)) {
      throw this.otpBlocked(block.blockedUntil);
    }
  }

  private async ensureOtpCanBeRequested(
    reason: string,
    subjectHash: string,
  ): Promise<void> {
    const latestChallenge = await this.getLatestOtpChallenge(
      reason,
      subjectHash,
    );

    if (!latestChallenge) return;

    if (isFutureDate(latestChallenge.resendAfter)) {
      throw new HttpException(
        {
          code: OtpErrorCode.RATE_LIMITED,
          message: 'Wait before requesting another OTP',
          remainingSeconds: secondsUntil(latestChallenge.resendAfter),
          remainingAttempts: this.remainingAttempts(latestChallenge),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async getLatestOtpChallenge(
    reason: string,
    subjectHash: string,
  ): Promise<OtpChallenge | null> {
    const latestTokenHash = await this.redis.getString(
      OTP_REDIS_KEYS.latest(reason, subjectHash),
    );

    if (!latestTokenHash) {
      return null;
    }

    return this.redis.getJson<OtpChallenge>(
      OTP_REDIS_KEYS.challenge(reason, latestTokenHash),
    );
  }

  private createOtpChallenge(params: {
    subject: string;
    subjectHash: string;
    otpTokenHash: string;
    code: string;
  }): OtpChallenge {
    const now = new Date();
    const expiresAt = dateAfter(this.otpExpiresSeconds);
    const resendAfter = dateAfter(this.otpResendSeconds);

    return {
      subject: params.subject,
      subjectHash: params.subjectHash,
      otpTokenHash: params.otpTokenHash,
      codeHash: hashOtpCode({
        code: params.code,
        otpTokenHash: params.otpTokenHash,
        secret: this.otpHashSecret,
      }),
      attempts: 0,
      maxAttempts: this.otpMaxAttempts,
      expiresAt: expiresAt.toISOString(),
      resendAfter: resendAfter.toISOString(),
      blockedUntil: null,
      createdAt: now.toISOString(),
    };
  }

  private async saveOtpChallenge(
    reason: string,
    challenge: OtpChallenge,
  ): Promise<void> {
    const latestOtpKey = OTP_REDIS_KEYS.latest(reason, challenge.subjectHash);
    const previousOtpTokenHash = await this.redis.getString(latestOtpKey);

    if (previousOtpTokenHash) {
      await this.redis.delete(
        OTP_REDIS_KEYS.challenge(reason, previousOtpTokenHash),
      );
    }

    await this.redis.setJson(
      OTP_REDIS_KEYS.challenge(reason, challenge.otpTokenHash),
      challenge,
      this.otpExpiresSeconds,
    );

    await this.redis.setString(
      latestOtpKey,
      challenge.otpTokenHash,
      this.otpExpiresSeconds,
    );
  }

  private createOtpVerification(
    reason: string,
    challenge: OtpChallenge,
    verifiedAt: string,
  ): OtpVerification {
    return {
      subject: challenge.subject,
      subjectHash: challenge.subjectHash,
      reason,
      verifiedAt,
      expiresAt: dateAfter(this.otpVerificationTokenTtlSeconds).toISOString(),
    };
  }

  private async saveOtpVerification(
    reason: string,
    otpVerificationTokenHash: string,
    verification: OtpVerification,
  ): Promise<void> {
    await this.redis.setJson(
      OTP_REDIS_KEYS.verification(reason, otpVerificationTokenHash),
      verification,
      this.otpVerificationTokenTtlSeconds,
    );
  }

  private buildOtpChallengeResponse(
    otpToken: string,
    challenge: OtpChallenge,
  ): OtpChallengeResult {
    return {
      otpToken,
      expiresIn: this.otpExpiresSeconds,
      resendAfter: this.otpResendSeconds,
      maxAttempts: challenge.maxAttempts,
      remainingAttempts: this.remainingAttempts(challenge),
      blockedUntil: null,
    };
  }

  private async getOtpChallengeOrThrow(key: string): Promise<OtpChallenge> {
    const storedChallenge =
      await this.redis.getJson<LegacySignupOtpChallenge>(key);

    if (!storedChallenge) {
      throw new UnauthorizedException({
        code: OtpErrorCode.TOKEN_INVALID,
        message: 'OTP token is invalid or expired',
      });
    }

    return this.normalizeStoredChallenge(storedChallenge);
  }

  private normalizeStoredChallenge(
    challenge: LegacySignupOtpChallenge,
  ): OtpChallenge {
    return {
      ...challenge,
      subject: challenge.subject ?? challenge.phone ?? '',
      subjectHash: challenge.subjectHash ?? challenge.phoneHash ?? '',
    };
  }

  private async ensureOtpIsNotExpired(
    key: string,
    challenge: OtpChallenge,
  ): Promise<void> {
    if (isFutureDate(challenge.expiresAt)) {
      return;
    }

    await this.redis.delete(key);

    throw new UnauthorizedException({
      code: OtpErrorCode.EXPIRED,
      message: 'OTP code has expired',
    });
  }

  private isOtpCodeValid(params: {
    code: string;
    otpTokenHash: string;
    challenge: OtpChallenge;
  }): boolean {
    const submittedHash = hashOtpCode({
      code: params.code,
      otpTokenHash: params.otpTokenHash,
      secret: this.otpHashSecret,
    });

    return safeEqualHex(params.challenge.codeHash, submittedHash);
  }

  private async handleWrongOtp(
    reason: string,
    key: string,
    challenge: OtpChallenge,
  ): Promise<never> {
    const attempts = challenge.attempts + 1;

    const updatedChallenge: OtpChallenge = {
      ...challenge,
      attempts,
    };

    if (attempts >= challenge.maxAttempts) {
      const blockedUntil = dateAfter(this.otpBlockSeconds).toISOString();

      updatedChallenge.blockedUntil = blockedUntil;

      await this.redis.setJson(
        key,
        updatedChallenge,
        secondsUntil(challenge.expiresAt),
      );

      await this.redis.setJson(
        OTP_REDIS_KEYS.block(reason, challenge.subjectHash),
        { blockedUntil },
        this.otpBlockSeconds,
      );

      throw this.otpBlocked(blockedUntil);
    }

    await this.redis.setJson(
      key,
      updatedChallenge,
      secondsUntil(challenge.expiresAt),
    );

    throw new BadRequestException({
      code: OtpErrorCode.INVALID,
      message: 'OTP code is invalid',
      remainingAttempts: this.remainingAttempts(updatedChallenge),
    });
  }

  private async deleteOtpChallenge(
    reason: string,
    challengeKey: string,
    subjectHash: string,
  ): Promise<void> {
    await this.redis.delete(
      challengeKey,
      OTP_REDIS_KEYS.latest(reason, subjectHash),
    );
  }

  private otpBlocked(blockedUntil: string): HttpException {
    return new HttpException(
      {
        code: OtpErrorCode.BLOCKED,
        message: 'Too many OTP attempts. Try again later.',
        blockedUntil,
        remainingSeconds: secondsUntil(blockedUntil),
        remainingAttempts: 0,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private remainingAttempts(challenge: OtpChallenge): number {
    return Math.max(challenge.maxAttempts - challenge.attempts, 0);
  }

  private normalizeReason(reason: string): string {
    return normalize(reason).toLowerCase();
  }

  private get otpHashSecret(): string {
    return this.config.get<string>('otpHashSecret');
  }

  private get otpExpiresSeconds(): number {
    return this.config.get<number>('otpExpiresSeconds');
  }

  private get otpResendSeconds(): number {
    return this.config.get<number>('otpResendSeconds');
  }

  private get otpMaxAttempts(): number {
    return this.config.get<number>('otpMaxAttempts');
  }

  private get otpBlockSeconds(): number {
    return this.config.get<number>('otpBlockSeconds');
  }

  private get otpVerificationTokenTtlSeconds(): number {
    return this.config.get<number>('otpVerificationTokenTtlSeconds');
  }
}
