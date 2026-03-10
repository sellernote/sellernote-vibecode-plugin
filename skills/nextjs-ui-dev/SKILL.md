---
name: nextjs-ui-dev
description: Next.js UI development following Sellernote conventions. Use when creating, modifying, or reviewing React components, Tailwind CSS v4 styled UI, form handling, tests, or page layouts in a Next.js App Router project. Triggers on tasks involving UI component creation, Tailwind CSS v4 styling with cn()/cva(), React Hook Form + Zod form implementation, Vitest/RTL/Playwright tests, page composition, layout structure, responsive design, dark mode, feature-based architecture, or any frontend UI work. Also use when asked to build a new component, create a form with validation, write component tests, implement a page layout, set up data fetching with TanStack Query, or apply Sellernote frontend architecture conventions.
---

# Next.js UI Dev

Develop Next.js UI components, pages, forms, and tests following Sellernote's frontend conventions.

## Convention Loading

Before starting any work, Read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/FRONTEND_CONVENTION.md` - Component design, props, imports, accessibility, SafeStorage
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - Feature-based architecture, 4 component types, dependency direction, data flow, decision trees
   - `references/STYLING_CONVENTION.md` - Tailwind CSS v4, cn(), cva(), responsive, dark mode

2. **Read when relevant**:
   - `references/NEXTJS_CONVENTION.md` - App Router, Server/Client Components, data fetching, caching
   - `references/REACT_CONVENTION.md` - React 19 patterns, Compiler, Hooks, Error Boundary, Suspense
   - `references/FORM_CONVENTION.md` - React Hook Form + Zod, Controller, dual validation
   - `references/TESTING_CONVENTION.md` - Vitest, React Testing Library, Playwright
   - `references/COMMON_CONVENTION.md` - Naming, git, error codes, logging
   - `references/TYPESCRIPT_CONVENTION.md` - TS style, imports, type system

## Workflow

Determine the component type first, then follow the applicable steps. Skip steps that do not apply.

### Step 1: Determine Component Type

Classify the work into one of the four component types:

| Type | Location | Characteristics |
|------|----------|----------------|
| UI | `components/ui/` | Props-only, no business logic, no store/queries |
| Feature | `features/{domain}/components/` | Business logic, uses hooks/store/queries, composes UI components |
| Layout | `components/layout/` | Page structure, navigation, no domain-specific logic |
| Page | `app/**/page.tsx` | Server Component default, composes Feature/UI, no business logic |

**Dependency direction (strictly enforced):**

```
Page -> Domain Feature -> Feature Common -> Shared/UI
```

- UI must not import Feature; Feature must not import Page
- Domain Feature must not directly import another Domain Feature
- When code from one Feature is needed in another, promote to `features/_common/{domain}/`

### Step 2: Implement Component

**Feature-based architecture:** Domain-specific code is co-located under `features/{domain}/`. Shared domain code used by 2+ Features goes in `features/_common/{domain}/`.

**Feature directory structure:**
```
features/{domain}/
├── components/          # [Required] Feature components
├── api/                 # [Required] query-options.ts + endpoint hook files
├── store/               # [Optional] Feature-specific Zustand store
├── schemas/             # [Optional] Feature-specific Zod schemas
├── types/               # [Optional] Feature-specific types (not API types)
├── constants/           # [Optional] Feature-specific constants
└── utils/               # [Optional] Feature-specific pure helpers
```

**API file pattern:**
- `query-options.ts` — query keys + `queryOptions()` + `queryFn` only. No `select` or transformations.
- `use-xxx-query.ts` / `use-xxx-mutation.ts` — endpoint hook files with `useQuery`/`useMutation`, co-located transforms/helpers/types.
- Import auto-generated API types from shared; do not redefine inside Features.

**Key constraints:**
- [MUST] No barrel files (`index.ts`). Use specific file path imports.
- [MUST] `@/` absolute paths for internal modules. Relative paths only within same folder/subfolders.
- [MUST] Max 3 levels prop drilling, then use Zustand.
- [MUST NOT] Copy server data (TanStack Query) into Zustand store.
- [MUST NOT] Write business logic directly in Page components. Delegate to Feature components.
- [MUST NOT] Write transformation logic in components or in `query-options.ts`. Place in endpoint hook files.

**State management selection:**

| State Type | Tool |
|------------|------|
| Server data (API) | TanStack Query |
| URL state (filter, sort, pagination) | nuqs |
| Single-component local state | useState / useReducer |
| Cross-component UI state | Zustand |

See `references/FRONTEND_ARCHITECTURE_CONVENTION.md` for full rules, decision trees, and examples.

### Step 3: Apply Styling

**Tailwind CSS v4 + cn() + cva():**

1. **Reusable component variants** — manage with `cva()` + `cn()`
2. **One-off styling** — Tailwind utility classes
3. **Conditional classes** — always use `cn()`, never template literals

**Key constraints:**
- [MUST] Use `cn()` (clsx + tailwind-merge) for conditional className merging
- [MUST] Mobile-first responsive: base styles for mobile, `sm:`/`md:`/`lg:` for larger screens
- [MUST] Install `prettier-plugin-tailwindcss` for class sorting
- [MUST NOT] Inline `style={{}}` for static styles. Use Tailwind classes.
- [MUST NOT] Use `!important`. Manage priority with `cn()`.
- [MUST NOT] Manual className string concatenation with template literals.
- [MAY] Inline `style` only for runtime dynamic values (server data, user input, drag position).

**Tailwind CSS v4 specifics** (AI code often produces v3 syntax — verify):

| Item | v4 Behavior |
|------|-------------|
| `border` default | `currentColor` — always specify color (e.g., `border border-gray-200`) |
| Opacity | `bg-opacity-*` removed → use `bg-black/50` slash syntax |
| `outline-none` | Only `outline-style: none`. Use `outline-hidden` for previous behavior |
| `ring` | Default 1px. Use `ring-3` for previous 3px behavior |
| `content` config | Automatic detection, no `content` array needed |

**Dark mode:** Use `@custom-variant dark (&:where(.dark, .dark *))` in globals.css + custom ThemeProvider. Apply with `dark:` prefix.

See `references/STYLING_CONVENTION.md` for full rules and examples.

### Step 4: Implement Forms (if applicable)

**Required combo:** React Hook Form + Zod

- [MUST] Connect fields with `Controller` (not `register` directly for controlled components)
- [MUST] Set `zodResolver` and `mode: 'onBlur'` in `useForm`
- [MUST] Extract form types with `z.infer<typeof schema>`, not manual interfaces
- [MUST] Dual validation: client + server using the same Zod schema
- [MUST NOT] Use `watch()` in render path — use `useWatch()` instead
- [SHOULD] Shared common schemas (email, password, phone) in `lib/schemas/common.ts`
- [SHOULD] `useFieldArray` for dynamic fields, `discriminatedUnion` for conditional validation
- [SHOULD] Multi-step forms: per-step Zod schema + Zustand store for interim data
- [SHOULD] Integrate TanStack Query `useMutation` with form submission
- [SHOULD] `FormProvider` + `useFormContext()` when separating field components

See `references/FORM_CONVENTION.md` for full rules and examples.

### Step 5: Write Tests

Follow the test pyramid:

| Level | Tool | Target | Ratio |
|-------|------|--------|-------|
| Unit | Vitest | Utility functions, custom hooks, pure logic | 50% |
| Integration | React Testing Library | Multi-component composition, form flows | 35% |
| E2E | Playwright | Critical user scenarios (login, order creation) | 15% |

**Key constraints:**
- [MUST] Component tests follow render -> interact -> assert pattern
- [MUST] Prioritize `getByRole`, `getByLabelText`, `getByText` over `getByTestId`
- [MUST] Use `waitFor` for async assertions
- [MUST] Each test must run independently — no shared state between tests
- [MUST NOT] Create `.test.tsx` files per component as default structure. Write separate test files organized by feature when needed.
- [SHOULD] Use MSW for API mocks, mock Zustand stores with `create()`, mock React Router with `vi.mock()`
- [SHOULD] Custom hooks tested with `renderHook`
- [SHOULD] Components using `useSuspenseQuery` tested with `Suspense` boundary + MSW

See `references/TESTING_CONVENTION.md` for full rules and examples.

## Next.js-Specific Rules

**Server vs Client Components:**
- Default is Server Component. Add `'use client'` only when client-side functionality is needed.
- Place `'use client'` boundaries at leaf nodes to minimize client bundle.
- Pass Server Components as `children` of Client Components to maintain server rendering.

**Data fetching:**

| Scenario | Method |
|----------|--------|
| Initial page load + SEO | Server Components fetch with explicit cache options |
| Data creation/modification/deletion | Server Actions with `revalidatePath`/`revalidateTag` |
| External webhooks, third-party APIs | Route Handlers |
| Client interaction updates, real-time | TanStack Query |

**Other Next.js rules:**
- [MUST] Use `next/image` (not `<img>`), set `priority` on LCP images
- [MUST] Load fonts via `next/font`, not external CDNs
- [MUST] `error.tsx` requires `'use client'`. Provide `error` and `reset` props.
- [MUST] Only `NEXT_PUBLIC_` prefix for client-exposed env vars. Never for secrets.
- [MUST] Limit middleware scope with `matcher` config
- [SHOULD] Route groups `(auth)/`, `(dashboard)/` for logical grouping
- [SHOULD] `loading.tsx` for per-route Suspense, individual `<Suspense>` for streaming

See `references/NEXTJS_CONVENTION.md` for full rules.

## React 19 Rules

- [MUST] Enable React Compiler in new projects. Do not use manual `useMemo`/`useCallback`/`React.memo` by default.
- [MUST] Pass `ref` as a regular prop (no `forwardRef` in React 19).
- [MUST] Use `<MyContext value={...}>` syntax (not `<MyContext.Provider>`).
- [MUST] Dialog/Overlay: always render the shell, control via `open` prop. Do not `{open && <Dialog />}`.
- [MUST] Event handler naming: `onXxx` for props, `handleXxx` for internal handlers.
- [MUST] `useEffect` only for external system sync. Not for event handling or derived state.
- [SHOULD] `useEffectEvent` for callbacks in Effects that should not be in dependency array.
- [SHOULD] `useSuspenseQuery` + `<Suspense>` + `<ErrorBoundary>` for declarative loading/error.
- [SHOULD] `react-error-boundary` with `resetKeys` for recovery. Per-section boundaries for fault isolation.
- [MAY] `useOptimistic` for instant UI feedback. `<Activity>` for state-preserving tab switches.

See `references/REACT_CONVENTION.md` for full rules.

## File Structure Reference

```
src/ (or app/ for Next.js App Router)
├── app/                        # Route files only (Next.js App Router)
│   ├── (auth)/                 # Auth route group
│   ├── (dashboard)/            # Dashboard route group
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   ├── error.tsx               # Global error boundary
│   └── not-found.tsx           # 404 page
├── features/                   # Domain-specific co-location
│   ├── _common/                # Shared across Features (with domain context)
│   │   └── po/
│   │       ├── components/
│   │       ├── api/
│   │       └── utils/
│   ├── order/
│   │   ├── components/
│   │   │   └── order-list/
│   │   │       ├── OrderList.tsx
│   │   │       └── OrderListItem.tsx
│   │   ├── api/
│   │   │   ├── query-options.ts
│   │   │   ├── use-orders-query.ts
│   │   │   └── use-update-order-mutation.ts
│   │   ├── store/
│   │   ├── schemas/
│   │   ├── types/
│   │   └── constants/
│   └── auth/
│       ├── components/
│       └── api/
├── components/
│   ├── ui/                     # Props-only UI components
│   │   └── data-table/
│   │       └── DataTable.tsx
│   └── layout/                 # Layout components
│       └── header/
│           └── Header.tsx
├── hooks/                      # Shared custom hooks (useDebounce, etc.)
├── lib/                        # Shared utilities (cn(), API client, etc.)
├── types/                      # Shared type definitions
├── schemas/                    # Shared Zod schemas
├── constants/                  # Shared constants
└── styles/
    └── globals.css             # @import 'tailwindcss' + CSS variables
```

## Naming Conventions

| Target | Convention | Example |
|--------|-----------|---------|
| Component files | PascalCase | `UserProfile.tsx` |
| Hook files | kebab-case, `use-` prefix | `use-auth.ts` |
| Utility/type/constant files | kebab-case | `format-date.ts` |
| Directories | kebab-case | `order-list/` |
| Variables/functions | camelCase | `getUserById` |
| Classes/interfaces/types | PascalCase | `CreateUserRequest` |
| Global constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Booleans | `is`/`has`/`can`/`should` prefix | `isActive`, `hasPermission` |
| Event props | `onXxx` | `onCartAdd` |
| Internal handlers | `handleXxx` | `handleCartAdd` |
