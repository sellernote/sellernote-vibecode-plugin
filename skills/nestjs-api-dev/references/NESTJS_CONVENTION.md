# NestJS Convention

> This document defines the rules applied to NestJS projects.
> Parent rules: BACKEND_CONVENTION.md

## Technology Stack

| Item             | Version/Setting    |
| ---------------- | ------------------ |
| Test Framework   | Jest (NestJS default) |

## Project Structure

### Directory Layout

- **Rule**: [MUST] Follow a Feature-based module structure.

```
src/
├── main.ts                          # App entry point
├── app.module.ts                    # Root module
│
├── common/                          # Common utilities
│   ├── constants/                   # Constant definitions
│   ├── decorators/                  # Custom decorators
│   ├── dto/                         # Common DTOs (pagination, etc.)
│   ├── filters/                     # Global Exception Filters
│   ├── guards/                      # Global Guards
│   ├── interceptors/                # Global Interceptors
│   ├── interfaces/                  # Common interfaces
│   ├── middleware/                   # Middleware
│   └── pipes/                       # Global Pipes
│
├── config/                          # Configuration module
│
├── modules/                         # Feature modules
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── auth.service.spec.ts
│   │
│   ├── user/
│   │   ├── user.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── user.service.spec.ts
│   │
│   └── order/
│       ├── order.module.ts
│       └── ...
│
└── shared/                          # Shared modules (DB, mail, etc.)
    ├── database/
    └── mail/
```

### File Naming

- **Rule**: [MUST] File names follow the `[name].[type].ts` pattern.

| Type              | Pattern                         | Example                        |
| ----------------- | ------------------------------- | ------------------------------ |
| Module            | `[name].module.ts`              | `order.module.ts`              |
| Controller        | `[name].controller.ts`          | `order.controller.ts`          |
| Controller (split)| `[feature]-[name].controller.ts`| `order-crud.controller.ts`     |
| Service           | `[name].service.ts`             | `order.service.ts`             |
| Service (split)   | `[feature]-[name].service.ts`   | `order-fulfillment.service.ts` |
| Repository        | `[name].repository.ts`          | `order.repository.ts`          |
| Entity            | `[name].entity.ts`              | `order.entity.ts`              |
| DTO               | `[action]-[name].dto.ts`        | `create-order.dto.ts`          |
| Guard             | `[name].guard.ts`               | `jwt-auth.guard.ts`            |
| Interceptor       | `[name].interceptor.ts`         | `logging.interceptor.ts`       |
| Pipe              | `[name].pipe.ts`                | `parse-int.pipe.ts`            |
| Filter            | `[name].filter.ts`              | `http-exception.filter.ts`     |
| Test              | `[name].[type].spec.ts`         | `order.service.spec.ts`        |

## Domain Model Interface

### Domain Model Interface Definition

- **Rule**: [MUST] Define a Domain Model Interface for each domain model. Include only the model's own data fields, excluding relation fields.
- **Good example**:
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

### Usage in DTO Mapper

- **Rule**: [MUST] DTO Mapper performs DTO <-> domain data mapping based on the Domain Model Interface.
- **Good example**:

  ```typescript
  import type { IOrderModel } from "../interfaces/order.model.interface";

  export class OrderMapper {
    static toResponseDto(model: IOrderModel): OrderResponseDto {
      const dto = new OrderResponseDto();
      dto.id = model.id;
      dto.orderNumber = model.orderNumber;
      dto.totalAmount = model.totalAmount.toString();
      dto.status = model.status;
      dto.createdAt = model.createdAt.toISOString();
      return dto;
    }

    static fromCreateDto(dto: CreateOrderDto): Partial<IOrderModel> {
      return {
        orderNumber: dto.orderNumber,
        totalAmount: Number(dto.totalAmount),
        status: "PENDING",
        userId: dto.userId,
      };
    }
  }
  ```

### Implementation in Entity

- **Rule**: [MUST] Entity `implements` the Domain Model Interface.
- **Good example**:

  ```typescript
  import type { IOrderModel } from "../interfaces/order.model.interface";

  @Entity("order")
  export class Order extends BaseEntity implements IOrderModel {
    @Column({ type: "varchar", length: 100 })
    orderNumber: string;

    @Column({ type: "decimal", precision: 15, scale: 2 })
    totalAmount: number;

    @Column({ type: "varchar", length: 20 })
    status: string;

    @Column({ type: "char", length: 36 })
    userId: string;

    // Relations are not included in the Interface -- defined only in the Entity
    @ManyToOne(() => User, (user) => user.orders)
    @JoinColumn({ name: "user_id" })
    user: Relation<User>;
  }
  ```

