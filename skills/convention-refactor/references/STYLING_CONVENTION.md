# Styling Convention

> This document defines styling and design token rules based on `@sellernote/design-system` + Tailwind CSS v4.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. @sellernote/design-system Setup

### Package Installation

- **Rule**: [MUST] Install the `@sellernote/design-system` package and integrate it into the project

**.npmrc configuration (GitHub Packages authentication):**

```ini
@sellernote:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

**Installation:**

```bash
pnpm add @sellernote/design-system
```

### Tailwind Integration

- **Rule**: [MUST] Apply the DS Tailwind preset to the project Tailwind configuration

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

### Style Import

- **Rule**: [MUST] Import Tailwind and DS styles in the following order in the global CSS file

```css
/* app/globals.css */
@import 'tailwindcss';
@config '../tailwind.config.js';
@import '@sellernote/design-system/styles';
```

> **Note**: Since Pretendard font is included in `@sellernote/design-system/styles`, separate `next/font` configuration is unnecessary.

### cn() Utility Function

- **Rule**: [MUST] Use the `cn()` function provided by DS for conditional className merging. `cn()` combines `clsx` + `tailwind-merge` to automatically resolve class conflicts.

```typescript
import { cn } from "@sellernote/design-system";

function Card({ className, children }: CardProps) {
  return (
    <div className={cn("rounded-200 bg-surface-1 p-600 shadow-normal", className)}>
      {children}
    </div>
  );
}

// Usage: p-600 is correctly overridden by p-400
<Card className="p-400">
  <p>Content</p>
</Card>
```

---

## 2. Design Tokens

> All tokens are used as Tailwind classes. Source: `@sellernote/design-system`'s `assets/token.json` → `tailwind.preset.js`

### Color System

- **Rule**: [MUST] Colors are referenced through DS system color tokens. Do not directly use hex values or Tailwind's default palette.

#### Background (bg)

| Token | Tailwind Class | Value   | Usage              |
|-------|----------------|---------|--------------------|
| bg-1  | `bg-bg-1`      | #ffffff | Default page background |
| bg-2  | `bg-bg-2`      | #f6f7f8 | Secondary background    |
| bg-3  | `bg-bg-3`      | #1f2328 | Dark background         |

#### Surface

| Token     | Tailwind Class  | Value   | Usage                          |
|-----------|-----------------|---------|--------------------------------|
| surface-1 | `bg-surface-1` | #ffffff | Card, panel default            |
| surface-2 | `bg-surface-2` | #f6f7f8 | Disabled background, secondary surface |
| surface-3 | `bg-surface-3` | #e8eaed | Hover state, selected item     |
| surface-4 | `bg-surface-4` | #ccd0d7 | Emphasized background          |
| surface-5 | `bg-surface-5` | #48505b | Dark surface                   |
| surface-6 | `bg-surface-6` | #1f2328 | Darkest surface                |

#### Text

| Token  | Tailwind Class | Value   | Usage                          |
|--------|----------------|---------|--------------------------------|
| text-1 | `text-text-1`  | #1f2328 | Primary text (headings, input values) |
| text-2 | `text-text-2`  | #48505b | Secondary text (list items)    |
| text-3 | `text-text-3`  | #768293 | Placeholder, label             |
| text-4 | `text-text-4`  | #afb6c0 | Disabled text                  |
| text-5 | `text-text-5`  | #ffffff | White text (on dark background)|

#### Line — Dividers

| Token  | Tailwind Class   | Value   | Usage               |
|--------|------------------|---------|----------------------|
| line-1 | `border-line-1`  | #ffffff | White divider        |
| line-2 | `border-line-2`  | #e8eaed | Default divider      |
| line-3 | `border-line-3`  | #ccd0d7 | Medium emphasis divider |
| line-4 | `border-line-4`  | #363c45 | Dark divider         |
| line-5 | `border-line-5`  | #1f2328 | Darkest divider      |

#### Border — Input Borders

| Token    | Tailwind Class     | Value   | Usage                 |
|----------|--------------------|---------|-----------------------|
| border-1 | `border-border-1` | #ffffff | White border          |
| border-2 | `border-border-2` | #e8eaed | Disabled state border |
| border-3 | `border-border-3` | #ccd0d7 | Default resting border|

#### Icon

| Token  | Tailwind Class | Value   | Usage                     |
|--------|----------------|---------|---------------------------|
| icon-1 | `text-icon-1`  | #000000 | Default icon              |
| icon-2 | `text-icon-2`  | #48505b | Secondary icon            |
| icon-3 | `text-icon-3`  | #8d97a5 | placeholder/subtle icon   |
| icon-4 | `text-icon-4`  | #ccd0d7 | Disabled icon             |
| icon-5 | `text-icon-5`  | #ffffff | White icon                |

#### Brand

| Token     | Tailwind Class                   | Usage                       |
|-----------|----------------------------------|-----------------------------|
| brand-1~3 | `bg-brand-1` ~ `bg-brand-3`    | Light blue range            |
| brand-4   | `bg-brand-4` / `text-brand-4`  | Primary brand color (#1d67cd) |
| brand-5~7 | `bg-brand-5` ~ `bg-brand-7`    | Dark blue range             |

#### Tone Colors — Status Expression

Each color (red / yellow / green / cyan / blue / purple) has levels 1–5. Levels 1–2 are for backgrounds (light), level 3 is for default text/icon use, and levels 4–5 are for emphasis/hover (dark).

```
tone-red-1~5, tone-yellow-1~5, tone-green-1~5
tone-cyan-1~5, tone-blue-1~5, tone-purple-1~5
```

```typescript
// Error state display
<div className="bg-tone-red-1 border border-tone-red-3 text-tone-red-3 rounded-100 p-400">
  Error message
