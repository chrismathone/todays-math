/**
 * 🔴 RED → 🟢 — 메인 상단 「오늘의 확인테스트」 계기판 (2단계 화면, D-63·D-64).
 *
 * 구현: src/components/main/DailyReviewSection.tsx (+ MainScreen 배선)
 * 데이터: MSW — 기본 핸들러는 «연계 없음», 여기서 server.use 로 풍부한 픽스처를 얹는다.
 *
 * ⚠️ 섹션을 **직접** 그린다(2026-09-16 화면 트랙). 예전엔 `app/(main)/page` 를 그렸는데 그 페이지가
 *    작업실·계정 전환(df1eb904) 뒤 `server-only` 모듈을 불러 **파일째 못 읽히고 있었다**(시험 0건 — «빨간 4파일»).
 *    MainScreen 배선은 `MainScreen.tsx` 한 줄이라 이 파일은 섹션만 잠근다.
 *
 * 무엇을 잠그나
 * 1. 첫 줄은 짧게 「오늘 초안 N장」 · 칩 「밀림 N명 · 최대 D일」(하나 — D-133)·「문항 부족 N명」·「시험기간 N명」(D-131 · 05 §8.10).
 * 2. 「모두 출제」 — 자동 묶음 학생별로 POST /api/tests/generate 를 부르되,
 *    **오늘 시험이 이미 있는 학생은 건너뛴다**(중복 초안 금지). 성공하면 검수 링크.
 * 3. 시험기간 학생은 원문 줄과 함께 «표시만» — 출제 요청이 안 나간다.
 * 4. 동기화가 48시간 넘으면 「오래됨」 경고.
 * 5. 🔴 문지기 — eywa 소유자이거나 **계획이 있으면** 섹션이 선다(D-131). 동기화 줄은 소유자에게만.
 * 6. 오늘 대상이 없으면 「오늘 수업 계획이 없습니다.」 · 오늘 대상이 없는 반은 수만 「오늘 수업 계획이 없는 반 N개」(D-133).
 * 7. 🔴 검수 줄의 «자동 출제» 표지 — 아침 회차가 세운 시험지(`todayTests[].autoDraft`)의 이름 바로 뒤(D-133).
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DailyReviewSection } from "@/components/main/DailyReviewSection";
import { dailyReviewResponseSchema } from "@/contracts/test.contract";
import { CLASS_A_ID, MOCK_UNITS, STUDENT_IDS } from "@/mocks/data";
import { server } from "@/mocks/server";

// MainScreen 이 반 0개면 온보딩으로 보낸다(useRouter) — 여기서는 반이 있으므로 안 불린다.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const DAY = "2026-08-21";
const UNIT_A = MOCK_UNITS[0]!; // 중2 1. 수와 식 첫 차시
const UNIT_B = MOCK_UNITS[1]!;
const EXISTING_TEST_ID = "90000000-0000-4000-8000-000000000777";

const st = (i: number, name: string) => ({
  id: STUDENT_IDS[i]!,
  name,
  classId: CLASS_A_ID,
  grade: "중2",
  className: "테스트반",
});

/** 자동 1묶음(2명, 그중 1명은 이미 오늘 시험 있음) + 부족 1묶음 + 시험기간 1명. */
function richDaily(syncRanAt: string) {
  return dailyReviewResponseSchema.parse({
    data: {
      day: DAY,
      eywaOwner: true,
      sync: {
        ranAt: syncRanAt,
        students: 193,
        classes: 2,
        progressRows: 13571,
        unresolvedLines: 3999,
        ambiguous: 97,
      },
      attended: 4,
      auto: [
        {
          key: `${UNIT_A.id}~${UNIT_B.id}`,
          rangeStartUnitId: UNIT_A.id,
          rangeEndUnitId: UNIT_B.id,
          startedFrom: "chapter-start",
          unitCount: 2,
          neededCount: 8,
          capacity: 24,
          students: [st(0, "김민준"), st(1, "이서연")],
        },
      ],
      lacking: [
        {
          key: `${UNIT_B.id}~${UNIT_B.id}`,
          rangeStartUnitId: UNIT_B.id,
          rangeEndUnitId: UNIT_B.id,
          startedFrom: "progress-start",
          unitCount: 1,
          neededCount: 8,
          capacity: 2,
          students: [st(2, "박도윤")],
        },
      ],
      examOrUnread: [{ ...st(3, "최하은"), lines: ["수학 내신대비"] }],
      noRange: [],
      hasPlan: true,
      delayed: [{ ...st(0, "김민준"), days: 3 }],
      noLessonClasses: [],
      todayTests: [
        {
          studentId: STUDENT_IDS[1]!,
          studentName: "이서연",
          testId: EXISTING_TEST_ID,
          status: "draft",
          autoDraft: false,
        },
      ],
    },
  });
}

