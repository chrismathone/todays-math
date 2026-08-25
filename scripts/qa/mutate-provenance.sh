#!/usr/bin/env bash
# 출처 라벨 — 가드를 **망가뜨려 봐야** 가드인 줄 안다.
#
# 판정 순서 (CLAUDE.md 2026-08-20 · 08-21 · 08-23):
#
#   ㉠ 음성 대조 — 변이를 **넣기 전에** 시험이 초록인가. 아니면 판정 거부.
#                  (「망가진 것을 잡는가」만 보면 「멀쩡한 것을 멀쩡하다 하는가」가
#                   구조적으로 안 보인다. 도장은 판정 단계에 오면 안 된다.)
#   ⑴ 앵커가 파일에 **정확히 하나**인가 — 아니면 판정 거부(조용히 0건 치환 금지)
#   ⑵ 파일 바이트가 바뀌었나 — 안 바뀌면 치환이 헛돈 것이다(따옴표·역슬래시가 범인)
#   ⑶ **동작이 바뀌었나** — 지문(`provenance-fingerprint.ts`)이 그대로면 판정 거부.
#      파일이 바뀌어도 뜻이 그대로면 「가드가 아니다」가 **거짓말**이 된다.
#   ⑷ 그제서야 시험이 빨개지나
#
# ⚠️ 컴포넌트 두 파일(`ProblemCard`·`ReviewProblemCard`)은 CSS 모듈을 물고 있어 지문
#    스크립트가 못 그린다. 그 변이들은 ⑶ 을 `구조` 로 표시하고 넘어간다 — 숨기지 않으려고
#    출력에 그대로 찍는다.
#
# ⚠️ 대상 파일에 **커밋 안 된 수정이 있으면 멈춘다.** 이 스크립트는 대상을 덮어쓰고
#    되돌리는데, 되돌릴 기준이 «시작할 때 읽어 둔 바이트»라 중간에 죽으면 그 수정이
#    사라진다(2026-08-23 에 실제로 그렇게 잃었다).
set -u

SRC_RULE=src/lib/problem/provenance.ts
SRC_CSS=src/app/globals.css
SRC_CARD=src/components/problem/ProblemCard.tsx
SRC_REVIEW=src/components/test/ReviewProblemCard.tsx
TESTS=(
  src/__tests__/unit/problemProvenance.test.ts
  src/__tests__/unit/provenancePalette.test.ts
  src/__tests__/components/provenanceBadges.test.tsx
)
ALL_SRC=("$SRC_RULE" "$SRC_CSS" "$SRC_CARD" "$SRC_REVIEW")

WORK=$(mktemp -d)
trap 'for f in "${ALL_SRC[@]}"; do cp "$WORK/$(echo "$f" | tr "/" "_")" "$f"; done; rm -rf "$WORK"' EXIT

# 커밋 안 된 대상이 있으면 멈춘다 — 되돌리기가 남의 것을 덮는다.
DIRTY=$(git status --porcelain -- "${ALL_SRC[@]}")
if [ -n "$DIRTY" ]; then
  echo "🔴 대상 파일에 커밋 안 된 수정이 있다. 커밋한 뒤 다시 돌려라:"
  echo "$DIRTY"
  exit 2
fi

# 시작 바이트를 그대로 보관한다(git 이 아니라 **파일**에서 — autocrlf 저장소라 블롭과
# 작업 트리의 줄끝이 다르다).
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

echo "㉠ 음성 대조 — 변이 없이 먼저 돌린다"
if ! run_tests; then
  echo "🔴 기준 시험이 이미 빨갛다. 판정을 **거부**한다 — 이 상태에서 나오는 «빨강»은"
  echo "   변이 때문인지 원래 그런 것인지 안 갈린다."
  tail -20 "$WORK/log"
  exit 2
fi
echo "🟢 기준 초록 — 이제 판정할 수 있다"
BASE_FP=$(npx tsx scripts/qa/provenance-fingerprint.ts | md5sum | cut -d' ' -f1)
echo "   기준 지문 $BASE_FP"
echo

