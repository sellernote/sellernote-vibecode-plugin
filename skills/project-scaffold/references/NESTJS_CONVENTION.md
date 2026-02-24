# NestJS 컨벤션

> 이 문서는 NestJS 프로젝트에 적용되는 규칙을 정의합니다.
> 상위 규칙: [백엔드 공통 컨벤션](../BACKEND_CONVENTION.md)

## 기술 스택

| 항목 | 버전/설정 |
|------|----------|
| Node.js | TBD |
| NestJS | TBD |
| TypeScript | TBD |
| ORM | TBD (예: TypeORM, Prisma) |
| @sellernote/sellernote-nestjs-api-property | TBD |
| 패키지 매니저 | TBD (예: pnpm, yarn, npm) |
| 테스트 프레임워크 | Jest (NestJS 기본) |

## 프로젝트 구조

### 디렉토리 레이아웃

- **규칙**: [MUST] 기능(Feature) 기반의 모듈 구조를 따른다.
- **이유**: 기능 단위로 파일을 응집시키면, 관련 코드를 빠르게 탐색할 수 있고 모듈 간 결합도가 낮아진다.

```
src/
├── main.ts                          # 앱 진입점
├── app.module.ts                    # 루트 모듈
│
├── common/                          # 공용 유틸리티
│   ├── constants/                   # 상수 정의
│   ├── decorators/                  # 커스텀 데코레이터
│   ├── dto/                         # 공통 DTO (페이지네이션 등)
│   ├── filters/                     # 전역 Exception Filter
│   ├── guards/                      # 전역 Guard
│   ├── interceptors/                # 전역 Interceptor
│   ├── interfaces/                  # 공통 인터페이스
│   ├── middleware/                   # 미들웨어
│   └── pipes/                       # 전역 Pipe
│
├── config/                          # 환경 설정 모듈
│   ├── config.module.ts
│   └── configuration.ts
│
├── modules/                         # 기능 모듈
│   ├── auth/                        # 인증 모듈
│   │   ├── auth.module.ts
│   │   ├── controllers/
│   │   │   └── auth.controller.ts
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   └── auth.service.spec.ts
│   │
│   ├── user/                        # 사용자 모듈
│   │   ├── user.module.ts
│   │   ├── controllers/
│   │   │   └── user.controller.ts
│   │   ├── services/
│   │   │   └── user.service.ts
│   │   ├── repositories/
│   │   │   └── user.repository.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   └── user.service.spec.ts
│   │
│   └── order/                       # 주문 모듈 (예시)
│       ├── order.module.ts
│       ├── ...
│
└── shared/                          # 공유 모듈 (DB, 메일 등)
    ├── database/
    │   └── database.module.ts
    └── mail/
        └── mail.module.ts
```

### 파일 네이밍

- **규칙**: [MUST] 파일명은 `[이름].[타입].ts` 패턴을 따른다.
- **이유**: NestJS CLI와 일관되며, 파일 유형을 이름만으로 파악할 수 있다.

| 타입 | 패턴 | 예시 |
|------|------|------|
| 모듈 | `[name].module.ts` | `order.module.ts` |
| 컨트롤러 | `[name].controller.ts` | `order.controller.ts` |
| 컨트롤러 (분할) | `[기능]-[name].controller.ts` | `order-crud.controller.ts` |
| 서비스 | `[name].service.ts` | `order.service.ts` |
| 서비스 (분할) | `[기능]-[name].service.ts` | `order-fulfillment.service.ts` |
| 리포지토리 | `[name].repository.ts` | `order.repository.ts` |
| 엔티티 | `[name].entity.ts` | `order.entity.ts` |
| DTO | `[동작]-[name].dto.ts` | `create-order.dto.ts` |
| Guard | `[name].guard.ts` | `jwt-auth.guard.ts` |
| Interceptor | `[name].interceptor.ts` | `logging.interceptor.ts` |
| Pipe | `[name].pipe.ts` | `parse-int.pipe.ts` |
| Filter | `[name].filter.ts` | `http-exception.filter.ts` |
| 테스트 | `[name].[타입].spec.ts` | `order.service.spec.ts` |

## Domain Model Interface

### Domain Model Interface 정의

