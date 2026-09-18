import { AppChrome } from "@/components/chrome/AppChrome";
import { GradeSheet } from "@/components/test/GradeSheet";

/**
 * `/tests/{id}/grade` — **채점 입력**(A안: 표 = 학생 × 문항). D-134 트랙 1.
 *
 * 진입점은 시험지 화면(`/tests/{id}`)의 «채점» 단추 하나다 — 확정·인쇄 상태에서만 보인다.
 * 초안 시험지는 이 화면이 표 대신 서버 문구를 띄운다(`GradeSheet` · `lib/testResults/gradeSheet.ts`).
 */
export default async function TestGradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppChrome>
      <GradeSheet testId={id} />
    </AppChrome>
  );
}
