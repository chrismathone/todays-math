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
 * 1. 첫 줄은 짧게 「오늘 초안 N장」 · 칩 「N일 밀림 M명」·「문항 부족 N명」·「시험기간 N명」(D-131 · 05 §8.10).
 * 2. 「모두 출제」 — 자동 묶음 학생별로 POST /api/tests/generate 를 부르되,
 *    **오늘 시험이 이미 있는 학생은 건너뛴다**(중복 초안 금지). 성공하면 검수 링크.
 * 3. 시험기간 학생은 원문 줄과 함께 «표시만» — 출제 요청이 안 나간다.
 * 4. 동기화가 48시간 넘으면 「오래됨」 경고.
 * 5. 🔴 문지기 — eywa 소유자이거나 **계획이 있으면** 섹션이 선다(D-131). 동기화 줄은 소유자에게만.
 * 6. 오늘 대상이 없으면 「오늘 수업 계획이 없습니다.」 · 오늘 대상이 없는 반도 같은 문구로 한 줄.
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
          poolTotal: 24,
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
          poolTotal: 2,
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
          testId: EXISTING_TEST_ID,
          status: "draft",
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
    expect(chips).toEqual(["3일 밀림 1명", "문항 부족 1명", "시험기간 1명"]);
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

  it("오늘 대상이 없는 반은 「반 이름 — 오늘 수업 계획이 없습니다.」 한 줄", async () => {
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
      await within(section).findByText(
        "중1 B반 · 중3 A반 — 오늘 수업 계획이 없습니다.",
      ),
    ).toBeInTheDocument();
  });

  it("밀림이 여러 날이면 날마다 칩 하나 — 많이 밀린 쪽부터 · 없는 갈래는 칩이 없다", async () => {
    server.use(
      http.get("/api/tests/daily-review", () =>
        HttpResponse.json(
          planOnly({
            lacking: [],
            examOrUnread: [],
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
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["5일 밀림 2명", "3일 밀림 1명"]);
  });

  it("「오늘 초안」은 초안만 센다 — 확정·인쇄한 시험지는 빠진다", async () => {
    server.use(
      http.get("/api/tests/daily-review", () =>
        HttpResponse.json(
          planOnly({
            todayTests: [
              {
                studentId: STUDENT_IDS[0]!,
                testId: "90000000-0000-4000-8000-000000000701",
                status: "draft",
              },
              {
                studentId: STUDENT_IDS[1]!,
                testId: "90000000-0000-4000-8000-000000000702",
                status: "confirmed",
              },
              {
                studentId: STUDENT_IDS[2]!,
                testId: "90000000-0000-4000-8000-000000000703",
                status: "printed",
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
