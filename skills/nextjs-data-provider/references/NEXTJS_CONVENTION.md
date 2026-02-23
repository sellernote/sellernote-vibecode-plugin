# Next.js 컨벤션

> 이 문서는 Next.js 15 App Router 프로젝트에 적용되는 규칙을 정의합니다.
> 상위 규칙: [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)

---

## 1. 기술 스택

| 항목 | 버전/설정 |
| --- | --- |
| Next.js | 15 |
| React | 19 |
| TypeScript | 5.x |
| 빌드 도구 | Turbopack (기본) |
| 패키지 매니저 | TBD |

---

## 2. App Router 파일 컨벤션

### 특수 파일 역할

- **규칙**: [MUST] App Router의 특수 파일은 아래 정의된 역할에 맞게 사용한다.
- **이유**: Next.js App Router는 파일 이름으로 라우팅, 레이아웃, 에러 처리, 로딩 상태를 자동 구성한다. 특수 파일의 역할을 정확히 이해해야 프레임워크의 최적화를 활용할 수 있다.

| 파일 | 역할 |
| --- | --- |
| `page.tsx` | 라우트의 고유 UI. 해당 URL에 매칭되는 페이지 컴포넌트 |
| `layout.tsx` | 하위 라우트와 공유하는 레이아웃. 네비게이션 시 리렌더링 없이 유지 |
| `loading.tsx` | 자동 Suspense 경계. 라우트 전환 시 로딩 UI |
| `error.tsx` | 에러 경계. `'use client'` 필수 |
| `not-found.tsx` | 404 UI |
| `template.tsx` | layout과 유사하나 매 네비게이션마다 리마운트 |
| `route.ts` | API 엔드포인트 (Route Handler) |
| `default.tsx` | Parallel Routes의 기본 폴백 |

### Route Groups

- **규칙**: [SHOULD] 괄호를 사용하여 URL 경로에 영향 없이 라우트를 논리적으로 그룹화한다.
- **이유**: URL 구조를 변경하지 않으면서 레이아웃 공유와 코드 조직화를 가능하게 한다.
- **좋은 예시**:

```
app/
├── (auth)/
│   ├── login/page.tsx      # /login
│   └── layout.tsx          # 인증 페이지 전용 레이아웃
├── (dashboard)/
│   ├── overview/page.tsx   # /overview
│   └── layout.tsx          # 대시보드 전용 레이아웃
└── layout.tsx              # 루트 레이아웃
```

### Parallel Routes & Intercepting Routes

- **규칙**: [MAY] `@슬롯명` 디렉토리로 동시 렌더링 슬롯을, `(.)` `(..)` `(...)` 패턴으로 라우트 인터셉팅을 사용할 수 있다.
- **이유**: 대시보드의 독립 섹션 동시 표시, 모달 오버레이 등 고급 라우팅 패턴에 활용한다.

---

## 3. Server Components vs Client Components

- **규칙**: [MUST] 기본값은 Server Component. 모든 컴포넌트는 별도 지시어 없으면 서버에서 렌더링된다.
- **이유**: 클라이언트 번들에 포함되지 않아 번들 크기를 줄이고, 서버에서 직접 데이터에 접근할 수 있다.
- **규칙**: [MUST] `'use client'`는 클라이언트 기능이 필요할 때만 파일 최상단에 선언한다.
- **이유**: 불필요한 선언은 해당 컴포넌트와 모든 하위 모듈을 클라이언트 번들에 포함시킨다.

### 의사결정 기준

| 필요한 기능 | Server Component | Client Component |
| --- | --- | --- |
| 데이터 페칭 | async/await 직접 사용 | TanStack Query 사용 |
| 백엔드 리소스 접근 | 직접 접근 가능 | API 경유 필요 |
| 민감 정보 (토큰, 키) | 서버에서만 처리 | 노출 위험 |
| useState, useEffect | 사용 불가 | 사용 가능 |
| 이벤트 핸들러 (onClick) | 사용 불가 | 사용 가능 |
| 브라우저 API (localStorage) | 사용 불가 | 사용 가능 |

### 합성 패턴

- **규칙**: [SHOULD] Server Component를 Client Component의 children으로 전달하여 서버 렌더링 이점을 유지한다.
- **이유**: Client Component에서 Server Component를 직접 import하면 번들에 포함된다. children으로 전달하면 렌더링 결과만 전달된다.
- **좋은 예시**:

```typescript
// page.tsx (Server Component)
export default function Page() {
  return (
    <ClientWrapper>
      <ServerContent /> {/* 서버에서 렌더링된 결과가 전달됨 */}
    </ClientWrapper>
  );
}
```

