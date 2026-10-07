/**
 * 교과서 이관 — 수식 안에 남은 한글 수식 표기를 KaTeX 로(값은 그대로) · 남은 것 세기.
 *
 * 예는 전부 2026-10-07 에 문제은행에 실었던 6,121문항에서 찾은 것이다 — 답은 맞았지만 지면에 «boldx» · «x->4» 가
 * 그대로 찍히고 있었다. 제품 렌더러는 이런 것을 오류로 보지 않는다(글자로 그린다) — 그래서 여기서 낱말로 센다.
 */
import { describe, expect, it } from "vitest";

import {
  cleanContent,
  hwpLeftovers,
  stripItemNumber,
  stripScoreMarks,
  tidyHwpNotation,
} from "@/lib/import/schoolTextbook/hwpNotation";

const r = String.raw;

describe("tidyHwpNotation — 수식 안의 표기만 고친다", () => {
  it.each([
    // 굵게 — 낱말만 걷는다(강조일 뿐이다)
    [
      r`$boldx$와 $boldy$가 정비례하는 것에는 $boldBIGCIRC$표`,
      r`$x$와 $y$가 정비례하는 것에는 $\bigcirc$표`,
    ],
    [r`$BOLD1$개에 $bold500$원`, r`$1$개에 $500$원`],
    [
      r`물 $bold\mathrm{30}\,L$를 $BOLDx$명이 $BOLDy\,\mathrm{L}$씩`,
      r`물 $30\,\mathrm{L}$를 $x$명이 $y\,\mathrm{L}$씩`,
    ],
    [r`함수 $boldf(x)=-3x+1$`, r`함수 $f(x)=-3x+1$`],
    [r`$bold\mathrm{∠}BAD=90°$`, r`$\mathrm{∠}BAD=90°$`],
    [r`$\mathrm{bold}60\,km$`, r`$60\,\mathrm{km}$`],
    // 화살표
    [
      r`$\lim _{x->4}\frac{f(x)-f(4)}{x^{2}-5x+4}$`,
      r`$\lim _{x\to 4}\frac{f(x)-f(4)}{x^{2}-5x+4}$`,
    ],
    [r`$f:X~->\,X$ · $p\,->\,q$`, r`$f:X~\to \,X$ · $p\,\to \,q$`],
    [r`$\lim _{x\,->\,-1}f(x)$`, r`$\lim _{x\,\to \,-1}f(x)$`],
    // 부정 — sim p
    [
      r`$simp->q\,$ · $q~\Rightarrow SIMp$ · $sims~\Rightarrow \,simr$`,
      r`$\sim p\to q\,$ · $q~\Rightarrow \sim p$ · $\sim s~\Rightarrow \,\sim r$`,
    ],
    // 작은 곱 · 합 기호 · 동그라미
    [r`$\,_{4}SMALLPROD_{3}=64$`, r`$\,_{4}\Pi _{3}=64$`],
    [r`합의 기호 $SMALLSUM$를 사용하여`, r`합의 기호 $\sum$를 사용하여`],
    [
      r`① $-\frac{1}{3}bigcirc-2$ · $(\,BIGCIRC\,)$`,
      r`① $-\frac{1}{3}\bigcirc -2$ · $(\,\bigcirc \,)$`,
    ],
    // 온도
    [
      r`$100DEGRMC$ · $xCENTIGRADE$ · $B(DEGRMC)$`,
      r`$100{}^{\circ}\mathrm{C}$ · $x{}^{\circ}\mathrm{C}$ · $B({}^{\circ}\mathrm{C})$`,
    ],
    [
      r`$12\,centigrade$ · $a\,fahrenheit$`,
      r`$12\,{}^{\circ}\mathrm{C}$ · $a\,{}^{\circ}\mathrm{F}$`,
    ],
    // 직선 AB
    [r`$dyad\mathrm{AB}$`, r`$\overleftrightarrow{\mathrm{AB}}$`],
    // 밑줄 — 바로 뒤의 항 하나
    [r`① $4x=under-8\,\to \,4x+8=0$`, r`① $4x=\underline{-8}\,\to \,4x+8=0$`],
    [r`⑤ $xunder+3=under5x-10$`, r`⑤ $x\underline{+3}=\underline{5x}-10$`],
    [
      r`$0.1\dot{6}\dot{3}=0.1under63under63under63\cdots$`,
      r`$0.1\dot{6}\dot{3}=0.1\underline{63}\underline{63}\underline{63}\cdots$`,
    ],
    // 붙은 연산 낱말
    [
      r`$\frac{77}{2^{2}\times 5timesa}$`,
      r`$\frac{77}{2^{2}\times 5\times a}$`,
    ],
    [
      r`$=21b\div 7+14div7-4bdiv2+2\div 2$`,
      r`$=21b\div 7+14\div 7-4b\div 2+2\div 2$`,
    ],
    [
      r`$\frac{12}{2\cdot 3cdot\sqrt{7}}$`,
      r`$\frac{12}{2\cdot 3\cdot \sqrt{7}}$`,
    ],
    // 붙은 관계 낱말 — 숫자에 닿은 것만
    [
      r`$10LEN<100$ · $(0LEYLE15)$ · $DGE0$`,
      r`$10\le N<100$ · $(0\le Y\le 15)$ · $D\ge 0$`,
    ],
    [r`$1NOTINB$ · $ANSUBSETB\,$`, r`$1\notin B$ · $A\not\subset B\,$`],
    // 프라임
    [
      r`$f\prime (4)=3$ · $Q\,\prime (x)$ · $\overline{PF\prime }$`,
      r`$f'(4)=3$ · $Q'(x)$ · $\overline{PF'}$`,
    ],
    // 곧은 글자로 쓴 수 · 기울어진 단위
    [
      r`$\mathrm{230}\,km$ · $\mathrm{1}\,mL$ · $12\pi \,cm^{2}$`,
      r`$230\,\mathrm{km}$ · $1\,\mathrm{mL}$ · $12\pi \,\mathrm{cm}^{2}$`,
    ],
    [
      r`$1km$ · $4cm\,$ · $120Hz$ · $0\,m/s$`,
      r`$1\,\mathrm{km}$ · $4\,\mathrm{cm}\,$ · $120\,\mathrm{Hz}$ · $0\,\mathrm{m/s}$`,
    ],
    [
      r`$45\,m$ · $200\,g$ · $30\,L$`,
      r`$45\,\mathrm{m}$ · $200\,\mathrm{g}$ · $30\,\mathrm{L}$`,
    ],
    [
      r`$xcm$ · $3xcm$ · $\frac{1}{3}acm\,$`,
      r`$x\,\mathrm{cm}$ · $3x\,\mathrm{cm}$ · $\frac{1}{3}a\,\mathrm{cm}\,$`,
    ],
    [
      r`$=56\,(cm^{2})$ · $=4\,(cm)$ · $40-10t\,(m/s)$`,
      r`$=56\,(\mathrm{cm}^{2})$ · $=4\,(\mathrm{cm})$ · $40-10t\,(\mathrm{m/s})$`,
    ],
    // 그 밖의 표기
    [
      r`$a=7,~8,~9,~...$ · $-1.33333...$`,
      r`$a=7,~8,~9,~\cdots$ · $-1.33333\cdots$`,
    ],
    [r`$\int _{}^{}f(x)dx=-x+C$`, r`$\int f(x)dx=-x+C$`],
    [r`$x=+-1$ · 선분 $\mathrm{A}B$`, r`$x=\pm 1$ · 선분 $\mathrm{AB}$`],
    [
      r`$\mathrm{P}(48\leq \overline{itX}\leq 53)$`,
      r`$\mathrm{P}(48\leq \overline{X}\leq 53)$`,
    ],
    // 검토자의 출력에서 먹힌 \right (`\r` 이 줄바꿈 글자가 됐다)
    [
      r`$\dfrac{9}{5}\times\left(-\dfrac{10}{3} ight)=-6$`,
      r`$\dfrac{9}{5}\times\left(-\dfrac{10}{3}\right)=-6$`,
    ],
    [
      r`$\left|-\dfrac{1}{3}-\dfrac{1}{6} ight|=\left|-\dfrac{1}{2} ight|$`,
      r`$\left|-\dfrac{1}{3}-\dfrac{1}{6}\right|=\left|-\dfrac{1}{2}\right|$`,
    ],
  ])("%s", (before, after) => {
    expect(tidyHwpNotation(before)).toBe(after);
  });

  it("빈 수식은 걷고, 줄 끝에서 끊긴 괄호는 잇는다", () => {
    expect(tidyHwpNotation(r`2) $_{}$$x^{2}+y^{2}+8x-2y+8=0$`)).toBe(
      r`2) $x^{2}+y^{2}+8x-2y+8=0$`,
    );
    expect(tidyHwpNotation("⑴ $x+1<0$ (\n) ⑵ $x+1≥0$ (\n)\n⑶ $x-1<0$")).toBe(
      "⑴ $x+1<0$ ( ) ⑵ $x+1≥0$ ( )\n⑶ $x-1<0$",
    );
  });

  it("수식 안의 줄바꿈은 빈칸으로 · 줄 끝 빈칸은 걷는다", () => {
    expect(tidyHwpNotation("$a\n+b$  \n다음 ")).toBe("$a +b$\n다음");
  });

  it.each([
    // 이미 옳은 것 · 뜻이 다른 것은 그대로
    r`$k<-\dfrac{25}{4}$`, // 작다 + 음수
    r`$5!=120$ · $4!\times 2!=48$`,
    r`$f^{\prime}(x)$ · $\boldsymbol{x}$ · $\underline{3}$ · $\cdots$ · $\times$ · $\div$`,
    r`$\overline{GE}$ · $\triangle DEF$ · $AB=BA$ · $A^{2}=AA$`,
    r`$f(m)=\frac{1}{2}$ · $f(m+n)=f(m)f(n)$ · $2kl$ · $km+kn$`,
    r`$3\,\mathrm{cm}$ · $\mathrm{P}(A)$ · $\mathrm{AB}$ · $_{4}\mathrm{P}_{2}$`,
    r`$\begin{pmatrix} 1 & ~~-4 \\ 4 & ~~~~4 \end{pmatrix}$`,
    "값은 +-1 이다 · 5cm 를 bold 로 — 수식 밖은 건드리지 않는다",
  ])("그대로: %s", (text) => {
    expect(tidyHwpNotation(text)).toBe(text);
  });

  it("두 번 걸어도 같다", () => {
    const once = tidyHwpNotation(
      r`$boldx->4$ · $1km$ · $f\prime (x)$ · $xunder+3$ · $10LEN<100$`,
    );
    expect(tidyHwpNotation(once)).toBe(once);
  });
});

