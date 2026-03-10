---
name: typeorm-dev
description: TypeORM development following Sellernote conventions. Use when creating, modifying, or reviewing TypeORM entities, migrations, relations, repositories, custom transformers, or database schema changes. Triggers on tasks involving Entity definitions, BaseEntity inheritance, SnakeNamingStrategy, column types, Relation type wrappers, DecimalTransformer, ManyToOne/OneToMany/ManyToMany relations, FK columns, JoinColumn/JoinTable, TypeORM migration generation and execution, Domain Model Interfaces (IXxxModel/IXxxModelRelation), Enum handling as VARCHAR with PascalCase keys, soft delete, index definitions, Transactional decorator usage, typeorm-transactional setup, QueryBuilder patterns, NestJS TypeOrmModule integration, or cursor-based pagination. Also use when asked to add a new database table, modify entity fields, create migration files, set up TypeORM DataSource configuration, or apply Sellernote database/TypeORM architecture conventions.
---

# TypeORM Dev

Develop TypeORM entities, migrations, and repository patterns following Sellernote conventions.

## Convention Loading

Before starting any work, Read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/TYPEORM_CONVENTION.md` — Entity, Relation, Migration, Transaction, Repository rules
   - `references/DATABASE_CONVENTION.md` — Common fields, naming, ID strategy, migration principles

2. **Read when relevant**:
   - `references/MYSQL_CONVENTION.md` — MySQL-specific types, ENUM prohibition, DECIMAL precision, timezone, field COMMENT, index, query optimization
   - `references/REDIS_CONVENTION.md` — When caching strategy involves Redis alongside DB
   - `references/COMMON_CONVENTION.md` — When unsure about naming, git conventions, error codes, domain glossary
   - `references/TYPESCRIPT_CONVENTION.md` — When unsure about TS style, imports, types, enum/union/as-const naming

## Workflow

Follow these steps sequentially. Skip a step only when it does not apply to the task.

### Step 1: Explore Existing Code

1. Identify the target feature module under `src/modules/`
2. Find the existing `BaseEntity` abstract class (typically in a shared/common module)
3. Locate `DecimalTransformer` if it exists; if not, create it in `common/transformers/`
4. Check `data-source.ts` at project root for DataSource configuration and confirm `SnakeNamingStrategy` is applied

### Step 2: Define Domain Model Interface

Create `modules/{feature}/interfaces/{feature}.model.interface.ts`:
- [MUST] Include only data fields owned by this model (no relation fields)
- [MUST] Include `id`, `_no`, `createdAt`, `updatedAt`, `deletedAt` from BaseEntity

Create a separate `I{Feature}ModelRelation` interface in `{feature}-model-relation.interface.ts` for relation fields using `Relation<>` wrappers.

```typescript
// modules/order/interfaces/order.model.interface.ts
export interface IOrderModel {
  id: string; _no: number; orderNumber: string;
  totalAmount: number; status: string; userId: string;
  createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}

