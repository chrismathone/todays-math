/**
 * «오늘의 개념» 시안 1안(05 §8.9 · `docs/design/mockups/hifi-d124-todays-concept.html`)의 데이터를
 * **실제 교육과정 735차시** 위에 얹은 픽스처. 개발용 시안 페이지(`/dev/concept-hifi`)와 화면
 * 시험(`ConceptView.test.tsx`)이 같이 쓴다 — 캡처와 시험이 같은 데이터를 본다.
 *
 * - 🔴 **차시는 픽스처가 아니다** — 시드 전량(`prisma/seed-data/units.ts`)이다. 2026-08-19 교훈
 *   «시안은 가장 큰 실데이터로»: 가장 긴 차시 이름(41자, 초3)이 초3 A반의 최근 진도로 들어온다.
 * - 반 12 · 반 인원 · 강의 7편 · 끝까지 본 학생 수는 시안과 같다. 학생 이름은 예시다.
 *   `stress` 를 켜면 반을 스물다섯으로 늘린다(가장 긴 반 이름 · 진도 없는 반 · 마지막 차시 반).
 * - 표·요약·n/m 은 **제품과 같은 조립**(`assembleConceptBoard`)으로 짓는다.
 * - 영상 주소는 가짜 ID(`hifiLect00N`)다 — 캡처는 임베드를 끄고 찍는다.
 */
import type { ClassOwner } from "@/contracts/class.contract";
import type {
  ConceptBoard,
  ConceptUnitLectures,
  ConceptUnits,
} from "@/contracts/conceptAdmin.contract";
import {
  assembleConceptBoard,
  countLectures,
  toAdminLecture,
  type AdminLectureRowLike,
  type BoardClassInput,
  type BoardProgressInput,
  type BoardStudentInput,
  type BoardUnitInput,
} from "@/lib/concept/adminBoard";
import type { LectureViewLike } from "@/lib/concept/watchSummary";
import { buildUnitCodePrefixes } from "@/lib/problemCode";

import { CURRICULUM_UNITS } from "../../../../prisma/seed-data/units";

const uid = (head: string, n: number) =>
  `${head}-0000-4000-8000-${String(n).padStart(12, "0")}`;

const PREFIX = new Map(
  buildUnitCodePrefixes(CURRICULUM_UNITS).map((u) => [u.orderIndex, u.prefix]),
);

/** 교육과정 735차시 전량 — 차시 코드는 제품과 같은 규칙(`buildUnitCodePrefixes`)으로 */
export const HIFI_UNITS: BoardUnitInput[] = [...CURRICULUM_UNITS]
  .sort((a, b) => a.orderIndex - b.orderIndex)
  .map((u) => ({
    id: uid("4f000000", u.orderIndex),
    grade: u.grade,
    chapter: u.chapter,
    section: u.section,
    code: PREFIX.get(u.orderIndex)!,
    orderIndex: u.orderIndex,
  }));

const byGrade = (grade: string) => HIFI_UNITS.filter((u) => u.grade === grade);
function find(grade: string, section: string): BoardUnitInput {
  const u = byGrade(grade).find((x) => x.section === section);
  if (!u) throw new Error(`[concept-hifi] 차시 없음: ${grade} ${section}`);
  return u;
}

/** 가장 긴 차시 이름 — 표가 여기서 깨지지 않아야 한다(브리프 §3 ④) */
export const HIFI_LONGEST_UNIT = HIFI_UNITS.reduce((a, b) =>
  b.section.length > a.section.length ? b : a,
);

// ── 강의 7편 — 시안과 같다 ─────────────────────────────────────
const u11 = find("중1", "소수와 거듭제곱");
const u12 = find("중1", "소인수분해");
const u13 = find("중1", "공약수와 최대공약수");
const u14 = find("중1", "공배수와 최소공배수");
export const HIFI_DISCLOSURE = "선생님이 검수한 AI 보충 강의입니다.";
const yt = (n: number) => `https://www.youtube.com/watch?v=hifiLect00${n}`;
const on = (day: string) => new Date(`${day}T01:00:00.000Z`);

function lecture(
  n: number,
  unit: BoardUnitInput,
  title: string,
  seconds: number,
  patch: Partial<AdminLectureRowLike>,
): AdminLectureRowLike {
  return {
    id: uid("5f000000", n),
    unitId: unit.id,
    title,
    videoUrl: yt(n),
    seconds,
    disclosure: HIFI_DISCLOSURE,
    sourceJobId: `hifi-job-${n}`,
    sortOrder: 0,
    status: "published",
    reviewedAt: null,
    publishedAt: null,
    ...patch,
  };
}

