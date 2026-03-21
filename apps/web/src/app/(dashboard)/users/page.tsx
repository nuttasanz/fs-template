import { Suspense } from 'react';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { Stack, Title, Skeleton } from '@mantine/core';
import type { UserDTO, PaginatedMeta } from '@repo/schemas';
import { apiFetch } from '@/lib/api';
import { UsersTable } from '@/features/users/components/UsersTable';

export const metadata: Metadata = {
  title: 'User Management | Admin Backoffice',
};

interface UsersPageProps {
  searchParams: Promise<{ cursor?: string; limit?: string }>;
}

async function UsersContent({ cursor, limit }: { cursor?: string; limit?: string }) {
  const cookieStore = await cookies();
  const sid = cookieStore.get('sid');
  const cookieHeader = sid ? `sid=${sid.value}` : '';

  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', limit ?? '20');

  const [usersResponse, meResponse] = await Promise.all([
    apiFetch<UserDTO[]>(`/api/v1/users?${params.toString()}`, {}, cookieHeader),
    apiFetch<UserDTO>('/api/v1/auth/me', {}, cookieHeader),
  ]);

  const users = usersResponse.data ?? [];
  const meta = (usersResponse.meta ?? { nextCursor: null, limit: 20 }) as PaginatedMeta;
  const actor = meResponse.data!;

  return (
    <UsersTable
      users={users}
      meta={meta}
      currentCursor={cursor}
      actor={actor}
    />
  );
}

function UsersTableSkeleton() {
  return (
    <Stack gap="xs">
      <Skeleton height={36} radius="sm" mb="xs" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} height={52} radius="sm" />
      ))}
    </Stack>
  );
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { cursor, limit } = await searchParams;

  return (
    <Stack gap="lg">
      <Title order={2}>User Management</Title>
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersContent cursor={cursor} limit={limit} />
      </Suspense>
    </Stack>
  );
}
