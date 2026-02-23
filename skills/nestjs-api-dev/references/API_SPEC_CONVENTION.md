# API Spec 컨벤션

> 이 문서는 API 설계 원칙, 요청/응답 포맷, HTTP 상태 코드 등 API 스펙에 관한 규칙을 정의합니다.
> 상위 규칙: [백엔드 공통 컨벤션](../BACKEND_CONVENTION.md)

## API 설계 원칙

### RESTful URL 설계

- **규칙**: [MUST] URL에는 리소스를 나타내는 복수형 명사를 사용한다. 동사는 사용하지 않는다.
- **이유**: HTTP 메서드가 동작(CRUD)을 표현하므로, URL은 리소스 식별에만 집중해야 한다.
- **좋은 예시**:
  ```
  GET    /api/v1/orders          # 주문 목록 조회
  GET    /api/v1/orders/:id      # 주문 상세 조회
  POST   /api/v1/orders          # 주문 생성
  PATCH  /api/v1/orders/:id      # 주문 수정
  DELETE /api/v1/orders/:id      # 주문 삭제
  ```
- **나쁜 예시**:
  ```
  GET    /api/v1/getOrders
  POST   /api/v1/createOrder
  POST   /api/v1/deleteOrder/:id
  ```

### URL 패턴

- **규칙**: [MUST] URL은 소문자와 하이픈(kebab-case)을 사용한다.
- **이유**: URL은 대소문자를 구분하는 환경이 있으며, 하이픈이 가독성이 높다.
- **좋은 예시**:
  ```
  /api/v1/order-items
  /api/v1/shipment-trackings
  ```
- **나쁜 예시**:
  ```
  /api/v1/orderItems        # camelCase
  /api/v1/order_items       # snake_case
  /api/v1/OrderItems        # PascalCase
  ```

### 리소스 관계 표현

- **규칙**: [SHOULD] 하위 리소스는 중첩 URL로 표현한다. 단, 2단계까지만 중첩한다.
- **이유**: 과도한 중첩은 URL을 복잡하게 만들고 유지보수를 어렵게 한다.
- **좋은 예시**:
  ```
  GET /api/v1/orders/:orderId/items          # 주문의 아이템 목록
  GET /api/v1/orders/:orderId/items/:itemId  # 주문의 특정 아이템
  ```
- **나쁜 예시**:
  ```
  # 3단계 이상 중첩 - 지양
  GET /api/v1/users/:userId/orders/:orderId/items/:itemId/reviews
  ```

### HTTP 메서드 매핑

- **규칙**: [MUST] HTTP 메서드를 CRUD 동작에 올바르게 매핑한다.

| HTTP 메서드 | 용도 | 멱등성 | 요청 본문 |
|------------|------|--------|----------|
| GET | 리소스 조회 | O | X |
| POST | 리소스 생성 | X | O |
| PUT | 리소스 전체 교체 | O | O |
| PATCH | 리소스 부분 수정 | X | O |
| DELETE | 리소스 삭제 | O | X |

### API 버저닝

- **규칙**: [MUST] API 버전은 URL 경로에 포함한다. (예: `/api/v1/...`)
- **이유**: URL 기반 버저닝이 가장 직관적이고, 클라이언트 코드에서 명시적으로 버전을 관리할 수 있다.
- **좋은 예시**:
  ```
  /api/v1/orders
  /api/v2/orders
  ```

## 요청/응답 포맷

### 공통 응답 구조

- **규칙**: [MUST] 모든 API 응답은 아래 공통 구조를 따른다.
- **이유**: 클라이언트가 응답을 예측 가능하게 파싱할 수 있어 통합 비용이 줄어든다.

```json
// 성공 응답
{
  "success": true,
  "data": { ... },
  "error": null
}

// 에러 응답
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "주문을 찾을 수 없습니다.",
    "details": []
  }
}
```

### 페이지네이션 응답

