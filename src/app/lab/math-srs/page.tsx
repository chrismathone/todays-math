import type { Metadata } from "next";
import ElementaryCourseApp from "@/components/math-srs/ElementaryCourseApp";

export const metadata: Metadata = {
  title: "오늘의 기억 | 오늘 수학",
  description:
    "초3부터 초6까지, 학년·학기별 전체 과정과 차시별 복습으로 쌓는 수학 기억",
};

export default function MathSrsPage() {
  return <ElementaryCourseApp />;
}
