---
name: react-dev
description: React 19 component, hook, and performance optimization development guide following Sellernote React conventions. Covers pure React patterns without framework-specific concerns. Use when developing React components, designing Custom Hooks, working with Context API, Error Boundaries, performance optimization, or React 19 features (use, useActionState, useOptimistic, useEffectEvent, Activity). Triggers on requests like "create a React component", "design a custom hook", "optimize React performance", "add Error Boundary", "design Context", "implement compound component", "set up Suspense boundaries". For Next.js/MUI-related work, use the nextjs-ui-dev skill instead. For React Router v7 SPA work, use the react-dev-orchestration skill.
---

# React Dev

Develop React 19 components, hooks, and performance optimizations following Sellernote React conventions.

## Convention Loading

Read these reference files before starting work:

1. **Always read first** (core rules):
   - `references/REACT_CONVENTION.md` — Component patterns, Hooks, React 19 features, performance, Error Boundary, Suspense, Context API, TypeScript integration, anti-patterns

2. **Read as needed**:
   - `references/FRONTEND_CONVENTION.md` — Frontend-wide rules, tech stack, file/folder naming, import rules, accessibility, performance standards, safe browser storage
   - `references/TYPESCRIPT_CONVENTION.md` — TypeScript coding rules, type system, enum vs union, import/export, linter/formatter, anti-patterns
   - `references/COMMON_CONVENTION.md` — Naming conventions, git conventions, error handling, logging

## Tech Stack

| Item | Version/Config |
|------|---------------|
| React | 19.2+ |
| TypeScript | 5.x, strict mode |
| React Compiler | v1.0 — must be enabled |
| Error Boundary | react-error-boundary |
| Virtualization | @tanstack/react-virtual |
| Client State | Zustand |
| Server State | TanStack Query v5 |
| URL State | nuqs 2.8+ |
| Form/Validation | React Hook Form + Zod |

## Workflow

### Step 1: Classify the Task

| Type | Convention Sections | Key Rules |
|------|-------------------|-----------|
| Component | §2 (Component Patterns) + §10 (TypeScript Integration) | Compound Components, Controlled/Uncontrolled, conditional rendering, key, children composition, Dialog/Overlay rendering |
| Hook | §3 (Hooks Rules) | Basic rules, useState patterns, useEffect, useRef, Custom Hook design |
| React 19 Feature | §4 (React 19 Features) | use(), React Compiler, Actions, useOptimistic, useEffectEvent, Activity, ref as prop, Metadata |
| Event Handling | §5 (Event Handling) | Handler naming (onXxx/handleXxx), event types, synthetic events |
| Performance | §6 (Performance Optimization) | Re-render prevention, State Colocation, Lazy Init, virtualization |
| Error Boundary | §7 (Error Boundary) | react-error-boundary, recovery strategy, placement strategy |
| Suspense | §8 (Suspense Strategy) | Suspense + ErrorBoundary pairing, per-section boundaries, useSuspenseQuery |
| Context/State | §9 (Context API) | Context vs Zustand selection, Provider pattern, Context separation |

### Step 2: Check Patterns

Read the relevant section's rules and good/bad examples. Rule severity:
- **[MUST]** — Mandatory, no exceptions
- **[SHOULD]** — Follow unless there is a specific documented reason not to
- **[MAY]** — Optional, use as appropriate

### Step 3: Implement

Follow the convention's good examples. Key checklists per task type:

#### Components
- Use Compound Component pattern for logically related component groups
- Form inputs must be controlled components
- Never use a number directly on the left side of `&&` — convert to boolean
- Use unique ID (not array index) for list `key`
- Use `children` composition for layout/wrapper components
- Extend `ComponentPropsWithoutRef`/`ComponentPropsWithRef` for HTML wrapper components
- Use discriminated union types for variant props
- Use `React.ReactNode` for `children` type by default
- Dialog/Overlay: always render the shell, control open/close via `open` prop; never use `{open && <Dialog />}`
- Use `key={id}` to reset internal state when target changes (e.g., Edit Dialog)
- Component file name must match primary component name (PascalCase)
- Do not place unrelated domain components in a single file
- Extract sub-UI into separate components instead of `renderXxx` functions
- Do not define functions inline in JSX props — extract as named handlers

#### Hooks
- Call hooks only at the top level (never inside conditionals/loops)
- Use functional updates for state depending on previous value: `setCount(prev => prev + 1)`
- `useEffect` is only for external system synchronization (not for event responses or derived state)
- Return cleanup functions from subscription/timer Effects
- React 19: pass `ref` directly as a prop, no `forwardRef`
- React Compiler enabled: do not write manual `useMemo`/`useCallback` by default
- Custom Hooks: `use` prefix, single concern, return object or `as const` tuple
- Pure helper functions that don't depend on Hook state go outside the Hook function
- Hook file naming: kebab-case with `use-` prefix (e.g., `use-auth.ts`)

