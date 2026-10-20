"use client";

import { useState } from "react";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";
import { PrintOptionsPanel } from "@/components/unified/print/PrintOptionsPanel";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";

export default function SpacingFixture() {
  const [options, setOptions] = useState({
    ...DEFAULT_PRINT_OPTIONS,
    columns: 2 as 1 | 2,
    spacing: 16,
  });
  const [mixed, setMixed] = useState(true);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState("문항별 풀이 여백 검수");
  const [meta, setMeta] = useState({
    ...DEFAULT_PRINT_META,
    examDate: "2026-10-20",
  });
  const selected: StudioProblem[] = Array.from({ length: 25 }, (_, i) => ({
    id: `spacing-${i}`,
    content:
      mixed && i % 5 >= 3
        ? "다음 조건을 읽고 물음에 답하시오.\n\n직사각형 모양의 종이를 같은 넓이로 나누었습니다.\n\n가로의 길이는 12 cm이고 세로의 길이는 8 cm입니다.\n\n이 종이를 4명에게 똑같이 나누어 줍니다.\n\n한 명이 받는 종이의 넓이를 구하고 풀이 과정을 쓰시오."
        : `다음을 계산하시오. $${i + 2} + ${i + 3}$`,
    answer: String(2 * i + 5),
    solution: "두 수를 더합니다.",
    grade: "초4",
    chapter: "계산",
    section: "",
    difficulty: "",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
  }));
  return (
    <main style={{ padding: 20 }} data-spacing-ready={ready}>
      <label>
        <input
          type="checkbox"
          checked={mixed}
          onChange={(e) => setMixed(e.target.checked)}
        />
        긴 문항 섞기
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px minmax(0, 1fr)",
          gap: 20,
        }}
      >
        <aside style={{ maxHeight: "90vh", overflow: "auto" }}>
          <PrintOptionsPanel
            title={title}
            setTitle={setTitle}
            options={options}
            meta={meta}
            onOptions={(patch) => setOptions((prev) => ({ ...prev, ...patch }))}
            onMeta={(patch) => setMeta((prev) => ({ ...prev, ...patch }))}
          />
        </aside>
        <WorksheetPrint
          selected={selected}
          title={title}
          options={options}
          printMeta={meta}
          onReady={setReady}
        />
      </div>
    </main>
  );
}
