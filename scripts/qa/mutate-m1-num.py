"""
중1 1-1 「수」 38유형(m1Num) 변이 시험.

판정은 **3단**이다 (2026-08-20·21 교훈):
  ⑴ 파일이 정말 바뀌었나        — 앵커가 안 맞으면 «변이 안 됨»
  ⑵ **산출물이 정말 바뀌었나**  — 파일만 바뀌고 동작이 같으면 **판정을 거부**한다
                                   (여기를 건너뛰면 멀쩡한 가드를 의심하러 간다)
  ⑶ 그제서야 시험이 빨개지나    — 초록이면 그 시험은 장식이다

되돌리기는 **시작할 때 읽어 둔 바이트 그대로** 쓴다. `git show HEAD:` 로 짜면
커밋 안 된 수정을 덮는다(2026-08-23 교훈). 그래서 시작 전에 대상 파일이
커밋돼 있는지부터 확인하고, 아니면 **멈춘다**.

    python scripts/qa/mutate-m1-num.py
"""

import hashlib
import io
import os
import subprocess
import sys

TARGET = "src/lib/middle/m1Num.ts"
TEST = "src/__tests__/unit/middleM1Num.test.ts"
PROBE = ".probe.ts"

BS = chr(92)  # 역슬래시 한 개 — 도구 층이 벗기지 못하게 조립한다

MUTATIONS = [
    (
        "M1 약수의 개수를 «지수+2» 로 센다",
        "n *= e + 1;",
        "n *= e + 2;",
    ),
    (
        "M2 둘레에 놓는 개수를 2 더 세운다",
        "const trees = 2 * (u + v);",
        "const trees = 2 * (u + v) + 2;",
    ),
    (
        "M3 부등호 «이상/초과» 를 뒤집는다",
        'const loSym = low.strict === 0 ? "' + BS * 2 + 'le" : "<";',
        'const loSym = low.strict === 1 ? "' + BS * 2 + 'le" : "<";',
    ),
    (
        "M4 지수 b 를 «최소공배수가 못 박는» 범위 밖에서 뽑는다",
        "const b = intBetween(rng, qOther + 1, qOther + 3);",
        "const b = intBetween(rng, 1, qOther);",
    ),
    (
        "M5 두 «몫» 의 소수 집합을 겹치게 한다 (구성 보장이 깨진다)",
        "b.push([ps[nG + nA + i]!, intBetween(rng, 1, maxExp)]);",
        "b.push([ps[nG + i]!, intBetween(rng, 1, maxExp)]);",
    ),
    (
        "M6 단위를 수식 밖으로 내보낸다 (새 가드: LaTeX 가 샜나)",
        "answer: kind === 0 ? `$${answer}"
        + BS * 2
        + ","
        + BS * 2
        + "mathrm{cm}$` : `$${answer}$개`,",
        "answer: kind === 0 ? `$${answer}$"
        + BS * 2
        + ","
        + BS * 2
        + "mathrm{cm}` : `$${answer}$개`,",
    ),
    (
        "M8 분수 뒤 조사를 손으로 박는다 (새 가드: 대분수 읽기까지 보나)",
        "content: `두 유리수 $${leftTex}$${nGwa(fracTail(lNum, t1))} $${rightTex}$ ${ask}`,",
        "content: `두 유리수 $${leftTex}$와 $${rightTex}$ ${ask}`,",
    ),
    (
        "M7 수 뒤 조사를 손으로 박는다 (새 가드: 조사가 읽기와 맞나)",
        "$${N}$${waGwa(N)} 서로소인 수의 개수를 구하시오.",
        "$${N}$과 서로소인 수의 개수를 구하시오.",
    ),
]


def sh(args):
    return subprocess.run(
        args, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )


def probe():
    """산출물 지문 — 던지는 것도 산출물로 친다."""
    r = sh(["node", "node_modules/tsx/dist/cli.mjs", PROBE])
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
        sys.exit(
            "대상에 커밋 안 된 수정이 있다 — 되돌리기가 그것을 덮는다:\n" + dirty
        )

    original = read_bytes(TARGET)
    orig_md5 = hashlib.md5(original).hexdigest()
    src = original.decode("utf-8")

    base_probe = probe()
    base = sh(["node", "node_modules/vitest/vitest.mjs", "run", TEST])
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
                print("[%s]\n  ⑴ 앵커 %d개 ← 판정 불가\n" % (name, hits))
                continue

            write_bytes(TARGET, src.replace(old, new, 1).encode("utf-8"))

            # ⑴ 파일이 바뀌었나
            if read_bytes(TARGET) == original:
                results.append((name, "파일이 안 바뀜", False))
                print("[%s]\n  ⑴ 파일 그대로 ← 판정 불가\n" % name)
                write_bytes(TARGET, original)
                continue

            # ⑵ 산출물이 바뀌었나
            mut_probe = probe()
            if mut_probe == base_probe:
                results.append((name, "산출물이 그대로 — 판정 거부", False))
                print(
                    "[%s]\n  ⑴ 파일 바뀜  ⑵ 산출물 **그대로** ← 판정 거부"
                    " (뜻이 안 바뀌는 변이다)\n" % name
                )
                write_bytes(TARGET, original)
                continue

            # ⑶ 시험이 빨개지나
            r = sh(["node", "node_modules/vitest/vitest.mjs", "run", TEST])
            red = r.returncode != 0
            results.append((name, "빨강" if red else "초록 ← 가드가 아니다", red))
            print(
                "[%s]\n  ⑴ 파일 바뀜  ⑵ 산출물 바뀜(%s)  ⑶ %s\n"
                % (name, mut_probe[:12], "🔴 빨강" if red else "🟢 초록 ← 가드가 아니다")
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
        print("  %-58s %s" % (name, verdict))
    print("\n빨강 %d / %d" % (red_count, len(MUTATIONS)))
    if red_count < 3:
        sys.exit("빨강이 3개 미만 — 시험이 무엇을 지키는지 다시 볼 것")


if __name__ == "__main__":
    main()
