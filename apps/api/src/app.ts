import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { logger } from './lib/logger.js';
import { env } from './lib/env.js';
import authRoutes from './modules/auth/routes.js';
import vehicleRoutes from './modules/vehicles/routes.js';
import driverRoutes from './modules/drivers/routes.js';
import customerRoutes from './modules/customers/routes.js';
import tripRoutes from './modules/trips/routes.js';
import intelligenceRoutes from './modules/intelligence/routes.js';
import maintenanceRoutes from './modules/maintenance/routes.js';
import fuelRoutes from './modules/fuel/routes.js';
import expenseRoutes from './modules/expenses/routes.js';
import notificationRoutes from './modules/notifications/routes.js';
import syncRoutes from './modules/sync/routes.js';
import reportsRoutes from './modules/reports/routes.js';

export function createServer(): Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.NODE_ENV === 'production' ? false : true,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: env.NODE_ENV === 'production' ? 300 : 10_000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/readyz', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/v1', authRoutes);
  app.use('/api/v1', vehicleRoutes);
  app.use('/api/v1', driverRoutes);
  app.use('/api/v1', customerRoutes);
  app.use('/api/v1', tripRoutes);
  app.use('/api/v1', intelligenceRoutes);
  app.use('/api/v1', maintenanceRoutes);
  app.use('/api/v1', fuelRoutes);
  app.use('/api/v1', expenseRoutes);
  app.use('/api/v1', notificationRoutes);
  app.use('/api/v1', syncRoutes);
  app.use('/api/v1', reportsRoutes);

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
        trace_id: '',
      },
    });
  });

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error({ err }, 'unhandled error');
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
          trace_id: '',
        },
      });
    },
  );

  return app;
}
