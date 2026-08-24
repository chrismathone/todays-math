"""
중2 2-2 「피타고라스 정리」 16유형(m2Pytha) 변이 시험.

판정은 **3단**이다 (물결 계약 §8):
  ⑴ 파일이 정말 바뀌었나        — 앵커가 안 맞으면 «변이 안 됨»
  ⑵ **산출물이 정말 바뀌었나**  — 파일만 바뀌고 동작이 같으면 **판정을 거부**한다
  ⑶ 그제서야 시험이 빨개지나    — 초록이면 그 시험은 장식이다

되돌리기는 **시작할 때 읽어 둔 바이트 그대로** 쓴다. 시작 전에 대상 파일이
커밋돼 있는지부터 확인하고, 아니면 멈춘다.

이 파일의 변이는 전부 **역슬래시가 없는 순수 코드 줄**만 건드린다 — 발문 LaTeX
문자열(`\\,\\mathrm{cm}` 등)은 앵커로 안 쓴다(셸 heredoc 이 아니라 Write 도구로
이 파일을 직접 썼지만, 그래도 섞지 않는 편이 다음에 이 파일을 손볼 때도 안전하다).

    python scripts/qa/mutate-m2-pytha.py            # 전량
    python scripts/qa/mutate-m2-pytha.py M09        # 이름에 그 글자가 든 것만
"""

import hashlib
import io
import os
import subprocess
import sys

TARGET = "src/lib/middle/m2Pytha.ts"
TEST = "src/__tests__/unit/middleM2Pytha.test.ts"
PROBE = "scripts/qa/probe-m2-pytha.ts"

NL = chr(10)

MUTATIONS = [
    (
        "M01 01 mode 분기를 뒤집는다 (facts.mode 와 실제 답 갈래가 어긋난다)",
        "if (mode === 0) {",
        "if (mode === 1) {",
    ),
    (
        "M02 02 밑변 계수를 2에서 3으로",
        "const base = 2 * half;",
        "const base = 3 * half;",
    ),
    (
        "M03 03 세 쌍 순서를 뒤집는다 (w·d 가 뒤바뀐다)",
        "const [w, h, d] = pick(rng, TRIPLES);",
        "const [d, h, w] = pick(rng, TRIPLES);",
    ),
    (
        "M04 04 대각선 p 에서 2배를 뺀다",
        "const p = 2 * hp;",
        "const p = hp;",
    ),
    (
        "M05 04 대각선 q 에서 2배를 뺀다",
        "const q = 2 * hq;",
        "const q = hq;",
    ),
    (
        "M06 05 빗변 제곱에 1을 더한다 (유클리드 증명 답)",
        '"피타고라스 정리의 증명 유클리드의 방법",'
        + NL
        + "    SEC.정리,"
        + NL
        + '    "mid",'
        + NL
        + "    (rng) => {"
        + NL
        + "      const [a, b, c] = pick(rng, TRIPLES);"
        + NL
        + "      const c2 = c * c;",
        '"피타고라스 정리의 증명 유클리드의 방법",'
        + NL
        + "    SEC.정리,"
        + NL
        + '    "mid",'
        + NL
        + "    (rng) => {"
        + NL
        + "      const [a, b, c] = pick(rng, TRIPLES);"
        + NL
        + "      const c2 = c * c + 1;",
    ),
    (
        "M07 06 빗변 제곱에 1을 더한다 (피타고라스 증명 답)",
        '"피타고라스 정리의 증명 피타고라스의 방법",'
        + NL
        + "    SEC.정리,"
        + NL
        + '    "mid",'
        + NL
        + "    (rng) => {"
        + NL
        + "      const [a, b, c] = pick(rng, TRIPLES);"
        + NL
        + "      const c2 = c * c;",
        '"피타고라스 정리의 증명 피타고라스의 방법",'
        + NL
        + "    SEC.정리,"
        + NL
        + '    "mid",'
        + NL
        + "    (rng) => {"
        + NL
        + "      const [a, b, c] = pick(rng, TRIPLES);"
        + NL
        + "      const c2 = c * c + 1;",
    ),
    (
        "M08 07 답을 r 대신 q 로 (역의 조건 오답)",
        "answer: `$x=${r}$`,",
        "answer: `$x=${q}$`,",
    ),
    (
        "M09 08 예각·둔각의 lo 경계를 뒤바꾼다",
        "const lo = acute ? Q : R;",
        "const lo = acute ? R : Q;",
    ),
    (
        "M10 08 예각·둔각의 hi 경계를 뒤바꾼다",
        "const hi = acute ? R : P + Q;",
        "const hi = acute ? P + Q : R;",
    ),
    (
        "M11 09 수선의 발 CD 분모에 1을 더한다",
        "const h = frac(a * b, c);",
        "const h = frac(a * b, c + 1);",
    ),
    (
        "M12 10 BD 분모에 1을 더한다",
        "const bd = frac(a * a, c);",
        "const bd = frac(a * a, c + 1);",
    ),
    (
        "M13 11 PB·PC 순서를 뒤바꾼다 (사각형 성질⑴)",
        "const [pa, pc, pb, pd] = pick(rng, QUADS);",
        "const [pa, pb, pc, pd] = pick(rng, QUADS);",
    ),
    (
        "M14 12 BC·CD 순서를 뒤바꾼다 (사각형 성질⑵)",
        "const [ab, cd, bc, da] = pick(rng, QUADS);",
        "const [ab, bc, cd, da] = pick(rng, QUADS);",
    ),
    (
        "M15 13 세 반원 넓이 분자에 1을 더한다",
        "const num = a * a + b * b;",
        "const num = a * a + b * b + 1;",
    ),
    (
        "M16 14 히포크라테스 넓이에서 2로 안 나눈다",
        "const area = (a * b) / 2;",
        "const area = a * b;",
    ),
    (
        "M17 15 최단거리 AE 를 EG 만큼 더 크게 뗀다",
        "const p = leg - split; // AE",
        "const p = leg + split; // AE",
    ),
    (
        "M18 16 종이접기 AB 를 r+p 대신 r+q 로",
        "const w = r + p; // AB",
        "const w = r + q; // AB",
    ),
    (
        "M19 16 종이접기 AE 를 r 대신 p 로",
        "const ae = r;",
        "const ae = p;",
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
