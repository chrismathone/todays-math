"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * 보기 번호 = 키보드 숫자 · 엔터 = 확인 단추 (원장님 2026-09-28 «1,2,3,4 를 눌러도 정답 입력 · 엔터로 제출»).
 *
 * 키는 `scope` 안에서 **`aria-keyshortcuts` 가 그 키인 단추를 누른다**(`click()`). 그래서
 * - 화면 읽기가 알리는 키와 실제 동작이 한 곳(단추의 표지)에서 나온다.
 * - «그 단추를 누른 것과 똑같이» — 꺼진 단추는 눌리지 않는다(`click()` 은 disabled 단추에서 아무 일도 안 한다).
 *   하나 고르기의 즉시 제출 · 복수 선택의 켜고 끔 · 정의 조립의 다음 빈칸 · 채점 연출 중 잠금은 단추가 이미 지킨다.
 *
 * 가로채지 않는 때: 입력 칸(글자 · 여러 줄 · 편집 영역 · MathLive 수식 칸) · Ctrl/Alt/Meta/Shift 조합 · 누르고 있는 반복 ·
 * IME 조합 중 · 다른 처리기가 이미 막은 키 · `scope` 밖의 대화상자가 열려 있을 때(뒤 화면은 키를 먹지 않는다).
 *
 * 엔터와 포커스: 포커스된 단추에서 친 엔터는 브라우저가 그 단추를 누른다 — 두 번 겹치지 않게 그대로 둔다.
 * 다만 **보기 · 칠한 칸(누름 단추 `aria-pressed` — 켜졌든 꺼졌든)** 에 포커스가 남아 있을 때는(마우스로 누르면 포커스가
 * 거기 남는다) 엔터가 그 칸을 켜고 끄지 말고 확인 단추가 되게 막는다 — 화면에 확인 단추가 있을 때만(꺼져 있으면 아무 일
 * 없음). 켜고 끄기는 스페이스 · 숫자키가 한다. D-145 ⑸(리드 · codex · grok 2:1).
 *
 * `useLayoutEffect` 인 까닭: 보기가 보이는 커밋과 **같은 순간**에 키가 살아 있어야 한다. `useEffect` 는 커밋 뒤 다음
 * 작업으로 밀려, 부하가 크면 보기는 보이는데 키가 안 먹는 틈이 생겼다(관련 시험 묶음에서 세 번에 한 번 — 중등 복습 첫 키).
 */
export function useAnswerKeys(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const root = scope.current;
      if (!root || event.defaultPrevented) return;
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey)
        return;
      // 일부 IME 는 조합을 끝내는 키를 keyCode 229 로만 알린다.
      if (event.repeat || event.isComposing || event.keyCode === 229) return;
      const key =
        event.key === "Enter"
          ? "Enter"
          : /^[1-9]$/.test(event.key)
            ? event.key
            : null;
      if (!key || coveredByDialog(root)) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(EDITABLE)) return;
      const button = root.querySelector<HTMLButtonElement>(
        `button[aria-keyshortcuts="${key}"]`,
      );
      if (key === "Enter" && target?.closest(ACTIVATABLE)) {
        const toggle = target.closest("button[aria-pressed]");
        if (!button || !toggle || !root.contains(toggle)) return;
        event.preventDefault();
      }
      if (!button || button.disabled) return;
      event.preventDefault();
      button.click();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [scope]);
}

/** 보기 `index`(0부터)의 번호 키 — 1~9 만. 열째 보기부터는 키가 없다. */
export function answerKey(index: number) {
  return index < 9 ? String(index + 1) : undefined;
}

const EDITABLE =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), math-field';
const ACTIVATABLE =
  'button, a[href], summary, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"]';

/** 열린 대화상자 가운데 `root` 를 품지 않은 것이 있으면 그 대화상자가 앞에 있다. */
function coveredByDialog(root: HTMLElement) {
  return Array.from(
    document.querySelectorAll('dialog[open], [aria-modal="true"]'),
  ).some((dialog) => !dialog.contains(root));
}
