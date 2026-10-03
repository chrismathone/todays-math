/**
 * «개념을 묻는다» 검산 — 소단원 하나의 고친 문항을 codex(구독 CLI)에게 보내 «여전히 계산형인가 · 수학이 틀렸는가 · 되풀이인가»를 가리게 한다.
 * 원장님 2026-10-03 «코덱스와 적절히 협업해» — 쓰는 쪽(Claude 작업자)과 가리는 쪽(codex)을 다른 모델로 둔다. 기준은 합의문 §3.
 *
 * 실행(저장소 뿌리):
 *   npx tsx scripts/qa/concept-blank/havruta/review.ts --part e3 --section "초3::1-4 곱셈::1-4-3 …"
 *   … --dry            # 요청서만 만들고 보내지 않는다(크기를 볼 때)
 *   … --with grok      # codex 대신(또는 `--with codex --with grok` 로 같이) — grok 은 한 건에 10분 넘게 걸린다
 * 요청서와 답은 저장소 **밖** `D:\tmp\concept-blank-havruta\review\<part>\<소단원>.{md,-codex.md}` 에 떨어진다(`HAVRUTA_OUT` 으로 바꾼다).
 * 줄을 세운 시점의 글은 `D:\tmp\concept-blank-havruta\bank-763caff59.json`(`seed.ts --dump` · `HAVRUTA_BASELINE` 으로 바꾼다).
 * 🔴 답은 지적일 뿐이다 — 은행에 대어 가린다(반례는 직접 계산해 본다). 유료 API 가 아니라 로그인된 구독 CLI 를 부른다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONCEPT_BLANK_BANK } from "../../../../src/lib/concept-blank/bank";
import { runCli } from "../../english-bench/cli";
import { readHavruta } from "./ledger";

const args = process.argv.slice(2);
const all = (name: string) =>
  args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]!] : []));
const part = all("--part")[0];
const section = all("--section")[0];
if (!part || !section)
  throw new Error("--part <학년> 과 --section <소단원 열쇠> 를 준다");
const ledger = readHavruta(part);
if (!ledger) throw new Error(`원장이 없다: ${part}`);
const OUT = process.env.HAVRUTA_OUT ?? "D:/tmp/concept-blank-havruta/review";
const BASELINE =
  process.env.HAVRUTA_BASELINE ??
  "D:/tmp/concept-blank-havruta/bank-763caff59.json";
if (!existsSync(BASELINE))
  throw new Error(
    `줄을 세운 시점의 은행이 없다: ${BASELINE} — seed.ts --dump 로 떨군다`,
  );

type Dumped = Record<string, unknown> & { type: string };
const before = JSON.parse(readFileSync(BASELINE, "utf8")) as Record<
  string,
  Dumped
>;
const bank = CONCEPT_BLANK_BANK;
type Row = {
  id: string;
  type: "concepts" | "ox" | "apply";
  level: string;
  text: string;
};
const LABEL = { concepts: "개념", ox: "○×", apply: "적용" } as const;
const textOf = (type: string, x: Record<string, unknown>): string => {
  if (type === "concepts") {
    const ex = x.example as { prompt: string; answer: string } | undefined;
    return `용어: ${x.term} | 뜻: ${x.definition}${ex ? ` | 예: ${ex.prompt} → ${ex.answer}` : ""}${x.givenCase ? " [사례]" : ""}`;
  }
  if (type === "ox")
    return `${x.statement} [${x.answer ? "○" : "×"}] 까닭: ${x.why}`;
  return `${x.prompt} → ${x.answer}`;
};
const now: Row[] = (["concepts", "ox", "apply"] as const).flatMap((type) =>
  bank[type]
    .filter((x) => x.section === section)
    .map((x) => ({
      id: x.id,
      type,
      level: x.level,
      text: textOf(type, x as unknown as Record<string, unknown>),
    })),
);
if (!now.length) throw new Error(`그 소단원에 문항이 없다: ${section}`);

const changed: string[] = [];
const kept: string[] = [];
for (const row of now) {
  const old = before[row.id];
  const was = old ? textOf(old.type, old) : null;
  const head = `${row.id} [${LABEL[row.type]} ${row.level}]`;
  // 요청서가 25KB 를 넘으면 답이 느려지고 시간을 넘긴다 — 고치기 전 글은 싣지 않는다(검토자가 볼 것은 지금 글이다).
  if (was !== null && was !== row.text) changed.push(`- ${head} ${row.text}`);
  else kept.push(`- ${head} ${row.text}`);
}
const alive = new Set(now.map((r) => r.id));
const gone = ledger.rows
  .filter((r) => r.at.section === section && !alive.has(r.id))
  .map((r) => {
    const old = before[r.id];
    const was = old ? textOf(old.type, old) : "";
    return `- ${r.id} [${LABEL[r.at.type]} ${r.at.level}] ${was.length > 110 ? `${was.slice(0, 110)}…` : was} — 뺀 까닭: ${r.gone ?? "(안 적음)"}`;
  });

const brief = `# 검산 요청 — «개념 백지» 한 소단원의 고친 문항

너는 한국 초 · 중학교 수학 교육과정과 교과서를 잘 아는 독립 검토자다. 도구는 쓰지 않는다. 우리 쪽 눈치를 보지 말고, 틀렸으면 틀렸다고 말하라.

## 배경

«개념 백지»는 학원에서 **하브루타**(학생이 개념을 제 말로 설명하고 짝 · 교사가 되묻는다) 수업에 쓰는 A4 시험지다. 원장의 기준: «개념에 관한 백지 테스트여야 한다 · 직접 설명하게 하는 것».
계산을 할 수 있는지는 다른 시험이 본다. 은행의 칸은 셋이다.
- **개념**: 용어 | 뜻 문장(핵심어는 \`{ }\` — 채점은 굵은 부분의 뜻 기준) | 선택 «예»(물음 → 답). 지면 넷에 쓰인다 — A 소단원 이름만 보고 떠올려 쓰기 · B 용어만 보고 뜻 쓰기 · C 뜻 문장의 빈칸 채우기 · D 용어와 **예 물음만** 보고 뜻과 예 쓰기.
- **○×**: 학생은 ○ / × 에 표시하고 **까닭을 쓴다**. 표시와 까닭이 둘 다 맞아야 정답이다.
- **적용**: «방금 쓴 뜻으로 답하고, 까닭을 쓰시오» 칸. 채점은 «결론과 까닭이 다 있어야 ○ — 말이 달라도 뜻이 같으면 된다».

아래 소단원의 계산형 문항을 작업자가 개념을 묻는 물음으로 다시 썼다. 글자 상한: 용어 40 · 뜻 160 · ○× 문장과 까닭 120 · 적용 물음 120 · 답 80 · 예 물음 80 · 예 답 60(수식은 \`$…$\`).
🔴 **예의 답은 짧은 구다** — D 지면은 예 물음 뒤에 빈칸 하나만 주고 그 빈칸에는 한글 열다섯 자쯤(수식은 그려지는 폭)만 들어간다. 예의 답을 문장으로 늘리라고 하지 마라. 열다섯 자를 넘는 예의 답은 ㉲ 로 적어라.

## 판정 기준

1. 학생이 내야 하는 답과 채점 기준을 같이 본다. **계산값 · ○× 표시 · 외운 절차만으로 정답이 다 채워지면 계산형**이다. 까닭이 최종 값이나 자릿수를 확인하는 데 그쳐도 계산형이다.
2. 수가 나온다고 계산형이 아니다 — 뜻 · 조건 · 관계 · 표현의 근거가 답의 필수 요소면 개념형이다(자리 곱이 어느 묶음인지 말하는 답은 계산형이 아니다). **예만 계산형인 카드도 계산형**이다.
3. 보편 진술(«언제나 · 반드시 · …이면»)은 이 소단원까지 배운 수의 범위에서 **반례**를 찾는다. 반례 후보: $0$ · $1$ · 올림(받아올림 · 받아내림)이 두 자리에서 같이 있는 경우 · 식은 다른데 값이 같은 경우 · 경계값 · 음수(중학). 한쪽만 참인 문장을 필요충분처럼 썼으면 오류다.
4. 까닭이 거짓이거나, 참이어도 그 문장 · 결론을 받치지 못하면 오류다.
5. 같은 소단원에서 **결론과 근거가 같고 수만 다르면** 되풀이다. 칸을 건너 같은 개념을 다루는 것은 되지만 같은 장면 · 주장 · 근거를 그대로 옮긴 것은 되풀이다. 이 소단원까지 안 배운 말 · 개념이 알맹이면 범위 밖이다(불확실하면 «확인 필요»).

## 할 일

**«다시 쓴 문항»과 «그대로 둔 문항»을 문항마다 읽고**, 아래에 해당하는 것만 적어라(해당 없으면 적지 않는다 — 칭찬 · 요약은 쓰지 않는다):

\`- <id> · <갈래> · 무엇이 문제인가(반례 · 계산을 한 줄로) · 고칠 글\`

갈래: ㉮ 수학이 틀렸다(보편 진술의 반례 · 까닭이 결론을 못 받침) ㉯ 범위 밖 ㉰ 여전히 계산형(예 포함) ㉱ 되풀이(어느 문항과 — id) ㉲ 물음 · 답이 모호해 채점이 갈린다 ㉳ 뺀 것이 아깝다(쓸 개념이 있었다 — 무엇인지) / 살린 것이 억지다.
**«그대로 둔 문항»의 개념 카드에 달린 예가 뜻을 사례에 대어 보는 짧은 물음(«$13$의 약수를 모두 쓰면?»)인 것은 적지 마라** — 이번 일의 범위가 아니다(지도 지면의 «예»는 뜻을 쓴 뒤 드는 사례다). «그대로 둔 문항»에서는 ㉮ · 조건 누락 · 다시 쓴 문항과의 ㉱ 만 적는다. «다시 쓴 문항»의 예는 기준 2 그대로 본다.
«고칠 글»은 우리 칸의 꼴 그대로, 글자 상한 안에서 쓴다. 문제가 없는 문항을 다듬으려 하지 마라. 마지막 줄에 \`읽은 문항 n · 지적 m\` 을 적어라.

## 소단원

${section}

### 다시 쓴 문항 (${changed.length})

${changed.join("\n") || "(없음)"}

### 그대로 둔 문항 (${kept.length})

${kept.join("\n") || "(없음)"}

### 뺀 문항 (${gone.length})

${gone.join("\n") || "(없음)"}
`;

const slug = section
  .split("::")
  .slice(1)
  .join(" ")
  .replace(/[\\/:*?"<>|]/g, "")
  .replace(/\s+/g, "-")
  .slice(0, 60);
const dir = path.join(OUT, part);
mkdirSync(dir, { recursive: true });
const briefPath = path.join(dir, `${slug}.md`);
writeFileSync(briefPath, brief);
console.log(
  `요청서 ${briefPath} — ${Buffer.byteLength(brief)}바이트 · 고친 ${changed.length} · 그대로 ${kept.length} · 뺀 ${gone.length}`,
);
if (args.includes("--dry")) process.exit(0);

const CALLS = {
  codex: { provider: "codex" as const, model: "gpt-6-astra", effort: "high" },
  grok: { provider: "grok" as const, model: "grok-4.7", effort: "high" },
};
const names = all("--with").length ? all("--with") : ["codex"];
const cwd = path.join(os.tmpdir(), "consult-cb-havruta");
mkdirSync(cwd, { recursive: true });
const system =
  "너는 요청받은 안건에 대해 근거를 들어 답하는 독립 검토자다. 도구를 쓰지 말고, 파일을 만들거나 고치지 말고, 답만 한국어 마크다운으로 써라.";

void (async () => {
  await Promise.all(
    names.map(async (name) => {
      const call = CALLS[name as keyof typeof CALLS];
      if (!call) throw new Error(`모르는 검토자: ${name}`);
      const out = path.join(dir, `${slug}-${name}.md`);
      try {
        const r = await runCli({
          ...call,
          system,
          prompt: brief,
          cwd,
          timeoutMs: 25 * 60_000,
        });
        writeFileSync(out, `${r.text.trim()}\n`);
        console.log(`${name}: ${Math.round(r.ms / 1000)}초 → ${out}`);
      } catch (e) {
        console.log(
          `${name}: 실패 — ${String((e as Error).message)} ${String((e as { detail?: string }).detail ?? "").slice(0, 400)}`,
        );
        process.exitCode = 1;
      }
    }),
  );
})();
