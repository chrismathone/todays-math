/**
 * 출처 판정·팔레트의 **지문** — 변이 하네스의 ⑶ 단계(「동작이 바뀌었나」)가 쓴다.
 *
 *     npx tsx scripts/qa/provenance-fingerprint.ts
 *
 * ## 왜 필요한가
 *
 * 「파일이 바뀌었다」와 「동작이 바뀌었다」는 다른 말이다. 이 저장소는 그 한 겹을
 * 빠뜨려 **멀쩡한 가드를 의심하고 고치러 갈 뻔했다**(CLAUDE.md 2026-08-21):
 * 치환은 먹었는데 뜻이 그대로라 시험이 초록이고, 하네스는 그것을 「가드가 아니다」로
 * 찍는다. 그래서 변이를 넣은 뒤 이 지문을 다시 찍어 **달라졌는지 먼저 확인**하고,
 * 안 달라졌으면 판정을 **거부**한다.
 *
 * ## 무엇을 찍나
 *
 *  ⑴ 판정 — 모든 갈래를 내는 말뭉치에 판정기를 돌린 결과(갈래·라벨 글자·색 클래스)
 *  ⑵ 팔레트 — `globals.css` 가 갈래마다 실제로 내주는 hex 와 `@theme` 연결 여부
 *
 * ⚠️ **컴포넌트 배선(`ProblemCard`·`ReviewProblemCard`)은 여기 없다.** 그쪽은 CSS 모듈을
 *    물고 있어 이 스크립트에서 못 그린다. 그래서 변이 하네스는 그 두 파일에 대해서만
 *    ⑶ 을 «구조»로 표시하고 넘어간다 — 숨기지 않으려고 여기에 적어 둔다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  classifyFigure,
  classifyOrigin,
  provenanceBadges,
  provenanceColorToken,
  FIGURE_ORIGINS,
  PROBLEM_ORIGINS,
  type ProvenanceInput,
} from "../../src/lib/problem/provenance";

const BLANK: ProvenanceInput = {
  source: "manual",
  familyKey: null,
  originProblemId: null,
  figureUrls: [],
  figureSvg: null,
};

/**
 * 말뭉치 — **모든 갈래를 적어도 한 번씩 낸다.** 여기에 없는 자리는 변이를 넣어도
 * 지문이 안 바뀌고, 그러면 하네스가 판정을 거부한다(그게 옳다 — 시험이 그 자리를
 * 구조적으로 못 보고 있다는 뜻이니 말뭉치부터 넓혀야 한다).
 */
const CORPUS: ReadonlyArray<readonly [string, ProvenanceInput]> = [
  ["기출", { ...BLANK, source: "past_exam" }],
  [
    "기출+스캔",
    { ...BLANK, source: "past_exam", figureUrls: ["/figures/a/q1.jpg"] },
  ],
  [
    "기출+SVG",
    { ...BLANK, source: "past_exam", figureUrls: ["/figures-svg/a/q1.svg"] },
  ],
  ["문제집", { ...BLANK, source: "transformed" }],
  [
    "AI변형",
    {
      ...BLANK,
      source: "transformed",
      originProblemId: "00000000-0000-4000-8000-00000000a001",
    },
  ],
  ["AI생성", { ...BLANK, source: "ai_generated" }],
  [
    "초등",
    { ...BLANK, familyKey: "elem:초6|2-5-1 원주와 원주율 알아보기|연산" },
  ],
  [
    "초등+도형",
    {
      ...BLANK,
      familyKey: "elem:초5|2-2-4 분수의 곱셈|응용",
      figureSvg: "<svg/>",
    },
  ],
  ["중등", { ...BLANK, familyKey: "mid:3-1|근호를 포함한 식의 계산|06" }],
  [
    "중등+도형",
    { ...BLANK, familyKey: "mid:2-2|피타고라스 정리|09", figureSvg: "<svg/>" },
  ],
  ["옛수동(미분류)", { ...BLANK, familyKey: null }],
  [
    "손등록(solo)",
    { ...BLANK, familyKey: "solo:11111111-2222-4333-8444-555555555555" },
  ],
  ["그림빈문자열", { ...BLANK, figureSvg: "" }],
  ["아는뿌리밖", { ...BLANK, figureUrls: ["/figures-300/a.png"] }],
  ["빈배열", { ...BLANK, figureUrls: [] }],
];

const CSS = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);
const ROOT_BLOCK = /:root\s*\{([\s\S]*?)\n\}/.exec(CSS)?.[1] ?? "";
const THEME_BLOCK = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(CSS)?.[1] ?? "";
const declared = (block: string, name: string) =>
  new RegExp(`(?:^|\\n)\\s*${name}:\\s*([^;]+);`).exec(block)?.[1]?.trim() ??
  "(없음)";

const lines: string[] = ["## 판정"];
for (const [name, input] of CORPUS) {
  const badges = provenanceBadges(input)
    .map((b) => `${b.kind}:${b.text}:${b.className}`)
    .join(" ");
  lines.push(
    `${name} | origin=${classifyOrigin(input)} | figure=${classifyFigure(input) ?? "없음"} | ${badges}`,
  );
}

lines.push("", "## 팔레트");
for (const kind of [...PROBLEM_ORIGINS, ...FIGURE_ORIGINS]) {
  const themeName = provenanceColorToken(kind);
  const rootName = themeName.replace("--color-", "--");
  lines.push(
    `${kind} | ${rootName}=${declared(ROOT_BLOCK, rootName)} | ${themeName}=${declared(THEME_BLOCK, themeName)}`,
  );
}

process.stdout.write(lines.join("\n") + "\n");
