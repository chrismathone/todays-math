/**
 * **엔진에 있는데 지면에 한 줄도 안 나가는 유형이 있는가** — 공유 DB(D-31)를 읽어서 본다.
 *
 *   npx tsx scripts/qa/checkUnloadedTypes.ts            # 검사 (원장보다 늘면 빨강)
 *   npx tsx scripts/qa/checkUnloadedTypes.ts --list     # 지금 안 나가는 것 전량
 *   npx tsx scripts/qa/checkUnloadedTypes.ts --write    # 원장을 지금 상태로 다시 쓴다
 *
 * ## 이 결함은 **스스로 신고하지 않는다**
 *
 * 유형을 엔진에 더하고 시험까지 초록으로 만들어도, **적재를 안 하면 지면에는 한 줄도
 * 안 나간다.** 에러도 경고도 없다 — 그냥 그 유형이 시험지에 안 뽑힌다. tsc·vitest·
 * 판정기 전부가 초록이다. 이 저장소가 되풀이해 데인 자리인데(2026-08-27 · 08-30
 * 「엔진을 고친 것과 적재본을 고친 것은 다른 일이다」) **세는 자가 없었다.**
 *
 * 2026-08-31 중3 조사가 실물로 짚었다 — 등록 유형 1,376 중 **22개**가 적재본에 한
 * 조각도 없고, **결합형 6개는 `registeredTypes()` 에조차 없어** 적재기가 구조적으로
 * 못 부른다(생성 함수를 부르는 곳이 시험뿐이다). 곧 **원장님이 승인하신 문형이
 * 엔진에만 산다.**
 *
 * ## 왜 관문(vitest)이 아니라 pre-push 인가
 *
 * `checkLoadedRawLatex.ts` 와 같은 까닭이다 — 관문은 망 없이 돌아야 하고, 공유 DB 는
 * **코드보다 먼저 바뀌므로** 「미는 그 커밋」이 아니라 **지금 DB** 를 물어야 뜻이 있다.
 *
 * ## 🔴 원장을 두는 까닭 — **늘 우는 가드는 꺼진다**
 *
 * 지금 28자리가 안 나간다. 이것을 그대로 막으면 **고치는 브랜치를 미는 것까지 막히고**,
 * 다음 사람이 훅을 우회한다(2026-08-20 「거짓 경보는 가드를 끈다」). 그래서
 * **«늘어나면» 빨강**으로 둔다 — 원장(`docs/planning/tracks/reports/unloaded-types.json`)
 * 에 없는 것이 새로 생기면 막는다.
 *
 * ⚠️ **원장은 «면제부»가 아니라 «빚»이다.** 줄어야 한다. 줄면 이 자가 그렇게 말하고,
 *    `--write` 로 원장을 조인다. 조이지 않으면 여유가 곧 사각지대가 된다.
 *
 * ## 이 자가 눈멀 수 있는 자리, 그리고 막은 법
 *
 * ㉠ **0이 「깨끗」인지 「못 셈」인지 안 갈린다.** 그래서 판정 **전에** 있을 수 없는 키를
 *    대 본다(양성 대조) — 그것이 「나간다」로 잡히면 검사를 **거부**한다.
 * ㉡ **결합형은 `registeredTypes()` 밖이라 구조적으로 0이다.** 따로 센다 —
 *    「목록에 없는 부류는 구조적으로 0」이 이 저장소의 단골 함정이다.
 * ㉢ **적재본이 비어 있으면** 전부 「안 나간다」가 되어 뜻이 없다. 행 수가 너무 적으면 멈춘다.
 * ㉣ **판정형**(`src/lib/middle/judge/` — 2026-10-08)도 `registeredTypes()` 밖이라 따로 센다. 유형 · 결합형과
 *    달리 **정확한 키**로 댄다(`loadedJudgeKeys`) — 포함으로 대면 비슷한 키가 «나갔다»로 읽힌다.
 *    그 읽기가 갈리지 않았는지 실행마다 스스로 대 본다(`judgeKeyProbe` — ㉠ 의 판정형 몫).
 */
import { readFileSync, writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import { middleComboDefinitions } from "../../src/lib/middle/combo";
import { registeredTypes } from "../../src/lib/middle/generate";
import {
  judgeExternalId,
  parseJudgeExternalId,
} from "../../src/lib/middle/judge/contract";
import { judgementDefinitions } from "../../src/lib/middle/judge/registry";

import { isDirectScript } from "../import/isDirectScript";

const LEDGER = "docs/planning/tracks/reports/unloaded-types.json";

/** 적재본이 이만큼도 없으면 이 검사는 뜻이 없다 — 「전부 안 나간다」가 되어 버린다. */
const MIN_ROWS = 5_000;

export type Entry = { key: string; grade: string; where: string };

/** 적재본의 `externalId` 를 조각으로 편다 — 적재기가 `…|{문항유형}` 을 붙인다. */
export function loadedFragments(ids: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const e of ids) {
    out.add(e);
    for (const part of e.split("|")) out.add(part);
  }
  return out;
}