#### React 19 Features
- `use()`: consume Promise/Context; must be inside `<Suspense>`; never create Promise in render
- `useActionState`: manage form submission state; action receives previous state as first arg
- `useFormStatus`: must be called in a child component inside `<form>`
- `useOptimistic`: update optimistic state only inside a Transition or Action
- `useEffectEvent` (stable 19.2+): wrap callbacks used inside Effects that should not be in the dependency array (logging, analytics); call only inside Effects
- `Activity` (stable 19.2+): preserve state for hidden UI (tab switching, back navigation cache)
- `"use no memo"`: emergency escape hatch only when Compiler causes behavioral issues; leave a comment explaining cause and removal conditions

#### React Compiler + ESLint
- Use latest `eslint-plugin-react-hooks` with `react-hooks/recommended` or `recommended-latest` preset (Flat Config)
- Enforce `rules-of-hooks`, `immutability`, `purity`, `refs`, `set-state-in-render` as `error` in CI
- Treat Compiler solely as a performance optimization — code must be logically correct with Compiler off

#### Performance
- Define constant objects/arrays outside the render function
- Place state close to the component that uses it (State Colocation)
- `useState` expensive initial value: pass function reference `useState(fn)`, not `useState(fn())`
- Virtualize lists with hundreds+ items using `@tanstack/react-virtual`

#### Error Boundary
- Use `react-error-boundary` library
- All fallback UIs must provide a recovery mechanism (retry button)
- Use `resetKeys` for automatic retry on dependent data change
- Place 1 global boundary at root + additional boundaries per independent UI section

#### Suspense
- Pair `Suspense` + `ErrorBoundary` for declarative loading/error handling with `useSuspenseQuery`
- Place Suspense boundaries per independently-loadable UI unit, not one for the entire page
- Feature components consume hook data without loading/error branching — boundaries handle it

#### Context API
- Zustand for frequently-updating global UI state; Context for low-frequency config (theme, locale) and Compound Component internals
- Separate Provider into its own component; React Compiler auto-stabilizes Provider value
- Split Contexts by concern and change frequency, not one monolithic Context

### Step 4: Anti-Pattern Verification

After implementation, verify none of these anti-patterns exist:

| Anti-pattern | Correct Approach |
|-------------|-----------------|
| Separate state for values derivable from props/state | Compute during rendering |
| `useEffect` to sync derived state | Compute during rendering |
| `useEffect` as event handler | Handle directly in event handler function |
| `useEffect` + individual state resets for component reset | Use `key` prop to reset |
| `useState` for values irrelevant to rendering | Use `useRef` |
| Number directly on left side of `&&` | Convert to boolean first |
| Array index as list `key` | Use unique ID |
| `renderXxx` functions inside components | Extract as separate components |
| Inline functions in JSX props | Extract as named handler functions |
| Lying about `useEffect` dependencies | Include all reactive values; never `eslint-disable` deps |
| Side effects in render phase (API calls, localStorage, DOM manipulation) | Use `useEffect` or event handlers |
| Conditional rendering of Dialog/Overlay shell | Always render shell, control via `open` prop |
| Manual `useMemo`/`useCallback` with Compiler enabled | Let Compiler handle optimization |
- Data fetching in `useEffect` — use TanStack Query instead
- Props drilling beyond 3 levels — use composition or Context
- Native `localStorage`/`sessionStorage` access — use `safeLocalStorage`/`safeSessionStorage` wrappers
- `any` type — use `unknown` with type narrowing
- `as` type assertions to bypass errors — use runtime validation (e.g., Zod)

## File/Folder Naming

| Target | Rule | Example |
|--------|------|---------|
| Component files | PascalCase | `UserProfile.tsx` |
| Hook files | kebab-case with `use-` prefix | `use-auth.ts` |
| Utility files | kebab-case | `format-date.ts` |
| Directories | kebab-case | `user-profile/` |

## Import Rules

- Use `@/` absolute paths for internal project modules; relative paths allowed for same folder/subfolders
- Import order: 1) React/external libs → 2) Internal `@/` modules → 3) Relative `./` → 4) Types (`import type`)
- Use `import type` for type-only imports
- No `index.ts` barrel files in frontend apps; import from specific file paths

## Cross-Skill References

- **Next.js + MUI UI development**: use `nextjs-ui-dev` skill
- **React Router v7 SPA orchestration**: use `react-dev-orchestration` skill
- **Code review**: use `convention-code-review` skill
- **Convention refactoring**: use `convention-refactor` skill
- **State management details**: see `nextjs-data-provider` or `react-data-provider` skill for Zustand/TanStack Query patterns
