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
2. Check existing entities, base entity location, and transformer files
3. Find the existing `BaseEntity` abstract class (typically in a shared/common module)
4. Locate `DecimalTransformer` if it exists; if not, create it in `common/transformers/`
5. Check `data-source.ts` at project root for migration and entity configuration

### Step 2: Define Domain Model Interface

Create the interface in `modules/{feature}/interfaces/{feature}.model.interface.ts`:

```typescript
// modules/order/interfaces/order.model.interface.ts
export interface IOrderModel {
  id: string;
  _no: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

Rules:
- [MUST] Include only data fields owned by this model
- [MUST NOT] Include relation fields (e.g., `user: User`, `items: OrderItem[]`)
- [MUST] Include `id`, `_no`, `createdAt`, `updatedAt`, `deletedAt` from BaseEntity

If relations need typing, create a separate relation interface:

```typescript
// modules/order/interfaces/order-model-relation.interface.ts
import type { Relation } from 'typeorm';
import type { User } from '../../user/entities/user.entity';
import type { OrderItem } from '../../order-item/entities/order-item.entity';

export interface IOrderModelRelation {
  user: Relation<User>;
  items: Relation<OrderItem[]>;
}
```

### Step 3: Create Entity

Place in `modules/{feature}/entities/{feature}.entity.ts`. One Entity per file.

```typescript
import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';
import type { IOrderModel } from '../interfaces/order.model.interface';
import type { IOrderModelRelation } from '../interfaces/order-model-relation.interface';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
}

@Entity('order')
@Index('idx_order_user_id', ['userId'])
@Index('idx_order_created_at_status', ['createdAt', 'status'])
export class Order extends BaseEntity implements IOrderModel, IOrderModelRelation {
  @Column({ type: 'varchar', length: 100 })
  orderNumber: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  totalAmount: number;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'char', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // Relations (IOrderModelRelation)
  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: Relation<OrderItem[]>;
}
```

### Step 4: Define Relations

Apply relation decorators on the Entity. Follow these strict rules for every relation.

**ManyToOne (owning side -- FK lives here):**
```typescript
// GOOD
@Column({ type: 'char', length: 36 })
userId: string;                          // Explicit FK column

