/**
 * 고등 배선(적재기 · 열쇠 · 미적재 검사 · 제자리 갱신 · 출처 판정)과 적재 전 관문이 **지금 무엇을 내놓는가**의
 * 지문 한 줄 — 변이 하네스(`mutate-high-wiring.mjs`)가 쓴다.
 *
 * 변이 판정은 ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나(20번 문서 2026-08-21).
 * ⑵ 를 건너뛰면 «뜻이 안 바뀐 변이»를 두고 «가드가 아니다»로 오판한다. 던지는 것도 «달라진 산출물»이라
 * 사유를 지문에 적는다.
 *
 * 말뭉치는 **가르는 자리**가 있어야 한다(같은 문서 2026-10-08 판정형 [5]) — 그래서 멀쩡한 행만이 아니라 축마다
 * 걸리는 행 · 비슷한 키 · 못 읽는 보기 · 관문이 처음 찾은 생성기 판(씨앗 1 ~ 300)을 같이 넣었다.
 *
 *   npx tsx scripts/qa/high-wiring-digest.ts            # 지문 한 줄
 *   npx tsx scripts/qa/high-wiring-digest.ts --parts    # 갈래마다 지문(어느 갈래가 바뀌었나)
 *   npx tsx scripts/qa/high-wiring-digest.ts --dump     # 지문에 든 줄 그대로(앞 400자)
 */
import { createHash } from "node:crypto";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  ambiguousUnitKeys,
  buildTargetRows,
  highPreloadVerdict,
  isOwnExternalId,
  type Target,
} from "../import/load-engine-problems";
import {
  fixtureHighEntries,
  FIXTURE_BOOK,
  FIXTURE_MINOR,
  FIXTURE_SECTION_A,
  FIXTURE_SECTION_B,
} from "../../src/__tests__/helpers/highFixture";
import {
  createHighRegistry,
  generateHighProblem,
} from "../../src/lib/high/generate";
import {
  highExternalId,
  highFamilyKey,
  highVariantKey,
  parseHighExternalId,
} from "../../src/lib/high/loadKey";
import { surd, surdPmTex } from "../../src/lib/high/numbers";
import { classifyOrigin } from "../../src/lib/problem/provenance";

import {
  highKeyProbe,
  loadedFragments,
  unloadedAll,
} from "./checkUnloadedTypes";
import { sameChoice } from "./highChoiceValue";
import { highLoadGate, type GateRow } from "./highLoadGate";
import { rebuild } from "./refresh-engine-content";

const SEP = " :: ";
const sections = new Map<string, string[]>();
function record(section: string, label: string, fn: () => unknown): void {
  const list = sections.get(section) ?? [];
  sections.set(section, list);
  try {
    list.push(`${label}${SEP}${JSON.stringify(fn())}`);
  } catch (err) {
    list.push(`${label}${SEP}THROW${SEP}${(err as Error).message}`);
  }
}

const quiet = console.log;
console.log = () => {};

// ── 열쇠 ──────────────────────────────────────────────────────────────
const KEY = `${FIXTURE_BOOK}|${FIXTURE_MINOR}|03`;
record("열쇠", "문항류", () => highFamilyKey(KEY));
record("열쇠", "변형", () =>
  highVariantKey({ typeKey: KEY, seed: 7, variant: 2 }),
);
for (const typeKey of [
  KEY,
  `${KEY}A`,
  `${KEY}|s1|v0`,
  `${FIXTURE_BOOK}|${FIXTURE_MINOR}`,
  ` ${KEY}`,
  `${FIXTURE_BOOK}|${FIXTURE_MINOR}|3`,
])
  record("열쇠", `짓기 ${typeKey}`, () =>
    highExternalId({ typeKey, seed: 1, variant: 0, questionType: "단답형" }),
  );
for (const id of [
  `engine-high:${KEY}|s1|v0|단답형`,
  `engine-high:${KEY}A|s1|v0|객관식`,
  `engine-high:${KEY}|s1|v0|단답형|덤`,
  `engine-high:${KEY}|s1|v0`,
  `engine-high:${KEY}|s1|v0|모르는형식`,
  `engine-mid:${KEY}|s1|v0|단답형`,
  `engine-high:${KEY}|s1|v0|단답형|s2|v1|객관식`,
  `engine-high:한토막|s1|v0|단답형`,
])
  record("열쇠", `읽기 ${id}`, () => parseHighExternalId(id));

