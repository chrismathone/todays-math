# -*- coding: utf-8 -*-
"""고등 물결 1 「복소수」 모듈의 **가드가 정말 무는가** — 변이 시험. (세션 h1-complex)

    python scripts/qa/mutate-high-complex.py            # 전량
    python scripts/qa/mutate-high-complex.py --list
    python scripts/qa/mutate-high-complex.py "조사"      # 이름 조각으로 하나만

「이차방정식」 판(`mutate-high-quadeq.py`)은 이 파일의 `main` 을 불러 쓴다 — 판정 규칙이 두 벌이
되면 한쪽만 낡는다(2026-08-23).

판정 순서는 본보기 `mutate-high-identity.py` 그대로다(CLAUDE.md 2026-08-20·08-21·08-23):

  ㉠ **음성 대조** — 변이를 넣기 **전에** 시험이 초록인가. 아니면 판정을 **거부**한다.
  ⑴ 앵커가 정확히 하나인가 — 아니면 거부.
  ⑵ 파일이 실제로 바뀌었나 — 안 바뀌면 치환 실패다.
  ⑶ **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 «가드가 아니다»가 거짓말이 된다.
  ⑷ 시험이 빨개지나 — 그리고 **실패한 시험 이름이 그 변이를 겨눈 것인가**(`expect` 조각).
     빨간데 겨눈 시험이 아니면 판정을 거부한다 — 우연히 다른 가드가 문 것을 «이 가드가 문다»로
     읽지 않기 위해서다.

시험 실행기는 `mutate-elem-tiers.py` 의 `failed_tests` 를 **모듈째 import** 한다(옮겨 적지 않는다).
원복은 **시작할 때 읽어 둔 바이트**로 한다(`git show HEAD:` 는 미커밋 수정을 먹는다 — 2026-08-23).
"""
import hashlib
import importlib.util
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ELEM_HARNESS = os.path.join(ROOT, "scripts", "qa", "mutate-elem-tiers.py")
PROBE_PATH = os.path.join(ROOT, "scripts", "qa", f".mutate-high-h1c.probe.{os.getpid()}.ts")
UNREADABLE = "(판정 결과를 못 읽었다"

TESTS = [
    "src/__tests__/unit/highComplex.test.ts",
    "src/__tests__/unit/highQuadEq.test.ts",
    "src/__tests__/unit/highRegistry.test.ts",
]

COMPLEX = "src/lib/high/h1Complex.ts"

# 겨눈 시험 이름 조각
VALUE = "정답을 facts 로 다시 세운 것과 같다"
SHOWN = "발문이 facts 가 말하는"
JOSA = "수식 뒤 조사가 읽기와 맞는다"
TIER = "칸은 검은 표가 허락한 것뿐"

# (이름, 파일, 앵커, 바꿔 넣을 것, 겨눈 시험 이름 조각)
MUTS = [
    (
        # 등식의 우변만 켤레 없이 지으면 발문은 다른 등식이 된다 — 정답 z 는 그대로.
        # 시험은 발문의 등식(facts 의 우변)을 z=1, z=i 대입으로 풀어 다른 z 를 얻는다.
        "복소수 08 대표 — 우변을 z̄ 대신 z 로 지음",
        COMPLEX,
        "      const R = cAdd(cMul(cx(p, qv), z), cMul(cx(r), cConj(z)));",
        "      const R = cAdd(cMul(cx(p, qv), z), cMul(cx(r), z));",
        VALUE,
    ),
    (
        # 켤레 기호를 씌운 우변에서 켤레를 한 번 덜 벗기면 지면의 수가 facts 와 달라진다.
        # 정답(facts 로 푼 x, y)은 안 바뀌므로 값 검산은 초록이고 **지면 대조**만 문다.
        "복소수 06 대표 — 켤레로 준 우변의 켤레를 안 벗김",
        COMPLEX,
        "JOIN_CONJ(cTex(cConj(R)))",
        "JOIN_CONJ(cTex(R))",
        SHOWN,
    ),
    (
        "복소수 08 — z 뒤 조사를 손으로 «을»",
        COMPLEX,
        '복소수 $z$${eul("z")} 구하시오.',
        "복소수 $z$을 구하시오.",
        JOSA,
    ),
    (
        # 이 중단원에서 학생이 가장 많이 하는 실수를 생성기가 저지르면 — 시험 쪽 식 계산기는
        # √(−a) 를 i√a 로만 알고 규칙을 모르므로 같이 틀릴 수 없다.
        "복소수 11 — 음수끼리의 곱에 √a√b=√ab 를 그대로 씀",
        COMPLEX,
        "      value: cx(-smn),",
        "      value: cx(smn),",
        VALUE,
    ),
]