</div>

// Success state display
<div className="bg-tone-green-1 border border-tone-green-3 text-tone-green-3 rounded-100 p-400">
  Success message
</div>
```

### Typography

- **Rule**: [MUST] Text styles use the DS typography token classes (`text-{name}`). font-size, line-height, and font-weight are applied as a bundle.

| Tailwind Class      | Size | Line Height | Weight | Usage                            |
|---------------------|------|-------------|--------|----------------------------------|
| `text-display-lg`   | 56px | 72px        | 700    | Large display                    |
| `text-display-md`   | 40px | 52px        | 700    | Medium display                   |
| `text-heading-lg`   | 32px | 40px        | 600    | Page title                       |
| `text-heading-md`   | 24px | 32px        | 600    | Section title                    |
| `text-heading-sm`   | 20px | 28px        | 600    | Subheading                       |
| `text-heading-xs`   | 18px | 26px        | 600    | Minor subheading                 |
| `text-subtitle-xl`  | 18px | 28px        | 500    | Emphasized body large            |
| `text-subtitle-lg`  | 16px | 24px        | 500    | Emphasized body medium           |
| `text-subtitle-md`  | 14px | 20px        | 500    | UI default text (labels, options, etc.) |
| `text-subtitle-sm`  | 12px | 16px        | 500    | Small emphasis                   |
| `text-body-lg`      | 16px | 26px        | 400    | Body large                       |
| `text-body-md`      | 14px | 22px        | 400    | Body default (input values, etc.)|
| `text-body-sm`      | 12px | 18px        | 400    | Body small                       |
| `text-caption-md`   | 12px | 16px        | 400    | Caption                          |
| `text-caption-sm`   | 10px | 14px        | 400    | Small caption                    |

> Most frequently used classes in components: `text-subtitle-md` (UI elements), `text-body-md` (input values)

```typescript
<h1 className="text-heading-lg text-text-1">Page Title</h1>
<p className="text-body-md text-text-2">Body content</p>
<span className="text-caption-md text-text-3">Supplementary info</span>
```

### Spacing

- **Rule**: [MUST] Spacing (padding, margin, gap, etc.) uses DS spacing tokens.

| Token | Tailwind Class        | Value |
|-------|-----------------------|-------|
| 50    | `p-50` / `gap-50`    | 2px   |
| 100   | `p-100` / `gap-100`  | 4px   |
| 200   | `p-200` / `gap-200`  | 8px   |
| 300   | `p-300` / `gap-300`  | 12px  |
| 400   | `p-400` / `gap-400`  | 16px  |
| 500   | `p-500` / `gap-500`  | 20px  |
| 600   | `p-600` / `gap-600`  | 24px  |
| 800   | `p-800` / `gap-800`  | 32px  |
| 1000  | `p-1000`             | 40px  |
| 1200  | `p-1200`             | 48px  |
| 1600  | `p-1600`             | 64px  |
| 2000  | `p-2000`             | 80px  |

```typescript
<div className="p-600 flex flex-col gap-400">
  <h2 className="text-heading-sm text-text-1">Section Title</h2>
  <p className="text-body-md text-text-2">Content</p>
