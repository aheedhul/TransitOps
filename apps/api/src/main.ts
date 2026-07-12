import { createServer } from './app.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';

const app = createServer();

const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, 'api listening');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down');
  server.close(() => process.exit(0));
});
