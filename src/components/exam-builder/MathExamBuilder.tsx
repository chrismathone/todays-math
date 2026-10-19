"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import dynamic from "next/dynamic";
import type WorksheetEditorComponent from "@/components/unified/WorksheetEditor";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import type { BankData, StudioProblem } from "@/components/unified/types";
import { possibleFormats } from "@/lib/problem/questionSelectionClient";
import WorkProgress from "@/components/unified/WorkProgress";
import { BankSourceField } from "@/components/unified/BankSourcePicker";
import type { SourcePick } from "@/components/unified/bankSourcePick";
import type { UnifiedBankPickerBook } from "@/contracts/unifiedBankBootstrap.contract";
import {
  bankTextbookSlotsResponseSchema,
  type BankTextbookSlotReadiness,
} from "@/contracts/bankReadiness.contract";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";
import { sourceReferenceLabel } from "@/lib/problem/sourceReferenceLabel";
import { useUsageLabels } from "@/components/usage-labels/useUsageLabels";
import UsageLabel from "@/components/usage-labels/UsageLabel";
import s from "./MathExamBuilder.module.css";
import ExamBuilder from "./ExamBuilder";
import type {
  ExamBuilderStep,
  ExamNamedConditions,
  ExamSavedSelection,
} from "./types";
import { createExamConditionsClient } from "./examConditionsClient";
import SavedLayouts from "@/components/unified/print/SavedLayouts";
import TitleSuggestions from "@/components/unified/print/TitleSuggestions";
import SheetTagPicker from "@/components/unified/print/SheetTagPicker";
import type { SheetTag } from "@/contracts/sheetTag.contract";
import { titleSuggestions } from "@/components/unified/print/suggestTitles";
import type { PrintPresetsClient } from "@/components/unified/print/printPresetsClient";
import type { PrintPreset } from "@/contracts/printPreset.contract";
import DemandMaterialPicker from "./DemandMaterialPicker";
import SourcePicker, { sourcePickerLabel } from "./SourcePicker";
import ExamAnswerPanel from "./ExamAnswerPanel";
import {
  createMathExamBuilderSource,
  MATH_EXAM_DIFFICULTIES,
  MATH_EXAM_MAX_QUESTIONS,
  type MathAvailabilityCache,
} from "./mathSource";

const loadWorksheetEditor = () =>
  import("@/components/unified/WorksheetEditor");
