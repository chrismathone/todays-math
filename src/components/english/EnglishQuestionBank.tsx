"use client";

import { useEffect, useRef, useState } from "react";
import {
  ENGLISH_GRADES,
  ENGLISH_QUESTION_TYPES,
  ENGLISH_SET_STATUSES,
  type EnglishExam,
} from "@/contracts/english.contract";
import {
  ENGLISH_BANK_PAGE_MAX,
  englishQuestionBankResponseSchema,
  englishQuestionBankResolveResponseSchema,
  type EnglishBankQuestion,
} from "@/contracts/englishQuestionBank.contract";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import Icon from "@/components/unified/WorkspaceIcon";
import EnglishQuestionView from "./EnglishQuestionView";
import EnglishBankPrint from "./print/EnglishBankPrint";
import {
  jsonInit,
  messageOf,
  requestEnglish,
  statusOf,
  type Load,
} from "./englishClient";
import {
  addBankQuestions,
  ENGLISH_SELECTION_MAX,
} from "./englishQuestionSelection";
import s from "./EnglishQuestionBank.module.css";

type Result = {
  items: EnglishBankQuestion[];
  total: number;
  page: number;
  pageSize: number;
};
export async function resolveBankQuestions(
  items: readonly EnglishBankQuestion[],
) {
  const body = await requestEnglish(
    "/api/english/questions/resolve",
    jsonInit("POST", {
      items: items.map(({ setId, revision, questionIndex }) => ({
        setId,
        revision,
        questionIndex,
      })),
    }),
  );
  return englishQuestionBankResolveResponseSchema.parse(body).data;
}

