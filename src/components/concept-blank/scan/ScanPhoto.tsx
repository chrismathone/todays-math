"use client";
/* eslint-disable @next/next/no-img-element -- Private signed photos must retain the inspected pixels and never enter the public image optimizer cache. */
import { useEffect, useRef, useState } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import type { ScanSubmissionView } from "@/contracts/conceptBlankScanApi.contract";
import type { ScanSource } from "./api";
import s from "./scan.module.css";

type Photo = ScanSubmissionView["photos"][number];
type Props = {
  photo: Photo;
  submissionId: string;
  source: Pick<ScanSource, "photoUrl">;
};
function usePhoto({ photo, submissionId, source }: Props) {
  const [result, setResult] = useState<{
    id: string;
    url?: string;
    error?: string;
  }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (photo.available)
      void source.photoUrl(submissionId, photo.id).then(
        (url) => {
          if (active) setResult({ id: photo.id, url });
        },
        () => {
          if (active)
            setResult({ id: photo.id, error: "사진을 열지 못했습니다." });
        },
      );
    return () => {
      active = false;
    };
  }, [photo.id, photo.available, submissionId, source, attempt]);
  const current = result?.id === photo.id ? result : undefined;
  return {
    url: photo.available ? current?.url : undefined,
    error: current?.error,
    retry: () => {
      setResult(undefined);
      setAttempt((n) => n + 1);
    },
    failed: () =>
      setResult({
        id: photo.id,
        error: "사진 열람 시간이 지났거나 사진을 읽지 못했습니다.",
      }),
  };
}

/** Actual submitted pixels, also usable inside the common PaperStrip at its supplied scale. */
export function ScanPhotoPreview(props: Props) {
  const image = usePhoto(props);
  return (
    <div className={s.stripPhoto}>
      {image.url ? (
        <img
          src={image.url}
          alt={`${props.photo.page}쪽 촬영 사진`}
          onError={image.failed}
        />
      ) : (
        <p>
          {props.photo.available
            ? (image.error ?? "사진 여는 중")
            : "사진 만료·삭제"}
        </p>
      )}
    </div>
  );
}

export function ScanPhoto(
  props: Props & {
    numbers: Map<string, number>;
    onField?: (slotId: string) => void;
  },
) {
  const { photo, numbers, onField } = props;
  const image = usePhoto(props);
  const opener = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState<string | "page" | null>(null);
  const slots =
    photo.registration.status === "matched" ? photo.registration.slots : [];
  const selected = slots.find((slot) => slot.slotId === expanded);
  const xs = selected?.points.map((p) => p.x * photo.width) ?? [];
  const ys = selected?.points.map((p) => p.y * photo.height) ?? [];
  const x = Math.max(0, Math.min(...xs) - photo.width * 0.02);
  const y = Math.max(0, Math.min(...ys) - photo.height * 0.02);
  const width = Math.min(
    photo.width - x,
    Math.max(...xs) - x + photo.width * 0.02,
  );
  const height = Math.min(
    photo.height - y,
    Math.max(...ys) - y + photo.height * 0.02,
  );
  const open = (id: string, button: HTMLButtonElement) => {
    opener.current = button;
    setExpanded(id);
  };
  return (
    <section
      className={s.photoSection}
      aria-label={`${photo.page}쪽 사진 대조`}
    >
      {!photo.available ? (
        <p className={s.notice}>
          사진이 만료되었거나 삭제되었습니다. 저장된 읽기와 판정 이력은 남아
          있습니다.
        </p>
      ) : image.url ? (
        <>
          <PhotoMarks
            photo={photo}
            url={image.url}
            numbers={numbers}
            open={open}
            onError={image.failed}
          />
          {photo.registration.status === "uncertain" ? (
            <p className={s.notice}>
              사진 맞춤을 확인하지 못했습니다. 번호 표시 없이 쪽·문항 목록으로
              확인해 주세요.
            </p>
          ) : null}
          <button
            type="button"
            onClick={(event) => open("page", event.currentTarget)}
          >
            사진·번호 크게 보기
          </button>
        </>
      ) : image.error ? (
        <p role="alert">
          {image.error}{" "}
          <button type="button" onClick={image.retry}>
            사진 다시 열기
          </button>
        </p>
      ) : (
        <p role="status">사진 여는 중</p>
      )}
      {expanded && image.url ? (
        <PickerDialog
          title={
            selected
              ? `확인 번호 ${numbers.get(selected.slotId)} · ${photo.page}쪽 답 칸`
              : `${photo.page}쪽 답안 사진`
          }
          returnFocus={opener}
          onClose={() => setExpanded(null)}
          size="fit"
          width="wide"
        >
          <div className={s.pickerBody}>
            {selected ? (
              <>
                <svg
                  className={s.crop}
                  viewBox={`${x} ${y} ${width} ${height}`}
                  role="img"
                  aria-label={`확인 번호 ${numbers.get(selected.slotId)} 답 칸 확대`}
                >
                  <image
                    href={image.url}
                    width={photo.width}
                    height={photo.height}
                  />
                </svg>
                {onField ? (
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded(null);
                      requestAnimationFrame(() => onField(selected.slotId));
                    }}
                  >
                    같은 번호 입력 칸으로
                  </button>
                ) : null}
              </>
            ) : (
              <div
                className={s.zoomScroll}
                tabIndex={0}
                role="region"
                aria-label="전체 사진 확대"
              >
                <div
                  style={{
                    width:
                      Math.max(
                        800,
                        (slots.length * 50 * photo.width) / photo.height,
                      ) + 60,
                  }}
                >
                  <PhotoMarks
                    photo={photo}
                    url={image.url}
                    numbers={numbers}
                    open={open}
                    onError={image.failed}
                  />
                </div>
              </div>
            )}
          </div>
        </PickerDialog>
      ) : null}
    </section>
  );
}

