---
name: typeorm-dev
description: TypeORM development following Sellernote conventions. Use when creating, modifying, or reviewing TypeORM entities, migrations, relations, repositories, custom transformers, or database schema changes. Triggers on tasks involving Entity definitions, BaseEntity inheritance, column types, Relation type wrappers, DecimalTransformer, ManyToOne/OneToMany/ManyToMany relations, FK columns, JoinColumn/JoinTable, TypeORM migration generation and execution, Domain Model Interfaces (IXxxModel), Enum handling as VARCHAR, soft delete, index definitions, Transactional decorator usage, typeorm-transactional setup, or QueryBuilder patterns. Also use when asked to add a new database table, modify entity fields, create migration files, set up TypeORM module configuration, or apply Sellernote database/TypeORM architecture conventions.
---

# TypeORM Dev

Develop TypeORM entities, migrations, and repository patterns following Sellernote conventions.

## Convention Loading

Before starting any work, Read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/TYPEORM_CONVENTION.md` - Entity, Relation, Migration, Transaction, Repository rules
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
2. Find the existing `BaseEntity` abstract class (typically in a shared/common module)
3. Locate `DecimalTransformer` if it exists; if not, create it in `common/transformers/`
4. Check `data-source.ts` at project root for migration and entity configuration

### Step 2: Define Domain Model Interface

Create `modules/{feature}/interfaces/{feature}.model.interface.ts`:
- [MUST] Include only data fields owned by this model (no relation fields)
- [MUST] Include `id`, `_no`, `createdAt`, `updatedAt`, `deletedAt` from BaseEntity

If relations need typing, create a separate `I{Feature}ModelRelation` interface in `{feature}-model-relation.interface.ts` using `Relation<>` wrappers.

See `references/TYPEORM_CONVENTION.md` > "Domain Model Interface" for full examples.

### Step 3: Create Entity

Place in `modules/{feature}/entities/{feature}.entity.ts`. One Entity per file.

Key requirements (Sellernote-specific):
- [MUST] Extend custom `BaseEntity` (NOT TypeORM's built-in `BaseEntity`)
- [MUST] `implements IXxxModel, IXxxModelRelation`
- [MUST] `@Entity('table_name')` with explicit snake_case table name
- [MUST] `@Column()` with explicit database type on every column
- [MUST] Nullable columns: `nullable: true` + `| null` in TS type

### Step 4: Define Relations

Key Sellernote-specific relation rules:

**`Relation<>` wrapper is mandatory** -- prevents circular dependency issues:
```typescript
// Every relation property must use Relation<> wrapper
user: Relation<User>;           // NOT: user: User
items: Relation<OrderItem[]>;   // NOT: items: OrderItem[]
```

**Explicit FK columns alongside relations** -- enables FK access without loading relation:
```typescript
@Column({ type: 'char', length: 36 })
userId: string;                          // Explicit FK column

@ManyToOne(() => User, (user) => user.orders)
@JoinColumn({ name: 'user_id' })        // Explicit column name
user: Relation<User>;
```

**ManyToMany -- explicit @JoinTable names**:
```typescript
@JoinTable({
  name: 'post_tag',
  joinColumn: { name: 'post_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
})
tags: Relation<Tag[]>;
```

Additional rules: No `eager: true`, `@Index()` with explicit name (`idx_{table}_{columns}`).
See `references/TYPEORM_CONVENTION.md` > "Relation" and "Index" sections for full details.

### Step 5: Generate Migration

```bash
# Generate from Entity changes
npx typeorm migration:generate -d ./data-source.ts src/migrations/DescriptiveName

# Manual migration (if needed)
npx typeorm migration:create src/migrations/DescriptiveName

# Run migration
npx typeorm migration:run -d ./data-source.ts
```

Rules: Both `up()` and `down()` required. No `synchronize: true` in production.
See `references/TYPEORM_CONVENTION.md` > "Migration" section for file examples.

### Step 6: Verify Repository Usage

- [MUST] Repository API (`find`, `findOne`, `save`) for simple CRUD
- [MUST] QueryBuilder only for complex queries (GROUP BY, aggregates, subqueries)
- [MUST] Parameterized queries (`:paramName` syntax) -- no string interpolation
- [MUST NOT] Business logic, domain branching, or HttpExceptions in Repository

## Sellernote-Specific Patterns

These are non-standard patterns specific to Sellernote. Standard TypeORM patterns are in the reference files.

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

MUST NOT import `BaseEntity` from `typeorm` (Active Record pattern is forbidden).

### DecimalTransformer

All decimal/money columns MUST use `DecimalTransformer` to convert MySQL's string return to `number`. Without it, `order.totalAmount + 1000` becomes `"15000.001000"` (string concatenation).

```typescript
@Column({
  type: 'decimal', precision: 15, scale: 2,
  transformer: new DecimalTransformer(),
})
totalAmount: number;
```

See `references/TYPEORM_CONVENTION.md` > "Custom Transformer" for the full `DecimalTransformer` implementation.

### Enum as VARCHAR (not MySQL ENUM)

Store enum values as `VARCHAR`, never `type: 'enum'` (MySQL ENUM requires ALTER TABLE to add values).

```typescript
@Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
status: OrderStatus;  // OrderStatus is a string-based TS enum
```

### Transaction: @Transactional() only

Use `@Transactional()` from `typeorm-transactional`. MUST NOT use QueryRunner-based manual transactions.

```typescript
import { Transactional } from 'typeorm-transactional';

@Transactional()
async createOrder(dto: CreateOrderDto): Promise<Order> {
  // Use normal repositories -- transaction propagates via Async Local Storage
  const order = await this.orderRepository.save({ ...dto });
  await this.orderItemRepository.save(dto.items.map(item => ({ orderId: order.id, ...item })));
  return order;
}
```

See `references/TYPEORM_CONVENTION.md` > "Transaction" section for setup (`initializeTransactionalContext`, `addTransactionalDataSource`) and propagation options.

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
    enums/{feature}-status.enum.ts       # String-based enums
  migrations/
    {timestamp}-{DescriptiveName}.ts
data-source.ts                           # CLI DataSource config (project root)
```

## Cross-Skill References

- **API/Service/Controller work**: Use the `nestjs-api-dev` skill for DTOs, Controllers, Services, Mappers, and NestJS module wiring
