# 폼 컨벤션

> 이 문서는 폼 처리와 유효성 검사 패턴을 정의합니다.
> 상위 규칙: [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)

---

## 1. 폼 라이브러리

- **규칙**: [MUST] React Hook Form + Zod 조합을 사용한다
- **이유**: Zod는 스키마 기반으로 타입 안전한 유효성 검사를 제공하며, `z.infer`를 통해 TypeScript 타입을 자동 추론할 수 있어 스키마와 타입의 이중 관리가 불필요하다. React Hook Form은 비제어 컴포넌트 기반으로 동작하여 렌더링 횟수를 최소화하고, `zodResolver`를 통해 Zod 스키마를 직접 연동할 수 있다.

---

## 2. Zod 스키마 패턴

### 스키마 위치

- **규칙**: [SHOULD] Zod 스키마는 feature 폴더 내부 또는 프로젝트 루트의 `schemas/` 디렉토리에 배치한다
- **이유**: 특정 feature에만 사용되는 스키마는 해당 feature 폴더에, 여러 feature에서 공유하는 스키마는 `schemas/` 디렉토리에 두어 응집도와 재사용성을 모두 확보한다.

### 공통 스키마 재사용

- **규칙**: [SHOULD] email, password, phone 등 반복 사용되는 검증 규칙은 `lib/schemas/common.ts`에 공통 스키마로 정의하고 재사용한다
- **이유**: 동일한 검증 규칙이 여러 폼에 분산되면 규칙 변경 시 누락이 발생하기 쉽다. 공통 스키마를 한 곳에서 관리하면 검증 규칙의 일관성을 보장할 수 있다.
- **좋은 예시**:
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
- **나쁜 예시**:
```typescript
// 각 폼마다 동일한 검증 규칙을 중복 정의 — 메시지 불일치 위험
const LoginSchema = z.object({ email: z.string().email("올바른 이메일 형식이 아닙니다") });
const SignupSchema = z.object({ email: z.string().email("이메일 형식이 아닙니다") });
```

### 타입 추출

- **규칙**: [MUST] 폼 데이터 타입은 `z.infer<typeof schema>`로 추출한다. 별도의 interface를 수동으로 작성하지 않는다.
- **이유**: 스키마와 타입을 별도로 관리하면 둘 사이의 불일치가 발생할 수 있다. `z.infer`를 사용하면 스키마가 단일 진실 공급원(Single Source of Truth)이 되어 타입 안전성이 보장된다.
- **좋은 예시**:
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
- **나쁜 예시**:
```typescript
const CreateUserSchema = z.object({ name: z.string().min(2), email: z.string().email() });
// 스키마와 별도로 interface를 수동 정의 — 불일치 위험
interface CreateUserFormData {
  name: string;
  email: string;
  phone?: string; // 스키마에는 없는 필드
}
```

---

## 3. React Hook Form + @sellernote/design-system 연동

