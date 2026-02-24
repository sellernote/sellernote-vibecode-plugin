# 스타일링 컨벤션

> 이 문서는 shadcn/ui + Tailwind CSS 기반 스타일링과 디자인 시스템 규칙을 정의합니다.
> 상위 규칙: [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)

---

## 1. shadcn/ui + Next.js 15 설정

### 의존성

- **규칙**: [MUST] shadcn/ui 프로젝트에 다음 핵심 의존성을 설치한다
- **이유**: shadcn/ui는 Radix UI primitives 위에 Tailwind CSS로 스타일링된 컴포넌트를 제공한다. 각 의존성은 컴포넌트 시스템의 필수 요소이다.

| 패키지 | 역할 |
|--------|------|
| `tailwindcss` | 유틸리티 기반 CSS 프레임워크 |
| `class-variance-authority` | 컴포넌트 변형(variants) 타입 안전 관리 |
| `clsx` | 조건부 className 결합 |
| `tailwind-merge` | Tailwind 클래스 충돌 해결 |
| `lucide-react` | 아이콘 라이브러리 |
| `tw-animate-css` | 애니메이션 유틸리티 |

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react tw-animate-css
```

### components.json

- **규칙**: [MUST] 프로젝트 루트에 `components.json` 파일을 생성하여 shadcn/ui 설정을 정의한다
- **이유**: `components.json`은 shadcn CLI가 컴포넌트를 추가할 때 참조하는 설정 파일이다. import 경로, 스타일 방식, 아이콘 라이브러리 등을 한 곳에서 관리한다.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

### cn() 유틸리티 함수

- **규칙**: [MUST] `lib/utils.ts`에 `cn()` 유틸리티 함수를 정의하고, 모든 className 조합에 사용한다
- **이유**: `cn()`은 `clsx`(조건부 클래스 결합)와 `tailwind-merge`(Tailwind 클래스 충돌 해결)를 결합한 함수이다. 이를 통해 `p-4`와 `p-2`가 동시에 적용될 때 후자만 유지되는 등 Tailwind 특유의 클래스 충돌 문제를 자동으로 해결한다.

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- **좋은 예시**:

```typescript
import { cn } from "@/lib/utils";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

function Card({ className, children }: CardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 shadow-sm", className)}>
      {children}
    </div>
  );
}

// 사용: 기본 스타일을 유지하면서 외부에서 커스터마이징 가능
<Card className="p-4"> {/* p-6이 p-4로 올바르게 오버라이드됨 */}
  <p>내용</p>
