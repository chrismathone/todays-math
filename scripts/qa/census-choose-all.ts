/**
 * **발견기** — 「정답이 여럿일 수 있는 발문」이 실제로 어떤 것들인지 **미리 정하지 않고** 센다.
 *
 *   npx tsx scripts/qa/census-choose-all.ts                  # 공유 DB (출제 가능분)
 *   npx tsx scripts/qa/census-choose-all.ts --all            # 격리분까지 — **반증용**
 *   npx tsx scripts/qa/census-choose-all.ts --engine         # 중등 엔진 등록 유형 × 씨앗
 *   npx tsx scripts/qa/census-choose-all.ts --engine --seeds 200
 *   npx tsx scripts/qa/census-choose-all.ts --json <경로>    # 산출물 저장
 *   npx tsx scripts/qa/census-choose-all.ts --tails 200      # 지시 꼬리 더 보기
 *
 * ## 왜 판정기와 따로 두는가
 *
 * 원장님 지시는 「모든 '모두 고르시오' 문제」다. 그 낱말을 **손 목록**으로 옮겨 적으면
 * 목록에 없는 부류는 **구조적으로 0** 이 된다 — 이 저장소가 `le`/`ge` 와 「그림」 낱말에서
 * 여러 번 데인 자리다(CLAUDE.md 2026-08-18). 그래서 이 자는 «판정»을 축으로 쓰지 않고
 * **기계가 셀 수 있는 사실만** 늘어놓는다. 부류는 사람이 표를 보고 발견한다.
 *
 * 축은 셋이고 전부 사실이다 (`src/lib/problem/chooseAllRule.ts`):
 *
 *   ㉠ 발문 **지시 꼬리**별 빈도 — 어떤 표현이 실제로 있나
 *   ㉡ 정답 **모양** 분포 — 표식 N / 나열 N / 조각 N / 단일
 *   ㉢ ㉠ × ㉡ 교차 — 「정답이 여럿인 지시」가 무엇인지 **세어서** 드러난다
 *
 * ⚠️ 「모두 몇 개인지 구하시오」는 정답이 **하나**(개수)다. 낱말 「모두」로 묶으면
 *    같이 딸려 온다 — 그래서 이 자는 낱말이 아니라 **㉢ 교차표**로 가른다.
 * ⚠️ 「조각」(`$x=3$, $y=4$`)은 **한 답의 여러 부분**이지 여러 답이 아니다.
 *    그래서 이름을 「개수」로 안 붙인다. 표에서 섞이면 과다 계수가 된다.
 *
 * 맨 끝에 **판정기(`isChooseAll`)가 무엇을 잡는지**를 사실 축과 **맞대어** 찍는다 —
 * 판정이 사실보다 좁거나 넓으면 그 차이가 거기서 드러난다.
 *
 * ⚠️ DB 를 **건드리지 않는다**(읽기 전용).
 */
import { writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import {
  answerShape,
  chooseAllAnswerCount,
  choiceLineCount,
  instructionTail,
  isChooseAll,
  UNCOUNTABLE,
} from "../../src/lib/problem/chooseAllRule";

const ENGINE = process.argv.includes("--engine");
/**
 * 🔴 `--all` 은 **판정기를 반증하려고** 모집단을 넓히는 스위치다. 격리분 45,374건은
 *    출제에 안 나가므로 **처리 대상이 아니다.** 이 산출물을 삭제·재생성의 입력으로
 *    물려받지 말 것 — CLAUDE.md 2026-08-18 「반증용으로 넓힌 모집단과 처리용
 *    모집단은 다르다」(그때 43건이 433건이 됐다).
 */
const ALL_ROWS = process.argv.includes("--all");
const numArg = (flag: string, dflt: number) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const jsonAt = (() => {
  const i = process.argv.indexOf("--json");
  return i >= 0 ? process.argv[i + 1] : null;
})();
const SEEDS = numArg("--seeds", 40);
const TAILS = numArg("--tails", 40);

type Row = {
  id: string;
  label: string;
  content: string;
  answer: string;
};

async function dbRows(): Promise<{ rows: Row[]; note: string }> {
  const prisma = new PrismaClient();
  try {
    const all = await prisma.problem.count();
    const rows = await prisma.problem.findMany({
      where: ALL_ROWS ? {} : { directUseAllowed: true },
      select: {
        id: true,
        problemCode: true,
        content: true,
        answer: true,
        familyKey: true,
      },
    });
    return {
      rows: rows.map((r) => ({
        id: r.id,
        label: `${r.problemCode}\t${r.familyKey ?? ""}`,
        content: r.content,
        answer: r.answer,
      })),
      // 분모를 **두 개** 찍는다 — 「격리분은 처리 대상이 아니다」가 표에 남아야
      // 다음 사람이 45,374 를 분모로 착각하지 않는다.
      note: ALL_ROWS
        ? `⚠️ 반증용 확대 모집단 — 공유 DB **전량** ${rows.length} (격리분 포함). 처리 대상이 아니다.`
        : `공유 DB · 전체 ${all} 중 출제 가능(direct_use_allowed=true) ${rows.length} · 격리(출제 안 됨) ${all - rows.length}`,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function engineRows(): Promise<{ rows: Row[]; note: string }> {
  const { registeredTypes, generateMiddleProblem } =
    await import("../../src/lib/middle/generate");
  const rows: Row[] = [];
  let failed = 0;
  for (const t of registeredTypes()) {
    for (let s = 0; s < SEEDS; s += 1) {
      try {
        const p = generateMiddleProblem(t.key, 20260825 + s * 7919);
        rows.push({
          id: `${t.key}#${s}`,
          label: t.key,
          content: p.content,
          answer: p.answer,
        });
      } catch {
        failed += 1;
      }
    }
  }
  return {
    rows,
    note: `중등 엔진 · 유형 ${registeredTypes().length} × 씨앗 ${SEEDS} = ${rows.length}건 (생성 실패 ${failed})`,
  };
}

function bump<K>(m: Map<K, number>, k: K) {
  m.set(k, (m.get(k) ?? 0) + 1);
}

async function main() {
  const { rows, note } = ENGINE ? await engineRows() : await dbRows();
  console.log(note);

  const tails = new Map<string, { n: number; shapes: Map<string, number> }>();
  const shapeTally = new Map<string, number>();
  const perRow: {
    id: string;
    label: string;
    tail: string;
    shape: string;
    choiceLines: number;
    judged: boolean;
    answer: string;
  }[] = [];

  for (const r of rows) {
    const tail = instructionTail(r.content);
    const sh = answerShape(r.answer);
    const shapeKey = sh.kind === "단일" ? "단일" : `${sh.kind} ${sh.n}`;
    bump(shapeTally, shapeKey);
    let slot = tails.get(tail);
    if (!slot) {
      slot = { n: 0, shapes: new Map() };
      tails.set(tail, slot);
    }
    slot.n += 1;
    bump(slot.shapes, shapeKey);
    perRow.push({
      id: r.id,
      label: r.label,
      tail,
      shape: shapeKey,
      choiceLines: choiceLineCount(r.content),
      judged: isChooseAll(r.content),
      answer: r.answer,
    });
  }

  // ㉡ 정답 모양 분포 ─────────────────────────────────────────────────
  console.log(`\n=== ㉡ 정답 «모양» 분포 (전량 ${rows.length}) ===`);
  for (const [k, n] of [...shapeTally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(10)} ${String(n).padStart(6)}`);
  }

  // ㉢ 「단일이 아닌 정답」을 하나라도 낸 지시 ───────────────────────────
  const multi = [...tails.entries()].filter(([, v]) =>
    [...v.shapes.keys()].some((k) => k !== "단일"),
  );
  console.log(
    `\n=== ㉢ 정답이 «단일이 아닌 것»을 하나라도 낸 지시 꼬리 (${multi.length}종) ===`,
  );
  for (const [tail, v] of multi.sort((a, b) => b[1].n - a[1].n)) {
    const dist = [...v.shapes.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k}×${n}`)
      .join(" · ");
    console.log(`  ${String(v.n).padStart(5)}  «${tail}»`);
    console.log(`          ${dist}`);
  }

  // ㉠ 지시 꼬리 전량 (상위만 찍되 종류 수는 반드시 남긴다) ───────────────
  const sorted = [...tails.entries()].sort((a, b) => b[1].n - a[1].n);
  console.log(`\n=== ㉠ 지시 꼬리 상위 ${TAILS} (총 ${sorted.length}종) ===`);
  for (const [tail, v] of sorted.slice(0, TAILS)) {
    console.log(`  ${String(v.n).padStart(5)}  «${tail}»`);
  }

  // 판정 ↔ 사실 대조 ───────────────────────────────────────────────────
  const judged = perRow.filter((r) => r.judged);
  const dist = new Map<string, number>();
  for (const r of judged) {
    const n = chooseAllAnswerCount(r.answer);
    bump(dist, n === UNCOUNTABLE ? "판정불가" : n >= 4 ? "4개이상" : `${n}개`);
  }
  console.log(
    `\n=== 판정기 isChooseAll 이 잡은 것 ${judged.length}건 — 정답 개수 분포 ===`,
  );
  for (const [k, n] of [...dist.entries()].sort()) {
    console.log(`  ${k.padEnd(8)} ${String(n).padStart(6)}`);
  }
  // 판정이 **놓칠 수 있는 자리**를 같이 찍는다 — 「고르」가 있는데 판정이 안 잡은 것.
  const nearMiss = perRow.filter((r) => !r.judged);
  const nearMissWithPick = rows
    .map((r, i) => ({ r, p: perRow[i]! }))
    .filter(({ r, p }) => !p.judged && /고르/.test(r.content));
  console.log(
    `\n=== 판정 밖인데 본문에 「고르」가 있는 것 ${nearMissWithPick.length}건 (판정 밖 전체 ${nearMiss.length}) ===`,
  );
  for (const { p } of nearMissWithPick.slice(0, 30)) {
    console.log(
      `  ${p.label}\t보기줄 ${p.choiceLines}\t${p.shape}\t«${p.tail}»`,
    );
  }

  if (jsonAt) {
    writeFileSync(
      jsonAt,
      JSON.stringify(
        {
          note,
          total: rows.length,
          shapes: Object.fromEntries(shapeTally),
          tails: sorted.map(([tail, v]) => ({
            tail,
            n: v.n,
            shapes: Object.fromEntries(v.shapes),
          })),
          rows: perRow,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`\n산출물: ${jsonAt}`);
  }
}

main();
