/**
 * **진도 계획 화면(22번 ④ · D-131 «계기판 관») 가드를 하나씩 꺼 빨개지는지 본다** —
 * 브리프 `tracks/briefs/daily-auto-test-screen.md` §3 «변이 하네스».
 *
 *   npx tsx scripts/qa/mutate-plan-screen.ts            # 전량
 *   npx tsx scripts/qa/mutate-plan-screen.ts ③ ⑦       # 이름 조각으로 고른다(여럿이면 어느 하나라도)
 *   npx tsx scripts/qa/mutate-plan-screen.ts --anchors  # 시험 없이 앵커만 센다(몇 초)
 *
 * ## 판정 순서 — `mutate-plan-api.ts` 와 같다 (러너는 그 파일에서 옮겨 왔다)
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 순수 함수(칸 판정 · 초안 본문 · 서버 문구 · 밀림 세기)는 tsx 탐침을 변이 전후로
 *      돌려 견준다. 화면·라우트처럼 모킹 없이 부를 수 없는 자리는 탐침이 없다(`probe: null`) — 그때는
 *      ⑷ 의 시험 **이름**으로만 빨강을 판정하고, 초록이면 «살아남음»이 아니라 **판정 보류**로 둔다.
 *   ⑷ 그제서야 시험이 빨개지나 — 실패한 시험 **이름**을 json 리포트에서 읽는다(2026-08-23 «도장»).
 *
 * 무리: ① 요일 순서·번호 · ② 저장 요청 모양 · ③ 계기판 칸 · ④ 미리보기(저장 안 함 · 서버 한 곳) ·
 *       ⑤ 서버 문구 그대로 · ⑥ 반 만들기의 접힌 칸 · ⑦ 메인 «오늘의 확인테스트» · ⑧ daily-review 칸 셋 · ⑨ D-30 ·
 *       (D-133 검수 반영 — 브리프 `tracks/briefs/plan-screen-followup.md` §3)
 *       ⑩ «자동 출제» 표지(두 방향 · 근거 칸 하나 · D-30) · ⑪ 회차 id 배선(단추 길 NULL · 요청으로 못 채움) ·
 *       ⑫ 회차 행 — 먼저 세우고 끝에서 합계 · 끊긴 회차 정리
 *
 * D-133 에서 뜻이 바뀐 것: ⑦e(날마다 칩 차례 → «최대 D일») · ⑦h(반 이름 줄 → 반 수 줄).
 *
 * 러너는 `--maxWorkers=1` — 이 기계는 다른 오르카 세션과 메모리를 나눠 쓴다. 원복은 **바이트**로 `finally` 에서,
 * 끝나고 md5 로 대조한다. **커밋한 상태에서 돌린다** — 배경 셸이 끊기면 `finally` 가 안 돌 수 있다
 * (메모리 `background-kill-node-survives`) — 그러면 `git status` 로 원본을 대조한다.
 *
 * ⚠️ `rmSync` 금지(`noRmSync.test.ts`) — 임시 파일 + `unlinkSync` 만 쓴다.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const VITEST = path.join(ROOT, "node_modules", "vitest", "vitest.mjs");
const TSX = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
// ⚠️ 경로에 PID — 두 세션이 같이 돌면 한쪽이 지운 탐침을 다른 쪽이 못 연다
const PROBE = path.join(
  ROOT,
  "scripts",
  "qa",
  `.mutate-plan-screen.probe.${process.pid}.ts`,
);

const T = (name: string) => `src/__tests__/${name}`;
const GAUGE = T("unit/planGauge.test.ts");
const REVIEW = T("unit/planDailyReview.test.ts");
const SCREEN = T("components/ProgressPlanScreen.test.tsx");
const SECTION = T("components/DailyReviewSection.test.tsx");
const PREVIEW = T("api/progressPlanPreview.test.ts");
const DAILY = T("api/dailyReview.test.ts");
const AUTO = T("api/autoDraftCron.test.ts");
const LINK = T("api/autoDraftRunLink.test.ts");

const GAUGE_FILE = "src/lib/daily/planGauge.ts";
const DRAFT_FILE = "src/lib/class/planDraft.ts";
const ERROR_FILE = "src/lib/class/serverError.ts";
const PLAN_API_FILE = "src/lib/class/progressPlanApi.ts";
const CLASS_API_FILE = "src/lib/class/classApi.ts";
const HOOK_FILE = "src/hooks/useClassManage.ts";
const FIELDS_UI = "src/components/class/ProgressPlanFields.tsx";
const SECTION_UI = "src/components/class/ProgressPlanSection.tsx";
const MANAGE_UI = "src/components/class/ClassManage.tsx";
const MAIN_UI = "src/components/main/DailyReviewSection.tsx";
const PREVIEW_ROUTE = "src/app/api/classes/[id]/progress-plan/preview/route.ts";
const DAILY_ROUTE = "src/app/api/tests/daily-review/route.ts";
const REVIEW_FILE = "src/lib/daily/planDailyReview.ts";
const RUN_FILE = "src/lib/tests/runAutoDraft.ts";
const GEN_FILE = "src/lib/tests/generateDraftTest.ts";
const CONTRACT_FILE = "src/contracts/test.contract.ts";

/** tsx 탐침 머리 — 모든 tsx 탐침이 이 이름들을 쓴다 */
const PRELUDE = `
import * as g from "../../src/lib/daily/planGauge";
import * as pd from "../../src/lib/class/planDraft";
import * as se from "../../src/lib/class/serverError";
import * as pdr from "../../src/lib/daily/planDailyReview";
const U = (section: string) => ({ id: section, grade: "중2", chapter: "식의 계산", section });
const ROW = (date: string, weekday: number, over: object = {}) => ({
  date, weekday, lesson: true, planned: [U("예정")], actual: [], driftDays: 0, atCurriculumEnd: false, ...over,
});
/** 시안 Hi-fi 2 — 9/14 월 밀림(실제 단항식) · 9/16 수 오늘 · 9/18 금 · 앞날 */
const HIFI = { from: "2026-09-14", to: "2026-09-27", rows: [
  ROW("2026-09-11", 5, { actual: [U("단항식")] }),
  ROW("2026-09-14", 1, { actual: [U("단항식")], driftDays: -3 }),
  ROW("2026-09-16", 3, { driftDays: -3 }),
  ROW("2026-09-18", 5, { driftDays: -3 }),
] };
const CELLS = (today = "2026-09-16") =>
  g.gaugeCells(HIFI, today).map((c) => [c.state, c.dateLabel, c.unitLabel].join(" "));
const DRAFT = { weekdays: [3, 0, 1, 3], startUnitId: "u1", unitsPerLesson: 1, startDate: "2026-09-16", active: true };
const ERR = { error: { code: "VALIDATION_ERROR", message: "요청 값이 올바르지 않습니다.",
  details: [{ field: "weekdays", message: "수업 요일을 하나 이상 골라야 합니다." }] } };
const UNITS = [
  { id: "u1", orderIndex: 100, grade: "중2", chapter: "2. 부등식" },
  { id: "u2", orderIndex: 101, grade: "중2", chapter: "2. 부등식" },
  { id: "u3", orderIndex: 102, grade: "중2", chapter: "3. 방정식" },
  { id: "u4", orderIndex: 103, grade: "중2", chapter: "3. 방정식" },
  { id: "u5", orderIndex: 104, grade: "중2", chapter: "3. 방정식" },
];
const STU = (id: string, over: object = {}) => ({
  id, name: id, classId: "c1", className: "c", classGrade: "중2", defaultProblemCount: 8,
  schoolLevel: "중", schoolGrade: 2, useIndividualProgress: true, lastReportDate: null, lastReportText: null, ...over,
});
const PROW = (studentId: string, unitId: string, recordedAt: string) => ({
  classId: "c1", studentId, unitId, recordedAt, createdAt: recordedAt + "T10:00:00Z",
});
/** 8/21(금) · 월수금 8/14 시작 — s1 u2@8/19(2일 밀림) · s2 u4@8/21(제때) */
const DR = () => pdr.planDailyReview({
  day: "2026-08-21",
  students: [STU("s1"), STU("s2")],
  progressRows: [PROW("s1", "u2", "2026-08-19"), PROW("s2", "u4", "2026-08-21")],
  lastReviews: [], units: UNITS,
  plans: [{ classId: "c1", studentId: null, weekdays: [1, 3, 5], unitsPerLesson: 1, startUnitId: "u1", startDate: "2026-08-14", active: true }],
});
void g; void pd; void se; void pdr; void CELLS; void DRAFT; void ERR; void DR;
`;

