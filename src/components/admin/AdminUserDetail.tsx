"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ManagedAccount } from "@/contracts/accountAccess.contract";
import AdminHeader from "./AdminHeader";
import { AccountStatus, accountDate } from "./AccountReview";
import AccountReview from "./AccountReview";
import { accountRequest, requestMessage } from "./accountRequests";
import {
  ADMIN_KIND_LABEL,
  type AuditEntry,
  type DocumentDetail,
  type PageResult,
  type UserDocument,
} from "./documentTypes";
import {
  auditActionLabel,
  auditDetailRows,
  auditOutcomeLabel,
  auditTechnicalDetails,
} from "./auditPresentation";
import s from "./admin.module.css";
import d from "./detail.module.css";

const DocumentPreview = lazy(() => import("./AdminDocumentPreview"));

function useAdminResource<T>(url: string, initialData?: T) {
  const [state, setState] = useState<{ url: string; data?: T; error?: string }>(
    { url, data: initialData },
  );
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    accountRequest<T>(url, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ url, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ url, error: requestMessage(error) });
      });
    return () => controller.abort();
  }, [url, retry]);
  return {
    data: state.url === url ? state.data : undefined,
    error: state.url === url ? state.error : undefined,
    reload: () => {
      setState({ url });
      setRetry((value) => value + 1);
    },
    update: (data: T) => setState({ url, data }),
  };
}

function ResourceError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div role="alert" className={s.empty}>
      <strong>정보를 불러오지 못했습니다.</strong>
      <p>{message}</p>
      <button className={s.secondary} type="button" onClick={retry}>
        다시 시도
      </button>
    </div>
  );
}

