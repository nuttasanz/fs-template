'use client';

import { TextInput, PasswordInput, Button, Paper, Title, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { LoginDTOSchema, type LoginDTO } from '@repo/schemas';
import { apiPost, ApiError } from '@/lib/api';

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<LoginDTO>({
    validate: zodResolver(LoginDTOSchema),
    initialValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: LoginDTO) => apiPost('/api/auth/login', values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/dashboard');
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        form.setErrors({ email: 'Invalid email or password.' });
      } else {
        notifications.show({
          color: 'red',
          message: error instanceof ApiError ? error.message : 'An unexpected error occurred.',
        });
      }
    },
  });

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={2} ta="center" mb="xs">
        Admin Backoffice
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="xl">
        Sign in to your account
      </Text>

      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack>
          <TextInput
            label="Email"
            placeholder="admin@example.com"
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            {...form.getInputProps('password')}
          />
          <Button type="submit" fullWidth mt="md" loading={mutation.isPending}>
            Sign in
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
