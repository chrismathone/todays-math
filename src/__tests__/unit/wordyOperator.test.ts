/**
 * 🔴 **해설이 «수식 기호»로 말하는 것을 말로 고친다** (원장님 지적 2026-08-26).
 *
 * > 「해설에 이렇게 쓰지 말고 **최솟값·최댓값이란 말을 명확히 쓸 것.**」
 * > 짚으신 해설: `최대공약수에서 2의 지수는 $\min(a,3)=2$이므로 $a=2$`
 *
 * ## 이 부류는 기존 가드가 **구조적으로 못 본다**
 *
 * · KaTeX 는 초록이다 — `\min` 은 **정상 LaTeX** 다.
 * · 값도 맞다 — 수학적으로 옳은 식이다.
 * · 잔재 계량기(`mathTokenCensus.bareRuns`)는 백슬래시 명령을 **일부러 뺀다**.
 *
 * 2026-08-24 「값이 맞으면 시험이 다 초록이다 — 지면이 흉한 것은 따로 세야 한다」의
 * 또 한 번이고, 이번엔 「흉하다」가 아니라 **학생이 못 읽는다**이다.
 *
 * ## 규칙의 모양 — «못 가르는 것은 버리는 쪽»
 *
 * **함수 적용 꼴만** 바꾼다(`\min(a,3)`). 나머지는 손대지 않고 **까닭과 함께 남긴다**:
 * 아래첨자(`\min_{x\ge0}`) · 중괄호(`\max\{…\}`) · 인자 없음(`\gcd=1`).
 * 「인자 없음」을 안 막으면 **HWP 잔재를 뜻으로 읽는다** — 실측 `J10604-LKH8` 의
 * `부채꼴의 호의 길이를 $\lcm$ 라 하면` 은 `l cm`(길이 $l$)이 붙어 버린 것이지
 * 최소공배수가 아니다. 그걸 「최소공배수」로 바꾸면 **그럴듯하게 틀린다.**
 */
import { describe, expect, it } from "vitest";

import {
  hasWordyOperator,
  preservesValues,
  rewriteWordyOperators,
  wordyOperatorHits,
} from "../../../scripts/qa/wordyOperator";

const BS = String.fromCharCode(92);
/** 시험 본문에서 역슬래시가 한 겹 더 붙는 사고를 막는다 — 이 저장소가 반복해 겪은 자리. */
const tex = (s: string) => s.split("§").join(BS);

describe("[말 대신 기호] 찾기 — 열쇠가 살아 있나", () => {
  it("원장님이 짚은 그 글을 잡는다", () => {
    expect(hasWordyOperator(tex("소인수 $2$에서 $§min(a,3)=2$이다"))).toBe(
      true,
    );
  });

  it("`\deg` 는 잡고 `\degree` 는 안 잡는다 — 뒤에 영문이 이어지면 다른 명령이다", () => {
    expect(hasWordyOperator(tex("$§deg R<n$"))).toBe(true);
    expect(hasWordyOperator(tex("$30§degree$"))).toBe(false);
  });

  it("교과서가 **가르치는** 기호는 대상이 아니다 — 안 그러면 지면이 통째로 뒤집힌다", () => {
    for (const ok of [
      "§sin A",
      "§cos B",
      "§log_2 8",
      "§lim_{n§to§infty}",
      "§sum_{k=1}^{9}",
    ])
      expect(hasWordyOperator(tex(`$${ok}$`)), ok).toBe(false);
  });

  it("`\mathrm{lcm}`·`\text{lcm}` 도 잡는다 — `\lcm` 이 붉게 나가니 사람이 피해 적는다", () => {
    expect(hasWordyOperator(tex("$§mathrm{lcm}(10,12)=60$"))).toBe(true);
    expect(hasWordyOperator(tex("$§text{lcm}(a,b)=225$"))).toBe(true);
  });

  it("한 자리도 없는 글에서는 아무것도 안 낸다 — 반대쪽 표본", () => {
    expect(wordyOperatorHits("$28$과 $35$의 최대공약수는 $7$이다.")).toEqual(
      [],
    );
  });
});

