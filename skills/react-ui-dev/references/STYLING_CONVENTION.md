# 스타일링 컨벤션

> 이 문서는 `@sellernote/design-system` + Tailwind CSS v4 기반 스타일링과 디자인 토큰 규칙을 정의합니다.
> 상위 규칙: [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)

---

## 1. @sellernote/design-system 설정

### 패키지 설치

- **규칙**: [MUST] `@sellernote/design-system` 패키지를 설치하고 프로젝트에 연동한다
- **이유**: DS는 Radix UI + Tailwind CSS v4 + CVA 기반 사내 디자인 시스템으로, 40+ 컴포넌트, 166+ 아이콘, 자체 디자인 토큰을 제공한다. npm 패키지로 관리되어 일관된 UI를 보장한다.

**.npmrc 설정 (GitHub Packages 인증):**

```ini
@sellernote:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

**설치:**

```bash
pnpm add @sellernote/design-system
```

### Tailwind 연동

- **규칙**: [MUST] DS의 Tailwind preset을 프로젝트 Tailwind 설정에 적용한다
- **이유**: DS의 디자인 토큰(색상, 타이포그래피, 스페이싱 등)이 Tailwind 클래스로 자동 변환된다.

```javascript
// tailwind.config.js
import designSystemPreset from '@sellernote/design-system/tailwind.preset.js';

export default {
  presets: [designSystemPreset],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@sellernote/design-system/dist/**/*.js',
  ],
};
```

### 스타일 Import

- **규칙**: [MUST] 글로벌 CSS 파일에서 Tailwind와 DS 스타일을 아래 순서로 import한다
- **이유**: DS 스타일은 CSS Variables(디자인 토큰), Pretendard 폰트, 베이스 스타일을 포함한다. Tailwind 다음에 import해야 토큰이 올바르게 적용된다.

```css
/* app/globals.css */
@import 'tailwindcss';
@config '../tailwind.config.js';
@import '@sellernote/design-system/styles';
```

> **참고**: `@sellernote/design-system/styles`에 Pretendard 폰트가 포함되어 있으므로 별도의 `next/font` 설정이 불필요하다.

### cn() 유틸리티 함수

- **규칙**: [MUST] 조건부 className 결합에 DS에서 제공하는 `cn()` 함수를 사용한다
- **이유**: DS의 `cn()`은 `clsx` + `tailwind-merge`를 결합한 함수로, DS 토큰의 타이포그래피 prefix까지 지원하는 커스텀 설정이 적용되어 있다.
- **좋은 예시**:

```typescript
import { cn } from "@sellernote/design-system";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

function Card({ className, children }: CardProps) {
  return (
    <div className={cn("rounded-200 bg-surface-1 p-600 shadow-normal", className)}>
      {children}
    </div>
  );
}

// 사용: 기본 스타일을 유지하면서 외부에서 커스터마이징 가능
<Card className="p-400"> {/* p-600이 p-400으로 올바르게 오버라이드됨 */}
  <p>내용</p>