### Directory Structure

- **Rule**: [MUST] Domain Model Interface files are placed in the `modules/{feature}/interfaces/` directory following the `{feature}.model.interface.ts` pattern.

```
modules/order/
├── order.module.ts
├── controllers/
├── services/
├── repositories/
├── interfaces/
│   ├── order.model.interface.ts       # Domain Model Interface
│   └── order-model-relation.interface.ts  # Relation Interface (optional)
├── entities/
├── dto/
└── mappers/
```

## Monetary Amount Handling

### Monetary Amount DTO Field Type

- **Rule**: [MUST] DTO fields representing monetary amounts are defined as `string` type.
- **Good example**:

  ```typescript
  export class CreateOrderDto {
    @SellernoteApiDecimal({ description: "Total order amount", isRequired: true })
    totalAmount: string;

    @SellernoteApiDecimal({ description: "Discount amount", isRequired: false })
    discountAmount?: string;
  }
  ```

  > [MUST NOT] Do not use `number` type for monetary amounts (IEEE 754 floating-point precision loss).

### Swagger Monetary Amount Documentation

- **Rule**: [MUST] Use the `@SellernoteApiDecimal` decorator for Swagger documentation of monetary amount DTO fields.
  > [MUST NOT] Do not use `@SellernoteApiNumber` for monetary amounts.

### Monetary Amount Calculation Library

- **Rule**: [MUST] Use the `big.js` library for monetary amount calculations.
- **Good example**:

  ```typescript
  import Big from "big.js";

  function calculateOrderTotal(
    items: { price: string; quantity: number }[],
  ): string {
    let total = new Big(0);
    for (const item of items) {
      total = total.plus(new Big(item.price).times(item.quantity));
    }
    return total.toFixed(2);
  }

  function applyDiscount(amount: string, discountRate: string): string {
    const original = new Big(amount);
    return original.minus(original.times(new Big(discountRate))).toFixed(2);
  }
  ```

## Controller / Service / Repository Splitting

### Splitting Principles

- **Rule**: [MUST] All feature modules use `controllers/`, `services/`, `repositories/` directories.

### Controller Splitting

- **Rule**: [SHOULD] When a Controller becomes too large, split it by functionality.
- **Good example**:

  ```
  controllers/
  ├── order-crud.controller.ts
  └── order-fulfillment.controller.ts
  ```

  ```typescript
  @Controller("orders")
  export class OrderCrudController {
    constructor(private readonly orderCrudService: OrderCrudService) {}
    @Post() create(@Body() dto: CreateOrderDto) {
      return this.orderCrudService.create(dto);
    }
    @Get(":id") findOne(@Param("id") id: string) {
      return this.orderCrudService.findOne(id);
    }
  }

  @Controller("orders")
  export class OrderFulfillmentController {
    constructor(
      private readonly orderFulfillmentService: OrderFulfillmentService,
    ) {}
    @Post(":id/ship") ship(@Param("id") id: string, @Body() dto: ShipOrderDto) {
      return this.orderFulfillmentService.ship(id, dto);
    }
  }
  ```

### Service Splitting

- **Rule**: [SHOULD] When a Service becomes too large, split it into independent Services by business functionality.
- **Good example**:
  ```
  services/
  ├── order-crud.service.ts
  ├── order-fulfillment.service.ts
  └── order-calculation.service.ts
  ```

### Repository Splitting

- **Rule**: [MUST] Repositories are mapped 1:1 with Entities and placed in the `repositories/` directory.

### Module Registration (When Split)

- **Rule**: [MUST] All split Controllers, Services, and Repositories must be registered in the corresponding Feature Module's `@Module()` decorator.
- **Good example**:
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

## Module Composition

### Feature Module

- **Rule**: [MUST] Each business feature is organized as an independent Feature Module.
- **Good example**:
  ```typescript
  @Module({
    imports: [TypeOrmModule.forFeature([Order])],
    controllers: [OrderController],
    providers: [OrderService, OrderRepository],
    exports: [OrderService],
  })
  export class OrderModule {}
  ```