// modules/order/interfaces/order-model-relation.interface.ts
export interface IOrderModelRelation {
  user: Relation<User>;
  items: Relation<OrderItem[]>;
}
```

See `references/TYPEORM_CONVENTION.md` > "Domain Model Interface Pattern" for full details.

### Step 3: Create Entity

Place in `modules/{feature}/entities/{feature}.entity.ts`. One Entity per file.

Key Sellernote-specific requirements:
- [MUST] Extend custom `BaseEntity` (NOT TypeORM's built-in `BaseEntity`)
- [MUST] `implements IXxxModel, IXxxModelRelation`
- [MUST] `@Entity()` without hardcoded table name — `SnakeNamingStrategy` auto-converts class name
- [MUST] `@Column()` with explicit database type on every column
- [MUST] Nullable columns: `nullable: true` + `| null` in TS type
- [SHOULD] Sensitive columns (e.g., passwords): use `select: false`

```typescript
@Entity() // SnakeNamingStrategy converts OrderItem → order_item
export class Order extends BaseEntity implements IOrderModel, IOrderModelRelation {
  @Column({ type: 'varchar', length: 100 })
  orderNumber: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, transformer: new DecimalTransformer() })
  totalAmount: number;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.Pending })
  status: OrderStatus;

  @Column({ type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn() // SnakeNamingStrategy converts userId → user_id
  user: Relation<User>;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: Relation<OrderItem[]>;
}
```

### Step 4: Define Relations

**`Relation<>` wrapper is mandatory** — prevents circular dependency issues:
```typescript
user: Relation<User>;           // NOT: user: User
items: Relation<OrderItem[]>;   // NOT: items: OrderItem[]
```

**Explicit FK columns alongside relations** — enables FK access without loading relation:
```typescript
@Column({ type: 'char', length: 36 })
userId: string;                          // Explicit FK column

@ManyToOne(() => User, (user) => user.orders)
@JoinColumn()                            // Do NOT hardcode name — SnakeNamingStrategy handles it
user: Relation<User>;
```

**ManyToMany — explicit @JoinTable names** (SnakeNamingStrategy does NOT auto-name join tables):
```typescript
@JoinTable({
  name: 'post_tag',
  joinColumn: { name: 'post_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
})
tags: Relation<Tag[]>;
```

Additional rules:
- [MUST NOT] `eager: true` on any relation
- [SHOULD] Explicitly specify `onDelete` option
- [MUST] `@Index()` with explicit name (`idx_{table}_{columns}`)
- [SHOULD] Unique constraint via `@Index('uq_{table}_{col}', ['col'], { unique: true })`

See `references/TYPEORM_CONVENTION.md` > "Relation Definition" and "Index" sections for full details.

### Step 5: Generate Migration

```bash
# Generate from Entity changes
npx typeorm migration:generate -d ./data-source.ts src/migrations/DescriptiveName

# Manual migration (if needed)
npx typeorm migration:create src/migrations/DescriptiveName

# Run migration
npx typeorm migration:run -d ./data-source.ts

# Rollback the last migration
npx typeorm migration:revert -d ./data-source.ts
```

Rules:
- [MUST] Both `up()` and `down()` required
- [MUST] File names: timestamp + meaningful description (e.g., `1706000000000-CreateOrderTable.ts`)
- [MUST NOT] `synchronize: true` in production
- [MUST] Zero-downtime schema changes in production (add nullable/defaulted column first, deploy, migrate data, then constrain)

See `references/TYPEORM_CONVENTION.md` > "Migration Management" and `references/DATABASE_CONVENTION.md` > "Zero-Downtime Schema Changes" for full details.

### Step 6: Verify Repository Usage

- [MUST] Repository API (`find`, `findOne`, `save`) for simple CRUD
- [MUST] QueryBuilder only for complex queries (GROUP BY, aggregates, subqueries, bulk UPDATE/DELETE)
- [MUST] Parameterized queries (`:paramName` syntax) — no string interpolation
- [MUST NOT] Business logic, domain branching, or HttpExceptions in Repository
- [SHOULD] `findOne` + null check over `findOneOrFail` (to provide business-context errors)
- [MUST] Explicitly specify `relations`, `select`, `order`, `take` in find options

Custom repository method naming:

| Action | Pattern | Example |
|--------|---------|---------|
| Single record | `findOneBy[Condition]` | `findOneByEmail(email)` |
| List | `findBy[Condition]` | `findByUserId(userId)` |
| Existence check | `existsBy[Condition]` | `existsByEmail(email)` |
| Count | `countBy[Condition]` | `countByStatus(status)` |

## Sellernote-Specific Patterns

These are non-standard patterns specific to Sellernote. Standard TypeORM patterns are in the reference files.

### SnakeNamingStrategy (Required)

[MUST] Apply `SnakeNamingStrategy` from `typeorm-naming-strategies` in DataSource config. This auto-converts:
- Class names → table names: `OrderItem` → `order_item`
- Property names → column names: `orderNumber` → `order_number`

```typescript
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        namingStrategy: new SnakeNamingStrategy(),
        timezone: '+00:00',
        // ... other config from ConfigService
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

Consequences:
- [MUST] Do NOT hardcode table names in `@Entity()`
- [MUST] Do NOT hardcode FK column names in `@JoinColumn()`
- Exception: `@JoinTable()` for ManyToMany MUST explicitly specify names

### Custom BaseEntity (not TypeORM's built-in)

Every Entity MUST extend the custom `BaseEntity` providing: `id` (UUID PK), `_no` (BIGINT AUTO_INCREMENT UNIQUE), `createdAt`, `updatedAt`, `deletedAt`.

```typescript
// common/entities/base.entity.ts
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  _no: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'datetime', nullable: true })
  deletedAt: Date | null;
}
```

[MUST NOT] Import `BaseEntity` from `typeorm` (Active Record pattern is forbidden).

### DecimalTransformer

All decimal/money columns MUST use `DecimalTransformer` to convert MySQL's string return to `number`. Without it, `order.totalAmount + 1000` becomes `"15000.001000"` (string concatenation).

```typescript
// common/transformers/decimal.transformer.ts
export class DecimalTransformer implements ValueTransformer {
  to(value: number | null | undefined) { return value; }
  from(value: string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    return parseFloat(value);
  }
}

// Usage in Entity
@Column({ type: 'decimal', precision: 15, scale: 2, transformer: new DecimalTransformer() })
totalAmount: number;
```

Default precision: `DECIMAL(15, 2)`. Use `DECIMAL(15, 4)` when GAAP compliance is required.

### Enum as VARCHAR (not MySQL ENUM)

Store enum values as `VARCHAR`, never `type: 'enum'` (MySQL ENUM requires ALTER TABLE to add values).

Enum naming convention — PascalCase keys, lowercase snake_case values:
```typescript
// enums/order-status.enum.ts
export enum OrderStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Shipped = 'shipped',
}

@Column({ type: 'varchar', length: 20, default: OrderStatus.Pending })
status: OrderStatus;
```

[MUST NOT] Use numeric-based Enums or untyped strings. Define enums in separate files (`enums/` directory).

### Transaction: @Transactional() Only

Use `@Transactional()` from `typeorm-transactional`. [MUST NOT] use QueryRunner-based manual transactions.

```typescript
import { Transactional } from 'typeorm-transactional';

@Transactional()
async createOrder(dto: CreateOrderDto): Promise<Order> {
  const order = this.orderRepository.create({ userId: dto.userId, totalAmount: dto.totalAmount });
  const savedOrder = await this.orderRepository.save(order);
  const items = dto.items.map((item) =>
    this.orderItemRepository.create({ orderId: savedOrder.id, ...item }),
  );
  await this.orderItemRepository.save(items);
  return savedOrder;
}
```

Setup requirements:
- [MUST] Call `initializeTransactionalContext({ storageDriver: StorageDriver.AUTO })` in `main.ts` **before** NestJS initialization
- [MUST] Wrap with `addTransactionalDataSource()` in `dataSourceFactory`
- [MUST] Manage transactions at the Service layer only (not Controller/Repository)

Propagation options: `REQUIRED` (default, joins existing), `REQUIRES_NEW` (always new), `MANDATORY` (requires existing).

See `references/TYPEORM_CONVENTION.md` > "Transaction Management" for full setup examples.

### Soft Delete

- [MUST] Use `softDelete()` / `softRemove()`. Never `delete()` / `remove()` (hard delete).
- `@DeleteDateColumn()` automatically applies `WHERE deleted_at IS NULL`. Use `withDeleted: true` to include deleted records.

### NestJS Integration

- [MUST] `TypeOrmModule.forRootAsync()` + `ConfigService` for environment variable-based configuration
- [MUST] Register `TypeOrmModule.forFeature([Entity])` in feature modules
- [MUST] Repository injection via `@InjectRepository(Entity)` in constructor
- [MUST] When DataSource is needed, inject it via NestJS DI

### Performance

- [MUST NOT] Load relations individually inside loops (N+1). Use `relations` option or `leftJoinAndSelect`.
- [MUST] Apply `take`/`skip` pagination for list queries.
- [SHOULD] Use `findAndCount` to retrieve data and count in a single query.
- [SHOULD] Prefer cursor-based (keyset) pagination for large datasets over OFFSET-based.

```typescript
const [items, totalItems] = await this.orderRepository.findAndCount({
  where: { userId },
  order: { createdAt: 'DESC' },
  take: size,
  skip: (page - 1) * size,
});
```

## File Structure

```
src/
  common/
    entities/base.entity.ts              # Custom BaseEntity
    transformers/decimal.transformer.ts   # DecimalTransformer
  modules/{feature}/
    interfaces/
      {feature}.model.interface.ts       # IXxxModel (data fields only)
      {feature}-model-relation.interface.ts  # IXxxModelRelation
    entities/{feature}.entity.ts         # Entity class
    enums/{feature}-status.enum.ts       # String-based enums (PascalCase keys)
  migrations/
    {timestamp}-{DescriptiveName}.ts
data-source.ts                           # CLI DataSource config (project root)
```

## Cross-Skill References

- **API/Service/Controller work**: Use the `nestjs-api-dev` skill for DTOs, Controllers, Services, Mappers, and NestJS module wiring
