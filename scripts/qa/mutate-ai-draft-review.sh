#!/usr/bin/env bash
# 출제 화면 인라인 검수 — 가드를 **망가뜨려 봐야** 가드인 줄 안다.
#
# 판정 순서 (CLAUDE.md 2026-08-20 · 08-21 · 08-23):
#
#   ㉠ 음성 대조 — 변이를 **넣기 전에** 시험이 초록인가. 아니면 판정 거부.
#   ⑴ 앵커가 파일에 **정확히 하나**인가 — 아니면 판정 거부
#   ⑵ 파일 바이트가 바뀌었나 — 안 바뀌면 치환이 헛돈 것이다
#   ⑶ 동작이 바뀌었나 — **여기는 전부 `구조` 다.** 아래 «⑶ 을 못 재는 이유» 참조.
#   ⑷ 그제서야 시험이 빨개지나
#
# ## ⑶ 을 못 재는 이유 — 숨기지 않고 적는다
#
# 지문(fingerprint)은 「같은 입력에 같은 답을 내는 함수」가 있어야 그릴 수 있다.
# 여기 대상은 React 훅·컴포넌트라 그런 함수가 없다 — 답이 「화면에 무엇이 그려졌나」이고
# 그건 시험을 돌려야 알 수 있어서, ⑶ 과 ⑷ 가 같은 실행이 된다. 그래서 `구조` 로 찍고
# 넘어간다(`mutate-provenance.sh` 가 컴포넌트 변이에서 하는 것과 같다).
#
# **그 대신 무효 변이 하나를 일부러 넣어 뒀다** — 주석만 고치는 변이는 «🟢 초록» 이
# 나와야 정상이고, 그것이 이 하네스가 도장이 아니라는 증거다(⑷ 가 실제로 진실을
# 따라 변한다). 초록이 하나도 안 나오면 그 자체를 의심하라.
#
# ⚠️ 대상 파일에 커밋 안 된 수정이 있으면 멈춘다. 되돌리기 기준이 «시작할 때 읽어 둔
#    바이트»라, 중간에 죽으면 그 수정이 사라진다(2026-08-23 에 실제로 그렇게 잃었다).
set -u

SRC_HOOK=src/components/test/useGenerateSetup.ts
SRC_LIST=src/components/test/AiDraftReview.tsx
SRC_FORM=src/components/test/GenerateSetup.tsx
TESTS=(
  src/__tests__/components/aiDraftReview.test.tsx
  src/__tests__/components/GenerateSetup.test.tsx
  src/__tests__/components/aiGenerateProgress.test.tsx
)
ALL_SRC=("$SRC_HOOK" "$SRC_LIST" "$SRC_FORM")

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

echo "㉠ 음성 대조 — 변이 없이 먼저 돌린다"
if ! run_tests; then
  echo "🔴 기준 시험이 이미 빨갛다. 판정을 **거부**한다."
  tail -20 "$WORK/log"
  exit 2
fi
echo "🟢 기준 초록 — 이제 판정할 수 있다"
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

  if run_tests; then
    echo "🟢 초록      $name  [⑶구조]  <-- 가드가 아니다"
  else
    local names
    names=$(failed_names)
    if [ -z "$names" ]; then
      echo "⛔ 판정거부  $name  (⑷ 빨간데 **실패한 시험을 못 댄다** — 러너가 죽은 것일 수 있다)"
      tail -5 "$WORK/log"
      return
    fi
    echo "🔴 빨강      $name"
    echo "     ↳ $names"
  fi
}

echo "── D-22 · 승격 경로 ──────────────────────────────────────"
# 🔴 이 저장소가 실제로 한 번 어긴 자리다(2026-08-14, E2E 초록 맞추려고 자동 승격).
mutate "자동 승격 — 생성 직후 전부 approved 로 만든다" "$SRC_HOOK" \
  '      setAiDrafts((before) => [...before, ...created.data]);' \
  '      setAiDrafts((before) => [
        ...before,
        ...created.data.map((p) => ({ ...p, reviewStatus: "approved" as const })),
      ]);
      for (const p of created.data) await updateReviewStatus(p.id, "approved");'
