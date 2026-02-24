---
name: nestjs-testing
description: NestJS backend test writing following Sellernote conventions. Use when creating unit tests, integration tests, or e2e tests for NestJS services, controllers, repositories, or modules. Triggers on tasks involving test writing, spec files, jest mocking, service testing, controller testing, repository testing, e2e testing, or test coverage. Also use when asked to "테스트 작성해줘", "서비스 테스트", "e2e 테스트 만들어줘", "유닛 테스트 추가해줘", "테스트 코드 작성", "spec 파일 만들어줘", "write tests", "add unit tests", "create e2e tests", or any backend testing work in a NestJS project.
---

# NestJS Testing

Write NestJS tests following Sellernote's 3-layer architecture and convention documents.

## Convention Loading

Before starting any work, Read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/BACKEND_CONVENTION.md` - 3-layer architecture, layer responsibilities
   - `references/NESTJS_CONVENTION.md` - NestJS-specific patterns, DI, decorators, money handling

2. **Read when relevant**:
   - `references/BACKEND_ARCHITECTURE_CONVENTION.md` - Layer boundaries (what to mock at each layer)
   - `references/COMMON_CONVENTION.md` - Naming, error codes
   - `references/TYPESCRIPT_CONVENTION.md` - TS style, imports, types

## Workflow

Follow these steps sequentially. Skip a step only when it does not apply to the task.

### Step 1: Analyze Target Module

1. Identify the target module under `src/modules/`
2. Read the source files to understand:
   - Service methods and their dependencies (Repository, other Services)
   - Controller endpoints and their parameter types (DTOs)
   - Repository methods and their QueryBuilder usage
   - Entity structure and relations
3. Determine which test types are needed:
   - **Unit test**: Service, Repository, Controller in isolation
   - **Integration test**: Module with real DI container but mocked externals
   - **E2E test**: Full HTTP request/response cycle with `supertest`

### Step 2: Service Unit Test

Service tests are the most important -- they cover business logic.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import Big from 'big.js';

import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';

describe('OrderService', () => {
  let service: OrderService;
  let repository: jest.Mocked<OrderRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: OrderRepository,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
            findList: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(OrderService);
    repository = module.get(OrderRepository);
  });

  describe('calculateTotal', () => {
    it('should calculate total using big.js for money precision', async () => {
      // Arrange
      const items = [
        { price: '10.50', quantity: 3 },
        { price: '20.00', quantity: 2 },
      ];

      // Act
      const result = service.calculateTotal(items);

      // Assert
      const expected = new Big('10.50').times(3).plus(new Big('20.00').times(2)).toFixed(2);
      expect(result).toBe(expected);
    });
  });

  describe('findById', () => {
    it('should return order when found', async () => {
      // Arrange
      const mockOrder = { id: 'uuid-1', orderNumber: 'ORD-001' };
      repository.findById.mockResolvedValue(mockOrder as any);

      // Act
      const result = await service.findById('uuid-1');

      // Assert
      expect(result).toEqual(mockOrder);
      expect(repository.findById).toHaveBeenCalledWith('uuid-1');
    });

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('non-existent')).rejects.toThrow();
    });
  });
});
```

Key rules:
- [MUST] Use `jest.Mocked<T>` for type-safe mocking
- [MUST] Follow AAA pattern (Arrange-Act-Assert) with comments
- [MUST] Never connect to a real database in unit tests
- [MUST] Use `big.js` assertions for money fields (never floating-point comparison)
- [MUST] Mock all dependencies injected via constructor

### Step 3: Repository Unit Test

Repository tests verify query construction and data transformation.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { OrderRepository } from './order.repository';
import { OrderEntity } from './entities/order.entity';

