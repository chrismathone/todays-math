"use client";

/**
 * 오른쪽 차시 판 — 강의 목록 · 영상 자리 · 게시 조건 · 단추 (05 §8.9 시안 1안).
 *
 * - 게시 조건은 서버가 낸 `gate`(게시 관문 `checkPublish`)를 **그대로** 그린다. 막는 것은 ✗ 와
 *   관문의 문구, 알리는 것(끝까지 보기 — 권장)은 ! 와 관문의 문구. ✓ 는 막히지 않은 조건이다.
 * - 단추는 전이표(`LECTURE_TRANSITIONS` · `VIDEO_EDITABLE_STATUSES`)로 고른다 — 라우트가 부르는
 *   규칙과 같은 표다. 관리자가 아니면 단추 대신 «관리자만 바꿀 수 있습니다» 한 줄(D-124 ⑼).
 * - 영상은 유튜브 nocookie 임베드. 원장님 쪽 재생기는 **앞으로 감기를 막지 않는다**(D-124 ⑸ —
 *   막는 것은 학생 쪽이다).
 * - «AI 보충 강의» 고지는 이 화면에만(D-124 ⑹).
 */
import { useState } from "react";

import type {
  ConceptLectureAction,
  ConceptLectureAdmin,
  ConceptUnit,
  ConceptWatch,
} from "@/contracts/conceptAdmin.contract";
import {
  LECTURE_TRANSITIONS,
  VIDEO_EDITABLE_STATUSES,
} from "@/lib/concept/lectureTransition";
import { youTubeEmbedUrl } from "@/lib/concept/youtube";

import { formatInstantDay, lectureStateLabel, mmss } from "./conceptFormat";
import WorkProgress from "./WorkProgress";
import ws from "./Workroom.module.css";
import s from "./ConceptView.module.css";

export type PanelNotice = { kind: "status" | "error"; text: string };

type Check = { kind: "ok" | "bad" | "warn"; text: string };

const SYMBOL: Record<Check["kind"], string> = { ok: "✓", bad: "✗", warn: "!" };

/** 게시 관문의 판정 → 조건 줄. ✗ · ! 의 문구는 관문의 것 그대로다 */
export function publishChecks(lecture: ConceptLectureAdmin): Check[] {
  const blocked = new Map(
    lecture.gate.blockers.map((b) => [b.code, b.message]),
  );
  const out: Check[] = [];
  const shown = new Set<string>();
  const bad = (code: string) => {
    shown.add(code);
    out.push({ kind: "bad", text: blocked.get(code as never)! });
  };

  const basics = (["title", "seconds"] as const).filter((c) => blocked.has(c));
  if (basics.length > 0) basics.forEach(bad);
  else out.push({ kind: "ok", text: `제목 · 길이 ${mmss(lecture.seconds)}` });

  const video = (["video_missing", "video_invalid"] as const).find((c) =>
    blocked.has(c),
  );
  if (video) bad(video);
  else out.push({ kind: "ok", text: "유튜브 주소" });

  if (blocked.has("disclosure")) bad("disclosure");
  else if (lecture.disclosure)
    out.push({ kind: "ok", text: `AI 고지 «${lecture.disclosure}»` });

  // 관문에 새 조건이 생겨도 빠뜨리지 않는다 — 모르는 것은 문구 그대로 싣는다.
  for (const b of lecture.gate.blockers)
    if (!shown.has(b.code) && !basics.includes(b.code as never))
      out.push({ kind: "bad", text: b.message });

  const review = lecture.gate.warnings.find((w) => w.code === "review");
  if (review) out.push({ kind: "warn", text: review.message });
  else if (lecture.reviewedAt)
    out.push({
      kind: "ok",
      text: `끝까지 봄 — ${formatInstantDay(lecture.reviewedAt)}`,
    });
  for (const w of lecture.gate.warnings)
    if (w.code !== "review") out.push({ kind: "warn", text: w.message });
  return out;
}

