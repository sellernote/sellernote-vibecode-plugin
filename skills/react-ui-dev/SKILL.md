---
name: react-ui-dev
description: React Router 7 Framework Mode (ssr:false) UI development guide. Covers component creation (UI/Feature/Layout/Page), feature-based co-location architecture, Tailwind CSS v4 + cn()/cva() styling, React Hook Form + Zod forms, Vitest + RTL + Playwright testing, React 19 patterns (Compiler, direct ref, use(), Activity), and SSR-safety rules — all following Sellernote frontend conventions. Use this skill for any React SPA UI work including creating components, styling, building forms, writing tests, page layouts, responsive design, and route modules. Trigger on requests like "create a component", "add styling", "build a form", "write tests", "add a page", "UI development", "make it responsive", "add error boundary", or any frontend UI task in a React Router 7 project. For Next.js projects, use the nextjs-ui-dev skill instead.
---

# React UI Dev

Develop UI components, pages, forms, and tests in React Router 7 Framework Mode (`ssr: false`) projects following Sellernote frontend conventions.

> **React Router 7 Framework Mode**: All projects use `ssr: false` with selective pre-rendering for public pages only. There is no runtime server — served from CDN. Server Components and Server Actions are not used. TanStack Query is the single solution for runtime data fetching. Even with `ssr: false`, some routes render in Node.js at build time, so SSR-safe rules apply to all components.

## Convention Loading

Read the following reference files before starting work:

