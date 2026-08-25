/**
 * **출처 라벨의 색이 실제로 지면에 나오는가** — 빌드된 CSS 를 보고 판정한다.
 *
 *     node scripts/qa/check-provenance-css.mjs
 *
 * ## 왜 시험이 아니라 스크립트인가
 *
 * Tailwind 를 한 번 컴파일하는 데 **8초**가 든다(저장소 전체를 훑는다). 단위 시험에 넣으면
 * 다른 세션이 CPU 를 쓸 때 상한을 넘겨 **간헐 빨강**이 되고, 늘 우는 가드는 꺼진다
 * (CLAUDE.md 2026-08-20). 팔레트를 손볼 때 사람이 돌린다.
 *
 * ## 무엇을 보나 — 「토큰이 있다」와 「클래스가 나온다」는 다른 말이다
 *
 * `provenancePalette.test.ts` 는 `globals.css` 의 `:root` 와 `@theme inline` 에 값이
 * 적혀 있는지 본다. 그것만으로는 **한 겹 모자라다** — Tailwind 가 그 토큰으로 실제
 * `text-src-*` 유틸리티를 내주지 않으면 화면은 아무 색도 안 내면서 **에러도 안 낸다**
 * (05 §2.2.1 이 적어 둔 그 함정, 실제로 계기판이 당했다).
 *
 * 그래서 여기서는 **제품과 같은 postcss 플러그인**으로 컴파일해서
 *   ⑴ 열 갈래의 클래스 셀렉터가 산출 CSS 에 있는가
 *   ⑵ 그 hex 값이 실제로 실렸는가 (클래스만 나오고 값이 비면 화면은 그대로다)
 *   ⑶ `print:hidden`(지면을 안 바꾼다는 약속)이 살아 있는가
 * 를 본다.
 *
 * ⚠️ 셀렉터의 `:` 는 CSS 에서 역슬래시로 이스케이프된다(`.print\:hidden`). 그 역슬래시를
 *    빠뜨리면 **없는데 있다고, 있는데 없다고** 나온다 — 처음에 그렇게 틀렸다.
 */
import { readFileSync } from "node:fs";

import tailwind from "@tailwindcss/postcss";
import postcss from "postcss";

const ENTRY = "src/app/globals.css";

/** 갈래 열의 글자색 클래스 — `provenance.ts` 의 `className` 과 같은 목록이다. */
const CLASSES = [
  "text-src-past-exam",
  "text-src-workbook",
  "text-src-elem",
  "text-src-middle",
  "text-src-ai",
  "text-src-mcq",
  "text-src-written",
  "text-src-figure",
  "text-src-svg",
  "text-src-scan",
  "text-src-unknown",
  "no-underline",
  "print:hidden",
];

/** 값이 실렸는지 보는 표본 — 축마다 하나씩(전부 같은 경로로 만들어진다). */
const HEXES = ["#7f5eca", "#1e6200", "#90325d", "#5f5521", "#687a00"];

const cssSelector = (cls) => "." + cls.split(":").join("\\:");

const source = readFileSync(ENTRY, "utf8");
const built = (await postcss([tailwind()]).process(source, { from: ENTRY })).css;
const lower = built.toLowerCase();

let bad = 0;
for (const cls of CLASSES) {
  const ok = built.includes(cssSelector(cls));
  if (!ok) bad += 1;
  console.log(`${ok ? "🟢" : "🔴"} 클래스 ${cls}`);
}
for (const hex of HEXES) {
  const ok = lower.includes(hex);
  if (!ok) bad += 1;
  console.log(`${ok ? "🟢" : "🔴"} 값 ${hex}`);
}

if (bad === 0) {
  console.log("\n🟢 열 갈래의 색이 빌드된 CSS 에 실제로 나온다.");
} else {
  console.log(`\n🔴 ${bad}건이 산출 CSS 에 없다 — 화면은 색 없이 나가면서 에러도 안 낸다.`);
  process.exitCode = 1;
}
