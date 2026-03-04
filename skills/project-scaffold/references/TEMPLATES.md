# Frontend Template Collection

> A collection of standard boilerplates that AI agents copy and use when creating new features.
> All templates follow the rules of ARCHITECTURE_CONVENTION.md and STATE_CONVENTION.md.
>
> **Usage**: After copying a template, replace the placeholders `{domain}` (kebab-case), `{Domain}`/`{Entity}`/`{Component}` (PascalCase), `{entity}`/`{component}` (kebab-case) with actual names.

---

## 1. Creating a New Feature Folder

The complete directory structure when adding a new domain feature.

```text
app/features/{domain}/
├── components/              # [Required] Feature components
│   └── {entity}-list/
│       └── {Entity}List.tsx
├── api/                     # [Required] queryKey + queryFn (queryOptions factory pattern)
│   ├── query-keys.ts
│   ├── use-{entity}s-query.ts
│   └── use-{entity}-query.ts
├── transforms/              # [Required] Data transformation (Transform layer)
│   └── to-{entity}-list-item.ts       # Pure transform function
├── hooks/                   # [Optional] Feature-specific hooks (including orchestration hooks)
│   └── use-adapted-{entity}-dashboard.ts  # Multi-source composition hook (create when needed)
├── store/                   # [Optional] Feature-specific Zustand store (create when needed)
├── schemas/                 # [Optional] Feature-specific Zod schemas (create when needed)
└── types/                   # [Optional] Feature-specific types (create when needed)
```

---

## 2. New Query Hook (useXxxQuery)

### query-keys.ts (Full Factory Pattern)

Define fetch functions and `queryOptions` factories together in `query-keys.ts`. Do not include transformation logic (such as select).

```typescript
// features/{domain}/api/query-keys.ts
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { {Entity}, {Entity}Filters, PaginatedResponse } from '@/types/{domain}.types';

const fetch{Entity}s = (filters: {Entity}Filters): Promise<PaginatedResponse<{Entity}>> =>
  apiClient.get('/{domain}s', { params: filters });

const fetch{Entity} = (id: string): Promise<{Entity}> =>
  apiClient.get(`/{domain}s/${id}`);

export const {domain}Keys = {
  all: ['{domain}s'] as const,
  list: (filters: {Entity}Filters) => queryOptions({
    queryKey: [...{domain}Keys.all, 'list', filters] as const,
    queryFn: () => fetch{Entity}s(filters),
  }),
  detail: (id: string) => queryOptions({
    queryKey: [...{domain}Keys.all, 'detail', id] as const,
    queryFn: () => fetch{Entity}(id),
    enabled: !!id,
  }),
};
```

### use-{entity}s-query.ts (List)

```typescript
// features/{domain}/api/use-{entity}s-query.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import { {domain}Keys } from './query-keys';
import type { {Entity}Filters } from '@/types/{domain}.types';

export function use{Entity}sQuery(filters: {Entity}Filters) {
  return useSuspenseQuery({domain}Keys.list(filters));
}
```

### use-{entity}-query.ts (Detail)

```typescript
// features/{domain}/api/use-{entity}-query.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import { {domain}Keys } from './query-keys';

export function use{Entity}Query(id: string) {
  return useSuspenseQuery({domain}Keys.detail(id));
}
```

> **Note**: `useSuspenseQuery` is the default (SHOULD). Use `useQuery` + `enabled` option only when conditional fetching is needed (MAY).

---

## 3. New Transform (Data Transformation)

### Pure Transform Function — to-{entity}-list-item.ts

A pure function that transforms data from a single query to fit the UI. Pass it to the `select` option in a custom hook.

```typescript
// features/{domain}/transforms/to-{entity}-list-item.ts
import type { {Entity}, PaginatedResponse } from '@/types/{domain}.types';

export interface {Entity}ListItem {
  id: string;
  displayName: string;
  statusLabel: string;
}

export const to{Entity}ListItem = (data: PaginatedResponse<{Entity}>): {Entity}ListItem[] =>
  data.items.map((item) => ({
    id: item.id,
    displayName: item.name,
    statusLabel: {ENTITY}_STATUS_LABELS[item.status],
  }));
```

```typescript
// features/{domain}/api/use-{entity}s-query.ts — Pass transform function via select
import { useSuspenseQuery } from '@tanstack/react-query';
import { {domain}Keys } from './query-keys';
import { to{Entity}ListItem } from '@/features/{domain}/transforms/to-{entity}-list-item';
import type { {Entity}Filters } from '@/types/{domain}.types';

export function use{Entity}ListItemsQuery(filters: {Entity}Filters) {
  return useSuspenseQuery({
    ...{domain}Keys.list(filters),
    select: to{Entity}ListItem,
  });
}
```

