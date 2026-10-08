/**
 * 문제은행 «출처 고르기» H1 — 한 칸 요약 · 세 단 창 (D-161 · 05 S-08 [확정 — 2026-10-08]).
 *
 * 세부 넷(원장님 2026-10-08 — 넷 다 권장안):
 *   ⑴ 출처는 창 맨 위 출처 줄에서 고른다 — 필터 줄의 «출처» 선택 칸은 없어진다.
 *   ⑵ 고른 책에 0문항인 자료 종류는 흐리게 · 체크 막음(자리는 그대로). 이미 고른 것이 0 이 되면 체크는 남고 흐리다.
 *   ⑶ 창은 필터 줄의 학년을 따라 열린다. 다른 과목의 책도 고르면 적용할 때 학년 칸이 «전체 학년»으로.
 *   ⑷ [적용]을 눌러야 걸린다. 창 안에서는 «걸리는 문항 n개»만 바뀐다. Esc 로 닫으면 고른 것을 버린다.
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import BankView from "@/components/unified/BankView";
import type {
  BankData,
  BankProblem,
  StudioProblem,
} from "@/components/unified/types";
import {
  unifiedBankQuerySchema,
  type BankSourceCounts,
} from "@/contracts/bankSource.contract";

vi.mock("@/components/unified/UnifiedProblem", () => ({
  default: ({ problem }: { problem: StudioProblem }) => (
    <p>{problem.content}</p>
  ),
}));

const KIM = "00000000-0000-4000-8000-00000000b001";
const JANG = "00000000-0000-4000-8000-00000000b002";
const RYU = "00000000-0000-4000-8000-00000000b003";

const COUNTS: BankSourceCounts = {
  sources: {
    total: 1200,
    engine: 900,
    school_textbook: 250,
    past_exam: 30,
    other: 20,
  },
  textbook: {
    total: 250,
    grades: ["중1", "중2"],
    kinds: ["기초 연산", "형성 평가", "대단원 평가", "서술형 평가"],
    books: [
      {
        id: KIM,
        grade: "중1",
        publisher: "천재교육",
        author: "김화경",
        title: "중학 수학1",
        count: 100,
        open: 90,
        materials: 14,
        kinds: { "기초 연산": 60, "형성 평가": 30, "대단원 평가": 10 },
      },
      {
        id: JANG,
        grade: "중1",
        publisher: "지학사",
        author: "장경윤",
        title: "중학 수학1",
        count: 50,
        open: 50,
        materials: 8,
        kinds: { "대단원 평가": 50 },
      },
      {
        id: RYU,
        grade: "중2",
        publisher: "YBM",
        author: "류희찬",
        title: "중학 수학2",
        count: 60,
        open: 58,
        materials: 9,
        kinds: { "서술형 평가": 60 },
      },
    ],
  },
};

const problem: BankProblem = {
  familyKey: null,
  originProblemId: null,
  questionTypeRaw: "단답형",
  source: "school_textbook",
  id: "row-1",
  content: "교과서 문항",
  answer: "1",
  solution: "풀이",
  grade: "중1",
  chapter: "1. 수와 연산",
  section: "소인수분해",
  difficulty: "기본",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  eligible: true,
  ineligibleReason: null,
  reviewStatus: "approved",
};
const initialData: BankData = {
  problems: [problem],
  total: 30,
  page: 1,
  pageSize: 12,
  grades: [
    { grade: "중1", count: 20 },
    { grade: "중2", count: 10 },
  ],
  chapters: ["1. 수와 연산"],
  units: [],
};

const requests: URLSearchParams[] = [];
let countRequests = 0;
let countsFail = false;

const dialogMethods = ["showModal", "close"] as const;
const originalDialogMethods = dialogMethods.map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
);
beforeAll(() => {
  // jsdom 에는 showModal 이 없다 — 여는 것과 닫는 것만 대역으로.
  for (const name of dialogMethods)
    Object.defineProperty(HTMLDialogElement.prototype, name, {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = name === "showModal";
      },
    });
});
afterAll(() => {
  dialogMethods.forEach((name, index) => {
    const original = originalDialogMethods[index];
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, name, original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  });
});

beforeEach(() => {
  requests.length = 0;
  countRequests = 0;
  countsFail = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/problems/sources")) {
        countRequests += 1;
        return countsFail
          ? Response.json(
              { error: "출처별 문항 수를 불러오지 못했습니다." },
              {
                status: 503,
              },
            )
          : Response.json(COUNTS);
      }
      const params = new URL(url, "http://localhost").searchParams;
      requests.push(params);
      return Response.json({
        ...initialData,
        page: Number(params.get("page")),
      });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mount() {
  render(
    <BankView
      initialData={initialData}
      selected={[]}
      onToggle={vi.fn()}
      onExport={vi.fn()}
    />,
  );
}
async function settled() {
  await waitFor(() =>
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
  );
}
const lastQuery = () => Object.fromEntries(requests.at(-1)!);
/** 필터 줄의 «출처» 칸 — 이름은 «출처 고르기: 지금 고른 것»(칩 «출처 …»과 갈린다). */
function sourceField() {
  if (!screen.queryByRole("button", { name: /^출처 고르기/ }))
    fireEvent.click(screen.getByRole("button", { name: "상세 필터" }));
  return screen.getByRole("button", { name: /^출처 고르기/ });
}
async function openPicker() {
  fireEvent.click(sourceField());
  const dialog = await screen.findByRole("dialog", { name: "출처 고르기" });
  await within(dialog).findByRole("group", { name: "출처" });
  return dialog;
}
const row = (dialog: HTMLElement) =>
  within(dialog).getByRole("group", { name: "출처" });
