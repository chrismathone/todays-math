#!/usr/bin/env bash
# 초등 그림 엔진의 새 가드를 **망가뜨려** 시험이 빨개지는지 본다 (원장님 육안 2026-08-22).
#
# 🔴 순서는 ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나.
#    ⑵ 를 건너뛰면 동작을 안 바꾸는 변이를 「가드가 아니다」로 읽고 멀쩡한 시험을
#    고치러 간다 (CLAUDE.md 2026-08-21).
#
# ⚠️ **이 하네스는 공유 워크트리의 파일을 제자리에서 고친다.** `renderFigureSpec.ts` 가
#    `process.cwd()` 로 `scripts/figure/render_spec.py` 를 찾으므로 복사본으로는 못 돌린다.
#    2026-08-22 에 이것 때문에 **다른 세션이 두 번 거짓 보고**를 했다 —
#    한 번은 「`_cuboid` 에 숨은 모서리가 없다」(변이 ① 적용 중 코드를 읽음),
#    한 번은 「원뿔 기울기 8.24 로 2건 빨강」(변이 ③ 적용 중 전체 관문을 돌림).
#    그래서 도는 동안 **`git status` 에 뜨는 표지 파일**을 둔다. 남이 이 저장소에서
#    이상한 것을 보면 그 파일이 먼저 눈에 띄어야 한다.
set -u
cd "$(dirname "$0")/../.." || exit 1

ADV=scripts/figure/elem_advanced.py
BASE=scripts/figure/elementary.py

# ── 이름 거름 ────────────────────────────────────────────────────────────────
# 고친 시험 하나를 다시 볼 때 27개를 20분 돌리지 않는다.
#   MUTATE_ONLY="옛 자로" MUTATE_EXPECT=2 bash scripts/qa/mutate-elem-figure.sh
#
# ⚠️ 거른 회차는 **전량 회차가 아니다.** 출력 머리와 끝에 그렇게 찍는다 — 「전부 빨강」이
#    거른 두 개 이야기인지 27개 이야기인지 다음 사람이 알 수 있어야 한다.
#
# 🔴 **이름이 아무것도 못 맞추면 「0개 돌리고 전부 통과」가 된다.** 오타 한 글자면
#    그렇게 된다. 그래서 **몇 개를 맞췄는지 먼저 찍고, 부르는 쪽이 적어 낸 수와
#    다르면 아무것도 안 돌리고 멈춘다** — 「파일이 안 바뀌면 판정하지 않는다」와 같은
#    자리다. 셈이 0이어도 조용히 초록이 나오면 안 된다.
#
#    이 검사는 **표지를 세우기도 전에** 한다. 이름을 틀렸을 뿐인데 공유 워크트리를
#    건드리거나 기준선으로 35초를 태울 이유가 없다.
CTRL=$(printf '\a\b\v\f')
# 🔴 **자기 소스와 대상에 제어문자가 있나** — 가장 싼 검사를 **가장 먼저** 한다.
#    2026-08-23~24 에 이 부류를 **네 번** 밟았다: 정규식의 낱말 경계 표시가 백스페이스 한 글자로 박혀
#    「직각을 호로 그리지 않는다」 검사가 **아무것도 안 맞는 채 늘 통과**했다.
#    heredoc·도구 층이 역슬래시를 한 겹 벗기는 것이 원인이라 **사람이 기억할 일이 아니다.**
#    ⚠️ 이 검사 자체도 「일부러 넣은 제어문자」로 시험해 빨개지는 것을 확인했다.
for f in "$0" scripts/figure/elementary.py scripts/figure/elem_advanced.py          src/__tests__/unit/elementaryFigure.test.ts; do
  # ⚠️ 패턴을 **조립**한다 — 제어문자를 리터럴로 적으면 이 파일이 **자기 검사에 걸린다**
  #    (실제로 그렇게 됐다 — 오늘 다섯 번째 얼굴이었다).
  if grep -qP "[$CTRL]" "$f" 2>/dev/null; then
    echo "🔴 **제어문자가 박혀 있다: $f** — 그 줄의 정규식·문자열은 뜻이 다르다. 판정 없이 멈춘다"
    grep -nP "[$CTRL]" "$f" | head -3 | cat -v | sed 's/^/     /'
    exit 2
  fi
done

ONLY=${MUTATE_ONLY:-}
if [ -n "$ONLY" ]; then
  MATCHED=$(grep '^run "' "$0" | grep -c -- "$ONLY")
  echo "⚠️ 거름: 이름에 «$ONLY» 가 든 변이만 돌린다 — **전량 회차가 아니다**"
  echo "   맞은 변이 $MATCHED 개 / 스크립트 전체 $(grep -c '^run "' "$0") 개"
  if [ -z "${MUTATE_EXPECT:-}" ]; then
    echo "🔴 거를 때는 MUTATE_EXPECT 로 **몇 개를 기대하는지 적어야 한다** — 멈춘다"
    exit 2
  fi
  if [ "$MATCHED" -ne "$MUTATE_EXPECT" ]; then
    echo "🔴 **맞은 변이 $MATCHED 개 ≠ 기대 $MUTATE_EXPECT 개** — 이름이 어긋났다. 판정 없이 멈춘다"
    exit 2
  fi
