import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse, delay } from "msw";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/mocks/server";
import { GradeSheet } from "@/components/test/GradeSheet";
import {
  textbookRetrySheet,
  textbookRetryPlan,
  missingTextbookRetryPlan,
  RETRY_QA_TEST_ID,
} from "@/mocks/textbookRetryFixture";
import {
  retryGroups,
  retryWorksheetProblems,
} from "@/components/test/retryClient";
import type { ComponentProps } from "react";
import type WorksheetEditor from "@/components/unified/WorksheetEditor";

vi.mock("@/components/unified/WorksheetEditor", () => ({
  default: (props: ComponentProps<typeof WorksheetEditor>) => (
    <div>
      <h1>{props.headerTitle}</h1>
      <button onClick={props.stepNavigation!.items[0].onSelect}>
        변형 검토로 돌아가기
      </button>
      <p>
        구성 고정: {String(props.fixedComposition)} · 초안 저장:{" "}
        {String(props.draftActions)}
      </p>
      <p>작업실 메뉴 권한: {props.allowedMenus?.join(",") || "없음"}</p>
      {props.selected.map((p) => (
        <p key={p.id}>{p.section}</p>
      ))}
    </div>
  ),
}));

function arm() {
  server.use(
    http.get(`/api/tests/${RETRY_QA_TEST_ID}/grade`, () =>
      HttpResponse.json(textbookRetrySheet()),
    ),
  );
}
async function openStudent(name = "김하윤") {
  const user = userEvent.setup();
  render(<GradeSheet testId={RETRY_QA_TEST_ID} />);
  await screen.findByRole("rowheader", { name: "김하윤" });
  await user.selectOptions(
    screen.getByLabelText("복습할 학생"),
    textbookRetrySheet().data.students.find((s) => s.name === name)!.studentId,
  );
  return user;
}

