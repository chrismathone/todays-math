/**
 * 🟢 GREEN — Phase 4, T4.3 S-03 메인 화면 (H5×G2)
 *
 * 구현: src/app/(main)/page.tsx + src/components/main/**
 * 데이터: 기존 MSW test/class 핸들러 (실제 DB 불필요)
 *
 * 확정: docs/planning/05-design-system.md §8.1~8.4
 * 시안: hifi-h5-final.html, hifi-h5-google.html G2, wire-s03-final.html
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// `/` 페이지는 2026-09-14(ce1a16d4) 로그인 작업실(서버 컴포넌트 · server-only)로 바뀌었다 — 반 목록 화면은
// `MainScreen` 으로 남아 «수업 · 학생 관리»(TeachingView)가 쓴다. 페이지를 불러오면 파일째 죽어서 화면을 직접 그린다.
import { MainScreen as MainPage } from "@/components/main/MainScreen";
import {
  CLASS_A_ID,
  CLASS_B_ID,
  CLASS_STARVED_ID,
  MOCK_CLASS_A,
  MOCK_CLASS_B,
  MOCK_CLASS_STARVED,
  MOCK_CURRENT_PROGRESS_UNIT,
  MOCK_EMPTY_PROBLEM_UNIT,
  MOCK_TEST_PRINTED,
  MOCK_UNITS,
  TEST_CONFIRMED_ID,
  TEST_DRAFT_ID,
} from "@/mocks/data";
import { server } from "@/mocks/server";

// MainScreen 이 반 0개면 온보딩으로 보낸다(useRouter) — 여기서는 반이 있으므로 안 불린다.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const OUTER_GRID = "grid-cols-[minmax(0,1fr)_112px]";
const INNER_GRID = "grid-cols-[44px_minmax(0,1fr)_232px]";

// 일일테스트는 "현재 진도 차시"의 것만 오늘의 테스트로 잡히므로(pickActiveTest, 2026-08-14),
// 각 반의 현재 진도 단원을 rangeEndUnitId로 넣어야 그 반이 done/review로 정상 판정된다.
function printedClassTest(
  classId: string,
  seq: number,
  rangeEndUnitId: string,
) {
  return {
    ...MOCK_TEST_PRINTED,
    id: `90000000-0000-4000-8000-${String(200 + seq).padStart(12, "0")}`,
    classId,
    studentId: null,
    status: "printed" as const,
    modified: false,
    rangeEndUnitId,
    testDate: "2026-08-14",
    printedAt: "2026-08-14T10:00:00+09:00",
  };
}

async function renderMain() {
  const user = userEvent.setup();
  const view = render(<MainPage />);
  await screen.findByRole("article", { name: "중2 심화반" });
  return { user, ...view };
}

describe("[T4.3 S-03] 메인 — MSW 기본 데이터 (스택)", () => {
  it("진도 API 장애를 진도 없음으로 위장하지 않는다", async () => {
    server.use(
      http.get(
        "/api/progress",
        () => new HttpResponse("broken", { status: 500 }),
      ),
    );

    render(<MainPage />);

    // 2026-10-04(4d95f078f)부터 진도 조회 실패는 **반마다 따로** 선다 — 반 목록은 그대로 그린다.
    // 지키는 것은 같다: 실패한 반을 «진도를 안 넣은 반»처럼 그리지 않는다.
    const card = await screen.findByRole("article", { name: "중2 심화반" });
    expect(await within(card).findByText("진도 조회 실패")).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "진도 다시 조회" }),
    ).toBeInTheDocument();
    expect(
      within(card).queryByRole("button", { name: /진도 입력/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("목록을 불러오지 못했습니다")).toBeNull();
  });

  it("진도 조회 실패 뒤 그 반에서 다시 조회하면 복구한다", async () => {
    server.use(
      http.get(
        "/api/progress",
        () => new HttpResponse("broken", { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    render(<MainPage />);

    const card = await screen.findByRole("article", { name: "중2 심화반" });
    await within(card).findByText("진도 조회 실패");
    server.resetHandlers();
    await user.click(
      within(card).getByRole("button", { name: "진도 다시 조회" }),
    );

    await waitFor(() =>
      expect(within(card).queryByText("진도 조회 실패")).toBeNull(),
    );
    expect(
      within(card).queryByRole("button", { name: "진도 다시 조회" }),
    ).not.toBeInTheDocument();
  });

  it("목록 로딩 실패 후 재시도하면 대시보드로 복구한다", async () => {
    // 화면 전체가 오류로 서는 것은 반 목록을 못 읽었을 때다(진도 실패는 위 두 시험처럼 반마다).
    server.use(
      http.get(
        "/api/classes",
        () => new HttpResponse("broken", { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    render(<MainPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "목록을 불러오지 못했습니다",
    );
    expect(
      screen.getByRole("link", { name: "수업·학생 관리" }),
    ).toHaveAttribute("href", "/classes");
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(
      await screen.findByRole("article", { name: "중2 심화반" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("이번 주 지표는 테스트 목록이 아니라 metrics API 응답을 표시한다", async () => {
    server.use(
      http.get("/api/metrics", () =>
        HttpResponse.json({
          data: {
            weekStart: "2026-08-10",
            weekEnd: "2026-08-16",
            printedDays: 6,
            printedCount: 8,
            unmodifiedCount: 3,
            unmodifiedRate: 0.375,
            avgGenerateToPrintSeconds: 420,
          },
        }),
      ),
    );

    await renderMain();

    expect(screen.getByLabelText("이번 주 인쇄 일수")).toHaveTextContent("6");
    expect(screen.getByLabelText("이번 주 무수정 사용률")).toHaveTextContent(
      "38%",
    );
    expect(screen.getByText("인쇄 일수")).toBeInTheDocument();
  });

  it("반 목록과 4단계 게이지, 우측 진도 패널을 보여 준다", async () => {
    await renderMain();

    expect(screen.getByText("오늘의수학")).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "중2 심화반" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "중2 기초반" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: /중2 문제부족반/ }),
    ).toBeInTheDocument();

    expect(screen.getByText("남은 작업 3")).toBeInTheDocument();

    const gauges = screen.getAllByRole("group", { name: "진도 단계" });
    expect(gauges.length).toBeGreaterThanOrEqual(3);
    expect(within(gauges[0]!).getByText("진도")).toBeInTheDocument();
    expect(within(gauges[0]!).getByText("출제")).toBeInTheDocument();
    expect(within(gauges[0]!).getByText("검수")).toBeInTheDocument();
    expect(within(gauges[0]!).getByText("인쇄")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "진도 입력" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이전 차시" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다음 차시" }),
    ).toBeInTheDocument();
    expect(screen.getByText("차시이동")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "직접 선택" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("이번 주")).toBeInTheDocument();
  });

  it("검수/인쇄/출제 주 버튼은 해당 경로 링크다", async () => {
    await renderMain();

    const review = screen.getByRole("link", { name: "검수" });
    expect(review).toHaveAttribute("href", `/tests/${TEST_DRAFT_ID}`);

    const print = screen.getByRole("link", { name: "인쇄" });
    expect(print).toHaveAttribute("href", `/tests/${TEST_CONFIRMED_ID}/print`);

    const generate = screen.getByRole("link", { name: "출제" });
    expect(generate).toHaveAttribute(
      "href",
      `/tests/new?classId=${CLASS_STARVED_ID}`,
    );
  });

  // 배경이 원색 화이트가 되면서(2026-08-18) 「hot = 흰 표면」은 아무 것도 표시하지
  // 못하게 됐다 — 이 테스트가 그 죽은 신호를 지키고 있었다. 지금 처리 중인 반은
  // **왼쪽 잉크 바 + 굵은 밑선**으로 표시한다.
  it("카드 줄이 «고르는 버튼 + 액션» 두 조각이고 hot 카드는 선으로 표시된다", async () => {
    await renderMain();

    // 행을 눌러 반을 고르게 되면서(2026-08-26) 넷짜리 격자가 둘로 쪼개졌다.
    // 칸 폭이 맞는지는 `mainRowGrid.test.ts` 가 따로 잠근다 — 여기서는 **구조**만 본다.
    const hot = screen.getByRole("article", { name: "중2 심화반" });
    expect(hot.className).toContain(OUTER_GRID);
    // 고른 행은 **네 변 전부** 굵다 (원장님 2026-08-26). 밑줄만으로는 «구분선»으로 읽힌다.
    expect(hot.className).toMatch(/\bborder-2\b/);
    expect(hot.className).toContain("border-ink");
    expect(hot.className).toMatch(/inset_5px/);
    expect(hot.className).not.toContain("bg-white");
    // 밑변만 굵던 옛 표시로 돌아가면 안 된다.
    expect(hot.className).not.toMatch(/\bborder-b-2\b/);

    // 안쪽 셋은 진짜 버튼이어야 한다(표면에 onClick 을 얹으면 D-30 위반).
    const pick = within(hot).getByRole("button");
    expect(pick.className).toContain(INNER_GRID);
    expect(pick).toHaveAttribute("aria-current", "true");

    const printCard = screen.getByRole("article", { name: "중2 기초반" });
    expect(printCard.className).toContain(OUTER_GRID);
    // ⚠️ 안 고른 행도 **같은 두께**여야 한다 — 아니면 고를 때마다 위·좌·우로 2px 씩 자라
    //    목록 전체가 들썩이고, 다음 행을 겨냥하기 어려워진다.
    expect(printCard.className).toMatch(/\bborder-2\b/);
    expect(printCard.className).toContain("border-transparent");
    expect(printCard.className).toContain("border-b-divider");
    expect(printCard.className).not.toContain("border-ink");
    // 고르지 않은 행은 aria-current 를 달지 않는다 — 달면 둘 다 «현재»가 된다.
    expect(within(printCard).getByRole("button")).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("심화반은 검수 단계 메타를, 기초반은 검수 완료 메타를 보여 준다", async () => {
    await renderMain();

    const reviewCard = screen.getByRole("article", { name: "중2 심화반" });
    expect(reviewCard).toHaveTextContent(MOCK_CURRENT_PROGRESS_UNIT.section);
    expect(reviewCard).toHaveTextContent("8문항 준비됨");
    expect(reviewCard).toHaveTextContent("일일테스트");

    const printCard = screen.getByRole("article", { name: "중2 기초반" });
    expect(printCard).toHaveTextContent("순환소수");
    expect(printCard).toHaveTextContent("검수 완료");
    expect(printCard).toHaveTextContent("확인테스트");
  });

  it("S-05 검수 UI(교체)와 느낌표·장식 이모지를 넣지 않는다", async () => {
    const { container } = await renderMain();

    expect(
      screen.queryByRole("button", { name: "교체" }),
    ).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/[!！]/);
    expect(container.textContent ?? "").not.toMatch(/[😀🎉✨🔥]/);
  });
});

describe("[T4.3 S-03] 메인 — 수동 전환·진도 1클릭", () => {
  it("전체 표 토글로 대장부(내일 테스트 열)를 열고 오늘 작업으로 돌아온다", async () => {
    const { user } = await renderMain();

    await user.click(screen.getByRole("button", { name: /전체 표/ }));

    expect(
      screen.getByRole("columnheader", { name: "내일 테스트" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "반" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "현재 진도" }),
    ).toBeInTheDocument();
    // 자동 준비 스케줄러는 없다 — 진도가 있으면 원장이 직접 출제하는 흐름이므로 "직접 출제".
    expect(screen.getAllByText("직접 출제").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /오늘 작업/ }));

    expect(screen.getByRole("link", { name: "검수" })).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "내일 테스트" }),
    ).not.toBeInTheDocument();
  });

  it("다음 차시를 누르면 패널 현재 소단원이 다음 차시로 바뀐다", async () => {
    const { user } = await renderMain();

    expect(screen.getByLabelText("현재 소단원")).toHaveTextContent(
      "순환소수를 포함한 식의 계산",
    );

    await user.click(screen.getByRole("button", { name: "다음 차시" }));

    await waitFor(() => {
      expect(screen.getByLabelText("현재 소단원")).toHaveTextContent(
        "지수법칙",
      );
    });
  });

  it("이전 차시를 누르면 패널 현재 소단원이 이전 차시로 바뀐다", async () => {
    const { user } = await renderMain();

    expect(screen.getByLabelText("현재 소단원")).toHaveTextContent(
      "순환소수를 포함한 식의 계산",
    );

    await user.click(screen.getByRole("button", { name: "이전 차시" }));

    await waitFor(() => {
      expect(screen.getByLabelText("현재 소단원")).toHaveTextContent(
        "순환소수의 분수 표현",
      );
    });
  });

  it("차시이동은 진도를 기록하지 않고 '진도 기록' 버튼으로만 커밋한다", async () => {
    let postCount = 0;
    let postedUnitId: string | null = null;
    server.use(
      http.post("/api/progress", async ({ request }) => {
        postCount += 1;
        const bodyJson = (await request.json()) as {
          classId: string;
          unitId: string;
        };
        postedUnitId = bodyJson.unitId;
        return HttpResponse.json(
          {
            data: {
              id: "00000000-0000-4000-8000-000000009999",
              classId: bodyJson.classId,
              studentId: null,
              unitId: bodyJson.unitId,
              recordedAt: "2026-08-14",
              createdAt: "2026-08-14T09:00:00Z",
            },
          },
          { status: 201 },
        );
      }),
    );

    const { user } = await renderMain();

    // 초기: 열람 위치 = 현재 진도 → 기록할 것이 없어 버튼 비활성
    const recordBtn = screen.getByRole("button", {
      name: "이 차시로 진도 기록",
    });
    expect(recordBtn).toBeDisabled();

    // 차시이동(열람) — 진도는 절대 기록되지 않는다(예전 버그: 클릭마다 기록)
    await user.click(screen.getByRole("button", { name: "다음 차시" }));
    await waitFor(() => {
      expect(screen.getByLabelText("현재 소단원")).toHaveTextContent(
        "지수법칙",
      );
    });
    expect(postCount).toBe(0);
    expect(recordBtn).toBeEnabled();

    // 명시적 기록 → POST 1회, 이동한 차시(417 지수법칙)로 커밋
    await user.click(recordBtn);
    await waitFor(() => expect(postCount).toBe(1));
    expect(postedUnitId).toBe(MOCK_UNITS[4]!.id);
  });

  it("목록에서 행을 누르면 패널이 그 반으로 바뀌고 불도 따라온다", async () => {
    const { user } = await renderMain();

    // 🔴 반 선택은 드롭다운이 아니라 **행 클릭**이다 (원장님 확정 2026-08-26).
    //    드롭다운이 되살아나면 고르는 자리가 둘이 되어 어느 쪽이 참인지 모르게 된다.
    expect(screen.queryByLabelText("반 선택")).toBeNull();

    const target = screen.getByRole("article", { name: "중2 기초반" });
    await user.click(within(target).getByRole("button"));

    expect(screen.getByLabelText("선택한 반")).toHaveTextContent("중2 기초반");
    // 불이 옮겨온다 — 「먼저 할 반」이 아니라 「지금 고른 반」을 가리킨다.
    expect(target.className).toMatch(/inset_5px/);
    expect(
      screen.getByRole("article", { name: "중2 심화반" }).className,
    ).not.toMatch(/inset_5px/);
  });

  it("진도가 다른 반을 고르면 현재 소단원이 그 반 진도로 바뀐다", async () => {
    const { user } = await renderMain();

    const starved = screen
      .getAllByRole("article")
      .find((el) => el.getAttribute("aria-label") === MOCK_CLASS_STARVED.name);
    if (!starved) throw new Error("진도 없는 반 카드를 못 찾았다");
    await user.click(within(starved).getByRole("button"));

    expect(screen.getByLabelText("현재 소단원")).toHaveTextContent(
      MOCK_UNITS[14]!.section,
    );
  });
});

describe("[T4.3 S-03] 메인 — 마우스 어포던스", () => {
  it("반 카드 본체는 클릭 대상이 아니다", async () => {
    await renderMain();

    const card = screen.getByRole("article", { name: "중2 심화반" });
    expect(card.tagName).toBe("ARTICLE");
    expect(card.className).not.toMatch(/cursor-pointer/);
    expect(card).not.toHaveAttribute("onclick");
  });

  it("차시 화살표는 활성일 때만 손가락이다", async () => {
    await renderMain();

    const next = screen.getByRole("button", { name: "다음 차시" });
    const prev = screen.getByRole("button", { name: "이전 차시" });
    expect(next).toBeEnabled();
    expect(prev).toBeEnabled();
    expect(next.className).toMatch(/cursor-pointer/);
    expect(prev.className).toMatch(/cursor-pointer/);
  });

  it("대장부 행은 hover로 클릭처럼 보이지 않는다", async () => {
    const { user } = await renderMain();

    await user.click(screen.getByRole("button", { name: /전체 표/ }));

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    for (const row of rows.slice(1)) {
      expect(row.className).not.toMatch(/hover:bg-white/);
      expect(row.className).not.toMatch(/cursor-pointer/);
    }
    expect(screen.getByRole("link", { name: "검수" })).toBeInTheDocument();
  });
});

describe("[T4.3 S-03] 메인 — 전부 완료면 대장부로 자동 전환", () => {
  it("모든 반이 인쇄 완료면 표를 열고 오늘 완료를 보여 준다", async () => {
    server.use(
      http.get("/api/tests", () =>
        HttpResponse.json({
          data: [
            printedClassTest(CLASS_A_ID, 1, MOCK_CURRENT_PROGRESS_UNIT.id),
            printedClassTest(CLASS_B_ID, 2, MOCK_UNITS[1]!.id),
            printedClassTest(CLASS_STARVED_ID, 3, MOCK_EMPTY_PROBLEM_UNIT.id),
          ],
          meta: { page: 1, pageSize: 20, total: 3 },
        }),
      ),
    );

    render(<MainPage />);

    expect(await screen.findByText("오늘 완료")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "내일 테스트" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/남은 작업/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "다시 보기" }).length).toBe(3);

    expect(
      screen.getByRole("heading", { name: "진도 입력" }),
    ).toBeInTheDocument();
  });

  it("일부만 완료면 스택 하단에 완료 한 줄 요약을 붙인다", async () => {
    server.use(
      http.get("/api/tests", () =>
        HttpResponse.json({
          data: [
            printedClassTest(CLASS_A_ID, 1, MOCK_CURRENT_PROGRESS_UNIT.id),
            {
              ...MOCK_TEST_PRINTED,
              id: TEST_DRAFT_ID,
              classId: CLASS_B_ID,
              studentId: null,
              status: "draft",
              // 반 B의 현재 진도(414 순환소수)에 맞춰야 그 반의 오늘 테스트로 잡힌다.
              rangeEndUnitId: MOCK_UNITS[1]!.id,
              testDate: "2026-08-14",
              printedAt: null,
            },
          ],
          meta: { page: 1, pageSize: 20, total: 2 },
        }),
      ),
    );

    render(<MainPage />);

    // 🔴 완료 행도 **눌러서 고를 수 있어야 한다.** 반 선택이 드롭다운에서 행 클릭으로
    //    옮겨 갔는데(2026-08-26) 그 드롭다운은 완료된 반까지 담고 있었다 — 안 눌리게 두면
    //    「끝난 반의 진도를 다시 보기」가 화면에서 통째로 사라지고 **오류도 안 난다.**
    const doneBtn = await screen.findByRole("button", {
      name: `${MOCK_CLASS_A.name} 완료`,
    });
    const done = doneBtn.parentElement!;
    expect(done.className).toContain(OUTER_GRID);
    expect(doneBtn.className).toContain(INNER_GRID);
    expect(done).toHaveTextContent("인쇄됨");
    expect(done).toHaveTextContent("완료");
    expect(screen.getByText("남은 작업 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "검수" })).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: MOCK_CLASS_B.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: MOCK_CLASS_STARVED.name }),
    ).toBeInTheDocument();
  });
});
