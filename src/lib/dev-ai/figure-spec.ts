import { z } from "zod";
import { repairJsonString } from "@/lib/ai/jsonRepair";
import type { DevAiFigureSpec } from "./contracts";

export const MAX_FIGURE_SPEC_BYTES = 64 * 1024;

// Detailed geometry is validated by Python, the authoritative schema. This
// boundary only bounds transport/recursion and distinguishes a spec from SVG.
const FigureSpecEnvelope = z.object({
  spec: z
    .object({
      version: z.union([
        z.literal(2),
        z.literal("elem-1"),
        z.literal("graph-1"),
      ]),
    })
    .passthrough()
    .nullable(),
  note: z.string().max(1000).default(""),
  warnings: z.array(z.string().max(1000)).max(30).default([]),
});

export function parseFigureSpecResult(raw: string): {
  spec: DevAiFigureSpec | null;
  note: string;
  warnings: string[];
} {
  const invalid = () =>
    new Error(
      "도형 스펙 응답을 읽지 못했습니다. 원본은 유지됩니다. 다시 시도해 주세요.",
    );
  if (new TextEncoder().encode(raw).length > 128 * 1024) throw invalid();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    try {
      json = JSON.parse(repairJsonString(raw));
    } catch {
      throw invalid();
    }
  }
  const parsed = FigureSpecEnvelope.safeParse(json);
  if (!parsed.success) throw invalid();
  if (parsed.data.spec) {
    if (
      new TextEncoder().encode(JSON.stringify(parsed.data.spec)).length >
      MAX_FIGURE_SPEC_BYTES
    )
      throw invalid();
    const pending: { value: unknown; depth: number }[] = [
      { value: parsed.data.spec, depth: 0 },
    ];
    let count = 0;
    while (pending.length) {
      const { value, depth } = pending.pop()!;
      if (++count > 8192 || depth > 32) throw invalid();
      if (value && typeof value === "object")
        for (const child of Object.values(value))
          pending.push({ value: child, depth: depth + 1 });
    }
  }
  return parsed.data;
}

/**
 * 작업실 재작도의 v2 바탕을 투명으로 고정한다(원장님 2026-09-19 «도형 생성 시 사각형이 왜 생기나»).
 * v2 엔진은 바탕이 white(기본값)면 캔버스 전체에 흰 rect 를 첫 도형으로 깔고
 * (vendor/figure-engine/core/figure_scene.py:2906), 도형 편집기가 그것을 1번 «사각형»으로 셌다.
 * 엔진 기본값은 지면·DB 그림 바이트가 걸려 그대로 둔다 — 여기서 넘기는 spec 만 바꾸고, 저장도 이 spec 으로 한다.
 * canvas.background 가 있으면 같이 맞춘다(둘이 다르면 엔진이 «background conflicts with canvas.background»로 던진다).
 * graph-1·elem-1 에는 바탕 rect 가 없어 손대지 않는다.
 */
export function withTransparentBackground(
  spec: DevAiFigureSpec,
): DevAiFigureSpec {
  if (spec.version !== 2) return spec;
  const { canvas } = spec;
  return {
    ...spec,
    background: "transparent",
    ...(canvas &&
    typeof canvas === "object" &&
    !Array.isArray(canvas) &&
    "background" in canvas
      ? { canvas: { ...canvas, background: "transparent" } }
      : {}),
  };
}
