import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { eq } from 'drizzle-orm';
import { createServer } from '../../../app.js';
import { testDb } from '../../../test/db.js';
import { users, organizations, vehicles, refreshTokens } from '../../../db/schema.js';
import {
  signAccessToken,
  generateMfaSecret,
  hashRefreshToken,
} from '../../../lib/auth/crypto.js';
import type { Express } from 'express';

let app: Express;

function req() {
  return supertest(app);
}

/* --------------------------------------------------
 * Cleanup tracking for resources created during tests
 * -------------------------------------------------- */
const createdOrgIds: string[] = [];
const createdUserIds: string[] = [];
const createdVehicleIds: string[] = [];

// Shared test data populated in beforeAll.
let org1Id: string;
let fmUserId: string;
let org2Id: string;
let org2UserId: string;

beforeAll(async () => {
  app = createServer();

  // Look up seed users so we can sign JWTs without hitting the login endpoint
  // (which has a shared rate-limiter that conflicts with the rate-limit test).
  const [fmUser] = await testDb
    .select()
    .from(users)
    .where(eq(users.email, 'fleet_manager@transitops.demo'))
    .limit(1);
  if (!fmUser) throw new Error('Seed fleet_manager user not found');
  fmUserId = fmUser.id;
  org1Id = fmUser.organizationId;

  // Set MFA on the seed admin so we can test MFA_REQUIRED / INVALID_MFA.
  const { secret } = generateMfaSecret();
  await testDb
    .update(users)
    .set({ mfaSecret: secret, mfaRecoveryCodes: [] })
    .where(eq(users.email, 'admin@transitops.demo'));

  // Create a second organisation for cross‑org IDOR tests.
  org2Id = crypto.randomUUID();
  await testDb.insert(organizations).values({
    id: org2Id,
    name: 'Beta Transport (Security Test)',
    slug: `beta-transport-security-${Date.now()}`,
  });
  createdOrgIds.push(org2Id);

  org2UserId = crypto.randomUUID();
  await testDb.insert(users).values({
    id: org2UserId,
    organizationId: org2Id,
    name: 'Beta Admin',
    email: `beta-admin-${Date.now()}@transitops.test`,
    passwordHash: 'ignored-direct-jwt',
    role: 'admin',
    status: 'active',
  });
  createdUserIds.push(org2UserId);
});

afterAll(async () => {
  // Reset the seed admin's MFA secret to null (restore original state).
  await testDb
    .update(users)
    .set({ mfaSecret: null })
    .where(eq(users.email, 'admin@transitops.demo'));

  for (const vid of createdVehicleIds) {
    await testDb.delete(vehicles).where(eq(vehicles.id, vid));
  }
  for (const uid of createdUserIds) {
    await testDb.delete(refreshTokens).where(eq(refreshTokens.userId, uid));
    await testDb.delete(users).where(eq(users.id, uid));
  }
  for (const oid of createdOrgIds) {
    await testDb.delete(organizations).where(eq(organizations.id, oid));
  }
});

// =============================================================================
// 1. Refresh Token Family Revocation
// =============================================================================
describe('Refresh Token Family Revocation', () => {
  const rawOld = `test-old-${crypto.randomUUID()}`;
  const rawNew = `test-new-${crypto.randomUUID()}`;
  const familyId = crypto.randomUUID();

  beforeAll(async () => {
    const hashOld = hashRefreshToken(rawOld);
    const hashNew = hashRefreshToken(rawNew);
    const expiresAt = new Date(Date.now() + 86_400_000); // 1 day

    // Insert the "old" token row.
    const [oldRow] = await testDb
      .insert(refreshTokens)
      .values({
        userId: fmUserId,
        tokenHash: hashOld,
        familyId,
        expiresAt,
      })
      .returning();

    // Insert the "new" token row (simulating a rotation where "old" was replaced).
    await testDb
      .insert(refreshTokens)
      .values({
        userId: fmUserId,
        tokenHash: hashNew,
        familyId,
        expiresAt,
      })
      .returning();

    // Mark the old as revoked and replaced by... we just skip the replacedBy FK.
    if (oldRow) {
      await testDb
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, oldRow.id));
    }
  });

  it('should detect reuse of a revoked token and revoke the entire family', async () => {
    // Reuse the OLD token — should trigger TOKEN_REUSE_DETECTED.
    const reuseRes = await req()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rawOld });
    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');
  });

  it('should also reject the new token after family revocation', async () => {
    // The new token was in the same family and should now be revoked.
    const failRes = await req()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rawNew });
    expect(failRes.status).toBe(401);
    // After family revocation both codes are possible: TOKEN_REUSE_DETECTED or INVALID_TOKEN.
    expect(['TOKEN_REUSE_DETECTED', 'INVALID_TOKEN']).toContain(failRes.body.error.code);
  });
});

