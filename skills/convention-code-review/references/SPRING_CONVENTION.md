# Spring Convention

> This document defines the rules applied to Spring Boot projects.
> Parent rules: BACKEND_CONVENTION.md

## Tech Stack

| Item | Version/Configuration |
|------|----------|
| Test Framework | JUnit 5 + Mockito |

## Project Structure

### Package Structure

- **Rule**: [MUST] Use a domain-centric (Package by Feature) package structure.

```
com.sellernote.api/
├── SellernoteApiApplication.java
│
├── global/                             # Global configuration and common modules
│   ├── config/
│   ├── error/
│   ├── auth/
│   ├── common/
│   └── aop/
│
├── domain/                             # Domain modules
│   ├── order/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── entity/
│   │   ├── dto/
│   │   └── exception/
│   ├── user/
│   └── product/
│
└── infra/                              # External infrastructure integration
    ├── mail/
    └── storage/
```

### Layer-Centric Structure (Small Projects)

- **Rule**: [MAY] For small projects, a layer-centric package structure may be used.

```
com.sellernote.api/
├── controller/
├── service/
├── repository/
├── entity/
├── dto/
└── config/
```

## Bean Management

### Component Scan

- **Rule**: [MUST] Use stereotype annotations according to their intended purpose.

| Annotation | Usage Target |
|-----------|----------|
| `@Controller` / `@RestController` | HTTP request handling (Controller layer) |
| `@Service` | Business logic (Service layer) |
| `@Repository` | Data access (Repository layer) |
| `@Component` | General beans that do not fall into the above categories |

### Constructor Injection

- **Rule**: [MUST] Use constructor injection for dependency injection. Do not use field injection (`@Autowired`).
- **Good Example**:
  ```java
  @Service
  @RequiredArgsConstructor
  public class OrderService {
      private final OrderRepository orderRepository;
      private final PaymentService paymentService;
  }
  ```
> [MUST NOT] Field injection with `@Autowired` is prohibited.

### @Configuration Classes

- **Rule**: [SHOULD] Use `@Configuration` + `@Bean` when bean registration for third-party libraries or complex initialization logic is required.
- **Good Example**:
  ```java
  @Configuration
  public class RestClientConfig {
      @Bean
      public RestTemplate restTemplate(RestTemplateBuilder builder) {
          return builder
              .setConnectTimeout(Duration.ofSeconds(5))
              .setReadTimeout(Duration.ofSeconds(10))
              .build();
      }
  }
  ```

### Conditional Bean Registration

- **Rule**: [MAY] `@ConditionalOnProperty`, `@Profile`, etc. may be used when different beans need to be registered depending on the environment or conditions.
- **Good Example**:
  ```java
  @Configuration
  public class StorageConfig {
      @Bean
      @ConditionalOnProperty(name = "storage.type", havingValue = "s3")
      public StorageService s3StorageService() { return new S3StorageService(); }

      @Bean
      @ConditionalOnProperty(name = "storage.type", havingValue = "local")
      public StorageService localStorageService() { return new LocalStorageService(); }
  }
  ```

## Exception Handling

### @ControllerAdvice Global Exception Handling

- **Rule**: [MUST] Implement a global exception handling handler using `@RestControllerAdvice`.
- **Good Example**:
  ```java
  @RestControllerAdvice
  @Slf4j
  public class GlobalExceptionHandler {
      @ExceptionHandler(BusinessException.class)
      public ResponseEntity<ApiResponse<?>> handleBusinessException(BusinessException e) {
          log.warn("Business exception: {}", e.getMessage());
          ErrorCode errorCode = e.getErrorCode();
          return ResponseEntity.status(errorCode.getHttpStatus())
              .body(ApiResponse.error(errorCode.getCode(), e.getMessage()));
      }

      @ExceptionHandler(MethodArgumentNotValidException.class)
      public ResponseEntity<ApiResponse<?>> handleValidationException(MethodArgumentNotValidException e) {
          List<String> details = e.getBindingResult().getFieldErrors().stream()
              .map(error -> error.getField() + ": " + error.getDefaultMessage()).toList();
          return ResponseEntity.status(HttpStatus.BAD_REQUEST)
              .body(ApiResponse.error("VALIDATION_FAILED", "입력 데이터가 유효하지 않습니다.", details));
      }

      @ExceptionHandler(Exception.class)
      public ResponseEntity<ApiResponse<?>> handleException(Exception e) {
          log.error("Unexpected error", e);
          return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
              .body(ApiResponse.error("INTERNAL_ERROR", "서버 내부 오류가 발생했습니다."));
      }
  }
  ```

### Custom Exception Hierarchy

- **Rule**: [SHOULD] Define a common base class for business exceptions, and create specific exceptions per domain.
- **Good Example**:
  ```java
  @Getter
  public class BusinessException extends RuntimeException {
      private final ErrorCode errorCode;
      public BusinessException(ErrorCode errorCode) {
          super(errorCode.getMessage());
          this.errorCode = errorCode;
      }
  }

  @Getter @RequiredArgsConstructor
  public enum ErrorCode {
      ORDER_NOT_FOUND(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "주문을 찾을 수 없습니다."),
      INSUFFICIENT_STOCK(HttpStatus.BAD_REQUEST, "INSUFFICIENT_STOCK", "재고가 부족합니다."),
      DUPLICATE_EMAIL(HttpStatus.CONFLICT, "DUPLICATE_EMAIL", "이미 사용 중인 이메일입니다.");
      private final HttpStatus httpStatus;
      private final String code;
      private final String message;
  }

  public class OrderNotFoundException extends BusinessException {
      public OrderNotFoundException() { super(ErrorCode.ORDER_NOT_FOUND); }
  }
  ```

