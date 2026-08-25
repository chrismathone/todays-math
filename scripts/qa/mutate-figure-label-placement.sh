#!/usr/bin/env bash
# 라벨 자리 가드 변이 시험 — figureLabelPlacement.test.ts 가 가드인지 확인.
#
#   bash scripts/qa/mutate-figure-label-placement.sh
#
# 순서 (2026-08-21 교훈: 파일이 바뀐 것과 **동작이 바뀐 것**은 다르다):
#   ⑴ 변이 적용 → 파일이 실제로 바뀌었나 (cmp)
#   ⑵ 동작이 실제로 바뀌었나 (가드가 지키던 산출물을 직접 재 본다)
#   ⑶ 그제서야 vitest — 빨개져야 가드다
#   ⑷ 바이트 그대로 복원 (md5 대조)
#
# ⚠️ 이 스크립트는 **대상 파일을 덮어쓴다.** 미커밋 수정이 있으면 시작조차 안 한다
#    (2026-08-23 「복원이 미커밋 수정을 통째로 먹었다」).
# §4-22: 도는 동안 표지를 **저장소 뿌리**에 남긴다. trap 으로 중단에도 복원.
set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET="$ROOT/vendor/figure-engine/core/figure_scene.py"
BACKUP="$TARGET.mutbak"
MARKER="$ROOT/MUTATION-IN-PROGRESS.mutate-figure-label-placement.txt"
TEST="src/__tests__/unit/figureLabelPlacement.test.ts"

cd "$ROOT"
if [ -n "$(git status --porcelain -- "vendor/figure-engine/core/figure_scene.py")" ]; then
  echo "🔴 vendor/figure-engine/core/figure_scene.py 에 커밋 안 한 수정이 있다 —"
  echo "   이 스크립트는 그 파일을 덮어쓰고 HEAD 가 아니라 «시작할 때 읽은 바이트»로"
  echo "   되돌린다. 먼저 커밋하고 다시 돌려라."
  exit 2
fi
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
  echo "주인: mutate-figure-label-placement.sh (도형라벨 세션)"
  echo "PID: $$   (살았나: kill -0 $$)"
  echo "시작: $(date '+%Y-%m-%d %H:%M:%S')"
} > "$MARKER"

md5() { python -c "import hashlib,sys;print(hashlib.md5(open(sys.argv[1],'rb').read()).hexdigest())" "$1"; }
BASE_MD5="$(md5 "$TARGET")"

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

# 동작 확인 — 가드가 지키던 산출물을 직접 잰다(시험을 안 거친다).
behavior_probe() { # $1=probe-name → stdout 마지막 줄로 판정
  PROBE="$1" python - <<'PYEOF'
import os, re, sys
sys.path.insert(0, os.path.join(os.getcwd(), "vendor", "figure-engine"))
from core.figure_scene import (
    render_figure_spec, FigureSpecError, GeometryValidationError)

FOOT = {
    "version": 2,
    "points": {"B": [22, 96.89], "C": [203.68, 96.89],
               "H": [139.26, 96.89], "A": [139.26, 32.47]},
    "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"],
                 "AH": {"points": ["A", "H"], "dash": "5 4"}},
    "angles": {"r_H": {"vertex": "H", "points": ["A", "C"], "right": True},
               "a_B": {"vertex": "B", "points": ["A", "C"], "label": "30°"},
               "a_C": {"vertex": "C", "points": ["A", "B"], "label": "45°"}},
    "labels": {"A": "A", "B": "B", "C": "C", "H": "H"},
}
NARROW = {
    "version": 2,
    "points": {"B": [22, 168], "A": [22, 22], "C": [106.3, 168]},
    "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"]},
    "angles": {"r_B": {"vertex": "B", "points": ["A", "C"], "right": True},
               "a_A": {"vertex": "A", "points": ["B", "C"], "label": "30°"}},
    "labels": {"A": "A", "B": "B", "C": "C"},
}
TWO_DIMS = {
    "version": 2,
    "points": {"B": [96.03, 171.03], "C": [192.03, 171.03], "A": [16.03, 32.47]},
    "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"]},
    "angles": {"a_B": {"vertex": "B", "points": ["A", "C"], "label": "120°"}},
    "dimensions": {"d_AB": {"points": ["A", "B"], "label": "10 cm"},
                   "d_BC": {"points": ["B", "C"], "label": "6 cm"}},
    "labels": {"A": "A", "B": "B", "C": "C"},
}

