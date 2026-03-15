'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingOverlay, Box } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { AppShellLayout } from '@/components/layout/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user === null) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <Box pos="relative" h="100vh">
        <LoadingOverlay visible />
      </Box>
    );
  }

  if (!user) return null;

  return <AppShellLayout user={user}>{children}</AppShellLayout>;
}
