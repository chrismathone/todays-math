#!/usr/bin/env bash
# 중2 수·확률 48유형 생성기(m2Rational·m2Counting·m2Prob)를 **망가뜨려**
# `middleM2NumProb.test.ts` 가 빨개지는지 본다 (1차 물결 브리프 계약 7).
#
# 🔴 판정 순서는 셋이다 (2026-08-20·21 교훈):
#    ⑴ 파일이 실제로 바뀌었나  ⑵ **산출물(문항)이 바뀌었나**  ⑶ 그제서야 시험
#    ⑵ 를 건너뛰면 「동작을 안 바꾸는 변이」가 «가드가 아니다»로 찍혀,
#    멀쩡한 시험을 의심하고 고치러 가게 된다. 그건 가드가 없는 것보다 나쁘다.
#
# 사용: bash scripts/qa/mutate-m2-numprob.sh
set -u

R=src/lib/middle/m2Rational.ts
C=src/lib/middle/m2Counting.ts
P=src/lib/middle/m2Prob.ts
TEST=src/__tests__/unit/middleM2NumProb.test.ts
PROBE=scripts/qa/probe-m2-numprob.ts

BR=$(mktemp); BC=$(mktemp); BP=$(mktemp)
cp "$R" "$BR"; cp "$C" "$BC"; cp "$P" "$BP"
restore() { cp "$BR" "$R"; cp "$BC" "$C"; cp "$BP" "$P"; }
trap restore EXIT

BEFORE=$(mktemp)
if ! npx tsx "$PROBE" > "$BEFORE" 2>&1; then
  echo "🔴 기준 산출물을 못 만들었다 — 하네스 중단"
  exit 1
fi

run() { # $1=이름 · $2=바뀐 파일
  local after; after=$(mktemp)
  if cmp -s "$2" "${!3}"; then
    echo "[$1] 🔴 **파일이 그대로다 — 치환이 안 먹었다.** 판정 안 함"
    restore; return
  fi
  if ! npx tsx "$PROBE" > "$after" 2>&1; then
    # 변이가 던지게 만들었다면 그것도 «동작이 바뀐 것»이다 — 시험으로 넘어간다
    :
  elif cmp -s "$BEFORE" "$after"; then
    echo "[$1] 🔴 **산출물이 그대로다 — 동작을 안 바꾸는 변이다.** 판정 안 함"
    restore; return
  fi
  local r
  r=$(npx vitest run "$TEST" 2>&1 | grep -oE "Tests +[0-9]+ failed" | head -1)
  echo "[$1] ${r:-🟢 전부 초록 ← 가드가 아니다}"
  restore
}

# ① 역산 수치 하나 틀림 — 순환소수→분수 되돌리기의 앞자리 몫을 어긋나게
python - "$R" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "  const num = r.int * den + whole;"
assert s.count(old) == 1, "앵커 없음"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "  const num = r.int * den + whole + 1; // 변이", 1))
PY
run "① 순환소수→분수 역산 +1" "$R" BR

# ② 답을 엉뚱한 키로 — 경우의 수 16 이 P 를 거치는 경로 대신 전체 경로를 답한다
python - "$C" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    const ans = c1 * c2;"
assert s.count(old) == 1, "앵커 없음"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "    const ans = comb(m + n, m); // 변이", 1))
PY
run "② 최단거리 답을 전체 경로로" "$C" BC

# ③ 검산식이 갈라 주는 자리 — 「다시 넣지 않는다」인데 분모를 안 줄인다
python - "$P" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        const p = red(b * (b - 1), n * (n - 1));"
assert s.count(old) == 1, "앵커 없음"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "        const p = red(b * b, n * n); // 변이", 1))
PY
run "③ 비복원 추출을 복원으로" "$P" BP

# ④ 유한소수 판정 뒤집기 — 2·5 벗기기에서 5를 빼먹는다
python - "$R" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "  while (m % 5 === 0) m /= 5;"
assert s.count(old) == 1, "앵커 없음"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "  // 변이: 5 벗기기 제거", 1))
PY
run "④ 유한소수 판정에서 5 빼먹기" "$R" BR

# ⑤ 순환마디 정규형 가드 끄기 — 99…9 순환마디(=정수)를 허용
python - "$R" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '  if (/^0+$/.test(r.cyc) || /^9+$/.test(r.cyc)) return false;'
assert s.count(old) == 1, "앵커 없음"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "  // 변이: 정규형 가드 제거", 1))
PY
run "⑤ 순환마디 정규형 가드 제거" "$R" BR

# ⑥ 그림과 발문이 어긋남 — 격자 스펙만 한 칸 크게 그린다
python - "$C" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "  for (let x = 0; x <= m; x += 1) {"
assert s.count(old) == 1, "앵커 없음"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "  for (let x = 0; x <= m + 1; x += 1) { // 변이", 1))
PY
run "⑥ 그림 격자만 한 칸 크게" "$C" BC

echo "완료 — 모든 변이 원복됨"
