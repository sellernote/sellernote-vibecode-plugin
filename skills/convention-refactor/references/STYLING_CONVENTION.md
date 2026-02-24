# 스타일링 컨벤션

> 이 문서는 MUI 기반 스타일링과 디자인 시스템 규칙을 정의합니다.
> 상위 규칙: [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)

---

## 1. MUI + Next.js 15 설정

### AppRouterCacheProvider 사용

- **규칙**: [MUST] `@mui/material-nextjs/v15-appRouter`의 `AppRouterCacheProvider`를 사용한다
- **이유**: Next.js App Router 환경에서 Emotion 스타일이 SSR 시 올바르게 삽입되려면 전용 캐시 프로바이더가 필요하다. 이를 사용하지 않으면 서버에서 렌더링된 HTML과 클라이언트 스타일이 불일치하여 FOUC(Flash of Unstyled Content)가 발생한다.

### CSS Variables 활성화

- **규칙**: [MUST] `createTheme`에 `cssVariables: true` 옵션을 설정한다
- **이유**: CSS variables를 활성화하면 서버와 클라이언트 간 테마 값이 CSS 변수로 동기화되어, SSR 시 발생하는 다크모드 깜빡임(flash) 현상을 방지한다. JavaScript 런타임에 의존하지 않고 CSS 레벨에서 테마 값을 적용할 수 있다.

### next/font 연동

- **규칙**: [MUST] `next/font`로 폰트를 설정하고, CSS variable로 MUI 테마에 연동한다
- **이유**: `next/font`는 빌드 타임에 폰트를 최적화하여 Layout Shift를 방지하고, self-hosting으로 외부 네트워크 요청을 제거한다. CSS variable을 통해 MUI typography에 연동하면 폰트 로딩 최적화와 테마 일관성을 동시에 확보한다.
- **좋은 예시**:

```typescript
// app/layout.tsx
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Noto_Sans_KR } from 'next/font/google';
import theme from '@/theme';

const notoSansKR = Noto_Sans_KR({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-kr',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={notoSansKR.variable}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
```

- **나쁜 예시**:

```typescript
// AppRouterCacheProvider 없이 직접 ThemeProvider만 사용
// SSR 시 스타일이 누락되어 FOUC 발생
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/* AppRouterCacheProvider 누락 */}
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 2. 테마 구조

### 테마 디렉토리 분리

- **규칙**: [MUST] `theme/` 디렉토리에 테마 설정을 분리한다
- **이유**: 디자인 토큰과 테마 생성 로직을 분리하면, 디자인 시스템 변경 시 영향 범위를 최소화할 수 있다. 토큰 파일은 디자이너와 협업하는 접점이 되고, 테마 파일은 MUI 구현 세부사항을 캡슐화한다.

디렉토리 구조:

```
theme/
  tokens.ts     # 디자인 토큰 (색상, 타이포그래피, 간격)
  index.ts      # createTheme으로 테마 생성
```

- **좋은 예시**:

```typescript
// theme/tokens.ts
export const colors = {
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#9c27b0',
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#ffffff',
  },
  error: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828',
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100',
  },
  success: {
    main: '#2e7d32',
    light: '#4caf50',
    dark: '#1b5e20',
  },
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
} as const;

export const typography = {
  fontFamily: 'var(--font-noto-sans-kr), "Helvetica", "Arial", sans-serif',
  h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
  h2: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.3 },
  h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 },
  h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
  h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
  body1: { fontSize: '1rem', lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', lineHeight: 1.6 },
  caption: { fontSize: '0.75rem', lineHeight: 1.5 },
} as const;

export const spacing = {
  unit: 8, // 기본 spacing 단위 (px)
} as const;

export const shape = {
  borderRadius: 8,
} as const;
```

```typescript
// theme/index.ts
'use client';

import { createTheme } from '@mui/material/styles';
import { colors, typography, spacing, shape } from './tokens';

