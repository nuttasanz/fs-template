'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Group, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUserPlus } from '@tabler/icons-react';
import { UserTable } from '@/components/users/UserTable';
import { UserFormModal } from '@/components/users/UserFormModal';
import { useAuth } from '@/hooks/useAuth';

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

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Users</Title>
        {canCreateUsers && (
          <Button leftSection={<IconUserPlus size={16} />} onClick={openCreate}>
            Create User
          </Button>
        )}
      </Group>

      <UserTable
        page={page}
        limit={limit}
        actor={actor}
        onPageChange={handlePageChange}
      />

      {canCreateUsers && (
        <UserFormModal
          mode="create"
          actor={actor}
          opened={createOpened}
          onClose={closeCreate}
        />
      )}
    </>
  );
}
