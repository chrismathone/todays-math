"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  WORKSPACE_MENUS,
  workspaceMenuOptionsOf,
  type WorkspaceMenu,
  type WorkspaceProduct,
} from "@/contracts/accountAccess.contract";
import type {
  BranchResponse,
  BranchSummary,
} from "@/contracts/branchAdmin.contract";
import {
  AccountRequestError,
  accountRequest,
  requestMessage,
} from "./accountRequests";
import s from "./admin.module.css";

const TABS = [
  { id: "math", label: "오늘 수학" },
  { id: "english", label: "오늘 영어" },
] as const;

export default function BranchMenuEditor({
  branch,
  onUpdate,
  onLockChange,
}: {
  branch: BranchSummary;
  onUpdate: (branch: BranchSummary) => void;
  onLockChange: (locked: boolean) => void;
}) {
  const [menus, setMenus] = useState<WorkspaceMenu[]>(branch.menus);
  const [product, setProduct] = useState<WorkspaceProduct>("math");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const added = WORKSPACE_MENUS.filter(
    (menu) => menus.includes(menu.id) && !branch.menus.includes(menu.id),
  );
  const removed = WORKSPACE_MENUS.filter(
    (menu) => !menus.includes(menu.id) && branch.menus.includes(menu.id),
  );
  const dirty = added.length + removed.length > 0;
  useEffect(() => {
    onLockChange(dirty || busy);
  }, [dirty, busy, onLockChange]);

  async function reload() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await accountRequest<BranchResponse>(
        `/api/admin/branches/${encodeURIComponent(branch.id)}`,
      );
      setMenus(result.data.menus);
      onUpdate(result.data);
      setConflict(false);
      setNotice(
        "최신 지점 설정을 불러왔습니다. 이전 변경안은 초기화되었습니다.",
      );
    } catch (cause) {
      setError(requestMessage(cause));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function save() {
    if (busyRef.current || conflict || !dirty) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await accountRequest<BranchResponse>(
        `/api/admin/branches/${encodeURIComponent(branch.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menus,
            expectedMenuRevision: branch.menuRevision,
          }),
        },
      );
      setMenus(result.data.menus);
      onUpdate(result.data);
      setNotice("지점 사용 메뉴를 저장했습니다. 다음 요청부터 반영됩니다.");
    } catch (cause) {
      const stale =
        cause instanceof AccountRequestError && cause.status === 409;
      setConflict(stale);
      setError(
        stale
          ? "다른 관리자가 지점 메뉴를 변경했습니다. 최신 설정을 불러온 뒤 다시 확인해 주세요."
          : requestMessage(cause),
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      className={s.branchPanel}
      aria-labelledby={`${id}-heading`}
      aria-busy={busy}
    >
      <h2 id={`${id}-heading`}>지점 사용 메뉴</h2>
      <p className={s.help}>
        이 지점의 원장·관리자·강사 모두에게 적용됩니다. 개인 메뉴 선택과 기존
        자료는 보존되며, 지점 메뉴를 다시 켜면 개인 설정에 따라 사용할 수
        있습니다.
      </p>
      <div className={s.menuTabs} role="tablist" aria-label="지점 메뉴 제품">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${id}-tab-${tab.id}`}
            aria-controls={`${id}-panel-${tab.id}`}
            aria-selected={product === tab.id}
            tabIndex={product === tab.id ? 0 : -1}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            onClick={() => setProduct(tab.id)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % TABS.length
                  : event.key === "ArrowLeft"
                    ? (index + TABS.length - 1) % TABS.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? TABS.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              setProduct(TABS[next].id);
              tabRefs.current[next]?.focus();
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${id}-panel-${tab.id}`}
          aria-labelledby={`${id}-tab-${tab.id}`}
          hidden={product !== tab.id}
        >
          <fieldset className={s.menuFieldset} disabled={busy || conflict}>
            <legend>{tab.label}</legend>
            <div className={s.menuGrid}>
              {workspaceMenuOptionsOf(tab.id, branch.id).map((option) => (
                <label key={option.id} className={s.menuOption}>
                  <input
                    type="checkbox"
                    checked={menus.includes(option.permission)}
                    onChange={() => {
                      setMenus((current) =>
                        current.includes(option.permission)
                          ? current.filter((menu) => menu !== option.permission)
                          : [...current, option.permission],
                      );
                      setNotice("");
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ))}
      <div
        className={s.menuChangeSummary}
        aria-label="지점 메뉴 변경 요약"
        aria-live="polite"
      >
        <p>
          사용 메뉴 {menus.length}개 · 적용 대상: 이 지점의 원장·관리자·강사
        </p>
        {dirty ? (
          <>
            <p>켜기: {added.map((menu) => menu.label).join(", ") || "없음"}</p>
            <p>
              끄기: {removed.map((menu) => menu.label).join(", ") || "없음"}
            </p>
            <p>저장한 뒤 메뉴 접근에 반영됩니다.</p>
          </>
        ) : (
          <p>저장하지 않은 변경이 없습니다.</p>
        )}
        {menus.length === 0 ? (
          <p className={s.note}>
            사용할 수 있는 메뉴가 없습니다. 내 정보·로그아웃과 허용된 관리
            화면은 계속 이용할 수 있습니다.
          </p>
        ) : null}
      </div>
      {error ? (
        <div role="alert" className={s.error}>
          <p>{error}</p>
          {conflict ? (
            <>
              <p>최신 설정을 불러오면 저장하지 않은 변경안이 초기화됩니다.</p>
              <button
                className={s.secondary}
                type="button"
                onClick={() => void reload()}
                disabled={busy}
              >
                최신 설정 불러오기
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {notice ? (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      ) : null}
      <div className={s.buttonRow}>
        <button
          type="button"
          className={s.primary}
          disabled={!dirty || busy || conflict}
          onClick={() => void save()}
        >
          {busy ? "처리 중…" : "사용 메뉴 저장"}
        </button>
        <button
          type="button"
          className={s.secondary}
          disabled={!dirty || busy}
          onClick={() => {
            setMenus(branch.menus);
            setNotice("");
          }}
        >
          변경 취소
        </button>
      </div>
    </section>
  );
}
