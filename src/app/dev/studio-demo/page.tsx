import { connection } from "next/server";
import { notFound } from "next/navigation";
import Harness from "./harness";

export const metadata = {
  title: "문제 추출 시연 확인",
  robots: { index: false, follow: false },
};

/**
 * 문제 추출 시연(2026-11-11)을 로그인 없이 이 PC 에서 확인하는 화면 — 운영에서는 404.
 * AI 는 이 PC 의 개발 AI(구독 CLI)로 실제로 보내고, 녹화본 서버(`/api/studio/demo`)는 브라우저 메모리가 흉내 낸다.
 */
export default async function Page() {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
  return <Harness />;
}
