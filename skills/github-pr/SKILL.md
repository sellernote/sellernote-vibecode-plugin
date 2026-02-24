---
name: github-pr
description: 현재 작업 브랜치와 base 브랜치의 차이를 분석하여 GitHub PR을 자동 생성합니다. 작업 요약, 변경점, 테스트 여부, 컨벤션 준수 상태, 리뷰어 참고사항, Jira 티켓 번호를 포함한 PR 본문을 생성합니다. Use when creating a pull request, submitting code for review, or preparing a PR. Triggers on "PR 만들어줘", "PR 등록해줘", "풀리퀘스트 생성", "create PR", "github PR", "PR 올려줘", "submit PR", "open pull request", or any task requiring creation of a GitHub pull request from the current branch.
---

# GitHub PR

현재 작업 브랜치와 base 브랜치의 차이를 분석하여 구조화된 GitHub PR을 자동 생성합니다. 리뷰어가 빠르게 내용을 파악하고 리뷰를 시작할 수 있도록 PR 본문을 작성합니다.

## Workflow

### Step 1: 스코프 결정

1. 인자로 base 브랜치가 지정되었는지 확인:
   - 지정됨: 해당 브랜치를 base로 사용
   - 미지정: 자동 감지 (`main` → `develop` → `master` 순서로 로컬/리모트 존재 여부 확인)

2. 현재 브랜치명 확인: `git branch --show-current`

3. 현재 브랜치가 원격에 push 되었는지 확인: `git rev-parse --abbrev-ref @{upstream}` (실패하면 미push)

4. diff 추출: `git diff {base}...HEAD`

5. 변경 통계 추출: `git diff {base}...HEAD --stat`

6. 변경된 파일 목록 추출: `git diff {base}...HEAD --name-status`

7. 커밋 목록 추출: `git log {base}..HEAD --oneline`

### Step 2: Jira 티켓 추출

1. 브랜치명에서 패턴 매칭:
   - 패턴: `[A-Z][A-Z0-9]+-\d+` (예: `ACV2-123`, `SHIP-456`)
   - 예시: `feature/ACV2-123-order-api` → `ACV2-123`

2. 커밋 메시지에서 패턴 매칭:
   - 패턴: `[A-Z][A-Z0-9]+-\d+`
   - 예시: `[ACV2-123] feat: add order API` → `ACV2-123`

3. 발견된 티켓 번호 중복 제거 후 수집
   - 없으면 해당 섹션 생략

### Step 3: 변경점 분석

1. **파일 분류**: 각 변경 파일을 영역별로 그룹화

   | 파일 패턴 | 영역 |
   |-----------|------|
   | `src/modules/`, `*.service.ts`, `*.controller.ts`, `*.repository.ts`, `*.dto.ts`, `*.entity.ts`, `*.guard.ts`, `*.module.ts` | Backend |
   | `app/`, `components/`, `hooks/`, `queries/`, `store/`, `actions/`, `*.tsx` | Frontend |
   | `*.migration.ts`, `*.prisma`, `prisma/migrations/` | Database |
   | `*.config.*`, `*.env*`, `package.json`, `tsconfig.*` | Config |
   | `*.spec.ts`, `*.test.ts`, `*.test.tsx`, `*.stories.tsx` | Test |
   | `*.md`, `docs/` | Docs |

2. **핵심 변경사항 요약**: 커밋 메시지와 diff를 기반으로 무엇을 왜 변경했는지 1-3문장으로 요약

3. **테스트 코드 확인**:
   - 변경된 파일 중 `*.spec.ts`, `*.test.ts`, `*.test.tsx`, `*.stories.tsx` 파일 존재 여부 체크
   - 새로 추가된 소스 코드에 대한 테스트가 있는지 판단

4. **컨벤션 준수 간략 체크**:
   - 3-layer 아키텍처 준수 여부
   - DTO에 `@sellernote/sellernote-nestjs-api-property` 사용 여부
   - `'use client'` 적절한 위치 여부
   - `@/` 절대 경로 import 사용 여부
   - TypeScript strict mode 준수 여부

5. **리뷰어 참고사항 식별**:
   - 복잡한 비즈니스 로직 변경
   - 동시성/트랜잭션 처리
   - 새로운 의존성 추가
   - 마이그레이션 포함 시 주의사항
   - 성능에 영향을 줄 수 있는 변경

### Step 4: PR 본문 생성

#### 4-1. PR 템플릿 탐지

프로젝트 루트에서 PR 템플릿 파일을 탐색합니다 (우선순위 순):

