import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { SrsWorkspaceView } from "@/components/fading/teacher/SrsWorkspaceView";
import { fadingCatalog } from "@/lib/fading/catalog";
import { buildTeacherWireFixture } from "@/components/fading/teacher/fixture";
import { createTeacherFixtureSource } from "@/components/fading/teacher/fixtureSource";
import { TeacherFadingStatus } from "@/components/fading/teacher/TeacherFadingStatus";

vi.mock("@/components/fading/FadingPreview", () => ({
  FadingPreview: () => <p>학생 미리 보기 표본</p>,
}));
afterEach(() => vi.unstubAllGlobals());
const fixture = buildTeacherWireFixture(fadingCatalog());
const previewData = {
  concepts: [],
  today: fixture.dashboard.today,
  traps: {},
  figures: {},
};
const legacy = <div data-testid="legacy-srs">기존 화면 글자 그대로</div>;
const setup = (fadingGate: "off" | "read" | "on") => {
  const source = createTeacherFixtureSource(fixture);
  const getDashboard = vi.fn(source.getDashboard);
  const preview = vi.fn(async () => previewData);
  const view = render(
    <SrsWorkspaceView
      fadingGate={fadingGate}
      legacy={legacy}
      source={{ ...source, getDashboard }}
      preview={preview}
    />,
  );
  return { ...view, getDashboard, preview };
};

describe("작업실 SRS 문과 탭", () => {
  it("StrictMode의 재실행에서도 첫 현황 요청은 하나다", async () => {
    const source = createTeacherFixtureSource(fixture);
    const getDashboard = vi.fn(source.getDashboard);
    render(
      <StrictMode>
        <SrsWorkspaceView
          fadingGate="on"
          legacy={legacy}
          source={{ ...source, getDashboard }}
          preview={previewData}
        />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "오늘의 기억" }));
    await screen.findByRole("heading", { name: "이도윤" });
    expect(getDashboard).toHaveBeenCalledTimes(1);
  });
  it("미리 보기를 누를 때만 인증된 데이터 경계에 조각마다 요청해 이어 붙인다", async () => {
    // 한 응답은 Vercel 함수 응답 한도를 넘는다 — 서버가 조각을 내고 화면이 붙인다.
    const fetcher = vi.fn(async (url: string) => {
      const shard = Number(new URL(url, "http://x").searchParams.get("shard"));
      return Response.json({
        ...previewData,
        cards: true,
        shard,
        shards: 2,
      });
    });
    vi.stubGlobal("fetch", fetcher);
    render(
      <SrsWorkspaceView
        fadingGate="on"
        legacy={legacy}
        source={createTeacherFixtureSource(fixture)}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "오늘의 기억" }));
    await screen.findByRole("heading", { name: "이도윤" });
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "미리 보기" }));
    await screen.findByText("학생 미리 보기 표본");
    expect(fetcher.mock.calls).toEqual(
      [0, 1].map((shard) => [
        `/api/math-srs/fading/preview?today=${fixture.dashboard.today}&shard=${shard}`,
        { cache: "no-store" },
      ]),
    );
  });
  it("off는 기존 내용만 그대로 그리며 새 요청·탭·은행 적재가 없다", () => {
    const { container, getDashboard, preview } = setup("off");
    expect(container.innerHTML).toBe(
      '<div data-testid="legacy-srs">기존 화면 글자 그대로</div>',
    );
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(getDashboard).not.toHaveBeenCalled();
    expect(preview).not.toHaveBeenCalled();
  });
  it("생략된 문도 off다", () => {
    render(<SrsWorkspaceView legacy={legacy} />);
    expect(screen.getByTestId("legacy-srs")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });
  it("read는 기존 것이 기본이며 오늘의 기억을 열 때 처음 읽는다", async () => {
    const { getDashboard, preview } = setup("read");
    expect(screen.getByRole("tab", { name: "기존 SRS 현황" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(getDashboard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "오늘의 기억" }));
    await screen.findByRole("heading", { name: "이도윤" });
    expect(getDashboard).toHaveBeenCalledTimes(1);
    expect(preview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "기존 SRS 현황" }));
    fireEvent.click(screen.getByRole("tab", { name: "오늘의 기억" }));
    expect(getDashboard).toHaveBeenCalledTimes(1);
  });
  it("on에서도 탐험 현황이 기본이며 개념 복습 현황은 필요할 때 읽는다", async () => {
    const { getDashboard } = setup("on");
    expect(screen.getByRole("tab", { name: "기존 SRS 현황" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(getDashboard).not.toHaveBeenCalled();
    expect(screen.getByTestId("legacy-srs")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "오늘의 기억" }));
    await screen.findByRole("heading", { name: "이도윤" });
    expect(getDashboard).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("legacy-srs")).not.toBeVisible();
  });
  it("방향키·Home·End로 탭과 초점을 바꾼다", async () => {
    setup("read");
    const first = screen.getByRole("tab", { name: "기존 SRS 현황" });
    const second = screen.getByRole("tab", { name: "오늘의 기억" });
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("tabindex", "0");
    await screen.findByRole("heading", { name: "이도윤" });
    fireEvent.keyDown(second, { key: "Home" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "End" });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: "ArrowLeft" });
    expect(first).toHaveFocus();
  });
  it("미리 보기 자료를 누를 때만 읽고 재진입에는 캐시를 쓴다", async () => {
    const { preview } = setup("on");
    fireEvent.click(screen.getByRole("tab", { name: "오늘의 기억" }));
    await screen.findByRole("heading", { name: "이도윤" });
    expect(preview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "미리 보기" }));
    await screen.findByText("학생 미리 보기 표본");
    expect(preview).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "학생 현황으로" }));
    fireEvent.click(screen.getByRole("button", { name: "미리 보기" }));
    await screen.findByText("학생 미리 보기 표본");
    expect(preview).toHaveBeenCalledTimes(1);
  });
  it("미리 보기 자료 실패는 다시 시도할 수 있다", async () => {
    const source = createTeacherFixtureSource(fixture);
    const preview = vi
      .fn()
      .mockRejectedValueOnce(new Error("chunk load failed"))
      .mockResolvedValue(previewData);
    render(<TeacherFadingStatus {...source} preview={preview} />);
    await screen.findByRole("heading", { name: "이도윤" });
    fireEvent.click(screen.getByRole("button", { name: "미리 보기" }));
    await screen.findByText("미리 보기 자료를 불러오지 못했습니다.");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await screen.findByText("학생 미리 보기 표본");
    expect(preview).toHaveBeenCalledTimes(2);
  });
});
