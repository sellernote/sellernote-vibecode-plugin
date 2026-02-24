---
name: prisma-dev
description: Prisma development following Sellernote conventions. Use when creating, modifying, or reviewing Prisma schema models, migrations, relations, enums, PrismaService, PrismaClient usage patterns, database schema changes, or schema.prisma definitions. Triggers on tasks involving model definitions, @map/@@map annotations, prisma-case-format, Prisma relations (1:1 with @unique, 1:N with FK indexes, M:N explicit join models), @relation names, FK index definitions, Prisma enum definitions (lowercase snake_case), migration generation (prisma migrate dev) and deployment (prisma migrate deploy), NestJS PrismaService/PrismaModule setup, Client CRUD patterns (findUnique/findMany/create/update/upsert), select/include optimization, $transaction usage, N+1 prevention, PrismaExceptionFilter error handling (P2002/P2025/P2003/P2000), or Decimal handling with Prisma.Decimal. Also use when asked to add a new database table, modify schema models, create migration files, set up Prisma module configuration, or apply Sellernote database/Prisma architecture conventions.
---

# Prisma Dev

Develop Prisma schema models, migrations, and client usage patterns following Sellernote conventions.

## Convention Loading

Before starting any work, Read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/PRISMA_CONVENTION.md` - Schema model, Relation, Migration, Transaction, Client usage rules
   - `references/DATABASE_CONVENTION.md` - Common fields, naming, ID strategy, migration principles

2. **Read when relevant**:
   - `references/MYSQL_CONVENTION.md` - MySQL-specific types, ENUM prohibition, DECIMAL, timezone, index
   - `references/REDIS_CONVENTION.md` - When caching strategy involves Redis alongside DB
   - `references/COMMON_CONVENTION.md` - When unsure about naming, git conventions, error codes
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

Place model definitions in `prisma/schema.prisma`. Key requirements (Sellernote-specific):

- [MUST] Include 공통 필드 (`id`, `no`, `createdAt`, `updatedAt`, `deletedAt`) -- Prisma has no model inheritance, so repeat in every model
- [MUST] `@id @default(uuid()) @db.Char(36)` for `id`
- [MUST] `@unique @default(autoincrement()) @map("_no")` for `no` (BigInt)
- [MUST] `@db.*` type annotation on every field for explicit database type mapping
- [MUST] `@@map("table_name")` with explicit snake_case table name on every model
- [MUST] `@map("column_name")` with explicit snake_case column name on mapped fields
- [MUST] Nullable fields: use `?` suffix (e.g., `DateTime?`)
- [MUST] Run `prisma-case-format` after schema changes

### Step 3: Define Relations

Key Sellernote-specific relation rules:

**1:1 relation -- `@unique` on FK column**:
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

**1:N relation -- FK column + `@@index`**:
```prisma
model Order {
  id     String      @id @default(uuid()) @db.Char(36)
  userId String      @map("user_id") @db.Char(36)
  user   User        @relation(fields: [userId], references: [id])
  items  OrderItem[]

  @@index([userId], map: "idx_order_user_id")
  @@map("order")
}
```

**M:N relation -- explicit join model (no implicit `@relation` M:N)**:
```prisma
model PostTag {
  postId String @map("post_id") @db.Char(36)
  tagId  String @map("tag_id") @db.Char(36)
  post   Post   @relation(fields: [postId], references: [id])
  tag    Tag    @relation(fields: [tagId], references: [id])

  @@id([postId, tagId])
  @@index([tagId], map: "idx_post_tag_tag_id")
  @@map("post_tag")
}
```

Additional rules: No implicit M:N, `@@index` with explicit `map` name (`idx_{table}_{columns}`) on every FK column, `@relation` name required when multiple relations exist between two models.
See `references/PRISMA_CONVENTION.md` > "Relation" and "Index" sections for full details.

### Step 4: Define Enums & Indexes

**Enum definition** -- lowercase snake_case values:
```prisma
enum order_status {
  pending
  confirmed
  shipped
  delivered
  cancelled
}
```

**Index definitions**:
- [MUST] `@@index` on every FK column with `map: "idx_{table}_{columns}"`
- [MUST] `@@unique` for composite unique constraints with `map: "uq_{table}_{columns}"`
- [MUST NOT] Omit FK indexes -- Prisma does NOT auto-create them (unlike some ORMs)

### Step 5: Generate & Migrate

```bash
# Format schema with prisma-case-format then Prisma formatter
npx prisma-case-format --file prisma/schema.prisma && npx prisma format

