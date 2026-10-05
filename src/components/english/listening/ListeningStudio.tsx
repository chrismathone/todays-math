"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ListeningSetDetail,
  ListeningSetSummary,
} from "@/contracts/englishListeningHttp.contract";
import { englishListeningDocumentSchema } from "@/contracts/englishListening.contract";
import {
  ListeningTeacherWorkspace,
  TeacherWorkbench,
} from "./ListeningTeacherWorkspace";
import { ListeningDraftEditor } from "./ListeningDraftEditor";
import {
  ListeningReviewPanel,
  type ListeningReviewKind,
} from "./ListeningReviewPanel";
import { ListeningAssignments } from "./ListeningAssignments";
import {
  editListeningDraft,
  emptyListeningEdit,
  type ListeningEdit,
} from "./listeningDraft";
import {
  ListeningRequestError,
  listeningError,
  listeningRequest,
} from "./listeningClient";
import { uploadListeningAudio } from "./listeningUpload";
import s from "./ListeningTeacherWorkspace.module.css";
import tabs from "../EnglishTabs.module.css";

type Area = "materials" | "create" | "assignments";

export default function ListeningStudio({
  active = true,
  openSetRequest,
  onSetOpened,
}: {
  active?: boolean;
  openSetRequest?: { id: string; version: number };
  onSetOpened?: (version: number) => void;
}) {
  const [area, setArea] = useState<Area>("materials");
  const [materials, setMaterials] = useState<ListeningSetSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<ListeningSetDetail | null>(null);
  const [draft, setDraft] = useState<ListeningEdit | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const [editorTarget, setEditorTarget] = useState<ListeningSetDetail | null>(
    null,
  );
  const [baseline, setBaseline] = useState("");
  const [pending, setPending] = useState("듣기 자료를 불러오는 중입니다.");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState<ListeningSetDetail | null>(null);
  const [assignmentDirty, setAssignmentDirty] = useState(false);
  const target = useRef<ListeningSetDetail | null>(null);
  const request = useRef<AbortController | null>(null);
  const dirty = draft !== null && JSON.stringify(draft) !== baseline;

  const run = useCallback(
    async (label: string, task: (signal: AbortSignal) => Promise<void>) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setPending(label);
      setError("");
      setNotice("");
      setConflict(false);
      try {
        await task(controller.signal);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(listeningError(cause));
          setConflict(
            cause instanceof ListeningRequestError && cause.status === 409,
          );
        }
      } finally {
        if (request.current === controller && !controller.signal.aborted)
          setPending("");
      }
    },
    [],
  );

  const refreshList = useCallback(async (signal: AbortSignal) => {
    const items = await listeningRequest<ListeningSetSummary[]>(
      "/sets",
      signal,
    );
    signal.throwIfAborted();
    if (!Array.isArray(items)) throw new Error("invalid list");
    setMaterials(items);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    request.current = controller;
    void listeningRequest<ListeningSetSummary[]>("/sets", controller.signal)
      .then((items) => {
        controller.signal.throwIfAborted();
        if (!Array.isArray(items)) throw new Error("invalid list");
        setMaterials(items);
        setLoaded(true);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(listeningError(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted && request.current === controller)
          setPending("");
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, [active]);

  useEffect(() => {
    if (!dirty && !assignmentDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, assignmentDirty]);

  useEffect(() => {
    if (!active || (!dirty && !assignmentDirty)) return;
    const beforeLeave = (event: Event) => {
      if (
        !window.confirm(
          "저장하지 않은 입력이 있습니다. 다른 메뉴로 이동할까요? 돌아오면 이어서 편집할 수 있습니다.",
        )
      )
        event.preventDefault();
    };
    window.addEventListener("english-listening-before-leave", beforeLeave);
    return () =>
      window.removeEventListener("english-listening-before-leave", beforeLeave);
  }, [active, dirty, assignmentDirty]);

  function allowDiscard() {
    return !dirty || window.confirm("저장하지 않은 입력을 버릴까요?");
  }
  function beginEdit(value: ListeningSetDetail | null) {
    if (!allowDiscard()) return;
    setEditorSession((value) => value + 1);
    const next = value
      ? editListeningDraft(value.document)
      : emptyListeningEdit();
    target.current = value;
    setEditorTarget(value);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setLatest(null);
    setError("");
    setArea("create");
  }
  const select = useCallback(
    async (id: string) => {
      if (dirty && !window.confirm("저장하지 않은 입력을 버릴까요?")) return;
      if (
        assignmentDirty &&
        !window.confirm("배정 입력을 보존하고 자료를 열까요?")
      )
        return;
      await run("자료를 불러오는 중입니다.", async (signal) => {
        const detail = await listeningRequest<ListeningSetDetail>(
          `/sets/${encodeURIComponent(id)}`,
          signal,
        );
        signal.throwIfAborted();
        setSelected(detail);
        setDraft(null);
        target.current = null;
        setEditorTarget(null);
        setLatest(null);
        setArea("materials");
      });
    },
    [dirty, assignmentDirty, run],
  );

  const consumedRequest = useRef<number | undefined>(undefined);
  const openedCallback = useRef(onSetOpened);
  useEffect(() => {
    openedCallback.current = onSetOpened;
  }, [onSetOpened]);
  useEffect(() => {
    // Let the list finish first: run() replaces the current request controller.
    if (
      !active ||
      !loaded ||
      pending ||
      !openSetRequest ||
      consumedRequest.current === openSetRequest.version
    )
      return;
    const { id, version } = openSetRequest;
    consumedRequest.current = version;
    void select(id).finally(() => openedCallback.current?.(version));
  }, [active, loaded, pending, openSetRequest, select]);
  function adopt(detail: ListeningSetDetail) {
    target.current = detail;
    setEditorTarget(detail);
    setSelected(detail);
    const next = editListeningDraft(detail.document);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setLatest(null);
  }
  async function persist(value: ListeningEdit, signal: AbortSignal) {
    let current = target.current;
    if (!current) {
      const { title, level, examId, rights, basis } = value;
      current = await listeningRequest<ListeningSetDetail>(
        "/sets",
        signal,
        "POST",
        { title, level, examId, rights, basis },
      );
      signal.throwIfAborted();
      target.current = current;
      setEditorTarget(current);
    }
    const saved = await listeningRequest<ListeningSetDetail>(
      `/sets/${encodeURIComponent(current.id)}`,
      signal,
      "PATCH",
      { ...value, expectedRevision: current.revision },
    );
    signal.throwIfAborted();
    target.current = saved;
    setEditorTarget(saved);
    const authoritative = await listeningRequest<ListeningSetDetail>(
      `/sets/${encodeURIComponent(saved.id)}`,
      signal,
    );
    signal.throwIfAborted();
    adopt(authoritative);
    return authoritative;
  }
  function save() {
    if (!draft) return;
    void run("초안을 저장하는 중입니다.", async (signal) => {
      await persist(draft, signal);
      setNotice("초안을 저장했습니다.");
      await refreshList(signal);
    });
  }
  function upload(groupId: string, file: File) {
    if (!draft || !target.current) return;
    void run("음원을 올리는 중입니다.", async (signal) => {
      const current = dirty ? await persist(draft, signal) : target.current!;
      const audio = await uploadListeningAudio(
        current.id,
        file,
        signal,
        (message) => {
          if (!signal.aborted) setPending(message);
        },
      );
      signal.throwIfAborted();
      const withAudio = {
        ...editListeningDraft(current.document),
        groups: draft.groups.map((group) =>
          group.id === groupId ? { ...group, audio } : group,
        ),
      };
      setDraft(withAudio);
      await persist(withAudio, signal);
      setNotice("음원을 등록하고 초안을 저장했습니다.");
      await refreshList(signal);
    });
  }
  function review(
    kind: ListeningReviewKind,
    groupId?: string,
    fromEditor = false,
  ) {
    const value = fromEditor ? target.current : selected;
    if (!value && !fromEditor) return;
    void run("검수 확인을 기록하는 중입니다.", async (signal) => {
      const current =
        fromEditor && draft && (dirty || !value)
          ? await persist(draft, signal)
          : value!;
      await listeningRequest(
        `/sets/${encodeURIComponent(current.id)}/review`,
        signal,
        "POST",
        {
          expectedRevision: current.revision,
          kind,
          ...(groupId ? { groupId } : {}),
          ...(kind === "rights"
            ? { basis: current.document.provenance.basis }
            : {}),
        },
      );
      const detail = await listeningRequest<ListeningSetDetail>(
        `/sets/${encodeURIComponent(current.id)}`,
        signal,
      );
      signal.throwIfAborted();
      if (fromEditor) adopt(detail);
      else setSelected(detail);
      setNotice("검수 확인을 기록했습니다.");
    });
  }
  function publish() {
    if (!selected) return;
    void run("자료를 발행하는 중입니다.", async (signal) => {
      await listeningRequest(
        `/sets/${encodeURIComponent(selected.id)}/publish`,
        signal,
        "POST",
        { expectedRevision: selected.revision },
      );
      const detail = await listeningRequest<ListeningSetDetail>(
        `/sets/${encodeURIComponent(selected.id)}`,
        signal,
      );
      signal.throwIfAborted();
      setSelected(detail);
      setNotice("자료를 발행했습니다.");
      await refreshList(signal);
    });
  }
  function inspectLatest() {
    const id = target.current?.id ?? selected?.id;
    if (!id) return;
    void run("최신 저장본을 확인하는 중입니다.", async (signal) => {
      const detail = await listeningRequest<ListeningSetDetail>(
        `/sets/${encodeURIComponent(id)}`,
        signal,
      );
      signal.throwIfAborted();
      setLatest(detail);
    });
  }
  const complete = selected
    ? englishListeningDocumentSchema.safeParse(selected.document)
    : null;
  const busy = active && Boolean(pending);
  return (
    <section className={s.studio} aria-label="영어듣기 스튜디오">
      <div className={s.workspace}>
        <header className={s.heading}>
          <div>
            <p className={s.eyebrow}>오늘의 영어 · 교사</p>
            <h1>영어듣기</h1>
            <p className={s.muted}>
              듣기 자료를 준비하고 수업·학습·짧은 연습평가에 사용합니다.
            </p>
          </div>
          <button type="button" disabled={busy} onClick={() => beginEdit(null)}>
            새 자료 만들기
          </button>
        </header>
        <nav className={tabs.tabs} aria-label="영어듣기 영역">
          {(
            [
              ["materials", "듣기 자료"],
              ["create", "만들기"],
              ["assignments", "과제와 결과"],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={tabs.tab}
              aria-pressed={area === key}
              disabled={busy}
              onClick={() => {
                if (key === "create" && !draft) beginEdit(null);
                else setArea(key);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        {pending ? (
          <div role="status" className={s.notice}>
            {pending}
            <button
              type="button"
              onClick={() => {
                request.current?.abort();
                setPending("");
                setError(
                  "작업을 중단했습니다. 입력은 보존했습니다. 저장 여부는 최신 저장본에서 확인하세요.",
                );
              }}
            >
              작업 중단
            </button>
          </div>
        ) : null}
        {notice ? (
          <p role="status" className={s.notice}>
            {notice}
          </p>
        ) : null}
        {error ? (
          <div role="alert" className={s.error}>
            <p>{error}</p>
            {conflict ? (
              <button type="button" onClick={inspectLatest}>
                최신 저장본 확인
              </button>
            ) : null}
            {!loaded ? (
              <button
                type="button"
                onClick={() =>
                  void run("자료를 다시 불러오는 중입니다.", refreshList)
                }
              >
                자료 목록 다시 시도
              </button>
            ) : null}
          </div>
        ) : null}
        {latest ? (
          <section className={s.formSection} aria-label="최신 저장본 비교">
            <h2>최신 저장본 · 개정 {latest.revision}</h2>
            <p>{latest.document.title || "제목 없는 초안"}</p>
            <p>{latest.document.provenance.basis}</p>
            {latest.document.groups.map((group, i) => (
              <details key={group.id}>
                <summary>묶음 {i + 1} 저장된 대본과 문항</summary>
                <p className={s.transcript}>{group.transcript.text}</p>
                {group.questions.map((q) => (
                  <p key={q.id}>{q.prompt}</p>
                ))}
              </details>
            ))}
            <div className={s.actions}>
              <button
                type="button"
                onClick={() => {
                  if (allowDiscard()) {
                    if (draft) adopt(latest);
                    else {
                      setSelected(latest);
                      setLatest(null);
                    }
                  }
                }}
              >
                최신 저장본으로 바꾸기
              </button>
              <button type="button" onClick={() => setLatest(null)}>
                현재 입력 유지
              </button>
            </div>
          </section>
        ) : null}
      </div>
      {area === "materials" && loaded ? (
        <ListeningTeacherWorkspace
          embedded
          materials={materials.map((material) => ({
            ...material,
            title: material.title || "제목 없는 초안",
          }))}
          selectedDocument={null}
          selectedMaterialId={selected?.id}
          mediaUrlsByAssetId={selected?.mediaUrlsByAssetId ?? {}}
          onSelectMaterial={select}
          selectedContent={
            selected ? (
              <>
                <div className={s.documentHeading}>
                  <p className={s.eyebrow}>
                    저장된 자료 · 개정 {selected.revision}
                  </p>
                  <h2>{selected.document.title || "제목 없는 초안"}</h2>
                  <p className={s.muted}>
                    {selected.document.level ?? "수준 미지정"} ·{" "}
                    {selected.document.groups.length}묶음
                  </p>
                </div>
                <dl className={s.metadata}>
                  <dt>제작 출처</dt>
                  <dd>
                    {selected.document.provenance.basis ||
                      "아직 작성하지 않았습니다."}
                  </dd>
                </dl>
                {active && complete?.success ? (
                  <TeacherWorkbench
                    key={`workbench:${selected.id}:${selected.revision}`}
                    document={complete.data}
                    mediaUrlsByAssetId={selected.mediaUrlsByAssetId}
                    playbackEpoch={busy ? 1 : 0}
                    busy={busy}
                  />
                ) : (
                  <p className={s.notice}>
                    작성 중인 초안입니다. 음원과 문항을 채워 주세요.
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => beginEdit(selected)}
                >
                  자료 수정
                </button>
                <ListeningReviewPanel
                  key={`reviews:${selected.id}:${selected.revision}`}
                  detail={selected}
                  busy={busy}
                  onReview={review}
                  onPublish={publish}
                />
              </>
            ) : (
              <p className={s.empty}>
                목록에서 자료를 선택하거나 새 자료를 만드세요.
              </p>
            )
          }
        />
      ) : null}
      {area === "create" && draft ? (
        <div className={s.workspace}>
          <ListeningDraftEditor
            key={editorSession}
            draft={draft}
            source={editorTarget?.document.source}
            setDraft={setDraft}
            saved={editorTarget !== null}
            busy={busy || !active}
            mediaUrls={active ? (editorTarget?.mediaUrlsByAssetId ?? {}) : {}}
            onSave={save}
            onUpload={upload}
            onConfirmRights={() => review("rights", undefined, true)}
            rightsReviewed={
              editorTarget?.document.rightsReview !== null &&
              editorTarget !== null &&
              draft.basis === editorTarget.document.provenance.basis &&
              JSON.stringify(draft.rights) ===
                JSON.stringify(editorTarget.document.rights)
            }
            onClose={() => {
              if (allowDiscard()) {
                setDraft(null);
                setArea("materials");
              }
            }}
          />
          <p className={s.muted} role="status">
            {dirty
              ? "저장하지 않은 변경이 있습니다."
              : "현재 입력과 저장본이 같습니다."}
          </p>
        </div>
      ) : null}
      <div hidden={area !== "assignments"}>
        <ListeningAssignments
          active={active && area === "assignments"}
          materials={materials}
          onDirtyChange={setAssignmentDirty}
        />
      </div>
    </section>
  );
}
