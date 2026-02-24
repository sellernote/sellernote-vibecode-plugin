# 상태 관리 컨벤션

> 이 문서는 프론트엔드의 상태 관리 전략을 정의합니다.
> 클라이언트 상태(Zustand)와 서버 상태(TanStack Query)를 명확히 분리합니다.
> 상위 규칙: [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)

## 상태 분류 기준

- **규칙**: [MUST] 모든 상태는 아래 4가지 유형 중 하나로 분류하고, 각 유형에 맞는 도구를 사용한다.
- **이유**: 상태의 성격에 따라 적절한 도구를 선택해야 캐싱, 동기화, 리렌더링 최적화 등의 이점을 얻을 수 있다.

| 상태 유형 | 설명 | 도구 | 예시 |
|----------|------|------|------|
| 서버 상태 | API에서 가져온 데이터 | TanStack Query | 상품 목록, 사용자 프로필, 주문 내역 |
| 클라이언트 상태 | UI 상태, 사용자 설정 | Zustand | 사이드바 열림/닫힘, 테마, 알림 |
| 로컬 상태 | 단일 컴포넌트 내 상태 | useState | 모달 열림, 입력값, 토글 |
| URL 상태 | 라우트 파라미터, 검색 | useSearchParams | 페이지네이션, 필터, 정렬 |

- **규칙**: [MUST] 서버에서 온 데이터는 반드시 TanStack Query로 관리한다.
- **이유**: TanStack Query는 캐싱, 자동 재요청, stale 판별, 백그라운드 갱신 등을 자동으로 처리한다.

- **규칙**: [MUST] 단일 컴포넌트에서만 사용하는 상태는 useState를 사용한다.
- **이유**: 전역 store에 로컬 상태를 넣으면 불필요한 의존성이 생기고, 컴포넌트의 재사용성이 떨어진다.

- **규칙**: [SHOULD] 여러 컴포넌트에서 공유하는 UI 상태는 Zustand를 사용한다.
- **이유**: Props drilling 없이 여러 컴포넌트가 동일한 UI 상태에 접근할 수 있고, Context API 대비 리렌더링 최적화가 용이하다.

## Zustand 패턴

### Slice 패턴

- **규칙**: [MUST] `store/slices/` 디렉토리에 도메인별 slice 파일을 생성하고, `StateCreator` 타입을 사용한다.
- **이유**: 도메인별로 slice를 분리하면 관심사가 명확히 나뉘고, 각 slice를 독립적으로 테스트할 수 있다.
- **좋은 예시**:
  ```typescript
  // store/slices/userSlice.ts
  import { StateCreator } from 'zustand';

  export interface UserSlice {
    user: User | null;
    setUser: (user: User) => void;
    updatePreferences: (prefs: Partial<UserPreferences>) => void;
    logout: () => void;
  }

  export const createUserSlice: StateCreator<UserSlice & UISlice, [], [], UserSlice> = (set) => ({
    user: null,
    setUser: (user) => set({ user }),
    updatePreferences: (prefs) =>
      set((state) => ({
        user: state.user
          ? { ...state.user, preferences: { ...state.user.preferences, ...prefs } }
          : null,
      })),
    logout: () => set({ user: null }),
  });

  // store/slices/uiSlice.ts
  export interface UISlice {
    isSidebarOpen: boolean;
    notifications: Notification[];
    toggleSidebar: () => void;
    addNotification: (notification: Notification) => void;
  }

  export const createUISlice: StateCreator<UserSlice & UISlice, [], [], UISlice> = (set) => ({
    isSidebarOpen: true,
    notifications: [],
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    addNotification: (notification) =>
      set((state) => ({ notifications: [...state.notifications, notification] })),
  });
  ```

### Store 결합

