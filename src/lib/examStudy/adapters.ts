import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import type { Difficulty } from "@/contracts/difficulty";
import {
  EXAM_STUDY_COURSES,
  type ExamStudyCourse,
  type ExamStudyDraft,
  type ExamStudyFamily,
  type ExamStudyFormat,
  type StudyRequirementId,
} from "@/contracts/examStudy.contract";
import { elementaryUnits } from "@/lib/elementary/generate";
import { generateElementaryForm, listedForms } from "@/lib/elementary/forms";
import { createRng } from "@/lib/elementary/rng";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import { generateHighProblem, registeredHighTypes } from "@/lib/high/generate";
import {
  generateNativeDescriptive,
  nativeDescriptiveDefinitions,
} from "@/lib/engine/nativeDescriptive20261018";
import { asMultipleChoice } from "@/lib/engine/deriveFormats";
import { hasChoices } from "@/lib/problem/choiceCountRule";
import { answerIsChoiceNumber } from "@/lib/problem/provenance";
import { draftErrors } from "./evidence";
import { legacyCanonicalParams } from "./identity";
import { curatedLegacyCheck } from "./legacyVerification";

const LEGACY_VERSION = "9cfbb8683-r1";
const courseIsSupported = (course: string): course is ExamStudyCourse =>
  (EXAM_STUDY_COURSES as readonly string[]).includes(course);

export function nativeQuestionFormat(item: {
  content: string;
  answer: string;
}): "객관식" | "단답형" {
  return hasChoices(item.content) && answerIsChoiceNumber(item.answer)
    ? "객관식"
    : "단답형";
}

/** Existing derivation is the only MC conversion path; never used for written. */
export function deriveStudyMultipleChoice(
  item: ExamStudyDraft,
  familyId: string,
  seed: number,
): ExamStudyDraft {
  if (item.questionType !== "단답형")
    throw new Error("Only an original short-answer task can be derived");
  const derived = asMultipleChoice(
    {
      content: item.content,
      answer: item.answer,
      solution: item.solution,
      familyKey: familyId,
      problemType: "활용",
      distractors: item.distractors,
    },
    createRng(seed),
  );
  return {
    ...item,
    content: derived.content,
    answer: derived.answer,
    questionType: derived.questionType,
  };
}

function supportedFormats(
  sample: ExamStudyDraft | undefined,
  allowMultipleChoice: boolean,
): readonly ExamStudyFormat[] {
  if (!sample) return []; // A failed legacy registration is not a usable catalog row.
  if (sample.questionType === "객관식" || sample.questionType === "서술형")
    return [sample.questionType];
  if (!allowMultipleChoice) return ["단답형"];
  try {
    deriveStudyMultipleChoice(sample, "catalog-probe", 71);
    return ["단답형", "객관식"];
  } catch {
    return ["단답형"];
  }
}

type AdapterDefinition = Pick<
  ExamStudyFamily,
  "id" | "title" | "course" | "source" | "unitIds" | "unitSections"
> & {
  make: (seed: number, variant: number) => ExamStudyDraft;
  allowMultipleChoice?: boolean;
  difficulty?: Difficulty;
  legacyKey?: string;
  components?: readonly StudyRequirementId[];
};

function adapter(definition: AdapterDefinition): ExamStudyFamily | undefined {
  let sample: ExamStudyDraft | undefined;
  try {
    sample = definition.make(20261018, 0);
  } catch {
    /* Keep broken generators out of the selectable catalog. */
  }
  const formats = supportedFormats(
    sample,
    definition.allowMultipleChoice !== false,
  );
  if (!sample || !formats.length || draftErrors(sample).length)
    return undefined;
  const curated = definition.legacyKey
    ? curatedLegacyCheck(definition.legacyKey)
    : undefined;
  const firstFigure = sample.figureSpec;
  return {
    id: definition.id,
    version: LEGACY_VERSION,
    title: definition.title,
    course: definition.course,
    source: definition.source,
    unitIds: definition.unitIds,
    unitSections: definition.unitSections,
    fulfills: curated
      ? [{ requirement: curated.requirement, level: "full" }]
      : (definition.components ?? []).map((requirement) => ({
          requirement,
          level: "component",
        })),
    formats,
    difficulties: definition.difficulty ? [definition.difficulty] : [],
    // A sample with no figure does not assert that every variant lacks a figure.
    representation: firstFigure ? "figure-required" : "figure-optional",
    figureKinds:
      firstFigure && typeof firstFigure.kind === "string"
        ? [firstFigure.kind]
        : [],
    paramDomain: {
      kind: "sampled",
      description: "기존 등록 문형의 유한 시도 표본; 전체 변형 수 미측정",
      maxAttempts: 48,
    },
    evidence: curated?.evidence,
    generate(seed, variant) {
      const item = definition.make(seed, variant);
      return { ...item, parameters: legacyCanonicalParams(item) };
    },
    canonicalParams: (item) => item.parameters,
    verify: curated
      ? curated.verify
      : (item) => ({
          valid: draftErrors(item).length === 0,
          checks: [],
          errors: draftErrors(item),
        }),
  };
}

function units(course: ExamStudyCourse, section: string): string[] {
  return CURRICULUM_UNITS.filter(
    (u) => u.grade === course && u.section === section,
  ).map((u) => `${course}|${u.section}`);
}

const COMPONENTS_BY_KEY: Readonly<
  Record<string, readonly StudyRequirementId[]>
