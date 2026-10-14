import type { Metadata } from "next";

import { TeacherReview } from "@/components/lab/TeacherReview";

export const metadata: Metadata = {
  title: "개념 실험실 범위 | 오늘 수학",
  robots: { index: false, follow: false },
};

export default function LabTeacherPage() {
  return <TeacherReview />;
}