def text_at(svg, body):
    m = re.search(r'<text x="([-\d.]+)" y="([-\d.]+)"[^>]*>' + re.escape(body) + r'</text>', svg)
    return (float(m.group(1)), float(m.group(2))) if m else None

probe = os.environ["PROBE"]
if probe == "hpos":
    svg = render_figure_spec(FOOT)
    print("H=%s" % (text_at(svg, "H"),))
elif probe == "narrow":
    svg = render_figure_spec(NARROW)
    pos = text_at(svg, "30°")
    apex = (22.0, 22.0)      # 꼭짓점 A (translate 뒤 좌표는 아래에서 상대로만 쓴다)
    a = text_at(svg, "A")
    # 각 라벨이 꼭짓점 라벨에서 얼마나 떨어졌나 — 25 에 박혀 있으면 짧다.
    print("D=%.0f" % ((pos[0] - a[0]) ** 2 + (pos[1] - a[1]) ** 2) ** 0.5)
elif probe == "twodims":
    try:
        svg = render_figure_spec(TWO_DIMS)
        print("DASHED=%d" % len(re.findall(r'stroke-dasharray="6 4"', svg)))
    except (FigureSpecError, GeometryValidationError) as exc:
        print("THREW")
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

BASE_H="$(behavior_probe hpos | tail -1)"
BASE_D="$(behavior_probe narrow | tail -1)"
BASE_T="$(behavior_probe twodims | tail -1)"
echo "기준선: $BASE_H · $BASE_D · $BASE_T"

# ── 변이 ① 각 표시를 라벨 충돌에서 뺀다 (직각기호가 다시 보이지 않는 잉크가 된다) ──
apply_mutation "        for angle_name in sorted(self.angles):
            if angle_name == own_angle:
                continue
            for polyline in self._angle_mark_polylines(self.angles[angle_name]):" \
               "        for angle_name in sorted(self.angles):
            if angle_name == own_angle or True:
                continue
            for polyline in self._angle_mark_polylines(self.angles[angle_name]):" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ① 이 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe hpos | tail -1)"
[ "$b" != "$BASE_H" ] || { echo "변이 ① 이 동작을 안 바꿨다 (probe=$b) — 판정하지 않는다"; exit 3; }
verdict "① 각 표시를 충돌에서 뺌" "각 표시(직각기호) 위에 앉지 않는다"
restore

# ── 변이 ② 각 라벨 거리 사다리를 한 칸으로 (옛 «25 에 박기») ────────────────
apply_mutation "            distances = [base + index * step for index in range(10)]" \
               "            distances = [base + index * step for index in range(1)]" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ② 가 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe narrow | tail -1)"
[ "$b" != "$BASE_D" ] || { echo "변이 ② 가 동작을 안 바꿨다 (probe=$b) — 판정하지 않는다"; exit 3; }
verdict "② 각 라벨을 25 에 박음" "좁은 각의 값이 두 변을 덮지 않는다"
restore

# ── 변이 ③ 배치 순서를 되돌린다 — 점 이름을 치수보다 먼저 ──────────────────
apply_mutation "        dimension_curves = [layout.path_samples
                            for layout in dimension_layouts.values()]" \
               "        dimension_curves = []
        _unused_curves = [layout.path_samples
                            for layout in dimension_layouts.values()]" || exit 3
cmp -s "$TARGET" "$BACKUP" && { echo "변이 ③ 이 파일을 안 바꿨다"; exit 3; }
b="$(behavior_probe twodims | tail -1)"
if [ "$b" = "$BASE_T" ]; then
  echo "🟡 변이 ③ 은 이 표본에서 동작을 안 바꾼다 (probe=$b) — 판정하지 않고 건너뛴다"
  restore
else
  verdict "③ 점 이름이 치수 곡선을 못 봄" "치수 값은 제 점선"
  restore
fi

echo ""
echo "═══ 빨강 $PASS · 문제 $FAIL ═══"
[ $FAIL -eq 0 ] && [ $PASS -ge 2 ]