### Shared Module

- **Rule**: [SHOULD] Providers commonly used across multiple modules are separated into a Shared Module.
- **Good example**:
  ```typescript
  @Module({
    providers: [MailService, S3Service],
    exports: [MailService, S3Service],
  })
  export class SharedModule {}
  ```

### Global Module

- **Rule**: [MAY] Modules used throughout the entire app may use the `@Global()` decorator. However, do not overuse it.
- **Good example**:
  ```typescript
  @Global()
  @Module({
    providers: [ConfigService, LoggerService],
    exports: [ConfigService, LoggerService],
  })
  export class CoreModule {}
  ```

### Inter-Module Dependencies

- **Rule**: [MUST] To use a Provider from another module, explicitly add that module to `imports`.

## DI Patterns

### Provider Registration

- **Rule**: [MUST] All service classes use the `@Injectable()` decorator and are registered in the module's `providers`.

### Constructor Injection

- **Rule**: [MUST] Use Constructor Injection for dependency injection.
- **Good example**:
  ```typescript
  @Injectable()
  export class OrderService {
    constructor(
      private readonly orderRepository: OrderRepository,
      private readonly paymentService: PaymentService,
    ) {}
  }
  ```

### Custom Provider

- **Rule**: [MAY] Custom Providers (useClass, useFactory, useValue) may be used when interface-based injection is needed.
- **Good example**:
  ```typescript
  @Module({
    providers: [
      {
        provide: "PAYMENT_GATEWAY",
        useClass:
          process.env.NODE_ENV === "production"
            ? StripePaymentGateway
            : MockPaymentGateway,
      },
    ],
  })
  export class PaymentModule {}
  ```

### Scope

- **Rule**: [SHOULD] Use the default scope (Singleton) unless there is a specific reason not to.
- **Rule**: [MAY] Use Request Scope only when per-request state is needed.

## Decorators

### Custom Decorator Usage Criteria

- **Rule**: [SHOULD] Use Custom Decorators to extract repetitive logic.
- **Good example**:

  ```typescript
  export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest();
      return request.user;
    },
  );

  @Get('/me')
  getProfile(@CurrentUser() user: User) {
    return this.userService.getProfile(user.id);
  }
  ```

### Decorator Composition

- **Rule**: [MAY] When multiple decorators are repeatedly used together, they may be combined into one using `applyDecorators()`.
- **Good example**:

  ```typescript
  export function Auth(...roles: Role[]) {
    return applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles));
  }

  @Auth(Role.ADMIN)
  @Delete('/users/:id')
  deleteUser(@Param('id') id: string) { ... }
  ```

## Guard / Interceptor / Pipe

### Role Distinction

- **Rule**: [MUST] Guard, Interceptor, and Pipe must each be used according to their designated roles.

| Component       | Role                                        | When to Use                                                  |
| --------------- | ------------------------------------------- | ------------------------------------------------------------ |
| **Guard**       | Authentication/Authorization decision       | Checks access permissions before the request reaches the handler |
| **Interceptor** | Request/Response transformation, logging, caching | Adds logic before and after handler execution (AOP)          |
| **Pipe**        | Input data transformation and validation    | When data is bound to handler parameters                     |

### Guard Usage

- **Rule**: [MUST] Authentication/authorization logic is handled in Guards. Do not check directly inside Controller methods.
- **Good example**:

  ```typescript
  @Injectable()
  export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) { return super.canActivate(context); }
  }

  @UseGuards(JwtAuthGuard)
  @Get('/orders')
  getOrders() { ... }
  ```

### Interceptor Usage

- **Rule**: [SHOULD] Cross-cutting concerns such as response transformation, logging, and timeouts are handled by Interceptors.
- **Good example**:
  ```typescript
  @Injectable()
  export class TransformInterceptor<T> implements NestInterceptor<
    T,
    Response<T>
  > {
    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<Response<T>> {
      return next
        .handle()
        .pipe(map((data) => ({ success: true, data, error: null })));
    }
  }
  ```

### Pipe Usage

- **Rule**: [MUST] Set up a global ValidationPipe to automatically validate DTOs for all requests.
- **Good example**:
  ```typescript
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  ```

## DTO Validation

