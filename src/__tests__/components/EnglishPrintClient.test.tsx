/**
 * 오늘의 영어 인쇄 미리보기 `EnglishPrintClient` (D-148 · 25 §5 · 브리프 english-print §3).
 * 학생용/교사용 전환 · 인쇄 단추 · 닫기 · 검토 상태 문구 · 쪽 나눔을 재기 전엔 인쇄가 눌리지 않는다.
 *
 * jsdom 은 크기를 모른다 — `useMeasuredPages.test` 처럼 `getClientRects`·`getBoundingClientRect` 를 흉내 내어
 * 측정이 끝나게 한다(«준비 중» → «인쇄하기»).
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ENGLISH_NOT_REVIEWED_NOTICE,
  EnglishPrintClient,
  parseEnglishPrintView,
} from "@/components/english/print/EnglishPrintClient";

import { SAMPLE_EXAM as EXAM, SAMPLE_SET } from "../fixtures/englishPrintSet";

function mockLayout(bodyHeight = 900, blockHeight = 100) {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {},
  ] as unknown as DOMRectList);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return {
        height: this.matches("[data-english-body]") ? bodyHeight : blockHeight,
      } as DOMRect;
    },
  );
}

beforeEach(() => {
  window.print = vi.fn();
  window.close = vi.fn();
  window.history.replaceState(null, "", "/english/sets/x/print");
});
afterEach(() => vi.restoreAllMocks());

describe("EnglishPrintClient", () => {
  it("학생용이 기본이고, 교사용으로 바꾸면 눌림 표시·지면 종류·주소가 같이 바뀐다", async () => {
    mockLayout();
    const user = userEvent.setup();
    const { container } = render(
      <EnglishPrintClient
        academyName="오늘의수학"
        exam={EXAM}
        set={SAMPLE_SET}
      />,
    );
    const student = screen.getByRole("button", { name: "학생용" });
    const teacher = screen.getByRole("button", { name: "교사용" });
    expect(student).toHaveAttribute("aria-pressed", "true");
    expect(teacher).toHaveAttribute("aria-pressed", "false");
    const gallery = screen.getByRole("region", { name: "지면 미리보기" });
    expect(
      gallery.querySelector('[data-page-kind="questions"]'),
    ).not.toBeNull();

    await user.click(teacher);
    expect(teacher).toHaveAttribute("aria-pressed", "true");
    expect(student).toHaveAttribute("aria-pressed", "false");
    expect(gallery.querySelector('[data-page-kind="answers"]')).not.toBeNull();
    expect(gallery.querySelector("[data-english-teacher-box]")).not.toBeNull();
    expect(window.location.search).toBe("?view=teacher");
    // 측정 틀은 화면 밖·보조기술에서 숨김 — 지면 묶음 밖에 하나
    expect(
      container.querySelectorAll('[aria-hidden="true"] [data-measure-items]'),
    ).toHaveLength(1);
  });

  it("`initialView` 가 교사용이면 교사용으로 시작한다 · `?view=` 읽기는 모르는 값을 학생용으로", () => {
    mockLayout();
    render(
      <EnglishPrintClient
        academyName="오늘의수학"
        exam={EXAM}
        initialView="teacher"
        set={SAMPLE_SET}
      />,
    );
    expect(screen.getByRole("button", { name: "교사용" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(parseEnglishPrintView("teacher")).toBe("teacher");
    expect(parseEnglishPrintView("student")).toBe("student");
    expect(parseEnglishPrintView(undefined)).toBe("student");
    expect(parseEnglishPrintView(["teacher"])).toBe("student");
  });

  it("쪽 나눔을 재기 전에는 «지면 준비 중»으로 눌리지 않고, 재고 나면 «인쇄하기» → window.print", async () => {
    mockLayout();
    const user = userEvent.setup();
    render(
      <EnglishPrintClient
        academyName="오늘의수학"
        exam={EXAM}
        set={SAMPLE_SET}
      />,
    );
    expect(screen.getByRole("button", { name: "지면 준비 중" })).toBeDisabled();
    const print = await screen.findByRole("button", { name: "인쇄하기" });
    expect(print).toBeEnabled();
    await user.click(print);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("🔴 크기를 아예 못 재면(측정 틀이 그려지지 않음) 인쇄 단추는 계속 잠겨 있다 — 한 쪽짜리 임시 지면이 종이로 나가지 않는다", async () => {
    // getClientRects 가 비어 있다 = 측정 틀이 배치되지 않았다(인쇄 매체·display:none)
    render(
      <EnglishPrintClient
        academyName="오늘의수학"
        exam={EXAM}
        set={SAMPLE_SET}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole("button", { name: "지면 준비 중" })).toBeDisabled();
    expect(
      screen.getByRole("region", { name: "지면 미리보기" }),
    ).toHaveAttribute("data-english-pages-ready", "false");
  });

  it("잰 높이대로 쪽이 나뉜다 — 본문 240px 에 블록 100px 씩이면 두 블록마다 한 쪽", async () => {
    // 블록 6 (문단 2 + 문항 4) · 간격 14 · 100+14+100 = 214 ≤ 240, 셋째는 328 > 240
    mockLayout(240, 100);
    render(
      <EnglishPrintClient
        academyName="오늘의수학"
        exam={EXAM}
        set={SAMPLE_SET}
      />,
    );
    await screen.findByRole("button", { name: "인쇄하기" });
    const gallery = screen.getByRole("region", { name: "지면 미리보기" });
    await waitFor(() =>
      expect(gallery.querySelectorAll("[data-print-page]")).toHaveLength(3),
    );
    expect(gallery.getAttribute("data-english-pages-ready")).toBe("true");
  });

  it("한 쪽보다 큰 블록은 도구 줄에 어느 것인지 알린다", async () => {
    mockLayout(240, 300);
    render(
      <EnglishPrintClient
        academyName="오늘의수학"
        exam={EXAM}
        set={SAMPLE_SET}
      />,
    );
    await screen.findByRole("button", { name: "인쇄하기" });
    const notice = await screen.findByText(
      /한 쪽보다 길어 지면에서 잘릴 수 있습니다/,
    );
    expect(notice.textContent).toContain("지문 1번째 문단");
    expect(notice.textContent).toContain("1번 문항");
  });

  it("«닫기»는 창을 닫는다", async () => {
    mockLayout();
    const user = userEvent.setup();
    render(
      <EnglishPrintClient
        academyName="오늘의수학"
        exam={EXAM}
        set={SAMPLE_SET}
      />,
    );
    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(window.close).toHaveBeenCalledTimes(1);
  });

  it("검토 완료가 아니면 도구 줄에 한 줄 — 검토 완료면 없다", () => {
    mockLayout();
    const draft = render(
      <EnglishPrintClient
        academyName="오늘의수학"
        exam={EXAM}
        set={{ ...SAMPLE_SET, status: "초안" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      ENGLISH_NOT_REVIEWED_NOTICE,
    );
    expect(ENGLISH_NOT_REVIEWED_NOTICE).toBe(
      "아직 검토 완료하지 않은 문제입니다.",
    );
    // 지면 머리에도 상태가 찍힌다 — 보이는 지면 묶음 안에서(숨은 측정 틀에도 같은 지면이 있다)
    expect(
      within(screen.getByRole("region", { name: "지면 미리보기" })).getByText(
        "학생용 · 초안",
      ),
    ).toBeInTheDocument();
    draft.unmount();
    render(
      <EnglishPrintClient
        academyName="오늘의수학"
        exam={EXAM}
        set={SAMPLE_SET}
      />,
    );
    expect(screen.queryByText(ENGLISH_NOT_REVIEWED_NOTICE)).toBeNull();
  });

  it("도구 줄 머리: 세트 제목 · «학교 학년 · 시험 · N문항» — 느낌표·이모지 없음(D-08)", () => {
    mockLayout();
    const { container } = render(
      <EnglishPrintClient
        academyName="오늘의수학"
        exam={EXAM}
        set={SAMPLE_SET}
      />,
    );
    // 도구 줄은 main 바로 아래 header — 지면 안 header(머리)와 가른다
    const toolbar = within(
      container.querySelector("main > header") as HTMLElement,
    );
    expect(
      toolbar.getByRole("heading", { level: 1, name: "2학기 중간 대비 1차" }),
    ).toBeInTheDocument();
    expect(
      toolbar.getByText("한빛중 중2 · 2학기 중간고사 · 4문항"),
    ).toBeInTheDocument();
    expect(container.querySelector("main > header")?.textContent).not.toMatch(
      /!|[\u{1F300}-\u{1FAFF}]/u,
    );
  });
});
