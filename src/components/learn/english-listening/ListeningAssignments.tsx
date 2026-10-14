"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  listeningStudentListItemSchema,
  type ListeningStudentListItem,
} from "@/contracts/englishListeningStudentHttp.contract";
import { requestListeningData } from "./runtime";
import s from "./ListeningPages.module.css";

const labels = {
  ready: "시작 전",
  in_progress: "학습 중",
  submitted: "제출 완료",
  interrupted: "중단 · 선생님 확인 필요",
  expired: "기간 종료",
  cancelled: "취소",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export function ListeningAssignments() {
  const [items, setItems] = useState<ListeningStudentListItem[] | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void requestListeningData(
      "/api/english/learn/listening",
      z.array(listeningStudentListItemSchema),
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setItems(data);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "목록을 불러오지 못했습니다.",
          );
      });
    return () => controller.abort();
  }, [reload]);
  return (
    <main className={s.page}>
      <header className={s.heading}>
        <div>
          <p>오늘 영어 · 나의 학습</p>
          <h1>영어듣기</h1>
          <p>선생님이 배정한 듣기를 확인하세요.</p>
        </div>
        <Link href="/learn" prefetch={false}>
          학습 홈
        </Link>
      </header>
      {error ? (
        <div className={s.notice} role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError("");
              setItems(null);
              setReload((n) => n + 1);
            }}
          >
            다시 불러오기
          </button>
        </div>
      ) : items === null ? (
        <p role="status">듣기 목록을 불러오는 중입니다…</p>
      ) : items.length === 0 ? (
        <p className={s.notice}>
          배정된 듣기가 없습니다. 선생님이 자료를 배정하면 여기에 표시됩니다.
        </p>
      ) : (
        <ul className={s.list}>
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <p className={s.meta}>
                  {item.mode === "practice" ? "듣기 연습" : "짧은 평가"} ·{" "}
                  {labels[item.status]}
                </p>
                <h2>{item.title}</h2>
                <p>
                  {date(item.opensAt)} ~ {date(item.closesAt)}
                </p>
                <p className={s.meta}>
                  {item.audioSource === "teacher_device"
                    ? "교실 스피커로 듣습니다."
                    : "이어폰 또는 기기 소리를 준비하세요."}
                </p>
              </div>
              <Link
                href={`/learn/english-listening/${item.id}`}
                prefetch={false}
              >
                {item.status === "submitted"
                  ? "제출·복습 확인"
                  : item.status === "in_progress"
                    ? "이어 하기"
                    : "열기"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
