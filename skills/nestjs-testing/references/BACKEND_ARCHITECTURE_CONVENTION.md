# Architecture Convention

> This document defines the responsibility boundaries per layer and clean architecture principles for backend architecture.
> While maintaining the existing 3-layer structure, it clearly distinguishes what each layer should and should not do.
>
> Parent rule: BACKEND_CONVENTION.md

## Core Principles of Clean Architecture

Mapping the 3-layer structure (Controller → Service → Repository) from a clean architecture perspective is as follows.

```
┌───────────────────────────────────────────────────────┐
│                    3-레이어 구조                        │
│                                                       │
│  ┌─────────────┐                                      │
│  │ Controller  │  ← HTTP 요청/응답 처리, 입력 검증      │
│  │  (Adapter)  │                                      │
│  └──────┬──────┘                                      │
│         │ 호출                                         │
│  ┌──────▼──────┐                                      │
│  │   Service   │  ← 비즈니스 로직, 트랜잭션 관리         │
│  │ (Use Case)  │                                      │
│  └──────┬──────┘                                      │
│         │ 호출                                         │
│  ┌──────▼──────┐                                      │
│  │ Repository  │  ← 데이터 접근, 쿼리 실행              │
│  │  (Adapter)  │                                      │
│  └─────────────┘                                      │
└───────────────────────────────────────────────────────┘
```

### Dependency Direction

- **Rule**: [MUST] Dependencies must always flow only in the direction of Controller → Service → Repository. Reverse dependencies (Repository → Service, Service → Controller) are prohibited.

### Business Logic Concentration

- **Rule**: [MUST] All business logic exists only in the Service layer. Controller and Repository must not make business decisions.

### Data Access Isolation

- **Rule**: [MUST] Repository is the sole entry point for data access and performs only the role of purely storing/retrieving data.

### Layer Independence

- **Rule**: [SHOULD] Each layer must not know the internal implementation of adjacent layers.

### Monorepo Dependency Direction

- **Rule**: [MUST] Dependencies must flow only in the direction of Application (API service) → Library (shared domain logic). Reverse dependencies are prohibited, and direct calls between the same layer should be avoided.

## Responsibility Matrix by Layer

| Action                                                      | Controller |    Service    | Repository |
| ----------------------------------------------------------- | :--------: | :-----------: | :--------: |
| HTTP request/response handling                              |     O      |       X       |     X      |
| Input validation (DTO validation)                           |     O      |       X       |     X      |
| Business logic (conditional branching, calculations)        |     X      |       O       |     X      |
| Domain rule validation (stock check, permission check, etc) |     X      |       O       |     X      |
| Transaction management (@Transactional)                     |     X      |       O       |     X      |
| Calling other Services                                      |     X      | O (with rules) |     X      |
| Calling Repository                                          |     X      |       O       |     X      |
| Simple CRUD operations (find, save, delete)                 |     X      |       X       |     O      |
| Dynamic query building (assembling filter conditions)       |     X      |       X       |     O      |
| Statistics/aggregation queries (GROUP BY, SUM, etc)         |     X      |       X       |     O      |
| Business conditional branching (if/else decisions)          |     X      |       X       | **Prohibited** |
| Calling other Repository/Service                            |     X      |       X       | **Prohibited** |
| External API calls                                          |     X      |       O       |     X      |
| Throwing business/HTTP exceptions (HttpException, etc)      |     O      |       O       | **Prohibited** |

### "Where does this code belong?" Decision Checklist

1. **"Does this code depend on the HTTP protocol?"** → If Yes, **Controller**
2. **"Can this code run without a DB?"** → If Yes, **Service**
3. **"Is this code purely data retrieval/storage?"** → If Yes, **Repository**

## Repository Rules

> For TypeORM-specific detailed rules such as Repository injection methods and find options, refer to TYPEORM_CONVENTION.md.

### Allowed Patterns

#### 1. Simple CRUD and Conditional Queries

- **Rule**: [MUST] Use Repository API (`find`, `findOne`, `save`, etc.) for simple CRUD and conditional queries.
- **Good Example**:

  ```typescript
  @Injectable()
  export class OrderRepository extends Repository<Order> {
    constructor(private dataSource: DataSource) {
      super(Order, dataSource.createEntityManager());
    }

    async findByUserId(userId: string): Promise<Order[]> {
      return this.find({
        where: { userId },
        relations: { items: true },
        order: { createdAt: "DESC" },
      });
    }
  }
  ```

#### 2. Dynamic Query Building

