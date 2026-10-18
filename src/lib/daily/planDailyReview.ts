/**
 * 오늘의 학생별 확인테스트 — **순수 계획 로직** (2단계 화면, D-63·D-64 · 매일 자동 출제 D-129).
 *
 * 「오늘 수업하는 학생」을 세 무리로 가른다:
 *   · groups      — 기본 범위가 나온 학생을 같은 범위끼리 묶은 것(한 묶음 = 시험지 한 종)
 *   · examOrUnread — 보고서는 있는데 오늘 진도 행이 없는 학생(시험기간·미분류).
 *                    원장님 확정(D-64): 표시만 하고 자동 출제에서 뺀다.
 *   · noRange     — 진도 행은 있는데 범위를 못 낸 학생(단원 목록 밖 등). 조용히
 *                    버리지 않는다 — 화면이 세어 보여 준다.
 *
 * ## 「오늘 수업하는 학생」을 무엇으로 재나 (D-129 ⑷⑸ — 2026-09-16 에 넓혔다)
 *
 * 축이 **둘**이고 합집합이다:
 *   ⑴ **진도 계획**(`plans`) 이 그날을 수업일로 적었나 — 손으로 등록한 학생·고등이 이 길로
 *      들어온다(eywa 차시 체계에 고등이 아예 없다). 계획이 있으면 보고서를 기다리지 않는다.
 *   ⑵ eywa 보고서 날짜(`lastReportDate`) — 계획이 없는 학생의 기존 축. 그대로 둔다.
 *      계획이 아직 없는 반이 이 화면에서 갑자기 사라지면 원장님의 오늘 일이 멈춘다.
 *
 * 🔴 **실제가 이긴다**(D-129 ⑵) — 진도 기록이 있으면 그 차시가 범위 끝이고, 계획은 그
 *    지점부터 다시 편다. 규칙은 `src/lib/daily/progressPlan.ts` 한 곳이다.
 *
 * 🔴 **D-64 가 계획보다 앞선다** — 보고서가 오늘인데 진도 행이 없으면(「내신대비」) 계획이
 *    수업일이라 해도 `examOrUnread` 다. 보고서는 「그날 무엇을 했나」의 실측이고 계획은
 *    예정이다 — 실측이 「진도를 안 나갔다」고 말하면 그것이 이긴다.
 *
 * 범위는 제품 함수 그대로 쓴다: `applicableProgress`/`getCurrentProgress` →
 * `resolveDefaultReviewRange`(D-63 첫 회 대단원 제한 포함) → `resolveRange`(소단원 목록 —
 * 출제와 같은 함수). 문항 풀 세기는 DB 가 필요하므로 여기 없다 — 부르는 쪽이 묶음마다 센다.
 */
import {
  resolveDefaultReviewRange,
  type ChapterAwareUnit,
} from "@/lib/generator/defaultReviewRange";
import { resolveRange } from "@/lib/generator/resolveRange";
import {
  pickProgressPlan,
  resolveDailyPlan,
  type ProgressPlanRule,
} from "@/lib/daily/progressPlan";
import type { ClassOwner } from "@/contracts/class.contract";
import {
  applicableProgress,
  findLatestProgress,
  type ProgressRecordLike,
} from "@/lib/progressResolver";

export interface DailyStudent {
  id: string;
  name: string;
  classId: string;
  className: string;
  classGrade: string;
  defaultProblemCount: number;
  schoolLevel: string | null;
  schoolGrade: number | null;
  /** 반 진도 대신 개별 진도(와 개별 **계획**)를 쓰나 — `Student.useIndividualProgress`. */
  useIndividualProgress: boolean;
  /** YYYY-MM-DD — 마지막 eywa 보고서 날짜(D-64). null 이면 보고서가 없는 학생. */
  lastReportDate: string | null;
  lastReportText: string | null;
  /** 담당(D-132) — 라우트가 관리자에게만 채운다. 없으면 응답 줄에도 키가 없다. */
  classOwner?: ClassOwner;
}

export interface DailyProgressRow {
  /** 반 진도(studentId=null)를 학생에게 이어 붙이려면 반 id 가 있어야 한다. */
  classId: string;
  /** NULL 이면 반 전체 진도, 값이 있으면 그 학생 개별 진도. */
  studentId: string | null;
  unitId: string;
  /** YYYY-MM-DD */
  recordedAt: string;
  /** ISO — 같은 날 안의 «마지막 진도» 판정용. */
  createdAt: string;
}

/** 진도 계획 한 줄 — `studentId` 가 NULL 이면 반 계획(D-129 ⑴). */
export interface DailyPlanRow extends ProgressPlanRule {
  classId: string;
  studentId: string | null;
}

export interface LastReviewRef {
  classId?: string;
  studentId: string;
  rangeEndUnitId: string | null;
}