</Card>
```

- **나쁜 예시**:

```typescript
// cn() 없이 템플릿 리터럴로 직접 결합 — Tailwind 클래스 충돌 미해결
function Card({ className, children }: CardProps) {
  return (
    <div className={`rounded-200 bg-surface-1 p-600 shadow-normal ${className}`}>
      {children}
    </div>
  );
}
```

---

## 2. 디자인 토큰

> 모든 토큰은 Tailwind 클래스로 사용한다. 소스: `@sellernote/design-system`의 `assets/token.json` → `tailwind.preset.js`

### 컬러 시스템

- **규칙**: [MUST] 색상은 DS의 시스템 컬러 토큰을 통해 참조한다. hex 값이나 Tailwind 기본 palette를 직접 사용하지 않는다.
- **이유**: DS 토큰은 용도별로 정의되어 있어 UI 일관성을 보장하고, 향후 다크모드 확장 시 자동 대응할 수 있다.

#### 배경 (bg)

| 토큰 | Tailwind 클래스 | 값      | 용도             |
|------|----------------|---------|------------------|
| bg-1 | `bg-bg-1`      | #ffffff | 기본 페이지 배경 |
| bg-2 | `bg-bg-2`      | #f6f7f8 | 보조 배경        |
| bg-3 | `bg-bg-3`      | #1f2328 | 다크 배경        |

#### 서피스 (surface)

| 토큰      | Tailwind 클래스 | 값      | 용도                       |
|-----------|----------------|---------|----------------------------|
| surface-1 | `bg-surface-1` | #ffffff | 카드, 패널 기본            |
| surface-2 | `bg-surface-2` | #f6f7f8 | disabled 배경, 보조 서피스 |
| surface-3 | `bg-surface-3` | #e8eaed | hover 상태, 선택된 항목    |
| surface-4 | `bg-surface-4` | #ccd0d7 | 강조 배경                  |
| surface-5 | `bg-surface-5` | #48505b | 다크 서피스                |
| surface-6 | `bg-surface-6` | #1f2328 | 가장 어두운 서피스         |

#### 텍스트 (text)

| 토큰   | Tailwind 클래스 | 값      | 용도                       |
|--------|----------------|---------|----------------------------|
| text-1 | `text-text-1`  | #1f2328 | 기본 텍스트 (제목, 입력값) |
| text-2 | `text-text-2`  | #48505b | 보조 텍스트 (목록 아이템)  |
| text-3 | `text-text-3`  | #768293 | 플레이스홀더, 레이블       |
| text-4 | `text-text-4`  | #afb6c0 | disabled 텍스트            |
| text-5 | `text-text-5`  | #ffffff | 흰색 텍스트 (어두운 배경)  |

#### 라인 (line) — 구분선

| 토큰   | Tailwind 클래스   | 값      | 용도              |
|--------|------------------|---------|-------------------|
| line-1 | `border-line-1`  | #ffffff | 흰색 구분선       |
| line-2 | `border-line-2`  | #e8eaed | 기본 구분선       |
| line-3 | `border-line-3`  | #ccd0d7 | 중간 강조 구분선  |
| line-4 | `border-line-4`  | #363c45 | 어두운 구분선     |
| line-5 | `border-line-5`  | #1f2328 | 최어두운 구분선   |

#### 보더 (border) — 입력 테두리

| 토큰     | Tailwind 클래스    | 값      | 용도                |
|----------|--------------------|---------|---------------------|
| border-1 | `border-border-1`  | #ffffff | 흰색 테두리         |
| border-2 | `border-border-2`  | #e8eaed | disabled 상태 테두리|
| border-3 | `border-border-3`  | #ccd0d7 | 기본 resting 테두리 |

#### 아이콘 (icon)

| 토큰   | Tailwind 클래스 | 값      | 용도                      |
|--------|----------------|---------|---------------------------|
| icon-1 | `text-icon-1`  | #000000 | 기본 아이콘               |
| icon-2 | `text-icon-2`  | #48505b | 보조 아이콘               |
| icon-3 | `text-icon-3`  | #8d97a5 | placeholder/subtle 아이콘 |
| icon-4 | `text-icon-4`  | #ccd0d7 | disabled 아이콘           |
| icon-5 | `text-icon-5`  | #ffffff | 흰색 아이콘               |

#### 브랜드 (brand)

| 토큰      | Tailwind 클래스                  | 용도               |
|-----------|----------------------------------|--------------------|
| brand-1~3 | `bg-brand-1` ~ `bg-brand-3`     | 연파랑 계열        |
| brand-4   | `bg-brand-4` / `text-brand-4`   | 주 브랜드 컬러 (#1d67cd) |
| brand-5~7 | `bg-brand-5` ~ `bg-brand-7`     | 진파랑 계열        |

#### 톤 컬러 (tone) — 상태 표현

각 컬러(red / yellow / green / cyan / blue / purple)에 1~5 단계. 1~2는 배경용(연함), 3은 기본 텍스트/아이콘용, 4~5는 강조/hover용(진함).

```
tone-red-1~5, tone-yellow-1~5, tone-green-1~5
tone-cyan-1~5, tone-blue-1~5, tone-purple-1~5
```

- **좋은 예시**:

```typescript
// 에러 상태 표시
<div className="bg-tone-red-1 border border-tone-red-3 text-tone-red-3 rounded-100 p-400">
  에러 메시지
