'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Textarea,
  Button,
  Group,
} from '@mantine/core';
import { UpdateUserDTOSchema, type UpdateUserDTO, type UserDTO } from '@repo/schemas';
import { updateUserAction } from '../actions';
import { toast } from '@/lib/toast';

interface EditUserModalProps {
  opened: boolean;
  onClose: () => void;
  user: UserDTO;
}

const ROLE_OPTIONS = [
  { value: 'USER', label: 'User' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

export function EditUserModal({ opened, onClose, user }: EditUserModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdateUserDTO>({
    validate: zodResolver(UpdateUserDTOSchema),
    initialValues: {
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      role: user.role,
      bio: user.profile.bio ?? '',
    },
  });

  useEffect(() => {
    form.setValues({
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      role: user.role,
      bio: user.profile.bio ?? '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function handleClose() {
    onClose();
  }

  function handleSubmit(values: UpdateUserDTO) {
    startTransition(async () => {
      const result = await updateUserAction(user.id, values);
      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setFieldError(field as keyof UpdateUserDTO, message);
          }
        } else {
          toast.error(result.error, { title: 'Failed to update user' });
        }
        return;
      }
      toast.success('User updated successfully.');
      router.refresh();
      handleClose();
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={`Edit: ${user.profile.firstName} ${user.profile.lastName}`}
      size="md"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          <TextInput
            label="Email"
            value={user.email}
            disabled
            description="Email cannot be changed here."
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
            data={ROLE_OPTIONS}
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
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
