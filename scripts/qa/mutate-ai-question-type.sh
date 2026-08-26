#!/usr/bin/env bash
# AI 생성물의 형식(`questionType`) — 가드를 **망가뜨려 봐야** 가드인 줄 안다.
#
# 판정 순서 (CLAUDE.md 2026-08-20 · 08-21 · 08-23):
#
#   ㉠ 음성 대조 — 변이를 **넣기 전에** 시험이 초록인가. 아니면 판정 거부.
#   ⑴ 앵커가 파일에 **정확히 하나**인가 — 아니면 판정 거부(조용히 0건 치환 금지)
#   ⑵ 파일 바이트가 바뀌었나 — 안 바뀌면 치환이 헛돈 것이다
#   ⑶ **동작이 바뀌었나** — 지문(`ai-question-type-fingerprint.ts`)이 그대로면 판정 거부
#   ⑷ 그제서야 시험이 빨개지나
#
# ⚠️ 지문은 `deriveQuestionType` 만 그린다. `generator.ts`·`route.ts` 의 **배선** 변이는
#    지문에 안 나타나므로 ⑶ 을 `구조` 로 찍고 넘어간다 — 숨기지 않으려고 출력에 남긴다.
#
# ⚠️ 대상 파일에 커밋 안 된 수정이 있으면 멈춘다. 이 스크립트는 대상을 덮어쓰고
#    되돌리는데 기준이 «시작할 때 읽어 둔 바이트»라, 중간에 죽으면 그 수정이 사라진다.
set -u

SRC_RULE=src/lib/ai/questionType.ts
SRC_GEN=src/lib/ai/generator.ts
SRC_ROUTE=src/app/api/problems/generate/route.ts
TESTS=(
  src/__tests__/unit/aiQuestionType.test.ts
  src/__tests__/unit/aiGeneratorQuestionType.test.ts
  src/__tests__/api/aiGenerateQuestionType.test.ts
)
ALL_SRC=("$SRC_RULE" "$SRC_GEN" "$SRC_ROUTE")

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
fingerprint() { npx tsx scripts/qa/ai-question-type-fingerprint.ts 2>/dev/null | md5sum | cut -d' ' -f1; }

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

mutate() {
  local name="$1" file="$2" from="$3" to="$4"
  if [ -n "$ONLY" ] && [[ "$name" != *"$ONLY"* ]]; then return; fi
  for f in "${ALL_SRC[@]}"; do cp "$WORK/$(echo "$f" | tr '/' '_')" "$f"; done
  local before after
  before=$(md5sum "$file" | cut -d' ' -f1)

  MUT_FROM="$from" MUT_TO="$to" python - "$file" <<'PY'
import io, os, sys
p = sys.argv[1]
a, b = os.environ["MUT_FROM"], os.environ["MUT_TO"]
s = io.open(p, encoding="utf-8", newline="").read()
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
  if [ "$file" = "$SRC_RULE" ]; then
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

echo "── 판정 규칙 (questionType.ts) ────────────────────────────"
mutate "형식을 전부 단답형으로 뭉갠다" "$SRC_RULE" \
  '  if (choices >= 2 && ANSWER_CHOICE_NUMBER.test(item.answer)) return "객관식";

  if (item.problemType === "서술형") return "서술형";' \
  ''
mutate "서술형을 안 본다 (서술형이 단답형으로)" "$SRC_RULE" \
  '  if (item.problemType === "서술형") return "서술형";' \
  '  if (item.problemType === "___never___") return "서술형";'
mutate "정답 모양을 안 본다 (보기만 있으면 객관식)" "$SRC_RULE" \
  '  if (choices >= 2 && ANSWER_CHOICE_NUMBER.test(item.answer)) return "객관식";' \
  '  if (choices >= 2) return "객관식";'
mutate "원문자 계열을 ①~⑤ 로 좁힌다 (비표준 계열을 놓친다)" "$SRC_RULE" \
  'const ANSWER_CHOICE_NUMBER = new RegExp(`[${ANSWER_CIRCLED_CLASS}]`);' \
  'const ANSWER_CHOICE_NUMBER = /[①②③④⑤]/;'
mutate "보기를 지면 파서 대신 원문자로 직접 센다 (「1.」 꼴을 놓친다)" "$SRC_RULE" \
  '  const choices = parseProblemContent(item.content).choices.length;' \
  '  const choices = (item.content.match(/[①②③④⑤]/g) ?? []).length;'
mutate "남는 것을 단답형이 아니라 서술형이라 한다" "$SRC_RULE" \
  '  return "단답형";
}' \
  '  return "서술형";
}'
mutate "지면 근거보다 problemType 을 앞에 둔다 (객관식이 서술형으로)" "$SRC_RULE" \
  '  if (choices >= 2 && ANSWER_CHOICE_NUMBER.test(item.answer)) return "객관식";

  if (item.problemType === "서술형") return "서술형";' \
  '  if (item.problemType === "서술형") return "서술형";

  if (choices >= 2 && ANSWER_CHOICE_NUMBER.test(item.answer)) return "객관식";'

