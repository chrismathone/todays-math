/**
 * 병렬 학년 검수에서 확정한 오배정 문항을 안전하게 보류·재배정한다.
 *
 * 기본은 드라이런이며, 공유 DB에 쓰려면 아래처럼 명시해야 한다.
 *   ALLOW_GRADE_REMEDIATION=1 npx tsx scripts/classify/apply-confirmed-grade-remediation.ts
 *
 * 재배정 뒤에도 `pending` + `directUseAllowed=false`으로 남긴다. 단원은 바로잡되
 * 사람이 내용을 다시 승인하기 전에는 어떤 학년 시험에도 자동 출제하지 않는다.
 */
import { PrismaClient } from "@prisma/client";

// Administrative repairs should prefer the direct endpoint; the pooled URL can
// reject long-lived script connections independently of the application.
const directUrl = process.env.DIRECT_URL;
const prisma = directUrl
  ? new PrismaClient({ datasources: { db: { url: directUrl } } })
  : new PrismaClient();
const APPLY = process.env.ALLOW_GRADE_REMEDIATION === "1";

type Placement = {
  id: string;
  grade: string;
  section: string;
  reason: string;
};

const ALGEBRA: Placement[] = [
  "27865c5e-f678-4e62-ae0c-187fc5aa1f93",
  "33cf3cfd-89ab-47dd-bff7-d5189b6ca43c",
  "35767595-1b20-4126-a9a3-1f4fa0ed47c6",
  "4188c214-a96d-4649-934f-bb92ae473060",
  "75ddea8f-5fe4-42de-ae98-cdecb03614a4",
  "7f4808b4-066a-473f-a84b-a369e8c19a82",
  "be87f918-8079-4b94-80a8-3c5d33830496",
  "bfc163ed-84d9-4265-baef-f3463ced1047",
  "fc953813-7e8d-4bca-a930-1fec449976f2",
].map((id) => ({
  id,
  grade: "중1",
  section: "일차식의 뜻Ⅰ",
  reason: "초5 자연수 혼합계산에 배정된 중1 문자식",
}));

const PROVENANCE_CONFIRMED: Placement[] = [
  {
    id: "9d2c77af-c8c1-4bbf-ae97-74af521b57c0",
    grade: "공통수학2",
    section: "평행이동",
    reason: "상원고 공수2: 원의 평행이동",
  },
  {
    id: "c67d5ab4-e7d1-45da-914d-9b521d4b62d8",
    grade: "공통수학2",
    section: "평행이동",
    reason: "상원고 공수2: 두 점의 평행이동",
  },
  {
    id: "d50b1eb2-5819-4017-9356-8bd5995d0ba9",
    grade: "공통수학2",
    section: "대칭이동",
    reason: "상원고 공수2: 원점·직선 대칭이동",
  },
  {
    id: "37192668-b960-4884-8437-50e6a537c4f9",
    grade: "공통수학2",
    section: "평행이동",
    reason: "화원고 공수2: 좌표 평행이동",
  },
  {
    id: "d7c3fc9e-aa7f-445d-a61d-ba1ce68b84fe",
    grade: "공통수학1",
    section: "이차부등식의 해의 조건",
    reason: "칠성고 공수1: 이차부등식 해의 조건",
  },
  {
    id: "bea1eb9b-2cdc-493c-b081-45c1d49c0fbe",
    grade: "중2",
    section: "이등변삼각형의 성질",
    reason: "강동중 중2: 이등변삼각형의 외심·내심",
  },
];

const PLACEMENTS = [...ALGEBRA, ...PROVENANCE_CONFIRMED];

async function main() {
  const units = await prisma.unit.findMany({
    where: {
      OR: [
        ...new Set(
          PLACEMENTS.map(({ grade, section }) => `${grade}\0${section}`),
        ),
      ].map((key) => {
        const [grade, section] = key.split("\0");
        return { grade, section };
      }),
    },
    select: { id: true, grade: true, chapter: true, section: true },
  });
  const targetId = new Map(
    units.map((unit) => [`${unit.grade}\0${unit.section}`, unit.id]),
  );

  const targets = PLACEMENTS.map((placement) => {
    const unitId = targetId.get(`${placement.grade}\0${placement.section}`);
    if (!unitId) {
      throw new Error(
        `목적지 단원을 찾지 못했습니다: ${placement.grade} / ${placement.section}`,
      );
    }
    return { ...placement, unitId };
  });
  const rows = await prisma.problem.findMany({
    where: { id: { in: targets.map(({ id }) => id) } },
    select: {
      id: true,
      problemCode: true,
      reviewStatus: true,
      directUseAllowed: true,
      unitId: true,
      unit: { select: { grade: true, chapter: true, section: true } },
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const missing = targets.filter(({ id }) => !byId.has(id));
  const changes = targets.filter(({ id, unitId }) => {
    const row = byId.get(id)!;
    return (
      row.unitId !== unitId ||
      row.reviewStatus !== "pending" ||
      row.directUseAllowed !== false
    );
  });

  console.log(
    `확정 대상 ${targets.length}건 · DB 없음 ${missing.length}건 · 변경 필요 ${changes.length}건`,
  );
  for (const target of changes) {
    const row = byId.get(target.id)!;
    console.log(
      `[${row.problemCode ?? row.id.slice(0, 8)}] ${row.unit.grade} / ${row.unit.section} → ${target.grade} / ${target.section} (${target.reason})`,
    );
  }
  if (missing.length) {
    console.log(`DB에 없는 ID: ${missing.map(({ id }) => id).join(", ")}`);
  }
  if (!APPLY) {
    console.log(
      "드라이런입니다. 실제 적용에는 ALLOW_GRADE_REMEDIATION=1 이 필요합니다.",
    );
    return;
  }

  await prisma.$transaction(
    changes.map((target) =>
      prisma.problem.update({
        where: { id: target.id },
        data: {
          unitId: target.unitId,
          reviewStatus: "pending",
          directUseAllowed: false,
        },
      }),
    ),
  );
  const remainingEligible = await prisma.problem.count({
    where: {
      id: { in: targets.map(({ id }) => id) },
      reviewStatus: "approved",
      directUseAllowed: true,
    },
  });
  console.log(
    `적용 완료 ${changes.length}건 · 아직 자동 출제 가능한 대상 ${remainingEligible}건`,
  );
  if (remainingEligible !== 0) {
    throw new Error("출제 차단 검증에 실패했습니다.");
  }
}

main().finally(() => prisma.$disconnect());
