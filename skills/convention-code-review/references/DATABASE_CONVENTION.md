# 데이터베이스 컨벤션

> 이 문서는 데이터베이스 전체에 적용되는 공통 규칙을 정의합니다.
> 특정 데이터베이스에 종속적인 규칙은 하위 폴더의 문서를 참조하세요.
>
> - [MySQL 컨벤션](mysql/MYSQL_CONVENTION.md)
> - [Redis 컨벤션](redis/REDIS_CONVENTION.md)

## 모델링 원칙

### 정규화 수준

- **규칙**: [SHOULD] 기본적으로 제3정규형(3NF)을 목표로 설계한다.
- **이유**: 데이터 중복을 최소화하고 갱신 이상(anomaly)을 방지하면서도, 과도한 정규화로 인한 조인 복잡성을 피할 수 있는 적절한 균형점이다.

- **규칙**: [MAY] 읽기 성능이 중요한 경우, 의도적으로 반정규화(denormalization)할 수 있다.
- **이유**: 읽기 빈도가 높은 테이블에서 과도한 조인은 성능 저하를 유발한다. 단, 반정규화 시 데이터 정합성 유지 방안을 반드시 문서화한다.

### ERD 작성 기준

- **규칙**: [MUST] 주요 도메인 엔티티와 관계는 ERD로 문서화한다.
- **이유**: ERD는 팀 전체의 데이터 모델 이해를 돕고, 신규 팀원 온보딩과 리뷰를 빠르게 한다.

- **규칙**: [SHOULD] ERD에는 테이블명, 주요 컬럼, PK/FK 관계, 카디널리티를 명시한다.
- **이유**: 테이블 간 관계를 한눈에 파악할 수 있어야 설계 리뷰와 쿼리 작성이 효율적이다.

### 관계 설계 원칙

- **규칙**: [MUST] 외래 키(FK)를 통해 테이블 간 관계를 명시적으로 정의한다.
- **이유**: 암묵적 관계(애플리케이션 레벨에서만 관리하는 관계)는 데이터 정합성을 보장하지 못한다.

- **규칙**: [SHOULD] 다대다(M:N) 관계는 중간 테이블(junction table)을 사용한다.
- **이유**: 직접적인 M:N 관계는 RDBMS에서 표현할 수 없으며, 중간 테이블을 통해 관계 속성 확장도 가능해진다.

## 네이밍 규칙

### 테이블 네이밍

- **규칙**: [MUST] 테이블명은 `snake_case` 복수형 영문을 사용한다.
- **이유**: snake_case는 SQL에서 가독성이 높고, 복수형은 테이블이 레코드의 집합(collection)임을 명확히 한다.
- **좋은 예시**:
  ```sql
  CREATE TABLE users (...);
  CREATE TABLE order_items (...);
  CREATE TABLE shipping_addresses (...);
  ```
- **나쁜 예시**:
  ```sql
  CREATE TABLE User (...);          -- PascalCase, 단수형
  CREATE TABLE tbl_order_item (...); -- 불필요한 접두사, 단수형
  CREATE TABLE OrderItems (...);     -- camelCase 사용
  ```

### 컬럼 네이밍

- **규칙**: [MUST] 컬럼명은 `snake_case` 소문자를 사용한다.
- **이유**: 일관된 케이스 규칙은 쿼리 작성 시 혼란을 방지한다.

- **규칙**: [MUST] PK 컬럼은 `id`(UUID)로 명명하고, 순차 식별자 컬럼은 `_no`(AUTO_INCREMENT)로 명명한다.
- **이유**: `id`는 외부 노출용 식별자, `_no`는 내부 전용 순차 식별자로 역할을 명확히 구분한다.

- **규칙**: [MUST] FK 컬럼은 `{참조_테이블_단수형}_id` 패턴을 따른다.
- **이유**: 컬럼명만으로 어떤 테이블을 참조하는지 명확히 파악할 수 있다.
- **좋은 예시**:
  ```sql
  -- users 테이블의 PK
  id CHAR(36) NOT NULL PRIMARY KEY  -- UUID
  _no BIGINT AUTO_INCREMENT NOT NULL, UNIQUE KEY uq_users__no (_no)

  -- orders 테이블에서 users를 참조하는 FK
  user_id CHAR(36) NOT NULL  -- UUID FK
  ```
- **나쁜 예시**:
  ```sql
  user_pk CHAR(36) PRIMARY KEY  -- 비표준 PK 이름
  uid CHAR(36) NOT NULL          -- 약어로 인한 모호함
  ```

