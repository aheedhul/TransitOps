import type { RuleResult } from './dto.js';

interface VehicleInfo {
  id: string;
  status: string;
  type: string;
  maxLoadCapacity: string;
}

interface DriverInfo {
  id: string;
  status: string;
  licenseNumber: string;
  licenseExpiryDate: string;
}

interface ValidateDispatchInput {
  vehicle: VehicleInfo | null;
  driver: DriverInfo | null;
  cargoWeightKg: number;
  plannedDepartureAt?: string;
  hasPreTripInspection: boolean;
  force: boolean;
  overrideReason?: string;
  sourceLabel?: string;
  destinationLabel?: string;
}

/**
 * Pure function validating whether a trip can be dispatched.
 * Returns ordered chain of RuleResult per docs/05 §3 dispatch validation chain.
 */
export function validateDispatch(input: ValidateDispatchInput): RuleResult[] {
  const chain: RuleResult[] = [];
  const departureDate = input.plannedDepartureAt
    ? new Date(input.plannedDepartureAt)
    : new Date();

  // R1: vehicle.exists
  chain.push({
    rule: 'vehicle.exists',
    ok: input.vehicle !== null,
    reason: input.vehicle ? undefined : 'vehicle.not_found',
    message: input.vehicle
      ? 'Vehicle found'
      : 'Vehicle does not exist',
    field: 'vehicleId',
    severity: 'block',
  });

  if (!input.vehicle) return chain;

  // R2: vehicle.not_in_dispatch_pool (retired vehicles excluded)
  const vehicleRetired = input.vehicle.status === 'retired';
  chain.push({
    rule: 'vehicle.not_in_dispatch_pool',
    ok: !vehicleRetired && input.vehicle.status !== 'in-shop',
    reason: vehicleRetired
      ? 'vehicle.retired'
      : input.vehicle.status === 'in-shop'
        ? 'vehicle.in_shop'
        : undefined,
    message: vehicleRetired
      ? 'Vehicle is retired and cannot be dispatched'
      : input.vehicle.status === 'in-shop'
        ? 'Vehicle is currently in shop'
        : 'Vehicle is in the dispatch pool',
    field: 'vehicleId',
    severity: 'block',
  });

  // R3: vehicle.no_concurrent_trip
  const vehicleAvailable = input.vehicle.status === 'available';
  chain.push({
    rule: 'vehicle.no_concurrent_trip',
    ok: vehicleAvailable,
    reason: vehicleAvailable ? undefined : 'vehicle.on_trip',
    message: vehicleAvailable
      ? 'Vehicle is available'
      : `Vehicle is currently ${input.vehicle.status}`,
    field: 'vehicleId',
    severity: 'block',
  });

  // R4: driver.exists
  chain.push({
    rule: 'driver.exists',
    ok: input.driver !== null,
    reason: input.driver ? undefined : 'driver.not_found',
    message: input.driver ? 'Driver found' : 'Driver does not exist',
    field: 'driverId',
    severity: 'block',
  });

  if (!input.driver) return chain;

  // R5: driver.license_valid
  const licenseExpiry = new Date(input.driver.licenseExpiryDate);
  const licenseValid = licenseExpiry >= departureDate;
  const daysRemaining = Math.floor(
    (licenseExpiry.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  chain.push({
    rule: 'driver.license_valid',
    ok: licenseValid,
    reason: licenseValid ? undefined : 'driver.license_expired',
    message: licenseValid
      ? 'Driver license is valid'
      : `Driver license expired on ${input.driver.licenseExpiryDate}`,
    field: 'driverId',
    severity: 'block',
    metadata: {
      expiresOn: input.driver.licenseExpiryDate,
      daysRemaining,
    },
  });

  // R6: driver.license_warn (only if license not expired)
  const licenseExpiresSoon = licenseValid && daysRemaining <= 30;
  chain.push({
    rule: 'driver.license_warn',
    ok: !licenseExpiresSoon || input.force,
    reason: licenseExpiresSoon ? 'driver.license_expiring_soon' : undefined,
    message: licenseExpiresSoon
      ? `Driver license expires in ${daysRemaining} days`
      : 'No license warning',
    field: 'driverId',
    severity: 'warn',
    metadata: {
      expiresOn: input.driver.licenseExpiryDate,
      daysRemaining,
    },
  });

  // R7: driver.not_suspended
  const driverSuspended = input.driver.status === 'suspended';
  chain.push({
    rule: 'driver.not_suspended',
    ok: !driverSuspended,
    reason: driverSuspended ? 'driver.suspended' : undefined,
    message: driverSuspended
      ? 'Driver is suspended'
      : 'Driver is not suspended',
    field: 'driverId',
    severity: 'block',
  });

  // R8: driver.no_concurrent_trip
  const driverAvailable = input.driver.status === 'available';
  chain.push({
    rule: 'driver.no_concurrent_trip',
    ok: driverAvailable,
    reason: driverAvailable ? undefined : 'driver.on_trip',
    message: driverAvailable
      ? 'Driver is available'
      : `Driver is currently ${input.driver.status}`,
    field: 'driverId',
    severity: 'block',
  });

  // R9: vehicle.cargo_capacity
  const maxCapacity = parseFloat(input.vehicle.maxLoadCapacity);
  const overCapacity = input.cargoWeightKg > maxCapacity;
  chain.push({
    rule: 'vehicle.cargo_capacity',
    ok: !overCapacity,
    reason: overCapacity ? 'cargo.over_capacity' : undefined,
    message: overCapacity
      ? `Cargo weight ${input.cargoWeightKg}kg exceeds vehicle max capacity ${maxCapacity}kg`
      : 'Cargo weight within vehicle capacity',
    field: 'cargoWeightKg',
    severity: 'block',
    metadata: {
      maxCapacityKg: maxCapacity,
      cargoKg: input.cargoWeightKg,
    },
  });

  // R10: driver.pre_trip_required
  const preTripMissing = !input.hasPreTripInspection;
  chain.push({
    rule: 'driver.pre_trip_required',
    ok: !preTripMissing || input.force,
    reason: preTripMissing ? 'pre_trip.missing' : undefined,
    message: preTripMissing
      ? 'Pre-trip inspection has not been completed'
      : 'Pre-trip inspection completed',
    field: 'vehicleId',
    severity: 'warn',
  });

  // R11: route.distinct (source and destination must differ)
  const source = (input.sourceLabel ?? '').trim().toLowerCase();
  const destination = (input.destinationLabel ?? '').trim().toLowerCase();
  const routeDistinct =
    source.length > 0 && destination.length > 0 && source !== destination;
  chain.push({
    rule: 'route.distinct',
    ok: routeDistinct,
    reason: !routeDistinct ? 'route.same_source_destination' : undefined,
    message: !routeDistinct
      ? source.length === 0 || destination.length === 0
        ? 'Source and destination are required'
        : 'Source and destination must be different'
      : 'Source and destination are different',
    field: 'sourceLabel',
    severity: 'block',
  });

  return chain;
}

/**
 * Returns whether dispatch is allowed based on the rule chain.
 * Block failures prevent dispatch; warn failures can be overridden.
 */
export function canDispatch(chain: RuleResult[], force: boolean, _overrideReason?: string): boolean {
  const blockers = chain.filter(
    (r) => !r.ok && (r.severity === 'block' || (r.severity === 'warn' && !force)),
  );
  return blockers.length === 0;
}
