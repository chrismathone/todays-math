/**
 * 🔴 RED → 🟢 — 해설 줄 나누기 (원장님 검수 지적 2026-08-21).
 *
 * 해설이 화면에서 **한 줄 벽**으로 나온다 — HWP 추출이 해설의 줄 구조를 잃어
 * DB 에 개행이 없기 때문이다. 데이터는 손대지 않고 **표시할 때** 잃어버린
 * 경계를 되찾는다. 구현: src/lib/solutionSteps.ts
 *
 * 열쇠 (실데이터에서 눈으로 확인한 것):
 *  · `…$` 바로 뒤에 `$…` 가 붙는 자리(`$$` 경계)는 원본에서 줄이 갈리던 자리다 —
 *    보통 글은 수식 사이에 낱말이 있다. (J30602-VMC9 실측)
 *  · 소문항 표지 ⑴⑵…, ∴·따라서·그러므로 앞도 새 줄이다.
 *  · 한글 문장 끝(`다.`·`시오.`) 뒤도 새 줄이다 — `$3.5$` 같은 소수점은
 *    한글이 아니라 안 걸린다.
 *  · **수식(`$…$`) 안에서는 절대 자르지 않는다.**
 */
import { describe, expect, it } from "vitest";

import { splitSolutionSteps } from "@/lib/solutionSteps";

// J30602-VMC9 의 실제 해설 (rm 수리 뒤 DB 값 그대로)
const VMC9 =
  "$18$$\\mathrm{\\angle }PAO=\\angle PBO=90°$피타고라스의 정리에 의하여 $\\mathrm{\\overline{AO}}=3$$\\mathrm{\\triangle }PAO=\\triangle PBO$ ($\\mathrm{RHS}$ 합동)$□\\mathrm{AOBP}$의 둘레의 길이는 $3+3+6+6 = 18$";

