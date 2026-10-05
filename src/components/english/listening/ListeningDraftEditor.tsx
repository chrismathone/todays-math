"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { EnglishV2Use } from "@/contracts/englishV2.contract";
import type { ListeningAssessmentSource } from "@/contracts/englishListeningSource.contract";
import { usesWholeSourceAssessmentAudio } from "@/lib/english/listening/wholeSource";
import { ListeningTeacherAudio } from "./ListeningTeacherAudio";
import {
  newListeningGroup,
  newListeningQuestion,
  type ListeningEdit,
  type ListeningEditGroup,
} from "./listeningDraft";
import s from "./ListeningTeacherWorkspace.module.css";

const uses: [EnglishV2Use, string][] = [
  ["store_original", "음원 원본 보관"],
  ["teacher_review", "교사 검수·재생"],
  ["distribution", "학생에게 배정"],
];

export function ListeningDraftEditor({
  draft,
  setDraft,
  saved,
  busy,
  mediaUrls,
  onSave,
  onUpload,
  onClose,
  onConfirmRights,
  rightsReviewed,
  source,
}: {
  draft: ListeningEdit;
  setDraft: Dispatch<SetStateAction<ListeningEdit | null>>;
  saved: boolean;
  busy: boolean;
  mediaUrls: Record<string, string>;
  onSave: () => void;
  onUpload: (groupId: string, file: File) => void;
  onClose: () => void;
  onConfirmRights: () => void;
  rightsReviewed: boolean;
  source?: ListeningAssessmentSource;
}) {
  const [rightsChecked, setRightsChecked] = useState(false);
  const usesWholeAudio = (group: ListeningEditGroup) =>
    usesWholeSourceAssessmentAudio({ source, groups: [group] });
  function change(patch: Partial<ListeningEdit>) {
    if (patch.basis !== undefined || patch.rights !== undefined)
      setRightsChecked(false);
    setDraft((value) => (value ? { ...value, ...patch } : value));
  }
  function changeGroup(
    id: string,
    update: (group: ListeningEditGroup) => ListeningEditGroup,
  ) {
    setDraft((value) =>
      value
        ? {
            ...value,
            groups: value.groups.map((group) =>
              group.id === id ? update(group) : group,
            ),
          }
        : value,
    );
  }
  return (
    <form
      className={s.editor}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className={s.reviewHeading}>
        <h2>{saved ? "듣기 자료 수정" : "듣기 자료 만들기"}</h2>
        <p className={s.muted}>빈 항목이 있어도 초안으로 저장할 수 있습니다.</p>
      </div>
      <fieldset disabled={busy} className={s.formSection}>
        <legend>자료 정보와 사용 권리</legend>
        <div className={s.formGrid}>
          <label>
            자료 제목
            <input
              maxLength={200}
              value={draft.title}
              onChange={(event) => change({ title: event.target.value })}
            />
          </label>
          <label>
            수준·학년
            <input
              maxLength={80}
              value={draft.level ?? ""}
              onChange={(event) =>
                change({ level: event.target.value || null })
              }
            />
          </label>
        </div>
        <label>
          제작 출처·사용 허락 근거
          <textarea
            rows={3}
            maxLength={1000}
            value={draft.basis}
            onChange={(event) => change({ basis: event.target.value })}
            placeholder="직접 제작 여부, 출처와 사용 허락 범위를 적으세요."
          />
        </label>
        <p className={s.muted}>
          허락을 확인한 용도를 선택하세요. 발행 전 별도로 권리 검수를
          확인합니다.
        </p>
        <div className={s.checks}>
          {uses.map(([use, label]) => (
            <label key={use} className={s.check}>
              <input
                type="checkbox"
                checked={draft.rights.allowedUses.includes(use as never)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...draft.rights.allowedUses, use]
                    : draft.rights.allowedUses.filter((item) => item !== use);
                  change({
                    rights: next.length
                      ? { rightsStatus: "approved", allowedUses: next }
                      : { rightsStatus: "unknown", allowedUses: [] },
                  });
                }}
              />
              {label}
            </label>
          ))}
        </div>
        <label className={s.check}>
          <input
            type="checkbox"
            checked={rightsChecked}
            onChange={(event) => setRightsChecked(event.target.checked)}
          />
          적은 출처와 사용 허락을 직접 확인했습니다
        </label>
        <button
          type="button"
          disabled={!rightsChecked || !draft.basis.trim()}
          onClick={() => {
            setRightsChecked(false);
            onConfirmRights();
          }}
        >
          초안 저장 후 권리 검수 기록
        </button>
        <p className={s.muted}>
          {rightsReviewed
            ? "사용 권리를 확인했습니다."
            : "음원을 올리기 전에 출처와 사용 권리를 확인하고 기록하세요."}
        </p>
      </fieldset>
      {draft.groups.map((group, gi) => (
        <fieldset key={group.id} className={s.formSection} disabled={busy}>
          <legend>묶음 {gi + 1} · 하나의 음원과 대본</legend>
          <div className={s.reviewHeading}>
            <label>
              묶음 {gi + 1} 음원 (MP3·WAV)
              <input
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                disabled={
                  !saved ||
                  !rightsReviewed ||
                  !draft.rights.allowedUses.includes("store_original" as never)
                }
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(group.id, file);
                  event.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`묶음 ${gi + 1}과 문항을 지울까요?`))
                  change({
                    groups: draft.groups.filter((item) => item.id !== group.id),
                  });
              }}
            >
              묶음 {gi + 1} 삭제
            </button>
          </div>
          <p className={s.muted}>
            {!saved
              ? "초안을 먼저 저장한 뒤 음원을 올리세요."
              : "MP3·WAV, 최대 64MB·30분. 원본 보관 권한을 확인한 자료만 올리세요."}
          </p>
          {group.audio ? (
            <>
              <p>
                {usesWholeAudio(group) ? "회차 전체 원본 음원" : "음원 등록됨"}{" "}
                · {(group.audio.durationMs / 1000).toFixed(1)}초
              </p>
              <ListeningTeacherAudio
                key={`${group.audio.assetId}:${group.audio.sha256}:${mediaUrls[group.audio.assetId] ?? ""}`}
                url={mediaUrls[group.audio.assetId]}
                durationMs={group.audio.durationMs}
                disabled={busy}
              />
            </>
          ) : (
            <p className={s.muted}>아직 음원이 없습니다.</p>
          )}
          <label>
            묶음 {gi + 1} 영어 대본
            <textarea
              lang="en"
              rows={5}
              maxLength={40000}
              value={group.transcript.text}
              onChange={(event) =>
                changeGroup(group.id, (item) => ({
                  ...item,
                  transcript: { ...item.transcript, text: event.target.value },
                }))
              }
            />
          </label>
          <label>
            묶음 {gi + 1} 발음용 대본
            <textarea
              lang="en"
              rows={3}
              maxLength={40000}
              value={group.transcript.spokenText}
              onChange={(event) =>
                changeGroup(group.id, (item) => ({
                  ...item,
                  transcript: {
                    ...item.transcript,
                    spokenText: event.target.value,
                  },
                }))
              }
            />
          </label>
          <button
            type="button"
            onClick={() =>
              changeGroup(group.id, (item) => ({
                ...item,
                transcript: {
                  ...item.transcript,
                  spokenText: item.transcript.text,
                },
              }))
            }
          >
            영어 대본을 발음용으로 복사
          </button>
          <label>
            묶음 {gi + 1} 해석
            <textarea
              rows={3}
              maxLength={40000}
              value={group.transcript.translation ?? ""}
              onChange={(event) =>
                changeGroup(group.id, (item) => ({
                  ...item,
                  transcript: {
                    ...item.transcript,
                    translation: event.target.value || null,
                  },
                }))
              }
            />
          </label>
          {group.questions.map((question, qi) => {
            const prefix = `묶음 ${gi + 1} 문항 ${qi + 1}`;
            const update = (patch: Partial<typeof question>) =>
              changeGroup(group.id, (item) => ({
                ...item,
                questions: item.questions.map((q) =>
                  q.id === question.id ? { ...q, ...patch } : q,
                ),
              }));
            return (
              <fieldset key={question.id} className={s.questionFields}>
                <legend>문항 {qi + 1}</legend>
                <label>
                  {prefix} 문제
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={question.prompt}
                    onChange={(event) => update({ prompt: event.target.value })}
                  />
                </label>
                {question.image && (
                  <>
                    <label>
                      {prefix} 그림 용도
                      <select
                        value={question.image.role ?? "question"}
                        onChange={(event) =>
                          update({
                            image: {
                              ...question.image!,
                              role: event.target.value as "question" | "visual",
                            },
                          })
                        }
                      >
                        <option value="question">문항 전체</option>
                        <option value="visual">그림·표만</option>
                      </select>
                    </label>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={question.image.dataUrl}
                      width={question.image.width}
                      height={question.image.height}
                      alt={`${prefix} ${question.image.role === "visual" ? "시각 자료" : "원본 문제지"}`}
                      style={{ maxWidth: "100%", height: "auto" }}
                    />
                  </>
                )}
                {usesWholeAudio(group) ? null : (
                  <>
                    <div className={s.formGrid}>
                      <label>
                        {prefix} 전체 음원 시작 (초)
                        <input
                          type="number"
                          min={0}
                          step={0.001}
                          value={
                            question.audioRange
                              ? question.audioRange.startMs / 1000
                              : ""
                          }
                          onChange={(event) => {
                            const startMs = Math.round(
                              Number(event.target.value) * 1000,
                            );
                            update({
                              audioRange:
                                event.target.value === ""
                                  ? undefined
                                  : {
                                      startMs,
                                      endMs: Math.max(
                                        startMs + 1,
                                        question.audioRange?.endMs ??
                                          startMs + 1000,
                                      ),
                                    },
                            });
                          }}
                        />
                      </label>
                      <label>
                        {prefix} 전체 음원 끝 (초)
                        <input
                          type="number"
                          min={0}
                          step={0.001}
                          value={
                            question.audioRange
                              ? question.audioRange.endMs / 1000
                              : ""
                          }
                          onChange={(event) => {
                            const endMs = Math.round(
                              Number(event.target.value) * 1000,
                            );
                            update({
                              audioRange:
                                event.target.value === ""
                                  ? undefined
                                  : {
                                      startMs:
                                        question.audioRange?.startMs ?? 0,
                                      endMs,
                                    },
                            });
                          }}
                        />
                      </label>
                    </div>
                    <p className={s.muted}>
                      문항별로 담을 때 사용할 전체 구간입니다. 아래 정답 근거
                      구간과 별도로 지정합니다.
                    </p>
                  </>
                )}
                {question.choices.map((choice, ci) => (
                  <div key={choice.id} className={s.choiceFields}>
                    <label>
                      {prefix} 보기 {ci + 1}
                      <input
                        maxLength={2000}
                        value={choice.text}
                        onChange={(event) =>
                          update({
                            choices: question.choices.map((c) =>
                              c.id === choice.id
                                ? { ...c, text: event.target.value }
                                : c,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      aria-label={`${prefix} 보기 ${ci + 1} 삭제`}
                      onClick={() =>
                        update({
                          choices: question.choices.filter(
                            (c) => c.id !== choice.id,
                          ),
                          answerChoiceId:
                            question.answerChoiceId === choice.id
                              ? null
                              : question.answerChoiceId,
                        })
                      }
                    >
                      보기 삭제
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={question.choices.length >= 5}
                  onClick={() =>
                    update({
                      choices: [
                        ...question.choices,
                        { id: crypto.randomUUID(), text: "" },
                      ],
                    })
                  }
                >
                  보기 추가
                </button>
                <label>
                  {prefix} 정답
                  <select
                    value={question.answerChoiceId ?? ""}
                    onChange={(event) =>
                      update({ answerChoiceId: event.target.value || null })
                    }
                  >
                    <option value="">아직 정하지 않음</option>
                    {question.choices.map((choice, ci) => (
                      <option key={choice.id} value={choice.id}>
                        {ci + 1}. {choice.text || "빈 보기"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {prefix} 해설
                  <textarea
                    rows={3}
                    maxLength={10000}
                    value={question.explanation}
                    onChange={(event) =>
                      update({ explanation: event.target.value })
                    }
                  />
                </label>
                <p className={s.muted}>정답 근거 구간 · 초 단위로 입력</p>
                {question.evidence.map((range, ri) => (
                  <div key={ri} className={s.interval}>
                    <label>
                      {prefix} 근거 {ri + 1} 시작
                      <input
                        type="number"
                        min={0}
                        step={0.001}
                        value={range.startMs / 1000}
                        onChange={(event) =>
                          update({
                            evidence: question.evidence.map((r, i) =>
                              i === ri
                                ? {
                                    ...r,
                                    startMs: Math.round(
                                      Number(event.target.value) * 1000,
                                    ),
                                  }
                                : r,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      {prefix} 근거 {ri + 1} 끝
                      <input
                        type="number"
                        min={0}
                        step={0.001}
                        value={range.endMs / 1000}
                        onChange={(event) =>
                          update({
                            evidence: question.evidence.map((r, i) =>
                              i === ri
                                ? {
                                    ...r,
                                    endMs: Math.round(
                                      Number(event.target.value) * 1000,
                                    ),
                                  }
                                : r,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      aria-label={`${prefix} 근거 ${ri + 1} 삭제`}
                      onClick={() =>
                        update({
                          evidence: question.evidence.filter(
                            (_, i) => i !== ri,
                          ),
                        })
                      }
                    >
                      구간 삭제
                    </button>
                  </div>
                ))}
                <div className={s.actions}>
                  <button
                    type="button"
                    disabled={question.evidence.length >= 50}
                    onClick={() =>
                      update({
                        evidence: [
                          ...question.evidence,
                          {
                            startMs: 0,
                            endMs: group.audio?.durationMs ?? 1000,
                          },
                        ],
                      })
                    }
                  >
                    근거 구간 추가
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`${prefix}을 지울까요?`))
                        changeGroup(group.id, (item) => ({
                          ...item,
                          questions: item.questions.filter(
                            (q) => q.id !== question.id,
                          ),
                        }));
                    }}
                  >
                    문항 {qi + 1} 삭제
                  </button>
                </div>
              </fieldset>
            );
          })}
          <button
            type="button"
            disabled={group.questions.length >= 30}
            onClick={() =>
              changeGroup(group.id, (item) => ({
                ...item,
                questions: [...item.questions, newListeningQuestion()],
              }))
            }
          >
            문항 추가
          </button>
        </fieldset>
      ))}
      <div className={s.actions}>
        <button
          type="button"
          disabled={busy || draft.groups.length >= 30}
          onClick={() =>
            change({ groups: [...draft.groups, newListeningGroup()] })
          }
        >
          음원·문항 묶음 추가
        </button>
        <button className={s.primary} disabled={busy} type="submit">
          초안 저장
        </button>
        <button type="button" disabled={busy} onClick={onClose}>
          편집 닫기
        </button>
      </div>
    </form>
  );
}
