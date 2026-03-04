---
name: react-dev
description: React 19 컴포넌트, 훅, 성능 최적화 개발 가이드. 순수 React 패턴에 초점을 맞추며, Sellernote React 컨벤션을 따릅니다. React 컴포넌트 개발, Custom Hook 설계, Context API, Error Boundary, 성능 최적화, React 19 기능(use, useActionState, useOptimistic) 작업 시 사용합니다. "React 컴포넌트 만들어줘", "훅 만들어줘", "성능 최적화해줘", "Error Boundary 추가해줘", "Context 설계해줘", "create a React component", "design a custom hook", "optimize React performance" 등의 요청에 활용됩니다. Next.js/MUI 관련 작업은 nextjs-ui-dev skill을 사용하세요.
---

# React Dev

React 19 컴포넌트, 훅, 성능 최적화 개발을 Sellernote React 컨벤션에 맞게 진행합니다.

## Convention Loading

작업 시작 전 반드시 다음 참조 파일을 읽습니다:

1. **항상 먼저 읽기** (핵심 규칙):
   - `references/REACT_CONVENTION.md` - React 컴포넌트 패턴, Hooks, React 19 기능, 성능 최적화, Error Boundary, Context API, TypeScript 연동, 안티패턴

2. **필요 시 읽기**:
   - `references/FRONTEND_CONVENTION.md` - 프론트엔드 공통 규칙, 기술 스택
   - `references/TYPESCRIPT_CONVENTION.md` - TypeScript 코딩 규칙, 타입 시스템
   - `references/COMMON_CONVENTION.md` - 네이밍 규칙, 에러 처리

## Workflow

### Step 1: 작업 분류

요청된 작업을 아래 유형 중 하나로 분류합니다:

| 유형 | 해당 컨벤션 섹션 | 핵심 규칙 |
|------|------------------|-----------|
| 컴포넌트 | 섹션 2 (컴포넌트 패턴) + 섹션 9 (TypeScript 연동) | Compound Components, Controlled/Uncontrolled, 조건부 렌더링, key, children 합성 |
| Hook | 섹션 3 (Hooks 규칙) | 기본 규칙, useState 패턴, useEffect, useRef, useMemo/useCallback, Custom Hook 설계 |
| React 19 기능 | 섹션 4 (React 19 기능) | use(), React Compiler, Actions, useOptimistic, ref prop, Metadata |
| 이벤트 처리 | 섹션 5 (이벤트 처리) | 핸들러 네이밍(onXxx/handleXxx), 이벤트 타입, 합성 이벤트 |
| 성능 최적화 | 섹션 6 (성능 최적화) | 리렌더링 방지, State Colocation, Lazy Init, 가상화 |
| Error Boundary | 섹션 7 (Error Boundary) | react-error-boundary, 복구 전략, 배치 전략 |
| Context/상태 | 섹션 8 (Context API) | Context vs Zustand 선택, Provider 패턴, Context 분리 |

### Step 2: 패턴 확인

해당 섹션의 규칙과 좋은 예시/나쁜 예시를 확인합니다. 특히:

- **[MUST]** 규칙은 반드시 준수
- **[SHOULD]** 규칙은 특별한 사유가 없는 한 준수
- **[MAY]** 규칙은 상황에 따라 선택

### Step 3: 구현

컨벤션의 좋은 예시를 따라 구현합니다. 주요 체크리스트:

**컴포넌트 작성 시:**
- [ ] 연관 컴포넌트 그룹은 Compound Component 패턴 적용
- [ ] 폼 입력은 제어 컴포넌트(Controlled)로 작성
- [ ] 조건부 렌더링 시 `&&` 연산자 좌측에 number 직접 사용 금지 (boolean 변환)
- [ ] 리스트 `key`에 인덱스 대신 고유 ID 사용
- [ ] 레이아웃/래퍼는 `children` 합성 패턴 사용
- [ ] HTML 래핑 컴포넌트는 `ComponentPropsWithoutRef`/`ComponentPropsWithRef` 확장
- [ ] 변형(variant)이 있으면 Discriminated Union 타입 사용
- [ ] `children` 타입은 기본 `React.ReactNode` 사용

