/**
 * 정답 · 오답 연출(`AnswerFeedbackEffect`)이 **새로 붙는 순간**을 잡는다 — 누르기 **전에** 걸어 둘 것.
 *
 *   const effect = effectAppears();
 *   await user.click(choice);
 *   expect(await effect).toHaveTextContent("다시 풀 문제로 모았어요");
 *
 * 🔴 왜 있나: 복습 화면의 연출은 1.2초 뒤 사라진다(`StudentMathSrs.tsx` 타이머 · 오답 다시 풀기도 같다).
 *    `await user.click(...)` 이 끝난 **뒤에** `findByText`/`findByRole` 를 시작하면, 다른 세션 부하로 클릭 await 가
 *    1.2초를 넘길 때 연출이 이미 사라져 화면이 다음 문제다(2026-09-27 main 에서 콤보 시험이 한 번 빨강 — 실패
 *    순간 «4/12»). 클릭 뒤 1.5초 늦게 이어지게 넣으면 옛 방식은 반드시 놓치고 이 방식은 잡는다(20번 교훈 참고).
 *    `fireEvent.click` 처럼 **동기**로 누르고 곧바로 `findBy*` 를 부르는 시험은 관찰이 먼저 걸리므로 이 경주가 없다.
 *
 * - DOM 이 바뀔 때마다 보는 MutationObserver — React 는 연출을 통째로 한 번에 붙이므로 붙는 순간의 글이 최종 글이다.
 * - 역할(status)이 아니라 연출 표지(`data-answer-feedback`)로 찾는다 — 불러오는 중 · 확인 중 표시도 role=status 다.
 * - 부를 때 이미 떠 있는 연출은 건너뛰고 **그 뒤에 새로 붙는 것**만 잡는다(앞 문제 연출을 잘못 잡지 않게).
 * - RTL `waitFor`/`findBy*` 를 쓰지 않은 것은 `user.click` 의 act 와 겹치지 않게 하려는 것이다.
 */
export function effectAppears(timeout = 5000): Promise<HTMLElement> {
  const all = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>("[data-answer-feedback]"),
    );
  const before = new Set(all());
  const fresh = () => all().find((el) => !before.has(el));
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const found = fresh();
      if (!found) return;
      observer.disconnect();
      clearTimeout(timer);
      resolve(found);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`정답 연출이 ${timeout}ms 안에 새로 뜨지 않았다`));
    }, timeout);
  });
}
