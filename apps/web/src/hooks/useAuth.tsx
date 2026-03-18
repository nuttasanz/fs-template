'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { UserDTO } from '@repo/schemas';

// ---------------------------------------------------------------------------
// Auth query — fetches the currently authenticated user
// ---------------------------------------------------------------------------

function useAuthQuery() {
  return useQuery<UserDTO | null, ApiError>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await apiGet<UserDTO>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: UserDTO | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user = null, isLoading } = useAuthQuery();
  const queryClient = useQueryClient();
  const router = useRouter();

  const logout = useCallback(async (): Promise<void> => {
    await apiPost('/auth/logout', {}).catch(() => {});
    queryClient.clear();
    router.replace('/login');
  }, [queryClient, router]);

  const value = useMemo(() => ({ user, isLoading, logout }), [user, isLoading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