- **규칙**: [MUST] `create` 함수에 `devtools`와 `persist` 미들웨어를 조합하여 store를 생성한다.
- **이유**: `devtools`는 상태 변경 이력 추적을, `persist`는 새로고침 후에도 필요한 상태 유지를 지원한다.
- **좋은 예시**:
  ```typescript
  // store/index.ts
  import { create } from 'zustand';
  import { devtools, persist } from 'zustand/middleware';

  type StoreState = UserSlice & UISlice;

  export const useStore = create<StoreState>()(
    devtools(
      persist(
        (...a) => ({ ...createUserSlice(...a), ...createUISlice(...a) }),
        {
          name: 'app-store',
          partialize: (state) => ({ user: state.user, isSidebarOpen: state.isSidebarOpen }),
        },
      ),
      { name: 'AppStore' },
    ),
  );
  ```

### Selector 최적화

- **규칙**: [MUST] 개별 selector를 내보내기하여 불필요한 리렌더링을 방지한다.
- **이유**: store 전체를 구독하면 어떤 상태가 변경되든 해당 컴포넌트가 리렌더링된다. 필요한 값만 선택하면 해당 값 변경 시에만 리렌더링이 발생한다.
- **좋은 예시**:
  ```typescript
  // store/selectors.ts
  export const useUser = () => useStore((state) => state.user);
  export const useIsSidebarOpen = () => useStore((state) => state.isSidebarOpen);
  export const useToggleSidebar = () => useStore((state) => state.toggleSidebar);
  ```
- **나쁜 예시**:
  ```typescript
  // 전체 store를 구독 - 어떤 상태든 변경되면 리렌더링 발생
  const { user, isSidebarOpen } = useStore();
  ```

### Persist 미들웨어

- **규칙**: [SHOULD] `partialize`로 필요한 데이터만 localStorage에 저장한다.
- **이유**: 전체 store를 persist하면 일시적인 UI 상태까지 저장되어 오래된 데이터가 복원될 수 있다.
- **좋은 예시**:
  ```typescript
  persist(storeCreator, {
    name: 'app-store',
    partialize: (state) => ({
      user: state.user,           // 유지 필요
      isSidebarOpen: state.isSidebarOpen, // 유지 필요
      // notifications 제외 - 일시적 데이터
    }),
  })
  ```
- **나쁜 예시**:
  ```typescript
  persist(storeCreator, {
    name: 'app-store',
    // partialize 미설정 - 모든 상태가 localStorage에 저장됨
  })
  ```

## TanStack Query 패턴

### Query Key Factory

- **규칙**: [MUST] `@lukemorales/query-key-factory`를 사용하여 query key를 일관되게 관리한다.
- **이유**: 문자열 배열로 직접 query key를 관리하면 오타, 중복, 불일치가 발생하기 쉽다. Factory는 타입 안전한 key 생성과 계층적 invalidation을 지원한다.
- **좋은 예시**:
  ```typescript
  // queries/queryKeys.ts
  import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory';

  export const productKeys = createQueryKeys('products', {
    all: null,
    list: (filters: ProductFilters) => ({ queryKey: [filters] }),
    detail: (id: string) => ({ queryKey: [id] }),
  });

  export const userKeys = createQueryKeys('users', {
    all: null, me: null,
    detail: (id: string) => ({ queryKey: [id] }),
    orders: (userId: string) => ({ queryKey: [userId] }),
  });

  export const queryKeys = mergeQueryKeys(productKeys, userKeys);
  ```
- **나쁜 예시**:
  ```typescript
  // 문자열 배열로 직접 관리 - 오타와 불일치 위험
  useQuery({ queryKey: ['produts', id], queryFn: () => fetchProduct(id) }); // 오타!
  queryClient.invalidateQueries({ queryKey: ['products', id] }); // key 불일치
  ```

### 커스텀 훅

