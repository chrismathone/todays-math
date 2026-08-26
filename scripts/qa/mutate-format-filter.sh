#!/usr/bin/env bash
# 형식 필터 — 가드를 **망가뜨려 봐야** 가드인 줄 안다.
#
# 판정 순서 (CLAUDE.md 2026-08-20 · 08-21 · 08-23):
#
#   ㉠ 음성 대조 — 변이를 **넣기 전에** 시험이 초록인가. 아니면 판정 거부.
#                  (도장은 판정 단계에 오면 안 된다 — 「아니오」를 못 내는 판정자는
#                   자기 이력 내내 「예」만 찍는다.)
#   ⑴ 앵커가 파일에 **정확히 하나**인가 — 아니면 판정 거부(조용히 0건 치환 금지)
#   ⑵ 파일 바이트가 바뀌었나 — 안 바뀌면 치환이 헛돈 것이다
#   ⑶ **동작이 바뀌었나** — 지문(`format-filter-fingerprint.ts`)이 그대로면 판정 거부.
#      파일이 바뀌어도 뜻이 그대로면 「가드가 아니다」가 **거짓말**이 된다.
#   ⑷ 그제서야 시험이 빨개지나 — 그리고 **실패한 시험 이름을 댈 수 있나**
#
# ⚠️ 라우트(`route.ts`)와 MSW 핸들러는 지문이 못 그린다(서버가 필요하다). 그 변이들은
#    ⑶ 을 «구조» 로 표시하고 넘어간다 — 숨기지 않으려고 출력에 그대로 찍는다.
#
# ⚠️ 대상 파일에 **커밋 안 된 수정이 있으면 멈춘다.** 이 스크립트는 대상을 덮어쓰고
#    되돌리는데, 되돌릴 기준이 «시작할 때 읽어 둔 바이트»라 중간에 죽으면 그 수정이
#    사라진다(2026-08-23 에 실제로 그렇게 잃었다).
set -u

SRC_RULE=src/lib/problem/provenance.ts
SRC_ROUTE=src/app/api/problems/route.ts
SRC_SER=src/lib/serializers.ts
SRC_LABELS=src/components/problem/labels.ts
SRC_MSW=src/mocks/handlers/problem.ts
SRC_BANK=src/components/problem/ProblemBank.tsx
TESTS=(
  src/__tests__/unit/problemFormatFilter.test.ts
  src/__tests__/api/problemFormatFilter.test.ts
  src/__tests__/components/ProblemBankFormatFilter.test.tsx
)
ALL_SRC=("$SRC_RULE" "$SRC_ROUTE" "$SRC_SER" "$SRC_LABELS" "$SRC_MSW" "$SRC_BANK")

WORK=$(mktemp -d)
trap 'for f in "${ALL_SRC[@]}"; do cp "$WORK/$(echo "$f" | tr "/" "_")" "$f"; done; rm -rf "$WORK"' EXIT

DIRTY=$(git status --porcelain -- "${ALL_SRC[@]}")
if [ -n "$DIRTY" ]; then
  echo "🔴 대상 파일에 커밋 안 된 수정이 있다. 커밋한 뒤 다시 돌려라:"
  echo "$DIRTY"
  exit 2
fi

for f in "${ALL_SRC[@]}"; do cp "$f" "$WORK/$(echo "$f" | tr '/' '_')"; done

run_tests() { npx vitest run "${TESTS[@]}" --reporter=json --outputFile="$WORK/out.json" >"$WORK/log" 2>&1; }
failed_names() {
  node -e '
    const fs=require("fs");
    try{
      const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
      const names=[];
      for(const r of j.testResults??[]) for(const a of r.assertionResults??[])
        if(a.status==="failed") names.push(a.fullName??a.title);
      process.stdout.write(names.slice(0,3).join(" / "));
    }catch(e){process.stdout.write("");}
  ' "$WORK/out.json"
}
fingerprint() { npx tsx scripts/qa/format-filter-fingerprint.ts 2>/dev/null | md5sum | cut -d' ' -f1; }

