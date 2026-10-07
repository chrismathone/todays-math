"use client";

import {
  lazy,
  Suspense,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { FadingGate } from "@/lib/fading/enabled";
import WorkProgress from "@/components/unified/WorkProgress";
import tabs from "@/components/unified/TeachingView.module.css";
import { createTeacherFadingApiSource } from "./apiSource";
import type { TeacherFadingSource } from "./source";
import type { TeacherFadingPreviewSource } from "./TeacherFadingStatus";

const TeacherFadingStatus = lazy(() =>
  import("./TeacherFadingStatus").then((module) => ({
    default: module.TeacherFadingStatus,
  })),
);
const loadPreview: TeacherFadingPreviewSource = async (today) =>
  (await import("./previewData")).createWorkspaceFadingPreview(today);
const TABS = [
  { id: "legacy", label: "기존 SRS 현황" },
  { id: "fading", label: "오늘의 기억" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export type SrsWorkspaceViewProps = {
  fadingGate?: FadingGate;
  branchId?: string | null;
  legacy: ReactNode;
  /** Dev fixtures only: production uses the scoped API readers and deferred bank loader. */
  source?: TeacherFadingSource;
  preview?: TeacherFadingPreviewSource;
};

/** The off path returns the parent's existing dashboard without new chrome or reads. */
export function SrsWorkspaceView({
  fadingGate = "off",
  ...props
}: SrsWorkspaceViewProps) {
  if (fadingGate === "off") return props.legacy;
  return (
    <EnabledSrsWorkspaceView
      key={fadingGate}
      fadingGate={fadingGate}
      {...props}
    />
  );
}

function EnabledSrsWorkspaceView({
  branchId,
  legacy,
  source,
  preview = loadPreview,
}: SrsWorkspaceViewProps) {
  const id = useId();
  const [tab, setTab] = useState<Tab>("legacy");
  const [opened, setOpened] = useState({
    legacy: true,
    fading: false,
  });
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const readers = useMemo(
    () =>
      source ??
      createTeacherFadingApiSource({ branchId: branchId ?? undefined }),
    [source, branchId],
  );
  const select = (next: Tab) => {
    setTab(next);
    setOpened((current) => ({ ...current, [next]: true }));
  };
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? 1
          : event.key === "ArrowRight"
            ? (index + 1) % 2
            : event.key === "ArrowLeft"
              ? (index + 1) % 2
              : null;
    if (next === null) return;
    event.preventDefault();
    select(TABS[next]!.id);
    buttons.current[next]?.focus();
  };
  return (
    <>
      <div role="tablist" aria-label="SRS 현황" className={tabs.tabs}>
        {TABS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${id}-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`${id}-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            onKeyDown={(event) => move(event, index)}
            onClick={() => select(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section
        role="tabpanel"
        id={`${id}-panel-legacy`}
        aria-labelledby={`${id}-tab-legacy`}
        hidden={tab !== "legacy"}
      >
        {opened.legacy ? legacy : null}
      </section>
      <section
        role="tabpanel"
        id={`${id}-panel-fading`}
        aria-labelledby={`${id}-tab-fading`}
        hidden={tab !== "fading"}
      >
        {opened.fading ? (
          <Suspense
            fallback={<WorkProgress label="학생 현황을 불러오는 중입니다." />}
          >
            <TeacherFadingStatus {...readers} preview={preview} />
          </Suspense>
        ) : null}
      </section>
    </>
  );
}
