'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { CreateUserDTO, UpdateUserDTO } from '@repo/schemas';
import { apiFetch, ApiError } from '@/lib/api';
import { captureError } from '@/lib/logger';

export type UserActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  const sid = cookieStore.get('sid');
  return sid ? `sid=${sid.value}` : '';
}

export async function createUserAction(dto: CreateUserDTO): Promise<UserActionResult> {
  const cookieHeader = await getCookieHeader();
  try {
    await apiFetch('/api/v1/users', { method: 'POST', body: JSON.stringify(dto) }, cookieHeader);
    revalidatePath('/users');
    return { success: true };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 409) {
        return { success: false, error: e.body.message, fieldErrors: { email: e.body.message } };
      }
      if (e.status === 400 && e.body.errors?.length) {
        const fieldErrors = Object.fromEntries(e.body.errors.map((err) => [err.field, err.message]));
        return { success: false, error: e.body.message, fieldErrors };
      }
      return { success: false, error: e.body.message };
    }
    captureError(e, 'createUserAction');
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function updateUserAction(id: string, dto: UpdateUserDTO): Promise<UserActionResult> {
  const cookieHeader = await getCookieHeader();
  try {
    await apiFetch(
      `/api/v1/users/${id}`,
      { method: 'PATCH', body: JSON.stringify(dto) },
      cookieHeader,
    );
    revalidatePath('/users');
    return { success: true };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 400 && e.body.errors?.length) {
        const fieldErrors = Object.fromEntries(e.body.errors.map((err) => [err.field, err.message]));
        return { success: false, error: e.body.message, fieldErrors };
      }
      return { success: false, error: e.body.message };
    }
    captureError(e, 'updateUserAction');
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function deleteUserAction(id: string): Promise<UserActionResult> {
  const cookieHeader = await getCookieHeader();
  try {
    await apiFetch(`/api/v1/users/${id}`, { method: 'DELETE' }, cookieHeader);
    revalidatePath('/users');
    return { success: true };
  } catch (e) {
    if (e instanceof ApiError) return { success: false, error: e.body.message };
    captureError(e, 'deleteUserAction');
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
