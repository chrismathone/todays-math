import { useEffect, useRef, useState } from "react";
import {
  ENGLISH_BANK_PATH_LIMITS,
  englishPassagePrepareResponseSchema,
  englishPassageResponseSchema,
  type EnglishBankMakerSeed,
  type EnglishPassageDetail,
  type EnglishPassageRights,
} from "@/contracts/englishBank.contract";
import ConfirmDialog from "@/components/unified/ConfirmDialog";
import w from "@/components/unified/Workroom.module.css";
import s from "../EnglishStudio.module.css";
import { jsonInit, messageOf, requestEnglish } from "../englishClient";
import BankExamPicker from "./BankExamPicker";
import { BankError } from "./BankFeedback";
import b from "./EnglishResourceBank.module.css";

export function PassageRights({
  passage,
  onSaved,
  onState,
  onCancel,
}: {
  passage: EnglishPassageDetail;
  onSaved: (detail: EnglishPassageDetail) => void;
  onState: (dirty: boolean, busy: boolean) => void;
  onCancel: () => void;
}) {
  const [basis, setBasis] = useState(passage.rights.basis);
  const [generation, setGeneration] = useState(false);
  const [external, setExternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = basis !== passage.rights.basis || generation || external;
  useEffect(() => {
    onState(dirty, busy);
  }, [dirty, busy, onState]);
  async function confirm() {
    if (busy || !basis.trim() || !generation) return;
    setBusy(true);
    onState(dirty, true);
    setError("");
    const allowedUses: EnglishPassageRights["allowedUses"] = [
      "generation_input",
    ];
    if (external) allowedUses.push("external_model");
    try {
      const result = englishPassageResponseSchema.parse(
        await requestEnglish(
          `/api/english/passages/${passage.id}/rights`,
          jsonInit("POST", { revision: passage.revision, basis, allowedUses }),
        ),
      );
      onSaved(result.data);
    } catch (cause) {
      setError(messageOf(cause));
      onState(dirty, false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      aria-label="이용 근거 확인"
      onSubmit={(event) => {
        event.preventDefault();
        void confirm();
      }}
    >
      <h2>이용 근거 확인</h2>
      <p className={b.note}>
        무료 공개만으로 복제·변형이나 외부 모델 전송이 허용되는 것은 아닙니다.
        확인한 근거와 허용 범위를 기록해 주세요.
      </p>
      <fieldset className={b.fieldset} disabled={busy}>
        <label className={s.field}>
          이용 근거
          <textarea
            required
            maxLength={2000}
            value={basis}
            onChange={(event) => setBasis(event.target.value)}
            placeholder="직접 작성, 이용 허락을 받은 범위 등"
          />
        </label>
        <div className={s.checks}>
          <label>
            <input
              type="checkbox"
              checked={generation}
              onChange={(event) => setGeneration(event.target.checked)}
            />
            문제 제작 입력에 사용할 수 있음
          </label>
          <label>
            <input
              type="checkbox"
              checked={external}
              onChange={(event) => setExternal(event.target.checked)}
            />
            외부 모델에 전송할 수 있음
          </label>
        </div>
      </fieldset>
      {error && <BankError message={error} />}
      <div className={b.actions}>
        <button
          type="submit"
          className={w.primaryButton}
          disabled={busy || !basis.trim() || !generation}
        >
          {busy ? "확인 중…" : "이용 근거 저장"}
        </button>
        <button
          type="button"
          className={w.outlineButton}
          disabled={busy}
          onClick={onCancel}
        >
          취소
        </button>
      </div>
    </form>
  );
}

export function PassagePrepare({
  active,
  passage,
  onUse,
  onNewExam,
  onState,
  locked,
}: {
  active: boolean;
  passage: EnglishPassageDetail;
  onUse: (seed: EnglishBankMakerSeed) => void;
  onNewExam?: () => void;
  onState: (dirty: boolean, busy: boolean) => void;
  locked: boolean;
}) {
  const [examId, setExamId] = useState("");
  const [path, setPath] = useState<EnglishBankMakerSeed["path"]>("cloze");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
    return () => {
      activeRef.current = false;
    };
  }, [active]);
  useEffect(() => {
    onState(false, busy);
  }, [busy, onState]);
  const rights = passage.rights;
  const hasRights =
    rights.status === "confirmed" &&
    rights.allowedUses.includes("generation_input") &&
    (path === "cloze" || rights.allowedUses.includes("external_model"));
  const tooLong = passage.text.length > ENGLISH_BANK_PATH_LIMITS[path];
  async function prepare() {
    if (busy || !active || !examId || !hasRights || tooLong) return;
    setBusy(true);
    onState(false, true);
    setError("");
    try {
      const result = englishPassagePrepareResponseSchema.parse(
        await requestEnglish(
          `/api/english/passages/${passage.id}/prepare`,
          jsonInit("POST", {
            examId,
            path,
            textRevision: passage.textRevision,
          }),
        ),
      );
      if (activeRef.current) {
        onState(false, false);
        onUse(result.data);
      }
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
      onState(false, false);
    }
  }
  return (
    <form
      aria-label="문제 제작 연결"
      onSubmit={(event) => {
        event.preventDefault();
        void prepare();
      }}
    >
      <h3>이 지문으로 문제 만들기</h3>
      <fieldset className={b.fieldset} disabled={busy || locked}>
        <BankExamPicker
          active={active}
          value={examId}
          onChange={setExamId}
          onNewExam={onNewExam}
        />
        <label className={s.field}>
          제작 경로
          <select
            value={path}
            onChange={(event) => setPath(event.target.value as typeof path)}
          >
            <option value="cloze">원문 복원 · 최대 24,000자</option>
            <option
              value="chatgpt"
              disabled={passage.text.length > ENGLISH_BANK_PATH_LIMITS.chatgpt}
            >
              ChatGPT · 최대 18,000자
            </option>
            <option
              value="api"
              disabled={passage.text.length > ENGLISH_BANK_PATH_LIMITS.api}
            >
              AI 생성 · 최대 18,000자
            </option>
          </select>
        </label>
      </fieldset>
      {!hasRights && (
        <p className={b.note}>
          {path === "cloze"
            ? "문제 제작 입력의 이용 근거를 먼저 확인해 주세요."
            : "문제 제작 입력과 외부 모델 전송의 이용 근거를 각각 확인해 주세요."}
        </p>
      )}
      {tooLong && (
        <p className={b.note}>
          선택한 제작 경로의 길이 제한을 초과했습니다. 본문을 자동으로 자르지
          않습니다.
        </p>
      )}
      {error && <BankError message={error} />}
      <button
        type="submit"
        className={w.primaryButton}
        disabled={busy || locked || !active || !examId || !hasRights || tooLong}
      >
        {busy ? "제작 준비 중…" : "선택한 시험에서 문제 만들기"}
      </button>
    </form>
  );
}

export function PassageArchive({
  passage,
  onSaved,
  onState,
  locked,
}: {
  passage: EnglishPassageDetail;
  onSaved: (detail: EnglishPassageDetail) => void;
  onState: (dirty: boolean, busy: boolean) => void;
  locked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    onState(false, busy);
  }, [busy, onState]);
  async function archive() {
    if (busy) return;
    setBusy(true);
    onState(false, true);
    setError("");
    try {
      const result = englishPassageResponseSchema.parse(
        await requestEnglish(
          `/api/english/passages/${passage.id}`,
          jsonInit("DELETE", { revision: passage.revision }),
        ),
      );
      setOpen(false);
      onSaved(result.data);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
      onState(false, false);
    }
  }
  return (
    <>
      <button
        ref={opener}
        type="button"
        className={w.outlineButton}
        disabled={locked}
        onClick={() => setOpen(true)}
      >
        보관 해제
      </button>
      {open && (
        <ConfirmDialog
          title="이 지문을 보관 해제할까요?"
          description="기본 목록에서 제외합니다. 과거 원문과 이미 만든 문제 세트, 사용 이력은 보존됩니다."
          confirmLabel="보관 해제"
          busy={busy}
          error={error}
          returnFocus={opener}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            void archive();
          }}
        />
      )}
    </>
  );
}