describe("splitSolutionSteps — 해설 줄 나누기", () => {
  it("인접한 수식 경계($$)에서 줄을 가른다 — VMC9 실데이터", () => {
    const steps = splitSolutionSteps(VMC9);
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[0]).toBe("$18$");
    // 어느 줄도 수식이 반 토막 나면 안 된다 — $ 개수가 줄마다 짝수여야 한다
    for (const s of steps) {
      expect((s.match(/\$/g) ?? []).length % 2).toBe(0);
    }
    // 내용은 하나도 잃지 않는다 (공백 무시)
    expect(steps.join("").replace(/\s/g, "")).toBe(VMC9.replace(/\s/g, ""));
  });

  it("수식 안의 소수점·기호에서는 자르지 않는다", () => {
    const s = "넓이가 $3.5$ 이므로 답은 $7$";
    expect(splitSolutionSteps(s)).toEqual([s]);
  });

  it("소문항 표지 ⑴⑵ 앞에서 가른다", () => {
    const steps = splitSolutionSteps("답은 다음과 같다.⑴ $x=1$⑵ $x=2$");
    expect(steps).toEqual(["답은 다음과 같다.", "⑴ $x=1$", "⑵ $x=2$"]);
  });

  it("따라서·∴ 앞에서 가른다", () => {
    const steps = splitSolutionSteps("$x=2$이고 $y=3$이다.따라서 합은 $5$");
    expect(steps).toEqual(["$x=2$이고 $y=3$이다.", "따라서 합은 $5$"]);
  });

  it("한글 문장 끝 뒤에서 가른다 — 소수점은 안 가른다", () => {
    const steps = splitSolutionSteps(
      "반지름은 $2.5$이다.넓이를 구하면 $6.25\\pi$",
    );
    expect(steps).toEqual(["반지름은 $2.5$이다.", "넓이를 구하면 $6.25\\pi$"]);
  });

  it("진짜 개행이 있으면 개행에서 가른다 — 생성 해설(2026-08-22)", () => {
    const steps = splitSolutionSteps(
      "분모를 통분한다.\n$x=\\frac{1}{2}$\n따라서 답은 $3$",
    );
    expect(steps).toEqual([
      "분모를 통분한다.",
      "$x=\\frac{1}{2}$",
      "따라서 답은 $3$",
    ]);
  });

  it("가를 자리가 없으면 통째로 한 줄", () => {
    const s = "둘레는 $3+3+6+6 = 18$";
    expect(splitSolutionSteps(s)).toEqual([s]);
  });

  it("빈 문자열은 빈 목록", () => {
    expect(splitSolutionSteps("")).toEqual([]);
  });

  /**
   * 🔴 2026-09-06 — **삽입구로 끝나는 문장을 통째로 못 보고 있었다.**
   *
   * 규칙이 마침표 **바로 앞 한 글자**만 봐서 `…작습니다). ` 는 한글이 아니라 `)` 다.
   * 실측 적재본 **176행**이 그래서 두 문장이 한 줄로 나갔다. 원장님이 확정하신
   * 규칙(「문장마다」)이 못 보던 자리이지 새 규칙이 아니다.
   *
   * ⚠️ 표본은 **적재본에서 그대로** 가져왔다 — 지어낸 글로 세우면 「검출기가 도는가」만
   *    보고 「실데이터의 그 모양을 잡는가」는 구조적으로 못 본다(2026-08-30).
   */
  describe("삽입구로 끝나는 문장 끝 (`…). `)", () => {
    it("괄호 안이 한글로 끝나는 삽입구 뒤에서 가른다 — E41102-A04-008 실데이터", () => {
      const s =
        "값이 $9$kg 이상이 된 것은 $2$개월이 처음입니다($1$개월의 값은 $4$kg으로 그보다 작습니다). 그때부터 보면 $13-9=4$ 이므로 $4$kg 늘었습니다.";
      const steps = splitSolutionSteps(s);
      expect(steps).toHaveLength(2);
      expect(steps[0]!.endsWith("작습니다).")).toBe(true);
      expect(steps[1]!.startsWith("그때부터")).toBe(true);
    });

    it("괄호 앞이 한글이면 괄호 안이 라틴이어도 가른다 — E30502-A04-014 실데이터", () => {
      const s =
        "$3\\,\\mathrm{km}$ 는 $3900$ 입니다 (단위: m). 이으면 $3900+2400=6300$ 입니다.";
      const steps = splitSolutionSteps(s);
      expect(steps).toHaveLength(2);
      expect(steps[0]!.endsWith("(단위: m).")).toBe(true);
    });

    /* ── 음성 대조 — 「자를 수 있다」만 보면 「안 자를 것도 자르나」는 안 보인다 ── */

    it("괄호 앞이 한글이 아니면 안 가른다", () => {
      const s = "the value (x). next part";
      expect(splitSolutionSteps(s)).toEqual([s]);
    });

    it("여는 괄호가 없으면 안 가른다 — 못 가르는 것은 버리는 쪽으로", () => {
      const s = "넓이는 이다). 그다음 값은 $3$";
      expect(splitSolutionSteps(s)).toEqual([s]);
    });

    it("수식이 닫힌 뒤의 마침표는 안 가른다 — `$f(x)$.`", () => {
      const s = "함수는 $f(x)$. 그리고 값은 $2$";
      expect(splitSolutionSteps(s)).toEqual([s]);
    });

    it("수식 안의 괄호·소수점은 건드리지 않는다", () => {
      const s = "값은 $g(1.5)$ 이고 답은 $7$";
      expect(splitSolutionSteps(s)).toEqual([s]);
    });

    it("글 맨 끝의 삽입구는 안 가른다 — 빈 줄이 생긴다", () => {
      const s = "두 삼각형은 서로 닮음이다 (AA 닮음).";
      expect(splitSolutionSteps(s)).toEqual([s]);
    });
  });
});
