# Common Conventions

> Defines common rules that apply to all roles and tools.
> For rules specific to a particular domain, refer to the documents in subdirectories.
>
> - [TypeScript Convention](typescript/TYPESCRIPT_CONVENTION.md)

## Domain Glossary

Defines business/technical terms used in the project.
AI consistently uses the terms defined here for variable names, class names, etc. when generating code.

| Term | English | Description |
|------|---------|-------------|

> Whenever a new term is added, this table must be updated to maintain terminology consistency across the team.

## Naming Conventions

### General Principles

- **Rule**: [MUST] Use clear names that convey meaning on their own.

- **Rule**: [MUST] Only use abbreviations agreed upon by the team. Do not use abbreviations not registered in the domain glossary.

- **Rule**: [MUST NOT] Do not include redundant type information in names. (No Hungarian notation)
  - Note: Do not use type prefixes like `strName`, `arrItems`.

### Variable Names — camelCase

- **Rule**: [MUST] Use camelCase for variable names, function names, and method names.
- **Good Examples**:
  ```typescript
  const userName = 'John';
  const totalPrice = 10000;
  function getUserById(id: string) { ... }
  ```
  - Note: Do not use snake_case (`user_name`) or PascalCase (`UserName`) for variables.

### Class/Interface/Type Names — PascalCase

- **Rule**: [MUST] Use PascalCase for classes, interfaces, type aliases, and Enums.
- **Good Examples**:
  ```typescript
  class UserService { ... }
  interface CreateUserRequest { ... }
  type PaymentStatus = 'pending' | 'completed' | 'failed';
  ```

### Constants — UPPER_SNAKE_CASE

- **Rule**: [MUST] Use UPPER_SNAKE_CASE for immutable global constants and environment variable keys.
- **Good Examples**:
  ```typescript
  const MAX_RETRY_COUNT = 3;
  const API_BASE_URL = 'https://api.example.com';
  ```
- **Rule**: [SHOULD] Use camelCase for object properties or local constants. Use UPPER_SNAKE_CASE only for module-level global constants.

### File Names

- **Rule**: [MUST] File names follow the conventions of the respective framework/tool. If no convention exists, use kebab-case as the default.
- **Good Examples**:
  ```
  user-service.ts
  create-order.dto.ts
  payment-status.type.ts
  ```

### Boolean Naming

- **Rule**: [MUST] Boolean variables must use prefixes such as `is`, `has`, `can`, `should`.
- **Good Examples**:
  ```typescript
  const isActive = true;
  const hasPermission = false;
  const canEdit = user.role === 'admin';
  const shouldRefresh = Date.now() > expiresAt;
  ```
  - Note: Do not use names without prefixes like `active`, `permission` for booleans.
- **Rule**: [MUST NOT] Do not use the `no` prefix to express negation. Instead, combine `is`, `has`, `can`, `should` prefixes with clearly meaningful adjectives.
- **Bad Examples**:
  ```typescript
  const noPermission = true;
  const noStock = false;
  ```
- **Good Examples**:
  ```typescript
  const hasPermission = false;
  const isOutOfStock = true;
  ```

### Function Naming

- **Rule**: [MUST] Function names must start with a verb and use camelCase.
- **Good Examples**:
  ```typescript
  function getUserById(id: string): User { ... }
  function calculateTotalPrice(items: Item[]): number { ... }
  ```
  - Note: Do not use names without verbs (`user()`), or snake_case (`get_user_by_id()`).

## Git Conventions

### Branch Strategy

- **Rule**: [MUST] Follow the branch naming rules below.

| Branch | Purpose | Example |
|--------|---------|---------|
| `main` | Production deployment branch | - |
| `develop` | Development integration branch | - |
| `feat/<description>` | New feature development | `feat/user-authentication` |
| `fix/<description>` | Bug fix | `fix/login-validation-error` |
| `hotfix/<description>` | Production emergency fix | `hotfix/payment-crash` |
| `refactor/<description>` | Refactoring | `refactor/order-service` |
| `chore/<description>` | Build, configuration, and maintenance | `chore/update-dependencies` |

- **Rule**: [MUST] Branch names must use only lowercase letters and hyphens (`-`), with a slash (`/`) separating the type and description.

- **Rule**: [SHOULD] Include the issue number in the branch name when a Jira issue exists.
- **Good Examples**:
  ```
  feat/PROJ-123-user-authentication
  fix/PROJ-456-login-validation
  ```

### Commit Messages — Conventional Commits

