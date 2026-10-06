"use client";

/**
 * «사진에서 글 읽기» 창 (D-158 · 25 §13.8 · 05 §8.23.3 — Wire 2차 «가 나란히» · Hi-fi **H4**).
 *
 * 왼쪽 사진 칸(넘김 · 크기 한 줄 + 사진) · 오른쪽 글 칸(읽은 글 · 자료 이름) · 창 아래 한 줄(안내 문구 + 단추).
 * 사진이 길면 **칸 안에서** 굴린다 — 창 크기는 변하지 않는다(원장님 «사진이 거대할 때 가려지지 않을까»).
 *
 * 읽기는 사진마다 `POST /api/english/materials/{id}/read` 한 번 — **AI 호출이라 값이 든다.** 그래서
 *   - 한 번 읽은 사진은 다시 읽지 않는다. 읽은 글 · 읽는 중인 요청은 부모가 준 `cache` 에 있어 창을 닫았다 열어도 그대로다
 *     (저장한 글 · 저장했다는 표시도 거기 남는다 — 다시 열어 그대로 저장해도 같은 자료가 두 줄 되지 않는다).
 *   - 같은 사진의 요청을 두 번 띄우지 않는다 — 읽는 중이면 그 요청에 붙는다.
 *   - **읽던 요청은 끊지 않고 받아 둔다.** 넘기거나 닫아도 끝까지 받아 `cache` 에 넣는다 — 운영(Vercel)은 화면이 끊어도
 *     서버가 모른다(검토 2026-10-06: 끊으면 모델 호출은 그대로 돌고, 버린 글을 돌아와서 또 읽어 값이 되레 늘었다).
 *   - 한 번에 띄우는 읽기는 **둘까지**다(서버의 «한 사람 둘»과 같다). 셋째 사진은 자리가 날 때까지 «읽는 중»으로 기다린다.
 * 읽은 글은 저장 전이다 — 선생님이 고친 뒤 «지문 자료로 저장»(자료 POST · JSON)해야 글 자료 한 줄이 된다.
 * 고친 글 · 이름을 두고 넘기거나 닫으려 하면 먼저 묻는다. 저장한 그대로면 다시 저장하지 않는다.
 *
 * 지금 보는 사진은 **자료 id** 로 기억한다 — 목록이 다시 와 차례가 바뀌어도 다른 사진으로 건너뛰지 않는다.
 *
 * 🔴 D-30 — 사진 칸 · 글 칸은 누르는 것이 아니다. 손가락 커서는 단추에만.
 */
import { useEffect, useRef, useState, type RefObject } from "react";

import WorkProgress from "@/components/unified/WorkProgress";
import w from "@/components/unified/Workroom.module.css";
import {
  ENGLISH_MATERIAL_CONTENT_MAX,
  englishMaterialReadResponseSchema,
  englishMaterialResponseSchema,
  type EnglishExam,
  type EnglishMaterial,
} from "@/contracts/english.contract";

import EnglishDialog from "./EnglishDialog";
import { jsonInit, messageOf, requestEnglish } from "./englishClient";
import s from "./EnglishStudio.module.css";

/** 계약이 내보내지 않는 상한 — `englishMaterialTextCreateSchema.name.max(255)` 와 같은 값 */
const MATERIAL_NAME_MAX = 255;

/** 읽은 글도 실패도 없는 사진은 «읽는 중»이다(읽고 있거나 자리를 기다린다) — 따로 적어 두지 않는다 */
type Read =
  /** `text` · `name` 은 견줄 기준 — 읽은 글, 저장한 뒤로는 저장한 글. `saved` 면 그대로는 다시 저장하지 않는다 */
  | { status: "ready"; text: string; name: string; saved: boolean }
  | { status: "error"; message: string };
type Draft = { text: string; name: string };
/** 고친 글을 두고 떠나려는 곳 — 사진(넘기기) 또는 닫기 */
type Leave = { to: string } | { close: true };

const baseName = (name: string) => name.replace(/\.(png|jpe?g)$/i, "");

/**
 * 읽어 둔 글과 읽는 중인 요청(자료 id 로) — 자료 화면이 들고 있다. 창이 닫혀도 남는다.
 * `done` 의 글은 읽은 글이고, 저장한 뒤로는 저장한 글 · 이름이다(`saved`).
 */
export type EnglishReadCache = {
  done: Map<string, { text: string; name?: string; saved: boolean }>;
  pending: Map<string, Promise<string>>;
};
export const createEnglishReadCache = (): EnglishReadCache => ({
  done: new Map(),
  pending: new Map(),
});

