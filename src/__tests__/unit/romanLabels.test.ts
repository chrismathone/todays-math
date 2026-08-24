/**
 * 🔴 RED → 🟢 — **도형 라벨은 정자(Roman)** (원장님 지적 2026-08-24:
 * 「어떤건 roman이고 어떤건 italic 이야. 일관성이 하나도 없다」).
 *
 * 규칙은 testchanger `core/latex_to_hwpeq.py` 의 `_apply_roman_labels` 를 그대로 가져온다:
 *
 *     _ROMAN_LABEL_RE = r"(?<![A-Za-z])((?:[A-Z]'*){2,})(?![A-Za-z])"
 *     "도형 라벨(연속 대문자 2자+)을 정자화. 변수(x, a, **단일 대문자**)는 그대로 두고,
 *      선분/삼각형/사각형 라벨(AB, ABC, ABCD)만 정자로 만든다."
 *
 * ⚠️ **왜 우리 것으로는 안 됐나.** 우리 규칙은 **자리에 매여** 있었다 —
 *    `\overline{AB}`(오버레이 명령) · `\triangle ABC`(도형 접두사) · 「전체가 라벨」 셋뿐.
 *    그런데 기출 원본은 `∠` 를 수식 **밖**에 두고 `$IBA=42\degree$` 로 저장한다. 접두사도
 *    없고 전체 라벨도 아니라 **셋 다 안 걸려** 이탤릭으로 남았다. 같은 지면에서
 *    `\overline{AI}` 는 정자, `∠IBA` 는 이탤릭 — 그 불일치를 원장님이 보셨다.
 *    그래서 열쇠를 **자리에서 «연속 대문자»로** 옮긴다.
 *
 * ⚠️ **역슬래시를 코드로 만든다.** 이 파일을 처음 쓸 때 셸 heredoc 이 역슬래시를 한 겹
 *    먹어 `"\\text{…}"` 가 파일에 `"\text{…}"` 로 들어갔고, JS 는 그것을 **탭**으로 읽었다.
 *    그러면 검사 몇 개가 **엉뚱한 이유로 통과**한다(`$<TAB>riangle ABC$` 인데 `ABC` 만
 *    보고 초록). 이 저장소가 같은 자리를 여러 번 겪었다 — 축을 아예 없앤다.
 */
import { describe, expect, it } from "vitest";

import { preprocessMathText } from "@/lib/math/textPreprocess";

const BS = String.fromCharCode(92);
/** `tex("triangle ABC")` → `"$\triangle ABC$"` — 역슬래시 이스케이프가 없다. */
const tex = (body: string) => `$${body.split("~").join(BS)}$`;
const render = (body: string) => preprocessMathText(tex(body));

describe("[도형 라벨] 연속 대문자 2자+ 는 정자", () => {
  it("맨 라벨을 정자화한다 — 자리를 가리지 않는다", () => {
    expect(render("IBA=42~degree")).toContain(`${BS}mathrm{IBA}`);
    expect(render("AB=5")).toContain(`${BS}mathrm{AB}`);
    expect(render("ABCD")).toContain(`${BS}mathrm{ABCD}`);
  });

  /** 원본 규칙이 못 박은 것: **단일 대문자는 변수**다. */
  it("단일 대문자는 변수라 그대로 둔다", () => {
    const out = render("A=50~degree");
    expect(out).not.toContain(`${BS}mathrm{A}`);
    expect(out).toContain("A=50");
  });

  it("소문자 변수는 건드리지 않는다", () => {
    expect(render("x=23~degree")).not.toContain(`${BS}mathrm`);
  });

  it("도형 접두사 뒤 라벨도 정자다", () => {
    expect(render("~triangle ABC")).toContain(`${BS}mathrm{ABC}`);
  });

  /** ⚠️ 이 갈래가 없으면 `\AA` 같은 **명령 이름**이 라벨로 오인된다. */
  it("LaTeX 명령 이름은 라벨이 아니다", () => {
    expect(render("~AA")).not.toContain(`${BS}mathrm{AA}`);
  });

  /** ⚠️ 두 번 감싸면 `\mathrm{\mathrm{AB}}` 가 된다. */
  it("이미 정자인 구간은 다시 감싸지 않는다", () => {
    const out = render("~mathrm{AB}");
    expect(out).not.toContain(`${BS}mathrm{${BS}mathrm`);
    expect(out.split(`${BS}mathrm`).length - 1).toBe(1);
  });

  it("text 안은 이미 정자라 건드리지 않는다", () => {
    expect(render("~text{ABC}")).not.toContain(`${BS}mathrm{ABC}`);
  });

  it("프라임이 붙은 라벨도 한 덩어리다", () => {
    expect(render("A'B'")).toContain(`${BS}mathrm{A'B'}`);
  });

  /**
   * 실데이터 회귀 — 원장님이 보신 그 문항(J20503-JWCV). 한 지면에서 `\overline{AI}` 는
   * 정자인데 `IBA`·`IAC` 만 이탤릭이던 것이 이 결함의 얼굴이었다.
   */
  it("같은 지면의 라벨이 전부 같은 꼴이 된다 (J20503-JWCV)", () => {
    const out = preprocessMathText(
      [
        tex("~triangle ABC"),
        tex("IBA=42~degree"),
        tex("~overline{AI}"),
        tex("IAC=~frac{1}{2}"),
      ].join(" "),
    );
    for (const label of ["ABC", "IBA", "AI", "IAC"]) {
      expect(out).toContain(`${BS}mathrm{${label}}`);
    }
  });
});
