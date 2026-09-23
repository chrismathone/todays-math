"use client";

import { useEffect, useState, type FormEvent } from "react";
import AdminHeader from "./AdminHeader";
import { accountRequest, requestMessage } from "./accountRequests";
import s from "./admin.module.css";

type Branch = {
  id: string;
  name: string;
  createdAt: string;
  _count: { users: number };
  users: {
    id: string;
    name: string;
    email: string;
    suspendedAt: string | null;
  }[];
};
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchName, setBranchName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [issued, setIssued] = useState<Created | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    try {
      const response = await accountRequest<{ data: Branch[] }>(
        "/api/admin/branches",
      );
      setBranches(response.data);
      setError("");
    } catch (cause) {
      setError(requestMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    accountRequest<{ data: Branch[] }>("/api/admin/branches", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!controller.signal.aborted) setBranches(response.data);
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
            <p className={s.eyebrow}>BRANCH SETUP</p>
            <h1>지점 개설</h1>
            <p className={s.subtitle}>
              지점과 첫 원장 계정을 함께 만들면 원장이 소속 직원·학생 계정을
              발급할 수 있습니다.
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
        <section
          aria-labelledby="branch-create-heading"
          className="mb-6 rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 id="branch-create-heading" className="mb-3 text-lg font-bold">
            새 지점과 원장 계정
          </h2>
          <form
            onSubmit={createBranch}
            className="grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto] md:items-end"
          >
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
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
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
          className="rounded-xl border border-slate-200 bg-white p-5"
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
            <div className="grid gap-2">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{branch.name}</strong>
                    <span className="text-slate-500">
                      직원 {branch._count.users}명
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    원장{" "}
                    {branch.users.length
                      ? branch.users
                          .map((owner) => `${owner.name} (${owner.email})`)
                          .join(", ")
                      : "없음"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
