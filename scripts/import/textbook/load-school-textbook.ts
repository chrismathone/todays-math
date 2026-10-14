/**
 * 검토를 지난 교과서 문항을 문제은행에 싣는다 (D-161 · 원장님 2026-10-07).
 *
 *   npx tsx --env-file=.env scripts/import/textbook/load-school-textbook.ts <작업 폴더>            # 드라이런 — 무엇이 들어갈지만 센다
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/textbook/load-school-textbook.ts <작업 폴더> --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/textbook/load-school-textbook.ts <작업 폴더> --revert --apply
 *
 * 작업 폴더(저장소 밖 — `E:\todays-math-textbook-import`)에서 읽는 것:
 *   <준비 폴더>/prepared.jsonl    문제은행 꼴의 본문 · 정답 · 교과서 풀이(`prepare.py`) — `--prepared <폴더>`(기본 `prepared`)
 *   <검토 폴더>/reviewed.jsonl    첫 검토의 판정 · 차시 · 유형 · 난이도 · 해설(`review/collect.py`)
 *   <검토 폴더>/judged.jsonl      둘째 검토의 판정(있으면)
 *   <검토 폴더>/units/<과목>.json 검토자가 본 차시 목록(번호 → 대단원 · 차시)
 * 검토 폴더는 `--review <폴더>` 로 여럿 줄 수 있다(기본 `review`). **뒤에 준 폴더가 이긴다** — 수식 변환을 고쳐 본문이
 * 바뀐 문항은 다시 검토하고(`build_batches.py --changed-from`), 그 문항에 대해서는 새 검토와 그 폴더의 둘째 검토만 본다.
 * 🔴 검토는 «그 본문»에 대한 것이다 — 준비 폴더와 검토 폴더의 본문이 어긋나면(검토 뒤에 준비를 다시 돌렸다) 그 문항은 싣지 않는다.
 * 쓰는 것: `load/plan.json`(드라이런의 결과 — 실을 줄과 빠진 줄의 까닭) · `load/ledger.json`(실은 줄의 id — 되돌릴 때 이것만 본다)
 *
 * ## 무엇을 싣나
 *
 * 검토자가 **정답 없이 푼 답이 출판사 정답과 같은** 문항만이다(`match`), 그리고 둘째 검토가 «같은 값이다 · 첫 검토자가 옳다 ·
 * 정답지가 옳다»로 가른 문항(`same` · `mine` · `key`). 그 밖(정답지가 이 문항의 답이 아니다 · 그림 없이는 못 푼다 · 못 풀었다)은
 * 싣지 않고 `plan.json` 에 까닭과 함께 남긴다.
 *
 * ## 싣기 전에 한 줄씩 다시 본다 — 여기가 마지막 문이다
 *
 * - 차시 번호가 DB 의 차시로 풀리는가(과목 · 대단원 · 차시 이름이 글자 그대로 같아야 한다)
 * - 🔴 본문 · 정답 · 해설이 **제품 렌더러**로 그려지는가(`renderMathHtml` — 규칙을 옮겨 적지 않는다)
 * - 🔴 **죽은 역슬래시가 없는가**(`deadBackslashHits` — pre-push 의 `check:raw-latex` 가 보는 바로 그 함수).
 *   이것을 지나치고 실으면 그 뒤로 **누구의 main 푸시든 막힌다.**
 * - 본문이 비지 않았는가 · 길이 상한 · 정답이 있는가
 *
 * ## 순서 (D-161 ⑷)
 *
 * 🔴 이 스크립트는 `school_textbook` 을 아는 코드가 **배포된 뒤에** 돌린다 — 옛 Prisma 클라이언트는 그 행을 읽다 죽는다.
 *    `--apply` 는 그것을 스스로 확인하지 못한다. 돌리는 사람이 배포를 본다.
 *
 * 다시 돌려도 같은 줄이다 — 책 · 자료는 `externalKey` 로, 문항은 `externalId`(`tb-<자료>-<묶음>-<번호>`)로 찾는다.
 * `--apply` 는 이미 있는 문항을 건드리지 않는다. 실린 문항을 지금의 계획에 맞추는 것은 `--refresh` 다(아래).
 *
 * ## 잠금 — 답은 확인됐지만 지면에 낼 꼴이 아직 아닌 문항 (2026-10-07)
 *
 * 첫 판은 «답이 맞으면 바로 쓸 수 있음»으로 6,121문항을 실었다. 실은 직후 표본에서 «$boldx$» · «$x->4$» 가 지면에 그대로
 * 찍히는 문항과, 풀이 칸에 다음 문항의 본문이 든 문항을 찾았다(답은 전부 맞았다 — 답으로는 못 거르는 흠이다).
 * 그래서 문항마다 `hold`(잠그는 까닭)를 두고, 비어 있을 때만 `direct_use_allowed = true` 로 싣는다:
 *
 *   - 수식 안의 표기를 손질한다(`hwpNotation.ts` — 값은 그대로) · 손질로도 남은 한글 수식 낱말이 있으면 잠근다
 *   - 🔴 실으려는 «그 글»을 읽은 **지면 검토**(`--check <폴더>` — `final-check/`)가 없으면 잠근다.
 *     지면 검토는 본문 · 정답이 지면에 낼 꼴인지와, 해설 후보가 «이 문항의 풀이»인지를 본다.
 *     판정은 글의 지문(`checkKey`)에 묶인다 — 검토 뒤에 글이 바뀌면 그 판정은 버린다.
 *   - 해설: 후보(교과서 풀이 → 없으면 첫 검토자의 해설)가 `keep` 을 받으면 그것, 아니면 지면 검토자가 다시 쓴 것, 없으면 잠근다
 *
 * ## 제자리 갱신 — `--refresh`
 *
 *   npx tsx --env-file=.env … <작업 폴더> … --check final-check --refresh            # 무엇이 바뀌나(`load/refresh-dryrun.json`)
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env … --check final-check --refresh --apply
 *
 * 실린 문항의 본문 · 정답 · 해설 · 해설의 출처 · 잠금 다섯 칸을 계획에 맞춘다. 지우고 다시 넣지 않는다(번호 · id 가 그대로다).
 * 계획에서 빠진 문항은 잠근다. 고치기 전 값은 회차마다 새 파일(`load/refresh-<시각>.json`)에 남는다.
 * 🔴 **사람이 고친 문항은 덮어쓰지 않는다** — 적재기가 마지막으로 쓴 다섯 칸의 지문을 `load/written.json` 에 두고, DB 의 값이
 *    그 지문이 아니면(문제은행에서 고쳤다 · 잠금을 풀었다) 건드리지 않고 수만 알린다(`refreshPlan.ts`).
 *    지문 원장이 없으면 고치지 않는다 — `--refresh --adopt` 는 지금 DB 를 기준으로 삼는다(아무도 손대지 않은 것이 확실할 때만).
 * 🔴 **원문의 글 · 정답 · 해설 · 그림이 바뀌거나 원문이 잠기면 그 원문의 지정 두 슬롯(복습 변형 `tb-retry-v1:…`)도 같은
 *    트랜잭션에서 잠근다**(`designatedSlotLocks.ts` — 문제은행 P0 2026-10-14). 변형은 그때의 원문에 맞춰 검산됐다 —
 *    다시 여는 것은 대응을 다시 검증한 뒤다. 드라이런의 «지정_변형을_잠금»을 먼저 본다.
 * 전부를 한꺼번에 잠그거나 목록으로 푸는 일은 `hold-school-textbook.ts`, 실린 것을 세는 일은 `census.ts`.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { deadBackslashHits } from "../../qa/probe-middle-raw-latex";
import {
  sourceBookSchema,
  sourceMaterialSchema,
  type SourceBookInput,
  type SourceMaterialInput,
} from "../../../src/contracts/sourceMaterial.contract";
import {
  parseSourceBook,
  parseSourceMaterial,
} from "../../../src/lib/import/schoolTextbook/sourceMeta";
import { checkKeyOf } from "../../../src/lib/import/schoolTextbook/checkKey";
import {
  choiceIndexOf,
  figureChoiceNote,
  countMarkers,
  dropFigureMarkers,
  figuresSeen,
  liftChoiceMarkers,
} from "../../../src/lib/import/schoolTextbook/figurePlacement";
import {
  cleanContent,
  hwpLeftovers,
  tidyHwpNotation,
} from "../../../src/lib/import/schoolTextbook/hwpNotation";
import {
  blatantWords,
  createRenamer,
} from "../../../src/lib/import/schoolTextbook/neutralNames";
import {
  findDesignatedSlotRows,
  lockDesignatedSlotsArgs,
  planDesignatedSlotLocks,
  slotBreakingReason,
} from "../../../src/lib/import/schoolTextbook/designatedSlotLocks";
import {
  fingerprintOf,
  planRefresh,
  type RefreshColumns,
} from "../../../src/lib/import/schoolTextbook/refreshPlan";
import {
  buildVocabulary,
  unsplitWords,
} from "../../../src/lib/import/schoolTextbook/unsplitWords";
import { renderMathHtml } from "../../../src/lib/math/renderMathHtml";

const DIR = process.argv[2];
const optionValues = (name: string): string[] =>
  process.argv.flatMap((arg, index) =>
    arg === name && process.argv[index + 1] ? [process.argv[index + 1]!] : [],
  );
/**
 * 문항의 묶음 하나 — 준비 폴더 · 그 글을 본 검토 폴더들 · 마무리 손질 · (그림 문항이면) 그림 폴더.
 * 글 문항과 그림 문항은 준비 폴더가 다르다. 묶음을 따로 돌리면 `--refresh` 가 다른 묶음의 문항을 «계획에 없다»로 잠그므로
 * **한 번에 다 준다**: `--sets load/sets.json`(`{ "sets": [...], "checks": [...] }`). 뒤 묶음이 앞 묶음을 이긴다 —
 * 단, 뒤 묶음이 그 문항을 실을 수 없다고 하면 앞 묶음의 줄이 남는다(글 문항으로 실린 줄을 그림 검토가 지우지 않는다).
 */
