/* eslint-disable @next/next/no-html-link-for-pages -- Separate Vite HTML entries, not Next routes. */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ListeningStudentView,
  type ListeningStudentAttemptSnapshot,
  type ListeningStudentViewProps,
} from "@/components/learn/english-listening/ListeningStudentView";
import type { EnglishListeningStudentView } from "@/contracts/englishListeningStudent.contract";
import { fixtureRequest } from "./client";
import "../../src/app/globals.css";
import "./frame.css";

type Initial = Pick<
  ListeningStudentViewProps,
  "view" | "attempt" | "mode" | "media"
> & { sessionId: string };

function StudentHarness({ initial }: { initial: Initial }) {
  const [view, setView] = useState(initial.view);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `student/${initial.sessionId}`;
  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      setView(
        await fixtureRequest<EnglishListeningStudentView>(`${base}/view`),
      );
    } catch {
      setError("검증 서버 상태를 불러오지 못했습니다.");
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <main data-session-id={initial.sessionId}>
      <div className="harness-bar">
        <strong>개발 검증용 · 저장/인증은 대역</strong>
        <a href="/index.html">교사 검증</a>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          서버 공개 상태 새로 확인
        </button>
      </div>
      <p className="harness-note">
        재생은 시험음이며, 첫 답 저장에서 응답 유실을 모사합니다. 공개 DTO는 위
        버튼으로 새로 받습니다.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <ListeningStudentView
        {...initial}
        view={view}
        onStart={(request) =>
          fixtureRequest<ListeningStudentAttemptSnapshot>(
            `${base}/start`,
            request,
          )
        }
        onCommitAnswer={(request) =>
          fixtureRequest<ListeningStudentAttemptSnapshot>(
            `${base}/answer`,
            request,
          )
        }
        onSubmit={(request) =>
          fixtureRequest<ListeningStudentAttemptSnapshot>(
            `${base}/submit`,
            request,
          )
        }
      />
    </main>
  );
}

const query = new URLSearchParams(location.search);
const initial = await fixtureRequest<Initial>("student", {
  audioSource:
    query.get("audio") === "teacher_device"
      ? "teacher_device"
      : "student_device",
  failFirstAnswer: true,
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StudentHarness initial={initial} />
  </StrictMode>,
);
