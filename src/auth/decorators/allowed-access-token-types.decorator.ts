import { SetMetadata } from '@nestjs/common';
import { TokenType } from '../models/token-type.enum';

export const ALLOWED_ACCESS_TOKEN_TYPES_KEY = 'allowedAccessTokenTypes';

export const AllowedAccessTokenTypes = (
  ...accessTokenTypes: Exclude<TokenType, TokenType.REFRESH>[]
) => SetMetadata(ALLOWED_ACCESS_TOKEN_TYPES_KEY, accessTokenTypes);