- **규칙**: [MUST] 각 도메인 모델에 Domain Model Interface를 정의한다. 해당 모델 고유의 데이터 필드만 포함하며, relation 필드는 제외한다.
- **이유**: Domain Model Interface는 도메인의 데이터 구조를 기술(Technology)에 독립적으로 정의하는 계약(contract)이다. Entity, DTO, Mapper 등 여러 레이어에서 이 인터페이스를 기준으로 동작하므로, 도메인 데이터의 단일 진실 공급원(Single Source of Truth) 역할을 한다.
- **좋은 예시**:
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
- **나쁜 예시**:
  ```typescript
  // Interface 없이 Entity를 직접 참조 — 레이어 간 결합도 증가
  // 도메인 데이터 구조가 ORM 기술에 종속됨
  import { Order } from '../entities/order.entity';

  export class OrderMapper {
    toDto(entity: Order): OrderResponseDto { ... } // Entity 직접 의존
  }
  ```

### DTO Mapper에서의 활용

- **규칙**: [MUST] DTO Mapper는 Domain Model Interface를 기준으로 DTO ↔ 도메인 데이터 매핑을 수행한다.
- **이유**: Mapper가 Entity가 아닌 Interface에 의존하면, Entity 구현 변경(ORM 교체 등)에도 Mapper 코드가 영향받지 않는다. 또한 테스트 시 Interface만 만족하는 목(mock) 데이터로 쉽게 검증할 수 있다.
- **좋은 예시**:
  ```typescript
  // modules/order/mappers/order.mapper.ts
  import type { IOrderModel } from '../interfaces/order.model.interface';
  import { OrderResponseDto } from '../dto/order-response.dto';
  import { CreateOrderDto } from '../dto/create-order.dto';

  export class OrderMapper {
    /** Domain Model → Response DTO */
    static toResponseDto(model: IOrderModel): OrderResponseDto {
      const dto = new OrderResponseDto();
      dto.id = model.id;
      dto.orderNumber = model.orderNumber;
      dto.totalAmount = model.totalAmount.toString(); // number → string (금액)
      dto.status = model.status;
      dto.createdAt = model.createdAt.toISOString();
      return dto;
    }

    /** Create DTO → Domain Model (부분) */
    static fromCreateDto(dto: CreateOrderDto): Partial<IOrderModel> {
      return {
        orderNumber: dto.orderNumber,
        totalAmount: Number(dto.totalAmount), // string → number
        status: 'PENDING',
        userId: dto.userId,
      };
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // Entity를 직접 Mapper 파라미터로 사용 — ORM 종속
  import { Order } from '../entities/order.entity';

  export class OrderMapper {
    static toResponseDto(entity: Order): OrderResponseDto {
      // Entity의 relation, 데코레이터 등 ORM 세부사항에 결합됨
      const dto = new OrderResponseDto();
      dto.id = entity.id;
      dto.orderNumber = entity.orderNumber;
      return dto;
    }
  }
  ```

### Entity에서의 구현

- **규칙**: [MUST] Entity는 Domain Model Interface를 `implements`하여 구현한다.
- **이유**: Entity가 Interface를 구현하면, 도메인에서 정의한 필수 데이터 필드가 Entity에 반드시 포함됨을 컴파일 타임에 보장한다. 필드 누락 시 TypeScript 컴파일 에러가 발생한다.
- **좋은 예시**:
  ```typescript
  // modules/order/entities/order.entity.ts
  import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
  import { BaseEntity } from './base.entity';
  import type { IOrderModel } from '../interfaces/order.model.interface';

  @Entity('order')
  export class Order extends BaseEntity implements IOrderModel {
    @Column({ type: 'varchar', length: 100 })
    orderNumber: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    totalAmount: number;

    @Column({ type: 'varchar', length: 20 })
    status: string;

    @Column({ type: 'char', length: 36 })
    userId: string;

    // Relation은 Interface에 포함하지 않음 — Entity에서만 정의
    @ManyToOne(() => User, (user) => user.orders)
    @JoinColumn({ name: 'user_id' })
    user: Relation<User>;
  }
  ```

### 디렉토리 구조

