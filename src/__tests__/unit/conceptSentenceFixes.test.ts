/**
 * 보정 문장 표(`conceptSentenceFixes.ts`) — 원본(`definition-content.ts` · PROVENANCE SHA)은 그대로 두고
 * **보이는 문장만** 고친다(원장님 2026-09-28, D-143 ④).
 *
 * 대입법 «… 다른 식에 넣어 푸는 방법.» 은 무엇을 푸는지(연립방정식)가 빠졌다(원장님 캡처). 가감법도 같다.
 * 빈칸(정답 조각)과 보기는 그대로라 채점(조각 번호)은 바뀌지 않는다. 문장이 보이는 자리는 셋 —
 * 정의 조립 조각 · 뜻 만나기 뜻 · 도감 «뜻 다시 보기» — 이고 셋 다 서버 뷰가 이 표를 지난다(«모든 화면 일치»).
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  conceptSentence,
  conceptSentenceFixes,
} from "@/lib/math-explorers/conceptSentenceFixes";
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

const ROOT = resolve(__dirname, "../../..");

describe("conceptSentenceFixes — 보정 문장 표", () => {
  it("원본 파일은 옮겨 온 판 그대로다(고치지 않는다 — 고칠 문장은 이 표로)", () => {
    // PROVENANCE.md 의 SHA(b58df583…)는 패키지 원본 값이고, 저장소 판은 옮길 때 포맷만 지났다(d6ed9a39a).
    // 그 옮겨 온 판을 잠근다 — 원본을 일부러 바꿀 때만(원장님 결정) 이 값을 함께 바꾼다.
    const source = readFileSync(
      resolve(ROOT, "src/lib/math-explorers/definition-content.ts"),
      "utf8",
    );
    // 줄끝(CRLF/LF)에 흔들리지 않게 LF 로 맞춰 잰다.
    const lf = source.replace(/\r\n/g, "\n");
    expect(createHash("sha256").update(lf, "utf8").digest("hex")).toBe(
      "48960ceb98f5d50124be295593cf2c2b8244e4be6d850586a09bd9b18f936bb6",
    );
  });

  it("표의 카드는 모두 있는 카드이고, 빈칸 두 곳(정답 조각)은 그대로다", () => {
    for (const [id, fix] of Object.entries(conceptSentenceFixes)) {
      const card = definitionCard(id);
      expect(fix.pieces).toHaveLength(3);
      expect(fix.reason.length).toBeGreaterThan(0);
      const sentence = conceptSentence(card);
      expect(sentence.definition).toBe(
        fix.pieces[0] +
          card.words[0] +
          fix.pieces[1] +
          card.words[1] +
          fix.pieces[2],
      );
      expect(sentence.definition).not.toBe(card.definition);
    }
  });

  it("대입법 · 가감법 — 무엇을 푸는지(연립방정식)를 채운다", () => {
    expect(conceptSentence(definitionCard("g8-substitution")).definition).toBe(
      "한 식에서 구한 미지수의 표현을 다른 식에 넣어 연립방정식을 푸는 방법.",
    );
    expect(conceptSentence(definitionCard("g8-elimination")).definition).toBe(
      "연립방정식을 풀 때 두 식을 더하거나 빼서 한 미지수를 없애는 방법.",
    );
  });

  it("표에 없는 카드는 원문 그대로다", () => {
    const fixed = new Set(Object.keys(conceptSentenceFixes));
    for (const card of definitionCards.filter((item) => !fixed.has(item.id))) {
      const sentence = conceptSentence(card);
      expect(sentence.pieces).toEqual(card.pieces);
      expect(sentence.definition).toBe(card.definition);
    }
  });
});

describe("서버 뷰가 보정 문장을 쓴다 — 조립 조각 · 뜻 만나기 · 도감 «뜻 다시 보기»", () => {
  function fixture() {
    let state = createExplorerState("student-fix", 8);
    const date = "2026-09-28";
    const act = (action: Parameters<typeof applyExplorerAction>[1]) => {
      state = applyExplorerAction(state, action, date, randomUUID()).state;
    };
    const session = () => state.profile.definitions!.session!;
    return {
      act,
      session,
      get state() {
        return state;
      },
      date,
    };
  }
  function answerCorrect(f: ReturnType<typeof fixture>) {
    const s = f.session();
    const task = s.queue[s.index]!;
    const card = definitionCard(task.cardId);
    const source =
      task.kind === 0
        ? [0, 1]
        : task.kind === 1
          ? card.examples.flatMap((e, i) => (e.yes ? [i] : []))
          : [card.truth ? 1 : 0];
    const options = definitionOptions(s, task);
    f.act({
      type: "answer",
      questionId: definitionQuestionId(s),
      choiceIds: source.map((i) => options.indexOf(i)),
    });
  }

  it("대입법 차례에 뜻 만나기 · 조립이 보정 문장을 내고, 원래 정답 조각으로 채점된다", () => {
    const f = fixture();
    f.act({ type: "start", route: "unit", unitId: "g8-simultaneous" });
    while (f.session().queue[f.session().index]!.cardId !== "g8-substitution") {
      if (definitionNeedsRead(f.state.profile, f.session()))
        f.act({ type: "read", questionId: definitionQuestionId(f.session()) });
      else answerCorrect(f);
    }
    const reading = explorerView(f.state, f.date).currentActivity!;
    expect(reading.kind).toBe("read");
    expect(reading.reading?.definition).toBe(
      "한 식에서 구한 미지수의 표현을 다른 식에 넣어 연립방정식을 푸는 방법.",
    );
    f.act({ type: "read", questionId: reading.questionId });
    const assemble = explorerView(f.state, f.date).currentActivity!;
    expect(assemble.kind).toBe("assemble");
    expect(assemble.pieces).toEqual([
      "한 식에서 구한 미지수의 표현을 ",
      "에 ",
      " 연립방정식을 푸는 방법.",
    ]);
    const before = f.session().first;
    answerCorrect(f);
    expect(f.session().first).toBe(before + 1);
  });

  it("도감 «뜻 다시 보기»(해설 요청)도 보정 문장", () => {
    const f = fixture();
    f.act({ type: "start", route: "unit", unitId: "g8-simultaneous" });
    while (!f.session().done) {
      if (definitionNeedsRead(f.state.profile, f.session()))
        f.act({ type: "read", questionId: definitionQuestionId(f.session()) });
      else answerCorrect(f);
    }
    const result = applyExplorerAction(
      f.state,
      { type: "solution", cardId: "g8-elimination" },
      f.date,
      randomUUID(),
    );
    expect(result.feedback.solution?.definition).toBe(
      "연립방정식을 풀 때 두 식을 더하거나 빼서 한 미지수를 없애는 방법.",
    );
  });
});
