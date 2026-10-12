/**
 * 기출 1편(정화중 25-2-중간) 적재 — **드라이런이 기본**이다.
 *
 *   npx tsx --env-file=.env scripts/import/exam-paper/load-exam-paper.ts <작업폴더>            # 드라이런
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/exam-paper/load-exam-paper.ts <작업폴더> --apply
 *   npx tsx scripts/import/exam-paper/load-exam-paper.ts <작업폴더> --regenerate-all  # 모든 정답·해설의 독립 검산 산출물만
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/exam-paper/load-exam-paper.ts <작업폴더> --revert --apply
 *
 * ## 문지기 셋
 *
 * ㉠ **AI 해설은 답이 맞을 때만 실린다.** 에이전트는 정답을 못 본 채 풀었다
 *    (`sol_ai/*.json`). 그 답이 원본 정답과 다르면 그 문항은 **해설 없이** 들어간다
 *    — 틀린 해설은 없는 해설보다 나쁘다(`apply-ai-solutions.ts` 와 같은 규율).
 * ㉡ **제품 렌더러로 본문·정답·해설을 실제로 그려 본다.** `.math-raw`·`#cc0000`·
 *    날 LaTeX 이 나오면 그 행은 안 넣는다.
 * ㉢ **소단원은 손으로 배정하되 `mapUnitHint` 와 대 본다.** 다르면 그 자리를 찍는다 —
 *    「내가 손으로 정했다」를 조용히 넘기지 않는다.
 * ㉣ **적재 직후 그 편의 `Exam` 을 세운다**(`syncExamMetadata`). 이게 없으면 문항만
 *    들어오고 **시험지가 없다** — 예상 점수 판독기(11)와 기출 대조가 이 편을 못 본다.
 *    `scripts/qa/audit-exam-wiring.ts` 가 이 자리를 감사한다 — 표시가 없으면 관문이 빨개진다.
 *
 * ## 되돌리기
 *
 * `exam-load-ledger.json` 에 넣은 id 를 적는다. `--revert` 는 그 파일만 보고 지운다.
 * 원장을 **DB 보다 먼저** 쓴다(2026-08-29 교훈 — 중간에 죽으면 되돌릴 수 없다).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { mapUnitHint } from "../../../src/lib/import/mapUnit";

import { loadExamConfig } from "./examConfig";
import {
  graphFigureFields,
  resolveGraphFigureAssignments,
} from "./graphChoiceFigures";
import { syncExamMetadata } from "../../../src/lib/import/syncExamMetadata";
import { renderMathHtml } from "../../../src/lib/math/renderMathHtml";
import { parseProblemContent } from "../../../src/lib/problem/parseProblemContent";
import { hasUnlinkedFigureChoices } from "../../../src/lib/problem/choiceFigureIndex";
import { appendSolutionNote, withoutSolutionNote } from "./examDecisions";
import { readVerifiedRegeneration } from "./regenerateExam";

const DIR = process.argv[2];
const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const REGENERATE_ALL = process.argv.includes("--regenerate-all");
if (!DIR) throw new Error("사용: <작업폴더> [--apply] [--revert]");
if (APPLY && process.env.ALLOW_SHARED_IMPORT !== "1") {
  throw new Error(
    "공유 DB 쓰기가 막혀 있다(D-31). ALLOW_SHARED_IMPORT=1 이 필요하다.",
  );
}

const LEDGER = join(DIR, "exam-load-ledger.json");
/**
 * 이 편의 `Problem.examId`. **`Exam.externalExamId` 와 다르다** — 그쪽은
 * `syncExamMetadata` 가 제 규칙으로 짓는다. 여기서는 「초안이 한 편인가」 대조에만 쓴다.
 */
// 편마다 다른 것은 `exams/<examId>/exam.json` 에 있다(2026-09-12 — 둘째 편부터).
const CFG = loadExamConfig(DIR);
const EXAM_ID = CFG.examId;
const prisma = new PrismaClient();

