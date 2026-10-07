import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentLearningMenuPanel } from "@/components/class/StudentLearningMenuPanel";
import { StudentAccountPanel } from "@/components/class/StudentAccountPanel";

const studentA = "30000000-0000-4000-8000-000000000001";
const studentB = "30000000-0000-4000-8000-000000000002";
const updatedAt = "2026-10-07T03:00:00.000Z";
const payload = (enabled: string[] = [], canManage = true) => ({
  data: { enabled, canManage, updatedAt: null },
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn<typeof fetch>();
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(json(payload()));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("per-student manager learning menu panel", () => {
  it("can grant English listening explicitly for this student", async () => {
    const user = userEvent.setup();
    render(<StudentLearningMenuPanel studentId={studentA} />);
    await user.click(await screen.findByLabelText("영어 듣기"));
    fetchMock.mockResolvedValueOnce(json(payload(["english-listening"])));
    await user.click(screen.getByRole("button", { name: "학습 메뉴 저장" }));
    expect(await screen.findByText("저장했습니다.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1]).toEqual([
      `/api/students/${studentA}/learning-menus`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ enabled: ["english-listening"] }),
      }),
    ]);
    expect(screen.getByLabelText("영어 듣기")).toBeChecked();
  });
  it("starts with only the fixed exploration/collection and unchecked optional menus, without writing", async () => {
    render(<StudentLearningMenuPanel studentId={studentA} />);
    expect(await screen.findByLabelText("강의")).not.toBeChecked();
    expect(screen.getByLabelText("교재 QR 학습")).not.toBeChecked();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByLabelText("영어 듣기")).not.toBeChecked();
    expect(screen.getByText(/탐험과 도감은 기본/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "학습 메뉴 저장" }),
    ).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]).toEqual([
      `/api/students/${studentA}/learning-menus`,
      expect.objectContaining({ cache: "no-store" }),
    ]);
  });

  it("loads grants, saves both checkboxes for this student and then disables all with []", async () => {
    fetchMock.mockResolvedValueOnce(json(payload(["lectures"])));
    const user = userEvent.setup();
    render(<StudentLearningMenuPanel studentId={studentA} />);
    expect(await screen.findByLabelText("강의")).toBeChecked();
    await user.click(screen.getByLabelText("교재 QR 학습"));
    fetchMock.mockResolvedValueOnce(
      json({ data: { ...payload(["lectures", "textbook"]).data, updatedAt } }),
    );
    await user.click(screen.getByRole("button", { name: "학습 메뉴 저장" }));
    expect(await screen.findByText("저장했습니다.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1]).toEqual([
      `/api/students/${studentA}/learning-menus`,
      expect.objectContaining({
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: ["lectures", "textbook"] }),
      }),
    ]);
    await user.click(screen.getByLabelText("강의"));
    expect(screen.queryByText("저장했습니다.")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("교재 QR 학습"));
    fetchMock.mockResolvedValueOnce(json(payload()));
    await user.click(screen.getByRole("button", { name: "학습 메뉴 저장" }));
    await screen.findByText("저장했습니다.");
    expect(fetchMock.mock.calls[2][1]?.body).toBe(
      JSON.stringify({ enabled: [] }),
    );
  });

  it("shows loading and locks all controls during save, without duplicate PUTs", async () => {
    const load = deferred<Response>();
    fetchMock.mockReturnValueOnce(load.promise);
    const user = userEvent.setup();
    render(<StudentLearningMenuPanel studentId={studentA} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "학습 메뉴를 불러오는 중",
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await act(async () => {
      load.resolve(json(payload()));
    });
    await user.click(await screen.findByLabelText("강의"));
    const save = deferred<Response>();
    fetchMock.mockReturnValueOnce(save.promise);
    await user.click(screen.getByRole("button", { name: "학습 메뉴 저장" }));
    expect(screen.getByLabelText("강의")).toBeDisabled();
    expect(screen.getByLabelText("교재 QR 학습")).toBeDisabled();
    expect(screen.getByRole("button", { name: "저장 중…" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "저장 중…" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      save.resolve(json(payload(["lectures"])));
    });
    expect(await screen.findByText("저장했습니다.")).toBeInTheDocument();
    expect(screen.getByLabelText("강의")).toBeEnabled();
  });

  it.each(["network", "server", "malformed"])(
    "load failure (%s) cannot become defaults or trigger a write and can retry",
    async (failure) => {
      if (failure === "network")
        fetchMock.mockRejectedValueOnce(new Error("offline"));
      if (failure === "server") fetchMock.mockResolvedValueOnce(json({}, 500));
      if (failure === "malformed")
        fetchMock.mockResolvedValueOnce(json(payload(["unsupported-menu"])));
      const user = userEvent.setup();
      render(<StudentLearningMenuPanel studentId={studentA} />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "학습 메뉴를 불러오지 못했습니다.",
      );
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledOnce();
      fetchMock.mockResolvedValueOnce(json(payload(["textbook"])));
      await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
      expect(await screen.findByLabelText("교재 QR 학습")).toBeChecked();
      expect(fetchMock.mock.calls.every(([, init]) => !init?.method)).toBe(
        true,
      );
    },
  );

  it.each([401, 403, 404, "canManage"])(
    "hides settings on denied loading (%s)",
    async (denial) => {
      fetchMock.mockResolvedValueOnce(
        typeof denial === "number"
          ? json({}, denial)
          : json(payload([], false)),
      );
      render(<StudentLearningMenuPanel studentId={studentA} />);
      await waitFor(() =>
        expect(screen.queryByRole("region")).not.toBeInTheDocument(),
      );
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    },
  );

  it.each(["network", "server", "malformed"])(
    "save failure (%s) retains choices, shows failure and allows retry",
    async (failure) => {
      const user = userEvent.setup();
      render(<StudentLearningMenuPanel studentId={studentA} />);
      await user.click(await screen.findByLabelText("강의"));
      if (failure === "network")
        fetchMock.mockRejectedValueOnce(new Error("offline"));
      if (failure === "server") fetchMock.mockResolvedValueOnce(json({}, 403));
      if (failure === "malformed")
        fetchMock.mockResolvedValueOnce(
          json(payload(["lectures", "lectures"])),
        );
      await user.click(screen.getByRole("button", { name: "학습 메뉴 저장" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "학습 메뉴를 저장하지 못했습니다.",
      );
      expect(screen.getByLabelText("강의")).toBeChecked();
      expect(screen.queryByText("저장했습니다.")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "학습 메뉴 저장" }),
      ).toBeEnabled();
      fetchMock.mockResolvedValueOnce(json(payload(["lectures"])));
      await user.click(screen.getByRole("button", { name: "학습 메뉴 저장" }));
      expect(await screen.findByText("저장했습니다.")).toBeInTheDocument();
    },
  );

  it("ignores a late load for the previous student after switching to another student", async () => {
    const old = deferred<Response>();
    fetchMock.mockReturnValueOnce(old.promise);
    fetchMock.mockResolvedValueOnce(json(payload(["textbook"])));
    const { rerender } = render(
      <StudentLearningMenuPanel studentId={studentA} />,
    );
    rerender(<StudentLearningMenuPanel studentId={studentB} />);
    expect(await screen.findByLabelText("교재 QR 학습")).toBeChecked();
    await act(async () => {
      old.resolve(json(payload(["lectures"])));
    });
    expect(screen.getByLabelText("강의")).not.toBeChecked();
    expect(screen.getByLabelText("교재 QR 학습")).toBeChecked();
    expect(fetchMock.mock.calls[1][0]).toBe(
      `/api/students/${studentB}/learning-menus`,
    );
  });

  it.each([200, 500])(
    "a previous student's late save (%s) cannot overwrite the new student's settings or status",
    async (status) => {
      const user = userEvent.setup();
      const { rerender } = render(
        <StudentLearningMenuPanel studentId={studentA} />,
      );
      await user.click(await screen.findByLabelText("강의"));
      const old = deferred<Response>();
      fetchMock.mockReturnValueOnce(old.promise);
      await user.click(screen.getByRole("button", { name: "학습 메뉴 저장" }));
      fetchMock.mockResolvedValueOnce(json(payload(["textbook"])));
      rerender(<StudentLearningMenuPanel studentId={studentB} />);
      expect(await screen.findByLabelText("교재 QR 학습")).toBeChecked();
      await act(async () => {
        old.resolve(json(payload(["lectures"]), status));
      });
      expect(screen.getByLabelText("강의")).not.toBeChecked();
      expect(screen.getByLabelText("교재 QR 학습")).toBeChecked();
      expect(screen.queryByText("저장했습니다.")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      await user.click(screen.getByLabelText("강의"));
      fetchMock.mockResolvedValueOnce(json(payload(["lectures", "textbook"])));
      await user.click(screen.getByRole("button", { name: "학습 메뉴 저장" }));
      await screen.findByText("저장했습니다.");
      expect(fetchMock.mock.calls[3][0]).toBe(
        `/api/students/${studentB}/learning-menus`,
      );
    },
  );

  it("integrates settings into the existing account panel before account issuance", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/account")
        ? json({ data: { account: null, withdrawn: false } })
        : json(payload()),
    );
    render(<StudentAccountPanel student={{ id: studentA, name: "학생 가" }} />);
    const account = within(
      await screen.findByRole("region", { name: "오늘의 개념 로그인" }),
    );
    expect(
      account.getByRole("button", { name: "계정 생성" }),
    ).toBeInTheDocument();
    expect(await account.findByLabelText("강의")).not.toBeChecked();
    expect(account.getByLabelText("교재 QR 학습")).not.toBeChecked();
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method)).toBe(true);
  });
});
