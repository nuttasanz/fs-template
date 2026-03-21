import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserDTO } from '@repo/schemas';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/features/layout/AppShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sid = cookieStore.get('sid');
  const cookieHeader = sid ? `sid=${sid.value}` : '';

  let user: UserDTO;
  try {
    const response = await apiFetch<UserDTO>('/api/v1/auth/me', {}, cookieHeader);
    if (!response.data) {
      redirect('/login');
    }
    user = response.data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      redirect('/login');
    }
    throw e;
  }

  return <AppShell user={user}>{children}</AppShell>;
}