- **나쁜 예시**:

```typescript
'use client';
import { ServerContent } from './ServerContent'; // Client에서 직접 import - 번들에 포함됨

function ClientWrapper() {
  return <ServerContent />;
}
```

### 'use client' 경계 위치

- **규칙**: [MUST] `'use client'` 경계는 트리 최하단(리프 노드)에 배치하여 클라이언트 번들을 최소화한다.
- **이유**: 선언 지점 하위의 모든 import가 번들에 포함된다. 경계를 최하단에 두면 범위를 최소화한다.
- **좋은 예시**:

```typescript
// page.tsx (Server Component)
export default async function ProductPage() {
  const products = await fetchProducts();
  return (
    <main>
      <ProductList products={products} />
      <AddToCartButton /> {/* 이 컴포넌트만 'use client' */}
    </main>
  );
}
```

- **나쁜 예시**:

```typescript
// page.tsx - 페이지 전체를 Client Component로 선언
'use client';
export default function ProductPage() {
  const [products, setProducts] = useState([]);
  useEffect(() => { fetchProducts().then(setProducts); }, []);
  return <main>{products.map((p) => <ProductCard key={p.id} product={p} />)}</main>;
}
```

---

## 4. 데이터 페칭 전략

### Server Components fetch

- **규칙**: [SHOULD] 초기 페이지 로드 데이터는 Server Component에서 async/await로 직접 fetch한다.
- **이유**: 서버에서 실행되어 SEO에 유리하고 초기 로딩 성능이 우수하다.
- **좋은 예시**:

```typescript
// app/products/page.tsx
export default async function ProductsPage() {
  const products = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 },
  }).then((res) => res.json());

  return <ProductList products={products} />;
}
```

### Server Actions

- **규칙**: [MUST] 데이터 생성/수정/삭제 등 mutation은 Server Actions를 사용한다.
- **이유**: 별도 API 엔드포인트 없이 데이터 변경을 처리하고, `revalidatePath`/`revalidateTag`로 캐시를 즉시 무효화한다.
- **좋은 예시**:

```typescript
// app/actions/post.ts
'use server';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  await db.post.create({ data: { title, content } });
  revalidatePath('/posts');
}
```

### Route Handlers

- **규칙**: [MAY] 외부 웹훅 수신, 서드파티 API 연동 등 Server Actions로 처리하기 어려운 경우 Route Handlers를 사용한다.
- **이유**: HTTP 요청/응답을 직접 제어해야 하는 경우에 적합하다.
- **좋은 예시**:

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') ?? '1';
  const users = await db.user.findMany({ skip: (Number(page) - 1) * 20, take: 20 });
  return NextResponse.json(users);
}
```

### TanStack Query (클라이언트 데이터 페칭)

- **규칙**: [SHOULD] 클라이언트에서 인터랙션 후 데이터 갱신이나 실시간 데이터가 필요한 경우 TanStack Query를 사용한다.
- **이유**: 캐싱, 백그라운드 갱신, 중복 요청 방지 등을 자동 처리한다. 상세 패턴은 [상태 관리 컨벤션](../state/STATE_CONVENTION.md)을 참조한다.

### 데이터 페칭 방법 선택 기준

| 시나리오 | 방법 |
| --- | --- |
| 초기 페이지 로드 + SEO | Server Components fetch |
| 폼 제출, 데이터 생성/수정/삭제 | Server Actions |
| 외부 웹훅, 서드파티 API 연동 | Route Handlers |
| 클라이언트 인터랙션 후 데이터 갱신 | TanStack Query |
| 실시간 데이터 (폴링, 무한 스크롤) | TanStack Query |

---

## 5. 캐싱 & 재검증

### ISR (Incremental Static Regeneration)

- **규칙**: [SHOULD] 주기적 재검증이 필요한 페이지에는 `revalidate` 옵션을 설정한다.
- **이유**: 정적 페이지의 빠른 응답 속도를 유지하면서 데이터 갱신을 반영할 수 있다.
- **좋은 예시**:

```typescript
export const revalidate = 3600; // 1시간마다 재검증

