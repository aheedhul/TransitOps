import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, refreshTokens, organizations } from '../../db/schema.js';
import type { Db } from '../../db/index.js';

export class AuthRepository {
  constructor(private readonly database: Db = db) {}

  async findUserByEmail(email: string) {
    const [user] = await this.database
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    return user ?? null;
  }

  async findUserById(id: string) {
    const [user] = await this.database
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return user ?? null;
  }

  async findOrgById(id: string) {
    const [org] = await this.database
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, id), isNull(organizations.deletedAt)))
      .limit(1);
    return org ?? null;
  }

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    familyId: string;
    userAgent?: string;
    ip?: string;
    expiresAt: Date;
  }) {
    const [token] = await this.database
      .insert(refreshTokens)
      .values({
        userId: data.userId,
        tokenHash: data.tokenHash,
        familyId: data.familyId,
        userAgent: data.userAgent ?? null,
        ip: data.ip ?? null,
        expiresAt: data.expiresAt,
      })
      .returning();
    if (!token) throw new Error('Failed to create refresh token');
    return token;
  }

  async findRefreshToken(hash: string) {
    const [token] = await this.database
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash))
      .limit(1);
    return token ?? null;
  }

  async revokeRefreshToken(id: string, replacedById?: string) {
    await this.database
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        replacedBy: replacedById ?? null,
      })
      .where(eq(refreshTokens.id, id));
  }

  async revokeTokenFamily(familyId: string) {
    await this.database
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
  }

  async updateLastLogin(userId: string) {
    await this.database
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }
}
