/**
 * 🔴 RED → 🟢 — **채점 입력 화면 A안** (`/tests/{id}/grade`, D-134 트랙 1).
 *
 * 구현: `src/components/test/GradeSheet.tsx`
 * 시안 SSOT: `/dev/retry-wire` **A 탭** (D-07 확정 — 19 §5′)
 *
 * ## 무엇을 잠그나
 *
 * 1. 🔴 **세 상태가 눈에 보이게 다르다** — `아직 안 봄` / `○ 맞음` / `✕ 틀림`.
 *    스키마에는 둘밖에 없어서(참/거짓) **화면이 세 번째를 만든다.** 안 가르면
 *    「채점을 안 한 학생」이 「만점」으로 조용히 굳는다.
 * 2. 🔴 학생 줄 끝 단추가 **누르기 전부터** `0개 끝` / `2개 끝` 이라 적어 **무엇을 주장하는지** 보인다.
 * 3. 🔴 미채점이 남으면 저장이 잠기고 **이름을 나열**한다(「몇 명」이 아니다).
 * 4. 🔴 **일괄 단추가 없다** — 「전원 응시」·「전부 맞음」은 결석생을 한 번에 만점으로 굳힌다.
 * 5. 🔴 **결시는 칸을 전부 ✕ 로 찍는 것과 다른 뜻**이다 — 요청이 `absent: true` · 오답 0 으로 나간다.
 * 6. 저장 직후 **학생별 점수 목록**만 띄운다 — 단원별 정답률·난이도 분포는 여기서 안 그린다(23 §4 ①).
 *
 * ## 🔴 상태는 **글자와 접근성 이름**으로 잰다, 클래스 이름으로 재지 않는다
 *
 * 2026-09-16 교훈 — 「RTL 은 클래스 이름을 보고 초록인데 작업실이 토큰을 덮었다」.
 * 여기서는 칸의 **접근성 이름**(`아직 안 봄`/`맞음`/`틀림`)과 **글자**를 본다. 색·점선이
 * 실제로 갈리는지는 jsdom 이 못 재므로 실물 브라우저 캡처가 든다(보고서 ③).
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GradeSheet } from "@/components/test/GradeSheet";
import { server } from "@/mocks/server";

const TEST_ID = "90000000-0000-4000-8000-000000000050";
const S = [
  { studentId: "30000000-0000-4000-8000-000000000001", name: "이서준" },
  { studentId: "30000000-0000-4000-8000-000000000002", name: "김하윤" },
  { studentId: "30000000-0000-4000-8000-000000000003", name: "박지호" },
];
const P = [
  { problemId: "50000000-0000-4000-8000-000000000301", no: 1 },
  { problemId: "50000000-0000-4000-8000-000000000302", no: 2 },
  { problemId: "50000000-0000-4000-8000-000000000303", no: 3 },
];

function sheet(over: Record<string, unknown> = {}) {
  return {
    data: {
      testId: TEST_ID,
      className: "중2 A반",
      studentName: null,
      testType: "daily",
      testDate: "2026-09-17",
      status: "printed",
      problems: P.map((p, i) => ({
        problemId: p.problemId,
        no: p.no,
        sequence: i + 1,
        problemCode: `M2-001${i}`,
        difficulty: "기본",
      })),
      students: S.map((s) => ({ ...s, latest: null })),
      ...over,
    },
  };
}

/** 저장 요청 본문을 받아 두고, 응답은 그 본문으로 만든다. */
function arm(options: { reject?: string; publicationId?: string } = {}) {
  const sent: unknown[] = [];
  server.use(
    http.get(`/api/tests/${TEST_ID}/grade`, () =>
      HttpResponse.json(
        sheet(
          options.publicationId ? { publicationId: options.publicationId } : {},
        ),
      ),
    ),
    http.post(`/api/tests/${TEST_ID}/grade`, async ({ request }) => {
      const body = (await request.json()) as {
        entries: {
          studentId: string;
          absent: boolean;
          wrongProblemIds: string[];
        }[];
      };
      sent.push(body);
      if (options.reject) {
        return HttpResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: options.reject,
              details: null,
            },
          },
          { status: 422 },
        );
      }
      const scores = body.entries.map((e) => {
        const name = S.find((s) => s.studentId === e.studentId)!.name;
        const correctCount = e.absent ? 0 : P.length - e.wrongProblemIds.length;
        return {
          studentId: e.studentId,
          name,
          absent: e.absent,
          correctCount,
          problemCount: P.length,
          score: e.absent ? null : (correctCount / P.length) * 100,
        };
      });
      return HttpResponse.json(
        {
          data: {
            testId: TEST_ID,
            scores,
            gradedCount: scores.filter((s) => !s.absent).length,
            absentCount: scores.filter((s) => s.absent).length,
          },
        },
        { status: 201 },
      );
    }),
  );
  return sent;
}

