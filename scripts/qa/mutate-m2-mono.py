"""
중2 2-1 「단항식의 계산 16 + 다항식의 계산 13」 29유형(m2Mono) 변이 시험.

판정은 **3단**이다 (2026-08-20·21 교훈):
  ⑴ 파일이 정말 바뀌었나        — 앵커가 안 맞으면 «변이 안 됨»
  ⑵ **산출물이 정말 바뀌었나**  — 파일만 바뀌고 동작이 같으면 **판정을 거부**한다
                                   (여기를 건너뛰면 멀쩡한 가드를 의심하러 간다)
  ⑶ 그제서야 시험이 빨개지나    — 초록이면 그 시험은 장식이다

되돌리기는 **시작할 때 읽어 둔 바이트 그대로** 쓴다. `git show HEAD:` 로 짜면
커밋 안 된 수정을 덮는다(2026-08-23 교훈). 그래서 시작 전에 대상 파일이
커밋돼 있는지부터 확인하고, 아니면 **멈춘다**.

변이 몇은 값이 **안 바뀌는** 것을 일부러 골랐다 — 대입 검산만으로는 못 잡고
전용 가드(동류항·음의 지수·부호 겹침·기약)만 잡는 자리다. 그래야 그 가드가
장식이 아니라는 것을 안다.

    python scripts/qa/mutate-m2-mono.py
"""

import hashlib
import io
import os
import subprocess
import sys

TARGET = "src/lib/middle/m2Mono.ts"
TEST = "src/__tests__/unit/middleM2Mono.test.ts"
PROBE = "scripts/qa/probe-m2-mono.ts"

BS = chr(92)  # 역슬래시 한 개 — 도구 층이 벗기지 못하게 조립한다
NL = chr(10)

MUTATIONS = [
    (
        "M1 거듭제곱이 계수를 안 건드린다 — (-2a)^3 이 -2a^3 이 된다",
        "return mono(qPow(m.c, k), e);",
        "return mono(m.c, e);",
    ),
    (
        "M2 m<n 인 몫을 음의 지수로 적는다 (값은 같다 — 표기 가드만 잡는다)",
        "kind === 0 ? varTex(v, m - n) : `" + BS * 2 + "dfrac{1}{${varTex(v, n - m)}}`;",
        "varTex(v, m - n);",
    ),
    (
        "M3 동류항이 아닌데 합친다 — 서명을 안 보고 전부 한 항으로",
        "    const k = monoKey(t);",
        '    const k = "";',
    ),
    (
        "M4 동류항을 안 합친다 (값은 같다 — 「정리했나」 가드만 잡는다)",
        "    const k = monoKey(t);",
        "    const k = monoKey(t) + String(map.size);",
    ),
    (
        "M5 「어떤 식」의 부호를 뒤집는다 (더했다↔뺐다)",
        "const ans = kind === 0 ? polySub(b, a) : polyAdd(b, a);",
        "const ans = kind === 0 ? polyAdd(b, a) : polySub(b, a);",
    ),
    (
        "M6 자릿수를 하나 적게 센다",
        "const digits = String(lead).length + lo;",
        "const digits = String(lead).length + lo - 1;",
    ),
    (
        "M7 일의 자리 되풀이 색인을 한 칸 밀어 읽는다",
        "const digit = cycle[(total - 1) % 4]!;",
        "const digit = cycle[total % 4]!;",
    ),
    (
        "M8 괄호 여러 개 유형의 부호 겹침을 되살린다 (값은 같다 — 실제 났던 결함)",
        "${polyTex(t2)}${signedTermTex(-k, polyTex(t3))}",
        "${polyTex(t2)}-${coefTex(k)}${paren(polyTex(t3))}",
    ),
    (
        "M9 유리수를 약분하지 않는다 (값은 같다 — 기약 가드만 잡는다)",
        "const g = gcd(nn, dd) || 1;",
        "const g = 1;",
    ),
    (
        "M10 발문의 수를 수식 밖으로 내보낸다 (bareNumbers 가드)",
        "크기가 $2^{${n}}$바이트인",
        "크기가 2^{${n}}바이트인",
    ),
    (
        "M11 □ 를 등식과 다른 연산으로 푼다",
        "? monoMul(monoDiv(monoPow(a, ka), b), box)",
        "? monoMul(monoMul(monoPow(a, ka), b), box)",
    ),
]


def sh(args):
    return subprocess.run(
        args, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )


def probe():
    """산출물 지문 — 던지는 것도 산출물로 친다."""
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

    # 이 스크립트는 대상 파일을 덮어쓴다 — 커밋 안 된 수정이 있으면 멈춘다.
    dirty = sh(["git", "status", "--porcelain", "--", TARGET]).stdout.strip()
    if dirty:
        sys.exit("대상에 커밋 안 된 수정이 있다 — 되돌리기가 그것을 덮는다:" + NL + dirty)

    original = read_bytes(TARGET)
    orig_md5 = hashlib.md5(original).hexdigest()
    src = original.decode("utf-8")

    base_probe = probe()
    base = sh(["node", "node_modules/vitest/vitest.mjs", "run", TEST, "--pool=threads"])
    if base.returncode != 0:
        sys.exit("기준 시험이 이미 빨갛다 — 변이를 판정할 수 없다")
    print("기준: 시험 초록 · 산출물 지문 " + base_probe[:12])
    print("")

    results = []
    try:
        for name, old, new in MUTATIONS:
            hits = src.count(old)
            if hits != 1:
                results.append((name, "앵커 %d개 — 변이 못 함" % hits, False))
                print("[%s]%s  ⑴ 앵커 %d개 ← 판정 불가%s" % (name, NL, hits, NL))
                continue

            write_bytes(TARGET, src.replace(old, new, 1).encode("utf-8"))

            # ⑴ 파일이 바뀌었나
            if read_bytes(TARGET) == original:
                results.append((name, "파일이 안 바뀜", False))
                print("[%s]%s  ⑴ 파일 그대로 ← 판정 불가%s" % (name, NL, NL))
                write_bytes(TARGET, original)
                continue

            # ⑵ 산출물이 바뀌었나
            mut_probe = probe()
            if mut_probe == base_probe:
                results.append((name, "산출물이 그대로 — 판정 거부", False))
                print(
                    "[%s]%s  ⑴ 파일 바뀜  ⑵ 산출물 **그대로** ← 판정 거부"
                    " (뜻이 안 바뀌는 변이다)%s" % (name, NL, NL)
                )
                write_bytes(TARGET, original)
                continue

            # ⑶ 시험이 빨개지나
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
        print("되돌림 md5 %s == 원본 %s : %s" % (back[:12], orig_md5[:12], back == orig_md5))
        if back != orig_md5:
            sys.exit("되돌리기 실패 — 손으로 확인할 것")

    red_count = sum(1 for _, _, ok in results if ok)
    print("")
    for name, verdict, _ in results:
        print("  %-64s %s" % (name, verdict))
    print("")
    print("빨강 %d / %d" % (red_count, len(MUTATIONS)))
    if red_count < len(MUTATIONS):
        sys.exit("빨강이 전부가 아니다 — 시험이 무엇을 지키는지 다시 볼 것")


if __name__ == "__main__":
    main()
