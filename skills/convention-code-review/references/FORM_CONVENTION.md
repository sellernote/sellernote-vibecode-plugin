# Form Convention

> This document defines form handling and validation patterns.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Form Library

- **Rule**: [MUST] Use the React Hook Form + Zod combination

---

## 2. Zod Schema Patterns

### Schema Location

- **Rule**: [SHOULD] Place Zod schemas inside the feature folder or in the `schemas/` directory at the project root

### Common Schema Reuse

- **Rule**: [SHOULD] Define frequently used validation rules such as email, password, phone as common schemas in `lib/schemas/common.ts` and reuse them
- **Good Example**:
```typescript
// lib/schemas/common.ts
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
- **Good Example**:
```typescript
import { emailSchema, passwordSchema, phoneSchema } from "@/lib/schemas/common";

export const CreateUserSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다"),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
});
export type CreateUserFormData = z.infer<typeof CreateUserSchema>;
```
---

## 3. React Hook Form Integration

- **Rule**: [MUST] Connect form fields using React Hook Form's `Controller`
- **Rule**: [MUST] Set `zodResolver` in `useForm` and use `mode: 'onBlur'` as the default
- **Good Example**:
```typescript
// LoginForm.tsx
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailSchema, passwordSchema } from "@/lib/schemas/common";

const LoginSchema = z.object({ email: emailSchema, password: passwordSchema });
type LoginFormData = z.infer<typeof LoginSchema>;

export function LoginForm() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });
  return (
    <form onSubmit={handleSubmit((data) => login(data))} noValidate className="flex flex-col gap-4">
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">이메일</label>
            <input
              id="email"
              type="email"
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              {...field}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>
        )}
      />
      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">비밀번호</label>
            <input
              id="password"
              type="password"
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              {...field}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password && (
              <p id="password-error" className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>
        )}
      />
      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
```
### FormProvider (When Separating Field Components)

- **Rule**: [SHOULD] When separating form fields into separate components, use `FormProvider` + `useFormContext()`
- **Good Example**:

```typescript
// features/user/components/create-user-form/CreateUserForm.tsx
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NameField } from "./NameField";

export function CreateUserForm() {
  const methods = useForm<CreateUserFormData>({
    resolver: zodResolver(CreateUserSchema),
    mode: "onBlur",
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <NameField />
        <button type="submit">생성</button>
      </form>
    </FormProvider>
  );
}

// features/user/components/create-user-form/NameField.tsx
import { useFormContext } from "react-hook-form";

export function NameField() {
  const { register, formState: { errors } } = useFormContext<CreateUserFormData>();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="name" className="text-sm font-medium text-gray-700">이름</label>
      <input
        id="name"
        className="rounded border border-gray-300 px-3 py-2 text-sm"
        {...register("name")}
        aria-invalid={!!errors.name}
      />
      {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
    </div>
  );
}
```

> **Note**: If all fields are within the same component, it is sufficient to pass the `control` prop directly to `Controller` without using FormProvider.

---

## 4. Validation Strategy

- **Rule**: [MUST] Perform validation on both the client and server sides (dual validation principle)
- **Rule**: [MUST] Perform client-side validation per field at the `onBlur` timing to provide immediate feedback
- **Rule**: [MUST] Perform final validation at the API endpoint using the same Zod schema
- **Rule**: [MUST NOT] Replace security validation with client-side validation alone

---

## 5. Error Display Patterns

### Per-Field Inline Errors

- **Rule**: [MUST] Display per-field errors as error messages below the corresponding field
- **Good Example**:
```typescript
<Controller
  name="email"
  control={control}
  render={({ field }) => (
    <div className="flex flex-col gap-1">
      <label htmlFor="email" className="text-sm font-medium text-gray-700">이메일</label>
      <input
        id="email"
        type="email"
        className="rounded border border-gray-300 px-3 py-2 text-sm"
        {...field}
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? "email-error" : undefined}
      />
      {errors.email && (
        <p id="email-error" className="text-xs text-red-600">{errors.email.message}</p>
      )}
    </div>
  )}
/>
```

### Form-Level Errors

- **Rule**: [SHOULD] Display errors that are not attributable to a specific field, such as server errors or network errors, in an error message area at the top of the form
- **Good Example**:
```typescript
const [formError, setFormError] = useState<string | null>(null);
return (
  <form onSubmit={handleSubmit(onSubmit)}>
    {formError && (
      <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        {formError}
      </div>
    )}
    {/* Form fields */}
  </form>
);
```

### Server Error Mapping

- **Rule**: [SHOULD] When the server returns an error for a specific field, map the error to that field using `setError()`
- **Good Example**:
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

## 6. Server Data Mutation Patterns

- **Rule**: [SHOULD] Handle server data mutations through form submission by integrating TanStack Query `useMutation` with React Hook Form
- **Good Example**:
```typescript
// features/user/api/use-create-user-mutation.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateUserSchema, type CreateUserFormData } from "@/features/user/schemas/user-create-schema";
import { apiClient } from "@/lib/api-client";

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserFormData) => apiClient.post("/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
```
```typescript
// features/user/components/create-user-form/CreateUserForm.tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateUserSchema, type CreateUserFormData } from "@/features/user/schemas/user-create-schema";
import { useCreateUserMutation } from "@/features/user/api/use-create-user-mutation";

export function CreateUserForm() {
  const { control, handleSubmit, setError, formState: { errors } } = useForm<CreateUserFormData>({
    resolver: zodResolver(CreateUserSchema),
    mode: "onBlur",
  });
  const mutation = useCreateUserMutation();

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      if (error instanceof ApiError && error.field) {
        setError(error.field as keyof CreateUserFormData, {
          type: "server",
          message: error.message,
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-gray-700">이름</label>
            <input
              id="name"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              {...field}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>
        )}
      />
      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "생성 중..." : "생성"}
      </button>
    </form>
  );
}
```

---

## 7. Complex Forms

### Multi-Step Forms (Wizard)

- **Rule**: [SHOULD] For multi-step forms, separate Zod schemas per step and store interim data between steps in a Zustand store
- **Good Example**:
```typescript
// schemas/signup-wizard.ts — Separate schemas per step
import { z } from "zod";
import { emailSchema, passwordSchema, phoneSchema } from "@/lib/schemas/common";

