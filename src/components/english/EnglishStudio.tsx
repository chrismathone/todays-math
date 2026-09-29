"use client";

/**
 * 오늘의 영어 — 뷰 셋의 공통 뿌리 (D-148 · 25 §1.2 · 셸 브리프 §2.1).
 *
 * 시험 목록(`GET /api/english/exams`)을 **한 번** 읽어 학교 칩 + 시험 고르기 상태를 세 뷰(학교별 내신 대비 ·
 * 문제 만들기 · 문제 보관함)가 나눠 쓴다 — 셸이 `hidden` 으로 마운트를 유지하므로 뷰를 오가도 상태가 산다.
 * 고른 시험은 localStorage(`today-english-exam`)에 남긴다. 편집 화면은 라우트가 아니라 «학교별 내신 대비» 뷰 안
 * 상태(`editor`)다. 알림은 셸의 알림 줄(`onNotice`)로 — 토스트 없음.
 *
 * 🔴 이 화면은 서버가 낸 것을 그린다 — 오류 문구도 서버 것을 그대로 올린다(`englishClient.ts`).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import Icon from "@/components/unified/WorkspaceIcon";
import WorkProgress from "@/components/unified/WorkProgress";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import w from "@/components/unified/Workroom.module.css";
import {
  ENGLISH_GRADES,
  englishExamListResponseSchema,
  englishExamResponseSchema,
  englishMaterialListResponseSchema,
  englishSetListResponseSchema,
  englishSetResponseSchema,
  type EnglishExam,
  type EnglishGrade,
  type EnglishMaterial,
  type EnglishSet,
  type EnglishSetSummary,
} from "@/contracts/english.contract";

import EnglishDialog from "./EnglishDialog";
import EnglishEditor from "./EnglishEditor";
import EnglishExamPicker from "./EnglishExamPicker";
import EnglishLibraryView from "./EnglishLibraryView";
import EnglishMakerView from "./EnglishMakerView";
import EnglishPrepView from "./EnglishPrepView";
import {
  jsonInit,
  messageOf,
  readStoredExam,
  requestEnglish,
  statusOf,
  storeExam,
  type Load,
} from "./englishClient";
import type { EnglishNotice, EnglishView } from "./views";
import s from "./EnglishStudio.module.css";

export type { EnglishNotice, EnglishView } from "./views";

export type EnglishStudioProps = {
  view: EnglishView;
  onNavigate: (view: EnglishView) => void;
  /** 셸 modal «english-exam» — 창은 여기서 그린다(셸 `<dialog>` 가 아니다) */
  newExamOpen: boolean;
  onNewExam: () => void;
  onNewExamClose: () => void;
  /** 딥링크 `/?set=<uuid>#english` — 셸 `sync()` 가 넘긴다. 열고 나면 `onSetOpened` 로 URL 의 set 을 지운다 */
  openSetRequest?: { id: string; version: number };
  onSetOpened: () => void;
  onNotice: EnglishNotice;
};

type EditorSeed = { id: string; set?: EnglishSet };

const HEADERS: Record<EnglishView, { title: string; description: string }> = {
  english: {
    title: "학교별 내신 대비",
    description: "학교의 출제 흐름에 맞춰, 이번 시험을 준비하세요.",
  },
  "english-maker": {
    title: "문제 만들기",
    description: "이번 시험의 자료로 학교에 맞는 문제를 만듭니다.",
  },
  "english-library": {
    title: "문제 보관함",
    description: "이 시험의 문제 세트를 찾고, 열어 검토합니다.",
  },
};