function Pagination({
  meta,
  page,
  onPage,
}: {
  meta: PageResult<unknown>["meta"];
  page: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  return (
    <nav className={s.pagination} aria-label="상세 목록 페이지">
      <span>총 {meta.total.toLocaleString("ko-KR")}개</span>
      <div>
        <button
          className={s.secondary}
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          이전
        </button>
        <span aria-live="polite">
          {page} / {totalPages}
        </span>
        <button
          className={s.secondary}
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          다음
        </button>
      </div>
    </nav>
  );
}

function OpenDocument({
  userId,
  documentId,
}: {
  userId: string;
  documentId: string;
}) {
  const resource = useAdminResource<{ data: DocumentDetail }>(
    `/api/admin/users/${encodeURIComponent(userId)}/documents/${encodeURIComponent(documentId)}`,
  );
  if (resource.error)
    return <ResourceError message={resource.error} retry={resource.reload} />;
  if (!resource.data)
    return (
      <div className={s.empty} role="status">
        자료 내용을 불러오는 중입니다.
      </div>
    );
  return (
    <Suspense
      fallback={
        <div className={s.empty} role="status">
          미리보기를 준비하고 있습니다.
        </div>
      }
    >
      <DocumentPreview userId={userId} document={resource.data.data} />
    </Suspense>
  );
}

function Documents({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const documentTrigger = useRef<HTMLButtonElement | null>(null);
  const preview = useRef<HTMLElement | null>(null);
  const listHeading = useRef<HTMLHeadingElement | null>(null);
  function closePreview() {
    setSelected(null);
    if (documentTrigger.current?.isConnected) documentTrigger.current.focus();
    else listHeading.current?.focus();
  }
  useEffect(() => {
    if (selected) preview.current?.focus();
  }, [selected]);
  const resource = useAdminResource<PageResult<UserDocument>>(
    `/api/admin/users/${encodeURIComponent(userId)}/documents?page=${page}&pageSize=20`,
  );
  return (
    <div className={d.documents}>
      <section className={d.documentList} aria-label="저장된 자료 목록">
        <div className={d.panelHeading}>
          <h2 ref={listHeading} tabIndex={-1}>
            저장된 자료
          </h2>
          <button className={s.quiet} type="button" onClick={resource.reload}>
            새로고침
          </button>
        </div>
        {resource.error ? (
          <ResourceError message={resource.error} retry={resource.reload} />
        ) : !resource.data ? (
          <div className={s.empty} role="status">
            자료 목록을 불러오는 중입니다.
          </div>
        ) : resource.data.data.length === 0 ? (
          <div className={s.empty} role="status">
            <strong>저장된 자료가 없습니다.</strong>
            <p>이 계정이 저장한 시험지와 추출 자료가 여기에 표시됩니다.</p>
          </div>
        ) : (
          <>
            <ul className={d.documentItems}>
              {resource.data.data.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    className={d.documentButton}
                    aria-pressed={selected === doc.id}
                    onClick={(event) => {
                      documentTrigger.current = event.currentTarget;
                      setSelected(doc.id);
                      if (selected === doc.id) preview.current?.focus();
                    }}
                  >
                    <span className={d.kind}>{ADMIN_KIND_LABEL[doc.kind]}</span>
                    <strong>{doc.title || "제목 없는 자료"}</strong>
                    <span>
                      수정 {accountDate(doc.updatedAt)} · 버전 {doc.revision}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination
              meta={resource.data.meta}
              page={page}
              onPage={setPage}
            />
          </>
        )}
      </section>
      <section
        className={d.preview}
        aria-label="자료 미리보기"
        tabIndex={-1}
        ref={preview}
        onKeyDown={(event) => {
          if (event.key === "Escape" && selected) {
            event.preventDefault();
            closePreview();
          }
        }}
      >
        {selected ? (
          <>
            <div className={d.panelHeading}>
              <span>선택한 자료</span>
              <button
                className={s.secondary}
                type="button"
                onClick={closePreview}
              >
                미리보기 닫기
              </button>
            </div>
            <OpenDocument
              key={selected}
              userId={userId}
              documentId={selected}
            />
          </>
        ) : (
          <div className={s.empty}>
            <strong>살펴볼 자료를 선택하세요</strong>
            <p>저장된 시험지의 문항과 추출 내용을 읽을 수 있습니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function AuditDetails({
  entry,
  account,
}: {
  entry: AuditEntry;
  account: ManagedAccount;
}) {
  const rows = auditDetailRows(entry.details, account);
  return (
    <>
      {rows.length ? (
        <dl className={d.auditDetails}>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                {row.previous !== undefined ? (
                  row.unchanged ? (
                    <>
                      {row.value}{" "}
                      <span className={d.auditHint}>(변경 없음)</span>
                    </>
                  ) : (
                    <span className={d.auditChange}>
                      <span>
                        <span className={d.auditHint}>이전</span> {row.previous}
                      </span>
                      <span>
                        <span className={d.auditHint}>현재</span> {row.value}
                      </span>
                    </span>
                  )
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <details className={d.auditTechnical}>
        <summary>
          <span className={d.auditChevron} aria-hidden="true">
            ›
          </span>
          기술 상세
        </summary>
        <pre>{auditTechnicalDetails(entry)}</pre>
      </details>
    </>
  );
}

function Audit({
  userId,
  account,
}: {
  userId: string;
  account: ManagedAccount;
}) {
  const [page, setPage] = useState(1);
  const resource = useAdminResource<PageResult<AuditEntry>>(
    `/api/admin/users/${encodeURIComponent(userId)}/audit?page=${page}&pageSize=30`,
  );
  return (
    <section className={d.audit} aria-label="계정 활동 기록">
      <div className={d.panelHeading}>
        <h2>활동 기록</h2>
        <button className={s.quiet} type="button" onClick={resource.reload}>
          새로고침
        </button>
      </div>
      {resource.error ? (
        <ResourceError message={resource.error} retry={resource.reload} />
      ) : !resource.data ? (
        <div className={s.empty} role="status">
          활동 기록을 불러오는 중입니다.
        </div>
      ) : resource.data.data.length === 0 ? (
        <div className={s.empty} role="status">
          <strong>아직 활동 기록이 없습니다.</strong>
          <p>기록된 계정 활동이 이곳에 표시됩니다.</p>
        </div>
      ) : (
        <>
          <ol className={d.auditItems}>
            {resource.data.data.map((entry) => (
              <li key={entry.id}>
                <div className={d.auditHeading}>
                  <strong>{auditActionLabel(entry, account)}</strong>
                  <span className={d.outcome}>
                    {auditOutcomeLabel(entry.outcome)}
                  </span>
                </div>
                <p className={d.auditMeta}>
                  {entry.actorName || "시스템"} ·{" "}
                  <time dateTime={entry.createdAt}>
                    {new Intl.DateTimeFormat("ko-KR", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                      timeZone: "Asia/Seoul",
                    }).format(new Date(entry.createdAt))}
                  </time>
                </p>
                <AuditDetails entry={entry} account={account} />
              </li>
            ))}
          </ol>
          <Pagination meta={resource.data.meta} page={page} onPage={setPage} />
        </>
      )}
    </section>
  );
}

export default function AdminUserDetail({
  userId,
  identity,
  initialAccount,
}: {
  userId: string;
  identity: { name: string; email: string };
  initialAccount?: ManagedAccount;
}) {
  const [tab, setTab] = useState<"documents" | "audit">("documents");
  const [locked, setLocked] = useState(false);
  const resource = useAdminResource<{ data: ManagedAccount }>(
    `/api/admin/users/${encodeURIComponent(userId)}`,
    initialAccount ? { data: initialAccount } : undefined,
  );
  const account = resource.data?.data;
  useEffect(() => {
    if (!locked) return;
    const preventLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventLeave);
    return () => window.removeEventListener("beforeunload", preventLeave);
  }, [locked]);
  return (
    <div className={s.shell}>
      <AdminHeader identity={identity} />
      <main className={s.main}>
        <Link
          className={s.textLink}
          href="/admin"
          onClick={(event) => {
            if (locked) event.preventDefault();
          }}
          aria-disabled={locked}
        >
          ← 계정 관리로 돌아가기
        </Link>
        {locked ? (
          <p className={s.unsaved}>
            변경을 저장하거나 취소한 뒤 목록으로 이동하세요.
          </p>
        ) : null}
        {resource.error ? (
          <ResourceError message={resource.error} retry={resource.reload} />
        ) : !account ? (
          <div className={s.empty} role="status">
            계정 정보를 불러오는 중입니다.
          </div>
        ) : (
          <>
            <div className={d.userHeading}>
              <div>
                <p className={s.eyebrow}>ACCOUNT WORKSPACE</p>
                <h1>{account.name || "이름 미등록"}</h1>
                <p>{account.email}</p>
              </div>
              <AccountStatus account={account} />
            </div>
            <p className={d.intro}>
              계정 내정보, 사용 자료, 변경 이력과 관리 설정을 확인합니다.
            </p>
            <section className={d.profile} aria-label="사용자 내정보">
              <div className={d.profileHeading}>
                <div>
                  <p className={s.eyebrow}>ACCOUNT PROFILE</p>
                  <h2>내정보</h2>
                </div>
                <span>관리자 열람</span>
              </div>
              <dl className={d.profileGrid}>
                <div>
                  <dt>이름</dt>
                  <dd>{account.name || "이름 미등록"}</dd>
                </div>
                <div>
                  <dt>이메일</dt>
                  <dd>{account.email}</dd>
                </div>
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
                  <dt>승인 상태</dt>
                  <dd>
                    <AccountStatus account={account} />
                  </dd>
                </div>
                <div>
                  <dt>가입 시각</dt>
                  <dd>{accountDate(account.createdAt)}</dd>
                </div>
                <div>
                  <dt>마지막 변경</dt>
                  <dd>{accountDate(account.updatedAt)}</dd>
                </div>
                <div>
                  <dt>접속 상태</dt>
                  <dd>
                    {account.deletedAt
                      ? "삭제 처리"
                      : account.suspendedAt
                        ? "정지"
                        : "정상"}
                  </dd>
                </div>
              </dl>
            </section>
            <div className={d.detailWorkspace}>
              <div className={d.detailContent}>
                <div
                  className={d.tabs}
                  role="group"
                  aria-label="계정 상세 보기"
                >
                  <button
                    type="button"
                    aria-pressed={tab === "documents"}
                    onClick={() => setTab("documents")}
                  >
                    자료
                  </button>
                  <button
                    type="button"
                    aria-pressed={tab === "audit"}
                    onClick={() => setTab("audit")}
                  >
                    활동 기록
                  </button>
                </div>
                {tab === "documents" ? (
                  <Documents userId={userId} />
                ) : (
                  <Audit userId={userId} account={account} />
                )}
              </div>
              <aside
                className={d.settings}
                aria-label="계정 관리 설정"
                tabIndex={0}
              >
                <AccountReview
                  key={account.id}
                  account={account}
                  autoFocus={false}
                  onLockChange={setLocked}
                  onUpdate={(updated) => resource.update({ data: updated })}
                />
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
