# Prisma 컨벤션

> 이 문서는 Prisma ORM 프로젝트에 적용되는 규칙을 정의합니다.
> 상위 규칙: [백엔드 공통 컨벤션](../BACKEND_CONVENTION.md) | [데이터베이스 공통 컨벤션](../../database/DATABASE_CONVENTION.md)

## 기술 스택

| 항목 | 버전/설정 |
|------|----------|
| Prisma ORM | >= 5.8 (권장. `$extends`, `relationJoins` 지원) |
| @prisma/client | TBD |
| prisma CLI | TBD |
| prisma-case-format | TBD |
| 데이터베이스 | MySQL (기본) |
| TypeScript | TBD |
| NestJS | TBD |

## Schema 정의

### 기본 구조

- **규칙**: [MUST] `schema.prisma` 파일은 `generator`, `datasource`, `enum`, `model` 순서로 블록을 구성한다.
- **이유**: 파일 상단에 프로젝트 설정(generator, datasource)을 배치하고, 하단에 데이터 모델을 배치하면 전체 스키마 구조를 빠르게 파악할 수 있다. Enum을 모델보다 앞에 배치해야 모델에서 참조할 때 선언 순서가 자연스럽다.
- **좋은 예시**:
  ```prisma
  // 1. Generator 설정
  generator client {
    provider = "prisma-client-js"
  }

  // 2. Datasource 설정
  datasource db {
    provider = "mysql"
    url      = env("DATABASE_URL")
  }

  // 3. Enum 정의
  enum OrderStatus {
    pending
    confirmed
    shipped
    delivered
    cancelled
  }

  // 4. Model 정의
  model Order {
    id        String      @id @default(uuid()) @db.Char(36)
    no        BigInt      @unique @default(autoincrement()) @map("_no")
    status    OrderStatus @default(pending)
    createdAt DateTime    @default(now()) @map("created_at") @db.DateTime(0)
    updatedAt DateTime    @updatedAt @map("updated_at") @db.DateTime(0)
    deletedAt DateTime?   @map("deleted_at") @db.DateTime(0)

    @@map("order")
  }
  ```
- **나쁜 예시**:
  ```prisma
  // model과 datasource가 뒤섞여 있음
  model Order {
    id String @id
  }

  datasource db {
    provider = "mysql"
    url      = env("DATABASE_URL")
  }

  generator client {
    provider = "prisma-client-js"
  }

  // Enum이 모델보다 뒤에 위치 — 참조 흐름이 역순
  enum OrderStatus {
    pending
    confirmed
  }
  ```

- **규칙**: [SHOULD] 프로젝트 초기에는 `schema.prisma` 파일을 단일 파일로 관리한다. 모든 모델, Enum, 설정을 하나의 파일에 정의한다.
- **이유**: Prisma는 기본적으로 단일 `schema.prisma` 파일을 사용한다. 단일 파일이 검색과 전체 구조 파악에 유리하다. 모델 수가 매우 많아진 경우(30개 이상) Prisma 5.15+의 `prismaSchemaFolder` 기능으로 파일을 분리할 수 있다.

### Schema 포매팅 자동화

- **규칙**: [SHOULD] `prisma-case-format`을 사용하여 `@map()`/`@@map()` 어노테이션을 자동 생성한다.
- **이유**: 모델/필드마다 수동으로 `@map("snake_case")`를 작성하면 누락 및 오타 위험이 높다. `prisma-case-format`은 Prisma 스키마 파일을 분석하여 PascalCase 모델명에 `@@map("snake_case")`, camelCase 필드명에 `@map("snake_case")`를 자동으로 추가한다.
- **좋은 예시**:
  ```yaml
  # .prisma-case-format
  # 모델명: PascalCase, DB 테이블명: snake_case 단수형
  table: pascal
  mapTable: snake,singular

  # 필드명: camelCase, DB 컬럼명: snake_case
  field: camel
  mapField: snake

  # Enum: PascalCase
  enum: pascal
  mapEnum: snake
  ```
  ```bash
  # 직접 실행
  npx prisma-case-format --file prisma/schema.prisma

  # prisma format과 함께 실행 (권장)
  npx prisma-case-format --file prisma/schema.prisma && npx prisma format

  # package.json 스크립트 등록
  # "prisma:format": "prisma-case-format --file prisma/schema.prisma && prisma format"
  ```
- **나쁜 예시**:
  ```prisma
  // 모든 필드에 수동으로 @map 작성 — 누락/오타 위험
  model OrderItem {
    id          String  @id @default(uuid()) @db.Char(36)
    orderNumber String  @map("order_number") @db.VarChar(100) // 수동 작성
    totalAmount Decimal @map("total_amount") @db.Decimal(15, 2) // 수동 작성
    userId      String  @map("user_id") @db.Char(36) // 수동 작성
    createdAt   DateTime @default(now()) @map("created_at") @db.DateTime(0) // 수동 작성

    @@map("order_item") // 수동 작성
  }
  ```

### 모델 네이밍 규칙

- **규칙**: [MUST] 모델명은 PascalCase 단수형으로 정의하고, `@@map()`으로 snake_case 단수형 테이블명을 명시한다.
- **이유**: Prisma 모델명은 생성되는 Client API의 이름에 직접 반영된다(`prisma.order.findMany()`). PascalCase는 TypeScript 클래스 네이밍 관례와 일치한다. `@@map()`으로 실제 테이블명을 명시하면 모델명 변경이 DB 스키마에 영향을 주지 않으며, 데이터베이스 컨벤션의 네이밍 규칙(snake_case 단수형)을 준수할 수 있다. @map()/@@map() 어노테이션은 prisma-case-format으로 자동 생성할 수 있다.
- **좋은 예시**:
  ```prisma
  model OrderItem {
    id String @id @default(uuid()) @db.Char(36)
    // ...

    @@map("order_item")
  }
  ```
- **나쁜 예시**:
  ```prisma
  // @@map 미사용 — 테이블명이 모델명에 의존
  model OrderItem {
    id String @id @default(uuid()) @db.Char(36)
  }

  // 복수형 사용 — Prisma 관례 위반
  model OrderItems {
    id String @id @default(uuid()) @db.Char(36)
    @@map("order_item")
  }

  // snake_case 모델명 — Prisma Client API가 부자연스러워짐
  // prisma.order_item.findMany() 가 됨
  model order_item {
    id String @id @default(uuid()) @db.Char(36)
  }
  ```

- **규칙**: [MUST] 필드명은 camelCase로 정의하고, DB 컬럼명과 다른 경우 `@map()`으로 snake_case 컬럼명을 명시한다.
- **이유**: camelCase 필드명은 TypeScript 코드에서 자연스럽게 사용되고, `@map()`으로 실제 DB 컬럼명(snake_case)과의 매핑을 분리하면 코드 컨벤션과 DB 컨벤션을 독립적으로 준수할 수 있다. @map() 어노테이션은 prisma-case-format으로 자동 생성할 수 있다.
- **좋은 예시**:
  ```prisma
  model Order {
    id          String   @id @default(uuid()) @db.Char(36)
    no          BigInt   @unique @default(autoincrement()) @map("_no")
    orderNumber String   @map("order_number") @db.VarChar(100)
    totalAmount Decimal  @map("total_amount") @db.Decimal(15, 2)
    userId      String   @map("user_id") @db.Char(36)
    createdAt   DateTime @default(now()) @map("created_at") @db.DateTime(0)

    @@map("order")
  }
  ```
- **나쁜 예시**:
  ```prisma
  model Order {
    id           String   @id @default(uuid()) @db.Char(36)
    order_number String   @db.VarChar(100)  // snake_case 필드명 — TypeScript 코드에서 부자연스러움
    totalAmount  Decimal  @db.Decimal(15, 2) // @map 미사용 — DB 컬럼명이 camelCase로 생성됨

    @@map("order")
  }
  ```

### ID 전략

- **규칙**: [MUST] PK(`id`)는 `@id @default(uuid()) @db.Char(36)`으로 정의하여 UUID를 자동 생성한다.
- **이유**: 데이터베이스 컨벤션의 ID 전략(UUID CHAR(36) PK)과 일치시킨다. UUID는 분산 환경에서 충돌 없이 ID를 생성할 수 있고, 외부 노출 시 보안성이 높다. `@db.Char(36)`을 명시하여 MySQL에서 고정 길이 CHAR(36) 컬럼으로 생성되도록 보장한다.
- **좋은 예시**:
  ```prisma
  model User {
    id String @id @default(uuid()) @db.Char(36)
    // ...

    @@map("user")
  }
  ```
- **나쁜 예시**:
  ```prisma
  model User {
    // Auto Increment PK — UUID 정책 위반
    id Int @id @default(autoincrement())

    @@map("user")
  }
  ```
  ```prisma
  model User {
    // @db.Char(36) 미지정 — MySQL에서 VARCHAR(191)로 생성될 수 있음
    id String @id @default(uuid())

    @@map("user")
  }
  ```

- **규칙**: [MUST] 모든 모델에 `_no` 컬럼(BigInt, UNIQUE, AUTO_INCREMENT)을 포함한다.
- **이유**: 내부 순차 식별자로 정렬, 커서 기반 페이지네이션, InnoDB 클러스터링 인덱스 성능 최적화에 활용한다. UUID PK만으로는 순차 정렬이 불가능하고, InnoDB의 클러스터링 인덱스 특성상 랜덤 UUID 삽입 시 페이지 분할(page split)이 빈번하게 발생할 수 있다.
- **좋은 예시**:
  ```prisma
  model Order {
    id String @id @default(uuid()) @db.Char(36)
    no BigInt  @unique @default(autoincrement()) @map("_no")
    // ...

    @@map("order")
  }
  ```
- **나쁜 예시**:
  ```prisma
  model Order {
    id String @id @default(uuid()) @db.Char(36)
    // _no 컬럼 누락 — 순차 정렬 및 커서 페이지네이션 불가

    @@map("order")
  }
  ```

### 필드 정의 규칙

- **규칙**: [MUST] 모든 필드에 `@db.*` 네이티브 타입 어노테이션을 명시적으로 지정한다. 단, `BigInt`는 MySQL에서 항상 `BIGINT`로 매핑되므로 `@db.*` 생략을 허용한다.
- **이유**: Prisma의 기본 타입 매핑에 의존하면 의도하지 않은 DB 타입이 생성될 수 있다. 예를 들어 `String`은 MySQL에서 기본적으로 `VARCHAR(191)`로 매핑되는데, 이는 대부분의 경우 부적절하다. 명시적 네이티브 타입 지정으로 DB 스키마를 정확히 제어한다. `BigInt`는 MySQL 기본 매핑이 항상 `BIGINT`이므로 예외로 둔다.

  **주요 Prisma 타입과 MySQL 네이티브 타입 매핑:**

  | Prisma 타입 | `@db.*` 어노테이션 | MySQL 타입 | 용도 |
  |------------|-------------------|-----------|------|
  | `String` | `@db.Char(36)` | CHAR(36) | UUID (고정 길이) |
  | `String` | `@db.VarChar(n)` | VARCHAR(n) | 가변 길이 문자열 |
  | `String` | `@db.Text` | TEXT | 긴 텍스트 |
  | `Int` | `@db.Int` | INT | 정수 |
  | `BigInt` | (기본 매핑 BIGINT) | BIGINT | 큰 정수 (_no 등) |
  | `Decimal` | `@db.Decimal(p, s)` | DECIMAL(p, s) | 금액 등 정밀 소수 |
  | `Boolean` | `@db.TinyInt` | TINYINT(1) | 불리언 |
  | `DateTime` | `@db.DateTime(0)` | DATETIME | 날짜/시간 |
  | `Json` | `@db.Json` | JSON | JSON 데이터 |

- **좋은 예시**:
  ```prisma
  model User {
    id        String   @id @default(uuid()) @db.Char(36)
    no        BigInt   @unique @default(autoincrement()) @map("_no")
    email     String   @db.VarChar(255)
    name      String   @db.VarChar(100)
    age       Int      @db.Int
    balance   Decimal  @db.Decimal(15, 2)
    isActive  Boolean  @default(true) @map("is_active") @db.TinyInt
    bio       String?  @db.Text
    metadata  Json?    @db.Json
    createdAt DateTime @default(now()) @map("created_at") @db.DateTime(0)

    @@map("user")
  }
  ```
