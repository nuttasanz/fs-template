'use client';

import { AppShell as MantineAppShell, Burger, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { UserDTO } from '@repo/schemas';
import { SidebarNav } from './SidebarNav';
import { UserMenuButton } from './UserMenuButton';

interface AppShellProps {
  user: UserDTO;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [opened, { toggle }] = useDisclosure();

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
          <UserMenuButton displayName={displayName} email={user.email} initials={initials} />
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <SidebarNav userRole={user.role} />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}
