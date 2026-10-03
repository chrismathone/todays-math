/**
 * 기출 1편(정화중 25-2-중간)을 **저장소의 기존 이관 파이프라인**으로 초안까지 만든다.
 *
 *   npx tsx scripts/import/exam-paper/build-exam-drafts.ts <작업폴더>
 *
 * 변환기를 새로 만들지 않는다 — `convertPastExamPaper` 가 이미 있다(18 §연장 색인).
 *
 * ## 🔴 본문의 정본은 **HWP** 다 — PDF 텍스트층이 아니다
 *
 * 처음엔 완료 PDF 의 텍스트층에서 뽑은 `body.json` 을 본문으로 썼다. 그런데 그쪽은
 * **조판을 잃는다** — 실측으로
 *
 *   문5  보기가 `tan 35° + tan 50° 8`   ← 분수가 풀려 8 이 뒤로 떨어졌다
 *   문10 `$_{6}$ CT $=5$ BC`            ← 호 표시와 계수가 통째로 깨졌다
 *   문12 발문이 **통째로 없다**
 *   문3  상자 ㉠~㉣ 구조가 `•` 로 뭉갰다
 *   문1·4·6…  `\overline` 가 전부 사라졌다 (선분이 그냥 두 글자가 된다)
 *
 * 같은 `(완료)` 짝의 HWP 에는 그 전부가 **수식 스크립트로** 살아 있다
 * (`$rmbarAF$` → `\overline{AF}`). 그래서 본문·보기는 HWP 에서 가져오고,
 * PDF 쪽은 **대조용**으로만 쓴다(한글+숫자 열쇠로 19문항 전량 0.89 이상 — 같은 시험지다).
 *
 * ## 🔴 그런데 HWP 쪽에도 **다른** 오염이 있다 — 그리고 그중 하나는 개인정보다
 *
 * 문19 발문 끝에 `정답 / 워드:○○○t / 오검:○○○t / 완료:○○○t` 가 붙어 있다.
 * 검수자 실명이다 — **DB 에 들어가면 안 된다.** 문3 에는 연구회 꼬리말이 붙었다.
 * 걷어 낸 뒤 **남았는지 다시 세고**, 그 검사가 살아 있는지 일부러 걸리는 글로 확인한다.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { blocksToLatex } from "../../../src/lib/import/blocksToLatex";
import {
  convertPastExamPaper,
  normalizePastExamPaper,
  type PastExamAnswer,
  type PastExamPaper,
} from "../../../src/lib/import/convertPastExam";

import { loadExamConfig } from "./examConfig";
import { repairExamPieces, withoutSharedPassage } from "./repairExamPieces";
import { repairEquationScopes } from "./repairEquationScopes";
import { repairExamText } from "./repairExamText";
import {
  graphFigureFields,
  resolveGraphFigureAssignments,
  restoreGraphChoices,
} from "./graphChoiceFigures";
import { splitAnswer } from "./splitAnswer";
import {
  appendSolutionNote,
  correctExamChoices,
  correctExamSolutions,
} from "./examDecisions";
import {
  BOX_MARKER_RE,
  restoreBoxMarker as restoreSourceBoxMarker,
} from "./restoreBoxMarker";

const restoreBoxMarker = (stem: string, fromPdf: string, n: number) =>
  restoreSourceBoxMarker(stem, fromPdf, n, TABLES.has(n));

const DIR = process.argv[2];
if (!DIR) throw new Error("사용: <작업폴더>");
// 편마다 다른 것은 `exams/<examId>/exam.json` 에 있다(2026-09-12 — 둘째 편부터).
// units 는 여기서 안 쓴다 — 적재기만 필요하다(대량 이관은 초안이 먼저다).
const CFG = loadExamConfig(DIR, { requireUnits: false });

const read = (f: string): unknown =>
  JSON.parse(readFileSync(join(DIR, f), "utf-8"));

interface HwpQuestion {
  number: number;
  type: string;
  score: number;
  topic: string;
  difficulty: string;
  answer: string | null;
  solution: string | null;
  label?: string | null;
}

const hwp = read("answers.json") as { questions: HwpQuestion[] };
const pdf = read("body.json") as PastExamPaper;
const graphFields = new Map<number, { choiceFigureIndex?: number[] }>();
if (Object.keys(CFG.graphChoices ?? {}).length > 0) {
  const source = read("figures/index.json") as {
    figures: { number: number; file: string }[];
  };
  const assigned = resolveGraphFigureAssignments(
    source.figures,
    CFG.graphChoices,
  );
  for (const [number, repair] of Object.entries(CFG.graphChoices ?? {})) {
    const figures = assigned.filter((f) => f.number === Number(number));
    for (const f of figures) {
      if (!existsSync(join(DIR, "figures", f.file)))
        throw new Error(`[중단] 원본 그림 ${f.file}이 없다`);
    }
    graphFields.set(Number(number), graphFigureFields(repair, figures));
  }
}
const piece = correctExamChoices(
  repairExamPieces(
    new Map(
      (read("hwp_fixed.json") as { id: string; text: string }[]).map((r) => [
        r.id,
        repairExamText(repairEquationScopes(r.text)),
      ]),
    ),
    hwp.questions,
  ),
  CFG.choiceCorrections,
);
const solFixed = correctExamSolutions(
  new Map(
    (read("sol_fixed.json") as { id: string; text: string }[]).map((r) => [
      r.id,
      repairExamText(repairEquationScopes(r.text)),
    ]),
  ),
  CFG.solutionCorrections,
);

// ── ㉠ 발문에 붙은 지면 오염을 걷는다 ───────────────────────────────────────
interface Scrub {
  name: string;
  re: RegExp;
  probe: string;
}
const SCRUBS: Scrub[] = [
  {
    // 🔴 검수자 실명 — 개인정보다. 문서 끝의 「정답 / 워드: / 오검: / 완료:」 블록.
    name: "검수자 실명 블록",
    // 콜론이 빠진 줄도 있다(2026-09-13 오성중 문21 「오검김미랑t」). 콜론을 필수로 두면 블록 **전체**가
    // 안 걸려 이름이 남는다 — 뒤의 «개인정보» 가드가 편을 멈춰서 새지는 않았다. 눈금 문자열에 그 꼴을 넣어,
    // 옛 규칙(콜론 필수)으로는 눈금이 안 걸리게 해 두었다.
    re: /\s*정답\s*(?:(?:워드|오검|검토|검수|완료|출제)\s*[::]?[^\n]*\s*)+$/u,
    probe:
      "…개수를 구하시오.\n \n정답\n워드:홍길동t\n오검김철수t \n완료:홍길동t",
  },
  {
    // 🔴 원본에 박힌 **숨은 글자층**(워터마크·복제 방지 문자열로 보인다) — base64 꼴의 긴 덩어리.
    // 2026-09-13 월배중: 발문·보기 112행 전부에 들어 있다. HWP 추출과 PDF 텍스트층 **둘 다**에 있어
    // 변환 결함이 아니라 원본이다. 🔴 «영숫자 40자 이상» 만으로 걸면 경상중의 신발 치수 자료 나열
    // (`230230235…`, 공백이 빠진 숫자)을 **지운다** — 그래서 소문자·대문자·(숫자 또는 +/=)가 **섞인**
    // 덩어리만 건다. 전수 대조: 월배중 418조각(발문·보기 209 + PDF 텍스트층 209)만 걸리고 다른 편 0.
    // 해설에는 이 걷기가 안 닿는다(scrub 은 발문·보기만) — 월배중 해설 22 한 행은 exam.json 손 고침으로 걷는다.
    // 정규식을 문자열로 쓴 까닭: 문자 모음 안의 `/` 를 역슬래시로 막으면 ESLint 가 쓸데없는 이스케이프라 한다.
    name: "숨은 글자층(base64 덩어리)",
    re: new RegExp(
      "(?=[A-Za-z0-9+/=]*[a-z])(?=[A-Za-z0-9+/=]*[A-Z])(?=[A-Za-z0-9+/=]*[0-9+/=])[A-Za-z0-9+/=]{40,}",
      "gu",
    ),
    probe:
      "그림과 같은 R6ceh2JsHW6YPH+sMuDnt7iKyPAHpa/aguBk2YMfIL5lImHEZ0bnucDnPbEx42v",
  },
  {
    name: "연구회 꼬리말",
    re: /\s*(?:[가-힣]+(?:광역시|특별시|도)\s*)?내신\s*수학\s*연구회\s*/gu,
    probe: "…이다.\n대구광역시 내신 수학 연구회\n",
  },
  {
    // 배점은 `score` 컬럼이 정본이다. 지면에 두면 우리 시험지의 배점과 어긋난다
    // (2026-08-29 「가짜 번호가 지면에 거짓말을 찍는다」와 같은 자리).
    name: "총 배점 표시",
    re: /\s*\[총\s*\$?\d+\$?\s*점\]\s*/gu,
    probe: "다음 물음에 답하시오. [총 $10$점]\n⑴ …",
  },
];