- **규칙**: [MUST] `queries/` 디렉토리에 도메인별 파일을 생성하고, query/mutation 로직을 커스텀 훅으로 캡슐화한다.
- **이유**: 컴포넌트에서 `useQuery`를 직접 호출하면 설정이 흩어진다. 커스텀 훅으로 캡슐화하면 변경이 한 곳에 집중되고 재사용이 가능하다.
- **좋은 예시**:
  ```typescript
  // queries/useProducts.ts
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  import { productKeys } from './queryKeys';

  export function useProducts(filters: ProductFilters) {
    return useQuery({
      ...productKeys.list(filters),
      queryFn: () => fetchProducts(filters),
      staleTime: 5 * 60 * 1000,
    });
  }

  export function useProduct(id: string) {
    return useQuery({
      ...productKeys.detail(id),
      queryFn: () => fetchProduct(id),
      enabled: !!id,
    });
  }

  export function useCreateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: createProduct,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: productKeys.all.queryKey });
      },
    });
  }
  ```

### 캐시 전략

- **규칙**: [SHOULD] 데이터의 변경 빈도에 따라 `staleTime`과 `gcTime`을 설정한다.
- **이유**: 적절한 캐시 전략은 불필요한 네트워크 요청을 줄이고 사용자 경험을 향상시킨다.

| 데이터 유형 | staleTime | gcTime | 예시 |
|------------|-----------|--------|------|
| 자주 변경 | 30초 ~ 1분 | 5분 | 실시간 재고, 알림 개수 |
| 보통 | 5분 (기본값) | 10분 | 상품 목록, 주문 내역 |
| 거의 변경 안 됨 | 30분 ~ 1시간 | 2시간 | 카테고리 목록, 공지사항 |
| 변경되지 않음 | Infinity | 24시간 | 국가 코드, 환율 기준일 |

- **좋은 예시**:
  ```typescript
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
  ```

### Optimistic Updates

- **규칙**: [SHOULD] 사용자 경험이 중요한 mutation에는 optimistic update를 적용한다.
- **이유**: 서버 응답을 기다리지 않고 UI를 즉시 업데이트하면 체감 속도가 향상된다. 에러 시 롤백으로 데이터 일관성을 보장한다.
- **좋은 예시**:
  ```typescript
  export function useUpdateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: updateProduct,
      onMutate: async (updatedProduct) => {
        const detailKey = productKeys.detail(updatedProduct.id).queryKey;
        await queryClient.cancelQueries({ queryKey: detailKey }); // 1. refetch 취소
        const previousProduct = queryClient.getQueryData(detailKey); // 2. 스냅샷 저장
        queryClient.setQueryData(detailKey, (old: Product) => ({ ...old, ...updatedProduct })); // 3. 낙관적 업데이트
        return { previousProduct };
      },
      onError: (_err, updatedProduct, context) => {
        if (context?.previousProduct) { // 에러 시 롤백
          queryClient.setQueryData(
            productKeys.detail(updatedProduct.id).queryKey, context.previousProduct,
          );
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: productKeys.all.queryKey });
      },
    });
  }
  ```

### Mutation + Invalidation

- **규칙**: [MUST] mutation 성공 후 반드시 관련 쿼리를 invalidate한다.
- **이유**: invalidate하지 않으면 화면에 오래된 데이터가 표시되어 사용자에게 혼란을 야기한다.
- **좋은 예시**:
  ```typescript
  export function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => deleteProduct(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: productKeys.all.queryKey });
      },
    });
  }
  ```
- **나쁜 예시**:
  ```typescript
  export function useDeleteProduct() {
    return useMutation({
      mutationFn: (id: string) => deleteProduct(id),
      // onSuccess 없음 - 삭제된 상품이 목록에 계속 표시됨
    });
  }
  ```

## 서버 상태 복제 금지