fi
# 표지는 **저장소 뿌리**에 `MUTATION-IN-PROGRESS.<하네스이름>.txt` (team-lead 가 정한 규약).
# 예전에는 `scripts/figure/` 밑에 뒀는데 team-lead 표지는 `scripts/qa/` 였다 —
# **갈려 있으면 서로 자기 쪽만 본다.** 실제로 team-lead 의 대기 스크립트가 뿌리만
# 훑어서 내 표지를 못 봤다. 뿌리에 모으면 `ls MUTATION-IN-PROGRESS.*` 한 줄로 다 보인다.
# g5 규약(2026-08-24): 회차 머리에 **되쓸 파일**을 찍는다 — 창을 연 파일과 되쓰는
# 파일이 다를 수 있고, 그때 남이 「내 파일은 아니겠지」 하고 지나간다.
echo "▶ 이 회차가 **되쓸 파일**: $ADV · $BASE"
FLAG=MUTATION-IN-PROGRESS.elem-figure.txt
# 🔴 **빵부스러기** — 변이를 적용하기 **직전에** 쓰고 정상 복원 때 지운다. 그래서
#    **이 파일이 남아 있다는 것 자체가 「더럽게 죽었다」**는 뜻이다(g5).
#    ⚠️ `echo >` 는 셸 **내장**이라 fork 없이 쓴다 — `mktemp`·`cp` 는 fork 가 필요해
#       `fork: Resource temporarily unavailable` 상황에서 실패한다. 오늘 그것으로
#       `trap` 이 못 돌아 변이가 파일에 남았다.
CRUMB=scripts/qa/.mutate-inflight.elem-figure.json
LAST=scripts/qa/.mutate-last.elem-figure.json
BAK_ADV=$(mktemp)
BAK_BASE=$(mktemp)
BEFORE=$(mktemp)
# 판정 한 줄씩을 **파일로** 남긴다. stdout 을 `| tail -N` 으로 받으면 앞쪽 변이가
# 조용히 잘려 「몇 개 돌았나」가 사라진다 — 2026-08-22 에 21개 중 15개만 보고할 뻔했다.
# 「N passed」가 N이 전부인지 말해 주지 않는 것과 같은 자리다(CLAUDE.md 2026-08-19).
SUMMARY=$(mktemp)
# 변이 python 의 stderr 를 모으는 자리. **버리지 않는다** — 거른 회차에서는 안 돌릴
# 변이의 앵커 assert 가 터지는 것이 정상인데, 그 트레이스백이 출력에 섞이면 다음 사람이
# 「뭔가 깨졌나」 한다(거짓 경보가 가드를 끄는 그 사촌, 2026-08-20). 그래서 접어 두고
# **「앵커가 없다」로 판정될 때만** 꺼내 보여 준다 — 그때가 실제로 필요한 순간이다.
PYERR=$(mktemp)
cp "$ADV" "$BAK_ADV"
cp "$BASE" "$BAK_BASE"

restore() { cp "$BAK_ADV" "$ADV"; cp "$BAK_BASE" "$BASE"; rm -f "$CRUMB"; }
cleanup() { restore; rm -f "$FLAG"; }
# 죽어도 원본을 되돌린다. 중간에 끊기면 변이가 그대로 남아 다음 사람이 그걸 읽는다.
trap 'cleanup; echo "중단 — 원상 복구했다"; exit 130' INT TERM
trap 'cleanup' EXIT

