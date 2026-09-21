/**
 * 담은 문항 — **현행**을 진짜 작업실로 재는 화면(트랙 41).
 * 원장님 2026-09-21 «담은걸 확인하거나 빼거나 어떤걸 담았는지 체크할 수 있는기능이 없는듯».
 *
 * 이 파일은 **제품이 아니다.** D-07 이라 구현은 안 하고, 시안을 고르시기 전에 «지금 무엇이
 * 되고 무엇이 어긋나는가»를 실제 브라우저에서 재려고 만든 화면이다(`current.spec.ts`).
 *
 * - 작업실(`StudioView`)은 **진짜**다.
 * - 둘레(왼쪽 메뉴·위 띠·안쪽 여백)는 `frame.css` 의 대역이다 — 폭만 제품과 같게 맞췄다.
 * - 아래 «④ 문제 순서»도 대역이다. `UnifiedWorkspace` 의 `add`(같은 id 는 제자리에서 갈고
 *   새것은 뒤에 붙인다)와 `toggle` 의 빼기만 옮겼다. 재려는 것은 «작업실이 빼기를 아는가»이고,
 *   작업실이 시험지에 대해 받는 것은 `pickedCount`(숫자)와 `onAdd` 뿐이라 대역의 세부가
 *   답을 바꾸지 못한다.
 *
 * 보는 법: `npx vite --config e2e/cart-review/vite.config.mts` 뒤 http://127.0.0.1:4193/
 */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import StudioView from "../../src/components/unified/StudioView";
import { DevAiProvider } from "../../src/components/unified/useDevAi";
import type { StudioProblem } from "../../src/components/unified/types";
import "katex/dist/katex.min.css";
import "./frame.css";

function Current() {
  const [selected, setSelected] = useState<StudioProblem[]>([]);
  // UnifiedWorkspace 의 `add` 와 같은 규칙 — 같은 id 는 제자리에서 갈고 새것은 뒤에.
  const add = (problems: StudioProblem[]) =>
    setSelected((current) => {
      const eligible = problems.filter((problem) => problem.eligible !== false);
      const updates = new Map(eligible.map((p) => [p.id, p]));
      return [
        ...current.map((p) => updates.get(p.id) ?? p),
        ...eligible.filter((p) => !current.some((old) => old.id === p.id)),
      ];
    });
  return (
    <>
      <div className="frame">
        <nav className="frameNav" aria-label="메뉴 대역">
          <p>자료 제작</p>
          <p>
            시험지 · 내보내기<b>{selected.length}</b>
          </p>
        </nav>
        <div className="frameMain">
          <header className="frameTop">
            <span>시험지</span>
            <b>{selected.length}</b>
          </header>
          <main className="frameContent">
            <DevAiProvider>
              <StudioView
                onAdd={add}
                onExport={() => {}}
                pickedCount={selected.length}
              />
            </DevAiProvider>
          </main>
        </div>
      </div>
      <section className="standIn" aria-label="시험지 구성 문제 순서 대역">
        <h2>④ 문제 순서 (대역) · {selected.length}</h2>
        <ol>
          {selected.map((problem, index) => (
            <li key={problem.id}>
              <span>{problem.sourceLabel}</span>
              <button
                type="button"
                aria-label={`${index + 1}번 문제 빼기`}
                onClick={() =>
                  setSelected((current) =>
                    current.filter((p) => p.id !== problem.id),
                  )
                }
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        {/* 새 시험지(`createDraft`)는 담은 목록만 비운다 — 작업실은 다시 그리지 않는다. */}
        <button type="button" onClick={() => setSelected([])}>
          새 시험지 (대역)
        </button>
      </section>
      <output aria-label="시험지 담은 문제">
        {JSON.stringify(
          selected.map((problem) => ({
            id: problem.id,
            reviewed: problem.studioCrop?.reviewed ?? false,
            revision: problem.studioCrop?.revision ?? 0,
          })),
        )}
      </output>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Current />
  </StrictMode>,
);
