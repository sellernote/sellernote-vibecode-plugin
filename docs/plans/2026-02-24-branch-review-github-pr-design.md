# branch-review & github-pr 스킬 디자인

## 개요

sellernote-vibecode 플러그인에 2개의 새 command를 추가한다.

1. **branch-review**: 현재 작업 브랜치를 시니어 개발자 관점에서 종합 리뷰
2. **github-pr**: base 브랜치와의 차이를 분석하여 GitHub PR을 자동 생성

## 설계 원칙

- **Approach A (오케스트레이션 패턴)** 채택: `nextjs-dev-orchestration`과 동일한 패턴
- `branch-review`는 내부에서 `convention-code-review`를 참조/호출하고, 추가로 시니어 리뷰 수행
- `github-pr`는 독립 실행 (branch-review와 연동하지 않음)
- 출력 언어: 한국어

---

## 1. branch-review 스킬

### 기본 정보

| 항목 | 값 |
|------|-----|
| 이름 | `branch-review` |
| 호출 | `/sellernote-vibecode:branch-review` 또는 `/sellernote-vibecode:branch-review {base-branch}` |
| 트리거 | "브랜치 리뷰", "코드 리뷰해줘", "branch review", "review my branch", "시니어 리뷰" |
| 성격 | READ-ONLY (파일 수정 안 함) |

### 워크플로우

#### Step 1: 스코프 결정

- base 브랜치 자동 감지: `main` → `develop` → `master` 순서로 존재 여부 확인
- 인자가 있으면 해당 브랜치를 base로 사용
- `git diff {base}...HEAD` 실행
- 변경된 파일 목록 추출

#### Step 2: 컨벤션 리뷰 (convention-code-review 참조)

- `convention-code-review` 스킬의 워크플로우를 참조하여 실행
- 변경 파일 도메인 분류 → 해당 컨벤션 문서 로딩 → 위반 체크
- MUST/SHOULD/RECOMMEND 분류

#### Step 3: 시니어 개발자 리뷰

각 변경 파일에 대해 다음 관점으로 추가 리뷰:

| 카테고리 | 체크 포인트 |
|----------|------------|
| 아키텍처 | 레이어 분리, 의존성 방향, 모듈 경계, 관심사 분리, 순환 의존성 |
| 성능 | N+1 쿼리, 불필요한 리렌더링, 메모리 누수 패턴, 비효율적 루프, 인덱스 미활용 |
| 보안 | 인젝션 벡터, 인증/인가 누락, 민감정보 노출, XSS, CSRF |
| 유지보수성 | 순환 복잡도, 중복 코드, 매직 넘버, 하드코딩, 결합도 |
| 가독성 | 함수 길이, 네이밍 명확성, 주석 필요성, 로직 흐름, 일관성 |

#### Step 4: 통합 리포트 출력

```markdown
## 🔍 브랜치 리뷰 리포트

### 요약
- 리뷰 대상: {current-branch} → {base-branch}
- 변경 파일: N개 | 추가: +N줄 | 삭제: -N줄
- 발견된 이슈: N개 (🔴 CRITICAL: N | 🟡 WARNING: N | 🔵 INFO: N)

---

### 1. 컨벤션 리뷰
(convention-code-review 결과)

### 2. 아키텍처 리뷰
### 3. 성능 리뷰
### 4. 보안 리뷰
### 5. 유지보수성 & 가독성 리뷰

---

### 종합 평가
총평과 우선순위별 개선 제안
```

심각도 분류:
- 🔴 **CRITICAL**: 반드시 수정 필요 (아키텍처 위반, 보안 취약점, 데이터 손실 위험)
- 🟡 **WARNING**: 강력 권고 (성능 이슈, 유지보수성 저하)
- 🔵 **INFO**: 개선 제안 (가독성, 코드 스타일)

---

## 2. github-pr 스킬

### 기본 정보

| 항목 | 값 |
|------|-----|
| 이름 | `github-pr` |
| 호출 | `/sellernote-vibecode:github-pr` 또는 `/sellernote-vibecode:github-pr {base-branch}` |
| 트리거 | "PR 만들어줘", "PR 등록", "create PR", "풀리퀘스트 생성", "github PR" |
| 성격 | WRITE (git push + gh pr create 실행) |

### 워크플로우

#### Step 1: 스코프 결정

- base 브랜치 자동 감지 (branch-review와 동일한 로직)
- 현재 브랜치가 원격에 push 되었는지 확인
- `git diff {base}...HEAD` 실행
- `git log {base}..HEAD --oneline` 으로 커밋 목록 추출

#### Step 2: Jira 티켓 추출

- 브랜치명에서 패턴 매칭: `feature/ACV2-123-xxx` → `ACV2-123`
- 커밋 메시지에서 패턴 매칭: `[ACV2-123] feat: ...` → `ACV2-123`
- 패턴: `[A-Z]+-\d+` (대문자 프로젝트 키 + 숫자)
- 발견된 티켓 번호 중복 제거 후 수집 (없으면 해당 섹션 생략)

#### Step 3: 변경점 분석

- 파일별 변경 분류 (신규 A/수정 M/삭제 D)
- 변경 영역 분류 (Backend/Frontend/Database/Config/Test/Docs)
- 핵심 변경사항 요약 (무엇을 왜 변경했는지, 커밋 메시지 기반)
- 테스트 코드 작성 여부 확인 (`*.spec.ts`, `*.test.ts`, `*.stories.tsx`)
- 컨벤션 준수 여부 간략 체크 (주요 항목만)

#### Step 4: PR 본문 생성

```markdown
## 📋 작업 요약
{변경의 목적과 배경을 1-3문장으로 설명}

## 🔗 관련 Jira 티켓
- [ACV2-123](https://sellernote.atlassian.net/browse/ACV2-123)

## 📝 변경 사항
### Backend
- `order.service.ts`: 주문 생성 시 재고 검증 로직 추가

### Frontend
- `OrderForm.tsx`: 창고 선택 드롭다운 컴포넌트 추가

### Database
- `migration_xxx.ts`: orders 테이블에 warehouse_id 컬럼 추가

## 🧪 테스트
- [x] 단위 테스트 작성됨 (order.service.spec.ts)
- [ ] E2E 테스트 미작성

## ✅ 컨벤션 준수
- [x] 3-layer 아키텍처 준수
- [x] DTO에 @sellernote/sellernote-nestjs-api-property 사용

## 👀 리뷰어 참고사항
{리뷰어가 특별히 주의해서 봐야 할 부분}

## 📊 변경 통계
- 변경 파일: N개 | +N줄 / -N줄
```

#### Step 5: PR 생성

- 원격 push 안 되어있으면 `git push -u origin {branch}` 실행
- `gh pr create --base {base} --title "{title}" --body "{body}"` 실행
- 생성된 PR URL 출력

---

## 3. 파일 구조

```
skills/
├── branch-review/
│   ├── SKILL.md
│   └── references/           # 19개 컨벤션 문서 전체 (convention-code-review와 동일)
│
├── github-pr/
│   └── SKILL.md              # references/ 불필요
```

## 4. 컨벤션 동기화

`scripts/sync-conventions.mjs`의 SKILL_MAP에 `branch-review` 추가:

```javascript
'branch-review': [
  // convention-code-review와 동일한 19개 컨벤션 목록
]
```

## 5. Cross-Skill 참조 업데이트

기존 스킬들의 Cross-Skill References 섹션에 새 스킬 추가:
- `convention-code-review`: branch-review 참조 추가
- `convention-refactor`: branch-review 참조 추가

## 6. README 업데이트

README.md의 스킬 목록에 branch-review, github-pr 추가.
