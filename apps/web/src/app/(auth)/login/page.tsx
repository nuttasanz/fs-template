import type { Metadata } from 'next';
import { Center, Paper, Title, Text, Stack } from '@mantine/core';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in | Admin Backoffice',
};

export default function LoginPage() {
  return (
    <Center h="100vh" bg="gray.0">
      <Paper withBorder shadow="sm" p="xl" radius="md" w={420}>
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={2}>Sign in</Title>
            <Text c="dimmed" size="sm">
              Enter your credentials to access the backoffice
            </Text>
          </Stack>
          <LoginForm />
        </Stack>
      </Paper>
    </Center>
  );
}
