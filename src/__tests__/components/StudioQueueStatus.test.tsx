import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudioQueueStatus from "@/components/unified/StudioQueueStatus";

type Props = Parameters<typeof StudioQueueStatus>[0];
type Job = Props["jobs"][number];

const job = (
  page: number,
  state: Job["state"],
  sourceId = "a",
  error?: string,
): Job => ({ key: `${sourceId}:${page}`, sourceId, page, state, error });

const oneSource = [{ id: "a", name: "1학기 기말.pdf" }];

function renderStatus(jobs: Job[], sources = oneSource) {
  const onNavigate = vi.fn();
  render(
    <StudioQueueStatus
      jobs={jobs}
      sources={sources}
      onCancel={() => {}}
      onRetry={() => {}}
      onNavigate={onNavigate}
    />,
  );
  return { onNavigate, list: () => screen.getByLabelText("쪽별 진행 목록") };
}

describe("쪽별 진행 나열 — 원장님 2026-09-20 «화살표 말고 쪽이 나열되면 좋겠네»", () => {
  it("펼치지 않아도 쪽과 상태가 바로 나열된다", () => {
    const { list } = renderStatus([
      job(1, "complete"),
      job(2, "complete"),
      job(3, "running"),
      job(4, "queued"),
      job(5, "error", "a", "응답 지연"),
    ]);
    // 접는 칸이 사라져야 «한눈에» 가 된다 — details 가 남아 있으면 여전히 펼쳐야 보인다.
    expect(document.querySelector("details")).toBeNull();
    expect(within(list()).getAllByRole("button")).toHaveLength(5);
    expect(
      within(list()).getByRole("button", { name: "1쪽 완료" }),
    ).toBeInTheDocument();
    expect(
      within(list()).getByRole("button", { name: "3쪽 인식 중" }),
    ).toBeInTheDocument();
    expect(
      within(list()).getByRole("button", { name: "5쪽 실패" }),
    ).toHaveAttribute("title", "응답 지연");
  });

  it("쪽을 누르면 그 쪽으로 이동한다", () => {
    const { onNavigate, list } = renderStatus([
      job(1, "complete"),
      job(2, "queued"),
    ]);
    fireEvent.click(within(list()).getByRole("button", { name: "2쪽 대기" }));
    expect(onNavigate).toHaveBeenCalledWith("a", 2);
  });

  it("파일이 여럿이면 파일 표시를 끼우고 이름으로도 가른다", () => {
    const { onNavigate, list } = renderStatus(
      [job(1, "complete", "a"), job(1, "queued", "b"), job(2, "queued", "b")],
      [
        { id: "a", name: "1학기 기말.pdf" },
        { id: "b", name: "2학기 중간.pdf" },
      ],
    );
    expect(within(list()).getByText("1번 파일")).toBeInTheDocument();
    expect(within(list()).getByText("2번 파일")).toBeInTheDocument();
    const second = within(list()).getByRole("button", {
      name: "2번 파일 · 1쪽 대기",
    });
    expect(second).toHaveAttribute("title", "2학기 중간.pdf");
    fireEvent.click(second);
    expect(onNavigate).toHaveBeenCalledWith("b", 1);
  });

  it("쪽이 많아도 한 줄 목록 하나에 담는다", () => {
    const jobs = Array.from({ length: 40 }, (_, index) =>
      job(index + 1, index < 20 ? "complete" : "queued"),
    );
    const { list } = renderStatus(jobs);
    // 줄이 터지는지는 브라우저가 판정한다(e2e/studio-ai/progress-strip.spec.ts).
    // 여기서는 «목록이 하나이고 40쪽이 모두 그 안에 있다»만 본다.
    expect(within(list()).getAllByRole("button")).toHaveLength(40);
    expect(screen.getAllByLabelText("쪽별 진행 목록")).toHaveLength(1);
  });
});
