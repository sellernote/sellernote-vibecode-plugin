# 아키텍처 컨벤션

> 이 문서는 백엔드 아키텍처의 레이어별 책임 경계와 클린 아키텍처 원칙을 정의합니다.
> 기존 3-레이어 구조를 유지하면서, 각 레이어가 해야 할 일과 하지 말아야 할 일을 명확히 구분합니다.
>
> 상위 규칙: [백엔드 공통 컨벤션](../BACKEND_CONVENTION.md)

## 클린 아키텍처 핵심 원칙

3-레이어 구조(Controller → Service → Repository)를 클린 아키텍처 관점에서 매핑하면 다음과 같다.

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

### 의존성 방향

> 의존성 방향의 기본 규칙은 [백엔드 공통 컨벤션](../BACKEND_CONVENTION.md#의존성-방향)을 참조한다.

- **규칙**: [MUST] 의존성은 항상 Controller → Service → Repository 방향으로만 흐른다. 클린 아키텍처 관점에서 Controller와 Repository는 외부 세계(HTTP, DB)에 가까운 어댑터이며, Service는 비즈니스 핵심이다. 역방향 의존(Repository → Service, Service → Controller)은 금지한다.
- **이유**: 역방향 의존이 생기면 인프라 변경 시 비즈니스 로직까지 수정해야 한다. 단방향 의존을 유지해야 각 레이어를 독립적으로 테스트하고 교체할 수 있다.

### 비즈니스 로직 집중

- **규칙**: [MUST] 모든 비즈니스 로직은 Service 레이어에만 존재한다. Controller와 Repository는 비즈니스 판단을 하지 않는다.
- **이유**: 비즈니스 로직이 여러 레이어에 분산되면, 동일한 규칙이 중복 구현되거나, 변경 시 모든 레이어를 수정해야 한다. Service 레이어에 로직을 집중시키면 재사용성, 테스트 용이성, 유지보수성이 모두 향상된다.

### 데이터 접근 격리

- **규칙**: [MUST] Repository는 데이터 접근의 유일한 진입점이며, 순수하게 데이터를 저장/조회하는 역할만 수행한다.
- **이유**: 데이터 접근 로직이 Repository에 격리되면, ORM 교체나 데이터 소스 변경 시 Service 레이어에 영향을 주지 않는다. Repository는 "어떤 데이터를 어떻게 가져올 것인가"만 책임지고, "가져온 데이터로 무엇을 할 것인가"는 Service의 책임이다.

### 레이어 독립성

- **규칙**: [SHOULD] 각 레이어는 인접 레이어의 내부 구현을 알지 못한다.
- **이유**: Service는 Repository가 어떤 쿼리를 실행하는지 알 필요 없고, Repository는 Service의 비즈니스 규칙을 알 필요 없다. 이 독립성이 유지되어야 각 레이어를 독립적으로 테스트하고 교체할 수 있다.

### 모노레포 의존성 방향

- **규칙**: [MUST] Application(API 서비스) → Library(공유 도메인 로직) 방향으로만 의존한다. 역방향 의존은 금지하고, 같은 레이어 간 직접 호출은 지양한다.
- **이유**: 모노레포에서 Application 간 직접 의존이 생기면 배포 단위가 결합되고, Library가 Application에 의존하면 공유 로직이 특정 배포 환경에 종속된다. 단방향 의존만 허용해야 각 서비스를 독립적으로 배포하고 확장할 수 있다.

## 레이어별 책임 매트릭스

코드 리뷰 시 "이 코드가 이 레이어에 있어도 되는가?"를 판단하기 위한 매트릭스이다.

| 행위 | Controller | Service | Repository |
|------|:---:|:---:|:---:|
| HTTP 요청/응답 처리 | O | X | X |
| 입력 값 검증 (DTO validation) | O | X | X |
| 비즈니스 로직 (조건 분기, 계산) | X | O | X |
| 도메인 규칙 검증 (재고 확인, 권한 판단 등) | X | O | X |
| 트랜잭션 관리 (@Transactional) | X | O | X |
| 다른 Service 호출 | X | O (규칙 있음) | X |
| Repository 호출 | X | O | X |
| 단순 CRUD 연산 (find, save, delete) | X | X | O |
| 동적 쿼리 빌딩 (필터 조건 조립) | X | X | O |
| 통계/집계 쿼리 (GROUP BY, SUM 등) | X | X | O |
| 비즈니스 조건 분기 (if/else 판단) | X | X | **금지** |
| 다른 Repository/Service 호출 | X | X | **금지** |
| 외부 API 호출 | X | O | X |
| 비즈니스/HTTP 예외 던지기 (HttpException 등) | O | O | **금지** |

### "이 코드는 어디에?" 판별 체크리스트

코드가 어느 레이어에 위치해야 하는지 판단할 때 다음 3가지 질문을 사용한다.

1. **"이 코드가 HTTP 프로토콜에 의존하는가?"** → Yes면 **Controller**에 있어야 한다.
2. **"이 코드가 DB 없이 실행될 수 있는가?"** → Yes면 **Service**에 있어야 한다.
3. **"이 코드가 순수한 데이터 조회/저장인가?"** → Yes면 **Repository**에 있어야 한다.

## Repository 규칙

Repository는 Custom Repository 클래스(`extends Repository<Entity>`)로 구현하며, 데이터 접근의 유일한 진입점이다. 이 섹션에서는 Repository에서 허용되는 패턴과 금지되는 패턴을 구체적으로 정의한다.

> Repository 주입 방식 및 find 옵션 등 TypeORM 고유의 상세 규칙은 [TypeORM 컨벤션](../typeorm/TYPEORM_CONVENTION.md#repository-패턴)을 참조한다.

### 허용 패턴

#### 1. 단순 CRUD 및 조건 조회

- **규칙**: [MUST] 단순 CRUD 및 조건 조회에는 Repository API(`find`, `findOne`, `save` 등)를 사용한다.
- **이유**: Repository API는 가독성이 높고 타입 안전하며, 단순 데이터 접근에 가장 적합하다.
- **좋은 예시**:
  ```typescript
  @Injectable()
  export class OrderRepository extends Repository<Order> {
    constructor(private dataSource: DataSource) {
      super(Order, dataSource.createEntityManager());
    }

    /** 사용자별 주문 목록 조회 */
    async findByUserId(userId: string): Promise<Order[]> {
      return this.find({
        where: { userId },
        relations: { items: true },
        order: { createdAt: 'DESC' },
      });
    }

    /** 주문번호로 단건 조회 */
    async findOneByOrderNumber(orderNumber: string): Promise<Order | null> {
      return this.findOne({
        where: { orderNumber },
      });
    }
  }
  ```

#### 2. 동적 쿼리 빌딩

- **규칙**: [MUST] 필터 조건에 따라 WHERE 절을 동적으로 조립하는 로직은 Repository에 위치한다.
- **이유**: 동적 쿼리 빌딩은 "어떤 조건으로 데이터를 가져올 것인가"에 해당하므로 데이터 접근 책임이다. 단, 필터 조건 자체의 비즈니스 판단(예: "VIP 사용자만 이 필터를 사용 가능")은 Service에서 수행한다.
- **좋은 예시**:
  ```typescript
  @Injectable()
  export class OrderRepository extends Repository<Order> {
    constructor(private dataSource: DataSource) {
      super(Order, dataSource.createEntityManager());
    }

    /** 필터 조건에 따른 동적 쿼리 */
    async findByFilter(filter: GetOrderListQueryDto): Promise<[Order[], number]> {
      const qb = this.createQueryBuilder('order');

      if (filter.status) {
        qb.andWhere('order.status = :status', { status: filter.status });
      }

      if (filter.startDate) {
        qb.andWhere('order.createdAt >= :startDate', { startDate: filter.startDate });
      }

      if (filter.endDate) {
        qb.andWhere('order.createdAt <= :endDate', { endDate: filter.endDate });
      }

      if (filter.minAmount) {
        qb.andWhere('order.totalAmount >= :minAmount', { minAmount: filter.minAmount });
      }

      qb.orderBy('order.createdAt', 'DESC')
        .take(filter.size)
        .skip((filter.page - 1) * filter.size);

      return qb.getManyAndCount();
    }
  }
  ```

#### 3. 통계/집계 쿼리

- **규칙**: [MUST] GROUP BY, SUM, COUNT 등 통계/집계 쿼리는 Repository에 위치한다.
- **이유**: 집계 연산은 데이터베이스에서 수행하는 것이 효율적이며, SQL 수준의 집계는 데이터 접근 책임에 해당한다.
- **좋은 예시**:
  ```typescript
  @Injectable()
  export class OrderRepository extends Repository<Order> {
    constructor(private dataSource: DataSource) {
      super(Order, dataSource.createEntityManager());
    }

    /** 사용자별 주문 통계 조회 */
    async getOrderStatsByUserId(
      userId: string,
    ): Promise<{ totalCount: number; totalAmount: number }> {
      const result = await this.createQueryBuilder('order')
        .select('COUNT(order.id)', 'totalCount')
        .addSelect('SUM(order.totalAmount)', 'totalAmount')
        .where('order.userId = :userId', { userId })
        .andWhere('order.status != :status', { status: OrderStatus.CANCELLED })
        .getRawOne();

      return {
        totalCount: Number(result.totalCount),
        totalAmount: Number(result.totalAmount),
      };
    }

    /** 일별 매출 통계 */
    async getDailySalesStats(
      startDate: Date,
      endDate: Date,
    ): Promise<{ date: string; orderCount: number; totalAmount: number }[]> {
      return this.createQueryBuilder('order')
        .select('DATE(order.createdAt)', 'date')
        .addSelect('COUNT(order.id)', 'orderCount')
        .addSelect('SUM(order.totalAmount)', 'totalAmount')
        .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
        .groupBy('DATE(order.createdAt)')
        .orderBy('date', 'ASC')
        .getRawMany();
    }
  }
  ```

### 금지 패턴

#### 1. 비즈니스 조건 분기

- **규칙**: [MUST NOT] Repository에서 비즈니스 조건에 따른 분기 로직(재고 확인 후 동작 변경, 할인 적용 여부 판단 등)을 수행하지 않는다.
- **이유**: "재고가 충분한지 확인하고 다른 동작을 수행"하는 것은 비즈니스 판단이며, 이는 Service의 책임이다. Repository에 비즈니스 분기가 들어가면 로직이 분산되어 변경 추적과 테스트가 어려워진다.
- **나쁜 예시**:
  ```typescript
  // Repository에 비즈니스 분기 로직 포함 - 금지!
  @Injectable()
  export class ProductRepository extends Repository<Product> {
    constructor(private dataSource: DataSource) {
      super(Product, dataSource.createEntityManager());
    }

    async decreaseStock(productId: string, quantity: number): Promise<Product> {
      const product = await this.findOne({ where: { id: productId } });

      // 비즈니스 판단이 Repository에 있음!
      if (product.stock < quantity) {
        throw new BadRequestException('재고가 부족합니다.');
      }

      // 비즈니스 로직이 Repository에 있음!
      product.stock -= quantity;
      return this.save(product);
    }
  }
  ```
- **좋은 예시** (Service에서 처리):
  ```typescript
  // Service에서 비즈니스 판단 수행
  @Injectable()
  export class ProductService {
    constructor(private readonly productRepository: ProductRepository) {}

    async decreaseStock(productId: string, quantity: number): Promise<Product> {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`상품 ID ${productId}을(를) 찾을 수 없습니다.`);
      }

      // 비즈니스 판단은 Service에서 수행
      if (product.stock < quantity) {
        throw new BadRequestException('재고가 부족합니다.');
      }

      product.stock -= quantity;
      return this.productRepository.save(product);
    }
  }
  ```

#### 2. 도메인 검증

- **규칙**: [MUST NOT] Repository에서 도메인 규칙 검증(주문 가능 상태인지 판단, 결제 가능 여부 확인 등)을 수행하지 않는다.
- **이유**: 도메인 규칙은 비즈니스 로직의 핵심이며, Service에서 관리해야 규칙 변경 시 한 곳만 수정하면 된다.
- **나쁜 예시**:
  ```typescript
  // Repository에 도메인 검증 로직 포함 - 금지!
  @Injectable()
  export class OrderRepository extends Repository<Order> {
    constructor(private dataSource: DataSource) {
      super(Order, dataSource.createEntityManager());
    }

    async cancelOrder(orderId: string): Promise<Order> {
      const order = await this.findOne({ where: { id: orderId } });

      // 도메인 검증이 Repository에 있음!
      if (order.status === OrderStatus.SHIPPED) {
        throw new BadRequestException('배송 중인 주문은 취소할 수 없습니다.');
      }
      if (order.status === OrderStatus.DELIVERED) {
        throw new BadRequestException('배송 완료된 주문은 취소할 수 없습니다.');
      }

      order.status = OrderStatus.CANCELLED;
      return this.save(order);
    }
  }
  ```
- **좋은 예시** (Service에서 처리):
  ```typescript
  // Service에서 도메인 검증 수행
  @Injectable()
  export class OrderService {
    constructor(private readonly orderRepository: OrderRepository) {}

    async cancelOrder(orderId: string): Promise<Order> {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException(`주문 ID ${orderId}을(를) 찾을 수 없습니다.`);
      }

      // 도메인 검증은 Service에서 수행
      if (order.status === OrderStatus.SHIPPED) {
        throw new BadRequestException('배송 중인 주문은 취소할 수 없습니다.');
      }
      if (order.status === OrderStatus.DELIVERED) {
        throw new BadRequestException('배송 완료된 주문은 취소할 수 없습니다.');
      }

      order.status = OrderStatus.CANCELLED;
      return this.orderRepository.save(order);
    }
  }
  ```

#### 3. 다른 Repository/Service 호출

- **규칙**: [MUST NOT] Repository가 다른 Repository나 Service를 주입받거나 호출하지 않는다.
- **이유**: Repository가 다른 Repository를 호출하면 데이터 접근 로직이 엉키고, 트랜잭션 경계가 모호해진다. 여러 Repository를 조합하는 로직은 Service의 책임이다.
- **나쁜 예시**:
  ```typescript
  // Repository에 다른 Repository를 DI - 금지!
  @Injectable()
  export class OrderRepository extends Repository<Order> {
    constructor(
      private dataSource: DataSource,
      private readonly productRepository: ProductRepository, // 다른 Repository 주입!
      private readonly userRepository: UserRepository,       // 다른 Repository 주입!
    ) {
      super(Order, dataSource.createEntityManager());
    }

    async createOrderWithValidation(dto: CreateOrderDto): Promise<Order> {
      // 다른 Repository 호출!
      const product = await this.productRepository.findOne({
        where: { id: dto.productId },
      });
      const user = await this.userRepository.findOne({
        where: { id: dto.userId },
      });

      const order = this.create({ ...dto, totalAmount: product.price * dto.quantity });
      return this.save(order);
    }
  }
  ```
- **좋은 예시** (Service에서 조합):
  ```typescript
  // Service에서 여러 Repository를 조합
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
      if (!product) {
        throw new NotFoundException('상품을 찾을 수 없습니다.');
      }

      const user = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      const order = this.orderRepository.create({
        ...dto,
        totalAmount: product.price * dto.quantity,
      });
      return this.orderRepository.save(order);
    }
  }
  ```

#### 4. 데이터 가공/변환

- **규칙**: [MUST NOT] Repository에서 조회 결과를 비즈니스 의미의 DTO로 가공하거나 변환하지 않는다.
- **이유**: 데이터 가공/변환은 비즈니스 요구사항에 따라 달라지므로 Service의 책임이다. Repository는 데이터베이스에서 가져온 Entity 또는 Raw 데이터를 그대로 반환해야 한다.
- **나쁜 예시**:
  ```typescript
  // Repository에서 비즈니스 DTO로 변환 - 금지!
  @Injectable()
  export class OrderRepository extends Repository<Order> {
    constructor(private dataSource: DataSource) {
      super(Order, dataSource.createEntityManager());
    }

    async getOrderSummary(orderId: string): Promise<OrderSummaryDto> {
      const order = await this.findOne({
        where: { id: orderId },
        relations: { items: true, user: true },
      });

      // 비즈니스 DTO 변환이 Repository에 있음!
      return {
        orderId: order.id,
        customerName: order.user.name,
        totalItems: order.items.length,
        totalAmount: order.totalAmount,
        discountedAmount: order.totalAmount * 0.9, // 비즈니스 로직!
        statusLabel: this.getStatusLabel(order.status), // 비즈니스 로직!
      };
    }

    private getStatusLabel(status: OrderStatus): string {
      const labels = { PENDING: '결제 대기', CONFIRMED: '결제 완료' };
      return labels[status] || '알 수 없음';
    }
  }
  ```
- **좋은 예시** (Service에서 변환):
  ```typescript
  // Repository는 Entity를 그대로 반환
  @Injectable()
  export class OrderRepository extends Repository<Order> {
    constructor(private dataSource: DataSource) {
      super(Order, dataSource.createEntityManager());
    }

    async findOneWithDetails(orderId: string): Promise<Order | null> {
      return this.findOne({
        where: { id: orderId },
        relations: { items: true, user: true },
      });
    }
  }

  // Service에서 비즈니스 로직에 맞게 변환
  @Injectable()
  export class OrderService {
    constructor(private readonly orderRepository: OrderRepository) {}

    async getOrderSummary(orderId: string): Promise<OrderSummaryDto> {
      const order = await this.orderRepository.findOneWithDetails(orderId);

      if (!order) {
        throw new NotFoundException(`주문 ID ${orderId}을(를) 찾을 수 없습니다.`);
      }

      return {
        orderId: order.id,
        customerName: order.user.name,
        totalItems: order.items.length,
        totalAmount: order.totalAmount,
        discountedAmount: this.calculateDiscount(order),
        statusLabel: this.getStatusLabel(order.status),
      };
    }

    private calculateDiscount(order: Order): number {
      if (order.totalAmount >= 100000) return order.totalAmount * 0.9;
      return order.totalAmount;
    }

    private getStatusLabel(status: OrderStatus): string {
      const labels = { PENDING: '결제 대기', CONFIRMED: '결제 완료' };
      return labels[status] || '알 수 없음';
    }
  }
  ```

## Service 간 의존성 규칙 (모노레포)

모노레포 환경에서 Service 간 의존성 방향을 정의한다. Application(배포 단위)과 Library(공유 도메인 로직) 간의 의존 관계를 명확히 구분한다.

### 모노레포 레이어 구조

```
┌───────────────────────────────────────────────────┐
│  Application Layer (각 배포 단위)                   │
│  ┌───────────┐  ┌───────────┐                     │
│  │ user-api  │  │ admin-api │  ...                │
│  │ (Service) │  │ (Service) │                     │
│  └─────┬─────┘  └─────┬─────┘                     │
│        │               │                          │
│  ──────┼───────────────┼────── 경계 ────────────  │
│        ▼               ▼                          │
│  Library Layer (공유 도메인 로직)                    │
│  ┌───────────┐  ┌─────────────┐                   │
│  │ order-lib │  │ payment-lib │  ...              │
│  │ (Service) │  │  (Service)  │                   │
│  └───────────┘  └─────────────┘                   │
└───────────────────────────────────────────────────┘
```

### 의존성 방향 매트릭스

| 호출 방향 | 허용 여부 | 설명 |
|-----------|:---------:|------|
| Application → Library | O | 정상적인 의존 방향 |
| Application → Application | **금지** | API 서비스 간 직접 의존 금지 |
| Library → Library | **지양** | 불가피한 경우만, 상위 Application에서 조합 우선 |
| Library → Application | **금지** | 역방향 의존 금지 |

### Application → Library (허용)

- **규칙**: [MUST] Application Service는 Library Service를 주입받아 사용한다. 이것이 정상적인 의존 방향이다.
- **이유**: Library는 도메인 로직을 캡슐화한 공유 계층이며, Application은 이를 조합하여 API를 구성한다.
- **좋은 예시**:
  ```typescript
  // apps/user-api/src/order/order.service.ts (Application)
  import { OrderLibService } from '@sellernote/order-lib';
  import { PaymentLibService } from '@sellernote/payment-lib';

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

### Application → Application (금지)

- **규칙**: [MUST NOT] Application 서비스 간에 직접 의존하지 않는다.
- **이유**: Application은 각각 독립적인 배포 단위이다. 직접 의존이 생기면 하나의 Application 변경이 다른 Application의 빌드/배포에 영향을 준다.
- **나쁜 예시**:
  ```typescript
  // apps/admin-api/src/order/order.service.ts (Application)
  // 다른 Application을 직접 import - 금지!
  import { UserOrderService } from '@sellernote/user-api/order/order.service';

  @Injectable()
  export class AdminOrderService {
    constructor(
      private readonly userOrderService: UserOrderService, // Application 간 직접 의존!
    ) {}

    async cancelOrder(orderId: string): Promise<Order> {
      return this.userOrderService.cancelOrder(orderId);
    }
  }
  ```
- **좋은 예시** (공통 로직을 Library로 추출):
  ```typescript
  // packages/order-lib/src/order.service.ts (Library)
  @Injectable()
  export class OrderLibService {
    constructor(private readonly orderRepository: OrderRepository) {}

    async cancelOrder(orderId: string): Promise<Order> {
      const order = await this.orderRepository.findOne({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }
      order.status = OrderStatus.CANCELLED;
      return this.orderRepository.save(order);
    }
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

### Library → Library (지양)

- **규칙**: [SHOULD NOT] Library 간 직접 의존을 최소화한다. 불가피한 경우에만 허용하며, 상위 Application에서 조합하는 방식을 우선한다.
- **이유**: Library 간 의존이 많아지면 의존성 그래프가 복잡해지고, 순환 참조 위험이 커진다. 가능한 한 각 Library는 독립적으로 동작하고, Application Service에서 여러 Library를 조합한다.
- **지양하는 예시**:
  ```typescript
  // packages/order-lib/src/order.service.ts (Library)
  // 다른 Library를 직접 의존 - 지양!
  import { PaymentLibService } from '@sellernote/payment-lib';

  @Injectable()
  export class OrderLibService {
    constructor(
      private readonly orderRepository: OrderRepository,
      private readonly paymentLibService: PaymentLibService, // Library 간 직접 의존
    ) {}

    async createOrderWithPayment(dto: CreateOrderDto): Promise<Order> {
      const order = await this.orderRepository.save(this.orderRepository.create(dto));
      await this.paymentLibService.requestPayment(order.id, dto.paymentMethod);
      return order;
    }
  }
  ```
- **좋은 예시** (Application에서 조합):
  ```typescript
  // packages/order-lib/src/order.service.ts (Library) - 독립적
  @Injectable()
  export class OrderLibService {
    constructor(private readonly orderRepository: OrderRepository) {}

    async createOrder(dto: CreateOrderDto): Promise<Order> {
      return this.orderRepository.save(this.orderRepository.create(dto));
    }
  }

  // packages/payment-lib/src/payment.service.ts (Library) - 독립적
  @Injectable()
  export class PaymentLibService {
    constructor(private readonly paymentRepository: PaymentRepository) {}

    async requestPayment(orderId: string, method: PaymentMethod): Promise<Payment> {
      return this.paymentRepository.save(
        this.paymentRepository.create({ orderId, method }),
      );
    }
  }

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

### Library → Application (금지)

- **규칙**: [MUST NOT] Library가 Application을 의존하지 않는다.
- **이유**: Library가 특정 Application에 의존하면 공유 계층으로서의 역할을 상실하고, 다른 Application에서 재사용이 불가능해진다.
- **나쁜 예시**:
  ```typescript
  // packages/order-lib/src/order.service.ts (Library)
  // Application을 import - 금지!
  import { AdminNotificationService } from '@sellernote/admin-api/notification/notification.service';

  @Injectable()
  export class OrderLibService {
    constructor(
      private readonly orderRepository: OrderRepository,
      private readonly adminNotificationService: AdminNotificationService, // 역방향 의존!
    ) {}
  }
  ```

## 안티패턴

### Fat Repository

- **설명**: Repository에 비즈니스 로직이 점점 쌓여서 Repository가 Service처럼 동작하는 패턴이다.
- **징후**:
  - Repository 메서드에 `if/else` 비즈니스 분기가 존재한다.
  - Repository가 `HttpException`을 직접 던진다.
  - Repository 메서드가 단순 CRUD를 넘어서 "상태 변경 + 검증 + 저장"을 한 번에 수행한다.
  - Repository 파일의 코드량이 Service보다 많다.
- **나쁜 예시**:
  ```typescript
  @Injectable()
  export class OrderRepository extends Repository<Order> {
    constructor(private dataSource: DataSource) {
      super(Order, dataSource.createEntityManager());
    }

    // Fat Repository: 비즈니스 로직이 Repository에 집중됨
    async processOrder(orderId: string): Promise<Order> {
      const order = await this.findOne({
        where: { id: orderId },
        relations: { items: true },
      });

      if (!order) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }

      // 비즈니스 검증이 Repository에 있음
      if (order.items.length === 0) {
        throw new BadRequestException('주문 항목이 없습니다.');
      }

      // 비즈니스 계산이 Repository에 있음
      const totalAmount = order.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // 비즈니스 상태 변경이 Repository에 있음
      order.totalAmount = totalAmount;
      order.status = OrderStatus.CONFIRMED;

      return this.save(order);
    }
  }
  ```
- **해결 방법**: 비즈니스 로직(검증, 계산, 상태 변경)을 모두 Service로 이동한다. Repository는 `findOne`, `save` 등 순수 데이터 접근만 수행한다.

### Anemic Service

- **설명**: Service가 비즈니스 로직 없이 단순히 Repository 메서드를 호출하기만 하는 패턴이다. Service가 사실상 pass-through 레이어가 된다.
- **징후**:
  - Service 메서드가 `return this.repository.find(...)` 한 줄로 끝난다.
  - Service에 비즈니스 로직이 전혀 없고, 모든 로직이 Repository에 있다 (Fat Repository와 같이 발생하는 경우가 많다).
  - Service가 Repository의 인터페이스를 그대로 노출한다.
- **나쁜 예시**:
  ```typescript
  @Injectable()
  export class OrderService {
    constructor(private readonly orderRepository: OrderRepository) {}

    // Anemic Service: 단순 pass-through
    async findAll(): Promise<Order[]> {
      return this.orderRepository.find();
    }

    async findOne(id: string): Promise<Order> {
      return this.orderRepository.findOne({ where: { id } });
    }

    async create(dto: CreateOrderDto): Promise<Order> {
      return this.orderRepository.save(this.orderRepository.create(dto));
    }

    async delete(id: string): Promise<void> {
      await this.orderRepository.softDelete(id);
    }
  }
  ```
- **해결 방법**: 단순 CRUD라도 Service 레이어는 유지한다 (향후 비즈니스 로직 추가 대비). 다만, null 체크, 예외 처리, 로깅 등 최소한의 로직은 Service에서 수행한다. 과도하게 모든 Repository 메서드를 1:1로 래핑하는 것은 지양한다.
  ```typescript
  @Injectable()
  export class OrderService {
    constructor(private readonly orderRepository: OrderRepository) {}

    async findOne(id: string): Promise<Order> {
      const order = await this.orderRepository.findOne({ where: { id } });

      // 최소한의 비즈니스 처리: 존재 여부 검증
      if (!order) {
        throw new NotFoundException(`주문 ID ${id}을(를) 찾을 수 없습니다.`);
      }

      return order;
    }

    @Transactional()
    async create(dto: CreateOrderDto): Promise<Order> {
      // 비즈니스 규칙 적용
      const orderNumber = this.generateOrderNumber();
      const order = this.orderRepository.create({
        ...dto,
        orderNumber,
        status: OrderStatus.PENDING,
      });

      return this.orderRepository.save(order);
    }

    private generateOrderNumber(): string {
      return `ORD-${Date.now()}`;
    }
  }
  ```

### Cross-Layer Dependency

- **설명**: Repository가 다른 Repository나 Service를 주입받아 레이어 경계를 넘는 의존성을 가지는 패턴이다.
- **징후**:
  - Repository의 생성자에 다른 Repository 또는 Service가 DI된다.
  - Repository 메서드에서 다른 테이블을 직접 조회하거나 수정한다 (해당 Entity의 관계가 아닌 별개의 Entity).
  - Repository가 외부 서비스(HTTP 클라이언트, 메시지 큐 등)를 호출한다.
- **나쁜 예시**:
  ```typescript
  @Injectable()
  export class OrderRepository extends Repository<Order> {
    constructor(
      private dataSource: DataSource,
      private readonly userRepository: UserRepository,   // Cross-Layer 의존!
      private readonly inventoryService: InventoryService, // Service를 Repository가 의존!
    ) {
      super(Order, dataSource.createEntityManager());
    }

    async createOrderWithInventoryCheck(dto: CreateOrderDto): Promise<Order> {
      const user = await this.userRepository.findOne({ where: { id: dto.userId } });
      const available = await this.inventoryService.checkStock(dto.productId);
      // ...
    }
  }
  ```
- **해결 방법**: 여러 Repository/Service를 조합하는 로직은 항상 Service에서 수행한다. Repository는 자신의 Entity에 대한 데이터 접근만 담당한다.

### Application 간 직접 호출

- **설명**: 모노레포에서 Application(배포 단위) 간에 직접 import하여 의존하는 패턴이다.
- **징후**:
  - `import { ... } from '@sellernote/user-api/...'` 형태로 다른 Application의 코드를 import한다.
  - 하나의 Application을 배포할 때 다른 Application도 함께 빌드해야 한다.
  - Application 간 순환 의존이 발생한다.
- **나쁜 예시**:
  ```typescript
  // apps/admin-api의 Service에서 user-api를 직접 import - 금지!
  import { UserService } from '@sellernote/user-api/user/user.service';
  import { UserRepository } from '@sellernote/user-api/user/user.repository';

  @Injectable()
  export class AdminUserService {
    constructor(
      private readonly userService: UserService, // Application 간 직접 의존!
    ) {}

    async getUsers(): Promise<User[]> {
      return this.userService.findAll();
    }
  }
  ```
- **해결 방법**: 공통으로 사용하는 로직을 Library 패키지로 추출하고, 각 Application은 Library만 의존한다.
  ```typescript
  // packages/user-lib/src/user.service.ts (Library로 추출)
  @Injectable()
  export class UserLibService {
    constructor(private readonly userRepository: UserRepository) {}

    async findAll(): Promise<User[]> {
      return this.userRepository.find();
    }
  }

  // apps/admin-api/src/user/user.service.ts (Application)
  import { UserLibService } from '@sellernote/user-lib';

  @Injectable()
  export class AdminUserService {
    constructor(private readonly userLibService: UserLibService) {}

    async getUsers(): Promise<User[]> {
      return this.userLibService.findAll();
    }
  }
  ```

## 참고 자료

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [The Clean Architecture (도서) - Robert C. Martin](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164)
- [NestJS 공식 문서](https://docs.nestjs.com/)
- [백엔드 공통 컨벤션](../BACKEND_CONVENTION.md)
