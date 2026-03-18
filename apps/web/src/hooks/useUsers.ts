import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { UserDTO, CreateUserDTO, UpdateUserDTO, UserRole, UserStatus } from '@repo/schemas';

export interface PaginatedUsers {
  data: UserDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface UseUsersParams {
  page: number;
  limit: number;
  role?: UserRole;
  status?: UserStatus;
}

export function useUsers(params: UseUsersParams) {
  const { page, limit, role, status } = params;
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  });

  return useQuery<PaginatedUsers>({
    queryKey: ['users', params],
    queryFn: () => apiGet<PaginatedUsers>(`/users?${qs.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateUserDTO) => apiPost<UserDTO>('/users', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserDTO }) =>
      apiPatch<UserDTO>(`/users/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
