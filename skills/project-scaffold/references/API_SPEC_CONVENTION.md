# API Spec Convention

> This document defines rules regarding API specs, including API design principles, request/response formats, and HTTP status codes.
> Parent rule: BACKEND_CONVENTION.md

## API Design Principles

### RESTful URL Design

- **Rule**: [MUST] Use plural nouns representing resources in URLs. Do not use verbs.
- **Good example**:
  ```
  GET    /api/v1/orders          # Retrieve order list
  GET    /api/v1/orders/:id      # Retrieve order details
  POST   /api/v1/orders          # Create order
  PATCH  /api/v1/orders/:id      # Update order
  DELETE /api/v1/orders/:id      # Delete order
  ```
> [MUST NOT] Verb-based URLs like `/api/v1/getOrders`, `/api/v1/createOrder` are prohibited.

### URL Patterns

- **Rule**: [MUST] URLs must use lowercase letters and hyphens (kebab-case).
- **Good example**:
  ```
  /api/v1/order-items
  /api/v1/shipment-trackings
  ```
> [MUST NOT] camelCase (`/orderItems`), snake_case (`/order_items`), PascalCase (`/OrderItems`) are prohibited.

### Expressing Resource Relationships

- **Rule**: [SHOULD] Sub-resources are expressed using nested URLs. However, nesting is limited to 2 levels.
- **Good example**:
  ```
  GET /api/v1/orders/:orderId/items
  GET /api/v1/orders/:orderId/items/:itemId
  ```

### HTTP Method Mapping

- **Rule**: [MUST] Map HTTP methods correctly to CRUD operations.

| HTTP Method | Purpose | Idempotent | Request Body |
|------------|------|--------|----------|
| GET | Retrieve resource | O | X |
| POST | Create resource | X | O |
| PUT | Replace entire resource | O | O |
| PATCH | Partially update resource | X | O |
| DELETE | Delete resource | O | X |

### API Versioning

- **Rule**: [MUST] API version must be included in the URL path. (e.g., `/api/v1/...`)

## Request/Response Format

### Common Response Structure

- **Rule**: [MUST] All API responses must follow the common structure below.

```json
// Success response
{ "success": true, "data": { ... }, "error": null }

// Error response
{
  "success": false, "data": null,
  "error": { "code": "ORDER_NOT_FOUND", "message": "주문을 찾을 수 없습니다.", "details": [] }
}
```

### Pagination Response

