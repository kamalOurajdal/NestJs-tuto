import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import AUTH_COOKIE_NAMES from '../constants/auth.constant';
import { TokenType } from '../models/token-type.enum';
import { AuthJwtUser } from '../models/auth-jwt-user.interface';
import { CookiesService } from 'src/common/security/cookies.service';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private readonly cookiesService: CookiesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return (
            this.cookiesService.get(request, AUTH_COOKIE_NAMES.REFRESH) ?? null
          );
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwtSecret'),
    });
  }

  validate(payload: AuthJwtUser): AuthJwtUser {
    if (payload.tokenType !== TokenType.REFRESH) {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      sub: payload.sub,
      jti: payload.jti,
      tokenType: payload.tokenType,
    };
  }
}
