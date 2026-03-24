import { getMe } from '@/lib/auth';
import { AppShell } from '@/features/layout/components/AppShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getMe();

  return <AppShell user={user}>{children}</AppShell>;
}
