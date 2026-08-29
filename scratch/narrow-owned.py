"""모듈 시험 여덟 개의 «몫»을 RPM 색인 유형으로 좁힌다.

## 왜

각 시험은 「자기 모듈만 훑는다」로 좁혀 두었다. 그 좁힘이 **한 겹 부족하다** —
2026-08-27 부터 갈래 넷이 130소단원을 10유형으로 올리며 **같은 모듈에** 색인에 없는
«확장 유형»을 더하기 때문이다. 그러면 남의 유형이 그대로 다시 그 시험의 검산표에
들이대져 빨개진다(이 회차에만 여덟 파일·89건).

몫을 **「RPM 색인에 있는가」**로 한 겹 더 좁힌다. 확장 유형의 값 검산은 그것을 지은
갈래의 시험(`midTypes*.test.ts`)이 유형마다 하나씩 들고 있다.

⚠️ `M1_CONSTR_TYPES`·`M1_POLY2_TYPES` 처럼 **배열 자체가 색인 유형만 담는** 것은
   건드리지 않는다 — 거기까지 필터를 걸면 그 배열이 정말 14·22개인지 세는 검사가
   장식이 된다.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path("src/__tests__/unit")
IMPORT = 'import { isCatalogType } from "../helpers/rpmCatalog";\n'

NOTE = (
    "// ⚠️ 몫을 **RPM 색인 유형**으로 좁힌다. 갈래들이 같은 모듈에 색인에 없는\n"
    "//    «확장 유형»을 더하는데, 그것까지 쓸어 담으면 남의 유형이 이 파일의\n"
    "//    검산표에 들이대진다(2026-08-27 실측 89건). 확장의 값 검산은 그것을 지은\n"
    "//    갈래의 시험이 들고 있다.\n"
)


def add_import(src: str) -> str:
    if "helpers/rpmCatalog" in src:
        return src
    anchor = 'from "vitest";\n'
    i = src.index(anchor) + len(anchor)
    return src[:i] + "\n" + IMPORT + src[i:]


def edit(name: str, subs: list[tuple[str, str]]) -> None:
    p = ROOT / f"{name}.test.ts"
    s = p.read_text("utf-8")
    for old, new in subs:
        assert s.count(old) >= 1, (name, old[:60], s.count(old))
        s = s.replace(old, new)
    s = add_import(s)
    p.write_text(s, encoding="utf-8", newline="")
    print(f"  {name}: {len(subs)}자리")


edit(
    "middleM1Calc",
    [("  const entries = M1_CALC;", NOTE + "  const entries = M1_CALC.filter((e) => isCatalogType(e));")],
)

edit(
    "middleM3Func",
    [("  const entries = M3_FUNC;", NOTE + "  const entries = M3_FUNC.filter((e) => isCatalogType(e));")],
)

edit(
    "middleM2Center",
    [
        (
            "const ALL = [...CIRC, ...CENTROID];",
            NOTE + "const ALL = [...CIRC, ...CENTROID].filter((e) => isCatalogType(e));",
        )
    ],
)

edit(
    "middleM2NumProb",
    [
        (
            "const ALL = [...M2_RATIONAL, ...M2_COUNTING, ...M2_PROB];",
            NOTE
            + "const ALL = [...M2_RATIONAL, ...M2_COUNTING, ...M2_PROB].filter((e) =>\n  isCatalogType(e),\n);",
        )
    ],
)

edit(
    "middleM2Pytha",
    [
        (
            "  registeredTypes().filter((e) => e.rpmBook === BOOK && e.rpmMinor === MINOR);",
            "  registeredTypes().filter(\n"
            "    // 색인 유형만 이 시험의 몫이다 — 갈래들이 더한 확장은 각 갈래가 지킨다.\n"
            "    (e) => e.rpmBook === BOOK && e.rpmMinor === MINOR && isCatalogType(e),\n"
            "  );",
        )
    ],
)

# ── m1Geo1 / m1Geo2 는 모듈 배열을 그대로 여러 곳에서 쓴다 ──────────
p = ROOT / "middleM1Geo1.test.ts"
s = p.read_text("utf-8")
old_imp = 'import { M1_GEO1 } from "../../lib/middle/m1Geo1";'
assert s.count(old_imp) == 1
s = s.replace(
    old_imp,
    old_imp
    + "\n\n"
    + NOTE
    + "const GEO1_OWNED = M1_GEO1.filter((e) => isCatalogType(e));",
)
# 선언 뒤의 사용처만 바꾼다(import 줄은 위에서 이미 지나갔다).
head, tail = s.split("const GEO1_OWNED = M1_GEO1.filter((e) => isCatalogType(e));", 1)
tail = tail.replace("M1_GEO1", "GEO1_OWNED")
s = head + "const GEO1_OWNED = M1_GEO1.filter((e) => isCatalogType(e));" + tail
s = add_import(s)
p.write_text(s, encoding="utf-8", newline="")
print("  middleM1Geo1: 사용처 전량")

p = ROOT / "middleM1Geo2.test.ts"
s = p.read_text("utf-8")
anchor = "describe(\"중1 6B — 작도와 합동 · 다각형(남은 번호)\", () => {"
assert s.count(anchor) == 1
s = s.replace(
    anchor,
    NOTE
    + "const GEO2_OWNED = M1_GEO2.filter((e) => isCatalogType(e));\n\n"
    + anchor,
)
head, tail = s.split("const GEO2_OWNED = M1_GEO2.filter((e) => isCatalogType(e));", 1)
tail = tail.replace("M1_GEO2", "GEO2_OWNED")
s = head + "const GEO2_OWNED = M1_GEO2.filter((e) => isCatalogType(e));" + tail
s = add_import(s)
p.write_text(s, encoding="utf-8", newline="")
print("  middleM1Geo2: 사용처 전량")

# ── 연산 목록에 새 두 유형을 더한다 ────────────────────────────────
p = ROOT / "middleTierYeonsan.test.ts"
s = p.read_text("utf-8")
old = '  "1-1|정수와 유리수의 계산|19",'
assert s.count(old) == 1
s = s.replace(
    old,
    old
    + "\n"
    + "  // 갈래 C 가 지은 확장 유형 둘 — 「다음을 계산하시오. ↵ $식$」 꼴이라 규칙이\n"
    + "  // 밑단으로 내린다. 「유리수의 곱셈」은 기존 6유형에 기본이 하나도 없어서\n"
    + "  // 일부러 이 모양으로 냈다(D-106 이 바라는 자리다).\n"
    + '  "1-1|정수와 유리수의 계산|70",\n'
    + '  "1-1|정수와 유리수의 계산|71",',
)
p.write_text(s, encoding="utf-8", newline="")
print("  middleTierYeonsan: 연산 키 2개 추가")

print("ok")