describe("[말 대신 기호] 바꾸기", () => {
  it("원장님 문장을 말로 바꾼다", () => {
    const r = rewriteWordyOperators(
      tex("최대공약수에서 $2$의 지수는 $§min(a,3)=2$이므로 $a=2$이다."),
    );
    expect(r.out).toBe(
      tex(
        "최대공약수에서 $2$의 지수는 $(a,§,3§text{ 중 최솟값})=2$이므로 $a=2$이다.",
      ),
    );
    expect(r.changed).toBe(1);
    expect(r.skipped).toEqual([]);
  });

  it("네 갈래를 각각 제 말로 바꾼다", () => {
    const cases: [string, string][] = [
      ["$§max(2,b)=3$", "$(2,§,b§text{ 중 최댓값})=3$"],
      ["$§gcd(28,35)=7$", "$(28,§,35§text{의 최대공약수})=7$"],
      ["$§lcm (15,18)=90$", "$(15,§,18§text{의 최소공배수})=90$"],
      ["$§mathrm{lcm}(10,12)=60$", "$(10,§,12§text{의 최소공배수})=60$"],
      ["$§deg R<n$", "$(R§text{의 차수})<n$"],
    ];
    for (const [from, to] of cases)
      expect(rewriteWordyOperators(tex(from)).out, from).toBe(tex(to));
  });

  it("셋 이상이면 «가장»을 붙인다 — 둘일 때와 읽는 말이 다르다", () => {
    expect(rewriteWordyOperators(tex("$§max(2, a, 1)=3$")).out).toBe(
      tex("$(2,§,a,§,1§text{ 중 가장 큰 값})=3$"),
    );
  });

  it("인자가 하나면 «…의 최솟값» 이다 — 집합·식의 최솟값 꼴", () => {
    expect(rewriteWordyOperators(tex("$§min(A)$")).out).toBe(
      tex("$(A§text{의 최솟값})$"),
    );
  });

  it("괄호가 겹쳐도 **바깥 쉼표에서만** 가른다", () => {
    expect(rewriteWordyOperators(tex("$g(t)=§max(f(t-1),f(t+1))$")).out).toBe(
      tex("$g(t)=(f(t-1),§,f(t+1)§text{ 중 최댓값})$"),
    );
  });

  /**
   * ⚠️ 위 시험은 **이 경계를 안 가른다** — `f(t-1),f(t+1)` 의 쉼표는 안쪽 괄호가
   * 이미 닫힌 자리라 깊이가 0 이다. 변이(`depth === 0` 을 지움)를 걸었더니
   * 산출물이 그대로였다. 안쪽에 쉼표가 **든** 표본이 있어야 갈린다.
   */
  it("**안쪽 괄호 속** 쉼표에서는 안 가른다 — 인자 수가 통째로 달라진다", () => {
    const r = rewriteWordyOperators(tex("$§gcd(§gcd(12,18),30)=6$"));
    expect(r.out).toBe(
      tex("$((12,§,18§text{의 최대공약수}),§,30§text{의 최대공약수})=6$"),
    );
  });

  it("**중괄호 속** 쉼표에서도 안 가른다", () => {
    expect(rewriteWordyOperators(tex("$§max(§frac{a}{b},1)$")).out).toBe(
      tex("$(§frac{a}{b},§,1§text{ 중 최댓값})$"),
    );
  });

  it("`\left(`·`\right)` 꼴도 받는다", () => {
    expect(
      rewriteWordyOperators(tex("$m=§max§left(0,§frac34§right)$")).out,
    ).toBe(tex("$m=(0,§,§frac34§text{ 중 최댓값})$"));
  });

  it("중괄호 인자(`\,`)를 앞에 붙여 놔도 인자에서 떼어 낸다", () => {
    expect(rewriteWordyOperators(tex("$§gcd(2^4,§,3^2)=1$")).out).toBe(
      tex("$(2^4,§,3^2§text{의 최대공약수})=1$"),
    );
  });

  describe("못 바꾸는 것은 **손대지 않고 까닭을 남긴다**", () => {
    const cases: [string, string][] = [
      ["$§gcd=1$", "인자없음"],
      ["$§gcd$의 지수가 짝수", "인자없음"],
      ["$k§le§min§{g(x)-12x§}$", "중괄호꼴"],
      ["$k§ge§max_{x§le0}h(x)$", "아래첨자"],
      ["$P_{§max}=16$", "아래첨자"],
      ["$§min=1$", "인자없음"],
      // 🔴 원장님 확정 2026-08-26 「앞으로 생성할 문제만 그렇게 해」 — 지수 안에
      //    한국어를 넣지 않는다. 바꾸면 지면에서 본문의 70% 크기로 작게 찍힌다
      //    (실측: 격리된 3행 10자리가 그 꼴이다 — J10105-UE8S·VZW6·WAVW).
      ["$2^{§min(3,2)}§times 7^{§min(2,2)}=2^2$", "윗첨자"],
      // 앞뒤 몇 글자만 보면 **중첩을 못 본다** — 바로 앞이 `{` 라 「첨자 아님」이 된다.
      ["$2^{§frac{§min(3,2)}{2}}$", "윗첨자"],
    ];
    for (const [from, why] of cases)
      it(`${from} → ${why}`, () => {
        const r = rewriteWordyOperators(tex(from));
        expect(r.out, "손대면 안 된다").toBe(tex(from));
        expect(r.changed).toBe(0);
        expect(r.skipped.map((s) => s.reason)).toContain(why);
      });

    // ⚠️ 음성 대조 — 이게 없으면 「첨자를 건너뛴다」를 «전부 건너뛴다»로 망가뜨려도
    //    위 목록이 전부 초록이다. 첨자가 **있는 식**이되 연산자는 그 **밖**인 자리다.
    it("첨자를 쓰는 식이어도 연산자가 첨자 **밖**이면 그대로 바꾼다", () => {
      const r = rewriteWordyOperators(tex("$2^3§times§min(3,2)$"));
      expect(r.out).toBe(tex("$2^3§times(3,§,2§text{ 중 최솟값})$"));
      expect(r.changed).toBe(1);
    });

    it("HWP 잔재 `$\lcm$` 을 «최소공배수»로 읽지 않는다 — 실측 J10604-LKH8", () => {
      const raw = tex(
        "부채꼴의 호의 길이를 $§lcm$ 라 하면 $§frac{1}{2}§times 6§times l=24p$",
      );
      const r = rewriteWordyOperators(raw);
      expect(r.out).toBe(raw);
      expect(r.changed).toBe(0);
    });
  });

  it("**수를 하나도 잃지 않는다** — 인자를 그대로 옮기므로 구조적으로 그렇다", () => {
    const raw = tex(
      "$§gcd(2^4§times3§times5,§,2^2§times3^2§times7)=2^2§times3=12$",
    );
    const digits = (s: string) => (s.match(/\d/g) ?? []).sort().join("");
    expect(digits(rewriteWordyOperators(raw).out)).toBe(digits(raw));
  });

  it("바꿀 것이 없으면 글자 하나도 안 건드린다", () => {
    const raw = "$28$과 $35$의 최대공약수는 $7$이다.";
    const r = rewriteWordyOperators(raw);
    expect(r.out).toBe(raw);
    expect(r.changed).toBe(0);
  });
});