</Card>
```

- **나쁜 예시**:

```typescript
// cn() 없이 템플릿 리터럴로 직접 결합 — Tailwind 클래스 충돌 미해결
function Card({ className, children }: CardProps) {
  return (
    <div className={`rounded-lg border bg-card p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// p-6과 p-4가 모두 적용되어 예측 불가능한 결과
<Card className="p-4">내용</Card>
```

### next/font 연동

- **규칙**: [MUST] `next/font`로 폰트를 설정하고, CSS variable로 Tailwind에 연동한다
- **이유**: `next/font`는 빌드 타임에 폰트를 최적화하여 Layout Shift를 방지하고, self-hosting으로 외부 네트워크 요청을 제거한다.
- **좋은 예시**:

```typescript
// app/layout.tsx
import { Noto_Sans_KR } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "@/app/globals.css";

const notoSansKR = Noto_Sans_KR({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-kr",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={notoSansKR.variable}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- **나쁜 예시**:

```typescript
// 외부 CDN 직접 로드 — FOUT 발생, 외부 의존성
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR" rel="stylesheet" />
```

---

## 2. 테마 구조

### CSS Variables 기반 디자인 토큰

- **규칙**: [MUST] 디자인 토큰은 `globals.css`의 CSS Variables로 정의하고, `:root`(라이트모드)와 `.dark`(다크모드)에서 각각 값을 설정한다

> **주의**: 아래 CSS 예시는 **Tailwind CSS v4** 문법을 기반으로 한다.
> `@import "tailwindcss"`, `@theme inline`, `@custom-variant` 등은 v4에서만 동작한다.
> v3 프로젝트에서는 `tailwind.config.ts`와 `@tailwind base/components/utilities` 지시어를 사용한다.
- **이유**: CSS Variables를 사용하면 JavaScript 런타임 없이 테마 전환이 가능하고, Tailwind의 유틸리티 클래스와 자연스럽게 통합된다. 다크모드 전환 시 깜빡임(flash)이 발생하지 않는다.

```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### 시맨틱 컬러 시스템

- **규칙**: [MUST] shadcn/ui의 시맨틱 컬러 시스템을 이해하고 올바르게 사용한다
- **이유**: 각 시맨틱 컬러는 용도가 명확히 정의되어 있으며, 다크모드 전환 시 자동으로 적절한 값으로 변경된다.

| 토큰 | 용도 | Tailwind 클래스 |
|------|------|-----------------|
| `background` / `foreground` | 페이지 배경과 기본 텍스트 | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | 카드 컴포넌트 | `bg-card`, `text-card-foreground` |
| `primary` / `primary-foreground` | 주요 액션 버튼, 강조 | `bg-primary`, `text-primary-foreground` |
| `secondary` / `secondary-foreground` | 보조 액션 | `bg-secondary`, `text-secondary-foreground` |
| `muted` / `muted-foreground` | 비활성 영역, 보조 텍스트 | `bg-muted`, `text-muted-foreground` |
| `accent` / `accent-foreground` | 호버, 선택 강조 | `bg-accent`, `text-accent-foreground` |
| `destructive` / `destructive-foreground` | 삭제, 에러 | `bg-destructive`, `text-destructive`, `text-destructive-foreground` |
| `border` | 테두리 | `border-border` |
| `input` | 입력 필드 테두리 | `border-input` |
| `ring` | 포커스 링 | `ring-ring` |

### 커스텀 컬러 확장

- **규칙**: [SHOULD] 프로젝트 고유 컬러가 필요하면 동일한 CSS Variables 패턴으로 확장한다
- **이유**: 기존 시맨틱 컬러 패턴을 따르면 다크모드 지원이 자동으로 이루어지고, 팀원 간 일관된 방식으로 컬러를 관리할 수 있다.
- **좋은 예시**:

```css
/* globals.css에 커스텀 컬러 추가 */
:root {
  /* 기존 변수들... */
  --success: oklch(0.62 0.19 145);
  --success-foreground: oklch(0.985 0 0);
  --warning: oklch(0.75 0.18 85);
  --warning-foreground: oklch(0.145 0 0);
}

.dark {
  /* 기존 변수들... */
  --success: oklch(0.72 0.19 145);
  --success-foreground: oklch(0.145 0 0);
  --warning: oklch(0.85 0.18 85);
  --warning-foreground: oklch(0.145 0 0);
}
```

```css
/* @theme inline에 등록 */
@theme inline {
  /* 기존 매핑들... */
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

- **나쁜 예시**:

```typescript
// CSS Variables에 정의하지 않고 Tailwind 임의 값으로 직접 사용
<div className="bg-[#2e7d32] text-white dark:bg-[#4caf50]">
  성공 메시지
</div>
```

---

## 3. 스타일링 방법 우선순위

스타일을 적용할 때 아래 의사결정 흐름을 따른다.

| 질문 | 답변 | 방법 |
|------|------|------|
| shadcn/ui에 해당 컴포넌트가 있는가? | 예 | shadcn/ui 컴포넌트 사용 |
| 재사용 가능한 커스텀 컴포넌트인가? | 예 | `cva()` + `cn()`으로 변형 관리 |
| 일회성 스타일링인가? | 예 | Tailwind utility classes 직접 사용 |

### 1순위: shadcn/ui 컴포넌트

- **규칙**: [SHOULD] UI 구현 시 shadcn/ui에서 제공하는 컴포넌트를 우선 사용한다
- **이유**: shadcn/ui 컴포넌트는 Radix UI primitives 기반으로 접근성(WAI-ARIA)이 내장되어 있고, 키보드 내비게이션, 포커스 관리, 스크린 리더 지원이 기본 제공된다.
- **좋은 예시**:

```typescript
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ProductCard({ product }: ProductCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{product.description}</p>
        <Button className="mt-4">구매하기</Button>
      </CardContent>
    </Card>
  );
}
```

### 2순위: cva() + cn()으로 변형 관리

- **규칙**: [SHOULD] 재사용 가능한 커스텀 컴포넌트의 변형(variants)은 `class-variance-authority(cva)`로 관리한다
- **이유**: `cva()`는 컴포넌트의 변형을 타입 안전하게 정의할 수 있으며, 기본 스타일과 변형별 스타일을 선언적으로 관리할 수 있다.
- **좋은 예시**:

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// 사용
<Badge variant="destructive">에러</Badge>
<Badge variant="outline">대기중</Badge>
```

- **나쁜 예시**:

```typescript
// 조건부 클래스를 직접 나열 — 변형이 많아질수록 복잡해짐
function Badge({ variant, className }: BadgeProps) {
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold
        ${variant === "default" ? "bg-primary text-primary-foreground" : ""}
        ${variant === "destructive" ? "bg-destructive text-destructive-foreground" : ""}
        ${variant === "outline" ? "text-foreground" : ""}
        ${className}`}
    />
  );
}
```

### 3순위: Tailwind utility classes

- **규칙**: [MAY] 일회성 레이아웃/간격 조정에 Tailwind utility classes를 직접 사용한다
- **이유**: 별도 컴포넌트를 생성할 필요 없이 간단한 스타일을 인라인으로 적용할 수 있다. 시맨틱 토큰에 직접 접근하므로 디자인 시스템과의 일관성을 유지한다.
- **좋은 예시**:

```typescript
function PageHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}
```

- **나쁜 예시**:

```typescript
// 과도하게 많은 utility classes — cva()로 분리해야 함
function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md cursor-pointer relative overflow-hidden">
      {/* 이 수준의 스타일은 cva() 또는 shadcn Card 컴포넌트로 분리하는 것이 적절하다 */}
    </div>
  );
}
```

### shadcn/ui 컴포넌트 커스터마이징

- **규칙**: [SHOULD] shadcn/ui 컴포넌트의 기본 스타일을 변경해야 할 때는 `components/ui/` 내의 소스 파일을 직접 수정한다
- **이유**: shadcn/ui 컴포넌트는 프로젝트에 복사되어 로컬 소유된다. npm 패키지와 달리 업데이트 시 덮어씌워지지 않으므로, 소스 코드를 직접 수정하는 것이 의도된 사용 방법이다.
- **좋은 예시**:

```typescript
// components/ui/button.tsx — 프로젝트 전역 기본 스타일 수정
const buttonVariants = cva(
  // 프로젝트에 맞게 기본 스타일 수정 가능
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // 프로젝트 고유 변형 추가 가능
        success: "bg-success text-success-foreground hover:bg-success/90",
      },
      // ...
    },
  }
);
```

- **나쁜 예시**:

```typescript
// shadcn 컴포넌트를 래핑하여 스타일을 오버라이드 — 불필요한 추상화 계층
function CustomButton({ className, ...props }: ButtonProps) {
  return <Button className={cn("my-custom-styles", className)} {...props} />;
}
```

---

## 4. 반응형 디자인

### Tailwind Breakpoints 시스템 활용

- **규칙**: [MUST] 반응형 레이아웃에 Tailwind의 breakpoint 접두사(sm, md, lg, xl, 2xl)를 사용한다
- **이유**: Tailwind의 breakpoints는 일관된 중단점 값을 제공하며, mobile-first 접근법으로 설계되어 있다. 모바일 스타일을 기본으로 작성하고, 큰 화면에서 스타일을 추가하는 방식이다.

| Breakpoint | 최소 너비 | 적용 대상 |
|-----------|----------|-----------|
| (기본) | 0px | 모바일 |
| `sm` | 640px | 소형 태블릿 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 소형 데스크톱 |
| `xl` | 1280px | 데스크톱 |
| `2xl` | 1536px | 대형 데스크톱 |

### Mobile-first 접근

- **규칙**: [MUST] 스타일은 mobile-first로 작성한다. 기본 클래스에 모바일 스타일을 적용하고, `sm:`, `md:`, `lg:` 등 breakpoint 접두사로 큰 화면 스타일을 추가한다.
- **이유**: mobile-first 접근은 가장 작은 화면에서부터 점진적으로 레이아웃을 확장하므로, 모바일 사용자에게 불필요한 스타일이 로드되지 않고, CSS 규칙이 더 간결해진다.
- **좋은 예시**:

```typescript
function ResponsiveSection() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full md:max-w-3xl lg:max-w-5xl mx-auto">
      <h2 className="text-xl sm:text-2xl md:text-3xl text-center md:text-left font-bold">
        반응형 제목
      </h2>
    </div>
  );
}
```

- **나쁜 예시**:

```typescript
// desktop-first로 작성하여 max 접두사 남용
<div className="max-lg:p-4 max-md:p-2 p-8">
  <h2 className="max-md:text-xl max-sm:text-lg text-3xl">제목</h2>
