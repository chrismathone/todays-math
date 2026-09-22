import type { Metadata } from "next";
import MathSrsApp from "@/components/math-srs/MathSrsApp";

export const metadata: Metadata = {
  title: "오늘의 기억 | 오늘의수학",
  description: "중1 일차방정식, 하루 12문제로 쌓는 나만의 수학 기억",
};

export default function MathSrsPage() {
  return <MathSrsApp />;
}