describe("stripItemNumber — 본문 머리에 붙은 문항 번호", () => {
  it("0 으로 시작하는 두 자리 수만 걷는다", () => {
    expect(stripItemNumber("01다음을 합의 기호 $\\sum$를 사용하여")).toBe(
      "다음을 합의 기호 $\\sum$를 사용하여",
    );
    expect(stripItemNumber("01 수직선 위의 두 점")).toBe("수직선 위의 두 점");
    for (const text of [
      "1시간 후 살아 있는 단세포 생물의 수는",
      "10개의 공이 들어 있는 주머니",
      "0이 아닌 두 수",
      "$01$로 시작하는",
    ])
      expect(stripItemNumber(text)).toBe(text);
  });
});

describe("stripScoreMarks — 본문에 남은 배점 표시", () => {
  it("대괄호 안에 수와 «점»만 있을 때 걷는다", () => {
    expect(
      stripScoreMarks("양수 $r$의 값은? [$3$점]\n① $\\sqrt{5}$\n② $2$"),
    ).toBe("양수 $r$의 값은?\n① $\\sqrt{5}$\n② $2$");
    expect(stripScoreMarks("정수 $k$의 개수를 구하시오. [4점]")).toBe(
      "정수 $k$의 개수를 구하시오.",
    );
    expect(stripScoreMarks("구하시오. ［$3.5$점］")).toBe("구하시오.");
    for (const text of [
      "점 $[3, 5]$ 위의 점",
      "구간 $[1,~4]$에서",
      "[보기]에서 고르시오.",
      "한 문제에 $4$점씩",
    ])
      expect(stripScoreMarks(text)).toBe(text);
  });

  it("본문 손질은 번호와 배점을 같이 걷는다", () => {
    expect(cleanContent("01다음 값은? [$4$점]\n① $1$")).toBe(
      "다음 값은?\n① $1$",
    );
  });
});

