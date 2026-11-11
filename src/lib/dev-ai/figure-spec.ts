import { z } from "zod";
import { repairJsonString } from "@/lib/ai/jsonRepair";
import type { DevAiFigureSpec } from "./contracts";

export const MAX_FIGURE_SPEC_BYTES = 64 * 1024;

/**
 * 화면까지 보여도 되는 도형 재작도 사유(원장님 2026-09-19 — 운영에서 사유가 «AI 결과를 처리하지 못했습니다»(502)에
 * 가려져 왜 안 됐는지 몰랐다). 우리가 쓴 한국어 문장, 길이를 자른 모델 note, 엔진 검증 사유만 싣는다.
 * 상류 원문·키·내부 경로(파이썬 실행 파일 등)는 싣지 않는다 — 그런 실패는 일반 Error 로 남아 처리기가 가린다.
 */
export class FigureRedrawError extends Error {
  readonly status = 422;
  /**
   * 개발자용 원문(엔진 검증 사유 등, 트랙 45 2026-09-21) — 화면 문구(`message`)와 따로 싣는다.
   * 처리기가 서버 기록과 응답 `detail` 에 싣고, 작업실은 마우스 올림·콘솔로만 보인다.
   */
  readonly detail?: string;
  constructor(message: string, detail?: string) {
    super(message);
    this.name = "FigureRedrawError";
    if (detail) this.detail = detail.slice(0, 500);
  }
}
/** 오류 칸 한 줄에 들어가는 길이. */
export const FIGURE_REASON_MAX = 240;
/** 길이를 모르는 사유(모델 note·엔진 사유)를 한 줄로 자르고 «원본은 유지됩니다.»를 붙인다. */
export function figureReasonError(reason: string) {
  const tail = " 원본은 유지됩니다.";
  const text = reason.replace(/\s+/g, " ").trim();
  const room = FIGURE_REASON_MAX - tail.length;
  return new FigureRedrawError(
    (text.length > room ? `${text.slice(0, room - 1)}…` : text) + tail,
  );
}

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

/**
 * 글 사이에 든 마지막 `{"spec" …}` 덩어리 — 운영 2026-11-11: Claude Sonnet 5.5 가 고쳐 그리기에서 JSON 앞에 계산 과정을
 * 글로 길게 썼다(«I estimated pixel positions …» 뒤에 JSON). 따옴표 안의 괄호는 세지 않는다. 없으면 null.
 */
function lastSpecObject(raw: string): string | null {
  for (
    let start = raw.lastIndexOf("{");
    start >= 0;
    // `lastIndexOf("{", -1)` 은 맨 앞 `{` 를 다시 돌려준다 — 0 에서 멈춰야 끝난다(2026-11-11 무한 반복).
    start = start === 0 ? -1 : raw.lastIndexOf("{", start - 1)
  ) {
    if (!/^\{\s*"spec"\s*:/.test(raw.slice(start, start + 40))) continue;
    let depth = 0;
    let inString = false;
    for (let at = start; at < raw.length; at++) {
      const char = raw[at];
      if (inString) {
        if (char === "\\") at++;
        else if (char === '"') inString = false;
      } else if (char === '"') inString = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) return raw.slice(start, at + 1);
    }
  }
  return null;
}

export function parseFigureSpecResult(raw: string): {
  spec: DevAiFigureSpec | null;
  note: string;
  warnings: string[];
} {
  const invalid = () =>
    new FigureRedrawError(
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
      const embedded = lastSpecObject(raw);
      if (!embedded) throw invalid();
      try {
        json = JSON.parse(embedded);
      } catch {
        throw invalid();
      }
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
