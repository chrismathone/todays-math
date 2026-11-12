"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONCEPT_BLANK_TITLE_MAX } from "@/contracts/conceptBlank.contract";
import type {
  DocumentKind,
  PrivateDocument,
  PrivateDocumentSummary,
} from "@/contracts/privateWorkspace.contract";
import {
  DOCUMENT_KINDS,
  documentKey,
  documentKindLabel,
} from "@/contracts/privateWorkspace.contract";
import type { DocumentWorkflow } from "@/contracts/workspaceWorkflow.contract";
import { workspaceLibraryLabel } from "@/contracts/accountAccess.contract";
import ConfirmDialog from "./ConfirmDialog";
import { PrivateCloudClient, cloudError } from "./privateCloudClient";
import WorkspacePageHeader from "./WorkspacePageHeader";
import { formatDraftDate } from "./WorkroomHome";
import WorkProgress from "./WorkProgress";
import Icon from "./WorkspaceIcon";
import { libraryDocumentInfo } from "./libraryDocumentInfo";
import LibraryFilterBar, {
  type LibraryScope,
  type LibrarySort,
  type LibraryTagFilter,
} from "./LibraryFilterBar";
import {
  SHEET_TAGS,
  isTaggableKind,
  type SheetTag,
} from "@/contracts/sheetTag.contract";
import {
  PendingGradingStrip,
  PublishDialog,
  issuedClassCount,
  GradedExamReportLinks,
} from "./ExamPublicationParts";
import { loadExamPublications } from "./examPublicationClient";
import type { ExamPublicationList } from "@/contracts/examPublication.contract";
import p from "./ExamPublication.module.css";
import s from "./PrivateLibrary.module.css";
import o from "./print/OutputExtras.module.css";

export type LibraryOpenOptions = {
  mode: "resume";
  workflow?: DocumentWorkflow;
};
const STAGE_LABEL: Record<DocumentWorkflow["step"], string> = {
  import: "원본 가져오기",
  order: "쪽 순서",
  crop: "문제 잘라내기",
  scope: "1 범위 설정",
  review: "2 문항 검토",
  output: "3 양식 구성·출력",
};
/**
 * 수정 아이콘이 실제로 닿는 자리 — 작업실의 열기 배선과 같아야 한다(2026-10-16 외부 검토 P2).
 * 시험지 · 연산은 출력 설정, 추출 자료는 문항 검토 단계(`onOpenExtraction` 이 `step: "review"`), 개념 백지는 그 탭.
 */
const EDIT_TITLE: Readonly<Record<DocumentKind, string>> = {
  draft: "수정 · 출력 설정 열기",
  arithmeticSheet: "수정 · 출력 설정 열기",
  extraction: "수정 · 문항 검토 열기",
  conceptBlank: "수정 · 개념 백지 열기",
};
/** 연산 쓰기 문이 닫혀 있을 때 — 읽기는 되고 바꾸는 것만 막는다(`arithmeticDocumentPolicy`). */
const ARITHMETIC_READ_ONLY = "연산 연습지 저장 준비 중 · 지금은 읽기만 됩니다";
/** 태그 거름(W8) — null 은 «태그 전체», "none" 은 «태그 없음»(시험지 · 연산 연습지 가운데 태그가 없는 것). */
type TagFilter = LibraryTagFilter;
const tagMatches = (item: PrivateDocumentSummary, tag: TagFilter) =>
  tag === null
    ? true
    : tag === "none"
      ? isTaggableKind(item.kind) && !item.tag
      : item.tag === tag;
/** 태그가 없는 종류(추출한 자료 · 개념 백지)를 고르면 태그 거름은 잠시 쉰다 — 기억했다가 돌아오면 다시 걸린다. */
const taggableView = (kind: DocumentKind | "all") =>
  kind === "all" || isTaggableKind(kind);
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
  /** 문제은행 메뉴 — 은행에서 만든 시험지의 범위 · 검토 단계는 이 메뉴가 있어야 되돌아간다. */
  canBank?: boolean;
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
  /** 서버 삭제가 끝난 뒤 이 브라우저에 남은 복구 자료를 치운다 — 실패해도 삭제는 되돌아오지 않는다. */
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

type CleanupFailure = {
  key: string;
  item: PrivateDocumentSummary;
  message: string;
  retrying: boolean;
};