export default function EnglishQuestionBank({
  exams,
  refreshKey,
  onMake,
  onOpenSet,
}: {
  exams: EnglishExam[];
  refreshKey: number;
  onMake?: () => void;
  onOpenSet: (item: EnglishBankQuestion) => void;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [examId, setExamId] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState<{
    key: string;
    value: Load<Result>;
  } | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [tray, setTray] = useState<EnglishBankQuestion[]>([]);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<EnglishBankQuestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const resolving = useRef(false);
  const requestKey = JSON.stringify([
    query,
    grade,
    type,
    status,
    examId,
    page,
    retry,
    refreshKey,
  ]);
  const result: Load<Result> =
    loaded?.key === requestKey ? loaded.value : { status: "loading" };
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    for (const [key, value] of Object.entries({
      q: query,
      grade,
      type,
      status,
      examId,
    }))
      if (value) params.set(key, value);
    void requestEnglish(`/api/english/questions?${params}`, {
      signal: controller.signal,
    })
      .then((body) => {
        if (controller.signal.aborted) return;
        const data = englishQuestionBankResponseSchema.parse(body).data;
        const lastPage = Math.min(
          ENGLISH_BANK_PAGE_MAX,
          Math.max(1, Math.ceil(data.total / data.pageSize)),
        );
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setLoaded({ key: requestKey, value: { status: "ready", data } });
        setChecked([]);
        setFocused((key) =>
          data.items.some((item) => item.key === key)
            ? key
            : (data.items[0]?.key ?? null),
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setLoaded({
            key: requestKey,
            value: { status: "error", message: messageOf(error) },
          });
      });
    return () => controller.abort();
  }, [query, grade, type, status, examId, page, retry, refreshKey, requestKey]);

  const data = result.status === "ready" ? result.data : null;
  const active = data?.items.find((item) => item.key === focused);
  const add = (items: EnglishBankQuestion[]) => {
    setTray((current) => addBankQuestions(current, items));
    setNotice(
      tray.length +
        items.filter(
          (item) =>
            !tray.some(
              (old) =>
                old.setId === item.setId &&
                old.questionIndex === item.questionIndex,
            ),
        ).length >
        ENGLISH_SELECTION_MAX
        ? `최대 ${ENGLISH_SELECTION_MAX}문항까지 담을 수 있습니다.`
        : `${items.length}문항을 선택 목록에 반영했습니다.`,
    );
  };
  const move = (index: number, direction: number) =>
    setTray((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction]!,
        next[index]!,
      ];
      return next;
    });
  const openPreview = async () => {
    if (resolving.current || !tray.length) return;
    resolving.current = true;
    setBusy(true);
    setNotice("");
    try {
      setPreview(await resolveBankQuestions(tray));
    } catch (error) {
      setNotice(
        statusOf(error) === 409
          ? "담은 문항의 원본이 변경되었습니다. 목록을 새로고침하고 해당 문항을 다시 담아 주세요."
          : messageOf(error),
      );
    } finally {
      resolving.current = false;
      setBusy(false);
    }
  };
  const filter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  return (
    <section className={s.bank} aria-label="영어 문제은행">
      <WorkspacePageHeader
        title="시험지 만들기"
        description="문제은행에서 필요한 문항을 찾고, 수업에 맞는 순서로 구성하세요."
      >
        {onMake && (
          <button className={s.primary} onClick={onMake}>
            <Icon name="plus" size={16} /> AI 문제 제작
          </button>
        )}
      </WorkspacePageHeader>
      <div className={s.workbar}>
        <div>
          <span className={s.eyebrow}>QUESTION LIBRARY</span>
          <h2>문제은행</h2>
        </div>
        <p>원문을 읽고 · 문항을 고르고 · 시험지로</p>
      </div>
      <div className={s.filters}>
        <label className={s.search}>
          <Icon name="search" size={18} />
          <input
            aria-label="문제 검색"
            placeholder="지문, 발문, 세트 이름 검색"
            maxLength={200}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          학년
          <select
            value={grade}
            onChange={(e) => filter(setGrade, e.target.value)}
          >
            <option value="">전체 학년</option>
            {ENGLISH_GRADES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          유형
          <select
            value={type}
            onChange={(e) => filter(setType, e.target.value)}
          >
            <option value="">전체 유형</option>
            {ENGLISH_QUESTION_TYPES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          세트 검토 상태
          <select
            value={status}
            onChange={(e) => filter(setStatus, e.target.value)}
          >
            <option value="">전체 상태</option>
            {ENGLISH_SET_STATUSES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          시험
          <select
            value={examId}
            onChange={(e) => filter(setExamId, e.target.value)}
          >
            <option value="">모든 시험</option>
            {exams.map((x) => (
              <option key={x.id} value={x.id}>
                {x.school} {x.grade} · {x.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      <div className={s.workspace}>
        <section className={s.results} aria-label="검색 결과">
          <div className={s.listHead}>
            <strong>
              {data ? `${data.total.toLocaleString()}문항` : "문항 검색"}
            </strong>
            <button onClick={() => setRetry((n) => n + 1)}>새로고침</button>
          </div>
          {result.status === "loading" && (
            <p className={s.empty} role="status">
              문항을 불러오는 중입니다…
            </p>
          )}
          {result.status === "error" && (
            <div className={s.empty} role="alert">
              <p>{result.message}</p>
              <button onClick={() => setRetry((n) => n + 1)}>다시 시도</button>
            </div>
          )}
          {data && (
            <>
              {!!data.items.length && (
                <div className={s.batch}>
                  <label>
                    <input
                      type="checkbox"
                      aria-label="현재 페이지 전체 선택"
                      checked={checked.length === data.items.length}
                      onChange={(e) =>
                        setChecked(
                          e.target.checked ? data.items.map((x) => x.key) : [],
                        )
                      }
                    />{" "}
                    전체 선택
                  </label>
                  <button
                    disabled={!checked.length || busy}
                    onClick={() =>
                      add(data.items.filter((x) => checked.includes(x.key)))
                    }
                  >
                    선택 담기 {checked.length || ""}
                  </button>
                </div>
              )}
              {!data.items.length && (
                <div className={s.empty}>
                  <h3>조건에 맞는 문항이 없습니다</h3>
                  <p>
                    검색 조건을 바꾸거나 AI 제작에서 새 문항을 저장해 보세요.
                  </p>
                  {onMake && (
                    <button onClick={onMake}>AI 문제 제작 열기</button>
                  )}
                </div>
              )}
              <ol className={s.questionList}>
                {data.items.map((item) => (
                  <li
                    key={item.key}
                    className={focused === item.key ? s.active : ""}
                  >
                    <input
                      type="checkbox"
                      aria-label={`${item.title} ${item.questionIndex + 1}번 선택`}
                      checked={checked.includes(item.key)}
                      onChange={(e) =>
                        setChecked((old) =>
                          e.target.checked
                            ? [...old, item.key]
                            : old.filter((key) => key !== item.key),
                        )
                      }
                    />
                    <button
                      className={s.row}
                      aria-pressed={focused === item.key}
                      onClick={() => setFocused(item.key)}
                    >
                      <span className={s.tags}>
                        <b>{item.question.type}</b>
                        <span>{item.grade}</span>
                        {item.difficulty && <span>{item.difficulty}</span>}
                      </span>
                      <strong>{item.question.prompt}</strong>
                      <small>
                        {item.title} · {item.questionIndex + 1}번
                      </small>
                      <small>
                        {item.school} · 세트 {item.status}
                      </small>
                    </button>
                  </li>
                ))}
              </ol>
              {data.total > data.pageSize && (
                <nav className={s.pagination} aria-label="문항 페이지">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    이전
                  </button>
                  <span>
                    {page} /{" "}
                    {Math.min(
                      ENGLISH_BANK_PAGE_MAX,
                      Math.ceil(data.total / data.pageSize),
                    )}
                  </span>
                  <button
                    disabled={
                      page >= ENGLISH_BANK_PAGE_MAX ||
                      page * data.pageSize >= data.total
                    }
                    onClick={() => setPage((p) => p + 1)}
                  >
                    다음
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
        <section className={s.detail} aria-label="문항 상세">
          {active ? (
            <>
              <div className={s.detailHead}>
                <div>
                  <span className={s.eyebrow}>QUESTION PREVIEW</span>
                  <h3>
                    {active.question.type} <span>· {active.grade}</span>
                  </h3>
                </div>
                <button
                  className={s.primary}
                  disabled={busy}
                  onClick={() => add([active])}
                >
                  {tray.some((x) => x.key === active.key)
                    ? "담은 문항"
                    : "이 문항 담기"}
                  <Icon name="plus" size={15} />
                </button>
              </div>
              <div className={s.sourceMeta}>
                <strong>{active.title}</strong>
                <span>
                  {active.school} · {active.examTitle} · 원본{" "}
                  {active.questionIndex + 1}번
                </span>
                <span>세트 검토 상태: {active.status}</span>
              </div>
              <details className={s.passage} open>
                <summary>원문</summary>
                <p lang="en">{active.passage}</p>
              </details>
              <div className={s.question}>
                <EnglishQuestionView
                  question={active.question}
                  number={active.questionIndex + 1}
                />
              </div>
              <div className={s.detailFoot}>
                <span>원문과 정답 근거를 함께 확인해 주세요.</span>
                <button onClick={() => onOpenSet(active)}>
                  원본 세트 편집 →
                </button>
              </div>
            </>
          ) : (
            <div className={s.empty}>
              <Icon name="bank" size={32} />
              <h3>문항을 선택해 주세요</h3>
              <p>원문, 선택지, 정답과 해설을 여기서 확인할 수 있습니다.</p>
            </div>
          )}
        </section>
        <aside className={s.tray} aria-label="담은 문제">
          <div className={s.trayTitle}>
            <span className={s.eyebrow}>YOUR PAPER</span>
            <h3>
              담은 문제 <b>{tray.length}</b>
            </h3>
            <p>수업에 맞게 순서를 정하세요.</p>
          </div>
          {tray.length ? (
            <ol className={s.trayList}>
              {tray.map((item, index) => (
                <li key={item.key}>
                  <div>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <span>
                      <strong>{item.question.type}</strong>
                      <small>{item.title}</small>
                    </span>
                  </div>
                  <div className={s.trayActions}>
                    <button
                      aria-label={`${index + 1}번 위로`}
                      disabled={busy || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`${index + 1}번 아래로`}
                      disabled={busy || index === tray.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        setTray((old) => old.filter((x) => x.key !== item.key))
                      }
                    >
                      빼기
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className={s.empty}>
              <p>
                선택한 문항을 담으면
                <br />
                시험지 구성이 시작됩니다.
              </p>
            </div>
          )}
          <div className={s.trayFooter}>
            <span>
              {tray.length} / {ENGLISH_SELECTION_MAX}문항
            </span>
            <button
              className={s.primary}
              disabled={!tray.length || busy}
              onClick={() => void openPreview()}
            >
              {busy ? "원본 확인 중…" : "시험지 미리보기"}
              <Icon name="arrow" size={16} />
            </button>
            <small>
              담은 목록은 현재 작업 중에 유지됩니다.
              <br />
              인쇄 전 원본의 최신 버전을 확인합니다.
            </small>
          </div>
        </aside>
      </div>
      {preview && (
        <EnglishBankPrint
          items={preview}
          onClose={() => setPreview(null)}
          onVerify={() => resolveBankQuestions(preview)}
        />
      )}
    </section>
  );
}
