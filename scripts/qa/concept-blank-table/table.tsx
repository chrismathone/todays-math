import React from "react";
import { createRoot } from "react-dom/client";
import ConceptBlankFormTable, {
  type FormColumn,
} from "@/components/concept-blank/ConceptBlankFormTable";
import "@/app/globals.css";

// Owner 2026-10-20: no near-useless horizontal scroll — the columns give way instead.
const width = Number(new URLSearchParams(location.search).get("width") || 1240);
const counts = (n: number) => ({ 하: n, 중: n, 상: n });
const field = (
  row: "main" | "extra",
  label: string,
  max = counts(40),
  value = counts(10),
) => ({ row, label, max, value });
const columns: FormColumn[] = [
  {
    form: "recall",
    letter: "A",
    label: "완전 백지",
    help: "",
    on: false,
    available: true,
    reason: null,
    fields: [field("main", "개념 수")],
  },
  {
    form: "term",
    letter: "B",
    label: "개념 질문",
    help: "",
    on: false,
    available: true,
    reason: null,
    fields: [field("main", "질문"), field("extra", "○×")],
  },
  {
    form: "cloze",
    letter: "C",
    label: "문장 빈칸",
    help: "",
    on: false,
    available: true,
    reason: null,
    fields: [
      field("main", "문장"),
      field("extra", "적용", { 하: 38, 중: 32, 상: 29 }),
    ],
  },
  {
    form: "map",
    letter: "D",
    label: "개념 지도",
    help: "",
    on: false,
    available: true,
    reason: null,
    fields: [field("main", "개념 수")],
  },
  {
    form: "figure",
    letter: "E",
    label: "그림 보고 쓰기",
    help: "",
    on: false,
    available: false,
    reason: "고른 소단원에 그림 문항이 없습니다.",
    fields: [field("main", "그림", counts(0), counts(0))],
  },
] as FormColumn[];
createRoot(document.getElementById("root")!).render(
  <div style={{ width, padding: 0 }} data-frame>
    <ConceptBlankFormTable
      columns={columns}
      onToggle={() => {}}
      onCount={() => {}}
    />
  </div>,
);
document.documentElement.dataset.ready = "true";
