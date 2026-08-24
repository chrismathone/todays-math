"""
중2 2-1 「일차함수와 그 그래프 ⑴⑵ + 일차함수와 일차방정식의 관계」 24유형(m2Line) 변이 시험.

판정은 **3단**이다 (2026-08-20·21 교훈, 물결 계약 §8):
  ⑴ 파일이 정말 바뀌었나        — 앵커가 안 맞으면 «변이 안 됨»
  ⑵ **산출물이 정말 바뀌었나**  — 파일만 바뀌고 동작이 같으면 **판정을 거부**한다
                                   (여기를 건너뛰면 멀쩡한 가드를 의심하러 간다)
  ⑶ 그제서야 시험이 빨개지나    — 초록이면 그 시험은 장식이다

되돌리기는 **시작할 때 읽어 둔 바이트 그대로** 쓴다. `git show HEAD:` 로 짜면
커밋 안 된 수정을 덮는다(2026-08-23 교훈). 그래서 시작 전에 대상 파일이
커밋돼 있는지부터 확인하고, 아니면 **멈춘다**.

변이 넷은 **값이 안 바뀌는** 것을 일부러 골랐다 — 대입 검산만으로는 못 잡고
전용 가드만 잡는 자리다(조사 · 로/으로 · `\\times` 뒤 공백 · 그림 mark).
그래야 그 가드들이 장식이 아니라는 것을 안다.

    python scripts/qa/mutate-m2-line.py            # 전량
    python scripts/qa/mutate-m2-line.py M15        # 이름에 그 글자가 든 것만

⚠️ 거른 판이라도 **판정 경로는 같다**(같은 함수·같은 리포터). 낱개용 스크립트를
따로 파면 씨앗·리포터 이름이 갈라져 «도장»이 된다(2026-08-23 `--reporter=basic` 사건).
"""

import hashlib
import io
import os
import subprocess
import sys

TARGET = "src/lib/middle/m2Line.ts"
TEST = "src/__tests__/unit/middleM2Line.test.ts"
PROBE = "scripts/qa/probe-m2-line.ts"

BS = chr(92)  # 역슬래시 한 개 — 도구 층이 벗기지 못하게 조립한다
NL = chr(10)

MUTATIONS = [
    (
        "M01 ⑴10 이동한 점을 반대쪽으로 잡는다 (P 가 직선 밖)",
        "const q = b + num;",
        "const q = b - num;",
    ),
    (
        "M02 ⑴13 삼각형 넓이를 두 배로 (½ 을 안 곱한다)",
        "const twice = Math.abs(x2 - x1) * Math.abs(c);",
        "const twice = Math.abs(x2 - x1) * Math.abs(c) * 2;",
    ),
    (
        "M03 ⑴13 그림의 x절편 mark 를 직선 밖으로 (값은 그대로 — 그림 가드만 잡는다)",
        "              [x1, 0],",
        "              [x1, 1],",
    ),
    (
        "M04 ⑵01 「제N사분면을 지난다」의 참·거짓을 뒤집는다",
        "        n !== quadNotPassed(a, b),",
        "        n === quadNotPassed(a, b),",
    ),
    (
        "M05 ⑵01 옳은 것의 개수를 하나 더 센다",
        "const ans = truths.filter(Boolean).length;",
        "const ans = truths.filter(Boolean).length + 1;",
    ),
    (
        "M06 ⑵02 사분면 판정에서 기울기와 y절편을 뒤바꿔 읽는다",
        "const quad = quadNotPassed(m2, n2);",
        "const quad = quadNotPassed(n2, m2);",
    ),
    (
        "M07 관계03 계수의 부호에서 기울기와 y절편을 뒤바꿔 읽는다",
        "const quad = quadNotPassed(m, n);",
        "const quad = quadNotPassed(n, m);",
    ),
    (
        "M08 ⑵04 일치 조건의 부호를 뒤집는다",
        "const coef2 = mult * a - off;",
        "const coef2 = mult * a + off;",
    ),
    (
        "M09 ⑵08 x절편과 y절편을 뒤집어 쓴다 (이 단원의 대표 실수)",
        "const c = -m * x0;",
        "const c = m * x0;",
    ),
    (
        "M10 ⑵13 삼각형 넓이 계수에서 ½ 을 뺀다",
        "const coef = (h * v) / 2;",
        "const coef = h * v;",
    ),
    (
        "M11 ⑵13 `" + BS + "times` 뒤 공백을 뗀다 — 값은 같고 KaTeX 가 붉게 그린다",
        BS * 2 + 'times ${monoVar(v, "x")}',
        BS * 2 + 'times${monoVar(v, "x")}',
    ),
    (
        "M12 ⑵14 그림의 두 번째 mark 를 직선 밖으로 (값은 그대로)",
        "              [p, top],",
        "              [p, top + 1],",
    ),
    (
        "M13 ⑵15 «양수인 답이 하나뿐» 조건을 푼다 (답이 둘이 된다)",
        "if (positives.length !== 1) return null;",
        "if (positives.length === 0) return null;",
    ),
    (
        "M14 ⑵16 발문의 수를 수식 밖으로 내보낸다 (bareNumbers 가드)",
        "`현재 저금통에 $${c}$원이 들어 있고,",
        "`현재 저금통에 ${c}원이 들어 있고,",
    ),
    (
        "M15 관계01 $y$ 의 계수 0 을 허용한다 — 세로선이라 일차함수가 아니다",
        "const k = nonZero(rng, -3, 3);",
        "const k = intBetween(rng, -3, 3);",
    ),
    (
        "M16 관계05 $y=s$ 와 $x=t$ 를 뒤바꾼다 (가로선·세로선 뒤집기)",
        "const s = q;",
        "const s = p;",
    ),
    (
        "M17 관계11 평행 갈래도 상수항 비를 같게 한다 (해가 없지 않고 무수히 많아진다)",
        "const c1 = many === 1 ? lam * c2 : lam * c2 + gap;",
        "const c1 = lam * c2;",
    ),
    (
        "M18 관계12 삼각형 넓이를 두 배로",
        "const twice = Math.abs(b1 - b2) * Math.abs(p);",
        "const twice = Math.abs(b1 - b2) * Math.abs(p) * 2;",
    ),
    (
        "M19 관계14 최댓값 대신 최솟값을 답한다",
        "const aMax = Math.max(ka, kb);",
        "const aMax = Math.min(ka, kb);",
    ),
    (
        "M20 관계15 직사각형을 중심에서 어긋나게 놓는다 (이등분선이 안 지난다)",
        "const x1 = cx - w;",
        "const x1 = cx - w - 1;",
    ),
    (
        "M21 해설의 조사 고치기를 끈다 (값은 그대로 — 조사 가드만 잡는다)",
        "solution: fixRo(fixJosa(body.solution)),",
        "solution: body.solution,",
    ),
    (
        "M22 발문의 「로/으로」 고치기를 끈다 (값은 그대로 — 로/으로 가드만 잡는다)",
        "content: fixRo(fixJosa(body.content)),",
        "content: fixJosa(body.content),",
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