/**
 * 이 편의 학교. **메타에만 남고 지면에는 안 나간다.**
 *
 * 🔴 원장님 지시(2026-09-06): *「문제에 〈정화〉 같은 학교 추측 가능한 문제들은
 * 다른 이름으로 교체할 것, 적절한 네임으로」*. 실제로 문14 발문이
 * 「**정화**는 매직아일랜드가 있는 C지점으로부터…」로 학교 이름을 **사람 이름처럼**
 * 쓰고 있었다. 지면 머리띠는 `JH중` 으로 가려 두었는데 **본문이 그 가림을 무의미하게**
 * 만든다.
 *
 * 바꾸는 것과 남았는지 세는 것이 **같은 값 하나**(`SCHOOL_STEM`)를 본다 — 두 벌이면
 * 한쪽만 고쳐도 아무도 모른다.
 */
const SCHOOL = CFG.school;
/** 학교를 가리키는 알맹이 (`정화중` → `정화`). */
const SCHOOL_STEM = SCHOOL.replace(/(?:여자)?(?:중학교|고등학교|중|고)$/u, "");

/**
 * 걷는 것이 아니라 **바꾸는 것.** 지우면 문장이 무너진다(「는 매직아일랜드가…」).
 *
 * ⚠️ **장소 이름은 그대로 둔다.** 롯데월드·잠실역·석촌호수는 학교를 안 가리키고,
 *    원본 그림(지도)에 그대로 있으므로 본문만 바꾸면 오히려 어긋난다
 *    (원장님 확정 「기출문제는 그림 완전 이전이 생명」).
 */
