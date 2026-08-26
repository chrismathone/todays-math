#!/usr/bin/env bash
# AI 생성·변형물의 「말 대신 기호」 가드 — 망가뜨려 봐야 가드인 줄 안다.
#
#   ㉠ 음성 대조 — 변이 전에 초록인가        ⑴ 앵커가 하나인가
#   ⑵ 파일이 바뀌었나                        ⑶ 동작이 바뀌었나 (아래 참조)
#   ⑷ 시험이 빨개지나
#
# ⑶ 은 `src/lib/ai/wordyOperators.ts` 에만 잰다 — 순수 함수라 지문을 그릴 수 있다.
# 프롬프트·생성기·변형기는 `구조` 다.
#
# 🔴 **일부러 안 넣은 변이가 하나 있다 — 숨기지 않고 적는다.**
#    「`preservesValues` 검산을 무시한다」는 오늘 **잴 수 없다.** 그 검산이 실제로
#    떨어지는 입력을 못 만들었기 때문이다(`rewriteWordyOperators` 가 인자를 한 글자도
#    안 고쳐서 수·한글·`$` 가 구조적으로 보존된다). 못 재는 것을 「지킨다」고 적지
#    않는다 — 그 검산은 **바꾸기 규칙이 나중에 넓어질 때**를 위한 안전망이고,
#    그때 이 변이를 되살려야 한다.
set -u

SRC_RULE=src/lib/ai/wordyOperators.ts
SRC_PROMPT=src/lib/ai/prompts/wordyOperatorRule.ts
SRC_GEN=src/lib/ai/generator.ts
SRC_TRANS=src/lib/ai/transformer.ts
TESTS=(src/__tests__/unit/aiWordyOperators.test.ts)
ALL_SRC=("$SRC_RULE" "$SRC_PROMPT" "$SRC_GEN" "$SRC_TRANS")

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
fingerprint() { npx tsx scripts/qa/ai-wordy-fingerprint.ts 2>/dev/null | md5sum | cut -d' ' -f1; }

echo "㉠ 음성 대조 — 변이 없이 먼저 돌린다"
if ! run_tests; then
  echo "🔴 기준 시험이 이미 빨갛다. 판정을 **거부**한다."
  tail -20 "$WORK/log"; exit 2
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
    echo "⛔ 판정거부  $name  (⑴ 앵커: rc=$rc)"; return
  fi
  after=$(md5sum "$file" | cut -d' ' -f1)
  if [ "$before" = "$after" ]; then
    echo "⛔ 판정거부  $name  (⑵ 파일이 안 바뀌었다)"; return
  fi

  local step3="구조"
  if [ "$file" = "$SRC_RULE" ]; then
    local fp; fp=$(fingerprint)
    if [ "$fp" = "$BASE_FP" ]; then
      echo "⛔ 판정거부  $name  (⑶ 파일은 바뀌었는데 **동작이 그대로**다 — 무효한 변이)"; return
    fi
    step3="동작"
  fi

  if run_tests; then
    echo "🟢 초록      $name  [⑶$step3]  <-- 가드가 아니다"
  else
    local names; names=$(failed_names)
    if [ -z "$names" ]; then
      echo "⛔ 판정거부  $name  (⑷ 빨간데 **실패한 시험을 못 댄다**)"; tail -5 "$WORK/log"; return
    fi
    echo "🔴 빨강      $name  [⑶$step3]"
    echo "     ↳ $names"
  fi
}

echo "── 받는 쪽 검사 (wordyOperators.ts) ───────────────────────"
mutate "바꾼 결과를 안 쓰고 원문을 그대로 낸다 (검사가 장식이 된다)" "$SRC_RULE" \
  '  return {
    out: result.out,
    changed: result.changed,
    leftover: result.skipped.length,
    refused: null,
  };' \
  '  return {
    out: text,
    changed: result.changed,
    leftover: result.skipped.length,
    refused: null,
  };'
mutate "손대지 않은 자리를 안 센다 (조용히 넘어간다)" "$SRC_RULE" \
  '      leftover: result.skipped.length,
      refused: null,
    };
  }
  const verdict = preservesValues(text, result.out);' \
  '      leftover: 0,
      refused: null,
    };
  }
  const verdict = preservesValues(text, result.out);'
mutate "널 해설에서 터진다 (해설 없는 문항이 통째로 죽는다)" "$SRC_RULE" \
  '  if (text === null)
    return { out: null, changed: 0, leftover: 0, refused: null };' \
  ''

echo
echo "── 배선 (generator · transformer) ─────────────────────────"
mutate "생성기가 발문·정답을 안 쓸어 낸다" "$SRC_GEN" \
  '    const content = speakWordyOperators(normalizeLatex(item.content)).out;
    const answer = speakWordyOperators(normalizeLatex(item.answer)).out;' \
  '    const content = normalizeLatex(item.content);
    const answer = normalizeLatex(item.answer);'
mutate "생성기가 **해설만** 안 쓸어 낸다 (원장님이 짚으신 바로 그 칸이다)" "$SRC_GEN" \
  '      solution: speakWordyOperatorsOrNull(
        item.solution ? normalizeLatex(item.solution) : null,
      ).out,' \
  '      solution: item.solution ? normalizeLatex(item.solution) : null,'
mutate "변형기가 안 쓸어 낸다" "$SRC_TRANS" \
  '      content: speakWordyOperators(normalizeLatex(item.content)).out,' \
  '      content: normalizeLatex(item.content),'
mutate "변형기가 **원본 재현값까지** 쓸어 낸다 (견줄 짝이 달라진다)" "$SRC_TRANS" \
  '      originalAnswerRecomputed: normalizeLatex(item.originalAnswerRecomputed),' \
  '      originalAnswerRecomputed: speakWordyOperators(
        normalizeLatex(item.originalAnswerRecomputed),
      ).out,'

echo
echo "── 프롬프트 ──────────────────────────────────────────────"
mutate "규칙 문장을 통째로 비운다" "$SRC_PROMPT" \
  '  "수학 기호로 함수처럼 쓰지 말고 **말로** 쓰십시오. 특히 \\min, \\max, \\gcd, \\lcm, \\deg 를 쓰지 말고",' \
  '  "",'
mutate "예외를 안 적는다 (AI 가 \\sin 까지 말로 풀어 쓴다)" "$SRC_PROMPT" \
  '  "다만 \\sin, \\cos, \\tan, \\log, \\lim, \\sum, \\int 는 교과서가 가르치는 기호이므로 그대로 쓰십시오.",' \
  '  "",'

echo
echo "원복은 trap 이 한다 — 시작할 때 읽어 둔 **바이트 그대로** 되돌린다."
