"use client";
/**
 * 「보기 번호 배치」 확인 화면 — **제품의 `WorksheetEditor` 를 그대로** 부른다.
 *
 * 따로 그리면 「클래스는 붙었는데 그렇게 안 그려진다」를 못 본다(jsdom 은 CSS 를 안 돈다).
 * 여기서 보는 지면은 원장님이 「시험지 구성하기」에서 보시는 것과 같은 DOM 이고,
 * 인쇄·PDF·HWPX 도 그 DOM 을 쓴다.
 *
 * 값을 미리 정해 열려면 `?layout=2x3` 처럼 준다(스크린샷 넉 장을 같은 자리에서 뽑으려고).
 */
import { useState } from "react";

import WorksheetEditor from "@/components/unified/WorksheetEditor";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "@/components/unified/print/types";
import type { PrintChoiceLayout } from "@/lib/math/choiceLayout";

import { CHOICE_LAYOUT_PROBLEMS } from "./fixtures";

const noop = () => {};

export default function ChoiceLayoutClient({
  initialLayout,
}: {
  initialLayout: PrintChoiceLayout;
}) {
  const [options, setOptions] = useState<PrintOptions>({
    ...DEFAULT_PRINT_OPTIONS,
    // 원장님 화면과 같은 2단 시험지로 견준다.
    columns: 2,
    choiceLayout: initialLayout,
  });
  const [meta, setMeta] = useState<PrintMeta>({
    ...DEFAULT_PRINT_META,
    title: "보기 번호 배치 확인",
  });
  const [title, setTitle] = useState("보기 번호 배치 확인");
  return (
    <WorksheetEditor
      selected={CHOICE_LAYOUT_PROBLEMS}
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
      navigate={noop}
    />
  );
}