/** Gutter labels never cover handwriting. Dense pages expose the labels in the full-size dialog. */
function PhotoMarks({
  photo,
  url,
  numbers,
  open,
  onError,
}: {
  photo: Photo;
  url: string;
  numbers: Map<string, number>;
  open: (id: string, button: HTMLButtonElement) => void;
  onError: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(node);
    return () => observer?.disconnect();
  }, []);
  const slots =
    photo.registration.status === "matched"
      ? [...photo.registration.slots].sort(
          (a, b) => a.points[0].y - b.points[0].y,
        )
      : [];
  const height = (width * photo.height) / photo.width;
  const canLabel = height >= slots.length * 48;
  let previous = -48;
  const labels: { slot: (typeof slots)[number]; top: number }[] = [];
  for (const [i, slot] of slots.entries()) {
    const desired =
      (slot.points.reduce((sum, p) => sum + p.y, 0) / 4) * height - 22;
    const top = Math.max(
      previous + 48,
      Math.min(desired, height - (slots.length - i) * 48),
    );
    previous = top;
    labels.push({ slot, top });
  }
  return (
    <div className={s.photoGutter}>
      <div className={s.photoFrame} ref={frame}>
        <img
          src={url}
          width={photo.width}
          height={photo.height}
          alt={`${photo.page}쪽 답안 사진`}
          onError={onError}
        />
        {slots.length > 0 && width > 0 ? (
          <>
            <svg
              className={s.overlay}
              viewBox={`0 0 ${width} ${height}`}
              data-scan-overlay=""
              aria-hidden="true"
            >
              {labels.map(({ slot, top }) => (
                <g key={slot.slotId}>
                  <polygon
                    points={slot.points
                      .map((p) => `${p.x * width},${p.y * height}`)
                      .join(" ")}
                  />
                  {canLabel ? (
                    <line
                      x1={Math.max(...slot.points.map((p) => p.x)) * width}
                      y1={
                        (slot.points.reduce((sum, p) => sum + p.y, 0) / 4) *
                        height
                      }
                      x2={width + 10}
                      y2={top + 22}
                    />
                  ) : null}
                </g>
              ))}
            </svg>
            {canLabel ? (
              labels.map(({ slot, top }) => (
                <button
                  className={s.photoNumber}
                  key={slot.slotId}
                  style={{ top }}
                  type="button"
                  aria-label={`확인 번호 ${numbers.get(slot.slotId)} 답 칸 확대`}
                  onClick={(event) => open(slot.slotId, event.currentTarget)}
                >
                  {numbers.get(slot.slotId)}
                </button>
              ))
            ) : (
              <p className={s.meta}>
                번호가 촘촘합니다. 크게 보기에서 확인해 주세요.
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