/**
 * 🔴 **소단원 배정 — 사람이 정했다.** 근거를 함께 적는다.
 *
 * HWP 가 주는 힌트는 넷뿐이다(`삼각비`·`삼각비의 활용`·`원과 직선`·`원주각`).
 * 그런데 우리 트리의 중3 소단원은 일곱이고, `mapUnitHint` 는 **가장 긴 이름**을 고르므로
 * `삼각비` → 「삼각비의 활용」, `원주각` → 「원주각의 활용」이 된다. 앞의 둘은 틀린다 —
 * 문1·3·4 는 활용이 아니라 뜻/값이다. 그래서 문항을 읽고 손으로 배정했다.
 *
 * ⚠️ 이 표는 **원장님 검토 대상**이다. 틀린 소단원은 진도 범위 출제에서 엉뚱한 문제로 섞인다.
 */
/**
 * 손으로 정한 **소단원**과 **문항류**. 둘 다 사람이 원문과 «원본 그림»을 보고 정한다.
 *
 * ## 🔴 `family` 를 안 쓰면 문항마다 새 류가 생긴다 (D-120)
 *
 * 이 표에 `family` 가 없던 회차에 기출 19문항이 **19개의 새 문항류**로 들어갔다.
 * 적재기가 `familyKey` 를 안 주면 DB 트리거가 `solo:` + `gen_random_uuid()` 를 찍는데,
 * 그 키는 **문항마다 유일**하기 때문이다. 원장님이 화면에서 찾으셨다 —
 * *「기출이 문항류가 전부 새로 붙었는데, 정말 새로운 문항류여서 새로 붙은 거야?」*
 * 같은 결함의 잔해가 이 6개 소단원에만 **유령 무리 95개**(문항 0, 전량 `solo:uuid`)다.
 *
 * ## 기준 — 개념축 하나 (D-120)
 *
 * **같은 정리·성질로 같은 절차를 밟으면 같은 류.** 형식(객관식/서술형)·구하는 대상
 * (길이/넓이/각)·방향(역산)·소재(나무/사다리)는 **안 가른다**. 판정은 지문 닮음으로
 * 하지 않는다 — 지문이 글자까지 같아도 개념이 셋인 자리가 있다(`삼각비` 03·19·20).
 *
 * `|E01` 처럼 **E 로 시작하는 유형 번호**는 「기출에서 태어난 새 류」다. 나머지는
 * 반드시 **그 소단원에 이미 살아 있는** 엔진 류여야 하고, 아니면 적재가 **멈춘다**
 * (아래 `assertFamilies`). 오타 한 글자면 새 류가 조용히 생기기 때문이다.
 */
const UNIT_BY_NUMBER: Record<
  number,
  { section: string; why: string; family: string }
> = Object.fromEntries(
  Object.entries(CFG.units).map(([n, u]) => [Number(n), u]),
);

/**
 * 🔴 **그림은 원본에서 옮긴다 — 다시 그리지 않는다.** (원장님 확정 2026-09-06)
 *
 * 앞 회차는 `figures/make_specs.py` 로 **발문의 값에서 좌표를 계산해** FigureSpec 을
 * 짓고 SVG 로 그렸다. 값은 전부 맞았지만(문13 을 재면 접선·지름·각이 다 정확하다)
 * **모양이 원본과 다르다** — 점 배치·비율·라벨 자리·각 표시 크기가 전부 우리 판단이다.
 * 원장님이 문10·12·13·14 와 「각 크기가 삼각형을 벗어난다」를 짚으셨고 **다섯이 한 뿌리**다.
 * 그리고 **문14 는 원본이 지도 사진**이라 도형 엔진으로는 재현이 아예 불가능하다.
 *
 * 원장님 확정: *「기출문제는 그림 완전 이전이 생명」* ·
 * *「굳이 도형 엔진으로 도형만 만들 필요 없음. 원본과 너무 차이남」*.
 *
 * 원본 PDF 에 그림이 **래스터로 박혀 있어** 바이트 그대로 꺼낼 수 있다
 * (`figures/extract_source_figures.py` → `figures/source/`).
 *
 * ## 목록을 손으로 적지 않는다
 *
 * 어느 문항에 그림이 몇 장인지는 **추출기의 색인**(`source/index.json`)이 안다.
 * 손으로 적으면 세는 쪽과 넣는 쪽이 갈라진다 — 이 저장소가 여러 번 데인 자리다.
 * (문3 은 원본에 그림이 정말 없다. 문19 는 서술형 ⑴⑵ 라 두 장이다.)
 */