const pick = (dialog: HTMLElement, name: RegExp) =>
  fireEvent.click(within(row(dialog)).getByRole("button", { name }));
const kinds = (dialog: HTMLElement) =>
  within(dialog).getByRole("group", { name: "자료 종류" });
const subjects = (dialog: HTMLElement) =>
  within(dialog).getByRole("group", { name: "과목" });
const kind = (dialog: HTMLElement, name: string) =>
  within(kinds(dialog)).getByRole("checkbox", {
    name: new RegExp(`^${name}`),
  });
const footer = (dialog: HTMLElement) =>
  within(dialog)
    .getByText(/걸리는 문항/)
    .closest("div")!;
async function apply(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: "적용" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await settled();
}
const chip = (name: RegExp) => {
  const group = screen.getByRole("group", { name: "적용한 검색 조건" });
  return within(group).getByRole("button", { name });
};

describe("⑴ 출처는 창 맨 위 출처 줄에서 — 필터 줄의 «출처» 선택 칸 자리에 넓은 칸 하나", () => {
  it("선택 칸은 없고, 칸에는 «출처 | 전체 출처 | 고르기»가 적힌다 · 창 제목은 «출처 고르기» · 닫는 단추는 «적용»", async () => {
    mount();
    const field = sourceField();
    expect(
      screen.queryByRole("combobox", { name: "출처" }),
    ).not.toBeInTheDocument();
    expect(field).toHaveTextContent("출처전체 출처고르기");
    expect(field).toHaveAttribute("aria-haspopup", "dialog");
    const dialog = await openPicker();
    expect(
      within(dialog).getByRole("button", { name: "적용" }),
    ).toBeInTheDocument();
    expect(countRequests).toBe(1);
  });

  it("출처 줄은 전체 · 엔진 · 교과서 · 기출 · 그 밖 — 수가 붙고, 교과서를 고를 때만 세 단이 선다", async () => {
    mount();
    const dialog = await openPicker();
    expect(
      within(row(dialog))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["전체1,200", "엔진900", "교과서250", "기출30", "그 밖20"]);
    expect(
      within(row(dialog)).getByRole("button", { name: /^전체/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(dialog).queryByRole("group", { name: "과목" }),
    ).not.toBeInTheDocument();
    pick(dialog, /^교과서/);
    expect(subjects(dialog)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("group", { name: "중1 교과서" }),
    ).toBeInTheDocument();
    expect(kinds(dialog)).toBeInTheDocument();
    expect(footer(dialog)).toHaveTextContent("걸리는 문항 250개 / 교과서 250");
  });

  it("교과서가 아닌 갈래를 적용하면 그 갈래만 걸리고 칩은 «출처 엔진» · 칸은 «엔진»", async () => {
    mount();
    const dialog = await openPicker();
    pick(dialog, /^엔진/);
    expect(
      within(dialog).queryByRole("group", { name: "과목" }),
    ).not.toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      "엔진 문항은 책 · 자료 종류가 없습니다. [적용]을 누르면 출처만 걸립니다.",
    );
    await apply(dialog);
    expect(lastQuery()).toEqual({ sourceGroup: "engine", page: "1" });
    expect(chip(/^출처 엔진/)).toBeInTheDocument();
    expect(sourceField()).toHaveTextContent("출처엔진고르기");
  });
});

describe("⑵ 고른 책에 0문항인 자료 종류 — 흐리게 · 체크 막음(자리는 그대로)", () => {
  it("책을 바꾸면 종류의 수가 그 책에 맞춰 바뀌고, 0 인 것은 막힌다 · 이미 고른 것은 0 이 돼도 체크가 남는다", async () => {
    mount();
    const dialog = await openPicker();
    pick(dialog, /^교과서/);
    // 책을 안 고르면 모든 책 — 서술형 평가 60
    fireEvent.click(kind(dialog, "서술형 평가"));
    expect(kind(dialog, "서술형 평가")).toBeChecked();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /지학사 · 장경윤/ }),
    );
    const listed = within(kinds(dialog))
      .getAllByRole("checkbox")
      .map((box) => box.closest("label")!.textContent);
    // 자리는 그대로 — 넷 다 남는다(0 이어도 줄이 빠지지 않는다)
    expect(listed).toEqual([
      "기초 연산0",
      "형성 평가0",
      "대단원 평가50",
      "서술형 평가0",
    ]);
    expect(kind(dialog, "기초 연산")).toBeDisabled();
    expect(kind(dialog, "형성 평가")).toBeDisabled();
    expect(kind(dialog, "대단원 평가")).toBeEnabled();
    // 이미 고른 것은 0 이 돼도 체크가 남고(풀 수 있게) 흐리다
    expect(kind(dialog, "서술형 평가")).toBeChecked();
    expect(kind(dialog, "서술형 평가")).toBeEnabled();
    expect(kind(dialog, "서술형 평가").closest("label")).toHaveAttribute(
      "data-zero",
      "true",
    );
    expect(kind(dialog, "기초 연산").closest("label")).toHaveAttribute(
      "data-zero",
      "true",
    );
    expect(kind(dialog, "대단원 평가").closest("label")).not.toHaveAttribute(
      "data-zero",
    );
  });
});

