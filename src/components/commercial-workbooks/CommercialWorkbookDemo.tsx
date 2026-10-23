"use client";

import { useState } from "react";
import { createLocalCommercialWorkbookSource } from "@/lib/commercialWorkbooks/local";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import CommercialWorkbookWorkspace from "./CommercialWorkbookWorkspace";
import s from "./CommercialWorkbooks.module.css";

/** Only the parent's strictly development-only route mounts this authored demo. */
export default function CommercialWorkbookDemo() {
  const [source, setSource] = useState(() =>
    createLocalCommercialWorkbookSource(),
  );
  const [viewKey, setViewKey] = useState(0);
  function reload(reset: boolean) {
    if (
      !window.confirm(
        reset
          ? "예시 저장 기록과 입력을 초기화할까요?"
          : "저장하지 않은 입력을 닫고 메모리에 저장된 기록을 다시 읽을까요?",
      )
    )
      return;
    if (reset) setSource(createLocalCommercialWorkbookSource());
    setViewKey((value) => value + 1);
  }
  return (
    <main className={`${s.demoPage} ${s.workspace}`}>
      <WorkspacePageHeader
        title="교재 과제 · 오답 체험"
        description="직접 작성한 예시로 등록부터 채점, 오답노트, 인쇄까지 확인합니다."
      >
        <button
          type="button"
          className={s.button}
          onClick={() => reload(false)}
        >
          저장 기록 다시 읽기
        </button>
        <button type="button" className={s.button} onClick={() => reload(true)}>
          예시 초기화
        </button>
      </WorkspacePageHeader>
      <p className={s.demo}>
        ‘저장 기록 다시 읽기’는 같은 메모리 저장소를 다시 읽습니다. 브라우저
        새로고침은 예시를 초기화합니다. 서버 영구 저장을 검증하는 화면은
        아닙니다.
      </p>
      <CommercialWorkbookWorkspace key={viewKey} source={source} demo />
    </main>
  );
}