- **규칙**: [MUST] 목록 API는 페이지네이션을 지원하고, 아래 메타데이터를 포함한다.
- **이유**: 대량 데이터를 한 번에 반환하면 서버 부하와 응답 시간이 증가한다.

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "size": 20,
      "totalItems": 150,
      "totalPages": 8
    }
  },
  "error": null
}
```

- **규칙**: [SHOULD] 페이지네이션 기본값은 `page=1`, `size=20`으로 설정한다. 최대 `size`는 100으로 제한한다.
- **이유**: 기본값이 없으면 클라이언트가 파라미터를 누락했을 때 전체 데이터를 반환하게 되어 성능 문제가 발생한다.

### 날짜/시간 포맷

- **규칙**: [MUST] 날짜/시간은 ISO 8601 형식(UTC)을 사용한다. (예: `2025-01-15T09:30:00Z`)
- **이유**: 시간대 혼동을 방지하고, 국제적으로 통용되는 표준 형식이다.

### 요청/응답 본문 네이밍

- **규칙**: [MUST] JSON 필드명은 camelCase를 사용한다.
- **이유**: JavaScript/TypeScript 생태계와의 일관성을 유지한다.
- **좋은 예시**:
  ```json
  {
    "orderId": 123,
    "orderDate": "2025-01-15T09:30:00Z",
    "totalAmount": 50000
  }
  ```
- **나쁜 예시**:
  ```json
  {
    "order_id": 123,
    "OrderDate": "2025-01-15T09:30:00Z",
    "Total_Amount": 50000
  }
  ```

## HTTP 상태 코드

- **규칙**: [MUST] 상황에 맞는 HTTP 상태 코드를 반환한다.

### 성공 응답 (2xx)

| 상태 코드 | 용도 | 사용 시점 |
|----------|------|----------|
| 200 OK | 일반 성공 | 조회, 수정 성공 |
| 201 Created | 리소스 생성 성공 | POST로 리소스 생성 시 |
| 204 No Content | 본문 없는 성공 | DELETE 성공 시 |

### 클라이언트 에러 (4xx)

| 상태 코드 | 용도 | 사용 시점 |
|----------|------|----------|
| 400 Bad Request | 잘못된 요청 | 요청 형식 오류, 파라미터 누락 |
| 401 Unauthorized | 인증 실패 | 토큰 없음, 토큰 만료 |
| 403 Forbidden | 권한 없음 | 인증되었으나 접근 권한 부족 |
| 404 Not Found | 리소스 없음 | 요청한 리소스가 존재하지 않을 때 |
| 409 Conflict | 충돌 | 중복 생성, 동시 수정 충돌 |
| 422 Unprocessable Entity | 검증 실패 | 필드 값 검증 실패 |
| 429 Too Many Requests | 요청 제한 초과 | Rate Limit 초과 |

### 서버 에러 (5xx)

| 상태 코드 | 용도 | 사용 시점 |
|----------|------|----------|
| 500 Internal Server Error | 서버 내부 오류 | 예상하지 못한 서버 에러 |
| 502 Bad Gateway | 게이트웨이 오류 | 외부 서비스 호출 실패 |
| 503 Service Unavailable | 서비스 불가 | 서버 점검, 과부하 |

### 에러 응답 상세

- **규칙**: [MUST] 에러 응답에는 머신이 읽을 수 있는 에러 코드(code)와 사람이 읽을 수 있는 메시지(message)를 포함한다.
- **규칙**: [MUST NOT] 에러 응답에 스택 트레이스, 내부 시스템 정보 등 민감 정보를 노출하지 않는다.
- **이유**: 민감 정보 노출은 보안 취약점이 된다.
- **좋은 예시**:
  ```json
  {
    "success": false,
    "data": null,
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
- **나쁜 예시**:
  ```json
  {
    "success": false,
    "error": {
      "message": "Error at UserService.createUser (UserService.ts:45)",
      "stack": "Error: ...\n    at Object.<anonymous> ..."
    }
  }
  ```

## API 버전 관리 전략

### 브레이킹 체인지 정의

- **규칙**: [MUST] 아래 분류에 따라 변경 사항이 브레이킹 체인지인지 판단한다.

**브레이킹 체인지 (Breaking Change)**

| 변경 유형 | 예시 |
|----------|------|
| 엔드포인트 삭제 또는 이름 변경 | `GET /api/v1/orders` → 삭제 |
| 응답 필드 삭제 또는 이름 변경 | `totalAmount` → `total` |
| 필드 타입 변경 | `id: number` → `id: string` |
| 새 필수 요청 필드 추가 | `warehouseId` 필수 파라미터 추가 |
| 필드 의미(semantic) 변경 | `amount`: 세전 → 세후 |
| 상태 코드 변경 | 200 → 201 |
| 쿼리 파라미터 삭제 | `?sort=createdAt` 지원 중단 |
| 에러 코드 변경 | `ORDER_NOT_FOUND` → `NOT_FOUND` |
| 인증 요구 사항 변경 | 공개 API → 인증 필수 |

**비 브레이킹 체인지 (Non-Breaking Change)**

| 변경 유형 | 예시 |
|----------|------|
| 새 선택적 요청 필드 추가 | `memo?: string` 추가 |
| 새 응답 필드 추가 | `estimatedDeliveryDate` 추가 |
| 새 엔드포인트 추가 | `GET /api/v1/orders/summary` 추가 |
| 새 선택적 쿼리 파라미터 추가 | `?includeItems=true` 추가 |
| 새 enum 값 추가 | `OrderStatus`에 `RETURNED` 추가 |
| 검증 완화 | `maxLength(50)` → `maxLength(100)` |

### 하위호환성 규칙

**서버 측 규칙**

- **규칙**: [MUST] 기존 응답 필드를 삭제하거나 이름을 변경하지 않는다.
- **규칙**: [MUST] 기존 엔드포인트에 새 필수 요청 필드를 추가하지 않는다. 새 필드는 반드시 선택적(optional)으로 추가한다.
- **규칙**: [MUST] 필드의 타입이나 의미를 변경하지 않는다. 변경이 필요하면 새 필드를 추가한다.
- **이유**: 이미 배포된 클라이언트가 기존 API 스펙에 의존하고 있으므로, 서버 측 변경이 클라이언트를 깨뜨리지 않아야 한다.

**클라이언트 측 규칙**

- **규칙**: [SHOULD] 응답에 포함된 알 수 없는 필드는 무시(ignore)한다.
- **규칙**: [SHOULD] 알 수 없는 enum 값은 기본값으로 처리하거나 무시한다.
- **이유**: 서버가 새 필드나 enum 값을 추가했을 때 클라이언트가 깨지지 않도록 방어적으로 처리한다.

### Deprecation 정책

- **규칙**: [MUST] API Deprecation은 아래 생명주기를 따른다.

```
Announce (공지)  →  Sunset (유예 기간)  →  Remove (제거)
```

- **규칙**: [MUST] 내부 API의 최소 Sunset 기간은 4주로 한다.
- **규칙**: [SHOULD] Deprecated API 응답에 `Sunset` 헤더(RFC 8594)를 포함한다.

```
Sunset: Sat, 01 Mar 2026 00:00:00 GMT
```

- **좋은 예시**:
  ```typescript
  // NestJS에서 deprecated 엔드포인트 표시
  @Get('/orders/legacy')
  @ApiOperation({
    summary: '주문 목록 조회 (Deprecated)',
    deprecated: true,
  })
  @Header('Sunset', 'Sat, 01 Mar 2026 00:00:00 GMT')
  async getLegacyOrders() {
    return this.orderService.getOrders();
  }
  ```

### 마이그레이션 가이드

- **규칙**: [MUST] 브레이킹 체인지가 포함된 버전 업그레이드 시 마이그레이션 문서를 작성한다.

**마이그레이션 문서 구조**

```markdown
# API v1 → v2 마이그레이션 가이드

## 타임라인
- 2026-01-15: v2 공개
- 2026-02-15: v1 Deprecated 공지
- 2026-03-15: v1 제거

## 브레이킹 체인지

### 주문 응답 필드 변경
- Before: `totalAmount: number`
- After: `totalAmount: { value: number, currency: string }`

## 새 기능
- 주문 요약 API 추가: `GET /api/v2/orders/summary`
```

- **좋은 예시**:
  ```typescript
  // NestJS Controller 버저닝
  @Controller({ path: 'orders', version: '2' })
  export class OrderV2Controller {
    @Get()
    getOrders() {
      return this.orderService.getOrdersV2();
    }
  }
  ```

## 필터링/정렬/검색 패턴

### 필터링

- **규칙**: [MUST] 동등 비교 필터는 플랫 쿼리 파라미터를 사용한다.
- **규칙**: [MUST] 범위 필터는 `From`/`To` 접미사를 사용한다.
- **규칙**: [SHOULD] 다중 값 필터는 쉼표(`,`)로 구분한다.
- **이유**: 단순 쿼리 파라미터 방식이 가장 직관적이고, 프론트엔드에서 URL 구성이 쉽다.
- **좋은 예시**:
  ```
  GET /api/v1/orders?status=pending,confirmed&createdAtFrom=2026-01-01&createdAtTo=2026-01-31
  GET /api/v1/products?categoryId=5&priceFrom=10000&priceTo=50000
  ```
- **나쁜 예시**:
  ```
  # OData 스타일 - 과도하게 복잡
  GET /api/v1/orders?filter[status][eq]=pending&filter[createdAt][gte]=2026-01-01
  ```

### 정렬

- **규칙**: [MUST] 정렬은 `sort=field:direction` 형식을 사용한다. 다중 정렬은 쉼표(`,`)로 구분한다.
- **규칙**: [MUST] 목록 API는 기본 정렬을 항상 정의한다.
- **이유**: 일관된 정렬 형식을 사용해야 프론트엔드에서 동적 정렬 UI를 쉽게 구현할 수 있다.
- **좋은 예시**:
  ```
  GET /api/v1/orders?sort=createdAt:desc,totalAmount:asc
  ```
- **나쁜 예시**:
  ```
  # 마이너스 기호 방식 - 방향이 모호하고 파싱이 어려움
  GET /api/v1/orders?sort=-createdAt
  ```

### 검색

- **규칙**: [SHOULD] 전문 검색(full-text search)은 `search` 파라미터를 사용한다.
- **규칙**: [MAY] 특정 필드 검색은 해당 필드명을 파라미터로 사용한다.
- **좋은 예시**:
  ```
  GET /api/v1/products?search=무선 키보드
  GET /api/v1/orders?recipientName=홍길동
  ```

### 목록 조회 QueryDto 표준

- **규칙**: [MUST] 목록 조회 API는 아래 구조를 기반으로 QueryDto를 정의한다.

```typescript
import { Type, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class GetOrderListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size: number = 20;

  @IsOptional()
  @IsString()
  sort?: string = 'createdAt:desc';

  @IsOptional()
  @IsEnum(OrderStatus, { each: true })
  @Transform(({ value }) => value?.split(','))
  status?: OrderStatus[];

  @IsOptional()
  @IsString()
  createdAtFrom?: string;

  @IsOptional()
  @IsString()
  createdAtTo?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
```

## Bulk 작업

- **규칙**: [MUST] Bulk 작업은 `/bulk` 하위 리소스 패턴을 사용한다.
- **규칙**: [MUST] 요청 본문은 `items` 배열을 포함한다.
- **규칙**: [MUST] 응답은 개별 항목별 결과(`results`)와 요약(`summary`)을 포함한다.
- **규칙**: [MUST] 부분 실패 시 200 OK를 반환하고, 개별 항목별 성공/실패를 표시한다.
- **규칙**: [MUST] 최대 배치 크기는 100으로 제한한다. 초과 시 400 Bad Request를 반환한다.
- **이유**: Bulk 작업은 개별 항목의 성공/실패가 독립적이므로, 전체를 실패 처리하면 클라이언트가 재시도 범위를 판단할 수 없다.

- **좋은 예시**:

  요청:
  ```
  POST /api/v1/orders/bulk
  ```
  ```json
  {
    "items": [
      { "productId": "prod-001", "quantity": 2 },
      { "productId": "prod-999", "quantity": 1 },
      { "productId": "prod-003", "quantity": 5 }
    ]
  }
  ```

  응답 (부분 실패):
  ```json
  {
    "success": true,
    "data": {
      "results": [
        { "index": 0, "success": true, "data": { "orderId": "ord-101" } },
        { "index": 1, "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "상품을 찾을 수 없습니다." } },
        { "index": 2, "success": true, "data": { "orderId": "ord-102" } }
      ],
      "summary": { "total": 3, "succeeded": 2, "failed": 1 }
    },
    "error": null
  }
  ```

- **나쁜 예시**:
  ```typescript
  // 프론트엔드에서 단건 API를 반복 호출 - 네트워크 비용 증가, 트랜잭션 불일치
  for (const item of items) {
    await fetch('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }
  ```

## 비동기 처리

- **규칙**: [MUST] 장시간 소요되는 작업은 202 Accepted 패턴을 사용한다.
- **규칙**: [MUST] 비동기 작업 응답에 `jobId`와 상태 조회 URL(`statusUrl`)을 포함한다.
- **규칙**: [MUST] 작업 상태는 `pending | processing | completed | failed | cancelled` 중 하나를 사용한다.
- **이유**: 동기 방식으로 장시간 처리를 대기하면 클라이언트 타임아웃과 서버 리소스 점유 문제가 발생한다.

- **좋은 예시**:

  작업 요청:
  ```
  POST /api/v1/reports/generate
  ```
  ```json
  { "type": "monthly-sales", "month": "2026-01" }
  ```

  202 응답:
  ```json
  {
    "success": true,
    "data": {
      "jobId": "job-abc-123",
      "status": "pending",
      "statusUrl": "/api/v1/jobs/job-abc-123"
    },
    "error": null
  }
  ```

  상태 조회 (처리 중):
  ```
  GET /api/v1/jobs/job-abc-123
  ```
  ```json
  {
    "success": true,
    "data": {
      "jobId": "job-abc-123",
      "status": "processing",
      "progress": 65
    },
    "error": null
  }
  ```

  상태 조회 (완료):
  ```json
  {
    "success": true,
    "data": {
      "jobId": "job-abc-123",
      "status": "completed",
      "progress": 100,
      "resultUrl": "/api/v1/reports/job-abc-123/download"
    },
    "error": null
  }
  ```

- **나쁜 예시**:
  ```typescript
  // 30초 이상 블로킹하는 동기 요청 - 타임아웃 위험
  @Post('/reports/generate')
  async generateReport(@Body() dto: GenerateReportDto) {
    const report = await this.reportService.generate(dto); // 30초+ 소요
    return report;
  }
  ```

## 파일 업로드

### 소규모 파일 (10MB 이하)

- **규칙**: [SHOULD] 10MB 이하의 파일은 `multipart/form-data`로 직접 업로드한다.
- **이유**: 소규모 파일은 Presigned URL 방식의 오버헤드(3단계 절차)가 불필요하다.
- **좋은 예시**:
  ```
  POST /api/v1/orders/:orderId/attachments
  Content-Type: multipart/form-data
  ```
  ```typescript
  @Post(':orderId/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.orderService.addAttachment(orderId, file);
  }
  ```

### 대규모 파일

- **규칙**: [MUST] 10MB 초과 파일은 Presigned URL 3단계 패턴을 사용한다.
- **이유**: 대용량 파일을 서버를 경유하면 메모리 부하와 타임아웃 위험이 있다. Presigned URL로 클라이언트가 S3에 직접 업로드하면 서버 부하를 회피할 수 있다.

```
1. 클라이언트 → 서버: Presigned URL 요청
2. 클라이언트 → S3: Presigned URL로 직접 업로드
3. 클라이언트 → 서버: 업로드 완료 확인
```

- **좋은 예시**:

  1단계 - Presigned URL 요청:
  ```
  POST /api/v1/uploads/presigned-url
  ```
  ```json
  { "fileName": "invoice.pdf", "contentType": "application/pdf", "fileSize": 52428800 }
  ```
  ```json
  {
    "success": true,
    "data": {
      "uploadId": "upload-abc-123",
      "presignedUrl": "https://s3.amazonaws.com/bucket/...",
      "expiresIn": 3600
    },
    "error": null
  }
  ```

  3단계 - 업로드 완료 확인:
  ```
  POST /api/v1/uploads/upload-abc-123/confirm
  ```
  ```json
  {
    "success": true,
    "data": { "fileUrl": "https://cdn.example.com/files/invoice.pdf" },
    "error": null
  }
  ```

### 파일 검증

- **규칙**: [MUST] 서버 측에서 파일 크기, MIME 타입, Magic Bytes를 검증한다.
- **규칙**: [MUST NOT] `Content-Type` 헤더만으로 파일 유형을 신뢰하지 않는다.
- **이유**: `Content-Type` 헤더는 클라이언트가 임의로 설정할 수 있으므로, 실제 파일 내용(Magic Bytes)을 검증해야 보안이 보장된다.

| 검증 항목 | 규칙 |
|----------|------|
| 파일 크기 | 엔드포인트별 최대 크기 제한 |
| MIME 타입 | 허용된 MIME 타입 목록과 대조 |
| Magic Bytes | 파일 헤더의 Magic Bytes로 실제 파일 유형 확인 |
| 파일명 | 경로 탐색 문자(`../`) 제거, 특수문자 치환 |

## 멱등성 (Idempotency)

- **규칙**: [MUST] 리소스를 생성하는 POST 엔드포인트는 `Idempotency-Key` 헤더를 지원한다.
- **규칙**: [MUST] `Idempotency-Key` 값은 UUID v4 형식을 사용한다.
- **규칙**: [SHOULD NOT] GET, DELETE, PUT, PATCH 엔드포인트에는 `Idempotency-Key`를 요구하지 않는다. 이 메서드들은 본질적으로 멱등하거나 멱등하게 설계해야 한다.
- **규칙**: [MUST] 서버는 `Idempotency-Key`와 응답을 Redis에 저장하며, TTL은 24시간으로 설정한다.
- **규칙**: [MUST] 동일한 키에 다른 요청 파라미터로 재요청하면 409 Conflict를 반환한다.
- **이유**: 네트워크 오류로 인한 재시도 시 중복 생성(예: 이중 결제)을 방지한다.

- **좋은 예시**:

  최초 요청:
  ```
  POST /api/v1/payments
  Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
  ```
  ```json
  { "orderId": "ord-101", "amount": 50000, "method": "card" }
  ```
  ```json
  {
    "success": true,
    "data": { "paymentId": "pay-001", "status": "completed" },
    "error": null
  }
  ```

  재시도 (동일 키) - 캐싱된 응답 반환:
  ```
  POST /api/v1/payments
  Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
  ```
  ```json
  {
    "success": true,
    "data": { "paymentId": "pay-001", "status": "completed" },
    "error": null
  }
  ```

- **나쁜 예시**:
  ```typescript
  // Idempotency-Key 없이 결제 재시도 - 이중 결제 발생
  async retryPayment(orderId: string) {
    // 네트워크 타임아웃 후 재시도 → 결제가 2번 실행될 수 있음
    await fetch('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify({ orderId, amount: 50000 }),
    });
  }
  ```

## 캐싱 전략

### ETag 기반 조건부 요청

- **규칙**: [SHOULD] 단건 조회 API는 ETag를 지원하여 불필요한 데이터 전송을 줄인다.
- **이유**: 데이터가 변경되지 않았으면 304 Not Modified를 반환하여 대역폭을 절약한다.

  최초 요청:
  ```
  GET /api/v1/products/prod-001
  ```
  ```
  HTTP/1.1 200 OK
  ETag: "a1b2c3d4"
  ```

  조건부 재요청:
  ```
  GET /api/v1/products/prod-001
  If-None-Match: "a1b2c3d4"
  ```
  ```
  HTTP/1.1 304 Not Modified
  ```

### 리소스 유형별 Cache-Control

- **규칙**: [SHOULD] 리소스 유형에 따라 아래 Cache-Control 정책을 적용한다.

| 리소스 유형 | Cache-Control | TTL | 예시 |
|------------|---------------|-----|------|
| 정적 참조 데이터 | `public, max-age=86400` | 24시간 | 국가 코드, 통화 목록 |
| 카탈로그 | `private, max-age=300` | 5분 | 상품 목록, 카테고리 |
| 사용자별 데이터 | `private, no-cache` | 항상 검증 | 주문 내역, 프로필 |
| 실시간 데이터 | `no-store` | 캐시 안 함 | 재고 수량, 실시간 가격 |

### 낙관적 동시성 제어

- **규칙**: [SHOULD] 수정 API는 `If-Match` 헤더와 ETag를 사용하여 동시성 충돌을 감지한다.
- **이유**: 두 사용자가 동시에 같은 리소스를 수정할 때, 먼저 수정한 내용이 덮어씌워지는 문제를 방지한다.

  수정 요청:
  ```
  PATCH /api/v1/products/prod-001
  If-Match: "a1b2c3d4"
  ```
  ```json
  { "price": 25000 }
  ```

  성공 (ETag 일치):
  ```
  HTTP/1.1 200 OK
  ETag: "e5f6g7h8"
  ```

  실패 (ETag 불일치 - 다른 사용자가 먼저 수정):
  ```
  HTTP/1.1 412 Precondition Failed
  ```
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "PRECONDITION_FAILED",
      "message": "리소스가 다른 사용자에 의해 수정되었습니다. 최신 데이터를 다시 조회해주세요."
    }
  }
  ```

## Rate Limiting

- **규칙**: [MUST] Rate Limit 응답에 표준 헤더를 포함한다.
- **규칙**: [MUST] 제한 초과 시 429 Too Many Requests와 `Retry-After` 헤더를 반환한다.

| 헤더 | 설명 |
|------|------|
| `RateLimit-Limit` | 허용된 최대 요청 수 |
| `RateLimit-Remaining` | 남은 요청 수 |
| `RateLimit-Reset` | 제한이 초기화되는 시각 (Unix timestamp) |

- **좋은 예시**:

  정상 응답:
  ```
  HTTP/1.1 200 OK
  RateLimit-Limit: 200
  RateLimit-Remaining: 150
  RateLimit-Reset: 1740000000
  ```

  제한 초과 응답:
  ```
  HTTP/1.1 429 Too Many Requests
  Retry-After: 30
  RateLimit-Limit: 200
  RateLimit-Remaining: 0
  RateLimit-Reset: 1740000000
  ```
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "요청 제한을 초과했습니다. 30초 후 다시 시도해주세요."
    }
  }
  ```

