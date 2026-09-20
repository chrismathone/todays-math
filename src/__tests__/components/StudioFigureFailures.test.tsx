import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudioFigureFailures, {
  studioFailedFigureItems,
} from "@/components/unified/StudioFigureFailures";
import type { StudioCrop } from "@/components/unified/studioHelpers";

const crop = (id: string, figureIds: string[]) =>
  ({
    id,
    figures: figureIds.map((figureId) => ({ id: figureId })),
  }) as unknown as StudioCrop;

const crops = [
  crop("c1", ["f1", "f2"]),
  crop("c2", []),
  crop("c3", ["f3"]),
] as StudioCrop[];

describe("실패한 도형 나열 — 원장님 2026-09-20 «도형 2/4 이니까 어딘지 알 수가 없음»", () => {
  it("진행 문구와 같은 이름으로, 문제 차례대로 적는다", () => {
    expect(
      studioFailedFigureItems(crops, [
        { cropId: "c3", figureId: "f3", error: "SVG 생성 실패" },
        { cropId: "c1", figureId: "f2" },
        { cropId: "c1", figureId: "f1" },
      ]).map((item) => item.label),
    ).toEqual(["도형 1-1", "도형 1-2", "도형 3-1"]);
  });

  it("사라진 문제는 갈 곳이 없어 빼고, 도형만 사라지면 문제 번호까지 적는다", () => {
    expect(
      studioFailedFigureItems(crops, [
        { cropId: "gone", figureId: "f9" },
        { cropId: "c2", figureId: "f9" },
      ]).map((item) => item.label),
    ).toEqual(["도형 2"]);
  });

  it("실패한 도형을 하나씩 보이고 누르면 그 문항으로 간다", () => {
    const onSelect = vi.fn();
    render(
      <StudioFigureFailures
        items={studioFailedFigureItems(crops, [
          { cropId: "c1", figureId: "f1", error: "SVG 생성 실패" },
          { cropId: "c3", figureId: "f3", error: "응답 지연" },
        ])}
        onSelect={onSelect}
      />,
    );
    const list = screen.getByLabelText("실패한 도형 목록");
    expect(within(list).getAllByRole("button")).toHaveLength(2);
    expect(
      within(list).getByRole("button", { name: "도형 1-1" }),
    ).toHaveAttribute("title", "SVG 생성 실패");
    fireEvent.click(within(list).getByRole("button", { name: "도형 3-1" }));
    expect(onSelect).toHaveBeenCalledWith("c3");
  });

  it("실패가 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(
      <StudioFigureFailures items={[]} onSelect={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
