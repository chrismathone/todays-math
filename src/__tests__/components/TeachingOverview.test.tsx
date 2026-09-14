import { StrictMode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TeachingOverview from "@/components/unified/TeachingOverview";

const overview = {
  user: { id: "owner-a", name: "김수학" },
  classCount: 4,
  studentCount: 26,
  classes: [
    {
      id: "a",
      name: "중1 기본반",
      grade: "중1",
      studentCount: 8,
      currentUnit: { chapter: "문자와 식", section: "일차방정식" },
    },
    {
      id: "b",
      name: "중2 심화반",
      grade: "중2",
      studentCount: 6,
      currentUnit: null,
    },
    {
      id: "c",
      name: "고1 시작반",
      grade: "고1",
      studentCount: 7,
      currentUnit: null,
    },
  ],
};
const fetchMock = vi.fn<typeof fetch>();
let now = 1_000_000;

beforeEach(() => {
  now = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => Response.json({ data: overview }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("compact teaching overview", () => {
  it("shows session loading, then an inline sign-in CTA with no external navigation or fake totals", async () => {
    const onOpen = vi.fn();
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const user = userEvent.setup();
    render(<TeachingOverview onOpen={onOpen} />);
    expect(screen.getByRole("status")).toHaveTextContent("로그인 정보를 확인");
    await user.click(
      await screen.findByRole("button", { name: "로그인하고 내 수업 보기" }),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("등록 학생")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dev/unified/overview",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("shows real account totals separately from the three class previews, including units and missing progress", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<TeachingOverview onOpen={onOpen} />);
    await screen.findByText("중1 기본반");
    expect(screen.getByText("김수학님의 수업 공간")).toBeInTheDocument();
    expect(screen.getByText("내 반").parentElement).toHaveTextContent("4개");
    expect(screen.getByText("등록 학생").parentElement).toHaveTextContent(
      "26명",
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("중1 기본반").closest("li")).toHaveTextContent(
      "8명",
    );
    expect(screen.getByText("반 진도 · 일차방정식")).toHaveAttribute(
      "title",
      "문자와 식 · 일차방정식",
    );
    expect(screen.getAllByText("진도 기록 전")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "수업 관리 열기" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("shows zero counts and a working first-class CTA for an empty account", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        data: { ...overview, classCount: 0, studentCount: 0, classes: [] },
      }),
    );
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<TeachingOverview onOpen={onOpen} />);
    await user.click(
      await screen.findByRole("button", { name: "첫 반 만들기" }),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByText("내 반").parentElement).toHaveTextContent("0개");
    expect(screen.getByText("등록 학생").parentElement).toHaveTextContent(
      "0명",
    );
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("recovers from a network failure when retry is clicked", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const user = userEvent.setup();
    render(<TeachingOverview onOpen={vi.fn()} />);
    await screen.findByRole("alert");
    expect(screen.queryByText("등록 학생")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await screen.findByText("중1 기본반");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("offers retry when a stalled network request times out", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    render(<TeachingOverview onOpen={vi.fn()} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_001);
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 불러오기" }),
    ).toBeInTheDocument();
  });

  it("rejects a malformed success response instead of displaying invented numbers", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ data: { ...overview, studentCount: "26" } }),
    );
    render(<TeachingOverview onOpen={vi.fn()} />);
    await screen.findByRole("alert");
    expect(screen.queryByText("등록 학생")).not.toBeInTheDocument();
  });

  it("throttles focus refreshes and deduplicates focus/visibility events while a request is pending", async () => {
    render(<TeachingOverview onOpen={vi.fn()} />);
    await screen.findByText("중1 기본반");
    fireEvent.focus(window);
    fireEvent(document, new Event("visibilitychange"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    let resolve!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    now += 30_001;
    fireEvent.focus(window);
    now += 30_001;
    fireEvent.focus(window);
    fireEvent(document, new Event("visibilitychange"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolve(Response.json({ data: { ...overview, studentCount: 27 } }));
    });
    await waitFor(() =>
      expect(screen.getByText("등록 학생").parentElement).toHaveTextContent(
        "27명",
      ),
    );
  });

  it.each([401, 503])(
    "clears a previous owner's rows when a focus refresh returns %s",
    async (status) => {
      render(<TeachingOverview onOpen={vi.fn()} />);
      await screen.findByText("중1 기본반");
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));
      now += 30_001;
      fireEvent.focus(window);
      await screen.findByRole("button", {
        name: status === 401 ? "로그인하고 내 수업 보기" : "다시 불러오기",
      });
      expect(screen.queryByText("중1 기본반")).not.toBeInTheDocument();
      expect(
        screen.queryByText("김수학님의 수업 공간"),
      ).not.toBeInTheDocument();
    },
  );

  it("fetches once in Strict Mode and cancels pending work on unmount", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const { unmount } = render(
      <StrictMode>
        <TeachingOverview onOpen={vi.fn()} />
      </StrictMode>,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const signal = fetchMock.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
    now += 30_001;
    fireEvent.focus(window);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
