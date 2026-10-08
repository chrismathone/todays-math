"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useState,
  type MouseEvent,
} from "react";
import WorksheetEditor from "@/components/unified/WorksheetEditor";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import {
  isParentMessage,
  messageType,
  openPayload,
  PARENT_ORIGIN,
  toStudioProblems,
  type ConceptPayload,
} from "./bridge";
import { isolatePreviewApis } from "./isolation";
import s from "./output.module.css";

const EXPORT_ONLY: WorkspaceMenu[] = ["export"];
const TEMPORARY_NOTICE =
  "시안 임시 편집 · 계정 저장 없음 · 새로고침하면 사라집니다.";

interface Draft {
  flow?: ConceptPayload["flow"];
  subject: "math" | "english";
  title: string;
  selected: StudioProblem[];
  options: PrintOptions;
  meta: PrintMeta;
}

export default function ExamBuilderOutput() {
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => ({
    subject: "math",
    title: "",
    selected: [],
    options: { ...DEFAULT_PRINT_OPTIONS },
    meta: { ...DEFAULT_PRINT_META },
  }));
  const [snapshot, setSnapshot] = useState<Draft | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useLayoutEffect(() => isolatePreviewApis(), []);

  function sendBack(step: "scope" | "review" = "review") {
    window.parent.postMessage(
      loaded
        ? {
            type: "exam-concept:back",
            payload: {
              title: draft.title,
              questionIds: draft.selected.map((question) => question.id),
              ...(draft.flow === "blueprint" ? { step } : {}),
            },
          }
        : { type: "exam-concept:back" },
      PARENT_ORIGIN,
    );
  }

  const receiveMessage = useEffectEvent((event: MessageEvent<unknown>) => {
    if (!isParentMessage(event, window.parent)) return;
    if (messageType(event.data) === "exam-concept:close") {
      sendBack();
      return;
    }
    if (messageType(event.data) !== "exam-concept:open") return;
    const payload = openPayload(event.data);
    if (!payload) {
      setLoaded(false);
      setSnapshot(null);
      setNotice("");
      setError(
        "문항을 불러오지 못했습니다. 시안의 제목·문항 형식과 길이를 확인해 주세요.",
      );
      return;
    }
    const selected = toStudioProblems(payload.questions);
    setDraft((previous) => ({
      ...previous,
      flow: payload.flow,
      subject: payload.subject,
      title: payload.title,
      selected,
      meta: {
        ...previous.meta,
        title: payload.title,
        subject: payload.subject === "english" ? "영어" : "수학",
      },
    }));
    setSnapshot(null);
    setNotice("");
    setError("");
    setLoaded(true);
  });

  const receiveKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.isComposing) return;
    event.preventDefault();
    sendBack();
  });

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => receiveMessage(event);
    const keydown = (event: KeyboardEvent) => receiveKey(event);
    window.addEventListener("message", receive);
    window.addEventListener("keydown", keydown);
    window.parent.postMessage({ type: "exam-concept:ready" }, PARENT_ORIGIN);
    return () => {
      window.removeEventListener("message", receive);
      window.removeEventListener("keydown", keydown);
    };
  }, []);

  function patchOptions(patch: Partial<PrintOptions>) {
    setDraft((previous) => ({
      ...previous,
      options: { ...previous.options, ...patch },
    }));
  }

  function save() {
    setSnapshot(structuredClone(draft));
    setNotice(
      "현재 제목·문항 순서·서식을 시안 메모리에 임시 저장했습니다. 새로고침하면 사라집니다.",
    );
  }

  function restore() {
    if (!snapshot) {
      setNotice("이 문항 묶음에는 아직 시안 임시 저장본이 없습니다.");
      return;
    }
    setDraft(structuredClone(snapshot));
    setNotice(
      "이 문항 묶음의 시안 임시 저장본을 불러왔습니다. 계정에는 저장되지 않습니다.",
    );
  }

  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: "exam-concept-preview",
            version: 1,
            temporary: true,
            ...draft,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "시험지-시안-임시작업.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "시안 임시 작업 JSON을 내려받았습니다. 이 화면의 불러오기는 메모리 임시 저장본에만 적용됩니다.",
    );
  }

  function guardServerExport(event: MouseEvent<HTMLDivElement>) {
    const button =
      event.target instanceof Element ? event.target.closest("button") : null;
    if (!button?.closest("[data-studio-band]")) return;
    const label = button.textContent?.trim();
    if (label !== "HWPX 내보내기" && label !== "PDF 내려받기") return;
    event.preventDefault();
    event.stopPropagation();
    setNotice(
      "시안에서는 인쇄 / PDF 저장을 이용해 주세요. 서버 파일 생성은 연결하지 않았습니다.",
    );
  }

  const blueprint = loaded && draft.flow === "blueprint";

  return (
    <div className={s.page} onClickCapture={guardServerExport}>
      <header
        className={`${s.topbar}${blueprint ? ` ${s.compactTopbar}` : ""}`}
      >
        {!blueprint ? (
          <button type="button" onClick={() => sendBack()}>
            문항 검토로 돌아가기
          </button>
        ) : null}
        <p>{TEMPORARY_NOTICE}</p>
        <button type="button" onClick={restore} disabled={!snapshot}>
          시안 임시 저장본 불러오기
        </button>
      </header>
      {notice ? (
        <p className={s.notice} role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      {loaded ? (
        <WorksheetEditor
          headerTitle={blueprint ? "시험지 만들기" : undefined}
          stepNavigation={
            blueprint
              ? {
                  label: "시험지 만들기 단계 이동",
                  items: [
                    {
                      id: "scope",
                      label: "1 범위 설정",
                      current: false,
                      onSelect: () => sendBack("scope"),
                    },
                    {
                      id: "review",
                      label: "2 문항 검토",
                      current: false,
                      onSelect: () => sendBack("review"),
                    },
                    {
                      id: "output",
                      label: "3 양식 구성·출력",
                      current: true,
                      onSelect: () => {},
                    },
                  ],
                }
              : undefined
          }
          allowedMenus={EXPORT_ONLY}
          libraryLabel="시안 메모리(임시)"
          selected={draft.selected}
          title={draft.title}
          columns={draft.options.columns}
          answers={draft.options.showAnswers}
          savedAt=""
          printOptions={draft.options}
          printMeta={draft.meta}
          setPrintOptions={patchOptions}
          setPrintMeta={(patch) =>
            setDraft((previous) => ({
              ...previous,
              meta: { ...previous.meta, ...patch },
            }))
          }
          setTitle={(title) =>
            setDraft((previous) => ({
              ...previous,
              title,
              meta: { ...previous.meta, title },
            }))
          }
          setColumns={(columns) =>
            patchOptions({ columns: columns === 1 ? 1 : 2 })
          }
          setAnswers={(showAnswers) => patchOptions({ showAnswers })}
          save={save}
          restore={restore}
          download={download}
          toggle={(problem) =>
            setDraft((previous) => ({
              ...previous,
              selected: previous.selected.filter(
                (row) => row.id !== problem.id,
              ),
            }))
          }
          move={(index, direction) =>
            setDraft((previous) => {
              const destination = index + direction;
              if (
                index < 0 ||
                index >= previous.selected.length ||
                destination < 0 ||
                destination >= previous.selected.length
              )
                return previous;
              const selected = [...previous.selected];
              [selected[index], selected[destination]] = [
                selected[destination],
                selected[index],
              ];
              return { ...previous, selected };
            })
          }
          reorder={(selected) =>
            setDraft((previous) => ({ ...previous, selected: [...selected] }))
          }
          navigate={() => sendBack()}
        />
      ) : (
        <main className={s.waiting}>
          <h1>시험지 출력 시안</h1>
          <p>문항 검토 화면에서 보낸 제목과 문항을 기다리고 있습니다.</p>
        </main>
      )}
    </div>
  );
}
