import { createHash, randomBytes } from 'node:crypto';

/**
 * Creates a cryptographically secure opaque token with the given prefix.
 * The result is in the format: <prefix>_<random>, where <random> is a base64url-encoded string.
 */
export function createOpaqueToken(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString('base64url')}`;
}

/**
 * Hashes a token using SHA-256 and returns the result as a hex string.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
