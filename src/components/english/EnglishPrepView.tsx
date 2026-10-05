"use client";

/**
 * «학교별 내신 대비» (D-148 · 25 §1.2 · 셸 브리프 §2.2) — 시안 `hifi-d148-english-switch.html` C 안 본문 그대로.
 *
 * 머리 → 학교 칩 + 시험 고르기 → «이번 시험 준비» 세 단계(단추) → 왼쪽 시험 자료 · 출제 설정 / 오른쪽 대비 문제 세트.
 * 단계 수는 읽어 둔 목록이 있으면 그 길이로, 없으면 시험 요약(`materialCount`…)으로 센다 — 한 자리에서만 센다.
 * 🔴 D-30 — 카드·행에는 손가락 커서가 없다. 누르는 것은 단추·링크뿐이다.
 */
import { useRef, useState, type RefObject } from "react";

import ConfirmDialog from "@/components/unified/ConfirmDialog";
import Icon from "@/components/unified/WorkspaceIcon";
import WorkProgress from "@/components/unified/WorkProgress";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import w from "@/components/unified/Workroom.module.css";
import {
  ENGLISH_GENERATED_TYPES,
  ENGLISH_MATERIAL_CONTENT_MAX,
  ENGLISH_MATERIAL_MAX_BYTES,
  ENGLISH_MATERIAL_MAX_LABEL,
  englishExamResponseSchema,
  englishMaterialResponseSchema,
  type EnglishExam,
  type EnglishMaterial,
  type EnglishQuestionType,
  type EnglishSetSummary,
} from "@/contracts/english.contract";

import AutoGrowTextarea from "./AutoGrowTextarea";
import EnglishDialog from "./EnglishDialog";
import EnglishExamPicker from "./EnglishExamPicker";
import {
  MATERIAL_ACCEPT,
  MATERIAL_BAD_TYPE,
  MATERIAL_FILE_PATTERN,
  MATERIAL_TOO_LARGE,
  SOURCE_LABEL,
  STATUS_TONE,
  formatBytes,
  formatChars,
  formatDay,
  formatExamDate,
  jsonInit,
  messageOf,
  requestEnglish,
  type Load,
} from "./englishClient";
import type { EnglishView } from "./views";
import s from "./EnglishStudio.module.css";

const HEADER = {
  title: "학교별 내신 대비",
  description: "학교의 출제 흐름에 맞춰, 이번 시험을 준비하세요.",
};
/** 계약이 내보내지 않는 상한 — `englishMaterialTextCreateSchema.name.max(255)` 와 같은 값 */
const MATERIAL_NAME_MAX = 255;

