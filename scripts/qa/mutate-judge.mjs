/**
 * 판정형(`src/lib/middle/judge/`) 변이 시험 — **가드는 망가뜨려 봐야 가드인 줄 안다**
 * (2026-10-08 엔진 보강 1단계 · 2단계에서 넓혔다).
 *
 * 판정은 세 단계다(2026-08-20·21 교훈):
 *   ⑴ 파일이 정말 바뀌었나        — 안 바뀌면 판정하지 않는다
 *   ⑵ **산출물이 정말 바뀌었나**  — 안 바뀌면 «뜻이 안 바뀐 변이»다. 판정 거부(`judge-digest.ts`)
 *   ⑶ 그제서야 시험이 빨개지나
 *
 * 산출물은 둘이다 — 등록된 판정형이 내는 **문항**과, 틀린 산출물을 먹였을 때 등록부 **관문이 멈추는가**
 * (`judge-digest.ts` 머리말). 관문을 푼 변이는 문항을 한 글자도 안 바꾸므로 둘째가 없으면 «판정 거부»가 된다.
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**다(`git show HEAD:` 로 짜면 미커밋 수정을 먹는다 — 2026-08-23).
 * 그래서 대상 파일에 미커밋 수정이 있으면 아무것도 안 하고 멈춘다.
 *
 *   node scripts/qa/mutate-judge.mjs [번호 …]
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "src/lib/middle/judge";
const REGISTRY = `${DIR}/registry.ts`;
const CALC = `${DIR}/calcJudge.ts`;
const ADDSUB = `${DIR}/addSub.ts`;
const MULDIV = `${DIR}/mulDiv.ts`;
const FORMS = `${DIR}/valueForms.ts`;
const VALUE = `${DIR}/valueJudge.ts`;
const COMPARE = `${DIR}/compare.ts`;
const ARITH = `${DIR}/texArith.ts`;
const PAPER = `${DIR}/paper.ts`;
const DEFS = `${DIR}/definitions.ts`;
const TARGETS = [
  REGISTRY,
  CALC,
  ADDSUB,
  MULDIV,
  FORMS,
  VALUE,
  COMPARE,
  ARITH,
  PAPER,
  DEFS,
];
const TESTS = [
  "src/__tests__/unit/judgeAddSub.test.ts",
  "src/__tests__/unit/judgeRegistry.test.ts",
  "src/__tests__/unit/judgeCompareRegistry.test.ts",
  "src/__tests__/unit/judgeTexArith.test.ts",
  "src/__tests__/unit/judgeStep1Pin.test.ts",
  "src/__tests__/unit/judgeMulDiv.test.ts",
  "src/__tests__/unit/judgeValue.test.ts",
  "src/__tests__/unit/judgeCompare.test.ts",
  "src/__tests__/unit/judgeStep2.test.ts",
  "src/__tests__/unit/judgePaper.test.ts",
  "src/__tests__/unit/loadJudgeRows.test.ts",
];

/**
 * 변이 — 앞의 열둘은 1단계의 것(짓기 고리가 `calcJudge.ts` 로 옮겨 가 앵커만 따라갔다), 뒤는 2단계.
 * 지시서의 셋(«거짓 보기를 참으로» · «4+1 을 3+2 로» · «최댓값 동점 넣기»)은 [1] · [13] · [15] 다.
 */