const WorksheetEditor = dynamic(loadWorksheetEditor, {
  loading: () => <WorkProgress label="시험지 양식을 준비하는 중입니다…" />,
});
export default function MathExamBuilder({
  initialData,
  initialGroup,
  editor,
  onQuestionsChange,
  canOutput,
  initialStep,
  preserveStoredOutput = false,
  onBeginEdit,
  onStepChange,
  onIntentIssueChange,
  printPresets,
  sheetTag,
}: {
  /** 3단계 «시험 종류» 태그(W8) — 이 시험지 초안의 태그. 지면에 찍지 않는다. */
  sheetTag?: {
    value: SheetTag | null;
    onChange: (tag: SheetTag | null) => void;
  };
  /** 3단계 «내 양식»(W6) — 출력 메뉴가 있는 계정만. 없으면 그 줄을 그리지 않는다. */
  printPresets?: {
    client: PrintPresetsClient;
    onDefaultChange: (preset: PrintPreset | null) => void;
  };
  initialData: BankData;
  initialGroup?: string;
  editor: ComponentProps<typeof WorksheetEditorComponent>;
  onQuestionsChange: (items: StudioProblem[]) => void;
  canOutput: boolean;
  initialStep?: ExamBuilderStep;
  preserveStoredOutput?: boolean;
  onBeginEdit?: () => Promise<boolean>;
  onStepChange?: (step: ExamBuilderStep) => void;
  onIntentIssueChange?: (issue: string | null) => void;
}) {
  const [pick, setPick] = useState<SourcePick>({
    group: "",
    books: [],
    kinds: [],
  });
  const [sourceOpen, setSourceOpen] = useState(false);
  // D-111 — 기본 켜짐, 원장님이 끌 수 있다(2026-10-16). 일일테스트 경로는 늘 켜짐이다.
  const [distinctFamilies, setDistinctFamilies] = useState(true);
  const [availabilityCache] = useState<MathAvailabilityCache>(() => new Map());
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const usage = useUsageLabels({
    identity: "question",
    problemIds: [...editor.selected.map((item) => item.id), ...candidateIds],
  });
  const [materialOpen, setMaterialOpen] = useState(false);
  const materialKey =
    pick.group === "school_textbook" ? pick.books.join(",") : "";
  const [sourceBooks, setSourceBooks] = useState<UnifiedBankPickerBook[]>([]);
  const rememberBooks = useCallback((books: UnifiedBankPickerBook[]) => {
    setSourceBooks((current) => [
      ...new Map(
        [...current, ...books].map((book) => [book.id, book]),
      ).values(),
    ]);
  }, []);
  const [slotResult, setSlotResult] = useState<{
    ids: string;
    items: Record<string, BankTextbookSlotReadiness>;
    failed?: boolean;
  }>();
  const opener = useRef<HTMLButtonElement>(null);
  const filters = useMemo(() => {
    const params = new URLSearchParams();
    if (pick.group) params.set("sourceGroup", pick.group);
    if (pick.group === "school_textbook") {
      if (pick.books.length) params.set("books", pick.books.join(","));
      if (pick.kinds.length) params.set("materialKinds", pick.kinds.join(","));
      if (materialIds.length) params.set("materials", materialIds.join(","));
    }
    return params.toString();
  }, [pick, materialIds]);
  const textbookIds = editor.selected
    .filter((item) => item.source === "school_textbook")
    .map((item) => item.id)
    .sort()
    .join(",");
  useEffect(() => {
    if (!textbookIds) return;
    const controller = new AbortController();
    void fetch(`${getStudioEndpoints().problems}/textbook-slots`, {
      method: "POST",
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceIds: textbookIds.split(",") }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("변형 준비 상태 확인 실패");
        return bankTextbookSlotsResponseSchema.parse(await response.json());
      })
      .then((value) => {
        if (!controller.signal.aborted)
          setSlotResult({
            ids: textbookIds,
            items: Object.fromEntries(
              value.items.map((item) => [item.sourceId, item]),
            ),
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setSlotResult({ ids: textbookIds, items: {}, failed: true });
      });
    return () => controller.abort();
  }, [textbookIds]);
  const slots = slotResult?.ids === textbookIds ? slotResult.items : {};
  const overlap = Object.values(slots).some((item) =>
    item.slots.some((slot) =>
      editor.selected.some((question) => question.id === slot.problemId),
    ),
  );
  const source = useMemo(() => {
    const base = createMathExamBuilderSource({
      deferScopes: true,
      initialUnits: initialData.units,
      initialUnitCounts: initialData.unitCounts,
      initialCountUnit: initialData.countUnit,
      filters,
      refreshAvailability: true,
      distinctFamilies,
      availabilityCache,
    });
    return {
      ...base,
      list: async (...args: Parameters<typeof base.list>) => {
        const result = await base.list(...args);
        if (!args[1].aborted)
          setCandidateIds(result.items.map((item) => item.id));
        return result;
      },
    };
  }, [
    initialData.units,
    initialData.unitCounts,
    initialData.countUnit,
    filters,
    distinctFamilies,
    availabilityCache,
  ]);
  // W5 «이름 붙인 출제 조건» — 출처 고르기 · 자료 · 같은 문항류 규칙을 조건에 함께 담고, 적용하면 되돌린다.
  const conditionsClient = useMemo(() => createExamConditionsClient(), []);
  const sourceLabel = sourcePickerLabel(sourceBooks, pick);
  const namedConditions = useMemo<ExamNamedConditions>(
    () => ({
      selection: {
        source: {
          group: pick.group,
          books: pick.books,
          kinds: pick.kinds,
          materials: pick.group === "school_textbook" ? materialIds : [],
          label: materialIds.length
            ? `${sourceLabel} · 자료 ${materialIds.length}개`
            : sourceLabel,
        },
        familyRule: distinctFamilies,
      },
      restore: ({ source: saved, familyRule }: ExamSavedSelection) => {
        setPick({ group: saved.group, books: saved.books, kinds: saved.kinds });
        setMaterialIds(
          saved.group === "school_textbook" ? saved.materials : [],
        );
        setMaterialOpen(false);
        setDistinctFamilies(familyRule);
      },
      client: conditionsClient,
    }),
    [pick, materialIds, sourceLabel, distinctFamilies, conditionsClient],
  );
  return (
    <ExamBuilder
      source={source}
      namedConditions={namedConditions}
      questions={editor.selected}
      onQuestionsChange={onQuestionsChange}
      title={editor.title}
      onTitleChange={editor.setTitle}
      initialGroup={initialGroup}
      initialStep={initialStep}
      preserveStoredOutput={preserveStoredOutput}
      onBeginEdit={onBeginEdit}
      onStepChange={onStepChange}
      onIntentIssueChange={onIntentIssueChange}
      difficulties={MATH_EXAM_DIFFICULTIES}
      maxQuestions={MATH_EXAM_MAX_QUESTIONS}
      canOutput={canOutput}
      scopeControls={
        <div className={s.sourceBar}>
          <div className={s.sourceRow}>
            <strong>출처</strong>
            <div className={s.segments} aria-label="출처 선택">
              <button
                type="button"
                aria-pressed={pick.group === ""}
                onClick={() => {
                  setPick({ group: "", books: [], kinds: [] });
                  setMaterialIds([]);
                  setMaterialOpen(false);
                }}
              >
                전체
              </button>
              <button
                type="button"
                aria-pressed={pick.group === "school_textbook"}
                onClick={() => {
                  setPick({
                    group: "school_textbook",
                    books: pick.books,
                    kinds: pick.kinds,
                  });
                  setMaterialOpen(false);
                }}
              >
                교과서만
              </button>
            </div>
          </div>
          {pick.group === "school_textbook" && (
            <button
              type="button"
              className={s.bookControl}
              onClick={() => setSourceOpen(true)}
            >
              {pick.books.length ? sourceLabel : "책 · 자료 종류 고르기"}
            </button>
          )}
          <details className={s.extraSources}>
            <summary>추가 선택</summary>
            <small title="현재 남아 있는 내 확정·인쇄 시험의 생성일 기준입니다. 시험 5개 이상·사용 문항 2개 이상인 차시의 상위 10위만 표시합니다.">
              {usage.unavailable
                ? "출제 기록 확인 실패"
                : "내 문항 출제 순위 · 최근 30일 · 같은 차시 기준"}
            </small>
            <label
              className={s.familyRule}
              title="숫자만 다른 같은 문항류를 한 시험지에 한 문항만 담습니다. 끄면 같은 문항류도 여러 개 담깁니다."
            >
              <input
                type="checkbox"
                checked={distinctFamilies}
                onChange={(event) => setDistinctFamilies(event.target.checked)}
              />
              같은 문항류는 1문항만
            </label>
            <BankSourceField
              text={sourceLabel}
              opener={opener}
              onOpen={() => setSourceOpen(true)}
            />
          </details>
          {pick.group === "school_textbook" && (
            <div className={s.materialControl}>
              <button
                disabled={!materialKey}
                onClick={() => setMaterialOpen(true)}
              >
                {materialIds.length
                  ? `자료 ${materialIds.length}개 선택`
                  : "자료 고르기"}
              </button>
              {!materialKey && <small>출처에서 교과서를 먼저 고르세요.</small>}
              {materialIds.length > 0 && (
                <button onClick={() => setMaterialIds([])}>
                  자료 조건 해제
                </button>
              )}
            </div>
          )}
          {materialOpen && materialKey && (
            <DemandMaterialPicker
              books={pick.books}
              kinds={pick.kinds}
              selected={materialIds}
              bookNames={Object.fromEntries(
                sourceBooks.map((book) => [
                  book.id,
                  [book.grade, book.publisher, book.author]
                    .filter(Boolean)
                    .join(" · "),
                ]),
              )}
              onClose={() => setMaterialOpen(false)}
              onApply={(ids) => {
                setMaterialIds(ids);
                setMaterialOpen(false);
              }}
            />
          )}
          {overlap && (
            <p role="status">
              이 학습지에서 이미 연습한 변형이 복습에 다시 나올 수 있습니다.
            </p>
          )}
          {sourceOpen && (
            <SourcePicker
              onCatalog={rememberBooks}
              value={pick}
              filterGrade={initialGroup ?? ""}
              returnFocus={opener}
              onApply={(value) => {
                if (JSON.stringify(value) !== JSON.stringify(pick))
                  setMaterialIds([]);
                setMaterialOpen(false);
                setPick(value);
                setSourceOpen(false);
              }}
              onCancel={() => setSourceOpen(false)}
            />
          )}
        </div>
      }
      onOutputIntent={() => {
        void loadWorksheetEditor().catch(() => {});
      }}
      renderQuestion={(problem) => {
        const reference = sourceReferenceLabel({
          source:
            typeof problem.source === "string" ? problem.source : undefined,
          sourceReference: problem.sourceReference,
        });
        return (
          <>
            <UsageLabel
              item={usage.problems.get(problem.id)}
              kind="problem"
              note={usage.note}
            />
            {problem.questionFormats && (
              <p className={s.reference}>
                가능 형식 · {possibleFormats(problem) || "확인 전"}
              </p>
            )}
            {reference && <p className={s.reference}>{reference}</p>}
            {problem.source === "school_textbook" && (
              <p className={s.readiness}>
                {slots[problem.id] === undefined
                  ? slotResult?.ids === textbookIds && slotResult.failed
                    ? "지정 복습 변형 · 확인 실패"
                    : "지정 복습 변형 · 준비 상태 확인 전"
                  : slots[problem.id].state === "missing" ||
                      slots[problem.id].state === "notTextbook"
                    ? "지정 복습 변형 · 원문 상태 재확인 필요"
                    : `지정 복습 변형 ${slots[problem.id].ready}/2 준비`}
                <span>일반 유사문항과 별도</span>
              </p>
            )}
            <UnifiedProblem problem={problem} hideScores />
          </>
        );
      }}
      renderCandidate={(problem) => (
        <UnifiedProblem problem={problem} hideScores />
      )}
      renderAnswer={(problem) => <ExamAnswerPanel problem={problem} />}
      renderOutput={({
        questions,
        title,
        onQuestionsChange: change,
        onTitleChange,
        onStep,
      }) => (
        <WorksheetEditor
          {...editor}
          fixedComposition={preserveStoredOutput || editor.fixedComposition}
          outputNotice={
            preserveStoredOutput ? (
              <p role="status">
                저장 당시의 실제 문항·답·순서를 유지합니다.{" "}
                <button type="button" onClick={() => onStep("review")}>
                  사본으로 새 시험지 만들기
                </button>
              </p>
            ) : (
              editor.outputNotice
            )
          }
          beforeOutput={
            preserveStoredOutput
              ? editor.beforeOutput
              : async (kind) => {
                  await source.prepareOutput?.(
                    questions,
                    new AbortController().signal,
                  );
                  await editor.beforeOutput?.(kind);
                }
          }
          settingsSlots={{
            top:
              printPresets &&
              editor.printOptions &&
              editor.printMeta &&
              editor.setPrintOptions &&
              editor.setPrintMeta ? (
                <SavedLayouts
                  client={printPresets.client}
                  options={editor.printOptions}
                  meta={editor.printMeta}
                  onDefaultChange={printPresets.onDefaultChange}
                  onApply={(next) => {
                    editor.setPrintOptions?.(next.options);
                    editor.setPrintMeta?.(next.meta);
                  }}
                />
              ) : undefined,
            metaTop: sheetTag ? (
              <SheetTagPicker
                value={sheetTag.value}
                onChange={sheetTag.onChange}
              />
            ) : undefined,
            // W7 제목 추천 — 시험지에서 읽은 값만(학년 · 과정 · 대단원 · 범위 · 날짜 · W8 태그).
            afterTitle: (
              <TitleSuggestions
                suggestions={titleSuggestions({
                  problems: questions,
                  meta: editor.printMeta ?? {},
                  tag: sheetTag?.value,
                })}
                title={title}
                onApply={(text) => {
                  onTitleChange(text);
                  editor.setPrintMeta?.({ title: text });
                }}
              />
            ),
          }}
          sheetTag={sheetTag ? sheetTag.value : editor.sheetTag}
          selected={questions}
          title={title}
          setTitle={onTitleChange}
          headerTitle="시험지 만들기"
          stepNavigation={{
            label: "시험지 만들기 단계 이동",
            items: [
              {
                id: "scope",
                label: "1 범위 설정",
                current: false,
                onSelect: () => onStep("scope"),
              },
              {
                id: "review",
                label: "2 문항 검토",
                current: false,
                onSelect: () => onStep("review"),
              },
              {
                id: "output",
                label: "3 양식 구성·출력",
                current: true,
                onSelect: () => {},
              },
            ],
          }}
          reorder={change}
          toggle={(problem) =>
            change(questions.filter((item) => item.id !== problem.id))
          }
          navigate={(view) =>
            view === "bank" ? onStep("review") : editor.navigate(view)
          }
        />
      )}
    />
  );
}
