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
 * 이미 있는 문항은 건드리지 않는다(고쳐 쓰지 않는다 — 고칠 일은 따로 한다).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

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
import { renderMathHtml } from "../../../src/lib/math/renderMathHtml";

const DIR = process.argv[2];
const optionValues = (name: string): string[] =>
  process.argv.flatMap((arg, index) =>
    arg === name && process.argv[index + 1] ? [process.argv[index + 1]!] : [],
  );
const PREPARED_DIR = optionValues("--prepared")[0] ?? "prepared";
const REVIEW_DIRS =
  optionValues("--review").length > 0 ? optionValues("--review") : ["review"];
const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
if (!DIR)
  throw new Error(
    "사용: load-school-textbook.ts <작업 폴더> [--apply] [--revert]",
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

/** 수식 안의 줄바꿈은 빈칸으로 — 변환기가 긴 식을 줄 바꿔 낸 것이다(뜻은 같다). 그 밖은 건드리지 않는다. */
function tidy(text: string): string {
  return text
    .replace(/\$[^$]*\$/g, (math) => math.replace(/\s*\n\s*/g, " "))
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

interface Skip {
  externalId: string;
  reason: string;
}

function buildRows(): {
  rows: LoadRow[];
  skipped: Skip[];
  books: Map<string, SourceBookInput>;
  materials: Map<string, SourceMaterialInput & { bookKey: string }>;
} {
  const prepared = new Map(
    readJsonl<Prepared>(join(DIR, PREPARED_DIR, "prepared.jsonl")).map(
      (row) => [row.id, row],
    ),
  );
  // 검토 폴더들 — 뒤에 준 폴더가 이긴다. 둘째 검토는 **그 검토와 같은 폴더의 것**만 본다
  const winner = new Map<
    string,
    { review: Reviewed; judged: Judged | undefined; lines: string[] }
  >();
  for (const dir of REVIEW_DIRS) {
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
  const unitLists = new Map<
    string,
    Array<{ u: number; chapter: string; section: string }>
  >();
  const unitsOf = (grade: string) => {
    if (!unitLists.has(grade)) {
      unitLists.set(
        grade,
        JSON.parse(
          readFileSync(
            join(DIR, REVIEW_DIRS[0]!, "units", `${grade}.json`),
            "utf8",
          ),
        ),
      );
    }
    return unitLists.get(grade)!;
  };

  const rows: LoadRow[] = [];
  const skipped: Skip[] = [];
  const books = new Map<string, SourceBookInput>();
  const materials = new Map<
    string,
    SourceMaterialInput & { bookKey: string }
  >();
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
    const content = tidy(
      source.content
        .split("\n")
        .filter((_line, index) => !drop.has(index))
        .join("\n"),
    );
    answer = tidy(answer);

    // ── 해설 — 교과서 것이 있으면 그것, 없거나 답만 적혀 있으면 검토자가 쓴 것 ──
    let solution: string | null = null;
    let solutionSource: LoadRow["solutionSource"] = "none";
    if (!review.needSolution && source.solution && !source.solutionFigure) {
      solution = tidy(source.solution);
      solutionSource = "original";
    } else if (reviewerSolution?.trim()) {
      solution = tidy(reviewerSolution);
      solutionSource = "ai";
    }

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
    if (solution) {
      const solutionFlaws = textFlaws("해설", solution);
      if (solutionFlaws.length > 0) {
        // 해설의 흠은 문항을 버릴 까닭이 아니다 — 해설만 뺀다
        solution = null;
        solutionSource = "none";
      }
    }
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
    });
  }
  return { rows, skipped, books, materials };
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

    if (!APPLY) {
      console.log(
        "\n드라이런이다 — DB 에 아무것도 쓰지 않았다. 실으려면 ALLOW_SHARED_IMPORT=1 … --apply.",
      );
      return;
    }

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
          content: row.content,
          answer: row.answer,
          solution: row.solution,
          solutionSource: row.solutionSource,
          externalId: row.externalId,
          sourceFile: row.sourceFile,
          examId: row.materialKey,
          questionNumber: row.questionNumber,
          // 검토자가 정답 없이 풀어 출판사 정답과 맞춘 문항만 여기까지 온다
          reviewStatus: "approved" as const,
          directUseAllowed: true,
          pool: "shared" as const,
          sourceMaterialId: materialId.get(row.materialKey)!,
        })),
        skipDuplicates: true,
      });
      inserted += result.count;
      console.log(`  ${Math.min(start + 500, fresh.length)}/${fresh.length}`);
    }

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
