import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SimpleWire } from "./SimpleWire";
import {
  FORMATS,
  SCENARIOS,
  TIERS,
  outputReasons,
  questionsFor,
} from "./fixtures";

describe("시험지 만들기 간단하게 · Wire", () => {
  it("A–D의 두 장씩을 렌더하고 장면 이동 링크가 실제 장면을 가리킨다", () => {
    const { container } = render(<SimpleWire />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "시험지 만들기, 간단하게",
    );
    expect(container.querySelectorAll("[data-wire-option]")).toHaveLength(4);
    expect(container.querySelectorAll("[data-wire-screen]")).toHaveLength(8);
    for (const link of container.querySelectorAll<HTMLAnchorElement>(
      'a[href^="#"]',
    )) {
      expect(document.getElementById(link.hash.slice(1))).not.toBeNull();
    }
    for (const frame of container.querySelectorAll<HTMLElement>(
      "[data-wire-screen]",
    )) {
      expect(frame).not.toHaveTextContent(
        /보유\s*[\d,]+문항|출제 가능\s*67,893|70,368/,
      );
      expect(frame.querySelector('[aria-current="step"]')).not.toBeNull();
    }
    expect(container).not.toHaveTextContent("추천");
  });

  it("실제 길이 34~50개 픽스처에서 형식·난이도·차시별 수를 센다", () => {
    for (const scenario of SCENARIOS) {
      const questions = questionsFor(scenario);
      expect(questions.length).toBeGreaterThanOrEqual(34);
      expect(questions.length).toBeLessThanOrEqual(50);
      expect(scenario.requestedRows.reduce((a, b) => a + b, 0)).toBe(
        scenario.target,
      );
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
      expect(
        TIERS.map((tier) => questions.filter((q) => q.tier === tier).length),
      ).toEqual(scenario.tierCounts);
      expect(
        FORMATS.map(
          (format) => questions.filter((q) => q.format === format).length,
        ),
      ).toEqual(scenario.formatCounts);
    }
  });

  it("실제 차단 원인과 수정 행동을 다음 단추 곁에 두고 정상 상태도 구분한다", () => {
    const { container } = render(<SimpleWire />);
    for (const scenario of SCENARIOS) {
      const frame = container.querySelector<HTMLElement>(
        `[data-wire-screen="${scenario.id}-2"]`,
      )!;
      const footer = frame.querySelector<HTMLElement>("[data-output-status]")!;
      const blocked =
        outputReasons(scenario, questionsFor(scenario)).length > 0;
      expect(footer.dataset.outputStatus).toBe(blocked ? "blocked" : "ready");
      expect(
        within(footer)
          .getByText("다음: 양식 구성·출력 →")
          .getAttribute("aria-disabled"),
      ).toBe(blocked ? "true" : null);
    }
    expect(
      within(document.getElementById("reason-A")!).getByText(
        /40문항 지정 · 현재 34문항/,
      ),
    ).toBeVisible();
    expect(
      within(document.getElementById("reason-A")!).getByText("6문항 더 담기"),
    ).toBeVisible();
    const c = document.getElementById("reason-C")!;
    expect(c).toHaveTextContent("단답형 20문항 지정 · 현재 18문항");
    expect(c).toHaveTextContent("서술형 6문항 지정 · 현재 8문항");
    expect(document.getElementById("reason-D")).toHaveTextContent(
      "양식 구성·출력 권한이 없습니다",
    );
    const failed = screen.getByRole("heading", {
      name: "누른 뒤 확인 실패",
    }).parentElement!;
    expect(
      within(failed).getByText("다음: 양식 구성·출력 →"),
    ).not.toHaveAttribute("aria-disabled");
    expect(within(failed).getByText("다시 확인")).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("정답·해설은 처음 접히고 출처 대기는 네 안 모두 해당 목록 안에 있다", () => {
    const { container } = render(<SimpleWire />);
    const answers = screen.getAllByText("정답·해설 보기");
    expect(answers.length).toBeGreaterThan(8);
    for (const summary of answers)
      expect(summary.closest("details")).not.toHaveAttribute("open");
    expect(
      screen.getAllByText("교과서 목록을 불러오는 중입니다."),
    ).toHaveLength(4);
    expect(screen.getAllByText("범위를 불러오는 중입니다.")).toHaveLength(4);
    expect(screen.getAllByText("목록을 불러오지 못했습니다.")).toHaveLength(4);
    expect(
      container.querySelectorAll("button, input, select, form"),
    ).toHaveLength(0);
  });
});