</div>
```

### 반응형 그리드

- **규칙**: [SHOULD] 그리드 레이아웃에 Tailwind의 CSS Grid utility classes를 사용한다
- **이유**: CSS Grid는 2차원 레이아웃에 적합하며, Tailwind의 `grid-cols-*` 클래스와 breakpoint 접두사를 조합하면 간결하게 반응형 그리드를 구현할 수 있다.
- **좋은 예시**:

```typescript
function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### 미디어 쿼리 직접 작성 금지

- **규칙**: [MUST NOT] CSS 미디어 쿼리를 직접 작성하지 않는다. Tailwind breakpoint 접두사를 사용한다.
- **이유**: 하드코딩된 미디어 쿼리는 Tailwind에 정의된 breakpoint 값과 불일치할 수 있으며, 중단점 변경 시 모든 미디어 쿼리를 수동으로 수정해야 한다.
- **좋은 예시**:

```typescript
<div className="hidden md:block">데스크톱에서만 표시</div>
<div className="md:hidden">모바일에서만 표시</div>
```

- **나쁜 예시**:

```css
/* 매직 넘버로 미디어 쿼리 하드코딩 */
@media (min-width: 768px) {
  .desktop-only { display: block; }
}
```

---

## 5. 다크모드/라이트모드

### next-themes 설정

