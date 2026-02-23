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
   - `references/NEXTJS_CONVENTION.md` - When working with App Router files, Server/Client Components, data fetching, caching
   - `references/FORM_CONVENTION.md` - When implementing forms with React Hook Form + Zod
   - `references/TESTING_CONVENTION.md` - When writing Storybook stories, Jest tests, or E2E tests
   - `references/COMMON_CONVENTION.md` - When unsure about naming, git, error codes
   - `references/TYPESCRIPT_CONVENTION.md` - When unsure about TS style, imports, types

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

- [MUST NOT] Reverse dependencies: UI must not import Feature; Feature must not import Page
- [MUST] UI components depend only on props, React built-in hooks, and other UI components
- [MUST] UI components MUST NOT import from `store/`, `queries/`, or business `hooks/`

### Step 2: Implement Component

#### UI Component Pattern

```typescript
// components/ui/StatusBadge/StatusBadge.tsx
import Chip from '@mui/material/Chip';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending';
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const colorMap = {
    active: 'success',
    inactive: 'error',
    pending: 'warning',
  } as const;

  return (
    <Chip
      label={status}
      color={colorMap[status]}
      size={size}
    />
  );
}
```

Rules:
- [MUST] Define props with `interface` (not `type`), destructure in parameters
- [MUST] Use `React.ReactNode` for `children` type
- [MUST NOT] Import from `store/`, `queries/`, or business custom hooks
- [SHOULD] Provide default values for optional props
- [MUST NOT] Exceed 300 lines per component file

#### Feature Component Pattern

```typescript
// components/feature/OrderList/OrderList.tsx
'use client';

import { DataTable } from '@/components/ui/DataTable';
import { useOrdersQuery } from '@/queries/useOrdersQuery';
import { useOrderStore } from '@/store/slices/orderSlice';

export function OrderList() {
  const { filter, setFilter } = useOrderStore();
  const { data, isPending } = useOrdersQuery(filter);

  return (
    <DataTable
      columns={ORDER_COLUMNS}
      data={data?.orders ?? []}
      isLoading={isPending}
      onRowClick={(row) => setFilter({ ...filter, selectedId: row.id })}
    />
  );
}
```

Rules:
- [MUST] Add `'use client'` when using hooks, event handlers, or browser APIs
- [MUST] Compose UI components; keep business logic here
- [MUST NOT] Use `useEffect` for data fetching; use TanStack Query instead
- [MUST NOT] Drill props more than 3 levels; use Zustand store or Context

#### Page Component Pattern

```typescript
// app/(dashboard)/orders/page.tsx
import { OrderList } from '@/components/feature/OrderList';
import { OrderFilter } from '@/components/feature/OrderFilter';
import { PageLayout } from '@/components/layout/PageLayout';

export default function OrdersPage() {
  return (
    <PageLayout title="Order Management">
      <OrderFilter />
      <OrderList />
    </PageLayout>
  );
}
```

Rules:
- [MUST] Server Component by default (no `'use client'` unless needed)
- [MUST] Only compose Feature/UI/Layout components; no business logic
- [MUST NOT] Write business logic directly in `page.tsx`
- [MUST] Place only route files in `app/` directory (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`)

### Step 3: Apply Styling

Follow the styling priority order strictly:

1. **Theme overrides** - For global, all-instance styles
2. **`styled()`** - For reusable styled components
3. **`sx` prop** - For one-off layout/spacing adjustments

#### MUI Setup Requirements

- [MUST] Use `AppRouterCacheProvider` from `@mui/material-nextjs/v15-appRouter`
- [MUST] Set `cssVariables: true` in `createTheme`
- [MUST] Use `next/font` and connect via CSS variable to MUI theme

#### styled() Pattern

```typescript
import { styled } from '@mui/material/styles';
import Card from '@mui/material/Card';

const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  transition: 'box-shadow 0.2s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
}));
```

#### Styling Rules

| Rule | Detail |
|------|--------|
| MUST | Use `theme.palette` for ALL colors; no hex hardcoding |
| MUST | Use `theme.spacing()` or spacing shorthand for spacing; no magic px values |
| MUST | Use MUI breakpoints (`sx={{ p: { xs: 2, md: 3 } }}`) for responsive design |
| MUST NOT | Use inline `style={{}}` attribute |
| MUST NOT | Use `!important` |
| MUST NOT | Hardcode media query px values; use `theme.breakpoints` |
| SHOULD NOT | Use raw HTML `<div>`, `<span>` for layout; use `Box`, `Stack`, `Grid` |
| SHOULD | Use `colorSchemes` for dark/light mode support |

### Step 4: Implement Forms (if applicable)

- [MUST] Use React Hook Form + Zod (mandatory combo)
- [MUST] Extract form types with `z.infer<typeof schema>` (not manual interfaces)
- [MUST] Wrap MUI components with `Controller` (not `register` directly)
- [MUST] Set `zodResolver` and `mode: 'onBlur'` in `useForm`
- [MUST] Perform client + server dual validation using the same Zod schema

#### Form Pattern

```typescript
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, Box, Alert } from '@mui/material';

const ContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
});

type ContactFormData = z.infer<typeof ContactSchema>;

export function ContactForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactSchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = async (data: ContactFormData) => {
    await submitContact(data);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Name"
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
            margin="normal"
          />
        )}
      />
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Email"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
            margin="normal"
          />
        )}
      />
      <Button type="submit" variant="contained" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </Box>
  );
}
```

#### Server-Side Validation Pattern

```typescript
// actions/contact.ts
'use server';