</div>

// 성공 상태 표시
<div className="bg-tone-green-1 border border-tone-green-3 text-tone-green-3 rounded-100 p-400">
  성공 메시지
</div>
```

- **나쁜 예시**:

```typescript
// hex 값 하드코딩 — 토큰 변경 시 수동 수정 필요
<div className="bg-[#fef2f2] border border-[#ef4444] text-[#ef4444] rounded p-4">
  에러 메시지
</div>
```

### 타이포그래피

- **규칙**: [MUST] 텍스트 스타일은 DS의 타이포그래피 토큰 클래스(`text-{name}`)를 사용한다. font-size, line-height, font-weight가 묶음으로 적용된다.
- **이유**: 타이포그래피 토큰은 font-size + line-height + font-weight를 하나의 클래스로 관리하여 일관된 텍스트 스타일을 보장한다.

| Tailwind 클래스     | 크기 | 줄높이 | 굵기 | 용도                             |
|---------------------|------|--------|------|----------------------------------|
| `text-display-lg`   | 56px | 72px   | 700  | 대형 디스플레이                  |
| `text-display-md`   | 40px | 52px   | 700  | 중형 디스플레이                  |
| `text-heading-lg`   | 32px | 40px   | 600  | 페이지 제목                      |
| `text-heading-md`   | 24px | 32px   | 600  | 섹션 제목                        |
| `text-heading-sm`   | 20px | 28px   | 600  | 소제목                           |
| `text-heading-xs`   | 18px | 26px   | 600  | 소소제목                         |
| `text-subtitle-xl`  | 18px | 28px   | 500  | 강조 본문 대                     |
| `text-subtitle-lg`  | 16px | 24px   | 500  | 강조 본문 중                     |
| `text-subtitle-md`  | 14px | 20px   | 500  | UI 기본 텍스트 (레이블, 옵션 등) |
| `text-subtitle-sm`  | 12px | 16px   | 500  | 작은 강조                        |
| `text-body-lg`      | 16px | 26px   | 400  | 본문 대                          |
| `text-body-md`      | 14px | 22px   | 400  | 일반 본문 (입력값 등)            |
| `text-body-sm`      | 12px | 18px   | 400  | 작은 본문                        |
| `text-caption-md`   | 12px | 16px   | 400  | 캡션                             |
| `text-caption-sm`   | 10px | 14px   | 400  | 작은 캡션                        |

> 컴포넌트에서 가장 자주 쓰이는 클래스: `text-subtitle-md`(UI 요소), `text-body-md`(입력값)

- **좋은 예시**:

```typescript
<h1 className="text-heading-lg text-text-1">페이지 제목</h1>
<p className="text-body-md text-text-2">본문 내용</p>
<span className="text-caption-md text-text-3">보조 정보</span>
```

- **나쁜 예시**:

```typescript
// Tailwind 기본 텍스트 유틸리티 직접 사용 — DS 토큰과 불일치
<h1 className="text-3xl font-bold text-gray-900">페이지 제목</h1>
<p className="text-sm text-gray-600">본문 내용</p>
```

### 스페이싱

- **규칙**: [MUST] 간격(padding, margin, gap 등)은 DS 스페이싱 토큰을 사용한다.
- **이유**: DS 스페이싱 스케일은 일관된 간격 체계를 제공하여 UI 정렬이 자연스럽다.

| 토큰 | Tailwind 클래스       | 값   |
|------|-----------------------|------|
| 50   | `p-50` / `gap-50`    | 2px  |
| 100  | `p-100` / `gap-100`  | 4px  |
| 200  | `p-200` / `gap-200`  | 8px  |
| 300  | `p-300` / `gap-300`  | 12px |
| 400  | `p-400` / `gap-400`  | 16px |
| 500  | `p-500` / `gap-500`  | 20px |
| 600  | `p-600` / `gap-600`  | 24px |
| 800  | `p-800` / `gap-800`  | 32px |
| 1000 | `p-1000`             | 40px |
| 1200 | `p-1200`             | 48px |
| 1600 | `p-1600`             | 64px |
| 2000 | `p-2000`             | 80px |

- **좋은 예시**:

```typescript
<div className="p-600 flex flex-col gap-400">
  <h2 className="text-heading-sm text-text-1">섹션 제목</h2>
  <p className="text-body-md text-text-2">내용</p>