- **규칙**: [MUST] Domain Model Interface 파일은 `modules/{feature}/interfaces/` 디렉토리에 `{feature}.model.interface.ts` 패턴으로 배치한다.
- **이유**: 인터페이스를 별도 디렉토리로 분리하면, Entity·DTO·Mapper 등 여러 곳에서 순환 참조 없이 import할 수 있다.
- **좋은 예시**:
  ```
  modules/order/
  ├── order.module.ts
  ├── controllers/
  │   └── order.controller.ts            # Controller
  ├── services/
  │   └── order.service.ts               # Service
  ├── repositories/
  │   └── order.repository.ts            # Repository
  ├── interfaces/
  │   ├── order.model.interface.ts       # Domain Model Interface
  │   └── order-model-relation.interface.ts  # Relation Interface (선택)
  ├── entities/
  │   └── order.entity.ts                # Entity (Interface 구현)
  ├── dto/
  │   ├── create-order.dto.ts
  │   └── order-response.dto.ts
  └── mappers/
      └── order.mapper.ts                # DTO ↔ Domain 매핑
  ```

## 금액 처리

### 금액 DTO 필드 타입

- **규칙**: [MUST] 금액을 표현하는 DTO 필드는 `string` 타입으로 정의한다.
- **이유**: JavaScript의 `number`는 IEEE 754 배정밀도 부동소수점(64bit)으로, 소수 연산 시 정밀도 손실이 발생한다. 예를 들어 `0.1 + 0.2 === 0.30000000000000004`이다. 금액을 `string`으로 전송하면 정밀도 손실 없이 클라이언트-서버 간 안전하게 데이터를 교환할 수 있다.
- **좋은 예시**:
  ```typescript
  export class CreateOrderDto {
    @SellernoteApiDecimal({
      description: '총 주문 금액',
      isRequired: true,
    })
    totalAmount: string; // 금액은 string으로 전달

    @SellernoteApiDecimal({
      description: '할인 금액',
      isRequired: false,
    })
    discountAmount?: string;
  }
  ```
- **나쁜 예시**:
  ```typescript
  export class CreateOrderDto {
    @SellernoteApiNumber({
      description: '총 주문 금액',
      isRequired: true,
    })
    totalAmount: number; // IEEE 754 부동소수점 — 정밀도 손실 위험
  }
  ```

### Swagger 금액 문서화

- **규칙**: [MUST] 금액 DTO 필드의 Swagger 문서화에 `@sellernote/sellernote-nestjs-api-property`의 `@SellernoteApiDecimal` 데코레이터를 사용한다.
- **이유**: `@SellernoteApiDecimal`은 Swagger 문서화, class-validator 검증(소수 문자열 형식 검증), class-transformer 변환을 하나의 데코레이터로 통합 처리한다. `@SellernoteApiNumber`는 금액의 정밀도 요구사항을 표현하지 못한다.
- **좋은 예시**:
  ```typescript
  import { SellernoteApiDecimal, SellernoteApiString } from '@sellernote/sellernote-nestjs-api-property';

  export class OrderResponseDto {
    @SellernoteApiString({
      description: '주문 번호',
      isRequired: true,
    })
    orderNumber: string;

    @SellernoteApiDecimal({
      description: '총 주문 금액',
      isRequired: true,
    })
    totalAmount: string; // @SellernoteApiDecimal + string 타입

    @SellernoteApiDecimal({
      description: '할인 금액',
      isRequired: false,
    })
    discountAmount?: string;
  }
  ```
- **나쁜 예시**:
  ```typescript
  import { SellernoteApiNumber } from '@sellernote/sellernote-nestjs-api-property';

  export class OrderResponseDto {
    @SellernoteApiNumber({
      description: '총 주문 금액',
      isRequired: true,
    })
    totalAmount: number; // @SellernoteApiNumber 사용 — 금액 정밀도 부적합
  }
  ```

### 금액 연산 라이브러리

