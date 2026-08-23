#!/usr/bin/env bash
# 물결 2D 변이 시험 — `middleRealScene.test.ts` 의 가드가 **정말 가드인지** 본다.
#
# 순서가 중요하다 (CLAUDE.md 2026-08-20·21 교훈):
#   ⑴ 파일이 실제로 바뀌었나   — 안 바뀌었으면 판정을 거부하고 멈춘다
#   ⑵ **산출물이 바뀌었나**    — 파일만 바뀌고 동작이 그대로면 「초록 ← 가드가 아니다」가
#                                거짓말이 된다. 멀쩡한 가드를 고치러 가게 된다.
#   ⑶ 그제서야 시험이 빨개지나
#
# 사용: bash scripts/qa/mutate-real-scene.sh
# 주의: 도는 동안 대상 파일을 편집하지 말 것 — 원복이 그 편집을 덮는다.
set -uo pipefail
cd "$(dirname "$0")/../.."

TEST=src/__tests__/unit/middleRealScene.test.ts
PROBE=scripts/qa/dump-real-scene.ts
# 저장소 안에 잡는다 — MSYS 의 `/c/...` 경로는 윈도우 파이썬이 못 연다
# (첫 판이 여기서 «변이 적용 실패» 로 전부 판정 거부됐다).
TMP="$(mktemp -d -p . .mutate-XXXXXX)"

TARGETS=(
  src/lib/middle/m1Real.ts
  src/lib/middle/m2Real.ts
  src/lib/middle/realScene.ts
)

restore() {
  # 기준을 명시한다 — `git checkout -- <파일>` 은 인덱스에서 되살려,
  # 다른 세션이 인덱스를 건드렸으면 남의 것을 확정한다 (2026-08-18 교훈).
  git checkout HEAD -- "${TARGETS[@]}"
}
trap 'restore; rm -rf "$TMP"' EXIT

dump() { npx tsx "$PROBE" >"$1" 2>&1; }

echo "── 기준 산출물 채집"
restore
dump "$TMP/base.json" || { echo "기준 채집 실패"; head -20 "$TMP/base.json"; exit 1; }

# run_mutation <이름> <파일> <파이썬 조각>
#   파이썬 조각은 문자열 `s` 를 고친다. 못 고치면 assert 로 죽는다.
run_mutation() {
  local name="$1" file="$2" py="$3"
  restore
  cp "$file" "$TMP/before.ts"
  printf '%s\n' "$py" >"$TMP/mut.py"
  if ! MUT_FILE="$file" python -c "
import io, os, runpy
p = os.environ['MUT_FILE']
s = io.open(p, encoding='utf-8').read()
g = {'s': s}
exec(open('$TMP/mut.py', encoding='utf-8').read(), g)
io.open(p, 'w', encoding='utf-8', newline='\n').write(g['s'])
"; then
    echo "⛔ $name — 변이가 적용되지 않았습니다 (판정 안 함)"
    return
  fi
  if cmp -s "$TMP/before.ts" "$file"; then
    echo "⛔ $name — 파일이 안 바뀌었습니다 (판정 안 함)"
    return
  fi
  dump "$TMP/after.json"
  if cmp -s "$TMP/base.json" "$TMP/after.json"; then
    echo "⛔ $name — 파일은 바뀌었는데 **산출물이 그대로**입니다 (판정 안 함)"
    return
  fi
  if npx vitest run "$TEST" >"$TMP/out.txt" 2>&1; then
    echo "🟢 $name — 초록. 시험이 이 자리를 안 가른다."
  else
    echo "🔴 $name — 빨강 ($(grep -cE '^ *×' "$TMP/out.txt")건 실패)"
  fi
}

# ⓪ **하네스 자체 시험** — 주석만 고친 «무효 변이»다. 파일은 바뀌지만 산출물은
#    그대로여야 하고, 하네스는 여기서 ⛔ 로 판정을 거부해야 한다. 이게 🔴/🟢 로
#    나오면 하네스가 거짓 판정을 내고 있는 것이다 (2026-08-21 교훈).
run_mutation "⓪ 하네스 자체 시험 (무효 변이 — ⛔ 가 정답)" src/lib/middle/m1Real.ts '
old = "// ── 유형 ───"
assert s.count(old) == 1, s.count(old)
s = s.replace(old, "// (하네스 자체 시험용 주석)" + chr(10) + old)
'

# ① 역산 수치 하나 틀림 — 다리 길이를 10 m 늘린다 (독립 검산이 갈라야 한다)
run_mutation "① 역산: 다리 길이 +10" src/lib/middle/m1Real.ts '
old = "const bridgeLen = speed * t - trainLen;"
assert s.count(old) == 1, s.count(old)
s = s.replace(old, "const bridgeLen = speed * t - trainLen + 10;")
'

# ② 답을 엉뚱한 키로 — 원뿔 유형의 답을 t 대신 rate 로
run_mutation "② 답 ↔ facts: t 대신 rate" src/lib/middle/m1Real.ts '
old = "answer: `$${t}$분`,"
assert s.count(old) == 1, s.count(old)
s = s.replace(old, "answer: `$${rate}$분`,")
'

# ③ 그림 라벨이 발문과 갈라진다 — 터널 길이만 그림에서 100 m 크게 적는다
run_mutation "③ 그림 ↔ 발문: 터널 라벨 +100" src/lib/middle/m1Real.ts '
old = "        `${tunnelLen} m`,"
assert s.count(old) == 1, s.count(old)
s = s.replace(old, "        `${tunnelLen + 100} m`,")
'

# ④ 닮음 그림이 닮음을 어긴다 — 사람 그림자만 1.5배로 늘인다(광선이 안 평행해진다)
run_mutation "④ 축척: 사람 그림자만 1.5배" src/lib/middle/realScene.ts '
old = "personTopX + m.personShadow * k"
assert s.count(old) >= 2, s.count(old)
s = s.replace(old, "personTopX + m.personShadow * k * 1.5")
'

# ⑤ 중단원명의 얇은 공백을 보통 공백으로 — 색인 정본 대조가 갈라야 한다
run_mutation "⑤ 정본: U+2009 를 보통 공백으로" src/lib/middle/m2Real.ts '
old = chr(92) + "u2009"
assert s.count(old) == 1, s.count(old)
s = s.replace(old, " ")
'

# ⑥ 지어낸 에셋 이름 — manifest 대조와 실렌더가 갈라야 한다
run_mutation "⑥ 에셋: water-tank → watertank" src/lib/middle/m2Real.ts '
q = chr(34)
old = q + "water-tank" + q
assert s.count(old) >= 4, s.count(old)
s = s.replace(old, q + "watertank" + q)
'

# ⑦ 그림을 아예 빼 버린다 — 「그림이 없다」를 잡아야 한다
run_mutation "⑦ 그림 없음: figureSpec 을 null 로" src/lib/middle/m2Real.ts '
old = "figureSpec: walkTowardScene(dist, speedA, speedB),"
assert s.count(old) == 1, s.count(old)
s = s.replace(old, "figureSpec: null,")
'

echo "── 원복"
restore
git status --short "${TARGETS[@]}"
echo "(위가 비어 있으면 원복 완료)"
