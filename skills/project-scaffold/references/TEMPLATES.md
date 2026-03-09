# Frontend Template Collection

> A collection of standard boilerplates that AI agents copy and use when creating new features.
> All templates follow the rules of ARCHITECTURE_CONVENTION.md and STATE_CONVENTION.md.
>
> **Usage**: Copy a template and replace the placeholders `{domain}` (kebab-case), `{Domain}`/`{Entity}`/`{Component}` (PascalCase), `{entity}`/`{component}` (kebab-case) with actual names.

---

## 1. Creating a New Feature Folder

The complete directory structure when adding a new domain feature.

```text
app/features/{domain}/
├── components/              # [Required] Feature components
│   └── {entity}-list/
│       └── {Entity}List.tsx
├── api/                     # [Required] queryOptions + TanStack Query hooks
│   ├── query-options.ts
│   ├── use-{entity}s-query.ts
│   ├── use-{entity}-query.ts
│   └── use-update-{entity}-mutation.ts
├── hooks/                   # [Optional] Feature-specific hooks (UI/permissions/form helpers)
├── store/                   # [Optional] Feature-specific Zustand store (create when needed)
├── schemas/                 # [Optional] Feature-specific Zod schemas (create when needed)
├── constants/               # [Optional] Feature-specific constants (create when needed)
├── types/                   # [Optional] Feature-specific form/view types (create when needed)
└── utils/                   # [Optional] Feature-specific pure utils/helpers (create when needed)
```

### Feature Common Module (`features/_common/{domain}`)

Domain-contextual code reused across two or more Features is placed in `features/_common/{domain}/`.

```text
app/features/_common/
└── {domain}/
    ├── components/          # [Recommended] Components shared across Features
    │   └── {component}/
    │       └── {Component}.tsx
    ├── api/                 # [Optional] API / TanStack Query hooks shared across Features
    ├── hooks/               # [Optional] Hooks shared across Features
    ├── schemas/             # [Optional] Zod schemas shared across Features
    ├── constants/           # [Optional] Constants shared across Features
    ├── types/               # [Optional] Types shared across Features
    └── utils/               # [Optional] Pure utils/helpers shared across Features
```

- Only place code with domain context in `features/_common/{domain}/`. (e.g., PO picker, settlement table)
- Domain-specific pure functions/helpers shared across multiple Features go in `features/_common/{domain}/utils/`.
- Domain-specific query hooks/options shared across multiple Features go in `features/_common/{domain}/api/`.
- Domain-agnostic general-purpose code goes in `components/`, `hooks/`, `lib/`, `types/`.
- `features/_common/{domain}/` does not import from `features/{domain}/`.

---

## 2. New Query Hook (useXxxQuery)

### query-options.ts (QueryOptions Factory Pattern)

Define query keys and `queryOptions` factories together in `query-options.ts`. Do not include `select` or screen-specific transformation logic.

```typescript
// features/{domain}/api/query-options.ts
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Get{Entity}Request,
  Get{Entity}Response,
  Get{Entity}sRequest,
  Get{Entity}sResponse,
} from '@/types/generated/{domain}.generated';

const fetch{Entity}s = (params: Get{Entity}sRequest): Promise<Get{Entity}sResponse> =>
  apiClient.get('/{domain}s', { params });

const fetch{Entity} = (params: Get{Entity}Request): Promise<Get{Entity}Response> =>
  apiClient.get(`/{domain}s/${params.id}`);

export const {domain}QueryOptions = {
  all: ['{domain}s'] as const,
  list: (params: Get{Entity}sRequest) =>
    queryOptions({
      queryKey: [...{domain}QueryOptions.all, 'list', params] as const,
      queryFn: () => fetch{Entity}s(params),
    }),
  detail: (params: Get{Entity}Request) =>
    queryOptions({
      queryKey: [...{domain}QueryOptions.all, 'detail', params] as const,
      queryFn: () => fetch{Entity}(params),
    }),
};
```

### use-{entity}s-query.ts (List)

```typescript
// features/{domain}/api/use-{entity}s-query.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import type { Get{Entity}sRequest, Get{Entity}sResponse } from '@/types/generated/{domain}.generated';
import { {domain}QueryOptions } from './query-options';

type {Entity}ListItem = {
  id: string;
  displayName: string;
  statusLabel: string;
};

const to{Entity}ListItem = (data: Get{Entity}sResponse): {Entity}ListItem[] =>
  data.items.map((item) => ({
    id: item.id,
    displayName: item.name,
    statusLabel: {ENTITY}_STATUS_LABELS[item.status],
  }));

export function use{Entity}sQuery(params: Get{Entity}sRequest) {
  return useSuspenseQuery({
    ...{domain}QueryOptions.list(params),
    select: to{Entity}ListItem,
  });
}
```

