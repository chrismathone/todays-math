/**
 * «오늘의 개념» 학생 화면(05 §8.9 · 시안 `hifi-d124-todays-concept.html` 1안의 학생 네 장)의 데이터를
 * **실제 교육과정 735차시** 위에 얹은 픽스처. 개발용 시안 페이지(`/dev/learn-hifi`)와 화면 시험
 * (`LearnScreens.test.tsx`)이 같이 쓴다 — 캡처와 시험이 같은 데이터를 본다.
 *
 * - 목록은 **제품과 같은 셈 · 같은 조립**으로 짓는다: 진도 행 → `progressDatesOf`(수업한 날) →
 *   `lectureOpenToStudent`(열린 강의 — 초안·앞선 차시는 빠진다) → `assembleLearnList`(차례 · 학생 모양) →
 *   계약 검사(`learnLectureListResponseSchema`). 캡처가 제품과 다른 목록을 보일 수 없다.
 * - 🔴 2026-08-19 교훈 «시안은 가장 큰 실데이터로» — `stress` 는 가장 긴 차시 이름(시드 전량에서 고른다) ·
 *   가장 긴 강의 제목(계약 한계 200자) · 강의 많은 날(6편) · 지난 수업 20일치 · 긴 반 이름을 싣는다.
 * - 영상 주소는 가짜 ID(`hifiLect00N`) — 시안 페이지는 유튜브 대신 가짜 재생기를 쓴다.
 */
import {
  CONCEPT_LECTURE_LIMITS,
  type ConceptLectureStatus,
} from "@/contracts/conceptLecture.contract";
import {
  learnLectureListResponseSchema,
  learnLectureResponseSchema,
  type LearnLectureDetail,
  type LearnLectureList,
  type LearnStudent,
} from "@/contracts/studentAccount.contract";
import type { ViewRowLike } from "@/lib/concept/studentLecture";
import { assembleLearnList } from "@/lib/learn/learnList";
import {
  lectureOpenToStudent,
  progressDatesOf,
} from "@/lib/learn/lectureAccess";

import { CURRICULUM_UNITS } from "../../../../prisma/seed-data/units";

const uid = (head: string, n: number) =>
  `${head}-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** 교육과정 735차시 전량 — id 는 `/dev/concept-hifi` 픽스처와 같은 규칙 */
export const LEARN_HIFI_UNITS = [...CURRICULUM_UNITS]
  .sort((a, b) => a.orderIndex - b.orderIndex)
  .map((u) => ({
    id: uid("4f000000", u.orderIndex),
    grade: u.grade,
    chapter: u.chapter,
    section: u.section,
    orderIndex: u.orderIndex,
  }));
type HifiUnit = (typeof LEARN_HIFI_UNITS)[number];

function find(grade: string, section: string): HifiUnit {
  const u = LEARN_HIFI_UNITS.find(
    (x) => x.grade === grade && x.section === section,
  );
  if (!u) throw new Error(`[learn-hifi] 차시 없음: ${grade} ${section}`);
  return u;
}

/** 가장 긴 차시 이름 — 목록·재생이 여기서 깨지지 않아야 한다(브리프 §3 계측) */
export const LEARN_HIFI_LONGEST_UNIT = LEARN_HIFI_UNITS.reduce((a, b) =>
  b.section.length > a.section.length ? b : a,
);

/** 가장 긴 강의 제목 — 계약 한계(200자)를 꽉 채운다 */
export const LEARN_HIFI_LONGEST_TITLE = (
  "받아올림이 두 번, 세 번 있는 세 자리 수의 덧셈을 일의 자리부터 차례로 계산하고, 받아올린 수를 윗자리에 " +
  "작게 적어 두는 까닭을 수 모형과 자릿값 표로 확인하는 개념 강의 — 세로셈 · 어림셈 · 검산까지 한 번에 " +
  "정리합니다. 자릿값 · 받아올림 · 세로셈 · 어림셈 · 검산 · 자릿값 · 받아올림 · 세로셈 · 어림셈 · 검산"
).slice(0, CONCEPT_LECTURE_LIMITS.titleMax);

interface HifiLectureRow {
  id: string;
  unitId: string;
  title: string;
  videoUrl: string | null;
  seconds: number;
  sortOrder: number;
  status: ConceptLectureStatus;
}

interface Scenario {
  student: LearnStudent;
  studentId: string;
  classId: string;
  /** 반 진도(학생 칸 없음) — 그 차시를 수업한 날 */
  progress: { unit: HifiUnit; day: string }[];
  lectures: HifiLectureRow[];
  /** 강의 id → 본 % (없으면 아직 안 봄). 95% 이상이면 끝까지 본 것(`WATCH_COMPLETE_PERCENT`) */
  watched: Record<string, number>;
}

const yt = (n: number) =>
  `https://www.youtube.com/watch?v=hifiLect${String(n).padStart(3, "0")}`;

