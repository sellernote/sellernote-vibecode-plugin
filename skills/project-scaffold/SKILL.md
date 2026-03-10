---
name: project-scaffold
description: Scaffold new NestJS modules (TypeORM or Prisma) or frontend features (React Router 7 Framework Mode or Next.js 15 App Router) with Sellernote convention-compliant file structure. Use when creating new feature modules, pages, or project scaffolding. Triggers on tasks involving scaffolding, boilerplate generation, module creation, feature structure setup, or initial file structure. Also use when asked to "새 모듈 만들어줘", "scaffold해줘", "새 페이지 구조 잡아줘", "모듈 구조 생성", "보일러플레이트 만들어줘", "새 기능 뼈대 만들어줘", "create new module", "scaffold a feature", "generate module structure", "set up new page", "create feature scaffold", or any task requiring creation of multiple convention-compliant starter files.
---

# Project Scaffold

Generate convention-compliant file structures for new NestJS modules or frontend features (React Router 7 / Next.js 15).

## Convention Loading

Before starting, Read the relevant reference files from `references/` within this skill directory based on scaffold target:

### For NestJS Module Scaffold
1. **Always read first**:
   - `references/BACKEND_CONVENTION.md` - 3-layer architecture, naming rules
   - `references/BACKEND_ARCHITECTURE_CONVENTION.md` - Layer responsibilities, dependency direction
   - `references/NESTJS_CONVENTION.md` - Module structure, DI, decorators, `@sellernote/sellernote-nestjs-api-property`
2. **Read when relevant**:
   - `references/API_SPEC_CONVENTION.md` - When scaffold includes API endpoints
   - `references/SECURITY_CONVENTION.md` - When scaffold needs auth/guards
   - `references/TYPEORM_CONVENTION.md` - When scaffold uses TypeORM (default)
   - `references/PRISMA_CONVENTION.md` - When scaffold uses Prisma instead of TypeORM
   - `references/DATABASE_CONVENTION.md` - When scaffold includes DB modeling

### For React Router 7 Feature Scaffold (Primary Frontend)
1. **Always read first**:
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - Feature directory structure, component classification, data flow
   - `references/FRONTEND_CONVENTION.md` - Tech stack, naming, import rules, no barrel files
   - `references/REACT_ROUTER_CONVENTION.md` - React Router 7 Framework Mode, `ssr: false`, code-based routes
2. **Read when relevant**:
   - `references/REACT_CONVENTION.md` - React 19 patterns, hooks, performance
   - `references/STATE_CONVENTION.md` - TanStack Query, nuqs, Zustand (last resort)
   - `references/STYLING_CONVENTION.md` - Tailwind CSS v4, `cn()`, `cva()`
   - `references/FORM_CONVENTION.md` - React Hook Form + Zod
   - `references/API_CLIENT_CONVENTION.md` - API client setup, auth token handling
   - `references/API_CLIENT_AXIOS_CONVENTION.md` - Axios interceptors

### For Next.js 15 Page Scaffold (Alternative Frontend)
1. **Always read first**:
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - Component types, dependency direction
   - `references/NEXTJS_CONVENTION.md` - App Router, Server/Client Components
2. **Read when relevant**: Same as React Router 7 section above

### Common (always read)
- `references/COMMON_CONVENTION.md` - Naming, error codes, git conventions
- `references/TYPESCRIPT_CONVENTION.md` - TS strict mode, imports, no `any`

## Workflow

### Step 1: Determine Scaffold Type

Ask or infer from context:

| Scaffold Type | When to Use |
|---------------|-------------|
| **NestJS Module** | Backend feature module (API endpoints, business logic, data access) |
| **React Router 7 Feature** | Frontend feature with components, data fetching, route modules (primary) |
| **Next.js Page** | Frontend page for Next.js App Router projects (alternative) |
| **Full-stack** | Both backend module and frontend feature for one domain |

Identify the feature name (e.g., `order`, `product`, `shipment`) and confirm with the user.

### Step 2: NestJS Module Scaffold

Generate the following 11 files under `src/modules/{feature}/`:

> Directory structure uses subdirectories: `controllers/`, `services/`, `repositories/`, `interfaces/`, `entities/`, `dto/`, `mappers/`.

#### 2-1. Domain Model Interface

