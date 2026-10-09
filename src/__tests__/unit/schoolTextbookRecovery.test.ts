import { describe, expect, it } from "vitest";
import type { Problem } from "@prisma/client";
import {
  matchesRecoveredRow,
  prepareRecovery,
  recoveryDraftIssues,
  recoveryFingerprint,
  type RecoveryCandidate,
  type RecoverySnapshot,
} from "@/lib/import/schoolTextbook/recovery";

const before = {
  id: "11111111-1111-4111-8111-111111111111",
  problemCode: "J10101-A01-001",
  source: "school_textbook",
  pool: "shared",
  unitId: "22222222-2222-4222-8222-222222222222",
  externalId: "tb-original",
  content: "오탈자 $x+1=3$일 때 $x$를 구하시오.",
  answer: "$2$",
  solution: "$x=3-1=2$이다.",
  solutionSource: "original",
  questionType: "단답형",
  problemType: "계산",
  difficulty: "기본",
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  choiceFigureIndex: [],
  figureSvg: null,
  figureSource: null,
  originProblemId: null,
  familyKey: "sample-family",
  sourceMaterialId: null,
  userId: null,
  sourceFile: null,
  school: null,
  subject: null,
  examId: null,
  questionNumber: null,
  score: null,
  directUseAllowed: false,
  reviewStatus: "approved",
  createdAt: "2026-10-09T00:00:00.000Z",
  updatedAt: "2026-10-09T00:00:00.000Z",
} as RecoverySnapshot;
const candidate: RecoveryCandidate = {
  problemCode: before.problemCode,
  kind: "correction",
  content: "$x+1=3$일 때 $x$를 구하시오.",
  answer: "$2$",
  solution: "$x=3-1=2$이다.",
  figureUrls: [],
  notes: "머리글 제거",
  validation: { math: "일차방정식 대입 확인", visual: "텍스트 문항" },
  remainingIssues: [],
};

