import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  STYLE_CANDIDATES,
  styleCandidatePages,
} from "@/app/dev/exam-report-styles/candidates";
import {
  STYLE_SCENARIOS,
  styleFixture,
  PREVIEW_HEADER,
  PREVIEW_FOOTER,
} from "@/app/dev/exam-report-styles/fixtures";
import { REPORT_BLOCK_PRESETS } from "@/lib/examReport/blocks";

const CASES = (
  Object.keys(REPORT_BLOCK_PRESETS) as (keyof typeof REPORT_BLOCK_PRESETS)[]
).flatMap((composition) =>
  (Object.keys(STYLE_SCENARIOS) as (keyof typeof STYLE_SCENARIOS)[]).map(
    (scenario) => [composition, scenario] as const,
  ),
);

describe.each(STYLE_CANDIDATES)("$id $name 정적 지면", ({ id }) => {
  it.each(CASES)(
    "%s / %s · 블록의 실제 내용·쪽 경계·정적 결과",
    (composition, scenario) => {
      const { report, average } = styleFixture(scenario);
      const options = {
        blocks: REPORT_BLOCK_PRESETS[composition],
        header: PREVIEW_HEADER,
        footer: PREVIEW_FOOTER,
        average,
      };
      const pages = styleCandidatePages(id, report, options);
      const html = renderToStaticMarkup(<>{pages}</>);
      expect(html.match(/data-unified-paper=/g)).toHaveLength(pages.length);
      expect(html.match(/data-print-page=/g)).toHaveLength(pages.length);
      expect(html).toContain(report.student.name);
      expect(html).toContain(report.publication.title);
      expect(html).not.toMatch(/<(script|button|nav)/);
      if (report.status === "graded") expect(html).toContain("100점 만점");
      else expect(html).toContain(scenario === "absent" ? "결시" : "미채점");
      expect(html.includes("data-exam-report-trend")).toBe(
        composition !== "numbers" && scenario !== "oneHistory",
      );
      expect(
        [...html.matchAll(/data-solution-no="(\d+)"/g)].map((m) =>
          Number(m[1]),
        ),
      ).toEqual([]);
      const root = document.createElement("div");
      root.innerHTML = html;
      const expectedScores = {
        normal: 80,
        wrong10: 50,
        wrong16: 20,
        zero: 0,
        perfect: 100,
        noNote: 80,
        long: 80,
        unweighted: 80,
        points85: 82,
        oneHistory: 80,
        gapHistory: 80,
      };
      const scoreNode = root.querySelector('[data-report-block="score"]');
      expect(scoreNode?.querySelector("strong")?.textContent).toBe(
        report.status === "graded"
          ? `${expectedScores[scenario as keyof typeof expectedScores]}점`
          : scenario === "absent"
            ? "결시"
            : "미채점",
      );
      if (scenario === "unweighted")
        expect(scoreNode?.textContent).toContain("20문항 중 16문항");
      if (scenario === "points85")
        expect(scoreNode?.textContent).toContain("85점 중 70점");
      expect(html).not.toMatch(/단원별 정답률|성취 지수|백분위|석차/);
      const wrongs = [
        ...root.querySelectorAll(
          '[data-report-block="wrongTable"] [data-wrong-table-no], [data-report-block="wrongTable"] [data-mark-no]',
        ),
      ].map((node) =>
        Number(
          node.getAttribute("data-wrong-table-no") ??
            node.getAttribute("data-mark-no"),
        ),
      );
      expect(wrongs).toEqual(
        composition !== "numbers" && report.status === "graded"
          ? report.wrongQuestions.map((q) => q.no)
          : [],
      );
      expect(html).toBe(
        renderToStaticMarkup(<>{styleCandidatePages(id, report, options)}</>),
      );
    },
  );
  it("구성에 지정한 순서를 지키며 고르지 않은 블록을 더하지 않는다", () => {
    const { report } = styleFixture("normal");
    const html = renderToStaticMarkup(
      <>
        {styleCandidatePages(id, report, {
          blocks: ["teacherNote", "score", "correctCount"],
          trend: false,
        })}
      </>,
    );
    expect(
      [...html.matchAll(/data-report-block="([^"]+)"/g)].map((m) => m[1]),
    ).toEqual(["teacherNote", "score", "correctCount"]);
    expect(html).not.toContain("data-exam-report-trend");
    expect(html).not.toContain("data-solution-no");
  });
  it("문장 다음의 긴 오답 표도 행 전체를 이어서 같은 순서로 그린다", () => {
    const { report } = styleFixture("zero");
    report.teacherNote = "다시 볼 단원을 확인합니다.\n"
      .repeat(id === "newspaper" ? 50 : 25)
      .trim();
    const html = renderToStaticMarkup(
      <>
        {styleCandidatePages(id, report, {
          blocks: ["teacherNote", "wrongTable", "score"],
        })}
      </>,
    );
    const root = document.createElement("div");
    root.innerHTML = html;
    expect(
      root.querySelectorAll('[data-report-block="wrongTable"]'),
    ).toHaveLength(2);
    expect(
      root.querySelector(
        '[data-report-block="wrongTable"][data-continued="true"] h3',
      )?.textContent,
    ).toBe("틀린 문항 (이어서)");
    const rows = [
      ...root.querySelectorAll(
        '[data-report-block="wrongTable"] [data-wrong-table-no], [data-report-block="wrongTable"] [data-mark-no]',
      ),
    ];
    expect(
      rows.map((row) =>
        Number(
          row.getAttribute("data-wrong-table-no") ??
            row.getAttribute("data-mark-no"),
        ),
      ),
    ).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(
      root.querySelectorAll('[data-report-block="teacherNote"]'),
    ).toHaveLength(1);
    if (["H1", "letter", "grid", "ledger"].includes(id)) {
      const sheets = [...root.querySelectorAll("[data-exam-report-page]")];
      expect(
        sheets[0].querySelector('[data-report-block="score"]'),
      ).not.toBeNull();
      for (const sheet of sheets.slice(1))
        expect(
          [...sheet.querySelectorAll("[data-report-block]")].map((block) =>
            block.getAttribute("data-report-block"),
          ),
        ).toEqual(["wrongTable"]);
    } else
      expect(
        [...root.querySelectorAll("[data-report-block]")]
          .at(-1)
          ?.getAttribute("data-report-block"),
      ).toBe("score");
  });
});
