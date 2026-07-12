import { v5 as uuidv5 } from 'uuid';
import postgres from 'postgres';
import * as argon2 from 'argon2';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

const SEED_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const ORG_ID = uuidv5('transitops-demo', SEED_NAMESPACE);

const ROLES = ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] as const;

async function seed() {
  const sql = postgres(env.DATABASE_URL, { max: 1 });

  try {
    // ---- Organization ----
    await sql`
      INSERT INTO organizations (id, name, slug)
      VALUES (${ORG_ID}, 'TransitOps Demo', 'transitops-demo')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    `;

    // ---- Admin user ----
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'TransitOps@123';
    const adminHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const adminId = uuidv5('user-admin', SEED_NAMESPACE);
    await sql`
      INSERT INTO users (id, organization_id, name, email, password_hash, role, status)
      VALUES (${adminId}, ${ORG_ID}, 'Admin User', 'admin@transitops.demo', ${adminHash}, 'admin', 'active')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
    `;

    // ---- Demo users (one per role) ----
    const demoPassword = await argon2.hash('Demo@123', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    for (const role of ROLES) {
      if (role === 'admin') continue;
      const userId = uuidv5(`user-${role}`, SEED_NAMESPACE);
      await sql`
        INSERT INTO users (id, organization_id, name, email, password_hash, role, status)
        VALUES (${userId}, ${ORG_ID}, ${`${role.replace(/_/g, ' ')} User`}, ${`${role}@transitops.demo`}, ${demoPassword}, ${role}, 'active')
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
      `;
    }

    // ---- Healthz ----
    const healthId = uuidv5('healthz-seed', SEED_NAMESPACE);
    await sql`
      INSERT INTO healthz (id, checked_at)
      VALUES (${healthId}, now())
      ON CONFLICT (id) DO UPDATE SET checked_at = now()
    `;

    // ---- Emissions Factors (IPCC defaults) ----
    const factors = [
      { fuel_type: 'diesel', co2_per_l: 2.68, co2_per_kwh: 0, valid_from: '2020-01-01', source: 'IPCC 2006' },
      { fuel_type: 'petrol', co2_per_l: 2.31, co2_per_kwh: 0, valid_from: '2020-01-01', source: 'IPCC 2006' },
      { fuel_type: 'cng', co2_per_l: 1.93, co2_per_kwh: 0, valid_from: '2020-01-01', source: 'IPCC 2006' },
      { fuel_type: 'electric', co2_per_l: 0, co2_per_kwh: 0.7, valid_from: '2020-01-01', source: 'GHG Protocol' },
      { fuel_type: 'hybrid', co2_per_l: 1.5, co2_per_kwh: 0, valid_from: '2020-01-01', source: 'Fleet Avg Estimate' },
    ];

    for (const f of factors) {
      const factorId = uuidv5(`emissions-factor-${f.fuel_type}`, SEED_NAMESPACE);
      await sql`
        INSERT INTO emissions_factors (id, fuel_type, co2_per_l, co2_per_kwh, valid_from, source)
        VALUES (${factorId}, ${f.fuel_type}, ${f.co2_per_l}, ${f.co2_per_kwh}, ${f.valid_from}, ${f.source})
        ON CONFLICT DO NOTHING
      `;
    }

    // ---- Default settings (organization thresholds) ----
    await sql`
      INSERT INTO settings (organization_id, payload)
      VALUES (${ORG_ID}, ${JSON.stringify({
        maintenance: { oil_change_km_threshold: 5000, tyre_rotation_km_threshold: 10000 },
        fuel: { anomaly_deviation_pct: 15, rolling_alpha: 0.3, rolling_min_samples: 5 },
        license: { expire_warn_days: 30 },
        predictive_eta: { max_delta_min: 10 },
        scoring: {
          weights: { fuel_efficiency: 0.25, maintenance: 0.20, driver_safety: 0.25, utilization: 0.30 },
        },
      })}::jsonb)
      ON CONFLICT (organization_id) DO UPDATE SET payload = EXCLUDED.payload
    `;

    logger.info('seed complete');
    logger.info({ admin_email: 'admin@transitops.demo', admin_password: adminPassword }, 'default credentials');
  } finally {
    await sql.end();
  }
}

seed().catch((_error: unknown) => {
  logger.error({ err: _error }, 'seed failed');
  process.exit(1);
});
