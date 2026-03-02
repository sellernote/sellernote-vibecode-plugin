# Redis Convention

> This document defines the rules applied to Redis projects.
> Parent rules: DATABASE_CONVENTION.md

## Key Naming

### Delimiters and Namespaces

- **Rule**: [MUST] Key names use colons (`:`) as delimiters to represent hierarchical structures.
- **Good examples**:
  ```
  user:1001:profile
  order:5678:status
  cache:product:list:page:1
  session:abc123def456
  ```

### Namespace Prefixes

- **Rule**: [MUST] Keys must be prefixed with service/feature-specific namespace prefixes.

| Prefix | Purpose | Example |
|--------|---------|---------|
| `cache:` | Cache data (TTL required) | `cache:product:100` |
| `session:` | Session data | `session:abc123` |
| `lock:` | Distributed locks | `lock:order:create:5678` |
| `queue:` | Task queues | `queue:email:send` |
| `rate:` | Rate Limiting | `rate:api:user:1001` |
| `temp:` | Temporary data | `temp:import:batch:99` |
| `config:` | Configuration values | `config:feature:dark_mode` |

### Key Length Limits

- **Rule**: [SHOULD] Key names should be kept as short as possible without losing meaning. Must not exceed 1024 bytes.

### Key Naming Patterns

- **Rule**: [MUST] Key names use only lowercase letters, colons, and numbers. Do not include spaces or special characters.
- **Rule**: [SHOULD] Key name patterns should follow the format `{namespace}:{entity}:{identifier}:{attribute}`.

## Data Structure Selection

### Data Structure Selection Criteria

| Data Structure | Selection Criteria | Representative Use Cases |
|---------------|-------------------|------------------------|
| String | Single value storage, counters, simple caching | Page cache, view counters, session tokens |
| Hash | Object/entity representation (field-value pairs) | User profiles, product information, configuration values |
| List | Ordered data, queues/stacks | Task queues, recent activity logs, timelines |
| Set | Duplicate-free collections, tagging, unique tracking | Unique visitor counts, tag lists, liked-by users |
| Sorted Set | Score-based sorting, ranking, scheduling | Leaderboards, Rate Limiter, scheduled tasks |

### String

- **Rule**: [SHOULD] Use String for simple key-value caching.
- **Good examples**:
  ```redis
  SET cache:product:100 '{"id":100,"name":"키보드","price":50000}' EX 3600
  GET cache:product:100

  -- 카운터
  INCR counter:page_view:home
  ```

### Hash

- **Rule**: [SHOULD] Use Hash when multiple fields of an object need to be read/written independently.
- **Good examples**:
  ```redis
  HSET user:1001:profile name "홍길동" email "hong@example.com" age 30
  HGET user:1001:profile email
  HINCRBY user:1001:profile login_count 1
  ```

### List

- **Rule**: [SHOULD] Use List for FIFO queues or maintaining the most recent N items.
- **Good examples**:
  ```redis
  -- 작업 큐 (producer/consumer)
  RPUSH queue:email:send '{"to":"user@example.com","subject":"Welcome"}'
  LPOP queue:email:send

  -- 최근 활동 로그 (최대 100건 유지)
  LPUSH activity:user:1001 '{"action":"login","time":"2025-01-01T10:00:00Z"}'
  LTRIM activity:user:1001 0 99
  ```

### Set

- **Rule**: [SHOULD] Use Set when deduplication is needed or set operations (intersection, union) are required.
- **Good examples**:
  ```redis
  SADD like:product:100 "user:1001" "user:1002"
  SISMEMBER like:product:100 "user:1001"  -- 좋아요 여부 확인
  SCARD like:product:100                   -- 좋아요 수
  ```

### Sorted Set

- **Rule**: [SHOULD] Use Sorted Set when score-based sorting or ranking is needed.
- **Good examples**:
  ```redis
  ZADD ranking:product:sales 150 "product:100" 230 "product:200" 89 "product:300"
  ZREVRANGE ranking:product:sales 0 9  -- 상위 10개 상품
  ZRANK ranking:product:sales "product:200"  -- 순위 조회
  ```

## TTL and Caching

### TTL Configuration Criteria

- **Rule**: [MUST] Cache data (with `cache:` prefix) must always have a TTL set.
- **Rule**: [SHOULD] Apply differentiated TTL values based on data change frequency.

| Data Type | Recommended TTL | Example |
|-----------|----------------|---------|
| Frequently changing data | 1–5 minutes | Real-time inventory, trending search terms |
| Semi-static data | 1–24 hours | User profiles, product details |
| Rarely changing data | 24 hours–7 days | Category lists, configuration values |
| Session data | 30 minutes–24 hours | Login sessions |

