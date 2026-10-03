/**
 * 🔴 **보기 그림의 짝도 «자가 재는 지면 == 제품이 찍는 지면»이어야 한다** (2026-10-03 3자 합의 B1 의 뒤처리).
 *
 * 제품(`ProblemContent`)은 `choiceFigureIndex` 를 알면 그림을 번호 칸 안에 넣는다 — 그림 여섯 장이
 * 발문 아래에 한 줄로 서던 지면이 «발문 그림 하나 + 2열 격자»가 되어 **높이가 달라진다.**
 * 탐침(`paperProbe` · `examPaperProbe`)이 그 칸을 안 넘기면 높이 캐시는 옛 지면을 재고,
 * 캐시 지문(`heightCacheManifest`)이 그 칸을 안 보면 짝만 바뀐 행이 **캐시에서 그대로 나온다.**
 * 2026-08-20 에 `figureSourceMm` 로 똑같이 갈렸다(`paperProbeParity.test.tsx` 머리말).
 *
 * 견주는 법: 탐침이 그린 문항 안에 **제품 함수가 짝을 알고 그린 본문**이 그대로 들어 있는가.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { renderExamItem } from "../../../scripts/qa/examPaperProbe";
import {
  measuredRowsHash,
  rowDigest,
} from "../../../scripts/qa/heightCacheManifest";
import { renderSlot } from "../../../scripts/qa/paperProbe";
import { ProblemContent } from "../../components/math/ProblemContent";
import { BANK_CHOICE_FIGURES } from "../fixtures/bankChoiceFigures";

/** 탐침은 `/` 로 시작하는 주소를 `file://` 로 바꾼다 — 견주기 쉽게 그 변환을 안 타는 주소로 둔다. */
const ROWS = BANK_CHOICE_FIGURES.map((row) => ({
  ...row,
  figureUrls: row.figureUrls.map((url) => url.slice(1)),
}));

function productBody(
  row: (typeof ROWS)[number],
  choiceFigureIndex: number[] | undefined,
): string {
  return renderToStaticMarkup(
    <ProblemContent
      className="problemText"
      content={row.content}
      deferFigures={false}
      figureDims={row.figureDims}
      figureSourceMm={row.figureSourceMm}
      figureUrls={row.figureUrls}
      choiceFigureIndex={choiceFigureIndex}
    />,
  );
}

describe("탐침이 보기 그림의 짝을 제품과 같게 그린다", () => {
  it("전제 — 짝을 알면 제품 지면이 실제로 달라진다(같으면 이 시험은 아무것도 못 문다)", () => {
    for (const row of ROWS)
      expect(productBody(row, row.choiceFigureIndex)).not.toBe(
        productBody(row, undefined),
      );
  });

  it("자습 탐침(`renderSlot`) — 짝을 안 지면을 그린다", () => {
    for (const row of ROWS) {
      const html = renderSlot(row, 1);
      expect(html, row.id).toContain(productBody(row, row.choiceFigureIndex));
    }
  });

  it("기출 탐침(`renderExamItem`) — 짝을 안 지면을 그린다", () => {
    for (const row of ROWS) {
      const html = renderExamItem({
        ...row,
        number: 1,
        questionType: "객관식",
        figureSvg: null,
      });
      expect(html, row.id).toContain(productBody(row, row.choiceFigureIndex));
    }
  });

  it("짝을 모르는 행은 예전 지면 그대로다", () => {
    for (const row of ROWS) {
      expect(
        renderSlot({ ...row, choiceFigureIndex: undefined }, 1),
        row.id,
      ).toContain(productBody(row, undefined));
    }
  });
});

describe("높이 캐시의 지문이 보기 그림의 짝을 본다", () => {
  const base = {
    id: "p1",
    content: "다음 중 알맞은 것은?\n① [그림]\n② [그림]",
    figureUrls: [] as string[],
    figureDims: [400, 300, 400, 300],
    figureSourceMm: [30, 30],
    questionType: "객관식",
  };

  it("짝이 생기거나 바뀌면 지문이 바뀐다 — 그 행은 다시 잰다", () => {
    const linked = { ...base, choiceFigureIndex: [1, 2] };
    expect(rowDigest(linked)).not.toBe(rowDigest(base));
    expect(rowDigest({ ...base, choiceFigureIndex: [2, 1] })).not.toBe(
      rowDigest(linked),
    );
    expect(measuredRowsHash([linked])).not.toBe(measuredRowsHash([base]));
  });

  it("🔴 짝이 없는 행의 지문은 예전과 같다 — 10만 행의 캐시를 버리지 않는다", () => {
    // 빈 배열은 «모른다»이고 칸이 없던 때와 같은 지면이다. 지문 입력에 넣지 않는다.
    expect(rowDigest({ ...base, choiceFigureIndex: [] })).toBe(rowDigest(base));
    expect(rowDigest({ ...base, choiceFigureIndex: null })).toBe(
      rowDigest(base),
    );
    expect(measuredRowsHash([{ ...base, choiceFigureIndex: [] }])).toBe(
      measuredRowsHash([base]),
    );
  });
});
