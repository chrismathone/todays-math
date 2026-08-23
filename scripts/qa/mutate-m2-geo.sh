#!/usr/bin/env bash
# 중2 기하 생성기(`m2GeoTri.ts`·`m2GeoSim.ts`)를 **망가뜨려** 시험이 빨개지는지 본다.
#
# 🔴 판정 순서는 셋이다 (2026-08-20·21 교훈):
#    ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나**(탐침) ⑶ 그제서야 시험이 빨개지나.
#    ⑵ 를 건너뛰면 «동작을 안 바꾸는 변이»를 「가드가 아니다」로 잘못 읽고
#    멀쩡한 시험을 고치러 간다.
#
#   bash scripts/qa/mutate-m2-geo.sh
set -u
TRI=src/lib/middle/m2GeoTri.ts
SIM=src/lib/middle/m2GeoSim.ts
TEST=src/__tests__/unit/middleM2Geo.test.ts

BAK_TRI=$(mktemp); BAK_SIM=$(mktemp); BEFORE=$(mktemp)
cp "$TRI" "$BAK_TRI"; cp "$SIM" "$BAK_SIM"
npx tsx scripts/qa/probe-m2-geo.ts > "$BEFORE" 2>&1 || {
  echo "🔴 원본 탐침이 실패했다 — 하네스를 돌릴 수 없다"; exit 1; }
echo "원본 탐침 $(wc -l < "$BEFORE") 줄"

restore() { cp "$BAK_TRI" "$TRI"; cp "$BAK_SIM" "$SIM"; }

run() { # $1=이름
  if cmp -s "$BAK_TRI" "$TRI" && cmp -s "$BAK_SIM" "$SIM"; then
    echo "[$1] 🔴 **파일이 안 바뀌었다** — 앵커를 확인하라. 판정 안 함"; restore; return
  fi
  local after; after=$(mktemp)
  if ! npx tsx scripts/qa/probe-m2-geo.ts > "$after" 2>&1; then
    echo "[$1] 🔴 변이가 탐침을 죽였다 — 판정 안 함"; restore; return
  fi
  if cmp -s "$BEFORE" "$after"; then
    echo "[$1] 🔴 **산출물이 그대로다 — 동작을 안 바꾸는 변이다.** 판정 안 함"; restore; return
  fi
  local r
  r=$(npx vitest run "$TEST" 2>&1 | grep -oE "Tests +[0-9]+ failed" | head -1)
  echo "[$1] ${r:-🟢 전부 초록 ← 가드가 아니다}"
  restore
}

# ① 이등변 밑각을 1° 틀린다 → 「세 각의 합 180」 검산이 갈라야 한다
python - "$TRI" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        const x = (180 - a) / 2;"
assert s.count(old) == 1, "앵커 없음 ①"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "        const x = (180 - a) / 2 + 1; // 변이", 1))
PY
run "① 이등변 밑각 +1"

# ② 넓이를 엉뚱한 변으로 잰다(AC → AB) → 「2s = AC·BD」 검산이 갈라야 한다
python - "$TRI" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "      const s = (ac * bd) / 2;"
assert s.count(old) == 1, "앵커 없음 ②"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "      const s = (ab * bd) / 2; // 변이", 1))
PY
run "② 넓이를 AB 로 잰다"

# ③ 내각 이등분선의 비를 뒤집는다 → 「AB·CD = AC·BD」 검산이 갈라야 한다
python - "$SIM" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "        const x = qu * k;"
assert s.count(old) == 1, "앵커 없음 ③"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "        const x = pu * k; // 변이", 1))
PY
run "③ 이등분선 비 뒤집기"

# ④ 그림 라벨만 발문과 다르게 적는다 → 「라벨이 facts 에 있다」가 갈라야 한다
#    (답·검산은 그대로다 — 이 변이는 그림 대조 검사만 잡을 수 있다)
python - "$SIM" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "            bd: `${bd} cm`,"
assert s.count(old) == 1, "앵커 없음 ④"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "            bd: `${bd + 1} cm`, // 변이", 1))
PY
run "④ 그림 라벨만 어긋나게"

# ⑤ 닮음 01 의 답을 대응 순서와 다른 자리로 → 전용 대조가 갈라야 한다
python - "$SIM" <<'PY'
import io, sys
p = sys.argv[1]; s = io.open(p, encoding="utf-8").read()
old = "    const matchedSide = `${rhs[i1]}${rhs[i2]}`;"
assert s.count(old) == 1, "앵커 없음 ⑤"
io.open(p, "w", encoding="utf-8", newline="").write(
    s.replace(old, "    const matchedSide = `${rhs[i2]}${rhs[i1]}`; // 변이", 1))
PY
run "⑤ 닮음 대응변 뒤집기"

# ⑥ 2B 대기 유형 번호로 등록해 버린다(09 → 06) → 「지어내기 금지」 가드가 갈라야 한다
python - "$TRI" <<'PY'
import io, sys
p = sys.argv[1]
lines = io.open(p, encoding="utf-8", newline="").readlines()
hits = [i for i, ln in enumerate(lines) if ln.strip() == chr(34) + "09" + chr(34) + ","]
assert len(hits) == 1, "앵커 없음 ⑥"
lines[hits[0]] = lines[hits[0]].replace("09", "06")
io.open(p, "w", encoding="utf-8", newline="").writelines(lines)
PY
run "⑥ 2B 대기 번호(06)로 등록"

restore
echo "원복 완료 — git status 로 확인하십시오"
