#!/usr/bin/env bash
# 중2 기하 2B 물결(28유형) 변이 시험 — middleM2Geo.test.ts 가 가드인지 확인.
#
#   bash scripts/qa/mutate-m2-geo-marks.sh
#
# 순서 (2026-08-21 교훈: 파일이 바뀐 것과 **동작이 바뀐 것**은 다르다):
#   ⑴ 변이 적용 → 파일이 실제로 바뀌었나 (cmp)
#   ⑵ **산출물이 실제로 바뀌었나** (probe-m2-geo 출력을 기준과 대조)
#   ⑶ 그제서야 vitest — 빨개져야 가드다
#   ⑷ 바이트 그대로 복원 (md5 대조)
#
# §4-22: 도는 동안 표지를 **저장소 뿌리**에 남긴다. trap 으로 중단에도 복원.
set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MARKER="$ROOT/MUTATION-IN-PROGRESS.mutate-m2-geo-marks.txt"
TEST="src/__tests__/unit/middleM2Geo.test.ts"
TRI="$ROOT/src/lib/middle/m2GeoTri.ts"
QUAD="$ROOT/src/lib/middle/m2GeoQuad.ts"
SIM="$ROOT/src/lib/middle/m2GeoSim.ts"
WORK="$ROOT/.mutate-m2-geo-marks"

cd "$ROOT"
rm -rf "$WORK"
mkdir -p "$WORK"
cp "$TRI" "$WORK/tri.bak"
cp "$QUAD" "$WORK/quad.bak"
cp "$SIM" "$WORK/sim.bak"

cleanup() {
  [ -f "$WORK/tri.bak" ] && cp "$WORK/tri.bak" "$TRI"
  [ -f "$WORK/quad.bak" ] && cp "$WORK/quad.bak" "$QUAD"
  [ -f "$WORK/sim.bak" ] && cp "$WORK/sim.bak" "$SIM"
  rm -rf "$WORK"
  rm -f "$MARKER"
}
trap cleanup EXIT INT TERM

{
  echo "대상: src/lib/middle/m2GeoTri.ts · m2GeoQuad.ts · m2GeoSim.ts"
  echo "주인: mutate-m2-geo-marks.sh (세션 2B-v2마크)"
  echo "PID: $$   (살았나: kill -0 $$)"
  echo "시작: $(date '+%Y-%m-%d %H:%M:%S')"
} > "$MARKER"

md5() { python -c "import hashlib,sys;print(hashlib.md5(open(sys.argv[1],'rb').read()).hexdigest())" "$1"; }
TRI_MD5="$(md5 "$TRI")"
QUAD_MD5="$(md5 "$QUAD")"
SIM_MD5="$(md5 "$SIM")"

# 기준 산출물 — 변이가 «동작»을 바꿨는지 대조하는 자.
npx tsx scripts/qa/probe-m2-geo.ts > "$WORK/base.txt" 2>&1
echo "기준 산출물 $(wc -l < "$WORK/base.txt") 줄"

# 변이 적용 — 바이트로 읽고 바이트로 쓴다(CRLF 오염 금지). 치환 1회를 단정한다.
apply_mutation() { # $1=파일 $2=old $3=new
  OLD="$2" NEW="$3" python - "$1" <<'PYEOF'
import os, sys
path = sys.argv[1]
old = os.environ["OLD"].encode()
new = os.environ["NEW"].encode()
data = open(path, "rb").read()
if data.count(old) == 0 and b"\r\n" in data:
    old = old.replace(b"\n", b"\r\n")
    new = new.replace(b"\n", b"\r\n")
count = data.count(old)
if count != 1:
    print(f"MUTATION-ANCHOR-BAD count={count}")
    sys.exit(3)
open(path, "wb").write(data.replace(old, new, 1))
print("MUTATION-APPLIED")
PYEOF
}

restore() {
  cp "$WORK/tri.bak" "$TRI"
  cp "$WORK/quad.bak" "$QUAD"
  cp "$WORK/sim.bak" "$SIM"
  [ "$(md5 "$TRI")" = "$TRI_MD5" ] || { echo "복원 실패 (tri)"; exit 9; }
  [ "$(md5 "$QUAD")" = "$QUAD_MD5" ] || { echo "복원 실패 (quad)"; exit 9; }
  [ "$(md5 "$SIM")" = "$SIM_MD5" ] || { echo "복원 실패 (sim)"; exit 9; }
}