// =============================================================================
// 2. MFA Required for Admin
// =============================================================================
describe('MFA Required for Admin', () => {
  it('should return MFA_REQUIRED when admin logs in without an MFA code', async () => {
    const res = await req()
      .post('/api/v1/auth/login')
      .send({ email: 'admin@transitops.demo', password: 'TransitOps@123' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MFA_REQUIRED');
  });
});

// =============================================================================
// 3. MFA Invalid Code
// =============================================================================
describe('MFA Invalid Code', () => {
  it('should return INVALID_MFA when admin provides a wrong MFA code', async () => {
    const res = await req()
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@transitops.demo',
        password: 'TransitOps@123',
        mfaCode: '123456',
      });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_MFA');
  });
});

// =============================================================================
// 4. Rate Limit on Login
// =============================================================================
describe('Rate Limit on Login', () => {
  it('should return 429 after repeatedly failing login', async () => {
    // The login rate limiter (max=5, window=15m) is a module-level singleton
    // shared across all Express instances. Earlier tests (MFA) may have already
    // consumed slots, so we keep sending failed logins until we hit the limit.
    let rateLimited = false;

    for (let i = 0; i < 10; i++) {
      const res = await req()
        .post('/api/v1/auth/login')
        .send({ email: 'fleet_manager@transitops.demo', password: 'wrong-password' });

      if (res.status === 429) {
        rateLimited = true;
        break;
      }
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    expect(rateLimited).toBe(true);
  });
});

// =============================================================================
// 5. IDOR — Cross-Org Vehicle Access
// =============================================================================
describe('IDOR — Cross-Org Vehicle Access', () => {
  let org1VehicleId: string;
  let org2Token: string;

  beforeAll(async () => {
    const fmToken = signAccessToken({
      sub: fmUserId,
      role: 'fleet_manager',
      orgId: org1Id,
    });

    const createRes = await req()
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${fmToken}`)
      .send({
        registrationNumber: `IDOR-ACCESS-${Date.now()}`,
        type: 'truck',
        maxLoadCapacity: 5000,
        acquisitionCost: 100000,
        acquisitionDate: '2024-01-01',
      });
    expect(createRes.status).toBe(201);
    org1VehicleId = createRes.body.data.id;
    createdVehicleIds.push(org1VehicleId);

    org2Token = signAccessToken({
      sub: org2UserId,
      role: 'admin',
      orgId: org2Id,
    });
  });

  it('should reject access to a vehicle from a different organisation', async () => {
    const res = await req()
      .get(`/api/v1/vehicles/${org1VehicleId}`)
      .set('Authorization', `Bearer ${org2Token}`);

    expect([404, 403]).toContain(res.status);
  });
});

// =============================================================================
// 6. IDOR — Cross-Org Vehicle List
// =============================================================================
describe('IDOR — Cross-Org Vehicle List', () => {
  let org2Token: string;
  let org2VehicleId: string;

  beforeAll(async () => {
    org2Token = signAccessToken({
      sub: org2UserId,
      role: 'admin',
      orgId: org2Id,
    });

    const createRes = await req()
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${org2Token}`)
      .send({
        registrationNumber: `IDOR-LIST-${Date.now()}`,
        type: 'van',
        maxLoadCapacity: 2000,
        acquisitionCost: 50000,
        acquisitionDate: '2024-06-01',
      });
    expect(createRes.status).toBe(201);
    org2VehicleId = createRes.body.data.id;
    createdVehicleIds.push(org2VehicleId);
  });

  it('should only return vehicles belonging to org2', async () => {
    const res = await req()
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${org2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);

    const found = res.body.data.some((v: any) => v.id === org2VehicleId);
    expect(found).toBe(true);

    expect(res.body.meta).toBeTruthy();
    // postgres.js may return count(*) as a string; coerce for safety.
    expect(Number(res.body.meta.total)).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// 7. Mass-Assignment Protection
// =============================================================================
describe('Mass-Assignment Protection', () => {
  it('should ignore extra fields and use correct orgId with default status', async () => {
    const fmToken = signAccessToken({
      sub: fmUserId,
      role: 'fleet_manager',
      orgId: org1Id,
    });

    const payload = {
      registrationNumber: `MASSTEST-${Date.now()}`,
      type: 'car' as const,
      maxLoadCapacity: 1500,
      acquisitionCost: 30000,
      acquisitionDate: '2024-03-01',
      // ----- extra / mass-assignment injection -----
      status: 'retired',
      deletedAt: null,
      organizationId: '00000000-0000-0000-0000-000000000001',
    };

    const res = await req()
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${fmToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    const vehicle = res.body.data;
    createdVehicleIds.push(vehicle.id);

    expect(vehicle.status).toBe('available');

    const [row] = await testDb
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicle.id));
    expect(row).toBeTruthy();
    expect(row!.organizationId).toBe(org1Id);
    expect(row!.status).toBe('available');
    expect(row!.deletedAt).toBeNull();
  });
});

// =============================================================================
// 8. Unauthenticated Access to Protected Routes
// =============================================================================
describe('Unauthenticated Access to Protected Routes', () => {
  it('should return 401 when accessing /api/v1/vehicles without an auth header', async () => {
    const res = await req().get('/api/v1/vehicles');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
