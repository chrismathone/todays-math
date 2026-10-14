"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONCEPT_BLANK_TITLE_MAX } from "@/contracts/conceptBlank.contract";
import type {
  DocumentKind,
  PrivateDocument,
  PrivateDocumentSummary,
} from "@/contracts/privateWorkspace.contract";
import { documentKey } from "@/contracts/privateWorkspace.contract";
import type { DocumentWorkflow } from "@/contracts/workspaceWorkflow.contract";
import { workspaceLibraryLabel } from "@/contracts/accountAccess.contract";
import ConfirmDialog from "./ConfirmDialog";
import { PrivateCloudClient, cloudError } from "./privateCloudClient";
import WorkspacePageHeader from "./WorkspacePageHeader";
import { formatDraftDate } from "./WorkroomHome";
import WorkProgress from "./WorkProgress";
import Icon from "./WorkspaceIcon";
import { libraryDocumentInfo } from "./libraryDocumentInfo";
import s from "./PrivateLibrary.module.css";

/** 자료 종류 이름 — 목록의 종류 칸 · 종류 고르기. 개념 백지는 26 §9 ⑾. */
const KIND_LABEL: Readonly<Record<DocumentKind, string>> = {
  draft: "시험지",
  extraction: "추출한 자료",
  conceptBlank: "개념 백지",
  arithmeticSheet: "연산 연습지",
};

export type LibraryOpenOptions = {
  mode: "resume";
  workflow?: DocumentWorkflow;
};
const STAGE_LABEL: Record<DocumentWorkflow["step"], string> = {
  import: "원본 가져오기",
  crop: "문제 잘라내기",
  scope: "1 범위 설정",
  review: "2 문항 검토",
  output: "3 양식 구성·출력",
};
function isWorkingDocument(item: PrivateDocumentSummary) {
  return Boolean(
    item.workflow &&
    !(item.kind === "arithmeticSheet" && item.workflow.step === "output"),
  );
}
type PrivateLibraryProps = {
  storageScope: string;
  branchId?: string | null;
  canExport: boolean;
  canStudio: boolean;
  onOpenDraft: (
    id: string,
    options?: LibraryOpenOptions,
  ) => void | Promise<void>;
  onOpenExtraction: (id: string, options?: LibraryOpenOptions) => void;
  /** 개념 백지 메뉴가 있나 — 없으면 저장한 개념 백지를 열 수 없다(이름 변경 · 삭제는 된다). */
  canConceptBlank?: boolean;
  onOpenConceptBlank?: (id: string) => void | Promise<void>;
  canArithmetic?: boolean;
  onOpenArithmetic?: (
    id: string,
    options?: LibraryOpenOptions,
  ) => void | Promise<void>;
  onImport?: () => void;
  onNew?: () => void;
  onDeleted?: (item: PrivateDocumentSummary) => void | Promise<void>;
};

export default function PrivateLibrary(props: PrivateLibraryProps) {
  // Account changes must discard the previous owner's rows and pending dialogs.
  return (
    <PrivateLibraryContent
      key={`${props.storageScope}:${props.branchId ?? ""}`}
      {...props}
    />
  );
}

