/**
 * 강의 등록 **계획기** — 제작 도구 `meta.json` 들 → 무엇을 초안으로 만들고, 무엇을
 * 건너뛰고, 무엇이 왜 실패하는가 (D-123 ⑥′).
 *
 * 수맥 `packages/ingest/src/cli/register-lectures.mts` 의 판단을 순수 함수로 뺐다. 수맥
 * CLI 는 판단과 DB 쓰기가 한 파일에 섞여 있어 **시험이 없었다.** 여기서는 판단만 떼어
 * 시험하고(`conceptRegisterPlan.test.ts`), CLI(`scripts/concept/register-lectures.ts`)는
 * 파일을 읽고 이 계획을 찍고 `--apply` 일 때만 초안을 쓰는 얇은 껍데기다.
 *
 * ## 수맥에서 그대로 온 것
 *
 * - **게시는 사람 버튼이다** — 계획에는 상태 칸이 없고, 만드는 것은 언제나 초안이다.
 * - 멱등: **같은 잡 ID** 나 **같은 영상 주소**가 이미 있으면 건너뛴다.
 * - 붙일 자리를 **지어내지 않는다** — 없으면 실패하고 `--unit` 을 달라고 한다.
 * - `--unit`·`--sort` 는 대상이 하나일 때만 — 여러 편에 같은 차시를 통째로 붙이는 사고를 막는다.
 * - 검증을 새로 쓰지 않는다 — 해석은 `parseLectureMeta`, 한계는 계약을 부른다.
 *
 * ## 바뀐 것 (보고서 §2)
 *
 * - 붙는 자리가 **차시**다 — `unitCode` = `Unit.problemCodePrefix`.
 * - **주소 없는 초안을 만든다.** 수맥은 주소가 없으면 건너뛰었다(DB CHECK 가 영상 자료에
 *   주소를 요구했다). 우리는 호스팅이 미정이라 초안은 주소가 비어도 되고 게시 관문이 요구한다.
 * - 그래서 **잡 ID 도 주소도 없으면 거절한다** — 멱등 열쇠가 없어 두 번 돌리면 두 벌이 된다.
 *   (수맥에서는 주소 없는 것이 애초에 건너뛰어져 이 경우가 생기지 않았다.)
 * - **회차 안의 중복**을 따로 본다. 수맥은 한 건씩 넣고 다음 건에서 DB 를 다시 봐서 자연히
 *   막혔다. 계획기는 쓰기 전에 전부 정하므로, 안 보면 `--apply` 에서 둘째가 unique 에
 *   부딪쳐 트랜잭션째 실패한다.
 * - 계획의 초안에는 `unitId` 가 없다 — 차시 **코드**만 든다. id 는 `--apply` 가 DB 에서
 *   찾는다. 그래야 계획을 DB 없이(`--offline`, 시드 단원표) 세울 수 있다.
 */
import {
  CONCEPT_LECTURE_LIMITS,
  conceptLectureDraftSchema,
  type ConceptLectureDraft,
  type ConceptLectureStatus,
} from "@/contracts/conceptLecture.contract";
import { UNIT_CODE_PATTERN } from "@/contracts/problemCode.contract";

import { parseLectureMeta } from "./lectureMeta";

const UNIT_CODE = new RegExp(UNIT_CODE_PATTERN);

/** 계약의 초안에서 차시 id 만 뺀 것 — 한계 검사는 계약 그대로 받는다. */
const plannedDraftSchema = conceptLectureDraftSchema.omit({ unitId: true });
export type PlannedDraft = Omit<ConceptLectureDraft, "unitId">;

export interface MetaSource {
  /** 사람이 읽는 출처(파일 경로·프로젝트 이름) — 계획 줄에 그대로 찍힌다 */
  source: string;
  /** 파일 내용. 못 읽었으면 null */
  raw: string | null;
}

/** 이미 등록된 강의 — 멱등 판정에 필요한 칸만 */
export interface ExistingLecture {
  id: string;
  title: string;
  status: ConceptLectureStatus;
  sourceJobId: string | null;
  videoUrl: string | null;
}

export interface RegisterPlanInput {
  sources: readonly MetaSource[];
  /** 차시 코드(`Unit.problemCodePrefix`) → 사람이 읽는 차시 이름 */
  units: ReadonlyMap<string, string>;
  existing: readonly ExistingLecture[];
  /** `--unit` — 대상이 하나일 때만 */
  unitOverride?: string | null;
  /** `--sort` — 대상이 하나일 때만 */
  sortOverride?: number | null;
}

export type PlanStep =
  | {
      kind: "create";
      source: string;
      unitCode: string;
      unitLabel: string;
      draft: PlannedDraft;
    }
  | { kind: "skip"; source: string; reason: string }
  | { kind: "fail"; source: string; reason: string };

export type RegisterPlan =
  { ok: true; steps: PlanStep[] } | { ok: false; message: string };

