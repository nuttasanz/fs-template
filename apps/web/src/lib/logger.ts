/**
 * Centralized error reporting abstraction.
 *
 * Currently logs to console. To integrate Sentry (or any other provider),
 * replace the body of `captureError` with `Sentry.captureException(error)`.
 */
export function captureError(error: unknown, context?: string): void {
  const prefix = context ? `[${context}]` : '[Error]';
  console.error(prefix, error);
}
