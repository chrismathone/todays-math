import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CoursePlayer } from "@/components/lab/CoursePlayer";
import { courseById } from "@/lib/lab/courses";

export const metadata: Metadata = {
  title: "개념 실험실 | 오늘 수학",
};

export default async function LabPlayPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!courseById(courseId)) notFound();
  return <CoursePlayer courseId={courseId} />;
}
