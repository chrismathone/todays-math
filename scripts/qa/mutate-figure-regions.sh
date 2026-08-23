#!/usr/bin/env bash
# FigureSpec v2 regions·arcs 가드 변이 시험 — figureRegions.test.ts 가 가드인지 확인.
#
#   bash scripts/qa/mutate-figure-regions.sh
#
# 순서 (2026-08-21 교훈: 파일이 바뀐 것과 **동작이 바뀐 것**은 다르다):
#   ⑴ 변이 적용 → 파일이 실제로 바뀌었나 (cmp)
#   ⑵ 동작이 실제로 바뀌었나 (가드가 막던 입력을 직접 넣어 본다)
#   ⑶ 그제서야 vitest — 빨개져야 가드다
#   ⑷ 바이트 그대로 복원 (md5 대조)
#
# §4-22: 도는 동안 표지를 **저장소 뿌리**에 남긴다. trap 으로 중단에도 복원.
set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET="$ROOT/vendor/figure-engine/core/figure_scene.py"
BACKUP="$TARGET.mutbak"
MARKER="$ROOT/MUTATION-IN-PROGRESS.mutate-figure-regions.txt"
TEST="src/__tests__/unit/figureRegions.test.ts"

cd "$ROOT"
cp "$TARGET" "$BACKUP"

cleanup() {
  if [ -f "$BACKUP" ]; then
    cp "$BACKUP" "$TARGET"
    rm -f "$BACKUP"
  fi
  rm -f "$MARKER"
}
trap cleanup EXIT INT TERM

{
  echo "대상: vendor/figure-engine/core/figure_scene.py"
  echo "주인: mutate-figure-regions.sh (세션 v2-채색)"
  echo "PID: $$   (살았나: kill -0 $$)"
  echo "시작: $(date '+%Y-%m-%d %H:%M:%S')"
} > "$MARKER"

md5() { python -c "import hashlib,sys;print(hashlib.md5(open(sys.argv[1],'rb').read()).hexdigest())" "$1"; }
BASE_MD5="$(md5 "$TARGET")"

# 변이 적용 — 바이트로 읽고 바이트로 쓴다(CRLF 오염 금지). 치환 1회를 단정한다.
apply_mutation() { # $1=old $2=new
  OLD="$1" NEW="$2" python - "$TARGET" <<'PYEOF'
import os, sys
path = sys.argv[1]
old = os.environ["OLD"].encode()
new = os.environ["NEW"].encode()
data = open(path, "rb").read()
if data.count(old) == 0 and b"\r\n" in data:
    # 대상 파일이 CRLF 면 앵커의 LF 도 맞춰 준다 (바이트 그대로 치환).
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

# 동작 확인 — 가드가 막던 스펙을 렌더해 본다. 성공하면 «가드가 꺼졌다».
behavior_probe() { # $1=probe-name  → stdout: BLOCKED | RENDERED | SWEEP=<flags>
  PROBE="$1" python - <<'PYEOF'
import json, os, sys
sys.path.insert(0, os.path.join(os.getcwd(), "vendor", "figure-engine"))
from core.figure_scene import render_figure_spec, FigureSpecError, GeometryValidationError

base = {
    "version": 2,
    "points": {
        "O": [0, 200],
        "Ain": {"type": "on_circle", "circle": "cin", "angle": 45},
        "Aout": {"type": "on_circle", "circle": "cout", "angle": 45},
        "Bin": {"type": "on_circle", "circle": "cin", "angle": 0},
        "Bout": {"type": "on_circle", "circle": "cout", "angle": 0},
    },
    "circles": {
        "cin": {"center": "O", "radius": 80, "draw": False},
        "cout": {"center": "O", "radius": 160, "draw": False},
    },
    "segments": {"sA": ["O", "Aout"], "sB": ["O", "Bout"]},
    "regions": {"ring": {"boundary": [
        {"seg": ["Ain", "Aout"]},
        {"arc": {"circle": "cout", "from": "Aout", "to": "Bout", "dir": "cw"}},
        {"seg": ["Bout", "Bin"]},
        {"arc": {"circle": "cin", "from": "Bin", "to": "Ain", "dir": "ccw"}},
    ], "fill": "#f5d9b8"}},
}
probe = os.environ["PROBE"]
if probe == "chain":
    base["regions"]["ring"]["boundary"].pop()
elif probe == "dark":
    base["regions"]["ring"]["fill"] = "#808080"
elif probe == "offcircle":
    base["points"]["Bad"] = [57, 143]
    base["arcs"] = {"a": {"circle": "cin", "from": "Bin", "to": "Bad", "dir": "ccw"}}
elif probe == "sweep":
    spec = {
        "version": 2,
        "points": {"O": [0, 0],
                   "P": {"type": "on_circle", "circle": "c", "angle": 0},
                   "Q": {"type": "on_circle", "circle": "c", "angle": 90}},
        "circles": {"c": {"center": "O", "radius": 60, "draw": False}},
        "segments": {"OP": ["O", "P"], "OQ": ["O", "Q"]},
        "arcs": {"a": {"circle": "c", "from": "P", "to": "Q", "dir": "ccw"}},
    }
    svg = render_figure_spec(spec)
    import re
    m = re.search(r"A 60 60 0 (\d) (\d) ", svg)
    print(f"SWEEP={m.group(1)}{m.group(2)}" if m else "SWEEP=?")
    sys.exit(0)
else:
    print("PROBE-UNKNOWN"); sys.exit(3)
try:
    render_figure_spec(base)
    print("RENDERED")
except (FigureSpecError, GeometryValidationError):
    print("BLOCKED")
PYEOF
}

run_test() { npx vitest run "$TEST" 2>&1; }

PASS=0; FAIL=0
verdict() { # $1=이름 $2=기대빨강테스트문구
  local name="$1" expect_red="$2"
  echo "──── 변이 $name ────"
  out="$(run_test)"
  code=$?
  if [ $code -eq 0 ]; then
    echo "🟢 초록 ← 가드가 아니다 ($name)"
    FAIL=$((FAIL+1))
  else
    if echo "$out" | grep -q "$expect_red"; then
      echo "🔴 빨강 — 기대한 시험이 죽었다: $expect_red"
      PASS=$((PASS+1))
    else
      echo "🟡 빨강이지만 다른 시험이 죽었다 — 확인 필요"
      echo "$out" | grep -E "✕|×|FAIL" | head -5
      FAIL=$((FAIL+1))
    fi
  fi
}

restore() {
  cp "$BACKUP" "$TARGET"
  [ "$(md5 "$TARGET")" = "$BASE_MD5" ] || { echo "복원 실패!"; exit 9; }
}

# ── 변이 ① 닫힘 검사 무력화 ─────────────────────────────────────────────
apply_mutation "                if piece.end != following.start:" \
               "                if False and piece.end != following.start:" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ① 이 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe chain | tail -1)"