describe("⑶ 창은 필터 줄의 학년을 따라 열린다", () => {
  it("학년이 중2 면 중2 의 책부터 · 고른 책이 있는 과목에는 파란 수 배지", async () => {
    mount();
    fireEvent.change(screen.getByRole("combobox", { name: "학년" }), {
      target: { value: "중2" },
    });
    await settled();
    const dialog = await openPicker();
    pick(dialog, /^교과서/);
    expect(
      within(subjects(dialog)).getByRole("button", { name: /^중2/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(dialog).getByRole("group", { name: "중2 교과서" }),
    ).toHaveTextContent("YBM · 류희찬");
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /YBM · 류희찬/ }),
    );
    expect(
      within(subjects(dialog)).getByRole("button", { name: /^중2/ }),
    ).toHaveTextContent("중21");
    expect(
      within(subjects(dialog)).getByRole("button", { name: /^중1/ }),
    ).toHaveTextContent("중12권");
  });

  it("다른 과목의 책도 고르면 적용할 때 학년 칸이 «전체 학년»으로 바뀐다 — 결과가 0 으로 비지 않게", async () => {
    mount();
    fireEvent.change(screen.getByRole("combobox", { name: "학년" }), {
      target: { value: "중2" },
    });
    await settled();
    const dialog = await openPicker();
    pick(dialog, /^교과서/);
    fireEvent.click(
      within(subjects(dialog)).getByRole("button", { name: /^중1/ }),
    );
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /천재교육 · 김화경/ }),
    );
    await apply(dialog);
    expect(lastQuery()).toEqual({
      sourceGroup: "school_textbook",
      books: KIM,
      page: "1",
    });
    expect(screen.getByRole("combobox", { name: "학년" })).toHaveValue("");
  });

  it("같은 과목의 책만 고르면 학년 칸은 그대로다", async () => {
    mount();
    fireEvent.change(screen.getByRole("combobox", { name: "학년" }), {
      target: { value: "중1" },
    });
    await settled();
    const dialog = await openPicker();
    pick(dialog, /^교과서/);
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /지학사 · 장경윤/ }),
    );
    await apply(dialog);
    expect(lastQuery()).toEqual({
      grade: "중1",
      sourceGroup: "school_textbook",
      books: JANG,
      page: "1",
    });
  });
});

