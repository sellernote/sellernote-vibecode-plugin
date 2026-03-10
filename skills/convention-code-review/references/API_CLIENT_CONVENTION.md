# API Client Convention

> This document defines common rules and shared code that apply regardless of the HTTP client library.
> Refer to the library-specific documents for concrete implementations.
> - axios: axios/API_CLIENT_AXIOS_CONVENTION.md
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Common Rules

### Client File Location

- **Rule**: [MUST] The HTTP client is defined in `app/lib/api-client.ts`. It exports a unified interface (`get`/`post`/`put`/`patch`/`delete`) regardless of the chosen library.

### BASE_URL

- **Rule**: [MUST] BASE_URL is read from environment variables. When using Vite, use `VITE_API_URL` (`import.meta.env.VITE_API_URL`).

### Authentication Token Management

- **Rule**: [MUST] The Access Token is stored in a module-scoped memory variable.
- **Rule**: [MUST NOT] Do not store the Access Token in `localStorage` or `sessionStorage`.
- **Rule**: [MUST] The Refresh Token is managed as an `httpOnly` cookie (set by the backend).

### Token Refresh Flow

- **Rule**: [MUST] On a 401 response, refresh the Access Token using the Refresh Token and retry the original request. On refresh failure, redirect to the login page.
- **Rule**: [MUST] When multiple requests receive 401 simultaneously, only the first one performs the refresh, while the rest wait in a queue and retry with the new token.
- **Rule**: [MUST] If a retried request after refresh returns 401 again, prevent an infinite loop and immediately process a logout.

### Cross-Tab Token Synchronization

- **Rule**: [SHOULD] Use `BroadcastChannel` to synchronize token refresh results and logout across tabs.

---

## 2. Shared Code

The code below is used commonly regardless of the library.

### ApiError Class

```typescript
// app/lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly error?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isStatus(status: number): boolean {
    return this.status === status;
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }
}
```

### Cross-Tab Token Synchronization

```typescript
// app/lib/token-sync.ts
type TokenMessage =
  | { type: 'TOKEN_REFRESHED'; token: string }
  | { type: 'LOGOUT' };

let tokenChannel: BroadcastChannel | null = null;

export function getTokenChannel() {
  return tokenChannel;
}

export function initTokenSync() {
  try {
    tokenChannel = new BroadcastChannel('auth_token_sync');
  } catch {
    // BroadcastChannel 미지원 환경 (IE, 일부 WebView) — 단일 탭으로 동작
    return;
  }

  tokenChannel.onmessage = (event: MessageEvent<TokenMessage>) => {
    switch (event.data.type) {
      case 'TOKEN_REFRESHED':
        setAccessToken(event.data.token);
        break;
      case 'LOGOUT':
        setAccessToken(null);
        window.location.href = '/login';
        break;
    }
  };
}

export function destroyTokenSync() {
  tokenChannel?.close();
  tokenChannel = null;
}
```

```typescript
// app/root.tsx 또는 앱 초기화 시점
import { initTokenSync } from '@/lib/token-sync';

initTokenSync();
```

---

## 3. Anti-Patterns

### Calling fetch/axios Directly from Components

- **Rule**: [MUST NOT] Do not call `fetch`/`axios` directly from components. Always call through `apiClient`.
- **Bad Example**:
  ```typescript
  export function OrderList() {
    const { data } = useQuery({
      queryKey: ['orders'],
      queryFn: () => fetch('/api/orders').then(res => res.json()),
    });
  }
  ```
- **Good Example**:
  ```typescript
  export function OrderList() {
    const { data } = useOrdersQuery(filters);
  }

  // features/order/api/use-orders-query.ts
  const fetchOrders = (filters: OrderFilters) =>
    apiClient.get<PaginatedResponse<Order>>('/orders', { params: filters });
  ```

### Hardcoding URLs

- **Rule**: [MUST NOT] Do not hardcode API endpoint URLs in components or hooks.
- **Bad Example**:
  ```typescript
  const response = await fetch('https://api.example.com/orders');
  ```
- **Good Example**:
  ```typescript
  const response = await apiClient.get('/orders');
  ```

### Storing Tokens in localStorage

- **Rule**: [MUST NOT] Do not store the Access Token in `localStorage`.
- **Bad Example**:
  ```typescript
  localStorage.setItem('accessToken', token); // XSS 취약!
  ```
- **Good Example**:
  ```typescript
  import { setAccessToken } from '@/lib/api-client';
  setAccessToken(token);
  ```