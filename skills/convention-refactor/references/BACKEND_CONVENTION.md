# 백엔드 컨벤션

> 이 문서는 백엔드 전체에 적용되는 공통 규칙을 정의합니다.
> 특정 프레임워크에 종속적인 규칙은 하위 폴더의 문서를 참조하세요.
>
> - [API Spec 컨벤션](api-spec/API_SPEC_CONVENTION.md)
> - [아키텍처 컨벤션](architecture/ARCHITECTURE_CONVENTION.md)
> - [보안 컨벤션](security/SECURITY_CONVENTION.md)
> - [NestJS 컨벤션](nestjs/NESTJS_CONVENTION.md)
> - [Spring 컨벤션](spring/SPRING_CONVENTION.md)
> - [TypeORM 컨벤션](typeorm/TYPEORM_CONVENTION.md)

## 아키텍처

### 레이어 구조

- **규칙**: [MUST] Controller -> Service -> Repository 3-레이어 구조를 준수한다.
- **이유**: 관심사 분리(Separation of Concerns)를 통해 테스트 용이성과 유지보수성을 확보한다.

```
┌─────────────┐
│  Controller  │  ← HTTP 요청/응답 처리, 입력 검증
├─────────────┤
│   Service    │  ← 비즈니스 로직, 트랜잭션 관리
├─────────────┤
│  Repository  │  ← 데이터 접근, 쿼리 실행
└─────────────┘
```

### 의존성 방향

- **규칙**: [MUST] 의존성은 반드시 상위 레이어에서 하위 레이어 방향으로만 흐른다. (Controller -> Service -> Repository)
- **이유**: 역방향 의존성은 순환 참조를 유발하고, 레이어 간 결합도를 높여 독립적인 테스트와 변경을 불가능하게 만든다.
- **좋은 예시**:
  ```
  Controller → Service → Repository   (단방향)
  ```
- **나쁜 예시**:
  ```
  Controller → Service → Repository
                  ↑           │
                  └───────────┘   (역방향 의존!)
  ```

### Controller 역할

- **규칙**: [MUST] Controller는 HTTP 요청/응답 처리와 입력 검증만 담당한다. 비즈니스 로직을 포함하지 않는다.
- **이유**: Controller에 비즈니스 로직이 포함되면 로직의 재사용이 불가능해지고, 단위 테스트가 어려워진다.
- **좋은 예시**:
  ```typescript
  // Controller는 요청을 Service에 위임만 한다
  @Post('/orders')
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto);
  }
  ```
- **나쁜 예시**:
  ```typescript
  // Controller에 비즈니스 로직이 포함됨
  @Post('/orders')
  async createOrder(@Body() dto: CreateOrderDto) {
    const stock = await this.productRepo.getStock(dto.productId);
    if (stock < dto.quantity) {
      throw new BadRequestException('재고 부족');
    }
    const order = await this.orderRepo.save(dto);
    await this.emailService.sendConfirmation(order);
    return order;
  }
  ```

### Service 역할

- **규칙**: [MUST] 비즈니스 로직은 Service 레이어에 집중한다.
- **이유**: 비즈니스 로직의 단일 진입점을 만들어 재사용성, 테스트 용이성, 트랜잭션 일관성을 확보한다.

### Repository 역할

- **규칙**: [MUST] Repository는 데이터 접근 로직만 담당한다. 비즈니스 로직을 포함하지 않는다.
- **이유**: 데이터 접근 계층을 분리하면 ORM 교체나 데이터 소스 변경이 Service 레이어에 영향을 주지 않는다.

## API 설계

> API 설계 원칙, 요청/응답 포맷, HTTP 상태 코드, 버전 관리, 필터링/정렬, Bulk 작업, 비동기 처리, 파일 업로드, 멱등성, 캐싱, Rate Limiting, OpenAPI 표준 등
> API 설계에 관한 모든 규칙은 [API Spec 컨벤션](api-spec/API_SPEC_CONVENTION.md)에서 정의한다.

## 보안

> 인증/인가, 입력 검증, 전송 보안, 민감 데이터 관리, 보안 테스트 등
> 보안에 관한 모든 규칙은 [보안 컨벤션](security/SECURITY_CONVENTION.md)에서 정의한다.

## DTO/Entity 네이밍

### DTO 네이밍 규칙

- **규칙**: [MUST] DTO 클래스명은 `[동작][도메인]Dto` 패턴을 따른다.
- **이유**: DTO의 용도를 이름만으로 파악할 수 있어 코드 탐색이 쉬워진다.

| 유형 | 패턴 | 예시 |
|------|------|------|
| 생성 요청 | `Create[Domain]Dto` | `CreateOrderDto` |
| 수정 요청 | `Update[Domain]Dto` | `UpdateOrderDto` |
| 조회 응답 | `[Domain]ResponseDto` | `OrderResponseDto` |
| 목록 조회 파라미터 | `Get[Domain]ListQueryDto` | `GetOrderListQueryDto` |

> 확장된 DTO 패턴(페이지네이션 응답, 에러 응답, Bulk 요청 등)은 [API Spec 컨벤션](api-spec/API_SPEC_CONVENTION.md)을 참조한다.

### Entity 필드 네이밍