### Rate Limit 등급

- **규칙**: [SHOULD] 사용자별 아래 등급에 따라 Rate Limit을 적용한다.

| 등급 | 제한 | 대상 |
|------|------|------|
| Read | 200회/분 | GET 요청 |
| Write | 50회/분 | POST, PATCH, PUT, DELETE 요청 |
| Bulk | 10회/분 | Bulk 작업 엔드포인트 |
| Upload | 20회/분 | 파일 업로드 엔드포인트 |

## OpenAPI/Swagger 표준

### Code-First 규칙

- **규칙**: [MUST] NestJS Swagger 플러그인을 활성화하여 DTO에서 자동으로 스키마를 생성한다.

  `nest-cli.json` 설정:
  ```json
  {
    "compilerOptions": {
      "plugins": [
        {
          "name": "@nestjs/swagger",
          "options": {
            "classValidatorShim": true,
            "introspectComments": true
          }
        }
      ]
    }
  }
  ```

- **규칙**: [MUST] 모든 DTO 필드에 API Property 데코레이터를 사용한다. 구체적인 사용법은 [NestJS 컨벤션](../nestjs/NESTJS_CONVENTION.md)의 Swagger 문서화 섹션을 따른다.

### 엔드포인트 문서화

- **규칙**: [MUST] 모든 엔드포인트에 `@ApiOperation({ summary })` 를 작성한다.
- **규칙**: [MUST] 성공 응답과 주요 에러 응답에 `@ApiResponse`를 작성한다.
- **좋은 예시**:
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
- **나쁜 예시**:
  ```typescript
  // Swagger 데코레이터 없음 - API 문서에 정보가 표시되지 않음
  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto);
  }
  ```

