"use client";

import Image from "next/image";
import {
  LISTENING_QUESTION_ORIGIN_LABELS,
  LISTENING_QUESTION_TYPE_LABELS,
} from "@/contracts/englishListeningMetadata.contract";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LISTENING_SOURCE_TRANSCRIPT_LABEL,
  listeningSourceTranscriptsResponseSchema,
  type ListeningSourceTranscript,
  type ListeningSourceTranscriptsResponse,
} from "@/contracts/englishListeningTranscript.contract";
import type {
  ListeningComposeSelection,
  ListeningComposeSource,
} from "@/contracts/englishListeningCompose.contract";
import type {
  ListeningDraft,
  ListeningSetDetail,
} from "@/contracts/englishListeningHttp.contract";
import { listeningError, listeningRequest } from "../listening/listeningClient";
import { usesWholeSourceAssessmentAudio } from "@/lib/english/listening/wholeSource";
import w from "@/components/unified/Workroom.module.css";
import s from "../EnglishStudio.module.css";
import b from "./EnglishResourceBank.module.css";
import c from "./ListeningBankMaterial.module.css";
import { BankError, BankLoading } from "./BankFeedback";
import {
  hasFullListeningQuestionImage,
  hasListeningChoiceText,
  listeningChoiceBody,
  listeningChoiceMarks,
} from "@/lib/listeningQuestionPresentation";

type Group = ListeningDraft["groups"][number];
type Question = Group["questions"][number];
interface BasketEntry {
  selection: ListeningComposeSelection;
  title: string;
  sourceNumber: number;
  sourceQuestionIds: string[];
  questions: {
    id: string;
    prompt: string;
    number: number;
    hasRange: boolean;
  }[];
}
const entryKey = (item: ListeningComposeSelection) =>
  `${item.setId}:${item.groupId}`;
const timeLabel = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

function TranscriptText({
  transcript,
  onSeek,
}: {
  transcript: ListeningSourceTranscript;
  onSeek: (startMs: number) => void;
}) {
  return (
    <div className={c.transcriptText}>
      <p className={b.meta}>{LISTENING_SOURCE_TRANSCRIPT_LABEL}</p>
      {transcript.timingReviewNeeded ? (
        <p className={b.notice}>
          AI 전사 시각 확인 필요 · 전체 원본을 듣고 확인해 주세요.
          {transcript.excludedWordCount > 0
            ? ` 음원 범위를 벗어난 단어 ${transcript.excludedWordCount}개를 제외했습니다.`
            : ""}
        </p>
      ) : null}
      {transcript.segments.length ? (
        <>
          <p className={b.note}>
            문단 시각은 AI 추정 위치이며 검증된 문항 시작점이 아닙니다. 시각을
            누르면 같은 전체 원본 음원이 해당 위치부터 계속 재생됩니다.
          </p>
          {transcript.segments.map((segment, index) => (
            <p
              key={`${transcript.id}:${index}`}
              className={c.transcriptParagraph}
            >
              <button
                type="button"
                className={c.transcriptSeek}
                onClick={() => onSeek(segment.startMs)}
                aria-label={`AI 추정 ${timeLabel(segment.startMs)}부터 전체 원본 이어 듣기`}
              >
                {timeLabel(segment.startMs)} · 추정
              </button>
              <span>{segment.text}</span>
            </p>
          ))}
        </>
      ) : (
        <p className={c.transcriptRaw}>{transcript.text}</p>
      )}
    </div>
  );
}