export default async function ProductsPage() {
  const products = await fetchProducts();
  return <ProductList products={products} />;
}
```

### On-demand Revalidation

- **규칙**: [SHOULD] 데이터 변경 시점에 즉시 캐시를 무효화해야 하면 `revalidatePath()` 또는 `revalidateTag()`를 사용한다.
- **이유**: 시간 기반 재검증으로는 변경 직후 최신 정보를 제공하기 어렵다.
- **좋은 예시**:

```typescript
'use server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });
  revalidatePath('/products');         // 경로 기반 무효화
  revalidateTag('product-detail');     // 태그 기반 무효화
}
```

### fetch 옵션 명시

- **규칙**: [MUST] Server Component에서 fetch 시 캐시 동작을 명시적으로 설정한다.
- **이유**: 캐시 옵션 생략 시 기본 동작에 의존하여 의도와 다른 캐싱이 발생할 수 있다.

| 옵션 | 동작 |
| --- | --- |
| `cache: 'force-cache'` | 캐시 우선 (기본값) |
| `cache: 'no-store'` | 항상 새로운 데이터 |
| `next: { revalidate: N }` | N초마다 재검증 |
| `next: { tags: ['tag'] }` | 태그 기반 재검증 |

- **좋은 예시**:

```typescript
const staticData = await fetch('https://api.example.com/categories', {
  cache: 'force-cache',
});
const realtimeData = await fetch('https://api.example.com/stock', {
  cache: 'no-store',
});
```

- **나쁜 예시**:

```typescript
// 캐시 옵션 누락 - 의도를 파악하기 어려움
const data = await fetch('https://api.example.com/products');
```

---

## 6. Middleware

- **규칙**: [SHOULD] `middleware.ts`는 프로젝트 루트(`src/`) 또는 최상위에 위치시킨다. 인증 체크, 리다이렉트, 요청 로깅 등에 사용한다.
- **이유**: Next.js는 프로젝트 루트 또는 `src/`에서만 middleware를 인식한다.
- **규칙**: [MUST] `matcher` config로 middleware 적용 범위를 제한한다.
- **이유**: matcher 없이 모든 요청에 실행하면 정적 파일까지 처리하여 성능이 저하된다.
- **좋은 예시**:

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

- **나쁜 예시**:

```typescript
// config.matcher 누락 - 모든 요청(이미지, 정적 파일 포함)에 실행됨
export function middleware(request: NextRequest) { /* ... */ }
```

---

## 7. 에러 처리

- **규칙**: [MUST] `error.tsx`는 라우트별 에러 경계로, `'use client'` 필수. `error`와 `reset` props를 활용한다.
- **이유**: React Error Boundary 기반이므로 Client Component여야 한다.
- **좋은 예시**:

```typescript
// app/products/error.tsx
'use client';

export default function ErrorPage({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>문제가 발생했습니다</h2>
      <p>{error.message}</p>
      <button onClick={reset}>다시 시도</button>
    </div>
  );
}
```

- **규칙**: [MUST] `global-error.tsx`는 루트 레이아웃의 에러를 처리하며, `<html>`과 `<body>` 태그를 포함해야 한다.
- **이유**: 루트 layout.tsx를 대체하므로 전체 HTML 구조를 자체 정의해야 한다. error.tsx와 동일하게 `'use client'` 필수.

- **규칙**: [SHOULD] `not-found.tsx`를 사용하여 프로젝트 디자인에 맞는 커스텀 404 페이지를 제공한다.
- **이유**: 기본 404 대신 일관된 UI와 네비게이션 안내를 제공할 수 있다.

---

## 8. 로딩 상태

- **규칙**: [SHOULD] `loading.tsx`로 라우트별 자동 Suspense 경계를 설정하고, 스켈레톤 UI를 제공한다.
- **이유**: 스피너 대신 스켈레톤 UI를 사용하면 CLS를 줄이고 체감 로딩 속도를 개선한다.

- **규칙**: [SHOULD] 독립적인 데이터 섹션은 개별 Suspense 경계로 감싸서 Streaming을 구현한다.
- **이유**: 가장 느린 요청에 전체 UI가 차단되는 것을 방지한다.
- **좋은 예시**:

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <main>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>
    </main>
  );
}
```

- **나쁜 예시**:

```typescript
// 직렬 fetch - 총 5초 후에야 렌더링 시작
export default async function DashboardPage() {
  const revenue = await fetchRevenueData();   // 3초
  const orders = await fetchRecentOrders();   // 2초
  return <main><Chart data={revenue} /><OrderTable data={orders} /></main>;
}
```

---

## 9. 이미지/폰트 최적화

