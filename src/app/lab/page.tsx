import type { Metadata } from "next";

import { CourseMap } from "@/components/lab/CourseMap";

export const metadata: Metadata = {
  title: "개념 실험실 | 오늘 수학",
};

export default function LabPage() {
  return <CourseMap />;
}
