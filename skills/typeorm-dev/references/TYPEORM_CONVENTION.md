# TypeORM 컨벤션

> 이 문서는 TypeORM 프로젝트에 적용되는 규칙을 정의합니다.
> 상위 규칙: [백엔드 공통 컨벤션](../BACKEND_CONVENTION.md) | [데이터베이스 공통 컨벤션](../../database/DATABASE_CONVENTION.md)

## 기술 스택

| 항목 | 버전/설정 |
|------|----------|
| TypeORM | TBD |
| @nestjs/typeorm | TBD |
| typeorm-transactional | TBD |
| 데이터베이스 | MySQL (기본) |
| TypeScript | TBD |

## Entity 정의

### 기본 구조

- **규칙**: [MUST] Entity 클래스는 `@Entity()` 데코레이터를 사용하고, 하나의 파일에 하나의 Entity만 정의한다.
- **이유**: Entity와 파일이 1:1로 대응되어야 코드 탐색과 관리가 용이하다.
- **좋은 예시**:
  ```typescript
  // entities/order.entity.ts
  import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

  @Entity('order')
  export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'bigint', unique: true })
    @Generated('increment')
    _no: number;

    @Column({ type: 'varchar', length: 100 })
    orderNumber: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    totalAmount: number;
  }
  ```
- **나쁜 예시**:
  ```typescript
  // entities/order.entity.ts - 하나의 파일에 여러 Entity 정의
  @Entity('order')
  export class Order { ... }

  @Entity('order_item')
  export class OrderItem { ... } // 별도 파일로 분리해야 함
  ```

### 데코레이터 사용 규칙

- **규칙**: [MUST] `@Entity()` 데코레이터에 테이블명을 명시적으로 지정한다.
- **이유**: 클래스명 변경 시 테이블명이 의도치 않게 변경되는 것을 방지한다. 테이블명은 데이터베이스 컨벤션의 네이밍 규칙(snake_case 단수형)을 따른다.
- **좋은 예시**:
  ```typescript
  @Entity('order_item')
  export class OrderItem { ... }
  ```
- **나쁜 예시**:
  ```typescript
  @Entity() // 테이블명 미지정 - 클래스명에 의존
  export class OrderItem { ... }
  ```

- **규칙**: [MUST] PK(`id`)는 `@PrimaryGeneratedColumn('uuid')`를 사용하여 UUID를 자동 생성한다.
- **이유**: 데이터베이스 컨벤션의 ID 전략(UUID CHAR(36) PK)과 일치시킨다. UUID는 분산 환경에서 충돌 없이 ID를 생성할 수 있고, 외부 노출 시 보안성이 높다.

- **규칙**: [MUST] 모든 Entity에 `_no` 컬럼(BIGINT AUTO_INCREMENT, UNIQUE)을 포함한다.
- **이유**: 내부 순차 식별자로 정렬, 커서 기반 페이지네이션, InnoDB 성능 최적화에 활용한다.
- **좋은 예시**:
  ```typescript
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  _no: number;
  ```
- **나쁜 예시**:
  ```typescript
  @PrimaryGeneratedColumn({ type: 'bigint' }) // UUID 정책 위반
  id: number;
  ```

### 컬럼 정의

- **규칙**: [MUST] `@Column()` 데코레이터에 데이터베이스 타입을 명시적으로 지정한다.
- **이유**: TypeORM의 자동 타입 추론에 의존하면 데이터베이스마다 다른 타입이 생성될 수 있다.
- **좋은 예시**:
  ```typescript
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;
  ```
- **나쁜 예시**:
  ```typescript
  @Column()
  email: string; // 타입 미지정 - DB별 다른 결과

  @Column()
  totalAmount: number; // decimal인지 int인지 불분명
  ```

- **규칙**: [MUST] nullable 컬럼은 `@Column()` 옵션에 `nullable: true`를 명시하고, TypeScript 타입에도 `| null`을 추가한다.
- **이유**: DB 스키마와 TypeScript 타입이 일치해야 런타임 에러를 방지할 수 있다.
- **좋은 예시**:
  ```typescript
  @Column({ type: 'varchar', length: 255, nullable: true })
  nickname: string | null;
  ```
- **나쁜 예시**:
  ```typescript
  @Column({ type: 'varchar', length: 255, nullable: true })
  nickname: string; // TypeScript 타입에 null 미포함 - 실제로는 null이 올 수 있음
  ```

- **규칙**: [SHOULD] `decimal` 타입 컬럼의 값을 정밀하게 계산해야 하는 경우, TypeORM이 MySQL에서 `string`으로 반환하는 점에 유의한다.
- **이유**: MySQL 드라이버는 `decimal` 값을 JavaScript의 부동소수점 정밀도 손실을 방지하기 위해 `string`으로 반환한다. 금액 계산 등 정밀도가 중요한 로직에서는 이를 고려하여 처리한다.

- **규칙**: [SHOULD] `select: false` 옵션을 사용하여 기본 조회에서 민감한 컬럼을 제외한다.
- **이유**: 비밀번호 해시 등 민감 정보가 기본 조회에 포함되는 것을 방지한다.
- **좋은 예시**:
  ```typescript
  @Column({ type: 'varchar', length: 255, select: false })
  password: string;
  ```

### 공통 필드 (BaseEntity)

- **규칙**: [MUST] 모든 Entity가 공유하는 공통 필드를 추상 클래스로 정의하고, 각 Entity가 이를 상속한다.
- **이유**: 공통 필드(id, createdAt, updatedAt, deletedAt)의 중복 정의를 제거하고, 데이터베이스 컨벤션의 필수 공통 필드 규칙을 일괄 적용한다.
- **좋은 예시**:
  ```typescript
  // entities/base.entity.ts
  import {
    PrimaryGeneratedColumn,
    Column,
    Generated,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
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
  // entities/order.entity.ts
  import { Entity, Column } from 'typeorm';
  import { BaseEntity } from './base.entity';

  @Entity('order')
  export class Order extends BaseEntity {
    @Column({ type: 'varchar', length: 100 })
    orderNumber: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    totalAmount: number;
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 매 Entity마다 공통 필드를 반복 정의
  @Entity('order')
  export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'bigint', unique: true })
    @Generated('increment')
    _no: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date | null;

    @Column({ type: 'varchar', length: 100 })
    orderNumber: string;
  }
  ```

- **규칙**: [MUST NOT] TypeORM의 내장 `BaseEntity` 클래스(Active Record 패턴)를 상속하지 않는다. 위에서 정의한 커스텀 추상 클래스를 사용한다.
- **이유**: Active Record 패턴은 Entity에 데이터 접근 로직이 포함되어 레이어 분리 원칙에 위배되고, 테스트가 어려워진다.
- **나쁜 예시**:
  ```typescript
  import { BaseEntity, Entity, Column } from 'typeorm';

  @Entity('user')
  export class User extends BaseEntity { // TypeORM 내장 BaseEntity 사용 금지
    @Column()
    name: string;
  }

  // Active Record 패턴 - Entity에서 직접 DB 접근
  const user = await User.findOne({ where: { id: 1 } });
  await user.save();
  ```

