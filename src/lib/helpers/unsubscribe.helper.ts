import * as jwt from 'jsonwebtoken';

/**
 * GDPR Marketing Unsubscribe Helper
 *
 * Generates signed JWT tokens for unsubscribe links in marketing emails.
 * - Token contains userId only
 * - No expiry (GDPR requires user to be able to unsubscribe anytime)
 * - Signed with secret so users can't tamper with someone else's token
 *
 * Path: src/lib/helpers/unsubscribe.helper.ts
 */

const UNSUBSCRIBE_SECRET =
  process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-me';

const FRONTEND_URL = (
  'https://staging-portal.seamfox.com'
).replace(/\/$/, '');

/**
 * Build the unsubscribe URL to embed in marketing email footers.
 * Pass user.id (UUID) — never email.
 */
export function buildUnsubscribeUrl(userId: string): string {
  const token = jwt.sign(
    { userId, purpose: 'unsubscribe' },
    UNSUBSCRIBE_SECRET,
    // No `expiresIn` — token must be valid forever per GDPR
  );
  return `${FRONTEND_URL}/unsubscribe?token=${token}`;
}

/**
 * Verify token from /unsubscribe page POST and return userId.
 * Throws if invalid, tampered, or wrong purpose.
 */
export function verifyUnsubscribeToken(token: string): { userId: string } {
  const decoded = jwt.verify(token, UNSUBSCRIBE_SECRET) as any;
  if (decoded.purpose !== 'unsubscribe' || !decoded.userId) {
    throw new Error('Invalid unsubscribe token');
  }
  return { userId: decoded.userId };
}