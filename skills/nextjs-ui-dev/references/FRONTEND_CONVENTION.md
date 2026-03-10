# Frontend Convention

> This document defines common rules that apply across the entire frontend.
> Rules specific to particular tools/categories are found in the documents within subfolders.
>
> - ARCHITECTURE_CONVENTION.md
> - REACT_CONVENTION.md
> - STATE_CONVENTION.md
> - STYLING_CONVENTION.md
> - TESTING_CONVENTION.md
> - FORM_CONVENTION.md
> - API_CLIENT_CONVENTION.md
> - REACT_ROUTER_CONVENTION.md
> - TEMPLATES.md

---

## 1. Technology Stack Overview

| Area              | Technology                                  | Version                 |
| ----------------- | ------------------------------------------- | ----------------------- |
| Framework         | React Router v7 (framework mode)            | 7                       |
| UI Library        | React                                       | 19.2+                   |
| Language          | TypeScript                                  | Latest stable version   |
| Build Tool        | Vite                                        | Latest stable version   |
| Client State      | Zustand                                     | Latest stable version   |
| Server State      | TanStack Query                              | v5                      |
| URL State Mgmt    | nuqs                                        | 2.8+                    |
| Form/Validation   | React Hook Form + Zod                       | Latest stable version   |
| Testing           | Vitest + React Testing Library + Playwright | Latest stable version   |

> React Router v7 Framework Mode operates in SPA mode with the `ssr: false` setting. Pre-rendering is disabled by default, and is selectively enabled only for public pages that do not require authentication, such as login and terms of service pages. It is served from a CDN without a runtime server. Server Components and Server Actions are not used. However, even with `ssr: false`, some routes are rendered in Node.js at build time, so SSR-safe rules apply. See REACT_ROUTER_CONVENTION.md for details.

### Recommended Utility Libraries

| Area            | Recommended      | Reason                                            |
| --------------- | ---------------- | ------------------------------------------------- |
| Package Manager | pnpm             | Fast installation, disk efficiency, strict defaults |
| Date Handling   | date-fns         | tree-shakable, functional, lightweight             |
| Utilities       | Native JS first  | Import only needed functions from lodash-es         |
| Error Tracking  | Sentry SDK       | Standard for production error monitoring            |

- **Rule**: [SHOULD] Utility functions should prioritize native JavaScript methods. When lodash is needed, import only the required functions individually from `lodash-es`.
- **Good Example**:

```typescript
// 네이티브 메서드 우선
const unique = [...new Set(array)];
const grouped = Object.groupBy(items, (item) => item.category);
const cloned = structuredClone(deepObject);

// lodash가 필요한 경우 개별 import
import debounce from "lodash-es/debounce";
```

### nuqs (URL State Management)

- **Rule**: [SHOULD] State that should be reflected in the URL, such as filters, sorting, and pagination, should be managed using `nuqs`

### React Compiler

- **Rule**: [MUST] Enable React Compiler in new projects

---

## 2. Component Design Principles

### Single Responsibility Principle

- **Rule**: [MUST] A single component should be responsible for only one role
- **Good Example**:

```typescript
// UserAvatar: 아바타 렌더링만 담당
function UserAvatar({ src, name }: UserAvatarProps) {
  return <img src={src} alt={`${name}의 프로필 이미지`} />;
}

// UserGreeting: 인사말 렌더링만 담당
function UserGreeting({ name }: UserGreetingProps) {
  return <p>{name}님, 환영합니다.</p>;
}
```

### Composition-First Pattern

- **Rule**: [SHOULD] Compose using children/slot patterns, and prefer composition patterns over render props
- **Good Example**:

```typescript
interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

function Card({ children, header, footer }: CardProps) {
  return (
    <div className="card">
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// 사용
<Card header={<h2>제목</h2>} footer={<Button>확인</Button>}>
  <p>본문 내용</p>
</Card>;
```

### Props Design

- **Rule**: [MUST] Props should be defined with interface and destructured in the component parameters. Use React.ReactNode type for children.
- **Good Example**:

```typescript
interface ButtonProps {
  variant: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

function Button({
  variant,
  size = "md",
  disabled = false,
  children,
  onClick,
}: ButtonProps) {
  return (
    <button
      className={`btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

---

## 3. File/Folder Naming

| Target           | Rule                            | Example                   |
| ---------------- | ------------------------------- | ------------------------- |
| Component files  | PascalCase                      | `UserProfile.tsx`         |
| Hook files       | kebab-case (`use-` prefix)      | `use-auth.ts`             |
| Utility files    | kebab-case                      | `format-date.ts`          |
| Directories      | kebab-case                      | `user-profile/`           |
| Constant files   | kebab-case                      | `api-endpoints.ts`        |
| Type files       | kebab-case                      | `user-types.ts`           |

> **Note**: Per-component `.test.tsx` and `.stories.tsx` files are not included in the base structure.

---

## 4. Import Rules

### Use Absolute Paths

- **Rule**: [MUST] Internal project modules should use `@/` absolute paths by default. Relative paths (`./`, `../`) are allowed for files in the same folder or subfolders.

### Import Order

- **Rule**: [SHOULD] Import statements should follow this order: 1) React/external libraries, 2) Internal modules (`@/`), 3) Relative paths (`./`), 4) Types (type import)
- **Good Example**:

```typescript
// 1) React/외부 라이브러리
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// 2) 내부 모듈
import { useAuth } from "@/hooks/use-auth";

// 3) 상대 경로
import { formatPrice } from "./utils";

// 4) 타입
import type { Product } from "@/types/product-types";
```

### No Barrel Files

- **Rule**: [MUST NOT] Do not use `index.ts` barrel files. Components should be directly named exported from their files, and imports should use specific file paths.

