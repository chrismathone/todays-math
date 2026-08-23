#!/usr/bin/env bash
# 중1 식·방정식 33유형 생성기(`m1Expr.ts`)를 **망가뜨려** `middleM1Expr.test.ts` 가
# 빨개지는지 본다 (물결 브리프 계약 7).
#
# 🔴 판정 순서는 셋이다 (2026-08-20·21 교훈):
#    ⑴ 파일이 실제로 바뀌었나
#    ⑵ **산출물(문항)이 바뀌었나** — 파일이 바뀌어도 동작이 같으면 「초록 ← 가드가
#       아니다」가 거짓말이 된다. 그러면 멀쩡한 시험을 의심하고 고치러 간다.
#    ⑶ 그제서야 시험이 빨개지나
#
# ⓪ 그리고 시작 전에 **대상 파일이 커밋돼 있는지** 묻는다 — 이 스크립트는 대상을
#    덮어쓰고 되돌린다. 커밋 안 된 수정이 있으면 복원이 그것을 먹는다 (2026-08-23).
#    복원은 «시작할 때 읽어 둔 바이트» 로만 한다 — `git show HEAD:` 는 줄끝을 바꾸고
#    남의 커밋을 되살릴 수 있다.
#
# 사용: bash scripts/qa/mutate-m1-expr.sh
set -u

SRC=src/lib/middle/m1Expr.ts
TEST=src/__tests__/unit/middleM1Expr.test.ts
PROBE=scripts/qa/probe-m1-expr.ts

if [ -n "$(git status --porcelain -- "$SRC")" ]; then
  echo "🔴 $SRC 에 커밋 안 된 수정이 있다 — 복원이 그것을 먹는다. 먼저 커밋하라."
  exit 1
fi

BACKUP=$(mktemp)
cp "$SRC" "$BACKUP"
restore() { cp "$BACKUP" "$SRC"; }
trap restore EXIT

BEFORE=$(mktemp)
if ! npx tsx "$PROBE" > "$BEFORE" 2>&1; then
  echo "🔴 기준 산출물을 못 만들었다 — 하네스 중단"
  exit 1
fi

BASE=$(npx vitest run "$TEST" 2>&1 | grep -oE "Tests +[0-9]+ (passed|failed)" | head -1)
echo "[기준] ${BASE:-판정 불가}"
case "${BASE:-}" in
  *failed*|"") echo "🔴 기준 시험이 초록이 아니다 — 하네스 중단"; exit 1;;
esac

run() { # $1 = 변이 이름
  local after moved r
  after=$(mktemp)
  if cmp -s "$SRC" "$BACKUP"; then
    echo "[$1] 🔴 **파일이 그대로다 — 치환이 안 먹었다.** 판정 안 함"
    restore; return
  fi
  npx tsx "$PROBE" > "$after" 2>&1
  # 달라진 줄 수를 **찍는다** — 「0줄인데 초록」이 조용히 «가드가 아니다» 로
  # 읽히면 멀쩡한 시험을 고치러 간다(2026-08-23 이 하네스가 실제로 그랬다).
  moved=$(diff "$BEFORE" "$after" | grep -c '^[<>]')
  if [ "$moved" -eq 0 ]; then
    echo "[$1] 🔴 **산출물이 그대로다(달라진 줄 0) — 동작을 안 바꾸는 변이다.** 판정 안 함"
    restore; return
  fi
  r=$(npx vitest run "$TEST" 2>&1 | grep -oE "Tests +[0-9]+ failed" | head -1)
  echo "[$1] 산출물 ${moved}줄 달라짐 → ${r:-🟢 전부 초록 ← 가드가 아니다}"
  restore
}

# 앵커에는 역슬래시를 넣지 않는다 — 도구·셸 층이 한 겹씩 벗겨 «파일은 바뀌었는데
# 뜻은 안 바뀐» 변이가 된다(2026-08-21).
mutate() { # $1 = 찾을 것, $2 = 바꿀 것
  MUT_OLD="$1" MUT_NEW="$2" MUT_FILE="$SRC" python - <<'PY'
import io, os
p = os.environ["MUT_FILE"]
old = os.environ["MUT_OLD"]
new = os.environ["MUT_NEW"]
s = io.open(p, encoding="utf-8").read()
n = s.count(old)
if n != 1:
    raise SystemExit("ANCHOR %d" % n)
io.open(p, "w", encoding="utf-8", newline="").write(s.replace(old, new, 1))
PY
}

# ① 역산 수치 하나 틀림 — 일차방정식 10 이 해 r 에 맞춰 우변 상수항을 역산하는 자리
mutate 'const D = B + (A - C) * r;
      const c1 = D + d * e;' 'const D = B + (A - C) * r + 1; // 변이
      const c1 = D + d * e;' \
  && run "① 일차방정식 10 의 우변 상수항 +1"

# ② 답을 엉뚱한 값으로 — 괄호 여러 개(14) 의 상수항 부호
mutate 'const q = -C * F;' 'const q = C * F; // 변이' \
  && run "② 유형 14 상수항 부호 뒤집기"

# ③ 검산식이 갈라 주는 자리 — (-1)^(2n±1) 은 늘 -1 인데 +1 이라고 한다
mutate 'if (form === 1 || form === 2) return -1;' 'if (form === 1 || form === 2) return 1; // 변이' \
  && run "③ (-1)^(2n±1) 부호표 뒤집기"

# ④ 지면에서만 보이는 결함 — 분수 부호를 앞으로 못 빼게 한다
mutate 'const neg = n < 0 !== d < 0;' 'const neg = false; // 변이' \
  && run "④ 분수 부호 떨어뜨리기"

# ⑤ 역산의 반대 부호 — 문자에 일차식 대입(16) 이 A 의 계수를 역산하는 자리
mutate 'const a = (p - nCo * c) / mCo;' 'const a = (p + nCo * c) / mCo; // 변이' \
  && run "⑤ 유형 16 대입 역산 부호"

# ⑥ 열거 조건 하나 빼기 — 해가 자연수(또는 음의 정수)인지 가르는 자리.
#    범위(`a <= ss`)만 남으면 $x=0$ 인 $a$ 까지 답에 들어간다.
mutate 'if (mode === 0 ? x < 1 : x > -1) continue;' '// 변이: 해의 조건 제거' \
  && run "⑥ 유형 17 열거에서 해의 조건 제거"

# ⑦ 판별 유형이 갈라 주는 자리 — 등식의 성질(06) 의 «옳은» 보기를 틀리게 만든다
mutate 'else if (t === 1) items.push(`${lin(p, 0, "a")}=${lin(p, 0, "b")}`);' \
       'else if (t === 1) items.push(`${lin(p, 0, "a")}=${lin(p + 1, 0, "b")}`); // 변이' \
  && run "⑦ 등식의 성질 06 의 참 보기를 거짓으로"

echo "완료 — 모든 변이 원복됨"