```typescript
// src/modules/{feature}/interfaces/{feature}.model.interface.ts
export interface I{Feature}Model {
  id: string;
  _no: number;
  // TODO: Add domain-specific fields here
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

#### 2-2. Entity

```typescript
// src/modules/{feature}/entities/{feature}.entity.ts
import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@/common/entities/base.entity';
import { I{Feature}Model } from '../interfaces/{feature}.model.interface';

@Entity('{feature}')
export class {Feature}Entity extends BaseEntity implements I{Feature}Model {
  // TODO: Add @Column() definitions here
  // Money fields: use @Column({ type: 'decimal', precision: 20, scale: 4, transformer: DecimalTransformer })
  // Enum fields: use @Column({ type: 'varchar', length: 50 })
  // Relations: use Relation<T> type wrapper
}
```

#### 2-3. Create DTO

```typescript
// src/modules/{feature}/dto/create-{feature}.dto.ts
import {
  SellernoteApiString,
} from '@sellernote/sellernote-nestjs-api-property';

export class Create{Feature}Dto {
  // TODO: Add @SellernoteApi* decorated fields
  // [MUST] Use @SellernoteApiDecimal for money fields (type: string)
  // [MUST] Use @SellernoteApiString for text fields
  // [MUST] Use @SellernoteApiNumber for numeric fields
}
```

#### 2-4. Update DTO

```typescript
// src/modules/{feature}/dto/update-{feature}.dto.ts
import { PartialType } from '@nestjs/swagger';

import { Create{Feature}Dto } from './create-{feature}.dto';

export class Update{Feature}Dto extends PartialType(Create{Feature}Dto) {}
```

#### 2-5. Response DTO

```typescript
// src/modules/{feature}/dto/{feature}-response.dto.ts
import {
  SellernoteApiString,
  SellernoteApiNumber,
} from '@sellernote/sellernote-nestjs-api-property';

export class {Feature}ResponseDto {
  @SellernoteApiString({ description: 'UUID', isRequired: true })
  id: string;

  // TODO: Add response fields with @SellernoteApi* decorators
}
```

#### 2-6. List Query DTO

```typescript
// src/modules/{feature}/dto/get-{feature}-list-query.dto.ts
import {
  SellernoteApiNumber,
} from '@sellernote/sellernote-nestjs-api-property';

export class Get{Feature}ListQueryDto {
  @SellernoteApiNumber({ description: '페이지 번호', min: 1, isRequired: false })
  page?: number;

  @SellernoteApiNumber({ description: '페이지당 항목 수', min: 1, max: 100, isRequired: false })
  limit?: number;

  // TODO: Add filter fields
}
```

#### 2-7. Mapper

```typescript
// src/modules/{feature}/mappers/{feature}.mapper.ts
import type { I{Feature}Model } from '../interfaces/{feature}.model.interface';
import { {Feature}ResponseDto } from '../dto/{feature}-response.dto';

export class {Feature}Mapper {
  static toResponseDto(model: I{Feature}Model): {Feature}ResponseDto {
    const dto = new {Feature}ResponseDto();
    dto.id = model.id;
    // TODO: Map remaining fields
    return dto;
  }
}
```

#### 2-8. Repository

```typescript
// src/modules/{feature}/repositories/{feature}.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { {Feature}Entity } from '../entities/{feature}.entity';

@Injectable()
export class {Feature}Repository {
  constructor(
    @InjectRepository({Feature}Entity)
    private readonly repository: Repository<{Feature}Entity>,
  ) {}

  // TODO: Add data access methods
  // [MUST] Use parameterized queries (never string interpolation)
}
```

#### 2-9. Service

```typescript
// src/modules/{feature}/services/{feature}.service.ts
import { Injectable } from '@nestjs/common';

import { {Feature}Repository } from '../repositories/{feature}.repository';

@Injectable()
export class {Feature}Service {
  constructor(private readonly {feature}Repository: {Feature}Repository) {}

  // TODO: Add business logic methods
  // [MUST] Use @Transactional() for multi-step DB operations
  // [MUST] Use big.js for money calculations
}
```

#### 2-10. Controller

```typescript
// src/modules/{feature}/controllers/{feature}.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { {Feature}Service } from '../services/{feature}.service';
import { Create{Feature}Dto } from '../dto/create-{feature}.dto';
import { Update{Feature}Dto } from '../dto/update-{feature}.dto';
import { Get{Feature}ListQueryDto } from '../dto/get-{feature}-list-query.dto';

@ApiTags('{feature}')
@Controller('{feature}')
export class {Feature}Controller {
  constructor(private readonly {feature}Service: {Feature}Service) {}

