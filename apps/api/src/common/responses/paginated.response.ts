import type { PaginatedMeta } from '@repo/schemas';

export class PaginatedResponse<T> {
  constructor(
    public readonly data: T[],
    public readonly meta: PaginatedMeta,
  ) {}
}