- **나쁜 예시**:
  ```prisma
  model User {
    id    String  @id @default(uuid())       // @db.Char(36) 미지정
    email String                              // @db.VarChar 미지정 — VARCHAR(191)로 생성
    name  String                              // 길이 제어 불가
    age   Int                                 // @db.Int 미지정
    bio   String?                             // TEXT인지 VARCHAR인지 불분명

    @@map("user")
  }
  ```

- **규칙**: [MUST] nullable 필드는 `?` 접미사를 사용하고, 해당 필드를 사용하는 TypeScript 코드에서도 `| null` 타입을 인지하여 처리한다.
- **이유**: Prisma는 `?` 접미사가 있는 필드를 자동으로 `T | null` 타입으로 생성한다. DB 스키마의 nullable 여부와 TypeScript 타입이 자동으로 일치하므로, `?` 접미사를 정확히 사용해야 한다.
- **좋은 예시**:
  ```prisma
  model User {
    id       String  @id @default(uuid()) @db.Char(36)
    no       BigInt  @unique @default(autoincrement()) @map("_no")
    email    String  @db.VarChar(255)         // NOT NULL (필수)
    nickname String? @db.VarChar(100)         // NULL 허용 (선택)
    bio      String? @db.Text                 // NULL 허용 (선택)

    @@map("user")
  }
  ```
  ```typescript
  // Prisma Client가 생성하는 타입
  const user = await prisma.user.findUnique({ where: { id } });
  // user.email: string       (null 불가)
  // user.nickname: string | null  (null 가능)
  // user.bio: string | null       (null 가능)

  // null 체크 필요
  if (user.nickname !== null) {
    console.log(user.nickname.toUpperCase()); // 안전
  }
  ```
- **나쁜 예시**:
  ```prisma
  model User {
    id       String @id @default(uuid()) @db.Char(36)
    no       BigInt @unique @default(autoincrement()) @map("_no")
    email    String @db.VarChar(255)
    nickname String @db.VarChar(100)  // ? 누락 — NULL이 올 수 있는데 NOT NULL로 생성됨

    @@map("user")
  }
  ```

- **규칙**: [SHOULD] `Decimal` 타입 필드의 반환값이 `Prisma.Decimal` 객체임에 유의한다. 필요한 경우 `Number()`나 `toNumber()`로 변환한다.
- **이유**: TypeORM과 달리 Prisma는 MySQL의 `DECIMAL` 값을 문자열이 아닌 `Prisma.Decimal` 객체로 반환한다. 이 객체는 `number`와 직접 연산이 불가능하므로, 연산이 필요한 경우 명시적으로 변환해야 한다. 정밀도가 중요한 금액 계산에서는 `Prisma.Decimal`의 메서드(`plus`, `minus`, `mul`, `div`)를 활용하는 것이 안전하다.
- **좋은 예시**:
  ```typescript
  import { Prisma } from '@prisma/client';

  const order = await prisma.order.findUnique({ where: { id } });

  // 방법 1: number로 변환 (소수점 이하 정밀도 손실 가능)
  const amount = Number(order.totalAmount);

  // 방법 2: Prisma.Decimal 메서드로 정밀 연산 (금액 계산에 권장)
  const tax = order.totalAmount.mul(new Prisma.Decimal('0.1'));
  const total = order.totalAmount.plus(tax);

  // 방법 3: toNumber()로 변환
  const amountNum = order.totalAmount.toNumber();
  ```
- **나쁜 예시**:
  ```typescript
  const order = await prisma.order.findUnique({ where: { id } });

  // Prisma.Decimal은 number가 아니므로 직접 산술 연산 불가
  const tax = order.totalAmount * 0.1; // 타입 에러 발생!
  const total = order.totalAmount + 1000; // 타입 에러 발생!
  ```

### 공통 필드

- **규칙**: [MUST] 모든 모델에 다음 공통 필드를 포함한다: `id`, `no`(_no), `createdAt`, `updatedAt`, `deletedAt?`.
- **이유**: 데이터베이스 컨벤션의 필수 공통 필드 규칙을 적용한다. Prisma는 TypeORM과 달리 클래스 상속을 지원하지 않으므로, 공통 필드를 각 모델에 직접 반복 정의해야 한다. 이는 Prisma의 schema.prisma 파일이 TypeScript가 아닌 자체 DSL이기 때문이다.
- **좋은 예시**:
  ```prisma
  model Order {
    // --- 공통 필드 (모든 모델에 반복 정의) ---
    id        String    @id @default(uuid()) @db.Char(36)
    no        BigInt    @unique @default(autoincrement()) @map("_no")
    createdAt DateTime  @default(now()) @map("created_at") @db.DateTime(0)
    updatedAt DateTime  @updatedAt @map("updated_at") @db.DateTime(0)
    deletedAt DateTime? @map("deleted_at") @db.DateTime(0)

    // --- 도메인 필드 ---
    orderNumber String      @map("order_number") @db.VarChar(100)
    totalAmount Decimal     @map("total_amount") @db.Decimal(15, 2)
    status      OrderStatus @default(pending)

    @@map("order")
  }

  model User {
    // --- 공통 필드 (모든 모델에 반복 정의) ---
    id        String    @id @default(uuid()) @db.Char(36)
    no        BigInt    @unique @default(autoincrement()) @map("_no")
    createdAt DateTime  @default(now()) @map("created_at") @db.DateTime(0)
    updatedAt DateTime  @updatedAt @map("updated_at") @db.DateTime(0)
    deletedAt DateTime? @map("deleted_at") @db.DateTime(0)

    // --- 도메인 필드 ---
    email String @db.VarChar(255)
    name  String @db.VarChar(100)

    @@map("user")
  }
  ```
- **나쁜 예시**:
  ```prisma
  model Order {
    id          String  @id @default(uuid()) @db.Char(36)
    orderNumber String  @map("order_number") @db.VarChar(100)
    // _no 누락 — 순차 식별자 없음
    // createdAt, updatedAt 누락 — 생성/수정 시각 추적 불가
    // deletedAt 누락 — Soft Delete 지원 불가

    @@map("order")
  }
  ```

- **규칙**: [MUST] 공통 필드는 모델 상단에, 도메인 필드는 공통 필드 아래에 배치한다. 주석으로 영역을 구분한다.
- **이유**: 모든 모델에서 동일한 위치에 공통 필드가 있으면 스키마 파일에서 도메인 필드를 빠르게 식별할 수 있다.

- **규칙**: [SHOULD] 공통 필드의 반복 정의 부담을 줄이기 위해 코드 생성 도구나 스니펫을 활용한다.
- **이유**: Prisma는 모델 상속을 지원하지 않으므로, 공통 필드를 수동으로 반복 작성해야 한다. IDE 스니펫(예: VS Code User Snippet)이나 코드 생성 스크립트를 활용하면 실수를 줄이고 효율성을 높일 수 있다.
- **좋은 예시**:
  ```json
  // VS Code User Snippet (prisma.json)
  {
    "Prisma Common Fields": {
      "prefix": "pcommon",
      "body": [
        "// --- 공통 필드 ---",
        "id        String    @id @default(uuid()) @db.Char(36)",
        "no        BigInt    @unique @default(autoincrement()) @map(\"_no\")",
        "createdAt DateTime  @default(now()) @map(\"created_at\") @db.DateTime(0)",
        "updatedAt DateTime  @updatedAt @map(\"updated_at\") @db.DateTime(0)",
        "deletedAt DateTime? @map(\"deleted_at\") @db.DateTime(0)",
        "",
        "// --- 도메인 필드 ---"
      ],
      "description": "Prisma 공통 필드 (id, _no, createdAt, updatedAt, deletedAt)"
    }
  }
  ```

### 관계 정의

#### 1:1 관계 (One-to-One)

- **규칙**: [MUST] 1:1 관계에서 FK를 보유하는 쪽에 `@relation(fields: [...], references: [...])`과 `@unique`를 지정한다.
- **이유**: 1:1 관계는 FK에 UNIQUE 제약조건이 필요하다. Prisma는 `@unique`가 없는 FK를 1:N으로 해석한다.
- **좋은 예시**:
  ```prisma
  model User {
    id      String   @id @default(uuid()) @db.Char(36)
    no      BigInt   @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    profile UserProfile?

    @@map("user")
  }

  model UserProfile {
    id     String @id @default(uuid()) @db.Char(36)
    no     BigInt @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    bio    String? @db.Text
    userId String  @unique @map("user_id") @db.Char(36)
    user   User    @relation(fields: [userId], references: [id])

    @@map("user_profile")
  }
  ```
- **나쁜 예시**:
  ```prisma
  model UserProfile {
    id     String @id @default(uuid()) @db.Char(36)
    no     BigInt @unique @default(autoincrement()) @map("_no")

    bio    String? @db.Text
    userId String  @map("user_id") @db.Char(36) // @unique 누락 — 1:N으로 해석됨
    user   User    @relation(fields: [userId], references: [id])

    @@map("user_profile")
  }
  ```

#### 1:N 관계 (One-to-Many)

- **규칙**: [MUST] 1:N 관계에서 FK 필드를 N 쪽 모델에 명시적으로 정의하고, `@relation(fields: [...], references: [...])`을 지정한다.
- **이유**: FK 필드를 명시하면 relation을 로드하지 않고도 FK 값에 직접 접근할 수 있어 불필요한 JOIN을 방지한다.
- **좋은 예시**:
  ```prisma
  model User {
    id     String  @id @default(uuid()) @db.Char(36)
    no     BigInt  @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    orders Order[]

    @@map("user")
  }

  model Order {
    id     String @id @default(uuid()) @db.Char(36)
    no     BigInt @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    userId String @map("user_id") @db.Char(36)
    user   User   @relation(fields: [userId], references: [id])

    @@index([userId])
    @@map("order")
  }
  ```

#### M:N 관계 (Many-to-Many)

- **규칙**: [MUST NOT] Prisma의 암묵적(implicit) 다대다 관계를 사용하지 않는다. 반드시 명시적(explicit) 조인 모델을 정의한다.
- **이유**: 암묵적 다대다 관계는 Prisma가 자동으로 `_PostToTag`와 같은 중간 테이블을 생성하는데, 테이블명과 컬럼명을 제어할 수 없고, 중간 테이블에 추가 필드(생성 시각, 정렬 순서 등)를 추가할 수 없다. 또한 마이그레이션 관리 시 Prisma에 대한 종속성이 높아진다.
- **좋은 예시**:
  ```prisma
  model Post {
    id       String    @id @default(uuid()) @db.Char(36)
    no       BigInt    @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    title    String    @db.VarChar(200)
    postTags PostTag[]

    @@map("post")
  }

  model Tag {
    id       String    @id @default(uuid()) @db.Char(36)
    no       BigInt    @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    name     String    @db.VarChar(50)
    postTags PostTag[]

    @@map("tag")
  }

  // 명시적 조인 모델
  model PostTag {
    id        String   @id @default(uuid()) @db.Char(36)
    no        BigInt   @unique @default(autoincrement()) @map("_no")
    createdAt DateTime @default(now()) @map("created_at") @db.DateTime(0)

    postId String @map("post_id") @db.Char(36)
    post   Post   @relation(fields: [postId], references: [id])

    tagId String @map("tag_id") @db.Char(36)
    tag   Tag    @relation(fields: [tagId], references: [id])

    @@unique([postId, tagId])
    @@index([postId])
    @@index([tagId])
    @@map("post_tag")
  }
  ```
- **나쁜 예시**:
  ```prisma
  // 암묵적 다대다 — Prisma가 _PostToTag 중간 테이블을 자동 생성
  model Post {
    id   String @id @default(uuid()) @db.Char(36)
    no   BigInt @unique @default(autoincrement()) @map("_no")

    tags Tag[]

    @@map("post")
  }

  model Tag {
    id    String @id @default(uuid()) @db.Char(36)
    no    BigInt @unique @default(autoincrement()) @map("_no")

    posts Post[]

    @@map("tag")
  }
  // 결과: _PostToTag 테이블이 자동 생성됨
  // — 테이블명/컬럼명 제어 불가
  // — 추가 필드(createdAt 등) 추가 불가
  ```

#### FK 네이밍

