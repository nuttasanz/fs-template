'use client';

import { Paper, Text, Center, Stack } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';

export function UsersTable() {
  return (
    <Paper withBorder p="xl" radius="md">
      <Center>
        <Stack align="center" gap="sm">
          <IconUsers size={40} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" size="sm">
            Users table — implementation pending
          </Text>
        </Stack>
      </Center>
    </Paper>
  );
}
