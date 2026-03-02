# MySQL Convention

> This document defines the rules applied to MySQL projects.
> Parent rules: DATABASE_CONVENTION.md

## Tech Stack

| Item | Version/Setting |
|------|----------|
| Storage Engine | InnoDB (default) |

## Naming Rules

> Default naming rules follow DATABASE_CONVENTION.md. Below defines only MySQL-specific rules.

### Table Names

- **Rule**: [MUST] Table names must be written in lowercase snake_case, singular form.
- **Good Example**:
  ```sql
  CREATE TABLE `order` ( ... );
  CREATE TABLE order_item ( ... );
  CREATE TABLE user_address ( ... );
  ```

### Field COMMENT

- **Rule**: [MUST] Add a COMMENT to all fields describing the field's purpose and constraints.
- **Good Example**:
  ```sql
  CREATE TABLE `order` (
      id CHAR(36) NOT NULL PRIMARY KEY COMMENT '주문 고유 식별자 (UUID v4)',
      _no BIGINT AUTO_INCREMENT NOT NULL COMMENT '자동 증가 순번 (정렬/페이지네이션용)',
      user_id CHAR(36) NOT NULL COMMENT '주문자 ID (user.id FK)',
      total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT '주문 총 금액 (KRW, 소수점 2자리)',
      status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '주문 상태: pending, confirmed, shipped, delivered, cancelled',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '주문 생성 일시 (UTC)',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종 수정 일시 (UTC)',
      UNIQUE KEY uq_order__no (_no)
  );
  ```

## Monetary Value Handling

> Default rules for DECIMAL usage follow DATABASE_CONVENTION.md. Below is the MySQL-specific precision guide.

### DECIMAL Precision

- **Rule**: [SHOULD] The default precision for monetary fields is `DECIMAL(15, 2)`. Use `DECIMAL(15, 4)` when GAAP compliance is required.
- **Good Example**:
  ```sql
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT '주문 총 금액 (KRW)',
  unit_price DECIMAL(15, 4) NOT NULL DEFAULT 0.0000 COMMENT '단가 (GAAP 4자리 소수점)',
  ```

## Timezone

### Server/Session Timezone UTC Setting

- **Rule**: [MUST] Set the MySQL server's global timezone and session timezone to UTC (`'+00:00'`).
- **Good Example**:
  ```ini
  # my.cnf (MySQL 설정 파일)
  [mysqld]
  default_time_zone = '+00:00'
  ```
  ```typescript
  // TypeORM 데이터소스 설정
  const dataSource = new DataSource({
    type: 'mysql',
    timezone: '+00:00',
    // ...
  });
  ```

### Application Connection UTC Setting

- **Rule**: [MUST] Explicitly set the session timezone to UTC when connecting to MySQL from the application.
- **Good Example**:
  ```sql
  SET SESSION time_zone = '+00:00';
  SELECT @@session.time_zone;  -- '+00:00'
  ```
  ```typescript
  // TypeORM - 연결 옵션에서 타임존 명시
  const dataSource = new DataSource({
    type: 'mysql',
    timezone: '+00:00',
  });
  ```

## SQL Style

### Uppercase Keywords

- **Rule**: [MUST] SQL reserved words (keywords) must be written in uppercase.
- **Good Example**:
  ```sql
  SELECT u.id, u.email, u.name
  FROM user u
  WHERE u.is_active = 1
  ORDER BY u.created_at DESC;
  ```

### Indentation and Line Breaks

- **Rule**: [SHOULD] Major SQL clauses (SELECT, FROM, WHERE, JOIN, ORDER BY, GROUP BY, etc.) should each be written on a new line, and items within clauses should be indented.
- **Good Example**:
  ```sql
  SELECT
      o.id,
      o.total_amount,
      u.name AS user_name
  FROM `order` o
  INNER JOIN user u
      ON o.user_id = u.id
  WHERE o.status = 'completed'
      AND o.created_at >= '2025-01-01'
  ORDER BY o.created_at DESC
  LIMIT 100;
  ```

### JOIN Syntax

