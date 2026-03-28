'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import setCookieParser from 'set-cookie-parser';
import type { LoginDTO, ErrorResponse } from '@repo/schemas';
import { apiFetch, ApiError } from '@/lib/api';
import { captureError } from '@/lib/logger';
import { serverEnv } from '@/env.server';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

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
      const errorBody: ErrorResponse = await response
        .json()
        .catch(() => ({
          success: false as const,
          message: 'Login failed.',
          code: 'INTERNAL_ERROR',
        }));
      return { error: errorBody.message ?? 'Login failed.' };
    }

    // Node.js 18+ Web API — returns string[] correctly for multiple Set-Cookie headers
    const setCookieHeaders = response.headers.getSetCookie();
    parsedCookies = setCookieParser.parse(setCookieHeaders);
  } catch (e) {
    captureError(e, 'loginAction');
    return { error: 'Unable to connect. Please try again later.' };
  }

  // Forward only the session cookie — security attributes are enforced unconditionally
  // rather than inherited from the backend to prevent accidental attribute downgrade.
  const cookieStore = await cookies();
  const sidCookie = parsedCookies.find((c) => c.name === SESSION_COOKIE_NAME);
  if (sidCookie) {
    cookieStore.set(SESSION_COOKIE_NAME, sidCookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: sidCookie.path ?? '/',
      expires: sidCookie.expires,
    });
  }

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const sid = cookieStore.get(SESSION_COOKIE_NAME);

  try {
    await apiFetch(
      '/api/v1/auth/logout',
      { method: 'POST' },
      sid ? `${SESSION_COOKIE_NAME}=${sid.value}` : '',
    );
  } catch (e) {
    // Swallow ApiError — even if the backend session is already expired,
    // we still clear the local cookie so the user is not stuck.
    if (!(e instanceof ApiError)) {
      captureError(e, 'logoutAction');
      throw e;
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/login');
}
