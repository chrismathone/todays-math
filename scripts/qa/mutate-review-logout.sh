#!/usr/bin/env bash
# 검수 화면 로그아웃(D-77) 가드가 **진짜 무는지** 변이로 확인한다.
#
#   bash scripts/qa/mutate-review-logout.sh
#
# 이 결함은 축이 **둘**이라 가드도 둘이다. 하나만 있으면 반쪽이다:
#   ㉠ 화면에 단추가 있나        → ReviewConsole.test.tsx
#   ㉡ 그 단추가 눌리기는 하나   → routeAccess.test.ts (POST /review)
# ㉡ 이 없으면 **화면에는 보이는데 눌러도 막힌다** — 그게 원래 결함의 모양이었다.
#
# ⚠️ 복원은 `git` 이 아니라 **시작할 때 읽어 둔 사본**으로 한다. 대상이 커밋 안 된
#    상태일 수 있고, 그때 `git checkout` 은 되돌리는 게 아니라 **남의 것으로 덮는다**
#    (2026-08-23 에 실제로 그랬다).
set -u

CONSOLE="src/components/review/ReviewConsole.tsx"
ACCESS="src/lib/routeAccess.ts"
T_CONSOLE="src/__tests__/components/ReviewConsole.test.tsx"
T_ACCESS="src/__tests__/unit/routeAccess.test.ts"

BK="$(mktemp -d)"
key() { echo "$1" | tr / _; }
trap 'for f in "$CONSOLE" "$ACCESS"; do cp "$BK/$(key "$f")" "$f"; done; rm -rf "$BK"' EXIT
for f in "$CONSOLE" "$ACCESS"; do cp "$f" "$BK/$(key "$f")"; done

run() { npx vitest run "$1" >/tmp/mut-rl.txt 2>&1; }

echo "▸ 음성 대조 — 변이 전에는 초록이어야 한다"
if ! run "$T_CONSOLE" || ! run "$T_ACCESS"; then
  echo "🔴 기준이 이미 빨갛다. 판정을 **거부한다** (판정자가 도장이 된다)."
  tail -20 /tmp/mut-rl.txt; exit 2
fi
echo "  ✅ 기준 초록"

mutate() { # 이름 파일 시험 옛것 새것
  # ⚠️ 이름에 백틱을 쓰지 말 것 — 큰따옴표 안에서 셸이 **명령으로 실행**한다.
  #    판정 자체는 맞아도 줄이 깨져서 다음 사람이 잘못 읽는다(실제로 났다).
  local name=$1 file=$2 test=$3 old=$4 new=$5 before after
  before=$(md5sum "$file" | cut -d' ' -f1)
  OLD="$old" NEW="$new" python - "$file" <<'PY'
import io, os, sys
p = sys.argv[1]
s = io.open(p, encoding="utf-8").read()
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(os.environ["OLD"], os.environ["NEW"], 1))
PY
  after=$(md5sum "$file" | cut -d' ' -f1)
  if [ "$before" = "$after" ]; then
    echo "⚠️  $name — **파일이 안 바뀌었다.** 치환이 헛돌았으니 판정하지 않는다."
    return 2
  fi
  if run "$test"; then
    echo "🟢 $name — 초록. 이 축은 가드가 **없다.**"
    return 1
  fi
  echo "🔴 $name — 빨강"
  return 0
}

fail=0
mutate "① 헤더에서 계정 구역을 뺀다" "$CONSOLE" "$T_CONSOLE" \
  "<AccountBadge />" "<span />" || fail=1
cp "$BK/$(key "$CONSOLE")" "$CONSOLE"

mutate "② 로그아웃 POST 허용을 없앤다 (단추는 보이는데 막힌다)" "$ACCESS" "$T_ACCESS" \
  '{ methods: ["POST"], path: "/review", why:' \
  '{ methods: ["POST"], path: "/review-없음", why:' || fail=1
cp "$BK/$(key "$ACCESS")" "$ACCESS"

mutate "③ 허용을 /review/** 로 넓힌다 (하위까지 딸려 열린다)" "$ACCESS" "$T_ACCESS" \
  '{ methods: ["POST"], path: "/review", why:' \
  '{ methods: ["POST"], path: "/review/**", why:' || fail=1
cp "$BK/$(key "$ACCESS")" "$ACCESS"

echo
[ "$fail" = 0 ] && echo "✅ 변이 셋 전부 빨강 — 두 축 다 가드가 문다." \
                || echo "🔴 초록이거나 판정 못 한 변이가 있다 (위 참조)."
exit "$fail"