### Schema 정의 표준

- **규칙**: [MUST] DTO 필드에는 `description`, `example`, 제약 조건을 명시한다.
- **이유**: Swagger UI에서 API 사용자가 필드의 의미와 형식을 즉시 파악할 수 있다.
- **좋은 예시**:
  ```typescript
  export class CreateOrderDto {
    /** 상품 ID */
    @IsString()
    @ApiPropertyExample('prod-001')
    productId: string;

    /** 주문 수량 (1 이상) */
    @IsInt()
    @Min(1)
    @Max(999)
    @ApiPropertyExample(2)
    quantity: number;
  }
  ```
- **나쁜 예시**:
  ```typescript
  export class CreateOrderDto {
    // description, example 없음 - Swagger에서 필드 의미를 알 수 없음
    @IsString()
    productId: string;

    @IsInt()
    quantity: number;
  }
  ```

### 프론트-백 타입 공유

- **규칙**: [SHOULD] OpenAPI 스펙에서 프론트엔드 타입을 자동 생성하여 타입 일관성을 유지한다.
- **이유**: 수동으로 타입을 동기화하면 불일치가 발생하고, API 변경 시 프론트엔드 타입이 깨진다.

```
NestJS (Code-First)
  → OpenAPI Spec (JSON/YAML) 자동 생성
    → openapi-typescript 또는 orval
      → 프론트엔드 TypeScript 타입/클라이언트 자동 생성
```