- **Rule**: [MUST] Follow the Conventional Commits format.

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**Type Definitions**:

| Type | Description | Example |
|------|-------------|---------|
| `feat` | Add new feature | `feat(auth): add JWT refresh token` |
| `fix` | Bug fix | `fix(order): resolve null pointer in validation` |
| `docs` | Documentation changes | `docs: update API documentation` |
| `style` | Code formatting, missing semicolons, etc. | `style: apply prettier formatting` |
| `refactor` | Code restructuring without behavior change | `refactor(user): extract validation logic` |
| `perf` | Performance improvement | `perf(query): add index for user lookup` |
| `test` | Add/modify tests | `test(auth): add login failure test cases` |
| `chore` | Build, configuration, and maintenance | `chore: update dependencies` |
| `ci` | CI/CD configuration changes | `ci: add staging deployment workflow` |

- **Rule**: [MUST] Write commit titles in imperative mood. Keep them within 50 characters.
- **Rule**: [MUST] Each commit must contain only one concern.
- **Rule**: [SHOULD] If there is a Breaking Change, append `!` after the type and specify `BREAKING CHANGE:` in the footer.
- **Good Examples**:
  ```
  feat(auth)!: change token expiry to 1 hour

  BREAKING CHANGE: token expiry changed from 24h to 1h.
  All existing tokens will be invalidated.
  ```
  - Note: Do not omit the type (`fixed bug`), use past tense, or write meaningless descriptions (`update code`).

### PR Rules

- **Rule**: [MUST] PR titles must follow the Conventional Commits format. (When squash merging, the PR title becomes the commit message)

- **Rule**: [MUST] PR body must include the following:
  - Summary of changes
  - Related issue number (if applicable)
  - Test method or verification items

- **Rule**: [SHOULD] Create PRs in the smallest units possible. (Recommended: 10 or fewer changed files)

- **Rule**: [MUST NOT] Do not merge directly into main/develop branches without review approval.

## Code Review

### Review Criteria

- **Rule**: [MUST] Review code from the following perspectives.

| Perspective | Checklist |
|-------------|-----------|
| Correctness | Does the logic correctly implement the requirements |
| Readability | Is the code clear and easy to understand |
| Maintainability | Is the structure flexible and extensible for changes |
| Performance | Are there unnecessary computations or inefficient patterns |
| Security | Are there security vulnerabilities (input validation, authentication/authorization, etc.) |
| Testing | Are appropriate tests included |
| Conventions | Does it comply with team conventions |

### Approval Conditions

- **Rule**: [MUST] At least 1 reviewer approval is required before merging.
- **Rule**: [SHOULD] For core logic changes, 2 or more approvals are recommended.
- **Rule**: [MUST] All CI pipeline checks (build, test, lint) must pass before merging.

### Writing Review Comments

- **Rule**: [SHOULD] Use the following prefixes in review comments to clarify intent.

| Prefix | Meaning | Example |
|--------|---------|---------|
| `[MUST]` | Must be fixed (merge blocker) | `[MUST] There is a SQL injection risk.` |
| `[SHOULD]` | Recommended fix | `[SHOULD] This can be improved with an early return.` |
| `[NIT]` | Minor improvement suggestion | `[NIT] The variable name could be more descriptive.` |
| `[Q]` | Question | `[Q] What is the intent of this logic?` |

## Error Handling

### Error Code System

- **Rule**: [MUST] Error codes must use string constants in the format `{domain}_{category}_{detail}`.
- **Good Examples**:
  ```typescript
  // domain_category_detail
  const AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED';
  const AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS';
  const ORDER_PAYMENT_FAILED = 'ORDER_PAYMENT_FAILED';
  const USER_NOT_FOUND = 'USER_NOT_FOUND';
  ```

### Error Response Format (HTTP API)

- **Rule**: [MUST] API error responses must follow this standard format.

```json
{
  "success": false,
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "The authentication token has expired.",
    "details": null
  }
}
```

