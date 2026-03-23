import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { LoginForm } from '../components/LoginForm';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockLoginAction, mockToast } = vi.hoisted(() => ({
  mockLoginAction: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('@/features/auth/actions', () => ({
  loginAction: (...args: unknown[]) => mockLoginAction(...args),
}));

vi.mock('@/lib/toast', () => ({ toast: mockToast }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLoginForm() {
  return render(
    <MantineProvider>
      <LoginForm />
    </MantineProvider>,
  );
}

// ---------------------------------------------------------------------------
// LoginForm
// ---------------------------------------------------------------------------

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email, password fields and submit button', () => {
    renderLoginForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls loginAction on valid form submission', async () => {
    mockLoginAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password1!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLoginAction).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'Password1!',
      });
    });
  });

  it('shows Zod validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // loginAction should NOT be called when validation fails
    expect(mockLoginAction).not.toHaveBeenCalled();
  });

  it('shows toast error when loginAction returns error', async () => {
    mockLoginAction.mockResolvedValue({ error: 'Invalid credentials' });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password1!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Invalid credentials',
        expect.objectContaining({ title: 'Login failed' }),
      );
    });
  });
});