PROBE_TS = """
import { expandFamily } from "../../src/lib/engine/expandEngine";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../src/lib/high/generate";

// 이 세션의 두 중단원만 — 씨앗·변형을 넉넉히 해 꼴이 여럿인 유형의 모든 갈래를 밟는다.
const MINE = new Set(["복소수", "이차방정식"]);
for (const entry of registeredHighTypes().filter((e) => MINE.has(e.rpmMinor))) {
  for (const seed of [20260913, 7, 424242, 1, 99991]) {
    for (let v = 0; v < 10; v += 1) {
      const p = generateHighProblem(entry.key, seed, v);
      console.log(
        [entry.key, seed, v, p.difficulty, p.answer, p.content, p.solution,
         (p.distractors ?? []).join("|")].join("\\u0001"),
      );
    }
  }
  const got = expandFamily((v) => {
    const p = generateHighProblem(entry.key, 20260913, v);
    return {
      content: p.content,
      answer: p.answer,
      solution: p.solution,
      familyKey: `high:${entry.key}`,
      problemType: "계산",
      distractors: p.distractors,
    };
  }, 2);
  for (const item of got.items) {
    console.log([entry.key, "derived", item.questionType, item.answer, item.content].join("\\u0001"));
  }
}
"""


def load_runner():
    spec = importlib.util.spec_from_file_location("mutate_elem_tiers", ELEM_HARNESS)
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    if not hasattr(mod, "failed_tests"):
        raise SystemExit(
            "mutate-elem-tiers.py 에 failed_tests 가 없다 — 실행기를 옮겨 적지 말고 그쪽을 확인하라"
        )
    return mod


def probe() -> str | None:
    io.open(PROBE_PATH, "w", encoding="utf-8", newline="\n").write(PROBE_TS)
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
        if r.returncode != 0:
            return None
        return hashlib.md5(r.stdout.encode("utf-8")).hexdigest()
    finally:
        if os.path.exists(PROBE_PATH):
            os.remove(PROBE_PATH)


def main(muts, argv) -> int:
    if argv and argv[0] == "--list":
        for i, (name, path, _o, _n, want) in enumerate(muts):
            print(f"  [{i}] {name}   ({path} · 겨눔: {want})")
        return 0
    needle = argv[0] if argv else None
    chosen = [m for m in muts if needle is None or needle in m[0]]
    if not chosen:
        print(f"이름 조각 «{needle}» 과 맞는 변이가 없다")
        return 2

    runner = load_runner()

    # ㉠ 음성 대조 — 루프 **밖**에서 한 번. 초록이 아니면 아무것도 판정하지 않는다.
    base_code, base_fails = runner.failed_tests(TESTS)
    if base_code != 0:
        print("⛔ 변이 전 시험이 이미 빨갛다 — 판정하지 않는다")
        for f in base_fails[:8]:
            print("   ↳", f)
        return 3
    base_probe = probe()
    if base_probe is None:
        print("⛔ 변이 전 프로브가 안 돈다 — 판정하지 않는다")
        return 3
    print(f"㉠ 음성 대조 초록 · 기준 산출물 {base_probe}\n")

    ok = 0
    for name, rel, old, new, want in chosen:
        path = os.path.join(ROOT, rel)
        orig = io.open(path, "rb").read()
        text = orig.decode("utf-8").replace("\r\n", "\n")
        print(f"변이: {name}  ({rel})")
        if text.count(old) != 1:
            print(f"   ⛔ 앵커가 {text.count(old)}개다 — 판정하지 않는다\n")
            continue
        try:
            io.open(path, "w", encoding="utf-8", newline="\n").write(text.replace(old, new))
            after = io.open(path, "rb").read()
            if hashlib.md5(after).hexdigest() == hashlib.md5(orig).hexdigest():
                print("   ⛔ 파일이 안 바뀌었다 — 판정하지 않는다\n")
                continue
            mutated_probe = probe()
            if mutated_probe is None:
                print("   ⛔ 변이 뒤 프로브가 안 돈다 — 판정하지 않는다\n")
                continue
            if mutated_probe == base_probe:
                print("   ⛔ 산출물이 그대로다 — «가드가 아니다» 라고 말할 수 없다\n")
                continue
            code, fails = runner.failed_tests(TESTS)
            if code == 0:
                print("   🟢 초록 — 이 자리를 무는 가드가 없다\n")
                continue
            if not fails or any(UNREADABLE in f for f in fails):
                print("   ⛔ 빨간데 실패한 시험을 못 댄다 — 판정하지 않는다\n")
                continue
            if not any(want in f for f in fails):
                print(f"   ⛔ 빨갛지만 겨눈 시험(«{want}»)이 아니다 — 판정하지 않는다")
                for f in fails[:3]:
                    print("   ↳", f)
                print()
                continue
            print(f"   🔴 빨강 — {len(fails)}건 (겨눈 시험 «{want}» 포함)")
            for f in fails[:3]:
                print("   ↳", f)
            print()
            ok += 1
        finally:
            io.open(path, "wb").write(orig)

    print(f"판정: {ok}/{len(chosen)} 빨강")
    return 0 if ok == len(chosen) else 1


if __name__ == "__main__":
    raise SystemExit(main(MUTS, sys.argv[1:]))
