import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthJwtUser } from '../models/auth-jwt-user.interface';
import { AuthenticatedRequest } from '../models/authenticated-user.type';

/**
 * Inject the currently authenticated JWT user payload.
 *
 * @param data Optional data to extract from the JWT user.
 * @returns The JWT user payload.
 */
export const CurrentJwtUser = createParamDecorator(
  (
    data: keyof AuthJwtUser | undefined,
    ctx: ExecutionContext,
  ): AuthJwtUser | AuthJwtUser[keyof AuthJwtUser] => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    return data ? user[data] : user;
  },
);
