/**
 * 오늘의 영어 인쇄 페이지 `/english/sets/{id}/print` (D-148 · 25 §5 · 브리프 english-print §2).
 *
 * 서버 컴포넌트를 함수로 부른다(`testPrintPageScope.test.ts` 결). 보는 것 셋 — 세션 없음 → `/login` ·
 * 세트 없음·부모 시험 범위 밖 → 404 · `?view=` 분기와 학원 이름(지점 이름 → 없으면 «오늘의수학»).
 * 소유 판정은 진짜 `requireOwnedEnglishExam`(ownership.ts)이 돈다 — DB 만 함수로 흉내 낸다.
 *
 * ⚠️ 페이지는 `<EnglishPrintClient …/>` **요소**를 돌려줄 뿐 컴포넌트를 부르지 않는다 — 그래서 컴포넌트를
 *    흉내 내지 않고 돌려받은 요소의 `type` 과 `props` 를 본다.
 */
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  setFindUnique: vi.fn(),
  examFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  branchFindUnique: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.session }));
vi.mock("@/lib/db", () => ({
  db: {
    englishQuestionSet: { findUnique: mocks.setFindUnique },
    englishExam: { findUnique: mocks.examFindUnique },
    user: { findUnique: mocks.userFindUnique },
    branch: { findUnique: mocks.branchFindUnique },
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

import EnglishSetPrintPage, {
  ENGLISH_PRINT_DEFAULT_ACADEMY,
} from "@/app/(main)/english/sets/[id]/print/page";
import {
  EnglishPrintClient,
  type EnglishPrintClientProps,
} from "@/components/english/print/EnglishPrintClient";

import { SAMPLE_SET } from "../fixtures/englishPrintSet";

const SET_ID = "90000000-0000-4000-8000-0000000000e1";
const EXAM_ID = "90000000-0000-4000-8000-0000000000e2";
const OWNER_ID = "10000000-0000-4000-8000-0000000000a1";
const OTHER_ID = "10000000-0000-4000-8000-0000000000b1";
const BRANCH_A = "30000000-0000-4000-8000-00000000000a";
const BRANCH_B = "30000000-0000-4000-8000-00000000000b";

const OWNER = {
  menus: ["english"],
  id: OWNER_ID,
  email: "owner@example.com",
  name: "김원장",
  isAdmin: false,
};
it.each([false, true])(
  "denies a capped owner/superadmin print before reading a set: %s",
  async (isSuperAdmin) => {
    mocks.session.mockResolvedValue({
      ...OWNER,
      isAdmin: true,
      isSuperAdmin,
      menus: [],
    });
    await expect(
      EnglishSetPrintPage({
        params: Promise.resolve({ id: SET_ID }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");
    expect(mocks.setFindUnique).not.toHaveBeenCalled();
  },
);

it("denies direct print page access without library permission before reading a set", async () => {
  mocks.setFindUnique.mockClear();
  mocks.session.mockResolvedValue({ ...OWNER, menus: ["english-maker"] });
  await expect(
    EnglishSetPrintPage({
      params: Promise.resolve({ id: SET_ID }),
      searchParams: Promise.resolve({}),
    }),
  ).rejects.toThrow("NOT_FOUND");
  expect(mocks.setFindUnique).not.toHaveBeenCalled();
});

const now = new Date("2026-09-30T00:00:00.000Z");
const setRow = {
  id: SET_ID,
  examId: EXAM_ID,
  title: SAMPLE_SET.title,
  status: "검토 완료",
  source: "chatgpt",
  passage: SAMPLE_SET.passage,
  questions: SAMPLE_SET.questions,
  revision: 3,
  createdAt: now,
  updatedAt: now,
};
const examRow = {
  id: EXAM_ID,
  userId: OWNER_ID,
  school: "한빛중",
  grade: "중2",
  title: "2학기 중간고사",
  examDate: null,
  types: [],
  createdAt: now,
  updatedAt: now,
};

/** 시험 주인의 지점 — `ownerIsInScope` 는 `branchId` 만, 페이지는 `branch.name` 을 고른다 */
function ownerInBranch(branch: { id: string; name: string } | null) {
  mocks.branchFindUnique.mockResolvedValue(
    branch ? { name: branch.name } : null,
  );
  mocks.examFindUnique.mockResolvedValue({
    ...examRow,
    branchId: branch?.id ?? null,
  });
  mocks.session.mockResolvedValue({ ...OWNER, branchId: branch?.id ?? null });
  mocks.userFindUnique.mockImplementation(
    async ({ select }: { select?: Record<string, unknown> }) =>
      select?.branchId
        ? { branchId: branch?.id ?? null }
        : { branch: branch ? { name: branch.name } : null },
  );
}

const page = (
  id = SET_ID,
  view?: string | string[],
  more: { bundle?: string | string[]; merge?: string | string[] } = {},
) =>
  EnglishSetPrintPage({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve({
      ...(view === undefined ? {} : { view }),
      ...more,
    }),
  });

/** 성공 경로 — 돌려받은 것은 `EnglishPrintClient` 요소여야 한다 */
async function rendered(
  id?: string,
  view?: string | string[],
  more?: { bundle?: string | string[]; merge?: string | string[] },
) {
  const element = (await page(
    id,
    view,
    more,
  )) as ReactElement<EnglishPrintClientProps>;
  expect(element.type).toBe(EnglishPrintClient);
  return element.props;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(OWNER);
  mocks.setFindUnique.mockResolvedValue(setRow);
  mocks.examFindUnique.mockResolvedValue(examRow);
  ownerInBranch(null);
});

describe("오늘 영어 인쇄 페이지 — 관문", () => {
  it("세션이 없으면 /login 으로 — DB 는 건드리지 않는다", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(page()).rejects.toThrow("REDIRECT /login");
    expect(mocks.setFindUnique).not.toHaveBeenCalled();
  });

  it("uuid 가 아닌 id 는 404", async () => {
    await expect(page("not-a-uuid")).rejects.toThrow("NOT_FOUND");
    expect(mocks.setFindUnique).not.toHaveBeenCalled();
  });

  it("세트가 없으면 404", async () => {
    mocks.setFindUnique.mockResolvedValue(null);
    await expect(page()).rejects.toThrow("NOT_FOUND");
    expect(mocks.setFindUnique).toHaveBeenCalledWith({
      where: { id: SET_ID },
    });
    expect(mocks.examFindUnique).not.toHaveBeenCalled();
  });

  it("부모 시험이 없으면 404", async () => {
    mocks.examFindUnique.mockResolvedValue(null);
    await expect(page()).rejects.toThrow("NOT_FOUND");
  });

  it("🔴 남의 시험은 404 — 강사(관리자 아님)는 자기 것만 · 다른 지점 관리자도 못 본다 (D-130)", async () => {
    mocks.session.mockResolvedValue({
      ...OWNER,
      id: OTHER_ID,
      email: "other@example.com",
    });
    await expect(page()).rejects.toThrow("NOT_FOUND");

    ownerInBranch({ id: BRANCH_A, name: "한빛수학" });
    mocks.session.mockResolvedValue({
      ...OWNER,
      id: OTHER_ID,
      isAdmin: true,
      branchId: BRANCH_B,
      branchRole: "owner",
    });
    await expect(page()).rejects.toThrow("NOT_FOUND");
  });

  it("같은 지점 관리자는 강사의 세트를 인쇄한다 — 학원 이름은 시험 주인의 지점 이름", async () => {
    ownerInBranch({ id: BRANCH_A, name: "한빛수학" });
    mocks.session.mockResolvedValue({
      ...OWNER,
      id: OTHER_ID,
      isAdmin: true,
      branchId: BRANCH_A,
      branchRole: "owner",
    });
    const props = await rendered();
    expect(props.academyName).toBe("한빛수학");
    expect(mocks.branchFindUnique).toHaveBeenCalledWith({
      where: { id: BRANCH_A },
      select: { name: true },
    });
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(props.set.id).toBe(SET_ID);
  });
});

describe("오늘 영어 인쇄 페이지 — 지면에 넘기는 것", () => {
  it("세트는 계약 모양으로, 시험은 학교·학년·이름만, 기본은 학생용, 지점이 없으면 «오늘 수학»", async () => {
    const props = await rendered();
    expect(props.initialView).toBe("student");
    expect(props.academyName).toBe(ENGLISH_PRINT_DEFAULT_ACADEMY);
    expect(ENGLISH_PRINT_DEFAULT_ACADEMY).toBe("오늘 수학");
    expect(props.exam).toStrictEqual({
      school: "한빛중",
      grade: "중2",
      title: "2학기 중간고사",
    });
    expect(props.set).toMatchObject({
      id: SET_ID,
      examId: EXAM_ID,
      title: SAMPLE_SET.title,
      status: "검토 완료",
      source: "chatgpt",
      questionCount: 4,
      types: ["주제", "어법", "서술형", "원문 복원"],
      revision: 3,
      passage: SAMPLE_SET.passage,
      createdAt: "2026-09-30T00:00:00.000Z",
    });
    expect(props.set.questions).toHaveLength(4);
    // 시험 주인의 지점을 이름까지 물었다
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.branchFindUnique).not.toHaveBeenCalled();
  });

  it("?bundle= · ?merge= 로 학생용 묶음과 합침을 넘긴다 — 기본은 묶음 1 · 가른 채 (D-151)", async () => {
    const plain = await rendered();
    expect(plain.initialBundle).toBe(1);
    expect(plain.initialMerged).toBe(false);
    const second = await rendered(SET_ID, "student", {
      bundle: "2",
      merge: "1",
    });
    expect(second.initialBundle).toBe(2);
    expect(second.initialMerged).toBe(true);
    // 모르는 값은 기본으로
    const odd = await rendered(SET_ID, undefined, {
      bundle: "x",
      merge: "yes",
    });
    expect(odd.initialBundle).toBe(1);
    expect(odd.initialMerged).toBe(false);
  });

  it("?view=teacher 면 교사용으로 시작 · 모르는 값·배열은 학생용", async () => {
    expect((await rendered(SET_ID, "teacher")).initialView).toBe("teacher");
    expect((await rendered(SET_ID, "anything")).initialView).toBe("student");
    expect((await rendered(SET_ID, ["teacher"])).initialView).toBe("student");
  });
});