const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
    warning: colors.warning,
    success: colors.success,
    grey: colors.grey,
  },
  typography: {
    fontFamily: typography.fontFamily,
    h1: typography.h1,
    h2: typography.h2,
    h3: typography.h3,
    h4: typography.h4,
    h5: typography.h5,
    h6: typography.h6,
    body1: typography.body1,
    body2: typography.body2,
    caption: typography.caption,
  },
  spacing: spacing.unit,
  shape: {
    borderRadius: shape.borderRadius,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // MUI 기본 대문자 변환 비활성화
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // 기본 배경 그라데이션 제거
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
        },
      },
    },
  },
});

export default theme;
```

### 컴포넌트 기본 스타일 오버라이드

- **규칙**: [SHOULD] 프로젝트 전반에 적용되는 MUI 컴포넌트 기본 스타일은 테마의 `components` 속성에서 오버라이드한다
- **이유**: 개별 컴포넌트마다 반복적으로 동일한 스타일을 적용하면 일관성이 깨지기 쉽고 유지보수 비용이 증가한다. 테마 오버라이드를 통해 한 곳에서 전역 스타일을 관리하면 디자인 시스템의 일관성을 보장할 수 있다.

---

## 3. 스타일링 방법 우선순위

스타일을 적용할 때 아래 의사결정 흐름을 따른다.

| 질문 | 답변 | 방법 |
|------|------|------|
| 이 스타일이 모든 인스턴스에 전역적으로 적용되어야 하는가? | 예 | Theme component overrides |
| 이 스타일이 여러 곳에서 재사용되는가? | 예 | `styled()` 컴포넌트 |
| 이 스타일이 특정 위치에서 일회성으로 필요한가? | 예 | `sx` prop |

### 1순위: Theme component overrides

- **규칙**: [SHOULD] 전역 일관성이 필요한 스타일은 테마의 `components` 속성에서 오버라이드한다
- **이유**: 모든 인스턴스에 동일한 스타일을 보장하며, 디자인 변경 시 한 곳만 수정하면 된다.
- **좋은 예시**:

```typescript
// theme/index.ts - 모든 Button에 대문자 변환 제거
const theme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
});
```

### 2순위: styled()

- **규칙**: [SHOULD] 재사용 가능한 커스텀 컴포넌트는 `styled()`로 생성한다
- **이유**: 의미 있는 이름을 가진 컴포넌트로 추상화되므로, JSX에서 역할이 명확하게 드러나고 여러 곳에서 일관되게 재사용할 수 있다.
- **좋은 예시**:

```typescript
import { styled } from '@mui/material/styles';
import Card from '@mui/material/Card';

const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[2],
  transition: 'box-shadow 0.2s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
}));

// 사용
function ProductCard({ product }: ProductCardProps) {
  return (
    <StyledCard>
      <Typography variant="h6">{product.name}</Typography>
      <Typography variant="body2">{product.description}</Typography>
    </StyledCard>
  );
}
```

### 3순위: sx prop

- **규칙**: [MAY] 일회성 레이아웃/간격 조정에 `sx` prop을 사용한다
- **이유**: 별도 컴포넌트를 생성할 필요 없이 간단한 스타일을 인라인으로 적용할 수 있다. 테마 토큰에 직접 접근하므로 디자인 시스템과의 일관성을 유지한다.
- **좋은 예시**:

```typescript
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

function PageHeader({ title }: { title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
      <Typography variant="h4">{title}</Typography>
    </Box>
  );
}
```

- **나쁜 예시**:

```typescript
// sx prop에 과도하게 많은 스타일을 적용 -> styled()로 분리해야 함
function ProductCard({ product }: ProductCardProps) {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        boxShadow: 2,
        transition: 'box-shadow 0.2s ease-in-out',
        '&:hover': { boxShadow: 6 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      {/* 이 수준의 스타일은 styled()로 분리하는 것이 적절하다 */}
    </Box>
  );
}
```

---

## 4. 반응형 디자인

### MUI Breakpoints 시스템 활용

- **규칙**: [MUST] 반응형 레이아웃에 MUI breakpoints 시스템(xs, sm, md, lg, xl)을 활용한다
- **이유**: MUI의 breakpoints는 테마에 정의된 중앙 관리되는 중단점 값을 사용하므로, 프로젝트 전체에서 일관된 반응형 기준을 보장한다.

### sx prop 객체 표기법

- **규칙**: [MUST] `sx` prop에서 반응형 값은 breakpoint 객체 표기법으로 지정한다
- **이유**: 객체 표기법은 각 breakpoint별 값을 선언적으로 표현하여, 미디어 쿼리를 직접 작성하는 것보다 간결하고 실수가 적다.
- **좋은 예시**:

```typescript
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

