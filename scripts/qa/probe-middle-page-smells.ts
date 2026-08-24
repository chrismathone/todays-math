/**
 * 🟢 판정기 — 중등 지면의 **「값은 맞는데 흉한 것」**.
 *
 * 2026-08-24 미분류 133건을 눈으로 읽다가 나온 둘을 잡는다. **둘 다 값이 맞고 KaTeX 도
 * 초록**이라 기존 시험이 구조적으로 못 본다(2026-08-24 「값이 맞으면 시험이 다 초록이다」).
 *
 * ## ⑴ 상위 학년 개념 (D-103 ⑴ 위반)
 *
 * 중2 「삼각형의 외심」 풀이가 이렇게 적고 있었다:
 *
 * > 한 호에 대한 중심각의 크기는 **원주각**의 크기의 $2$배이므로 $\angle BOC=2\angle A$이다.
 *
 * 결과는 중2 내용이 맞다. 그런데 근거를 **중3 2학기**(`3-2|원주각`) 용어로 댄다 —
 * 그 낱말을 아직 안 배운 학생이 읽는다. 값 검사·렌더 검사 어느 쪽도 이 부류를 못 센다.
 *
 * ## ⑵ 이중 부호
 *
 * > $7x+-4x=3x$ · $k+a=-8+-3=-11$ · $x^2-4x+-p-5=0$
 *
 * 부호 있는 값을 `+` 뒤에 그냥 이어 붙이면 난다.
 *
 * ## ⚠️ 금지어 목록은 손으로 쓴 것이라 «샌다»
 *
 * 2026-08-18 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」. 그래서 금지어를
 * 지어내지 않고 **정본에서 뽑는다** — `registeredTypes()` 가 실제로 들고 있는
 * **중3 소단원 이름 전체**가 곧 목록이다. 중3에만 있는 소단원 이름이 중1·중2 지면에
 * 낱말로 나오면 그건 상위 학년 개념이다.
 *
 *   npx tsx scripts/qa/probe-middle-page-smells.ts
 *   npx tsx scripts/qa/probe-middle-page-smells.ts --seeds 300
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

/** `$…+-…$` / `$…-+…$` — 수식 안에서만 본다. 글에서는 「+-」가 날 일이 없다. */
export function doubleSign(text: string): string | null {
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const hit = /.{0,10}(\+-|-\+).{0,10}/.exec(m[1]!);
    if (hit) return hit[0];
  }
  return null;
}

/**
 * 중3에만 있는 **소단원 이름** — 정본(등록 메타)에서 통째로 뽑는다.
 *
 * ⚠️ 처음엔 소단원 이름을 **낱말로 쪼개** 「중3에만 나오는 낱말」을 셌다. 30유형이 걸렸는데
 *    거의 다 거짓이었다 — 「원**의**」(3-2 「원의 접선」에서 잘려 나온 조각) 가 중1
 *    「밑면인 **원의** 반지름」에 걸리고, 「최솟값」이 중2 부등식에 걸렸다. 조각은 개념이
 *    아니다. 그래서 **이름 통째로** 본다: 「원주각」이 중2 지면에 그대로 적혀 있으면
 *    그건 그 개념을 부른 것이다.
 *
 * ⚠️ 이 열쇠는 **샌다** — 중3 개념을 다른 말로 풀어 쓰면 못 잡는다. 새는 방향이
 *    「못 잡는 쪽」이라 거짓 경보로 가드를 끄는 것보다 낫다(2026-08-20 교훈).
 */
export function grade3OnlySections(): string[] {
  const types = registeredTypes();
  const lower = new Set<string>();
  const upper = new Set<string>();
  for (const t of types) {
    (t.rpmBook.startsWith("3") ? upper : lower).add(t.unitSection);
  }
  return [...upper]
    .filter((s) => !lower.has(s) && s.length >= 3)
    .sort((a, b) => b.length - a.length);
}

/**
 * 지면이 그 소단원 이름을 **낱말로** 불렀는가.
 *
 * ⚠️ `includes` 만 쓰면 중1 「**소**인수분해」가 중3 「인수분해」로 걸린다(실측). 한글이
 *    바로 앞에 붙어 있으면 그건 더 긴 다른 낱말의 꼬리다.
 */
