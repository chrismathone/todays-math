/**
 * 🔴 RED → 🟢 — 관리자 화면의 «누구의 반» 담당 딱지 · 화면 짝 (D-132 Hi-fi 3 «꼬리표» · 05 §8.11).
 *
 * 데이터: `src/app/dev/class-owner-hifi/fixture.ts` — 시안의 반 8개. 캡처 페이지와 같은 데이터다.
 * 뒷단 짝은 `api/classOwner.test.ts` · `api/classOwnerOverview.test.ts`.
 *
 * ## 짝으로 둔다 — 같은 행 · 담당만 있고 없다
 *
 * 화면은 `isAdmin` 을 읽지 않는다. 서버가 관리자에게만 `owner` 를 싣고, 화면은 «칸이 있으면 그린다»
 * 하나로 가른다. 그래서 자리마다 **같은 행**을 담당이 있는 채(관리자)와 뺀 채(관리자 아님)로 그린다.
 *
 *   · 관리자     — 딱지(내 반은 «내 반») · 표는 «담당» 머리 · 선택 상자는 «반 이름 · 담당 6자» + title
 *   · 관리자 아님 — 딱지도 «담당» 머리도 title 도 없다(지금 화면 그대로)
 *
 * 🔴 인쇄 지면은 여기서 보지 않는다 — 손대지 않았다(D-132 ⑺). 변이 하네스가 인쇄 파일 무변화를 본다.
 */
import { http, HttpResponse } from "msw";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CONCEPT_BOARD_OWNERS,
  LONGEST_OWNER,
  OWNER_CLASSES,
  plain,
} from "@/app/dev/class-owner-hifi/fixture";
import {
  hifiBoard,
  hifiUnitLectures,
  hifiUnits,
} from "@/app/dev/concept-hifi/fixture";
import { ClassTable } from "@/components/class/ClassTable";
import { StudentList } from "@/components/class/StudentList";
import { ClassCard } from "@/components/main/ClassCard";
import { DoneSummaryRow } from "@/components/main/DoneSummaryRow";
import { LedgerTable } from "@/components/main/LedgerTable";
import { ProgressPanel } from "@/components/main/ProgressPanel";
import { BasketPanel } from "@/components/problem/BasketPanel";
import { TestReview } from "@/components/test/TestReview";
import { OwnerTag } from "@/components/ui/OwnerTag";
import ConceptView from "@/components/unified/ConceptView";
import TeachingOverview from "@/components/unified/TeachingOverview";
import type { ClassEntity } from "@/contracts/class.contract";
import { conceptBoardResponseSchema } from "@/contracts/conceptAdmin.contract";
import { buildClassRows } from "@/lib/main/pipeline";
import {
  CLASS_A_ID,
  CLASS_B_ID,
  MOCK_CLASS_A,
  MOCK_CLASS_B,
  MOCK_TEST_DRAFT,
  MOCK_TEST_DRAFT_PROBLEMS,
  TEST_DRAFT_ID,
} from "@/mocks/data";
import { server } from "@/mocks/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const ADMIN = OWNER_CLASSES;
const PLAIN = plain(OWNER_CLASSES) as ClassEntity[];
const CASES = [
  { who: "관리자", classes: ADMIN, admin: true },
  { who: "관리자 아님", classes: PLAIN, admin: false },
] as const;

const tags = (root: ParentNode = document) =>
  Array.from(root.querySelectorAll<HTMLElement>("[data-owner-tag]"));

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────
// 딱지 한 벌 — 05 §8.11 표
// ─────────────────────────────────────────────

