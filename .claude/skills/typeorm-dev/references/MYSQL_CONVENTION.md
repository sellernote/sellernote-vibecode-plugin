# MySQL 컨벤션

> 이 문서는 MySQL 프로젝트에 적용되는 규칙을 정의합니다.
> 상위 규칙: [데이터베이스 공통 컨벤션](../DATABASE_CONVENTION.md)

## 기술 스택

| 항목 | 버전/설정 |
|------|----------|
| MySQL | TBD |
| 스토리지 엔진 | InnoDB (기본) |
| 문자셋 | TBD (권장: utf8mb4) |
| Collation | TBD (권장: utf8mb4_unicode_ci) |

## 네이밍 규칙

### 테이블명

- **규칙**: [MUST] 테이블명은 소문자 snake_case, 단수형으로 작성한다.
- **이유**: 테이블은 Entity와 1:1로 매핑되므로 단수형이 자연스럽다. 복수형은 불규칙 변화(person → people, status → statuses 등)로 인한 혼란을 야기하며, JOIN 테이블 명명 시에도 단수형 조합이 더 명확하다(예: `user_role` vs `users_have_roles`). 소문자 snake_case는 MySQL이 기본적으로 대소문자를 구분하지 않는 환경에서 이식성을 보장하고, SQL 키워드와 시각적으로 구분된다.
- **좋은 예시**:
  ```sql
  -- 단수형, 소문자, snake_case
  CREATE TABLE order ( ... );
  CREATE TABLE order_item ( ... );
  CREATE TABLE user_address ( ... );
  ```
- **나쁜 예시**:
  ```sql
  -- 복수형, 대문자 혼용, 하이픈 사용
  CREATE TABLE Orders ( ... );       -- 대문자 + 복수형
  CREATE TABLE order_items ( ... );  -- 복수형
  CREATE TABLE user-addresses ( ... ); -- 하이픈 사용 (MySQL에서 백틱 필요)
  ```

### 필드명

- **규칙**: [MUST] 필드명은 소문자 snake_case로 작성한다.
- **이유**: 소문자 snake_case는 MySQL 커뮤니티의 사실상 표준이며, SQL 키워드(대문자)와 시각적으로 명확히 구분된다. camelCase는 MySQL의 대소문자 처리 방식에 따라 환경별 호환성 문제가 발생할 수 있다.
- **좋은 예시**:
  ```sql
  CREATE TABLE order (
      user_id CHAR(36) NOT NULL,
      total_amount DECIMAL(15, 2) NOT NULL,
      shipping_address VARCHAR(500) NOT NULL
  );
  ```
- **나쁜 예시**:
  ```sql
  CREATE TABLE order (
      userId CHAR(36) NOT NULL,        -- camelCase
      TotalAmount DECIMAL(15, 2) NOT NULL, -- PascalCase
      shipping-address VARCHAR(500) NOT NULL -- 하이픈 사용
  );
  ```

### 필드 COMMENT