function lecture(
  n: number,
  unit: HifiUnit,
  title: string,
  seconds: number,
  patch: Partial<HifiLectureRow> = {},
): HifiLectureRow {
  return {
    id: uid("4c000000", n),
    unitId: unit.id,
    title,
    videoUrl: yt(n),
    seconds,
    sortOrder: 0,
    status: "published",
    ...patch,
  };
}

// ── 시안 그대로 — 김도윤 · 중1 A반 · 강의 7편(게시 5 · 초안 2) ─────────────
const u11 = find("중1", "소수와 거듭제곱");
const u12 = find("중1", "소인수분해");
const u13 = find("중1", "공약수와 최대공약수");
const u14 = find("중1", "공배수와 최소공배수");

/** 시안의 강의 이름표(l1…l7) → 픽스처 id */
export const LEARN_HIFI_LECTURE_IDS = {
  l1: uid("4c000000", 1),
  l2: uid("4c000000", 2),
  l3: uid("4c000000", 3),
  l4: uid("4c000000", 4),
  l5: uid("4c000000", 5),
  l6: uid("4c000000", 6),
  l7: uid("4c000000", 7),
} as const;

const MOCKUP: Scenario = {
  student: { name: "김도윤", className: "중1 A반" },
  studentId: uid("5a000000", 1),
  classId: uid("5b000000", 1),
  progress: [
    { unit: u11, day: "2026-09-10" },
    { unit: u12, day: "2026-09-12" },
    { unit: u13, day: "2026-09-15" },
  ],
  lectures: [
    lecture(1, u11, "소수와 합성수", 139),
    lecture(2, u11, "거듭제곱", 106, { sortOrder: 1 }),
    lecture(3, u12, "소인수분해", 135),
    lecture(4, u12, "약수를 빠짐없이 세는 법", 127, { sortOrder: 1 }),
    lecture(5, u13, "공약수와 최대공약수, 그리고 서로소", 122),
    // 초안 — 학생에게 안 보인다(D-124 ⑵)
    lecture(6, u13, "최대공약수 구하기", 104, {
      sortOrder: 1,
      status: "draft",
    }),
    // 진도보다 앞선 차시의 초안 — 안 보인다(D-125 ⑸)
    lecture(7, u14, "공배수와 최소공배수", 106, {
      status: "draft",
      videoUrl: null,
    }),
  ],
  watched: {
    [LEARN_HIFI_LECTURE_IDS.l1]: 100,
    [LEARN_HIFI_LECTURE_IDS.l2]: 100,
    [LEARN_HIFI_LECTURE_IDS.l3]: 100,
    [LEARN_HIFI_LECTURE_IDS.l4]: 64,
  },
};

