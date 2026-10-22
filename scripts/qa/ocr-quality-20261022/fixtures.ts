import sharp from "sharp";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
export interface Fixture {
  id: string;
  request: DevAiRequest;
  image: Buffer;
  stem?: string;
  count?: number;
  regions: number[][];
  forbidden: number[][];
  hold?: boolean;
  heldOut?: boolean;
}
const line = (x: number, y: number, s: string, size = 26) =>
  `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="black">${s}</text>`;
const document = (w: number, h: number, s: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="white"/>${s}</svg>`;
export async function fixtures(): Promise<Fixture[]> {
  const specs: {
    id: string;
    action: "ocr" | "page-ocr";
    source: string;
    stem?: string;
    count?: number;
    regions: number[][];
    forbidden?: number[][];
    hold?: boolean;
    heldOut?: boolean;
  }[] = [];
  for (const language of ["ko", "en"])
    for (const count of [4, 5]) {
      const stem =
        language === "ko" ? "18 + 27을 계산하시오." : "Calculate 18 + 27.";
      const options = ["① 35", "② 45", "③ 55", "④ 65", "⑤ 75"]
        .slice(0, count)
        .join("   ");
      specs.push({
        id: `ocr-${language}-${count}`,
        action: "ocr",
        source: document(
          1000,
          250,
          line(40, 70, `1. ${stem}`) + line(40, 160, options),
        ),
        stem,
        count,
        regions: [[20, 35, 950, 180]],
        hold: count === 4,
      });
      for (const defect of count === 4 ? ["cut-last"] : ["missing-middle"]) {
        const body =
          defect === "cut-last"
            ? line(40, 245, "⑤ 75")
            : line(40, 160, "① 35   ② 45   ④ 65   ⑤ 75");
        specs.push({
          id: `ocr-${language}-${defect}`,
          action: "ocr",
          source: document(
            1000,
            defect === "cut-last" ? 230 : 250,
            line(40, 70, `1. ${stem}`) +
              (defect === "cut-last" ? line(40, 160, options) : "") +
              body,
          ),
          stem,
          count: 4,
          regions: [[20, 35, 950, 180]],
          hold: true,
        });
      }
    }
  for (const language of ["ko", "en"])
    for (const count of [4, 5]) {
      const stem =
        language === "ko"
          ? `보기는 ${count}개입니다. 18 + 27을 계산하시오.`
          : `There are ${count} choices. Calculate 18 + 27.`;
      specs.push({
        id: `ocr-${language}-explicit-${count}`,
        action: "ocr",
        source: document(
          1100,
          250,
          line(40, 70, `1. ${stem}`) +
            line(
              40,
              160,
              ["① 35", "② 45", "③ 55", "④ 65", "⑤ 75"]
                .slice(0, count)
                .join("   "),
            ),
        ),
        stem,
        count,
        regions: [[20, 35, 1080, 180]],
        hold: count === 4,
        heldOut: true,
      });
    }
  const question = (x: number, y: number, n = 1) =>
    line(x, y, `${n}. Calculate 18 + 27.`) +
    line(x, y + 70, "① 35   ② 45   ③ 55", 23) +
    line(x, y + 135, "④ 65   ⑤ 75", 23);
  const add = (
    id: string,
    source: string,
    regions: number[][],
    forbidden: number[][] = [],
    heldOut = false,
  ) =>
    specs.push({ id, action: "page-ocr", source, regions, forbidden, heldOut });
  add("page-options-bottom", document(1000, 500, question(40, 335)), [
    [30, 300, 700, 480],
  ]);
  add("page-options-right", document(1000, 500, question(560, 90)), [
    [550, 55, 990, 245],
  ]);
  add(
    "page-answer-line",
    document(
      1000,
      600,
      line(40, 90, "1. Calculate 6 x 7.") + line(40, 340, "Answer: __________"),
    ),
    [[30, 55, 700, 350]],
  );
  add(
    "page-two-columns",
    document(1000, 650, question(30, 100) + question(550, 100, 2)),
    [
      [20, 65, 480, 245],
      [540, 65, 990, 245],
    ],
  );
  add(
    "page-sparse",
    document(
      1000,
      1200,
      line(50, 90, "1. Find x.") + line(50, 930, "x + 3 = 8"),
    ),
    [[40, 55, 700, 940]],
  );
  add("page-blank", document(1000, 600, ""), []);
  add(
    "page-adjacent-key",
    document(1000, 650, question(40, 100) + line(40, 450, "Answer key: 1. 45")),
    [[30, 65, 700, 245]],
    [[30, 410, 700, 460]],
  );
  add(
    "page-neighbor",
    document(1000, 650, question(40, 90) + question(40, 360, 2)),
    [
      [30, 55, 700, 235],
      [30, 325, 700, 505],
    ],
  );
  // Held-out geometry is authored before any live output is read; it is captured only after the fix freezes.
  add(
    "heldout-narrow-columns",
    document(1200, 700, question(35, 120) + question(675, 320, 2)),
    [
      [25, 85, 500, 265],
      [665, 285, 1180, 465],
    ],
    [],
    true,
  );
  add(
    "heldout-key-side",
    document(
      1200,
      700,
      question(35, 120) + line(720, 180, "Answer key: 1. 45"),
    ),
    [[25, 85, 550, 265]],
    [[710, 140, 1190, 190]],
    true,
  );
  add("heldout-blank", document(800, 1100, ""), [], [], true);
  add(
    "heldout-bottom-line",
    document(
      800,
      800,
      line(30, 80, "1. Find the sum.") + line(30, 790, "Answer: __________"),
    ),
    [[20, 45, 700, 799]],
    [],
    true,
  );
  const result: Fixture[] = [];
  for (const s of specs) {
    const image = await sharp(Buffer.from(s.source)).png().toBuffer();
    result.push({
      ...s,
      forbidden: s.forbidden ?? [],
      image,
      request: {
        provider: "claude",
        action: s.action,
        grade: "초3",
        sourceName: `authored-${s.id}.png`,
        imageDataUrl: `data:image/png;base64,${image.toString("base64")}`,
      },
    });
  }
  return result;
}
