# Prisma Convention

> This document defines the rules applied to Prisma ORM projects.
> Parent rules: BACKEND_CONVENTION.md | DATABASE_CONVENTION.md

## Tech Stack

| Item | Version/Config |
|------|----------|
| Prisma ORM | >= 5.8 (supports `$extends`, `relationJoins`) |
| Database | MySQL (default) |

## Schema Definition

### Basic Structure

- [MUST] The `schema.prisma` file must organize blocks in the order: `generator` → `datasource` → `enum` → `model`.
- [SHOULD] In the early stages of a project, manage with a single `schema.prisma` file. If there are 30+ models, split using Prisma 5.15+ `prismaSchemaFolder`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum OrderStatus {
  pending
  confirmed
  shipped
}

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

### Schema Formatting Automation

- [SHOULD] Use `prisma-case-format` to auto-generate `@map()`/`@@map()` annotations.

```yaml
# .prisma-case-format
table: pascal
mapTable: snake,singular
field: camel
mapField: snake
enum: pascal
mapEnum: snake
```
```bash
npx prisma-case-format --file prisma/schema.prisma && npx prisma format
```

### Naming Rules

- [MUST] Model names must be PascalCase singular + `@@map("snake_case")`. Note: Plural forms and snake_case model names are prohibited.
- [MUST] Field names must be camelCase + `@map("snake_case")`. (Can be auto-generated with `prisma-case-format`)

### ID Strategy (See DATABASE_CONVENTION.md)

- [MUST] PK: `@id @default(uuid()) @db.Char(36)`. Note: Auto Increment PK and omitting `@db.Char(36)` are prohibited.
- [MUST] All models must have a `_no` column: `BigInt @unique @default(autoincrement()) @map("_no")`

### Field Definition

- [MUST] Specify `@db.*` native types for all fields. `BigInt` is the only exception (always BIGINT).

| Prisma Type | `@db.*` | MySQL Type | Usage |
|------------|---------|-----------|------|
| `String` | `@db.Char(36)` | CHAR(36) | UUID |
| `String` | `@db.VarChar(n)` | VARCHAR(n) | Variable-length string |
| `String` | `@db.Text` | TEXT | Long text |
| `Int` | `@db.Int` | INT | Integer |
| `Decimal` | `@db.Decimal(p, s)` | DECIMAL(p, s) | Monetary values, etc. |
| `Boolean` | `@db.TinyInt` | TINYINT(1) | Boolean |
| `DateTime` | `@db.DateTime(0)` | DATETIME | Date/Time |
| `Json` | `@db.Json` | JSON | JSON |

- [MUST] Nullable fields must use the `?` suffix (Prisma auto-generates `T | null`).
- [SHOULD] `Decimal` return values are `Prisma.Decimal` objects. Use `Number()`, `toNumber()`, or methods like `.mul()`, `.plus()`.

### Common Fields (See DATABASE_CONVENTION.md)

- [MUST] All models must include `id`, `no`(_no), `createdAt`, `updatedAt`, `deletedAt?`. Since Prisma does not support inheritance, these must be repeated in each model.
- [MUST] Common fields are placed at the top, domain fields at the bottom of the model.

```prisma
model Order {
  // --- Common Fields ---
  id        String    @id @default(uuid()) @db.Char(36)
  no        BigInt    @unique @default(autoincrement()) @map("_no")
  createdAt DateTime  @default(now()) @map("created_at") @db.DateTime(0)
  updatedAt DateTime  @updatedAt @map("updated_at") @db.DateTime(0)
  deletedAt DateTime? @map("deleted_at") @db.DateTime(0)
  // --- Domain Fields ---
  orderNumber String      @map("order_number") @db.VarChar(100)
  totalAmount Decimal     @map("total_amount") @db.Decimal(15, 2)
  status      OrderStatus @default(pending)
  @@map("order")
}
```

### Relation Definition

**1:1**: [MUST] The side holding the FK must have `@relation(fields, references)` + `@unique`. Note: Omitting `@unique` causes it to be interpreted as 1:N.

```prisma
model UserProfile {
  id     String @id @default(uuid()) @db.Char(36)
  userId String @unique @map("user_id") @db.Char(36)
  user   User   @relation(fields: [userId], references: [id])
  @@map("user_profile")
}
```

**1:N**: [MUST] Specify the FK field on the N side + `@relation(fields, references)`.

```prisma
model Order {
  userId String @map("user_id") @db.Char(36)
  user   User   @relation(fields: [userId], references: [id])
  @@index([userId])
  @@map("order")
}
```

**M:N**: [MUST NOT] Implicit many-to-many is prohibited. Define an explicit join model.

```prisma
model PostTag {
  id     String @id @default(uuid()) @db.Char(36)
  postId String @map("post_id") @db.Char(36)
  post   Post   @relation(fields: [postId], references: [id])
  tagId  String @map("tag_id") @db.Char(36)
  tag    Tag    @relation(fields: [tagId], references: [id])
  @@unique([postId, tagId])
  @@index([postId])
  @@index([tagId])
  @@map("post_tag")
}
```

**FK Naming**: [MUST] `{relatedModelName}Id` (camelCase) + `@map("snake_case")`. Note: snake_case field names are prohibited.

**FK Index**: [MUST] `@@index()` is required on FK columns. Prisma does not auto-generate FK indexes.

**Multiple Relations**: [SHOULD] When there are multiple relations between the same models, specify `@relation("name")`.

**Self Relation**: [SHOULD] Self-referencing relations must specify `@relation("name")`.

### Enum

