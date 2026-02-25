# TypeScript 컨벤션

> TypeScript를 사용하는 모든 프로젝트에 적용되는 코딩 규칙을 정의합니다.
> 상위 규칙: [공통 컨벤션](../COMMON_CONVENTION.md)

## 기술 스택

| 항목 | 버전/설정 |
|------|----------|
| TypeScript | TBD (예: 5.x) |
| strict mode | `true` (필수) |
| target | TBD (예: ES2022) |
| module | TBD (예: ESNext) |

- **규칙**: [MUST] `tsconfig.json`에서 `"strict": true`를 활성화한다.
- **이유**: `strict` 모드는 `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes` 등을 포함하며, 런타임 에러를 컴파일 타임에 잡아준다.

## 타입 시스템

### interface vs type

- **규칙**: [SHOULD] 객체의 형태(shape)를 정의할 때는 `interface`를 사용한다.
- **규칙**: [SHOULD] 유니온 타입, 인터섹션 타입, 유틸리티 타입 조합 등에는 `type`을 사용한다.
- **이유**: `interface`는 선언 병합(declaration merging)이 가능하고, 에러 메시지에서 이름이 유지되어 디버깅에 유리하다. `type`은 유니온, 매핑 타입 등 고급 타입 표현에 적합하다.
- **좋은 예시**:
  ```typescript
  // 객체 형태 정의 → interface
  interface User {
    id: string;
    name: string;
    email: string;
  }

  // 유니온 타입 → type
  type PaymentStatus = 'pending' | 'completed' | 'failed';

  // 유틸리티 타입 조합 → type
  type CreateUserRequest = Omit<User, 'id'>;
  ```
- **나쁜 예시**:
  ```typescript
  // 단순 객체 형태인데 type 사용 (interface가 더 적합)
  type User = {
    id: string;
    name: string;
  };

  // 유니온 타입인데 interface로 시도 (불가능)
  // interface Status = 'active' | 'inactive'; // 컴파일 에러
  ```

### 제네릭

- **규칙**: [SHOULD] 제네릭 타입 매개변수는 의미 있는 이름을 사용한다. 단일 문자(`T`, `U` 등)는 간단한 경우에만 사용한다.
- **이유**: 복잡한 제네릭에서 단일 문자는 의미를 파악하기 어렵다.
- **좋은 예시**:
  ```typescript
  // 단순한 경우 — T 허용
  function identity<T>(value: T): T {
    return value;
  }

  // 복잡한 경우 — 의미 있는 이름 사용
  interface Repository<Entity, Id> {
    findById(id: Id): Promise<Entity | null>;
    save(entity: Entity): Promise<Entity>;
  }
  ```

### 유틸리티 타입 활용

- **규칙**: [SHOULD] TypeScript 내장 유틸리티 타입(`Partial`, `Pick`, `Omit`, `Record` 등)을 적극 활용한다.
- **이유**: 타입 중복을 줄이고, 원본 타입과의 관계를 명확히 표현한다.
- **좋은 예시**:
  ```typescript
  interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  }

  type CreateUserDto = Omit<User, 'id' | 'createdAt'>;
  type UpdateUserDto = Partial<Pick<User, 'name' | 'email'>>;
  ```

### any와 unknown

- **규칙**: [MUST NOT] `any` 타입을 사용하지 않는다. 타입을 모르는 경우 `unknown`을 사용한다.
- **이유**: `any`는 타입 검사를 완전히 무력화하여, TypeScript를 사용하는 의미를 상실시킨다.
- **좋은 예시**:
  ```typescript
  function parseJson(input: string): unknown {
    return JSON.parse(input);
  }

  function processData(data: unknown): void {
    if (typeof data === 'string') {
      console.log(data.toUpperCase()); // 타입 좁히기 후 사용
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  function parseJson(input: string): any {
    return JSON.parse(input);
  }

  function processData(data: any): void {
    console.log(data.toUpperCase()); // 런타임 에러 위험
  }
  ```

## 코딩 스타일

### 변수 선언 — const / let