function PrivateLibraryContent({
  storageScope,
  branchId,
  canExport,
  canStudio,
  onOpenDraft,
  onOpenExtraction,
  canConceptBlank = false,
  onOpenConceptBlank,
  canArithmetic = false,
  onOpenArithmetic,
  onImport,
  onNew,
  onDeleted,
}: PrivateLibraryProps) {
  const client = useMemo(
    () => new PrivateCloudClient(storageScope),
    [storageScope],
  );
  const [items, setItems] = useState<PrivateDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("newest");
  const [mineOnly, setMineOnly] = useState(false);
  const requestId = useRef(0);
  const invalidateReads = useCallback(() => ++requestId.current, []);
  // Background refreshes preserve rows and dialogs. Only the latest read may
  // update the list, including when a mutation completes during an older read.
  const refresh = useCallback(
    async (quiet = false) => {
      const request = invalidateReads();
      if (!quiet) setLoading(true);
      try {
        const next = await client.list(undefined, !branchId || mineOnly);
        if (request !== requestId.current) return;
        setItems(next);
        setError("");
      } catch (cause) {
        if (request === requestId.current) setError(cloudError(cause));
      } finally {
        if (request === requestId.current) setLoading(false);
      }
    },
    [client, invalidateReads, branchId, mineOnly],
  );
  useEffect(() => {
    // This effect starts the account's remote library subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const changed = (event: Event) => {
      if ((event as CustomEvent).detail === storageScope) void refresh(true);
    };
    const focused = () => {
      void refresh(true);
    };
    window.addEventListener("private-library-change", changed);
    window.addEventListener("focus", focused);
    return () => {
      invalidateReads();
      window.removeEventListener("private-library-change", changed);
      window.removeEventListener("focus", focused);
    };
  }, [refresh, storageScope, invalidateReads]);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return items
      .filter(
        (item) =>
          (kind === "all" ||
            item.kind === kind ||
            (kind === "working" &&
              isWorkingDocument(item) &&
              (item.ownerId
                ? item.ownerId === storageScope
                : item.isOwner !== false))) &&
          item.title.toLocaleLowerCase().includes(search),
      )
      .sort((a, b) => {
        if (sort === "name") return a.title.localeCompare(b.title, "ko");
        if (sort === "count" && a.problemCount !== b.problemCount)
          return b.problemCount - a.problemCount;
        return (
          b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)
        );
      });
  }, [items, kind, query, sort, storageScope]);
  const hasFilters = Boolean(query.trim()) || kind !== "all" || mineOnly;
  const openDocument = async (
    item: PrivateDocumentSummary,
    open: (id: string) => void | Promise<void>,
  ) => {
    const owned = item.ownerId
      ? item.ownerId === storageScope
      : item.isOwner !== false;
    const document = owned ? item : await client.copy(item.id, item.ownerId!);
    await open(document.id);
  };
  return (
    <main className={s.library}>
      <WorkspacePageHeader
        title={workspaceLibraryLabel(branchId)}
        description={
          branchId
            ? "내 자료와 같은 학원 선생님들이 공개한 자료를 함께 볼 수 있습니다."
            : "내 계정에 저장한 시험지와 추출 자료를 어느 기기에서든 이어서 작업하세요."
        }
      >
        {canExport && onImport && (
          <button onClick={onImport}>작업 파일 불러오기</button>
        )}
        {onNew && <button onClick={onNew}>새 시험지</button>}
      </WorkspacePageHeader>
      <nav className={s.kindTabs} aria-label="자료 종류별 보기">
        {(
          [
            "all",
            "working",
            "draft",
            "arithmeticSheet",
            "extraction",
            "conceptBlank",
          ] as const
        ).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
          >
            {value === "all"
              ? "전체"
              : value === "working"
                ? "작업 중"
                : KIND_LABEL[value]}{" "}
            <span>
              {value === "all"
                ? items.length
                : items.filter((item) =>
                    value === "working"
                      ? isWorkingDocument(item) &&
                        (item.ownerId
                          ? item.ownerId === storageScope
                          : item.isOwner !== false)
                      : item.kind === value,
                  ).length}
            </span>
          </button>
        ))}
      </nav>
      <div className={s.tools}>
        {branchId && (
          <label className={s.mineFilter}>
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(event) => setMineOnly(event.target.checked)}
            />
            내 시험지만 보기
          </label>
        )}
        <input
          type="search"
          aria-label="저장한 자료 검색"
          placeholder="자료 이름으로 찾기"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label>
          종류
          <select
            aria-label="자료 종류"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="all">전체 자료</option>
            <option value="working">작업 중</option>
            <option value="draft">{KIND_LABEL.draft}</option>
            <option value="extraction">{KIND_LABEL.extraction}</option>
            <option value="conceptBlank">{KIND_LABEL.conceptBlank}</option>
            <option value="arithmeticSheet">
              {KIND_LABEL.arithmeticSheet}
            </option>
          </select>
        </label>
        <label>
          정렬
          <select
            aria-label="자료 정렬"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">최근 수정순</option>
            <option value="name">이름순</option>
            <option value="count">문항 많은순</option>
          </select>
        </label>
        <button onClick={() => void refresh()} disabled={loading}>
          새로고침
        </button>
      </div>
      {kind === "working" && (
        <p className={s.note}>
          자동저장한 작업입니다. ‘이어서 작업’은 저장한 단계로, 수정 아이콘은
          출력 설정으로 이동합니다.
        </p>
      )}
      <p className={s.resultCount} aria-live="polite">
        저장한 자료 <strong>{items.length}</strong>개
        {hasFilters && (
          <>
            {" "}
            · 검색 결과 <strong>{filtered.length}</strong>개
          </>
        )}
      </p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.board} aria-busy={loading}>
        {loading ? (
          <div className={s.loading}>
            <WorkProgress label="저장한 자료를 불러오는 중입니다…" />
          </div>
        ) : filtered.length ? (
          <table className={s.table} aria-label="저장한 자료 목록" role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" className={s.numberCell}>
                  번호
                </th>
                <th scope="col" className={s.kindCell}>
                  종류
                </th>
                <th scope="col" className={s.titleCell}>
                  자료 이름
                </th>
                <th scope="col" className={s.countCell}>
                  문항 수
                </th>
                <th scope="col" className={s.updatedCell}>
                  최근 수정
                </th>
                <th scope="col" className={s.actionsCell}>
                  관리
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {filtered.map((item, index) => (
                <LibraryItem
                  key={documentKey(item)}
                  item={item}
                  owned={
                    item.ownerId
                      ? item.ownerId === storageScope
                      : item.isOwner !== false
                  }
                  showAuthor={Boolean(branchId)}
                  number={index + 1}
                  client={client}
                  onResume={
                    item.workflow && isWorkingDocument(item)
                      ? item.kind === "draft" && canExport
                        ? () =>
                            openDocument(item, (id) =>
                              onOpenDraft(id, {
                                mode: "resume",
                                workflow: item.workflow,
                              }),
                            )
                        : item.kind === "arithmeticSheet" &&
                            canArithmetic &&
                            onOpenArithmetic
                          ? () =>
                              openDocument(item, (id) =>
                                onOpenArithmetic(id, {
                                  mode: "resume",
                                  workflow: item.workflow,
                                }),
                              )
                          : item.kind === "extraction" && canStudio
                            ? () =>
                                openDocument(item, (id) =>
                                  onOpenExtraction(id, {
                                    mode: "resume",
                                    workflow: item.workflow,
                                  }),
                                )
                            : undefined
                      : undefined
                  }
                  onDeleted={async () => {
                    await onDeleted?.(item);
                  }}
                  onChanged={(next) => {
                    invalidateReads();
                    setItems((previous) =>
                      next
                        ? previous.map((value) =>
                            documentKey(value) === documentKey(next)
                              ? next
                              : value,
                          )
                        : previous.filter(
                            (value) => documentKey(value) !== documentKey(item),
                          ),
                    );
                  }}
                  onOpen={
                    item.kind === "draft"
                      ? canExport
                        ? () => openDocument(item, onOpenDraft)
                        : undefined
                      : item.kind === "conceptBlank"
                        ? canConceptBlank && onOpenConceptBlank
                          ? () => openDocument(item, onOpenConceptBlank)
                          : undefined
                        : item.kind === "arithmeticSheet"
                          ? canArithmetic && onOpenArithmetic
                            ? () => openDocument(item, onOpenArithmetic)
                            : undefined
                          : canStudio
                            ? () => openDocument(item, onOpenExtraction)
                            : undefined
                  }
                />
              ))}
            </tbody>
          </table>
        ) : error ? (
          <div className={s.empty}>
            <h2>자료 목록을 불러오지 못했습니다</h2>
            <p>연결 상태를 확인한 뒤 새로고침해 주세요.</p>
            <button type="button" onClick={() => void refresh()}>
              다시 불러오기
            </button>
          </div>
        ) : (
          <div className={s.empty}>
            <h2>
              {hasFilters
                ? "조건에 맞는 자료가 없습니다"
                : "아직 저장한 자료가 없어요"}
            </h2>
            <p>
              {hasFilters
                ? "자료 이름이나 종류를 바꿔 다시 찾아보세요."
                : "시험지를 편집하거나 내 자료에서 문제를 추출하면 여기에 저장됩니다."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setKind("all");
                  setMineOnly(false);
                }}
              >
                검색 조건 초기화
              </button>
            )}
            {!hasFilters && onNew && (
              <button type="button" onClick={onNew}>
                새 시험지 만들기
              </button>
            )}
          </div>
        )}
      </div>
      <p className={s.note}>
        {branchId
          ? "비공개 자료는 작성자만 볼 수 있습니다. 동료의 공개 자료는 사본으로 열어 내 계정에 비공개 저장합니다."
          : "이 계정의 비공개 자료입니다. 저장이 완료되면 다른 브라우저나 기기에서도 열 수 있습니다."}
      </p>
    </main>
  );
}

