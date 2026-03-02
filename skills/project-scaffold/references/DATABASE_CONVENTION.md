# Database Convention

> This document defines common rules that apply across the entire database.
> For rules specific to a particular database, refer to the documents in the subdirectories.
>
> - [MySQL Convention](mysql/MYSQL_CONVENTION.md)
> - [Redis Convention](redis/REDIS_CONVENTION.md)

## Modeling Principles

### Normalization Level

- **Rule**: [SHOULD] Design targeting Third Normal Form (3NF) by default.
- **Rule**: [MAY] Intentional denormalization is allowed when read performance is critical. However, when denormalizing, the approach for maintaining data consistency must be documented.

### ERD Standards

- **Rule**: [MUST] Major domain entities and relationships must be documented as an ERD.
- **Rule**: [SHOULD] The ERD should specify table names, key columns, PK/FK relationships, and cardinality.

### Relationship Design Principles

- **Rule**: [MUST] Define relationships between tables explicitly through foreign keys (FK).
- **Rule**: [SHOULD] Many-to-many (M:N) relationships should use a junction table.

## Naming Rules

### Table Naming

- **Rule**: [MUST] Table names must use `snake_case` in English.
- **Note**: Singular/plural form follows the convention of each DB engine. MySQL uses singular form. (→ [MySQL Convention - Table Names](mysql/MYSQL_CONVENTION.md))
- **Good Example**:
  ```sql
  CREATE TABLE user (...);
  CREATE TABLE order_item (...);
  CREATE TABLE shipping_address (...);
  ```

### Column Naming

- **Rule**: [MUST] Column names must use lowercase `snake_case`.
- **Rule**: [MUST] PK columns are named `id` (UUID), and sequential identifier columns are named `_no` (AUTO_INCREMENT).
- **Rule**: [MUST] FK columns follow the `{referenced_table_singular}_id` pattern.
- **Good Example**:
  ```sql
  -- user 테이블의 PK
  id CHAR(36) NOT NULL PRIMARY KEY  -- UUID
  _no BIGINT AUTO_INCREMENT NOT NULL, UNIQUE KEY uq_user__no (_no)

  -- order 테이블에서 user를 참조하는 FK
  user_id CHAR(36) NOT NULL  -- UUID FK
  ```
- **Rule**: [MUST NOT] Do not use data type names in column names. (e.g., `text`, `timestamp`, `number`)
- **Rule**: [SHOULD] Boolean columns should use `is_`, `has_`, `can_` prefixes.
- **Good Example**:
  ```sql
  is_active TINYINT(1) NOT NULL DEFAULT 1
  has_verified_email TINYINT(1) NOT NULL DEFAULT 0
  ```
- **Rule**: [MUST NOT] Do not use the `no_` prefix to express negation. `no_` causes confusion with sequential identifiers (`_no`) and can be mistaken as an abbreviation for Number. Instead, combine `is_`, `has_`, `can_` prefixes with clearly meaningful adjectives.
- **Bad Example**:
  ```sql
  no_stock TINYINT(1) NOT NULL DEFAULT 0
  no_delivery TINYINT(1) NOT NULL DEFAULT 0
  ```
- **Good Example**:
  ```sql
  is_out_of_stock TINYINT(1) NOT NULL DEFAULT 0
  is_delivery_available TINYINT(1) NOT NULL DEFAULT 1
  ```

### Index Naming

- **Rule**: [MUST] Index names must follow the `idx_{table_name}_{column_name}` pattern.
- **Good Example**:
  ```sql
  CREATE INDEX idx_order_user_id ON `order` (user_id);
  CREATE INDEX idx_order_created_at_status ON `order` (created_at, status);
  ```

### Constraint Naming

- **Rule**: [SHOULD] Constraints should follow the patterns below.

| Constraint | Pattern | Example |
|------------|---------|---------|
| Primary Key | `pk_{table_name}` | `pk_user` |
| Foreign Key | `fk_{table_name}_{referenced_table_name}` | `fk_order_user` |
| Unique | `uq_{table_name}_{column_name}` | `uq_user_email` |
| Check | `ck_{table_name}_{column_name}` | `ck_order_amount_positive` |

## Common Fields

### Required Common Fields

- **Rule**: [MUST] All tables must include the following common fields.

| Field | Type | Description |
|-------|------|-------------|
| `id` | CHAR(36) | PK. Stores a UUID value |
| `_no` | BIGINT, AUTO_INCREMENT, UNIQUE | Internal sequential identifier. Uses a UNIQUE KEY index |
| `created_at` | DATETIME | Record creation timestamp (UTC) |
| `updated_at` | DATETIME | Record last modified timestamp (UTC) |

### Soft Delete

- **Rule**: [SHOULD] Tables that require deletion history for business purposes should apply soft delete via a `deleted_at` field.

| Field | Type | Description |
|-------|------|-------------|
| `deleted_at` | DATETIME, NULLABLE | NULL means active, a value means deleted |

- **Good Example**:
  ```sql
  CREATE TABLE user (
      id CHAR(36) NOT NULL PRIMARY KEY,
      _no BIGINT AUTO_INCREMENT NOT NULL,
      email VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL,
      UNIQUE KEY uq_user__no (_no)
  );

  -- 삭제 처리
  UPDATE user SET deleted_at = NOW() WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  -- 활성 데이터 조회
  SELECT * FROM user WHERE deleted_at IS NULL;
  ```

- **Rule**: [MUST] Tables with soft delete must always include the `deleted_at IS NULL` condition in default queries.

### ID Strategy