/** 학생 한 줄 — 이름 칸이 있는 행. */
async function rowOf(name: string) {
  const cell = await screen.findByRole("rowheader", { name });
  return cell.closest("tr") as HTMLTableRowElement;
}

function cellButton(row: HTMLTableRowElement, no: number) {
  return within(row).getByRole("button", { name: new RegExp(`${no}번`) });
}

async function renderSheet() {
  render(<GradeSheet testId={TEST_ID} />);
  await screen.findByRole("rowheader", { name: "이서준" });
}

describe("채점 입력 A안 — 표(학생 × 문항)", () => {
  it("낸 시험은 채점 저장 뒤 점수 목록 아래 성적표로 연결한다", async () => {
    arm({ publicationId: "80000000-0000-4000-8000-000000000001" });
    await renderSheet();
    expect(
      screen.queryByRole("link", { name: "성적표로" }),
    ).not.toBeInTheDocument();
    for (const student of S) {
      const row = await rowOf(student.name);
      await userEvent.click(
        within(row).getByRole("button", { name: /개 끝$/ }),
      );
    }
    await userEvent.click(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    );
    expect(
      await screen.findByRole("link", { name: "성적표로" }),
    ).toHaveAttribute("href", `/exam-reports/${TEST_ID}`);
  });
  it("채점표 조회 실패 뒤 같은 화면에서 다시 불러온다", async () => {
    let calls = 0;
    server.use(
      http.get(`/api/tests/${TEST_ID}/grade`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { error: { message: "잠시 실패했습니다" } },
              { status: 503 },
            )
          : HttpResponse.json(sheet());
      }),
    );
    const user = userEvent.setup();
    render(<GradeSheet testId={TEST_ID} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "잠시 실패했습니다",
    );
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(
      await screen.findByRole("rowheader", { name: "이서준" }),
    ).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it("반 전체가 한 표에 선다 — 행은 학생, 열은 문항 번호", async () => {
    arm();
    await renderSheet();
    for (const s of S) expect(await rowOf(s.name)).toBeTruthy();
    for (const p of P)
      expect(
        screen.getByRole("columnheader", { name: String(p.no) }),
      ).toBeInTheDocument();
  });

  it("🔴 ① 세 상태가 눈에 보이게 다르다 — 아직 안 봄 / 맞음 / 틀림", async () => {
    arm();
    await renderSheet();
    const row = await rowOf("이서준");

    // 아직 안 봄 — 아무 글자도 주장하지 않는다
    expect(cellButton(row, 1)).toHaveAccessibleName(/아직 안 봄/);
    expect(cellButton(row, 1)).toHaveTextContent("");

    // 틀림 — ✕
    await userEvent.click(cellButton(row, 2));
    expect(cellButton(row, 2)).toHaveAccessibleName(/틀림/);
    expect(cellButton(row, 2)).toHaveTextContent("✕");

    // 맞음 — 「끝」을 눌러야 비로소 ○ 가 된다(주장은 원장님이 한다)
    await userEvent.click(within(row).getByRole("button", { name: /개 끝$/ }));
    expect(cellButton(row, 1)).toHaveAccessibleName(/맞음/);
    expect(cellButton(row, 1)).toHaveTextContent("○");
    expect(cellButton(row, 2)).toHaveTextContent("✕");

    // 세 상태의 **글자가 서로 다르다**
    const marks = new Set(["", "○", "✕"]);
    expect(marks.size).toBe(3);
  });

  it("🔴 ② 끝 단추가 누르기 **전부터** 몇 개를 주장하는지 적는다", async () => {
    arm();
    await renderSheet();
    const row = await rowOf("이서준");
    expect(
      within(row).getByRole("button", { name: "0개 끝" }),
    ).toBeInTheDocument();

    await userEvent.click(cellButton(row, 1));
    expect(
      within(row).getByRole("button", { name: "1개 끝" }),
    ).toBeInTheDocument();
    await userEvent.click(cellButton(row, 3));
    expect(
      within(row).getByRole("button", { name: "2개 끝" }),
    ).toBeInTheDocument();

    await userEvent.click(within(row).getByRole("button", { name: "2개 끝" }));
    expect(
      within(row).getByRole("button", { name: "2개 ✓" }),
    ).toBeInTheDocument();
  });

  it("잘못 찍은 칸은 다시 눌러 무른다", async () => {
    arm();
    await renderSheet();
    const row = await rowOf("이서준");
    await userEvent.click(cellButton(row, 2));
    expect(cellButton(row, 2)).toHaveTextContent("✕");
    await userEvent.click(cellButton(row, 2));
    expect(cellButton(row, 2)).toHaveTextContent("");
    expect(
      within(row).getByRole("button", { name: "0개 끝" }),
    ).toBeInTheDocument();
  });

  it("🔴 ③ 미채점이 남으면 저장이 잠기고 **이름**을 나열한다", async () => {
    arm();
    await renderSheet();
    const save = screen.getByRole("button", { name: "채점 결과 저장" });
    expect(save).toBeDisabled();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("이서준");
    expect(status).toHaveTextContent("김하윤");
    expect(status).toHaveTextContent("박지호");
    // 🔴 「3명 남음」이 아니다
    expect(status).not.toHaveTextContent(/\d+\s*명 남/);

    for (const s of S) {
      const row = await rowOf(s.name);
      await userEvent.click(
        within(row).getByRole("button", { name: /개 끝$/ }),
      );
    }
    expect(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    ).toBeEnabled();
  });

  it("🔴 ④ 일괄 단추가 **없다** — 「전원 응시」·「전부 맞음」", async () => {
    arm();
    await renderSheet();
    for (const label of [/전원/, /전부/, /모두/, /일괄/]) {
      expect(screen.queryByRole("button", { name: label })).toBeNull();
    }
  });

  it("🔴 ⑤ 결시는 칸을 전부 ✕ 로 찍는 것과 **다른 뜻**이다", async () => {
    const sent = arm();
    await renderSheet();

    const absentRow = await rowOf("박지호");
    await userEvent.click(
      within(absentRow).getByRole("button", { name: "결시" }),
    );
    // 결시 줄은 칸을 못 누른다 — ✕ 로 굳을 길을 막는다
    expect(cellButton(absentRow, 1)).toBeDisabled();

    for (const name of ["이서준", "김하윤"]) {
      const row = await rowOf(name);
      await userEvent.click(
        within(row).getByRole("button", { name: /개 끝$/ }),
      );
    }
    await userEvent.click(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    );

    await waitFor(() => expect(sent).toHaveLength(1));
    const body = sent[0] as {
      entries: {
        studentId: string;
        absent: boolean;
        wrongProblemIds: string[];
      }[];
    };
    const third = body.entries.find((e) => e.studentId === S[2]!.studentId)!;
    expect(third.absent).toBe(true);
    expect(third.wrongProblemIds).toEqual([]);
    expect(body.entries.filter((e) => e.absent)).toHaveLength(1);
  });

  it("결시를 누르면 그 줄도 «결정된 것»이라 저장이 열린다", async () => {
    arm();
    await renderSheet();
    for (const name of ["이서준", "김하윤"]) {
      const row = await rowOf(name);
      await userEvent.click(
        within(row).getByRole("button", { name: /개 끝$/ }),
      );
    }
    expect(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    ).toBeDisabled();
    const row = await rowOf("박지호");
    await userEvent.click(within(row).getByRole("button", { name: "결시" }));
    expect(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    ).toBeEnabled();
  });

  it("결시를 무르면 그 줄은 다시 «아직 안 봄» 이다", async () => {
    arm();
    await renderSheet();
    const row = await rowOf("박지호");
    await userEvent.click(within(row).getByRole("button", { name: "결시" }));
    await userEvent.click(within(row).getByRole("button", { name: "결시" }));
    expect(cellButton(row, 1)).toBeEnabled();
    expect(cellButton(row, 1)).toHaveAccessibleName(/아직 안 봄/);
    expect(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    ).toBeDisabled();
  });

  it("오답 번호는 문항 차례대로 실려 나간다", async () => {
    const sent = arm();
    await renderSheet();
    const row = await rowOf("이서준");
    await userEvent.click(cellButton(row, 3));
    await userEvent.click(cellButton(row, 1));
    for (const s of S) {
      const r = await rowOf(s.name);
      await userEvent.click(within(r).getByRole("button", { name: /개 끝$/ }));
    }
    await userEvent.click(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    );
    await waitFor(() => expect(sent).toHaveLength(1));
    const body = sent[0] as {
      entries: { studentId: string; wrongProblemIds: string[] }[];
    };
    expect(body.entries[0]!.wrongProblemIds).toEqual([
      P[0]!.problemId,
      P[2]!.problemId,
    ]);
  });

  it("🔴 ⑥ 저장 뒤에는 학생별 점수 목록만 뜬다 — 단원·난이도 통계는 안 그린다", async () => {
    arm();
    await renderSheet();
    for (const s of S) {
      const row = await rowOf(s.name);
      if (s.name === "김하윤") await userEvent.click(cellButton(row, 2));
      await userEvent.click(
        within(row).getByRole("button", { name: /개 끝$/ }),
      );
    }
    await userEvent.click(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    );

    const summary = await screen.findByRole("region", { name: "채점 결과" });
    expect(within(summary).getByText("이서준")).toBeInTheDocument();
    // 김하윤만 한 칸 틀렸다 — 나머지 둘은 3/3
    expect(within(summary).getAllByText("3 / 3")).toHaveLength(2);
    expect(within(summary).getByText("2 / 3")).toBeInTheDocument();
    // 🔴 8문항 한 회차의 단원 정답률은 통계가 아니다 — 그 축은 트랙 2가 기간 누적에서 연다
    expect(within(summary).queryByText(/단원/)).toBeNull();
    expect(within(summary).queryByText(/정답률/)).toBeNull();
    expect(within(summary).queryByText(/난이도/)).toBeNull();
  });

  it("결시 학생은 점수 목록에 «결시» 로 뜬다 — 0점이 아니다", async () => {
    arm();
    await renderSheet();
    for (const name of ["이서준", "김하윤"]) {
      const row = await rowOf(name);
      await userEvent.click(
        within(row).getByRole("button", { name: /개 끝$/ }),
      );
    }
    const third = await rowOf("박지호");
    await userEvent.click(within(third).getByRole("button", { name: "결시" }));
    await userEvent.click(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    );

    const summary = await screen.findByRole("region", { name: "채점 결과" });
    const line = within(summary).getByText("박지호").closest("li")!;
    expect(within(line).getByText("결시")).toBeInTheDocument();
    expect(within(line).queryByText("0 / 3")).toBeNull();
  });

  it("🔴 서버가 거절하면 그 문구를 그대로 띄우고 표는 그대로다", async () => {
    arm({ reject: "아직 채점하지 않은 학생이 있습니다: 박지호" });
    await renderSheet();
    for (const s of S) {
      const row = await rowOf(s.name);
      await userEvent.click(
        within(row).getByRole("button", { name: /개 끝$/ }),
      );
    }
    await userEvent.click(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "아직 채점하지 않은 학생이 있습니다: 박지호",
    );
    expect(await rowOf("이서준")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "채점 결과" })).toBeNull();
  });

  it("이미 채점한 시험지는 그 표시를 그대로 들고 연다", async () => {
    server.use(
      http.get(`/api/tests/${TEST_ID}/grade`, () =>
        HttpResponse.json(
          sheet({
            students: [
              {
                ...S[0]!,
                latest: {
                  testResultId: "a0000000-0000-4000-8000-000000000001",
                  takenAt: "2026-09-17T09:00:00.000Z",
                  gradingMode: "marks",
                  absent: false,
                  score: 66.7,
                  wrongProblemIds: [P[1]!.problemId],
                  correctCount: 2,
                },
              },
              { ...S[1]!, latest: null },
              {
                ...S[2]!,
                latest: {
                  testResultId: "a0000000-0000-4000-8000-000000000002",
                  takenAt: "2026-09-17T09:00:00.000Z",
                  gradingMode: "marks",
                  absent: true,
                  score: null,
                  wrongProblemIds: [],
                  correctCount: 0,
                },
              },
            ],
          }),
        ),
      ),
    );
    render(<GradeSheet testId={TEST_ID} />);
    const first = await rowOf("이서준");
    expect(cellButton(first, 2)).toHaveTextContent("✕");
    expect(cellButton(first, 1)).toHaveTextContent("○");
    expect(
      within(first).getByRole("button", { name: "1개 ✓" }),
    ).toBeInTheDocument();

    const third = await rowOf("박지호");
    expect(
      within(third).getByRole("button", { name: "결시", pressed: true }),
    ).toBeInTheDocument();

    // 가운데 학생만 아직 안 봤다 — 저장은 여전히 잠겨 있고 그 이름만 나온다
    expect(
      screen.getByRole("button", { name: "채점 결과 저장" }),
    ).toBeDisabled();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("김하윤");
    expect(status).not.toHaveTextContent("이서준");
  });

  it("대상 학생이 없으면 표 대신 까닭을 적는다", async () => {
    server.use(
      http.get(`/api/tests/${TEST_ID}/grade`, () =>
        HttpResponse.json(sheet({ students: [] })),
      ),
    );
    render(<GradeSheet testId={TEST_ID} />);
    expect(
      await screen.findByText("이 시험지의 대상 학생이 없습니다."),
    ).toBeInTheDocument();
  });

  it("초안 시험지는 채점을 열지 않는다 — 서버 문구를 그대로 띄운다", async () => {
    server.use(
      http.get(`/api/tests/${TEST_ID}/grade`, () =>
        HttpResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "초안 시험지는 채점할 수 없습니다. 먼저 확정하십시오.",
              details: null,
            },
          },
          { status: 422 },
        ),
      ),
    );
    render(<GradeSheet testId={TEST_ID} />);
    expect(
      await screen.findByText(
        "초안 시험지는 채점할 수 없습니다. 먼저 확정하십시오.",
      ),
    ).toBeInTheDocument();
  });
});

describe("D-08 문구 · D-30 어포던스", () => {
  it("느낌표·이모지가 없다", async () => {
    arm();
    const { container } = render(<GradeSheet testId={TEST_ID} />);
    await screen.findByRole("rowheader", { name: "이서준" });
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/[!！]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("🔴 표 행 자체는 누르는 것이 아니다 — 행에 onClick·손가락 커서가 없다", async () => {
    arm();
    await renderSheet();
    const row = await rowOf("이서준");
    expect(row.className).not.toMatch(/cursor-pointer/);
    expect(row.className).not.toMatch(/hover:bg-/);
  });
});
