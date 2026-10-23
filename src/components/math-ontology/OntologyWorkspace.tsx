"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import AutoGrowTextarea from "@/components/ui/AutoGrowTextarea";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import { createOntologyWorkspaceSource } from "./api";
import { OntologyWorkspaceError, type OntologyWorkspaceSource, type WorkspaceAnswer, type WorkspaceStudent, type WorkspaceExecution } from "./source";
import s from "./workspace.module.css";
const labels = { observed: "관측", reviewed: "검토한 연결", candidate: "검토 전 후보", unknown: "미확인" };
export default function OntologyWorkspace({ source, branchId, scopeKey = "account" }: { source?: OntologyWorkspaceSource; branchId?: string; scopeKey?: string }) {
  const port = useMemo(() => source ?? createOntologyWorkspaceSource(branchId), [source, branchId]);
  return <ScopedWorkspace key={`${scopeKey}:${branchId ?? ""}`} source={port} />;
}
function ScopedWorkspace({ source }: { source: OntologyWorkspaceSource }) {
  const [query, setQuery] = useState("");
  const [student, setStudent] = useState<WorkspaceStudent | null>(null);
  const [answer, setAnswer] = useState<WorkspaceAnswer | null>(null);
  const [history, setHistory] = useState<WorkspaceAnswer[]>([]);
  const [busy, setBusy] = useState<"prepare" | "confirm" | "feedback" | null>(null);
  const [error, setError] = useState<OntologyWorkspaceError | null>(null);
  const [execution, setExecution] = useState<WorkspaceExecution | null>(null);
  const [feedback, setFeedback] = useState<{ summary: string; details: string[] } | null>(null);
  const [confirmUnknown, setConfirmUnknown] = useState(false);
  const [picking, setPicking] = useState(false);
  const busyRef = useRef(false), sequence = useRef(0), active = useRef<AbortController | null>(null), pickerButton = useRef<HTMLButtonElement>(null);
  useEffect(() => () => { sequence.current++; active.current?.abort(); }, []);
  const fail = (cause: unknown) => {
    const problem = cause instanceof OntologyWorkspaceError ? cause : new OntologyWorkspaceError("NETWORK", "결과를 확인하지 못했습니다. 다시 확인해 주세요.");
    if (problem.code === "FORBIDDEN" || problem.code === "STALE") { setAnswer(null); setHistory([]); setExecution(null); setFeedback(null); }
    setError(problem); return problem;
  };
  async function prepare(event?: FormEvent, selected = student, text = query) {
    event?.preventDefault();
    if (busyRef.current || !text.trim()) return;
    busyRef.current = true; const request = ++sequence.current, controller = new AbortController(); active.current = controller;
    if (answer) setHistory(items => [...items.slice(-9), answer]);
    setAnswer(null); setExecution(null); setFeedback(null); setConfirmUnknown(false); setError(null); setBusy("prepare");
    try { const value = await source.run({ query: text.trim(), student: selected }, controller.signal); if (sequence.current === request) setAnswer(value); }
    catch (cause) { if (sequence.current === request && !controller.signal.aborted) fail(cause); }
    finally { if (sequence.current === request) { busyRef.current = false; setBusy(null); } }
  }
  function connect(selected: WorkspaceStudent | null) {
    const continueRequest = answer?.requiresStudent === true;
    sequence.current++; active.current?.abort(); busyRef.current = false; setBusy(null);
    setStudent(selected); setPicking(false); setAnswer(null); setHistory([]); setError(null); setExecution(null); setFeedback(null); setConfirmUnknown(false);
    if (continueRequest && selected) void prepare(undefined, selected);
  }
  async function confirm() {
    if (!answer?.action || busyRef.current || (answer.action.kind === "plan" && !student)) return;
    busyRef.current = true; setBusy("confirm"); setError(null);
    const request = ++sequence.current, controller = new AbortController(); active.current = controller;
    try { const result = await source.confirm(answer.action, controller.signal); if (sequence.current === request) { setExecution(result); setConfirmUnknown(false); } }
    catch (cause) { if (sequence.current === request && !controller.signal.aborted) setConfirmUnknown(fail(cause).code === "NETWORK"); }
    finally { if (sequence.current === request) { busyRef.current = false; setBusy(null); } }
  }
  async function observe() {
    if (!execution || busyRef.current) return;
    busyRef.current = true; setBusy("feedback"); setError(null);
    const request = ++sequence.current, controller = new AbortController(); active.current = controller;
    try { const value = await source.feedback(execution, controller.signal); if (sequence.current === request) setFeedback(value); }
    catch (cause) { if (sequence.current === request && !controller.signal.aborted) fail(cause); }
    finally { if (sequence.current === request) { busyRef.current = false; setBusy(null); } }
  }
  function back() {
    sequence.current++; active.current?.abort(); busyRef.current = false; setBusy(null); setError(null); setExecution(null); setFeedback(null); setConfirmUnknown(false);
    setAnswer(history.at(-1) ?? null); setHistory(items => items.slice(0, -1));
  }
  return <div className={s.page}>
    <WorkspacePageHeader title="지식 작업실" description="찾기와 검토를 한곳에서.">
      <button type="button" ref={pickerButton} className={s.button} disabled={busy === "confirm"} onClick={() => setPicking(true)}>{student ? `${student.label} · ${student.classLabel}` : "학생 연결"}</button>
      {student && <button type="button" className={s.button} disabled={busy === "confirm"} onClick={() => connect(null)}>연결 해제</button>}
    </WorkspacePageHeader>
    <form className={s.prompt} onSubmit={event => void prepare(event)}>
      <label htmlFor="ontology-work-request">원하는 일</label>
      <AutoGrowTextarea id="ontology-work-request" value={query} maxLength={500} aria-describedby="ontology-request-keys" placeholder="개념에 연결된 자료를 찾거나, 확인할 내용을 준비해 달라고 해 주세요." onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void prepare(); } }} />
      <small id="ontology-request-keys" className={s.muted}>Enter로 준비 · Shift+Enter로 줄바꿈</small>
      <div className={s.promptActions}><span className={s.muted}>{student ? "연결한 학생의 허용된 기록을 함께 봅니다." : "전체 지식부터 찾습니다."}</span><button type="submit" className={s.primary} disabled={!!busy || !query.trim()}>{busy === "prepare" ? "준비 중…" : "준비하기"}</button></div>
    </form>
    {busy && <p className={s.status} role="status">{busy === "prepare" ? "자료를 찾아 검토하고 있습니다." : busy === "confirm" ? "확인한 내용을 적용하고 결과를 확인합니다." : "이후 관찰을 확인합니다."}</p>}
    {error && <div className={s.error} role="alert"><p>{error.message}</p>{error.code !== "FORBIDDEN" && <button type="button" className={s.button} disabled={!!busy} onClick={() => confirmUnknown ? void confirm() : void prepare()}>{confirmUnknown ? "결과 확인" : "다시 준비"}</button>}</div>}
    <div className={s.columns}>
      <aside className={s.context} aria-label="지식과 현재 맥락">
        <details className={s.contextDetails}><summary>지식과 원천 범위</summary><p className={s.muted}>개념 · 단원 · 문항 · 자료</p>
        <button type="button" className={s.button} disabled={!!busy} onClick={() => { const text = "등록된 지식과 원천 범위를 보여줘"; setQuery(text); void prepare(undefined, student, text); }}>원천과 포함 범위</button>
        {answer?.coverage.length ? <dl className={s.coverage}>{answer.coverage.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}
        {student && <p className={s.student}>{student.label}<small>{student.classLabel}</small></p>}</details>
      </aside>
      <section className={s.result} aria-label="준비한 결과">
        {history.length > 0 && <button type="button" className={s.textButton} disabled={busy === "confirm"} onClick={back}>이전 결과</button>}
        {answer ? <>
          <h2>{answer.summary}</h2>
          {answer.requiresStudent && <button type="button" className={s.primary} onClick={() => setPicking(true)}>학생을 연결해 계속하기</button>}
          {answer.steps.length > 0 && <ol className={s.path} aria-label="연결 경로와 근거">{answer.steps.map((step, index) => <li key={step.id}><span className={s.stepNumber} aria-hidden="true">{index + 1}</span><div><strong>{step.title}</strong><span className={s.badge} data-state={step.state}>{labels[step.state]}</span><p>{step.note}</p></div></li>)}</ol>}
          {answer.details.length > 0 && <details className={s.details}><summary>출처·검토 이력</summary>{answer.details.map(item => <div key={item.title}><h3>{item.title}</h3><p>{item.text}</p></div>)}</details>}
        </> : !busy && !error ? <p className={s.empty}>어떤 자료가 필요한지 알려 주세요.</p> : null}
      </section>
      <section className={s.next} aria-label="다음 작업">
        {execution ? <><h2>{execution.message}</h2><details className={s.details}><summary>실행 이력</summary>{execution.details.map(text => <p key={text}>{text}</p>)}</details>{execution.state === "preparing" ? <button type="button" className={s.primary} disabled={!!busy} onClick={() => void confirm()}>결과 확인</button> : answer?.action?.kind === "plan" ? <button type="button" className={s.button} disabled={!!busy} onClick={() => void observe()}>이후 관찰</button> : null}{feedback && <div className={s.feedback}><h3>{feedback.summary}</h3>{feedback.details.map(text => <p key={text}>{text}</p>)}</div>}</> : answer?.action ? <>
          <h2>{answer.action.kind === "plan" ? "계획 변경 확인" : answer.action.kind === "relation" ? "관계 검토" : "게시 내용 확인"}</h2>
          <dl className={s.diff}>{answer.action.changes.map(change => <div key={change.label}><dt>{change.label}</dt><dd><span>{change.before}</span><span aria-hidden="true"> → </span><strong>{change.after}</strong></dd></div>)}</dl>
          {answer.action.effects.map(text => <p className={s.muted} key={text}>{text}</p>)}
          <button type="button" className={s.primary} disabled={!!busy || (answer.action.kind === "plan" && !student)} onClick={() => void confirm()}>{confirmUnknown ? "결과 확인" : answer.action.label}</button>
          {answer.action.kind === "plan" && !student && <p>학생을 연결한 뒤 다시 준비해 주세요.</p>}
        </> : <><h2>다음 작업</h2><p className={s.muted}>검토가 필요하면 변경 내용을 여기에 준비합니다.</p></>}
      </section>
    </div>
    {picking && <StudentPicker source={source} onClose={() => setPicking(false)} onSelect={connect} returnFocus={pickerButton} />}
  </div>;
}
function StudentPicker({ source, onSelect, onClose, returnFocus }: { source: OntologyWorkspaceSource; onSelect: (student: WorkspaceStudent) => void; onClose: () => void; returnFocus: React.RefObject<HTMLButtonElement | null> }) {
  const [students, setStudents] = useState<WorkspaceStudent[] | null>(null), [error, setError] = useState(""), [query, setQuery] = useState(""), [retry, setRetry] = useState(0);
  useEffect(() => { const controller = new AbortController(); source.students(controller.signal).then(value => { if (!controller.signal.aborted) { setStudents(value); setError(""); } }).catch(() => { if (!controller.signal.aborted) setError("학생 목록을 불러오지 못했습니다."); }); return () => controller.abort(); }, [source, retry]);
  const visible = students?.filter(item => `${item.label} ${item.classLabel}`.includes(query));
  return <PickerDialog title="학생 연결" onClose={onClose} returnFocus={returnFocus} size="fit"><label className={s.pickerSearch}>학생·반 찾기<input value={query} onChange={event => setQuery(event.target.value)} /></label>{error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>다시 불러오기</button></div> : students === null ? <p role="status">학생을 불러오는 중…</p> : visible?.length ? <ul className={s.pickerList}>{visible.map(item => <li key={`${item.id}:${item.classId}`}><button type="button" onClick={() => onSelect(item)}>{item.label} · {item.classLabel}</button></li>)}</ul> : <p>조건에 맞는 학생이 없습니다.</p>}</PickerDialog>;
}