- **규칙**: [MUST] 기본적으로 `const`를 사용하고, 재할당이 필요한 경우에만 `let`을 사용한다.
- **규칙**: [MUST NOT] `var`를 사용하지 않는다.
- **이유**: `const`는 재할당을 방지하여 코드의 예측 가능성을 높인다. `var`는 함수 스코프와 호이스팅으로 인해 예기치 않은 버그를 유발한다.
- **좋은 예시**:
  ```typescript
  const userName = 'John';
  const items = [1, 2, 3]; // 배열 내용 변경은 가능하므로 const 사용

  let count = 0;
  count += 1; // 재할당 필요 → let
  ```

### 함수 작성

- **규칙**: [MUST] 함수의 반환 타입은 public API(export하는 함수)에서 명시적으로 선언한다.
- **규칙**: [MAY] 내부 함수의 반환 타입은 TypeScript 추론에 위임할 수 있다.
- **이유**: public API의 명시적 반환 타입은 의도하지 않은 타입 변경을 방지하고, 문서 역할을 한다.
- **좋은 예시**:
  ```typescript
  // public API — 반환 타입 명시
  export function calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // 내부 함수 — 추론 허용
  function formatPrice(price: number) {
    return `${price.toLocaleString()}원`;
  }
  ```

### 화살표 함수

- **규칙**: [SHOULD] 콜백 함수, 인라인 함수에는 화살표 함수를 사용한다.
- **규칙**: [SHOULD] 최상위 함수(export되는 함수)에는 `function` 선언을 사용한다.
- **이유**: `function` 선언은 호이스팅되어 파일 내 순서에 유연하고, 스택 트레이스에서 함수 이름이 표시된다.
- **좋은 예시**:
  ```typescript
  // 최상위 export 함수 — function 선언
  export function getActiveUsers(users: User[]): User[] {
    return users.filter((user) => user.isActive);
  }

  // 콜백 — 화살표 함수
  const sortedItems = items.sort((a, b) => a.price - b.price);
  ```

### 비동기 처리 — async/await

- **규칙**: [MUST] Promise를 다룰 때는 `async/await`를 사용한다. `.then()` 체인을 지양한다.
- **이유**: `async/await`는 비동기 코드를 동기 코드처럼 읽을 수 있어 가독성이 높다.
- **좋은 예시**:
  ```typescript
  async function fetchUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`User fetch failed: ${response.status}`);
    }
    return response.json();
  }
  ```
- **나쁜 예시**:
  ```typescript
  function fetchUser(id: string): Promise<User> {
    return fetch(`/api/users/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`User fetch failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => data as User);
  }
  ```

- **규칙**: [MUST] 비동기 함수에서 에러 처리를 누락하지 않는다. `try/catch` 또는 상위 에러 핸들러를 사용한다.

## null / undefined 처리

### Optional Chaining과 Nullish Coalescing

- **규칙**: [MUST] optional chaining(`?.`)과 nullish coalescing(`??`)을 사용하여 null/undefined를 안전하게 처리한다.
- **이유**: 중첩된 null 검사 코드를 간결하게 만들고, `||` 연산자의 falsy 값 문제를 방지한다.
- **좋은 예시**:
  ```typescript
  // optional chaining
  const city = user?.address?.city;

  // nullish coalescing — null/undefined만 대체
  const pageSize = input ?? 10;
  ```
- **나쁜 예시**:
  ```typescript
  // 장황한 null 검사
  const city = user && user.address && user.address.city;

  // || 연산자 — 0, '', false도 대체됨 (의도치 않은 동작)
  const pageSize = input || 10; // input이 0이면 10이 됨
  ```

### strictNullChecks

- **규칙**: [MUST] `strictNullChecks`를 활성화한 상태에서 코드를 작성한다. (`strict: true`에 포함)
- **이유**: null/undefined가 될 수 있는 값을 컴파일 타임에 잡아내어, 런타임 `TypeError`를 방지한다.

- **규칙**: [SHOULD] 함수 매개변수에서 optional(`?`)과 `| undefined`를 구분하여 사용한다.
- **좋은 예시**:
  ```typescript
  // name은 전달하지 않아도 됨 (선택적 매개변수)
  function greet(name?: string): string {
    return `Hello, ${name ?? 'World'}`;
  }

  // value는 반드시 전달해야 하지만, undefined일 수 있음
  function process(value: string | undefined): void {
    if (value !== undefined) {
      console.log(value);
    }
  }
  ```

## Enum vs Union

### Enum 사용 지양

