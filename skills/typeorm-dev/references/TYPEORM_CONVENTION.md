# TypeORM Convention

> This document defines the rules applied to TypeORM projects.
> Parent rules: BACKEND_CONVENTION.md | DATABASE_CONVENTION.md

## Tech Stack

| Item | Version/Configuration |
|------|----------|
| Database | MySQL (default) |

## DataSource Configuration

- [MUST] Apply `SnakeNamingStrategy`. Automatically converts `OrderItem` → `order_item`, `orderNumber` → `order_number`.

```typescript
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      namingStrategy: new SnakeNamingStrategy(),
    }),
  ],
})
export class AppModule {}
```

## Entity Definition

### Basic Structure

- [MUST] Use the `@Entity()` decorator. Define only one Entity per file.
- [MUST] Do not hardcode table names in `@Entity()`. `SnakeNamingStrategy` handles automatic conversion.

### ID/Common Fields (Refer to DATABASE_CONVENTION.md)

- [MUST] PK: `@PrimaryGeneratedColumn('uuid')`.
- [MUST] `_no` column: `@Column({ type: 'bigint', unique: true })` + `@Generated('increment')`.
- [MUST] Define common fields in an abstract class and have each Entity inherit from it.

```typescript
// entities/base.entity.ts
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

- [MUST NOT] Do not inherit from TypeORM's built-in `BaseEntity` (Active Record pattern). Use a custom abstract class.

### Column Definition

- [MUST] Explicitly specify the DB type in `@Column()`.
- [MUST] Nullable columns: specify `nullable: true` + add TypeScript `| null`.
- [SHOULD] Be aware that the MySQL driver returns `decimal` types as `string`.
- [SHOULD] Exclude sensitive columns (passwords, etc.) from default queries using `select: false`.

```typescript
@Column({ type: 'varchar', length: 255 })
email: string;

@Column({ type: 'decimal', precision: 15, scale: 2 })
totalAmount: number;

@Column({ type: 'text', nullable: true })
description: string | null;
```

### Domain Model Interface Pattern

- [MUST] Entity `implements` `IOrderModel` (data fields only) + `IOrderModelRelation` (relation fields only).
- [MUST] Do not include relation fields in the Domain Model Interface (ORM-dependent).

```typescript
export interface IOrderModel {
  id: string; _no: number; orderNumber: string;
  totalAmount: number; status: string; userId: string;
  createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}

export interface IOrderModelRelation {
  user: Relation<User>;
  items: Relation<OrderItem[]>;
}

@Entity()
export class Order extends BaseEntity implements IOrderModel, IOrderModelRelation {
  @Column({ type: 'varchar', length: 100 })
  orderNumber: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn()
  user: Relation<User>;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: Relation<OrderItem[]>;
}
```

### Monetary Field Custom Transformer

- [MUST] Apply `DecimalTransformer` to monetary (decimal) columns. Note: Without it, `number` operations will behave as string concatenation, causing bugs.
- [MUST] Define `DecimalTransformer` as a shared utility in a single location and reuse it.

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

### Relation Definition

- [MUST] Use the `Relation<>` wrapper for relation types. Note: Direct reference like `user: User` → risk of circular dependency.
- [MUST] Explicitly define FK columns in `@ManyToOne` (allows direct FK access when the relation is not loaded).
- [MUST] Place `@JoinColumn()` only on the owning side (`@ManyToOne` side).
- [MUST] Do not hardcode FK column names in `@JoinColumn()`. `SnakeNamingStrategy` handles automatic conversion.
- [MUST] Specify the join table name and column names in `@JoinTable()` for `@ManyToMany`.
- [MUST NOT] Do not set `eager: true` as default on relations.
- [SHOULD] Specify the `onDelete` option.

```typescript
@Column({ type: 'char', length: 36 })
userId: string;

@ManyToOne(() => User, (user) => user.orders)
@JoinColumn() // SnakeNamingStrategy converts to user_id
user: Relation<User>;
```

### Index

- [MUST] Specify index names in `@Index()` using the format `idx_{table_name}_{column_name}`. (Refer to DATABASE_CONVENTION.md)
- [SHOULD] Unique constraints: `@Index('uq_user_email', ['email'], { unique: true })`.

```typescript
@Entity()
@Index('idx_order_user_id', ['userId'])
@Index('idx_order_created_at_status', ['createdAt', 'status'])
export class Order extends BaseEntity { ... }
```

### Enum Handling

- [MUST] Use string-based TypeScript Enum + `type: 'varchar'`. Do not use `type: 'enum'` (MySQL ENUM causes ALTER TABLE issues).
  - Note: Numeric-based Enums and untyped strings are also prohibited.
- [SHOULD] Define Enums in separate files (`enums/` directory).

```typescript
export enum OrderStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Shipped = 'shipped',
}