- **규칙**: [MUST NOT] TanStack Query가 관리하는 서버 데이터를 Zustand store에 복사하지 않는다.
- **이유**: 동일한 데이터가 두 곳에 존재하면 동기화 문제가 발생한다. TanStack Query가 백그라운드에서 데이터를 갱신해도 Zustand에 복사된 데이터는 오래된 상태로 남아 추적하기 어려운 버그를 유발한다.
- **나쁜 예시**:
  ```typescript
  function UserProfile() {
    const { data: user } = useUser();
    const setUser = useStore((state) => state.setUser);
    useEffect(() => {
      if (user) setUser(user); // TanStack Query 캐시와 Zustand 사이에 동기화 문제!
    }, [user, setUser]);
    const storedUser = useStore((state) => state.user);
    return <div>{storedUser?.name}</div>;
  }
  ```
- **좋은 예시**:
  ```typescript
  // TanStack Query 훅을 직접 사용 - 단일 데이터 소스 보장
  function UserProfile() {
    const { data: user, isLoading } = useUser();
    if (isLoading) return <Skeleton />;
    return <div>{user?.name}</div>;
  }
  // 여러 컴포넌트에서 동일한 훅을 호출해도 캐시를 공유하므로 중복 요청 없음
  function UserAvatar() {
    const { data: user } = useUser();
    return <Avatar src={user?.avatarUrl} />;
  }
  ```

## 안티패턴

### 1. 전역 상태 남용

- **규칙**: [MUST NOT] 로컬 상태로 충분한 데이터를 Zustand에 저장하지 않는다.
- **이유**: 단일 컴포넌트에서만 사용하는 데이터를 전역 store에 넣으면 store가 비대해지고, 컴포넌트 간 불필요한 결합이 생긴다.
- **나쁜 예시**:
  ```typescript
  // Zustand store에 로컬 상태를 넣는다
  interface StoreState {
    isDeleteModalOpen: boolean;
    searchInputValue: string;
    isDropdownOpen: boolean;
  }
  ```
- **좋은 예시**:
  ```typescript
  function ProductCard() {
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    return <Modal open={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} />;
  }
  ```

### 2. useEffect + fetch 패턴

- **규칙**: [MUST NOT] TanStack Query 대신 useEffect 안에서 fetch를 호출하여 서버 데이터를 관리하지 않는다.
- **이유**: useEffect + fetch 패턴은 로딩/에러 상태, 캐싱, 중복 요청 방지, 백그라운드 갱신 등을 모두 직접 구현해야 한다.
- **나쁜 예시**:
  ```typescript
  function ProductList() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch('/api/products')
        .then((res) => res.json())
        .then(setProducts)
        .finally(() => setLoading(false));
    }, []);
  }
  ```
- **좋은 예시**:
  ```typescript
  function ProductList() {
    const { data: products, isLoading, error } = useProducts(filters);
    if (isLoading) return <Skeleton />;
    if (error) return <ErrorMessage error={error} />;
    return <ProductGrid products={products} />;
  }
  ```

### 3. 모든 상태를 한 store에 몰아넣기

- **규칙**: [SHOULD NOT] 관심사가 다른 상태를 하나의 store에 모두 넣지 않는다. 도메인별로 slice를 분리한다.
- **이유**: 하나의 거대한 store 파일은 코드 탐색이 어렵고, 여러 개발자가 동시에 수정할 때 충돌이 빈번하다.

### 4. Selector 없이 전체 store 구독

- **규칙**: [MUST NOT] selector 없이 store 전체를 구독하지 않는다.
- **이유**: store의 어떤 값이 변경되든 해당 컴포넌트가 리렌더링되어 성능이 저하된다.
- **나쁜 예시**:
  ```typescript
  const { user, isSidebarOpen, notifications, theme } = useStore();
  ```
- **좋은 예시**:
  ```typescript
  const theme = useStore((state) => state.theme);
  ```

## 참고 자료

- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Zustand 공식 문서](https://docs.pmnd.rs/zustand)
- [TanStack Query v5 공식 문서](https://tanstack.com/query/latest)
- [@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory)
- [TanStack Query - Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Zustand Slices Pattern](https://docs.pmnd.rs/zustand/guides/slices-pattern)