describe("⑷ [적용]을 눌러야 걸린다 · Esc 는 버린다", () => {
  it("창 안에서 고르는 동안에는 목록 요청이 안 나가고 «걸리는 문항 n개»만 바뀐다", async () => {
    mount();
    const dialog = await openPicker();
    const before = requests.length;
    pick(dialog, /^교과서/);
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /천재교육 · 김화경/ }),
    );
    expect(footer(dialog)).toHaveTextContent("걸리는 문항 100개 / 교과서 250");
    fireEvent.click(kind(dialog, "대단원 평가"));
    expect(footer(dialog)).toHaveTextContent("걸리는 문항 10개 / 교과서 250");
    fireEvent.click(kind(dialog, "형성 평가"));
    expect(footer(dialog)).toHaveTextContent("걸리는 문항 40개 / 교과서 250");
    expect(requests.length).toBe(before);
  });

  it("[적용]을 누르면 책 · 자료 종류가 화면 차례로 실리고 칩은 «교과서 …» 하나 · «자료 …» 하나", async () => {
    mount();
    const dialog = await openPicker();
    pick(dialog, /^교과서/);
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /지학사 · 장경윤/ }),
    );
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /천재교육 · 김화경/ }),
    );
    fireEvent.click(kind(dialog, "대단원 평가"));
    fireEvent.click(kind(dialog, "형성 평가"));
    await apply(dialog);
    expect(lastQuery()).toEqual({
      sourceGroup: "school_textbook",
      books: `${KIM},${JANG}`,
      materialKinds: "형성 평가,대단원 평가",
      page: "1",
    });
    expect(unifiedBankQuerySchema.safeParse(lastQuery()).success).toBe(true);
    expect(chip(/^교과서 중1 천재교육\(김화경\) 외 1권/)).toBeInTheDocument();
    expect(chip(/^자료 형성 평가 외 1/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^출처 교과서 조건 해제/ }),
    ).not.toBeInTheDocument();
    expect(sourceField()).toHaveTextContent(
      "출처교과서 · 중1 천재교육(김화경) 외 1권 · 형성 평가 외 1고르기",
    );
  });

  it("Esc 로 닫으면 고른 것을 버린다 — 요청도 없고 다시 열면 적용한 그대로다", async () => {
    mount();
    let dialog = await openPicker();
    const before = requests.length;
    pick(dialog, /^교과서/);
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /천재교육 · 김화경/ }),
    );
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(requests.length).toBe(before);
    expect(sourceField()).toHaveTextContent("출처전체 출처고르기");
    dialog = await openPicker();
    expect(
      within(row(dialog)).getByRole("button", { name: /^전체/ }),
    ).toHaveAttribute("aria-pressed", "true");
    // 수는 한 번 받은 것을 쓴다 — 창을 다시 열어도 다시 세지 않는다
    expect(countRequests).toBe(1);
  });

  it("«모두 풀기»는 창 안의 책 · 자료 종류를 비운다 — 적용 전까지는 목록이 그대로다", async () => {
    mount();
    const dialog = await openPicker();
    pick(dialog, /^교과서/);
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /천재교육 · 김화경/ }),
    );
    fireEvent.click(kind(dialog, "대단원 평가"));
    fireEvent.click(within(dialog).getByRole("button", { name: "모두 풀기" }));
    expect(footer(dialog)).toHaveTextContent("걸리는 문항 250개 / 교과서 250");
    expect(
      within(dialog).getByRole("checkbox", { name: /천재교육 · 김화경/ }),
    ).not.toBeChecked();
    expect(kind(dialog, "대단원 평가")).not.toBeChecked();
  });

  it("«중1 교과서 전부» 줄은 그 과목의 책을 한 번에 고르고 푼다", async () => {
    mount();
    const dialog = await openPicker();
    pick(dialog, /^교과서/);
    const all = within(dialog).getByRole("checkbox", {
      name: /^중1 교과서 전부/,
    });
    expect(all.closest("label")).toHaveTextContent("150");
    fireEvent.click(all);
    expect(footer(dialog)).toHaveTextContent("걸리는 문항 150개");
    fireEvent.click(all);
    expect(footer(dialog)).toHaveTextContent("걸리는 문항 250개");
  });
});

