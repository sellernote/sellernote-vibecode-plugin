# Redis 컨벤션

> 이 문서는 Redis 프로젝트에 적용되는 규칙을 정의합니다.
> 상위 규칙: [데이터베이스 공통 컨벤션](../DATABASE_CONVENTION.md)

## 기술 스택

| 항목 | 버전/설정 |
|------|----------|
| Redis | TBD |
| 클라이언트 라이브러리 | TBD (예: ioredis, Jedis) |
| 최대 메모리 정책 | TBD (권장: allkeys-lru) |

## 키 네이밍

### 구분자 및 네임스페이스

- **규칙**: [MUST] 키 이름은 콜론(`:`)을 구분자로 사용하여 계층 구조를 표현한다.
- **이유**: Redis는 평면(flat) 네임스페이스이므로, 콜론으로 논리적 계층을 구분하면 키 관리와 디버깅이 용이해진다.
- **좋은 예시**:
  ```
  user:1001:profile
  order:5678:status
  cache:product:list:page:1
  session:abc123def456
  ```
- **나쁜 예시**:
  ```
  user_1001_profile      -- 밑줄 구분자 (콜론 사용 권장)
  user.1001.profile      -- 마침표 구분자 (비표준)
  user1001profile        -- 구분자 없음 (가독성 저하)
  ```

### 네임스페이스 접두사

- **규칙**: [MUST] 키에 서비스/기능별 네임스페이스 접두사를 부여한다.
- **이유**: 멀티 서비스 환경에서 키 충돌을 방지하고, 관련 키를 그룹으로 관리할 수 있다.

| 접두사 | 용도 | 예시 |
|--------|------|------|
| `cache:` | 캐시 데이터 (TTL 필수) | `cache:product:100` |
| `session:` | 세션 데이터 | `session:abc123` |
| `lock:` | 분산 락 | `lock:order:create:5678` |
| `queue:` | 작업 큐 | `queue:email:send` |
| `rate:` | Rate Limiting | `rate:api:user:1001` |
| `temp:` | 임시 데이터 | `temp:import:batch:99` |
| `config:` | 설정 값 | `config:feature:dark_mode` |

### 키 길이 제한

- **규칙**: [SHOULD] 키 이름은 가능한 짧게 유지하되, 의미를 잃지 않도록 한다. 최대 1024 바이트를 초과하지 않는다.
- **이유**: 키가 길수록 메모리를 더 많이 사용하고, 네트워크 대역폭을 소비한다. Redis는 수백만~수십억 개의 키를 저장할 수 있으므로 키 크기가 누적되면 영향이 크다.
- **좋은 예시**:
  ```
  u:1001:prof          -- 약어를 사용해도 팀 내 합의가 있다면 허용
  user:1001:profile    -- 명확한 전체 이름 (권장)
  ```
- **나쁜 예시**:
  ```
  this:is:a:very:long:key:name:that:contains:too:much:unnecessary:information:user:1001:profile
  ```

### 키 네이밍 패턴

- **규칙**: [MUST] 키 이름은 소문자와 콜론, 숫자만 사용한다. 공백이나 특수문자를 포함하지 않는다.
- **이유**: 일관된 형식은 키 조회와 패턴 매칭을 예측 가능하게 한다.

- **규칙**: [SHOULD] 키 이름 패턴은 `{네임스페이스}:{엔티티}:{식별자}:{속성}` 형태를 따른다.
- **이유**: 일관된 패턴은 키 구조를 예측 가능하게 하여 디버깅과 모니터링을 용이하게 한다.

## 데이터 구조 선택

### 데이터 구조 선택 기준

| 데이터 구조 | 사용 기준 | 대표 사용 사례 |
|------------|----------|--------------|
| String | 단일 값 저장, 카운터, 간단한 캐시 | 페이지 캐시, 조회수 카운터, 세션 토큰 |
| Hash | 객체/엔티티 표현 (필드-값 쌍) | 사용자 프로필, 상품 정보, 설정 값 |
| List | 순서가 있는 데이터, 큐/스택 | 작업 큐, 최근 활동 로그, 타임라인 |
| Set | 중복 없는 집합, 태깅, 고유 추적 | 고유 방문자 수, 태그 목록, 좋아요 사용자 |
| Sorted Set | 점수 기반 정렬, 랭킹, 스케줄링 | 리더보드, Rate Limiter, 예약 작업 |

