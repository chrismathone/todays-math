"""
중3 3-2 「산포도」7 + 「상자그림과 산점도」10 = 17유형(m3Stat2) 변이 시험.

판정은 **3단**이다 (물결 계약 §8):
  ⑴ 파일이 정말 바뀌었나        — 앵커가 안 맞으면 «변이 안 됨»
  ⑵ **산출물이 정말 바뀌었나**  — 파일만 바뀌고 동작이 같으면 **판정을 거부**한다
  ⑶ 그제서야 시험이 빨개지나    — 초록이면 그 시험은 장식이다

되돌리기는 **시작할 때 읽어 둔 바이트 그대로** 쓴다. 시작 전에 대상 파일이
커밋돼 있는지부터 확인하고, 아니면 멈춘다.

이 파일의 변이도 m2Pytha 와 같이 **역슬래시 없는 순수 코드 줄**만 건드린다.
`quartiles7` 을 공유하는 여러 유형에서 짧은 줄이 겹쳐(예: `const mean = sum / 5;`
가 산포도05·상자그림10 둘 다에 있다), 그런 자리는 **`def(...)` 줄부터** 여러
줄을 통째로 앵커로 묶어 유형을 못 박는다.

    python scripts/qa/mutate-m3-stat2.py            # 전량
    python scripts/qa/mutate-m3-stat2.py M09        # 이름에 그 글자가 든 것만
"""

import hashlib
import io
import os
import subprocess
import sys

TARGET = "src/lib/middle/m3Stat2.ts"
TEST = "src/__tests__/unit/middleM3Stat2.test.ts"
PROBE = "scripts/qa/probe-m3-stat2.ts"

NL = chr(10)