interface LoadSet {
  prepared: string;
  reviews: string[];
  /** `finalize.py` 가 낸 폴더(없으면 손질 없이) */
  final?: string;
  /** `figures.py --export` 가 낸 폴더(`meta.jsonl` · `img/`) */
  figures?: string;
}
const SETS_FILE = optionValues("--sets")[0];
const SETS_CONFIG = SETS_FILE
  ? (JSON.parse(readFileSync(join(DIR ?? ".", SETS_FILE), "utf8")) as {
      sets: LoadSet[];
      checks?: string[];
    })
  : null;
const SETS: LoadSet[] = SETS_CONFIG?.sets ?? [
  {
    prepared: optionValues("--prepared")[0] ?? "prepared",
    reviews:
      optionValues("--review").length > 0
        ? optionValues("--review")
        : ["review"],
    final: "final",
  },
];
/** 지면 검토 폴더들(`final-check/collect.py` 의 `checked.jsonl`) — 뒤에 준 폴더가 이긴다 */
const CHECK_DIRS = SETS_CONFIG?.checks ?? optionValues("--check");
/** `--copy-figures` — 계획의 그림 파일을 저장소(`public/figures/tb/`)에 놓는다. 그 커밋이 배포된 **뒤에** 문항을 싣는다 */
const COPY_FIGURES = process.argv.includes("--copy-figures");
/** 그림 파일이 놓이는 자리 — 저장소의 `public/figures/tb/<자료>/<문항>-<n>.png` → 주소 `/figures/tb/…` */
const FIGURE_PUBLIC_DIR = join(process.cwd(), "public", "figures", "tb");
const FIGURE_URL_PREFIX = "/figures/tb/";
const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const REFRESH = process.argv.includes("--refresh");
/** `--refresh --adopt` — 지금 DB 의 값을 «적재기가 쓴 값»으로 삼는다(지문 원장을 새로 만든다. DB 는 안 고친다) */
const ADOPT = process.argv.includes("--adopt");
if (!DIR)
  throw new Error(
    "사용: load-school-textbook.ts <작업 폴더> [--check <폴더>] [--refresh] [--apply] [--revert]",
  );
if (APPLY && process.env.ALLOW_SHARED_IMPORT !== "1") {
  console.error(
    "공유 DB 쓰기가 막혀 있다(D-31). ALLOW_SHARED_IMPORT=1 이 필요하다.",
  );
  process.exit(1);
}

const OUT = join(DIR, "load");
const PLAN = join(OUT, "plan.json");
const LEDGER = join(OUT, "ledger.json");
/** 적재기가 문항마다 마지막으로 쓴 다섯 칸의 지문 — `--refresh` 가 «사람이 고친 문항»을 가리는 데 쓴다(`refreshPlan.ts`) */
const WRITTEN = join(OUT, "written.json");

function readWritten(): Map<string, string> {
  return new Map(
    existsSync(WRITTEN)
      ? Object.entries(
          JSON.parse(readFileSync(WRITTEN, "utf8")) as Record<string, string>,
        )
      : [],
  );
}

function writeWritten(written: Map<string, string>): void {
  writeFileSync(
    WRITTEN,
    JSON.stringify(Object.fromEntries([...written].sort())),
    "utf8",
  );
}
/** 본문 · 정답 · 해설의 길이 상한 — `toLoadRows` 의 것과 같다 */
const TEXT_MAX = 10_000;
const DIFFICULTIES = [
  "연산",
  "기본",
  "응용",
  "심화하",
  "심화중",
  "심화상",
] as const;
const TYPES = ["계산", "개념", "활용"] as const;
const FORMATS = ["객관식", "단답형", "서술형"] as const;

type Difficulty = (typeof DIFFICULTIES)[number];

interface Prepared {
  id: string;
  key: string;
  path: string;
  grade: string;
  book: string;
  section: number;
  number: number;
  content: string;
  answer: string;
  answerFrom: string;
  solution: string | null;
  solutionFigure: boolean;
  bad: string[];
}
interface Reviewed {
  id: string;
  batch: string;
  grade: string;
  verdict: "match" | "differ" | "no-answer" | "not-ok" | "missing";
  how?: string | null;
  why?: string;
  drop?: number[];
  answer?: string;
  unit?: number | null;
  type?: string;
  level?: string;
  format?: string;
  solution?: string | null;
  needSolution?: boolean;
  /** 그림 문항 — 검토자가 «이 문항의 그림이 아니다»라고 한 그림의 번호(1부터) */
  noFigure?: number[];
  /** 그림 문항 — 검토자가 본 그림의 지문(sha) 차례대로. 지금 싣는 그림과 견준다(`figuresSeen`) */
  figureKeys?: string[];
}
/** `figures.py --export` 가 낸 한 줄 — 문항에 딸린 그림 파일들(본문의 `[그림]` 차례대로) */
interface FigureMeta {
  id: string;
  figures: Array<{
    file: string;
    mm: number;
    sha: string;
    px?: [number, number];
    /** 꺼낸 그림 파일(지면에 나가는 바이트)의 지문 — 잘라 보이기 · 회색을 바꾸면 달라진다. 지면 검토의 지문은 이것으로 묶는다 */
    imgSha?: string;
  }>;
}
/** 실을 그림 하나 */
export interface LoadFigure {
  /** 꺼내 둔 파일(작업 폴더) */
  source: string;
  /** 저장소 `public/figures/tb/` 아래의 자리 */
  path: string;
  /** 문항이 가리키는 주소 — `/figures/tb/…` */
  url: string;
  width: number;
  height: number;
  /** 원본 지면에서의 폭(mm) — 한글 파일에 적힌 보이는 크기 */
  mm: number;
  sha: string;
}
interface Judged {
  id: string;
  verdict: "same" | "mine" | "key" | "neither" | "unsure" | "missing";
  final?: string;
  why?: string;
  solution?: string | null;
}

