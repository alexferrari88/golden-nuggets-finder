import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408 (timeout)
        if (
          error?.response?.status >= 400 &&
          error?.response?.status < 500 &&
          error?.response?.status !== 408
        ) {
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
})
