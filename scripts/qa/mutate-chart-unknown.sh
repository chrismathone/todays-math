#!/usr/bin/env bash
# 차트의 «가려진 값» 선언(`CHART_ACCEPTS_UNKNOWN`)이 **한 곳인가**를 지키는 가드를
# 망가뜨려 본다 (2026-08-23, elem-figures).
#
# ── 왜 `mutate-elem-figure.sh` 가 아닌가 ─────────────────────────────────────
# 그 하네스는 ⑵단계로 **「산출물(SVG)이 바뀌었나」**를 본다. 옳은 규약이고 여러 번
# 세션을 구했다. 그런데 이 축은 **산출물을 안 바꾼다** — 호출부가 표를 읽든 자기가
# 정하든 「막대는 받고 꺾은선은 막는다」가 똑같이 나온다. 갈라지는 것은
# **「표를 뒤집었을 때 두 호출부가 따라오는가」**뿐이다.
#
# 실제로 거기 넣어 봤더니 두 변이가 「산출물이 그대로다 — 동작을 안 바꾸는 변이다」로
# **옳게** 걸러졌다. 하네스가 틀린 게 아니라 **판정 수단이 다른 부류**다.
# 그래서 자리를 나누고, 판정은 `probe-chart-unknown.py`(g4 작성)가 한다.
#
# ⚠️ 이 하네스도 공유 워크트리의 파일을 **제자리에서** 고친다. 도는 동안 표지를 둔다.
set -u
cd "$(dirname "$0")/../.." || exit 1

ADV=scripts/figure/elem_advanced.py
PROBE=scripts/qa/probe-chart-unknown.py
FLAG=MUTATION-IN-PROGRESS.chart-unknown.txt
BAK=$(mktemp)
SUMMARY=$(mktemp)
cp "$ADV" "$BAK"

restore() { cp "$BAK" "$ADV"; }
cleanup() { restore; rm -f "$FLAG"; }
trap 'cleanup; echo "중단 — 원상 복구했다"; exit 130' INT TERM
trap 'cleanup' EXIT

cat > "$FLAG" <<FLAGTXT
⚠️ scripts/qa/mutate-chart-unknown.sh 가 도는 중이다 (elem-figures 세션).

  PID   : $$          ← 살아 있나: \`kill -0 $$ 2>/dev/null && echo 산다 || echo 죽었다\`
  시작  : $(date '+%Y-%m-%d %H:%M:%S')
  대상  : scripts/figure/elem_advanced.py

이 파일이 있는 동안 그 파일의 코드를 읽고 결함을 판정하지 마라. 일부러 망가뜨린 상태다.
끝나면 저절로 지워진다. 남아 있는데 위 PID 가 죽었으면 \`git diff scripts/figure/\` 로
잔재를 확인하고 지워라.
FLAGTXT

# 🔴 **무변이 기준선.** 판정기가 이미 빨갛다면 모든 변이가 빨갛게 나와 전부 가드처럼 보인다.
if PYTHONIOENCODING=utf-8 python "$PROBE" >/dev/null 2>&1; then
  echo "## 기준선 (변이 없음) ✅ 판정기 통과 — 망가뜨리기 전에는 초록이다" | tee -a "$SUMMARY"
else
  echo "## 기준선 (변이 없음) 🔴 **무변이인데 빨갛다 — 이 회차의 빨강은 못 믿는다**" \
    | tee -a "$SUMMARY"
fi

run() { # $1=이름
  if cmp -s "$BAK" "$ADV"; then
    echo "[$1] 🔴 **파일이 안 바뀌었다 — 앵커가 없다.** 판정 안 함" | tee -a "$SUMMARY"
    restore; return
  fi
  local out
  out=$(PYTHONIOENCODING=utf-8 python "$PROBE" 2>&1)
  if [ $? -eq 0 ]; then
    echo "[$1] 🟢 전부 초록 ← 가드가 아니다" | tee -a "$SUMMARY"
  else
    # 어느 눈금이 죽었는지까지 찍는다 — 「N건 어긋남」만으로는 모른다.
    echo "[$1] 🔴 빨강 (가드가 문다)" | tee -a "$SUMMARY"
    echo "$out" | grep "❌" | head -4 | sed 's/^/     /'
  fi
  restore
}

# ⑴ **호출부가 표를 안 읽고 자기가 정한다.**
#    값은 지금과 똑같이 나온다(막대는 받고 꺾은선은 막는다). 그래서 값만 보는 시험은
#    이것을 구조적으로 못 본다 — 판정기의 ③(표를 뒤집기)만 갈라낸다.
python - "$ADV" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '    values = _chart_values_of("barChart", spec["values"], "values")'
assert old in s, "앵커 없음 ⑴"
new = '    values = _chart_values(spec["values"], "values", allow_unknown=True)  # 변이'
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "막대 호출부가 표를 안 읽고 자기가 정한다"

# ⑵ 꺾은선 쪽도 같은 자리 — 한쪽만 배선하는 그 결함이 정확히 이 모양이었다.
python - "$ADV" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '    values = _chart_values_of("lineChart", spec["values"], "values")'
assert old in s, "앵커 없음 ⑵"
new = '    values = _chart_values(spec["values"], "values")  # 변이'
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "꺾은선 호출부가 표를 안 읽고 자기가 정한다"

# ⑶ 표에 없는 종류를 **조용히 막는다**(던지지 않는다).
#    「안 정해졌다」와 「안 받는다」는 다른 말이다 — 새 차트가 이 축을 모른 채 지나간다.
python - "$ADV" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = """    if kind not in CHART_ACCEPTS_UNKNOWN:
        raise ValueError("""
assert old in s, "앵커 없음 ⑶"
new = """    if kind not in CHART_ACCEPTS_UNKNOWN:
        return _chart_values(raw, name, allow_unknown=False)  # 변이
    if False:
        raise ValueError("""
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "표에 없는 종류를 조용히 막는다 (안 던진다)"

restore
declared=$(grep -c '^run "' "$0")
judged=$(grep -c "^\[" "$SUMMARY")
skipped=$(grep -c "판정 안 함" "$SUMMARY")
notguard=$(grep -c "전부 초록" "$SUMMARY")
echo
echo "── 판정 전량 (판정 $judged / 스크립트에 적힌 변이 $declared) ──"
cat "$SUMMARY"
echo
fail=0
if [ "$judged" -ne "$declared" ]; then
  echo "🔴 **판정 수($judged)가 변이 수($declared)와 다르다** — 중간에 건너뛴 것이 있다"; fail=1
fi
if [ "$skipped" -ne 0 ]; then
  echo "🔴 **판정 안 한 변이 $skipped 개** — 앵커가 죽었다. 아무것도 증명하지 않았다"; fail=1
fi
if [ "$notguard" -ne 0 ]; then
  echo "🔴 **망가뜨렸는데 초록인 변이 $notguard 개** — 그 판정기는 가드가 아니다"; fail=1
fi
[ "$fail" -eq 0 ] && echo "✅ 변이 $declared 개 전부 판정됐고 전부 빨강이다"
echo "원상 복구 완료"
exit "$fail"
