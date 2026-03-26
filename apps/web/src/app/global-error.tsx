'use client';

import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
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
