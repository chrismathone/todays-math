"use client";

import { studioFigureLabel, type StudioCrop } from "./studioHelpers";
import styles from "./StudioView.module.css";

export interface StudioFigureFailure {
  key: string;
  cropId: string;
  label: string;
  error?: string;
}

/**
 * 실패한 도형 목록 — 원장님 2026-09-20 «전부 완료인데 도형 2/4 이니까 어딘지 알 수가 없음».
 * 이름은 진행 문구(`studioFigureProgressDetail`)와 같은 «도형 {문제}-{그 문제 안 순번}» 를 쓴다.
 * 문제가 사라진 작업은 갈 곳이 없어 빼고, 그 문제 안에서 도형만 사라졌으면 문제 번호까지만 적는다.
 */
export function studioFailedFigureItems(
  crops: StudioCrop[],
  jobs: { cropId: string; figureId: string; error?: string }[],
): StudioFigureFailure[] {
  return jobs
    .flatMap((job) => {
      const problem = crops.findIndex((crop) => crop.id === job.cropId);
      if (problem < 0) return [];
      const figure = (crops[problem].figures ?? []).findIndex(
        (item) => item.id === job.figureId,
      );
      return [
        {
          problem,
          figure,
          key: `${job.cropId}:${job.figureId}`,
          cropId: job.cropId,
          label:
            figure < 0
              ? `도형 ${problem + 1}`
              : studioFigureLabel(problem + 1, figure),
          error: job.error,
        },
      ];
    })
    .sort((a, b) => a.problem - b.problem || a.figure - b.figure)
    .map(({ key, cropId, label, error }) => ({ key, cropId, label, error }));
}

export default function StudioFigureFailures({
  items,
  onSelect,
}: {
  items: StudioFigureFailure[];
  onSelect: (cropId: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className={styles.queueRow}>
      <span className={styles.queueRowLabel}>실패한 도형</span>
      <div className={styles.queueChips} aria-label="실패한 도형 목록">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            data-state="error"
            title={item.error}
            onClick={() => onSelect(item.cropId)}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
