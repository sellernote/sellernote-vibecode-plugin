---
name: nestjs-api-dev
description: NestJS API development following Sellernote conventions. Use when creating, modifying, or reviewing NestJS controllers, services, repositories, DTOs, guards, interceptors, pipes, or modules. Triggers on tasks involving NestJS API endpoints, request/response handling, business logic implementation, DTO validation with @sellernote/sellernote-nestjs-api-property, money/decimal field handling with big.js, domain model interfaces, feature module creation, Swagger documentation, authentication guards, RBAC, or any backend API work in a NestJS project. Also use when asked to add a new API endpoint, implement CRUD operations, set up module structure, apply Sellernote backend architecture conventions, design RESTful URLs, implement pagination/filtering/sorting, set up bulk operations, handle file uploads, implement idempotency patterns, or configure security (JWT, CORS, input validation). Applies to monorepo setups with Application and Library layers.
---

# NestJS API Dev

Develop NestJS APIs following Sellernote's 3-layer architecture and convention documents.

## Convention Loading

Before starting any work, Read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/BACKEND_CONVENTION.md` - 3-layer architecture, DTO/Entity naming, test strategy, anti-patterns
   - `references/BACKEND_ARCHITECTURE_CONVENTION.md` - Layer responsibility matrix, forbidden patterns, monorepo dependency rules (Application → Library)
   - `references/NESTJS_CONVENTION.md` - NestJS-specific rules: project structure, DI, decorators, money handling, module config, controller/service/repository splitting, Guard/Interceptor/Pipe roles, exception handling

2. **Read when relevant**:
   - `references/API_SPEC_CONVENTION.md` - When designing endpoints: RESTful URL design, response formats, pagination, filtering/sorting, bulk ops, async processing (202 Accepted), file upload, idempotency, caching, rate limiting, OpenAPI/Swagger, full `@SellernoteApi*` decorator reference
   - `references/SECURITY_CONVENTION.md` - When implementing auth (JWT with Refresh Token Rotation, RBAC), input validation (SQL injection, XSS, Mass Assignment, Path Traversal), transport security (HTTPS, CORS, security headers, cookie security), sensitive data management, PII handling, security logging/auditing
   - `references/COMMON_CONVENTION.md` - When unsure about naming conventions, domain glossary, git/branch/commit conventions, error code format, logging levels/format
   - `references/TYPESCRIPT_CONVENTION.md` - When unsure about TS style, import ordering, enum vs union/as const, type-only imports, linter/formatter config

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

- [MUST] Include only data fields belonging to this model; exclude relation fields
- [MUST] Entity `implements` this interface; Mapper uses it as parameter type
- [MAY] Define separate `{feature}-model-relation.interface.ts` for relation types when needed
- For Entity/TypeORM work, delegate to the `typeorm-dev` skill

### Step 3: Create DTOs

Place DTOs in `modules/{feature}/dto/`. Follow naming from `references/BACKEND_CONVENTION.md`.

**Critical: Use `@sellernote/sellernote-nestjs-api-property` exclusively -- never use `@ApiProperty`, `class-validator`, or `class-transformer` directly.**

```typescript
import {
  SellernoteApiString,
  SellernoteApiNumber,
  SellernoteApiDecimal,
  SellernoteApiEnum,
} from '@sellernote/sellernote-nestjs-api-property';

export class CreateOrderDto {
  @SellernoteApiString({ description: 'Product name', maxLength: 100, isRequired: true })
  productName: string;

  @SellernoteApiNumber({ description: 'Quantity', min: 1, isRequired: true })
  quantity: number;

