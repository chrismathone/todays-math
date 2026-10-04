import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { BulkStudentAccountButton } from "@/components/class/BulkStudentAccountButton";

afterEach(() => vi.unstubAllGlobals());
const dialogMethods = ["showModal", "close"] as const;
const originalDialogMethods = dialogMethods.map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
);
beforeAll(() => {
  for (const name of dialogMethods)
    Object.defineProperty(HTMLDialogElement.prototype, name, {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = name === "showModal";
      },
    });
});
afterAll(() => {
  dialogMethods.forEach((name, index) => {
    const original = originalDialogMethods[index];
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, name, original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  });
});
const studentId = "30000000-0000-4000-8000-000000000001";
const preview = {
  data: {
    classId: "40000000-0000-4000-8000-000000000001",
    className: "중2 A반",
    total: 2,
    ready: 1,
    issued: 0,
    existing: 1,
    skipped: 0,
    students: [
      { studentId, name: "김민서", loginId: null, status: "ready" },
      {
        studentId: "30000000-0000-4000-8000-000000000002",
        name: "이서연",
        loginId: "이서연",
        status: "existing",
      },
    ],
  },
};
const issued = {
  data: {
    ...preview.data,
    ready: 0,
    issued: 1,
    students: [
      { ...preview.data.students[0], status: "issued", loginId: "김민서" },
      preview.data.students[1],
    ],
  },
};

