import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FadingCatalogScreen } from "@/components/fading/FadingCatalogScreen";
import { FadingStats } from "@/components/fading/FadingStats";
import type { FadingCatalog } from "@/contracts/fadingApi.contract";
import type { FadingConcept } from "@/lib/fading/concepts";
import { createLocalFadingSource } from "@/lib/fading/local";

vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) =>
    text.includes("$") ? <div>{text}</div> : <>{text}</>,
}));
afterEach(cleanup);

const concepts: FadingConcept[] = Array.from({ length: 8 }, (_, i) => ({
  id: `catalog-test-${i}`,
  section: i < 4 ? "중2::도형::삼각형" : "중2::도형::사각형",
  level: "중",
  ordinal: (i % 4) + 1,
  siblings: 4,
  propositions: [
    {
      id: `p-${i}`,
      term: `받은 용어 ${i}`,
      kind: "정의",
      pieces: [
        {
          kind: "target",
          target: { id: `t-${i}`, text: "받은 답", tier: "text" },
        },
      ],
    },
  ],
}));
function local() {
  return createLocalFadingSource({ concepts, today: "2026-10-06" });
}
function renderCatalog(
  catalog: FadingCatalog,
  onConcept = vi.fn(),
  busy = false,
) {
  const onGrade = vi.fn();
  render(
    <FadingCatalogScreen
      catalog={catalog}
      busy={busy}
      onGrade={onGrade}
      onConcept={onConcept}
    />,
  );
  return { onConcept, onGrade };
}

