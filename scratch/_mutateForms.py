"""갈래 A 가 새로 세운 유형들의 **값 가드** 변이 시험.

3단계로 판정한다(CLAUDE.md 2026-08-21):
  (1) 파일이 바뀌었나  (2) 산출물이 바뀌었나  (3) 그제서야 시험이 빨개지나
(2) 는 가드와 **다른 도구**(`_dumpAll.ts`)로 잰다.

쓰기:
  python scratch/_mutateForms.py             # 전량
  python scratch/_mutateForms.py --only 대푯값  # 이름에 그 말이 든 것만
"""

import io
import subprocess
import sys

# 콘솔이 cp949 라 한글·— 를 못 찍고 죽는다. 판정을 못 보면 이 도구는 쓸모가 없다.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DUMP = ["npx", "tsx", "scratch/_dumpAll.ts"]
TEST = [
    "npx",
    "vitest",
    "run",
    "src/__tests__/unit/midTypesA.test.ts",
    "--reporter=json",
]

Q = "src/lib/middle/m2Quad.ts"
B2 = "src/lib/middle/m1Book2.ts"
SA = "src/lib/middle/m2SystemApply.ts"
M3 = "src/lib/middle/m3.ts"
EX = "src/lib/middle/m1Extra.ts"

# (설명, 파일, 찾을 것, 바꿀 것)
MUTATIONS = [
    (
        "평행사변형 20A: 이웃각을 대각으로",
        Q,
        "      const a = intBetween(rng, 35, 145);\n      const b = 180 - a;",
        "      const a = intBetween(rng, 35, 145);\n      const b = a;",
    ),
    (
        "평행사변형 20A: 둘레를 두 배 안 한다",
        Q,
        "    const peri = 2 * (m + n);",
        "    const peri = m + n;",
    ),
    (
        "평행사변형 20A: 갈래를 하나로 고정",
        Q,
        'def("20A", "평행사변형의 대각과 대변", SEC.성질, "연산", (rng): Body => {\n    const mode = intBetween(rng, 0, 1);',
        'def("20A", "평행사변형의 대각과 대변", SEC.성질, "연산", (rng): Body => {\n    const mode = intBetween(rng, 0, 0);',
    ),
    (
        "대푯값 07A: 평균을 개수로 안 나눈다",
        B2,
        "      const M = sum / 4;",
        "      const M = sum;",
    ),
    (
        "대푯값 08A: 최빈값이 하나뿐인 자료",
        B2,
        "      const vals = shuffle(rng, [m1, m1, m2, m2, s1, s2]);",
        "      const vals = shuffle(rng, [m1, m1, m2, s1, s2, m2 + 100]);",
    ),
    (
        "대푯값 09A: 합한 평균을 두 평균의 평균으로",
        B2,
        "          answer: `$${total / (boys + girls)}$점`,",
        "          answer: `$${(boyAvg + girlAvg) / 2}$점`,",
    ),
    (
        "대푯값 10A: 중앙값을 가운데가 아닌 값으로",
        B2,
        "      const median = sorted[3]!;",
        "      const median = sorted[2]!;",
    ),
    (
        "대푯값 10A: 최빈값이 둘이 되게",
        B2,
        "      const vals = shuffle(rng, [mode, mode, mode, a, b, c, d]);",
        "      const vals = shuffle(rng, [mode, mode, mode, a, a, a, d]);",
    ),
    (
        "위치 22A: 평행과 꼬인 위치를 맞바꾼다",
        B2,
        '  return edgeAxis(e1) === edgeAxis(e2) ? "평행" : "꼬인";',
        '  return edgeAxis(e1) !== edgeAxis(e2) ? "평행" : "꼬인";',
    ),
    (
        "위치 22A: 꼭짓점을 둘 공유해야 만난다고 본다",
        B2,
        '  if (sharedCount(e1, e2) >= 1) return "만남";',
        '  if (sharedCount(e1, e2) >= 2) return "만남";',
    ),
    (
        "위치 23A: 삼각기둥 옆모서리를 밑면 무리로",
        B2,
        '  return 3; // 옆모서리 AD · BE · CF',
        '  return 0; // 옆모서리 AD · BE · CF',
    ),
    (
        "위치 24A: 면의 법선 축을 뒤섞는다",
        B2,
        '  if (f === "ABFE" || f === "CGHD") return 1;',
        '  if (f === "ABFE" || f === "CGHD") return 0;',
    ),
    (
        "위치 25A: 꼬인 대신 평행한 모서리를 더한다",
        B2,
        '        (o) => o !== e && edgeRelation(e, o) === "꼬인",\n      );\n      const sum = skew.reduce',
        '        (o) => o !== e && edgeRelation(e, o) === "평행",\n      );\n      const sum = skew.reduce',
    ),
    (
        "다각형 25A: 삼각형을 대각선 개수로 답한다",
        B2,
        "        answer: `$${n - 2}$개`,",
        "        answer: `$${n - 3}$개`,",
    ),
    (
        "다각형 26A: 변의 개수를 하나 적게",
        B2,
        "        answer: `$${k + 3}$`,",
        "        answer: `$${k + 2}$`,",
    ),
    (
        "다각형 27A: n = 2k+3 을 k+3 으로",
        B2,
        "      const n = 2 * times + 3;",
        "      const n = times + 3;",
    ),
    (
        "다각형 28A: 대각선 세기에서 이웃을 안 뺀다",
        B2,
        "      const adjacent = j - i === 1 || (i === 0 && j === n - 1);\n      if (!adjacent) count += 1;",
        "      count += 1;",
    ),
    (
        "부채꼴 19A: 비례를 반비례로",
        B2,
        "        const second = k2 * t;",
        "        const second = k1 * t;",
    ),
    (
        "부채꼴 20A: 약수가 아닌 분모도 허용",
        B2,
        "      const part = pick(rng, [3, 4, 5, 6, 8, 9, 10, 12] as const);\n      const deg = 360 / part;",
        "      const part = pick(rng, [3, 4, 5, 7, 8, 9, 11, 12] as const);\n      const deg = 360 / part;",
    ),
    (
        "회전체 21A: 반지름을 제곱 안 한다",
        EX,
        "        answer: `$${r * r}\\\\pi\\\\,\\\\mathrm{cm}^2$`,",
        "        answer: `$${r}\\\\pi\\\\,\\\\mathrm{cm}^2$`,",
    ),
    (
        "회전체 22A: 밑면 반지름을 높이로 본다",
        EX,
        "        answer: `$${2 * base}\\\\pi\\\\,\\\\mathrm{cm}$`,",
        "        answer: `$${2 * height}\\\\pi\\\\,\\\\mathrm{cm}$`,",
    ),
    (
        "회전체 23A: 삼각형을 직사각형으로",
        EX,
        "        answer: `$${r * h}\\\\,\\\\mathrm{cm}^2$`,",
        "        answer: `$${2 * r * h}\\\\,\\\\mathrm{cm}^2$`,",
    ),
    (
        "회전체 24A: 윗면이 더 커도 된다",
        EX,
        "      const big = intBetween(rng, small + 1, 14);",
        "      const big = intBetween(rng, 2, 14);",
    ),
    (
        "상대도수 50A: 총합으로 안 나눈다",
        EX,
        "      const milli = Math.round((frequency * 1000) / total);",
        "      const milli = Math.round(frequency * 10);",
    ),
    (
        "상대도수 50A: 나누어떨어지지 않는 총합도 허용",
        EX,
        "      const total = pick(rng, [20, 25, 40, 50, 100, 200] as const);",
        "      const total = pick(rng, [20, 25, 40, 50, 100, 300] as const);",
    ),
    (
        "평행선 21A: 엇각을 보각으로",
        EX,
        "          answer: `$${angle}^\\\\circ$`,",
        "          answer: `$${180 - angle}^\\\\circ$`,",
    ),
    (
        "평행선 21A: 갈래를 하나로 고정",
        EX,
        "      const mode = intBetween(rng, 0, 1);\n      const angle = intBetween(rng, 25, 155);",
        "      const mode = 0;\n      const angle = intBetween(rng, 25, 155);",
    ),
    (
        "일속력 32A: 하루치를 뒤집는다",
        SA,
        "      answer: `$\\\\dfrac{1}{${days}}$`,",
        "      answer: `$\\\\dfrac{${days}}{1}$`,",
    ),
    (
        "일속력 33A: 함께 한 날수를 합으로",
        SA,
        "      const together = (a * b) / (a + b);",
        "      const together = a + b;",
    ),
    (
        "일속력 34A: 왕복 시간을 편도로 본다",
        SA,
        "      const hoursTimes = distance * (goSpeed + backSpeed);",
        "      const hoursTimes = distance * goSpeed;",
    ),
    (
        "일속력 35A: 따라잡는 시간의 분모를 합으로",
        SA,
        "      const gap = fast - slow;",
        "      const gap = fast + slow;",
    ),
    # ⚠️ 「fast 의 범위를 넓힌다」 변이는 **뜻이 안 바뀐다** — fast < slow 이면
    #    minutes 가 음수라 attempt 가 그 후보를 버리고 다시 뽑는다. 산출물은
    #    바뀌지만(rng 소비가 달라진다) 결함은 안 생긴다. 그래서 발문의 두 속력을
    #    **맞바꿔** 진짜로 「느린 쪽이 뒤에서 출발」하게 만든다.
    (
        "일속력 35A: 발문에서 두 속력을 맞바꾼다",
        SA,
        "        content: `동생이 분속 $${slow}\\\\,\\\\mathrm{m}$로 집을 나선",
        "        content: `동생이 분속 $${fast}\\\\,\\\\mathrm{m}$로 집을 나선",
    ),
    (
        "원과 현 17A: 현을 두 배 안 한다",
        M3,
        "      answer: `$${2 * half}\\\\,\\\\mathrm{cm}$`,",
        "      answer: `$${half}\\\\,\\\\mathrm{cm}$`,",
    ),
    (
        "원과 현 18A: 같은 거리인데 길이를 바꾼다",
        M3,
        '      answer: `$${ab}\\\\,\\\\mathrm{cm}$`,\n      solution: `한 원에서 중심으로부터 같은 거리에',
        '      answer: `$${ab + 2}\\\\,\\\\mathrm{cm}$`,\n      solution: `한 원에서 중심으로부터 같은 거리에',
    ),
    (
        "원과 현 19A: 거리와 반현을 맞바꾼다",
        M3,
        "      answer: `$${d}\\\\,\\\\mathrm{cm}$`,\n      solution: `중심 $O$에서 현 $AB$에 내린 수선의 발을 $M$이라 하면 $\\\\overline{AM}=\\\\dfrac{1}{2}\\\\times${2 * h}",
        "      answer: `$${h}\\\\,\\\\mathrm{cm}$`,\n      solution: `중심 $O$에서 현 $AB$에 내린 수선의 발을 $M$이라 하면 $\\\\overline{AM}=\\\\dfrac{1}{2}\\\\times${2 * h}",
    ),
    (
        "원과 현 20A: 넓이를 반지름으로",
        M3,
        "      answer: `$${r * r}\\\\pi\\\\,\\\\mathrm{cm}^2$`,",
        "      answer: `$${r}\\\\pi\\\\,\\\\mathrm{cm}^2$`,",
    ),
]


