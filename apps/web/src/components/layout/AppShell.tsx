'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Avatar,
  Menu,
  UnstyledButton,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard,
  IconUsers,
  IconLogout,
  IconChevronDown,
} from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserDTO } from '@repo/schemas';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: IconLayoutDashboard, roles: ['USER', 'ADMIN', 'SUPER_ADMIN'] },
  { label: 'Users', href: '/users', icon: IconUsers, roles: ['ADMIN', 'SUPER_ADMIN'] },
] as const;

interface Props {
  user: UserDTO;
  children: React.ReactNode;
}

export function AppShellLayout({ user, children }: Props) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();
  const { logout } = useAuth();

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    (item.roles as readonly string[]).includes(user.role),
  );

  const displayName = [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ') || user.email;
  const initials = [user.profile.firstName[0], user.profile.lastName[0]].filter(Boolean).join('').toUpperCase();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg">
              Admin Backoffice
            </Text>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar size="sm" radius="xl" color="blue">
                    {initials || '?'}
                  </Avatar>
                  <Stack gap={0} visibleFrom="sm">
                    <Text size="sm" fw={500} lh={1.2}>
                      {displayName}
                    </Text>
                    <Text size="xs" c="dimmed" lh={1.2}>
                      {user.role}
                    </Text>
                  </Stack>
                  <IconChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconLogout size={14} />}
                color="red"
                onClick={() => void logout()}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap={4}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.href}
              label={item.label}
              leftSection={<item.icon size={16} />}
              active={pathname.startsWith(item.href)}
              component={Link}
              href={item.href}
              variant="filled"
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