</div>
```

- **나쁜 예시**:

```typescript
// Tailwind 임의 값으로 매직 넘버 사용
<div className="p-[23px] flex flex-col gap-[15px]">
  <h2>섹션 제목</h2>
</div>
```

### 보더 반경

| 토큰 | Tailwind 클래스  | 값    | 용도                         |
|------|------------------|-------|------------------------------|
| 50   | `rounded-50`     | 2px   | 최소                         |
| 100  | `rounded-100`    | 4px   | 일반 요소 (버튼, 입력, 카드) |
| 200  | `rounded-200`    | 8px   | 패널, 드롭다운               |
| 300  | `rounded-300`    | 12px  | 대형 카드                    |
| 400  | `rounded-400`    | 16px  | 모달                         |
| full | `rounded-full`   | 999px | 알약형, 원형                 |

### 그림자

| Tailwind 클래스      | 용도             |
|----------------------|------------------|
| `shadow-normal`      | 카드 기본        |
| `shadow-emphasize`   | 드롭다운, 팝오버 |
| `shadow-strong`      | 다이얼로그       |
| `shadow-heavy`       | 강조 레이어      |

### Z-Index

| Tailwind 클래스    | 용도                     |
|--------------------|--------------------------|
| `z-tooltip`        | Tooltip                  |
| `z-popover`        | Popover                  |
| `z-toast`          | Toast                    |
| `z-snackbar`       | Snackbar                 |
| `z-alertdialog`    | AlertDialog              |
| `z-panel`          | Select/Combobox 드롭다운 |
| `z-dropdownmenu`   | DropdownMenu             |
| `z-dialog`         | Dialog                   |
| `z-overlay`        | 오버레이 (딤)            |
| `z-drawer`         | Drawer                   |
| `z-sticky`         | Sticky 요소              |
| `z-base`           | 기본                     |

> **참고**: DS 컴포넌트(Dialog, Toast 등)는 올바른 z-index가 내장되어 있어 수동 지정이 불필요하다. 커스텀 레이어를 만들 때만 이 토큰을 사용한다.

### 애니메이션

| Tailwind 클래스             | 용도           |
|-----------------------------|----------------|
| `animate-fly-down`          | 드롭다운 open  |
| `animate-fly-down-out`      | 드롭다운 close |
| `animate-fly-up`            | Dialog open    |
| `animate-fly-up-out`        | Dialog close   |
| `animate-slide-down`        | Toast 등장     |
| `animate-slide-up`          | Toast 퇴장     |
| `animate-slide-in-right`    | Snackbar 등장  |
| `animate-slide-out-right`   | Snackbar 퇴장  |
| `animate-slide-in-left`     | Drawer open    |
| `animate-slide-out-left`    | Drawer close   |
| `animate-fade-in`           | 페이드 인      |
| `animate-fade-out`          | 페이드 아웃    |

> 모든 애니메이션 duration: 150ms, easing: ease. DS 컴포넌트에 내장되어 있으므로 수동 적용은 커스텀 애니메이션에만 사용한다.

### 커스텀 토큰 확장

- **규칙**: [SHOULD] 프로젝트 고유 토큰이 필요하면 Tailwind config의 `theme.extend`로 확장한다
- **이유**: DS preset 위에 확장하면 기존 토큰과 자연스럽게 통합되고, 프로젝트별 요구사항에 대응할 수 있다.
- **좋은 예시**:

```javascript
// tailwind.config.js
import designSystemPreset from '@sellernote/design-system/tailwind.preset.js';