- **Rule**: [MUST] Explicitly specify the JOIN type. (INNER JOIN, LEFT JOIN, etc.) Do not use implicit JOINs (listing tables separated by commas).
- **Good Example**:
  ```sql
  SELECT o.id, u.name
  FROM `order` o
  INNER JOIN user u
      ON o.user_id = u.id;
  ```
- **Rule**: [SHOULD] Use table aliases when joining 3 or more tables.

### Subquery vs JOIN

- **Rule**: [SHOULD] Use JOINs over subqueries when possible. The MySQL optimizer generally optimizes JOINs more efficiently.

## Data Types

> Common data type rules follow DATABASE_CONVENTION.md. Below are MySQL-specific type rules.

### Integer Types

| Type | Size | Range (UNSIGNED) | Usage Criteria |
|------|------|-----------------|----------|
| TINYINT | 1 byte | 0 ~ 255 | boolean, status values |
| INT | 4 bytes | 0 ~ ~4.2 billion | general integers |
| BIGINT | 8 bytes | 0 ~ ~18.4 quintillion | `_no`, large-scale counters |

- **Rule**: [SHOULD] Use TINYINT(1) for boolean values. (MySQL does not have a native BOOLEAN type)

### String Types

| Type | Usage Criteria |
|------|----------|
| VARCHAR(n) | Strings with predictable maximum length (up to 65,535 bytes) |
| TEXT | Long text where length is difficult to predict |
| CHAR(n) | Fixed-length strings (e.g., country code `KR`, currency code `KRW`) |

- **Rule**: [MUST NOT] Do not specify meaninglessly large lengths for VARCHAR. (Temporary tables may allocate memory up to the specified maximum length)

### Date/Time Types

| Type | Range | Size | Usage Criteria |
|------|------|------|----------|
| DATETIME | 1000-01-01 ~ 9999-12-31 | 8 bytes | General date/time storage |
| TIMESTAMP | 1970-01-01 ~ 2038-01-19 | 4 bytes | Do not use (see rule below) |
| DATE | 1000-01-01 ~ 9999-12-31 | 3 bytes | When only the date is needed (e.g., date of birth) |

- **Rule**: [MUST] Date/time fields must use the DATETIME type. Do not use TIMESTAMP. (TIMESTAMP has a 2038 limitation, and automatic timezone conversion causes confusion under a UTC storage policy)
- **Rule**: [MUST NOT] Do not store date/time values as strings (VARCHAR).

### JSON Type

- **Rule**: [MAY] JSON type may be used for unstructured data with flexible structure or frequently changing schemas.
- **Rule**: [MUST NOT] Do not store structured data that can be normalized in JSON. (Fields within JSON are difficult to index directly and cannot be joined)
- **Good Example**:
  ```sql
  -- 외부 API 응답, 사용자 설정 등 유동적 데이터
  CREATE TABLE api_log (
      id CHAR(36) NOT NULL PRIMARY KEY,
      _no BIGINT AUTO_INCREMENT NOT NULL,
      response_body JSON,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_api_log__no (_no)
  );
  ```

### ENUM Type

- **Rule**: [MUST NOT] Do not use the ENUM type. (Adding/modifying values requires ALTER TABLE, causes ORM compatibility issues, and integer-based sorting produces unexpected results)
- **Good Example**:
  ```sql
  -- 상태값은 VARCHAR 또는 참조 테이블 사용
  status VARCHAR(20) NOT NULL DEFAULT 'pending'

  -- 또는 별도 참조 테이블 사용
  CREATE TABLE order_status (
      id TINYINT PRIMARY KEY,
      name VARCHAR(20) NOT NULL UNIQUE
  );
  ```

## Indexes

> Common index strategies follow DATABASE_CONVENTION.md. Below are MySQL-specific index rules.

### Full-text Index

- **Rule**: [MAY] Full-text indexes may be used when text search is needed. (`LIKE '%keyword%'` cannot utilize indexes)
- **Good Example**:
  ```sql
  CREATE FULLTEXT INDEX ft_idx_product_name_desc
      ON product (name, description);

  SELECT * FROM product
  WHERE MATCH(name, description) AGAINST('무선 키보드' IN BOOLEAN MODE);
  ```

### Partitioning Strategy

