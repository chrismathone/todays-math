"""census-tier-frames-m3.ts 의 검출기를 하나씩 망가뜨려 --selftest 가 빨개지는지 본다.

규약(이 저장소가 데인 자리):
  ⑴ 변이 **전에** 기준을 돌려 초록인지 본다 — 초록을 못 내는 도구는 판정할 수 없다.
  ⑵ 앵커가 정확히 한 번 걸리고 파일이 실제로 바뀌었는지 본다. 아니면 판정을 **거부**한다.
  ⑶ 복원은 **시작할 때 읽어 둔 바이트 그대로**. git show 로 되돌리면 미커밋 수정을 먹는다.
  ⑷ 앵커는 **prettier 가 만든 지금 모양** 이어야 한다 — 포맷이 줄을 합치면 앵커가 죽는다.
"""
import subprocess, sys

P = "scripts/qa/census-tier-frames-m3.ts"
ORIG = open(P, "rb").read()

st = subprocess.run(["git", "status", "--porcelain", "--", P],
                    capture_output=True, text=True).stdout.strip()
if st:
    print("🔴 대상 파일에 미커밋 수정이 있다 — 멈춘다:", st)
    sys.exit(2)


def selftest():
    r = subprocess.run(["npx", "tsx", P, "--selftest"],
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace", shell=True)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


code, out = selftest()
if code != 0:
    print("🔴 기준이 이미 빨갛다 — 변이 판정을 거부한다.")
    print(out[-2000:])
    sys.exit(2)
print("음성 대조 통과 — 변이 전 --selftest 초록 (이 도구는 «아니오»를 낼 자격이 있다)\n")

BS = chr(92)
# 🔴 이 저장소는 autocrlf 라 **작업 트리 파일이 CRLF** 다. 앵커에 LF 만 쓰면
#    여러 줄 앵커가 통째로 «0번 걸린다»로 나오고, 그것은 「가드가 아니다」와
#    구분되지 않는다(실제로 3개가 그렇게 판정 거부됐다).
NL = chr(13) + chr(10) if bytes([13, 10]) in ORIG else chr(10)
print(f"줄끝: {'CRLF' if NL != chr(10) else 'LF'}")

MUT = [
    ("㉠ 되짚기 마디를 늘 0 으로",
     "    ) ?? []" + NL + "  ).length;",
     "    ) ?? []" + NL + "  ).length * 0;"),
    ("㉡ 안 굳는 마디를 늘 참으로",
     "    /또는/.test(p) &&",
     "    true ||"),
    ("㉡ 「또는」만 봐도 되게 (조건 고르기를 안 본다)",
     "    /또는/.test(p) && /(버린다|버리|아니므로|이어야|않으므로|만족)/.test(p)",
     "    /또는/.test(p)"),
    ("㉢ 열거 문턱을 1 로 낮춘다",
     "return enumeratedSteps(solution) >= 3;",
     "return enumeratedSteps(solution) >= 1;"),
    ("㉣ 발문에 있는 문자도 «새 문자»로 센다",
     "  for (const c of grab(solution)) if (!q.has(c)) n += 1;",
     "  for (const c of grab(solution)) if (c || !q.has(c)) n += 1;"),
    ("㉤ 조건 낱말 목록을 비운다",
     "plainText(content).match(/(일 때|이고|이며|이면|단,|였더니|더니)/g)",
     "plainText(content).match(/(절대로안나오는말)/g)"),
    ("㉥ 변형 착상을 늘 참으로",
     "return RESHAPE.some((re) => re.test(solution));",
     "return true;"),
    ("㉧ 문장 수에서 수식 줄도 센다",
     ".filter((x) => /[가-힣]/.test(x)).length;",
     ".filter((x) => x.length > 0).length;"),
    ("Ⓓ 구조 탐색을 늘 참으로",
     "  const p = plainText(content);" + NL + "  if (/모두 몇 가지",
     "  const p = plainText(content);" + NL + "  if (p || true) return true;" + NL + "  if (/모두 몇 가지"),
    ("Ⓓ 「개수를 구하시오」까지 탐색으로 센다",
     "if (/모두 몇 가지|경우의 수|가능한 모든|서로 다른 .{0,6}가지/.test(p))",
     "if (/개수|모두 몇 가지|경우의 수|가능한 모든|서로 다른 .{0,6}가지/.test(p))"),
    ("Ⓔ 예/아니요를 늘 거짓으로",
     "  return /^" + BS + "s*" + BS + "$?" + BS + "s*(예|아니요",
     "  return false && /^" + BS + "s*" + BS + "$?" + BS + "s*(예|아니요"),
    ("꼴 — 수식 밖의 수를 안 지운다",
     '.replace(/[0-9]+/g, "#")',
     '.replace(/[0-9]{99}/g, "#")'),
    ("꼴 — 수식을 안 접는다",
     "return s.replace(/" + BS + "$[^$]*" + BS + '$/g, " ◇ ");',
     "return s;"),
    ("원장 — 되돌림 목록을 안 뺀다",
     "    if (removedIds.has(r.problemId)) {",
     "    if (!r) {"),
    ("원장 — 중등이 아닌 행도 «못 읽음»으로 안 센다 (읽기 실패를 조용히 삼킨다)",
     '      if (r.externalId.startsWith("engine-mid:")) bad += 1;',
     "      bad += 0;"),
    ("Ⓐ — 계산 지시가 아닌 것도 통과시킨다",
     "  return OPERATION_INSTRUCTION_WORDS.some((w) => tail.endsWith(w))" + NL + "    ? only" + NL + "    : null;",
     "  return only + tail.slice(0, 0);"),
]

ok = 0
skipped = 0
for name, old, new in MUT:
    src = ORIG.decode("utf-8")
    n = src.count(old)
    if n != 1:
        print(f"⚠️ {name} — 앵커가 {n}번 걸린다. **판정 거부.**")
        skipped += 1
        continue
    mutated = src.replace(old, new, 1).encode("utf-8")
    if mutated == ORIG:
        print(f"⚠️ {name} — 파일이 안 바뀌었다. **판정 거부.**")
        skipped += 1
        continue
    open(P, "wb").write(mutated)
    try:
        code, out = selftest()
    finally:
        open(P, "wb").write(ORIG)
    if code != 0:
        print(f"🔴 {name} — 빨강 (가드가 문다)")
        ok += 1
    else:
        print(f"🟢 {name} — **초록. 이 눈금은 가드가 아니다.**")

print(f"{NL}변이 {len(MUT)}개 — 빨강 {ok} · 초록 {len(MUT)-ok-skipped} · 판정거부 {skipped}")
assert open(P, "rb").read() == ORIG, "복원 실패"
code, _ = selftest()
print("복원 뒤 기준:", "초록" if code == 0 else "🔴 빨강")
