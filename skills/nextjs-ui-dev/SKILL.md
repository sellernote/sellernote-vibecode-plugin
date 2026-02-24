---
name: nextjs-ui-dev
description: Next.js UI development following Sellernote conventions. Use when creating, modifying, or reviewing React components, MUI-styled UI, form handling, Storybook stories, Jest/RTL tests, or page layouts in a Next.js App Router project. Triggers on tasks involving UI component creation, MUI v6 theming and styling, React Hook Form + Zod form implementation, Storybook story writing, component testing, page composition, layout structure, responsive design, dark mode support, or any frontend UI work. Also use when asked to build a new component, create a form with validation, add Storybook coverage, write component tests, implement a page layout, or apply Sellernote frontend architecture conventions.
---

# Next.js UI Dev

Develop Next.js UI components, pages, forms, and tests following Sellernote's frontend conventions.

## Convention Loading

Before starting any work, Read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/FRONTEND_CONVENTION.md` - Component design, props, imports, accessibility
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - 4 component types, dependency direction, colocation
   - `references/STYLING_CONVENTION.md` - MUI v6 theming, styled(), sx, anti-patterns

2. **Read when relevant**:
   - `references/NEXTJS_CONVENTION.md` - App Router, Server/Client Components, data fetching
   - `references/FORM_CONVENTION.md` - React Hook Form + Zod forms
   - `references/TESTING_CONVENTION.md` - Storybook, Jest, E2E tests
   - `references/COMMON_CONVENTION.md` - Naming, git, error codes
   - `references/TYPESCRIPT_CONVENTION.md` - TS style, imports, types
   - `references/REACT_CONVENTION.md` - React 19 패턴, Hooks 규칙, 성능 최적화, Error Boundary

## Workflow

Determine the component type first, then follow the applicable steps. Skip steps that do not apply.

### Step 1: Determine Component Type

Classify the work into one of the four component types:

| Type | Location | Characteristics | Storybook |
|------|----------|----------------|-----------|
| UI | `components/ui/` | Props-only, no business logic, no store/queries | Required |
| Feature | `components/feature/` | Business logic, uses hooks/store/queries, composes UI components | Optional |
| Layout | `components/layout/` | Page structure, navigation, no domain-specific logic | Optional |
| Page | `app/**/page.tsx` | Server Component default, composes Feature/UI, no business logic | No |

**Dependency direction (unidirectional, strictly enforced):**

```
Page -> Feature -> UI
```

- UI must not import Feature; Feature must not import Page
- UI components depend only on props, React built-in hooks, and other UI components
- UI components must not import from `store/`, `queries/`, or business `hooks/`

### Step 2: Implement Component

Follow standard React/MUI patterns. Key Sellernote constraints:

- **UI components**: Props with `interface`, `React.ReactNode` for children, no store/queries imports, max 300 lines
- **Feature components**: `'use client'` when using hooks/events, compose UI components, use TanStack Query (not `useEffect`) for data fetching, max 3 levels prop drilling (use Zustand beyond that)
- **Page components**: Server Component by default, only compose Feature/UI/Layout, no business logic. Only route files in `app/` (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`)

See `references/FRONTEND_ARCHITECTURE_CONVENTION.md` for full rules and examples.

### Step 3: Apply Styling

**MUI + Next.js setup (required in root layout):**

- Use `AppRouterCacheProvider` from `@mui/material-nextjs/v15-appRouter`
- Set `cssVariables: true` in `createTheme`
- Use `next/font` with CSS variable connected to MUI theme typography

**Styling priority order:**

1. **Theme overrides** - Global, all-instance styles
2. **`styled()`** - Reusable styled components
3. **`sx` prop** - One-off layout/spacing adjustments

**Key constraints:** `theme.palette` for all colors (no hex), `theme.spacing()` for spacing (no magic px), MUI breakpoints for responsive (no manual media queries), no inline `style={{}}`, no `!important`, use `Box`/`Stack`/`Grid` over raw HTML elements.

See `references/STYLING_CONVENTION.md` for full rules and examples.

### Step 4: Implement Forms (if applicable)

**Required combo:** React Hook Form + Zod

- Wrap MUI components with `Controller` (not `register` directly - MUI controlled components are incompatible)
- Set `zodResolver` and `mode: 'onBlur'` in `useForm`
- Extract form types with `z.infer<typeof schema>` (not manual interfaces)
- Client + server dual validation using the same Zod schema
- Field-level errors via MUI `error`/`helperText` props
- Shared common schemas (email, password, phone) in `lib/schemas/common.ts`
- `useFieldArray` for dynamic fields, `discriminatedUnion` for conditional validation

See `references/FORM_CONVENTION.md` for full rules and examples.

### Step 5: Write Tests

Follow the test pyramid distribution:

| Level | Tool | Target | Ratio |
|-------|------|--------|-------|
| Unit | Jest | Utility functions, custom hooks, pure logic | 40% |
| Component | Storybook + Interaction Testing | Individual UI component rendering and interaction | 25% |
| Integration | React Testing Library | Multi-component composition, form flows | 20% |
| E2E | Playwright | Critical user scenarios (login, order creation) | 10% |
| Visual | Chromatic | UI style regression detection | 5% |

**Key constraints:** CSF3 format with `satisfies Meta<typeof Component>`, `play` functions for interactive components, `getByRole`/`getByLabelText`/`getByText` over `getByTestId`, MSW for API mocks, `waitFor` for async assertions, colocate test files with components.

See `references/TESTING_CONVENTION.md` for full rules and examples.

## File Structure Reference

```
src/
├── app/                        # Route files only
│   ├── (auth)/                 # Auth route group
│   ├── (dashboard)/            # Dashboard route group
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   ├── error.tsx               # Global error boundary
│   └── not-found.tsx           # 404 page
├── components/
│   ├── ui/                     # UI components (props-only, Storybook targets)
│   │   └── StatusBadge/
│   │       ├── StatusBadge.tsx
│   │       ├── StatusBadge.stories.tsx
│   │       ├── StatusBadge.test.tsx
│   │       └── index.ts
│   ├── feature/                # Feature components (business logic)
│   │   └── OrderList/
│   │       ├── OrderList.tsx
│   │       ├── OrderList.test.tsx
│   │       └── index.ts
│   └── layout/                 # Layout components (structure)
│       └── Header/
├── hooks/                      # Custom hooks
├── store/                      # Zustand stores
├── queries/                    # TanStack Query hooks
├── actions/                    # Server Actions
├── lib/                        # Utilities, API clients
├── types/                      # Shared type definitions
├── theme/                      # MUI theme
│   ├── index.ts                # createTheme
│   └── tokens.ts               # Design tokens
├── schemas/                    # Shared Zod schemas
└── constants/                  # Constants
```
