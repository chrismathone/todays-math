"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { isEasyPin, isPinFormat } from "@/lib/concept/pinRules";

import { postPasswordChange } from "./learnApi";
import s from "./learn.module.css";
import { LearnTopBar } from "./LearnTopBar";
import { pinDigits } from "./StudentLoginForm";

/**
 * 첫 로그인 — 비밀번호 바꾸기. 시안 `sPw` 에 🔴 **«선생님께 받은 번호» 칸을 맨 위에** 더했다(D-126 ⑹ —
 * 원장님이 다시 발급하시면 전에 들어와 있던 기기가 새 번호를 모른 채 바꾸지 못해야 다시 발급이 효력을 갖는다.
 * 서버는 이미 지금 번호를 요구한다 — `currentPassword`).
 *
 * 규칙 줄은 D-125 ⑶(숫자 4자리)으로 바꿔 적었다 — 시안의 «8자 이상 · 영문과 숫자»는 D-125 전에 그려진 것.
 * 판정은 계약(`studentPasswordChangeRequestSchema` → `studentNewPinSchema`)과 그 계약이 부르는
 * `pinRules` 가 한다 — 여기서 규칙을 다시 적지 않는다. 받은 번호가 틀리거나 잠기면 서버 문구 그대로.
 *
 * 🔴 윗줄 «나가기»(D-127 Q1) — 목록 화면 윗줄과 **같은 부품 · 같은 자리**(`LearnTopBar` → `POST /api/learn/logout`
 * → `/learn/login`). 다른 학생 아이디로 잘못 들어온 학생이 받은 번호를 몰라도 갇히지 않는다. 관문은 이미
 * 첫 로그인 학생에게 로그아웃을 연다(`EXIT_RULES`) — `proxy.ts` · `studentRouteAccess.ts` 는 그대로다.
 *
 * 🔴 D-128(원장님 답 17 ① · 18 ①) — 윗줄을 둔 뒤 그 아래 큰 로고가 «오늘의수학»을 한 번 더 세웠다 → **로고를 뺐다**
 * (로그인 화면은 윗줄이 없어 로고 그대로). 윗줄에는 **이름만** — 반은 목록 API 가 주고 이 화면은 목록을 안 부른다.
 * 이름은 페이지가 세션에서 읽어 넘긴다(`app/learn/password/page.tsx`) — 잘못 들어온 학생이 윗줄에서 바로 안다.
 */
export function StudentPasswordForm({
  studentName,
}: {
  /** 윗줄 이름 — 세션의 학생 이름(D-128 ⑵). 없으면 «나가기»만 */
  studentName: string | null;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  const rules = [
    { label: "숫자 4자리", met: isPinFormat(next) },
    {
      label: "같은 숫자 반복·연속 숫자 안 됨",
      met: isPinFormat(next) && !isEasyPin(next),
    },
    { label: "두 칸이 같음", met: next !== "" && next === again },
  ];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      if (next !== again) {
        setError("두 칸이 같지 않습니다.");
        return;
      }
      const { studentPasswordChangeRequestSchema, STUDENT_LOGIN_MESSAGES } =
        await import("@/contracts/studentAccount.contract");
      const parsed = studentPasswordChangeRequestSchema.safeParse({
        currentPassword: current,
        newPassword: next,
      });
      if (!parsed.success) {
        setError(
          parsed.error.issues[0]?.message ?? "입력한 내용을 확인하세요.",
        );
        return;
      }
      const result = await postPasswordChange(current, next);
      if (result.ok) {
        router.replace("/learn");
        router.refresh();
        return;
      }
      // 받은 번호가 틀린 401 이 아니면 학생 세션이 없는 것이다 — 학생 로그인으로
      if (
        result.status === 401 &&
        result.message !== STUDENT_LOGIN_MESSAGES.wrongCurrentPin
      ) {
        router.replace("/learn/login");
        return;
      }
      setError(result.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className={s.column}>
      <LearnTopBar student={studentName ? { name: studentName } : null} />
      <main className={s.login}>
        <p className={s.kick}>처음 들어왔습니다</p>
        <h1 className={s.h}>새 비밀번호를 정하세요</h1>
        <p className={s.help}>선생님께 받은 비밀번호는 이번 한 번만 씁니다.</p>
        <form
          className={s.form}
          onSubmit={(event) => void onSubmit(event)}
          noValidate
          aria-label="비밀번호 바꾸기"
          aria-busy={pending}
        >
          <PinField
            label="선생님께 받은 번호"
            name="currentPassword"
            autoComplete="current-password"
            allowExtendedPassword
            value={current}
            onChange={setCurrent}
          />
          <PinField
            label="새 비밀번호"
            name="newPassword"
            autoComplete="new-password"
            value={next}
            onChange={setNext}
          />
          <PinField
            label="한 번 더"
            name="newPasswordAgain"
            autoComplete="new-password"
            value={again}
            onChange={setAgain}
          />
          <ul className={s.rules} aria-label="새 비밀번호 규칙">
            {rules.map((rule) => (
              <li key={rule.label} data-met={rule.met ? "true" : "false"}>
                {rule.label}
              </li>
            ))}
          </ul>
          {error ? (
            <p role="alert" className={s.error}>
              {error}
            </p>
          ) : null}
          <button type="submit" className={s.primary} disabled={pending}>
            {pending ? "바꾸는 중…" : "바꾸고 들어가기"}
          </button>
        </form>
      </main>
    </div>
  );
}

function PinField({
  label,
  name,
  autoComplete,
  allowExtendedPassword = false,
  value,
  onChange,
}: {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  allowExtendedPassword?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={s.field}>
      <span>{label}</span>
      <input
        className={s.input}
        name={name}
        type="password"
        inputMode={allowExtendedPassword ? undefined : "numeric"}
        pattern={allowExtendedPassword ? undefined : "[0-9]*"}
        autoComplete={autoComplete}
        maxLength={allowExtendedPassword ? 72 : 4}
        value={value}
        onChange={(event) =>
          onChange(
            allowExtendedPassword
              ? event.target.value
              : pinDigits(event.target.value),
          )
        }
        required
      />
    </label>
  );
}