export const HIFI_LECTURES: AdminLectureRowLike[] = [
  lecture(1, u11, "소수와 합성수", 139, {
    reviewedAt: on("2026-09-08"),
    publishedAt: on("2026-09-08"),
  }),
  lecture(2, u11, "거듭제곱", 106, {
    sortOrder: 1,
    reviewedAt: on("2026-09-08"),
    publishedAt: on("2026-09-08"),
  }),
  lecture(3, u12, "소인수분해", 135, {
    reviewedAt: on("2026-09-10"),
    publishedAt: on("2026-09-10"),
  }),
  lecture(4, u12, "약수를 빠짐없이 세는 법", 127, {
    sortOrder: 1,
    reviewedAt: on("2026-09-10"),
    publishedAt: on("2026-09-10"),
  }),
  lecture(5, u13, "공약수와 최대공약수, 그리고 서로소", 122, {
    reviewedAt: on("2026-09-12"),
    publishedAt: on("2026-09-12"),
  }),
  lecture(6, u13, "최대공약수 구하기", 104, { sortOrder: 1, status: "draft" }),
  lecture(7, u14, "공배수와 최소공배수", 106, {
    status: "draft",
    videoUrl: null,
  }),
];

// ── 반 — 시안의 12 (+ stress) ───────────────────────────────────
interface ClassSpec {
  name: string;
  grade: string;
  /** 퇴원을 뺀 인원 */
  students: number;
  /** 그 학년 차시 목록에서 최근 진도의 자리 — null 이면 진도 없음, 넘치면 마지막 차시 */
  at: number | null;
  day: string;
  /** 반에 남아 있는 퇴원 학생 수(분모에서 빠져야 한다) */
  withdrawn?: number;
}

const LONG_AT = byGrade(HIFI_LONGEST_UNIT.grade).indexOf(HIFI_LONGEST_UNIT);

const MOCKUP_CLASSES: ClassSpec[] = [
  {
    name: `${HIFI_LONGEST_UNIT.grade} A반`,
    grade: HIFI_LONGEST_UNIT.grade,
    students: 14,
    at: LONG_AT,
    day: "2026-09-15",
  },
  { name: "초6 A반", grade: "초6", students: 9, at: 18, day: "2026-09-15" },
  {
    name: "중1 A반",
    grade: "중1",
    students: 12,
    at: 2,
    day: "2026-09-15",
    withdrawn: 1,
  },
  { name: "중1 B반", grade: "중1", students: 10, at: 1, day: "2026-09-12" },
  { name: "중2 A반", grade: "중2", students: 13, at: 6, day: "2026-09-15" },
  { name: "중2 B반", grade: "중2", students: 8, at: 9, day: "2026-09-13" },
  { name: "중2 C반", grade: "중2", students: 11, at: 25, day: "2026-09-12" },
  { name: "중3 A반", grade: "중3", students: 6, at: 4, day: "2026-09-15" },
  {
    name: "공통수학1 A반",
    grade: "공통수학1",
    students: 12,
    at: 10,
    day: "2026-09-15",
  },
  {
    name: "공통수학1 B반",
    grade: "공통수학1",
    students: 7,
    at: 22,
    day: "2026-09-13",
  },
  { name: "대수 A반", grade: "대수", students: 5, at: 6, day: "2026-09-12" },
  {
    name: "미적분1 A반",
    grade: "미적분1",
    students: 4,
    at: 3,
    day: "2026-09-15",
  },
];

const STRESS_CLASSES: ClassSpec[] = [
  {
    name: "공통수학1 심화 주말 특별반 (토 · 일 오전 9시)",
    grade: "공통수학1",
    students: 24,
    at: 41,
    day: "2026-09-14",
  },
  { name: "초1 A반", grade: "초1", students: 8, at: 3, day: "2026-09-15" },
  { name: "초2 A반", grade: "초2", students: 9, at: 40, day: "2026-09-15" },
  {
    name: `${HIFI_LONGEST_UNIT.grade} B반`,
    grade: HIFI_LONGEST_UNIT.grade,
    students: 11,
    at: LONG_AT - 1,
    day: "2026-09-13",
  },
  { name: "초4 A반", grade: "초4", students: 10, at: 20, day: "2026-09-12" },
  { name: "초5 A반", grade: "초5", students: 12, at: 33, day: "2026-09-15" },
  { name: "중1 C반", grade: "중1", students: 9, at: 3, day: "2026-09-15" },
  { name: "중3 B반", grade: "중3", students: 7, at: 99, day: "2026-09-11" },
  {
    name: "공통수학2 A반",
    grade: "공통수학2",
    students: 10,
    at: 12,
    day: "2026-09-15",
  },
  {
    name: "확률과 통계 A반",
    grade: "확률과 통계",
    students: 6,
    at: 8,
    day: "2026-09-13",
  },
  { name: "기하 A반", grade: "기하", students: 3, at: 5, day: "2026-09-12" },
  {
    name: "미적분2 A반",
    grade: "미적분2",
    students: 5,
    at: 99,
    day: "2026-09-10",
  },
  {
    name: "진도 없는 반",
    grade: "중2",
    students: 6,
    at: null,
    day: "2026-09-15",
  },
];

