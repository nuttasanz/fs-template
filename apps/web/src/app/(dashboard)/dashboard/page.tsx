import { cookies } from 'next/headers';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Grid, Paper, Title, Text, Stack, Skeleton, GridCol } from '@mantine/core';
import type { UserStatsDTO } from '@repo/schemas';
import { apiFetch } from '@/lib/api';
import { captureError } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Dashboard | Admin Backoffice',
};

function StatCardSkeleton() {
  return (
    <Paper withBorder p="md" radius="md">
      <Skeleton height={14} width="40%" mb="sm" />
      <Skeleton height={28} width="55%" />
    </Paper>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed" mb="xs">
        {label}
      </Text>
      <Title order={3}>{value}</Title>
    </Paper>
  );
}

function StatCardsError() {
  return (
    <Paper withBorder p="md" radius="md" bg="red.0">
      <Text size="sm" c="red">
        Unable to load stats. Please refresh the page.
      </Text>
    </Paper>
  );
}

async function StatCards() {
  const cookieStore = await cookies();
  const sid = cookieStore.get('sid');

  let stats: UserStatsDTO;
  try {
    const response = await apiFetch<UserStatsDTO>(
      '/api/v1/users/stats',
      {},
      sid ? `sid=${sid.value}` : '',
    );
    if (!response.data) return <StatCardsError />;
    stats = response.data;
  } catch (e) {
    captureError(e, 'StatCards');
    return <StatCardsError />;
  }

  return (
    <Grid>
      <GridCol span={{ base: 12, sm: 6, md: 4 }}>
        <StatCard label="Total Users" value={String(stats.totalUsers)} />
      </GridCol>
      <GridCol span={{ base: 12, sm: 6, md: 4 }}>
        <StatCard label="Active Sessions" value={String(stats.activeSessions)} />
      </GridCol>
    </Grid>
  );
}

export default function DashboardPage() {
  return (
    <Stack gap="lg">
      <Title order={2}>Dashboard</Title>
      <Suspense
        fallback={
          <Grid>
            {[1, 2].map((n) => (
              <GridCol key={n} span={{ base: 12, sm: 6, md: 4 }}>
                <StatCardSkeleton />
              </GridCol>
            ))}
          </Grid>
        }
      >
        <StatCards />
      </Suspense>
    </Stack>
  );
}
