// @vitest-environment node
/**
 * 오늘의 영어 — 읽은 글의 후보정 (D-158 · 25 §13.10). 결정적이다 — 모델을 더 부르지 않는다.
 *
 * 원장님 2026-10-06 «(Opus 는) 너무 비싸. gemini 3.8 flash 로 하고 강력한 후보정으로 추측 보정하는 걸로.
 * 어차피 사용자가 타이핑 추가 보정도 가능하니까».
 *
 * ⑴ 빈칸 맞추기 — 같은 사진을 따로 한 번 더 읽은 글로 **빈칸 자리만** 고친다. 읽기는 틀리는 자리가 회차마다 달랐다
 *    (h____ 가 hot____ 이 되거나, 앞 글자가 빠지거나, 빈칸에 쓴 답이 낱말로 읽히거나).
 * ⑵ 추측 보정 — 한 글 안에서: 이름 줄의 손으로 쓴 반 · 번 숫자 · 한 문제 안에서 유독 긴 빈칸 앞 글자.
 *
 * 규칙은 구독 CLI 로 받아 둔 Gemini 의 읽기 글로 쟀다(§13.10) — 여기의 예는 그때 나온 꼴을 본뜬 것이고, 재던 사진의 문장이 아니다.
 */
import { describe, expect, it } from "vitest";

import {
  polishEnglishReadText,
  reconcileEnglishBlanks,
} from "@/lib/english/readRefine";

describe("빈칸 맞추기 — 따로 읽은 글로 빈칸 자리만 고친다", () => {
  it("빈칸 앞 글자는 가장 짧은, 비지 않은 것 — 손글씨는 글자를 보탤 뿐이다", () => {
    expect(
      reconcileEnglishBlanks(
        "The bridge is bri________ and the river is r________.",
        "The bridge is b________ and the river is riv________.",
      ),
    ).toBe("The bridge is b________ and the river is r________.");
  });

  it("앞 글자를 빠뜨린 쪽은 다른 글에서 채운다", () => {
    expect(
      reconcileEnglishBlanks(
        "When the ________ goes up, the land becomes d________.",
        "When the t________ goes up, the land becomes d________.",
      ),
    ).toBe("When the t________ goes up, the land becomes d________.");
    // 둘 다 비었으면 그대로다 — 글자를 지어내지 않는다
    expect(
      reconcileEnglishBlanks(
        "When the ________ goes up.",
        "When the ____ goes up.",
      ),
    ).toBe("When the ________ goes up.");
  });

  it("빈칸의 길이와 뒤 문장부호는 밑글 것을 쓴다", () => {
    expect(
      reconcileEnglishBlanks(
        "It gets hot________. Then",
        "It gets h____, Then",
      ),
    ).toBe("It gets h________. Then");
  });

  it("한쪽이 빈칸에 쓴 답을 낱말로 읽었으면 빈칸 꼴을 쓴다 — 그 낱말이 앞 글자로 시작할 때만", () => {
    expect(
      reconcileEnglishBlanks(
        "Trees add water to the air and help make clouds.",
        "Trees add w________ to the air and help make c________.",
      ),
    ).toBe("Trees add w________ to the air and help make c________.");
    // 밑글이 빈칸 꼴이면 다른 글의 낱말로 채우지 않는다
    expect(
      reconcileEnglishBlanks(
        "Trees add w________ to the air.",
        "Trees add water to the air.",
      ),
    ).toBe("Trees add w________ to the air.");
  });

  it("앞 글자 없는 빈칸으로는 낱말을 지우지 않는다 — 밑줄 위에 인쇄된 말일 수 있다", () => {
    expect(
      reconcileEnglishBlanks(
        'A: How about 4. say "no" to plastic bags?',
        'A: How about 4. ________ "no" to plastic bags?',
      ),
    ).toBe('A: How about 4. say "no" to plastic bags?');
    // 앞 글자가 낱말과 맞지 않아도 지우지 않는다
    expect(
      reconcileEnglishBlanks("They save water.", "They k________ water."),
    ).toBe("They save water.");
  });

  it("빈칸이 아닌 자리는 손대지 않는다 — 다른 글에만 있는 낱말을 넣지 않고, 다른 낱말로 바꾸지 않는다", () => {
    const base = "deforestation 삼림 벌채\nrelease 내보내다";
    expect(
      reconcileEnglishBlanks(
        base,
        "deforestation 산림 벌채 (손으로 쓴 메모)\nrelease 내보내다 moisture 습기",
      ),
    ).toBe(base);
  });

  it("밑글의 줄 · 띄어쓰기를 그대로 둔다", () => {
    const base =
      "1. 빈칸에 적절한 단어를 넣으시오.\n\nDroughts are caused by hu________.\n  Second,   c________ d________ too many trees.";
    expect(
      reconcileEnglishBlanks(
        base,
        "1. 빈칸에 적절한 단어를 넣으시오. Droughts are caused by h____. Second, c____ d____ too many trees.",
      ),
    ).toBe(base.replace("hu________", "h________"));
  });

  it("읽는 차례가 다른 글(표를 줄로 읽었나 칸으로 읽었나)은 쓰지 않는다", () => {
    const rows =
      "period a________\ncover b________\nreason c________\nflood d________\ncause e________\ndrought f________\nfactor g________\nincrease h________";
    const columns =
      "period\ncover\nreason\nflood\ncause\ndrought\nfactor\nincrease\nax________\nbx________\ncx________\ndx________\nex________\nfx________\ngx________\nhx________";
    expect(reconcileEnglishBlanks(rows, columns)).toBe(rows);
  });

  it("단을 읽는 차례가 뒤바뀐 글은 통째로 쓰지 않는다 — 맞아 보이는 자리도 고치지 않는다", () => {
    const left =
      "1. Which is true about Earth Day? It began in the United States.";
    const right =
      "2. What can we do for nature? We can plant many trees together.";
    const tail = "The weather gets hot________ in summer.";
    const fixed = tail.replace("hot", "h");
    const base = [left, right, tail].join("\n");
    expect(reconcileEnglishBlanks(base, [right, left, fixed].join("\n"))).toBe(
      base,
    );
    // 차례가 같으면 그 자리는 고친다
    expect(reconcileEnglishBlanks(base, [left, right, fixed].join("\n"))).toBe(
      [left, right, fixed].join("\n"),
    );
  });

  it("낱말 수가 다르게 갈린 자리는 짝짓지 않는다 — 어느 낱말이 어느 낱말인지 모른다", () => {
    const base = "It gets hot________ today.";
    expect(reconcileEnglishBlanks(base, "It gets h________ very today.")).toBe(
      base,
    );
  });

  it("빈 글 · 같은 글 · 아주 긴 글은 밑글 그대로다", () => {
    expect(reconcileEnglishBlanks("Plain text.", "")).toBe("Plain text.");
    expect(reconcileEnglishBlanks("a________ b", "a________ b")).toBe(
      "a________ b",
    );
    const long = Array.from({ length: 2500 }, (_, i) => `w${i}`).join(" ");
    expect(
      reconcileEnglishBlanks(`${long} hot________`, `${long} h________`),
    ).toBe(`${long} hot________`);
  });
});

