"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ALL_WORKSPACE_MENUS,
  normalizeWorkspaceMenus,
  isPersonalMenuSelectionRepresentable,
  workspaceMenuInSidebar,
  workspaceMenuOptionsOf,
  type ManagedAccount,
  type WorkspaceMenu,
  type WorkspaceProduct,
} from "@/contracts/accountAccess.contract";
import type {
  BranchListResponse,
  BranchSummary,
} from "@/contracts/branchAdmin.contract";
import { passwordReissueDecision } from "@/lib/admin/accountUsability";
import {
  AccountRequestError,
  accountRequest,
  reloadManagedAccount,
  requestMessage,
} from "./accountRequests";
import s from "./admin.module.css";
import AccountSyncBadge from "./AccountSyncBadge";

export const STATUS_LABELS = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "승인 거절",
} as const;

const MENU_TABS = [
  { id: "math", label: "오늘 수학" },
  { id: "english", label: "오늘 영어" },
] as const;

export function AccountStatus({ account }: { account: ManagedAccount }) {
  return (
    <span
      className={`${s.badge} ${s[account.deletedAt || account.suspendedAt ? "rejected" : account.approvalStatus]}`}
    >
      {account.deletedAt
        ? "삭제됨"
        : account.suspendedAt
          ? "정지됨"
          : STATUS_LABELS[account.approvalStatus]}
    </span>
  );
}