</div>
```

### Border Radius

| Token | Tailwind Class   | Value | Usage                          |
|-------|------------------|-------|--------------------------------|
| 50    | `rounded-50`     | 2px   | Minimal                        |
| 100   | `rounded-100`    | 4px   | General elements (buttons, inputs, cards) |
| 200   | `rounded-200`    | 8px   | Panels, dropdowns              |
| 300   | `rounded-300`    | 12px  | Large cards                    |
| 400   | `rounded-400`    | 16px  | Modals                         |
| full  | `rounded-full`   | 999px | Pill shape, circle             |

### Shadow

| Tailwind Class       | Usage            |
|----------------------|------------------|
| `shadow-normal`      | Card default     |
| `shadow-emphasize`   | Dropdown, popover|
| `shadow-strong`      | Dialog           |
| `shadow-heavy`       | Emphasized layer |

### Z-Index

| Tailwind Class     | Usage                        |
|--------------------|------------------------------|
| `z-tooltip`        | Tooltip                      |
| `z-popover`        | Popover                      |
| `z-toast`          | Toast                        |
| `z-snackbar`       | Snackbar                     |
| `z-alertdialog`    | AlertDialog                  |
| `z-panel`          | Select/Combobox dropdown     |
| `z-dropdownmenu`   | DropdownMenu                 |
| `z-dialog`         | Dialog                       |
| `z-overlay`        | Overlay (dim)                |
| `z-drawer`         | Drawer                       |
| `z-sticky`         | Sticky element               |
| `z-base`           | Default                      |

> **Note**: DS components (Dialog, Toast, etc.) have the correct z-index built in, so manual specification is unnecessary. Use these tokens only when creating custom layers.

### Animation

| Tailwind Class              | Usage            |
|-----------------------------|------------------|
| `animate-fly-down`          | Dropdown open    |
| `animate-fly-down-out`      | Dropdown close   |
| `animate-fly-up`            | Dialog open      |
| `animate-fly-up-out`        | Dialog close     |
| `animate-slide-down`        | Toast appear     |
| `animate-slide-up`          | Toast disappear  |
| `animate-slide-in-right`    | Snackbar appear  |
| `animate-slide-out-right`   | Snackbar disappear |
| `animate-slide-in-left`     | Drawer open      |
| `animate-slide-out-left`    | Drawer close     |
| `animate-fade-in`           | Fade in          |
| `animate-fade-out`          | Fade out         |

> All animation duration: 150ms, easing: ease. Since they are built into DS components, manual application is only used for custom animations.

### Custom Token Extension

- **Rule**: [SHOULD] If project-specific tokens are needed, extend them via `theme.extend` in the Tailwind config

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

---

## 3. Styling Method Priority

Follow the decision flow below when applying styles.

| Question | Answer | Method |
|----------|--------|--------|
| Does DS have the corresponding component? | Yes | Use `@sellernote/design-system` component |
| Is it a reusable custom component? | Yes | Manage variants with `cva()` + `cn()` |
| Is it one-off styling? | Yes | Use Tailwind utility classes + DS tokens |

### 1st Priority: DS Components

- **Rule**: [MUST] When implementing UI, prioritize using components provided by `@sellernote/design-system`

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
      <ActionButton className="mt-400">Purchase</ActionButton>
    </div>
  );
}
```

