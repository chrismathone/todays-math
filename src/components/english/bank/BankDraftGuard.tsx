import { useRef, useState } from "react";
import ConfirmDialog from "@/components/unified/ConfirmDialog";
import { useUnsavedBankDraft } from "./bankClient";

/** Keep the editor mounted while the outer workspace is hidden; only discard explicitly. */
export function useBankDraftGuard(dirty: boolean, busy: boolean) {
  const [pending, setPending] = useState<{ action: () => void } | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useUnsavedBankDraft(dirty);
  const guard = (action: () => void) => {
    if (busy) return;
    if (!dirty) {
      action();
      return;
    }
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPending({ action });
  };
  const confirmation = pending ? (
    <ConfirmDialog
      title="작성 중인 내용을 버릴까요?"
      description="저장하지 않은 내용이 있습니다. 계속 편집하거나 내용을 버리고 이동할 수 있습니다."
      confirmLabel="버리고 이동"
      returnFocus={returnFocus}
      onCancel={() => setPending(null)}
      onConfirm={() => {
        pending.action();
        setPending(null);
      }}
    />
  ) : null;
  return { guard, confirmation };
}