### class-validator Usage

- **Rule**: [MUST] Use `class-validator` decorators for DTO validation.
- **Good example**:

  ```typescript
  export class CreateOrderDto {
    @IsString()
    @MaxLength(100)
    productName: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsString()
    @IsOptional()
    memo?: string;
  }
  ```

### class-transformer Usage

- **Rule**: [SHOULD] Use `class-transformer` for type conversion of request data.
- **Good example**:

  ```typescript
  export class GetOrderListQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    size: number = 20;
  }
  ```

### DTO Immutability

- **Rule**: [SHOULD] Declare DTO fields as `readonly` to ensure immutability.

## Swagger Documentation

### API Property Management Library

- **Rule**: [MUST] Use the in-house library `@sellernote/sellernote-nestjs-api-property` for defining API Properties in DTOs.
- **Rule**: [MUST NOT] Do not directly use `@ApiProperty()` from `@nestjs/swagger`. Do not directly use `class-validator`/`class-transformer` decorators either.
- **Reference**: Refer to the [sellernote-nestjs-api-property README](https://github.com/sellernote/sellernote-nestjs-api-property) for usage.
- **Good example**:

  ```typescript
  import {
    SellernoteApiString,
    SellernoteApiNumber,
  } from "@sellernote/sellernote-nestjs-api-property";

  export class CreateOrderDto {
    @SellernoteApiString({
      description: "Product name",
      maxLength: 100,
      isRequired: true,
    })
    productName: string;

    @SellernoteApiNumber({ description: "Quantity", min: 1, isRequired: true })
    quantity: number;

    @SellernoteApiString({
      description: "Memo",
      maxLength: 500,
      isRequired: false,
    })
    memo?: string;
  }
  ```

  > [MUST NOT] Do not use `@ApiProperty`, `@IsString`, `@MaxLength`, etc. individually.

## Exception Handling

### HttpException Usage

- **Rule**: [MUST] Throw exceptions using NestJS's built-in HttpException or its subclasses.
- **Good example**:
  ```typescript
  @Injectable()
  export class OrderService {
    async findOne(id: number): Promise<Order> {
      const order = await this.orderRepository.findOne(id);
      if (!order)
        throw new NotFoundException(`Order ID ${id} not found.`);
      return order;
    }
  }
  ```

### Custom Business Exceptions

- **Rule**: [SHOULD] Define domain-specific exceptions as custom Exception classes.
- **Good example**:
  ```typescript
  export class InsufficientStockException extends BadRequestException {
    constructor(productId: number, requested: number, available: number) {
      super({
        code: "INSUFFICIENT_STOCK",
        message: `Insufficient stock for product ${productId}. (Requested: ${requested}, Available: ${available})`,
      });
    }
  }
  ```

### Exception Filter

- **Rule**: [MUST] Register a global Exception Filter to transform all exceptions into a consistent response format.
- **Good example**:
  ```typescript
  @Catch()
  export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const errorResponse =
        exception instanceof HttpException
          ? exception.getResponse()
          : {
              code: "INTERNAL_ERROR",
              message: "An internal server error occurred.",
            };
      response.status(status).json({
        success: false,
        data: null,
        error:
          typeof errorResponse === "string"
            ? { code: "ERROR", message: errorResponse }
            : errorResponse,
      });
    }
  }
  ```

## Anti-Patterns

### Circular Dependencies

- **Rule**: [MUST NOT] Do not create circular dependencies between modules or Providers.
- **Resolution**: Extract common logic into a separate module, or use `forwardRef()` as a last resort.

### Business Logic in Controllers

- **Rule**: [MUST NOT] Do not write business logic in Controllers.

### Not Using DI (Direct Instance Creation)

- **Rule**: [MUST NOT] Do not directly create service instances with the `new` keyword. Always inject through the DI container.
- **Good example**:
  ```typescript
  @Injectable()
  export class OrderService {
    constructor(private readonly mailService: MailService) {} // Injection through DI
  }
  ```
  > [MUST NOT] The pattern `private readonly mailService = new MailService()` is prohibited.

### Excessive Global Modules

- **Rule**: [SHOULD NOT] Do not overuse the `@Global()` decorator.

### Using the any Type

- **Rule**: [MUST NOT] Do not use the `any` type in TypeScript. Use explicit types or generics.