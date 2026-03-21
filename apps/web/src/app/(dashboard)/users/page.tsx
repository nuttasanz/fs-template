import { cookies } from 'next/headers';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { UserDTO } from '@repo/schemas';
import { apiFetch } from '@/lib/api';
import { makeQueryClient } from '@/lib/query-client';
import { userKeys } from '@/features/users/hooks/useUsers';
import { UsersTable } from '@/features/users/components/UsersTable';
import { Title, Stack } from '@mantine/core';

const DEFAULT_PARAMS = { cursor: undefined, limit: 20, search: '' };

export default async function UsersPage() {
  const cookieStore = await cookies();
  const sid = cookieStore.get('sid');
  const cookieHeader = sid ? `sid=${sid.value}` : '';

  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: userKeys.list(DEFAULT_PARAMS),
    queryFn: () =>
      apiFetch<UserDTO[]>(
        `/api/users?limit=${DEFAULT_PARAMS.limit}`,
        {},
        cookieHeader,
      ),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Stack gap="lg">
        <Title order={2}>Users</Title>
        <UsersTable />
      </Stack>
    </HydrationBoundary>
  );
}
