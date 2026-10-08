import { useState } from "react";
import { ENGLISH_GRADES } from "@/contracts/english.contract";
import {
  englishPassageListResponseSchema,
  englishPassageResponseSchema,
  type EnglishBankMakerSeed,
  type EnglishPassageDetail,
} from "@/contracts/englishBank.contract";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import w from "@/components/unified/Workroom.module.css";
import s from "../EnglishStudio.module.css";
import { bankUrl, useBankQuery } from "./bankClient";
import { BankError, BankLoading, BankPagination } from "./BankFeedback";
import PassageEditor from "./PassageEditor";
import PassageImport from "./PassageImport";
import {
  PassageArchive,
  PassagePrepare,
  PassageRights,
} from "./PassageActions";
import b from "./EnglishResourceBank.module.css";

type Editor = (
  | { kind: "create" }
  | { kind: "import" }
  | { kind: "edit" | "rights"; passage: EnglishPassageDetail }
) & { key: string };
export default function PassageBank({
  active,
  allowedMenus,
  busy,
  guard,
  onState,
  onUsePassage,
  onOpenSet,
  onNewExam,
  onNotice,
}: {
  active: boolean;
  allowedMenus: WorkspaceMenu[];
  busy: boolean;
  guard: (action: () => void) => void;
  onState: (dirty: boolean, busy: boolean) => void;
  onUsePassage: (seed: EnglishBankMakerSeed) => void;
  onOpenSet: (id: string) => void;
  onNewExam?: () => void;
  onNotice?: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("");
  const [source, setSource] = useState("");
  const [archived, setArchived] = useState("false");
  const [filter, setFilter] = useState({
    q: "",
    grade: "",
    source: "",
    archived: "false",
  });
  const [cursors, setCursors] = useState<string[]>([""]);
  const [generation, setGeneration] = useState(0);
  const [selected, setSelected] = useState("");
  const [saved, setSaved] = useState<EnglishPassageDetail | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const canMake = allowedMenus.includes("english-maker");
  const canMaterials = canMake || allowedMenus.includes("english-school");
  const canSets = allowedMenus.includes("english-library");
  const list = useBankQuery(
    active
      ? bankUrl("/api/english/passages", {
          ...filter,
          cursor: cursors[cursors.length - 1],
          limit: 20,
        })
      : null,
    englishPassageListResponseSchema,
    generation,
  );
  const detail = useBankQuery(
    active && selected ? `/api/english/passages/${selected}` : null,
    englishPassageResponseSchema,
    generation,
  );
  const passage =
    detail.status === "ready" && detail.data.data.id === selected
      ? detail.data.data
      : saved?.id === selected
        ? saved
        : null;
  const closeEditor = () => {
    setEditor(null);
    onState(false, false);
  };
  const select = (id: string) =>
    guard(() => {
      closeEditor();
      setSelected(id);
      setSaved(null);
      setNotice("");
    });
  const reloadDetail = () =>
    guard(() => {
      closeEditor();
      setSaved(null);
      setGeneration((v) => v + 1);
    });
  const finish = (value: EnglishPassageDetail, candidateIds: string[] = []) => {
    closeEditor();
    setSelected(value.id);
    setSaved(value);
    setDuplicates(candidateIds);
    setGeneration((v) => v + 1);
    const message = value.archivedAt
      ? "보관을 해제했습니다. 과거 원문과 사용 이력은 보존됩니다."
      : "지문을 저장했습니다.";
    setNotice(message);
    onNotice?.(message);
  };
  return (
    <>
      <div className={b.toolbar}>
        <button
          type="button"
          className={w.primaryButton}
          disabled={busy}
          onClick={() =>
            guard(() => {
              setEditor({ kind: "create", key: crypto.randomUUID() });
              onState(false, false);
              setNotice("");
            })
          }
        >
          지문 등록
        </button>
        {(canMaterials || canSets) && (
          <button
            type="button"
            className={w.outlineButton}
            disabled={busy}
            onClick={() =>
              guard(() => {
                setEditor({ kind: "import", key: crypto.randomUUID() });
                onState(false, false);
              })
            }
          >
            기존 자료 가져오기
          </button>
        )}
      </div>
      <form
        className={b.filters}
        aria-label="지문 검색"
        onSubmit={(event) => {
          event.preventDefault();
          setFilter({
            q: query.trim(),
            grade,
            source: source.trim(),
            archived,
          });
          setCursors([""]);
        }}
      >
        <label className={s.field}>
          제목·원문 검색
          <input
            type="search"
            maxLength={200}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="제목이나 원문의 단어"
          />
        </label>
        <label className={s.field}>
          학년
          <select
            aria-label="학년"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
          >
            <option value="">모든 학년</option>
            {ENGLISH_GRADES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          출처
          <input
            maxLength={255}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="출처 이름"
          />
        </label>
        <label className={s.field}>
          보관 상태
          <select
            aria-label="보관 상태"
            value={archived}
            onChange={(event) => setArchived(event.target.value)}
          >
            <option value="false">보관 중</option>
            <option value="true">보관 해제</option>
          </select>
        </label>
        <button type="submit" className={w.outlineButton}>
          검색
        </button>
        <button
          type="button"
          className={w.outlineButton}
          onClick={() => setGeneration((v) => v + 1)}
        >
          목록 새로고침
        </button>
      </form>
      {notice && (
        <p role="status" className={b.notice}>
          {notice}
        </p>
      )}
      <div className={b.layout}>
        <section
          aria-label="지문 목록"
          aria-busy={list.status === "loading"}
          className={b.catalog}
        >
          <h2 className={b.listHeading}>지문 목록</h2>
          {list.status === "loading" ? (
            <BankLoading />
          ) : list.status === "error" ? (
            <BankError
              message={list.message}
              onRetry={() => setGeneration((v) => v + 1)}
            />
          ) : (
            <>
              <p role="status" className={b.resultCount}>
                이 페이지 {list.data.data.length}개
              </p>
              {list.data.data.length ? (
                <ul className={b.list} aria-label="지문 검색 결과" tabIndex={0}>
                  {list.data.data.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={b.rowButton}
                        aria-pressed={selected === item.id}
                        disabled={busy}
                        onClick={() => select(item.id)}
                      >
                        <strong>{item.title}</strong>
                        <span className={b.meta}>
                          {item.grade ?? "학년 미지정"} ·{" "}
                          {item.source.label || "출처 미입력"}
                        </span>
                        <span className={b.meta}>
                          {item.textLength.toLocaleString("ko-KR")}자 · 원문
                          버전 {item.textRevision} ·{" "}
                          {item.rights.status === "confirmed"
                            ? "이용 근거 확인"
                            : "이용 근거 미확인"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={b.note}>
                  {filter.q ||
                  filter.grade ||
                  filter.source ||
                  filter.archived === "true" ||
                  cursors.length > 1
                    ? "조건에 맞는 지문이 없습니다. 검색 조건을 바꿔 주세요."
                    : "보관 중인 지문이 없습니다. 지문을 등록하세요."}
                </p>
              )}
              <BankPagination
                page={cursors.length}
                hasNext={Boolean(list.data.meta.nextCursor)}
                onPrevious={() => setCursors((v) => v.slice(0, -1))}
                onNext={() => {
                  if (list.data.meta.nextCursor)
                    setCursors((v) => [...v, list.data.meta.nextCursor!]);
                }}
              />
            </>
          )}
        </section>
        <section className={b.detail} aria-label="지문 상세">
          {editor?.kind === "create" || editor?.kind === "edit" ? (
            <PassageEditor
              key={editor.key}
              initial={editor.kind === "edit" ? editor.passage : undefined}
              onSaved={finish}
              onState={onState}
              onCancel={() => guard(closeEditor)}
              onReload={reloadDetail}
            />
          ) : editor?.kind === "import" ? (
            <PassageImport
              active={active}
              canMaterials={canMaterials}
              canSets={canSets}
              onSaved={finish}
              onState={onState}
              onCancel={() => guard(closeEditor)}
            />
          ) : editor?.kind === "rights" ? (
            <PassageRights
              key={`rights-${editor.passage.id}`}
              passage={editor.passage}
              onSaved={finish}
              onState={onState}
              onCancel={() => guard(closeEditor)}
            />
          ) : !selected ? (
            <>
              <h2>지문을 선택하세요</h2>
              <p className={b.note}>
                원문·출처·사용 이력을 확인하고 문제 제작으로 이어갈 수 있습니다.
              </p>
            </>
          ) : !passage ? (
            detail.status === "error" ? (
              <BankError
                message={detail.message}
                onRetry={() => setGeneration((v) => v + 1)}
              />
            ) : (
              <BankLoading />
            )
          ) : (
            <>
              <h2>{passage.title}</h2>
              {detail.status === "error" && (
                <BankError message={detail.message} onRetry={reloadDetail} />
              )}
              <p className={b.meta}>
                {passage.grade ?? "학년 미지정"} ·{" "}
                {passage.source.label || "출처 미입력"} · 원문 버전{" "}
                {passage.textRevision} ·{" "}
                {passage.text.trim().split(/\s+/u).length}단어 ·{" "}
                {passage.text.length.toLocaleString("ko-KR")}자
              </p>
              {passage.source.url && (
                <a
                  className={b.link}
                  href={passage.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  출처 페이지 열기 ↗
                </a>
              )}
              {passage.importedFrom && (
                <p className={b.meta}>
                  가져온 경로:{" "}
                  {passage.importedFrom.kind === "material"
                    ? "시험 자료"
                    : passage.importedFrom.textKind === "sourcePassage"
                      ? "세트에 기록된 입력 원문"
                      : "세트의 제작 지문"}
                </p>
              )}
              {passage.archivedAt && (
                <p className={b.notice}>
                  보관 해제한 지문입니다. 과거 원문과 사용 이력을 열람할 수
                  있습니다.
                </p>
              )}
              {passage.text.length > 24_000 ? (
                <p className={b.notice}>
                  24,000자 초과 지문은 보관·열람 전용입니다. 제작하려면 발췌문을
                  별도 지문으로 등록해 주세요.
                </p>
              ) : passage.text.length > 18_000 ? (
                <p className={b.notice}>
                  18,000자 초과 지문은 원문 복원으로만 제작할 수 있습니다.
                </p>
              ) : null}
              <div className={b.passage} aria-label="원문">
                {passage.text}
              </div>
              {!passage.archivedAt && (
                <div className={b.actions}>
                  <button
                    type="button"
                    className={w.outlineButton}
                    disabled={busy}
                    onClick={() =>
                      setEditor({
                        kind: "edit",
                        passage,
                        key: crypto.randomUUID(),
                      })
                    }
                  >
                    원문 편집
                  </button>
                  <button
                    type="button"
                    className={w.outlineButton}
                    disabled={busy}
                    onClick={() =>
                      setEditor({
                        kind: "rights",
                        passage,
                        key: crypto.randomUUID(),
                      })
                    }
                  >
                    이용 근거 확인
                  </button>
                  <PassageArchive
                    passage={passage}
                    onSaved={finish}
                    onState={onState}
                    locked={busy}
                  />
                </div>
              )}
              <div className={b.actions}>
                <button
                  type="button"
                  className={w.outlineButton}
                  disabled={busy}
                  onClick={reloadDetail}
                >
                  상세 새로고침
                </button>
              </div>
              <section className={b.section} aria-label="이용 범위">
                <h3>이용 범위</h3>
                <p className={b.note}>
                  {passage.rights.status === "confirmed"
                    ? passage.rights.basis
                    : "미확인 · 보관과 열람은 가능하며, 제작 전 이용 근거를 확인해 주세요."}
                </p>
                {passage.rights.status === "confirmed" && (
                  <p className={b.meta}>
                    문제 제작 입력{" "}
                    {passage.rights.allowedUses.includes("generation_input")
                      ? "허용"
                      : "미확인"}{" "}
                    · 외부 모델 전송{" "}
                    {passage.rights.allowedUses.includes("external_model")
                      ? "허용"
                      : "미확인"}{" "}
                    · 확인일 {passage.rights.confirmedAt?.slice(0, 10)}
                  </p>
                )}
              </section>
              {canMake &&
                !passage.archivedAt &&
                passage.text.length <= 24_000 && (
                  <section className={b.section}>
                    <PassagePrepare
                      key={`${passage.id}-${passage.revision}`}
                      active={active}
                      passage={passage}
                      onUse={onUsePassage}
                      onNewExam={onNewExam}
                      onState={onState}
                      locked={busy}
                    />
                  </section>
                )}
              <section className={b.section} aria-label="지문 사용 이력">
                <h3>이 지문으로 만든 문제</h3>
                {passage.usages.length ? (
                  <ul className={b.usage}>
                    {passage.usages.map((usage) => (
                      <li key={usage.setId}>
                        {canSets ? (
                          <button
                            type="button"
                            className={w.outlineButton}
                            onClick={() => guard(() => onOpenSet(usage.setId))}
                          >
                            {usage.title} 열기
                          </button>
                        ) : (
                          <strong>{usage.title}</strong>
                        )}
                        <p className={b.meta}>
                          원문 버전 {usage.textRevision} ·{" "}
                          {usage.sourceSnapshot.label || "출처 미입력"} ·{" "}
                          {usage.createdAt.slice(0, 10)}
                        </p>
                        <details>
                          <summary>제작에 사용한 원문 보기</summary>
                          <div className={b.passage}>{usage.textSnapshot}</div>
                        </details>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={b.note}>
                    아직 이 지문으로 만든 문제 세트가 없습니다.
                  </p>
                )}
              </section>
              {duplicates.length > 0 && (
                <section className={b.section}>
                  <h3>같은 본문의 중복 후보</h3>
                  <p className={b.note}>
                    자동으로 합치지 않았습니다. 출처와 원문을 확인해 주세요.
                  </p>
                  <div className={b.actions}>
                    {duplicates
                      .filter((id) => id !== selected)
                      .map((id, index) => (
                        <button
                          key={id}
                          type="button"
                          className={w.outlineButton}
                          onClick={() => select(id)}
                        >
                          중복 후보 {index + 1} 열기
                        </button>
                      ))}
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
