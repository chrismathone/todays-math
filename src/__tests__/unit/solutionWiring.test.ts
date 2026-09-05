/**
 * 🔴 **해설을 그리는 자리는 전부 `solutionForDisplay` 를 지난다.**
 *
 * ## 왜 이 시험이 있는가 — 같은 지적을 두 번 받았다
 *
 * `splitSolutionSteps` 는 2026-08-21 에 원장님 지적(*「해설도 문제와 같은 기준치를
 * 적용해야 함. 줄바꿈 하나도 안 되고 1행으로」*)으로 만들어졌다. 그런데 **검수 화면
 * 하나에만** 걸렸고, 그 파일 주석이 「인쇄은 별도 트랙」이라 적어 두어 아무도 안 걸었다.
 *
 * 그래서 2026-09-06 에 원장님이 **같은 것을 다시** 지적하셨다 —
 * *「전체적으로 우리 서술형 해설은 다 한 줄로 되어 있음. 10만 문제가 다 그럴 듯.」*
 *
 * 「배선이 한쪽만 되면 그쪽 지표만 좋아진다」(CLAUDE.md 2026-08-18)의 그 자리다.
 * **한쪽만 걸면 아무도 모른다** — 걸린 화면은 멀쩡해 보이기 때문이다.
 *
 * ## 이 시험이 무엇을 세나
 *
 * 「`.solution` 을 렌더러에 **그대로** 넘기는 자리가 없다」를 소스에서 센다.
 * ⚠️ 낱말 하나(`solution`)를 세면 안 된다 — 파일 안 다른 곳에도 있다
 * (CLAUDE.md 2026-08-18 「LOOP 가 있나」). **넘기는 모양**으로 좁힌다.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "__tests__" ? [] : walk(path);
    return path.endsWith(".tsx") || path.endsWith(".ts") ? [path] : [];
  });
}

/**
 * 해설을 **렌더러에 그대로 넘기는** 모양. `text={x.solution}` · `content={x.solution}`
 * · `text={x.solution ?? …}` 를 잡는다. `solutionForDisplay(...)` 를 거치면 안 걸린다.
 */
const RAW_PASS =
  /\b(?:text|content)=\{\s*[A-Za-z_$][\w$]*\.solution\b(?!\s*\))/g;

describe("[배선] 해설은 전부 solutionForDisplay 를 지난다", () => {
  const files = walk(ROOT);

  it("렌더러에 해설을 그대로 넘기는 자리가 없다", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(RAW_PASS))
        offenders.push(`${file.replace(ROOT, "src")}: ${m[0]}`);
    }
    expect(
      offenders,
      "해설을 손질 없이 그리고 있다 — `solutionForDisplay()` 를 거칠 것. " +
        "한 자리만 빠져도 그 화면에서만 한 줄로 나가고 아무도 모른다",
    ).toEqual([]);
  });

  it("🔴 이 검사가 «아니오»를 낼 수 있다 — 음성 대조", () => {
    // 도장은 초록을 못 낸다. 일부러 걸리는 글을 대 본다.
    expect([
      ..."<MathText text={problem.solution} />".matchAll(RAW_PASS),
    ]).toHaveLength(1);
    expect([
      ...'<View content={row.solution ?? ""} />'.matchAll(RAW_PASS),
    ]).toHaveLength(1);
    // 거쳐 가는 자리는 안 걸려야 한다 — 안 그러면 늘 우는 가드가 된다.
    expect([
      ...'text={solutionForDisplay(problem.solution) ?? ""}'.matchAll(RAW_PASS),
    ]).toHaveLength(0);
  });

  it("실제로 네 자리가 그 함수를 부른다 — 0 은 「깨끗」이 아니라 「못 셈」일 수 있다", () => {
    const callers = files.filter((f) =>
      /solutionForDisplay\s*\(/.test(readFileSync(f, "utf8")),
    );
    expect(
      callers.length,
      "해설을 그리는 자리를 하나도 못 찾았다 — 검사가 눈이 멀었다",
    ).toBeGreaterThanOrEqual(4);
  });
});
