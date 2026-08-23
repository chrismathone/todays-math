#!/usr/bin/env bash
# FigureSpec v2 마크 문법 가드 변이 시험 — figureMarks.test.ts 가 가드인지 확인.
#
#   bash scripts/qa/mutate-figure-marks.sh
#
# 순서 (2026-08-21 교훈: 파일이 바뀐 것과 **동작이 바뀐 것**은 다르다):
#   ⑴ 변이 적용 → 파일이 실제로 바뀌었나 (cmp)
#   ⑵ 동작이 실제로 바뀌었나 (가드가 지키던 산출물을 직접 재 본다)
#   ⑶ 그제서야 vitest — 빨개져야 가드다
#   ⑷ 바이트 그대로 복원 (md5 대조)
#
# §4-22: 도는 동안 표지를 **저장소 뿌리**에 남긴다. trap 으로 중단에도 복원.
set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET="$ROOT/vendor/figure-engine/core/figure_scene.py"
BACKUP="$TARGET.mutbak"
MARKER="$ROOT/MUTATION-IN-PROGRESS.mutate-figure-marks.txt"
TEST="src/__tests__/unit/figureMarks.test.ts"

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
  echo "주인: mutate-figure-marks.sh (세션 2B-v2마크)"
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

# 동작 확인 — 가드가 지키던 산출물을 직접 잰다.
behavior_probe() { # $1=probe-name → stdout 마지막 줄로 판정
  PROBE="$1" python - <<'PYEOF'
import os, re, sys
sys.path.insert(0, os.path.join(os.getcwd(), "vendor", "figure-engine"))
from core.figure_scene import render_figure_spec, FigureSpecError, GeometryValidationError

def flat(seg):
    return {"version": 2, "points": {"A": [0, 100], "B": [200, 100]},
            "segments": {"AB": seg}}

probe = os.environ["PROBE"]
if probe == "tickcount":
    svg = render_figure_spec(flat({"points": ["A", "B"], "ticks": 2}))
    n = len(re.findall(r'stroke-linecap="round"', svg))
    print(f"TICKS={n}")
elif probe == "rightskip":
    spec = {"version": 2,
            "points": {"O": [50, 150], "P": [200, 150], "Q": [70, 30]},
            "segments": {"OP": ["O", "P"], "OQ": ["O", "Q"]},
            "angles": {"a": {"vertex": "O", "points": ["P", "Q"], "right": True}}}
    try:
        render_figure_spec(spec)
        print("RENDERED")
    except (FigureSpecError, GeometryValidationError):
        print("BLOCKED")
elif probe == "arcgap":
    spec = {"version": 2,
            "points": {"O": [50, 150], "P": [200, 150], "Q": [150, 30]},
            "segments": {"OP": ["O", "P"], "OQ": ["O", "Q"]},
            "angles": {"a": {"vertex": "O", "points": ["P", "Q"], "arcs": 2}}}
    svg = render_figure_spec(spec)
    print("INNER=" + ("yes" if "A 12.0 12.0" in svg else "no"))
elif probe == "chevdir":
    svg = render_figure_spec(flat({"points": ["A", "B"], "parallel": 1}))
    xs = [(float(m.group(1)), float(m.group(3)))
          for m in re.finditer(r'<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"[^/]*stroke-linecap="round"', svg)]
    tip = xs[0][1]          # 첫 획의 끝 = 꼭짓점
    wing = xs[0][0]         # 첫 획의 시작 = 날개
    print("DIR=" + ("fwd" if tip > wing else "rev"))
else:
    print("PROBE-UNKNOWN"); sys.exit(3)
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

# ── 변이 ① tick 개수 무시 — 몇 개를 시켜도 하나만 그린다 ────────────────
apply_mutation "            for index in range(segment.ticks):" \
               "            for index in range(min(segment.ticks, 1)):" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ① 이 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe tickcount | tail -1)"
[ "$b" = "TICKS=1" ] || { echo "변이 ① 이 동작을 안 바꿨다 (probe=$b, 기대 TICKS=1) — 판정하지 않는다"; exit 3; }
verdict "① tick 개수 무시" "수직 획 2개를 중점 대칭"
restore

# ── 변이 ② 직각 90° 검산 끔 ─────────────────────────────────────────────
apply_mutation "                cos_value = abs(v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)
                if cos_value > _RIGHT_ANGLE_COS_TOL:" \
               "                cos_value = abs(v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)
                if False and cos_value > _RIGHT_ANGLE_COS_TOL:" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ② 가 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe rightskip | tail -1)"
[ "$b" = "RENDERED" ] || { echo "변이 ② 가 동작을 안 바꿨다 (probe=$b, 기대 RENDERED) — 판정하지 않는다"; exit 3; }
verdict "② 직각 검산 끔" "90°가 아니면 던진다"
restore

# ── 변이 ③ 이중호 간격 무력화 — 같은 반지름 두 번 ───────────────────────
apply_mutation "                    radius - arc_index * _MARK_GAP)" \
               "                    radius - arc_index * 0.0)" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ③ 이 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe arcgap | tail -1)"
[ "$b" = "INNER=no" ] || { echo "변이 ③ 이 동작을 안 바꿨다 (probe=$b, 기대 INNER=no) — 판정하지 않는다"; exit 3; }
verdict "③ 이중호 간격 무력화" "반지름 15·12"
restore

# ── 변이 ④ 셰브런 방향 반전 — p2→p1 을 가리킨다 ─────────────────────────
apply_mutation "                back_x, back_y = tip_x - depth * ux, tip_y - depth * uy" \
               "                back_x, back_y = tip_x + depth * ux, tip_y + depth * uy" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ④ 가 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe chevdir | tail -1)"
[ "$b" = "DIR=rev" ] || { echo "변이 ④ 가 동작을 안 바꿨다 (probe=$b, 기대 DIR=rev) — 판정하지 않는다"; exit 3; }
verdict "④ 셰브런 방향 반전" "p1→p2 방향을 가리킨다"
restore

echo ""
echo "═══ 변이 4개: 빨강 $PASS · 문제 $FAIL ═══"
[ $FAIL -eq 0 ] && [ $PASS -eq 4 ]