PASS=0; FAIL=0
verdict() { # $1=이름 $2=파일 $3=백업 $4=기대빨강문구
  local name="$1" file="$2" bak="$3" expect_red="$4" out code changed
  if cmp -s "$file" "$bak"; then
    echo "❌ 변이 $name 이 파일을 안 바꿨다"; FAIL=$((FAIL+1)); return
  fi
  npx tsx scripts/qa/probe-m2-geo.ts > "$WORK/mut.txt" 2>&1
  if cmp -s "$WORK/base.txt" "$WORK/mut.txt"; then
    echo "❌ 변이 $name 이 **산출물을 안 바꿨다** — 판정하지 않는다"
    FAIL=$((FAIL+1)); return
  fi
  changed="$(diff "$WORK/base.txt" "$WORK/mut.txt" | grep -c '^<' || true)"
  echo "──── 변이 $name (산출물 $changed 줄 변화) ────"
  out="$(npx vitest run "$TEST" 2>&1)"
  code=$?
  if [ $code -eq 0 ]; then
    echo "🟢 초록 ← 가드가 아니다 ($name)"
    FAIL=$((FAIL+1))
  elif echo "$out" | grep -q "$expect_red"; then
    echo "🔴 빨강 — 기대한 시험이 죽었다: $expect_red"
    PASS=$((PASS+1))
  else
    echo "🟡 빨강이지만 다른 시험이 죽었다 — 확인 필요"
    echo "$out" | grep -E "✕|×|FAIL" | head -4
    FAIL=$((FAIL+1))
  fi
}

# ── 변이 ① 삼각형 07 의 역산을 틀린다 (DE = CD + BE → +1) ───────────────
apply_mutation "$TRI" "      const x = p + q;" "      const x = p + q + 1;" || exit 3
verdict "① 07 역산 +1" "$TRI" "$WORK/tri.bak" "씨앗별 독립 검산"
restore

# ── 변이 ② 사각형 05 정사각형 넓이를 d²/2 → d² 로 ──────────────────────
apply_mutation "$QUAD" "      const x = (d * d) / 2;" "      const x = d * d;" || exit 3
verdict "② 05 넓이 두 배" "$QUAD" "$WORK/quad.bak" "씨앗별 독립 검산"
restore

# ── 변이 ③ 사각형 11 의 b(수직인 것)를 «이등분하는 것»으로 바꾼다 ──────
#    ⚠️ 처음에는 c 조건에서 `[3]`(이등분)을 빼 봤는데 **산출물이 안 바뀌었다** —
#       이 표에서는 «같고 수직»이면 반드시 «이등분»이라 그 항이 대수적으로
#       함의된다(2026-08-18 「죽은 조건」과 같은 자리). 하네스가 판정을 거부해
#       드러났고, 그 함의는 테스트가 따로 못 박았다.
apply_mutation "$QUAD" \
"      const b = idx.filter((i) => QUAD11_SHAPES[i]![2]).length;" \
"      const b = idx.filter((i) => QUAD11_SHAPES[i]![3]).length;" || exit 3
verdict "③ 11 «수직» 대신 «이등분»을 센다" "$QUAD" "$WORK/quad.bak" "씨앗별 독립 검산"
restore

# ── 변이 ④ 닮음 13 의 AH 를 기하평균 → 산술평균으로 ────────────────────
apply_mutation "$SIM" \
"        const ah = Math.round(Math.sqrt(bh * ch));" \
"        const ah = Math.round((bh + ch) / 2);" || exit 3
verdict "④ 13 기하평균 → 산술평균" "$SIM" "$WORK/sim.bak" "씨앗별 독립 검산"
restore

# ── 변이 ⑤ 평행선 09 의 가중평균에서 m·n 을 맞바꾼다 ───────────────────
apply_mutation "$SIM" \
"      const x = (n * p + m * q) / (m + n);" \
"      const x = (m * p + n * q) / (m + n);" || exit 3
verdict "⑤ 09 가중치 뒤바꿈" "$SIM" "$WORK/sim.bak" "씨앗별 독립 검산"
restore

# ── 변이 ⑥ **그림만** 어긋나게 — 사각형 08 의 윗변 치수 라벨을 +1 ──────
#    발문·정답은 그대로다. 「그림 따로 발문 따로」 가드가 이것만 잡는다.
apply_mutation "$QUAD" \
"            labels: { top: \`\${p} cm\`, bottom: \`\${q} cm\` }," \
"            labels: { top: \`\${p + 1} cm\`, bottom: \`\${q} cm\` }," || exit 3
verdict "⑥ 08 그림 치수만 어긋남" "$QUAD" "$WORK/quad.bak" "그림 라벨"
restore

echo ""
echo "═══ 변이 6개: 빨강 $PASS · 문제 $FAIL ═══"
[ $FAIL -eq 0 ] && [ $PASS -eq 6 ]