### Domain Model Interface 패턴

- **규칙**: [MUST] Entity는 Domain Model Interface를 `implements`하여 구현한다.
- **이유**: Entity가 Interface를 구현하면, 도메인에서 정의한 필수 데이터 필드가 Entity에 반드시 존재함을 컴파일 타임에 보장한다. Interface를 기준으로 Mapper, Service 등 다른 레이어가 동작하므로, Entity 내부 변경이 외부에 전파되지 않는다.

- **규칙**: [MUST] Domain Model Interface는 해당 모델 고유의 데이터 필드만 포함한다. Relation 필드는 포함하지 않는다.
- **이유**: Relation은 ORM 기술에 종속적인 개념이다. Domain Model Interface에 relation을 포함하면, ORM 교체 시 Interface까지 변경해야 하므로 기술 독립성이 깨진다.
- **좋은 예시**:
  ```typescript
  // interfaces/order.model.interface.ts
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
- **나쁜 예시**:
  ```typescript
  // Interface에 relation 필드 포함 — ORM 종속
  export interface IOrderModel {
    id: string;
    orderNumber: string;
    totalAmount: number;
    user: User;           // relation — ORM Entity 직접 참조
    items: OrderItem[];   // relation — ORM Entity 직접 참조
  }
  ```

- **규칙**: [MUST] Relation 필드는 `I{모델명}ModelRelation` 인터페이스로 분리하고, Entity가 두 인터페이스를 모두 `implements`한다.
- **이유**: 데이터 필드와 Relation 필드를 분리하면, Mapper나 Service에서는 `IOrderModel`만 참조하고, relation이 필요한 경우에만 `IOrderModelRelation`을 참조하여 의존 범위를 최소화할 수 있다.
- **좋은 예시**:
  ```typescript
  // interfaces/order.model.interface.ts
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
  ```typescript
  // interfaces/order-model-relation.interface.ts
  import type { Relation } from 'typeorm';
  import type { User } from '../entities/user.entity';
  import type { OrderItem } from '../entities/order-item.entity';

  export interface IOrderModelRelation {
    user: Relation<User>;
    items: Relation<OrderItem[]>;
  }
  ```
  ```typescript
  // entities/order.entity.ts
  import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Relation } from 'typeorm';
  import { BaseEntity } from './base.entity';
  import type { IOrderModel } from '../interfaces/order.model.interface';
  import type { IOrderModelRelation } from '../interfaces/order-model-relation.interface';

  @Entity('order')
  export class Order extends BaseEntity implements IOrderModel, IOrderModelRelation {
    @Column({ type: 'varchar', length: 100 })
    orderNumber: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    totalAmount: number;

    @Column({ type: 'varchar', length: 20 })
    status: string;

    @Column({ type: 'char', length: 36 })
    userId: string;

    // Relation 필드 — IOrderModelRelation 구현
    @ManyToOne(() => User, (user) => user.orders)
    @JoinColumn({ name: 'user_id' })
    user: Relation<User>;

    @OneToMany(() => OrderItem, (item) => item.order)
    items: Relation<OrderItem[]>;
  }
  ```
- **나쁜 예시**:
  ```typescript
  // Interface 없이 Entity 정의 — 도메인 계약 부재
  @Entity('order')
  export class Order extends BaseEntity {
    @Column({ type: 'varchar', length: 100 })
    orderNumber: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    totalAmount: number;

    // Interface가 없으므로 필드 누락을 컴파일 타임에 감지할 수 없음
    // Mapper, Service에서 Entity에 직접 의존하게 됨
  }
  ```

### 금액 필드 Custom Transformer

