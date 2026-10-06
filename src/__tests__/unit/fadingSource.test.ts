// «오늘의 기억» — 화면이 자료를 얻는 길(`source.ts`)과 서버 없이 도는 구현(`local.ts`).
// 학생 API 와 같은 답을 내는지는 `src/__tests__/api/fadingRoutes.test.ts` 가 실제 은행으로 견준다. 여기는 그 밖의 것이다.
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type { FadingAction } from "@/contracts/fadingApi.contract";
import {
  applyFadingAction,
  fadingActionConceptId,
  fadingActionNeedsConcept,
} from "@/lib/fading/actions";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { createLocalFadingSource } from "@/lib/fading/local";
import { FadingSourceError, newFadingId } from "@/lib/fading/source";
import { emptyFading } from "@/lib/fading/state";

const SECTION_A = "중2::4. 삼각형의 성질::삼각형의 외심";
const SECTION_B = "초5::1-2 약수와 배수::1-2-3 공약수와 최대공약수";

function entries(prefix: string, section: string): ConceptEntry[] {
  return [
    "외심은 세 변의 {수직이등분선}이 만나는 점이고, 거리는 {$R$}이다.",
    "직각삼각형의 외심은 {빗변}의 {중점}이다.",
    "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이다.",
  ].map((definition, i) => ({
    id: `${prefix}${i + 1}`,
    section,
    term: `${prefix} 용어 ${i + 1}`,
    kind: "정의",
    level: "하",
    definition,
  }));
}
const ALL = [...entries("a", SECTION_A), ...entries("b", SECTION_B)];
const CONCEPTS = buildFadingConcepts(ALL, proposeFadingGroups(ALL));
const [A, B] = CONCEPTS as [FadingConcept, FadingConcept];
const TODAY = "2026-10-06";
/** 갈아 끼우기 전의 진짜 `crypto`. */
const REAL = globalThis.crypto;
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

