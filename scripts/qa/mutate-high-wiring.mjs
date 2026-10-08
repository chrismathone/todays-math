/**
 * 고등 배선(적재기 · 열쇠 · 미적재 검사 · 제자리 갱신 · 출처 판정)과 적재 전 관문의 변이 시험 —
 * **가드는 망가뜨려 봐야 가드인 줄 안다** (2026-10-08 엔진 보강 ③-0).
 *
 * 판정은 세 단계다(20번 문서 2026-08-20·21):
 *   ⑴ 파일이 정말 바뀌었나        — 안 바뀌면 판정하지 않는다
 *   ⑵ **산출물이 정말 바뀌었나**  — 안 바뀌면 «뜻이 안 바뀐 변이»다. 판정 거부(`high-wiring-digest.ts`)
 *   ⑶ 그제서야 시험이 빨개지나
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**다(`git show HEAD:` 로 짜면 미커밋 수정을 먹는다 — 2026-08-23).
 * 그래서 대상 파일에 미커밋 수정이 있으면 아무것도 안 하고 멈춘다.
 *
 * 시험은 변이마다 **그 자리를 지키는 파일만** 돌린다 — 관문의 살아 있는 등록부 훑기(㉢)는 한 번에 40초라
 * 서른 번 돌리면 판정이 아니라 기다림이 된다. 관문 · 값 읽개 변이는 눈금 시험(㉠㉡)만 본다.
 *
 *   node scripts/qa/mutate-high-wiring.mjs            # 전부
 *   node scripts/qa/mutate-high-wiring.mjs 3 7 12     # 번호만
 *   node scripts/qa/mutate-high-wiring.mjs --anchors  # 앵커가 하나씩 있는지만 본다(아무것도 안 바꾼다)
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const LOADER = "scripts/import/load-engine-problems.ts";
const KEYS = "src/lib/high/loadKey.ts";
const UNLOADED = "scripts/qa/checkUnloadedTypes.ts";
const REFRESH = "scripts/qa/refresh-engine-content.ts";
const PROVENANCE = "src/lib/problem/provenance.ts";
const GATE = "scripts/qa/highLoadGate.ts";
const VALUE = "scripts/qa/highChoiceValue.ts";
const NUMBERS = "src/lib/high/numbers.ts";
const FACTOR = "src/lib/high/h1Factor.ts";
const IDENTITY = "src/lib/high/h1Identity.ts";
const QUADFUNC = "src/lib/high/h1QuadFunc.ts";
const TARGETS = [
  LOADER,
  KEYS,
  UNLOADED,
  REFRESH,
  PROVENANCE,
  GATE,
  VALUE,
  NUMBERS,
  FACTOR,
  IDENTITY,
  QUADFUNC,
];

const T_WIRING = ["src/__tests__/unit/loadHighRows.test.ts"];
const T_PROVENANCE = [
  "src/__tests__/unit/loadHighRows.test.ts",
  "src/__tests__/unit/problemProvenance.test.ts",
];
const T_GATE = ["src/__tests__/unit/highLoadGate.test.ts"];
/** 관문 시험 가운데 눈금(㉠㉡ · 적재기 연결 · 탐침 표)만 — 살아 있는 등록부 훑기(㉢)는 뺀다. */
const GATE_SCALE = "눈금|값 읽개|적재기 연결|탐침 표";

