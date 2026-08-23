#!/usr/bin/env bash
# 통계 kind(`table` 열 폭 · `histogram` · `freqPolygon`)의 가드를 **망가뜨려** 시험이
# 빨개지는지 본다. 판정은 3단이다:
#   ⑴ 파일이 바뀌었나  ⑵ **산출물이 바뀌었나**  ⑶ 그제서야 시험이 빨개지나
# ⑵ 를 건너뛰면 「동작을 안 바꾸는 변이」를 «가드가 아니다» 로 읽고 **멀쩡한 가드를
# 고치러 간다** — 가드가 없는 것보다 나쁘다 (CLAUDE.md 2026-08-21).
#
# ⚠️ 산출물 표본에 **던져야 하는 스펙**이 여럿 들어 있다. 검증을 끄는 변이는 유효한
#    스펙의 그림을 한 픽셀도 안 바꾸므로, 던지는 자리가 표본에 없으면 「산출물이
#    그대로 → 판정 거부」가 나서 그 변이를 영영 못 판정한다.
#
# ⚠️ 이 하네스는 **대상 파일을 제자리에서 덮어쓴다.** 그래서
#    ㉠ 시작할 때 대상이 커밋돼 있는지 먼저 묻고(안 그러면 복원이 미커밋 수정을
#       먹는다 — 2026-08-23 에 실제로 났다),
#    ㉡ 복원은 **시작할 때 읽어 둔 바이트 그대로**(git 이 아니라) 한다.
#    도는 동안 저장소 뿌리의 표지 파일이 그 사실을 알린다.
set -u
cd "$(dirname "$0")/../.." || exit 1

# ⚠️ **표본을 찍는 파이썬의 stdout 을 UTF-8 로 못 박는다.** Windows 기본 코드페이지
#    (cp949)로 리다이렉트하면 던짐 사유의 «» 같은 글자에서 UnicodeEncodeError 가 나고,
#    표본 파일이 **SVG 가 아니라 트레이스백**이 된다. 그러면 ⑵ 「산출물이 바뀌었나」가
#    트레이스백끼리 견주게 되어 **멀쩡한 변이를 「판정 안 함」으로 흘려보낸다**
#    (2026-08-23 실측: ⑥⑦⑧⑨ 넷이 그렇게 묻혔다). 지표가 «실패를 셀 수 있는 형태인가»
#    를 이 하네스 자신에게도 물어야 한다.
export PYTHONIOENCODING=utf-8

ADV=scripts/figure/elem_advanced.py
ELE=scripts/figure/elementary.py
TEST=src/__tests__/unit/figureStatKinds.test.ts

dirty=$(git status --porcelain -- "$ADV" "$ELE")
if [ -n "$dirty" ]; then
  echo "🔴 대상 파일에 커밋 안 된 수정이 있다 — 이 하네스는 그 파일을 덮어쓴다."
  echo "$dirty"
  echo "먼저 커밋하거나 치워라. (2026-08-23 「복원이 미커밋을 먹는다」)"
  exit 1
fi

FLAG=MUTATION-IN-PROGRESS.stat-kinds.txt
BAK_ADV=$(mktemp)
BAK_ELE=$(mktemp)
BEFORE=$(mktemp)
SUMMARY=$(mktemp)
PROBE=$(mktemp --suffix=.py)
cp "$ADV" "$BAK_ADV"
cp "$ELE" "$BAK_ELE"

restore() { cp "$BAK_ADV" "$ADV"; cp "$BAK_ELE" "$ELE"; }
cleanup() { restore; rm -f "$FLAG"; }
trap 'cleanup; echo "중단 — 원상 복구했다"; exit 130' INT TERM
trap 'cleanup' EXIT

