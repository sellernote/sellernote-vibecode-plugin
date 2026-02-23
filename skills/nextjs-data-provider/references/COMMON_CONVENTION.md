# 공통 컨벤션

> 모든 직군과 도구에 적용되는 공통 규칙을 정의합니다.
> 특정 도메인에 종속적인 규칙은 하위 폴더의 문서를 참조하세요.
>
> - [TypeScript 컨벤션](typescript/TYPESCRIPT_CONVENTION.md)

## 도메인 용어 사전

프로젝트에서 사용하는 비즈니스/기술 용어를 정의합니다.
AI는 코드 생성 시 여기 정의된 용어를 변수명, 클래스명 등에 일관되게 사용합니다.

| 용어 | 영문 | 설명 |
|------|------|------|
| TBD | TBD | TBD |

> 새 용어가 추가되면 반드시 이 표를 업데이트하여 팀 전체의 용어 일관성을 유지합니다.

## 네이밍 컨벤션

### 일반 원칙

- **규칙**: [MUST] 이름만으로 의미를 파악할 수 있도록 명확한 이름을 사용한다.
- **이유**: 코드를 읽는 시간이 작성하는 시간보다 길다. 명확한 이름은 주석 없이도 의도를 전달한다.

- **규칙**: [MUST] 약어는 팀에서 합의된 것만 사용한다. 도메인 용어 사전에 등록되지 않은 약어는 사용하지 않는다.
- **이유**: 약어는 맥락에 따라 다르게 해석될 수 있어 오해를 유발한다.

- **규칙**: [MUST NOT] 이름에 타입 정보를 중복하여 포함하지 않는다. (헝가리안 표기법 금지)
- **이유**: 타입 시스템이 제공하는 정보를 이름에 중복하면 유지보수 시 불일치가 발생한다.
- **나쁜 예시**:
  ```typescript
  const strName = 'John';     // str 접두사 불필요
  const arrItems = [1, 2, 3]; // arr 접두사 불필요
  ```

### 변수명 — camelCase

- **규칙**: [MUST] 변수명, 함수명, 메서드명은 camelCase를 사용한다.
- **이유**: JavaScript/TypeScript 생태계의 표준 관행이다.
- **좋은 예시**:
  ```typescript
  const userName = 'John';
  const totalPrice = 10000;
  function getUserById(id: string) { ... }
  ```
- **나쁜 예시**:
  ```typescript
  const user_name = 'John';     // snake_case
  const UserName = 'John';      // PascalCase (변수에 사용 불가)
  ```

### 클래스/인터페이스/타입명 — PascalCase

- **규칙**: [MUST] 클래스, 인터페이스, 타입 별칭, Enum은 PascalCase를 사용한다.
- **이유**: 타입 수준의 정의와 값 수준의 변수를 시각적으로 구분한다.
- **좋은 예시**:
  ```typescript
  class UserService { ... }
  interface CreateUserRequest { ... }
  type PaymentStatus = 'pending' | 'completed' | 'failed';
  ```

### 상수 — UPPER_SNAKE_CASE

- **규칙**: [MUST] 변경되지 않는 전역 상수, 환경변수 키는 UPPER_SNAKE_CASE를 사용한다.
- **이유**: 상수임을 시각적으로 즉시 인지할 수 있다.
- **좋은 예시**:
  ```typescript
  const MAX_RETRY_COUNT = 3;
  const API_BASE_URL = 'https://api.example.com';
  ```
- **규칙**: [SHOULD] 객체 내부 속성이나 지역 상수는 camelCase를 사용한다. UPPER_SNAKE_CASE는 모듈 수준의 전역 상수에만 사용한다.
- **이유**: 지역 상수까지 UPPER_SNAKE_CASE를 사용하면 가독성이 오히려 저하된다.

### 파일명

- **규칙**: [MUST] 파일명은 해당 프레임워크/도구의 관행을 따른다. 관행이 없는 경우 kebab-case를 기본으로 사용한다.
- **이유**: 운영체제 간 대소문자 민감도 차이로 인한 문제를 방지한다.
- **좋은 예시**:
  ```
  user-service.ts
  create-order.dto.ts
  payment-status.type.ts
  ```

### Boolean 네이밍

- **규칙**: [MUST] boolean 변수는 `is`, `has`, `can`, `should` 등의 접두사를 사용한다.
- **이유**: 해당 값이 참/거짓을 나타냄을 명확히 전달한다.
- **좋은 예시**:
  ```typescript
  const isActive = true;
  const hasPermission = false;
  const canEdit = user.role === 'admin';
  const shouldRefresh = Date.now() > expiresAt;
  ```
