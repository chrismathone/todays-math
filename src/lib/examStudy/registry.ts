import {
  EXAM_STUDY_COURSES,
  EXAM_STUDY_LIMITS,
  STUDY_REQUIREMENT_IDS,
  type CanonicalParam,
  type CanonicalParams,
  type ExamStudyCatalog,
  type ExamStudyCourse,
  type ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import { legacyStudyFamilies } from "./adapters";
import { familyCoverage } from "./evidence";
import { ADVANCED_STUDY_FAMILIES } from "./families/advanced";
import { MIDDLE_STUDY_FAMILIES } from "./families/middle";
import { sha256, stableStringify } from "./identity";
import { EXAM_STUDY_PROFILES } from "./profiles";
import { STUDY_REQUIREMENTS } from "./requirements";

export const EXAM_STUDY_ENGINE_VERSION = "exam-study-1";

export function assertCanonicalParams(params: CanonicalParams): void {
  const validValue = (value: CanonicalParam): boolean =>
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (Array.isArray(value) && value.every(validValue));
  if (
    !params ||
    Object.getPrototypeOf(params) !== Object.prototype ||
    !Object.keys(params).length ||
    Object.entries(params).some(
      ([key, value]) =>
        /^(?:seed|format|questionType)$/i.test(key) || !validValue(value),
    )
  )
    throw new Error(
      "Canonical parameters must describe finite mathematical values, excluding seed and format",
    );
}

/** Trusted factories still have bounded domains; these checks fail closed. */
export function validateStudyFamilies(
  families: readonly ExamStudyFamily[],
): void {
  const ids = new Set<string>();
  for (const family of families) {
    if (!family.id || !family.version || ids.has(family.id))
      throw new Error(
        `Duplicate or missing study family identity: ${family.id}`,
      );
    ids.add(family.id);
    if (!(EXAM_STUDY_COURSES as readonly string[]).includes(family.course))
      throw new Error(`Unsupported family course: ${family.id}`);
    if (
      !family.formats.length ||
      new Set(family.formats).size !== family.formats.length ||
      family.formats.some((f) => !["객관식", "단답형", "서술형"].includes(f))
    )
      throw new Error(`Invalid family formats: ${family.id}`);
    if (
      family.fulfills.some(
        (f) =>
          !(STUDY_REQUIREMENT_IDS as readonly string[]).includes(f.requirement),
      ) ||
      new Set(family.fulfills.map((f) => f.requirement)).size !==
        family.fulfills.length
    )
      throw new Error(`Invalid family requirements: ${family.id}`);
    const domain = family.paramDomain;
    if (domain.kind === "sampled") {
      if (
        !Number.isSafeInteger(domain.maxAttempts) ||
        domain.maxAttempts < 1 ||
        domain.maxAttempts > EXAM_STUDY_LIMITS.maxAttempts
      )
        throw new Error(`Invalid sampling budget: ${family.id}`);
    } else if (domain.kind === "finite") {
      if (!Number.isSafeInteger(domain.size) || domain.size < 1)
        throw new Error(`Invalid finite domain: ${family.id}`);
      const entries = domain.enumerate();
      if (entries.length !== domain.size)
        throw new Error(`Finite domain size mismatch: ${family.id}`);
      entries.forEach(assertCanonicalParams);
      if (new Set(entries.map(stableStringify)).size !== entries.length)
        throw new Error(`Duplicate finite canonical parameters: ${family.id}`);
    } else throw new Error(`Missing parameter domain: ${family.id}`);
    if (
      typeof family.generate !== "function" ||
      typeof family.verify !== "function" ||
      typeof family.canonicalParams !== "function"
    )
      throw new Error(`Missing executable factory: ${family.id}`);
  }
}

let registry: readonly ExamStudyFamily[] | undefined;
export function examStudyFamilies(): readonly ExamStudyFamily[] {
  if (!registry) {
    registry = [
      ...MIDDLE_STUDY_FAMILIES,
      ...ADVANCED_STUDY_FAMILIES,
      ...legacyStudyFamilies(),
    ];
    validateStudyFamilies(registry);
  }
  return registry;
}

export function studyManifestVersion(
  families: readonly ExamStudyFamily[],
): string {
  return `exam-study-manifest-${sha256({
    engine: EXAM_STUDY_ENGINE_VERSION,
    requirements: STUDY_REQUIREMENTS,
    families: [...families]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((f) => ({
        id: f.id,
        version: f.version,
        course: f.course,
        source: f.source,
        fulfills: f.fulfills,
        formats: f.formats,
        difficulties: f.difficulties,
        representation: f.representation,
        figureKinds: f.figureKinds,
        evidence: f.evidence,
        domain:
          f.paramDomain.kind === "finite"
            ? {
                kind: "finite",
                size: f.paramDomain.size,
                parameters: f.paramDomain.enumerate(),
              }
            : f.paramDomain,
      })),
  }).slice(0, 24)}`;
}

export function getExamStudyCatalog(
  course?: ExamStudyCourse,
): ExamStudyCatalog {
  const all = examStudyFamilies();
  if (
    course !== undefined &&
    !(EXAM_STUDY_COURSES as readonly string[]).includes(course)
  )
    throw new Error("Unsupported study course");
  return {
    engineVersion: EXAM_STUDY_ENGINE_VERSION,
    manifestVersion: studyManifestVersion(all),
    courses: EXAM_STUDY_COURSES,
    families: all
      .filter((f) => course === undefined || f.course === course)
      .map((f) => ({
        id: f.id,
        version: f.version,
        title: f.title,
        course: f.course,
        source: f.source,
        unitSections: f.unitSections,
        formats: f.formats,
        difficulties: f.difficulties,
        representation: f.representation,
        fulfills: f.fulfills.map((r) => ({
          requirement: r.requirement,
          level: familyCoverage(f, r.requirement),
        })),
      })),
    requirements: STUDY_REQUIREMENTS,
    profiles: EXAM_STUDY_PROFILES.filter(
      (p) => course === undefined || p.course === course,
    ),
    limits: EXAM_STUDY_LIMITS,
  };
}
