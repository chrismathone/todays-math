"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import AdminSignOut from "@/components/admin/AdminSignOut";
import {
  AccountRequestError,
  accountRequest,
  requestMessage,
} from "@/components/admin/accountRequests";
import s from "./pending.module.css";

export default function ApprovalPending({
  account: initialAccount,
}: {
  account: AccountAccess;
}) {
  const [account, setAccount] = useState(initialAccount);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const rejected = account.approvalStatus === "rejected";

  async function checkAccess() {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setError(null);
    setMessage(null);
    try {
      const result = await accountRequest<{ data: AccountAccess }>(
        "/api/account/access",
      );
      if (result.data.approvalStatus === "approved") {
        setMessage("승인되었습니다. 작업실로 이동합니다.");
        router.replace("/");
        router.refresh();
      } else {
        setAccount(result.data);
        setMessage(
          result.data.approvalStatus === "rejected"
            ? "확인했습니다. 현재 가입 승인이 거절된 상태입니다."
            : "확인했습니다. 아직 관리자의 승인을 기다리고 있습니다.",
        );
      }
    } catch (cause) {
      if (cause instanceof AccountRequestError && cause.status === 401) {
        router.replace("/login?callbackUrl=%2Fapproval-pending");
      } else {
        setError(requestMessage(cause));
      }
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <span className={s.brand}>오늘 수학</span>
        <span className={s.headerLabel}>가입 승인 확인</span>
      </header>
      <main className={s.main}>
        <section className={s.card} aria-labelledby="pending-title">
          <div className={s.emblem} aria-hidden="true">
            {rejected ? (
              "—"
            ) : (
              <svg viewBox="0 0 40 40" fill="none">
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M20 11v10l6 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
          <p className={s.eyebrow}>YOUR WORKSPACE, ALMOST READY</p>
          <span className={`${s.status} ${rejected ? s.rejected : ""}`}>
            {rejected ? "승인 거절" : "승인 대기"}
          </span>
          <h1 id="pending-title">
            {rejected ? (
              <>
                가입 승인이
                <br />
                거절되었습니다.
              </>
            ) : (
              <>
                선생님의 작업실을
                <br />
                준비하고 있습니다.
              </>
            )}
          </h1>
          <p className={s.description}>
            {rejected
              ? "현재 이 계정으로 작업실을 이용할 수 없습니다. 가입 정보를 확인하고 소속 기관의 관리자에게 문의해 주세요."
              : "가입 신청이 접수되었습니다. 관리자가 계정을 승인하고 사용 가능한 메뉴를 설정하면 작업실을 이용할 수 있습니다."}
          </p>
          <div className={s.identity}>
            <span>신청한 계정</span>
            <strong>{account.name || "선생님"}</strong>
            <p>{account.email}</p>
          </div>
          {!rejected ? (
            <ol className={s.steps} aria-label="가입 진행 상태">
              <li>
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>가입 신청 완료</strong>
                  <p>계정이 등록되었습니다.</p>
                </div>
              </li>
              <li aria-current="step">
                <span aria-hidden="true">2</span>
                <div>
                  <strong>관리자 승인 대기</strong>
                  <p>승인 후 메뉴를 이용할 수 있습니다.</p>
                </div>
              </li>
            </ol>
          ) : null}
          <div className={s.actions}>
            <button
              className={s.primary}
              type="button"
              disabled={checking}
              aria-busy={checking}
              onClick={checkAccess}
            >
              {checking ? "승인 상태 확인 중…" : "승인 상태 새로고침"}
            </button>
            <AdminSignOut className={s.secondary} />
          </div>
          {error ? (
            <p className={s.error} role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className={s.notice} role="status">
              {message}
            </p>
          ) : null}
          <p className={s.footnote}>
            다른 계정을 사용하려면 로그아웃 후 다시 로그인하세요.
          </p>
        </section>
      </main>
      <footer className={s.footer}>
        오늘 수학 · 선생님의 다음 수업을 위해
      </footer>
    </div>
  );
}
