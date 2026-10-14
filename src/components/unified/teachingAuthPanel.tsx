"use client";

import { signIn } from "next-auth/react";
import WorkProgress from "./WorkProgress";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CREDENTIALS_ERROR,
  fieldErrorsFromResponse,
  fieldErrorsFromZod,
} from "@/components/auth/authErrors";
import s from "./TeachingView.module.css";

export function TeachingAuthPanel({
  onAuthenticated,
}: {
  onAuthenticated: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isSignup = mode === "signup";

  useEffect(() => {
    // Wait until pending inputs are enabled before moving to the first error.
    if (!pending && Object.keys(errors).length) {
      formRef.current
        ?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')
        ?.focus();
    }
  }, [errors, pending]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setErrors({});
    setNotice("");
    try {
      const { authLoginRequestSchema, authSignupRequestSchema } =
        await import("@/contracts/auth.contract");
      const parsed = isSignup
        ? authSignupRequestSchema.safeParse({
            email: email.trim(),
            password,
            name: name.trim(),
          })
        : authLoginRequestSchema.safeParse({ email: email.trim(), password });
      if (!parsed.success) {
        setErrors(fieldErrorsFromZod(parsed.error));
        return;
      }

      if (isSignup) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        if (!response.ok) {
          setErrors(await fieldErrorsFromResponse(response));
          return;
        }
        // If automatic sign-in fails, retry login without creating the account again.
        setMode("login");
        setNotice(
          "가입이 완료되었습니다. 같은 이메일과 비밀번호로 로그인해 주세요.",
        );
      }

      const result = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      // CredentialsSignin can arrive with HTTP 200 in the installed Auth.js beta.
      if (!result?.ok || result.error) {
        setErrors({
          password:
            result?.error === "CredentialsSignin"
              ? CREDENTIALS_ERROR
              : "로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
        return;
      }
      setPassword("");
      await onAuthenticated();
    } catch {
      setErrors({ form: "연결을 확인한 뒤 다시 시도해 주세요." });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <div className={s.authLayout}>
      <section className={s.authIntro} aria-labelledby="teaching-auth-intro">
        <span className={s.introIcon} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <circle cx="9" cy="8" r="3" />
            <path d="M3 21v-4a6 6 0 0 1 12 0v4M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" />
          </svg>
        </span>
        <p className={s.eyebrow}>나의 수업 공간</p>
        <h2 id="teaching-auth-intro">
          반과 학생, 진도를
          <br />
          한곳에서 관리하세요.
        </h2>
        <p className={s.introDescription}>
          사용 중인 오늘 수학 계정으로 로그인하면 내 반과 학생 정보를 바로
          이어서 관리할 수 있습니다.
        </p>
        <ul className={s.featureList}>
          <li>
            <span aria-hidden="true">01</span>
            <div>
              <strong>반 · 학생 관리</strong>
              <p>반을 만들고 학생을 등록하세요.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">02</span>
            <div>
              <strong>수업 진도 관리</strong>
              <p>반별 현재 단원과 다음 수업을 확인하세요.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">03</span>
            <div>
              <strong>오늘의 수업 진행</strong>
              <p>확인테스트와 반별 할 일을 이어가세요.</p>
            </div>
          </li>
        </ul>
      </section>

      <section className={s.authCard} aria-labelledby="teaching-auth-title">
        <div className={s.authModes} aria-label="계정 이용 방식">
          <button
            type="button"
            aria-pressed={!isSignup}
            disabled={pending}
            onClick={() => {
              setMode("login");
              setErrors({});
              setNotice("");
            }}
          >
            로그인
          </button>
          <button
            type="button"
            aria-pressed={isSignup}
            disabled={pending}
            onClick={() => {
              setMode("signup");
              setErrors({});
              setNotice("");
            }}
          >
            회원가입
          </button>
        </div>
        <h2 id="teaching-auth-title">
          {isSignup ? "수업 관리를 시작하세요" : "다시 만나 반갑습니다"}
        </h2>
        <p className={s.authDescription}>
          {isSignup
            ? "계정을 만들고 첫 반을 등록해 보세요."
            : "로그인하고 내 수업을 이어가세요."}
        </p>
        <form
          ref={formRef}
          method="post"
          noValidate
          onSubmit={(event) => void submit(event)}
          aria-label={isSignup ? "수업 관리 회원가입" : "수업 관리 로그인"}
          aria-busy={pending}
          className={s.authForm}
        >
          {isSignup ? (
            <AuthInput
              label="이름"
              field="name"
              autoComplete="name"
              value={name}
              onChange={setName}
              error={errors.name}
              disabled={pending}
              maxLength={50}
            />
          ) : null}
          <AuthInput
            label="이메일"
            field="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={setEmail}
            error={errors.email}
            disabled={pending}
            maxLength={255}
          />
          <AuthInput
            label="비밀번호"
            field="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={
              isSignup ? "8자 이상 입력해 주세요" : "비밀번호를 입력해 주세요"
            }
            value={password}
            onChange={setPassword}
            error={errors.password}
            disabled={pending}
            maxLength={72}
          />
          {notice ? (
            <p role="status" className={s.notice}>
              {notice}
            </p>
          ) : null}
          {errors.form ? (
            <p role="alert" className={s.fieldError}>
              {errors.form}
            </p>
          ) : null}
          <button type="submit" className={s.primaryButton} disabled={pending}>
            {pending ? (
              <WorkProgress variant="inline" label="계정을 확인하는 중…" />
            ) : isSignup ? (
              "가입하고 수업 시작하기"
            ) : (
              "로그인하고 계속하기"
            )}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className={s.authFootnote}>
          로그인 후에도 현재 작업실에서 계속할 수 있습니다.
        </p>
      </section>
    </div>
  );
}

function AuthInput({
  label,
  field,
  value,
  onChange,
  error,
  type = "text",
  ...props
}: {
  label: string;
  field: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete: string;
  placeholder?: string;
  disabled: boolean;
  maxLength: number;
}) {
  const id = `teaching-auth-${field}`;
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        name={field}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p role="alert" id={`${id}-error`} className={s.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
