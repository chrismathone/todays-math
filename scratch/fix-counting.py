"""경우의 수 확장 유형의 두 자리를 고친다 (일회용).

⑴ 「서로 다른 $1$개의 동전」 — 하나뿐인데 «서로 다른» 은 말이 안 된다.
⑵ 유형 72 의 제목이 「4의 배수」로 굳어 있는데 발문의 배수는 $3$·$4$·$5$ 로 변한다 —
   **제목이 발문과 어긋나면 유형 색인이 거짓말을 한다.**
"""

from pathlib import Path

p = Path('src/lib/middle/m2Counting.ts')
s = p.read_text('utf-8')


def sub(old: str, new: str, why: str) -> None:
    global s
    assert s.count(old) == 1, (why, s.count(old))
    s = s.replace(old, new)


sub(
    '    const coins = intBetween(rng, 1, 4);\n    const dice = intBetween(rng, 1, 2);',
    '    const coins = intBetween(rng, 2, 4); // 「서로 다른 1개」는 말이 안 된다\n    const dice = intBetween(rng, 1, 2);',
    '동전 개수',
)
sub(
    '`서로 다른 $${coins}$개의 동전과 서로 다른 $${dice}$개의 주사위를 동시에 던질 때, 일어나는 모든 경우의 수를 구하시오.`',
    '`서로 다른 $${coins}$개의 동전과 ${dice > 1 ? "서로 다른 " : ""}$${dice}$개의 주사위를 동시에 던질 때, 일어나는 모든 경우의 수를 구하시오.`',
    '주사위 조사',
)
sub(
    '"두 주사위의 눈의 수의 합이 4의 배수인 경우의 수"',
    '"두 주사위의 눈의 수의 합이 배수인 경우의 수"',
    '제목',
)

p.write_text(s, encoding='utf-8', newline='')
print('ok')