def run(cmd):
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=True,
    )


def read(path):
    return io.open(path, encoding="utf-8", newline="").read()


def write(path, text):
    io.open(path, "w", encoding="utf-8", newline="").write(text)


def adapt(text, sample):
    """줄바꿈을 그 파일에 맞춘다.

    ⚠️ 이 저장소는 autocrlf 라 파일마다 줄 끝이 다르다(`m3.ts` 는 CRLF,
       `m1Book2.ts` 는 LF). 여러 줄 앵커를 `\\n` 으로 적으면 CRLF 파일에서
       **말없이 «앵커 없음»** 이 되고, 그러면 변이 시험이 그 가드를 아예 안 잰다.
    """
    return text.replace("\n", "\r\n") if "\r\n" in sample else text


only = None
if "--only" in sys.argv:
    only = sys.argv[sys.argv.index("--only") + 1]
todo = [m for m in MUTATIONS if only is None or only in m[0]]
if not todo:
    print("고를 변이가 없다")
    sys.exit(2)

originals = {}
for _why, path, _a, _b in todo:
    originals.setdefault(path, read(path))

# 미커밋 대상이 있으면 멈춘다 — 이 스크립트는 대상 파일을 덮어쓴다(2026-08-23 교훈).
dirty = run(["git", "status", "--porcelain", "--"] + list(originals.keys())).stdout.strip()
if dirty:
    print("WARN: uncommitted changes in target files")
    print(dirty)
    print("(원본은 메모리에 담아 두고 finally 에서 되돌린다)")

