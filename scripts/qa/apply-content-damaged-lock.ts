/**
 * 본문 손상/누락 문항 중 **회수 가망이 없는 두 갈래**를 출제 풀에서 뺀다
 * (`directUseAllowed = false`). 2026-08-23 원장님 지시("다 짤라").
 *
 *   npx tsx scripts/qa/apply-content-damaged-lock.ts                 # 드라이런(기본)
 *   ALLOW_UNIT_FIX=1 npx tsx scripts/qa/apply-content-damaged-lock.ts
 *   ALLOW_UNIT_FIX=1 npx tsx scripts/qa/apply-content-damaged-lock.ts --revert
 *
 * ## 왜 이 두 갈래인가
 *
 * `/dev/content-damaged` 가 보여주는 "본문 손상/누락" 419건 중:
 *
 * 1. **RPM 소스 28건** — 전부 `RPM 중학 X-Y 학생용.pdf`(교과서문제 정복하기 절 계열)에서
 *    왔다. 증명 과정 빈칸(㈎~㈒)·보기 목록·판단 명제 본문이 PDF 추출 과정에서 통째로
 *    빠진다 — 그룹형 문제(공통 지시문 + 여러 번호)라 추출기가 개별 문항 경계를 못
 *    잡는 구조적 결함. 원장님 확인: RPM 이 문항 대조 대상 도서와 다르다.
 * 2. **원본 출처 메타데이터 전무 46건** — `school`·`examId`·`questionNumber`·
 *    `sourceFile`·`externalId` 가 전부 NULL. 대조할 원본 좌표가 없어 되짚을 길이 없다.
 *
 * ⚠️ `directUseAllowed` 를 새로 잠그려면 원장님 확인이 필요하다(스키마 주석) —
 *    이번엔 채팅으로 직접 받았다.
 *
 * 회수 가망이 남은 나머지(HWP 원본이 살아있는 지수 표기 손실 등)는 이 스크립트가
 * 손대지 않는다 — 별도 회수 트랙(docs/planning/16) 대상이다.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEDGER = "scripts/qa/reports/content-damaged-lock.json";
const APPLY = process.env.ALLOW_UNIT_FIX === "1";
const REVERT = process.argv.includes("--revert");

const DAMAGE_KEYWORDS = /손상|깨|누락|오타|결손|훼손/;

type Ledger = {
  적용: string;
  기준시각: string;
  되돌리기: string;
  잠근건수: number;
  이전상태: Array<{
    id: string;
    problemCode: string;
    directUseAllowed: boolean;
  }>;
};

async function damagedIds(): Promise<Map<string, string>> {
  const raw = JSON.parse(
    readFileSync("scripts/qa/reports/ai-solution-skip.json", "utf8"),
  ) as Array<{ id: string; reason: string }>;
  const map = new Map<string, string>();
  for (const r of raw)
    if (DAMAGE_KEYWORDS.test(r.reason)) map.set(r.id, r.reason);
  return map;
}

async function revert() {
  if (!existsSync(LEDGER)) {
    console.log("되돌릴 원장이 없다:", LEDGER);
    return;
  }
  const ledger = JSON.parse(readFileSync(LEDGER, "utf8")) as Ledger;
  const ids = ledger.이전상태.map((r) => r.id);

  // 지금 값이 이 스크립트가 잠근 값(false)일 때만 되돌린다 — 다른 트랙이 이미
  // 손댔으면(예: 같은 문항이 다른 사유로도 잠겨 있던 경우) 건드리지 않는다.
  const current = await prisma.problem.findMany({
    where: { id: { in: ids } },
    select: { id: true, directUseAllowed: true },
  });
  const stillLocked = current
    .filter((c) => c.directUseAllowed === false)
    .map((c) => c.id);

  console.log(
    `원장 ${ledger.이전상태.length}건 중 아직 이 스크립트 값 그대로인 것 ${stillLocked.length}건`,
  );

  if (!APPLY) {
    console.log("드라이런이다. 되돌리려면 ALLOW_UNIT_FIX=1 을 붙여라.");
    return;
  }
  if (stillLocked.length === 0) {
    console.log("되돌릴 것이 없다.");
    return;
  }
  await prisma.problem.updateMany({
    where: { id: { in: stillLocked } },
    data: { directUseAllowed: true },
  });
  console.log(`${stillLocked.length}건 해제 완료`);
}

async function apply() {
  const reasons = await damagedIds();
  const ids = [...reasons.keys()];

  const rows = await prisma.problem.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      problemCode: true,
      examId: true,
      school: true,
      questionNumber: true,
      sourceFile: true,
      externalId: true,
      directUseAllowed: true,
    },
  });

  const isRpm = (r: (typeof rows)[number]) =>
    (r.examId ?? "").startsWith("rpm-") || /RPM/i.test(r.sourceFile ?? "");
  const hasNoMetadata = (r: (typeof rows)[number]) =>
    !r.school &&
    !r.examId &&
    r.questionNumber == null &&
    !r.sourceFile &&
    !r.externalId;

  const rpmRows = rows.filter(isRpm);
  const noMetaRows = rows.filter(hasNoMetadata);
  const targetRows = [...rpmRows, ...noMetaRows];

  console.log("본문 손상/누락 전체:", rows.length);
  console.log("  RPM 소스:", rpmRows.length);
  console.log("  원본 출처 메타데이터 전무:", noMetaRows.length);
  console.log("  잠금 대상 합계:", targetRows.length);

  const todo = targetRows.filter((r) => r.directUseAllowed);
  console.log("  이미 잠겨 있던 것 제외 실제 신규 잠금:", todo.length);

  if (!APPLY) {
    console.log("\n드라이런이다. 실제로 쓰려면 ALLOW_UNIT_FIX=1 을 붙여라.");
    console.log(
      "샘플:",
      todo.slice(0, 5).map((r) => r.problemCode),
    );
    return;
  }
  if (todo.length === 0) {
    console.log("잠글 것이 없다.");
    return;
  }

  const ledger: Ledger = {
    적용: "본문 손상/누락 중 RPM 소스·원본 출처 메타데이터 전무 문항 출제 제외 (directUseAllowed=false)",
    기준시각: new Date().toISOString(),
    되돌리기:
      "ALLOW_UNIT_FIX=1 npx tsx scripts/qa/apply-content-damaged-lock.ts --revert",
    잠근건수: todo.length,
    이전상태: todo.map((r) => ({
      id: r.id,
      problemCode: r.problemCode,
      directUseAllowed: r.directUseAllowed,
    })),
  };
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1), "utf8");

  await prisma.problem.updateMany({
    where: { id: { in: todo.map((r) => r.id) } },
    data: { directUseAllowed: false },
  });
  console.log(`${todo.length}건 잠금 완료 → ${LEDGER}`);
}

async function main() {
  if (REVERT) await revert();
  else await apply();
}
main().finally(() => prisma.$disconnect());
