"use client";

import { useEffect, useState, type FormEvent } from "react";

import { formatInstantDay } from "@/components/unified/conceptFormat";
import type { StudentEntity } from "@/contracts/class.contract";
import {
  STUDENT_LOGIN_ID_RULE,
  studentAccountIssueRequestSchema,
  type StudentAccountPanel as PanelData,
  type StudentAccountStatus,
} from "@/contracts/studentAccount.contract";
import { lockLineNextChangeMs, lockMinutesLeft } from "@/lib/class/accountLock";
import {
  fetchAccountPanel,
  issueAccount,
  reissuePassword,
  setAccountDisabled,
} from "@/lib/class/studentAccountApi";

import s from "./StudentAccountPanel.module.css";

type PanelState =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "error" }
  | { status: "ready"; data: PanelData };

/**
 * 원장님 «수업 · 학생 관리 › 학생» 안의 **오늘의 개념 로그인** 칸 — 시안 1안 `issue()`(05 §8.9 · D-125 ⑴).
 * 한 명씩이다(D-124 ⑷) — 명단에서 학생 이름을 누르면 그 학생의 칸이 선다(`StudentList`).
 *
 * - 발급 전: 학생 이름을 기본 아이디로 채우고, 동명이인이면 관리자가 조정할 수 있다.
 * - 만든 직후: 아이디 · 발급 날짜 · 발급한 사람 · 마지막 로그인 · «초기 비밀번호 — 지금 한 번만 보입니다» ·
 *   «비밀번호 다시 발급» · «계정 끄기». 끈 계정은 «계정 켜기»(시안에 없는 상태 — 최소한으로).
 * - 퇴원한 학생은 «퇴원 — 로그인 막힘» 한 줄(D-126 ⑺ — 서버가 로그인을 막는다). 발급하지 않는다.
 * - 🔴 잠긴 계정(연속 5회 틀림)은 «잠김 — N분 뒤 풀림 · 비밀번호를 다시 발급하면 바로 풀립니다.» 한 줄(D-127 Q5) —
 *   서버가 준 `lockedUntil` 이 **지금보다 뒤일 때만**(N 은 `lockMinutesLeft`). 끈 계정 · 퇴원 계정은 그쪽 줄이 먼저다.
 * - 서버가 거부한 학생(남의 반 403 · 없는 학생 404)은 칸을 안 그린다.
 *
 * 🔴 초기 비밀번호는 **이 칸의 상태에만** 산다 — localStorage · sessionStorage · URL · 로그 어디에도 안 적는다.
 *    칸이 사라지면(다른 학생을 고르면 · 화면을 벗어나면) 같이 사라진다(«저장하지 않아 다시 볼 수 없습니다»).
 */
export function StudentAccountPanel({
  student,
  onClose,
  title = "오늘의 개념 로그인",
  onChanged,
}: {
  student: Pick<StudentEntity, "id" | "name">;
  onClose?: () => void;
  title?: string;
  onChanged?: () => void;
}) {
  const [state, setState] = useState<PanelState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [pin, setPin] = useState<string | null>(null);
  const [loginId, setLoginId] = useState(student.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void fetchAccountPanel(student.id).then((result) => {
      if (!alive) return;
      if (result.ok) setState({ status: "ready", data: result.data });
      else setState({ status: result.hidden ? "hidden" : "error" });
    });
    return () => {
      alive = false;
    };
  }, [student.id, attempt]);

  function setAccount(account: StudentAccountStatus) {
    setState((prev) =>
      prev.status === "ready"
        ? { status: "ready", data: { ...prev.data, account } }
        : prev,
    );
  }

  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } finally {
      setBusy(false);
    }
  }

  function onIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      const parsed = studentAccountIssueRequestSchema.safeParse({ loginId });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "아이디를 확인해 주세요.");
        return;
      }
      const result = await issueAccount(student.id, parsed.data.loginId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPin(result.data.initialPassword);
      // 방금 이 원장님이 만든 계정이다 — 응답에 실린 칸만으로 상태를 세운다(마지막 로그인 없음)
      setAccount({
        studentId: result.data.studentId,
        loginId: result.data.loginId,
        issuedAt: result.data.issuedAt,
        issuedByViewer: true,
        lastLoginAt: null,
        passwordChangedAt: null,
        disabledAt: null,
        mustChangePassword: true,
        locked: false,
        lockedUntil: null,
      });
      onChanged?.();
    });
  }

  function onReissue(account: StudentAccountStatus) {
    void run(async () => {
      const result = await reissuePassword(student.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPin(result.data.initialPassword);
      // 다시 발급은 잠금도 푼다(서버가 `lockedUntil` 을 비운다) — 잠김 줄이 같이 사라진다
      setAccount({
        ...account,
        mustChangePassword: true,
        locked: false,
        lockedUntil: null,
      });
      onChanged?.();
    });
  }

  function onDisabled(disabled: boolean) {
    void run(async () => {
      const result = await setAccountDisabled(student.id, disabled);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setAccount(result.data);
      onChanged?.();
    });
  }

  if (state.status === "hidden") return null;
  if (state.status === "loading")
    return (
      <p role="status" className="mt-3 text-[12.5px] text-text-2">
        계정 정보를 불러오는 중…
      </p>
    );

  const headingId = `student-account-${student.id}`;
  return (
    <section
      id={`${headingId}-panel`}
      className={s.card}
      aria-labelledby={headingId}
    >
      <p className={s.who}>{student.name}</p>
      <div className={s.headingRow}>
        <h3 id={headingId} className={s.title}>
          {title}
        </h3>
        {onClose ? (
          <button
            type="button"
            className={s.button}
            onClick={onClose}
            aria-label={`${student.name} 계정 정보 닫기`}
          >
            닫기
          </button>
        ) : null}
      </div>
      {state.status === "error" ? (
        <>
          <p role="alert" className={s.error}>
            계정 정보를 불러오지 못했습니다.
          </p>
          <div className={s.acts}>
            <button
              type="button"
              className={s.button}
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              다시 불러오기
            </button>
          </div>
        </>
      ) : (
        <PanelBody
          data={state.data}
          pin={pin}
          busy={busy}
          error={error}
          loginId={loginId}
          onLoginId={setLoginId}
          onIssue={onIssue}
          onReissue={onReissue}
          onDisabled={onDisabled}
        />
      )}
    </section>
  );
}

