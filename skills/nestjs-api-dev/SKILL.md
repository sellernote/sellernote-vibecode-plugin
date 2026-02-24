---
name: nestjs-api-dev
description: NestJS API development following Sellernote conventions. Use when creating, modifying, or reviewing NestJS controllers, services, repositories, DTOs, guards, interceptors, pipes, or modules. Triggers on tasks involving NestJS API endpoints, request/response handling, business logic implementation, DTO validation with @sellernote/sellernote-nestjs-api-property, money/decimal field handling with big.js, domain model interfaces, feature module creation, Swagger documentation, authentication guards, RBAC, or any backend API work in a NestJS project. Also use when asked to add a new API endpoint, implement CRUD operations, set up module structure, or apply Sellernote backend architecture conventions.
---

# NestJS API Dev

Develop NestJS APIs following Sellernote's 3-layer architecture and convention documents.

## Convention Loading

Before starting any work, Read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/BACKEND_CONVENTION.md` - 3-layer architecture, DTO/Entity naming
   - `references/BACKEND_ARCHITECTURE_CONVENTION.md` - Layer responsibilities, forbidden patterns
   - `references/NESTJS_CONVENTION.md` - NestJS-specific rules, DI, decorators, money handling

2. **Read when relevant**:
   - `references/API_SPEC_CONVENTION.md` - When designing endpoints, response formats, pagination, bulk ops
   - `references/SECURITY_CONVENTION.md` - When implementing auth, guards, input validation
   - `references/COMMON_CONVENTION.md` - When unsure about naming, git, error codes
   - `references/TYPESCRIPT_CONVENTION.md` - When unsure about TS style, imports, types

## Workflow

Follow these steps sequentially. Skip a step only when it does not apply to the task.

### Step 1: Explore Existing Code

1. Identify the target feature module under `src/modules/`
2. Check existing patterns in the codebase (file naming, DI patterns, existing DTOs)
3. If creating a new module, check directory layout in `references/NESTJS_CONVENTION.md`

### Step 2: Define Domain Model Interface

Create or update the interface in `modules/{feature}/interfaces/{feature}.model.interface.ts`.

```typescript
// modules/order/interfaces/order.model.interface.ts
export interface IOrderModel {
  id: string;
  _no: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

- [MUST] Include only data fields belonging to this model; exclude relations
- [MUST] Entity implements this interface; Mapper uses it as parameter type
- For Entity/TypeORM work, delegate to the `typeorm-dev` skill

### Step 3: Create DTOs

Place DTOs in `modules/{feature}/dto/`. Follow naming from `references/BACKEND_CONVENTION.md`.

**Critical: Use `@sellernote/sellernote-nestjs-api-property` exclusively -- never use `@ApiProperty`, `class-validator`, or `class-transformer` directly.**

```typescript
import {
  SellernoteApiString,
  SellernoteApiNumber,
  SellernoteApiDecimal,
} from '@sellernote/sellernote-nestjs-api-property';

export class CreateOrderDto {
  @SellernoteApiString({ description: '상품명', maxLength: 100, isRequired: true })
  productName: string;

  @SellernoteApiNumber({ description: '수량', min: 1, isRequired: true })
  quantity: number;

  @SellernoteApiDecimal({ description: '총 금액', isRequired: true })
  totalAmount: string;  // Money fields MUST be string
}
```

> `class-validator` and `class-transformer` are used internally by `@sellernote/sellernote-nestjs-api-property`. Always use `@SellernoteApi*` decorators which wrap these. See `references/NESTJS_CONVENTION.md` for edge cases.

**Money fields:**
- [MUST] Declare as `string` type + `@SellernoteApiDecimal` decorator
- [MUST] Use `big.js` for arithmetic in Service layer (never native `number` arithmetic)
- [MUST NOT] Use `number` type or `@SellernoteApiNumber` for money

### Step 4: Create Controller

Place in `modules/{feature}/{feature}.controller.ts`. Controller handles HTTP only -- delegate to Service immediately.

- [MUST] Add `@ApiOperation({ summary })` and `@ApiResponse` to every endpoint
- [MUST] Use Guards for auth/RBAC, not inline checks
- See `references/BACKEND_ARCHITECTURE_CONVENTION.md` for layer responsibility rules

### Step 5: Create Service

Place in `modules/{feature}/{feature}.service.ts`. All business logic lives here.

**Sellernote-specific patterns:**
- [MUST] Use `@Transactional()` from `typeorm-transactional` for transaction management (not `QueryRunner`)
- [MUST] Use `big.js` for money calculations: `new Big(dto.totalAmount).times(dto.quantity).toFixed(2)`
- See `references/BACKEND_ARCHITECTURE_CONVENTION.md` for full Service rules and forbidden patterns

### Step 6: Create Repository

Place in `modules/{feature}/{feature}.repository.ts`. Pure data access only.

- [MUST] Use parameterized queries (never string interpolation)
- See `references/BACKEND_ARCHITECTURE_CONVENTION.md` for allowed/forbidden Repository patterns

### Step 7: Create Mapper

Place in `modules/{feature}/mappers/{feature}.mapper.ts`.

- [MUST] Use Domain Model Interface (`IXxxModel`) as parameter type, not Entity directly

```typescript
import type { IOrderModel } from '../interfaces/order.model.interface';

export class OrderMapper {
  static toResponseDto(model: IOrderModel): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = model.id;
    dto.orderNumber = model.orderNumber;
    dto.totalAmount = model.totalAmount.toString(); // number -> string for money
    dto.status = model.status;
    return dto;
  }
}
```

### Step 8: Wire Module

Register all providers in the feature module. Use `exports` for cross-module access. Avoid `@Global()` unless truly app-wide.

- See `references/NESTJS_CONVENTION.md` for module wiring rules

### Step 9: Add Guards and Security

Apply `JwtAuthGuard`, `RolesGuard` + `@Roles()` decorator as needed.

- See `references/SECURITY_CONVENTION.md` for full auth/RBAC/input validation rules
- See `references/NESTJS_CONVENTION.md` for Guard/Interceptor/Pipe usage patterns

### Step 10: Verify Swagger

- [MUST] Every DTO field has a `@SellernoteApi*` decorator with `description`
- [MUST] Every endpoint has `@ApiOperation` and `@ApiResponse`
- See `references/NESTJS_CONVENTION.md` for Swagger documentation rules

## File Structure Reference

```
src/modules/{feature}/
├── interfaces/
│   └── {feature}.model.interface.ts
├── entities/
│   └── {feature}.entity.ts          # -> use typeorm-dev skill
├── dto/
│   ├── create-{feature}.dto.ts
│   ├── update-{feature}.dto.ts
│   ├── {feature}-response.dto.ts
│   └── get-{feature}-list-query.dto.ts
├── mappers/
│   └── {feature}.mapper.ts
├── {feature}.module.ts
├── {feature}.controller.ts
├── {feature}.service.ts
├── {feature}.repository.ts
└── {feature}.service.spec.ts
```

## Cross-Skill References

- **Entity/TypeORM work**: Use the `typeorm-dev` skill for Entity definitions, migrations, relations, and TypeORM-specific patterns
- **Entity/Prisma work**: Use the `prisma-dev` skill for Prisma schema models, migrations, relations, and Prisma-specific patterns
