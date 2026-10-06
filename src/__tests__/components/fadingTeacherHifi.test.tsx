import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  fadingTeacherDashboardResponseSchema,
  fadingTeacherStudentResponseSchema,
} from "@/contracts/fadingTeacher.contract";
import { fadingCatalog } from "@/lib/fading/catalog";
import { buildTeacherWireFixture } from "@/components/fading/teacher/fixture";
import { TeacherFadingStatus } from "@/components/fading/teacher/TeacherFadingStatus";
import { TeacherHifiGallery } from "@/components/fading/teacher/TeacherHifiGallery";
import { createTeacherFixtureSource } from "@/components/fading/teacher/fixtureSource";
import { TeacherFadingSourceError } from "@/components/fading/teacher/source";

vi.mock("@/components/fading/FadingPreview", () => ({
  FadingPreview: () => <div>학생 앱 표본</div>,
}));
const fixture = buildTeacherWireFixture(fadingCatalog());
const preview = {
  concepts: [],
  today: fixture.dashboard.today,
  traps: {},
  figures: {},
};
const source = () => createTeacherFixtureSource(fixture);
const show = (overrides = {}) =>
  render(
    <TeacherFadingStatus {...source()} preview={preview} {...overrides} />,
  );

describe("교사 Hi-fi B 구조", () => {
  it("네 안이 같은 B 구조와 제품 부품으로 그려진다", async () => {
    render(<TeacherHifiGallery fixture={fixture} preview={preview} />);
    expect(screen.getAllByTestId("teacher-hifi-proposal")).toHaveLength(4);
    await screen.findAllByRole("heading", { name: "이도윤" });
    for (const proposal of screen.getAllByTestId("teacher-hifi-proposal")) {
      expect(
        within(proposal).getByRole("table", { name: "살펴볼 학생" }),
      ).toBeInTheDocument();
      expect(
        within(proposal).getByRole("table", { name: "전체 명단" }),
      ).toBeInTheDocument();
      expect(
        within(proposal).getByRole("button", { name: "미리 보기" }),
      ).toBeInTheDocument();
    }
  });

  it("보기 단추로 바꾸며 두 반의 등록을 유지한다", async () => {
    show();
    await screen.findByRole("heading", { name: "이도윤" });
    const table = screen.getByRole("table", { name: "전체 명단" });
    fireEvent.click(
      within(table).getAllByRole("button", { name: /김하윤.*보기/ })[0]!,
    );
    const detail = await screen.findByRole("complementary", {
      name: "김하윤 학생 상세",
    });
    expect(within(detail).getByText("개별반 · 중1 정규반")).toBeInTheDocument();
    expect(screen.getByText("학생 34명 · 등록 35건")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "전체 명단 더 보기" }));
    expect(within(table).getAllByRole("row")).toHaveLength(36);
    const buttons = within(table).getAllByRole("button", {
      name: /김하윤.*보기/,
    });
    fireEvent.click(buttons[1]!);
    await screen.findByText("현재 중1 정규반 기준");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("실제 계약 응답의 숫자·날짜·평가를 그대로 표시한다", async () => {
    const getStudent = vi.fn(source().getStudent);
    show({ getStudent });
    const detail = await screen.findByRole("complementary", {
      name: "이도윤 학생 상세",
    });
    await within(detail).findByRole("heading", { name: "이도윤" });
    const result = await getStudent.mock.results[0]!.value;
    const received = fadingTeacherStudentResponseSchema.parse(result).data;
    expect(
      fadingTeacherDashboardResponseSchema.safeParse({
        data: fixture.dashboard,
      }).success,
    ).toBe(true);
    const metric = (label: string) =>
      within(detail).getByText(label).closest("div")?.textContent;
    expect(metric("복습일 된 개념")).toContain(`${received.summary.due}개`);
    expect(metric("가장 오래 밀림")).toContain(
      `${received.summary.longestOverdueDays}일`,
    );
    expect(metric("마지막 평가")).toContain(received.summary.lastOn);
    const recent = within(detail).getByRole("table", {
      name: "최근 평가 집계",
    });
    expect(within(recent).getAllByRole("row")[1]).toHaveTextContent(
      `${received.days[0]!.passed}회`,
    );
  });

  it("금지 표시·문장·답·행 클릭을 넣지 않는다", async () => {
    const { container } = show();
    await screen.findByRole("heading", { name: "이도윤" });
    expect(container.textContent).not.toMatch(
      /기억 보존율|정답률|마스터|완전 습득|EXP|MathSRS|%|!/,
    );
    expect(
      container.querySelector("[data-answer], [data-correct], [data-trap]"),
    ).toBeNull();
    expect(container.textContent).not.toContain(
      fadingCatalog()[0]!
        .propositions[0]!.pieces.map((p) =>
          p.kind === "text" ? p.text : p.target.text,
        )
        .join(""),
    );
    for (const row of container.querySelectorAll("tr"))
      expect(row).not.toHaveAttribute("onclick");
    expect(
      screen.getByText("‘다시’ 외 평가는 학생이 매긴 평가 건수입니다."),
    ).toBeInTheDocument();
  });

  it("소단원은 일반 글, 용어만 수식 렌더러로 보낸다", async () => {
    show();
    const detail = await screen.findByRole("complementary", {
      name: "이도윤 학생 상세",
    });
    for (const section of detail.querySelectorAll("[data-section-name]"))
      expect(section.querySelector(".katex")).toBeNull();
  });

  it("교사 상세에서도 단원 번호와 제목 속 수량을 구분한다", async () => {
    const readers = source();
    show({
      getStudent: async (studentId: string, classId: string) => {
        const { data } = await readers.getStudent(studentId, classId);
        return {
          data: {
            ...data,
            concepts: data.concepts.map((concept, index) =>
              index === 0
                ? {
                    ...concept,
                    section: "초3::1-5 길이와 시간::1-5-1 1cm보다 작은 단위",
                  }
                : concept,
            ),
          },
        };
      },
    });
    const detail = await screen.findByRole("complementary", {
      name: "이도윤 학생 상세",
    });
    const name = await within(detail).findByText(
      "1-5 · 길이와 시간 · 1-5-1 · 1cm보다 작은 단위",
    );
    expect(name).toHaveAttribute("data-section-name");
    expect(name.querySelector(".katex")).toBeNull();
  });

  it("기존 저장 없는 학생 미리 보기를 열고 현황으로 돌아온다", async () => {
    show();
    await screen.findByRole("heading", { name: "이도윤" });
    fireEvent.click(screen.getByRole("button", { name: "미리 보기" }));
    await screen.findByText("학생 앱 표본");
    expect(screen.getAllByText("저장되지 않음").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "학생 현황으로" }));
    expect(screen.getByRole("heading", { name: "이도윤" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "미리 보기" })).toHaveFocus();
  });
});