- **나쁜 예시**:
  ```typescript
  const active = true;      // boolean인지 불명확
  const permission = false;  // 권한 객체인지 boolean인지 모호
  ```

### 함수 네이밍

- **규칙**: [MUST] 함수명은 동사로 시작하고, camelCase를 사용한다.
- **이유**: 함수의 동작을 이름만으로 파악할 수 있어 코드 가독성이 높아진다.
- **좋은 예시**:
  ```typescript
  function getUserById(id: string): User { ... }
  function calculateTotalPrice(items: Item[]): number { ... }
  ```
- **나쁜 예시**:
  ```typescript
  function user(id: string): User { ... }           // 동사 누락
  function get_user_by_id(id: string): User { ... }  // snake_case 사용
  ```

## Git 컨벤션

### 브랜치 전략

- **규칙**: [MUST] 다음 브랜치 네이밍 규칙을 따른다.

| 브랜치 | 용도 | 예시 |
|--------|------|------|
| `main` | 프로덕션 배포 브랜치 | - |
| `develop` | 개발 통합 브랜치 | - |
| `feat/<설명>` | 새 기능 개발 | `feat/user-authentication` |
| `fix/<설명>` | 버그 수정 | `fix/login-validation-error` |
| `hotfix/<설명>` | 프로덕션 긴급 수정 | `hotfix/payment-crash` |
| `refactor/<설명>` | 리팩토링 | `refactor/order-service` |
| `chore/<설명>` | 빌드, 설정 등 유지보수 | `chore/update-dependencies` |

- **규칙**: [MUST] 브랜치명은 소문자와 하이픈(`-`)만 사용하고, 슬래시(`/`)로 타입과 설명을 구분한다.
- **이유**: 일관된 브랜치명은 자동화 도구와의 호환성을 보장하고, 브랜치 목적을 빠르게 파악할 수 있게 한다.

- **규칙**: [SHOULD] Jira 이슈가 있는 경우 브랜치명에 이슈 번호를 포함한다.
- **좋은 예시**:
  ```
  feat/PROJ-123-user-authentication
  fix/PROJ-456-login-validation
  ```

### 커밋 메시지 — Conventional Commits

- **규칙**: [MUST] Conventional Commits 형식을 따른다.
- **이유**: 자동 CHANGELOG 생성, 시맨틱 버저닝 자동화, 커밋 이력의 가독성 향상에 기여한다.

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**타입 정의**:

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새 기능 추가 | `feat(auth): add JWT refresh token` |
| `fix` | 버그 수정 | `fix(order): resolve null pointer in validation` |
| `docs` | 문서 변경 | `docs: update API documentation` |
| `style` | 코드 포매팅, 세미콜론 누락 등 | `style: apply prettier formatting` |
| `refactor` | 기능 변경 없는 코드 구조 개선 | `refactor(user): extract validation logic` |
| `perf` | 성능 개선 | `perf(query): add index for user lookup` |
| `test` | 테스트 추가/수정 | `test(auth): add login failure test cases` |
| `chore` | 빌드, 설정 등 유지보수 | `chore: update dependencies` |
| `ci` | CI/CD 설정 변경 | `ci: add staging deployment workflow` |

- **규칙**: [MUST] 커밋 제목은 명령형(imperative)으로 작성한다. 50자 이내로 유지한다.
- **규칙**: [MUST] 하나의 커밋에는 하나의 관심사만 포함한다.
- **규칙**: [SHOULD] Breaking Change가 있는 경우 타입 뒤에 `!`를 붙이고, footer에 `BREAKING CHANGE:`를 명시한다.
- **좋은 예시**:
  ```
  feat(auth)!: change token expiry to 1 hour

  BREAKING CHANGE: token expiry changed from 24h to 1h.
  All existing tokens will be invalidated.
  ```
- **나쁜 예시**:
  ```
  fixed bug           // 타입 누락, 과거형, 설명 불충분
  feat: 로그인 기능    // 영문 권장 (팀 합의에 따라 한글 허용 가능)
  update code         // 무엇을 왜 변경했는지 불명확
  ```

### PR 규칙

- **규칙**: [MUST] PR 제목은 Conventional Commits 형식을 따른다.
- **이유**: Squash merge 시 PR 제목이 커밋 메시지가 되므로 동일한 형식을 유지해야 한다.

- **규칙**: [MUST] PR 본문에 다음 내용을 포함한다.
  - 변경 사항 요약
  - 관련 이슈 번호 (있는 경우)
  - 테스트 방법 또는 확인 사항

- **규칙**: [SHOULD] PR은 가능한 한 작은 단위로 생성한다. (변경 파일 10개 이하 권장)
- **이유**: 작은 PR은 리뷰 품질을 높이고, 리뷰 소요 시간을 줄인다.