- **규칙**: [MUST] `@sellernote/design-system` 컴포넌트와 React Hook Form의 `Controller`를 사용하여 폼 필드를 연결한다
- **이유**: DS의 `TextField`, `Select` 등은 `value`/`onChange` 패턴을 따르므로 React Hook Form의 `Controller`와 자연스럽게 연동된다.
- **규칙**: [MUST] `useForm`에 `zodResolver`를 설정하고, `mode: 'onBlur'`를 기본으로 사용한다
- **이유**: `zodResolver`는 Zod 스키마를 React Hook Form의 유효성 검사 체계에 연결한다. `mode: 'onBlur'`는 사용자가 필드를 떠날 때 검증하여 입력 중 피로감을 줄이면서도 제출 전 피드백을 제공한다.
- **좋은 예시**:
```typescript
"use client";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField, PasswordField, ActionButton } from "@sellernote/design-system";
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
- **나쁜 예시**:
```typescript
// zodResolver 없이 useForm을 사용 — 타입 안전한 검증이 누락됨
const { register, handleSubmit } = useForm<LoginFormData>();
return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <Input {...register("email")} placeholder="이메일" />
  </form>
);
```

---

## 4. 유효성 검사 전략

- **규칙**: [MUST] 클라이언트와 서버 양쪽 모두에서 유효성 검사를 수행한다 (이중 검증 원칙)
- **이유**: 클라이언트 검증은 사용자 경험을 개선하지만 브라우저 개발자 도구로 우회할 수 있다. 서버 검증은 데이터 무결성과 보안의 최종 방어선이다.
- **규칙**: [MUST] 클라이언트 측 검증은 `onBlur` 시점에 필드별로 수행하여 즉시 피드백을 제공한다
- **이유**: 사용자가 필드를 떠나는 시점에 에러를 표시하면, 입력 중 방해받지 않으면서도 다음 필드로 넘어가기 전에 문제를 인지할 수 있다.
- **규칙**: [MUST] Server Action 또는 API 엔드포인트에서 동일한 Zod 스키마로 최종 검증을 수행한다
- **이유**: 같은 Zod 스키마를 클라이언트와 서버에서 공유하면 검증 규칙의 일관성이 보장되며, 악의적인 요청을 차단한다.
- **규칙**: [MUST NOT] 클라이언트 검증만으로 보안 검증을 대체하지 않는다
- **이유**: 클라이언트 측 코드는 사용자가 임의로 수정하거나 API를 직접 호출하여 우회할 수 있으므로, 보안 관련 검증은 반드시 서버에서 수행해야 한다.

---

## 5. 에러 표시 패턴

### 필드별 인라인 에러

- **규칙**: [MUST] 필드별 에러는 해당 필드 아래에 에러 메시지 컴포넌트로 표시한다
- **이유**: 에러 메시지가 해당 필드에 인접해 있어야 사용자가 어떤 필드에 문제가 있는지 즉시 파악할 수 있다.
- **좋은 예시**:
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

### 폼 레벨 에러

- **규칙**: [SHOULD] 서버 에러, 네트워크 에러 등 특정 필드에 귀속되지 않는 에러는 DS `Alert` 컴포넌트로 폼 상단에 표시한다
- **이유**: 폼 레벨 에러는 개별 필드와 연결할 수 없으므로, 폼 전체에 대한 에러임을 명확히 전달하는 별도의 영역이 필요하다.
- **좋은 예시**:
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

### 서버 에러 매핑

- **규칙**: [SHOULD] 서버에서 특정 필드에 대한 에러를 반환하면, `setError()`로 해당 필드에 에러를 매핑한다
- **이유**: 서버에서 발생한 에러(예: 이메일 중복)를 해당 필드에 직접 표시하면, 사용자가 어떤 입력을 수정해야 하는지 명확히 알 수 있다.
- **좋은 예시**:
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

## 6. Server Actions 폼 패턴

- **규칙**: [SHOULD] Next.js Server Actions와 React Hook Form을 연동하여 서버 측 검증과 데이터 처리를 수행한다
- **이유**: Server Actions를 활용하면 별도의 API 엔드포인트 없이 서버에서 직접 폼 데이터를 처리할 수 있으며, 동일한 Zod 스키마로 검증 규칙을 공유할 수 있다.
- **좋은 예시**:
```typescript
// actions/createUser.ts
"use server";
import { revalidatePath } from "next/cache";
import { CreateUserSchema } from "@/schemas/user";

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
// 클라이언트: Server Action 호출 후 서버 에러를 필드에 매핑
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

## 7. 복잡한 폼

### 다단계 폼 (Wizard)

- **규칙**: [SHOULD] 다단계 폼은 단계별로 Zod 스키마를 분리하고, Zustand store에 단계 간 임시 데이터를 저장한다
- **이유**: 각 단계의 스키마를 독립적으로 정의하면 단계별 유효성 검사가 가능하고, 스키마 변경 시 다른 단계에 영향을 주지 않는다. Zustand에 임시 데이터를 저장하면 단계 이동 시 이전 입력값을 유지할 수 있다.
- **좋은 예시**:
```typescript
// schemas/signup-wizard.ts — 단계별 스키마 분리
export const Step1Schema = z.object({ email: emailSchema, password: passwordSchema });
export const Step2Schema = z.object({ name: z.string().min(2), phone: phoneSchema });
export const Step3Schema = z.object({ company: z.string().min(1), role: z.enum(["developer", "designer", "manager"]) });
export const SignupWizardSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema);

// store/slices/signupWizardSlice.ts — 단계 간 데이터 유지
export const useSignupWizardStore = create<SignupWizardState>((set) => ({
  currentStep: 1,
  formData: {},
  setStepData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: state.currentStep - 1 })),
  reset: () => set({ currentStep: 1, formData: {} }),
}));
```