- **규칙**: [MUST] FK 필드명은 `{관계모델명}Id` (camelCase)로 정의하고, `@map()`으로 snake_case 컬럼명을 명시한다.
- **이유**: 코드에서는 `order.userId`로 자연스럽게 접근하고, DB에서는 `user_id`로 저장되어 양쪽 컨벤션을 모두 준수한다.
- **좋은 예시**:
  ```prisma
  model Order {
    id     String @id @default(uuid()) @db.Char(36)
    no     BigInt @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    userId String @map("user_id") @db.Char(36)
    user   User   @relation(fields: [userId], references: [id])

    @@index([userId])
    @@map("order")
  }
  ```
- **나쁜 예시**:
  ```prisma
  model Order {
    id      String @id @default(uuid()) @db.Char(36)
    no      BigInt @unique @default(autoincrement()) @map("_no")

    user_id String @db.Char(36) // snake_case 필드명 — TypeScript 코드에서 부자연스러움
    user    User   @relation(fields: [user_id], references: [id])

    @@map("order")
  }
  ```

#### FK 인덱스

- **규칙**: [MUST] FK 컬럼에 `@@index()`를 정의한다.
- **이유**: MySQL InnoDB는 FK에 자동으로 인덱스를 생성하지만, Prisma 마이그레이션에서는 명시적으로 인덱스를 정의해야 한다. FK 인덱스가 없으면 JOIN 및 참조 무결성 검사 시 풀 테이블 스캔이 발생할 수 있다.
- **좋은 예시**:
  ```prisma
  model Order {
    id     String @id @default(uuid()) @db.Char(36)
    no     BigInt @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    userId String @map("user_id") @db.Char(36)
    user   User   @relation(fields: [userId], references: [id])

    @@index([userId])  // FK 인덱스 명시
    @@map("order")
  }
  ```
- **나쁜 예시**:
  ```prisma
  model Order {
    id     String @id @default(uuid()) @db.Char(36)
    no     BigInt @unique @default(autoincrement()) @map("_no")

    userId String @map("user_id") @db.Char(36)
    user   User   @relation(fields: [userId], references: [id])

    // @@index([userId]) 누락 — FK 인덱스 없음
    @@map("order")
  }
  ```

#### 동일 모델 간 다중 관계

- **규칙**: [SHOULD] 동일한 두 모델 사이에 여러 관계가 있는 경우, `@relation()` 에 명시적으로 이름을 지정한다.
- **이유**: Prisma는 두 모델 간 관계가 하나일 때는 이름 없이 자동 매칭하지만, 여러 관계가 있으면 어떤 필드가 어떤 관계에 속하는지 구분할 수 없다. 관계 이름을 지정하면 Prisma가 정확히 매칭하고, 코드에서도 관계의 의미를 명확히 파악할 수 있다.
- **좋은 예시**:
  ```prisma
  model User {
    id             String @id @default(uuid()) @db.Char(36)
    no             BigInt @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    writtenPosts   Post[] @relation("WrittenPosts")
    favoritedPosts Post[] @relation("FavoritedPosts")

    @@map("user")
  }

  model Post {
    id          String @id @default(uuid()) @db.Char(36)
    no          BigInt @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    authorId    String @map("author_id") @db.Char(36)
    author      User   @relation("WrittenPosts", fields: [authorId], references: [id])

    favoritedById String @map("favorited_by_id") @db.Char(36)
    favoritedBy   User   @relation("FavoritedPosts", fields: [favoritedById], references: [id])

    @@index([authorId])
    @@index([favoritedById])
    @@map("post")
  }
  ```
- **나쁜 예시**:
  ```prisma
  model Post {
    id          String @id @default(uuid()) @db.Char(36)
    no          BigInt @unique @default(autoincrement()) @map("_no")

    // 관계 이름 미지정 — Prisma가 어떤 User 필드와 매칭해야 하는지 알 수 없음
    authorId    String @map("author_id") @db.Char(36)
    author      User   @relation(fields: [authorId], references: [id])

    favoritedById String @map("favorited_by_id") @db.Char(36)
    favoritedBy   User   @relation(fields: [favoritedById], references: [id])
    // Prisma 에러: Ambiguous relation detected

    @@map("post")
  }
  ```

#### Self Relation (자기 참조 관계)

- **규칙**: [SHOULD] 자기 참조 관계는 `@relation()`에 명시적으로 이름을 지정하고, 관계의 의미를 명확히 표현한다.
- **이유**: 동일 모델 내에서 두 필드가 같은 모델을 참조하므로, 관계 이름 없이는 Prisma가 관계를 구분할 수 없다. 의미 있는 이름을 지정하면 스키마의 가독성이 높아진다.
- **좋은 예시**:
  ```prisma
  // 1:N 자기 참조 — 카테고리 계층 구조
  model Category {
    id       String @id @default(uuid()) @db.Char(36)
    no       BigInt @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    name     String @db.VarChar(100)

    parentId String?    @map("parent_id") @db.Char(36)
    parent   Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
    children Category[] @relation("CategoryHierarchy")

    @@index([parentId])
    @@map("category")
  }
  ```
  ```prisma
  // 1:1 자기 참조 — 연속된 담당자 체인
  model Employee {
    id            String    @id @default(uuid()) @db.Char(36)
    no            BigInt    @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    name          String    @db.VarChar(100)

    successorId   String?   @unique @map("successor_id") @db.Char(36)
    successor     Employee? @relation("EmployeeSuccession", fields: [successorId], references: [id])
    predecessor   Employee? @relation("EmployeeSuccession")

    @@map("employee")
  }
  ```

### Enum 정의

- **규칙**: [MUST] Prisma `enum`을 사용하여 열거형 값을 정의한다.
- **이유**: TypeORM 프로젝트에서는 MySQL `ENUM` 타입의 ALTER TABLE 제약 때문에 TypeScript Enum + VARCHAR 조합을 사용하지만, Prisma의 `enum`은 MySQL에서 `VARCHAR`가 아닌 별도의 방식으로 동작한다. Prisma는 마이그레이션을 통해 스키마를 관리하므로 Enum 값 변경 시에도 마이그레이션 SQL을 직접 제어할 수 있다. 또한 Prisma `enum`을 사용하면 스키마 레벨에서 허용 가능한 값을 제한하고, 생성되는 TypeScript 타입에도 자동 반영된다.
- **좋은 예시**:
  ```prisma
  enum OrderStatus {
    pending
    confirmed
    shipped
    delivered
    cancelled
  }

  model Order {
    id     String      @id @default(uuid()) @db.Char(36)
    no     BigInt      @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    status OrderStatus @default(pending)

    @@map("order")
  }
  ```
  ```typescript
  import { OrderStatus } from '@prisma/client';

  // Prisma가 생성한 TypeScript enum을 직접 사용
  const order = await prisma.order.create({
    data: {
      status: OrderStatus.confirmed,
      // ...
    },
  });

  // 타입 안전한 비교
  if (order.status === OrderStatus.shipped) {
    // ...
  }
  ```
- **나쁜 예시**:
  ```prisma
  // Prisma enum 미사용 — 타입 안전성 부족
  model Order {
    id     String @id @default(uuid()) @db.Char(36)
    no     BigInt @unique @default(autoincrement()) @map("_no")

    status String @db.VarChar(20) // 아무 문자열이나 저장 가능

    @@map("order")
  }
  ```
  ```typescript
  // 문자열 직접 사용 — 오타 감지 불가
  const order = await prisma.order.create({
    data: {
      status: 'confiremd', // 오타! 런타임에서만 발견 가능
    },
  });
  ```

- **규칙**: [MUST] Enum 값은 소문자 snake_case로 정의한다.
- **이유**: Prisma가 생성하는 TypeScript enum은 key와 value가 동일하므로, 소문자 snake_case를 사용하면 DB 저장값과 API 응답값이 일관된 형식을 유지한다. TypeScript 코드에서 직접 정의하는 enum의 value 컨벤션(소문자 snake_case)과 통일된다.
- **좋은 예시**:
  ```prisma
  enum PaymentMethod {
    credit_card
    bank_transfer
    virtual_account
    mobile_payment
  }
  ```
- **나쁜 예시**:
  ```prisma
  // UPPER_SNAKE_CASE — 소문자 snake_case를 사용해야 함
  enum PaymentMethod {
    CREDIT_CARD
    BANK_TRANSFER
  }

  // PascalCase — 타입/클래스와 혼동
  enum PaymentMethod {
    CreditCard
    BankTransfer
  }

  // camelCase — snake_case를 사용해야 함
  enum PaymentMethod {
    creditCard
    bankTransfer
  }
  ```

- **규칙**: [MUST] Enum은 `schema.prisma` 파일에서 모델 정의보다 앞에 배치한다. (기본 구조 섹션의 블록 순서 규칙에 따름)
- **이유**: Enum이 모델보다 앞에 있으면 파일을 위에서 아래로 읽을 때 참조되는 타입을 먼저 파악할 수 있어 가독성이 높아진다.

### 인덱스 전략

- **규칙**: [MUST] FK 컬럼에 `@@index()`를 정의한다.
- **이유**: FK 컬럼은 JOIN과 WHERE 조건에 빈번하게 사용되므로 인덱스가 필수적이다. Prisma는 FK에 자동으로 인덱스를 생성하지 않으므로 명시적으로 정의해야 한다.
- **좋은 예시**:
  ```prisma
  model OrderItem {
    id      String @id @default(uuid()) @db.Char(36)
    no      BigInt @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    orderId String @map("order_id") @db.Char(36)
    order   Order  @relation(fields: [orderId], references: [id])

    productId String @map("product_id") @db.Char(36)
    product   Product @relation(fields: [productId], references: [id])

    @@index([orderId])    // FK 인덱스
    @@index([productId])  // FK 인덱스
    @@map("order_item")
  }
  ```

- **규칙**: [SHOULD] 자주 함께 조회되는 컬럼 조합에 복합 인덱스(composite index)를 정의한다.
- **이유**: 단일 컬럼 인덱스 여러 개보다 복합 인덱스 하나가 해당 쿼리 패턴에서 더 효율적이다. MySQL의 인덱스 좌측 접두사 규칙(leftmost prefix rule)에 따라 복합 인덱스의 앞쪽 컬럼만으로도 인덱스를 활용할 수 있다.
- **좋은 예시**:
  ```prisma
  model Order {
    id        String      @id @default(uuid()) @db.Char(36)
    no        BigInt      @unique @default(autoincrement()) @map("_no")
    createdAt DateTime    @default(now()) @map("created_at") @db.DateTime(0)
    updatedAt DateTime    @updatedAt @map("updated_at") @db.DateTime(0)
    deletedAt DateTime?   @map("deleted_at") @db.DateTime(0)

    userId    String      @map("user_id") @db.Char(36)
    status    OrderStatus @default(pending)
    user      User        @relation(fields: [userId], references: [id])

    // 단일 FK 인덱스
    @@index([userId])

    // 복합 인덱스 — "특정 사용자의 특정 상태 주문 조회" 쿼리 최적화
    @@index([userId, status])

    // 복합 인덱스 — "날짜 범위 + 상태 필터" 쿼리 최적화
    @@index([createdAt, status])

    @@map("order")
  }
  ```
- **나쁜 예시**:
  ```prisma
  model Order {
    id        String      @id @default(uuid()) @db.Char(36)
    no        BigInt      @unique @default(autoincrement()) @map("_no")
    createdAt DateTime    @default(now()) @map("created_at") @db.DateTime(0)
    updatedAt DateTime    @updatedAt @map("updated_at") @db.DateTime(0)
    deletedAt DateTime?   @map("deleted_at") @db.DateTime(0)

    userId    String      @map("user_id") @db.Char(36)
    status    OrderStatus @default(pending)
    user      User        @relation(fields: [userId], references: [id])

    // 인덱스 없음 — FK 및 자주 조회되는 컬럼에 인덱스 부재
    @@map("order")
  }
  ```

