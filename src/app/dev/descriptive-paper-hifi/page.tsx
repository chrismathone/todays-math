import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DescriptivePaperHifi } from "./DescriptivePaperHifi";

export const metadata: Metadata = { title: "서술형 지면 · Hi-fi 5안" };

export default function DescriptivePaperHifiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DescriptivePaperHifi />;
}