function PanelBody({
  data,
  pin,
  busy,
  error,
  loginId,
  onLoginId,
  onIssue,
  onReissue,
  onDisabled,
}: {
  data: PanelData;
  pin: string | null;
  busy: boolean;
  error: string;
  loginId: string;
  onLoginId: (value: string) => void;
  onIssue: (event: FormEvent<HTMLFormElement>) => void;
  onReissue: (account: StudentAccountStatus) => void;
  onDisabled: (disabled: boolean) => void;
}) {
  const { account, withdrawn } = data;
  const errorLine = error ? (
    <p role="alert" className={s.error}>
      {error}
    </p>
  ) : null;

  // 🔴 퇴원 — 로그인이 막힌다(D-126 ⑺). 발급·다시 발급·끄기를 내지 않는다
  if (withdrawn)
    return (
      <>
        {account ? <AccountFacts account={account} /> : null}
        <p className={s.blocked}>퇴원 — 로그인 막힘</p>
      </>
    );

  if (!account)
    return (
      <>
        <p className={s.sub}>
          아직 로그인 계정이 없습니다. 계정을 생성하면 학생이 로그인할 수
          있습니다.
        </p>
        <form
          className={s.form}
          onSubmit={onIssue}
          noValidate
          aria-label="오늘의 개념 로그인 만들기"
        >
          <label className={s.field}>
            <span>아이디</span>
            <input
              className={`${s.input} ${s.mono}`}
              value={loginId}
              onChange={(event) => onLoginId(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={STUDENT_LOGIN_ID_RULE.maxLength}
            />
          </label>
          <p className={s.hint}>
            이름·영문·숫자·공백·-·_ {STUDENT_LOGIN_ID_RULE.minLength}~
            {STUDENT_LOGIN_ID_RULE.maxLength}자
          </p>
          {errorLine}
          <div className={s.acts}>
            <button type="submit" className={s.primary} disabled={busy}>
              계정 생성
            </button>
          </div>
        </form>
      </>
    );

  return (
    <>
      <AccountFacts account={account} />
      {account.disabledAt ? (
        <p className={s.blocked}>계정 꺼짐 — 로그인 막힘</p>
      ) : (
        <LockLine lockedUntil={account.lockedUntil} />
      )}
      {pin ? (
        <div className={s.once}>
          <p className={s.onceK}>초기 비밀번호 — 지금 한 번만 보입니다</p>
          <b className={`${s.onceV} ${s.mono}`}>{pin}</b>
          <p className={s.onceN}>
            저장하지 않아 다시 볼 수 없습니다. 학생에게 전하면 첫 로그인에서 새
            비밀번호로 바꿉니다.
          </p>
        </div>
      ) : null}
      {errorLine}
      <div className={s.acts}>
        {account.disabledAt ? (
          <button
            type="button"
            className={s.button}
            disabled={busy}
            onClick={() => onDisabled(false)}
          >
            계정 켜기
          </button>
        ) : (
          <>
            <button
              type="button"
              className={s.button}
              disabled={busy}
              onClick={() => onReissue(account)}
            >
              비밀번호 다시 발급
            </button>
            <button
              type="button"
              className={s.quiet}
              disabled={busy}
              onClick={() => onDisabled(true)}
            >
              계정 끄기
            </button>
          </>
        )}
      </div>
    </>
  );
}

/**
 * 🔴 잠김 — 서버가 준 끝 시각이 지금보다 뒤일 때만(D-127 Q5). 잠금 규칙을 여기서 다시 적지 않는다.
 * 칸을 열어 둔 채면 **N 이 바뀌는 순간마다** 다시 센다(D-128 ⑶ — 리드) — 잠금이 끝나면 줄이 스스로 사라진다.
 * 칸이 선 때의 시각 하나로 세면 몇 분이 지나도 N 이 그대로이고, 끝난 잠금의 줄이 남았다(보고서 §7-19).
 */
function LockLine({ lockedUntil }: { lockedUntil: string | null }) {
  const [now, setNow] = useState(() => new Date());
  const wait = lockLineNextChangeMs(lockedUntil, now);
  useEffect(() => {
    if (wait === null) return;
    const id = setTimeout(() => setNow(new Date()), wait);
    return () => clearTimeout(id);
  }, [wait, now]);
  const minutes = lockMinutesLeft(lockedUntil, now);
  if (minutes === null) return null;
  return (
    <p className={s.blocked}>
      {`잠김 — ${minutes}분 뒤 풀림 · 비밀번호를 다시 발급하면 바로 풀립니다.`}
    </p>
  );
}

function AccountFacts({ account }: { account: StudentAccountStatus }) {
  return (
    <dl className={s.kv}>
      <dt>아이디</dt>
      <dd className={s.mono}>{account.loginId}</dd>
      <dt>발급</dt>
      <dd>
        {formatInstantDay(account.issuedAt)}
        {account.issuedByViewer ? " · 원장님" : ""}
      </dd>
      <dt>마지막 로그인</dt>
      <dd>
        {account.lastLoginAt ? formatInstantDay(account.lastLoginAt) : "없음"}
      </dd>
    </dl>
  );
}
