import { AuditLogListener } from './audit-log.listener';
import { AuditLogEvent } from '../events/audit-log.event';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb(shouldThrow = false) {
  const values = jest.fn().mockImplementation(() => {
    if (shouldThrow) return Promise.reject(new Error('DB write failed'));
    return Promise.resolve();
  });

  return {
    insert: jest.fn().mockReturnValue({ values }),
    _values: values,
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
  it('inserts audit log entry into DB on event', async () => {
    const db = makeDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = new AuditLogListener(db as any);
    const event = makeEvent();

    await listener.handleAuditLog(event);

    expect(db.insert).toHaveBeenCalled();
    expect(db._values).toHaveBeenCalledWith({
      actorId: 'actor1',
      action: 'CREATE',
      targetId: 'target1',
      entityName: 'users',
      changes: { email: 'a@b.com' },
      ipAddress: '127.0.0.1',
    });
  });

  it('catches and logs DB write failure without throwing', async () => {
    const db = makeDb(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = new AuditLogListener(db as any);
    const event = makeEvent();

    // Should not throw — failure is swallowed and logged
    await expect(listener.handleAuditLog(event)).resolves.toBeUndefined();
  });
});