- **규칙**: [MUST] 금액(decimal) 컬럼에 Custom `ValueTransformer`를 적용하여, 데이터베이스의 `decimal`(string) 값을 코드에서 `number`로 자동 변환한다.
- **이유**: MySQL 드라이버는 `decimal` 컬럼의 값을 JavaScript 부동소수점 정밀도 손실 방지를 위해 `string`으로 반환한다. Transformer 없이 사용하면 Entity의 `number` 타입과 실제 반환값 `string` 사이에 타입 불일치가 발생하여, 런타임에서 `number` 연산이 문자열 연결로 동작하는 등 심각한 버그가 생긴다.
- **좋은 예시**:
  ```typescript
  // common/transformers/decimal.transformer.ts
  import type { ValueTransformer } from 'typeorm';

  /**
   * DB decimal(string) ↔ 코드 number 변환 Transformer.
   * - to: number → DB 저장 (그대로 전달, TypeORM이 decimal로 처리)
   * - from: DB string → number (parseFloat)
   */
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

- **규칙**: [MUST] `DecimalTransformer`는 공통 유틸리티로 한 곳에 정의하고, 모든 금액 Entity 컬럼에서 재사용한다.
- **이유**: 각 Entity에서 Transformer를 인라인으로 반복 정의하면 코드 중복이 발생하고, 변환 로직 변경 시 수정 범위가 넓어진다.
- **좋은 예시**:
  ```typescript
  // entities/order.entity.ts
  import { Entity, Column } from 'typeorm';
  import { BaseEntity } from './base.entity';
  import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

  @Entity('order')
  export class Order extends BaseEntity {
    @Column({ type: 'varchar', length: 100 })
    orderNumber: string;

    @Column({
      type: 'decimal',
      precision: 15,
      scale: 2,
      transformer: new DecimalTransformer(), // Custom Transformer 적용
    })
    totalAmount: number; // 코드에서는 number로 사용 가능

    @Column({
      type: 'decimal',
      precision: 15,
      scale: 2,
      default: 0,
      transformer: new DecimalTransformer(),
    })
    discountAmount: number;
  }
  ```
- **나쁜 예시**:
  ```typescript
  // Transformer 미적용 — 타입 불일치 발생
  @Entity('order')
  export class Order extends BaseEntity {
    @Column({ type: 'decimal', precision: 15, scale: 2 })
    totalAmount: number; // 타입은 number이지만 실제 반환값은 string!

    // 아래 코드가 의도와 다르게 동작함:
    // order.totalAmount + 1000  →  "15000.00" + 1000  →  "15000.001000" (문자열 연결)
  }
  ```

### Relation 정의

- **규칙**: [MUST] Relation 타입에 `Relation<>` 타입 래퍼를 사용한다.
- **이유**: TypeScript의 순환 참조(circular dependency) 문제를 방지한다. `Relation<>` 래퍼는 TypeORM에서 공식적으로 권장하는 패턴이다.
- **좋은 예시**:
  ```typescript
  import { Entity, ManyToOne, OneToMany, Relation } from 'typeorm';

  @Entity('order')
  export class Order extends BaseEntity {
    @ManyToOne(() => User, (user) => user.orders)
    user: Relation<User>;

    @OneToMany(() => OrderItem, (item) => item.order)
    items: Relation<OrderItem[]>;
  }
  ```
- **나쁜 예시**:
  ```typescript
  @Entity('order')
  export class Order extends BaseEntity {
    @ManyToOne(() => User, (user) => user.orders)
    user: User; // Relation<> 미사용 - 순환 참조 위험

    @OneToMany(() => OrderItem, (item) => item.order)
    items: OrderItem[]; // Relation<> 미사용
  }
  ```

- **규칙**: [MUST] `@ManyToOne` 관계에서 FK 컬럼을 명시적으로 정의한다.
- **이유**: FK 컬럼을 명시하면 relation을 로드하지 않고도 FK 값에 직접 접근할 수 있어 성능상 유리하다.
- **좋은 예시**:
  ```typescript
  @Entity('order')
  export class Order extends BaseEntity {
    @Column({ type: 'char', length: 36 })
    userId: string; // FK 컬럼 명시 (PK가 UUID이므로 FK도 CHAR(36))

    @ManyToOne(() => User, (user) => user.orders)
    @JoinColumn({ name: 'user_id' })
    user: Relation<User>;
  }
  ```
- **나쁜 예시**:
  ```typescript
  @Entity('order')
  export class Order extends BaseEntity {
    // FK 컬럼 미정의 - userId에 직접 접근 불가
    @ManyToOne(() => User, (user) => user.orders)
    user: Relation<User>;
  }
  ```

- **규칙**: [MUST] `@JoinColumn()`은 관계의 소유자(owning side)에만 배치한다. `@ManyToOne` 쪽이 항상 소유자이다.
- **이유**: `@JoinColumn()`은 해당 테이블에 FK 컬럼이 생성됨을 의미한다. 잘못 배치하면 의도하지 않은 테이블에 FK가 생긴다.
- **좋은 예시**:
  ```typescript
  // Order(N) -> User(1): Order가 소유자
  @Entity('order')
  export class Order extends BaseEntity {
    @ManyToOne(() => User, (user) => user.orders)
    @JoinColumn({ name: 'user_id' }) // FK는 order 테이블에 생성
    user: Relation<User>;
  }

  @Entity('user')
  export class User extends BaseEntity {
    @OneToMany(() => Order, (order) => order.user)
    orders: Relation<Order[]>; // @JoinColumn 없음 (비소유자)
  }
  ```

- **규칙**: [MUST] `@JoinColumn()`에 FK 컬럼명을 명시적으로 지정한다.
- **이유**: 데이터베이스 컨벤션의 FK 네이밍 규칙(`{참조_테이블_단수형}_id`)을 명시적으로 적용한다.
- **좋은 예시**:
  ```typescript
  @JoinColumn({ name: 'user_id' })
  ```
- **나쁜 예시**:
  ```typescript
  @JoinColumn() // 컬럼명 미지정 - TypeORM 자동 생성에 의존
  ```

- **규칙**: [MUST] `@ManyToMany` 관계에서 `@JoinTable()`에 중간 테이블명과 컬럼명을 명시적으로 지정한다.
- **이유**: 데이터베이스 컨벤션의 네이밍 규칙을 적용하고, 자동 생성되는 이름의 예측 불가능성을 제거한다.
- **좋은 예시**:
  ```typescript
  @Entity('post')
  export class Post extends BaseEntity {
    @ManyToMany(() => Tag, (tag) => tag.posts)
    @JoinTable({
      name: 'post_tag', // 중간 테이블명 명시
      joinColumn: { name: 'post_id', referencedColumnName: 'id' },
      inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
    })
    tags: Relation<Tag[]>;
  }
  ```
- **나쁜 예시**:
  ```typescript
  @Entity('post')
  export class Post extends BaseEntity {
    @ManyToMany(() => Tag, (tag) => tag.posts)
    @JoinTable() // 중간 테이블명/컬럼명 미지정
    tags: Relation<Tag[]>;
  }
  ```

- **규칙**: [MUST NOT] Relation에 `eager: true` 옵션을 기본으로 설정하지 않는다.
- **이유**: Eager loading이 기본이면 모든 조회에서 관련 Entity를 자동으로 로드하여 불필요한 쿼리가 발생하고 성능이 저하된다. 필요한 경우에만 명시적으로 relation을 로드한다.
- **좋은 예시**:
  ```typescript
  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>; // eager 미설정 (기본값 false)
  ```
- **나쁜 예시**:
  ```typescript
  @ManyToOne(() => User, (user) => user.orders, { eager: true }) // 항상 User를 로드
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
  ```

- **규칙**: [SHOULD] `onDelete` 옵션을 명시적으로 지정하여 삭제 시 동작을 정의한다.
- **이유**: 참조 무결성 관련 삭제 동작을 코드에서 명확히 표현하여 예상치 못한 데이터 손실을 방지한다.
- **좋은 예시**:
  ```typescript
  @ManyToOne(() => User, (user) => user.orders, {
    onDelete: 'CASCADE', // 사용자 삭제 시 주문도 삭제
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
  ```

### 인덱스 정의

- **규칙**: [MUST] `@Index()` 데코레이터에 인덱스명을 데이터베이스 컨벤션의 네이밍 규칙(`idx_{테이블명}_{컬럼명}`)에 맞게 명시한다.
- **이유**: TypeORM 자동 생성 인덱스명은 의미를 파악하기 어렵다. 명시적 이름을 사용해야 EXPLAIN 결과에서 인덱스를 즉시 식별할 수 있다.
- **좋은 예시**:
  ```typescript
  import { Entity, Column, Index } from 'typeorm';

  @Entity('order')
  @Index('idx_order_user_id', ['userId'])
  @Index('idx_order_created_at_status', ['createdAt', 'status']) // 카디널리티가 높은 컬럼을 앞에 배치
  export class Order extends BaseEntity {
    @Column({ type: 'char', length: 36 })
    userId: string;

    @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
    status: OrderStatus;
  }
  ```
- **나쁜 예시**:
  ```typescript
  @Entity('order')
  @Index(['userId']) // 인덱스명 미지정 - 자동 생성된 이름은 의미 불명
  export class Order extends BaseEntity { ... }
  ```

- **규칙**: [SHOULD] 유니크 제약조건은 `@Index()` 데코레이터에 `{ unique: true }` 옵션을 사용한다.
- **이유**: `@Column({ unique: true })`보다 인덱스명을 명시적으로 제어할 수 있다.
- **좋은 예시**:
  ```typescript
  @Entity('user')
  @Index('uq_user_email', ['email'], { unique: true })
  export class User extends BaseEntity {
    @Column({ type: 'varchar', length: 255 })
    email: string;
  }
  ```

### Enum 처리

- **규칙**: [MUST] Enum 값은 문자열(string) 기반 TypeScript Enum으로 정의하고, `@Column()`에 `type: 'varchar'`를 사용한다. `type: 'enum'`은 사용하지 않는다.
- **이유**: TypeORM의 `type: 'enum'`은 MySQL의 `ENUM` 타입 컬럼을 생성하는데, MySQL 컨벤션에서 `ENUM` 타입 사용이 금지되어 있다. `ENUM` 값의 추가/수정 시 테이블 재구성(ALTER TABLE)이 필요하기 때문이다. `VARCHAR`를 사용하면 스키마 변경 없이 값을 추가할 수 있으며, TypeScript Enum과 함께 사용하면 애플리케이션 레벨에서 타입 안전성을 보장한다.
- **좋은 예시**:
  ```typescript
  export enum OrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
  }

  @Entity('order')
  export class Order extends BaseEntity {
    @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
    status: OrderStatus;
  }
  ```
- **나쁜 예시**:
  ```typescript
  // MySQL ENUM 타입 사용 — MySQL 컨벤션 위반
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  // 숫자 기반 Enum - DB에서 값의 의미를 파악하기 어려움
  export enum OrderStatus {
    PENDING,    // 0
    CONFIRMED,  // 1
    SHIPPED,    // 2
  }

  // 타입 없는 문자열 - 타입 안전성 부족
  @Column({ type: 'varchar', length: 20 })
  status: string;
  ```

- **규칙**: [SHOULD] Enum은 별도 파일(`enums/` 디렉토리)에 정의한다.
- **이유**: Enum은 Entity, Service, DTO 등 여러 곳에서 참조될 수 있으므로 별도 파일로 분리해야 재사용이 가능하다.
- **좋은 예시**:
  ```
  modules/order/
  ├── enums/
  │   └── order-status.enum.ts    # Enum 별도 파일
  ├── entities/
  │   └── order.entity.ts
  └── ...
  ```

### Soft Delete 사용

- **규칙**: [MUST] Soft delete가 적용된 Entity를 삭제할 때 `softDelete()` 또는 `softRemove()`를 사용한다. `delete()` / `remove()`를 사용하지 않는다.
- **이유**: `@DeleteDateColumn()`이 정의된 Entity에서 `delete()`를 사용하면 물리 삭제가 수행된다. TypeORM은 `softDelete()` 사용 시 자동으로 `deleted_at`에 현재 시각을 설정한다.
- **좋은 예시**:
  ```typescript
  // softDelete - ID 기반 삭제 (쿼리 1회)
  await this.userRepository.softDelete(userId);

  // softRemove - Entity 인스턴스 기반 삭제
  const user = await this.userRepository.findOne({ where: { id: userId } });
  await this.userRepository.softRemove(user);

  // 삭제된 데이터 복원
  await this.userRepository.restore(userId);
  ```
- **나쁜 예시**:
  ```typescript
  // 물리 삭제 - deleted_at이 있는 Entity에서 사용 금지
  await this.userRepository.delete(userId);
  ```

- **규칙**: [MUST] TypeORM은 `@DeleteDateColumn()`이 있는 Entity 조회 시 자동으로 `WHERE deleted_at IS NULL` 조건을 추가한다. 삭제된 데이터를 포함하여 조회해야 하는 경우 `withDeleted` 옵션을 명시적으로 사용한다.
- **이유**: TypeORM의 자동 필터링 동작을 이해하지 못하면 예상치 못한 결과가 발생할 수 있다.
- **좋은 예시**:
  ```typescript
  // 삭제된 데이터 포함 조회 (관리자 기능 등)
  const allUsers = await this.userRepository.find({
    withDeleted: true,
  });

  // QueryBuilder에서 삭제된 데이터 포함
  const users = await this.userRepository
    .createQueryBuilder('user')
    .withDeleted()
    .where('user.email = :email', { email })
    .getOne();
  ```

## Repository 패턴

### Repository API vs QueryBuilder 선택 기준

- **규칙**: [SHOULD] 단순한 CRUD 및 조회에는 Repository API(`find`, `findOne`, `save`, `remove`)를 사용하고, 복잡한 쿼리에만 QueryBuilder를 사용한다.
- **이유**: Repository API는 가독성이 높고 타입 안전하며, 단순 쿼리에 QueryBuilder를 사용하면 불필요한 복잡성이 추가된다.

| 사용 상황 | 권장 방식 |
|-----------|----------|
| 단순 조건 조회 | Repository API (`find`, `findOne`) |
| 관계 포함 조회 | Repository API (`relations` 옵션) |
| 복잡한 WHERE 조건 (OR, 서브쿼리 등) | QueryBuilder |
| JOIN 후 집계, GROUP BY | QueryBuilder |
| 대량 UPDATE/DELETE | QueryBuilder |

- **좋은 예시**:
  ```typescript
  // 단순 조회 - Repository API 사용
  const order = await this.orderRepository.findOne({
    where: { id: orderId },
    relations: { user: true, items: true },
  });

  // 복잡한 조회 - QueryBuilder 사용 (집계 쿼리)
  const result = await this.orderRepository
    .createQueryBuilder('order')
    .select('order.userId', 'userId')
    .addSelect('COUNT(order.id)', 'orderCount')
    .addSelect('SUM(order.totalAmount)', 'totalAmount')
    .where('order.status = :status', { status: OrderStatus.PENDING })
    .andWhere('order.totalAmount > :minAmount', { minAmount: 10000 })
    .groupBy('order.userId')
    .having('COUNT(order.id) > :count', { count: 5 })
    .getRawMany();
  ```
- **나쁜 예시**:
  ```typescript
  // 단순 조회에 QueryBuilder 사용 - 불필요한 복잡성
  const order = await this.orderRepository
    .createQueryBuilder('order')
    .where('order.id = :id', { id: orderId })
    .getOne();
  ```

### find 옵션

- **규칙**: [MUST] `find` 메서드 사용 시 필요한 옵션을 명시적으로 지정한다.
- **이유**: 기본값에 의존하면 불필요한 데이터 로드나 예상치 못한 정렬 결과가 발생할 수 있다.
- **좋은 예시**:
  ```typescript
  // 필요한 relation만 명시적으로 로드
  const orders = await this.orderRepository.find({
    where: { userId: userId, status: OrderStatus.PENDING },
    relations: { items: true },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      items: { id: true, productName: true, quantity: true },
    },
    order: { createdAt: 'DESC' },
    take: 20,
    skip: 0,
  });
  ```

- **규칙**: [SHOULD] `findOneOrFail`보다 `findOne` + null 체크를 사용한다.
- **이유**: `findOneOrFail`은 TypeORM의 `EntityNotFoundError`를 던지는데, 이를 NestJS의 `NotFoundException`으로 변환하는 추가 처리가 필요하다. 직접 null 체크를 하면 비즈니스 맥락에 맞는 에러 메시지를 제공할 수 있다.
- **좋은 예시**:
  ```typescript
  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`주문 ID ${id}을(를) 찾을 수 없습니다.`);
    }

    return order;
  }
  ```

### Custom Repository 메서드 네이밍

- **규칙**: [SHOULD] Custom Repository 메서드명은 의도를 명확히 드러내는 동사로 시작한다.
- **이유**: 메서드명만으로 쿼리의 목적과 반환 타입을 파악할 수 있어 코드 가독성이 높아진다.

| 동작 | 네이밍 패턴 | 예시 |
|------|-----------|------|
| 단건 조회 | `findOneBy[조건]` | `findOneByEmail(email)` |
| 목록 조회 | `findBy[조건]` / `find[도메인]List` | `findByUserId(userId)` |
| 존재 여부 확인 | `existsBy[조건]` | `existsByEmail(email)` |
| 카운트 조회 | `countBy[조건]` | `countByStatus(status)` |

## QueryBuilder

### 사용 기준

- **규칙**: [SHOULD] QueryBuilder는 Repository API로 표현하기 어려운 복잡한 쿼리에만 사용한다.
- **이유**: QueryBuilder는 강력하지만, 문자열 기반이라 타입 안전성이 떨어지고 가독성이 낮다. 단순 쿼리는 Repository API가 더 적합하다.

### 파라미터 바인딩

- **규칙**: [MUST] QueryBuilder에서 파라미터를 바인딩할 때 반드시 `:paramName` 구문을 사용한다. 문자열 보간(interpolation)을 사용하지 않는다.
- **이유**: 문자열 보간은 SQL Injection 공격에 취약하다.
- **좋은 예시**:
  ```typescript
  const orders = await this.orderRepository
    .createQueryBuilder('order')
    .where('order.userId = :userId', { userId })
    .andWhere('order.status = :status', { status: OrderStatus.PENDING })
    .andWhere('order.createdAt >= :startDate', { startDate })
    .getMany();
  ```
- **나쁜 예시**:
  ```typescript
  // SQL Injection 취약점!
  const orders = await this.orderRepository
    .createQueryBuilder('order')
    .where(`order.userId = ${userId}`)
    .andWhere(`order.status = '${status}'`)
    .getMany();
  ```

### SELECT / JOIN 패턴

- **규칙**: [SHOULD] QueryBuilder에서 필요한 컬럼만 select하여 조회한다.
- **이유**: 불필요한 컬럼까지 조회하면 메모리 사용량과 네트워크 트래픽이 증가한다.
- **좋은 예시**:
  ```typescript
  const orders = await this.orderRepository
    .createQueryBuilder('order')
    .select(['order.id', 'order.orderNumber', 'order.totalAmount'])
    .leftJoin('order.user', 'user')
    .addSelect(['user.id', 'user.name'])
    .where('order.status = :status', { status })
    .getMany();
  ```

- **규칙**: [SHOULD] relation 데이터가 필요한 경우 `leftJoinAndSelect`를, relation 데이터 없이 조건만 필요한 경우 `leftJoin`만 사용한다.
- **이유**: `leftJoinAndSelect`는 JOIN된 Entity 데이터를 모두 로드하므로, 조건 필터링만 필요한 경우에는 `leftJoin`이 효율적이다.
- **좋은 예시**:
  ```typescript
  // relation 데이터가 필요한 경우
  const orders = await this.orderRepository
    .createQueryBuilder('order')
    .leftJoinAndSelect('order.items', 'item')
    .where('order.id = :id', { id })
    .getOne();

  // 조건 필터링만 필요한 경우 (user 데이터는 불필요)
  const orders = await this.orderRepository
    .createQueryBuilder('order')
    .leftJoin('order.user', 'user')
    .where('user.isActive = :isActive', { isActive: true })
    .getMany();
  ```

### 서브쿼리

- **규칙**: [MAY] 복잡한 집계나 조건에 서브쿼리를 사용할 수 있다.
- **이유**: 일부 비즈니스 로직은 서브쿼리 없이 표현하기 어렵다.
- **좋은 예시**:
  ```typescript
  // 주문 금액이 평균 이상인 주문 조회
  const orders = await this.orderRepository
    .createQueryBuilder('order')
    .where((qb) => {
      const subQuery = qb
        .subQuery()
        .select('AVG(o.totalAmount)')
        .from(Order, 'o')
        .getQuery();
      // 주의: 여기서의 template literal은 TypeORM이 생성한 SQL 조각이므로 안전하다.
      // 사용자 입력값을 직접 삽입하는 것과는 다르다.
      return `order.totalAmount > ${subQuery}`;
    })
    .getMany();
  ```

## Transaction 관리

### typeorm-transactional 라이브러리

- **규칙**: [MUST] 여러 테이블을 동시에 수정하는 작업은 트랜잭션으로 묶는다.
- **이유**: 트랜잭션 없이 여러 테이블을 수정하면, 중간 실패 시 데이터 정합성이 깨진다.

- **규칙**: [MUST] 트랜잭션은 `typeorm-transactional` 라이브러리의 `@Transactional()` 데코레이터를 사용한다.
- **이유**: QueryRunner 기반 트랜잭션은 `connect/startTransaction/commitTransaction/rollbackTransaction/release` 보일러플레이트가 매번 반복되고, 트랜잭션 내에서 일반 Repository 대신 `queryRunner.manager`를 사용해야 하는 제약이 있다. `@Transactional()` 데코레이터는 Async Local Storage를 활용하여 기존 Repository를 그대로 사용하면서도 트랜잭션을 자동으로 전파한다.

### 초기 설정

- **규칙**: [MUST] 애플리케이션 시작 시 `initializeTransactionalContext()`를 NestJS 컨텍스트 초기화 **이전에** 호출한다.
- **이유**: Async Local Storage 컨텍스트가 애플리케이션보다 먼저 초기화되어야 트랜잭션 전파가 정상 작동한다.
- **좋은 예시**:
  ```typescript
  // main.ts
  import { initializeTransactionalContext, StorageDriver } from 'typeorm-transactional';

  async function bootstrap() {
    initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });

    const app = await NestFactory.create(AppModule);
    await app.listen(3000);
  }
  bootstrap();
  ```

- **규칙**: [MUST] `TypeOrmModule.forRootAsync()`의 `dataSourceFactory`에서 `addTransactionalDataSource()`로 DataSource를 래핑한다.
- **이유**: `typeorm-transactional`이 DataSource의 트랜잭션 컨텍스트를 관리할 수 있도록 등록해야 한다.
- **좋은 예시**:
  ```typescript
  // app.module.ts
  import { addTransactionalDataSource } from 'typeorm-transactional';
  import { DataSource } from 'typeorm';

  @Module({
    imports: [
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          type: 'mysql',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: configService.get<string>('NODE_ENV') === 'local',
          logging: configService.get<string>('NODE_ENV') !== 'production',
        }),
        async dataSourceFactory(options) {
          if (!options) {
            throw new Error('Invalid options passed');
          }
          return addTransactionalDataSource(new DataSource(options));
        },
      }),
    ],
  })
  export class AppModule {}
  ```

### @Transactional() 데코레이터 사용

- **규칙**: [MUST] 트랜잭션이 필요한 Service 메서드에 `@Transactional()` 데코레이터를 적용한다. 기존 Repository를 그대로 사용한다.
- **이유**: 데코레이터가 Async Local Storage를 통해 트랜잭션 컨텍스트를 자동으로 전파하므로, `queryRunner.manager` 없이 일반 Repository만으로 트랜잭션이 적용된다.
- **좋은 예시**:
  ```typescript
  import { Injectable } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Transactional } from 'typeorm-transactional';

  @Injectable()
  export class OrderService {
    constructor(
      @InjectRepository(Order)
      private readonly orderRepository: Repository<Order>,

      @InjectRepository(OrderItem)
      private readonly orderItemRepository: Repository<OrderItem>,
    ) {}

    @Transactional()
    async createOrder(dto: CreateOrderDto): Promise<Order> {
      const order = this.orderRepository.create({
        userId: dto.userId,
        totalAmount: dto.totalAmount,
      });
      const savedOrder = await this.orderRepository.save(order);

      const items = dto.items.map((item) =>
        this.orderItemRepository.create({
          orderId: savedOrder.id,
          ...item,
        }),
      );
      await this.orderItemRepository.save(items);

      return savedOrder;
    }
  }
  ```
- **나쁜 예시**:
  ```typescript
  // 트랜잭션 미사용 - 중간 실패 시 데이터 정합성 위반
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = await this.orderRepository.save({ ... });
    // 여기서 에러 발생 시 order는 저장되었지만 items는 없음!
    const items = await this.orderItemRepository.save([...]);
    return order;
  }
  ```

### Propagation (트랜잭션 전파)

- **규칙**: [SHOULD] `@Transactional()` 데코레이터에 적절한 Propagation 옵션을 명시한다. 기본값은 `REQUIRED`이다.
- **이유**: 비즈니스 요구에 따라 트랜잭션 전파 방식을 제어해야 한다. 예를 들어, 감사 로그 저장은 메인 트랜잭션과 독립적으로 커밋되어야 하므로 `REQUIRES_NEW`를 사용한다.

| Propagation | 동작 | 사용 예시 |
|-------------|------|----------|
| `REQUIRED` (기본값) | 기존 트랜잭션이 있으면 참여, 없으면 새로 생성 | 일반적인 비즈니스 로직 |
| `REQUIRES_NEW` | 항상 새 트랜잭션 생성, 기존 트랜잭션은 일시 중단 | 감사 로그, 알림 발송 등 독립적으로 커밋해야 하는 작업 |
| `MANDATORY` | 기존 트랜잭션이 반드시 있어야 함, 없으면 에러 | 반드시 트랜잭션 내에서만 호출되어야 하는 내부 메서드 |
| `NESTED` | 기존 트랜잭션이 있으면 중첩 트랜잭션, 없으면 새로 생성 | 부분 롤백이 필요한 작업 |
| `NOT_SUPPORTED` | 트랜잭션 없이 실행, 기존 트랜잭션은 일시 중단 | 조회 전용 작업 |
| `NEVER` | 트랜잭션 없이 실행, 기존 트랜잭션이 있으면 에러 | 트랜잭션이 있으면 안 되는 작업 |
| `SUPPORTS` | 기존 트랜잭션이 있으면 참여, 없으면 트랜잭션 없이 실행 | 트랜잭션 유무에 관계없이 동작해야 하는 작업 |

- **좋은 예시**:
  ```typescript
  import { Transactional, Propagation } from 'typeorm-transactional';

  @Injectable()
  export class OrderService {
    @Transactional()
    async createOrder(dto: CreateOrderDto): Promise<Order> {
      const order = await this.orderRepository.save({ ... });
      await this.orderItemRepository.save([...]);

      // 감사 로그는 독립 트랜잭션으로 저장
      await this.auditService.log('ORDER_CREATED', order.id);

      return order;
    }
  }

  @Injectable()
  export class AuditService {
    @Transactional({ propagation: Propagation.REQUIRES_NEW })
    async log(action: string, targetId: string): Promise<void> {
      // 메인 트랜잭션이 롤백되어도 감사 로그는 커밋됨
      await this.auditLogRepository.save({ action, targetId });
    }
  }
  ```

### 트랜잭션 범위

- **규칙**: [MUST] 트랜잭션은 Service 레이어에서 관리한다. Controller나 Repository에서 트랜잭션을 시작하지 않는다.
- **이유**: 백엔드 컨벤션의 레이어 구조 원칙에 따라, 비즈니스 로직의 원자성 단위는 Service 레이어에서 결정한다.

- **규칙**: [MUST NOT] QueryRunner 기반의 수동 트랜잭션 관리를 사용하지 않는다.
- **이유**: `@Transactional()` 데코레이터를 사용하면 보일러플레이트가 제거되고, Repository를 그대로 사용할 수 있어 코드가 간결해진다. QueryRunner 방식은 `queryRunner.manager`를 사용해야 하는 제약 때문에 일반 Repository와 트랜잭션 Repository가 혼용되어 트랜잭션 누락 버그가 발생하기 쉽다.
- **나쁜 예시**:
  ```typescript
  // QueryRunner 기반 수동 트랜잭션 - @Transactional() 데코레이터 사용을 권장
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await queryRunner.manager.save(Order, { ... });
      await queryRunner.manager.save(OrderItem, [...]);
      await queryRunner.commitTransaction();
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  ```

## Migration 관리

### DataSource 설정 파일

- **규칙**: [MUST] TypeORM CLI를 위한 `data-source.ts` 파일을 프로젝트 루트에 생성하고, `DataSource` 인스턴스를 export한다.
- **이유**: TypeORM CLI(`migration:generate`, `migration:run` 등)는 `DataSource` 인스턴스를 필요로 한다. NestJS의 `TypeOrmModule` 설정과 별도로 CLI용 DataSource가 있어야 마이그레이션 명령어를 실행할 수 있다.
- **좋은 예시**:
  ```typescript
  // data-source.ts (프로젝트 루트)
  import { DataSource } from 'typeorm';
  import * as dotenv from 'dotenv';

  dotenv.config();

  export const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: ['src/**/*.entity{.ts,.js}'],
    migrations: ['src/migrations/*{.ts,.js}'],
    synchronize: false,
  });
  ```

### 마이그레이션 CLI

- **규칙**: [MUST] 스키마 변경은 TypeORM CLI의 마이그레이션 기능을 사용한다.
- **이유**: 마이그레이션 파일을 통해 스키마 변경 이력을 코드로 관리하고, 환경 간 일관성을 유지할 수 있다.

| 명령어 | 용도 |
|--------|------|
| `typeorm migration:generate -d <dataSource> <path>` | Entity 변경 기반 마이그레이션 자동 생성 |
| `typeorm migration:create <path>` | 빈 마이그레이션 파일 수동 생성 |
| `typeorm migration:run -d <dataSource>` | 미실행 마이그레이션 적용 |
| `typeorm migration:revert -d <dataSource>` | 마지막 마이그레이션 롤백 |

- **규칙**: [SHOULD] 가능하면 `migration:generate`를 사용하여 Entity 변경에 기반한 마이그레이션을 자동 생성한다.
- **이유**: 수동 작성보다 Entity와의 동기화 누락을 방지할 수 있다.

### 파일 네이밍 규칙

- **규칙**: [MUST] 마이그레이션 파일명은 TypeORM 기본 타임스탬프 형식을 따르되, 의미 있는 설명을 포함한다.
- **이유**: 파일명만으로 마이그레이션의 목적을 파악할 수 있어야 한다.
- **좋은 예시**:
  ```
  src/migrations/1706000000000-CreateOrderTable.ts
  src/migrations/1706100000000-AddStatusColumnToOrder.ts
  src/migrations/1706200000000-CreateOrderItemTable.ts
  ```
- **나쁜 예시**:
  ```
  src/migrations/1706000000000-Migration.ts      # 의미 불명
  src/migrations/1706100000000-Update.ts          # 너무 모호
  ```

### synchronize 설정

- **규칙**: [MUST NOT] 운영(production) 환경에서 `synchronize: true`를 사용하지 않는다.
- **이유**: `synchronize: true`는 Entity 변경 시 자동으로 스키마를 변경하여 데이터 손실이 발생할 수 있다. 컬럼 타입 변경이나 삭제가 자동으로 수행되면 운영 데이터가 파괴된다.
- **좋은 예시**:
  ```typescript
  // data-source.ts 또는 TypeORM 설정
  {
    synchronize: process.env.NODE_ENV === 'local', // 로컬 개발 환경에서만 허용
    migrationsRun: true, // 서버 시작 시 마이그레이션 자동 실행
  }
  ```
- **나쁜 예시**:
  ```typescript
  {
    synchronize: true, // 모든 환경에서 true - 운영 데이터 손실 위험!
  }
  ```

- **규칙**: [MAY] 로컬 개발 환경에서는 `synchronize: true`를 사용할 수 있다.
- **이유**: 개발 중 빠른 스키마 반영을 위해 편의상 허용하지만, 최종적으로는 마이그레이션 파일로 관리해야 한다.

### up/down 작성 규칙

- **규칙**: [MUST] 모든 마이그레이션 파일에 `up()`과 `down()` 메서드를 모두 구현한다.
- **이유**: 데이터베이스 컨벤션의 롤백 전략에 따라, 배포 실패 시 빠르게 이전 상태로 복원할 수 있어야 한다.
- **좋은 예시**:
  ```typescript
  import { MigrationInterface, QueryRunner, Table } from 'typeorm';

  export class CreateOrderTable1706000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.createTable(
        new Table({
          name: 'order',
          columns: [
            {
              name: 'id',
              type: 'char',
              length: '36',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'uuid',
            },
            {
              name: '_no',
              type: 'bigint',
              isGenerated: true,
              generationStrategy: 'increment',
              isUnique: true,
            },
            { name: 'user_id', type: 'char', length: '36', isNullable: false },
            { name: 'order_number', type: 'varchar', length: '100' },
            {
              name: 'total_amount',
              type: 'decimal',
              precision: 15,
              scale: 2,
              default: '0.00',
            },
            {
              name: 'created_at',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
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

## 성능 최적화

### Eager vs Lazy Loading

- **규칙**: [MUST] Relation의 기본 로딩 전략은 lazy(기본값)를 유지한다. 필요한 경우에만 명시적으로 relation을 로드한다.
- **이유**: Eager loading이 기본이면 단순 목록 조회에서도 모든 관련 Entity를 자동으로 로드하여 불필요한 쿼리가 다수 발생한다.
- **좋은 예시**:
  ```typescript
  // 필요한 경우에만 relations 옵션으로 명시적 로드
  const order = await this.orderRepository.findOne({
    where: { id },
    relations: { items: true, user: true }, // 명시적으로 필요한 relation만 로드
  });
  ```

### N+1 문제 방지

- **규칙**: [MUST NOT] 루프 안에서 relation을 개별적으로 로드하지 않는다.
- **이유**: N건의 데이터에 대해 N번의 추가 쿼리가 발생하면 성능이 급격히 저하된다.
- **좋은 예시**:
  ```typescript
  // Repository API: relations 옵션으로 한 번에 조회
  const orders = await this.orderRepository.find({
    where: { userId },
    relations: { items: true },
  });

  // QueryBuilder: leftJoinAndSelect로 한 번에 조회
  const orders = await this.orderRepository
    .createQueryBuilder('order')
    .leftJoinAndSelect('order.items', 'item')
    .where('order.userId = :userId', { userId })
    .getMany();
  ```
- **나쁜 예시**:
  ```typescript
  // N+1 문제 발생!
  const orders = await this.orderRepository.find({
    where: { userId },
  });

  for (const order of orders) {
    // 주문 건수(N)만큼 추가 쿼리 발생
    order.items = await this.orderItemRepository.find({
      where: { orderId: order.id },
    });
  }
  ```

### 필요한 컬럼만 조회

- **규칙**: [SHOULD] 전체 컬럼이 필요하지 않은 경우 `select` 옵션으로 필요한 컬럼만 조회한다.
- **이유**: 불필요한 컬럼을 조회하면 메모리 사용량과 네트워크 전송량이 증가한다.
- **좋은 예시**:
  ```typescript
  // 목록 조회 시 필요한 컬럼만 선택
  const orders = await this.orderRepository.find({
    where: { userId },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      createdAt: true,
    },
  });
  ```

### 페이지네이션

- **규칙**: [MUST] 목록 조회 시 `take`와 `skip` 옵션으로 페이지네이션을 적용한다.
- **이유**: 전체 데이터를 한 번에 로드하면 메모리 부족과 응답 시간 증가를 유발한다.
- **좋은 예시**:
  ```typescript
  async findOrderList(
    userId: number,
    page: number,
    size: number,
  ): Promise<{ items: Order[]; totalItems: number }> {
    const [items, totalItems] = await this.orderRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: size,
      skip: (page - 1) * size,
    });

    return { items, totalItems };
  }
  ```

- **규칙**: [SHOULD] 대량 데이터 조회 시 `findAndCount`를 사용하여 데이터와 전체 건수를 한 번에 조회한다.
- **이유**: 데이터 조회와 건수 조회를 별도로 수행하면 불필요한 쿼리가 추가된다.

## NestJS 통합

### 모듈 설정

- **규칙**: [MUST] TypeORM 설정은 `TypeOrmModule.forRootAsync()`를 사용하여 환경 변수 기반으로 구성한다.
- **이유**: `forRoot()`에 설정을 하드코딩하면 환경별 분리가 어렵다. `forRootAsync()`로 ConfigService를 주입하여 환경별 설정을 관리한다.
- **좋은 예시**:
  ```typescript
  // app.module.ts
  import { addTransactionalDataSource } from 'typeorm-transactional';
  import { DataSource } from 'typeorm';

  @Module({
    imports: [
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          type: 'mysql',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: configService.get<string>('NODE_ENV') === 'local',
          logging: configService.get<string>('NODE_ENV') !== 'production',
        }),
        async dataSourceFactory(options) {
          if (!options) {
            throw new Error('Invalid options passed');
          }
          return addTransactionalDataSource(new DataSource(options));
        },
      }),
    ],
  })
  export class AppModule {}
  ```
- **나쁜 예시**:
  ```typescript
  // 설정 하드코딩 - 환경별 분리 불가
  TypeOrmModule.forRoot({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'password',
    database: 'mydb',
    synchronize: true, // 운영에서 위험!
  })
  ```

### Entity 등록

- **규칙**: [MUST] 각 Feature Module에서 `TypeOrmModule.forFeature()`를 사용하여 해당 모듈에서 사용하는 Entity를 등록한다.
- **이유**: NestJS의 모듈 캡슐화 원칙에 따라, Entity를 사용하는 모듈에서만 등록하고 주입받는다.
- **좋은 예시**:
  ```typescript
  // modules/order/order.module.ts
  @Module({
    imports: [TypeOrmModule.forFeature([Order, OrderItem])],
    controllers: [OrderController],
    providers: [OrderService],
    exports: [OrderService],
  })
  export class OrderModule {}
  ```

### Repository 주입

- **규칙**: [MUST] Repository는 `@InjectRepository()` 데코레이터를 사용하여 생성자 주입으로 받는다.
- **이유**: NestJS DI 컨테이너를 통해 Repository를 관리하여 테스트 시 Mock 교체가 가능하다.
- **좋은 예시**:
  ```typescript
  @Injectable()
  export class OrderService {
    constructor(
      @InjectRepository(Order)
      private readonly orderRepository: Repository<Order>,

      @InjectRepository(OrderItem)
      private readonly orderItemRepository: Repository<OrderItem>,

      private readonly dataSource: DataSource,
    ) {}
  }
  ```
- **나쁜 예시**:
  ```typescript
  @Injectable()
  export class OrderService {
    constructor() {
      // DI를 사용하지 않고 직접 Repository 획득 - 테스트 시 Mock 불가
      this.orderRepository = AppDataSource.getRepository(Order);
    }
  }
  ```

### DataSource 주입

- **규칙**: [MUST] 트랜잭션 처리 등 DataSource가 필요한 경우, NestJS DI를 통해 주입받는다.
- **이유**: DI를 통한 주입은 테스트 시 DataSource를 Mock으로 교체할 수 있게 한다.
- **좋은 예시**:
  ```typescript
  @Injectable()
  export class OrderService {
    constructor(private readonly dataSource: DataSource) {}

    async createOrder(dto: CreateOrderDto): Promise<Order> {
      const queryRunner = this.dataSource.createQueryRunner();
      // ... 트랜잭션 처리
    }
  }
  ```

## 안티패턴

### synchronize: true 운영 사용

- **규칙**: [MUST NOT] 운영 환경에서 `synchronize: true`를 설정하지 않는다.
- **이유**: Entity 변경 시 자동으로 컬럼 삭제, 타입 변경이 수행되어 운영 데이터가 손실될 수 있다.

### Entity에 비즈니스 로직 포함

- **규칙**: [MUST NOT] Entity 클래스에 비즈니스 로직을 작성하지 않는다.
- **이유**: Entity는 데이터 구조(스키마) 정의만 담당한다. 비즈니스 로직은 Service 레이어에 위치해야 한다.
- **나쁜 예시**:
  ```typescript
  @Entity('order')
  export class Order extends BaseEntity {
    @Column({ type: 'decimal', precision: 15, scale: 2 })
    totalAmount: number;

    // Entity에 비즈니스 로직 - 금지!
    calculateDiscount(): number {
      if (this.totalAmount > 100000) return this.totalAmount * 0.1;
      return 0;
    }

    // Entity에 검증 로직 - 금지!
    isValidOrder(): boolean {
      return this.totalAmount > 0 && this.items.length > 0;
    }
  }
  ```

### Raw Query 남용

- **규칙**: [MUST NOT] `query()` 메서드로 직접 SQL을 실행하지 않는다. QueryBuilder나 Repository API를 사용한다.
- **이유**: Raw Query는 타입 안전성이 없고, 데이터베이스 종류에 종속적이며, SQL Injection 위험이 높다.
- **나쁜 예시**:
  ```typescript
  // Raw Query 직접 실행 - 타입 안전성 없음, DB 종속적
  const result = await this.dataSource.query(
    `SELECT o.*, u.name FROM \`order\` o JOIN user u ON o.user_id = u.id WHERE o.status = ?`,
    [status],
  );
  ```

### 트랜잭션 미사용

- **규칙**: [MUST NOT] 여러 테이블을 수정하는 작업에서 트랜잭션을 생략하지 않는다. `@Transactional()` 데코레이터를 적용한다.
- **이유**: 중간 실패 시 일부만 반영되어 데이터 정합성이 깨진다.

### 문자열 보간으로 쿼리 작성

- **규칙**: [MUST NOT] QueryBuilder에서 문자열 보간(template literal, string concatenation)으로 값을 삽입하지 않는다.
- **이유**: SQL Injection 공격에 직접적으로 취약해진다.

### Entity 순환 참조

- **규칙**: [MUST NOT] Relation 타입에 `Relation<>` 래퍼 없이 Entity 클래스를 직접 참조하지 않는다.
- **이유**: TypeScript의 모듈 해석 과정에서 순환 참조가 발생하면 런타임에 `undefined` Entity 참조 에러가 발생한다.

## 참고 자료

- [TypeORM 공식 문서](https://typeorm.io/)
- [TypeORM GitHub Repository](https://github.com/typeorm/typeorm)
- [typeorm-transactional GitHub Repository](https://github.com/Aliheym/typeorm-transactional)
- [NestJS Database (TypeORM) 공식 문서](https://docs.nestjs.com/techniques/database)
- [TypeORM Migration 가이드](https://typeorm.io/migrations)
- [TypeORM Relations 가이드](https://typeorm.io/relations)
- [TypeORM DECIMAL 컬럼 string 반환 이슈](https://github.com/typeorm/typeorm/issues/2937)
- [TypeORM ValueTransformer로 decimal 처리하기](https://medium.com/@matthew.bajorek/how-to-properly-handle-decimals-with-typeorm-f0eb2b79ca9c)
