import { type Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../logger.js';

interface FleetMessage {
  type: 'position_update' | 'initial_state';
  payload: unknown;
}

const clients = new Map<string, Set<WebSocket>>();

export function createRealtimeServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/fleet' });

  wss.on('connection', (ws, req) => {
    const orgId = extractOrgId(req);
    if (!orgId) {
      ws.close(4001, 'Missing organization context');
      return;
    }

    const channel = `fleet:${orgId}`;
    addClient(channel, ws);
    logger.debug({ channel }, 'ws client connected');

    ws.send(JSON.stringify({ type: 'connected', payload: { channel } }));

    ws.on('close', () => {
      removeClient(channel, ws);
      logger.debug({ channel }, 'ws client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err, channel }, 'ws client error');
      removeClient(channel, ws);
    });
  });

  return wss;
}

function addClient(channel: string, ws: WebSocket) {
  if (!clients.has(channel)) {
    clients.set(channel, new Set());
  }
  clients.get(channel)!.add(ws);
}

function removeClient(channel: string, ws: WebSocket) {
  const set = clients.get(channel);
  if (set) {
    set.delete(ws);
    if (set.size === 0) clients.delete(channel);
  }
}

export function broadcastFleetUpdate(orgId: string, message: FleetMessage) {
  const channel = `fleet:${orgId}`;
  const set = clients.get(channel);
  if (!set || set.size === 0) return;

  const data = JSON.stringify(message);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function extractOrgId(req: import('node:http').IncomingMessage): string | null {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  return url.searchParams.get('org_id') || null;
}

export function getRealtimeStats() {
  const stats: Record<string, number> = {};
  for (const [ch, set] of clients) {
    stats[ch] = set.size;
  }
  return stats;
}
