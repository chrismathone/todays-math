# -*- coding: utf-8 -*-
"""물결 1 `h1-equation` — 「이차방정식과 이차함수」(h1QuadFunc.ts)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-quadfunc.py            # 전량
    python scripts/qa/mutate-high-quadfunc.py --list
    python scripts/qa/mutate-high-quadfunc.py "조사"      # 이름 조각으로 하나만

본보기 `mutate-high-identity.py` 의 판정 순서를 그대로 따른다(CLAUDE.md 2026-08-20·08-21·08-23):

  ㉠ **음성 대조** — 변이를 넣기 **전에** 시험이 초록인가. 아니면 판정을 **거부**한다.
  ⑴ 앵커가 정확히 하나인가 · ⑵ 파일이 실제로 바뀌었나 · ⑶ **산출물이 바뀌었나**
  ⑷ 그제서야 시험이 빨개지나 — 그리고 **실패한 시험 이름이 그 변이가 겨눈 시험인가**.
     빨간데 엉뚱한 시험만 빨가면 «가드가 문다»가 아니라 «우연히 다른 곳이 깨졌다»다 — 거부한다.

본보기에 하나를 더했다: 대상 파일에 **커밋 안 된 수정**이 있으면 시작하지 않는다(2026-08-23
「복원이 미커밋을 먹었다」). 원복은 본보기처럼 시작할 때 읽어 둔 바이트로 한다.

`mutate-high-equations.py` 가 이 파일의 `run` 을 **모듈째 import** 해서 쓴다(두 벌 두지 않는다).
시험 실행기는 본보기처럼 `mutate-elem-tiers.py` 의 `failed_tests` 를 빌린다.
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

TARGET = "src/lib/high/h1QuadFunc.ts"
MINOR = "이차방정식과 이차함수"
TESTS = [
    "src/__tests__/unit/highQuadFunc.test.ts",
    "src/__tests__/unit/highRegistry.test.ts",
]

VERIFY = "정답을 facts 로 다른 길을 걸어 다시 낸 것과 같다"
SHOWN = "발문이 facts 가 말하는 식과 수치를 그대로 보여 준다"
JOSA = "수식 뒤 조사가 읽기와 맞는다"
TIER = "칸은 검은 표가 허락한 것뿐"

# (이름, 앵커, 바꿔 넣을 것, 빨개져야 할 시험 제목 조각)
MUTS = [
    (
        "03 대표 — 정수 k 의 최솟값에서 +1 을 빠뜨림(경계를 넣음)",
        "      const ans = greater ? floorQ(B) + 1 : ceilQ(B) - 1;",
        "      const ans = greater ? floorQ(B) : ceilQ(B) - 1;",
        VERIFY,
    ),
    (
        "05 대표 — 평행한 접선의 y절편 부호",
        "      const b = c - k * t * t;",
        "      const b = c + k * t * t;",
        VERIFY,
    ),
    (
        "10 심화하 — 원 조건의 숨은 범위를 넓힘",
        "    const e = extrema(D, h, top, -rho, rho);",
        "    const e = extrema(D, h, top, -rho - 1, rho);",
        VERIFY,
    ),
    (
        # 답은 facts 로 맞게 나오고 **발문만** 딴 식을 찍는다 — 값 검산은 구조적으로 못 본다.
        "01 응용 — 발문의 이차함수 상수항을 딴 수로",
        "      const poly = polyTex([C, B, k]);",
        "      const poly = polyTex([C + 1, B, k]);",
        SHOWN,
    ),
    (
        "06 대표 — 꼭짓점 좌표 뒤 조사를 손으로 «가»",
        "$${h}$${ga(hs)} 범위에",
        "$${h}$가 범위에",
        JOSA,
    ),
    (
        "02 난이도 — 대표문제 꼴을 기본에서 뺌",
        '        difficulty: "기본",\n        facts: { mode, k, m, p, r, a, b, exprId },',
        '        difficulty: "응용",\n        facts: { mode, k, m, p, r, a, b, exprId },',
        TIER,
    ),
]

PROBE_TS = """
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../src/lib/high/generate";