describe("OwnerTag — 05 §8.11", () => {
  it("장부 결: 담당은 옅은 회색(--side) · 먹 글자 · 500, 내 반은 먹색 · 흰 글자 · 700 «내 반»", () => {
    render(
      <>
        <OwnerTag owner={{ name: "강선생", mine: false }} />
        <OwnerTag owner={{ name: "관리자", mine: true }} />
      </>,
    );
    const [other, mine] = tags();
    expect(other).toHaveTextContent(/^강선생$/);
    expect(other!.className.split(" ")).toEqual(
      expect.arrayContaining(["bg-side", "text-ink", "font-medium"]),
    );
    expect(mine).toHaveTextContent(/^내 반$/);
    expect(mine!.className.split(" ")).toEqual(
      expect.arrayContaining(["bg-ink", "text-white", "font-bold"]),
    );
    for (const tag of [other!, mine!])
      expect(tag.className.split(" ")).toEqual(
        expect.arrayContaining([
          "text-[11.5px]",
          "leading-[18px]",
          "px-[7px]",
          "py-px",
          "rounded-[3px]",
        ]),
      );
  });

  it("작업실 결: #EEF1F5 · #172B4D / 내 반은 #172B4D · 흰 글자", () => {
    render(
      <>
        <OwnerTag tone="workroom" owner={{ name: "강선생", mine: false }} />
        <OwnerTag tone="workroom" owner={{ name: "관리자", mine: true }} />
      </>,
    );
    const [other, mine] = tags();
    expect(other!.className).toContain("bg-[#eef1f5]");
    expect(other!.className).toContain("text-[#172b4d]");
    expect(mine!.className).toContain("bg-[#172b4d]");
    expect(mine!.className).toContain("text-white");
  });

  it("D-30: 딱지는 누르는 것이 아니다 — 손가락 커서 · hover 없음 · 단추 아님", () => {
    render(<OwnerTag owner={{ name: "강선생", mine: false }} />);
    const [tag] = tags();
    expect(tag!.tagName).toBe("SPAN");
    expect(tag!.className).not.toMatch(/cursor-pointer|hover:/);
    expect(tag!.getAttribute("role")).toBeNull();
    expect(tag!.onclick).toBeNull();
  });

  it("딱지는 자르지 않는다 — 가장 긴 담당 이름 전체", () => {
    render(<OwnerTag owner={{ name: LONGEST_OWNER, mine: false }} />);
    expect(tags()[0]).toHaveTextContent(LONGEST_OWNER);
  });
});

// ─────────────────────────────────────────────
// 반 · 학생 관리 — 반 표 · 학생 칸 머리
// ─────────────────────────────────────────────

describe.each(CASES)("반 · 학생 관리 반 표 — $who", ({ classes, admin }) => {
  it(admin ? "반 · 학년 · 담당 열" : "반 · 학년 — 담당 열 없음", () => {
    render(
      <ClassTable
        classes={classes}
        selectedClassId={classes[1]!.id}
        onSelect={vi.fn()}
      />,
    );
    const heads = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(heads).toEqual(admin ? ["반", "학년", "담당"] : ["반", "학년"]);

    if (!admin) {
      expect(tags()).toHaveLength(0);
      return;
    }
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(8);
    // 담당은 마지막 칸 — 행마다 딱지 하나
    expect(
      rows.map((r) => within(r).getAllByRole("cell").at(-1)!.textContent),
    ).toEqual([
      "내 반",
      "강선생",
      "강선생",
      "강선생",
      "원장",
      "걷기원장",
      "빈손선생님",
      LONGEST_OWNER,
    ]);
    expect(tags(rows[0]!)[0]!.dataset.ownerTag).toBe("mine");
    // 딱지는 반 고르는 단추 밖이다
    for (const tag of tags()) expect(tag.closest("button")).toBeNull();
  });
});

it("반 표 — 반이 없으면 담당 열도 없다(빈 칸 안내는 두 칸 그대로)", () => {
  render(<ClassTable classes={[]} selectedClassId="" onSelect={vi.fn()} />);
  expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  expect(screen.getByRole("cell")).toHaveAttribute("colspan", "2");
});

describe.each(CASES)(
  "학생 칸 머리 «반 · 학년» ★ — $who",
  ({ classes, admin }) => {
    it(admin ? "뒤에 딱지" : "딱지 없음", () => {
      render(
        <StudentList
          students={[]}
          selectedClass={classes[7]}
          status="ready"
          onRetry={vi.fn()}
        />,
      );
      const line = screen.getByText(/이어반 · 중2/);
      expect(tags(line.parentElement!)).toHaveLength(admin ? 1 : 0);
      if (admin) expect(tags()[0]).toHaveTextContent(LONGEST_OWNER);
    });
  },
);

// ─────────────────────────────────────────────
// 메인 — 반별 표 · 카드 · 끝난 반 한 줄 · 진도 입력 패널
// ─────────────────────────────────────────────

