import { describe, expect, it } from "vitest";
import {
  studioCropDigitized,
  studioDeleteWarning,
  studioFigureLabel,
  studioFigureProgressDetail,
  visibleStudioWarnings,
  type StudioCrop,
} from "@/components/unified/studioHelpers";

function crop(id: string, figureIds: string[] = []): StudioCrop {
  return {
    id,
    sourceId: "s1",
    sourceLabel: "예제",
    page: 1,
    rect: { x: 0, y: 0, width: 1, height: 1 },
    image: "data:image/png;base64,YQ==",
    figures: figureIds.map((figureId) => ({
      id: figureId,
      rect: { x: 0, y: 0, width: 1, height: 1 },
      image: "data:image/png;base64,YQ==",
    })),
    content: "",
    answer: "",
    solution: "",
    level: "secondary",
    grade: "중2",
    mode: "image",
    added: false,
  };
}

/** 2026-09-19 원장님 작업실 피드백(트랙 1)의 판정 함수들 — 화면 여러 곳이 같은 기준을 쓴다. */
describe("8 · 옛 «원본 대조 확인 필요» 멘트", () => {
  it("저장된 초안에 남은 원본 대조 멘트만 거르고 나머지 경고는 그대로 둔다", () => {
    expect(
      visibleStudioWarnings([
        "원본 대조 확인 필요: 각의 크기가 다릅니다.",
        "보기 5번을 확인해 주세요.",
        "원본 대조 확인 필요",
        "  원본 대조 확인 필요: 앞 공백",
      ]),
    ).toEqual(["보기 5번을 확인해 주세요."]);
  });
  it("경고가 없으면 빈 목록", () => {
    expect(visibleStudioWarnings(undefined)).toEqual([]);
  });
});

describe("3 · 도형 번호 «문제번호-순번»", () => {
  it("문제 번호와 그 문제 안 순번을 잇는다", () => {
    expect(studioFigureLabel(9, 0)).toBe("도형 9-1");
    expect(studioFigureLabel(11, 2)).toBe("도형 11-3");
  });

  // 문제 1(도형 a) · 문제 2(없음) · 문제 3(도형 b, c) — 번호는 목록 차례이지 도형 차례가 아니다.
  const crops = [crop("p1", ["a"]), crop("p2"), crop("p3", ["b", "c"])];
  const job = (cropId: string, figureId: string, state: string) => ({
    cropId,
    figureId,
    state,
  });

  it("생성 중인 도형의 번호를 적고 대기 수를 잇는다", () => {
    expect(
      studioFigureProgressDetail(
        crops,
        [
          job("p3", "c", "running"),
          job("p1", "a", "running"),
          job("p3", "b", "queued"),
        ],
        0,
      ),
    ).toBe("도형 1-1, 3-2 생성 중 · 1개 대기");
  });
  it("하나만 돌고 대기가 없으면 번호만", () => {
    expect(
      studioFigureProgressDetail(crops, [job("p3", "b", "running")], 0),
    ).toBe("도형 3-1 생성 중");
  });
  it("아직 도는 것이 없으면 대기 수만", () => {
    expect(
      studioFigureProgressDetail(
        crops,
        [job("p1", "a", "queued"), job("p3", "b", "queued")],
        0,
      ),
    ).toBe("2개 대기");
  });
  it("실패 꼬리는 그대로 붙인다", () => {
    expect(
      studioFigureProgressDetail(crops, [job("p1", "a", "running")], 2),
    ).toBe("도형 1-1 생성 중 · 실패 2개");
  });
  it("지워진 도형의 작업은 번호를 지어내지 않는다", () => {
    expect(
      studioFigureProgressDetail(
        crops,
        [job("p1", "gone", "running"), job("p3", "c", "queued")],
        0,
      ),
    ).toBe("1개 대기");
  });
});

describe("4 · 결과가 있는 크롭 삭제 경고", () => {
  const withSvg = (item: StudioCrop, ...ids: string[]) => ({
    ...item,
    figures: item.figures?.map((figure) =>
      ids.includes(figure.id) ? { ...figure, svg: "<svg/>" } : figure,
    ),
  });
  it("결과가 없으면 묻지 않는다", () => {
    const crops = [crop("p1", ["a"])];
    expect(studioDeleteWarning(crops, "p1")).toBeNull();
    expect(studioDeleteWarning(crops, "a")).toBeNull();
    expect(studioDeleteWarning(crops, "missing")).toBeNull();
  });
  it("문제 크롭은 문자 인식이나 그 문제 도형 SVG 하나라도 있으면 묻는다", () => {
    const read = { ...crop("p1", ["a"]), content: "넓이를 구하시오." };
    expect(studioDeleteWarning([crop("p0"), read], "p1")).toBe(
      "문제 2에는 인식 결과가 있습니다. 삭제하면 문자 인식 결과도 함께 지워집니다. 삭제할까요?",
    );
    expect(
      studioDeleteWarning([withSvg(crop("p1", ["a", "b"]), "b")], "p1"),
    ).toBe(
      "문제 1에는 인식 결과가 있습니다. 삭제하면 SVG 도형 결과도 함께 지워집니다. 삭제할까요?",
    );
    expect(studioDeleteWarning([withSvg(read, "a")], "p1")).toBe(
      "문제 1에는 인식 결과가 있습니다. 삭제하면 문자 인식과 SVG 도형 결과도 함께 지워집니다. 삭제할까요?",
    );
    expect(
      studioDeleteWarning([{ ...crop("p1"), content: "  \n " }], "p1"),
    ).toBeNull();
  });
  it("도형 크롭은 그 도형에 SVG 가 있을 때만 묻고, 번호에 맞는 조사를 쓴다", () => {
    const crops = [withSvg(crop("p1", ["a", "b"]), "a", "b")];
    expect(studioDeleteWarning(crops, "a")).toBe(
      "도형 1-1은 SVG 생성이 끝났습니다. 삭제하면 생성 결과도 지워집니다. 삭제할까요?",
    );
    expect(studioDeleteWarning(crops, "b")).toBe(
      "도형 1-2는 SVG 생성이 끝났습니다. 삭제하면 생성 결과도 지워집니다. 삭제할까요?",
    );
    // 문제에 문자 인식이 있어도 SVG 없는 도형 하나를 지우는 것은 묻지 않는다.
    expect(
      studioDeleteWarning([{ ...crop("p1", ["a"]), content: "본문" }], "a"),
    ).toBeNull();
  });
});

describe("5 · 완료 기준", () => {
  it("문자 인식 + 그 문제 도형 SVG 전부일 때만 끝난 문제", () => {
    const read = { ...crop("p1", ["a", "b"]), content: "본문" };
    expect(studioCropDigitized(read)).toBe(false);
    expect(
      studioCropDigitized({
        ...read,
        figures: read.figures!.map((figure) => ({ ...figure, svg: "<svg/>" })),
      }),
    ).toBe(true);
    expect(studioCropDigitized({ ...crop("p1"), content: "본문" })).toBe(true);
    expect(studioCropDigitized(crop("p1"))).toBe(false);
  });
});