- **규칙**: [MUST] 금액 연산에는 `big.js` 라이브러리를 사용한다.
- **이유**: `big.js`는 임의 정밀도(arbitrary-precision) 십진 연산을 제공하여 부동소수점 오차 없이 금액을 계산할 수 있다. 동일 저자의 `decimal.js`와 비교하여 번들 크기가 작고(~6KB vs ~12KB), 금액 계산에 필요한 사칙연산에 최적화되어 있다. `decimal.js`는 로그, 삼각함수 등 과학적 연산에 적합하므로, 금액 처리에는 `big.js`가 더 적절하다.
- **좋은 예시**:
  ```typescript
  import Big from 'big.js';

  // 주문 총액 계산
  function calculateOrderTotal(items: { price: string; quantity: number }[]): string {
    let total = new Big(0);

    for (const item of items) {
      const lineTotal = new Big(item.price).times(item.quantity);
      total = total.plus(lineTotal);
    }

    return total.toFixed(2); // "15000.00" — string 반환
  }

  // 할인 적용
  function applyDiscount(amount: string, discountRate: string): string {
    const original = new Big(amount);
    const discount = original.times(new Big(discountRate));
    return original.minus(discount).toFixed(2);
  }

  // 금액 비교
  function isOverBudget(amount: string, budget: string): boolean {
    return new Big(amount).gt(new Big(budget));
  }
  ```
- **나쁜 예시**:
  ```typescript
  // JavaScript number 직접 연산 — 정밀도 손실
  function calculateTotal(price: number, quantity: number): number {
    return price * quantity; // 0.1 * 3 === 0.30000000000000004
  }

  // 소수점 반올림으로 회피 시도 — 누적 오차 발생
  function roundedTotal(price: number, quantity: number): number {
    return Math.round(price * quantity * 100) / 100;
  }
  ```

## Controller / Service / Repository 분할

### 분할 원칙

- **규칙**: [MUST] 모든 feature module은 `controllers/`, `services/`, `repositories/` 디렉토리를 사용하여 Controller, Service, Repository 파일을 배치한다.
- **이유**: 디렉토리 구조가 일관되면 파일 탐색이 빠르고, 모듈이 성장할 때 파일을 추가하기만 하면 되므로 구조 변경이 필요 없다.

### Controller 분할

- **규칙**: [SHOULD] Controller가 여러 비즈니스 기능을 다루어 비대해지면, 기능별로 Controller를 분할한다.
- **이유**: 하나의 Controller가 모든 엔드포인트를 담당하면 파일이 비대해지고, 코드 리뷰와 변경 추적이 어려워진다.
- **좋은 예시**:
  ```
  controllers/
  ├── order-crud.controller.ts          # 주문 CRUD 엔드포인트
  └── order-fulfillment.controller.ts   # 출고/배송 관련 엔드포인트
  ```
  ```typescript
  // controllers/order-crud.controller.ts
  @Controller('orders')
  export class OrderCrudController {
    constructor(private readonly orderCrudService: OrderCrudService) {}

    @Post()
    create(@Body() dto: CreateOrderDto) {
      return this.orderCrudService.create(dto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.orderCrudService.findOne(id);
    }
  }

  // controllers/order-fulfillment.controller.ts
  @Controller('orders')
  export class OrderFulfillmentController {
    constructor(
      private readonly orderFulfillmentService: OrderFulfillmentService,
    ) {}

    @Post(':id/ship')
    ship(@Param('id') id: string, @Body() dto: ShipOrderDto) {
      return this.orderFulfillmentService.ship(id, dto);
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 하나의 Controller가 모든 기능을 담당 — 비대해짐
  @Controller('orders')
  export class OrderController {
    @Post() create() { ... }
    @Get(':id') findOne() { ... }
    @Put(':id') update() { ... }
    @Delete(':id') remove() { ... }
    @Post(':id/ship') ship() { ... }
    @Post(':id/cancel') cancel() { ... }
    @Post(':id/refund') refund() { ... }
    @Get(':id/tracking') tracking() { ... }
    // ... 수십 개의 메서드
  }
  ```

### Service 분할

- **규칙**: [SHOULD] Service가 비대해지면, 비즈니스 기능별로 독립적인 Service로 분할한다. 각 Controller는 필요한 Service를 직접 주입받는다.
- **이유**: 단일 책임 원칙(SRP)을 지켜 코드 변경 시 영향 범위를 줄이고, 테스트 단위를 명확히 한다.
- **좋은 예시**:
  ```
  services/
  ├── order-crud.service.ts             # 주문 CRUD 비즈니스 로직
  ├── order-fulfillment.service.ts      # 출고/배송 비즈니스 로직
  └── order-calculation.service.ts      # 금액 계산 로직
  ```
  ```typescript
  // services/order-crud.service.ts
  @Injectable()
  export class OrderCrudService {
    constructor(private readonly orderRepository: OrderRepository) {}

    async create(dto: CreateOrderDto): Promise<Order> { ... }
    async findOne(id: string): Promise<Order> { ... }
  }

  // services/order-fulfillment.service.ts
  @Injectable()
  export class OrderFulfillmentService {
    constructor(private readonly orderRepository: OrderRepository) {}

    async ship(id: string, dto: ShipOrderDto): Promise<Order> { ... }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 하나의 Service가 모든 책임을 짐 — God Service
  @Injectable()
  export class OrderService {
    create() { ... }
    findOne() { ... }
    update() { ... }
    remove() { ... }
    ship() { ... }
    cancel() { ... }
    refund() { ... }
    calculateTotal() { ... }
    // ... 수십 개의 메서드
  }
  ```