export default function ConceptUnitPanel({
  context,
  unit,
  lectures,
  watch,
  loading,
  emptyHint,
  canEdit,
  videoEmbed,
  registerOpen,
  busy,
  notice,
  onOpenRegister,
  onCloseRegister,
  onRegister,
  onAction,
}: {
  context: string;
  unit: ConceptUnit | null;
  lectures: ConceptLectureAdmin[];
  /** 고른 반의 게시 강의별 «끝까지 본 학생» — 표에서 연 판에만 */
  watch: ReadonlyMap<string, ConceptWatch>;
  loading: boolean;
  emptyHint: string | null;
  canEdit: boolean;
  videoEmbed: boolean;
  registerOpen: boolean;
  busy: boolean;
  notice: PanelNotice | null;
  onOpenRegister: () => void;
  onCloseRegister: () => void;
  onRegister: (raw: string) => Promise<void>;
  onAction: (
    lecture: ConceptLectureAdmin,
    action: ConceptLectureAction,
  ) => Promise<void>;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const selected =
    lectures.find((l) => l.id === picked) ??
    lectures.find((l) => l.status === "draft") ??
    lectures[0] ??
    null;

  const noticeLine = notice ? (
    <p
      role={notice.kind === "error" ? "alert" : "status"}
      className={notice.kind === "error" ? s.noticeError : s.noticeOk}
    >
      {notice.text}
    </p>
  ) : null;

  if (registerOpen && canEdit) {
    return (
      <aside className={s.side} aria-label="차시 판">
        <RegisterForm
          unit={unit}
          busy={busy}
          onSubmit={onRegister}
          onCancel={onCloseRegister}
        />
        {noticeLine}
      </aside>
    );
  }

  return (
    <aside className={s.side} aria-label="차시 판">
      {context ? <p className={s.sideKicker}>{context}</p> : null}
      {unit ? (
        <div>
          <h2 className={s.sideTitle}>{unit.section}</h2>
          <p className={s.sideMeta}>
            {unit.grade} › {unit.chapter} ·{" "}
            <span className={s.mono}>{unit.code}</span>
          </p>
        </div>
      ) : null}

      {loading ? (
        <WorkProgress label="차시의 강의를 불러오는 중입니다…" />
      ) : !unit ? (
        <p className={s.sideNote}>
          {emptyHint ?? "고른 반의 진도 기록이 없어 차시를 보일 수 없습니다."}
        </p>
      ) : !selected ? (
        <>
          <div className={s.sideEmpty}>
            <b>이 차시에는 강의가 없습니다.</b>
            <span>
              제작 도구가 만든 meta.json 을 붙이면 초안으로 들어옵니다. 지금은
              새 강의를 만들지 않습니다.
            </span>
          </div>
          {canEdit ? (
            <button
              type="button"
              className={`${ws.outlineButton} ${s.block}`}
              onClick={onOpenRegister}
            >
              meta.json 붙여넣어 등록
            </button>
          ) : (
            <p className={s.sideNote}>관리자만 바꿀 수 있습니다.</p>
          )}
        </>
      ) : (
        <>
          <ul className={s.lectures}>
            {lectures.map((l) => {
              const state = lectureStateLabel(l.status);
              return (
                <li
                  key={l.id}
                  className={l.id === selected.id ? s.on : undefined}
                >
                  <span className={`${s.pill} ${s[state.key]}`}>
                    {state.label}
                  </span>
                  <button
                    type="button"
                    className={s.linkButton}
                    aria-pressed={l.id === selected.id}
                    onClick={() => setPicked(l.id)}
                  >
                    {l.title}
                  </button>
                  <span className={s.sub}>{mmss(l.seconds)}</span>
                </li>
              );
            })}
          </ul>
          <VideoFrame lecture={selected} embed={videoEmbed} />
          <ul className={s.checks} aria-label="게시 조건">
            {publishChecks(selected).map((c, i) => (
              <li
                key={i}
                data-kind={c.kind}
                className={c.kind === "ok" ? undefined : s[c.kind]}
              >
                <span aria-hidden="true">{SYMBOL[c.kind]}</span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
          {canEdit ? (
            <LectureActions
              key={selected.id}
              lecture={selected}
              watch={watch.get(selected.id)}
              busy={busy}
              onAction={onAction}
            />
          ) : (
            <p className={s.sideNote}>관리자만 바꿀 수 있습니다.</p>
          )}
          <p className={s.sideNote}>
            «AI 보충 강의» 고지는 이 화면에만 보이고 학생 화면에는 없습니다.
          </p>
        </>
      )}
      {noticeLine}
    </aside>
  );
}

function VideoFrame({
  lecture,
  embed,
}: {
  lecture: ConceptLectureAdmin;
  embed: boolean;
}) {
  const src =
    embed && lecture.videoUrl ? youTubeEmbedUrl(lecture.videoUrl) : null;
  return (
    <div className={s.frame}>
      {src ? (
        <iframe
          src={src}
          title={`«${lecture.title}» 영상`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className={s.frameIn} aria-hidden="true">
          <p className={s.frameTitle}>{lecture.title}</p>
          {lecture.videoUrl ? null : (
            <p className={s.frameNote}>영상 주소가 아직 없습니다</p>
          )}
        </div>
      )}
    </div>
  );
}

function LectureActions({
  lecture,
  watch,
  busy,
  onAction,
}: {
  lecture: ConceptLectureAdmin;
  watch: ConceptWatch | undefined;
  busy: boolean;
  onAction: (
    lecture: ConceptLectureAdmin,
    action: ConceptLectureAction,
  ) => Promise<void>;
}) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [url, setUrl] = useState("");
  const status = lecture.status;
  const publishable = (
    LECTURE_TRANSITIONS.publish.from as readonly string[]
  ).includes(status);
  const archivable = (
    LECTURE_TRANSITIONS.archive.from as readonly string[]
  ).includes(status);
  const needsVideo = lecture.videoUrl === null;

  if (archivable) {
    return (
      <div className={s.actions}>
        <button
          type="button"
          className={ws.outlineButton}
          disabled={busy}
          onClick={() => void onAction(lecture, { action: "archive" })}
        >
          게시 내리기
        </button>
        <span className={s.sub}>
          {lecture.publishedAt
            ? `${formatInstantDay(lecture.publishedAt)} 게시`
            : "게시"}
          {watch ? ` · 끝까지 본 학생 ${watch.watched}명` : ""}
        </span>
      </div>
    );
  }

  return (
    <>
      {videoOpen ? (
        <form
          className={s.inlineForm}
          onSubmit={(event) => {
            event.preventDefault();
            void onAction(lecture, { action: "video", videoUrl: url.trim() });
          }}
        >
          <label className={s.field}>
            <span>영상 주소</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              inputMode="url"
              autoComplete="off"
              maxLength={200}
            />
          </label>
          <div className={s.actions}>
            <button
              type="submit"
              className={ws.primaryButton}
              disabled={busy || !url.trim()}
            >
              저장
            </button>
            <button
              type="button"
              className={ws.outlineButton}
              onClick={() => setVideoOpen(false)}
            >
              취소
            </button>
          </div>
        </form>
      ) : null}
      <div className={s.actions}>
        {needsVideo &&
        VIDEO_EDITABLE_STATUSES.includes(status) &&
        !videoOpen ? (
          <button
            type="button"
            className={ws.primaryButton}
            disabled={busy}
            onClick={() => setVideoOpen(true)}
          >
            주소 넣기
          </button>
        ) : null}
        {!needsVideo && lecture.reviewedAt === null ? (
          <button
            type="button"
            className={ws.outlineButton}
            disabled={busy}
            onClick={() => void onAction(lecture, { action: "review" })}
          >
            끝까지 봤다
          </button>
        ) : null}
        {publishable ? (
          <button
            type="button"
            className={needsVideo ? ws.outlineButton : ws.primaryButton}
            disabled={busy || !lecture.gate.canPublish}
            onClick={() => void onAction(lecture, { action: "publish" })}
          >
            {status === "archived" ? "다시 게시" : "게시"}
          </button>
        ) : null}
      </div>
      {needsVideo ? (
        <p className={s.sideNote}>
          올린 영상의 주소를 넣으면 게시할 수 있습니다.
        </p>
      ) : lecture.reviewedAt === null ? (
        <p className={s.sideNote}>
          끝까지 보지 않아도 게시할 수 있습니다 — 권장입니다.
        </p>
      ) : null}
      {status === "archived" && lecture.publishedAt ? (
        <p className={s.sideNote}>
          게시를 내렸습니다 · 마지막 게시{" "}
          {formatInstantDay(lecture.publishedAt)}
        </p>
      ) : null}
    </>
  );
}

function RegisterForm({
  unit,
  busy,
  onSubmit,
  onCancel,
}: {
  unit: ConceptUnit | null;
  busy: boolean;
  onSubmit: (raw: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [raw, setRaw] = useState("");
  return (
    <form
      className={s.register}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(raw);
      }}
    >
      <p className={s.sideKicker}>meta.json 으로 등록</p>
      <h2 className={s.sideTitle}>초안으로 들어옵니다</h2>
      <p className={s.sideMeta}>
        차시는 meta.json 의 unitCode 를 따릅니다.
        {unit
          ? ` 없으면 «${unit.section}»(${unit.code})에 붙입니다.`
          : " 없으면 차시를 먼저 고르세요."}
      </p>
      <label className={s.field}>
        <span>meta.json 내용</span>
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          rows={9}
          spellCheck={false}
          placeholder='{"lessonTitle": "…", "fps": 30, "totalFrames": …}'
        />
      </label>
      <div className={s.actions}>
        <button
          type="submit"
          className={ws.primaryButton}
          disabled={busy || !raw.trim()}
        >
          초안으로 등록
        </button>
        <button type="button" className={ws.outlineButton} onClick={onCancel}>
          취소
        </button>
      </div>
      <p className={s.sideNote}>
        등록한 강의는 초안입니다. 게시는 따로 합니다.
      </p>
    </form>
  );
}