- **규칙**: [SHOULD] 복합 유니크 제약조건은 `@@unique()`를 사용한다.
- **이유**: 비즈니스 규칙에 의해 특정 컬럼 조합이 유일해야 하는 경우, `@@unique()`로 DB 레벨에서 보장한다. Prisma Client에서도 `findUnique()`에 복합 유니크 키를 조건으로 사용할 수 있다.
- **좋은 예시**:
  ```prisma
  model PostTag {
    id     String @id @default(uuid()) @db.Char(36)
    no     BigInt @unique @default(autoincrement()) @map("_no")
    // ... 공통 필드 생략

    postId String @map("post_id") @db.Char(36)
    post   Post   @relation(fields: [postId], references: [id])

    tagId  String @map("tag_id") @db.Char(36)
    tag    Tag    @relation(fields: [tagId], references: [id])

    // 같은 게시글에 같은 태그를 중복 연결 방지
    @@unique([postId, tagId])
    @@index([postId])
    @@index([tagId])
    @@map("post_tag")
  }
  ```
  ```typescript
  // @@unique로 정의된 복합 키로 findUnique 사용 가능
  const postTag = await prisma.postTag.findUnique({
    where: {
      postId_tagId: {
        postId: 'post-uuid',
        tagId: 'tag-uuid',
      },
    },
  });
  ```

## Prisma Client 사용 패턴

### CRUD 패턴

#### findUnique vs findFirst

- **규칙**: [MUST] `@id` 또는 `@unique` 필드로 단건 조회할 때는 `findUnique`를 사용하고, 유니크하지 않은 조건으로 단건 조회할 때만 `findFirst`를 사용한다.
- **이유**: `findUnique`는 유니크 필드 조건을 강제하므로 타입 레벨에서 잘못된 조건 사용을 방지한다. 또한 Prisma 내부적으로 `findUnique`에 대해 DataLoader를 통한 요청 배칭(batching)을 수행하므로, 동일 요청 내 여러 `findUnique` 호출이 하나의 쿼리로 병합될 수 있어 성능상 유리하다. `findFirst`는 유니크 제약이 없는 필드에서만 사용해야 한다.
- **좋은 예시**:
  ```typescript
  // id(PK)로 조회 — findUnique 사용
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // email(@unique)로 조회 — findUnique 사용
  const user = await prisma.user.findUnique({
    where: { email: 'user@example.com' },
  });

  // 복합 유니크 키로 조회 — findUnique 사용
  const postTag = await prisma.postTag.findUnique({
    where: {
      postId_tagId: {
        postId: 'post-uuid',
        tagId: 'tag-uuid',
      },
    },
  });

  // 유니크하지 않은 조건으로 첫 번째 레코드 조회 — findFirst 사용
  const latestOrder = await prisma.order.findFirst({
    where: { userId: userId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });
  ```
- **나쁜 예시**:
  ```typescript
  // id(PK)로 조회하는데 findFirst 사용 — 불필요한 성능 저하
  const user = await prisma.user.findFirst({
    where: { id: userId },
  });

  // findUnique에 유니크하지 않은 필드 사용 — 타입 에러 발생
  const order = await prisma.order.findUnique({
    where: { userId: userId }, // userId는 @unique가 아님 — 컴파일 에러
  });
  ```

#### findUniqueOrThrow

- **규칙**: [SHOULD] 레코드가 반드시 존재해야 하는 경우 `findUniqueOrThrow`를 사용하되, NestJS에서는 `findUnique` + null 체크 + 도메인 에러를 권장한다.
- **이유**: `findUniqueOrThrow`는 레코드가 없으면 `PrismaClientKnownRequestError`(P2025)를 던진다. 내부 로직에서 "없으면 버그"인 상황에는 간결하게 사용할 수 있지만, API 응답으로 404를 반환해야 하는 경우에는 `findUnique` + null 체크가 비즈니스 맥락에 맞는 에러 메시지를 제공할 수 있어 더 적합하다.
- **좋은 예시**:
  ```typescript
  // 방법 1: findUnique + null 체크 (API 응답에 권장)
  async findOrder(id: string): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`주문 ID ${id}을(를) 찾을 수 없습니다.`);
    }

    return order;
  }

  // 방법 2: findUniqueOrThrow (내부 로직에서 존재가 보장되어야 할 때)
  async processPayment(orderId: string): Promise<void> {
    // 결제 처리 시점에 주문이 없으면 시스템 오류
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });

    await processPaymentGateway(order);
  }
  ```
- **나쁜 예시**:
  ```typescript
  // API 엔드포인트에서 findUniqueOrThrow 사용 — Prisma 에러가 그대로 노출됨
  async findOrder(id: string): Promise<Order> {
    // PrismaClientKnownRequestError가 발생하면 클라이언트에 500 에러가 반환됨
    return prisma.order.findUniqueOrThrow({
      where: { id },
    });
  }
  ```

#### Nested Write

- **규칙**: [SHOULD] 관련 레코드를 함께 생성하거나 연결할 때 Nested Write를 사용한다.
- **이유**: Nested Write는 단일 Prisma Client 호출로 부모와 자식 레코드를 원자적으로 생성한다. Prisma가 암묵적 트랜잭션을 생성하므로, 중간에 실패하면 전체가 롤백된다. 별도의 `$transaction` 없이도 데이터 일관성을 보장할 수 있다.
- **좋은 예시**:
  ```typescript
  // 주문과 주문 항목을 한 번에 생성 (암묵적 트랜잭션)
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2024-001',
      totalAmount: new Prisma.Decimal('35000'),
      status: OrderStatus.pending,
      user: {
        connect: { id: userId }, // 기존 사용자와 연결
      },
      items: {
        create: [
          {
            productId: 'product-uuid-1',
            quantity: 2,
            unitPrice: new Prisma.Decimal('10000'),
          },
          {
            productId: 'product-uuid-2',
            quantity: 1,
            unitPrice: new Prisma.Decimal('15000'),
          },
        ],
      },
    },
    include: {
      items: true,
      user: true,
    },
  });
  ```
- **나쁜 예시**:
  ```typescript
  // 별도 호출로 분리 — 중간 실패 시 데이터 불일치 발생
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2024-001',
      totalAmount: new Prisma.Decimal('35000'),
      status: OrderStatus.pending,
      userId: userId,
    },
  });

  // 이 시점에서 실패하면 주문은 있지만 항목은 없는 상태가 됨
  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: 'product-uuid-1',
      quantity: 2,
      unitPrice: new Prisma.Decimal('10000'),
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: 'product-uuid-2',
      quantity: 1,
      unitPrice: new Prisma.Decimal('15000'),
    },
  });
  ```

#### createMany

- **규칙**: [SHOULD] 대량 레코드 삽입 시 `createMany`를 사용하고, 중복 가능성이 있는 경우 `skipDuplicates` 옵션을 활용한다.
- **이유**: `createMany`는 하나의 `INSERT INTO ... VALUES` 쿼리로 다수의 레코드를 삽입하므로, 개별 `create`를 반복하는 것보다 훨씬 효율적이다. `skipDuplicates: true` 옵션은 MySQL의 `INSERT IGNORE`와 유사하게 유니크 제약 위반 레코드를 건너뛰어, 멱등성 있는 배치 작업에 유용하다. 단, `createMany`는 Nested Write를 지원하지 않으므로 관계 레코드를 함께 생성해야 하는 경우에는 사용할 수 없다.
- **좋은 예시**:
  ```typescript
  // 대량 태그 생성 — 중복 태그는 건너뜀
  const result = await prisma.tag.createMany({
    data: [
      { name: 'TypeScript' },
      { name: 'Prisma' },
      { name: 'NestJS' },
      { name: 'TypeScript' }, // name이 @unique인 경우 건너뜀
    ],
    skipDuplicates: true,
  });

  console.log(`${result.count}개 태그 생성됨`);
  ```
- **나쁜 예시**:
  ```typescript
  // 개별 create 반복 — 레코드 수만큼 INSERT 쿼리 발생
  const tags = ['TypeScript', 'Prisma', 'NestJS'];

  for (const name of tags) {
    await prisma.tag.create({
      data: { name },
    });
  }
  ```

#### update vs upsert

- **규칙**: [MUST] 레코드가 반드시 존재하는 경우 `update`를 사용하고, 존재 여부가 불확실한 경우 `upsert`를 사용한다.
- **이유**: `update`는 대상 레코드가 없으면 `PrismaClientKnownRequestError`(P2025)를 발생시킨다. 반면 `upsert`는 있으면 업데이트, 없으면 생성하므로 "있으면 갱신, 없으면 생성" 패턴에 적합하다. `upsert`의 `where` 조건은 `@id` 또는 `@unique` 필드만 사용할 수 있다.
- **좋은 예시**:
  ```typescript
  // 주문 상태 변경 — 주문이 반드시 존재해야 함
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.confirmed },
  });

  // 사용자 프로필 — 있으면 업데이트, 없으면 생성
  const profile = await prisma.userProfile.upsert({
    where: { userId: userId },
    update: {
      bio: newBio,
      avatarUrl: newAvatarUrl,
    },
    create: {
      userId: userId,
      bio: newBio,
      avatarUrl: newAvatarUrl,
    },
  });
  ```
- **나쁜 예시**:
  ```typescript
  // 존재 확인 후 분기 — 불필요한 쿼리 1회 추가 + 레이스 컨디션 위험
  const existing = await prisma.userProfile.findUnique({
    where: { userId: userId },
  });

  if (existing) {
    await prisma.userProfile.update({
      where: { userId: userId },
      data: { bio: newBio },
    });
  } else {
    await prisma.userProfile.create({
      data: { userId: userId, bio: newBio },
    });
  }
  ```

### 필터링/정렬

#### AND/OR/NOT 조합

- **규칙**: [SHOULD] 복합 필터 조건은 `AND`, `OR`, `NOT`을 명시적으로 사용하여 구성한다.
- **이유**: Prisma의 `where` 절에서 같은 레벨에 나열된 조건들은 암묵적으로 AND로 결합된다. 그러나 OR이나 NOT 조건이 필요하거나, 같은 필드에 여러 조건을 적용해야 할 때는 명시적 연산자를 사용해야 정확한 쿼리를 구성할 수 있다.
- **좋은 예시**:
  ```typescript
  // 암묵적 AND — 같은 레벨 조건은 자동 AND
  const orders = await prisma.order.findMany({
    where: {
      userId: userId,
      status: OrderStatus.pending,
      deletedAt: null,
    },
  });

  // 명시적 OR — 여러 조건 중 하나라도 만족하는 레코드
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { status: OrderStatus.pending },
        { status: OrderStatus.confirmed },
      ],
      deletedAt: null,
    },
  });

  // AND + OR 조합 — 복잡한 비즈니스 로직
  const orders = await prisma.order.findMany({
    where: {
      AND: [
        { userId: userId },
        {
          OR: [
            { status: OrderStatus.shipped },
            {
              AND: [
                { status: OrderStatus.confirmed },
                { totalAmount: { gte: new Prisma.Decimal('50000') } },
              ],
            },
          ],
        },
      ],
      deletedAt: null,
    },
  });

  // NOT — 특정 조건 제외
  const activeUsers = await prisma.user.findMany({
    where: {
      NOT: {
        status: 'INACTIVE',
      },
      deletedAt: null,
    },
  });
  ```
- **나쁜 예시**:
  ```typescript
  // 같은 필드에 대한 OR 조건을 별도 조건으로 나열 — 마지막 값만 적용됨
  const orders = await prisma.order.findMany({
    where: {
      status: OrderStatus.pending,
      status: OrderStatus.confirmed, // 위의 pending 조건을 덮어씀
    },
  });
  ```

#### 관계 필터링 (some/every/none)

- **규칙**: [SHOULD] 관련 레코드 조건으로 필터링할 때 `some`, `every`, `none` 관계 필터를 사용한다.
- **이유**: 관계 필터를 사용하면 JOIN 없이도 관련 테이블의 조건을 기반으로 부모 레코드를 필터링할 수 있다. `some`은 "하나라도 만족하는 관계가 있는", `every`는 "모든 관계가 조건을 만족하는", `none`은 "조건을 만족하는 관계가 하나도 없는" 레코드를 반환한다.
- **좋은 예시**:
  ```typescript
  // some — 10,000원 이상 주문 항목이 하나라도 있는 주문
  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          unitPrice: { gte: new Prisma.Decimal('10000') },
        },
      },
      deletedAt: null,
    },
  });

  // every — 모든 주문 항목이 배송 완료된 주문
  const fullyShippedOrders = await prisma.order.findMany({
    where: {
      items: {
        every: {
          shippedAt: { not: null },
        },
      },
      deletedAt: null,
    },
  });

  // none — 취소된 주문 항목이 하나도 없는 주문
  const ordersWithoutCancellation = await prisma.order.findMany({
    where: {
      items: {
        none: {
          status: 'cancelled',
        },
      },
      deletedAt: null,
    },
  });
  ```