### Repository 분할

- **규칙**: [MUST] Repository는 Entity와 1:1로 매핑하여 `repositories/` 디렉토리에 배치한다.
- **이유**: 각 Entity의 데이터 접근 로직이 명확히 분리되어, 쿼리의 위치를 예측할 수 있다.
- **좋은 예시**:
  ```
  repositories/
  ├── order.repository.ts               # Order entity 데이터 접근
  └── order-item.repository.ts          # OrderItem entity 데이터 접근
  ```
- **나쁜 예시**:
  ```typescript
  // 하나의 Repository에서 여러 Entity를 처리
  @Injectable()
  export class OrderRepository {
    findOrder(id: string) { ... }
    findOrderItems(orderId: string) { ... }  // OrderItem은 별도 Repository로
    saveOrderItem(item: OrderItem) { ... }   // 분리해야 한다
  }
  ```

### Module 등록 (분할 시)

- **규칙**: [MUST] 분할된 Controller, Service, Repository는 모두 해당 Feature Module의 `@Module()` 데코레이터에 등록한다.
- **좋은 예시**:
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

## 모듈 구성

### Feature Module

- **규칙**: [MUST] 각 비즈니스 기능은 독립적인 Feature Module로 구성한다.
- **이유**: 기능 단위의 캡슐화를 통해 모듈 간 결합도를 낮추고, 필요한 모듈만 로드할 수 있다.
- **좋은 예시**:
  ```typescript
  @Module({
    imports: [TypeOrmModule.forFeature([Order])],
    controllers: [OrderController],              // controllers/ 디렉토리에서 import
    providers: [OrderService, OrderRepository],   // services/, repositories/ 디렉토리에서 import
    exports: [OrderService],
  })
  export class OrderModule {}
  ```

### Shared Module

- **규칙**: [SHOULD] 여러 모듈에서 공통으로 사용하는 Provider는 Shared Module로 분리한다.
- **이유**: 코드 중복을 제거하고, 공통 기능의 일관된 동작을 보장한다.
- **좋은 예시**:
  ```typescript
  @Module({
    providers: [MailService, S3Service],
    exports: [MailService, S3Service],
  })
  export class SharedModule {}
  ```

### Global Module

- **규칙**: [MAY] 앱 전체에서 사용하는 모듈은 `@Global()` 데코레이터를 사용할 수 있다. 단, 남용하지 않는다.
- **이유**: Global Module이 많아지면 의존성 추적이 어려워지고, 암묵적 의존성이 생긴다.
- **좋은 예시**:
  ```typescript
  @Global()
  @Module({
    providers: [ConfigService, LoggerService],
    exports: [ConfigService, LoggerService],
  })
  export class CoreModule {}
  ```

### Module 간 의존성

- **규칙**: [MUST] 다른 모듈의 Provider를 사용하려면 해당 모듈을 `imports`에 명시적으로 추가한다.
- **이유**: 암묵적 의존성은 코드 분석과 리팩토링을 어렵게 만든다.

## DI 패턴

### Provider 등록

- **규칙**: [MUST] 모든 서비스 클래스는 `@Injectable()` 데코레이터를 사용하고, 해당 모듈의 `providers`에 등록한다.
- **이유**: NestJS DI 컨테이너가 인스턴스 생명주기를 관리하여 싱글톤 패턴과 테스트 용이성을 확보한다.

### 생성자 주입

- **규칙**: [MUST] 의존성 주입은 생성자 주입(Constructor Injection) 방식을 사용한다.
- **이유**: 의존성이 명시적이고, 불변성을 보장하며, 테스트 시 Mock 주입이 쉽다.
- **좋은 예시**:
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