  // TODO: Add endpoint methods
  // [MUST] Add @ApiOperation and @ApiResponse to every endpoint
  // [MUST] Delegate all logic to Service immediately
}
```

#### 2-11. Module

```typescript
// src/modules/{feature}/{feature}.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { {Feature}Entity } from './entities/{feature}.entity';
import { {Feature}Controller } from './controllers/{feature}.controller';
import { {Feature}Service } from './services/{feature}.service';
import { {Feature}Repository } from './repositories/{feature}.repository';

@Module({
  imports: [TypeOrmModule.forFeature([{Feature}Entity])],
  controllers: [{Feature}Controller],
  providers: [{Feature}Service, {Feature}Repository],
  exports: [{Feature}Service],
})
export class {Feature}Module {}
```

### Step 3: React Router 7 Feature Scaffold (Primary Frontend)

Generate the following files under `app/features/{feature}/`:

> React Router 7 Framework Mode with `ssr: false`. Uses `features/{domain}/` co-location pattern. No barrel files (`index.ts`).

#### 3-1. Query Options

```typescript
// app/features/{feature}/api/query-options.ts
import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { {Feature}, {Feature}ListResponse } from '../types/{feature}-types';

export const {feature}QueryOptions = {
  list: (params?: Record<string, unknown>) =>
    queryOptions({
      queryKey: ['{feature}', 'list', params],
      queryFn: () => apiClient.get<{Feature}ListResponse>('/api/{feature}', { params }),
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: ['{feature}', 'detail', id],
      queryFn: () => apiClient.get<{Feature}>(`/api/{feature}/${id}`),
    }),
};
```

#### 3-2. Query Hooks (Endpoint Hook Files)

```typescript
// app/features/{feature}/api/use-{feature}-list.ts
import { useSuspenseQuery } from '@tanstack/react-query';

import { {feature}QueryOptions } from './query-options';

export function use{Feature}List(params?: Record<string, unknown>) {
  return useSuspenseQuery({feature}QueryOptions.list(params));
}
```

```typescript
// app/features/{feature}/api/use-{feature}-detail.ts
import { useSuspenseQuery } from '@tanstack/react-query';

import { {feature}QueryOptions } from './query-options';

export function use{Feature}Detail(id: string) {
  return useSuspenseQuery({feature}QueryOptions.detail(id));
}
```

```typescript
// app/features/{feature}/api/use-create-{feature}.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export function useCreate{Feature}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post('/api/{feature}', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{feature}'] });
    },
  });
}
```

#### 3-3. Feature Components

```typescript
// app/features/{feature}/components/{Feature}List.tsx
import { use{Feature}List } from '../api/use-{feature}-list';

export function {Feature}List() {
  const { data } = use{Feature}List();

  // TODO: Implement list UI
  return <div>TODO: {Feature} List</div>;
}
```

```typescript
// app/features/{feature}/components/{Feature}Detail.tsx
import { use{Feature}Detail } from '../api/use-{feature}-detail';

interface {Feature}DetailProps {
  id: string;
}

export function {Feature}Detail({ id }: {Feature}DetailProps) {
  const { data } = use{Feature}Detail(id);

  // TODO: Implement detail UI
  return <div>TODO: {Feature} Detail</div>;
}
```

#### 3-4. Types

```typescript
// app/features/{feature}/types/{feature}-types.ts
export interface {Feature} {
  id: string;
  // TODO: Add type fields matching API response
  createdAt: string;
  updatedAt: string;
}

export interface {Feature}ListResponse {
  list: {Feature}[];
  total: number;
}
```

#### 3-5. Route Modules

```typescript
// app/routes/{feature}/list.tsx
import { Suspense } from 'react';

import { {Feature}List } from '@/features/{feature}/components/{Feature}List';

export default function {Feature}ListRoute() {
  return (
    <Suspense fallback={<div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />}>
      <{Feature}List />
    </Suspense>
  );
}
```

```typescript
// app/routes/{feature}/detail.tsx
import { Suspense } from 'react';
import { useParams } from 'react-router';

import { {Feature}Detail } from '@/features/{feature}/components/{Feature}Detail';

export default function {Feature}DetailRoute() {
  const { id } = useParams<{ id: string }>();

  return (
    <Suspense fallback={<div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />}>
      <{Feature}Detail id={id!} />
    </Suspense>
  );
}
```

#### 3-6. Route Registration

```typescript
// Add to app/routes.ts
import { type RouteConfig, route } from '@react-router/dev/routes';

