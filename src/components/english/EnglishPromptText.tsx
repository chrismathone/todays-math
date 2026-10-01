/**
 * 발문 — 어법 문항의 `<u>…</u>` 표기만 밑줄로 그린다(번호 ①~⑤ 는 선 밖 · 줄이 바뀐 구간도 한 밑줄).
 * 짝이 깨졌으면 어디까지가 밑줄인지 알 수 없으니 글자 그대로 둔다. 다른 유형의 표기도 글자 그대로(미리보기가 알린다).
 *
 * **지면(`EnglishPaper`)과 편집 화면(`EnglishQuestionView`)이 같이 쓴다** — 같은 문제는 같은 규칙으로 보인다.
 * 글꼴 · 밑줄의 굵기와 거리는 부르는 쪽의 `underlineClassName` 이 정한다(지면은 지면 글꼴, 화면은 앱 글꼴).
 * `markClassName` 을 주면 원문자(①~⑳)를 그 클래스의 span 으로 감싼다 — 앱 글꼴의 원문자는 글자보다 작게 그려져
 * 화면에서 키운다(원장님 2026-10-01 «발문과 문항번호 폰트 일치»). 지면 명조의 원문자는 글자와 크기가 같아 주지 않는다.
 * 글을 HTML 로 넣지 않는다 — `splitEnglishUnderline` 이 가른 조각을 글자로 그린다.
 */
import type { ReactNode } from "react";

import type { EnglishQuestion } from "@/contracts/english.contract";
import { splitEnglishUnderline } from "@/lib/english/underline";

const CIRCLED = /([①-⑳])/;

/** 원문자를 span 으로 감싼다 — 클래스가 없으면 글 그대로 */
export function EnglishMarkedText({
  text,
  markClassName,
}: {
  text: string;
  markClassName?: string;
}): ReactNode {
  if (!markClassName || !CIRCLED.test(text)) return text;
  return text.split(CIRCLED).map((piece, order) =>
    CIRCLED.test(piece) ? (
      <span className={markClassName} key={order}>
        {piece}
      </span>
    ) : (
      piece
    ),
  );
}

export default function EnglishPromptText({
  question,
  underlineClassName,
  markClassName,
}: {
  question: Pick<EnglishQuestion, "type" | "prompt">;
  underlineClassName?: string;
  markClassName?: string;
}) {
  const parts =
    question.type === "어법" ? splitEnglishUnderline(question.prompt) : null;
  if (!parts)
    return (
      <EnglishMarkedText text={question.prompt} markClassName={markClassName} />
    );
  return (
    <>
      {parts.map((part, order) =>
        part.underline ? (
          <u className={underlineClassName} key={order}>
            <EnglishMarkedText text={part.text} markClassName={markClassName} />
          </u>
        ) : (
          <span key={order}>
            <EnglishMarkedText text={part.text} markClassName={markClassName} />
          </span>
        ),
      )}
    </>
  );
}