@ManyToOne(() => User, (user) => user.orders)
@JoinColumn({ name: 'user_id' })        // Explicit column name
user: Relation<User>;                    // Relation<> wrapper
```

```typescript
// BAD
@ManyToOne(() => User, (user) => user.orders)
user: User;                              // Missing Relation<> wrapper, no FK column
```

**OneToMany (inverse side -- no @JoinColumn):**
```typescript
@OneToMany(() => Order, (order) => order.user)
orders: Relation<Order[]>;
```

**ManyToMany (explicit @JoinTable names):**
```typescript
@ManyToMany(() => Tag, (tag) => tag.posts)
@JoinTable({
  name: 'post_tag',
  joinColumn: { name: 'post_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
})
tags: Relation<Tag[]>;
```

### Step 5: Generate Migration

1. Ensure `data-source.ts` exists at project root with correct entity/migration paths
2. Generate migration from Entity changes:
   ```bash
   npx typeorm migration:generate -d ./data-source.ts src/migrations/DescriptiveName
   ```
3. Review the generated file -- verify both `up()` and `down()` methods
4. If manual migration is needed:
   ```bash
   npx typeorm migration:create src/migrations/DescriptiveName
   ```
5. Run migration:
   ```bash
   npx typeorm migration:run -d ./data-source.ts
   ```

Migration file example:
```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOrderTable1706000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'order',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: '_no', type: 'bigint', isGenerated: true, generationStrategy: 'increment', isUnique: true },
          { name: 'user_id', type: 'char', length: '36', isNullable: false },
          { name: 'order_number', type: 'varchar', length: '100' },
          { name: 'total_amount', type: 'decimal', precision: 15, scale: 2, default: '0.00' },
          { name: 'status', type: 'varchar', length: '20', default: "'PENDING'" },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order');
  }
}
```

### Step 6: Verify Repository Usage

Check that the Repository follows data-access-only rules:
- [MUST] Use Repository API (`find`, `findOne`, `save`) for simple CRUD
- [MUST] Use QueryBuilder only for complex queries (GROUP BY, aggregates, subqueries)
- [MUST] Use parameterized queries in QueryBuilder (`:paramName` syntax)
- [MUST NOT] Contain business logic, domain branching, or throw HttpExceptions

## Key Patterns

### BaseEntity

Every Entity MUST extend the custom `BaseEntity`. MUST NOT extend TypeORM's built-in `BaseEntity`.

```typescript
// common/entities/base.entity.ts
import {
  PrimaryGeneratedColumn, Column, Generated,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';

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

```typescript
// BAD - importing TypeORM's built-in BaseEntity (Active Record pattern)
import { BaseEntity, Entity, Column } from 'typeorm';

@Entity('user')
export class User extends BaseEntity { // FORBIDDEN
  @Column() name: string;
}
```

### DecimalTransformer

All decimal/money columns MUST use `DecimalTransformer`. Define once, reuse everywhere.

```typescript
// common/transformers/decimal.transformer.ts
import type { ValueTransformer } from 'typeorm';

export class DecimalTransformer implements ValueTransformer {
  to(value: number | null | undefined): number | null | undefined {
    return value;
  }

  from(value: string | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return parseFloat(value);
  }
}
```

Usage:
```typescript
// GOOD
@Column({
  type: 'decimal', precision: 15, scale: 2,
  transformer: new DecimalTransformer(),
})
totalAmount: number;

// BAD - no transformer; runtime value is string, not number
@Column({ type: 'decimal', precision: 15, scale: 2 })
totalAmount: number;  // Actually returns "15000.00" (string)!
```

### Enum as VARCHAR

Store enum values as `VARCHAR`, not MySQL `ENUM` type.

```typescript
// GOOD
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
}

@Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
status: OrderStatus;

// BAD - MySQL ENUM type (ALTER TABLE required to add values)
@Column({ type: 'enum', enum: OrderStatus })
status: OrderStatus;
```

### Transaction Management

Use `@Transactional()` from `typeorm-transactional`. MUST NOT use QueryRunner-based manual transactions.

```typescript
// GOOD
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class OrderService {
  @Transactional()
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = await this.orderRepository.save({ ...dto });
    await this.orderItemRepository.save(dto.items.map(item => ({
      orderId: order.id, ...item,
    })));
    return order;
  }
}

// BAD - QueryRunner manual transaction
async createOrder(dto: CreateOrderDto): Promise<Order> {
  const qr = this.dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    const order = await qr.manager.save(Order, { ... });
    await qr.commitTransaction();
    return order;
  } catch (e) {
    await qr.rollbackTransaction();
    throw e;
  } finally {
    await qr.release();
  }
}
```

## Quick Reference: MUST / MUST NOT

### Entity Definition
| Rule | Detail |
|------|--------|
| MUST | Extend custom `BaseEntity` (NOT TypeORM's built-in `BaseEntity`) |
| MUST | `@Entity()` explicitly specify table name (snake_case singular) |
| MUST | `@Column()` explicitly specify database type |
| MUST | Include `id` (UUID PK), `_no` (BIGINT AUTO_INCREMENT UNIQUE), `createdAt`, `updatedAt`, `deletedAt` via BaseEntity |
| MUST | One Entity per file |
| MUST | Entity implements `IXxxModel` Domain Model Interface |
| MUST | Nullable columns: `nullable: true` in decorator + `\| null` in TS type |
| MUST NOT | Put business logic in Entity classes |

### Decimal / Money
| Rule | Detail |
|------|--------|
| MUST | Use `DecimalTransformer` on all decimal columns |
| MUST | Define `DecimalTransformer` once in common module, reuse |
| MUST NOT | Use `FLOAT` / `DOUBLE` for money fields |

### Relations
| Rule | Detail |
|------|--------|
| MUST | Use `Relation<>` type wrapper on all relation properties |
| MUST | Define explicit FK columns (e.g., `userId: string` alongside `user: Relation<User>`) |
| MUST | `@JoinColumn({ name: 'xxx_id' })` on owning side with explicit column name |
| MUST | `@JoinTable({ name, joinColumn, inverseJoinColumn })` with explicit names for ManyToMany |
| MUST | `@Index()` with explicit index name (`idx_{table}_{columns}`) |
| MUST NOT | Set `eager: true` on any relation |
| MUST NOT | Use Entity class directly as relation type (use `Relation<>` wrapper) |

### Enum
| Rule | Detail |
|------|--------|
| MUST | String-based TypeScript enum with `type: 'varchar'` in `@Column()` |
| MUST NOT | Use `type: 'enum'` (MySQL ENUM type is forbidden) |

### Migration
| Rule | Detail |
|------|--------|
| MUST | All schema changes through migration files |
| MUST | Both `up()` and `down()` methods implemented |
| MUST | Descriptive migration file names (timestamp + description) |
| MUST NOT | Use `synchronize: true` in production |
| MAY | Use `synchronize: true` only in local development |

### Transaction
| Rule | Detail |
|------|--------|
| MUST | Use `@Transactional()` from `typeorm-transactional` |
| MUST | Transactions managed in Service layer only |
| MUST NOT | Use QueryRunner-based manual transactions |
| MUST NOT | Start transactions in Controller or Repository |

### Domain Model Interface
| Rule | Detail |
|------|--------|
| MUST | Create `IXxxModel` interface with data fields only |
| MUST NOT | Include relation fields in `IXxxModel` |
| MUST | Separate relation interface `IXxxModelRelation` if needed |
| MUST | Entity implements both `IXxxModel` and `IXxxModelRelation` |

### Query Safety
| Rule | Detail |
|------|--------|
| MUST | Use `:paramName` binding in QueryBuilder |
| MUST NOT | Use string interpolation in queries (SQL injection risk) |
| MUST NOT | Use `query()` for raw SQL execution |
| MUST NOT | Load relations in loops (N+1 problem) |

## File Structure Reference

```
src/
├── common/
│   ├── entities/
│   │   └── base.entity.ts                 # Custom BaseEntity abstract class
│   └── transformers/
│       └── decimal.transformer.ts          # DecimalTransformer
├── modules/{feature}/
│   ├── interfaces/
│   │   ├── {feature}.model.interface.ts    # IXxxModel (data fields only)
│   │   └── {feature}-model-relation.interface.ts  # IXxxModelRelation
│   ├── entities/
│   │   └── {feature}.entity.ts             # Entity class
│   ├── enums/
│   │   └── {feature}-status.enum.ts        # String-based enums
│   └── ...
├── migrations/
│   ├── 1706000000000-CreateOrderTable.ts
│   └── 1706100000000-AddStatusColumnToOrder.ts
└── data-source.ts                          # CLI DataSource config (project root)
```

## Cross-Skill References

- **API/Service/Controller work**: Use the `nestjs-api-dev` skill for DTOs, Controllers, Services, Mappers, and NestJS module wiring
