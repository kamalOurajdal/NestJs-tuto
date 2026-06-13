import { PipeTransform, Type } from '@nestjs/common';
import { CurrentJwtUser } from './current-jwt-user.decorator';

export function CurrentUserId(
  ...pipes: Array<Type<PipeTransform> | PipeTransform>
) {
  return CurrentJwtUser('sub', ...pipes);
}