export type TypeRow = { key: string; grade: string; unitSection: string };
export type ComboRow = {
  id: string;
  anchorGrade: string;
  anchorSection: string;
};
/** 판정형 등록 한 건 — `judgementDefinitions()` 의 모양 그대로(`src/lib/middle/judge/`). */
export type JudgeRow = { key: string; grade: string; unitSection: string };

/**
 * 적재본에서 **판정형 판정키**를 정확히 뽑는다 — `parseJudgeExternalId` 가 읽는 열쇠만.
 *
 * 🔴 유형 · 결합형처럼 `includes` 로 대지 않는다. 판정키 `…|calc-add2` 는 `…|calc-add2x` 의 일부라,
 *    포함으로 물으면 **다른 문항류를 넣고도 «나갔다»**가 된다(비슷한 키의 «거짓 적재» — 2026-10-08 합의 §1 Q1).
 *    읽는 함수는 적재기가 열쇠를 짓는 `judgeExternalId` 의 짝이다(같은 파일 — 규칙을 옮겨 적지 않는다).
 */
export function loadedJudgeKeys(fragments: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  for (const f of fragments) {
    const parts = parseJudgeExternalId(f);
    if (parts) out.add(parts.judgeKey);
  }
  return out;
}

/**
 * 🔴 **유형 표와 결합형 표를 «인자로» 받는다.** 안에서 직접 부르면 시험이 픽스처로
 *    경계를 못 대고, 살아 있는 엔진만 보게 되어 **도장**이 된다 — 이 저장소가
 *    여러 번 적은 「지어낸 표로 두 쪽을 직접 댄다」가 그 까닭이다.
 */