const RENAMES: (Scrub & { to: string })[] = [
  {
    name: "🔴 학교를 추측할 수 있는 사람 이름",
    re: new RegExp(SCHOOL_STEM, "gu"),
    to: "수아",
    probe: `${SCHOOL_STEM}는 매직아일랜드가 있는 지점으로부터`,
  },
];

/** 걷어 낸 **뒤에** 남으면 안 되는 것. 각 항목도 probe 로 눈금을 맞춘다. */
const FORBIDDEN: Scrub[] = [
  {
    // 참을 `SCHOOL` 하나에서 가져온다. 바꾸기가 새면 여기서 멈춘다.
    name: "🔴 학교를 추측할 수 있는 이름",
    re: new RegExp(SCHOOL_STEM, "u"),
    probe: `${SCHOOL_STEM}는 매직아일랜드로 갔다`,
  },
  {
    name: "🔴 개인정보(검수자 실명)",
    re: /(?:워드|오검|검토|검수|완료|출제)\s*[::]\s*[가-힣]/u,
    probe: "완료:홍길동t",
  },
  {
    name: "🔴 이름 + t 꼬리",
    re: /[가-힣]{2,4}\s*t(?![a-z])/u,
    probe: "황수영t",
  },
  {
    name: "연구회 꼬리말",
    re: /내신\s*수학\s*연구회/u,
    probe: "내신 수학 연구회",
  },
  {
    // 제어문자는 리터럴로 적으면 파일이 깨진다 — 문자열에서 짓는다.
    name: "NUL 등 제어문자",
    re: new RegExp("[\u0000-\u0008\u000B\u000C\u000E-\u001F]", "u"),
    probe: "a" + String.fromCharCode(0) + "b",
  },
];