export interface LoadRow {
  externalId: string;
  materialKey: string;
  grade: string;
  chapter: string;
  section: string;
  difficulty: Difficulty;
  problemType: string;
  questionType: string;
  content: string;
  answer: string;
  solution: string | null;
  solutionSource: "original" | "ai" | "none";
  sourceFile: string;
  questionNumber: number;
  /** 답을 어디서 확인했나 — 원장에 남긴다 */
  verified: string;
  /**
   * 출제에서 잠그는 까닭 — 비어 있으면 바로 쓸 수 있다(`direct_use_allowed`).
   * 답은 확인됐지만 지면에 낼 꼴이 아직 아닌 문항이다(남은 한글 수식 낱말 · 확인하지 않은 교과서 풀이 · 해설 없음).
   * 문항을 버리지 않고 잠가 두는 까닭: 은행에서 보고 고칠 수 있고, 고친 뒤 `--refresh` 로 풀린다.
   */
  hold: string[];
  /** 다른 이름으로 바꾼 것(«천재 → 지우») — 원장에 남긴다 */
  renamed: string[];
  /** 그림 문항의 그림들 — 본문의 `[그림]` 차례대로. 글 문항은 빈 배열 */
  figures: LoadFigure[];
  /** 그림마다 «몇 번 보기의 그림인가»(0 은 발문). 짝을 모르면 빈 배열(`Problem.choiceFigureIndex` 의 규칙) */
  choiceFigureIndex: number[];
  /** 지면 검토가 본 글의 지문 — 검토 뒤에 글이 바뀌면 그 검토는 버린다 */
  checkKey: string;
  /** 지면 검토가 읽을 해설 후보 — 교과서 풀이(쓸 수 있는 꼴이면), 없으면 첫 검토자가 쓴 것. 실을 해설과 다를 수 있다 */
  candidateSolution: string | null;
  candidateFrom: "original" | "ai" | null;
}

/** 지면 검토(`final-check`)의 한 줄 — 실으려는 «그 글»을 읽고 내린 판정 */
interface Checked {
  id: string;
  /** 검토자가 본 글의 지문(`checkKeyOf`) */
  key: string;
  /** 본문 · 정답이 지면에 낼 꼴인가 */
  content: "ok" | "flaw";
  contentWhy?: string;
  /** 교과서 풀이가 이 문항의 풀이인가 — `keep` 그대로 · `replace` 검토자가 다시 썼다 · `none` 볼 풀이가 없었다 */
  solution: "keep" | "replace" | "none";
  solutionWhy?: string;
  newSolution?: string | null;
}

function readJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

/** 제품 렌더러가 포기했거나 날 LaTeX 가 지면에 나가는가 — `fix-exam-solutions.ts` 의 판정과 같은 표지 */
function renderFlaws(text: string): string[] {
  const html = renderMathHtml(text);
  const flaws: string[] = [];
  if (html.includes("math-raw")) flaws.push("KaTeX 가 포기했다");
  if (html.includes("#cc0000") || html.includes("katex-error"))
    flaws.push("붉은 글씨");
  const plain = html.replace(/<[^>]+>/g, "");
  const raw =
    /\\(?:frac|dfrac|sqrt|overline|angle|triangle|mathrm|times|div|left|right|begin|end)/.exec(
      plain,
    );
  if (raw) flaws.push(`지면에 날 LaTeX ${raw[0]}`);
  return flaws;
}

/** 한 칸(본문 · 정답 · 해설)의 흠 — 없으면 빈 배열 */
function textFlaws(name: string, text: string): string[] {
  const flaws: string[] = [];
  if (text.length > TEXT_MAX) flaws.push(`${name}이 ${TEXT_MAX}자를 넘는다`);
  for (const hit of new Set(deadBackslashHits(text)))
    flaws.push(`${name}: 죽은 역슬래시 ${hit}`);
  for (const flaw of renderFlaws(text)) flaws.push(`${name}: ${flaw}`);
  if (/[\u{E000}-\u{F8FF}\u{F0000}-\u{FFFFD}]/u.test(text))
    flaws.push(`${name}: 사용자 영역 글자`);
  return flaws;
}

/**
 * 수식 안의 표기만 고친다 — 값은 그대로다. 규칙은 `hwpNotation.ts` 한 곳에 있다(본문 · 정답 · 해설 네 칸에 같이 건다).
 * 손질한 뒤에도 남은 한글 수식 낱말은 `hwpLeftovers` 가 세고, 그런 문항은 출제에서 잠근다.
 */
const tidy = tidyHwpNotation;

/** 문항이 나온 책의 출판사 — 폴더 이름을 못 읽으면 빈 글(이름 바꾸기를 하지 않는다) */
function publisherOf(source: Prepared): string {
  try {
    return parseSourceBook({ bookFolder: source.book, grade: source.grade })
      .publisher;
  } catch {
    return "";
  }
}

/** 글에 남은 출판사의 온 이름 — 없으면 null */
function blatantNote(...texts: Array<string | null>): string | null {
  const words = blatantWords(texts.filter(Boolean).join(" "));
  return words.length > 0 ? `출판사 이름이 글에 있다 ${words.join(" ")}` : null;
}

/**
 * 계획의 줄 → DB 에 쓰는 칸들(본문 · 정답 · 해설 · 해설의 출처 · 잠금 + 그림 다섯).
 * 넣기 · 제자리 갱신 · 지문이 전부 이 함수를 쓴다 — 칸을 따로 적으면 한쪽만 바뀐다.
 * 지면에 낼 꼴이 아직 아닌 문항은 잠근다(`hold`) — 은행에는 보이고 출제에는 안 뽑힌다.
 */
function columnsOfRow(row: LoadRow): RefreshColumns {
  return {
    content: row.content,
    answer: row.answer,
    solution: row.solution,
    solutionSource: row.solutionSource,
    directUseAllowed: row.hold.length === 0,
    figureUrls: row.figures.map((figure) => figure.url),
    figureDims: row.figures.flatMap((figure) => [figure.width, figure.height]),
    figureSourceMm: row.figures.map((figure) => figure.mm),
    choiceFigureIndex: row.choiceFigureIndex,
    figureSource: row.figures.length > 0 ? "source" : null,
  };
}

/**
 * 그림 파일이 저장소에 있는가 — 없는 줄의 열쇠들.
 * 🔴 DB 는 즉시 최신인데 그림 파일은 밀어야 간다(20번 문서 2026-08-20). 그림 문항은 파일이 **배포된 뒤에** 싣는다.
 *    여기서는 «이 작업본에 파일이 있는가»까지만 본다 — 배포됐는지는 돌리는 사람이 본다.
 */
function missingFigureFiles(rows: LoadRow[]): string[] {
  return rows
    .filter((row) => row.figures.some((figure) => !existsSync(figure.path)))
    .map((row) => row.externalId);
}

/** 손질로도 못 고친 표기 — 없으면 null */
function leftoverNote(name: string, text: string): string | null {
  const words = hwpLeftovers(text);
  return words.length > 0 ? `${name}에 남은 표기 ${words.join(" ")}` : null;
}

interface Skip {
  externalId: string;
  reason: string;
}