function PrivateLibraryContent({
  storageScope,
  branchId,
  canExport,
  canStudio,
  canBank = false,
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
  const [arithmeticWritable, setArithmeticWritable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<DocumentKind | "all">("all");
  const [tag, setTag] = useState<TagFilter>(null);
  const tagFor = useCallback(
    (view: DocumentKind | "all") => (taggableView(view) ? tag : null),
    [tag],
  );
  const activeTag = tagFor(kind);
  const [workingOnly, setWorkingOnly] = useState(false);
  const [sort, setSort] = useState<LibrarySort>("newest");
  const [mineOnly, setMineOnly] = useState(false);
  /**
   * ④ 보기 범위(05 §8.26 · Codex 합의 (가)) — 고를 때마다 도착할 범위를 고른다. 이전 범위는 기억하지 않는다.
   * «내 작업 중만»은 학원 소속이면 내 자료만 받아 온다(작업 중은 내 것만 센다 — `isMyWork`).
   * 서버를 다시 읽는 것은 학원 자료 전체 ↔ 내 자료만 · 내 작업 중만 사이뿐이다(`refresh` 가 `mineOnly` 를 본다).
   */
  const scope: LibraryScope = workingOnly
    ? "working"
    : mineOnly
      ? "mine"
      : "all";
  const setScope = (next: LibraryScope) => {
    setWorkingOnly(next === "working");
    setMineOnly(Boolean(branchId) && next !== "all");
  };
  const [cleanupFailures, setCleanupFailures] = useState<CleanupFailure[]>([]);
  // 월말평가 M1 — 낸 기록 · 낼 수 있는 반(출력 메뉴가 있을 때만). 못 읽으면 띠 · 딱지 · 단추를 숨긴다(목록은 그대로).
  const [publications, setPublications] = useState<ExamPublicationList | null>(
    null,
  );
  const refreshPublications = useCallback(async () => {
    if (!canExport) return;
    try {
      setPublications(await loadExamPublications());
    } catch {
      setPublications(null);
    }
  }, [canExport]);
  const requestId = useRef(0);
  const invalidateReads = useCallback(() => ++requestId.current, []);
  // Background refreshes preserve rows and dialogs. Only the latest read may
  // update the list, including when a mutation completes during an older read.
  const refresh = useCallback(
    async (quiet = false) => {
      const request = invalidateReads();
      if (!quiet) setLoading(true);
      try {
        const next = await client.library(undefined, !branchId || mineOnly);
        if (request !== requestId.current) return;
        setItems(next.items);
        setArithmeticWritable(next.arithmeticWriteEnabled);
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
    void refresh();
    void refreshPublications();
    const changed = (event: Event) => {
      if ((event as CustomEvent).detail === storageScope) void refresh(true);
    };
    const focused = () => {
      void refresh(true);
      void refreshPublications();
    };
    window.addEventListener("private-library-change", changed);
    window.addEventListener("focus", focused);
    return () => {
      invalidateReads();
      window.removeEventListener("private-library-change", changed);
      window.removeEventListener("focus", focused);
    };
  }, [refresh, refreshPublications, storageScope, invalidateReads]);
  const owned = useCallback(
    (item: PrivateDocumentSummary) =>
      item.ownerId ? item.ownerId === storageScope : item.isOwner !== false,
    [storageScope],
  );
  const isMyWork = useCallback(
    (item: PrivateDocumentSummary) => isWorkingDocument(item) && owned(item),
    [owned],
  );
  // 종류 × 내 작업 중 × 검색 × 내 자료는 교집합이다. 종류 수는 «그 종류를 고르면 몇 개가 남나»,
  // 작업 중 수는 «그 토글을 켜면 몇 개가 남나» — 어느 단추의 수도 다른 단추의 수에 더해지지 않는다.
  // «내 자료만 · 내 작업 중만»이면 화면에서도 내 것만 남긴다 — 범위를 바꾸며 읽기가 실패하면 앞 범위(학원 전체)의
  // 목록이 남는데, 내 자료만 ↔ 작업 중은 다시 읽지 않아 동료 자료가 «내 자료만» 아래 보였다(2026-10-21 Codex 구현 검토).
  const scoped = useMemo(
    () => (mineOnly ? items.filter(owned) : items),
    [items, mineOnly, owned],
  );
  const searched = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return scoped.filter((item) =>
      item.title.toLocaleLowerCase().includes(search),
    );
  }, [scoped, query]);
  const base = useMemo(
    () => (workingOnly ? searched.filter(isMyWork) : searched),
    [searched, workingOnly, isMyWork],
  );
  // 태그(W8)도 같은 교집합이다 — 종류 수는 «그 종류를 고르면 몇 개 남나»(태그가 없는 종류는 태그 거름이 쉰다),
  // 태그 수는 «종류 · 내 작업 중 · 검색을 건 채 그 태그를 고르면 몇 개 남나».
  const kindCounts = useMemo(() => {
    const counts = Object.fromEntries(
      DOCUMENT_KINDS.map((entry) => [entry.id, 0]),
    ) as Record<DocumentKind, number>;
    for (const item of base)
      if (tagMatches(item, tagFor(item.kind))) counts[item.kind] += 1;
    return counts;
  }, [base, tagFor]);
  const allCount = useMemo(
    () => base.filter((item) => tagMatches(item, tagFor("all"))).length,
    [base, tagFor],
  );
  const workingCount = useMemo(
    () =>
      searched.filter(
        (item) =>
          (kind === "all" || item.kind === kind) &&
          tagMatches(item, activeTag) &&
          isMyWork(item),
      ).length,
    [searched, kind, activeTag, isMyWork],
  );
  const ofKind = useMemo(
    () => base.filter((item) => kind === "all" || item.kind === kind),
    [base, kind],
  );
  const tagCounts = useMemo(() => {
    const counts = Object.fromEntries(SHEET_TAGS.map((t) => [t, 0])) as Record<
      SheetTag,
      number
    >;
    for (const item of ofKind) if (item.tag) counts[item.tag] += 1;
    return counts;
  }, [ofKind]);
  const noneCount = useMemo(
    () => ofKind.filter((item) => tagMatches(item, "none")).length,
    [ofKind],
  );
  const filtered = useMemo(
    () =>
      ofKind
        .filter((item) => tagMatches(item, activeTag))
        .sort((a, b) => {
          if (sort === "name") return a.title.localeCompare(b.title, "ko");
          if (sort === "count" && a.problemCount !== b.problemCount)
            return b.problemCount - a.problemCount;
          return (
            b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)
          );
        }),
    [ofKind, activeTag, sort],
  );
  const hasFilters =
    Boolean(query.trim()) ||
    kind !== "all" ||
    mineOnly ||
    workingOnly ||
    activeTag !== null;
  const openDocument = async (
    item: PrivateDocumentSummary,
    open: (id: string) => void | Promise<void>,
  ) => {
    const document = owned(item)
      ? item
      : await client.copy(item.id, item.ownerId!);
    await open(document.id);
  };
  /** 기록된 source · step 을 이 계정의 메뉴로 실제 되돌릴 수 있을 때만 «이어서 작업»을 건다. */
  const resumeOpener = (
    item: PrivateDocumentSummary,
  ): (() => Promise<void>) | undefined => {
    const workflow = item.workflow;
    if (!workflow || !isWorkingDocument(item) || !owned(item)) return undefined;
    if (item.kind === "draft") {
      if (!canExport) return undefined;
      const restorable =
        workflow.step === "output" ||
        (workflow.source === "extraction" ? canStudio : canBank);
      return restorable
        ? () =>
            openDocument(item, (id) =>
              onOpenDraft(id, { mode: "resume", workflow }),
            )
        : undefined;
    }
    if (item.kind === "arithmeticSheet")
      return canArithmetic && onOpenArithmetic
        ? () =>
            openDocument(item, (id) =>
              onOpenArithmetic(id, { mode: "resume", workflow }),
            )
        : undefined;
    if (item.kind === "extraction")
      return canStudio
        ? () =>
            openDocument(item, (id) =>
              onOpenExtraction(id, { mode: "resume", workflow }),
            )
        : undefined;
    return undefined;
  };
  const editOpener = (
    item: PrivateDocumentSummary,
  ): (() => Promise<void>) | undefined => {
    // 동료 자료는 사본을 만들어 연다 — 연산 쓰기 문이 닫혀 있으면 사본도 못 만든다.
    if (!owned(item) && item.kind === "arithmeticSheet" && !arithmeticWritable)
      return undefined;
    if (item.kind === "draft")
      return canExport ? () => openDocument(item, onOpenDraft) : undefined;
    if (item.kind === "conceptBlank")
      return canConceptBlank && onOpenConceptBlank
        ? () => openDocument(item, onOpenConceptBlank)
        : undefined;
    if (item.kind === "arithmeticSheet")
      return canArithmetic && onOpenArithmetic
        ? () => openDocument(item, onOpenArithmetic)
        : undefined;
    return canStudio ? () => openDocument(item, onOpenExtraction) : undefined;
  };
  const cleanupAfterDelete = async (item: PrivateDocumentSummary) => {
    const key = documentKey(item);
    setCleanupFailures((previous) =>
      previous.map((failure) =>
        failure.key === key ? { ...failure, retrying: true } : failure,
      ),
    );
    try {
      await onDeleted?.(item);
      setCleanupFailures((previous) =>
        previous.filter((failure) => failure.key !== key),
      );
    } catch (cause) {
      setCleanupFailures((previous) => [
        ...previous.filter((failure) => failure.key !== key),
        { key, item, message: cloudError(cause), retrying: false },
      ]);
    }
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
      <LibraryFilterBar
        kind={kind}
        onKindChange={setKind}
        allCount={allCount}
        kindCounts={kindCounts}
        tag={tag}
        onTagChange={setTag}
        tagCounts={tagCounts}
        noneCount={noneCount}
        scope={scope}
        onScopeChange={setScope}
        branch={Boolean(branchId)}
        workingCount={workingCount}
        sort={sort}
        onSortChange={setSort}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        onRefresh={() => void refresh()}
        total={scoped.length}
        shown={filtered.length}
        filtered={hasFilters}
      />
      {workingOnly && (
        <p className={s.note}>
          진행 단계가 기록된 내 자료입니다. ‘이어서 작업’은 기록된 단계로
          엽니다.
        </p>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {cleanupFailures.map((failure) => (
        <div key={failure.key} className={s.cleanupNotice} role="alert">
          <p>
            ‘{failure.item.title}’ 자료는 삭제됐습니다. 이 브라우저에 남은 복구
            자료를 정리하지 못했습니다. {failure.message}
          </p>
          <button
            type="button"
            disabled={failure.retrying}
            onClick={() => void cleanupAfterDelete(failure.item)}
          >
            다시 정리
          </button>
          <button
            type="button"
            disabled={failure.retrying}
            onClick={() =>
              setCleanupFailures((previous) =>
                previous.filter((entry) => entry.key !== failure.key),
              )
            }
          >
            닫기
          </button>
        </div>
      ))}
      {publications && (
        <PendingGradingStrip publications={publications.publications} />
      )}
      <div className={s.board} aria-busy={loading}>
        {loading ? (
          <div className={s.loading}>
            <WorkProgress label="저장한 자료를 불러오는 중입니다…" />
          </div>
        ) : filtered.length ? (
          <table
            className={s.table}
            aria-label="저장한 자료 목록"
            role="table"
            data-publish={publications ? "true" : undefined}
          >
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
                  owned={owned(item)}
                  showAuthor
                  showVisibility={Boolean(branchId)}
                  readOnlyReason={
                    item.kind === "arithmeticSheet" && !arithmeticWritable
                      ? ARITHMETIC_READ_ONLY
                      : undefined
                  }
                  number={index + 1}
                  client={client}
                  onResume={resumeOpener(item)}
                  onDeleted={() => {
                    invalidateReads();
                    setItems((previous) =>
                      previous.filter(
                        (value) => documentKey(value) !== documentKey(item),
                      ),
                    );
                    void cleanupAfterDelete(item);
                  }}
                  onChanged={(next) => {
                    invalidateReads();
                    setItems((previous) =>
                      previous.map((value) =>
                        documentKey(value) === documentKey(next) ? next : value,
                      ),
                    );
                  }}
                  onOpen={editOpener(item)}
                  publish={
                    publications && item.kind === "draft" && owned(item)
                      ? {
                          issued: issuedClassCount(
                            publications.publications,
                            item.id,
                          ),
                          classes: publications.classes,
                          reports: publications.publications.filter(
                            (publication) => publication.documentId === item.id,
                          ),
                          onPublished: () => void refreshPublications(),
                        }
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
                ? "자료 이름이나 종류 · 태그 · 보기를 바꿔 다시 찾아보세요."
                : "시험지를 편집하거나 내 자료에서 문제를 추출하면 여기에 저장됩니다."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setKind("all");
                  setTag(null);
                  setWorkingOnly(false);
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
  showVisibility,
  readOnlyReason,
  number,
  client,
  onOpen,
  onResume,
  onChanged,
  onDeleted,
  publish,
}: {
  /** 월말평가 M1 — 내 시험지(시험지 종류)일 때만: 낸 반 수 · 낼 수 있는 반 · 낸 뒤 다시 읽기. */
  publish?: {
    issued: number;
    classes: ExamPublicationList["classes"];
    reports: ExamPublicationList["publications"];
    onPublished: () => void;
  };
  item: PrivateDocumentSummary;
  owned: boolean;
  showAuthor: boolean;
  /** 학원 소속일 때만 공개 범위를 붙인다 — 혼자 쓰는 계정에는 뜻이 없다. */
  showVisibility: boolean;
  /** 있으면 이 행은 읽기만 된다 — 이름 변경 · 삭제 · 사본을 잠그고 까닭을 옆에 적는다. */
  readOnlyReason?: string;
  number: number;
  client: PrivateCloudClient;
  onOpen?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onChanged: (next: PrivateDocumentSummary) => void;
  /** 서버 삭제가 성공한 직후 — 행을 걷고 뒷정리는 부모가 따로 한다. */
  onDeleted: () => void;
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
  const publishButton = useRef<HTMLButtonElement>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const canRename = owned && !readOnlyReason;
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
        <span className={o.kindStack}>
          <span className={s.kindBadge} data-kind={item.kind}>
            {documentKindLabel(item.kind)}
          </span>
          {item.tag && (
            <span className={o.tagBadge} data-sheet-tag>
              {item.tag}
            </span>
          )}
          {publish && publish.issued > 0 && (
            <span className={p.issuedBadge}>{publish.issued}개 반에 냄</span>
          )}
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
        {!onOpen && (
          <small>
            {!owned && readOnlyReason ? readOnlyReason : "열기 권한 없음"}
          </small>
        )}
        {publish && <GradedExamReportLinks publications={publish.reports} />}
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
            {owned ? " (나)" : ""}
            {showVisibility
              ? ` · ${item.visibility === "branch" ? "학원에 공개" : "학원에 비공개"}`
              : ""}
            {!owned && onOpen ? " · 사본으로 열기" : ""}
          </small>
        )}
        {owned && readOnlyReason && <small>{readOnlyReason}</small>}
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
          {publish && (
            <button
              ref={publishButton}
              type="button"
              className={s.publishButton}
              disabled={busy}
              onClick={() => setPublishOpen(true)}
            >
              반에 내기
            </button>
          )}
          <button
            ref={renameButton}
            aria-label={`${item.title} 정보`}
            title={canRename ? "정보 · 이름 수정" : "정보"}
            disabled={busy}
            onClick={() => void openInfo()}
          >
            <Icon name="info" />
          </button>
          {onOpen && (
            <button
              type="button"
              aria-label={`${item.title} 수정`}
              title={owned ? EDIT_TITLE[item.kind] : "사본으로 수정"}
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
              title={readOnlyReason ? `삭제 불가 · ${readOnlyReason}` : "삭제"}
              disabled={busy || Boolean(readOnlyReason)}
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
        {publish && publishOpen && (
          <PublishDialog
            item={item}
            classes={publish.classes}
            returnFocus={publishButton}
            onClose={() => setPublishOpen(false)}
            onPublished={publish.onPublished}
          />
        )}
        {action?.kind === "info" && (
          <ConfirmDialog
            title="시험지 정보"
            field={
              canRename
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
            confirmLabel={canRename ? "이름 저장" : "닫기"}
            busy={busy}
            error={error}
            returnFocus={renameButton}
            onConfirm={() =>
              void perform(async () => {
                if (!canRename || name.trim() === action.title) return;
                onChanged(
                  await client.rename(item.id, name.trim(), action.revision),
                );
              })
            }
            onCancel={closeDialog}
          >
            {!canRename && <p>{item.title}</p>}
            {owned && readOnlyReason && (
              <p className={s.readOnlyNote}>{readOnlyReason}</p>
            )}
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
                <dd>{documentKindLabel(item.kind)}</dd>
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
                // 서버 삭제가 서면 행은 바로 걷힌다 — 이 브라우저의 뒷정리가 실패해도 다시 삭제를 보내지 않는다(409).
                await client.remove(item.id, action.revision);
                onDeleted();
              })
            }
            onCancel={closeDialog}
          />
        )}
      </td>
    </tr>
  );
}