// ── 가장 큰 실데이터 — 긴 이름 · 강의 많은 날 · 지난 수업 20일치 ───────────
function stressScenario(): Scenario {
  const grade = LEARN_HIFI_LONGEST_UNIT.grade;
  const same = LEARN_HIFI_UNITS.filter((u) => u.grade === grade);
  const at = same.findIndex((u) => u.id === LEARN_HIFI_LONGEST_UNIT.id);
  const todayUnits = [same[at]!, same[(at + 1) % same.length]!];
  const pastUnits = same.filter((u) => !todayUnits.includes(u)).slice(0, 20);
  const day = (back: number) =>
    new Date(Date.UTC(2026, 8, 15 - back)).toISOString().slice(0, 10);

  let n = 100;
  const lectures: HifiLectureRow[] = [];
  const watched: Record<string, number> = {};
  const titles = [
    LEARN_HIFI_LONGEST_TITLE,
    "받아올림이 세 번 있는 (세 자리 수)+(세 자리 수)를 세로셈으로 계산하기",
    "어림셈으로 답이 맞는지 먼저 가늠해 보기",
  ];
  todayUnits.forEach((unit, u) => {
    titles.forEach((title, k) => {
      n += 1;
      lectures.push(
        lecture(n, unit, u === 0 ? title : `${title} (이어서)`, 118 + k * 9, {
          sortOrder: k,
        }),
      );
      if (k === 1) watched[uid("4c000000", n)] = 42;
    });
  });
  pastUnits.forEach((unit, p) => {
    for (let k = 0; k < (p % 3 === 0 ? 2 : 1); k += 1) {
      n += 1;
      lectures.push(
        lecture(n, unit, `${unit.section} — 개념 ${k + 1}`, 96 + p * 3, {
          sortOrder: k,
        }),
      );
      watched[uid("4c000000", n)] = p % 2 === 0 ? 100 : 37;
    }
  });
  return {
    student: {
      name: "남궁서연",
      className: `${grade} 심화 주말 특별반 (토 · 일 오전 9시)`,
    },
    studentId: uid("5a000000", 2),
    classId: uid("5b000000", 2),
    progress: [
      ...todayUnits.map((unit) => ({ unit, day: day(0) })),
      ...pastUnits.map((unit, p) => ({ unit, day: day(p + 1) })),
    ],
    lectures,
    watched,
  };
}

export type LearnHifiSet = "mockup" | "stress" | "empty";

function scenarioOf(set: LearnHifiSet): Scenario {
  if (set === "stress") return stressScenario();
  if (set === "empty") return { ...MOCKUP, progress: [], watched: {} };
  return MOCKUP;
}

function viewRow(row: HifiLectureRow, percent: number): ViewRowLike {
  return {
    maxSeconds: Math.round((row.seconds * percent) / 100),
    percent,
    completedAt: percent >= 95 ? new Date("2026-09-12T11:00:00.000Z") : null,
  };
}

/** `GET /api/learn/lectures` 의 data — 제품과 같은 셈·같은 조립 */
export function learnHifiList(set: LearnHifiSet = "mockup"): LearnLectureList {
  const s = scenarioOf(set);
  const rows = s.progress.map((p) => ({
    classId: s.classId,
    studentId: null,
    unitId: p.unit.id,
    recordedAt: new Date(`${p.day}T00:00:00.000Z`),
  }));
  const taughtOn = progressDatesOf(rows, {
    id: s.studentId,
    classId: s.classId,
  });
  const openUnitIds = new Set(taughtOn.keys());
  const open = s.lectures.filter((l) => lectureOpenToStudent(l, openUnitIds));
  const unitIds = new Set(open.map((l) => l.unitId));
  const viewOf = new Map(
    open
      .filter((l) => s.watched[l.id] !== undefined)
      .map((l) => [l.id, viewRow(l, s.watched[l.id]!)] as const),
  );
  return learnLectureListResponseSchema.parse({
    data: assembleLearnList({
      head: s.student,
      taughtOn,
      open,
      units: LEARN_HIFI_UNITS.filter((u) => unitIds.has(u.id)),
      viewOf,
    }),
  }).data;
}

/** `GET /api/learn/lectures/{id}` 의 data — 목록에 없는(안 열린) 강의는 null(서버는 404) */
export function learnHifiDetail(
  id: string,
  set: LearnHifiSet = "mockup",
): LearnLectureDetail | null {
  const list = learnHifiList(set);
  const found = list.lectures.find((l) => l.id === id);
  if (!found) return null;
  const unit = list.units.find((u) => u.id === found.unitId)!;
  return learnLectureResponseSchema.parse({
    data: { student: list.student, unit, lecture: found },
  }).data;
}