- **규칙**: [MUST] 모든 필드에 COMMENT를 추가하여 필드의 목적과 제약 조건을 기술한다.
- **이유**: `SHOW FULL COLUMNS FROM 테이블명` 명령으로 별도 문서 없이 스키마 정보를 즉시 확인할 수 있어, 신규 개발자의 온보딩과 유지보수 효율이 높아진다. 외부 문서와 달리 스키마와 항상 동기화된 상태를 유지한다.
- **좋은 예시**:
  ```sql
  CREATE TABLE order (
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
- **나쁜 예시**:
  ```sql
  CREATE TABLE order (
      id CHAR(36) NOT NULL PRIMARY KEY,
      _no BIGINT AUTO_INCREMENT NOT NULL,
      user_id CHAR(36) NOT NULL,
      total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_order__no (_no)
  );
  -- COMMENT가 없으면 필드의 의미, 단위, 제약 조건을 코드나 외부 문서에서 별도로 찾아야 한다
  ```

## 금액 처리

### DECIMAL 타입 사용

- **규칙**: [MUST] 금액 필드는 반드시 DECIMAL 타입을 사용한다. FLOAT 또는 DOUBLE을 사용하지 않는다.
- **이유**: FLOAT/DOUBLE은 IEEE 754 부동소수점 표현을 사용하므로, `0.1 + 0.2 = 0.30000000000000004`와 같은 정밀도 오차가 발생한다. 금융 거래에서 이러한 오차는 누적되어 결산 불일치를 야기할 수 있다. DECIMAL은 고정소수점으로 정확한 값을 저장한다.
- **좋은 예시**:
  ```sql
  CREATE TABLE order (
      id CHAR(36) NOT NULL PRIMARY KEY COMMENT '주문 고유 식별자',
      total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT '주문 총 금액',
      discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT '할인 금액',
      shipping_fee DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT '배송비'
  );
  ```
- **나쁜 예시**:
  ```sql
  CREATE TABLE order (
      id CHAR(36) NOT NULL PRIMARY KEY,
      total_amount FLOAT NOT NULL DEFAULT 0.00,       -- 부동소수점 오차 발생
      discount_amount DOUBLE NOT NULL DEFAULT 0.00     -- 부동소수점 오차 발생
  );
  ```

### DECIMAL Precision

- **규칙**: [SHOULD] 금액 필드의 기본 precision은 `DECIMAL(15, 2)`를 사용한다.
- **이유**: `DECIMAL(15, 2)`는 정수부 13자리까지 표현 가능하여 최대 약 9,999,999,999,999.99(약 10조)까지 커버한다. 일반적인 비즈니스 금액 처리에 충분하며, GAAP(일반회계기준) 준수가 필요한 경우 `DECIMAL(15, 4)`를 사용하여 중간 연산의 정밀도를 확보할 수 있다.
- **좋은 예시**:
  ```sql
  -- 일반 금액 필드
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT '주문 총 금액 (KRW)',

  -- GAAP 준수가 필요한 경우
  unit_price DECIMAL(15, 4) NOT NULL DEFAULT 0.0000 COMMENT '단가 (GAAP 4자리 소수점)',
  ```
- **나쁜 예시**:
  ```sql
  -- precision이 너무 작아 큰 금액 저장 불가
  total_amount DECIMAL(8, 2) NOT NULL,  -- 최대 999,999.99까지만 가능

  -- 기본값 DECIMAL(10, 0)은 소수점 없음
  total_amount DECIMAL NOT NULL,
  ```

## 타임존

### 서버/세션 타임존 UTC 설정

- **규칙**: [MUST] MySQL 서버의 글로벌 타임존과 세션 타임존을 UTC(`'+00:00'`)로 설정한다.
- **이유**: UTC를 기준으로 저장하면 다국적 서비스 확장 시 타임존 변환이 일관되며, DST(Daylight Saving Time, 서머타임) 전환에 영향을 받지 않는다. 또한 `time_zone = 'SYSTEM'` 기본값은 매 함수 호출마다 OS 시스템 타임존을 조회하여 글로벌 뮤텍스 경합(contention)이 발생할 수 있으므로, 명시적 UTC 설정이 성능 면에서도 유리하다.
- **좋은 예시**:
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
- **나쁜 예시**:
  ```ini
  # my.cnf
  [mysqld]
  default_time_zone = 'Asia/Seoul'   # 특정 지역 타임존 사용
  ```
  ```typescript
  // TypeORM - 타임존 미설정 (서버 기본값에 의존)
  const dataSource = new DataSource({
    type: 'mysql',
    // timezone 미설정 → 서버 로컬 타임존 사용
  });
  ```

### 애플리케이션 연결 UTC 설정

- **규칙**: [MUST] 애플리케이션에서 MySQL에 연결할 때 세션 타임존을 UTC로 명시적으로 설정한다.
- **이유**: 서버 글로벌 설정과 별개로, 각 연결(세션)의 타임존이 일치하지 않으면 `NOW()`, `CURRENT_TIMESTAMP` 등의 함수 반환값과 TIMESTAMP 타입의 저장/조회 값이 의도와 달라질 수 있다. 모든 연결에서 일관된 UTC 기준을 보장해야 한다.
- **좋은 예시**:
  ```sql
  -- 연결 시 세션 타임존을 UTC로 설정
  SET SESSION time_zone = '+00:00';

  -- 현재 세션 타임존 확인
  SELECT @@session.time_zone;  -- '+00:00'
  ```
  ```typescript
  // TypeORM - 연결 옵션에서 타임존 명시
  const dataSource = new DataSource({
    type: 'mysql',
    timezone: '+00:00',
    // ...
  });
  ```
- **나쁜 예시**:
  ```sql
  -- 세션 타임존을 지역 시간으로 설정
  SET SESSION time_zone = 'Asia/Seoul';

  -- 이 경우 NOW()는 KST 기준으로 반환되어 UTC 저장 정책과 불일치
  SELECT NOW();  -- '2025-01-15 18:30:00' (KST, UTC+9)
  ```

## SQL 스타일

### 키워드 대문자

- **규칙**: [MUST] SQL 예약어(키워드)는 대문자로 작성한다.
- **이유**: SQL 키워드와 사용자 정의 식별자를 시각적으로 구분하여 쿼리 가독성을 높인다.
- **좋은 예시**:
  ```sql
  SELECT u.id, u.email, u.name
  FROM user u
  WHERE u.is_active = 1
  ORDER BY u.created_at DESC;
  ```
- **나쁜 예시**:
  ```sql
  select u.id, u.email, u.name
  from user u
  where u.is_active = 1
  order by u.created_at desc;
  ```

### 들여쓰기 및 줄바꿈

- **규칙**: [SHOULD] 주요 SQL 절(SELECT, FROM, WHERE, JOIN, ORDER BY, GROUP BY 등)은 각각 새로운 줄에 작성하고, 절 내부 항목은 들여쓴다.
- **이유**: 긴 쿼리에서 각 절의 시작 지점을 빠르게 파악할 수 있다.
- **좋은 예시**:
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
- **나쁜 예시**:
  ```sql
  SELECT o.id, o.total_amount, u.name AS user_name FROM `order` o INNER JOIN user u ON o.user_id = u.id WHERE o.status = 'completed' AND o.created_at >= '2025-01-01' ORDER BY o.created_at DESC LIMIT 100;
  ```

### JOIN 작성법

- **규칙**: [MUST] JOIN 유형을 명시적으로 작성한다. (INNER JOIN, LEFT JOIN 등)
- **이유**: 암묵적 JOIN(쉼표로 테이블 나열)은 의도를 파악하기 어렵고, 실수로 CROSS JOIN이 될 수 있다.
- **좋은 예시**:
  ```sql
  SELECT o.id, u.name
  FROM `order` o
  INNER JOIN user u
      ON o.user_id = u.id;
  ```
- **나쁜 예시**:
  ```sql
  -- 암묵적 JOIN (사용 금지)
  SELECT o.id, u.name
  FROM `order` o, user u
  WHERE o.user_id = u.id;
  ```

- **규칙**: [SHOULD] 3개 이상의 테이블을 조인할 때는 테이블 별칭(alias)을 사용한다.
- **이유**: 별칭이 없으면 어떤 테이블의 컬럼인지 구분이 어렵고, 쿼리가 불필요하게 길어진다.

### 서브쿼리 vs JOIN

- **규칙**: [SHOULD] 가능한 경우 서브쿼리보다 JOIN을 사용한다.
- **이유**: MySQL 옵티마이저는 일반적으로 JOIN을 더 효율적으로 최적화한다. 특히 상관 서브쿼리(correlated subquery)는 외부 쿼리의 각 행마다 실행되어 성능이 저하된다.

## 데이터 타입

### UUID 타입

- **규칙**: [MUST] PK(`id`)에는 `CHAR(36)`을 사용하여 UUID 값을 저장한다.
- **이유**: UUID(예: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)는 하이픈 포함 36자이다. `CHAR(36)`은 고정 길이로 인덱스 성능이 일정하다.

- **규칙**: [MUST] `_no` 컬럼에는 `BIGINT AUTO_INCREMENT`를 사용하고, `UNIQUE KEY` 인덱스를 설정한다.
- **이유**: AUTO_INCREMENT 순차 값은 InnoDB의 쓰기 성능 최적화, 내부 정렬, 커서 기반 페이지네이션에 활용한다.

- **좋은 예시**:
  ```sql
  CREATE TABLE `order` (
      id CHAR(36) NOT NULL PRIMARY KEY,
      _no BIGINT AUTO_INCREMENT NOT NULL,
      user_id CHAR(36) NOT NULL,
      total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_order__no (_no)
  );
  ```
- **나쁜 예시**:
  ```sql
  CREATE TABLE `order` (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- UUID 정책 위반
      total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00
  );
  ```

### 정수 타입

| 타입 | 크기 | 범위 (UNSIGNED) | 사용 기준 |
|------|------|-----------------|----------|
| TINYINT | 1바이트 | 0 ~ 255 | boolean, 상태값 |
| INT | 4바이트 | 0 ~ 약 42억 | 일반적인 정수 |
| BIGINT | 8바이트 | 0 ~ 약 1844경 | `_no`, 대용량 카운터 |

- **규칙**: [SHOULD] boolean 값은 TINYINT(1)을 사용한다.
- **이유**: MySQL에는 네이티브 BOOLEAN 타입이 없으며, TINYINT(1)이 관례적으로 boolean을 표현한다.

### 문자열 타입

| 타입 | 사용 기준 |
|------|----------|
| VARCHAR(n) | 최대 길이가 예측 가능한 문자열 (최대 65,535 바이트) |
| TEXT | 길이를 예측하기 어려운 긴 텍스트 |
| CHAR(n) | 고정 길이 문자열 (예: 국가 코드 `KR`, 통화 코드 `KRW`) |

- **규칙**: [MUST NOT] VARCHAR에 무의미하게 큰 길이를 지정하지 않는다. (예: `VARCHAR(10000)`)
- **이유**: VARCHAR는 실제 데이터 크기만큼만 저장하지만, 임시 테이블 생성 시 지정된 최대 길이만큼 메모리를 할당할 수 있다.

### 날짜/시간 타입

| 타입 | 범위 | 크기 | 사용 기준 |
|------|------|------|----------|
| DATETIME | 1000-01-01 ~ 9999-12-31 | 8바이트 | 일반적인 날짜/시간 저장 |
| TIMESTAMP | 1970-01-01 ~ 2038-01-19 | 4바이트 | 자동 갱신 필드, UTC 변환이 필요한 경우 |
| DATE | 1000-01-01 ~ 9999-12-31 | 3바이트 | 날짜만 필요한 경우 (생년월일 등) |

- **규칙**: [MUST] 날짜/시간 필드는 반드시 DATETIME 타입을 사용한다. TIMESTAMP를 사용하지 않는다.
- **이유**: TIMESTAMP는 2038-01-19 03:14:07 UTC까지만 저장 가능하여 장기 운영 시 문제가 된다. 또한 UTC 저장 정책에서 TIMESTAMP의 자동 타임존 변환 기능이 불필요하며 오히려 혼란을 야기한다. DATETIME은 2038년 제한이 없고 저장된 값이 변환 없이 그대로 반환된다.

- **규칙**: [MUST NOT] 날짜/시간을 문자열(VARCHAR)로 저장하지 않는다.
- **이유**: 날짜 연산과 비교가 불가능해지고, 인덱스 효율이 저하된다.

### JSON 타입

- **규칙**: [MAY] 구조가 유동적이거나 스키마가 자주 변경되는 비정형 데이터에는 JSON 타입을 사용할 수 있다.
- **이유**: JSON 타입은 유효성 검증과 부분 업데이트, JSON 경로 조회를 지원한다.

- **규칙**: [MUST NOT] 정규화가 가능한 정형 데이터를 JSON에 저장하지 않는다.
- **이유**: JSON 내부 필드는 직접 인덱싱이 어렵고(generated column 필요), 조인이 불가능하여 쿼리 성능이 저하된다.
- **좋은 예시**:
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
- **나쁜 예시**:
  ```sql
  -- 주소 데이터를 JSON으로 저장 (정규화해야 할 데이터)
  CREATE TABLE user (
      id CHAR(36) NOT NULL PRIMARY KEY,
      addresses JSON  -- city, street 등을 별도 테이블로 분리해야 함
  );
  ```

### ENUM 타입

- **규칙**: [MUST NOT] ENUM 타입을 사용하지 않는다.
- **이유**: ENUM 값의 추가/수정 시 테이블 재구성(ALTER TABLE)이 필요하며, ORM과의 호환성이 좋지 않다. 또한 내부적으로 정수로 저장되어 정렬 시 예상과 다른 결과가 나올 수 있다.
- **좋은 예시**:
  ```sql
  -- 상태값은 VARCHAR 또는 참조 테이블 사용
  status VARCHAR(20) NOT NULL DEFAULT 'pending'

  -- 또는 별도 참조 테이블 사용
  CREATE TABLE order_status (
      id TINYINT PRIMARY KEY,
      name VARCHAR(20) NOT NULL UNIQUE
  );
  ```
- **나쁜 예시**:
  ```sql
  status ENUM('pending', 'processing', 'completed', 'cancelled')
  ```

## 인덱스

### B-Tree 인덱스

- **규칙**: [SHOULD] 일반적인 검색 쿼리에는 기본 인덱스(B-Tree)를 사용한다.
- **이유**: B-Tree는 MySQL InnoDB의 기본 인덱스 구조로, 범위 검색과 정렬에 효율적이다.

### Full-text 인덱스

- **규칙**: [MAY] 텍스트 검색이 필요한 경우 Full-text 인덱스를 사용할 수 있다.
- **이유**: LIKE '%keyword%' 패턴은 인덱스를 활용할 수 없지만, Full-text 인덱스는 텍스트 검색에 최적화되어 있다.
- **좋은 예시**:
  ```sql
  CREATE FULLTEXT INDEX ft_idx_product_name_desc
      ON product (name, description);

  -- Full-text 검색
  SELECT * FROM product
  WHERE MATCH(name, description) AGAINST('무선 키보드' IN BOOLEAN MODE);
  ```

### 파티셔닝 전략

- **규칙**: [MAY] 대규모 테이블(수천만 건 이상)에서는 파티셔닝을 고려할 수 있다.
- **이유**: 파티셔닝은 특정 범위의 데이터만 스캔하도록 하여 쿼리 성능을 개선하고, 데이터 관리(삭제, 아카이빙)를 용이하게 한다.

- **규칙**: [SHOULD] 파티셔닝 키는 쿼리의 WHERE 조건에 자주 사용되는 컬럼을 선택한다.
- **이유**: 파티셔닝 키가 조건에 포함되지 않으면 모든 파티션을 스캔해야 하므로 이점이 없다.
- **좋은 예시**:
  ```sql
  -- 날짜 기반 RANGE 파티셔닝
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