### API Spec 검증 자동화

- **규칙**: [SHOULD] CI 파이프라인에서 OpenAPI 스펙 검증을 자동화한다.
- **규칙**: [SHOULD] 브레이킹 체인지는 `oasdiff` 등의 도구로 자동 감지한다.

```yaml
# CI 파이프라인 예시
steps:
  - name: OpenAPI Lint
    run: npx @stoplight/spectral-cli lint openapi.json

  - name: Breaking Change Detection
    run: oasdiff breaking openapi-prev.json openapi-next.json
```

## DTO 네이밍 확장

- **규칙**: [MUST] DTO 클래스명은 [백엔드 공통 컨벤션](../BACKEND_CONVENTION.md)의 기본 패턴(`Create[Domain]Dto` / `Update[Domain]Dto` / `[Domain]ResponseDto` / `Get[Domain]ListQueryDto`)을 따르되, 아래 추가 패턴을 사용한다.

| 유형 | 패턴 | 예시 |
|------|------|------|
| Bulk 생성 요청 | `BulkCreate[Domain]Dto` | `BulkCreateOrderDto` |
| Bulk 수정 요청 | `BulkUpdate[Domain]Dto` | `BulkUpdateOrderDto` |
| Bulk 삭제 요청 | `BulkDelete[Domain]Dto` | `BulkDeleteOrderDto` |
| 목록 응답 | `[Domain]ListResponseDto` | `OrderListResponseDto` |
| 요약 응답 | `[Domain]SummaryDto` | `OrderSummaryDto` |
| 필터 조건 | `[Domain]FilterDto` | `OrderFilterDto` |
| 업로드 요청 | `Upload[Domain]Dto` | `UploadAttachmentDto` |
| 작업 상태 응답 | `[Domain]JobStatusDto` | `ReportJobStatusDto` |

