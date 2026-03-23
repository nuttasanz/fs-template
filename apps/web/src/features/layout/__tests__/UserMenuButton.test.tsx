import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { UserMenuButton } from '../components/UserMenuButton';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogoutAction = vi.fn();
vi.mock('@/features/auth/actions', () => ({
  logoutAction: () => mockLogoutAction(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderButton(props: { displayName?: string; email?: string; initials?: string } = {}) {
  return render(
    <MantineProvider>
      <UserMenuButton
        displayName={props.displayName ?? 'Alice Smith'}
        email={props.email ?? 'alice@example.com'}
        initials={props.initials ?? 'AS'}
      />
    </MantineProvider>,
  );
}

// ---------------------------------------------------------------------------
// UserMenuButton
// ---------------------------------------------------------------------------

describe('UserMenuButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user initials and display name', () => {
    renderButton();

    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('calls logoutAction on sign out menu item click', async () => {
    mockLogoutAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderButton();

    // Open the dropdown menu by clicking the button
    const trigger = screen.getByText('Alice Smith').closest('button')!;
    await user.click(trigger);

    // Click "Sign out" menu item
    const signOut = await screen.findByText('Sign out');
    await user.click(signOut);

    expect(mockLogoutAction).toHaveBeenCalled();
  });
});
