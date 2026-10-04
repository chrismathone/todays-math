import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { TextbookStudioView } from "../../src/components/textbook/TextbookStudioView";
import { requestTextbookNavigation } from "../../src/lib/textbook/navigation";
import "../../src/app/globals.css";
import "katex/dist/katex.min.css";
import "./harness.css";

type View = "textbook" | "other";

const viewOf = (hash: string): View =>
  hash === "#other" ? "other" : "textbook";

/**
 * 작업실 틀의 최소 모형 — 제품의 작업실(`UnifiedWorkspace`)이 아니다.
 * 흉내 내는 것은 셋이다: 화면을 내리지 않고 `hidden` 으로 가린다는 것, 화면을 바꾸기 전에
 * `requestTextbookNavigation` 으로 묻는다는 것, 그리고 주소의 # · 뒤로가기에서는 넘겨준 길이
 * 주소를 되돌린 뒤 **같은 동기화를 다시 돌려 한 번 더 묻는다**는 것. 교재 화면 자체는 제품 컴포넌트 그대로다.
 */
function Shell() {
  const [view, setView] = useState<View>(() => viewOf(window.location.hash));
  const accepted = useRef(window.location.href);

  const perform = useCallback((next: View) => {
    const url = new URL(window.location.href);
    url.hash = next === "textbook" ? "" : next;
    if (url.href !== window.location.href)
      window.history.pushState(null, "", url);
    accepted.current = window.location.href;
    setView(next);
  }, []);

  // 옆 메뉴 — 교재 화면이 붙잡으면 여기서 멈춘다. 저장하거나 버린 뒤에 교재 화면이 넘겨준 길을 부른다
  const go = (next: View) => {
    if (next === view) return;
    if (next !== "textbook" && !requestTextbookNavigation(() => perform(next)))
      return;
    perform(next);
  };

  // 주소의 # · 뒤로가기 — 붙잡히면 주소를 받아들인 곳으로 되돌린다
  useEffect(() => {
    const sync = () => {
      const next = viewOf(window.location.hash);
      const requested = window.location.href;
      if (
        next !== "textbook" &&
        !requestTextbookNavigation(() => {
          window.history.replaceState(window.history.state, "", requested);
          sync();
        })
      ) {
        const previous = new URL(accepted.current);
        previous.hash = "";
        window.history.replaceState(window.history.state, "", previous);
        return;
      }
      accepted.current = window.location.href;
      setView(next);
    };
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

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
