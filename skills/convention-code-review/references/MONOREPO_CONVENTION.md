# Monorepo Convention

> Defines rules applied to monorepo configuration and management.
> Parent rule: INFRASTRUCTURE_CONVENTION.md

## Workspace Structure

### Directory Layout

- [MUST] Follow the standard directory structure below.

```
monorepo-root/
├── apps/                      # 배포 가능한 애플리케이션
│   ├── web/                   # 웹 프론트엔드 (예: Next.js)
│   ├── mobile/                # 모바일 앱 (예: React Native)
│   └── api/                   # 백엔드 API 서버 (예: NestJS)
├── packages/                  # 공유 라이브러리/패키지
│   ├── ui/                    # 공유 UI 컴포넌트
│   ├── utils/                 # 공유 유틸리티 함수
│   ├── types/                 # 공유 타입 정의
│   └── config/                # 공유 설정 (ESLint, TypeScript 등)
├── tooling/                   # 빌드/개발 도구 설정
│   ├── eslint/
│   ├── typescript/
│   └── prettier/
├── package.json               # 루트 package.json
├── turbo.json                 # Turborepo 설정 (또는 nx.json)
└── pnpm-workspace.yaml        # 워크스페이스 설정 (pnpm 사용 시)
```

### Workspace Classification Criteria

- [MUST] Place only independently deployable applications in `apps/`, and only shared libraries in `packages/`.

### Package Naming

- [MUST] Use an organization scope for internal packages. (e.g., `@sellernote/ui`, `@sellernote/utils`)
- **Good example**:
  ```json
  {
    "name": "@sellernote/ui",
    "version": "0.0.0",
    "private": true
  }
  ```

## Dependency Management

### Internal Package References

- [MUST] Use the workspace protocol to reference internal packages.
- **Good example**:
  ```json
  {
    "dependencies": {
      "@sellernote/ui": "workspace:*",
      "@sellernote/utils": "workspace:*"
    }
  }
  ```

### Dependency Placement Principles

- [MUST] Declare dependencies in the `package.json` of the workspace that actually uses them. Do not declare them at the root.
- [SHOULD] Centrally manage configuration packages for development tools (ESLint, Prettier, TypeScript, etc.) in `tooling/` or `packages/config/`.

### External Dependency Version Unification

- [SHOULD] Use the same version of identical external packages across all workspaces.

## Build and Task Management

### Task Pipeline Configuration

- [MUST] Explicitly define task dependency relationships in the build tool (Turborepo/Nx).
- **Good example** (Turborepo):
  ```json
  {
    "tasks": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": ["dist/**", ".next/**"]
      },
      "dev": {
        "cache": false,
        "persistent": true
      },
      "lint": {},
      "test": {
        "dependsOn": ["build"]
      }
    }
  }
  ```

### Cache Strategy

- [SHOULD] Actively utilize build caching to optimize CI/CD speed.

## Shared Configuration Management

### TypeScript Configuration

- [SHOULD] Place a base `tsconfig.json` at the root and extend it in each workspace.
- **Good example**:
  ```json
  // packages/typescript/base.json
  {
    "compilerOptions": {
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true
    }
  }
  ```
  ```json
  // apps/web/tsconfig.json
  {
    "extends": "@sellernote/typescript/nextjs.json",
    "compilerOptions": {
      "baseUrl": ".",
      "paths": { "@/*": ["./src/*"] }
    }
  }
  ```

### ESLint / Prettier Configuration

- [SHOULD] Manage lint/format configurations as shared packages and extend them in each workspace.

## Version Control and Deployment

### CI/CD Pipeline

- [SHOULD] Only build/test/deploy workspaces that have changed.

## Tool-Specific Patterns

### Procedure for Adding a New Workspace

1. Create a directory under `apps/` or `packages/`.
2. Define the scoped name and required scripts in `package.json`.
3. Add the path to the workspace configuration file (e.g., `pnpm-workspace.yaml`).
4. Add required internal packages as dependencies using `workspace:*`.
5. Verify that the build tool's pipeline configuration applies to the new workspace.

### Shared Package Design Principles

- [SHOULD] Shared packages follow the single responsibility principle. Do not mix code from multiple domains in a single package.

## Anti-Patterns

- [MUST NOT] Create circular dependencies between workspaces. Extract common logic into a separate package to maintain unidirectional dependency flow.
- [MUST NOT] Install packages used only in a specific workspace in the root `package.json`.
- [MUST NOT] Use undeclared packages by relying on hoisting.