import { Suspense } from 'react';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { Stack, Title, Skeleton } from '@mantine/core';
import type { UserDTO, PaginatedMeta } from '@repo/schemas';
import { paginatedApiFetch } from '@/lib/api';
import { getMe } from '@/lib/auth';
import { UsersTable } from '@/features/users/components/UsersTable';

export const metadata: Metadata = {
  title: 'User Management | Admin Backoffice',
};

interface UsersPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    role?: string;
    status?: string;
    search?: string;
  }>;
}

async function UsersContent({
  page,
  pageSize,
  role,
  status,
  search,
}: {
  page?: string;
  pageSize?: string;
  role?: string;
  status?: string;
  search?: string;
}) {
  const cookieStore = await cookies();
  const sid = cookieStore.get('sid');
  const cookieHeader = sid ? `sid=${sid.value}` : '';

  const params = new URLSearchParams();
  params.set('page', page ?? '1');
  params.set('pageSize', pageSize ?? '10');
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  const [usersResponse, actor] = await Promise.all([
    paginatedApiFetch<UserDTO>(`/api/v1/users?${params.toString()}`, {}, cookieHeader),
    getMe(),
  ]);

  const users = usersResponse.data ?? [];
  const meta: PaginatedMeta = usersResponse.meta ?? {
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  return (
    <UsersTable
      users={users}
      meta={meta}
      actor={actor}
      currentRole={role}
      currentStatus={status}
      currentSearch={search}
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
  const { page, pageSize, role, status, search } = await searchParams;

  return (
    <Stack gap="lg">
      <Title order={2}>User Management</Title>
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersContent page={page} pageSize={pageSize} role={role} status={status} search={search} />
      </Suspense>
    </Stack>
  );
}
