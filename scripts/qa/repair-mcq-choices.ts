/**
 * 이미 적재된 객관식의 **보기를 다시 만든다** — 오답이 정답과 같은 종류의 수가
 * 되도록(2026-08-27 원장님 지적: 초3 「두 수의 합」 보기에 `$-865$`·`$\frac{865}{2}$`).
 *
 * 엔진을 고쳐도 **이미 들어간 행은 안 바뀐다.** 화면·시험지에 나가는 것은 이 행들이다.
 *
 * 안전 규약
 * ─────────
 * ⑴ 기본은 **마른 실행**. 실제로 쓰려면 `--apply` 와 `ALLOW_SHARED_IMPORT=1` 둘 다.
 * ⑵ 원장을 **DB 보다 먼저** 쓴다. 그리고 **덧붙이기만** 한다 — 통째로 덮으면
 *    앞 회차를 되돌릴 수 없다(2026-08-20). 누적 행이 줄면 멈춘다.
 * ⑶ 되돌릴 때는 **지금 값이 내가 쓴 값일 때만** 되돌린다(다른 트랙이 그 사이
 *    같은 컬럼을 고쳤을 수 있다).
 * ⑷ **파생 객관식만** 손댄다. 엔진이 처음부터 보기를 낸 유형(중등 20개)은
 *    보기가 «값»이 아니라 내용이라 다시 만들면 문항이 깨진다. 가르는 열쇠는
 *    familyKey 도 externalId 도 아니고 **「오답 넷이 전부 계산 실수 목록에 있나」**다 —
 *    스스로 검산되는 열쇠라 목록이 새면 그 행을 **건너뛴다**(막는 쪽으로 샌다).
 * ⑸ 무엇을 잃는지 센다(D-20) — 건너뛴 사유별 건수를 반드시 찍는다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { createRng } from "../../src/lib/elementary/rng";
import {
  asMultipleChoice,
  numericMistakes,
} from "../../src/lib/engine/deriveFormats";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const LEDGER = path.resolve("scripts/qa/reports/mcq-choice-repair.json");

const MARKS = ["①", "②", "③", "④", "⑤"] as const;

type LedgerRow = {
  problemCode: string;
  id: string;
  before: { content: string; answer: string };
  after: { content: string; answer: string };
};

/** 보기 줄을 떼어 발문과 값 다섯으로 가른다. */
function split(content: string): { stem: string; values: string[] } | null {
  const lines = content.split("\n");
  const at = lines.findIndex((l) => l.trim().startsWith(MARKS[0]));
  if (at < 0) return null;
  const values: string[] = [];
  for (let i = 0; i < MARKS.length; i += 1) {
    const line = lines[at + i];
    if (!line || !line.trim().startsWith(MARKS[i]!)) return null;
    values.push(line.trim().slice(MARKS[i]!.length).trim());
  }
  if (lines.length !== at + MARKS.length) return null; // 보기 뒤에 뭔가 더 있으면 손대지 않는다
  return { stem: lines.slice(0, at).join("\n").trimEnd(), values };
}

/** 이 문항이 «같은 종류» 규칙을 이미 지키는가. */
function alreadyClean(correct: string, others: string[]): boolean {
  const ok = new Set(numericMistakes(correct).map((m) => m.value));
  return others.every((v) => ok.has(v));
}

/** 씨앗은 문항번호에서 뽑는다 — 같은 행은 늘 같은 보기가 나온다. */
function seedOf(code: string): number {
  let h = 0x811c9dc5;
  for (const ch of code) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 0x7fffffff;
}

function readLedger(): LedgerRow[] {
  if (!existsSync(LEDGER)) return [];
  return JSON.parse(readFileSync(LEDGER, "utf8")) as LedgerRow[];
}