mutate "서버에 안 묻고 **화면이 스스로** 상태만 바꾼다 (PATCH 를 안 보낸다)" "$SRC_HOOK" \
  '      try {
        await updateReviewStatus(id, next);
      } catch (error) {' \
  '      try {
        if (next === "___never___") await updateReviewStatus(id, next);
      } catch (error) {'
mutate "승인 결과를 뒤집는다 (반려를 승인으로 보낸다)" "$SRC_HOOK" \
  '        await updateReviewStatus(id, next);' \
  '        await updateReviewStatus(id, "approved");'

echo
echo "── 부족분을 **서버가 센다** ───────────────────────────────"
mutate "승인 뒤 다시 안 묻는다 (숫자가 안 줄어든다)" "$SRC_HOOK" \
  '      if (next === "approved") await generate();' \
  ''
# ⚠️ 이 변이는 처음에 `if (next === "approved") await generate();` → `await generate();`
#    로 썼고 **🟢 초록**이 나왔다. 가드가 없어서가 아니라 **변이가 무효**였다 —
#    반려는 그 줄에 닿기 전에 위쪽 `return` 으로 빠지므로 조건을 지워도 동작이 그대로다.
#    그래서 **반려 갈래 안에서** 다시 묻게 바꾼다. 「파일이 바뀌었다」와 「동작이
#    바뀌었다」는 다른 말이다(CLAUDE.md 2026-08-21) — ⑶ 을 못 재는 하네스에서는
#    변이를 쓸 때 **그 코드가 실제로 도는 자리인지** 사람이 확인해야 한다.
mutate "반려도 다시 묻는다 (반려가 부족분을 건드리는 것처럼 보인다)" "$SRC_HOOK" \
  '        setAiDrafts((before) => before.filter((draft) => draft.id !== id));
        return;' \
  '        setAiDrafts((before) => before.filter((draft) => draft.id !== id));
        await generate();
        return;'
mutate "가용을 화면이 제 손으로 올린다 (서버 숫자를 덮어쓴다)" "$SRC_HOOK" \
  '      if (next === "approved") await generate();' \
  '      if (next === "approved")
        setInsufficient((before) =>
          before ? { ...before, available: before.available + 1 } : before,
        );'

echo
echo "── 목록 관리 ─────────────────────────────────────────────"
mutate "반려한 것을 목록에서 안 뺀다 (전부 반려해도 원래 자리로 못 돌아간다)" "$SRC_HOOK" \
  '        setAiDrafts((before) => before.filter((draft) => draft.id !== id));
        return;' \
  '        return;'
mutate "생성물을 이어 붙이지 않고 갈아 끼운다 (앞 회차 카드가 사라진다)" "$SRC_HOOK" \
  '      setAiDrafts((before) => [...before, ...created.data]);' \
  '      setAiDrafts(created.data);'
mutate "반을 바꿔도 목록을 안 비운다 (앞 반 문항을 이 반 부족분으로 읽는다)" "$SRC_HOOK" \
  '      // 반이 바뀌면 **검수 대상 단원 자체가 바뀐다** — 앞 반에서 만든 카드를 그대로
      // 두면 원장님이 다른 반의 문항을 이 반의 부족분으로 읽는다. 행은 은행에 남는다.
      setAiDrafts([]);' \
  ''
mutate "🔴 재확인이 검수 목록을 지운다 (승인할 때마다 카드가 사라진다)" "$SRC_HOOK" \
  '      setBusy(true);
      setSubmitError(null);' \
  '      setBusy(true);
      setSubmitError(null);
      setAiDrafts([]);'

echo
echo "── 화면 배선 ─────────────────────────────────────────────"
mutate "검수 목록을 아예 안 그린다" "$SRC_FORM" \
  '          <AiDraftReview
            drafts={form.aiDrafts}
            onReviewStatusChange={form.reviewAiDraft}
          />' \
  ''
mutate "카드에 검수 손잡이를 안 넘긴다 (승인·반려 버튼이 사라진다)" "$SRC_LIST" \
  '            onReviewStatusChange={onReviewStatusChange}' \
  ''
mutate "같은 뷰를 버리고 본문만 날로 그린다 (문항 코드·해설이 사라진다)" "$SRC_LIST" \
  '          <ProblemCard
            key={draft.id}
            problem={draft}
            onReviewStatusChange={onReviewStatusChange}
          />' \
  '          <div key={draft.id}>{draft.content}</div>'

echo
echo "── 무효 변이 (🟢 초록이 **정답**이다 — 이 하네스가 도장이 아님을 보인다) ──"
mutate "[무효 변이 시험] 주석만 고친다" "$SRC_LIST" \
  '  if (drafts.length === 0) return null;' \
  '  // (무효 변이 — 뜻이 안 바뀐다)
  if (drafts.length === 0) return null;'

echo
echo "원복은 trap 이 한다 — 시작할 때 읽어 둔 **바이트 그대로** 되돌린다."
