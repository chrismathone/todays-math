"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WORKSPACE_PRODUCTS,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import type { BranchOwnerMenus } from "@/contracts/branchOwnerMenus.contract";
import admin from "@/components/admin/admin.module.css";
import s from "./BranchMenus.module.css";

/**
 * 지점관리 → 사용 메뉴(원장님 2026-10-19 · 원장만). 최고관리자가 연 메뉴 안에서 지점 전원의 메뉴를 켜고 끈다.
 * 에이와 원장이 바꾼 값도 같은 칸이라 이 화면을 열면 그대로 보인다(판 번호가 다르면 저장 전에 알린다).
 */
type Load = { data: BranchOwnerMenus } | { error: string };

async function request(init?: RequestInit): Promise<Load & { status: number }> {
  let response: Response;
  try {
    response = await fetch("/api/branch/menus", { cache: "no-store", ...init });
  } catch {
    // 네트워크가 끊겨도 '불러오는 중'·'처리 중'에 멈추지 않게 오류로 돌려준다.
    return {
      status: 0,
      error: "연결이 끊겼습니다. 잠시 뒤 다시 시도해 주세요.",
    };
  }
  const body = await response.json().catch(() => null);
  if (!response.ok)
    return {
      status: response.status,
      error: body?.error?.message ?? "사용 메뉴를 불러오지 못했습니다.",
    };
  return { status: response.status, data: body.data as BranchOwnerMenus };
}

const stateLabel = (open: boolean, on: boolean) =>
  !open ? "열리지 않음" : on ? "사용" : "끔";

export default function BranchMenus() {
  const [saved, setSaved] = useState<BranchOwnerMenus | null>(null);
  const [draft, setDraft] = useState<Set<WorkspaceMenu>>(new Set());
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const apply = (data: BranchOwnerMenus) => {
    setSaved(data);
    setDraft(new Set(data.items.filter((i) => i.on).map((i) => i.menu)));
  };
  const load = async (message?: string) => {
    setBusy(true);
    const result = await request();
    if ("data" in result) {
      apply(result.data);
      setError(null);
      setConflict(false);
      setNotice(message ?? null);
    } else setError(result.error);
    setBusy(false);
  };
  useEffect(() => {
    let alive = true;
    request().then((result) => {
      if (!alive) return;
      if ("data" in result) apply(result.data);
      else setError(result.error);
      setBusy(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const dirty = useMemo(
    () =>
      !!saved &&
      saved.items.some((item) => item.open && item.on !== draft.has(item.menu)),
    [saved, draft],
  );
  const toggle = (menu: WorkspaceMenu, on: boolean) => {
    setNotice(null);
    setDraft((prev) => {
      const next = new Set(prev);
      if (on) next.add(menu);
      else next.delete(menu);
      return next;
    });
  };
  const setProduct = (product: string, on: boolean) => {
    if (!saved) return;
    setNotice(null);
    setDraft((prev) => {
      const next = new Set(prev);
      for (const item of saved.items)
        if (item.product === product && item.open)
          if (on) next.add(item.menu);
          else next.delete(item.menu);
      return next;
    });
  };
  const save = async () => {
    if (!saved) return;
    setBusy(true);
    setError(null);
    const result = await request({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menus: saved.items
          .filter((i) => i.open && draft.has(i.menu))
          .map((i) => i.menu),
        expectedMenuRevision: saved.revision,
      }),
    });
    if ("data" in result) {
      apply(result.data);
      setNotice("지점 사용 메뉴를 저장했습니다.");
    } else {
      setError(result.error);
      setConflict(result.status === 409);
    }
    setBusy(false);
  };

  if (!saved)
    return (
      <section className={s.panel} aria-busy={busy}>
        {error ? (
          <p className={s.error} role="alert">
            {error}
          </p>
        ) : (
          <p className={s.help}>불러오는 중…</p>
        )}
      </section>
    );

  const onCount = saved.items.filter((i) => i.open && draft.has(i.menu)).length;
  return (
    <section className={s.panel} aria-busy={busy}>
      <p className={s.help}>
        이 지점의 원장·관리자·강사 모두에게 적용됩니다. 열리지 않은 메뉴는 켤 수
        없습니다. 에이와에서 바꾼 설정도 여기에 함께 반영됩니다.
      </p>
      <fieldset disabled={busy || conflict} className={s.fieldset}>
        <legend className="sr-only">지점 사용 메뉴</legend>
        <div className={s.cols}>
          {WORKSPACE_PRODUCTS.map((product) => {
            const items = saved.items.filter((i) => i.product === product.id);
            const open = items.filter((i) => i.open);
            return (
              <div key={product.id} className={s.box}>
                <div className={s.boxHead}>
                  <h2>{product.label}</h2>
                  <span className={s.count}>
                    {open.filter((i) => draft.has(i.menu)).length} / 열림{" "}
                    {open.length}
                  </span>
                  <span className={s.tools}>
                    <button
                      type="button"
                      onClick={() => setProduct(product.id, true)}
                    >
                      모두 켜기
                    </button>
                    <button
                      type="button"
                      onClick={() => setProduct(product.id, false)}
                    >
                      모두 끄기
                    </button>
                  </span>
                </div>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th className={s.check} />
                      <th>메뉴</th>
                      <th className={s.state}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const on = item.open && draft.has(item.menu);
                      return (
                        <tr
                          key={item.menu}
                          className={`${s.row} ${on ? s.on : ""}`}
                        >
                          <td className={s.check}>
                            <input
                              id={`branch-menu-${item.menu}`}
                              type="checkbox"
                              checked={on}
                              disabled={!item.open}
                              onChange={(e) =>
                                toggle(item.menu, e.target.checked)
                              }
                            />
                          </td>
                          <td>
                            <label
                              htmlFor={`branch-menu-${item.menu}`}
                              className={item.open ? undefined : s.closed}
                            >
                              {item.label}
                            </label>
                          </td>
                          <td className={s.state}>
                            <span
                              className={
                                !item.open
                                  ? s.stateClosed
                                  : on
                                    ? s.stateOn
                                    : s.stateOff
                              }
                            >
                              {stateLabel(item.open, on)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </fieldset>
      {error && (
        <p className={s.error} role="alert">
          {error}{" "}
          {conflict && (
            <button
              type="button"
              className={admin.secondary}
              onClick={() => load("최신 지점 설정을 불러왔습니다.")}
            >
              최신 설정 불러오기
            </button>
          )}
        </p>
      )}
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      <div className={s.foot}>
        <span className={s.summary} aria-live="polite">
          <strong>사용 메뉴 {onCount}개</strong> · 적용 대상: 이 지점의
          원장·관리자·강사 ·{" "}
          {dirty ? "저장하지 않은 변경이 있습니다." : "저장하지 않은 변경 없음"}
        </span>
        <button
          type="button"
          className={admin.secondary}
          disabled={busy || !dirty}
          onClick={() => {
            apply(saved);
            setNotice(null);
          }}
        >
          변경 취소
        </button>
        <button
          type="button"
          className={admin.primary}
          disabled={busy || !dirty || conflict}
          onClick={save}
        >
          사용 메뉴 저장
        </button>
      </div>
    </section>
  );
}
