import {
  EXAM_STUDY_LIMITS,
  examStudyGenerateRequestSchema,
  type CanonicalParams,
  type ExamStudyDraft,
  type ExamStudyFamily,
  type ExamStudyGenerateOptions,
  type ExamStudyGenerateRequest,
  type ExamStudyGeneration,
  type ExamStudyItem,
  type ExamStudyProfile,
  type StudyCoverageLevel,
  type StudyRequirementId,
} from "@/contracts/examStudy.contract";
import { circledValueRaw } from "@/lib/math/circledNumber";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { deriveStudyMultipleChoice } from "./adapters";
import { familyCoverage, verifyDraft } from "./evidence";
import {
  contentDigest,
  logicalKey,
  mathematicalFigure,
  normalizeTaskText,
  seedFrom,
  sha256,
  stableStringify,
} from "./identity";
import { allocateStudyQuotas, planFullCandidates } from "./planner";
import {
  EXAM_STUDY_PROFILES,
  findStudyProfile,
  profileMatchesSchool,
} from "./profiles";
import {
  assertCanonicalParams,
  EXAM_STUDY_ENGINE_VERSION,
  examStudyFamilies,
  studyManifestVersion,
  validateStudyFamilies,
} from "./registry";
import { REQUIREMENT_BY_ID } from "./requirements";
import { studyCurriculumHold } from "./curriculumEligibility";

export class ExamStudyRequestError extends Error {
  readonly name = "ExamStudyRequestError";
  constructor(
    readonly code: string,
    message: string,
    readonly issues: readonly string[] = [message],
  ) {
    super(message);
  }
}