- **Rule**: [MUST] List APIs must support pagination and include the metadata below.

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": { "page": 1, "size": 20, "totalItems": 150, "totalPages": 8 }
  },
  "error": null
}
```

- **Rule**: [SHOULD] Pagination defaults are `page=1`, `size=20`. Maximum `size` is limited to 100.

### Date/Time Format

- **Rule**: [MUST] Dates and times must use ISO 8601 format (UTC). (e.g., `2025-01-15T09:30:00Z`)

### Request/Response Body Naming

- **Rule**: [MUST] JSON field names must use camelCase.
- **Good example**:
  ```json
  { "orderId": 123, "orderDate": "2025-01-15T09:30:00Z", "totalAmount": 50000 }
  ```
> [MUST NOT] Naming like `order_id`, `OrderDate`, `Total_Amount` is prohibited.

## HTTP Status Codes

- **Rule**: [MUST] Return the appropriate HTTP status code for each situation.

### Success Responses (2xx)

| Status Code | Purpose | When to Use |
|----------|------|----------|
| 200 OK | General success | Successful retrieval or update |
| 201 Created | Resource creation success | When a resource is created via POST |
| 204 No Content | Success without body | On successful DELETE |

### Client Errors (4xx)

| Status Code | Purpose | When to Use |
|----------|------|----------|
| 400 Bad Request | Invalid request | Request format error, missing parameters |
| 401 Unauthorized | Authentication failure | Missing token, expired token |
| 403 Forbidden | No permission | Authenticated but insufficient access rights |
| 404 Not Found | Resource not found | When the requested resource does not exist |
| 409 Conflict | Conflict | Duplicate creation, concurrent modification conflict |
| 422 Unprocessable Entity | Validation failure | Field value validation failure |
| 429 Too Many Requests | Request limit exceeded | Rate Limit exceeded |

### Server Errors (5xx)

| Status Code | Purpose | When to Use |
|----------|------|----------|
| 500 Internal Server Error | Internal server error | Unexpected server error |
| 502 Bad Gateway | Gateway error | External service call failure |
| 503 Service Unavailable | Service unavailable | Server maintenance, overload |

### Error Response Details

- **Rule**: [MUST] Error responses must include a machine-readable error code (code) and a human-readable message (message).
- **Rule**: [MUST NOT] Do not expose sensitive information such as stack traces or internal system information in error responses.
- **Good example**:
  ```json
  {
    "success": false, "data": null,
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "입력 데이터가 유효하지 않습니다.",
      "details": [
        { "field": "email", "message": "올바른 이메일 형식이 아닙니다." },
        { "field": "password", "message": "비밀번호는 8자 이상이어야 합니다." }
      ]
    }
  }
  ```

## API Version Management Strategy

### Defining Breaking Changes

- **Rule**: [MUST] Determine whether a change is a breaking change according to the classification below.

**Breaking Change**

| Change Type | Example |
|----------|------|
| Endpoint deletion or renaming | Deletion of `GET /api/v1/orders` |
| Response field deletion or renaming | `totalAmount` -> `total` |
| Field type change | `id: number` -> `id: string` |
| Adding a new required request field | Adding `warehouseId` as a required parameter |
| Field semantic change | `amount`: pre-tax -> post-tax |
| Status code change | 200 -> 201 |
| Error code change | `ORDER_NOT_FOUND` -> `NOT_FOUND` |
| Authentication requirement change | Public API -> authentication required |

**Non-Breaking Change**

| Change Type | Example |
|----------|------|
| Adding a new optional request field | Adding `memo?: string` |
| Adding a new response field | Adding `estimatedDeliveryDate` |
| Adding a new endpoint | Adding `GET /api/v1/orders/summary` |
| Adding a new enum value | Adding `returned` to `OrderStatus` |
| Relaxing validation | `maxLength(50)` -> `maxLength(100)` |

### Backward Compatibility Rules

**Server-Side Rules**

- **Rule**: [MUST] Do not delete or rename existing response fields.
- **Rule**: [MUST] Do not add new required request fields to existing endpoints. New fields must always be added as optional.
- **Rule**: [MUST] Do not change the type or meaning of a field. If a change is needed, add a new field.

**Client-Side Rules**

- **Rule**: [SHOULD] Ignore unknown fields included in the response.
- **Rule**: [SHOULD] Handle unknown enum values with a default value or ignore them.

### Deprecation Policy

- **Rule**: [MUST] API Deprecation follows the Announce -> Sunset -> Remove lifecycle.
- **Rule**: [MUST] The minimum Sunset period for internal APIs is 4 weeks.
- **Rule**: [SHOULD] Include a `Sunset` header (RFC 8594) in Deprecated API responses.
- **Good example**:
  ```typescript
  @Get('/orders/legacy')
  @ApiOperation({ summary: '주문 목록 조회 (Deprecated)', deprecated: true })
  @Header('Sunset', 'Sat, 01 Mar 2026 00:00:00 GMT')
  async getLegacyOrders() { return this.orderService.getOrders(); }
  ```

### Migration Guide

- **Rule**: [MUST] Write a migration document when upgrading to a version that includes breaking changes.
- **Good example**:
  ```typescript
  @Controller({ path: 'orders', version: '2' })
  export class OrderV2Controller {
    @Get() getOrders() { return this.orderService.getOrdersV2(); }
  }
  ```

## Filtering/Sorting/Search Patterns

### Filtering

- **Rule**: [MUST] Equality comparison filters use flat query parameters.
- **Rule**: [MUST] Range filters use `From`/`To` suffixes.
- **Rule**: [SHOULD] Multi-value filters are separated by commas (`,`).
- **Good example**:
  ```
  GET /api/v1/orders?status=pending,confirmed&createdAtFrom=2026-01-01&createdAtTo=2026-01-31
  ```

### Sorting

- **Rule**: [MUST] Sorting uses the `sort=field:direction` format. Multiple sorts are separated by commas (`,`).
- **Rule**: [MUST] List APIs must always define a default sort order.
- **Good example**:
  ```
  GET /api/v1/orders?sort=createdAt:desc,totalAmount:asc
  ```

### Search

- **Rule**: [SHOULD] Full-text search uses the `search` parameter.
- **Rule**: [MAY] Specific field search uses the field name as the parameter.

### List Query QueryDto Standard

- **Rule**: [MUST] List query APIs define a QueryDto based on the structure below.

```typescript
export class GetOrderListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  size: number = 20;

  @IsOptional() @IsString()
  sort?: string = 'createdAt:desc';

  @IsOptional() @IsEnum(OrderStatus, { each: true })
  @Transform(({ value }) => value?.split(','))
  status?: OrderStatus[];

  @IsOptional() @IsString() createdAtFrom?: string;
  @IsOptional() @IsString() createdAtTo?: string;
  @IsOptional() @IsString() search?: string;
}
```

## Bulk Operations

- **Rule**: [MUST] Bulk operations use the `/bulk` sub-resource pattern.
- **Rule**: [MUST] The request body must include an `items` array.
- **Rule**: [MUST] The response must include per-item results (`results`) and a summary (`summary`).
- **Rule**: [MUST] On partial failure, return 200 OK and indicate success/failure for each individual item.
- **Rule**: [MUST] The maximum batch size is limited to 100.

- **Good example**:

  Request:
  ```
  POST /api/v1/orders/bulk
  ```
  ```json
  { "items": [{ "productId": "prod-001", "quantity": 2 }, { "productId": "prod-999", "quantity": 1 }] }
  ```

  Response (partial failure):
  ```json
  {
    "success": true,
    "data": {
      "results": [
        { "index": 0, "success": true, "data": { "orderId": "ord-101" } },
        { "index": 1, "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "상품을 찾을 수 없습니다." } }
      ],
      "summary": { "total": 2, "succeeded": 1, "failed": 1 }
    },
    "error": null
  }
  ```

## Asynchronous Processing

- **Rule**: [MUST] Long-running operations must use the 202 Accepted pattern.
- **Rule**: [MUST] Asynchronous operation responses must include a `jobId` and a status check URL (`statusUrl`).
- **Rule**: [MUST] Job status must be one of `pending | processing | completed | failed | cancelled`.

- **Good example**:

  202 Response:
  ```json
  {
    "success": true,
    "data": { "jobId": "job-abc-123", "status": "pending", "statusUrl": "/api/v1/jobs/job-abc-123" },
    "error": null
  }
  ```

  Completed status:
  ```json
  {
    "success": true,
    "data": { "jobId": "job-abc-123", "status": "completed", "progress": 100, "resultUrl": "/api/v1/reports/job-abc-123/download" },
    "error": null
  }
  ```

## File Upload

### Small Files (10MB or less)

- **Rule**: [SHOULD] Files of 10MB or less are uploaded directly using `multipart/form-data`.
- **Good example**:
  ```typescript
  @Post(':orderId/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(@Param('orderId') orderId: string, @UploadedFile() file: Express.Multer.File) {
    return this.orderService.addAttachment(orderId, file);
  }
  ```

### Large Files

- **Rule**: [MUST] Files over 10MB must use the 3-step Presigned URL pattern.

```
1. Client → Server: Request Presigned URL
2. Client → S3: Upload directly using Presigned URL
3. Client → Server: Confirm upload completion
```

### File Validation

- **Rule**: [MUST] Validate file size, MIME type, and Magic Bytes on the server side.
- **Rule**: [MUST NOT] Do not trust file type based solely on the `Content-Type` header.

| Validation Item | Rule |
|----------|------|
| File size | Maximum size limit per endpoint |
| MIME type | Check against allowed MIME type list |
| Magic Bytes | Verify actual file type using Magic Bytes in the file header |
| File name | Remove path traversal characters (`../`), replace special characters |

## Idempotency

- **Rule**: [MUST] POST endpoints that create resources must support the `Idempotency-Key` header.
- **Rule**: [MUST] `Idempotency-Key` values must use UUID v4 format.
- **Rule**: [SHOULD NOT] Do not require `Idempotency-Key` for GET, DELETE, PUT, or PATCH endpoints.
- **Rule**: [MUST] The server stores the `Idempotency-Key` and response in Redis with a TTL of 24 hours.
- **Rule**: [MUST] If the same key is resubmitted with different request parameters, return 409 Conflict.

- **Good example**:

  Initial request:
  ```
  POST /api/v1/payments
  Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
  ```
  ```json
  { "orderId": "ord-101", "amount": 50000, "method": "card" }
  ```

  Retry (same key) - Returns cached response (prevents duplicate creation).

## Caching Strategy

### ETag-Based Conditional Requests

- **Rule**: [SHOULD] Single item retrieval APIs should support ETag to reduce unnecessary data transmission.

### Cache-Control by Resource Type

- **Rule**: [SHOULD] Apply the Cache-Control policies below according to resource type.

| Resource Type | Cache-Control | TTL | Example |
|------------|---------------|-----|------|
| Static reference data | `public, max-age=86400` | 24 hours | Country codes, currency list |
| Catalog | `private, max-age=300` | 5 minutes | Product list, categories |
| User-specific data | `private, no-cache` | Always validate | Order history, profile |
| Real-time data | `no-store` | No cache | Stock quantity, real-time pricing |

### Optimistic Concurrency Control

- **Rule**: [SHOULD] Update APIs should use the `If-Match` header and ETag to detect concurrency conflicts.

## Rate Limiting

- **Rule**: [MUST] Rate Limit responses must include standard headers.
- **Rule**: [MUST] When the limit is exceeded, return 429 Too Many Requests with a `Retry-After` header.

| Header | Description |
|------|------|
| `RateLimit-Limit` | Maximum number of allowed requests |
| `RateLimit-Remaining` | Remaining number of requests |
| `RateLimit-Reset` | Time when the limit resets (Unix timestamp) |

### Rate Limit Tiers

- **Rule**: [SHOULD] Apply Rate Limits per user according to the tiers below.

| Tier | Limit | Target |
|------|------|------|
| Read | 200/min | GET requests |
| Write | 50/min | POST, PATCH, PUT, DELETE requests |
| Bulk | 10/min | Bulk operation endpoints |
| Upload | 20/min | File upload endpoints |

## OpenAPI/Swagger Standard

### Code-First Rules

- **Rule**: [MUST] Enable the NestJS Swagger plugin to automatically generate schemas from DTOs.

  `nest-cli.json` configuration:
  ```json
  {
    "compilerOptions": {
      "plugins": [{ "name": "@nestjs/swagger", "options": { "classValidatorShim": true, "introspectComments": true } }]
    }
  }
  ```

- **Rule**: [MUST] Use the `@sellernote/sellernote-nestjs-api-property` decorator for all DTO fields.

### Endpoint Documentation

- **Rule**: [MUST] Write `@ApiOperation({ summary })` for all endpoints.
- **Rule**: [MUST] Write `@ApiResponse` for success responses and major error responses.
- **Good example**:
  ```typescript
  @ApiOperation({ summary: '주문 생성' })
  @ApiResponse({ status: 201, description: '주문 생성 성공', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: '요청 데이터 검증 실패' })
  @ApiResponse({ status: 409, description: '중복 주문' })
  @Post()
  async createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.orderService.createOrder(dto);
  }
  ```

### Schema Definition Standard

- **Rule**: [MUST] Use the `@sellernote/sellernote-nestjs-api-property` library for DTO field definitions.
- **Rule**: [MUST NOT] Do not use `@ApiProperty()` from `@nestjs/swagger` directly.

#### Decorator Overview

| Decorator | Purpose | Key Options |
|------------|------|-----------|
| `SellernoteApiString` | String field | `maxLength` (required), `minLength`, `isTrim`, `isEmail`, etc. |
| `SellernoteApiNumber` | Number field | `min`, `max`, `isInt`, `isPositive`, etc. |
| `SellernoteApiBoolean` | Boolean field | Built-in automatic conversion from string/number |
| `SellernoteApiEnum` | Enum field | `enum`, `enumName` |
| `SellernoteApiObject` | Nested object field | `type: () => ClassName` |
| `SellernoteApiDate` | Date field | `minDate`, `maxDate` |
| `SellernoteApiUUID` | UUID field | `version` |
| `SellernoteApiLiteral` | String literal union | `literals` |
| `SellernoteApiDecimal` | Decimal string (monetary amounts, etc.) | `maxDecimalPlaces`, `maxDigits` |
| `SellernoteApiUnion` | Union type | `types`, `discriminator` |

- **Class decorator**: `@SellernoteApiDto({ isQuery: true })` -- Automatically converts single values to arrays in Query DTOs.
- **Common options**: All decorators support `description` (required), `isRequired` (required), `isArray`, `isNullable`, `example`.
- **Reference**: For the full options of each decorator, refer to the [sellernote-nestjs-api-property README](https://github.com/sellernote/sellernote-nestjs-api-property).

- **Good example**:
  ```typescript
  import { SellernoteApiString, SellernoteApiNumber, SellernoteApiEnum } from '@sellernote/sellernote-nestjs-api-property';

  export class CreateOrderDto {
    @SellernoteApiString({ description: '상품 ID', maxLength: 50, isRequired: true, example: 'prod-001' })
    productId: string;

    @SellernoteApiNumber({ description: '주문 수량', isInt: true, min: 1, max: 999, isRequired: true, example: 2 })
    quantity: number;

    @SellernoteApiEnum({ description: '주문 상태', enum: OrderStatus, enumName: 'OrderStatus', isRequired: true })
    status: OrderStatus;
  }
  ```

### Front-Back Type Sharing

- **Rule**: [SHOULD] Automatically generate frontend types from the OpenAPI spec to maintain type consistency.

```
NestJS (Code-First)
  → OpenAPI Spec (JSON/YAML) auto-generation
    → openapi-typescript or orval
      → Frontend TypeScript types/client auto-generation
