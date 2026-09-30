/**
 * 오늘의 영어 — 학생용 지면의 묶음 짓기 (D-151 · 25 §12.11 3자 합의 «가 · 나»).
 *
 * 묶음은 순서가 있는 목록이다. 독해 묶음(원 지문 + 독해형)이 맨 뒤, 변형 문항은 «남은 변형 문항의 답을 담지 않은 것»부터 앞 묶음.
 * 서로의 답을 보여 주는 쌍 · 순환은 순서로 없앨 수 없다 — 나누어 두고 남는 짝을 알린다.
 * 누출 짝은 주입한다(짝 찾기는 `englishLeak.test.ts` 가 본다) — 맨 끝 한 건만 실제 검사를 거친다.
 */
import { describe, expect, it } from "vitest";

import type {
  EnglishQuestion,
  EnglishQuestionType,
} from "@/contracts/english.contract";
import {
  englishBundleLabel,
  englishBundleNotices,
  englishQuestionRange,
  planEnglishBundles,
} from "@/lib/english/bundle";
import type { EnglishLeak } from "@/lib/english/leak";

const q = (type: EnglishQuestionType): EnglishQuestion => ({
  type,
  prompt: `${type} 발문`,
  options: ["a", "b", "c", "d", "e"],
  answer: "1",
  explanation: "",
  evidence: "",
});

/** 표본 세트의 순서 — 1 주제 · 2 내용 일치 · 3 어법 · 4 빈칸 · 5 삽입 · 6 서술형 */
const SIX = {
  passage: "A passage.",
  questions: (
    ["주제", "내용 일치", "어법", "빈칸 추론", "문장 삽입", "서술형"] as const
  ).map(q),
};
const leak = (source: number, target: number): EnglishLeak => ({
  source,
  target,
  kind: SIX.questions[source]!.type,
  snippet: `구절 ${source}→${target}`,
});
const shape = (plan: ReturnType<typeof planEnglishBundles>) =>
  plan.bundles.map((b) => [b.no, b.kind, b.questions, b.passage]);