export default {
  presets: [designSystemPreset],
  content: ['./src/**/*.{ts,tsx}', './node_modules/@sellernote/design-system/dist/**/*.js'],
  theme: {
    extend: {
      colors: {
        'custom-highlight': '#ff6b35',
      },
    },
  },
};
```

- **나쁜 예시**:

```typescript
// Tailwind 임의 값으로 직접 사용 — 토큰 시스템 우회
<div className="bg-[#ff6b35] text-white">
  커스텀 강조 영역
</div>
```

---

## 3. 스타일링 방법 우선순위

스타일을 적용할 때 아래 의사결정 흐름을 따른다.

| 질문 | 답변 | 방법 |
|------|------|------|
| DS에 해당 컴포넌트가 있는가? | 예 | `@sellernote/design-system` 컴포넌트 사용 |
| 재사용 가능한 커스텀 컴포넌트인가? | 예 | `cva()` + `cn()`으로 변형 관리 |
| 일회성 스타일링인가? | 예 | Tailwind utility classes + DS 토큰 사용 |

### 1순위: DS 컴포넌트

- **규칙**: [MUST] UI 구현 시 `@sellernote/design-system`에서 제공하는 컴포넌트를 우선 사용한다
- **이유**: DS 컴포넌트는 Radix UI 기반으로 접근성(WAI-ARIA)이 내장되어 있고, 키보드 내비게이션, 포커스 관리, 스크린 리더 지원이 기본 제공된다. 또한 DS 디자인 토큰과 일관된 스타일이 적용되어 있다.
- **좋은 예시**:

```typescript
import {
  ActionButton,
  TextField,
  Select,
  Dialog,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableBodyCell,
  Tag,
} from "@sellernote/design-system";

function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="rounded-200 bg-surface-1 p-600 shadow-normal">
      <h3 className="text-heading-sm text-text-1">{product.name}</h3>
      <p className="mt-200 text-body-md text-text-2">{product.description}</p>
      <Tag color="green" className="mt-200">{product.status}</Tag>
      <ActionButton className="mt-400">구매하기</ActionButton>
    </div>
  );
}
```

#### DS 컴포넌트 카테고리

| 카테고리 | 컴포넌트 |
|----------|----------|
| 버튼 | `ActionButton`, `IconButton`, `TextButton` |
| 입력 | `TextField`, `Textarea`, `PasswordField`, `SearchField`, `NumberField`, `Checkbox`, `CheckboxGroup`, `RadioButton`, `RadioGroup`, `Switch`, `Slider`, `Select`, `Combobox`, `ToggleGroup` |
| 데이터 표시 | `Avatar`, `Badge`, `Tag`, `Empty`, `Image`, `Label`, `Steps`, `Table`, `ScrollArea` |
| 피드백 | `Alert`, `Toast` (`addToast()`), `Snackbar` (`addSnackbar()`) |
| 오버레이 | `Dialog`, `AlertDialog` (`showAlertDialog()`), `Drawer`, `Tooltip`, `Popover`, `DropdownMenu` |
| 내비게이션 | `Sidebar`, `SidebarMenuItem`, `Tabs`, `TabContent`, `Header`, `Menubar`, `Pagination` |
| 로딩 | `Spinner`, `Progress` |
| 기초 | `Icon` |

### 2순위: cva() + cn()으로 변형 관리

- **규칙**: [SHOULD] DS에 없는 재사용 가능한 커스텀 컴포넌트의 변형(variants)은 `class-variance-authority(cva)`로 관리한다
- **이유**: `cva()`는 컴포넌트의 변형을 타입 안전하게 정의할 수 있으며, DS 토큰을 활용한 변형을 선언적으로 관리할 수 있다.
- **좋은 예시**:

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@sellernote/design-system";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-200 py-50 text-caption-md",
  {
    variants: {
      status: {
        active: "bg-tone-green-1 text-tone-green-3",
        pending: "bg-tone-yellow-1 text-tone-yellow-3",
        error: "bg-tone-red-1 text-tone-red-3",
      },
    },
    defaultVariants: {
      status: "active",
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

function StatusBadge({ className, status, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props} />
  );
}
```

