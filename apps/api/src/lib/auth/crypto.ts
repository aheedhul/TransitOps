import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { env } from '../env.js';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export interface AccessTokenPayload {
  sub: string;
  role: string;
  org_id: string;
  scope: string[];
  exp: number;
  iat: number;
  jti: string;
  ver: number;
}

export function signAccessToken(payload: {
  sub: string;
  role: string;
  orgId: string;
  scope?: string[];
}): string {
  const jti = randomBytes(16).toString('hex');
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      org_id: payload.orgId,
      scope: payload.scope ?? [],
      jti,
      ver: 1,
    },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: env.JWT_ACCESS_TTL,
      issuer: 'transitops',
    },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: 'transitops',
  }) as AccessTokenPayload;
}

export function generateRefreshToken(): { token: string; hash: string; familyId: string } {
  const token = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  const familyId = randomBytes(16).toString('hex');
  return { token, hash, familyId };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4)
      .toString('hex')
      .toUpperCase(),
  );
}