- **규칙**: [MAY] 인터페이스 기반 주입이 필요할 때 Custom Provider(useClass, useFactory, useValue)를 사용할 수 있다.
- **이유**: 구현체를 런타임에 교체하거나, 외부 라이브러리를 DI 컨테이너에 통합할 수 있다.
- **좋은 예시**:
  ```typescript
  @Module({
    providers: [
      {
        provide: 'PAYMENT_GATEWAY',
        useClass:
          process.env.NODE_ENV === 'production'
            ? StripePaymentGateway
            : MockPaymentGateway,
      },
    ],
  })
  export class PaymentModule {}
  ```

### Scope

- **규칙**: [SHOULD] 특별한 이유가 없으면 기본 스코프(Singleton)를 사용한다.
- **이유**: Request Scope나 Transient Scope는 매 요청/주입마다 새 인스턴스를 생성하므로 성능에 영향을 준다.
- **규칙**: [MAY] 요청별 상태가 필요한 경우에만 Request Scope를 사용한다.

## 데코레이터

### Custom Decorator 사용 기준

- **규칙**: [SHOULD] 반복되는 로직을 추출할 때 Custom Decorator를 사용한다.
- **이유**: 보일러플레이트를 줄이고, 관심사를 선언적으로 분리할 수 있다.
- **좋은 예시**:
  ```typescript
  // 현재 로그인 사용자 추출 데코레이터
  export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest();
      return request.user;
    },
  );

  // 사용
  @Get('/me')
  getProfile(@CurrentUser() user: User) {
    return this.userService.getProfile(user.id);
  }
  ```

### 데코레이터 조합

- **규칙**: [MAY] 여러 데코레이터가 반복적으로 함께 사용되면, `applyDecorators()`로 하나의 데코레이터로 조합할 수 있다.
- **좋은 예시**:
  ```typescript
  // 인증 + 역할 검사를 하나로 조합
  export function Auth(...roles: Role[]) {
    return applyDecorators(
      UseGuards(JwtAuthGuard, RolesGuard),
      Roles(...roles),
    );
  }

  // 사용
  @Auth(Role.ADMIN)
  @Delete('/users/:id')
  deleteUser(@Param('id') id: string) { ... }
  ```

## Guard / Interceptor / Pipe

### 역할 구분

- **규칙**: [MUST] Guard, Interceptor, Pipe는 각각 정해진 역할에 맞게 사용한다.

| 구성 요소 | 역할 | 사용 시점 |
|----------|------|----------|
| **Guard** | 인증/인가 판단 | 요청이 핸들러에 도달하기 전에 접근 권한을 검사 |
| **Interceptor** | 요청/응답 변환, 로깅, 캐싱 | 핸들러 실행 전후에 로직 추가 (AOP) |
| **Pipe** | 입력 데이터 변환 및 검증 | 핸들러의 파라미터에 데이터가 바인딩될 때 |

### Guard 사용

- **규칙**: [MUST] 인증/인가 로직은 Guard에서 처리한다. Controller 메서드 안에서 직접 검사하지 않는다.
- **좋은 예시**:
  ```typescript
  @Injectable()
  export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
      return super.canActivate(context);
    }
  }

  // Controller에서 선언적으로 사용
  @UseGuards(JwtAuthGuard)
  @Get('/orders')
  getOrders() { ... }
  ```

### Interceptor 사용

- **규칙**: [SHOULD] 응답 변환, 로깅, 타임아웃 등 횡단 관심사는 Interceptor로 처리한다.
- **좋은 예시**:
  ```typescript
  @Injectable()
  export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>>
  {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
      return next.handle().pipe(
        map((data) => ({
          success: true,
          data,
          error: null,
        })),
      );
    }
  }
  ```

### Pipe 사용

- **규칙**: [MUST] 전역 ValidationPipe를 설정하여 모든 요청의 DTO를 자동 검증한다.
- **좋은 예시**:
  ```typescript
  // main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성이 있으면 에러
      transform: true,           // 타입 자동 변환
    }),
  );
  ```

## DTO 검증

### class-validator 사용

