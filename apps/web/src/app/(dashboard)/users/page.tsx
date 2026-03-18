'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Group, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUserPlus } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { UserTable } from '@/components/users/UserTable';
import { useAuth } from '@/hooks/useAuth';

const UserFormModal = dynamic(
  () => import('@/components/users/UserFormModal').then((m) => m.UserFormModal),
  { ssr: false },
);

export default function UsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: actor } = useAuth();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/users?${params.toString()}`);
  };

  const canCreateUsers = actor && actor.role !== 'USER';
  const preloadModal = () => { import('@/components/users/UserFormModal'); };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Users</Title>
        {canCreateUsers && (
          <Button
            leftSection={<IconUserPlus size={16} />}
            onClick={openCreate}
            onMouseEnter={preloadModal}
            onFocus={preloadModal}
          >
            Create User
          </Button>
        )}
      </Group>

      <UserTable page={page} limit={limit} actor={actor} onPageChange={handlePageChange} />

      {canCreateUsers && (
        <UserFormModal mode="create" actor={actor} opened={createOpened} onClose={closeCreate} />
      )}
    </>
  );
}