- **Rule**: [SHOULD] Validation errors should include field-level error information in the `details` field.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The input values are invalid.",
    "details": [
      { "field": "email", "message": "Not a valid email format." },
      { "field": "password", "message": "Must be at least 8 characters." }
    ]
  }
}
```

### HTTP Status Code Usage

- **Rule**: [MUST] Return appropriate HTTP status codes. Do not use 400 or 500 for all errors.

| Status Code | Usage |
|-------------|-------|
| 400 | Bad request (validation failure) |
| 401 | Authentication failure (missing or expired token) |
| 403 | Forbidden (authenticated but access denied) |
| 404 | Resource not found |
| 409 | Resource conflict (duplicate creation, etc.) |
| 422 | Unprocessable entity |
| 429 | Too many requests (Rate Limit) |
| 500 | Internal server error |
| 502 | External service error |
| 503 | Service temporarily unavailable |

### Error Handling Principles

- **Rule**: [MUST NOT] Do not expose sensitive implementation details such as stack traces, DB queries, or internal paths in error responses.

- **Rule**: [MUST NOT] Do not use messages that reveal whether an account exists in authentication errors. (Prevents account enumeration attacks)
- **Good Example**: `"The authentication credentials are incorrect."`
  - Note: Do not use specific messages like `"No user found with that email address."`.

## Logging

### Log Levels

- **Rule**: [MUST] Follow these log level criteria.

| Level | Usage | Examples |
|-------|-------|---------|
| `ERROR` | Errors requiring immediate action | DB connection failure, external API outage, payment failure |
| `WARN` | Potential issues, expected exceptions | Retries occurring, config fallback, slow queries |
| `INFO` | Key business events, state changes | User registration, order creation, deployment start |
| `DEBUG` | Detailed information for development/debugging | Function parameters, query results, intermediate calculations |

- **Rule**: [MUST NOT] Do not enable DEBUG level in production environments.

- **Rule**: [SHOULD] ERROR logs should include sufficient context to trace the error (request ID, user ID, input summary, etc.).

### Log Format

- **Rule**: [SHOULD] Use structured logging. JSON format is recommended.
- **Good Examples**:
  ```json
  {
    "timestamp": "2025-01-15T09:30:00.000Z",
    "level": "ERROR",
    "message": "Payment processing failed",
    "service": "order-service",
    "requestId": "req-abc-123",
    "userId": "user-456",
    "errorCode": "ORDER_PAYMENT_FAILED",
    "metadata": {
      "orderId": "ord-789",
      "amount": 50000
    }
  }
  ```

### Sensitive Information Masking

- **Rule**: [MUST] The following information must never be logged in plaintext.

| Sensitive Data Type | Masking Method | Example |
|---------------------|----------------|---------|
| Password | Full masking | `****` |
| Email | Partial masking | `j***@example.com` |
| Phone number | Partial masking | `010-****-5678` |
| Card number | Show last 4 digits only | `****-****-****-1234` |
| Token/API key | Show first 4 characters only | `eyJh****` |
| National ID number | Full masking | `******-*******` |

- **Rule**: [MUST NOT] Do not log entire request/response bodies. Log only selected necessary fields.

- **Rule**: [SHOULD] Automate sensitive information masking in logging middleware or utilities.

## Anti-Patterns

### Magic Numbers/Strings

- **Rule**: [MUST NOT] Do not use numbers or strings with unclear meaning directly in code.
  - Note: Do not directly use literals like `if (status === 3)`, `setTimeout(handler, 86400000)`.
- **Good Examples**:
  ```typescript
  const ORDER_STATUS_COMPLETED = 3;
  if (status === ORDER_STATUS_COMPLETED) { ... }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  setTimeout(handler, ONE_DAY_MS);
  ```

### Hardcoded Passwords/Keys

- **Rule**: [MUST NOT] Do not write passwords, API keys, or secrets directly in source code. Use environment variables or a secret manager.

### Empty Catch

> Applies to all try-catch / try-except / rescue blocks regardless of language.

- **Rule**: [MUST NOT] Do not leave catch blocks empty or silently ignore errors.
- **Rule**: [MUST] At minimum, log at an appropriate level for the exception in the catch block. (Refer to `## Logging > Log Levels` in this document for log level criteria)

| Scenario | Log Level |
|----------|-----------|
| Unrecoverable error | `ERROR` |
| Expected exception / fallback handling | `WARN` |
| Caught as part of normal flow | `INFO` or `DEBUG` |

- **Bad Examples**:
  ```typescript
  try {
    await sendNotification(user);
  } catch (error) {
    // No handling — notification failure goes unnoticed
  }
  ```
- **Good Examples**:
  ```typescript
  try {
    await sendNotification(user);
  } catch (error) {
    logger.warn('Notification sending failed — fallback processing', { userId: user.id, error });
  }
  ```

- **Rule**: [MUST] If an error is intentionally ignored, state the reason in a comment.
- **Good Examples**:
  ```typescript
  try {
    await cacheClient.delete(key);
  } catch {
    // Cache deletion failure is safe to ignore as it will be automatically cleaned up at the next TTL expiration
  }
  ```