[ "$b" = "RENDERED" ] || { echo "변이 ① 이 동작을 안 바꿨다 (probe=$b) — 판정하지 않는다"; exit 3; }
verdict "① 닫힘 검사 끔" "조각이 이어지지 않으면 던진다"
restore

# ── 변이 ② 휘도 게이트 무력화 ───────────────────────────────────────────
apply_mutation "    if luminance < REGION_MIN_LUMINANCE:" \
               "    if False and luminance < REGION_MIN_LUMINANCE:" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ② 가 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe dark | tail -1)"
[ "$b" = "RENDERED" ] || { echo "변이 ② 가 동작을 안 바꿨다 (probe=$b) — 판정하지 않는다"; exit 3; }
verdict "② 휘도 게이트 끔" "어두운 채색은 거부한다"
restore

# ── 변이 ③ 호 끝점 잔차 검사 무력화 ─────────────────────────────────────
apply_mutation "            if residual > tolerance:
                raise GeometryValidationError(
                    f\"{what} {role} point" \
               "            if False:
                raise GeometryValidationError(
                    f\"{what} {role} point" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ③ 이 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe offcircle | tail -1)"
[ "$b" = "RENDERED" ] || { echo "변이 ③ 이 동작을 안 바꿨다 (probe=$b) — 판정하지 않는다"; exit 3; }
verdict "③ 호 잔차 검사 끔" "원 위에 없으면 던진다"
restore

# ── 변이 ④ sweep 플래그 반전 ────────────────────────────────────────────
apply_mutation "            sweep_flag = 0 if signed > 0 else 1" \
               "            sweep_flag = 1 if signed > 0 else 0" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ④ 가 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe sweep | tail -1)"
# 기준선은 SWEEP=00 (90° 짧은 호·ccw). 반전되면 sweep 자리만 1 이 된다.
[ "$b" = "SWEEP=01" ] || { echo "변이 ④ 가 동작을 안 바꿨다 (probe=$b, 기대 SWEEP=01) — 판정하지 않는다"; exit 3; }
verdict "④ sweep 반전" "sweep 플래그를 가른다"
restore

echo ""
echo "═══ 변이 4개: 빨강 $PASS · 문제 $FAIL ═══"
[ $FAIL -eq 0 ] && [ $PASS -eq 4 ]