describe("지면 검토가 짚은 꼴 — 본문에 섞인 글 · 전각 기호 · 부호만 감싼 근호", () => {
  it("본문 앞뒤의 머리 · 번호 · 출처를 걷는다", () => {
    expect(
      cleanContent(
        "|원 위의 한 점을 지나는 접선의 방정식| 다음 접선의 방정식을 구하시오.\n⑴ 원 $x^{2}+y^{2}=2$",
      ),
    ).toBe("다음 접선의 방정식을 구하시오.\n⑴ 원 $x^{2}+y^{2}=2$");
    expect(
      cleanContent(
        "|함수 $y=x^{n}$($n$은 양의 정수)의 부정적분| 다음 부정적분을 구하시오.",
      ),
    ).toBe("다음 부정적분을 구하시오.");
    expect(cleanContent("명제와 조건\n01 두 조건\n $p:x$는")).toBe(
      "두 조건\n $p:x$는",
    );
    expect(
      cleanContent("사인법칙과 코사인법칙\n01삼각형 $\\mathrm{ABC}$에서"),
    ).toBe("삼각형 $\\mathrm{ABC}$에서");
    expect(cleanContent("01$625$의 네제곱근 중에서 실수인 것들의 곱은?")).toBe(
      "$625$의 네제곱근 중에서 실수인 것들의 곱은?",
    );
    expect(cleanContent("●○○\n다음 중 합성수인 것은?\n① $13$")).toBe(
      "다음 중 합성수인 것은?\n① $13$",
    );
    expect(
      cleanContent("경우의 수는?\n① $24$\n⑤ $40$\n[2020년 3월 고2 15번]"),
    ).toBe("경우의 수는?\n① $24$\n⑤ $40$");
    expect(cleanContent("1 다음을 구하시오.\n⑴ $x=-4$")).toBe(
      "다음을 구하시오.\n⑴ $x=-4$",
    );
    expect(cleanContent("1 두 수 $2^{2}\\times 3^{a}$, $3^{4}$의")).toBe(
      "두 수 $2^{2}\\times 3^{a}$, $3^{4}$의",
    );
  });

  it("본문인 것은 그대로 둔다", () => {
    for (const text of [
      "두 집합\n $A=\\left\\{ 1,~2\\right\\}$, $B$에 대하여",
      "다항식의 연산\n다음 나눗셈의 몫과 나머지를 구하시오.", // 번호가 없으면 제목인지 가릴 수 없다
      "3 이상의 자연수 $n$에 대하여",
      "1시간 후 살아 있는 단세포 생물의 수는",
      "1 이상 10 이하의 자연수 중에서",
      "$|x|$의 값은?\n① $1$",
      "구간 $[0,~2]$에서\n[보기]의 설명 중 옳은 것은?",
    ])
      expect(cleanContent(text)).toBe(text);
  });

  it("전각 기호와 부호만 감싼 근호를 고친다", () => {
    expect(tidyHwpNotation("$2x^{2}+ax－3+a$ · $x＜3$ · $a＝b＋1$")).toBe(
      "$2x^{2}+ax-3+a$ · $x<3$ · $a=b+1$",
    );
    expect(tidyHwpNotation("$\\sqrt{-}3\\sqrt{-}15$ · $\\sqrt{-3}$")).toBe(
      "$\\sqrt{-3}\\sqrt{-15}$ · $\\sqrt{-3}$",
    );
    // 수식 밖의 전각 기호는 글이다
    expect(tidyHwpNotation("값이 － 인 경우")).toBe("값이 － 인 경우");
  });

  it.each([
    // 문자 · 원주율 · 괄호 · 분수 뒤의 단위
    [
      r`$x\,cm$ · $4x\,cm^{2}$ · $y\,kWh$`,
      r`$x\,\mathrm{cm}$ · $4x\,\mathrm{cm}^{2}$ · $y\,\mathrm{kWh}$`,
    ],
    [
      r`$25\pi cm\,^{2}$ · $2\pi cm\,$`,
      r`$25\pi \,\mathrm{cm}\,^{2}$ · $2\pi \,\mathrm{cm}\,$`,
    ],
    [
      r`$(x+3)km$ · $\frac{5}{4}km$ · $\frac{a}{800}m/s$`,
      r`$(x+3)\,\mathrm{km}$ · $\frac{5}{4}\,\mathrm{km}$ · $\frac{a}{800}\,\mathrm{m/s}$`,
    ],
    [
      r`$=205(MB)$ · $=4\,\mathrm{(}cm)$ · $2(x+8)~\mathrm{(}cm)$`,
      r`$=205(\mathrm{MB})$ · $=4\,(\mathrm{cm})$ · $2(x+8)~(\mathrm{cm})$`,
    ],
  ])("단위: %s", (before, after) => {
    expect(tidyHwpNotation(before)).toBe(after);
    expect(tidyHwpNotation(after)).toBe(after);
  });

  it.each([
    r`$2(m)+3$ · $f(m)$ · $(a+b)c$ · $x^{2}m$ · $\frac{k}{2}m$`,
    r`$3\,\mathrm{cm}$ · $(x+3)\,\mathrm{km}$`,
  ])("단위가 아닌 것은 그대로: %s", (text) => {
    expect(tidyHwpNotation(text)).toBe(text);
  });
});

