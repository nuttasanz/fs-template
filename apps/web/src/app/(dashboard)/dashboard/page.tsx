'use client';

import { Title, Text, Card, Group, Stack, Badge } from '@mantine/core';
import { IconUsers, IconShieldCheck } from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const displayName = user.profile.firstName || user.email;

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Welcome back, {displayName}</Title>
        <Text c="dimmed" mt={4}>
          Here&apos;s an overview of your admin backoffice.
        </Text>
      </div>

      <Group gap="md">
        <Card withBorder radius="md" p="lg" style={{ flex: 1, minWidth: 200 }}>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500} c="dimmed">
              Your Role
            </Text>
            <IconShieldCheck size={20} color="var(--mantine-color-blue-6)" />
          </Group>
          <Badge size="lg" variant="light" color="blue">
            {user.role}
          </Badge>
        </Card>

        <Card withBorder radius="md" p="lg" style={{ flex: 1, minWidth: 200 }}>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500} c="dimmed">
              Account Status
            </Text>
            <IconUsers size={20} color="var(--mantine-color-green-6)" />
          </Group>
          <Badge size="lg" variant="light" color="green">
            {user.status}
          </Badge>
        </Card>

        <Card withBorder radius="md" p="lg" style={{ flex: 1, minWidth: 200 }}>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500} c="dimmed">
              Email
            </Text>
          </Group>
          <Text size="sm" fw={500} truncate>
            {user.email}
          </Text>
        </Card>
      </Group>
    </Stack>
  );
}