for (const s of [...SCRUBS, ...RENAMES, ...FORBIDDEN]) {
  const changed = s.re.test(s.probe);
  s.re.lastIndex = 0;
  if (!changed) {
    throw new Error(`[중단] 눈금이 안 걸린다: ${s.name} — 판정을 거부한다`);
  }
}
// 바꾸기는 「걸리나」로 부족하다 — **바뀐 글에 그 이름이 없어야** 한다.
for (const r of RENAMES) {
  r.re.lastIndex = 0;
  const after = r.probe.replace(r.re, r.to);
  r.re.lastIndex = 0;
  if (r.re.test(after))
    throw new Error(`[중단] 바꾸기가 제 눈금도 못 지운다: ${r.name}`);
  r.re.lastIndex = 0;
}
console.log(
  `눈금 통과 — 걷기 ${SCRUBS.length}개 · 바꾸기 ${RENAMES.length}개 · ` +
    `금지 ${FORBIDDEN.length}개 전부 살아 있다`,
);

function scrub(text: string): { out: string; hits: string[] } {
  let out = text;
  const hits: string[] = [];
  for (const s of SCRUBS) {
    s.re.lastIndex = 0;
    const before = out;
    out = out.replace(s.re, s.re.flags.includes("g") ? " " : "");
    if (out !== before) hits.push(s.name);
  }
  return { out: out.replace(/[ \t]{2,}/g, " ").trim(), hits };
}

// ── ㉠′ 표 — HWP 는 표를 **한 줄에 한 칸씩** 풀어 준다 ─────────────────────────
//
// 동도중 문1 은 「학생 / A / B / … / 편차(점) / 4 / −5 / …」가 줄마다 하나씩 온다.
// 우리 렌더러는 표를 모르고(DB 에 표가 0행), 풀린 칸을 그대로 두면 지면에 숫자가
// 세로로 늘어선다. 원장님 원칙(「기출은 그림 완전 이전」)대로 표는 **원본에서 오려**
// 그림으로 붙이고(`figures/crop_tables.py`), 여기서는 풀린 칸 줄만 걷는다.
//
// 🔴 **양쪽으로 본다.** `tables` 에 적은 문항에서 칸 줄을 못 찾으면 멈추고, 적지 않은
//    문항에서 칸 줄이 보여도 멈춘다 — 한쪽만 보면 풀린 표가 조용히 지면에 나간다.
// ⚠️ 칸의 길이는 **지면에 보이는 글자**로 잰다. `$\mathrm{A}\mathit{}$` 는 20자지만
//    보이는 것은 `A` 하나다 — 원문 길이로 재면 LaTeX 로 싸인 칸에서 칸 줄이 끊긴다.
const CELL_VISIBLE_MAX = 12;
const CELL_RUN_MIN = 6;
const TABLES = new Set(CFG.tables ?? []);
function visibleLength(line: string): number {
  return line.replace(/\\[a-zA-Z]+/g, "").replace(/[{}$\\\s]/g, "").length;
}
function cellRun(lines: string[]): [number, number] | null {
  let best: [number, number] | null = null;
  let start = -1;
  for (let i = 0; i <= lines.length; i += 1) {
    const l = (lines[i] ?? "").trim();
    // 상자 머리(`< 보 기 >`)는 짧아도 칸이 아니다 — 걷으면 상자가 안 선다.
    const isCell =
      i < lines.length &&
      l.length > 0 &&
      visibleLength(l) <= CELL_VISIBLE_MAX &&
      !BOX_MARKER_RE.test(l);
    if (isCell && start < 0) start = i;
    if (!isCell && start >= 0) {
      if (i - start >= CELL_RUN_MIN && (!best || i - start > best[1] - best[0]))
        best = [start, i];
      start = -1;
    }
  }
  return best;
}
function stripTableCells(stem: string, n: number): string {
  const lines = stem.split("\n");
  const run = cellRun(lines);
  if (TABLES.has(n)) {
    if (!run)
      throw new Error(
        `[중단] 문${n} 은 표 문항으로 적었는데 풀린 칸 줄을 못 찾았다`,
      );
    // 칸 줄이 발문 끝에 있으면 앞줄의 꼬리 공백이 남는다 — blocksToLatex 가 그것을 깎아
    // 「발문이 바뀌었다」로 멈춘다(동도중 문14). 끝을 다듬어 넘긴다.
    return [...lines.slice(0, run[0]), ...lines.slice(run[1])]
      .join("\n")
      .replace(/\s+$/u, "");
  }
  if (run)
    throw new Error(
      `[중단] 문${n} 발문에 풀린 표(짧은 줄 ${run[1] - run[0]}개)가 있는데 exam.json tables 에 없다`,
    );
  return stem;
}

