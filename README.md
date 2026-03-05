# Sellernote VibeCode Plugin

셀러노트 개발 컨벤션 기반의 Claude Code 플러그인입니다.
[sellernote-development-convention](https://github.com/sellernote/sellernote-development-convention) 문서를 참조하여 AI가 컨벤션에 맞는 코드를 생성하도록 안내합니다.

## Skills 목록

| Skill                      | 설명                                                                                | 트리거 예시                                                 |
| -------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `nestjs-api-dev`           | NestJS 3-layer API 개발 (Controller/Service/Repository, DTO, Swagger)               | "API 엔드포인트 추가해줘", "CRUD 만들어줘"                  |
| `typeorm-dev`              | TypeORM Entity, Migration, Relations, Repository 패턴                               | "Entity 만들어줘", "마이그레이션 생성해줘"                  |
| `prisma-dev`               | Prisma Schema, Migration, Client 패턴, NestJS 통합                                  | "Prisma 모델 만들어줘", "스키마 수정해줘"                   |
| `nextjs-data-provider`     | TanStack Query, Server Actions, Zustand 상태 관리                                   | "데이터 fetching 구현해줘", "쿼리 훅 만들어줘"              |
| `nextjs-ui-dev`            | MUI v6 컴포넌트, React Hook Form + Zod, Storybook, 테스트                           | "컴포넌트 만들어줘", "폼 구현해줘"                          |
| `nextjs-dev-orchestration` | data-provider + ui-dev 스킬을 조합한 전체 기능 개발 오케스트레이션                  | "새 페이지 만들어줘", "기능 개발해줘"                       |
| `convention-code-review`   | git diff 기반 컨벤션 위반 자동 체크 (read-only)                                     | "코드 리뷰해줘", "컨벤션 체크해줘"                          |
| `convention-refactor`      | 기존 코드를 컨벤션에 맞게 리팩토링                                                  | "컨벤션에 맞게 리팩토링해줘", "패턴 적용해줘"               |
| `react-dev`                | React 19 컴포넌트, 훅, 성능 최적화 개발 (순수 React 패턴)                           | "React 컴포넌트 만들어줘", "훅 만들어줘", "성능 최적화해줘" |
| `react-data-provider`      | React SPA 데이터 페칭 및 상태 관리 (TanStack Query, Zustand, API 클라이언트)        | "쿼리 훅 만들어줘", "스토어 만들어줘", "API 연동해줘"       |
| `react-ui-dev`             | React SPA UI 개발 (DS + Tailwind CSS v4, React Hook Form + Zod, Storybook + Vitest) | "컴포넌트 만들어줘", "스타일링 해줘", "Storybook 추가해줘"  |
| `react-dev-orchestration`  | React SPA 전체 기능 개발 오케스트레이션 (data-provider + ui-dev 조합)               | "새 페이지 만들어줘", "기능 개발해줘"                       |
| `nestjs-testing`           | NestJS 백엔드 테스트 작성 (unit/integration/e2e)                                    | "테스트 작성해줘", "서비스 테스트 만들어줘"                 |
| `project-scaffold`         | 새 모듈/페이지 컨벤션 준수 구조 자동 생성                                           | "새 모듈 만들어줘", "scaffold해줘"                          |
| `github-pr`                | base 브랜치 대비 diff 분석 후 GitHub PR 자동 생성 (Jira 티켓 자동 연동)             | "PR 만들어줘", "PR 등록해줘"                                |

## 설치

### 사전 요구사항

- **Node.js** (v18+)
- **Git**

### 방법 A: Cursor / 범용 에이전트 (`npx skills`)

[skills](https://www.npmjs.com/package/skills) CLI를 사용하면 Cursor, Claude Code, Codex, OpenCode 등 40개 이상의 에이전트에 스킬을 설치할 수 있습니다.

#### 전체 스킬 설치

```bash
npx skills add sellernote/sellernote-vibecode-plugin
```

#### 특정 스킬만 선택 설치

```bash
npx skills add sellernote/sellernote-vibecode-plugin --skill nestjs-api-dev --skill react-dev
```

#### 설치 가능한 스킬 목록 확인

```bash
npx skills add sellernote/sellernote-vibecode-plugin --list
```

#### 글로벌 설치 (모든 프로젝트에서 사용)

```bash
npx skills add sellernote/sellernote-vibecode-plugin -g
```

#### 특정 에이전트만 지정

```bash
npx skills add sellernote/sellernote-vibecode-plugin -a cursor
npx skills add sellernote/sellernote-vibecode-plugin -a claude-code
```

> **스킬 설치 경로**:
>
> - **프로젝트 레벨** (기본): `.agents/skills/` (Cursor), `.claude/skills/` (Claude Code)
> - **글로벌** (`-g`): `~/.cursor/skills/` (Cursor), `~/.claude/skills/` (Claude Code)

#### 스킬 업데이트

```bash
npx skills update
```

#### 설치된 스킬 확인

```bash
npx skills list
```

#### 스킬 삭제

```bash
npx skills remove
```

### 방법 B: Claude Code 플러그인

Claude Code 전용 플러그인 시스템을 사용하는 방법입니다.

#### 1. 마켓플레이스 추가 (최초 1회)

Claude Code에서 다음 명령어를 실행합니다:

```
/plugin marketplace add sellernote/sellernote-vibecode-plugin
```

#### 2. 플러그인 설치

```
/plugin install sellernote-vibecode@sellernote-vibecode-plugin
```

#### 3. 플러그인 업데이트

```
/plugin update sellernote-vibecode@sellernote-vibecode-plugin
```

### 로컬 개발/테스트

```bash
# macOS / Linux
claude --plugin-dir /path/to/sellernote-vibecode-plugin

# Windows (PowerShell)
claude --plugin-dir C:\path\to\sellernote-vibecode-plugin
```

## 사용법

플러그인 설치 후 Claude Code에서 자연어로 요청하면 관련 skill이 자동으로 트리거됩니다.

### 백엔드 개발

```
# NestJS API 개발 (nestjs-api-dev 자동 트리거)
"주문 API 엔드포인트를 추가해줘"
"상품 CRUD를 만들어줘"

# TypeORM Entity/Migration (typeorm-dev 자동 트리거)
"주문 Entity를 만들어줘"
"배송 테이블에 컬럼 추가하는 마이그레이션 생성해줘"

# Prisma 개발 (prisma-dev 자동 트리거)
"Prisma 모델 추가해줘"
"Prisma 마이그레이션 생성해줘"
"PrismaService 설정해줘"
```

### 프론트엔드 개발

```
# 데이터 레이어 (nextjs-data-provider 자동 트리거)
"주문 목록 조회 쿼리 훅 만들어줘"
"주문 생성 Server Action 구현해줘"

# UI 개발 (nextjs-ui-dev 자동 트리거)
"주문 목록 테이블 컴포넌트 만들어줘"
"주문 생성 폼 구현해줘"

# React 컴포넌트/훅 개발 (react-dev 자동 트리거)
"Compound Component 패턴으로 Select 만들어줘"
"커스텀 훅 설계해줘"
"Error Boundary 추가해줘"

# React SPA 데이터 레이어 (react-data-provider 자동 트리거)
"쿼리 훅 만들어줘"
"Zustand 스토어 만들어줘"
"API 연동해줘"

# React SPA UI 개발 (react-ui-dev 자동 트리거)
"DS 컴포넌트로 테이블 만들어줘"
"Tailwind으로 스타일링 해줘"
"Storybook 스토리 추가해줘"

# React SPA 전체 기능 개발 (react-dev-orchestration 자동 트리거)
"React 페이지 만들어줘"
"React 기능 개발해줘"

# Next.js 전체 기능 개발 (nextjs-dev-orchestration 자동 트리거)
"주문 관리 페이지를 만들어줘"
"새 기능 개발해줘"
```

### 코드 리뷰 & 리팩토링

```
# 컨벤션 기반 코드 리뷰 (convention-code-review 자동 트리거)
"코드 리뷰해줘"
"컨벤션 체크해줘"
"PR 리뷰해줘"

# 컨벤션 맞춤 리팩토링 (convention-refactor 자동 트리거)
"컨벤션에 맞게 리팩토링해줘"
"패턴 적용해줘"

# GitHub PR 생성 (github-pr 자동 트리거)
"PR 만들어줘"
"PR 등록해줘"
```

### 테스트 & 스캐폴딩

```
# NestJS 테스트 작성 (nestjs-testing 자동 트리거)
"서비스 테스트 작성해줘"
"e2e 테스트 만들어줘"

# 새 모듈/페이지 스캐폴딩 (project-scaffold 자동 트리거)
"새 모듈 만들어줘"
"scaffold해줘"
```

### Skill 직접 호출

자동 트리거 외에 명시적으로 skill을 호출할 수도 있습니다:

```
/sellernote-vibecode:nestjs-api-dev
/sellernote-vibecode:typeorm-dev
/sellernote-vibecode:prisma-dev
/sellernote-vibecode:nextjs-data-provider
/sellernote-vibecode:nextjs-ui-dev
/sellernote-vibecode:react-dev
/sellernote-vibecode:react-data-provider
/sellernote-vibecode:react-ui-dev
/sellernote-vibecode:react-dev-orchestration
/sellernote-vibecode:nextjs-dev-orchestration
/sellernote-vibecode:convention-code-review
/sellernote-vibecode:convention-refactor
/sellernote-vibecode:nestjs-testing
/sellernote-vibecode:project-scaffold
/sellernote-vibecode:github-pr
```

## 포함된 컨벤션 문서

각 skill의 `references/` 디렉토리에 관련 컨벤션 문서가 번들되어 있습니다.

```
skills/nestjs-api-dev/references/
  ├── COMMON_CONVENTION.md          # 공통 규칙 (네이밍, Git, 에러 처리)
  ├── TYPESCRIPT_CONVENTION.md      # TypeScript 코딩 규칙
  ├── BACKEND_CONVENTION.md         # 백엔드 3-layer 아키텍처
  ├── BACKEND_ARCHITECTURE_CONVENTION.md  # 레이어 책임, 의존성 방향
  ├── API_SPEC_CONVENTION.md        # RESTful API 설계, 응답 포맷, 페이지네이션
  ├── SECURITY_CONVENTION.md        # JWT, RBAC, 입력 검증, XSS/SQL Injection
  └── NESTJS_CONVENTION.md          # NestJS 모듈, DI, @sellernote-api-property

skills/typeorm-dev/references/
  ├── DATABASE_CONVENTION.md        # DB 모델링, 공통 필드, 인덱싱
  ├── MYSQL_CONVENTION.md           # MySQL 타입, UTC 타임존, 쿼리 최적화
  ├── REDIS_CONVENTION.md           # Redis 키 네이밍, TTL, 캐시 전략
  └── TYPEORM_CONVENTION.md         # Entity, Relations, Migration, 트랜잭션

skills/prisma-dev/references/
  ├── DATABASE_CONVENTION.md        # DB 모델링, 공통 필드, 인덱싱
  ├── MYSQL_CONVENTION.md           # MySQL 타입, UTC 타임존, 쿼리 최적화
  ├── REDIS_CONVENTION.md           # Redis 키 네이밍, TTL, 캐시 전략
  └── PRISMA_CONVENTION.md          # Prisma Schema, Client, Migration, NestJS 통합

skills/nextjs-data-provider/references/
  ├── FRONTEND_CONVENTION.md        # 프론트엔드 공통 규칙
  ├── NEXTJS_CONVENTION.md          # App Router, Server/Client Components
  └── STATE_CONVENTION.md           # Zustand, TanStack Query, 상태 분류

skills/nextjs-ui-dev/references/
  ├── FRONTEND_ARCHITECTURE_CONVENTION.md  # 컴포넌트 분류, 의존 방향
  ├── STYLING_CONVENTION.md         # MUI v6, 디자인 토큰, 반응형
  ├── FORM_CONVENTION.md            # React Hook Form + Zod
  ├── TESTING_CONVENTION.md         # Storybook, Jest, RTL, Playwright
  └── REACT_CONVENTION.md           # React 19 패턴, Hooks, 성능 최적화

skills/react-dev/references/
  └── REACT_CONVENTION.md           # React 19 컴포넌트, Hooks, 성능, Error Boundary, Context

skills/react-data-provider/references/
  ├── COMMON_CONVENTION.md          # 공통 규칙 (네이밍, Git, 에러 처리)
  ├── TYPESCRIPT_CONVENTION.md      # TypeScript 코딩 규칙
  ├── FRONTEND_CONVENTION.md        # 프론트엔드 공통 규칙
  ├── STATE_CONVENTION.md           # Zustand, TanStack Query, 상태 분류
  ├── API_CLIENT_CONVENTION.md      # API 클라이언트 공통 규칙, 토큰 관리, 에러 처리
  ├── API_CLIENT_AXIOS_CONVENTION.md # Axios 인터셉터, 리프레시 토큰 플로우
  ├── REACT_CONVENTION.md           # React 19 패턴, Hooks, 성능 최적화
  └── REACT_ROUTER_CONVENTION.md    # React Router 7 Framework Mode, route modules

skills/react-ui-dev/references/
  ├── COMMON_CONVENTION.md          # 공통 규칙 (네이밍, Git, 에러 처리)
  ├── TYPESCRIPT_CONVENTION.md      # TypeScript 코딩 규칙
  ├── FRONTEND_CONVENTION.md        # 컴포넌트 설계, props, imports, 접근성
  ├── FRONTEND_ARCHITECTURE_CONVENTION.md  # 4 컴포넌트 분류, 의존성 방향
  ├── STYLING_CONVENTION.md         # @sellernote/design-system + Tailwind CSS v4
  ├── FORM_CONVENTION.md            # React Hook Form + Zod
  ├── TESTING_CONVENTION.md         # Storybook, Vitest, RTL, Playwright
  ├── REACT_CONVENTION.md           # React 19 패턴, Hooks, 성능 최적화
  └── REACT_ROUTER_CONVENTION.md    # React Router 7 Framework Mode, route modules

skills/react-dev-orchestration/references/
  ├── FRONTEND_CONVENTION.md        # 프론트엔드 공통 규칙
  ├── FRONTEND_ARCHITECTURE_CONVENTION.md  # 컴포넌트 트리 설계
  ├── REACT_CONVENTION.md           # React 19 패턴, Hooks
  └── REACT_ROUTER_CONVENTION.md    # React Router 라우팅, 중첩 라우트

skills/nextjs-dev-orchestration/references/
  ├── FRONTEND_ARCHITECTURE_CONVENTION.md  # 컴포넌트 트리 설계
  └── NEXTJS_CONVENTION.md          # 라우팅, 레이아웃, 미들웨어

skills/convention-code-review/references/
  ├── (전체 18개 컨벤션 문서)       # 변경 파일 타입에 따라 동적 로딩 (REACT_CONVENTION 포함)

skills/convention-refactor/references/
  ├── (전체 18개 컨벤션 문서)       # 리팩토링 대상에 따라 동적 로딩 (REACT_CONVENTION 포함)

skills/nestjs-testing/references/
  ├── COMMON_CONVENTION.md          # 공통 규칙
  ├── TYPESCRIPT_CONVENTION.md      # TypeScript 코딩 규칙
  ├── BACKEND_CONVENTION.md         # 백엔드 3-layer 아키텍처
  ├── BACKEND_ARCHITECTURE_CONVENTION.md  # 레이어 책임 (모킹 경계)
  └── NESTJS_CONVENTION.md          # NestJS 패턴, DI, 테스트 규칙

skills/project-scaffold/references/
  ├── (15개 컨벤션 문서)            # 스캐폴드 타입에 따라 동적 로딩

skills/github-pr/
  └── SKILL.md                      # 컨벤션 문서 불필요 (diff 분석 + PR 생성 전용)
```

## 컨벤션 업데이트

컨벤션 문서는 플러그인에 포함되어 있어 **플러그인 업데이트 시 함께 갱신**됩니다.

### 플러그인 관리자용: 컨벤션 동기화

컨벤션 원본 저장소(`sellernote-development-convention`)가 업데이트된 경우:

```bash
# sellernote-vibecode-plugin 루트에서 실행 (Windows/macOS/Linux 공통)
# gh CLI 인증 필요 (private repo)
node scripts/sync-conventions.mjs

# 변경사항 커밋 & 푸시
git add skills/*/references/*.md
git commit -m "chore: sync convention docs"
git push
```

동기화 후 커밋하면 다른 사용자도 플러그인 업데이트를 통해 최신 컨벤션을 받을 수 있습니다.

## 컨벤션 계층 구조

이 플러그인의 skill들은 셀러노트의 3단계 컨벤션 계층을 따릅니다:

```
Tier 1 (공통)     -> COMMON_CONVENTION, TYPESCRIPT_CONVENTION
Tier 2 (도메인)   -> BACKEND_CONVENTION, FRONTEND_CONVENTION, DATABASE_CONVENTION
Tier 3 (도구별)   -> NESTJS_CONVENTION, TYPEORM_CONVENTION, PRISMA_CONVENTION, NEXTJS_CONVENTION 등
```

하위 Tier 규칙이 상위와 충돌할 경우 하위가 우선합니다.

## 핵심 컨벤션 요약

### 백엔드 (NestJS + TypeORM)

- **3-layer 아키텍처**: Controller(HTTP) -> Service(비즈니스) -> Repository(데이터) 단방향
- **DTO**: `@sellernote/sellernote-nestjs-api-property` 라이브러리 필수
- **금액 처리**: DTO에서 `string` 타입 + `@SellernoteApiDecimal`, Service에서 `big.js` 연산
- **Entity**: 커스텀 `BaseEntity` 상속 (id/UUID, \_no/BIGINT, createdAt, updatedAt, deletedAt)
- **트랜잭션**: `typeorm-transactional`의 `@Transactional()` (QueryRunner 사용 금지)
- **응답 포맷**: `{ success, data, error }`

### 프론트엔드 (Next.js + MUI)

- **App Router**: Server Components 기본, `'use client'`는 트리 리프에서만
- **컴포넌트 4유형**: UI(props-only) -> Feature(비즈니스) -> Layout(구조) -> Page(조합)
- **데이터**: Server Components(초기 로드), TanStack Query(클라이언트), Server Actions(뮤테이션)
- **상태**: Zustand(클라이언트), TanStack Query(서버) -- 서버 상태 Zustand 복제 금지
- **스타일링**: MUI v6, Theme overrides > styled() > sx (hex 하드코딩 금지)
- **React 19**: Compound Components, ref prop 직접 전달(forwardRef 금지), React Compiler 활성화 시 수동 메모이제이션 금지
- **폼**: React Hook Form + Zod 필수 조합
- **테스트**: Storybook CSF3 + Jest/RTL + Playwright

## 플러그인 구조

```
sellernote-vibecode-plugin/
├── .claude-plugin/
│   ├── plugin.json              # 플러그인 메타데이터
│   └── marketplace.json         # 마켓플레이스 설정
├── skills/
│   ├── nestjs-api-dev/          # NestJS API 개발 skill
│   ├── typeorm-dev/             # TypeORM 개발 skill
│   ├── prisma-dev/             # Prisma ORM 개발 skill
│   ├── nextjs-data-provider/    # Next.js 데이터 레이어 skill
│   ├── nextjs-ui-dev/           # Next.js UI 개발 skill
│   ├── react-dev/               # React 19 컴포넌트/훅/성능 개발 skill
│   ├── react-data-provider/     # React SPA 데이터 페칭/상태 관리 skill
│   ├── react-ui-dev/            # React SPA UI 개발 skill
│   ├── react-dev-orchestration/ # React SPA 전체 기능 오케스트레이션 skill
│   ├── nextjs-dev-orchestration/ # Next.js 전체 기능 개발 오케스트레이션 skill
│   ├── convention-code-review/  # 컨벤션 기반 코드 리뷰 skill
│   ├── convention-refactor/     # 컨벤션 맞춤 리팩토링 skill
│   ├── nestjs-testing/          # NestJS 테스트 작성 skill
│   ├── project-scaffold/        # 모듈/페이지 스캐폴딩 skill
│   └── github-pr/               # GitHub PR 자동 생성 skill
├── scripts/
│   └── sync-conventions.mjs     # 컨벤션 문서 동기화 스크립트 (cross-platform)
└── README.md
```

## 기여

### 새 Skill 추가

이 플러그인 프로젝트 내에서 `skill-creator` skill을 사용하여 새 skill을 생성할 수 있습니다.

### 컨벤션 문서 수정

1. [sellernote-development-convention](https://github.com/sellernote/sellernote-development-convention) 저장소에서 컨벤션 수정
2. 이 플러그인에서 `node scripts/sync-conventions.mjs` 실행
3. 변경사항 커밋 & 푸시
