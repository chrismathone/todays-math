import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * 시안 표본 — **손으로 고르지 않는다**(`scripts/qa/pick-glyph-size-samples.py` 가 낸다).
 *
 * 손으로 고르면 「가장 나쁜 실데이터」가 안 들어오고, 나쁜 것만 고르면 원장님이
 * 「전부 이렇구나」로 읽으신다. 그래서 생성기가 **나쁜 것 12 + 멀쩡한 것 4**
 * (음성 대조)를 뽑고, 나쁜 등급이 하나라도 표본에서 빠지면 **생성이 멈춘다.**
 */
export type GlyphSample = {
  grade: string;
  section: string;
  kind: string;
  tier: string;
  seed: number;
  viewBox: number;
  fontUnits: number;
  size: "compact" | "mid" | "wide" | "pair";
  screenPx: number;
  paperPx: number;
  svg: string;
};

export type GlyphPayload = {
  measuredOn: string;
  bodyPx: number;
  pxPerMm: number;
  frame: Record<string, { screenPx: number; paperMm: number }>;
  cuts: { compact: number; mid: number };
  totalSpecs: number;
  drawn: number;
  withText: number;
  belowBody: number;
  samples: GlyphSample[];
};

export const SAMPLES_PATH = path.join(
  process.cwd(),
  "src/app/dev/figure-glyph-size/samples.generated.json",
);

export function readSamples(): GlyphPayload | null {
  try {
    return JSON.parse(readFileSync(SAMPLES_PATH, "utf-8")) as GlyphPayload;
  } catch {
    return null;
  }
}

/**
 * 후보 넷. **지면 mm 만 바꾼다** — 그림을 다시 그리지 않는다.
 *
 * ⚠️ 「글자를 키운다」는 여기 없다. 그것은 **엔진을 고치는** 일이라 이 지면에서
 *    보여 드릴 수 없다(그리는 쪽을 바꿔야 한다). 여기서 정할 것은 **얼마나 크게
 *    싣는가**뿐이고, 그것으로 못 메우는 자리가 있으면 그때 엔진을 손댄다.
 */
export type Candidate = {
  id: string;
  label: string;
  note: string;
  /** 그 그림의 지면 폭(mm)을 준다. `null` 이면 현행 그대로. */
  mmFor: (s: GlyphSample, p: GlyphPayload) => number;
};

const frameMm = (s: GlyphSample, p: GlyphPayload) =>
  p.frame[s.size]?.paperMm ?? 64;

export const CANDIDATES: Candidate[] = [
  {
    id: "now",
    label: "현행",
    note: "등급 넷의 지면 폭 그대로 (37 · 64 · 70 · 97mm)",
    mmFor: frameMm,
  },
  {
    id: "consistent",
    label: "㉠ 화면과 지면의 배율을 맞춘다",
    note:
      "`wide` 가 화면 360px 인데 지면은 70mm 다. 이 저장소가 쓰는 배율(3.75px/mm)로는 " +
      "96mm 여야 한다 — 지금은 지면에서만 27% 작아진다. 다른 등급은 안 바뀐다.",
    mmFor: (s, p) =>
      s.size === "wide" ? Math.round(p.frame.wide!.screenPx / p.pxPerMm) : frameMm(s, p),
  },
  {
    id: "bodyFloor",
    label: "㉡ 그림 속 글자가 본문 이상이 되게 폭을 정한다",
    note:
      "폭으로 등급을 나누지 않고, **그 그림이 본문 크기를 지키려면 몇 mm 여야 하는가**를 " +
      "역산한다. 열 폭(97mm)을 넘으면 97mm 에서 멈춘다 — 그 위는 지면이 없다.",
    mmFor: (s, p) =>
      Math.min(97, Math.ceil((p.bodyPx * s.viewBox) / s.fontUnits / p.pxPerMm)),
  },
  {
    id: "bodyFloor90",
    label: "㉢ ㉡ 과 같되 본문의 90% 까지 봐준다",
    note:
      "㉡ 은 지면을 많이 쓴다. 「본문보다 조금 작아도 읽힌다」면 폭이 준다 — " +
      "얼마나 작아도 되는지는 **종이에서만** 정할 수 있다.",
    mmFor: (s, p) =>
      Math.min(97, Math.ceil((p.bodyPx * 0.9 * s.viewBox) / s.fontUnits / p.pxPerMm)),
  },
];

export function glyphPxAt(s: GlyphSample, mm: number, pxPerMm: number): number {
  return (s.fontUnits * (mm * pxPerMm)) / s.viewBox;
}