// ── ㉡ 해설에서 정답 앞머리를 뗀다 ──────────────────────────────────────────
/**
 * `정답 …해설…` 한 덩어리에서 앞머리를 뗀다. 경계 표시가 없으므로 **모양으로** 자른다 —
 * 앞머리는 `$…$` 조각 · ⑴~⑽ 표시 · 공백 · `해설참조` 로만 이루어진다.
 * ⚠️ 마지막 표시 뒤에 수식이 하나도 없으면 그 표시는 **해설의 것**이라 되돌려 준다
 *    (문19 `⑴ $4$ ⑵ $40$` 다음에 곧바로 `⑴ 원 위의 점이 …`).
 */

// ── ㉢ 상자 마커 — HWP 는 **틀 구조를 잃는다**. 그것을 아는 것은 PDF 쪽이다 ────
//
// 원본 지면에서 문3 의 ㉠~㉣ 은 **테두리 상자** 안에 있다(p1.png). HWP 추출은 그 틀을
// 잃고 네 줄만 준다. 반대로 PDF 텍스트층 추출은 `<상자>` 마커를 남긴다.
// 그러니 마커의 출처는 **내가 아니라 다른 추출본**이다 — 없는 것을 지어내지 않는다.
//
// 규칙: PDF 발문에 상자 마커가 있고 HWP 발문에 없으면, HWP 발문의 **첫 항목 앞**에 붙인다.
// 첫 항목을 못 찾으면 **멈춘다**(조용히 안 붙이면 그 문항만 지면에서 상자를 잃는다).
// 상자를 그리는 규칙은 `src/lib/math/boxBlock.ts` 가 갖고 있다 — 여기서 옮겨 적지 않는다.
//
// 🔴 **PDF 가 찾은 이름을 그대로 쓴다 — 없는 이름을 지어내지 않는다.** (원장님 지적)
//
// 앞 회차는 원본이 뭐라 했든 **언제나 `<상자>`** 를 넣었다. 원본이 `<보기>` 라 해도
// 그 이름을 잃는다. 그래서 PDF 가 실제로 부른 이름을 그대로 싣는다.
//
// ⚠️ **머리 라벨을 안 그리는 일은 여기서 하지 않는다.** 문3 은 원본에 테두리만 있고
//    라벨이 없는데 지면에 〈상자〉가 찍혀 나갔다(원장님이 화면에서 찾으셨다).
//    원장님 확정: *「원문에 〈보기〉〈조건〉 없으면 붙이지 말 것」* (D-119 ⑹ 을 뒤집는다).
//    고칠 자리는 **렌더러**(`MarkdownRenderer.HEADERLESS_LABELS`)다 — 거기서 `상자` 를
//    머리 없이 그린다.
//
// 🔴 여기서 `<나열>` 을 넣으면 안 된다. `나열` 은 **입력 마커가 아니라**
//    `renderBoxSegment` 가 내부에서 만드는 표기다(`boxBlock` 이 아는 입력은
//    `보기|조건|상자` 셋뿐이다). 실제로 `<나열>` 을 넣어 봤더니 상자가 아예 안 서고
//    **날 글자로 지면에 찍혔다** — 스크린샷으로 잡았다.

