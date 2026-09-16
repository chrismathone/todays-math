/**
 * 원장님 «오늘의 개념» 첫 화면의 계산 — 반별 이번 주 차시 · 요약 · 끝까지 본 학생
 * (D-124 ⑴⑺ · D-125 ⑹ · 05 §8.9 시안 1안).
 *
 * DB 를 읽는 쪽은 `adminService.ts` 다. 여기는 읽어 온 행으로 표를 짓기만 한다 — 그래서
 * 규칙을 DB 없이 시험한다(`conceptAdminBoard.test.ts`).
 *
 * ## 새로 판정하지 않는 것 (브리프 §1.1 — 기존 함수를 부른다)
 *
 * - **최근 진도**는 부르는 쪽이 `/api/progress` 와 같은 판정(`getCurrentProgress`)으로 골라 넘긴다.
 * - **다음 차시**는 `nextOrderIndex` — 진도 «다음으로»(`/api/progress/advance`)와 같은 함수다.
 * - **학년 순서**는 교육과정 차례에서 `gradesOf` 로 뽑는다(수업 · 학생 관리의 단원 피커와 같은 함수).
 * - **끝까지 본 학생 n/m · 안 본 학생 · 반 인원**은 전부 `countWatchedToEnd` 에서 나온다.
 *   퇴원 학생을 빼는 판정이 그 함수 안에 있다 — 여기서 인원을 따로 세면(예: 반 목록 길이)
 *   m 과 반 인원이 갈라진다. 🔴 셋이 한 함수에서 나와야 한다(D-125 ⑹, 브리프 §1.3).
 */
import type {
  ConceptBoard,
  ConceptBoardRow,
  ConceptBoardSummary,
  ConceptLectureAdmin,
  ConceptLectureCounts,
} from "@/contracts/conceptAdmin.contract";
import type { ClassOwner } from "@/contracts/class.contract";
import type { ConceptLectureStatus } from "@/contracts/conceptLecture.contract";
import { mineRank } from "@/lib/class/classOwner";
import { nextOrderIndex } from "@/lib/progressResolver";
import { gradesOf } from "@/lib/units/groupUnits";

import { checkPublish } from "./publishGate";
import {
  countWatchedToEnd,
  type LectureViewLike,
  type RosterStudent,
} from "./watchSummary";

/** 저장 행 → 원장님 화면의 강의 한 편. Prisma 행을 그대로 넘겨도 된다 */
export interface AdminLectureRowLike {
  id: string;
  unitId: string;
  title: string;
  videoUrl: string | null;
  seconds: number;
  disclosure: string | null;
  sourceJobId: string | null;
  sortOrder: number;
  status: ConceptLectureStatus;
  reviewedAt: Date | null;
  publishedAt: Date | null;
}

/**
 * 게시 판정은 **서버가** `checkPublish` 로 내서 싣는다 — 화면은 그대로 그린다(막는 것 ✗ ·
 * 알리는 것 !). 칸을 하나씩 적는다: 행을 펼치면 잡 ID·만든 사람이 화면으로 샌다.
 */
export function toAdminLecture(row: AdminLectureRowLike): ConceptLectureAdmin {
  return {
    id: row.id,
    unitId: row.unitId,
    title: row.title,
    videoUrl: row.videoUrl,
    seconds: row.seconds,
    disclosure: row.disclosure,
    sortOrder: row.sortOrder,
    status: row.status,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    gate: checkPublish(row),
  };
}

export interface BoardClassInput {
  id: string;
  name: string;
  grade: string;
  /** 담당 — 관리자에게만 실려 온다(D-132). 있으면 행에 그대로 싣고 내 반을 맨 위로 올린다 */
  owner?: ClassOwner;
}

/** 반 학생 — **반 목록 순서**로 넘긴다(안 본 학생 이름이 이 순서로 나온다) */
export interface BoardStudentInput extends RosterStudent {
  name: string;
  classId: string;
}

