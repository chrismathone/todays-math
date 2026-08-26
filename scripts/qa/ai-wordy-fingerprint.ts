/**
 * `speakWordyOperators` 의 **지문** — `mutate-ai-wordy-operators.sh` 의 ⑶ 이 읽는다.
 *
 *   npx tsx scripts/qa/ai-wordy-fingerprint.ts
 *
 * 파일이 바뀌어도 뜻이 그대로면 「가드가 아니다」가 거짓말이 된다(CLAUDE.md 2026-08-21).
 * 표본은 **갈래를 실제로 가르는 것들**이다 — 바꿔야 하는 것 · 그대로 두어야 하는 것 ·
 * 널. 하나로 몰린 표본은 어떤 변이도 못 가른다.
 */
import {
  speakWordyOperators,
  speakWordyOperatorsOrNull,
} from "../../src/lib/ai/wordyOperators";

const BS = String.fromCharCode(92);
const tex = (s: string) => s.split("§").join(BS);

const SAMPLES: string[] = [
  // 바꿔야 하는 것
  "최대공약수에서 $2$의 지수는 $§min(a,3)=2$이므로 $a=2$",
  "$§lcm(12,18)=36$",
  "$§mathrm{lcm}(8,12)=24$",
  "$§gcd(12,18)=6$ 이고 $§lcm(12,18)=36$ 이다",
  "$§max(3,7)=7$",
  "$§deg P=3$",
  // 그대로 두어야 하는 것 (교과 기호 · 단위 · 아래첨자 · 중괄호)
  "$§sin 30°=§frac{1}{2}$",
  "$§log_{2}8=3$",
  "$§lim_{n§to§infty} a_n=0$",
  "$§sum_{k=1}^{9} a_k=12$",
  "속력이 $60§,§text{km}/§min$ 이다",
  "$§max_{x§ge0} f(x)$",
  "$§max§{1,2§}$",
  "기호가 하나도 없는 평범한 해설이다",
];

const lines: string[] = [];
for (const [i, raw] of SAMPLES.entries()) {
  const r = speakWordyOperators(tex(raw));
  lines.push(
    `${String(i).padStart(2, "0")}\tchanged=${r.changed}\tleftover=${r.leftover}\t` +
      `refused=${r.refused ?? "-"}\t${r.out}`,
  );
}
const nul = speakWordyOperatorsOrNull(null);
lines.push(`null\tchanged=${nul.changed}\tout=${String(nul.out)}`);

process.stdout.write(lines.join("\n") + "\n");