- **규칙**: [SHOULD] 기존 DTO를 재활용할 때 NestJS의 `PartialType`, `PickType`을 사용한다.
- **좋은 예시**:
  ```typescript
  import { PartialType, PickType } from '@nestjs/swagger';

  // CreateOrderDto의 모든 필드를 optional로
  export class UpdateOrderDto extends PartialType(CreateOrderDto) {}

  // CreateOrderDto에서 특정 필드만 선택
  export class OrderSummaryDto extends PickType(OrderResponseDto, [
    'orderId',
    'status',
    'totalAmount',
  ] as const) {}
  ```

## 안티패턴

### 과도한 URL 중첩

- **설명**: 리소스 관계를 URL에 3단계 이상 중첩하여 표현하는 패턴.
- **징후**:
  - URL에 경로 파라미터가 3개 이상 포함됨
  - URL만으로 어떤 리소스에 접근하는지 파악이 어려움
  - 상위 리소스 ID가 불필요하게 요구됨
- **나쁜 예시**:
  ```
  GET /api/v1/users/:userId/orders/:orderId/items/:itemId/reviews/:reviewId
  ```
- **해결 방법**: 2단계까지만 중첩하고, 깊은 리소스는 독립 엔드포인트로 분리한다.
  ```
  GET /api/v1/order-items/:itemId/reviews
  GET /api/v1/reviews/:reviewId
  ```

