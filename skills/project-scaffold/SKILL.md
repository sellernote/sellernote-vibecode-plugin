---
name: project-scaffold
description: Scaffold new NestJS modules or Next.js pages with Sellernote convention-compliant file structure. Use when creating new feature modules, pages, or project scaffolding. Triggers on tasks involving scaffolding, boilerplate generation, module creation, page structure setup, or initial file structure. Also use when asked to "새 모듈 만들어줘", "scaffold해줘", "새 페이지 구조 잡아줘", "모듈 구조 생성", "보일러플레이트 만들어줘", "새 기능 뼈대 만들어줘", "create new module", "scaffold a feature", "generate module structure", "set up new page", or any task requiring creation of multiple convention-compliant starter files.
---

# Project Scaffold

Generate convention-compliant file structures for new NestJS modules or Next.js pages.

## Convention Loading

Before starting, Read the relevant reference files from `references/` within this skill directory based on scaffold target:

### For NestJS Module Scaffold
1. **Always read first**:
   - `references/BACKEND_CONVENTION.md` - 3-layer architecture, naming rules
   - `references/BACKEND_ARCHITECTURE_CONVENTION.md` - Layer responsibilities, dependency direction
   - `references/NESTJS_CONVENTION.md` - Module structure, DI, decorators
2. **Read when relevant**:
   - `references/API_SPEC_CONVENTION.md` - When scaffold includes API endpoints
   - `references/SECURITY_CONVENTION.md` - When scaffold needs auth/guards
   - `references/TYPEORM_CONVENTION.md` - When scaffold includes Entity
   - `references/DATABASE_CONVENTION.md` - When scaffold includes DB modeling

### For Next.js Page Scaffold
1. **Always read first**:
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - Component types, dependency direction
   - `references/NEXTJS_CONVENTION.md` - App Router, Server/Client Components
2. **Read when relevant**:
   - `references/FRONTEND_CONVENTION.md` - Frontend common rules
   - `references/STATE_CONVENTION.md` - When scaffold includes state management
   - `references/STYLING_CONVENTION.md` - When scaffold includes styled components
   - `references/FORM_CONVENTION.md` - When scaffold includes forms

### Common (always read)
- `references/COMMON_CONVENTION.md` - Naming, error codes
- `references/TYPESCRIPT_CONVENTION.md` - TS style, imports

## Workflow

### Step 1: Determine Scaffold Type

Ask or infer from context:

| Scaffold Type | When to Use |
|---------------|-------------|
| **NestJS Module** | Backend feature module (API endpoints, business logic, data access) |
| **Next.js Page** | Frontend page with components, data fetching, state |
| **Full-stack** | Both backend module and frontend page for one feature |

Identify the feature name (e.g., `order`, `product`, `shipment`) and confirm with the user.

### Step 2: NestJS Module Scaffold

Generate the following 11 files under `src/modules/{feature}/`:

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
// src/modules/{feature}/{feature}.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { {Feature}Entity } from './entities/{feature}.entity';

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
// src/modules/{feature}/{feature}.service.ts
import { Injectable } from '@nestjs/common';

import { {Feature}Repository } from './{feature}.repository';

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
// src/modules/{feature}/{feature}.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { {Feature}Service } from './{feature}.service';
import { Create{Feature}Dto } from './dto/create-{feature}.dto';
import { Update{Feature}Dto } from './dto/update-{feature}.dto';
import { Get{Feature}ListQueryDto } from './dto/get-{feature}-list-query.dto';

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
import { {Feature}Controller } from './{feature}.controller';
import { {Feature}Service } from './{feature}.service';
import { {Feature}Repository } from './{feature}.repository';

@Module({
  imports: [TypeOrmModule.forFeature([{Feature}Entity])],
  controllers: [{Feature}Controller],
  providers: [{Feature}Service, {Feature}Repository],
  exports: [{Feature}Service],
})
export class {Feature}Module {}
```

### Step 3: Next.js Page Scaffold

Generate the following files:

#### 3-1. Page (Server Component)

```typescript
// app/(group)/{feature}/page.tsx
import { {Feature}List } from '@/components/feature/{Feature}/{Feature}List';

export default function {Feature}Page() {
  return <{Feature}List />;
}
```

#### 3-2. Loading

```typescript
// app/(group)/{feature}/loading.tsx
import { Skeleton, Stack } from '@mui/material';