export function mentionsSection(page: string, name: string): boolean {
  let from = 0;
  for (;;) {
    const at = page.indexOf(name, from);
    if (at < 0) return false;
    const before = at === 0 ? "" : page[at - 1]!;
    if (!/[가-힣]/.test(before)) return true;
    from = at + 1;
  }
}

function calibrate(terms: string[]): boolean {
  const checks: [boolean, string][] = [
    [doubleSign("$7x+-4x=3x$") !== null, "이중 부호를 잡는다"],
    [doubleSign("$k+a=-8+(-3)=-11$") === null, "괄호로 싼 것은 안 걸린다"],
    [doubleSign("$-4x-5=-1$") === null, "홑부호는 안 걸린다"],
    // 「+-」가 글(수식 밖)에 있으면 지면 수식이 아니다
    [doubleSign("보기 +- 는 수식이 아니다") === null, "수식 밖은 안 본다"],
    [terms.includes("원주각"), "중3 전용 소단원에 「원주각」이 있다"],
    [!terms.some((t) => t.length < 3), "두 글자 이하 이름은 빠진다"],
    // 조각이 아니라 **이름 통째**여야 한다 — 「원의」 같은 조각이 있으면 거짓 경보가 쏟아진다
    [!terms.includes("원의"), "「원의」 같은 조각은 없다"],
    // 중1 「소인수분해」가 중3 「인수분해」로 걸리면 안 된다 — 낱말 경계
    [
      !mentionsSection("$507$을 소인수분해 하시오.", "인수분해"),
      "「소인수분해」는 「인수분해」로 안 걸린다",
    ],
    [
      mentionsSection("한 호에 대한 중심각은 원주각의 2배이다.", "원주각"),
      "「원주각의」는 「원주각」으로 걸린다",
    ],
  ];
  console.log(`눈금 ${checks.length}건 (중3 전용 소단원 ${terms.length}개)`);
  for (const [ok, what] of checks) console.log(`${ok ? "✅" : "❌"} ${what}`);
  const bad = checks.filter(([ok]) => !ok);
  if (bad.length) console.log("🔴 눈금이 안 맞는다 — 판정을 믿을 수 없다");
  return bad.length === 0;
}

function main() {
  const terms = grade3OnlySections();
  if (!calibrate(terms)) {
    process.exitCode = 1;
    return;
  }
  // `--selftest` 는 **눈금만** 본다 — 관문의 눈금 시험이 이 꼴로 부른다.
  if (process.argv.includes("--selftest")) return;
  const i = process.argv.indexOf("--seeds");
  const seeds = i >= 0 ? Number(process.argv[i + 1]) : 120;

  const signs: { key: string; n: number; hit: string }[] = [];
  const upper: { key: string; n: number; word: string; line: string }[] = [];

  for (const t of registeredTypes()) {
    let ns = 0;
    let hit = "";
    let nu = 0;
    let word = "";
    let line = "";
    for (let seed = 1; seed <= seeds; seed += 1) {
      const p = generateMiddleProblem(t.key, seed);
      const page = `${p.content}\n${p.solution}`;
      const d = doubleSign(page);
      if (d) {
        ns += 1;
        if (!hit) hit = d;
      }
      if (!t.rpmBook.startsWith("3")) {
        for (const w of terms) {
          if (!mentionsSection(page, w)) continue;
          nu += 1;
          if (!word) {
            word = w;
            line =
              page
                .split("\n")
                .find((l) => l.includes(w))
                ?.slice(0, 130) ?? "";
          }
          break;
        }
      }
    }
    if (ns) signs.push({ key: t.key, n: ns, hit });
    if (nu) upper.push({ key: t.key, n: nu, word, line });
  }

  console.log(
    `\n⑴ 중1·중2 지면에 중3 전용 소단원 이름 — 유형 ${upper.length}건`,
  );
  for (const u of upper.sort((a, b) => b.n - a.n))
    console.log(`   · ${u.key} ${u.n}/${seeds} 「${u.word}」 :: ${u.line}`);

  console.log(`\n⑵ 이중 부호 — 유형 ${signs.length}건`);
  for (const s of signs.sort((a, b) => b.n - a.n))
    console.log(`   · ${s.key} ${s.n}/${seeds} 이중 부호 :: ${s.hit}`);

  const bad = upper.length + signs.length;
  console.log(bad === 0 ? "\n✅ 깨끗하다" : `\n🔴 ${bad}유형`);
  process.exitCode = bad === 0 ? 0 : 1;
}

main();