export interface DailyGroupStudent {
  id: string;
  name: string;
  /** 출제 요청(POST /api/tests/generate)이 요구한다. */
  classId: string;
  /** 화면 표기용 학년 — 학교 학년(중2)이 있으면 그것, 없으면 반 학년. */
  grade: string;
  className: string;
  classOwner?: ClassOwner;
  /** Actual default used by this student's generation request, never the group's maximum. */
  problemCount?: number;
}

export interface DailyGroup {
  key: string;
  rangeStartUnitId: string;
  rangeEndUnitId: string;
  startedFrom:
    "last-review" | "progress-start" | "chapter-start" | "current-only";
  /** 출제가 실제로 쓸 소단원 목록 — 풀 세기·출제 요청이 그대로 쓴다. */
  unitIds: string[];
  /** 이 묶음에 필요한 문항 수 — 구성원 반 기본 문항 수의 최댓값(부족 판정 기준). */
  neededCount: number;
  students: DailyGroupStudent[];
}

export interface ExceptionStudent extends DailyGroupStudent {
  /** 보고서 원문 줄(중복 제거) — 「내신대비」 같은 사유가 그대로 보인다. */
  lines: string[];
}

export interface DelayedStudent extends DailyGroupStudent {
  /** 계획보다 늦은 일 수(양수) — `resolveDailyPlan().driftDays` 의 부호를 뒤집은 것. */
  days: number;
}

export interface DailyReviewPlan {
  /** 오늘 대상이 된 학생 수(분모) — 계획상 수업일이거나 오늘 보고서가 있는 학생. */
  attended: number;
  groups: DailyGroup[];
  examOrUnread: ExceptionStudent[];
  noRange: DailyGroupStudent[];
  /**
   * 오늘 대상 중 **계획보다 늦은** 학생 — 메인 칩 「N일 밀림 M명」(D-131).
   * 계획이 없는 학생은 잴 수 없어 없다. 시험기간·미분류(D-64)도 뺀다 — 진도를 안 나가는 까닭이
   * 이미 따로 선다(그 학생을 «밀림»으로도 세면 시험 철마다 칩이 부풀어 오른다).
   */
  delayed: DelayedStudent[];
  /** 오늘 대상이 된 학생의 반 — 부르는 쪽이 「오늘 수업 계획이 없는 반」을 가를 때 쓴다. */
  attendedClassIds: string[];
}

const gradeOf = (s: DailyStudent): string =>
  s.schoolLevel && s.schoolGrade
    ? `${s.schoolLevel}${s.schoolGrade}`
    : s.classGrade;

