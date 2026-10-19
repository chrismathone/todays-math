/**
 * **적재본에 죽은 역슬래시가 남아 있는가** — 공유 DB(D-31)를 읽어서 본다.
 *
 *   npx tsx scripts/qa/checkLoadedRawLatex.ts          # 검사
 *   npx tsx scripts/qa/checkLoadedRawLatex.ts --list   # 걸린 문항 전량을 찍는다
 *
 * ## 왜 관문(vitest)이 아니라 여기인가
 *
 * `probe-middle-raw-latex.ts` 는 **엔진**(`generateMiddleProblem`)만 잰다. 그 축은
 * 옳지만, **이미 적재된 행은 그 판정기의 시야 밖**이다. 2026-08-27 에 정확히 그 틈이
 * 벌어졌다 — 14:0x 에 중등 3,327문항을 적재하고 15:55~17:38 에 엔진을 고쳤다.
 * 엔진은 0자리인데 지면에는 `angle C=90^circ` 가 16문항 나가고 있었고, **원장님이
 * 화면에서 찾아 주실 때까지 아무 지표도 울지 않았다.** 핸드오프의 「병합 뒤 0자리」는
 * 엔진 기준으로 참이라 더 헷갈렸다.
 *
 * 이 저장소는 **DB 를 읽는 가드를 pre-push 에 둔다**(`checkDeployedFigures.ts` 선례).
 * 관문(vitest)은 망 없이 돌아야 하고, 공유 DB 는 코드보다 먼저 바뀌므로 「미는 그
 * 커밋」이 아니라 **지금 DB** 를 물어야 뜻이 있다.
 *
 * ## 참을 어디서 가져오는가
 *
 * 판정 규칙을 **옮겨 적지 않는다.** `probe-middle-raw-latex.ts` 의 `deadBackslashHits`
 * 를 그대로 부른다 — 규칙이 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
 *
 * ## 이 가드가 눈멀 수 있는 자리 둘, 그리고 막은 법
 *
 * ㉠ **컬럼 목록을 손으로 적었다.** 새 텍스트 컬럼이 생겼는데 여기 없으면 그 컬럼은
 *    구조적으로 0이 된다. 그래서 `assertTextColumns` 가 DB 를 훑어 실제와 다르면 멈춘다.
 * ㉡ **0이 「깨끗」인지 「못 셈」인지 안 갈린다.** 그래서 판정 전에 **일부러 걸리는 글**을
 *    검출기에 대 본다(양성 대조). 그게 안 걸리면 검사를 **거부**한다 — 도장은 «아니오»를
 *    낼 수 없으므로, «예»를 낼 수 있음을 회차마다 확인한다(2026-08-23 교훈).
 */
import { PrismaClient } from "@prisma/client";

import {
  controlCharOrigins,
  deadBackslashHits,
} from "./probe-middle-raw-latex";

const prisma = new PrismaClient();

/**
 * LaTeX 가 실릴 수 있는 텍스트 컬럼. **손으로 적은 목록이라 샌다** —
 * 그래서 `assertTextColumns` 가 DB 를 훑어 실제와 다르면 멈춘다.
 */
const TEXT_COLUMNS = ["content", "answer", "solution"] as const;

/**
 * 이 가드가 **일부러 안 보는** 컬럼 — 여기 적어 두지 않으면 ㉠ 이 빨개진다.
 * 적을 때는 **왜 안 보는지**를 같이 적을 것. 「그냥 안 본다」는 눈먼 것과 같다.
 */
const NOT_SCANNED: Record<string, string> = {
  problem_code: "코드다 — `$…$` 가 없다",
  external_id: "적재 열쇠다 — 지면에 안 나간다",
  family_key: "유형 정체다 — 지면에 안 나간다",
  question_group_key:
    "같은 문항의 형식을 연결하는 정체 키다 — 지면 본문·정답·해설에 출력하지 않는다",
  figure_svg: "SVG 다. LaTeX 가 아니라 그림 마크업이라 축이 다르다",
  figure_source: "출처 딱지다",
  review_note: "사람이 쓴 검수 메모다 — 지면에 안 나간다",
  source_file: "원본 파일 경로다",
  exam_id: "원본 시험지 열쇠다",
  problem_type: "계산/개념/활용 — 열거값이다",
  question_type: "단답형/객관식/서술형 — 열거값이다",
  actual_format: "실제 형식 캐시(열거값 · unknown) — 지면에 안 나간다",
  actual_format_version:
    "형식 분류기 · 파서 소스의 버전 문자열이다 — 지면에 안 나간다",
  school: "학교 이름이다 — 지면 머리글이지 수식이 아니다",
  subject: "과목 이름이다",
};

