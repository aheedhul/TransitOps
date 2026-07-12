import { describe, it, expect } from 'vitest';
import { validateDispatch, canDispatch } from '../rules.js';
import type { RuleResult } from '../dto.js';

const makeVehicle = (overrides: Partial<{
  id: string; status: string; type: string; maxLoadCapacity: string;
}> = {}) => ({
  id: 'v1',
  status: 'available',
  type: 'truck',
  maxLoadCapacity: '12000.00',
  ...overrides,
});

const makeDriver = (overrides: Partial<{
  id: string; status: string; licenseNumber: string; licenseExpiryDate: string;
}> = {}) => ({
  id: 'd1',
  status: 'available',
  licenseNumber: 'LIC12345',
  licenseExpiryDate: '2027-01-01',
  ...overrides,
});

describe('validateDispatch', () => {
  it('returns all ok for valid vehicle and driver', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle(),
      driver: makeDriver(),
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    const failed = chain.filter((r) => !r.ok);
    expect(failed).toHaveLength(0);
    expect(chain.length).toBe(10);
  });

  it('fails vehicle.exists when vehicle is null', () => {
    const chain = validateDispatch({
      vehicle: null,
      driver: makeDriver(),
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    const exists = chain.find((r) => r.rule === 'vehicle.exists');
    expect(exists?.ok).toBe(false);
    expect(exists?.reason).toBe('vehicle.not_found');
  });

  it('fails vehicle.not_in_dispatch_pool for retired vehicle', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle({ status: 'retired' }),
      driver: makeDriver(),
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    const rule = chain.find((r) => r.rule === 'vehicle.not_in_dispatch_pool');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('vehicle.retired');
  });

  it('fails vehicle.not_in_dispatch_pool for in-shop vehicle', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle({ status: 'in-shop' }),
      driver: makeDriver(),
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    const rule = chain.find((r) => r.rule === 'vehicle.not_in_dispatch_pool');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('vehicle.in_shop');
  });

  it('fails vehicle.no_concurrent_trip when vehicle is on-trip', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle({ status: 'on-trip' }),
      driver: makeDriver(),
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    const rule = chain.find((r) => r.rule === 'vehicle.no_concurrent_trip');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('vehicle.on_trip');
  });

  it('fails driver.exists when driver is null', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle(),
      driver: null,
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    const exists = chain.find((r) => r.rule === 'driver.exists');
    expect(exists?.ok).toBe(false);
    expect(exists?.reason).toBe('driver.not_found');
  });

  it('fails driver.license_valid for expired license', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle(),
      driver: makeDriver({ licenseExpiryDate: '2020-01-01' }),
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    const rule = chain.find((r) => r.rule === 'driver.license_valid');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('driver.license_expired');
    expect(rule?.metadata?.daysRemaining).toBeLessThan(0);
  });

  it('warns driver.license_warn when expiring within 30 days', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const expiryStr = futureDate.toISOString().split('T')[0];

    const chain = validateDispatch({
      vehicle: makeVehicle(),
      driver: makeDriver({ licenseExpiryDate: expiryStr }),
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    const rule = chain.find((r) => r.rule === 'driver.license_warn');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('driver.license_expiring_soon');
    expect(rule?.severity).toBe('warn');
  });

  it('passes driver.license_warn when force=true', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const expiryStr = futureDate.toISOString().split('T')[0];

    const chain = validateDispatch({
      vehicle: makeVehicle(),
      driver: makeDriver({ licenseExpiryDate: expiryStr }),
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: true,
    });

    const rule = chain.find((r) => r.rule === 'driver.license_warn');
    expect(rule?.ok).toBe(true);
  });

  it('fails driver.not_suspended for suspended driver', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle(),
      driver: makeDriver({ status: 'suspended' }),
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    const rule = chain.find((r) => r.rule === 'driver.not_suspended');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('driver.suspended');
  });

  it('fails driver.no_concurrent_trip when driver is on-trip', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle(),
      driver: makeDriver({ status: 'on-trip' }),
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    const rule = chain.find((r) => r.rule === 'driver.no_concurrent_trip');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('driver.on_trip');
  });

  it('fails vehicle.cargo_capacity when over capacity', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle({ maxLoadCapacity: '5000.00' }),
      driver: makeDriver(),
      cargoWeightKg: 8000,
      hasPreTripInspection: true,
      force: false,
    });

    const rule = chain.find((r) => r.rule === 'vehicle.cargo_capacity');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('cargo.over_capacity');
    expect(rule?.metadata?.maxCapacityKg).toBe(5000);
    expect(rule?.metadata?.cargoKg).toBe(8000);
  });

  it('warns on missing pre-trip inspection', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle(),
      driver: makeDriver(),
      cargoWeightKg: 5000,
      hasPreTripInspection: false,
      force: false,
    });

    const rule = chain.find((r) => r.rule === 'driver.pre_trip_required');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('pre_trip.missing');
    expect(rule?.severity).toBe('warn');
  });

  it('short-circuits chain when vehicle is null', () => {
    const chain = validateDispatch({
      vehicle: null,
      driver: null,
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    expect(chain.length).toBe(1);
    expect(chain[0]?.rule).toBe('vehicle.exists');
  });

  it('short-circuits chain when driver is null', () => {
    const chain = validateDispatch({
      vehicle: makeVehicle(),
      driver: null,
      cargoWeightKg: 5000,
      hasPreTripInspection: true,
      force: false,
    });

    expect(chain.length).toBe(4);
    const driverExists = chain.find((r) => r.rule === 'driver.exists');
    expect(driverExists?.ok).toBe(false);
  });
});

describe('canDispatch', () => {
  it('returns true when all rules ok', () => {
    const chain: RuleResult[] = [
      { rule: 'vehicle.exists', ok: true, message: '' },
      { rule: 'driver.exists', ok: true, message: '' },
    ];
    expect(canDispatch(chain, false)).toBe(true);
  });

  it('returns false when block rule fails', () => {
    const chain: RuleResult[] = [
      { rule: 'vehicle.exists', ok: false, reason: 'not_found', message: '', severity: 'block' },
    ];
    expect(canDispatch(chain, false)).toBe(false);
  });

  it('returns false for warn failure without force', () => {
    const chain: RuleResult[] = [
      { rule: 'driver.license_warn', ok: false, reason: 'expiring', message: '', severity: 'warn' },
    ];
    expect(canDispatch(chain, false)).toBe(false);
  });

  it('returns true for warn failure with force', () => {
    const chain: RuleResult[] = [
      { rule: 'driver.license_warn', ok: false, reason: 'expiring', message: '', severity: 'warn' },
    ];
    expect(canDispatch(chain, true)).toBe(true);
  });

  it('returns false for block failure even with force', () => {
    const chain: RuleResult[] = [
      { rule: 'driver.license_valid', ok: false, reason: 'expired', message: '', severity: 'block' },
    ];
    expect(canDispatch(chain, true)).toBe(false);
  });
});