- **규칙**: [MUST NOT] 컬럼명에 데이터 타입을 사용하지 않는다. (예: `text`, `timestamp`, `number`)
- **이유**: 타입은 이름이 아니라 스키마 정보다. 컬럼명은 해당 값의 의미를 표현해야 한다.

- **규칙**: [SHOULD] boolean 컬럼은 `is_`, `has_`, `can_` 접두사를 사용한다.
- **이유**: boolean 의미를 명확히 전달하여 쿼리 작성 시 조건의 의도가 분명해진다.
- **좋은 예시**:
  ```sql
  is_active TINYINT(1) NOT NULL DEFAULT 1
  has_verified_email TINYINT(1) NOT NULL DEFAULT 0
  ```

### 인덱스 네이밍

- **규칙**: [MUST] 인덱스명은 `idx_{테이블명}_{컬럼명}` 패턴을 따른다.
- **이유**: EXPLAIN 결과에서 어떤 인덱스가 사용되었는지 즉시 파악할 수 있다.
- **좋은 예시**:
  ```sql
  CREATE INDEX idx_orders_user_id ON orders (user_id);
  CREATE INDEX idx_orders_created_at_status ON orders (created_at, status);
  ```
- **나쁜 예시**:
  ```sql
  CREATE INDEX idx1 ON orders (user_id);           -- 의미 불명
  CREATE INDEX orders_index ON orders (user_id);    -- 컬럼 정보 누락
  ```

### 제약조건 네이밍

- **규칙**: [SHOULD] 제약조건은 아래 패턴을 따른다.

| 제약조건 | 패턴 | 예시 |
|----------|------|------|
| Primary Key | `pk_{테이블명}` | `pk_users` |
| Foreign Key | `fk_{테이블명}_{참조테이블명}` | `fk_orders_users` |
| Unique | `uq_{테이블명}_{컬럼명}` | `uq_users_email` |
| Check | `ck_{테이블명}_{컬럼명}` | `ck_orders_amount_positive` |

## 공통 필드

### 필수 공통 필드

- **규칙**: [MUST] 모든 테이블에 아래 공통 필드를 포함한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | CHAR(36) | PK. UUID 값을 저장한다 |
| `_no` | BIGINT, AUTO_INCREMENT, UNIQUE | 내부 순차 식별자. UNIQUE KEY 인덱스를 사용한다 |
| `created_at` | DATETIME / TIMESTAMP | 레코드 생성 시각 (UTC) |
| `updated_at` | DATETIME / TIMESTAMP | 레코드 최종 수정 시각 (UTC) |

- **이유**: UUID PK는 외부 노출 시 레코드 수 추정을 방지하고, 분산 환경에서 충돌 없이 ID를 생성할 수 있다. `_no`(AUTO_INCREMENT)는 내부 정렬, 페이지네이션, 인덱스 성능 최적화를 위해 보조 식별자로 사용한다.

### Soft Delete

- **규칙**: [SHOULD] 비즈니스적으로 삭제 이력이 필요한 테이블은 `deleted_at` 필드를 통한 soft delete를 적용한다.
- **이유**: 물리 삭제는 복구가 불가능하며, 삭제 이력 추적이 불가능하다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `deleted_at` | DATETIME / TIMESTAMP, NULLABLE | NULL이면 활성, 값이 있으면 삭제됨 |

- **좋은 예시**:
  ```sql
  -- soft delete 적용 테이블
  CREATE TABLE users (
      id CHAR(36) NOT NULL PRIMARY KEY,
      _no BIGINT AUTO_INCREMENT NOT NULL,
      email VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL,
      UNIQUE KEY uq_users__no (_no)
  );

  -- 삭제 처리
  UPDATE users SET deleted_at = NOW() WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  -- 활성 데이터 조회
  SELECT * FROM users WHERE deleted_at IS NULL;
  ```

- **규칙**: [MUST] soft delete가 적용된 테이블에는 `deleted_at IS NULL` 조건을 기본 조회에 반드시 포함한다.
- **이유**: 삭제된 데이터가 의도치 않게 조회되면 심각한 비즈니스 오류가 발생할 수 있다.

### ID 전략

- **규칙**: [MUST] PK(`id`)는 UUID(v4) 값을 `CHAR(36)` 타입으로 저장한다.
- **이유**: UUID는 분산 환경에서 충돌 없이 ID를 생성할 수 있고, 외부 노출 시 레코드 수 추정을 방지하여 보안성이 높다.