# Generate Prisma Client from schema
npx prisma generate

# Create migration (development)
npx prisma migrate dev --name descriptive_name

# Apply migration (production)
npx prisma migrate deploy
```

Rules: Migration SQL files are auto-generated. Review the generated SQL in `prisma/migrations/{timestamp}_{name}/migration.sql` before applying. No `db push` in production.
See `references/PRISMA_CONVENTION.md` > "Migration" section for full details.

### Step 6: Verify Client Usage

- [MUST] `findUnique` for PK/unique lookups, `findFirst` only when filtering by non-unique fields
- [MUST] `select` or `include` to fetch only needed fields/relations -- never load everything
- [MUST] `$transaction` for multi-step writes (sequential array or interactive callback)
- [MUST] Prevent N+1: use `include` for relation loading instead of loop queries
- [MUST NOT] Business logic, domain branching, or HttpExceptions in raw Prisma query code

## Sellernote-Specific Patterns

These are non-standard patterns specific to Sellernote. Standard Prisma patterns are in the reference files.

### 공통 필드 반복 정의 (No Model Inheritance)

Prisma does not support abstract models or inheritance. Every model MUST repeat the 공통 필드 block:

```prisma
model Order {
  // --- 공통 필드 ---
  id        String    @id @default(uuid()) @db.Char(36)
  no        BigInt    @unique @default(autoincrement()) @map("_no")
  createdAt DateTime  @default(now()) @map("created_at") @db.DateTime(0)
  updatedAt DateTime  @updatedAt @map("updated_at") @db.DateTime(0)
  deletedAt DateTime? @map("deleted_at") @db.DateTime(0)

  // --- 도메인 필드 ---

  @@map("order")
}
```

Copy this block exactly into every new model. The `// --- 공통 필드 ---` and `// --- 도메인 필드 ---` comment markers are required for readability.

### prisma-case-format 자동화

Always run `prisma-case-format` after editing `schema.prisma` to ensure consistent `@map`/`@@map` annotations:

```bash
npx prisma-case-format --file prisma/schema.prisma && npx prisma format
```

The `.prisma-case-format` config file in the `prisma/` directory controls mapping rules. Check it before first use.

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

MUST extend `PrismaClient` directly. MUST implement `OnModuleInit` and `OnModuleDestroy` for proper lifecycle management.

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

Maps Prisma error codes to HTTP status codes:
- `P2002` (Unique constraint violation) -> `409 Conflict`
- `P2025` (Record not found) -> `404 Not Found`
- `P2003` (Foreign key constraint violation) -> `400 Bad Request`
- `P2000` (Value too long) -> `400 Bad Request`

See `references/PRISMA_CONVENTION.md` > "Error Handling" for the full filter implementation.

### Decimal Handling (Prisma.Decimal)

Prisma returns `Decimal` fields as `Prisma.Decimal` objects (not strings like TypeORM). Handle conversion explicitly:

```typescript
// Reading: convert Prisma.Decimal to number
const amount = order.totalAmount.toNumber();

// Writing: Prisma accepts number or Prisma.Decimal
await prisma.order.create({
  data: { totalAmount: 15000.50 },
});
```

MUST NOT assume decimal fields are plain `number` type in TypeScript. Use `.toNumber()` for arithmetic or `.toString()` for display.

### $transaction Patterns

**Sequential (array) -- for independent operations**:
```typescript
const [order, log] = await this.prisma.$transaction([
  this.prisma.order.create({ data: orderData }),
  this.prisma.auditLog.create({ data: logData }),
]);
```

**Interactive (callback) -- for dependent operations**:
```typescript
const result = await this.prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.orderItem.createMany({
    data: items.map((item) => ({ orderId: order.id, ...item })),
  });
  return order;
});
```

MUST use interactive `$transaction` when later operations depend on earlier results.

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

## Cross-Skill References

- **API/Service/Controller work**: Use the `nestjs-api-dev` skill for DTOs, Controllers, Services, Mappers, and NestJS module wiring