- **규칙**: [SHOULD] `enum` 대신 union type 또는 `as const` 객체를 사용한다.
- **이유**: `enum`은 TypeScript의 다른 타입과 달리 런타임 코드를 생성하여 번들 크기를 증가시키고, 트리 쉐이킹을 방해한다.

### Enum / as const 네이밍 규칙

- **규칙**: [MUST] enum 및 `as const` 객체의 key는 **PascalCase**, value는 **소문자 snake_case**를 사용한다.
- **이유**: key는 상수 식별자로서 PascalCase를 사용하여 일반 변수와 구분하고, value는 API 응답, DB 저장값 등 외부 시스템과의 인터페이스에서 사용되므로 소문자 snake_case로 통일한다.
- **좋은 예시**:
  ```typescript
  // as const 객체
  const OrderStatus = {
    Pending: 'pending',
    Processing: 'processing',
    Shipped: 'shipped',
    Delivered: 'delivered',
  } as const;

  // enum
  enum PaymentMethod {
    CreditCard = 'credit_card',
    BankTransfer = 'bank_transfer',
    VirtualAccount = 'virtual_account',
  }
  ```
- **나쁜 예시**:
  ```typescript
  // UPPER_CASE key — PascalCase를 사용해야 함
  const OrderStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
  } as const;

  // UPPER_CASE value — 소문자 snake_case를 사용해야 함
  enum OrderStatus {
    Pending = 'PENDING',
    Processing = 'PROCESSING',
  }

  // camelCase value — 소문자 snake_case를 사용해야 함
  enum PaymentMethod {
    CreditCard = 'creditCard',
    BankTransfer = 'bankTransfer',
  }

  // camelCase key — PascalCase를 사용해야 함
  const OrderStatus = {
    pending: 'pending',
    processing: 'processing',
  } as const;
  ```

### Union Type 사용 (단순한 경우)

- **좋은 예시**:
  ```typescript
  // 단순한 문자열 집합 — union type
  type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

  function updateStatus(orderId: string, status: OrderStatus): void {
    // ...
  }
  ```

### as const 객체 사용 (값 참조가 필요한 경우)

- **좋은 예시**:
  ```typescript
  // 값을 참조해야 하는 경우 — as const 객체
  const OrderStatus = {
    Pending: 'pending',
    Processing: 'processing',
    Shipped: 'shipped',
    Delivered: 'delivered',
  } as const;  // value가 단일 단어인 경우 snake_case와 동일

  type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

  // 값 참조 가능
  if (order.status === OrderStatus.Pending) {
    // ...
  }
  ```

### Enum이 허용되는 경우

- **규칙**: [MAY] 숫자 매핑이 필요하거나, 값에 대한 이터레이션이 필요한 경우에 한해 `enum`을 사용할 수 있다.
- **좋은 예시**:
  ```typescript
  // 숫자 매핑이 필요한 경우 — enum 허용
  enum HttpStatus {
    Ok = 200,
    Created = 201,
    BadRequest = 400,
    NotFound = 404,
    InternalServerError = 500,
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 문자열 enum — union type이나 as const로 대체 가능
  enum OrderStatus {
    Pending = 'pending',
    Processing = 'processing',
    Shipped = 'shipped',
  }
  ```

## Import / Export

### Import 정렬 규칙

- **규칙**: [MUST] import 문은 다음 순서로 그룹화하고, 그룹 사이에 빈 줄을 넣는다.
- **이유**: 일관된 import 순서는 코드 탐색을 빠르게 하고, 병합 충돌을 줄인다.

```typescript
// 1. Node.js 내장 모듈
import path from 'node:path';
import fs from 'node:fs';

// 2. 외부 라이브러리
import express from 'express';
import { z } from 'zod';

// 3. 내부 패키지 (@sellernote/*)
import { Button } from '@sellernote/ui';
import { formatDate } from '@sellernote/utils';

// 4. 프로젝트 내부 모듈 (절대 경로)
import { UserService } from '@/services/user-service';
import { validateEmail } from '@/utils/validation';

// 5. 상대 경로 모듈
import { UserCard } from './user-card';
import { styles } from './styles';
```

### Type-Only Import

- **규칙**: [MUST] 타입만 import하는 경우 `import type`을 사용한다.
- **이유**: 빌드 시 불필요한 런타임 코드가 포함되는 것을 방지한다.
- **좋은 예시**:
  ```typescript
  import type { User, CreateUserDto } from '@/types/user';
  import { UserService } from '@/services/user-service';
  ```