1. `.github/pull_request_template.md`
2. `.github/PULL_REQUEST_TEMPLATE.md`
3. `pull_request_template.md`
4. `PULL_REQUEST_TEMPLATE.md`
5. `.github/PULL_REQUEST_TEMPLATE/` 디렉토리 내 `*.md` 파일 (첫 번째 파일)

#### 4-2. PR 본문 작성

**PR 제목 규칙:**
- 커밋 컨벤션을 따른 간결한 제목 (70자 이내)
- 형식: `{type}: {간결한 설명}` (예: `feat: 주문 API 재고 검증 로직 추가`)
- type: feat, fix, refactor, chore, docs, test, style, perf

**프로젝트 PR 템플릿이 존재할 때:**

1. 템플릿 파일을 읽어 구조(섹션 헤딩, 체크리스트, 플레이스홀더 텍스트) 파악
2. Step 1~3에서 수집한 데이터(diff, Jira 티켓, 변경점 분석, 테스트 여부 등)를 템플릿의 각 섹션에 맞춰 채워넣기
3. 템플릿에 체크리스트(`- [ ]`)가 있으면 실제 분석 결과 기반으로 체크(`- [x]`) / 언체크(`- [ ]`) 처리
4. 템플릿에 없는 중요 정보(예: Jira 티켓, 변경 통계)는 적절한 위치에 추가
5. 템플릿의 플레이스홀더나 안내 문구(예: `<!-- 여기에 작성 -->`)는 실제 내용으로 대체
6. 템플릿의 섹션 중 해당사항이 없는 항목은 "해당 없음" 또는 섹션 제거

**프로젝트 PR 템플릿이 없을 때 (기본 템플릿):**

```
## 📋 작업 요약
{변경의 목적과 배경을 1-3문장으로 설명}

## 🔗 관련 Jira 티켓
- [{TICKET-ID}](https://sellernote.atlassian.net/browse/{TICKET-ID})
(티켓이 없으면 이 섹션 제거)

## 📝 변경 사항
### Backend
- `{파일명}`: {변경 내용 한 줄 설명}

### Frontend
- `{파일명}`: {변경 내용 한 줄 설명}

### Database
- `{파일명}`: {변경 내용 한 줄 설명}

(변경이 없는 영역 섹션은 제거)

## 🧪 테스트
- [x] 단위 테스트 작성됨 ({파일명})
- [ ] E2E 테스트 미작성
(실제 테스트 파일 존재 여부 기반으로 체크)

## ✅ 컨벤션 준수
- [x] 3-layer 아키텍처 준수
- [x] DTO에 @sellernote/sellernote-nestjs-api-property 사용
- [x] TypeScript strict mode 준수
(해당하는 항목만 포함)

## 👀 리뷰어 참고사항
{리뷰어가 특별히 주의해서 봐야 할 부분을 구체적으로 기술}
(특별히 없으면 이 섹션 제거)

## 📊 변경 통계
- 변경 파일: N개 | +N줄 / -N줄
```

### Step 5: PR 생성

1. **원격 push 확인 및 실행**:
   - 원격에 push 안 되어있으면: `git push -u origin {branch}` 실행 전 사용자에게 확인
   - 이미 push 되어있으면: 최신 커밋이 push 되었는지 확인, 안 되어있으면 push 여부 확인

2. **PR 생성**:
   - `gh pr create --base {base} --title "{title}" --body "{body}"` 실행
   - HEREDOC 사용하여 body 전달

3. **결과 출력**:
   - 생성된 PR URL 출력
   - PR 번호 출력

## Key Rules Summary

| Rule | Detail |
|------|--------|
| MUST | base 브랜치 자동 감지: main → develop → master 순서 |
| MUST | Jira 티켓은 브랜치명 + 커밋 메시지에서 자동 추출 |
| MUST | PR 본문은 한국어로 작성 |
| MUST | push 전 사용자 확인 |
| MUST | 변경이 없는 영역의 섹션은 제거 |
| MUST | 테스트 파일 존재 여부를 실제 파일 기반으로 체크 |
| MUST | 프로젝트 PR 템플릿이 있으면 해당 템플릿 구조를 우선 사용 |
| MUST | 템플릿의 체크리스트는 실제 분석 결과 기반으로 체크/언체크 |

## Cross-Skill References

- **컨벤션 전용 리뷰**: `convention-code-review` 스킬 사용 (컨벤션 위반만 체크할 때)
- **컨벤션 위반 수정**: `convention-refactor` 스킬 사용
