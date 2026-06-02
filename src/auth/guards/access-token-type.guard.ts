import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ALLOWED_ACCESS_TOKEN_TYPES_KEY } from '../decorators/allowed-access-token-types.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenType } from '../models/token-type.enum';
import type { AuthenticatedRequest } from '../models/authenticated-user.type';

@Injectable()
export class AccessTokenTypeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const allowedAccessTokenTypes = this.reflector.getAllAndOverride<
      TokenType[]
    >(ALLOWED_ACCESS_TOKEN_TYPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [TokenType.ACCESS];

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    if (!allowedAccessTokenTypes.includes(user.tokenType)) {
      throw new ForbiddenException('Invalid token type');
    }

    return true;
  }
}
