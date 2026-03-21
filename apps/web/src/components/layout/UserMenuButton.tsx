'use client';

import { useTransition } from 'react';
import { Avatar, Menu, Text, UnstyledButton, Group, rem } from '@mantine/core';
import { IconLogout, IconChevronDown } from '@tabler/icons-react';
import { logoutAction } from '@/features/auth/actions';

interface UserMenuButtonProps {
  displayName: string;
  email: string;
  initials: string;
}

export function UserMenuButton({ displayName, email, initials }: UserMenuButtonProps) {
  const [isLoggingOut, startLogoutTransition] = useTransition();

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <UnstyledButton>
          <Group gap="xs">
            <Avatar size="sm" color="blue" radius="xl">
              {initials}
            </Avatar>
            <Text size="sm" visibleFrom="sm">
              {displayName}
            </Text>
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{email}</Menu.Label>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
          disabled={isLoggingOut}
          onClick={() => startLogoutTransition(() => logoutAction())}
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
