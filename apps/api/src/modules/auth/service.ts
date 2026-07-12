import { AuthRepository } from './repository.js';
import {
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../../lib/auth/crypto.js';
import { env } from '../../lib/env.js';
import type { LoginInput, RefreshInput, AuthTokens, UserSession } from './dto.js';

export class AuthService {
  constructor(private readonly repo: AuthRepository = new AuthRepository()) {}

  async login(input: LoginInput, ip?: string, ua?: string): Promise<{ tokens: AuthTokens; session: UserSession }> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new AuthError('ACCOUNT_INACTIVE', 'Account is not active');
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      orgId: user.organizationId,
    });

    const { token: refreshToken, hash, familyId } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL * 1000);

    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: hash,
      familyId,
      userAgent: ua,
      ip,
      expiresAt,
    });

    await this.repo.updateLastLogin(user.id);

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: env.JWT_ACCESS_TTL,
      },
      session: {
        userId: user.id,
        orgId: user.organizationId,
        role: user.role,
        name: user.name,
        email: user.email,
      },
    };
  }

  async refresh(input: RefreshInput): Promise<AuthTokens> {
    const hash = hashRefreshToken(input.refreshToken);
    const existing = await this.repo.findRefreshToken(hash);

    if (!existing) {
      throw new AuthError('INVALID_TOKEN', 'Invalid refresh token');
    }

    if (existing.revokedAt) {
      await this.repo.revokeTokenFamily(existing.familyId);
      throw new AuthError('TOKEN_REUSE_DETECTED', 'Refresh token reuse detected — all sessions revoked');
    }

    if (existing.expiresAt < new Date()) {
      throw new AuthError('TOKEN_EXPIRED', 'Refresh token expired');
    }

    const user = await this.repo.findUserById(existing.userId);
    if (!user?.status || user.status !== 'active') {
      throw new AuthError('ACCOUNT_INACTIVE', 'Account is not active');
    }

    await this.repo.revokeRefreshToken(existing.id);

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      orgId: user.organizationId,
    });

    const { token: newRefreshToken, hash: newHash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL * 1000);

    const newTokenRow = await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: newHash,
      familyId: existing.familyId,
      userAgent: existing.userAgent ?? undefined,
      expiresAt,
    });

    await this.repo.revokeRefreshToken(existing.id, newTokenRow.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: env.JWT_ACCESS_TTL,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    const hash = hashRefreshToken(refreshToken);
    const existing = await this.repo.findRefreshToken(hash);
    if (existing && !existing.revokedAt) {
      await this.repo.revokeTokenFamily(existing.familyId);
    }
  }
}

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
