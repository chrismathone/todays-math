import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  screenFixture,
  classFixture,
  statusOf,
} from "@/app/dev/exam-report-screen-hifi/fixtures";
import type {
  ExamReportList,
  ExamReportStudent,
} from "@/contracts/examReportWorkspace.contract";
import type { ExamReportClient } from "@/components/exam-report/client";
const m = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock("@/components/exam-report/client", async (original) => ({
  ...(await original<typeof import("@/components/exam-report/client")>()),
  downloadExamReport: m.download,
}));
import { ExamReportWorkspace } from "@/components/exam-report/ExamReportWorkspace";
import { ExamReportClientError } from "@/components/exam-report/client";
import { wrongTableFixture } from "../helpers/examReportWrongTableFixture";

const options: ExamReportList["options"] = {
  format: "S1",
  wrongQuestions: true,
  retries: true,
  teacherNote: true,
  classAverage: false,
};
function fixture(many = false) {
  const students = screenFixture(many ? "many" : "normal").students;
  const rows: ExamReportStudent[] = students.map((row) => ({
    report: { ...row.report, teacherNote: row.savedNote },
    options,
    classComparison: null,
    summary: {
      student: row.report.student,
      gradingStatus: row.report.status,
      score: row.report.score,
      wrongCount: row.report.wrongQuestions.length,
      teacherNote: row.savedNote,
      revision: 1,
      status: statusOf(row),
      confirmedAt: row.confirmedNote === null ? null : "2026-10-24T05:00:00Z",
    },
  }));
  const list: ExamReportList = {
    options,
    optionsDigest: "a".repeat(64),
    classReport: classFixture(students),
    students: rows.map((row) => row.summary),
  };
  const source = {
    list: vi.fn(async () => structuredClone(list)),
    student: vi.fn(async (_test: string, id: string) =>
      structuredClone(rows.find((row) => row.report.student.id === id)!),
    ),
    note: vi.fn(
      async (_test: string, id: string, _revision: number, note: string) => {
        const row = structuredClone(
          rows.find((row) => row.report.student.id === id)!,
        );
        row.report.teacherNote = note;
        row.summary.teacherNote = note;
        row.summary.revision++;
        row.summary.status = "draft";
        return row;
      },
    ),
    confirm: vi.fn(
      async (_test: string, id: string, _revision: number, note: string) => {
        const row = structuredClone(
          rows.find((row) => row.report.student.id === id)!,
        );
        row.report.teacherNote = note;
        row.summary.teacherNote = note;
        row.summary.revision++;
        row.summary.status = "confirmed";
        return row;
      },
    ),
    settings: vi.fn(async () => structuredClone(list)),
    print: vi.fn(
      async () => new Blob(["%PDF-fixture"], { type: "application/pdf" }),
    ),
    pdf: vi.fn(
      async () => new Blob(["%PDF-fixture"], { type: "application/pdf" }),
    ),
  } satisfies ExamReportClient;
  return { rows, list, source };
}
const oldShow = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "showModal",
);
const oldClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "close",
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterAll(() => {
  for (const [key, value] of [
    ["showModal", oldShow],
    ["close", oldClose],
  ] as const) {
    if (value) Object.defineProperty(HTMLDialogElement.prototype, key, value);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});
beforeEach(() => vi.clearAllMocks());
async function ready(source: ExamReportClient) {
  const rendered = render(
    <ExamReportWorkspace testId="fixture-test" source={source} />,
  );
  await screen.findByLabelText("원장님 문장");
  await waitFor(() =>
    expect(screen.queryByText("지면 확인 중")).not.toBeInTheDocument(),
  );
  return rendered;
}
function pick(name: string) {
  fireEvent.click(
    within(
      screen.getByRole("list", { name: "학생 이름과 성적표 상태" }),
    ).getByRole("button", { name: new RegExp(name) }),
  );
}
describe("실제 성적표 H3 화면", () => {
  it("쓰는 문장이 옆 H1 지면에 바로 보이고, 확정 단추가 수정 문장 저장을 포함한다", async () => {
    const { source, rows } = fixture();
    const { container } = await ready(source);
    fireEvent.change(screen.getByLabelText("원장님 문장"), {
      target: { value: "쓴 문장을 옆에서 봅니다." },
    });
    expect(container.querySelector(".er-note p")).toHaveTextContent(
      "쓴 문장을 옆에서 봅니다.",
    );
    expect(screen.getByText(/저장 상한 1000자/)).toBeInTheDocument();
    expect(screen.getByText(/지면에 남은 자리/)).toBeInTheDocument();
    expect(screen.getByLabelText("원장님 문장")).toHaveAttribute(
      "maxlength",
      "1000",
    );
    const confirm = screen.getByRole("button", {
      name: /^(이 학생 확정|다시 확정)$/,
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(source.confirm).toHaveBeenCalledWith(
        "fixture-test",
        rows[0].report.student.id,
        1,
        "쓴 문장을 옆에서 봅니다.",
      ),
    );
    expect(source.note).not.toHaveBeenCalled();
    await screen.findByRole("button", { name: "확정됨" });
  });
  it("틀린 문항이 다음 쪽으로 이어져도 확정할 수 있고 추가 쪽을 안내한다", async () => {
    const { source, rows } = fixture();
    rows[0].report = {
      ...wrongTableFixture(40),
      student: rows[0].report.student,
    };
    rows[0].summary.status = "draft";
    rows[0].summary.wrongCount = 40;
    await ready(source);
    expect(
      screen.getAllByText(/틀린 문항 표가 길면 다음 쪽/).length,
    ).toBeGreaterThan(0);
    const confirm = screen.getByRole("button", { name: "이 학생 확정" });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);
    await waitFor(() => expect(source.confirm).toHaveBeenCalled());
  });
  it("학생을 바꿔도 입력을 보존하고, 실패 뒤에는 확정으로 표시하지 않는다", async () => {
    const { source, rows } = fixture();
    source.confirm.mockRejectedValueOnce(
      new Error("문장을 저장하지 못했습니다."),
    );
    await ready(source);
    fireEvent.change(screen.getByLabelText("원장님 문장"), {
      target: { value: "보존할 입력" },
    });
    pick(rows[1].report.student.name);
    await waitFor(() =>
      expect(source.student).toHaveBeenCalledWith(
        "fixture-test",
        rows[1].report.student.id,
      ),
    );
    pick(rows[0].report.student.name);
    expect(await screen.findByLabelText("원장님 문장")).toHaveValue(
      "보존할 입력",
    );
    const confirm = screen.getByRole("button", {
      name: /^(이 학생 확정|다시 확정)$/,
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "문장을 저장하지 못했습니다",
    );
    expect(screen.getByLabelText("원장님 문장")).toHaveValue("보존할 입력");
    expect(
      screen.queryByRole("button", { name: "확정됨" }),
    ).not.toBeInTheDocument();
  });
  it("409에서는 최신 판을 다시 읽고 현재 입력은 남겨 재확정한다", async () => {
    const { source, rows } = fixture();
    await ready(source);
    source.confirm.mockRejectedValueOnce(
      new ExamReportClientError(409, "다른 곳에서 바뀌었습니다."),
    );
    rows[0].summary.revision = 7;
    fireEvent.change(screen.getByLabelText("원장님 문장"), {
      target: { value: "내 입력" },
    });
    let confirm = screen.getByRole("button", {
      name: /^(이 학생 확정|다시 확정)$/,
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);
    await waitFor(() => expect(source.student).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("원장님 문장")).toHaveValue("내 입력");
    confirm = screen.getByRole("button", {
      name: /^(이 학생 확정|다시 확정)$/,
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(source.confirm).toHaveBeenLastCalledWith(
        "fixture-test",
        rows[0].report.student.id,
        7,
        "내 입력",
      ),
    );
  });
  it("인쇄 기본은 확정 학생이며, 전원 범위는 저장된 내용으로 서버에 요청한다", async () => {
    const { source } = fixture();
    await ready(source);
    expect(screen.getByLabelText("학생 인쇄 범위")).toHaveValue("confirmed");
    fireEvent.click(screen.getByRole("button", { name: /^학생 성적표/ }));
    await waitFor(() =>
      expect(source.print).toHaveBeenCalledWith(
        "fixture-test",
        "confirmed",
        "students",
      ),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("학생 인쇄 범위")).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText("학생 인쇄 범위"), {
      target: { value: "all" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^학생 성적표/ }));
    await waitFor(() =>
      expect(source.print).toHaveBeenLastCalledWith(
        "fixture-test",
        "all",
        "students",
      ),
    );
    expect(m.download).toHaveBeenCalled();
  });
  it("결시는 문장·확정·학생 미리보기를 만들지 않는다", async () => {
    const { source, rows } = fixture();
    await ready(source);
    const absent = rows.find((row) => row.summary.status === "absent")!;
    pick(absent.report.student.name);
    await screen.findByText("결시하여 성적표를 만들지 않습니다.");
    expect(screen.queryByLabelText("원장님 문장")).not.toBeInTheDocument();
  });
  it("긴 명단은 공용 고르기 창, 반 설정은 취소·적용을 쓴다", async () => {
    const { source } = fixture(true);
    await ready(source);
    fireEvent.click(screen.getByRole("button", { name: /학생 고르기 · 48명/ }));
    expect(
      await screen.findByRole("dialog", { name: "성적표를 볼 학생 고르기" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    fireEvent.click(screen.getByRole("button", { name: "반 지면 설정" }));
    const dialog = screen.getByRole("dialog", { name: "반 지면 설정" });
    fireEvent.click(within(dialog).getByLabelText("요약 + 틀린 문항 풀이"));
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(source.settings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "반 지면 설정" }));
    fireEvent.click(screen.getByLabelText("요약 + 틀린 문항 풀이"));
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    await waitFor(() =>
      expect(source.settings).toHaveBeenCalledWith(
        "fixture-test",
        "a".repeat(64),
        expect.objectContaining({ format: "M1" }),
      ),
    );
  });
});