// ── 적재기 ────────────────────────────────────────────────────────────
const fixture = createHighRegistry(fixtureHighEntries(), []);
const targets: Record<string, unknown> = {
  "차시 A 전부": {
    engine: "high",
    grade: FIXTURE_BOOK,
    unitSection: FIXTURE_SECTION_A,
    variants: 3,
  },
  "차시 B": {
    engine: "high",
    grade: FIXTURE_BOOK,
    unitSection: FIXTURE_SECTION_B,
    variants: 2,
  },
  "키 하나": {
    engine: "high",
    grade: FIXTURE_BOOK,
    unitSection: FIXTURE_SECTION_A,
    keys: [`${KEY}A`],
    variants: 2,
  },
  "다른 차시의 키": {
    engine: "high",
    grade: FIXTURE_BOOK,
    unitSection: FIXTURE_SECTION_B,
    keys: [KEY],
  },
  "모르는 engine": { engine: "zzz", grade: "중1", unitSection: "소인수분해" },
  "engine 없음": { grade: "중1", unitSection: "소인수분해" },
};
for (const [label, t] of Object.entries(targets))
  record("적재기", label, () =>
    buildTargetRows(t as Target, 20261008, { highs: fixture }),
  );
record("적재기", "살아 있는 등록부", () =>
  buildTargetRows(
    {
      engine: "high",
      grade: "공통수학1",
      unitSection: "행렬의 곱셈",
      variants: 2,
    } as Target,
    20261008,
  ).map((r) => [r.externalId, r.content, r.answer, r.difficulty]),
);
for (const id of [
  "engine-elem:a",
  "engine-mid:a",
  "engine-mid-combo:a",
  "engine-mid-judge:a",
  "engine-high:a",
  "engine-highx:a",
  "rpm:a",
])
  record("적재기", `우리 행 ${id}`, () => isOwnExternalId(id));
record("적재기", "단원 둘에 걸림", () =>
  ambiguousUnitKeys(
    [
      { grade: "공통수학1", section: "가" },
      { grade: "공통수학1", section: "나" },
    ],
    [
      { grade: "공통수학1", section: "가" },
      { grade: "공통수학1", section: "가" },
      { grade: "공통수학1", section: "나" },
      { grade: "공통수학2", section: "나" },
    ],
  ),
);

// ── 제자리 갱신 ───────────────────────────────────────────────────────
record("제자리 갱신", "픽스처 등록부로 되만듦", () => {
  // `rebuild` 는 계획을 파일로 읽는다 — 임시 폴더에 한 장 적어 넘긴다(끝나면 지운다).
  const dir = mkdtempSync(path.join(tmpdir(), "high-wiring-digest-"));
  const file = path.join(dir, "plan.json");
  writeFileSync(
    file,
    JSON.stringify({
      label: "지문",
      seedBase: 20261008,
      targets: [targets["차시 A 전부"], targets["모르는 engine"]],
    }),
  );
  try {
    const got = rebuild([file], { highs: fixture });
    return {
      made: [...got.made.entries()].map(([id, r]) => [id, r.content, r.answer]),
      failures: got.failures,
      conflicts: got.conflicts,
    };
  } finally {
    // 지우기는 파일 · 빈 폴더를 하나씩 — 재귀 지우기는 한글 경로에서 노드가 죽는다(`noRmSync.test.ts`).
    unlinkSync(file);
    rmdirSync(dir);
  }
});

// ── 미적재 검사 · 출처 판정 ───────────────────────────────────────────
const highs = fixtureHighEntries().map((e) => ({
  key: e.key,
  grade: e.grade,
  unitSection: e.unitSection,
}));
const registries = { types: [], combos: [], judges: [], highs };
for (const [label, ids] of Object.entries({
  빈: [],
  "확장 번호만": [`engine-high:${KEY}A|s1|v0|단답형`],
  "본 번호만": [`engine-high:${KEY}|s1|v0|객관식`],
  "중등 접두사": [`engine-mid:${KEY}|s1|v0|단답형`],
  "꼬리 없음": [`engine-high:${KEY}`],
}))
  record("미적재", label, () => unloadedAll(loadedFragments(ids), registries));
record("미적재", "자기 점검", () => highKeyProbe());
for (const familyKey of [highFamilyKey(KEY), "mid:x", "elem:x", "highx", null])
  record("출처", String(familyKey), () =>
    classifyOrigin({
      source: "generated",
      familyKey,
      originProblemId: null,
      figureUrls: [],
      figureSvg: null,
      content: "값을 구하시오.",
      answer: "$1$",
      questionType: "단답형",
    } as never),
  );