describe("교과서 복구 적용 경계", () => {
  it("교정은 출제 잠금을 유지하고 기존 해설의 출처를 보존한다", () => {
    const patch = prepareRecovery(before, candidate, new Map());
    expect(patch.after).toMatchObject({
      directUseAllowed: false,
      reviewStatus: "approved",
      solutionSource: "original",
    });
    expect(patch.originId).toBe(before.id);
  });
  it("변형은 pending이며 원본 번호가 담긴 멱등 키가 내용에 묶인다", () => {
    const a = prepareRecovery(
      before,
      { ...candidate, kind: "rewrite", solution: "$x=2$이다." },
      new Map(),
    );
    const b = prepareRecovery(
      before,
      { ...candidate, kind: "rewrite", solution: "$x=2$이다." },
      new Map(),
    );
    const c = prepareRecovery(
      before,
      { ...candidate, kind: "rewrite", content: "$x+2=4$일 때 $x$는?" },
      new Map(),
    );
    expect(a.after).toMatchObject({
      directUseAllowed: false,
      reviewStatus: "pending",
      solutionSource: "ai",
    });
    expect(a.externalId).toBe(b.externalId);
    expect(a.externalId).not.toBe(c.externalId);
  });
  it("본문 외의 단원·잠금·그림 변경도 원본 지문을 바꾼다", () => {
    const key = recoveryFingerprint(before);
    for (const delta of [
      { unitId: "other" },
      { directUseAllowed: true },
      { figureDims: [5, 5] },
      { updatedAt: "2026-10-09T01:00:00.000Z" },
    ]) {
      expect(recoveryFingerprint({ ...before, ...delta })).not.toBe(key);
    }
    expect(
      recoveryFingerprint({
        ...before,
        updatedAt: new Date(before.updatedAt),
      } as unknown as Problem),
    ).toBe(key);
  });
  it("이미 해제했거나 교과서가 아닌 행을 덮어쓰지 않는다", () => {
    expect(() =>
      prepareRecovery(
        { ...before, directUseAllowed: true },
        candidate,
        new Map(),
      ),
    ).toThrow();
    expect(() =>
      prepareRecovery({ ...before, source: "manual" }, candidate, new Map()),
    ).toThrow();
  });
  it("미해결·정답 없음·해설 없음 문항은 적용하지 않는다", () => {
    expect(() =>
      prepareRecovery(before, { ...candidate, kind: "blocked" }, new Map()),
    ).toThrow();
    expect(() =>
      prepareRecovery(before, { ...candidate, answer: "" }, new Map()),
    ).toThrow();
    expect(() =>
      prepareRecovery(before, { ...candidate, solution: null }, new Map()),
    ).toThrow();
    expect(() =>
      prepareRecovery(
        before,
        { ...candidate, remainingIssues: ["조건 부족"] },
        new Map(),
      ),
    ).toThrow();
  });
  it("수식의 닫힘·빈 분자·수식 밖 명령을 확인한다", () => {
    for (const content of [
      "$x+1",
      "$\\frac{}{2}$",
      "두 직선이 \\parallel 이다",
      "$\\badcommand{x}$",
      "$x$$y$",
    ]) {
      expect(
        recoveryDraftIssues({ ...candidate, content }).length,
      ).toBeGreaterThan(0);
    }
    expect(recoveryDraftIssues(candidate)).toEqual([]);
  });
  it.each(["content", "answer", "solution"] as const)(
    "%s에서 JSON 역슬래시가 탭으로 변한 곱셈식을 거부한다",
    (field) => {
      const broken = JSON.parse(String.raw`"$8\times2=16$"`);
      const draft = { ...candidate, [field]: broken };
      expect(recoveryDraftIssues(draft)).toContain(`${field}: 제어문자`);
      expect(() => prepareRecovery(before, draft, new Map())).toThrow(
        "제어문자",
      );
      expect(
        recoveryDraftIssues({
          ...candidate,
          [field]: String.raw`$8\times2=16$`,
        }),
      ).toEqual([]);
    },
  );
  it("그림을 재배치할 때 실제 치수·원본 폭·보기 연결을 함께 재배치한다", () => {
    const original = {
      ...before,
      figureUrls: ["/figures/a.png", "/figures/b.png"],
      figureSourceMm: [30, 50],
      figureSource: "source",
    };
    const draft = {
      ...candidate,
      content: "다음 그림에서 고르시오.\n① [그림]\n② [그림]",
      answer: "②",
      figureUrls: ["/figures/b.png", "/figures/a.png"],
    };
    const assets = new Map([
      ["/figures/a.png", { width: 100, height: 80, sha256: "a" }],
      ["/figures/b.png", { width: 200, height: 60, sha256: "b" }],
    ]);
    expect(prepareRecovery(original, draft, assets).after).toMatchObject({
      figureDims: [200, 60, 100, 80],
      figureSourceMm: [50, 30],
      choiceFigureIndex: [1, 2],
    });
  });
  it("그림 하나라도 누락되거나 표지 수가 다르면 적용하지 않는다", () => {
    const draft = {
      ...candidate,
      content: "그림을 보시오. [그림]",
      figureUrls: ["/figures/a.png"],
    };
    expect(() => prepareRecovery(before, draft, new Map())).toThrow();
    expect(
      recoveryDraftIssues({ ...draft, content: "그림을 보시오." }),
    ).toContain("그림 표지와 파일 수 불일치");
    expect(
      recoveryDraftIssues({
        ...draft,
        content: "그림에서 답을 고르시오.\n① $1$\n② $2$\n[그림]",
      }),
    ).toContain("발문 그림 표지가 보기 안으로 흘러 들어갔다");
  });
  it("변경 없음 표시에 숨은 본문 변경과 기존 인라인 그림 소실을 거부한다", () => {
    expect(() =>
      prepareRecovery(before, { ...candidate, kind: "unchanged" }, new Map()),
    ).toThrow();
    expect(() =>
      prepareRecovery({ ...before, figureSvg: "<svg/>" }, candidate, new Map()),
    ).toThrow();
  });
  it("새 도형은 그림 URL 없이 인라인으로 저장하고 활성 SVG를 거부한다", () => {
    const figureSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><path d="M10 90 L100 10 L190 90 Z"/></svg>';
    const draft = {
      ...candidate,
      kind: "rewrite" as const,
      content: "다음 그림을 보시오. [그림]",
      figureSvg,
    };
    const patch = prepareRecovery(before, draft, new Map());
    expect(patch.after).toMatchObject({
      figureSvg,
      figureUrls: [],
      figureDims: [],
      choiceFigureIndex: [],
      figureSource: "engine",
    });
    for (const unsafe of [
      figureSvg.replace("<path", "<script>alert(1)</script><path"),
      figureSvg.replace("<path", '<path onclick="alert(1)"'),
      figureSvg.replace(
        "<path",
        '<image href="https://example.com/a.svg"/><path',
      ),
    ])
      expect(() =>
        prepareRecovery(before, { ...draft, figureSvg: unsafe }, new Map()),
      ).toThrow();
    expect(() =>
      prepareRecovery(before, { ...draft, content: "① [그림]" }, new Map()),
    ).toThrow();
  });
  it("재시도는 정확한 결과만 같은 수정으로 인식한다", () => {
    const patch = prepareRecovery(before, candidate, new Map());
    const written = { ...before, ...patch.after } as unknown as Problem;
    expect(matchesRecoveredRow(written, patch)).toBe(true);
    expect(
      matchesRecoveredRow(
        { ...written, content: "사람이 다시 고친 문항" },
        patch,
      ),
    ).toBe(false);
    expect(
      matchesRecoveredRow({ ...written, directUseAllowed: true }, patch),
    ).toBe(false);
    for (const delta of [
      { unitId: "other" },
      { familyKey: "other" },
      { source: "transformed" as const },
      { externalId: "other" },
    ])
      expect(matchesRecoveredRow({ ...written, ...delta }, patch)).toBe(false);
  });
  it("재시도 시 변형본의 원본 연결과 단원도 확인한다", () => {
    const patch = prepareRecovery(
      before,
      { ...candidate, kind: "rewrite" },
      new Map(),
    );
    const variant = {
      ...before,
      ...patch.identity,
      ...patch.after,
      id: "new-id",
      externalId: patch.externalId,
    } as unknown as Problem;
    expect(matchesRecoveredRow(variant, patch)).toBe(true);
    expect(
      matchesRecoveredRow({ ...variant, originProblemId: "other" }, patch),
    ).toBe(false);
    expect(matchesRecoveredRow({ ...variant, unitId: "other" }, patch)).toBe(
      false,
    );
  });
});