interface SourceFigure {
  number: number;
  file: string;
  /** 원본 지면에서 그 그림이 차지하던 **물리 폭(mm)**. `figureSourceMm` 의 근거다. */
  widthMm: number;
  /** 파일의 픽셀 치수 `[w, h]`. `figureDims` 의 근거다. */
  px: [number, number];
}

// ⚠️ `import.meta.dirname` 은 tsx 가 CJS 로 옮기면 `undefined` 다(실측). 저장소 뿌리에서
//    부르는 스크립트라 `cwd` 로 잡고, 없으면 `readSourceFigures` 가 경로째 찍고 멈춘다.
// 편마다 원본 그림 폴더가 따로다 — 첫 편은 `figures/source/` 한 곳을 썼다.
const FIGURE_SRC_DIR = join(DIR, "figures");

/**
 * 배포 경로의 조각. **학교를 가리키면 안 된다** — `EXAM_ID` 에는 학교 이름이 들어 있어
 * 그대로 쓰면 URL 이 학교를 말한다(원장님 지시: 그림 파일 경로에 학교명 금지).
 * 해시는 편마다 **한 값으로 고정**이라 다시 적재해도 같은 자리에 간다(멱등).
 */
const FIGURE_SLUG = createHash("sha1")
  .update(EXAM_ID)
  .digest("hex")
  .slice(0, 10);
const FIGURE_URL_BASE = `/figures/exam/${FIGURE_SLUG}`;
const FIGURE_OUT_DIR = join(
  process.cwd(),
  "public",
  "figures",
  "exam",
  FIGURE_SLUG,
);

/** 문항번호 → 원본 그림들. 추출기 색인에서 읽는다. */
function readSourceFigures(): Map<number, SourceFigure[]> {
  const indexPath = join(FIGURE_SRC_DIR, "index.json");
  if (!existsSync(indexPath))
    throw new Error(
      `[중단] 원본 그림 색인이 없다: ${indexPath}\n` +
        "  figures/extract_source_figures.py 를 먼저 돌릴 것 — " +
        "그림을 다시 그리는 길로 되돌아가지 않는다",
    );
  const idx = JSON.parse(readFileSync(indexPath, "utf-8")) as {
    figures: SourceFigure[];
  };
  const by = new Map<number, SourceFigure[]>();
  for (const f of resolveGraphFigureAssignments(
    idx.figures,
    CFG.graphChoices,
  )) {
    const src = join(FIGURE_SRC_DIR, f.file);
    if (!existsSync(src))
      throw new Error(`[중단] 색인이 가리키는 ${f.file} 이 없다`);
    if (!(f.widthMm > 0))
      throw new Error(`[중단] ${f.file} 의 widthMm 가 없다`);
    if (!by.has(f.number)) by.set(f.number, []);
    by.get(f.number)!.push(f);
  }
  return by;
}

/**
 * 원본 파일을 배포 경로로 **바이트 그대로** 옮긴다.
 *
 * ⚠️ 옮긴 뒤 **바이트를 대조한다.** 「복사했다」와 「같은 파일이 거기 있다」는 다른 말이고,
 *    다르면 그건 이미 «다시 그린 것»이다.
 * ⚠️ 이 파일들은 **커밋되어야** 한다 — 공유 DB 는 코드보다 먼저 나가므로, 밀지 않으면
 *    production 의 DB 는 URL 을 알고 배포본에 파일이 없다(CLAUDE.md 2026-08-20).
 *    `pre-push` 의 `checkDeployedFigures` 가 이 자리를 지킨다.
 */