/** 반 진도 최신 행 하나(반마다 한 행). 진도가 없는 반은 넘기지 않는다 — 그 반은 차시 칸이 빈다 */
export interface BoardProgressInput {
  classId: string;
  unitId: string;
  /** YYYY-MM-DD */
  recordedAt: string;
}

export interface BoardUnitInput {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  code: string;
  orderIndex: number;
}

export interface BoardLectureInput {
  id: string;
  unitId: string;
  status: ConceptLectureStatus;
  sortOrder: number;
}

export interface ConceptBoardInput {
  /** 원장님 소유 반 — 소유 판정은 부르는 쪽의 조회(`Class.userId`)가 한다 */
  classes: readonly BoardClassInput[];
  students: readonly BoardStudentInput[];
  latestProgress: readonly BoardProgressInput[];
  /** 교육과정 차시 — 다음 차시·학년 순서를 여기서 찾는다(전량을 넘긴다) */
  units: readonly BoardUnitInput[];
  lectures: readonly BoardLectureInput[];
  views: readonly LectureViewLike[];
}

export interface ConceptBoardCore {
  summary: ConceptBoardSummary;
  rows: ConceptBoardRow[];
  /** 표에 나오는 차시 — 최근 진도 · 다음 차시, 처음 나온 순서, 겹치면 하나 */
  touchedUnitIds: string[];
  /** 표에 쓴 시청 기록 행 수(반 학생 × 그 반 게시 강의) */
  watchRecords: number;
}

export function countLectures(
  lectures: readonly Pick<BoardLectureInput, "unitId" | "status">[],
  unitId: string,
): ConceptLectureCounts {
  const out = { published: 0, draft: 0, archived: 0 };
  for (const l of lectures) if (l.unitId === unitId) out[l.status] += 1;
  return out;
}

const byName = new Intl.Collator("ko", { numeric: true });

