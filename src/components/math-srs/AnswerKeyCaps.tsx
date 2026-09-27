import type { HTMLAttributes } from "react";
import keys from "./answer-keys.module.css";
import { answerKey } from "./useAnswerKeys";

/**
 * 보기 번호 키 · ⏎ 키 (05 §8.18 · D-145 — 원장님 2026-09-28 «숫자 버튼을 키보드처럼» · «엔터로 제출 가능한 곳에 엔터키 모양»).
 *
 * 모양은 그 단추의 **실제 키**에서만 나온다 — 번호는 `answerKey`(단추의 `aria-keyshortcuts` 와 같은 함수),
 * ⏎ 는 `aria-keyshortcuts="Enter"` 단추 안에만 넣는다. 모양은 마우스가 주 포인터인 기기에서만 보인다(`answer-keys.module.css`).
 * 누르는 것은 단추라 키에는 커서 · 누름 모양이 없다(D-30).
 */

/** 보기 번호 — 키가 있는 번호(1~9)면 키 모양을 입고, 열째 보기부터는 지금 번호 그대로. 자리 · 크기는 화면의 `className`. */
export function NumberKey({
  index,
  className,
  ...rest
}: { index: number; className: string } & Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
>) {
  const key = answerKey(index);
  return (
    <span
      {...rest}
      className={key ? `${className} ${keys.number}` : className}
      data-answer-key={key}
    >
      {index + 1}
    </span>
  );
}

/** 확인 · 제출 단추 글자 뒤의 ⏎ 키. 화면 읽기는 단추의 `aria-keyshortcuts="Enter"` 가 알린다. */
export function EnterKey() {
  return (
    <kbd className={keys.enter} aria-hidden="true" data-answer-key="Enter">
      <svg viewBox="0 0 16 16" focusable="false">
        <path d="M13 3.5v4a2 2 0 0 1-2 2H3.5" />
        <path d="m6.5 6.5-3 3 3 3" />
      </svg>
    </kbd>
  );
}

/** 키가 보이는 기기에서 ⏎ 에게 자리를 내주는 화살표(초등 «정답 확인 →» · «완성했어요 →»). 폰에서는 지금 화살표 그대로. */
export function SwapArrow() {
  return (
    <span className={keys.swap} aria-hidden="true" data-answer-key-swap="">
      →
    </span>
  );
}