export default function EnglishStudio({
  view,
  onNavigate,
  newExamOpen,
  onNewExam,
  onNewExamClose,
  openSetRequest,
  onSetOpened,
  onNotice,
}: EnglishStudioProps) {
  const [exams, setExams] = useState<Load<EnglishExam[]>>({
    status: "loading",
  });
  const [requestedExamId, setRequestedExamId] = useState<string | null>(
    readStoredExam,
  );
  const [materials, setMaterials] = useState<
    Record<string, Load<EnglishMaterial[]> | undefined>
  >({});
  const [sets, setSets] = useState<
    Record<string, Load<EnglishSetSummary[]> | undefined>
  >({});
  const [editor, setEditor] = useState<EditorSeed | null>(null);
  const examsVersion = useRef(0);
  const inflight = useRef(new Set<string>());
  // 셸이 주는 콜백은 렌더마다 바뀔 수 있다 — 딥링크 효과가 그것 때문에 다시 돌지 않게 최신 것을 ref 로 본다.
  const callbacks = useRef({ onNotice, onSetOpened, onNavigate });
  useEffect(() => {
    callbacks.current = { onNotice, onSetOpened, onNavigate };
  });

  const loadExams = useCallback(async () => {
    const version = ++examsVersion.current;
    try {
      const body = englishExamListResponseSchema.parse(
        await requestEnglish("/api/english/exams"),
      );
      if (version === examsVersion.current)
        setExams({ status: "ready", data: body.data });
    } catch (error) {
      if (version === examsVersion.current)
        setExams({ status: "error", message: messageOf(error) });
    }
  }, []);
  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const examList = exams.status === "ready" ? exams.data : [];
  const exam =
    (requestedExamId && examList.find((item) => item.id === requestedExamId)) ||
    examList[0] ||
    null;
  const examId = exam?.id ?? null;

  const selectExam = useCallback((id: string | null) => {
    setRequestedExamId(id);
    storeExam(id);
  }, []);

  const loadMaterials = useCallback(async (id: string) => {
    const key = `materials:${id}`;
    if (inflight.current.has(key)) return;
    inflight.current.add(key);
    try {
      const body = englishMaterialListResponseSchema.parse(
        await requestEnglish(`/api/english/exams/${id}/materials`),
      );
      setMaterials((current) => ({
        ...current,
        [id]: { status: "ready", data: body.data },
      }));
    } catch (error) {
      setMaterials((current) => ({
        ...current,
        [id]: { status: "error", message: messageOf(error) },
      }));
    } finally {
      inflight.current.delete(key);
    }
  }, []);
  const loadSets = useCallback(async (id: string) => {
    const key = `sets:${id}`;
    if (inflight.current.has(key)) return;
    inflight.current.add(key);
    try {
      const body = englishSetListResponseSchema.parse(
        await requestEnglish(`/api/english/exams/${id}/sets`),
      );
      setSets((current) => ({
        ...current,
        [id]: { status: "ready", data: body.data },
      }));
    } catch (error) {
      setSets((current) => ({
        ...current,
        [id]: { status: "error", message: messageOf(error) },
      }));
    } finally {
      inflight.current.delete(key);
    }
  }, []);
  // 고른 시험의 자료·세트는 처음 필요할 때 한 번 읽는다(항목이 없으면 «읽는 중»으로 본다).
  const materialsLoad = examId ? materials[examId] : undefined;
  const setsLoad = examId ? sets[examId] : undefined;
  useEffect(() => {
    if (!examId) return;
    if (!materialsLoad) void loadMaterials(examId);
    if (!setsLoad) void loadSets(examId);
  }, [examId, materialsLoad, setsLoad, loadMaterials, loadSets]);

  const refreshMaterials = useCallback(
    (id: string) => {
      setMaterials((current) => ({ ...current, [id]: { status: "loading" } }));
      void loadMaterials(id);
    },
    [loadMaterials],
  );
  const refreshSets = useCallback(
    (id: string) => {
      setSets((current) => ({ ...current, [id]: { status: "loading" } }));
      void loadSets(id);
    },
    [loadSets],
  );

  // 딥링크 — 세트를 읽어 그 시험으로 맞추고 편집 화면을 연다. 없으면 알림 줄. 어느 쪽이든 URL 의 set 을 지운다.
  const linkedId = openSetRequest?.id;
  const linkedVersion = openSetRequest?.version;
  useEffect(() => {
    if (!linkedId || !linkedVersion) return;
    let cancelled = false;
    (async () => {
      try {
        const body = englishSetResponseSchema.parse(
          await requestEnglish(`/api/english/sets/${linkedId}`),
        );
        if (cancelled) return;
        selectExam(body.data.examId);
        setEditor({ id: body.data.id, set: body.data });
        callbacks.current.onNavigate("english");
      } catch (error) {
        if (cancelled) return;
        callbacks.current.onNotice(
          statusOf(error) === 404
            ? "문제 세트를 찾을 수 없습니다."
            : messageOf(error),
          "alert",
        );
      } finally {
        if (!cancelled) callbacks.current.onSetOpened();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedId, linkedVersion, selectExam]);

  const openSet = useCallback(
    (id: string) => {
      setEditor({ id });
      onNavigate("english");
    },
    [onNavigate],
  );

  const patchExam = useCallback((next: EnglishExam) => {
    setExams((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            data: current.data.map((item) =>
              item.id === next.id ? next : item,
            ),
          }
        : current,
    );
  }, []);

  const header = HEADERS[view];

  if (exams.status === "loading")
    return (
      <div className={s.studio}>
        <WorkProgress
          className={w.loading}
          label="시험 목록을 불러오는 중입니다…"
        />
      </div>
    );
  if (exams.status === "error")
    return (
      <div className={s.studio}>
        <WorkspacePageHeader
          title={header.title}
          description={header.description}
        />
        <div role="alert" className={s.loadError}>
          <Icon name="warning" size={18} />
          <span>{exams.message}</span>
          <button
            type="button"
            className={w.outlineButton}
            onClick={() => {
              setExams({ status: "loading" });
              void loadExams();
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );

  return (
    <div className={s.studio}>
      {!exam ? (
        <>
          <WorkspacePageHeader
            title={header.title}
            description={header.description}
          >
            <button
              type="button"
              className={w.primaryButton}
              onClick={onNewExam}
            >
              <Icon name="plus" size={18} />새 시험 등록
            </button>
          </WorkspacePageHeader>
          <section className={`${s.card} ${s.empty}`}>
            <h2>첫 시험을 등록해 주세요</h2>
            <p>
              학교 · 학년 · 시험 이름을 적으면 자료와 문제 세트를 모을 자리가
              생깁니다.
            </p>
            <button
              type="button"
              className={w.primaryButton}
              onClick={onNewExam}
            >
              새 시험 등록
              <Icon name="arrow" size={18} />
            </button>
          </section>
        </>
      ) : view === "english" && editor ? (
        <EnglishEditor
          key={editor.id}
          setId={editor.id}
          initialSet={editor.set}
          exam={exam}
          onBack={() => setEditor(null)}
          onSaved={(saved) => {
            setSets((current) => {
              const list = current[saved.examId];
              if (!list || list.status !== "ready") return current;
              const {
                passage: _passage,
                questions: _questions,
                ...summary
              } = saved;
              void _passage;
              void _questions;
              return {
                ...current,
                [saved.examId]: {
                  status: "ready",
                  data: list.data.map((item) =>
                    item.id === saved.id ? summary : item,
                  ),
                },
              };
            });
            onNotice("저장했습니다.");
          }}
          onDeleted={(id) => {
            setSets((current) => {
              const list = current[exam.id];
              if (!list || list.status !== "ready") return current;
              return {
                ...current,
                [exam.id]: {
                  status: "ready",
                  data: list.data.filter((item) => item.id !== id),
                },
              };
            });
            setEditor(null);
            onNotice("문제 세트를 삭제했습니다.");
          }}
        />
      ) : view === "english" ? (
        <EnglishPrepView
          exam={exam}
          exams={examList}
          onSelectExam={selectExam}
          onNewExam={onNewExam}
          materials={materialsLoad ?? { status: "loading" }}
          onRetryMaterials={() => refreshMaterials(exam.id)}
          sets={setsLoad ?? { status: "loading" }}
          onRetrySets={() => refreshSets(exam.id)}
          onMaterialAdded={(material) => {
            setMaterials((current) => {
              const list = current[material.examId];
              return {
                ...current,
                [material.examId]: {
                  status: "ready",
                  data: [
                    material,
                    ...(list?.status === "ready" ? list.data : []),
                  ],
                },
              };
            });
            onNotice("자료를 더했습니다.");
          }}
          onMaterialRemoved={(id) => {
            setMaterials((current) => {
              const list = current[exam.id];
              if (!list || list.status !== "ready") return current;
              return {
                ...current,
                [exam.id]: {
                  status: "ready",
                  data: list.data.filter((item) => item.id !== id),
                },
              };
            });
            onNotice("자료를 삭제했습니다.");
          }}
          onExamChange={(next) => {
            patchExam(next);
            onNotice("출제 설정을 저장했습니다.");
          }}
          onExamDeleted={(id) => {
            const remaining = examList.filter((item) => item.id !== id);
            setExams({ status: "ready", data: remaining });
            selectExam(remaining[0]?.id ?? null);
            onNotice("시험을 삭제했습니다.");
          }}
          onOpenSet={openSet}
          onNavigate={onNavigate}
        />
      ) : view === "english-library" ? (
        <EnglishLibraryView
          exam={exam}
          exams={examList}
          onSelectExam={selectExam}
          sets={setsLoad ?? { status: "loading" }}
          onRefresh={() => refreshSets(exam.id)}
          onOpen={openSet}
          onMake={() => onNavigate("english-maker")}
        />
      ) : (
        <>
          <WorkspacePageHeader
            title={header.title}
            description={header.description}
          />
          <EnglishExamPicker
            exams={examList}
            exam={exam}
            onSelect={selectExam}
          />
          <EnglishMakerView
            exam={exam}
            materials={
              materialsLoad?.status === "ready" ? materialsLoad.data : []
            }
            onSaved={(id) => {
              refreshSets(exam.id);
              openSet(id);
            }}
            onNotice={(message, tone) => onNotice(message, tone)}
          />
        </>
      )}
      {newExamOpen && (
        <NewExamDialog
          onClose={onNewExamClose}
          onCreated={(created) => {
            setExams((current) =>
              current.status === "ready"
                ? { status: "ready", data: [created, ...current.data] }
                : current,
            );
            selectExam(created.id);
            setEditor(null);
            onNewExamClose();
            onNotice("시험을 등록했습니다.");
          }}
        />
      )}
    </div>
  );
}

/** «새 시험 등록» 창 — 학교 이름(필수 · 80) · 학년 · 시험 날짜(선택) · 시험 이름(기본 «2학기 중간고사») */
function NewExamDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (exam: EnglishExam) => void;
}) {
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState<EnglishGrade>("중3");
  const [examDate, setExamDate] = useState("");
  const [title, setTitle] = useState("2학기 중간고사");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!school.trim()) return setError("학교 이름을 입력해 주세요.");
    if (!title.trim()) return setError("시험 이름을 입력해 주세요.");
    setBusy(true);
    setError(null);
    try {
      const body = englishExamResponseSchema.parse(
        await requestEnglish(
          "/api/english/exams",
          jsonInit("POST", {
            school: school.trim(),
            grade,
            title: title.trim(),
            examDate: examDate || null,
          }),
        ),
      );
      onCreated(body.data);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  };
  return (
    <EnglishDialog
      title="새 시험 등록"
      kicker="오늘의 영어"
      busy={busy}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className={s.field}>
          학교 이름
          <input
            value={school}
            maxLength={80}
            onChange={(event) => setSchool(event.target.value)}
            placeholder="침산중학교"
          />
        </label>
        <label className={s.field}>
          학년
          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value as EnglishGrade)}
          >
            {ENGLISH_GRADES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          시험 날짜 <small>없어도 됩니다</small>
          <input
            type="date"
            aria-label="시험 날짜"
            value={examDate}
            onChange={(event) => setExamDate(event.target.value)}
          />
        </label>
        <label className={s.field}>
          시험 이름
          <input
            value={title}
            maxLength={100}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        {error && (
          <p className={s.formError} role="alert">
            {error}
          </p>
        )}
        <div className={s.formActions}>
          <button
            type="button"
            className={w.outlineButton}
            disabled={busy}
            onClick={onClose}
          >
            취소
          </button>
          <button type="submit" className={w.primaryButton} disabled={busy}>
            등록
          </button>
        </div>
      </form>
    </EnglishDialog>
  );
}
