'use client';

import { Table, Group, Text, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { canManageRole, type UserDTO } from '@repo/schemas';

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

interface UsersTableRowProps {
  user: UserDTO;
  actor: UserDTO;
  isPending: boolean;
  onEdit: (user: UserDTO) => void;
  onDelete: (user: UserDTO) => void;
}

export function UsersTableRow({ user, actor, isPending, onEdit, onDelete }: UsersTableRowProps) {
  const modifiable = canManageRole(actor.role, user.role);

  return (
    <Table.Tr>
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
        <Text size="xs" c="dimmed" suppressHydrationWarning>
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
              onClick={() => onEdit(user)}
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
              onClick={() => onDelete(user)}
              aria-label="Delete user"
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