### Orchestration Hook — use-adapted-{entity}-dashboard.ts

When composing 2 or more data sources, place pure transform functions in `transforms/` and composition hooks in `hooks/` with the `use-adapted-xxx.ts` naming convention.

```typescript
// features/{domain}/transforms/to-{entity}-dashboard.ts — Pure transform function
import type { {Entity}, {Entity}Stats } from '@/types/{domain}.types';

export function to{Entity}Dashboard(
  items: {Entity}[],
  stats: {Entity}Stats,
) {
  return {
    totalCount: items.length,
    totalRevenue: stats.totalRevenue,
    pendingCount: items.filter((item) => item.status === 'pending').length,
  };
}
```

```typescript
// features/{domain}/hooks/use-adapted-{entity}-dashboard.ts — Orchestration hook
import { use{Entity}sQuery } from '@/features/{domain}/api/use-{entity}s-query';
import { use{Entity}StatsQuery } from '@/features/{domain}/api/use-{entity}-stats-query';
import { to{Entity}Dashboard } from '@/features/{domain}/transforms/to-{entity}-dashboard';
import type { {Entity}Filters } from '@/types/{domain}.types';

export function useAdapted{Entity}Dashboard(filters: {Entity}Filters) {
  const { data: items } = use{Entity}sQuery(filters);
  const { data: stats } = use{Entity}StatsQuery();

  const dashboard = to{Entity}Dashboard(items?.items ?? [], stats!);

  return { items: items?.items ?? [], dashboard };
}
```

> **Note**: Pure transform functions (`to-xxx.ts`) can be unit tested without React. Orchestration hooks (`use-adapted-xxx.ts`) are integration tested with `renderHook`.

---

## 4. New Mutation Hook (useXxxMutation)

```typescript
// features/{domain}/api/use-create-{entity}-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { {domain}Keys } from './query-keys';
import type { Create{Entity}Dto, {Entity} } from '@/types/{domain}.types';

export function useCreate{Entity}Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create{Entity}Dto) =>
      apiClient.post<{Entity}>('/{domain}s', data),
    meta: { successMessage: '{Entity}이(가) 생성되었습니다.' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {domain}Keys.all });
    },
  });
}
```

```typescript
// features/{domain}/api/use-update-{entity}-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { {domain}Keys } from './query-keys';
import type { Update{Entity}Dto, {Entity} } from '@/types/{domain}.types';

export function useUpdate{Entity}Mutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Update{Entity}Dto) =>
      apiClient.put<{Entity}>(`/{domain}s/${id}`, data),
    meta: { successMessage: '{Entity}이(가) 수정되었습니다.' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {domain}Keys.all });
    },
  });
}
```

```typescript
// features/{domain}/api/use-delete-{entity}-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { {domain}Keys } from './query-keys';

export function useDelete{Entity}Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/{domain}s/${id}`),
    meta: { successMessage: '{Entity}이(가) 삭제되었습니다.' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {domain}Keys.all });
    },
  });
}
```

---

## 5. Adding a New Route

### Modifying routes.ts

```typescript
// app/routes.ts — Add to existing array
route("{domain}s", "./routes/dashboard/{domain}s.tsx"),
route("{domain}s/:id", "./routes/dashboard/{domain}-detail.tsx"),
```

### Route Module (List)

```typescript
// app/routes/dashboard/{domain}s.tsx
import type { Route } from "./+types/{domain}s";
import { {Entity}List } from "@/features/{domain}/components/{entity}-list";
import { PageLayout } from "@/components/layout/page-layout";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "{Entity} 관리" },
    { name: "description", content: "{Entity} 목록을 관리합니다" },
  ];
}

export default function {Entity}sPage() {
  return (
    <PageLayout title="{Entity} 관리">
      <{Entity}List />
    </PageLayout>
  );
}

export function ErrorBoundary() {
  return (
    <div className="flex flex-col items-center gap-400 p-600">
      <h2 className="text-heading-md text-text-1">문제가 발생했습니다</h2>
      <p className="text-body-md text-text-3">잠시 후 다시 시도해주세요.</p>
    </div>
  );
}
```

### Route Module (Detail)

```typescript
// app/routes/dashboard/{domain}-detail.tsx
import type { Route } from "./+types/{domain}-detail";
import { useParams } from "react-router";
import { {Entity}Detail } from "@/features/{domain}/components/{entity}-detail";
import { PageLayout } from "@/components/layout/page-layout";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `{Entity} #${params.id}` }];
}

