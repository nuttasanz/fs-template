import { z } from 'zod';

// ---------------------------------------------------------------------------
// ErrorCode — machine-readable codes for all error responses
// ---------------------------------------------------------------------------

export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ---------------------------------------------------------------------------
// ErrorField — a single per-field validation error
// ---------------------------------------------------------------------------

export const ErrorFieldSchema = z.object({
  field: z
    .string()
    .describe(
      "The field that failed validation (dot-notation for nested fields, '_root' for form-level errors).",
    ),
  message: z.string().describe('A human-readable description of the validation failure.'),
});

export type ErrorField = z.infer<typeof ErrorFieldSchema>;

// ---------------------------------------------------------------------------
// ErrorResponse — the standardised error envelope returned by the API on failure
// ---------------------------------------------------------------------------

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string().describe('A human-readable summary of the error.'),
  code: z
    .string()
    .describe('A machine-readable error code (e.g. VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND).'),
  errors: z
    .array(ErrorFieldSchema)
    .optional()
    .describe('Per-field validation errors. Present only for VALIDATION_ERROR responses.'),
  timestamp: z
    .string()
    .datetime()
    .optional()
    .describe('ISO 8601 timestamp of when the error occurred.'),
  path: z.string().optional().describe('The request path that produced this error.'),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ---------------------------------------------------------------------------
// BaseResponse<T> — the standardised success envelope returned by the API
//
// Usage (Zod schema factory):
//   const UsersResponseSchema = BaseResponseSchema(z.array(UserDTOSchema));
//
// Usage (TypeScript type):
//   const body: BaseResponse<UserDTO[]> = { success: true, message: 'OK', data: [...] };
// ---------------------------------------------------------------------------

export const BaseResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
  z.object({
    success: z.literal(true),
    message: z.string().describe('A human-readable description of the outcome.'),
    data: dataSchema
      .optional()
      .describe('The response payload. Omitted when there is no data to return.'),
    meta: z
      .unknown()
      .optional()
      .describe('Optional envelope metadata (e.g. pagination cursors, totals).'),
  });

export type BaseResponse<T, TMeta = unknown> = {
  success: true;
  message: string;
  data?: T;
  meta?: TMeta;
};

// ---------------------------------------------------------------------------
// PaginatedBaseResponse<T> — success envelope for paginated list endpoints
//
// The TransformInterceptor wraps paginated results under the `result` key
// (not `data`) to distinguish them from single-entity responses.
// ---------------------------------------------------------------------------

export const PaginatedBaseResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
  z.object({
    success: z.literal(true),
    message: z.string().describe('A human-readable description of the outcome.'),
    result: dataSchema.optional().describe('The paginated result set.'),
    meta: PaginatedMetaSchema.optional().describe('Pagination metadata.'),
  });

export type PaginatedBaseResponse<T> = {
  success: true;
  message: string;
  result?: T;
  meta?: PaginatedMeta;
};

// ---------------------------------------------------------------------------
// PaginatedMeta — standard pagination metadata returned alongside list endpoints
// ---------------------------------------------------------------------------

export const PaginatedMetaSchema = z.object({
  totalItems: z.number().int().nonnegative().describe('Total number of items matching the query.'),
  totalPages: z.number().int().nonnegative().describe('Total number of pages.'),
  currentPage: z.number().int().positive().describe('The current page number (1-based).'),
  pageSize: z.number().int().positive().describe('The number of items per page.'),
});

export type PaginatedMeta = z.infer<typeof PaginatedMetaSchema>;