MUTATIONS = [
    (
        "M01 01(산포도) 편차 답을 idx 대신 0번 학생으로",
        "answer: `$${devs[idx]}$점`,",
        "answer: `$${devs[0]}$점`,",
    ),
    (
        "M02 02(산포도) 편차 합 0 조건에서 부호를 뗀다",
        "const x = -knowns.reduce((s, v) => s + v, 0);",
        "const x = knowns.reduce((s, v) => s + v, 0);",
    ),
    (
        "M03 03(산포도) 분산 분모를 5에서 4로",
        "const variance = sumSq / 5;",
        "const variance = sumSq / 4;",
    ),
    (
        "M04 04(산포도) 새 분산에서 a² 대신 a",
        "const newVar = a * a * variance;",
        "const newVar = a * variance;",
    ),
    (
        "M05 05(산포도) 평균 분모를 5에서 4로",
        'def(MINOR_DISP, "05", "자료의 이해", SEC.산포도, "easy", (rng) =>'
        + NL
        + "    attempt(200, () => {"
        + NL
        + "      const values = distinctSorted(rng, 5, 40, 90);"
        + NL
        + "      const sum = values.reduce((s, v) => s + v, 0);"
        + NL
        + "      if (sum % 5 !== 0) return null;"
        + NL
        + "      const mean = sum / 5;",
        'def(MINOR_DISP, "05", "자료의 이해", SEC.산포도, "easy", (rng) =>'
        + NL
        + "    attempt(200, () => {"
        + NL
        + "      const values = distinctSorted(rng, 5, 40, 90);"
        + NL
        + "      const sum = values.reduce((s, v) => s + v, 0);"
        + NL
        + "      if (sum % 5 !== 0) return null;"
        + NL
        + "      const mean = sum / 4;",
    ),
    (
        "M06 06(산포도) 가중평균 분모에 1을 더한다",
        "const combined = total / (n1 + n2);",
        "const combined = total / (n1 + n2 + 1);",
    ),
    (
        "M07 07(산포도) 곱셈 갈래 — k배 대신 k를 더한다",
        "const newSd = k * sd;",
        "const newSd = k + sd;",
    ),
    (
        "M08 07(산포도) 덧셈 갈래 — 표준편차 불변 답에 1을 더한다",
        "answer: `$${sd}$`,",
        "answer: `$${sd + 1}$`,",
    ),
    (
        # ⚠️ 객체 구조분해는 키 이름이 매칭 기준이라 **나열 순서를 바꾸는 것은
        # 아무 효과가 없다**(배열 구조분해와 다르다 — m2Pytha 의 03번 [w,h,d]
        # 순서 변이는 배열이라 유효했다). 실제로 값을 바꿔치기하려면 별칭
        # (`q1: q3`) 구문이 필요하다 — 처음엔 이걸 놓쳐 「산출물 그대로」를 봤다.
        "M09 01(상자그림) 제1·제3사분위수 값을 바꿔 단다",
        'def(MINOR_BOX, "01", "사분위수", SEC.상자, "mid", (rng) => {'
        + NL
        + "    const sorted = distinctSorted(rng, 7, 5, 60);"
        + NL
        + "    const { min, q1, med, q3, max } = quartiles7(sorted);",
        'def(MINOR_BOX, "01", "사분위수", SEC.상자, "mid", (rng) => {'
        + NL
        + "    const sorted = distinctSorted(rng, 7, 5, 60);"
        + NL
        + "    const { min, q1: q3, med, q3: q1, max } = quartiles7(sorted);",
    ),
    (
        "M10 02(상자그림) x 답에 1을 더한다",
        "const facts: Record<string, number> = { x: q1 };",
        "const facts: Record<string, number> = { x: q1 + 1 };",
    ),
    (
        "M11 03(상자그림) 제1·제3사분위수 값을 바꿔 단다",
        'def(MINOR_BOX, "03", "상자그림으로 나타내기", SEC.상자, "mid", (rng) =>'
        + NL
        + "    attempt(200, () => {"
        + NL
        + "      const sorted = distinctSorted(rng, 7, 10, 70);"
        + NL
        + "      const { min, q1, med, q3, max } = quartiles7(sorted);",
        'def(MINOR_BOX, "03", "상자그림으로 나타내기", SEC.상자, "mid", (rng) =>'
        + NL
        + "    attempt(200, () => {"
        + NL
        + "      const sorted = distinctSorted(rng, 7, 10, 70);"
        + NL
        + "      const { min, q1: q3, med, q3: q1, max } = quartiles7(sorted);",
    ),
    (
        "M12 04(상자그림) 사분위수범위에서 1을 뺀다",
        "const iqr = q3 - q1;",
        "const iqr = q3 - q1 - 1;",
    ),
    (
        "M13 05(상자그림) 중앙값 차에 1을 더한다",
        "const diff = Math.abs(A.med - B.med);",
        "const diff = Math.abs(A.med - B.med) + 1;",
    ),
    (
        "M14 06(산점도) 이상인 점의 개수에 1을 더한다",
        "const count = xs.filter((x) => x >= threshold).length;",
        "const count = xs.filter((x) => x >= threshold).length + 1;",
    ),
    (
        "M15 07(산점도) x>y 인 점의 개수에 1을 더한다",
        "const count = xs.filter((x, i) => x > ys[i]!).length;",
        "const count = xs.filter((x, i) => x > ys[i]!).length + 1;",
    ),
    (
        "M16 08(산점도) 무상관 순열을 완전한 양의 상관으로",
        "none: [2, 4, 0, 5, 1, 3],",
        "none: [0, 1, 2, 3, 4, 5],",
    ),
    (
        "M17 09(산점도) 두 점 사이 거리 답에 1을 더한다",
        "answer: `$${dist}$`,",
        "answer: `$${dist + 1}$`,",
    ),
    (
        "M18 10(산점도) 평균 분모를 5에서 4로",
        'def(MINOR_BOX, "10", "산점도에서 평균 구하기", SEC.산점도, "mid", (rng) =>'
        + NL
        + "    attempt(200, () => {"
        + NL
        + "      const xs = distinctSorted(rng, 5, 40, 90);"
        + NL
        + "      const sum = xs.reduce((s, v) => s + v, 0);"
        + NL
        + "      if (sum % 5 !== 0) return null;"
        + NL
        + "      const mean = sum / 5;",
        'def(MINOR_BOX, "10", "산점도에서 평균 구하기", SEC.산점도, "mid", (rng) =>'
        + NL
        + "    attempt(200, () => {"
        + NL
        + "      const xs = distinctSorted(rng, 5, 40, 90);"
        + NL
        + "      const sum = xs.reduce((s, v) => s + v, 0);"
        + NL
        + "      if (sum % 5 !== 0) return null;"
        + NL
        + "      const mean = sum / 4;",
    ),
]


