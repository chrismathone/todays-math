/**
 * 🔴 RED → 🟢 — **진도 계획 화면** (22번 ④ · D-131 Hi-fi 2 «계기판 관» · 05 §8.10).
 *
 * 구현: src/components/class/ProgressPlanSection.tsx (수업 계획 카드 + 이번 주 예정 카드)
 *       src/components/class/ProgressPlanFields.tsx (요일 · 시작 차시 · 한 수업 · 시작일 · 자동 출제 — 반 만들기와 같이 쓴다)
 *       src/components/class/ClassManage.tsx (반 관리에 카드 · 반 만들기의 접힌 계획 칸)
 * 데이터: MSW — 기본은 «계획 없음», 계획이 있는 화면은 `server.use` 로 얹는다.
 *
 * 무엇을 잠그나(브리프 §3)
 * 1. 요일 토글은 **월요일부터** · 저장 요청은 **0=일** 번호.
 * 2. 저장 요청 모양 — 요일 · 시작 차시 · 한 수업 N차시(기본 1) · 시작일 · 자동 출제.
 * 3. 계기판 칸 색 — `data-state` 로 끝남·밀림·오늘·빈 칸이 갈린다 · 아래 한 줄 「3일 밀림」 · 칸은 누르는 것이 아니다(D-30).
 * 4. 🔴 저장하기 전에 결과를 본다 — 미리보기 경로(저장 안 함)를 부르고 칸이 바뀐다. 화면은 날짜를 펴지 않는다.
 * 5. 🔴 서버가 준 문구·칸 문구를 그대로 — 400/422 로 가르지 않는다.
 * 6. 반 만들기의 계획 칸은 **접어 둔다** — 「수업 계획 넣기」를 누르면 열린다 · 접힌 채면 계획 없이 만든다.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { ClassManage } from "@/components/class/ClassManage";
import { ProgressPlanSection } from "@/components/class/ProgressPlanSection";
import {
  classProgressPlanResponseSchema,
  type PlanScheduleEntity,
  type ProgressPlanEntity,
} from "@/contracts/dailyAutoTest.contract";
import { CLASS_A_ID, MOCK_UNITS } from "@/mocks/data";
import { mockPlanSchedule } from "@/mocks/handlers/progressPlan";
import { server } from "@/mocks/server";

// 반을 만들면 화면이 주소에 `?classId=` 를 적는다(c8de0a7bb) — jsdom 주소는 시험 사이에 남는다.
beforeEach(() => window.history.replaceState(null, "", "/"));

const TODAY = "2026-09-16"; // 수요일
const U = (i: number) => MOCK_UNITS[i]!;
const ref = (i: number) => ({
  id: U(i).id,
  grade: U(i).grade,
  chapter: U(i).chapter,
  section: U(i).section,
});

const SAVED: ProgressPlanEntity = {
  id: "70000000-0000-4000-8000-000000000001",
  classId: CLASS_A_ID,
  studentId: null,
  weekdays: [1, 3, 5],
  unitsPerLesson: 1,
  startUnitId: U(4).id,
  startDate: "2026-09-07",
  active: true,
};

/** 시안 Hi-fi 2 의 그림 — 9/14 월 밀림 · 9/16 수 오늘 · 9/18 금 · 9/21 월. */
const HIFI_SCHEDULE: PlanScheduleEntity = {
  from: "2026-09-14",
  to: "2026-09-27",
  rows: [
    {
      date: "2026-09-14",
      weekday: 1,
      lesson: true,
      planned: [ref(5)],
      actual: [ref(4)],
      driftDays: -3,
      atCurriculumEnd: false,
    },
    {
      date: "2026-09-16",
      weekday: 3,
      lesson: true,
      planned: [ref(5)],
      actual: [],
      driftDays: -3,
      atCurriculumEnd: false,
    },
    {
      date: "2026-09-18",
      weekday: 5,
      lesson: true,
      planned: [ref(6)],
      actual: [],
      driftDays: -3,
      atCurriculumEnd: false,
    },
    {
      date: "2026-09-21",
      weekday: 1,
      lesson: true,
      planned: [ref(7)],
      actual: [],
      driftDays: -3,
      atCurriculumEnd: false,
    },
  ],
};

type Captured = {
  puts: unknown[];
  previews: Array<{ body: unknown; day: string | null }>;
  gets: number;
};

