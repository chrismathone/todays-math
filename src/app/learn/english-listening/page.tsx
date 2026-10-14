import type { Metadata } from "next";
import { ListeningAssignments } from "@/components/learn/english-listening/ListeningAssignments";

export const metadata: Metadata = { title: "영어듣기 · 오늘 영어" };

export default function ListeningAssignmentsPage() {
  return <ListeningAssignments />;
}
