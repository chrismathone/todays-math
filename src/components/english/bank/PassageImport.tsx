import { useEffect, useState } from "react";
import {
  englishMaterialListResponseSchema,
  englishSetListResponseSchema,
  englishSetResponseSchema,
} from "@/contracts/english.contract";
import {
  englishPassageWriteResponseSchema,
  englishPassageUsesResponseSchema,
  type EnglishPassageDetail,
  type EnglishPassageImport,
} from "@/contracts/englishBank.contract";
import w from "@/components/unified/Workroom.module.css";
import s from "../EnglishStudio.module.css";
import { jsonInit, messageOf, requestEnglish } from "../englishClient";
import { useBankQuery } from "./bankClient";
import { BankError, BankLoading } from "./BankFeedback";
import BankExamPicker from "./BankExamPicker";
import b from "./EnglishResourceBank.module.css";

export default function PassageImport({
  active,
  canMaterials,
  canSets,
  onSaved,
  onState,
  onCancel,
}: {
  active: boolean;
  canMaterials: boolean;
  canSets: boolean;
  onSaved: (detail: EnglishPassageDetail, duplicates: string[]) => void;
  onState: (dirty: boolean, busy: boolean) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<"material" | "set">(
    canMaterials ? "material" : "set",
  );
  const [examId, setExamId] = useState("");
  const [id, setId] = useState("");
  const [textKind, setTextKind] = useState<"" | "passage" | "sourcePassage">(
    "",
  );
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());
  const [generation, setGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    onState(Boolean(id), busy);
  }, [id, busy, onState]);
  const materials = useBankQuery(
    active && canMaterials && kind === "material" && examId
      ? `/api/english/exams/${examId}/materials`
      : null,
    englishMaterialListResponseSchema,
    generation,
  );
  const sets = useBankQuery(
    active && canSets && kind === "set" && examId
      ? `/api/english/exams/${examId}/sets`
      : null,
    englishSetListResponseSchema,
    generation,
  );
  const setDetail = useBankQuery(
    active && canSets && kind === "set" && id
      ? `/api/english/sets/${id}`
      : null,
    englishSetResponseSchema,
    generation,
  );
  const source =
    materials.status === "ready"
      ? materials.data.data.find((item) => item.id === id)
      : undefined;
  const detail =
    setDetail.status === "ready" && setDetail.data.data.id === id
      ? setDetail.data.data
      : undefined;
  const originalRef = detail?.meta?.passageRef;
  const uses = useBankQuery(
    active &&
      canSets &&
      kind === "set" &&
      textKind === "sourcePassage" &&
      originalRef
      ? `/api/english/passages/${originalRef.passageId}/sets`
      : null,
    englishPassageUsesResponseSchema,
    generation,
  );
  const historicalOriginal =
    uses.status === "ready" && originalRef
      ? uses.data.data.find(
          (use) =>
            use.setId === id &&
            use.textRevision === originalRef.textRevision &&
            use.snapshotHash === originalRef.snapshotHash,
        )?.textSnapshot
      : undefined;
  // A linked set's historical source comes from its immutable use, never today's passage.
  const original = originalRef
    ? historicalOriginal
    : detail?.meta?.sourcePassage;
  const preview =
    kind === "material"
      ? source?.content
      : textKind === "sourcePassage"
        ? original
        : textKind === "passage"
          ? detail?.passage
          : undefined;
  const load = kind === "material" ? materials : sets;
  const retry = () => setGeneration((v) => v + 1);
  const resetKey = () => {
    setClientKey(crypto.randomUUID());
    setError("");
  };
  const eligible =
    kind === "material"
      ? canMaterials && Boolean(source?.content)
      : canSets && Boolean(detail && preview);
  async function importPassage() {
    if (busy || !active || !id || !eligible) return;
    const payload: EnglishPassageImport =
      kind === "material"
        ? { clientKey, kind, id }
        : { clientKey, kind, id, textKind: textKind || undefined };
    setBusy(true);
    onState(Boolean(id), true);
    setError("");
    try {
      const result = englishPassageWriteResponseSchema.parse(
        await requestEnglish(
          "/api/english/passages/import",
          jsonInit("POST", payload),
        ),
      );
      onSaved(result.data, result.meta.duplicateIds);
    } catch (cause) {
      setError(messageOf(cause));
      onState(Boolean(id), false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      aria-label="기존 자료 가져오기"
      onSubmit={(event) => {
        event.preventDefault();
        void importPassage();
      }}
    >
      <h2>기존 자료 가져오기</h2>
      <p className={b.note}>
        선택한 자료를 은행에 복사합니다. 기존 시험이나 세트는 이동·삭제하지
        않으며 이용 근거는 미확인으로 시작합니다.
      </p>
      <fieldset className={b.fieldset} disabled={busy}>
        <label className={s.field}>
          가져올 자료 종류
          <select
            aria-label="가져올 자료 종류"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as typeof kind);
              setId("");
              setTextKind("");
              resetKey();
            }}
          >
            {canMaterials && <option value="material">시험 자료</option>}
            {canSets && <option value="set">문제 세트</option>}
          </select>
        </label>
        <BankExamPicker
          active={active && (canMaterials || canSets)}
          value={examId}
          onChange={(value) => {
            setExamId(value);
            setId("");
            setTextKind("");
            resetKey();
          }}
          label="가져올 시험"
        />
        {examId &&
          (load.status === "loading" ? (
            <BankLoading />
          ) : load.status === "error" ? (
            <BankError message={load.message} onRetry={retry} />
          ) : (
            <label className={s.field}>
              가져올 항목
              <select
                aria-label="가져올 항목"
                value={id}
                onChange={(event) => {
                  setId(event.target.value);
                  setTextKind("");
                  resetKey();
                }}
              >
                <option value="">항목을 선택하세요</option>
                {kind === "material" && materials.status === "ready"
                  ? materials.data.data.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={!item.content}
                      >
                        {item.name}
                        {!item.content ? " · 추출된 텍스트 없음" : ""}
                      </option>
                    ))
                  : null}
                {kind === "set" && sets.status === "ready"
                  ? sets.data.data.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))
                  : null}
              </select>
            </label>
          ))}
        {examId && kind === "material" && (
          <p className={b.note}>
            PDF·DOCX 등 추출된 텍스트가 없는 파일은 가져올 수 없습니다. TXT는
            서버에서 전체 파일과 본문을 대조하며 잘린 사본은 거절합니다.
          </p>
        )}
        {kind === "set" &&
          id &&
          (setDetail.status === "loading" ? (
            <BankLoading />
          ) : setDetail.status === "error" ? (
            <BankError message={setDetail.message} onRetry={retry} />
          ) : (
            <>
              <label className={s.field}>
                가져올 지문
                <select
                  aria-label="가져올 지문"
                  value={textKind}
                  onChange={(event) => {
                    setTextKind(event.target.value as typeof textKind);
                    resetKey();
                  }}
                >
                  <option value="">원문과 제작 지문 중 직접 선택하세요</option>
                  <option
                    value="sourcePassage"
                    disabled={!originalRef && !detail?.meta?.sourcePassage}
                  >
                    기록된 입력 원문
                    {!originalRef && !detail?.meta?.sourcePassage
                      ? " · 원문 기록 없음"
                      : ""}
                  </option>
                  <option value="passage">문제 세트의 제작 지문</option>
                </select>
              </label>
              <p className={b.note}>
                제작 지문은 원문을 변형한 글일 수 있습니다. 원문 기록이 없는
                세트에서 원문을 자동 추정하지 않습니다.
              </p>
            </>
          ))}
        {kind === "set" &&
          textKind === "sourcePassage" &&
          originalRef &&
          (uses.status === "loading" ? (
            <BankLoading />
          ) : uses.status === "error" ? (
            <BankError message={uses.message} onRetry={retry} />
          ) : !historicalOriginal ? (
            <BankError message="이 세트의 제작 당시 원문 기록을 찾을 수 없습니다. 원문을 추정해 가져오지 않습니다." />
          ) : null)}
        {preview && (
          <div className={b.passage} aria-label="가져올 지문 미리보기">
            {preview}
          </div>
        )}
      </fieldset>
      {error && <BankError message={error} />}
      <div className={b.actions}>
        <button
          type="submit"
          className={w.primaryButton}
          disabled={busy || !active || !eligible}
        >
          {busy ? "가져오는 중…" : "선택한 지문 가져오기"}
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