interface Mutation {
  name: string;
  file: string;
  from: string;
  to: string;
  /** 그 가드가 지키는 입력 하나 — 변이 전후 산출물을 견준다(⑶). 없으면 시험 이름으로만 판정 */
  probe: string | null;
  tests: string[];
}

const NL = "\n";
const L = (...lines: string[]) => lines.join(NL);

const MUTATIONS: Mutation[] = [
  // ── ① 요일 — 월요일부터 그리고 값은 0=일 ────────────────────────────────
  {
    name: "①a 요일 토글이 일요일부터",
    file: GAUGE_FILE,
    from: "export const WEEKDAYS_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;",
    to: "export const WEEKDAYS_MONDAY_FIRST = [0, 1, 2, 3, 4, 5, 6] as const;",
    probe: "g.WEEKDAYS_MONDAY_FIRST",
    tests: [GAUGE, SCREEN],
  },
  {
    name: "①b 저장 번호가 한국식 월=1…일=7",
    file: GAUGE_FILE,
    from: "export const WEEKDAYS_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;",
    to: "export const WEEKDAYS_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 7] as const;",
    probe: "g.WEEKDAYS_MONDAY_FIRST",
    tests: [GAUGE, SCREEN],
  },
  {
    name: "①c 요일을 누른 차례대로 보낸다 (정렬·겹침 정리 없음)",
    file: DRAFT_FILE,
    from: "    weekdays: [...new Set(draft.weekdays)].sort((a, b) => a - b),",
    to: "    weekdays: [...draft.weekdays],",
    probe: "pd.planDraftBody(DRAFT).weekdays",
    tests: [SCREEN],
  },

  // ── ② 저장 요청 모양 — 기본값 · 칸이 요청에 실리나 ────────────────────────
  {
    name: "②a 한 수업 기본이 2차시",
    file: DRAFT_FILE,
    from: "    unitsPerLesson: 1,",
    to: "    unitsPerLesson: 2,",
    probe: 'pd.emptyPlanDraft("2026-09-16").unitsPerLesson',
    tests: [SCREEN],
  },
  {
    name: "②b 자동 출제 기본이 꺼짐",
    file: DRAFT_FILE,
    from: "    active: true,",
    to: "    active: false,",
    probe: 'pd.emptyPlanDraft("2026-09-16").active',
    tests: [SCREEN],
  },
  {
    name: "②c 시작일 기본이 오늘이 아니다(빈 값)",
    file: DRAFT_FILE,
    from: "    startDate: today,",
    to: '    startDate: "",',
    probe: 'pd.emptyPlanDraft("2026-09-16").startDate',
    tests: [SCREEN],
  },
  {
    name: "②d 자동 출제 스위치가 값을 안 바꾼다",
    file: FIELDS_UI,
    from: "        onClick={() => onChange({ ...draft, active: !draft.active })}",
    to: "        onClick={() => onChange({ ...draft })}",
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "②e 한 수업 차시 수 고르기가 값을 안 싣는다",
    file: FIELDS_UI,
    from: "              onChange({ ...draft, unitsPerLesson: Number(event.target.value) })",
    to: "              onChange({ ...draft })",
    probe: null,
    tests: [SCREEN],
  },

  // ── ③ 계기판 칸 — 줄을 칸으로 옮길 뿐 ───────────────────────────────────
  {
    name: "③a 오늘 칸을 가르지 않는다(끝난 칸으로)",
    file: GAUGE_FILE,
    from: '        ? "now"',
    to: '        ? "done"',
    probe: "CELLS()",
    tests: [GAUGE, SCREEN],
  },
  {
    name: "③b 앞날 칸도 끝난 칸으로 칠한다",
    file: GAUGE_FILE,
    from: "        : row.date > today",
    to: "        : false",
    probe: "CELLS()",
    tests: [GAUGE, SCREEN],
  },
  {
    name: "③c 제때(밀림 0)도 밀린 칸으로",
    file: GAUGE_FILE,
    from: "          : row.driftDays < 0",
    to: "          : row.driftDays <= 0",
    probe: "CELLS()",
    tests: [GAUGE, SCREEN],
  },
  {
    name: "③d 밀린 칸에 「밀림」 대신 차시 이름",
    file: GAUGE_FILE,
    from: '      unitLabel: state === "late" ? "밀림" : names(shown),',
    to: "      unitLabel: names(shown),",
    probe: "CELLS()",
    tests: [GAUGE, SCREEN],
  },
  {
    name: "③e 지난 칸에서 실제가 안 이긴다(예정 이름)",
    file: GAUGE_FILE,
    from: "        ? row.actual.length",
    to: "        ? false",
    probe: "CELLS()",
    tests: [GAUGE],
  },
  {
    name: "③f 칸 아래 요일이 하루 밀린다",
    file: GAUGE_FILE,
    from: '  return `${Number(month)}/${Number(day)} ${WEEKDAY_LABELS[weekday] ?? ""}`;',
    to: '  return `${Number(month)}/${Number(day)} ${WEEKDAY_LABELS[(weekday + 1) % 7] ?? ""}`;',
    probe: "CELLS()",
    tests: [GAUGE, SCREEN],
  },
  {
    name: "③g 「N일 밀림」을 오늘까지의 마지막 줄이 아니라 첫 줄로 잰다",
    file: GAUGE_FILE,
    from: "  const row = upToToday[upToToday.length - 1] ?? schedule.rows[0];",
    to: "  const row = schedule.rows[0];",
    probe:
      'g.currentDelayDays({ from: "2026-09-14", to: "2026-09-27", rows: [ROW("2026-09-14", 1, { driftDays: -2 }), ROW("2026-09-18", 5)] }, "2026-09-18")',
    tests: [GAUGE],
  },
  {
    name: "③h 칸에 data-state 를 안 싣는다(색을 못 가른다)",
    file: SECTION_UI,
    from: "              data-state={cell.state}",
    to: '              data-state="empty"',
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "③i 아래 한 줄 「N일 밀림」이 안 선다",
    file: SECTION_UI,
    from: "      {delay > 0 ? (",
    to: "      {delay < 0 ? (",
    probe: null,
    tests: [SCREEN],
  },

  // ── ④ 미리보기 — 저장 안 함 · 날짜 펴기는 서버 한 곳 ──────────────────────
  {
    name: "④a 칸을 바꿔도 미리보기를 부르지 않는다",
    file: SECTION_UI,
    from: "  const wantPreview = dirty && planDraftReady(draft);",
    to: "  const wantPreview = dirty && false;",
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "④b 미리보기 결과를 버리고 저장된 예정을 그린다",
    file: SECTION_UI,
    from: "  const schedule = shownPreview ? shownPreview.schedule : load.schedule;",
    to: "  const schedule = load.schedule;",
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "④c 미리보기가 화면의 「오늘」을 안 넘긴다",
    file: PLAN_API_FILE,
    from: "      `/api/classes/${classId}/progress-plan/preview?day=${day}`,",
    to: "      `/api/classes/${classId}/progress-plan/preview`,",
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "④d 미리보기 경로가 그 반 진도를 안 본다(저장 뒤 GET 과 갈린다)",
    file: PREVIEW_ROUTE,
    from: "    classId: id,",
    to: '    classId: "00000000-0000-4000-8000-000000000000",',
    probe: null,
    tests: [PREVIEW],
  },
  {
    name: "④e 미리보기 경로가 남의 반을 막지 않는다",
    file: PREVIEW_ROUTE,
    from: "  if (!owned.ok) return owned.response;",
    to: "  void owned;",
    probe: null,
    tests: [PREVIEW],
  },
  {
    name: "④f 미리보기 경로에서 관리자가 못 넘는다(D-130)",
    file: PREVIEW_ROUTE,
    from: "  const owned = await requireOwnedClass(id, session);",
    to: "  const owned = await requireOwnedClass(id, { ...session, isAdmin: false });",
    probe: null,
    tests: [PREVIEW],
  },
  {
    name: "④g 미리보기 경로가 없는 차시를 안 본다",
    file: PREVIEW_ROUTE,
    from: "  if (missingUnit) return missingUnit;",
    to: "  void missingUnit;",
    probe: null,
    tests: [PREVIEW],
  },

  // ── ⑤ 서버 문구 그대로 — 400/422 로 가르지 않는다 ───────────────────────
  {
    name: "⑤a 칸 문구(details)를 버린다",
    file: ERROR_FILE,
    from: '  return extra.length ? `${message} ${extra.join(" · ")}` : message;',
    to: "  return message;",
    probe: "se.serverErrorText(ERR)",
    tests: [SCREEN],
  },
  {
    name: "⑤b 422 만 서버 문구 — 400 은 고정 문구(상태 코드로 가른다)",
    file: PLAN_API_FILE,
    from: "  return { ok: false, message: serverErrorText(body) ?? fallback };",
    to: "  return { ok: false, message: (res.status === 422 ? serverErrorText(body) : null) ?? fallback };",
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "⑤c 계획 저장이 서버 문구를 안 읽는다",
    file: PLAN_API_FILE,
    from: '    if (!res.ok) return failure(res, "수업 계획을 저장하지 못했습니다.");',
    to: '    if (!res.ok) return { ok: false, message: "수업 계획을 저장하지 못했습니다." };',
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "⑤d 반 만들기가 서버 문구 없이 던진다",
    file: CLASS_API_FILE,
    from: '  if (!res.ok) await throwServerError(res, "요청에 실패했습니다");',
    to: '  if (!res.ok) throw new Error("요청에 실패했습니다");',
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "⑤e 반 만들기 실패에 서버 문구를 안 잇는다",
    file: HOOK_FILE,
    from: "          error instanceof ServerError",
    to: "          error instanceof ServerError && false",
    probe: null,
    tests: [SCREEN],
  },

  // ── ⑥ 반 만들기 — 계획 칸은 접어 둔다 ───────────────────────────────────
  {
    name: "⑥a 계획 칸이 처음부터 펼쳐져 있다",
    file: MANAGE_UI,
    from: "  const [planOpen, setPlanOpen] = useState(false);",
    to: "  const [planOpen, setPlanOpen] = useState(true);",
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "⑥b 접힌 채 만들어도 계획을 같이 보낸다",
    file: MANAGE_UI,
    from: "    if (await onAdd(name, grade, planOpen ? plan : undefined)) {",
    to: "    if (await onAdd(name, grade, plan)) {",
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "⑥c 반 만들기 요청이 계획을 안 싣는다",
    file: CLASS_API_FILE,
    from: L(
      "      progressPlan",
      "        ? { name, grade, progressPlan: planDraftBody(progressPlan) }",
      "        : { name, grade },",
    ),
    to: "      { name, grade },",
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "⑥d 열어도 글자가 «수업 계획 넣기» 그대로(D-133 ⑿)",
    file: MANAGE_UI,
    from: '        {planOpen ? "수업 계획 접기" : "수업 계획 넣기"}',
    to: '        {"수업 계획 넣기"}',
    probe: null,
    tests: [SCREEN],
  },

  // ── ⑦ 메인 «오늘의 확인테스트» ─────────────────────────────────────────
  {
    name: "⑦a 문지기가 eywa 소유자만(계획이 있어도 안 선다)",
    file: MAIN_UI,
    from: "  if (!d.eywaOwner && !d.hasPlan) return null;",
    to: "  if (!d.eywaOwner) return null;",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑦b 문지기가 없다(계획도 소유도 없는 계정에 선다)",
    file: MAIN_UI,
    from: "  if (!d.eywaOwner && !d.hasPlan) return null;",
    to: "  if (!d.eywaOwner && !d.hasPlan && d.day === '') return null;",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑦c 「오늘 초안」이 확정·인쇄까지 센다",
    file: MAIN_UI,
    from: '    d.todayTests.filter((t) => t.status === "draft").length +',
    to: "    d.todayTests.length +",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑦d 「오늘 초안」이 방금 만든 초안을 안 센다",
    file: MAIN_UI,
    from: "    Object.keys(progress.created).filter((id) => !testByStudent.has(id)).length;",
    to: "    0;",
    probe: null,
    tests: [SECTION],
  },
  {
    // D-133 ⑺ — 날마다 칩(차례)이 칩 하나 «밀림 N명 · 최대 D일» 이 됐다. 이제 겨누는 것은 «최대»다.
    name: "⑦e 밀림 칩 «최대 D일»이 가장 많이 밀린 학생이 아니라 맨 앞 학생의 일 수",
    file: MAIN_UI,
    from: "최대 ${n(Math.max(...d.delayed.map((s) => s.days)))}일",
    to: "최대 ${n(d.delayed[0]!.days)}일",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑦j 밀림 칩 N 이 밀린 학생 수가 아니라 밀린 날 가짓수(옛 날마다 칩의 셈)",
    file: MAIN_UI,
    from: "밀림 ${n(d.delayed.length)}명",
    to: "밀림 ${n(new Set(d.delayed.map((s) => s.days)).size)}명",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑦k 밀린 학생이 없어도 밀림 칩이 선다",
    file: MAIN_UI,
    from: "    ...(d.delayed.length > 0",
    to: "    ...(d.delayed.length >= 0",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑦f 시험기간 칩 문구가 예전 숫자 줄 꼴",
    file: MAIN_UI,
    from: "            label: `시험기간 ${n(d.examOrUnread.length)}명`,",
    to: "            label: `${n(d.examOrUnread.length)}명 시험기간`,",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑦g 대상이 없는 날 예전 보고서 문구",
    file: MAIN_UI,
    from: '        <p className="mt-1 text-sm text-text-3">오늘 수업 계획이 없습니다.</p>',
    to: '        <p className="mt-1 text-sm text-text-3">오늘 수업 보고서가 아직 없습니다</p>',
    probe: null,
    tests: [SECTION],
  },
  {
    // D-133 ⑻ — 줄이 «반 이름 — …» 에서 «오늘 수업 계획이 없는 반 N개» 로 바뀌었다(앵커는 그대로)
    name: "⑦h 오늘 수업 없는 반 수 줄이 안 선다",
    file: MAIN_UI,
    from: "          {d.noLessonClasses.length > 0 ? (",
    to: "          {d.noLessonClasses.length < 0 ? (",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑦m 수업 없는 반 줄이 반 이름을 늘어놓는다(D-133 ⑻ 이전)",
    file: MAIN_UI,
    from: "              오늘 수업 계획이 없는 반 {n(d.noLessonClasses.length)}개",
    to: '              {d.noLessonClasses.map((c) => c.name).join(" · ")} — 오늘 수업 계획이 없습니다.',
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑦i 동기화 줄이 계획만 있는 계정에도 선다",
    file: MAIN_UI,
    from: "      {d.eywaOwner ? (",
    to: "      {d.eywaOwner || d.hasPlan ? (",
    probe: null,
    tests: [SECTION],
  },

  // ── ⑧ daily-review 칸 셋 — hasPlan · delayed · noLessonClasses ─────────
  {
    name: "⑧a 밀림에 제때 학생까지 센다",
    file: REVIEW_FILE,
    from: "    if (planned && planned.driftDays < 0)",
    to: "    if (planned && planned.driftDays <= 0)",
    probe: "DR().delayed.map((s) => s.id + ':' + s.days)",
    tests: [REVIEW, DAILY],
  },
  {
    name: "⑧b 밀린 일 수의 부호가 뒤집힌다",
    file: REVIEW_FILE,
    from: "      delayed.push({ ...entry, days: -planned.driftDays });",
    to: "      delayed.push({ ...entry, days: planned.driftDays });",
    probe: "DR().delayed.map((s) => s.id + ':' + s.days)",
    tests: [REVIEW],
  },
  {
    name: "⑧c 오늘 대상의 반을 안 적는다",
    file: REVIEW_FILE,
    from: "    attendedClassIds.add(st.classId);",
    to: "    void st.classId;",
    probe: "DR().attendedClassIds",
    tests: [DAILY],
  },
  {
    name: "⑧d 꺼 둔 계획은 계획으로 안 센다(hasPlan)",
    file: DAILY_ROUTE,
    from: "      hasPlan: planRows.length > 0,",
    to: "      hasPlan: planRows.some((p) => p.active),",
    probe: null,
    tests: [DAILY],
  },
  {
    name: "⑧e 오늘 대상이 있는 반도 «수업 계획 없음»에 싣는다",
    file: DAILY_ROUTE,
    from: "        .filter((c) => !plan.attendedClassIds.includes(c.id))",
    to: "        .filter(() => true)",
    probe: null,
    tests: [DAILY],
  },

  // ── ⑨ D-30 — 계기판 칸·칩은 누르는 것이 아니다 ──────────────────────────
  {
    name: "⑨a 계기판 칸에 손가락 커서",
    file: SECTION_UI,
    from: "              className={s.cell}",
    to: "              className={`${s.cell} cursor-pointer`}",
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "⑨b 메인 칩에 hover 배경",
    file: MAIN_UI,
    from: "                  className={`rounded-full border bg-white px-2.5 py-0.5 text-[12px] ${",
    to: "                  className={`rounded-full border bg-white px-2.5 py-0.5 text-[12px] hover:bg-side ${",
    probe: null,
    tests: [SECTION],
  },

  // ── ⑩ «자동 출제» 표지 — 검수 줄 이름 바로 뒤(D-133 ⑵) ───────────────────
  {
    name: "⑩a 아침 회차가 세운 시험지에 표지가 안 선다",
    file: MAIN_UI,
    from: "                    {today?.autoDraft ? (",
    to: "                    {today?.autoDraft && false ? (",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑩b 손으로 낸 시험지에도 표지가 선다(오늘 시험지면 다)",
    file: MAIN_UI,
    from: "                    {today?.autoDraft ? (",
    to: "                    {today ? (",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑩c 이 화면에서 방금 «모두 출제»로 낸 초안에도 표지가 선다",
    file: MAIN_UI,
    from: "                    {today?.autoDraft ? (",
    to: "                    {today?.autoDraft || progress.created[id] ? (",
    probe: null,
    tests: [SECTION],
  },
  // ── ⑬ D-133 후속 — 자동 묶음 밖 학생의 오늘 시험지(원장님 2026-09-17 «추천 사항으로») ─────────
  {
    name: "⑬a 검수 줄이 자동 묶음 밖 학생의 오늘 시험지를 안 붙인다",
    file: MAIN_UI,
    from: "      .filter((t) => !autoIds.has(t.studentId))",
    to: "      .filter(() => false)",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑬b 묶음 밖 학생을 거르지 않아 자동 묶음 학생이 두 번 선다",
    file: MAIN_UI,
    from: "      .filter((t) => !autoIds.has(t.studentId))",
    to: "      .filter(() => true)",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑬c 오늘 시험지가 있어도 부족·시험기간 줄이 «직접 출제»(같은 날 두 번째 초안)",
    file: MAIN_UI,
    from: '      {today ? "검수" : "직접 출제"}',
    to: '      {false ? "검수" : "직접 출제"}',
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑬d «검수» 링크가 그 시험지가 아니라 출제 화면으로 간다",
    file: MAIN_UI,
    from: "          ? `/tests/${today.testId}`",
    to: "          ? `/tests/new?classId=${student.classId}&studentId=${student.id}`",
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑩d 표지에 손가락 커서(D-30)",
    file: MAIN_UI,
    from: '  "inline-block shrink-0 whitespace-nowrap rounded-[4px] border border-[#2064b3] bg-white px-2 py-0.5 text-[11px] leading-4 font-bold text-[#2064b3]";',
    to: '  "inline-block shrink-0 whitespace-nowrap rounded-[4px] border border-[#2064b3] bg-white px-2 py-0.5 text-[11px] leading-4 font-bold text-[#2064b3] cursor-pointer";',
    probe: null,
    tests: [SECTION],
  },
  {
    name: "⑩e daily-review 의 autoDraft 가 늘 거짓",
    file: DAILY_ROUTE,
    from: "        autoDraft: t.autoDraftRunId !== null,",
    to: "        autoDraft: false,",
    probe: null,
    tests: [DAILY],
  },
  {
    name: "⑩f daily-review 의 autoDraft 가 늘 참",
    file: DAILY_ROUTE,
    from: "        autoDraft: t.autoDraftRunId !== null,",
    to: "        autoDraft: true,",
    probe: null,
    tests: [DAILY],
  },
  {
    name: "⑩g daily-review 가 시험지 칸을 안 읽는다(select 에서 빠짐 — undefined 가 «참»이 된다)",
    file: DAILY_ROUTE,
    from: "    select: { id: true, studentId: true, status: true, autoDraftRunId: true },",
    to: "    select: { id: true, studentId: true, status: true },",
    probe: null,
    tests: [DAILY],
  },

  // ── ⑪ 회차 id 배선 — 서버 안 인자로만(D-133 ⑴) ──────────────────────────
  {
    name: "⑪a 아침 회차가 초안에 회차 id 를 안 넘긴다",
    file: RUN_FILE,
    from: "        { autoDraftRunId: runId },",
    to: "        {},",
    probe: null,
    tests: [AUTO],
  },
  {
    name: "⑪b generateDraftTest 가 넘겨받은 회차 id 를 시험지에 안 적는다",
    file: GEN_FILE,
    from: "        autoDraftRunId: origin.autoDraftRunId ?? null,",
    to: "        autoDraftRunId: null,",
    probe: null,
    tests: [LINK, AUTO],
  },
  {
    name: "⑪c 단추 길이 그날 마지막 회차를 짐작해 붙인다(시각 추정 — 보고서 daily-auto-test-screen ⑤-A ⑶)",
    file: GEN_FILE,
    from: "        autoDraftRunId: origin.autoDraftRunId ?? null,",
    to: '        autoDraftRunId: origin.autoDraftRunId ?? (await tx.autoDraftRun.findFirst({ orderBy: { ranAt: "desc" } }))?.id ?? null,',
    probe: null,
    tests: [LINK],
  },
  {
    name: "⑪d 출제 요청 계약이 모르는 칸을 받는다(strict 해제 — 본문으로 칸을 들고 들어올 수 있다)",
    file: CONTRACT_FILE,
    from: L("export const testGenerateRequestSchema = z", "  .strictObject({"),
    to: L("export const testGenerateRequestSchema = z", "  .looseObject({"),
    probe: null,
    tests: [LINK],
  },

  // ── ⑫ 회차 행 — 먼저 세우고 끝에서 합계 · 끊긴 회차(D-133 ⑴ · 보고서 ⑤-B) ─────
  {
    name: "⑫a 끝에서 합계를 고쳐 쓰지 않는다(회차 행이 합계 0 으로 남는다)",
    file: RUN_FILE,
    from: "  await db.autoDraftRun.update({ where: { id: runId }, data: totals });",
    to: "  void totals;",
    probe: null,
    tests: [AUTO],
  },
  {
    name: "⑫b 대상 수를 적지 않는다(targets 가 0 으로 남는다)",
    file: RUN_FILE,
    from: "  tally.targets = plan.attended;",
    to: "  void plan.attended;",
    probe: null,
    tests: [AUTO],
  },
  {
    name: "⑫c 끊긴 회차 — 이은 시험지가 없어도 행을 남긴다(«대상 0» 으로 읽힌다)",
    file: RUN_FILE,
    from: "  if (linked === 0) {",
    to: "  if (linked < 0) {",
    probe: null,
    tests: [AUTO],
  },
  {
    name: "⑫d 끊긴 회차 — 이은 시험지가 있어도 행을 지운다(SET NULL 로 표지가 사라진다)",
    file: RUN_FILE,
    from: "  if (linked === 0) {",
    to: "  if (linked >= 0) {",
    probe: null,
    tests: [AUTO],
  },
  {
    name: "⑫e 끊긴 회차 — 거기까지의 합계를 안 적는다",
    file: RUN_FILE,
    from: "  await db.autoDraftRun.update({ where: { id: runId }, data: totalsOf(tally) });",
    to: "  void tally;",
    probe: null,
    tests: [AUTO],
  },
];

