"""「오각형뿔」·「칠각형기둥」·「오각형뿔대」를 고친다 (일회용).

`gonName(n)` 은 「오각형」을 낸다. 거기에 「뿔」·「기둥」을 이어 붙이면 «오각형뿔»
이 된다 — 값은 다 맞고 KaTeX 도 초록이라 어떤 판정기도 못 본다.
**발문을 찍어 눈으로 보고** 나왔다.
"""

from pathlib import Path

# ── m1Geo1 ────────────────────────────────────────────────
p1 = Path('src/lib/middle/m1Geo1.ts')
s1 = p1.read_text('utf-8')

# koNum·gonName 을 내보내 m1Geo2 가 같은 것을 쓰게 한다(두 벌 금지).
s1 = s1.replace('function koNum(n: number): string {', 'export function koNum(n: number): string {', 1)
s1 = s1.replace('function gonName(n: number): string {', 'export function gonName(n: number): string {', 1)

pairs = [
    ('${gonName(n)}뿔대', '${koNum(n)}각뿔대'),
    ('${gonName(n)}뿔', '${koNum(n)}각뿔'),
    ('${gonName(n)}기둥', '${koNum(n)}각기둥'),
]
for old, new in pairs:
    n = s1.count(old)
    if n:
        s1 = s1.replace(old, new)
        print(f'  m1Geo1 {old} → {new} : {n}건')
p1.write_text(s1, encoding='utf-8', newline='')

# ── m1Geo2 ────────────────────────────────────────────────
p2 = Path('src/lib/middle/m1Geo2.ts')
s2 = p2.read_text('utf-8')
old = '${gonName(n)}형'
n = s2.count(old)
assert n == 2, n
s2 = s2.replace(old, '${gonName(n)}')
# m1Geo1 의 것을 그대로 쓴다 — 한글 수사 표를 두 벌 두지 않는다.
imp = 'import { intBetween, pick } from "../elementary/rng";'
assert s2.count(imp) == 1
s2 = s2.replace(imp, imp + '\n\nimport { gonName } from "./m1Geo1";')
p2.write_text(s2, encoding='utf-8', newline='')
print(f'  m1Geo2 {old} → gonName(n) : {n}건 · import 추가')
print('ok')