function copyFigures(figs: SourceFigure[]): string[] {
  mkdirSync(FIGURE_OUT_DIR, { recursive: true });
  return figs.map((f) => {
    const src = join(FIGURE_SRC_DIR, f.file);
    const dst = join(FIGURE_OUT_DIR, f.file);
    const bytes = readFileSync(src);
    if (!existsSync(dst) || !readFileSync(dst).equals(bytes))
      writeFileSync(dst, bytes);
    if (!readFileSync(dst).equals(bytes))
      throw new Error(`[중단] ${f.file} 이 원본과 다르다 — 완전 이전이 아니다`);
    return `${FIGURE_URL_BASE}/${f.file}`;
  });
}

/** 지면에 날 것이 나가나 — **제품 렌더러**로 판정한다(규칙을 옮겨 적지 않는다). */
function renderFaults(text: string): string[] {
  if (!text) return [];
  const bad: string[] = [];
  if ((text.match(/\$/g)?.length ?? 0) % 2 !== 0) bad.push("$ 가 홀수다");
  const html = renderMathHtml(text);
  if (html.includes("math-raw")) bad.push("KaTeX 가 포기했다");
  if (html.includes("#cc0000")) bad.push("붉은 글씨");
  if (html.includes("katex-error")) bad.push("katex-error");
  const plain = html.replace(/<[^>]+>/g, "");
  const raw = plain.match(/\\[A-Za-z]{2,}/);
  if (raw) bad.push(`날 LaTeX ${raw[0]}`);
  return bad;
}

/** 기출에서 태어난 새 문항류의 유형 번호 (`…|E01`). 엔진 번호와 겹칠 수 없다. */
const NEW_FAMILY_RE = /\|E\d{2}$/;

/**
 * 🔴 **배정한 문항류가 그 소단원에 정말 있는가** (D-120).
 *
 * 오타 한 글자면 트리거가 **새 류를 조용히 만든다** — 이번 결함이 정확히 그 모양이다.
 * 그래서 `E` 가 아닌 키는 「그 소단원에 **살아 있는 문항이 붙은** 무리」여야 한다.
 * ⚠️ 「무리 행이 있다」로는 부족하다 — 유령 무리 95개가 행만 있고 문항이 0개다.
 * 개념축(D-120)에서 문항이 하나도 없는 무리는 **개념이 아니다.**
 *
 * 그리고 판정 **전에** 일부러 틀린 키를 대 본다. 「0건」이 «깨끗»인지 «못 셈»인지
 * 갈라야 한다 — 도장은 «아니오»를 못 낸다.
 */
async function assertFamilies(
  bySection: Map<string, { id: string; section: string }>,
): Promise<void> {
  const sections = [
    ...new Set(Object.values(UNIT_BY_NUMBER).map((v) => v.section)),
  ];
  /** 소단원 → 그 소단원에서 **문항이 붙어 있는** 무리 키. */
  const live = new Map<string, Set<string>>();
  for (const section of sections) {
    const unit = bySection.get(section);
    if (!unit) throw new Error(`[중단] 소단원 «${section}» 이 트리에 없다`);
    const rows = await prisma.problem.findMany({
      where: { unitId: unit.id, source: { not: "past_exam" } },
      select: { familyKey: true },
      distinct: ["familyKey"],
    });
    live.set(
      section,
      new Set(rows.map((r) => r.familyKey).filter((k): k is string => !!k)),
    );
  }

  const judge = (section: string, key: string): string | null => {
    if (NEW_FAMILY_RE.test(key)) {
      return live.get(section)!.has(key)
        ? `«${key}» 는 새 류(E)인데 «${section}» 에 이미 있다 — 번호를 새로 딸 것`
        : null;
    }
    return live.get(section)!.has(key)
      ? null
      : `«${key}» 가 «${section}» 에 없다 — 오타면 새 류가 조용히 생긴다`;
  };

  // ── 음성 대조: 이 검사가 «아니오» 를 낼 수 있는가 ──────────────────────
  const first = Object.values(UNIT_BY_NUMBER)[0]!;
  const [probeSection, probe] = [first.section, first.family];
  if (judge(probeSection, `${probe}0`) === null)
    throw new Error(
      "[중단] 문항류 검사가 일부러 틀린 키를 통과시킨다 — 검사가 눈이 멀었다",
    );
  if (judge(probeSection, probe) !== null)
    throw new Error(
      `[중단] 문항류 검사가 «${probe}» 를 막는다 — 늘 우는 가드는 꺼진다`,
    );

  const bad: string[] = [];
  let reused = 0;
  let born = 0;
  for (const [n, v] of Object.entries(UNIT_BY_NUMBER)) {
    const why = judge(v.section, v.family);
    if (why) bad.push(`문${n}: ${why}`);
    else if (NEW_FAMILY_RE.test(v.family)) born += 1;
    else reused += 1;
  }
  if (bad.length > 0)
    throw new Error(`[중단] 문항류 배정이 어긋난다\n  ${bad.join("\n  ")}`);
  console.log(
    `문항류 배정 확인 — 기존 무리 ${reused} · 새 류 ${born} (개념축 D-120)\n`,
  );
}