export default function {Feature}Loading() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rectangular" height={40} />
      <Skeleton variant="rectangular" height={400} />
    </Stack>
  );
}
```

#### 3-3. Error

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
      <h2>오류가 발생했습니다</h2>
      <button onClick={reset}>다시 시도</button>
    </div>
  );
}
```

#### 3-4. Detail Page

```typescript
// app/(group)/{feature}/[id]/page.tsx
import { {Feature}Detail } from '@/components/feature/{Feature}/{Feature}Detail';

export default function {Feature}DetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <{Feature}Detail id={params.id} />;
}
```

#### 3-5. Feature Component (List)

```typescript
// components/feature/{Feature}/{Feature}List.tsx
'use client';

import { use{Feature}ListQuery } from '@/queries/use{Feature}ListQuery';

export function {Feature}List() {
  const { data, isLoading } = use{Feature}ListQuery();

  // TODO: Implement list UI using data
  return <div>TODO: {Feature} List</div>;
}
```

#### 3-6. Feature Component (Detail)

```typescript
// components/feature/{Feature}/{Feature}Detail.tsx
'use client';

import { use{Feature}Query } from '@/queries/use{Feature}Query';

interface {Feature}DetailProps {
  id: string;
}

export function {Feature}Detail({ id }: {Feature}DetailProps) {
  const { data, isLoading } = use{Feature}Query(id);

  // TODO: Implement detail UI using data
  return <div>TODO: {Feature} Detail</div>;
}
```

#### 3-7. Query Hooks

```typescript
// queries/use{Feature}ListQuery.ts
import { useQuery } from '@tanstack/react-query';

import { {feature}Keys } from './queryKeys/{feature}Keys';

export function use{Feature}ListQuery(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: {feature}Keys.list(params),
    queryFn: async () => {
      // TODO: Implement API call
    },
  });
}
```

```typescript
// queries/use{Feature}Query.ts
import { useQuery } from '@tanstack/react-query';

import { {feature}Keys } from './queryKeys/{feature}Keys';

export function use{Feature}Query(id: string) {
  return useQuery({
    queryKey: {feature}Keys.detail(id),
    queryFn: async () => {
      // TODO: Implement API call
    },
    enabled: !!id,
  });
}
```

```typescript
// queries/queryKeys/{feature}Keys.ts
export const {feature}Keys = {
  all: ['{feature}'] as const,
  lists: () => [...{feature}Keys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...{feature}Keys.lists(), params] as const,
  details: () => [...{feature}Keys.all, 'detail'] as const,
  detail: (id: string) => [...{feature}Keys.details(), id] as const,
};
```

#### 3-8. Types

```typescript
// types/{Feature}.types.ts
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

### Step 4: Post-Scaffold Summary

After generating files, present:

1. **Created files list** with paths
2. **TODO markers** that need user attention (fields, business logic)
3. **Next steps**:
   - For NestJS: "Register `{Feature}Module` in `AppModule` imports"
   - For Next.js: "Add route to navigation/sidebar if needed"
4. **Recommended skills** for detailed implementation:
   - `nestjs-api-dev` for API endpoint details
   - `typeorm-dev` for Entity column definitions and migrations
   - `nextjs-data-provider` for query hooks and server actions
   - `nextjs-ui-dev` for component UI implementation

## Key Rules Summary

| Rule | Detail |
|------|--------|
| MUST | Use `@sellernote/sellernote-nestjs-api-property` for all DTO decorators |
| MUST | Entity extends custom `BaseEntity` (not TypeORM's) |
| MUST | Domain Model Interface in `interfaces/` directory |
| MUST | Mapper uses `I{Feature}Model` type, not Entity directly |
| MUST | Money fields as `string` type with `@SellernoteApiDecimal` |
| MUST | `page.tsx` is Server Component -- no business logic |
| MUST | Feature components in `components/feature/` with `'use client'` |
| MUST | Query key factory pattern (`{feature}Keys`) |
| MUST | `@/` absolute import paths in Next.js |
| MUST | TODO markers at every point requiring user customization |

## Cross-Skill References

- **NestJS API implementation details**: Use the `nestjs-api-dev` skill
- **Entity/TypeORM work**: Use the `typeorm-dev` skill
- **Next.js data layer**: Use the `nextjs-data-provider` skill
- **Next.js UI components**: Use the `nextjs-ui-dev` skill
- **Full feature orchestration**: Use the `nextjs-dev-orchestration` skill
