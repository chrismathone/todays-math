import { useState } from "react";
import { createRoot } from "react-dom/client";

import { TextbookStudioView } from "../../src/components/textbook/TextbookStudioView";
import { requestTextbookNavigation } from "../../src/lib/textbook/navigation";
import "../../src/app/globals.css";
import "katex/dist/katex.min.css";
import "./harness.css";

type View = "textbook" | "other";

/**
 * 작업실 틀의 최소 모형 — 제품의 작업실(`UnifiedWorkspace`)이 아니다.
 * 흉내 내는 것은 둘뿐이다: 화면을 내리지 않고 `hidden` 으로 가린다는 것, 그리고 화면을 바꾸기 전에
 * `requestTextbookNavigation` 으로 묻는다는 것. 교재 화면 자체는 제품 컴포넌트 그대로다.
 */
function Shell() {
  const [view, setView] = useState<View>("textbook");
  const go = (next: View) => {
    if (next === view) return;
    // 교재 화면이 붙잡으면 여기서 멈춘다 — 저장하거나 버린 뒤에 교재 화면이 넘겨준 길을 부른다
    if (next !== "textbook" && !requestTextbookNavigation(() => setView(next)))
      return;
    setView(next);
  };
  return (
    <div className="harness" data-view={view}>
      <nav className="harness-nav" aria-label="작업실 메뉴">
        <button
          type="button"
          aria-pressed={view === "textbook"}
          onClick={() => go("textbook")}
        >
          교재 제작
        </button>
        <button
          type="button"
          aria-pressed={view === "other"}
          onClick={() => go("other")}
        >
          다른 화면
        </button>
        <a href="/e2e/textbook-admin/index.html?away=1">작업실 밖</a>
      </nav>
      <main hidden={view !== "textbook"}>
        <TextbookStudioView />
      </main>
      <main hidden={view !== "other"}>
        <h1>다른 화면</h1>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Shell />);