/** 한 번에 띄우는 읽기 — 서버의 «한 사람 둘»(`READS_PER_USER`)과 같다 */
const MAX_PENDING = 2;

/** 이미 읽어 둔 사진 — 창을 다시 열면 읽지 않고 그 글로 시작한다 */
function fromCache(photos: EnglishMaterial[], cache: EnglishReadCache) {
  const reads: Record<string, Read> = {};
  const drafts: Record<string, Draft> = {};
  for (const item of photos) {
    const entry = cache.done.get(item.id);
    if (!entry) continue;
    const name = entry.name ?? baseName(item.name);
    reads[item.id] = {
      status: "ready",
      text: entry.text,
      name,
      saved: entry.saved,
    };
    drafts[item.id] = { text: entry.text, name };
  }
  return { reads, drafts };
}

export default function EnglishPhotoReadDialog({
  exam,
  photos,
  startId,
  cache,
  returnFocus,
  onClose,
  onSaved,
}: {
  exam: EnglishExam;
  /** 이 창이 넘겨 볼 사진 자료(png · jpg) — 한 장이면 넘김 줄이 없다 */
  photos: EnglishMaterial[];
  /** 처음 열 사진 */
  startId: string;
  /** 읽어 둔 글 · 읽는 중인 요청 — 부모가 들고 있으면 창을 닫았다 열어도 다시 읽지 않는다 */
  cache?: EnglishReadCache;
  returnFocus?: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** 글 자료가 한 줄 생겼다 — 자료 목록에 더한다 */
  onSaved: (material: EnglishMaterial) => void;
}) {
  const [own] = useState(createEnglishReadCache);
  const store = cache ?? own;
  const [currentId, setCurrentId] = useState(startId);
  const [reads, setReads] = useState(() => fromCache(photos, store).reads);
  const [drafts, setDrafts] = useState(() => fromCache(photos, store).drafts);
  const [zoom, setZoom] = useState<"fit" | "large">("fit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leave, setLeave] = useState<Leave | null>(null);
  /** «다시 읽기»를 누른 횟수 — 같은 사진을 다시 읽게 읽기 효과를 깨운다 */
  const [attempt, setAttempt] = useState(0);
  /** 이 창이 글을 받았거나 받기로 한 사진 — 같은 사진에 두 번 붙지 않는다. 처음 값은 이미 읽어 둔 사진 */
  const [attached] = useState(
    () =>
      new Set(
        photos.filter((item) => store.done.has(item.id)).map((item) => item.id),
      ),
  );
  /** 자리를 기다리던 사진의 읽기를 깨운다 — 읽던 것 하나가 끝나면 올린다 */
  const [turn, setTurn] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const index = photos.findIndex((item) => item.id === currentId);
  const photo = index < 0 ? undefined : photos[index];
  const read = photo ? reads[photo.id] : undefined;
  const draft = photo ? drafts[photo.id] : undefined;
  const dirty =
    read?.status === "ready" &&
    draft !== undefined &&
    (draft.text !== read.text || draft.name !== read.name);
  const last = index >= photos.length - 1;
  const ready = read?.status === "ready" && draft !== undefined;

  // 보던 사진이 목록에서 사라졌다(지워졌거나 처음부터 없는 id) — 다른 사진을 대신 읽지 않고 닫는다
  const missing = !photo;
  useEffect(() => {
    if (missing) onClose();
  }, [missing, onClose]);

  // 처음 읽은 글이 오면 글 칸으로 — 창이 열릴 때는 읽는 중이라 초점이 단추에 남는다.
  // 한 번만 옮긴다(넘길 때마다 옮기면 «다음»을 이어 누르던 초점을 뺏는다). 그 사이 선생님이 초점을 옮겼으면 뺏지 않는다.
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const focusedOnce = useRef(false);
  const openedOn = useRef<Element | null>(null);
  useEffect(() => {
    openedOn.current = document.activeElement;
  }, []);
  useEffect(() => {
    if (!ready || focusedOnce.current) return;
    focusedOnce.current = true;
    const active = document.activeElement;
    if (active && active !== document.body && active !== openedOn.current)
      return;
    areaRef.current?.focus({ preventScroll: true });
  }, [ready]);

  const photoId = photo?.id;
  const photoName = photo?.name;
  useEffect(() => {
    if (photoId === undefined || photoName === undefined) return;
    if (attached.has(photoId)) return;
    let pending = store.pending.get(photoId);
    if (!pending) {
      if (store.pending.size >= MAX_PENDING) {
        // 자리가 날 때까지 기다린다 — 읽던 것 가운데 하나가 끝나면 다시 온다(다른 창이 띄워 둔 읽기여도).
        // 그동안 글 칸은 «읽는 중»이다(읽은 글도 실패도 없는 사진은 그렇게 그린다)
        void Promise.race(
          [...store.pending.values()].map((item) =>
            item.then(
              () => undefined,
              () => undefined,
            ),
          ),
        ).then(() => {
          if (alive.current) setTurn((count) => count + 1);
        });
        return;
      }
      const started = (async () => {
        const body = englishMaterialReadResponseSchema.parse(
          await requestEnglish(`/api/english/materials/${photoId}/read`, {
            method: "POST",
          }),
        );
        // 창이 닫힌 뒤에 와도 받아 둔다 — 다시 열면 읽지 않는다
        store.done.set(photoId, { text: body.data.text, saved: false });
        return body.data.text;
      })();
      const clear = () => {
        if (store.pending.get(photoId) === started)
          store.pending.delete(photoId);
      };
      started.then(clear, clear);
      store.pending.set(photoId, started);
      pending = started;
    }
    attached.add(photoId);
    const name = baseName(photoName);
    pending.then(
      (text) => {
        if (!alive.current) return;
        setReads((current) => ({
          ...current,
          [photoId]: { status: "ready", text, name, saved: false },
        }));
        setDrafts((current) => ({ ...current, [photoId]: { text, name } }));
      },
      (caught: unknown) => {
        if (!alive.current) return;
        setReads((current) => ({
          ...current,
          [photoId]: { status: "error", message: messageOf(caught) },
        }));
      },
    );
  }, [photoId, photoName, attempt, turn, store, attached]);

  if (!photo) return null;

  const retry = () => {
    attached.delete(photo.id);
    setReads((current) => {
      const next = { ...current };
      delete next[photo.id];
      return next;
    });
    setAttempt((count) => count + 1);
  };
  const edit = (patch: Partial<Draft>) => {
    setError(null);
    setDrafts((current) => ({
      ...current,
      [photo.id]: {
        ...(current[photo.id] ?? { text: "", name: "" }),
        ...patch,
      },
    }));
  };

  const go = (to: string) => {
    setError(null);
    setLeave(null);
    setCurrentId(to);
  };
  const neighbor = (by: -1 | 1) => photos[index + by]?.id;
  /** 고친 글이 있으면 먼저 묻는다 */
  const request = (target: Leave) => {
    if (dirty) return setLeave(target);
    if ("close" in target) onClose();
    else go(target.to);
  };
  const step = (by: -1 | 1) => {
    const to = neighbor(by);
    if (to) request({ to });
  };
  const discard = () => {
    if (!leave) return;
    // 버린 글은 기준(읽은 글 · 저장한 글)으로 되돌린다 — 돌아왔을 때 «고친 글»이 남아 있지 않게
    if (read?.status === "ready")
      setDrafts((current) => ({
        ...current,
        [photo.id]: { text: read.text, name: read.name },
      }));
    if ("close" in leave) {
      setLeave(null);
      onClose();
    } else go(leave.to);
  };

  const save = async (advance: boolean) => {
    if (!draft || read?.status !== "ready" || saving) return;
    const to = advance ? neighbor(1) : undefined;
    const done = () => {
      if (to) go(to);
      else onClose();
    };
    // 저장한 그대로면 다시 보내지 않는다 — 같은 글 자료가 두 줄 되지 않게
    if (read.saved && !dirty) return done();
    const name = draft.name.trim();
    const content = draft.text.trim();
    if (!content) return setError("읽은 글이 비어 있습니다.");
    if (!name) return setError("자료 이름을 입력해 주세요.");
    setSaving(true);
    setError(null);
    setLeave(null);
    try {
      const body = englishMaterialResponseSchema.parse(
        await requestEnglish(
          `/api/english/exams/${exam.id}/materials`,
          jsonInit("POST", { name, content }),
        ),
      );
      onSaved(body.data);
      // 저장한 글 · 이름을 부모 쪽에도 남긴다 — 창을 닫았다 열어도 그 글로 시작하고, 그대로면 다시 저장하지 않는다
      store.done.set(photo.id, {
        text: draft.text,
        name: draft.name,
        saved: true,
      });
      if (!alive.current) return;
      // 저장한 글이 곧 기준이다 — 다시 돌아와도 «고친 글»로 세지 않는다
      setReads((current) => ({
        ...current,
        [photo.id]: {
          status: "ready",
          text: draft.text,
          name: draft.name,
          saved: true,
        },
      }));
      done();
    } catch (caught) {
      if (alive.current) setError(messageOf(caught));
    } finally {
      if (alive.current) setSaving(false);
    }
  };

  return (
    <EnglishDialog
      title="사진에서 글 읽기"
      kicker={`${exam.school} · ${exam.grade} ${exam.title}`}
      busy={saving}
      className={s.readDialog}
      returnFocus={returnFocus}
      onClose={() => request({ close: true })}
    >
      <div className={s.readBody}>
        <div className={s.readPhoto}>
          <div className={s.readTools}>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className={w.outlineButton}
                  disabled={index === 0 || saving}
                  onClick={() => step(-1)}
                >
                  이전
                </button>
                <span className={s.readCount}>
                  {index + 1} / {photos.length}
                </span>
                <button
                  type="button"
                  className={w.outlineButton}
                  disabled={last || saving}
                  onClick={() => step(1)}
                >
                  다음
                </button>
              </>
            )}
            <div className={s.readZoom} role="group" aria-label="사진 크기">
              <button
                type="button"
                className={s.tab}
                aria-pressed={zoom === "fit"}
                onClick={() => setZoom("fit")}
              >
                폭 맞춤
              </button>
              <button
                type="button"
                className={s.tab}
                aria-pressed={zoom === "large"}
                onClick={() => setZoom("large")}
              >
                크게
              </button>
            </div>
          </div>
          {/* 굴리는 칸 — 자판으로도 굴릴 수 있게 초점을 받는다 */}
          <div
            className={s.readView}
            role="group"
            tabIndex={0}
            aria-label="사진"
          >
            {/* 자료 내려받기 주소 — 로그인한 사람만 받는 원본이라 next/image 의 최적화 서버를 거치지 않는다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={photo.id}
              className={s.readImage}
              data-zoom={zoom}
              src={`/api/english/materials/${photo.id}`}
              alt={photo.name}
            />
          </div>
        </div>
        <div className={s.readText}>
          {ready ? (
            <>
              <label className={`${s.field} ${s.readArea}`}>
                <span className={s.readLabel}>
                  읽은 글 <small>지문만 남기고 지워 주세요</small>
                </span>
                <textarea
                  ref={areaRef}
                  value={draft.text}
                  maxLength={ENGLISH_MATERIAL_CONTENT_MAX}
                  disabled={saving}
                  onChange={(event) => edit({ text: event.target.value })}
                />
              </label>
              <label className={s.field}>
                자료 이름
                <input
                  value={draft.name}
                  maxLength={MATERIAL_NAME_MAX}
                  disabled={saving}
                  onChange={(event) => edit({ name: event.target.value })}
                />
              </label>
            </>
          ) : read?.status === "error" ? (
            <div>
              <p className={s.formError} role="alert">
                {read.message}
              </p>
              <button type="button" className={w.outlineButton} onClick={retry}>
                다시 읽기
              </button>
            </div>
          ) : (
            <WorkProgress label="글을 읽는 중입니다…" />
          )}
        </div>
      </div>
      {error && (
        <p className={s.formError} role="alert">
          {error}
        </p>
      )}
      {leave && (
        <div className={s.readLeave} role="alert">
          <span>
            저장하지 않은 글이 있습니다.{" "}
            {"close" in leave ? "닫으면" : "넘기면"} 고친 글이 사라집니다.
          </span>
          <button
            type="button"
            className={w.outlineButton}
            onClick={() => setLeave(null)}
          >
            계속 고치기
          </button>
          <button type="button" className={w.outlineButton} onClick={discard}>
            {"close" in leave ? "버리고 닫기" : "버리고 넘기기"}
          </button>
        </div>
      )}
      <div className={s.readFoot}>
        <p className={s.footnote}>
          읽은 글은 틀릴 수 있습니다. 사진과 견주어 고친 뒤 저장해 주세요.
          손글씨는 읽지 않습니다.
        </p>
        <button
          type="button"
          className={w.outlineButton}
          disabled={saving}
          onClick={() => request({ close: true })}
        >
          닫기
        </button>
        <button
          type="button"
          className={last ? w.primaryButton : w.outlineButton}
          disabled={!ready || saving}
          onClick={() => void save(false)}
        >
          지문 자료로 저장
        </button>
        {!last && (
          <button
            type="button"
            className={w.primaryButton}
            disabled={!ready || saving}
            onClick={() => void save(true)}
          >
            저장하고 다음 사진
          </button>
        )}
      </div>
    </EnglishDialog>
  );
}
