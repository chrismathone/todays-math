/**
 * 표식 ①~⑤ 통일이 **공유 DB 에 대고 하는 일**을 잠근다 (D-80).
 *
 * 원장님 확정 2026-08-25 「보기번호는 바꾸고」.
 *
 * ## 왜 이 시험이 필요한가 — 무리 필터가 새면 조용히 크게 틀린다
 *
 * 2026-08-18 에 **43건을 빼려다 433건**을 뺄 뻔했다. 산출물의 «불가»를 그대로
 * 처리 대상으로 물려받아서였다. 그때 잡아 준 것은 D-20 손실 계수 하나뿐이었다.
 * 그래서 여기서는 **고르는 함수 자체**를 반대쪽 표본에 대 본다 —
 * 「멀쩡한 ①~⑤ 문항을 대상에 넣지 않는가」·「잠긴 문항을 건드리지 않는가」.
 *
 * ## 참이 어디서 오나
 *
 * 판정의 참은 **제품 파서가 몇 개를 보기로 읽는가** 라는 관측이다. 우리가 고치려는
 * 값(본문의 표식 글자)이 아니라 지면의 사실이므로 동어반복이 아니다.
 * 기대 표식은 그래도 **리터럴**로 못 박는다 — `CHOICE_MARKS` 를 쓰면 그 상수를
 * 바꿔도 초록이다.
 */
import { describe, expect, it } from "vitest";

import {
  markMapOf,
  pickMarkTargets,
  rewriteMarks,
  shouldRevertMarks,
} from "../../../scripts/qa/apply-choice-marks-fix";

/** 🔴 리터럴 — 제품 상수를 그대로 쓰면 상수를 바꿔도 초록이다. */
const NEW_MARKS = ["①", "②", "③", "④", "⑤"];
const OLD_MARKS = ["㉠", "㉡", "㉢", "㉣", "㉤"];

const listWith = (marks: readonly string[]) =>
  ["다음 중 옳은 것은 모두 몇 개인지 구하시오."]
    .concat(marks.map((m, i) => `${m} 보기 ${i + 1}`))
    .join("\n");

const hangul = listWith(OLD_MARKS);
const circled = listWith(NEW_MARKS);

describe("처리 대상 고르기 — 무리 필터", () => {
  const rows = [
    { id: "㉠목록", content: hangul, directUseAllowed: true },
    // 🔴 **반대쪽 표본** — 이미 ①~⑤ 인 멀쩡한 문항. 대상에 들어오면 안 된다.
    { id: "①목록", content: circled, directUseAllowed: true },
    // 잠긴 문항 — 출제 풀에 없으므로 무리에도 안 들어온다.
    { id: "잠김", content: hangul, directUseAllowed: false },
    // 보기가 아예 없는 문항 — 이 규칙의 대상이 아니다.
    { id: "보기없음", content: "평균을 구하시오.", directUseAllowed: true },
    // 상자 이름표 — 줄머리가 아니므로 목록이 아니다.
    {
      id: "이름표",
      content: "세 상자 ㉠, ㉡, ㉢에 수가 있다. ㉠ $6$ / ㉡ $1$ / ㉢ $6$",
      directUseAllowed: true,
    },
  ];

  it("대상은 «지면이 보기로 안 읽는 목록» 뿐이다", () => {
    const { targets, family } = pickMarkTargets(rows);
    expect(targets.map((r) => r.id)).toEqual(["㉠목록"]);
    // 무리(분모)에는 멀쩡한 ① 목록도 들어온다 — 분모가 있어야 손실을 셀 수 있다.
    expect(family.map((r) => r.id).sort()).toEqual(["①목록", "㉠목록"]);
  });

  it("🔴 분모 + 건너뜀 = 무리 (한 건도 새지 않는다)", () => {
    const { targets, family } = pickMarkTargets(rows);
    expect(targets.length + (family.length - targets.length)).toBe(
      family.length,
    );
  });
});

describe("바꿀 짝은 **본문에서** 만든다 — 손 목록이 아니다", () => {
  it("첫 등장 순서대로 ①~⑤ 에 대응시킨다", () => {
    const map = markMapOf(hangul)!;
    expect([...map.entries()]).toEqual(
      OLD_MARKS.map((c, i) => [c, NEW_MARKS[i]!]),
    );
  });

  it("🔴 아무도 목록에 안 적은 표식(❶)도 그대로 돈다", () => {
    const map = markMapOf(listWith(["❶", "❷", "❸"]))!;
    expect([...map.values()]).toEqual(["①", "②", "③"]);
  });

  it("표식이 여섯 이상이면 짝을 못 만든다 (안 건드린다)", () => {
    expect(
      markMapOf(listWith(["㉠", "㉡", "㉢", "㉣", "㉤", "㉥"])),
    ).toBeNull();
    expect(markMapOf("평균을 구하시오.")).toBeNull();
  });
});

describe("치환에는 값 검산이 붙어 있다", () => {
  it("본문과 **해설**의 표식이 함께 바뀐다", () => {
    const solution = "옳은 것은 ㉠, ㉢이다. 따라서 $2$개이다.";
    const r = rewriteMarks(hangul, solution);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.content).toBe(circled);
    expect(r.solution).toBe("옳은 것은 ①, ③이다. 따라서 $2$개이다.");
    expect(r.from).toBe(OLD_MARKS.join(""));
    expect(r.to).toBe(NEW_MARKS.join(""));
    // 글자 수가 그대로다 — 1:1 치환이므로 다른 것이 섞이면 여기가 달라진다.
    expect(r.content.length).toBe(hangul.length);
  });

  it("🔴 이미 ①~⑤ 인 문항은 **안 바꾼다** (음성 대조군)", () => {
    const r = rewriteMarks(circled, null);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.why).toMatch(/이미/);
  });

  it("🔴 새 표식이 본문에 **이미 있으면** 안 바꾼다 — 겹치면 뜻이 무너진다", () => {
    const mixed = `${hangul}\n(참고: ② 는 이미 쓰였다)`;
    const r = rewriteMarks(mixed, null);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.why).toMatch(/이미 본문에 있다/);
  });

  it("표식이 여섯이면 안 바꾼다", () => {
    const r = rewriteMarks(listWith([...OLD_MARKS, "㉥"]), null);
    expect(r.ok).toBe(false);
  });

  it("해설이 없어도(null) 돈다", () => {
    const r = rewriteMarks(hangul, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.solution).toBeNull();
  });
});

describe("되돌리기 — 지금 값이 **내가 쓴 것**일 때만", () => {
  const row = {
    afterContent: circled,
    afterSolution: "옳은 것은 ①, ③이다.",
  };

  it("그대로면 되돌린다", () => {
    expect(
      shouldRevertMarks(row, {
        content: circled,
        solution: "옳은 것은 ①, ③이다.",
      }).ok,
    ).toBe(true);
  });

  it("🔴 본문이 그 사이 바뀌었으면 **안 되돌린다**", () => {
    const v = shouldRevertMarks(row, {
      content: `${circled}\n(누가 고쳤다)`,
      solution: "옳은 것은 ①, ③이다.",
    });
    expect(v.ok).toBe(false);
    expect(v.why).toMatch(/본문/);
  });

  it("🔴 **해설**이 그 사이 바뀌었어도 안 되돌린다", () => {
    const v = shouldRevertMarks(row, {
      content: circled,
      solution: "다른 해설",
    });
    expect(v.ok).toBe(false);
    expect(v.why).toMatch(/해설/);
  });

  it("문항이 없으면 안 되돌린다", () => {
    expect(shouldRevertMarks(row, null).ok).toBe(false);
  });
});
