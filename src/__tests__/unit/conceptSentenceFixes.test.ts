/**
 * 카드 보정 표(`conceptSentenceFixes.ts`) — 원본(`definition-content.ts` · PROVENANCE)은 그대로 두고, 카드를 내보내는 층
 * (`definition-cards.ts` 의 `definitionCards`)에서 23장을 덮어쓴다(D-143 ④ · ⑦). 화면 · 채점 · 복습 · 선수가 같은 카드를 읽는다.
 *
 * 결론은 용어 분석 트랙(terms-coverage)의 3자 합의 `docs/reference/concept-terms/card-sentence-fixes.json` —
 * 틀림 3 · 빠짐 5 · 낱말 5 · 범위 10. 뜻을 고친 «틀림» 3장은 이미 모은 학생에게 한 번 다시 복습(`cardRevisions.test.ts`).
 * 보정은 빈칸(정답 조각)까지 옮기기도 한다 — 그래서 카드마다 조립 · 예 모으기 · 경계 살피기가 새 카드로 여전히 풀리는지 단정한다.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cardFixes } from "@/lib/math-explorers/conceptSentenceFixes";
import { courseCards } from "@/lib/math-explorers/definition-content";
import {
  definitionCard,
  definitionCards,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import {
  workshopOptions,
  workshopQuestionId,
} from "@/lib/math-explorers/workshop";

const ROOT = resolve(__dirname, "../../..");
type Change = Record<string, unknown>;
const decided = JSON.parse(
  readFileSync(
    resolve(ROOT, "docs/reference/concept-terms/card-sentence-fixes.json"),
    "utf8",
  ),
) as { fixes: { id: string; severity: string; change: Change }[] };

describe("카드 보정 표 — 확정 파일 그대로", () => {
  it("원본 파일은 옮겨 온 판 그대로다(고치지 않는다 — 고칠 것은 이 표로)", () => {
    // PROVENANCE.md 의 SHA(b58df583…)는 패키지 원본 값이고, 저장소 판은 옮길 때 포맷만 지났다(d6ed9a39a).
    // 그 옮겨 온 판을 잠근다 — 원본을 일부러 바꿀 때만(원장님 결정) 이 값을 함께 바꾼다.
    const source = readFileSync(
      resolve(ROOT, "src/lib/math-explorers/definition-content.ts"),
      "utf8",
    );
    const lf = source.replace(/\r\n/g, "\n");
    expect(createHash("sha256").update(lf, "utf8").digest("hex")).toBe(
      "48960ceb98f5d50124be295593cf2c2b8244e4be6d850586a09bd9b18f936bb6",
    );
  });

  it("23장 · 칸마다 card-sentence-fixes.json 의 change 와 같다", () => {
    expect(decided.fixes).toHaveLength(23);
    expect(Object.keys(cardFixes).sort()).toEqual(
      decided.fixes.map((fix) => fix.id).sort(),
    );
    for (const fix of decided.fixes)
      expect({ id: fix.id, ...cardFixes[fix.id] }).toEqual({
        id: fix.id,
        ...fix.change,
      });
  });
});

describe("내보내는 카드가 보정을 입었다 — 화면 · 채점 · 복습 · 선수가 같은 카드", () => {
  it("보정 칸은 definitionCard 에 그대로, 나머지 칸 · 다른 카드는 원문 그대로", () => {
    const raw = new Map(courseCards.map((card) => [card.id, card]));
    for (const card of definitionCards) {
      const fix = cardFixes[card.id] as Change | undefined;
      const source = raw.get(card.id);
      if (!source) continue; // 옛 카드 15장(보정 없음)
      for (const key of Object.keys(source) as (keyof typeof source)[]) {
        const expected = fix && key in fix ? fix[key as string] : source[key];
        expect({ id: card.id, key, value: card[key] }).toEqual({
          id: card.id,
          key,
          value: expected,
        });
      }
    }
  });

  it("보정한 카드마다 문장 = 조각 셋 + 빈칸 둘 · 말 넷이 서로 다름 · 예가 맞음 · 틀림 둘 다 · 참/거짓 값", () => {
    for (const id of Object.keys(cardFixes)) {
      const card = definitionCard(id);
      expect(card.pieces).toHaveLength(3);
      expect(card.definition).toBe(
        card.pieces[0] +
          card.words[0] +
          card.pieces[1] +
          card.words[1] +
          card.pieces[2],
      );
      expect(new Set(card.words).size).toBe(4);
      expect(card.examples.some((e) => e.yes)).toBe(true);
      expect(card.examples.some((e) => !e.yes)).toBe(true);
      expect(typeof card.truth).toBe("boolean");
      expect(card.trap.length).toBeGreaterThan(0);
    }
  });

  it("이름을 고친 카드(여사건의 확률 → 일어나지 않을 확률)는 도감 · 진도판 이름도 새 이름", () => {
    expect(definitionCard("g8-complement").name).toBe("일어나지 않을 확률");
    const view = explorerView(
      createExplorerState("student-fix", 8),
      "2026-09-28",
    );
    const names = view.units
      .flatMap((unit) => unit.cards)
      .map((card) => card.name);
    expect(names).toContain("일어나지 않을 확률");
    expect(names).not.toContain("여사건의 확률");
  });
});

describe("보정한 카드가 든 단원을 새 카드로 끝까지 푼다 — 조립 · 예 모으기 · 경계 살피기", () => {
  const units = [
    ...new Set(Object.keys(cardFixes).map((id) => definitionCard(id).unit)),
  ];
  it.each(units)(
    "%s — 15문항을 첫 판에 다 맞히고, 화면 조각 · 보기가 보정 카드와 같다",
    (unitId) => {
      const grade = Number(/^g(\d)/.exec(unitId)?.[1] ?? 7);
      let state = createExplorerState("student-fix", grade);
      const date = "2026-09-28";
      const act = (action: Parameters<typeof applyExplorerAction>[1]) => {
        state = applyExplorerAction(state, action, date, randomUUID()).state;
      };
      act({ type: "start", route: "unit", unitId });
      const session = () => state.profile.definitions!.session!;
      while (!session().done) {
        const s = session();
        if (definitionNeedsRead(state.profile, s)) {
          const reading = explorerView(state, date).currentActivity!;
          expect(reading.reading?.definition).toBe(
            definitionCard(reading.cardId).definition,
          );
          act({ type: "read", questionId: definitionQuestionId(s) });
          continue;
        }
        // 통분 조각 활동(보정 없음)은 엔진 시험과 같은 정답으로 넘긴다.
        while (
          state.profile.workshop?.session &&
          state.profile.workshop.session.stage !== "complete"
        ) {
          const lab = state.profile.workshop.session;
          const questionId = workshopQuestionId(lab);
          if (lab.stage === "predict" || lab.stage === "rule")
            act({
              type: lab.stage === "predict" ? "lab-predict" : "lab-rule",
              questionId,
              choiceId: workshopOptions(lab).indexOf(1),
            });
          else if (lab.stage === "split")
            act({ type: "lab-split", questionId, factor: 3 });
          else if (lab.stage === "match")
            act({ type: "lab-match", questionId, factors: [3, 2] });
          else {
            const question = lab.questions[lab.checkIndex]!;
            act({
              type: "lab-check",
              questionId,
              parts: question.fractions.map(
                (f) => (f.numerator * question.denominator) / f.denominator,
              ),
            });
          }
        }
        const task = s.queue[s.index]!;
        const card = definitionCard(task.cardId);
        const view = explorerView(state, date).currentActivity!;
        if (task.kind === 0) {
          expect(view.pieces).toEqual(card.pieces);
          expect(view.choices.map((choice) => choice.label).sort()).toEqual(
            [...card.words].sort(),
          );
        }
        if (task.kind === 1)
          expect(view.choices.map((choice) => choice.label).sort()).toEqual(
            card.examples.map((e) => e.text).sort(),
          );
        if (task.kind === 2) expect(view.prompt).toBe(card.trap);
        const source =
          task.kind === 0
            ? [0, 1]
            : task.kind === 1
              ? card.examples.flatMap((e, i) => (e.yes ? [i] : []))
              : [card.truth ? 1 : 0];
        const options = definitionOptions(s, task);
        act({
          type: "answer",
          questionId: definitionQuestionId(s),
          choiceIds: source.map((i) => options.indexOf(i)),
        });
      }
      expect(session().first).toBe(15);
      expect(session().unresolved).toEqual([]);
    },
  );

  it("도감 «뜻 다시 보기»(해설 요청)도 보정한 뜻", () => {
    let state = createExplorerState("student-fix", 8);
    const date = "2026-09-28";
    state.profile.definitions = {
      courseGrade: 8,
      runs: 0,
      history: [],
      cards: {
        "g8-elimination": {
          level: 1,
          due: "2026-10-01",
          lastDate: date,
          attemptedAt: date,
          missed: 0,
        },
      },
    };
    const result = applyExplorerAction(
      state,
      { type: "solution", cardId: "g8-elimination" },
      date,
      randomUUID(),
    );
    state = result.state;
    expect(result.feedback.solution?.definition).toBe(
      "연립방정식을 풀 때 두 식을 더하거나 빼서 한 미지수를 없애는 방법.",
    );
  });
});
