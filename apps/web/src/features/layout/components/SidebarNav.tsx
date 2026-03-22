'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { NavLink } from '@mantine/core';
import { IconDashboard, IconUsers } from '@tabler/icons-react';
import { UserRoleSchema, type UserDTO } from '@repo/schemas';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles?: UserDTO['role'][];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <IconDashboard size={16} />,
  },
  {
    href: '/users',
    label: 'Users',
    icon: <IconUsers size={16} />,
    allowedRoles: [UserRoleSchema.enum.ADMIN, UserRoleSchema.enum.SUPER_ADMIN],
  },
];

interface SidebarNavProps {
  userRole: UserDTO['role'];
  onClose: () => void;
}

export function SidebarNav({ userRole, onClose }: SidebarNavProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(userRole),
  );

  return (
    <>
      {visibleItems.map((item) => (
        <NavLink
          key={item.href}
          component={Link}
          href={item.href}
          label={item.label}
          leftSection={item.icon}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          mb="xs"
          onClick={onClose}
        />
      ))}
    </>
  );
}