- **규칙**: [MUST] Entity 필드명은 도메인 언어를 반영하며, 약어를 사용하지 않는다.
- **이유**: 코드가 곧 문서가 되어야 한다. 약어는 팀원마다 해석이 달라질 수 있다.
- **좋은 예시**:
  ```typescript
  class Order {
    orderId: number;
    orderStatus: string;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **나쁜 예시**:
  ```typescript
  class Order {
    oid: number;        // 약어 사용
    stat: string;       // 약어 사용
    amt: number;        // 약어 사용
    crtDt: Date;        // 약어 사용
  }
  ```

### 공통 필드

- **규칙**: [MUST] 모든 Entity는 아래 공통 필드를 포함한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string (UUID) | 기본키. UUID 값을 저장 |
| `_id` | number (bigint) | 내부 순차 식별자 (auto increment, unique) |
| `createdAt` | datetime | 생성 시각 |
| `updatedAt` | datetime | 수정 시각 |
| `deletedAt` | datetime (nullable) | 소프트 삭제 시각 (필요 시) |

## 테스트 전략

### 테스트 피라미드

- **규칙**: [MUST] 테스트는 단위 테스트 > 통합 테스트 > E2E 테스트 순서로 비중을 둔다.
- **이유**: 단위 테스트가 가장 빠르고 비용이 적으며, 높은 수준의 테스트는 느리고 유지보수 비용이 높다.

```
        /  E2E  \          ← 적은 수, 핵심 시나리오
       /  통합   \         ← Service + Repository 통합
      /  단위 테스트 \     ← 가장 많은 수, Service 로직 중심
     ──────────────────
```

### 단위 테스트

- **규칙**: [MUST] Service 레이어의 비즈니스 로직에 대해 단위 테스트를 작성한다.
- **규칙**: [MUST] 외부 의존성(DB, 외부 API 등)은 Mock으로 대체한다.
- **이유**: 단위 테스트는 빠르고 안정적이며, 비즈니스 로직의 정확성을 보장한다.

### 통합 테스트

- **규칙**: [SHOULD] Service + Repository를 함께 테스트하는 통합 테스트를 작성한다.
- **이유**: 실제 DB와의 상호작용에서 발생하는 문제(쿼리 오류, 제약 조건 위반 등)를 검증한다.

### E2E 테스트

- **규칙**: [SHOULD] 핵심 비즈니스 시나리오에 대해 API 레벨의 E2E 테스트를 작성한다.
- **이유**: 전체 요청-응답 흐름을 검증하여, 레이어 간 통합 문제를 조기에 발견한다.

### 테스트 네이밍

- **규칙**: [SHOULD] 테스트명은 `[테스트대상]_[시나리오]_[기대결과]` 패턴을 따른다.
- **좋은 예시**:
  ```typescript
  describe('OrderService.createOrder', () => {
    it('재고가_충분하면_주문을_생성한다', () => { ... });
    it('재고가_부족하면_에러를_던진다', () => { ... });
  });
  ```

## 안티패턴

### God Service

- **규칙**: [MUST NOT] 하나의 Service 클래스가 너무 많은 책임을 지지 않는다.
- **이유**: 단일 책임 원칙(SRP) 위반으로 인해 코드 변경 시 영향 범위가 넓어지고, 테스트가 어려워진다.
- **나쁜 예시**:
  ```typescript
  // 주문, 결제, 배송, 알림을 모두 처리하는 God Service
  class OrderService {
    createOrder() { ... }
    processPayment() { ... }
    arrangeShipment() { ... }
    sendNotification() { ... }
    generateReport() { ... }
  }
  ```
- **좋은 예시**: 각 관심사를 별도 Service로 분리한다 (OrderService, PaymentService, ShipmentService, NotificationService).

### 레이어 건너뛰기

- **규칙**: [MUST NOT] Controller에서 Repository를 직접 호출하지 않는다.
- **이유**: Service 레이어를 건너뛰면 비즈니스 로직이 분산되고, 트랜잭션 관리가 일관되지 않는다.
- **나쁜 예시**:
  ```typescript
  // Controller에서 Repository 직접 호출
  @Get('/users/:id')
  async getUser(@Param('id') id: string) {
    return this.userRepository.findById(id); // Service 건너뛰기!
  }
  ```

### 비즈니스 로직 누출

- **규칙**: [MUST NOT] Controller나 Repository에 비즈니스 로직을 작성하지 않는다.
- **이유**: 비즈니스 로직이 여러 레이어에 흩어지면 변경 추적이 어렵고, 동일 로직의 중복이 발생한다.

### 엔드포인트 내 과도한 분기

- **규칙**: [SHOULD NOT] 하나의 API 엔드포인트에서 쿼리 파라미터에 따라 완전히 다른 로직을 수행하지 않는다.
- **이유**: 엔드포인트의 역할이 모호해지고, API 문서화와 테스트가 어려워진다.

### 에러 삼키기

- **규칙**: [MUST NOT] 예외를 catch한 후 아무 처리 없이 무시하지 않는다.
- **이유**: 에러가 조용히 삼켜지면 문제 원인 파악이 불가능해진다.
- **나쁜 예시**:
  ```typescript
  try {
    await this.paymentService.process(order);
  } catch (error) {
    // 아무것도 하지 않음 - 에러 삼키기!
  }
  ```

## 참고 자료

- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [Microsoft Web API Design Best Practices](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [REST API Design Best Practices - Stack Overflow Blog](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)
- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