### String

- **규칙**: [SHOULD] 단순 키-값 캐싱에는 String을 사용한다.
- **이유**: 가장 기본적인 데이터 구조로, 조회/저장이 O(1)이며 모든 종류의 직렬화된 데이터를 저장할 수 있다.
- **좋은 예시**:
  ```redis
  SET cache:product:100 '{"id":100,"name":"키보드","price":50000}' EX 3600
  GET cache:product:100

  -- 카운터
  INCR counter:page_view:home
  ```

### Hash

- **규칙**: [SHOULD] 객체의 여러 필드를 독립적으로 읽기/쓰기해야 하는 경우 Hash를 사용한다.
- **이유**: 전체 객체를 직렬화/역직렬화할 필요 없이 특정 필드만 업데이트할 수 있어 효율적이다.
- **좋은 예시**:
  ```redis
  HSET user:1001:profile name "홍길동" email "hong@example.com" age 30
  HGET user:1001:profile email
  HINCRBY user:1001:profile login_count 1
  ```

### List

- **규칙**: [SHOULD] FIFO 큐 또는 최근 N개 항목 유지에 List를 사용한다.
- **이유**: 양 끝에서의 push/pop이 O(1)이며, LTRIM으로 크기를 제한할 수 있다.
- **좋은 예시**:
  ```redis
  -- 작업 큐 (producer/consumer)
  RPUSH queue:email:send '{"to":"user@example.com","subject":"Welcome"}'
  LPOP queue:email:send

  -- 최근 활동 로그 (최대 100건 유지)
  LPUSH activity:user:1001 '{"action":"login","time":"2025-01-01T10:00:00Z"}'
  LTRIM activity:user:1001 0 99
  ```

### Set

- **규칙**: [SHOULD] 중복 제거가 필요하거나 집합 연산(교집합, 합집합)이 필요한 경우 Set을 사용한다.
- **이유**: 멤버 추가/조회/삭제가 O(1)이며, 집합 연산을 기본으로 지원한다.
- **좋은 예시**:
  ```redis
  -- 상품에 대한 좋아요 사용자 추적
  SADD like:product:100 "user:1001" "user:1002"
  SISMEMBER like:product:100 "user:1001"  -- 좋아요 여부 확인
  SCARD like:product:100                   -- 좋아요 수
  ```

### Sorted Set

- **규칙**: [SHOULD] 점수 기반 정렬이나 랭킹이 필요한 경우 Sorted Set을 사용한다.
- **이유**: 삽입이 O(log N)이며, 범위 조회와 순위 조회를 효율적으로 지원한다.
- **좋은 예시**:
  ```redis
  -- 판매량 기준 상품 랭킹
  ZADD ranking:product:sales 150 "product:100" 230 "product:200" 89 "product:300"
  ZREVRANGE ranking:product:sales 0 9  -- 상위 10개 상품
  ZRANK ranking:product:sales "product:200"  -- 순위 조회
  ```

## TTL 및 캐시

### TTL 설정 기준

- **규칙**: [MUST] 캐시 데이터(cache: 접두사)에는 반드시 TTL을 설정한다.
- **이유**: TTL이 없는 캐시 데이터는 메모리를 영구적으로 점유하여 메모리 부족을 유발한다.

- **규칙**: [SHOULD] 데이터의 변경 빈도에 따라 TTL을 차등 적용한다.

| 데이터 유형 | 권장 TTL | 예시 |
|------------|---------|------|
| 자주 변하는 데이터 | 1~5분 | 실시간 재고, 인기 검색어 |
| 준정적 데이터 | 1~24시간 | 사용자 프로필, 상품 상세 |
| 거의 변하지 않는 데이터 | 24시간~7일 | 카테고리 목록, 설정 값 |
| 세션 데이터 | 30분~24시간 | 로그인 세션 |

- **좋은 예시**:
  ```redis
  -- 상품 상세 캐시 (1시간 TTL)
  SET cache:product:100 '{"id":100,...}' EX 3600

  -- 세션 데이터 (30분 TTL)
  SET session:abc123 '{"user_id":1001}' EX 1800
  ```

### 캐시 전략

#### Cache-Aside (Lazy Loading)

