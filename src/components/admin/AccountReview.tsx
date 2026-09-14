"use client";

import { useEffect, useRef, useState } from "react";
import {
  WORKSPACE_MENUS,
  type ManagedAccount,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import {
  AccountRequestError,
  accountRequest,
  reloadManagedAccount,
  requestMessage,
} from "./accountRequests";
import s from "./admin.module.css";

export const STATUS_LABELS = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "승인 거절",
} as const;

export function AccountStatus({ account }: { account: ManagedAccount }) {
  return (
    <span className={`${s.badge} ${s[account.approvalStatus]}`}>
      {account.isAdmin ? "관리자" : STATUS_LABELS[account.approvalStatus]}
    </span>
  );
}

export function accountDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export default function AccountReview({
  account,
  onLockChange,
  onUpdate,
}: {
  account: ManagedAccount;
  onLockChange: (locked: boolean) => void;
  onUpdate: (account: ManagedAccount) => void;
}) {
  const [menus, setMenus] = useState<WorkspaceMenu[]>(account.menus);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dirty =
    menus.length !== account.menus.length ||
    menus.some((menu) => !account.menus.includes(menu));

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function changeMenus(menu: WorkspaceMenu) {
    const next = menus.includes(menu)
      ? menus.filter((item) => item !== menu)
      : [...menus, menu];
    setMenus(next);
    setNotice(null);
    onLockChange(
      next.length !== account.menus.length ||
        next.some((item) => !account.menus.includes(item)),
    );
  }

  async function save(approvalStatus?: "approved" | "rejected") {
    if (busyRef.current || conflict || account.isAdmin) return;
    busyRef.current = true;
    setBusy(true);
    onLockChange(true);
    setError(null);
    setNotice(null);
    setConfirmReject(false);
    try {
      const result = await accountRequest<{ data: ManagedAccount }>(
        `/api/admin/users/${encodeURIComponent(account.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedUpdatedAt: account.updatedAt,
            ...(approvalStatus ? { approvalStatus } : {}),
            ...(approvalStatus !== "rejected" ? { menus } : {}),
          }),
        },
      );
      setMenus(result.data.menus);
      onUpdate(result.data);
      setNotice(
        approvalStatus === "approved"
          ? "계정을 승인하고 선택한 메뉴를 저장했습니다."
          : approvalStatus === "rejected"
            ? "가입 승인을 거절했습니다."
            : "사용 가능한 메뉴를 저장했습니다.",
      );
      onLockChange(false);
    } catch (cause) {
      const stale =
        cause instanceof AccountRequestError && cause.status === 409;
      setConflict(stale);
      setAuthError(
        cause instanceof AccountRequestError &&
          [401, 403].includes(cause.status),
      );
      setError(
        stale
          ? "다른 관리자가 이 계정을 변경했습니다. 최신 정보를 불러온 뒤 메뉴를 다시 확인해 주세요."
          : requestMessage(cause),
      );
      onLockChange(dirty);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function reload() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    onLockChange(true);
    try {
      const latest = await reloadManagedAccount(account);
      setMenus(latest.menus);
      onUpdate(latest);
      setConflict(false);
      setError(null);
      setAuthError(false);
      setNotice(
        "최신 정보를 불러왔습니다. 이전 변경안은 초기화되었으니 다시 확인해 주세요.",
      );
      onLockChange(false);
    } catch (cause) {
      setError(requestMessage(cause));
      onLockChange(dirty);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  return (
    <section
      className={s.review}
      aria-labelledby="review-title"
      aria-busy={busy}
    >
      <div className={s.sectionHeading}>
        <span className={s.eyebrow}>ACCOUNT REVIEW</span>
        <AccountStatus account={account} />
      </div>
      <h2
        id="review-title"
        className={s.reviewName}
        tabIndex={-1}
        ref={headingRef}
      >
        {account.name || "이름 미등록"}
      </h2>
      <p className={s.email}>{account.email}</p>
      <dl className={s.facts}>
        <div>
          <dt>가입일</dt>
          <dd>{accountDate(account.createdAt)}</dd>
        </div>
        <div>
          <dt>계정 유형</dt>
          <dd>{account.role === "reviewer" ? "검수자" : "원장·선생님"}</dd>
        </div>
      </dl>
      {account.isAdmin ? (
        <p className={s.note}>
          관리자 계정은 보호됩니다. 승인 상태와 메뉴 권한을 이 화면에서 변경할
          수 없습니다.
        </p>
      ) : null}
      <fieldset
        className={s.menuFieldset}
        disabled={busy || conflict || authError || account.isAdmin}
      >
        <legend>
          사용 가능한 메뉴{" "}
          <span>
            {account.isAdmin ? WORKSPACE_MENUS.length : menus.length} /{" "}
            {WORKSPACE_MENUS.length}
          </span>
        </legend>
        <p className={s.help}>
          승인된 계정은 선택한 메뉴만 이용할 수 있습니다.
        </p>
        <div className={s.menuGrid}>
          {WORKSPACE_MENUS.map((menu) => (
            <label key={menu.id} className={s.menuOption}>
              <input
                type="checkbox"
                checked={account.isAdmin || menus.includes(menu.id)}
                onChange={() => changeMenus(menu.id)}
              />
              <span>{menu.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {!account.isAdmin && menus.length === 0 ? (
        <p className={s.note}>
          선택한 메뉴가 없습니다. 승인해도 작업실에서 사용할 수 있는 메뉴가
          없습니다.
        </p>
      ) : null}
      {error ? (
        <div role="alert" className={s.error}>
          <p>{error}</p>
          {conflict ? (
            <>
              <p>
                최신 정보를 불러오면 저장하지 않은 메뉴 선택이 초기화됩니다.
              </p>
              <button
                type="button"
                className={s.secondary}
                onClick={reload}
                disabled={busy}
              >
                {busy ? "불러오는 중…" : "최신 정보 불러오기"}
              </button>
            </>
          ) : null}
          {authError ? (
            <a className={s.textLink} href="/admin">
              로그인 상태 다시 확인
            </a>
          ) : null}
        </div>
      ) : null}
      {notice ? (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      ) : null}
      {!account.isAdmin ? (
        <div className={s.reviewActions}>
          {dirty ? (
            <p className={s.unsaved}>
              저장하지 않은 메뉴 변경이 있습니다. 저장하거나 취소한 뒤 다른
              계정을 선택하세요.
            </p>
          ) : null}
          <div className={s.buttonRow}>
            <button
              className={s.secondary}
              type="button"
              disabled={!dirty || busy || conflict || authError}
              onClick={() => save()}
            >
              {" "}
              {busy ? "처리 중…" : "메뉴 변경 저장"}
            </button>
            {dirty ? (
              <button
                className={s.quiet}
                type="button"
                disabled={busy}
                onClick={() => {
                  setMenus(account.menus);
                  onLockChange(false);
                  setNotice(null);
                }}
              >
                변경 취소
              </button>
            ) : null}
          </div>
          {account.approvalStatus !== "approved" ? (
            <div className={s.approvalActions}>
              <p className={s.help}>
                {account.approvalStatus === "rejected"
                  ? "거절한 계정도 검토 후 다시 승인할 수 있습니다."
                  : "메뉴를 확인한 뒤 가입 요청을 처리하세요."}
              </p>
              <button
                className={s.primary}
                type="button"
                disabled={busy || conflict || authError}
                onClick={() => save("approved")}
              >
                {busy ? "처리 중…" : "계정 승인 · 메뉴 저장"}
              </button>
              {account.approvalStatus === "pending" ? (
                <button
                  className={s.reject}
                  type="button"
                  disabled={busy || conflict || authError || dirty}
                  onClick={() => setConfirmReject(true)}
                >
                  승인 거절
                </button>
              ) : null}
              {confirmReject ? (
                <div
                  className={s.confirm}
                  role="group"
                  aria-label="승인 거절 확인"
                >
                  <p>
                    이 계정의 가입 승인을 거절할까요? 작업실을 이용할 수 없게
                    됩니다.
                  </p>
                  <div className={s.buttonRow}>
                    <button
                      className={s.reject}
                      type="button"
                      disabled={busy}
                      onClick={() => save("rejected")}
                    >
                      거절 확정
                    </button>
                    <button
                      className={s.secondary}
                      type="button"
                      onClick={() => setConfirmReject(false)}
                    >
                      돌아가기
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
