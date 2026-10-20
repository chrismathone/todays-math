import {
  accessibleClassesWhere,
  loadOperationalRosterSummary,
} from "@/lib/classAccess";
/**
 * 오늘의 개념 — 원장님 메뉴의 **DB 쪽** (브리프 §1.4). 라우트는 권한만 보고 여기를 부른다.
 *
 * - 읽기는 **원장님 소유 반만**(`Class.userId`). 학생·진도·시청 기록은 그 반 id 로만 좁혀 묻는다 —
 *   남의 반 학생의 시청 기록은 읽지도 않는다.
 * - 강의 목록은 **서비스 공용**(D-124 ⑼) — 소유 칸이 없고 누구나 같은 목록을 본다. 쓰기의 권한
 *   (`isAdmin`)은 라우트가 `authorizeAccount(request, true)` 로 막는다.
 * - 계산은 `adminBoard.ts`(순수), 게시 판정은 `publishGate.ts`, 전이는 `lectureTransition.ts`,
 *   meta.json 해석과 멱등은 `lectureMeta.ts` · `registerPlan.ts`(등록 CLI 와 같은 길)를 부른다.
 *   🔴 여기서 규칙을 새로 적지 않는다 — 한쪽만 고쳐진 날 화면과 CLI 가 갈라진다.
 *
 * ⚠️ **공유 DB 에 시험용 강의를 넣지 말 것**(브리프 §1.4) — 원장님 화면에 그대로 보인다.
 */
import type { ErrorCode } from "@/contracts/common.contract";
import type {
  ConceptBoard,
  ConceptLectureAdmin,
  ConceptLectureCounts,
  ConceptUnit,
  ConceptUnitLectures,
  ConceptUnits,
} from "@/contracts/conceptAdmin.contract";
import {
  CLASS_OWNER_NAME,
  showsClassOwner,
  toClassOwner,
} from "@/lib/class/classOwner";
import { db } from "@/lib/db";
import { kstDateOf } from "@/lib/kstDate";
import { type ScopeViewer } from "@/lib/ownerScope";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import { loadLatestClassProgress } from "./latestClassProgress";

import {
  assembleConceptBoard,
  buildConceptBoard,
  toAdminLecture,
  type BoardClassInput,
  type BoardUnitInput,
} from "./adminBoard";
import { parseLectureMeta } from "./lectureMeta";
import {
  planLectureChange,
  type LectureActionInput,
} from "./lectureTransition";
import { planRegistration } from "./registerPlan";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: ErrorCode;
      message: string;
      details?: unknown;
    };

const fail = (
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): ServiceResult<never> => ({ ok: false, status, code, message, details });

const LECTURE_ORDER = [
  { sortOrder: "asc" as const },
  { createdAt: "asc" as const },
  { id: "asc" as const },
];
const UNIT_SELECT = {
  id: true,
  grade: true,
  chapter: true,
  section: true,
  orderIndex: true,
  problemCodePrefix: true,
} as const;

type UnitRow = {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
  problemCodePrefix: string;
};

const toBoardUnit = (u: UnitRow): BoardUnitInput => ({
  id: u.id,
  grade: u.grade,
  chapter: u.chapter,
  section: u.section,
  code: u.problemCodePrefix,
  orderIndex: u.orderIndex,
});

const EMPTY_COUNTS: ConceptLectureCounts = {
  published: 0,
  draft: 0,
  archived: 0,
};

function countsByUnit(
  lectures: readonly { unitId: string; status: keyof ConceptLectureCounts }[],
): Map<string, ConceptLectureCounts> {
  const out = new Map<string, ConceptLectureCounts>();
  for (const l of lectures) {
    const c = out.get(l.unitId) ?? { ...EMPTY_COUNTS };
    c[l.status] += 1;
    out.set(l.unitId, c);
  }
  return out;
}

const toUnit = (
  u: UnitRow,
  counts: ConceptLectureCounts | undefined,
): ConceptUnit => ({
  ...toBoardUnit(u),
  lectures: counts ?? { ...EMPTY_COUNTS },
});

// ─────────────────────────────────────────────
// 읽기
// ─────────────────────────────────────────────

/**
 * 판에 오를 반 — 소유 범위(D-130) 안의 반. 관리자면 같은 조회에 담당을 조인한다(D-132 — 한 번에,
 * 반마다 계정을 따로 읽지 않는다). 관리자가 아니면 조회도 응답도 넓히기 전과 같다.
 */
