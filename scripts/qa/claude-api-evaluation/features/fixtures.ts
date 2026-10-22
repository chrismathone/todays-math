/** Author tiny original fixtures, rasterize locally, and freeze exact expectations. */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import { saveImmutable, sha } from "./transport";

const line = (x: number, y: number, s: string, size = 32) =>
  `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="black">${s}</text>`;
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
const question =
  line(55, 90, "1. Calculate 18 + 27.") +
  line(55, 160, "① 35     ② 45     ③ 55     ④ 65");
const triangleBody =
  '<path d="M180 380 L580 380 L180 80 Z" fill="none" stroke="black" stroke-width="4"/>' +
  '<path d="M180 356 L204 356 L204 380" fill="none" stroke="black" stroke-width="3"/>' +
  line(145, 415, "A") +
  line(590, 415, "B") +
  line(140, 70, "C") +
  line(345, 425, "4 cm") +
  line(80, 240, "3 cm");
export const ENGLISH_LINES = [
  "A Small Garden",
  "Mina planted 12 seeds on Monday.",
  "She watered them every morning.",
  "After seven days, 9 seeds had grown.",
  "1. How many seeds did Mina plant?",
  "(A) 7    (B) 9    (C) 12    (D) 21",
  "Answer: (C)",
];
export const SOLUTION_TEXT =
  "가로가 8 cm, 세로가 5 cm인 직사각형의 둘레를 구하시오. 단위는 cm로 쓰시오.";
export interface FeatureCase {
  id: string;
  request?: DevAiRequest;
  image: Buffer;
  imageSha256: string;
  expected: Record<string, unknown>;
}
export async function createFixtures(): Promise<FeatureCase[]> {
  const sources: Record<string, string> = {
    ocr: svg(1000, 260, question),
    "page-ocr": svg(
      1000,
      900,
      line(55, 65, "Original practice sheet", 26) +
        `<g transform="translate(0,80)">${question}</g>` +
        line(55, 470, "2. Calculate 6 x 7.") +
        line(55, 540, "Answer: __________"),
    ),
    figures: svg(
      1000,
      720,
      line(45, 60, "Find the area of triangle ABC.") +
        `<g transform="translate(80,160)">${triangleBody}</g>`,
    ),
    "figure-redraw": svg(760, 500, triangleBody),
    "figure-edit": svg(
      600,
      400,
      '<path d="M100 300 L480 300" stroke="black" stroke-width="4"/>' +
        line(85, 345, "A") +
        line(470, 345, "B") +
        line(270, 280, "4 cm"),
    ),
    solution: svg(
      1000,
      300,
      line(40, 90, "A rectangle is 8 cm long and 5 cm wide.") +
        line(40, 160, "Find its perimeter in cm."),
    ),
    "english-photo-read": svg(
      1300,
      650,
      ENGLISH_LINES.map((s, i) => line(55, 65 + i * 78, s, 34)).join(""),
    ),
  };
  const cases: FeatureCase[] = [];
  for (const [id, source] of Object.entries(sources)) {
    const image = await sharp(Buffer.from(source)).png().toBuffer();
    saveImmutable(`inputs/${id}.svg`, source);
    saveImmutable(`inputs/${id}.png`, image);
    const request: DevAiRequest = {
      provider: "claude",
      action:
        id === "english-photo-read" ? "ocr" : (id as DevAiRequest["action"]),
      grade: "초3",
      imageDataUrl: `data:image/png;base64,${image.toString("base64")}`,
      sourceName: `authored-${id}.png`,
    };
    let expected: Record<string, unknown>;
    switch (id) {
      case "ocr":
        expected = {
          stem: "Calculate 18 + 27.",
          choices: ["35", "45", "55", "65"],
          answer: "",
          solution: "",
          questionType: "multiple-choice",
        };
        break;
      case "page-ocr":
        expected = {
          count: 2,
          numbers: [1, 2],
          contentIfReturned: ["18 + 27", "6 x 7"],
          printedAnswers: false,
          grade: "no explicit grade evidence",
          regions: [
            [45, 100, 820, 300],
            [45, 450, 820, 560],
          ],
          detectionOnlyAccepted: true,
        };
        break;
      case "figures":
        expected = {
          count: 1,
          insideFigurePixels: [
            [260, 540],
            [660, 540],
            [260, 240],
          ],
          excludedStemY: 60,
          includesLabels: ["A", "B", "C", "3 cm", "4 cm"],
        };
        break;
      case "figure-redraw":
        request.content =
          "원본의 직각삼각형 ABC를 그대로 다시 그리시오. A가 직각이고 AB=4 cm, AC=3 cm이다. 꼭짓점 A B C, 두 길이 표시, 직각 표시를 보존하시오.";
        expected = {
          vertices: ["A", "B", "C"],
          lengths: { AB: 4, AC: 3 },
          perpendicularAt: "A",
          labelSet: ["A", "B", "C", "4 cm", "3 cm"],
          strictRender: true,
          reviewMustPass: true,
        };
        break;
      case "figure-edit":
        request.content =
          "3번 글자 요소의 4 cm를 7 cm로만 바꾸세요. 다른 요소, 위치, 크기는 바꾸지 마세요.";
        request.figure = {
          viewBox: [0, 0, 600, 400],
          elements: [
            {
              n: 1,
              kind: "선분",
              points: [
                [100, 300],
                [480, 300],
              ],
            },
            { n: 2, kind: "글자", text: "A", points: [[85, 345]] },
            { n: 3, kind: "글자", text: "4 cm", points: [[270, 280]] },
            { n: 4, kind: "글자", text: "B", points: [[470, 345]] },
          ],
          names: [
            { name: "A", x: 100, y: 300 },
            { name: "B", x: 480, y: 300 },
          ],
        };
        expected = {
          commands: [{ op: "text", target: 3, text: "7 cm" }],
          originalOtherElementsUnchanged: true,
        };
        break;
      case "solution":
        request.content = SOLUTION_TEXT;
        expected = {
          answerCm: 2 * (8 + 5),
          inputs: { width: 8, height: 5 },
          calculation: "2*(8+5)=26",
          noAreaConfusion: true,
        };
        break;
      default:
        expected = {
          exactLines: ENGLISH_LINES,
          whitespaceOnlyNormalization: true,
          includesPrintedAnswer: true,
        };
    }
    const item = {
      id,
      ...(id === "english-photo-read" ? {} : { request }),
      image,
      imageSha256: sha(image),
      expected,
    };
    saveImmutable(
      `inputs/${id}.json`,
      JSON.stringify(
        { id, request: item.request, imageSha256: item.imageSha256, expected },
        null,
        2,
      ),
    );
    cases.push(item);
  }
  cases.push(await createKoreanControl());
  return cases;
}

