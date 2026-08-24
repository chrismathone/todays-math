#!/usr/bin/env bash
# Decision Log 번호 가드(`decisionLogNumbers.test.ts`)가 **진짜 무는지** 변이로 확인한다.
#
#   bash scripts/qa/mutate-decision-log-numbers.sh
#
# ⚠️ 이 스크립트는 **대상 파일을 덮어쓴다.** 복원은 `git` 이 아니라 **시작할 때 읽어 둔
#    사본**으로 한다 — 대상이 커밋 안 된 상태일 수 있고, 그때 `git checkout` 으로 되돌리면
#    **내 수정을 남의 것으로 덮는다**(2026-08-23 에 실제로 그랬다).
#
# 순서는 셋이다(2026-08-21 교훈):
#   ⑴ 기준이 초록인가  ⑵ 변이로 파일이 실제로 바뀌었나  ⑶ 그제서야 시험이 빨개지나
# ⑵ 를 건너뛰면 치환이 헛돌아도 「가드가 아니다」로 찍혀 **멀쩡한 가드를 고치러 간다.**
set -u

TEST="src/__tests__/unit/decisionLogNumbers.test.ts"
DOC7="docs/planning/07-coding-convention.md"
DOC5="docs/planning/05-design-system.md"
DOC1="docs/planning/01-prd.md"
BK="$(mktemp -d)"
trap 'for f in "$DOC7" "$DOC5" "$DOC1" "$TEST"; do cp "$BK/$(echo "$f" | tr / _)" "$f"; done; rm -rf "$BK"' EXIT

for f in "$DOC7" "$DOC5" "$DOC1" "$TEST"; do cp "$f" "$BK/$(echo "$f" | tr / _)"; done

run() { npx vitest run "$TEST" --reporter=default >/tmp/mut-out.txt 2>&1; }

echo "▸ 음성 대조 — 변이 전에는 초록이어야 한다"
if ! run; then
  echo "🔴 기준이 이미 빨갛다. 변이 판정을 **거부한다** (판정자가 도장이 된다)."
  tail -20 /tmp/mut-out.txt
  exit 2
fi
echo "  ✅ 기준 초록"

mutate() { # 이름 파일 옛것 새것
  local name=$1 file=$2 old=$3 new=$4
  local before after
  before=$(md5sum "$file" | cut -d' ' -f1)
  python - "$file" "$old" "$new" <<'PY'
import io,sys
p,old,new=sys.argv[1],sys.argv[2],sys.argv[3]
s=io.open(p,encoding="utf-8").read()
io.open(p,"w",encoding="utf-8",newline="").write(s.replace(old,new,1))
PY
  after=$(md5sum "$file" | cut -d' ' -f1)
  if [ "$before" = "$after" ]; then
    echo "⚠️  $name — **파일이 안 바뀌었다**. 치환이 헛돌았으니 판정하지 않는다."
    return 2
  fi
  if run; then
    echo "🟢 $name — 초록. 이 축은 가드가 **없다.**"
    return 1
  fi
  echo "🔴 $name — 빨강 ($(grep -cE '^\s+×' /tmp/mut-out.txt) 건)"
  return 0
}

fail=0
mutate "① 07 안에서 번호 중복 (D-104 → D-103)" "$DOC7" "| D-104 |" "| D-103 |" || fail=1
cp "$BK/$(echo "$DOC7" | tr / _)" "$DOC7"

mutate "② 07·05 가 같은 번호 (05 의 D-39 → D-50)" "$DOC5" "| D-39 |" "| D-50 |" || fail=1
cp "$BK/$(echo "$DOC5" | tr / _)" "$DOC5"

mutate "③ 머리글이 표와 어긋남 (현재 D-104 → D-103)" "$DOC7" "현재 D-104)" "현재 D-103)" || fail=1
cp "$BK/$(echo "$DOC7" | tr / _)" "$DOC7"

mutate "④ 등록부에 없는 번호를 다른 문서가 씀 (01-prd 에 D-98)" "$DOC1" "| D-01 |" "| D-98 |" || fail=1
cp "$BK/$(echo "$DOC1" | tr / _)" "$DOC1"

mutate "⑤ 행을 읽는 정규식이 아무것도 못 잡음" "$TEST" 'const ROW = /^\| D-(\d+) \|/gm;' 'const ROW = /^\| ZZ-(\d+) \|/gm;' || fail=1
cp "$BK/$(echo "$TEST" | tr / _)" "$TEST"

echo
[ "$fail" = 0 ] && echo "✅ 변이 다섯 전부 빨강 — 가드가 문다." || echo "🔴 초록이거나 판정 못 한 변이가 있다 (위 참조)."
exit "$fail"
