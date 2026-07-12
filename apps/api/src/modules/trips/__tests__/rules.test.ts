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

const makeInput = (overrides: Partial<Parameters<typeof validateDispatch>[0]> = {}) => ({
  vehicle: makeVehicle(),
  driver: makeDriver(),
  cargoWeightKg: 5000,
  hasPreTripInspection: true,
  force: false,
  sourceLabel: 'Yelahanka Depot',
  destinationLabel: 'MG Road, Bangalore',
  ...overrides,
});

describe('validateDispatch', () => {
  it('returns all 11 ok for a valid vehicle/driver/cargo/route', () => {
    const chain = validateDispatch(makeInput());

    expect(chain).toHaveLength(11);
    expect(chain.every((r) => r.ok)).toBe(true);
  });

  it('emits the 11 expected rule ids in order', () => {
    const chain = validateDispatch(makeInput());
    expect(chain.map((r) => r.rule)).toEqual([
      'vehicle.exists',
      'vehicle.not_in_dispatch_pool',
      'vehicle.no_concurrent_trip',
      'driver.exists',
      'driver.license_valid',
      'driver.license_warn',
      'driver.not_suspended',
      'driver.no_concurrent_trip',
      'vehicle.cargo_capacity',
      'driver.pre_trip_required',
      'route.distinct',
    ]);
  });

  it('blocks R1 vehicle.exists when vehicle is null', () => {
    const chain = validateDispatch(makeInput({ vehicle: null }));

    const rule = chain.find((r) => r.rule === 'vehicle.exists');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('vehicle.not_found');
    expect(rule?.severity).toBe('block');
  });

  it('blocks R2 vehicle.not_in_dispatch_pool for retired and in-shop', () => {
    const retired = validateDispatch(makeInput({ vehicle: makeVehicle({ status: 'retired' }) }));
    expect(retired.find((r) => r.rule === 'vehicle.not_in_dispatch_pool')?.reason).toBe('vehicle.retired');

    const inShop = validateDispatch(makeInput({ vehicle: makeVehicle({ status: 'in-shop' }) }));
    expect(inShop.find((r) => r.rule === 'vehicle.not_in_dispatch_pool')?.reason).toBe('vehicle.in_shop');
  });

  it('blocks R3 vehicle.no_concurrent_trip when vehicle is on-trip', () => {
    const chain = validateDispatch(makeInput({ vehicle: makeVehicle({ status: 'on-trip' }) }));
    const rule = chain.find((r) => r.rule === 'vehicle.no_concurrent_trip');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('vehicle.on_trip');
  });

  it('blocks R4 driver.exists when driver is null', () => {
    const chain = validateDispatch(makeInput({ driver: null }));
    const rule = chain.find((r) => r.rule === 'driver.exists');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('driver.not_found');
  });

  it('blocks R5 driver.license_valid for expired license', () => {
    const chain = validateDispatch(makeInput({ driver: makeDriver({ licenseExpiryDate: '2020-01-01' }) }));
    const rule = chain.find((r) => r.rule === 'driver.license_valid');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('driver.license_expired');
    expect((rule?.metadata as { daysRemaining?: number } | undefined)?.daysRemaining).toBeLessThan(0);
  });

  it('warns R6 driver.license_warn when expiring within 30 days, passes with force', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const expiryStr = futureDate.toISOString().split('T')[0]!;

    const withoutForce = validateDispatch(
      makeInput({ driver: makeDriver({ licenseExpiryDate: expiryStr }) }),
    );
    const warn = withoutForce.find((r) => r.rule === 'driver.license_warn');
    expect(warn?.ok).toBe(false);
    expect(warn?.severity).toBe('warn');

    const withForce = validateDispatch(
      makeInput({ driver: makeDriver({ licenseExpiryDate: expiryStr }), force: true }),
    );
    const warnedRule = withForce.find((r) => r.rule === 'driver.license_warn');
    expect(warnedRule?.ok).toBe(true);
  });

  it('blocks R7 driver.not_suspended for suspended drivers', () => {
    const chain = validateDispatch(makeInput({ driver: makeDriver({ status: 'suspended' }) }));
    const rule = chain.find((r) => r.rule === 'driver.not_suspended');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('driver.suspended');
  });

  it('blocks R8 driver.no_concurrent_trip when driver is on-trip', () => {
    const chain = validateDispatch(makeInput({ driver: makeDriver({ status: 'on-trip' }) }));
    const rule = chain.find((r) => r.rule === 'driver.no_concurrent_trip');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('driver.on_trip');
  });

  it('blocks R9 vehicle.cargo_capacity when over capacity', () => {
    const chain = validateDispatch(
      makeInput({ vehicle: makeVehicle({ maxLoadCapacity: '5000.00' }), cargoWeightKg: 8000 }),
    );
    const rule = chain.find((r) => r.rule === 'vehicle.cargo_capacity');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('cargo.over_capacity');
    expect((rule?.metadata as { maxCapacityKg?: number; cargoKg?: number } | undefined)?.maxCapacityKg).toBe(5000);
    expect((rule?.metadata as { maxCapacityKg?: number; cargoKg?: number } | undefined)?.cargoKg).toBe(8000);
  });

  it('warns R10 driver.pre_trip_required when inspection missing, passes with force', () => {
    const withoutForce = validateDispatch(makeInput({ hasPreTripInspection: false }));
    const rule = withoutForce.find((r) => r.rule === 'driver.pre_trip_required');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('pre_trip.missing');
    expect(rule?.severity).toBe('warn');

    const withForce = validateDispatch(makeInput({ hasPreTripInspection: false, force: true }));
    expect(withForce.find((r) => r.rule === 'driver.pre_trip_required')?.ok).toBe(true);
  });

  it('blocks R11 route.distinct when source equals destination', () => {
    const same = validateDispatch(
      makeInput({ sourceLabel: 'Yelahanka Depot', destinationLabel: 'Yelahanka Depot' }),
    );
    const rule = same.find((r) => r.rule === 'route.distinct');
    expect(rule?.ok).toBe(false);
    expect(rule?.reason).toBe('route.same_source_destination');

    const empty = validateDispatch(
      makeInput({ sourceLabel: '', destinationLabel: '' }),
    );
    const emptyRule = empty.find((r) => r.rule === 'route.distinct');
    expect(emptyRule?.ok).toBe(false);
  });
});