export default [
  // ... existing routes
  route('{feature}', './routes/{feature}/list.tsx'),
  route('{feature}/:id', './routes/{feature}/detail.tsx'),
] satisfies RouteConfig;
```

### Step 3-Alt: Next.js 15 Page Scaffold (Alternative Frontend)

Use this scaffold when the project uses Next.js 15 App Router instead of React Router 7.

#### 3-Alt-1. Page (Server Component)

```typescript
// app/(group)/{feature}/page.tsx
import { {Feature}List } from '@/features/{feature}/components/{Feature}List';

export default function {Feature}Page() {
  return <{Feature}List />;
}
```

#### 3-Alt-2. Loading

```typescript
// app/(group)/{feature}/loading.tsx
export default function {Feature}Loading() {
  return (
    <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
  );
}
```

#### 3-Alt-3. Error

```typescript
// app/(group)/{feature}/error.tsx
'use client';

export default function {Feature}Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>An error occurred</h2>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
```

#### 3-Alt-4. Detail Page

```typescript
// app/(group)/{feature}/[id]/page.tsx
import { {Feature}Detail } from '@/features/{feature}/components/{Feature}Detail';

export default async function {Feature}DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <{Feature}Detail id={id} />;
}
```

> Feature components (`{Feature}List`, `{Feature}Detail`) and API layer (`query-options.ts`, endpoint hooks) follow the same `features/{domain}/` pattern as React Router 7 scaffold above.

### Step 4: Post-Scaffold Summary

After generating files, present:

1. **Created files list** with paths
2. **TODO markers** that need user attention (fields, business logic)
3. **Next steps**:
   - For NestJS: "Register `{Feature}Module` in `AppModule` imports"
   - For React Router 7: "Add routes to `app/routes.ts`"
   - For Next.js: "Add route to navigation/sidebar if needed"
4. **Recommended skills** for detailed implementation:
   - `nestjs-api-dev` for API endpoint details
   - `typeorm-dev` or `prisma-dev` for ORM work
   - `react-data-provider` or `nextjs-data-provider` for query hooks and data layer
   - `react-ui-dev` or `nextjs-ui-dev` for component UI implementation

## Key Rules Summary

| Rule | Detail |
|------|--------|
| MUST | Use `@sellernote/sellernote-nestjs-api-property` for all DTO decorators (never `@ApiProperty` directly) |
| MUST | Entity extends custom `BaseEntity` (UUID PK + `_no` BIGINT AUTO_INCREMENT) |
| MUST | Domain Model Interface (`I{Feature}Model`) in `interfaces/` directory |
| MUST | Mapper uses `I{Feature}Model` type, not Entity directly |
| MUST | Money fields as `string` type with `@SellernoteApiDecimal`; use `big.js` for calculations |
| MUST | Enum columns use `type: 'varchar'` (never `type: 'enum'`) |
| MUST | NestJS module uses subdirectories: `controllers/`, `services/`, `repositories/` |
| MUST | Frontend uses `features/{domain}/` co-location with `api/`, `components/`, `types/` |
| MUST | `query-options.ts` centralizes `queryKey` + `queryFn`; endpoint hooks in separate files |
| MUST | `useSuspenseQuery` as default; `useQuery` only when `enabled` option is needed |
| MUST | `@/` absolute import paths; no barrel files (`index.ts`) |
| MUST | Route modules are composition-only (no business logic) |
| MUST | State priority: TanStack Query (server) → nuqs (URL) → useState (local) → Zustand (last resort) |
| MUST | File naming: PascalCase components, kebab-case hooks/utils/directories |
| MUST | TODO markers at every point requiring user customization |

## Cross-Skill References

- **NestJS API implementation details**: Use the `nestjs-api-dev` skill
- **Entity/TypeORM work**: Use the `typeorm-dev` skill
- **Entity/Prisma work**: Use the `prisma-dev` skill
- **React Router 7 data layer**: Use the `react-data-provider` skill
- **React Router 7 UI components**: Use the `react-ui-dev` skill
- **React Router 7 feature orchestration**: Use the `react-dev-orchestration` skill
- **Next.js data layer**: Use the `nextjs-data-provider` skill
- **Next.js UI components**: Use the `nextjs-ui-dev` skill
- **Next.js feature orchestration**: Use the `nextjs-dev-orchestration` skill
