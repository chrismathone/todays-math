#!/usr/bin/env bash
# linearGraph kind 가드를 **망가뜨려** 시험이 빨개지는지 본다. 순서는
# ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나
# (CLAUDE.md 2026-08-21 — ⑵ 를 건너뛰면 동작을 안 바꾸는 변이를
# 「가드가 아니다」로 읽는다).
#
# ⚠️ 산출물 표본에 **던져야 하는 스펙**이 둘 들어 있다(직선 밖 mark·극단 기울기) —
#    검증을 끄는 변이는 유효한 스펙의 그림을 한 픽셀도 안 바꾸므로, 던지는 자리가
#    표본에 없으면 「산출물이 그대로 → 판정 거부」가 나서 그 변이를 영영 못 판정한다.
#
# ⚠️ 이 하네스는 공유 워크트리의 elem_advanced.py 를 제자리에서 고친다(§4-22).
#    도는 동안 저장소 뿌리의 표지 파일이 그 사실을 알린다.
set -u
cd "$(dirname "$0")/../.." || exit 1

ADV=scripts/figure/elem_advanced.py
TEST=src/__tests__/unit/figureLinearGraph.test.ts

FLAG=MUTATION-IN-PROGRESS.linear-graph.txt
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
⚠️ scripts/qa/mutate-linear-graph.sh 가 도는 중이다 (2C-일차그래프 세션).

  PID   : $$          ← 살아 있나: \`kill -0 $$ 2>/dev/null && echo 산다 || echo 죽었다\`
  시작  : $(date '+%Y-%m-%d %H:%M:%S')
  대상  : scripts/figure/elem_advanced.py

지금 elem_advanced.py 는 **일부러 망가뜨린 상태**일 수 있다. 이 파일이 있는 동안:
  · 그 파일의 코드를 읽고 결함을 판정하지 마라
  · figureLinearGraph.test.ts 의 빨강을 보고하지 마라
  · 전체 관문 수치를 적지 마라
끝나면 저절로 지워진다. 남아 있는데 위 PID 가 죽었으면 지우고
\`git diff scripts/figure/elem_advanced.py\` 로 잔재를 확인해라.
FLAGTXT

# 산출물 표본 — 유효 3장 + **던져야 하는 것 2장**(직선 밖 mark · 극단 기울기).
cat > "$PROBE" <<'PY'
import json, subprocess, sys
SPECS = [
    {"version": "elem-1", "kind": "linearGraph",
     "lines": [{"slope": 2, "yIntercept": -1, "label": "y=2x-1"}],
     "xRange": [-4, 4], "yRange": [-4, 4], "marks": [[1, 1]]},
    {"version": "elem-1", "kind": "linearGraph",
     "lines": [{"slope": -3, "yIntercept": 6}],
     "xRange": [-2, 4], "yRange": [-2, 7], "marks": [[0, 6], [2, 0]]},
    {"version": "elem-1", "kind": "linearGraph",
     "lines": [{"slope": 1, "yIntercept": 2}, {"slope": -2, "yIntercept": 5}],
     "xRange": [-4, 5], "yRange": [-3, 6], "marks": [[1, 3]], "grid": True},
    {"version": "elem-1", "kind": "linearGraph",
     "lines": [{"slope": 2, "yIntercept": -1}],
     "xRange": [-4, 4], "yRange": [-4, 4], "marks": [[2, 2]]},
    {"version": "elem-1", "kind": "linearGraph",
     "lines": [{"slope": 12, "yIntercept": 0}],
     "xRange": [-4, 4], "yRange": [-4, 4]},
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

# ① marks 검산 끄기 — 직선 밖 점이 조용히 그려진다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        if not any(abs(my - (m * mx + b)) < 1e-9 for m, b, _l in parsed):"
assert s.count(old) == 1, "앵커 없음 ①"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        if False:  # 변이", 1))
PY
run "① marks-직선 검산 끄기"

# ② 화살촉 제거 — 축이 그냥 선이 된다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = 'f\'<polygon points="{_n(x_end + LG_ARROW)},{_n(ay)} {_n(x_end)},{_n(ay - 2.8)} \''
assert s.count(old) == 1, "앵커 없음 ②"
new = "''  # 변이: f'<polygon points=\"...\" '"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "② x축 화살촉 제거"

# ③ 직선을 경계 90% 까지만 — 「범위 경계까지」가 깨진다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    for (xa, ya), (xb, yb) in segs:\n        parts.append(_line((sx(xa), sy(ya)), (sx(xb), sy(yb)), sw=1.9))"
assert s.count(old) == 1, "앵커 없음 ③"
new = ("    for (xa, ya), (xb, yb) in segs:\n"
       "        cx, cy = (xa + xb) / 2, (ya + yb) / 2  # 변이: 90% 로 줄인다\n"
       "        xa, ya = cx + (xa - cx) * 0.9, cy + (ya - cy) * 0.9\n"
       "        xb, yb = cx + (xb - cx) * 0.9, cy + (yb - cy) * 0.9\n"
       "        parts.append(_line((sx(xa), sy(ya)), (sx(xb), sy(yb)), sw=1.9))")
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "③ 직선을 경계 90%까지만"

# ④ 정수 눈금 획 생략 — x축 쪽만 꺼도 개수 검사가 갈라야 한다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        parts.append(_line((sx(gx), ay - LG_TICK), (sx(gx), ay + LG_TICK), sw=0.9))"
assert s.count(old) == 1, "앵커 없음 ④"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        pass  # 변이", 1))
PY
run "④ x축 눈금 획 생략"

# ⑤ 등척 깨기 — x 칸만 1.25배 (기울기가 그린 값과 달라진다)
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        return pad_l + (x - xlo) * u"
assert s.count(old) == 1, "앵커 없음 ⑤"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, "        return pad_l + (x - xlo) * u * 1.25  # 변이", 1))
PY
run "⑤ 등척 깨기 (x 칸 1.25배)"

# ⑥ 극단 기울기 허용 — 던져야 하는 스펙이 조용히 그려진다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "LG_SLOPE_MAX = 6.0"
assert s.count(old) == 1, "앵커 없음 ⑥"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "LG_SLOPE_MAX = 999.0", 1))
PY
run "⑥ 극단 기울기 허용"

echo
echo "══ 판정 모음 (${SUMMARY}) ══"
cat "$SUMMARY"
if ! cmp -s "$BAK" "$ADV"; then
  echo "🔴 복구 실패 — elem_advanced.py 가 원본과 다르다"; exit 1
fi
echo "원상 복구 확인 (바이트 동일)"