function SourceTranscriptPanel({
  assetId,
  durationMs,
  loadTranscripts,
  onSeek,
}: {
  assetId: string;
  durationMs: number;
  loadTranscripts: () => Promise<ListeningSourceTranscriptsResponse>;
  onSeek: (startMs: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] =
    useState<ListeningSourceTranscriptsResponse | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!expanded || response || error) return;
    let cancelled = false;
    void loadTranscripts()
      .then((result) => {
        if (!cancelled) setResponse(result);
      })
      .catch((cause) => {
        if (!cancelled) setError(listeningError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, response, error, attempt, loadTranscripts]);
  const items =
    response?.items.filter(
      (item) => item.assetId === assetId && item.durationMs === durationMs,
    ) ?? [];
  const english = items.find((item) => item.profile === "english");
  const bilingual = items.find((item) => item.profile === "bilingual");
  return (
    <details
      data-source-transcript
      className={c.sourceTranscript}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>{LISTENING_SOURCE_TRANSCRIPT_LABEL} · 영어 전사 보기</summary>
      {expanded ? (
        error ? (
          <div role="alert">
            <p>{error}</p>
            <button
              type="button"
              className={w.outlineButton}
              onClick={() => {
                setError("");
                setAttempt((value) => value + 1);
              }}
            >
              다시 불러오기
            </button>
          </div>
        ) : !response ? (
          <p role="status">전사를 불러오는 중…</p>
        ) : (
          <>
            {english ? (
              <TranscriptText transcript={english} onSeek={onSeek} />
            ) : (
              <p className={b.note}>
                현재 원본 음원에 맞는 영어 전사가 없습니다.
              </p>
            )}
            {bilingual ? (
              <details className={c.bilingualTranscript}>
                <summary>
                  {LISTENING_SOURCE_TRANSCRIPT_LABEL} · 한국어·영어 전사 보기
                </summary>
                <TranscriptText transcript={bilingual} onSeek={onSeek} />
              </details>
            ) : null}
          </>
        )
      ) : null}
    </details>
  );
}

function MaterialGroup({
  group,
  index,
  mediaUrl,
  wholeSourceAudio,
  loadTranscripts,
  checked,
  onToggle,
}: {
  group: Group;
  index: number;
  mediaUrl?: string;
  wholeSourceAudio: boolean;
  loadTranscripts: () => Promise<ListeningSourceTranscriptsResponse>;
  checked: Set<string>;
  onToggle: (id: string) => void;
}) {
  const player = useRef<HTMLAudioElement>(null);
  const stopAt = useRef<number | null>(null);
  const pendingStart = useRef<number | null>(null);
  useEffect(() => {
    const audio = player.current;
    stopAt.current = null;
    pendingStart.current = null;
    return () => audio?.pause();
  }, [mediaUrl]);
  function seek(startMs: number, endMs?: number) {
    const audio = player.current;
    if (!audio) return;
    stopAt.current = endMs === undefined ? null : endMs / 1000;
    const start = startMs / 1000;
    if (audio.readyState >= 1) {
      pendingStart.current = null;
      audio.currentTime = start;
    } else pendingStart.current = start;
    void audio.play().catch(() => {
      stopAt.current = null;
      pendingStart.current = null;
    });
  }
  return (
    <section className={c.group}>
      <h3>
        음원 {index + 1} · {group.questions.length}문항
      </h3>
      {wholeSourceAudio ? <p className={b.meta}>회차 전체 원본 음원</p> : null}
      {mediaUrl ? (
        <audio
          ref={player}
          className={c.player}
          controls
          preload="none"
          src={mediaUrl}
          aria-label={`음원 ${index + 1}`}
          onLoadedMetadata={() => {
            if (player.current && pendingStart.current !== null) {
              player.current.currentTime = pendingStart.current;
              pendingStart.current = null;
            }
          }}
          onTimeUpdate={() => {
            if (
              player.current &&
              stopAt.current !== null &&
              player.current.currentTime >= stopAt.current
            ) {
              player.current.pause();
              stopAt.current = null;
            }
          }}
          onSeeked={() => {
            if (
              player.current &&
              stopAt.current !== null &&
              player.current.currentTime > stopAt.current
            )
              stopAt.current = null;
          }}
        />
      ) : (
        <p className={b.note}>올린 음원이 없습니다.</p>
      )}
      {mediaUrl && group.audio ? (
        <p className={b.meta}>
          음원 길이 {timeLabel(group.audio.durationMs)} · 재생할 때 불러옵니다.
        </p>
      ) : null}
      {group.transcript?.text ? (
        <details className={c.officialTranscript}>
          <summary>기존 대본 보기</summary>
          <p className={c.transcriptRaw}>{group.transcript.text}</p>
        </details>
      ) : null}
      {wholeSourceAudio && mediaUrl && group.audio ? (
        <SourceTranscriptPanel
          assetId={group.audio.assetId}
          durationMs={group.audio.durationMs}
          loadTranscripts={loadTranscripts}
          onSeek={(startMs) => seek(startMs)}
        />
      ) : null}
      <ol className={c.questions}>
        {group.questions.map((raw, questionIndex) => {
          const question = raw as Question;
          const number = question.sourceNumber ?? questionIndex + 1;
          const fullImage = hasFullListeningQuestionImage(question.image);
          return (
            <li key={question.id}>
              <label className={c.questionLabel}>
                <input
                  type="checkbox"
                  checked={checked.has(question.id)}
                  onChange={() => onToggle(question.id)}
                  disabled={!group.audio}
                  aria-label={fullImage ? `${number}번 문항 담기` : undefined}
                />
                <span>
                  <strong>
                    {fullImage
                      ? `${number}번 문항 담기`
                      : `${number}. ${question.prompt || "문항 이미지"}`}
                  </strong>
                </span>
              </label>
              {question.metadata && (
                <p className={b.meta}>
                  {LISTENING_QUESTION_ORIGIN_LABELS[question.metadata.origin]} ·{" "}
                  {
                    LISTENING_QUESTION_TYPE_LABELS[
                      question.metadata.questionType
                    ]
                  }
                  {question.metadata.topics.length
                    ? ` · ${question.metadata.topics.join(" · ")}`
                    : ""}
                  {question.metadata.reconstruction?.verification ===
                  "needs_review"
                    ? " · 교사 검토 필요"
                    : ""}
                </p>
              )}
              {question.instruction &&
              (fullImage || !question.prompt.includes(question.instruction)) ? (
                <p>{question.instruction}</p>
              ) : null}
              {question.image ? (
                <Image
                  className={c.questionImage}
                  unoptimized
                  src={question.image.dataUrl}
                  width={question.image.width}
                  height={question.image.height}
                  alt={fullImage ? question.prompt : `${number}번 시각 자료`}
                />
              ) : null}
              {!fullImage &&
              (!question.image ||
                hasListeningChoiceText(
                  question.choices.map((choice) => choice.text),
                )) ? (
                <ol className={c.choices}>
                  {question.choices.map((choice, choiceIndex) => (
                    <li key={choice.id}>
                      {listeningChoiceMarks[choiceIndex]}{" "}
                      {listeningChoiceBody(choice.text, choiceIndex)}
                    </li>
                  ))}
                </ol>
              ) : null}
              {question.audioRange && mediaUrl ? (
                <button
                  type="button"
                  className={w.outlineButton}
                  onClick={() =>
                    seek(
                      question.audioRange!.startMs,
                      wholeSourceAudio ? undefined : question.audioRange!.endMs,
                    )
                  }
                >
                  {wholeSourceAudio
                    ? `${timeLabel(question.audioRange.startMs)}부터 이어 듣기`
                    : `${timeLabel(question.audioRange.startMs)}–${timeLabel(question.audioRange.endMs)} 문항 듣기`}
                </button>
              ) : wholeSourceAudio ? null : (
                <span className={b.meta}>
                  개별 음원 구간 미지정 · 회차 전체 음원 제공
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Keep mounted while bank filters change so a basket can contain several source rounds. */
export default function ListeningBankMaterial({
  active,
  setId,
  onOpenListening,
  onState,
}: {
  active: boolean;
  setId: string;
  onOpenListening: (id: string) => void;
  onState?: (dirty: boolean, busy: boolean) => void;
}) {
  const [source, setSource] = useState<ListeningComposeSource | null>(null);
  const [loadError, setLoadError] = useState<{
    setId: string;
    message: string;
  } | null>(null);
  const [generation, setGeneration] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [basket, setBasket] = useState<BasketEntry[]>([]);
  const [title, setTitle] = useState("듣기 시험지");
  const [includeWholeAudio, setIncludeWholeAudio] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [created, setCreated] = useState<ListeningSetDetail | null>(null);
  const [rightsBasis, setRightsBasis] = useState("");
  const command = useRef<AbortController | null>(null);
  const transcriptRequest = useRef<{
    key: string;
    controller: AbortController;
    promise: Promise<ListeningSourceTranscriptsResponse>;
  } | null>(null);
  const materialElement = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active)
      materialElement.current
        ?.querySelectorAll("audio")
        .forEach((audio) => audio.pause());
  }, [active]);
  useEffect(() => () => command.current?.abort(), []);
  useEffect(() => {
    if (!active || !setId) return;
    const controller = new AbortController();
    void listeningRequest<ListeningComposeSource>(
      `/sets/${setId}/compose-source`,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setSource(result);
          setChecked(new Set());
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setLoadError({ setId, message: listeningError(error) });
      });
    return () => controller.abort();
  }, [active, setId, generation]);
  const current = source?.detail.id === setId ? source : null;
  const documentHash = current?.documentHash;
  useEffect(
    () => () => {
      transcriptRequest.current?.controller.abort();
      transcriptRequest.current = null;
    },
    [setId, documentHash],
  );
  const loadTranscripts = useCallback(() => {
    const key = `${setId}:${documentHash}`;
    if (transcriptRequest.current?.key === key)
      return transcriptRequest.current.promise;
    transcriptRequest.current?.controller.abort();
    const controller = new AbortController();
    const promise = listeningRequest<ListeningSourceTranscriptsResponse>(
      `/sets/${setId}/source-transcripts`,
      controller.signal,
    )
      .then((result) => {
        const response = listeningSourceTranscriptsResponseSchema.parse(result);
        if (response.setId !== setId)
          throw new Error("자료를 새로 불러와 주세요.");
        return response;
      })
      .catch((cause) => {
        if (transcriptRequest.current?.controller === controller)
          transcriptRequest.current = null;
        throw cause;
      });
    transcriptRequest.current = { key, controller, promise };
    return promise;
  }, [setId, documentHash]);
  const questionCount = basket.reduce(
    (total, entry) => total + entry.questions.length,
    0,
  );
  useEffect(() => {
    onState?.(questionCount > 0, busy);
  }, [onState, questionCount, busy]);
  useEffect(() => () => onState?.(false, false), [onState]);
  const missingRanges = basket.some((entry) => {
    if (entry.selection.audioMode === "whole_source") return false;
    const full =
      entry.sourceQuestionIds.length === entry.questions.length &&
      entry.sourceQuestionIds.every(
        (id, index) => id === entry.questions[index].id,
      );
    return !full && entry.questions.some((question) => !question.hasRange);
  });
  function add(all: boolean) {
    if (!current) return;
    const additions: BasketEntry[] = current.detail.document.groups.flatMap(
      (group, index) => {
        const wholeSourceAudio = usesWholeSourceAssessmentAudio({
          source: current.detail.document.source,
          groups: [group],
        });
        const questions = group.questions.filter(
          (question) => all || checked.has(question.id),
        );
        if (!questions.length || !group.audio) return [];
        return [
          {
            selection: {
              setId,
              expectedRevision: current.detail.revision,
              documentHash: current.documentHash,
              groupId: group.id,
              questionIds: questions.map((question) => question.id),
              ...(wholeSourceAudio
                ? { audioMode: "whole_source" as const }
                : {}),
            },
            title: current.detail.document.title,
            sourceNumber: index + 1,
            sourceQuestionIds: group.questions.map((question) => question.id),
            questions: questions.map((question) => ({
              id: question.id,
              prompt: question.prompt,
              number:
                question.sourceNumber ??
                group.questions.findIndex((item) => item.id === question.id) +
                  1,
              hasRange: Boolean((question as Question).audioRange),
            })),
          },
        ];
      },
    );
    if (!additions.length) {
      setNotice("음원이 있는 문항을 선택해 주세요.");
      return;
    }
    if (
      additions.some((addition) =>
        basket.some(
          (entry) =>
            entryKey(entry.selection) === entryKey(addition.selection) &&
            (entry.selection.expectedRevision !==
              addition.selection.expectedRevision ||
              entry.selection.documentHash !== addition.selection.documentHash),
        ),
      )
    ) {
      setNotice(
        "담아 둔 원본 자료가 변경되었습니다. 기존 묶음을 지운 뒤 다시 담아 주세요.",
      );
      return;
    }
    setBasket((previous) => {
      const next = [...previous];
      for (const addition of additions) {
        const index = next.findIndex(
          (entry) => entryKey(entry.selection) === entryKey(addition.selection),
        );
        if (index < 0) next.push(addition);
        else {
          const merged = [
            ...next[index].questions,
            ...addition.questions.filter(
              (question) =>
                !next[index].selection.questionIds.includes(question.id),
            ),
          ].sort((a, b) => a.number - b.number);
          next[index] = {
            ...addition,
            questions: merged,
            selection: {
              ...addition.selection,
              questionIds: merged.map((question) => question.id),
            },
          };
        }
      }
      return next;
    });
    setChecked(new Set());
    setNotice(all ? "전체 회차를 담았습니다." : "선택한 문항을 담았습니다.");
  }
  async function create() {
    if (
      busy ||
      !basket.length ||
      !title.trim() ||
      (missingRanges && !includeWholeAudio)
    )
      return;
    const controller = new AbortController();
    command.current = controller;
    setBusy(true);
    setNotice("");
    try {
      const result = await listeningRequest<ListeningSetDetail>(
        "/compose",
        controller.signal,
        "POST",
        {
          title: title.trim(),
          selections: basket.map((entry) => {
            const full =
              entry.sourceQuestionIds.length === entry.questions.length &&
              entry.sourceQuestionIds.every(
                (id, index) => id === entry.questions[index].id,
              );
            return {
              ...entry.selection,
              ...(!full &&
              entry.questions.some((question) => !question.hasRange) &&
              includeWholeAudio
                ? { audioMode: "whole_source" as const }
                : {}),
            };
          }),
        },
      );
      if (controller.signal.aborted) return;
      setCreated(result);
      setBasket([]);
      setRightsBasis(result.document.provenance.basis);
      setNotice("담은 문항으로 새 시험지를 만들었습니다.");
    } catch (error) {
      if (!controller.signal.aborted) setNotice(listeningError(error));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function confirmRights() {
    if (!created || busy || !rightsBasis.trim()) return;
    const controller = new AbortController();
    command.current = controller;
    setBusy(true);
    setNotice("");
    try {
      const result = await listeningRequest<ListeningSetDetail>(
        `/sets/${created.id}/review`,
        controller.signal,
        "POST",
        {
          expectedRevision: created.revision,
          kind: "rights",
          basis: rightsBasis.trim(),
        },
      );
      if (!controller.signal.aborted) {
        setCreated(result);
        setNotice(
          "시험지의 사용 권리를 확인했습니다. 인쇄와 재생을 사용할 수 있습니다.",
        );
      }
    } catch (error) {
      if (!controller.signal.aborted) setNotice(listeningError(error));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function move(index: number, direction: number) {
    setBasket((previous) => {
      const next = [...previous];
      const target = index + direction;
      if (target >= 0 && target < next.length)
        [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function removeQuestion(index: number, id: string) {
    setBasket((previous) =>
      previous.flatMap((entry, entryIndex) => {
        if (entryIndex !== index) return [entry];
        const questions = entry.questions.filter(
          (question) => question.id !== id,
        );
        return questions.length
          ? [
              {
                ...entry,
                questions,
                selection: {
                  ...entry.selection,
                  questionIds: questions.map((question) => question.id),
                },
              },
            ]
          : [];
      }),
    );
  }
  const canPrint = Boolean(created?.document.rightsReview);
  return (
    <div ref={materialElement} className={c.material}>
      {setId && active ? (
        loadError?.setId === setId ? (
          <BankError
            message={loadError.message}
            onRetry={() => setGeneration((value) => value + 1)}
          />
        ) : !current ? (
          <BankLoading />
        ) : (
          <>
            <h2>{current.detail.document.title}</h2>
            <p className={b.meta}>
              {current.detail.document.level || "학년 미지정"} ·{" "}
              {current.detail.document.groups.reduce(
                (total, group) => total + group.questions.length,
                0,
              )}
              문항
            </p>
            <div className={b.actions}>
              <button
                type="button"
                className={w.primaryButton}
                disabled={
                  busy ||
                  !current.detail.document.groups.some(
                    (group) => group.audio && group.questions.length,
                  )
                }
                onClick={() => add(true)}
              >
                전체 회차 담기
              </button>
              <button
                type="button"
                className={w.outlineButton}
                disabled={busy || !checked.size}
                onClick={() => add(false)}
              >
                선택 {checked.size}문항 담기
              </button>
              <button
                type="button"
                className={w.outlineButton}
                onClick={() => onOpenListening(setId)}
              >
                원본 편집
              </button>
            </div>
            {current.detail.document.groups.map((group, index) => (
              <MaterialGroup
                key={`${setId}:${group.id}:${current.documentHash}`}
                group={group}
                index={index}
                wholeSourceAudio={usesWholeSourceAssessmentAudio({
                  source: current.detail.document.source,
                  groups: [group],
                })}
                loadTranscripts={loadTranscripts}
                mediaUrl={
                  group.audio
                    ? current.detail.mediaUrlsByAssetId[group.audio.assetId]
                    : undefined
                }
                checked={checked}
                onToggle={(id) =>
                  setChecked((previous) => {
                    const next = new Set(previous);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
              />
            ))}
            {!current.detail.document.groups.length ? (
              <p className={b.note}>
                문항이 없습니다. 원본 편집에서 음원과 문항을 추가해 주세요.
              </p>
            ) : null}
          </>
        )
      ) : (
        <p className={b.note}>
          자료를 선택하면 여기서 듣고, 전체 회차나 개별 문항을 담을 수 있습니다.
        </p>
      )}
      <section className={c.basket} aria-label="듣기 시험지 장바구니">
        <div className={c.basketHeading}>
          <h2>담은 문항 · {questionCount}문항</h2>
          <button
            type="button"
            className={w.outlineButton}
            disabled={busy || !basket.length}
            onClick={() => {
              setBasket([]);
              setNotice("장바구니를 비웠습니다.");
            }}
          >
            전체 비우기
          </button>
        </div>
        {!basket.length ? (
          <p className={b.note}>여러 자료의 문항을 함께 담을 수 있습니다.</p>
        ) : (
          <ol className={c.basketList}>
            {basket.map((entry, index) => (
              <li key={entryKey(entry.selection)}>
                <div className={c.basketHeading}>
                  <strong>
                    {index + 1}. {entry.title} · 음원 {entry.sourceNumber}
                  </strong>
                  <div className={c.orderActions}>
                    <button
                      type="button"
                      className={w.outlineButton}
                      aria-label={`${entry.title} 위로 이동`}
                      disabled={busy || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={w.outlineButton}
                      aria-label={`${entry.title} 아래로 이동`}
                      disabled={busy || index === basket.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={w.outlineButton}
                      disabled={busy}
                      onClick={() =>
                        setBasket((previous) =>
                          previous.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        )
                      }
                    >
                      묶음 빼기
                    </button>
                  </div>
                </div>
                <ul className={c.basketQuestions}>
                  {entry.questions.map((question) => (
                    <li key={question.id}>
                      <span>
                        {question.number}번 · {question.prompt || "원본 문항"}
                      </span>
                      <button
                        type="button"
                        className={w.outlineButton}
                        disabled={busy}
                        aria-label={`${entry.title} ${question.number}번 빼기`}
                        onClick={() => removeQuestion(index, question.id)}
                      >
                        빼기
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
        <div className={c.createRow}>
          <label className={s.field}>
            새 시험지 제목
            <input
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={w.primaryButton}
            disabled={
              busy ||
              !questionCount ||
              !title.trim() ||
              (missingRanges && !includeWholeAudio) ||
              basket.length > 30
            }
            onClick={() => void create()}
          >
            {busy ? "처리 중…" : "담은 문항으로 시험지 만들기"}
          </button>
        </div>
        {missingRanges ? (
          <p className={b.notice}>
            <label>
              <input
                type="checkbox"
                checked={includeWholeAudio}
                onChange={(event) => setIncludeWholeAudio(event.target.checked)}
              />{" "}
              구간 미지정 문항은 회차 전체 음원과 함께 만들기
            </label>
            <br />
            시험지에는 선택한 문항만 넣습니다. 문항별 음원만 사용하려면 원본
            편집에서 시작·끝 시각을 지정해 주세요.
          </p>
        ) : null}
        {basket.length > 30 ? (
          <p className={b.notice}>
            시험지 하나에는 음원 묶음 30개까지 담을 수 있습니다.
          </p>
        ) : null}
      </section>
      {notice ? (
        <p className={b.notice} role="status">
          {notice}
        </p>
      ) : null}
      {created ? (
        <section className={c.created} aria-label="만든 듣기 시험지">
          <h2>{created.document.title}</h2>
          {!canPrint ? (
            <div className={c.createRow}>
              <label className={s.field}>
                출처와 이용 권리 확인 근거
                <input
                  value={rightsBasis}
                  maxLength={1000}
                  onChange={(event) => setRightsBasis(event.target.value)}
                />
              </label>
              <button
                type="button"
                className={w.primaryButton}
                disabled={busy || !rightsBasis.trim()}
                onClick={() => void confirmRights()}
              >
                사용 권리 확인
              </button>
            </div>
          ) : null}
          <div className={b.actions}>
            {canPrint &&
            created.document.rights.allowedUses.includes("distribution") ? (
              <a
                className={w.outlineButton}
                href={`/english/listening/sets/${created.id}/draft-print?view=student&revision=${created.revision}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                학생용 시험지 인쇄
              </a>
            ) : null}
            {canPrint ? (
              <a
                className={w.outlineButton}
                href={`/english/listening/sets/${created.id}/draft-print?view=teacher&revision=${created.revision}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                교사용 정답·해설 인쇄
              </a>
            ) : null}
            <button
              type="button"
              className={w.outlineButton}
              onClick={() => onOpenListening(created.id)}
            >
              검수·학생 배정
            </button>
          </div>
          {canPrint
            ? created.document.groups.map((group, index) =>
                group.audio ? (
                  <div key={group.id} className={c.outputAudio}>
                    <strong>시험 음원 {index + 1}</strong>
                    <audio
                      className={c.player}
                      controls
                      preload="metadata"
                      src={created.mediaUrlsByAssetId[group.audio.assetId]}
                      aria-label={`시험 음원 ${index + 1}`}
                    />
                  </div>
                ) : null,
              )
            : null}
        </section>
      ) : null}
    </div>
  );
}
