import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AuthLoading } from "@/components/auth/AuthLoading";
import {
  AuthFormSkeleton,
  ClassManageSkeleton,
  ClassesSkeleton,
  DailyReviewSkeleton,
  DashboardSkeleton,
  ExamDetailSkeleton,
  ExamListSkeleton,
  LandingSkeleton,
  OnboardingSkeleton,
  PrintPreviewSkeleton,
  ProblemBankSkeleton,
  ProblemCardLoadingSkeleton,
  ProblemGridSkeleton,
  ProblemPanelLoadingSkeleton,
  ProblemTransformLoadingSkeleton,
  ReviewConsoleSkeleton,
  ReviewProblemCardLoadingSkeleton,
  TestReviewContentSkeleton,
  TestReviewSkeleton,
  TestSetupFieldsSkeleton,
  TestSetupSkeleton,
  WorkroomHomeSkeleton,
} from "@/components/ui/PageSkeletons";

/**
 * 로딩 스켈레톤 **전량 시안** (내부 화면).
 *
 * 왜 있나: 스켈레톤은 **화면이 느릴 때만** 보인다. 그래서 원장님이 실물로
 * 보시려면 느려지기를 기다려야 하고, 그러면 **모양을 확정할 수가 없다.**
 * 절대 규칙 1(D-07)은 형태를 정하는 작업에 원장님 확정을 요구한다.
 *
 * ⚠️ 다른 `/dev` 화면과 같은 가드를 쓴다. **`force-static` 을 쓰면 안 된다.**
 */

const MICRO = "text-[10px] font-extrabold tracking-[1.2px]";

type Piece = {
  name: string;
  where: string;
  kind: "라우트" | "화면 안";
  node: React.ReactNode;
};

/**
 * ⚠️ 목록을 손으로 적는다. `PageSkeletons.tsx` 에 자리를 더하고 여기 안 적으면
 *    **그 자리는 이 시안에서 구조적으로 0이 된다.**
 */
const PIECES: Piece[] = [
  {
    name: "작업실 — 홈",
    where: "(main)/loading.tsx · studio/loading.tsx",
    kind: "라우트",
    node: <WorkroomHomeSkeleton />,
  },
  {
    name: "소개 화면",
    where: "LandingPage (비로그인 `/` 의 완성 화면)",
    kind: "화면 안",
    node: <LandingSkeleton />,
  },
  {
    name: "수업 계기판 — 전체",
    where: "MainScreen (embedded 가 아닐 때)",
    kind: "화면 안",
    node: <DashboardSkeleton />,
  },
  {
    name: "수업 계기판 — 오늘의 확인테스트 줄",
    where: "DailyReviewSection",
    kind: "화면 안",
    node: <DailyReviewSkeleton />,
  },
  {
    name: "반 목록",
    where: "(main)/classes/loading.tsx",
    kind: "라우트",
    node: <ClassesSkeleton />,
  },
  {
    name: "반 관리",
    where: "ClassManage",
    kind: "화면 안",
    node: <ClassManageSkeleton />,
  },
  {
    name: "문제은행 — 전체",
    where: "(main)/problems/loading.tsx",
    kind: "라우트",
    node: <ProblemBankSkeleton />,
  },
  {
    name: "문제은행 — 목록 격자",
    where: "ProblemBank",
    kind: "화면 안",
    node: <ProblemGridSkeleton />,
  },
  {
    name: "문제 카드 (지연 청크)",
    where: "ProblemCardLazy",
    kind: "화면 안",
    node: <ProblemCardLoadingSkeleton />,
  },
  {
    name: "문제 패널 (지연 청크)",
    where: "ProblemPanelsLazy",
    kind: "화면 안",
    node: <ProblemPanelLoadingSkeleton />,
  },
  {
    name: "변형 패널 (지연 청크)",
    where: "ProblemTransformPanelLazy",
    kind: "화면 안",
    node: <ProblemTransformLoadingSkeleton />,
  },
  {
    name: "출제 설정 — 전체",
    where: "(main)/tests/new/loading.tsx",
    kind: "라우트",
    node: <TestSetupSkeleton />,
  },
  {
    name: "출제 설정 — 입력칸",
    where: "GenerateSetup",
    kind: "화면 안",
    node: <TestSetupFieldsSkeleton />,
  },
  {
    name: "시험 검수 — 전체",
    where: "(main)/tests/[id]/loading.tsx",
    kind: "라우트",
    node: <TestReviewSkeleton />,
  },
  {
    name: "시험 검수 — 본문",
    where: "TestReview",
    kind: "화면 안",
    node: <TestReviewContentSkeleton />,
  },
  {
    name: "검수 문제 카드 (지연 청크)",
    where: "ReviewProblemCardLazy",
    kind: "화면 안",
    node: <ReviewProblemCardLoadingSkeleton />,
  },
  {
    name: "인쇄 미리보기",
    where: "(main)/tests/[id]/print/loading.tsx",
    kind: "라우트",
    node: <PrintPreviewSkeleton />,
  },
  {
    name: "오늘의시험 — 목록",
    where: "(main)/exam/loading.tsx · ExamDashboard",
    kind: "라우트",
    node: <ExamListSkeleton />,
  },
  {
    name: "오늘의시험 — 상세",
    where: "(main)/exam/[id]/loading.tsx · RoundDetail",
    kind: "라우트",
    node: <ExamDetailSkeleton />,
  },
  {
    name: "검수 콘솔",
    where: "review/loading.tsx",
    kind: "라우트",
    node: <ReviewConsoleSkeleton />,
  },
  {
    name: "로그인 (칸 2 · 편집 패널 포함)",
    where: "(auth)/loading.tsx · login/loading.tsx",
    kind: "라우트",
    node: <AuthLoading />,
  },
  {
    name: "가입 폼만 (칸 3)",
    where: "signup/loading.tsx · AuthFormSkeleton",
    kind: "라우트",
    node: <AuthFormSkeleton fields={3} />,
  },
  {
    name: "초기 설정",
    where: "(auth)/onboarding/loading.tsx",
    kind: "라우트",
    node: <OnboardingSkeleton />,
  },
];

