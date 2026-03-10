# Next.js Convention

> This document defines the rules applied to Next.js 15 App Router projects.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Technology Stack

| Item | Version/Configuration |
| --- | --- |
| Next.js | 15 |
| React | 19 |
| TypeScript | 5.x |
| Build Tool | Turbopack (default) |

---

## 2. App Router File Convention

### Special File Roles

- **Rule**: [MUST] Special files in App Router must be used according to the roles defined below.

| File | Role |
| --- | --- |
| `page.tsx` | Unique UI for a route. The page component that matches the corresponding URL |
| `layout.tsx` | Layout shared with child routes. Persists without re-rendering during navigation |
| `loading.tsx` | Automatic Suspense boundary. Loading UI during route transitions |
| `error.tsx` | Error boundary. `'use client'` required |
| `not-found.tsx` | 404 UI |
| `template.tsx` | Similar to layout but remounts on every navigation |
| `route.ts` | API endpoint (Route Handler) |
| `default.tsx` | Default fallback for Parallel Routes |

### Route Groups

- **Rule**: [SHOULD] Use parentheses to logically group routes without affecting the URL path.

```
app/
├── (auth)/
│   ├── login/page.tsx      # /login
│   └── layout.tsx          # Layout dedicated to authentication pages
├── (dashboard)/
│   ├── overview/page.tsx   # /overview
│   └── layout.tsx          # Layout dedicated to dashboard
└── layout.tsx              # Root layout
```

### Parallel Routes & Intercepting Routes

- **Rule**: [MAY] Use `@slotName` directories for simultaneous rendering slots, and `(.)` `(..)` `(...)` patterns for route intercepting.

---

## 3. Server Components vs Client Components

- **Rule**: [MUST] The default is Server Component. All components are rendered on the server unless otherwise specified.
- **Rule**: [MUST] `'use client'` should only be declared at the top of a file when client-side functionality is needed.

### Decision Criteria

| Required Functionality | Server Component | Client Component |
| --- | --- | --- |
| Data fetching | Use async/await directly | Use TanStack Query |
| Backend resource access | Direct access available | Requires API intermediary |
| Sensitive information (tokens, keys) | Process on server only | Risk of exposure |
| useState, useEffect | Not available | Available |
| Event handlers (onClick) | Not available | Available |
| Browser APIs (localStorage) | Not available | Available |

### Composition Pattern

- **Rule**: [SHOULD] Pass Server Components as children of Client Components to maintain server rendering benefits. Directly importing Server Components in Client Components causes them to be included in the bundle.

```typescript
// page.tsx (Server Component)
export default function Page() {
  return (
    <ClientWrapper>
      <ServerContent /> {/* Server-rendered result is passed */}
    </ClientWrapper>
  );
}
```

### 'use client' Boundary Placement

- **Rule**: [MUST] Place `'use client'` boundaries at the lowest level of the tree (leaf nodes) to minimize the client bundle.

```typescript
// page.tsx (Server Component)
export default async function ProductPage() {
  const products = await fetchProducts();
  return (
    <main>
      <ProductList products={products} />
      <AddToCartButton /> {/* Only this component uses 'use client' */}
    </main>
  );
}
```

---

## 4. Data Fetching Strategy

### Server Components fetch

- **Rule**: [SHOULD] Fetch initial page load data directly using async/await in Server Components.

```typescript
// app/products/page.tsx
export default async function ProductsPage() {
  const products = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 },
  }).then((res) => res.json());

  return <ProductList products={products} />;
}
```

### Server Actions

- **Rule**: [MUST] Use Server Actions for mutations such as data creation/modification/deletion. Invalidate cache immediately using `revalidatePath`/`revalidateTag`.

```typescript
// app/actions/post.ts
'use server';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  await db.post.create({ data: { title, content } });
  revalidatePath('/posts');
}
```

### Route Handlers

- **Rule**: [MAY] Use Route Handlers for cases that are difficult to handle with Server Actions, such as receiving external webhooks or integrating with third-party APIs.

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') ?? '1';
  const users = await db.user.findMany({ skip: (Number(page) - 1) * 20, take: 20 });
  return NextResponse.json(users);
}
```

### TanStack Query (Client-side Data Fetching)

- **Rule**: [SHOULD] Use TanStack Query when data updates after client interactions or real-time data is needed. Refer to STATE_CONVENTION.md for detailed patterns.

### Data Fetching Method Selection Criteria

| Scenario | Method |
| --- | --- |
| Initial page load + SEO | Server Components fetch |
| Form submission, data creation/modification/deletion | Server Actions |
| External webhooks, third-party API integration | Route Handlers |
| Data updates after client interaction | TanStack Query |
| Real-time data (polling, infinite scroll) | TanStack Query |

---

## 5. Caching & Revalidation

### ISR (Incremental Static Regeneration)

- **Rule**: [SHOULD] Set the `revalidate` option for pages that require periodic revalidation.

```typescript
export const revalidate = 3600; // Revalidate every 1 hour