type Books = Map<string, SourceBookInput>;
type Materials = Map<string, SourceMaterialInput & { bookKey: string }>;

/** 모든 묶음이 같이 쓰는 것 — 지면 검토의 판정 · 끊긴 낱말을 붙이는 사전 · 책과 자료 */
interface Shared {
  checks: Map<string, Checked>;
  unsplit: (text: string) => string;
  books: Books;
  materials: Materials;
}

function buildRows(): {
  rows: LoadRow[];
  skipped: Skip[];
  books: Books;
  materials: Materials;
} {
  // 지면 검토 — 실으려는 «그 글»을 읽은 판정. 뒤에 준 폴더가 이긴다
  const checks = new Map<string, Checked>();
  for (const dir of CHECK_DIRS)
    for (const row of readJsonl<Checked>(join(DIR, dir, "checked.jsonl")))
      checks.set(row.id, row);
  // 끊겼다 이어진 낱말을 붙일 사전 — 검토자가 쓴 해설(줄 끝에서 끊긴 적이 없는 글). 모든 묶음의 것을 같이 쓴다
  const written: string[] = [];
  for (const set of SETS)
    for (const dir of set.reviews)
      for (const review of readJsonl<Reviewed>(
        join(DIR, dir, "reviewed.jsonl"),
      ))
        if (review.solution) written.push(review.solution);
  for (const check of checks.values())
    if (check.newSolution) written.push(check.newSolution);
  const vocabulary = buildVocabulary(written);
  const shared: Shared = {
    checks,
    unsplit: (text) => unsplitWords(text, vocabulary),
    books: new Map(),
    materials: new Map(),
  };

  // 묶음마다 짓고 합친다 — 뒤 묶음의 줄이 이긴다. 뒤 묶음이 «실을 수 없다»고 한 문항은 앞 묶음의 줄이 남는다
  const rows = new Map<string, LoadRow>();
  const skips = new Map<string, Skip>();
  for (const set of SETS) {
    const built = buildRowsOf(set, shared);
    for (const row of built.rows) rows.set(row.externalId, row);
    for (const skip of built.skipped) skips.set(skip.externalId, skip);
  }
  return {
    rows: [...rows.values()],
    skipped: [...skips.values()].filter((skip) => !rows.has(skip.externalId)),
    books: shared.books,
    materials: shared.materials,
  };
}

