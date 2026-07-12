declare global {
  namespace Express {
    interface Request {
      actor?: {
        userId: string;
        role: string;
        orgId: string;
        scopes: string[];
      };
      traceId?: string;
    }
  }
}

export {};