- **나쁜 예시**:
  ```typescript
  import { User, CreateUserDto } from '@/types/user'; // 타입인데 일반 import 사용
  ```

### Barrel Export

- **규칙**: [SHOULD] 패키지나 모듈의 공개 API는 `index.ts`를 통해 barrel export한다.
- **규칙**: [MUST NOT] 깊은 경로로 직접 import하지 않는다. barrel export된 경로를 사용한다.
- **이유**: 모듈의 공개 API를 명시적으로 관리하고, 내부 구조 변경 시 외부 영향을 최소화한다.
- **좋은 예시**:
  ```typescript
  // packages/utils/src/index.ts
  export { formatDate, formatCurrency } from './format';
  export { validateEmail, validatePhone } from './validation';

  // 사용처
  import { formatDate, validateEmail } from '@sellernote/utils';
  ```
- **나쁜 예시**:
  ```typescript
  // 내부 경로 직접 참조
  import { formatDate } from '@sellernote/utils/src/format/date';
  ```

### 경로 Alias

- **규칙**: [SHOULD] 프로젝트 내부 import에 경로 alias(`@/`)를 사용한다.
- **이유**: 깊은 상대 경로(`../../../`)를 제거하여 가독성을 높이고, 파일 이동 시 import 수정을 최소화한다.
- **좋은 예시**:
  ```typescript
  import { UserService } from '@/services/user-service';
  ```
- **나쁜 예시**:
  ```typescript
  import { UserService } from '../../../services/user-service';
  ```

## 린터 / 포맷터

### ESLint

- **규칙**: [MUST] ESLint flat config(`eslint.config.mjs`)와 `typescript-eslint`을 사용한다.
- **이유**: flat config는 ESLint의 새로운 표준이며, 기존 `.eslintrc` 형식은 deprecated 예정이다.
- **좋은 예시**:
  ```javascript
  // eslint.config.mjs
  import eslint from '@eslint/js';
  import tseslint from 'typescript-eslint';

  export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
  );
  ```

### ESLint 수행 의무

- **규칙**: [MUST] 모든 코드 변경 시 ESLint 수행을 필수로 한다.
- **이유**: 린트를 선택적으로 수행하면, 검사를 건너뛰는 코드가 쌓여 코드 품질이 점진적으로 저하된다. 모든 변경에 대해 일관되게 린트를 수행해야 규칙 위반이 누적되지 않는다.

- **규칙**: [MUST] CI/CD 파이프라인에서 ESLint 검사를 필수 단계로 포함하고, 에러 발생 시 머지(merge)를 차단한다.
- **이유**: 로컬 환경에서 린트를 수행하지 않는 경우에도 CI에서 최종 방어선 역할을 한다. ESLint 에러가 포함된 코드가 메인 브랜치에 병합되면 전체 코드베이스의 품질이 훼손된다.
- **좋은 예시**:
  ```yaml
  # .github/workflows/ci.yml
  name: CI

  on:
    pull_request:
      branches: [main, develop]

  jobs:
    lint:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
        - run: npm ci
        - run: npm run lint  # ESLint 실패 시 CI 실패 → 머지 차단
  ```
- **나쁜 예시**:
  ```yaml
  # CI에서 lint 단계 누락 — 린트 미수행 코드가 메인에 병합될 수 있음
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: npm ci
        - run: npm run build  # lint 없이 빌드만 수행
  ```

- **규칙**: [SHOULD] ESLint 실행 시 `--max-warnings 0` 옵션을 사용하여 경고(warning)도 허용하지 않는다.
- **이유**: ESLint 경고는 로그에 출력되지만 빌드를 실패시키지 않으므로, 시간이 지나면 개발자들이 경고를 무시하는 '경고 피로(alert fatigue)'가 발생한다. 경고가 수십~수백 개 쌓이면 새로운 경고를 감지하기 어려워지고, 사실상 규칙이 무력화된다. `--max-warnings 0`을 설정하면 모든 위반을 즉시 해결하도록 강제한다.
- **좋은 예시**:
  ```json
  // package.json
  {
    "scripts": {
      "lint": "eslint . --max-warnings 0",
      "lint:fix": "eslint . --max-warnings 0 --fix"
    }
  }
  ```