- **규칙**: [MUST] 다크모드는 `next-themes` 라이브러리와 class 기반 전환을 사용한다
- **이유**: `next-themes`는 시스템 설정 감지, localStorage 저장, SSR 호환 등을 자동 처리한다. class 기반 전환은 Tailwind의 `dark:` variant와 직접 연동되어 추가 설정 없이 동작한다.

```bash
npm install next-themes
```

```typescript
// components/theme-provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### dark: variant 사용

- **규칙**: [SHOULD] 시맨틱 컬러 토큰(`bg-background`, `text-foreground` 등)을 사용하면 `dark:` 접두사 없이도 자동으로 다크모드가 적용된다. 시맨틱 토큰으로 해결되지 않는 경우에만 `dark:` variant를 사용한다.
- **이유**: CSS Variables 기반 시맨틱 컬러는 `.dark` 클래스에 따라 자동으로 값이 전환된다. 대부분의 경우 `dark:` 접두사가 불필요하며, 이를 남용하면 코드가 불필요하게 길어진다.
- **좋은 예시**:

```typescript
// 시맨틱 토큰 사용 — dark: 접두사 불필요
<div className="bg-background text-foreground border-border">
  <p className="text-muted-foreground">보조 텍스트</p>
</div>

// 시맨틱 토큰으로 해결되지 않는 특수한 경우에만 dark: 사용
<div className="bg-white dark:bg-slate-900">
  <p className="text-gray-900 dark:text-gray-100">특수 스타일</p>
