"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  workbookCreateEditionSchema,
  type WorkbookEditionDetail,
  type WorkbookProvenance,
} from "@/contracts/commercialWorkbook.contract";
import type { CommercialWorkbookSource } from "@/lib/commercialWorkbooks/source";
import {
  parseWorkbookImport,
  type WorkbookImportResult,
} from "@/lib/commercialWorkbooks/import";
import AutoGrowTextarea from "@/components/ui/AutoGrowTextarea";
import {
  addressLabel,
  isConflict,
  messageOf,
  requestIdentity,
} from "./presentation";
import { useDraftGuard } from "./useDraftGuard";
import s from "./CommercialWorkbooks.module.css";

const template =
  "volume\tsection\tpage\tnumber\tsubpart\tanswerText\tkeyStatus\tsourcePage\n";
type Props = {
  source: CommercialWorkbookSource;
  onSaved: (book: WorkbookEditionDetail) => void;
  existing?: WorkbookEditionDetail;
  onDirtyChange?: (dirty: boolean) => void;
};

export default function WorkbookImport({
  source,
  onSaved,
  existing,
  onDirtyChange,
}: Props) {
  const id = useId();
  const [metadata, setMetadata] = useState({
    title: existing?.metadata.title ?? "",
    publisher: existing?.metadata.publisher ?? "",
    grade: existing?.metadata.grade ?? "",
    curriculum: existing?.metadata.curriculum ?? "",
    edition: existing?.metadata.edition ?? "",
    isbn: existing?.metadata.isbn ?? "",
  });
  const [provenance, setProvenance] = useState<WorkbookProvenance>(
    existing?.provenance ?? { kind: "teacher-authored", description: "" },
  );
  const [text, setText] = useState(() =>
    existing
      ? template +
        existing.exercises
          .map(({ address: a, key }) =>
            [
              a.volume,
              a.section,
              a.page,
              a.number,
              a.subpart,
              key?.answerText ?? "",
              key?.status ?? "",
              key?.sourcePage?.toString() ?? "",
            ]
              .map((value) => `"${value.replaceAll('"', '""')}"`)
              .join("\t"),
          )
          .join("\n")
      : "",
  );
  const [review, setReview] = useState<WorkbookImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expectedRevision, setExpectedRevision] = useState(
    existing?.revision ?? 0,
  );
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState<WorkbookEditionDetail | null>(null);
  const requestId = useRef(requestIdentity());
  const fileVersion = useRef(0);
  useDraftGuard(dirty);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  function invalidate() {
    fileVersion.current += 1;
    setReview(null);
    setConfirmed(false);
    setError("");
    setDirty(true);
  }
  function validate() {
    setError("");
    setConfirmed(false);
    const result = parseWorkbookImport(text);
    setReview(result);
    if (result.issues.length) return;
    const checked = workbookCreateEditionSchema.safeParse({
      requestId: "preview-request",
      metadata: Object.fromEntries(
        Object.entries(metadata).filter(([, value]) => value.trim()),
      ),
      provenance,
      exercises: result.exercises,
    });
    if (!checked.success) {
      setError(
        checked.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(" / "),
      );
      setReview(null);
    }
  }
  async function save() {
    if (!review || review.issues.length || !confirmed || busy || conflict)
      return;
    setBusy(true);
    setError("");
    try {
      const common = { provenance, exercises: review.exercises };
      const body = existing
        ? { ...common, expectedRevision }
        : {
            ...common,
            metadata: Object.fromEntries(
              Object.entries(metadata).filter(([, value]) => value.trim()),
            ) as typeof metadata,
          };
      const saved = existing
        ? await source.reviseEdition(existing.id, {
            ...common,
            expectedRevision,
            requestId: requestId.current(body),
          })
        : await source.createEdition({
            ...common,
            metadata: (body as { metadata: typeof metadata }).metadata,
            requestId: requestId.current(body),
          });
      setDirty(false);
      onSaved(saved);
    } catch (reason) {
      setError(messageOf(reason));
      if (isConflict(reason)) {
        setConflict(true);
        setLatest(null);
      }
    } finally {
      setBusy(false);
    }
  }
  async function readFile(file?: File) {
    if (!file) return;
    invalidate();
    const version = fileVersion.current;
    if (file.size > 2_000_000) {
      setError("파일은 2MB 이하로 나누어 주세요.");
      return;
    }
    try {
      const value = await file.text();
      if (version === fileVersion.current) setText(value);
    } catch {
      if (version !== fileVersion.current) return;
      setError(
        "파일을 읽지 못했습니다. UTF-8 CSV 또는 TSV 내용을 붙여 넣어 주세요.",
      );
    }
  }
  async function compareLatest() {
    if (!existing || busy) return;
    setBusy(true);
    try {
      setLatest(await source.getEdition(existing.id));
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.panel} aria-labelledby={`${id}-heading`}>
      <div className={s.sectionHeading}>
        <div>
          <h3 id={`${id}-heading`}>
            {existing ? "정답표 개정" : "교재와 정답표 등록"}
          </h3>
          <p className={s.muted}>
            {existing
              ? "기존 과제의 정답 사본은 유지됩니다. 기존 문항 주소를 모두 포함해 주세요."
              : "판본과 출처를 확인한 자료만 등록합니다. 정답이 없는 문항도 빈칸으로 남길 수 있습니다."}
          </p>
        </div>
      </div>
      <fieldset disabled={busy} className={s.stack}>
        <div className={s.formGrid}>
          {(
            [
              ["title", "교재명"],
              ["publisher", "출판사"],
              ["edition", "정확한 판본 · 발행연도"],
              ["grade", "학년"],
              ["curriculum", "교육과정 (선택)"],
              ["isbn", "ISBN (선택)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={metadata[key]}
                readOnly={!!existing}
                maxLength={200}
                onChange={(event) => {
                  invalidate();
                  setMetadata({ ...metadata, [key]: event.target.value });
                }}
                placeholder={
                  key === "edition" ? "예: 2026년 개정판, 1학기" : undefined
                }
              />
            </label>
          ))}
          <label>
            정답 출처
            <select
              value={provenance.kind}
              onChange={(event) => {
                invalidate();
                setProvenance({
                  ...provenance,
                  kind: event.target.value as WorkbookProvenance["kind"],
                });
              }}
            >
              <option value="teacher-authored">교사 직접 작성</option>
              <option value="publisher">출판사 제공 자료</option>
              <option value="licensed-other">이용 허락을 받은 자료</option>
            </select>
          </label>
          <label>
            출처 주소 · 자료 식별자 (선택)
            <input
              value={provenance.reference ?? ""}
              maxLength={2000}
              onChange={(event) => {
                invalidate();
                const value = event.target.value;
                setProvenance((previous) => {
                  const next = { ...previous };
                  if (value.trim()) next.reference = value;
                  else delete next.reference;
                  return next;
                });
              }}
            />
          </label>
          <label className={s.full}>
            출처와 검토 근거
            <AutoGrowTextarea
              value={provenance.description}
              maxLength={2000}
              placeholder="자료명, 해당 판본, 확인한 쪽과 검토 방법을 기록하세요."
              onChange={(event) => {
                invalidate();
                setProvenance({
                  ...provenance,
                  description: event.target.value,
                });
              }}
            />
          </label>
        </div>
        <details>
          <summary>CSV · TSV 열 안내</summary>
          <p className={s.muted}>
            필수 열: page(쪽), number(문항). 선택 열: volume(권), section(단원),
            subpart(소문항), answerText(정답), keyStatus(검토 상태),
            sourcePage(정답 자료의 실제 쪽 번호).
          </p>
          <p className={s.muted}>
            검토 상태는 unreviewed(검토 전) 또는 reviewed(직접 검토함)입니다.
            답이 없으면 정답과 상태를 모두 비우세요. 같은 쪽·번호도
            권·단원·소문항으로 구별합니다.
          </p>
          <button
            type="button"
            className={s.button}
            onClick={() => {
              invalidate();
              setText(template);
            }}
          >
            빈 머리글 넣기
          </button>
        </details>
        <label>
          CSV · TSV 파일
          <input
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            onChange={(event) => void readFile(event.target.files?.[0])}
          />
        </label>
        <label>
          정답표 붙여넣기
          <AutoGrowTextarea
            value={text}
            spellCheck={false}
            placeholder={template.trim()}
            onChange={(event) => {
              invalidate();
              setText(event.target.value);
            }}
          />
        </label>
        <div className={s.actions}>
          <button
            type="button"
            className={s.button}
            disabled={!text.trim()}
            onClick={validate}
          >
            가져오기 검토
          </button>
          <span className={s.caption}>
            최대 5,000문항 · 원문 문제는 가져오지 않습니다.
          </span>
        </div>
        {review && (
          <div className={s.stack}>
            {review.issues.length ? (
              <div role="alert" className={s.error}>
                <strong>등록할 수 없습니다.</strong>
                <ul>
                  {review.issues.map((issue, index) => (
                    <li key={index}>
                      {issue.row > 0 ? `${issue.row}행 · ` : ""}
                      {issue.field}: {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <div className={s.summary}>
                  <strong>검토할 문항 {review.exercises.length}개</strong>
                  <span>
                    검토한 정답{" "}
                    {
                      review.exercises.filter(
                        (item) => item.key?.status === "reviewed",
                      ).length
                    }
                    개
                  </span>
                  <span>
                    정답 미확보{" "}
                    {review.exercises.filter((item) => !item.key).length}개
                  </span>
                </div>
                <div
                  className={s.tableRegion}
                  role="region"
                  aria-label="가져올 정답표 미리보기"
                  tabIndex={0}
                >
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>문항 주소</th>
                        <th>정답</th>
                        <th>검토 상태</th>
                        <th>정답 자료 쪽</th>
                      </tr>
                    </thead>
                    <tbody>
                      {review.exercises.slice(0, 100).map((item, index) => (
                        <tr key={index}>
                          <td>{addressLabel(item.address)}</td>
                          <td>
                            <code>{item.key?.answerText ?? "미확보"}</code>
                          </td>
                          <td>
                            {item.key
                              ? item.key.status === "reviewed"
                                ? "검토함"
                                : "검토 전"
                              : "—"}
                          </td>
                          <td>{item.key?.sourcePage ?? "미기록"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {review.exercises.length > 100 && (
                  <p className={s.caption}>
                    처음 100개를 표시했습니다. 저장 대상은 검증된{" "}
                    {review.exercises.length}개 전체입니다.
                  </p>
                )}
                <label className={s.checkbox}>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  판본·문항 주소·정답 및 표시한 검토 상태를 확인했습니다.
                </label>
                <button
                  type="button"
                  className={s.primary}
                  disabled={!confirmed || conflict}
                  onClick={() => void save()}
                >
                  {busy
                    ? "저장 중…"
                    : existing
                      ? "새 정답 개정 저장"
                      : "교재와 정답표 저장"}
                </button>
              </>
            )}
          </div>
        )}
      </fieldset>
      {conflict && (
        <div className={s.stack}>
          <p className={s.error} role="alert">
            다른 정답표 개정이 먼저 저장되었습니다. 입력한 표를 유지했습니다.
            최신 개정과 비교한 뒤 다시 검토해 주세요.
          </p>
          {!latest ? (
            <button
              type="button"
              className={s.button}
              disabled={busy}
              onClick={() => void compareLatest()}
            >
              최신 정답표 비교
            </button>
          ) : (
            <>
              <h3>
                최신 개정 {latest.revision} · {latest.exerciseCount}문항
              </h3>
              <div
                className={s.checkList}
                role="region"
                aria-label="최신 정답표 비교"
                tabIndex={0}
              >
                {latest.exercises.map((item) => (
                  <p key={item.id}>
                    {addressLabel(item.address)}:{" "}
                    {item.key?.answerText ?? "미확보"}
                  </p>
                ))}
              </div>
              <button
                type="button"
                className={s.button}
                onClick={() => {
                  setExpectedRevision(latest.revision);
                  setConflict(false);
                  setReview(null);
                  setConfirmed(false);
                  setError("");
                }}
              >
                최신 개정 확인 · 내 입력 유지
              </button>
            </>
          )}
        </div>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error} 입력한 내용은 유지됩니다.
        </p>
      )}
    </section>
  );
}