#### DS Component Categories

| Category | Components |
|----------|-----------|
| Button | `ActionButton`, `IconButton`, `TextButton` |
| Input | `TextField`, `Textarea`, `PasswordField`, `SearchField`, `NumberField`, `Checkbox`, `CheckboxGroup`, `RadioButton`, `RadioGroup`, `Switch`, `Slider`, `Select`, `Combobox`, `ToggleGroup` |
| Data Display | `Avatar`, `Badge`, `Tag`, `Empty`, `Image`, `Label`, `Steps`, `Table`, `ScrollArea` |
| Feedback | `Alert`, `Toast` (`addToast()`), `Snackbar` (`addSnackbar()`) |
| Overlay | `Dialog`, `AlertDialog` (`showAlertDialog()`), `Drawer`, `Tooltip`, `Popover`, `DropdownMenu` |
| Navigation | `Sidebar`, `SidebarMenuItem`, `Tabs`, `TabContent`, `Header`, `Menubar`, `Pagination` |
| Loading | `Spinner`, `Progress` |
| Foundation | `Icon` |

### 2nd Priority: Variant Management with cva() + cn()

- **Rule**: [SHOULD] Manage variants of reusable custom components not available in DS using `class-variance-authority(cva)`

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

### 3rd Priority: Tailwind utility classes

- **Rule**: [MAY] Use Tailwind utility classes with DS tokens for one-off layout/spacing adjustments

```typescript
function PageHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-400 mb-600">
      <h1 className="text-heading-lg text-text-1">{title}</h1>
    </div>
  );
}
```

### DS Component Customization

- **Rule**: [MUST NOT] Do not copy DS component source code into the project and modify it. Customize using `className` prop and variant props.

```typescript
<ActionButton className="w-full">Full Width Button</ActionButton>
<ActionButton variant="destructive" size="sm">Delete</ActionButton>
```

---

## 4. Responsive Design

### Using the Tailwind Breakpoints System

- **Rule**: [MUST] Use Tailwind breakpoint prefixes for responsive layouts

| Breakpoint | Min Width | Target           |
|-----------|----------|-------------------|
| (default) | 0px      | Mobile            |
| `xs`      | 360px    | Mobile            |
| `sm`      | 768px    | Tablet / Mobile-Desktop breakpoint |
| `md`      | 1024px   | Desktop           |
| `lg`      | 1440px   | Wide              |

### Mobile-first Approach

- **Rule**: [MUST] Styles are written mobile-first. Apply mobile styles to the base classes, and add larger screen styles using breakpoint prefixes like `sm:`, `md:`, `lg:`.

```typescript
<div className="p-400 md:p-600 lg:p-800 max-w-full md:max-w-3xl lg:max-w-5xl mx-auto">
  <h2 className="text-heading-sm sm:text-heading-md md:text-heading-lg text-center md:text-left">
    Responsive Title
  </h2>
</div>
```

### Responsive Grid

- **Rule**: [SHOULD] Use Tailwind CSS Grid utility classes for grid layouts

```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-400 md:gap-600">
  {products.map((product) => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>
```

### No Direct Media Query Writing

- **Rule**: [MUST NOT] Do not write CSS media queries directly. Use Tailwind breakpoint prefixes.

```typescript
<div className="hidden md:block">Visible on desktop only</div>
<div className="md:hidden">Visible on mobile only</div>
```

