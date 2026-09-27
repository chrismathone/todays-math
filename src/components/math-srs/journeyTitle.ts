/**
 * 진도판 칸 이름의 줄바꿈 자리 (D-142).
 *
 * 칸 글은 `word-break: keep-all` 이라 띄어쓰기에서만 줄을 바꾼다. 띄어쓰기 없는 긴 낱말은 폰 320 칸(글자 폭 약 53px)을
 * 넘으면 `overflow-wrap: anywhere` 가 글자 한가운데를 끊었다 — «연립일차방정 / 식»(운영에서도). 뜻이 갈리는 자리에만
 * `<wbr>` 을 둘 수 있게 이름을 조각으로 나눈다. 넓은 칸에서는 끊을 필요가 없으니 아무것도 안 바뀐다.
 * 글자는 한 자도 바꾸지 않는다 — 조각을 이으면 원래 이름이다. 판에 나올 수 있는 이름 전부를 시험이 잰다.
 */

// 합성어의 뒷말 — 앞에 한글이 두 자 이상 붙어 있을 때만 그 앞에서 끊는다(«연립|일차방정식» · «이등변|삼각형의»).
const TAILS = ["일차방정식", "삼각형", "사변형", "그래프", "도형", "해결"];

export function titlePieces(title: string): string[] {
  const cuts = new Set<number>();
  for (let i = 1; i < title.length; i++) {
    const before = title[i - 1];
    const next = title[i];
    if (next === " " || before === " ") continue;
    // 가운뎃점 · 곱셈 · 나눗셈 기호 뒤, 여는 괄호 앞(«유리수·|순환소수와» · «(자연수)÷|(자연수)의» · «알아보기|(1)»).
    if (before === "·" || before === "×" || before === "÷" || next === "(")
      cuts.add(i);
  }
  for (const tail of TAILS)
    for (
      let at = title.indexOf(tail, 2);
      at >= 2;
      at = title.indexOf(tail, at + 1)
    )
      if (/[가-힣]{2}$/.test(title.slice(0, at))) cuts.add(at);
  const points = [...cuts].sort((a, b) => a - b);
  return [0, ...points].map((start, index) =>
    title.slice(start, points[index] ?? title.length),
  );
}