function buildRowsOf(
  set: LoadSet,
  shared: Shared,
): { rows: LoadRow[]; skipped: Skip[] } {
  const { checks, unsplit, books, materials } = shared;
  const prepared = new Map(
    readJsonl<Prepared>(join(DIR, set.prepared, "prepared.jsonl")).map(
      (row) => [row.id, row],
    ),
  );
  // 그림 문항 — 문항에 딸린 그림 파일들(본문의 `[그림]` 차례대로)
  const figureMeta = new Map<string, FigureMeta>(
    set.figures
      ? readJsonl<FigureMeta>(join(DIR, set.figures, "meta.jsonl")).map(
          (row) => [row.id, row],
        )
      : [],
  );
  // 검토 폴더들 — 뒤에 준 폴더가 이긴다. 둘째 검토는 **그 검토와 같은 폴더의 것**만 본다
  const winner = new Map<
    string,
    { review: Reviewed; judged: Judged | undefined; lines: string[] }
  >();
  for (const dir of set.reviews) {
    const judgedPath = join(DIR, dir, "judged.jsonl");
    const judgedHere = new Map(
      existsSync(judgedPath)
        ? readJsonl<Judged>(judgedPath).map((row) => [row.id, row])
        : [],
    );
    const batches = new Map<string, Array<{ lines: string[] }>>();
    for (const review of readJsonl<Reviewed & { i: number }>(
      join(DIR, dir, "reviewed.jsonl"),
    )) {
      if (!batches.has(review.batch)) {
        batches.set(
          review.batch,
          JSON.parse(
            readFileSync(
              join(DIR, dir, "batch", `${review.batch}.json`),
              "utf8",
            ),
          ),
        );
      }
      winner.set(review.id, {
        review,
        judged: judgedHere.get(review.id),
        lines: batches.get(review.batch)![review.i - 1]!.lines,
      });
    }
  }
  const reviewed = [...winner.values()].map((entry) => entry.review);
  // 마무리 손질(`finalize.py`) — 있으면 본문 · 교과서 풀이는 그것을 쓴다(줄 잇기 · 표기. 글자는 같다)
  const finalPath = set.final ? join(DIR, set.final, "final.jsonl") : "";
  const finished = new Map(
    finalPath && existsSync(finalPath)
      ? readJsonl<{ id: string; content: string; solution: string | null }>(
          finalPath,
        ).map((row) => [row.id, row])
      : [],
  );
  const unitLists = new Map<
    string,
    Array<{ u: number; chapter: string; section: string }>
  >();
  const unitsOf = (grade: string) => {
    if (!unitLists.has(grade)) {
      // 차시 목록은 과목마다 같다 — 그 과목을 처음 검토한 폴더에만 있을 수 있다(묶음마다 검토 폴더가 여럿)
      const dir = set.reviews.find((review) =>
        existsSync(join(DIR, review, "units", `${grade}.json`)),
      );
      if (!dir) throw new Error(`차시 목록이 없다 — ${grade}`);
      unitLists.set(
        grade,
        JSON.parse(
          readFileSync(join(DIR, dir, "units", `${grade}.json`), "utf8"),
        ),
      );
    }
    return unitLists.get(grade)!;
  };

  const rows: LoadRow[] = [];
  const skipped: Skip[] = [];
  const seen = new Set<string>();

  for (const review of reviewed) {
    const skip = (reason: string) =>
      skipped.push({ externalId: review.id, reason });
    const source = prepared.get(review.id);
    if (!source) {
      skip("준비된 문항에 없다(추출을 다시 한 뒤 검토가 낡았다)");
      continue;
    }
    if (seen.has(review.id)) {
      skip("같은 열쇠가 두 번");
      continue;
    }
    seen.add(review.id);
    // 검토자가 본 본문이 지금 본문과 같은가 — 다르면 그 검토는 다른 글에 대한 것이다
    if (winner.get(review.id)!.lines.join("\n") !== source.content) {
      skip("검토 뒤에 본문이 바뀌었다 — 다시 검토해야 한다");
      continue;
    }
    if (source.bad.length > 0) {
      skip(`수식이 그려지지 않는다 — ${source.bad[0]}`);
      continue;
    }

    // ── 답 — 어느 것을 싣나 ───────────────────────────────────────────────
    let answer: string;
    let verified: string;
    let reviewerSolution = review.solution ?? null;
    if (review.verdict === "match") {
      // 정답지가 계산 과정을 끝까지 적었거나(○× 를 변환이 놓쳤거나) 하면 검토자의 짧은 답을 싣는다 — 값은 같다
      answer =
        review.how === "tail" || review.how === "ox"
          ? review.answer!
          : source.answer;
      verified = `첫 검토 일치(${review.how})`;
    } else if (review.verdict === "differ") {
      const second = winner.get(review.id)!.judged;
      if (!second || second.verdict === "missing") {
        skip("둘째 검토를 기다린다");
        continue;
      }
      if (second.verdict === "neither" || second.verdict === "unsure") {
        skip(
          `둘째 검토: ${second.verdict === "neither" ? "정답지가 이 문항의 답이 아니다" : "가를 수 없다"} — ${second.why ?? ""}`.trim(),
        );
        continue;
      }
      if (!second.final?.trim()) {
        skip("둘째 검토가 실을 답을 적지 않았다");
        continue;
      }
      answer = second.final;
      verified = `둘째 검토 ${second.verdict}`;
      // 첫 검토자가 틀렸으면 그 해설도 틀린 답으로 끝난다 — 둘째 검토자가 다시 쓴 것만 쓴다
      if (second.verdict === "key")
        reviewerSolution = second.solution?.trim() ? second.solution : null;
    } else {
      skip(
        review.verdict === "not-ok"
          ? `실을 수 없는 문항 — ${review.why ?? ""}`.trim()
          : review.verdict === "no-answer"
            ? "검토자가 풀지 못했다"
            : "검토자의 출력에 없다",
      );
      continue;
    }

    // ── 본문 — 검토자가 «문항이 아닌 줄»이라 한 줄을 뺀다(글자는 고치지 않는다) ──
    const drop = new Set(review.drop ?? []);
    const kept = source.content
      .split("\n")
      .filter((_line, index) => !drop.has(index))
      .join("\n");
    const finish = finished.get(review.id);
    // 본문 머리에 붙은 문항 번호(«01다음을 …») · 배점 표시(«[4점]»)는 걷는다 — 손질한 쪽 · 안 한 쪽에 같이 건다
    const cleaned = unsplit(cleanContent(tidy(finish?.content ?? kept)));
    // 🔴 마무리 손질은 글자를 안 바꾼다 — 빈칸을 접어 견줘서, 다르면 그 문항은 싣지 않는다
    const squeezed = (text: string) =>
      cleanContent(tidy(text)).replace(/\s+/g, "");
    if (squeezed(cleaned) !== squeezed(kept)) {
      skip("마무리 손질이 본문의 글자를 바꿨다");
      continue;
    }
    // ── 이름 — 출판사를 드러내는 사람 · 학교 이름은 다른 이름으로(원장님 2026-10-08 · `neutralNames.ts`) ──
    // 한 문항의 글 전부(본문 · 정답 · 해설 후보들)에 같은 이름을 쓴다. 지면 검토의 지문은 **바꾼 뒤의 글**로 낸다 —
    // 이름이 바뀐 문항은 앞 회차의 판정이 낡아 다시 검토받는다.
    const found = checks.get(review.id);
    const renamer = createRenamer(publisherOf(source), [
      cleaned,
      answer,
      source.solution,
      reviewerSolution,
      found?.newSolution,
    ]);
    let content = renamer.fix(cleaned);

    // ── 그림 — 본문의 `[그림]` 차례가 곧 그림 파일의 차례다(`figurePlacement.ts`) ──────────
    const meta = figureMeta.get(review.id);
    let figures: LoadFigure[] = [];
    let choiceFigureIndex: number[] = [];
    const figureNotes: string[] = [];
    if (meta) {
      if (countMarkers(source.content) !== meta.figures.length) {
        skip("본문의 [그림] 표지와 그림 파일의 수가 다르다");
        continue;
      }
      // 검토자가 본 그림이 지금 싣는 그림인가 — 추출을 고쳐 그림이 바뀌었으면 본문이 같아도 그 검토는 낡았다
      const seen = figuresSeen(
        review.figureKeys,
        meta.figures.map((figure) => figure.sha),
      );
      if (seen !== "same") {
        skip(
          seen === "changed"
            ? "검토 뒤에 그림이 바뀌었다 — 다시 검토해야 한다"
            : "그림을 본 검토가 아니다",
        );
        continue;
      }
      // 빠지는 그림 둘 — 검토자가 뺀 줄에 있던 것 · 검토자가 «이 문항의 그림이 아니다»(장식 · 다른 문항의 그림)라고 한 것
      const inDroppedLine = new Set<number>();
      let ordinal = 0;
      source.content.split("\n").forEach((line, index) => {
        for (let n = countMarkers(line); n > 0; n -= 1) {
          ordinal += 1;
          if (drop.has(index)) inDroppedLine.add(ordinal);
        }
      });
      const notMine = new Set(review.noFigure ?? []);
      const remaining = meta.figures
        .map((figure, index) => ({ figure, ordinal: index + 1 }))
        .filter((item) => !inDroppedLine.has(item.ordinal));
      if (countMarkers(content) !== remaining.length) {
        skip("손질한 본문의 [그림] 표지와 그림의 수가 다르다");
        continue;
      }
      content = dropFigureMarkers(
        content,
        new Set(
          remaining.flatMap((item, index) =>
            notMine.has(item.ordinal) ? [index + 1] : [],
          ),
        ),
      );
      // 그림이 번호 앞에 선 보기 줄(«[그림] ①»)은 보기 줄 꼴(«① [그림]»)로 — 표지의 수 · 차례는 그대로다
      content = liftChoiceMarkers(content);
      const kept = remaining.filter((item) => !notMine.has(item.ordinal));
      if (kept.some((item) => !item.figure.px)) {
        skip("그림을 꺼내지 않았다 — figures.py --export");
        continue;
      }
      figures = kept.map(({ figure }) => ({
        source: join(DIR, set.figures!, "img", ...figure.file.split("/")),
        path: join(FIGURE_PUBLIC_DIR, ...figure.file.split("/")),
        url: FIGURE_URL_PREFIX + figure.file,
        width: figure.px![0],
        height: figure.px![1],
        mm: figure.mm,
        // 지면 검토는 «지면에 나가는 그림»을 봤다 — 꺼낸 파일이 바뀌면(자르기를 고쳤다) 그 판정은 낡는다
        sha: figure.imgSha ?? figure.sha,
      }));
      const index = choiceIndexOf(content);
      // 🔴 짝을 모르면 아무 그림이나 ① 에 붙이지 않는다 — 빈 배열(«모른다»)로 싣고 잠근다.
      //    «보기가 그림뿐인데 짝이 온전하지 않다»는 푸시 관문(check:figure-choices)과 같은 함수로 가린다 — 2026-10-08 에
      //    «[그림] ①»(그림이 번호 앞) 줄을 발문 그림으로 읽어 짝이 모두 0 인 21문항이 출제 가능으로 실려 관문이 막혔다.
      const choiceNote = figureChoiceNote(content, figures.length, index);
      if (choiceNote) figureNotes.push(choiceNote);
      choiceFigureIndex = choiceNote ? [] : (index ?? []);
    } else if (countMarkers(content) > 0) {
      skip("본문에 [그림] 표지가 있는데 그림이 없다");
      continue;
    }
    answer = renamer.fix(tidy(answer));

    // ── 해설 — 후보 하나를 정하고, 지면 검토가 «이 문항의 풀이다»라고 한 것만 싣는다 ──
    // 🔴 교과서 풀이 칸은 첫 검토가 읽지 않았다(답만 맞췄다). 2026-10-07 에 그 칸을 그대로 실었더니 «다음 문항의 본문» ·
    //    «답을 채워 넣은 문제지» · 세로셈이 풀린 글이 해설로 들어가 있었다.
    // 후보: 교과서 풀이(쓸 수 있는 꼴이면) → 없으면 첫 검토자가 쓴 해설. 지면 검토자는 이 후보를 읽고
    //       `keep`(그대로) · `replace`(다시 썼다) · `none`(후보가 없어 새로 썼다)을 낸다.
    const hold: string[] = [];
    const usable = (text: string): boolean =>
      textFlaws("해설", text).length === 0 && hwpLeftovers(text).length === 0;
    const textbook =
      !review.needSolution && source.solution && !source.solutionFigure
        ? renamer.fix(unsplit(tidy(finish?.solution ?? source.solution)))
        : null;
    const firstWritten = reviewerSolution?.trim()
      ? renamer.fix(tidy(reviewerSolution))
      : null;
    const candidate: {
      text: string;
      from: "original" | "ai";
    } | null =
      textbook && usable(textbook)
        ? { text: textbook, from: "original" }
        : firstWritten && usable(firstWritten)
          ? { text: firstWritten, from: "ai" }
          : null;
    const checkKey = checkKeyOf(
      content,
      answer,
      candidate?.text ?? null,
      figures.map((figure) => figure.sha),
    );
    // 검토 뒤에 글이 바뀌었으면 그 검토는 다른 글에 대한 것이다 — 없는 것으로 친다
    const check = found?.key === checkKey ? found : undefined;

    // 🔴 실으려는 «그 글»을 읽은 판정이 없으면 잠근다 — 첫 검토는 «풀 수 있나 · 답이 맞나»를 봤지 «지면에 낼 꼴인가»를
    //    보지 않았다(표본 28개로 갈음했다가 «boldx» 를 놓쳤다).
    if (!check) hold.push("지면 검토를 아직 받지 않았다");
    let solution = candidate?.text ?? null;
    let solutionSource: LoadRow["solutionSource"] = candidate?.from ?? "none";
    if (check && check.solution !== "keep") {
      // 후보가 이 문항의 풀이가 아니거나 없었다 — 지면 검토자가 쓴 것만 쓴다(못 쓸 꼴이면 해설 없이 잠근다)
      const rewritten = check.newSolution?.trim()
        ? renamer.fix(tidy(check.newSolution))
        : null;
      solution = rewritten && usable(rewritten) ? rewritten : null;
      solutionSource = solution ? "ai" : "none";
    }
    if (!solution) hold.push("해설이 없다");
    for (const note of [
      ...figureNotes,
      leftoverNote("본문", content),
      leftoverNote("정답", answer),
      // 바꾸지 못한 출판사의 온 이름(«천재교육 교과서 87쪽»)이 글에 있으면 잠근다
      blatantNote(content, answer, solution),
      check?.content === "flaw"
        ? `지면 검토: ${check.contentWhy ?? "지면에 낼 꼴이 아니다"}`
        : null,
    ])
      if (note) hold.push(note);

    // ── 차시 · 유형 · 난이도 ──────────────────────────────────────────────
    const flaws: string[] = [];
    const unit = review.unit
      ? unitsOf(review.grade)[review.unit - 1]
      : undefined;
    if (!unit) flaws.push("차시가 없다");
    if (!DIFFICULTIES.includes(review.level as Difficulty))
      flaws.push(`난이도 «${review.level}»`);
    if (!TYPES.includes(review.type as (typeof TYPES)[number]))
      flaws.push(`유형 «${review.type}»`);
    if (!FORMATS.includes(review.format as (typeof FORMATS)[number]))
      flaws.push(`형식 «${review.format}»`);
    if (!content) flaws.push("본문이 비었다");
    if (!answer) flaws.push("정답이 비었다");
    flaws.push(...textFlaws("본문", content), ...textFlaws("정답", answer));
    if (flaws.length > 0) {
      skip(flaws.join(" · "));
      continue;
    }

    // ── 책 · 자료 ─────────────────────────────────────────────────────────
    const book = parseSourceBook({
      bookFolder: source.book,
      grade: source.grade,
    });
    const material = parseSourceMaterial({
      path: source.path,
      bookFolder: source.book,
      key: source.key,
    });
    const bookCheck = sourceBookSchema.safeParse(book);
    const materialCheck = sourceMaterialSchema.safeParse(material);
    if (!bookCheck.success || !materialCheck.success) {
      skip(
        `책 · 자료 메타데이터가 계약에 안 맞는다 — ${(bookCheck.error ?? materialCheck.error)?.issues[0]?.message}`,
      );
      continue;
    }
    books.set(book.externalKey, bookCheck.data);
    materials.set(material.externalKey, {
      ...materialCheck.data,
      bookKey: book.externalKey,
    });

    rows.push({
      externalId: review.id,
      materialKey: material.externalKey,
      grade: review.grade,
      chapter: unit!.chapter,
      section: unit!.section,
      difficulty: review.level as Difficulty,
      // 풀이 과정을 쓰라는 문항은 유형도 서술형이다(은행의 관례 — 유형 칸이 형식을 겸한다)
      problemType: review.format === "서술형" ? "서술형" : review.type!,
      questionType: review.format!,
      content,
      answer,
      solution,
      solutionSource,
      sourceFile: source.path.slice(0, 500),
      questionNumber: source.number,
      verified,
      hold,
      renamed: renamer.renamed(),
      figures,
      choiceFigureIndex,
      checkKey,
      candidateSolution: candidate?.text ?? null,
      candidateFrom: candidate?.from ?? null,
    });
  }
  return { rows, skipped };
}