export function unloaded(
  fragments: ReadonlySet<string>,
  types: readonly TypeRow[] = registeredTypes() as unknown as TypeRow[],
  combos: readonly ComboRow[] = middleComboDefinitions() as unknown as ComboRow[],
  judges: readonly JudgeRow[] = judgementDefinitions(),
): Entry[] {
  const frags = [...fragments];
  const out: Entry[] = [];
  for (const t of types) {
    if (!frags.some((f) => f.includes(t.key)))
      out.push({ key: t.key, grade: t.grade, where: t.unitSection });
  }
  // ㉡ 결합형은 `registeredTypes()` 밖이다 — 안 세면 구조적으로 0이다.
  for (const d of combos) {
    if (!frags.some((f) => f.includes(d.id)))
      out.push({
        key: d.id,
        grade: d.anchorGrade,
        where: `${d.anchorSection} (결합형)`,
      });
  }
  // ㉣ 판정형도 `registeredTypes()` 밖이다 — 결합형과 같은 까닭으로 따로 센다. 대조는 **정확한 키**다.
  const judgeKeys = loadedJudgeKeys(fragments);
  for (const j of judges) {
    if (!judgeKeys.has(j.key))
      out.push({
        key: j.key,
        grade: j.grade,
        where: `${j.unitSection} (판정형)`,
      });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * ㉠ 의 판정형 몫 — 판정형 열쇠를 **정확히** 읽는지 실행할 때마다 스스로 대 본다.
 * 짓는 함수로 지은 열쇠를 읽는 함수가 되읽지 못하면(모양이 갈렸다) 판정형은 전부 «안 나감»으로 운다 — 시끄럽다.
 * 거꾸로 **비슷한 키**를 «나갔다»로 읽으면 조용히 빚이 숨는다 — 그것을 여기서 막는다. 문제가 없으면 null.
 */
export function judgeKeyProbe(): string | null {
  const key = "중9|없는소단원|zz";
  const id = judgeExternalId({
    judgeKey: key,
    ruleVersion: 1,
    seed: 1,
    variant: 0,
    questionType: "객관식",
  });
  if (!loadedJudgeKeys(loadedFragments([id])).has(key))
    return "판정형 열쇠를 짓는 함수와 읽는 함수가 갈렸다 — 실린 판정형을 «안 나감»으로 센다";
  const similar = loadedFragments([id.replace("|zz|", "|zzz|")]);
  if (loadedJudgeKeys(similar).has(key))
    return "비슷한 판정키를 «나갔다»로 읽는다 — 거짓 적재가 빚을 숨긴다";
  return null;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.problem.findMany({
      where: { externalId: { not: null } },
      select: { externalId: true },
    });
    if (rows.length < MIN_ROWS) {
      console.error(
        `🔴 적재본 externalId 가 ${rows.length}행뿐이다 — 이 검사는 «못 셈»이다.\n` +
          `   (${MIN_ROWS}행 미만이면 전부 「안 나간다」가 되어 뜻이 없다)`,
      );
      process.exit(2);
    }
    const frags = loadedFragments(
      rows.map((r) => r.externalId!).filter(Boolean),
    );

    // ㉠ 양성 대조 — 있을 수 없는 키가 「나간다」로 잡히면 이 자는 아무것도 못 잰다.
    const IMPOSSIBLE = "9-9|없는소단원|zz";
    if ([...frags].some((f) => f.includes(IMPOSSIBLE))) {
      console.error(
        "🔴 양성 대조 실패 — 있을 수 없는 키가 «적재됨»으로 잡힌다. 판정을 거부한다.",
      );
      process.exit(2);
    }
    const probe = judgeKeyProbe();
    if (probe) {
      console.error(`🔴 양성 대조 실패 — ${probe}. 판정을 거부한다.`);
      process.exit(2);
    }

    const now = unloaded(frags);
    const nowKeys = new Set(now.map((e) => e.key));

    if (process.argv.includes("--write")) {
      writeFileSync(
        LEDGER,
        JSON.stringify(
          {
            note: "엔진에 있는데 적재본에 한 조각도 없는 유형. **면제부가 아니라 빚이다 — 줄어야 한다.**",
            updated: "스크립트가 쓴다 — 손으로 고치지 말 것",
            rows: rows.length,
            entries: now,
          },
          null,
          2,
        ) + "\n",
        "utf-8",
      );
      console.log(
        `✅ 원장을 다시 썼다 — ${now.length}자리 (적재본 ${rows.length}행)`,
      );
      return;
    }

    let known: Entry[] = [];
    try {
      known = JSON.parse(readFileSync(LEDGER, "utf-8")).entries ?? [];
    } catch {
      console.error(
        `🔴 원장(${LEDGER})을 못 읽었다 — \`--write\` 로 먼저 만들어라.`,
      );
      process.exit(2);
    }
    const knownKeys = new Set(known.map((e) => e.key));
    const grown = now.filter((e) => !knownKeys.has(e.key));
    const fixed = known.filter((e) => !nowKeys.has(e.key));

    if (process.argv.includes("--list")) {
      console.log(`지면에 한 줄도 안 나가는 유형 ${now.length}자리\n`);
      for (const e of now)
        console.log(`  ${e.grade}  ${e.where}\n      ${e.key}`);
      return;
    }

    console.log(
      `적재본 ${rows.length}행 · 안 나가는 유형 ${now.length}자리 (원장 ${known.length})`,
    );
    if (fixed.length)
      console.log(
        `  ✅ ${fixed.length}자리가 지면에 나가기 시작했다 — \`--write\` 로 원장을 조여라.`,
      );
    if (grown.length) {
      console.error(
        `\n🔴 **새로 안 나가게 된 유형 ${grown.length}자리** — 엔진에만 산다.\n`,
      );
      for (const e of grown)
        console.error(`   ${e.grade}  ${e.where}\n       ${e.key}`);
      console.error(
        `\n   엔진에 유형을 더했으면 **적재까지가 완료 조건**이다.` +
          `\n   그 유형을 적재하거나, 아직 못 한다면 \`--write\` 로 원장에 빚으로 적어라.` +
          `\n   (원장은 면제부가 아니다 — 왜 못 적재했는지 커밋 메시지에 남겨라.)`,
      );
      process.exit(1);
    }
    console.log("✅ 새로 안 나가게 된 유형이 없다.");
  } finally {
    await prisma.$disconnect();
  }
}

// 🔴 **직접 부를 때만 돈다.** `unloadedTypes.test.ts` 가 이 파일에서 순수 함수 둘을
//    가져오는데, 맨몸 `main()` 이면 **import 만으로 공유 DB 질의가 나간다.** `.env` 가
//    없는 워크트리에서는 그것이 Prisma 검증 오류가 되어, **시험은 13,302건 전부 초록인데
//    vitest 종료 코드만 1** 이 된다(2026-08-31 실측 — 「N passed」 뒤에 숨는 그 자리다).
//    관문은 **망 없이** 돌아야 하고, 공유 DB 를 보는 검사는 pre-push 자리다(D-115 ⑼㉢).
//    ⚠️ 처음에 여기 「다른 QA 스크립트 **전부**가 이 울타리를 쓴다」고 적었는데
//       **거짓이다**(2026-08-31 적대 검토). 세어 보면 `scripts/qa` 안에만 맨몸
//       `main()` 이 **33개**다(울타리를 쓰는 것은 57개). 다만 **지금** 관문을
//       깨뜨릴 수 있는 것은 «시험이 import 하는» 것뿐이고, 그 교집합은 **0개**다 —
//       그래서 이 한 줄이 그때 유일한 자리였다. 새 시험이 그 33개 중 하나에서
//       순수 함수를 꺼내 쓰는 순간 같은 결함이 다시 난다.
if (isDirectScript(import.meta.url)) main();