cat > "$FLAG" <<FLAGTXT
⚠️ scripts/qa/mutate-stat-kinds.sh 가 도는 중이다 (3A-통계엔진 세션).

  PID   : $$          ← 살아 있나: \`kill -0 $$ 2>/dev/null && echo 산다 || echo 죽었다\`
  시작  : $(date '+%Y-%m-%d %H:%M:%S')
  대상  : scripts/figure/elem_advanced.py · scripts/figure/elementary.py

지금 두 파일은 **일부러 망가뜨린 상태**일 수 있다. 이 파일이 있는 동안:
  · 그 파일의 코드를 읽고 결함을 판정하지 마라
  · figureStatKinds.test.ts 의 빨강을 보고하지 마라
  · 전체 관문 수치를 적지 마라
끝나면 저절로 지워진다. 남아 있는데 위 PID 가 죽었으면 지우고
\`git diff scripts/figure/\` 로 잔재를 확인해라.
FLAGTXT

# 산출물 표본 — 유효 6장 + **던져야 하는 것 6장**.
cat > "$PROBE" <<'PY'
import json, subprocess, sys
SPECS = [
    # ── 유효 ──────────────────────────────────────────────────────────────
    {"version": "elem-1", "kind": "table",
     "headers": ["기록(m)", "도수(명)"],
     "rows": [["10이상~20미만", "5"], ["20 ~ 30", "9"], ["합계", "14"]]},
    {"version": "elem-1", "kind": "table", "headers": ["줄기", "잎"],
     "rows": [["1", "2 5 7"], ["2", "0 1 3 6 8"]], "align": ["center", "left"]},
    {"version": "elem-1", "kind": "histogram",
     "classes": [10, 15, 20, 25, 30, 35, 40], "values": [2, 3, 6, 11, 7, 3],
     "yLabel": "(명)", "xLabel": "(m)", "total": 32},
    {"version": "elem-1", "kind": "histogram",
     "classes": [5, 13, 21, 29, 37, 45], "values": [3, 10, 8, 6, 3],
     "yLabel": "(명)", "xLabel": "(m)", "total": 30, "hidden": [3]},
    {"version": "elem-1", "kind": "freqPolygon",
     "classes": [2, 4, 6, 8, 10, 12, 14], "values": [4, 6, 12, 10, 4, 4],
     "yLabel": "(명)", "xLabel": "(권)", "total": 40},
    {"version": "elem-1", "kind": "freqPolygon", "bars": True,
     "classes": [50, 55, 60, 65, 70], "values": [3, 10, 8, 6],
     "yLabel": "(개)", "xLabel": "(g)", "total": 27},
    # ── 던져야 하는 것 (검증을 끄는 변이가 여기서 산출물을 바꾼다) ────────────
    {"version": "elem-1", "kind": "table",
     "headers": ["계급(점)", "도수(명)", "상대도수"],
     "rows": [["10점이상~20점미만", "5", "0.25"]]},
    {"version": "elem-1", "kind": "histogram",
     "classes": [10, 15, 20, 25, 30, 35, 42], "values": [2, 3, 6, 11, 7, 3],
     "yLabel": "(명)", "xLabel": "(m)", "total": 32},
    {"version": "elem-1", "kind": "histogram",
     "classes": [10, 15, 20, 25, 30, 35, 40], "values": [2, 3, 6, 11, 7, 3],
     "yLabel": "(명)", "xLabel": "(m)", "total": 31},
    {"version": "elem-1", "kind": "histogram",
     "classes": [10, 15, 20, 25, 30, 35, 40], "values": [2, 3, 6, 11, 7, 3],
     "yLabel": "(학생 수와 그 밖의 여러 가지)", "total": 32},
    {"version": "elem-1", "kind": "freqPolygon",
     "classes": [10, 20, 30, 40, 50, 60, 70, 80, 90],
     "values": [2, 4, 7, 11, 9, 5, 3, 1],
     "yLabel": "(명)", "xLabel": "(점)", "total": 42},
    {"version": "elem-1", "kind": "histogram",
     "classes": [5, 13, 21, 29, 37, 45], "values": [3, 10, 8, 6, 3],
     "yLabel": "(명)", "xLabel": "(m)", "hidden": [3]},
]
for s in SPECS:
    r = subprocess.run([sys.executable, "scripts/figure/render_spec.py"],
                       input=json.dumps(s).encode(), capture_output=True)
    sys.stdout.write(r.stdout.decode("utf-8", "replace") + "\n")
PY

python "$PROBE" > "$BEFORE" 2>&1
# 표본이 **말이 되는지** 먼저 본다. 트레이스백이면 아래 비교가 전부 헛것이다.
want=$(grep -c '"svg"' "$BEFORE")
throw=$(grep -c '"error"' "$BEFORE")
if [ "$want" -lt 6 ] || [ "$throw" -lt 6 ]; then
  echo "🔴 표본이 깨졌다 — svg $want 줄 · error $throw 줄 (유효 6 · 던짐 6 이어야 한다)"
  head -3 "$BEFORE"
  exit 1
fi
echo "표본 확인: svg $want · 던짐 $throw"

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
  if cmp -s "$BAK_ADV" "$ADV" && cmp -s "$BAK_ELE" "$ELE"; then
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

# ① 표 열 폭을 다시 **균등**으로 — 긴 계급 라벨의 첫 글자가 열 밖으로 나간다
python - "$ELE" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    return [w * total / total_need for w in need]"
assert s.count(old) == 1, "앵커 없음 ①"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    s.replace(old, "    return [total / len(need)] * len(need)  # 변이", 1))
PY
run "① 표 열 폭 균등으로 되돌리기"

# ② 표가 폭을 넘어도 안 던진다 — 조용히 잘린다
python - "$ELE" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    if total_need > usable:"
assert s.count(old) == 1, "앵커 없음 ②"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    s.replace(old, "    if False:  # 변이", 1))
PY
run "② 표 넘침 던짐 끄기"

# ③ 히스토그램 막대에 **틈**을 만든다 — 막대그래프가 된다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "            parts.append(_rect(x0, y, x1 - x0, bottom - y, fill=HIST_FILL, sw=1.15))"
assert s.count(old) == 1, "앵커 없음 ③"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    s.replace(old,
              "            parts.append(_rect(x0 + 3, y, x1 - x0 - 6, bottom - y, "
              "fill=HIST_FILL, sw=1.15))  # 변이", 1))
PY
run "③ 히스토그램 막대에 틈 만들기"

# ④ 도수분포다각형의 **양끝 0 연장**을 뺀다 — 넓이 등식이 깨진다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = """            pts = (
                [(px(mids[0] - width), py(0))]
                + [(px(m), py(val)) for m, val in zip(mids, series)]
                + [(px(mids[-1] + width), py(0))]
            )"""
assert s.count(old) == 1, "앵커 없음 ④"
new = "            pts = [(px(m), py(val)) for m, val in zip(mids, series)]  # 변이"
io.open(p, "w", encoding="utf-8", newline="\n").write(s.replace(old, new, 1))
PY
run "④ 양끝 0 연장 빼기"

# ⑤ 계급의 크기가 달라도 안 던진다 — 넓이가 도수에 비례하지 않는 그림이 나간다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        if abs(gap - width) > 1e-7:"
assert s.count(old) == 1, "앵커 없음 ⑤"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    s.replace(old, "        if False:  # 변이", 1))
PY
run "⑤ 계급 폭 검사 끄기"

# ⑥ 도수의 합 검산을 끈다 — 발문과 그림이 다른 말을 해도 통과
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    if abs(got - total) > 1e-7:"
assert s.count(old) == 1, "앵커 없음 ⑥"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    s.replace(old, "    if False:  # 변이", 1))
PY
run "⑥ 도수 합 검산 끄기"

# ⑦ 가려 놓고 total 을 안 받는다 — 아무도 못 푸는 문항이 조용히 나간다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '    if "total" not in spec:\n        raise ValueError(\n            "hidden 을 쓰면'
assert s.count(old) == 1, "앵커 없음 ⑦"
new = '    if False:  # 변이\n        raise ValueError(\n            "hidden 을 쓰면'
io.open(p, "w", encoding="utf-8", newline="\n").write(s.replace(old, new, 1))
PY
run "⑦ hidden 의 total 요구 끄기"

# ⑧ 폭 박기 가드를 끈다 — 이 그림만 지면에서 작아지는데 아무 에러도 안 난다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    if abs(got - STAT_VIEWBOX) > 0.51:"
assert s.count(old) == 1, "앵커 없음 ⑧"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    s.replace(old, "    if False:  # 변이", 1))
PY
run "⑧ 지면 폭 박기 가드 끄기"
#    ↑ **「판정 안 함」이 정상이다.** 실측 808장에서 가장 오른쪽 좌표가 238.0(= 240 −
#    여백 2, 여유 0.00)이라 지금 입력으로는 이 줄에 도달할 수 없다. 여유가 0이므로
#    프레임 밖으로 한 단위만 더 그리면 걸린다 — 「초록이니 가드가 아니다」로 읽고
#    지우지 마라(`_stat_svg` 주석 참조). 여유가 0 인 것 자체는
#    figureStatKinds.test.ts 의 「폭 박기의 여유가 0 이다」가 잠근다.

# ⑨ 눈금 칸 수를 **짐작**하게 되돌린다 — 다각형에서 겹침을 못 본다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    pitch = plot_w / (len(ticks) - 1 if intervals is None else intervals)"
assert s.count(old) == 1, "앵커 없음 ⑨"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    s.replace(old, "    pitch = plot_w / (len(ticks) - 1)  # 변이", 1))
PY
run "⑨ 눈금 칸 수 짐작으로 되돌리기"

# ⑩ 찢긴 자국을 안 그린다 — 「보이지 않는 계급」이 「도수 0」과 구별되지 않는다
python - "$ADV" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = """    for i in hidden:
        parts.append(_tear_edge(px(classes[i]), top, bottom))
        parts.append(_tear_edge(px(classes[i + 1]), top, bottom))"""
assert s.count(old) == 1, "앵커 없음 ⑩"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    s.replace(old, "    for i in hidden:  # 변이\n        _ = i", 1))
PY
run "⑩ 찢긴 자국 안 그리기"

# ⑪ 잎 왼쪽 정렬을 무시한다 — 줄기와 잎의 자릿수가 세로로 안 맞는다
python - "$ELE" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '''            if align[i] == "left"'''
assert s.count(old) == 1, "앵커 없음 ⑪"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    s.replace(old, "            if False  # 변이", 1))
PY
run "⑪ 잎 왼쪽 정렬 무시"

echo
echo "══ 판정 모음 (${SUMMARY}) ══"
cat "$SUMMARY"
if ! cmp -s "$BAK_ADV" "$ADV" || ! cmp -s "$BAK_ELE" "$ELE"; then
  echo "🔴 복구 실패 — 대상 파일이 원본과 다르다"; exit 1
fi
echo "원상 복구 확인 (바이트 동일)"