export function planRegistration(input: RegisterPlanInput): RegisterPlan {
  const { sources, units, existing } = input;
  const unitOverride = input.unitOverride ?? null;
  const sortOverride = input.sortOverride ?? null;

  if (sources.length === 0) {
    return { ok: false, message: "대상 meta.json이 없습니다." };
  }
  if ((unitOverride !== null || sortOverride !== null) && sources.length > 1) {
    return {
      ok: false,
      message:
        `--unit·--sort는 대상이 하나일 때만 쓸 수 있습니다(지금 ${sources.length}건). ` +
        "여러 편은 각 meta.json의 unitCode·sortOrder를 쓰세요.",
    };
  }
  if (unitOverride !== null && !UNIT_CODE.test(unitOverride)) {
    return {
      ok: false,
      message: `--unit이 차시 코드 형식이 아닙니다: ${unitOverride} (예: J30501)`,
    };
  }
  if (
    sortOverride !== null &&
    !(
      Number.isInteger(sortOverride) &&
      sortOverride >= 0 &&
      sortOverride <= CONCEPT_LECTURE_LIMITS.sortOrderMax
    )
  ) {
    return {
      ok: false,
      message: `--sort는 0~${CONCEPT_LECTURE_LIMITS.sortOrderMax} 사이 정수여야 합니다: ${sortOverride}`,
    };
  }

  /** 이 회차에서 이미 만들기로 한 잡 ID·주소 → 그 출처 */
  const plannedJobs = new Map<string, string>();
  const plannedUrls = new Map<string, string>();

  const steps = sources.map((s): PlanStep => {
    const fail = (reason: string): PlanStep => ({
      kind: "fail",
      source: s.source,
      reason,
    });
    const skip = (reason: string): PlanStep => ({
      kind: "skip",
      source: s.source,
      reason,
    });

    if (s.raw === null) return fail("meta.json을 읽을 수 없습니다.");
    const parsed = parseLectureMeta(s.raw);
    if (!parsed.ok) return fail(parsed.message);
    const meta = parsed.meta;

    const unitCode = unitOverride ?? meta.unitCode;
    if (!unitCode) {
      return fail(
        "차시를 알 수 없습니다 — meta.json에 unitCode를 넣거나 --unit=<차시 코드>를 주세요.",
      );
    }
    const unitLabel = units.get(unitCode);
    if (unitLabel === undefined)
      return fail(`차시 코드를 찾을 수 없습니다: ${unitCode}`);

    if (!meta.jobId && !meta.videoUrl) {
      return fail(
        "잡 ID도 영상 주소도 없습니다 — 두 번 돌리면 같은 강의가 두 벌 생깁니다. " +
          "제작 도구가 쓴 meta.json인지 확인하세요.",
      );
    }

    /* 멱등 — 이미 있는 것과 견준다. 잡 ID 가 먼저다(같은 잡 = 같은 강의, 다시 렌더해
     * 주소가 바뀌어도). 주소는 정규형끼리 견준다(`parseLectureMeta` 가 정규화했다). */
    const sameJob = meta.jobId
      ? existing.find((e) => e.sourceJobId === meta.jobId)
      : undefined;
    if (sameJob) {
      return skip(
        `이미 등록됨 (같은 잡 ID) — «${sameJob.title}» ${sameJob.status} ${sameJob.id}`,
      );
    }
    const sameUrl = meta.videoUrl
      ? existing.find((e) => e.videoUrl === meta.videoUrl)
      : undefined;
    if (sameUrl) {
      return skip(
        `이미 등록됨 (같은 영상 주소) — «${sameUrl.title}» ${sameUrl.status} ${sameUrl.id}`,
      );
    }
    /* 회차 안의 중복 — 머리말 «바뀐 것» 넷째. */
    const jobInBatch = meta.jobId ? plannedJobs.get(meta.jobId) : undefined;
    if (jobInBatch)
      return skip(`이 회차에 이미 있음 (같은 잡 ID) — ${jobInBatch}`);
    const urlInBatch = meta.videoUrl
      ? plannedUrls.get(meta.videoUrl)
      : undefined;
    if (urlInBatch)
      return skip(`이 회차에 이미 있음 (같은 영상 주소) — ${urlInBatch}`);

    const checked = plannedDraftSchema.safeParse({
      title: meta.title,
      videoUrl: meta.videoUrl,
      seconds: meta.seconds,
      disclosure: meta.disclosure,
      sourceJobId: meta.jobId,
      sortOrder: sortOverride ?? meta.sortOrder ?? 0,
    });
    if (!checked.success) {
      const issue = checked.error.issues[0];
      return fail(
        `입력 한계를 넘었습니다: ${issue?.path.join(".")} — ${issue?.message}`,
      );
    }

    if (meta.jobId) plannedJobs.set(meta.jobId, s.source);
    if (meta.videoUrl) plannedUrls.set(meta.videoUrl, s.source);
    return {
      kind: "create",
      source: s.source,
      unitCode,
      unitLabel,
      draft: checked.data,
    };
  });

  return { ok: true, steps };
}

export function summarizePlan(steps: readonly PlanStep[]): {
  create: number;
  skip: number;
  fail: number;
} {
  const out = { create: 0, skip: 0, fail: 0 };
  for (const s of steps) out[s.kind] += 1;
  return out;
}
