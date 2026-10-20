import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DescriptivePaperWire } from "./DescriptivePaperWire";

export const metadata: Metadata = {
  title: "서술형 지면 · Wire 5안",
};

/** Local, newly authored fixtures. No product print template, API or DB. */
export default function DescriptivePaperWirePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DescriptivePaperWire />;
}
