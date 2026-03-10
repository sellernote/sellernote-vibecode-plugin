---
name: prisma-dev
description: Prisma development following Sellernote conventions. Use when creating, modifying, or reviewing Prisma schema models, migrations, relations, enums, PrismaService, PrismaClient usage patterns, database schema changes, or schema.prisma definitions. Triggers on tasks involving model definitions, @map/@@map annotations, prisma-case-format, Prisma relations (1:1 with @unique, 1:N with FK indexes, M:N explicit join models), @relation names, FK index definitions, Prisma enum definitions (lowercase snake_case), migration generation (prisma migrate dev) and deployment (prisma migrate deploy), NestJS PrismaService/PrismaModule setup, Client CRUD patterns (findUnique/findFirst/create/update/upsert), select/include optimization, $transaction usage, N+1 prevention, PrismaExceptionFilter error handling (P2002/P2025/P2003/P2000), Decimal handling with Prisma.Decimal, soft delete with $extends Client Extensions, cursor-based pagination with _no, raw queries with $queryRaw, or relationLoadStrategy "join". Also use when asked to add a new database table, modify schema models, create migration files, set up Prisma module configuration, or apply Sellernote database/Prisma architecture conventions.
---

# Prisma Dev

Develop Prisma schema models, migrations, and client usage patterns following Sellernote conventions.

## Convention Loading

Before starting any work, read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/PRISMA_CONVENTION.md` - Schema model, relation, migration, transaction, client usage rules
   - `references/DATABASE_CONVENTION.md` - Common fields, naming, ID strategy, migration principles

2. **Read when relevant**:
   - `references/MYSQL_CONVENTION.md` - MySQL-specific types, ENUM prohibition, DECIMAL precision, timezone, COMMENT, index, query optimization
   - `references/REDIS_CONVENTION.md` - When caching strategy involves Redis alongside DB
   - `references/COMMON_CONVENTION.md` - When unsure about naming, git conventions, error codes, logging
   - `references/TYPESCRIPT_CONVENTION.md` - When unsure about TS style, imports, types, enum vs union

## Workflow

Follow these steps sequentially. Skip a step only when it does not apply to the task.

### Step 1: Explore Existing Code

1. Identify the target feature module under `src/modules/`
2. Find `prisma/schema.prisma` at the project root
3. Locate `PrismaService` (typically in `src/prisma/prisma.service.ts`)
4. Check for `.prisma-case-format` config in the `prisma/` directory
5. Review existing models in `schema.prisma` for established patterns

### Step 2: Define Schema Model

Place model definitions in `prisma/schema.prisma`. Organize blocks in order: `generator` -> `datasource` -> `enum` -> `model`.

Key requirements (Sellernote-specific):

- Include common fields (`id`, `no`, `createdAt`, `updatedAt`, `deletedAt`) in every model — Prisma has no model inheritance, so repeat them
- `@id @default(uuid()) @db.Char(36)` for `id`
- `@unique @default(autoincrement()) @map("_no")` for `no` (BigInt)
- `@db.*` native type annotation on every field for explicit database type mapping. `BigInt` is the only exception
- `@@map("table_name")` with explicit snake_case singular table name on every model
- `@map("column_name")` with explicit snake_case column name on mapped fields
- Model names: PascalCase singular. Field names: camelCase
- Nullable fields: use `?` suffix (e.g., `DateTime?`)
- Run `prisma-case-format` after schema changes
- For 30+ models, consider splitting with Prisma 5.15+ `prismaSchemaFolder`

### Step 3: Define Relations

**1:1 relation** — `@unique` on FK column:
```prisma
model User {
  id      String   @id @default(uuid()) @db.Char(36)
  profile Profile?
  @@map("user")
}

model Profile {
  id     String @id @default(uuid()) @db.Char(36)
  userId String @unique @map("user_id") @db.Char(36)
  user   User   @relation(fields: [userId], references: [id])
  @@map("profile")
}
```

**1:N relation** — FK column + `@@index`:
```prisma
model Order {
  id     String      @id @default(uuid()) @db.Char(36)
  userId String      @map("user_id") @db.Char(36)
  user   User        @relation(fields: [userId], references: [id])
  items  OrderItem[]

  @@index([userId])
  @@map("order")
}
```

**M:N relation** — explicit join model (implicit `@relation` M:N is prohibited):
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

Additional rules:
- `@@index()` required on every FK column — Prisma does NOT auto-create FK indexes
- FK field naming: `{relatedModelName}Id` (camelCase) + `@map("snake_case")`
- `@relation("name")` required when multiple relations or self-relations exist between the same models
- See `references/PRISMA_CONVENTION.md` > "Relation Definition" and "Index" sections for full details

### Step 4: Define Enums & Indexes

**Enum definition** — lowercase snake_case values, placed before models:
```prisma
enum order_status {
  pending
  confirmed
  shipped
  delivered
  cancelled
}
```
Note: MySQL ENUM type is prohibited. Use Prisma `enum` which maps to VARCHAR and provides TypeScript type safety.

**Index definitions**:
- `@@index()` on every FK column
- `@@unique()` for composite unique constraints — enables `findUnique()` with composite keys
- Composite indexes for frequently co-queried columns: `@@index([userId, status])`
- Index naming: `idx_{table}_{columns}` for indexes, `uq_{table}_{columns}` for unique constraints

### Step 5: Generate & Migrate

```bash
# Format schema with prisma-case-format then Prisma formatter
npx prisma-case-format --file prisma/schema.prisma && npx prisma format