- **Rule**: [MUST] Logic that dynamically assembles WHERE clauses based on filter conditions is placed in the Repository.
- **Good Example**:
  ```typescript
  async findByFilter(filter: GetOrderListQueryDto): Promise<[Order[], number]> {
    const qb = this.createQueryBuilder('order');
    if (filter.status) {
      qb.andWhere('order.status = :status', { status: filter.status });
    }
    if (filter.startDate) {
      qb.andWhere('order.createdAt >= :startDate', { startDate: filter.startDate });
    }
    qb.orderBy('order.createdAt', 'DESC')
      .take(filter.size)
      .skip((filter.page - 1) * filter.size);
    return qb.getManyAndCount();
  }
  ```

#### 3. Statistics/Aggregation Queries

- **Rule**: [MUST] Statistics/aggregation queries such as GROUP BY, SUM, COUNT are placed in the Repository.
- **Good Example**:
  ```typescript
  async getOrderStatsByUserId(userId: string): Promise<{ totalCount: number; totalAmount: number }> {
    const result = await this.createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalCount')
      .addSelect('SUM(order.totalAmount)', 'totalAmount')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status != :status', { status: OrderStatus.CANCELLED })
      .getRawOne();
    return { totalCount: Number(result.totalCount), totalAmount: Number(result.totalAmount) };
  }
  ```

### Prohibited Patterns

#### 1. Business Conditional Branching

- **Rule**: [MUST NOT] Do not perform branching logic based on business conditions in the Repository.
- **Good Example** (handled in Service):
  ```typescript
  @Injectable()
  export class ProductService {
    async decreaseStock(productId: string, quantity: number): Promise<Product> {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });
      if (!product)
        throw new NotFoundException(
          `상품 ID ${productId}을(를) 찾을 수 없습니다.`,
        );
      if (product.stock < quantity)
        throw new BadRequestException("재고가 부족합니다.");
      product.stock -= quantity;
      return this.productRepository.save(product);
    }
  }
  ```

#### 2. Domain Validation

- **Rule**: [MUST NOT] Do not perform domain rule validation in the Repository.
- **Good Example** (handled in Service):
  ```typescript
  @Injectable()
  export class OrderService {
    async cancelOrder(orderId: string): Promise<Order> {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });
      if (!order)
        throw new NotFoundException(
          `주문 ID ${orderId}을(를) 찾을 수 없습니다.`,
        );
      if (order.status === OrderStatus.SHIPPED)
        throw new BadRequestException("배송 중인 주문은 취소할 수 없습니다.");
      if (order.status === OrderStatus.DELIVERED)
        throw new BadRequestException("배송 완료된 주문은 취소할 수 없습니다.");
      order.status = OrderStatus.CANCELLED;
      return this.orderRepository.save(order);
    }
  }
  ```

#### 3. Calling Other Repository/Service

- **Rule**: [MUST NOT] A Repository must not inject or call other Repositories or Services.
- **Good Example** (composed in Service):

  ```typescript
  @Injectable()
  export class OrderService {
    constructor(
      private readonly orderRepository: OrderRepository,
      private readonly productRepository: ProductRepository,
      private readonly userRepository: UserRepository,
    ) {}

    @Transactional()
    async createOrder(dto: CreateOrderDto): Promise<Order> {
      const product = await this.productRepository.findOne({
        where: { id: dto.productId },
      });
      if (!product) throw new NotFoundException("상품을 찾을 수 없습니다.");
      const user = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
      if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");
      const order = this.orderRepository.create({
        ...dto,
        totalAmount: product.price * dto.quantity,
      });
      return this.orderRepository.save(order);
    }
  }
  ```

#### 4. Data Processing/Transformation

- **Rule**: [MUST NOT] Do not process or transform query results into business-meaning DTOs in the Repository.
- **Good Example**: The Repository returns the Entity as-is, and the Service transforms it according to business logic.

  ```typescript
  // Repository - Entity를 그대로 반환
  async findOneWithDetails(orderId: string): Promise<Order | null> {
    return this.findOne({ where: { id: orderId }, relations: { items: true, user: true } });
  }

  // Service - 비즈니스 로직에 맞게 변환
  async getOrderSummary(orderId: string): Promise<OrderSummaryDto> {
    const order = await this.orderRepository.findOneWithDetails(orderId);
    if (!order) throw new NotFoundException(`주문 ID ${orderId}을(를) 찾을 수 없습니다.`);
    return {
      orderId: order.id,
      customerName: order.user.name,
      totalItems: order.items.length,
      totalAmount: order.totalAmount,
      discountedAmount: this.calculateDiscount(order),
      statusLabel: this.getStatusLabel(order.status),
    };
  }
  ```

## Service-to-Service Dependency Rules (Monorepo)

### Monorepo Layer Structure

```
┌───────────────────────────────────────────────────┐
│  Application Layer (각 배포 단위)                   │
│  ┌───────────┐  ┌───────────┐                     │
│  │ user-api  │  │ admin-api │  ...                │
│  └─────┬─────┘  └─────┬─────┘                     │
│        │               │                          │
│  ──────┼───────────────┼────── 경계 ────────────  │
│        ▼               ▼                          │
│  Library/Domain Layer (공유 도메인 로직)                    │
│  ┌───────────┐  ┌─────────────┐                   │
│  │ order-lib │  │ payment-lib │  ...              │
│  └───────────┘  └─────────────┘                   │
└───────────────────────────────────────────────────┘
```

