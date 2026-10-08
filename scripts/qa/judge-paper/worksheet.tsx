// 판정형 표본을 제품의 **통합 시험지**(`WorksheetEditor` → `WorksheetPrint`)로 그린다 — 2단 · 기본 설정.
// `/dev/choice-layout` 화면이 하는 그대로다(제품 컴포넌트를 따로 그리지 않는다).
//   /worksheet.html?set=<묶음>[&columns=1]
import { useState } from "react";
import { createRoot } from "react-dom/client";

import WorksheetEditor from "@/components/unified/WorksheetEditor";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";

import "katex/dist/katex.min.css";
import "@/app/globals.css";

type Sample = {
  externalId: string;
  content: string;
  answer: string;
  solution: string;
};
type SampleSet = { section: string; goal: string; samples: Sample[] };

const params = new URLSearchParams(location.search);
const set = params.get("set") ?? "s1";
const columns = params.get("columns") === "1" ? 1 : 2;
const noop = () => {};

function Sheet({ data }: { data: SampleSet }) {
  const [options, setOptions] = useState<PrintOptions>({
    ...DEFAULT_PRINT_OPTIONS,
    columns,
  });
  const [meta, setMeta] = useState<PrintMeta>({
    ...DEFAULT_PRINT_META,
    title: data.section,
  });
  const [title, setTitle] = useState(data.section);
  const selected: StudioProblem[] = data.samples.map((s) => ({
    id: s.externalId,
    content: s.content,
    answer: s.answer,
    solution: s.solution,
    grade: "중1",
    chapter: "",
    section: data.section,
    difficulty: "중",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
  }));
  return (
    <WorksheetEditor
      selected={selected}
      title={title}
      columns={options.columns}
      answers={options.showAnswers}
      savedAt=""
      printOptions={options}
      printMeta={meta}
      setPrintOptions={(patch) =>
        setOptions((previous) => ({ ...previous, ...patch }))
      }
      setPrintMeta={(patch) =>
        setMeta((previous) => ({ ...previous, ...patch }))
      }
      setTitle={setTitle}
      setColumns={noop}
      setAnswers={noop}
      save={noop}
      restore={noop}
      download={noop}
      toggle={noop}
      move={noop}
      reorder={noop}
      navigate={noop}
    />
  );
}

void fetch(`/samples-${set}.json`)
  .then((r) => r.json() as Promise<SampleSet>)
  .then((data) => {
    createRoot(document.getElementById("root")!).render(<Sheet data={data} />);
  });