describe.each(CASES)("메인 — $who", ({ classes, admin }) => {
  const rows = () => buildClassRows(classes, [], {}, []);

  it(
    admin ? "반별 표: 반 · 담당 · 현재 진도 …" : "반별 표: 담당 열 없음",
    () => {
      render(
        <LedgerTable
          rows={rows()}
          selectedClassId=""
          onSelect={vi.fn()}
          onProgress={vi.fn()}
        />,
      );
      const heads = screen
        .getAllByRole("columnheader")
        .map((h) => h.textContent);
      expect(heads).toEqual(
        admin
          ? ["반", "담당", "현재 진도", "오늘", "내일 테스트", "작업"]
          : ["반", "현재 진도", "오늘", "내일 테스트", "작업"],
      );
      expect(tags()).toHaveLength(admin ? 8 : 0);
      if (admin) {
        const first = screen.getAllByRole("row")[1]!;
        expect(within(first).getAllByRole("cell")[1]).toHaveTextContent(
          /^내 반$/,
        );
      }
    },
  );

  it(admin ? "카드: 반 이름 바로 뒤에 딱지" : "카드: 딱지 없음", () => {
    const row = rows().find((r) => r.name === "걷기반")!;
    render(
      <ClassCard
        row={row}
        index={1}
        hot={false}
        onSelect={vi.fn()}
        onProgress={vi.fn()}
      />,
    );
    const name = screen.getByText("걷기반");
    if (!admin) {
      expect(tags()).toHaveLength(0);
      return;
    }
    expect(name.nextElementSibling).toBe(tags()[0]);
    expect(tags()[0]).toHaveTextContent("걷기원장");
  });

  it(
    admin ? "끝난 반 한 줄 ★: 반 이름 뒤에 딱지" : "끝난 반 한 줄 ★: 딱지 없음",
    () => {
      const row = { ...rows()[0]!, stage: "done" as const };
      render(<DoneSummaryRow row={row} hot={false} onSelect={vi.fn()} />);
      expect(tags()).toHaveLength(admin ? 1 : 0);
      if (admin) expect(tags()[0]).toHaveTextContent("내 반");
    },
  );

  it(
    admin
      ? "진도 입력 패널 ★: 고른 반 이름 뒤에 딱지"
      : "진도 입력 패널 ★: 딱지 없음",
    () => {
      render(
        <ProgressPanel
          classes={classes}
          units={[]}
          selectedClassId={classes[1]!.id}
          selectedUnitId={null}
          printedDays={0}
          unmodifiedRate={0}
          error={null}
          canRecord={false}
          suggestion={null}
          onStep={vi.fn()}
          onRecord={vi.fn()}
        />,
      );
      const picked = screen.getByLabelText("선택한 반");
      expect(picked).toHaveTextContent(admin ? "테스트반강선생" : /^테스트반$/);
      expect(tags(picked)).toHaveLength(admin ? 1 : 0);
    },
  );
});

describe("메인 순서 — 내 반이 맨 위, 나머지는 단계 순서 그대로", () => {
  it("단계가 뒤인 내 반도 맨 위로 온다", () => {
    const tests = [
      {
        ...MOCK_TEST_DRAFT,
        // 테스트 B — 확인테스트 초안(검수 단계)이라 단계 순서로는 맨 위다.
        // 일일테스트는 현재 진도 차시의 것만 오늘 것으로 치므로(진도 없음) 확인테스트로 둔다.
        classId: ADMIN[4]!.id,
        studentId: null,
        testType: "review" as const,
        status: "draft" as const,
      },
    ];
    const progress = { [ADMIN[4]!.id]: null };
    const withOwners = buildClassRows(ADMIN, tests, progress, []);
    const without = buildClassRows(PLAIN, tests, progress, []);

    // 관리자 아님: 단계 순서(검수 → … → 진도)
    expect(without[0]!.name).toBe("테스트 B");
    // 관리자: 내 반(진도 단계) 먼저, 그다음은 관리자 아님과 같은 순서에서 내 반만 뺀 것
    expect(withOwners[0]!.name).toBe("목요 심화반");
    expect(withOwners.slice(1).map((r) => r.name)).toEqual(
      without.map((r) => r.name).filter((n) => n !== "목요 심화반"),
    );
  });
});

// ─────────────────────────────────────────────
// 반 고르는 상자 — 장바구니 · 출제
// ─────────────────────────────────────────────

function serveClasses(classes: readonly ClassEntity[]) {
  server.use(
    http.get("/api/classes", () =>
      HttpResponse.json({
        data: classes,
        meta: { page: 1, pageSize: 100, total: classes.length },
      }),
    ),
  );
}

