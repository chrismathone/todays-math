/**
 * 담은 문항 — **진짜 `UnifiedWorkspace`** 를 띄우는 화면(트랙 41 조사 → 트랙 44 구현).
 * 원장님 2026-09-21 «담은걸 확인하거나 빼거나 어떤걸 담았는지 체크할 수 있는기능이 없는듯» →
 * 안 D 확정(«추천대로»).
 *
 * 트랙 41 때는 작업실만 진짜였고 ④ 문제 순서·새 시험지는 대역이었다. 트랙 44 에서 장부를 시험지
 * 목록 하나로 합치면서 **배선 자체**를 재야 해 작업실·④ 시험지 구성·문제은행·새 시험지를 전부
 * 진짜로 띄운다. 바꾼 것은 Next·로그인 모듈 대역뿐이다(`vite.config.mts`).
 *
 * - 둘레(왼쪽 메뉴·위 띠)도 진짜다 — 작업실은 컨테이너 질의로 제 폭을 보고 배치를 바꾸므로
 *   둘레가 진짜여야 1280 모습이 맞다.
 * - 전역 CSS 는 제품 것(`globals.css`)을 그대로 쓰고, 글꼴만 시안 화면(`wire.tsx`)과 같은
 *   `frame.css` 의 Arial · 맑은 고딕으로 둔다 — 시안과 견줄 때 글꼴 차이가 섞이지 않게.
 * - 문제은행에 문항 하나를 둔다 — «담은 문항» 목록이 시험지 전체(문제은행 것까지)를 보이는지 재려고.
 *
 * 보는 법: `npx vite --config e2e/cart-review/vite.config.mts` 뒤 http://127.0.0.1:4193/#studio
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import UnifiedWorkspace from "../../src/components/unified/UnifiedWorkspace";
import type { BankData } from "../../src/components/unified/types";
import "katex/dist/katex.min.css";
// 제품의 전역 CSS(테일윈드 기본값·토큰) — 없으면 box-sizing 이 달라 둘레 폭부터 틀린다.
import "../../src/app/globals.css";
import "./frame.css";

const initialData: BankData = {
  problems: [
    {
      id: "bank-linear-1",
      content:
        "어떤 수에 $3$ 을 더한 값의 $2$ 배가 $14$ 일 때, 어떤 수를 구하시오.",
      answer: "$4$",
      solution: "",
      grade: "중1",
      chapter: "일차방정식",
      section: "일차방정식의 활용",
      difficulty: "중",
      problemCode: "B-0001",
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
      source: "textbook",
      familyKey: null,
      originProblemId: null,
      questionTypeRaw: "단답형",
      eligible: true,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
  grades: [{ grade: "중1", count: 1 }],
  chapters: ["일차방정식"],
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UnifiedWorkspace
      initialData={initialData}
      allowedMenus={["studio", "bank", "export"]}
    />
  </StrictMode>,
);
