/**
 * 뽑은 그림 자리는 파서를 지나 **정확히 한 번** 남아야 한다 (D-164 ③④ · 2026-10-21 Codex 검토).
 *
 * 지금의 파서 변환에서는 자리표가 사라지거나 둘이 되는 것을 재현하지 못했다 — 그래서 파서를 흉내 내 일부러 지우고
 * 겹친다(변이). 감시가 없으면 사라진 자리의 그림은 소리 없이 뒤 모음으로 가고, 검사는 «문제없음»을 낸다.
 */
import { describe, expect, it, vi } from "vitest";

const mode = vi.hoisted(() => ({
  value: "keep" as "keep" | "drop" | "double",
}));

vi.mock("@/lib/problem/parseProblemContent", async (original) => {
  const real =
    await original<typeof import("@/lib/problem/parseProblemContent")>();
  const TOKEN = /\uE6A0[\uE700-\uE7FF]\uE6A1/g;
  return {
    ...real,
    parseProblemContent: (raw: string) => {
      const parsed = real.parseProblemContent(raw);
      if (mode.value === "drop")
        return { ...parsed, question: parsed.question.replace(TOKEN, "") };
      if (mode.value === "double")
        return {
          ...parsed,
          question: parsed.question.replace(
            TOKEN,
            (token) => `${token}\n${token}`,
          ),
        };
      return parsed;
    },
  };
});

const { checkFigureSlots } = await import("@/lib/problem/figureSlots");

describe("자리표 «정확히 한 번» 감시", () => {
  const content = "다음 그림을 보고 답하시오.\n[그림:1] ⑴ (　　　　)";

  it("파서가 자리표를 그대로 두면 검사가 비어 있다(전제)", () => {
    mode.value = "keep";
    expect(checkFigureSlots(content, 1, [])).toEqual([]);
  });

  it("파서가 자리표를 지우면 짚는다 — 그림이 소리 없이 뒤 모음으로 가지 않게", () => {
    mode.value = "drop";
    expect(checkFigureSlots(content, 1, [])).toEqual([
      "[그림:1] ⑴ (　　　　) — 자리표가 파서에서 사라졌다",
    ]);
  });

  it("파서가 자리표를 겹치면 짚는다", () => {
    mode.value = "double";
    expect(checkFigureSlots(content, 1, [])).toContain(
      "[그림:1] ⑴ (　　　　) — 자리표가 둘 이상",
    );
  });
});
