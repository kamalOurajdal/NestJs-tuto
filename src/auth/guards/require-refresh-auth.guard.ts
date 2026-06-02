import { applyDecorators, UseGuards } from '@nestjs/common';

import { RefreshJwtStrategy } from '../strategies/refresh-jwt.strategy';
import { Public } from '../decorators';

export function RequireRefreshToken() {
  return applyDecorators(Public(), UseGuards(RefreshJwtStrategy));
}
