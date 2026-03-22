'use client';

import { useTransition } from 'react';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import { TextInput, PasswordInput, Button, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { LoginDTOSchema, type LoginDTO } from '@repo/schemas';
import { loginAction } from '@/features/auth/actions';
import { toast } from '@/lib/toast';

export function LoginForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginDTO>({
    validate: zodResolver(LoginDTOSchema),
    initialValues: { email: '', password: '' },
  });

  function handleSubmit(values: LoginDTO) {
    startTransition(async () => {
      const result = await loginAction(values);
      if (result?.error) {
        toast.error(result.error, {
          title: 'Login failed',
          icon: <IconAlertCircle size={16} />,
        });
      }
    });
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
      <Stack gap="md">
        <TextInput
          label="Email"
          placeholder="email@example.com"
          type="email"
          autoComplete="email"
          disabled={isPending}
          {...form.getInputProps('email')}
        />
        <PasswordInput
          label="Password"
          placeholder="Password"
          autoComplete="current-password"
          disabled={isPending}
          {...form.getInputProps('password')}
        />
        <Button type="submit" loading={isPending} fullWidth mt="sm">
          Sign in
        </Button>
      </Stack>
    </form>
  );
}
