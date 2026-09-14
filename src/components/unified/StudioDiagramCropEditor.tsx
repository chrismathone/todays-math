"use client";
/* eslint-disable @next/next/no-img-element -- Uses the current page's local pixels. */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Btn, ModalShell } from "./figure-editor/editorUi";
import StudioCropOverlay from "./StudioCropOverlay";
import { studioCropImage, studioImageCanvas } from "./studioAiHelpers";
import type { StudioFigure, StudioRect } from "./studioHelpers";
import styles from "./StudioDiagramCropEditor.module.css";

/** Mathgen DiagramCropOverlay flow, adapted to Studio's page coordinates and crop handles. */
export default function StudioDiagramCropEditor({
  original,
  figure,
  index,
  total,
  bounds,
  onSave,
  onClose,
}: {
  original: string;
  figure: StudioFigure;
  index: number;
  total: number;
  bounds: StudioRect;
  onSave: (figure: StudioFigure) => void;
  onClose: () => void;
}) {
  const [rect, setRect] = useState(figure.rect);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const save = async () => {
    if (saving) return;
    const request = new AbortController();
    controller.current = request;
    setSaving(true);
    setError("");
    try {
      const canvas = await studioImageCanvas(original, request.signal);
      if (request.signal.aborted) return;
      const image = studioCropImage(canvas, rect);
      onSave({
        ...figure,
        rect,
        image,
        originalImage: image,
        svg: undefined,
        spec: undefined,
        engine: undefined,
        figureReview: undefined,
      });
      onClose();
    } catch (error) {
      if (!request.signal.aborted) setError((error as Error).message);
    } finally {
      if (!request.signal.aborted) setSaving(false);
    }
  };
  return createPortal(
    <ModalShell
      className={styles.dialog}
      aria-label={`도형 ${index + 1} 영역 편집`}
      onClose={saving ? () => {} : onClose}
    >
      <header className={styles.header}>
        <div>
          <h2>도형 영역 편집</h2>
          <p>
            도형 {index + 1} / {total} · 박스를 옮기거나 크기를 조절하세요.
          </p>
        </div>
        <output>
          {naturalSize.width
            ? `${Math.round(rect.width * naturalSize.width)} × ${Math.round(rect.height * naturalSize.height)} px`
            : "원본 불러오는 중"}
        </output>
      </header>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.workspace}>
        <div className={styles.page}>
          <img
            src={original}
            alt="도형 영역 수정 원본 페이지"
            draggable={false}
            onLoad={(event) =>
              setNaturalSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            onError={() =>
              setError("원본 페이지를 읽지 못했습니다. 다시 열어 주세요.")
            }
          />
          {naturalSize.width > 0 && (
            <StudioCropOverlay
              id={figure.id}
              rect={rect}
              bounds={bounds}
              label={`도형 ${index + 1}`}
              kind="figure"
              selected
              disabled={saving}
              tool="select"
              onSelect={() => {}}
              onCommit={(_, next) => setRect(next)}
              onDelete={() => {}}
            />
          )}
        </div>
      </div>
      <footer className={styles.footer}>
        <p>박스 안을 끌어 이동 · 모서리로 크기 조절 · 방향키로 미세 이동</p>
        <div>
          <Btn onClick={onClose} disabled={saving}>
            취소
          </Btn>
          <Btn
            kind="accent"
            onClick={save}
            disabled={saving || !naturalSize.width}
          >
            {saving ? "저장 중…" : "저장"}
          </Btn>
        </div>
      </footer>
    </ModalShell>,
    document.body,
  );
}
