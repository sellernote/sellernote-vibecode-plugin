# Sellernote VibeCode Plugin

셀러노트 개발 컨벤션 기반의 Claude Code 플러그인입니다.
[sellernote-development-convention](https://github.com/sellernote/sellernote-development-convention) 문서를 참조하여 AI가 컨벤션에 맞는 코드를 생성하도록 안내합니다.

## Skills 목록

| Skill | 설명 | 트리거 예시 |
|-------|------|------------|
| `nestjs-api-dev` | NestJS 3-layer API 개발 (Controller/Service/Repository, DTO, Swagger) | "API 엔드포인트 추가해줘", "CRUD 만들어줘" |
| `typeorm-dev` | TypeORM Entity, Migration, Relations, Repository 패턴 | "Entity 만들어줘", "마이그레이션 생성해줘" |
| `nextjs-data-provider` | TanStack Query, Server Actions, Zustand 상태 관리 | "데이터 fetching 구현해줘", "쿼리 훅 만들어줘" |
| `nextjs-ui-dev` | MUI v6 컴포넌트, React Hook Form + Zod, Storybook, 테스트 | "컴포넌트 만들어줘", "폼 구현해줘" |
| `nextjs-dev-orchestration` | data-provider + ui-dev 스킬을 조합한 전체 기능 개발 오케스트레이션 | "새 페이지 만들어줘", "기능 개발해줘" |

## 설치

```bash
claude plugins add /path/to/sellernote-vibecode-plugin
```

또는 GitHub에서 직접:

```bash
claude plugins add sellernote/sellernote-vibecode-plugin
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
```

### 프론트엔드 개발

```
# 데이터 레이어 (nextjs-data-provider 자동 트리거)
"주문 목록 조회 쿼리 훅 만들어줘"
"주문 생성 Server Action 구현해줘"

# UI 개발 (nextjs-ui-dev 자동 트리거)
"주문 목록 테이블 컴포넌트 만들어줘"
"주문 생성 폼 구현해줘"

# 전체 기능 개발 (nextjs-dev-orchestration 자동 트리거)
"주문 관리 페이지를 만들어줘"
"새 기능 개발해줘"
```

## 포함된 컨벤션 문서

각 skill의 `references/` 디렉토리에 관련 컨벤션 문서가 번들되어 있습니다.

```
nestjs-api-dev/references/
  ├── COMMON_CONVENTION.md          # 공통 규칙 (네이밍, Git, 에러 처리)
  ├── TYPESCRIPT_CONVENTION.md      # TypeScript 코딩 규칙
  ├── BACKEND_CONVENTION.md         # 백엔드 3-layer 아키텍처
  ├── BACKEND_ARCHITECTURE_CONVENTION.md  # 레이어 책임, 의존성 방향
  ├── API_SPEC_CONVENTION.md        # RESTful API 설계, 응답 포맷, 페이지네이션
  ├── SECURITY_CONVENTION.md        # JWT, RBAC, 입력 검증, XSS/SQL Injection
  └── NESTJS_CONVENTION.md          # NestJS 모듈, DI, @sellernote-api-property

typeorm-dev/references/
  ├── DATABASE_CONVENTION.md        # DB 모델링, 공통 필드, 인덱싱
  ├── MYSQL_CONVENTION.md           # MySQL 타입, UTC 타임존, 쿼리 최적화
  ├── REDIS_CONVENTION.md           # Redis 키 네이밍, TTL, 캐시 전략
  └── TYPEORM_CONVENTION.md         # Entity, Relations, Migration, 트랜잭션

nextjs-data-provider/references/
  ├── FRONTEND_CONVENTION.md        # 프론트엔드 공통 규칙
  ├── NEXTJS_CONVENTION.md          # App Router, Server/Client Components
  └── STATE_CONVENTION.md           # Zustand, TanStack Query, 상태 분류

nextjs-ui-dev/references/
  ├── FRONTEND_ARCHITECTURE_CONVENTION.md  # 컴포넌트 분류, 의존 방향
  ├── STYLING_CONVENTION.md         # MUI v6, 디자인 토큰, 반응형
  ├── FORM_CONVENTION.md            # React Hook Form + Zod
  └── TESTING_CONVENTION.md         # Storybook, Jest, RTL, Playwright

nextjs-dev-orchestration/references/
  ├── FRONTEND_ARCHITECTURE_CONVENTION.md  # 컴포넌트 트리 설계
  └── NEXTJS_CONVENTION.md          # 라우팅, 레이아웃, 미들웨어
```

## 컨벤션 업데이트

컨벤션 문서는 플러그인에 포함되어 있어 플러그인 업데이트 시 함께 갱신됩니다.

컨벤션 원본 저장소(`sellernote-development-convention`)가 업데이트된 경우, 다음 명령으로 최신 문서를 동기화할 수 있습니다:

```bash
# sellernote-vibecode-plugin 루트에서 실행
# gh CLI 인증 필요 (private repo)
bash scripts/sync-conventions.sh
```

동기화 후 변경사항을 커밋하면 다른 사용자도 플러그인 업데이트를 통해 최신 컨벤션을 받을 수 있습니다.

## 컨벤션 계층 구조

이 플러그인의 skill들은 셀러노트의 3단계 컨벤션 계층을 따릅니다:

```
Tier 1 (공통)     → COMMON_CONVENTION, TYPESCRIPT_CONVENTION
Tier 2 (도메인)   → BACKEND_CONVENTION, FRONTEND_CONVENTION, DATABASE_CONVENTION
Tier 3 (도구별)   → NESTJS_CONVENTION, TYPEORM_CONVENTION, NEXTJS_CONVENTION 등
```

하위 Tier 규칙이 상위와 충돌할 경우 하위가 우선합니다.

## 핵심 컨벤션 요약

### 백엔드 (NestJS + TypeORM)

- **3-layer 아키텍처**: Controller(HTTP) → Service(비즈니스) → Repository(데이터) 단방향
- **DTO**: `@sellernote/sellernote-nestjs-api-property` 라이브러리 필수
- **금액 처리**: DTO에서 `string` 타입 + `@SellernoteApiDecimal`, Service에서 `big.js` 연산
- **Entity**: 커스텀 `BaseEntity` 상속 (id/UUID, _no/BIGINT, createdAt, updatedAt, deletedAt)
- **트랜잭션**: `typeorm-transactional`의 `@Transactional()` (QueryRunner 사용 금지)
- **응답 포맷**: `{ success, data, error }`

### 프론트엔드 (Next.js + MUI)

- **App Router**: Server Components 기본, `'use client'`는 트리 리프에서만
- **컴포넌트 4유형**: UI(props-only) → Feature(비즈니스) → Layout(구조) → Page(조합)
- **데이터**: Server Components(초기 로드), TanStack Query(클라이언트), Server Actions(뮤테이션)
- **상태**: Zustand(클라이언트), TanStack Query(서버) — 서버 상태 Zustand 복제 금지
- **스타일링**: MUI v6, Theme overrides > styled() > sx (hex 하드코딩 금지)
- **폼**: React Hook Form + Zod 필수 조합
- **테스트**: Storybook CSF3 + Jest/RTL + Playwright

## 기여

### 새 Skill 추가

`skill-creator` skill을 사용하여 새 skill을 생성할 수 있습니다:

```
"새 skill을 만들어줘"
```

### 컨벤션 문서 수정

1. [sellernote-development-convention](https://github.com/sellernote/sellernote-development-convention) 저장소에서 컨벤션 수정
2. 이 플러그인에서 `bash scripts/sync-conventions.sh` 실행
3. 변경사항 커밋 & 푸시
