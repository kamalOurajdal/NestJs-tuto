import { TokenType } from './token-type.enum';

export interface AuthJwtUser {
  sub: string;
  jti: string;
  tokenType: TokenType;
}
