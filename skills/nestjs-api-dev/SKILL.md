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
3. If creating a new module, identify the directory layout from `NESTJS_CONVENTION.md`

### Step 2: Define Domain Model Interface

Create or update the interface in `modules/{feature}/interfaces/{feature}.model.interface.ts`:

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

Rules:
- [MUST] Include only data fields belonging to this model; exclude relations
- [MUST] Entity implements this interface; Mapper uses it as parameter type
- For Entity/TypeORM work, delegate to the `typeorm-dev` skill

### Step 3: Create DTOs

Place DTOs in `modules/{feature}/dto/`. Follow naming: `create-{feature}.dto.ts`, `update-{feature}.dto.ts`, `{feature}-response.dto.ts`, `get-{feature}-list-query.dto.ts`.

**Critical: Use `@sellernote/sellernote-nestjs-api-property` exclusively.**

```typescript
// GOOD - Sellernote API property decorators
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

```typescript
// BAD - Do not use these directly; use @sellernote/sellernote-nestjs-api-property instead
import { ApiProperty } from '@nestjs/swagger';           // Use @SellernoteApi* decorators
import { IsString, MaxLength } from 'class-validator';   // Wrapped by @SellernoteApi* decorators
import { Type } from 'class-transformer';                 // Wrapped by @SellernoteApi* decorators
```

> **Note:** `class-validator` and `class-transformer` are used internally by the `@sellernote/sellernote-nestjs-api-property` library. Always use `@SellernoteApi*` decorators which wrap these. See `references/NESTJS_CONVENTION.md` for edge cases.

**Money fields:**
- [MUST] Declare as `string` type in DTOs
- [MUST] Use `@SellernoteApiDecimal` decorator
- [MUST] Use `big.js` for arithmetic in Service layer
- [MUST NOT] Use `number` type or `@SellernoteApiNumber` for money

### Step 4: Create Controller

Place in `modules/{feature}/{feature}.controller.ts`. Controller handles HTTP only.

```typescript
@Controller({ path: 'orders', version: '1' })
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: '주문 생성' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.orderService.createOrder(dto);
  }
}
```

Rules:
- [MUST] Delegate to Service immediately; no business logic in Controller
- [MUST] Add `@ApiOperation({ summary })` and `@ApiResponse` to every endpoint
- [MUST] Use Guards for auth/RBAC, not inline checks
- [MUST NOT] Inject or call Repository from Controller

### Step 5: Create Service

Place in `modules/{feature}/{feature}.service.ts`. All business logic lives here.

```typescript
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  @Transactional()
  async createOrder(dto: CreateOrderDto): Promise<OrderResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('상품을 찾을 수 없습니다.');
    }

    // Money arithmetic with big.js
    const lineTotal = new Big(dto.totalAmount).times(dto.quantity).toFixed(2);

    const order = this.orderRepository.create({
      ...dto,
      totalAmount: Number(lineTotal),
      status: 'PENDING',
    });
    const saved = await this.orderRepository.save(order);
    return OrderMapper.toResponseDto(saved);
  }
}
```

Rules:
- [MUST] Constructor injection for all dependencies
- [MUST] All business validation, domain rules, conditional logic here
- [MUST] Use `big.js` for money calculations (never native `number` arithmetic)
- [MUST] Throw `HttpException` subclasses for errors (`NotFoundException`, `BadRequestException`)
- [MUST] Use `@Transactional()` from `typeorm-transactional` package for transaction management
- [MUST NOT] Use `QueryRunner` for manual transaction management

### Step 6: Create Repository

Place in `modules/{feature}/{feature}.repository.ts`. Pure data access only.

```typescript
@Injectable()
export class OrderRepository extends Repository<Order> {
  constructor(private dataSource: DataSource) {
    super(Order, dataSource.createEntityManager());
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByFilter(filter: GetOrderListQueryDto): Promise<[Order[], number]> {
    const qb = this.createQueryBuilder('order');
    if (filter.status) {
      qb.andWhere('order.status = :status', { status: filter.status });
    }
    return qb.take(filter.size).skip((filter.page - 1) * filter.size).getManyAndCount();
  }
}
```

Rules:
- [MUST] Only CRUD, dynamic query building, and aggregate queries
- [MUST] Use parameterized queries (never string interpolation)
- [MUST NOT] Contain business logic, if/else branching on domain rules, or throw HttpExceptions
- [MUST NOT] Inject other Repositories or Services
- [MUST NOT] Transform data into business DTOs

### Step 7: Create Mapper

Place in `modules/{feature}/mappers/{feature}.mapper.ts`:

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

- [MUST] Use Domain Model Interface as parameter type, not Entity directly

### Step 8: Wire Module

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService],
})
export class OrderModule {}
```

- [MUST] Register all providers; use `exports` for cross-module access
- [MUST] Import other modules explicitly; avoid `@Global()` unless truly app-wide

### Step 9: Add Guards and Security

- [MUST] Use `JwtAuthGuard` for authenticated endpoints
- [MUST] Use `RolesGuard` + `@Roles()` decorator for RBAC
- [MUST] Ensure global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`
- [MUST] Use `helmet` middleware
- [MUST NOT] Check roles inside Controller methods manually

### Step 10: Verify Swagger

- [MUST] Every DTO field has a `@Sellernote*` decorator with `description`
- [MUST] Every endpoint has `@ApiOperation` and `@ApiResponse`
- [MUST] Money fields documented with `@SellernoteApiDecimal`

## Quick Reference: MUST / MUST NOT

### Architecture
| Rule | Detail |
|------|--------|
| MUST | 3-layer: Controller -> Service -> Repository (unidirectional) |
| MUST | Business logic only in Service |
| MUST | Data access only in Repository |
| MUST NOT | Controller call Repository directly |
| MUST NOT | Repository inject other Repository or Service |
| MUST NOT | Repository throw HttpException or contain business branching |

### NestJS
| Rule | Detail |
|------|--------|
| MUST | Use `@sellernote/sellernote-nestjs-api-property` for all DTO decorators |
| MUST NOT | Use `@ApiProperty`, `class-validator`, or `class-transformer` decorators directly |
| MUST | Money DTO fields as `string` + `@SellernoteApiDecimal` |
| MUST | Money arithmetic with `big.js` |
| MUST | Constructor injection (never `new Service()`) |
| MUST | Domain Model Interface per model; Entity implements it |
| MUST | Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true` |
| MUST | Global Exception Filter returning `{ success, data, error }` |
| MUST NOT | Use `any` type |
| MUST NOT | Create circular module dependencies |

### API Design
| Rule | Detail |
|------|--------|
| MUST | RESTful: plural nouns, kebab-case URLs, max 2-level nesting |
| MUST | URL versioning: `/api/v1/...` |
| MUST | Response format: `{ success, data, error }` with pagination |
| MUST | Bulk endpoints: `/bulk` path, `items` array, max 100 items |
| MUST | POST endpoints support `Idempotency-Key` header |
| MUST | JSON fields in camelCase, dates in ISO 8601 UTC |

### Security
| Rule | Detail |
|------|--------|
| MUST | JWT Access + Refresh tokens |
| MUST | Auth/RBAC via Guards, not inline Controller checks |
| MUST | Parameterized queries only (prevent SQL injection) |
| MUST | `helmet` middleware |
| MUST NOT | Hardcode secrets; use `ConfigService` + env vars |
| MUST NOT | Return Entity directly (use ResponseDto) |
| MUST NOT | Expose stack traces or internal info in error responses |

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
