# Backend Convention

> This document defines common rules that apply across the entire backend.
> For rules specific to a particular framework, refer to the documents in the subdirectories.
>
> - [API Spec Convention](api-spec/API_SPEC_CONVENTION.md)
> - [Architecture Convention](architecture/ARCHITECTURE_CONVENTION.md)
> - [Security Convention](security/SECURITY_CONVENTION.md)
> - [NestJS Convention](nestjs/NESTJS_CONVENTION.md)
> - [Spring Convention](spring/SPRING_CONVENTION.md)
> - [TypeORM Convention](typeorm/TYPEORM_CONVENTION.md)
> - [Prisma Convention](prisma/PRISMA_CONVENTION.md)

## Architecture

Architecture rules follow the [Architecture Convention](architecture/ARCHITECTURE_CONVENTION.md).

## API Design

> API design principles, request/response formats, HTTP status codes, versioning, filtering/sorting, Bulk operations, asynchronous processing, file uploads, idempotency, caching, Rate Limiting, OpenAPI standards, etc.
> All rules related to API design are defined in the [API Spec Convention](api-spec/API_SPEC_CONVENTION.md).

## Security

> Authentication/authorization, input validation, transport security, sensitive data management, security testing, etc.
> All rules related to security are defined in the [Security Convention](security/SECURITY_CONVENTION.md).

## DTO/Entity Naming

### DTO Naming Rules

- **Rule**: [MUST] DTO class names follow the `[Action][Domain]Dto` pattern.

| Type | Pattern | Example |
|------|---------|---------|
| Create request | `Create[Domain]Dto` | `CreateOrderDto` |
| Update request | `Update[Domain]Dto` | `UpdateOrderDto` |
| Query response | `[Domain]ResponseDto` | `OrderResponseDto` |
| List query parameters | `Get[Domain]ListQueryDto` | `GetOrderListQueryDto` |

> For extended DTO patterns (pagination responses, error responses, Bulk requests, etc.), refer to the [API Spec Convention](api-spec/API_SPEC_CONVENTION.md).

### DTO Field Naming

- **Rule**: [MUST] DTO field names (property names) use camelCase.
- **Good example**:
  ```typescript
  export class CreateOrderDto {
    orderNumber: string;
    totalAmount: string;
    shippingAddress: string;
  }
  ```
> [MUST NOT] Do not use snake_case or PascalCase field names.

### Entity Field Naming

- **Rule**: [MUST] Entity field names reflect domain language and do not use abbreviations.
- **Good example**:
  ```typescript
  class Order {
    orderId: number;
    orderStatus: string;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
> [MUST NOT] Do not use abbreviations such as `oid`, `stat`, `amt`, `crtDt`.

### Common Fields

Common field rules follow the required common fields in DATABASE_CONVENTION.md.

## Test Strategy

### Test Pyramid

- **Rule**: [MUST] Tests are prioritized in the following order: Unit Tests > Integration Tests > E2E Tests.

```
        /  E2E  \          ← Few in number, core scenarios
       / Integration \     ← Service + Repository integration
      /  Unit Tests   \    ← Most numerous, focused on Service logic
     ──────────────────
```

### Unit Tests

- **Rule**: [MUST] Write unit tests for business logic in the Service layer.
- **Rule**: [MUST] Replace external dependencies (DB, external APIs, etc.) with Mocks.

### Integration Tests

- **Rule**: [SHOULD] Write integration tests that test Service + Repository together.

### E2E Tests

- **Rule**: [SHOULD] Write API-level E2E tests for core business scenarios.

### Test Naming

- **Rule**: [SHOULD] Test names follow the `[TestTarget]_[Scenario]_[ExpectedResult]` pattern.
- **Good example**:
  ```typescript
  describe('OrderService.createOrder', () => {
    it('재고가_충분하면_주문을_생성한다', () => { ... });
    it('재고가_부족하면_에러를_던진다', () => { ... });
  });
  ```

## Anti-Patterns

### God Service

- **Rule**: [MUST NOT] A single Service class must not take on too many responsibilities.
- **Good example**: Separate each concern into its own Service (OrderService, PaymentService, ShipmentService, NotificationService).

### Skipping Layers

- **Rule**: [MUST NOT] Do not call Repository directly from Controller.

### Business Logic Leakage

- **Rule**: [MUST NOT] Do not write business logic in Controller or Repository.

### Excessive Branching Within an Endpoint

- **Rule**: [SHOULD NOT] A single API endpoint should not perform completely different logic based on query parameters.

### Swallowing Errors

- **Rule**: [MUST NOT] Do not catch an exception and then ignore it without any handling.
> Empty catch blocks make it impossible to identify the root cause of problems.