export default function EnglishPrepView({
  exam,
  exams,
  onSelectExam,
  onNewExam,
  materials,
  onRetryMaterials,
  sets,
  onRetrySets,
  onMaterialAdded,
  onMaterialRemoved,
  onExamChange,
  onExamDeleted,
  onOpenSet,
  onNavigate,
  canMake = true,
  canLibrary = true,
}: {
  exam: EnglishExam;
  exams: EnglishExam[];
  onSelectExam: (id: string) => void;
  onNewExam: () => void;
  materials: Load<EnglishMaterial[]>;
  onRetryMaterials: () => void;
  sets: Load<EnglishSetSummary[]>;
  onRetrySets: () => void;
  onMaterialAdded: (material: EnglishMaterial) => void;
  onMaterialRemoved: (id: string) => void;
  onExamChange: (exam: EnglishExam) => void;
  onExamDeleted: (id: string) => void;
  onOpenSet: (id: string) => void;
  onNavigate: (view: EnglishView) => void;
  canMake?: boolean;
  canLibrary?: boolean;
}) {
  const [materialDialog, setMaterialDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [deleting, setDeleting] = useState<EnglishMaterial | null>(null);
  const [examDeleting, setExamDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const deleteExamRef = useRef<HTMLButtonElement>(null);
  const rowDeleteRef = useRef<HTMLButtonElement>(null);

  const materialList = materials.status === "ready" ? materials.data : null;
  const setList = sets.status === "ready" ? sets.data : null;
  const materialCount = materialList?.length ?? exam.materialCount;
  const setCount = setList?.length ?? exam.setCount;
  const reviewedCount =
    setList?.filter((item) => item.status === "검토 완료").length ??
    exam.reviewedCount;

  const steps = [
    {
      label: "자료 등록",
      meta: `${materialCount}개 자료`,
      done: materialCount > 0,
      onClick: () => setMaterialDialog(true),
      enabled: true,
    },
    {
      label: "문제 제작",
      meta: `${setCount}개 세트`,
      done: setCount > 0,
      onClick: () => onNavigate("english-maker"),
      enabled: canMake,
    },
    {
      label: "검토 및 인쇄",
      meta: `${reviewedCount}개 검토 완료`,
      done: reviewedCount > 0,
      onClick: () => onNavigate("english-library"),
      enabled: canLibrary,
    },
  ];

  const removeMaterial = async () => {
    if (!deleting) return;
    setBusy(true);
    setDialogError(null);
    try {
      await requestEnglish(`/api/english/materials/${deleting.id}`, {
        method: "DELETE",
      });
      onMaterialRemoved(deleting.id);
      setDeleting(null);
    } catch (error) {
      setDialogError(messageOf(error));
    } finally {
      setBusy(false);
    }
  };
  const removeExam = async () => {
    setBusy(true);
    setDialogError(null);
    try {
      await requestEnglish(`/api/english/exams/${exam.id}`, {
        method: "DELETE",
      });
      setExamDeleting(false);
      onExamDeleted(exam.id);
    } catch (error) {
      setDialogError(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <WorkspacePageHeader
        title={HEADER.title}
        description={HEADER.description}
      >
        <button type="button" className={w.primaryButton} onClick={onNewExam}>
          <Icon name="plus" size={18} />새 시험 등록
        </button>
      </WorkspacePageHeader>
      <EnglishExamPicker exams={exams} exam={exam} onSelect={onSelectExam} />

      <section className={`${s.card} ${s.steps}`}>
        <div>
          <span className={s.kick}>이번 시험 준비</span>
          <h2 className={s.stepsTitle}>{formatExamDate(exam.examDate)}</h2>
        </div>
        <ul className={s.stepList} aria-label="이번 시험 준비">
          {steps.map((step, index) => (
            <li key={step.label}>
              <button
                type="button"
                className={s.step}
                data-done={step.done}
                onClick={step.onClick}
                disabled={!step.enabled}
              >
                <span className={s.dot} aria-hidden="true">
                  {step.done ? "✓" : index + 1}
                </span>
                <b>{step.label}</b>
                <small>{step.meta}</small>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className={s.grid}>
        <div className={s.column}>
          <section className={s.card} aria-label="시험 자료">
            <div className={s.sectionHead}>
              <h2 className={s.sectionTitle}>
                시험 자료 <span className={s.num}>{materialCount}</span>
              </h2>
              <button
                ref={addRef}
                type="button"
                className={s.quiet}
                onClick={() => setMaterialDialog(true)}
              >
                <Icon name="plus" size={15} />
                자료 추가
              </button>
            </div>
            <p className={s.desc}>기출, 시험 범위, 수업 지문을 모아 둡니다.</p>
            {materials.status === "loading" ? (
              <WorkProgress label="자료를 불러오는 중입니다…" />
            ) : materials.status === "error" ? (
              <div role="alert" className={s.loadError}>
                <span>{materials.message}</span>
                <button
                  type="button"
                  className={w.outlineButton}
                  onClick={onRetryMaterials}
                >
                  다시 시도
                </button>
              </div>
            ) : materials.data.length ? (
              <ul className={s.rows}>
                {materials.data.map((material) => (
                  <li key={material.id} className={s.row}>
                    <span className={s.fileIcon}>
                      <Icon name="paper" size={20} />
                    </span>
                    <div className={s.rowBody}>
                      <span className={s.rowTitle}>
                        {material.hasFile ? (
                          <a
                            href={`/api/english/materials/${material.id}`}
                            download
                          >
                            {material.name}
                          </a>
                        ) : (
                          material.name
                        )}
                      </span>
                      <span className={s.rowMeta}>
                        {material.hasFile
                          ? formatBytes(material.size)
                          : formatChars(
                              material.content?.length ?? material.size,
                            )}{" "}
                        · {formatDay(material.createdAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={s.rowDelete}
                      aria-label={`${material.name} 삭제`}
                      onClick={(event) => {
                        rowDeleteRef.current = event.currentTarget;
                        setDialogError(null);
                        setDeleting(material);
                      }}
                    >
                      <Icon name="close" size={17} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.footnote}>아직 등록한 자료가 없습니다.</p>
            )}
          </section>

          <section className={s.card} aria-label="출제 설정">
            <div className={s.sectionHead}>
              <h2 className={s.sectionTitle}>출제 설정</h2>
              <button
                ref={settingsRef}
                type="button"
                className={s.quiet}
                onClick={() => setSettingsDialog(true)}
              >
                설정 수정
              </button>
            </div>
            <p className={s.desc}>이번 시험에서 중점적으로 다룰 유형</p>
            {exam.types.length ? (
              <ul className={s.tags}>
                {exam.types.map((type) => (
                  <li key={type} className={s.tag}>
                    {type}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.footnote}>
                아직 정하지 않았습니다. «설정 수정»에서 고릅니다.
              </p>
            )}
            <p className={s.gradeLine}>
              대상 학년 <b>{exam.grade}</b>
              <button
                ref={deleteExamRef}
                type="button"
                className={s.dangerButton}
                onClick={() => {
                  setDialogError(null);
                  setExamDeleting(true);
                }}
              >
                시험 삭제
              </button>
            </p>
          </section>
        </div>

        <section className={s.card} aria-label="대비 문제 세트">
          <div className={s.sectionHead}>
            <h2 className={s.sectionTitle}>
              대비 문제 세트 <span className={s.num}>{setCount}</span>
            </h2>
            {canLibrary && (
              <button
                type="button"
                className={s.quiet}
                onClick={() => onNavigate("english-library")}
              >
                전체 보기
                <Icon name="chevron" size={14} />
              </button>
            )}
          </div>
          <p className={s.desc}>
            초안을 만들고, 검토를 마친 문제를 수업에 씁니다.
          </p>
          {sets.status === "loading" ? (
            <WorkProgress label="문제 세트를 불러오는 중입니다…" />
          ) : sets.status === "error" ? (
            <div role="alert" className={s.loadError}>
              <span>{sets.message}</span>
              <button
                type="button"
                className={w.outlineButton}
                onClick={onRetrySets}
              >
                다시 시도
              </button>
            </div>
          ) : sets.data.length ? (
            sets.data.slice(0, 4).map((set) => (
              <article key={set.id} className={s.setCard}>
                <span className={s.setIcon}>
                  <Icon name="paper" size={22} />
                </span>
                <div className={s.setBody}>
                  <span className={s.pill} data-tone={STATUS_TONE[set.status]}>
                    {set.status}
                  </span>
                  <h3 className={s.setTitle}>{set.title}</h3>
                  <p className={s.setMeta}>
                    {[
                      SOURCE_LABEL[set.source],
                      set.status === "검토 완료" ? null : "강사 검토 필요",
                      ...set.types.slice(0, 3),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className={s.count}>
                  <b>{set.questionCount}</b>문항
                </span>
                {canLibrary && (
                  <button
                    type="button"
                    className={w.outlineButton}
                    aria-label={`${set.title} 열기`}
                    onClick={() => onOpenSet(set.id)}
                  >
                    열기
                  </button>
                )}
              </article>
            ))
          ) : (
            <p className={s.footnote}>아직 만든 문제 세트가 없습니다.</p>
          )}
          {canMake && (
            <button
              type="button"
              className={`${w.primaryButton} ${s.wide}`}
              onClick={() => onNavigate("english-maker")}
            >
              학교 맞춤 문제 만들기
              <Icon name="arrow" size={18} />
            </button>
          )}
          <p className={s.under}>모든 문제는 강사 검토 뒤에 씁니다.</p>
        </section>
      </div>

      {materialDialog && (
        <MaterialDialog
          exam={exam}
          returnFocus={addRef}
          onClose={() => setMaterialDialog(false)}
          onAdded={(material) => {
            setMaterialDialog(false);
            onMaterialAdded(material);
          }}
        />
      )}
      {settingsDialog && (
        <SettingsDialog
          exam={exam}
          returnFocus={settingsRef}
          onClose={() => setSettingsDialog(false)}
          onSaved={(next) => {
            setSettingsDialog(false);
            onExamChange(next);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="자료를 삭제할까요?"
          description={`«${deleting.name}» 자료를 지웁니다. 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          busy={busy}
          error={dialogError}
          returnFocus={rowDeleteRef}
          onConfirm={() => void removeMaterial()}
          onCancel={() => setDeleting(null)}
        />
      )}
      {examDeleting && (
        <ConfirmDialog
          title="시험을 삭제할까요?"
          description={`${exam.school} ${exam.grade} «${exam.title}» 시험과 딸린 자료 ${exam.materialCount}개 · 문제 세트 ${exam.setCount}개가 함께 지워집니다. 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          busy={busy}
          error={dialogError}
          returnFocus={deleteExamRef}
          onConfirm={() => void removeExam()}
          onCancel={() => setExamDeleting(false)}
        />
      )}
    </>
  );
}

/** «자료 추가» 창 — 파일 업로드(multipart · 상한은 계약 `ENGLISH_MATERIAL_MAX_BYTES` 4MB · pdf docx txt png jpg) / 지문 직접 입력(이름 + 글) */
function MaterialDialog({
  exam,
  returnFocus,
  onClose,
  onAdded,
}: {
  exam: EnglishExam;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
  onAdded: (material: EnglishMaterial) => void;
}) {
  const [tab, setTab] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (init: RequestInit) => {
    setBusy(true);
    setError(null);
    try {
      const body = englishMaterialResponseSchema.parse(
        await requestEnglish(`/api/english/exams/${exam.id}/materials`, init),
      );
      onAdded(body.data);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  };
  const upload = () => {
    if (!file) return setError("파일을 골라 주세요.");
    // 받는 쪽보다 먼저 자른다 — 상한(4MB, Vercel 본문 상한)을 넘는 파일은 보내지 않는다(25 §3 · 교훈 2026-09-21).
    if (file.size > ENGLISH_MATERIAL_MAX_BYTES)
      return setError(MATERIAL_TOO_LARGE);
    if (!MATERIAL_FILE_PATTERN.test(file.name))
      return setError(MATERIAL_BAD_TYPE);
    const form = new FormData();
    form.append("file", file);
    void send({ method: "POST", body: form });
  };
  const addText = () => {
    if (!name.trim()) return setError("자료 이름을 입력해 주세요.");
    if (!content.trim()) return setError("지문을 입력해 주세요.");
    void send(jsonInit("POST", { name: name.trim(), content: content.trim() }));
  };

  return (
    <EnglishDialog
      title="자료 추가"
      kicker={`${exam.school} · ${exam.grade} ${exam.title}`}
      busy={busy}
      returnFocus={returnFocus}
      onClose={onClose}
    >
      <div
        className={s.tabs}
        role="tablist"
        aria-label="자료 종류"
        onKeyDown={(event) => {
          if (
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
          )
            return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? "file"
              : event.key === "End"
                ? "text"
                : tab === "file"
                  ? "text"
                  : "file";
          setTab(next);
          setError(null);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`#english-material-tab-${next}`)
            ?.focus();
        }}
      >
        <button
          type="button"
          role="tab"
          id="english-material-tab-file"
          aria-selected={tab === "file"}
          tabIndex={tab === "file" ? 0 : -1}
          aria-controls="english-material-panel"
          className={s.tab}
          onClick={() => {
            setTab("file");
            setError(null);
          }}
        >
          파일 업로드
        </button>
        <button
          type="button"
          role="tab"
          id="english-material-tab-text"
          aria-selected={tab === "text"}
          tabIndex={tab === "text" ? 0 : -1}
          aria-controls="english-material-panel"
          className={s.tab}
          onClick={() => {
            setTab("text");
            setError(null);
          }}
        >
          지문 직접 입력
        </button>
      </div>
      <form
        id="english-material-panel"
        role="tabpanel"
        aria-labelledby={`english-material-tab-${tab}`}
        onSubmit={(event) => {
          event.preventDefault();
          if (tab === "file") upload();
          else addText();
        }}
      >
        {tab === "file" ? (
          <label className={s.field}>
            파일{" "}
            <small>
              {ENGLISH_MATERIAL_MAX_LABEL} 이하 · pdf docx txt png jpg
            </small>
            <input
              type="file"
              aria-label="파일"
              accept={MATERIAL_ACCEPT}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
            />
          </label>
        ) : (
          <>
            <label className={s.field}>
              자료 이름
              <input
                value={name}
                maxLength={MATERIAL_NAME_MAX}
                onChange={(event) => setName(event.target.value)}
                placeholder="3과 외부지문"
              />
            </label>
            <label className={s.field}>
              지문{" "}
              <small>
                {ENGLISH_MATERIAL_CONTENT_MAX.toLocaleString("ko-KR")}자 이하
              </small>
              <AutoGrowTextarea
                aria-label="지문"
                value={content}
                maxLength={ENGLISH_MATERIAL_CONTENT_MAX}
                onChange={(event) => setContent(event.target.value)}
              />
            </label>
          </>
        )}
        <p className={s.footnote}>
          PDF·이미지는 보관용입니다. 문제 제작에는 지문 텍스트를 입력해 주세요.
        </p>
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
            {tab === "file" ? "올리기" : "추가"}
          </button>
        </div>
      </form>
    </EnglishDialog>
  );
}

/** «출제 설정» 창 — 생성 유형(«원문 복원» 제외) 체크 → PATCH types */
function SettingsDialog({
  exam,
  returnFocus,
  onClose,
  onSaved,
}: {
  exam: EnglishExam;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSaved: (exam: EnglishExam) => void;
}) {
  const [types, setTypes] = useState<EnglishQuestionType[]>(exam.types);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (type: EnglishQuestionType) =>
    setTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : ENGLISH_GENERATED_TYPES.filter(
            (item) => current.includes(item) || item === type,
          ),
    );
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = englishExamResponseSchema.parse(
        await requestEnglish(
          `/api/english/exams/${exam.id}`,
          jsonInit("PATCH", { types }),
        ),
      );
      onSaved(body.data);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  };
  return (
    <EnglishDialog
      title="출제 설정"
      kicker="이번 시험에서 중점적으로 다룰 유형"
      busy={busy}
      returnFocus={returnFocus}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className={s.checks}>
          {ENGLISH_GENERATED_TYPES.map((type) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={types.includes(type)}
                onChange={() => toggle(type)}
              />
              {type}
            </label>
          ))}
        </div>
        <p className={s.footnote}>
          «원문 복원»은 규칙으로 만드는 유형이라 설정과 무관하게 언제나 만들 수
          있습니다.
        </p>
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
            저장
          </button>
        </div>
      </form>
    </EnglishDialog>
  );
}