export default async function SkeletonsPage() {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  const routes = PIECES.filter((p) => p.kind === "라우트").length;

  return (
    <main className="mx-auto max-w-[980px] px-6 py-8">
      <header className="mb-6">
        <span className={`${MICRO} text-faint`}>절대 규칙 1 · D-07</span>
        <h1 className="mt-1 text-[24px] font-black tracking-tight">
          로딩 스켈레톤 시안
        </h1>
        <p className="mt-2 text-[13px] leading-[1.8] text-text-2">
          스켈레톤은 <b>화면이 느릴 때만</b> 보인다. 이 화면은 그 자리를 한 장에
          늘어놓은 것이다. 고칠 자리는 각 칸에 적어 두었다.
        </p>
        <p className="mt-2 text-[13px] leading-[1.8] text-text-2">
          작업실 자리는 paper/navy/cobalt/mint 를 쓰고, 알림·카드에 색 왼쪽 띠를
          두지 않는다. 움직임을 줄이라고 설정한 사람에게는 씻김이 꺼지고 칸만
          남는다.
        </p>
      </header>

      <section className="mb-8 flex gap-6 border-t-[3px] border-ink pt-3">
        <div>
          <div className="text-[26px] font-black leading-none tabular-nums">
            {routes}
          </div>
          <div className={`mt-1 ${MICRO} text-faint`}>라우트 로딩</div>
        </div>
        <div>
          <div className="text-[26px] font-black leading-none tabular-nums">
            {PIECES.length - routes}
          </div>
          <div className={`mt-1 ${MICRO} text-faint`}>화면 안 자리</div>
        </div>
      </section>

      <div className="grid gap-8">
        {PIECES.map((p) => (
          <section key={p.name}>
            <div className="flex items-baseline gap-3 border-b border-divider pb-1">
              <h2 className="text-[15px] font-black tracking-tight">
                {p.name}
              </h2>
              <span className={`${MICRO} text-faint`}>{p.kind}</span>
              <code className="ml-auto text-[11px] text-text-3">{p.where}</code>
            </div>
            <div className="mt-3 overflow-auto border border-divider bg-canvas p-4">
              {p.node}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

export { PIECES as SKELETON_PIECES };