## 쿼리 최적화

### EXPLAIN 사용

- **규칙**: [MUST] 신규 쿼리 또는 성능 문제가 의심되는 쿼리는 반드시 EXPLAIN으로 실행 계획을 확인한다.
- **이유**: 실행 계획을 확인하지 않으면 Full Table Scan, 잘못된 인덱스 선택 등을 발견하기 어렵다.
- **좋은 예시**:
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

### 슬로우 쿼리

- **규칙**: [MUST] 슬로우 쿼리 로그를 활성화하고, 주기적으로 모니터링한다.
- **이유**: 성능 저하의 주요 원인을 사전에 파악하고 대응할 수 있다.

- **규칙**: [SHOULD] 슬로우 쿼리 기준 시간은 1초로 설정한다. (프로젝트 특성에 따라 조정 가능)
- **이유**: 1초 이상 걸리는 쿼리는 사용자 경험에 영향을 줄 수 있으므로 개선 대상이다.

### 실행 계획 분석 시 주의 사항

| EXPLAIN 항목 | 경고 신호 | 조치 방법 |
|-------------|----------|----------|
| type = ALL | Full Table Scan | 적절한 인덱스 추가 |
| type = index | Full Index Scan | WHERE 조건에 맞는 인덱스 검토 |
| Extra: Using filesort | 파일 정렬 발생 | ORDER BY 컬럼에 인덱스 추가 |
| Extra: Using temporary | 임시 테이블 사용 | GROUP BY/ORDER BY 최적화 |
| rows 값이 매우 큰 경우 | 대량 행 스캔 | 인덱스 또는 쿼리 구조 개선 |