- **규칙**: [MUST] 모든 테이블에 `_no` 컬럼(BIGINT AUTO_INCREMENT)을 추가하고, UNIQUE KEY 인덱스를 설정한다.
- **이유**: AUTO_INCREMENT 순차 값은 내부 정렬, 커서 기반 페이지네이션, InnoDB 클러스터드 인덱스 대안으로 활용할 수 있다. UNIQUE KEY로 설정하여 중복 없는 내부 식별자로 사용한다.

- **규칙**: [MUST NOT] `_no` 값을 외부 API 응답에 노출하지 않는다.
- **이유**: AUTO_INCREMENT 값은 전체 레코드 수를 추정할 수 있어 보안상 외부 노출에 적합하지 않다. 외부에는 반드시 `id`(UUID)를 사용한다.

## 데이터 타입

### 타입 선택 기준

- **규칙**: [MUST] 저장할 데이터에 적합한 최소 크기의 타입을 선택한다.
- **이유**: 불필요하게 큰 타입은 저장 공간을 낭비하고, 인덱스 효율과 쿼리 성능을 저하시킨다.

### 문자열

- **규칙**: [SHOULD] 길이가 고정적이거나 예측 가능한 문자열은 `VARCHAR(n)`을, 길이를 예측하기 어려운 대용량 텍스트는 `TEXT` 계열을 사용한다.
- **이유**: VARCHAR는 인덱싱이 가능하고 성능이 좋지만, 매우 긴 텍스트에는 적합하지 않다.

| 용도 | 권장 타입 | 예시 |
|------|----------|------|
| 이메일 | VARCHAR(255) | `user@example.com` |
| 이름 | VARCHAR(100) | `홍길동` |
| URL | VARCHAR(2048) | `https://...` |
| 본문, 설명 | TEXT | 자유형 텍스트 |

### 날짜/시간

- **규칙**: [MUST] 날짜/시간 데이터는 UTC로 저장하고, 표시 시 타임존을 변환한다.
- **이유**: 서버/DB 타임존 설정에 의존하지 않고, 일관된 시간 데이터를 보장한다.

- **규칙**: [SHOULD] ISO 8601 형식(YYYY-MM-DD HH:MM:SS)을 표준으로 사용한다.
- **이유**: 국제 표준이며, 대부분의 라이브러리와 호환된다.

### 금액/소수점

- **규칙**: [MUST] 금액 데이터는 `DECIMAL(precision, scale)` 타입을 사용한다. `FLOAT`/`DOUBLE`을 사용하지 않는다.
- **이유**: 부동소수점 타입은 정밀도 손실이 발생하여 금융 데이터에 치명적인 오류를 유발할 수 있다.
- **좋은 예시**:
  ```sql
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00
  ```
- **나쁜 예시**:
  ```sql
  total_amount FLOAT NOT NULL DEFAULT 0.0  -- 정밀도 손실 위험
  ```

## 인덱스 전략

### 인덱스 생성 기준

- **규칙**: [SHOULD] WHERE, JOIN, ORDER BY 절에 자주 사용되는 컬럼에 인덱스를 생성한다.
- **이유**: 적절한 인덱스는 쿼리 성능을 크게 향상시킨다.

- **규칙**: [MUST NOT] 데이터가 수백 건 이하인 소규모 테이블에 불필요한 인덱스를 생성하지 않는다.
- **이유**: 소규모 테이블에서는 Full Table Scan이 인덱스 탐색보다 빠를 수 있으며, 인덱스는 INSERT/UPDATE/DELETE 성능을 저하시킨다.

- **규칙**: [SHOULD] 테이블당 인덱스 수는 5개 이내로 유지한다.
- **이유**: 과도한 인덱스는 쓰기 성능을 저하시키고, 옵티마이저의 인덱스 선택 비용을 증가시킨다.

### 복합 인덱스 순서

- **규칙**: [MUST] 복합 인덱스의 컬럼 순서는 카디널리티가 높은 컬럼(선택도가 좋은 컬럼)을 앞에 배치한다.
- **이유**: MySQL은 복합 인덱스의 좌측 접두사(leftmost prefix) 규칙을 따르므로, 선택도가 높은 컬럼을 앞에 두어야 인덱스 활용 범위가 넓어진다.
- **좋은 예시**:
  ```sql
  -- user_id의 카디널리티가 status보다 높으므로 앞에 배치
  CREATE INDEX idx_orders_user_id_status ON orders (user_id, status);
  ```