### 동적 필드

- **규칙**: [SHOULD] 동적으로 추가/삭제되는 필드 목록은 `useFieldArray`를 사용한다
- **이유**: `useFieldArray`는 배열 형태의 필드를 효율적으로 관리하며, 추가/삭제 시 불필요한 리렌더링을 최소화한다. 수동으로 배열 상태를 관리하면 인덱스 관리와 유효성 검사 연동이 복잡해진다.
- **좋은 예시**:
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

### 조건부 필드

- **규칙**: [SHOULD] 특정 필드 값에 따라 다른 필드를 표시/숨김 처리할 때는 `watch()`로 값을 감시하고 조건부 렌더링한다
- **이유**: `watch()`는 특정 필드의 값 변경을 구독하여 실시간으로 UI를 업데이트한다. 조건부 필드의 유효성 검사는 Zod의 `discriminatedUnion`으로 처리하여 스키마 레벨에서 관리한다.
- **좋은 예시**:
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
      {/* RadioGroup으로 method 선택 */}
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

## 8. 안티패턴

### 클라이언트만 검증

- **규칙**: [MUST NOT] 서버 검증 없이 클라이언트 검증만으로 보안 검증을 대체한다
- **이유**: 클라이언트 코드는 브라우저 개발자 도구로 수정하거나 API를 직접 호출하여 완전히 우회할 수 있다.
- **나쁜 예시**:
```typescript
export async function createUser(formData: FormData) {
  const data = Object.fromEntries(formData);
  await db.user.create({ data }); // Zod 검증 없이 바로 저장 — 위험!
}
```

### 에러 무시

- **규칙**: [MUST NOT] catch 블록에서 에러를 잡은 후 사용자에게 아무런 피드백을 제공하지 않는다
- **이유**: 사용자가 폼을 제출했는데 아무 반응이 없으면 시스템 오류인지, 성공인지 알 수 없다.
- **나쁜 예시**:
```typescript
try { await submitForm(data); }
catch (error) { console.error(error); } // 콘솔에만 출력하고 사용자에게는 미표시
```
- **좋은 예시**:
```typescript
try { await submitForm(data); }
catch (error) { setFormError("요청 처리 중 오류가 발생했습니다. 다시 시도해주세요."); }
```

### 폼 상태의 전역 스토어 저장

- **규칙**: [SHOULD NOT] 폼의 입력 상태를 Zustand 등 전역 스토어에 저장한다. React Hook Form이 폼 상태를 관리하도록 한다. 다단계 폼에서 단계 간 데이터를 유지해야 하는 경우는 예외이다.
- **이유**: React Hook Form은 자체적으로 폼 상태를 관리하며, 전역 스토어에 중복 저장하면 상태 동기화 문제와 불필요한 리렌더링이 발생한다.
- **나쁜 예시**:
```typescript
const useFormStore = create((set) => ({ email: "", setEmail: (email: string) => set({ email }) }));
export function LoginForm() {
  const { email, setEmail } = useFormStore();
  return <Input value={email} onChange={(e) => setEmail(e.target.value)} />; // 동기화 문제 발생
}
```

### input onChange마다 API 호출

- **규칙**: [MUST NOT] input의 `onChange` 이벤트마다 API를 호출한다. debounce를 적용하거나 `onBlur` 시점에 호출한다.
- **이유**: 매 키 입력마다 API를 호출하면 불필요한 네트워크 요청이 대량 발생하고, 응답 순서가 보장되지 않아 race condition이 발생할 수 있다.
- **나쁜 예시**:
```typescript
<Input onChange={async (e) => {
  const exists = await checkEmailExists(e.target.value); // 매 키 입력마다 호출
}} />
```
- **좋은 예시**:
```typescript
const debouncedCheck = useDebouncedCallback(async (value: string) => {
  const exists = await checkEmailExists(value);
  if (exists) setError("email", { message: "이미 사용 중인 이메일입니다" });
}, 500);
// Controller 내부에서 field.onChange와 함께 debouncedCheck 호출
```

---

## 9. 참고 자료

- [React Hook Form 공식 문서](https://react-hook-form.com)
- [Zod 공식 문서](https://zod.dev)
- [@sellernote/design-system](https://github.com/sellernote/sellernote-design-system)
- [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)
