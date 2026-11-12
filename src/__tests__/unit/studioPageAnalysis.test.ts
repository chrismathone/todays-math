import { describe, expect, it } from "vitest";
import {
  analyzeStudioPage,
  measurePageInk,
} from "@/components/unified/studioPageAnalysis";

function raster(pixels: number, value = 255) {
  const data = new Uint8ClampedArray(pixels * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }
  return data;
}
const analyze = (textLines: readonly string[], inkRatio = 0.02) =>
  analyzeStudioPage({ textLines, inkRatio, hasImagePaint: false });

describe("mixed or unknown PDF content", () => {
  it.each([true, undefined])(
    "retains cover-like text when image paint evidence is %s",
    (hasImagePaint) => {
      expect(
        analyzeStudioPage({
          textLines: ["문제지", "2학년", "유의 사항"],
          inkRatio: 0.005613,
          hasImagePaint,
        }),
      ).toBeUndefined();
    },
  );

  it.each([true, undefined])(
    "retains answer-key text when image paint evidence is %s",
    (hasImagePaint) => {
      expect(
        analyzeStudioPage({
          textLines: ["정답표", "1. ③", "2. ⑤"],
          inkRatio: 0.02,
          hasImagePaint,
        }),
      ).toBeUndefined();
    },
  );

  it.each([true, undefined])(
    "still judges text-free blanks by raster evidence when image paint evidence is %s",
    (hasImagePaint) => {
      expect(
        analyzeStudioPage({ textLines: [], inkRatio: 0, hasImagePaint }),
      ).toBe("빈 쪽");
      expect(
        analyzeStudioPage({ textLines: [], inkRatio: 0.03, hasImagePaint }),
      ).toBeUndefined();
    },
  );
});

describe("measurePageInk", () => {
  it("measures pixels rather than RGBA channels", () => {
    const data = raster(4);
    data.set([0, 0, 0, 255], 0);
    data.set([180, 180, 180, 255], 4);
    expect(measurePageInk(data)).toBe(0.5);
    expect(measurePageInk(raster(4))).toBe(0);
    expect(measurePageInk(raster(4, 0))).toBe(1);
  });

  it("composites transparency onto white and counts colored ink", () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 0, 0, 0, 0, 128, 255, 255, 0, 255, 255, 255, 255, 255,
    ]);
    expect(measurePageInk(data)).toBe(0.5);
  });

  it("counts thin faint strokes while tolerating almost-white raster backgrounds", () => {
    const data = raster(10_000, 254);
    data.set([245, 245, 245, 255], 0);
    expect(measurePageInk(data)).toBe(1 / 10_000);
    expect(analyze([], measurePageInk(data))).toBeUndefined();
    expect(analyze([], measurePageInk(raster(100, 254)))).toBe("빈 쪽");
  });

  it("does not turn absent or incomplete raster data into evidence of blankness", () => {
    expect(Number.isNaN(measurePageInk(new Uint8ClampedArray()))).toBe(true);
    expect(Number.isNaN(measurePageInk(new Uint8ClampedArray([255])))).toBe(
      true,
    );
    expect(
      analyze([], measurePageInk(new Uint8ClampedArray())),
    ).toBeUndefined();
  });
});

describe("conservative blank page detection", () => {
  it("excludes a white page with no visible text, including whitespace-only text", () => {
    expect(analyze([], 0)).toBe("빈 쪽");
    expect(analyze(["  ", "\t\r\n", "\u200b\uFEFF"], 0)).toBe("빈 쪽");
  });

  it("retains even a one-pixel stroke per million pixels at the threshold", () => {
    expect(analyze([], 0.000001)).toBeUndefined();
    expect(analyze([], 0.0000005)).toBe("빈 쪽");
  });

  it.each([NaN, Infinity, -Infinity, -1, 1.1])(
    "retains unknown/invalid ink measurement %s",
    (ink) => {
      expect(analyze([], ink)).toBeUndefined();
    },
  );

  it("retains text even if a raster happens to report zero ink", () => {
    expect(analyze(["삼각형 ABC"], 0)).toBeUndefined();
    expect(analyze(["1. 다음 값을 구하시오."], 0)).toBeUndefined();
  });

  it("cannot infer a cover or answer key from an ink-bearing scan without text", () => {
    expect(analyze([], 0.03)).toBeUndefined();
    expect(analyze(["   "], 0.002)).toBeUndefined();
  });
});

