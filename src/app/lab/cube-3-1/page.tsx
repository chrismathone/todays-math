import type { Metadata } from "next";
import CubeUnitLab from "@/components/lab/cube31/CubeUnitLab";
import { generateCubePractice } from "@/lib/lab/cube31/engine";

export const metadata: Metadata = {
  title: "덧셈과 뺄셈 실험실 · 초등 3-1 | 오늘 수학",
  description:
    "수를 직접 옮기고 묶고 풀면서 세 자리 덧셈과 뺄셈의 이유를 알아보세요.",
};
export default function CubeUnitPage() {
  return <CubeUnitLab practice={generateCubePractice()} />;
}