### 3순위: Tailwind utility classes

- **규칙**: [MAY] 일회성 레이아웃/간격 조정에 Tailwind utility classes를 DS 토큰과 함께 사용한다
- **좋은 예시**:

```typescript
function PageHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-400 mb-600">
      <h1 className="text-heading-lg text-text-1">{title}</h1>
    </div>
  );
}
```

### DS 컴포넌트 커스터마이징

- **규칙**: [MUST NOT] DS 컴포넌트의 소스를 프로젝트에 복사하여 수정하지 않는다. `className` prop과 variant props로 커스터마이징한다.
- **이유**: DS는 npm 패키지로 관리된다. 소스를 복사하면 업데이트를 받을 수 없고, DS와의 일관성이 깨진다. 새로운 변형이나 기능이 필요하면 DS 저장소에 기여한다.
- **좋은 예시**:

```typescript
// className prop으로 추가 스타일 적용
<ActionButton className="w-full">전체 너비 버튼</ActionButton>

// variant props 활용
<ActionButton variant="destructive" size="sm">삭제</ActionButton>
```

- **나쁜 예시**:

```typescript
// DS 컴포넌트를 래핑하여 스타일을 오버라이드 — 불필요한 추상화 계층
function CustomButton({ className, ...props }: ActionButtonProps) {
  return <ActionButton className={cn("my-custom-styles", className)} {...props} />;
}
```

---

## 4. 반응형 디자인

### Tailwind Breakpoints 시스템 활용

- **규칙**: [MUST] 반응형 레이아웃에 Tailwind의 breakpoint 접두사를 사용한다
- **이유**: DS preset이 제공하는 breakpoints는 일관된 중단점 값을 제공하며, mobile-first 접근법으로 설계되어 있다.

| Breakpoint | 최소 너비 | 적용 대상 |
|-----------|----------|-----------|
| (기본) | 0px | 모바일 |
| `xs` | 360px | 모바일 |
| `sm` | 768px | 태블릿 / 모바일·데스크톱 분기점 |
| `md` | 1024px | 데스크톱 |
| `lg` | 1440px | 와이드 |

### Mobile-first 접근

- **규칙**: [MUST] 스타일은 mobile-first로 작성한다. 기본 클래스에 모바일 스타일을 적용하고, `sm:`, `md:`, `lg:` 등 breakpoint 접두사로 큰 화면 스타일을 추가한다.
- **이유**: mobile-first 접근은 가장 작은 화면에서부터 점진적으로 레이아웃을 확장하므로, 모바일 사용자에게 불필요한 스타일이 로드되지 않고, CSS 규칙이 더 간결해진다.
- **좋은 예시**:

```typescript
function ResponsiveSection() {
  return (
    <div className="p-400 md:p-600 lg:p-800 max-w-full md:max-w-3xl lg:max-w-5xl mx-auto">
      <h2 className="text-heading-sm sm:text-heading-md md:text-heading-lg text-center md:text-left">
        반응형 제목
      </h2>
    </div>
  );
}
```

- **나쁜 예시**:

```typescript
// desktop-first로 작성하여 max 접두사 남용
<div className="max-lg:p-400 max-md:p-200 p-800">
  <h2 className="max-md:text-heading-sm max-sm:text-body-lg text-heading-lg">제목</h2>
</div>
```

### 반응형 그리드

- **규칙**: [SHOULD] 그리드 레이아웃에 Tailwind의 CSS Grid utility classes를 사용한다
- **좋은 예시**:

```typescript
function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-400 md:gap-600">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### 미디어 쿼리 직접 작성 금지

- **규칙**: [MUST NOT] CSS 미디어 쿼리를 직접 작성하지 않는다. Tailwind breakpoint 접두사를 사용한다.
- **이유**: 하드코딩된 미디어 쿼리는 DS breakpoint 값과 불일치할 수 있으며, 중단점 변경 시 모든 미디어 쿼리를 수동으로 수정해야 한다.
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
pnpm add next-themes
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

### DS 토큰 사용

- **규칙**: [SHOULD] DS 시스템 컬러 토큰을 사용하면 향후 다크모드 확장 시 자동으로 전환된다. 하드코딩된 색상 대신 토큰을 사용한다.
- **좋은 예시**:

```typescript
// DS 토큰 사용 — 향후 다크모드 지원 시 자동 전환
<div className="bg-bg-1 text-text-1 border-border-3">
  <p className="text-text-3">보조 텍스트</p>