# Generate Prisma Client from schema
npx prisma generate

# Create migration (development only)
npx prisma migrate dev --name descriptive_name

# Apply migration (production)
npx prisma migrate deploy
```

Rules:
- Review generated SQL in `prisma/migrations/{timestamp}_{name}/migration.sql` before applying
- Never use `prisma migrate dev` in production — only `prisma migrate deploy`
- Never use `db push` in production
- Zero-downtime schema changes: (1) add nullable/defaulted column -> (2) deploy code -> (3) batch-migrate data -> (4) add NOT NULL if needed -> (5) remove old column separately
- See `references/PRISMA_CONVENTION.md` > "Migration" section and `references/DATABASE_CONVENTION.md` > "Zero-Downtime Schema Changes"

### Step 6: Verify Client Usage

**CRUD patterns**:
- `findUnique` for PK/unique lookups (DataLoader batching applied). `findFirst` only for non-unique conditions
- API responses: `findUnique` + null check + domain error. Internal logic: `findUniqueOrThrow`
- Existence certain -> `update`. Existence uncertain -> `upsert`. The find-then-branch pattern risks race conditions
- Use Nested Write for creating related records together (implicit transaction, atomic)
- Use `createMany` with `skipDuplicates: true` for bulk inserts

**Select/Include optimization**:
- Always use `select` or `include` to fetch only needed fields/relations — never load everything
- `select` and `include` cannot be used simultaneously
- Prisma 5.8+: use `relationLoadStrategy: "join"` for single SQL JOIN (requires `previewFeatures = ["relationJoins"]`)

**N+1 prevention**:
- Use `include` for relation loading instead of loop queries

**Filtering/Sorting**:
- Composite filters: use `AND`, `OR`, `NOT` explicitly (same field listed multiple times: only last value applies)
- Relation filters: use `some`, `every`, `none`

**No business logic in query code** — no domain branching, HttpExceptions, or business rules in raw Prisma query code

## Sellernote-Specific Patterns

These are non-standard patterns specific to Sellernote. Standard Prisma patterns are in the reference files.

### Common Fields (No Model Inheritance)

Prisma does not support abstract models or inheritance. Every model must repeat the common fields block:

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

Copy this block exactly into every new model. The `// --- Common Fields ---` and `// --- Domain Fields ---` comment markers are required for readability. Place common fields at the top, domain fields at the bottom.

### ID Strategy

- PK: `id` stores UUID v4 in `CHAR(36)`. Auto-increment PK is prohibited
- `_no`: BigInt auto-increment with UNIQUE KEY index — used for internal sorting and cursor-based pagination
- Never expose `_no` in external API responses. Always use `id` (UUID) for external interfaces

### prisma-case-format Automation

Always run `prisma-case-format` after editing `schema.prisma` to ensure consistent `@map`/`@@map` annotations:

```bash
npx prisma-case-format --file prisma/schema.prisma && npx prisma format
```

The `.prisma-case-format` config file in the `prisma/` directory controls mapping rules:
```yaml
table: pascal
mapTable: snake,singular
field: camel
mapField: snake
enum: pascal
mapEnum: snake
```
Check this config before first use.

### Cursor-Based Pagination

Use `_no` (BigInt) as the cursor field for large dataset pagination. UUID cursors are unsuitable for ordering:

```typescript
const orders = await prisma.order.findMany({
  where: { userId, deletedAt: null },
  orderBy: { no: 'desc' },
  take: pageSize,
  ...(cursor !== null && { cursor: { no: cursor }, skip: 1 }),
});
```

### Soft Delete with $extends

Implement soft delete using `$extends` (Client Extensions). The deprecated `$use` middleware is prohibited:
- `delete` -> `update(deletedAt)`, `findMany`/`findFirst` -> auto-adds `deletedAt: null`
- Note: delegating `findUnique` to `findFirst` disables DataLoader batching
- Manage with `deletedAt DateTime?`. Using `deleted Boolean` is prohibited

### Decimal Handling (Prisma.Decimal)

Prisma returns `Decimal` fields as `Prisma.Decimal` objects (not plain numbers). Handle conversion explicitly:

```typescript
// Reading: convert Prisma.Decimal to number
const amount = order.totalAmount.toNumber();

// Or use Decimal methods: .mul(), .plus(), .toString()
const formatted = order.totalAmount.toString();

// Writing: Prisma accepts number or Prisma.Decimal
await prisma.order.create({
  data: { totalAmount: 15000.50 },
});
```

Never assume decimal fields are plain `number` type in TypeScript.

### $transaction Patterns

