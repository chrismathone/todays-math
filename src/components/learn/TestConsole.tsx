"use client";

/**
 * 테스트 도구판 — 시험용 학생 계정(`test_s`)에만 뜨는 떠 있는 버튼 + 오른쪽 서랍(원장님 2026-09-28 선택).
 * 학생 화면과 섞이지 않게 먹색 바탕의 «도구» 모양이다. 서버가 계정을 확인해 이 컴포넌트를 싣는다
 * (`app/learn/layout.tsx`) — 여기서 계정을 다시 판정하지 않는다. API 가 404 면 아무것도 그리지 않는다.
 *
 * 스냅샷은 이 브라우저(localStorage)에 둔다 — 서버에는 새 표를 만들지 않았다.
 */
import { useCallback, useEffect, useState } from "react";

import type {
  TestConsoleAction,
  TestConsoleState,
} from "@/contracts/testConsole.contract";

import s from "./TestConsole.module.css";

const ENDPOINT = "/api/learn/test-console";
const SNAPSHOT_LIMIT = 10;

type Snapshot = { name: string; savedAt: string; payload: unknown };
type SectionId = "record" | "clock" | "explorer" | "course" | "account";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "record", label: "기록" },
  { id: "clock", label: "시간" },
  { id: "explorer", label: "탐험 · 미션" },
  { id: "course", label: "코스" },
  { id: "account", label: "계정" },
];

const GRADES = [
  { value: 3, label: "초3" },
  { value: 4, label: "초4" },
  { value: 5, label: "초5" },
  { value: 6, label: "초6" },
  { value: 7, label: "중1" },
  { value: 8, label: "중2" },
  { value: 9, label: "중3" },
];

const RESETS: { part: string; label: string }[] = [
  { part: "memory", label: "기억 학습" },
  { part: "explorers", label: "탐험" },
  { part: "expedition", label: "원정" },
  { part: "course", label: "코스" },
  { part: "journey", label: "하루 여정" },
  { part: "fading", label: "오늘의 기억(새)" },
];

const snapshotKey = (loginId: string) => `learn-test-console:${loginId}`;

function readSnapshots(loginId: string): Snapshot[] {
  try {
    const raw = window.localStorage.getItem(snapshotKey(loginId));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as Snapshot[]) : [];
  } catch {
    return [];
  }
}