describe.each(CASES)("장바구니 반 고르기 — $who", ({ classes, admin }) => {
  it(
    admin
      ? "«반 이름 · 담당 6자» · option title 은 전체 · 고르면 상자 title 도 전체"
      : "반 이름만 · title 없음",
    async () => {
      serveClasses(classes);
      const user = userEvent.setup();
      render(
        <BasketPanel
          items={[]}
          busy={false}
          onRemove={vi.fn()}
          onClear={vi.fn()}
          onMakeTest={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      const select = screen.getByLabelText("반") as HTMLSelectElement;
      await waitFor(() => expect(select.options).toHaveLength(9));
      const opts = Array.from(select.options).slice(1);
      const last = opts.at(-1)!;

      if (!admin) {
        expect(opts.map((o) => o.text)).toEqual(PLAIN.map((c) => c.name));
        expect(opts.every((o) => !o.hasAttribute("title"))).toBe(true);
        await user.selectOptions(select, last.value);
        expect(select).not.toHaveAttribute("title");
        return;
      }

      expect(opts.map((o) => o.text)).toEqual([
        "목요 심화반 · 내 반",
        "테스트반 · 강선생",
        "중등M 초6 MS2A · 강선생",
        "초등M 초5 MS1A · 강선생",
        "테스트 B · 원장",
        "걷기반 · 걷기원장",
        "빈손반 · 빈손선생님",
        "이어반 · 이어하기선생", // 7자 → 앞 6자, «…» 없음
      ]);
      expect(last).toHaveAttribute("title", `이어반 · ${LONGEST_OWNER}`);
      expect(opts[0]).toHaveAttribute("title", "목요 심화반 · 내 반");
      // 아직 안 골랐으면(«선택») 상자에 title 이 없다
      expect(select).not.toHaveAttribute("title");
      await user.selectOptions(select, last.value);
      expect(select).toHaveAttribute("title", `이어반 · ${LONGEST_OWNER}`);
    },
  );
});

describe.each([
  { who: "관리자", admin: true },
  { who: "관리자 아님", admin: false },
])("출제 반 고르기 — $who", ({ admin }) => {
  it(
    admin ? "«반 이름 · 담당» · title" : "반 이름만 · title 없음",
    async () => {
      const classes: ClassEntity[] = [
        admin
          ? { ...MOCK_CLASS_A, owner: { name: "관리자", mine: true } }
          : MOCK_CLASS_A,
        admin
          ? { ...MOCK_CLASS_B, owner: { name: LONGEST_OWNER, mine: false } }
          : MOCK_CLASS_B,
      ];
      serveClasses(classes);
      const user = userEvent.setup();
      const { default: NewTestPage } =
        await import("@/app/(main)/tests/new/page");
      render(await NewTestPage({ searchParams: Promise.resolve({}) }));
      await screen.findByRole("button", { name: "출제" });

      const select = screen.getByLabelText("반") as HTMLSelectElement;
      await waitFor(() => expect(select).toHaveValue(CLASS_A_ID));
      // 맨 위의 고를 수 없는 안내 항목(«반을 선택해 주세요» — 2026-10-04)은 반이 아니다. 반 항목만 본다.
      const [placeholder, ...classOptions] = Array.from(select.options);
      expect(placeholder).toHaveValue("");
      expect(placeholder).toBeDisabled();
      const texts = classOptions.map((o) => o.text);
      if (!admin) {
        expect(texts).toEqual([MOCK_CLASS_A.name, MOCK_CLASS_B.name]);
        expect(select).not.toHaveAttribute("title");
        expect(
          Array.from(select.options).every((o) => !o.hasAttribute("title")),
        ).toBe(true);
        return;
      }
      expect(texts).toEqual([
        `${MOCK_CLASS_A.name} · 내 반`,
        `${MOCK_CLASS_B.name} · 이어하기선생`,
      ]);
      expect(select).toHaveAttribute("title", `${MOCK_CLASS_A.name} · 내 반`);
      await user.selectOptions(select, CLASS_B_ID);
      expect(select).toHaveAttribute(
        "title",
        `${MOCK_CLASS_B.name} · ${LONGEST_OWNER}`,
      );
      expect(classOptions[1]).toHaveAttribute(
        "title",
        `${MOCK_CLASS_B.name} · ${LONGEST_OWNER}`,
      );
    },
  );
});

// ─────────────────────────────────────────────
// 오늘의 개념 판 (작업실 결)
// ─────────────────────────────────────────────

function stubConceptFetch(admin: boolean) {
  const board = conceptBoardResponseSchema.parse({
    data: hifiBoard(admin ? { owners: CONCEPT_BOARD_OWNERS } : {}),
  });
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/concept") return Response.json(board);
    if (url === "/api/concept/units")
      return Response.json({ data: hifiUnits() });
    const unitId = new URL(url, "http://localhost").searchParams.get("unitId");
    const data = unitId ? hifiUnitLectures(unitId) : null;
    return data
      ? Response.json({ data })
      : Response.json(
          { error: { code: "NOT_FOUND", message: "없음" } },
          { status: 404 },
        );
  });
  return board.data;
}

