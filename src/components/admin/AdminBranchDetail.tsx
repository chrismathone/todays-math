"use client";

import BackLink from "@/components/ui/BackLink";
import { useEffect, useState } from "react";
import { replaceScreenQuery, useScreenQuery } from "@/hooks/useScreenQuery";
import { countWorkspaceMenus } from "@/contracts/accountAccess.contract";
import type {
  BranchResponse,
  BranchSummary,
} from "@/contracts/branchAdmin.contract";
import AdminHeader from "./AdminHeader";
import AdminAccounts from "./AdminAccounts";
import AdminBranchLearning from "./AdminBranchLearning";
import BranchMenuEditor from "./BranchMenuEditor";
import { accountRequest, requestMessage } from "./accountRequests";
import s from "./admin.module.css";

export default function AdminBranchDetail({
  identity,
  branchId,
  branchName,
}: {
  identity: { name: string; email: string };
  branchId: string;
  branchName: string;
}) {
  const params = useScreenQuery();
  const requestedTab = params.get("tab");
  const tab =
    branchId !== "unassigned" &&
    (requestedTab === "menus" ||
      requestedTab === "students" ||
      requestedTab === "classes")
      ? requestedTab
      : "accounts";
  const setTab = (value: "accounts" | "menus" | "students" | "classes") =>
    replaceScreenQuery({ tab: value, classId: null });
  const [branch, setBranch] = useState<BranchSummary | null>(null);
  const [loading, setLoading] = useState(branchId !== "unassigned");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (branchId === "unassigned") return;
    const controller = new AbortController();
    accountRequest<BranchResponse>(
      `/api/admin/branches/${encodeURIComponent(branchId)}`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (!controller.signal.aborted) {
          setBranch(response.data);
          setError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(requestMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [branchId, revision]);
  useEffect(() => {
    if (!locked) return;
    const preventLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventLeave);
    return () => window.removeEventListener("beforeunload", preventLeave);
  }, [locked]);

  return (
    <div
      className={s.shell}
      onClickCapture={(event) => {
        if (
          locked &&
          event.target instanceof Element &&
          event.target.closest("a")
        )
          event.preventDefault();
      }}
    >
      <AdminHeader identity={identity} active="branches" />
      <main className={s.main}>
        <BackLink href="/admin/branches" aria-disabled={locked}>
          지점 목록으로 돌아가기
        </BackLink>
        <div className={s.titleRow}>
          <div>
            <p className={s.eyebrow}>ADMIN / BRANCHES</p>
            <h1>{branch?.name ?? branchName}</h1>
            <p className={s.subtitle}>
              {branchId === "unassigned"
                ? "소속 지점이 없는 계정을 관리합니다. 메뉴는 개인 설정을 따릅니다."
                : "이 지점의 계정과 사용 메뉴를 관리합니다."}
            </p>
            {branch ? (
              <p className={s.branchMeta}>
                원장{" "}
                {branch.users.map((owner) => owner.name).join(", ") || "없음"} ·
                계정 {branch._count.users}명 · 승인 대기 {branch.pendingCount}명
                · 사용 메뉴 {countWorkspaceMenus(branch.menus)}개
              </p>
            ) : null}
          </div>
        </div>
        {locked ? (
          <p className={s.unsaved}>
            변경을 저장하거나 취소한 뒤 다른 화면으로 이동하세요.
          </p>
        ) : null}
        <div className={s.menuTabs} role="group" aria-label="지점 관리 영역">
          <button
            type="button"
            aria-pressed={tab === "accounts"}
            disabled={locked && tab !== "accounts"}
            onClick={() => setTab("accounts")}
          >
            교직원 계정
          </button>
          {branchId !== "unassigned" ? (
            <>
              <button
                type="button"
                aria-pressed={tab === "students"}
                disabled={locked && tab !== "students"}
                onClick={() => setTab("students")}
              >
                학생 계정
              </button>
              <button
                type="button"
                aria-pressed={tab === "classes"}
                disabled={locked && tab !== "classes"}
                onClick={() => setTab("classes")}
              >
                반 관리
              </button>
              <button
                type="button"
                aria-pressed={tab === "menus"}
                disabled={locked && tab !== "menus"}
                onClick={() => setTab("menus")}
              >
                사용 메뉴
              </button>
            </>
          ) : null}
        </div>
        {tab === "accounts" ? (
          <AdminAccounts
            key={branchId}
            identity={identity}
            branchId={branchId}
            branchName={branch?.name ?? branchName}
            embedded
            onLockChange={setLocked}
            onAccountsChange={() => setRevision((current) => current + 1)}
          />
        ) : tab === "students" || tab === "classes" ? (
          <AdminBranchLearning
            key={`${branchId}:${tab}:${params.get("classId") ?? ""}`}
            branchId={branchId}
            kind={tab}
          />
        ) : loading ? (
          <p role="status" className={s.empty}>
            지점 메뉴를 불러오는 중입니다.
          </p>
        ) : error ? (
          <div className={s.error} role="alert">
            <p>{error}</p>
            <button
              type="button"
              className={s.secondary}
              onClick={() => {
                setLoading(true);
                setRevision((current) => current + 1);
              }}
            >
              다시 시도
            </button>
          </div>
        ) : branch ? (
          <BranchMenuEditor
            branch={branch}
            onUpdate={setBranch}
            onLockChange={setLocked}
          />
        ) : null}
      </main>
    </div>
  );
}
