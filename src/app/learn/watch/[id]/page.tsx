import { WatchScreen } from "@/components/learn/WatchScreen";

export const metadata = {
  title: "오늘의 개념 · 재생",
};

/** 재생 — 목록과 같은 판정(`lectureOpenToStudent`)을 지난 강의만 서버가 준다(아니면 404 → «볼 수 없는 강의입니다.») */
export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 다음 영상으로 옮기면 재생기·보고 상태를 새로 세운다
  return <WatchScreen key={id} lectureId={id} />;
}