@Column({ type: 'varchar', length: 20, default: OrderStatus.Pending })
status: OrderStatus;
```

### Soft Delete

- [MUST] Use `softDelete()` / `softRemove()`. Do not use `delete()` / `remove()` (hard delete).
- [MUST] Entities with `@DeleteDateColumn()` automatically apply `WHERE deleted_at IS NULL`. To include deleted records: `withDeleted: true`.

## Repository Pattern

- [SHOULD] Simple CRUD → Repository API. Complex queries (OR, subqueries, aggregation, bulk UPDATE/DELETE) → QueryBuilder.
- [MUST] When using `find` methods, explicitly specify options such as `relations`, `select`, `order`, `take`, etc.
- [SHOULD] Prefer `findOne` + null check over `findOneOrFail` (provides business-context errors).

```typescript
const orders = await this.orderRepository.find({
  where: { userId, status: OrderStatus.PENDING },
  relations: { items: true },
  order: { createdAt: 'DESC' },
  take: 20,
});
```

### Custom Repository Method Naming

| Action | Pattern | Example |
|------|------|------|
| Single record lookup | `findOneBy[Condition]` | `findOneByEmail(email)` |
| List lookup | `findBy[Condition]` | `findByUserId(userId)` |
| Existence check | `existsBy[Condition]` | `existsByEmail(email)` |
| Count | `countBy[Condition]` | `countByStatus(status)` |

## QueryBuilder

- [MUST] Parameter binding: use `:paramName` syntax. Do not use string interpolation (SQL Injection).
- [SHOULD] Select only necessary columns. Use `leftJoinAndSelect` when relation data is needed, or `leftJoin` when only conditions are needed.
- [MAY] Subqueries may be used for complex aggregation/conditions.

```typescript
const orders = await this.orderRepository
  .createQueryBuilder('order')
  .where('order.userId = :userId', { userId })
  .andWhere('order.status = :status', { status: OrderStatus.PENDING })
  .getMany();
```

## Transaction Management

### typeorm-transactional

- [MUST] Modifying multiple tables simultaneously → transactions are required.
- [MUST] Use the `@Transactional()` decorator (based on Async Local Storage, uses existing Repository as-is).

### Initial Setup

- [MUST] Call `initializeTransactionalContext()` in `main.ts` **before** NestJS initialization.
- [MUST] Wrap with `addTransactionalDataSource()` in `dataSourceFactory`.

```typescript
// main.ts
import { initializeTransactionalContext, StorageDriver } from 'typeorm-transactional';
async function bootstrap() {
  initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
```

### @Transactional() Usage

```typescript
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

### Propagation

| Propagation | Behavior | Use Case |
|-------------|------|----------|
| `REQUIRED` (default) | Joins existing, creates new if none exists | General business logic |
| `REQUIRES_NEW` | Always creates a new transaction | Audit logs, independent commits |
| `MANDATORY` | Requires existing, throws error if none exists | Internal-only methods |

- [MUST] Manage transactions at the Service layer. Do not start transactions in Controller/Repository.
- [MUST NOT] Do not use QueryRunner-based manual transactions. Use `@Transactional()`.

## Migration Management

- [MUST] Create a `data-source.ts` file at the project root for CLI usage.
- [MUST] Use TypeORM CLI migrations for schema changes.

| Command | Purpose |
|--------|------|
| `migration:generate` | Auto-generate based on Entity |
| `migration:create` | Manually create an empty file |
| `migration:run` | Apply migrations |
| `migration:revert` | Rollback the last migration |

- [MUST] File naming: timestamp + meaningful description (e.g., `1706000000000-CreateOrderTable.ts`).
- [MUST NOT] Do not use `synchronize: true` in production. [MAY] Allowed in local development.
- [MUST] Implement both `up()` and `down()`. (Refer to DATABASE_CONVENTION.md rollback strategy)

## Performance Optimization

- [MUST] Default relation loading: keep lazy (default). Load explicitly with the `relations` option when needed.
- [MUST NOT] Do not load relations individually inside loops (N+1 problem). Use the `relations` option or `leftJoinAndSelect`.
- [SHOULD] Query only necessary columns using the `select` option.
- [MUST] Apply `take`/`skip` pagination for list queries.
- [SHOULD] Use `findAndCount` to retrieve data and count in a single query.

```typescript
const [items, totalItems] = await this.orderRepository.findAndCount({
  where: { userId },
  order: { createdAt: 'DESC' },
  take: size,
  skip: (page - 1) * size,
});
```

## NestJS Integration

- [MUST] Use `TypeOrmModule.forRootAsync()` + ConfigService for environment variable-based configuration.
- [MUST] Register `TypeOrmModule.forFeature([Entity])` in Feature Modules.
- [MUST] Repository: constructor injection with `@InjectRepository()`.
- [MUST] When DataSource is needed, inject via NestJS DI.

## Anti-patterns

- [MUST NOT] Do not use `synchronize: true` in production.
- [MUST NOT] Do not write business logic in Entities (place it in the Service layer).
- [MUST NOT] Do not execute raw SQL with `query()`. Use QueryBuilder/Repository API.
- [MUST NOT] Do not omit transactions when modifying multiple tables.
- [MUST NOT] Do not use string interpolation in QueryBuilder (SQL Injection).
- [MUST NOT] Do not directly reference Entities without the `Relation<>` wrapper (circular dependency).