/** 답 표기 차이를 접는다 — ①↔1, `$`·공백. */
function normAnswer(s: string): string {
  let t = (s ?? "").trim();
  for (const set of ["①②③④⑤", "➀➁➂➃➄"]) {
    for (let i = 0; i < set.length; i += 1)
      t = t.split(set[i]!).join(String(i + 1));
  }
  return t.replace(/[$\s]/g, "");
}

interface Draft {
  externalId: string;
  source: string;
  difficulty: string;
  problemType: string;
  questionType: string;
  content: string;
  answer: string;
  solution: string | null;
  unitHint: string;
  questionNumber: number | null;
  score: number | null;
  sourceFile: string | null;
  school: string | null;
  subject: string | null;
  examId: string | null;
  choiceFigureIndex?: number[];
}

async function revert(): Promise<void> {
  if (!existsSync(LEDGER))
    throw new Error("[중단] 원장이 없다 — 되돌릴 것이 없다");
  const led = JSON.parse(readFileSync(LEDGER, "utf-8")) as { ids: string[] };
  console.log(`원장에 ${led.ids.length}행`);
  if (!APPLY) return console.log("드라이런 — --apply 를 붙여야 지운다");
  // 🔴 문항만 지우면 `exam_question.problem_id` 가 **죽은 uuid** 를 가리킨 채 남는다 —
  //    그 컬럼에는 FK 가 없어 DB 가 안 막아 준다. 그래서 편도 같이 지운다.
  //
  //    ⚠️ 편을 **`externalExamId` 상수로 찾으면 안 된다.** `syncExamMetadata` 는 제 규칙으로
  //    키를 짓는다(우리가 준 `2025-jeonghwa-3-2-mid` 가 아니라 `정화중|중3|중3|2025-2-중간`).
  //    처음에 그렇게 짰다가 **아무것도 안 지우면서 「지웠다」고 찍었다.**
  //    그러니 「우리 행이 실제로 걸려 있는 편」을 **링크에서** 찾는다.
  const links = await prisma.examQuestion.findMany({
    where: { problemId: { in: led.ids } },
    select: { examId: true },
  });
  const examIds = [...new Set(links.map((l) => l.examId))];
  // 그 편에 **우리 것 아닌 문항**이 하나라도 걸려 있으면 편은 안 지운다.
  const mine = new Set(led.ids);
  const keep = new Set<string>();
  for (const examId of examIds) {
    const all = await prisma.examQuestion.findMany({
      where: { examId },
      select: { problemId: true },
    });
    if (all.some((q) => q.problemId && !mine.has(q.problemId)))
      keep.add(examId);
  }
  const r = await prisma.problem.deleteMany({ where: { id: { in: led.ids } } });
  const drop = examIds.filter((id) => !keep.has(id));
  const e = await prisma.exam.deleteMany({ where: { id: { in: drop } } });
  console.log(
    `지웠다: 문항 ${r.count}행 · 시험지 ${e.count}편` +
      (keep.size > 0 ? ` · 남의 문항이 섞여 안 지운 편 ${keep.size}` : ""),
  );
  if (examIds.length === 0) {
    console.log(
      "⚠️ 이 행들에 걸린 시험지가 없다 — 배선 전에 넣은 회차일 수 있다",
    );
  }
}

