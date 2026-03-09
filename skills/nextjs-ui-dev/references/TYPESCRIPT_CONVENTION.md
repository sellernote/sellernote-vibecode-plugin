# TypeScript Convention

> Defines coding rules that apply to all projects using TypeScript.
> Parent rules: COMMON_CONVENTION.md

## Tech Stack

| Item | Version/Setting |
|------|----------|
| strict mode | `true` (required) |

- **Rule**: [MUST] Enable `"strict": true` in `tsconfig.json`.

## Type System

### interface vs type

- **Rule**: [SHOULD] Use `interface` when defining the shape of an object.
- **Rule**: [SHOULD] Use `type` for union types, intersection types, utility type combinations, etc.
- **Good Example**:
  ```typescript
  // Object shape definition → interface
  interface User {
    id: string;
    name: string;
    email: string;
  }

  // Union type → type
  type PaymentStatus = 'pending' | 'completed' | 'failed';

  // Utility type combination → type
  type CreateUserRequest = Omit<User, 'id'>;
  ```

### Generics

- **Rule**: [SHOULD] Use meaningful names for generic type parameters. Single characters (`T`, `U`, etc.) should only be used in simple cases.
- **Good Example**:
  ```typescript
  // Simple case — T is acceptable
  function identity<T>(value: T): T {
    return value;
  }

  // Complex case — use meaningful names
  interface Repository<Entity, Id> {
    findById(id: Id): Promise<Entity | null>;
    save(entity: Entity): Promise<Entity>;
  }
  ```

### Leveraging Utility Types

- **Rule**: [SHOULD] Actively leverage TypeScript built-in utility types (`Partial`, `Pick`, `Omit`, `Record`, etc.).
- **Good Example**:
  ```typescript
  interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  }

  type CreateUserDto = Omit<User, 'id' | 'createdAt'>;
  type UpdateUserDto = Partial<Pick<User, 'name' | 'email'>>;
  ```

### any and unknown

- **Rule**: [MUST NOT] Do not use the `any` type. Use `unknown` when the type is not known.
- **Good Example**:
  ```typescript
  function parseJson(input: string): unknown {
    return JSON.parse(input);
  }

  function processData(data: unknown): void {
    if (typeof data === 'string') {
      console.log(data.toUpperCase()); // Use after type narrowing
    }
  }
  ```

## Coding Style

### Variable Declaration — const / let

- **Rule**: [MUST] Use `const` by default, and only use `let` when reassignment is needed.
- **Rule**: [MUST NOT] Do not use `var`.
- **Good Example**:
  ```typescript
  const userName = 'John';
  const items = [1, 2, 3]; // Array content can still be modified, so use const

  let count = 0;
  count += 1; // Reassignment needed → let
  ```

### Writing Functions

- **Rule**: [MUST] Explicitly declare return types for public API (exported functions).
- **Rule**: [MAY] Return types of internal functions may be delegated to TypeScript inference.
- **Good Example**:
  ```typescript
  // Public API — explicit return type
  export function calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // Internal function — inference allowed
  function formatPrice(price: number) {
    return `${price.toLocaleString()}원`;
  }
  ```

### Arrow Functions

- **Rule**: [SHOULD] Use arrow functions for callbacks and inline functions.
- **Rule**: [SHOULD] Use `function` declarations for top-level (exported) functions.
- **Good Example**:
  ```typescript
  // Top-level export function — function declaration
  export function getActiveUsers(users: User[]): User[] {
    return users.filter((user) => user.isActive);
  }

  // Callback — arrow function
  const sortedItems = items.sort((a, b) => a.price - b.price);
  ```

### Asynchronous Handling — async/await

- **Rule**: [MUST] Use `async/await` when working with Promises. Avoid `.then()` chains.
- **Good Example**:
  ```typescript
  async function fetchUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`User fetch failed: ${response.status}`);
    }
    return response.json();
  }
  ```

- **Rule**: [MUST] Do not omit error handling in async functions. Use `try/catch` or an upper-level error handler.

## null / undefined Handling

### Optional Chaining and Nullish Coalescing

- **Rule**: [MUST] Use optional chaining (`?.`) and nullish coalescing (`??`) to safely handle null/undefined.
- **Good Example**:
  ```typescript
  const city = user?.address?.city;
  const pageSize = input ?? 10; // Only replaces null/undefined
  ```
  - Note: The `||` operator also replaces 0, '', and false, so use `??` instead.

### strictNullChecks

- **Rule**: [MUST] Write code with `strictNullChecks` enabled. (Included in `strict: true`)

- **Rule**: [SHOULD] Distinguish between optional (`?`) and `| undefined` in function parameters.
- **Good Example**:
  ```typescript
  // name does not need to be passed (optional parameter)
  function greet(name?: string): string {
    return `Hello, ${name ?? 'World'}`;
  }

  // value must be passed, but it can be undefined
  function process(value: string | undefined): void {
    if (value !== undefined) {
      console.log(value);
    }
  }
  ```

## Enum vs Union

### Avoiding Enum Usage

- **Rule**: [SHOULD] Use union types or `as const` objects instead of `enum`.

### Enum / as const Naming Rules

- **Rule**: [MUST] Use **PascalCase** for keys and **lowercase snake_case** for values in enums and `as const` objects.
- **Good Example**:
  ```typescript
  // as const object
  const OrderStatus = {
    Pending: 'pending',
    Processing: 'processing',
    Shipped: 'shipped',
    Delivered: 'delivered',
  } as const;

  // enum
  enum PaymentMethod {
    CreditCard = 'credit_card',
    BankTransfer = 'bank_transfer',
    VirtualAccount = 'virtual_account',
  }
  ```
  - Note: Do not use UPPER_CASE (`PENDING`) or camelCase (`pending`) for keys. Do not use UPPER_CASE (`PENDING`) or camelCase (`creditCard`) for values.

