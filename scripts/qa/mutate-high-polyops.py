# -*- coding: utf-8 -*-
"""고등 물결 1 「다항식의 연산」(`h1PolyOps.ts`)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-polyops.py            # 전량
    python scripts/qa/mutate-high-polyops.py --list
    python scripts/qa/mutate-high-polyops.py "조사"      # 이름 조각으로 하나만

본보기 `mutate-high-identity.py` 의 판정 순서를 그대로 따르고, 하나를 더했다:

  ㉠ **음성 대조** — 변이를 넣기 **전에** 시험이 초록인가. 아니면 판정을 거부한다.
  ⑴ 앵커가 정확히 하나인가 — 아니면 거부(코드가 움직였거나 다른 세션의 창).
  ⑵ 파일이 실제로 바뀌었나 — 안 바뀌면 치환 실패다.
  ⑶ **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 «가드가 아니다»가 거짓말이 된다.
  ⑷ 시험이 빨개지나 — 그리고 **실패한 시험 이름이 그 변이를 겨눈 시험인가**
     (`expect` 조각). 엉뚱한 시험만 울면 「가드가 문다」가 아니라 「우연히 깨졌다」다.

이 파일의 `run()` 을 `mutate-high-factor.py` · `mutate-high-matrix.py` 가 **모듈째 import** 해서 부른다
(판정 규칙이 세 벌이 되면 한쪽만 낡는다 — 2026-08-23). 시험 실행기는 본보기처럼
`mutate-elem-tiers.py` 의 `failed_tests` 를 빌린다.

## 원복은 **시작할 때 읽어 둔 바이트**로 한다

`git show HEAD:` 로 되돌리면 커밋 안 된 수정을 먹는다(2026-08-23 사고).
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

REGISTRY = "src/__tests__/unit/highRegistry.test.ts"
MOD = "src/lib/high/h1PolyOps.ts"
TESTS = ["src/__tests__/unit/highPolyOps.test.ts", REGISTRY]
MINOR = "다항식의 연산"

# (이름, 파일, 앵커, 바꿔 넣을 것, 울어야 할 시험 이름 조각)
MUTS = [
    (
        "07 응용 — (a+b)(b+c)(c+a) 의 abc 부호",
        MOD,
        "      const value = s * e2 - e3;",
        "      const value = s * e2 + e3;",
        "facts 로 다시 세운 것과 같다",
    ),
    (
        "14 심화하 — 넓이의 차에서 한 곱의 부호",
        MOD,
        "    const v = a * b + b * c + c * a;",
        "    const v = a * b + b * c - c * a;",
        "facts 로 다시 세운 것과 같다",
    ),
    (
        # 답(세로)은 그대로 두고 발문의 넓이만 딴 식으로 — 값 검산은 facts 만 보므로 못 본다.
        "10 응용 — 발문의 넓이를 딴 가로로 짓기",
        MOD,
        "    const P = mul([a, 1], W);",
        "    const P = mul([a + 1, 1], W);",
        "수치를 그대로 보여 준다",
    ),
    (
        "12 응용 — 조립제법 ax+b 꼴을 심화하로",
        MOD,
        '      difficulty: "응용",\n      facts: { mode, a, b, q0: Qp[0]!, q1: Qp[1]!, q2: Qp[2]!, R },',
        '      difficulty: "심화하",\n      facts: { mode, a, b, q0: Qp[0]!, q1: Qp[1]!, q2: Qp[2]!, R },',
        "검은 표가 허락한 것뿐",
    ),
    (
        "10 대표 — 문자 A 뒤 (으)로를 손으로 «으로»",
        MOD,
        '다항식 $A$${ro("A")} 나누었을 때의 몫이',
        "다항식 $A$으로 나누었을 때의 몫이",
        "조사가 읽기와 맞는다",
    ),
    (
        "11 대표 — 오답 하나를 정답과 같게",
        MOD,
        '? [lin1, lin2, inv, [mult, "Q(x)", `-${inv}`, `-${mult}`]]',
        "? [lin1, lin2, inv, [mult, inv, `-${inv}`, `-${mult}`]]",
        "facts 로 다시 세운 것과 같다",
    ),
]

PROBE_TS = """
import { expandFamily } from "../../src/lib/engine/expandEngine";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../src/lib/high/generate";

// 씨앗·변형을 넉넉히 — 「꼴이 여럿인 유형」의 모든 갈래를 밟아야 산출물 변화가 보인다.
for (const entry of registeredHighTypes().filter((e) => e.rpmMinor === process.argv[2])) {
  for (const seed of [20260913, 7, 424242, 1, 7777]) {
    for (let v = 0; v < 10; v += 1) {
      let line: string;
      try {
        const p = generateHighProblem(entry.key, seed, v);
        line = [entry.key, seed, v, p.difficulty, p.answer, p.content, p.solution,
          (p.distractors ?? []).join("|")].join("\\u0001");
      } catch (e) {
        // 던지는 변이도 «산출물이 바뀌었다» 로 센다 — 던진 자리를 찍는다.
        line = [entry.key, seed, v, "THROW", String(e)].join("\\u0001");
      }
      console.log(line);
    }
  }
  try {
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
  } catch (e) {
    console.log([entry.key, "derived", "THROW", String(e)].join("\\u0001"));
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
    path = os.path.join(ROOT, "scripts", "qa", f".mutate-high-{tag}.probe.{os.getpid()}.ts")
    io.open(path, "w", encoding="utf-8", newline="\n").write(PROBE_TS)
    try:
        r = subprocess.run(
            ["npx", "tsx", os.path.relpath(path, ROOT).replace("\\", "/"), minor],
            shell=(os.name == "nt"),
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


def run(muts, tests, minor: str, tag: str, argv: list[str]) -> int:
    args = list(argv)
    if args and args[0] == "--list":
        for i, m in enumerate(muts):
            print(f"  [{i}] {m[0]}   ({m[1]})")
        return 0
    needle = args[0] if args else None
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
    for name, rel, old, new, aim in chosen:
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
            if not any(aim in f for f in fails):
                print(f"   ⛔ 빨간데 겨눈 시험(«{aim}»)이 아니라 딴 시험이 운다 — 판정하지 않는다")
                for f in fails[:3]:
                    print("   ↳", f)
                print()
                continue
            print(f"   🔴 빨강 — {len(fails)}건 (겨눈 시험 «{aim}» 포함)")
            for f in fails[:3]:
                print("   ↳", f)
            print()
            ok += 1
        finally:
            io.open(path, "wb").write(orig)

    print(f"판정: {ok}/{len(chosen)} 빨강")
    return 0 if ok == len(chosen) else 1


if __name__ == "__main__":
    raise SystemExit(run(MUTS, TESTS, MINOR, "polyops", sys.argv[1:]))