- **규칙**: [MUST NOT] 리뷰 승인 없이 main/develop 브랜치에 직접 merge하지 않는다.

## 코드 리뷰

### 리뷰 기준

- **규칙**: [MUST] 코드 리뷰 시 다음 관점에서 검토한다.

| 관점 | 확인 사항 |
|------|----------|
| 정확성 | 로직이 요구사항을 올바르게 구현하는가 |
| 가독성 | 코드가 명확하고 이해하기 쉬운가 |
| 유지보수성 | 변경에 유연하고 확장 가능한 구조인가 |
| 성능 | 불필요한 연산이나 비효율적인 패턴은 없는가 |
| 보안 | 보안 취약점이 없는가 (입력 검증, 인증/인가 등) |
| 테스트 | 적절한 테스트가 포함되어 있는가 |
| 컨벤션 | 팀 컨벤션을 준수하는가 |

### 승인 조건

- **규칙**: [MUST] 최소 1명 이상의 리뷰어 승인을 받아야 merge할 수 있다.
- **규칙**: [SHOULD] 핵심 로직 변경 시 2명 이상의 승인을 권장한다.
- **규칙**: [MUST] CI 파이프라인(빌드, 테스트, 린트)이 모두 통과해야 merge할 수 있다.

### 리뷰 코멘트 작성

- **규칙**: [SHOULD] 리뷰 코멘트에 다음 접두사를 사용하여 의도를 명확히 한다.

| 접두사 | 의미 | 예시 |
|--------|------|------|
| `[MUST]` | 반드시 수정 필요 (merge blocker) | `[MUST] SQL injection 위험이 있습니다.` |
| `[SHOULD]` | 수정 권장 | `[SHOULD] 이 부분은 early return으로 개선할 수 있습니다.` |
| `[NIT]` | 사소한 개선 제안 | `[NIT] 변수명을 더 명확하게 할 수 있을 것 같습니다.` |
| `[Q]` | 질문 | `[Q] 이 로직의 의도가 무엇인가요?` |

## 에러 처리

### 에러 코드 체계

- **규칙**: [MUST] 에러 코드는 `{도메인}_{카테고리}_{상세}` 형식의 문자열 상수를 사용한다.
- **이유**: 에러 발생 위치와 원인을 코드만으로 빠르게 파악할 수 있다.
- **좋은 예시**:
  ```typescript
  // 도메인_카테고리_상세
  const AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED';
  const AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS';
  const ORDER_PAYMENT_FAILED = 'ORDER_PAYMENT_FAILED';
  const USER_NOT_FOUND = 'USER_NOT_FOUND';
  ```

### 에러 응답 포맷 (HTTP API)

- **규칙**: [MUST] API 에러 응답은 다음 표준 형식을 따른다.
- **이유**: 일관된 에러 응답은 클라이언트가 에러를 프로그래밍 방식으로 처리할 수 있게 한다.

```json
{
  "success": false,
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "인증 토큰이 만료되었습니다.",
    "details": null
  }
}
```

