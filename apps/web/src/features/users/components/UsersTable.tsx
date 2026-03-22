'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Group,
  Text,
  TextInput,
  Badge,
  ActionIcon,
  Button,
  Stack,
  Paper,
  Center,
  Tooltip,
  Select,
  Pagination,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconPencil, IconSearch, IconTrash, IconUserPlus } from '@tabler/icons-react';
import { useDebouncedCallback } from '@mantine/hooks';
import {
  canManageRole,
  UserRoleSchema,
  UserStatusSchema,
  type UserDTO,
  type PaginatedMeta,
} from '@repo/schemas';
import { deleteUserAction } from '../actions';
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

const ROLE_OPTIONS = UserRoleSchema.options.map((r) => ({ value: r, label: r.replace('_', ' ') }));
const STATUS_OPTIONS = UserStatusSchema.options.map((s) => ({ value: s, label: s }));

function canModify(actor: UserDTO, target: UserDTO): boolean {
  if (!actor?.role || !target?.role) return false;
  return canManageRole(actor.role, target.role);
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'red',
  ADMIN: 'orange',
  USER: 'blue',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  SUSPENDED: 'yellow',
};

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

  const debouncedSearch = useDebouncedCallback((value: string) => {
    startTransition(() => {
      router.push(buildUrl({ search: value || undefined, page: '1' }));
    });
  }, 400);

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

  function handleFilter(key: string, value: string | null) {
    startTransition(() => {
      router.push(buildUrl({ [key]: value ?? undefined, page: '1' }));
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

  const rows = users.map((user) => {
    const modifiable = canModify(actor, user);
    return (
      <Table.Tr key={user.id}>
        <Table.Td>
          <Text size="sm" fw={500}>
            {user.profile.firstName} {user.profile.lastName}
          </Text>
          <Text size="xs" c="dimmed">
            {user.email}
          </Text>
        </Table.Td>
        <Table.Td>
          <Badge color={ROLE_COLORS[user.role]} variant="light" size="sm">
            {user.role.replace('_', ' ')}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Badge color={STATUS_COLORS[user.status]} variant="dot" size="sm">
            {user.status}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed">
            {new Date(user.createdAt).toLocaleDateString()}
          </Text>
        </Table.Td>
        <Table.Td>
          <Group gap="xs" justify="flex-end">
            <Tooltip label={modifiable ? 'Edit user' : 'Insufficient permissions'} withArrow>
              <ActionIcon
                variant="subtle"
                color="blue"
                size="sm"
                disabled={!modifiable || isPending}
                onClick={() => setEditingUser(user)}
                aria-label="Edit user"
              >
                <IconPencil size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={modifiable ? 'Delete user' : 'Insufficient permissions'} withArrow>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                disabled={!modifiable || isPending}
                onClick={() => handleDelete(user)}
                aria-label="Delete user"
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="sm">
            <TextInput
              placeholder="Search by name..."
              leftSection={<IconSearch size={16} />}
              value={searchValue}
              onChange={(e) => {
                const val = e.currentTarget.value;
                setSearchValue(val);
                debouncedSearch(val);
              }}
              size="sm"
              w={220}
            />
            <Select
              placeholder="All roles"
              data={ROLE_OPTIONS}
              value={currentRole ?? null}
              onChange={(val) => handleFilter('role', val)}
              clearable
              size="sm"
              w={160}
            />
            <Select
              placeholder="All statuses"
              data={STATUS_OPTIONS}
              value={currentStatus ?? null}
              onChange={(val) => handleFilter('status', val)}
              clearable
              size="sm"
              w={160}
            />
          </Group>
          <Button leftSection={<IconUserPlus size={16} />} onClick={() => setCreateOpen(true)}>
            Create User
          </Button>
        </Group>

        <Paper
          withBorder
          radius="md"
          h={400}
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
                {rows.length > 0 ? (
                  rows
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
          <Group justify="space-between" mt="md" p={12}>
            <Group>
              <Text size="sm">Rows per page</Text>
              <Select
                data={['10', '20', '50', '100']}
                value={String(meta.pageSize)}
                onChange={(val) =>
                  val &&
                  startTransition(() => {
                    router.push(buildUrl({ pageSize: val, page: '1' }));
                  })
                }
                allowDeselect={false}
                w={80}
              />
            </Group>

            <Group gap="sm">
              <Text size="sm" c="dimmed">
                {meta.totalItems > 0
                  ? `${(meta.currentPage - 1) * meta.pageSize + 1}–${Math.min(meta.currentPage * meta.pageSize, meta.totalItems)} of ${meta.totalItems}`
                  : '0 items'}
              </Text>
              <Pagination
                total={meta.totalPages}
                value={meta.currentPage}
                onChange={(p) =>
                  startTransition(() => {
                    router.push(buildUrl({ page: String(p) }));
                  })
                }
                withEdges
                disabled={isPending}
              />
            </Group>
          </Group>
        </Paper>
      </Stack>

      <CreateUserModal opened={createOpen} onClose={() => setCreateOpen(false)} />

      {editingUser && (
        <EditUserModal
          key={editingUser.id}
          opened={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
        />
      )}
    </>
  );
}