/** @type {{name:string, why:string, file:string, find:string, to:string, tests:string[], filter?:string}[]} */
const MUTATIONS = [
  // ── 열쇠 ──
  {
    name: "열쇠 읽기가 유형 키 모양을 안 본다",
    why: "꼬리를 두 번 단 열쇠 · 토막 수가 다른 몸통을 고등 유형으로 읽는다",
    file: KEYS,
    find: "  if (highTypeKeyFault(typeKey) !== null) return null;",
    to: "  if (false) return null;",
    tests: T_WIRING,
  },
  {
    name: "열쇠 짓기가 유형 키 모양을 안 본다",
    why: "꼬리(|s…|v…)를 흉내 내는 키로 열쇠를 지어 준다",
    file: KEYS,
    find: "  if (fault)\n    throw new Error(\n      `고등 유형 키가 열쇠 모양이 아니다",
    to: "  if (false)\n    throw new Error(\n      `고등 유형 키가 열쇠 모양이 아니다",
    tests: T_WIRING,
  },
  {
    name: "문항류 접두사를 mid: 로",
    why: "고등 문항류가 중등 문항류와 같은 표지를 쓴다 — 미적재 · 되돌리기가 서로를 읽는다",
    file: KEYS,
    find: 'export const HIGH_FAMILY_PREFIX = "high:";',
    to: 'export const HIGH_FAMILY_PREFIX = "mid:";',
    tests: T_WIRING,
  },
  // ── 적재기 ──
  {
    name: "고등 target 을 중등으로 흘린다",
    why: "분기 함수의 고등 갈래가 중등 행 생성으로 간다",
    file: LOADER,
    find: "      return buildHighRows(t, seedBase, deps.highs);",
    to: "      return buildMiddleRows(t as never, seedBase);",
    tests: T_WIRING,
  },
  {
    name: "모르는 target 을 중등으로 흘린다",
    why: "engine 이 없는 · 모르는 target 을 던지지 않고 중등 유형으로 읽는다(종전 동작)",
    file: LOADER,
    find: "    default: {\n      const unknown: never = t;",
    to: "    default: {\n      return buildMiddleRows(t as never, seedBase);\n      const unknown: never = t;",
    tests: T_WIRING,
  },
  {
    name: "등록부 주입을 버린다",
    why: "분기 함수가 받은 고등 등록부를 안 넘긴다 — 시험이 넣은 픽스처가 살아 있는 등록부로 바뀐다",
    file: LOADER,
    find: "      return buildHighRows(t, seedBase, deps.highs);",
    to: "      return buildHighRows(t, seedBase);",
    tests: T_WIRING,
  },
  {
    name: "생성기 오답을 안 넘긴다",
    why: "식 정답의 객관식이 공용 수 오답 경로로 간다(정답 속 첫 수를 흔든다)",
    file: LOADER,
    find:
      "      const p = registry.generate(entry.key, seedBase, v);\n      return {\n        content: p.content,\n        answer: p.answer,\n        solution: p.solution,\n        ...(p.distractors === undefined ? {} : { distractors: p.distractors }),",
    to: "      const p = registry.generate(entry.key, seedBase, v);\n      return {\n        content: p.content,\n        answer: p.answer,\n        solution: p.solution,",
    tests: T_WIRING,
  },
  {
    name: "다른 차시의 키를 조용히 뺀다",
    why: "keys 에 그 차시 유형이 아닌 것이 섞여도 던지지 않는다 — «전부 넣었다»로 읽힌다",
    file: LOADER,
    find: "  if (want && types.length !== want.size)",
    to: "  if (false)",
    tests: T_WIRING,
  },
  {
    name: "되돌리기가 고등 접두사를 모른다",
    why: "고등 원장의 행을 «우리 것이 아닌 행»으로 읽어 되돌리기가 멈춘다",
    file: LOADER,
    find: "    /^engine-(?:elem|mid|mid-combo|mid-judge):/.test(externalId) ||\n    externalId.startsWith(HIGH_EXTERNAL_PREFIX)",
    to: "    /^engine-(?:elem|mid|mid-combo|mid-judge):/.test(externalId) ||\n    false",
    tests: T_WIRING,
  },
  {
    name: "단원 둘에 걸려도 안 짚는다",
    why: "같은 과목에 같은 이름의 차시가 둘이어도 통과 — 문항이 다른 대단원에 붙는다",
    file: LOADER,
    find: "    if ((count.get(k) ?? 0) > 1) out.add(k);",
    to: "    if ((count.get(k) ?? 0) > 2) out.add(k);",
    tests: T_WIRING,
  },
  {
    name: "관문에 걸려도 적재기가 안 막는다",
    why: "막힌 것이 있어도 blocked 가 거짓 — 드라이런이 «넣을 것 N»까지 간다",
    file: LOADER,
    find: "  return { lines, blocked: gate.hits.length > 0 };",
    to: "  return { lines, blocked: false };",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "적재기가 고등 행에 관문을 안 돌린다",
    why: "고등 행이 있어도 판결이 없다(null)",
    file: LOADER,
    find: "  if (highRows.length === 0) return null;",
    to: "  if (highRows.length >= 0) return null;",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "못 읽은 보기를 적재기가 안 찍는다",
    why: "값으로 못 읽은 보기가 있어도 줄이 없다 — 조용히 넘어간다",
    file: LOADER,
    find: "  if (gate.unread.length > 0) {\n    lines.push(",
    to: "  if (false) {\n    lines.push(",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  // ── 미적재 검사 ──
  {
    name: "고등 유형을 포함으로 댄다",
    why: "확장 번호 03A 만 실려도 본 번호 03 이 «나갔다» — 비슷한 키의 거짓 적재",
    file: UNLOADED,
    find: "    if (!keys.has(h.key))",
    to: "    if (![...fragments].some((f) => f.includes(h.key)))",
    tests: T_WIRING,
  },
  {
    name: "한 함수가 고등을 안 센다",
    why: "스크립트가 부르는 unloadedAll 에서 고등 등록부가 빠진다 — 구조적으로 0",
    file: UNLOADED,
    find: "    ...unloadedHigh(fragments, registries.highs),",
    to: "",
    tests: T_WIRING,
  },
  // ── 제자리 갱신 ──
  {
    name: "제자리 갱신이 등록부 주입을 버린다",
    why: "되만들 때 받은 등록부를 분기 함수에 안 넘긴다",
    file: REFRESH,
    find: "        rows = buildTargetRows(t as PlanTarget, seedBase, deps);",
    to: "        rows = buildTargetRows(t as PlanTarget, seedBase);",
    tests: T_WIRING,
  },
  // ── 출처 판정 ──
  {
    name: "출처 판정에서 high: 를 뺀다",
    why: "고등 엔진 문항이 [?] 미분류로 떨어지고 형식 판정에서도 엔진으로 안 읽힌다",
    file: PROVENANCE,
    find: '  ["high:", "middle_engine"],\n',
    to: "",
    tests: T_PROVENANCE,
  },
  // ── 관문 ──
  {
    name: "관문이 KaTeX 오류를 안 본다",
    why: "없는 명령(\\pmi) · 깨진 중괄호가 든 행이 통과한다",
    file: GATE,
    find: '      for (const f of renderFaults(text))\n        hit(r, "렌더", "KaTeX", `${where}: ${f}`);',
    to: "",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "`$` 짝을 안 센다",
    why: "달러가 홀수인 글이 통과한다",
    file: GATE,
    find: "  if ((text.match(/(?<!\\\\)\\$/g) ?? []).length % 2 === 1)",
    to: "  if ((text.match(/(?<!\\\\)\\$/g) ?? []).length % 2 === 3)",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "죽은 역슬래시를 안 본다",
    why: "역슬래시가 떨어진 명령(angle · circ)이 든 행이 통과한다",
    file: GATE,
    find: "      if (dead.length > 0)",
    to: "      if (false)",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "보기를 글자로만 견준다",
    why: "값이 같은 보기(인수의 차례 · 약분 전 분수 · 뒤집은 부등식)가 통과한다",
    file: GATE,
    find: "                : sameChoice(choices[i]!, choices[j]!);",
    to: "                : false;",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "정답 번호와 단답 정답을 안 맞댄다",
    why: "보기 순열과 정답 번호가 어긋난 객관식이 통과한다",
    file: GATE,
    find: "          if (short && squash(choices[at]!) !== squash(short.answer))",
    to: "          if (false)",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "정답이 번호 하나인지 안 본다",
    why: "정답 칸에 번호 둘이 든 객관식이 통과한다",
    file: GATE,
    find: "        if (r.answer.trim().length !== 1 || at < 0) {",
    to: "        if (at < -1) {",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "식 답이 발문에 있어도 통과",
    why: "주어진 나머지가 곧 답인 판이 통과한다",
    file: GATE,
    find: "      if (shown !== null)",
    to: "      if (false)",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "단위 붙은 수량 누출을 안 본다",
    why: "답 «80바퀴»가 발문에 그대로인 판이 통과한다",
    file: GATE,
    find: "        if (f.rule === LEAK_RULE)\n",
    to: "        if (false)\n",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "시드에 없는 차시를 통과",
    why: "띄어쓰기가 다른 차시 이름이 통과한다 — 단원 연결에서 조용히 빠진다",
    file: GATE,
    find: "      if (n === 0)",
    to: "      if (n < 0)",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "단원 둘에 걸린 차시를 통과",
    why: "같은 이름의 차시가 둘이어도 통과한다",
    file: GATE,
    find: "      else if (n > 1)",
    to: "      else if (n > 2)",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "모르는 난이도 칸을 통과",
    why: "여섯 칸 밖의 값(최상)이 든 행이 통과한다",
    file: GATE,
    find: "    if (!TIERS.includes(r.difficulty))",
    to: "    if (false)",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "못 읽은 보기를 안 센다",
    why: "값으로 못 읽은 보기가 있어도 unread 가 비어 «0 = 깨끗»으로 읽힌다",
    file: GATE,
    find: "        if (unreadHere) {",
    to: "        if (false) {",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "맨 수 겹침을 안 센다",
    why: "맨 수 답이 발문에 그대로인 변형의 수가 늘 0 — 비율 관문이 눈이 먼다",
    file: GATE,
    find: "        if (bareShown) cur.shown += 1;",
    to: "",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  // ── 값 읽개 ──
  {
    name: "부등식의 음수배를 같은 조건으로",
    why: "x<3 과 x>3 이 같은 보기로 읽힌다",
    file: VALUE,
    find: '  const positive = a.op === "<" || a.op === "<=";',
    to: "  const positive = false;",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "관계 기호를 안 가른다",
    why: "x<3 과 x≤3 이 같은 보기로 읽힌다",
    file: VALUE,
    find: "  if (a.op !== b.op) return false;",
    to: "  if (false) return false;",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "행렬의 모양을 안 본다",
    why: "열 수는 같고 행 수만 다른 행렬(1×2 · 2×2)이 앞의 칸이 같으면 같은 행렬로 읽힌다",
    file: VALUE,
    find: "      a.rows === b.rows &&",
    to: "      true &&",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "± 를 + 로만 읽는다",
    why: "1±√2 와 1+√2 가 같은 보기로 읽힌다",
    file: VALUE,
    find: '          else if (n.t === "pm") out.push(add(a, b), sub(a, b));',
    to: '          else if (n.t === "pm") out.push(add(a, b));',
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "허수 단위를 문자로 읽는다",
    why: "i² 가 -1 이 아니다 — 켤레 · 거듭제곱 보기를 값으로 못 견준다",
    file: VALUE,
    find: '      return [n.name === "i" ? cx(0, 1) : cx(sampleOf(n.name, k))];',
    to: "      return [cx(sampleOf(n.name, k))];",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  {
    name: "못 읽는 꼴을 «다르다»로",
    why: "읽지 못한 보기가 전부 통과가 된다(«못 읽음»이 사라진다)",
    file: VALUE,
    find: "  } catch {\n    return null;\n  }\n}",
    to: "  } catch {\n    return false;\n  }\n}",
    tests: T_GATE,
    filter: GATE_SCALE,
  },
  // ── 생성기 — 관문이 처음 찾아 고친 다섯 자리를 되돌린다 ──
  {
    name: "수리 되돌림: ± 뒤 글자를 붙여 쓴다",
    why: "x=\\pmi — 없는 명령이 해설에 나간다",
    file: NUMBERS,
    find: '  const pm = /^[A-Za-z]/.test(body) ? "\\\\pm " : "\\\\pm";',
    to: '  const pm = "\\\\pm";',
    tests: ["src/__tests__/unit/highNumbers.test.ts"],
  },
  {
    name: "수리 되돌림: 인수분해 04 의 같은 값 오답",
    why: "r=-p 인 판에서 오답 둘이 인수의 차례만 다른 같은 식",
    file: FACTOR,
    find: "        p + r === 0 ? `${F(p, q)}${F(r, -s)}` : `${F(-p, q)}${F(-r, s)}`,",
    to: "        `${F(-p, q)}${F(-r, s)}`,",
    tests: ["src/__tests__/unit/highFactor.test.ts"],
  },
  {
    name: "수리 되돌림: 항등식 07 꼴 0 — 근에서의 값",
    why: "R(t) 를 묻는 점이 나누는 일차식의 근 — 답이 주어진 나머지 그대로",
    file: IDENTITY,
    find: "      if (t === u || t === v) return null;\n",
    to: "",
    tests: ["src/__tests__/unit/highIdentity.test.ts"],
  },
  {
    name: "수리 되돌림: 항등식 07 꼴 1 — 주어진 나머지가 답",
    why: "주어진 나머지의 기울기가 답과 같으면 그 나머지가 곧 답",
    file: IDENTITY,
    find: "    if (al === m || gm === m) return null;\n",
    to: "",
    tests: ["src/__tests__/unit/highIdentity.test.ts"],
  },
  {
    name: "수리 되돌림: 항등식 08 꼴 0 — 근에서의 값",
    why: "R(w) 를 묻는 점이 나누는 일차식의 근",
    file: IDENTITY,
    find: "      if (w === t) return null;\n",
    to: "",
    tests: ["src/__tests__/unit/highIdentity.test.ts"],
  },
  {
    name: "수리 되돌림: 이차함수 08 꼴 1 — 극값이 k 그대로",
    why: "g=0 이면 «최솟값이 4일 때 k» 의 답이 4",
    file: QUADFUNC,
    find: "35판 가운데 4판). 그런 판은 다시 뽑는다.\n      if (g === 0) return null;\n",
    to: "35판 가운데 4판). 그런 판은 다시 뽑는다.\n",
    tests: ["src/__tests__/unit/highQuadFunc.test.ts"],
  },
];

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

// 🔴 `npx` 를 셸로 부르지 않는다 — Windows 에서 무늬의 `|` 가 셸을 두 번 지나며 파이프로 읽힌다.
//    진입 파일을 node 로 바로 부르면 인자가 글자 그대로 간다.
const TSX = "node_modules/tsx/dist/cli.mjs";
const VITEST = "node_modules/vitest/vitest.mjs";

/** 지문 — 생성이 던지면 지문에 사유가 들어가고(달라진 산출물), 스크립트가 못 뜨면(문법 오류) 그것도 «달라졌다»다. */
function digest() {
  const r = spawnSync(process.execPath, [TSX, "scripts/qa/high-wiring-digest.ts"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0)
    return `DIGEST-FAILED:${(r.stderr || r.stdout || "").trim().split("\n").slice(-3).join(" / ").slice(0, 300)}`;
  return r.stdout.trim().split("\n").pop();
}

function runTest(tests, filter) {
  const args = [VITEST, "run", ...tests];
  if (filter) args.push("-t", filter);
  const r = spawnSync(process.execPath, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** 돌아간 시험 수 — 무늬가 아무것도 안 고르면 «초록»이 아니라 «안 돌았다»다. */
function ranCount(out) {
  const m = /Tests\s+(?:(\d+) failed[^\d]*)?(?:(\d+) passed)?/.exec(out);
  return m ? Number(m[1] ?? 0) + Number(m[2] ?? 0) : 0;
}

const anchorsOnly = process.argv.includes("--anchors");
const only = new Set(
  process.argv
    .slice(2)
    .filter((a) => /^\d+$/.test(a))
    .map(Number),
);

const original = Object.fromEntries(TARGETS.map((f) => [f, readFileSync(f)]));

/** 변이 하나의 앵커를 그 파일의 줄끝에 맞춰 센다. */
function locate(m) {
  const src = original[m.file].toString("utf8");
  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const find = m.find.split("\n").join(eol);
  const to = m.to.split("\n").join(eol);
  return { src, find, to, hits: src.split(find).length - 1 };
}

if (anchorsOnly) {
  let bad = 0;
  MUTATIONS.forEach((m, idx) => {
    const { hits } = locate(m);
    if (hits !== 1) bad += 1;
    console.log(`${hits === 1 ? "✓" : "🛑"} [${idx + 1}] 앵커 ${hits}개 — ${m.name} (${m.file})`);
  });
  process.exit(bad === 0 ? 0 : 1);
}

const dirty = sh("git", ["status", "--porcelain", "--", ...TARGETS]);
if (dirty !== "") {
  console.error("🛑 대상 파일에 커밋 안 된 수정이 있습니다 — 이 스크립트는 그 파일을 덮어씁니다.");
  console.error(dirty);
  process.exit(2);
}

const restoreAll = () => {
  for (const f of TARGETS) writeFileSync(f, original[f]);
};

console.log("기준 상태를 잽니다…");
const baseDigest = digest();
if (baseDigest.startsWith("DIGEST-FAILED")) {
  console.error(`🛑 기준 산출물을 못 냈습니다: ${baseDigest}`);
  process.exit(2);
}
/** 기준 시험 — (파일 묶음 · 무늬)마다 한 번. 빨갛거나 한 건도 안 돌면 그 묶음의 변이는 판정할 수 없다. */
const baseOk = new Map();
for (const m of MUTATIONS) {
  const key = `${m.tests.join(",")}::${m.filter ?? ""}`;
  if (baseOk.has(key)) continue;
  const r = runTest(m.tests, m.filter);
  const ran = ranCount(r.out);
  baseOk.set(key, r.status === 0 && ran > 0);
  console.log(
    `기준 시험 ${r.status === 0 && ran > 0 ? "초록" : "🛑 빨강/안 돎"} (${ran}건) — ${m.tests.join(" ")}${m.filter ? ` -t "${m.filter}"` : ""}`,
  );
}
if ([...baseOk.values()].some((ok) => !ok)) {
  console.error("🛑 기준 시험이 이미 빨갛거나 한 건도 안 돌았습니다 — 변이를 판정할 수 없습니다.");
  process.exit(2);
}
console.log(`기준 지문 ${baseDigest}\n`);

const results = [];
try {
  MUTATIONS.forEach((m, idx) => {
    const no = idx + 1;
    if (only.size > 0 && !only.has(no)) return;
    const { src, find, to, hits } = locate(m);
    if (hits !== 1) {
      results.push({ no, name: m.name, verdict: `🛑 앵커 ${hits}개 — 판정 불가` });
      console.log(`🛑 [${no}] ${m.name}: 앵커가 ${hits}개입니다. 판정하지 않습니다.`);
      return;
    }
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
      const r = runTest(m.tests, m.filter);
      const verdict =
        r.status !== 0 ? "🔴 빨강 (가드가 산다)" : "🟢 초록 ← 가드가 아니다";
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