</div>
```

- **나쁜 예시**:

```typescript
// 하드코딩된 색상 — 다크모드에서 깨짐
<div className="bg-white text-gray-900 border-gray-200">
  <p className="text-gray-500">보조 텍스트</p>
</div>
```

### 색상 하드코딩 금지

- **규칙**: [MUST] 색상은 항상 DS 시스템 컬러 토큰을 통해 참조한다. hex 값이나 Tailwind의 기본 palette를 직접 사용하지 않는다.
- **이유**: 하드코딩된 색상은 다크모드 전환 시 자동으로 변경되지 않아 UI가 깨진다. DS 토큰을 사용하면 모드별로 적절한 색상이 자동 적용된다.
- **좋은 예시**:

```typescript
<span className="text-tone-red-3">에러 메시지</span>
<div className="bg-surface-3 p-400 rounded-100">안내 영역</div>
```

- **나쁜 예시**:

```typescript
// Tailwind 기본 palette를 직접 사용 — 다크모드에서 깨짐
<span className="text-red-600">에러 메시지</span>
<div className="bg-gray-100 p-4 rounded">안내 영역</div>
```

---

## 6. 아이콘

### DS Icon 컴포넌트 사용

- **규칙**: [MUST] 아이콘은 `@sellernote/design-system`의 `Icon` 컴포넌트를 사용한다
- **이유**: DS Icon은 SVG 스프라이트 기반으로 166+ 아이콘을 제공하며, `currentColor`를 사용하여 부모의 텍스트 색상을 상속받는다. 국기 아이콘도 지원한다.
- **좋은 예시**:

```typescript
import { Icon } from "@sellernote/design-system";

// SVG 아이콘
<Icon name="icon-utility-check" size={16} />
<Icon name="icon-common-bell-fill" size={20} />
<Icon name="icon-status-checkcircle" size={24} />

// 국기 아이콘
<Icon name="icon-flag-kr" size={24} />
<Icon name="icon-flag-us" size={24} />
```

- **나쁜 예시**:

```typescript
// 외부 아이콘 라이브러리 직접 사용 — DS 아이콘과 스타일 불일치
import { Search, Plus } from "lucide-react";
<Search className="h-4 w-4" />
```

### 아이콘 네이밍 규칙

아이콘 이름은 `icon-{카테고리}-{이름}` 패턴을 따른다:

| 카테고리 | 접두사 | 예시 | 용도 |
|----------|--------|------|------|
| common | `icon-common-` | `icon-common-bell`, `icon-common-person` | 일반 UI 아이콘 |
| utility | `icon-utility-` | `icon-utility-check`, `icon-utility-plus` | 유틸리티 아이콘 |
| status | `icon-status-` | `icon-status-checkcircle`, `icon-status-xcircle` | 상태 표시 |
| menu | `icon-menu-` | `icon-menu-home`, `icon-menu-order` | 내비게이션 메뉴 |
| file | `icon-file-` | `icon-file-pdf`, `icon-file-xlsx` | 파일 타입 |
| emptydata | `icon-emptydata-` | `icon-emptydata-search`, `icon-emptydata-folder` | 빈 상태 일러스트 |
| flag | `icon-flag-` | `icon-flag-kr`, `icon-flag-us` | 국기 |

### 아이콘 크기 규칙

- **규칙**: [SHOULD] 아이콘 크기는 `size` prop으로 px 단위로 지정한다

| 용도 | size | 크기 |
|------|------|------|
| 인라인 텍스트 | `16` | 16px |
| 버튼 내부 | `16` 또는 `20` | 16px / 20px |
| 독립 아이콘 버튼 | `20` | 20px |
| 히어로/강조 | `24` 이상 | 24px+ |

### 아이콘 접근성

- **규칙**: [MUST] 아이콘만 있는 버튼에는 `aria-label`을 설정한다
- **이유**: 스크린 리더 사용자에게 아이콘의 의미를 전달해야 한다.
- **좋은 예시**:

```typescript
import { IconButton, Icon } from "@sellernote/design-system";