# 이름 조각을 주면 그 변이 **하나만** 돈다 — 전량은 오래 걸리고, 실제로 다시 물어야
# 하는 것은 대개 하나다(`mutate-one.py` 가 같은 이유로 따로 있다).
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

  # ⑶ 동작이 바뀌었나
  local step3="구조"
  if [ "$file" = "$SRC_RULE" ] || [ "$file" = "$SRC_CSS" ]; then
    local fp
    fp=$(npx tsx scripts/qa/provenance-fingerprint.ts 2>/dev/null | md5sum | cut -d' ' -f1)
    if [ "$fp" = "$BASE_FP" ]; then
      echo "⛔ 판정거부  $name  (⑶ 파일은 바뀌었는데 **동작이 그대로**다 — 무효한 변이)"
      return
    fi
    step3="동작"
  fi

  # ⑷ 시험이 빨개지나
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

echo "── 판정 규칙 (provenance.ts) ──────────────────────────────"
mutate "elem: 표지를 안 본다 (초등이 미분류로)" "$SRC_RULE" \
  '["elem:", "elem_engine"],' \
  ''
mutate "mid: 표지를 solo: 로 바꾼다 (손 등록을 중등 엔진이라 한다)" "$SRC_RULE" \
  '["mid:", "middle_engine"],' \
  '["solo:", "middle_engine"],'
mutate "transformed 에서 originProblemId 를 안 본다 (AI 변형이 [문]으로)" "$SRC_RULE" \
  'return problem.originProblemId ? "ai" : "workbook";' \
  'return "workbook";'
mutate "ai_generated 를 안 본다" "$SRC_RULE" \
  'if (problem.source === "ai_generated") return "ai";' \
  'if (problem.source === "___never___") return "ai";'
mutate "미분류를 없애고 전부 초등 엔진이라 한다" "$SRC_RULE" \
  '  return "unknown";
}

/** 그림 출처 판정' \
  '  return "elem_engine";
}

/** 그림 출처 판정'
mutate "그림 미분류를 «스캔» 으로 뭉갠다" "$SRC_RULE" \
  '  return "unknown";
}

/** 화면이 그리는 라벨 한 장. */' \
  '  return "scan";
}

/** 화면이 그리는 라벨 한 장. */'
mutate "그림 «없음» 을 «모른다» 로 뭉갠다" "$SRC_RULE" \
  'if (urls.length === 0) return null;' \
  'if (urls.length === 0) return "unknown";'
mutate "빈 문자열 figureSvg 를 도형 엔진으로 친다" "$SRC_RULE" \
  'if (problem.figureSvg !== null && problem.figureSvg !== "") {' \
  'if (problem.figureSvg !== null) {'
mutate "SVG 엔진 뿌리를 틀리게 적는다 (SVG 가 스캔으로)" "$SRC_RULE" \
  'const SVG_ENGINE_PREFIX = "/figures-svg/";' \
  'const SVG_ENGINE_PREFIX = "/figures-svg-nope/";'
mutate "두 축의 «모른다» 에 서로 다른 색을 준다" "$SRC_RULE" \
  '    name: "그림 출처 미분류",
    className: "text-src-unknown",' \
  '    name: "그림 출처 미분류",
    className: "text-src-scan",'
mutate "라벨에서 대괄호를 뺀다" "$SRC_RULE" \
  'text: "[초]",' \
  'text: "초",'
mutate "그림 라벨을 아예 안 낸다" "$SRC_RULE" \
  'if (figure !== null) badges.push({ kind: figure, ...FIGURE_BADGE[figure] });' \
  'void figure;'
# ⑶ 이 «판정 거부» 를 내야 하는 무효 변이 — 하네스가 스스로 도장이 아님을 보인다.
mutate "[무효 변이 시험] 스캔 뿌리 검사 순서만 뒤집는다 (뜻이 안 바뀐다)" "$SRC_RULE" \
  '  if (urls.some((u) => u.startsWith(SVG_ENGINE_PREFIX))) return "svg_engine";
  if (urls.some((u) => u.startsWith(SCAN_PREFIX))) return "scan";' \
  '  if (urls.some((u) => u.startsWith(SVG_ENGINE_PREFIX))) return "svg_engine";
  if (urls.some((u) => u.startsWith(SCAN_PREFIX))) return "scan";
  if (urls.some((u) => u.startsWith(SVG_ENGINE_PREFIX))) return "svg_engine";'

