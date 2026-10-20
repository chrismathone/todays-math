/**
 * 🔴 **한 문항은 어느 화면에서나, 본문·정답·해설 어디서나 같은 분수 모양이다**
 * (원장님 2026-09-19 «항상 모든 화면이 일치하도록 맞춰야 사용자 경험이 상승함» → «항상 뷰는 통일이야»).
 *
 * 트랙 12 는 대분수 표시를 한 함수로 모았지만 그 함수가 **글마다** 판정했다 — 본문은 본문대로,
 * 해설은 해설대로. 그래서 초6 «(가분수)÷(분수)» 한 문항 안에서 본문 «7/2 ÷ 2/3» 은 3½ 로 바뀌고
 * 해설 «가분수는 그대로 두고 7/2×3/2» 는 원문으로 남았다(초등 엔진 1,380문항 중 3문항). 게다가
 * 본문만 보는 화면(시험지 검토 본문·검수 콘솔 본문·변형 후보 본문)은 해설을 몰라, 같은 본문이
 * 해설을 함께 보는 화면과 다른 수로 보일 수 있었다.
 *
 * 이 시험은 **같은 문항을 모든 화면 컴포넌트에 넣고**, 화면 × 분수마다 보인 모양을 표 하나로
 * 모아 한 번에 견준다. 표의 «참»은 문항 단위 결정 하나에서 온다 — 화면마다 따로 짓지 않는다.
 * 판정은 그려진 KaTeX 의 TeX 원문(annotation)과 원본 편집기 표시의 `data-math-tex` 로 한다.
 * 편집 칸(원문 입력)은 예외라 여기 없다 — `StudioView.ai.test.tsx` 가 지킨다.
 */
