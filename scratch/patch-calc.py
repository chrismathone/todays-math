"""m1Calc.ts 에 「유리수의 곱셈」 확장 유형 4개를 붙인다 (일회용).

이 소단원은 기존 6유형이 연산1·응용3·심화2 라 **기본이 하나도 없다.**
시험지 배분(1:4:4:1)에서 기본이 넷 필요하므로 새 넷을 전부 기본으로 낸다.

유리수는 이 파일의 `q`·`mulQ`·`texQ`·`fq` 를 그대로 쓴다 — 분수를 새로 짓지
않는다(「여기 말고 다른 곳에서 Q 를 짓지 않는다」는 그 파일의 규칙).
"""

from pathlib import Path

BLOCK = r'''
  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 이 중단원을 27 까지만 담는다. 색인에 없는 유형을 지어야 하므로
  // 번호를 갈래마다 나눠 쓴다 — 갈래 C 는 70번대.

  def(
    "70",
    "세 유리수의 곱",
    SEC.곱,
    "기본",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const a = q(intBetween(rng, -9, 9));
        const b = q(intBetween(rng, -9, 9));
        const c = q(intBetween(rng, -9, 9));
        if (a.n === 0 || b.n === 0 || c.n === 0) return null;
        const S = mulQ(mulQ(a, b), c);
        if (!nice(S)) return null;
        const negs = [a, b, c].filter((v) => v.n < 0).length;
        return {
          content: `다음을 계산하시오.\n$${texSigned(a)}\\times${texSigned(b)}\\times${texSigned(c)}$`,
          answer: `$${texQ(S)}$`,
          solution: `음수가 $${negs}$개이므로 곱의 부호는 ${negs % 2 === 0 ? "양" : "음"}수이다.\n절댓값의 곱은 $${Math.abs(a.n)}\\times${Math.abs(b.n)}\\times${Math.abs(c.n)}=${Math.abs(S.n)}$이다.\n따라서 $${texQ(S)}$이다.`,
          facts: {
            ...fq("a", a),
            ...fq("b", b),
            ...fq("c", c),
            ...fq("S", S),
            negs,
          },
        };
      }),
  ),

  def(
    "71",
    "두 분수의 곱",
    SEC.곱,
    "기본",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const a = randFrac(rng, [2, 3, 4, 5, 6], 9);
        const b = randFrac(rng, [2, 3, 4, 5, 6], 9);
        if (a.n === 0 || b.n === 0) return null;
        const S = mulQ(a, b);
        if (!nice(S) || S.d === 1) return null;
        return {
          content: `다음을 계산하시오.\n$${texSigned(a)}\\times${texSigned(b)}$`,
          answer: `$${texQ(S)}$`,
          solution: `분자는 분자끼리, 분모는 분모끼리 곱한다.\n$${texSigned(a)}\\times${texSigned(b)}=${texRawFrac(a.n * b.n, a.d * b.d)}=${texQ(S)}$이다.`,
          facts: { ...fq("a", a), ...fq("b", b), ...fq("S", S) },
        };
      }),
  ),

  def(
    "72",
    "역수 구하기",
    SEC.곱,
    "기본",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const a = randFrac(rng, [2, 3, 4, 5, 7], 9);
        if (a.n === 0 || Math.abs(a.n) === a.d) return null;
        const inv = q(a.d * (a.n < 0 ? -1 : 1), Math.abs(a.n));
        if (!nice(inv)) return null;
        return {
          content: `$${texQ(a)}$의 역수를 구하시오.`,
          answer: `$${texQ(inv)}$`,
          solution: `두 수의 곱이 $1$이 되는 수가 역수이므로 분자와 분모를 바꾸어 쓴다. 부호는 그대로 둔다.\n따라서 $${texQ(a)}$의 역수는 $${texQ(inv)}$이다.`,
          facts: { ...fq("a", a), ...fq("inv", inv) },
        };
      }),
  ),

  def(
    "73",
    "곱이 주어질 때 빠진 수 구하기",
    SEC.곱,
    "기본",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const a = randFrac(rng, [2, 3, 4, 5], 9);
        const x = randFrac(rng, [2, 3, 4, 5], 9);
        if (a.n === 0 || x.n === 0) return null;
        const S = mulQ(a, x);
        if (!nice(S) || !nice(x)) return null;
        return {
          content: `$${texSigned(a)}\\times\\square=${texQ(S)}$일 때, $\\square$에 알맞은 수를 구하시오.`,
          answer: `$${texQ(x)}$`,
          solution: `$\\square$는 $${texQ(S)}$를 $${texQ(a)}$로 나눈 값이므로 $${texQ(a)}$의 역수를 곱한다.\n따라서 $\\square=${texQ(x)}$이다.`,
          facts: { ...fq("a", a), ...fq("x", x), ...fq("S", S) },
        };
      }),
  ),
'''

path = Path('src/lib/middle/m1Calc.ts')
src = path.read_text('utf-8')
# 배열 맨 끝(마지막 `];`)에 붙인다.
assert src.rstrip().endswith('];')
src = src.rstrip()
src = src[: -len('];')] + BLOCK + '];\n'
path.write_text(src, encoding='utf-8', newline='')
print('ok')
