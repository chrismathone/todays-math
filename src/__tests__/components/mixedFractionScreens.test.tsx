/**
 * 🔴 **초등 대분수는 모든 화면에서 한 함수로 보인다** (원장님 2026-09-19 «항상 모든 화면이
 * 일치하도록 맞춰야 사용자 경험이 상승함»).
 *
 * 작업실·새 문제은행·학습지 인쇄는 `displayFractions`(지금은 문항 단위 `fractionViewFor`)로 초등 가분수를 대분수로 보였는데,
 * 옛 화면들 — 반 → 시험지 검토 · 문제은행(`/problems`) · AI 초안 검수 · 변형 패널 · 검수 콘솔 ·
 * 관리자 문서 미리보기 — 은 같은 문항을 가분수로 보였다. 한 문항이 화면마다 다른 수로 보였다.
 *
 * 판정의 «참»은 제품 함수에서 온다 — 여기서 대분수를 손으로 만들지 않고, 그려진 KaTeX 의
 * TeX 원문(annotation)에 대분수 모양이 있는지만 본다(렌더러가 `\frac` 를 `\dfrac` 로 올린다).
 * 편집 칸(원문 입력)은 예외라 여기 없다 — 그 약속은 `StudioView.ai.test.tsx` 가 지킨다.
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import AdminDocumentPreview from "@/components/admin/AdminDocumentPreview";
import { ProblemBank } from "@/components/problem/ProblemBank";
import { ProblemCard } from "@/components/problem/ProblemCard";
import { ProblemTransformPanel } from "@/components/problem/ProblemTransformPanel";
import {
  ReviewConsole,
  type ConsoleProblem,
} from "@/components/review/ReviewConsole";
import { AiDraftReview } from "@/components/test/AiDraftReview";
import { ReviewProblemCard } from "@/components/test/ReviewProblemCard";
import { TestReview } from "@/components/test/TestReview";
import {
  MOCK_PROBLEM_WITH_FRACTION,
  MOCK_TEST_DRAFT,
  MOCK_TEST_DRAFT_PROBLEMS,
  MOCK_UNITS,
  TEST_DRAFT_ID,
} from "@/mocks/data";
import { server } from "@/mocks/server";

const CONTENT = String.raw`$\frac{10}{3}$ 보다 1 큰 수를 구하시오.`;
const ANSWER = String.raw`$\frac{13}{3}$`;
const SOLUTION = String.raw`$\frac{10}{3}+1=\frac{13}{3}$`;
const PROBLEM = {
  ...MOCK_PROBLEM_WITH_FRACTION,
  content: CONTENT,
  answer: ANSWER,
  solution: SOLUTION,
};

/** 그려진 식들의 TeX 원문 — KaTeX 가 annotation 에 남긴다. */
const tex = (root: Element) =>
  [...root.querySelectorAll("annotation")]
    .map((a) => a.textContent ?? "")
    .join(" | ");
const MIXED_10_3 = /3\\d?frac\{1\}\{3\}/;
const MIXED_13_3 = /4\\d?frac\{1\}\{3\}/;

/** 초등이면 본문·정답·해설이 대분수, 원문의 가분수는 한 자리도 안 남는다. */
function expectMixed(
  root: Element,
  parts: RegExp[] = [MIXED_10_3, MIXED_13_3],
) {
  const all = tex(root);
  for (const part of parts) expect(all).toMatch(part);
  expect(all).not.toMatch(/\{10\}\{3\}|\{13\}\{3\}/);
}
function expectRaw(root: Element) {
  const all = tex(root);
  expect(all).toMatch(/\{10\}\{3\}/);
  expect(all).not.toMatch(MIXED_10_3);
}

describe("문제은행 카드(/problems · AI 초안 검수)", () => {
  const open = () =>
    fireEvent.click(screen.getByRole("button", { name: "정답 및 해설 확인" }));

  it("초등이면 본문·정답·해설이 대분수다", () => {
    const { container } = render(<ProblemCard problem={PROBLEM} grade="초5" />);
    open();
    expectMixed(container);
  });

  it("중학 이상이거나 학년을 모르면 원문 그대로다", () => {
    for (const grade of ["중1", undefined]) {
      const { container, unmount } = render(
        <ProblemCard problem={PROBLEM} grade={grade} />,
      );
      open();
      expectRaw(container);
      unmount();
    }
  });

  it("AI 초안 검수는 문항의 단원으로 학년을 찾아 같은 카드를 그린다", () => {
    const { container } = render(
      <AiDraftReview
        drafts={[PROBLEM]}
        gradeOf={(unitId) => (unitId === PROBLEM.unitId ? "초5" : undefined)}
        onReviewStatusChange={async () => {}}
      />,
    );
    open();
    expectMixed(container);
  });
});