describe('OrderRepository', () => {
  let repository: OrderRepository;
  let ormRepository: jest.Mocked<Repository<OrderEntity>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<OrderEntity>>;

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderRepository,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get(OrderRepository);
    ormRepository = module.get(getRepositoryToken(OrderEntity));
  });

  describe('findList', () => {
    it('should apply pagination and return count', async () => {
      // Arrange
      const mockOrders = [{ id: '1' }, { id: '2' }];
      queryBuilder.getManyAndCount.mockResolvedValue([mockOrders as any, 2]);

      // Act
      const [orders, count] = await repository.findList({ page: 1, limit: 10 });

      // Assert
      expect(orders).toHaveLength(2);
      expect(count).toBe(2);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });
  });
});
```

Key rules:
- [MUST] Mock `SelectQueryBuilder` chain methods with `mockReturnThis()`
- [MUST] Verify parameterized query usage (no string interpolation in queries)
- [MUST] Test pagination offset calculation

### Step 4: Controller Unit Test

Controller tests verify HTTP layer delegation and response transformation.

```typescript
import { Test, TestingModule } from '@nestjs/testing';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController', () => {
  let controller: OrderController;
  let service: jest.Mocked<OrderService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            findList: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(OrderController);
    service = module.get(OrderService);
  });

  describe('GET /orders/:id', () => {
    it('should delegate to service and return result', async () => {
      // Arrange
      const mockOrder = { id: 'uuid-1', orderNumber: 'ORD-001' };
      service.findById.mockResolvedValue(mockOrder as any);

      // Act
      const result = await controller.findById('uuid-1');

      // Assert
      expect(service.findById).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(mockOrder);
    });
  });
});
```

Key rules:
- [MUST] Verify controller delegates to Service (no business logic in controller)
- [MUST] Test parameter passing from HTTP layer to Service layer
- [MUST] Mock the entire Service (controller should only orchestrate)

### Step 5: E2E Test

E2E tests verify the full request/response cycle.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Order (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // [MUST] Apply same ValidationPipe as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    it('should reject invalid DTO with 400', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({ productName: '' }) // invalid: empty required field
        .expect(400);
    });

    it('should create order with valid data', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          productName: 'Test Product',
          quantity: 1,
          totalAmount: '100.00', // money as string
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('id');
        });
    });
  });

  describe('GET /orders/:id', () => {
    it('should return 404 for non-existent order', () => {
      return request(app.getHttpServer())
        .get('/orders/non-existent-uuid')
        .expect(404);
    });
  });
});
```

Key rules:
- [MUST] Apply same `ValidationPipe` config as production (`whitelist`, `forbidNonWhitelisted`, `transform`)
- [MUST] Test DTO validation (invalid inputs return 400)
- [MUST] Test response format matches `{ success, data, error }` pattern
- [MUST] Money fields in request bodies must be `string` type
- [MUST] Use `beforeAll`/`afterAll` for app lifecycle (not `beforeEach` -- too slow)

### Step 6: Test Quality Verification

After writing tests, verify:

- [ ] All Service business logic paths are covered (happy path + error cases)
- [ ] Money calculations use `big.js` in both production code and assertions
- [ ] No real database connections in unit tests
- [ ] `jest.Mocked<T>` used for all mocked dependencies
- [ ] AAA pattern (Arrange-Act-Assert) followed consistently
- [ ] E2E tests use production-identical `ValidationPipe` settings
- [ ] Test file naming: `{name}.spec.ts` for unit, `{name}.e2e-spec.ts` for e2e
- [ ] Each test has a clear, descriptive name explaining expected behavior

## File Structure Reference

```
src/modules/{feature}/
├── {feature}.service.spec.ts        # Service unit tests
├── {feature}.repository.spec.ts     # Repository unit tests
├── {feature}.controller.spec.ts     # Controller unit tests
└── ...

test/
├── {feature}.e2e-spec.ts            # E2E tests
├── jest-e2e.json                    # E2E jest config
└── ...
```

## Cross-Skill References

- **Production code implementation**: Use the `nestjs-api-dev` skill for Controller/Service/Repository code
- **Entity/TypeORM patterns**: Use the `typeorm-dev` skill for Entity definitions, Relations, and TypeORM-specific patterns
