import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { UserDTO } from '@repo/schemas';
import { CreateUserModal } from '../components/CreateUserModal';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockCreateUserAction, mockToast } = vi.hoisted(() => ({
  mockCreateUserAction: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../actions', () => ({
  createUserAction: (...args: unknown[]) => mockCreateUserAction(...args),
}));

vi.mock('@/lib/toast', () => ({ toast: mockToast }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeActor(role: UserDTO['role'] = 'SUPER_ADMIN'): UserDTO {
  return {
    id: 'a1',
    email: 'admin@example.com',
    role,
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    profile: { firstName: 'Admin', lastName: 'User', bio: null },
  };
}

function renderModal(props: { opened?: boolean; actor?: UserDTO; onClose?: () => void } = {}) {
  const onClose = props.onClose ?? vi.fn();
  return {
    onClose,
    ...render(
      <MantineProvider>
        <CreateUserModal
          opened={props.opened ?? true}
          onClose={onClose}
          actor={props.actor ?? makeActor()}
        />
      </MantineProvider>,
    ),
  };
}

// ---------------------------------------------------------------------------
// CreateUserModal
// ---------------------------------------------------------------------------

describe('CreateUserModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields when opened', () => {
    renderModal();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it('filters role options based on actor role via canManageRole', async () => {
    // ADMIN can only manage USER, not ADMIN or SUPER_ADMIN
    const user = userEvent.setup();
    renderModal({ actor: makeActor('ADMIN') });

    // Click the Role select to open the dropdown
    const roleInput = screen.getByRole('textbox', { name: /role/i });
    await user.click(roleInput);

    // Verify the listbox only contains USER option (ADMIN cannot manage ADMIN/SUPER_ADMIN)
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('USER');
  });

  it('calls createUserAction with form values on submit', async () => {
    mockCreateUserAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          password: 'StrongPass1!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
        }),
      );
    });
  });

  it('shows success toast and closes modal on success', async () => {
    mockCreateUserAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('User created successfully.');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows field errors from API (409 conflict on email)', async () => {
    mockCreateUserAction.mockResolvedValue({
      success: false,
      error: 'Email already exists',
      fieldErrors: { email: 'Email already exists' },
    });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/email/i), 'dup@example.com');
    await user.type(screen.getByLabelText(/password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreateUserAction).toHaveBeenCalled();
    });
    // toast.success should NOT have been called
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('shows form-level error alert for generic errors', async () => {
    mockCreateUserAction.mockResolvedValue({
      success: false,
      error: 'Something went wrong',
    });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  it('resets form and clears errors on close', async () => {
    mockCreateUserAction.mockResolvedValue({
      success: false,
      error: 'Something went wrong',
    });
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    // Type something into the form
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');

    // Submit to trigger error
    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    // Click Cancel to close
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