### 페이지네이션

- **규칙**: [SHOULD] 대량 데이터 페이지네이션에서는 OFFSET 기반 대신 커서 기반(keyset) 페이지네이션을 사용한다.
- **이유**: OFFSET 값이 클수록 스킵해야 할 행이 많아져 성능이 선형적으로 저하된다.
- **좋은 예시**:
  ```sql
  -- 커서 기반 페이지네이션 (이전 페이지 마지막 id 이후의 데이터 조회)
  SELECT id, title, created_at
  FROM article
  WHERE id > 1000
  ORDER BY id ASC
  LIMIT 20;
  ```
- **나쁜 예시**:
  ```sql
  -- OFFSET 기반 페이지네이션 (페이지가 깊어질수록 느려짐)
  SELECT id, title, created_at
  FROM article
  ORDER BY id ASC
  LIMIT 20 OFFSET 100000;
  ```

## 안티패턴

### 과도한 서브쿼리

- **규칙**: [SHOULD] WHERE IN 서브쿼리보다 JOIN 또는 EXISTS를 사용한다.
- **이유**: MySQL 옵티마이저에 따라 IN 서브쿼리가 비효율적으로 실행될 수 있다.
- **좋은 예시**:
  ```sql
  -- EXISTS 사용
  SELECT u.id, u.name
  FROM user u
  WHERE EXISTS (
      SELECT 1 FROM `order` o WHERE o.user_id = u.id
  );
  ```