export function buildConceptBoard(input: ConceptBoardInput): ConceptBoardCore {
  const units = [...input.units].sort((a, b) => a.orderIndex - b.orderIndex);
  const unitByOrder = new Map(units.map((u) => [u.orderIndex, u]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const gradeRank = new Map(gradesOf(units).map((g, i) => [g, i]));
  const rank = (grade: string) =>
    gradeRank.get(grade) ?? Number.MAX_SAFE_INTEGER;

  // 내 반이 맨 위(D-132 ⑷) — 담당이 없으면(관리자 아님) 모두 같은 자리라 학년 · 이름 순서 그대로다.
  const classes = [...input.classes].sort(
    (a, b) =>
      mineRank(a.owner) - mineRank(b.owner) ||
      rank(a.grade) - rank(b.grade) ||
      byName.compare(a.name, b.name),
  );
  const latestByClass = new Map(
    input.latestProgress.map((p) => [p.classId, p]),
  );
  const nameById = new Map(input.students.map((s) => [s.id, s.name]));

  const touched: string[] = [];
  const touch = (unitId: string | null) => {
    if (unitId && !touched.includes(unitId)) touched.push(unitId);
  };
  let watchRecords = 0;

  const rows = classes.map((cls): ConceptBoardRow => {
    const roster = input.students.filter((s) => s.classId === cls.id);
    // 반 인원 — n/m 의 m 과 같은 함수에서(시청 기록 없이 부르면 분모만 나온다).
    const enrolled = countWatchedToEnd(roster, [], "").total;

    const latest = latestByClass.get(cls.id);
    const current = latest ? unitById.get(latest.unitId) : undefined;
    // 담당은 키째로 — 관리자가 아니면 응답에 `owner` 키가 아예 없다(계약 `classOwnerSchema`).
    const owner = cls.owner ? { owner: cls.owner } : {};
    if (!latest || !current) {
      return {
        classId: cls.id,
        className: cls.name,
        grade: cls.grade,
        ...owner,
        enrolled,
        progress: null,
        nextUnitId: null,
        watch: [],
      };
    }
    const next = unitByOrder.get(nextOrderIndex(current.orderIndex)) ?? null;
    touch(current.id);
    touch(next?.id ?? null);

    // 학생 목록에는 게시 강의만 간다(D-124 ⑵) — 초안·내림은 학생이 볼 수 없으니 세지 않는다.
    const published = input.lectures
      .map((lecture, index) => ({ lecture, index }))
      .filter(
        ({ lecture }) =>
          lecture.unitId === current.id && lecture.status === "published",
      )
      .sort(
        (a, b) =>
          a.lecture.sortOrder - b.lecture.sortOrder || a.index - b.index,
      )
      .map(({ lecture }) => lecture);

    const enrolledIds = new Set(
      roster.filter((s) => s.eywaWithdrawnAt == null).map((s) => s.id),
    );
    const watch = published.map((lecture) => {
      const counted = countWatchedToEnd(roster, input.views, lecture.id);
      watchRecords += input.views.filter(
        (v) => v.lectureId === lecture.id && enrolledIds.has(v.studentId),
      ).length;
      return {
        lectureId: lecture.id,
        watched: counted.watched,
        total: counted.total,
        // 이름은 반 목록에서 붙인다 — 목록(pending)은 `countWatchedToEnd` 가 낸 그대로다.
        pending: counted.pending.map((id) => ({
          id,
          name: nameById.get(id) ?? "",
        })),
      };
    });

    return {
      classId: cls.id,
      className: cls.name,
      grade: cls.grade,
      ...owner,
      enrolled,
      progress: { unitId: current.id, recordedAt: latest.recordedAt },
      nextUnitId: next?.id ?? null,
      watch,
    };
  });

  const summary: ConceptBoardSummary = {
    units: touched.length,
    classes: rows.length,
    published: 0,
    draftOnly: 0,
    none: 0,
  };
  for (const unitId of touched) {
    const c = countLectures(input.lectures, unitId);
    if (c.published > 0) summary.published += 1;
    else if (c.draft > 0) summary.draftOnly += 1;
    else summary.none += 1;
  }

  return { summary, rows, touchedUnitIds: touched, watchRecords };
}

/** 첫 화면 한 벌을 짓는 입력 — 강의는 저장 행 그대로(표 밖 차시의 강의가 섞여 와도 된다) */
export interface AssembleBoardInput extends Omit<
  ConceptBoardInput,
  "lectures"
> {
  /** 학원 날짜(KST, YYYY-MM-DD) */
  today: string;
  canEdit: boolean;
  lectures: readonly AdminLectureRowLike[];
}

/**
 * 첫 화면 응답 한 벌 — 서비스(DB 행)와 개발용 시안 페이지(실데이터 픽스처)가 **같은 조립**을
 * 탄다. 캡처가 제품과 다른 숫자를 보이지 않게 조립을 한 곳에 둔다.
 * 표에 나오는 차시(최근 진도 · 다음 차시)의 강의만 싣는다.
 */
export function assembleConceptBoard(input: AssembleBoardInput): ConceptBoard {
  const core = buildConceptBoard(input);
  const touched = new Set(core.touchedUnitIds);
  const lectures = input.lectures.filter((l) => touched.has(l.unitId));
  const unitById = new Map(input.units.map((u) => [u.id, u]));
  return {
    today: input.today,
    canEdit: input.canEdit,
    unitTotal: input.units.length,
    summary: core.summary,
    rows: core.rows,
    units: core.touchedUnitIds.map((id) => {
      const u = unitById.get(id)!;
      return {
        id: u.id,
        grade: u.grade,
        chapter: u.chapter,
        section: u.section,
        code: u.code,
        orderIndex: u.orderIndex,
        lectures: countLectures(lectures, id),
      };
    }),
    lectures: lectures.map(toAdminLecture),
    watchRecords: core.watchRecords,
  };
}