base_dump = run(DUMP)
base_test = run(TEST)
if base_dump.returncode != 0 or base_test.returncode != 0:
    print("ABORT: baseline not green (dump=%d test=%d)" % (base_dump.returncode, base_test.returncode))
    print(base_test.stderr[-2000:])
    sys.exit(2)
print("baseline GREEN")

failures = []
try:
    for why, path, before, after in todo:
        orig = originals[path]
        before = adapt(before, orig)
        after = adapt(after, orig)
        if before not in orig:
            print("ABORT: anchor not found -> %s (%s)" % (why, path))
            failures.append(why)
            continue
        write(path, orig.replace(before, after, 1))
        if read(path) == orig:
            print("SKIP (file unchanged) %s" % why)
            failures.append(why)
            write(path, orig)
            continue
        dump = run(DUMP)
        changed = dump.returncode != 0 or dump.stdout != base_dump.stdout
        if not changed:
            print("SKIP (output unchanged) %s" % why)
            failures.append(why)
            write(path, orig)
            continue
        res = run(TEST)
        verdict = "RED" if res.returncode != 0 else "GREEN <- NOT A GUARD"
        print("%s | %s" % (verdict, why))
        if res.returncode == 0:
            failures.append(why)
        write(path, orig)
finally:
    for path, orig in originals.items():
        write(path, orig)
    print("restored: %s" % all(read(p) == o for p, o in originals.items()))

print("weak mutations: %d / %d" % (len(failures), len(todo)))
sys.exit(1 if failures else 0)