echo "㉠ 음성 대조 — 변이 없이 먼저 돌린다"
if ! run_tests; then
  echo "🔴 기준 시험이 이미 빨갛다. 판정을 **거부**한다 — 이 상태의 «빨강»은 변이 때문인지"
  echo "   원래 그런 것인지 안 갈린다."
  tail -20 "$WORK/log"
  exit 2
fi
echo "🟢 기준 초록 — 이제 판정할 수 있다"
BASE_FP=$(fingerprint)
echo "   기준 지문 $BASE_FP"
echo

ONLY="${1:-}"

# 번호 구간으로 나눠 돌 수 있다 — 전량이 10분을 넘으면 배경 작업이 중간에 죽는 환경이
# 있어서(2026-08-26 실제로 두 번), 반씩 앞에서 돌릴 수 있게 둔다.
#   FROM=1 TO=12 bash scripts/qa/mutate-format-filter.sh
# ⚠️ 구간을 나눠 돌아도 **음성 대조(㉠)는 회차마다 다시** 돈다 — 그게 이 하네스가
#    「아니오를 낼 수 있음」을 회차마다 증명하는 방식이다(도장 방지).
FROM="${FROM:-1}"
TO="${TO:-9999}"
SEQ=0

mutate() {
  local name="$1" file="$2" from="$3" to="$4"
  SEQ=$((SEQ + 1))
  if [ "$SEQ" -lt "$FROM" ] || [ "$SEQ" -gt "$TO" ]; then return; fi
  if [ -n "$ONLY" ] && [[ "$name" != *"$ONLY"* ]]; then return; fi
  for f in "${ALL_SRC[@]}"; do cp "$WORK/$(echo "$f" | tr '/' '_')" "$f"; done
  local before after
  before=$(md5sum "$file" | cut -d' ' -f1)

  MUT_FROM="$from" MUT_TO="$to" python - "$file" <<'PY'
import io, os, sys
p = sys.argv[1]
a, b = os.environ["MUT_FROM"], os.environ["MUT_TO"]
s = io.open(p, encoding="utf-8", newline="").read()
# 저장소가 autocrlf 라 작업 트리는 CRLF 다. 앵커는 LF 로 적고 여기서 맞춘다.
def variants(t):
    return [t, t.replace("\n", "\r\n")]
hit = None
for va, vb in zip(variants(a), variants(b)):
    n = s.count(va)
    if n == 1:
        hit = (va, vb); break
    if n > 1:
        sys.stderr.write(f"ANCHOR AMBIGUOUS ({n})\n"); sys.exit(4)
if hit is None:
    sys.stderr.write("ANCHOR NOT FOUND\n"); sys.exit(3)
io.open(p, "w", encoding="utf-8", newline="").write(s.replace(hit[0], hit[1], 1))
PY
  local rc=$?
  if [ $rc -ne 0 ]; then
    echo "⛔ 판정거부  $name  (⑴ 앵커: rc=$rc — 정확히 하나가 아니다)"
    return
  fi

  after=$(md5sum "$file" | cut -d' ' -f1)
  if [ "$before" = "$after" ]; then
    echo "⛔ 판정거부  $name  (⑵ 파일이 안 바뀌었다)"
    return
  fi

  local step3="구조"
  if [ "$file" = "$SRC_RULE" ] || [ "$file" = "$SRC_LABELS" ] || [ "$file" = "$SRC_SER" ]; then
    local fp
    fp=$(fingerprint)
    if [ "$fp" = "$BASE_FP" ]; then
      echo "⛔ 판정거부  $name  (⑶ 파일은 바뀌었는데 **동작이 그대로**다 — 무효한 변이)"
      return
    fi
    step3="동작"
  fi

  if run_tests; then
    echo "🟢 초록      $name  [⑶$step3]  <-- 가드가 아니다"
  else
    local names
    names=$(failed_names)
    if [ -z "$names" ]; then
      echo "⛔ 판정거부  $name  (⑷ 빨간데 **실패한 시험을 못 댄다** — 러너가 죽은 것일 수 있다)"
      tail -5 "$WORK/log"
      return
    fi
    echo "🔴 빨강      $name  [⑶$step3]"
    echo "     ↳ $names"
  fi
}

