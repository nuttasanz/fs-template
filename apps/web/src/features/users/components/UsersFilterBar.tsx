'use client';

import { Group, TextInput, Select, Button } from '@mantine/core';
import { IconSearch, IconUserPlus } from '@tabler/icons-react';
import { canManageRole, UserRoleSchema, UserStatusSchema, type UserDTO } from '@repo/schemas';

interface UsersFilterBarProps {
  actor: UserDTO;
  searchValue: string;
  onSearchChange: (value: string) => void;
  currentRole?: string;
  currentStatus?: string;
  onFilterChange: (key: string, value: string | null) => void;
  onCreateClick: () => void;
}

const STATUS_OPTIONS = UserStatusSchema.options.map((s) => ({ value: s, label: s }));

export function UsersFilterBar({
  actor,
  searchValue,
  onSearchChange,
  currentRole,
  currentStatus,
  onFilterChange,
  onCreateClick,
}: UsersFilterBarProps) {
  const roleOptions = UserRoleSchema.options
    .filter((r) => canManageRole(actor.role, r))
    .map((r) => ({ value: r, label: r.replace('_', ' ') }));

  return (
    <Group justify="space-between">
      <Group gap="sm">
        <TextInput
          placeholder="Search by name..."
          leftSection={<IconSearch size={16} />}
          value={searchValue}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          size="sm"
        />
        <Select
          placeholder="All roles"
          data={roleOptions}
          value={currentRole ?? null}
          onChange={(val) => onFilterChange('role', val)}
          clearable
          size="sm"
        />
        <Select
          placeholder="All statuses"
          data={STATUS_OPTIONS}
          value={currentStatus ?? null}
          onChange={(val) => onFilterChange('status', val)}
          clearable
          size="sm"
        />
      </Group>
      <Button leftSection={<IconUserPlus size={16} />} onClick={onCreateClick}>
        Create User
      </Button>
    </Group>
  );
}
