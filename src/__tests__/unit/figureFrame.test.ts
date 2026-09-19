import { describe, expect, it } from "vitest";
import {
  FRAME_PAD,
  widenFrame,
} from "@/components/unified/figure-editor/figureFrame";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 그림 틀(루트 viewBox) 넓히기 — 회전·뒤집기가 같이 쓰는 한 함수(원장님 2026-09-19 «틀을 넓혀 다 보이게»).
 * 편집기는 틀만 보여 준다. 돌리거나 뒤집은 것이 틀 밖으로 나가면 **넘친 쪽만** 여백을 두고 넓히고, 줄이지는 않는다.
 */
const svg = `<svg xmlns="${SVG_NS}" viewBox="0 0 200 100" width="400" height="200"><line x1="0" y1="0" x2="10" y2="10" stroke="#111"/></svg>`;
const root = (source: string) =>
  new DOMParser().parseFromString(source, "image/svg+xml").documentElement;
const viewBoxOf = (source: string) =>
  root(source).getAttribute("viewBox")!.split(" ").map(Number);

describe("그림 틀 넓히기", () => {
  it("넘친 쪽만 여백을 두고 넓힌다 — 나머지 변은 그대로", () => {
    // 위로 20, 아래로 30 넘침 — 가로는 안이다
    expect(
      viewBoxOf(
        widenFrame(
          svg,
          [
            [50, -20],
            [100, 130],
          ],
          6,
        ),
      ),
    ).toEqual([0, -26, 200, 162]);
    // 왼쪽 5, 오른쪽 30 넘침 — 세로는 안이다
    expect(
      viewBoxOf(
        widenFrame(
          svg,
          [
            [-5, 50],
            [230, 50],
          ],
          6,
        ),
      ),
    ).toEqual([-11, 0, 247, 100]);
  });

  it("width·height 가 적혀 있으면 틀과 같은 비율로 늘린다", () => {
    const next = root(
      widenFrame(
        svg,
        [
          [50, -20],
          [100, 130],
        ],
        6,
      ),
    );
    expect(next.getAttribute("width")).toBe("400");
    expect(next.getAttribute("height")).toBe("324");
  });

  it("틀 안이면 원문을 그대로 돌려준다 — 줄이지 않는다", () => {
    expect(
      widenFrame(svg, [
        [10, 10],
        [190, 90],
      ]),
    ).toBe(svg);
    expect(widenFrame(svg, [])).toBe(svg);
  });

  it("여백을 안 주면 뒤집기와 같은 기본 여백", () => {
    expect(FRAME_PAD).toBe(6);
    expect(viewBoxOf(widenFrame(svg, [[250, 50]]))).toEqual([0, 0, 256, 100]);
  });

  it("틀을 읽지 못하면 그대로 둔다", () => {
    const bare = `<svg xmlns="${SVG_NS}"><line x1="0" y1="0" x2="10" y2="10"/></svg>`;
    expect(widenFrame(bare, [[500, 500]])).toBe(bare);
  });
});