- **Rule**: [MAY] Partitioning may be considered for large-scale tables (tens of millions of rows or more).
- **Rule**: [SHOULD] Choose partition keys from columns frequently used in query WHERE conditions.
- **Good Example**:
  ```sql
  CREATE TABLE log (
      id CHAR(36) NOT NULL,
      _no BIGINT AUTO_INCREMENT NOT NULL,
      message TEXT,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id, created_at),
      UNIQUE KEY uq_log__no (_no)
  )
  PARTITION BY RANGE (YEAR(created_at)) (
      PARTITION p2024 VALUES LESS THAN (2025),
      PARTITION p2025 VALUES LESS THAN (2026),
      PARTITION p_future VALUES LESS THAN MAXVALUE
  );
  ```

## Query Optimization

### Using EXPLAIN

- **Rule**: [MUST] New queries or queries suspected of performance issues must be verified with EXPLAIN to check the execution plan.
- **Good Example**:
  ```sql
  EXPLAIN SELECT o.id, o.total_amount
  FROM `order` o
  WHERE o.user_id = 100
      AND o.status = 'completed';

  -- 주요 확인 항목:
  -- type: ALL(풀스캔) 이면 인덱스 추가 검토
  -- key: 사용된 인덱스 확인
  -- rows: 스캔 예상 행 수
  -- Extra: Using filesort, Using temporary 확인
  ```

### Slow Queries

- **Rule**: [MUST] Enable slow query logging and monitor it periodically.
- **Rule**: [SHOULD] Set the slow query threshold to 1 second. (Adjustable based on project characteristics)

### Precautions When Analyzing Execution Plans

| EXPLAIN Item | Warning Signal | Action |
|-------------|----------|----------|
| type = ALL | Full Table Scan | Add appropriate indexes |
| type = index | Full Index Scan | Review indexes matching WHERE conditions |
| Extra: Using filesort | File sort occurring | Add index on ORDER BY columns |
| Extra: Using temporary | Temporary table usage | Optimize GROUP BY/ORDER BY |
| Very large rows value | Large-scale row scan | Improve indexes or query structure |

### Pagination

- **Rule**: [SHOULD] For large data pagination, use cursor-based (keyset) pagination instead of OFFSET-based pagination.
- **Good Example**:
  ```sql
  -- 커서 기반 페이지네이션 (이전 페이지 마지막 id 이후의 데이터 조회)
  SELECT id, title, created_at
  FROM article
  WHERE id > 1000
  ORDER BY id ASC
  LIMIT 20;
  ```

## Anti-patterns

> Common anti-patterns follow DATABASE_CONVENTION.md. Below are MySQL-specific anti-patterns.

### Excessive Subqueries

- **Rule**: [SHOULD] Use JOIN or EXISTS instead of WHERE IN subqueries.
- **Good Example**:
  ```sql
  SELECT u.id, u.name
  FROM user u
  WHERE EXISTS (
      SELECT 1 FROM `order` o WHERE o.user_id = u.id
  );
  ```

### Index Invalidation Patterns

- **Rule**: [MUST NOT] Do not apply functions or operations to indexed columns.
- **Good Example**:
  ```sql
  -- 범위 조건으로 변환하여 인덱스 활용
  SELECT * FROM `order`
  WHERE created_at >= '2025-01-01'
      AND created_at < '2025-02-01';
  ```
  -- Note: `WHERE YEAR(created_at) = 2025`와 같이 함수를 적용하면 인덱스가 무효화됨

### Leading Wildcard in LIKE

- **Rule**: [MUST NOT] Do not use a leading wildcard in LIKE patterns. (`LIKE '%keyword'` cannot utilize indexes)
- **Good Example**:
  ```sql
  SELECT * FROM user WHERE name LIKE '김%';
  ```

### Bulk Data Batch Processing

- **Rule**: [MUST NOT] Do not process large INSERT/UPDATE/DELETE operations in a single transaction. (Long transactions cause lock contention, replication lag, and undo log bloat)
- **Good Example**:
  ```sql
  -- 배치 단위로 나누어 처리
  DELETE FROM log
  WHERE created_at < '2024-01-01'
  LIMIT 1000;
  -- 반복 실행하여 전체 데이터를 처리
  ```