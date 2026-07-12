import { type Request, type Response, type NextFunction } from 'express';
import { verifyAccessToken } from '../lib/auth/crypto.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
        trace_id: req.traceId ?? '',
      },
    });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.actor = {
      userId: payload.sub,
      role: payload.role,
      orgId: payload.org_id,
      scopes: payload.scope,
    };
    next();
  } catch {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        trace_id: req.traceId ?? '',
      },
    });
  }
}

export function requireCapability(capability: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.actor) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          trace_id: req.traceId ?? '',
        },
      });
      return;
    }

    const { role } = req.actor;
    const allowed = CAPABILITIES[capability];
    if (!allowed?.includes(role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Missing required capability: ${capability}`,
          trace_id: req.traceId ?? '',
        },
      });
      return;
    }

    next();
  };
}

const CAPABILITIES: Record<string, string[]> = {
  'vehicle.read': ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
  'vehicle.create': ['admin', 'fleet_manager'],
  'vehicle.update': ['admin', 'fleet_manager'],
  'vehicle.delete': ['admin'],
  'vehicle.retire': ['admin', 'fleet_manager'],
  'driver.read': ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
  'driver.create': ['admin'],
  'driver.update': ['admin'],
  'driver.suspend': ['admin', 'safety_officer'],
  'trip.read': ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
  'trip.create': ['admin', 'fleet_manager', 'driver'],
  'trip.dispatch': ['admin', 'fleet_manager'],
  'trip.complete': ['admin', 'fleet_manager', 'driver'],
  'trip.cancel': ['admin', 'fleet_manager', 'driver'],
  'maintenance.read': ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
  'maintenance.create': ['admin', 'fleet_manager', 'driver'],
  'maintenance.close': ['admin', 'fleet_manager'],
  'fuel_log.create': ['admin', 'fleet_manager', 'driver', 'financial_analyst'],
  'expense.create': ['admin', 'fleet_manager', 'driver', 'financial_analyst'],
  'reports.read': ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
  'reports.export': ['admin', 'fleet_manager', 'financial_analyst'],
  'audit.read': ['admin'],
  'users.manage': ['admin'],
  'settings.manage': ['admin'],
  'notifications.read': ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
  'notifications.send.test': ['admin'],
  'dashboard.realtime.subscribe': ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
};
