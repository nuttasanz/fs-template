import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { SidebarNav } from './SidebarNav';
import type { UserDTO } from '@repo/schemas';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function renderSidebarNav(role: UserDTO['role']) {
  return render(
    <MantineProvider>
      <SidebarNav userRole={role} />
    </MantineProvider>,
  );
}

describe('SidebarNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always shows Dashboard for USER role', () => {
    renderSidebarNav('USER');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('hides Users nav item for USER role', () => {
    renderSidebarNav('USER');
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('shows Users nav item for ADMIN role', () => {
    renderSidebarNav('ADMIN');
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows Users nav item for SUPER_ADMIN role', () => {
    renderSidebarNav('SUPER_ADMIN');
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows Dashboard for ADMIN role', () => {
    renderSidebarNav('ADMIN');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows Dashboard for SUPER_ADMIN role', () => {
    renderSidebarNav('SUPER_ADMIN');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