- **규칙**: [SHOULD] 기본 캐시 전략은 Cache-Aside 패턴을 사용한다.
- **이유**: 구현이 단순하고, 캐시에 실제 요청되는 데이터만 저장하여 메모리 효율이 높다.
- **좋은 예시**:
  ```python
  # Cache-Aside 패턴 (의사 코드)
  def get_product(product_id):
      # 1. 캐시에서 조회
      cached = redis.get(f"cache:product:{product_id}")
      if cached:
          return json.loads(cached)

      # 2. 캐시 미스 -> DB에서 조회
      product = db.query("SELECT * FROM products WHERE id = %s", product_id)

      # 3. 캐시에 저장 (TTL 1시간)
      redis.set(f"cache:product:{product_id}", json.dumps(product), ex=3600)

      return product
  ```

#### Write-Through

- **규칙**: [MAY] 데이터의 일관성이 중요한 경우 Write-Through 패턴을 적용할 수 있다.
- **이유**: 쓰기 시점에 캐시와 DB를 함께 갱신하므로 캐시 데이터가 항상 최신이다. 단, 쓰기 지연이 증가한다.

### 캐시 무효화

- **규칙**: [MUST] 데이터 변경(CUD) 시 관련 캐시를 즉시 무효화(삭제)한다.
- **이유**: 오래된 캐시 데이터가 유지되면 사용자에게 잘못된 정보가 표시된다.
- **좋은 예시**:
  ```python
  # 상품 정보 수정 시 캐시 무효화
  def update_product(product_id, data):
      db.execute("UPDATE products SET ... WHERE id = %s", product_id)
      redis.delete(f"cache:product:{product_id}")
      redis.delete(f"cache:product:list:page:1")  # 목록 캐시도 함께 무효화
  ```

- **규칙**: [SHOULD] 연관 캐시가 여러 개인 경우, 키 패턴을 기반으로 일괄 무효화할 수 있도록 네임스페이스를 설계한다.
- **이유**: 관련 캐시가 누락 없이 정리되어야 데이터 정합성이 유지된다.

### 캐시 스탬피드 방지

- **규칙**: [SHOULD] 동시에 많은 요청이 같은 캐시를 갱신하는 캐시 스탬피드(stampede)를 방지한다.
- **이유**: 캐시 만료 시 다수의 요청이 동시에 DB로 몰리면 DB 부하가 급증한다.
- **해결 방법**: 분산 락(lock) 또는 TTL에 랜덤 지터(jitter) 추가
- **좋은 예시**:
  ```python
  # TTL에 랜덤 지터 추가하여 동시 만료 방지
  import random
  base_ttl = 3600
  jitter = random.randint(0, 300)  # 0~5분 랜덤
  redis.set(f"cache:product:{product_id}", data, ex=base_ttl + jitter)
  ```

## Pub/Sub

### 사용 시점

- **규칙**: [MAY] 실시간 이벤트 브로드캐스트가 필요한 경우 Redis Pub/Sub을 사용할 수 있다.
- **이유**: Pub/Sub은 발행-구독 모델로, 다수의 서비스 인스턴스에 실시간으로 메시지를 전달할 수 있다.

- **규칙**: [MUST NOT] 메시지 유실이 허용되지 않는 중요한 비즈니스 로직에 Pub/Sub을 사용하지 않는다.
- **이유**: Redis Pub/Sub은 "fire-and-forget" 방식으로, 구독자가 연결되어 있지 않으면 메시지가 유실된다. 메시지 보장이 필요한 경우 Redis Streams 또는 별도 메시지 큐(RabbitMQ, Kafka 등)를 사용한다.

### 메시지 설계

- **규칙**: [SHOULD] Pub/Sub 채널명은 키 네이밍과 동일한 콜론(`:`) 구분 패턴을 따른다.
- **이유**: 일관된 네이밍으로 채널 관리가 용이해진다.

- **규칙**: [SHOULD] 메시지 본문은 JSON 형식으로 직렬화하며, `event`, `data`, `timestamp` 필드를 포함한다.
- **이유**: 표준화된 메시지 구조는 구독자 측 파싱을 단순화하고, 디버깅을 용이하게 한다.
- **좋은 예시**:
  ```json
  // 채널: event:order:status_changed
  {
    "event": "order:status_changed",
    "data": {
      "order_id": 5678,
      "old_status": "pending",
      "new_status": "completed"
    },
    "timestamp": "2025-01-15T10:30:00Z"
  }
  ```

