import type { UserRole } from '@repo/schemas';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

// Augment Express Request so req.sessionUser is typed throughout the app.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sessionUser?: SessionUser;
    }
  }
}