- **Rule**: [MUST] PK (`id`) stores UUID (v4) values as `CHAR(36)` type.
- **Rule**: [MUST] All tables must have a `_no` column (BIGINT AUTO_INCREMENT) with a UNIQUE KEY index.
- **Rule**: [MUST NOT] Do not expose `_no` values in external API responses. Always use `id` (UUID) for external interfaces.

## Data Types

### Type Selection Criteria

- **Rule**: [MUST] Choose the smallest type appropriate for the data to be stored.

### Strings

- **Rule**: [SHOULD] Use `VARCHAR(n)` for strings with fixed or predictable length, and `TEXT` types for large text with unpredictable length.

| Purpose | Recommended Type | Example |
|---------|-----------------|---------|
| Email | VARCHAR(255) | `user@example.com` |
| Name | VARCHAR(100) | `홍길동` |
| URL | VARCHAR(2048) | `https://...` |
| Body, Description | TEXT | Free-form text |

### Date/Time

- **Rule**: [MUST] Store date/time data in UTC, and convert to the appropriate timezone when displaying.
- **Rule**: [SHOULD] Use ISO 8601 format (YYYY-MM-DD HH:MM:SS) as the standard.

### Monetary/Decimal Values

- **Rule**: [MUST] Use `DECIMAL(precision, scale)` type for monetary data. Do not use `FLOAT`/`DOUBLE`.
- **Good Example**:
  ```sql
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00
  ```

## Index Strategy

### Index Creation Criteria

- **Rule**: [SHOULD] Create indexes on columns frequently used in WHERE, JOIN, and ORDER BY clauses.
- **Rule**: [MUST NOT] Do not create unnecessary indexes on small tables with a few hundred rows or fewer.
- **Rule**: [SHOULD] Keep the number of indexes per table to 5 or fewer.

### Composite Index Order

- **Rule**: [MUST] In composite indexes, place columns with higher cardinality (better selectivity) first.
- **Good Example**:
  ```sql
  -- user_id has higher cardinality than status, so it is placed first
  CREATE INDEX idx_order_user_id_status ON `order` (user_id, status);
  ```

### Covering Index

- **Rule**: [MAY] For frequently executed queries, a covering index that includes the SELECT target columns in the index may be used.
- **Good Example**:
  ```sql
  -- user_id로 검색하고 email만 반환하는 쿼리가 빈번한 경우
  CREATE INDEX idx_user_user_id_email ON user (user_id, email);

  -- 인덱스만으로 응답 가능 (Extra: Using index)
  SELECT user_id, email FROM user WHERE user_id = 100;
  ```

## Migration

### Migration File Management

- **Rule**: [MUST] Schema changes must be managed through migration files. Do not execute DDL directly on the DB manually.
- **Rule**: [MUST] Migration file names must be timestamp-based to guarantee ordering.
- **Good Example**:
  ```
  20250101_000001_create_user_table.sql
  20250101_000002_add_email_index_to_user.sql
  20250115_000001_create_order_table.sql
  ```

### Rollback Strategy

- **Rule**: [MUST] All migrations must include a rollback (down) script.
- **Good Example**:
  ```sql
  -- up: 테이블 생성
  CREATE TABLE `order` (
      id CHAR(36) NOT NULL PRIMARY KEY,
      _no BIGINT AUTO_INCREMENT NOT NULL,
      user_id CHAR(36) NOT NULL,
      total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_order__no (_no)
  );

  -- down: 롤백
  DROP TABLE IF EXISTS `order`;
  ```

### Zero-Downtime Schema Changes

- **Rule**: [MUST] Schema changes in production must be performable without service interruption.
- **Rule**: [SHOULD] Schema changes on large tables should follow this sequence:
  1. Add new column (nullable or with default value) -- compatible with existing code
  2. Deploy code to use the new column in the application
  3. Migrate existing data in batches
  4. Add NOT NULL constraint if needed
  5. Remove old column (in a separate migration)
- **Rule**: [MUST NOT] Do not perform column renames or deletions in a single deployment in production.

## Business Logic Management

### No FUNCTION / Trigger Usage

- **Rule**: [MUST NOT] Do not use database-internal FUNCTIONs, Triggers, or Stored Procedures. All business logic must be implemented in application code.
- **Good Example**:
  ```typescript
  // 애플리케이션 코드에서 비즈니스 로직 처리
  async function updateOrderStatus(orderId: string, newStatus: string) {
      const order = await orderRepository.findById(orderId);
      order.validateStatusTransition(newStatus);
      order.status = newStatus;
      order.updatedAt = new Date();
      await orderRepository.save(order);
      await notificationService.sendStatusChangeEmail(order);
  }
  ```

## Anti-Patterns

### SELECT * Usage

- **Rule**: [MUST NOT] Do not use `SELECT *` in production code.
- **Good Example**:
  ```sql
  SELECT id, email, name FROM user WHERE id = 'uuid-value';
  ```

### N+1 Query

- **Rule**: [MUST NOT] Do not execute queries repeatedly inside a loop.
- **Good Example**:
  ```sql
  -- JOIN으로 한 번에 조회
  SELECT o.id, o.total_amount, u.name
  FROM `order` o
  INNER JOIN user u ON o.user_id = u.id
  WHERE o.created_at >= '2025-01-01';
  ```

### Implicit Type Conversion

- **Rule**: [MUST NOT] Do not compare a column with a value of a different type in WHERE conditions. (This invalidates indexes and causes Full Table Scan)

### NULL Comparison Errors

- **Rule**: [MUST NOT] Do not use `=` or `!=` operators for NULL comparisons. Use `IS NULL` / `IS NOT NULL`.
- **Good Example**:
  ```sql
  SELECT * FROM user WHERE deleted_at IS NULL;
  ```