### POST 만능주의

- **설명**: 모든 API 동작에 POST 메서드를 사용하는 패턴.
- **징후**:
  - 조회 API에 POST를 사용
  - 삭제 API에 POST를 사용
  - URL에 동사가 포함됨 (`/api/v1/getOrders`)
- **나쁜 예시**:
  ```
  POST /api/v1/getOrders
  POST /api/v1/deleteOrder
  POST /api/v1/updateOrderStatus
  ```
- **해결 방법**: HTTP 메서드 매핑 규칙에 따라 적절한 메서드를 사용한다.
  ```
  GET    /api/v1/orders
  DELETE /api/v1/orders/:id
  PATCH  /api/v1/orders/:id
  ```

### 민감 정보 응답 노출

- **설명**: 내부 시스템 정보나 민감한 필드를 API 응답에 포함하는 패턴.
- **징후**:
  - DB의 auto-increment ID(`_id`)가 응답에 노출됨
  - 비밀번호 해시, 내부 메모 등이 응답에 포함됨
  - 에러 응답에 스택 트레이스가 포함됨
- **나쁜 예시**:
  ```json
  {
    "id": "uuid-123",
    "_id": 42,
    "email": "user@example.com",
    "passwordHash": "$2b$10$...",
    "internalNote": "VIP 고객 - 할인 적용",
    "dbConnectionString": "postgresql://..."
  }
  ```