async function main(): Promise<void> {
  if (REVERT) return revert();

  // Explicit opt-in: fail before DB reads or figure writes while any regenerated
  // answer/solution is missing, stale, rejected, or awaiting independent verification.
  const regenerated = REGENERATE_ALL ? readVerifiedRegeneration(DIR) : null;
  const drafts = JSON.parse(
    readFileSync(join(DIR, "drafts.json"), "utf-8"),
  ) as Draft[];

  // ── 단원 ────────────────────────────────────────────────────────────────
  const units = await prisma.unit.findMany({
    where: { grade: CFG.grade },
    select: { id: true, grade: true, chapter: true, section: true },
  });
  const bySection = new Map(units.map((u) => [u.section, u]));
  console.log(`중3 소단원 ${units.length}개\n`);

  await assertFamilies(bySection);
  {
    // 초안 번호와 손 표가 **양쪽으로** 맞는가 — 한쪽만 보면 빠진 문항이 조용히 안 들어간다.
    const nums = new Set(drafts.map((x) => x.questionNumber));
    const table = new Set(Object.keys(UNIT_BY_NUMBER).map(Number));
    const noUnit = [...nums].filter((n) => !table.has(n!));
    const noDraft = [...table].filter((n) => !nums.has(n));
    if (noUnit.length > 0 || noDraft.length > 0)
      throw new Error(
        `[중단] 초안과 소단원 표가 어긋난다 — 표에 없는 문항 ${noUnit.join(",")} · 초안에 없는 표 ${noDraft.join(",")}`,
      );
  }

  const sourceFigures = readSourceFigures();
  console.log(
    `원본 그림 ${[...sourceFigures.values()].flat().length}장 / ${sourceFigures.size}문항 — ` +
      `배포 경로 ${FIGURE_URL_BASE}`,
  );

  // ── 조립 ────────────────────────────────────────────────────────────────
  const ai = new Map<
    number,
    { answer: string; solution: string; note?: string }
  >();
  // 첫 편은 `n <= 11` 로 박혀 있었다 — 객관식이 1~11 번이었기 때문이다. 편마다 다르다.
  if (!REGENERATE_ALL)
    for (const n of drafts.map((x) => x.questionNumber!)) {
      const p = join(DIR, "sol_ai", `q${String(n).padStart(2, "0")}.json`);
      if (existsSync(p)) ai.set(n, JSON.parse(readFileSync(p, "utf-8")));
    }

  const rows: Record<string, unknown>[] = [];
  const skipped: string[] = [];
  let aiOk = 0;
  let aiBad = 0;
  let unitDiff = 0;

  for (const d of drafts) {
    const n = d.questionNumber!;
    const excluded = CFG.excludeFromLoad?.[n];
    if (excluded) {
      skipped.push(`문${n}: 적재 제외 — ${excluded}`);
      continue;
    }
    const want = UNIT_BY_NUMBER[n];
    const unit = bySection.get(want.section);
    if (!unit) {
      if (regenerated)
        throw new Error(
          `[중단] 문${n}: 재생성 문항의 소단원 «${want.section}» 이 트리에 없다`,
        );
      skipped.push(`문${n}: 소단원 «${want.section}» 이 트리에 없다`);
      continue;
    }
    // 손 배정 ↔ 기계 배정 대조 (기계가 틀리는 자리를 눈에 보이게 남긴다)
    const auto = mapUnitHint(d.unitHint, units, CFG.grade);
    const autoSection =
      auto.status === "mapped"
        ? (units.find((u) => u.id === auto.unitId)?.section ?? "?")
        : "미분류";
    if (autoSection !== want.section) {
      unitDiff += 1;
      console.log(
        `  문${String(n).padStart(2)} 단원: 손 «${want.section}» ← 기계 «${autoSection}» (힌트 «${d.unitHint}»)\n` +
          `        근거: ${want.why}`,
      );
    }

    // ── 해설 ──────────────────────────────────────────────────────────────
    let answer = d.answer;
    let solution = withoutSolutionNote(d.solution, CFG.solutionNotes?.[n]);
    let solutionSource: "none" | "original" | "ai" = solution
      ? "original"
      : "none";
    const gen = ai.get(n);
    if (regenerated) {
      const verified = regenerated.get(n);
      if (!verified) throw new Error(`[중단] 문${n} 재생성 검산 결과가 없다`);
      answer = verified.answer;
      solution = verified.solution;
      solutionSource = "ai";
      aiOk += 1;
    } else if (!solution && gen) {
      if (normAnswer(gen.answer) !== normAnswer(d.answer)) {
        aiBad += 1;
        console.log(
          `  🔴 문${n} AI 답 «${gen.answer}» ≠ 원본 «${d.answer}» — 해설을 안 넣는다` +
            (gen.note ? `\n        AI 메모: ${gen.note}` : ""),
        );
      } else {
        const faults = renderFaults(gen.solution);
        if (faults.length > 0) {
          aiBad += 1;
          console.log(
            `  🔴 문${n} AI 해설이 지면에서 깨진다: ${faults.join(" · ")}`,
          );
        } else {
          solution = gen.solution;
          solutionSource = "ai";
          aiOk += 1;
        }
      }
    }

    // A verified regenerated solution is adopted verbatim; legacy notes stay in the legacy path.
    if (!regenerated)
      solution = appendSolutionNote(solution, CFG.solutionNotes?.[n]);

    // ── 지면 검사 ─────────────────────────────────────────────────────────
    const figs = sourceFigures.get(n) ?? [];
    const choiceFigureIndex =
      graphFigureFields(CFG.graphChoices?.[n], figs).choiceFigureIndex ??
      d.choiceFigureIndex;
    const unlinked = hasUnlinkedFigureChoices(
      figs.length,
      choiceFigureIndex,
      parseProblemContent(d.content).choices,
    );
    if (unlinked)
      console.log(`  문${n}: 출제 잠금 — 보기 그림 연결을 확인할 수 없다`);

    const faults = [
      ...renderFaults(d.content).map((f) => `본문: ${f}`),
      ...renderFaults(answer).map((f) => `정답: ${f}`),
      ...renderFaults(solution ?? "").map((f) => `해설: ${f}`),
    ];
    if (faults.length > 0) {
      if (regenerated)
        throw new Error(
          `[중단] 문${n} 재생성 지면 검사: ${faults.join(" · ")}`,
        );
      skipped.push(`문${n}: ${faults.join(" · ")}`);
      continue;
    }

    rows.push({
      unitId: unit.id,
      // 🔴 이 줄이 없으면 트리거가 문항마다 `solo:uuid` 를 찍는다 (D-120).
      familyKey: want.family,
      source: "past_exam",
      difficulty: d.difficulty,
      problemType: d.problemType,
      questionType: d.questionType,
      content: d.content,
      answer,
      solution,
      solutionSource,
      // 🔴 원본을 옮긴다. `figureSvg`(우리가 다시 그린 것)는 **안 쓴다**.
      figureUrls: figs.length > 0 ? copyFigures(figs) : [],
      ...(choiceFigureIndex ? { choiceFigureIndex } : {}),
      figureDims: figs.flatMap((f) => f.px),
      figureSourceMm: figs.map((f) => f.widthMm),
      figureSvg: null,
      figureSource: figs.length > 0 ? "source" : null,
      externalId: d.externalId,
      sourceFile: d.sourceFile,
      school: d.school,
      subject: d.subject,
      examId: d.examId,
      questionNumber: n,
      score: d.score,
      reviewStatus: "approved",
      // 원본 기출은 패턴 확인용이다. 학생 출제에는 별도 자작 엔진 문항을 쓴다.
      directUseAllowed: false,
      pool: "shared",
    });
  }

  console.log(
    `\nAI 해설 채움 ${aiOk} · 막힘 ${aiBad} · 원본 해설 ${
      rows.filter((r) => r.solutionSource === "original").length
    }`,
  );
  console.log(`손↔기계 단원이 다른 자리 ${unitDiff}개 (위에 찍었다)`);
  console.log(`넣을 행 ${rows.length} · 뺀 행 ${skipped.length}`);
  for (const s of skipped) console.log(`  ⛔ ${s}`);
  console.log(
    `그림 붙은 행 ${rows.filter((r) => (r.figureUrls as string[]).length > 0).length} · ` +
      `해설 있는 행 ${rows.filter((r) => r.solution).length}`,
  );

  if (!APPLY) {
    console.log("\n드라이런이다 — 아무것도 안 넣었다.");
    writeFileSync(
      join(DIR, "load_rows.json"),
      JSON.stringify(rows, null, 1),
      "utf-8",
    );
    console.log(`넣을 행을 load_rows.json 에 적어 뒀다`);
    return;
  }

  // 이미 들어간 것이 있으면 멈춘다 — externalId 가 유일 키다.
  const dup = await prisma.problem.findMany({
    where: { externalId: { in: rows.map((r) => r.externalId as string) } },
    select: { externalId: true },
  });
  if (dup.length > 0) {
    throw new Error(
      `[중단] 이미 들어간 externalId 가 ${dup.length}개 있다: ${dup
        .slice(0, 3)
        .map((d) => d.externalId)
        .join(", ")}…`,
    );
  }

  const ids: string[] = [];
  // 🔴 원장을 **먼저** 연다 — 중간에 죽으면 되돌릴 근거가 없다(2026-08-29).
  writeFileSync(
    LEDGER,
    JSON.stringify({ ids, note: "적재 중" }, null, 1),
    "utf-8",
  );
  for (const row of rows) {
    // exam-wiring: 기출·배선됨 — 적재 직후 syncExamMetadata 로 그 편의 Exam 을 세운다
    const created = await prisma.problem.create({
      data: row as never,
      select: { id: true, problemCode: true, questionNumber: true },
    });
    ids.push(created.id);
    writeFileSync(LEDGER, JSON.stringify({ ids }, null, 1), "utf-8");
    console.log(`  넣음 문${created.questionNumber} → ${created.problemCode}`);
  }
  // 기출이 들어왔으면 **그 시험지도 함께 선다.** 문항만 넣으면 예상 점수 판독기(11)와
  // 기출 대조가 이 편을 못 본다 — `scripts/import/load-classified.ts` 와 같은 배선이다.
  const examIds = [...new Set(rows.map((r) => r.examId as string))];
  if (examIds.length !== 1 || examIds[0] !== EXAM_ID) {
    throw new Error(
      `[중단] 초안의 examId 가 «${examIds.join(", ")}» 인데 되돌리기 상수는 «${EXAM_ID}» 다 — ` +
        "둘이 갈리면 되돌리기가 엉뚱한 편을 지운다",
    );
  }
  const sync = await syncExamMetadata(prisma, examIds);
  console.log(`\n적재 ${ids.length}행 · 원장 ${LEDGER}`);
  console.log(
    `시험지 배선 — 새로 ${sync.inserted} · 갱신 ${sync.updated} · 못 세움 ${sync.invalid}` +
      (sync.unclassified.length > 0
        ? ` · 판단불가 ${sync.unclassified.map((u) => u.reason).join(", ")}`
        : "") +
      (sync.excluded.length > 0
        ? ` · 제외 ${sync.excluded.map((u) => u.reason).join(", ")}`
        : "") +
      (sync.collided.length > 0
        ? ` · 문항번호 충돌 ${sync.collided.map((u) => u.key).join(", ")}`
        : ""),
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
