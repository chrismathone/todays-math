import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudioReviewPane from "@/components/unified/StudioReviewPane";
import type { StudioCartState } from "@/components/unified/studioCart";
import type { StudioCrop } from "@/components/unified/studioHelpers";

/**
 * 검수 카드 바닥 — «반영 전» 표시와 «반영» 단추는 **한 덩어리**로 바닥 줄 오른쪽 끝에 선다
 * (안 A, 원장님 2026-09-21 «추천대로 가», D-135 ⑼). 자리가 모자라면 둘이 **같이** 둘째 줄로 내려간다.
 * «담음»·«뺌» 표시(단추 없음)도 같은 덩어리 자리에 서서 표시 자리가 상태마다 바뀌지 않는다.
 *
 * jsdom 은 CSS 를 안 돌린다 — 여기서는 짜임(누가 한 덩어리이고 그 덩어리가 줄 맨 끝인가)만 본다.
 * 같은 줄·오른쪽 끝은 `e2e/cart-review/current.spec.ts` 가 1516·1280 × 잠금 안/잠금에서 잰다.
 */

vi.mock("@/components/math/editor/MathTextEditor", () => ({
  MathTextEditor: ({ value }: { value: string }) => <div>{value}</div>,
}));
vi.mock("@/components/math/editor/SourceEditorDisplay", () => ({
  SourceEditorDisplay: ({ value }: { value: string }) => <div>{value}</div>,
}));

const makeCrop = (overrides: Partial<StudioCrop> = {}) =>
  ({
    id: "c1",
    sourceId: "source-1",
    sourceLabel: "원본",
    page: 1,
    rect: { x: 0, y: 0, width: 1, height: 1 },
    image: "data:image/png;base64,YQ==",
    content: "원래 문제",
    answer: "2",
    solution: "",
    level: "secondary",
    grade: "중1",
    mode: "text",
    ...overrides,
  }) as StudioCrop;

function setup(state: StudioCartState, overrides: Partial<StudioCrop> = {}) {
  const crop = makeCrop(overrides);
  render(
    <StudioReviewPane
      crops={[crop]}
      allCrops={[crop]}
      activeId={crop.id}
      page={1}
      jobs={[]}
      figureJobs={[]}
      available
      onSelect={vi.fn()}
      onUpdate={vi.fn()}
      onRun={vi.fn()}
      onCancel={vi.fn()}
      onRetry={vi.fn()}
      onCrop={vi.fn()}
      onEditFigure={vi.fn()}
      onRetryPage={vi.fn()}
      onRenderFigure={vi.fn()}
      onCancelFigure={vi.fn()}
      cartState={() => state}
      onReflect={vi.fn()}
    />,
  );
  const card = screen.getByRole("article", { name: "문제 1 인식 결과" });
  const footer = within(card)
    .getByRole("combobox", { name: "문제 1 출력 방식" })
    .closest("label")!.parentElement!;
  return { card, footer };
}

const chipIn = (card: HTMLElement) =>
  card.querySelector<HTMLElement>("[data-studio-cart-chip]");

afterEach(cleanup);

describe("검수 카드 바닥 — «반영 전 · 반영» 한 덩어리(안 A)", () => {
  it.each([
    ["검수 전", {}],
    ["검수 완료로 잠김", { reviewed: true }],
  ])(
    "%s — 표시와 «반영»이 한 덩어리이고, 그 덩어리가 바닥 줄 맨 끝이다",
    (_, overrides) => {
      const { card, footer } = setup("stale", overrides);
      const chip = chipIn(card)!;
      const reflect = within(card).getByRole("button", {
        name: "문제 1 고친 내용 반영",
      });
      const slot = chip.parentElement!;
      // 한 덩어리 — 같은 부모 아래 표시 → «반영» 차례, 그 밖에는 아무것도 없다.
      expect(reflect.parentElement).toBe(slot);
      expect([...slot.children]).toEqual([chip, reflect]);
      expect(slot).toHaveAttribute("data-studio-cart-slot");
      // 덩어리는 바닥 줄 바로 아래의 맨 끝 칸이다(«검수 완료 취소»·잠금 안내 글보다 뒤).
      expect(slot.parentElement).toBe(footer);
      expect(footer.lastElementChild).toBe(slot);
      // 덩어리는 누르는 표면이 아니다 — 역할·이름·초점을 더하지 않는다(D-30).
      expect(slot).not.toHaveAttribute("role");
      expect(slot).not.toHaveAttribute("tabindex");
    },
  );

  it.each([
    ["picked", "담음"],
    ["removed", "뺌"],
  ] as const)(
    "«%s» 표시(단추 없음)도 같은 덩어리 자리 — 바닥 줄 맨 끝",
    (state, label) => {
      const { card, footer } = setup(state);
      const chip = chipIn(card)!;
      expect(chip).toHaveTextContent(label);
      const slot = chip.parentElement!;
      expect(slot).toHaveAttribute("data-studio-cart-slot");
      expect([...slot.children]).toEqual([chip]);
      expect(footer.lastElementChild).toBe(slot);
      expect(
        within(card).queryByRole("button", { name: /고친 내용 반영/ }),
      ).toBeNull();
    },
  );

  it("안 담은 문항은 표시도 덩어리도 없다 — 빈 칸이 바닥 줄 자리를 먹지 않는다", () => {
    const { card } = setup("pending");
    expect(chipIn(card)).toBeNull();
    expect(card.querySelector("[data-studio-cart-slot]")).toBeNull();
  });
});