describe("planEnglishBundles — 묶음을 짓는 규칙", () => {
  it("누출이 없으면 묶음 둘 — 변형(원 지문 없음)이 먼저, 독해(원 지문 + 독해형)가 뒤", () => {
    const plan = planEnglishBundles(SIX, { leaks: [] });
    expect(shape(plan)).toEqual([
      [1, "변형", [2, 3, 4], false],
      [2, "독해", [0, 1, 5], true],
    ]);
    expect(plan.open).toEqual([]);
  });

  it("표본: 5번의 지문에 3 · 4번의 답 → 묶음 1(3 · 4번) · 묶음 2(5번) · 묶음 3(독해)", () => {
    const plan = planEnglishBundles(SIX, { leaks: [leak(2, 4), leak(3, 4)] });
    expect(shape(plan)).toEqual([
      [1, "변형", [2, 3], false],
      [2, "변형", [4], false],
      [3, "독해", [0, 1, 5], true],
    ]);
    expect(plan.open).toEqual([]);
  });

  it("사슬(4번에 3번의 답 · 5번에 4번의 답)이면 변형 묶음이 셋 — 답을 보여 주는 쪽이 늘 뒤", () => {
    const plan = planEnglishBundles(SIX, { leaks: [leak(2, 3), leak(3, 4)] });
    expect(shape(plan).map((row) => row[2])).toEqual([
      [2],
      [3],
      [4],
      [0, 1, 5],
    ]);
    expect(plan.open).toEqual([]);
  });

  it("필요 없이 쪼개지 않는다 — 서로 답을 안 보여 주는 문항은 한 묶음", () => {
    // 3번의 답이 4번 · 5번 둘 다에 보인다 → 4 · 5번은 서로 무관하므로 같은 묶음
    const plan = planEnglishBundles(SIX, { leaks: [leak(2, 3), leak(2, 4)] });
    expect(shape(plan).map((row) => row[2])).toEqual([[2], [3, 4], [0, 1, 5]]);
  });

  it("🔴 서로의 답을 보여 주는 쌍은 순서로 못 없앤다 — 나누어 두고 남는 짝을 `open` 에 적는다", () => {
    const plan = planEnglishBundles(SIX, { leaks: [leak(3, 4), leak(4, 3)] });
    // 3번은 무관 → 묶음 1. 4 · 5번은 서로 물려 있어 따로따로
    expect(shape(plan).map((row) => row[2])).toEqual([
      [2],
      [3],
      [4],
      [0, 1, 5],
    ]);
    // 4번(앞 묶음)의 지문에 5번의 답이 있다 — 앞 지문에 뒤 문항의 답
    expect(plan.open).toEqual([leak(4, 3)]);
    expect(plan.cyclic).toBe(true);
  });

  it("순환 뒤에 매달린 문항도 제자리를 찾는다 — 순환을 끊고 나서 다시 규칙대로", () => {
    const set = {
      passage: "P",
      questions: (["어법", "빈칸 추론", "문장 삽입", "원문 복원"] as const).map(
        q,
      ),
    };
    // 1 ↔ 2 순환 · 0번의 지문에 1번의 답(순환에 매달리기만 한다) · 3번은 무관
    const plan = planEnglishBundles(set, {
      leaks: [
        { source: 1, target: 2, kind: "빈칸 추론", snippet: "a" },
        { source: 2, target: 1, kind: "문장 삽입", snippet: "b" },
        { source: 1, target: 0, kind: "빈칸 추론", snippet: "c" },
      ],
    });
    // 떼어 내는 것은 순환 위의 문항(1)이다 — 앞 번호라고 매달린 문항(0)을 떼면 없앨 수 있던 짝(1→0)까지 남는다
    expect(plan.bundles.map((b) => b.questions)).toEqual([[3], [1], [0, 2]]);
    expect(plan.bundles.every((b) => b.kind === "변형" && !b.passage)).toBe(
      true,
    );
    expect(plan.open.map((l) => [l.source, l.target])).toEqual([[2, 1]]);
  });

  it("합치면 변형 문항이 한 묶음 — 그 안에서 보이는 짝이 전부 `open`", () => {
    const leaks = [leak(2, 4), leak(3, 4)];
    const plan = planEnglishBundles(SIX, { leaks, merge: true });
    expect(shape(plan)).toEqual([
      [1, "변형", [2, 3, 4], false],
      [2, "독해", [0, 1, 5], true],
    ]);
    expect(plan.open).toEqual(leaks);
    expect(plan.merged).toBe(true);
  });

  it("누출이 없으면 합칠 것이 없다 — `merge` 를 줘도 `merged` 는 거짓", () => {
    expect(planEnglishBundles(SIX, { leaks: [], merge: true }).merged).toBe(
      false,
    );
  });

  it("변형 문항이 없으면 독해 묶음 하나 · 독해형이 없으면 원 지문을 싣는 묶음이 없다", () => {
    const reading = {
      passage: "P",
      questions: (["주제", "서술형"] as const).map(q),
    };
    expect(shape(planEnglishBundles(reading, { leaks: [] }))).toEqual([
      [1, "독해", [0, 1], true],
    ]);
    const variant = {
      passage: "P",
      questions: (["어법", "빈칸 추론"] as const).map(q),
    };
    expect(shape(planEnglishBundles(variant, { leaks: [] }))).toEqual([
      [1, "변형", [0, 1], false],
    ]);
  });

  it("누출 짝을 안 주면 직접 검사한다 — 삽입 문항의 지문이 빈칸의 원문을 싣고 있으면 뒤 묶음으로", () => {
    const S1 = "Many students think that talent decides success.";
    const S2 = "However, research shows that steady practice matters more.";
    const S3 =
      "A pianist who practices every day improves faster than one who waits for inspiration.";
    const S4 = "Small efforts, repeated over time, build real skill.";
    const S5 = "Therefore, habits are more important than gifts.";
    const set = {
      passage: [S1, S2, S3, S4, S5].join(" "),
      questions: [
        {
          ...q("빈칸 추론"),
          prompt: `다음 빈칸에 들어갈 말로 가장 적절한 것은?\n${S1} However, research shows that ________ matters more. ${S3} ${S4} ${S5}`,
          options: ["steady practice", "b", "c", "d", "e"],
        },
        {
          ...q("문장 삽입"),
          prompt: `[주어진 문장] ${S4}\n\n글의 흐름으로 보아 주어진 문장이 들어가기에 가장 적절한 곳은?\n( ① ) ${S1} ( ② ) ${S2} ( ③ ) ${S3} ( ④ ) ${S5} ( ⑤ )`,
          options: ["①", "②", "③", "④", "⑤"],
          answer: "4",
        },
      ],
    };
    const plan = planEnglishBundles(set);
    // 삽입의 지문에 빈칸의 답이 있고, 빈칸의 지문에는 삽입 문장이 제자리에 있다 — 서로 물린 쌍
    expect(plan.leaks.length).toBeGreaterThan(0);
    expect(plan.bundles.map((b) => b.questions)).toEqual([[0], [1]]);
  });
});

describe("묶음 이름 · 수록 문항", () => {
  it("이어진 번호는 «3~4번», 떨어진 번호는 «1~2, 6번», 하나는 «5번»", () => {
    expect(englishQuestionRange([2, 3])).toBe("3~4번");
    expect(englishQuestionRange([0, 1, 5])).toBe("1~2, 6번");
    expect(englishQuestionRange([4])).toBe("5번");
    expect(englishQuestionRange([5, 0, 2])).toBe("1, 3, 6번");
  });

  it("종이의 머리 딱지는 «문제 묶음 1 · 3~4번» — 화면과 번호가 같다", () => {
    const plan = planEnglishBundles(SIX, { leaks: [leak(2, 4), leak(3, 4)] });
    expect(plan.bundles.map(englishBundleLabel)).toEqual([
      "문제 묶음 1 · 3~4번",
      "문제 묶음 2 · 5번",
      "문제 묶음 3 · 1~2, 6번",
    ]);
  });
});