function LibraryItem({
  item,
  owned,
  showAuthor,
  number,
  client,
  onOpen,
  onResume,
  onChanged,
  onDeleted,
}: {
  item: PrivateDocumentSummary;
  owned: boolean;
  showAuthor: boolean;
  number: number;
  client: PrivateCloudClient;
  onOpen?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onChanged: (next?: PrivateDocumentSummary) => void;
  onDeleted: () => Promise<void>;
}) {
  const [action, setAction] = useState<{
    kind: "info" | "delete";
    revision: number;
    title: string;
  } | null>(null);
  const [name, setName] = useState(item.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<PrivateDocument | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const detailsRequest = useRef(0);
  const renameButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  // Keep the confirmed revision even if another device refreshes this row while
  // its dialog is open: the existing API conflict protects unseen changes.
  const dialogOpen = action !== null;
  const closeDialog = () => {
    detailsRequest.current++;
    setAction(null);
    setError("");
  };
  const openInfo = async () => {
    const request = ++detailsRequest.current;
    setName(item.title);
    setError("");
    setDetails(null);
    setDetailsLoading(true);
    setAction({ kind: "info", revision: item.revision, title: item.title });
    try {
      const document = await client.get(item.id, item.ownerId);
      if (request === detailsRequest.current) setDetails(document);
    } catch (cause) {
      if (request === detailsRequest.current) setError(cloudError(cause));
    } finally {
      if (request === detailsRequest.current) setDetailsLoading(false);
    }
  };
  const perform = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
      setAction(null);
    } catch (cause) {
      setError(cloudError(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <tr role="row">
      <td className={s.numberCell} role="cell">
        {number}
      </td>
      <td className={s.kindCell} role="cell">
        <span className={s.kindBadge} data-kind={item.kind}>
          {KIND_LABEL[item.kind]}
        </span>
      </td>
      <td className={s.titleCell} role="cell">
        {onOpen ? (
          <button
            className={s.titleButton}
            aria-label={`${item.title} ${owned ? "열기" : "사본으로 열기"}`}
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                await onOpen();
              })
            }
          >
            {item.title}
          </button>
        ) : (
          <span className={s.titleText}>{item.title}</span>
        )}
        {!onOpen && <small>열기 권한 없음</small>}
        {item.workflow && (
          <div className={s.progressLine}>
            <span>{STAGE_LABEL[item.workflow.step]}</span>
            {owned && onResume && (
              <button
                type="button"
                disabled={busy}
                aria-label={`${item.title} 이어서 작업`}
                onClick={() =>
                  void perform(async () => {
                    await onResume();
                  })
                }
              >
                이어서 작업 <Icon name="arrow" size={14} />
              </button>
            )}
          </div>
        )}
        {showAuthor && (
          <small>
            작성자: {item.ownerName ?? "선생님"}
            {owned ? " (나)" : ""} ·{" "}
            {item.visibility === "branch" ? "학원에 공개" : "학원에 비공개"}
            {!owned ? " · 사본으로 열기" : ""}
          </small>
        )}
        {busy && !dialogOpen && <small role="status">처리 중…</small>}
        {error && !dialogOpen && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
      </td>
      <td className={s.countCell} role="cell">
        {item.problemCount}
        <span className={s.mobileLabel}>문항</span>
      </td>
      <td className={s.updatedCell} role="cell">
        <span className={s.mobileLabel}>수정 </span>
        <time dateTime={item.updatedAt}>{formatDraftDate(item.updatedAt)}</time>
      </td>
      <td className={s.actionsCell} role="cell">
        <div className={s.actions}>
          <button
            ref={renameButton}
            aria-label={`${item.title} 정보`}
            title="정보 · 이름 수정"
            disabled={busy}
            onClick={() => void openInfo()}
          >
            <Icon name="info" />
          </button>
          {onOpen && (
            <button
              type="button"
              aria-label={`${item.title} 수정`}
              title={owned ? "수정 · 출력 설정 열기" : "사본으로 수정"}
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await onOpen();
                })
              }
            >
              <Icon name="edit" />
            </button>
          )}
          {owned && (
            <button
              ref={deleteButton}
              aria-label={`${item.title} 삭제`}
              title="삭제"
              disabled={busy}
              onClick={() => {
                setError("");
                setAction({
                  kind: "delete",
                  revision: item.revision,
                  title: item.title,
                });
              }}
            >
              <Icon name="trash" />
            </button>
          )}
        </div>
        {action?.kind === "info" && (
          <ConfirmDialog
            title="시험지 정보"
            field={
              owned
                ? {
                    label: "자료 이름",
                    value: name,
                    maxLength:
                      item.kind === "draft"
                        ? 80
                        : item.kind === "conceptBlank"
                          ? CONCEPT_BLANK_TITLE_MAX
                          : 200,
                    onChange: setName,
                  }
                : undefined
            }
            confirmLabel={owned ? "이름 저장" : "닫기"}
            busy={busy}
            error={error}
            returnFocus={renameButton}
            onConfirm={() =>
              void perform(async () => {
                if (!owned || name.trim() === action.title) return;
                onChanged(
                  await client.rename(item.id, name.trim(), action.revision),
                );
              })
            }
            onCancel={closeDialog}
          >
            {!owned && <p>{item.title}</p>}
            <dl className={s.infoList}>
              <div>
                <dt>진행 단계</dt>
                <dd>
                  {item.workflow
                    ? STAGE_LABEL[item.workflow.step]
                    : "기록 없음"}
                </dd>
              </div>
              <div>
                <dt>종류</dt>
                <dd>{KIND_LABEL[item.kind]}</dd>
              </div>
              <div>
                <dt>문항 수</dt>
                <dd>{item.problemCount}문항</dd>
              </div>
              <div>
                <dt>저장일</dt>
                <dd>{formatDraftDate(item.createdAt)}</dd>
              </div>
              <div>
                <dt>최근 수정</dt>
                <dd>{formatDraftDate(item.updatedAt)}</dd>
              </div>
              {details &&
                libraryDocumentInfo(details).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
            {detailsLoading && (
              <WorkProgress label="시험지 정보를 확인하는 중입니다…" />
            )}
          </ConfirmDialog>
        )}
        {action?.kind === "delete" && (
          <ConfirmDialog
            title={`‘${action.title}’ 자료를 삭제할까요?`}
            confirmLabel="삭제 확인"
            busy={busy}
            error={error}
            returnFocus={deleteButton}
            onConfirm={() =>
              void perform(async () => {
                await client.remove(item.id, action.revision);
                await onDeleted();
                onChanged();
              })
            }
            onCancel={closeDialog}
          />
        )}
      </td>
    </tr>
  );
}
