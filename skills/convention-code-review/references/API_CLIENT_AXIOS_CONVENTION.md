# API Client Convention (axios Implementation)

> When using axios, apply this document **together** with API_CLIENT_CONVENTION.md.
> This document covers only the axios implementation; common rules (ApiError, token management principles, anti-patterns) are defined in API_CLIENT_CONVENTION.md.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Axios Instance Setup

```typescript
// app/lib/api-client.ts
import axios from 'axios';
import type { AxiosError } from 'axios';
import { ApiError } from './api-error';
import { getTokenChannel } from '@/lib/token-sync';

const BASE_URL = import.meta.env.VITE_API_URL;

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
```

---

## 2. Request Interceptor — Authorization Header Injection

```typescript
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
```

---

## 3. Response Interceptor — Error Transformation + Token Refresh

```typescript
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

function processRefreshQueue(error: Error | null, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  refreshQueue = [];
}

async function refreshAccessToken(): Promise<string> {
  // Refresh Token is automatically attached as an httpOnly cookie
  const response = await axios.post(
    `${BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true },
  );
  const newToken: string = response.data.accessToken;
  setAccessToken(newToken);

  // Propagate refresh result to other tabs
  getTokenChannel()?.postMessage({ type: 'TOKEN_REFRESHED', token: newToken });

  return newToken;
}

function forceLogout() {
  setAccessToken(null);
  getTokenChannel()?.postMessage({ type: 'LOGOUT' });
  window.location.href = '/login';
}

type OriginalRequest = NonNullable<AxiosError['config']> & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as OriginalRequest;

    if (!error.response) throw error;

    const { status, data } = error.response as {
      status: number;
      data: { code?: string; message?: string; error?: string };
    };

    if (status === 401) {
      // If a retried request after refresh returns 401 again → prevent infinite loop, force logout immediately
      if (originalRequest._retried) {
        forceLogout();
        throw new ApiError(401, 'Session has expired. Please log in again.', 'SESSION_EXPIRED');
      }

      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers!.Authorization = `Bearer ${newToken}`;
          originalRequest._retried = true;
          return apiClient(originalRequest);
        });
      }

      isRefreshing = true;
      originalRequest._retried = true;

      try {
        const newToken = await refreshAccessToken();
        processRefreshQueue(null, newToken);
        originalRequest.headers!.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest); // Retry original request (once only)
      } catch (refreshError) {
        processRefreshQueue(refreshError as Error, null);
        forceLogout();
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    // Other 4xx/5xx — Transform to ApiError
    throw new ApiError(status, data.message ?? error.message, data.code, data.error);
  },
);
```