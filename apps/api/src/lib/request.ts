import { type Request } from 'express';

export function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function getActor(req: Request) {
  const actor = req.actor;
  if (!actor) {
    throw new Error('actor not set   ensure requireAuth middleware runs before this handler');
  }
  return actor;
}