import {
  fireEvent,
  render,
  screen,
  within,
  type RenderResult,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import AdminDocumentPreview from "@/components/admin/AdminDocumentPreview";
import { TestPrint } from "@/components/print/TestPrint";
import { ProblemCard } from "@/components/problem/ProblemCard";
import { ProblemTransformPanel } from "@/components/problem/ProblemTransformPanel";
import {
  ReviewConsole,
  type ConsoleProblem,
} from "@/components/review/ReviewConsole";
import { AiDraftReview } from "@/components/test/AiDraftReview";
import { ReviewProblemCard } from "@/components/test/ReviewProblemCard";
import BankView from "@/components/unified/BankView";
import { AnswerPage } from "@/components/unified/print/AnswerPage";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import StudioReviewPane from "@/components/unified/StudioReviewPane";
import type { StudioCrop } from "@/components/unified/studioHelpers";
import type { BankProblem, StudioProblem } from "@/components/unified/types";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import { toPrintProblem } from "@/lib/print/toPrintProblem";
import { MOCK_PROBLEM_WITH_FRACTION } from "@/mocks/data";
import { server } from "@/mocks/server";

type Part = "본문" | "정답" | "해설";
type Form = "원문" | "대분수";

/** 한 가분수 — 원문으로 보이면 `raw`, 대분수로 보이면 `mixed` 가 TeX 에 있다. */
interface Marker {
  label: string;
  /** 이 분수가 들어 있는 글. 그 글을 보이는 화면에서는 반드시 나와야 한다(빈 표로 초록 금지). */
  parts: Part[];
  raw: RegExp;
  mixed: RegExp;
}
interface Fixture {
  name: string;
  grade: string;
  content: string;
  answer: string;
  solution: string;
  markers: Marker[];
  /** 문항 단위 결정 — 이 문항의 모든 화면·모든 글이 이 모양이다. */
  expected: Form;
}

/** 앞에 숫자가 붙지 않은(= 대분수의 분수 부분이 아닌) `\frac{n}{d}`. */
const rawFrac = (n: number, d: number) =>
  new RegExp(String.raw`(?<![\d}])\\frac\{${n}\}\{${d}\}`);
const mixedFrac = (whole: number, n: number, d: number) =>
  new RegExp(String.raw`(?<!\d)${whole}\\frac\{${n}\}\{${d}\}`);

const DIVISION = {
  content: String.raw`다음을 계산하시오.

$\frac{7}{2}\div\frac{2}{3}=\square$`,
  // 엔진 정답은 5¼ 이다 — 결정이 정답 칸에서도 보이게 가분수로 적었다.
  answer: String.raw`$\frac{21}{4}$`,
  solution: String.raw`가분수는 그대로 두고 나누는 수의 분모와 분자를 바꾸어 곱합니다. $\frac{7}{2}\times\frac{3}{2}=\frac{21}{4}$`,
};
const DIVISION_MARKERS: Marker[] = [
  {
    label: "7/2",
    parts: ["본문", "해설"],
    raw: rawFrac(7, 2),
    mixed: mixedFrac(3, 1, 2),
  },
  {
    label: "21/4",
    parts: ["정답", "해설"],
    raw: rawFrac(21, 4),
    mixed: mixedFrac(5, 1, 4),
  },
];
const BORROW = {
  content: String.raw`$6\frac{6}{12}-3\frac{11}{12}=\square$`,
  answer: String.raw`$2\frac{7}{12}$`,
  solution: String.raw`분수끼리 뺄 수 없으므로 $6\frac{6}{12}=5\frac{18}{12}$로 고칩니다. $5-3=2$, $\frac{18}{12}-\frac{11}{12}=\frac{7}{12}$ 이므로 답은 $2\frac{7}{12}$ 입니다.`,
};
const BORROW_MARKERS: Marker[] = [
  {
    label: "18/12",
    parts: ["해설"],
    raw: rawFrac(18, 12),
    mixed: mixedFrac(1, 6, 12),
  },
];
const PLAIN = {
  content: String.raw`$\frac{10}{3}$ 보다 1 큰 수를 구하시오.`,
  answer: String.raw`$\frac{13}{3}$`,
  solution: String.raw`$\frac{10}{3}+1=\frac{13}{3}$`,
};
const PLAIN_MARKERS: Marker[] = [
  {
    label: "10/3",
    parts: ["본문", "해설"],
    raw: rawFrac(10, 3),
    mixed: mixedFrac(3, 1, 3),
  },
  {
    label: "13/3",
    parts: ["정답", "해설"],
    raw: rawFrac(13, 3),
    mixed: mixedFrac(4, 1, 3),
  },
];

const FIXTURES: Fixture[] = [
  {
    name: "초6 «(가분수)÷(분수)» — 해설이 «가분수»를 부른다",
    grade: "초6",
    ...DIVISION,
    markers: DIVISION_MARKERS,
    expected: "원문",
  },
  {
    name: "초4 받아내림 — 이름을 안 부른다(«고칩니다»)",
    grade: "초4",
    ...BORROW,
    markers: BORROW_MARKERS,
    expected: "대분수",
  },
  {
    name: "초4 받아내림 — 본문이 «대분수»를 부른다",
    grade: "초4",
    ...BORROW,
    content: `대분수의 뺄셈을 하시오. ${BORROW.content}`,
    markers: BORROW_MARKERS,
    expected: "원문",
  },
  {
    name: "평범한 초5",
    grade: "초5",
    ...PLAIN,
    markers: PLAIN_MARKERS,
    expected: "대분수",
  },
  {
    name: "중1",
    grade: "중1",
    ...PLAIN,
    markers: PLAIN_MARKERS,
    expected: "원문",
  },
];

/** 그려진 식들의 TeX — KaTeX annotation + 원본 편집기 표시(`data-math-tex`). */
function texOf(root: Element): string {
  const katex = [...root.querySelectorAll("annotation")].map(
    (node) => node.textContent ?? "",
  );
  const editor = [...root.querySelectorAll<HTMLElement>("[data-math-tex]")].map(
    (node) => decodeURIComponent(node.dataset.mathTex ?? ""),
  );
  return [...katex, ...editor]
    .join(" | ")
    .replace(/\\[dt]frac/g, "\\frac")
    .replace(/\s+/g, "");
}

type Shown = Pick<RenderResult, "unmount"> & { root: Element };
interface Screen {
  name: string;
  /** 이 화면이 보이는 글 — 그 글의 분수는 반드시 표에 나와야 한다. */
  parts: Part[];
  show: (f: Fixture) => Shown | Promise<Shown>;
}

const entity = (f: Fixture) => ({
  ...MOCK_PROBLEM_WITH_FRACTION,
  content: f.content,
  answer: f.answer,
  solution: f.solution,
});
const studioProblem = (f: Fixture): StudioProblem => ({
  id: "p1",
  content: f.content,
  answer: f.answer,
  solution: f.solution,
  grade: f.grade,
  chapter: "",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
});
const crop = (f: Fixture): StudioCrop => ({
  id: "c1",
  sourceId: "s1",
  sourceLabel: "원본",
  page: 1,
  rect: { x: 0, y: 0, width: 1, height: 1 },
  image: "",
  figures: [],
  content: f.content,
  answer: f.answer,
  solution: f.solution,
  level: f.grade.startsWith("초") ? "elementary" : "secondary",
  grade: f.grade,
  mode: "text",
  added: false,
});
const mounted = (view: RenderResult, root: Element = view.container) => ({
  root,
  unmount: view.unmount,
});
const noop = () => {};

const SCREENS: Screen[] = [
  {
    name: "작업실 검수 칸 미리보기",
    parts: ["본문", "정답", "해설"],
    show: (f) =>
      mounted(
        render(
          <StudioReviewPane
            crops={[crop(f)]}
            allCrops={[crop(f)]}
            activeId="c1"
            page={1}
            jobs={[]}
            figureJobs={[]}
            available
            onSelect={noop}
            onUpdate={noop}
            onRun={noop}
            onCancel={noop}
            onRetry={noop}
            onCrop={noop}
            onEditFigure={noop}
            onRetryPage={noop}
            onRenderFigure={noop}
            onCancelFigure={noop}
          />,
        ),
      ),
  },
  {
    name: "새 문제은행 목록·학습지 본문",
    parts: ["본문"],
    show: (f) =>
      mounted(render(<UnifiedProblem problem={studioProblem(f)} print />)),
  },
  {
    name: "학습지 본문(작업실 문항)",
    parts: ["본문"],
    show: (f) =>
      mounted(
        render(
          <UnifiedProblem
            problem={{ ...studioProblem(f), studioCrop: crop(f) }}
            print
          />,
        ),
      ),
  },
  {
    name: "새 문제은행 상세",
    parts: ["본문", "정답", "해설"],
    show: (f) => {
      const row: BankProblem = {
        ...studioProblem(f),
        source: "manual",
        familyKey: null,
        originProblemId: null,
        questionTypeRaw: null,
        reviewStatus: "approved",
        eligible: true,
      };
      const view = render(
        <BankView
          initialData={{
            countUnit: "question",
            version: 2,
            queryKey: "fraction-view-fixture",
            problems: [row],
            total: 1,
            page: 1,
            pageSize: 12,
            grades: [{ grade: f.grade, count: 1 }],
            chapters: [],
          }}
          selected={[]}
          onToggle={vi.fn()}
          onExport={vi.fn()}
          canUseAi={false}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
      return mounted(view, screen.getByRole("dialog"));
    },
  },
  {
    name: "학습지 정답지",
    parts: ["정답", "해설"],
    show: (f) =>
      mounted(
        render(
          <AnswerPage
            page={1}
            totalPages={1}
            columns={1}
            meta={{ title: "학습지", subject: "수학" }}
            problems={[
              { id: "p1", variant: { ...studioProblem(f), topic: "" } },
            ]}
            startingNumber={1}
            options={DEFAULT_PRINT_OPTIONS}
            measure={{ columnWidthPx: 480 }}
          />,
        ),
      ),
  },
  {
    name: "변형 패널(원본 정답 · 후보)",
    parts: ["본문", "정답"],
    show: async (f) => {
      // 후보는 원본과 같은 글 — 후보도 제 글 전부로 한 번 정한다.
      server.use(
        http.post("/api/problems/transform", () =>
          HttpResponse.json({
            data: [
              {
                content: f.content,
                answer: f.answer,
                solution: f.solution,
                verified: true,
                originalAnswerRecomputed: f.answer,
                figureSpec: null,
                figureSvg: null,
                figureError: null,
              },
            ],
            meta: { figureRequired: false, originProblemCode: "T-0001" },
          }),
        ),
      );
      const view = render(
        <ProblemTransformPanel
          origin={{ ...entity(f), grade: f.grade }}
          onAdopted={noop}
          onClose={noop}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "변형하기" }));
      await screen.findByText(/변형 결과/);
      return mounted(view);
    },
  },
  {
    name: "옛 문제은행 카드",
    parts: ["본문", "정답", "해설"],
    show: (f) => {
      const view = render(<ProblemCard problem={entity(f)} grade={f.grade} />);
      fireEvent.click(
        screen.getByRole("button", { name: "정답 및 해설 확인" }),
      );
      return mounted(view);
    },
  },
  {
    name: "AI 초안 검수",
    parts: ["본문", "정답", "해설"],
    show: (f) => {
      const view = render(
        <AiDraftReview
          drafts={[entity(f)]}
          gradeOf={() => f.grade}
          onReviewStatusChange={async () => {}}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "정답 및 해설 확인" }),
      );
      return mounted(view);
    },
  },
  {
    name: "시험지 검토",
    parts: ["본문", "정답", "해설"],
    show: (f) =>
      mounted(
        render(
          <ReviewProblemCard
            orderIndex={1}
            problem={entity(f)}
            grade={f.grade}
          />,
        ),
      ),
  },
  {
    name: "시험지 인쇄 — 문제지",
    parts: ["본문"],
    show: (f) => mounted(render(<TestPrint data={printDocument(f)} />)),
  },
  {
    name: "시험지 인쇄 — 정답지",
    parts: ["정답", "해설"],
    show: (f) =>
      mounted(
        render(<TestPrint data={printDocument(f)} initialMode="answers" />),
      ),
  },
  {
    name: "검수 콘솔",
    parts: ["본문", "정답", "해설"],
    show: (f) => {
      const row: ConsoleProblem = {
        id: "90000000-0000-4000-8000-000000000101",
        problemCode: "T-0001",
        content: f.content,
        answer: f.answer,
        solution: f.solution,
        questionType: "단답형",
        figureUrls: [],
        figureDims: [],
        figureSourceMm: [],
        directUseAllowed: true,
        unitName: `${f.grade} · 분수`,
        grade: f.grade,
        source: "manual",
        sourceFile: null,
        school: null,
        subject: null,
        examId: null,
        questionNumber: null,
        solutionSource: "none",
      };
      return mounted(
        render(
          <ReviewConsole
            queues={[
              { key: "figure", label: "그림", why: "", look: "", remaining: 1 },
            ]}
            initialKey="figure"
            initialRows={[row]}
            reviewedByMe={0}
          />,
        ),
      );
    },
  },
  {
    name: "관리자 문서 미리보기",
    parts: ["본문", "정답", "해설"],
    show: (f) => {
      const view = render(
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
                  content: f.content,
                  answer: f.answer,
                  solution: f.solution,
                  grade: f.grade,
                },
              ],
            },
          }}
        />,
      );
      return mounted(view, within(view.container).getByRole("listitem"));
    },
  },
];