describe('canDispatch', () => {
  it('returns true when chain is empty (no failures)', () => {
    const chain: RuleResult[] = [
      { rule: 'vehicle.exists', ok: true, message: '' },
      { rule: 'driver.exists', ok: true, message: '' },
    ];
    expect(canDispatch(chain, false)).toBe(true);
  });

  it('returns false for a single block failure even with force', () => {
    const chain: RuleResult[] = [
      { rule: 'driver.license_valid', ok: false, reason: 'expired', message: '', severity: 'block' },
    ];
    expect(canDispatch(chain, true)).toBe(false);
  });

  it('returns false for warn failure without force, true with force', () => {
    const chain: RuleResult[] = [
      { rule: 'driver.license_warn', ok: false, reason: 'expiring', message: '', severity: 'warn' },
    ];
    expect(canDispatch(chain, false)).toBe(false);
    expect(canDispatch(chain, true)).toBe(true);
  });

  it('respects force: warn becomes allowed, block still blocks', () => {
    const chain: RuleResult[] = [
      { rule: 'driver.license_warn', ok: false, reason: 'expiring', message: '', severity: 'warn' },
      { rule: 'route.distinct', ok: false, reason: 'same', message: '', severity: 'block' },
    ];
    expect(canDispatch(chain, false)).toBe(false);
    expect(canDispatch(chain, true)).toBe(false);

    const onlyWarn: RuleResult[] = [
      { rule: 'driver.license_warn', ok: false, reason: 'expiring', message: '', severity: 'warn' },
    ];
    expect(canDispatch(onlyWarn, false)).toBe(false);
    expect(canDispatch(onlyWarn, true)).toBe(true);
  });
});
