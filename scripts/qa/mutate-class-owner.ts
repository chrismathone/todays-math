/**
 * **관리자 화면의 «누구의 반» 담당(D-132) 가드를 하나씩 뒤집어 빨개지는지 본다** —
 * 브리프 `tracks/briefs/class-owner-tag.md` §3 «변이 하네스».
 *
 *   npx tsx scripts/qa/mutate-class-owner.ts            # 전량
 *   npx tsx scripts/qa/mutate-class-owner.ts ① ④       # 이름 조각으로 고른다(여럿이면 어느 하나라도)
 *   npx tsx scripts/qa/mutate-class-owner.ts --anchors  # 시험 없이 앵커만 센다(몇 초)
 *
 * ## 무엇을 뒤집나
 *
 *   ① 싣는 판정(서버) — 두 방향: «안 싣는다»면 관리자 짝이, «늘 싣는다»면 **관리자 아님 짝**이 빨개져야 한다
 *   ② 그리는 판정(화면) — 두 방향 + 자리마다 «안 그린다»
 *   ③ 내 반 맨 위 — 반 목록 두 묶음 · 페이지 넘김 · 메인 · 개념 판 · 작업실 개요 · 안정 정렬
 *   ④ 6자 — 글자 수 · 코드 포인트 · «…» 없음 · title 은 전체
 *   ⑤ 계정 이름 · «내 반» · 딱지 결
 *   ⑥ 자리마다 판정 배선 — 라우트가 판정을 건너뛰면(«늘 싣는다» · «안 싣는다»)
 *   ⑦ 조회 한 번 — 조인을 빼면
 *   ⑧ 인쇄 무변화 — 인쇄 경로에 담당이 들어가면(`classOwnerPrintFree.test.ts`) + 인쇄 경로 diff 가 0 인가
 *
 * ## 판정 순서 — `mutate-admin-scope.ts` 와 같다 (20번 교훈 2026-08-20·08-21·08-23)
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 순수 헬퍼(`classOwner.ts` · `ownerLabel.ts`)는 tsx 탐침을 변이 전후로 돌려 견준다.
 *      라우트·화면은 탐침이 없다(`probe: null`) — 시험 **이름**으로만 빨강을 판정하고, 초록이면 **판정 보류**.
 *   ⑷ 그제서야 시험이 빨개지나 — 실패한 시험 **이름**을 json 리포트에서 읽는다(2026-08-23 «도장»).
 *
 * 러너는 `--maxWorkers=1`. 원복은 **바이트**로 `finally` 에서, 끝나고 md5 로 대조한다. **커밋한 상태에서 돌린다** —
 * 배경 셸이 끊기면 `finally` 가 안 돌 수 있다(메모리 `background-kill-node-survives`) — 그러면 `git status` 로 대조한다.
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
  `.mutate-class-owner.probe.${process.pid}.ts`,
);

/** 이 트랙이 갈라진 main — 인쇄 경로 diff 의 기준 */
const BASE = "829f5aed";
const PRINT_PATHS = [
  "src/components/print",
  "src/app/(main)/tests/[id]/print",
  "src/lib/print",
];

const T = (name: string) => `src/__tests__/${name}`;
const API = T("api/classOwner.test.ts");
const OVERVIEW = T("api/classOwnerOverview.test.ts");
const UI = T("components/classOwnerTag.test.tsx");
const UNIT = T("unit/classOwnerLabel.test.ts");
const PRINT = T("unit/classOwnerPrintFree.test.ts");

const OWNER_FILE = "src/lib/class/classOwner.ts";
const LABEL_FILE = "src/lib/class/ownerLabel.ts";
const TAG_FILE = "src/components/ui/OwnerTag.tsx";
const CLASSES_ROUTE = "src/app/api/classes/route.ts";
const TEST_ROUTE = "src/app/api/tests/[id]/route.ts";
const CONCEPT_SERVICE = "src/lib/concept/adminService.ts";
const CONCEPT_BOARD = "src/lib/concept/adminBoard.ts";
const RECENT_FILE = "src/lib/class/recentClasses.ts";
const PIPELINE_FILE = "src/lib/main/pipeline.ts";
const CARD_UI = "src/components/main/ClassCard.tsx";
const REVIEW_UI = "src/components/test/TestReview.tsx";
const OVERVIEW_UI = "src/components/unified/TeachingOverview.tsx";
const CONCEPT_UI = "src/components/unified/ConceptView.tsx";
const BASKET_UI = "src/components/problem/BasketPanel.tsx";
const SETUP_UI = "src/components/test/GenerateSetup.tsx";
// ⑨ 두 트랙 병합 뒤 리드가 붙인 자리(보고서 ⑤-1 · ⑤-2 · ⑤-3)
const DAILY_API = T("api/dailyReview.test.ts");
const DAILY_UI_T = T("components/DailyReviewSection.test.tsx");
const MANAGE_T = T("components/ClassManage.test.tsx");
const DAILY_ROUTE = "src/app/api/tests/daily-review/route.ts";
const DAILY_PLAN = "src/lib/daily/planDailyReview.ts";
const DAILY_UI = "src/components/main/DailyReviewSection.tsx";
const MANAGE_UI = "src/components/class/ClassManage.tsx";
const MANAGE_HOOK = "src/hooks/useClassManage.ts";
const PRINT_UI = "src/components/print/TestPrint.tsx";
const PRINT_PAGE = "src/app/(main)/tests/[id]/print/page.tsx";