### use-{entity}-query.ts (Detail)

```typescript
// features/{domain}/api/use-{entity}-query.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import type { Get{Entity}Request } from '@/types/generated/{domain}.generated';
import { {domain}QueryOptions } from './query-options';

export function use{Entity}Query(params: Get{Entity}Request) {
  return useSuspenseQuery({domain}QueryOptions.detail(params));
}
```

> **Note**: `useSuspenseQuery` is the default (SHOULD). Use `useQuery` + `enabled` option only when conditional fetching is needed (MAY).

---

## 3. Endpoint-Specific Helper Colocation

If `transform`, `helper`, or screen-specific derived types are used by only one endpoint, keep them private within that endpoint hook file. Promote to `types/`, `constants/`, `lib/` only when reused in two or more places.

```typescript
// features/{domain}/api/use-{entity}s-query.ts
import { useQuery } from '@tanstack/react-query';
import type { Get{Entity}sRequest, Get{Entity}sResponse } from '@/types/generated/{domain}.generated';
import { {domain}QueryOptions } from './query-options';

type {Entity}Row = {
  id: string;
  displayName: string;
  badgeTone: 'default' | 'warning';
};

const to{Entity}Row = (data: Get{Entity}sResponse): {Entity}Row[] =>
  data.items.map((item) => ({
    id: item.id,
    displayName: item.name,
    badgeTone: item.status === 'pending' ? 'warning' : 'default',
  }));

export function use{Entity}RowsQuery(params: Get{Entity}sRequest) {
  return useQuery({
    ...{domain}QueryOptions.list(params),
    select: to{Entity}Row,
  });
}
```

---

## 4. New Mutation Hook (useXxxMutation)

```typescript
// features/{domain}/api/use-create-{entity}-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { {domain}QueryOptions } from './query-options';
import type { Create{Entity}Request, Create{Entity}Response } from '@/types/generated/{domain}.generated';

export function useCreate{Entity}Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create{Entity}Request) =>
      apiClient.post<Create{Entity}Response>('/{domain}s', data),
    meta: { successMessage: '{Entity}이(가) 생성되었습니다.' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {domain}QueryOptions.all });
    },
  });
}
```

```typescript
// features/{domain}/api/use-update-{entity}-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { {domain}QueryOptions } from './query-options';
import type { Update{Entity}Request, Update{Entity}Response } from '@/types/generated/{domain}.generated';

export function useUpdate{Entity}Mutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Update{Entity}Request) =>
      apiClient.put<Update{Entity}Response>(`/{domain}s/${id}`, data),
    meta: { successMessage: '{Entity}이(가) 수정되었습니다.' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {domain}QueryOptions.all });
    },
  });
}
```

```typescript
// features/{domain}/api/use-delete-{entity}-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { {domain}QueryOptions } from './query-options';

export function useDelete{Entity}Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/{domain}s/${id}`),
    meta: { successMessage: '{Entity}이(가) 삭제되었습니다.' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {domain}QueryOptions.all });
    },
  });
}
```

---

## 5. Adding a New Route

### Modifying routes.ts

```typescript
// app/routes.ts — Add to the existing array
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
    { title: "{Entity} Management" },
    { name: "description", content: "Manage the {Entity} list" },
  ];
}

export default function {Entity}sPage() {
  return (
    <PageLayout title="{Entity} Management">
      <{Entity}List />
    </PageLayout>
  );
}

export function ErrorBoundary() {
  return (
    <div className="flex flex-col items-center gap-400 p-600">
      <h2 className="text-heading-md text-text-1">Something went wrong</h2>
      <p className="text-body-md text-text-3">Please try again later.</p>
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
    <PageLayout title="{Entity} Detail">
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
            <label htmlFor="name" className="text-sm font-medium text-gray-700">Name <span aria-hidden="true">*</span></label>
            <input
              id="name"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Enter a name"
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
            <label htmlFor="description" className="text-sm font-medium text-gray-700">Description</label>
            <input
              id="description"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Enter a description (optional)"
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
            <label htmlFor="status" className="text-sm font-medium text-gray-700">Status</label>
            <select
              id="status"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              {...field}
              aria-invalid={!!errors.status}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
        Create
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

## 8. New UI Component

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

> **Note**: UI components currently do not generate Storybook files (`.stories.tsx`) or per-component test files (`.test.tsx`) in the base structure. These can be added after separate agreement if needed.