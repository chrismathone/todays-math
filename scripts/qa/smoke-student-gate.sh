#!/usr/bin/env bash
# 학생 관문을 **실물 서버**에 대고 확인한다 — 진짜 `next start`, 진짜 proxy (D-124 ⑶ · D-125 ⑷).
#
# 🔴 왜 있나: proxy 는 «Next 가 읽는 파일»이다. 단위 시험은 모듈을 직접 부르므로 「Next 16 이 이 파일을
#    관문으로 쓰는가」를 구조적으로 못 본다(2026-08-20 교훈 — 단위 시험 148파일 초록인데 앱이 안 켜졌다).
#
# ⚠️ 이 스크립트는 **로그인 안 한 요청만** 본다. 학생 세션은 요청마다 DB 에서 계정을 다시 읽으므로
#    (src/lib/learn/studentSession.ts) DB 없이는 학생 갈래를 실물로 못 태운다 — 로컬 DB 가 생기면
#    학생 계정 하나를 넣고 로그인·관문·비밀번호 바꾸기를 더 볼 것(보고서 «못 본 것»).
#
#   npm run build && npx next start -p 3217 &
#   bash scripts/qa/smoke-student-gate.sh 3217
set -u
PORT="${1:-3217}"
BASE="http://localhost:$PORT"
fail=0

echo "서버를 기다린다…"
for _ in $(seq 1 90); do
  curl -s -o /dev/null --max-time 3 "$BASE/api/auth/csrf" && break
  sleep 2
done
curl -s -o /dev/null --max-time 5 "$BASE/api/auth/csrf" || { echo "🔴 서버가 안 뜬다"; exit 1; }

check() { # <기대코드> <메서드> <경로> <설명> [기대 Location 경로]
  local out code loc
  out=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -X "$2" \
    -H "origin: $BASE" -H "content-type: application/json" \
    ${6:+--data "$6"} "$BASE$3")
  code="${out%% *}"
  loc="${out#* }"
  if [ "$code" != "$1" ]; then
    echo "  🔴 $2 $3 → $code, 기대 $1  ($4)"
    fail=1
  elif [ -n "${5:-}" ] && [ "${loc#"$BASE"}" != "$5" ] && [ "${loc%%\?*}" != "$BASE$5" ]; then
    echo "  🔴 $2 $3 → $code $loc, 기대 위치 $5  ($4)"
    fail=1
  else
    echo "  ✓ $2 $3 → $code ${loc:+→ ${loc#"$BASE"}}  ($4)"
  fi
}

echo "로그인 안 한 사람의 학생 주소 (D-125 ⑷):"
check 307 GET  /learn               "학생 목록 → 학생 로그인"    /learn/login
check 307 GET  /learn/password      "비밀번호 바꾸기 → 학생 로그인" /learn/login
check 307 GET  /learn/watch/abc     "재생 → 학생 로그인"         /learn/login
check 404 GET  /learn/login         "학생 로그인 화면은 관문을 지난다(화면은 아직 없다 — D-07)"
check 401 GET  /api/learn/lectures  "학생 API — 라우트가 401"
check 400 POST /api/learn/login     "형식이 틀린 로그인 본문 — DB 전에 400" "" '{"loginId":"ab","password":"1"}'
check 401 POST /api/learn/password  "학생 세션 없음 → 401" "" '{"currentPassword":"5809","newPassword":"7314"}'

echo "원장 쪽은 그대로:"
check 200 GET  /                    "첫 화면(공개)"
check 307 GET  /studio              "원장 화면 → 원장 로그인" /login
check 401 GET  "/api/students/0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70/account" "학생 계정 상태 — 원장 세션 없음 → 401"

echo "Auth.js 공급자:"
PROVIDERS=$(curl -s "$BASE/api/auth/providers")
case "$PROVIDERS" in
  *'"student"'*'"credentials"'*|*'"credentials"'*'"student"'*) echo "  ✓ 공급자 둘 — credentials(원장) · student(학생)";;
  *) echo "  🔴 공급자가 이상하다 — $PROVIDERS"; fail=1;;
esac
case "$PROVIDERS" in
  *google*|*oauth*) echo "  🔴 소셜/OAuth 공급자가 있다 — 절대 규칙 7"; fail=1;;
esac

if [ "$fail" = 0 ]; then echo "학생 관문 실물 확인 통과(로그인 안 한 요청)"; else echo "🔴 실패가 있다"; exit 1; fi