function writeSnapshots(loginId: string, list: Snapshot[]): boolean {
  try {
    window.localStorage.setItem(snapshotKey(loginId), JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

async function errorText(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? `요청이 실패했습니다(${response.status}).`;
  } catch {
    return `요청이 실패했습니다(${response.status}).`;
  }
}

export function TestConsole() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [data, setData] = useState<TestConsoleState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState<Set<SectionId>>(
    () => new Set<SectionId>(["record"]),
  );
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [armedReset, setArmedReset] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINT, { cache: "no-store" });
      if (response.status === 404) {
        setHidden(true);
        return;
      }
      if (!response.ok) throw new Error(await errorText(response));
      const next = ((await response.json()) as { data: TestConsoleState }).data;
      setData(next);
      setSnapshots(readSnapshots(next.loginId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    // 열 때마다 새로 읽는다 — 학생 화면에서 푼 결과가 도구판 숫자에 바로 보이게.
    if (next) void load();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const act = async (action: TestConsoleAction) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      if (!response.ok) throw new Error(await errorText(response));
      setData(((await response.json()) as { data: TestConsoleState }).data);
      setDirty(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청이 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: SectionId) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (hidden) return null;

  const saveSnapshot = (name: string) => {
    if (!data) return;
    const list = [
      {
        name: name.trim() || `상태 ${snapshots.length + 1}`,
        savedAt: new Date().toISOString(),
        payload: data.payload,
      },
      ...snapshots,
    ].slice(0, SNAPSHOT_LIMIT);
    if (writeSnapshots(data.loginId, list)) setSnapshots(list);
    else setError("이 브라우저에 저장하지 못했습니다.");
  };

  const removeSnapshot = (index: number) => {
    if (!data) return;
    const list = snapshots.filter((_, i) => i !== index);
    writeSnapshots(data.loginId, list);
    setSnapshots(list);
  };

  return (
    <>
      <button
        type="button"
        className={s.fab}
        aria-expanded={open}
        aria-controls="learn-test-console"
        onClick={toggleOpen}
      >
        테스트
      </button>
      {open && (
        <>
          <button
            type="button"
            className={s.scrim}
            aria-label="테스트 도구판 닫기"
            onClick={() => setOpen(false)}
          />
          <aside
            id="learn-test-console"
            className={s.drawer}
            aria-label="테스트 도구판"
          >
            <header className={s.head}>
              <div>
                <p className={s.kicker}>테스트 도구판</p>
                <p className={s.who}>
                  {data ? `${data.loginId} · ${data.className}` : "불러오는 중"}
                </p>
              </div>
              <button
                type="button"
                className={s.close}
                onClick={() => setOpen(false)}
              >
                닫기
              </button>
            </header>

            {error && (
              <p className={s.error} role="alert">
                {error}
              </p>
            )}
            {data?.message && !error && (
              <p className={s.message} role="status">
                {data.message}
              </p>
            )}

            {data && (
              <div className={s.body}>
                {SECTIONS.map((section) => (
                  <section key={section.id} className={s.section}>
                    <button
                      type="button"
                      className={s.sectionToggle}
                      aria-expanded={expanded.has(section.id)}
                      onClick={() => toggle(section.id)}
                    >
                      <span aria-hidden="true">
                        {expanded.has(section.id) ? "▾" : "▸"}
                      </span>{" "}
                      {section.label}
                    </button>
                    {expanded.has(section.id) && (
                      <div className={s.sectionBody}>
                        {section.id === "record" && (
                          <RecordSection
                            data={data}
                            busy={busy}
                            armed={armedReset}
                            onArm={setArmedReset}
                            act={act}
                            snapshots={snapshots}
                            onSave={saveSnapshot}
                            onRemove={removeSnapshot}
                          />
                        )}
                        {section.id === "clock" && (
                          <ClockSection data={data} busy={busy} act={act} />
                        )}
                        {section.id === "explorer" && (
                          <ExplorerSection data={data} busy={busy} act={act} />
                        )}
                        {section.id === "course" && (
                          <CourseSection data={data} busy={busy} act={act} />
                        )}
                        {section.id === "account" && (
                          <div className={s.buttons}>
                            <button
                              type="button"
                              className={s.btn}
                              disabled={busy}
                              onClick={() =>
                                void act({ type: "must-change-password" })
                              }
                            >
                              첫 로그인 상태로
                            </button>
                            <button
                              type="button"
                              className={s.btn}
                              disabled={busy}
                              onClick={() =>
                                void act({ type: "clear-lecture-views" })
                              }
                            >
                              강의 시청 기록 지우기 ({data.counts.lectureViews})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}

            <footer className={s.foot}>
              <button
                type="button"
                className={s.btn}
                disabled={busy}
                onClick={() => void load()}
              >
                다시 읽기
              </button>
              <button
                type="button"
                className={dirty ? s.primary : s.btn}
                onClick={() => window.location.reload()}
              >
                학생 화면 새로 고침
              </button>
            </footer>
          </aside>
        </>
      )}
    </>
  );
}

type SectionProps = {
  data: TestConsoleState;
  busy: boolean;
  act: (action: TestConsoleAction) => Promise<void>;
};

function RecordSection({
  data,
  busy,
  act,
  armed,
  onArm,
  snapshots,
  onSave,
  onRemove,
}: SectionProps & {
  armed: boolean;
  onArm: (v: boolean) => void;
  snapshots: Snapshot[];
  onSave: (name: string) => void;
  onRemove: (index: number) => void;
}) {
  const [name, setName] = useState("");
  return (
    <>
      <dl className={s.facts}>
        <dt>저장 차수</dt>
        <dd>{data.revision}</dd>
        <dt>기억 미션</dt>
        <dd>{data.counts.srsMissions}</dd>
        <dt>원정 칸</dt>
        <dd>{data.counts.expeditionTiles}</dd>
        <dt>완료한 날</dt>
        <dd>{data.counts.completedDays}</dd>
      </dl>
      <p className={s.label}>부분 초기화</p>
      <div className={s.buttons}>
        {RESETS.map((r) => (
          <button
            key={r.part}
            type="button"
            className={s.btn}
            disabled={busy}
            onClick={() =>
              void act({
                type: "reset",
                part: r.part as "memory",
              })
            }
          >
            {r.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={armed ? s.danger : s.btn}
        disabled={busy}
        onClick={() => {
          if (!armed) return onArm(true);
          onArm(false);
          void act({ type: "reset", part: "all" });
        }}
        onBlur={() => onArm(false)}
      >
        {armed ? "한 번 더 누르면 모두 지웁니다" : "전체 초기화"}
      </button>

      <p className={s.label}>스냅샷 (이 브라우저에 보관)</p>
      <div className={s.row}>
        <input
          className={s.input}
          value={name}
          placeholder="이름"
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className={s.btn}
          disabled={busy}
          onClick={() => {
            onSave(name);
            setName("");
          }}
        >
          지금 상태 저장
        </button>
      </div>
      {snapshots.length > 0 && (
        <ul className={s.list}>
          {snapshots.map((snap, i) => (
            <li key={`${snap.savedAt}-${i}`} className={s.listItem}>
              <span className={s.listName}>
                {snap.name}
                <span className={s.dim}>
                  {" "}
                  {new Date(snap.savedAt).toLocaleString("ko-KR", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
              <button
                type="button"
                className={s.btnSm}
                disabled={busy}
                onClick={() =>
                  void act({ type: "restore", payload: snap.payload })
                }
              >
                되돌리기
              </button>
              <button
                type="button"
                className={s.btnSm}
                onClick={() => onRemove(i)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ClockSection({ data, busy, act }: SectionProps) {
  const [days, setDays] = useState(String(data.offsetDays));
  const move = (offsetDays: number) => {
    setDays(String(offsetDays));
    void act({ type: "clock", offsetDays });
  };
  return (
    <>
      <dl className={s.facts}>
        <dt>도구판의 오늘</dt>
        <dd>{data.today}</dd>
        <dt>실제 오늘</dt>
        <dd>{data.realToday}</dd>
        <dt>옮긴 날</dt>
        <dd>
          {data.offsetDays > 0 ? "+" : ""}
          {data.offsetDays}일
        </dd>
      </dl>
      <div className={s.buttons}>
        <button
          type="button"
          className={s.btn}
          disabled={busy}
          onClick={() => move(data.offsetDays - 1)}
        >
          하루 전
        </button>
        <button
          type="button"
          className={s.btn}
          disabled={busy}
          onClick={() => move(data.offsetDays + 1)}
        >
          하루 뒤
        </button>
        <button
          type="button"
          className={s.btn}
          disabled={busy}
          onClick={() => move(data.offsetDays + 7)}
        >
          일주일 뒤
        </button>
        <button
          type="button"
          className={s.btn}
          disabled={busy || data.offsetDays === 0}
          onClick={() => move(0)}
        >
          오늘로
        </button>
      </div>
      <div className={s.row}>
        <input
          className={s.input}
          type="number"
          min={-30}
          max={60}
          value={days}
          aria-label="옮길 날 수"
          onChange={(e) => setDays(e.target.value)}
        />
        <button
          type="button"
          className={s.btn}
          disabled={busy || !/^-?\d+$/.test(days)}
          onClick={() => move(Number(days))}
        >
          날 수로 옮기기
        </button>
      </div>
      <p className={s.note}>
        -30일부터 +60일까지. 기록을 만든 뒤 과거로 가면 저장이 거절될 수
        있습니다.
      </p>
    </>
  );
}

function ExplorerSection({ data, busy, act }: SectionProps) {
  const ex = data.explorer;
  const [stars, setStars] = useState(String(ex?.stars ?? 0));
  const [level, setLevel] = useState(String(ex?.level ?? 0));
  const [grade, setGrade] = useState(String(ex?.grade ?? 3));
  const valid = /^\d+$/.test(stars) && /^\d+$/.test(level);
  return (
    <>
      <dl className={s.facts}>
        <dt>탐험 기록</dt>
        <dd>
          {ex
            ? `별 ${ex.stars} · 누적 ${ex.earned} · 기지 ${ex.level} · 카드 ${ex.cards}`
            : "없음"}
        </dd>
        <dt>오늘 미션</dt>
        <dd>
          {data.mission
            ? `${data.mission.date} · ${data.mission.status}`
            : "없음"}
        </dd>
      </dl>
      <div className={s.grid}>
        <label className={s.field}>
          <span>별</span>
          <input
            className={s.input}
            type="number"
            min={0}
            value={stars}
            onChange={(e) => setStars(e.target.value)}
          />
        </label>
        <label className={s.field}>
          <span>기지 단계</span>
          <input
            className={s.input}
            type="number"
            min={0}
            max={99}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
        </label>
        <label className={s.field}>
          <span>학년</span>
          <select
            className={s.input}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            {GRADES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        className={s.btn}
        disabled={busy || !valid}
        onClick={() =>
          void act({
            type: "explorer",
            stars: Number(stars),
            level: Number(level),
            grade: Number(grade),
          })
        }
      >
        적용
      </button>
      <div className={s.buttons}>
        <button
          type="button"
          className={s.btn}
          disabled={busy || !ex}
          onClick={() => void act({ type: "explorer", clearCards: true })}
        >
          개념 카드 기록 지우기
        </button>
        <button
          type="button"
          className={s.btn}
          disabled={busy || !data.mission}
          onClick={() => void act({ type: "clear-mission" })}
        >
          오늘 미션 지우기
        </button>
      </div>
    </>
  );
}

function CourseSection({ data, busy, act }: SectionProps) {
  const [section, setSection] = useState(
    data.course?.startSectionId ?? data.sections[0]?.id ?? "",
  );
  const [count, setCount] = useState(
    String(data.course?.dailyQuestionCount ?? 10),
  );
  const [enabled, setEnabled] = useState(data.course?.enabled ?? true);
  return (
    <>
      <label className={s.field}>
        <span>시작 소단원</span>
        <select
          className={s.input}
          value={section}
          onChange={(e) => setSection(e.target.value)}
        >
          {data.sections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              {sec.label}
            </option>
          ))}
        </select>
      </label>
      <div className={s.row}>
        <label className={s.field}>
          <span>하루 문항</span>
          <select
            className={s.input}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={s.check}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          켜기
        </label>
      </div>
      <button
        type="button"
        className={s.btn}
        disabled={busy || !section}
        onClick={() =>
          void act({
            type: "course",
            startSectionId: section,
            dailyQuestionCount: Number(count) as 5 | 10 | 15 | 20,
            enabled,
          })
        }
      >
        적용
      </button>
    </>
  );
}