/** 계획이 있는 반 — GET 은 저장된 계획(+예정), PUT·미리보기는 요청을 받아 적는다. */
function useSavedPlan(
  plan: ProgressPlanEntity | null = SAVED,
  schedule: PlanScheduleEntity | null = HIFI_SCHEDULE,
): Captured {
  const captured: Captured = { puts: [], previews: [], gets: 0 };
  server.use(
    http.get("/api/classes/:id/progress-plan", () => {
      captured.gets += 1;
      return HttpResponse.json(
        classProgressPlanResponseSchema.parse({
          data: { plan, schedule, studentPlans: [] },
        }),
      );
    }),
    http.put("/api/classes/:id/progress-plan", async ({ request }) => {
      const body = (await request.json()) as ProgressPlanEntity;
      captured.puts.push(body);
      return HttpResponse.json(
        { data: { ...SAVED, ...body, id: SAVED.id } },
        { status: 200 },
      );
    }),
    http.post("/api/classes/:id/progress-plan/preview", async ({ request }) => {
      const body = (await request.json()) as ProgressPlanEntity;
      captured.previews.push({
        body,
        day: new URL(request.url).searchParams.get("day"),
      });
      return HttpResponse.json({
        data: { schedule: mockPlanSchedule(CLASS_A_ID, body, TODAY) },
      });
    }),
  );
  return captured;
}

function renderSection() {
  const user = userEvent.setup();
  render(
    <ProgressPlanSection
      classId={CLASS_A_ID}
      units={MOCK_UNITS}
      today={TODAY}
    />,
  );
  return user;
}

const planCard = () =>
  within(screen.getByRole("region", { name: "수업 계획" }));
const scheduleCard = () =>
  within(screen.getByRole("region", { name: "이번 주 예정" }));
const dayButtons = (scope = planCard()) =>
  within(scope.getByRole("group", { name: "수업 요일" })).getAllByRole(
    "button",
  );

async function readySection() {
  const user = renderSection();
  await screen.findByRole("form", { name: "수업 계획" });
  return user;
}

async function pickStartUnit(
  user: ReturnType<typeof userEvent.setup>,
  scope: ReturnType<typeof within>,
  section: string,
) {
  await user.click(scope.getByRole("button", { name: /^시작 차시/ }));
  const picker = within(scope.getByRole("group", { name: "시작 차시 선택" }));
  await user.click(picker.getByRole("button", { name: section }));
}

