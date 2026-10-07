"use client";

/**
 * 오늘의 작업 — WorkroomHome의 주 작업 열 + 보조 열 구성.
 * 자료와 최근 세트를 작업 열에, 실제 준비 수와 출제 설정을 보조 열에 둔다.
 * 개수는 읽어 둔 목록이 있으면 그 길이로, 없으면 시험 요약으로 센다.
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
import EnglishPhotoReadDialog, {
  createEnglishReadCache,
} from "./EnglishPhotoReadDialog";
import {
  MATERIAL_ACCEPT,
  MATERIAL_BAD_TYPE,
  MATERIAL_FILE_PATTERN,
  MATERIAL_TOO_LARGE,
  PHOTO_ACCEPT,
  PHOTO_BAD_TYPE,
  PHOTO_FILE_PATTERN,
  SOURCE_LABEL,
  STATUS_TONE,
  formatBytes,
  formatChars,
  formatDay,
  formatExamDate,
  isEnglishPhoto,
  jsonInit,
  messageOf,
  requestEnglish,
  type Load,
} from "./englishClient";
import type { EnglishView } from "./views";
import s from "./EnglishStudio.module.css";
import p from "./EnglishPrep.module.css";

const HEADER = {
  title: "오늘의 작업",
  description: "시험 범위와 자료를 정리하고, 필요한 문제를 준비하세요.",
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
  /**
   * «사진에서 글 읽기» 창이 처음 열 사진 — 닫혀 있으면 null (D-158). `only` 는 «올리고 읽기»로 연 창이다:
   * 방금 올린 그 사진 한 장만 본다(«저장하고 다음 사진»이 예전 사진을 읽으러 가지 않게 — 읽기는 값이 든다).
   */
  const [reading, setReading] = useState<{ id: string; only: boolean } | null>(
    null,
  );
  const readRef = useRef<HTMLElement | null>(null);
  /** 읽어 둔 글 · 읽는 중인 요청(자료 id 로) — 창을 닫았다 열어도 같은 사진을 다시 읽지 않는다 */
  const [readCache] = useState(createEnglishReadCache);
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
      onClick: () => setMaterialDialog(true),
      returnFocus: addRef,
      enabled: true,
    },
    {
      label: "문제 제작",
      meta: `${setCount}개 세트`,
      onClick: () => onNavigate("english-maker"),
      enabled: canMake,
    },
    {
      label: "검토 및 인쇄",
      meta: `${reviewedCount}개 검토 완료`,
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
        <button type="button" className={w.outlineButton} onClick={onNewExam}>
          <Icon name="plus" size={18} />새 시험 등록
        </button>
      </WorkspacePageHeader>
      <div className={p.dashboard}>
        <div className={p.primaryColumn}>
          <EnglishExamPicker
            exams={exams}
            exam={exam}
            onSelect={onSelectExam}
          />
          <section className={p.panel} aria-label="시험 자료">
            <div className={p.sectionHead}>
              <h2 className={p.sectionTitle}>
                시험 자료 <span className={p.num}>{materialCount}</span>
              </h2>
              <button
                ref={addRef}
                type="button"
                className={w.outlineButton}
                onClick={(event) => {
                  addRef.current = event.currentTarget;
                  setMaterialDialog(true);
                }}
              >
                <Icon name="plus" size={15} />
                자료 추가
              </button>
            </div>
            <p className={p.desc}>기출, 시험 범위, 수업 지문을 모아 둡니다.</p>
            {materials.status === "loading" ? (
              <WorkProgress label="자료를 불러오는 중입니다…" />
            ) : materials.status === "error" ? (
              <div role="alert" className={p.loadError}>
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
              <ul className={p.materials}>
                {materials.data.map((material) => (
                  <li key={material.id} className={p.material}>
                    <span className={p.fileIcon} aria-hidden="true">
                      <Icon name="paper" size={20} />
                    </span>
                    <div className={p.rowBody}>
                      <span className={p.rowTitle}>
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
                      <span className={p.rowMeta}>
                        {material.hasFile
                          ? formatBytes(material.size)
                          : formatChars(
                              material.content?.length ?? material.size,
                            )}{" "}
                        · {formatDay(material.createdAt)}
                      </span>
                    </div>
                    <div className={p.rowActions}>
                      {isEnglishPhoto(material) && (
                        <button
                          type="button"
                          className={p.quiet}
                          aria-label={`${material.name} 글 읽기`}
                          onClick={(event) => {
                            readRef.current = event.currentTarget;
                            setReading({ id: material.id, only: false });
                          }}
                        >
                          글 읽기
                        </button>
                      )}
                      <button
                        type="button"
                        className={p.rowDelete}
                        aria-label={`${material.name} 삭제`}
                        onClick={(event) => {
                          rowDeleteRef.current = event.currentTarget;
                          setDialogError(null);
                          setDeleting(material);
                        }}
                      >
                        <Icon name="close" size={17} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={p.empty}>
                <p>아직 등록한 자료가 없습니다.</p>
                <span>자료 추가에서 파일을 올리거나 지문을 입력하세요.</span>
              </div>
            )}
          </section>

          <section className={p.panel} aria-label="대비 문제 세트">
            <div className={p.sectionHead}>
              <h2 className={p.sectionTitle}>
                대비 문제 세트 <span className={p.num}>{setCount}</span>
              </h2>
              {canMake && (
                <button
                  type="button"
                  className={w.primaryButton}
                  onClick={() => onNavigate("english-maker")}
                >
                  학교 맞춤 문제 만들기
                  <Icon name="arrow" size={18} />
                </button>
              )}
            </div>
            <p className={p.desc}>
              최근 만든 세트를 열어 검토하고 수업을 준비하세요.
            </p>
            {sets.status === "loading" ? (
              <WorkProgress label="문제 세트를 불러오는 중입니다…" />
            ) : sets.status === "error" ? (
              <div role="alert" className={p.loadError}>
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
              <div className={p.sets}>
                {sets.data.slice(0, 4).map((set) => (
                  <article key={set.id} className={p.setRow}>
                    <div className={p.rowBody}>
                      <span
                        className={s.pill}
                        data-tone={STATUS_TONE[set.status]}
                      >
                        {set.status}
                      </span>
                      <h3 className={p.setTitle}>{set.title}</h3>
                      <p className={p.rowMeta}>
                        {[
                          SOURCE_LABEL[set.source],
                          set.status === "검토 완료" ? null : "강사 검토 필요",
                          ...set.types.slice(0, 3),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className={p.setActions}>
                      <span className={p.count}>
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
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={p.empty}>
                <p>아직 만든 문제 세트가 없습니다.</p>
                {canMake && (
                  <span>학교 맞춤 문제 만들기에서 첫 초안을 준비하세요.</span>
                )}
              </div>
            )}
            <div className={p.sectionFoot}>
              <p>모든 문제는 강사 검토 뒤에 씁니다.</p>
              {canLibrary && (
                <button
                  type="button"
                  className={p.quiet}
                  onClick={() => onNavigate("english-library")}
                >
                  전체 보기
                  <Icon name="chevron" size={14} />
                </button>
              )}
            </div>
          </section>
        </div>

        <div className={p.secondaryColumn}>
          <section className={p.panel} aria-label="이번 시험 준비 현황">
            <h2 className={p.sectionTitle}>이번 시험 준비</h2>
            <p className={p.desc}>{formatExamDate(exam.examDate)}</p>
            <ul className={p.summary} aria-label="이번 시험 준비">
              {steps.map((step) => (
                <li key={step.label}>
                  <button
                    type="button"
                    className={p.summaryLink}
                    onClick={(event) => {
                      if (step.returnFocus)
                        step.returnFocus.current = event.currentTarget;
                      step.onClick();
                    }}
                    disabled={!step.enabled}
                  >
                    <span>{step.label}</span>
                    <small>{step.meta}</small>
                    <Icon name="chevron" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={p.panel} aria-label="출제 설정">
            <div className={p.sectionHead}>
              <h2 className={p.sectionTitle}>출제 설정</h2>
              <button
                ref={settingsRef}
                type="button"
                className={p.quiet}
                onClick={() => setSettingsDialog(true)}
              >
                설정 수정
              </button>
            </div>
            <p className={p.desc}>이번 시험에서 중점적으로 다룰 유형</p>
            {exam.types.length ? (
              <ul className={p.tags}>
                {exam.types.map((type) => (
                  <li key={type}>{type}</li>
                ))}
              </ul>
            ) : (
              <p className={p.settingsEmpty}>
                아직 정하지 않았습니다. «설정 수정»에서 고릅니다.
              </p>
            )}
            <div className={p.settingsFoot}>
              <span>
                대상 학년 <b>{exam.grade}</b>
              </span>
              <button
                ref={deleteExamRef}
                type="button"
                className={p.dangerButton}
                onClick={() => {
                  setDialogError(null);
                  setExamDeleting(true);
                }}
              >
                시험 삭제
              </button>
            </div>
          </section>
        </div>
      </div>

      {materialDialog && (
        <MaterialDialog
          exam={exam}
          returnFocus={addRef}
          onClose={() => setMaterialDialog(false)}
          onAdded={(material, read) => {
            setMaterialDialog(false);
            onMaterialAdded(material);
            // «사진에서 읽기» 탭 — 올린 사진을 바로 읽기 창으로(창이 아래로 길어지지 않게 · Wire 2차)
            if (read) {
              readRef.current = addRef.current;
              setReading({ id: material.id, only: true });
            }
          }}
        />
      )}
      {reading && materialList && (
        <EnglishPhotoReadDialog
          exam={exam}
          photos={materialList.filter(
            (item) =>
              isEnglishPhoto(item) && (!reading.only || item.id === reading.id),
          )}
          startId={reading.id}
          cache={readCache}
          returnFocus={readRef}
          onClose={() => setReading(null)}
          onSaved={onMaterialAdded}
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

/**
 * «자료 추가» 창 — 파일 업로드(multipart · 상한은 계약 `ENGLISH_MATERIAL_MAX_BYTES` 4MB · pdf docx txt png jpg) / 지문 직접 입력(이름 + 글)
 * / 사진에서 읽기(D-158 — 사진을 올리고 닫으면 부모가 «사진에서 글 읽기» 창을 연다. 사진은 자료로 보관된다).
 */
const MATERIAL_TABS = ["file", "text", "photo"] as const;
type MaterialTab = (typeof MATERIAL_TABS)[number];
const MATERIAL_TAB_LABEL: Record<MaterialTab, string> = {
  file: "파일 업로드",
  text: "지문 직접 입력",
  photo: "사진에서 읽기",
};
function MaterialDialog({
  exam,
  returnFocus,
  onClose,
  onAdded,
}: {
  exam: EnglishExam;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** `read` — 올린 사진을 바로 읽기 창으로 넘긴다 */
  onAdded: (material: EnglishMaterial, read?: boolean) => void;
}) {
  const [tab, setTab] = useState<MaterialTab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (init: RequestInit, read = false) => {
    setBusy(true);
    setError(null);
    try {
      const body = englishMaterialResponseSchema.parse(
        await requestEnglish(`/api/english/exams/${exam.id}/materials`, init),
      );
      onAdded(body.data, read);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  };
  const upload = (photo = false) => {
    if (!file)
      return setError(photo ? "사진을 골라 주세요." : "파일을 골라 주세요.");
    // 받는 쪽보다 먼저 자른다 — 상한(4MB, Vercel 본문 상한)을 넘는 파일은 보내지 않는다(25 §3 · 교훈 2026-09-21).
    if (file.size > ENGLISH_MATERIAL_MAX_BYTES)
      return setError(MATERIAL_TOO_LARGE);
    if (
      photo
        ? !PHOTO_FILE_PATTERN.test(file.name)
        : !MATERIAL_FILE_PATTERN.test(file.name)
    )
      return setError(photo ? PHOTO_BAD_TYPE : MATERIAL_BAD_TYPE);
    const form = new FormData();
    form.append("file", file);
    void send({ method: "POST", body: form }, photo);
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
          const at = MATERIAL_TABS.indexOf(tab);
          const step = event.key === "ArrowLeft" ? MATERIAL_TABS.length - 1 : 1;
          const next: MaterialTab =
            event.key === "Home"
              ? "file"
              : event.key === "End"
                ? "photo"
                : MATERIAL_TABS[(at + step) % MATERIAL_TABS.length]!;
          // 같은 탭이면 그대로 둔다 — 고른 파일을 지우지 않는다
          if (next === tab) return;
          setTab(next);
          setFile(null);
          setError(null);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`#english-material-tab-${next}`)
            ?.focus();
        }}
      >
        {MATERIAL_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`english-material-tab-${id}`}
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            aria-controls="english-material-panel"
            className={s.tab}
            onClick={() => {
              // 같은 탭을 다시 누르면 그대로 둔다 — 칸에는 파일이 보이는데 «파일을 골라 주세요»가 뜨지 않게
              if (id === tab) return;
              setTab(id);
              // 파일 칸은 탭마다 받는 종류가 다르다 — 고른 파일을 들고 넘어가지 않는다
              setFile(null);
              setError(null);
            }}
          >
            {MATERIAL_TAB_LABEL[id]}
          </button>
        ))}
      </div>
      <form
        id="english-material-panel"
        role="tabpanel"
        aria-labelledby={`english-material-tab-${tab}`}
        onSubmit={(event) => {
          event.preventDefault();
          if (tab === "file") upload();
          else if (tab === "photo") upload(true);
          else addText();
        }}
      >
        {tab === "photo" ? (
          <label className={s.field}>
            사진 <small>{ENGLISH_MATERIAL_MAX_LABEL} 이하 · png jpg</small>
            <input
              key="photo"
              type="file"
              aria-label="사진"
              accept={PHOTO_ACCEPT}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
            />
          </label>
        ) : tab === "file" ? (
          <label className={s.field}>
            파일{" "}
            <small>
              {ENGLISH_MATERIAL_MAX_LABEL} 이하 · pdf docx txt png jpg
            </small>
            <input
              key="file"
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
          {tab === "photo"
            ? "사진은 자료로 보관되고, 글을 읽을 때 AI 서버로 보냅니다. 손글씨는 읽지 않습니다."
            : "사진은 «사진에서 읽기»로 지문을 만들 수 있습니다. PDF 는 보관용입니다."}
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
            {tab === "photo"
              ? "올리고 읽기"
              : tab === "file"
                ? "올리기"
                : "추가"}
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
