/** 순방향으로 닿는다고 찍힌 문항의 «증인»을 찾아 눈으로 본다. */
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../src/lib/elementary/generate";
import { pageNumbers, readRat } from "../scripts/qa/probe-elem-tier-backsolve";

type Rat = { n: number; d: number };
const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);
const rat = (n: number, d = 1): Rat => {
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
};
const mul = (a: Rat, b: Rat) => rat(a.n * b.n, a.d * b.d);
const add = (a: Rat, b: Rat) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Rat, b: Rat) => rat(a.n * b.d - b.n * a.d, a.d * b.d);
const same = (a: Rat, b: Rat) => a.n === b.n && a.d === b.d;
const show = (r: Rat) => (r.d === 1 ? `${r.n}` : `${r.n}/${r.d}`);

function witness(nums: Rat[], ans: Rat): string | null {
  for (const [i, v] of nums.entries()) if (same(v, ans)) return `그대로 #${i}`;
  const seeds: { v: Rat; how: string }[] = nums.map((v, i) => ({
    v,
    how: `#${i}=${show(v)}`,
  }));
  for (let i = 0; i < nums.length; i += 1)
    for (let j = i + 1; j < nums.length; j += 1) {
      seeds.push({
        v: mul(nums[i]!, nums[j]!),
        how: `${show(nums[i]!)}×${show(nums[j]!)}`,
      });
      for (let k = j + 1; k < nums.length; k += 1)
        seeds.push({
          v: mul(mul(nums[i]!, nums[j]!), nums[k]!),
          how: `${show(nums[i]!)}×${show(nums[j]!)}×${show(nums[k]!)}`,
        });
    }
  for (const s of seeds) if (same(s.v, ans)) return s.how;
  let layer = seeds;
  for (let step = 0; step < 2; step += 1) {
    const next: { v: Rat; how: string }[] = [];
    for (const b of layer)
      for (const v of nums) {
        const p = { v: add(b.v, v), how: `${b.how}+${show(v)}` };
        const m = { v: sub(b.v, v), how: `${b.how}-${show(v)}` };
        if (same(p.v, ans)) return p.how;
        if (same(m.v, ans)) return m.how;
        next.push(p, m);
      }
    layer = next;
    if (layer.length > 20000) break;
  }
  return null;
}

const SEEDS = [20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242];
let shown = 0;
for (const code of ["2-4-1", "2-4-2", "2-4-5", "2-4-7"]) {
  const unit = elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith(code),
  )!;
  for (const tier of ["심화중", "심화상"] as const) {
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unit, seed, tier as never);
      const ans = readRat(p.answer.replace(/\$/g, "").trim());
      if (!ans) continue;
      const w = witness(pageNumbers(p.content), ans);
      if (!w) continue;
      if (shown >= 8) break;
      shown += 1;
      console.log(`${code} ${tier} @${seed}  답 ${p.answer}  ← ${w}`);
      console.log(`   ${p.content}`);
    }
  }
}