/** 그 단계를 안 틀리고 채우는 «넣기»의 차례. */
function placements(c: FadingConcept, step: FadingStep, seed: number) {
  const tray = chipTray(c, step, { seed });
  const used = new Set<string>();
  return erasedTargets(c, step).map((target) => {
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    return { targetId: target.id, chipId: chip.id };
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("행동을 저장 칸에 적용한다", () => {
  it("개념을 가리키지 않는 행동은 «오늘 전부»뿐이고, 내용 없이 되는 것은 빼기뿐이다", () => {
    const actions: FadingAction[] = [
      { action: "pick", conceptId: A.id },
      { action: "drop", conceptId: A.id },
      { action: "open", conceptId: A.id },
      { action: "read", conceptId: A.id, sessionId: uuid(1) },
      {
        action: "miss",
        conceptId: A.id,
        sessionId: uuid(1),
        placement: { targetId: "t", chipId: "c1" },
      },
      {
        action: "step",
        conceptId: A.id,
        sessionId: uuid(1),
        step: 2,
        placements: [],
      },
      {
        action: "rate",
        conceptId: A.id,
        sessionId: uuid(1),
        rating: "good",
        requestId: uuid(2),
      },
      { action: "all-today", on: true },
    ];
    expect(actions.map(fadingActionConceptId)).toEqual([
      ...Array(7).fill(A.id),
      null,
    ]);
    expect(actions.map(fadingActionNeedsConcept)).toEqual([
      true,
      false,
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it("고르기 · 빼기 · «오늘 전부»가 그 칸을 옮긴다", () => {
    const fresh = { sessionId: uuid(1), seed: 1 };
    const picked = applyFadingAction(
      emptyFading(),
      { action: "pick", conceptId: A.id },
      A,
      TODAY,
      fresh,
    );
    expect(Object.keys(picked.concepts)).toEqual([A.id]);
    const dropped = applyFadingAction(
      picked,
      { action: "drop", conceptId: A.id },
      undefined,
      TODAY,
      fresh,
    );
    expect(dropped.concepts).toEqual({});
    const on = applyFadingAction(
      picked,
      { action: "all-today", on: true },
      undefined,
      TODAY,
      fresh,
    );
    expect(on.allOn).toBe(TODAY);
    expect(
      applyFadingAction(
        on,
        { action: "all-today", on: false },
        undefined,
        TODAY,
        fresh,
      ).allOn,
    ).toBeNull();
  });
});

describe("서버 없이 도는 길", () => {
  const local = (
    extra: Partial<Parameters<typeof createLocalFadingSource>[0]> = {},
  ) => createLocalFadingSource({ concepts: CONCEPTS, today: TODAY, ...extra });

  it("처음은 빈 칸(첫날)이고, 고르면 평가 전의 대기열에 든다", async () => {
    const source = local();
    const first = await source.state();
    expect(first.revision).toBe(0);
    expect(first.today).toBe(TODAY);
    expect(first.summary.queue).toEqual({ due: [], held: [], unrated: [] });
    const picked = await source.act({ action: "pick", conceptId: A.id });
    expect(picked.revision).toBe(1);
    expect(picked.summary.queue.unrated).toEqual([A.id]);
    // 바뀐 것이 없으면 revision 이 그대로다(서버가 쓰지 않는 것과 같다).
    expect(
      (await source.act({ action: "pick", conceptId: A.id })).revision,
    ).toBe(1);
  });

  it("번호와 씨앗을 안 주면 스스로 짓는다 — 풀이마다 번호가 다르다", async () => {
    const source = local();
    await source.act({ action: "pick", conceptId: A.id });
    await source.act({ action: "pick", conceptId: B.id });
    const a = await source.act({ action: "open", conceptId: A.id });
    const b = await source.act({ action: "open", conceptId: B.id });
    expect(z.uuid().safeParse(a.session!.id).success).toBe(true);
    expect(a.session!.seed).toBeGreaterThanOrEqual(0);
    expect(a.session!.seed).toBeLessThan(0x7fff_ffff);
    expect(b.session!.id).not.toBe(a.session!.id);
  });

  it("풀이 한 벌 — 열기 · 정독 · 단계 · 평가까지 돌고 다음 날 대기열에 선다", async () => {
    const source = local({ fresh: () => ({ sessionId: uuid(1), seed: 7 }) });
    await source.act({ action: "pick", conceptId: A.id });
    let view = await source.act({ action: "open", conceptId: A.id });
    const sessionId = view.session!.id;
    expect(view.opened!.concept).toEqual(A);
    view = await source.act({ action: "read", conceptId: A.id, sessionId });
    for (const step of [2, 3, 4] as const)
      view = await source.act({
        action: "step",
        conceptId: A.id,
        sessionId,
        step,
        placements: placements(A, step, 7),
      });
    expect(view.session!.phase).toBe("rating");
    const rated = await source.act({
      action: "rate",
      conceptId: A.id,
      sessionId,
      rating: "good",
      requestId: uuid(9),
    });
    expect(rated.session).toBeNull();
    expect(rated.receipt).toMatchObject({ requestId: uuid(9), rating: "good" });
    expect(rated.summary.todayCount).toEqual({
      reviews: 1,
      passed: 1,
      fresh: 1,
    });
    // 날짜를 옮기면 그날의 대기열이 된다.
    source.setToday(rated.receipt!.dueOn);
    expect(source.today()).toBe(rated.receipt!.dueOn);
    expect((await source.state()).summary.queue.due).toEqual([A.id]);
  });

  it("상한(cap)과 처음 상태를 받는다", async () => {
    const seeded = applyFadingAction(
      emptyFading(),
      { action: "pick", conceptId: B.id },
      B,
      TODAY,
      { sessionId: uuid(1), seed: 1 },
    );
    const source = local({ cap: 3, fading: seeded });
    const view = await source.state();
    expect(view.cap).toBe(3);
    expect(view.summary.queue.unrated).toEqual([B.id]);
  });

  it("내준 사본을 고쳐도 안의 칸은 그대로다", async () => {
    const source = local();
    await source.act({ action: "pick", conceptId: A.id });
    const copy = source.snapshot();
    delete copy.concepts[A.id];
    copy.allOn = TODAY;
    expect(source.snapshot().concepts[A.id]).toBeDefined();
    expect((await source.state()).summary.mode).toBe("split");
  });

  it("개념 목록은 받은 개념 안에서만 돈다 — 학년을 안 주면 준 기본 학년, 그것이 없으면 첫 학년", async () => {
    expect((await local().catalog()).grade).toBe("중2");
    expect((await local({ defaultGrade: "초5" }).catalog()).grade).toBe("초5");
    expect((await local({ defaultGrade: "중3" }).catalog()).grade).toBe("중2");
    const catalog = await local().catalog("초5");
    expect(catalog.grades).toEqual(["중2", "초5"]);
    expect(catalog.sections.map((s) => s.key)).toEqual([SECTION_B]);
    await expect(local().catalog("초3")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      message: "개념이 없는 학년입니다.",
    });
    await expect(local().catalog("고1")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      message: "요청 값이 올바르지 않습니다.",
    });
  });

  it("개념 하나 — 내용과 내 상태(고르지 않았으면 없다) · 없는 열쇠 404 · 꼴이 틀린 열쇠 400", async () => {
    const source = local();
    const before = await source.concept(A.id);
    expect(before.content).toEqual({ concept: A, traps: [], figure: null });
    expect(before.status).toBeNull();
    await source.act({ action: "pick", conceptId: A.id });
    expect((await source.concept(A.id)).status).toMatchObject({
      id: A.id,
      step: 1,
      rated: false,
    });
    await expect(source.concept("no-such-key")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
    await expect(source.concept("Bad Key!")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("실패는 한 꼴로 던진다 — 코드 · 상태 · 문구", async () => {
    const source = local();
    const error = await source
      .act({ action: "open", conceptId: "no-such-key" })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FadingSourceError);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "FadingSourceError",
      code: "NOT_FOUND",
      status: 404,
      message: "개념을(를) 찾을 수 없습니다.",
    });
    // 규칙 위반은 409 이고 아무것도 안 바뀐다 — 열린 풀이가 없는데 정독을 마쳤다고 한다.
    await expect(
      source.act({ action: "read", conceptId: A.id, sessionId: uuid(1) }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect((await source.state()).revision).toBe(0);
    await expect(source.act({ action: "nope" } as never)).rejects.toMatchObject(
      {
        code: "VALIDATION_ERROR",
        status: 400,
        message: "요청 값이 올바르지 않습니다.",
      },
    );
  });
});

describe("함정 칩이 있는 개념 — 서버 없이 도는 길", () => {
  const TRAPS = { [A.id]: [{ text: "내심" }] };
  /**
   * 4단계의 칩 묶음에서 함정이 **맨 끝**에 놓이는 씨앗. 칩의 번호는 묶음 안의 자리라, 함정을 안 넘긴 쪽의 묶음에는 그 번호의 칩이 없다 —
   * 서버가 화면과 다른 묶음으로 다시 돌리면 이 «넣기»가 «없는 칩»으로 거절된다.
   */
  const SEED = Array.from({ length: 500 }, (_, i) => i).find(
    (seed) =>
      chipTray(A, 4, { seed, traps: TRAPS[A.id] }).at(-1)!.text === "내심",
  )!;
  const withTraps = () =>
    createLocalFadingSource({
      concepts: CONCEPTS,
      today: TODAY,
      traps: TRAPS,
      fresh: () => ({ sessionId: uuid(1), seed: SEED }),
    });

  it("개념의 내용에 함정이 같이 내려간다 — 함정이 없는 개념은 비어 있다", async () => {
    const source = withTraps();
    expect((await source.concept(A.id)).content.traps).toEqual([
      { text: "내심" },
    ]);
    expect((await source.concept(B.id)).content.traps).toEqual([]);
    const opened = await source.act({ action: "open", conceptId: A.id });
    expect(opened.opened!.traps).toEqual([{ text: "내심" }]);
    const other = await source.act({ action: "open", conceptId: B.id });
    expect(other.opened!.traps).toEqual([]);
  });

  it("화면과 같은 칩 묶음으로 다시 돌린다 — 함정을 넣은 것은 틀림이고, 4단계면 그 자리에서 적힌다", async () => {
    const source = withTraps();
    let view = await source.act({ action: "open", conceptId: A.id });
    const sessionId = view.session!.id;
    const traps = view.opened!.traps;
    view = await source.act({ action: "read", conceptId: A.id, sessionId });
    for (const step of [2, 3] as const) {
      const tray = chipTray(A, step, { seed: SEED, traps });
      // 함정까지 든 묶음이다 — 답보다 칩이 하나 많다.
      expect(tray.map((c) => c.text)).toContain("내심");
      const used = new Set<string>();
      view = await source.act({
        action: "step",
        conceptId: A.id,
        sessionId,
        step,
        placements: erasedTargets(A, step).map((target) => {
          const chip = tray.find(
            (x) => !used.has(x.id) && chipFits(A, target.id, x),
          )!;
          used.add(chip.id);
          return { targetId: target.id, chipId: chip.id };
        }),
      });
    }
    expect(view.session!.step).toBe(4);
    const tray = chipTray(A, 4, { seed: SEED, traps });
    const trap = tray.find((c) => c.text === "내심")!;
    const target = erasedTargets(A, 4)[0]!;
    view = await source.act({
      action: "miss",
      conceptId: A.id,
      sessionId,
      placement: { targetId: target.id, chipId: trap.id },
    });
    expect(view.session!.missedAtFour).toEqual([target.id]);
  });

  it("함정을 안 준 길에서는 그 칩이 묶음에 없다 — 같은 «넣기»가 거절된다", async () => {
    const plain = createLocalFadingSource({
      concepts: CONCEPTS,
      today: TODAY,
      fresh: () => ({ sessionId: uuid(1), seed: SEED }),
    });
    let view = await plain.act({ action: "open", conceptId: A.id });
    const sessionId = view.session!.id;
    view = await plain.act({ action: "read", conceptId: A.id, sessionId });
    for (const step of [2, 3] as const)
      view = await plain.act({
        action: "step",
        conceptId: A.id,
        sessionId,
        step,
        placements: placements(A, step, SEED),
      });
    const withTrap = chipTray(A, 4, { seed: SEED, traps: TRAPS[A.id] });
    const extra = withTrap.find((c) => c.text === "내심")!;
    expect(chipTray(A, 4, { seed: SEED })).toHaveLength(withTrap.length - 1);
    await expect(
      plain.act({
        action: "miss",
        conceptId: A.id,
        sessionId,
        placement: {
          targetId: erasedTargets(A, 4)[0]!.id,
          chipId: `c${withTrap.length}`,
        },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect(extra).toBeDefined();
  });
});

describe("그림이 있는 개념 — 서버 없이 도는 길", () => {
  const FIGURE = {
    id: "f1",
    viewBox: "0 0 200 120",
    svg: '<circle cx="100" cy="60" r="40" fill="none" stroke="#1F1F23"/>',
    tags: [{ x: 10, y: 20, w: 40, answer: "외심" }],
  };

  it("준 그림이 개념의 내용에 같이 내려간다 — 안 준 개념은 없다고 싣는다", async () => {
    const source = createLocalFadingSource({
      concepts: CONCEPTS,
      today: TODAY,
      figures: { [A.id]: FIGURE },
    });
    expect((await source.concept(A.id)).content.figure).toEqual(FIGURE);
    expect((await source.concept(B.id)).content.figure).toBeNull();
    const opened = await source.act({ action: "open", conceptId: A.id });
    expect(opened.opened!.figure).toEqual(FIGURE);
    const other = await source.act({ action: "open", conceptId: B.id });
    expect(other.opened!.figure).toBeNull();
  });

  it("그림을 하나도 안 주면 어느 개념에도 없다", async () => {
    const source = createLocalFadingSource({
      concepts: CONCEPTS,
      today: TODAY,
    });
    expect((await source.concept(A.id)).content.figure).toBeNull();
    expect(
      (await source.act({ action: "open", conceptId: A.id })).opened!.figure,
    ).toBeNull();
  });
});

describe("번호 짓기", () => {
  it("UUID v4 꼴이고 부를 때마다 다르다", () => {
    const ids = Array.from({ length: 50 }, newFadingId);
    expect(new Set(ids).size).toBe(50);
    for (const id of ids) expect(z.uuid().safeParse(id).success).toBe(true);
  });

  it("`crypto.randomUUID` 가 없는 맥락(내부 주소의 http)에서도 같은 꼴을 짓는다", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => REAL.getRandomValues(bytes),
    });
    const ids = Array.from({ length: 50 }, newFadingId);
    expect(new Set(ids).size).toBe(50);
    for (const id of ids) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(z.uuid().safeParse(id).success).toBe(true);
    }
  });
});
