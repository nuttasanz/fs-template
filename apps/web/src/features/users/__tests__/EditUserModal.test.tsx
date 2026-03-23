import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { UserDTO } from '@repo/schemas';
import { EditUserModal } from '../components/EditUserModal';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockUpdateUserAction, mockToast } = vi.hoisted(() => ({
  mockUpdateUserAction: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../actions', () => ({
  updateUserAction: (...args: unknown[]) => mockUpdateUserAction(...args),
}));

vi.mock('@/lib/toast', () => ({ toast: mockToast }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<UserDTO> = {}): UserDTO {
  return {
    id: 'u1',
    email: 'alice@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    profile: { firstName: 'Alice', lastName: 'Smith', bio: 'A short bio' },
    ...overrides,
  };
}

function makeActor(role: UserDTO['role'] = 'SUPER_ADMIN'): UserDTO {
  return {
    id: 'a1',
    email: 'admin@example.com',
    role,
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    profile: { firstName: 'Admin', lastName: 'Boss', bio: null },
  };
}

function renderModal(
  props: { opened?: boolean; user?: UserDTO; actor?: UserDTO; onClose?: () => void } = {},
) {
  const onClose = props.onClose ?? vi.fn();
  return {
    onClose,
    ...render(
      <MantineProvider>
        <EditUserModal
          opened={props.opened ?? true}
          onClose={onClose}
          user={props.user ?? makeUser()}
          actor={props.actor ?? makeActor()}
        />
      </MantineProvider>,
    ),
  };
}

// ---------------------------------------------------------------------------
// EditUserModal
// ---------------------------------------------------------------------------

describe('EditUserModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pre-fills form with user data (firstName, lastName, bio)', () => {
    renderModal();

    expect(screen.getByLabelText(/first name/i)).toHaveValue('Alice');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Smith');
    expect(screen.getByLabelText(/bio/i)).toHaveValue('A short bio');
  });

  it('shows disabled email field with user email', () => {
    renderModal();

    const emailInputs = screen.getAllByLabelText(/email/i);
    const emailField = emailInputs.find(
      (el) => el.getAttribute('value') === 'alice@example.com' || (el as HTMLInputElement).value === 'alice@example.com',
    );
    expect(emailField).toBeDefined();
    expect(emailField).toBeDisabled();
  });

  it('calls updateUserAction with user.id and values', async () => {
    mockUpdateUserAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderModal();

    // Clear and type new first name
    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Bob');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateUserAction).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ firstName: 'Bob', lastName: 'Smith' }),
      );
    });
  });

  it('shows success toast and closes on success', async () => {
    mockUpdateUserAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('User updated successfully.');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows field errors from API response', async () => {
    mockUpdateUserAction.mockResolvedValue({
      success: false,
      error: 'Validation failed',
      fieldErrors: { firstName: 'First name is required' },
    });
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateUserAction).toHaveBeenCalled();
    });
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('shows form-level error alert', async () => {
    mockUpdateUserAction.mockResolvedValue({
      success: false,
      error: 'Forbidden',
    });
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Forbidden')).toBeInTheDocument();
    });
  });

  it('filters role options based on actor role', async () => {
    // ADMIN actor can only manage USER
    const user = userEvent.setup();
    renderModal({ actor: makeActor('ADMIN') });

    // Click the Role select to open the dropdown
    const roleInput = screen.getByRole('textbox', { name: /role/i });
    await user.click(roleInput);

    // Verify the listbox only contains USER option
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('USER');
  });
});