> = {
  "1-1|문자의 사용과 식의 계산|13": ["algebra.linear-simplify"],
  "1-1|일차방정식의 풀이|09": ["algebra.equation-classification"],
  "1-1|일차방정식의 풀이|06": ["algebra.equality-truth"],
  "1-1|일차방정식의 풀이|11": ["algebra.candidate-verification"],
  "1-1|일차방정식의 활용|01": [
    "algebra.linear-model",
    "written.dependent-formula-min-time",
  ],
  "1-1|정비례와 반비례|20": [
    "coord.inverse-area-ratio",
    "coord.inverse-equal-legs",
    "coord.signed-inverse-trapezoid",
  ],
  "1-1|정비례와 반비례|21": [
    "coord.shared-side-square",
    "coord.inverse-equal-legs",
  ],
  "1-1|정비례와 반비례|22": ["coord.ray-area-partition"],
  "1-1|좌표와 그래프|84X": ["graph.piecewise-multi-claim"],
  "2-1|일차부등식|33U": ["algebra.inequality-solution-count"],
  "2-1|연립일차방정식|09": ["algebra.shifted-system-coupling"],
  "3-1|제곱근의 뜻과 성질|41U": ["algebra.absolute-sign-cases"],
};

const NATIVE_COMPONENTS: Readonly<
  Record<string, readonly StudyRequirementId[]>
> = {
  "e4-equilateral-audit-r1": ["elementary.definition-audit"],
  "e4-triangle-dual-proof-r1": ["elementary.definition-audit"],
  "e4-trapezoid-sufficiency-r1": ["elementary.definition-audit"],
  "m3-factor-error-proof-r1": ["algebra.error-identity"],
  "m3-quadratic-domain-r1": ["written.rectangle-domain"],
  "m3-statistics-shift-spread-r1": ["statistics.shift-spread"],
};

let cached: readonly ExamStudyFamily[] | undefined;
export function legacyStudyFamilies(): readonly ExamStudyFamily[] {
  if (cached) return cached;
  const out: ExamStudyFamily[] = [];
  const add = (definition: AdapterDefinition) => {
    const result = adapter(definition);
    if (result) out.push(result);
  };
  for (const unit of elementaryUnits()) {
    if (!courseIsSupported(unit.grade)) continue;
    for (const form of listedForms(unit)) {
      add({
        id: `legacy:elem:${unit.grade}|${unit.section.split(" ")[0]}|${form.id}`,
        title: `${unit.section} · 문형 ${form.id}`,
        course: unit.grade,
        source: "elementary",
        unitIds: [`${unit.grade}|${unit.section}`],
        unitSections: [unit.section],
        difficulty: form.tier,
        allowMultipleChoice: form.allowMultipleChoice,
        make(seed, variant) {
          const p = generateElementaryForm(
            unit,
            (seed + Math.imul(variant, 0x9e37)) >>> 0,
            form.id,
          );
          return {
            content: p.content,
            answer: p.answer,
            solution: p.solution,
            questionType: nativeQuestionFormat(p),
            difficulty: form.tier,
            difficultyBasis: [`기존 문형의 실제 등록 갈래: ${form.tier}`],
            parameters: {},
            figureSpec: p.figureSpec,
          };
        },
      });
    }
  }
  for (const entry of registeredTypes()) {
    if (!courseIsSupported(entry.grade)) continue;
    add({
      id: `legacy:mid:${entry.key}`,
      title: entry.rpmTitle,
      course: entry.grade,
      source: "middle",
      unitIds: units(entry.grade, entry.unitSection),
      unitSections: [entry.unitSection],
      legacyKey: entry.key,
      components: COMPONENTS_BY_KEY[entry.key],
      make(seed, variant) {
        const p = generateMiddleProblem(entry.key, seed, variant);
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          questionType: nativeQuestionFormat(p),
          difficulty: p.difficulty,
          difficultyBasis: [
            "기존 유형의 실제 출력 갈래; 학교 난도와의 교정은 미측정",
          ],
          parameters: {},
          figureSpec: p.figureSpec ?? null,
          distractors: p.distractors,
        };
      },
    });
  }
  for (const entry of registeredHighTypes()) {
    if (!courseIsSupported(entry.grade)) continue;
    add({
      id: `legacy:high:${entry.key}`,
      title: entry.rpmTitle,
      course: entry.grade,
      source: "high",
      unitIds: units(entry.grade, entry.unitSection),
      unitSections: [entry.unitSection],
      make(seed, variant) {
        const p = generateHighProblem(entry.key, seed, variant);
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          questionType: nativeQuestionFormat(p),
          difficulty: p.difficulty,
          difficultyBasis: [
            "기존 고등 유형의 실제 출력 갈래; 학교 난도와의 교정은 미측정",
          ],
          parameters: {},
          figureSpec: p.figureSpec ?? null,
          distractors: p.distractors,
        };
      },
    });
  }
  for (const definition of nativeDescriptiveDefinitions()) {
    add({
      id: `legacy:native:${definition.definitionId}`,
      title: definition.title,
      course: definition.grade,
      source: "native",
      unitIds: [definition.unitId],
      unitSections: [definition.unitSection],
      difficulty: definition.difficulty,
      components: NATIVE_COMPONENTS[definition.definitionId],
      make(seed, variant) {
        const p = generateNativeDescriptive(
          definition.definitionId,
          seed,
          variant,
        );
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          rubric: p.rubric,
          questionType: p.questionType,
          difficulty: definition.difficulty,
          difficultyBasis: [definition.difficultyBasis],
          parameters: {},
          figureSpec: null,
        };
      },
    });
  }
  cached = out;
  return cached;
}
