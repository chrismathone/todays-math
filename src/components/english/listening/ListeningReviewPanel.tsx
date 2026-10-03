"use client";

import { useState } from "react";
import type { ListeningSetDetail } from "@/contracts/englishListeningHttp.contract";
import { englishListeningDocumentSchema } from "@/contracts/englishListening.contract";
import s from "./ListeningTeacherWorkspace.module.css";

export type ListeningReviewKind = "rights" | "content" | "audio" | "alignment";
const reviewLabels = {
  content: "문항·보기·정답·해설의 근거를 확인했습니다",
  audio: "음원을 직접 듣고 대본, 숫자, 부정어와 잘림을 확인했습니다",
  alignment: "재생으로 모든 정답 근거 구간의 시작과 끝을 확인했습니다",
};

export function ListeningReviewPanel({
  detail,
  busy,
  onReview,
  onPublish,
}: {
  detail: ListeningSetDetail;
  busy: boolean;
  onReview: (kind: ListeningReviewKind, groupId?: string) => void;
  onPublish: () => void;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const valid = englishListeningDocumentSchema.safeParse(
    detail.document,
  ).success;
  const reviewed =
    valid &&
    detail.document.rightsReview !== null &&
    detail.document.groups.every(
      (group) =>
        group.reviews.content && group.reviews.audio && group.reviews.alignment,
    );
  return (
    <section className={s.reviewPanel} aria-label="교사 검수와 발행">
      <h3>교사 검수와 발행</h3>
      <p className={s.muted}>
        직접 확인한 항목만 검수 완료로 기록하세요. 내용을 바꾸면 다시
        검수합니다.
      </p>
      <div className={s.reviewRow}>
        <label className={s.check}>
          <input
            type="checkbox"
            checked={checks.rights ?? false}
            disabled={busy}
            onChange={(event) =>
              setChecks({ ...checks, rights: event.target.checked })
            }
          />
          출처와 음원 보관·교사 검수·학생 배정의 사용 권리를 확인했습니다
        </label>
        <button
          type="button"
          disabled={
            busy || !checks.rights || !detail.document.provenance.basis.trim()
          }
          onClick={() => onReview("rights")}
        >
          권리 검수 기록
        </button>
        <p className={s.muted}>
          {detail.document.rightsReview
            ? `확인됨 · ${new Date(detail.document.rightsReview.confirmedAt).toLocaleString("ko-KR")}`
            : "권리 검수 전"}
        </p>
      </div>
      {!valid ? (
        <p className={s.notice}>
          제목·출처, 음원·대본, 2~5개 보기와 정답·해설·근거 구간을 갖춘 뒤
          내용·음성·구간 검수를 할 수 있습니다.
        </p>
      ) : null}
      {detail.document.groups.map((group, index) => (
        <fieldset
          className={s.formSection}
          key={group.id}
          disabled={busy || !valid}
        >
          <legend>묶음 {index + 1} 검수</legend>
          {(["content", "audio", "alignment"] as const).map((kind) => {
            const key = `${group.id}:${kind}`;
            return (
              <div key={kind} className={s.reviewRow}>
                <label className={s.check}>
                  <input
                    type="checkbox"
                    checked={checks[key] ?? false}
                    onChange={(event) =>
                      setChecks({ ...checks, [key]: event.target.checked })
                    }
                  />
                  {reviewLabels[kind]}
                </label>
                <button
                  type="button"
                  disabled={busy || !valid || !checks[key]}
                  onClick={() => onReview(kind, group.id)}
                >
                  {kind === "content"
                    ? "내용"
                    : kind === "audio"
                      ? "음성"
                      : "구간"}{" "}
                  검수 기록
                </button>
                <p className={s.muted}>
                  {group.reviews[kind]
                    ? `확인됨 · ${new Date(group.reviews[kind].reviewedAt).toLocaleString("ko-KR")}`
                    : "검수 전"}
                </p>
              </div>
            );
          })}
        </fieldset>
      ))}
      <div className={s.actions}>
        <button
          className={s.primary}
          type="button"
          disabled={busy || !reviewed}
          onClick={onPublish}
        >
          검수한 자료 발행
        </button>
        <p className={s.muted}>기존 배정은 이전 발행본을 유지합니다.</p>
      </div>
      {detail.publications.length > 0 ? (
        <div>
          <p>
            발행본 {detail.publications.length}개 · 과제와 결과에서 배정할 수
            있습니다.
          </p>
          <div className={s.actions}>
            <a
              href={`/english/listening/sets/${detail.id}/print?publicationId=${detail.publications[0].id}&view=student`}
              target="_blank"
              rel="noopener noreferrer"
            >
              최신 발행본 학생용 인쇄
            </a>
            <a
              href={`/english/listening/sets/${detail.id}/print?publicationId=${detail.publications[0].id}&view=teacher`}
              target="_blank"
              rel="noopener noreferrer"
            >
              최신 발행본 교사용 인쇄
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
