---
name: react-data-provider
description: React SPA 데이터 페칭 및 상태 관리 가이드. TanStack Query를 통한 서버 상태 관리, Zustand를 통한 클라이언트 상태 관리, API 클라이언트 설정, 쿼리 키 팩토리, 옵티미스틱 업데이트, 캐시 무효화 등을 Sellernote 컨벤션에 맞게 진행합니다. "데이터 페칭", "API 연동", "상태 관리", "TanStack Query", "Zustand", "쿼리 훅 만들어줘", "스토어 만들어줘", "API 호출", "캐시 전략", "optimistic update" 등의 요청에 사용합니다. Next.js 프로젝트는 nextjs-data-provider skill을 사용하세요.
---

# React Data Provider

React SPA(Vite + React Router) 프로젝트에서 데이터 페칭과 상태 관리를 Sellernote 컨벤션에 맞게 구현합니다.

> **React-only 프로젝트 특성**: Server Components, Server Actions, revalidatePath/Tag가 없습니다. 모든 데이터 페칭은 클라이언트 사이드에서 TanStack Query를 통해 이루어지며, 뮤테이션은 useMutation + REST API 호출로 처리합니다.

## Convention Loading

작업 시작 전 반드시 다음 참조 파일을 읽습니다:

1. **항상 먼저 읽기** (핵심 규칙):
   - `references/STATE_CONVENTION.md` - 상태 분류, TanStack Query 패턴, Zustand 패턴
   - `references/FRONTEND_CONVENTION.md` - 컴포넌트 설계, import 규칙

2. **필요 시 읽기**:
   - `references/TYPESCRIPT_CONVENTION.md` - 타입 시스템, async/await, import 순서
   - `references/COMMON_CONVENTION.md` - 네이밍, 에러 처리, 로깅

## Workflow

### Step 1: 상태 유형 분류

모든 상태는 반드시 아래 4가지 중 하나로 분류합니다:

| 상태 유형 | 도구 | 사용 시점 |
|-----------|------|-----------|
| Server state | TanStack Query | API에서 가져온 데이터 (상품 목록, 사용자 프로필, 주문 내역) |
| Client state | Zustand | 공유 UI 상태, 사용자 설정 (사이드바 열림/닫힘, 테마, 알림) |
| Local state | useState | 단일 컴포넌트 상태 (모달 열림, 입력값, 토글) |
| URL state | useSearchParams (react-router-dom) | 페이지네이션, 필터, 정렬 |

핵심 규칙:
- [MUST] 서버 데이터는 TanStack Query로만 관리
- [MUST NOT] 서버 상태를 Zustand에 복제
- [MUST NOT] 로컬 상태(예: `isDeleteModalOpen`)를 Zustand에 저장

### Step 2: 페칭 전략 결정

React SPA에서는 모든 데이터 페칭이 클라이언트 사이드입니다:

| 시나리오 | 방법 |
|----------|------|
| 목록/상세 데이터 조회 | TanStack Query `useQuery` |
| 검색/필터/페이지네이션 | TanStack Query + URL state (useSearchParams) |
| 생성/수정/삭제 | TanStack Query `useMutation` + REST API |
| 실시간 데이터 (폴링) | TanStack Query `refetchInterval` |
| 무한 스크롤 | TanStack Query `useInfiniteQuery` |

### Step 3: API 클라이언트 설정

[MUST] `lib/api.ts`에 fetch wrapper를 설정합니다:

```typescript
// lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PUT', body }),
  patch: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
```

### Step 4: TanStack Query (서버 상태)

#### 4a: 쿼리 키 팩토리

[MUST] `@lukemorales/query-key-factory`를 사용합니다. `queries/queryKeys.ts`에 배치:

```typescript
import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory';

export const productKeys = createQueryKeys('products', {
  all: null,
  list: (filters: ProductFilters) => ({ queryKey: [filters] }),
  detail: (id: string) => ({ queryKey: [id] }),
});

export const queryKeys = mergeQueryKeys(productKeys);
```