// ── ㉠″ 표 후보 제안 — 대량 이관 드라이버(`batch_import.py`)가 부른다 ──────────
//
// `--propose-tables` 면 초안을 만들지 않고 **같은 `cellRun` 으로** 표 후보만 낸다.
// 판정(`stripTableCells`)과 제안이 한 함수를 보므로 둘이 어긋날 수 없다
// (2026-08-18 「세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
//
// 🔴 칸 줄에 **항목 표지**(ㄱ. ㉠ ① ⑴ (1))가 섞이면 표가 아니라 짧은 〈보기〉일 수 있다.
//    그건 «모름»으로 낸다 — 드라이버는 그 편을 멈추고 사람이 정한다. 표로 넣으면
//    `crop_tables.py` 가 보기 상자의 테두리를 표라고 오려 **조용히** 지면에 나간다.
if (process.argv.includes("--propose-tables")) {
  const ITEM_RE =
    /^\s*(?:[ㄱ-ㅎ]\s*[.)]|[㉠-㉿㈀-㈜]|[①-⑳]|[⑴-⒇]|\(\s*\d{1,2}\s*\)|\d{1,2}\s*[.)])/u;
  const candidates: number[] = [];
  const unsure: { n: number; why: string }[] = [];
  for (const q of hwp.questions) {
    const stem = scrub(piece.get(`${q.number}-stem`) ?? "").out;
    const lines = stem.split("\n");
    const run = cellRun(lines);
    if (!run) continue;
    const runLines = lines
      .slice(run[0], run[1])
      .map((l) => l.trim())
      .filter(Boolean);
    const marked = runLines.filter((l) => ITEM_RE.test(l)).length;
    if (marked > 0)
      unsure.push({
        n: q.number,
        why: `짧은 줄 ${runLines.length}개 중 항목 표지 ${marked}개 — 표가 아니라 보기일 수 있다`,
      });
    else candidates.push(q.number);
  }
  console.log(JSON.stringify({ candidates, unsure }));
  process.exit(0);
}

// ── ㉢ 배점 — **정본은 PDF 쪽이다.** 근거는 본문 밖에 있다: 합이 100점이어야 한다 ──
//
// HWP 추출은 문17·문19 에서 3점·4점을 내놓는다. 그 둘은 소문항이 있는 문항이고,
// 지면에는 `[총 10점]` 이라 적혀 있다 — 추출기가 **마지막 소문항 배점**을 집은 것으로
// 보인다. 어느 쪽이 옳은지는 문항 안에서 못 가른다. 가르는 것은 **합계**다:
//   HWP 87점 · PDF 100점.  시험지 총점은 100 이다.
// 🔴 `?? 0` 으로 받으면 **«칸이 없다»가 «0점»이 된다** — 그러면 아래에서 그 0 이 HWP 배점을 이긴다.
//    2026-09-13 경산중 문13: 지면의 `[3점]` 사이에 그림 조각이 끼어 텍스트층이 배점을 못 집었고,
//    PDF 0점이 HWP 3점을 눌러 합이 97 이 됐다. 커밋된 편 전수에서 PDF 배점 칸은 130 중 129 가
//    있고 **0점짜리 문항은 하나도 없다** — 그러니 «없음»은 없음으로 두고 HWP 로 물러난다.
const pdfScore = new Map<number, number>(
  (pdf.questions ?? [])
    .filter((q) => typeof q.score === "number")
    .map((q) => [q.number, q.score as number]),
);
const scoreOf = new Map<number, number>();
let scoreSwap = 0;
for (const q of hwp.questions) {
  const fromPdf = pdfScore.get(q.number);
  if (fromPdf === undefined) {
    console.log(
      `  문${q.number} 배점: PDF 텍스트층에 칸이 없다 — HWP ${q.score}점을 쓴다`,
    );
  } else if (Math.abs(fromPdf - q.score) > 1e-6) {
    scoreSwap += 1;
    console.log(
      `  문${q.number} 배점: PDF ${fromPdf}점 ← HWP ${q.score}점 (PDF 를 쓴다)`,
    );
  }
  scoreOf.set(q.number, fromPdf ?? q.score);
}
const total = [...scoreOf.values()].reduce((a, b) => a + b, 0);
if (Math.abs(total - 100) > 0.05) {
  throw new Error(`[중단] 배점 합이 ${total} 점이다 — 100 이어야 한다`);
}
console.log(`배점 합 ${total}점 · PDF 로 바꾼 자리 ${scoreSwap}개`);

