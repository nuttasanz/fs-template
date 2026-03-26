import { AuditLogListener } from './audit-log.listener';
import { AuditLogEvent } from '../events/audit-log.event';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockRepo(shouldThrow = false) {
  return {
    create: jest.fn().mockImplementation(() => {
      if (shouldThrow) return Promise.reject(new Error('DB write failed'));
      return Promise.resolve();
    }),
  };
}

function makeEvent(overrides: Partial<AuditLogEvent> = {}): AuditLogEvent {
  return new AuditLogEvent(
    overrides.actorId ?? 'actor1',
    overrides.action ?? 'CREATE',
    overrides.targetId ?? 'target1',
    overrides.entityName ?? 'users',
    overrides.changes ?? { email: 'a@b.com' },
    overrides.ipAddress ?? '127.0.0.1',
  );
}

// ---------------------------------------------------------------------------
// AuditLogListener
// ---------------------------------------------------------------------------

describe('AuditLogListener — handleAuditLog', () => {
  it('inserts audit log entry via repository on event', async () => {
    const repo = makeMockRepo();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = new AuditLogListener(repo as any);
    const event = makeEvent();

    await listener.handleAuditLog(event);

    expect(repo.create).toHaveBeenCalledWith({
      actorId: 'actor1',
      action: 'CREATE',
      targetId: 'target1',
      entityName: 'users',
      changes: { email: 'a@b.com' },
      ipAddress: '127.0.0.1',
    });
  });

  it('propagates repository errors (repository handles try-catch internally)', async () => {
    const repo = makeMockRepo(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = new AuditLogListener(repo as any);
    const event = makeEvent();

    // The repository itself handles try-catch, so if it rejects, the listener propagates it.
    // In production the repository swallows errors — this test verifies the listener delegates.
    await expect(listener.handleAuditLog(event)).rejects.toThrow('DB write failed');
  });
});
