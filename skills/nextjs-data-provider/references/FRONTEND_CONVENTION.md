# Frontend Convention

> This document defines common rules that apply to the entire frontend.
> For rules specific to certain tools/categories, refer to the documents in subdirectories.
>
> - [Architecture Convention](architecture/ARCHITECTURE_CONVENTION.md)
> - [React Convention](react/REACT_CONVENTION.md)
> - [State Management Convention](state/STATE_CONVENTION.md)
> - [Styling Convention](styling/STYLING_CONVENTION.md)
> - [Testing Convention](testing/TESTING_CONVENTION.md)
> - [Form Convention](form/FORM_CONVENTION.md)
> - [Next.js Convention](nextjs/NEXTJS_CONVENTION.md)

---

## 1. Technology Stack Overview

| Area | Technology | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 15 |
| UI Library | React | 19 |
| Language | TypeScript | Latest stable version |
| Client State | Zustand | Latest stable version |
| Server State | TanStack Query | v5 |
| UI Components | @sellernote/design-system | Latest version |
| Component Documentation | Storybook | 8 |
| Form/Validation | React Hook Form + Zod | Latest stable version |
| Testing | Jest + React Testing Library | Latest stable version |

> `@sellernote/design-system` is an in-house design system built on Radix UI + Tailwind CSS v4 + CVA. It provides 40+ components, 166+ icons, and custom design tokens.

---

## 2. Component Design Principles

### Single Responsibility Principle

- **Rule**: [MUST] A single component is responsible for only one role

```typescript
// UserAvatar: Only responsible for rendering the avatar
function UserAvatar({ src, name }: UserAvatarProps) {
  return <img src={src} alt={`${name}의 프로필 이미지`} />;
}

// UserGreeting: Only responsible for rendering the greeting
function UserGreeting({ name }: UserGreetingProps) {
  return <p>{name}님, 환영합니다.</p>;
}
```

### Composition-First Pattern

- **Rule**: [SHOULD] Compose using children/slot patterns, and prefer composition patterns over render props

```typescript
interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

function Card({ children, header, footer }: CardProps) {
  return (
    <div className="card">
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// Usage
<Card header={<h2>제목</h2>} footer={<Button>확인</Button>}>
  <p>본문 내용</p>
</Card>
```

### Props Design

- **Rule**: [MUST] Props are defined with interface, and destructured in the component parameters. children uses the React.ReactNode type.

```typescript
interface ButtonProps {
  variant: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

function Button({ variant, size = "md", disabled = false, children, onClick }: ButtonProps) {
  return (
    <button className={`btn-${variant} btn-${size}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
```

> **Note**: Components provided by `@sellernote/design-system` (ActionButton, TextField, Select, etc.) already follow these principles, so use them without implementing your own. For basic UI elements like buttons, inputs, and selects, check DS components first.

---

## 3. File/Folder Naming

| Target | Rule | Example |
| --- | --- | --- |
| Component files | PascalCase | `UserProfile.tsx` |
| Hook files | camelCase (`use` prefix) | `useAuth.ts` |
| Utility files | camelCase | `formatDate.ts` |
| Directories | kebab-case | `user-profile/` |
| Constant files | UPPER_SNAKE_CASE | `API_ENDPOINTS.ts` |
| Type files | PascalCase + `.types.ts` | `User.types.ts` |
| Test files | Original name + `.test.tsx` | `UserProfile.test.tsx` |
| Story files | Original name + `.stories.tsx` | `UserProfile.stories.tsx` |

---

## 4. Import Rules

Import rules follow the Import Path rules in the [Architecture Convention](architecture/ARCHITECTURE_CONVENTION.md).

---

## 5. Accessibility Standards

### Keyboard Accessibility

- **Rule**: [MUST] Interactive elements (buttons, links, form fields, etc.) must be accessible and operable using only a keyboard

### Image Alt Text

- **Rule**: [MUST] Provide a meaningful `alt` attribute for all `<img>` elements. For decorative images, explicitly set `alt=""`.

### WCAG Compliance

- **Rule**: [SHOULD] Comply with WCAG 2.1 AA level

### Semantic HTML Usage

- **Rule**: [MUST] Use semantic HTML elements that match their meaning, and do not overuse `<div>`

```typescript
function ProductList({ products }: ProductListProps) {
  return (
    <section aria-labelledby="product-heading">
      <h2 id="product-heading">상품 목록</h2>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <article>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

---

## 6. Performance Standards

### Core Web Vitals

- **Rule**: [SHOULD] Meet Core Web Vitals targets (LCP < 2.5s, INP < 200ms, CLS < 0.1)

### Image Optimization

- **Rule**: [MUST] Use the `next/image` component when rendering images

### Code Splitting

- **Rule**: [SHOULD] Use `dynamic import` for heavy components (modals, charts, editors, etc.) to enable code splitting

```typescript
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("@/components/HeavyChart"), {
  loading: () => <div className="h-[400px] w-full animate-pulse rounded-md bg-muted" />,
  ssr: false,
});
```

### Bundle Size Monitoring

- **Rule**: [SHOULD] Use `@next/bundle-analyzer` to regularly monitor bundle size

---

## 7. Anti-Patterns

### Prop Drilling

- **Rule**: [MUST NOT] Do not pass props more than 3 levels deep. Use Zustand store or Context instead.

```typescript
// Global state management with Zustand store
import { useUserStore } from "@/stores/useUserStore";

function UserAvatar() {
  const avatar = useUserStore((state) => state.user.avatar);
  return <img src={avatar} alt="프로필 이미지" />;
}
```

### God Component

- **Rule**: [MUST NOT] Do not write components exceeding 300 lines. Separate by responsibility.

### Data Fetching in useEffect

- **Rule**: [MUST NOT] Do not fetch data directly inside `useEffect`. Use TanStack Query instead.

```typescript
function UserList() {
  const { data: users, isPending } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((res) => res.json()),
  });

  if (isPending) return <Spinner />;
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

### Infinite Re-renders from Inline Functions

- **Rule**: [MUST NOT] Do not include inline functions in dependency arrays causing infinite re-renders. Use TanStack Query for declarative data fetching instead.