  @SellernoteApiDecimal({ description: 'Total amount', isRequired: true })
  totalAmount: string;  // Money fields MUST be string
}
```

> `class-validator` and `class-transformer` are used internally by `@sellernote/sellernote-nestjs-api-property`. Always use `@SellernoteApi*` decorators which wrap these. See `references/NESTJS_CONVENTION.md` for edge cases.

**Available decorators** (see `references/API_SPEC_CONVENTION.md` for full options):

| Decorator | Purpose | Key Options |
|-----------|---------|-------------|
| `SellernoteApiString` | String field | `maxLength` (required), `minLength`, `isTrim`, `isEmail` |
| `SellernoteApiNumber` | Number field | `min`, `max`, `isInt`, `isPositive` |
| `SellernoteApiBoolean` | Boolean field | Auto-converts from string/number |
| `SellernoteApiEnum` | Enum field | `enum`, `enumName` |
| `SellernoteApiObject` | Nested object | `type: () => ClassName` |
| `SellernoteApiDate` | Date field | `minDate`, `maxDate` |
| `SellernoteApiUUID` | UUID field | `version` |
| `SellernoteApiLiteral` | String literal union | `literals` |
| `SellernoteApiDecimal` | Decimal string (money) | `maxDecimalPlaces`, `maxDigits` |
| `SellernoteApiUnion` | Union type | `types`, `discriminator` |

- Common options: `description` (required), `isRequired` (required), `isArray`, `isNullable`, `example`
- Class decorator: `@SellernoteApiDto({ isQuery: true })` -- auto-converts single values to arrays in Query DTOs

**Money fields:**
- [MUST] Declare as `string` type + `@SellernoteApiDecimal` decorator
- [MUST] Use `big.js` for arithmetic in Service layer (never native `number` arithmetic)
- [MUST NOT] Use `number` type or `@SellernoteApiNumber` for money

**DTO naming patterns:**

| Type | Pattern | Example |
|------|---------|---------|
| Create request | `Create[Domain]Dto` | `CreateOrderDto` |
| Update request | `Update[Domain]Dto` | `UpdateOrderDto` |
| Query response | `[Domain]ResponseDto` | `OrderResponseDto` |
| List query | `Get[Domain]ListQueryDto` | `GetOrderListQueryDto` |
| Bulk create | `BulkCreate[Domain]Dto` | `BulkCreateOrderDto` |
| List response | `[Domain]ListResponseDto` | `OrderListResponseDto` |
| Summary | `[Domain]SummaryDto` | `OrderSummaryDto` |

- [SHOULD] Use `PartialType` and `PickType` from `@nestjs/swagger` when reusing existing DTOs

### Step 4: Create Controller

Place in `modules/{feature}/controllers/`. Controller handles HTTP only -- delegate to Service immediately.

- [MUST] All feature modules use `controllers/` directory (not flat files)
- [MUST] Add `@ApiOperation({ summary })` and `@ApiResponse` to every endpoint
- [MUST] Use Guards for auth/RBAC, not inline checks
- [SHOULD] Split into separate controllers by functionality when too large (e.g., `order-crud.controller.ts`, `order-fulfillment.controller.ts`)
- See `references/BACKEND_ARCHITECTURE_CONVENTION.md` for layer responsibility rules

### Step 5: Create Service

Place in `modules/{feature}/services/`. All business logic lives here.

- [MUST] All feature modules use `services/` directory
- [MUST] Use `@Transactional()` from `typeorm-transactional` for transaction management (not `QueryRunner`)
- [MUST] Use `big.js` for money calculations: `new Big(dto.totalAmount).times(dto.quantity).toFixed(2)`
- [SHOULD] Split into independent services when too large (e.g., `order-crud.service.ts`, `order-fulfillment.service.ts`)
- See `references/BACKEND_ARCHITECTURE_CONVENTION.md` for full Service rules and forbidden patterns

### Step 6: Create Repository

Place in `modules/{feature}/repositories/`. Pure data access only.

- [MUST] All feature modules use `repositories/` directory
- [MUST] Repositories are mapped 1:1 with Entities
- [MUST] Use parameterized queries (never string interpolation)
- [MUST NOT] Include business conditional branching, domain validation, or calls to other repositories/services
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
    dto.createdAt = model.createdAt.toISOString();
    return dto;
  }

  static fromCreateDto(dto: CreateOrderDto): Partial<IOrderModel> {
    return {
      orderNumber: dto.orderNumber,
      totalAmount: Number(dto.totalAmount),
      status: 'PENDING',
      userId: dto.userId,
    };
  }
}
```

### Step 8: Wire Module

Register all providers in the feature module. Use `exports` for cross-module access. Avoid `@Global()` unless truly app-wide.

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrderCrudController, OrderFulfillmentController],
  providers: [
    OrderCrudService,
    OrderFulfillmentService,
    OrderCalculationService,
    OrderRepository,
    OrderItemRepository,
  ],
  exports: [OrderCrudService, OrderFulfillmentService],
})
export class OrderModule {}
```

- [MUST] All split Controllers, Services, and Repositories must be registered in `@Module()`
- See `references/NESTJS_CONVENTION.md` for module wiring rules

### Step 9: Add Guards and Security

Apply `JwtAuthGuard`, `RolesGuard` + `@Roles()` decorator as needed.

- See `references/SECURITY_CONVENTION.md` for full auth/RBAC/input validation/transport security rules
- See `references/NESTJS_CONVENTION.md` for Guard/Interceptor/Pipe usage patterns and decorator composition

### Step 10: Verify Swagger and API Design

- [MUST] Every DTO field has a `@SellernoteApi*` decorator with `description`
- [MUST] Every endpoint has `@ApiOperation` and `@ApiResponse`
- [MUST] URLs use kebab-case plural nouns (e.g., `/api/v1/order-items`), versioned with `/api/v1/`
- [MUST] Response format follows standard structure: `{ success, data, error }`
- [MUST] Pagination includes `{ items, pagination: { page, size, totalItems, totalPages } }`
- [MUST] JSON field names use camelCase; dates use ISO 8601 (UTC)
- See `references/API_SPEC_CONVENTION.md` for filtering/sorting patterns, bulk ops, async processing, and more

## File Structure Reference

```
src/modules/{feature}/
├── interfaces/
│   ├── {feature}.model.interface.ts
│   └── {feature}-model-relation.interface.ts  # optional
├── entities/
│   └── {feature}.entity.ts          # -> use typeorm-dev skill
├── dto/
│   ├── create-{feature}.dto.ts
│   ├── update-{feature}.dto.ts
│   ├── {feature}-response.dto.ts
│   └── get-{feature}-list-query.dto.ts
├── mappers/
│   └── {feature}.mapper.ts
├── controllers/
│   └── {feature}.controller.ts      # split by function when large
├── services/
│   └── {feature}.service.ts         # split by function when large
├── repositories/
│   └── {feature}.repository.ts      # 1:1 with entity
├── {feature}.module.ts
└── {feature}.service.spec.ts
```

## Monorepo Dependencies

When working in a monorepo with Application (API service) and Library (shared domain logic) layers:

- [MUST] Application → Library: normal dependency direction
- [MUST NOT] Application → Application: direct dependency between API services prohibited
- [SHOULD NOT] Library → Library: prefer composition at Application level
- [MUST NOT] Library → Application: reverse dependency prohibited

See `references/BACKEND_ARCHITECTURE_CONVENTION.md` for detailed monorepo rules and examples.

## Cross-Skill References

- **Entity/TypeORM work**: Use the `typeorm-dev` skill for Entity definitions, migrations, relations, and TypeORM-specific patterns
- **Entity/Prisma work**: Use the `prisma-dev` skill for Prisma schema models, migrations, relations, and Prisma-specific patterns
