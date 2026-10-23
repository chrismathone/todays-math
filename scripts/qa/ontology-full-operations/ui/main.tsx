import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import OntologyWorkspace from "@/components/math-ontology/OntologyWorkspace";
import { OntologyWorkspaceError, type OntologyWorkspaceSource, type WorkspaceAnswer } from "@/components/math-ontology/source";
import workroom from "@/components/unified/Workroom.module.css";
import WorkspaceNavigation from "@/components/unified/WorkspaceNavigation";
import type { WorkspaceIconName } from "@/components/unified/WorkspaceIcon";
import "@/app/globals.css";
import "katex/dist/katex.min.css";
import "./fixture.css";
const states = ["normal", "empty", "error-retry", "delay", "forbidden", "stale", "lost-result", "relation", "publication", "reprepare"] as const;
type Scenario = typeof states[number];
// The real production navigation component/CSS with the actual eleven visible
// Math menu labels. Only the selected panel and account are synthetic here.
const menus = [
  ["home", "오늘의 작업", "홈", "home"], ["bank", "시험지 만들기", "만들기", "bank"],
  ["arithmetic", "연산대장", "연산대장", "calculator"], ["studio", "문제 추출", "문제 추출", "crop"],
  ["library", "내 시험지", "보관함", "folder"], ["textbook", "교재 제작", "교재 제작", "paper"],
  ["teaching", "수업 · 학생 관리", "수업·학생", "class"], ["concept", "오늘의 개념", "개념", "play"],
  ["conceptBlank", "개념 백지", "백지", "pen"], ["srs", "오늘의 기억 · SRS", "기억 학습", "clock"],
  ["ontology", "지식 작업실", "지식", "search"],
].map(([id, label, short, icon]) => ({ id, label, short, icon: icon as WorkspaceIconName }));
function fixture(scenario: Scenario, count: (kind: string) => void): OntologyWorkspaceSource {
  let attempts = 0; const committed = new Set<string>();
  async function pause(signal: AbortSignal) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, scenario === "delay" ? 5000 : 300);
      signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); }, { once: true });
    });
  }
  return {
    async coverage(signal) { count("coverage"); await pause(signal); return { id: "synthetic-coverage", summary: "합성 원천의 포함 범위입니다.", steps: [], details: [{ title: "합성 모집단", text: "직접 조회 경로를 검수하는 합성 수치입니다. API·DB·모델 호출이 없습니다." }], coverage: [{ label: "합성 등록 개체", value: "100 / 100" }, { label: "합성 원천 연결", value: "80 / 100" }, { label: "공식 기준 대응", value: "미확인" }] }; },
    async students(signal) { await pause(signal); return scenario === "empty" ? [] : [{ id: "00000000-0000-4000-8000-000000000001", classId: "00000000-0000-4000-8000-000000000002", branchId: null, label: "합성 학생", classLabel: "합성 5학년 반" }]; },
    async run(input, signal) {
      count("prepare"); await pause(signal); attempts++;
      if (scenario === "error-retry" && attempts === 1) throw new OntologyWorkspaceError("UNAVAILABLE", "자료를 준비하지 못했습니다. 다시 시도해 주세요.");
      if (scenario === "forbidden") throw new OntologyWorkspaceError("FORBIDDEN", "현재 권한으로 볼 수 없습니다.");
      if (scenario === "empty") return { id: "empty", summary: "확인할 자료가 없습니다.", steps: [], details: [], coverage: [] };
      const kind = (scenario === "relation" || scenario === "reprepare") ? "relation" : scenario === "publication" ? "publication" : "plan";
      const answer: WorkspaceAnswer = { id: `answer-${attempts}`, summary: scenario === "reprepare" ? input.previousReviewId ? "새 근거로 후보를 다시 준비했습니다." : "근거를 더 확인해야 하는 후보입니다." : kind === "plan" ? input.student ? "계획 변경을 준비했습니다." : "학생을 연결하면 계획을 준비합니다." : kind === "relation" ? "검토할 연결을 준비했습니다." : "게시할 변경을 준비했습니다.", requiresStudent: kind === "plan" && !input.student,
        steps: [{ id: "s1", title: "일의 자리에서 받아올린 $1$의 값", note: "실제 원천의 공개 개념명입니다. 아래 기록과 수치는 합성입니다.", state: "observed" }, { id: "s2", title: "분수 $\\frac{1}{2}$와 단원", note: "분수 식은 렌더 검수용 합성 예시입니다.", state: "reviewed" }, { id: "s3", title: "검토할 내용", note: "교사가 확인하기 전의 제안입니다.", state: "candidate" }],
        details: [{ title: "검수 데이터", text: "이 화면의 학생·기록·수치·AI 결과는 모두 합성입니다. 실제 React 컴포넌트를 실행하며 API·모델·DB 호출은 없습니다." }, ...(kind === "relation" ? [{ title: "합성 출처와 검증", text: "urn:todaymath:assertion:model:00000000-0000-4000-8000-000000000017\nrdf-validate-shacl 0.6.5\nmodel-packet:sha256:" + "a".repeat(64) + ";exact-witness:sha256:" + "b".repeat(64) + "\n26. 10. 23. 오후 8:17 · 합성 게시 이력입니다.\n분수 $\\frac{1}{2}$는 수식 검수용 합성 설명입니다." }] : [])], coverage: [{ label: "원천", value: "합성 예시 3종" }, { label: "미확인", value: "교육적 효과" }],
        ...(scenario === "reprepare" ? { reprepare: { previousReviewId: "00000000-0000-4000-8000-000000000011", expectedPreviousRevision: attempts, query: input.query } } : {}),
        ...(scenario !== "reprepare" && (kind !== "plan" || input.student) ? { action: { kind, id: "fixture-proposal", sealHash: "fixture-only", label: kind === "plan" ? "이 계획으로 바꾸기" : kind === "relation" ? "이 연결 승인하기" : "검토한 내용 게시하기", changes: [{ label: kind === "plan" ? "하루 목표" : "검토 상태", before: kind === "plan" ? "10문제" : "검토 대기", after: kind === "plan" ? "15문제" : "승인" }], effects: [kind === "plan" ? "시작한 학습은 유지됩니다." : "승인과 게시 이력을 남깁니다."] } } : {}) };
      return answer;
    },
    async confirm(action, signal) {
      count("confirm"); await pause(signal); const key = `${action.kind}:${action.operation ?? ""}:${action.id}`;
      if (scenario === "stale") throw new OntologyWorkspaceError("STALE", "기록이나 근거가 바뀌었습니다. 다시 준비해 주세요.");
      if (scenario === "lost-result" && !committed.has(key)) { committed.add(key); count("write"); throw new OntologyWorkspaceError("NETWORK", "결과를 확인하지 못했습니다. 다시 확인해 주세요."); }
      if (!committed.has(key)) { committed.add(key); count("write"); }
      return { id: "fixture-receipt", state: action.kind === "publication" && action.operation !== "revoke" ? "published" : "applied", message: action.operation === "revoke" ? "활성 지식 판을 철회했습니다." : action.kind === "publication" ? "검토한 내용을 게시했습니다." : action.kind === "relation" ? action.operation === "retire" ? "연결 폐기를 기록했습니다." : "연결을 승인했습니다." : "계획을 변경했습니다.", details: ["합성 영수증 · 실행은 한 번만 기록합니다."] };
    },
    async history(signal) { await pause(signal); count("history"); return { id: "fixture-history", summary: "최근 검토·실행 이력입니다.", steps: [{ id: "synthetic-history", title: "학생 계획 변경", note: "합성 이력 · API/DB 조회 없음", state: "observed" }], details: [{ title: "합성 연결 이력", text: "합성 원천과 연결 · 실제 DB 조회 없음", reviewId: "00000000-0000-4000-8000-000000000003" }], coverage: [] }; },
    async review(reviewId, signal) { await pause(signal); count("prepare-review"); return { id: reviewId, summary: "승인한 연결을 다시 검토합니다.", steps: [{ id: "s", title: "합성 개념 A", note: "연결", state: "observed" }, { id: "o", title: "합성 단원 B", note: "교육적 효과 미확인", state: "candidate" }], details: [], coverage: [], action: { kind: "relation", operation: "retire", id: reviewId, revision: 1, label: "이 연결 폐기 기록하기", changes: [{ label: "합성 개념 A → 합성 단원 B", before: "승인한 연결", after: "다음 게시에서 제외" }], effects: ["다음 게시 전까지 현재 지식 판은 유지됩니다."] } }; },
    async publication(signal) { await pause(signal); count("prepare-publication"); return { id: "fixture-publication", summary: "게시할 변경을 준비했습니다.", steps: [], details: [{ title: "합성 게시 준비", text: "실제 운영이 아닌 검수용 합성 결과입니다." }], coverage: [], action: { kind: "publication", id: "fixture-publication", label: "검토한 내용 게시하기", changes: [{ label: "지식 판", before: "기존 합성 판", after: "새 합성 판" }], effects: ["검증이 성공할 때 활성 판을 교체합니다."] } }; },
    async revocation(signal) { await pause(signal); count("prepare-revocation"); return { id: "fixture-revocation", summary: "활성 지식 판 철회를 준비했습니다.", steps: [], details: [], coverage: [], action: { kind: "publication", operation: "revoke", id: "fixture-revocation", label: "이 지식 판 철회하기", changes: [{ label: "활성 지식 판", before: "사용 중", after: "철회" }], effects: ["새 게시까지 이 판을 이용한 새 실행을 중단합니다."] } }; },
    async feedback(_result, signal) { count("feedback"); await pause(signal); return { summary: "아직 후속 관찰이 없습니다.", details: ["학습 효과나 원인으로 해석하지 않습니다."] }; },
  };
}
function App() {
  const initial = new URLSearchParams(location.search).get("case") as Scenario;
  const [scenario, setScenario] = useState<Scenario>(states.includes(initial) ? initial : "normal"), [generation, setGeneration] = useState(0), [counts, setCounts] = useState<Record<string, number>>({});
  const [view, setView] = useState("ontology");
  const port = useMemo(() => fixture((generation >= 0 ? scenario : scenario), kind => setCounts(value => ({ ...value, [kind]: (value[kind] ?? 0) + 1 }))), [scenario, generation]);
  return <><details className="fixture-tools"><summary>격리 검수 도구 · 합성 데이터 · API/모델/DB 호출 0</summary><label>상태 <select value={scenario} onChange={event => { setScenario(event.target.value as Scenario); setCounts({}); }}>{states.map(state => <option key={state}>{state}</option>)}</select></label><button onClick={() => { setGeneration(value => value + 1); setCounts({}); }}>처음부터</button><output aria-label="fixture calls">{JSON.stringify(counts)}</output></details>
    <div className={workroom.workspace} data-product="math" data-authenticated="true" data-menu-count={menus.length}>
      <aside className={workroom.sidebar}><button className={workroom.brand} onClick={() => setView("home")}><span>오늘의 수학</span></button><WorkspaceNavigation items={menus} view={view} ownStart="textbook" onNavigate={setView} /></aside>
      <main className={workroom.main}><header className={workroom.topbar}><div className={workroom.breadcrumb}><strong>{menus.find(menu => menu.id === view)?.label}</strong></div><span>합성 교사 · 격리 검수</span></header>
        <div className={workroom.viewContent}>{view === "ontology" ? <OntologyWorkspace source={port} scopeKey={`${scenario}:${generation}`} canPublish /> : <div className="fixture-panel"><h1>{menus.find(menu => menu.id === view)?.label}</h1><p>탐색 접근 검수용 합성 패널입니다. 실제 자료를 조회하지 않습니다.</p><button onClick={() => setView("ontology")}>지식 작업실로 돌아가기</button></div>}</div>
      </main>
    </div></>;
}
createRoot(document.getElementById("root")!).render(<App />);
