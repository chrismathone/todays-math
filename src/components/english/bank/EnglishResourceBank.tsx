"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import type { EnglishBankMakerSeed } from "@/contracts/englishBank.contract";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import s from "../EnglishStudio.module.css";
import { useBankDraftGuard } from "./BankDraftGuard";
import PassageBank from "./PassageBank";
import ListeningBank from "./ListeningBank";
import b from "./EnglishResourceBank.module.css";

export type EnglishResourceBankProps = {
  active?: boolean;
  allowedMenus: WorkspaceMenu[];
  onUsePassage: (seed: EnglishBankMakerSeed) => void;
  onOpenListening: (id: string) => void;
  onOpenSet: (id: string) => void;
  onNewExam?: () => void;
  onNotice?: (message: string) => void;
};

export default function EnglishResourceBank({
  active = true,
  allowedMenus,
  onUsePassage,
  onOpenListening,
  onOpenSet,
  onNewExam,
  onNotice,
}: EnglishResourceBankProps) {
  const [tab, setTab] = useState<"passage" | "listening">("passage");
  const [state, setState] = useState({ dirty: false, busy: false });
  const stateRef = useRef(state);
  const onState = useCallback((dirty: boolean, busy: boolean) => {
    stateRef.current = { dirty, busy };
    setState((old) =>
      old.dirty === dirty && old.busy === busy ? old : { dirty, busy },
    );
  }, []);
  const { guard, confirmation } = useBankDraftGuard(state.dirty, state.busy);
  const allowed = allowedMenus.includes("english-bank");
  // allowedMenus has already passed the account/pilot listening filter in the shell.
  const listeningAllowed =
    allowed && allowedMenus.includes("english-listening");
  const shownTab = listeningAllowed ? tab : "passage";
  useEffect(() => {
    if (!active || !allowed) return;
    const beforeLeave = (event: Event) => {
      if (stateRef.current.busy) {
        event.preventDefault();
        onNotice?.("자료를 저장하는 중입니다. 완료 후 이동해 주세요.");
      } else if (
        stateRef.current.dirty &&
        !window.confirm(
          "저장하지 않은 자료가 있습니다. 작성 내용은 유지됩니다. 다른 화면으로 이동할까요?",
        )
      )
        event.preventDefault();
    };
    window.addEventListener("english-bank-before-leave", beforeLeave);
    return () =>
      window.removeEventListener("english-bank-before-leave", beforeLeave);
  }, [active, allowed, onNotice]);
  return (
    <div className={`${s.studio} ${b.root}`} hidden={!active}>
      <WorkspacePageHeader
        title="자료은행"
        description="원문을 보관하고, 필요한 자료로 다시 만듭니다."
      />
      {!allowed ? (
        <p role="status" className={b.note}>
          자료은행을 이용할 권한이 없습니다.
        </p>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="자료 종류"
            className={`${s.tabs} ${b.tabs}`}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const buttons = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button",
                ),
              );
              const current = buttons.indexOf(
                event.target as HTMLButtonElement,
              );
              const index =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? buttons.length - 1
                    : (current +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        buttons.length) %
                      buttons.length;
              buttons[index]?.click();
              buttons[index]?.focus();
            }}
          >
            <button
              type="button"
              role="tab"
              id="bank-passage-tab"
              tabIndex={shownTab === "passage" ? 0 : -1}
              aria-controls="bank-passage-panel"
              aria-selected={shownTab === "passage"}
              className={s.tab}
              onClick={() => {
                if (shownTab !== "passage")
                  guard(() => {
                    onState(false, false);
                    setTab("passage");
                  });
              }}
            >
              지문은행
            </button>
            {listeningAllowed && (
              <button
                type="button"
                role="tab"
                id="bank-listening-tab"
                tabIndex={shownTab === "listening" ? 0 : -1}
                aria-controls="bank-listening-panel"
                aria-selected={shownTab === "listening"}
                className={s.tab}
                onClick={() => {
                  if (shownTab !== "listening")
                    guard(() => {
                      onState(false, false);
                      setTab("listening");
                    });
                }}
              >
                듣기은행
              </button>
            )}
          </div>
          {shownTab === "passage" ? (
            <div
              role="tabpanel"
              id="bank-passage-panel"
              aria-labelledby="bank-passage-tab"
            >
              <PassageBank
                active={active}
                allowedMenus={allowedMenus}
                busy={state.busy}
                guard={guard}
                onState={onState}
                onUsePassage={onUsePassage}
                onOpenSet={onOpenSet}
                onNewExam={onNewExam}
                onNotice={onNotice}
              />
            </div>
          ) : (
            <div
              role="tabpanel"
              id="bank-listening-panel"
              aria-labelledby="bank-listening-tab"
            >
              <ListeningBank
                active={active && listeningAllowed}
                onOpenListening={onOpenListening}
                onState={onState}
              />
            </div>
          )}
          {confirmation}
        </>
      )}
    </div>
  );
}
