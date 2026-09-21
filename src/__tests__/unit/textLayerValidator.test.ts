import { describe, expect, it } from "vitest";
import {
  assembleOcrText,
  validateOcrAgainstTextLayer,
} from "@/lib/mathgen/textLayerValidator";

// 머리글(학교·학년·시험 이름)과 둘째 문제는 안 잘렸고, 첫 문제만 잘려 읽혔다.
const layer =
  "2024학년도 경신중학교 2학년 기말고사 수학 이름 " +
  "1. 이등변삼각형 ABC 에서 꼭짓점 대각선 길이를 구하시오 " +
  "2. 평행사변형 넓이는 얼마인가";
const ocr = "이등변삼각형 ABC 에서 꼭짓점 대각선 길이를 구하시오";

describe("validateOcrAgainstTextLayer — 셈은 그대로", () => {
  it("쪽 전체 PDF 낱말(한글 두 자+, 세 자리+ 수) 중 인식 결과에 있는 비율을 센다", () => {
    const warning = validateOcrAgainstTextLayer(ocr, layer)!;
    expect(warning.total).toBe(16);
    expect(warning.matched).toBe(6);
    expect(warning.score).toBeCloseTo(6 / 16);
    // 긴 낱말부터 — 변별력이 큰 낱말이 앞에 온다.
    expect(warning.missingSample).toEqual([
      "경신중학교",
      "평행사변형",
      "기말고사",
      "얼마인가",
      "2024",
      "학년도",
      "넓이는",
      "학년",
      "수학",
      "이름",
    ]);
  });

  it("문턱(0.6)·신호 부족(낱말 10개 미만)·빈 글자 층은 전과 같다", () => {
    expect(validateOcrAgainstTextLayer(layer, layer)).toBeNull();
    expect(validateOcrAgainstTextLayer("", layer)).toBeNull();
    expect(validateOcrAgainstTextLayer(ocr, "")).toBeNull();
    expect(
      validateOcrAgainstTextLayer("가나", "경신중학교 기말고사 학년"),
    ).toBeNull();
    // 16개 중 10개 = 62.5% — 문턱 위라 경고하지 않는다.
    expect(
      validateOcrAgainstTextLayer(
        `${ocr} 평행사변형 넓이는 얼마인가 기말고사`,
        layer,
      ),
    ).toBeNull();
  });
});

describe("경고 문구 — 원장님 2026-09-21 «크롭만 떴는데 왜 이 경고가 떴을까?»", () => {
  it("무엇과 무엇을 견줬는지 한 줄에 — PDF 원문 낱말 대비 인식 결과, 자른 영역 밖도 셈에 든다", () => {
    const warning = validateOcrAgainstTextLayer(ocr, layer)!;
    expect(warning.summary).toBe(
      "PDF 원문 낱말 중 38%만 인식 결과에 있음 (자른 영역 밖 머리글·문제 포함)",
    );
    // «본문 누락 의심 (검토 권장)» 은 원장님이 «내가 뭘 잘못했나» 로 읽으셨다.
    expect(warning.summary).not.toMatch(/누락 의심|검토 권장|OCR/);
  });

  it("자세한 설명은 셈과 크롭 밖 글자가 셈에 드는 까닭을 적는다", () => {
    const warning = validateOcrAgainstTextLayer(ocr, layer)!;
    expect(warning.detail).toContain("16개 중 6개");
    expect(warning.detail).toContain("머리글");
    expect(warning.detail).toContain("자르지 않은 문제");
    expect(warning.detail).not.toMatch(/\*|born-digital/);
  });
});

describe("assembleOcrText", () => {
  it("본문·보기·정답을 줄로 잇는다", () => {
    expect(
      assembleOcrText([
        { text: "본문", choices: ["가", { text: "나" }], answer: "3" },
        { text: "둘째" },
      ]),
    ).toBe("본문\n가\n나\n3\n둘째");
  });
});