#### 4b: 커스텀 쿼리 훅

[MUST] `queries/` 디렉토리에 도메인별 파일로 배치. `useQuery`/`useMutation`을 커스텀 훅으로 캡슐화하고 컴포넌트에서 직접 호출하지 않습니다:

```typescript
// queries/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { productKeys } from './queryKeys';
import { api } from '@/lib/api';

export function useProducts(filters: ProductFilters) {
  return useQuery({
    ...productKeys.list(filters),
    queryFn: () => api.get<ProductListResponse>(`/products?${toSearchParams(filters)}`),
    staleTime: 5 * 60 * 1000,
  });
}
```

#### 4c: 옵티미스틱 업데이트 + 롤백

UX 중요 뮤테이션에 적용합니다:

```typescript
// queries/useUpdateProduct.ts
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProductInput) =>
      api.put<Product>(`/products/${data.id}`, data),
    onMutate: async (updatedProduct) => {
      const detailKey = productKeys.detail(updatedProduct.id).queryKey;
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousProduct = queryClient.getQueryData(detailKey);
      queryClient.setQueryData(detailKey, (old: Product) => ({
        ...old,
        ...updatedProduct,
      }));
      return { previousProduct };
    },
    onError: (_err, updatedProduct, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(
          productKeys.detail(updatedProduct.id).queryKey,
          context.previousProduct,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all.queryKey });
    },
  });
}
```

핵심 규칙:
- [MUST] 뮤테이션 성공 시 관련 쿼리 invalidate
- [MUST] 옵티미스틱 업데이트 시 `onError`에서 롤백 구현
- [MUST] `setQueryData` 전에 `cancelQueries` 호출 (레이스 컨디션 방지)

### Step 5: Zustand (클라이언트 UI 상태)

#### 5a: Slice 패턴

[MUST] `store/slices/`에 도메인별 slice 파일을 생성, `StateCreator` 타입 사용:

```typescript
// store/slices/uiSlice.ts
import type { StateCreator } from 'zustand';

export interface UISlice {
  isSidebarOpen: boolean;
  notifications: Notification[];
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
}

export const createUISlice: StateCreator<UISlice & UserSlice, [], [], UISlice> = (set) => ({
  isSidebarOpen: true,
  notifications: [],
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  addNotification: (notification) =>
    set((state) => ({ notifications: [...state.notifications, notification] })),
});
```

#### 5b: Store with Partialize

[MUST] `devtools`(최외곽) + `persist` + `partialize`로 일시적 데이터 제외:

```typescript
// store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type StoreState = UserSlice & UISlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createUserSlice(...a),
        ...createUISlice(...a),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          user: state.user,
          isSidebarOpen: state.isSidebarOpen,
        }),
      },
    ),
    { name: 'AppStore' },
  ),
);
```

#### 5c: 셀렉터

[MUST] 개별 셀렉터를 export. 전체 스토어를 구조분해하지 않습니다:

```typescript
// store/selectors.ts
export const useUser = () => useStore((state) => state.user);
export const useIsSidebarOpen = () => useStore((state) => state.isSidebarOpen);
```

### Step 6: 검증

1. 모든 API 호출이 TanStack Query 커스텀 훅을 통해 이루어지는지 확인
2. 서버 데이터가 Zustand에 복제되지 않았는지 확인
3. 쿼리 키가 `@lukemorales/query-key-factory`를 사용하는지 확인
4. 뮤테이션이 성공 시 관련 쿼리를 invalidate하는지 확인
5. Zustand가 slice 패턴 + `devtools` + `persist` + `partialize`를 사용하는지 확인
6. API 클라이언트가 `lib/api.ts`에 설정되어 있는지 확인

## Cross-Skill References

- **React 컴포넌트 패턴**: `react-dev` skill 사용
- **UI 컴포넌트, 스타일링, 폼, 테스트**: `react-ui-dev` skill 사용
- **전체 기능 오케스트레이션**: `react-dev-orchestration` skill 사용
- **코드 리뷰**: `convention-code-review` skill 사용