export default async function ProductsPage() {
  const products = await fetchProducts();
  return <ProductList products={products} />;
}
```

### On-demand Revalidation

- **Rule**: [SHOULD] Use `revalidatePath()` or `revalidateTag()` when cache must be invalidated immediately at the point of data change.

```typescript
'use server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });
  revalidatePath('/products');         // Path-based invalidation
  revalidateTag('product-detail');     // Tag-based invalidation
}
```

### Explicit fetch Options

- **Rule**: [MUST] Explicitly set cache behavior when fetching in Server Components. Omitting options may result in unintended caching behavior.

| Option | Behavior |
| --- | --- |
| `cache: 'force-cache'` | Cache first (default) |
| `cache: 'no-store'` | Always fresh data |
| `next: { revalidate: N }` | Revalidate every N seconds |
| `next: { tags: ['tag'] }` | Tag-based revalidation |

```typescript
const staticData = await fetch('https://api.example.com/categories', {
  cache: 'force-cache',
});
const realtimeData = await fetch('https://api.example.com/stock', {
  cache: 'no-store',
});
```

---

## 6. Middleware

- **Rule**: [SHOULD] Place `middleware.ts` at the project root (`src/`) or the top level. Use it for authentication checks, redirects, request logging, etc.
- **Rule**: [MUST] Limit the middleware scope using `matcher` config. Omitting matcher causes static files to be processed as well, degrading performance.

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 7. Error Handling

- **Rule**: [MUST] `error.tsx` serves as a per-route error boundary. `'use client'` is required. Utilize `error` and `reset` props.

```typescript
// app/products/error.tsx
'use client';

export default function ErrorPage({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

- **Rule**: [MUST] `global-error.tsx` handles errors in the root layout and must include `<html>` and `<body>` tags. `'use client'` is required.

- **Rule**: [SHOULD] Use `not-found.tsx` to provide a custom 404 page that matches the project design.

---

## 8. Loading State

- **Rule**: [SHOULD] Set up automatic per-route Suspense boundaries with `loading.tsx` and provide skeleton UI.
- **Rule**: [SHOULD] Wrap independent data sections with individual Suspense boundaries to implement Streaming.

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <main>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>
    </main>
  );
}
```

---

## 9. Image/Font Optimization

- **Rule**: [MUST] Use the `next/image` component for rendering images. Direct use of HTML `<img>` tags is prohibited.
- **Rule**: [MUST] Set the `priority` attribute on LCP images.
- **Rule**: [SHOULD] Provide responsive image size hints using the `sizes` attribute.

```typescript
import Image from 'next/image';

<Image src="/hero.jpg" alt="Main banner" width={1200} height={600} priority sizes="100vw" />
<Image src={src} alt={name} width={400} height={400} sizes="(max-width: 768px) 100vw, 33vw" />
```

- **Rule**: [MUST] Load fonts using `next/font`. Loading fonts from external CDNs is prohibited.

```typescript
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko" className={inter.className}><body>{children}</body></html>;
}
```

---

## 10. Environment Variable Management

- **Rule**: [MUST] Only use the `NEXT_PUBLIC_` prefix for variables that should be exposed to the client.
- **Rule**: [MUST NOT] Do not use `NEXT_PUBLIC_` for sensitive information such as API keys, secrets, or DB URLs. `NEXT_PUBLIC_` variables are inserted as literals into client-side JavaScript.

| Variable | Prefix | Correct Usage |
| --- | --- | --- |
| `NEXT_PUBLIC_GA_ID` | NEXT_PUBLIC_ | Public ID used in the browser |
| `NEXT_PUBLIC_API_URL` | NEXT_PUBLIC_ | Public API endpoint |
| `DATABASE_URL` | None | Server-only access |
| `JWT_SECRET` | None | Server-only access |

---

## 11. Anti-patterns

- **Rule**: [MUST NOT] Do not declare `'use client'` on components that are sufficient as Server Components.
- **Rule**: [MUST NOT] Do not use client Hooks such as `useState` or `useEffect` in Server Components. If Hooks are needed, extract them into a Client Component.
- **Rule**: [MUST NOT] Do not expose sensitive information via `NEXT_PUBLIC_`. (See 10. Environment Variable Management)
- **Rule**: [SHOULD NOT] Do not omit cache options in fetch. (See 5. Caching & Revalidation)
- **Rule**: [SHOULD NOT] Do not pass data fetched in `layout.tsx` as props to children. Layouts do not re-render during navigation.
- **Rule**: [MUST NOT] Do not omit `generateStaticParams` for dynamic routes that should be statically built.

```typescript
// app/products/[id]/page.tsx
export async function generateStaticParams() {
  const products = await fetchAllProducts();
  return products.map((product) => ({ id: product.id }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetchProduct(id);
  return <ProductDetail product={product} />;
}
```