const MUTATIONS = [
  // ── 1단계 ────────────────────────────────────────────────────────────────
  {
    name: "거짓 보기를 참으로",
    why: "틀린 보기의 오른쪽에 참값을 찍는다(주장은 그대로 «거짓») — 관문이 다시 재서 멈춰야 한다",
    file: CALC,
    find: "    text: `$${m.left}=${texQ(shown)}$`,",
    to: "    text: `$${m.left}=${texQ(m.value)}$`,",
  },
  {
    name: "물음 뒤집기",
    why: "«옳지 않은 것» 물음에서 참을 «다른 하나»로 읽는다",
    file: REGISTRY,
    find: '  return ask === "옳지 않은 것" ? !truth : truth;',
    to: '  return ask === "옳지 않은 것" ? truth : !truth;',
  },
  {
    name: "보기를 안 섞는다(참거짓)",
    why: "정답이 늘 ① — 보기 순열이 사라진다",
    file: REGISTRY,
    find: "않는다 — ${body.lead}`,\n    );\n\n  const order = shuffled(rng, body.options);",
    to: "않는다 — ${body.lead}`,\n    );\n\n  const order = [...body.options];",
  },
  {
    name: "해설 첫 줄이 순열을 안 따라간다(참거짓)",
    why: "계산 결과 줄을 생성기 차례로 적는다 — ③ 자리에 다른 보기의 값이 선다",
    file: REGISTRY,
    find: '    `${body.briefLead.trim()} ${order.map((o, i) => `${CHOICE_MARKS[i]} ${o.brief.trim()}`).join(", ")}이다.`,\n    `${answer} ${order[odd[0]!]!.detail.trim()}`,',
    to: '    `${body.briefLead.trim()} ${body.options.map((o, i) => `${CHOICE_MARKS[i]} ${o.brief.trim()}`).join(", ")}이다.`,\n    `${answer} ${order[odd[0]!]!.detail.trim()}`,',
  },
  {
    name: "정답 풀이가 다른 보기의 것",
    why: "둘째 줄에 정답 보기가 아니라 지면 첫 보기의 풀이를 적는다",
    file: REGISTRY,
    find: "    `${answer} ${order[odd[0]!]!.detail.trim()}`,",
    to: "    `${answer} ${order[0]!.detail.trim()}`,",
  },
  {
    name: "정답의 까닭을 까닭 줄에 또 적는다",
    why: "«옳지 않은 것» 물음에서 정답 보기의 까닭이 셋째 줄에 겹쳐 나온다",
    file: REGISTRY,
    find: "    if (i === odd[0] || o.why === null) return;",
    to: "    if (o.why === null) return;",
  },
  {
    name: "정답 번호를 첫 자리로(참거짓)",
    why: "다시 잰 «다른 하나»와 상관없이 ① 을 정답으로 적는다",
    file: REGISTRY,
    find: "  const answer = CHOICE_MARKS[odd[0]!]!;",
    to: "  const answer = CHOICE_MARKS[0]!;",
  },
  {
    name: "어댑터 부호 틀림(뺄셈)",
    why: "원천 03 의 facts 로 식을 세울 때 빼기를 더하기로 — 어댑터의 되계산이 멈춰야 한다",
    file: ADDSUB,
    find: '  { op: "-", v: fq(f, "b") },',
    to: '  { op: "+", v: fq(f, "b") },',
  },
  {
    name: "까닭과 값이 어긋남(뺄셈)",
    why: "«빼는 수의 부호를 바꾸지 않고 더한 값»이라 적고 다른 값(부호 반대)을 찍는다",
    file: ADDSUB,
    find: "      value: evalTerms(wrong),",
    to: "      value: negQ(evalTerms(wrong)),",
  },
  {
    name: "꼴을 안 맞춘다",
    why: "분수 항의 수 · 결과 종류가 다른 재료가 한 문항에 섞인다",
    file: CALC,
    find: "    const shape = m.shape;",
    to: '    const shape = "같은 꼴";',
  },
  {
    name: "부호 반대 상한을 푼다",
    why: "한 문항에 «결과 부호 반대» 보기가 둘 이상 — 부호만 보고 지워 낸다",
    file: CALC,
    find: "      : chooseMistake(rng, m, m.value.d === 1, !b.signUsed);",
    to: "      : chooseMistake(rng, m, m.value.d === 1, true);",
  },
  {
    name: "오른쪽 값 겹침 허용",
    why: "식이 달라도 오른쪽 값이 같은 보기 둘 — 계산 판정의 규칙이다",
    file: CALC,
    find: "    if (b.rights.has(right)) continue;",
    to: "    if (false) continue;",
  },
  // ── 2단계 — 비교형의 짓기 ────────────────────────────────────────────────────
  {
    name: "🔴 4+1 을 3+2 로",
    why: "같은 값인 식을 셋만 모으고 나머지 둘을 «다른 값»으로 채운다 — 관문이 묶음을 다시 재서 멈춰야 한다",
    file: COMPARE,
    find: "const SAME_COUNT = 4;",
    to: "const SAME_COUNT = 3;",
  },
  {
    name: "4+1 의 «다른 하나»를 공통값으로(5+0)",
    why: "다른 하나 자리에 같은 값인 식을 또 넣는다 — 다섯 값이 다 같다",
    file: COMPARE,
    find: "      options: [odd, a, b, c, d].map(option),",
    to: "      options: [{ ...odd, value: a.value }, a, b, c, d].map(option),",
  },
  {
    name: "🔴 극값 동점 넣기",
    why: "값이 겹치는 식을 걸러 내지 않는다 — 가장 큰(작은) 값이 둘이 될 수 있다",
    file: COMPARE,
    find: "      if (tray.pieces.some((x) => sameValue(x.value, p.value))) continue;",
    to: "      if (false) continue;",
  },
  {
    name: "극값 쪽 부호가 하나뿐이어도 낸다",
    why: "양수가 하나뿐인 «가장 큰 것» — 부호만 보고 답이 나온다",
    file: COMPARE,
    find: "    if (side < 2) continue;",
    to: "    if (side < 1) continue;",
  },
  {
    name: "함정을 안 쓴다(나눗셈 4+1)",
    why: "«역수를 안 취하면 공통값이 되는 식»을 다른 하나로 쓰지 않는다 — 함정의 바닥이 무너진다",
    file: COMPARE,
    find: "      if (roll <= 4) {",
    to: "      if (roll <= 0) {",
  },
  {
    name: "같은 계산을 다른 식으로 센다(덧셈 · 뺄셈)",
    why: "$a+b$ 와 $a-(-b)$ 를 서로 다른 식으로 세어 한 문항에 둘 다 싣는다",
    file: COMPARE,
    find: '    added.join(" & "),',
    to: "    undefined,",
  },
  {
    name: "겉모양을 안 맞춘다(비교형)",
    why: "분수 항의 수가 다른 식이 한 문항에 섞인다",
    file: COMPARE,
    find: "    if (this.look !== null && p.look !== this.look) return false;",
    to: "    if (false) return false;",
  },
  {
    name: "원천의 수 범위를 벗어난 식(덧셈 · 뺄셈 4+1)",
    why: "«값이 1 다른 식»의 범위 조건을 뺀다 — 둘째 수의 분자가 원천 01 · 03 보다 커진다",
    file: COMPARE,
    find: "      if (Math.abs(off.n * (m / off.d)) > 24) return null;",
    to: "      if (false) return null;",
  },
  // ── 2단계 — 등록부의 비교 문형 관문 ────────────────────────────────────────────
  {
    name: "4+1 관문을 푼다",
    why: "묶음이 둘 이상이면 낸다 — 3+2 · 5+0 이 아닌 2+2+1 도 지나간다(문항은 그대로 · 관문의 판정이 바뀐다)",
    file: REGISTRY,
    find: "    if (groups.length !== 2 || groups[0]!.length !== 4)",
    to: "    if (groups.length < 2)",
  },
  {
    name: "동점 관문을 푼다",
    why: "극값 문형에서 동점이 있어도 낸다(문항은 그대로 · 관문의 판정이 바뀐다)",
    file: REGISTRY,
    find: "  if (tied.length > 0)",
    to: "  if (tied.length > 5)",
  },
  {
    name: "극값의 방향을 뒤집는다",
    why: "«가장 큰 것» 물음에 가장 작은 것을 정답으로 적는다",
    file: REGISTRY,
    find: '    if (ask === "가장 큰 것" ? c > 0 : c < 0) best = i;',
    to: '    if (ask === "가장 큰 것" ? c < 0 : c > 0) best = i;',
  },
  {
    name: "보기를 안 섞는다(비교형)",
    why: "4+1 의 정답이 늘 ① — 보기 순열이 사라진다",
    file: REGISTRY,
    find: '    "생성기가 주장한",\n  );\n\n  const order = shuffled(rng, body.options);',
    to: '    "생성기가 주장한",\n  );\n\n  const order = [...body.options];',
  },
  {
    name: "해설 첫 줄이 순열을 안 따라간다(비교형)",
    why: "값 줄을 생성기 차례로 적는다 — ③ 자리에 다른 보기의 값이 선다",
    file: REGISTRY,
    find: '    `${body.briefLead.trim()} ${order.map((o, i) => `${CHOICE_MARKS[i]} ${o.brief.trim()}`).join(", ")}이다.`,\n    `${answer} ${order[at]!.work.trim()}이다.`,',
    to: '    `${body.briefLead.trim()} ${body.options.map((o, i) => `${CHOICE_MARKS[i]} ${o.brief.trim()}`).join(", ")}이다.`,\n    `${answer} ${order[at]!.work.trim()}이다.`,',
  },
  {
    name: "정답 풀이가 다른 보기의 것(비교형)",
    why: "둘째 줄에 정답 보기가 아니라 지면 첫 보기의 계산을 적는다",
    file: REGISTRY,
    find: "    `${answer} ${order[at]!.work.trim()}이다.`,",
    to: "    `${answer} ${order[0]!.work.trim()}이다.`,",
  },
  {
    name: "공통값 줄에 정답의 값을 적는다(4+1)",
    why: "«나머지 넷은 모두 …» 에 혼자 다른 값을 적는다",
    file: REGISTRY,
    find: "    ? `나머지 넷은 모두 ${order[at === 0 ? 1 : 0]!.brief.trim()}이다.`",
    to: "    ? `나머지 넷은 모두 ${order[at]!.brief.trim()}이다.`",
  },
  {
    name: "크기 순서를 거꾸로 적는다(극값)",
    why: "«크기를 비교하면 a<b<…» 를 큰 것부터 늘어놓는다 — 부등호가 거짓이 된다",
    file: REGISTRY,
    find: "        .sort((a, b) => compareFrac(a.v, b.v))",
    to: "        .sort((a, b) => compareFrac(b.v, a.v))",
  },
  {
    name: "정답 번호를 첫 자리로(비교형)",
    why: "다시 잰 자리와 상관없이 ① 을 정답으로 적는다",
    file: REGISTRY,
    find: "  const answer = CHOICE_MARKS[at]!;",
    to: "  const answer = CHOICE_MARKS[0]!;",
  },
  // ── 2단계 — 곱셈 · 나눗셈 · 거듭제곱 ───────────────────────────────────────────
  {
    name: "어댑터 인수 차례 틀림(나눗셈)",
    why: "원천 19 의 facts 로 식을 세울 때 나누어지는 수와 나누는 수를 바꾼다 — 어댑터의 되계산이 멈춰야 한다",
    file: MULDIV,
    find: '  div2Material(fq(f, "a"), fq(f, "b")),',
    to: '  div2Material(fq(f, "b"), fq(f, "a")),',
  },
  {
    name: "까닭과 값이 어긋남(나눗셈)",
    why: "«나누는 수를 역수로 바꾸지 않고 곱한 값»이라 적고 다른 값(나누어지는 수의 역수)을 찍는다",
    file: MULDIV,
    find: "      slip(mulQ(a, b), NO_RECIPROCAL),",
    to: "      slip(divQ(b, a), NO_RECIPROCAL),",
  },
  {
    name: "까닭과 값이 어긋남(거듭제곱)",
    why: "«분자만 거듭제곱한 값»이라 적고 분모까지 거듭제곱한 값의 두 배를 찍는다",
    file: MULDIV,
    find: "      slip(outer(mulQ(q(base1.n ** e1, base1.d), p2)), NUMERATOR_ONLY),",
    to: "      slip(outer(mulQ(q(2 * base1.n ** e1, base1.d ** e1), p2)), NUMERATOR_ONLY),",
  },
  {
    name: "음수인 밑이 없어도 «음수의 거듭제곱의 부호»",
    why: "밑이 모두 양수인 식에 그 까닭을 단다 — 까닭 문장이 그 식에 대해 거짓이다",
    file: MULDIV,
    find: "        base1.n < 0 || base2.n < 0\n          ? POWER_SIGN",
    to: "        base1.n < 0 || base2.n < 0 || true\n          ? POWER_SIGN",
  },
  {
    name: "양수뿐인 식에도 부호 반대",
    why: "음수가 하나도 없는 곱 · 몫의 결과를 음수로 적는다 — 계산 없이 지워지는 빈 보기",
    file: MULDIV,
    find: "const signRule = (...vs: Q[]) => (vs.some((v) => v.n < 0) ? SIGN_FLIP : null);",
    to: "const signRule = (...vs: Q[]) => (vs.length > 0 ? SIGN_FLIP : null);",
  },
  // ── 2단계 — 식의 값 ─────────────────────────────────────────────────────────
  {
    name: "생성기가 «괄호 없이 대입»을 참으로 안다",
    why: "$x^{2}$ 에 $x=-3$ 을 넣어 $-9$ 를 참값으로 낸다 — 등록부가 지면을 따로 재서 멈춰야 한다",
    file: FORMS,
    find: "  x: x0,\n  pow: (e) => powQ(x0, e),",
    to: "  x: x0,\n  pow: (e) => negQ(powQ(negQ(x0), e)),",
  },
  {
    name: "발문의 대입값과 보기가 어긋남",
    why: "발문에는 $x=-4$ 라 적고 보기는 $x=-3$ 으로 계산한다",
    file: VALUE,
    find: "export const whenText = (s: Substitution) => `$${s.letter}=${s.x0.n}$일 때, `;",
    to: "export const whenText = (s: Substitution) => `$${s.letter}=${s.x0.n - 1}$일 때, `;",
  },
  {
    name: "까닭과 값이 어긋남(식의 값)",
    why: "«부호를 빼고 대입한 값»이라 적고 다른 수(절댓값 + 1)를 넣어 계산한 값을 찍는다",
    file: FORMS,
    find: "const dropped = (x0: Q): Atoms => correct(absQ(x0));",
    to: "const dropped = (x0: Q): Atoms => correct(q(absQ(x0).n + 1));",
  },
  {
    name: "틀 상한을 푼다(식의 값)",
    why: "한 문항에 같은 틀(일차식 …)이 셋 이상 — 대입만 다섯 번인 문항",
    file: VALUE,
    find: "  maxPerTemplate: MAX_PER_TEMPLATE,",
    to: "  maxPerTemplate: 5,",
  },
  // ── 2단계 — 지면 계산기(등록부가 다시 재는 자) ──────────────────────────────────
  {
    name: "지면 계산기가 거듭제곱을 한 번만 곱한다",
    why: "다시 재는 쪽이 $a^{n}$ 을 $a$ 로 읽는다 — 생성기와 어긋나 멈추고, 계산기 시험이 운다",
    file: ARITH,
    find: "    for (let i = 0; i < Number(e.v); i += 1) out = mul(out, base);",
    to: "    for (let i = 0; i < 1; i += 1) out = mul(out, base);",
  },
  {
    name: "지면 계산기가 나눗셈을 곱셈으로 읽는다",
    why: "다시 재는 쪽이 역수를 안 취한다",
    file: ARITH,
    find: "        v = mul(v, { n: f.d, d: f.n });",
    to: "        v = mul(v, f);",
  },
  {
    name: "지면 계산기가 맨 앞 부호를 버린다",
    why: "다시 재는 쪽이 $-2^{2}$ 을 $4$ 로 읽는다",
    file: ARITH,
    find: '    if (sign === "-") v = neg(v);',
    to: '    if (sign === "~") v = neg(v);',
  },
  // ── 2단계 — 지면 관문(칸보다 넓은 식을 안 낸다) ─────────────────────────────────
  {
    name: "🔴 지면 관문을 끈다",
    why: "칸보다 넓은 식이 있어도 낸다 — 제품이 2열로 보내는 넓은 식이 문제지에서 접힌다(문항은 그대로 · 관문의 판정이 바뀐다)",
    file: REGISTRY,
    find: "  if (v.worst === -1) return;",
    to: "  if (v.worst !== 99) return;",
  },
  {
    name: "2열 칸을 실제보다 넓게 본다",
    why: "통합 시험지 2단의 2열 칸을 127.6px 가 아니라 227.6px 로 — 두 자리 수가 든 두 분수의 식이 통과한다",
    file: PAPER,
    find: "    roomPx: { 1: 307.2, 2: 127.6 },",
    to: "    roomPx: { 1: 307.2, 2: 227.6 },",
  },
  {
    name: "분수를 품은 큰 괄호를 작은 괄호 폭으로 센다",
    why: "제품의 자가 틀리는 바로 그 자리 — 식의 폭을 실제보다 좁게 계산한다(실측과 어긋난다)",
    file: PAPER,
    find: "          w: widthOf(inner) + 2 * (tall ? PAREN_TALL : PAREN),",
    to: "          w: widthOf(inner) + 2 * PAREN,",
  },
  {
    name: "열 수를 제품에 안 묻는다",
    why: "제품의 보기 배치 규칙을 부르지 않고 늘 1열이라 친다 — 2열로 가는 넓은 식을 못 본다",
    file: PAPER,
    find: '  const columns = choiceColumnCount("auto", choiceTexts);',
    to: "  const columns = 1;",
  },
  {
    name: "🔴 칸보다 넓은 식을 넣는다(비교형)",
    why: "비교형이 2열 칸보다 넓은 식(두 자리 수가 든 두 분수)을 보기로 받는다 — 등록부의 지면 관문이 멈춰야 한다",
    file: COMPARE,
    find: "    if (!fitsTwoColumnRoom(p.tex)) return false;",
    to: "    if (false) return false;",
  },
  {
    name: "접히는 묶음을 버리지 않는다(계산 판정)",
    why: "제품이 2열로 보내는데 식이 칸보다 넓은 묶음을 그대로 낸다",
    file: CALC,
    find: "      if (style.paper && !fitsPaper(b.options.map((o) => o.text))) {",
    to: "      if (false) {",
  },
  {
    name: "보류한 문항류를 등록부에 올린다",
    why: "지면에서 접히는 calc-pow 를 등록한다 — 적재 대상 · 미적재 빚이 조용히 늘어난다",
    file: DEFS,
    find: "  ...COMPARE_JUDGES,\n];",
    to: "  ...COMPARE_JUDGES,\n  HELD_CALC_POW,\n];",
  },
];

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