function tally<T>(
  items: T[],
  key: (item: T) => string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

async function revert(prisma: PrismaClient): Promise<void> {
  if (!existsSync(LEDGER)) throw new Error(`원장이 없다: ${LEDGER}`);
  const ledger = JSON.parse(readFileSync(LEDGER, "utf8")) as {
    problemIds: string[];
  };
  const used = await prisma.testProblem.count({
    where: { problemId: { in: ledger.problemIds } },
  });
  console.log(
    `원장의 문항 ${ledger.problemIds.length} · 시험지에 쓰인 것 ${used}`,
  );
  if (used > 0)
    throw new Error("시험지에 이미 쓰인 문항이 있다 — 지우지 않는다. 멈춘다.");
  if (!APPLY) {
    console.log(
      "드라이런이다. 실제로 지우려면 ALLOW_SHARED_IMPORT=1 … --revert --apply.",
    );
    return;
  }
  const deleted = await prisma.problem.deleteMany({
    where: { id: { in: ledger.problemIds }, source: "school_textbook" },
  });
  // 문항이 하나도 안 남은 자료 · 책만 지운다
  const materials = await prisma.sourceMaterial.deleteMany({
    where: { problems: { none: {} } },
  });
  const books = await prisma.sourceBook.deleteMany({
    where: { materials: { none: {} } },
  });
  console.log(
    `지웠다 — 문항 ${deleted.count} · 자료 ${materials.count} · 책 ${books.count}`,
  );
}

/**
 * 이미 실린 문항을 지금의 계획에 맞춘다 — 본문 · 정답 · 해설 · 해설의 출처 · 잠금 다섯 칸만(`--refresh`).
 *
 * 문항을 지우고 다시 넣지 않는다 — 문항 번호와 id 가 그대로여야 시험지 · 바구니에 담긴 것이 안 끊긴다.
 * 계획에서 빠진 문항(검토가 뒤집혔다)은 지우지 않고 잠근다.
 * 🔴 고치기 전 값은 회차마다 **새 파일**에 남긴다(`load/refresh-<시각>.json`) — 원장을 덮어쓰면 앞 회차를 못 되돌린다.
 */
async function refresh(
  prisma: PrismaClient,
  loadable: Array<LoadRow & { unitId: string }>,
): Promise<void> {
  const plan = new Map(loadable.map((row) => [row.externalId, row]));
  const saved = await prisma.problem.findMany({
    where: { source: "school_textbook" },
    select: {
      id: true,
      externalId: true,
      content: true,
      answer: true,
      solution: true,
      solutionSource: true,
      directUseAllowed: true,
      figureUrls: true,
      figureDims: true,
      figureSourceMm: true,
      choiceFigureIndex: true,
      figureSource: true,
    },
  });
  if (ADOPT) {
    // 지금 DB 의 값이 **계획과 같은 문항만** «적재기가 쓴 값»으로 삼는다 — 계획과 다른 문항은 누가 고쳤는지 모른다
    // (지문을 안 남기면 다음 회차가 «사람이 고친 문항»으로 보고 건드리지 않는다).
    const written = readWritten();
    let adopted = 0;
    let left = 0;
    for (const row of saved) {
      const want = plan.get(row.externalId ?? "");
      const same =
        want && fingerprintOf(row) === fingerprintOf(columnsOfRow(want));
      if (same) {
        written.set(row.externalId ?? "", fingerprintOf(row));
        adopted += 1;
      } else left += 1;
    }
    writeWritten(written);
    console.log(
      `계획과 같은 ${adopted}문항을 적재기가 쓴 값으로 삼았다 · 계획과 달라 남긴 것 ${left} — ${WRITTEN}`,
    );
    return;
  }
  if (!existsSync(WRITTEN))
    throw new Error(
      `지문 원장이 없다(${WRITTEN}) — 사람이 고친 문항을 가릴 수 없어 고치지 않는다. 아무도 손대지 않은 것이 확실하면 --refresh --adopt 로 지금 DB 를 기준으로 삼는다.`,
    );
  const written = readWritten();
  const { changes, foreign } = planRefresh(
    saved,
    new Map(
      loadable.map((row) => [
        row.externalId,
        { ...columnsOfRow(row), hold: row.hold },
      ]),
    ),
    written,
  );
  // 원문이 바뀌거나 잠기는 줄 → 그 원문의 열린 지정 슬롯을 같이 잠근다(대응은 그때의 원문으로 검산됐다).
  const slotReasons = new Map(
    changes.flatMap((change) => {
      const reason = slotBreakingReason(change.before, change.after);
      return reason ? [[change.id, reason] as const] : [];
    }),
  );
  const slotLocks = planDesignatedSlotLocks(
    slotReasons,
    await findDesignatedSlotRows(prisma, [...slotReasons.keys()]),
  );
  // 사람이 고친 원문(건드리지 않는다)의 열린 지정 슬롯 — 원문이 바뀌었는지 도구는 모른다. 수만 알린다.
  const foreignIds = new Set(foreign);
  const foreignSources = saved
    .filter((row) => foreignIds.has(row.externalId ?? ""))
    .map((row) => row.id);
  const foreignOpenSlots = planDesignatedSlotLocks(
    new Map(foreignSources.map((id) => [id, "사람이 고친 원문"])),
    await findDesignatedSlotRows(prisma, foreignSources),
  ).length;
  const differs = (key: keyof RefreshColumns): number =>
    changes.filter((change) => change.before[key] !== change.after[key]).length;
  const after = new Map(changes.map((change) => [change.id, change.after]));
  const openAfter = saved.filter(
    (row) => (after.get(row.id) ?? row).directUseAllowed,
  ).length;
  console.log(
    JSON.stringify(
      {
        실린_문항: saved.length,
        계획에_없는_실린_문항: saved.filter(
          (row) => !plan.has(row.externalId ?? ""),
        ).length,
        아직_안_실린_계획의_문항:
          loadable.length -
          saved.filter((row) => plan.has(row.externalId ?? "")).length,
        고칠_문항: changes.length,
        // 🔴 적재기가 쓴 값이 아니다 — 문제은행에서 사람이 고쳤거나 잠금을 풀었다. 건드리지 않는다
        사람이_고쳐_건드리지_않는_문항: foreign.length,
        본문이_바뀜: differs("content"),
        정답이_바뀜: differs("answer"),
        해설이_바뀜: differs("solution"),
        해설의_출처가_바뀜: differs("solutionSource"),
        푸는_문항: changes.filter(
          (change) =>
            !change.before.directUseAllowed && change.after.directUseAllowed,
        ).length,
        잠그는_문항: changes.filter(
          (change) =>
            change.before.directUseAllowed && !change.after.directUseAllowed,
        ).length,
        고친_뒤_출제_가능: openAfter,
        고친_뒤_잠김: saved.length - openAfter,
        // 원문이 바뀌거나 잠겨 같이 잠그는 열린 지정 변형(복습 두 슬롯) — 다시 검증한 뒤 연다
        지정_변형을_잠금: slotLocks.length,
        // 🔴 사람이 고친 원문의 열린 지정 변형 — 원문의 대응이 깨졌는지 도구가 모른다. 사람이 확인한다
        사람이_고친_원문의_열린_지정_변형: foreignOpenSlots,
      },
      null,
      1,
    ),
  );
  if (!APPLY) {
    // 무엇이 바뀌는지 읽어 볼 수 있게 — 드라이런의 것은 덮어써도 된다(원장이 아니다)
    writeFileSync(
      join(OUT, "refresh-dryrun.json"),
      JSON.stringify({ foreign, changes, slotLocks }, null, 1),
      "utf8",
    );
    console.log(
      `\n드라이런이다 — DB 에 아무것도 쓰지 않았다(바뀔 줄: ${join(OUT, "refresh-dryrun.json")}). 고치려면 ALLOW_SHARED_IMPORT=1 … --refresh --apply.`,
    );
    return;
  }
  if (foreign.length > 0)
    console.log(
      `사람이 고친 문항 ${foreign.length} — 건드리지 않는다: ${foreign.slice(0, 8).join(" ")}${foreign.length > 8 ? " …" : ""}`,
    );
  if (changes.length === 0) return;
  const changed = new Set(changes.map((change) => change.externalId));
  const locksByOrigin = new Map<string, typeof slotLocks>();
  for (const lock of slotLocks)
    locksByOrigin.set(lock.originProblemId, [
      ...(locksByOrigin.get(lock.originProblemId) ?? []),
      lock,
    ]);
  const withoutFiles = missingFigureFiles(
    loadable.filter((row) => changed.has(row.externalId)),
  );
  if (withoutFiles.length > 0)
    throw new Error(
      `그림 파일이 저장소에 없는 문항 ${withoutFiles.length} — --copy-figures 로 놓고, 그 커밋이 배포된 뒤에 고친다`,
    );
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ledgerPath = join(OUT, `refresh-${stamp}.json`);
  // 원장을 먼저 쓴다 — 고치다 끊겨도 «무엇을 고치려 했나»가 남는다
  writeFileSync(
    ledgerPath,
    JSON.stringify({ refreshedAt: stamp, changes, slotLocks }, null, 1),
    "utf8",
  );
  let done = 0;
  let slotsLocked = 0;
  for (let start = 0; start < changes.length; start += 200) {
    const batch = changes.slice(start, start + 200);
    // 원문과 그 원문의 지정 슬롯 잠금을 한 트랜잭션에 — 끊겨도 «원문만 바뀌고 변형은 열린» 자리가 안 남는다
    const batchLocks = batch.flatMap(
      (change) => locksByOrigin.get(change.id) ?? [],
    );
    const results = await prisma.$transaction([
      ...batch.map((change) =>
        prisma.problem.update({
          where: { id: change.id },
          data: change.after,
        }),
      ),
      ...(batchLocks.length
        ? [prisma.problem.updateMany(lockDesignatedSlotsArgs(batchLocks))]
        : []),
    ]);
    if (batchLocks.length)
      slotsLocked += (results.at(-1) as { count: number }).count;
    done = Math.min(start + 200, changes.length);
    console.log(`  ${done}/${changes.length}`);
  }
  if (slotLocks.length)
    console.log(
      `지정 변형 잠금 — 계획 ${slotLocks.length} · 실제 ${slotsLocked}`,
    );
  // 고친 문항의 지문을 새 값으로 — 다음 회차가 «내가 쓴 값»으로 알아본다
  for (const change of changes)
    written.set(change.externalId, fingerprintOf(change.after));
  writeWritten(written);
  console.log(`\n고쳤다 — 문항 ${done}\n원장: ${ledgerPath}`);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    if (REVERT) return await revert(prisma);

    const { rows, skipped, books, materials } = buildRows();
    mkdirSync(OUT, { recursive: true });

    // 차시 — 과목 · 대단원 · 차시 이름이 글자 그대로 같은 DB 의 줄
    const units = await prisma.unit.findMany({
      select: { id: true, grade: true, chapter: true, section: true },
    });
    const unitId = new Map(
      units.map((unit) => [
        `${unit.grade} :: ${unit.chapter} :: ${unit.section}`,
        unit.id,
      ]),
    );
    const loadable: Array<LoadRow & { unitId: string }> = [];
    for (const row of rows) {
      const id = unitId.get(`${row.grade} :: ${row.chapter} :: ${row.section}`);
      if (!id)
        skipped.push({
          externalId: row.externalId,
          reason: `DB 에 없는 차시 — ${row.grade} · ${row.chapter} · ${row.section}`,
        });
      else loadable.push({ ...row, unitId: id });
    }

    const existing = new Set(
      (
        await prisma.problem.findMany({
          where: { externalId: { startsWith: "tb-" } },
          select: { externalId: true },
        })
      ).map((row) => row.externalId!),
    );
    const fresh = loadable.filter((row) => !existing.has(row.externalId));

    const summary = {
      실을_문항: loadable.length,
      이미_있는_문항: loadable.length - fresh.length,
      이번에_넣을_문항: fresh.length,
      빠진_문항: skipped.length,
      책: books.size,
      자료: materials.size,
      과목: tally(loadable, (row) => row.grade),
      난이도: tally(loadable, (row) => row.difficulty),
      유형: tally(loadable, (row) => row.problemType),
      형식: tally(loadable, (row) => row.questionType),
      해설: tally(loadable, (row) => row.solutionSource),
      출제_가능: loadable.filter((row) => row.hold.length === 0).length,
      잠금: loadable.filter((row) => row.hold.length > 0).length,
      잠금_까닭: tally(
        loadable.flatMap((row) => row.hold),
        (reason) =>
          reason
            .replace(/(남은 표기) .*/, "$1")
            .replace(/(출판사 이름이 글에 있다) .*/, "$1")
            .replace(/(지면 검토): .*/, "$1"),
      ),
      그림_문항: loadable.filter((row) => row.figures.length > 0).length,
      그림: loadable.reduce((sum, row) => sum + row.figures.length, 0),
      이름을_바꾼_문항: tally(
        loadable.flatMap((row) => row.renamed),
        (renamed) => renamed,
      ),
      답을_확인한_길: tally(loadable, (row) =>
        row.verified.replace(/\(.*\)/, ""),
      ),
      출판사: tally(
        loadable,
        (row) => books.get(materials.get(row.materialKey)!.bookKey)!.publisher,
      ),
      자료_종류: tally(loadable, (row) => materials.get(row.materialKey)!.kind),
      빠진_까닭: tally(skipped, (skip) =>
        skip.reason
          .split(" — ")[0]!
          .split(" · ")[0]!
          .replace(/«.*»/, "«…»")
          .slice(0, 40),
      ),
    };
    writeFileSync(
      PLAN,
      JSON.stringify({ summary, skipped, rows: loadable }, null, 1),
      "utf8",
    );
    console.log(JSON.stringify(summary, null, 1));
    console.log(`계획: ${PLAN}`);

    if (COPY_FIGURES) {
      // 계획의 그림 파일을 저장소에 놓는다(잠긴 문항의 것도 — 은행에서는 보인다). DB 는 안 건드린다
      let copied = 0;
      let kept = 0;
      for (const row of loadable)
        for (const figure of row.figures) {
          if (existsSync(figure.path)) {
            kept += 1;
            continue;
          }
          mkdirSync(dirname(figure.path), { recursive: true });
          copyFileSync(figure.source, figure.path);
          copied += 1;
        }
      console.log(
        `\n그림 파일 — 새로 놓은 것 ${copied} · 이미 있던 것 ${kept} → ${FIGURE_PUBLIC_DIR}\n` +
          "🔴 그냥 main 에 밀면 운영 빌드가 깨진다(SHARED_FIGURE_ASSETS_EXTERNALIZED — 추적 그림 목록이 검증된 목록과 같아야 한다).\n" +
          "커밋 → scripts/storage/shared-figures-cli.mjs manifest · upload · verify → src/config 두 파일 → main → 배포 Ready 뒤에 문항을 싣는다(10-handoff §0-ZS).",
      );
      return;
    }
    if (REFRESH) return await refresh(prisma, loadable);

    if (!APPLY) {
      console.log(
        "\n드라이런이다 — DB 에 아무것도 쓰지 않았다. 실으려면 ALLOW_SHARED_IMPORT=1 … --apply.",
      );
      return;
    }

    const withoutFiles = missingFigureFiles(fresh);
    if (withoutFiles.length > 0)
      throw new Error(
        `그림 파일이 저장소에 없는 문항 ${withoutFiles.length} — --copy-figures 로 놓고, 그 커밋이 배포된 뒤에 싣는다(${withoutFiles.slice(0, 3).join(" ")} …)`,
      );

    // ── 책 → 자료 → 문항 ────────────────────────────────────────────────
    const bookId = new Map<string, string>();
    for (const book of books.values()) {
      const saved = await prisma.sourceBook.upsert({
        where: { externalKey: book.externalKey },
        create: book,
        update: {},
      });
      bookId.set(book.externalKey, saved.id);
    }
    const materialId = new Map<string, string>();
    const usedMaterials = new Set(fresh.map((row) => row.materialKey));
    for (const material of materials.values()) {
      if (!usedMaterials.has(material.externalKey)) continue;
      const { bookKey, ...data } = material;
      const saved = await prisma.sourceMaterial.upsert({
        where: { externalKey: material.externalKey },
        create: { ...data, bookId: bookId.get(bookKey)! },
        update: {},
      });
      materialId.set(material.externalKey, saved.id);
    }

    let inserted = 0;
    for (let start = 0; start < fresh.length; start += 500) {
      const chunk = fresh.slice(start, start + 500);
      const result = await prisma.problem.createMany({
        data: chunk.map((row) => ({
          unitId: row.unitId,
          source: "school_textbook" as const,
          difficulty: row.difficulty,
          problemType: row.problemType,
          questionType: row.questionType,
          // 본문 · 정답 · 해설 · 잠금 · 그림 — `--refresh` 가 맞추는 칸들과 같은 함수에서 온다
          ...columnsOfRow(row),
          externalId: row.externalId,
          sourceFile: row.sourceFile,
          examId: row.materialKey,
          questionNumber: row.questionNumber,
          // 검토자가 정답 없이 풀어 출판사 정답과 맞춘 문항만 여기까지 온다
          reviewStatus: "approved" as const,
          pool: "shared" as const,
          sourceMaterialId: materialId.get(row.materialKey)!,
        })),
        skipDuplicates: true,
      });
      inserted += result.count;
      console.log(`  ${Math.min(start + 500, fresh.length)}/${fresh.length}`);
    }

    // 이번에 넣은 문항의 지문 — `--refresh` 가 «내가 쓴 값»으로 알아본다
    const written = readWritten();
    for (const row of fresh)
      written.set(row.externalId, fingerprintOf(columnsOfRow(row)));
    if (fresh.length > 0) writeWritten(written);
    const saved = await prisma.problem.findMany({
      where: { externalId: { in: loadable.map((row) => row.externalId) } },
      select: { id: true, externalId: true, problemCode: true },
    });
    writeFileSync(
      LEDGER,
      JSON.stringify(
        {
          loadedAt: new Date().toISOString(),
          inserted,
          problemIds: saved.map((row) => row.id),
          problems: saved,
        },
        null,
        1,
      ),
      "utf8",
    );
    console.log(
      `\n넣었다 — 문항 ${inserted} · 책 ${bookId.size} · 자료 ${materialId.size}\n원장: ${LEDGER}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
