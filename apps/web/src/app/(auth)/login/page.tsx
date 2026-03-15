import type { Metadata } from 'next';
import { Center, Box } from '@mantine/core';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Sign In — Admin Backoffice' };

export default function LoginPage() {
  return (
    <Center h="100vh" bg="gray.1">
      <Box w={420}>
        <LoginForm />
      </Box>
    </Center>
  );
}