// 아이콘 버튼 — DS IconButton 사용
<IconButton icon="icon-utility-trash" aria-label="삭제" />

// 텍스트와 함께 사용되는 장식 아이콘
<div className="flex items-center gap-200">
  <Icon name="icon-common-star-fill" size={16} aria-hidden="true" />
  <span>즐겨찾기</span>
</div>
```

- **나쁜 예시**:

```typescript
// aria 속성 없이 아이콘만 사용 — 스크린 리더가 의미를 알 수 없음
<IconButton icon="icon-utility-trash" />
```

### 새 아이콘 추가

프로젝트에 필요한 아이콘이 DS에 없는 경우:

1. DS 저장소의 `assets/icons/origin/` 디렉토리에 SVG 파일을 추가한다
2. 파일명은 `icon-{카테고리}-{이름}.svg` 패턴을 따른다
3. `pnpm icon-gen` 명령으로 스프라이트를 재생성한다
4. DS 저장소에 PR을 생성한다

---

## 7. 안티패턴

### 인라인 style 사용 금지

- **규칙**: [MUST NOT] 인라인 `style={{}}` 속성을 사용하지 않는다. Tailwind utility classes를 사용한다.
- **이유**: 인라인 style은 DS 토큰과 분리되고, 반응형 값과 다크모드를 지원하지 않으며, 의사 클래스(`:hover`, `:focus`)를 사용할 수 없다.
- **좋은 예시**:

```typescript
<div className="flex gap-400 p-600 bg-surface-1">
  <h2 className="text-heading-sm text-text-1">제목</h2>
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

- **규칙**: [MUST NOT] 매직 넘버 px 값을 하드코딩하지 않는다. DS 스페이싱 토큰을 사용한다.
- **이유**: 하드코딩된 px 값은 DS 스페이싱 스케일과 불일치할 수 있으며, 전체 간격 체계를 변경할 때 모든 하드코딩 값을 수동으로 찾아 수정해야 한다.
- **좋은 예시**:

```typescript
// DS 스페이싱 토큰 사용
<div className="p-400 mt-600 gap-200">
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

### DS 컴포넌트 로컬 복사 금지

- **규칙**: [MUST NOT] `@sellernote/design-system` 컴포넌트의 소스를 프로젝트에 복사하여 수정하지 않는다
- **이유**: DS는 npm 패키지로 버전 관리된다. 로컬 복사는 업데이트를 차단하고 DS와의 일관성을 깨뜨린다. 새로운 기능이나 변형이 필요하면 DS 저장소에 기여한다.

### className 문자열 수동 결합 금지

- **규칙**: [MUST NOT] 템플릿 리터럴이나 문자열 연결로 className을 결합하지 않는다. `cn()`을 사용한다.
- **이유**: 문자열 결합은 Tailwind 클래스 간 충돌을 해결하지 못하고, 조건부 클래스에서 `undefined`나 `false`가 문자열로 포함될 수 있다.
- **좋은 예시**:

```typescript
import { cn } from "@sellernote/design-system";
<div className={cn("p-400 rounded-100", isActive && "bg-surface-3", className)} />
```

- **나쁜 예시**:

```typescript
<div className={`p-400 rounded-100 ${isActive ? "bg-surface-3" : ""} ${className}`} />
```

---

## 8. 참고 자료

- [@sellernote/design-system 저장소](https://github.com/sellernote/sellernote-design-system)
- [Tailwind CSS v4 공식 문서](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Class Variance Authority (cva)](https://cva.style/docs)
- [next-themes](https://github.com/pacocoursey/next-themes)
- [Tailwind Merge](https://github.com/dcastil/tailwind-merge)