- **해결 방법**: ResponseDto를 통해 노출할 필드만 명시적으로 선택한다. `class-transformer`의 `@Exclude()`를 활용한다.

### 부분 수정에 PUT 사용

- **설명**: 리소스의 일부 필드만 수정하는데 PUT 메서드를 사용하는 패턴.
- **징후**:
  - PUT 요청 본문에 수정하지 않는 필드까지 모두 포함해야 함
  - 누락된 필드가 null로 덮어씌워지는 문제 발생
- **나쁜 예시**:
  ```
  PUT /api/v1/orders/ord-101
  {
    "productId": "prod-001",
    "quantity": 2,
    "status": "confirmed",
    "memo": null,
    "shippingAddress": "서울시 ...",
    "recipientName": "홍길동"
  }
  ```
- **해결 방법**: 부분 수정에는 PATCH를 사용하고, 수정할 필드만 요청 본문에 포함한다.
  ```
  PATCH /api/v1/orders/ord-101
  { "status": "confirmed" }
  ```

### 비일관적 네이밍

- **설명**: 엔드포인트 간 네이밍 스타일이 통일되지 않는 패턴.
- **징후**:
  - 일부 URL은 camelCase, 일부는 snake_case, 일부는 kebab-case 사용
  - JSON 필드명이 API마다 다른 스타일 적용
  - 같은 개념을 다른 이름으로 표현 (`orderId` vs `order_id` vs `orderNo`)
- **나쁜 예시**:
  ```
  GET /api/v1/orderItems          # camelCase
  GET /api/v1/shipment_trackings  # snake_case
  GET /api/v1/return-requests     # kebab-case
  ```
- **해결 방법**: URL은 kebab-case, JSON 필드는 camelCase로 통일한다. 이 문서의 네이밍 규칙을 준수한다.

## 참고 자료

- [Microsoft Azure REST API Guidelines](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [Google API Design Guide](https://cloud.google.com/apis/design)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [RFC 8594 - The Sunset HTTP Header Field](https://www.rfc-editor.org/rfc/rfc8594)
- [RFC 7232 - Conditional Requests](https://www.rfc-editor.org/rfc/rfc7232)
- [RFC 7234 - HTTP Caching](https://www.rfc-editor.org/rfc/rfc7234)
- [IETF Draft - RateLimit Header Fields](https://www.ietf.org/archive/id/draft-ietf-httpapi-ratelimit-headers-07.html)
- [IETF Draft - Idempotency-Key Header](https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-04.html)
- [NestJS Swagger Documentation](https://docs.nestjs.com/recipes/swagger)
