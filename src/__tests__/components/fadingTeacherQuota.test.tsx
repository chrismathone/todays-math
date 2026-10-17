import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FadingTeacherStudent } from "@/contracts/fadingTeacher.contract";
import { fadingCatalog } from "@/lib/fading/catalog";
import { buildTeacherWireFixture } from "@/components/fading/teacher/fixture";
import { createTeacherFixtureSource } from "@/components/fading/teacher/fixtureSource";
import { TeacherFadingSourceError } from "@/components/fading/teacher/source";
import { TeacherFadingStatus } from "@/components/fading/teacher/TeacherFadingStatus";

/**
 * 학생 상세의 «오늘 추가 확인» · «하루 분량» — Hi-fi Q2(원장님 선택 2026-10-17). 픽스처의 박지안(상태 확인반)은 오늘 30회를 다 했고,
 * 한 문장이 «틀림» 3회로 멈췄고, 최근 7일 중 3일 상한에 닿았다.
 */

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
const classId = fixture.dashboard.classes[3]!.id;

async function openJian(source = createTeacherFixtureSource(fixture)) {
  render(
    <TeacherFadingStatus
      {...source}
      preview={preview}
      initialClass={classId}
    />,
  );
  const roster = await screen.findByRole("table", { name: "전체 명단" });
  fireEvent.click(within(roster).getByRole("button", { name: /박지안/ }));
  const detail = await screen.findByRole("complementary", {
    name: "박지안 학생 상세",
  });
  await within(detail).findByRole("heading", { name: "박지안" });
  return detail;
}

describe("오늘 추가 확인", () => {
  it("판정한 확인 · 내일 이어서 · 멈춘 문장 · 최근 7일 — 필요한 상태에만 딱지", async () => {
    const detail = await openJian();
    const card = within(detail).getByRole("region", { name: "오늘 추가 확인" });
    expect(within(card).getByText("하루 상한 도달")).toBeInTheDocument();
    expect(within(card).getByText("판정한 확인").nextSibling).toHaveTextContent(
      "30회",
    );
    expect(within(card).getByText("내일 이어서")).toBeInTheDocument();
    expect(within(card).getByText("보충 필요")).toBeInTheDocument();
    expect(
      within(card).getByRole("list", { name: "오늘 멈춘 문장" }).children,
    ).toHaveLength(1);
    expect(
      within(card).getByText(/최근 7일 중 3일 상한 도달/),
    ).toBeInTheDocument();
    expect(within(card).getByText("분량 점검 필요")).toBeInTheDocument();
  });
});

