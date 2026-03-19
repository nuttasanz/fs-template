'use client';

import { TextInput, PasswordInput, Button, Paper, Title, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import { LoginDTOSchema, type LoginDTO } from '@repo/schemas';

export function LoginForm() {
  const form = useForm<LoginDTO>({
    validate: zodResolver(LoginDTOSchema),
    initialValues: { email: '', password: '' },
  });

  const handleSubmit = form.onSubmit((values) => {
    console.log(values);
  });

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={2} ta="center" mb="xs">
        Admin Backoffice
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="xl">
        Sign in to your account
      </Text>

      <form onSubmit={handleSubmit}>
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
          <Button type="submit" fullWidth mt="md">
            Sign in
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
