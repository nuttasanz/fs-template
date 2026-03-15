import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService — RBAC enforcement', () => {
  // Instantiate with a minimal mock; enforceRbac has no DB dependency.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new UsersService({} as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enforce = (actorRole: string, targetRole: string) => (service as any).enforceRbac(actorRole, targetRole);

  it('ADMIN cannot manage another ADMIN', () => {
    expect(() => enforce('ADMIN', 'ADMIN')).toThrow(ForbiddenException);
  });

  it('ADMIN cannot manage SUPER_ADMIN', () => {
    expect(() => enforce('ADMIN', 'SUPER_ADMIN')).toThrow(ForbiddenException);
  });

  it('ADMIN can manage USER', () => {
    expect(() => enforce('ADMIN', 'USER')).not.toThrow();
  });

  it('SUPER_ADMIN can manage ADMIN', () => {
    expect(() => enforce('SUPER_ADMIN', 'ADMIN')).not.toThrow();
  });

  it('SUPER_ADMIN can manage SUPER_ADMIN', () => {
    expect(() => enforce('SUPER_ADMIN', 'SUPER_ADMIN')).not.toThrow();
  });

  it('USER cannot manage another USER', () => {
    expect(() => enforce('USER', 'USER')).toThrow(ForbiddenException);
  });
});