echo "── 규칙: 본문 없이 확정하는 자리 (provenance.ts) ─────────"
mutate "정답이 보기 번호여도 본문을 안 읽는다 (객관식이 단답형으로 샌다)" "$SRC_RULE" \
  '  if (ANSWER_CHOICE_NUMBER.test(problem.answer)) return null;' \
  '  if (false) return null;'
mutate "엔진 표지를 본문 없이 단답형이라 단정한다" "$SRC_RULE" \
  '  if (isEngineFamily(problem.familyKey)) return null;
  if (!problem.questionType && problem.problemType === "서술형") return null;' \
  '  if (isEngineFamily(problem.familyKey)) return "short_answer";
  if (!problem.questionType && problem.problemType === "서술형") return null;'
mutate "problemType 되짚기를 본문 없이 서술형이라 단정한다" "$SRC_RULE" \
  '  if (!problem.questionType && problem.problemType === "서술형") return null;

  return "unknown";' \
  '  if (!problem.questionType && problem.problemType === "서술형") return "descriptive";

  return "unknown";'
mutate "늘 본문을 읽게 한다 (과잉 null — 후보 전량이 본문 조회로)" "$SRC_RULE" \
  '  if (problem.questionType === "단답형") return "short_answer";
  if (problem.questionType === "서술형") return "descriptive";

  // 남은 둘은' \
  '  if (problem.questionType === "___never___") return "short_answer";
  if (problem.questionType === "___never___") return "descriptive";

  // 남은 둘은'

echo
echo "── 규칙: 후보 집합 (provenance.ts) ───────────────────────"
mutate "단답형 후보에서 엔진 표지를 뺀다 (엔진 문항이 필터에서 사라진다)" "$SRC_RULE" \
  '    and(ENGINE_FAMILY, not(eq("questionType", "서술형"))),' \
  ''
mutate "서술형 후보에서 problemType 되짚기를 뺀다" "$SRC_RULE" \
  '    and(empty("questionType"), eq("problemType", "서술형"), not(ENGINE_FAMILY)),' \
  ''
mutate "서술형 후보에서 엔진 제외를 뺀다 (두 후보가 겹친다)" "$SRC_RULE" \
  '    and(empty("questionType"), eq("problemType", "서술형"), not(ENGINE_FAMILY)),' \
  '    and(empty("questionType"), eq("problemType", "서술형")),'
mutate "후보를 «전부»로 만든다 (트리비얼)" "$SRC_RULE" \
  '  return evalFormatCond(FORMAT_SUPERSET_COND[format], problem);' \
  '  return Boolean(problem) || Boolean(format);'

echo
echo "── 규칙: 판정 본체 (provenance.ts) ───────────────────────"
mutate "객관식 판정에서 보기 칸 수를 안 본다" "$SRC_RULE" \
  '  if (choices >= 2 && answerHasChoiceNumber) return "multiple_choice";' \
  '  if (answerHasChoiceNumber) return "multiple_choice";'
mutate "엔진 접두사 목록에서 mid: 를 뺀다" "$SRC_RULE" \
  '  ["mid:", "middle_engine"],' \
  ''
mutate "classifyFormat 이 보기 칸 수를 늘 0으로 넘긴다" "$SRC_RULE" \
  '    parseProblemContent(problem.content).choices.length,' \
  '    0,'

