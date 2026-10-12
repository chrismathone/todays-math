import type { EnglishBankQuestion } from "@/contracts/englishQuestionBank.contract";
import type { StudioProblem } from "@/components/unified/types";
import { englishBundleNotices, planEnglishBundles } from "@/lib/english/bundle";
import {
  englishUnderlineNotices,
  findEnglishUnderlineProblems,
} from "@/lib/english/underline";

/** Group identical original passages even when the selected questions came from different saved sets. */
export function englishOutputSheets(items: EnglishBankQuestion[]) {
  const originals = new Map<
    string,
    { items: EnglishBankQuestion[]; numbers: number[] }
  >();
  items.forEach((item, index) => {
    const group = originals.get(item.passage) ?? { items: [], numbers: [] };
    group.items.push(item);
    group.numbers.push(index + 1);
    originals.set(item.passage, group);
  });
  return [...originals.values()].flatMap((group, groupIndex) => {
    const plan = planEnglishBundles({
      passage: group.items[0]!.passage,
      questions: group.items.map((item) => item.question),
    });
    const display = (index: number) => group.numbers[index]! - 1;
    const notices = englishBundleNotices({
      ...plan,
      bundles: plan.bundles.map((b) => ({
        ...b,
        questions: b.questions.map(display),
      })),
      leaks: plan.leaks.map((l) => ({
        ...l,
        source: display(l.source),
        target: display(l.target),
      })),
      open: plan.open.map((l) => ({
        ...l,
        source: display(l.source),
        target: display(l.target),
      })),
      variantGroups: plan.variantGroups.map((indices) => indices.map(display)),
    });
    return plan.bundles.map((bundle) => {
      const selected = bundle.questions.map((index) => group.items[index]!);
      const numbers = bundle.questions.map((index) => group.numbers[index]!);
      const issues = findEnglishUnderlineProblems(
        selected.map((item) => item.question),
      );
      const underline = englishUnderlineNotices({
        blocking: issues.blocking.map((p) => ({
          ...p,
          question: numbers[p.question]! - 1,
        })),
        warnings: issues.warnings.map((i) => numbers[i]! - 1),
      });
      return {
        id: `${group.items[0]!.key}:${bundle.no}`,
        label: `원문 ${groupIndex + 1} · ${group.items[0]!.title} · ${bundle.kind} 묶음 ${bundle.no} · ${numbers.join(", ")}번`,
        items: selected,
        numbers,
        includePassage: bundle.passage,
        notices,
        underline,
      };
    });
  });
}
export type EnglishOutputSheet = ReturnType<typeof englishOutputSheets>[number];

/** Generic worksheet shell metadata is derived; English source content stays verbatim in english.item. */
export function englishWorksheetProblem(
  item: EnglishBankQuestion,
  displayNumber: number,
  includePassage: boolean,
): StudioProblem {
  return {
    id: item.key,
    content: item.question.prompt,
    answer: item.question.answer,
    solution: item.question.explanation,
    grade: item.grade,
    chapter: item.title,
    section: `${item.title} · 원본 ${item.questionIndex + 1}번`,
    difficulty: item.difficulty ?? "미지정",
    problemCode: item.key,
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
    sourceLabel: `${item.school} · ${item.examTitle} · ${item.title} · 원본 ${item.questionIndex + 1}번`,
    english: { item, displayNumber, includePassage },
  };
}

export function assertEnglishSheetPrintable(
  sheet: EnglishOutputSheet | undefined,
  acknowledged: boolean,
) {
  if (!sheet?.items.length) throw new Error("인쇄할 문항을 선택해 주세요.");
  if (sheet.underline.errors.length)
    throw new Error(sheet.underline.errors.join(" "));
  if (sheet.items.some((item) => item.status !== "검토 완료") && !acknowledged)
    throw new Error(
      "검토가 끝나지 않은 세트의 내용을 확인한 뒤 인쇄 확인란을 선택해 주세요.",
    );
}