function digest() {
  const r = spawnSync("npx", ["tsx", "scripts/qa/judge-digest.ts"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) return `DIGEST-FAILED:${(r.stderr || "").slice(0, 200)}`;
  return r.stdout.trim();
}

function runTest() {
  const r = spawnSync("npx", ["vitest", "run", ...TESTS], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

const only = new Set(
  process.argv
    .slice(2)
    .filter((a) => /^\d+$/.test(a))
    .map(Number),
);

const dirty = sh("git", ["status", "--porcelain", "--", ...TARGETS]);
if (dirty !== "") {
  console.error("🛑 대상 파일에 커밋 안 된 수정이 있습니다 — 이 스크립트는 그 파일을 덮어씁니다.");
  console.error(dirty);
  process.exit(2);
}

const original = Object.fromEntries(TARGETS.map((f) => [f, readFileSync(f)]));
const restoreAll = () => {
  for (const f of TARGETS) writeFileSync(f, original[f]);
};

console.log("기준 상태를 잽니다…");
const baseDigest = digest();
if (baseDigest.startsWith("DIGEST-FAILED")) {
  console.error(`🛑 기준 산출물을 못 냈습니다: ${baseDigest}`);
  process.exit(2);
}
if (runTest() !== 0) {
  console.error("🛑 기준 시험이 이미 빨갛습니다 — 변이를 판정할 수 없습니다.");
  process.exit(2);
}
console.log(`기준 지문 ${baseDigest}\n기준 시험 초록\n`);

const results = [];
try {
  MUTATIONS.forEach((m, idx) => {
    const no = idx + 1;
    if (only.size > 0 && !only.has(no)) return;
    const src = original[m.file].toString("utf8");
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    const find = m.find.split("\n").join(eol);
    const to = m.to.split("\n").join(eol);
    const hits = src.split(find).length - 1;
    if (hits !== 1) {
      results.push({ no, name: m.name, verdict: `🛑 앵커 ${hits}개 — 판정 불가` });
      console.log(`🛑 [${no}] ${m.name}: 앵커가 ${hits}개입니다. 판정하지 않습니다.`);
      return;
    }
    // 🔴 바꿀 글을 함수로 넘긴다 — 문자열로 넘기면 `$\`` · `$&` 가 «앞부분 끼워 넣기»로 읽힌다(1단계 보고서 §9).
    writeFileSync(m.file, Buffer.from(src.replace(find, () => to), "utf8"));
    try {
      // ⑴ 파일이 바뀌었나
      if (readFileSync(m.file).equals(original[m.file])) {
        results.push({ no, name: m.name, verdict: "🛑 파일이 안 바뀜 — 판정 거부" });
        return;
      }
      // ⑵ 산출물이 바뀌었나
      const d = digest();
      if (d === baseDigest) {
        results.push({ no, name: m.name, verdict: "🛑 산출물이 그대로 — 판정 거부" });
        console.log(`🛑 [${no}] ${m.name}: 산출물이 그대로입니다. 판정 거부.`);
        return;
      }
      // ⑶ 시험이 빨개지나
      const verdict =
        runTest() !== 0 ? "🔴 빨강 (가드가 산다)" : "🟢 초록 ← 가드가 아니다";
      results.push({ no, name: m.name, verdict });
      console.log(`${verdict}  [${no}] ${m.name} — ${m.why}`);
    } finally {
      writeFileSync(m.file, original[m.file]);
    }
  });
} finally {
  restoreAll();
}

const same = TARGETS.every((f) => readFileSync(f).equals(original[f]));
console.log(`\n원복 확인: ${same ? "바이트 동일 ✓" : "🛑 다르다"}`);
console.log(`원복 후 git status: ${sh("git", ["status", "--porcelain", "--", ...TARGETS]) || "깨끗 ✓"}`);

const red = results.filter((r) => r.verdict.startsWith("🔴")).length;
console.log(`\n빨강 ${red} / 판정한 변이 ${results.length}`);
for (const r of results) console.log(`  ${r.verdict}  [${r.no}] ${r.name}`);
process.exit(results.every((r) => r.verdict.startsWith("🔴")) ? 0 : 1);