### Pub/Sub 사용 사례

| 사용 사례 | 채널 패턴 | 설명 |
|----------|----------|------|
| 캐시 무효화 브로드캐스트 | `event:cache:invalidate` | 멀티 인스턴스 환경에서 로컬 캐시 동기화 |
| 실시간 알림 | `event:notification:{user_id}` | 사용자별 실시간 알림 전달 |
| 설정 변경 전파 | `event:config:updated` | 설정 변경을 모든 인스턴스에 전파 |

## 안티패턴

### 큰 키 (Big Key)

- **규칙**: [MUST NOT] 단일 키에 과도하게 큰 값을 저장하지 않는다. (String: 1MB 이상, Collection: 10,000개 이상의 요소)
- **이유**: 큰 키는 읽기/쓰기 시 네트워크 지연과 메모리 단편화를 유발하고, 삭제 시 Redis가 일시적으로 블로킹될 수 있다.
- **해결 방법**: 데이터를 분할(sharding)하여 여러 키로 나눈다.
- **좋은 예시**:
  ```redis
  -- 대량 사용자 목록을 분할 저장
  SADD users:group:1 "user:1" "user:2" ... "user:1000"
  SADD users:group:2 "user:1001" "user:1002" ... "user:2000"
  ```
- **나쁜 예시**:
  ```redis
  -- 수십만 명의 사용자를 하나의 Set에 저장
  SADD users:all "user:1" "user:2" ... "user:500000"
  ```

### KEYS 명령어 사용

- **규칙**: [MUST NOT] 운영 환경에서 `KEYS` 명령어를 사용하지 않는다.
- **이유**: KEYS는 모든 키를 순회하는 O(N) 명령어로, 키가 많은 운영 환경에서 Redis 서버를 블로킹하여 서비스 장애를 유발할 수 있다.
- **좋은 예시**:
  ```redis
  -- SCAN으로 점진적으로 키를 탐색
  SCAN 0 MATCH "cache:product:*" COUNT 100
  ```
- **나쁜 예시**:
  ```redis
  -- 운영 환경에서 절대 사용 금지
  KEYS cache:product:*
  ```

### TTL 미설정

- **규칙**: [MUST NOT] 임시 데이터나 캐시에 TTL을 설정하지 않고 저장하지 않는다.
- **이유**: TTL이 없으면 메모리가 점진적으로 증가하여 결국 OOM(Out Of Memory)이 발생하거나, eviction 정책에 의해 중요한 데이터가 의도치 않게 삭제될 수 있다.

### 단일 키 과부하 (Hot Key)

- **규칙**: [MUST NOT] 전체 트래픽이 단일 키에 집중되도록 설계하지 않는다.
- **이유**: Redis는 단일 스레드로 동작하므로, 하나의 키에 대한 과도한 요청은 전체 Redis 성능에 영향을 준다.
- **해결 방법**: 로컬 캐시 계층을 추가하거나, 키를 여러 개로 분산(sharding)한다.
- **좋은 예시**:
  ```python
  # Hot Key 분산: 읽기 요청을 여러 키로 분산
  import random
  shard = random.randint(0, 3)
  value = redis.get(f"cache:hot_data:shard:{shard}")
  ```

### Flush 명령어 사용

- **규칙**: [MUST NOT] 운영 환경에서 `FLUSHDB` 또는 `FLUSHALL` 명령어를 사용하지 않는다.
- **이유**: 모든 데이터가 즉시 삭제되어 복구가 불가능하며, 서비스 장애를 유발한다.

## 참고 자료

- [Redis 공식 문서](https://redis.io/docs/)
- [Redis Data Types](https://redis.io/docs/latest/develop/data-types/)
- [Redis Best Practices (DragonflyDB)](https://www.dragonflydb.io/guides/redis-best-practices)
- [Redis Key Naming Conventions (Redimo)](https://www.redimo.dev/blog/posts/redis-key-naming-conventions)
- [Redis Caching Strategies and Best Practices (Terabyte Systems)](https://terabyte.systems/posts/redis-caching-strategies-best-practices/)
- [Redis Development Guidelines (GitLab)](https://docs.gitlab.com/development/redis/)
- [Amazon ElastiCache - Caching Strategies](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html)
