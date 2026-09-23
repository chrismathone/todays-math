import { CONCEPTS } from "@/lib/math-srs/concepts";
import { estimatedRecall } from "@/lib/math-srs/memory";
import type { ConceptMemory } from "@/lib/math-srs/types";
import s from "./authenticated.module.css";

export function SrsMemoryGrid({
  memories,
  now = new Date(),
}: {
  memories: ConceptMemory[];
  now?: Date;
}) {
  return (
    <ul className={s.memories} aria-label="개념별 기억 추정치">
      {CONCEPTS.map((concept) => {
        const memory = memories.find((item) => item.conceptId === concept.id);
        const assessed = memory && memory.attempts > 0;
        const estimate = assessed ? estimatedRecall(memory, now) : null;
        const recall = estimate === null ? null : Math.round(estimate);
        return (
          <li key={concept.id} data-assessed={!!assessed}>
            <span>{concept.title}</span>
            <strong className={recall === null ? s.unassessed : undefined}>
              {recall === null ? "측정 전" : `${recall}%`}
            </strong>
            <span className={s.memoryTrack} aria-hidden="true">
              <span style={{ width: `${recall ?? 0}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