**Sequential (array)** — for independent operations:
```typescript
const [order, log] = await this.prisma.$transaction([
  this.prisma.order.create({ data: orderData }),
  this.prisma.auditLog.create({ data: logData }),
]);
```

**Interactive (callback)** — for dependent operations:
```typescript
const result = await this.prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.orderItem.createMany({
    data: items.map((item) => ({ orderId: order.id, ...item })),
  });
  return order;
});
```

Rules:
- Use interactive `$transaction` when later operations depend on earlier results
- Inside interactive transactions: only use the `tx` client. Using global `prisma` is prohibited
- `Promise.all` inside interactive transactions is prohibited (deadlock risk)
- Explicitly set `maxWait`/`timeout` options (defaults: 2s/5s)
- If Nested Write is sufficient, a separate `$transaction` is unnecessary

### Raw Query

- Use `$queryRaw` with tagged template literals (automatic parameterization, prevents SQL injection)
- `$queryRawUnsafe` with user input is prohibited. For dynamic table names, validate against an allowlist
- Prefer Prisma Client API. Raw queries only for GROUP BY+HAVING, window functions, CTEs, UNIONs

### NestJS PrismaService

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    super({
      log: isProduction ? ['error'] : ['query', 'info', 'warn', 'error'],
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

Extend `PrismaClient` directly. Implement `OnModuleInit` and `OnModuleDestroy` for proper lifecycle management.

### NestJS PrismaModule (@Global)

```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

`@Global()` ensures `PrismaService` is available across all modules without explicit imports.

### PrismaExceptionFilter

Map Prisma error codes to HTTP status codes:

| Prisma Error | Meaning | HTTP |
|---|---|---|
| `P2002` | Unique constraint violation | 409 Conflict |
| `P2025` | Record not found | 404 Not Found |
| `P2003` | Foreign key constraint violation | 400 Bad Request |
| `P2000` | Value too long | 400 Bad Request |

Call `app.enableShutdownHooks()` in `main.ts` to ensure proper Prisma lifecycle management.

See `references/PRISMA_CONVENTION.md` > "NestJS Integration" for the full filter implementation.

### Performance Checklist

- Manage PrismaClient as a singleton. Creating `new PrismaClient()` per request is prohibited
- Set `connection_limit`/`pool_timeout` in `DATABASE_URL`
- Use `select` to query only required fields
- Use `relationLoadStrategy: "join"` (Prisma 5.8+) for single SQL JOIN
- Never query relations individually inside loops (N+1)

### MySQL Field COMMENT

When writing raw migration SQL or reviewing generated migrations, all MySQL fields must have a COMMENT describing the field's purpose and constraints. See `references/MYSQL_CONVENTION.md` > "Field COMMENT".

## Field Type Reference

| Prisma Type | `@db.*` | MySQL Type | Purpose |
|---|---|---|---|
| `String` | `@db.Char(36)` | CHAR(36) | UUID |
| `String` | `@db.VarChar(n)` | VARCHAR(n) | Variable-length string |
| `String` | `@db.Text` | TEXT | Long text |
| `Int` | `@db.Int` | INT | Integer |
| `BigInt` | _(none needed)_ | BIGINT | Sequential identifier (`_no`) |
| `Decimal` | `@db.Decimal(p, s)` | DECIMAL(p, s) | Monetary values (default: 15,2; GAAP: 15,4) |
| `Boolean` | `@db.TinyInt` | TINYINT(1) | Boolean |
| `DateTime` | `@db.DateTime(0)` | DATETIME | Date/Time (never use TIMESTAMP) |
| `Json` | `@db.Json` | JSON | Unstructured data only |

## File Structure

```
prisma/
  schema.prisma                            # All model/enum/relation definitions
  migrations/
    {timestamp}_{name}/
      migration.sql                        # Auto-generated migration SQL
  .prisma-case-format                      # prisma-case-format config

src/
  prisma/
    prisma.service.ts                      # PrismaService (extends PrismaClient)
    prisma.module.ts                       # PrismaModule (@Global)
    prisma-exception.filter.ts             # PrismaExceptionFilter
  modules/{feature}/
    dto/                                   # Request/Response DTOs
    mappers/                               # Entity <-> DTO mappers
    {feature}.module.ts
    {feature}.controller.ts
    {feature}.service.ts
```

## Anti-Patterns

- Creating `new PrismaClient()` per request (connection exhaustion)
- N+1 queries inside loops
- `Promise.all` inside interactive transactions (deadlock)
- Using `tx` callback externally or global `prisma` inside callback
- Omitting `@@index` on FK columns
- Directly inserting user input into `$queryRawUnsafe`
- Running `prisma migrate dev` in production (use only `prisma migrate deploy`)
- Implicit M:N relations (use explicit join models)
- Using MySQL ENUM type (use Prisma enum instead)
- Using TIMESTAMP for date/time (use DATETIME)
- `SELECT *` or loading all fields without `select`/`include`

## Cross-Skill References

- **API/Service/Controller work**: Use the `nestjs-api-dev` skill for DTOs, Controllers, Services, Mappers, and NestJS module wiring