</div>
```

- **나쁜 예시**:

```typescript
// 시맨틱 토큰이 있는데 dark: variant를 중복 사용
<div className="bg-background dark:bg-background text-foreground dark:text-foreground">
  불필요한 dark: 접두사
</div>
```

### 테마 전환 컴포넌트

- **규칙**: [SHOULD] 테마 전환 UI는 `next-themes`의 `useTheme` 훅을 사용한다
- **이유**: `useTheme`은 현재 테마 상태와 전환 함수를 제공하며, 마운트 전 hydration 불일치를 방지하기 위해 `mounted` 체크가 필요하다.
- **좋은 예시**:

```typescript
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
    >
      {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
}
```

### 색상 하드코딩 금지

- **규칙**: [MUST] 색상은 항상 시맨틱 토큰(`bg-primary`, `text-foreground` 등)을 통해 참조한다. hex 값이나 Tailwind의 기본 palette를 직접 사용하지 않는다.
- **이유**: 하드코딩된 색상은 다크모드 전환 시 자동으로 변경되지 않아 UI가 깨진다. 시맨틱 토큰을 사용하면 모드별로 적절한 색상이 자동 적용된다.
- **좋은 예시**:

```typescript
<div className="bg-card text-card-foreground border-border">
  <p className="text-primary">테마 색상 사용</p>
</div>
```

- **나쁜 예시**:

```typescript
// 하드코딩된 색상 — 다크모드에서 깨짐
<div className="bg-white text-gray-900 border-gray-200">
  <p className="text-blue-600">하드코딩 색상</p>
</div>
```

---

## 6. 아이콘

### Lucide React 사용

- **규칙**: [SHOULD] 아이콘은 `lucide-react` 패키지를 사용한다
- **이유**: Lucide React는 shadcn/ui의 기본 아이콘 라이브러리이며, tree-shaking을 지원하여 사용하지 않는 아이콘은 번들에 포함되지 않는다. 1000개 이상의 일관된 디자인 아이콘을 제공한다.
- **좋은 예시**:

```typescript
import { Search, Plus, Trash2, ChevronRight } from "lucide-react";

