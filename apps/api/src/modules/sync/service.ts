import { SyncRepository } from './repository.js';
import { TripService, NotFoundError, ConflictError, BusinessRuleError } from '../trips/service.js';
import { FuelService } from '../fuel/service.js';
import { MaintenanceService } from '../maintenance/service.js';
import { ExpenseService } from '../expenses/service.js';
import type { PushMutation, PushResult, PushResponse, PullResponse } from './dto.js';

export class SyncService {
  private readonly syncRepo: SyncRepository;
  private readonly tripService: TripService;
  private readonly fuelService: FuelService;
  private readonly maintenanceService: MaintenanceService;
  private readonly expenseService: ExpenseService;

  constructor() {
    this.syncRepo = new SyncRepository();
    this.tripService = new TripService();
    this.fuelService = new FuelService();
    this.maintenanceService = new MaintenanceService();
    this.expenseService = new ExpenseService();
  }

  async processPush(
    mutations: PushMutation[],
    orgId: string,
    actorId: string,
  ): Promise<PushResponse> {
    const results: PushResult[] = [];

    for (const mutation of mutations) {
      try {
        const existing = await this.syncRepo.checkIdempotencyKey(mutation.idempotencyKey);

        if (existing?.exists) {
          results.push({
            idempotencyKey: mutation.idempotencyKey,
            status: 'replayed',
            entity: existing.entityId
              ? { type: mutation.type.split('.')[0] ?? 'unknown', id: existing.entityId, etag: '', updatedAt: new Date().toISOString() }
              : undefined,
          });
          continue;
        }

        const result = await this.applyMutation(mutation, orgId, actorId);
        results.push(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        const code =
          err instanceof NotFoundError
            ? 'NOT_FOUND'
            : err instanceof ConflictError
              ? 'CONFLICT'
              : err instanceof BusinessRuleError
                ? 'BUSINESS_RULE_VIOLATION'
                : 'INTERNAL_ERROR';

        results.push({
          idempotencyKey: mutation.idempotencyKey,
          status: 'rejected',
          error: { code, message },
        });

        void this.syncRepo.storeIdempotencyResult({
          key: mutation.idempotencyKey,
          organizationId: orgId,
          mutationType: mutation.type,
          entityId: mutation.entityId,
          status: 'rejected',
          error: { code, message },
        });
      }
    }

    return {
      results,
      serverClock: new Date().toISOString(),
      nextCursor: new Date().toISOString(),
    };
  }

  private async applyMutation(
    mutation: PushMutation,
    orgId: string,
    actorId: string,
  ): Promise<PushResult> {
    const entity = await this.executeMutation(mutation, orgId, actorId);

    await this.syncRepo.storeIdempotencyResult({
      key: mutation.idempotencyKey,
      organizationId: orgId,
      mutationType: mutation.type,
      entityId: mutation.entityId,
      status: 'applied',
      result: entity,
    });

    return {
      idempotencyKey: mutation.idempotencyKey,
      status: 'applied',
      entity: {
        type: mutation.type.split('.')[0] ?? 'unknown',
        id: (entity as Record<string, unknown>)?.id as string ?? mutation.entityId,
        etag: '',
        updatedAt: new Date().toISOString(),
      },
    };
  }

  private async executeMutation(
    mutation: PushMutation,
    orgId: string,
    actorId: string,
  ): Promise<unknown> {
    const p = mutation.payload as Record<string, unknown>;

    switch (mutation.type) {
      case 'trip.start': {
        return this.tripService.start(mutation.entityId, orgId, {
          lat: p.lat as number | undefined,
          lng: p.lng as number | undefined,
          odometerKm: p.odometerKm as number | undefined,
        }, actorId);
      }

      case 'trip.checkpoint': {
        return this.tripService.addCheckpoint(mutation.entityId, orgId, {
          lat: p.lat as number,
          lng: p.lng as number,
          odometerKm: p.odometerKm as number | undefined,
          note: p.note as string | undefined,
        }, actorId);
      }

      case 'trip.complete': {
        return this.tripService.complete(mutation.entityId, orgId, {
          actualDistanceKm: p.actualDistanceKm as number,
          fuelConsumedL: p.fuelConsumedL as number,
          actualTravelMins: p.actualTravelMins as number | undefined,
          lat: p.lat as number | undefined,
          lng: p.lng as number | undefined,
          odometerKm: p.odometerKm as number | undefined,
        }, actorId);
      }

      case 'trip.cancel': {
        return this.tripService.cancel(mutation.entityId, orgId, {
          cancelReason: (p.cancelReason as 'customer' | 'vehicle_breakdown' | 'weather' | 'compliance' | 'duplicate' | 'other') ?? 'customer',
        }, actorId);
      }

      case 'trip.dispatch': {
        return this.tripService.dispatch(mutation.entityId, orgId, {
          force: (p.force as boolean) ?? false,
          overrideReason: p.overrideReason as 'customer' | 'capacity_tolerance' | 'license_warn' | undefined,
        }, actorId);
      }

      case 'fuel_log.create': {
        return this.fuelService.create({
          vehicleId: p.vehicleId as string,
          liters: p.liters as number,
          cost: p.cost as number,
          odometerKm: p.odometerKm as number,
          fuelType: p.fuelType as string,
          filledStation: p.filledStation as string | undefined,
          filledAt: p.filledAt as string,
          tripId: p.tripId as string | undefined,
        }, orgId, actorId);
      }

      case 'maintenance.create': {
        return this.maintenanceService.create({
          vehicleId: p.vehicleId as string,
          type: p.type as 'oil_change' | 'tyre' | 'brake' | 'service' | 'inspection' | 'repair' | 'other',
          description: p.description as string,
          serviceOdometer: p.serviceOdometer as number | undefined,
          cost: (p.cost as number) ?? 0,
          vendor: p.vendor as string | undefined,
        }, orgId, actorId);
      }

      case 'maintenance.close': {
        return this.maintenanceService.close(mutation.entityId, orgId, actorId);
      }

      case 'expense.create': {
        return this.expenseService.create({
          vehicleId: p.vehicleId as string,
          type: p.type as 'toll' | 'parking' | 'repair' | 'misc' | 'document',
          amount: p.amount as number,
          incurredAt: p.incurredAt as string,
          tripId: p.tripId as string | undefined,
        }, orgId, actorId);
      }

      default:
        throw new BusinessRuleError(`Unknown mutation type: ${mutation.type}`);
    }
  }

  async processPull(orgId: string, since: string, entityTypes?: string[]): Promise<PullResponse> {
    const sinceDate = new Date(since);
    const types = entityTypes ?? ['vehicles', 'drivers', 'customers', 'trips', 'fuel_logs', 'expenses', 'maintenance_logs', 'notifications'];

    const deltas = await this.syncRepo.pullChanges(orgId, sinceDate, types);

    return {
      deltas,
      nextCursor: new Date().toISOString(),
      serverClock: new Date().toISOString(),
      hasMore: deltas.length >= 200,
    };
  }
}

export { NotFoundError, ConflictError, BusinessRuleError };
