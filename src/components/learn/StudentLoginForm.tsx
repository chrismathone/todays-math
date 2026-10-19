"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { postLogin } from "./learnApi";
import s from "./learn.module.css";

/**
 * 숫자만 · 4자에서 멈춘다(D-125 ⑶). 입력을 다듬기만 한다 — 판정은 계약(`studentLoginRequestSchema` ·
 * `studentNewPinSchema`)이 한다(learn-screens 브리프 §1.1 «다시 적지 않는다»).
 */
export function pinDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

/**
 * 학생 로그인 — 시안 `sLogin`(05 §8.9 · D-125 ⑴ 1안). 원장님이 발급한 아이디와 비밀번호.
 * 부르는 것은 `POST /api/learn/login` 하나(Auth.js 학생 공급자). 실패 문구는 서버 문구 그대로.
 */
export function StudentLoginForm() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const { studentLoginRequestSchema } =
        await import("@/contracts/studentAccount.contract");
      const parsed = studentLoginRequestSchema.safeParse({
        loginId,
        password: pin,
      });
      if (!parsed.success) {
        setError(
          parsed.error.issues[0]?.message ?? "입력한 내용을 확인하세요.",
        );
        return;
      }
      const result = await postLogin(parsed.data.loginId, parsed.data.password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace(
        result.data.mustChangePassword ? "/learn/password" : "/learn",
      );
      router.refresh();
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className={s.column}>
      <main className={s.login}>
        <div className={s.brand}>
          <b>오늘 수학</b>
          <span>오늘의 개념 · 학생</span>
        </div>
        <div className={s.loginIntro}>
          <p>내 수학 학습 공간</p>
          <h1>
            오늘 배운 내용을
            <br /> 내 것으로 만들어요.
          </h1>
          <span>선생님께 받은 아이디와 비밀번호로 들어오세요.</span>
        </div>
        <form
          className={s.form}
          onSubmit={(event) => void onSubmit(event)}
          noValidate
          aria-label="학생 로그인"
          aria-busy={pending}
        >
          <label className={s.field}>
            <span>아이디</span>
            <input
              className={s.input}
              name="loginId"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={50}
              required
            />
          </label>
          <label className={s.field}>
            <span>비밀번호</span>
            <input
              className={s.input}
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={72}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              required
            />
          </label>
          {error ? (
            <p role="alert" className={s.error}>
              {error}
            </p>
          ) : null}
          <button type="submit" className={s.primary} disabled={pending}>
            {pending ? "들어가는 중…" : "들어가기"}
          </button>
        </form>
        <p className={s.help}>
          처음이면 선생님께 받은 비밀번호로 들어온 뒤 새 비밀번호로 바꿉니다.
        </p>
        <Link href="/login" className={s.alt}>
          원장님 로그인 ›
        </Link>
      </main>
    </div>
  );
}
