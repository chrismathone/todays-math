import { useEffect, useRef, useState } from "react";
import {
  ENGLISH_GRADES,
  ENGLISH_MATERIAL_MAX_BYTES,
  type EnglishGrade,
} from "@/contracts/english.contract";
import {
  ENGLISH_BANK_TEXT_MAX,
  englishPassageCreateSchema,
  englishPassageUpdateSchema,
  englishPassageResponseSchema,
  englishPassageWriteResponseSchema,
  type EnglishPassageDetail,
} from "@/contracts/englishBank.contract";
import w from "@/components/unified/Workroom.module.css";
import s from "../EnglishStudio.module.css";
import {
  jsonInit,
  messageOf,
  requestEnglish,
  statusOf,
} from "../englishClient";
import b from "./EnglishResourceBank.module.css";
import { BankError } from "./BankFeedback";

export default function PassageEditor({
  initial,
  onSaved,
  onCancel,
  onState,
  onReload,
}: {
  initial?: EnglishPassageDetail;
  onSaved: (detail: EnglishPassageDetail, duplicates: string[]) => void;
  onCancel: () => void;
  onState: (dirty: boolean, busy: boolean) => void;
  onReload: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [grade, setGrade] = useState<EnglishGrade | "">(initial?.grade ?? "");
  const [source, setSource] = useState(initial?.source.label ?? "");
  const [url, setUrl] = useState(initial?.source.url ?? "");
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const fileRead = useRef(0);
  useEffect(
    () => () => {
      fileRead.current += 1;
    },
    [],
  );
  const dirty =
    title !== (initial?.title ?? "") ||
    text !== (initial?.text ?? "") ||
    grade !== (initial?.grade ?? "") ||
    source !== (initial?.source.label ?? "") ||
    url !== (initial?.source.url ?? "");
  useEffect(() => {
    onState(dirty, busy);
  }, [dirty, busy, onState]);
  const changed = () => {
    setClientKey(crypto.randomUUID());
    fileRead.current += 1;
  };

  async function loadTxt(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!/\.txt$/i.test(file.name)) {
      setError("UTF-8 TXT 파일만 읽을 수 있습니다.");
      return;
    }
    if (file.size > ENGLISH_MATERIAL_MAX_BYTES) {
      setError("4MB 이하의 TXT 파일을 선택해 주세요.");
      return;
    }
    const read = ++fileRead.current;
    setBusy(true);
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      if (read !== fileRead.current) return;
      if (decoded.length > ENGLISH_BANK_TEXT_MAX)
        throw new Error(
          "30,000자를 초과한 파일입니다. 원문을 자르지 않았습니다. 발췌문을 별도 TXT로 등록해 주세요.",
        );
      if (!decoded.trim()) throw new Error("TXT 파일에 지문이 없습니다.");
      setText(decoded);
      if (!title.trim())
        setTitle(file.name.replace(/\.txt$/i, "").slice(0, 160));
      setClientKey(crypto.randomUUID());
    } catch (cause) {
      if (read === fileRead.current)
        setError(
          cause instanceof TypeError
            ? "UTF-8 텍스트로 저장한 TXT 파일을 선택해 주세요. 원문을 바꾸거나 자르지 않았습니다."
            : messageOf(cause),
        );
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (busy) return;
    if (!text.trim() || text.length > ENGLISH_BANK_TEXT_MAX) {
      setError(
        "지문은 1~30,000자여야 합니다. 원문은 자동으로 잘리지 않습니다.",
      );
      return;
    }
    const fields = {
      title,
      text,
      grade: grade || null,
      source: { label: source, url: url.trim() || null },
    };
    const parsed = initial
      ? englishPassageUpdateSchema.safeParse({
          ...fields,
          revision: initial.revision,
        })
      : englishPassageCreateSchema.safeParse({ ...fields, clientKey });
    if (!parsed.success) {
      setError(
        "제목·출처 URL·본문을 확인해 주세요. 제목은 160자 이하이며 URL은 http 또는 https 주소여야 합니다.",
      );
      return;
    }
    setBusy(true);
    onState(dirty, true);
    setError("");
    setConflict(false);
    try {
      const body = await requestEnglish(
        initial
          ? `/api/english/passages/${initial.id}`
          : "/api/english/passages",
        jsonInit(initial ? "PATCH" : "POST", parsed.data),
      );
      if (initial) onSaved(englishPassageResponseSchema.parse(body).data, []);
      else {
        const result = englishPassageWriteResponseSchema.parse(body);
        onSaved(result.data, result.meta.duplicateIds);
      }
    } catch (cause) {
      setError(messageOf(cause));
      setConflict(statusOf(cause) === 409);
      onState(dirty, false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      aria-label={initial ? "지문 편집" : "지문 등록"}
    >
      <h2>{initial ? "지문 편집" : "새 지문 등록"}</h2>
      <p className={b.note}>
        시험 없이 원문을 보관합니다. 제작에 사용하려면 저장 후 이용 근거를
        별도로 확인해 주세요.
      </p>
      <fieldset className={b.fieldset} disabled={busy}>
        <label className={s.field}>
          TXT에서 읽기
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={(event) => {
              void loadTxt(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <label className={s.field}>
          지문 제목
          <input
            required
            maxLength={160}
            value={title}
            onChange={(event) => {
              changed();
              setTitle(event.target.value);
            }}
          />
        </label>
        <div className={b.fields}>
          <label className={s.field}>
            대상 학년
            <select
              value={grade}
              onChange={(event) => {
                changed();
                setGrade(event.target.value as EnglishGrade | "");
              }}
            >
              <option value="">미지정</option>
              {ENGLISH_GRADES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            출처 이름
            <input
              maxLength={255}
              value={source}
              onChange={(event) => {
                changed();
                setSource(event.target.value);
              }}
            />
          </label>
        </div>
        <label className={s.field}>
          출처 URL (선택)
          <input
            type="url"
            maxLength={2000}
            value={url}
            onChange={(event) => {
              changed();
              setUrl(event.target.value);
            }}
          />
        </label>
        <label className={s.field}>
          원문
          <textarea
            required
            rows={12}
            value={text}
            onChange={(event) => {
              changed();
              setText(event.target.value);
            }}
            aria-describedby="bank-text-length"
          />
        </label>
        <p id="bank-text-length" className={b.note}>
          {text.length.toLocaleString("ko-KR")} / 30,000자 ·{" "}
          {text.trim() ? text.trim().split(/\s+/u).length : 0}단어
        </p>
        {text.length > 24_000 ? (
          <p className={b.notice}>
            24,000자 초과 지문은 보관·열람 전용입니다. 제작하려면 발췌문을 별도
            지문으로 등록해 주세요.
          </p>
        ) : text.length > 18_000 ? (
          <p className={b.notice}>
            18,000자 초과 지문은 원문 복원으로만 제작할 수 있습니다.
          </p>
        ) : null}
      </fieldset>
      {error && <BankError message={error} />}
      {conflict && (
        <>
          <p className={b.note}>
            작성 내용은 보존했습니다. 다른 곳의 수정과 충돌한 경우 내용을 복사해
            둔 뒤 최신 원문을 다시 열어 주세요.
          </p>
          {initial && (
            <button
              type="button"
              className={w.outlineButton}
              onClick={onReload}
            >
              최신 원문 다시 열기
            </button>
          )}
        </>
      )}
      {initial && (
        <p className={b.note}>
          본문이나 출처를 바꾸면 이용 근거를 다시 확인해야 합니다. 기존 문제
          세트와 과거 원문은 보존됩니다.
        </p>
      )}
      <div className={b.actions}>
        <button type="submit" className={w.primaryButton} disabled={busy}>
          {busy ? "저장 중…" : "지문 저장"}
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