- **나쁜 예시**:
  ```json
  // package.json
  {
    "scripts": {
      "lint": "eslint ."
    }
  }
  // --max-warnings 미설정 — 경고가 쌓여도 CI 통과
  // 시간이 지나면 200+ 경고가 무시되는 상태가 됨
  ```

### Prettier

- **규칙**: [MUST] Prettier를 코드 포매터로 사용하고, `eslint-config-prettier`로 ESLint와의 충돌을 방지한다.
- **이유**: 포매팅은 Prettier에 위임하고, ESLint는 코드 품질 규칙에 집중하는 것이 역할 분리에 적합하다.

- **규칙**: [SHOULD] 다음 Prettier 설정을 기본으로 사용한다. (팀 합의에 따라 조정 가능)

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "trailingComma": "all",
  "arrowParens": "always"
}
```

### Pre-commit Hook

- **규칙**: [SHOULD] Husky + lint-staged를 사용하여 커밋 전 자동 린팅/포매팅을 실행한다.
- **이유**: 스타일이 맞지 않는 코드가 저장소에 유입되는 것을 사전에 방지한다.

## 안티패턴

### as 캐스팅 남용

- **규칙**: [MUST NOT] 타입 단언(`as`)을 타입 에러 회피 목적으로 사용하지 않는다.
- **이유**: `as`는 컴파일러를 속이는 것이며, 런타임 검사를 수행하지 않아 런타임 에러의 원인이 된다.
- **나쁜 예시**:
  ```typescript
  const user = response.data as User;         // 실제 데이터가 User 형태인지 검증 안 됨
  const count = someValue as unknown as number; // double assertion — 극히 위험
  ```
- **좋은 예시**:
  ```typescript
  // 런타임 검증과 함께 사용
  import { z } from 'zod';

  const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  });

  const user = UserSchema.parse(response.data); // 런타임 검증 수행
  ```

### any 사용

- **규칙**: [MUST NOT] `any`를 사용하지 않는다. `unknown`으로 대체하고, 타입 가드로 좁혀서 사용한다.
- **이유**: `any`는 타입 안전성을 완전히 포기하는 것이며, 버그가 타입 체커를 통과하게 한다.

### Non-null Assertion (!) 남용

- **규칙**: [MUST NOT] non-null assertion(`!`)을 습관적으로 사용하지 않는다.
- **이유**: `!`는 컴파일러에게 "이 값은 null이 아니다"라고 주장하는 것이지만, 런타임에서는 검증하지 않는다.
- **나쁜 예시**:
  ```typescript
  const user = users.find((u) => u.id === id)!;     // null일 수 있음
  const element = document.getElementById('app')!;    // null일 수 있음
  ```
- **좋은 예시**:
  ```typescript
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new Error(`User not found: ${id}`);
  }
  // 이 시점에서 user는 non-null로 타입이 좁혀짐

  const element = document.getElementById('app');
  if (!element) {
    throw new Error('App element not found');
  }
  ```

### @ts-ignore / @ts-expect-error 남용

- **규칙**: [MUST NOT] `@ts-ignore`를 사용하지 않는다.
- **규칙**: [SHOULD] 불가피한 경우 `@ts-expect-error`를 사용하고, 반드시 사유를 주석으로 남긴다.
- **이유**: `@ts-ignore`는 에러가 해결된 후에도 남아있어 잠재적 문제를 숨긴다. `@ts-expect-error`는 에러가 없어지면 컴파일 에러를 발생시켜 불필요한 주석을 감지한다.
- **좋은 예시**:
  ```typescript
  // @ts-expect-error: 라이브러리 타입 정의가 아직 업데이트되지 않음 (이슈: #123)
  someLibraryFunction(arg);
  ```

## 참고 자료

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [TypeScript 공식 핸드북](https://www.typescriptlang.org/docs/handbook/)
- [typescript-eslint](https://typescript-eslint.io/)
- [Prettier 공식 문서](https://prettier.io/docs/)
- [Tidy TypeScript: Prefer union types over enums](https://fettblog.eu/tidy-typescript-avoid-enums/)
- [ESLint CLI --max-warnings 옵션](https://eslint.org/docs/latest/use/command-line-interface)
- [ESLint Warnings Are an Anti-Pattern](https://dev.to/thawkin3/eslint-warnings-are-an-anti-pattern-33np)
