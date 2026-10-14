import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ListeningAssignment } from "@/components/learn/english-listening/ListeningAssignment";

export const metadata: Metadata = { title: "듣기 학습 · 오늘 영어" };

export default async function ListeningAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <ListeningAssignment assignmentId={id} />;
}
