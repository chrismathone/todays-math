"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ArithmeticStep } from "./ArithmeticWorkflow";
import {
  PrivateCloudClient,
  cloudError,
} from "@/components/unified/privateCloudClient";
import s from "./ArithmeticWorkbench.module.css";

const GradeWorkbench = dynamic(() => import("./GradeArithmeticWorkbench"));
const LegacyWorkbench = dynamic(() => import("./LegacyArithmeticWorkbench"));
type Mode = "grade" | "basic";
export type ArithmeticWorkbenchProps = {
  storageScope?: string;
  initialDocumentId?: string;
  initialStep?: ArithmeticStep;
  canOutput: boolean;
  academyName?: string;
  preview?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onDocumentChange?: (id: string | undefined) => void;
  onBusyChange?: (busy: boolean) => void;
};

export default function ArithmeticWorkbench(props: ArithmeticWorkbenchProps) {
  return <WorkbenchRouter key={props.storageScope ?? "preview"} {...props} />;
}

/** Keep both drafts alive, and route a stored document by its explicit version. */
function WorkbenchRouter({
  initialDocumentId,
  onDirtyChange,
  onDocumentChange,
  ...props
}: ArithmeticWorkbenchProps) {
  const [mode, setMode] = useState<Mode>("grade");
  const [visited, setVisited] = useState({ grade: true, basic: false });
  const [ids, setIds] = useState<{ grade?: string; basic?: string }>({});
  const [resolvedId, setResolvedId] = useState<string>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState({ grade: false, basic: false });
  const dirty = useRef({ grade: false, basic: false });
  const client = useMemo(
    () =>
      props.storageScope ? new PrivateCloudClient(props.storageScope) : null,
    [props.storageScope],
  );
  const pending = Boolean(
    initialDocumentId && initialDocumentId !== resolvedId,
  );
  useEffect(() => {
    if (!initialDocumentId) return;
    function route(id: string, next: Mode) {
      setError("");
      setIds((current) => ({ ...current, [next]: id }));
      setVisited((current) => ({ ...current, [next]: true }));
      setMode(next);
      setResolvedId(id);
    }
    if (!client) return;
    let cancelled = false;
    void client
      .get(initialDocumentId)
      .then((document) => {
        if (cancelled) return;
        if (
          document.kind !== "arithmeticSheet" ||
          ![1, 2].includes(Number(document.payload.payloadVersion))
        )
          throw new Error("지원하는 연산 연습지 자료가 아닙니다.");
        route(
          document.id,
          document.payload.payloadVersion === 2 ? "grade" : "basic",
        );
      })
      .catch((cause) => {
        if (!cancelled) setError(cloudError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [client, initialDocumentId, retry]);
  const changeDirty = useCallback(
    (which: Mode, value: boolean) => {
      dirty.current[which] = value;
      onDirtyChange?.(dirty.current.grade || dirty.current.basic);
    },
    [onDirtyChange],
  );
  const gradeDirty = useCallback(
    (value: boolean) => changeDirty("grade", value),
    [changeDirty],
  );
  const basicDirty = useCallback(
    (value: boolean) => changeDirty("basic", value),
    [changeDirty],
  );
  const changeDocument = useCallback(
    (which: Mode, id: string | undefined) => {
      setIds((current) => ({ ...current, [which]: id }));
      onDocumentChange?.(id);
    },
    [onDocumentChange],
  );
  const gradeDocument = useCallback(
    (id: string | undefined) => changeDocument("grade", id),
    [changeDocument],
  );
  const basicDocument = useCallback(
    (id: string | undefined) => changeDocument("basic", id),
    [changeDocument],
  );
  const gradeBusy = useCallback(
    (value: boolean) =>
      setBusy((current) =>
        current.grade === value ? current : { ...current, grade: value },
      ),
    [],
  );
  const basicBusy = useCallback(
    (value: boolean) =>
      setBusy((current) =>
        current.basic === value ? current : { ...current, basic: value },
      ),
    [],
  );

  return (
    <section className={s.root} aria-label="연산대장">
      <div className={s.modeSwitch} aria-label="연산 구성 방식">
        {(["grade", "basic"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            disabled={pending || busy.grade || busy.basic}
            onClick={() => {
              setMode(value);
              setVisited((current) => ({ ...current, [value]: true }));
              onDocumentChange?.(ids[value]);
            }}
          >
            {value === "grade" ? "학년별 연산" : "기초 연산 · 세부 조건"}
          </button>
        ))}
      </div>
      {initialDocumentId && !client ? (
        <p className={s.error} role="alert">
          저장된 연습지를 열려면 계정 정보를 확인해 주세요.
        </p>
      ) : error ? (
        <p className={s.error} role="alert">
          {error}{" "}
          <button onClick={() => setRetry((value) => value + 1)}>
            다시 열기
          </button>
        </p>
      ) : pending ? (
        <p role="status">저장된 연습지를 확인하고 있습니다.</p>
      ) : null}
      <div hidden={pending || mode !== "grade"}>
        {visited.grade && (
          <GradeWorkbench
            {...props}
            initialDocumentId={ids.grade}
            onDirtyChange={gradeDirty}
            onDocumentChange={gradeDocument}
            onBusyChange={gradeBusy}
          />
        )}
      </div>
      <div hidden={pending || mode !== "basic"}>
        {visited.basic && (
          <LegacyWorkbench
            {...props}
            hideHeader
            initialDocumentId={ids.basic}
            onDirtyChange={basicDirty}
            onDocumentChange={basicDocument}
            onBusyChange={basicBusy}
          />
        )}
      </div>
    </section>
  );
}