<Search className="h-4 w-4" />
<Plus className="h-5 w-5 text-primary" />
```

### 아이콘 크기 규칙

- **규칙**: [SHOULD] 아이콘 크기는 Tailwind의 width/height 클래스로 지정하며, 컨텍스트에 맞는 일관된 크기를 사용한다
- **이유**: 일관된 크기 체계를 사용하면 UI 전체에서 아이콘이 균일하게 표시된다.

| 용도 | 클래스 | 크기 |
|------|--------|------|
| 인라인 텍스트 | `h-4 w-4` | 16px |
| 버튼 내부 | `h-4 w-4` 또는 `h-5 w-5` | 16px / 20px |
| 독립 아이콘 버튼 | `h-5 w-5` | 20px |
| 히어로/강조 | `h-6 w-6` 이상 | 24px+ |

### 아이콘 접근성

- **규칙**: [MUST] 아이콘에 `aria-label` 또는 `aria-hidden` 속성을 설정한다
- **이유**: 스크린 리더 사용자에게 아이콘의 의미를 전달하거나(기능 아이콘), 장식용 아이콘은 읽지 않도록 처리해야 접근성을 보장할 수 있다.
- **좋은 예시**:

```typescript
import { Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// 기능 아이콘 — 의미를 전달해야 함
<Button variant="ghost" size="icon" aria-label="삭제">
  <Trash2 className="h-4 w-4" />
</Button>

// 텍스트와 함께 사용되는 장식 아이콘 — 숨김 처리
<div className="flex items-center gap-2">
  <Star className="h-4 w-4" aria-hidden="true" />
  <span>즐겨찾기</span>
</div>
```

- **나쁜 예시**:

```typescript
// aria 속성 없이 아이콘만 사용 — 스크린 리더가 의미를 알 수 없음
<Button variant="ghost" size="icon">
  <Trash2 className="h-4 w-4" />
</Button>
```

---

## 7. 안티패턴

### 인라인 style 사용 금지

- **규칙**: [MUST NOT] 인라인 `style={{}}` 속성을 사용하지 않는다. Tailwind utility classes를 사용한다.
- **이유**: 인라인 style은 Tailwind의 디자인 시스템과 분리되고, 반응형 값과 다크모드 `dark:` variant를 지원하지 않으며, 의사 클래스(`:hover`, `:focus`)를 사용할 수 없다.
- **좋은 예시**:

```typescript
<div className="flex gap-4 p-6 bg-card">
  <h2 className="text-xl font-semibold text-foreground">제목</h2>
</div>
```

- **나쁜 예시**:

```typescript
<div style={{ display: "flex", gap: "16px", padding: "24px", backgroundColor: "#ffffff" }}>
  <span style={{ fontSize: "20px", fontWeight: 600, color: "#212121" }}>제목</span>
</div>
```

### !important 사용 금지

- **규칙**: [MUST NOT] `!important`를 사용하지 않는다. `cn()`으로 클래스 우선순위를 관리한다.
- **이유**: `!important`는 CSS 우선순위 체계를 무력화하여 스타일 디버깅을 극도로 어렵게 만든다. `cn()`의 `tailwind-merge`가 클래스 충돌을 자동으로 해결하므로 `!important`가 불필요하다.

### 매직 px 값 하드코딩 금지

- **규칙**: [MUST NOT] 매직 넘버 px 값을 하드코딩하지 않는다. Tailwind의 spacing scale을 사용한다.
- **이유**: 하드코딩된 px 값은 디자인 시스템의 spacing 단위와 불일치할 수 있으며, 전체 간격 체계를 변경할 때 모든 하드코딩 값을 수동으로 찾아 수정해야 한다.
- **좋은 예시**:

```typescript
// Tailwind spacing scale 사용
<div className="p-4 mt-6 gap-2"> {/* 16px, 24px, 8px */}
  <p>내용</p>
</div>
```

- **나쁜 예시**:

```typescript
// Tailwind 임의 값으로 매직 넘버 사용
<div className="p-[17px] mt-[23px] gap-[7px]">
  <p>내용</p>
</div>
```

### 테마에 없는 색상 직접 사용 금지

- **규칙**: [MUST NOT] CSS Variables에 정의되지 않은 색상을 직접 사용하지 않는다. 필요한 색상은 globals.css에 정의한 후 사용한다.
- **이유**: 테마 외부의 색상은 다크모드 전환 시 자동으로 변경되지 않아 UI 불일치가 발생한다.
- **좋은 예시**:

```typescript
// 시맨틱 토큰 사용
<span className="text-destructive">에러 메시지</span>
<div className="bg-muted p-4 rounded-md">안내 영역</div>
```

- **나쁜 예시**:

```typescript
// Tailwind 기본 palette를 직접 사용 — 다크모드에서 깨짐
<span className="text-red-600">에러 메시지</span>
<div className="bg-gray-100 p-4 rounded-md">안내 영역</div>
```

### className 문자열 수동 결합 금지

- **규칙**: [MUST NOT] 템플릿 리터럴이나 문자열 연결로 className을 결합하지 않는다. `cn()`을 사용한다.
- **이유**: 문자열 결합은 Tailwind 클래스 간 충돌을 해결하지 못하고, 조건부 클래스에서 `undefined`나 `false`가 문자열로 포함될 수 있다.
- **좋은 예시**:

```typescript
<div className={cn("p-4 rounded-lg", isActive && "bg-accent", className)} />
```

- **나쁜 예시**:

```typescript
<div className={`p-4 rounded-lg ${isActive ? "bg-accent" : ""} ${className}`} />
```

---

## 8. 참고 자료

- [shadcn/ui 공식 문서](https://ui.shadcn.com)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Class Variance Authority (cva)](https://cva.style/docs)
- [next-themes](https://github.com/pacocoursey/next-themes)
- [Lucide Icons](https://lucide.dev)
- [Tailwind Merge](https://github.com/dcastil/tailwind-merge)
