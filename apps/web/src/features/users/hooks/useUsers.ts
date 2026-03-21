interface UserListParams {
  cursor?: string;
  limit: number;
  search: string;
}

export const userKeys = {
  all: ['users'] as const,
  list: (params: UserListParams) => [...userKeys.all, 'list', params] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
} as const;