/** Extra same-feature control requested by API owner; originals stay byte-identical. */
async function createKoreanControl(): Promise<FeatureCase> {
  const id = "ocr-ko-control";
  const fontfile = path.resolve(
    "public/textbook/editorial/fonts/NotoSansKR-400.ttf",
  );
  const lines = [
    "1. 다음을 계산하시오.",
    "18 + 27",
    "① 35     ② 40     ③ 45     ④ 50     ⑤ 55",
  ];
  const layers = [];
  for (let i = 0; i < lines.length; i++) {
    const input = await sharp({
      text: {
        text: lines[i],
        font: "Noto Sans KR 32",
        fontfile,
        dpi: 72,
        rgba: true,
      },
    })
      .png()
      .toBuffer();
    layers.push({ input, top: 45 + i * 85, left: 55 });
  }
  const image = await sharp({
    create: { width: 1000, height: 330, channels: 3, background: "white" },
  })
    .composite(layers)
    .png()
    .toBuffer();
  const expected = {
    stem: "다음을 계산하시오.",
    operands: [18, 27],
    choices: ["35", "40", "45", "50", "55"],
    answer: "",
    solution: "",
    questionType: "multiple-choice",
    noMissingChoiceWarning: true,
  };
  const request: DevAiRequest = {
    provider: "claude",
    action: "ocr",
    grade: "초3",
    imageDataUrl: `data:image/png;base64,${image.toString("base64")}`,
    sourceName: `authored-${id}.png`,
  };
  const imageSha256 = sha(image);
  saveImmutable(
    `inputs/${id}.source.json`,
    JSON.stringify(
      {
        author: "helper-original-control",
        lines,
        font: "Noto Sans KR 32",
        fontSha256: sha(fs.readFileSync(fontfile)),
        canvas: [1000, 330],
        positions: layers.map(({ left, top }) => [left, top]),
        requestedBy: "API owner ctx_a98101f18d8e, msg_1fc7284defa5",
      },
      null,
      2,
    ),
  );
  saveImmutable(`inputs/${id}.png`, image);
  saveImmutable(
    `inputs/${id}.json`,
    JSON.stringify({ id, request, imageSha256, expected }, null, 2),
  );
  return { id, request, image, imageSha256, expected };
}
