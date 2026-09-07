/**
 * 담기 바구니 하단 바 — **자리 잡기는 바깥 틀의 일이다.**
 *
 * 2026-09-07 실측: 새 계정으로 문제은행에서 셋을 담고 「시험지 만들기」→ 패널을 연 뒤
 * 「이 문항들로 시험지 만들기」를 누르면 **눌리지 않았다.** Playwright 가
 * 「`담은 문항` 영역이 포인터를 가로챈다」고 찍었다. `ProblemBank` 가 이미
 * `fixed bottom-0` 틀 안에 패널과 바를 차례로 넣는데, 바의 뿌리도 **또** `fixed bottom-0`
 * 이라 바가 패널 마지막 줄(CTA) 위에 겹쳐 그려졌다. API 로 부르면 시험지가 만들어지므로
 * 서버는 옳았고 **화면 한 겹만** 틀렸다.
 *
 * jsdom 은 CSS 를 계산하지 않으므로 겹침 자체는 여기서 못 본다 — 그것은 실제 브라우저로
 * 확인했다. 여기서 잠그는 것은 그 결함의 **원인 모양**이다: 바는 자기를 고정하지 않는다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BasketBar } from "@/components/problem/BasketBar";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";

const spread = Object.fromEntries(
  DIFFICULTY_LADDER.map((d) => [d, 0]),
) as Record<(typeof DIFFICULTY_LADDER)[number], number>;

describe("BasketBar", () => {
  it("🔴 바의 뿌리는 자기를 화면에 고정하지 않는다 — 고정은 ProblemBank 의 틀이 한다", () => {
    render(
      <BasketBar
        total={3}
        spread={{ ...spread, 연산: 3 }}
        busy={false}
        onOpenList={() => {}}
        onMakeTest={() => {}}
      />,
    );
    const root = screen.getByRole("region", { name: "담은 문항" });
    // `fixed`·`bottom-0` 이 바에 다시 붙으면 틀과 겹쳐 패널의 CTA 를 덮는다(2026-09-07).
    expect(root.className).not.toMatch(/(^|\s)fixed(\s|$)/);
    expect(root.className).not.toMatch(/(^|\s)bottom-0(\s|$)/);
  });

  it("담은 수와 0이 아닌 갈래만 적는다", () => {
    render(
      <BasketBar
        total={3}
        spread={{ ...spread, 연산: 2, 기본: 1 }}
        busy={false}
        onOpenList={() => {}}
        onMakeTest={() => {}}
      />,
    );
    expect(screen.getByText("담은 문항 3개")).toBeInTheDocument();
    expect(screen.getByText("연산 2 · 기본 1")).toBeInTheDocument();
  });
});
