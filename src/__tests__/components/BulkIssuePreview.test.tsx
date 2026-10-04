import {
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

describe("bulk student issue preview", () => {
  it("keeps failed issuance and its error inside the open preview", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? Response.json(
            { error: { message: "다시 시도해주세요." } },
            { status: 503 },
          )
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
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
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
});