/** tsx 탐침 머리 — 순수 헬퍼만 부른다(의존이 없어 모킹이 필요 없다) */
const PRELUDE = `
import * as co from "../../src/lib/class/classOwner";
import * as ol from "../../src/lib/class/ownerLabel";
const ADMIN = { id: "me", isAdmin: true };
const PLAIN = { id: "me", isAdmin: false };
const MINE = { name: "관리자", mine: true };
const LONG = { name: "이어하기선생님", mine: false };
void co; void ol; void ADMIN; void PLAIN; void MINE; void LONG;
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

const MUTATIONS: Mutation[] = [
  // ── ① 싣는 판정 — 두 방향 ────────────────────────────────────────────────
  {
    name: "①a 싣는 판정이 «안 싣는다» (관리자 화면에 담당이 안 뜬다)",
    file: OWNER_FILE,
    from: "  return crossesOwnerFence(viewer);",
    to: "  return false;",
    probe: "co.showsClassOwner(ADMIN)",
    tests: [UNIT, API, OVERVIEW],
  },
  {
    name: "①b 싣는 판정이 «늘 싣는다» (관리자 아닌 계정 응답이 바뀐다)",
    file: OWNER_FILE,
    from: "  return crossesOwnerFence(viewer);",
    to: "  return true;",
    probe: "co.showsClassOwner(PLAIN)",
    tests: [UNIT, API, OVERVIEW],
  },
  {
    name: "①c 싣는 판정이 빈 값도 관리자로 읽는다",
    file: OWNER_FILE,
    from: "  return crossesOwnerFence(viewer);",
    to: "  return viewer.isAdmin !== false;",
    probe: 'co.showsClassOwner({ id: "me" })',
    tests: [UNIT],
  },

  // ── ② 그리는 판정 — 두 방향 + 자리마다 «안 그린다» ─────────────────────────
  {
    name: "②a 표가 «담당» 열을 늘 세운다 (관리자 아닌 계정 표가 바뀐다)",
    file: LABEL_FILE,
    from: "  return rows.some((row) => row.owner !== undefined);",
    to: "  return true;",
    probe: "ol.hasOwners([])",
    tests: [UNIT, UI],
  },
  {
    name: "②b 표가 «담당» 열을 안 세운다",
    file: LABEL_FILE,
    from: "  return rows.some((row) => row.owner !== undefined);",
    to: "  return false;",
    probe: "ol.hasOwners([{ owner: MINE }])",
    tests: [UNIT, UI],
  },
  {
    name: "②c 메인 카드가 딱지를 안 그린다",
    file: CARD_UI,
    from: "            {row.owner ? <OwnerTag owner={row.owner} /> : null}",
    to: "            {null}",
    probe: null,
    tests: [UI],
  },
  {
    name: "②d 검토 머리가 딱지를 안 그린다",
    file: REVIEW_UI,
    from: '                <OwnerTag owner={state.classOwner} className="ml-2" />',
    to: "                <></>",
    probe: null,
    tests: [UI],
  },
  {
    name: "②e 작업실 개요가 딱지를 안 그린다",
    file: OVERVIEW_UI,
    from: '                          <OwnerTag owner={item.owner} tone="workroom" />',
    to: "                          <></>",
    probe: null,
    tests: [UI],
  },
  {
    name: "②f 오늘의 개념 판 담당 칸이 비어 있다",
    file: CONCEPT_UI,
    from: '            {row.owner ? <OwnerTag owner={row.owner} tone="workroom" /> : null}',
    to: "            {null}",
    probe: null,
    tests: [UI],
  },
  {
    name: "②g 장바구니 닫힌 상자에 title 이 없다",
    file: BASKET_UI,
    from: "            title={classOptionTitle(classes.find((c) => c.id === classId))}",
    to: "",
    probe: null,
    tests: [UI],
  },
  {
    name: "②h 출제 상자 글자가 반 이름뿐이다",
    file: SETUP_UI,
    from: "                  {classOptionLabel(item)}",
    to: "                  {item.name}",
    probe: null,
    tests: [UI],
  },

  // ── ③ 내 반 맨 위 ─────────────────────────────────────────────────────────
  {
    name: "③a 내 반 순위가 없다 (메인 · 개념 판 · 작업실 개요가 안 올린다)",
    file: OWNER_FILE,
    from: "  return owner?.mine === true ? 0 : 1;",
    to: "  return 1;",
    probe: "co.mineRank(MINE)",
    tests: [UNIT, UI, API, OVERVIEW],
  },
  {
    name: "③b 반 목록이 나머지를 내 반보다 앞에 붙인다",
    file: CLASSES_ROUTE,
    from: "    data: [...mine, ...others].map((row) => withOwner(viewer, row)),",
    to: "    data: [...others, ...mine].map((row) => withOwner(viewer, row)),",
    probe: null,
    tests: [API],
  },
  {
    name: "③c 반 목록 페이지 넘김이 내 반 수만큼 안 당긴다 (겹침 · 빠짐)",
    file: CLASSES_ROUTE,
    from: "          skip: Math.max(0, skip - mineTotal),",
    to: "          skip,",
    probe: null,
    tests: [API],
  },
  {
    name: "③d 메인 정렬이 내 반을 안 올린다",
    file: PIPELINE_FILE,
    from:
      "      mineRank(a.owner) - mineRank(b.owner) ||" +
      NL +
      "      STACK_SORT[a.stage] - STACK_SORT[b.stage],",
    to: "      STACK_SORT[a.stage] - STACK_SORT[b.stage],",
    probe: null,
    tests: [UI],
  },
  {
    name: "③e 개념 판 정렬이 내 반을 안 올린다",
    file: CONCEPT_BOARD,
    from:
      "      mineRank(a.owner) - mineRank(b.owner) ||" +
      NL +
      "      rank(a.grade) - rank(b.grade) ||",
    to: "      rank(a.grade) - rank(b.grade) ||",
    probe: null,
    tests: [UNIT, API],
  },
  {
    name: "③f 작업실 개요가 내 반을 안 올린다",
    file: RECENT_FILE,
    from: "    (c) => c.owner,",
    to: "    () => undefined,",
    probe: null,
    tests: [OVERVIEW],
  },
  {
    name: "③g 내 반 맨 위가 안정 정렬이 아니다 (묶음 안 순서가 뒤집힌다)",
    file: OWNER_FILE,
    from: "  return [...rows].sort(",
    to: "  return [...rows].reverse().sort(",
    probe:
      "co.mineFirst([{ id: 1 }, { id: 2 }], () => undefined).map((r) => r.id)",
    tests: [UNIT, OVERVIEW],
  },

  // ── ④ 6자 ────────────────────────────────────────────────────────────────
  {
    name: "④a 담당을 7자에서 자른다",
    file: LABEL_FILE,
    from: "export const OWNER_PICKER_MAX = 6;",
    to: "export const OWNER_PICKER_MAX = 7;",
    probe: 'ol.clipOwnerName("이어하기선생님")',
    tests: [UNIT, UI],
  },
  {
    name: "④b UTF-16 단위로 자른다 (보충 평면 글자가 반쪽)",
    file: LABEL_FILE,
    from: '  return Array.from(name).slice(0, max).join("");',
    to: "  return name.slice(0, max);",
    probe: 'ol.clipOwnerName("𠀀𠀁𠀂𠀃𠀄𠀅𠀆")',
    tests: [UNIT],
  },
  {
    name: "④c 자른 끝에 «…» 를 붙인다",
    file: LABEL_FILE,
    from: '  return Array.from(name).slice(0, max).join("");',
    to: '  return Array.from(name).length > max ? Array.from(name).slice(0, max).join("") + "…" : name;',
    probe: 'ol.clipOwnerName("이어하기선생님")',
    tests: [UNIT, UI],
  },
  {
    name: "④d title 도 잘린다 (마우스를 올려도 전체 이름이 안 보인다)",
    file: LABEL_FILE,
    from: "  return `${cls.name} · ${ownerTagText(cls.owner)}`;",
    to: "  return classOptionLabel(cls);",
    probe: 'ol.classOptionTitle({ name: "이어반", owner: LONG })',
    tests: [UNIT, UI],
  },
  {
    name: "④e 상자 글자가 안 잘린다",
    file: LABEL_FILE,
    from: "  const owner = cls.owner.mine ? MY_CLASS_LABEL : clipOwnerName(cls.owner.name);",
    to: "  const owner = cls.owner.mine ? MY_CLASS_LABEL : cls.owner.name;",
    probe: 'ol.classOptionLabel({ name: "이어반", owner: LONG })',
    tests: [UNIT, UI],
  },

  // ── ⑤ 계정 이름 · 내 반 · 딱지 결 ─────────────────────────────────────────
  {
    name: "⑤a 내 반 여부가 늘 거짓 (원장님 반이 «내 반»으로 안 뜬다)",
    file: OWNER_FILE,
    from: "  return { name: row.user.name, mine: row.userId === viewer.id };",
    to: "  return { name: row.user.name, mine: false };",
    probe: 'co.toClassOwner(ADMIN, { userId: "me", user: { name: "관리자" } })',
    tests: [UNIT, API, OVERVIEW],
  },
  {
    name: "⑤b 담당 이름이 계정 이름이 아니라 계정 id",
    file: OWNER_FILE,
    from: "  return { name: row.user.name, mine: row.userId === viewer.id };",
    to: "  return { name: row.userId, mine: row.userId === viewer.id };",
    probe: 'co.toClassOwner(ADMIN, { userId: "t", user: { name: "강선생" } })',
    tests: [UNIT, API],
  },
  {
    name: "⑤c 딱지가 내 반에도 계정 이름을 적는다 («내 반» 없음)",
    file: LABEL_FILE,
    from: "  return owner.mine ? MY_CLASS_LABEL : owner.name;",
    to: "  return owner.name;",
    probe: "ol.ownerTagText(MINE)",
    tests: [UNIT, UI],
  },
  {
    name: "⑤d 내 반 딱지가 먹색이 아니다",
    file: TAG_FILE,
    from: "  const look = owner.mine ? TONE[tone].mine : TONE[tone].other;",
    to: "  const look = TONE[tone].other;",
    probe: null,
    tests: [UI],
  },
  {
    name: "⑤e 만든 반의 담당 이름을 세션에서 읽는다 (계정 이름과 갈린다)",
    file: CLASSES_ROUTE,
    from: "        ? withOwner(session, { ...created, user: account })",
    to: "        ? withOwner(session, { ...created, user: { name: session.name } })",
    probe: null,
    tests: [API],
  },

  // ── ⑥ 자리마다 판정 배선 ──────────────────────────────────────────────────
  {
    name: "⑥a 반 목록이 판정을 건너뛰고 늘 담당을 싣는다",
    file: CLASSES_ROUTE,
    from: "  if (showsClassOwner(session)) {",
    to: "  if (true) {",
    probe: null,
    tests: [API],
  },
  {
    name: "⑥b 반 목록이 판정을 건너뛰고 담당을 안 싣는다",
    file: CLASSES_ROUTE,
    from: "  if (showsClassOwner(session)) {",
    to: "  if (false) {",
    probe: null,
    tests: [API],
  },
  {
    name: "⑥c 반 만들기가 늘 담당을 싣는다",
    file: CLASSES_ROUTE,
    from: "  const account = showsClassOwner(session)",
    to: "  const account = true",
    probe: null,
    tests: [API],
  },
  {
    name: "⑥d 시험지 단건이 늘 담당을 싣는다",
    file: TEST_ROUTE,
    from: "    showsClassOwner(session)" + NL,
    to: "    true" + NL,
    probe: null,
    tests: [API],
  },
  {
    name: "⑥e 개념 판이 늘 담당을 싣는다",
    file: CONCEPT_SERVICE,
    from: "  if (!showsClassOwner(viewer))",
    to: "  if (false)",
    probe: null,
    tests: [API],
  },
  {
    name: "⑥f 작업실 개요가 늘 담당을 싣는다",
    file: RECENT_FILE,
    from: "  if (!showsClassOwner(viewer)) {",
    to: "  if (false) {",
    probe: null,
    tests: [OVERVIEW],
  },

  // ── ⑦ 조회 한 번 ─────────────────────────────────────────────────────────
  {
    name: "⑦ 반 목록 내 반 묶음이 담당 조인을 빼먹는다",
    file: CLASSES_ROUTE,
    from:
      "          take: pageSize," +
      NL +
      "          orderBy," +
      NL +
      "          include: CLASS_OWNER_NAME," +
      NL,
    to: "          take: pageSize," + NL + "          orderBy," + NL,
    probe: null,
    tests: [API],
  },

  // ── ⑧ 인쇄 무변화 ───────────────────────────────────────────────────────
  {
    name: "⑧a 인쇄 틀이 딱지를 부른다",
    file: PRINT_UI,
    from: 'import { PrintAnswerKeyPage } from "@/components/print/PrintAnswerKeyPage";',
    to:
      'import { OwnerTag } from "@/components/ui/OwnerTag";' +
      NL +
      'import { PrintAnswerKeyPage } from "@/components/print/PrintAnswerKeyPage";',
    probe: null,
    tests: [PRINT],
  },
  {
    name: "⑧b 인쇄 지면 머리에 담당을 붙인다",
    file: PRINT_PAGE,
    from: "        className: test.class.name,",
    to: "        className: `${test.class.name} · 담당`,",
    probe: null,
    tests: [PRINT],
  },
  // ── ⑨ 오늘의 확인테스트 한 줄 · 반 관리 진도 머리 · 새 반 자리 ─────────────
  {
    name: "⑨a 오늘의 확인테스트 응답이 관리자에게도 담당을 안 싣는다",
    file: DAILY_ROUTE,
    from: "    showsClassOwner(session) && classIds.length",
    to: "    false && classIds.length",
    probe: null,
    tests: [DAILY_API],
  },
  {
    name: "⑨b 오늘의 확인테스트 응답이 관리자가 아니어도 담당을 싣는다",
    file: DAILY_ROUTE,
    from: "    showsClassOwner(session) && classIds.length",
    to: "    true && classIds.length",
    probe: null,
    tests: [DAILY_API],
  },
  {
    name: "⑨c 순수 함수가 학생 줄에 담당을 안 흘린다",
    file: DAILY_PLAN,
    from: "      ...(st.classOwner ? { classOwner: st.classOwner } : {}),",
    to: "",
    probe: null,
    tests: [DAILY_API],
  },
  {
    name: "⑨d 오늘의 확인테스트 한 줄에 딱지를 안 그린다",
    file: DAILY_UI,
    from: "                    {s.classOwner ? <OwnerTag owner={s.classOwner} /> : null}",
    to: "                    {null}",
    probe: null,
    tests: [DAILY_UI_T],
  },
  {
    name: "⑨e 반 관리 «진도» 머리에 딱지를 안 그린다",
    file: MANAGE_UI,
    from: '              <OwnerTag owner={selectedClass.owner} className="ml-2" />',
    to: "              <></>",
    probe: null,
    tests: [MANAGE_T],
  },
  {
    name: "⑨f 새로 만든 내 반이 목록 끝에 붙는다",
    file: MANAGE_HOOK,
    from: "      setClasses((prev) => mineFirst([...prev, created], (c) => c.owner));",
    to: "      setClasses((prev) => [...prev, created]);",
    probe: null,
    tests: [MANAGE_T],
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
  const out = tempFile("mutate-class-owner-", ".json");
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

function countAnchor(text: string, from: string): number {
  const eol = text.includes("\r\n") ? "\r\n" : NL;
  return text.split(from.split(NL).join(eol)).length - 1;
}

/** 인쇄 경로가 이 트랙의 기준(main)에서 한 글자도 안 바뀌었나 — 작업 트리까지 포함 */
function printDiff(): string[] {
  const r = spawnSync(
    "git",
    ["diff", "--name-only", BASE, "--", ...PRINT_PATHS],
    {
      cwd: ROOT,
      encoding: "utf8",
    },
  );
  if (r.status !== 0) return [`git diff 실패: ${r.stderr.trim()}`];
  return r.stdout.split(/\r?\n/).filter(Boolean);
}

function main(): number {
  const needles = process.argv.slice(2).filter((a) => a !== "--anchors");

  if (process.argv.includes("--anchors")) {
    let bad = 0;
    for (const m of MUTATIONS) {
      const count = countAnchor(readFileSync(m.file, "utf8"), m.from);
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

  const changedPrint = printDiff();
  console.log(
    changedPrint.length === 0
      ? `인쇄 경로 diff(${BASE}..작업 트리): 0 파일 ✓`
      : `🔴 인쇄 경로가 바뀌었다: ${changedPrint.join(" · ")}`,
  );

  const picked =
    needles.length > 0
      ? MUTATIONS.filter((m) => needles.some((n) => m.name.includes(n)))
      : MUTATIONS;
  if (picked.length === 0) {
    console.log(`«${needles.join(" · ")}» 과 맞는 변이가 없다`);
    return 2;
  }

  // ㉠ 음성 대조
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
  return restored &&
    changedPrint.length === 0 &&
    count("RED") === results.length
    ? 0
    : 1;
}

process.exitCode = main();