#### 문자열 필터

- **규칙**: [SHOULD] 문자열 검색 시 `contains`, `startsWith`, `endsWith` 필터를 활용하고, MySQL의 대소문자 구분 특성을 인지한다.
- **이유**: Prisma는 다양한 문자열 필터 연산자를 제공한다. MySQL의 기본 collation(`utf8mb4_general_ci` 등)에서는 `contains` 검색이 대소문자를 구분하지 않지만, 이는 DB 설정에 의존하는 동작이므로 인지하고 있어야 한다.
- **좋은 예시**:
  ```typescript
  // 이메일 도메인으로 사용자 검색
  const users = await prisma.user.findMany({
    where: {
      email: { endsWith: '@example.com' },
      deletedAt: null,
    },
  });

  // 이름에 특정 문자열 포함
  const users = await prisma.user.findMany({
    where: {
      name: { contains: '홍' },
      deletedAt: null,
    },
  });

  // 주문 번호 접두사로 검색
  const orders = await prisma.order.findMany({
    where: {
      orderNumber: { startsWith: 'ORD-2024' },
      deletedAt: null,
    },
  });
  ```

#### 정렬 (orderBy)

- **규칙**: [SHOULD] 정렬은 `orderBy`를 사용하며, 다중 정렬 시 배열로 우선순위를 명시한다.
- **이유**: `orderBy`에 객체를 전달하면 단일 필드 정렬, 배열을 전달하면 다중 필드 정렬이 적용된다. 배열의 순서가 정렬 우선순위를 결정한다. 관계 필드의 값을 기준으로 정렬하거나, 관계 레코드 수(count)를 기준으로 정렬할 수도 있다.
- **좋은 예시**:
  ```typescript
  // 단일 정렬
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  // 다중 정렬 — 상태별 그룹 내에서 최신 순
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // 관계 기반 정렬 — 주문 항목 수가 많은 순
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    orderBy: {
      items: { _count: 'desc' },
    },
  });
  ```
- **나쁜 예시**:
  ```typescript
  // 정렬 없이 조회 — 결과 순서가 보장되지 않음
  const orders = await prisma.order.findMany({
    where: { userId: userId },
  });
  ```

### 페이지네이션

#### Offset 기반 페이지네이션

- **규칙**: [MAY] 어드민 패널, 소규모 데이터셋 등에서 Offset 기반 페이지네이션(`skip`/`take`)을 사용할 수 있다. 총 레코드 수 조회와 데이터 조회를 `$transaction`으로 묶어 일관성을 보장한다.
- **이유**: Offset 기반은 구현이 간단하고 "N 페이지로 이동" 같은 랜덤 액세스가 가능하다. 그러나 `skip` 값이 클수록 DB가 건너뛸 레코드를 모두 스캔해야 하므로 대규모 데이터에서는 성능이 저하된다. `$transaction`으로 count와 findMany를 묶으면 동일 시점의 일관된 결과를 얻을 수 있다.
- **좋은 예시**:
  ```typescript
  async findOrdersPaginated(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: Order[]; total: number; totalPages: number }> {
    const skip = (page - 1) * pageSize;

    const [data, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.order.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return {
      data,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  ```
- **나쁜 예시**:
  ```typescript
  // count와 findMany를 별도 호출 — 데이터 변경 시 불일치 가능
  async findOrdersPaginated(userId: string, page: number, pageSize: number) {
    const total = await prisma.order.count({
      where: { userId, deletedAt: null },
    });

    // 이 사이에 새 레코드가 삽입되면 total과 data가 불일치
    const data = await prisma.order.findMany({
      where: { userId, deletedAt: null },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { data, total };
  }
  ```

#### Cursor 기반 페이지네이션

- **규칙**: [SHOULD] 대규모 데이터셋, 무한 스크롤, 실시간 피드에서는 Cursor 기반 페이지네이션을 사용한다. 커서 필드는 `_no`(BigInt, 순차적 autoincrement)를 사용한다.
- **이유**: Cursor 기반은 이전 페이지의 마지막 레코드를 기준으로 다음 페이지를 가져오므로, 데이터 양에 관계없이 일정한 성능을 보장한다. UUID인 `id`는 정렬 기준으로 부적합하므로, 순차적으로 증가하는 `_no` 필드를 커서로 사용한다. `skip: 1`은 커서 자체를 결과에서 제외하기 위해 필요하다.
- **좋은 예시**:
  ```typescript
  async findOrdersWithCursor(
    userId: string,
    cursor: bigint | null,
    pageSize: number,
  ): Promise<{ data: Order[]; nextCursor: bigint | null }> {
    const orders = await prisma.order.findMany({
      where: { userId, deletedAt: null },
      orderBy: { no: 'desc' },
      take: pageSize,
      ...(cursor !== null && {
        cursor: { no: cursor },
        skip: 1, // 커서 레코드 자체를 결과에서 제외
      }),
    });

    const nextCursor =
      orders.length === pageSize
        ? orders[orders.length - 1].no
        : null;

    return { data: orders, nextCursor };
  }

  // 사용 예시
  // 첫 페이지
  const page1 = await findOrdersWithCursor(userId, null, 20);
  // 다음 페이지
  const page2 = await findOrdersWithCursor(userId, page1.nextCursor, 20);
  ```
- **나쁜 예시**:
  ```typescript
  // UUID를 커서로 사용 — UUID는 순차적이지 않으므로 정렬 기준으로 부적합
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { id: 'desc' }, // UUID 정렬은 의미 없음
    cursor: { id: lastOrderId },
    take: 20,
    skip: 1,
  });
  ```

### 트랜잭션

#### Sequential Transaction (배열)

- **규칙**: [SHOULD] 서로 독립적인 여러 쿼리를 원자적으로 실행해야 할 때 Sequential Transaction(`$transaction`에 배열 전달)을 사용한다.
- **이유**: 배열 형태의 `$transaction`은 전달된 쿼리들을 순차적으로 실행하고, 하나라도 실패하면 전체를 롤백한다. 각 쿼리의 결과가 다른 쿼리에 필요하지 않은 독립적인 배치 작업에 적합하다. Interactive Transaction보다 오버헤드가 적다.
- **좋은 예시**:
  ```typescript
  // 독립적인 쿼리들을 원자적으로 실행
  const [updatedOrder, newLog, deletedCartItems] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.confirmed },
    }),
    prisma.orderLog.create({
      data: {
        orderId,
        action: 'CONFIRM',
        performedBy: adminId,
      },
    }),
    prisma.cartItem.deleteMany({
      where: { userId, orderId },
    }),
  ]);
  ```

#### Interactive Transaction (콜백)

- **규칙**: [SHOULD] 앞선 쿼리의 결과를 바탕으로 다음 쿼리를 결정해야 할 때 Interactive Transaction(`$transaction`에 콜백 전달)을 사용한다.
- **이유**: Interactive Transaction은 콜백 함수 내에서 자유로운 비즈니스 로직을 수행할 수 있고, 쿼리 간 의존성이 있는 경우에 적합하다. 콜백이 에러를 던지거나 Promise가 reject되면 자동으로 롤백된다.
- **좋은 예시**:
  ```typescript
  // 재고 확인 후 주문 생성 — 앞선 조회 결과에 의존
  const order = await prisma.$transaction(async (tx) => {
    // 1. 재고 확인
    const product = await tx.product.findUniqueOrThrow({
      where: { id: productId },
    });

    if (product.stock < quantity) {
      throw new BadRequestException('재고가 부족합니다.');
    }

    // 2. 재고 차감
    await tx.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    });

    // 3. 주문 생성
    return tx.order.create({
      data: {
        userId,
        totalAmount: product.price.mul(quantity),
        status: OrderStatus.pending,
        items: {
          create: {
            productId,
            quantity,
            unitPrice: product.price,
          },
        },
      },
      include: { items: true },
    });
  });
  ```

#### 트랜잭션 내 클라이언트 사용

- **규칙**: [MUST] Interactive Transaction 내부에서는 반드시 콜백 파라미터로 전달된 트랜잭션 클라이언트(`tx`)를 사용한다. 전역 `prisma` 인스턴스를 사용하지 않는다.
- **이유**: `tx` 클라이언트는 트랜잭션 컨텍스트에 바인딩되어 있어, 이를 통한 쿼리만 동일 트랜잭션 내에서 실행된다. 전역 `prisma`를 사용하면 해당 쿼리는 트랜잭션 밖에서 별도로 실행되어 원자성이 보장되지 않고, 롤백 시에도 해당 변경이 되돌려지지 않는다.
- **좋은 예시**:
  ```typescript
  await prisma.$transaction(async (tx) => {
    // tx 클라이언트 사용 — 트랜잭션 내에서 실행
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
    });

    await tx.order.create({
      data: {
        userId: user.id,
        status: OrderStatus.pending,
        totalAmount: new Prisma.Decimal('0'),
      },
    });
  });
  ```
- **나쁜 예시**:
  ```typescript
  await prisma.$transaction(async (tx) => {
    // 전역 prisma 사용 — 트랜잭션 밖에서 실행됨!
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    // tx로 생성하지만, 위의 조회는 트랜잭션과 무관
    await tx.order.create({
      data: {
        userId: user.id,
        status: OrderStatus.pending,
        totalAmount: new Prisma.Decimal('0'),
      },
    });
    // 롤백되더라도 prisma.user 조회는 이미 트랜잭션 밖에서 완료됨
  });
  ```

#### Interactive Transaction 내 Promise.all 금지

- **규칙**: [MUST NOT] Interactive Transaction 내부에서 `Promise.all`로 쿼리를 병렬 실행하지 않는다.
- **이유**: Interactive Transaction은 단일 DB 커넥션에서 순차적으로 쿼리를 실행한다. `Promise.all`로 병렬 실행을 시도하면 하나의 커넥션에서 동시에 여러 쿼리가 실행되어 교착 상태(deadlock)가 발생하거나, 예상치 못한 쿼리 순서로 인해 데이터 불일치가 발생할 수 있다. 독립적인 쿼리의 병렬 실행이 필요하면 Sequential Transaction(배열)을 사용한다.
- **좋은 예시**:
  ```typescript
  await prisma.$transaction(async (tx) => {
    // 순차적으로 실행
    const user = await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } },
    });

    const order = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.confirmed },
    });

    await tx.orderLog.create({
      data: { orderId, action: 'CONFIRM', performedBy: userId },
    });
  });
  ```
- **나쁜 예시**:
  ```typescript
  await prisma.$transaction(async (tx) => {
    // Promise.all — 교착 상태(deadlock) 위험!
    const [user, order] = await Promise.all([
      tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } },
      }),
      tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.confirmed },
      }),
    ]);
  });
  ```

#### 트랜잭션 타임아웃 설정

- **규칙**: [SHOULD] Interactive Transaction 사용 시 `maxWait`과 `timeout` 옵션을 명시적으로 설정한다.
- **이유**: `maxWait`은 트랜잭션이 커넥션 풀에서 커넥션을 얻기까지 대기하는 최대 시간(기본 2초)이고, `timeout`은 트랜잭션이 시작된 후 커밋/롤백까지의 최대 시간(기본 5초)이다. 장시간 실행되는 트랜잭션은 커넥션을 점유하여 다른 요청의 처리를 방해하므로, 비즈니스 요구사항에 맞는 적절한 값을 설정해야 한다.
- **좋은 예시**:
  ```typescript
  // 복잡한 주문 처리 — 타임아웃을 넉넉하게 설정
  const result = await prisma.$transaction(
    async (tx) => {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
      });

      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      return tx.order.create({
        data: {
          userId,
          totalAmount: product.price.mul(quantity),
          status: OrderStatus.pending,
        },
      });
    },
    {
      maxWait: 5000,  // 커넥션 획득 대기 최대 5초
      timeout: 10000, // 트랜잭션 실행 최대 10초
    },
  );
  ```
- **나쁜 예시**:
  ```typescript
  // 타임아웃 미설정 — 기본값(maxWait: 2초, timeout: 5초)에 의존
  // 복잡한 로직이 5초를 초과하면 트랜잭션이 자동 롤백됨
  const result = await prisma.$transaction(async (tx) => {
    // 외부 API 호출 등 시간이 오래 걸릴 수 있는 로직
    const paymentResult = await processExternalPayment(orderId);

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.confirmed },
    });
  });
  ```