/** 양성 대조 — 검출기가 **«예»를 낼 수 있는가**. 못 내면 이 회차의 0은 뜻이 없다. */
function assertDetectorAlive(): void {
  const probes: [string, string][] = [
    ["날 글자 명령", "$angle C=90^circ$"],
    // 보통 문자열의 "\times" 는 TAB+"imes" 다 — 결함 그 자체를 적었다.
    ["제어문자", "$2\times3$"],
  ];
  const dead = probes.filter(
    ([, text]) => deadBackslashHits(text).length === 0,
  );
  if (dead.length > 0)
    throw new Error(
      `검출기가 «예»를 못 낸다 (${dead.map((d) => d[0]).join(", ")}) — ` +
        "이 상태의 «0건»은 «깨끗»이 아니라 «못 셈»이다. 판정을 거부한다.",
    );
  // 음성 대조도 같이 본다 — 늘 «예»를 내는 검출기도 도장이다.
  if (deadBackslashHits("$2\\times3=6$").length !== 0)
    throw new Error(
      "검출기가 정상 수식도 «예»라 한다 — 늘 우는 가드는 꺼진다. 판정을 거부한다.",
    );
}

/**
 * **컬럼 목록이 샜는지 DB 에 물어본다.** `problem` 의 텍스트 컬럼을 전부 훑어
 * 보는 것·안 보는 것으로 나누고, 어느 쪽에도 없는 컬럼이 있으면 멈춘다.
 */
async function assertTextColumns(): Promise<void> {
  const cols = (await prisma.$queryRawUnsafe(
    `SELECT column_name AS "column", data_type AS "type"
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'problem'
        AND data_type IN ('text','character varying')
      ORDER BY column_name`,
  )) as Array<{ column: string; type: string }>;

  const known = new Set<string>([...TEXT_COLUMNS, ...Object.keys(NOT_SCANNED)]);
  const unknown = cols.map((c) => c.column).filter((c) => !known.has(c));
  if (unknown.length > 0)
    throw new Error(
      `problem 에 낯선 텍스트 컬럼이 있다: ${unknown.join(", ")}\n` +
        "  보려면 TEXT_COLUMNS 에, 안 보려면 NOT_SCANNED 에 **왜인지와 함께** 적어라.\n" +
        "  적지 않으면 그 컬럼의 날 글자는 이 검사에서 구조적으로 0이 된다.",
    );

  const missing = TEXT_COLUMNS.filter((c) => !cols.some((x) => x.column === c));
  if (missing.length > 0)
    throw new Error(`보기로 한 컬럼이 DB 에 없다: ${missing.join(", ")}`);
}

interface Hit {
  code: string;
  column: string;
  names: string[];
  sample: string;
}

async function main(): Promise<void> {
  assertDetectorAlive();
  await assertTextColumns();

  const rows = await prisma.problem.findMany({
    select: {
      problemCode: true,
      familyKey: true,
      reviewStatus: true,
      directUseAllowed: true,
      content: true,
      answer: true,
      solution: true,
    },
  });

  const hits: Hit[] = [];
  const usable = new Set<string>();
  for (const r of rows) {
    const code = r.problemCode ?? "(코드없음)";
    const cols: [string, string | null][] = [
      ["content", r.content],
      ["answer", r.answer],
      ["solution", r.solution],
    ];
    for (const [column, val] of cols) {
      if (!val) continue;
      const names = [...new Set(deadBackslashHits(val))];
      if (names.length === 0) continue;
      hits.push({
        code,
        column,
        names,
        sample: (val.match(/\$[^$]*\$/g) ?? [val]).slice(0, 1)[0]!.slice(0, 70),
      });
      if (r.reviewStatus === "approved" && r.directUseAllowed) usable.add(code);
    }
  }

  const byCode = new Set(hits.map((h) => h.code));
  console.log(
    `적재본 ${rows.length}행 · 컬럼 ${TEXT_COLUMNS.join("·")} 를 봤다`,
  );
  if (byCode.size === 0) {
    console.log("✅ 죽은 역슬래시가 없다.");
    await prisma.$disconnect();
    return;
  }

  console.log(
    `🔴 죽은 역슬래시: 문항 ${byCode.size}개 · 자리 ${hits.length}개` +
      ` (그중 **출제 가능** ${usable.size}개)`,
  );
  const show = process.argv.includes("--list") ? hits : hits.slice(0, 20);
  for (const h of show) {
    console.log(
      `  ❌ ${h.code} [${h.column}] ${h.names.join(", ")}\n       ${h.sample}`,
    );
  }
  if (!process.argv.includes("--list") && hits.length > show.length)
    console.log(`  … ${hits.length - show.length}자리 더 (--list 로 전량)`);

  console.log(
    "\n뿌리: TS 템플릿 리터럴에서 `\\angle` 은 역슬래시가 **먹힌다**." +
      " `String.raw` 를 쓰거나 `\\\\angle` 로 적어라.\n" +
      `제어문자로 바뀌는 것들: ${controlCharOrigins()}\n` +
      "고치는 법: 엔진 소스를 고친 **뒤**, 그 유형을 다시 적재해야 한다" +
      " (엔진만 고치면 적재본은 그대로다 — 그게 이 검사가 태어난 까닭이다).",
  );
  await prisma.$disconnect();
  process.exit(1);
}

void main();
