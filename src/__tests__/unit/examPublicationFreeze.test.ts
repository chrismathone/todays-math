import { describe, expect, it } from "vitest";
import {
  EXAM_PUBLICATION_FROZEN_VERSION,
  examPublicationContentHash,
  freezeDraftPayload,
} from "@/lib/examPublication/freeze";

/**
 * 월말평가 M1 — 낸 그대로 고정하기(계획서 §9.2). 은행 문항만 받는다 — 직접 가져온 문항(자른 그림 · 영어 · 계산 묶음)은
 * 문항 번호를 모두 알려 주고 거절한다. 같은 은행 문항이 두 번 든 시험지도 거절한다(채점이 문항 id 로 가른다).
 * 고친 글은 고친 그대로 고정한다 — 은행 원문으로 덮지 않는다.
 */

const bank = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`,
  content: `문항 ${n} 본문`,
  answer: "③",
  solution: "풀이",
  grade: "중2",
  chapter: "식의 계산",
  section: "단항식",
  difficulty: "중",
  problemCode: `J20101-${n}`,
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  questionType: "multiple-choice",
  ...extra,
});
const draft = (problems: unknown[], extra: Record<string, unknown> = {}) => ({
  id: "draft-1",
  title: "중2 10월 월말평가",
  problems,
  removed: [],
  columns: 2,
  answers: true,
  printOptions: { template: "jeongtong" },
  printMeta: { academy: "오늘수학" },
  updatedAt: "2026-10-28T12:00:00.000Z",
  ...extra,
});

describe("은행 문항만 고정한다", () => {
  it("문항의 글 · 정답 · 해설 · 그림 · 형식 · 차례와 지면 설정을 낸 그대로 묶는다", () => {
    const got = freezeDraftPayload(
      draft([bank(1), bank(2, { content: "고친 글" })]),
    );
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.frozen.version).toBe(EXAM_PUBLICATION_FROZEN_VERSION);
    expect(
      got.frozen.problems.map((p) => [p.no, p.problemId, p.content]),
    ).toEqual([
      [1, bank(1).id, "문항 1 본문"],
      [2, bank(2).id, "고친 글"],
    ]);
    expect(got.frozen.problems[0]).toMatchObject({
      answer: "③",
      solution: "풀이",
      questionType: "multiple-choice",
      problemCode: "J20101-1",
    });
    expect(got.frozen.layout).toEqual({
      columns: 2,
      answers: true,
      printOptions: { template: "jeongtong" },
      printMeta: { academy: "오늘수학" },
    });
  });

  it("직접 가져온 문항은 번호를 모두 모아 거절한다", () => {
    const got = freezeDraftPayload(
      draft([
        bank(1),
        bank(2, { studioCrop: { id: "crop" } }),
        { ...bank(3), id: "crop-3" },
        bank(4, { croppedImage: "data:image/png;base64,AAAA" }),
        bank(5, { english: { item: {} } }),
      ]),
    );
    expect(got).toEqual({ ok: false, notBank: [2, 3, 4, 5], duplicate: [] });
  });

  it("같은 은행 문항이 두 번 들면 두 번째 번호를 알려 준다", () => {
    expect(freezeDraftPayload(draft([bank(1), bank(2), bank(1)]))).toEqual({
      ok: false,
      notBank: [],
      duplicate: [3],
    });
  });

  it("문항이 없거나 꼴이 틀린 문서는 거절한다", () => {
    expect(freezeDraftPayload(draft([]))).toEqual({ ok: false, empty: true });
    expect(freezeDraftPayload({ problems: "x" })).toEqual({
      ok: false,
      empty: true,
    });
  });
});

describe("내용 지문", () => {
  it("같은 고정본이면 같고, 글자 하나가 달라도 다르다 · 키 차례와 상관없다", () => {
    const a = freezeDraftPayload(draft([bank(1)]));
    const b = freezeDraftPayload(draft([bank(1)]));
    const c = freezeDraftPayload(draft([bank(1, { answer: "④" })]));
    if (!a.ok || !b.ok || !c.ok) throw new Error("고정 실패");
    expect(examPublicationContentHash(a.frozen)).toBe(
      examPublicationContentHash(b.frozen),
    );
    expect(examPublicationContentHash(a.frozen)).not.toBe(
      examPublicationContentHash(c.frozen),
    );
    expect(examPublicationContentHash(a.frozen)).toMatch(/^[0-9a-f]{64}$/);
  });
});