def sh(args):
    return subprocess.run(
        args, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )


def probe():
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    r = subprocess.run(
        ["node", "node_modules/tsx/dist/cli.mjs", PROBE],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )
    return hashlib.md5((r.stdout + r.stderr).encode("utf-8")).hexdigest()


def read_bytes(p):
    with io.open(p, "rb") as f:
        return f.read()


def write_bytes(p, b):
    with io.open(p, "wb") as f:
        f.write(b)


def main():
    if not os.path.exists(TARGET):
        sys.exit("대상이 없다: " + TARGET)

    dirty = sh(["git", "status", "--porcelain", "--", TARGET]).stdout.strip()
    if dirty:
        sys.exit(
            "대상에 커밋 안 된 수정이 있다 — 되돌리기가 그것을 덮는다:" + NL + dirty
        )

    original = read_bytes(TARGET)
    orig_md5 = hashlib.md5(original).hexdigest()
    src = original.decode("utf-8")

    base_probe = probe()
    base = sh(["node", "node_modules/vitest/vitest.mjs", "run", TEST, "--pool=threads"])
    if base.returncode != 0:
        sys.exit("기준 시험이 이미 빨갛다 — 변이를 판정할 수 없다")
    print("기준: 시험 초록 · 산출물 지문 " + base_probe[:12])
    print("")

    only = sys.argv[1] if len(sys.argv) > 1 else ""
    picked = [m for m in MUTATIONS if not only or only in m[0]]
    if not picked:
        sys.exit("고른 변이가 없다: " + only)
    if only:
        print("거름: «%s» — %d / %d 개만 판정한다" % (only, len(picked), len(MUTATIONS)))

    results = []
    try:
        for name, old, new in picked:
            hits = src.count(old)
            if hits != 1:
                results.append((name, "앵커 %d개 — 변이 못 함" % hits, False))
                print("[%s]%s  ⑴ 앵커 %d개 ← 판정 불가%s" % (name, NL, hits, NL))
                continue

            write_bytes(TARGET, src.replace(old, new, 1).encode("utf-8"))

            if read_bytes(TARGET) == original:
                results.append((name, "파일이 안 바뀜", False))
                print("[%s]%s  ⑴ 파일 그대로 ← 판정 불가%s" % (name, NL, NL))
                write_bytes(TARGET, original)
                continue

            mut_probe = probe()
            if mut_probe == base_probe:
                results.append((name, "산출물이 그대로 — 판정 거부", False))
                print(
                    "[%s]%s  ⑴ 파일 바뀜  ⑵ 산출물 **그대로** ← 판정 거부"
                    " (뜻이 안 바뀌는 변이다)%s" % (name, NL, NL)
                )
                write_bytes(TARGET, original)
                continue

            r = sh(
                ["node", "node_modules/vitest/vitest.mjs", "run", TEST, "--pool=threads"]
            )
            red = r.returncode != 0
            results.append((name, "빨강" if red else "초록 ← 가드가 아니다", red))
            print(
                "[%s]%s  ⑴ 파일 바뀜  ⑵ 산출물 바뀜(%s)  ⑶ %s%s"
                % (
                    name,
                    NL,
                    mut_probe[:12],
                    "🔴 빨강" if red else "🟢 초록 ← 가드가 아니다",
                    NL,
                )
            )
            write_bytes(TARGET, original)
    finally:
        write_bytes(TARGET, original)
        back = hashlib.md5(read_bytes(TARGET)).hexdigest()
        print(
            "되돌림 md5 %s == 원본 %s : %s"
            % (back[:12], orig_md5[:12], back == orig_md5)
        )
        if back != orig_md5:
            sys.exit("되돌리기 실패 — 손으로 확인할 것")

    red_count = sum(1 for _, _, ok in results if ok)
    print("")
    for name, verdict, _ in results:
        print("  %-72s %s" % (name, verdict))
    print("")
    print("빨강 %d / %d" % (red_count, len(picked)))
    if red_count < len(picked):
        sys.exit("빨강이 전부가 아니다 — 시험이 무엇을 지키는지 다시 볼 것")


if __name__ == "__main__":
    main()
