import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Grid, Paper, Title, Text, Stack, Skeleton } from '@mantine/core';

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

function StatCards() {
  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <StatCard label="Total Users" value="—" />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <StatCard label="Active Sessions" value="—" />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <StatCard label="Pending Actions" value="—" />
      </Grid.Col>
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
            {[1, 2, 3].map((n) => (
              <Grid.Col key={n} span={{ base: 12, sm: 6, md: 4 }}>
                <StatCardSkeleton />
              </Grid.Col>
            ))}
          </Grid>
        }
      >
        <StatCards />
      </Suspense>
    </Stack>
  );
}
