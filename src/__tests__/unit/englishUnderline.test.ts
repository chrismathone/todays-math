/**
 * 오늘의 영어 — 어법의 밑줄 표기 (D-151 · 25 §12.11 3자 합의 «다»).
 *
 * 지면은 글자 `<u>` · `</u>` 표기**만** 밑줄 구간으로 바꾼다 — 글을 HTML 로 넣지 않으므로 다른 꺾쇠는 글자 그대로다.
 * 번호 ①~⑤ 는 선 밖. 어법 문항에서 짝이 안 맞거나 밑줄 구간이 하나도 없으면 학생용 인쇄를 막는다(밑줄이 곧 발문이다).
 * 다른 유형에 섞인 표기는 글자로 찍고 알리기만 한다.
 */
import { describe, expect, it } from "vitest";

import type {
  EnglishQuestion,
  EnglishQuestionType,
} from "@/contracts/english.contract";
import {
  englishUnderlineNotices,
  findEnglishUnderlineProblems,
  splitEnglishUnderline,
} from "@/lib/english/underline";

const q = (type: EnglishQuestionType, prompt: string): EnglishQuestion => ({
  type,
  prompt,
  options: ["a", "b", "c", "d", "e"],
  answer: "1",
  explanation: "",
  evidence: "",
});

describe("splitEnglishUnderline — `<u>` 표기만 밑줄 구간으로 가른다", () => {
  it("표기는 사라지고 구간이 남는다 · 번호는 구간 밖", () => {
    expect(
      splitEnglishUnderline(
        "Many ①<u>think</u> that talent ②<u>decides success</u>.",
      ),
    ).toEqual([
      { text: "Many ①", underline: false },
      { text: "think", underline: true },
      { text: " that talent ②", underline: false },
      { text: "decides success", underline: true },
      { text: ".", underline: false },
    ]);
  });

  it("표기가 없으면 글 전체가 한 구간(밑줄 아님)", () => {
    expect(splitEnglishUnderline("No marks here.")).toEqual([
      { text: "No marks here.", underline: false },
    ]);
  });

  it("다른 꺾쇠는 글자 그대로 — `<b>` · 부등호 · `<under>` 는 표기가 아니다", () => {
    const text = "if a < b then <b>bold</b> and <under>x</under>";
    expect(splitEnglishUnderline(text)).toEqual([{ text, underline: false }]);
  });

  it("줄바꿈은 구간 안에서도 그대로 남는다 — 지면이 `pre-wrap` 으로 살린다", () => {
    expect(splitEnglishUnderline("발문\n\nA ①<u>long\nphrase</u> B")).toEqual([
      { text: "발문\n\nA ①", underline: false },
      { text: "long\nphrase", underline: true },
      { text: " B", underline: false },
    ]);
  });

  it("번호가 표기 안에 들어 있으면 선 밖으로 뺀다", () => {
    expect(splitEnglishUnderline("A <u>① think</u> B")).toEqual([
      { text: "A ① ", underline: false },
      { text: "think", underline: true },
      { text: " B", underline: false },
    ]);
  });

  it("🔴 짝이 안 맞으면 null — 닫히지 않음 · 열리지 않음 · 겹침 · 순서 뒤집힘", () => {
    expect(splitEnglishUnderline("A <u>think B")).toBeNull();
    expect(splitEnglishUnderline("A think</u> B")).toBeNull();
    expect(splitEnglishUnderline("A <u>x <u>y</u> z</u>")).toBeNull();
    expect(splitEnglishUnderline("A </u>x<u> B")).toBeNull();
  });

  it("대문자 표기도 같은 뜻으로 읽는다", () => {
    expect(splitEnglishUnderline("A <U>x</U>")).toEqual([
      { text: "A ", underline: false },
      { text: "x", underline: true },
    ]);
  });
});