- **규칙**: [MUST] DTO 검증에는 `class-validator` 데코레이터를 사용한다.
- **이유**: 선언적 검증으로 코드 가독성이 높아지고, 검증 로직이 DTO에 응집된다.
- **좋은 예시**:
  ```typescript
  import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';

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

### class-transformer 사용

- **규칙**: [SHOULD] 요청 데이터의 타입 변환에 `class-transformer`를 사용한다.
- **이유**: Query Parameter 등 문자열로 들어오는 값을 적절한 타입으로 자동 변환하여 수동 파싱을 제거한다.
- **좋은 예시**:
  ```typescript
  import { Type } from 'class-transformer';
  import { IsInt, Min } from 'class-validator';

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

### DTO 불변성

- **규칙**: [SHOULD] DTO 필드는 `readonly`로 선언하여 불변성을 보장한다.
- **이유**: 요청 데이터가 파이프라인 도중 의도치 않게 변경되는 것을 방지한다.

## Swagger 문서화

### API Property 관리 라이브러리

- **규칙**: [MUST] DTO의 API Property 정의에 사내 라이브러리 `@sellernote/sellernote-nestjs-api-property`를 사용한다.
- **규칙**: [MUST NOT] `@nestjs/swagger`의 `@ApiProperty()`를 직접 사용하지 않는다. `class-validator`/`class-transformer` 데코레이터도 직접 사용하지 않는다.
- **이유**: 이 라이브러리는 Swagger 문서화, 검증(`class-validator`), 변환(`class-transformer`)을 하나의 데코레이터로 통합한다. 데코레이터 하나만 선언하면 세 가지가 모두 처리된다.
- **참고**: 사용법은 [sellernote-nestjs-api-property README](https://github.com/sellernote/sellernote-nestjs-api-property)를 참고한다.
- **좋은 예시**:
  ```typescript
  import { SellernoteApiString, SellernoteApiNumber } from '@sellernote/sellernote-nestjs-api-property';

  export class CreateOrderDto {
    @SellernoteApiString({
      description: '상품명',
      maxLength: 100,
      isRequired: true,
    })
    productName: string;

    @SellernoteApiNumber({
      description: '수량',
      min: 1,
      isRequired: true,
    })
    quantity: number;

    @SellernoteApiString({
      description: '메모',
      maxLength: 500,
      isRequired: false,
    })
    memo?: string;
  }
  ```
- **나쁜 예시**:
  ```typescript
  import { ApiProperty } from '@nestjs/swagger';          // @ApiProperty 직접 사용 금지
  import { IsString, MaxLength, IsNumber } from 'class-validator'; // 직접 사용 금지

  export class CreateOrderDto {
    @ApiProperty({ description: '상품명' })
    @IsString()
    @MaxLength(100)
    productName: string;
  }
  ```

## 예외 처리

### HttpException 사용

- **규칙**: [MUST] NestJS의 내장 HttpException 또는 그 하위 클래스를 사용하여 예외를 던진다.
- **이유**: NestJS가 자동으로 적절한 HTTP 상태 코드와 응답 본문을 생성한다.
- **좋은 예시**:
  ```typescript
  import { NotFoundException, BadRequestException } from '@nestjs/common';

  @Injectable()
  export class OrderService {
    async findOne(id: number): Promise<Order> {
      const order = await this.orderRepository.findOne(id);
      if (!order) {
        throw new NotFoundException(`주문 ID ${id}을(를) 찾을 수 없습니다.`);
      }
      return order;
    }
  }
  ```

### 커스텀 비즈니스 예외

- **규칙**: [SHOULD] 도메인 특화 예외는 커스텀 Exception 클래스로 정의한다.
- **이유**: 비즈니스 로직의 에러를 명확히 표현하고, Exception Filter에서 일관된 처리가 가능하다.
- **좋은 예시**:
  ```typescript
  export class InsufficientStockException extends BadRequestException {
    constructor(productId: number, requested: number, available: number) {
      super({
        code: 'INSUFFICIENT_STOCK',
        message: `상품 ${productId}의 재고가 부족합니다. (요청: ${requested}, 가용: ${available})`,
      });
    }
  }
  ```

### Exception Filter

- **규칙**: [MUST] 전역 Exception Filter를 등록하여 모든 예외를 일관된 응답 형식으로 변환한다.
- **이유**: 백엔드 공통 컨벤션의 공통 응답 구조를 보장한다.
- **좋은 예시**:
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
          : { code: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' };

      response.status(status).json({
        success: false,
        data: null,
        error:
          typeof errorResponse === 'string'
            ? { code: 'ERROR', message: errorResponse }
            : errorResponse,
      });
    }
  }
  ```

## 안티패턴

### 순환 의존성

- **규칙**: [MUST NOT] 모듈 또는 Provider 간 순환 의존성을 만들지 않는다.
- **이유**: 순환 의존성은 런타임 에러를 유발하고, 코드의 복잡도를 높인다.
- **나쁜 예시**:
  ```
  OrderModule → UserModule → OrderModule  (순환!)
  ```
- **해결 방법**: 공통 로직을 별도 모듈로 추출하거나, `forwardRef()`를 최후의 수단으로 사용한다.

### Controller에 비즈니스 로직

- **규칙**: [MUST NOT] Controller에 비즈니스 로직을 작성하지 않는다.
- **이유**: 백엔드 공통 컨벤션의 레이어 구조 원칙에 따라, Controller는 HTTP 요청/응답 처리만 담당한다.
- **나쁜 예시**:
  ```typescript
  @Controller('orders')
  export class OrderController {
    @Post()
    async create(@Body() dto: CreateOrderDto) {
      // Controller에서 직접 비즈니스 로직 수행
      const product = await this.productRepo.findOne(dto.productId);
      if (product.stock < dto.quantity) {
        throw new BadRequestException('재고 부족');
      }
      product.stock -= dto.quantity;
      await this.productRepo.save(product);
      return await this.orderRepo.save({ ...dto, status: 'PENDING' });
    }
  }
  ```

### DI 미사용 (직접 인스턴스 생성)

- **규칙**: [MUST NOT] `new` 키워드로 서비스 인스턴스를 직접 생성하지 않는다. 반드시 DI 컨테이너를 통해 주입받는다.
- **이유**: DI를 우회하면 싱글톤 보장이 깨지고, 테스트 시 Mock 교체가 불가능해진다.
- **나쁜 예시**:
  ```typescript
  @Injectable()
  export class OrderService {
    private readonly mailService = new MailService(); // DI 미사용!

    async createOrder(dto: CreateOrderDto) {
      // ...
      await this.mailService.send(...);
    }
  }
  ```
- **좋은 예시**:
  ```typescript
  @Injectable()
  export class OrderService {
    constructor(private readonly mailService: MailService) {} // DI를 통한 주입

    async createOrder(dto: CreateOrderDto) {
      // ...
      await this.mailService.send(...);
    }
  }
  ```

### 과도한 Global Module

- **규칙**: [SHOULD NOT] `@Global()` 데코레이터를 남용하지 않는다.
- **이유**: 모든 모듈을 Global로 설정하면 모듈 간 의존성이 암묵적이 되어, 어떤 모듈이 어떤 Provider에 의존하는지 파악이 어려워진다.

### any 타입 사용

- **규칙**: [MUST NOT] TypeScript에서 `any` 타입을 사용하지 않는다. 명확한 타입 또는 제네릭을 사용한다.
- **이유**: `any`는 TypeScript의 타입 안전성을 무력화하여, 런타임 에러의 원인이 된다.

## 참고 자료

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [NestJS Project Structure - GitHub](https://github.com/CatsMiaow/nestjs-project-structure)
- [NestJS Best Practices - Medium](https://arnab-k.medium.com/best-practices-for-structuring-a-nestjs-application-b3f627548220)
- [class-validator](https://github.com/typestack/class-validator)
- [class-transformer](https://github.com/typestack/class-transformer)
- [Clean Architecture & Design Patterns with NestJS](https://medium.com/@abdellatif.ellouze/clean-architecture-design-patterns-with-nestjs-9ec5149852b7)
- [Applying Domain-Driven Design principles to a Nest.js project](https://dev.to/bendix/applying-domain-driven-design-principles-to-a-nest-js-project-5f7b)
- [big.js - Arbitrary-precision decimal arithmetic](https://github.com/MikeMcl/big.js/)
- [big.js vs bignumber.js vs decimal.js 비교](https://github.com/MikeMcl/big.js/issues/45)
- [JavaScript 금액 계산 라이브러리 비교](https://miladezzat.medium.com/mastering-money-calculations-in-javascript-the-best-libraries-compared-8e4ae03dac58)
