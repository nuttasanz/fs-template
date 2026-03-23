/**
 * Minimal shape of a node-postgres (pg) DatabaseError.
 * Used for type-safe detection of SQLSTATE codes (e.g. '23505' unique_violation).
 */
export interface PgDatabaseError extends Error {
  code: string;
}

/** Type guard — checks whether an unknown value is a pg DatabaseError with a 5-digit SQLSTATE code. */
export function isPgDatabaseError(error: unknown): error is PgDatabaseError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as Record<string, unknown>)['code'] === 'string' &&
    /^\d{5}$/.test((error as Record<string, unknown>)['code'] as string)
  );
}