describe("findEnglishUnderlineProblems — 막을 것과 알릴 것", () => {
  const GOOD = "A ①<u>x</u> ②<u>y</u> ③<u>z</u> ④<u>v</u> ⑤<u>w</u>";

  it("어법 문항의 표기가 온전하면 아무것도 없다", () => {
    expect(findEnglishUnderlineProblems([q("어법", GOOD)])).toEqual({
      blocking: [],
      warnings: [],
    });
  });

  it("🔴 어법 문항에 밑줄 구간이 하나도 없으면 막는다 — 빈 표기도 구간이 아니다", () => {
    expect(
      findEnglishUnderlineProblems([
        q("주제", "윗글의 주제는?"),
        q("어법", "A ① think ② shows"),
        q("어법", "A ①<u> </u> B"),
      ]).blocking,
    ).toEqual([
      { question: 1, issue: "none" },
      { question: 2, issue: "none" },
    ]);
  });

  it("🔴 어법 문항에서 짝이 안 맞으면 막는다", () => {
    expect(
      findEnglishUnderlineProblems([q("어법", "A ①<u>think ②<u>shows</u>")])
        .blocking,
    ).toEqual([{ question: 0, issue: "unbalanced" }]);
  });

  it("다른 유형에 섞인 표기는 막지 않고 알리기만 한다", () => {
    expect(
      findEnglishUnderlineProblems([
        q("빈칸 추론", "A <u>x</u> ____"),
        q("서술형", "밑줄 친 <u>this 를 설명하시오."),
        q("주제", "표기 없음"),
      ]),
    ).toEqual({ blocking: [], warnings: [0, 1] });
  });

  it("🔴 밑줄형이 아닌 어법 문항은 막지 않는다 — 발문에 번호도 «밑줄»도 없이 보기에서 고르는 문항", () => {
    // 붙여넣기 · 손으로 만든 세트에 있다. 이것까지 막으면 멀쩡한 세트가 선다(3자 합의 3차 «정정»)
    expect(
      findEnglishUnderlineProblems([q("어법", "다음 중 어법상 알맞은 것은?")]),
    ).toEqual({ blocking: [], warnings: [] });
    // «밑줄»이라는 말만 있어도 밑줄형이다 — 번호 없이 밑줄 하나를 묻는 문항
    expect(
      findEnglishUnderlineProblems([
        q("어법", "밑줄 친 부분을 어법에 맞게 고치시오.\nShe go to school."),
      ]).blocking,
    ).toEqual([{ question: 0, issue: "none" }]);
  });
});

describe("englishUnderlineNotices — 화면의 막는 줄 · 교사용 머리의 줄", () => {
  const notices = (...prompts: [EnglishQuestionType, string][]) =>
    englishUnderlineNotices(
      findEnglishUnderlineProblems(
        prompts.map(([type, text]) => q(type, text)),
      ),
    );

  it("문제가 없으면 아무 줄도 없다", () => {
    expect(notices(["어법", "A ①<u>x</u>"], ["주제", "주제는?"])).toEqual({
      errors: [],
      warning: null,
      teacherNote: null,
    });
  });

  it("원인마다 한 줄에 해당 문항 번호를 모두 적는다 — 밑줄 없음은 감싸라는 안내, 짝 불일치는 고치라는 안내", () => {
    const result = notices(
      ["어법", "A ① think"],
      ["어법", "B ①<u>x"],
      ["어법", "C ② shows"],
      ["어법", "D ①x</u>"],
    );
    expect(result.errors).toEqual([
      "1번 · 3번 어법 문항에 밑줄 구간이 없습니다. 발문에서 밑줄 칠 곳을 <u> 와 </u> 로 감싼 뒤 학생용을 인쇄하십시오.",
      "2번 · 4번 어법 문항의 밑줄 시작 · 끝 표기가 맞지 않습니다. 문항을 고친 뒤 학생용을 인쇄하십시오.",
    ]);
    // 교사용 종이에도 남긴다 — 밑줄 구간이 아예 없는 오류는 종이에서 스스로 보이지 않는다
    expect(result.teacherNote).toBe(
      "1번: 밑줄 구간 없음. 2번: 시작 · 끝 표기가 맞지 않음. 3번: 밑줄 구간 없음. 4번: 시작 · 끝 표기가 맞지 않음",
    );
  });

  it("다른 유형에 섞인 표기는 주의 한 줄 — 막지 않는다", () => {
    const result = notices(["서술형", "밑줄 친 <u>this</u> 를 쓰시오."]);
    expect(result.errors).toEqual([]);
    expect(result.warning).toBe(
      "1번 문항의 발문에 밑줄 표기(<u>)가 있습니다. 어법 문항이 아니어서 글자 그대로 찍힙니다.",
    );
    expect(result.teacherNote).toBeNull();
  });
});