describe.each([
  { who: "관리자", admin: true },
  { who: "관리자 아님", admin: false },
])("오늘의 개념 판 — $who", ({ admin }) => {
  it(
    admin
      ? "반 · 담당 · 최근 진도 … — 작업실 결 딱지, 내 반 맨 위"
      : "담당 열 없음",
    async () => {
      const board = stubConceptFetch(admin);
      render(<ConceptView videoEmbed={false} />);
      const table = await screen.findByRole("table", {
        name: "반별 이번 주 차시",
      });
      const heads = within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent);
      expect(heads.slice(0, 3)).toEqual(
        admin ? ["반", "담당", "최근 진도"] : ["반", "최근 진도", "강의"],
      );
      if (!admin) {
        expect(tags(table)).toHaveLength(0);
        return;
      }
      expect(tags(table)).toHaveLength(board.rows.length);
      const firstRow = within(table).getAllByRole("row")[1]!;
      const cells = within(firstRow).getAllByRole("cell");
      expect(cells[0]).toHaveTextContent("초6 A반"); // 원장님 반 — 학년 순서로는 둘째
      expect(cells[1]).toHaveTextContent(/^내 반$/);
      expect(tags(cells[1]!)[0]!.className).toContain("bg-[#172b4d]");
      for (const tag of tags(table)) expect(tag.closest("button")).toBeNull();
    },
  );
});

// ─────────────────────────────────────────────
// 작업실 개요 «최근 등록한 반» (작업실 결)
// ─────────────────────────────────────────────

describe.each([
  { who: "관리자", admin: true },
  { who: "관리자 아님", admin: false },
])("작업실 개요 — $who", ({ admin }) => {
  it(admin ? "반 이름 바로 뒤에 딱지(작업실 결)" : "딱지 없음", async () => {
    const classes = [ADMIN[0]!, ADMIN[7]!, ADMIN[1]!].map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      studentCount: 3,
      currentUnit: null,
      ...(admin ? { owner: c.owner } : {}),
    }));
    vi.stubGlobal("fetch", async () =>
      Response.json({
        data: {
          user: { id: "u", name: "관리자" },
          classCount: 8,
          studentCount: 23,
          classes,
        },
      }),
    );
    render(<TeachingOverview onOpen={vi.fn()} />);
    const name = await screen.findByText("이어반");
    if (!admin) {
      expect(tags()).toHaveLength(0);
      return;
    }
    expect(tags()).toHaveLength(3);
    expect(name.nextElementSibling).toBe(tags()[1]);
    expect(tags()[1]).toHaveTextContent(LONGEST_OWNER);
    expect(tags()[0]).toHaveTextContent("내 반");
    expect(tags()[1]!.className).toContain("bg-[#eef1f5]");
  });
});

// ─────────────────────────────────────────────
// 시험지 검토 머리
// ─────────────────────────────────────────────

describe.each([
  { who: "관리자", admin: true },
  { who: "관리자 아님", admin: false },
])("시험지 검토 머리 — $who", ({ admin }) => {
  it(admin ? "«반 · 학생» 뒤에 딱지" : "딱지 없음", async () => {
    server.use(
      http.get("/api/tests/:id", () =>
        HttpResponse.json({
          data: {
            test: MOCK_TEST_DRAFT,
            className: "걷기반",
            studentName: "걷기학생",
            ...(admin ? { classOwner: { name: "걷기원장", mine: false } } : {}),
            problems: MOCK_TEST_DRAFT_PROBLEMS,
          },
        }),
      ),
    );
    render(<TestReview testId={TEST_DRAFT_ID} />);
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(
      admin ? "걷기반 · 걷기학생걷기원장" : /^걷기반 · 걷기학생$/,
    );
    expect(tags(heading)).toHaveLength(admin ? 1 : 0);
  });
});
