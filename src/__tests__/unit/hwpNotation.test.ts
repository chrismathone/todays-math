/**
 * 교과서 이관 — 수식 안에 남은 한글 수식 표기를 KaTeX 로(값은 그대로) · 남은 것 세기.
 *
 * 예는 전부 2026-10-07 에 문제은행에 실었던 6,121문항에서 찾은 것이다 — 답은 맞았지만 지면에 «boldx» · «x->4» 가
 * 그대로 찍히고 있었다. 제품 렌더러는 이런 것을 오류로 보지 않는다(글자로 그린다) — 그래서 여기서 낱말로 센다.
 */
import { describe, expect, it } from "vitest";

import {
  hwpLeftovers,
  stripItemNumber,
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