describe("하루 분량", () => {
  it("고르면 «저장 전», 저장하면 «저장됨 · 내일부터» — 오늘 적용 값은 그대로다", async () => {
    const detail = await openJian();
    const card = within(detail).getByRole("region", { name: "하루 분량" });
    expect(card).toHaveTextContent("오늘 적용 서비스 기본(현재 15칸)");
    const save = within(card).getByRole("button", { name: "저장" });
    expect(save).toBeDisabled();
    fireEvent.change(within(card).getByLabelText("10/7부터"), {
      target: { value: "10" },
    });
    expect(card).toHaveTextContent("변경안 10/7부터 학생 지정 10칸 · 저장 전");
    fireEvent.click(save);
    expect(
      await within(card).findByText("저장됨 · 10/7부터 학생 지정 10칸"),
    ).toHaveAttribute("role", "status");
    expect(card).toHaveTextContent("오늘 적용 서비스 기본(현재 15칸)");
    expect(within(card).getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("다른 사람이 먼저 바꿨으면 덮어쓰지 않는다 — 알리고, 최신 설정을 불러온 뒤 다시 저장한다", async () => {
    const base = createTeacherFixtureSource(fixture);
    const setQuota = vi
      .fn<NonNullable<typeof base.setQuota>>()
      .mockRejectedValueOnce(new TeacherFadingSourceError(409));
    const detail = await openJian({ ...base, setQuota });
    const card = within(detail).getByRole("region", { name: "하루 분량" });
    fireEvent.change(within(card).getByLabelText("10/7부터"), {
      target: { value: "20" },
    });
    fireEvent.click(within(card).getByRole("button", { name: "저장" }));
    const alert = await within(card).findByRole("alert");
    expect(alert).toHaveTextContent(
      "분량 설정이 변경되었습니다. 최신 설정을 확인한 뒤 다시 저장해 주세요.",
    );
    expect(alert).toHaveTextContent("내 변경안 학생 지정 20칸");
    expect(
      within(card).getByRole("button", { name: "최신 설정 불러오기" }),
    ).toBeInTheDocument();
    expect(setQuota).toHaveBeenCalledTimes(1);
  });

  it("저장하지 못하면 고른 값을 남기고 «다시 저장»", async () => {
    const base = createTeacherFixtureSource(fixture);
    const detail = await openJian({
      ...base,
      setQuota: vi.fn().mockRejectedValue(new TeacherFadingSourceError(500)),
    });
    const card = within(detail).getByRole("region", { name: "하루 분량" });
    fireEvent.change(within(card).getByLabelText("10/7부터"), {
      target: { value: "10" },
    });
    fireEvent.click(within(card).getByRole("button", { name: "저장" }));
    expect(await within(card).findByRole("alert")).toHaveTextContent(
      "저장하지 못했습니다. 다시 시도해 주세요.",
    );
    expect(within(card).getByLabelText("10/7부터")).toHaveValue("10");
    expect(
      within(card).getByRole("button", { name: "다시 저장" }),
    ).toBeEnabled();
  });

  it("강사는 보기만 — 고르기 · 저장이 없고 누가 바꾸는지 알린다", async () => {
    const base = createTeacherFixtureSource(fixture);
    const detail = await openJian({
      ...base,
      getStudent: async (studentId, cls) => {
        const { data } = await base.getStudent(studentId, cls);
        return {
          data: {
            ...data,
            quota: { ...data.quota!, canEdit: false },
          } satisfies FadingTeacherStudent,
        };
      },
    });
    const card = within(detail).getByRole("region", { name: "하루 분량" });
    expect(within(card).queryByRole("combobox")).toBeNull();
    expect(within(card).queryByRole("button")).toBeNull();
    expect(card).toHaveTextContent(
      "분량 변경은 원장 · 지점 관리자가 할 수 있습니다.",
    );
  });
});

describe("codex 4차 — 카드의 상태", () => {
  const withQuota = (
    quota: NonNullable<FadingTeacherStudent["quota"]>,
    calls: { n: number } = { n: 0 },
    later?: NonNullable<FadingTeacherStudent["quota"]>,
  ) => {
    const base = createTeacherFixtureSource(fixture);
    return {
      ...base,
      getStudent: async (studentId: string, cls: string) => {
        const { data } = await base.getStudent(studentId, cls);
        calls.n += 1;
        return {
          data: { ...data, quota: calls.n > 1 && later ? later : quota },
        };
      },
    };
  };

  it("예약이 «서비스 기본»이면 고르기도 서비스 기본을 가리킨다 — 오늘의 학생 지정 값이 아니다", async () => {
    const detail = await openJian(
      withQuota({
        today: { quota: 10, slots: 10 },
        next: { quota: null, slots: 15, on: "2026-10-07" },
        revision: 2,
        canEdit: true,
      }),
    );
    const card = within(detail).getByRole("region", { name: "하루 분량" });
    expect(within(card).getByLabelText("10/7부터")).toHaveValue("default");
    expect(card).toHaveTextContent("예약 10/7부터 서비스 기본(현재 15칸)");
    expect(card).not.toHaveTextContent("저장 전");
    expect(within(card).getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("«최신 설정 불러오기»는 내 변경안을 지우지 않는다 — 최신 예약과 내 변경안이 함께 보인다", async () => {
    const start = {
      today: { quota: null, slots: 15 },
      next: null,
      revision: 0,
      canEdit: true,
    } as const;
    const latest = {
      ...start,
      next: { quota: 10, slots: 10, on: "2026-10-07" },
      revision: 1,
    } as const;
    const source = {
      ...withQuota(start, { n: 0 }, latest),
      setQuota: vi.fn().mockRejectedValue(new TeacherFadingSourceError(409)),
    };
    const detail = await openJian(source);
    const card = within(detail).getByRole("region", { name: "하루 분량" });
    fireEvent.change(within(card).getByLabelText("10/7부터"), {
      target: { value: "20" },
    });
    fireEvent.click(within(card).getByRole("button", { name: "저장" }));
    fireEvent.click(
      await within(card).findByRole("button", { name: "최신 설정 불러오기" }),
    );
    expect(
      await within(card).findByText(
        "최신 설정을 불러왔습니다. 변경안을 확인한 뒤 저장해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(within(card).getByLabelText("10/7부터")).toHaveValue("20");
    expect(card).toHaveTextContent("예약 10/7부터 학생 지정 10칸");
    expect(card).toHaveTextContent("변경안 10/7부터 학생 지정 20칸 · 저장 전");
    expect(within(card).getByRole("button", { name: "저장" })).toBeEnabled();
  });
});
