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

import { estimateSolutionPx } from "@/lib/printOverflow";
import { solutionForDisplay } from "@/lib/solutionSteps";

const ROOT = join(process.cwd(), "src");

/**
 * 🔴 **탐침도 지면을 그린다 — 모집단에 넣어야 한다.**
 *
 * 처음엔 `src/` 만 훑었다. 그래서 `scripts/qa/measure-answerkey-overflow.tsx` 가
 * **원문**을 그리는 것을 구조적으로 못 봤다. 그 탐침은 자를 채점하는 «참»을 만드는
 * 물건이라, 제품과 갈리면 **틀린 자가 만점**을 받는다 — 2026-09-06 에 실제로
 * 그럴 뻔했다(자를 고치고 그 탐침으로 채점할 참이었다).
 */
const PROBE_ROOT = join(process.cwd(), "scripts", "qa");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // `_` 로 시작하는 것은 임시 자료다(`.gitignore` 의 `scripts/qa/_*`) — 판정 대상이
    // 아니다. 옛 코드를 git 에서 꺼내 두는 자리라 여기 걸리면 늘 우는 가드가 된다.
    if (statSync(path).isDirectory())
      return name === "__tests__" || name.startsWith("_") ? [] : walk(path);
    return path.endsWith(".tsx") || path.endsWith(".ts") ? [path] : [];
  });
}

/** 해설로 **끝나는** 참조 — `p.solution` · `solution`. `data.solution.answer`(정답)·`solutionSource` 는 아니다. */
const SOLUTION_REF = /(?<![\w$])solution(?![\w$])(?!\s*\??\.)/;

/**
 * 해설을 **렌더러에 손질 없이 넘기는** 자리를 찾는다.
 *
 * 규칙: `text={…}`·`content={…}` 식이 해설을 가리키면, 그 식이 `solutionForDisplay(` 를 부르거나
 * 받는 쪽이 `<SolutionText`(줄 나눔 → MathText, `MathText.tsx`)여야 한다.
 *
 * 🔴 2026-09-26 — 예전 식(`/text=\{x\.solution/` 모양)은 **감싼 호출**을 못 봤다:
 *    `shown(p.solution)` · `fractionViewFor(p)(p.solution)` · `preview(crop.solution)` · `text={solution}`.
 *    그래서 시험지 해설지(`AnswerPage`)·관리자 미리보기·옛 작업 화면·작업실이 줄 나눔 없이 그렸는데
 *    이 검사는 초록이었다(후보정 조사 D). 반대로 `data.solution.answer`(정답)를 해설로 읽어
 *    수정 전부터 **늘 빨갰다** — 늘 우는 가드는 침묵하는 가드와 같다.
 */
