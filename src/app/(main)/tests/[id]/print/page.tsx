import { accessibleTestsWhere } from "@/lib/classAccess";
import { notFound, redirect } from "next/navigation";

import { TestPrint } from "@/components/print/TestPrint";
import { canOutputFrom } from "@/contracts/accountAccess.contract";
import { idParamSchema } from "@/contracts/common.contract";
import { db } from "@/lib/db";
import { toPrintProblem } from "@/lib/print/toPrintProblem";
import { getSessionUser } from "@/lib/session";
import { contentOf } from "@/lib/tests/testProblemContent";
import { hydrateTestSnapshots } from "@/lib/tests/loadSnapshotAssets";

type TestPrintPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TestPrintPage({ params }: TestPrintPageProps) {
  const [session, routeParams] = await Promise.all([getSessionUser(), params]);
  if (!session) redirect("/login");
  if (!canOutputFrom(session.menus ?? [])) notFound();

  const parsed = idParamSchema.safeParse(routeParams);
  if (!parsed.success) notFound();

  const test = await db.test.findFirst({
    // 소유 범위(D-130) — 관리자는 남의 반 시험지도 인쇄한다. 지면 모양은 그대로다.
    where: { id: parsed.data.id, ...(await accessibleTestsWhere(session)) },
    include: {
      class: true,
      rangeEndUnit: true,
      testProblems: {
        // 학년은 단원에 있다 — 초등 대분수 표시(`toPrintProblem`)가 읽는다.
        include: {
          snapshot: true,
          problem: { include: { unit: { select: { grade: true } } } },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!test) notFound();

  const section = test.rangeEndUnit.section;
  const items = await hydrateTestSnapshots(test.testProblems);

  return (
    <TestPrint
      data={{
        testId: test.id,
        testType: test.testType,
        testDate: test.testDate.toISOString().slice(0, 10),
        className: test.class.name,
        section,
        todayGoal: `${section}의 핵심 개념을 확인하고 문제에 적용한다.`,
        conceptNote: `${section}의 정의와 계산 원리를 확인한 뒤 풀이 과정에 적용한다.`,
        problems: items.map((item) =>
          toPrintProblem(contentOf(item), item.orderIndex),
        ),
      }}
    />
  );
}