echo
echo "── 조건을 SQL 로 뽑는 자리 (provenance.ts) ───────────────"
# 🔴 예전에는 이 자리가 **규칙을 두 벌 적은 곳**이었고, 아래 두 변이가 **전량 초록**이었다
#    (2026-08-26). 이제 조건은 한 곳에 있고 SQL 은 거기서 뽑으므로, 남는 위험은
#    「뽑아 내는 함수」뿐이다 — 그 함수를 겨눈다.
mutate "널을 빠뜨린 채 «그 값이 아니다» 를 뽑는다 (NULL 삼값논리 함정)" "$SRC_RULE" \
  '      return {
        OR: [
          { [inner.col]: null },
          { [inner.col]: "" },
          { NOT: toPrismaWhere(inner) },
        ],
      };' \
  '      return { NOT: toPrismaWhere(inner) };'
mutate "«비어 있다» 에서 빈 문자열 갈래를 뺀다" "$SRC_RULE" \
  '      return { OR: [{ [cond.col]: null }, { [cond.col]: "" }] };' \
  '      return { [cond.col]: null };'
mutate "«비어 있지 않다» 에서 널 검사를 뺀다" "$SRC_RULE" \
  '          AND: [{ NOT: { [inner.col]: null } }, { NOT: { [inner.col]: "" } }],' \
  '          AND: [{ NOT: { [inner.col]: "" } }],'
mutate "드모르간을 죽인다 (부정이 잎까지 안 내려간다)" "$SRC_RULE" \
  '    case "and":
      return or(...cond.of.map(not));
    case "or":
      return and(...cond.of.map(not));' \
  '    case "and":
      return cond;
    case "or":
      return cond;'

echo
echo "── 배선: 라우트 (route.ts) ───────────────────────────────"
mutate "어긋난 행을 안 뺀다 (후보를 그대로 내보낸다)" "$SRC_ROUTE" \
  '  return rejected.length === 0
    ? [superset]
    : [superset, { NOT: { id: { in: rejected } } }];' \
  '  return [superset];'
mutate "본문을 안 읽고 «본문이 필요한 행»을 전부 통과시킨다" "$SRC_ROUTE" \
  '      const quick = formatWithoutContent(row);
      if (quick !== null) return quick !== format;' \
  '      const quick = formatWithoutContent(row);
      if (quick === null) return false;
      return quick !== format;'
mutate "format 을 Prisma 필터로 그대로 흘린다" "$SRC_ROUTE" \
  '    format,
    ...filters' \
  '    ...filters'

echo
echo "── 배선: 응답 직렬화 (serializers.ts) ────────────────────"
mutate "questionType 을 다시 빠뜨린다 (화면 라벨이 서버와 갈린다)" "$SRC_SER" \
  '    questionType: row.questionType,' \
  ''

echo
echo "── 배선: 유형 드롭다운 (labels.ts) ───────────────────────"
mutate "단답형 항목을 없앤다" "$SRC_LABELS" \
  '  { value: "format:short_answer", label: "단답형" },' \
  ''
mutate "서술형을 다시 problemType 축으로 되돌린다" "$SRC_LABELS" \
  '  { value: "format:descriptive", label: "서술형" },' \
  '  { value: "type:서술형", label: "서술형" },'
mutate "값을 가르는 자리에서 format: 을 안 본다" "$SRC_LABELS" \
  '  if (value.startsWith("format:")) return { format: value.slice(7) };' \
  ''

echo
echo "── 배선: MSW 가짜 서버 (handlers/problem.ts) ─────────────"
mutate "가짜가 format 을 조용히 무시한다" "$SRC_MSW" \
  '      if (filters.format && classifyFormat(p) !== filters.format) return false;' \
  ''

echo
echo "── 배선: 화면 즉시 반영 (ProblemBank.tsx) ────────────────"
mutate "등록·승격 직후 목록 판정에서 형식을 안 본다" "$SRC_BANK" \
  '    (!filters.format || classifyFormat(problem) === filters.format) &&' \
  ''