- **규칙**: [MUST] 이미지 렌더링 시 `next/image` 컴포넌트를 사용한다. HTML `<img>` 태그 직접 사용 금지.
- **이유**: WebP/AVIF 변환, lazy loading, 반응형 크기 조절, 레이아웃 시프트 방지를 자동 처리한다.
- **규칙**: [MUST] LCP 이미지에 `priority` 속성을 설정한다.
- **이유**: preload하여 LCP 시간을 단축한다.
- **규칙**: [SHOULD] `sizes` 속성으로 반응형 이미지 크기 힌트를 제공한다.
- **이유**: 실제 표시 크기에 맞는 이미지를 다운로드하여 대역폭을 절약한다.
- **좋은 예시**:

```typescript
import Image from 'next/image';

<Image src="/hero.jpg" alt="메인 배너" width={1200} height={600} priority sizes="100vw" />
<Image src={src} alt={name} width={400} height={400} sizes="(max-width: 768px) 100vw, 33vw" />
```

- **나쁜 예시**:

```typescript
<img src="/hero.jpg" alt="메인 배너" /> {/* 최적화 없음 */}
```

- **규칙**: [MUST] `next/font`로 폰트를 로딩한다. 외부 CDN 폰트 로드 금지.
- **이유**: 빌드 타임에 셀프 호스팅하여 외부 요청을 제거하고, `size-adjust`로 레이아웃 시프트를 방지한다.
- **좋은 예시**:

```typescript
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko" className={inter.className}><body>{children}</body></html>;
}
```

- **나쁜 예시**:

```typescript
// 외부 CDN 직접 로드 - FOUT 발생, 외부 의존성
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />
```

---

## 10. 환경변수 관리

- **규칙**: [MUST] 클라이언트에 노출할 변수만 `NEXT_PUBLIC_` 접두사를 사용한다.
- **규칙**: [MUST NOT] API 키, 시크릿, DB URL 등 민감 정보에 `NEXT_PUBLIC_` 사용 금지.
- **이유**: `NEXT_PUBLIC_` 변수는 빌드 시 클라이언트 JavaScript에 리터럴로 삽입되어 브라우저에서 누구나 확인 가능하다.

| 변수 | 접두사 | 올바른 사용 |
| --- | --- | --- |
| `NEXT_PUBLIC_GA_ID` | NEXT_PUBLIC_ | 브라우저에서 사용하는 공개 ID |
| `NEXT_PUBLIC_API_URL` | NEXT_PUBLIC_ | 공개 API 엔드포인트 |
| `DATABASE_URL` | 없음 | 서버에서만 접근 |
| `JWT_SECRET` | 없음 | 서버에서만 접근 |

- **좋은 예시**:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com   # 클라이언트에서 API 호출 시 사용
DATABASE_URL=postgresql://user:pass@host/db    # 서버에서만 접근
```

- **나쁜 예시**:

```bash
NEXT_PUBLIC_DATABASE_URL=postgresql://user:pass@host/db   # DB 접속 정보 노출!
NEXT_PUBLIC_JWT_SECRET=my-secret-key                      # JWT 시크릿 노출!
```

---

## 11. 안티패턴

- **규칙**: [MUST NOT] Server Component로 충분한 컴포넌트에 `'use client'`를 선언하지 않는다.
- **이유**: 해당 컴포넌트와 하위 모듈 전체가 클라이언트 번들에 포함된다.

- **규칙**: [MUST NOT] Server Component에서 `useState`, `useEffect` 등 클라이언트 Hook을 사용하지 않는다.
- **이유**: Server Component에는 상태 개념이 없다. Hook이 필요하면 Client Component로 분리한다.

- **규칙**: [MUST NOT] `NEXT_PUBLIC_`으로 민감 정보를 노출하지 않는다. (10. 환경변수 관리 참조)

- **규칙**: [SHOULD NOT] fetch에서 캐시 옵션을 생략하지 않는다. (5. 캐싱 & 재검증 참조)

- **규칙**: [SHOULD NOT] `layout.tsx`에서 fetch한 데이터를 children에 props로 전달하지 않는다.
- **이유**: layout은 네비게이션 시 리렌더링되지 않으며 children에 props를 전달할 수 없다.

- **규칙**: [MUST NOT] 정적 빌드할 동적 라우트에서 `generateStaticParams`를 누락하지 않는다.
- **이유**: 빌드 시 경로를 미리 생성할 수 없어 정적 생성의 성능 이점을 잃는다.
- **좋은 예시**:

```typescript
// app/products/[id]/page.tsx
export async function generateStaticParams() {
  const products = await fetchAllProducts();
  return products.map((product) => ({ id: product.id }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetchProduct(id);
  return <ProductDetail product={product} />;
}
```

---

## 12. 참고 자료

- [Next.js 15 공식 문서](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