```

### API Spec Validation Automation

- **Rule**: [SHOULD] Automate OpenAPI spec validation in the CI pipeline.
- **Rule**: [SHOULD] Automatically detect breaking changes using tools like `oasdiff`.

```yaml
steps:
  - name: OpenAPI Lint
    run: npx @stoplight/spectral-cli lint openapi.json
  - name: Breaking Change Detection
    run: oasdiff breaking openapi-prev.json openapi-next.json
```

## DTO Naming Extensions

- **Rule**: [MUST] DTO class names follow the base pattern from BACKEND_CONVENTION.md, with the additional patterns below.

| Type | Pattern | Example |
|------|------|------|
| Bulk create request | `BulkCreate[Domain]Dto` | `BulkCreateOrderDto` |
| Bulk update request | `BulkUpdate[Domain]Dto` | `BulkUpdateOrderDto` |
| Bulk delete request | `BulkDelete[Domain]Dto` | `BulkDeleteOrderDto` |
| List response | `[Domain]ListResponseDto` | `OrderListResponseDto` |
| Summary response | `[Domain]SummaryDto` | `OrderSummaryDto` |
| Filter condition | `[Domain]FilterDto` | `OrderFilterDto` |
| Upload request | `Upload[Domain]Dto` | `UploadAttachmentDto` |
| Job status response | `[Domain]JobStatusDto` | `ReportJobStatusDto` |

- **Rule**: [SHOULD] Use NestJS's `PartialType` and `PickType` when reusing existing DTOs.
- **Good example**:
  ```typescript
  import { PartialType, PickType } from '@nestjs/swagger';

  export class UpdateOrderDto extends PartialType(CreateOrderDto) {}

  export class OrderSummaryDto extends PickType(OrderResponseDto, ['orderId', 'status', 'totalAmount'] as const) {}
  ```

## Anti-Patterns

### Excessive URL Nesting

- **Rule**: Nesting beyond 2 levels is prohibited. Deep resources should be separated into independent endpoints.
  ```
  GET /api/v1/order-items/:itemId/reviews    (O)
  GET /api/v1/reviews/:reviewId              (O)
  ```

### POST-for-Everything

- **Rule**: Using POST for all APIs is prohibited. Follow the HTTP method mapping rules.

### Exposing Sensitive Information in Responses

- **Rule**: Exposing DB auto-increment IDs (`_id`), password hashes, stack traces, etc. in responses is prohibited. Explicitly select fields using ResponseDto.

### Using PUT for Partial Updates

- **Rule**: Use PATCH for partial updates, and include only the fields to be modified in the request body.

### Inconsistent Naming

- **Rule**: Unify URLs with kebab-case and JSON fields with camelCase.