describe("conservative cover detection", () => {
  it("excludes explicit cover headings with only recognizable cover metadata", () => {
    expect(
      analyze([
        "2026학년도 2학기 기말고사",
        "수학 문제지",
        "수험생 유의 사항",
        "2학년 3반",
        "이름: __________",
        "시험 시간: 45분",
      ]),
    ).toBe("표지");
    expect(analyze(["답안지", "학교: ______", "학년: ___", "성명: ____"])).toBe(
      "표지",
    );
  });

  it.each([
    "1. 다음 값을 구하시오.",
    "01 다음 식을 계산하시오.",
    "01",
    "1)",
    "[서술형 1] 풀이를 쓰시오.",
    "서술형 1",
    "[서술형] 1.",
    "문제 1",
    "1번",
    "[1~3] 다음 물음에 답하시오.",
    "(1) 삼각형 ABC",
    "① 삼각형 ABC",
    "１． 다음 값을 구하시오.",
  ])(
    "preserves question-bearing pages under a cover heading: %s",
    (question) => {
      expect(analyze(["수학 문제지", question])).toBeUndefined();
    },
  );

  it("checks embedded line breaks and split descriptive question numbers", () => {
    expect(analyze(["유의 사항\n01\n삼각형 ABC"])).toBeUndefined();
    expect(analyze(["문제지", "[서술형", "1]", "삼각형 ABC"])).toBeUndefined();
  });

  it.each(["x² + 2x = 0", "2 × 3", "y < 3", "3/4 + 1/2", "삼각형의 넓이는?"])(
    "preserves unnumbered equations/prompts: %s",
    (question) => {
      expect(analyze(["문제지", question])).toBeUndefined();
    },
  );

  it("does not use isolated cover keywords to discard unknown body text", () => {
    expect(analyze(["문제지", "삼각형 ABC와 선분 DE"])).toBeUndefined();
    expect(
      analyze(["유의 사항을 읽고 답안지에 정답을 쓰시오."]),
    ).toBeUndefined();
    expect(analyze(["수학", "2학년 3반", "이름: ___"])).toBeUndefined();
  });
});

describe("conservative structured answer-table detection", () => {
  it.each([
    ["빠른 정답", "번호 정답", "01 ③", "02 ⑤", "03 ①"],
    ["정답 및 해설", "1. ③ 2. ⑤", "3. ② 4. ①"],
    ["해설", "문항 | 정답", "1 | 3", "2 | -2", "3 | 1/2"],
    ["정답표", "번호", "정답", "01", "③", "02", "⑤"],
    ["정답\n1. ③\n2. ⑤"],
  ])(
    "recognizes numbered keys only when the entire body is structured: %j",
    (...lines) => {
      expect(analyze(lines)).toBe("정답표");
    },
  );

  it.each([
    ["정답", "1. 정답을 고르시오.", "2. 알맞은 수를 쓰시오."],
    ["빠른 정답", "01 다음 중 옳은 것은?", "02 삼각형 ABC"],
    ["정답 및 해설", "1. ③", "2. ⑤", "다음 식의 값을 구하시오."],
    ["정답", "1.", "다음 중 옳은 것은?", "2. ⑤"],
    ["정답", "1. 2 + 3 =", "2. 4 + 1 ="],
    ["정답", "1. x = 3", "2. y = 2"],
    ["정답", "1. ③", "2. ⑤", "삼각형 ABC"],
    ["정답을 고르는 문제", "1. ③", "2. ⑤"],
    ["정답률", "1. ③", "2. ⑤"],
  ])(
    "preserves question wording, equations, and unrecognized content: %j",
    (...lines) => {
      expect(analyze(lines)).toBeUndefined();
    },
  );

  it("requires both an explicit heading and multiple consecutive answer entries", () => {
    expect(analyze(["1. ③", "2. ⑤"])).toBeUndefined();
    expect(analyze(["정답", "1. ③"])).toBeUndefined();
    expect(analyze(["정답", "1. ③", "1. ⑤"])).toBeUndefined();
    expect(analyze(["정답", "1. ③", "8. ⑤"])).toBeUndefined();
    expect(analyze(["정답"])).toBeUndefined();
    expect(analyze(["해설", "삼각형 ABC의 넓이"])).toBeUndefined();
  });
});
