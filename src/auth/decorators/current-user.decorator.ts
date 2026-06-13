import type { PipeTransform, Type } from '@nestjs/common';

import { CurrentUserId } from './current-user-id.decorator';
import { LoadUserByIdPipe } from '../pipes/load-user-by-id.pipe';

/**
 * Inject the currently authenticated user.
 *
 * @param pipes Optional pipes to transform the user.
 * @returns The user entity object.
 */
export function CurrentUser(
  ...pipes: Array<Type<PipeTransform> | PipeTransform>
) {
  return CurrentUserId(LoadUserByIdPipe, ...pipes);
}
