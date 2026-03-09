# Styling Convention

> This document defines styling rules based on Tailwind CSS v4.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. cn() Utility Function

### Installation and Setup

- **Rule**: [MUST] Use the `cn()` function for conditional className merging

**Installation:**

```bash
pnpm add clsx tailwind-merge
```

**Create utility function:**

```typescript
// app/lib/cn.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- **Good example**:

```typescript
import { cn } from "@/lib/cn";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

function Card({ className, children }: CardProps) {
  return (
    <div className={cn("rounded-lg bg-white p-6 shadow", className)}>
      {children}
    </div>
  );
}

// Usage: Customizable from outside while maintaining default styles
<Card className="p-4"> {/* p-6 is correctly overridden to p-4 */}
  <p>Content</p>
</Card>
```

---

## 2. Styling Method Priority

Follow the decision flow below when applying styles.

| Question | Answer | Method |
|----------|--------|--------|
| Is it a reusable custom component? | Yes | Manage variants with `cva()` + `cn()` |
| Is it one-off styling? | Yes | Tailwind utility classes |

### 1st Priority: Manage Variants with cva() + cn()

- **Rule**: [SHOULD] Manage variants of reusable custom components with `class-variance-authority(cva)`
- **Good example**:

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
  {
    variants: {
      status: {
        active: "bg-green-50 text-green-700",
        pending: "bg-yellow-50 text-yellow-700",
        error: "bg-red-50 text-red-700",
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

### 2nd Priority: Tailwind utility classes

- **Rule**: [MAY] Use Tailwind utility classes for one-off layout/spacing adjustments
- **Good example**:

```typescript
function PageHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
    </div>
  );
}
```

---

## 3. Responsive Design

### Using Tailwind Breakpoints System

- **Rule**: [MUST] Use Tailwind's breakpoint prefixes for responsive layouts

| Breakpoint | Min Width | Target |
|-----------|----------|--------|
| (default) | 0px | Mobile |
| `sm` | 640px | Small tablet |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Wide |
| `2xl` | 1536px | Ultra-wide |

> **Note**: Custom breakpoints can be added in `theme.extend.screens` of `tailwind.config.js` to match project-specific requirements.

### Mobile-first Approach

- **Rule**: [MUST] Write styles mobile-first. Apply mobile styles in base classes and add larger screen styles with breakpoint prefixes such as `sm:`, `md:`, `lg:`.
- **Good example**:

```typescript
function ResponsiveSection() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full md:max-w-3xl lg:max-w-5xl mx-auto">
      <h2 className="text-lg sm:text-xl md:text-2xl text-center md:text-left">
        Responsive Title
      </h2>
    </div>
  );
}
```

### Responsive Grid

- **Rule**: [SHOULD] Use Tailwind's CSS Grid utility classes for grid layouts
- **Good example**:

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

### No Direct Media Queries

- **Rule**: [MUST NOT] Do not write CSS media queries directly. Use Tailwind breakpoint prefixes.
- **Good example**:

```typescript
<div className="hidden md:block">Visible only on desktop</div>
<div className="md:hidden">Visible only on mobile</div>
```

- **Bad example**:

```css
/* Hardcoded media query with magic numbers */
@media (min-width: 768px) {
  .desktop-only { display: block; }
}
```

---

## 4. Dark Mode / Light Mode

### Custom ThemeProvider Setup

- **Rule**: [MUST] Use Tailwind CSS v4's `@custom-variant` and a custom ThemeProvider for dark mode.

**1. Tailwind CSS v4 dark mode configuration:**

```css
/* app/globals.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

**2. ThemeProvider implementation:**

```typescript
// app/providers/ThemeProvider.tsx
import { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider.");
  return ctx;
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) ?? "system";
  });

  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme);
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <ThemeContext value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext>
  );
}
```

**3. FOUC prevention inline script (root.tsx):**

```typescript
// Add to <head> inside the Layout function of app/root.tsx
<script dangerouslySetInnerHTML={{ __html: `
  (function() {
    var theme = localStorage.getItem('theme') || 'system';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (resolved === 'dark') document.documentElement.classList.add('dark');
  })();
`}} />
```

### Applying Dark Mode Styles

- **Rule**: [SHOULD] Apply dark mode styles using Tailwind's `dark:` prefix
- **Good example**:

```typescript
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  <p className="text-gray-600 dark:text-gray-400">Secondary text</p>
</div>
```

---

## 5. Anti-patterns

### Conditional Styling

When styles vary based on conditions or runtime values, follow the decision flow below.

| Situation | Method | Example |
|-----------|--------|---------|
| Classes change based on boolean/enum | `cn()` | `cn("p-4", isActive && "bg-gray-100")` |
| Component has 2 or more variants | `cva()` + `cn()` | `statusBadgeVariants({ status })` |
| **Runtime dynamic values** (server responses, user input, etc.) | Inline `style` | `style={{ width: `${percent}%` }}` |
| Passing dynamic values via CSS variables | `style` + Tailwind | `style={{ '--progress': percent }}` + `w-[var(--progress)]` |

**Applying conditional classes with cn():**

```typescript
import { cn } from "@/lib/cn";

<div className={cn(
  "rounded p-4 border",
  isSelected ? "bg-blue-50 border-blue-500" : "bg-white border-gray-200",
  isDisabled && "opacity-50 pointer-events-none",
)} />
```

**Inline style allowed for runtime dynamic values:**

- **Rule**: [MAY] Inline `style` may be used only for **dynamic values determined at runtime** such as server responses and user input

```typescript
// Runtime dynamic value — inline style allowed
<div
  className="rounded bg-blue-500 h-2 transition-all"
  style={{ width: `${progress}%` }}
/>

// Drag position — inline style allowed
<div
  className="absolute rounded-full bg-blue-500"
  style={{ top: position.y, left: position.x }}
/>

// Color received from server — inline style allowed
<div
  className="rounded p-4"
  style={{ backgroundColor: category.color }}
/>
```

### No Inline style for Static Styles

- **Rule**: [MUST NOT] Do not use inline `style={{}}` attributes for **static styles**. Use Tailwind utility classes.
- **Good example**:

```typescript
<div className="flex gap-4 p-6 bg-white">
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
</div>
```

- **Bad example**:

```typescript
// Static values written as inline style — should use Tailwind classes
<div style={{ display: "flex", gap: "16px", padding: "24px", backgroundColor: "#ffffff" }}>
  <span style={{ fontSize: "20px", fontWeight: 600, color: "#212121" }}>Title</span>
</div>
```

### No !important

- **Rule**: [MUST NOT] Do not use `!important`. Manage class priority with `cn()`.

### No Manual className String Concatenation

- **Rule**: [MUST NOT] Do not combine className using template literals or string concatenation. Use `cn()`.
- **Good example**:

```typescript
import { cn } from "@/lib/cn";
<div className={cn("p-4 rounded", isActive && "bg-gray-100", className)} />
```

- **Bad example**:

```typescript
<div className={`p-4 rounded ${isActive ? "bg-gray-100" : ""} ${className}`} />
```

### Tailwind Class Sorting

- **Rule**: [MUST] Install `prettier-plugin-tailwindcss` to automatically sort Tailwind class order.

```bash
pnpm add -D prettier-plugin-tailwindcss
```

```json
// .prettierrc
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./app/globals.css"
}
```

> **Tailwind v4 note**: In v4, you must specify the CSS file path using the `tailwindStylesheet` option instead of `tailwindConfig`.

---

## 6. Tailwind CSS v4 Considerations

This project uses Tailwind CSS v4 from the start. Since AI code generation is likely to produce v3 syntax, be aware of the following v4-specific behaviors.

### v4 Key Behaviors

| Item | Behavior |
|------|----------|
| `content` configuration | Automatic content detection (`content` array not needed; use CSS `@source` directive for external sources) |
| `border` default color | `currentColor` — **you must explicitly specify a color class** (e.g., `border border-gray-200`) |
| Opacity | `bg-opacity-*` removed → use slash syntax `bg-black/50` |
| `hover:` | Only applies inside `@media (hover: hover)` (touch device support) |
| `@apply` | Available in main CSS; requires `@reference` in separate files. Use `@utility` block for custom utilities |
| `outline-none` | Only applies `outline-style: none`. Use `outline-hidden` for the previous behavior |
| `ring` | Default width is 1px. Use `ring-3` for the previous 3px behavior |

> **`border` default color caution**: Using `border` alone will render a border matching the text color. **You must always specify a color class.** The same applies to the `divide` utility.

> **AI-generated code caution**: AI may generate v3 classes (`shadow-sm`, `rounded-md`, `bg-opacity-50`, etc.). Always verify during code review that v4 syntax is used.