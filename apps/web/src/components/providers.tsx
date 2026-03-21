'use client';

import { useState } from 'react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query-client';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState<QueryClient>(() => makeQueryClient());

  return (
    <MantineProvider defaultColorScheme="light">
      <ModalsProvider>
        <Notifications position="top-right" />
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
