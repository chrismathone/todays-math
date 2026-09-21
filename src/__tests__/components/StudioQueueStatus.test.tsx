import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudioQueueStatus from "@/components/unified/StudioQueueStatus";
import { validateOcrAgainstTextLayer } from "@/lib/mathgen/textLayerValidator";

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

describe("진행 칸 이름표 — 원장님 2026-09-21 «페이지 자동 인식 → 페이지»", () => {
  it("쪽을 도는 동안 화면에는 «페이지», 읽는 이름은 «페이지 자동 인식 중»", () => {
    renderStatus([job(1, "complete"), job(2, "running")]);
    const progress = screen.getByRole("progressbar", {
      name: "페이지 자동 인식 중",
    });
    const panel = progress.parentElement!;
    const tag = within(panel).getByTitle("페이지 자동 인식 중");
    expect(tag.querySelector('[aria-hidden="true"]')!.textContent).toBe(
      "페이지",
    );
    // 긴 이름이 보이는 글자로 남으면 좁은 칸에서 다시 한 글자씩 쪼개진다.
    expect(
      within(panel).queryByText("페이지 자동 인식", { exact: true }),
    ).not.toBeInTheDocument();
  });
});

describe("«PDF 원문과 N% 만 일치» 경고 — 원장님 2026-09-21 «이 경고가 어떤 문제인지 알려주면 더 좋을듯»", () => {
  // 머리글(학교·학년·시험 이름)과 둘째 문제는 안 잘렸고, 첫 문제만 잘려 읽혔다.
  const layer =
    "2024학년도 경신중학교 2학년 기말고사 수학 이름 " +
    "1. 이등변삼각형 ABC 에서 꼭짓점 대각선 길이를 구하시오 " +
    "2. 평행사변형 넓이는 얼마인가";
  const ocr = "이등변삼각형 ABC 에서 꼭짓점 대각선 길이를 구하시오";
  const warned = () => ({
    ...job(3, "complete"),
    textLayerWarning: validateOcrAgainstTextLayer(ocr, layer)!,
  });

  it("무엇과 무엇을 견줬는지 한 줄에 적는다 — «누락 의심» 대신", () => {
    renderStatus([warned()]);
    expect(
      screen.getByText(
        "3쪽 · PDF 원문 낱말 중 38%만 인식 결과에 있음 (자른 영역 밖 머리글·문제 포함)",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/누락 의심|검토 권장/)).not.toBeInTheDocument();
  });

  it("빠진 낱말을 마우스 올림 없이 화면에 적는다 — 긴 낱말부터, 넘치면 «외 N개»", () => {
    renderStatus([warned()]);
    // 16개 중 6개가 읽혔다 — 빠진 10개 중 8개를 적고 나머지는 셈만.
    expect(
      screen.getByText(
        "빠진 낱말: 경신중학교, 평행사변형, 기말고사, 얼마인가, 2024, 학년도, 넓이는, 학년 외 2개",
      ),
    ).toBeInTheDocument();
  });

  it("빠진 낱말이 여덟 개 이하면 «외» 없이 다 적는다", () => {
    // 낱말 12개 중 5개가 읽혔다 — 빠진 7개를 다 적는다.
    const short = validateOcrAgainstTextLayer(
      "이등변삼각형 대각선 꼭짓점 길이를 구하시오",
      "경신중학교 기말고사 학년 이름 점수 " +
        "1. 이등변삼각형 대각선 꼭짓점 길이를 구하시오 넓이는 얼마인가",
    )!;
    expect(short.total - short.matched).toBe(7);
    renderStatus([{ ...job(1, "complete"), textLayerWarning: short }]);
    expect(
      screen.getByText(
        "빠진 낱말: 경신중학교, 기말고사, 얼마인가, 넓이는, 학년, 이름, 점수",
      ),
    ).toBeInTheDocument();
  });
});