- [MUST] Use Prisma `enum`. Enforces value constraints at the schema level + auto-reflects as TypeScript types.
- [MUST] Enum values must be lowercase snake_case. Note: UPPER_SNAKE_CASE and PascalCase are prohibited.
- [MUST] Enums must be placed before model definitions.

### Index

- [MUST] `@@index()` on FK columns.
- [SHOULD] Composite index for column combinations frequently queried together: `@@index([userId, status])`.
- [SHOULD] Composite unique constraints use `@@unique()`. Composite keys can be used in `findUnique()`.

## Prisma Client Usage Patterns

### CRUD

- [MUST] `@id`/`@unique` fields → `findUnique` (DataLoader batching applied). Non-unique conditions → `findFirst`.
- [SHOULD] API responses: `findUnique` + null check + domain error. Internal logic: `findUniqueOrThrow`.
- [SHOULD] When creating related records together, use Nested Write (ensures atomicity via implicit transaction).
- [SHOULD] For bulk inserts, use `createMany` (leverage `skipDuplicates: true`). Nested Write is not supported.
- [MUST] If existence is certain → `update`. If existence is uncertain → `upsert`. Note: The find→branch pattern risks race conditions.

```typescript
// upsert example
await prisma.userProfile.upsert({
  where: { userId },
  update: { bio: newBio },
  create: { userId, bio: newBio },
});
```

### Filtering/Sorting

- [SHOULD] Composite filters: Explicitly use `AND`, `OR`, `NOT`. When the same field is listed multiple times, only the last value applies.
- [SHOULD] Relation filters: Use `some`, `every`, `none`.
- [SHOULD] For multi-column sorting, specify priority as an array. Sorting by relation `_count` is supported.

### Pagination

- [MAY] Offset-based: `skip`/`take` + `$transaction` to ensure count/findMany consistency.
- [SHOULD] For large datasets: Cursor-based. The cursor field should be `_no`(BigInt). Note: UUID cursors are unsuitable.

```typescript
const orders = await prisma.order.findMany({
  where: { userId, deletedAt: null },
  orderBy: { no: 'desc' },
  take: pageSize,
  ...(cursor !== null && { cursor: { no: cursor }, skip: 1 }),
});
```

### Transaction

- [SHOULD] Independent query batching: Sequential Transaction (array `$transaction`).
- [SHOULD] Queries with dependencies: Interactive Transaction (callback `$transaction`).
- [MUST] Inside Interactive Transaction: Use only the `tx` client. Using the global `prisma` is prohibited.
- [MUST NOT] `Promise.all` inside Interactive Transaction is prohibited (deadlock risk).
- [SHOULD] Explicitly set `maxWait`/`timeout` options (defaults: 2s/5s).
- [SHOULD] If Nested Write is sufficient, a separate `$transaction` is unnecessary.

### Soft Delete

- [SHOULD] Implement with `$extends` (Client Extensions). The deprecated `$use` middleware is prohibited.
  - `delete` → `update(deletedAt)`, `findMany`/`findFirst` → automatically add `deletedAt: null`.
  - Note: When delegating `findUnique` to `findFirst`, DataLoader batching does not apply.
- [MUST] Manage with `deletedAt DateTime?`. Using `deleted Boolean` is prohibited.

### Raw Query

- [MUST] Use `$queryRaw` with Tagged Template Literals (automatic parameterization, prevents SQL Injection).
- [MUST NOT] Using `$queryRawUnsafe` with user input is prohibited. For dynamic table names, etc., validate against an allowlist first.
- [SHOULD] Prefer the Prisma Client API. Raw Queries should only be used for GROUP BY+HAVING, window functions, CTEs, UNION, etc.

## Performance Optimization

- [MUST NOT] Fetching relations individually inside loops is prohibited (N+1 problem).
- [MUST] When relation data is needed, load it all at once with `include` or `select`.
- [SHOULD] Prisma 5.8+: Use `relationLoadStrategy: "join"` (single SQL JOIN, requires `previewFeatures = ["relationJoins"]`).
- [SHOULD] Use `select` to query only the needed fields. `select` and `include` cannot be used simultaneously.
- [MUST] Manage PrismaClient as a singleton. Creating `new PrismaClient()` per request is prohibited.
- [SHOULD] Set `connection_limit`/`pool_timeout` in `DATABASE_URL`.

## NestJS Integration

- [MUST] `PrismaService`: Extends `PrismaClient` + `OnModuleInit`(`$connect`) + `OnModuleDestroy`(`$disconnect`).
- [SHOULD] Logging: Development `['query','info','warn','error']`, Production `['error']`.
- [MUST] `PrismaModule`: Register as a `@Global()` global module.
- [MUST] Convert `PrismaClientKnownRequestError` → HTTP status codes in an Exception Filter.

| Prisma Error | Meaning | HTTP |
|------------|------|------|
| `P2002` | Unique constraint violation | 409 |
| `P2025` | Not found | 404 |
| `P2003` | FK constraint violation | 400 |
| `P2000` | Value out of range | 400 |

- [MUST] Call `app.enableShutdownHooks()` in `main.ts`.

## Anti-Patterns

- [MUST NOT] Creating `new PrismaClient()` per request is prohibited (connection exhaustion).
- [MUST NOT] N+1 queries inside loops are prohibited.
- [MUST NOT] `Promise.all` inside Interactive Transaction is prohibited.
- [MUST NOT] Using `tx` callback outside its scope, or using the global `prisma` inside the callback, is prohibited.
- [MUST NOT] Omitting FK `@@index` is prohibited.
- [MUST NOT] Directly inserting user input into `$queryRawUnsafe` is prohibited.
- [MUST NOT] Running `prisma migrate dev` in production is prohibited. Use only `prisma migrate deploy`.