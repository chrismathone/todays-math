# -*- coding: utf-8 -*-
"""고등 물결 1 준비(공용 표기 · 조사 분수 · 등록부 시험)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-wave1-prep.py            # 전량
    python scripts/qa/mutate-high-wave1-prep.py --list
    python scripts/qa/mutate-high-wave1-prep.py "보류"      # 이름 조각으로 하나만

판정 순서는 `mutate-high-identity.py` 와 같다 — ㉠ 음성 대조 → ⑴ 앵커 1개 → ⑵ 파일이 바뀌었나
→ ⑶ **산출물이 바뀌었나** → ⑷ 시험이 빨개지고 실패한 시험 이름을 대나.

## 본보기 하네스와 다른 것 하나 — 변이마다 프로브가 다르다

본보기 하네스는 «등록 유형의 문항»을 산출물로 찍는다. 여기 변이의 절반은 그걸로 안 보인다:
본보기 14유형에는 분수 뒤 조사가 없고, 시험 쪽 자(`helpers/highPage.ts`)는 제품 산출물을 아예 안 바꾼다.
그 프로브로 재면 전부 «산출물이 그대로» 로 판정 거부가 난다(2026-08-21 교훈의 반대 방향 — 변이가
뜻을 바꿨는데 **자가 그 뜻을 못 보는** 경우). 그래서 변이마다 **그 자리의 뜻을 찍는 프로브**를 붙인다.

실행기(`failed_tests`)는 `mutate-elem-tiers.py` 에서 **모듈째** 빌린다 — 옮겨 적지 않는다.
원복은 시작할 때 읽어 둔 바이트로 한다(`git show HEAD:` 는 미커밋 수정을 먹는다 — 2026-08-23).
"""
import hashlib
import importlib.util
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ELEM_HARNESS = os.path.join(ROOT, "scripts", "qa", "mutate-elem-tiers.py")
PROBE_PATH = os.path.join(ROOT, "scripts", "qa", f".mutate-high-prep.probe.{os.getpid()}.ts")
UNREADABLE = "(판정 결과를 못 읽었다"

JOSA_T = r"""["\\dfrac{1}{2}", "\\dfrac{3}{4}", "\\dfrac{2}{3}", "-\\dfrac{5}{2}", "\\frac{7}{3}",
  "\\dfrac{\\sqrt{3}}{2}", "x^{2}+\\dfrac{1}{4}", "\\dfrac{a}{b}", "2i", "x-3", "f(x)", "10"]"""

PROBE_JOSA = r"""
import { eul, eun, ga, gwa, ro } from "../../src/lib/high/josa";
for (const t of """ + JOSA_T + r""") console.log([t, eul(t), ro(t), eun(t), ga(t), gwa(t)].join(" "));
"""

PROBE_RULER = r"""
import { highJosaMismatches, lastSound, roMismatches } from "../../src/__tests__/helpers/highPage";
for (const t of """ + JOSA_T + r""") {
  console.log([t, lastSound(t), highJosaMismatches(`$${t}$를 `).length, roMismatches(`$${t}$로 `).length].join(" "));
}
"""

PROBE_NUMBERS = r"""
import { surd, surdTex } from "../../src/lib/high/numbers";
for (let a = -3; a <= 3; a += 1)
  for (let b = -2; b <= 2; b += 1)
    for (const r of [-3, -1, 2, 5, 12])
      for (const d of [1, 2, -4]) console.log(surdTex(surd(a, b, r, d)));
"""

PROBE_REGISTRY = r"""
import {
  generateHighProblem,
  registeredHighHolds,
  registeredHighTypes,
} from "../../src/lib/high/generate";
console.log(JSON.stringify(registeredHighHolds()));
for (const e of registeredHighTypes())
  for (const seed of [20260913, 1, 7777])
    for (let v = 0; v < 10; v += 1) {
      const p = generateHighProblem(e.key, seed, v);
      console.log([e.key, seed, v, p.difficulty, p.answer, p.content, p.solution].join(""));
    }
"""

JOSA = "src/lib/high/josa.ts"
PAGE = "src/__tests__/helpers/highPage.ts"
NUMBERS = "src/lib/high/numbers.ts"
COMB = "src/lib/high/h1Comb.ts"
IDENT = "src/lib/high/h1Identity.ts"

T_JOSA = "src/__tests__/unit/highJosa.test.ts"
T_NUMBERS = "src/__tests__/unit/highNumbers.test.ts"
T_REGISTRY = "src/__tests__/unit/highRegistry.test.ts"