function ResponsiveSection() {
  return (
    <Box
      sx={{
        p: { xs: 2, md: 3, lg: 4 },
        maxWidth: { xs: '100%', md: 800, lg: 1200 },
        mx: 'auto',
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        반응형 제목
      </Typography>
    </Box>
  );
}
```

- **나쁜 예시**:

```typescript
// 미디어 쿼리를 직접 작성 - MUI breakpoints를 사용해야 함
<Box
  sx={{
    padding: '16px',
    '@media (min-width: 768px)': {
      padding: '24px',
    },
    '@media (min-width: 1024px)': {
      padding: '32px',
    },
  }}
>
```

### Grid v2 사용

- **규칙**: [SHOULD] 레이아웃 그리드에 MUI Grid v2를 사용한다
- **이유**: Grid v2는 CSS Flexbox 기반으로 `size`, `offset` 등 직관적인 prop을 제공하며, breakpoint별 반응형 레이아웃을 선언적으로 구성할 수 있다.
- **좋은 예시**:

```typescript
import Grid from '@mui/material/Grid';

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {products.map((product) => (
        <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <ProductCard product={product} />
        </Grid>
      ))}
    </Grid>
  );
}
```

### 미디어 쿼리 직접 작성 금지

- **규칙**: [MUST NOT] CSS 미디어 쿼리를 직접 작성하지 않는다. `theme.breakpoints` 또는 `sx` prop의 breakpoint 객체를 사용한다.
- **이유**: 하드코딩된 미디어 쿼리는 테마에 정의된 breakpoint 값과 불일치할 수 있으며, 중단점 변경 시 모든 미디어 쿼리를 수동으로 수정해야 한다.
- **좋은 예시**:

```typescript
// styled()에서 theme.breakpoints 사용
const ResponsiveContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
}));
```

- **나쁜 예시**:

```typescript
// 매직 넘버로 미디어 쿼리 하드코딩
const ResponsiveContainer = styled(Box)({
  padding: '16px',
  '@media (min-width: 900px)': { // 테마 breakpoint와 불일치 위험
    padding: '32px',
  },
});
```

---

## 5. 다크모드/라이트모드

### colorSchemes 활용

- **규칙**: [SHOULD] MUI의 `colorSchemes` 옵션을 활용하여 다크/라이트 모드를 지원한다
- **이유**: `colorSchemes`를 사용하면 CSS variables 기반으로 모드 전환이 이루어지므로, JavaScript 없이도 모드가 적용되어 SSR 환경에서 깜빡임이 발생하지 않는다.
- **좋은 예시**:

```typescript
// theme/index.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1976d2' },
        background: { default: '#ffffff', paper: '#f5f5f5' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#90caf9' },
        background: { default: '#121212', paper: '#1e1e1e' },
      },
    },
  },
});

export default theme;
```

```typescript
// 테마 전환 컴포넌트
'use client';

import { useColorScheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

function ThemeToggle() {
  const { mode, setMode } = useColorScheme();

  return (
    <IconButton
      onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
      aria-label={mode === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
    >
      {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
    </IconButton>
  );
}
```

### theme.palette 사용 강제

- **규칙**: [MUST] 색상은 항상 `theme.palette`를 통해 참조한다. hex 값 등을 직접 하드코딩하지 않는다.
- **이유**: 하드코딩된 색상은 다크모드 전환 시 자동으로 변경되지 않아 UI가 깨진다. `theme.palette`를 사용하면 모드별로 적절한 색상이 자동 적용된다.
- **좋은 예시**:

```typescript
<Box sx={{ backgroundColor: 'background.paper', color: 'text.primary' }}>
  <Typography sx={{ color: 'primary.main' }}>테마 색상 사용</Typography>
</Box>
```

- **나쁜 예시**:

```typescript
// 하드코딩된 색상 - 다크모드에서 깨짐
<Box sx={{ backgroundColor: '#ffffff', color: '#212121' }}>
  <Typography sx={{ color: '#1976d2' }}>하드코딩 색상</Typography>
</Box>
```

---

## 6. 아이콘

### MUI Icons 사용

- **규칙**: [SHOULD] 아이콘은 `@mui/icons-material` 패키지를 사용한다
- **이유**: MUI 아이콘은 테마 색상과 크기 시스템에 자동으로 연동되며, tree-shaking을 지원하여 사용하지 않는 아이콘은 번들에 포함되지 않는다.

### 커스텀 아이콘 래핑

- **규칙**: [SHOULD] 커스텀 아이콘은 SVG를 MUI `SvgIcon`으로 래핑하여 사용한다
- **이유**: `SvgIcon`으로 래핑하면 MUI의 `color`, `fontSize` prop이 일관되게 적용되고, 다른 MUI 아이콘과 동일한 인터페이스로 사용할 수 있다.
- **좋은 예시**:

```typescript
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

function CustomLogo(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
    </SvgIcon>
  );
}

// 사용 - MUI 아이콘과 동일한 인터페이스
<CustomLogo color="primary" fontSize="large" />
```

### 아이콘 접근성

- **규칙**: [MUST] 아이콘에 `aria-label` 또는 `aria-hidden` 속성을 설정한다
- **이유**: 스크린 리더 사용자에게 아이콘의 의미를 전달하거나(기능 아이콘), 장식용 아이콘은 읽지 않도록 처리해야 접근성을 보장할 수 있다.
- **좋은 예시**:

```typescript
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';

// 기능 아이콘 - 의미를 전달해야 함
<IconButton aria-label="삭제">
  <DeleteIcon />
</IconButton>

// 텍스트와 함께 사용되는 장식 아이콘 - 숨김 처리
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <StarIcon aria-hidden="true" />
  <Typography>즐겨찾기</Typography>
</Box>
```

- **나쁜 예시**:

```typescript
// aria 속성 없이 아이콘만 사용 - 스크린 리더가 의미를 알 수 없음
<IconButton>
  <DeleteIcon />
</IconButton>
```

---

## 7. 안티패턴

### 인라인 style 사용 금지

- **규칙**: [MUST NOT] 인라인 `style={{}}` 속성을 사용하지 않는다. MUI `sx` prop 또는 `styled()`를 사용한다.
- **이유**: 인라인 style은 테마 토큰에 접근할 수 없고, 반응형 값을 지원하지 않으며, 의사 클래스(`:hover`, `:focus`)나 미디어 쿼리를 사용할 수 없다. MUI의 스타일 시스템을 우회하므로 일관성이 깨진다.
- **좋은 예시**:

```typescript
<Box sx={{ display: 'flex', gap: 2, p: 3, backgroundColor: 'background.paper' }}>
  <Typography variant="h6" sx={{ color: 'text.primary' }}>제목</Typography>
</Box>
```

- **나쁜 예시**:

```typescript
<div style={{ display: 'flex', gap: '16px', padding: '24px', backgroundColor: '#ffffff' }}>
  <span style={{ fontSize: '20px', fontWeight: 600, color: '#212121' }}>제목</span>
</div>
```

### !important 사용 금지

- **규칙**: [MUST NOT] `!important`를 사용하지 않는다. 테마 오버라이드 또는 specificity 조정으로 해결한다.
- **이유**: `!important`는 CSS 우선순위 체계를 무력화하여 스타일 디버깅을 극도로 어렵게 만든다. 하나의 `!important`는 연쇄적으로 더 많은 `!important`를 유발하여 유지보수 불가능한 코드로 이어진다.
- **좋은 예시**:

```typescript
// 테마 오버라이드로 전역 스타일 변경
const theme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});
```

- **나쁜 예시**:

```typescript
<Button sx={{ textTransform: 'none !important' }}>버튼</Button>
```

### 매직 px 값 하드코딩 금지

- **규칙**: [MUST NOT] 매직 넘버 px 값을 하드코딩하지 않는다. `theme.spacing()` 또는 spacing shorthand를 사용한다.
- **이유**: 하드코딩된 px 값은 디자인 시스템의 spacing 단위와 불일치할 수 있으며, 전체 간격 체계를 변경할 때 모든 하드코딩 값을 수동으로 찾아 수정해야 한다.
- **좋은 예시**:

```typescript
// spacing 단위 사용 (1 = 8px)
<Box sx={{ p: 2, mt: 3, gap: 1 }}>  {/* 16px, 24px, 8px */}
  <Typography>내용</Typography>