describe("[D-131] 반 관리 › 수업 계획 카드", () => {
  it("🔴 요일 토글은 **월요일부터** — 월화수목금토일", async () => {
    await readySection();
    expect(dayButtons().map((b) => b.textContent)).toEqual([
      "월",
      "화",
      "수",
      "목",
      "금",
      "토",
      "일",
    ]);
  });

  it("🔴 저장 요청 모양 — 요일은 0=일 번호로 차례대로 · 한 수업 기본 1 · 시작일 기본 오늘 · 자동 출제 켬", async () => {
    const captured = useSavedPlan(null, null);
    const user = await readySection();
    const days = dayButtons();
    await user.click(days[6]!); // 일
    await user.click(days[2]!); // 수
    await user.click(days[0]!); // 월
    expect(days[6]).toHaveAttribute("aria-pressed", "true");
    await pickStartUnit(user, planCard(), U(2).section);
    await user.click(planCard().getByRole("button", { name: "저장" }));

    await waitFor(() => expect(captured.puts).toHaveLength(1));
    expect(captured.puts[0]).toEqual({
      weekdays: [0, 1, 3],
      unitsPerLesson: 1,
      startUnitId: U(2).id,
      startDate: TODAY,
      active: true,
    });
  });

  it("한 수업 N차시 · 시작일 · 자동 출제 끄기가 요청에 실린다", async () => {
    const captured = useSavedPlan(null, null);
    const user = await readySection();
    await user.click(dayButtons()[4]!); // 금
    await pickStartUnit(user, planCard(), U(0).section);
    await user.selectOptions(
      planCard().getByRole("combobox", { name: "한 수업" }),
      "2",
    );
    const date = planCard().getByLabelText("시작일");
    await user.clear(date);
    await user.type(date, "2026-09-21");
    const toggle = planCard().getByRole("switch", { name: "자동 출제" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(planCard().getByRole("button", { name: "저장" }));

    await waitFor(() => expect(captured.puts).toHaveLength(1));
    expect(captured.puts[0]).toEqual({
      weekdays: [5],
      unitsPerLesson: 2,
      startUnitId: U(0).id,
      startDate: "2026-09-21",
      active: false,
    });
  });

  it("저장된 계획을 불러와 요일·시작 차시·한 수업·시작일·켜짐을 채운다", async () => {
    useSavedPlan(
      { ...SAVED, weekdays: [0, 3], unitsPerLesson: 3, active: false },
      null,
    );
    await readySection();
    await waitFor(() =>
      expect(dayButtons()[2]).toHaveAttribute("aria-pressed", "true"),
    );
    expect(
      dayButtons().map((b) => b.getAttribute("aria-pressed") === "true"),
    ).toEqual([false, false, true, false, false, false, true]);
    expect(
      planCard().getByRole("button", { name: /^시작 차시/ }),
    ).toHaveTextContent(U(4).section);
    expect(planCard().getByRole("combobox", { name: "한 수업" })).toHaveValue(
      "3",
    );
    expect(planCard().getByLabelText("시작일")).toHaveValue("2026-09-07");
    expect(
      planCard().getByRole("switch", { name: "자동 출제" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("🔴 저장하면 「저장했습니다.」 — 예정은 서버에서 **다시 읽는다**(화면이 펴지 않는다)", async () => {
    const captured = useSavedPlan();
    const user = await readySection();
    await waitFor(() => expect(captured.gets).toBe(1));
    await user.click(planCard().getByRole("button", { name: "저장" }));
    expect(await planCard().findByRole("status")).toHaveTextContent(
      "저장했습니다.",
    );
    await waitFor(() => expect(captured.gets).toBe(2));
  });

  it.each([400, 422])(
    "🔴 저장이 거절되면(%i) 서버 문구와 칸 문구를 그대로 그린다 — 상태 코드로 가르지 않는다",
    async (status) => {
      useSavedPlan();
      server.use(
        http.put("/api/classes/:id/progress-plan", () =>
          HttpResponse.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "요청 값이 올바르지 않습니다.",
                details: [
                  {
                    field: "weekdays",
                    message: "수업 요일을 하나 이상 골라야 합니다.",
                  },
                ],
              },
            },
            { status },
          ),
        ),
      );
      const user = await readySection();
      await user.click(planCard().getByRole("button", { name: "저장" }));
      const alert = await planCard().findByRole("alert");
      expect(alert).toHaveTextContent("요청 값이 올바르지 않습니다.");
      expect(alert).toHaveTextContent("수업 요일을 하나 이상 골라야 합니다.");
    },
  );

  it("불러오지 못하면 알리고 다시 불러온다", async () => {
    let fail = true;
    server.use(
      http.get("/api/classes/:id/progress-plan", () =>
        fail
          ? HttpResponse.json(
              {
                error: {
                  code: "INTERNAL_ERROR",
                  message: "서버 오류가 발생했습니다.",
                },
              },
              { status: 500 },
            )
          : HttpResponse.json({
              data: { plan: null, schedule: null, studentPlans: [] },
            }),
      ),
    );
    const user = renderSection();
    expect(await planCard().findByRole("alert")).toBeInTheDocument();
    fail = false;
    await user.click(planCard().getByRole("button", { name: "다시 불러오기" }));
    expect(
      await screen.findByRole("form", { name: "수업 계획" }),
    ).toBeInTheDocument();
  });
});

describe("[D-131] 반 관리 › 이번 주 예정 — 계기판 관", () => {
  it("🔴 칸마다 data-state 로 끝남·밀림·오늘·빈 칸을 가르고, 칸 아래 날짜·차시 이름", async () => {
    useSavedPlan();
    await readySection();
    const cells = await scheduleCard().findAllByRole("listitem");
    expect(cells.map((c) => c.getAttribute("data-state"))).toEqual([
      "late",
      "now",
      "empty",
      "empty",
    ]);
    expect(cells[0]).toHaveTextContent("9/14 월");
    expect(cells[0]).toHaveTextContent("밀림");
    expect(cells[1]).toHaveTextContent("9/16 수");
    expect(cells[1]).toHaveTextContent(U(5).section);
    expect(cells[2]).toHaveTextContent(U(6).section);
  });

  it("🔴 아래 한 줄 「3일 밀림」 — 밀리지 않았으면 없다", async () => {
    useSavedPlan();
    await readySection();
    expect(await scheduleCard().findByText("3일 밀림")).toBeInTheDocument();
  });

  it("밀림이 없으면 「N일 밀림」 줄이 없다", async () => {
    useSavedPlan(SAVED, {
      ...HIFI_SCHEDULE,
      rows: HIFI_SCHEDULE.rows.map((r) => ({ ...r, driftDays: 0 })),
    });
    await readySection();
    await scheduleCard().findAllByRole("listitem");
    expect(scheduleCard().queryByText(/일 밀림$/)).not.toBeInTheDocument();
  });

  it("🔴 칸은 누르는 것이 아니다 — 단추가 없고 손가락 커서·hover 가 없다(D-30)", async () => {
    useSavedPlan();
    await readySection();
    const list = await scheduleCard().findByRole("list", { name: "수업일" });
    expect(within(list).queryAllByRole("button")).toEqual([]);
    for (const el of [list, ...list.querySelectorAll("*")])
      expect(el.getAttribute("class") ?? "").not.toMatch(
        /cursor-pointer|hover:/,
      );
  });

  it("계획이 없고 아직 고르지 않았으면 「수업 계획이 없습니다.」 — 미리보기도 부르지 않는다", async () => {
    const captured = useSavedPlan(null, null);
    await readySection();
    expect(
      scheduleCard().getByText("수업 계획이 없습니다."),
    ).toBeInTheDocument();
    expect(captured.previews).toEqual([]);
  });

  it("🔴 저장하기 전에 결과를 본다 — 요일을 바꾸면 미리보기 경로를 부르고 칸이 바뀐다 · 저장은 안 나간다", async () => {
    const captured = useSavedPlan();
    const user = await readySection();
    await scheduleCard().findAllByRole("listitem");
    await user.click(dayButtons()[1]!); // 화 더하기

    await waitFor(() => expect(captured.previews.length).toBeGreaterThan(0));
    const last = captured.previews[captured.previews.length - 1]!;
    expect(last.day).toBe(TODAY);
    expect(last.body).toEqual({
      weekdays: [1, 2, 3, 5],
      unitsPerLesson: 1,
      startUnitId: SAVED.startUnitId,
      startDate: SAVED.startDate,
      active: true,
    });
    const expected = mockPlanSchedule(
      CLASS_A_ID,
      last.body as ProgressPlanEntity,
      TODAY,
    );
    await waitFor(() =>
      expect(
        scheduleCard()
          .getAllByRole("listitem")
          .map((c) => c.getAttribute("data-date")),
      ).toEqual(expected.rows.map((r) => r.date)),
    );
    expect(scheduleCard().getByText("저장 전 미리보기")).toBeInTheDocument();
    expect(captured.puts).toEqual([]);
  });

  it("되돌리면(저장된 규칙과 같아지면) 저장된 예정으로 돌아간다", async () => {
    const captured = useSavedPlan();
    const user = await readySection();
    await scheduleCard().findAllByRole("listitem");
    await user.click(dayButtons()[1]!);
    await waitFor(() => expect(captured.previews.length).toBeGreaterThan(0));
    await user.click(dayButtons()[1]!);
    await waitFor(() =>
      expect(scheduleCard().getAllByRole("listitem")).toHaveLength(4),
    );
    expect(scheduleCard().queryByText("저장 전 미리보기")).toBeNull();
  });
});

describe("[D-131] 반 관리 — 카드 자리 · 반 만들기의 접힌 계획 칸", () => {
  function classForm() {
    return within(screen.getByRole("form", { name: "반 추가" }));
  }

  async function readyManage() {
    const user = userEvent.setup();
    render(<ClassManage units={MOCK_UNITS} canManageRoster />);
    await screen.findByText("이서준");
    return user;
  }

  function captureCreate() {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post("/api/classes", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        bodies.push(body);
        const now = new Date().toISOString();
        return HttpResponse.json(
          {
            data: {
              id: "20000000-0000-4000-8000-000000000055",
              userId: "10000000-0000-4000-8000-000000000001",
              name: body.name,
              grade: body.grade,
              defaultProblemCount: 8,
              difficultyRatio: {
                연산: 1,
                기본: 2,
                응용: 3,
                심화하: 2,
                심화중: 0,
                심화상: 0,
              },
              createdAt: now,
              updatedAt: now,
            },
          },
          { status: 201 },
        );
      }),
    );
    return bodies;
  }

  it("고른 반에 «수업 계획» · «이번 주 예정» 카드가 선다", async () => {
    await readyManage();
    expect(
      await screen.findByRole("region", { name: "수업 계획" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "이번 주 예정" }),
    ).toBeInTheDocument();
  });

  it("🔴 반 만들기의 계획 칸은 접혀 있다 — 「수업 계획 넣기」를 누르면 열린다", async () => {
    const user = await readyManage();
    const toggle = classForm().getByRole("button", { name: "수업 계획 넣기" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(classForm().queryByRole("group", { name: "수업 요일" })).toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      classForm().getByRole("group", { name: "수업 요일" }),
    ).toBeInTheDocument();
  });

  /** 🔴 D-133 ⑿ — 열면 글자가 «수업 계획 접기», 다시 누르면 «수업 계획 넣기». aria-expanded 는 그대로 따라간다. */
  it("🔴 열면 「수업 계획 접기」 — 다시 누르면 접히고 「수업 계획 넣기」", async () => {
    const user = await readyManage();
    const toggle = classForm().getByRole("button", { name: "수업 계획 넣기" });

    await user.click(toggle);
    expect(toggle).toHaveTextContent(/^수업 계획 접기$/);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      classForm().queryByRole("button", { name: "수업 계획 넣기" }),
    ).toBeNull();

    await user.click(
      classForm().getByRole("button", { name: "수업 계획 접기" }),
    );
    expect(toggle).toHaveTextContent(/^수업 계획 넣기$/);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(classForm().queryByRole("group", { name: "수업 요일" })).toBeNull();
  });

  it("접어 둔 채 만들면 계획 없이 만든다 — 요청에 progressPlan 이 없다", async () => {
    const bodies = captureCreate();
    const user = await readyManage();
    await user.type(
      classForm().getByRole("textbox", { name: "반 이름" }),
      "새반",
    );
    await user.type(classForm().getByRole("textbox", { name: "학년" }), "중3");
    await user.click(classForm().getByRole("button", { name: "반 추가" }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ name: "새반", grade: "중3" });
  });

  it("🔴 열어서 고르면 반과 계획을 같이 보낸다 — 요일은 0=일 번호", async () => {
    const bodies = captureCreate();
    const user = await readyManage();
    await user.type(
      classForm().getByRole("textbox", { name: "반 이름" }),
      "새반",
    );
    await user.type(classForm().getByRole("textbox", { name: "학년" }), "중2");
    await user.click(
      classForm().getByRole("button", { name: "수업 계획 넣기" }),
    );
    const days = dayButtons(classForm());
    await user.click(days[1]!); // 화
    await user.click(days[6]!); // 일
    await pickStartUnit(user, classForm(), U(1).section);
    await user.click(classForm().getByRole("button", { name: "반 추가" }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    const plan = bodies[0]!.progressPlan as Record<string, unknown>;
    expect(plan).toMatchObject({
      weekdays: [0, 2],
      unitsPerLesson: 1,
      startUnitId: U(1).id,
      active: true,
    });
    expect(plan.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("🔴 계획이 거절되면 서버 문구를 그리고 입력을 남긴다", async () => {
    server.use(
      http.post("/api/classes", () =>
        HttpResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "시작 차시를 찾을 수 없습니다.",
              details: [
                {
                  field: "progressPlan.startUnitId",
                  message: "시작 차시를 찾을 수 없습니다.",
                },
              ],
            },
          },
          { status: 422 },
        ),
      ),
    );
    const user = await readyManage();
    await user.type(
      classForm().getByRole("textbox", { name: "반 이름" }),
      "새반",
    );
    await user.type(classForm().getByRole("textbox", { name: "학년" }), "중2");
    await user.click(
      classForm().getByRole("button", { name: "수업 계획 넣기" }),
    );
    await user.click(dayButtons(classForm())[0]!);
    await pickStartUnit(user, classForm(), U(1).section);
    await user.click(classForm().getByRole("button", { name: "반 추가" }));

    expect(await classForm().findByRole("alert")).toHaveTextContent(
      "시작 차시를 찾을 수 없습니다.",
    );
    expect(classForm().getByRole("textbox", { name: "반 이름" })).toHaveValue(
      "새반",
    );
    expect(dayButtons(classForm())[0]).toHaveAttribute("aria-pressed", "true");
  });
});
