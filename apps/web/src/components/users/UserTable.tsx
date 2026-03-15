'use client';

import { useState } from 'react';
import {
  Table,
  Pagination,
  Badge,
  ActionIcon,
  Group,
  Skeleton,
  Stack,
  Text,
  Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconAlertCircle } from '@tabler/icons-react';
import { useUsers, useDeleteUser } from '@/hooks/useUsers';
import { canActorManageTarget } from '@/lib/rbac';
import { UserFormModal } from './UserFormModal';
import type { UserDTO, UserRole, UserStatus } from '@repo/schemas';

const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: 'red',
  ADMIN: 'orange',
  USER: 'blue',
};

const STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  SUSPENDED: 'red',
};

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <Stack>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={40} radius="sm" />
      ))}
    </Stack>
  );
}

interface Props {
  page: number;
  limit: number;
  actor: UserDTO | null;
  onPageChange: (page: number) => void;
}

export function UserTable({ page, limit, actor, onPageChange }: Props) {
  const { data, isLoading, error } = useUsers({ page, limit });
  const deleteUser = useDeleteUser();
  const [editTarget, setEditTarget] = useState<UserDTO | null>(null);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const handleEdit = (user: UserDTO) => {
    setEditTarget(user);
    openEdit();
  };

  const handleDelete = (user: UserDTO) => {
    modals.openConfirmModal({
      title: 'Delete User',
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
        deleteUser.mutate(user.id, {
          onSuccess: () => notifications.show({ message: 'User deleted successfully.' }),
          onError: () => notifications.show({ color: 'red', message: 'Failed to delete user.' }),
        });
      },
    });
  };

  if (isLoading) return <TableSkeleton rows={limit} />;

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
        Failed to load users. Please try again.
      </Alert>
    );
  }

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Created</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data?.data.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center" py="md">
                  No users found.
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            data?.data.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>
                  {user.profile.firstName} {user.profile.lastName}
                </Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>
                  <Badge color={ROLE_COLORS[user.role]} variant="light">
                    {user.role}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLORS[user.status]} variant="light">
                    {user.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {new Date(user.createdAt).toLocaleDateString()}
                </Table.Td>
                <Table.Td>
                  {actor && canActorManageTarget(actor.role, user.role) && (
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        aria-label="Edit user"
                        onClick={() => handleEdit(user)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Delete user"
                        onClick={() => handleDelete(user)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  )}
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination total={totalPages} value={page} onChange={onPageChange} />
        </Group>
      )}

      {editTarget && (
        <UserFormModal
          mode="edit"
          user={editTarget}
          actor={actor}
          opened={editOpened}
          onClose={() => {
            closeEdit();
            setEditTarget(null);
          }}
        />
      )}
    </>
  );
}