echo
echo "── 팔레트 (globals.css) ───────────────────────────────────"
mutate "[중] 색을 [초] 와 같게 (색이 겹친다)" "$SRC_CSS" \
  '--src-middle: #ad4aae;' \
  '--src-middle: #5e41a9;'
mutate "[중] 색을 [초] 에 아주 가깝게 (문자열은 다르고 눈에는 같다)" "$SRC_CSS" \
  '--src-middle: #ad4aae;' \
  '--src-middle: #6243ab;'
mutate "[스캔] 색을 G2 노랑 글자색에 붙인다" "$SRC_CSS" \
  '--src-scan: #5f5521;' \
  '--src-scan: #97691a;'
mutate "[AI] 색을 옅게 (대비 4.5 미달)" "$SRC_CSS" \
  '--src-ai: #00825a;' \
  '--src-ai: #7fd6b6;'
mutate "🔴 @theme 연결을 끊는다 (클래스가 조용히 아무 색도 안 낸다)" "$SRC_CSS" \
  '  --color-src-elem: var(--src-elem);' \
  ''
mutate "@theme 에 리터럴을 한 벌 더 둔다 (값의 출처가 둘이 된다)" "$SRC_CSS" \
  '  --color-src-elem: var(--src-elem);' \
  '  --color-src-elem: #5e41a9;'
mutate "«모른다» 에 고유색을 준다 (모른다가 분류처럼 읽힌다)" "$SRC_CSS" \
  '  --src-unknown: var(--text-2);' \
  '  --src-unknown: #7a4b00;'

echo
echo "── 배선 (컴포넌트) ────────────────────────────────────────"
mutate "문제은행 카드에서 print:hidden 을 뺀다 (지면이 바뀐다)" "$SRC_CARD" \
  'className={`${MICRO} no-underline ${badge.className} print:hidden`}' \
  'className={`${MICRO} no-underline ${badge.className}`}'
mutate "문제은행 카드가 첫 라벨만 그린다 (그림 출처가 사라진다)" "$SRC_CARD" \
  '{provenanceBadges(problem).map((badge) => (' \
  '{provenanceBadges(problem).slice(0, 1).map((badge) => ('
# 여는 태그만 바꾸면 JSX 가 안 닫혀 **컴파일 오류**가 난다 — 그건 «가드가 물었다»가
# 아니라 «러너가 죽었다»라서 하네스가 판정을 거부한다(1차 실행에서 실제로 그렇게 나왔고,
# 그 거부가 옳다). 그래서 요소를 통째로 갈아 끼운다.
mutate "라벨을 abbr 대신 button 으로 (D-30 위반)" "$SRC_CARD" \
  '          <abbr
            key={badge.kind}
            data-provenance={badge.kind}
            title={badge.name}
            className={`${MICRO} no-underline ${badge.className} print:hidden`}
          >
            {badge.text}
          </abbr>' \
  '          <button
            type="button"
            key={badge.kind}
            data-provenance={badge.kind}
            title={badge.name}
            className={`${MICRO} no-underline ${badge.className} print:hidden`}
          >
            {badge.text}
          </button>'
mutate "풀어 쓴 이름(title)을 뺀다" "$SRC_CARD" \
  '            title={badge.name}
            className={`${MICRO} no-underline ${badge.className} print:hidden`}' \
  '            className={`${MICRO} no-underline ${badge.className} print:hidden`}'
mutate "검수 카드에 회색을 같이 실어 색을 흐린다" "$SRC_REVIEW" \
  'className={`${MICRO_PLAIN} no-underline ${badge.className}`}' \
  'className={`${MICRO} no-underline ${badge.className}`}'
mutate "검수 카드에서 라벨을 통째로 뺀다" "$SRC_REVIEW" \
  '          {provenanceBadges(problem).map((badge) => (' \
  '          {[].map((badge: never) => ('

echo
echo "원복은 trap 이 한다 — 시작할 때 읽어 둔 **바이트 그대로** 되돌린다."
