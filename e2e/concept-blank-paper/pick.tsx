import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import "../../src/app/globals.css";
import "./harness.css";
import ConceptBlankView from "../../src/components/concept-blank/ConceptBlankView";
import ConceptBlankPaper from "../../src/components/concept-blank/ConceptBlankPaper";
import { parseConceptBlankView } from "../../src/components/concept-blank/paper/view";
import { composeSheets } from "../../src/lib/concept-blank/compose";
import { loadGradeBank } from "../../src/lib/concept-blank/bank/loadAuthored";
import {
  decodeSelection,
  encodeSelection,
} from "../../src/lib/concept-blank/selectionCodec";
import { BLANK_TREE } from "../../src/lib/concept-blank/sections";
import w from "../../src/components/unified/Workroom.module.css";

// 실제 컴포넌트·초5 은행·작업실 토큰. API는 브라우저 시험에서 메모리 대역으로 받는다.
const bank = await loadGradeBank("초5");
const url = new URL(location.href);
const printing = url.searchParams.has("s");
if (
  !printing &&
  !url.searchParams.has("blank") &&
  !url.searchParams.has("blankDoc")
) {
  const sections = BLANK_TREE.find((grade) => grade.grade === "초5")!
    .chapters.find((chapter) => chapter.title === "2-3 합동과 대칭")!
    .sections.map((section) => section.key);
  url.searchParams.set(
    "blank",
    encodeSelection({
      sections,
      forms: [
        {
          form: "term",
          counts: { 하: 3, 중: 3, 상: 2 },
          extras: { 하: 1, 중: 1, 상: 1 },
        },
        {
          form: "cloze",
          counts: { 하: 4, 중: 4, 상: 2 },
          extras: { 하: 1, 중: 1, 상: 0 },
        },
      ],
    }),
  );
  history.replaceState(null, "", url);
}
const selection = decodeSelection(url.searchParams.get("s"));
document.body.style.padding = "0";
createRoot(document.getElementById("root")!).render(
  printing && selection ? (
    <ConceptBlankPaper
      sheets={composeSheets(selection, bank)}
      view={parseConceptBlankView(url.searchParams.get("view") ?? undefined)}
    />
  ) : (
    <main
      className={w.workspace}
      style={{
        ["--font-pretendard" as string]: "cb-harness-pretendard",
        padding: "20px",
      }}
    >
      <ConceptBlankView bank={bank} storageScope="concept-blank-pick-qa" />
    </main>
  ),
);
