'use client';

import { Modal, TextInput, PasswordInput, Select, Button, Stack, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import { notifications } from '@mantine/notifications';
import {
  CreateUserDTOSchema,
  UpdateUserDTOSchema,
  type CreateUserDTO,
  type UpdateUserDTO,
  type UserDTO,
} from '@repo/schemas';
import { useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { assignableRoles } from '@/lib/rbac';
import { ApiError } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateProps {
  mode: 'create';
  user?: never;
  actor: UserDTO | null;
  opened: boolean;
  onClose: () => void;
}

interface EditProps {
  mode: 'edit';
  user: UserDTO;
  actor: UserDTO | null;
  opened: boolean;
  onClose: () => void;
}

type Props = CreateProps | EditProps;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserFormModal({ mode, user, actor, opened, onClose }: Props) {
  const isEdit = mode === 'edit';
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const roleOptions = actor ? assignableRoles(actor.role).map((r) => ({ value: r, label: r })) : [];

  const createForm = useForm<CreateUserDTO>({
    validate: zodResolver(CreateUserDTOSchema),
    initialValues: {
      email: '',
      password: '',
      role: 'USER',
      firstName: '',
      lastName: '',
      bio: '',
    },
  });

  const editForm = useForm<UpdateUserDTO>({
    validate: zodResolver(UpdateUserDTOSchema),
    initialValues: isEdit
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          bio: user.profile.bio ?? '',
          role: user.role,
        }
      : {},
  });

  const handleError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 409) {
        createForm.setFieldError('email', 'This email is already in use.');
      } else if (error.status === 403) {
        notifications.show({
          color: 'red',
          message: 'You do not have permission to perform this action.',
        });
      } else {
        notifications.show({ color: 'red', message: error.message });
      }
    }
  };

  const handleCreate = (values: CreateUserDTO) => {
    createUser.mutate(values, {
      onSuccess: () => {
        notifications.show({ message: 'User created successfully.' });
        createForm.reset();
        onClose();
      },
      onError: handleError,
    });
  };

  const handleEdit = (values: UpdateUserDTO) => {
    if (!isEdit) return;
    updateUser.mutate(
      { id: user.id, dto: values },
      {
        onSuccess: () => {
          notifications.show({ message: 'User updated successfully.' });
          onClose();
        },
        onError: handleError,
      },
    );
  };

  const isPending = isEdit ? updateUser.isPending : createUser.isPending;

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit User' : 'Create User'} size="md">
      {isEdit ? (
        <form onSubmit={editForm.onSubmit(handleEdit)}>
          <Stack>
            <TextInput label="First Name" {...editForm.getInputProps('firstName')} />
            <TextInput label="Last Name" {...editForm.getInputProps('lastName')} />
            <Textarea label="Bio" autosize minRows={2} {...editForm.getInputProps('bio')} />
            <Select
              label="Role"
              data={roleOptions}
              {...editForm.getInputProps('role')}
              disabled={roleOptions.length === 0}
              placeholder={roleOptions.length === 0 ? 'No assignable roles' : undefined}
            />
            <Button type="submit" loading={isPending}>
              Save Changes
            </Button>
          </Stack>
        </form>
      ) : (
        <form onSubmit={createForm.onSubmit(handleCreate)}>
          <Stack>
            <TextInput label="First Name" {...createForm.getInputProps('firstName')} />
            <TextInput label="Last Name" {...createForm.getInputProps('lastName')} />
            <TextInput label="Email" type="email" {...createForm.getInputProps('email')} />
            <PasswordInput
              label="Password"
              description="Minimum 12 characters."
              {...createForm.getInputProps('password')}
            />
            <Textarea label="Bio" autosize minRows={2} {...createForm.getInputProps('bio')} />
            <Select
              label="Role"
              data={roleOptions}
              {...createForm.getInputProps('role')}
              disabled={roleOptions.length === 0}
              placeholder={roleOptions.length === 0 ? 'No assignable roles' : undefined}
            />
            <Button type="submit" loading={isPending}>
              Create User
            </Button>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
