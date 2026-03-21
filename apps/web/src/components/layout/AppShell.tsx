'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  NavLink,
  Avatar,
  Menu,
  Text,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconUsers,
  IconLogout,
  IconChevronDown,
} from '@tabler/icons-react';
import type { UserDTO } from '@repo/schemas';
import { logoutAction } from '@/features/auth/actions';

interface AppShellProps {
  user: UserDTO;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles?: UserDTO['role'][];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <IconDashboard size={16} />,
  },
  {
    href: '/users',
    label: 'Users',
    icon: <IconUsers size={16} />,
    allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

export function AppShell({ user, children }: AppShellProps) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(user.role),
  );

  const displayName = `${user.profile.firstName} ${user.profile.lastName}`;
  const initials =
    `${user.profile.firstName[0] ?? ''}${user.profile.lastName[0] ?? ''}`.toUpperCase();

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <MantineAppShell.Header>
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
              <Menu.Label>{user.email}</Menu.Label>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={
                  <IconLogout style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() => logoutAction()}
              >
                Sign out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            label={item.label}
            leftSection={item.icon}
            active={
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            }
            mb="xs"
          />
        ))}
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}