export const Step1Schema = z.object({ email: emailSchema, password: passwordSchema });
export const Step2Schema = z.object({ name: z.string().min(2), phone: phoneSchema });
export const Step3Schema = z.object({ company: z.string().min(1), role: z.enum(["developer", "designer", "manager"]) });
export const SignupWizardSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema);

// store/slices/signup-wizard-slice.ts — Maintain data between steps
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
- **Good Example**:
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
        <div key={field.id} className="flex items-center gap-4">
          <Controller name={`items.${index}.name`} control={control}
            render={({ field }) => (
              <input
                className="rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="상품명"
                {...field}
              />
            )} />
          <button
            type="button"
            className="rounded border border-gray-300 px-2 py-2 text-sm disabled:opacity-50"
            onClick={() => remove(index)}
            disabled={fields.length === 1}
            aria-label="삭제"
          >
            삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        className="rounded border border-gray-300 px-4 py-2 text-sm"
        onClick={() => append({ name: "", quantity: 1 })}
      >
        상품 추가
      </button>
    </form>
  );
}
```

### Conditional Fields

- **Rule**: [SHOULD] When showing/hiding fields based on a specific field value, use `watch()` to observe the value and conditionally render
- **Good Example**:
```typescript
const ShippingSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("delivery"), address: z.string().min(1, "주소를 입력해주세요") }),
  z.object({ method: z.literal("pickup"), storeId: z.string().min(1, "매장을 선택해주세요") }),
]);

export function ShippingForm() {
  const { control, watch, handleSubmit, formState: { errors } } = useForm<z.infer<typeof ShippingSchema>>({
    resolver: zodResolver(ShippingSchema),
    defaultValues: { method: "delivery", address: "" },
  });
  const method = watch("method");
  return (
    <form>
      {/* RadioGroup for method selection */}
      {method === "delivery" && (
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <TextField
              label="배송 주소"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              status={errors.address ? "error" : undefined}
              helperText={errors.address?.message}
            />
          )}
        />
      )}
      {method === "pickup" && (
        <Controller
          name="storeId"
          control={control}
          render={({ field }) => (
            <TextField
              label="매장 선택"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              status={errors.storeId ? "error" : undefined}
              helperText={errors.storeId?.message}
            />
          )}
        />
      )}
    </form>
  );
}
```

### Async Validation

- **Rule**: [SHOULD] Perform async validations such as email duplication checks at the `onBlur` timing with debounce applied
- **Good Example**:
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedCheck = useDebouncedCallback(async (value: string) => {
  const exists = await checkEmailExists(value);
  if (exists) setError("email", { message: "이미 사용 중인 이메일입니다" });
}, 500);

// Call debouncedCheck along with field.onChange inside Controller
```

---

## 8. Anti-Patterns

### Client-Only Validation

- **Rule**: [MUST NOT] Replace security validation with client-side validation alone without server validation
- **Bad Example**:
```typescript
// Sending directly without Zod validation on API call — dangerous!
const onSubmit = async (formData: FormData) => {
  const data = Object.fromEntries(formData);
  await apiClient.post("/users", data); // Trusting only client validation without server validation
};
```

### Ignoring Errors

- **Rule**: [MUST NOT] Catch errors in a catch block without providing any feedback to the user
- **Bad Example**:
```typescript
try { await submitForm(data); }
catch (error) { console.error(error); } // Only logging to console without displaying to the user
```
- **Good Example**:
```typescript
try { await submitForm(data); }
catch (error) { setFormError("요청 처리 중 오류가 발생했습니다. 다시 시도해주세요."); }
```

### Storing Form State in Global Store

- **Rule**: [SHOULD NOT] Store form input state in a global store such as Zustand. Let React Hook Form manage the form state. The exception is when interim data needs to be maintained between steps in a multi-step form.

### API Calls on Every input onChange

- **Rule**: [MUST NOT] Call APIs on every `onChange` event of an input. Apply debounce or call at the `onBlur` timing instead.
- **Bad Example**:
```typescript
<Input onChange={async (e) => {
  const exists = await checkEmailExists(e.target.value); // Called on every keystroke
}} />
```