describe("변형 패널(옛·새 문제은행이 같이 쓴다)", () => {
  it("원본 정답과 변형 후보의 본문·정답이 대분수다", async () => {
    server.use(
      http.post("/api/problems/transform", () =>
        HttpResponse.json({
          data: [
            {
              content: CONTENT,
              answer: ANSWER,
              solution: SOLUTION,
              verified: true,
              originalAnswerRecomputed: ANSWER,
              figureSpec: null,
              figureSvg: null,
              figureError: null,
            },
          ],
          meta: { figureRequired: false, originProblemCode: "T-0001" },
        }),
      ),
    );
    const { container } = render(
      <ProblemTransformPanel
        // 트랙 14: 대분수 결정이 문항 단위라 원본 해설까지 넘긴다(패널 서명에 `solution` 추가).
        origin={{
          id: PROBLEM.id,
          answer: ANSWER,
          content: CONTENT,
          solution: SOLUTION,
          grade: "초5",
        }}
        onAdopted={() => {}}
        onClose={() => {}}
      />,
    );
    expect(tex(container)).toMatch(MIXED_13_3);
    fireEvent.click(screen.getByRole("button", { name: "변형하기" }));
    await screen.findByText(/변형 결과/);
    expectMixed(container);
  });
});

describe("시험지 검토 카드(/tests/{id})", () => {
  it("초등이면 본문·답·해설이 대분수, 중학이면 원문 그대로다", () => {
    const view = render(
      <ReviewProblemCard orderIndex={1} problem={PROBLEM} grade="초5" />,
    );
    expectMixed(view.container);
    view.unmount();
    const secondary = render(
      <ReviewProblemCard orderIndex={1} problem={PROBLEM} grade="중1" />,
    );
    expectRaw(secondary.container);
  });
});

/**
 * 배선 — 카드가 학년을 받을 줄 알아도 **넘기는 쪽이 안 넘기면** 초등도 조용히 가분수다
 * (CLAUDE.md 2026-08-18 «규칙이 옳아도 배선이 한쪽만 되면»). 목 단원은 전부 중2 라,
 * 이 문항의 단원만 초5 로 바꾼 단원 목록을 내준다.
 */
function serveElementaryUnit() {
  server.use(
    http.get("/api/units", () =>
      HttpResponse.json({
        data: MOCK_UNITS.map(({ id, grade, chapter, section, orderIndex }) => ({
          id,
          grade: id === PROBLEM.unitId ? "초5" : grade,
          chapter,
          section,
          orderIndex,
        })),
      }),
    ),
  );
}
const WAIT = { timeout: 45_000 } as const;

describe("배선 — 단원 목록으로 학년을 찾아 카드에 넘긴다", () => {
  it("시험지 검토(/tests/{id})", async () => {
    serveElementaryUnit();
    const [first, ...rest] = MOCK_TEST_DRAFT_PROBLEMS;
    server.use(
      http.get("/api/tests/:id", () =>
        HttpResponse.json({
          data: {
            test: MOCK_TEST_DRAFT,
            className: "초등 A반",
            studentName: null,
            problems: [{ ...first!, problem: PROBLEM }, ...rest],
          },
        }),
      ),
    );
    render(<TestReview testId={TEST_DRAFT_ID} />);
    const card = await screen.findByRole("article", { name: "문 1" }, WAIT);
    await waitFor(() => expectMixed(card), WAIT);
  });

  it("문제은행(/problems)", async () => {
    serveElementaryUnit();
    server.use(
      http.get("/api/problems", () =>
        HttpResponse.json({
          countUnit: "question",
          version: 2,
          queryKey: "mixed-fraction-fixture",
          data: [PROBLEM],
          meta: { page: 1, pageSize: 20, total: 1 },
        }),
      ),
    );
    render(<ProblemBank />);
    const opener = await screen.findByRole(
      "button",
      { name: "정답 및 해설 확인" },
      WAIT,
    );
    fireEvent.click(opener);
    const card = opener.closest("article")!;
    await waitFor(() => expectMixed(card), WAIT);
  });
});

describe("검수 콘솔(/review)", () => {
  it("행의 학년으로 본문·정답·해설을 대분수로 보인다", () => {
    const row: ConsoleProblem = {
      id: "90000000-0000-4000-8000-000000000101",
      problemCode: "T-0001",
      content: CONTENT,
      answer: ANSWER,
      solution: SOLUTION,
      questionType: "단답형",
      figureUrls: [],
      figureDims: [],
      figureSourceMm: [],
      directUseAllowed: true,
      unitName: "초5 · 분수의 덧셈과 뺄셈",
      grade: "초5",
      source: "manual",
      sourceFile: null,
      school: null,
      subject: null,
      examId: null,
      questionNumber: null,
      solutionSource: "none",
    };
    const { container } = render(
      <ReviewConsole
        queues={[
          { key: "figure", label: "그림", why: "", look: "", remaining: 1 },
        ]}
        initialKey="figure"
        initialRows={[row]}
        reviewedByMe={0}
      />,
    );
    expectMixed(container);
  });
});

describe("관리자 문서 미리보기", () => {
  it("저장된 문항의 학년으로 본문·정답·해설을 대분수로 보인다", () => {
    const { container } = render(
      <AdminDocumentPreview
        userId="u1"
        document={{
          id: "d1",
          kind: "draft",
          title: "시험지",
          revision: 1,
          createdAt: "2026-09-19T00:00:00.000Z",
          updatedAt: "2026-09-19T00:00:00.000Z",
          payload: {
            problems: [
              {
                content: CONTENT,
                answer: ANSWER,
                solution: SOLUTION,
                grade: "초5",
              },
              {
                content: CONTENT,
                answer: ANSWER,
                solution: SOLUTION,
                grade: "중1",
              },
            ],
          },
        }}
      />,
    );
    const [elementary, secondary] = within(container).getAllByRole("listitem");
    expectMixed(elementary!);
    expectRaw(secondary!);
  });
});
