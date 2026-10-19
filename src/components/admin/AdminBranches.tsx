"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { countWorkspaceMenus } from "@/contracts/accountAccess.contract";
import type {
  BranchListResponse,
  BranchSummary,
} from "@/contracts/branchAdmin.contract";
import AdminHeader from "./AdminHeader";
import { accountRequest, requestMessage } from "./accountRequests";
import s from "./admin.module.css";

type Created = {
  branch: { id: string; name: string };
  owner: { id: string; name: string; email: string };
  initialPassword: string;
};

export default function AdminBranches({
  identity,
}: {
  identity: { name: string; email: string };
}) {
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [unassigned, setUnassigned] = useState<
    BranchListResponse["meta"]["unassigned"] | null
  >(null);
  const [branchName, setBranchName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [issued, setIssued] = useState<Created | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function renameBranch(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await accountRequest<{
        data: { id: string; name: string };
      }>(`/api/admin/branches/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });
      setBranches((current) =>
        current.map((branch) =>
          branch.id === id ? { ...branch, name: response.data.name } : branch,
        ),
      );
      setEditingBranch(null);
      setNotice("지점명을 변경했습니다.");
    } catch (cause) {
      setError(requestMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    setLoading(true);
    try {
      const response = await accountRequest<BranchListResponse>(
        "/api/admin/branches",
      );
      setBranches(response.data);
      setUnassigned(response.meta.unassigned);
      setError("");
    } catch (cause) {
      setError(requestMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    accountRequest<BranchListResponse>("/api/admin/branches", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!controller.signal.aborted) {
          setBranches(response.data);
          setUnassigned(response.meta.unassigned);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(requestMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setIssued(null);
    try {
      const response = await accountRequest<{ data: Created }>(
        "/api/admin/branches",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchName, ownerName, ownerEmail }),
        },
      );
      setIssued(response.data);
      setNotice("지점을 개설했습니다. 임시 비밀번호를 안전하게 전달해 주세요.");
      setBranchName("");
      setOwnerName("");
      setOwnerEmail("");
      await reload();
    } catch (cause) {
      setError(requestMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.shell}>
      <AdminHeader identity={identity} active="branches" />
      <main className={s.main}>
        <div className={s.titleRow}>
          <div>
            <p className={s.eyebrow}>ADMIN / BRANCHES</p>
            <h1>
              지점 관리 <span className={s.titleAccent}>/ 조직 설정</span>
            </h1>
            <p className={s.subtitle}>
              지점을 개설하고 각 지점의 계정과 사용 메뉴를 관리합니다.
            </p>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {notice && (
          <p className={s.notice} role="status">
            {notice}
          </p>
        )}
        <section
          aria-labelledby="branch-create-heading"
          className={s.branchPanel}
        >
          <h2 id="branch-create-heading" className="mb-3 text-lg font-bold">
            새 지점과 원장 계정
          </h2>
          <form onSubmit={createBranch} className={s.branchForm}>
            <label className="grid gap-1 text-sm">
              지점명
              <input
                className="min-h-11 rounded-lg border border-slate-300 px-3"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                required
                maxLength={100}
              />
            </label>
            <label className="grid gap-1 text-sm">
              원장 이름
              <input
                className="min-h-11 rounded-lg border border-slate-300 px-3"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                maxLength={50}
              />
            </label>
            <label className="grid gap-1 text-sm">
              원장 이메일
              <input
                className="min-h-11 rounded-lg border border-slate-300 px-3"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                required
                maxLength={255}
              />
            </label>
            <button type="submit" disabled={busy} className={s.primary}>
              지점 만들기
            </button>
          </form>
          {issued && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"
            >
              <strong>{issued.branch.name} 개설 완료</strong>
              <p>
                원장 아이디{" "}
                <strong className="select-all">{issued.owner.email}</strong> ·
                임시 비밀번호{" "}
                <strong className="select-all font-mono">
                  {issued.initialPassword}
                </strong>
              </p>
              <p className="text-slate-600">
                임시 비밀번호는 이 화면에서만 확인할 수 있습니다.
              </p>
            </div>
          )}
        </section>
        <section
          aria-labelledby="branch-list-heading"
          className={s.branchPanel}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 id="branch-list-heading" className="text-lg font-bold">
              지점 목록
            </h2>
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              새로고침
            </button>
          </div>
          {loading ? (
            <p role="status" className="text-sm text-slate-600">
              지점을 불러오는 중입니다.
            </p>
          ) : branches.length === 0 ? (
            <p className="text-sm text-slate-600">등록된 지점이 없습니다.</p>
          ) : (
            <div className={s.branchGrid}>
              {branches.map((branch) => (
                <div key={branch.id} className={s.branchItem}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{branch.name}</strong>
                    <span className={s.branchMeta}>
                      계정 {branch._count.users}명 · 승인 대기{" "}
                      {branch.pendingCount}명 · 사용 메뉴{" "}
                      {countWorkspaceMenus(branch.menus)}개 · 개설{" "}
                      {new Date(branch.createdAt).toLocaleDateString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    원장{" "}
                    {branch.users.length
                      ? branch.users.map((owner, index) => (
                          <span key={owner.id}>
                            {index ? ", " : ""}
                            <Link
                              href={`/admin/branches/${encodeURIComponent(branch.id)}/users/${encodeURIComponent(owner.id)}`}
                            >
                              {owner.name} ({owner.email})
                            </Link>
                            {owner.suspendedAt ? " · 정지" : ""}
                          </span>
                        ))
                      : "없음"}
                  </p>
                  <Link
                    className={s.textLink}
                    href={`/admin/branches/${encodeURIComponent(branch.id)}`}
                  >
                    지점 관리 →
                  </Link>
                  {editingBranch === branch.id ? (
                    <form
                      className={s.branchRename}
                      onSubmit={(event) => void renameBranch(event, branch.id)}
                    >
                      <label>
                        지점명
                        <input
                          value={editingName}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                          required
                          maxLength={100}
                          autoFocus
                        />
                      </label>
                      <button
                        className={s.primary}
                        type="submit"
                        disabled={busy}
                      >
                        저장
                      </button>
                      <button
                        className={s.secondary}
                        type="button"
                        disabled={busy}
                        onClick={() => setEditingBranch(null)}
                      >
                        취소
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className={s.secondary}
                      onClick={() => {
                        setEditingBranch(branch.id);
                        setEditingName(branch.name);
                        setError("");
                      }}
                    >
                      지점명 변경
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {unassigned ? (
            <div className={s.branchItem}>
              <strong>미소속 계정</strong>
              <p className={s.branchMeta}>
                계정 {unassigned.count}명 · 승인 대기 {unassigned.pendingCount}
                명
              </p>
              <Link className={s.textLink} href="/admin/branches/unassigned">
                미소속 계정 관리 →
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