function rawSolutionPasses(source: string): string[] {
  const found: string[] = [];
  for (const m of source.matchAll(/\b(?:text|content)=\{/g)) {
    // 식은 균형 잡힌 중괄호로 읽는다 — `?? ""` · 삼항 · 호출이 섞여 있다.
    const from = m.index! + m[0].length;
    let depth = 1;
    let i = from;
    for (; i < source.length && depth > 0; i += 1) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") depth -= 1;
    }
    const expr = source.slice(from, i - 1);
    if (!SOLUTION_REF.test(expr)) continue;
    if (/solutionForDisplay\s*\(/.test(expr)) continue;
    const element = [
      ...source.slice(0, m.index).matchAll(/<([A-Z][\w.]*)/g),
    ].at(-1)?.[1];
    if (element === "SolutionText") continue;
    found.push(`<${element ?? "?"} ${m[0]}${expr}}`);
  }
  return found;
}

describe("[배선] 해설은 전부 solutionForDisplay 를 지난다", () => {
  const files = [...walk(ROOT), ...walk(PROBE_ROOT)];

  it("렌더러에 해설을 그대로 넘기는 자리가 없다", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const hit of rawSolutionPasses(text))
        offenders.push(
          `${file.replace(ROOT, "src").replace(PROBE_ROOT, "scripts/qa")}: ${hit}`,
        );
    }
    expect(
      offenders,
      "해설을 손질 없이 그리고 있다 — `<SolutionText>` 를 쓰거나 `solutionForDisplay()` 를 거칠 것. " +
        "한 자리만 빠져도 그 화면에서만 한 줄로 나가고 아무도 모른다",
    ).toEqual([]);
  });

  it("🔴 이 검사가 «아니오»를 낼 수 있다 — 음성 대조", () => {
    // 도장은 초록을 못 낸다. 일부러 걸리는 글을 대 본다.
    expect(
      rawSolutionPasses("<MathText text={problem.solution} />"),
    ).toHaveLength(1);
    expect(
      rawSolutionPasses('<View content={row.solution ?? ""} />'),
    ).toHaveLength(1);
    // 감싼 호출도 해설이다 — 2026-09-26 전에는 여기가 전부 초록이었다.
    expect(
      rawSolutionPasses('<MathText as="div" text={shown(p.solution)} />'),
    ).toHaveLength(1);
    expect(
      rawSolutionPasses(
        '<MathText text={fractionViewFor(p)(p.solution)} as="div" />',
      ),
    ).toHaveLength(1);
    expect(
      rawSolutionPasses('<MathText text={solution} as="div" />'),
    ).toHaveLength(1);
    expect(
      rawSolutionPasses("<ProblemContent content={preview(crop.solution)} />"),
    ).toHaveLength(1);
    // 거쳐 가는 자리는 안 걸려야 한다 — 안 그러면 늘 우는 가드가 된다.
    expect(
      rawSolutionPasses('text={solutionForDisplay(problem.solution) ?? ""}'),
    ).toHaveLength(0);
    expect(
      rawSolutionPasses("<SolutionText text={shown(p.solution)} />"),
    ).toHaveLength(0);
    // 정답은 해설이 아니다(`StudentReplayDialog` 의 `data.solution.answer`).
    expect(
      rawSolutionPasses('<MathText text={data.solution.answer} as="div" />'),
    ).toHaveLength(0);
  });

  it("실제로 네 자리가 그 함수를 부른다 — 0 은 「깨끗」이 아니라 「못 셈」일 수 있다", () => {
    const callers = files.filter((f) =>
      /solutionForDisplay\s*\(/.test(readFileSync(f, "utf8")),
    );
    expect(
      callers.length,
      "해설을 그리는 자리를 하나도 못 찾았다 — 검사가 눈이 멀었다",
    ).toBeGreaterThanOrEqual(4);
    // 탐침이 모집단에 실제로 들어왔는지 — 안 들어오면 위 검사가 그쪽에 눈이 멀었다.
    expect(
      files.some((f) => f.includes("measure-answerkey-overflow")),
      "정답지 탐침이 모집단에 없다 — `scripts/qa` 를 안 훑고 있다",
    ).toBe(true);
  });

  /**
   * 🔴 **자도 지면과 같은 글을 봐야 한다.**
   *
   * 위 검사는 **JSX prop** 만 본다(`text={x.solution}`). 그래서 넘침 자
   * (`estimateSolutionPx(problem.solution)`)는 **축 밖**이었다 — 함수 인자라
   * 그 정규식에 안 걸린다. 「없는 축은 변이시킬 수 없다」의 그 자리다.
   *
   * 2026-09-06 에 `solutionForDisplay` 를 네 화면에 걸자마자 **자만 눈이 멀었다**:
   * 지면은 갈라 그리는데 자는 원문을 재서, 실측 **16,169행(16.0%)** 이 어긋나고
   * 그중 **16,168행에서 자가 낮게** 봤다(평균 22px · 최대 125px).
   * 해설 과소는 「조금 잘림」이 아니라 **해설 한 건이 통째로 사라짐**이다
   * (`printOverflow.ts` 주석 자신이 그렇게 적는다).
   *
   * ⚠️ 소스를 훑지 않고 **동작으로** 잰다 — 자를 어떻게 부르든 같은 값이 나와야 한다.
   */
  describe("자도 지면과 같은 글을 본다", () => {
    /**
     * 지면에서 두 줄로 갈리는 해설. `splitSolutionSteps` 가 한글 문장 끝에서 끊는다.
     *
     * ⚠️ **두 조각이 각각 한 줄보다 짧아야** 이 표본이 경계를 가른다. 긴 문장 둘을
     *    쓰면 «붙여도 두 줄 · 갈라도 두 줄»이라 자가 틀려도 값이 같다 — 처음에
     *    실제로 그런 표본을 써서 결함이 있는데도 **초록**이 나왔다
     *    (「변이가 초록이면 표본부터 의심하라」).
     *
     * ⚠️ `따라서`·`그러므로`·`∴` 는 그 자체가 마커다. 여기 쓰면 아래 `flat` 이
     *    그것 때문에 또 갈려서 대조가 안 선다(이것도 실제로 그랬다).
     */
    const SPLITS = "밑변은 $5$이다. 높이는 $4$이다.";

    it("🔴 이 표본이 실제로 갈린다 — 안 갈리면 아래 검사는 아무것도 안 지킨다", () => {
      expect(solutionForDisplay(SPLITS)).toContain("\n");
    });

    it("원문을 넘기든 갈린 글을 넘기든 자가 같은 값을 낸다", () => {
      expect(estimateSolutionPx(SPLITS)).toBe(
        estimateSolutionPx(solutionForDisplay(SPLITS)),
      );
    });

    it("갈리는 해설은 안 갈리는 같은 길이보다 **크게** 잰다 — 과소는 곧 놓침이다", () => {
      const flat = SPLITS.replace("이다. 높이는", "이고 높이는");
      expect(solutionForDisplay(flat)).not.toContain("\n");
      expect(estimateSolutionPx(SPLITS)).toBeGreaterThan(
        estimateSolutionPx(flat),
      );
    });
  });
});