---

## 5. Dark Mode / Light Mode

### next-themes Setup

- **Rule**: [MUST] Dark mode uses the `next-themes` library with class-based switching

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

### Using DS Tokens

- **Rule**: [SHOULD] Using DS system color tokens will enable automatic switching when dark mode is extended in the future.

```typescript
<div className="bg-bg-1 text-text-1 border-border-3">
  <p className="text-text-3">Secondary text</p>
</div>
```

### No Hardcoded Colors

- **Rule**: [MUST] Colors are always referenced through DS system color tokens. Do not directly use hex values or Tailwind's default palette.

---

## 6. Icons

### Using the DS Icon Component

- **Rule**: [MUST] Use the `Icon` component from `@sellernote/design-system` for icons. Direct use of external icon libraries is prohibited.

```typescript
import { Icon } from "@sellernote/design-system";

<Icon name="icon-utility-check" size={16} />
<Icon name="icon-common-bell-fill" size={20} />
<Icon name="icon-flag-kr" size={24} />
```

### Icon Naming Convention

Icon names follow the `icon-{category}-{name}` pattern:

| Category  | Prefix           | Example                              | Usage              |
|-----------|------------------|--------------------------------------|--------------------|
| common    | `icon-common-`   | `icon-common-bell`, `icon-common-person` | General UI icons   |
| utility   | `icon-utility-`  | `icon-utility-check`, `icon-utility-plus` | Utility icons      |
| status    | `icon-status-`   | `icon-status-checkcircle`, `icon-status-xcircle` | Status indicators  |
| menu      | `icon-menu-`     | `icon-menu-home`, `icon-menu-order`  | Navigation menu    |
| file      | `icon-file-`     | `icon-file-pdf`, `icon-file-xlsx`    | File types         |
| emptydata | `icon-emptydata-`| `icon-emptydata-search`, `icon-emptydata-folder` | Empty state illustrations |
| flag      | `icon-flag-`     | `icon-flag-kr`, `icon-flag-us`       | Flags              |

### Icon Size Rules

- **Rule**: [SHOULD] Specify icon size in px units using the `size` prop

| Usage              | size          | Size        |
|--------------------|---------------|-------------|
| Inline text        | `16`          | 16px        |
| Inside button      | `16` or `20`  | 16px / 20px |
| Standalone icon button | `20`      | 20px        |
| Hero/emphasis      | `24` or above | 24px+       |

### Icon Accessibility

- **Rule**: [MUST] Set `aria-label` on icon-only buttons

```typescript
import { IconButton, Icon } from "@sellernote/design-system";

<IconButton icon="icon-utility-trash" aria-label="Delete" />

// Decorative icon used alongside text
<div className="flex items-center gap-200">
  <Icon name="icon-common-star-fill" size={16} aria-hidden="true" />
  <span>Favorites</span>
</div>
```

### Adding New Icons

If the project requires an icon not available in DS:

1. Add the SVG file to the `assets/icons/origin/` directory in the DS repository
2. Follow the `icon-{category}-{name}.svg` naming pattern for the file name
3. Regenerate the sprite with the `pnpm icon-gen` command
4. Create a PR in the DS repository

---

## 7. Anti-patterns

- **Rule**: [MUST NOT] Do not use inline `style={{}}` attributes. Use Tailwind utility classes.
- **Rule**: [MUST NOT] Do not use `!important`. Manage class priority with `cn()`.
- **Rule**: [MUST NOT] Do not hardcode magic number px values. Use DS spacing tokens.
- **Rule**: [MUST NOT] Do not copy `@sellernote/design-system` component source code into the project and modify it.
- **Rule**: [MUST NOT] Do not combine classNames using template literals or string concatenation. Use `cn()`.

```typescript
import { cn } from "@sellernote/design-system";
<div className={cn("p-400 rounded-100", isActive && "bg-surface-3", className)} />
```