#### Nested Write와 암묵적 트랜잭션

- **규칙**: [SHOULD] 부모-자식 레코드를 함께 생성/수정하는 경우 Nested Write를 활용하여 별도의 트랜잭션 래핑 없이 원자성을 보장한다.
- **이유**: Prisma의 Nested Write(create, update, connect, disconnect, connectOrCreate 등)는 내부적으로 암묵적 트랜잭션을 생성한다. 별도의 `$transaction`으로 감싸지 않아도 전체 작업이 원자적으로 실행되므로, 코드가 간결해지고 불필요한 트랜잭션 오버헤드를 피할 수 있다.
- **좋은 예시**:
  ```typescript
  // Nested Write — 암묵적 트랜잭션으로 원자성 보장
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.confirmed,
      items: {
        updateMany: {
          where: { status: 'pending' },
          data: { status: 'confirmed' },
        },
      },
    },
    include: { items: true },
  });
  ```
- **나쁜 예시**:
  ```typescript
  // Nested Write로 충분한데 불필요하게 $transaction 사용
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.confirmed },
    });

    await tx.orderItem.updateMany({
      where: { orderId, status: 'pending' },
      data: { status: 'confirmed' },
    });

    return updated;
  });
  ```

### Soft Delete

#### Client Extensions 기반 Soft Delete

- **규칙**: [SHOULD] Soft Delete는 `$extends`(Client Extensions)를 사용하여 구현한다. 더 이상 사용되지 않는(deprecated) `$use` 미들웨어를 사용하지 않는다.
- **이유**: Prisma 4.16+에서 도입된 Client Extensions(`$extends`)는 `$use` 미들웨어를 대체하는 공식 API이다. `$use`는 deprecated 상태이며, Client Extensions는 타입 안전성이 더 높고 모듈화가 용이하다. `$extends`의 `query` 컴포넌트를 사용하면 `delete`를 `update`로, `findMany`를 `deletedAt: null` 필터 추가로 오버라이드할 수 있다.
- **좋은 예시**:
  ```typescript
  import { Prisma, PrismaClient } from '@prisma/client';

  // Soft Delete 확장 정의
  const softDeleteExtension = Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'softDelete',
      query: {
        $allModels: {
          // delete → update (deletedAt 설정)
          async delete({ model, args }) {
            return (client as any)[model].update({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          },

          // deleteMany → updateMany (deletedAt 설정)
          async deleteMany({ model, args }) {
            return (client as any)[model].updateMany({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          },

          // findMany → deletedAt: null 필터 자동 추가
          async findMany({ args, query }) {
            args.where = {
              ...args.where,
              deletedAt: null,
            };
            return query(args);
          },

          // findFirst → deletedAt: null 필터 자동 추가
          async findFirst({ args, query }) {
            args.where = {
              ...args.where,
              deletedAt: null,
            };
            return query(args);
          },

          // findUnique → findFirst로 변환 (deletedAt 필터 추가)
          // 주의: findUnique의 where는 @id/@unique 필드만 허용하므로
          // deletedAt: null 을 직접 추가할 수 없다. findFirst로 위임한다.
          async findUnique({ model, args }) {
            return (client as any)[model].findFirst({
              ...args,
              where: { ...args.where, deletedAt: null },
            });
          },
        },
      },
    });
  });

  // PrismaClient에 확장 적용
  const basePrisma = new PrismaClient();
  const prisma = basePrisma.$extends(softDeleteExtension);

  export default prisma;
  ```

  > **주의**: `findUnique`를 `findFirst`로 위임하면 Prisma의 DataLoader 배칭 최적화가 적용되지 않는다. Soft Delete가 필요한 모델에서 `findUnique` 성능이 중요한 경우, 확장 대신 서비스 레이어에서 명시적으로 `deletedAt: null` 조건을 추가하는 방법을 고려한다.
- **나쁜 예시**:
  ```typescript
  // deprecated $use 미들웨어 사용 — 향후 제거될 API
  const prisma = new PrismaClient();

  prisma.$use(async (params, next) => {
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }

    if (params.action === 'findMany') {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};
      params.args.where.deletedAt = null;
    }

    return next(params);
  });
  ```

#### deletedAt 필드 패턴

- **규칙**: [MUST] Soft Delete 여부는 `deletedAt DateTime?` 필드로 관리한다. `deleted Boolean` 필드를 사용하지 않는다.
- **이유**: `deletedAt`은 삭제 여부(`null` vs `not null`)와 삭제 시각을 동시에 기록한다. `deleted Boolean` 필드는 삭제 시각 정보가 없어 감사 추적(audit trail)이 불가능하고, 별도의 `deletedAt` 필드를 추가해야 하는 중복이 발생한다. 또한 `deletedAt`은 `null` 비교로 인덱스를 효율적으로 활용할 수 있다.
- **좋은 예시**:
  ```prisma
  model Order {
    id        String    @id @default(uuid()) @db.Char(36)
    no        BigInt    @unique @default(autoincrement()) @map("_no")
    createdAt DateTime  @default(now()) @map("created_at") @db.DateTime(0)
    updatedAt DateTime  @updatedAt @map("updated_at") @db.DateTime(0)
    deletedAt DateTime? @map("deleted_at") @db.DateTime(0)

    // ... 도메인 필드

    @@map("order")
  }
  ```
  ```typescript
  // deletedAt 기반 — 삭제 여부 + 삭제 시각 동시 확인
  const activeOrders = await prisma.order.findMany({
    where: { deletedAt: null },
  });

  // Soft Delete 확장이 적용되어 있으면 자동으로 deletedAt: null 필터 추가
  ```
- **나쁜 예시**:
  ```prisma
  model Order {
    id      String  @id @default(uuid()) @db.Char(36)
    no      BigInt  @unique @default(autoincrement()) @map("_no")
    deleted Boolean @default(false) @db.TinyInt  // 삭제 시각 정보 없음!

    @@map("order")
  }
  ```

### Raw Query

#### $queryRaw Tagged Template

- **규칙**: [MUST] Raw Query 실행 시 `$queryRaw`를 Tagged Template Literal 형태로 사용한다.
- **이유**: `$queryRaw`를 Tagged Template Literal로 사용하면 Prisma가 변수를 자동으로 파라미터화(parameterized query)하여 SQL Injection을 방지한다. Template Literal 내의 `${}` 표현식은 SQL 문자열에 직접 삽입되지 않고, 별도의 파라미터로 전달된다.
- **좋은 예시**:
  ```typescript
  // Tagged Template — 변수가 자동으로 파라미터화됨
  const email = userInput; // 사용자 입력값

  const users = await prisma.$queryRaw<User[]>`
    SELECT id, email, name
    FROM user
    WHERE email = ${email}
    AND deleted_at IS NULL
  `;

  // 복잡한 집계 쿼리
  const stats = await prisma.$queryRaw<OrderStats[]>`
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS order_count,
      SUM(total_amount) AS total_amount
    FROM \`order\`
    WHERE user_id = ${userId}
      AND created_at >= ${startDate}
      AND created_at < ${endDate}
      AND deleted_at IS NULL
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;
  ```
- **나쁜 예시**:
  ```typescript
  // 문자열 연결 후 $queryRawUnsafe — SQL Injection 취약!
  const email = userInput; // 사용자 입력: "'; DROP TABLE user; --"

  const users = await prisma.$queryRawUnsafe(
    `SELECT * FROM user WHERE email = '${email}'`
    // 실행되는 SQL: SELECT * FROM user WHERE email = ''; DROP TABLE user; --'
  );
  ```

#### $queryRawUnsafe 사용 제한

