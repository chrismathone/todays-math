"""m3Func.ts 에 두 번 붙은 확장 블록 하나를 걷어낸다 (일회용)."""

from pathlib import Path

p = Path('src/lib/middle/m3Func.ts')
s = p.read_text('utf-8')

MARK = '  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────\n  // 이 소단원은 기존 8유형이'
first = s.index(MARK)
second = s.index(MARK, first + 1)

# 둘째 블록은 `];` 직전까지다 — 그 블록만 통째로 지운다.
end = s.index('\n];', second)
before = s[:second]
after = s[end + 1 :]
out = before + after

p.write_text(out, encoding='utf-8', newline='')
print(f'첫 블록 {first} · 둘째 블록 {second}~{end} 제거 · {len(s)} → {len(out)}자')
