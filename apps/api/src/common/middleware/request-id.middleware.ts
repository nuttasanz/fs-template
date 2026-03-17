import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Re-use a caller-supplied ID (useful for distributed tracing) or generate a fresh one.
    // Node.js normalises incoming headers to lowercase, so we read 'x-request-id'.
    const id = (req.headers['x-request-id'] as string | undefined) || randomUUID();
    req.headers['x-request-id'] = id; // pino-http reads this via genReqId
    res.setHeader('X-Request-Id', id); // echo back to the client
    next();
  }
}