describe("목록·단원 — 받은 개념과 상태", () => {
  it.each([
    ["1-5-1 1cm보다 작은 단위", "1-5-1 · 1cm보다 작은 단위"],
    ["1-5-1 10 알아보기", "1-5-1 · 10 알아보기"],
    ["1-6-3 1cm²보다 더 큰 넓이의 단위", "1-6-3 · 1cm²보다 더 큰 넓이의 단위"],
  ])(
    "번호와 제목의 수량을 구분하고 수식으로 해석하지 않는다: %s",
    async (original, displayed) => {
      const catalog = await local().catalog();
      catalog.sections[0]!.chapter = "1-5 길이와 시간";
      catalog.sections[0]!.unit = original;
      const unchanged = structuredClone(catalog);
      renderCatalog(catalog);
      expect(
        screen.getByRole("heading", { name: displayed, level: 2 })
          .childElementCount,
      ).toBe(0);
      expect(
        screen
          .getAllByText("중2 · 1-5 · 길이와 시간")
          .every((element) => element.childElementCount === 0),
      ).toBe(true);
      fireEvent.click(
        screen.getAllByRole("button", { name: `${displayed} · 단원 보기` })[0]!,
      );
      expect(
        screen.getByRole("heading", { name: displayed, level: 1 })
          .childElementCount,
      ).toBe(0);
      expect(catalog).toEqual(unchanged);
    },
  );
  it("개념 제목은 소단원·난이도·순번이며 용어를 제목에서 반복하지 않는다", async () => {
    renderCatalog(await local().catalog());
    expect(
      screen.getByRole("heading", { name: "삼각형 · 중 · 1/4", level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "받은 용어 0" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("받은 용어 0")).toHaveLength(1);
    fireEvent.click(
      screen.getAllByRole("button", { name: /삼각형.*단원 보기/ })[0]!,
    );
    const row = screen.getByRole("button", {
      name: "중 · 1/4 · 받은 용어 0 · 개념 읽기",
    });
    expect(within(row).getByText("중 · 1/4")).toBeInTheDocument();
    expect(within(row).getByText("받은 용어 0")).toBeInTheDocument();
    const ladder = screen.getByRole("region", { name: "단계별 개념 수" });
    expect(
      within(ladder).getByText("지우지 않고 문장을 읽어요"),
    ).toBeInTheDocument();
    expect(
      within(ladder).getByText("핵심어를 빈칸으로 바꿔요"),
    ).toBeInTheDocument();
    expect(
      within(ladder).getByText("수식과 조건을 빈칸으로 바꿔요"),
    ).toBeInTheDocument();
    expect(
      within(ladder).getByText("모든 표적을 빈칸으로 바꿔요"),
    ).toBeInTheDocument();
  });
  it("수식 렌더러의 바깥 div가 p 안에 들어가지 않는다", async () => {
    const catalog = await local().catalog();
    catalog.sections[0]!.concepts[0]!.terms = ["$x^2$"];
    catalog.sections[0]!.chapter = "$x$의 도형";
    renderCatalog(catalog);
    expect(
      screen.getAllByText("$x^2$").every((element) => !element.closest("p")),
    ).toBe(true);
    fireEvent.click(
      screen.getAllByRole("button", { name: /삼각형.*단원 보기/ })[0]!,
    );
    expect(
      screen.getAllByText("$x^2$").every((element) => !element.closest("p")),
    ).toBe(true);
  });
  it("위험순은 받은 위험 큰 것·평가 전·고르기 전 차례이며 단원순은 은행 차례다", async () => {
    const catalog = await local().catalog();
    catalog.sections[1]!.concepts[0]!.status = {
      step: 2,
      rated: false,
      risk: null,
      dueOn: null,
      daysUntil: null,
    };
    catalog.sections[1]!.concepts[1]!.status = {
      step: 4,
      rated: true,
      risk: 0.2,
      dueOn: "2026-10-07",
      daysUntil: 1,
    };
    catalog.sections[1]!.concepts[2]!.status = {
      step: 3,
      rated: true,
      risk: 0.8,
      dueOn: "2026-10-06",
      daysUntil: 0,
    };
    const untouched = structuredClone(catalog);
    renderCatalog(catalog);
    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .slice(0, 3)
        .map((heading) => heading.textContent),
    ).toEqual(["사각형 · 중 · 3/4", "사각형 · 중 · 2/4", "사각형 · 중 · 1/4"]);
    fireEvent.click(screen.getByRole("button", { name: "단원순" }));
    expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent(
      "삼각형 · 중 · 1/4",
    );
    expect(catalog).toEqual(untouched);
    expect(document.body.textContent).not.toMatch(
      /MathSRS|보존율|마스터|오답률|클리닉|CSV|진단 테스트|나만의 덱/,
    );
  });
  it("개념 카드·위험 추정·복습일을 받은 값으로 그리고 단원 상세에서 개념을 연다", async () => {
    const source = local();
    const catalog = await source.catalog();
    catalog.sections[0]!.concepts[0]!.status = {
      step: 3,
      rated: true,
      risk: 0.426,
      dueOn: "2026-10-09",
      daysUntil: 3,
    };
    const { onConcept } = renderCatalog(catalog);
    expect(screen.getByText("43%")).toBeInTheDocument();
    expect(screen.getByText("망각 위험 (추정)")).toBeInTheDocument();
    expect(screen.getByText("3일 뒤 복습")).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: /삼각형.*단원 보기/ })[0]!,
    );
    const ladder = screen.getByRole("region", { name: "단계별 개념 수" });
    expect(within(ladder).getByText("1개")).toBeInTheDocument();
    expect(within(ladder).getAllByText("0개")).toHaveLength(3);
    fireEvent.click(
      screen.getByRole("button", {
        name: "중 · 1/4 · 받은 용어 0 · 개념 읽기",
      }),
    );
    expect(onConcept).toHaveBeenCalledWith("catalog-test-0");
  });
  it("검색은 일치하는 개념만 남기고 검색 결과 없음도 표시한다", async () => {
    renderCatalog(await local().catalog());
    fireEvent.change(
      screen.getByRole("searchbox", { name: "단원·개념 검색" }),
      { target: { value: "받은 용어 7" } },
    );
    expect(
      screen.getByRole("heading", { name: "사각형 · 중 · 4/4" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "삼각형 · 중 · 1/4" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "없는 낱말" },
    });
    expect(
      screen.getByRole("heading", { name: "찾은 개념이 없습니다" }),
    ).toBeInTheDocument();
  });
  it("학년 필터와 쪽 번호가 동작하고 busy 때 개념 열기를 막는다", async () => {
    const catalog = await local().catalog();
    catalog.grades.push("중3");
    const { onGrade } = renderCatalog(catalog, vi.fn(), true);
    expect(screen.getByRole("button", { name: "중3" })).toBeDisabled();
    expect(
      screen
        .getAllByRole("button", { name: /개념 읽기$/ })
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
    expect(onGrade).not.toHaveBeenCalled();
    cleanup();
    const active = renderCatalog(catalog);
    fireEvent.click(screen.getByRole("button", { name: "중3" }));
    expect(active.onGrade).toHaveBeenCalledWith("중3");
    fireEvent.click(screen.getByRole("button", { name: "2쪽" }));
    expect(
      screen.getByRole("heading", { name: "사각형 · 중 · 4/4" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "삼각형 · 중 · 1/4" }),
    ).not.toBeInTheDocument();
  });
});

