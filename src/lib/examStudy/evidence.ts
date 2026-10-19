import {
  type ExamStudyDraft,
  type ExamStudyEvidenceCheck,
  type ExamStudyFamily,
  type ExamStudyVerification,
  type StudyCoverageLevel,
  type StudyRequirementId,
} from "@/contracts/examStudy.contract";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import { circledValueRaw } from "@/lib/math/circledNumber";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { REQUIREMENT_BY_ID } from "./requirements";
import { studyCurriculumHold } from "./curriculumEligibility";

export function requiredEvidenceChecks(
  id: StudyRequirementId,
  written = false,
): ExamStudyEvidenceCheck[] {
  const requirement = REQUIREMENT_BY_ID.get(id)!;
  const checks: ExamStudyEvidenceCheck[] = [
    "independent-solution",
    "essential-conditions",
  ];
  if (requirement.representation === "figure-required")
    checks.push("visual-information");
  if (written || requirement.response.every((f) => f === "서술형"))
    checks.push("native-rubric");
  return checks;
}

/** Intent is only an upper bound. Missing test/sample/branch proof cannot grant full. */
export function familyCoverage(
  family: ExamStudyFamily,
  id: StudyRequirementId,
  verification?: ExamStudyVerification,
  item?: ExamStudyDraft,
): StudyCoverageLevel {
  if (studyCurriculumHold(family)) return "unavailable";
  const intent = family.fulfills.find((f) => f.requirement === id);
  if (!intent || (verification && !verification.valid)) return "unavailable";
  const proof = family.evidence;
  if (!proof || !proof.checkedRequirements.includes(id)) return "unverified";
  const executable = /^src\/__tests__\/.+\.(?:test|spec)\.[cm]?[jt]sx?$/.test(
    proof.testFile.trim(),
  );
  const evidencePresent =
    executable &&
    Number.isSafeInteger(proof.sampleCount) &&
    proof.sampleCount > 0 &&
    proof.boundaryCases.some((s) => s.trim().length > 0);
  const needed = requiredEvidenceChecks(id, item?.questionType === "서술형");
  const complete =
    evidencePresent &&
    needed.every((c) => proof.checks.includes(c)) &&
    (!verification || needed.every((c) => verification.checks.includes(c)));
  const visual =
    REQUIREMENT_BY_ID.get(id)!.representation !== "figure-required" ||
    (family.representation === "figure-required" &&
      (!item || item.figureSpec !== null));
  const writtenOnly = REQUIREMENT_BY_ID.get(id)!.response.every(
    (format) => format === "서술형",
  );
  const response =
    !writtenOnly ||
    (family.formats.includes("서술형") &&
      (!item || item.questionType === "서술형"));
  return intent.level === "full" && complete && visual && response
    ? "full"
    : "component";
}

export function draftErrors(item: ExamStudyDraft): string[] {
  const errors: string[] = [];
  for (const key of ["content", "answer", "solution"] as const) {
    if (typeof item?.[key] !== "string" || !item[key].trim())
      errors.push(`${key} is empty`);
  }
  if (!["객관식", "단답형", "서술형"].includes(item?.questionType))
    errors.push("Unsupported actual format");
  if (
    item?.questionType === "객관식" &&
    typeof item.content === "string" &&
    typeof item.answer === "string"
  ) {
    const choices = parseProblemContent(item.content).choices;
    const selected = [...item.answer].map(circledValueRaw).filter((n) => n > 0);
    if (
      choices.length !== 5 ||
      !selected.length ||
      selected.some((n) => n > 5) ||
      new Set(selected).size !== selected.length ||
      new Set(choices.map((s) => s.trim())).size !== 5
    )
      errors.push(
        "Actual MC task needs five distinct choices and valid answer marks",
      );
  }
  if (!(DIFFICULTY_LADDER as readonly unknown[]).includes(item?.difficulty))
    errors.push("Unsupported actual difficulty");
  if (
    !Array.isArray(item?.difficultyBasis) ||
    !item.difficultyBasis.length ||
    item.difficultyBasis.some((s) => typeof s !== "string" || !s.trim())
  )
    errors.push("Missing structural difficulty basis");
  if (
    item?.figureSpec !== null &&
    (typeof item?.figureSpec !== "object" || Array.isArray(item.figureSpec))
  )
    errors.push("Invalid figure specification");
  if (item?.questionType === "서술형") {
    const rubric = item.rubric;
    if (
      !rubric ||
      !Number.isSafeInteger(rubric.totalPoints) ||
      rubric.totalPoints <= 0 ||
      !Array.isArray(rubric.criteria) ||
      rubric.criteria.length < 2
    ) {
      errors.push(
        "Native written task needs a model solution and multi-criterion rubric",
      );
    } else {
      if (
        new Set(rubric.criteria.map((c) => c.criterionId)).size !==
          rubric.criteria.length ||
        rubric.criteria.some(
          (c) =>
            !c.criterionId?.trim() ||
            !c.expected?.trim() ||
            !Number.isSafeInteger(c.points) ||
            c.points <= 0 ||
            !c.alternatives?.length ||
            !c.errors?.length ||
            [...c.alternatives, ...c.errors].some((s) => !s.trim()),
        ) ||
        rubric.criteria.reduce((s, c) => s + c.points, 0) !== rubric.totalPoints
      )
        errors.push("Invalid rubric criteria or point total");
    }
    if (!item.solution?.split(/채점\s*기준/)[0]?.trim())
      errors.push("Missing written model solution");
  } else if (item?.rubric !== undefined)
    errors.push("A calculation task cannot acquire a descriptive rubric");
  return errors;
}

export function verifyDraft(
  family: ExamStudyFamily,
  item: ExamStudyDraft,
): ExamStudyVerification {
  const errors = draftErrors(item);
  if (errors.length) return { valid: false, checks: [], errors };
  try {
    const result = family.verify(item);
    if (
      !result ||
      !Array.isArray(result.checks) ||
      !Array.isArray(result.errors)
    )
      return {
        valid: false,
        checks: [],
        errors: ["Malformed verifier result"],
      };
    return {
      ...result,
      valid: result.valid === true && result.errors.length === 0,
    };
  } catch (error) {
    return {
      valid: false,
      checks: [],
      errors: [error instanceof Error ? error.message : "Verifier failed"],
    };
  }
}
