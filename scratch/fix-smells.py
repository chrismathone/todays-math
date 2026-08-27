"""m2Func.ts 확장 유형의 «이중 부호(+-)» 다섯 자리를 고친다 (일회용).

값 검산은 다섯 다 초록이었다 — 값이 맞고 KaTeX 도 초록이라 구조적으로 못 본다.
`scripts/qa/probe-middle-page-smells.ts` 가 잡았다(CLAUDE.md 2026-08-24).
"""

from pathlib import Path

path = Path('src/lib/middle/m2Func.ts')
src = path.read_text('utf-8')


def sub(old: str, new: str, why: str) -> None:
    global src
    assert src.count(old) == 1, (why, src.count(old))
    src = src.replace(old, new)


# ── 헬퍼 둘을 더한다 ─────────────────────────────────────
HELPER = r'''
/**
 * 앞 항에 이어 붙이는 항 — `+3` / `-3`. **이중 부호(`+-`)를 막는다.**
 *
 * 값 검산은 이 부류를 구조적으로 못 본다(값도 KaTeX 도 맞다).
 * `scripts/qa/probe-middle-page-smells.ts` 가 지면을 따로 센다.
 */
function addend(v: number): string {
  return v >= 0 ? `+${v}` : `${v}`;
}

/** `3a` 꼴 — 계수 1·-1 을 `a`·`-a` 로. 앞에 오는 항에 쓴다. */
function coef(v: number, name: string): string {
  if (v === 1) return name;
  if (v === -1) return `-${name}`;
  return `${v}${name}`;
}

/** 이어 붙이는 `+3a` 꼴 — 계수 1·-1 과 부호를 같이 다듬는다. */
function addCoef(v: number, name: string): string {
  return v >= 0 ? `+${coef(v, name)}` : coef(v, name);
}
'''
sub(
    '/** `mx+b` 꼴 (b=0 이면 mx). */',
    HELPER.strip() + '\n\n/** `mx+b` 꼴 (b=0 이면 mx). */',
    'helper',
)

# ── ⑴75 함숫값의 차 ─────────────────────────────────────
sub(
    '$f(${q})=${e}$이므로 $f(${r})=${e}+${a}\\\\times(${r}-(${q}))=${ans}$이다.',
    '$f(${q})=${e}$이므로 $f(${r})=${e}${a >= 0 ? `+${a}` : `-${-a}`}\\\\times(${r}-(${q}))=${ans}$이다.',
    '⑴75',
)

# ── ⑵78 평행이동한 그래프의 y절편 ────────────────────────
sub(
    '평행이동하면 식은 $y=${mono(m)}+${b}${k > 0 ? `+${k}` : `${k}`}$가 된다.',
    '평행이동하면 식은 $y=${mono(m)}${addend(b)}${addend(k)}$가 된다.',
    '⑵78 식',
)
sub(
    '따라서 $y$절편은 $${b}${k > 0 ? `+${k}` : `${k}`}=${ans}$이다.',
    '따라서 $y$절편은 $${b}${addend(k)}=${ans}$이다.',
    '⑵78 절편',
)

# ── ⑵80 평행이동해 일치할 조건 ──────────────────────────
sub(
    '평행이동한 그래프의 식은 $y=${mono(m)}+${b}+k$이다.',
    '평행이동한 그래프의 식은 $y=${mono(m)}${addend(b)}+k$이다.',
    '⑵80 식',
)
sub(
    '두 그래프가 일치하려면 $y$절편이 같아야 하므로 $${b}+k=${c}$이다.',
    '두 그래프가 일치하려면 $y$절편이 같아야 하므로 $${b}+k=${c}$이다.'.replace(
        '$${b}+k=${c}$', '$${b}+k=${c}$'
    ),
    '⑵80 절편(그대로 — b 뒤의 +k 는 상수라 이중 부호가 안 난다)',
)

# ── 관계73 두 상수의 곱 ─────────────────────────────────
sub(
    '$ax+y=${c1}$에 대입하면 $${p}a+${q}=${c1}$이므로 $a=${a}$이다.',
    '$ax+y=${c1}$에 대입하면 $${coef(p, "a")}${addend(q)}=${c1}$이므로 $a=${a}$이다.',
    '관계73 첫 식',
)
sub(
    '$x+by=${c2}$에 대입하면 $${p}+${q}b=${c2}$이므로 $b=${b}$이다.',
    '$x+by=${c2}$에 대입하면 $${p}${addCoef(q, "b")}=${c2}$이므로 $b=${b}$이다.',
    '관계73 둘째 식',
)

# ── 관계74 일차방정식의 기울기 — 분수 항을 아예 안 쓴다 ──
sub(
    '''          solution: `$y$에 대하여 풀면 $${bb === 1 ? "" : bb === -1 ? "-" : bb}y=${-a === 1 ? "x" : -a === -1 ? "-x" : `${-a}x`}${-c > 0 ? `+${-c}` : `${-c}`}$이다.\\n양변을 $${bb}$로 나누면 $y=${mono(m)}${-c / bb > 0 ? "+" : ""}${-c / bb === 0 ? "" : fracTex(-c, bb)}$이므로 기울기는 $${m}$이다.`,''',
    '''          solution: `$y$에 대하여 풀면 $${coef(bb, "y")}=${coef(-a, "x")}${addend(-c)}$이다.\\n양변을 $${bb}$로 나누면 $x$의 계수는 $\\\\dfrac{${-a}}{${bb}}=${m}$이므로 기울기는 $${m}$이다.`,''',
    '관계74 해설',
)

# ── 관계70 — `1x` 가 나올 수 있는 자리 ───────────────────
sub(
    '$${linear(m1, b1)}=${linear(m2, b2)}$에서 $${m1 - m2}x=${b2 - b1}$이므로',
    '$${linear(m1, b1)}=${linear(m2, b2)}$에서 $${coef(m1 - m2, "x")}=${b2 - b1}$이므로',
    '관계70 계수',
)

path.write_text(src, encoding='utf-8', newline='')
print('ok')
