"use client";

import {
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
import WorkProgress from "@/components/unified/WorkProgress";
import {
  BankSourceField,
  BankSourcePicker,
} from "@/components/unified/BankSourcePicker";
import {
  sourceFieldText,
  type SourcePick,
} from "@/components/unified/bankSourcePick";
import {
  bankSourceCountsSchema,
  bankSourceMaterialsSchema,
  type BankSourceMaterial,
  type BankSourceCounts,
  type BankSourceAvailability,
} from "@/contracts/bankSource.contract";
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
import type { ExamBuilderStep } from "./types";
import MaterialPicker from "./MaterialPicker";
import ExamAnswerPanel from "./ExamAnswerPanel";
import {
  createMathExamBuilderSource,
  MATH_EXAM_DIFFICULTIES,
  MATH_EXAM_MAX_QUESTIONS,
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
  onStepChange,
}: {
  initialData: BankData;
  initialGroup?: string;
  editor: ComponentProps<typeof WorksheetEditorComponent>;
  onQuestionsChange: (items: StudioProblem[]) => void;
  canOutput: boolean;
  initialStep?: ExamBuilderStep;
  onStepChange?: (step: ExamBuilderStep) => void;
}) {
  const [pick, setPick] = useState<SourcePick>({
    group: "",
    books: [],
    kinds: [],
  });
  const [sourceOpen, setSourceOpen] = useState(false);
  // D-111 — 기본 켜짐, 원장님이 끌 수 있다(2026-10-16). 일일테스트 경로는 늘 켜짐이다.
  const [distinctFamilies, setDistinctFamilies] = useState(true);
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const usage = useUsageLabels({
    problemIds: [...editor.selected.map((item) => item.id), ...candidateIds],
  });
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialResult, setMaterialResult] = useState<{
    key: string;
    items?: BankSourceMaterial[];
    error?: string;
  }>();
  const [materialRetry, setMaterialRetry] = useState(0);
  const materialKey =
    pick.group === "school_textbook" ? pick.books.join(",") : "";
  useEffect(() => {
    if (!materialOpen || !materialKey) return;
    const controller = new AbortController();
    void fetch(`${getStudioEndpoints().problems}/sources`, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ view: "materials", books: materialKey }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("자료 목록을 불러오지 못했습니다.");
        return bankSourceMaterialsSchema.parse(await response.json());
      })
      .then((value) => {
        if (!controller.signal.aborted)
          setMaterialResult({ key: materialKey, items: value.materials });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setMaterialResult({
            key: materialKey,
            error:
              cause instanceof Error ? cause.message : "자료 목록 확인 실패",
          });
      });
    return () => controller.abort();
  }, [materialOpen, materialKey, materialRetry]);
  const [counts, setCounts] = useState<BankSourceCounts | null>(null);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [countsRetry, setCountsRetry] = useState(0);
  const [availability, setAvailability] = useState<{
    filters: string;
    value: BankSourceAvailability;
  }>();
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
  useEffect(() => {
    if (!sourceOpen) return;
    const controller = new AbortController();
    void fetch(`${getStudioEndpoints().problems}/sources`, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("전체 보유량을 불러오지 못했습니다.");
        return bankSourceCountsSchema.parse(await response.json());
      })
      .then((value) => {
        if (!controller.signal.aborted) {
          setCounts(value);
          setCountsError(null);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setCountsError(
            error instanceof Error
              ? error.message
              : "전체 보유량을 불러오지 못했습니다.",
          );
      });
    return () => controller.abort();
  }, [sourceOpen, countsRetry]);
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
      initialUnits: initialData.units,
      initialUnitCounts: initialData.unitCounts,
      filters,
      refreshAvailability: true,
      distinctFamilies,
      onAvailability: (value) => setAvailability({ filters, value }),
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
  }, [initialData.units, initialData.unitCounts, filters, distinctFamilies]);
  return (
    <ExamBuilder
      source={source}
      questions={editor.selected}
      onQuestionsChange={onQuestionsChange}
      title={editor.title}
      onTitleChange={editor.setTitle}
      initialGroup={initialGroup}
      initialStep={initialStep}
      onStepChange={onStepChange}
      difficulties={MATH_EXAM_DIFFICULTIES}
      maxQuestions={MATH_EXAM_MAX_QUESTIONS}
      canOutput={canOutput}
      status={
        <div className={s.sourceBar}>
          <small title="현재 남아 있는 내 확정·인쇄 시험의 생성일 기준입니다. 시험 5개 이상·사용 문항 2개 이상인 차시의 상위 10위만 표시합니다.">
            {usage.unavailable
              ? "출제 기록 확인 실패"
              : "내 출제 순위 · 최근 30일 · 같은 차시 기준"}
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
            text={sourceFieldText(counts, pick)}
            opener={opener}
            onOpen={() => setSourceOpen(true)}
          />
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
              {materialOpen && materialResult?.key !== materialKey && (
                <span role="status">자료 목록을 확인합니다…</span>
              )}
              {materialOpen &&
                materialResult?.key === materialKey &&
                materialResult.error && (
                  <span role="alert">
                    {materialResult.error}
                    <button
                      onClick={() => setMaterialRetry((value) => value + 1)}
                    >
                      다시 확인
                    </button>
                  </span>
                )}
            </div>
          )}
          {materialOpen &&
            materialResult?.key === materialKey &&
            materialResult.items && (
              <MaterialPicker
                materials={materialResult.items.filter(
                  (item) =>
                    !pick.kinds.length || pick.kinds.includes(item.kind),
                )}
                selected={materialIds}
                bookNames={Object.fromEntries(
                  (counts?.textbook.books ?? []).map((book) => [
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
          <p aria-live="polite">
            {availability?.filters === filters
              ? `이 출처 조건 · 보유 ${availability.value.held.toLocaleString()}문항 · 출제 가능 ${availability.value.available.toLocaleString()}문항`
              : "이 출처 조건의 출제 가능 수를 확인합니다."}
            <small>
              출처 고르기의 수는 전체 보유량입니다. 차시별 출제 가능 수는 범위
              선택에서 확인합니다.
            </small>
          </p>
          {overlap && (
            <p role="status">
              이 학습지에서 이미 연습한 변형이 복습에 다시 나올 수 있습니다.
            </p>
          )}
          {sourceOpen && (
            <BankSourcePicker
              counts={counts}
              error={countsError}
              onRetry={() => setCountsRetry((value) => value + 1)}
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