1. **Always read first** (core rules):
   - `references/FRONTEND_CONVENTION.md` — Component design, props, imports, accessibility, performance
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` — Feature-based co-location, 4-type component classification, dependency direction, data flow
   - `references/STYLING_CONVENTION.md` — Tailwind CSS v4 + cn()/cva(), responsive design, dark mode

2. **Read when needed**:
   - `references/FORM_CONVENTION.md` — React Hook Form + Zod forms
   - `references/TESTING_CONVENTION.md` — Vitest, React Testing Library, Playwright
   - `references/REACT_CONVENTION.md` — React 19 patterns, Hooks rules, performance, Error Boundary, Compiler
   - `references/REACT_ROUTER_CONVENTION.md` — React Router 7 Framework Mode, route modules, data fetching, auth guards
   - `references/COMMON_CONVENTION.md` — Naming, git, error codes
   - `references/TYPESCRIPT_CONVENTION.md` — TS strict mode, type system, imports

## Workflow

Determine the component type first, then follow the applicable steps. Skip steps that do not apply.

### Step 1: Determine Component Type

Classify into one of 4 component types:

| Type | Location | Characteristics |
|------|----------|-----------------|
| UI | `components/ui/` | Props-only, no business logic, no store/queries |
| Feature | `features/{domain}/components/` | Business logic, uses hooks/store/queries, composes UI components |
| Layout | `components/layout/` | Page structure/navigation, no domain-specific logic |
| Page | `routes/**/*.tsx` | Route module, composes Feature/UI/Layout components only |

**Dependency direction (strictly one-way):**

```
Page → Feature → Feature Common → Shared/UI
```

- UI components depend only on: props, React built-in hooks, other UI components
- UI components must NOT import from: `store/`, `queries/`, `features/`, business `hooks/`
- Feature components must NOT import from other Domain Features directly — promote shared code to `features/_common/{domain}/`
- Page components (route modules) must NOT contain business logic

### Step 2: File Placement

Follow the feature-based co-location architecture:

```
app/
├── routes/                 # Route module files only (composition, no business logic)
├── features/               # Domain-specific co-location
│   ├── _common/{domain}/   # Shared across 2+ Features with domain context
│   │   ├── components/     # Shared Feature components
│   │   ├── api/            # Shared query hooks
│   │   └── {hooks,schemas,constants,types,utils}/  # Optional
│   └── {domain}/           # Single-domain Feature
│       ├── components/     # Feature components (required)
│       ├── api/            # query-options.ts + endpoint hook files (required)
│       └── {store,hooks,schemas,constants,types,utils}/  # Optional
├── components/
│   ├── ui/                 # Shared UI components (props-only)
│   └── layout/             # Layout components (Header, Sidebar, Footer)
├── hooks/                  # Shared custom hooks (useDebounce, useMediaQuery)
├── lib/                    # Shared utilities (cn(), API client)
├── types/                  # Shared type definitions
├── schemas/                # Shared Zod schemas
└── constants/              # Shared constants
```

**Key placement rules:**
- Domain-specific code goes under `features/{domain}/`
- Code shared by 2+ Features with domain context goes under `features/_common/{domain}/`
- Domain-agnostic general-purpose code goes in shared directories (`components/`, `hooks/`, `lib/`, `types/`)
- Do NOT use `index.ts` barrel files in app code — use direct file path imports
- Do NOT flat-list components at the top of `components/` — always classify under `ui/` or `layout/`

### Step 3: Component Implementation

**UI Components:**
- Define props with `interface`, use `React.ReactNode` for children
- Accept `className?: string` prop for external customization via `cn()`
- Max ~300 lines per component file
- Wrap native HTML elements with `ComponentPropsWithoutRef<"element">` (or `ComponentPropsWithRef` when forwarding ref)

**Feature Components:**
- Compose UI components for screens
- Fetch data via TanStack Query custom hooks from `features/{domain}/api/`
- Use Zustand for shared client UI state (do NOT copy server data to store)
- Use `useWatch()` (not `watch()`) for form field subscriptions in render path

**Page Components (Route Modules):**
- Only compose Feature/UI/Layout components — no business logic
- Export: `default` (required), `ErrorBoundary`, `meta`, `links`, `handle` (optional)
- Import `Route` type from auto-generated `./+types/` directory
- Do NOT call `useQuery`/`useMutation` directly in route modules

**Data Flow (Fetching → Consume):**
- `features/{domain}/api/query-options.ts` — query keys + `queryOptions()` + `queryFn` (no `select`, no transforms)
- Endpoint hook files (`use-xxx-query.ts`, `use-xxx-mutation.ts`) — `useQuery`/`useMutation` with `select` and co-located transforms
- Do NOT redefine API request/response types inside Features — use auto-generated shared types

**React 19 & Compiler rules:**
- React Compiler is enabled — do NOT use manual `useMemo`/`useCallback`/`React.memo` by default
- Pass `ref` directly as a prop — do NOT use `forwardRef`
- Use `<MyContext value={...}>` syntax (not `<MyContext.Provider>`)
- Use `useActionState` + `useFormStatus` for form submission state
- Use `useEffectEvent` for Effect callbacks that should not be dependencies

**SSR-Safety (applies to all components):**
- Access browser APIs (`window`, `document`, `localStorage`) only inside `useEffect` or event handlers
- Use `lazy(() => import(...))` for browser-only libraries (charts, editors, maps)
- Use `typeof window !== 'undefined'` guard when unavoidable in component body

### Step 4: Styling

**Styling method priority:**

| Scenario | Method |
|----------|--------|
| Reusable component with variants | `cva()` + `cn()` |
| One-off styling | Tailwind utility classes |
| Runtime dynamic values (server response, user input) | Inline `style` allowed |

**`cn()` utility** — from `clsx` + `tailwind-merge` at `lib/cn.ts`:
```typescript
import { cn } from "@/lib/cn";
<div className={cn("rounded p-4 border", isActive && "bg-blue-50", className)} />
```

**`cva()` for variants** — from `class-variance-authority`:
```typescript
const badgeVariants = cva("inline-flex items-center rounded-full px-2 py-0.5 text-xs", {
  variants: {
    status: {
      active: "bg-green-50 text-green-700",
      pending: "bg-yellow-50 text-yellow-700",
    },
  },
});
```

**Key constraints:**
- [MUST NOT] No inline `style={{}}` for static styles — use Tailwind classes
- [MUST NOT] No `!important` — manage class priority with `cn()`
- [MUST NOT] No manual className string concatenation (template literals) — use `cn()`
- [MUST] Mobile-first responsive: base styles for mobile, `sm:`/`md:`/`lg:` for larger screens
- [MUST] Use Tailwind breakpoint prefixes — do NOT write CSS media queries directly
- [MUST] Install `prettier-plugin-tailwindcss` for class sorting

**Tailwind CSS v4 gotchas** (AI-generated code often gets these wrong):
- `border` default color is `currentColor` — always specify color class (e.g., `border border-gray-200`)
- `bg-opacity-*` removed — use slash syntax: `bg-black/50`
- `ring` default width is 1px (was 3px) — use `ring-3` for old behavior
- `outline-none` only sets `outline-style: none` — use `outline-hidden` for old behavior
- Use `@custom-variant dark (&:where(.dark, .dark *))` for dark mode in v4

### Step 5: Form Implementation (when applicable)

**Required combination:** React Hook Form + Zod

- Use `zodResolver` + `mode: 'onBlur'` on `useForm`
- Extract form types with `z.infer<typeof schema>` — do NOT write manual interfaces
- Connect fields via `Controller` (use `FormProvider` + `useFormContext()` when splitting into sub-components)
- Use `useWatch()` for conditional field rendering — do NOT use `watch()` in render path
- Use `useFieldArray` for dynamic field lists
- Use `discriminatedUnion` for conditional validation schemas
- Define common schemas (email, password, phone) in `lib/schemas/common.ts` or `schemas/`
- Place feature-specific schemas in `features/{domain}/schemas/`
- Integrate mutations via TanStack Query `useMutation` — map server errors to fields with `setError()`
- Multi-step forms: separate Zod schema per step, store interim data in Zustand

**Dual validation principle:**
- Client-side validation provides immediate per-field feedback at `onBlur`
- Server-side validation with the same Zod schema is mandatory — client validation alone is NOT sufficient

### Step 6: Testing

Follow the test pyramid:

| Level | Tool | Target | Proportion |
|-------|------|--------|------------|
| Unit | Vitest | Utility functions, custom hooks, pure logic | 50% |
| Integration | React Testing Library | Multi-component composition, form flows | 35% |
| E2E | Playwright | Core user scenarios (login, order CRUD) | 15% |

**Key rules:**
- Follow render → interact → assert pattern
- Prioritize `getByRole` / `getByLabelText` / `getByText` — use `getByTestId` only as last resort
- Mock APIs with MSW (`msw/node`)
- Use `waitFor` for async assertions
- Each test must be independent — do NOT share state between tests
- Test files go in `features/{domain}/tests/` for feature tests, or co-located for hooks/utils

**Test location pattern:**
```
features/order/tests/
└── use-orders-query.test.ts