export default function {Entity}DetailPage() {
  const { id } = useParams();
  return (
    <PageLayout title="{Entity} 상세">
      <{Entity}Detail {domain}Id={id!} />
    </PageLayout>
  );
}
```

---

## 6. New Form (React Hook Form + Zod + DS)

### Zod Schema

```typescript
// features/{domain}/schemas/{domain}-create-schema.ts
import { z } from 'zod';

export const {domain}CreateSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(100, '100자 이내로 입력해주세요'),
  description: z.string().max(500).optional(),
  status: z.enum(['draft', 'active', 'inactive']).default('draft'),
});

export type {Entity}CreateFormValues = z.infer<typeof {domain}CreateSchema>;
```

### Form Component

```typescript
// features/{domain}/components/{entity}-create-form/{Entity}CreateForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { {domain}CreateSchema, type {Entity}CreateFormValues } from '@/features/{domain}/schemas/{domain}-create-schema';
import { useCreate{Entity}Mutation } from '@/features/{domain}/api/use-create-{entity}-mutation';

export function {Entity}CreateForm() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<{Entity}CreateFormValues>({
    resolver: zodResolver({domain}CreateSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      description: '',
      status: 'draft',
    },
  });

  const createMutation = useCreate{Entity}Mutation();

  const onSubmit = (data: {Entity}CreateFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-gray-700">이름 <span aria-hidden="true">*</span></label>
            <input
              id="name"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="이름을 입력하세요"
              {...field}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && <p id="name-error" className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
        )}
      />

      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-medium text-gray-700">설명</label>
            <input
              id="description"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="설명을 입력하세요 (선택)"
              {...field}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "description-error" : undefined}
            />
            {errors.description && <p id="description-error" className="text-xs text-red-600">{errors.description.message}</p>}
          </div>
        )}
      />

      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-sm font-medium text-gray-700">상태</label>
            <select
              id="status"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              {...field}
              aria-invalid={!!errors.status}
            >
              <option value="draft">초안</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
            {errors.status && <p className="text-xs text-red-600">{errors.status.message}</p>}
          </div>
        )}
      />

      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={createMutation.isPending || isSubmitting}
      >
        생성
      </button>
    </form>
  );
}
```

---

## 7. New Feature Component

```typescript
// features/{domain}/components/{entity}-list/{Entity}List.tsx
import { Suspense } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { use{Entity}sQuery } from '@/features/{domain}/api/use-{entity}s-query';
import { parseAsInteger, useQueryStates } from 'nuqs';

const searchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  size: parseAsInteger.withDefault(20),
};

function {Entity}ListContent() {
  const [{ page, size }] = useQueryStates(searchParamsParsers);
  const { data } = use{Entity}sQuery({ page, size });

  return (
    <DataTable
      columns={{ENTITY}_COLUMNS}
      data={data?.items ?? []}
    />
  );
}

export function {Entity}List() {
  return (
    <Suspense fallback={<{Entity}ListSkeleton />}>
      <{Entity}ListContent />
    </Suspense>
  );
}
```

---

## 8. New UI Component (with Storybook)

### Component

```typescript
// components/ui/{component}/{Component}.tsx
import { cn } from '@/lib/cn';

export interface {Component}Props {
  variant?: 'default' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function {Component}({ variant = 'default', size = 'md', children }: {Component}Props) {
  return (
    <div className={cn('rounded-lg', variantStyles[variant], sizeStyles[size])}>
      {children}
    </div>
  );
}

const variantStyles = {
  default: 'bg-white border border-gray-200',
  accent: 'bg-blue-50 border border-blue-500',
} as const;

const sizeStyles = {
  sm: 'p-2 text-xs',
  md: 'p-4 text-sm',
  lg: 'p-6 text-base',
} as const;
```

### Storybook

```typescript
// components/ui/{component}/{Component}.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { {Component} } from './{Component}';

const meta = {
  title: 'UI/{Component}',
  component: {Component},
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'accent'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof {Component}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '기본 컴포넌트',
  },
};

export const Accent: Story = {
  args: {
    variant: 'accent',
    children: '강조 컴포넌트',
  },
};
```

### Test

```typescript
// components/ui/{component}/{Component}.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { {Component} } from './{Component}';

describe('{Component}', () => {
  it('renders children', () => {
    render(<{Component}>테스트 내용</{Component}>);
    expect(screen.getByText('테스트 내용')).toBeInTheDocument();
  });
});
```