---

## 5. Accessibility Standards

### Keyboard Accessibility

- **Rule**: [MUST] Interactive elements (buttons, links, form fields, etc.) must be accessible and operable using only a keyboard

### Image Alt Text

- **Rule**: [MUST] Provide meaningful `alt` attributes for all `<img>` elements

### WCAG Compliance

- **Rule**: [SHOULD] Comply with WCAG 2.1 AA level

### Semantic HTML Usage

- **Rule**: [MUST] Use semantic HTML elements appropriate to their meaning, and do not overuse `<div>`
- **Good Example**:

```typescript
function ProductList({ products }: ProductListProps) {
  return (
    <section aria-labelledby="product-heading">
      <h2 id="product-heading">상품 목록</h2>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <article>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

---

## 6. Performance Standards

### Core Web Vitals

- **Rule**: [SHOULD] Meet Core Web Vitals target values (LCP < 2.5s, INP < 200ms, CLS < 0.1)

### Image Optimization

- **Rule**: [MUST] Optimize images at build time or CDN level (WebP/AVIF conversion, responsive srcset, lazy loading)

### Code Splitting

- **Rule**: [SHOULD] Use `React.lazy` and `Suspense` for code splitting heavy components
- **Good Example**:

```typescript
import { lazy, Suspense } from "react";

const HeavyChart = lazy(() => import("@/components/ui/heavy-chart"));

function Dashboard() {
  return (
    <main>
      <h1>대시보드</h1>
      <Suspense
        fallback={
          <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
        }
      >
        <HeavyChart />
      </Suspense>
    </main>
  );
}
```

### Bundle Size Monitoring

- **Rule**: [SHOULD] Regularly monitor bundle size using `rollup-plugin-visualizer`

---

## 7. Anti-Patterns

This document summarizes only the representative anti-patterns that recur across the frontend. For detailed examples and specific rules, refer to the specialized sub-documents.

### Representative Anti-Pattern Summary

- **Rule**: [MUST NOT] Do not pass props more than 3 levels deep. For detailed criteria, follow the composition/Context patterns in `REACT_CONVENTION.md`.
- **Rule**: [MUST NOT] Do not cram page composition, data fetching, form handling, and modal control all into a single component. Follow `ARCHITECTURE_CONVENTION.md` for component responsibilities and placement.
- **Rule**: [MUST NOT] Do not fetch data directly inside `useEffect`. Follow the TanStack Query patterns in `STATE_CONVENTION.md` for server state.
- **Rule**: [MUST NOT] Do not cause infinite re-execution by placing unstable function references in effect dependencies. Follow `REACT_CONVENTION.md` for detailed rules on ref/callback/effect.

---

## 8. Safe Browser Storage Usage

### SafeStorage Utility

- **Rule**: [MUST] When accessing `localStorage`/`sessionStorage`, always use safe wrappers (`safeLocalStorage`, `safeSessionStorage`). Do not access native APIs directly.
- **Rule**: [MUST] Provide an in-memory fallback when storage access is unavailable to maintain data while the tab is alive.
- **Rule**: [SHOULD] Display a notification message to the user when storage unavailability is detected.

> **Do not store authentication tokens in storage.** Access Tokens are managed as in-memory variables, and Refresh Tokens are managed as httpOnly cookies. SafeStorage is intended for **general data unrelated to authentication**, such as theme settings, language settings, and UI state. See API_CLIENT_CONVENTION.md for detailed rules.

```typescript
// app/lib/safe-storage.ts

/** 인메모리 fallback 스토리지 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(index: number) { return [...this.store.keys()][index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, value); }
}

/** 스토리지 접근 가능 여부를 테스트한다 */
function isStorageAvailable(storage: Storage): boolean {
  const testKey = '__storage_test__';
  try {
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/** 스토리지 사용 불가 여부 */
let storageUnavailable = false;

export function isStorageUnavailable(): boolean {
  return storageUnavailable;
}

function createSafeStorage(nativeStorage: Storage): Storage {
  if (isStorageAvailable(nativeStorage)) {
    return nativeStorage;
  }

  storageUnavailable = true;
  return new MemoryStorage();
}

export const safeLocalStorage = createSafeStorage(
  typeof window !== 'undefined' ? window.localStorage : new MemoryStorage(),
);

export const safeSessionStorage = createSafeStorage(
  typeof window !== 'undefined' ? window.sessionStorage : new MemoryStorage(),
);
```

### User Notification

- **Rule**: [SHOULD] When storage unavailability is detected during app initialization, display a notification message so the user can identify the cause.

```typescript
// app/components/ui/storage-warning/StorageWarning.tsx
import { isStorageUnavailable } from "@/lib/safe-storage";

export function StorageWarning() {
  if (!isStorageUnavailable()) return null;

  return (
    <div role="alert" className="rounded border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
      <p className="font-semibold">브라우저 저장소 제한</p>
      <p className="mt-1 text-sm">
        현재 브라우저 환경에서 로컬 저장소에 접근할 수 없습니다.
        탭을 닫거나 새로고침하면 설정이 초기화됩니다.
        브라우저 설정에서 쿠키 및 사이트 데이터를 허용해주세요.
      </p>
    </div>
  );
}
```

- **Good Example**:

```typescript
import { safeLocalStorage } from "@/lib/safe-storage";

// SafeStorage 래퍼 사용 — 크래시 없이 fallback 동작
safeLocalStorage.setItem("theme", "dark");
const theme = safeLocalStorage.getItem("theme");
```

- **Bad Example**:

```typescript
// 네이티브 API 직접 접근 — 프라이빗 브라우징에서 크래시!
localStorage.setItem("theme", "dark");
const theme = localStorage.getItem("theme");
```