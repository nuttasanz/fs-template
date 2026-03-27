'use client';

import { useState, useTransition } from 'react';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import { Modal, Stack, TextInput, Select, Textarea, Button, Group, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import {
  UpdateUserDTOSchema,
  UserRoleSchema,
  canManageRole,
  type UpdateUserDTO,
  type UserDTO,
} from '@repo/schemas';
import { updateUserAction } from '../actions';
import { toast } from '@/lib/toast';

interface EditUserModalProps {
  opened: boolean;
  onClose: () => void;
  user: UserDTO;
  actor: UserDTO;
}

export function EditUserModal({ opened, onClose, user, actor }: EditUserModalProps) {
  const roleOptions = UserRoleSchema.options
    .filter((r) => canManageRole(actor.role, r))
    .map((r) => ({ value: r, label: r.replace('_', ' ') }));
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<UpdateUserDTO>({
    validate: zodResolver(UpdateUserDTOSchema),
    initialValues: {
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      role: user.role,
      bio: user.profile.bio ?? '',
    },
  });

  function handleClose() {
    form.reset();
    setFormError(null);
    onClose();
  }

  function handleSubmit(values: UpdateUserDTO) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateUserAction(user.id, values);
      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setFieldError(field as keyof UpdateUserDTO, message);
          }
        } else {
          setFormError(result.error);
        }
        return;
      }
      toast.success('User updated successfully.');
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
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
