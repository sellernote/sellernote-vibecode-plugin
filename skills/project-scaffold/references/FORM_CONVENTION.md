# Form Convention

> This document defines form handling and validation patterns.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Form Library

- **Rule**: [MUST] Use the React Hook Form + Zod combination

---

## 2. Zod Schema Patterns

### Schema Location

- **Rule**: [SHOULD] Place Zod schemas inside feature slices (`features/{domain}/schemas/`), entity schemas (`entities/{domain}/model/schemas.ts`), or shared schemas (`shared/lib/schemas/`)

### Common Schema Reuse

- **Rule**: [SHOULD] Define frequently used validation rules such as email, password, phone as common schemas in `shared/lib/schemas/common.ts` and reuse them

```typescript
// shared/lib/schemas/common.ts
import { z } from "zod";
export const emailSchema = z.string().min(1, "이메일을 입력해주세요").email("올바른 이메일 형식이 아닙니다");
export const passwordSchema = z.string().min(8, "비밀번호는 8자 이상이어야 합니다")
  .regex(/[A-Z]/, "대문자를 1개 이상 포함해야 합니다")
  .regex(/[0-9]/, "숫자를 1개 이상 포함해야 합니다")
  .regex(/[^A-Za-z0-9]/, "특수문자를 1개 이상 포함해야 합니다");
export const phoneSchema = z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/, "올바른 휴대폰 번호 형식이 아닙니다");
```

### Type Extraction

- **Rule**: [MUST] Extract form data types using `z.infer<typeof schema>`. Do not manually write separate interfaces.

```typescript
export const CreateUserSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다"),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
});
export type CreateUserFormData = z.infer<typeof CreateUserSchema>;
```

---

## 3. React Hook Form + @sellernote/design-system Integration

- **Rule**: [MUST] Connect form fields using `@sellernote/design-system` components with React Hook Form's `Controller`
- **Rule**: [MUST] Set `zodResolver` on `useForm` and use `mode: 'onBlur'` as default
```typescript
"use client";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField, PasswordField, ActionButton } from "@sellernote/design-system";
import { emailSchema, passwordSchema } from "@/shared/lib/schemas/common";

const LoginSchema = z.object({ email: emailSchema, password: passwordSchema });
type LoginFormData = z.infer<typeof LoginSchema>;

export function LoginForm() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });
  return (
    <form onSubmit={handleSubmit((data) => login(data))} noValidate className="flex flex-col gap-400">
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField
            label="이메일"
            type="email"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            status={errors.email ? "error" : undefined}
            helperText={errors.email?.message}
          />
        )}
      />
      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <PasswordField
            label="비밀번호"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            status={errors.password ? "error" : undefined}
            helperText={errors.password?.message}
          />
        )}
      />
      <ActionButton type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "로그인 중..." : "로그인"}
      </ActionButton>
    </form>
  );
}
```

---

## 4. Validation Strategy

- **Rule**: [MUST] Perform validation on both client and server sides (dual validation principle)
- **Rule**: [MUST] Client-side validation is performed per field at `onBlur` to provide immediate feedback
- **Rule**: [MUST] Perform final validation using the same Zod schema in Server Actions or API endpoints
- **Rule**: [MUST NOT] Replace security validation with client-side validation alone

---

## 5. Error Display Patterns

### Per-field Inline Errors

- **Rule**: [MUST] Display per-field errors as error message components below the corresponding field
```typescript
<Controller
  name="email"
  control={control}
  render={({ field }) => (
    <TextField
      label="이메일"
      type="email"
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      status={errors.email ? "error" : undefined}
      helperText={errors.email?.message}
    />
  )}
/>
```

### Form-level Errors

- **Rule**: [SHOULD] Display errors not attributable to a specific field (such as server errors, network errors) at the top of the form using the DS `Alert` component
```typescript
import { Alert } from "@sellernote/design-system";

const [formError, setFormError] = useState<string | null>(null);
return (
  <form onSubmit={handleSubmit(onSubmit)}>
    {formError && (
      <Alert variant="error" title="오류" open>
        {formError}
      </Alert>
    )}
    {/* 폼 필드들 */}
  </form>
);
```

### Server Error Mapping

- **Rule**: [SHOULD] When the server returns errors for specific fields, map them to the corresponding fields using `setError()`
```typescript
const onSubmit = async (data: SignupFormData) => {
  try {
    await signup(data);
  } catch (error) {
    if (error instanceof ApiError && error.field) {
      setError(error.field as keyof SignupFormData, { type: "server", message: error.message });
    } else {
      setFormError("알 수 없는 오류가 발생했습니다.");
    }
  }
};
```

---

## 6. Server Actions Form Patterns