describe("추측 보정 — 한 글 안에서", () => {
  it("이름 줄의 반 · 번 앞 숫자는 손으로 쓴 것이다 — 학년의 숫자는 둔다", () => {
    expect(
      polishEnglishReadText(
        "4호( 월 일) Lesson 2 p 38 ~ 39 1학년 1반 15번 이름:\n\n1. new words",
      ),
    ).toBe("4호( 월 일) Lesson 2 p 38 ~ 39 1학년 반 번 이름:\n\n1. new words");
    expect(polishEnglishReadText("1 학년 | 3 반 7 번 이름:")).toBe(
      "1 학년 | 반 번 이름:",
    );
    // 빈 괄호 꼴은 그대로
    expect(
      polishEnglishReadText("2학기 총괄 평가 ( ) 1학년 ( )반 이름: ( )"),
    ).toBe("2학기 총괄 평가 ( ) 1학년 ( )반 이름: ( )");
  });

  it("이름 줄이 아니면 숫자를 건드리지 않는다", () => {
    const text = "우리 반은 1학년 3반이고 나는 15번이다.\n3반 15번 학생";
    expect(polishEnglishReadText(text)).toBe(text);
  });

  it("빈칸 앞 글자가 거의 다 첫 소리뿐이면, 유독 긴 것은 첫 소리로 줄인다", () => {
    // 첫 소리뿐인 빈칸이 여덟, 긴 것이 셋(73%)
    const head =
      "It is b________ and r________. The sh________ is big. We pr________ it. c________ d________ t________ w________\n";
    expect(
      polishEnglishReadText(
        head +
          "The land is dry________ and we are act________ in the en________.",
      ),
    ).toBe(
      head + "The land is dr________ and we are a________ in the e________.",
    );
  });

  it("빈칸이 적거나, 긴 앞 글자가 흔한 글은 그대로 둔다 — 그 글의 꼴일 수 있다", () => {
    // 넷뿐이다 — 셋이 첫 소리뿐이어도(75%) 그 글의 꼴을 말하기에는 적다
    const few = "It is hot________ and b________ r________ d________";
    expect(polishEnglishReadText(few)).toBe(few);
    // 다섯이면 본다
    expect(polishEnglishReadText(`${few} w________`)).toBe(
      "It is h________ and b________ r________ d________ w________",
    );
    // 앞 글자가 두세 글자인 것이 절반이다 — 이 종이는 그렇게 인쇄된 것이다
    const long =
      "un________ re________ be________ ex________ in________ b________ r________ d________";
    expect(polishEnglishReadText(long)).toBe(long);
  });

  it("빈칸이 아닌 낱말 · 번호 · 한글은 건드리지 않는다", () => {
    const text =
      "(1) I'd like to emphasize that we should save water.\n(2) ________ (stress)\n① 지구의 날 목적\nb________ r________ c________ d________ e________";
    expect(polishEnglishReadText(text)).toBe(text);
  });

  it("줄끝을 맞추고 그 밖의 글은 한 글자도 바꾸지 않는다", () => {
    expect(polishEnglishReadText("First line.\r\nSecond.")).toBe(
      "First line.\nSecond.",
    );
    expect(polishEnglishReadText("")).toBe("");
  });
});
