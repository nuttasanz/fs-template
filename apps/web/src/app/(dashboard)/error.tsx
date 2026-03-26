'use client';

import { useEffect } from 'react';
import { Center, Title, Text, Button, Stack } from '@mantine/core';
import { captureError } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    captureError(error, 'DashboardError');
  }, [error]);

  return (
    <Center h="100%">
      <Stack align="center" gap="sm">
        <Title order={3}>Something went wrong</Title>
        <Text c="dimmed" size="sm">
          An unexpected error occurred. Please try refreshing the page.
        </Text>
        <Button onClick={reset} variant="light">
          Try again
        </Button>
      </Stack>
    </Center>
  );
}
