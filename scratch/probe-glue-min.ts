/**
 * **맞붙은 인라인 수식(`$A$$B$`)을 무엇이 망가뜨리나** — 최소 재현.
 *
 * 🔴 이 결함의 기제를 두 번 틀렸다(2026-09-14): ⑴ 토크나이저가 산문을 디스플레이로
 *    삼킨다 → 원문이 이미 `display 0` 이라 반증, ⑵ 마스크 표식(U+0000/U+0001)이 샌다
 *    → 모든 단계에서 제어문자 0으로 반증. 그러니 또 읽어서 짐작하지 않고 **함수에
 *    실제로 통과시켜** 어느 단계가 `$` 를 끼워 넣는지 눈으로 본다.
 *
 * DB 도 파일도 안 탄다 — 모양만 남긴 합성 입력이라 누구나 같은 결과를 본다.
 *
 * 돌리는 법:  npx tsx scratch/probe-glue-min.ts
 */
import { normalizeMathgenText } from "@/lib/math/normalizeMathgenText";
import { tokenizeMath } from "@/lib/math/segments";

/** 실제 지면에서 본 모양들. 마지막 둘은 대조군(맞붙지 않은 것). */
const CASES: [string, string][] = [
  [
    "맞붙은 둘 + 도 기호",
    String.raw`따라서 $\frac{N}{M}$$\angle CAM=15°$ 이다.`,
  ],
  [
    "맞붙은 둘 (기호 없음)",
    String.raw`따라서 $\frac{N}{M}$$\angle CAM=15$ 이다.`,
  ],
  ["맞붙은 셋", String.raw`$a=1$$b=2$$c=3$ 이다.`],
  ["홀로 남은 $$ + 느슨한 명령", String.raw`값은 $$\angle CAM=15° 이다.`],
  ["대조: 띄어 쓴 둘", String.raw`따라서 $\frac{N}{M}$ $\angle CAM=15°$ 이다.`],
  ["대조: 진짜 디스플레이", String.raw`$$\frac{N}{M}$$ 이다.`],
];

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

function firstDiff(a: string, b: string): string {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  if (i === n && a.length === b.length) return "    차이 없음";
  const show = (s: string) =>
    JSON.stringify(s.slice(Math.max(0, i - 30), i + 40));
  return `    @${i} 부터\n      before ${show(a)}\n      after  ${show(b)}`;
}

function describe(label: string, text: string): void {
  const segments = tokenizeMath(text);
  const display = segments.filter((s) => s.type === "display");
  console.log(
    `  ${label}: ${JSON.stringify(text)}\n` +
      `    $ ${count(text, "$")}개 · $$ ${count(text, "$$")}곳 · ` +
      `inline ${segments.filter((s) => s.type === "inline").length} · ` +
      `display ${display.length}`,
  );
  // 🔴 display 조각이 길면 그건 수식이 아니라 **삼켜진 산문**이다.
  for (const seg of display) {
    if (/[가-힣]/.test(seg.value))
      console.log(`    ⚠️ 한글을 품은 display: ${JSON.stringify(seg.value)}`);
  }
}

for (const [name, raw] of CASES) {
  console.log(`\n=== ${name} ===`);
  describe("raw   ", raw);
  const out = normalizeMathgenText(raw);
  describe("after ", out);
  console.log(`    같은가: ${out === raw}`);
  if (out !== raw) console.log(firstDiff(raw, out));
  // 멱등인가 — 두 번 돌려 또 바뀌면 적재를 두 번 탄 행은 더 망가진다.
  const twice = normalizeMathgenText(out);
  if (twice !== out) {
    console.log(`    🔴 멱등이 아니다 — 한 번 더 돌리면 또 바뀐다`);
    console.log(firstDiff(out, twice));
  }
}
