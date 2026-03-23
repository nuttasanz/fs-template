'use client';

import { useState, useTransition } from 'react';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import {
  Modal,
  Stack,
  TextInput,
  PasswordInput,
  Select,
  Textarea,
  Button,
  Group,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import {
  CreateUserDTOSchema,
  UserRoleSchema,
  canManageRole,
  type CreateUserDTO,
  type UserDTO,
} from '@repo/schemas';
import { createUserAction } from '../actions';
import { toast } from '@/lib/toast';

interface CreateUserModalProps {
  opened: boolean;
  onClose: () => void;
  actor: UserDTO;
}

export function CreateUserModal({ opened, onClose, actor }: CreateUserModalProps) {
  const roleOptions = UserRoleSchema.options
    .filter((r) => canManageRole(actor.role, r))
    .map((r) => ({ value: r, label: r.replace('_', ' ') }));
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CreateUserDTO>({
    validate: zodResolver(CreateUserDTOSchema),
    initialValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'USER',
      bio: '',
    },
  });

  function handleClose() {
    form.reset();
    setFormError(null);
    onClose();
  }

  function handleSubmit(values: CreateUserDTO) {
    setFormError(null);
    startTransition(async () => {
      const result = await createUserAction(values);
      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setFieldError(field as keyof CreateUserDTO, message);
          }
        }
        if (!result.fieldErrors) {
          setFormError(result.error);
        }
        return;
      }
      toast.success('User created successfully.');
      handleClose();
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Create User"
      size="md"
      centered
      closeOnClickOutside={!isPending}
      closeOnEscape={!isPending}
    >
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          {formError && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
              {formError}
            </Alert>
          )}
          <TextInput
            label="Email"
            placeholder="email@example.com"
            type="email"
            required
            disabled={isPending}
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Password"
            placeholder="Password"
            required
            disabled={isPending}
            {...form.getInputProps('password')}
          />
          <Group grow>
            <TextInput
              label="First Name"
              placeholder="John"
              required
              disabled={isPending}
              {...form.getInputProps('firstName')}
            />
            <TextInput
              label="Last Name"
              placeholder="Doe"
              required
              disabled={isPending}
              {...form.getInputProps('lastName')}
            />
          </Group>
          <Select
            label="Role"
            data={roleOptions}
            required
            disabled={isPending}
            {...form.getInputProps('role')}
          />
          <Textarea
            label="Bio"
            placeholder="Optional bio..."
            autosize
            minRows={2}
            disabled={isPending}
            {...form.getInputProps('bio')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              Create User
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