- **나쁜 예시**:
  ```sql
  -- IN 서브쿼리 (대량 데이터에서 비효율적일 수 있음)
  SELECT id, name
  FROM user
  WHERE id IN (SELECT user_id FROM `order`);
  ```

### 인덱스 무효화 패턴

- **규칙**: [MUST NOT] 인덱스 컬럼에 함수나 연산을 적용하지 않는다.
- **이유**: 함수 적용 시 인덱스를 사용할 수 없어 Full Table Scan이 발생한다.
- **좋은 예시**:
  ```sql
  -- 범위 조건으로 변환하여 인덱스 활용
  SELECT * FROM `order`
  WHERE created_at >= '2025-01-01'
      AND created_at < '2025-02-01';
  ```
- **나쁜 예시**:
  ```sql
  -- 인덱스 컬럼에 함수 적용 -> 인덱스 무효화
  SELECT * FROM `order`
  WHERE YEAR(created_at) = 2025 AND MONTH(created_at) = 1;
  ```

### LIKE 와일드카드 선행 사용

- **규칙**: [MUST NOT] LIKE 패턴에서 와일드카드를 앞에 사용하지 않는다. (`LIKE '%keyword'`)
- **이유**: 와일드카드가 앞에 오면 인덱스를 활용할 수 없다.
- **좋은 예시**:
  ```sql
  -- 접두사 검색은 인덱스 활용 가능
  SELECT * FROM user WHERE name LIKE '김%';
  ```
