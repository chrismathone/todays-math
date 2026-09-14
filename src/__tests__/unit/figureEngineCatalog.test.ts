import { describe, expect, it } from "vitest";
import catalog from "../../../scripts/figure/engine-catalog.json";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import { buildFigureSpecPrompt } from "@/lib/dev-ai/figure-prompt";

/**
 * 🔴 **모델이 받는 도형 계약에 «엔진이 실제로 받는 필드»가 빠짐없이 있는가** (2026-09-14).
 *
 * 재작도 AI 가 47초를 쓰고 「제공된 엔진 계약에는 치수 곡선의 휨과 라벨 위치를 조절하는
 * 기능이 없어 … 충실하게 재현할 수 없습니다」로 거절했다. 그런데 엔진은 그 키를 **다
 * 받는다**(`dimensions.curvature`, `labels.dx`·`dy`·`position`). 계약이
 * `compile_figure_spec` 의 **docstring 만** 실었고 그 docstring 에 그 줄이 없었다 —
 * 모델이 게으른 게 아니라 **설명서에만 없던 기능**이었다.
 *
 * 그래서 `build_catalog.py` 가 허용 목록을 **강제하는 코드**(`_strict_keys`)에서 읽어
 * `v2_fields` 로 싣는다. 여기서는 그 거절의 원인이 된 사실들을 못 박는다.
 *
 * ⚠️ **JSON 을 손으로 고쳐 이 시험을 초록으로 만들지 말 것.** 생성기를 고치고
 *    `python scripts/figure/build_catalog.py` 로 다시 뽑는다 — 손으로 고친 JSON 은
 *    다음 재생성에서 조용히 사라진다.
 */
const fields = (catalog as Record<string, unknown>).v2_fields as
  Record<string, string[]> | undefined;

describe("도형 엔진 계약이 엔진이 받는 v2 필드를 싣는다", () => {
  it("치수 표시의 휨을 알린다 — 거절의 원인이던 자리", () => {
    expect(fields?.dimensions).toEqual(
      expect.arrayContaining(["curvature", "offset", "inset", "side", "label"]),
    );
  });

  it("라벨 위치를 옮기는 필드를 알린다", () => {
    expect(fields?.labels).toEqual(
      expect.arrayContaining(["dx", "dy", "position", "text"]),
    );
  });

  /** 선분은 `dash`·`dashed` 둘 다 받지만 **호는 `dash` 만** 받는다 — 모델이 헷갈리는 자리. */
  it("호의 점선은 dash 이고 dashed 가 아니다", () => {
    expect(fields?.arcs).toContain("dash");
    expect(fields?.arcs).not.toContain("dashed");
    expect(fields?.segments).toEqual(
      expect.arrayContaining(["dash", "dashed"]),
    );
  });

  it("점의 세 갈래를 뭉개지 않고 따로 적는다", () => {
    expect(fields?.["points:raw"]).toEqual(expect.arrayContaining(["x", "y"]));
    expect(fields?.["points:on_circle"]).toEqual(
      expect.arrayContaining(["circle", "angle"]),
    );
    expect(fields?.["points:intersection"]).toContain("segments");
    // 좌표는 raw 에만 있다 — 합쳐 적으면 원 위의 점에 x 를 줘도 되는 것처럼 읽힌다.
    expect(fields?.["points:on_circle"]).not.toContain("x");
  });

  /**
   * 🔴 JSON 에 있는 것과 **모델이 받는 것**은 다른 일이다. 카탈로그에만 넣고 프롬프트에
   *    안 실리면 배선이 한쪽만 걸린 것이고, 그러면 이 파일의 다른 시험은 다 초록인데
   *    모델은 여전히 모른다(2026-08-18 「규칙이 옳아도 배선이 한쪽만 되면」).
   */
  it("모델이 실제로 받는 프롬프트에 그 필드가 들어간다", () => {
    const prompt = buildFigureSpecPrompt({} as DevAiRequest);
    expect(prompt).toContain('"v2_fields"');
    expect(prompt).toContain('"curvature"');
  });
});
