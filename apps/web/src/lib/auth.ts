import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_rethrow } from 'next/navigation';
import type { UserDTO } from '@repo/schemas';
import { apiFetch, ApiError } from '@/lib/api';

/**
 * Return the current user or redirect to /login.
 *
 * Wrapped with React `cache()` so multiple RSC calls within the same
 * render pass (e.g. layout + page) share a single `/auth/me` request.
 */
export const getMe = cache(async (): Promise<UserDTO> => {
  const cookieStore = await cookies();
  const sid = cookieStore.get('sid');
  const cookieHeader = sid ? `sid=${sid.value}` : '';

  try {
    const response = await apiFetch<UserDTO>('/api/v1/auth/me', {}, cookieHeader);
    if (!response.data) {
      redirect('/login');
    }
    return response.data;
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ApiError && e.status === 401) {
      redirect('/login');
    }
    throw e;
  }
});