export function accountDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export default function AccountReview({
  account,
  onLockChange,
  onUpdate,
  autoFocus = true,
}: {
  account: ManagedAccount;
  onLockChange: (locked: boolean) => void;
  onUpdate: (account: ManagedAccount) => void;
  autoFocus?: boolean;
}) {
  const originalMenus = normalizeWorkspaceMenus(
    account.configuredMenus ?? account.menus,
  );
  const branchAssignmentLocked = account.branchAssignmentLocked === true;
  const originalBranchRole =
    account.branchRole ??
    (account.branchId && account.isAdmin ? "manager" : "teacher");
  const [menus, setMenus] = useState<WorkspaceMenu[]>(() => originalMenus);
  const [menuProduct, setMenuProduct] = useState<WorkspaceProduct>("math");
  const menuId = useId();
  const menuTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [branchManager, setBranchManager] = useState(account.isAdmin);
  const [branchId, setBranchId] = useState(account.branchId ?? "");
  const [branchRole, setBranchRole] = useState<"owner" | "manager" | "teacher">(
    originalBranchRole,
  );
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [branchesError, setBranchesError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);
  const [passwordState, setPasswordState] = useState<
    "idle" | "issued" | "unknown"
  >("idle");
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [recoveryEvidence, setRecoveryEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const branchChanged = branchId !== (account.branchId ?? "");
  const previewBranchMenus = !branchId
    ? ALL_WORKSPACE_MENUS
    : branchChanged
      ? branches.find((branch) => branch.id === branchId)?.menus
      : (account.branchMenus ??
        branches.find((branch) => branch.id === branchId)?.menus);
  const branchPolicyUnknown = Boolean(branchId) && !previewBranchMenus;
  const unavailableMenus =
    account.unavailableMenus ??
    (account.menus.includes("english-listening") ? [] : ["english-listening"]);
  const effectiveMenus = menus.filter(
    (menu) =>
      previewBranchMenus?.includes(menu) && !unavailableMenus.includes(menu),
  );
  function menuAvailabilityNote(menu: WorkspaceMenu) {
    const reasons = [];
    if (!previewBranchMenus?.includes(menu))
      reasons.push(
        branchPolicyUnknown ? "지점 메뉴 확인 전" : "지점에서 사용하지 않음",
      );
    if (unavailableMenus.includes(menu))
      reasons.push(
        account.unavailableMenus
          ? "서비스에서 사용 중지됨"
          : "사용 가능 여부 확인 필요",
      );
    return reasons.length
      ? `${reasons.join(" · ")} · ${menus.includes(menu) ? "개인 선택 보존" : "개인 선택 안 함"}`
      : "";
  }
  const menusChanged =
    menus.length !== originalMenus.length ||
    menus.some((menu) => !originalMenus.includes(menu));
  const personalMenuError =
    menusChanged && !isPersonalMenuSelectionRepresentable(menus)
      ? "영어듣기·자료은행을 개인 메뉴로 선택하려면 학교별 내신 대비·문제 만들기·문제 보관함 중 하나 이상도 선택해 주세요. 지점에서 차단된 개인 선택은 보존됩니다."
      : null;
  const branchRoleChanged =
    Boolean(branchId) && branchRole !== originalBranchRole;
  const menuEditingDisabled =
    busy ||
    conflict ||
    authError ||
    account.isSuperAdmin ||
    Boolean(account.deletedAt);
  function isDraftDirty(
    nextMenus = menus,
    nextBranchId = branchId,
    nextRole = branchRole,
    nextManager = branchManager,
    nextName = name,
    nextEmail = email,
  ) {
    return (
      nextName !== account.name ||
      nextEmail !== account.email ||
      nextManager !== account.isAdmin ||
      nextBranchId !== (account.branchId ?? "") ||
      (Boolean(nextBranchId) && nextRole !== originalBranchRole) ||
      nextMenus.length !== originalMenus.length ||
      nextMenus.some((menu) => !originalMenus.includes(menu))
    );
  }
  const passwordDecision = passwordReissueDecision(
    {
      deletedAt: account.deletedAt,
      isSuperAdmin: account.isSuperAdmin,
      authSource: account.authSource,
      mapped: branchAssignmentLocked,
    },
    recoveryEvidence,
  );
  const passwordCode = passwordDecision.allowed ? null : passwordDecision.code;
  const issuedReadPending = refreshRequired && passwordState === "issued";
  const dirty = isDraftDirty();

  useEffect(() => {
    if (autoFocus) headingRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (account.isSuperAdmin || account.deletedAt) return;
    const controller = new AbortController();
    accountRequest<BranchListResponse>("/api/admin/branches", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!controller.signal.aborted) {
          setBranches(response.data);
          setBranchesError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setBranchesError(true);
      });
    return () => controller.abort();
  }, [account.isSuperAdmin, account.deletedAt]);

  function changeMenus(menu: WorkspaceMenu) {
    if (!previewBranchMenus?.includes(menu) || unavailableMenus.includes(menu))
      return;
    const next = menus.includes(menu)
      ? menus.filter((item) => item !== menu)
      : [...menus, menu];
    setMenus(next);
    setNotice(null);
    onLockChange(isDraftDirty(next));
  }

  async function save(approvalStatus?: "approved" | "rejected") {
    if (
      busyRef.current ||
      conflict ||
      refreshRequired ||
      account.isSuperAdmin ||
      account.deletedAt ||
      (approvalStatus !== "rejected" && personalMenuError) ||
      (branchChanged && branchPolicyUnknown)
    )
      return;
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
            expectedBranchId: account.branchId ?? null,
            ...(name !== account.name ? { name } : {}),
            ...(email !== account.email ? { email } : {}),
            ...(branchChanged || branchRoleChanged
              ? {
                  ...(!branchAssignmentLocked
                    ? { branchId: branchId || null }
                    : {}),
                  ...(branchId ? { branchRole } : {}),
                }
              : account.branchId && branchManager !== account.isAdmin
                ? { isAdmin: branchManager }
                : {}),
            ...(approvalStatus ? { approvalStatus } : {}),
            ...(approvalStatus !== "rejected" && menusChanged ? { menus } : {}),
          }),
        },
      );
      setMenus(
        normalizeWorkspaceMenus(
          result.data.configuredMenus ?? result.data.menus,
        ),
      );
      setName(result.data.name);
      setEmail(result.data.email);
      setBranchManager(result.data.isAdmin);
      setBranchId(result.data.branchId ?? "");
      setBranchRole(result.data.branchRole ?? "teacher");
      onUpdate(result.data);
      setNotice(
        approvalStatus === "approved"
          ? "계정을 승인하고 선택한 메뉴를 저장했습니다."
          : approvalStatus === "rejected"
            ? "가입 승인을 거절했습니다."
            : "계정 변경을 저장했습니다.",
      );
      onLockChange(false);
    } catch (cause) {
      const stale =
        cause instanceof AccountRequestError && cause.status === 409;
      setConflict(stale);
      setAuthError(cause instanceof AccountRequestError && cause.requiresLogin);
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
      setMenus(normalizeWorkspaceMenus(latest.configuredMenus ?? latest.menus));
      setName(latest.name);
      setEmail(latest.email);
      setBranchManager(latest.isAdmin);
      setBranchId(latest.branchId ?? "");
      setBranchRole(latest.branchRole ?? "teacher");
      onUpdate(latest);
      setConflict(false);
      setRefreshRequired(false);
      setError(null);
      setAuthError(false);
      setNotice(
        "최신 정보를 불러왔습니다. 이전 변경안은 초기화되었으니 다시 확인해 주세요.",
      );
      onLockChange(false);
    } catch (cause) {
      setError(requestMessage(cause));
      onLockChange(refreshRequired || dirty);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  async function changeLifecycle(
    field: "suspended" | "deleted",
    value: boolean,
  ) {
    if (busyRef.current || dirty || refreshRequired || account.isSuperAdmin)
      return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setIssuedPassword(null);
    try {
      const result = await accountRequest<{ data: ManagedAccount }>(
        `/api/admin/users/${encodeURIComponent(account.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedUpdatedAt: account.updatedAt,
            expectedBranchId: account.branchId ?? null,
            [field]: value,
          }),
        },
      );
      onUpdate(result.data);
      setNotice(
        field === "suspended"
          ? value
            ? "계정을 정지했습니다. 기존 로그인도 종료됩니다."
            : "계정 정지를 해제했습니다."
          : value
            ? "계정을 삭제 처리했습니다. 복원할 수 있습니다."
            : "계정을 복원했습니다.",
      );
      setConfirmDelete(false);
    } catch (cause) {
      setError(requestMessage(cause));
      setConflict(cause instanceof AccountRequestError && cause.status === 409);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function reissuePassword() {
    if (
      busyRef.current ||
      dirty ||
      issuedReadPending ||
      account.deletedAt ||
      account.isSuperAdmin ||
      !passwordDecision.allowed
    )
      return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const previousPassword = passwordState === "issued" ? issuedPassword : null;
    try {
      const result = await accountRequest<{
        data: { initialPassword: string };
      }>(`/api/admin/users/${encodeURIComponent(account.id)}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedUpdatedAt: account.updatedAt,
          expectedBranchId: account.branchId ?? null,
          ...(passwordDecision.evidence
            ? { recoveryEvidence: passwordDecision.evidence }
            : {}),
        }),
      });
      setIssuedPassword(result.data.initialPassword);
      setPasswordState("issued");
      setRefreshRequired(true);
      setRecoveryEvidence("");
      onLockChange(true);
      try {
        const latest = await reloadManagedAccount(account);
        setMenus(
          normalizeWorkspaceMenus(latest.configuredMenus ?? latest.menus),
        );
        setName(latest.name);
        setEmail(latest.email);
        setBranchManager(latest.isAdmin);
        setBranchId(latest.branchId ?? "");
        setBranchRole(latest.branchRole ?? "teacher");
        onUpdate(latest);
        setRefreshRequired(false);
        onLockChange(false);
        setNotice(
          "임시 비밀번호를 발급했습니다. 현재 로그인은 모두 종료됩니다.",
        );
      } catch {
        setNotice(null);
        setError(
          "비밀번호는 발급되었습니다. 계정 정보를 다시 읽지 못했습니다. 다른 변경은 최신 정보를 불러온 뒤에만 저장합니다.",
        );
      }
    } catch (cause) {
      const unknown = !(cause instanceof AccountRequestError);
      if (unknown) {
        setPasswordState("unknown");
        setIssuedPassword(null);
        setRefreshRequired(true);
        onLockChange(true);
        setError(
          "발급 응답을 받지 못했습니다. 비밀번호가 바뀌었는지는 알 수 없습니다. 자동으로 다시 발급하지 않습니다. 최신 정보를 확인한 뒤 필요하면 다시 발급하세요.",
        );
      } else {
        setIssuedPassword(previousPassword);
        setError(requestMessage(cause));
        setConflict(cause.status === 409);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
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
      <div className={s.accountName}>
        <h2
          id="review-title"
          className={s.reviewName}
          tabIndex={-1}
          ref={headingRef}
        >
          {account.name || "이름 미등록"}
        </h2>
        <AccountSyncBadge sync={account.eywaSync} />
      </div>
      <p className={s.email}>{account.email}</p>
      <dl className={s.facts}>
        <div>
          <dt>지점</dt>
          <dd>{account.branchName || "독립 계정"}</dd>
        </div>
        <div>
          <dt>권한</dt>
          <dd>
            {account.isSuperAdmin
              ? "최고관리자"
              : account.branchRole === "owner"
                ? "원장"
                : account.branchRole === "manager"
                  ? "지점 관리자"
                  : account.role === "reviewer"
                    ? "검수자"
                    : "강사"}
          </dd>
        </div>
        <div>
          <dt>가입일</dt>
          <dd>{accountDate(account.createdAt)}</dd>
        </div>
        <div>
          <dt>마지막 변경</dt>
          <dd>{accountDate(account.updatedAt)}</dd>
        </div>
      </dl>
      {!account.isSuperAdmin && !account.deletedAt ? (
        <div className="mb-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            이름
            <input
              className="min-h-11 rounded-lg border border-slate-300 px-3"
              value={name}
              maxLength={50}
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                onLockChange(
                  isDraftDirty(
                    menus,
                    branchId,
                    branchRole,
                    branchManager,
                    nextName,
                    email,
                  ),
                );
              }}
              disabled={busy || conflict}
            />
          </label>
          <label className="grid gap-1 text-sm">
            이메일
            <input
              className="min-h-11 rounded-lg border border-slate-300 px-3"
              type="email"
              value={email}
              maxLength={255}
              onChange={(event) => {
                const nextEmail = event.target.value;
                setEmail(nextEmail);
                onLockChange(
                  isDraftDirty(
                    menus,
                    branchId,
                    branchRole,
                    branchManager,
                    name,
                    nextEmail,
                  ),
                );
              }}
              disabled={busy || conflict}
            />
          </label>
        </div>
      ) : null}
      {account.isSuperAdmin ? (
        <p className={s.note}>
          최고관리자 계정은 보호됩니다. 승인 상태와 메뉴 권한을 이 화면에서
          변경할 수 없습니다.
        </p>
      ) : null}
      {!account.isSuperAdmin && !account.deletedAt ? (
        <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold">지점 소속 지정</p>
          <label className="grid gap-1 text-sm">
            지점
            <select
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
              value={branchId}
              disabled={busy || conflict || authError || branchAssignmentLocked}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextManager = Boolean(nextId) && branchRole !== "teacher";
                setBranchId(nextId);
                setBranchManager(nextManager);
                setNotice(null);
                onLockChange(
                  isDraftDirty(menus, nextId, branchRole, nextManager),
                );
              }}
            >
              <option value="">독립 계정</option>
              {account.branchId &&
              !branches.some((branch) => branch.id === account.branchId) ? (
                <option value={account.branchId}>
                  {account.branchName || "현재 지점"}
                </option>
              ) : null}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          {branchId && (
            <label className="grid gap-1 text-sm">
              계정 유형
              <select
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                value={branchRole}
                disabled={busy || conflict || authError}
                onChange={(event) => {
                  const nextRole = event.target.value as typeof branchRole;
                  const nextManager = nextRole !== "teacher";
                  setBranchRole(nextRole);
                  setBranchManager(nextManager);
                  setNotice(null);
                  onLockChange(
                    isDraftDirty(menus, branchId, nextRole, nextManager),
                  );
                }}
              >
                <option value="teacher">강사</option>
                <option value="manager">관리자</option>
                <option value="owner">원장</option>
              </select>
            </label>
          )}
          <p className="text-xs text-slate-600">
            {branchAssignmentLocked ? (
              <>
                에이와 연동 계정의 소속 지점은 연동 정보에 따라 고정됩니다.
                최고관리자는 계정 유형·이름·이메일·개인 메뉴를 변경할 수
                있습니다. 계정 유형은 이후 동기화에도 유지됩니다.
              </>
            ) : (
              <>
                운영 중인 반이 없는 계정만 소속을 변경할 수 있습니다. 소속 변경
                시 기존 로그인이 종료되고, 학원에 공개했던 자료는 비공개로
                전환됩니다.
              </>
            )}
          </p>
        </div>
      ) : null}
      <h3 id={`${menuId}-heading`} className={s.menuHeading}>
        사용 가능한 메뉴
      </h3>
      <p className={s.help}>
        원장·관리자·강사 모두 개인 설정과 지점에서 허용한 메뉴만 이용할 수
        있습니다. 지점에서 끈 메뉴의 개인 선택은 보존되며 다시 켜면 복구됩니다.
      </p>
      {branchPolicyUnknown ? (
        <p className={s.note} role="status">
          {branchesError
            ? "지점 메뉴를 확인하지 못했습니다. 최신 정보를 다시 불러와 주세요."
            : "지점 메뉴를 확인하는 중입니다."}{" "}
          확인 전에는 메뉴가 허용된 것으로 표시하지 않습니다.
        </p>
      ) : null}
      <div
        className={s.menuTabs}
        role="tablist"
        aria-labelledby={`${menuId}-heading`}
      >
        {MENU_TABS.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${menuId}-tab-${tab.id}`}
            aria-controls={`${menuId}-panel-${tab.id}`}
            aria-selected={menuProduct === tab.id}
            tabIndex={menuProduct === tab.id ? 0 : -1}
            ref={(element) => {
              menuTabRefs.current[index] = element;
            }}
            onClick={() => setMenuProduct(tab.id)}
            onKeyDown={(event) => {
              let next: number;
              if (event.key === "ArrowRight")
                next = (index + 1) % MENU_TABS.length;
              else if (event.key === "ArrowLeft")
                next = (index + MENU_TABS.length - 1) % MENU_TABS.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = MENU_TABS.length - 1;
              else return;
              event.preventDefault();
              setMenuProduct(MENU_TABS[next].id);
              menuTabRefs.current[next]?.focus();
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {MENU_TABS.map((tab) => {
        const options = workspaceMenuOptionsOf(tab.id, branchId);
        const sidebarOptions = options.filter((option) =>
          workspaceMenuInSidebar(option.permission, effectiveMenus),
        );
        const nestedOptions = options.filter(
          (option) =>
            !workspaceMenuInSidebar(option.permission, effectiveMenus),
        );
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${menuId}-panel-${tab.id}`}
            aria-labelledby={`${menuId}-tab-${tab.id}`}
            hidden={menuProduct !== tab.id}
          >
            <fieldset className={s.menuFieldset} disabled={menuEditingDisabled}>
              <legend>
                {tab.label}{" "}
                <span>
                  {
                    sidebarOptions.filter((option) =>
                      effectiveMenus.includes(option.permission),
                    ).length
                  }
                  {" / "}
                  {sidebarOptions.length}
                </span>
              </legend>
              <div className={s.menuGrid}>
                {sidebarOptions.map((option) => (
                  <label key={option.id} className={s.menuOption}>
                    <input
                      type="checkbox"
                      checked={effectiveMenus.includes(option.permission)}
                      disabled={
                        !previewBranchMenus?.includes(option.permission) ||
                        unavailableMenus.includes(option.permission)
                      }
                      onChange={() => changeMenus(option.permission)}
                    />
                    <span>
                      {option.label}
                      {menuAvailabilityNote(option.permission) ? (
                        <small className={s.menuBlocked}>
                          {menuAvailabilityNote(option.permission)}
                        </small>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
              {nestedOptions.length > 0 ? (
                <div className={s.menuExtras}>
                  <h4>추가 기능 권한</h4>
                  <p id={`${menuId}-export-help`} className={s.help}>
                    내보내기는 시험지 만들기·문제 추출·시험지 보관함에서 이어서
                    이용합니다. 이 메뉴가 모두 해제되면 좌측 메뉴에 표시됩니다.
                  </p>
                  {nestedOptions.map((option) => (
                    <label key={option.id} className={s.menuOption}>
                      <input
                        type="checkbox"
                        checked={effectiveMenus.includes(option.permission)}
                        disabled={
                          !previewBranchMenus?.includes(option.permission) ||
                          unavailableMenus.includes(option.permission)
                        }
                        aria-describedby={`${menuId}-export-help`}
                        onChange={() => changeMenus(option.permission)}
                      />
                      <span>
                        {option.label}
                        {menuAvailabilityNote(option.permission) ? (
                          <small className={s.menuBlocked}>
                            {menuAvailabilityNote(option.permission)}
                          </small>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
            </fieldset>
          </div>
        );
      })}
      {effectiveMenus.length === 0 ? (
        <p className={s.note}>
          사용할 수 있는 메뉴가 없습니다. 내 정보·로그아웃과 허용된 관리 화면은
          계속 이용할 수 있습니다.
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
          {refreshRequired && !conflict ? (
            <button
              type="button"
              className={s.secondary}
              onClick={reload}
              disabled={busy}
            >
              {busy ? "불러오는 중…" : "계정 정보 다시 읽기"}
            </button>
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
      {personalMenuError ? (
        <p role="alert" className={s.error}>
          {personalMenuError}
        </p>
      ) : null}
      {!account.isSuperAdmin && !account.deletedAt ? (
        <div className={s.reviewActions}>
          {dirty ? (
            <p className={s.unsaved}>
              저장하지 않은 변경이 있습니다. 저장하거나 취소한 뒤 다른 계정을
              선택하세요.
            </p>
          ) : null}
          <div className={s.buttonRow}>
            <button
              className={s.secondary}
              type="button"
              disabled={
                !dirty ||
                busy ||
                conflict ||
                refreshRequired ||
                authError ||
                Boolean(personalMenuError) ||
                (branchChanged && branchPolicyUnknown)
              }
              onClick={() => save()}
            >
              {" "}
              {busy ? "처리 중…" : "변경 저장"}
            </button>
            {dirty ? (
              <button
                className={s.quiet}
                type="button"
                disabled={busy}
                onClick={() => {
                  setMenus(originalMenus);
                  setName(account.name);
                  setEmail(account.email);
                  setBranchManager(account.isAdmin);
                  setBranchId(account.branchId ?? "");
                  setBranchRole(originalBranchRole);
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
                disabled={
                  busy ||
                  conflict ||
                  refreshRequired ||
                  authError ||
                  Boolean(personalMenuError) ||
                  (branchChanged && branchPolicyUnknown)
                }
                onClick={() => save("approved")}
              >
                {busy ? "처리 중…" : "계정 승인 · 메뉴 저장"}
              </button>
              {account.approvalStatus === "pending" ? (
                <button
                  className={s.reject}
                  type="button"
                  disabled={
                    busy || conflict || refreshRequired || authError || dirty
                  }
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
      {!account.isSuperAdmin ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <h3 className="mb-2 font-semibold">계정 상태와 비밀번호</h3>
          {account.deletedAt ? (
            <>
              <p>삭제된 계정의 비밀번호는 재발급하지 않습니다.</p>
              <button
                type="button"
                className={s.secondary}
                disabled={busy || conflict || refreshRequired}
                onClick={() => void changeLifecycle("deleted", false)}
              >
                계정 복원
              </button>
            </>
          ) : (
            <>
              {passwordCode === "source_auth" ? (
                <p>
                  에이와 인증 계정은 원본 시스템에서만 비밀번호를 복구합니다.
                </p>
              ) : null}
              <div className={s.buttonRow}>
                <button
                  type="button"
                  className={s.secondary}
                  disabled={busy || conflict || refreshRequired || dirty}
                  onClick={() =>
                    void changeLifecycle("suspended", !account.suspendedAt)
                  }
                >
                  {account.suspendedAt ? "정지 해제" : "계정 정지"}
                </button>
                {passwordCode === "source_auth" ? null : (
                  <button
                    type="button"
                    className={s.secondary}
                    disabled={
                      busy ||
                      conflict ||
                      dirty ||
                      issuedReadPending ||
                      !passwordDecision.allowed
                    }
                    onClick={() => void reissuePassword()}
                  >
                    비밀번호 재발급
                  </button>
                )}
                <button
                  type="button"
                  className={s.reject}
                  disabled={busy || conflict || refreshRequired || dirty}
                  onClick={() => setConfirmDelete(true)}
                >
                  계정 삭제
                </button>
              </div>
            </>
          )}
          {branchAssignmentLocked &&
          passwordCode !== "source_auth" &&
          !account.deletedAt ? (
            <label className="mt-3 grid gap-1 text-sm">
              복구 근거 (30자 이상)
              <textarea
                className="min-h-20 rounded-lg border border-slate-300 px-3 py-2"
                value={recoveryEvidence}
                maxLength={1000}
                onChange={(event) => setRecoveryEvidence(event.target.value)}
              />
            </label>
          ) : null}
          {passwordCode === "evidence_required" ? (
            <p className={s.note}>
              연동된 로컬 계정은 30자 이상의 복구 근거가 필요합니다.
            </p>
          ) : null}
          {refreshRequired ? (
            <p className={s.note}>
              최신 조회가 필요합니다. 다른 계정 변경은 다시 읽은 뒤에만
              저장합니다.
            </p>
          ) : null}
          {confirmDelete && (
            <div className={s.confirm} role="group" aria-label="계정 삭제 확인">
              <p>
                이 계정을 삭제 처리할까요? 로그인은 즉시 종료되고, 계정은 삭제
                목록에서 복원할 수 있습니다.
              </p>
              <div className={s.buttonRow}>
                <button
                  type="button"
                  className={s.reject}
                  disabled={busy}
                  onClick={() => void changeLifecycle("deleted", true)}
                >
                  삭제 확정
                </button>
                <button
                  type="button"
                  className={s.secondary}
                  onClick={() => setConfirmDelete(false)}
                >
                  취소
                </button>
              </div>
            </div>
          )}
          {issuedPassword && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-amber-50 p-3 text-sm"
            >
              임시 비밀번호:{" "}
              <strong className="select-all font-mono">{issuedPassword}</strong>
              <br />
              지금 한 번만 보입니다. 당사자에게 안전하게 전달해 주세요.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