export function planDailyReview(args: {
  /** 기준일 YYYY-MM-DD (호출자가 KST 로 정한다 — 서버 시계의 UTC 자정 아님). */
  day: string;
  students: readonly DailyStudent[];
  progressRows: readonly DailyProgressRow[];
  lastReviews: readonly LastReviewRef[];
  units: readonly (ChapterAwareUnit & { id: string })[];
  /** 진도 계획(D-129 ⑴). 비면 예전처럼 보고서 날짜 하나로만 「오늘」을 가른다. */
  plans?: readonly DailyPlanRow[];
  /**
   * **출제할 문항이 있는 마지막 차시** — 계획이 그 너머로 범위 끝을 내지 않는다
   * (`teachableBoundary.ts` · `resolveDailyPlan`). 없으면 예전처럼 교육과정 끝까지 걷는다.
   */
  lastTeachableUnitId?: string | null;
}): DailyReviewPlan {
  const {
    day,
    students,
    progressRows,
    lastReviews,
    units,
    plans = [],
    lastTeachableUnitId = null,
  } = args;

  const rowsByStudent = new Map<string, ProgressRecordLike[]>();
  const rowsByClass = new Map<string, ProgressRecordLike[]>();
  for (const row of progressRows) {
    // `ProgressRecordLike` 로 맞춰 둔다 — 적용 이력 판정을 제품 함수와 같은 것으로 쓴다.
    const record: ProgressRecordLike = { id: "", ...row };
    const bucket = row.studentId === null ? rowsByClass : rowsByStudent;
    const key =
      row.studentId === null ? row.classId : `${row.classId}/${row.studentId}`;
    const list = bucket.get(key) ?? [];
    list.push(record);
    bucket.set(key, list);
  }

  const classPlanByClass = new Map<string, DailyPlanRow>();
  const studentPlanByStudent = new Map<string, DailyPlanRow>();
  for (const p of plans) {
    if (p.studentId === null) classPlanByClass.set(p.classId, p);
    else studentPlanByStudent.set(`${p.classId}/${p.studentId}`, p);
  }

  const lastReviewByStudent = new Map(
    lastReviews.map((r) => [
      r.classId ? `${r.classId}/${r.studentId}` : r.studentId,
      r.rangeEndUnitId,
    ]),
  );

  const groups = new Map<string, DailyGroup>();
  const examOrUnread: ExceptionStudent[] = [];
  const noRange: DailyGroupStudent[] = [];
  const delayed: DelayedStudent[] = [];
  const attendedClassIds = new Set<string>();
  let attended = 0;

  for (const st of students) {
    const applicable = applicableProgress({
      classProgress: rowsByClass.get(st.classId) ?? [],
      studentProgress: rowsByStudent.get(`${st.classId}/${st.id}`) ?? [],
      useIndividualProgress: st.useIndividualProgress,
    });
    const current = findLatestProgress(applicable);

    // 계획도 진도와 **같은 규칙**으로 고른다 — 개별 진도 학생만 학생 계획이 반 계획을 덮는다.
    const rule = pickProgressPlan({
      classPlan: classPlanByClass.get(st.classId) ?? null,
      studentPlan: studentPlanByStudent.get(`${st.classId}/${st.id}`) ?? null,
      useIndividualProgress: st.useIndividualProgress,
    });
    const planned = rule
      ? resolveDailyPlan({
          rule,
          units,
          day,
          actual: current
            ? { unitId: current.unitId, recordedAt: current.recordedAt }
            : null,
          lastTeachableUnitId,
        })
      : null;

    const reportToday = st.lastReportDate === day;
    const lessonToday = planned?.lessonToday ?? false;
    if (!reportToday && !lessonToday) continue;

    attended += 1;
    attendedClassIds.add(st.classId);
    const entry: DailyGroupStudent = {
      id: st.id,
      name: st.name,
      classId: st.classId,
      grade: gradeOf(st),
      className: st.className,
      problemCount: st.defaultProblemCount,
      ...(st.classOwner ? { classOwner: st.classOwner } : {}),
    };

    // 🔴 D-64 가 계획보다 앞선다 — 오늘 보고서는 있는데 진도 행이 없다(시험기간·미분류).
    if (reportToday && !applicable.some((r) => r.recordedAt === day)) {
      const lines = [
        ...new Set(
          (st.lastReportText ?? "")
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        ),
      ];
      examOrUnread.push({ ...entry, lines });
      continue;
    }

    // 밀림 — 셈은 `resolveDailyPlan` 한 곳(계획이 그 차시를 나가라던 날 − 실제로 나간 날). 음수가 밀림.
    if (planned && planned.driftDays < 0)
      delayed.push({ ...entry, days: -planned.driftDays });

    // 범위의 끝 — 계획이 수업일이라 말하면 계획이 낸 차시(그 안에 «실제가 이긴다»가 이미
    // 들어 있다), 아니면 지금까지의 현재 진도.
    const endUnitId = lessonToday
      ? planned!.endUnitId
      : (current?.unitId ?? null);
    if (!endUnitId) {
      noRange.push(entry);
      continue;
    }

    const range = resolveDefaultReviewRange({
      units: [...units],
      currentUnitId: endUnitId,
      lastReviewEndUnitId:
        lastReviewByStudent.get(`${st.classId}/${st.id}`) ??
        lastReviewByStudent.get(st.id) ??
        null,
      // 🔴 계획의 **시작 차시**도 이력에 넣는다. D-63 은 「그 반이 실제로 나가기 시작한 데」를
      //    이력에서 찾는데, 계획으로 들어온 새 학생은 이력이 **한 줄도 없다** — 넣지 않으면
      //    시작을 못 정해 `current-only`(한 차시짜리 범위)로 조용히 떨어진다.
      progressUnitIds: [
        ...applicable.map((r) => r.unitId),
        ...(rule ? [rule.startUnitId] : []),
      ],
    });
    if (!range) {
      noRange.push(entry);
      continue;
    }

    const key = `${range.startUnitId}~${range.endUnitId}`;
    let group = groups.get(key);
    if (!group) {
      // 소단원 목록은 출제와 **같은 함수**로 센다(default-range 라우트와 동일 원칙).
      const { unitIds } = resolveRange({
        testType: "review",
        rangeStartUnitId: range.startUnitId,
        rangeEndUnitId: range.endUnitId,
        units: [...units],
      });
      group = {
        key,
        rangeStartUnitId: range.startUnitId,
        rangeEndUnitId: range.endUnitId,
        startedFrom: range.startedFrom,
        unitIds,
        neededCount: 0,
        students: [],
      };
      groups.set(key, group);
    }
    group.students.push(entry);
    group.neededCount = Math.max(group.neededCount, st.defaultProblemCount);
  }

  const sortedGroups = [...groups.values()]
    .map((g) => ({
      ...g,
      students: [...g.students].sort((a, b) =>
        a.name.localeCompare(b.name, "ko"),
      ),
    }))
    .sort(
      (a, b) =>
        b.students.length - a.students.length || a.key.localeCompare(b.key),
    );

  return {
    attended,
    groups: sortedGroups,
    examOrUnread: examOrUnread.sort((a, b) =>
      a.name.localeCompare(b.name, "ko"),
    ),
    noRange: noRange.sort((a, b) => a.name.localeCompare(b.name, "ko")),
    delayed: delayed.sort((a, b) => a.name.localeCompare(b.name, "ko")),
    attendedClassIds: [...attendedClassIds],
  };
}
