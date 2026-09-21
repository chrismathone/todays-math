/**
 * 편집기에서 친 여러 칸 띄어쓰기 — 원장님 2026-09-21
 * «띄워쓰기를 해놓고 저장해보면 다시 띄워쓰기가 사라지네.»
 *
 * 저장 원문은 멀쩡했다 — 작업실 저장본(workspace_document)의 9번 문항에 네 칸이 그대로 있다.
 * 사라지는 자리는 셋이다.
 *  ① 검수 카드·지면의 HTML 이 연속 공백을 한 칸으로 접는다(`white-space: normal`).
 *  ② 지면 파서 `collapseWhitespace` 가 `[ \t]{2,}` 를 **일부러** 한 칸으로 녹인다(옛 변환본 정리).
 *  ③ 편집기를 다시 열면 ProseMirror 파서가 접는다 — 그 뒤 아무 글자나 고치고 저장하면
 *     그때는 원문에서도 지워진다.
 *
 * 그래서 편집기에서 **친** 여러 칸만 고정 공백(U+00A0)으로 싣는다. 셋 다 고정 공백은 접지
 * 않는다. 지면의 공백 정리 규칙과 기존 문항(엔진이 넣은 두 칸 — 공유 문항 1,827건)은 그대로다.
 */
import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { documentMarkdown } from "@/components/math/editor/visualDocument";

const NBSP = "\xA0";
const text = (value: string): JSONContent => ({ type: "text", text: value });
const math = (tex: string): JSONContent => ({
  type: "visualMath",
  attrs: { tex, display: false },
});
const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  content,
});
const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
});

describe("편집기에서 친 여러 칸 띄어쓰기를 원문에 싣는다", () => {
  it("글 사이에 친 네 칸은 고정 공백 셋과 보통 공백 하나로 싣는다", () => {
    expect(documentMarkdown(doc(paragraph(text("갑    을"))))).toBe(
      `갑${NBSP.repeat(3)} 을`,
    );
  });

  it("수식 앞뒤에 친 칸도 싣는다 — <보기>의 (가)(나) 사이", () => {
    expect(
      documentMarkdown(
        doc(
          paragraph(
            text("(가) "),
            math("y = 3x^2"),
            text("    (나) "),
            math("y = -3x^2"),
          ),
        ),
      ),
    ).toBe(`(가) $y = 3x^2$${NBSP.repeat(3)} (나) $y = -3x^2$`);
    expect(documentMarkdown(doc(paragraph(text("(가)    "), math("y"))))).toBe(
      `(가)${NBSP.repeat(3)} $y$`,
    );
  });

  it("한 칸은 그대로다 — 이미 있는 원문이 한 글자도 안 바뀐다", () => {
    expect(documentMarkdown(doc(paragraph(text("갑 을 병"))))).toBe("갑 을 병");
  });

  it("다시 저장해도 같은 원문이다(멱등)", () => {
    const saved = `갑${NBSP.repeat(3)} 을`;
    expect(documentMarkdown(doc(paragraph(text(saved))))).toBe(saved);
  });

  it("고정 공백과 보통 공백이 섞인 칸은 길이 그대로 한 모양으로", () => {
    expect(documentMarkdown(doc(paragraph(text(`갑 ${NBSP} ${NBSP}을`))))).toBe(
      `갑${NBSP.repeat(3)} 을`,
    );
  });

  it("줄 끝 공백은 손대지 않는다 — 지면의 줄바꿈 규칙이 줄 끝 공백을 본다", () => {
    expect(
      documentMarkdown(
        doc(paragraph(text("갑    "), { type: "hardBreak" }, text("을"))),
      ),
    ).toBe("갑    \n을");
  });

  it("줄머리에 친 칸도 싣는다 — 네 칸이 마크다운 코드 블록으로 읽히지 않게", () => {
    // 본문 맨 앞·맨 끝은 예전처럼 잘라 낸다(`doc` 의 trim). 둘째 문단의 줄머리를 본다.
    expect(
      documentMarkdown(doc(paragraph(text("갑")), paragraph(text("    을")))),
    ).toBe(`갑\n\n${NBSP.repeat(3)} 을`);
  });

  it("수식 안의 공백은 손대지 않는다", () => {
    expect(documentMarkdown(doc(paragraph(math("x  +  y"))))).toBe("$x  +  y$");
  });

  it("<보기> 상자의 줄도 같다", () => {
    expect(
      documentMarkdown(
        doc({
          type: "conditionBox",
          attrs: { cols: 1 },
          content: [paragraph(text("<보기>")), paragraph(text("갑    을"))],
        }),
      ),
    ).toBe(`> <보기>\n> 갑${NBSP.repeat(3)} 을`);
  });

  it("코드 블록의 글은 그대로다", () => {
    expect(
      documentMarkdown(doc({ type: "codeBlock", content: [text("a    b")] })),
    ).toBe("```\na    b\n```");
  });
});