// ── ㉣ 초안 ────────────────────────────────────────────────────────────────
let scrubbed = 0;
const questions = hwp.questions.map((q) => {
  const pdfStem = (
    (pdf.questions ?? []).find((x) => x.number === q.number)?.contents ?? []
  )
    .map((c) => c.value ?? "")
    .join(" ");
  const scrubbed0 = scrub(piece.get(`${q.number}-stem`) ?? "");
  scrubbed0.out = stripTableCells(scrubbed0.out, q.number);
  const hits = scrubbed0.hits;
  let stem = restoreBoxMarker(
    scrubbed0.out,
    withoutSharedPassage(pdfStem),
    q.number,
  );
  if (graphFields.has(q.number)) stem = stem.replace(/[①-⑤]/g, "").trim();
  if (hits.length > 0) {
    scrubbed += 1;
    console.log(`  문${q.number} 걷음: ${hits.join(" · ")}`);
  }
  // 이미 LaTeX 인 글이 blocksToLatex 를 지나며 **바뀌면** 멈춘다 — 그 함수는 OCR
  // 텍스트를 위한 것이라, 우리 입력에서 무슨 짓을 하는지 말없이 넘기지 않는다.
  const through = blocksToLatex([{ type: "text", value: stem }]).content;
  if (through !== stem) {
    throw new Error(
      `[중단] 문${q.number} 발문이 blocksToLatex 를 지나며 바뀌었다:\n  전: ${stem}\n  후: ${through}`,
    );
  }
  const choices = [] as {
    number: number;
    contents: { type: string; value: string }[];
  }[];
  for (let i = 1; ; i += 1) {
    const c0 = piece.get(`${q.number}-c${i}`);
    if (c0 === undefined) break;
    // 🔴 보기에도 오염이 붙어 온다 — 경산여중 문26 은 **⑤ 뒤에** 검수자 실명이 있었다.
    //    발문만 걷으면 금지 검사에서 멈춘다(그게 옳다). 같은 걷기를 보기에도 건다.
    const c = scrub(c0).out;
    choices.push({ number: i, contents: [{ type: "text", value: c }] });
  }
  if (graphFields.has(q.number)) {
    const restored = restoreGraphChoices(
      choices.map((c) => c.contents.map((v) => v.value).join("")),
      q.answer ?? "",
    );
    choices.length = 0;
    for (const [i, value] of restored.entries())
      choices.push({
        number: i + 1,
        contents: [{ type: "text", value }],
      });
  }
  return {
    number: q.number,
    score: scoreOf.get(q.number)!,
    type: q.type,
    topic: q.topic,
    difficulty: q.difficulty,
    contents: [{ type: "text", value: stem }],
    choices,
  };
});