describe("통계 — 기간 집계·기록 없음", () => {
  it("통계의 단원 번호를 빼기 식으로 해석하지 않는다", async () => {
    const state = await local().state();
    state.summary.sections = [
      {
        key: "초3::1-5 길이와 시간::1-5-1 1cm보다 작은 단위",
        picked: 1,
        learned: 0,
        stepCounts: { 1: 1, 2: 0, 3: 0, 4: 0 },
      },
    ];
    render(<FadingStats state={state} onCatalog={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "1-5-1 · 1cm보다 작은 단위" })
        .childElementCount,
    ).toBe(0);
    expect(screen.getByText("초3 · 1-5 · 길이와 시간").childElementCount).toBe(
      0,
    );
  });
  it("기간 안 집계만 더하며 passed를 정답률로 만들지 않는다", async () => {
    const state = await local().state();
    state.days = [
      { date: "2026-09-01", reviews: 50, passed: 49, fresh: 20 },
      { date: "2026-10-01", reviews: 11, passed: 8, fresh: 2 },
      { date: "2026-10-06", reviews: 3, passed: 1, fresh: 1 },
    ];
    render(<FadingStats state={state} onCatalog={vi.fn()} />);
    const metrics = screen.getByRole("region", { name: "기간 안 학습 집계" });
    expect(
      within(metrics).getByLabelText("평가로 닫은 풀이 14개"),
    ).toBeInTheDocument();
    expect(
      within(metrics).getByLabelText("다시가 아닌 평가 9개"),
    ).toBeInTheDocument();
    expect(
      within(metrics).getByLabelText("처음 배운 개념 3개"),
    ).toBeInTheDocument();
    expect(within(metrics).getByLabelText("학습한 날 2일")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "8주" }));
    expect(
      within(metrics).getByLabelText("평가로 닫은 풀이 64개"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/정답률|보존율|인출 속도|마스터|전환율|AI 처방/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "최근 28일 학습 기록" }).children,
    ).toHaveLength(28);
  });
  it("단원·단계 수는 summary 그대로이며 보존 퍼센트나 곡선은 없다", async () => {
    const state = await local().state();
    state.summary.stepCounts = { 1: 2, 2: 3, 3: 4, 4: 5 };
    state.summary.sections = [
      {
        key: "중2::도형::삼각형",
        picked: 14,
        learned: 9,
        stepCounts: state.summary.stepCounts,
      },
    ];
    render(<FadingStats state={state} onCatalog={vi.fn()} />);
    const units = screen.getByRole("region", { name: "단원별 개념 단계" });
    expect(within(units).getByText("고른 개념 14개")).toBeInTheDocument();
    expect(
      within(units).getByText("첫 평가를 마친 개념 9개"),
    ).toBeInTheDocument();
    expect(within(units).getByText("3단계 4개")).toBeInTheDocument();
    expect(units.textContent).not.toContain("%");
    expect(document.querySelector("svg path[data-curve]")).toBeNull();
  });
  it("기록 없음은 잠긴 네 지표·빈 그래프 안내·빈 단원 목록·첫 개념 시작을 낸다", async () => {
    const source = local();
    const state = await source.state();
    const onCatalog = vi.fn();
    render(<FadingStats state={state} onCatalog={onCatalog} />);
    expect(
      screen.getByRole("heading", { name: "아직 학습 기록이 없어요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("첫 풀이를 평가로 마치면 기록이 쌓여요"),
    ).toBeInTheDocument();
    expect(screen.getByText("아직 고른 단원이 없습니다")).toBeInTheDocument();
    expect(screen.getAllByLabelText("기록 없음")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "첫 개념 시작" }));
    expect(onCatalog).toHaveBeenCalledOnce();
    expect(await source.state()).toEqual(state);
  });
  it("최근 7일에 풀이가 없어도 이전 기록을 없다고 하지 않는다", async () => {
    const state = await local().state();
    state.days = [{ date: "2026-09-01", reviews: 3, passed: 2, fresh: 3 }];
    render(<FadingStats state={state} onCatalog={vi.fn()} />);
    expect(
      screen.queryByRole("heading", { name: "아직 학습 기록이 없어요" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("이 기간에는 마친 풀이가 없습니다"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("평가로 닫은 풀이 0개")).toBeInTheDocument();
  });
});