describe("적용한 검색 조건 칩 — 각각 × 로 그 차원만 푼다", () => {
  async function applied() {
    mount();
    const dialog = await openPicker();
    pick(dialog, /^교과서/);
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /천재교육 · 김화경/ }),
    );
    fireEvent.click(kind(dialog, "대단원 평가"));
    await apply(dialog);
  }

  it("«교과서 …» × 는 책만 푼다 — 출처는 교과서로 남아 «출처 교과서» 칩이 된다", async () => {
    await applied();
    fireEvent.click(chip(/^교과서 중1 천재교육\(김화경\)/));
    await settled();
    expect(lastQuery()).toEqual({
      sourceGroup: "school_textbook",
      materialKinds: "대단원 평가",
      page: "1",
    });
    expect(chip(/^출처 교과서/)).toBeInTheDocument();
  });

  it("«자료 …» × 는 자료 종류만 · «출처 …» × 는 출처 차원 전부(책 · 종류까지)를 푼다", async () => {
    await applied();
    fireEvent.click(chip(/^자료 대단원 평가/));
    await settled();
    expect(lastQuery()).toEqual({
      sourceGroup: "school_textbook",
      books: KIM,
      page: "1",
    });
    fireEvent.click(chip(/^교과서/));
    await settled();
    fireEvent.click(chip(/^출처 교과서/));
    await settled();
    expect(lastQuery()).toEqual({ page: "1" });
    expect(sourceField()).toHaveTextContent("출처전체 출처고르기");
  });

  it("초기화는 출처 · 책 · 자료 종류 · 학기까지 비운다", async () => {
    await applied();
    fireEvent.change(screen.getByRole("combobox", { name: "학기" }), {
      target: { value: "1" },
    });
    await settled();
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    await settled();
    expect(lastQuery()).toEqual({ page: "1" });
    expect(screen.getByRole("combobox", { name: "학기" })).toHaveValue("");
  });
});

describe("학기 — 첫 줄 «학년» 다음 칸(차시의 unit.semester · 모든 출처에 듣는다)", () => {
  it("«전체 학기 / 1학기 / 2학기» · 고르면 semester 가 실리고 칩 «학기 1학기» · × 로 푼다", async () => {
    mount();
    const select = screen.getByRole("combobox", { name: "학기" });
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["전체 학기", "1학기", "2학기"]);
    // 첫 줄의 차례 — 학년 다음이 학기
    const firstRow = screen.getByRole("group", { name: "검색과 필터" });
    expect(
      within(firstRow)
        .getAllByRole("combobox")
        .map((box) => box.getAttribute("id")?.split("-").at(-1)),
    ).toEqual(["grade", "semester", "chapter"]);
    fireEvent.change(select, { target: { value: "1" } });
    await settled();
    expect(lastQuery()).toEqual({ semester: "1", page: "1" });
    fireEvent.click(chip(/^학기 1학기/));
    await settled();
    expect(lastQuery()).toEqual({ page: "1" });
  });
});

describe("수를 못 받으면 말로 알리고 다시 시도한다", () => {
  it("창 안에 오류와 «다시 시도» — 다시 받으면 출처 줄이 선다", async () => {
    countsFail = true;
    mount();
    fireEvent.click(sourceField());
    const dialog = await screen.findByRole("dialog", { name: "출처 고르기" });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "출처별 문항 수를 불러오지 못했습니다.",
    );
    countsFail = false;
    fireEvent.click(within(dialog).getByRole("button", { name: "다시 시도" }));
    expect(
      await within(dialog).findByRole("group", { name: "출처" }),
    ).toBeInTheDocument();
    expect(countRequests).toBe(2);
  });
});