- **규칙**: [MUST NOT] 사용자 입력이 포함된 쿼리에 `$queryRawUnsafe`를 사용하지 않는다.
- **이유**: `$queryRawUnsafe`는 문자열을 그대로 SQL로 실행하므로, 사용자 입력이 포함되면 SQL Injection에 취약하다. 동적 테이블명이나 컬럼명을 사용해야 하는 극히 제한적인 경우에만 사용하며, 이 경우에도 반드시 허용 목록(allowlist)으로 입력값을 검증해야 한다.
- **좋은 예시**:
  ```typescript
  // 동적 테이블명이 필요한 경우 — 허용 목록으로 검증
  const ALLOWED_TABLES = ['order', 'user', 'product'] as const;
  type AllowedTable = (typeof ALLOWED_TABLES)[number];

  async function getCount(tableName: string): Promise<number> {
    if (!ALLOWED_TABLES.includes(tableName as AllowedTable)) {
      throw new BadRequestException('허용되지 않은 테이블입니다.');
    }

    const result = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) AS count FROM \`${tableName}\` WHERE deleted_at IS NULL`,
    );

    return Number(result[0].count);
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 사용자 입력을 직접 $queryRawUnsafe에 전달 — SQL Injection!
  async function searchUsers(name: string) {
    return prisma.$queryRawUnsafe(
      `SELECT * FROM user WHERE name LIKE '%${name}%'`,
    );
  }

  // 파라미터화 없이 $queryRawUnsafe 사용
  async function findByStatus(status: string) {
    return prisma.$queryRawUnsafe(
      `SELECT * FROM \`order\` WHERE status = '${status}'`,
    );
  }
  ```

#### Raw Query 사용 기준

- **규칙**: [SHOULD] Raw Query보다 Prisma Client API를 우선 사용한다. Raw Query는 Prisma Client API로 표현할 수 없는 경우에만 사용한다.
- **이유**: Prisma Client API는 타입 안전하고, 스키마 변경 시 자동으로 반영되며, SQL Injection 위험이 없다. Raw Query는 타입 안전성이 보장되지 않고, 스키마 변경 시 수동으로 수정해야 하며, SQL Injection 방어를 개발자가 직접 관리해야 한다.

  **Raw Query가 필요한 경우:**

  | 사용 상황 | 예시 |
  |-----------|------|
  | 복잡한 집계 (GROUP BY + HAVING) | 일별 매출 통계, 상위 N개 조회 |
  | DB 고유 함수 | `MATCH...AGAINST` (전문 검색), `JSON_EXTRACT` |
  | 성능 최적화가 필요한 벌크 연산 | 대량 UPDATE, INSERT...ON DUPLICATE KEY |
  | Prisma가 지원하지 않는 SQL 기능 | 윈도우 함수, CTE, UNION |

- **좋은 예시**:
  ```typescript
  // Prisma Client API로 충분한 경우 — Raw Query 대신 사용
  const pendingOrders = await prisma.order.findMany({
    where: {
      userId,
      status: OrderStatus.pending,
      createdAt: { gte: startDate },
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Prisma Client API로 표현 불가능한 경우 — Raw Query 사용
  const dailyStats = await prisma.$queryRaw<DailyStat[]>`
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS orderCount,
      SUM(total_amount) AS totalAmount,
      AVG(total_amount) AS avgAmount
    FROM \`order\`
    WHERE user_id = ${userId}
      AND created_at BETWEEN ${startDate} AND ${endDate}
      AND deleted_at IS NULL
    GROUP BY DATE(created_at)
    HAVING COUNT(*) >= ${minOrderCount}
    ORDER BY date DESC
  `;
  ```
- **나쁜 예시**:
  ```typescript
  // Prisma Client API로 충분한데 Raw Query 사용 — 불필요한 복잡성
  const pendingOrders = await prisma.$queryRaw<Order[]>`
    SELECT *
    FROM \`order\`
    WHERE user_id = ${userId}
      AND status = 'pending'
      AND created_at >= ${startDate}
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 10
  `;
  ```

## 성능 최적화

### N+1 문제 방지

- **규칙**: [MUST NOT] 루프 안에서 관계(relation)를 개별적으로 조회하지 않는다.
- **이유**: N건의 데이터에 대해 N번의 추가 쿼리가 발생하면 응답 시간이 데이터 건수에 비례하여 증가한다. 100건의 주문을 조회할 때 각 주문의 상품을 개별 쿼리로 가져오면 총 101번의 쿼리가 실행된다.
- **좋은 예시**:
  ```typescript
  // include로 한 번에 관계 데이터 로드 (2개의 쿼리)
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: true,
      user: true,
    },
  });
  ```
- **나쁜 예시**:
  ```typescript
  // N+1 문제 발생! 주문 N건 × 개별 조회 = N+1개의 쿼리
  const orders = await prisma.order.findMany({
    where: { userId },
  });

  for (const order of orders) {
    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
    });
    order.items = items;
  }
  ```

- **규칙**: [MUST] 관계 데이터가 필요한 경우 `include` 또는 `select`를 사용하여 한 번의 Prisma Client 호출로 로드한다.
- **이유**: Prisma는 `include`/`select`를 사용하면 내부적으로 두 번의 쿼리(메인 쿼리 + IN 절 관계 쿼리)로 관계 데이터를 효율적으로 가져온다. 루프 내 개별 쿼리 대비 네트워크 왕복(round-trip)이 크게 줄어든다.
- **좋은 예시**:
  ```typescript
  // 방법 1: include로 관계 전체 로드
  const users = await prisma.user.findMany({
    include: { orders: true },
  });

  // 방법 2: IN 필터로 배치 조회
  const users = await prisma.user.findMany();
  const orders = await prisma.order.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });
  ```

- **규칙**: [SHOULD] Prisma 5.8 이상에서는 `relationLoadStrategy: "join"`을 사용하여 단일 SQL 쿼리로 관계 데이터를 로드한다.
- **이유**: 기본 로딩 전략은 메인 쿼리와 관계 쿼리를 별도로 실행하지만, `"join"` 전략은 SQL JOIN으로 한 번의 쿼리에 모든 데이터를 가져온다. 네트워크 왕복이 1회로 줄어들어 지연 시간(latency)에 민감한 환경에서 성능이 향상된다.
- **좋은 예시**:
  ```typescript
  // 단일 SQL JOIN 쿼리로 실행 (Prisma 5.8+)
  const ordersWithItems = await prisma.order.findMany({
    relationLoadStrategy: 'join',
    where: { userId },
    include: {
      items: true,
      user: true,
    },
  });
  ```
  ```prisma
  // schema.prisma — relationJoins 프리뷰 기능 활성화 필요
  generator client {
    provider        = "prisma-client-js"
    previewFeatures = ["relationJoins"]
  }
  ```

### 필요한 필드만 조회

- **규칙**: [SHOULD] 전체 필드가 필요하지 않은 경우 `select`를 사용하여 필요한 필드만 조회한다.
- **이유**: 불필요한 필드를 조회하면 메모리 사용량과 네트워크 전송량이 증가한다. 특히 `Text`, `Json` 등 대용량 필드가 포함된 모델에서는 `select`로 필요한 필드만 지정하면 성능이 크게 개선된다.
- **좋은 예시**:
  ```typescript
  // 목록 조회 시 필요한 필드만 선택
  const orders = await prisma.order.findMany({
    where: { userId },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      status: true,
      createdAt: true,
    },
  });
  ```
- **나쁜 예시**:
  ```typescript
  // 전체 필드 조회 — 목록에서 불필요한 description, metadata 등도 포함
  const orders = await prisma.order.findMany({
    where: { userId },
  });
  ```

- **규칙**: [SHOULD] `select`와 `include`의 차이를 이해하고 상황에 맞게 사용한다.
- **이유**: `select`는 지정한 필드만 반환하므로 응답 크기를 최소화할 수 있다. `include`는 모델의 모든 스칼라 필드를 포함하면서 추가로 관계 데이터를 로드한다. 동일 쿼리에서 `select`와 `include`는 동시에 사용할 수 없다.

  **select vs include 비교:**

  | 구분 | `select` | `include` |
  |------|----------|-----------|
  | 스칼라 필드 | 지정한 필드만 반환 | 모든 스칼라 필드 반환 |
  | 관계 데이터 | `select` 내에서 중첩 지정 | 추가 관계 데이터 로드 |
  | 반환 타입 | 선택한 필드로 좁혀진 타입 | 전체 모델 타입 + 관계 |
  | 사용 시점 | 목록 조회, API 응답 최적화 | 상세 조회, 관계 데이터 필요 시 |
  | 동시 사용 | 불가 (`select`와 `include` 동시 사용 불가) | 불가 |

- **좋은 예시**:
  ```typescript
  // select: 필요한 필드만 반환 (목록 조회에 적합)
  const orderList = await prisma.order.findMany({
    where: { userId },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
        },
      },
    },
  });
  // 반환 타입: { id: string; orderNumber: string; totalAmount: Decimal; items: { id: string; productId: string; quantity: number; }[] }[]

  // include: 모든 스칼라 필드 + 관계 데이터 (상세 조회에 적합)
  const orderDetail = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      user: true,
    },
  });
  // 반환 타입: Order & { items: OrderItem[]; user: User }
  ```
- **나쁜 예시**:
  ```typescript
  // select와 include 동시 사용 — 컴파일 에러!
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true },
    include: { items: true }, // Error: select와 include는 동시 사용 불가
  });
  ```

### 커넥션 풀링

- **규칙**: [MUST] PrismaClient 인스턴스는 애플리케이션 전체에서 하나만 생성(싱글톤)한다. 요청마다 `new PrismaClient()`를 호출하지 않는다.
- **이유**: PrismaClient 인스턴스는 내부적으로 커넥션 풀을 관리한다. 매 요청마다 새 인스턴스를 생성하면 커넥션 풀이 계속 생성되어 DB 커넥션이 빠르게 고갈(`Too many connections`)되고, 각 인스턴스가 풀 크기만큼 커넥션을 점유하므로 서버 리소스도 낭비된다.
- **좋은 예시**:
  ```typescript
  // NestJS에서 싱글톤 PrismaService 사용 (권장)
  @Injectable()
  export class PrismaService extends PrismaClient {
    constructor() {
      super();
    }
  }

  // 또는 글로벌 변수를 활용한 싱글톤 (non-NestJS 환경)
  const globalForPrisma = global as unknown as { prisma: PrismaClient };

  export const prisma =
    globalForPrisma.prisma || new PrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 매 요청마다 PrismaClient 생성 — 커넥션 고갈!
  app.get('/users', async (req, res) => {
    const prisma = new PrismaClient();
    const users = await prisma.user.findMany();
    await prisma.$disconnect();
    res.json(users);
  });
  ```

- **규칙**: [SHOULD] `DATABASE_URL`에 `connection_limit`과 `pool_timeout`을 설정하여 커넥션 풀을 제어한다.
- **이유**: Prisma는 기본적으로 `num_physical_cpus * 2 + 1`개의 커넥션을 사용한다. 서버리스 환경이나 DB 커넥션 수에 제한이 있는 경우, `connection_limit`으로 최대 커넥션 수를 제한하고 `pool_timeout`으로 커넥션 획득 대기 시간을 설정해야 한다.
- **좋은 예시**:
  ```bash
  # .env — 커넥션 풀 설정 포함
  DATABASE_URL="mysql://user:password@host:3306/dbname?connection_limit=10&pool_timeout=10"
  ```
  ```typescript
  // 또는 PrismaClient 생성 시 datasourceUrl로 설정
  @Injectable()
  export class PrismaService extends PrismaClient {
    constructor(private readonly configService: ConfigService) {
      const databaseUrl = configService.get<string>('DATABASE_URL');

      super({
        datasourceUrl: `${databaseUrl}&connection_limit=10&pool_timeout=10`,
      });
    }
  }
  ```
- **나쁜 예시**:
  ```bash
  # 커넥션 풀 설정 없음 — 기본값에 의존하여 환경별 제어 불가
  DATABASE_URL="mysql://user:password@host:3306/dbname"
  ```

## NestJS 통합

### PrismaService 설정

- **규칙**: [MUST] `PrismaService`는 `PrismaClient`를 확장(extends)하고, `OnModuleInit`과 `OnModuleDestroy` 인터페이스를 구현한다.
- **이유**: `OnModuleInit`에서 `$connect()`를 호출하여 NestJS 모듈 초기화 시점에 DB 커넥션을 미리 맺고, `OnModuleDestroy`에서 `$disconnect()`를 호출하여 애플리케이션 종료 시 커넥션을 정리한다. 이를 통해 커넥션 수명 주기가 NestJS 모듈 수명 주기와 일치하므로 커넥션 누수를 방지할 수 있다.
- **좋은 예시**:
  ```typescript
  // src/prisma/prisma.service.ts
  import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
  import { PrismaClient } from '@prisma/client';
  import { ConfigService } from '@nestjs/config';

  @Injectable()
  export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
  {
    constructor(private readonly configService: ConfigService) {
      const isProduction =
        configService.get<string>('NODE_ENV') === 'production';

      super({
        log: isProduction
          ? ['error']
          : ['query', 'info', 'warn', 'error'],
      });
    }

    async onModuleInit(): Promise<void> {
      await this.$connect();
    }

    async onModuleDestroy(): Promise<void> {
      await this.$disconnect();
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // OnModuleInit/OnModuleDestroy 미구현 — 커넥션 수명 주기 관리 없음
  @Injectable()
  export class PrismaService extends PrismaClient {
    constructor() {
      super();
      // 생성자에서 $connect() 호출 — 비동기 초기화가 보장되지 않음
      this.$connect();
    }
  }
  ```

- **규칙**: [SHOULD] 로깅 설정은 환경에 따라 분리한다. 개발 환경에서는 `['query', 'info', 'warn', 'error']`, 프로덕션 환경에서는 `['error']`만 활성화한다.
- **이유**: 개발 환경에서 `query` 로그를 활성화하면 실행되는 SQL과 파라미터를 확인할 수 있어 디버깅에 유용하다. 프로덕션에서는 `query` 로그가 대량으로 발생하여 성능에 영향을 주고, 민감 정보가 로그에 노출될 수 있으므로 `error`만 활성화한다.
- **좋은 예시**:
  ```typescript
  // 환경별 로깅 설정
  super({
    log: isProduction
      ? ['error']                          // 프로덕션: 에러만
      : ['query', 'info', 'warn', 'error'], // 개발: 전체 로그
  });
  ```
- **나쁜 예시**:
  ```typescript
  // 환경 구분 없이 전체 로그 활성화 — 프로덕션에서 성능 저하 및 정보 노출
  super({
    log: ['query', 'info', 'warn', 'error'],
  });
  ```

### PrismaModule 설정

- **규칙**: [MUST] `PrismaModule`에 `@Global()` 데코레이터를 적용하여 전역 모듈로 등록한다. `PrismaService`를 `providers`와 `exports`에 모두 포함한다.
- **이유**: `@Global()`로 등록하면 다른 모듈에서 별도의 `imports` 없이 `PrismaService`를 주입받을 수 있다. PrismaClient는 싱글톤으로 관리되어야 하므로, 전역 모듈로 한 번만 등록하는 것이 적합하다. 매 Feature Module마다 `PrismaModule`을 imports하는 반복을 제거한다.
- **좋은 예시**:
  ```typescript
  // src/prisma/prisma.module.ts
  import { Global, Module } from '@nestjs/common';
  import { PrismaService } from './prisma.service';

  @Global()
  @Module({
    providers: [PrismaService],
    exports: [PrismaService],
  })
  export class PrismaModule {}
  ```
  ```typescript
  // src/app.module.ts — PrismaModule을 한 번만 등록
  import { Module } from '@nestjs/common';
  import { PrismaModule } from './prisma/prisma.module';
  import { OrderModule } from './order/order.module';
  import { UserModule } from './user/user.module';

  @Module({
    imports: [PrismaModule, OrderModule, UserModule],
  })
  export class AppModule {}
  ```
  ```typescript
  // src/order/order.service.ts — PrismaModule imports 없이 주입 가능
  import { Injectable } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';

  @Injectable()
  export class OrderService {
    constructor(private readonly prisma: PrismaService) {}

    async findOrder(id: string) {
      return this.prisma.order.findUnique({ where: { id } });
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // @Global() 미사용 — 매 모듈마다 PrismaModule을 imports해야 함
  @Module({
    providers: [PrismaService],
    exports: [PrismaService],
  })
  export class PrismaModule {}

  // 모든 Feature Module에서 반복적으로 imports
  @Module({
    imports: [PrismaModule], // 매번 필요
    providers: [OrderService],
  })
  export class OrderModule {}

  @Module({
    imports: [PrismaModule], // 매번 필요
    providers: [UserService],
  })
  export class UserModule {}
  ```

### 에러 핸들링

- **규칙**: [MUST] `PrismaClientKnownRequestError`를 NestJS Exception Filter에서 포착하여 HTTP 상태 코드로 변환한다.
- **이유**: Prisma의 에러가 처리되지 않으면 클라이언트에 500 Internal Server Error와 함께 내부 구현 정보가 노출된다. Exception Filter에서 에러 코드별로 적절한 HTTP 상태 코드와 메시지를 반환해야 API 응답이 일관되고 보안적으로 안전하다.

  **Prisma 에러 코드와 HTTP 상태 코드 매핑:**

  | Prisma 에러 코드 | 의미 | HTTP 상태 코드 |
  |-----------------|------|---------------|
  | `P2002` | 유니크 제약조건 위반 | 409 Conflict |
  | `P2025` | 레코드를 찾을 수 없음 | 404 Not Found |
  | `P2003` | 외래 키 제약조건 위반 | 400 Bad Request |
  | `P2000` | 컬럼 값이 너무 김 | 400 Bad Request |

- **좋은 예시**:
  ```typescript
  // src/prisma/prisma-exception.filter.ts
  import {
    ArgumentsHost,
    Catch,
    HttpStatus,
    Logger,
  } from '@nestjs/common';
  import { BaseExceptionFilter } from '@nestjs/core';
  import { Prisma } from '@prisma/client';
  import { Response } from 'express';

  @Catch(Prisma.PrismaClientKnownRequestError)
  export class PrismaExceptionFilter extends BaseExceptionFilter {
    private readonly logger = new Logger(PrismaExceptionFilter.name);

    catch(
      exception: Prisma.PrismaClientKnownRequestError,
      host: ArgumentsHost,
    ): void {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();

      const errorCodeMap: Record<
        string,
        { status: number; message: string }
      > = {
        P2002: {
          status: HttpStatus.CONFLICT,
          message: '이미 존재하는 리소스입니다.',
        },
        P2025: {
          status: HttpStatus.NOT_FOUND,
          message: '리소스를 찾을 수 없습니다.',
        },
        P2003: {
          status: HttpStatus.BAD_REQUEST,
          message: '참조하는 리소스가 존재하지 않습니다.',
        },
        P2000: {
          status: HttpStatus.BAD_REQUEST,
          message: '입력 값이 허용 범위를 초과합니다.',
        },
      };

      const mapped = errorCodeMap[exception.code];

      if (mapped) {
        this.logger.warn(
          `Prisma ${exception.code}: ${exception.message}`,
        );

        response.status(mapped.status).json({
          statusCode: mapped.status,
          message: mapped.message,
        });
      } else {
        this.logger.error(
          `Prisma unhandled error ${exception.code}: ${exception.message}`,
        );

        super.catch(exception, host);
      }
    }
  }
  ```
  ```typescript
  // src/main.ts — 글로벌 필터 등록
  import { HttpAdapterHost, NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';
  import { PrismaExceptionFilter } from './prisma/prisma-exception.filter';

  async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new PrismaExceptionFilter(httpAdapter));

    app.enableShutdownHooks();

    await app.listen(3000);
  }

  bootstrap();
  ```
- **나쁜 예시**:
  ```typescript
  // Exception Filter 미적용 — Prisma 에러가 500으로 그대로 노출
  @Injectable()
  export class OrderService {
    async findOrder(id: string) {
      // P2025 에러 발생 시 500 Internal Server Error가 반환됨
      return this.prisma.order.findUniqueOrThrow({
        where: { id },
      });
    }
  }
  ```

### Shutdown Hooks

- **규칙**: [MUST] `main.ts`에서 `app.enableShutdownHooks()`를 호출하여 프로세스 종료 시 NestJS의 수명 주기 이벤트(`onModuleDestroy`)가 정상적으로 실행되도록 한다.
- **이유**: `enableShutdownHooks()`를 호출하지 않으면 SIGTERM/SIGINT 시그널 수신 시 `onModuleDestroy`가 호출되지 않아 `$disconnect()`가 실행되지 않는다. 이 경우 DB 커넥션이 정리되지 않고 남아 있게 되어 커넥션 누수가 발생할 수 있다.
- **좋은 예시**:
  ```typescript
  // src/main.ts
  async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    // 프로세스 종료 시 onModuleDestroy 호출 보장
    app.enableShutdownHooks();

    await app.listen(3000);
  }

  bootstrap();
  ```
- **나쁜 예시**:
  ```typescript
  // enableShutdownHooks 미호출 — SIGTERM 시 $disconnect()가 실행되지 않음
  async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);
    await app.listen(3000);
  }

  bootstrap();
  ```

## 안티패턴

### 매 요청마다 PrismaClient 인스턴스 생성

- **규칙**: [MUST NOT] 요청(request)마다 `new PrismaClient()`를 호출하지 않는다. 반드시 싱글톤 인스턴스를 사용한다.
- **이유**: PrismaClient 인스턴스는 내부적으로 커넥션 풀을 생성한다. 매 요청마다 새 인스턴스를 생성하면 커넥션 풀이 무한히 증가하여 DB의 `max_connections` 한도를 초과(`Too many connections`)하고, 커넥션 생성/해제 오버헤드로 성능이 저하된다.
- **나쁜 예시**:
  ```typescript
  // 요청마다 새 PrismaClient 생성 — 커넥션 고갈!
  app.get('/users', async (req, res) => {
    const prisma = new PrismaClient();
    try {
      const users = await prisma.user.findMany();
      res.json(users);
    } finally {
      await prisma.$disconnect();
    }
  });
  ```

### 루프 내 N+1 쿼리

- **규칙**: [MUST NOT] 루프 안에서 관계 데이터를 개별 쿼리로 조회하지 않는다. `include`, `select`, 또는 `in` 필터로 한 번에 로드한다.
- **이유**: N건의 부모 데이터에 대해 N번의 자식 쿼리가 발생하여 데이터 건수에 비례하는 성능 저하가 발생한다. DB 서버의 부하가 증가하고 응답 시간이 급격히 느려진다.
- **나쁜 예시**:
  ```typescript
  // N+1 쿼리 — 사용자 100명이면 101번의 쿼리 실행
  const users = await prisma.user.findMany();

  const usersWithOrders = await Promise.all(
    users.map(async (user) => ({
      ...user,
      orders: await prisma.order.findMany({
        where: { userId: user.id },
      }),
    })),
  );
  ```

### Interactive Transaction에서 Promise.all 사용

- **규칙**: [MUST NOT] Interactive Transaction(`$transaction` 콜백) 내부에서 `Promise.all`로 쿼리를 병렬 실행하지 않는다.
- **이유**: Interactive Transaction은 단일 DB 커넥션에서 순차적으로 쿼리를 실행한다. `Promise.all`로 병렬 실행을 시도하면 하나의 커넥션에서 동시에 여러 쿼리가 실행되어 교착 상태(deadlock)가 발생하거나, 예상치 못한 실행 순서로 인해 데이터 불일치가 발생할 수 있다.
- **나쁜 예시**:
  ```typescript
  // Interactive Transaction 내 Promise.all — deadlock 위험!
  await prisma.$transaction(async (tx) => {
    const [user, order] = await Promise.all([
      tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } },
      }),
      tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.confirmed },
      }),
    ]);
  });
  ```

### 트랜잭션 콜백 외부에서 tx 클라이언트 사용

- **규칙**: [MUST NOT] Interactive Transaction 콜백의 `tx` 파라미터를 콜백 외부에서 사용하지 않는다. 또한 콜백 내부에서 전역 `prisma` 인스턴스를 사용하지 않는다.
- **이유**: `tx` 클라이언트는 트랜잭션 컨텍스트에 바인딩되어 있다. 콜백 외부에서 `tx`를 사용하면 이미 커밋/롤백된 트랜잭션에 대해 쿼리를 시도하게 되어 에러가 발생한다. 반대로 콜백 내부에서 전역 `prisma`를 사용하면 해당 쿼리가 트랜잭션 밖에서 실행되어 원자성이 깨진다.
- **나쁜 예시**:
  ```typescript
  // tx를 콜백 외부로 유출 — 트랜잭션 종료 후 사용 시 에러!
  let txRef: any;

  await prisma.$transaction(async (tx) => {
    txRef = tx;
    await tx.order.create({
      data: { userId, status: OrderStatus.pending, totalAmount: new Prisma.Decimal('0') },
    });
  });

  // 트랜잭션 이미 종료 — 에러 발생!
  await txRef.orderLog.create({
    data: { orderId: 'some-id', action: 'CREATE' },
  });
  ```
  ```typescript
  // 콜백 내부에서 전역 prisma 사용 — 트랜잭션 원자성 깨짐!
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.confirmed },
    });

    // 전역 prisma 사용 — 이 쿼리는 트랜잭션 밖에서 실행됨
    await prisma.orderLog.create({
      data: { orderId, action: 'CONFIRM', performedBy: adminId },
    });
  });
  ```

### FK 컬럼에 @@index 누락

- **규칙**: [MUST NOT] 외래 키(FK) 컬럼에 `@@index`를 생략하지 않는다.
- **이유**: MySQL InnoDB는 FK 제약조건에 대해 자동으로 인덱스를 생성하지만, Prisma는 스키마에 FK 제약조건을 생성하지 않으므로(`relationMode = "prisma"` 또는 기본 동작) 인덱스가 자동 생성되지 않는다. FK 컬럼에 인덱스가 없으면 JOIN 및 WHERE 절 조회 시 풀 테이블 스캔이 발생하여 성능이 급격히 저하된다.
- **나쁜 예시**:
  ```prisma
  model Order {
    id     String @id @default(uuid()) @db.Char(36)
    no     BigInt @unique @default(autoincrement()) @map("_no")

    userId String @map("user_id") @db.Char(36)
    user   User   @relation(fields: [userId], references: [id])

    // @@index([userId]) 누락 — userId 조건 조회 시 풀 테이블 스캔 발생
    @@map("order")
  }
  ```

### $queryRawUnsafe에 사용자 입력 직접 삽입

- **규칙**: [MUST NOT] `$queryRawUnsafe`에 사용자 입력을 문자열 보간(template literal, concatenation)으로 직접 삽입하지 않는다.
- **이유**: SQL Injection 공격에 직접적으로 취약해진다. 공격자가 입력값에 SQL 구문을 삽입하여 데이터 유출, 삭제, 권한 탈취 등을 시도할 수 있다. 반드시 `$queryRaw`(tagged template)를 사용하거나, `$queryRawUnsafe` 사용 시 파라미터 바인딩과 입력값 허용 목록(allowlist) 검증을 적용해야 한다.
- **나쁜 예시**:
  ```typescript
  // 사용자 입력을 직접 삽입 — SQL Injection!
  async function searchUsers(name: string) {
    return prisma.$queryRawUnsafe(
      `SELECT * FROM user WHERE name LIKE '%${name}%'`,
    );
    // name에 "'; DROP TABLE user; --" 입력 시 테이블 삭제 가능
  }
  ```

### 프로덕션에서 prisma migrate dev 사용

- **규칙**: [MUST NOT] 프로덕션 환경에서 `prisma migrate dev`를 실행하지 않는다. 프로덕션 마이그레이션은 반드시 `prisma migrate deploy`만 사용한다.
- **이유**: `prisma migrate dev`는 개발 전용 명령어로, 스키마 변경 감지 시 마이그레이션 파일을 자동 생성하고, 필요한 경우 데이터베이스를 리셋(초기화)할 수 있다. 프로덕션에서 실행하면 운영 데이터가 삭제될 수 있다. `prisma migrate deploy`는 기존 마이그레이션 파일만 순차적으로 적용하므로 안전하다.
- **나쁜 예시**:
  ```bash
  # 프로덕션 서버에서 migrate dev 실행 — 데이터 손실 위험!
  NODE_ENV=production npx prisma migrate dev

  # 프로덕션 배포 스크립트에 migrate dev 포함 — 금지!
  # deploy.sh
  npx prisma migrate dev
  npm run start:prod
  ```

## 참고 자료

- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)
- [Prisma Client API Reference](https://www.prisma.io/docs/orm/reference/prisma-client-reference)
- [Prisma Relations Guide](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations)
- [Prisma Transactions Guide](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Prisma Error Reference](https://www.prisma.io/docs/orm/reference/error-reference)
- [Prisma Query Optimization](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance)
- [Prisma Connection Management](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)
- [NestJS Prisma Recipe](https://www.prisma.io/docs/guides/nestjs)
- [nestjs-prisma](https://nestjs-prisma.dev)
