"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PrivateDocumentSummary } from "@/contracts/privateWorkspace.contract";
import ConfirmDialog from "./ConfirmDialog";
import { PrivateCloudClient, cloudError } from "./privateCloudClient";
import WorkspacePageHeader from "./WorkspacePageHeader";
import { formatDraftDate } from "./WorkroomHome";
import WorkProgress from "./WorkProgress";
import s from "./PrivateLibrary.module.css";

export default function PrivateLibrary({
  storageScope,
  canExport,
  canStudio,
  onOpenDraft,
  onOpenExtraction,
  onImport,
  onNew,
  onDeleted,
}: {
  storageScope: string;
  canExport: boolean;
  canStudio: boolean;
  onOpenDraft: (id: string) => void | Promise<void>;
  onOpenExtraction: (id: string) => void;
  onImport?: () => void;
  onNew?: () => void;
  onDeleted?: (item: PrivateDocumentSummary) => void | Promise<void>;
}) {
  const client = useMemo(
    () => new PrivateCloudClient(storageScope),
    [storageScope],
  );
  const [items, setItems] = useState<PrivateDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  // `quiet` — 창 초점 복귀·자동 저장 알림으로 **뒤에서** 다시 읽을 때는 격자를 «불러오는 중»으로
  // 바꿔 끼우지 않는다. 바꿔 끼우면 카드가 다시 만들어져 열려 있던 삭제 확인 창이 사라진다 —
  // 모달 창에서 Tab 이 주소창으로 나갔다 돌아오기만 해도 그랬다(2026-09-19 브라우저 측정).
  const refresh = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        setItems(await client.list());
        setError("");
      } catch (cause) {
        setError(cloudError(cause));
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [client],
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
      window.removeEventListener("private-library-change", changed);
      window.removeEventListener("focus", focused);
    };
  }, [refresh, storageScope]);
  const filtered = items.filter((item) =>
    item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <main className={s.library}>
      <WorkspacePageHeader
        title="내 시험지"
        description="내 계정에 저장한 시험지와 추출 자료를 어느 기기에서든 이어서 작업하세요."
      >
        {canExport && onImport && (
          <button onClick={onImport}>작업 파일 불러오기</button>
        )}
        {onNew && <button onClick={onNew}>새 시험지</button>}
      </WorkspacePageHeader>
      <div className={s.tools}>
        <strong>저장한 자료 {items.length}</strong>
        <input
          aria-label="저장한 자료 검색"
          placeholder="자료 이름으로 찾기"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button onClick={() => void refresh()} disabled={loading}>
          새로고침
        </button>
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <WorkProgress label="저장한 자료를 불러오는 중입니다…" />
      ) : filtered.length ? (
        <div className={s.grid}>
          {filtered.map((item) => (
            <LibraryItem
              key={`${item.id}:${item.revision}`}
              item={item}
              client={client}
              onDeleted={async () => {
                await onDeleted?.(item);
              }}
              onChanged={(next) =>
                setItems((previous) =>
                  next
                    ? previous.map((value) =>
                        value.id === next.id ? next : value,
                      )
                    : previous.filter((value) => value.id !== item.id),
                )
              }
              onOpen={
                item.kind === "draft"
                  ? canExport
                    ? () => onOpenDraft(item.id)
                    : undefined
                  : canStudio
                    ? () => onOpenExtraction(item.id)
                    : undefined
              }
            />
          ))}
        </div>
      ) : (
        !error && (
          <div className={s.empty}>
            <h2>
              {query ? "검색한 자료가 없습니다" : "아직 저장한 자료가 없어요"}
            </h2>
            <p>
              {query
                ? "다른 이름으로 검색해 보세요."
                : "시험지를 편집하거나 내 자료에서 문제를 추출하면 여기에 저장됩니다."}
            </p>
          </div>
        )
      )}
      <p className={s.note}>
        이 계정의 비공개 자료입니다. 저장이 완료되면 다른 브라우저나 기기에서도
        열 수 있습니다.
      </p>
    </main>
  );
}

function LibraryItem({
  item,
  client,
  onOpen,
  onChanged,
  onDeleted,
}: {
  item: PrivateDocumentSummary;
  client: PrivateCloudClient;
  onOpen?: () => void | Promise<void>;
  onChanged: (next?: PrivateDocumentSummary) => void;
  onDeleted: () => Promise<void>;
}) {
  const [action, setAction] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(item.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const renameButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  // 이름 변경·삭제 확인은 겹쳐 뜨는 창이다 — 그동안의 처리 중·오류는 창 안에 보이고 카드에는
  // 안 붙는다(카드 높이 불변). 카드에 남는 것은 «열기»의 처리 중·오류뿐이다.
  const dialogOpen = action !== null;
  const closeDialog = () => {
    setAction(null);
    setError("");
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
    <article className={s.card}>
      <small>{item.kind === "draft" ? "시험지" : "추출한 자료"}</small>
      <h2>{item.title}</h2>
      <p>
        {item.problemCount}문항 · {formatDraftDate(item.updatedAt)}
      </p>
      <div className={s.actions}>
        {onOpen && (
          <button
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                await onOpen();
              })
            }
          >
            열기
          </button>
        )}
        <button
          ref={renameButton}
          aria-label={`${item.title} 이름 변경`}
          disabled={busy}
          onClick={() => {
            setName(item.title);
            setError("");
            setAction("rename");
          }}
        >
          이름 변경
        </button>
        <button
          ref={deleteButton}
          aria-label={`${item.title} 삭제`}
          disabled={busy}
          onClick={() => {
            setError("");
            setAction("delete");
          }}
        >
          삭제
        </button>
      </div>
      {action === "rename" && (
        <ConfirmDialog
          title="이름 변경"
          field={{
            label: "새 자료 이름",
            value: name,
            maxLength: item.kind === "draft" ? 80 : 200,
            onChange: setName,
          }}
          confirmLabel="이름 저장"
          busy={busy}
          error={error}
          returnFocus={renameButton}
          onConfirm={() =>
            void perform(async () => {
              onChanged(
                await client.rename(item.id, name.trim(), item.revision),
              );
            })
          }
          onCancel={closeDialog}
        />
      )}
      {action === "delete" && (
        <ConfirmDialog
          title={`‘${item.title}’ 자료를 삭제할까요?`}
          confirmLabel="삭제 확인"
          busy={busy}
          error={error}
          returnFocus={deleteButton}
          onConfirm={() =>
            void perform(async () => {
              await client.remove(item.id, item.revision);
              await onDeleted();
              onChanged();
            })
          }
          onCancel={closeDialog}
        />
      )}
      {busy && !dialogOpen && <small role="status">처리 중…</small>}
      {error && !dialogOpen && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
