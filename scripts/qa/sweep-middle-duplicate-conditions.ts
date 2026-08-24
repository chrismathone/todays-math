/**
 * 🔎 훑개 — 지면에 **같은 말을 두 번 쓰는 줄**을 873유형 전량에서 찾는다.
 *
 * > $a=-4$이므로 $a=-4$이다.
 * > $\sqrt{2}=a$ 이므로 $\sqrt{2}=a$ 이다.
 *
 * 값은 맞고 KaTeX 도 초록이라 **기존 시험이 구조적으로 못 잡는다**
 * (2026-08-24 「값이 맞으면 시험이 다 초록이다」와 같은 자리). 학생이 읽으면 한 줄이 통째로
 * 헛돈다.
 *
 * ## 열쇠를 두 번 좁혔다 — 좁히지 않으면 가드가 아니라 소음이다
 *
 * 처음엔 「한 줄 안에 같은 등식이 둘」로 셌다. 21유형이 걸렸는데 절반이 거짓이었다:
 *
 * - `$=$` 처럼 **변이 빈 등식** — 「(교점의 개수)$=$(꼭짓점의 개수)$=12$」의 조각이다.
 * - **떨어져 있는 두 등식** — 「$a=-36$ 또는 $a=12$인데 $a>0$이므로 $a=12$이다」는 옳은 줄이고,
 *   「두 근은 $x=-1$, $x=\dfrac13$이고 큰 근은 $x=\dfrac13$이다」도 옳다. 결론을 다시 말하는 것은
 *   되풀이가 아니다.
 *
 * 그래서 **「같은 등식 둘이 이어 붙어 있고 사이에 이음말밖에 없을 때」**만 센다.
 *
 * ⚠️ 눈금의 양성·음성을 **실제로 나온 줄**에서 가져왔다. 지어낸 픽스처는 경계를 안 가른다
 *    (2026-08-19 「픽스처가 가짜면 가드가 무엇을 지키는지 알 수 없다」).
 *
 * ## ⚠️ 0이 나오는 것이 정상이다 — 그리고 그 0은 「못 셈」이 아니다
 *
 * 결함을 고친 뒤(`src/lib/middle/solutionText.ts` 가 지면에서 되풀이를 지운다) 이 훑개는
 * **구조적으로 0**을 낸다. 「깨끗하다」와 「못 센다」가 안 갈리는 자리다(2026-08-24 교훈).
 * 그래서 열쇠가 살아 있는지는 **제품을 거치지 않고** 확인한다 — 아래 눈금은 손으로 적은
 * 줄이라 고쳐도 안 사라진다. 눈금이 빨개지면 열쇠가 죽은 것이다.
 *
 * 고치기 **전** 실측(2026-08-24, 씨앗 120): 10유형에서 났고 가장 잦은 것이 30.8% 였다.
 *
 *   npx tsx scripts/qa/sweep-middle-duplicate-conditions.ts
 *   npx tsx scripts/qa/sweep-middle-duplicate-conditions.ts --seeds 300
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import { repeatedStatement } from "../../src/lib/middle/solutionText";

/** 눈금 — 전부 실제로 생성된 줄이다. 양성 4 · 음성 4. */
const CALIBRATION: [string, boolean][] = [
  ["$a=-4$이므로 $a=-4$이다.", true],
  ["$\\sqrt{2}=a$ 이므로 $\\sqrt{2}=a$ 이다.", true],
  ["$-4x+by=12$에서 $8+b=12$이므로 $b=4$, 즉 $b=4$이다.", true],
  ["$x=1$, $y=2$를 대입하면 $a=2$이므로 $a=2$이다.", true],
  ["이때 $a=-36$ 또는 $a=12$인데 $a>0$이므로 $a=12$이다.", false],
  // 되풀이가 아니라 **그 값을 쓰는** 문장이다 — 이음말은 같고 뒤에 오는 말이 다르다
  ["한 근이 $x=-2$이므로 $x=-2$을 대입하면 등식이 성립한다.", false],
  [
    "따라서 두 근은 $x=-1$, $x=\\dfrac{1}{3}$이고 큰 근은 $x=\\dfrac{1}{3}$이다.",
    false,
  ],
  [
    "육각뿔대에서 (교점의 개수)$=$(꼭짓점의 개수)$=12$, (교선의 개수)$=$(모서리의 개수)$=18$이다.",
    false,
  ],
  [
    "직육면체 $B$의 세로의 길이는 $4\\times\\dfrac{2}{1}=8\\,(\\mathrm{cm})$, 높이는 $4\\times\\dfrac{2}{1}=8\\,(\\mathrm{cm})$이다.",
    false,
  ],
];

function calibrate(): boolean {
  const wrong = CALIBRATION.filter(
    ([line, want]) => (repeatedStatement(line) !== null) !== want,
  );
  const pos = CALIBRATION.filter(([, w]) => w).length;
  console.log(
    wrong.length === 0
      ? `눈금 — 양성 ${pos}/${pos} 잡음 · 음성 ${CALIBRATION.length - pos}/${CALIBRATION.length - pos} 안 걸림`
      : `🔴 눈금이 안 맞는다 (${wrong.length}건) — 판정을 믿을 수 없다`,
  );
  for (const [line] of wrong) console.log("   어긋남: " + line.slice(0, 120));
  return wrong.length === 0;
}

function main() {
  if (!calibrate()) {
    process.exitCode = 1;
    return;
  }
  const i = process.argv.indexOf("--seeds");
  const seeds = i >= 0 ? Number(process.argv[i + 1]) : 120;
  const types = registeredTypes();

  const rows: { key: string; n: number; line: string }[] = [];
  let generated = 0;
  for (const t of types) {
    let n = 0;
    let line = "";
    for (let seed = 1; seed <= seeds; seed += 1) {
      const p = generateMiddleProblem(t.key, seed);
      generated += 1;
      const hit = p.solution.split("\n").find((l) => repeatedStatement(l));
      if (hit) {
        n += 1;
        if (!line) line = hit;
      }
    }
    if (n) rows.push({ key: t.key, n, line });
  }
  rows.sort((a, b) => b.n - a.n);

  console.log(`\n유형 ${types.length} × 씨앗 ${seeds} = 생성 ${generated}`);
  console.log(`같은 말을 두 번 쓰는 유형 ${rows.length}건\n`);
  for (const r of rows) {
    console.log(
      `  ${r.key}  ${r.n}/${seeds} (${((r.n / seeds) * 100).toFixed(1)}%)`,
    );
    console.log(`     ${r.line.slice(0, 180)}`);
  }
  process.exitCode = rows.length === 0 ? 0 : 1;
}

main();