- **나쁜 예시**:
  ```sql
  -- 선행 와일드카드는 인덱스 활용 불가
  SELECT * FROM user WHERE name LIKE '%동';
  ```

### 대량 데이터 일괄 처리

- **규칙**: [MUST NOT] 대량의 INSERT/UPDATE/DELETE를 한 번의 트랜잭션으로 처리하지 않는다.
- **이유**: 긴 트랜잭션은 락(lock) 경합, 리플리케이션 지연, undo 로그 비대화를 유발한다.
- **좋은 예시**:
  ```sql
  -- 배치 단위로 나누어 처리
  DELETE FROM log
  WHERE created_at < '2024-01-01'
  LIMIT 1000;
  -- 반복 실행하여 전체 데이터를 처리
  ```
- **나쁜 예시**:
  ```sql
  -- 수백만 건을 한 번에 삭제
  DELETE FROM log WHERE created_at < '2024-01-01';
  ```

## 참고 자료

- [MySQL 공식 문서](https://dev.mysql.com/doc/)
- [MySQL 8.0 Reference Manual - Optimization and Indexes](https://dev.mysql.com/doc/en/optimization-indexes.html)
- [MySQL 8.4 Reference Manual - The DATE, DATETIME, and TIMESTAMP Types](https://dev.mysql.com/doc/en/datetime.html)
- [MySQL 8.4 Reference Manual - Fixed-Point Types (DECIMAL, NUMERIC)](https://dev.mysql.com/doc/refman/8.4/en/fixed-point-types.html)
- [MySQL 8.0 Reference Manual - Server Time Zone Support](https://dev.mysql.com/doc/refman/8.0/en/time-zone-support.html)
- [SQL Style Guide by Simon Holywell](https://www.sqlstyle.guide/)
- [Percona - Understanding MySQL Indexes](https://www.percona.com/blog/understanding-mysql-indexes-types-best-practices/)
- [MySQL Indexing Best Practices (GeeksforGeeks)](https://www.geeksforgeeks.org/mysql/mysql-indexing-best-practices/)
- [Zero-Downtime MySQL Schema Migrations](https://www.dchost.com/blog/en/zero-downtime-mysql-schema-migrations-the-blue-green-dance-with-gh-ost-and-pt-online-schema-change/)
- [The Table Naming Dilemma: Singular vs. Plural (Bytebase)](https://www.bytebase.com/blog/sql-table-naming-dilemma-singular-vs-plural/)
- [Singular vs. Plural Database Table Names (Database Star)](https://www.databasestar.com/database-table-naming-conventions/)
- [Datetimes vs Timestamps in MySQL (PlanetScale)](https://planetscale.com/blog/datetimes-vs-timestamps-in-mysql)
- [Storing Money Data in MySQL (Rietta)](https://rietta.com/blog/best-data-types-for-currencymoney-in/)
- [The Proper Way to Handle Multiple Time Zones in MySQL (Vertabelo)](https://vertabelo.com/blog/the-proper-way-to-handle-multiple-time-zones-in-mysql/)
