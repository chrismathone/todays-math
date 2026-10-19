import type { Metadata } from "next";
import MathSrsApp from "@/components/math-srs/MathSrsApp";

export const metadata: Metadata = { title: "중1 방정식 복습 | 오늘 수학" };
export default function AlgebraPracticePage() {
  return <MathSrsApp />;
}