- **나쁜 예시**:
  ```sql
  -- status(카디널리티 낮음)를 앞에 배치하면 인덱스 효율이 떨어짐
  CREATE INDEX idx_orders_status_user_id ON orders (status, user_id);
  ```

### 커버링 인덱스

- **규칙**: [MAY] 자주 실행되는 쿼리에서 SELECT 대상 컬럼까지 인덱스에 포함하여 커버링 인덱스를 활용할 수 있다.
- **이유**: 커버링 인덱스를 사용하면 테이블 데이터 접근 없이 인덱스만으로 쿼리가 완료되어 I/O를 크게 줄인다.
- **좋은 예시**:
  ```sql
  -- user_id로 검색하고 email만 반환하는 쿼리가 빈번한 경우
  CREATE INDEX idx_users_user_id_email ON users (user_id, email);

  -- 인덱스만으로 응답 가능 (Extra: Using index)
  SELECT user_id, email FROM users WHERE user_id = 100;
  ```

## 마이그레이션

### 마이그레이션 파일 관리

- **규칙**: [MUST] 스키마 변경은 반드시 마이그레이션 파일을 통해 관리한다. 수동으로 DB에 직접 DDL을 실행하지 않는다.
- **이유**: 마이그레이션 파일을 통해 스키마 변경 이력을 추적하고, 환경 간 스키마 일관성을 유지할 수 있다.

- **규칙**: [MUST] 마이그레이션 파일명은 타임스탬프 기반으로 순서를 보장한다.
- **이유**: 파일 정렬 순서가 실행 순서가 되므로, 일관된 마이그레이션 적용 순서를 보장한다.
- **좋은 예시**:
  ```
  20250101_000001_create_users_table.sql
  20250101_000002_add_email_index_to_users.sql
  20250115_000001_create_orders_table.sql
  ```

### 롤백 전략

- **규칙**: [MUST] 모든 마이그레이션에는 롤백(down) 스크립트를 함께 작성한다.
- **이유**: 배포 실패 시 빠르게 이전 상태로 복원할 수 있어야 한다.
- **좋은 예시**:
  ```sql
  -- up: 테이블 생성
  CREATE TABLE orders (
      id CHAR(36) NOT NULL PRIMARY KEY,
      _no BIGINT AUTO_INCREMENT NOT NULL,
      user_id CHAR(36) NOT NULL,
      total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_orders__no (_no)
  );

  -- down: 롤백
  DROP TABLE IF EXISTS orders;
  ```

### 무중단 스키마 변경

- **규칙**: [MUST] 운영 환경에서의 스키마 변경은 서비스 중단 없이 수행할 수 있어야 한다.
- **이유**: 서비스 가용성은 최우선이며, 사용자에게 다운타임을 유발하면 안 된다.

- **규칙**: [SHOULD] 대규모 테이블의 스키마 변경은 아래 순서를 따른다:
  1. 새 컬럼 추가 (nullable 또는 기본값 포함) -- 기존 코드와 호환
  2. 애플리케이션에서 새 컬럼을 사용하도록 코드 배포
  3. 기존 데이터를 배치로 마이그레이션
  4. 필요시 NOT NULL 제약조건 추가
  5. 기존 컬럼 제거 (별도 마이그레이션에서)
- **이유**: 스키마 변경과 애플리케이션 배포를 분리하여 backward compatibility를 유지한다.

- **규칙**: [MUST NOT] 운영 환경에서 컬럼 이름 변경 또는 삭제를 단일 배포로 수행하지 않는다.
- **이유**: 이전 버전의 애플리케이션이 해당 컬럼을 참조하고 있을 수 있어 에러가 발생한다.

## 비즈니스 로직 관리

### FUNCTION / Trigger 사용 금지