// 씨앗·변형을 넉넉히 — 꼴이 여럿인 유형의 모든 갈래를 밟아야 산출물 변화가 보인다.
for (const entry of registeredHighTypes().filter((e) => e.rpmMinor === __MINOR__)) {
  for (const seed of [20260913, 7, 424242, 1, 99991]) {
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


def probe(minor: str) -> str | None:
    path = os.path.join(ROOT, "scripts", "qa", f".mutate-high-h1eq.probe.{os.getpid()}.ts")
    io.open(path, "w", encoding="utf-8", newline="\n").write(
        PROBE_TS.replace("__MINOR__", '"' + minor + '"')
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
        if r.returncode != 0:
            return None
        return hashlib.md5(r.stdout.encode("utf-8")).hexdigest()
    finally:
        if os.path.exists(path):
            os.remove(path)


def uncommitted(rel: str) -> bool:
    r = subprocess.run(
        ["git", "status", "--porcelain", "--", rel],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return r.stdout.strip() != ""


def run(target: str, minor: str, tests: list[str], muts: list, argv: list[str]) -> int:
    # 윈도 콘솔 기본 인코딩(cp949)은 «—» 를 못 찍어 --list 가 죽는다 — 출력만 UTF-8 로.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    if argv and argv[0] == "--list":
        for i, (name, _o, _n, want) in enumerate(muts):
            print(f"  [{i}] {name}   (겨눔: {want})")
        return 0
    needle = argv[0] if argv else None
    chosen = [m for m in muts if needle is None or needle in m[0]]
    if not chosen:
        print(f"이름 조각 «{needle}» 과 맞는 변이가 없다")
        return 2
    if uncommitted(target):
        print(f"⛔ {target} 에 커밋 안 된 수정이 있다 — 커밋한 뒤에 돌린다(원복 사고 방지)")
        return 3

    runner = load_runner()

    # ㉠ 음성 대조 — 루프 **밖**에서 한 번. 초록이 아니면 아무것도 판정하지 않는다.
    base_code, base_fails = runner.failed_tests(tests)
    if base_code != 0:
        print("⛔ 변이 전 시험이 이미 빨갛다 — 판정하지 않는다")
        for f in base_fails[:8]:
            print("   ↳", f)
        return 3
    base_probe = probe(minor)
    if base_probe is None:
        print("⛔ 변이 전 프로브가 안 돈다 — 판정하지 않는다")
        return 3
    print(f"㉠ 음성 대조 초록 · 기준 산출물 {base_probe}\n")

    path = os.path.join(ROOT, target)
    ok = 0
    for name, old, new, want in chosen:
        orig = io.open(path, "rb").read()
        text = orig.decode("utf-8").replace("\r\n", "\n")
        print(f"변이: {name}")
        if text.count(old) != 1:
            print(f"   ⛔ 앵커가 {text.count(old)}개다 — 판정하지 않는다\n")
            continue
        try:
            io.open(path, "w", encoding="utf-8", newline="\n").write(text.replace(old, new))
            if hashlib.md5(io.open(path, "rb").read()).hexdigest() == hashlib.md5(orig).hexdigest():
                print("   ⛔ 파일이 안 바뀌었다 — 판정하지 않는다\n")
                continue
            mutated_probe = probe(minor)
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
            print(f"   🔴 빨강 — {len(fails)}건 (겨눈 시험 포함)")
            for f in fails[:3]:
                print("   ↳", f)
            print()
            ok += 1
        finally:
            io.open(path, "wb").write(orig)

    print(f"판정: {ok}/{len(chosen)} 빨강")
    return 0 if ok == len(chosen) else 1


if __name__ == "__main__":
    raise SystemExit(run(TARGET, MINOR, TESTS, MUTS, sys.argv[1:]))
