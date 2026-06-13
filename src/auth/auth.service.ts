import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PasswordService } from '../../common/security/password.service';
import { UsersService } from '../users/users.service';
import type { UserDto } from '../users/dto/user.dto';

import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import {
  type LoginTokenResponse,
  type TokenPairResponse,
} from './models/auth-token-response.interface';
import { TokenType } from './models/token-type.enum';
import type { AuthJwtUser } from './models/auth-jwt-user.interface';

@Injectable()
export class AuthService {
  private readonly refreshTokenSecret: string;
  private readonly refreshTokenExpiresIn: JwtSignOptions['expiresIn'];

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    private readonly passwordService: PasswordService,
  ) {
    this.refreshTokenSecret =
      this.config.getOrThrow<string>('jwtRefreshSecret');

    this.refreshTokenExpiresIn = this.config.getOrThrow<
      JwtSignOptions['expiresIn']
    >('jwtRefreshExpiresIn');
  }

  async login(loginDto: LoginDto): Promise<LoginTokenResponse> {
    const user = await this.usersService.findByPhone(loginDto.phone);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createLoginResponse(user);
  }

  refresh(user: User): TokenPairResponse {
    if (user.mustChangePassword) {
      throw new ForbiddenException('Password change required');
    }

    return this.createTokenPair(user);
  }

  async getCurrentUser(userId: string): Promise<UserDto> {
    try {
      return await this.usersService.getById(userId);
    } catch {
      throw new UnauthorizedException();
    }
  }

  async changePassword(
    user: User,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    this.validatePasswordChange(changePasswordDto);

    await this.validateCurrentPassword(user, changePasswordDto.currentPassword);

    const newPasswordHash = await this.passwordService.hash(
      changePasswordDto.newPassword,
    );

    await this.usersService.updatePasswordHash(user.id, newPasswordHash);
  }

  private createLoginResponse(user: User): LoginTokenResponse {
    if (user.mustChangePassword) {
      return {
        access_token: this.signToken(user, TokenType.CHANGE_PASSWORD),
      };
    }

    return this.createTokenPair(user);
  }

  private createTokenPair(user: User): TokenPairResponse {
    return {
      access_token: this.signToken(user, TokenType.ACCESS),
      refresh_token: this.signToken(user, TokenType.REFRESH, {
        secret: this.refreshTokenSecret,
        expiresIn: this.refreshTokenExpiresIn,
      }),
    };
  }

  private signToken(
    user: User,
    tokenType: TokenType,
    options?: JwtSignOptions,
  ): string {
    const payload: AuthJwtUser = {
      sub: user.id,
      jti: randomUUID(),
      tokenType,
    };

    return this.jwtService.sign(payload, options);
  }

  private async validateCurrentPassword(
    user: User,
    currentPassword: string,
  ): Promise<void> {
    const isCurrentPasswordValid = await this.passwordService.verify(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }
  }

  private validatePasswordChange(dto: ChangePasswordDto): void {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException(
        'New password and confirm new password must match',
      );
    }
  }
}
