#!/usr/bin/env bash
# 변이 시험 — `planRetry` 의 가드가 **진짜 가드인가**.
#
# 순서는 이 저장소가 두 번 고쳐서 얻은 것이다(2026-08-20 · 2026-08-21):
#   ⑴ 기준이 초록인가          — 아니면 판정 자체를 거부한다(도장 방지)
#   ⑵ 파일이 실제로 바뀌었나    — 치환이 헛돌면 「가드가 아니다」가 거짓말이 된다
#   ⑶ 그제서야 시험이 빨개지나
#
# 복원은 **시작할 때 읽어 둔 바이트 그대로**다 — `git show HEAD:` 로 하면 커밋 안 한
# 수정을 남의 것으로 덮는다(2026-08-23 에 실제로 그랬다).
set -u

# 🔴 **Git Bash 의 MSYS 경로 변환이 `//` 를 `/` 로 먹는다.** 2026-09-08 에 실제로
#    `// 뺐다` 가 파일에 `/ 뺐다` 로 들어가 **문법 오류**가 됐고, 그러면 시험이 아예
#    안 돌아 vitest 가 「실패 0」을 낸다 — 실패가 아니라 **분모가 사라진다.**
#    그 회차에 변이 둘이 「초록 ← 가드가 아니다」로 **거짓 판정**됐다.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

TARGET="src/lib/generator/planRetry.ts"
TEST="src/__tests__/unit/planRetry.test.ts"
BAK="$(mktemp)"

# 🔴 대상 파일에 커밋 안 한 수정이 있어도 괜찮다 — 바이트로 되돌리니까.
#    다만 «되돌릴 원본»을 반드시 먼저 손에 쥔다.
cp "$TARGET" "$BAK"
restore() { cp "$BAK" "$TARGET"; }
trap restore EXIT

run_tests() { npx vitest run "$TEST" --reporter=json 2>/dev/null; }

echo "▸ ⑴ 기준 — 변이 **없이** 초록인가 (음성 대조)"
BASE="$(run_tests)"
BASE_TOTAL="$(echo "$BASE" | grep -o '"numTotalTests":[0-9]*' | head -1 | cut -d: -f2)"
if ! echo "$BASE" | grep -q '"numFailedTests":0' || [ "${BASE_TOTAL:-0}" -lt 1 ]; then
  echo "🔴 기준이 이미 빨갛거나 시험이 안 돌았다 — 변이 판정을 **거부**한다."
  echo "$BASE" | tail -5
  exit 1
fi
echo "🟢 기준 초록 · 돈 시험 ${BASE_TOTAL}개. 판정을 시작한다."
echo

FAIL=0
mutate() {
  local name="$1" from="$2" to="$3"
  restore
  FROM="$from" TO="$to" python - "$TARGET" <<'PY'
import io, os, sys
p = sys.argv[1]
s = io.open(p, encoding="utf-8", newline="").read()
f, t = os.environ["FROM"], os.environ["TO"]
if s.count(f) != 1:
    print(f"ANCHOR:{s.count(f)}")
    raise SystemExit(3)
io.open(p, "w", encoding="utf-8", newline="").write(s.replace(f, t))
PY
  local rc=$?
  if [ $rc -ne 0 ]; then
    echo "🔴 [$name] 치환이 헛돌았다(앵커 불일치) — **판정 거부**."
    FAIL=1
    return
  fi
  if cmp -s "$TARGET" "$BAK"; then
    echo "🔴 [$name] 파일이 안 바뀌었다 — **판정 거부**."
    FAIL=1
    return
  fi
  local out failed total
  out="$(run_tests)"
  failed="$(echo "$out" | grep -o '"numFailedTests":[0-9]*' | head -1 | cut -d: -f2)"
  total="$(echo "$out" | grep -o '"numTotalTests":[0-9]*' | head -1 | cut -d: -f2)"
  # 🔴 **분모를 먼저 지킨다.** 변이가 파일을 못 읽게 만들면 시험이 통째로 사라지고
  #    「실패 0」이 나온다 — 그것을 「가드가 아니다」로 읽으면 멀쩡한 가드를 고치러 간다.
  if [ "${total:-0}" -ne "${BASE_TOTAL}" ]; then
    echo "🔴 [$name] 돈 시험이 ${total:-0}개(기준 ${BASE_TOTAL}) — 변이가 파일을 깨뜨렸다. **판정 거부**."
    FAIL=1
    return
  fi
  if [ "${failed:-0}" -gt 0 ]; then
    echo "🟢 [$name] 빨강 ${failed}건 ← 가드가 문다"
  else
    echo "🔴 [$name] **초록** ← 이 자리를 지키는 시험이 없다"
    FAIL=1
  fi
}

mutate "① 단원을 무시하고 키만 본다" \
  'const fid = familyIdOf(w);' \
  'const fid = String(w.familyKey ?? w.id);'

mutate "② 원문 자신을 형제에서 안 뺀다" \
  '(p) => p.id !== w.id && !usedProblemIds.has(p.id),' \
  '() => true,'

mutate "③ 격리 문항(D-26)을 형제로 쓴다" \
  'if (!eligible(p)) continue; // 공용 · 승인 · D-26 · 정답 자격' \
  '// D-26 가드를 뺐다'

mutate "④ 부족을 늘 0으로 보고한다" \
  'shortfall: Math.max(0, count - picked.length),' \
  'shortfall: 0,'

mutate "⑤ 한 갈래를 여러 번 넣는다" \
  'if (usedFamilies.has(fid)) {' \
  'if (false) {'

mutate "⑥ 씨앗을 안 보고 늘 첫 형제" \
  'siblings[Math.floor(rng() * siblings.length)] ?? siblings[0]!' \
  'siblings[0]!'

mutate "⑦ excludeIds 를 무시한다" \
  'if (excluded.has(p.id)) continue;' \
  '// excludeIds 를 뺐다'

mutate "⑧ 자리가 찼는데도 계속 넣는다" \
  'if (picked.length >= count) {' \
  'if (false) {'

mutate "⑨ 교과서 원문도 일반 갈래로 접는다" \
  'if (w.source === "school_textbook") {' \
  'if (false) {'

mutate "⑩ 변형 출처 확인 없이 교과서 쌍으로 쓴다" \
  'p.source === "transformed" &&' \
  'true &&'

mutate "⑪ 다른 오답 원문 id를 변형으로 재출제한다" \
  'slots.includes(p.externalId ?? "") && !wrongIds.has(p.id)' \
  'slots.includes(p.externalId ?? "")'

echo
restore
if [ $FAIL -eq 0 ]; then
  echo "🟢 변이 11개 전부 빨강 — 가드가 실제로 문다."
else
  echo "🔴 초록이거나 판정을 거부한 변이가 있다 — 위를 볼 것."
fi
exit $FAIL