### Dependency Direction Matrix

| Call Direction              | Allowed |                Description                |
| --------------------------- | :-----: | ----------------------------------------- |
| Application → Library       |    O    | Normal dependency direction               |
| Application → Application   | **Prohibited** | Direct dependency between API services is prohibited |
| Library → Library           | **Discouraged** | Only when unavoidable; prefer composition at the Application level |
| Library → Application       | **Prohibited** | Reverse dependency is prohibited          |

### Application → Library (Allowed)

- **Rule**: [MUST] Application Service injects and uses Library Service.
- **Good Example**:

  ```typescript
  // apps/user-api/src/order/order.service.ts (Application)
  import { OrderLibService } from "@sellernote/order-lib";
  import { PaymentLibService } from "@sellernote/payment-lib";

  @Injectable()
  export class UserOrderService {
    constructor(
      private readonly orderLibService: OrderLibService,
      private readonly paymentLibService: PaymentLibService,
    ) {}

    async createOrder(dto: CreateOrderDto): Promise<Order> {
      const order = await this.orderLibService.createOrder(dto);
      await this.paymentLibService.requestPayment(order.id, dto.paymentMethod);
      return order;
    }
  }
  ```

### Application → Application (Prohibited)

- **Rule**: [MUST NOT] Do not directly depend between Application services.
- **Good Example** (extract common logic to Library):

  ```typescript
  // packages/order-lib/src/order.service.ts (Library)
  @Injectable()
  export class OrderLibService {
    async cancelOrder(orderId: string): Promise<Order> { ... }
  }

  // apps/admin-api/src/order/order.service.ts (Application)
  import { OrderLibService } from '@sellernote/order-lib';

  @Injectable()
  export class AdminOrderService {
    constructor(private readonly orderLibService: OrderLibService) {}
    async cancelOrder(orderId: string): Promise<Order> {
      return this.orderLibService.cancelOrder(orderId);
    }
  }
  ```

### Library → Library (Discouraged)

- **Rule**: [SHOULD NOT] Minimize direct dependencies between Libraries. Prefer composing at the Application level.
- **Good Example** (composed at Application level):

  ```typescript
  // packages/order-lib - 독립적
  // packages/payment-lib - 독립적

  // apps/user-api/src/order/order.service.ts (Application) - 조합
  @Injectable()
  export class UserOrderService {
    constructor(
      private readonly orderLibService: OrderLibService,
      private readonly paymentLibService: PaymentLibService,
    ) {}

    @Transactional()
    async createOrderWithPayment(dto: CreateOrderDto): Promise<Order> {
      const order = await this.orderLibService.createOrder(dto);
      await this.paymentLibService.requestPayment(order.id, dto.paymentMethod);
      return order;
    }
  }
  ```

### Library → Application (Prohibited)

- **Rule**: [MUST NOT] A Library must not depend on an Application.

## Anti-Patterns

### Fat Repository

- **Description**: A pattern where business logic gradually accumulates in the Repository, causing it to behave like a Service.
- **Symptoms**: `if/else` business branching in Repository methods, directly throwing `HttpException`, performing "state change + validation + save" all at once.
- **Solution**: Move all business logic (validation, calculations, state changes) to the Service.

### Anemic Service

- **Description**: A pattern where the Service contains no business logic and simply calls Repository methods.
- **Solution**: Even for simple CRUD, perform at least minimal logic such as null checks, exception handling, and logging in the Service.

  ```typescript
  @Injectable()
  export class OrderService {
    async findOne(id: string): Promise<Order> {
      const order = await this.orderRepository.findOne({ where: { id } });
      if (!order)
        throw new NotFoundException(`주문 ID ${id}을(를) 찾을 수 없습니다.`);
      return order;
    }

    @Transactional()
    async create(dto: CreateOrderDto): Promise<Order> {
      const orderNumber = this.generateOrderNumber();
      const order = this.orderRepository.create({
        ...dto,
        orderNumber,
        status: OrderStatus.PENDING,
      });
      return this.orderRepository.save(order);
    }
  }
  ```

### Cross-Layer Dependency

- **Description**: A pattern where a Repository injects other Repositories or Services, creating dependencies that cross layer boundaries.
- **Solution**: Logic that composes multiple Repositories/Services is always performed in the Service.

### Direct Calls Between Applications

- **Description**: A pattern where Applications (deployment units) in a monorepo directly import and depend on each other.
- **Solution**: Extract commonly used logic into a Library package, and each Application depends only on Libraries.