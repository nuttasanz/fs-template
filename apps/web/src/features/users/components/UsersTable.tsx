'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Text, Stack, Paper, Center } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useDebouncedCallback } from '@mantine/hooks';
import type { UserDTO, PaginatedMeta } from '@repo/schemas';
import { deleteUserAction } from '../actions';
import { UsersFilterBar } from './UsersFilterBar';
import { UsersTableRow } from './UsersTableRow';
import { UsersPagination } from './UsersPagination';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { toast } from '@/lib/toast';

interface UsersTableProps {
  users: UserDTO[];
  meta: PaginatedMeta;
  actor: UserDTO;
  currentRole?: string;
  currentStatus?: string;
  currentSearch?: string;
}

export function UsersTable({
  users,
  meta,
  actor,
  currentRole,
  currentStatus,
  currentSearch,
}: UsersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [searchValue, setSearchValue] = useState(currentSearch ?? '');

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      role: currentRole,
      status: currentStatus,
      search: currentSearch,
      page: String(meta.currentPage),
      pageSize: String(meta.pageSize),
      ...overrides,
    };
    for (const [key, val] of Object.entries(merged)) {
      if (val) params.set(key, val);
    }
    const qs = params.toString();
    return qs ? `/users?${qs}` : '/users';
  }

  const debouncedSearch = useDebouncedCallback((value: string) => {
    startTransition(() => {
      router.push(buildUrl({ search: value || undefined, page: '1' }));
    });
  }, 400);

  function handleSearchChange(value: string) {
    setSearchValue(value);
    debouncedSearch(value);
  }

  function handleFilter(key: string, value: string | null) {
    startTransition(() => {
      router.push(buildUrl({ [key]: value ?? undefined, page: '1' }));
    });
  }

  function handlePageChange(page: number) {
    startTransition(() => {
      router.push(buildUrl({ page: String(page) }));
    });
  }

  function handlePageSizeChange(pageSize: string) {
    startTransition(() => {
      router.push(buildUrl({ pageSize, page: '1' }));
    });
  }

  function handleDelete(user: UserDTO) {
    modals.openConfirmModal({
      title: 'Delete User',
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete{' '}
          <strong>
            {user.profile.firstName} {user.profile.lastName}
          </strong>
          ? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        startTransition(async () => {
          const result = await deleteUserAction(user.id);
          if (result.success) {
            toast.success('User deleted.');
            router.refresh();
          } else {
            toast.error(result.error, { title: 'Failed to delete user' });
          }
        });
      },
    });
  }

  return (
    <>
      <Stack gap="md">
        <UsersFilterBar
          actor={actor}
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          currentRole={currentRole}
          currentStatus={currentStatus}
          onFilterChange={handleFilter}
          onCreateClick={() => setCreateOpen(true)}
        />

        <Paper
          withBorder
          radius="md"
          style={{
            opacity: isPending ? 0.6 : 1,
            pointerEvents: isPending ? 'none' : 'auto',
            transition: 'opacity 200ms ease',
          }}
        >
          <Table.ScrollContainer minWidth={500} h={400}>
            <Table highlightOnHover stickyHeader stickyHeaderOffset={0}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <UsersTableRow
                      key={user.id}
                      user={user}
                      actor={actor}
                      isPending={isPending}
                      onEdit={setEditingUser}
                      onDelete={handleDelete}
                    />
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Center py="xl">
                        <Text c="dimmed" size="sm">
                          No users found.
                        </Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
        <UsersPagination
          meta={meta}
          isPending={isPending}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </Stack>

      <CreateUserModal opened={createOpen} onClose={() => setCreateOpen(false)} actor={actor} />

      {editingUser && (
        <EditUserModal
          key={editingUser.id}
          opened={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          actor={actor}
        />
      )}
    </>
  );
}
