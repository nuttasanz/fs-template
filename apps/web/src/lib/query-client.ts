import { QueryClient, MutationCache } from '@tanstack/react-query';
import { ApiError } from './api';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    // MutationCache.onError fires once per failure regardless of per-mutation callbacks,
    // making it the right place for cross-cutting concerns like session expiry.
    mutationCache: new MutationCache({
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          window.location.href = '/login';
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
