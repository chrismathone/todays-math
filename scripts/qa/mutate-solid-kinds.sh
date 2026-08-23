#!/usr/bin/env bash
# 입체 kind 셋(hollowSolid·cutCuboid·revolvePlan)의 가드를 **망가뜨려** 시험이
# 빨개지는지 본다. 순서는 ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야
# 시험이 빨개지나 (CLAUDE.md 2026-08-21 — ⑵ 를 건너뛰면 동작을 안 바꾸는 변이를
# 「가드가 아니다」로 읽는다).
#
# ⚠️ 산출물 표본에 **던져야 하는 스펙**이 하나 들어 있다 — 검증을 끄는 변이는
#    유효한 스펙의 그림을 한 픽셀도 안 바꾸므로, 던지는 자리가 표본에 없으면
#    「산출물이 그대로 → 판정 거부」가 나서 그 변이를 영영 못 판정한다.
#
# ⚠️ 이 하네스는 공유 워크트리의 elem_advanced.py 를 제자리에서 고친다(§4-22).
#    도는 동안 저장소 뿌리의 표지 파일이 그 사실을 알린다.
set -u
cd "$(dirname "$0")/../.." || exit 1

ADV=scripts/figure/elem_advanced.py
TEST=src/__tests__/unit/figureSolidKinds.test.ts

FLAG=MUTATION-IN-PROGRESS.solid-kinds.txt
BAK=$(mktemp)
BEFORE=$(mktemp)
SUMMARY=$(mktemp)
PROBE=$(mktemp --suffix=.py)
cp "$ADV" "$BAK"

restore() { cp "$BAK" "$ADV"; }
cleanup() { restore; rm -f "$FLAG"; }
trap 'cleanup; echo "중단 — 원상 복구했다"; exit 130' INT TERM
trap 'cleanup' EXIT

