import { createRoot } from "react-dom/client";
import { GradeSheet } from "../../src/components/test/GradeSheet";
import { RETRY_QA_TEST_ID } from "../../src/mocks/textbookRetryFixture";
import "../../src/app/globals.css";
import "katex/dist/katex.min.css";
import chrome from "../../src/components/chrome/AppChrome.module.css";

// Only loaded by the isolated Vite QA script. API calls are intercepted by Playwright.
createRoot(document.getElementById("root")!).render(
  <div className={chrome.shell}>
    <aside className={chrome.sidebar}>
      <p className={chrome.brand}>오늘의수학</p>
      <nav className={chrome.nav}>
        <a href="#">시험지 만들기</a>
      </nav>
    </aside>
    <div className={chrome.mainArea}>
      <header className={chrome.topbar}>작업실 › 채점</header>
      <div id="main-content" className={chrome.content}>
        <GradeSheet testId={RETRY_QA_TEST_ID} />
      </div>
    </div>
  </div>,
);
