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
import styles from "./auth.module.css";

type AuthFormProps = { mode: "login" | "signup"; callbackUrl?: string };
const RETRY_LOGIN =
  "가입은 완료됐지만 로그인하지 못했어요. 아래에서 다시 로그인해 주세요.";

export function AuthForm({ mode, callbackUrl }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const destination = normalizeCallbackUrl(callbackUrl);
  const alternatePath = isSignup ? "/login" : "/signup";
  const alternateHref =
    destination === "/"
      ? alternatePath
      : `${alternatePath}?${new URLSearchParams({ callbackUrl: destination })}`;
  const [email, setEmail] = useState("");
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
      // Keep the schema out of the initial bundle, with import failures inside the recovery boundary.
      const { authLoginRequestSchema, authSignupRequestSchema } =
        await import("@/contracts/auth.contract");
      const credentials = { email: email.trim(), password };
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
      router.push(destination);
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
    ? "작업실로 이동 중…"
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
            ? "계정을 만들고, 첫 학습지부터 시작해 보세요."
            : "오늘의 수업 준비, 이어서 시작해 볼까요?"}
        </p>
      </div>
      {created ? (
        <p role="status" className={styles.success}>
          계정이 만들어졌어요. 이제 로그인만 하면 돼요.
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
          label="이메일"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="teacher@example.com"
          required
          maxLength={255}
          value={email}
          error={errors.email}
          readOnly={created || pending}
          onChange={(event) => setEmail(event.target.value)}
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
          {isSignup ? "이미 계정이 있나요?" : "오늘의수학이 처음인가요?"}
        </span>
        <Link href={alternateHref}>
          {isSignup ? "로그인" : "회원가입"}
          <span aria-hidden="true"> →</span>
        </Link>
      </p>
      <p className={styles.formNote}>
        문제를 고르고, 다듬고, 한 장으로.
        <br />
        수업을 준비하는 선생님 곁에 오늘의수학.
      </p>
    </form>
  );
}

function subscribeNever() {
  return () => {};
}
