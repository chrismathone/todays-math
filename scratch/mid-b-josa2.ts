/** 제품 규칙(`josaFaults`)으로 다시 잰다 — 규칙을 두 벌로 두지 않는다. (내 파일) */
import { josaFaults } from "../src/lib/elementary/rules";
import { generateMiddleProblem } from "../src/lib/middle/generate";
import { eulReul, euroRo } from "../src/lib/middle/m2Josa";
import { MID_SUP_B } from "../src/lib/middle/midSupB";

/**
 * `josaFaults` 가 **안 재는** 축 하나 더 — 수식이 `\overline{숫자}` 로 끝나는 것.
 * 순환소수 `0.\overline{8}` 은 「영 점 팔」이라 소리의 끝이 그 숫자다.
 * (`josaFaults` 는 끝이 `}` 라 「안 잼」으로 넘어간다 — 그 함수 머리말이
 * 「못 재는 것은 «통과»가 아니라 «안 잼»이다」라고 적어 둔 그 자리다.)
 */
export function overlineJosaFaults(text: string): string[] {
  const bad: string[] = [];
  const re =
    /\$[^$]*\\overline\{(\d+)\}\$ ?(을|를|이|가|과|와|은|는)(?![가-힣])/g;
  let m = re.exec(text);
  while (m !== null) {
    const n = Number(m[1]);
    const want: Record<string, string> = {
      을: "을",
      를: "을",
      이: "이",
      가: "이",
      과: "과",
      와: "과",
      은: "은",
      는: "은",
    };
    const batchim = eulReul(n) === "을";
    const pairFirst = want[m[2]!]!;
    const correct = batchim
      ? pairFirst
      : { 을: "를", 이: "가", 과: "와", 은: "는" }[pairFirst]!;
    if (m[2] !== correct) bad.push(m[0]);
    m = re.exec(text);
  }
  return bad;
}

/** `josaFaults` 가 안 보는 축 — 도구격 「(으)로」. `euroRo` 가 참이다. */
export function euroRoFaults(text: string): string[] {
  const bad: string[] = [];
  const re = /\$([^$]*?)(-?\d+)\$ ?(으로|로)(?![가-힣])/g;
  let m = re.exec(text);
  while (m !== null) {
    if (euroRo(Number(m[2])) !== m[3]) bad.push(m[0]);
    m = re.exec(text);
  }
  return bad;
}

const seen = new Set<string>();
for (const e of MID_SUP_B) {
  for (let v = 0; v < 8; v += 1) {
    const p = generateMiddleProblem(e.key, 20260827, v);
    for (const f of ["content", "answer", "solution"] as const) {
      const t = String(p[f] ?? "");
      for (const b of [
        ...josaFaults(t),
        ...euroRoFaults(t),
        ...overlineJosaFaults(t),
      ])
        seen.add(`${e.key} ${f}: ${b}`);
    }
  }
}
for (const s of seen) console.log("🔴", s);
console.log("합계", seen.size);
