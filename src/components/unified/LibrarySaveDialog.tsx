"use client";

import { useRef, useState } from "react";
import type {
  DocumentSharing,
  DocumentVisibility,
} from "@/contracts/privateWorkspace.contract";
import ConfirmDialog from "./ConfirmDialog";
import { cloudError } from "./privateCloudClient";
import s from "./LibrarySaveDialog.module.css";

/** Only explicit saves open this dialog; automatic recovery never widens access. */
export function useLibrarySaveConfirmation(
  branchId: string | null | undefined,
  save: (sharing?: DocumentSharing) => Promise<boolean | void>,
  initialVisibility: DocumentVisibility = "private",
) {
  const [openBranch, setOpenBranch] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  return {
    requestSave: () => {
      if (!branchId) {
        void save().catch(() => {});
        return;
      }
      opener.current = document.activeElement as HTMLElement | null;
      setOpenBranch(branchId);
    },
    dialog:
      openBranch && openBranch === branchId ? (
        <LibrarySaveDialog
          key={openBranch}
          branchId={openBranch}
          initialVisibility={initialVisibility}
          save={save}
          opener={opener}
          onClose={() => setOpenBranch(null)}
        />
      ) : null,
  };
}

function LibrarySaveDialog({
  branchId,
  initialVisibility,
  save,
  opener,
  onClose,
}: {
  branchId: string;
  initialVisibility: DocumentVisibility;
  save: (sharing?: DocumentSharing) => Promise<boolean | void>;
  opener: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const [visibility, setVisibility] = useState(initialVisibility);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <ConfirmDialog
      title="우리학원 시험지에 저장"
      description="공개 범위를 확인한 뒤 저장해 주세요. 공개한 자료는 같은 학원 선생님들이 사본으로 사용할 수 있습니다."
      confirmLabel="저장 확인"
      returnFocus={opener}
      busy={busy}
      error={error}
      onCancel={onClose}
      onConfirm={() => {
        void (async () => {
          setBusy(true);
          setError("");
          try {
            const saved = await save({
              visibility,
              sharedBranchId: visibility === "branch" ? branchId : null,
            });
            if (saved === false)
              setError(
                "저장하지 못했습니다. 자료의 저장 오류를 확인한 뒤 다시 시도해 주세요.",
              );
            else onClose();
          } catch (cause) {
            setError(cloudError(cause));
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <fieldset className={s.visibility} disabled={busy}>
        <legend>학원 공개 범위</legend>
        <label>
          <input
            type="radio"
            name="document-visibility"
            checked={visibility === "private"}
            onChange={() => setVisibility("private")}
          />
          학원에 비공개
        </label>
        <label>
          <input
            type="radio"
            name="document-visibility"
            checked={visibility === "branch"}
            onChange={() => setVisibility("branch")}
          />
          학원에 공개
        </label>
      </fieldset>
    </ConfirmDialog>
  );
}
