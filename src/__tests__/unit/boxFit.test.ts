import { describe, expect, it, vi } from "vitest";
import {
  BOX_TIGHT_SPACING,
  boxFitSteps,
  fitBoxColumns,
  type BoxFitStep,
} from "@/lib/math/boxFit";

/**
 * 좁은 단의 〈보기〉 격자 — 원장님 2026-09-21 확정(트랙 51, «추천대로 가»).
 * 88mm 단의 3열 〈보기〉 에서 `y = −⅔x²` 가 칸 안에서 «y =» 뒤로 접혔다. 먼저 상자 안쪽 여백·칸 사이
 * 간격을 줄여 원본처럼 한 줄에 세우고, 그래도 안 들어가면 **그리는** 열 수를 줄인다(적힌 `cols=N` 은 그대로).
 */

/** 카드 안쪽 폭(테두리 안, 여백 포함) 하나로 칸 폭을 내는 모형 — 지면 카드의 실측 모양. */
const trackModel =
  (cardClient: number, normal = { padX: 16, gapX: 24 }) =>
  ({ cols, tight }: BoxFitStep) => {
    const { padX, gapX } = tight ? BOX_TIGHT_SPACING : normal;
    return (cardClient - 2 * padX - (cols - 1) * gapX) / cols;
  };

// 하네스 실측(88mm 단, 10.5pt): 원장님 9번 여섯 칸의 한 줄 폭, 지면 카드 안쪽 폭 331px.
const BOX9_AT_14PX = [83.7, 100.9, 96.9, 87.8, 87.8, 96.9];

describe("사다리 — 적힌 열 수에서 시작해 여백을 줄이고, 그다음 열을 줄인다", () => {
  it("3열: 3 보통 → 3 좁게 → 2 보통 → 2 좁게 → 1", () => {
    expect(boxFitSteps(3)).toEqual([
      { cols: 3, tight: false },
      { cols: 3, tight: true },
      { cols: 2, tight: false },
      { cols: 2, tight: true },
      { cols: 1, tight: false },
    ]);
  });

  it("2열: 2 보통 → 2 좁게 → 1 · 1열은 사다리가 없다", () => {
    expect(boxFitSteps(2)).toEqual([
      { cols: 2, tight: false },
      { cols: 2, tight: true },
      { cols: 1, tight: false },
    ]);
    expect(boxFitSteps(1)).toEqual([{ cols: 1, tight: false }]);
  });
});

describe("판정 — 칸마다 한 줄 폭이 칸 폭 안에 드는 첫 단계", () => {
  it("넓은 단(1단 지면)은 적힌 3열 그대로, 여백도 그대로", () => {
    expect(
      fitBoxColumns({
        written: 3,
        naturals: BOX9_AT_14PX,
        trackAt: trackModel(678),
      }),
    ).toEqual({ cols: 3, tight: false });
  });

  it("88mm·10.5pt: 여백을 줄여도 (나) 가 안 들어가 2열로 그린다", () => {
    expect(
      fitBoxColumns({
        written: 3,
        naturals: BOX9_AT_14PX,
        trackAt: trackModel(331),
      }),
    ).toEqual({ cols: 2, tight: false });
  });

  it("같은 단이라도 시험지 글자(13.2px)면 여백만 줄여 3열 한 줄로 선다", () => {
    const at13 = BOX9_AT_14PX.map((width) => (width * 13.2) / 14);
    expect(
      fitBoxColumns({ written: 3, naturals: at13, trackAt: trackModel(331) }),
    ).toEqual({ cols: 3, tight: true });
  });

  it("어느 단계도 안 맞으면 1열 — 1열은 묻지 않는다(글은 줄바꿈된다)", () => {
    const trackAt = vi.fn(trackModel(200));
    expect(fitBoxColumns({ written: 3, naturals: [400, 30], trackAt })).toEqual(
      { cols: 1, tight: false },
    );
    expect(trackAt.mock.calls.map(([step]) => step.cols)).not.toContain(1);
  });

  it("1열로 적힌 상자는 재지도 않는다", () => {
    const trackAt = vi.fn(trackModel(200));
    expect(fitBoxColumns({ written: 1, naturals: [900], trackAt })).toEqual({
      cols: 1,
      tight: false,
    });
    expect(trackAt).not.toHaveBeenCalled();
  });

  it("반 px 까지는 들어간 것으로 본다 — 소수 px 반올림으로 흔들리지 않게", () => {
    const trackAt = () => 83.5;
    expect(
      fitBoxColumns({ written: 2, naturals: [83.9], trackAt }),
    ).toMatchObject({ cols: 2, tight: false });
    expect(
      fitBoxColumns({ written: 2, naturals: [84.1], trackAt }),
    ).toMatchObject({ cols: 1 });
  });

  it("칸이 없으면(잴 것이 없으면) 적힌 대로", () => {
    expect(
      fitBoxColumns({ written: 3, naturals: [], trackAt: () => 0 }),
    ).toEqual({ cols: 3, tight: false });
  });
});
