"use client";

import { useState } from "react";
import type { WorkbookAssignment } from "@/contracts/commercialWorkbook.contract";
import type { CommercialWorkbookSource } from "@/lib/commercialWorkbooks/source";
import { createHttpCommercialWorkbookSource } from "@/lib/commercialWorkbooks/http";
import WorkbookCatalog from "./WorkbookCatalog";
import WorkbookAssignments from "./WorkbookAssignments";
import WorkbookWrongNotes from "./WorkbookWrongNotes";
import s from "./CommercialWorkbooks.module.css";

type View = "catalog" | "assignments" | "notes";
const views: { id: View; label: string }[] = [
  { id: "catalog", label: "교재 정답" },
  { id: "assignments", label: "과제 · 채점" },
  { id: "notes", label: "저장한 오답" },
];

/** A source is scoped to this mounted teacher/session; production never falls back to demo. */
export default function CommercialWorkbookWorkspace({
  source: providedSource,
  demo = false,
  ownerId,
}: {
  source?: CommercialWorkbookSource;
  demo?: boolean;
  ownerId?: string;
}) {
  const [source] = useState(
    () => providedSource ?? createHttpCommercialWorkbookSource({ ownerId }),
  );
  const [view, setView] = useState<View>("catalog");
  const [opened, setOpened] = useState<Set<View>>(() => new Set(["catalog"]));
  const [created, setCreated] = useState<WorkbookAssignment | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  function open(next: View) {
    setView(next);
    setOpened((previous) => new Set([...previous, next]));
    if (next === "notes") setRefreshVersion((value) => value + 1);
  }
  function assigned(assignment: WorkbookAssignment) {
    setCreated(assignment);
    open("assignments");
  }
  return (
    <div className={s.workspace}>
      {demo && (
        <p className={s.demo}>
          <strong>로컬 체험</strong>
          <br />
          기본 교재와 학생은 직접 작성한 예시입니다. 공개 정답 자료를 등록해도
          이 화면의 저장은 메모리에만 남으며 운영 데이터로 전송하지 않습니다.
        </p>
      )}
      <div className={s.switcher} role="group" aria-label="교재 과제 작업 선택">
        {views.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={view === item.id}
            onClick={() => open(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div hidden={view !== "catalog"}>
        <WorkbookCatalog source={source} onAssignment={assigned} />
      </div>
      {opened.has("assignments") && (
        <div hidden={view !== "assignments"}>
          <WorkbookAssignments
            source={source}
            created={created}
            onSaved={() => setRefreshVersion((value) => value + 1)}
          />
        </div>
      )}
      {opened.has("notes") && (
        <div hidden={view !== "notes"}>
          <WorkbookWrongNotes source={source} refreshVersion={refreshVersion} />
        </div>
      )}
    </div>
  );
}