describe("hwpLeftovers — 손질 뒤에도 남은 것", () => {
  it("깨끗한 글에서는 비어 있다", () => {
    for (const text of [
      r`$x\to 4$ · $\bigcirc$ · $\underline{-8}$ · $\overline{X}$ · $f'(x)$`,
      r`$\triangle DEF$ · $\overline{GE}$ · $ABCD$ · $dbaec$ · $xyz$ · $\mathrm{NEVER}~GIVE~UP$`,
      r`$\begin{cases} x+y=k \\ xy=3 \end{cases}$ · $\begin{pmatrix} 1 & 2 \end{pmatrix}$`,
      r`$\left(\dfrac{1}{2}\right)^{2}$ · $\int f(x)dx$ · $a_{ij}$ · $\sin x$ · $\log _{2}3$`,
      // 분자가 곧은 글자뿐인 분수는 비지 않았다
      r`$\frac{\mathrm{AB}}{2}$ · $\mathrm{P}(A\cap B)=\frac{\mathrm{1}}{6}$`,
    ])
      expect(hwpLeftovers(text)).toEqual([]);
  });

  it.each([
    [r`$boldx$`, "bold"],
    [r`$x->4$`, "->"],
    [r`$-\,under)\,x=2.222$`, "under"],
    [r`$\,_{4}SMALLPROD_{3}$`, "SMALLPROD"],
    [r`$\left(-\dfrac{10}{3} ight)$`, "ight"],
    [r`$\frac{}{lineX}$`, r`\frac{}`],
    [
      r`$_{3}\mathrm{C}_{3}\frac{}{_{7}\mathrm{C}_{3}}=\frac{1}{35}$`,
      r`\frac{}`,
    ],
    [r`$\frac{}{l}\in eX$`, r`\frac{}`],
    [r`$5timesa$`, "times"],
    [r`$\overline{A}'PGE\overline{A}'C-2$`, "GE"],
    [
      r`$\mathrm{P}(A)=_{3}\mathrm{C}_{3}\frac{}{_{7}\mathrm{C}_{3}}$`,
      r`\frac{}`,
    ],
    [
      r`$\left[ ~~~~~~\begin{cases} \\ \end{cases}\right] _{0}^{4}$`,
      "빈 cases",
    ],
    [r`$simp$`, "sim"],
    [r`$dyadAB$`, "dyad"],
    [r`$16DEGRMC$`, "DEGRMC"],
  ])("%s → %s", (text, word) => {
    expect(hwpLeftovers(text)).toContain(word);
  });

  it("손질한 뒤에는 고쳐진 것이 남지 않는다", () => {
    const text = r`$boldx->4$ · $simp$ · $16DEGRMC$ · $5timesa$ · $\,_{4}SMALLPROD_{3}$ · $\left(-\dfrac{10}{3} ight)$`;
    expect(hwpLeftovers(text).length).toBeGreaterThan(0);
    expect(hwpLeftovers(tidyHwpNotation(text))).toEqual([]);
  });
});