cat > "$FLAG" <<FLAGTXT
⚠️ scripts/qa/mutate-solid-kinds.sh 가 도는 중이다 (입체-kind 세션).

  PID   : $$          ← 살아 있나: \`kill -0 $$ 2>/dev/null && echo 산다 || echo 죽었다\`
  시작  : $(date '+%Y-%m-%d %H:%M:%S')
  대상  : scripts/figure/elem_advanced.py

지금 elem_advanced.py 는 **일부러 망가뜨린 상태**일 수 있다. 이 파일이 있는 동안:
  · 그 파일의 코드를 읽고 결함을 판정하지 마라
  · figureSolidKinds.test.ts 의 빨강을 보고하지 마라
  · 전체 관문 수치를 적지 마라
끝나면 저절로 지워진다. 남아 있는데 위 PID 가 죽었으면 지우고
\`git diff scripts/figure/elem_advanced.py\` 로 잔재를 확인해라.
FLAGTXT

# 산출물 표본 — 유효 4장 + **던져야 하는 것 1장**(구멍이 벽에 닿음).
cat > "$PROBE" <<'PY'
import json, subprocess, sys
SPECS = [
    {"version": "elem-1", "kind": "hollowSolid",
     "outer": {"shape": "cylinder", "r": 5, "h": 10}, "inner": {"shape": "cylinder", "r": 2}},
    {"version": "elem-1", "kind": "hollowSolid",
     "outer": {"shape": "cylinder", "r": 5, "h": 10}, "inner": {"shape": "cylinder", "r": 4.9}},
    {"version": "elem-1", "kind": "cutCuboid", "w": 11, "d": 6, "h": 9,
     "cut": {"x": 2, "w": 3.5, "d": 1.8}},
    {"version": "elem-1", "kind": "cutCuboid", "w": 12, "d": 9, "h": 9,
     "cut": {"x": 3, "w": 5, "d": 3, "h": 6}},
    {"version": "elem-1", "kind": "revolvePlan",
     "pieces": [{"shape": "rect", "w": 3, "h": 5}]},
]
for s in SPECS:
    r = subprocess.run([sys.executable, "scripts/figure/render_spec.py"],
                       input=json.dumps(s).encode(), capture_output=True)
    sys.stdout.write(r.stdout.decode("utf-8", "replace") + "\n")
PY

python "$PROBE" > "$BEFORE" 2>&1

baseline_out=$(npx vitest run "$TEST" 2>&1)
if echo "$baseline_out" | grep -qE "Tests +[0-9]+ failed"; then
  echo "## 기준선 (변이 없음) 🔴 무변이인데 빨갛다 — 이 회차의 빨강은 못 믿는다" | tee -a "$SUMMARY"
  echo "$baseline_out" | grep -oE "^ *× .*" | head -6
else
  n=$(echo "$baseline_out" | grep -oE "Tests +[0-9]+ passed" | head -1)
  echo "## 기준선 (변이 없음) ✅ ${n:-통과}" | tee -a "$SUMMARY"
fi

run() { # $1=이름
  local after out r names
  after=$(mktemp)
  if cmp -s "$BAK" "$ADV"; then
    echo "[$1] 🔴 **파일이 안 바뀌었다 — 앵커가 없다.** 판정 안 함" | tee -a "$SUMMARY"
    restore; return
  fi
  python "$PROBE" > "$after" 2>&1
  if cmp -s "$BEFORE" "$after"; then
    echo "[$1] 🔴 **산출물이 그대로다 — 동작을 안 바꾸는 변이다.** 판정 안 함" | tee -a "$SUMMARY"
    restore; return
  fi
  out=$(npx vitest run "$TEST" 2>&1)
  r=$(echo "$out" | grep -oE "Tests +[0-9]+ failed" | head -1)
  names=$(echo "$out" | grep -oE "^ *× .*" | sed 's/^ *× //; s/ [0-9]*ms$//' | sort -u \
            | head -6 | sed 's/^/      · /')
  echo "[$1] ${r:-🟢 전부 초록 ← 가드가 아니다}" | tee -a "$SUMMARY"
  [ -n "$names" ] && echo "$names"
  restore
}

# ① 구멍-벽 검증 끄기 — 던져야 하는 스펙이 조용히 그려진다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    if R - r < SOLID_MIN_WALL:"
assert s.count(old) == 1, "앵커 없음 ①"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    if False:  # 변이", 1))
PY
run "① 구멍-벽 검증 끄기"

# ② 가림 판정 끄기 — 숨은 모서리 점선이 전부 사라진다 (§4-14)
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    def hidden(p) -> bool:\n        o = outer_iv(p)"
assert s.count(old) == 1, "앵커 없음 ②"
new = "    def hidden(p) -> bool:\n        return False\n        o = outer_iv(p)"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "② 가림 판정 끄기(점선 전멸)"

# ③ 구멍 뚫린 원기둥만 사방(0.5) 투영으로 — 납작비 0.15 가 깨진다 (§4-20-d 배선)
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "obot + otop, scale, (24.0, 26.0, 40.0, 24.0), ratio=ROUND_RATIO"
assert s.count(old) == 1, "앵커 없음 ③"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, "obot + otop, scale, (24.0, 26.0, 40.0, 24.0), ratio=0.5", 1))
PY
run "③ hollow 원기둥 납작비 배선 끊기"

# ④ 회전축을 안 긋는다 — 축 없는 회전 전 그림
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    parts.append(_line((ax, axis_top), (ax, axis_bot), sw=1.0))"
assert s.count(old) == 1, "앵커 없음 ④"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    _ = (axis_top, axis_bot)", 1))
PY
run "④ 회전축 긋기 생략"

# ⑤ 컷 폭 치수를 빼먹는다 — 받은 치수 전부 표기(§4-20)가 깨진다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '        parts.append(_dim_towards(view, a3, b3, f"{_n(cw)} cm", want, 9.0))'
assert s.count(old) == 1, "앵커 없음 ⑤"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        _ = want", 1))
PY
run "⑤ 컷 폭 치수 빼먹기"

# ⑥ 직각 표시 전부 끄기 — 직사각형 4·삼각형 1·사다리꼴 2 가 0 이 된다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        if abs(u1[0] * u2[0] + u1[1] * u2[1]) > 0.02:"
assert s.count(old) == 1, "앵커 없음 ⑥"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        if True:  # 변이", 1))
PY
run "⑥ 직각 표시 전부 끄기"

echo
echo "══ 판정 모음 (${SUMMARY}) ══"
cat "$SUMMARY"
if ! cmp -s "$BAK" "$ADV"; then
  echo "🔴 복구 실패 — elem_advanced.py 가 원본과 다르다"; exit 1
fi
echo "원상 복구 확인 (바이트 동일)"
