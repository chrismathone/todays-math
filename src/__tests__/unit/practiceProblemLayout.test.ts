import { describe, expect, it } from "vitest";
import { practiceProblemList } from "@/lib/math/practiceProblemLayout";

describe("practiceProblemList", () => {
  it("aligns the screenshot's complete expressions without altering them", () => {
    const items = [
      "$-3x-7$",
      "$-2x-9=-4$",
      "$6x+2y-6$",
      "$-6x-1=1$",
      "$-5x+6y+2$",
    ];
    expect(
      practiceProblemList(
        `다음 중 등식인 것의 개수를 구하시오.\n${items.join(", ")}`,
      ),
    ).toEqual({
      introduction: "다음 중 등식인 것의 개수를 구하시오.",
      items,
      compact: false,
    });
  });

  it("places small elementary numbers into a compact list", () => {
    expect(
      practiceProblemList(
        "28의 약수가 아닌 수를 고르시오.\n$2$, $7$, $23$, $14$",
      ),
    ).toEqual({
      introduction: "28의 약수가 아닌 수를 고르시오.",
      items: ["$2$", "$7$", "$23$", "$14$"],
      compact: true,
    });
  });

  it("respects explicit formula line breaks", () => {
    expect(
      practiceProblemList("다음 중 맞는 식을 찾으시오.\n$x+2=3$\n$x-2=4$")
        ?.items,
    ).toEqual(["$x+2=3$", "$x-2=4$"]);
  });

  it.each([
    "좌표를 구하시오.\n$(2,3)$",
    "값을 구하시오.\n$f(x,y)$",
    "수를 읽으시오.\n$1,000$",
    "집합을 구하시오.\n$\\{1,2,3\\}$",
    "행렬을 구하시오.\n$\\begin{matrix}1,2&3\\\\4&5\\end{matrix}$",
    "두 수 $a$, $b$의 합을 구하시오.",
    "다음 값을 구하시오.\n$x=1,2,3$",
    "> <보기>\n> $x=1$, $x=2$",
    "다음은 $x$, $y$",
  ])("does not reinterpret authored or embedded math: %s", (source) => {
    expect(practiceProblemList(source)).toBeNull();
  });

  it("retains inner commas when whole coordinates are listed", () => {
    expect(
      practiceProblemList("두 점을 비교하시오.\n$(2,3)$, $(4,5)$")?.items,
    ).toEqual(["$(2,3)$", "$(4,5)$"]);
  });

  it("preserves math in the instruction", () => {
    expect(
      practiceProblemList("$28$의 약수를 고르시오.\n$2$, $7$, $23$, $14$")
        ?.introduction,
    ).toBe("$28$의 약수를 고르시오.");
  });
});
