"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";

import {
  CREDENTIALS_ERROR,
  fieldErrorsFromResponse,
  fieldErrorsFromZod,
} from "./authErrors";
import { AuthField } from "./AuthField";
import { normalizeCallbackUrl } from "@/lib/callbackUrl";
import { studentLoginDestination } from "@/lib/learn/studentReturnTo";
import { LOGIN_LANDING } from "@/lib/loginLanding";
import styles from "./auth.module.css";

type AuthFormProps = {
  mode: "login" | "signup";
  callbackUrl?: string;
  /** 초록 안내 줄 자리에 띄울 한 줄 — eywa 연결 대기 안내(D-139 ⑹). 가입 접수 안내가 뜨면 그쪽이 앞선다 */
  notice?: string;
};
const RETRY_LOGIN =
  "가입은 완료됐지만 로그인하지 못했어요. 아래에서 다시 로그인해 주세요.";

export function AuthForm({ mode, callbackUrl, notice }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const destination = normalizeCallbackUrl(callbackUrl);
  const alternatePath = isSignup ? "/login" : "/signup";
  const alternateHref =
    destination === "/"
      ? alternatePath
      : `${alternatePath}?${new URLSearchParams({ callbackUrl: destination })}`;
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const submitting = useRef(false);
  const accountCreated = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  // SSR cannot safely submit credentials before React has attached onSubmit.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  function showFieldErrors(next: Record<string, string>) {
    setErrors(next);
    setAlert(next.form ?? "입력한 내용을 확인해 주세요.");
    const firstField = Object.keys(next).find((key) =>
      ["email", "password", "name"].includes(key),
    );
    if (firstField)
      (
        formRef.current?.elements.namedItem(
          firstField,
        ) as HTMLInputElement | null
      )?.focus();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setErrors({});
    setAlert("");
    let succeeded = false;

    try {
      const loginId = identifier.trim();
      if (!isSignup && !loginId) {
        showFieldErrors({
          email: "이메일 또는 학생 아이디를 입력해 주세요.",
        });
        return;
      }

      // 학생 아이디에는 @가 없다. 인증 실패 시 다른 공급자로 재시도하지 않는다.
      if (!isSignup && !loginId.includes("@")) {
        const [{ studentLoginRequestSchema }, { postLogin }] =
          await Promise.all([
            import("@/contracts/studentAccount.contract"),
            import("@/components/learn/learnApi"),
          ]);
        const parsed = studentLoginRequestSchema.safeParse({
          loginId,
          password,
        });
        if (!parsed.success) {
          const { loginId: identifierError, ...fieldErrors } =
            fieldErrorsFromZod(parsed.error);
          showFieldErrors({
            ...(identifierError ? { email: identifierError } : {}),
            ...fieldErrors,
          });
          return;
        }
        const result = await postLogin(
          parsed.data.loginId,
          parsed.data.password,
        );
        if (!result.ok) {
          setAlert(result.message);
          return;
        }
        // 학생에게 허용된 교재 QR만 이어 간다. 선생님용 주소는 /learn으로 돌아간다.
        router.replace(
          studentLoginDestination(callbackUrl, result.data.mustChangePassword),
        );
        router.refresh();
        succeeded = true;
        setNavigating(true);
        return;
      }

      // Keep the schema out of the initial bundle, with import failures inside the recovery boundary.
      const { authLoginRequestSchema, authSignupRequestSchema } =
        await import("@/contracts/auth.contract");
      const credentials = { email: loginId, password };
      if (isSignup && !accountCreated.current) {
        const parsed = authSignupRequestSchema.safeParse({
          ...credentials,
          name: name.trim(),
        });
        if (!parsed.success) {
          showFieldErrors(fieldErrorsFromZod(parsed.error));
          return;
        }
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        if (!res.ok) {
          showFieldErrors(await fieldErrorsFromResponse(res));
          return;
        }
        // Persist this phase before attempting sign-in: retries must never create the user again.
        accountCreated.current = true;
        setCreated(true);
      } else {
        const parsed = authLoginRequestSchema.safeParse(credentials);
        if (!parsed.success) {
          showFieldErrors(fieldErrorsFromZod(parsed.error));
          return;
        }
      }

      const result = await signIn("credentials", {
        ...credentials,
        redirect: false,
        redirectTo: destination,
      });
      // Auth.js v5 can return HTTP 200 / ok:true alongside CredentialsSignin.
      if (result?.ok !== true || result.error) {
        setAlert(accountCreated.current ? RETRY_LOGIN : CREDENTIALS_ERROR);
        return;
      }
      // D-140 ⑶ — 기본 목적지 로그인은 `/` 가 역할로 첫 화면을 고른다(강사 → 내 반, `loginLanding.ts`)
      router.push(
        !isSignup && destination === "/" ? LOGIN_LANDING : destination,
      );
      router.refresh();
      succeeded = true;
      setNavigating(true);
    } catch {
      setAlert(
        accountCreated.current
          ? RETRY_LOGIN
          : "연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      if (!succeeded) {
        submitting.current = false;
        setPending(false);
      }
    }
  }

  const submitLabel = navigating
    ? isSignup
      ? "작업실로 이동 중…"
      : "이동 중…"
    : pending
      ? created || !isSignup
        ? "로그인 중…"
        : "가입 중…"
      : created
        ? "다시 로그인"
        : isSignup
          ? "가입하고 시작하기"
          : "로그인";

  return (
    <form
      ref={formRef}
      method="post"
      noValidate
      onSubmit={onSubmit}
      className={styles.form}
      aria-labelledby="auth-title"
      aria-busy={pending}
    >
      <div className={styles.formIntro}>
        <p className={styles.eyebrow}>
          {isSignup ? "YOUR FIRST PAGE" : "WELCOME BACK"}
        </p>
        <h1 id="auth-title">
          {isSignup ? "선생님의 작업실을 열어요" : "다시 만나 반가워요"}
        </h1>
        <p>
          {isSignup
            ? "가입을 신청하면 관리자 승인 후 작업실을 사용할 수 있어요."
            : "오늘의 수업과 학습, 이어서 시작해 볼까요?"}
        </p>
      </div>
      {created ? (
        <p role="status" className={styles.success}>
          가입 신청이 접수됐어요. 로그인 후 승인 상태를 확인할 수 있어요.
        </p>
      ) : notice ? (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      ) : null}
      {alert ? (
        <p role="alert" className={styles.alert}>
          {alert}
        </p>
      ) : null}
      <div className={styles.fields}>
        {isSignup ? (
          <AuthField
            id="name"
            name="name"
            label="이름"
            type="text"
            autoComplete="name"
            placeholder="선생님 이름"
            required
            maxLength={50}
            value={name}
            error={errors.name}
            disabled={created}
            readOnly={pending}
            onChange={(event) => setName(event.target.value)}
          />
        ) : null}
        <AuthField
          id="email"
          name="email"
          label={isSignup ? "이메일" : "이메일 또는 학생 아이디"}
          type={isSignup ? "email" : "text"}
          inputMode={isSignup ? "email" : "text"}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={
            isSignup ? "teacher@example.com" : "이메일 또는 학생 아이디"
          }
          hint={
            isSignup
              ? undefined
              : "선생님은 이메일, 학생은 발급받은 아이디를 입력하세요."
          }
          required
          maxLength={255}
          value={identifier}
          error={errors.email}
          readOnly={created || pending}
          onChange={(event) => setIdentifier(event.target.value)}
        />
        <AuthField
          id="password"
          name="password"
          label="비밀번호"
          type="password"
          autoComplete={
            isSignup && !created ? "new-password" : "current-password"
          }
          placeholder={
            isSignup ? "8자 이상 입력해 주세요" : "비밀번호를 입력해 주세요"
          }
          required
          value={password}
          error={errors.password}
          hint={
            isSignup && !created
              ? "8자 이상 · 한글과 특수문자도 사용할 수 있어요."
              : undefined
          }
          readOnly={pending}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={pending || !hydrated}
        className={styles.submit}
      >
        <span>{submitLabel}</span>
        <span aria-hidden="true">{pending ? "···" : "↗"}</span>
      </button>
      <p className={styles.switchLine}>
        <span>
          {isSignup ? "이미 계정이 있나요?" : "오늘 수학이 처음인가요?"}
        </span>
        <Link href={alternateHref}>
          {isSignup ? "로그인" : "회원가입"}
          <span aria-hidden="true"> →</span>
        </Link>
      </p>
      <p className={styles.formNote}>
        문제를 고르고, 다듬고, 한 장으로.
        <br />
        수업을 준비하는 선생님 곁에 오늘 수학.
      </p>
    </form>
  );
}

function subscribeNever() {
  return () => {};
}