export function parseExamStudyRequest(
  input: unknown,
): ExamStudyGenerateRequest {
  let bytes: number;
  try {
    bytes = Buffer.byteLength(JSON.stringify(input) ?? "", "utf8");
  } catch {
    throw new ExamStudyRequestError(
      "invalid-request",
      "요청을 직렬화할 수 없습니다.",
    );
  }
  if (bytes > EXAM_STUDY_LIMITS.maxRequestBytes)
    throw new ExamStudyRequestError(
      "request-too-large",
      "출제 요청이 허용 크기를 넘었습니다.",
    );
  const parsed = examStudyGenerateRequestSchema.safeParse(input);
  if (!parsed.success)
    throw new ExamStudyRequestError(
      "invalid-request",
      "출제 조건을 확인해 주세요.",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  return parsed.data;
}

function resolveProfile(
  request: ExamStudyGenerateRequest,
  profiles: readonly ExamStudyProfile[],
): ExamStudyProfile | undefined {
  // Explicit general types keep the school label display-only.
  if (request.familyIds && !request.profileId) return undefined;
  let profile = request.profileId
    ? profiles.find((p) => p.id === request.profileId)
    : undefined;
  if (request.profileId && !profile)
    throw new ExamStudyRequestError(
      "unknown-profile",
      "검토된 범위가 아닙니다.",
    );
  if (profile && profile.course !== request.course)
    throw new ExamStudyRequestError(
      "profile-course-conflict",
      "검토 범위와 학년·과목이 다릅니다.",
    );
  if (!profile && request.schoolName)
    profile = findStudyProfile(request.schoolName, request.course, profiles);
  if (
    profile &&
    request.schoolName &&
    !profileMatchesSchool(profile, request.schoolName)
  )
    throw new ExamStudyRequestError(
      "profile-school-conflict",
      "학교 이름과 선택한 검토 범위가 다릅니다.",
    );
  if (
    request.schoolName &&
    !profile &&
    profiles.some((p) => profileMatchesSchool(p, request.schoolName!))
  )
    throw new ExamStudyRequestError(
      "school-course-unreviewed",
      "이 학교의 해당 학년·과목은 검토 범위가 없습니다. 학교 선택을 해제하고 일반 범위 연습을 이용해 주세요.",
    );
  if (
    profile &&
    request.requirementIds?.some(
      (id) => !profile.requirements.some((r) => r.id === id),
    )
  )
    throw new ExamStudyRequestError(
      "profile-scope-conflict",
      "선택한 요구가 학교의 검토 범위 밖입니다.",
    );
  return profile;
}

function validateProfiles(profiles: readonly ExamStudyProfile[]): void {
  if (new Set(profiles.map((p) => p.id)).size !== profiles.length)
    throw new Error("Duplicate study profile");
  for (const profile of profiles) {
    if (
      !profile.version ||
      !profile.requirements.length ||
      new Set(profile.requirements.map((r) => r.id)).size !==
        profile.requirements.length ||
      profile.requirements.some(
        (r) =>
          !REQUIREMENT_BY_ID.has(r.id) ||
          !Number.isFinite(r.weight) ||
          r.weight <= 0 ||
          r.weight > EXAM_STUDY_LIMITS.maxQuestions,
      )
    )
      throw new Error(`Invalid study profile: ${profile.id}`);
  }
}

interface Candidate {
  family: ExamStudyFamily;
  draft: ExamStudyDraft;
  params: CanonicalParams;
  levels: ReadonlyMap<StudyRequirementId, StudyCoverageLevel>;
  full: StudyRequirementId[];
  digest: string;
  key: string;
  seed: number;
  variant: number;
}

const sortText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const isSvg = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\s*(?:<\?xml[^>]*>\s*)?<svg(?:\s|\/?>)/.test(value);

/** Pure, original-task generation; the optional preparation callback is the sole transport. */
export async function generateExamStudy(
  input: unknown,
  options: ExamStudyGenerateOptions = {},
): Promise<ExamStudyGeneration> {
  const request = parseExamStudyRequest(input);
  const all = options.families ?? examStudyFamilies();
  if (options.families) validateStudyFamilies(all);
  const profiles = options.profiles ?? EXAM_STUDY_PROFILES;
  validateProfiles(profiles);
  const profile = resolveProfile(request, profiles);
  const manifestVersion = studyManifestVersion(all);
  const byId = new Map(all.map((f) => [f.id, f]));
  if (request.familyIds) {
    for (const id of request.familyIds) {
      const family = byId.get(id);
      if (!family)
        throw new ExamStudyRequestError(
          "unknown-family",
          `등록되지 않은 연습 문형입니다: ${id}`,
        );
      if (family.course !== request.course)
        throw new ExamStudyRequestError(
          "family-course-conflict",
          `다른 학년·과목의 연습 문형입니다: ${id}`,
        );
    }
  }
  const selectedRequirements = (
    profile
      ? profile.requirements.filter(
          (r) =>
            !request.requirementIds || request.requirementIds.includes(r.id),
        )
      : (request.requirementIds ?? []).map((id) => ({ id, weight: 1 }))
  ).sort((a, b) => sortText(a.id, b.id));
  const ids = selectedRequirements.map((r) => r.id);
  const quotas = allocateStudyQuotas(selectedRequirements, request.count);
  const warnings: string[] = [];
  if (request.schoolName && !profile)
    warnings.push("학교 프로필을 적용하지 않고 일반 범위 연습으로 제공합니다.");
  if (profile) {
    warnings.push(
      "선택 검토 범위의 연습입니다. 학교 시험 전체의 대응률·적중률과 실제 학습 효과는 측정하지 않았습니다.",
    );
    warnings.push("학교 자료의 난도는 독립적으로 보정되지 않았습니다.");
    if (profile.scope.unknownCount)
      warnings.push(
        `원자료에서 미확인 또는 판독이 확정되지 않은 문항 ${profile.scope.unknownCount}개는 검토 범위 충족에 포함하지 않습니다.`,
      );
  }
  const recipe: ExamStudyGenerateRequest = {
    ...request,
    ...(profile ? { profileId: profile.id } : {}),
    ...(request.familyIds
      ? { familyIds: [...request.familyIds].sort(sortText) }
      : {}),
    ...(request.requirementIds
      ? { requirementIds: [...request.requirementIds].sort(sortText) }
      : {}),
  };
  const { schoolName: _displayOnly, ...mathRecipe } = recipe;
  void _displayOnly;
  const profileMath = profile
    ? {
        id: profile.id,
        version: profile.version,
        course: profile.course,
        requirements: selectedRequirements,
      }
    : null;
  const seedMaterial = {
    manifestVersion,
    recipe: mathRecipe,
    profile: profileMath,
  };
  const familyCap = (family: ExamStudyFamily) =>
    Math.min(
      request.count,
      Math.max(
        request.maxPerFamily,
        ...selectedRequirements
          .filter((r) => family.fulfills.some((f) => f.requirement === r.id))
          .map((r) => Math.ceil(r.weight)),
      ),
    );
  let eligible = all.filter(
    (f) =>
      f.course === request.course &&
      (!request.familyIds || request.familyIds.includes(f.id)) &&
      (!ids.length || f.fulfills.some((r) => ids.includes(r.requirement))),
  );
  const failed = new Map<string, Set<string>>();
  const note = (family: ExamStudyFamily, reason: string) => {
    const reasons = failed.get(family.id) ?? new Set<string>();
    reasons.add(reason);
    failed.set(family.id, reasons);
  };
  eligible = eligible.filter((family) => {
    const curriculumHold = studyCurriculumHold(family);
    if (curriculumHold) {
      note(family, curriculumHold.message);
      if (!warnings.includes(curriculumHold.message))
        warnings.push(curriculumHold.message);
      return false;
    }
    if (request.format !== "혼합" && !family.formats.includes(request.format)) {
      note(family, "요청 형식을 지원하지 않습니다.");
      return false;
    }
    if (
      request.difficulty &&
      family.difficulties.length &&
      !family.difficulties.includes(request.difficulty)
    ) {
      note(family, "요청 난도로 등록된 문형이 아닙니다.");
      return false;
    }
    return true;
  });
  const intentScore = (f: ExamStudyFamily) =>
    ids.reduce(
      (s, id) =>
        s +
        (familyCoverage(f, id) === "full"
          ? 4
          : f.fulfills.some((r) => r.requirement === id)
            ? 1
            : 0),
      0,
    );
  eligible.sort(
    (a, b) =>
      intentScore(b) - intentScore(a) ||
      seedFrom({ seedMaterial, family: a.id }) -
        seedFrom({ seedMaterial, family: b.id }) ||
      sortText(a.id, b.id),
  );

  const attempts = new Map<string, number>();
  const accepted = new Map<string, number>();
  const domainKeys = new Map<string, Set<string>>();
  for (const family of eligible)
    if (family.paramDomain.kind === "finite")
      domainKeys.set(
        family.id,
        new Set(family.paramDomain.enumerate().map(stableStringify)),
      );
  const keys = new Set<string>(),
    digests = new Set<string>();
  const candidates: Candidate[] = [];
  let totalAttempts = 0;
  const poolTarget = Math.min(
    EXAM_STUDY_LIMITS.maxAttempts,
    Math.max(request.count * 4, Math.min(eligible.length, 80)),
  );
  let more = true;
  while (
    more &&
    totalAttempts < EXAM_STUDY_LIMITS.maxAttempts &&
    candidates.length < poolTarget
  ) {
    more = false;
    for (const family of eligible) {
      if (
        totalAttempts >= EXAM_STUDY_LIMITS.maxAttempts ||
        candidates.length >= poolTarget
      )
        break;
      const variant = attempts.get(family.id) ?? 0;
      const budget =
        family.paramDomain.kind === "finite"
          ? Math.min(family.paramDomain.size, EXAM_STUDY_LIMITS.maxAttempts)
          : family.paramDomain.maxAttempts;
      if (
        variant >= budget ||
        (accepted.get(family.id) ?? 0) >=
          familyCap(family) + EXAM_STUDY_LIMITS.maxRenderRetries
      )
        continue;
      more = true;
      attempts.set(family.id, variant + 1);
      totalAttempts++;
      const seed = seedFrom({
        seedMaterial,
        family: `${family.id}@${family.version}`,
      });
      try {
        const base = family.generate(seed, variant);
        const verification = verifyDraft(family, base);
        if (!verification.valid) {
          note(family, `출력 검산 실패: ${verification.errors.join(" / ")}`);
          continue;
        }
        if (!family.formats.includes(base.questionType)) {
          note(family, "실제 형식이 문형 등록과 다릅니다.");
          continue;
        }
        if (request.difficulty && base.difficulty !== request.difficulty) {
          note(family, "실제 문항의 난도가 요청과 다릅니다.");
          continue;
        }
        if (family.representation === "figure-required" && !base.figureSpec) {
          note(family, "필수 그림 자료가 없습니다.");
          continue;
        }
        const params = family.canonicalParams(base);
        assertCanonicalParams(params);
        if (
          domainKeys.has(family.id) &&
          !domainKeys.get(family.id)!.has(stableStringify(params))
        ) {
          note(family, "유한 매개변수 영역 밖의 출력입니다.");
          continue;
        }
        let draft = base;
        if (request.format === "객관식" && base.questionType === "단답형") {
          draft = deriveStudyMultipleChoice(
            base,
            family.id,
            seedFrom({ seed, variant, choices: true }),
          );
          const parsed = parseProblemContent(draft.content);
          const choice = circledValueRaw(draft.answer.trim()) - 1;
          if (
            parsed.choices.length !== 5 ||
            choice < 0 ||
            normalizeTaskText(parsed.choices[choice] ?? "") !==
              normalizeTaskText(base.answer)
          ) {
            note(family, "객관식 파생의 정답 대응 검사가 실패했습니다.");
            continue;
          }
        }
        if (
          request.format !== "혼합" &&
          draft.questionType !== request.format
        ) {
          note(family, "실제 문항 형식이 요청과 다릅니다.");
          continue;
        }
        const levels = new Map(
          ids.map((id) => [id, familyCoverage(family, id, verification, base)]),
        );
        if (
          ids.length &&
          !ids.some(
            (id) =>
              family.fulfills.some((r) => r.requirement === id) &&
              (REQUIREMENT_BY_ID.get(id)!.representation !==
                "figure-required" ||
                (family.representation === "figure-required" &&
                  draft.figureSpec !== null)),
          )
        ) {
          note(
            family,
            "시각 자료 요구를 그림 없는 계산 문제로 대체할 수 없습니다.",
          );
          continue;
        }
        const key = logicalKey(family, params),
          digest = contentDigest(base);
        if (keys.has(key) || digests.has(digest)) {
          note(family, "동일 논리 문항 또는 같은 과제의 형식·별칭 중복입니다.");
          continue;
        }
        keys.add(key);
        digests.add(digest);
        candidates.push({
          family,
          draft,
          params,
          levels,
          full: ids.filter((id) => levels.get(id) === "full"),
          key,
          digest,
          seed,
          variant,
        });
        accepted.set(family.id, (accepted.get(family.id) ?? 0) + 1);
      } catch (error) {
        note(
          family,
          `생성 시도 실패: ${error instanceof Error ? error.message : "문항을 만들 수 없습니다."}`,
        );
      }
    }
  }

  const fullDelivered = (
    selected: readonly Candidate[],
    id: StudyRequirementId,
  ) => selected.filter((c) => c.full.includes(id)).length;
  const select = (pool: readonly Candidate[]): Candidate[] => {
    const selected = planFullCandidates(pool, quotas, request.count, familyCap);
    const familyCounts = new Map<string, number>();
    selected.forEach((c) =>
      familyCounts.set(c.family.id, (familyCounts.get(c.family.id) ?? 0) + 1),
    );
    const rest = pool.filter((c) => !selected.includes(c));
    // Fill only within selected mathematical demands. Such practice never meets
    // full quotas merely because a count or a component label is available.
    rest.sort(
      (a, b) =>
        b.full.length - a.full.length ||
        (b.family.source === "authored" ? 1 : 0) -
          (a.family.source === "authored" ? 1 : 0),
    );
    for (const candidate of rest) {
      if (selected.length >= request.count) break;
      if (
        (familyCounts.get(candidate.family.id) ?? 0) >=
        familyCap(candidate.family)
      )
        continue;
      selected.push(candidate);
      familyCounts.set(
        candidate.family.id,
        (familyCounts.get(candidate.family.id) ?? 0) + 1,
      );
    }
    return selected;
  };

  let usable = candidates;
  const prepared = new Map<string, string | null>();
  let renderCalls = 0;
  const renderBudget = request.count * (EXAM_STUDY_LIMITS.maxRenderRetries + 1);
  let selected: Candidate[] = [];
  while (usable.length) {
    selected = select(usable);
    const rejected = new Set<Candidate>();
    for (const candidate of selected) {
      if (prepared.has(candidate.key)) continue;
      if (!candidate.draft.figureSpec) {
        prepared.set(candidate.key, null);
        continue;
      }
      if (!options.prepare) {
        note(candidate.family, "필수 그림 렌더러가 제공되지 않았습니다.");
        rejected.add(candidate);
        continue;
      }
      let reason = "그림을 완전하게 렌더하지 못했습니다.";
      let ready = false;
      // A deterministic label/geometry failure must move to different parameters;
      // retrying the identical figure would waste the bounded replacement budget.
      if (renderCalls < renderBudget) {
        renderCalls++;
        try {
          const result = await options.prepare(candidate.draft);
          if (result.ok && isSvg(result.figureSvg)) {
            prepared.set(candidate.key, result.figureSvg);
            ready = true;
          } else
            reason = result.ok
              ? "그림이 필요한 문항의 SVG가 비어 있거나 유효하지 않습니다."
              : result.reason;
        } catch {
          reason = "그림 렌더링 중 오류가 발생했습니다.";
        }
      }
      if (!ready) {
        note(
          candidate.family,
          `그림 준비 실패: ${reason} (렌더 시도 상한 적용)`,
        );
        rejected.add(candidate);
      }
    }
    if (!rejected.size) break;
    usable = usable.filter((c) => !rejected.has(c));
    selected = [];
  }

  const questions: ExamStudyItem[] = selected.map((c) => ({
    ...c.draft,
    parameters: c.params,
    id: `exam-study:${sha256({ seedMaterial, logicalKey: c.key, content: c.digest }).slice(0, 32)}`,
    familyId: c.family.id,
    familyVersion: c.family.version,
    title: c.family.title,
    course: c.family.course,
    unitSections: c.family.unitSections,
    logicalKey: c.key,
    contentDigest: c.digest,
    seed: c.seed,
    variant: c.variant,
    requirements: c.full,
    figureSvg: prepared.get(c.key) ?? null,
  }));
  const requirements = quotas.map((q) => {
    const delivered = fullDelivered(selected, q.id);
    const levels = selected
      .map((c) => c.levels.get(q.id))
      .filter((s) => s && s !== "unavailable");
    const status: StudyCoverageLevel =
      delivered >= q.requested
        ? "full"
        : levels.some((s) => s === "component" || s === "full")
          ? "component"
          : levels.includes("unverified")
            ? "unverified"
            : "unavailable";
    const relevant = all.filter(
      (f) =>
        f.course === request.course &&
        (!request.familyIds || request.familyIds.includes(f.id)) &&
        f.fulfills.some((r) => r.requirement === q.id),
    );
    const reasons = [
      ...new Set(relevant.flatMap((f) => [...(failed.get(f.id) ?? [])])),
    ].slice(0, 3);
    const reason =
      status === "full"
        ? null
        : [
            `완결 연습 ${delivered}/${q.requested}개.`,
            !relevant.length
              ? "이 요구에 등록된 대응 문형이 없습니다."
              : "완결 대응 증거·실제 검산·형식·그림·문항 중복 및 가족 상한을 모두 만족하는 문항이 부족합니다.",
            ...reasons,
          ].join(" ");
    return {
      id: q.id,
      title: REQUIREMENT_BY_ID.get(q.id)!.title,
      status,
      requested: q.requested,
      delivered,
      reason,
    };
  });
  if (
    selected.some((c) => !c.family.evidence || (ids.length && !c.full.length))
  )
    warnings.push(
      "일부 문항은 일반 연습 또는 선수 요소이며, 검토된 요구의 완결 대응으로 계산하지 않습니다.",
    );
  if (questions.length < request.count)
    warnings.push(
      `조건을 유지한 서로 다른 문항 ${questions.length}/${request.count}개를 제공했습니다. 유한 변형·재시도·가족 상한을 넘어 채우지 않았습니다.`,
    );
  const complete =
    questions.length === request.count &&
    requirements.every((r) => r.status === "full");
  const status = complete
    ? "complete"
    : questions.length
      ? "partial"
      : "unavailable";
  const digest = sha256({
    engineVersion: EXAM_STUDY_ENGINE_VERSION,
    manifestVersion,
    recipe: mathRecipe,
    profile: profileMath,
    status,
    questions: questions.map((q) => ({
      logicalKey: q.logicalKey,
      contentDigest: q.contentDigest,
      content: normalizeTaskText(q.content),
      answer: normalizeTaskText(q.answer),
      solution: normalizeTaskText(q.solution),
      format: q.questionType,
      difficulty: q.difficulty,
      rubric: q.rubric ?? null,
      figure: mathematicalFigure(q.figureSpec),
      requirements: q.requirements,
    })),
    requirements: requirements.map(
      ({ id, status: level, requested, delivered }) => ({
        id,
        status: level,
        requested,
        delivered,
      }),
    ),
  });
  return {
    engineVersion: EXAM_STUDY_ENGINE_VERSION,
    manifestVersion,
    profileId: profile?.id ?? null,
    profileVersion: profile?.version ?? null,
    recipe,
    digest,
    status,
    requestedCount: request.count,
    deliveredCount: questions.length,
    questions,
    requirements,
    warnings,
    schoolEvidence: profile?.scope ?? null,
  };
}