import { ContactSchema } from '@/schemas/contact';
import { revalidatePath } from 'next/cache';

export async function submitContact(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const result = ContactSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }
  // persist data...
  revalidatePath('/contacts');
  return { success: true, errors: null };
}
```

#### Form Rules

| Rule | Detail |
|------|--------|
| MUST | React Hook Form + Zod for all forms |
| MUST | `z.infer<typeof schema>` for form data types |
| MUST | `Controller` wrapper for MUI components |
| MUST | `zodResolver` + `mode: 'onBlur'` |
| MUST | Client + server dual validation (same Zod schema) |
| MUST | Field-level errors via `error`/`helperText` props |
| MUST NOT | Client-only validation for security-sensitive data |
| MUST NOT | Call API on every `onChange`; use debounce or `onBlur` |
| SHOULD | Shared common schemas in `lib/schemas/common.ts` |
| SHOULD | `useFieldArray` for dynamic field lists |
| SHOULD | `discriminatedUnion` for conditional field validation |

### Step 5: Write Tests

Follow the test pyramid distribution:

| Level | Tool | Target | Ratio |
|-------|------|--------|-------|
| Unit | Jest | Utility functions, custom hooks, pure logic | 40% |
| Component | Storybook + Interaction Testing | Individual UI component rendering and interaction | 25% |
| Integration | React Testing Library | Multi-component composition, form flows | 20% |
| E2E | Playwright | Critical user scenarios (login, order creation) | 10% |
| Visual | Chromatic | UI style regression detection | 5% |

#### Storybook Story Pattern (CSF3)

```typescript
// components/ui/StatusBadge/StatusBadge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { StatusBadge } from './StatusBadge';

const meta = {
  title: 'Atoms/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['active', 'inactive', 'pending'],
      description: 'Badge status variant',
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: { status: 'active' },
};

export const Inactive: Story = {
  args: { status: 'inactive' },
};

export const WithInteraction: Story = {
  args: { status: 'active' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('active')).toBeInTheDocument();
  },
};
```

Rules:
- [MUST] Use CSF3 format with `Meta` and `StoryObj` types
- [MUST] Use `satisfies Meta<typeof Component>` for type safety
- [SHOULD] Add `play` functions for interactive components (Interaction Testing)
- [SHOULD] Add `tags: ['autodocs']` for public UI components
- [SHOULD] Follow Atomic Design hierarchy for `title` (`Atoms/`, `Molecules/`, `Organisms/`)

#### Jest + RTL Test Pattern

```typescript
// components/ui/StatusBadge/StatusBadge.test.tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/theme';
import { StatusBadge } from './StatusBadge';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('StatusBadge', () => {
  it('renders the status label', () => {
    renderWithTheme(<StatusBadge status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('applies success color for active status', () => {
    renderWithTheme(<StatusBadge status="active" />);
    const chip = screen.getByText('active').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorSuccess');
  });
});
```

#### Testing Rules

| Rule | Detail |
|------|--------|
| MUST | Prefer `getByRole`, `getByLabelText`, `getByText` over `getByTestId` |
| MUST | Use MSW for API mocks in integration tests |
| MUST | Use `waitFor` for async assertions |
| MUST | Each test is independent (no shared mutable state) |
| MUST | Test file colocated with component (`Component.test.tsx`) |
| MUST NOT | Test implementation details (no `querySelector`, no internal state checks) |
| MUST NOT | Assert async elements without `waitFor` |
| SHOULD | Use `renderHook` for custom hook unit tests |
| SHOULD NOT | Use snapshot tests for frequently changing components |

## Quick Reference: MUST / MUST NOT

### Architecture
- [MUST] 4 component types: UI (props-only, Storybook), Feature (business logic), Layout (structure), Page (composition)
- [MUST] Dependency: Page -> Feature -> UI (unidirectional); no reverse imports
- [MUST] UI components: props only, no store/queries; code colocation; `@/` imports
- [MUST NOT] Business logic in `page.tsx`; exceed 300 lines; prop drill 3+ levels; flat-list `components/`

### Next.js
- [MUST] Server Component default; `'use client'` at leaf nodes only
- [MUST] `next/image` for images (no `<img>`); `next/font` for fonts (no CDN); `priority` on LCP
- [MUST] `error.tsx` needs `'use client'`; explicit `cache` option on server fetch
- [MUST NOT] `useState`/`useEffect` in Server Components; secrets via `NEXT_PUBLIC_`

### Styling (MUI v6)
- [MUST] `AppRouterCacheProvider` + `cssVariables: true`; priority: Theme > `styled()` > `sx`
- [MUST] `theme.palette` for ALL colors; `theme.spacing()` for spacing; MUI breakpoints for responsive
- [MUST NOT] Inline `style={{}}`; `!important`; hex hardcoding; magic px values

### Forms
- [MUST] RHF + Zod; `z.infer<typeof schema>`; `Controller` for MUI; `zodResolver` + `mode: 'onBlur'`
- [MUST] Client + server dual validation (same schema)
- [MUST NOT] Client-only validation as security measure

### Testing
- [MUST] Pyramid: Unit 40%, Component 25%, Integration 20%, E2E 10%, Visual 5%
- [MUST] CSF3 + `play` functions; `getByRole` preferred; MSW for API mocks; colocate files
- [MUST NOT] Test implementation details; skip `waitFor` for async

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