describe("저장된 교과서 오답 → 지정 변형 → 기존 학습지", () => {
  it("학생을 명시하고 저장된 기록 ID를 요청하며 원문별 두 슬롯을 출력에 보존한다", async () => {
    arm();
    const sent: unknown[] = [];
    server.use(
      http.post(`/api/tests/${RETRY_QA_TEST_ID}/retry`, async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json({ data: textbookRetryPlan() });
      }),
    );
    const user = await openStudent();
    expect(sent).toHaveLength(0);
    await user.click(
      screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
    );
    await screen.findByRole("article", { name: "원문 1번 변형 1" });
    expect(sent).toEqual([
      {
        studentId: textbookRetrySheet().data.students[0].studentId,
        testResultId:
          textbookRetrySheet().data.students[0].latest!.testResultId,
      },
    ]);
    expect(screen.getAllByText("검토 완료 변형 2 / 2문항")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "양식 구성 · 출력" }));
    await screen.findByText("구성 고정: true · 초안 저장: false");
    expect(screen.getByText("작업실 메뉴 권한: 없음")).toBeInTheDocument();
    expect(screen.getByText("원문 1번 · 변형 1")).toBeInTheDocument();
    expect(screen.getByText("원문 2번 · 변형 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "채점 결과 저장" })).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "변형 검토로 돌아가기" }),
    );
    expect(
      screen.getByRole("button", { name: "양식 구성 · 출력" }),
    ).toBeEnabled();
  });

  it("슬롯 1 부재를 슬롯 2로 메우지 않으며 0/2와 1/2 부족을 표시하고 출력을 막는다", async () => {
    arm();
    server.use(
      http.post(`/api/tests/${RETRY_QA_TEST_ID}/retry`, () =>
        HttpResponse.json({ data: missingTextbookRetryPlan() }),
      ),
    );
    const user = await openStudent();
    await user.click(
      screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
    );
    const first = await screen.findByRole("article", {
      name: "원문 1번 변형 1",
    });
    expect(
      within(first).getByText("이 슬롯의 검토 완료 변형이 없습니다."),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("article", { name: "원문 1번 변형 2" }),
      ).getByText(/J22026-A01-002/),
    ).toBeInTheDocument();
    expect(screen.getByText("검토 완료 변형 0 / 2문항")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "양식 구성 · 출력" }),
    ).toBeDisabled();
  });

  it.each([403, 404, 422, 503])(
    "API %s 오류를 표시하고 다시 불러오기에서 복구한다",
    async (status) => {
      arm();
      let calls = 0;
      server.use(
        http.post(`/api/tests/${RETRY_QA_TEST_ID}/retry`, () =>
          ++calls === 1
            ? HttpResponse.json(
                { error: { message: `복습 오류 ${status}` } },
                { status },
              )
            : HttpResponse.json({ data: textbookRetryPlan() }),
        ),
      );
      const user = await openStudent();
      await user.click(
        screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        `복습 오류 ${status}`,
      );
      expect(
        screen.queryByRole("button", { name: "양식 구성 · 출력" }),
      ).toBeNull();
      await user.click(
        screen.getByRole("button", { name: "복습 문항 다시 불러오기" }),
      );
      expect(
        await screen.findByRole("button", { name: "양식 구성 · 출력" }),
      ).toBeEnabled();
    },
  );

  it.each([
    ["이서준", "아직 안 본 학생"],
    ["박지호", "결시 기록"],
    ["최수빈", "오답이 없습니다"],
    ["채점미완료", "완료된 채점 기록"],
  ])("%s 상태를 오답이나 점수로 꾸미지 않는다", async (name, reason) => {
    arm();
    await openStudent(name);
    expect(
      within(
        screen.getByRole("region", { name: "저장된 오답 복습" }),
      ).getByText(new RegExp(reason)),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
    ).toBeDisabled();
    if (name === "채점미완료")
      expect(
        screen.getByRole("button", { name: "채점미완료 2번 아직 안 봄" }),
      ).toHaveTextContent("");
  });

  it("채점 수정 시 열린 계획을 폐기하고 저장 전 복습을 막는다", async () => {
    arm();
    server.use(
      http.post(`/api/tests/${RETRY_QA_TEST_ID}/retry`, () =>
        HttpResponse.json({ data: textbookRetryPlan() }),
      ),
    );
    const user = await openStudent();
    await user.click(
      screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
    );
    await screen.findByRole("button", { name: "양식 구성 · 출력" });
    await user.click(screen.getByRole("button", { name: "김하윤 3번 맞음" }));
    expect(
      screen.queryByRole("button", { name: "양식 구성 · 출력" }),
    ).toBeNull();
    expect(screen.getByText(/수정한 채점을 먼저 저장/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
    ).toBeDisabled();
  });

  it("학생 전환 뒤 도착한 이전 응답이 새 학생의 계획이 되지 않는다", async () => {
    arm();
    server.use(
      http.post(`/api/tests/${RETRY_QA_TEST_ID}/retry`, async () => {
        await delay(120);
        return HttpResponse.json({ data: textbookRetryPlan() });
      }),
    );
    const user = await openStudent();
    await user.click(
      screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
    );
    await user.selectOptions(
      screen.getByLabelText("복습할 학생"),
      textbookRetrySheet().data.students[1].studentId,
    );
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("region", { name: "저장된 오답 복습" }),
        ).getByText(/아직 안 본 학생/),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "양식 구성 · 출력" }),
    ).toBeNull();
  });

  it("지정되지 않은 변형을 거절한다", () => {
    const plan = textbookRetryPlan();
    plan.picked[0].problem.externalId = "unrelated";
    expect(() => retryGroups(plan, textbookRetrySheet().data.problems)).toThrow(
      /지정된/,
    );
  });

  it("저장 후 새 기록 ID를 다시 읽고 그 ID만 복습에 사용한다", async () => {
    let saved = false;
    const initial = textbookRetrySheet();
    const updated = textbookRetrySheet();
    updated.data.students = updated.data.students.slice(0, 1);
    initial.data.students = initial.data.students.slice(0, 1);
    updated.data.students[0].latest!.testResultId =
      "92000000-0000-4000-8000-000000000001";
    updated.data.students[0].latest!.wrongProblemIds.push(
      initial.data.problems[2].problemId,
    );
    updated.data.students[0].latest!.correctCount = 5;
    const sent: unknown[] = [];
    server.use(
      http.get(`/api/tests/${RETRY_QA_TEST_ID}/grade`, () =>
        HttpResponse.json(saved ? updated : initial),
      ),
      http.post(`/api/tests/${RETRY_QA_TEST_ID}/grade`, () => {
        saved = true;
        return HttpResponse.json({
          data: {
            testId: RETRY_QA_TEST_ID,
            scores: [
              {
                studentId: initial.data.students[0].studentId,
                name: "김하윤",
                absent: false,
                correctCount: 5,
                problemCount: 8,
                score: 62.5,
              },
            ],
            gradedCount: 1,
            absentCount: 0,
          },
        });
      }),
      http.post(`/api/tests/${RETRY_QA_TEST_ID}/retry`, async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json({ data: textbookRetryPlan(updated.data) });
      }),
    );
    const user = await openStudent();
    await user.click(screen.getByRole("button", { name: "김하윤 3번 맞음" }));
    await user.click(screen.getByRole("button", { name: "채점 결과 저장" }));
    await screen.findByRole("region", { name: "채점 결과" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
      ).toBeEnabled(),
    );
    await user.click(
      screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
    );
    await screen.findByRole("article", { name: "원문 3번 변형 2" });
    expect(sent).toEqual([
      {
        studentId: initial.data.students[0].studentId,
        testResultId: updated.data.students[0].latest!.testResultId,
      },
    ]);
  });

  it("저장 성공 뒤 기록 재조회 실패를 저장 실패와 구분하고 기존 기록으로 복습하지 않는다", async () => {
    let saved = false;
    const sheet = textbookRetrySheet();
    sheet.data.students = sheet.data.students.slice(0, 1);
    server.use(
      http.get(`/api/tests/${RETRY_QA_TEST_ID}/grade`, () =>
        saved
          ? HttpResponse.json(
              { error: { message: "조회 실패" } },
              { status: 503 },
            )
          : HttpResponse.json(sheet),
      ),
      http.post(`/api/tests/${RETRY_QA_TEST_ID}/grade`, () => {
        saved = true;
        return HttpResponse.json({
          data: {
            testId: RETRY_QA_TEST_ID,
            scores: [
              {
                studentId: sheet.data.students[0].studentId,
                name: "김하윤",
                absent: false,
                correctCount: 6,
                problemCount: 8,
                score: 75,
              },
            ],
            gradedCount: 1,
            absentCount: 0,
          },
        });
      }),
    );
    const user = await openStudent();
    await user.click(screen.getByRole("button", { name: "채점 결과 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "채점은 저장됐지만 저장된 기록을 다시 읽지 못했습니다",
    );
    expect(
      screen.getByRole("region", { name: "채점 결과" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "저장된 기록 다시 확인" }),
    ).toBeEnabled();
  });

  it("다른 학생·저장 기록의 응답은 화면에 올리지 않는다", async () => {
    arm();
    const plan = textbookRetryPlan();
    plan.testResultId = "92000000-0000-4000-8000-000000000001";
    server.use(
      http.post(`/api/tests/${RETRY_QA_TEST_ID}/retry`, () =>
        HttpResponse.json({ data: plan }),
      ),
    );
    const user = await openStudent();
    await user.click(
      screen.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "저장된 채점과 복습 응답이 다릅니다",
    );
    expect(
      screen.queryByRole("button", { name: "양식 구성 · 출력" }),
    ).toBeNull();
  });

  it("응답 순서가 뒤집혀도 원문과 슬롯 순서를 지키고 본문·답·도형을 그대로 전달한다", () => {
    const plan = textbookRetryPlan();
    plan.picked.reverse();
    const output = retryWorksheetProblems(
      retryGroups(plan, textbookRetrySheet().data.problems),
    );
    expect(output.map((p) => p.section)).toEqual([
      "원문 1번 · 변형 1",
      "원문 1번 · 변형 2",
      "원문 2번 · 변형 1",
      "원문 2번 · 변형 2",
    ]);
    const source = plan.picked.find(
      (p) => p.problem.id === output[2].id,
    )!.problem;
    expect(output[2].content).toBe(source.content);
    expect(output[2].answer).toBe(source.answer);
    expect(output[2].figureSvg).toBe(source.figureSvg);
  });
});