describe("englishBundleNotices — 인쇄 화면과 교사용 머리의 문장", () => {
  it("배부 순서: 묶음 수만큼 잇고 매번 회수를 적는다 · 조사(을/를)가 번호를 따라간다", () => {
    const three = englishBundleNotices(
      planEnglishBundles(SIX, { leaks: [leak(2, 4), leak(3, 4)] }),
    );
    expect(three.handout).toBe(
      "묶음 1을 풀고 걷은 뒤 묶음 2를 나눠 줍니다. 묶음 2를 걷은 뒤 묶음 3을 나눠 줍니다. 한꺼번에 주면 가른 효과가 없습니다.",
    );
    expect(three.order).toBe(
      "묶음 1(3~4번) → 걷은 뒤 묶음 2(5번) → 걷은 뒤 묶음 3(1~2, 6번)",
    );
    const two = englishBundleNotices(planEnglishBundles(SIX, { leaks: [] }));
    expect(two.handout).toBe(
      "묶음 1을 풀고 걷은 뒤 묶음 2를 나눠 줍니다. 한꺼번에 주면 가른 효과가 없습니다.",
    );
  });

  it("묶음이 하나면 배부 순서 문장이 없다", () => {
    const one = englishBundleNotices(
      planEnglishBundles(
        { passage: "P", questions: [q("주제")] },
        { leaks: [] },
      ),
    );
    expect(one.handout).toBeNull();
    expect(one.order).toBeNull();
  });

  it("누출이 없으면 «검사에서 찾은 누출 없음» — 안전하다고 말하지 않는다", () => {
    const notices = englishBundleNotices(
      planEnglishBundles(SIX, { leaks: [] }),
    );
    expect(notices.leak).toEqual({
      tone: "none",
      text: "검사에서 찾은 누출 없음",
    });
    expect(notices.shown).toBe("검사에서 찾은 누출 없음");
    expect(notices.merge).toBeNull();
  });

  it("갈라 둔 까닭과 합치기의 영향을 같은 줄에 — 합치기 전에 영향을 먼저 읽는다", () => {
    const notices = englishBundleNotices(
      planEnglishBundles(SIX, { leaks: [leak(2, 4), leak(3, 4)] }),
    );
    expect(notices.leak).toEqual({
      tone: "split",
      text: "5번의 지문에 3번 · 4번의 답이 있어 5번을 묶음 2로 두었습니다.",
    });
    expect(notices.merge).toEqual({
      action: "merge",
      label: "5번을 묶음 1에 합치기",
      effect: "합치면 3번 · 4번의 답이 5번의 지문에 보입니다.",
    });
    expect(notices.shown).toBe("5번의 지문에 3번 · 4번의 답");
    expect(notices.evidence).toEqual([
      "3번의 답 «구절 2→4» — 5번의 지문에 그대로 있습니다.",
      "4번의 답 «구절 3→4» — 5번의 지문에 그대로 있습니다.",
    ]);
  });

  it("합친 뒤에는 합쳤다는 사실과 보이는 답을 적고 «합치기 되돌리기»를 준다 — 단추만 읽어도 무엇을 되돌리는지 안다", () => {
    const notices = englishBundleNotices(
      planEnglishBundles(SIX, {
        leaks: [leak(2, 4), leak(3, 4)],
        merge: true,
      }),
    );
    expect(notices.leak).toEqual({
      tone: "merged",
      text: "5번을 묶음 1에 합쳤습니다. 3번 · 4번의 답이 5번의 지문에 보입니다.",
    });
    expect(notices.merge).toEqual({
      action: "split",
      label: "합치기 되돌리기",
      effect: null,
    });
  });

  it("변형 묶음이 셋 이상이면 묶음마다 까닭을 적고, 합치기는 «변형 문항을 묶음 1에»", () => {
    const notices = englishBundleNotices(
      planEnglishBundles(SIX, { leaks: [leak(2, 3), leak(3, 4)] }),
    );
    expect(notices.leak.text).toBe(
      "4번의 지문에 3번의 답이 있어 4번을 묶음 2로, 5번의 지문에 4번의 답이 있어 5번을 묶음 3으로 두었습니다.",
    );
    expect(notices.merge?.label).toBe("변형 문항을 묶음 1에 합치기");
    expect(notices.merge?.effect).toBe(
      "합치면 3번의 답이 4번의 지문에, 4번의 답이 5번의 지문에 보입니다.",
    );
  });

  it("🔴 순서로 못 없앤 쌍은 같은 줄에 그 사실을 적는다", () => {
    const notices = englishBundleNotices(
      planEnglishBundles(SIX, { leaks: [leak(3, 4), leak(4, 3)] }),
    );
    expect(notices.leak.tone).toBe("split");
    expect(notices.leak.text).toBe(
      "5번의 지문에 4번의 답이 있어 5번을 묶음 3으로 두었습니다. 4번과 5번은 어느 쪽을 먼저 줘도 앞 지문에 뒤 문항의 답이 있습니다.",
    );
    expect(notices.shown).toBe("4번의 지문에 5번의 답 · 5번의 지문에 4번의 답");
  });
});
