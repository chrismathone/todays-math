import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import OntologyWorkspace from "@/components/math-ontology/OntologyWorkspace";
import { OntologyWorkspaceError, type OntologyWorkspaceSource, type WorkspaceAnswer } from "@/components/math-ontology/source";
import workroom from "@/components/unified/Workroom.module.css";
import "@/app/globals.css";
import "katex/dist/katex.min.css";
import "./fixture.css";
const states = ["normal", "empty", "error-retry", "delay", "forbidden", "stale", "lost-result", "relation", "publication"] as const;
type Scenario = typeof states[number];
function fixture(scenario: Scenario, count: (kind: string) => void): OntologyWorkspaceSource {
  let attempts = 0, committed = false;
  async function pause(signal: AbortSignal) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, scenario === "delay" ? 5000 : 300);
      signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); }, { once: true });
    });
  }
  return {
    async students(signal) { await pause(signal); return scenario === "empty" ? [] : [{ id: "00000000-0000-4000-8000-000000000001", classId: "00000000-0000-4000-8000-000000000002", branchId: null, label: "합성 학생", classLabel: "합성 5학년 반" }]; },
    async run(input, signal) {
      count("prepare"); await pause(signal); attempts++;
      if (scenario === "error-retry" && attempts === 1) throw new OntologyWorkspaceError("UNAVAILABLE", "자료를 준비하지 못했습니다. 다시 시도해 주세요.");
      if (scenario === "forbidden") throw new OntologyWorkspaceError("FORBIDDEN", "현재 권한으로 볼 수 없습니다.");
      if (scenario === "empty") return { id: "empty", summary: "확인할 자료가 없습니다.", steps: [], details: [], coverage: [] };
      const kind = scenario === "relation" ? "relation" : scenario === "publication" ? "publication" : "plan";
      const answer: WorkspaceAnswer = { id: `answer-${attempts}`, summary: kind === "plan" ? input.student ? "계획 변경을 준비했습니다." : "학생을 연결하면 계획을 준비합니다." : kind === "relation" ? "검토할 연결을 준비했습니다." : "게시할 변경을 준비했습니다.", requiresStudent: kind === "plan" && !input.student,
        steps: [{ id: "s1", title: "일의 자리에서 받아올린 $1$의 값", note: "실제 원천의 공개 개념명입니다. 아래 기록과 수치는 합성입니다.", state: "observed" }, { id: "s2", title: "분수 $\\frac{1}{2}$와 단원", note: "분수 식은 렌더 검수용 합성 예시입니다.", state: "reviewed" }, { id: "s3", title: "검토할 내용", note: "교사가 확인하기 전의 제안입니다.", state: "candidate" }],
        details: [{ title: "검수 데이터", text: "이 화면의 학생·기록·수치·AI 결과는 모두 합성입니다. 실제 React 컴포넌트를 실행하며 API·모델·DB 호출은 없습니다." }], coverage: [{ label: "원천", value: "합성 예시 3종" }, { label: "미확인", value: "교육적 효과" }],
        ...(kind !== "plan" || input.student ? { action: { kind, id: "fixture-proposal", sealHash: "fixture-only", label: kind === "plan" ? "이 계획으로 바꾸기" : kind === "relation" ? "이 연결 승인하기" : "검토한 내용 게시하기", changes: [{ label: kind === "plan" ? "하루 목표" : "검토 상태", before: kind === "plan" ? "10문제" : "검토 대기", after: kind === "plan" ? "15문제" : "승인" }], effects: [kind === "plan" ? "시작한 학습은 유지됩니다." : "승인과 게시 이력을 남깁니다."] } } : {}) };
      return answer;
    },
    async confirm(_action, signal) {
      count("confirm"); await pause(signal);
      if (scenario === "stale") throw new OntologyWorkspaceError("STALE", "기록이나 근거가 바뀌었습니다. 다시 준비해 주세요.");
      if (scenario === "lost-result" && !committed) { committed = true; count("write"); throw new OntologyWorkspaceError("NETWORK", "결과를 확인하지 못했습니다. 다시 확인해 주세요."); }
      if (!committed) { committed = true; count("write"); }
      return { id: "fixture-receipt", state: scenario === "publication" ? "published" : "applied", message: scenario === "publication" ? "검토한 내용을 게시했습니다." : scenario === "relation" ? "연결을 승인했습니다." : "계획을 변경했습니다.", details: ["합성 영수증 · 실행은 한 번만 기록합니다."] };
    },
    async feedback(_result, signal) { count("feedback"); await pause(signal); return { summary: "아직 후속 관찰이 없습니다.", details: ["학습 효과나 원인으로 해석하지 않습니다."] }; },
  };
}
function App() {
  const initial = new URLSearchParams(location.search).get("case") as Scenario;
  const [scenario, setScenario] = useState<Scenario>(states.includes(initial) ? initial : "normal"), [generation, setGeneration] = useState(0), [counts, setCounts] = useState<Record<string, number>>({});
  const port = useMemo(() => fixture((generation >= 0 ? scenario : scenario), kind => setCounts(value => ({ ...value, [kind]: (value[kind] ?? 0) + 1 }))), [scenario, generation]);
  return <><details className="fixture-tools"><summary>격리 검수 도구 · 합성 데이터 · API/모델/DB 호출 0</summary><label>상태 <select value={scenario} onChange={event => { setScenario(event.target.value as Scenario); setCounts({}); }}>{states.map(state => <option key={state}>{state}</option>)}</select></label><button onClick={() => { setGeneration(value => value + 1); setCounts({}); }}>처음부터</button><output aria-label="fixture calls">{JSON.stringify(counts)}</output></details><div className={workroom.workspace}><div className="fixture-shell"><aside className="fixture-navigation"><strong>오늘의 수학</strong><nav aria-label="작업실"><span>학생</span><span>오늘의 기억 · SRS</span><strong aria-current="page">지식 작업실</strong></nav></aside><main className="fixture-content"><OntologyWorkspace source={port} scopeKey={`${scenario}:${generation}`} /></main></div></div></>;
}
createRoot(document.getElementById("root")!).render(<App />);