const NAMES = [
  "김도윤",
  "이서준",
  "박지호",
  "최수아",
  "정하윤",
  "한지우",
  "윤서연",
  "장민준",
  "임예린",
  "강하준",
  "조서윤",
  "오지안",
  "신유나",
  "권도현",
  "황지유",
  "송은우",
  "안채원",
  "류시우",
  "배수빈",
  "전하린",
  "홍지민",
  "문가온",
  "서다은",
  "노윤재",
  "고은서",
];

/** 끝까지 본 학생 — 반 이름 · 강의 번호 · 끝까지 본 수(앞에서부터) · 보다 만 수 */
const WATCHED: {
  className: string;
  lecture: number;
  done: number;
  partial?: number;
}[] = [
  { className: "중1 A반", lecture: 5, done: 7, partial: 2 },
  { className: "중1 B반", lecture: 3, done: 6 },
  { className: "중1 B반", lecture: 4, done: 5, partial: 1 },
];

export interface HifiOptions {
  canEdit?: boolean;
  stress?: boolean;
  /**
   * 반 차례(시안 순서)마다 담당 — 관리자 화면의 «누구의 반»(D-132) 캡처·시험용. 비면 담당 없음
   * (관리자 아님). 조립(`assembleConceptBoard`)이 제품과 같이 내 반을 맨 위로 올린다.
   */
  owners?: readonly (ClassOwner | undefined)[];
  /** false 면 시청 기록이 하나도 없다(학생 로그인 전 — 빈 상태 문구) */
  views?: boolean;
  today?: string;
}

export function hifiBoard(options: HifiOptions = {}): ConceptBoard {
  const specs = options.stress
    ? [...MOCKUP_CLASSES, ...STRESS_CLASSES]
    : MOCKUP_CLASSES;
  const classes: BoardClassInput[] = [];
  const students: BoardStudentInput[] = [];
  const latestProgress: BoardProgressInput[] = [];

  specs.forEach((spec, ci) => {
    const classId = uid("2f000000", ci + 1);
    const owner = options.owners?.[ci];
    classes.push({
      id: classId,
      name: spec.name,
      grade: spec.grade,
      ...(owner ? { owner } : {}),
    });
    const total = spec.students + (spec.withdrawn ?? 0);
    for (let i = 0; i < total; i += 1)
      students.push({
        id: uid("3f000000", (ci + 1) * 100 + i),
        name: NAMES[(ci * 3 + i) % NAMES.length]!,
        classId,
        eywaWithdrawnAt: i >= spec.students ? "2026-09-01T00:00:00.000Z" : null,
      });
    if (spec.at !== null) {
      const list = byGrade(spec.grade);
      const unit = list[Math.min(spec.at, list.length - 1)]!;
      latestProgress.push({ classId, unitId: unit.id, recordedAt: spec.day });
    }
  });

  const views: LectureViewLike[] = [];
  if (options.views !== false) {
    for (const w of WATCHED) {
      const cls = classes.find((c) => c.name === w.className)!;
      const roster = students.filter(
        (s) => s.classId === cls.id && s.eywaWithdrawnAt === null,
      );
      const lectureId = uid("5f000000", w.lecture);
      roster.slice(0, w.done).forEach((s) =>
        views.push({
          studentId: s.id,
          lectureId,
          completedAt: "2026-09-15T05:00:00.000Z",
        }),
      );
      roster
        .slice(w.done, w.done + (w.partial ?? 0))
        .forEach((s) =>
          views.push({ studentId: s.id, lectureId, completedAt: null }),
        );
    }
  }

  return assembleConceptBoard({
    today: options.today ?? "2026-09-15",
    canEdit: options.canEdit ?? true,
    classes,
    students,
    latestProgress,
    units: HIFI_UNITS,
    lectures: HIFI_LECTURES,
    views,
  });
}

export function hifiUnits(canEdit = true): ConceptUnits {
  return {
    canEdit,
    units: HIFI_UNITS.map((u) => ({
      ...u,
      lectures: countLectures(HIFI_LECTURES, u.id),
    })),
  };
}

export function hifiUnitLectures(unitId: string): ConceptUnitLectures | null {
  const unit = HIFI_UNITS.find((u) => u.id === unitId);
  if (!unit) return null;
  const lectures = HIFI_LECTURES.filter((l) => l.unitId === unitId).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  return {
    unit: { ...unit, lectures: countLectures(lectures, unitId) },
    lectures: lectures.map(toAdminLecture),
  };
}