### @ExceptionHandler Scope

- **Rule**: [SHOULD] Declare `@ExceptionHandler` on the specific Controller for exception handling that only applies to that Controller. Declare common exception handling in `@RestControllerAdvice`.

## Transaction Management

### @Transactional Usage Rules

- **Rule**: [MUST] Declare `@Transactional` on Service methods that modify data.
- **Good Example**:
  ```java
  @Service
  @Transactional(readOnly = true)  // Class level: default read-only
  @RequiredArgsConstructor
  public class OrderService {
      private final OrderRepository orderRepository;

      public Order findById(Long id) {
          return orderRepository.findById(id).orElseThrow(OrderNotFoundException::new);
      }

      @Transactional  // Mutation method - overrides readOnly
      public Order createOrder(CreateOrderRequest request) {
          return orderRepository.save(Order.from(request));
      }
  }
  ```

### readOnly Configuration

- **Rule**: [SHOULD] Declare `@Transactional(readOnly = true)` at the class level, and override with `@Transactional` only on mutation methods.

### Propagation Level

- **Rule**: [SHOULD] Use the default propagation level `REQUIRED`. Use `REQUIRES_NEW` only when an independent transaction is needed.

| Propagation Level | Usage |
|----------|------|
| `REQUIRED` (default) | Joins an existing transaction if one exists, otherwise creates a new one |
| `REQUIRES_NEW` | Always creates a new transaction (for cases requiring independent commits such as logging, auditing, etc.) |
| `MANDATORY` | Requires an existing transaction (throws an exception if none exists) |

- **Good Example**:
  ```java
  @Service @RequiredArgsConstructor
  public class AuditService {
      private final AuditLogRepository auditLogRepository;

      @Transactional(propagation = Propagation.REQUIRES_NEW)
      public void log(String action, String detail) {
          auditLogRepository.save(new AuditLog(action, detail));
      }
  }
  ```

### Transaction Scope

- **Rule**: [MUST] Minimize the transaction scope. External API calls, file I/O, etc. should be performed outside the transaction.

## AOP

### Cross-Cutting Concern Separation

- **Rule**: [SHOULD] Separate cross-cutting concerns such as logging, performance measurement, and auditing using AOP.
- **Good Example**:
  ```java
  @Aspect @Component @Slf4j
  public class LoggingAspect {
      @Around("@within(org.springframework.web.bind.annotation.RestController)")
      public Object logControllerMethod(ProceedingJoinPoint joinPoint) throws Throwable {
          String methodName = joinPoint.getSignature().toShortString();
          log.info(">>> Request: {}", methodName);
          long start = System.currentTimeMillis();
          Object result = joinPoint.proceed();
          log.info("<<< Response: {} ({}ms)", methodName, System.currentTimeMillis() - start);
          return result;
      }
  }
  ```

### AOP Application Scope

- **Rule**: [SHOULD] Use AOP only for cross-cutting concerns such as logging, auditing, performance measurement, and security checks. Do not use it for business logic.

## Profile Management

### Environment-Specific Configuration Separation

- **Rule**: [MUST] Separate environment-specific configurations using Spring Profiles.

```
src/main/resources/
├── application.yml
├── application-local.yml
├── application-dev.yml
├── application-staging.yml
└── application-prod.yml
```

### Sensitive Information Management

- **Rule**: [MUST] Do not write sensitive information such as DB passwords or API keys directly in configuration files. Use environment variables or secret management tools.
- **Good Example**:
  ```yaml
  # application-prod.yml
  spring:
    datasource:
      url: ${DB_URL}
      username: ${DB_USERNAME}
      password: ${DB_PASSWORD}
  ```
> [MUST NOT] Hardcoding actual passwords in configuration files is prohibited.

### Profile Activation

- **Rule**: [MUST] Configure `application-prod.yml` to be automatically activated in the production environment. Set the default local Profile to `local`.
- **Good Example**:
  ```yaml
  # application.yml (common)
  spring:
    profiles:
      default: local
  ```

## Anti-Patterns

### @Autowired Field Injection

- **Rule**: [MUST NOT] Do not use field injection with `@Autowired`. Use constructor injection.

### Missing Transactions

- **Rule**: [MUST NOT] Do not perform multiple data modification operations without `@Transactional`.
> A partial commit may occur when an exception is thrown mid-operation, breaking data consistency.

### Self-Invocation (Proxy Bypass)

- **Rule**: [MUST NOT] Do not directly call `@Transactional` methods within the same class.
> Since Spring AOP is proxy-based, calls within the same class bypass the proxy, causing `@Transactional` to be ignored.
- **Solution**: Extract the logic requiring a transaction into a separate Service class.

### @Transactional on private Methods

- **Rule**: [MUST NOT] Do not declare `@Transactional` on `private` methods.
> Spring AOP proxies only apply to `public` methods.

### Excessive AOP

- **Rule**: [SHOULD NOT] Do not use AOP for business logic. Limit AOP to cross-cutting concerns only.

### Long Transactions

- **Rule**: [SHOULD NOT] Do not perform long-running operations such as external API calls or file uploads inside a transaction.
- **Good Example**:
  ```java
  @Transactional
  public Order createOrder(CreateOrderRequest request) {
      return orderRepository.save(Order.from(request));
  }

  // External calls outside the transaction
  public void processOrderCreation(CreateOrderRequest request) {
      Order order = createOrder(request);
      s3Service.uploadReceipt(order);
      emailService.sendConfirmation(order);
  }
  ```