/**
 * **바꾸기 전 값을 하나도 잃지 않았나** — 이 저장소가 되풀이해 데인 자리.
 *
 * 「한글 유사도」로는 본문 유실이 안 보인다(실측 0.92 가 나왔다). 가르는 열쇠는
 * **수**였다. 그리고 우리는 한글을 **더하므로**, 우리가 넣은 낱말을 도로 걷어 낸
 * 뒤에 견줘야 한다 — 안 그러면 어떤 한글 유실도 우리 낱말에 가려진다.
 */
describe("[말 대신 기호] 값을 지어내지도 잃지도 않았나", () => {
  it("제대로 바꾼 것은 통과한다", () => {
    const before = tex("소인수 $2$에서 $§min(a,3)=2$이다.");
    const after = rewriteWordyOperators(before).out;
    expect(preservesValues(before, after)).toEqual({ ok: true });
  });

  it("**수가 하나라도 달라지면** 막는다", () => {
    const before = tex("$§min(a,3)=2$");
    expect(
      preservesValues(before, tex("$(a,§,4§text{ 중 최솟값})=2$")).ok,
    ).toBe(false);
  });

  it("수의 **차례**가 바뀌어도 막는다 — 개수만 세면 못 본다", () => {
    expect(preservesValues("$1$과 $2$", "$2$와 $1$").ok).toBe(false);
  });

  it("**한글을 잃으면** 막는다 — 우리가 넣은 낱말에 가려지지 않는다", () => {
    const before = tex("분자의 최대공약수 $§gcd(28,35)=7$이다.");
    // 「분자의」가 사라졌는데 우리 낱말(최대공약수)이 들어와 겉보기 한글은 비슷하다.
    const sneaky = tex("최대공약수 $(28,§,35§text{의 최대공약수})=7$이다.");
    expect(preservesValues(before, sneaky).ok).toBe(false);
  });

  it("우리가 **안 쓰는 말**을 넣으면 막는다", () => {
    const before = tex("$§min(a,3)=2$");
    expect(
      preservesValues(before, tex("$(a,§,3§text{ 중 제일 쪼끄만 것})=2$")).ok,
    ).toBe(false);
  });

  it("수식 구분자 `$` 개수가 달라지면 막는다 — 지면이 통째로 어긋난다", () => {
    expect(preservesValues("$1$", "$1$$").ok).toBe(false);
  });
});
