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
