import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FADING_TEACHER_FLAGS,
  fadingTeacherDashboardResponseSchema,
  fadingTeacherStudentResponseSchema,
} from "@/contracts/fadingTeacher.contract";
import { fadingCatalog } from "@/lib/fading/catalog";
import { buildTeacherWireFixture } from "@/components/fading/teacher/fixture";
import { TeacherWireGallery } from "@/components/fading/teacher/TeacherWireGallery";

const fixture = () => buildTeacherWireFixture(fadingCatalog());

describe("교사 학생 현황 Wire 표본", () => {
  it("계산한 명단과 모든 학생 상세가 실제 응답 계약을 통과한다", () => {
    const sample = fixture();
    expect(
      fadingTeacherDashboardResponseSchema.safeParse({ data: sample.dashboard })
        .success,
    ).toBe(true);
    for (const detail of Object.values(sample.details)) {
      expect(
        fadingTeacherStudentResponseSchema.safeParse({ data: detail }).success,
      ).toBe(true);
      expect(JSON.stringify(detail)).not.toMatch(
        /"(pieces|propositions|answer|definition)"/,
      );
    }
  });

  it("0명·1명·30명과 살펴볼 까닭 넷, 두 반에 등록된 학생을 포함한다", () => {
    const { dashboard } = fixture();
    const counts = dashboard.classes.map(
      (c) => dashboard.students.filter((s) => s.classId === c.id).length,
    );
    expect(counts).toEqual([0, 1, 30, 4]);
    expect(new Set(dashboard.students.flatMap((s) => s.summary.flags))).toEqual(
      new Set(FADING_TEACHER_FLAGS),
    );
    const ids = dashboard.students.map((s) => s.id);
    expect(ids.length - new Set(ids).size).toBe(1);
  });
});

describe("교사 학생 현황 Wire 화면", () => {
  it("다섯 구조마다 명단·상세·미리 보기 진입점을 보여준다", () => {
    render(<TeacherWireGallery fixture={fixture()} />);
    const proposals = screen.getAllByTestId("teacher-wire-proposal");
    expect(proposals).toHaveLength(5);
    for (const proposal of proposals) {
      expect(
        within(proposal).getByRole("heading", { name: "고른 개념" }),
      ).toBeInTheDocument();
      expect(
        within(proposal).getByRole("link", { name: "미리 보기" }),
      ).toHaveAttribute("href", "/dev/fading");
      expect(within(proposal).getByText("저장되지 않음")).toBeInTheDocument();
      expect(proposal.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    }
  });

  it("빈 반과 한 명 반을 실제 필터로 볼 수 있다", () => {
    const sample = fixture();
    render(<TeacherWireGallery fixture={sample} only="A" />);
    fireEvent.change(screen.getByLabelText("반 선택"), {
      target: { value: sample.dashboard.classes[0]!.id },
    });
    expect(screen.getByText("등록된 학생이 없습니다.")).toBeInTheDocument();
    expect(
      screen.getByText("학생을 선택하면 상세가 표시됩니다."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("반 선택"), {
      target: { value: sample.dashboard.classes[1]!.id },
    });
    expect(screen.getByText("학생 1명 · 등록 1건")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "김하윤" })).toBeInTheDocument();
  });

  it("행 대신 상세 단추로 학생을 바꾸고, 사유 분류의 중복을 밝힌다", () => {
    render(<TeacherWireGallery fixture={fixture()} only="D" />);
    fireEvent.click(
      screen.getByRole("button", { name: "계정 없음 김서준 상세" }),
    );
    expect(screen.getByRole("heading", { name: "김서준" })).toBeInTheDocument();
    expect(
      screen.getByText("여러 사유가 있으면 각 분류에 표시됩니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("고른 개념이 없습니다.")).toBeInTheDocument();
  });

  it("두 반의 학생을 중복 집계하지 않고 전체 명단을 펼칠 수 있다", () => {
    render(<TeacherWireGallery fixture={fixture()} only="A" />);
    expect(screen.getByText("학생 34명 · 등록 35건")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "등록 30건 더 보기" }));
    const roster = screen.getByRole("table", { name: "학생 명단" });
    expect(within(roster).getAllByRole("row")).toHaveLength(36);
    fireEvent.click(
      within(roster).getAllByRole("button", { name: "김하윤 상세" })[0]!,
    );
    const detail = screen.getByRole("complementary", {
      name: "김하윤 학생 상세",
    });
    expect(within(detail).getByText("개별반 · 중1 정규반")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("학생 이름"), {
      target: { value: "없는 학생" },
    });
    expect(screen.getByText("학생 0명 · 등록 0건")).toBeInTheDocument();
    expect(
      screen.getByText("학생을 선택하면 상세가 표시됩니다."),
    ).toBeInTheDocument();
  });

  it("학생별 최근 집계는 평가 건수이며 점수·정답률·문장·답을 그리지 않는다", () => {
    const sample = fixture();
    const { container } = render(<TeacherWireGallery fixture={sample} />);
    expect(container.textContent).not.toMatch(
      /기억 보존율|정답률|마스터|완전 습득|EXP|MathSRS|%|!/,
    );
    expect(screen.getAllByText("‘다시’ 외 평가")).toHaveLength(5);
    expect(
      container.querySelector("[data-answer], [data-correct], [data-trap]"),
    ).toBeNull();
    for (const row of container.querySelectorAll("tr")) {
      expect(row).not.toHaveAttribute("onclick");
      expect(row.className).not.toMatch(/cursor-pointer|hover:/);
    }
    expect(container.textContent).not.toContain(
      fadingCatalog()[0]!
        .propositions[0]!.pieces.map((p) =>
          p.kind === "text" ? p.text : p.target.text,
        )
        .join(""),
    );
  });
});