// ── 관문 ──────────────────────────────────────────────────────────────
function pair(
  over: Partial<GateRow> & { choices?: string[]; mark?: string; key?: string },
): GateRow[] {
  const key = over.key ?? `${FIXTURE_BOOK}|${FIXTURE_MINOR}|03`;
  const stem =
    over.content ?? "두 다항식 $A=2x+3$, $B=5x-12$에 대하여 $A+B$를 구하시오.";
  const choices = over.choices ?? [
    "$7x+15$",
    "$7x-9$",
    "$-3x-9$",
    "$7x+9$",
    "$17x-9$",
  ];
  const base = {
    variantKey: `high:${key}|s1|v0`,
    familyKey: `high:${key}`,
    grade: over.grade ?? FIXTURE_BOOK,
    section: over.section ?? FIXTURE_SECTION_A,
    solution:
      over.solution ??
      "동류항끼리 모으면 $A+B=(2+5)x+(3-12)$이다.\n따라서 $A+B$는 $7x-9$이다.",
    difficulty: over.difficulty ?? "기본",
  };
  return [
    {
      ...base,
      externalId: `engine-high:${key}|s1|v0|단답형`,
      content: stem,
      answer: over.answer ?? "$7x-9$",
      questionType: "단답형",
    },
    {
      ...base,
      externalId: `engine-high:${key}|s1|v0|객관식`,
      content: `${stem}\n${choices.map((c, i) => `${"①②③④⑤"[i]} ${c}`).join("\n")}`,
      answer: over.mark ?? "②",
      questionType: "객관식",
    },
  ];
}
const GATE_CASES: Record<string, GateRow[]> = {
  멀쩡: pair({}),
  "없는 명령": pair({
    solution: String.raw`$x=\pmi$` + "\n따라서 $7x-9$이다.",
  }),
  "달러 짝": pair({ solution: "값은 $3이다.\n따라서 $7x-9$이다." }),
  "빈 수식": pair({ solution: "값은 $$이다.\n따라서 $7x-9$이다." }),
  "죽은 역슬래시": pair({
    content: "$angle C=90^circ$인 삼각형에서 $A+B$를 구하시오.",
  }),
  "인수의 차례": pair({
    answer: "$(x-y+3)(x+y-2)$",
    choices: [
      "$(x-y-3)(x+y+2)$",
      "$(x-y+3)(x+y-2)$",
      "$(x-y-2)(x+y+3)$",
      "$(x+y-3)(x-y+2)$",
      "$(x+y+3)(x-y-2)$",
    ],
  }),
  "보기 넷": pair({ choices: ["$7x+15$", "$7x-9$", "$-3x-9$", "$7x+9$"] }),
  "정답 둘": pair({ mark: "②, ③" }),
  "정답 번호 어긋남": pair({ mark: "③" }),
  "못 읽는 보기": pair({
    choices: ["$7x+15$", "$7x-9$", "서로 다른 두 실근", "$7x+9$", "$17x-9$"],
  }),
  "식이 발문에": pair({
    content: "$A+B=7x-9$일 때 $A+B$를 구하시오.",
  }),
  "단위 붙은 수량": pair({
    content: "A가 $80$바퀴 도는 동안 B가 도는 횟수를 구하시오.",
    answer: "$80$바퀴",
    choices: ["$40$바퀴", "$80$바퀴", "$120$바퀴", "$160$바퀴", "$20$바퀴"],
  }),
  "맨 수 겹침": pair({
    content:
      "$f(x)$를 $x-2$로 나누었을 때의 나머지가 $-1$일 때, $R(2)$의 값을 구하시오.",
    answer: "$-1$",
    solution: "따라서 $R(2)=-1$\n답은 $-1$이다.",
    choices: ["$1$", "$-1$", "$2$", "$-2$", "$0$"],
  }),
  "없는 차시": pair({ section: "다항식의 덧셈과뺄셈" }),
  "모르는 칸": pair({ difficulty: "최상" }),
};
for (const [label, rows] of Object.entries(GATE_CASES)) {
  record("관문", label, () => highLoadGate(rows));
  record("관문", `${label} — 적재기 판결`, () =>
    highPreloadVerdict(
      rows.map((r) => ({
        ...r,
        unitKey: `${r.grade} / ${r.section}`,
        difficulty: r.difficulty as never,
        problemType: "계산",
        figureSpec: null,
        origin: "지문",
      })),
    ),
  );
}
record("관문", "단원 둘", () =>
  highLoadGate(pair({}), {
    units: [
      { grade: FIXTURE_BOOK, section: FIXTURE_SECTION_A },
      { grade: FIXTURE_BOOK, section: FIXTURE_SECTION_A },
    ],
  }),
);
record("관문", "중등 접두사 행의 판결", () =>
  highPreloadVerdict(
    pair({}).map((r) => ({
      ...r,
      externalId: r.externalId.replace("engine-high:", "engine-mid:"),
      unitKey: "",
      difficulty: r.difficulty as never,
      problemType: "계산",
      figureSpec: null,
      origin: "지문",
    })),
  ),
);