const md5 = (b: Buffer) => createHash("md5").update(b).digest("hex");

/** 지운다 — 없으면 그만 */
function removeFile(file: string) {
  try {
    unlinkSync(file);
  } catch {
    /* 없으면 그만 */
  }
}

/**
 * 임시 파일 하나 — 디렉터리를 만들지 않는다. 🔴 `rmSync` 는 경로에 한글이 있으면 노드를 메시지 없이 죽인다
 * (`noRmSync.test.ts`) — 지우기가 `unlinkSync` 하나로 끝나게 파일로만 둔다.
 */
let tempSeq = 0;
function tempFile(prefix: string, ext: string): string {
  const file = path.join(
    os.tmpdir(),
    `${prefix}${process.pid}-${++tempSeq}${ext}`,
  );
  removeFile(file);
  return file;
}

function tsxProbe(expr: string): string | null {
  writeFileSync(
    PROBE,
    `${PRELUDE}\n(async () => { console.log(JSON.stringify(await (${expr}))); })()` +
      `.catch((e) => { console.log(JSON.stringify({ error: String(e && e.message) })); });\n`,
    "utf8",
  );
  try {
    const r = spawnSync(process.execPath, [TSX, PROBE], {
      cwd: ROOT,
      encoding: "utf8",
    });
    return r.status === 0 ? r.stdout.trim() : null;
  } finally {
    removeFile(PROBE);
  }
}

