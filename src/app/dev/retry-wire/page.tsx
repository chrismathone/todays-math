import { notFound } from "next/navigation";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { devPageVisible } from "@/lib/devPageAccess";

import { RetryWireClient } from "./RetryWireClient";

/**
 * **「오답 표시」 화면 시안 (D-07 Wire)** — 2026-09-08.
 *
 * ## 왜 이 화면인가
 *
 * 경쟁 문제은행 열 곳을 조사하니(문서 19) **전부** 가진 축인데 우리만 0이었다:
 * 오답 → 재출제. codex·grok 과 협의한 결론은 **「전체 성적부를 만들지 말고
 * 틀린 번호만 받으라」**였다 — 8문항 시험지의 단원 정답률은 단원당 1~2문항이라
 * 통계가 아니고, 그 연극을 위해 선택번호 1~5 를 전사시킬 이유가 없다.
 *
 * 그래서 이 화면이 받는 것은 **딱 하나**다: 「이 학생이 이것들을 틀렸다」.
 *
 * ## 🔴 네 안이 **전부** 답해야 하는 것 — 세 상태를 가르는가
 *
 * `아직 안 봄` · `하나도 안 틀림` · `틀림`. 스키마에는 둘밖에 없어서
 * (`isCorrect` 참/거짓) **화면이 세 번째를 만들어야 한다.** 안 가르면
 * 「채점을 안 한 학생」이 「만점」으로 조용히 굳는다 — 이 저장소가 여러 번 낸
 * 「빈 값을 결함으로/정상으로 읽는」 결함의 바로 그 자리다.
 *
 * ## 🔴 시안은 **가장 큰 실데이터**로 세운다 (2026-08-19 교훈)
 *
 * 확인테스트 범위 UI 시안이 중2 17개짜리 픽스처로 서는 바람에, 실제 735개 시드에서
 * 피커가 화면 밖으로 밀렸다 — 원장님이 스크린샷으로 잡아 주셨다. 여기서는
 * **공유 DB 의 실제 최대 시험지**(학생 7 × 문항 8 = 56칸)를 그대로 쓴다.
 * 픽스처를 지어내면 「56칸이 한 화면에 들어가나」라는 물음 자체가 사라진다.
 *
 * ⚠️ **아무것도 안 바꾼다.** 표시는 이 화면 안에서만 켜졌다 꺼진다.
 */
export const dynamic = "force-dynamic";

export default async function RetryWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();

  /**
   * 「가장 큰」 시험지를 **세어서** 고른다 — id 를 손으로 박으면 그 행이 사라진 날
   * 시안이 조용히 빈 화면이 된다.
   */
  const tests = await db.test.findMany({
    where: { status: { in: ["confirmed", "printed"] } },
    include: {
      class: { include: { students: { orderBy: { name: "asc" } } } },
      testProblems: {
        orderBy: { orderIndex: "asc" },
        include: {
          problem: {
            select: {
              id: true,
              problemCode: true,
              content: true,
              unitId: true,
              familyKey: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });

  const biggest = tests
    .filter(
      (t) => t.testProblems.length > 0 && (t.class?.students.length ?? 0) > 0,
    )
    .sort(
      (a, b) =>
        b.testProblems.length * (b.class?.students.length ?? 0) -
        a.testProblems.length * (a.class?.students.length ?? 0),
    )[0];

  if (!biggest) {
    return (
      <main className="mx-auto max-w-[900px] px-6 py-10 text-ink">
        <h1 className="text-[22px] font-black">오답 표시 시안</h1>
        <p className="mt-3 text-[13px] text-g-red-text">
          문항과 학생이 둘 다 있는 확정 시험지가 DB 에 없습니다 — 시안을
          실데이터로 세울 수 없으므로 **아무것도 그리지 않습니다.** 지어낸
          픽스처로 그리면 「몇 칸이 한 화면에 들어가나」라는 물음이 사라집니다.
        </p>
      </main>
    );
  }

  return (
    <RetryWireClient
      testDate={biggest.testDate.toISOString().slice(0, 10)}
      className={biggest.class?.name ?? "(반 없음)"}
      students={(biggest.class?.students ?? []).map((s) => ({
        id: s.id,
        name: s.name,
      }))}
      problems={biggest.testProblems.map((tp, i) => ({
        id: tp.problem.id,
        no: i + 1,
        code: tp.problem.problemCode,
        // 발문 첫 줄만 — 시안이라 본문 전체는 필요 없다.
        stem: tp.problem.content.split("\n")[0]?.slice(0, 60) ?? "",
        difficulty: tp.problem.difficulty,
      }))}
    />
  );
}