# ⑶ 이 «판정 거부» 를 내야 하는 무효 변이 — 하네스가 스스로 도장이 아님을 보인다.
mutate "[무효 변이 시험] 주석만 고친다 (뜻이 안 바뀐다)" "$SRC_RULE" \
  '  // 지면에 보기가 서 있고 정답이 그 번호다' \
  '  // (무효 변이) 지면에 보기가 서 있고 정답이 그 번호다'

echo
echo "── 배선 (generator.ts · route.ts) ─────────────────────────"
mutate "생성기가 형식을 안 싣는다 (draft 에 없다)" "$SRC_GEN" \
  '      questionType: deriveQuestionType({
        content,
        answer,
        problemType: item.problemType,
      }),' \
  ''
# 🔴 «정규화 전 본문으로 판정한다» 변이는 **여기 없다 — 오늘은 잴 수 없기 때문이다.**
#
#    1차 실행에서 그 변이는 **초록**이었다(「가드가 아니다」). 확인해 보니 가드가 부실한
#    것이 아니라 **오늘 그 둘의 뜻이 같다**: `normalizeLatex` 는 `\dfrac`→`\frac` 하나만
#    하고, 그 치환은 보기 칸 수도 정답 모양도 안 바꾼다. 즉 정규화 전으로 판정해도
#    산출물이 **한 톨도 안 달라진다.**
#
#    그런데 이 하네스의 ⑶(동작이 바뀌었나)은 `questionType.ts` 만 지문으로 덮는다.
#    `generator.ts` 는 `구조` 로 넘어가므로, 그 무효한 변이가 «판정거부»가 아니라
#    **«초록»으로 찍혔다.** 초록은 「가드를 고치러 가라」는 뜻이라 그대로 두면
#    멀쩡한 코드를 의심하게 된다 — 가드가 없는 것보다 나쁘다(CLAUDE.md 2026-08-21).
#
#    그래서 **빼 두고 사실을 적는다.** 정규화 뒤에 판정하는 순서 자체는 옳다(자에 넣는
#    입력이 조판과 같아야 한다). 다만 `normalizeLatex` 가 **보기 표식이나 정답 모양을
#    건드리는 규칙을 갖게 되면** 그때 이 변이를 되살리고 시험도 같이 만들어야 한다.
#    그전까지는 「지킨다」고 적지 않는다.
mutate "E2E 모의가 형식을 비워 둔다 (모의에서만 [?형식] 이 되살아난다)" "$SRC_GEN" \
  '      questionType: deriveQuestionType({
        content: `모의 생성 문제 ${index + 1}`,
        answer: String(index + 1),
        problemType: "계산",
      }),' \
  '      questionType: undefined as unknown as "단답형",'
mutate "라우트가 컬럼을 안 넣는다 (DB 가 널이 된다)" "$SRC_ROUTE" \
  '        questionType: draft.questionType,' \
  ''
mutate "라우트가 형식을 지어낸다 (전부 서술형)" "$SRC_ROUTE" \
  '        questionType: draft.questionType,' \
  '        questionType: "서술형",'

echo
echo "원복은 trap 이 한다 — 시작할 때 읽어 둔 **바이트 그대로** 되돌린다."