async function loadBoardClasses(
  viewer: ScopeViewer,
): Promise<BoardClassInput[]> {
  const where = await accessibleClassesWhere(viewer);
  if (!showsClassOwner(viewer))
    return db.class.findMany({
      where,
      select: { id: true, name: true, grade: true },
    });
  const rows = await db.class.findMany({
    where,
    select: {
      id: true,
      name: true,
      grade: true,
      userId: true,
      ...CLASS_OWNER_NAME,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    grade: row.grade,
    owner: toClassOwner(viewer, row),
  }));
}

/**
 * 첫 화면 — 소유 범위 안의 반마다 최근 진도 · 다음 차시 · 그 강의 · 끝까지 본 학생.
 * 소유 범위(D-130 — 관리자는 모든 반): `ownerScope.ts`. `canEdit` 는 쓰기 표시일 뿐 범위를 안 정한다.
 */
export async function loadConceptBoard(
  viewer: ScopeViewer,
  canEdit: boolean,
  now: Date,
): Promise<ConceptBoard> {
  const [classes, units] = await Promise.all([
    loadBoardClasses(viewer),
    db.unit.findMany({ select: UNIT_SELECT, orderBy: { orderIndex: "asc" } }),
  ]);
  const classIds = classes.map((c) => c.id);

  const [students, latestProgress] = await Promise.all([
    loadOperationalRosterSummary(classes, true),
    loadLatestClassProgress(classIds),
  ]);

  // 반 목록 순서 = 학생 화면(`GET /api/students`)과 같은 등록순.
  const roster = [...students].sort(
    (a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
  );
  const boardUnits = units.map(toBoardUnit);
  const base = {
    classes,
    students: roster,
    latestProgress,
    units: boardUnits,
  };

  // 표에 나오는 차시를 먼저 정하고(강의 없이 한 번), 그 차시의 강의만 읽는다.
  const shape = buildConceptBoard({ ...base, lectures: [], views: [] });
  const lectures =
    shape.touchedUnitIds.length === 0
      ? []
      : await db.conceptLecture.findMany({
          where: { unitId: { in: shape.touchedUnitIds } },
          orderBy: LECTURE_ORDER,
        });

  // 시청 기록은 **내 반 학생 × 최근 진도 차시의 게시 강의**만 읽는다.
  const currentUnits = new Set(
    shape.rows.flatMap((r) => (r.progress ? [r.progress.unitId] : [])),
  );
  const watchedLectureIds = lectures
    .filter((l) => l.status === "published" && currentUnits.has(l.unitId))
    .map((l) => l.id);
  const views =
    watchedLectureIds.length === 0 || roster.length === 0
      ? []
      : await db.conceptLectureView.findMany({
          where: {
            lectureId: { in: watchedLectureIds },
            studentId: { in: roster.map((s) => s.id) },
          },
          select: { studentId: true, lectureId: true, completedAt: true },
        });

  return assembleConceptBoard({
    ...base,
    // 「오늘」은 학원 시간(KST) — daily-review · 학생 목록과 같은 셈(`kstDate.ts` 한 곳)
    today: kstDateOf(now),
    canEdit,
    lectures,
    views,
  });
}

/** 전체 차시 — 교육과정 차례로 전부, 차시마다 강의 수 */
export async function loadConceptUnits(
  canEdit: boolean,
): Promise<ConceptUnits> {
  const [units, lectures] = await Promise.all([
    db.unit.findMany({ select: UNIT_SELECT, orderBy: { orderIndex: "asc" } }),
    db.conceptLecture.findMany({ select: { unitId: true, status: true } }),
  ]);
  const counts = countsByUnit(lectures);
  return { canEdit, units: units.map((u) => toUnit(u, counts.get(u.id))) };
}

/** 한 차시 — 오른쪽 차시 판 */
export async function loadUnitLectures(
  unitId: string,
): Promise<ServiceResult<ConceptUnitLectures>> {
  const unit = await db.unit.findUnique({ where: { id: unitId } });
  if (!unit) return fail(404, "NOT_FOUND", "차시를 찾을 수 없습니다.");
  const lectures = await db.conceptLecture.findMany({
    where: { unitId },
    orderBy: LECTURE_ORDER,
  });
  return {
    ok: true,
    data: {
      unit: toUnit(unit, countsByUnit(lectures).get(unit.id)),
      lectures: lectures.map(toAdminLecture),
    },
  };
}

// ─────────────────────────────────────────────
// 쓰기 (라우트가 `isAdmin` 을 먼저 막는다)
// ─────────────────────────────────────────────

/**
 * meta.json 붙여넣기 → 초안. 차시는 meta 의 `unitCode` → 없으면 `unitId`(지금 고른 차시).
 * 해석 실패는 해석기가 낸 «왜»를 그대로 돌려준다(브리프 §1.2).
 */
export async function registerLectureFromMeta(input: {
  raw: string;
  unitId: string | null;
  actorId: string;
}): Promise<ServiceResult<ConceptLectureAdmin>> {
  const parsed = parseLectureMeta(input.raw);
  if (!parsed.ok) return fail(422, "VALIDATION_ERROR", parsed.message);
  const { meta } = parsed;

  // 등록 계획기의 «차시를 알 수 없습니다» 문구는 CLI 용(`--unit`)이라 화면 문구를 따로 둔다.
  if (!meta.unitCode && !input.unitId)
    return fail(
      422,
      "VALIDATION_ERROR",
      "차시를 알 수 없습니다. meta.json 에 unitCode 가 없으면 차시를 먼저 고르세요.",
    );

  const unit = meta.unitCode
    ? await db.unit.findFirst({ where: { problemCodePrefix: meta.unitCode } })
    : await db.unit.findUnique({ where: { id: input.unitId! } });
  if (!unit && !meta.unitCode)
    return fail(422, "VALIDATION_ERROR", "고른 차시를 찾을 수 없습니다.");

  const idempotencyKeys = [
    ...(meta.jobId ? [{ sourceJobId: meta.jobId }] : []),
    ...(meta.videoUrl ? [{ videoUrl: meta.videoUrl }] : []),
  ];
  const existing =
    idempotencyKeys.length === 0
      ? []
      : await db.conceptLecture.findMany({
          where: { OR: idempotencyKeys },
          select: {
            id: true,
            title: true,
            status: true,
            sourceJobId: true,
            videoUrl: true,
          },
        });

  // 판단은 등록 CLI 와 같은 계획기가 한다 — 한계 · 멱등(같은 잡 · 같은 주소) · 지어내지 않기.
  const plan = planRegistration({
    sources: [{ source: "붙여넣은 meta.json", raw: input.raw }],
    units: new Map(
      unit
        ? [
            [
              unit.problemCodePrefix,
              `${unit.grade} · ${unit.chapter} · ${unit.section}`,
            ],
          ]
        : [],
    ),
    existing,
    unitOverride: meta.unitCode ? null : (unit?.problemCodePrefix ?? null),
  });
  if (!plan.ok) return fail(422, "VALIDATION_ERROR", plan.message);
  const step = plan.steps[0]!;
  if (step.kind === "fail") return fail(422, "VALIDATION_ERROR", step.reason);
  if (step.kind === "skip") return fail(409, "CONFLICT", step.reason);

  try {
    const row = await db.conceptLecture.create({
      data: { unitId: unit!.id, ...step.draft, createdById: input.actorId },
    });
    return { ok: true, data: toAdminLecture(row) };
  } catch (error) {
    // 같은 잡 ID 를 두 창에서 동시에 넣으면 unique 가 막는다 — 계획기가 못 본 경주다.
    if (isPrismaErrorCode(error, "P2002"))
      return fail(
        409,
        "CONFLICT",
        "이미 등록됨 (같은 잡 ID) — 방금 다른 곳에서 등록했습니다.",
      );
    throw error;
  }
}

/** 게시 · 게시 내리기 · 다시 게시 · 끝까지 봤다 · 주소 넣기 — 규칙은 `planLectureChange` 한 곳 */
export async function applyLectureAction(
  id: string,
  input: LectureActionInput,
  now: Date,
): Promise<ServiceResult<ConceptLectureAdmin>> {
  const row = await db.conceptLecture.findUnique({ where: { id } });
  if (!row) return fail(404, "NOT_FOUND", "강의를 찾을 수 없습니다.");

  const plan = planLectureChange(row, input, now);
  if (!plan.ok) {
    const conflict =
      plan.code === "not_allowed" || plan.code === "already_reviewed";
    return fail(
      conflict ? 409 : 422,
      conflict ? "CONFLICT" : "VALIDATION_ERROR",
      plan.message,
      plan.blockers ? { blockers: plan.blockers } : undefined,
    );
  }

  if (Object.keys(plan.patch).length > 0) {
    // 읽은 뒤에 다른 창이 상태나 주소를 바꿨으면 쓰지 않는다 — 판정은 **읽은 행**에 대한 것이다.
    const { count } = await db.conceptLecture.updateMany({
      where: { id, status: row.status, videoUrl: row.videoUrl },
      data: plan.patch,
    });
    if (count === 0)
      return fail(
        409,
        "CONFLICT",
        "다른 곳에서 먼저 바뀌었습니다. 다시 불러온 뒤 하세요.",
      );
  }
  const updated = await db.conceptLecture.findUnique({ where: { id } });
  if (!updated) return fail(404, "NOT_FOUND", "강의를 찾을 수 없습니다.");
  return { ok: true, data: toAdminLecture(updated) };
}