# (이름, 파일, 앵커, 바꿔 넣을 것, 프로브, 빨개져야 할 시험)
MUTS = [
    (
        "조사(제품) — 분수를 분자로 읽지 않음",
        JOSA,
        "  if (numerator !== null) return finalOf(numerator);\n",
        "  if (numerator !== null && tex === \"\") return finalOf(numerator);\n",
        PROBE_JOSA,
        [T_JOSA],
    ),
    (
        "조사(시험 쪽 자) — 분수를 분자로 읽지 않음",
        PAGE,
        "  if (numerator !== null) return lastSound(numerator);\n",
        "  if (numerator !== null && tex === \"\") return lastSound(numerator);\n",
        PROBE_RULER,
        [T_JOSA],
    ),
    (
        "표기 — 근호 식의 부호를 뒤집음",
        NUMBERS,
        '  const num = `${s.a}${s.b < 0 ? "-" : "+"}${body}`;\n  return s.d === 1 ? num : `\\\\dfrac{${num}}{${s.d}}`;\n}\n\n/** 두 근',
        '  const num = `${s.a}${s.b < 0 ? "+" : "-"}${body}`;\n  return s.d === 1 ? num : `\\\\dfrac{${num}}{${s.d}}`;\n}\n\n/** 두 근',
        PROBE_NUMBERS,
        [T_NUMBERS],
    ),
    (
        "등록부 — 중단원을 보류 하나만으로 «손댐»",
        COMB,
        # ⚠️ 처음엔 「공통수학1|조합|01」을 넣었는데, 물결 1 에서 조합이 다 등록되자 등록·보류 겹침 가드
        #    (`generate.ts`)가 불러오는 순간 던져 «프로브가 안 돈다»로 판정 거부됐다(2026-09-13 병합 검수).
        #    가드가 무는 것이지 이 변이가 겨눈 자리가 아니다 — 물결 1 이 안 만지는 공통수학2 키로 옮겼다.
        "export const H1_COMB_HOLD: HighHold[] = [];",
        'export const H1_COMB_HOLD: HighHold[] = [\n  { key: "공통수학2|평면좌표|01", reason: "변이 시험 — 보류 하나만 넣었다" },\n];',
        PROBE_REGISTRY,
        [T_REGISTRY],
    ),
    (
        "등록부 — 제품 을/를 을 늘 «을» 로",
        JOSA,
        '  return f.kind === "vowel" ? "를" : "을";\n',
        '  return "을";\n',
        PROBE_REGISTRY,
        [T_REGISTRY],
    ),
    (
        "등록부 — 표가 허락하지 않는 칸",
        IDENT,
        '      difficulty: kind === 0 ? "기본" : "응용",',
        '      difficulty: kind === 0 ? "기본" : "심화중",',
        PROBE_REGISTRY,
        [T_REGISTRY],
    ),
]


def load_runner():
    spec = importlib.util.spec_from_file_location("mutate_elem_tiers", ELEM_HARNESS)
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    if not hasattr(mod, "failed_tests"):
        raise SystemExit(
            "mutate-elem-tiers.py 에 failed_tests 가 없다 — 실행기를 옮겨 적지 말고 그쪽을 확인하라"
        )
    return mod


def probe(src: str) -> str | None:
    io.open(PROBE_PATH, "w", encoding="utf-8", newline="\n").write(src)
    try:
        r = subprocess.run(
            "npx tsx " + os.path.relpath(PROBE_PATH, ROOT).replace("\\", "/"),
            shell=True,
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if r.returncode != 0 or not r.stdout.strip():
            return None
        return hashlib.md5(r.stdout.encode("utf-8")).hexdigest()
    finally:
        if os.path.exists(PROBE_PATH):
            os.remove(PROBE_PATH)


def main() -> int:
    args = sys.argv[1:]
    if args and args[0] == "--list":
        for i, m in enumerate(MUTS):
            print(f"  [{i}] {m[0]}   ({m[1]})")
        return 0
    needle = args[0] if args else None
    chosen = [m for m in MUTS if needle is None or needle in m[0]]
    if not chosen:
        print(f"이름 조각 «{needle}» 과 맞는 변이가 없다")
        return 2

    runner = load_runner()
    tests = sorted({t for m in chosen for t in m[5]})

    # ㉠ 음성 대조 — 변이 전에 초록이 아니면 아무것도 판정하지 않는다.
    base_code, base_fails = runner.failed_tests(tests)
    if base_code != 0:
        print("⛔ 변이 전 시험이 이미 빨갛다 — 판정하지 않는다")
        for f in base_fails[:8]:
            print("   ↳", f)
        return 3
    base_probe: dict[str, str] = {}
    for src in {m[4] for m in chosen}:
        h = probe(src)
        if h is None:
            print("⛔ 변이 전 프로브가 안 돈다 — 판정하지 않는다")
            return 3
        base_probe[src] = h
    print(f"㉠ 음성 대조 초록 · 시험 {len(tests)}파일 · 프로브 {len(base_probe)}벌\n")

    ok = 0
    for name, rel, old, new, src, want_tests in chosen:
        path = os.path.join(ROOT, rel)
        orig = io.open(path, "rb").read()
        text = orig.decode("utf-8").replace("\r\n", "\n")
        print(f"변이: {name}  ({rel})")
        if text.count(old) != 1:
            print(f"   ⛔ 앵커가 {text.count(old)}개다 — 판정하지 않는다\n")
            continue
        try:
            io.open(path, "w", encoding="utf-8", newline="\n").write(text.replace(old, new))
            if hashlib.md5(io.open(path, "rb").read()).hexdigest() == hashlib.md5(orig).hexdigest():
                print("   ⛔ 파일이 안 바뀌었다 — 판정하지 않는다\n")
                continue
            mutated = probe(src)
            if mutated is None:
                print("   ⛔ 변이 뒤 프로브가 안 돈다 — 판정하지 않는다\n")
                continue
            if mutated == base_probe[src]:
                print("   ⛔ 산출물이 그대로다 — «가드가 아니다» 라고 말할 수 없다\n")
                continue
            code, fails = runner.failed_tests(want_tests)
            if code == 0:
                print("   🟢 초록 — 이 자리를 무는 가드가 없다\n")
                continue
            if not fails or any(UNREADABLE in f for f in fails):
                print("   ⛔ 빨간데 실패한 시험을 못 댄다 — 판정하지 않는다\n")
                continue
            print(f"   🔴 빨강 — {len(fails)}건")
            for f in fails[:3]:
                print("   ↳", f)
            print()
            ok += 1
        finally:
            io.open(path, "wb").write(orig)

    print(f"판정: {ok}/{len(chosen)} 빨강")
    return 0 if ok == len(chosen) else 1


if __name__ == "__main__":
    raise SystemExit(main())
