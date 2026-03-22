'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Group,
  Text,
  Badge,
  ActionIcon,
  Button,
  Stack,
  Paper,
  Center,
  Tooltip,
  Select,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconPencil, IconTrash, IconUserPlus } from '@tabler/icons-react';
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
  currentCursor?: string;
  actor: UserDTO;
  currentRole?: string;
  currentStatus?: string;
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
  currentCursor,
  actor,
  currentRole,
  currentStatus,
}: UsersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { role: currentRole, status: currentStatus, ...overrides };
    for (const [key, val] of Object.entries(merged)) {
      if (val) params.set(key, val);
    }
    const qs = params.toString();
    return qs ? `/users?${qs}` : '/users';
  }

  function handleFilter(key: string, value: string | null) {
    setCursorHistory([]);
    router.push(buildUrl({ [key]: value ?? undefined, cursor: undefined }));
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

  function handleNextPage() {
    if (!meta.nextCursor) return;
    setCursorHistory((prev) => [...prev, currentCursor ?? '']);
    router.push(buildUrl({ cursor: meta.nextCursor }));
  }

  function handlePrevPage() {
    const prev = [...cursorHistory];
    const prevCursor = prev.pop();
    setCursorHistory(prev);
    router.push(buildUrl({ cursor: prevCursor || undefined }));
  }

  function handleFirstPage() {
    setCursorHistory([]);
    router.push(buildUrl({ cursor: undefined }));
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

        <Paper withBorder radius="md">
          <Table highlightOnHover>
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
        </Paper>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {users.length} user{users.length !== 1 ? 's' : ''}
          </Text>
          <Group gap="xs">
            {currentCursor && (
              <Button variant="default" size="xs" onClick={handleFirstPage}>
                First Page
              </Button>
            )}
            {cursorHistory.length > 0 && (
              <Button variant="default" size="xs" onClick={handlePrevPage}>
                Previous Page
              </Button>
            )}
            {meta.nextCursor && (
              <Button variant="default" size="xs" onClick={handleNextPage}>
                Next Page
              </Button>
            )}
          </Group>
        </Group>
      </Stack>

      <CreateUserModal opened={createOpen} onClose={() => setCreateOpen(false)} />

      {editingUser && (
        <EditUserModal
          opened={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
        />
      )}
    </>
  );
}
