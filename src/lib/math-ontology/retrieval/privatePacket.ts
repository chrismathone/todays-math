import type { joinRetainedOntologySources } from "./privateJoins";
type Evidence = Awaited<ReturnType<typeof joinRetainedOntologySources>>;
/** Only fixed domain tags and deterministic counts leave the server. IDs, dates,
 * answers, raw records, graph paths and original text are never copied here. */
export function ontologyPrivateSummaryPacket(evidence: Evidence) {
  const domains = [
    ["explorer-card", "explorerCards"],
    ["explorer-day", "explorerDays"],
    ["fading-summary", "fadingConcepts"],
    ["active-explorer-session", "activeExplorerSession"],
  ] as const;
  return {
    summaries: domains.map(([domain, key]) => {
      const value = evidence.coverage.otherDomains[key];
      return {
        domain,
        retained: "count" in value ? value.count : value.present ? 1 : 0,
        joined: evidence.summaryWitnesses.filter((w) => w.domain === domain)
          .length,
        independentFirstAttempt: false as const,
        eventTime: null,
        timeKind: "summary-not-timed-event" as const,
      };
    }),
    coverage: {
      timed: {
        available: evidence.coverage.availableRetainedEvents,
        returned: evidence.coverage.retainedEvents,
        joined: evidence.coverage.joinedEvents,
        unresolved: evidence.coverage.unresolved,
        partial: evidence.coverage.partial,
      },
      summaries: {
        retained: evidence.coverage.retainedSummaries,
        inspected: evidence.coverage.inspectedSummaries,
        joined: evidence.coverage.joinedSummaries,
        unresolved: evidence.coverage.unresolvedSummaries,
        partial: evidence.coverage.summaryPartial,
      },
      historyComplete: false as const,
      legacyAttempts: {
        retained: evidence.coverage.otherDomains.legacyAttempts.count,
        independentFirstAttempt: false as const,
      },
      minuteRelearning: {
        present: evidence.coverage.otherDomains.minuteRelearning.present,
        independentFirstAttempt: false as const,
        longTermFsrsUpdate: false as const,
      },
    },
  };
}
export function ontologyPrivateSummaryDetails(evidence: Evidence) {
  const packet = ontologyPrivateSummaryPacket(evidence),
    names = {
      "explorer-card": "탐험 카드",
      "explorer-day": "탐험 완료일",
      "fading-summary": "소거 학습",
      "active-explorer-session": "진행 중 탐험",
    };
  return {
    title: "날짜·상태 요약과 확인 범위",
    text:
      packet.summaries
        .map(
          (s) =>
            `${names[s.domain]} 보존 요약 ${s.retained}개 · 원천 연결 ${s.joined}개`,
        )
        .join(" / ") +
      `. 사건 시각이 없는 요약이며 독립 첫 풀이·계획 변경 후 사건으로 합산하지 않습니다. 원천 미확인 요약 ${packet.coverage.summaries.unresolved}개${packet.coverage.summaries.partial ? " · 일부 요약만 연결했습니다." : "."} 과거 전체 기록은 확인할 수 없습니다.`,
  };
}