</Box>
```

- **나쁜 예시**:

```typescript
// 매직 px 값 하드코딩
<Box sx={{ padding: '16px', marginTop: '24px', gap: '8px' }}>
  <Typography>내용</Typography>
</Box>
```

### HTML 요소 대신 MUI 컴포넌트 사용

- **규칙**: [SHOULD NOT] MUI 컴포넌트 대신 HTML `<div>`, `<span>` 등으로 레이아웃을 구성하지 않는다. `Box`, `Stack`, `Grid`를 사용한다.
- **이유**: MUI 레이아웃 컴포넌트는 `sx` prop, 반응형 값, 테마 토큰 접근 등 스타일 시스템의 모든 기능을 활용할 수 있다. HTML 요소를 직접 사용하면 이러한 이점을 잃고, 테마와의 일관성이 깨진다.
- **좋은 예시**:

```typescript
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

function ActionBar() {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6">페이지 제목</Typography>
      </Box>
      <Button variant="contained">저장</Button>
    </Stack>
  );
}
```

- **나쁜 예시**:

```typescript
function ActionBar() {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '20px', fontWeight: 600 }}>페이지 제목</span>
      </div>
      <button>저장</button>
    </div>
  );
}
```

### 테마에 없는 색상 직접 사용 금지

- **규칙**: [MUST NOT] 테마 토큰에 없는 색상을 직접 사용하지 않는다. 필요한 색상은 palette에 정의한 후 사용한다.
- **이유**: 테마 외부의 색상은 다크모드 전환, 브랜드 색상 변경 등 디자인 시스템 업데이트 시 누락되어 UI 불일치가 발생한다. palette에 정의하면 한 곳에서 관리할 수 있다.
- **좋은 예시**:

```typescript
// theme/index.ts에서 커스텀 색상을 palette에 추가
const theme = createTheme({
  palette: {
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
    },
  },
});

// 컴포넌트에서 palette 참조
<Chip label="정보" sx={{ backgroundColor: 'info.light', color: 'info.dark' }} />
```

- **나쁜 예시**:

```typescript
// palette에 없는 색상을 직접 하드코딩
<Chip label="정보" sx={{ backgroundColor: '#03a9f4', color: '#01579b' }} />
```

---

## 8. 참고 자료

- [MUI Material UI 공식 문서](https://mui.com/material-ui/getting-started/)
- [MUI System (sx prop)](https://mui.com/system/getting-started/)
- [MUI Next.js Integration Guide](https://mui.com/material-ui/integrations/nextjs/)
- [MUI Theming](https://mui.com/material-ui/customization/theming/)
- [MUI CSS Theme Variables](https://mui.com/material-ui/customization/css-theme-variables/overview/)
- [MUI Dark Mode](https://mui.com/material-ui/customization/dark-mode/)
- [MUI Breakpoints](https://mui.com/material-ui/customization/breakpoints/)
- [MUI styled() API](https://mui.com/system/styled/)
