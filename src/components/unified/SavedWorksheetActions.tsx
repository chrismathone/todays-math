import { useState } from "react";
import s from "./Workroom.module.css";

export default function SavedWorksheetActions({
  title,
  current,
  error,
  onEdit,
  onRename,
  onDelete,
}: {
  title: string;
  current: boolean;
  error: string | null;
  onEdit?: () => void;
  onRename: (title: string) => boolean;
  onDelete: () => boolean;
}) {
  const [action, setAction] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(title);
  return (
    <div className={s.savedActions}>
      <div className={s.savedActionButtons}>
        <button
          type="button"
          aria-label={`${title} 이름 변경`}
          onClick={() => {
            setName(title);
            setAction("rename");
          }}
        >
          이름 변경
        </button>
        {onEdit && (
          <button type="button" aria-label={`${title} 편집`} onClick={onEdit}>
            편집
          </button>
        )}
        <button
          type="button"
          aria-label={`${title} 삭제`}
          onClick={() => setAction("delete")}
        >
          삭제
        </button>
      </div>
      {action === "rename" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (onRename(name)) setAction(null);
          }}
        >
          <label>
            새 시험지 이름
            <input
              aria-label="새 시험지 이름"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
              autoFocus
            />
          </label>
          <div className={s.savedActionButtons}>
            <button type="submit" disabled={!name.trim()}>
              이름 저장
            </button>
            <button type="button" onClick={() => setAction(null)}>
              취소
            </button>
          </div>
        </form>
      )}
      {action === "delete" && (
        <div>
          <p>
            ‘{title}’ 시험지를 삭제할까요?
            {current
              ? " 현재 작업을 닫고 빈 시험지로 돌아갑니다."
              : " 저장된 시험지와 담은 문제가 삭제됩니다."}
          </p>
          <div className={s.savedActionButtons}>
            <button
              type="button"
              onClick={() => {
                if (onDelete()) setAction(null);
              }}
            >
              삭제 확인
            </button>
            <button type="button" onClick={() => setAction(null)}>
              취소
            </button>
          </div>
        </div>
      )}
      {action && error && <p role="alert">{error}</p>}
    </div>
  );
}
