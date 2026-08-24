/**
 * 🔴 RED → 🟢 — **단위는 정자 + 얇은 간격** (원장님 지시 2026-08-24:
 * 「latex_to_hwpeq.py 에서 적용 가능한 모든 하네스 및 규칙을 적용시켜」).
 *
 * 원본 규칙 — testchanger `core/latex_to_hwpeq.py`:
 *
 *     _UNITS   = ["kcal","min","km","cm","mm","kg","mg","mL","dL","kL","g","℃","℉","ℓ"]
 *     _UNIT_RE = r"(\d)[\s`]*(단위)(?![A-Za-z0-9(])"
 *     "숫자 뒤 + 뒤에 영문/숫자가 이어지지 않을 때만(변수 5x 등은 건드리지 않는다)"
 *
 * ⚠️ **`(` 를 부정전망에 넣는 것이 핵심이다.** `2g(x)` 는 **함수 호출**(계수 2 × 함수 g)
 *    이지 단위가 아니다. 원본 주석: 「경산여고 수2 #9 `2g(x)` 의 g(x) 가 `2 rm\`g(x)` 로
 *    로만화돼 italic 비대칭이던 것, 2026-06-23」. 이 갈래가 없으면 함수가 단위로 깨진다.
 *
 * ⚠️ **`L`(리터)은 숫자 직결 꼬리에서만** 단위다 — 단독 변수 `L` 과 충돌한다(원본도 같은
 *    이유로 `_UNITS` 에서 빼고 `_NUM_TAIL_UNITS` 로 따로 뒀다).
 *
 * ⚠️ HWP 의 백틱(1/4칸)에 해당하는 것은 LaTeX 에서 `\,` 다. 원본의 `rm\`kg` → `\,\mathrm{kg}`.
 *
 * 역슬래시는 **코드로 만든다** — heredoc·JSON 을 거치며 한 겹 사라지면 검사가 엉뚱한
 * 이유로 통과한다(이 저장소가 여러 번 겪었다).
 */
import { describe, expect, it } from "vitest";

import { preprocessMathText } from "@/lib/math/textPreprocess";

const BS = String.fromCharCode(92);
const render = (body: string) =>
  preprocessMathText(`$${body.split("~").join(BS)}$`);
const RM = (u: string) => `${BS},${BS}mathrm{${u}}`;

describe("[단위] 숫자 뒤 단위는 정자 + 얇은 간격", () => {
  it("숫자에 붙은 단위를 정자로 만든다", () => {
    expect(render("10kg")).toContain(RM("kg"));
    expect(render("5cm")).toContain(RM("cm"));
    expect(render("3min")).toContain(RM("min"));
    expect(render("250kcal")).toContain(RM("kcal"));
  });

  it("숫자와 단위 사이 공백도 받는다", () => {
    expect(render("20 g")).toContain(RM("g"));
  });

  /** ⚠️ 이 갈래가 없으면 변수 `5x` 가 단위로 깨진다. */
  it("뒤에 글자가 이어지면 단위가 아니다", () => {
    const out = render("5xy");
    expect(out).not.toContain(`${BS}mathrm`);
  });

  /** ⚠️ 원본이 실제 문항(경산여고 수2 #9)으로 못 박은 갈래 — **함수 호출**이다. */
  it("숫자 뒤 함수 호출은 단위가 아니다", () => {
    const out = render("2g(x)");
    expect(out).not.toContain(`${BS}mathrm{g}`);
    expect(out).toContain("2g(x)");
  });

  it("리터 L 은 숫자 직결일 때만 단위다", () => {
    expect(render("25L")).toContain(RM("L"));
    // 단독 변수 L 은 그대로 — 대문자 한 글자는 라벨도 아니다.
    const solo = render("L=5");
    expect(solo).not.toContain(`${BS}mathrm{L}`);
  });

  it("이미 정자인 단위는 다시 감싸지 않는다", () => {
    const out = render("10~mathrm{kg}");
    expect(out).not.toContain(`${BS}mathrm{${BS}mathrm`);
  });

  /** `\text{cm}` 은 이미 정자지만 **수식 안에서는 `\mathrm` 이 제 자리**다. */
  it("단위만 감싼 text 는 mathrm 으로 푼다", () => {
    const out = render("~text{cm}");
    expect(out).toContain(`${BS}mathrm{cm}`);
    expect(out).not.toContain(`${BS}text{cm}`);
  });
});

describe("[단위] 이미 mathrm 인 단위에도 얇은 간격", () => {
  it("자료가 text 로 저장한 단위도 간격이 붙는다", () => {
    // `8\text{cm}` → `8\,\mathrm{cm}` (붙어서 "8㎝" 로 보이지 않게)
    expect(render("8~text{cm}")).toContain(`8${BS},${BS}mathrm{cm}`);
  });

  it("변수 뒤 단위에도 붙는다", () => {
    expect(render("x~text{cm}")).toContain(`x${BS},${BS}mathrm{cm}`);
  });

  /** ⚠️ 라벨에는 간격을 넣지 않는다 — 단위가 아니다. */
  it("도형 라벨에는 간격을 넣지 않는다", () => {
    const out = render("~triangle ABC");
    expect(out).not.toContain(`${BS},${BS}mathrm{ABC}`);
  });

  it("간격이 두 번 붙지 않는다", () => {
    const out = render("5cm");
    expect(out).not.toContain(`${BS},${BS},`);
  });
});
