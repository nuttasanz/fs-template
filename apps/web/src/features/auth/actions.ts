'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import setCookieParser from 'set-cookie-parser';
import type { LoginDTO } from '@repo/schemas';
import { apiFetch, ApiError } from '@/lib/api';
import { serverEnv } from '@/env.server';

export type AuthActionResult = { error?: string };

export async function loginAction(data: LoginDTO): Promise<AuthActionResult> {
  let parsedCookies: setCookieParser.Cookie[] = [];

  try {
    const response = await fetch(`${serverEnv.INTERNAL_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const minutes = retryAfter ? Math.ceil(parseInt(retryAfter, 10) / 60) : 15;
        return {
          error: `Too many login attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
        };
      }
      const errorBody = await response.json().catch(() => ({ message: 'Login failed.' }));
      return { error: (errorBody as { message?: string }).message ?? 'Login failed.' };
    }

    // Node.js 18+ Web API — returns string[] correctly for multiple Set-Cookie headers
    const setCookieHeaders = response.headers.getSetCookie();
    parsedCookies = setCookieParser.parse(setCookieHeaders);
  } catch {
    return { error: 'Unable to connect. Please try again later.' };
  }

  // Forward ALL cookies from backend to the browser
  const cookieStore = await cookies();
  for (const cookie of parsedCookies) {
    cookieStore.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly ?? true,
      path: cookie.path ?? '/',
      sameSite: (cookie.sameSite?.toLowerCase() as 'lax' | 'strict' | 'none') ?? 'lax',
      expires: cookie.expires,
      secure: cookie.secure ?? process.env.NODE_ENV === 'production',
    });
  }

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const sid = cookieStore.get('sid');

  try {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' }, sid ? `sid=${sid.value}` : '');
  } catch (e) {
    // Swallow ApiError — even if the backend session is already expired,
    // we still clear the local cookie so the user is not stuck.
    if (!(e instanceof ApiError)) throw e;
  }

  cookieStore.delete('sid');
  redirect('/login');
}
