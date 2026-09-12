# -*- coding: utf-8 -*-
"""고등 본보기(공통수학1 「항등식과 나머지정리」)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-identity.py            # 전량
    python scripts/qa/mutate-high-identity.py --list
    python scripts/qa/mutate-high-identity.py "조사"      # 이름 조각으로 하나만

판정 순서는 이 저장소의 규율 그대로다(CLAUDE.md 2026-08-20·08-21·08-23):

  ㉠ **음성 대조** — 변이를 넣기 **전에** 그 시험이 초록인가. 아니면 판정을 **거부**한다.
     (이게 없으면 러너가 안 뜨는 것만으로 모든 변이가 «빨강»이 되어 도장이 된다.)
  ⑴ 앵커가 정확히 하나인가 — 아니면 거부(코드가 움직였거나 다른 세션의 창).
  ⑵ 파일이 실제로 바뀌었나 — 안 바뀌면 치환 실패다.
  ⑶ **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 «가드가 아니다»가 거짓말이 된다.
  ⑷ 그제서야 시험이 빨개지나 — 빨간데 **실패한 시험 이름을 못 대면** 거부한다.

## 시험 실행기는 빌려 쓴다

`scripts/qa/mutate-elem-tiers.py` 의 `failed_tests` 를 **모듈째 import** 해서 부른다.
리포터 이름·목록 펴는 규칙이 두 벌이 되면 한쪽만 낡는다(2026-08-23 에 실제로 그래서
모든 변이가 빨강으로 찍혔다). 여기에는 그 줄을 다시 적지 않는다.

## 원복은 **시작할 때 읽어 둔 바이트**로 한다

`git show HEAD:` 로 되돌리면 **커밋 안 된 수정을 먹는다**(2026-08-23 사고). 그래서 이
하네스는 대상 파일이 커밋돼 있는지 묻지 않는다 — 어차피 제 손에 든 원본으로 되돌린다.
"""
import hashlib
import importlib.util
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ELEM_HARNESS = os.path.join(ROOT, "scripts", "qa", "mutate-elem-tiers.py")
PROBE_PATH = os.path.join(ROOT, "scripts", "qa", f".mutate-high.probe.{os.getpid()}.ts")
UNREADABLE = "(판정 결과를 못 읽었다"

TESTS = [
    "src/__tests__/unit/highIdentity.test.ts",
    "src/__tests__/unit/expandEngineDistractors.test.ts",
]

IDENT = "src/lib/high/h1Identity.ts"
JOSA = "src/lib/high/josa.ts"
DERIVE = "src/lib/engine/deriveFormats.ts"

# (이름, 파일, 앵커, 바꿔 넣을 것)
MUTS = [
    (
        "05 몫 비교 — 나머지 항의 부호",
        IDENT,
        "      const a = b - d * d + r1;",
        "      const a = b - d * d - r1;",
    ),
    (
        "11 심화하 — 되돌린 상수의 부호",
        IDENT,
        "    const ans = (t - u) * (t - v) * (t - w) + K;",
        "    const ans = (t - u) * (t - v) * (t - w) - K;",
    ),
    (
        "14 대표 — 나머지를 딴 수로 나눔",
        IDENT,
        "      const r = kp % M;",
        "      const r = kp % (M + 1);",
    ),
    (
        "04 난이도 — 대표문제 꼴을 기본에서 뺌",
        IDENT,
        '      difficulty: kind === 0 ? "기본" : "응용",',
        '      difficulty: "응용",',
    ),
    (
        # ⚠️ 처음엔 이 함수의 **문자·지수 갈래**(`f.kind === "consonant" ? …`)를 때렸는데
        #    「산출물이 그대로」로 판정 거부가 났다 — 이 모듈의 「(으)로」는 전부 **수 갈래**를
        #    탄다(`$x-3$으로`). 가드가 없는 게 아니라 **변이가 뜻을 안 바꾼 것**이었다.
        #    그래서 실제로 도는 갈래를 때린다(2026-08-21 「변이가 동작을 안 바꾸면 …」).
        "조사 — 수 뒤 (으)로를 늘 «로» 로",
        JOSA,
        '  if (f.kind === "digit") return euroRo(f.n);\n  return f.kind === "consonant" ? "으로" : "로";',
        '  if (f.kind === "digit") return "로";\n  return f.kind === "consonant" ? "으로" : "로";',
    ),
    (
        "공용 — 생성기 오답 갈래를 끔",
        DERIVE,
        "  if (stem.distractors !== undefined) {",
        "  if (false) {",
    ),
]

PROBE_TS = """
import { expandFamily } from "../../src/lib/engine/expandEngine";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../src/lib/high/generate";

// 씨앗·변형을 넉넉히 — 「꼴이 여럿인 유형」의 모든 갈래를 밟아야 산출물 변화가 보인다.
for (const entry of registeredHighTypes()) {
  for (const seed of [20260913, 7, 424242]) {
    for (let v = 0; v < 8; v += 1) {
      const p = generateHighProblem(entry.key, seed, v);
      console.log(
        [entry.key, seed, v, p.difficulty, p.answer, p.content, p.solution,
         (p.distractors ?? []).join("|")].join("\\u0001"),
      );
    }
  }
  // 파생까지 찍는다 — 공용 오답 갈래를 끄는 변이는 여기서만 드러난다.
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


def main() -> int:
    args = [a for a in sys.argv[1:]]
    if args and args[0] == "--list":
        for i, (name, path, _o, _n) in enumerate(MUTS):
            print(f"  [{i}] {name}   ({path})")
        return 0
    needle = args[0] if args else None
    chosen = [m for m in MUTS if needle is None or needle in m[0]]
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
    for name, rel, old, new in chosen:
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