- **규칙**: [SHOULD] 유효성 검증 에러는 `details` 필드에 필드별 에러 정보를 포함한다.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "입력값이 유효하지 않습니다.",
    "details": [
      { "field": "email", "message": "올바른 이메일 형식이 아닙니다." },
      { "field": "password", "message": "8자 이상이어야 합니다." }
    ]
  }
}
```

### HTTP 상태 코드 사용

- **규칙**: [MUST] 적절한 HTTP 상태 코드를 반환한다. 모든 에러에 400이나 500을 사용하지 않는다.

| 상태 코드 | 용도 |
|----------|------|
| 400 | 잘못된 요청 (유효성 검증 실패) |
| 401 | 인증 실패 (토큰 없음, 만료) |
| 403 | 권한 없음 (인증은 됐으나 접근 불가) |
| 404 | 리소스를 찾을 수 없음 |
| 409 | 리소스 충돌 (중복 생성 등) |
| 422 | 처리 불가능한 엔티티 |
| 429 | 요청 횟수 초과 (Rate Limit) |
| 500 | 서버 내부 오류 |
| 502 | 외부 서비스 오류 |
| 503 | 서비스 일시 중단 |

### 에러 처리 원칙

- **규칙**: [MUST NOT] 에러 응답에 스택 트레이스, DB 쿼리, 내부 경로 등 민감한 구현 세부사항을 노출하지 않는다.
- **이유**: 공격자에게 시스템 내부 정보를 제공하는 보안 취약점이 된다.

- **규칙**: [MUST NOT] 인증 에러에서 "사용자를 찾을 수 없음", "비밀번호가 틀림" 등 계정 존재 여부를 노출하는 메시지를 사용하지 않는다.
- **이유**: 계정 열거 공격(Account Enumeration Attack)에 악용될 수 있다.
- **좋은 예시**: `"인증 정보가 올바르지 않습니다."`
- **나쁜 예시**: `"해당 이메일의 사용자가 존재하지 않습니다."`

## 로깅

### 로그 레벨

- **규칙**: [MUST] 다음 로그 레벨 기준을 준수한다.

| 레벨 | 용도 | 예시 |
|------|------|------|
| `ERROR` | 즉시 대응이 필요한 오류 | DB 연결 실패, 외부 API 장애, 결제 실패 |
| `WARN` | 잠재적 문제, 예상 가능한 예외 | 재시도 발생, 설정값 폴백, 느린 쿼리 |
| `INFO` | 주요 비즈니스 이벤트, 상태 변경 | 사용자 가입, 주문 생성, 배포 시작 |
| `DEBUG` | 개발/디버깅용 상세 정보 | 함수 파라미터, 쿼리 결과, 중간 계산값 |

- **규칙**: [MUST NOT] 프로덕션 환경에서 DEBUG 레벨을 활성화하지 않는다.
- **이유**: 불필요한 로그가 성능 저하와 스토리지 비용 증가를 유발한다.

- **규칙**: [SHOULD] ERROR 로그에는 에러를 추적할 수 있는 충분한 컨텍스트(요청 ID, 사용자 ID, 입력값 요약 등)를 포함한다.

### 로그 포맷

- **규칙**: [SHOULD] 구조화된 로그(Structured Logging)를 사용한다. JSON 형식을 권장한다.
- **이유**: 로그 수집/분석 도구에서 파싱과 검색이 용이하다.
- **좋은 예시**:
  ```json
  {
    "timestamp": "2025-01-15T09:30:00.000Z",
    "level": "ERROR",
    "message": "Payment processing failed",
    "service": "order-service",
    "requestId": "req-abc-123",
    "userId": "user-456",
    "errorCode": "ORDER_PAYMENT_FAILED",
    "metadata": {
      "orderId": "ord-789",
      "amount": 50000
    }
  }
  ```
- **나쁜 예시**:
  ```
  2025-01-15 09:30:00 ERROR Payment failed for user user-456
  ```

### 민감정보 마스킹

- **규칙**: [MUST] 다음 정보는 로그에 절대 평문으로 기록하지 않는다.

| 민감정보 유형 | 마스킹 방법 | 예시 |
|-------------|------------|------|
| 비밀번호 | 전체 마스킹 | `****` |
| 이메일 | 부분 마스킹 | `j***@example.com` |
| 전화번호 | 부분 마스킹 | `010-****-5678` |
| 카드번호 | 뒤 4자리만 표시 | `****-****-****-1234` |
| 토큰/API 키 | 앞 4자리만 표시 | `eyJh****` |
| 주민등록번호 | 전체 마스킹 | `******-*******` |

- **규칙**: [MUST NOT] 요청/응답 본문을 통째로 로깅하지 않는다. 필요한 필드만 선별하여 기록한다.
- **이유**: 의도치 않게 민감정보가 로그에 포함될 수 있다.

- **규칙**: [SHOULD] 로깅 미들웨어 또는 유틸리티에서 민감정보 마스킹을 자동화한다.
- **이유**: 개발자가 매번 수동으로 마스킹하면 실수가 발생할 수 있다.

## 안티패턴

### 매직 넘버/문자열

- **규칙**: [MUST NOT] 코드에 의미를 알 수 없는 숫자나 문자열을 직접 사용하지 않는다.
- **나쁜 예시**:
  ```typescript
  if (status === 3) { ... }        // 3이 무엇을 의미하는지 불명확
  if (role === 'A') { ... }        // 'A'가 무엇인지 불명확
  setTimeout(handler, 86400000);   // 숫자의 의미 불명확
  ```
- **좋은 예시**:
  ```typescript
  const ORDER_STATUS_COMPLETED = 3;
  if (status === ORDER_STATUS_COMPLETED) { ... }

  const ROLE_ADMIN = 'A';
  if (role === ROLE_ADMIN) { ... }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  setTimeout(handler, ONE_DAY_MS);
  ```

### 비밀번호/키 하드코딩

- **규칙**: [MUST NOT] 소스 코드에 비밀번호, API 키, 시크릿을 직접 작성하지 않는다. 환경변수 또는 시크릿 매니저를 사용한다.

## 참고 자료

- [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [RFC 7807 - Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
