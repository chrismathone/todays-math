# -*- coding: utf-8 -*-
"""고등 공통수학1 「경우의 수와 순열」(`h1Perm.ts`)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-perm.py            # 전량
    python scripts/qa/mutate-high-perm.py --list
    python scripts/qa/mutate-high-perm.py "조사"      # 이름 조각으로 하나만

판정 순서·실행기·원복은 본보기 `mutate-high-identity.py` 그대로다(그 머리말이 까닭을 적었다):

  ㉠ **음성 대조** — 변이 전에 시험이 초록인가. 아니면 판정을 거부한다.
  ⑴ 앵커가 정확히 하나인가 · ⑵ 파일이 실제로 바뀌었나
  ⑶ **산출물이 바뀌었나** — 안 바뀌면 «가드가 아니다»가 아니라 «변이가 뜻을 안 바꿨다»다.
  ⑷ 시험이 빨개지나 — 그리고 **빨개진 시험이 그 변이를 겨눈 시험인가**(`want`, 브리프 §3-8).
     엉뚱한 시험이 물면 «이 자리를 무는 가드가 있다»가 증명되지 않으므로 거부한다.

변이는 축을 하나씩 겨눈다: 값(공식의 한 자리) · 지면(발문의 수치) · 조사 · 난이도.

`run_cli` 는 같은 세션의 `mutate-high-comb.py` 가 **모듈째 불러** 쓴다 — 실행기를 두 벌 두지 않는다.
⚠️ 두 스크립트를 **동시에** 돌리지 말 것: `highRegistry` 가 두 모듈을 다 읽으므로 한쪽 변이가 다른 쪽의
음성 대조를 빨갛게 만든다.
"""
import hashlib
import importlib.util
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ELEM_HARNESS = os.path.join(ROOT, "scripts", "qa", "mutate-elem-tiers.py")
UNREADABLE = "(판정 결과를 못 읽었다"

VALUE = "facts 로 늘어놓고 센 것과 같다"  # high<모듈>.test — 값
SHOWN = "facts 의 수치를 그대로 보여 준다"  # high<모듈>.test — 발문
JOSA = "조사가 읽기와 맞는다"  # highRegistry — 조사
TIER = "대표문제 꼴"  # highRegistry — 난이도

MINOR = "경우의 수와 순열"
TESTS = [
    "src/__tests__/unit/highPerm.test.ts",
    "src/__tests__/unit/highRegistry.test.ts",
]
PERM = "src/lib/high/h1Perm.ts"

# (이름, 파일, 앵커, 바꿔 넣을 것, 물어야 하는 시험 이름 조각)
MUTS = [
    (
        "10 이웃하지 않음 — 사이사이와 양 끝의 자리를 하나 적게 셈",
        PERM,
        "      const y = nPr(a + 1, b);",
        "      const y = nPr(a, b);",
        VALUE,
    ),
    (
        "06 금액의 수 — 큰 단위 한 장을 가운데 단위 한 개로 바꿈",
        PERM,
        "    const mids = p.b + 2 * p.c;",
        "    const mids = p.b + p.c;",
        VALUE,
    ),
    (
        # 답은 facts 로 세므로 그대로다 — 발문 대조(SHOWN)만 이 자리를 본다.
        "07 발문 — 도로 수를 하나 크게 찍음(답은 그대로)",
        PERM,
        "잇는 도로가 $${k}$개`)",
        "잇는 도로가 $${k + 1}$개`)",
        SHOWN,
    ),
    (
        "02 조사 — 방정식 뒤 을/를을 늘 «를» 로",
        PERM,
        "content: `방정식 $${eq}$${eul(eq)} 만족시키는",
        "content: `방정식 $${eq}$를 만족시키는",
        JOSA,
    ),
    (
        # 12 는 대표문제 꼴(꼴 0)만 기본이다 — 그 칸을 빼면 유형이 기본을 못 낸다.
        "12 난이도 — 대표문제 꼴을 기본에서 뺌",
        PERM,
        '      difficulty: "기본",\n      facts: { mode, wi: W.w, n: W.n, v: W.vowels.length },',
        '      difficulty: "응용",\n      facts: { mode, wi: W.w, n: W.n, v: W.vowels.length },',
        TIER,
    ),
]

PROBE_TS = """
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../src/lib/high/generate";

// 꼴이 여럿인 유형의 모든 갈래를 밟도록 씨앗·변형을 넉넉히.
for (const entry of registeredHighTypes()) {
  if (entry.rpmMinor !== "__MINOR__") continue;
  for (const seed of [20260913, 1, 7777, 424242]) {
    for (let v = 0; v < 10; v += 1) {
      const p = generateHighProblem(entry.key, seed, v);
      console.log(
        [entry.key, seed, v, p.difficulty, p.answer, p.content, p.solution,
         (p.distractors ?? []).join("|")].join("\\u0001"),
      );
    }
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


def probe(minor: str, tag: str) -> str | None:
    """그 중단원 등록 유형의 산출물 지문 — 변이가 뜻을 바꿨는지 가른다."""
    path = os.path.join(ROOT, "scripts", "qa", f".mutate-high-{tag}.probe.{os.getpid()}.ts")
    io.open(path, "w", encoding="utf-8", newline="\n").write(
        PROBE_TS.replace("__MINOR__", minor)
    )
    try:
        r = subprocess.run(
            "npx tsx " + os.path.relpath(path, ROOT).replace("\\", "/"),
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
        if os.path.exists(path):
            os.remove(path)


def run_cli(minor: str, tests: list[str], muts: list, tag: str, argv: list[str]) -> int:
    if argv and argv[0] == "--list":
        for i, (name, path, _o, _n, want) in enumerate(muts):
            print(f"  [{i}] {name}   ({path} · 물 시험: {want})")
        return 0
    needle = argv[0] if argv else None
    chosen = [m for m in muts if needle is None or needle in m[0]]
    if not chosen:
        print(f"이름 조각 «{needle}» 과 맞는 변이가 없다")
        return 2

    runner = load_runner()

    # ㉠ 음성 대조 — 루프 **밖**에서 한 번. 초록이 아니면 아무것도 판정하지 않는다.
    base_code, base_fails = runner.failed_tests(tests)
    if base_code != 0:
        print("⛔ 변이 전 시험이 이미 빨갛다 — 판정하지 않는다")
        for f in base_fails[:8]:
            print("   ↳", f)
        return 3
    base_probe = probe(minor, tag)
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
            io.open(path, "w", encoding="utf-8", newline="\n").write(
                text.replace(old, new)
            )
            after = io.open(path, "rb").read()
            if hashlib.md5(after).hexdigest() == hashlib.md5(orig).hexdigest():
                print("   ⛔ 파일이 안 바뀌었다 — 판정하지 않는다\n")
                continue
            mutated_probe = probe(minor, tag)
            if mutated_probe is None:
                print("   ⛔ 변이 뒤 프로브가 안 돈다 — 판정하지 않는다\n")
                continue
            if mutated_probe == base_probe:
                print("   ⛔ 산출물이 그대로다 — «가드가 아니다» 라고 말할 수 없다\n")
                continue
            code, fails = runner.failed_tests(tests)
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
    raise SystemExit(run_cli(MINOR, TESTS, MUTS, "perm", sys.argv[1:]))
