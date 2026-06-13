import { AuthJwtUser } from './auth-jwt-user.interface';
import type { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user?: AuthJwtUser;
};
