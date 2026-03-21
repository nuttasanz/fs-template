/**
 * Generates a standardized Swagger schema object for error responses.
 * Mirrors the `ErrorResponse` shape from `@repo/schemas` so that all
 * error `@ApiResponse` decorators across controllers show a consistent,
 * documented contract in the Swagger UI.
 */
export function swaggerErrorSchema(exampleCode: string, examplePath = '/api/v1/...') {
  return {
    type: 'object' as const,
    properties: {
      success: { type: 'boolean' as const, example: false },
      message: { type: 'string' as const, example: 'Human-readable error summary.' },
      code: { type: 'string' as const, example: exampleCode },
      errors: {
        type: 'array' as const,
        description: 'Present only for VALIDATION_FAILED responses.',
        items: {
          type: 'object' as const,
          properties: {
            field: { type: 'string' as const, example: 'email' },
            message: { type: 'string' as const, example: 'Invalid email address.' },
          },
        },
      },
      timestamp: { type: 'string' as const, format: 'date-time' },
      path: { type: 'string' as const, example: examplePath },
    },
  };
}