function printDocument(f: Fixture) {
  return {
    testId: null,
    testType: "daily" as const,
    testDate: "2026-09-19",
    className: "초등 A반",
    section: "분수",
    todayGoal: "",
    conceptNote: "",
    problems: [
      toPrintProblem(
        {
          id: "20000000-0000-4000-8000-000000000001",
          unit: { grade: f.grade },
          content: f.content,
          answer: f.answer,
          solution: f.solution,
        },
        1,
      ),
    ],
  };
}

/** 한 화면에서 분수마다 보인 모양. 한 화면 안에서 두 모양이 섞이면 «섞임». */
function formsIn(root: Element, markers: Marker[]) {
  const tex = texOf(root);
  const table: Record<string, Form | "섞임"> = {};
  for (const marker of markers) {
    const raw = marker.raw.test(tex),
      mixed = marker.mixed.test(tex);
    if (raw || mixed)
      table[marker.label] = raw && mixed ? "섞임" : raw ? "원문" : "대분수";
  }
  return table;
}

/** 이 화면이 보여야 하는 표 — 보이는 글에 든 분수는 모두, 문항 단위 결정 하나의 모양으로. */
function expectedIn(screenParts: Part[], f: Fixture) {
  const table: Record<string, Form | "섞임"> = {};
  for (const marker of f.markers)
    if (marker.parts.some((part) => screenParts.includes(part)))
      table[marker.label] = f.expected;
  return table;
}

const WAIT = 60_000;

describe("같은 문항을 모든 화면에 넣으면 분수 모양이 모두 같다", () => {
  it.each(FIXTURES)(
    "$name",
    async (fixture) => {
      const seen: Record<string, Record<string, Form | "섞임">> = {};
      const want: Record<string, Record<string, Form | "섞임">> = {};
      for (const item of SCREENS) {
        const shown = await item.show(fixture);
        seen[item.name] = formsIn(shown.root, fixture.markers);
        want[item.name] = expectedIn(item.parts, fixture);
        shown.unmount();
      }
      // 화면 × 분수 표 하나로 견준다 — 틀리면 어느 화면·어느 글이 갈렸는지가 표로 보인다.
      expect(seen).toEqual(want);
      // 화면끼리도 같다 — 표 전체에 나온 모양은 하나뿐이다.
      expect(
        new Set(Object.values(seen).flatMap((row) => Object.values(row))),
      ).toEqual(new Set([fixture.expected]));
    },
    WAIT,
  );
});