// ── 값 읽개 ───────────────────────────────────────────────────────────
const VALUE_PAIRS: [string, string][] = [
  [String.raw`$\dfrac{2}{4}$`, String.raw`$\dfrac{1}{2}$`],
  ["$(x+1)(x-2)$", "$(x-2)(x+1)$"],
  ["$-(a-b)$", "$b-a$"],
  [String.raw`$2\sqrt{3}$`, String.raw`$\sqrt{12}$`],
  ["$3+2i$", "$3-2i$"],
  ["$i^{2}$", "$-1$"],
  [String.raw`$1\pm\sqrt{2}$`, String.raw`$1+\sqrt{2}$`],
  [String.raw`$1\pm\sqrt{2}i$`, String.raw`$1\mp\sqrt{2}i$`],
  ["$x<3$", "$3>x$"],
  ["$x<3$", "$x>3$"],
  ["$x<3$", String.raw`$x\le 3$`],
  ["$2x<6$", "$x<3$"],
  ["$2x-6=0$", "$x=3$"],
  ["$x=3$", "$x<3$"],
  [String.raw`$-2\le x<3$`, String.raw`$3>x\ge -2$`],
  [String.raw`$-2\le x<3$`, String.raw`$-2<x\le 3$`],
  [
    String.raw`$\begin{pmatrix}1\\2\end{pmatrix}$`,
    String.raw`$\begin{pmatrix}1&2\end{pmatrix}$`,
  ],
  [
    String.raw`$\begin{pmatrix}1&2\\3&4\end{pmatrix}$`,
    String.raw`$\begin{pmatrix}1&3\\2&4\end{pmatrix}$`,
  ],
  // 열 수는 같고 행 수만 다른 쌍 — 칸 수가 같은 위의 쌍만으로는 «행 수 대조»를 빼도 답이 같다(변이 [33])
  [
    String.raw`$\begin{pmatrix}1&2\end{pmatrix}$`,
    String.raw`$\begin{pmatrix}1&2\\3&4\end{pmatrix}$`,
  ],
  ["$(n-r)!$", "$(n-r)(n-r-1)!$"],
  ["$|x-1|$", "$|1-x|$"],
  ["$x-3$", "$x=3$"],
  ["서로 다른 두 실근", "$3$"],
  [String.raw`$\sin x$`, "$x$"],
  ["$(x+1$", "$x+1$"],
];
for (const [a, b] of VALUE_PAIRS)
  record("값 읽개", `${a} · ${b}`, () => [sameChoice(a, b), sameChoice(b, a)]);

// ── 생성기 — 관문이 처음 찾은 판 ──────────────────────────────────────
for (const key of [
  "공통수학1|인수분해|04",
  "공통수학1|항등식과 나머지정리|07",
  "공통수학1|항등식과 나머지정리|08",
  "공통수학1|이차방정식과 이차함수|08",
])
  record("생성기", key, () => {
    const h = createHash("sha256");
    for (let seed = 1; seed <= 300; seed += 1) {
      const p = generateHighProblem(key, seed, 0);
      h.update(
        [p.content, p.answer, p.solution, ...(p.distractors ?? [])].join(SEP),
      );
    }
    return h.digest("hex");
  });
record("생성기", "± 꼴", () => {
  const out: string[] = [];
  for (let a = -2; a <= 2; a += 1)
    for (let b = 1; b <= 3; b += 1)
      for (const r of [-4, -3, -1, 2, 3])
        for (let d = 1; d <= 3; d += 1) {
          const s = surd(a, b, r, d);
          if (s.b !== 0) out.push(surdPmTex(s));
        }
  return out;
});

console.log = quiet;

const hashOf = (lines: string[]) =>
  createHash("sha256").update(lines.join("\n")).digest("hex");
if (process.argv.includes("--dump"))
  for (const [name, lines] of sections)
    for (const line of lines) console.log(`[${name}] ${line.slice(0, 400)}`);
if (process.argv.includes("--parts"))
  for (const [name, lines] of sections)
    console.log(
      `${name.padEnd(8)} ${lines.length}줄 ${hashOf(lines).slice(0, 16)}`,
    );
console.log(hashOf([...sections.values()].flat()));