/** 시험을 돌려 (종료 코드, 실패한 시험 이름들) — 이름은 json 리포트에서 읽는다 */
function runTests(files: string[]): {
  code: number;
  failed: string[];
  readable: boolean;
} {
  const out = tempFile("mutate-plan-screen-", ".json");
  try {
    const r = spawnSync(
      process.execPath,
      [
        VITEST,
        "run",
        ...files,
        "--maxWorkers=1",
        "--reporter=json",
        `--outputFile.json=${out}`,
      ],
      { cwd: ROOT, encoding: "utf8" },
    );
    let report: {
      testResults?: {
        assertionResults?: { status: string; fullName: string }[];
      }[];
    } | null = null;
    try {
      report = JSON.parse(readFileSync(out, "utf8"));
    } catch {
      report = null;
    }
    const failed = (report?.testResults ?? []).flatMap((t) =>
      (t.assertionResults ?? [])
        .filter((a) => a.status === "failed")
        .map((a) => a.fullName),
    );
    return { code: r.status ?? 1, failed, readable: report !== null };
  } finally {
    removeFile(out);
  }
}

type Verdict = "RED" | "GREEN" | "HOLD" | "REFUSE";

function main(): number {
  const needles = process.argv.slice(2).filter((a) => a !== "--anchors");

  // `--anchors` — 시험을 돌리지 않고 **앵커만** 센다. 코드가 움직였을 때(prettier 재정렬 포함)
  // 30분짜리 전량 판정을 돌리기 전에 몇 초로 확인하는 자리다.
  if (process.argv.includes("--anchors")) {
    let bad = 0;
    for (const m of MUTATIONS) {
      const text = readFileSync(m.file, "utf8");
      const eol = text.includes("\r\n") ? "\r\n" : NL;
      const count = text.split(m.from.split(NL).join(eol)).length - 1;
      if (count !== 1) {
        bad += 1;
        console.log(`  ⛔ 앵커 ${count}개 — ${m.name}  (${m.file})`);
      }
    }
    console.log(
      bad === 0
        ? `  앵커 ${MUTATIONS.length}개 전부 정확히 하나 ✓`
        : `  🔴 앵커가 어긋난 변이 ${bad}개`,
    );
    return bad === 0 ? 0 : 1;
  }

  const picked =
    needles.length > 0
      ? MUTATIONS.filter((m) => needles.some((n) => m.name.includes(n)))
      : MUTATIONS;
  if (picked.length === 0) {
    console.log(`«${needles.join(" · ")}» 과 맞는 변이가 없다`);
    return 2;
  }

  // ㉠ 음성 대조 — 대상 시험 전부가 변이 전에 초록이어야 한다
  const allTests = [...new Set(picked.flatMap((m) => m.tests))];
  const base = runTests(allTests);
  if (base.code !== 0 || !base.readable) {
    console.log(
      `⛔ 기준 시험이 초록이 아니다(종료 ${base.code}, 리포트 ${base.readable ? "읽음" : "못 읽음"}) — 판정하지 않는다`,
    );
    for (const f of base.failed.slice(0, 8)) console.log(`   ↳ ${f}`);
    return 3;
  }
  console.log(`기준 시험: 초록 (음성 대조 — ${allTests.length}파일)`);

  const originals = new Map<string, Buffer>();
  for (const f of new Set(picked.map((m) => m.file)))
    originals.set(f, readFileSync(f));

  const results: {
    name: string;
    verdict: Verdict;
    why: string;
    failed: string[];
  }[] = [];
  try {
    for (const [i, m] of picked.entries()) {
      const orig = originals.get(m.file)!;
      const text = orig.toString("utf8");
      const eol = text.includes("\r\n") ? "\r\n" : NL;
      const from = m.from.split(NL).join(eol);
      const to = m.to.split(NL).join(eol);
      const tag = `${String(i + 1).padStart(2)}/${picked.length}`;
      let verdict: Verdict = "REFUSE";
      let why = "";
      let failed: string[] = [];

      const count = text.split(from).length - 1;
      if (count !== 1) {
        why = `⑴ 앵커가 ${count}개다 — 코드가 움직였다`;
      } else {
        const before = m.probe ? tsxProbe(m.probe) : null;
        writeFileSync(m.file, text.replace(from, to), "utf8");
        try {
          if (md5(readFileSync(m.file)) === md5(orig)) {
            why = "⑵ 파일이 안 바뀌었다";
          } else {
            const after = m.probe ? tsxProbe(m.probe) : null;
            const short = (s: string) =>
              s.length > 90 ? `${s.slice(0, 87)}...` : s;
            if (m.probe && (before === null || after === null)) {
              why = `⑶ 탐침 산출물을 못 얻었다(전 ${before === null ? "실패" : "성공"} · 후 ${after === null ? "실패" : "성공"})`;
            } else if (m.probe && before === after) {
              why = `⑶ 산출물이 그대로다 — 뜻이 안 바뀌었다 (${before})`;
            } else {
              const change = m.probe
                ? `산출물 ${short(before!)} → ${short(after!)}`
                : "(탐침 없음 — 시험 이름으로 판정)";
              const r = runTests(m.tests);
              failed = r.failed;
              if (r.code !== 0 && r.failed.length > 0) {
                verdict = "RED";
                why = change;
              } else if (r.code !== 0) {
                why = "⑷ 빨간데 실패한 시험을 못 댄다 — 러너가 안 떴을 수 있다";
              } else if (m.probe) {
                verdict = "GREEN";
                why = `${change} 인데 시험이 초록`;
              } else {
                verdict = "HOLD";
                why =
                  "탐침 없이 초록 — 변이가 뜻을 안 바꿨는지 가드가 없는지 못 가른다";
              }
            }
          }
        } finally {
          writeFileSync(m.file, orig);
        }
      }
      results.push({ name: m.name, verdict, why, failed });
      const mark = {
        RED: "🟥 빨개짐",
        GREEN: "🟩 살아남음(가드 아님)",
        HOLD: "🟨 판정 보류",
        REFUSE: "⛔ 판정 거부",
      }[verdict];
      console.log(`  ${tag} ${mark}  ${m.name}`);
      console.log(`        ${why}`);
      for (const f of failed.slice(0, 3)) console.log(`        ↳ ${f}`);
    }
  } finally {
    for (const [f, b] of originals) writeFileSync(f, b);
  }

  let restored = true;
  for (const [f, b] of originals) {
    if (md5(readFileSync(f)) !== md5(b)) {
      restored = false;
      console.log(`🔴 복구 실패 — ${f}`);
    }
  }

  const count = (v: Verdict) => results.filter((r) => r.verdict === v).length;
  console.log("");
  console.log(
    `  빨개짐 ${count("RED")}/${results.length} · 살아남음 ${count("GREEN")} · 보류 ${count("HOLD")} · 판정 거부 ${count("REFUSE")}`,
  );
  for (const r of results.filter((x) => x.verdict !== "RED"))
    console.log(`    ${r.verdict} ${r.name} — ${r.why}`);
  console.log(
    restored
      ? "  변이한 파일 전부 원본과 일치 ✓"
      : "  🔴 원본과 다른 파일이 있다 — 손으로 확인하라",
  );
  return restored && count("RED") === results.length ? 0 : 1;
}

process.exitCode = main();
