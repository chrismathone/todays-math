/**
 * 「역슬래시가 한 겹인 LaTeX」가 **실제로 지면에 날 글자로 나가는가** — 실물로 찍는다.
 *
 * 소스를 읽고 추론하지 않는다. 등록 유형을 **다 돌려** 생성물에서
 * 「역슬래시 없이 홀로 선 LaTeX 명령」을 센다. 있으면 그 문항은 지면에
 * `angle`·`circ`·`dfrac` 같은 날 글자를 싣는다.
 *
 * ⚠️ 열쇠를 손 목록으로 적지 않는다 — 목록에 없는 명령은 구조적으로 0이 된다.
 *    수식 `$…$` 안에서 **역슬래시가 앞에 없는 영문 두 글자 이상 덩어리**를 세고,
 *    그중 실제 LaTeX 명령인 것만 남긴다(교집합이므로 손 목록이 상한이 아니다).
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../src/lib/middle/generate";

const SEED = 20260827;

/** 수식 조각만 뽑는다 — `$…$` 안. */
function mathChunks(text: string): string[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]!);
}

/**
 * 역슬래시 없이 홀로 선 영문 덩어리.
 *
 * ⚠️ `{` 바로 뒤는 뺀다 — `\begin{cases}` 의 `cases`, `\mathrm{cm}` 의 `cm` 은
 *    **명령의 인자**라 역슬래시가 없는 게 옳다. 처음엔 이걸 안 걸러서
 *    연립방정식 17유형이 거짓으로 걸렸다(전체 22 중 17).
 */
function bareRuns(chunk: string): string[] {
  return [...chunk.matchAll(/(?<![\\{])\b([A-Za-z]{2,})/g)].map((m) => m[1]!);
}

// 실제 LaTeX 명령인지 — 이 목록은 «걸러 내는» 쪽이라 빠져도 과대평가가 안 된다.
const COMMANDS = new Set([
  "angle",
  "circ",
  "overline",
  "triangle",
  "dfrac",
  "frac",
  "times",
  "mathrm",
  "sqrt",
  "parallel",
  "degree",
  "cdot",
  "div",
  "sim",
  "cong",
  "perp",
  "pi",
  "left",
  "right",
  "ne",
  "le",
  "ge",
  "pm",
  "dots",
  "begin",
  "end",
  "cases",
  "Rightarrow",
  "square",
  "leq",
  "geq",
  "neq",
  "text",
]);

const rows: { key: string; token: string; where: string; sample: string }[] =
  [];

for (const t of registeredTypes()) {
  let p;
  try {
    p = generateMiddleProblem(t.key, SEED);
  } catch {
    continue;
  }
  for (const [where, text] of [
    ["content", p.content],
    ["answer", p.answer],
    ["solution", p.solution ?? ""],
  ] as const) {
    for (const chunk of mathChunks(text)) {
      for (const run of bareRuns(chunk)) {
        if (!COMMANDS.has(run)) continue;
        rows.push({
          key: t.key,
          token: run,
          where,
          sample: chunk.slice(0, 60),
        });
      }
    }
  }
}

const byKey = new Map<string, number>();
for (const r of rows) byKey.set(r.key, (byKey.get(r.key) ?? 0) + 1);

console.log(`등록 유형 ${registeredTypes().length}개를 씨앗 하나로 돌렸다.`);
console.log(`날 글자가 실린 유형 ${byKey.size}개 · 자리 ${rows.length}개\n`);
for (const [key, n] of [...byKey].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  const first = rows.find((r) => r.key === key)!;
  console.log(`  ${key}  ${n}자리  [${first.where}] ${first.sample}`);
}