const answers: PastExamAnswer[] = hwp.questions.map((q) => {
  const text = solFixed.get(String(q.number));
  if (!text)
    return {
      number: q.number,
      answer: q.answer ?? "",
      topic: q.topic,
      difficulty: q.difficulty,
    };
  const { answer, solution } = splitAnswer(
    text,
    q.answer ?? "",
    CFG.answerRepairs?.[q.number],
  );
  return {
    number: q.number,
    answer: answer || q.answer || "",
    solution,
    topic: q.topic,
    difficulty: q.difficulty,
  };
});

const paper = normalizePastExamPaper({
  questions: questions as PastExamPaper["questions"],
  meta: {
    exam_id: CFG.examId,
    school: SCHOOL, // 지면에는 JH중 으로 가려져 있다(원장님 요청). 메타에만 남긴다.
    grade: CFG.grade,
    subject: CFG.subject,
  },
  _sourceFile: readFileSync(join(DIR, "source_path.txt"), "utf-8").trim(),
});

/** 학교를 추측할 수 있는 이름을 바꾼다. 아래 `FORBIDDEN` 이 남았는지 다시 센다. */
function rename(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  let out = text;
  for (const r of RENAMES) {
    r.re.lastIndex = 0;
    out = out.replace(r.re, r.to);
  }
  return out;
}

const renamed: string[] = [];
const drafts = convertPastExamPaper(paper, answers).map((d, i) => {
  const content = rename(d.content)!;
  const answer = rename(d.answer)!;
  const solution = appendSolutionNote(
    rename(d.solution),
    CFG.solutionNotes?.[d.questionNumber!],
  );
  if (content !== d.content || answer !== d.answer || solution !== d.solution)
    renamed.push(`문${d.questionNumber}`);
  return {
    ...d,
    content,
    answer,
    solution,
    // HWP 가 아는 출제 형식(객관식/단답형/서술형). `problemType`(계산/개념/활용/서술형)과 다른 축.
    questionType: graphFields.has(d.questionNumber!)
      ? "객관식"
      : hwp.questions[i].type,
    ...(graphFields.get(d.questionNumber!) ?? {}),
  };
});
console.log(
  renamed.length > 0
    ? `학교를 추측할 수 있는 이름을 바꿨다: ${renamed.join(", ")}`
    : "학교를 추측할 수 있는 이름 없음",
);

// ── ㉤ 금지 검사 — 걷은 **뒤** 전량에 대고 본다 ─────────────────────────────
let bad = 0;
for (const d of drafts) {
  const blob = [d.content, d.answer, d.solution ?? ""].join("\n");
  const hits = FORBIDDEN.filter((f) => {
    f.re.lastIndex = 0;
    return f.re.test(blob);
  });
  if (hits.length > 0) {
    bad += 1;
    console.log(
      `🔴 문${d.questionNumber}: ${hits.map((h) => h.name).join(" · ")}`,
    );
    for (const h of hits) {
      const m = blob.match(new RegExp(h.re.source, "gu"));
      if (m) console.log(`     ↳ ${[...new Set(m)].join(", ")}`);
    }
  }
}

writeFileSync(
  process.argv[3] ?? join(DIR, "drafts.json"),
  JSON.stringify(drafts, null, 1),
  "utf-8",
);
console.log(
  `\n오염 걷은 발문 ${scrubbed}개 · 초안 ${drafts.length}문항 · 금지 검사 걸림 ${bad}건`,
);
for (const d of drafts) {
  console.log(
    `${String(d.questionNumber).padStart(2)} ${d.difficulty} · ${d.problemType}/${d.questionType} · ` +
      `${d.unitHint} · 정답 ${JSON.stringify(d.answer)} · 해설 ${d.solution ? `${d.solution.length}자` : "없음"}`,
  );
}
if (bad > 0) process.exit(1);
// PDF 쪽은 **대조용**이다 — 본문으로 쓰지 않는다. 여기서 한 번 세어 남긴다.
console.log(
  `\n(PDF 텍스트층은 대조용으로만 읽었다 — 문항 ${pdf.questions?.length ?? 0}개)`,
);