function useRichHandlers(opts?: { syncRanAt?: string }) {
  const generated: Array<Record<string, unknown>> = [];
  server.use(
    http.get("/api/tests/daily-review", () =>
      HttpResponse.json(richDaily(opts?.syncRanAt ?? new Date().toISOString())),
    ),
    http.post("/api/tests/generate", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      generated.push(body);
      return HttpResponse.json(
        {
          data: {
            test: {
              id: `90000000-0000-4000-8000-00000000090${generated.length}`,
            },
          },
        },
        { status: 201 },
      );
    }),
  );
  return generated;
}

async function findSection() {
  return await screen.findByRole("region", { name: "오늘의 확인테스트" });
}

describe("[2단계] 메인 상단 계기판 — 오늘의 확인테스트", () => {
  it("🔴 eywa 소유자도 아니고 계획도 없으면 섹션 자체가 없다 — 남의 학원 동기화 상태를 새 계정이 보던 자리", async () => {
    server.use(
      http.get("/api/tests/daily-review", () =>
        HttpResponse.json(
          dailyReviewResponseSchema.parse({
            data: {
              day: DAY,
              eywaOwner: false,
              sync: null,
              attended: 0,
              auto: [],
              lacking: [],
              examOrUnread: [],
              noRange: [],
              hasPlan: false,
              delayed: [],
              noLessonClasses: [],
              todayTests: [],
            },
          }),
        ),
      ),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    // 읽기가 끝난 뒤에도(불러오는 중 뼈대가 사라진 뒤에도) 섹션이 없어야 한다.
    await waitFor(() =>
      expect(
        screen.queryByRole("status", {
          name: "오늘의 확인테스트를 불러오는 중",
        }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("region", { name: "오늘의 확인테스트" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/eywa 동기화/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "지금 가져오기" }),
    ).not.toBeInTheDocument();
  });

  it("🔴 첫 줄은 짧게 「오늘 초안 N장」 — 시각을 적지 않는다 · 칩 「3일 밀림」·「문항 부족」·「시험기간」", async () => {
    useRichHandlers();
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    // 오늘 초안 = 오늘 확인테스트 중 아직 초안인 것(이서연 1장)
    expect(
      await within(section).findByText("오늘 초안 1장"),
    ).toBeInTheDocument();
    expect(within(section).queryByText(/아침|8시/)).not.toBeInTheDocument();
    const chips = within(
      within(section).getByRole("list", { name: "손 갈 곳" }),
    )
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(chips).toEqual([
      "밀림 1명 · 최대 3일",
      "문항 부족 1명",
      "시험기간 1명",
    ]);
    // 부족 묶음에는 사유(문항 수/필요 수)와 직접 출제 동선이 있다
    expect(within(section).getByText("문항 2/8")).toBeInTheDocument();
  });

  /** 🔴 핵심 배선 — 이미 시험이 있는 이서연은 건너뛰고 김민준만 출제한다. */
  it("모두 출제 — 오늘 시험이 없는 학생만 학생별로 POST 한다", async () => {
    const generated = useRichHandlers();
    const user = userEvent.setup();
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    const button = await within(section).findByRole("button", {
      name: "모두 출제 (1명)",
    });
    await user.click(button);
    await waitFor(() => {
      expect(generated).toHaveLength(1);
    });
    expect(generated[0]).toMatchObject({
      classId: CLASS_A_ID,
      studentId: STUDENT_IDS[0],
      testType: "review",
      testDate: DAY,
      rangeStartUnitId: UNIT_A.id,
      rangeEndUnitId: UNIT_B.id,
    });
    // 끝나면 두 학생 다 검수 링크가 있고, 버튼은 「모두 출제됨」으로 잠긴다
    await within(section).findByRole("button", { name: "모두 출제됨" });
    // 방금 만든 초안도 «오늘 초안»으로 센다
    expect(within(section).getByText("오늘 초안 2장")).toBeInTheDocument();
    expect(
      within(section).getByRole("link", { name: "김민준" }),
    ).toHaveAttribute("href", expect.stringContaining("/tests/"));
    expect(
      within(section).getByRole("link", { name: "이서연" }),
    ).toHaveAttribute("href", `/tests/${EXISTING_TEST_ID}`);
  });

  it("시험기간 학생은 원문 줄과 함께 표시만 — 펼치면 사유가 보인다", async () => {
    useRichHandlers();
    const user = userEvent.setup();
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    await user.click(
      await within(section).findByText(
        "시험기간·진도 못 읽음 1명 — 자동 출제 제외",
      ),
    );
    expect(within(section).getByText("수학 내신대비")).toBeInTheDocument();
    expect(within(section).getByText("최하은")).toBeInTheDocument();
  });

  /** 🔴 지금 가져오기 — POST /api/eywa-sync 후 섹션을 새로 읽는다. */
  it("지금 가져오기 — 동기화를 부르고 끝나면 다시 읽는다", async () => {
    useRichHandlers();
    let syncCalls = 0;
    let reviewCalls = 0;
    server.use(
      http.get("/api/tests/daily-review", () => {
        reviewCalls += 1;
        return HttpResponse.json(richDaily(new Date().toISOString()));
      }),
      http.post("/api/eywa-sync", () => {
        syncCalls += 1;
        return HttpResponse.json({
          data: {
            runId: "r1",
            students: 193,
            classes: 62,
            progressRows: 13571,
            unresolvedLines: 3999,
            ambiguous: 97,
          },
        });
      }),
    );
    const user = userEvent.setup();
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    const before = reviewCalls;
    await user.click(
      await within(section).findByRole("button", { name: "지금 가져오기" }),
    );
    await waitFor(() => {
      expect(syncCalls).toBe(1);
      expect(reviewCalls).toBeGreaterThan(before);
    });
  });

  it("동기화가 48시간을 넘으면 「오래됨」 경고가 선다", async () => {
    useRichHandlers({
      syncRanAt: new Date(Date.now() - 72 * 3_600_000).toISOString(),
    });
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    await within(section).findByText("오래됨 — 48시간 넘음");
  });
});

/** 🔴 D-131 — 문지기 · 계획이 없는 날 · 밀림 칩 여럿. */
describe("[D-131] 오늘의 확인테스트 — 계획이 있으면 누구에게나", () => {
  function planOnly(over: Record<string, unknown> = {}) {
    return dailyReviewResponseSchema.parse({
      data: {
        ...richDaily(new Date().toISOString()).data,
        eywaOwner: false,
        sync: null,
        ...over,
      },
    });
  }

  it("🔴 eywa 소유자가 아니어도 계획이 있으면 섹션이 선다 — 동기화 줄은 없다", async () => {
    server.use(
      http.get("/api/tests/daily-review", () => HttpResponse.json(planOnly())),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    expect(
      await within(section).findByText("오늘 초안 1장"),
    ).toBeInTheDocument();
    expect(within(section).queryByText(/eywa 동기화/)).not.toBeInTheDocument();
    expect(
      within(section).queryByRole("button", { name: "지금 가져오기" }),
    ).not.toBeInTheDocument();
  });

  it("🔴 오늘 대상이 없으면 「오늘 수업 계획이 없습니다.」 — 보고서 문구가 아니다", async () => {
    server.use(
      http.get("/api/tests/daily-review", () =>
        HttpResponse.json(
          planOnly({
            attended: 0,
            auto: [],
            lacking: [],
            examOrUnread: [],
            delayed: [],
            todayTests: [],
            noLessonClasses: [
              { id: CLASS_A_ID, name: "중2 심화반", grade: "중2" },
            ],
          }),
        ),
      ),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    expect(
      await within(section).findByText("오늘 수업 계획이 없습니다."),
    ).toBeInTheDocument();
    expect(within(section).queryByText(/보고서/)).not.toBeInTheDocument();
    expect(within(section).queryByText(/오늘 초안/)).not.toBeInTheDocument();
  });

  /** 🔴 D-133 ⑻ — 반 이름을 늘어놓지 않는다. 관리자 계정은 역할 계정 반까지 보여 이름 줄이 길어진다. */
  it("🔴 오늘 대상이 없는 반은 수만 — 「오늘 수업 계획이 없는 반 N개」 · 반 이름은 없다", async () => {
    server.use(
      http.get("/api/tests/daily-review", () =>
        HttpResponse.json(
          planOnly({
            noLessonClasses: [
              { id: CLASS_A_ID, name: "중1 B반", grade: "중1" },
              {
                id: "20000000-0000-4000-8000-000000000077",
                name: "중3 A반",
                grade: "중3",
              },
            ],
          }),
        ),
      ),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    expect(
      await within(section).findByText("오늘 수업 계획이 없는 반 2개"),
    ).toBeInTheDocument();
    expect(within(section).queryByText(/중1 B반|중3 A반/)).toBeNull();
    // 대상이 있는 날에는 «오늘 수업 계획이 없습니다.» 한 줄이 서지 않는다(그건 대상 0 인 날의 문구)
    expect(
      within(section).queryByText("오늘 수업 계획이 없습니다."),
    ).toBeNull();
  });

  it("오늘 대상이 없는 반이 없으면 반 수 줄이 없다", async () => {
    server.use(
      http.get("/api/tests/daily-review", () => HttpResponse.json(planOnly())),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    await within(section).findByText("오늘 초안 1장");
    expect(within(section).queryByText(/오늘 수업 계획이 없는 반/)).toBeNull();
  });

  /** 🔴 D-133 ⑺ — 날마다 칩이던 것을 하나로. N = 밀린 학생 수, D = 가장 많이 밀린 일 수. */
  it("🔴 밀림 칩은 하나 — 「밀림 N명 · 최대 D일」(가장 많이 밀린 날) · 경고 결", async () => {
    server.use(
      http.get("/api/tests/daily-review", () =>
        HttpResponse.json(
          planOnly({
            lacking: [],
            examOrUnread: [],
            // 맨 앞 학생이 가장 많이 밀린 학생이 아니다 — 「첫 학생의 일 수」와 「최대」가 갈린다
            delayed: [
              { ...st(0, "김민준"), days: 3 },
              { ...st(1, "이서연"), days: 5 },
              { ...st(2, "박도윤"), days: 5 },
            ],
          }),
        ),
      ),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    const list = await within(section).findByRole("list", { name: "손 갈 곳" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["밀림 3명 · 최대 5일"]);
    expect(items[0]!.className).toContain("text-g-red-text");
  });

  it("밀린 학생이 없으면 밀림 칩이 없다", async () => {
    server.use(
      http.get("/api/tests/daily-review", () =>
        HttpResponse.json(planOnly({ delayed: [] })),
      ),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    const list = await within(section).findByRole("list", { name: "손 갈 곳" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["문항 부족 1명", "시험기간 1명"]);
  });

  it("「오늘 초안」은 초안만 센다 — 확정·인쇄한 시험지는 빠진다", async () => {
    server.use(
      http.get("/api/tests/daily-review", () =>
        HttpResponse.json(
          planOnly({
            todayTests: [
              {
                studentId: STUDENT_IDS[0]!,
                studentName: "김민준",
                testId: "90000000-0000-4000-8000-000000000701",
                status: "draft",
                autoDraft: false,
              },
              {
                studentId: STUDENT_IDS[1]!,
                studentName: "이서연",
                testId: "90000000-0000-4000-8000-000000000702",
                status: "confirmed",
                autoDraft: false,
              },
              {
                studentId: STUDENT_IDS[2]!,
                studentName: "박도윤",
                testId: "90000000-0000-4000-8000-000000000703",
                status: "printed",
                autoDraft: false,
              },
            ],
          }),
        ),
      ),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    expect(
      await within(section).findByText("오늘 초안 1장"),
    ).toBeInTheDocument();
  });

  it("칩은 누르는 것이 아니다 — 단추가 아니고 손가락 커서가 없다(D-30)", async () => {
    server.use(
      http.get("/api/tests/daily-review", () => HttpResponse.json(planOnly())),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    const list = await within(section).findByRole("list", { name: "손 갈 곳" });
    expect(within(list).queryAllByRole("button")).toEqual([]);
    for (const el of [list, ...list.querySelectorAll("*")])
      expect(el.getAttribute("class") ?? "").not.toMatch(
        /cursor-pointer|hover:/,
      );
  });
});

/**
 * 🔴 D-133 ⑵ — «자동 출제» 표지: 메인 검수 줄(«출제됨 N명 — 검수: 이름 …»)의 **이름 바로 뒤**.
 *    근거는 응답의 `todayTests[].autoDraft` 하나(= 시험지의 `auto_draft_run_id`). 시각으로 짐작하지 않는다.
 *    모양은 05 §8.10 — 흰 바탕 · 파랑 1px 테두리·글자 · 11px 700 · 안쪽 2px 8px · 모서리 4px. 누르는 것이 아니다(D-30).
 */
describe("[D-133] 오늘의 확인테스트 — 검수 줄의 «자동 출제» 표지", () => {
  function withTodayTests(
    todayTests: Array<{ i: number; autoDraft: boolean; status?: string }>,
  ) {
    const base = richDaily(new Date().toISOString()).data;
    return dailyReviewResponseSchema.parse({
      data: {
        ...base,
        todayTests: todayTests.map(({ i, autoDraft, status }) => ({
          studentId: STUDENT_IDS[i]!,
          studentName: ["김민준", "이서연", "박도윤", "최하은", "정우진"][i]!,
          testId: `90000000-0000-4000-8000-00000000080${i}`,
          status: status ?? "draft",
          autoDraft,
        })),
      },
    });
  }

  async function renderWith(body: ReturnType<typeof withTodayTests>) {
    const generated: unknown[] = [];
    server.use(
      http.get("/api/tests/daily-review", () => HttpResponse.json(body)),
      http.post("/api/tests/generate", async ({ request }) => {
        generated.push(await request.json());
        return HttpResponse.json(
          { data: { test: { id: "90000000-0000-4000-8000-000000000999" } } },
          { status: 201 },
        );
      }),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    return { section: await findSection(), generated };
  }

  const tagAfter = (link: HTMLElement) => {
    const next = link.nextElementSibling;
    return next?.hasAttribute("data-auto-draft-tag") ? next : null;
  };

  it("🔴 아침 자동으로 선 시험지는 이름 바로 뒤에 «자동 출제» — 손으로 낸 시험지엔 없다", async () => {
    const { section } = await renderWith(
      withTodayTests([
        { i: 0, autoDraft: true },
        { i: 1, autoDraft: false },
      ]),
    );
    const auto = await within(section).findByRole("link", { name: "김민준" });
    const manual = within(section).getByRole("link", { name: "이서연" });
    expect(tagAfter(auto)).toHaveTextContent("자동 출제");
    expect(tagAfter(manual)).toBeNull();
    expect(section.querySelectorAll("[data-auto-draft-tag]")).toHaveLength(1);
    // 표지는 링크 **밖**이다 — 링크 이름(학생 이름)이 흐려지지 않는다.
    // 링크 안에는 이동 중 표시(`RouteLinkStatus` — 숨긴 «…»)가 같이 있어 textContent 로는 못 잰다.
    // 읽히는 이름과 «표지가 링크 안에 없다»로 잰다.
    expect(auto).toHaveAccessibleName("김민준");
    expect(auto.querySelector("[data-auto-draft-tag]")).toBeNull();
  });

  it("🔴 자동 초안이 없으면 표지가 없다 — 이 화면에서 방금 낸 초안에도 없다", async () => {
    const { section, generated } = await renderWith(
      withTodayTests([{ i: 1, autoDraft: false }]),
    );
    const user = userEvent.setup();
    await user.click(
      await within(section).findByRole("button", { name: "모두 출제 (1명)" }),
    );
    await waitFor(() => expect(generated).toHaveLength(1));
    await within(section).findByRole("link", { name: "김민준" });
    expect(section.querySelectorAll("[data-auto-draft-tag]")).toHaveLength(0);
  });

  it("확정·인쇄한 자동 시험지도 표지는 그대로 — 무엇이 세웠나는 상태와 따로다", async () => {
    const { section } = await renderWith(
      withTodayTests([
        { i: 0, autoDraft: true, status: "printed" },
        { i: 1, autoDraft: true, status: "confirmed" },
      ]),
    );
    await within(section).findByRole("link", { name: "김민준" });
    expect(section.querySelectorAll("[data-auto-draft-tag]")).toHaveLength(2);
  });

  it("«오늘 초안 N장»은 자동·손을 가르지 않는다(리드 결정 D) — 둘 다 센다", async () => {
    const { section } = await renderWith(
      withTodayTests([
        { i: 0, autoDraft: true },
        { i: 1, autoDraft: false },
      ]),
    );
    expect(
      await within(section).findByText("오늘 초안 2장"),
    ).toBeInTheDocument();
  });

  it("표지 모양 — 05 §8.10 Hi-fi 2 표지(흰 바탕 · 파랑 테두리·글자 · 11px 700 · 2px 8px · 모서리 4px)", async () => {
    const { section } = await renderWith(
      withTodayTests([{ i: 0, autoDraft: true }]),
    );
    const link = await within(section).findByRole("link", { name: "김민준" });
    const tag = tagAfter(link)!;
    const cls = (tag.getAttribute("class") ?? "").split(/\s+/);
    expect(cls).toEqual(
      expect.arrayContaining([
        "bg-white",
        "border",
        // 🔴 리터럴 #2064B3 — `text-blue` 는 작업실이 --blue 를 #3159DF 로 덮는다(실물 계측)
        "border-[#2064b3]",
        "text-[#2064b3]",
        "text-[11px]",
        "font-bold",
        "py-0.5",
        "px-2",
        "rounded-[4px]",
      ]),
    );
  });

  it("🔴 표지는 누르는 것이 아니다 — 단추·링크가 아니고 손가락 커서·hover 가 없다(D-30)", async () => {
    const { section } = await renderWith(
      withTodayTests([{ i: 0, autoDraft: true }]),
    );
    const link = await within(section).findByRole("link", { name: "김민준" });
    const tag = tagAfter(link)!;
    expect(tag.tagName).toBe("SPAN");
    expect(tag.closest("a, button")).toBeNull();
    expect(tag.getAttribute("class") ?? "").not.toMatch(
      /cursor-pointer|hover:/,
    );
    expect(tag.getAttribute("role")).toBeNull();
  });
});

describe("[D-132] 오늘의 확인테스트 — 학생 줄의 담당 딱지(관리자에게만 실린다)", () => {
  function withOwner(classOwner?: { name: string; mine: boolean }) {
    const base = richDaily(new Date().toISOString()).data;
    return dailyReviewResponseSchema.parse({
      data: {
        ...base,
        examOrUnread: base.examOrUnread.map((s) =>
          classOwner ? { ...s, classOwner } : s,
        ),
      },
    });
  }

  async function openExamRow(body: ReturnType<typeof withOwner>) {
    server.use(
      http.get("/api/tests/daily-review", () => HttpResponse.json(body)),
    );
    const user = userEvent.setup();
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    await user.click(
      await within(section).findByText(
        "시험기간·진도 못 읽음 1명 — 자동 출제 제외",
      ),
    );
    return within(section).getByText("최하은").closest("li")!;
  }

  it("관리자 응답이면 «학년 · 반» 바로 뒤에 담당 딱지 — 남의 반은 계정 이름", async () => {
    const row = await openExamRow(withOwner({ name: "강선생", mine: false }));
    const tag = row.querySelector("[data-owner-tag]");
    expect(tag).toHaveAttribute("data-owner-tag", "other");
    expect(tag).toHaveTextContent("강선생");
    expect(tag?.previousElementSibling).toHaveTextContent("중2 · 테스트반");
  });

  it("내 반은 «내 반» 딱지", async () => {
    const row = await openExamRow(withOwner({ name: "관리자", mine: true }));
    expect(row.querySelector("[data-owner-tag]")).toHaveTextContent("내 반");
  });

  it("🔴 담당이 없으면(관리자 아님) 딱지가 없다 — 지금 화면 그대로", async () => {
    const row = await openExamRow(withOwner());
    expect(row.querySelector("[data-owner-tag]")).toBeNull();
  });
});

/**
 * 🔴 D-133 후속(원장님 2026-09-17 «추천 사항으로») — 아침 초안이 선 학생이 **자동 묶음 밖**으로 바뀐 날
 *    (문항 부족 · 시험기간 · 오늘 대상 아님): 검수 줄에 **이름과 표지**가 서고, 그 학생 줄의 «직접 출제»는
 *    **«검수»**(그 시험지)로 바뀐다 — 같은 날 두 번째 초안이 서지 않게.
 */
describe("[D-133 후속] 자동 묶음 밖 학생의 오늘 시험지 — 검수 줄 · «직접 출제» 대신 «검수»", () => {
  const LACKING_TEST = "90000000-0000-4000-8000-000000000812";
  const EXAM_TEST = "90000000-0000-4000-8000-000000000813";
  const OUTSIDE_TEST = "90000000-0000-4000-8000-000000000814";

  function outside() {
    const base = richDaily(new Date().toISOString()).data;
    return dailyReviewResponseSchema.parse({
      data: {
        ...base,
        todayTests: [
          ...base.todayTests,
          // 문항 부족 줄의 박도윤 — 아침 초안이 섰다
          {
            studentId: STUDENT_IDS[2]!,
            studentName: "박도윤",
            testId: LACKING_TEST,
            status: "draft",
            autoDraft: true,
          },
          // 시험기간 줄의 최하은 — 손으로 낸 시험지
          {
            studentId: STUDENT_IDS[3]!,
            studentName: "최하은",
            testId: EXAM_TEST,
            status: "draft",
            autoDraft: false,
          },
          // 오늘 어느 목록에도 없는 학생 — 계획을 바꾼 날
          {
            studentId: STUDENT_IDS[4]!,
            studentName: "정우진",
            testId: OUTSIDE_TEST,
            status: "confirmed",
            autoDraft: true,
          },
        ],
      },
    });
  }

  async function render3() {
    server.use(
      http.get("/api/tests/daily-review", () => HttpResponse.json(outside())),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    return await findSection();
  }

  const reviewLine = (section: HTMLElement) =>
    within(section)
      .getByText(/^출제됨 \d+명 — 검수:/)
      .closest("p")!;

  it("🔴 자동 묶음 밖 학생도 검수 줄에 이름 링크 — 아침 초안이면 «자동 출제» 표지", async () => {
    const section = await render3();
    const line = reviewLine(section);
    const link = (name: string) => within(line).getByRole("link", { name });
    expect(link("박도윤")).toHaveAttribute("href", `/tests/${LACKING_TEST}`);
    expect(link("최하은")).toHaveAttribute("href", `/tests/${EXAM_TEST}`);
    expect(link("정우진")).toHaveAttribute("href", `/tests/${OUTSIDE_TEST}`);
    const tagOf = (name: string) =>
      link(name).nextElementSibling?.hasAttribute("data-auto-draft-tag") ??
      false;
    expect(tagOf("박도윤")).toBe(true);
    expect(tagOf("최하은")).toBe(false);
    expect(tagOf("정우진")).toBe(true);
  });

  it("«출제됨 N명»은 검수 줄에 선 이름 수와 같다", async () => {
    const section = await render3();
    const line = reviewLine(section);
    const names = within(line).getAllByRole("link").length;
    expect(line).toHaveTextContent(new RegExp(`^출제됨 ${names}명 — 검수:`));
  });

  it("🔴 문항 부족 줄 — 오늘 시험지가 있으면 «직접 출제» 대신 «검수»(그 시험지)", async () => {
    const section = await render3();
    const row = within(section)
      .getByText("박도윤", { selector: "span" })
      .closest("li")!;
    expect(within(row).queryByRole("link", { name: "직접 출제" })).toBeNull();
    expect(within(row).getByRole("link", { name: "검수" })).toHaveAttribute(
      "href",
      `/tests/${LACKING_TEST}`,
    );
  });

  it("🔴 시험기간 줄 — 오늘 시험지가 있으면 «검수», 없으면 «직접 출제» 그대로", async () => {
    const section = await render3();
    const user = userEvent.setup();
    await user.click(
      within(section).getByText("시험기간·진도 못 읽음 1명 — 자동 출제 제외"),
    );
    const row = within(section)
      .getByText("최하은", { selector: "b" })
      .closest("li")!;
    expect(within(row).queryByRole("link", { name: "직접 출제" })).toBeNull();
    expect(within(row).getByRole("link", { name: "검수" })).toHaveAttribute(
      "href",
      `/tests/${EXAM_TEST}`,
    );
  });

  it("오늘 시험지가 없는 부족 줄은 «직접 출제» 그대로", async () => {
    useRichHandlers();
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    const row = within(section)
      .getByText("박도윤", { selector: "span" })
      .closest("li")!;
    expect(
      within(row).getByRole("link", { name: "직접 출제" }),
    ).toBeInTheDocument();
    expect(within(row).queryByRole("link", { name: "검수" })).toBeNull();
  });
});

describe("question format intent per paper size", () => {
  it("uses each student's actual size instead of copying the group's maximum quota", async () => {
    const user = userEvent.setup();
    const body = richDaily(new Date().toISOString());
    body.data.todayTests = [];
    body.data.auto[0].neededCount = 12;
    body.data.auto[0].students = body.data.auto[0].students.map(
      (student, index) => ({ ...student, problemCount: index ? 12 : 8 }),
    );
    const generated: Record<string, unknown>[] = [];
    server.use(
      http.get("/api/tests/daily-review", () => HttpResponse.json(body)),
      http.post("/api/tests/generate", async ({ request }) => {
        generated.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { data: { test: { id: EXISTING_TEST_ID } } },
          { status: 201 },
        );
      }),
    );
    render(<DailyReviewSection units={MOCK_UNITS} />);
    const section = await findSection();
    for (const count of [8, 12]) {
      const summary = within(section).getByText(
        new RegExp(`^${count}문항 시험지 형식 배분`),
        { selector: "summary" },
      );
      await user.click(summary);
      const fields = within(summary.closest("details")!);
      await user.type(fields.getByRole("spinbutton", { name: "객관식" }), "0");
      await user.type(
        fields.getByRole("spinbutton", { name: "단답형" }),
        String(count),
      );
      await user.type(fields.getByRole("spinbutton", { name: "서술형" }), "0");
    }
    await user.click(
      within(section).getByRole("button", { name: "모두 출제 (2명)" }),
    );
    await waitFor(() => expect(generated).toHaveLength(2));
    expect(
      generated.find((request) => request.studentId === STUDENT_IDS[0])
        ?.formats,
    ).toEqual({ 객관식: 0, 단답형: 8, 서술형: 0 });
    expect(
      generated.find((request) => request.studentId === STUDENT_IDS[1])
        ?.formats,
    ).toEqual({ 객관식: 0, 단답형: 12, 서술형: 0 });
  });
});