describe("bulk student issue preview", () => {
  it("keeps failed issuance and its error inside the open preview", async () => {
    let attempts = 0;
    const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? ++attempts === 1
          ? Response.json(
              { error: { message: "다시 시도해주세요." } },
              { status: 503 },
            )
          : Response.json(issued)
        : Response.json(preview),
    );
    vi.stubGlobal("fetch", fetch);
    render(
      <BulkStudentAccountButton
        classId={preview.data.classId}
        className="중2 A반"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "중2 A반 발급 대상 확인" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "중2 A반 발급 대상",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "선택한 학생 계정 생성" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "다시 시도해주세요.",
    );
    expect(
      within(dialog).getByRole("checkbox", { name: /김민서/ }),
    ).toBeChecked();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "선택한 학생 계정 생성" }),
    );
    await waitFor(() =>
      expect(within(dialog).getByRole("status")).toHaveTextContent("생성 1명"),
    );
    const posts = fetch.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(posts.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([
      { studentIds: [studentId] },
      { studentIds: [studentId] },
    ]);
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("posts only the confirmed ready ids after preview", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST")
        return Response.json({
          data: {
            ...preview.data,
            ready: 0,
            issued: 1,
            students: [
              {
                ...preview.data.students[0],
                status: "issued",
                loginId: "김민서",
              },
              preview.data.students[1],
            ],
          },
        });
      return Response.json(preview);
    });
    vi.stubGlobal("fetch", fetch);
    render(
      <BulkStudentAccountButton
        classId={preview.data.classId}
        className="중2 A반"
      />,
    );
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "중2 A반 발급 대상 확인" }),
    );
    expect(await screen.findByText("김민서")).toBeInTheDocument();
    expect(screen.getByText(/기존 계정 유지/)).toBeInTheDocument();
    expect(screen.queryByText(/0042/)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 학생 계정 생성" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("생성 1명"),
    );
    const post = fetch.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      studentIds: [studentId],
    });
    expect(
      fetch.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  });

  it("can post an empty selection and creates nobody", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? Response.json({
            data: {
              ...preview.data,
              total: 0,
              ready: 0,
              existing: 0,
              students: [],
            },
          })
        : Response.json(preview),
    );
    vi.stubGlobal("fetch", fetch);
    render(
      <BulkStudentAccountButton
        classId={preview.data.classId}
        className="중2 A반"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "중2 A반 발급 대상 확인" }),
    );
    await screen.findByText("김민서");
    fireEvent.click(screen.getByRole("checkbox", { name: /김민서/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 학생 계정 생성" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "선택한 학생이 없습니다. 계정을 만들지 않았습니다.",
    );
    const post = fetch.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ studentIds: [] });
  });

  it("retains the same native dialog through processing, result and summary refresh until explicit close", async () => {
    let resolvePost!: (response: Response) => void;
    const fetch = vi.fn((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? new Promise<Response>((resolve) => {
            resolvePost = resolve;
          })
        : Promise.resolve(Response.json(preview)),
    );
    vi.stubGlobal("fetch", fetch);
    const onIssued = vi.fn();
    const props = {
      classId: preview.data.classId,
      className: "중2 A반",
      onIssued,
    };
    const { rerender } = render(
      <BulkStudentAccountButton
        {...props}
        issuanceSummary={{ total: 2, issued: 1, unissued: 1 }}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "중2 A반 발급 대상 확인",
    });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: "중2 A반 발급 대상",
    });
    expect(dialog).toHaveProperty("open", true);
    const create = within(dialog).getByRole("button", {
      name: "선택한 학생 계정 생성",
    });
    fireEvent.click(create);
    fireEvent.click(create);
    expect(within(dialog).getByRole("status")).toHaveTextContent("처리 중");
    expect(
      within(dialog).getByRole("button", { name: "처리 중…" }),
    ).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled();
    expect(dialog).toHaveAttribute("aria-busy", "true");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(dialog).toHaveProperty("open", true);
    await act(async () =>
      resolvePost(
        Response.json({
          data: {
            ...issued.data,
            total: 3,
            skipped: 1,
            students: [
              ...issued.data.students,
              {
                studentId: "30000000-0000-4000-8000-000000000003",
                name: "박지훈",
                loginId: null,
                status: "missing_phone",
              },
            ],
          },
        }),
      ),
    );
    expect(
      screen.getByRole("dialog", { name: "중2 A반 학생 계정 생성 결과" }),
    ).toBe(dialog);
    expect(dialog).toHaveProperty("open", true);
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "생성 1명 · 기존 1명 · 확인 필요 1명",
    );
    const list = within(dialog).getByRole("list", {
      name: "중2 A반 학생 계정 생성 결과",
    });
    expect(list.closest("details")).toBeNull();
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(list).toHaveTextContent("김민서 · 아이디 김민서 · 생성 완료");
    expect(list).toHaveTextContent("이서연 · 아이디 이서연 · 기존 계정 유지");
    expect(list).toHaveTextContent("박지훈 · 연동된 연락처 없음");
    expect(list).not.toHaveTextContent(/초기 비밀번호|010-|0042/);
    expect(
      within(dialog).queryByRole("button", { name: "선택한 학생 계정 생성" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(onIssued).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByRole("button", { name: "닫기" })).toHaveFocus();
    rerender(
      <BulkStudentAccountButton
        {...props}
        issuanceSummary={{ total: 3, issued: 2, unissued: 1 }}
      />,
    );
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(screen.getByLabelText("중2 A반 계정 발급 현황")).toHaveTextContent(
      "일부 발급",
    );
    expect(screen.getByLabelText("중2 A반 계정 발급 현황")).toHaveTextContent(
      "발급 2명 / 전체 3명 · 미발급 1명",
    );
    expect(
      fetch.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(screen.getByLabelText("중2 A반 계정 발급 현황")).toHaveTextContent(
      "발급 2명",
    );
  });

  it.each(["cancel button", "Escape"])(
    "creates no accounts when leaving preview with %s and restores focus",
    async (dismiss) => {
      const fetch = vi.fn(async () => Response.json(preview));
      vi.stubGlobal("fetch", fetch);
      const onIssued = vi.fn();
      render(
        <BulkStudentAccountButton
          classId={preview.data.classId}
          className="중2 A반"
          onIssued={onIssued}
        />,
      );
      const trigger = screen.getByRole("button", {
        name: "중2 A반 발급 대상 확인",
      });
      trigger.focus();
      fireEvent.click(trigger);
      const dialog = await screen.findByRole("dialog");
      if (dismiss === "Escape")
        fireEvent(dialog, new Event("cancel", { cancelable: true }));
      else
        fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(onIssued).not.toHaveBeenCalled();
    },
  );

  it.each([
    [{ total: 0, issued: 0, unissued: 0 }, "재원 학생 없음"],
    [{ total: 2, issued: 0, unissued: 2 }, "미발급"],
    [{ total: 2, issued: 1, unissued: 1 }, "일부 발급"],
    [{ total: 2, issued: 2, unissued: 0 }, "발급 완료"],
  ] as const)(
    "renders persisted summary %j without issuing or fetching",
    async (issuanceSummary, label) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const props = {
        classId: preview.data.classId,
        className: "중2 A반",
        issuanceSummary,
      };
      const first = render(<BulkStudentAccountButton {...props} />);
      const summary = screen.getByLabelText("중2 A반 계정 발급 현황");
      expect(summary).toHaveTextContent(label);
      expect(summary).toHaveTextContent(
        `발급 ${issuanceSummary.issued}명 / 전체 ${issuanceSummary.total}명 · 미발급 ${issuanceSummary.unissued}명`,
      );
      if (issuanceSummary.unissued > 0)
        expect(summary).not.toHaveTextContent("발급 완료");
      first.unmount();
      render(<BulkStudentAccountButton {...props} />);
      expect(screen.getByLabelText("중2 A반 계정 발급 현황")).toHaveTextContent(
        label,
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