async function main() {
  if (REVERT) return revert();

  const rows = await prisma.problem.findMany({
    where: { questionType: "객관식" },
    select: {
      id: true,
      problemCode: true,
      familyKey: true,
      content: true,
      answer: true,
    },
  });

  const skip = new Map<string, number>();
  const bump = (why: string) => skip.set(why, (skip.get(why) ?? 0) + 1);
  const plan: LedgerRow[] = [];

  for (const r of rows) {
    const code = r.problemCode ?? "";
    const parts = split(r.content ?? "");
    if (!parts) {
      bump("보기 다섯 줄을 못 읽었다");
      continue;
    }
    const idx = MARKS.indexOf(
      (r.answer ?? "").trim() as (typeof MARKS)[number],
    );
    if (idx < 0) {
      bump("정답이 보기 번호가 아니다");
      continue;
    }
    const correct = parts.values[idx]!;
    const others = parts.values.filter((_, i) => i !== idx);
    // ⑷ 파생 객관식인가 — 오답 넷이 **전부** 계산 실수 목록에 있어야 한다.
    //    ⚠️ 지금 코드의 목록으로 재면 이미 고쳐진 것처럼 보인다. 그래서 목록은
    //       **고치기 전 규칙**이 내던 값까지 받아야 한다 → 아래 legacy 를 함께 본다.
    const catalog = new Set(numericMistakes(correct).map((m) => m.value));
    const legacy = new Set(legacyMistakes(correct));
    if (!others.every((v) => catalog.has(v) || legacy.has(v))) {
      bump("파생 객관식이 아니다(오답이 계산 실수 목록 밖)");
      continue;
    }
    if (alreadyClean(correct, others)) {
      bump("이미 규칙을 지킨다");
      continue;
    }
    let got;
    try {
      got = asMultipleChoice(
        {
          content: parts.stem,
          answer: correct,
          solution: "",
          familyKey: r.familyKey ?? "",
          problemType: "",
        },
        createRng(seedOf(code)),
      );
    } catch (err) {
      bump(`다시 못 만든다: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    plan.push({
      problemCode: code,
      id: r.id,
      before: { content: r.content ?? "", answer: r.answer ?? "" },
      after: { content: got.content, answer: got.answer },
    });
  }

  console.log(`객관식 ${rows.length}행 · 고칠 것 ${plan.length}행`);
  console.log("건너뛴 사유:");
  for (const [why, n] of [...skip].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${n.toString().padStart(5)}  ${why}`);
  }
  const sum = [...skip.values()].reduce((a, b) => a + b, 0);
  if (sum + plan.length !== rows.length) {
    throw new Error(
      `분모가 안 맞는다: 고칠 것 ${plan.length} + 건너뜀 ${sum} != ${rows.length}`,
    );
  }

  console.log("\n표본 5건:");
  for (const p of plan.slice(0, 5)) {
    console.log(`  ${p.problemCode}`);
    console.log(`    전: ${p.before.content.split("\n").slice(-5).join("  ")}`);
    console.log(`    후: ${p.after.content.split("\n").slice(-5).join("  ")}`);
  }

  if (!APPLY) {
    console.log(
      "\n마른 실행이다. 실제로 쓰려면 --apply 와 ALLOW_SHARED_IMPORT=1.",
    );
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    throw new Error(
      "공유 DB 쓰기는 ALLOW_SHARED_IMPORT=1 없이는 안 한다 (D-31)",
    );
  }

  // ⑵ 원장을 DB 보다 **먼저**, 그리고 **덧붙여서**.
  const old = readLedger();
  const byId = new Map(old.map((r) => [r.id, r]));
  for (const p of plan) {
    const seen = byId.get(p.id);
    // 같은 행을 두 회차에 걸치면 **처음의 before** 를 남긴다.
    byId.set(p.id, seen ? { ...p, before: seen.before } : p);
  }
  const merged = [...byId.values()];
  if (merged.length < old.length) {
    throw new Error(`원장이 줄었다: ${old.length} → ${merged.length}`);
  }
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(merged, null, 2), "utf8");
  console.log(`\n원장 ${old.length} → ${merged.length}행 → ${LEDGER}`);

  let n = 0;
  for (const p of plan) {
    await prisma.problem.update({
      where: { id: p.id },
      data: { content: p.after.content, answer: p.after.answer },
    });
    n += 1;
    if (n % 500 === 0) console.log(`   ${n}/${plan.length}`);
  }
  console.log(`DB ${n}행 수정 완료.`);
}

/**
 * **고치기 전** 규칙이 내던 오답 값들 — 되돌아보기 전용.
 * 지금 목록에서 빠진 것(부호 반전·역수·분모 더하기)만 따로 되살린다.
 * 이 함수를 지우면 이미 나간 행이 「파생이 아니다」로 읽혀 하나도 안 고쳐진다.
 */
function legacyMistakes(answer: string): string[] {
  const m = answer.trim().match(/^\$(-?\d+)\$$/);
  if (!m) return [];
  const n = Number(m[1]);
  const out = [`$${-n}$`];
  if (n !== 0) out.push(`$\\frac{1}{${n}}$`);
  if (n % 2 !== 0) out.push(`$\\frac{${n}}{2}$`);
  return out;
}

async function revert() {
  const rows = readLedger();
  if (rows.length === 0) {
    console.log("원장이 비었다 — 되돌릴 것이 없다.");
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    throw new Error(
      "공유 DB 쓰기는 ALLOW_SHARED_IMPORT=1 없이는 안 한다 (D-31)",
    );
  }
  let done = 0;
  let moved = 0;
  for (const r of rows) {
    // ⑶ 지금 값이 **내가 쓴 값일 때만** 되돌린다.
    const now = await prisma.problem.findUnique({
      where: { id: r.id },
      select: { content: true, answer: true },
    });
    if (!now) continue;
    if (now.content !== r.after.content || now.answer !== r.after.answer) {
      moved += 1;
      continue;
    }
    await prisma.problem.update({
      where: { id: r.id },
      data: { content: r.before.content, answer: r.before.answer },
    });
    done += 1;
  }
  console.log(
    `되돌림 ${done}행 · 그 사이 남이 고쳐 건드리지 않은 것 ${moved}행`,
  );
}

main().finally(() => prisma.$disconnect());