hooks/
├── use-counter.ts
└── use-counter.test.ts

lib/
├── format-date.ts
└── format-date.test.ts
```

## Route Module Structure

```typescript
// app/routes/dashboard/orders.tsx
import type { Route } from "./+types/orders";
import { OrderList } from "@/features/order/components/order-list/OrderList";
import { OrderFilter } from "@/features/order/components/order-filter/OrderFilter";
import { PageLayout } from "@/components/layout/page-layout/PageLayout";

export const handle = { breadcrumb: "Orders" };

export function meta({}: Route.MetaArgs) {
  return [{ title: "Order Management" }];
}

export default function OrdersPage() {
  return (
    <PageLayout title="Order Management">
      <OrderFilter />
      <OrderList />
    </PageLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div><h2>Something went wrong</h2></div>;
}
```

## State Management Decision

| Data type | Tool |
|-----------|------|
| Server data (API responses) | TanStack Query (`useQuery` / `useMutation`) |
| URL-reflected state (filters, sort, pagination) | nuqs (`useQueryStates`) |
| Single-component local state | `useState` / `useReducer` |
| Cross-component UI state (sidebar, theme, notifications) | Zustand |
| Form input state | React Hook Form |

- Do NOT copy server data (TanStack Query) into Zustand store
- Do NOT use `useEffect` to fetch data — use TanStack Query

## Auth & Route Guards

- Wrap authenticated routes with `layout("./routes/guards/auth-guard.tsx", [...])` in `routes.ts`
- AuthGuard checks auth via TanStack Query `useCurrentUser()` hook, redirects with `returnTo` param
- GuestGuard redirects already-authenticated users away from login/signup
- RoleGuard files per role for role-based access control
- Access Tokens in memory, Refresh Tokens via httpOnly cookies
- Use `safeLocalStorage` / `safeSessionStorage` wrappers for browser storage — never use native APIs directly

## Cross-Skill References

- **React component patterns, Hooks, performance**: use `react-dev` skill
- **Data fetching, state management**: use `react-data-provider` skill
- **Full feature orchestration**: use `react-dev-orchestration` skill
- **Code review**: use `convention-code-review` skill
- **Convention refactoring**: use `convention-refactor` skill
