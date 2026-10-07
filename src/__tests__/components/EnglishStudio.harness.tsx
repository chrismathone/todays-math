/**
 * 영어 화면 시험 공용 틀 — 셸(`UnifiedWorkspace`)이 `EnglishStudio` 에 주는 props 를 작은 상태로 흉내 낸다.
 * (뷰 · «새 시험 등록» 창 열림 · 딥링크 요청 · 알림 줄). 시험 파일 셋(EnglishStudio · EnglishEditor ·
 * EnglishLibrary)이 같이 쓴다. `.test.tsx` 가 아니라 vitest 가 수집하지 않는다.
 */
import { useState } from "react";
import { screen } from "@testing-library/react";
import { vi, type Mock } from "vitest";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";

import EnglishStudio, {
  type EnglishView,
} from "@/components/english/EnglishStudio";

export type HarnessLog = {
  notices: { message: string; tone: "status" | "alert" }[];
  setOpened: Mock<() => void>;
};

/** 틀이 지금 보여 주는 뷰 — 셸이 `onNavigate` 로 받았을 값 */
export const currentView = () =>
  screen.getByTestId("harness").getAttribute("data-view");

/** jsdom 에는 `<dialog>.showModal` 이 없다 — 작업실 접근 시험과 같은 심 */
export function installDialogShim() {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
      },
    },
  });
}

export function makeLog(): HarnessLog {
  return { notices: [], setOpened: vi.fn<() => void>() };
}

export function Harness({
  initialView = "english",
  openSetId,
  log,
  allowedMenus,
}: {
  initialView?: EnglishView;
  openSetId?: string;
  log: HarnessLog;
  allowedMenus?: WorkspaceMenu[];
}) {
  const [view, setView] = useState<EnglishView>(initialView);
  const [newExamOpen, setNewExamOpen] = useState(false);
  const [openSetRequest] = useState(() =>
    openSetId ? { id: openSetId, version: 1 } : undefined,
  );
  return (
    <div data-testid="harness" data-view={view}>
      <nav aria-label="영어 메뉴">
        <button onClick={() => setView("english")}>학교 메뉴</button>
        <button onClick={() => setView("english-maker")}>만들기 메뉴</button>
        <button onClick={() => setView("english-library")}>보관함 메뉴</button>
        <button onClick={() => setView("english-questions")}>
          시험지 메뉴
        </button>
      </nav>
      {/* 셸 옆 메뉴의 파란 단추 자리 — 목록이 «읽는 중»·«오류»여도 눌린다 */}
      <button type="button" onClick={() => setNewExamOpen(true)}>
        새 시험 등록(셸)
      </button>
      <EnglishStudio
        view={view}
        allowedMenus={allowedMenus}
        onNavigate={setView}
        newExamOpen={newExamOpen}
        onNewExam={() => setNewExamOpen(true)}
        onNewExamClose={() => setNewExamOpen(false)}
        openSetRequest={openSetRequest}
        onSetOpened={log.setOpened}
        onNotice={(message, tone = "status") =>
          log.notices.push({ message, tone })
        }
      />
    </div>
  );
}
