"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { accountListParams, accountListReturn } from "@/lib/adminReturn";
import { restoreAdminScroll, saveAdminScroll } from "@/lib/adminScroll";
import { replaceScreenQuery, useScreenQuery } from "@/hooks/useScreenQuery";
import type {
  AdminAccountsResponse,
  ManagedAccount,
} from "@/contracts/accountAccess.contract";
import AccountReview, {
  AccountStatus,
  accountDate,
  STATUS_LABELS,
} from "./AccountReview";
import AdminHeader from "./AdminHeader";
import AccountSyncBadge from "./AccountSyncBadge";
import {
  AccountRequestError,
  accountRequest,
  requestMessage,
} from "./accountRequests";
import s from "./admin.module.css";

type Filter = "all" | "suspended" | "deleted" | keyof typeof STATUS_LABELS;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "전체 계정" },
  ...Object.entries(STATUS_LABELS).map(([id, label]) => ({
    id: id as Filter,
    label,
  })),
  { id: "suspended", label: "정지" },
  { id: "deleted", label: "삭제" },
];

export default function AdminAccounts({
  identity,
  branchId,
  branchName = "미소속 계정",
  embedded = false,
  onLockChange,
  onAccountsChange,
}: {
  identity: { name: string; email: string };
  branchId: string;
  branchName?: string;
  embedded?: boolean;
  onLockChange?: (locked: boolean) => void;
  onAccountsChange?: () => void;
}) {
  const router = useRouter();
  const screenParams = useScreenQuery();
  const screenKey = screenParams.toString();
  const query = useMemo(() => {
    const values = accountListParams(new URLSearchParams(screenKey));
    return {
      q: values.get("q") ?? "",
      status: (values.get("status") ?? "all") as Filter,
      page: Number(values.get("page") ?? 1),
    };
  }, [screenKey]);
  const setQuery = (
    next: typeof query | ((current: typeof query) => typeof query),
  ) => {
    const value = typeof next === "function" ? next(query) : next;
    replaceScreenQuery({
      q: value.q,
      status: value.status,
      page: String(value.page),
    });
  };
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<AdminAccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [selected, setSelected] = useState<ManagedAccount | null>(null);
  const [locked, setLocked] = useState(false);
  const reviewTrigger = useRef<HTMLButtonElement | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const restoredScroll = useRef("");
  useEffect(() => {
    setSearch(query.q);
  }, [query.q]);
  const returnHref = (selection?: string) => {
    const params = new URLSearchParams(screenKey);
    if (selection) params.set("selection", selection);
    const href = accountListReturn(branchId, params);
    return (
      href +
      (typeof window !== "undefined" && window.location.hash === "#admin-main"
        ? "#admin-main"
        : "")
    );
  };
  useEffect(() => {
    if (!result || loading) return;
    const selection = screenParams.get("selection");
    if (selection && selected?.id !== selection) {
      const account = result.data.find((row) => row.id === selection);
      if (account) setSelected(account);
    }
    const href = returnHref();
    if (restoredScroll.current !== href) {
      restoredScroll.current = href;
      restoreAdminScroll(href, branchId);
    }
  }, [result, loading, screenKey, branchId]);

  function closeReview() {
    if (locked) return;
    setSelected(null);
    replaceScreenQuery({ selection: null });
    const trigger = reviewTrigger.current;
    if (trigger?.isConnected) trigger.focus();
    else searchInput.current?.focus();
  }

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q: query.q, branchId });
    if (query.status === "suspended" || query.status === "deleted")
      params.set("lifecycle", query.status);
    else params.set("status", query.status);
    params.set("page", String(query.page));
    params.set("pageSize", "25");
    accountRequest<AdminAccountsResponse>(`/api/admin/users?${params}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(
          1,
          Math.ceil(data.meta.total / data.meta.pageSize),
        );
        if (query.page > lastPage) {
          setQuery((current) => ({ ...current, page: lastPage }));
          return;
        }
        setResult(data);
        setLoading(false);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(requestMessage(cause));
        setAuthError(
          cause instanceof AccountRequestError &&
            [401, 403].includes(cause.status),
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [query, revision, branchId]);

  useEffect(() => {
    onLockChange?.(locked);
  }, [locked, onLockChange]);

  useEffect(() => {
    if (!locked) return;
    const preventLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", preventLeave);
    return () => window.removeEventListener("beforeunload", preventLeave);
  }, [locked]);

  function reload() {
    setLoading(true);
    setError(null);
    setAuthError(false);
    setRevision((value) => value + 1);
  }

  function changeQuery(next: typeof query) {
    setLoading(true);
    setError(null);
    setAuthError(false);
    setQuery(next);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changeQuery({ ...query, q: search.trim(), page: 1 });
  }

  const pages = result
    ? Math.max(1, Math.ceil(result.meta.total / result.meta.pageSize))
    : 1;
  const filterCount = (filter: Filter) =>
    filter === "suspended" || filter === "deleted"
      ? (result?.meta.lifecycleCounts?.[filter] ?? 0)
      : (result?.meta.counts[filter] ?? 0);

  return (
    <div
      className={embedded ? undefined : s.shell}
      onClickCapture={(event) => {
        if (
          locked &&
          event.target instanceof Element &&
          event.target.closest("a")
        )
          event.preventDefault();
      }}
    >
      <a className={s.skipLink} href="#admin-main">
        계정 관리로 바로가기
      </a>
      {embedded ? null : <AdminHeader identity={identity} />}
      <div className={embedded ? undefined : s.main} id="admin-main">
        <div className={s.titleRow}>
          <div>
            <p className={s.eyebrow}>ADMIN / ACCOUNTS</p>
            <h2>
              계정 관리 <span className={s.titleAccent}>/ {branchName}</span>
            </h2>
            <p className={s.subtitle}>
              현재 지점의 가입 요청, 사용 메뉴와 계정 상태를 관리합니다.
            </p>
          </div>
          <button
            className={s.secondary}
            type="button"
            onClick={reload}
            disabled={loading}
          >
            목록 새로고침
          </button>
        </div>
        <section className={s.summaryGrid} aria-label="계정 현황">
          {(
            [
              {
                id: "all",
                label: "전체 계정",
                value: result?.meta.counts.all,
                hint: "활성 목록",
              },
              {
                id: "pending",
                label: "승인 대기",
                value: result?.meta.counts.pending,
                hint: "검토 필요",
              },
              {
                id: "approved",
                label: "승인 완료",
                value: result?.meta.counts.approved,
                hint: "사용 가능",
              },
              {
                id: "suspended",
                label: "정지 계정",
                value: result?.meta.lifecycleCounts?.suspended,
                hint: "접속 중지",
              },
            ] as const
          ).map((item) => (
            <div key={item.id} className={s.summaryCard}>
              <span>{item.label}</span>
              <strong>{item.value?.toLocaleString("ko-KR") ?? "—"}</strong>
              <small>{item.hint}</small>
            </div>
          ))}
        </section>
        <div className={s.workspace}>
          <section className={s.directory} aria-labelledby="directory-title">
            <div className={s.directoryHeading}>
              <h2 id="directory-title">가입 계정</h2>
              <span>
                {result
                  ? `${result.meta.counts.all.toLocaleString("ko-KR")}개 계정`
                  : "계정 목록"}
              </span>
            </div>
            <div className={s.filters} role="group" aria-label="승인 상태 필터">
              {FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter.id}
                  aria-label={`${filter.label} ${result ? `${filterCount(filter.id)}개` : "불러오는 중"}`}
                  aria-pressed={query.status === filter.id}
                  onClick={() =>
                    changeQuery({ ...query, status: filter.id, page: 1 })
                  }
                >
                  {filter.label}
                  <span>
                    {result
                      ? filterCount(filter.id).toLocaleString("ko-KR")
                      : "—"}
                  </span>
                </button>
              ))}
            </div>
            <form className={s.search} onSubmit={submitSearch} role="search">
              <label htmlFor="account-search" className={s.srOnly}>
                이름 또는 이메일 검색
              </label>
              <input
                id="account-search"
                ref={searchInput}
                type="search"
                placeholder="이름 또는 이메일로 검색"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                maxLength={200}
              />
              <button className={s.secondary} type="submit">
                검색
              </button>
            </form>
            {query.q ? (
              <div className={s.querySummary}>
                <span>“{query.q}” 검색 결과</span>
                <button
                  className={s.quiet}
                  type="button"
                  onClick={() => {
                    setSearch("");
                    changeQuery({ ...query, q: "", page: 1 });
                  }}
                >
                  검색 초기화
                </button>
              </div>
            ) : null}
            <div aria-busy={loading} className={s.results}>
              {loading ? (
                <div className={s.empty} role="status">
                  <span className={s.loadingDot} aria-hidden="true" />
                  <strong>계정 목록을 불러오는 중입니다.</strong>
                  <p>잠시만 기다려 주세요.</p>
                </div>
              ) : error ? (
                <div className={s.empty} role="alert">
                  <strong>계정 목록을 불러오지 못했습니다.</strong>
                  <p>{error}</p>
                  {authError ? (
                    <a className={s.textLink} href="/admin">
                      로그인 상태 다시 확인
                    </a>
                  ) : (
                    <button
                      className={s.secondary}
                      type="button"
                      onClick={reload}
                    >
                      다시 시도
                    </button>
                  )}
                </div>
              ) : result?.data.length ? (
                <>
                  <div className={s.tableWrap}>
                    <table className={s.table}>
                      <caption className={s.srOnly}>
                        가입 계정 목록. 계정 검토 버튼으로 메뉴 권한과 승인
                        상태를 확인할 수 있습니다.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">계정</th>
                          <th scope="col">상태</th>
                          <th scope="col" className={s.branchCell}>
                            지점 / 권한
                          </th>
                          <th scope="col" className={s.dateCell}>
                            변경일
                          </th>
                          <th scope="col">
                            <span className={s.srOnly}>검토</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.map((account) => (
                          <tr
                            key={account.id}
                            data-selected={selected?.id === account.id}
                          >
                            <td className={s.accountCell}>
                              <div className={s.accountName}>
                                <Link
                                  className={s.accountLink}
                                  href={`/admin/branches/${encodeURIComponent(branchId)}/users/${encodeURIComponent(account.id)}?returnTo=${encodeURIComponent(returnHref(account.id))}`}
                                  onClick={() =>
                                    saveAdminScroll(
                                      returnHref(account.id),
                                      branchId,
                                    )
                                  }
                                >
                                  {account.name || "이름 미등록"}
                                </Link>
                                <AccountSyncBadge sync={account.eywaSync} />
                              </div>
                              <span>{account.email}</span>
                            </td>
                            <td>
                              <AccountStatus account={account} />
                            </td>
                            <td className={s.branchCell}>
                              <strong>
                                {account.branchName || "독립 계정"}
                              </strong>
                              <span>
                                {account.isSuperAdmin
                                  ? "최고관리자"
                                  : account.branchRole === "owner"
                                    ? "원장"
                                    : account.branchRole === "manager"
                                      ? "지점 관리자"
                                      : account.role === "reviewer"
                                        ? "검수자"
                                        : "강사"}
                              </span>
                            </td>
                            <td className={s.dateCell}>
                              {accountDate(account.updatedAt)}
                            </td>
                            <td>
                              <button
                                type="button"
                                className={s.reviewButton}
                                aria-label={`${account.name || account.email} 계정 검토`}
                                aria-pressed={selected?.id === account.id}
                                aria-controls="account-detail"
                                disabled={locked}
                                onClick={(event) => {
                                  reviewTrigger.current = event.currentTarget;
                                  setSelected(account);
                                  replaceScreenQuery({ selection: account.id });
                                }}
                              >
                                {selected?.id === account.id
                                  ? "선택됨"
                                  : "검토"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <nav className={s.pagination} aria-label="계정 목록 페이지">
                    <span>
                      총 {result.meta.total.toLocaleString("ko-KR")}개 중{" "}
                      {(query.page - 1) * result.meta.pageSize + 1}–
                      {Math.min(
                        query.page * result.meta.pageSize,
                        result.meta.total,
                      )}
                    </span>
                    <div>
                      <button
                        className={s.secondary}
                        type="button"
                        aria-label="이전 페이지"
                        disabled={query.page <= 1}
                        onClick={() =>
                          changeQuery({ ...query, page: query.page - 1 })
                        }
                      >
                        이전
                      </button>
                      <span aria-live="polite">
                        {query.page} / {pages}
                      </span>
                      <button
                        className={s.secondary}
                        type="button"
                        aria-label="다음 페이지"
                        disabled={query.page >= pages}
                        onClick={() =>
                          changeQuery({ ...query, page: query.page + 1 })
                        }
                      >
                        다음
                      </button>
                    </div>
                  </nav>
                </>
              ) : (
                <div className={s.empty} role="status">
                  <strong>
                    {query.q
                      ? "검색 결과가 없습니다."
                      : query.status === "pending"
                        ? "대기 중인 가입 요청이 없습니다."
                        : "표시할 계정이 없습니다."}
                  </strong>
                  <p>
                    {query.q
                      ? "이름이나 이메일을 확인하거나 검색어를 바꿔보세요."
                      : "다른 승인 상태를 선택하거나 목록을 새로고침해 주세요."}
                  </p>
                </div>
              )}
            </div>
          </section>
          <div
            id="account-detail"
            className={s.detailSlot}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !locked && selected) {
                event.preventDefault();
                closeReview();
              }
            }}
          >
            {selected ? (
              <>
                <div className={s.detailActions}>
                  <button
                    className={s.secondary}
                    type="button"
                    disabled={locked}
                    onClick={closeReview}
                    aria-describedby={locked ? "review-close-help" : undefined}
                  >
                    검토 닫기
                  </button>
                  {locked ? (
                    <span id="review-close-help">
                      변경을 저장하거나 취소한 뒤 닫을 수 있습니다.
                    </span>
                  ) : null}
                </div>
                <AccountReview
                  key={selected.id}
                  account={selected}
                  onLockChange={setLocked}
                  onUpdate={(account) => {
                    onAccountsChange?.();
                    if ((account.branchId ?? "unassigned") !== branchId) {
                      setSelected(null);
                      setLocked(false);
                      reload();
                      router.refresh();
                      router.replace(
                        `/admin/branches/${encodeURIComponent(account.branchId ?? "unassigned")}/users/${encodeURIComponent(account.id)}`,
                      );
                      return;
                    }
                    setSelected(account);
                    reload();
                  }}
                />
              </>
            ) : (
              <section className={s.reviewPlaceholder}>
                <span className={s.placeholderMark} aria-hidden="true">
                  ↗
                </span>
                <h2>검토할 계정을 선택하세요</h2>
                <p>
                  승인 상태와 사용 가능한 메뉴를
                  <br />
                  이곳에서 함께 확인할 수 있습니다.
                </p>
                <span className={s.placeholderFoot}>
                  계정 목록에서 ‘검토’를 눌러주세요.
                </span>
              </section>
            )}
          </div>
        </div>
        <p className={s.footerNote}>
          관리자 전용 · 메뉴 변경은 저장한 뒤 적용됩니다.
        </p>
      </div>
    </div>
  );
}
