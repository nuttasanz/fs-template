'use client';

import { Center, Title, Text, Button, Stack } from '@mantine/core';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  return (
    <Center h="100%">
      <Stack align="center" gap="sm">
        <Title order={3}>Something went wrong</Title>
        <Text c="dimmed" size="sm">
          {error.message}
        </Text>
        <Button onClick={reset} variant="light">
          Try again
        </Button>
      </Stack>
    </Center>
  );
}