### Using Union Types (Simple Cases)

- **Good Example**:
  ```typescript
  // Simple set of strings — union type
  type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

  function updateStatus(orderId: string, status: OrderStatus): void {
    // ...
  }
  ```

### Using as const Objects (When Value References Are Needed)

- **Good Example**:
  ```typescript
  // When values need to be referenced — as const object
  const OrderStatus = {
    Pending: 'pending',
    Processing: 'processing',
    Shipped: 'shipped',
    Delivered: 'delivered',
  } as const;  // Identical to snake_case when value is a single word

  type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

  // Values can be referenced
  if (order.status === OrderStatus.Pending) {
    // ...
  }
  ```

### Cases Where Enum Is Allowed

- **Rule**: [MAY] `enum` may be used only when numeric mapping is needed or when iteration over values is required.
- **Good Example**:
  ```typescript
  enum HttpStatus {
    Ok = 200,
    Created = 201,
    BadRequest = 400,
    NotFound = 404,
    InternalServerError = 500,
  }
  ```
  - Note: Replace string enums with union types or as const.

## Import / Export

### Import Ordering Rules

- **Rule**: [MUST] Group import statements in the following order, with blank lines between groups.

```typescript
// 1. Node.js built-in modules
import path from 'node:path';
import fs from 'node:fs';

// 2. External libraries
import express from 'express';
import { z } from 'zod';

// 3. Internal packages (@sellernote/*)
import { Button } from '@sellernote/ui';
import { formatDate } from '@sellernote/utils';

// 4. Project internal modules (absolute paths)
import { UserService } from '@/services/user-service';
import { validateEmail } from '@/utils/validation';

// 5. Relative path modules
import { UserCard } from './user-card';
import { styles } from './styles';
```

### Type-Only Import

- **Rule**: [MUST] Use `import type` when importing only types.
- **Good Example**:
  ```typescript
  import type { User, CreateUserDto } from '@/types/user';
  import { UserService } from '@/services/user-service';
  ```

### Barrel Export

- **Rule**: [SHOULD] Expose the public API of packages or modules through barrel exports via `index.ts`.
- **Rule**: [MUST NOT] Do not import directly from deep paths. Use barrel-exported paths instead.
- **Good Example**:
  ```typescript
  // packages/utils/src/index.ts
  export { formatDate, formatCurrency } from './format';
  export { validateEmail, validatePhone } from './validation';

  // Usage
  import { formatDate, validateEmail } from '@sellernote/utils';
  ```
  - Note: Do not directly reference internal paths like `@sellernote/utils/src/format/date`.

### Path Alias

- **Rule**: [SHOULD] Use path aliases (`@/`) for project internal imports.
- **Good Example**:
  ```typescript
  import { UserService } from '@/services/user-service';
  ```
  - Note: Do not use deep relative paths like `../../../services/user-service`.

## Linter / Formatter

### ESLint

- **Rule**: [MUST] Use ESLint flat config (`eslint.config.mjs`) with `typescript-eslint`.
- **Good Example**:
  ```javascript
  // eslint.config.mjs
  import eslint from '@eslint/js';
  import tseslint from 'typescript-eslint';

  export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
  );
  ```

### ESLint Enforcement

- **Rule**: [MUST] Running ESLint is mandatory for all code changes.

- **Rule**: [MUST] Include ESLint checks as a required step in the CI/CD pipeline, and block merges when errors occur.
- **Good Example**:
  ```yaml
  # .github/workflows/ci.yml
  jobs:
    lint:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
        - run: npm ci
        - run: npm run lint  # CI fails on ESLint failure → merge blocked
  ```

- **Rule**: [SHOULD] Use the `--max-warnings 0` option when running ESLint to disallow warnings as well.
- **Good Example**:
  ```json
  {
    "scripts": {
      "lint": "eslint . --max-warnings 0",
      "lint:fix": "eslint . --max-warnings 0 --fix"
    }
  }
  ```

### Prettier

- **Rule**: [MUST] Use Prettier as the code formatter, and prevent conflicts with ESLint using `eslint-config-prettier`.

- **Rule**: [SHOULD] Use the following Prettier settings as defaults. (May be adjusted based on team agreement)

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "trailingComma": "all",
  "arrowParens": "always"
}
```

### Pre-commit Hook

- **Rule**: [SHOULD] Use Husky + lint-staged to run automatic linting/formatting before commits.

## Anti-Patterns

### Overuse of as Casting

- **Rule**: [MUST NOT] Do not use type assertions (`as`) to bypass type errors.
  - Note: Do not use patterns like `response.data as User` or `someValue as unknown as number` (double assertion).
- **Good Example**:
  ```typescript
  import { z } from 'zod';

  const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  });

  const user = UserSchema.parse(response.data); // Performs runtime validation
  ```

### Using any

- **Rule**: [MUST NOT] Do not use `any`. Replace with `unknown` and narrow down using type guards.

### Overuse of Non-null Assertion (!)

- **Rule**: [MUST NOT] Do not habitually use non-null assertion (`!`).
  - Note: Do not use patterns like `users.find(...)!` or `document.getElementById('app')!`.
- **Good Example**:
  ```typescript
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new Error(`User not found: ${id}`);
  }
  // At this point, user is narrowed to non-null type
  ```

### Overuse of @ts-ignore / @ts-expect-error

- **Rule**: [MUST NOT] Do not use `@ts-ignore`.
- **Rule**: [SHOULD] Use `@ts-expect-error` when unavoidable, and always leave a comment explaining the reason.
- **Good Example**:
  ```typescript
  // @ts-expect-error: Library type definitions have not been updated yet (issue: #123)
  someLibraryFunction(arg);
  ```