- **Rule**: [SHOULD] Integrate Next.js Server Actions with React Hook Form for server-side validation and data processing
```typescript
// features/user/actions/createUser.ts
"use server";
import { revalidatePath } from "next/cache";
import { CreateUserSchema } from "@/entities/user";

export async function createUser(formData: FormData) {
  const raw = { name: formData.get("name"), email: formData.get("email"), password: formData.get("password") };
  const result = CreateUserSchema.safeParse(raw);
  if (!result.success) return { success: false, errors: result.error.flatten().fieldErrors };
  await db.user.create({ data: result.data });
  revalidatePath("/users");
  return { success: true, errors: null };
}
```
```typescript
// Client: Map server errors to fields after calling Server Action
const onSubmit = async (data: CreateUserFormData) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => formData.append(key, value));
  const result = await createUser(formData);
  if (!result.success && result.errors) {
    Object.entries(result.errors).forEach(([field, messages]) => {
      setError(field as keyof CreateUserFormData, { type: "server", message: (messages as string[])[0] });
    });
  }
};
```

---

## 7. Complex Forms

### Multi-step Forms (Wizard)

- **Rule**: [SHOULD] For multi-step forms, separate Zod schemas per step and store interim data between steps in a Zustand store
```typescript
// features/auth/schemas/signup-wizard.ts — Separate schemas per step
export const Step1Schema = z.object({ email: emailSchema, password: passwordSchema });
export const Step2Schema = z.object({ name: z.string().min(2), phone: phoneSchema });
export const Step3Schema = z.object({ company: z.string().min(1), role: z.enum(["developer", "designer", "manager"]) });
export const SignupWizardSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema);

// features/auth/store/signupWizardSlice.ts — Persist data between steps
export const useSignupWizardStore = create<SignupWizardState>((set) => ({
  currentStep: 1,
  formData: {},
  setStepData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: state.currentStep - 1 })),
  reset: () => set({ currentStep: 1, formData: {} }),
}));
```

### Dynamic Fields

- **Rule**: [SHOULD] Use `useFieldArray` for dynamically added/removed field lists
```typescript
const OrderSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1, "상품명을 입력해주세요"),
    quantity: z.number().min(1, "1개 이상이어야 합니다"),
  })).min(1, "최소 1개 이상의 상품이 필요합니다"),
});

export function OrderForm() {
  const { control, handleSubmit } = useForm<z.infer<typeof OrderSchema>>({
    resolver: zodResolver(OrderSchema),
    defaultValues: { items: [{ name: "", quantity: 1 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-400 items-center">
          <Controller name={`items.${index}.name`} control={control}
            render={({ field }) => <TextField label="상품명" value={field.value} onChange={field.onChange} />} />
          <IconButton icon="icon-utility-trash" onClick={() => remove(index)} disabled={fields.length === 1} aria-label="삭제" />
        </div>
      ))}
      <ActionButton type="button" variant="tertiary" onClick={() => append({ name: "", quantity: 1 })}>상품 추가</ActionButton>
    </form>
  );
}
```

### Conditional Fields

- **Rule**: [SHOULD] When showing/hiding fields based on another field's value, use `watch()` to observe the value and conditionally render. Handle validation of conditional fields using Zod's `discriminatedUnion`.
```typescript
const ShippingSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("delivery"), address: z.string().min(1, "주소를 입력해주세요") }),
  z.object({ method: z.literal("pickup"), storeId: z.string().min(1, "매장을 선택해주세요") }),
]);

export function ShippingForm() {
  const { control, watch, register } = useForm({ resolver: zodResolver(ShippingSchema) });
  const method = watch("method");
  return (
    <form>
      {/* RadioGroup for method selection */}
      {method === "delivery" && (
        <TextField label="배송 주소" {...register("address")} />
      )}
      {method === "pickup" && (
        <TextField label="매장 선택" {...register("storeId")} />
      )}
    </form>
  );
}
```

---

## 8. Anti-patterns

- **Rule**: [MUST NOT] Replace security validation with client-side validation only, without server validation
- **Rule**: [MUST NOT] Catch errors in a catch block without providing any feedback to the user

```typescript
try { await submitForm(data); }
catch (error) { setFormError("요청 처리 중 오류가 발생했습니다. 다시 시도해주세요."); }
```

- **Rule**: [SHOULD NOT] Store form input state in a global store such as Zustand. Let React Hook Form manage the form state. The exception is when data needs to be persisted between steps in a multi-step form.
- **Rule**: [MUST NOT] Call an API on every input `onChange` event. Apply debounce or call at the `onBlur` point.

```typescript
const debouncedCheck = useDebouncedCallback(async (value: string) => {
  const exists = await checkEmailExists(value);
  if (exists) setError("email", { message: "이미 사용 중인 이메일입니다" });
}, 500);
```