**Hook 작성 시:**
- [ ] Hook은 반드시 최상위에서 호출 (조건문/반복문 내부 금지)
- [ ] 이전 상태 의존 업데이트는 함수형 업데이트 사용: `setCount(prev => prev + 1)`
- [ ] `useEffect`는 외부 시스템 동기화에만 사용 (이벤트 응답/파생 상태에 사용 금지)
- [ ] 구독/타이머 Effect에 cleanup 함수 반환 필수
- [ ] React 19: `forwardRef` 대신 ref를 직접 prop으로 수신
- [ ] React Compiler 활성화 시 수동 `useMemo`/`useCallback` 작성 금지
- [ ] Custom Hook: `use` 접두사, 단일 관심사, 반환값은 객체 또는 `as const` 튜플

**React 19 기능 사용 시:**
- [ ] `use()`: Promise/Context 소비, 반드시 `<Suspense>` 내부에서 사용
- [ ] `use()`: 렌더 함수 내에서 Promise 직접 생성 금지
- [ ] `useActionState`: 폼 제출 상태 관리
- [ ] `useFormStatus`: 반드시 `<form>` 내부의 자식 컴포넌트에서 호출
- [ ] `useOptimistic`: Transition/Action 내부에서만 낙관적 업데이트

**성능 최적화 시:**
- [ ] 렌더 함수 외부에 상수 객체/배열 정의 (매 렌더링 새 참조 방지)
- [ ] 상태는 실제 사용하는 컴포넌트 가까이 배치 (State Colocation)
- [ ] `useState` 초기값이 비용이 큰 연산이면 함수 참조 전달: `useState(fn)` (not `useState(fn())`)
- [ ] 수백 개 이상 리스트는 `@tanstack/react-virtual` 가상화 적용

**Error Boundary:**
- [ ] `react-error-boundary` 라이브러리 사용
- [ ] 모든 Error Boundary fallback에 복구 수단 (다시 시도 버튼) 제공
- [ ] `resetKeys`로 의존 데이터 변경 시 자동 재시도
- [ ] 루트에 전역 경계 1개 + 독립 UI 섹션마다 추가 경계

**Context API:**
- [ ] 전역 클라이언트 상태(자주 업데이트)는 Zustand, 변경 빈도 낮은 설정은 Context
- [ ] Provider value에 `useMemo`/`useCallback`으로 참조 안정화 (React Compiler 미사용 시)
- [ ] 하나의 거대한 Context 대신 관심사별 분리

### Step 4: 안티패턴 검증

구현 완료 후, 아래 안티패턴에 해당하는 코드가 없는지 확인합니다:

| 안티패턴 | 올바른 방법 |
|----------|-------------|
| props/state에서 파생 가능한 값을 별도 state로 관리 | 렌더링 중 직접 계산 |
| `useEffect`로 파생 상태 동기화 | 렌더링 중 직접 계산 |
| `useEffect`를 이벤트 핸들러로 사용 | 이벤트 핸들러 함수에서 직접 처리 |
| 컴포넌트 리셋에 `useEffect` + 개별 state 초기화 | `key` prop으로 리셋 |
| `useState`에 렌더링 무관 값 저장 | `useRef` 사용 |
| `&&` 좌측에 number 직접 사용 | `boolean` 변환 후 사용 |
| 리스트 `key`에 배열 인덱스 사용 | 고유 ID 사용 |

## Cross-Skill References

- **Next.js + MUI UI 개발**: `nextjs-ui-dev` skill 사용
- **코드 리뷰**: `convention-code-review` skill 사용
- **컨벤션 리팩토링**: `convention-refactor` skill 사용
- **상태 관리 심화**: `nextjs-data-provider` skill의 Zustand/TanStack Query 패턴 참조