- **Good examples**:
  ```redis
  SET cache:product:100 '{"id":100,...}' EX 3600
  SET session:abc123 '{"user_id":1001}' EX 1800
  ```

### Cache Strategies

#### Cache-Aside (Lazy Loading)

- **Rule**: [SHOULD] The default cache strategy should use the Cache-Aside pattern.
- **Good examples**:
  ```python
  def get_product(product_id):
      cached = redis.get(f"cache:product:{product_id}")
      if cached:
          return json.loads(cached)

      product = db.query("SELECT * FROM product WHERE id = %s", product_id)
      redis.set(f"cache:product:{product_id}", json.dumps(product), ex=3600)
      return product
  ```

#### Write-Through

- **Rule**: [MAY] The Write-Through pattern may be applied when data consistency is critical. (Updates both cache and DB at write time)

### Cache Invalidation

- **Rule**: [MUST] When data is modified (CUD), related caches must be immediately invalidated (deleted).
- **Good examples**:
  ```python
  def update_product(product_id, data):
      db.execute("UPDATE product SET ... WHERE id = %s", product_id)
      redis.delete(f"cache:product:{product_id}")
      redis.delete(f"cache:product:list:page:1")  # 목록 캐시도 함께 무효화
  ```

- **Rule**: [SHOULD] When there are multiple related caches, design namespaces to enable batch invalidation based on key patterns.

### Cache Stampede Prevention

- **Rule**: [SHOULD] Prevent cache stampedes where many requests simultaneously try to refresh the same cache. Resolve using distributed locks or by adding random jitter to TTL.
- **Good examples**:
  ```python
  import random
  base_ttl = 3600
  jitter = random.randint(0, 300)  # 0~5분 랜덤
  redis.set(f"cache:product:{product_id}", data, ex=base_ttl + jitter)
  ```

## Pub/Sub

### When to Use

- **Rule**: [MAY] Redis Pub/Sub may be used when real-time event broadcasting is needed.
- **Rule**: [MUST NOT] Do not use Pub/Sub for critical business logic where message loss is not acceptable. (Fire-and-forget approach causes message loss when subscribers are disconnected. Use Redis Streams or a separate message queue instead)

### Message Design

- **Rule**: [SHOULD] Pub/Sub channel names should follow the same colon (`:`) delimiter pattern as key naming.
- **Rule**: [SHOULD] Message bodies should be serialized in JSON format, including `event`, `data`, and `timestamp` fields.
- **Good examples**:
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

### Pub/Sub Use Cases

| Use Case | Channel Pattern | Description |
|----------|----------------|-------------|
| Cache invalidation broadcast | `event:cache:invalidate` | Synchronize local caches in multi-instance environments |
| Real-time notifications | `event:notification:{user_id}` | Deliver real-time notifications per user |
| Configuration change propagation | `event:config:updated` | Propagate configuration changes to all instances |

## Anti-Patterns

### Big Keys

- **Rule**: [MUST NOT] Do not store excessively large values in a single key. (String: over 1MB, Collection: over 10,000 elements)
- **Solution**: Split data by sharding across multiple keys.
- **Good examples**:
  ```redis
  SADD users:group:1 "user:1" "user:2" ... "user:1000"
  SADD users:group:2 "user:1001" "user:1002" ... "user:2000"
  ```

### Using the KEYS Command

- **Rule**: [MUST NOT] Do not use the `KEYS` command in production environments. (O(N) command that causes Redis server blocking)
- **Good examples**:
  ```redis
  -- SCAN으로 점진적으로 키를 탐색
  SCAN 0 MATCH "cache:product:*" COUNT 100
  ```

### Missing TTL

- **Rule**: [MUST NOT] Do not store temporary data or cache without setting a TTL. (Risk of OOM due to gradual memory increase)

### Hot Key (Single Key Overload)

- **Rule**: [MUST NOT] Do not design systems where all traffic is concentrated on a single key. (Redis is single-threaded, so this affects overall performance)
- **Solution**: Add a local cache layer or distribute across multiple keys via sharding.
- **Good examples**:
  ```python
  import random
  shard = random.randint(0, 3)
  value = redis.get(f"cache:hot_data:shard:{shard}")
  ```

### Using Flush Commands

- **Rule**: [MUST NOT] Do not use `FLUSHDB` or `FLUSHALL` commands in production environments. (All data is immediately deleted and cannot be recovered)