cat > "$FLAG" <<FLAGTXT
⚠️ scripts/qa/mutate-elem-figure.sh 가 도는 중이다 (elem-figures 세션).

  PID   : $$          ← 살아 있나: \`kill -0 $$ 2>/dev/null && echo 산다 || echo 죽었다\`
  시작  : $(date '+%Y-%m-%d %H:%M:%S')
  대상  : scripts/figure/elementary.py · scripts/figure/elem_advanced.py

죽은 프로세스의 표지만 남았으면(위 kill -0 이 「죽었다」) 이 파일을 지우고
\`git diff scripts/figure/\` 로 변이 잔재가 없는지 확인해라.
FLAGTXT
cat >> "$FLAG" <<'FLAGTXT'

지금 `scripts/figure/elementary.py` 와 `elem_advanced.py` 는 **일부러 망가뜨린 상태**일 수
있다. 이 파일이 있는 동안에는:

  · 그 두 파일의 코드를 읽고 결함을 판정하지 마라
  · `elementaryFigure.test.ts` 의 빨강을 보고하지 마라 (일부러 빨갛게 만드는 중이다)
  · 전체 관문 수치를 적지 마라

끝나면 이 파일은 저절로 지워지고 두 파일은 원본으로 되돌아간다. 몇 분 걸린다.
남아 있는데 아무도 안 돌리고 있으면 `git diff scripts/figure/` 로 확인하고 지워라.
FLAGTXT

python scripts/qa/probe-elem-figure.py > "$BEFORE" 2>&1

# 🔴 **무변이 기준선.** 시험이 이미 빨갛다면 모든 변이가 「Tests N failed」를 내고
#    전부 가드처럼 보인다 — 빨강의 «참»이 변이에서 온 것인지 알 수 없게 된다.
#    그래서 망가뜨리기 **전에** 한 번 돌려 초록인 것을 산출물에 남긴다.
baseline_bad=0
baseline() {
  local out
  out=$(npx vitest run src/__tests__/unit/elementaryFigure.test.ts 2>&1)
  if echo "$out" | grep -qE "Tests +[0-9]+ failed"; then
    echo "## 기준선 (변이 없음) 🔴 **무변이인데 빨갛다 — 이 회차의 빨강은 못 믿는다**" \
      | tee -a "$SUMMARY"
    echo "$out" | grep -oE "^ *× .*" | sed 's/^ *× //; s/ [0-9]*ms$//' | sort -u | head -6 \
      | sed 's/^/      · /'
    baseline_bad=1
  else
    local n; n=$(echo "$out" | grep -oE "Tests +[0-9]+ passed" | head -1)
    echo "## 기준선 (변이 없음) ✅ ${n:-통과} — 망가뜨리기 전에는 시험이 통과한다" \
      | tee -a "$SUMMARY"
  fi
}
baseline

run() { # $1=이름
  # 빵부스러기 — **변이가 이미 적용된 뒤**이므로 여기서 쓴다(그 전에 죽으면 파일이 성하다).
  echo "{\"harness\":\"elem-figure\",\"name\":\"$1\",\"files\":[\"$ADV\",\"$BASE\"]}" > "$CRUMB"
  local after; after=$(mktemp)
  if [ -n "$ONLY" ] && [ "${1#*"$ONLY"}" = "$1" ]; then restore; return; fi
  if cmp -s "$BAK_ADV" "$ADV" && cmp -s "$BAK_BASE" "$BASE"; then
    echo "[$1] 🔴 **파일이 안 바뀌었다 — 앵커가 없다.** 판정 안 함" | tee -a "$SUMMARY"
    # 앵커가 죽었는지 python 문법이 틀렸는지 갈라 준다 — 둘은 고치는 자리가 다르다.
    tail -3 "$PYERR" 2>/dev/null | sed 's/^/       /'
    : > "$PYERR"
    restore; return
  fi
  python scripts/qa/probe-elem-figure.py > "$after" 2>&1
  if cmp -s "$BEFORE" "$after"; then
    echo "[$1] 🔴 **산출물이 그대로다 — 동작을 안 바꾸는 변이다.** 판정 안 함" | tee -a "$SUMMARY"; restore; return
  fi
  # 실패한 **시험 이름**까지 찍는다. 「Tests N failed」만으로는 «어느 단언이 죽었나»를
  # 모른다 — 한 변이가 여러 kind 를 건드리면 엉뚱한 것이 빨개져도 🔴 로 보인다.
  local out r names
  out=$(npx vitest run src/__tests__/unit/elementaryFigure.test.ts 2>&1)
  r=$(echo "$out" | grep -oE "Tests +[0-9]+ failed" | head -1)
  names=$(echo "$out" | grep -oE "^ *× .*" | sed 's/^ *× //; s/ [0-9]*ms$//' | sort -u \
            | head -6 | sed 's/^/      · /')
  # 🔴 **빨간데 «실패한 시험 이름»을 못 대면 판정하지 않는다** (g5 가 데인 자리).
  #    러너가 기동에서 죽으면(경합으로 워커를 못 띄움 · 없어진 리포터 이름 등) 종료 코드만
  #    1 이고 실패 목록이 **비어 있다.** 그것을 RED 로 읽으면 **모든 변이가 빨강**이 되어
  #    하네스가 도장이 된다 — 「가드가 문다」가 진실에 따라 안 변한다.
  #    징후는 **판정 줄은 빨간데 근거 줄이 비는 것**뿐이라 눈으로는 잘 안 보인다.
  if [ -n "$r" ] && [ -z "$names" ]; then
    echo "[$1] 🔴 **빨간데 실패한 시험을 못 댄다 — 러너가 죽었을 수 있다.** 판정 안 함"       | tee -a "$SUMMARY"
    echo "$out" | tail -4 | sed 's/^/       /'
    restore; return
  fi
  echo "[$1] ${r:-🟢 전부 초록 ← 가드가 아니다}" | tee -a "$SUMMARY"
  [ -n "$names" ] && echo "$names"
  restore
}

# ① 숨은 모서리를 면 **뒤**에 깐다 (원래 결함: 칠에 덮여 막힌 덩어리)
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = """    parts = (
        [svg for _, svg in faces]
        + [_poly(top, FACE_TOP, 1.2)]
        + _hidden_lines(view, verts3, faces_idx)
    )"""
assert old in s, "앵커 없음 ①"
new = """    parts = (
        _hidden_lines(view, verts3, faces_idx)
        + [svg for _, svg in faces]
        + [_poly(top, FACE_TOP, 1.2)]
    )"""
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "각기둥 숨은 모서리를 면 뒤로"

# ② 모선(꼭대기에 닿는) 숨은 모서리를 빼먹는다 — 원장님이 찍으신 「모선 점선이 없음」
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    return sorted(e for e, flags in seen.items() if len(flags) == 2 and all(flags))"
assert old in s, "앵커 없음 ②"
new = ("    last = len(verts3) - 1\n"
       "    return sorted(e for e, flags in seen.items()\n"
       "                  if len(flags) == 2 and all(flags) and last not in e)")
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "모선 숨은 모서리 빼먹기"

# ③ 원기둥·원뿔을 사방(45°) 투영으로 되돌린다 — 밑면이 기울어 「타원기둥」이 된다
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "ROUND_DEG = 90.0"
assert old in s, "앵커 없음 ③"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "ROUND_DEG = 45.0  # 변이", 1))
PY
run "원기둥 밑면을 기운 타원으로"

# ④ 원기둥 옆면을 네 점 사각형으로 — 밑면을 가로지르는 실선이 남는다
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        _poly(near_top + near_bot, FACE_FRONT, 1.15),"
assert old in s, "앵커 없음 ④"
new = ("        _poly([near_top[0], near_top[-1], near_bot[0], near_bot[-1]],\n"
       "              FACE_FRONT, 1.15),")
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "원기둥 옆면을 네 점 사각형으로"

# ⑤ viewBox 맞춤을 끈다 — 전개도 꼭짓점이 다시 잘려야 한다
python - "$BASE" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    box = _body_bbox(body)\n    if box is not None:"
assert old in s, "앵커 없음 ⑤"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, "    box = _body_bbox(body)\n    if False:  # 변이", 1)
)
PY
run "viewBox 맞춤 끄기"

# ⑥ 마름모에 라벨을 되돌린다 — 원장님이 「너저분하다」고 빼기로 하신 그것
#    (예전 변이는 「날 텍스트로 되돌리기」였는데 그 코드가 통째로 사라져 앵커가 죽었다.
#     변이는 **지금 지키는 규칙**을 겨눠야 낡지 않는다.)
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '        parts.append(_line(pts[1], pts[3], sw=1.05, dash="5 4"))'
assert old in s, "앵커 없음 ⑥"
new = old + '\n        parts.append(_text(cx, cy + 13, f"{_n(base)} cm", size=12))  # 변이'
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "마름모에 라벨 되돌리기"

# ⑮ 마름모 대각선 점선을 뺀다 — 라벨을 뺐으니 이 선마저 없으면 넓이 규칙이 안 보인다
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '        parts.append(_line(pts[0], pts[2], sw=1.05, dash="5 4"))\n'
assert old in s, "앵커 없음 ⑮"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "", 1))
PY
run "마름모 대각선 점선 빼기"

# ⑦ 등변 tick·직각 기호를 기본으로 켠다 — 그림이 답을 알려 준다
#    ⚠️ 함수 기본값(`marks: bool = False`)을 바꾸는 변이는 **산출물이 그대로**다 —
#       부르는 쪽이 늘 값을 넘기므로 기본값을 안 탄다. 부르는 자리를 바꿔야 한다.
python - "$BASE" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '        marks = item.get("marks", False)'
assert old in s, "앵커 없음 ⑦"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, '        marks = item.get("marks", True)  # 변이', 1)
)
PY
run "등변 tick 기본 켜기"

# ⑧ 겹침 회피 회전을 끈다 — 숨은 점선이 실선 모서리에 달라붙어야 한다
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    base += _spread_rotation(n, base, ratio, deg, apex_h)"
assert old in s, "앵커 없음 ⑧"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    base += 0.0  # 변이", 1))
PY
run "꼭짓점 겹침 회피 회전 끄기"

# ⑨ 도형 항목 키 검사를 뺀다 — 오타가 조용히 무시된다
python - "$BASE" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        extra = set(item) - _SHAPE_ITEM_KEYS"
assert old in s, "앵커 없음 ⑨"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        extra = set()  # 변이", 1))
PY
run "도형 항목 오타 키 허용"

# ⑩ viewBox 는 넓히되 **내용은 안 민다** — 음수 쪽으로 나간 것은 그대로 잘린다.
#    ⑤ 가 초록이어도 이쪽이 안 걸리면 「넓히기」만 지키고 「밀기」는 안 지키는 것이다.
python - "$BASE" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "            body = _shift_body(body, dx, dy)"
assert old in s, "앵커 없음 ⑩"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "            pass  # 변이", 1))
PY
run "내용 밀기 끄기 (넓히기만)"

# ⑪ 이등변삼각형 밑변을 되돌린다 — 표시가 꺼진 채로 정삼각형과 안 갈린다(실측 3.93px)
python - "$BASE" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "ISO_TRI_BASE = 0.58"
assert old in s, "앵커 없음 ⑪"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "ISO_TRI_BASE = 1.0  # 변이", 1))
PY
run "이등변삼각형 밑변 되돌리기"

# ⑫ 사다리꼴 높이 값을 뺀다 — 지면에 설명 없는 점선이 남는다
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, re, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
m = re.search(r"        parts\.append\(\n            _length_mark\(hx.*?\n        \)\n", s, re.S)
assert m, "앵커 없음 ⑫"
io.open(p, "w", encoding="utf-8").write(s[: m.start()] + s[m.end() :])
PY
run "사다리꼴 높이 값 빼기"

# ⑬ 마름모 세로를 다시 `height` 로 — 적힌 `d2` 와 그림이 갈린다
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '    vertical = _num(spec.get("d2", height), "d2", 0.5, 40) if shape == "rhombus" else height'
assert old in s, "앵커 없음 ⑬"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    vertical = height  # 변이", 1))
PY
run "마름모 세로를 height 로 되돌리기"

# ⑭ `diamond` 를 키워 **정사각형을 45° 돌린 것**과 합동으로 만든다.
#    ⚠️ 2026-08-24 병합이 이 좌표를 `_shape_points` 안 **한 줄**로 옮겨 앵커가 죽었다.
#    「판정 안 함」으로 빠져 회차가 exit 1 이 됐다 — 조용히 통과하지 않는 것을 확인했다.
#    이 변이의 값어치: **하우스도르프 거리는 9.1px 로 초록**이다(자세가 달라 멀어 보인다).
#    회전 불변 지문만 이것을 잡는다 — 두 축이 서로를 갈음하지 못한다는 증거다.
python - "$BASE" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        return [(ox + s / 2, oy), (ox + s, oy + s / 2), (ox + s / 2, oy + s), (ox, oy + s / 2)]"
assert old in s, "앵커 없음 ⑭"
new = ("        return [(ox + s / 2, oy - s * 0.2071), (ox + s * 1.2071, oy + s / 2), "
       "(ox + s / 2, oy + s * 1.2071), (ox - s * 0.2071, oy + s / 2)]  # 변이")
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "마름모를 돌린 정사각형과 합동으로"

# ⑯ 원기둥에 반지름 라벨을 되돌린다 — 원장님이 「이중표기」라 빼기로 하신 것
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    _ = rim\n    return _svg(svg_w, svg_h,"
assert old in s, "앵커 없음 ⑯"
new = ('    parts.append(\n'
       '        _length_mark(c_top[0], c_top[1], rim[0], rim[1], f"{_n(r)} cm",\n'
       '                     off=-9.0, fs=12)\n'
       '    )  # 변이\n'
       '    return _svg(svg_w, svg_h,')
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "원기둥에 반지름 라벨 되돌리기"

# ⑰ 원기둥 **높이까지** 뺀다 — 발문에 없는 값이라 남겨야 한다(설명 없는 점선 방지)
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, re, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
m = re.search(r"    parts\.append\(\n        _length_mark\(\n            tl\[0\].*?\n    \)\n", s, re.S)
assert m, "앵커 없음 ⑰"
io.open(p, "w", encoding="utf-8").write(s[: m.start()] + s[m.end() :])
PY
run "원기둥 높이까지 빼기"

# ⑱ 구에 날 텍스트 반지름을 되돌린다 — §4-16 위반이 다시 나야 한다
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    _ = r\n    return _svg(140, 120,"
assert old in s, "앵커 없음 ⑱"
new = ('    parts.append(_text(cx, cy + pr + 12, f"반지름 {_n(r)} cm", size=11))  # 변이\n'
       '    return _svg(140, 120,')
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "구에 날 텍스트 반지름 되돌리기"

# ⑲ 는 **kind 별로 쪼갠다.** `ROUND_RATIO` 하나를 바꾸면 원기둥·원뿔이 같이 움직여서,
#    **원뿔 자가 죽어 있어도 원기둥이 빨개져 🔴 로 찍힌다** — 파일 단위 판정은 「어느
#    단언이 죽었나」를 말해 주지 않는다(team-lead 지적). 상수를 늘리지 않고 **부르는
#    자리**를 겨눠 나눈다. 앞 인자가 서로 달라 앵커가 갈린다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "bot3 + top3, scale, (40.0, 24.0, 30.0, 24.0), ratio=ROUND_RATIO, deg=ROUND_DEG"
assert old in s, "앵커 없음 ⑲a"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, old.replace("ratio=ROUND_RATIO", "ratio=0.30"), 1)
)
PY
run "원기둥만 비율 되돌리기 (0.15 → 0.30)"

python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "base3 + [apex3], scale, (18.0, 20.0, 18.0, 16.0), ratio=ROUND_RATIO, deg=ROUND_DEG"
assert old in s, "앵커 없음 ⑲b"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, old.replace("ratio=ROUND_RATIO", "ratio=0.30"), 1)
)
PY
run "원뿔만 비율 되돌리기 (0.15 → 0.30)"

# ⑳ 구의 적도만 상수에서 떼어 낸다 — **배선이 한쪽만** 되던 그 자리를 지킨다.
#    예전에는 여기가 날 리터럴 `0.32` 라 `ROUND_RATIO` 를 조여도 구는 안 따라왔다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = 'ry="{_n(pr * ROUND_RATIO)}"'
assert old in s, "앵커 없음 ⑳"
io.open(p, "w", encoding="utf-8").write(s.replace(old, 'ry="{_n(pr * 0.32)}"', 1))
PY
run "구만 상수에서 떼어 내기 (0.15 → 0.32)"

# ㉑ 걸음 사다리를 못 올라가게 한다 — 옛 규칙(`≤8→1 · ≤12→2 · 그 위 5`)으로 되돌린다.
#    「눈금 231줄」이 바로 이 상태다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = """    base = 1 if y_max <= 8 else (2 if y_max <= 12 else 5)
    for step in NICE_STEPS:
        if step >= base and _tick_count(y_max, step) <= MAX_Y_TICKS:
            return step
    return NICE_STEPS[-1]"""
assert old in s, "앵커 없음 ㉑"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, "    return 1 if y_max <= 8 else (2 if y_max <= 12 else 5)", 1)
)
PY
run "걸음 사다리 끄기 (옛 규칙으로)"

# ㉒ 상한을 8로 낮춘다 — **결함이 아닌 장 829장**을 같이 바꾸는 변이다.
#    「9는 읽기 좋은 수가 아니라 지금 규칙이 내는 최대」를 지킨다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "MAX_Y_TICKS = 9"
assert old in s, "앵커 없음 ㉒"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "MAX_Y_TICKS = 8", 1))
PY
run "눈금 상한 9 → 8 (멀쩡한 장까지 바꾼다)"

# ㉓ 축 맨 위를 안 올린다 — `yMax` 를 그대로 쓴다. 제일 높은 점이 눈금 위로 뜬다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        if need <= top:\n            return top, step\n        top = float(need)"
assert old in s, "앵커 없음 ㉓"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        return top, step", 1))
PY
run "축 맨 위 안 올리기 (yMax 를 그대로)"

# ㉔ 되풀이를 한 번만 — 걸음이 커지면서 필요한 높이가 또 달라지는 맞물림을 놓친다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    for _ in range(len(NICE_STEPS) + 1):"
assert old in s, "앵커 없음 ㉔"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    for _ in range(1):", 1))
PY
run "축·걸음 맞물림 한 번만 돌기"

# ㉕ 눈금만 새 축을 쓰고 **막대는 옛 yMax 로** 그린다 — 배선이 한쪽만 된 상태.
#    값으로만 재는 검사는 이걸 통과시킨다. 픽셀로 재야 걸린다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        h = 0 if axis_top <= 0 else min(plot_h, plot_h * val / axis_top)"
assert old in s, "앵커 없음 ㉕"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, "        h = 0 if y_max <= 0 else min(plot_h, plot_h * val / y_max)", 1)
)
PY
run "막대만 옛 자로 그리기 (눈금은 새 축)"

# ㉖ 꺾은선도 같은 자리 — 막대만 배선하고 꺾은선을 잊는 것을 지킨다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        y = top + plot_h - (0 if axis_top <= 0 else min(plot_h, plot_h * val / axis_top))"
assert old in s, "앵커 없음 ㉖"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, "        y = top + plot_h - (0 if y_max <= 0 else min(plot_h, plot_h * val / y_max))", 1)
)
PY
run "꺾은선만 옛 자로 그리기 (눈금은 새 축)"

# ㉗ 눈금을 그을 때 **넘겨받은 걸음을 버리고** `_y_step` 을 다시 부른다 —
#    스펙의 yStep 이 조용히 무시되어 「한 칸 3명」 발문 옆에 5명 간격이 그려진다 (D-70).
#    (옛 앵커는 인라인 `v = 0` 루프였는데 눈금이 `_plot_axes`/`_tick_values` 로
#     리팩터링되며 죽었다 — 2026-08-23 재수리. 변이는 **지금 지키는 규칙**을 겨눈다:
#     `_plot_axes` 주석이 「여기서 `_y_step` 을 다시 부르면 안 된다」인 바로 그 자리.)
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = """    for v in _tick_values(axis_top, step):"""
assert s.count(old) == 1, "앵커 없음 ㉗"
new = """    step = _y_step(axis_top)
    for v in _tick_values(axis_top, step):"""
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "눈금이 yStep 을 버리고 _y_step 을 다시 부른다"

# ㉘ `_axis_top` 이 yStep 을 통째로 무시하고 사다리를 탄다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    if y_step is not None:"
assert old in s, "앵커 없음 ㉘"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    if False:", 1))
PY
run "축 계산이 yStep 을 통째로 무시한다"

# ㉙ 못 그리는 yStep 에서 **던지는 대신 조용히 사다리로** 올린다 — D-67 이 그 유형을
#    뺐던 바로 그 결함이다. 에러가 안 나고 학생만 틀린다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = """        if ticks > MAX_Y_TICKS:
            raise ValueError("""
assert old in s, "앵커 없음 ㉙"
new = """        if ticks > MAX_Y_TICKS:
            return top, _y_step(top)
        if False:
            raise ValueError("""
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
run "못 그리는 yStep 을 던지지 않고 사다리로 올린다"

# ㉚ 단위 라벨을 **옛 자리**(축 끝 +6)로 되돌린다 — 마지막 눈금 숫자와 겹친다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        unit_x = left + plot_w + _digits_half(last) + UNIT_GAP"
assert old in s, "앵커 없음 ㉚"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        unit_x = left + plot_w + UNIT_GAP", 1))
PY
run "가로형 단위 라벨을 눈금 위로 되돌리기 (겹침)"

# ㉛ 눈금 겹침 가드를 끈다 — 「0100200300…」 덩어리가 지면으로 나간다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    _assert_ticks_fit(_tick_values(axis_top, step), plot_w)\n"
assert old in s, "앵커 없음 ㉛"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "", 1))
PY
run "값 눈금 겹침 가드 끄기"

# ㉜ 단위 라벨 몫으로 viewBox 를 넓히지 않는다 — 닫는 괄호가 잘린다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        width = max(width, unit_x + _label_w_max(ylab) + 4)\n"
assert old in s, "앵커 없음 ㉜"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "", 1))
PY
run "가로형 viewBox 를 단위 라벨만큼 안 넓히기 (잘림)"

# ㉝ 짝의 「눈금 글자가 본문 이상인가」 가드를 끈다 — 열에 넣으면 작아지는 그림이 나간다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    _assert_ticks_readable(total_w)\n"
assert old in s, "앵커 없음 ㉝"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "", 1))
PY
run "짝 눈금 글자 크기 가드 끄기"

# ㉞ **`TICK_MIN_GAP` 을 3 → 4 로.** 짝의 여유가 0.06px 뿐이라 이 상수가 움직이면
#    눈금 글자가 본문 아래로 내려간다. 가드가 그 상수에서 계산되는지 확인하는 변이다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "TICK_MIN_GAP = 3.0"
assert old in s, "앵커 없음 ㉞"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "TICK_MIN_GAP = 4.0", 1))
PY
run "눈금 사이 틈 3 → 4 (짝이 본문 아래로)"

# ㉟ 제목 폭 가드를 끈다 — 긴 제목이 옆 그래프를 침범한다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    if want > plot_w:"
assert old in s, "앵커 없음 ㉟"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    if False:", 1))
PY
run "제목 폭 가드 끄기"

# ㊱ 안쪽 그래프를 **단독 폭**으로 그린다(compact 를 안 쓴다) — 짝이 498단위가 된다.
python - "$ADV" 2>>"$PYERR" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = 'svg = ADV_RENDER[kind]({**inner, "version": "elem-1"}, compact=True)'
assert old in s, "앵커 없음 ㊱"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, 'svg = ADV_RENDER[kind]({**inner, "version": "elem-1"}, compact=False)', 1)
)
PY
run "짝 안쪽을 단독 폭으로 그리기"

# ㊲ 지워진 막대를 **축 절반 높이**로 굳힌다 — 점선 상자는 값 축 전체여야 한다.
#    절반이면 「이 정도 값」으로 읽혀 그림이 없는 답을 암시한다.
python - "$ADV" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '            parts.append(_rect(x, top, bw, plot_h, fill="none", sw=1.05, dash=UNKNOWN_DASH))'
assert old in s, "앵커 없음 322"
new = '            parts.append(_rect(x, top + plot_h / 2, bw, plot_h / 2, fill="none", sw=1.05, dash=UNKNOWN_DASH))'
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "지워진 막대를 축 절반 높이로"

# ㊳ unknown 과 value 를 같이 실어도 통과시킨다 — **참값이 스펙에 들어온다**(답이 샌다).
python - "$ADV" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '            if "value" in item:'
assert old in s, "앵커 없음 323"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "            if False:", 1))
MUT
run "unknown 에 value 를 같이 실어도 통과"

# ㊴ 값 0 에서도 rect 를 그린다 — 정제기가 던져 **그림이 통째로 안 나간다**.
python - "$ADV" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "            if h > 0:\n                parts.append(_rect(x, y, bw, h, fill=CHART[i % len(CHART)], sw=1.05))"
assert old in s, "앵커 없음 324"
new = "            parts.append(_rect(x, y, bw, h, fill=CHART[i % len(CHART)], sw=1.05))"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "값 0 에서도 크기 0 막대를 그린다"

# ㊵ **markedShape**(② 도형 위 표시) — 같은 무리로 묶은 두 변의 **길이를 어긋낸다**.
#    tick 은 그대로 찍히므로 「표시가 거짓말하는」 그림이 된다. 값 검산으로는 안 보인다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        return [(ox + s / 2 - half, oy + s), (ox + s / 2, oy), (ox + s / 2 + half, oy + s)]"
assert old in s, "앵커 없음 325"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, old.replace("(ox + s / 2, oy)", "(ox + s / 2 + 6, oy)"), 1)
)
MUT
run "markedShape 다리 두 변을 어긋냄 (tick 은 그대로)"

# ㊶ 직각 기호를 안 그린다 — 초등 직각은 **작은 정사각형**이다(엔진 A 는 호로 그린다).
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "            parts.append(_right_mark(pts[i], pts[(i - 1) % n], pts[(i + 1) % n]))"
assert old in s, "앵커 없음 326"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "            pass  # 변이", 1))
MUT
run "markedShape 직각 기호 안 그리기"

# ㊷ 변 라벨을 `measured()` 가 아니라 **날 텍스트**로 (09 §4-16 위반).
#    ⚠️ 이 변이는 describe **밖**의 「어느 kind 든 cm 라벨은 halo」가 잡는다 —
#       `-t` 로 이름을 좁히면 그 검사가 안 돌아 «가드가 아니다»로 보인다. 실제로 속았다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "            _length_mark(a[0], a[1], b[0], b[1], str(label), off=-11.0 if outward > 0 else 11.0)"
assert old in s, "앵커 없음 327"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, "            _text(mx, my, str(label), size=12)  # 변이", 1)
)
MUT
run "markedShape 변 라벨을 날 텍스트로"

# ㊸ **모양 목록을 ⑧(namedShapes)과 갈라 놓는다** — 두 kind 가 `_shape_points` 하나를
#    쓰는 것이 이 설계의 핵심이다. 갈라지면 한쪽만 늘어나도 아무도 모른다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    pts = _shape_points(kind, pad, pad, size)"
assert old in s, "앵커 없음 328"
new = "    pts = [(x, y * 0.8) for x, y in _shape_points(kind, pad, pad, size)]  # 변이"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "markedShape 모양 목록을 namedShapes 와 갈라 놓기"

# ⚠️ 차트의 «가려진 값» 선언(`CHART_ACCEPTS_UNKNOWN`) 변이는 **여기 없다.**
#    그 축은 **산출물을 안 바꾼다** — 값은 똑같이 나오고 갈라지는 것은 「표를 뒤집었을 때
#    두 호출부가 따라오는가」뿐이다. 이 하네스의 ⑵단계(산출물이 바뀌었나)가 그것을
#    「동작을 안 바꾸는 변이」로 **옳게** 걸러 낸다. 판정 수단이 다르므로 자리도 다르다:
#    → `scripts/qa/mutate-chart-unknown.sh` (판정은 `probe-chart-unknown.py`)

# ㊹ **정n각형을 ⑧ 고르기 목록에 넣는다** — 윤곽으로 안 갈리는데 「고르시오」가 된다.
#    실측: 넣으면 바닥이 7.92px → 2.18px(heptagon↔octagon), 문턱 아래 7쌍.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '        "irregQuad",' + chr(10) + "    }" + chr(10) + ")"
assert old in s, "앵커 없음 331"
new = ('        "irregQuad",' + chr(10)
       + '        "pentagon", "hexagon", "heptagon", "octagon",  # 변이' + chr(10)
       + "    }" + chr(10) + ")")
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "정n각형을 고르기 목록에 넣기 (윤곽으로 안 갈린다)"

# ㊺ **대각선을 이웃까지 잇는다** — 개수가 n(n-3)/2 를 넘어 발문의 답과 갈린다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "            for j in range(i + 2, n):"
assert old in s, "앵커 없음 332"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, "            for j in range(i + 1, n):  # 변이", 1)
)
MUT
run "대각선이 이웃 꼭짓점까지 잇는다"

# ㊻ **정n각형을 «정»답지 않게 그린다** — 반지름을 꼭짓점마다 흔들면 변 길이가 갈린다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "            cx + r * math.sin(2 * math.pi * i / n),"
assert old in s, "앵커 없음 333"
new = "            cx + r * (1 + 0.06 * (i % 2)) * math.sin(2 * math.pi * i / n),  # 변이"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "정n각형을 찌그러뜨린다 (변 길이가 갈린다)"

# ㊹ **비율을 안 맞춘다** — 적힌 `sides` 를 무시하고 관례 도형을 그린다.
#    이것이 elem-g4 가 배선하며 찾은 그 결함이다(「5,5,9」의 밑변을 제일 짧게).
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        pts = _triangle_points(nums, angs, pad, size) or pts"
assert old in s, "앵커 없음 334"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        pass  # 변이", 1))
MUT
run "적힌 sides 를 무시하고 관례 도형을 그린다"

# ㊺ **삼각부등식을 안 본다** — 「3,4,9」가 조용히 그려진다(값이 불가능한데 그림이 멀쩡).
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        if a + b <= c or b + c <= a or c + a <= b:"
assert old in s, "앵커 없음 335"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        if False:  # 변이", 1))
MUT
run "삼각부등식을 안 본다"

# ㊻ **관례 각을 납작하게** — 적힌 비는 맞지만 지면에서 안 읽힌다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "PARA_DEFAULT_DEG = 65.0"
assert old in s, "앵커 없음 336"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "PARA_DEFAULT_DEG = 20.0  # 변이", 1))
MUT
run "평행사변형 관례 각을 납작하게"

# ㊼ **`_EQUILATERAL` 에 «변이 다른» 도형을 넣는다** — 손 목록이 거짓말하는 자리.
#    `trap`(60·90·100·90)을 넣으면 「한 변 5cm」가 통과하는데 **그림은 네 변이 다르다.**
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '_EQUILATERAL = frozenset({"square", "diamond", "tallDiamond"}) | _NGON_KINDS'
assert old in s, "앵커 없음 337"
new = '_EQUILATERAL = frozenset({"square", "diamond", "tallDiamond", "trap"}) | _NGON_KINDS  # 변이'
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "같은변 목록에 trap 을 넣는다 (손 목록이 거짓말)"

# ㊽ **직사각형이 이웃 두 변의 비를 안 지킨다** — 4:7 인데 관례 비로 그린다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '        pts = _para_points(nums, angs, pad, size, right=(kind == "rect")) or pts'
assert old in s, "앵커 없음 338"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        pass  # 변이", 1))
MUT
run "직사각형·평행사변형이 변의 비를 안 지킨다"

# ㊾ **모순인 값을 조용히 받는다** — 정사각형에 8·5 를 적어도 그린다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        if len(set(vals)) > 1:"
assert old in s, "앵커 없음 339"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "        if False:  # 변이", 1))
MUT
run "같은변 도형에 서로 다른 값을 조용히 받는다"

# ⑥ tiling — **크기 비를 무시**하고 조각을 고정 크기로. 발문의 값이 그림에서 사라진다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    small = big * ps / ts"
assert old in s, "앵커 없음 340"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    small = big * 0.5  # 변이", 1))
MUT
run "tiling 이 크기 비를 무시한다"

# ⑥ **채운 모습을 그린다** — 조각을 목표 위에 얹으면 **세면 답**이다(D-66 ⑺).
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    parts.append(_poly_pts(_shape_points(target, pad + small + gap, pad, big)))"
assert old in s, "앵커 없음 341"
new = old + chr(10) + "    parts.append(_poly_pts(_shape_points(piece, pad + small + gap, pad, small)))  # 변이"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "tiling 이 채운 모습을 그린다 (답이 샌다)"

# ③ 라벨이 **같은 직선**에 붙는다 — 모양은 맞는데 이름이 새는 자리.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        name_at = [(pad, y0), (pad, y1)]"
assert old in s, "앵커 없음 342"
io.open(p, "w", encoding="utf-8").write(
    s.replace(old, "        name_at = [(pad, y0), (pad + w, y0)]  # 변이", 1)
)
MUT
run "lineRelation 두 이름이 같은 직선에 붙는다"

# ── ① circleParts (초3 2-3) ────────────────────────────────────────────────
# 이 소단원은 **묻는 것과 그리는 것이 같아지기 쉽다** — 변이 다섯 중 둘이 그 부류다.

# ① **용어를 적는다** — 2-3-1 이 「이 선분을 무엇이라 하는지」를 묻는다. 적으면 답이다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    return _svg(pad * 2 + rad * 2, pad * 2 + rad * 2, "
assert s.count(old) == 1, "앵커 없음 350"
new = ("    parts.append(f'<text x=\"{_n(cx)}\" y=\"14\">반지름</text>')  # 변이" + chr(10) + old)
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "circleParts 가 «반지름» 이라고 적는다 (2-3-1 의 답)"

# ① **둘 다 받는다** — 반지름과 지름을 함께 그리면 「구하라」가 성립하지 않는다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    if r_lab is not None and d_lab is not None:"
assert s.count(old) == 1, "앵커 없음 351"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    if False:  # 변이", 1))
MUT
run "circleParts 가 반지름·지름을 둘 다 그린다 (답이 샌다)"

# ① **지름이 중심을 안 지난다** — 라벨은 «지름»인데 그린 것은 현. 값을 배반하는 부류.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        parts.append(_seg((cx - rad, cy), (cx + rad, cy), sw=1.3))"
assert s.count(old) == 1, "앵커 없음 352"
new = "        parts.append(_seg((cx - rad * 0.866, cy - rad * 0.5), (cx + rad * 0.866, cy - rad * 0.5), sw=1.3))  # 변이"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "circleParts 의 지름이 중심을 안 지난다"

# ① **지름 = 반지름 × 2 가 그림에서 거짓** — 좌표로 재지 않으면 이 부류는 침묵한다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        parts.append(_seg((cx - rad, cy), (cx + rad, cy), sw=1.3))"
assert s.count(old) == 1, "앵커 없음 353"
new = "        parts.append(_seg((cx - rad * 0.7, cy), (cx + rad * 0.7, cy), sw=1.3))  # 변이"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "circleParts 의 지름 길이가 반지름의 두 배가 아니다"

# ① **중심점을 안 그린다** — 「무엇에서 잰 길이인가」가 지면에서 사라진다(09 §4-16).
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    if spec.get(\"center\", True):"
assert s.count(old) == 1, "앵커 없음 354"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    if False:  # 변이", 1))
MUT
run "circleParts 가 중심점을 안 그린다"

# ① **치수가 measured() 가 아니다** — halo·점선이 빠지면 「잰 길이」로 안 읽힌다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        parts.append(_length_mark(cx, cy, ex, ey, str(r_lab), off=-10.0))"
assert s.count(old) == 1, "앵커 없음 355"
new = ("        parts.append(f'<text x=\"{_n(cx)}\" y=\"{_n(cy)}\">{r_lab}</text>')  # 변이")
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "circleParts 치수가 measured() 가 아니다 (맨 글자)"

# ① `show` 가 **치수를 적는다** — 「그린다」와 「적는다」를 가른 그 축.
#    이 변이가 없으면 «선분만»이라는 약속을 아무도 안 지킨다(2026-08-24 리드 지적).
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        if r_lab is not None:" + chr(10) + "            parts.append(_length_mark(cx, cy, ex, ey, str(r_lab), off=-10.0))"
assert s.count(old) == 1, "앵커 없음 356"
new = ("        parts.append(_length_mark(cx, cy, ex, ey, str(r_lab or " + chr(39) + "반지름" + chr(39) + "), off=-10.0))  # 변이")
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
MUT
run "circleParts show 가 치수·용어를 적는다"

# ① `show` 가 **선분을 안 그린다** — 그러면 2-3-1 그림이 다시 빈 원이 된다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '    if r_lab is not None or show == "radius":'
assert s.count(old) == 1, "앵커 없음 357"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    if r_lab is not None:  # 변이", 1))
MUT
run "circleParts show radius 가 선분을 안 그린다"

# ① `show` 가 **모르는 값을 조용히 받는다** — 오타가 빈 원으로 나간다.
python - "$BASE" 2>>"$PYERR" <<'MUT'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = '    if show is not None and show not in ("radius", "diameter"):'
assert s.count(old) == 1, "앵커 없음 358"
io.open(p, "w", encoding="utf-8").write(s.replace(old, "    if False:  # 변이", 1))
MUT
run "circleParts show 가 모르는 값을 조용히 받는다"


restore
judged=$(grep -c "^\[" "$SUMMARY")
if [ -n "$ONLY" ]; then
  declared=$(grep '^run "' "$0" | grep -c -- "$ONLY")
else
  declared=$(grep -c '^run "' "$0")
fi
skipped=$(grep -c "판정 안 함" "$SUMMARY")
notguard=$(grep -c "전부 초록" "$SUMMARY")
echo
[ -n "$ONLY" ] && echo "⚠️ **거른 회차다** — 이름에 «$ONLY» 가 든 것만. 전량은 MUTATE_ONLY 없이 돌려라."
echo "── 판정 전량 (판정 $judged / 스크립트에 적힌 변이 $declared) ──"
cat "$SUMMARY"
echo
# 🔴 **기록에 남기는 것과 실패로 세는 것은 다르다.** 2026-08-22 에 앵커가 죽어
#    판정조차 안 된 변이가 잘린 출력 안에 숨어 있었고, 나머지만 보고 「전부 빨강」이라고
#    적을 뻔했다. 「앵커가 없다」는 「가드가 튼튼하다」가 아니라 **「변이가 무효다」**이고,
#    「산출물이 그대로다」는 **「표본이 그 자리를 안 건드린다」**이다 — 둘 다 결함이다.
#    게이트는 통과 수가 아니라 **분모**를 먼저 지킨다(CLAUDE.md 2026-08-19).
fail=0
if [ "$judged" -ne "$declared" ]; then
  echo "🔴 **판정 수($judged)가 변이 수($declared)와 다르다** — 중간에 건너뛴 것이 있다"
  fail=1
fi
if [ "$skipped" -ne 0 ]; then
  echo "🔴 **판정 안 한 변이 $skipped 개** — 앵커가 죽었거나 표본이 그 자리를 안 건드린다."
  echo "   그 변이들은 **아무것도 증명하지 않았다.** 고쳐서 다시 돌려라:"
  grep "판정 안 함" "$SUMMARY" | sed 's/^/     /'
  fail=1
fi
if [ "$notguard" -ne 0 ]; then
  echo "🔴 **망가뜨렸는데 초록인 변이 $notguard 개** — 그 시험은 가드가 아니다"
  fail=1
fi
if [ "$baseline_bad" -ne 0 ]; then
  echo "🔴 **무변이 기준선이 빨갛다** — 위 빨강들이 변이 때문인지 알 수 없다"
  fail=1
fi
# g5 규약: **끝나도 남긴다** — 회차가 끝난 뒤에도 「무엇을 언제 돌렸나」를 추적할 근거.
{ echo "{"; echo "  \"harness\": \"elem-figure\","; echo "  \"judged\": $judged,";
  echo "  \"declared\": $declared,"; echo "  \"skipped\": $skipped,";
  echo "  \"notguard\": $notguard,"; echo "  \"filtered\": \"${ONLY:-}\""; echo "}"; } > "$LAST"
[ "$fail" -eq 0 ] && echo "✅ 변이 $declared 개 전부 판정됐고 전부 빨강이다"
echo "원상 복구 완료"
exit "$fail"
