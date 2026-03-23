import { SessionCleanupService } from './session-cleanup.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb(rowCounts: number[]) {
  let callIndex = 0;
  return {
    execute: jest.fn().mockImplementation(() => {
      const rowCount = rowCounts[callIndex++] ?? 0;
      return Promise.resolve({ rowCount });
    }),
  };
}

// ---------------------------------------------------------------------------
// purgeExpiredSessions
// ---------------------------------------------------------------------------

describe('SessionCleanupService — purgeExpiredSessions', () => {
  it('purges expired sessions in batch loop until none remain', async () => {
    // Two batches: first deletes 1000, second deletes 500, third returns 0 → stop
    const db = makeDb([1000, 500, 0]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new SessionCleanupService(db as any);
    await service.purgeExpiredSessions();

    expect(db.execute).toHaveBeenCalledTimes(3);
  });

  it('exits immediately when zero expired sessions exist', async () => {
    const db = makeDb([0]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new SessionCleanupService(db as any);
    await service.purgeExpiredSessions();

    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it('handles multiple full batches before a partial batch', async () => {
    // Three full batches of 1000, then a partial batch of 200, then 0
    const db = makeDb([1000, 1000, 1000, 200, 0]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new SessionCleanupService(db as any);
    await service.purgeExpiredSessions();

    expect(db.execute).toHaveBeenCalledTimes(5);
  });
});