describe("교사 제품 부품의 상태", () => {
  it("자료 제공 함수가 바뀌면 이전 지점의 명단을 숨긴다", async () => {
    const readers = source();
    const { rerender } = render(
      <TeacherFadingStatus {...readers} preview={preview} />,
    );
    await screen.findByRole("heading", { name: "이도윤" });
    rerender(
      <TeacherFadingStatus
        {...readers}
        preview={preview}
        getDashboard={() => new Promise(() => {})}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "학생 현황을 불러오는 중입니다.",
    );
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("싣는 중", () => {
    show({ getDashboard: () => new Promise(() => {}) });
    expect(screen.getByRole("status")).toHaveTextContent(
      "학생 현황을 불러오는 중입니다.",
    );
  });
  it("빈 반", async () => {
    show({ initialClass: fixture.dashboard.classes[0]!.id });
    await screen.findByText("이 반에 등록된 학생이 없습니다.");
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("학생 0", async () => {
    show({
      getDashboard: async () => ({
        data: { ...fixture.dashboard, students: [] },
      }),
    });
    await screen.findByText("등록된 학생이 없습니다.");
  });
  it("반 0", async () => {
    show({
      getDashboard: async () => ({
        data: { ...fixture.dashboard, students: [], classes: [] },
      }),
    });
    await screen.findByText("등록된 반이 없습니다.");
  });
  it("실패 뒤 다시 시도", async () => {
    const getDashboard = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ data: fixture.dashboard });
    show({ getDashboard });
    await screen.findByText("학생 현황을 불러오지 못했습니다.");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await screen.findByRole("heading", { name: "이도윤" });
    expect(getDashboard).toHaveBeenCalledTimes(2);
  });
  it.each([
    [404, "닫혀 있음"],
    [403, "권한 없음"],
  ])("HTTP %s", async (status, title) => {
    show({
      getDashboard: async () => {
        throw new TeacherFadingSourceError(status);
      },
    });
    await screen.findByRole("heading", { name: title });
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("학생 상세 실패도 다시 읽는다", async () => {
    const getStudent = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(source().getStudent);
    show({ getStudent });
    await screen.findByText("학생 상세를 불러오지 못했습니다.");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await screen.findByRole("heading", { name: "이도윤" });
  });
  it("이름 검색의 빈 결과를 별도로 알린다", async () => {
    show();
    await screen.findByRole("heading", { name: "이도윤" });
    fireEvent.change(screen.getByLabelText("학생 이름"), {
      target: { value: "없는 학생" },
    });
    expect(
      screen.getByText("이름에 맞는 학생이 없습니다."),
    ).toBeInTheDocument();
  });
  it("늦은 이전 상세가 새 선택을 덮지 않는다", async () => {
    let finish: (
      value: Awaited<ReturnType<ReturnType<typeof source>["getStudent"]>>,
    ) => void = () => {};
    const getStudent = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockImplementation(source().getStudent);
    show({ getStudent });
    await screen.findByRole("table", { name: "전체 명단" });
    fireEvent.click(
      within(screen.getByRole("table", { name: "전체 명단" })).getAllByRole(
        "button",
        { name: /김하윤.*보기/ },
      )[0]!,
    );
    await screen.findByRole("heading", { name: "김하윤" });
    const row = fixture.dashboard.students.find((r) => r.name === "이도윤")!;
    await act(async () => {
      finish(await source().getStudent(row.id, row.classId));
    });
    expect(screen.getByRole("heading", { name: "김하윤" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "이도윤" })).toBeNull();
  });
});