- **규칙**: [MUST NOT] 데이터베이스 내부의 FUNCTION, Trigger, Stored Procedure를 사용하지 않는다. 모든 비즈니스 로직은 애플리케이션 코드로 구현되고 관리되어야 한다.
- **이유**: 비즈니스 로직이 데이터베이스와 애플리케이션 코드 두 곳에 분산되면 유지보수가 어렵고, 디버깅과 테스트가 복잡해진다. 또한 데이터베이스 내부 로직은 버전 관리가 어렵고, 코드 리뷰 프로세스를 우회하게 된다.
- **좋은 예시**:
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
- **나쁜 예시**:
  ```sql
  -- 트리거로 비즈니스 로직을 처리 (금지)
  CREATE TRIGGER trg_orders_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  BEGIN
      IF NEW.status != OLD.status THEN
          INSERT INTO notifications (user_id, message)
          VALUES (NEW.user_id, CONCAT('주문 상태가 ', NEW.status, '로 변경되었습니다'));
      END IF;
  END;

  -- 스토어드 함수로 비즈니스 로직을 처리 (금지)
  CREATE FUNCTION calculate_discount(total DECIMAL(15,2)) RETURNS DECIMAL(15,2)
  BEGIN
      IF total > 100000 THEN RETURN total * 0.1;
      ELSEIF total > 50000 THEN RETURN total * 0.05;
      ELSE RETURN 0;
      END IF;
  END;
  ```

## 안티패턴

### SELECT * 사용

- **규칙**: [MUST NOT] 프로덕션 코드에서 `SELECT *`를 사용하지 않는다.
- **이유**: 불필요한 컬럼까지 조회하여 네트워크 트래픽과 메모리를 낭비하고, 스키마 변경 시 예상치 못한 사이드이펙트가 발생할 수 있다.
- **좋은 예시**:
  ```sql
  SELECT id, email, name FROM users WHERE id = 1;
  ```
- **나쁜 예시**:
  ```sql
  SELECT * FROM users WHERE id = 1;
  ```

### N+1 쿼리

- **규칙**: [MUST NOT] 루프 안에서 반복적으로 쿼리를 실행하지 않는다.
- **이유**: N개의 부모 레코드에 대해 N번의 추가 쿼리가 발생하면, 데이터가 늘어날수록 성능이 급격히 저하된다.
- **좋은 예시**:
  ```sql
  -- JOIN으로 한 번에 조회
  SELECT o.id, o.total_amount, u.name
  FROM orders o
  INNER JOIN users u ON o.user_id = u.id
  WHERE o.created_at >= '2025-01-01';
  ```
- **나쁜 예시**:
  ```python
  # N+1 패턴 (절대 금지)
  orders = db.query("SELECT * FROM orders")
  for order in orders:
      user = db.query(f"SELECT * FROM users WHERE id = {order.user_id}")
  ```

### 과도한 인덱스

- **규칙**: [MUST NOT] 모든 컬럼에 무분별하게 인덱스를 생성하지 않는다.
- **이유**: 인덱스는 읽기 성능을 높이지만, 쓰기(INSERT/UPDATE/DELETE) 시 추가적인 오버헤드를 발생시킨다.

### 암묵적 타입 변환

- **규칙**: [MUST NOT] WHERE 조건에서 컬럼 타입과 다른 타입의 값을 비교하지 않는다.
- **이유**: 암묵적 타입 변환은 인덱스를 무효화시키고 Full Table Scan을 유발한다.
- **좋은 예시**:
  ```sql
  -- user_id가 BIGINT인 경우 숫자로 비교
  SELECT * FROM orders WHERE user_id = 123;
  ```
- **나쁜 예시**:
  ```sql
  -- user_id가 BIGINT인데 문자열로 비교 -> 인덱스 무효화
  SELECT * FROM orders WHERE user_id = '123';
  ```

### NULL 비교 오류

- **규칙**: [MUST NOT] NULL 비교에 `=` 또는 `!=` 연산자를 사용하지 않는다. `IS NULL` / `IS NOT NULL`을 사용한다.
- **이유**: SQL에서 NULL은 값이 아닌 "알 수 없음" 상태이므로, `= NULL`은 항상 UNKNOWN을 반환한다.
- **좋은 예시**:
  ```sql
  SELECT * FROM users WHERE deleted_at IS NULL;
  ```
- **나쁜 예시**:
  ```sql
  SELECT * FROM users WHERE deleted_at = NULL;  -- 항상 빈 결과
  ```

## 참고 자료

- [SQL Style Guide by Simon Holywell](https://www.sqlstyle.guide/)
- [Database Naming Conventions (Baeldung)](https://www.baeldung.com/sql/database-table-column-naming-conventions)
- [Database Naming Conventions Best Practices (Drygast.NET)](https://drygast.net/blog/post/database_naming_conventions)
- [RootSoft Database Naming Convention](https://github.com/RootSoft/Database-Naming-Convention)
