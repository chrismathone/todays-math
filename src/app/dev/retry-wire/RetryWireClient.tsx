"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * 「오답 표시」 Wire 4안 — **누를 수 있게** 그린다 (D-07, 2026-09-08).
 *
 * 🔴 ASCII 로 고른 것은 확정이 아니다(2026-08-19). 그래서 네 안을 전부 실제로
 *    눌러 보게 만든다 — 56칸을 진짜 찍어 봐야 「몇 번 눌러야 하나」가 답해진다.
 *
 * 네 안이 **전부** 답해야 하는 물음:
 *   ㉠ 세 상태(아직 안 봄 · 하나도 안 틀림 · 틀림)를 가르는가
 *   ㉡ 반 전체가 몇 화면인가
 *   ㉢ 중간에 멈췄다 이어할 수 있나
 *   ㉣ 잘못 찍은 것을 어떻게 무르나
 */

type Student = { id: string; name: string };
type Problem = {
  id: string;
  no: number;
  code: string;
  stem: string;
  difficulty: string;
};

type Props = {
  testDate: string;
  className: string;
  students: Student[];
  problems: Problem[];
};

/** 학생 하나의 채점 상태 — **세 번째 상태를 화면이 만든다.** */
type Marking = {
  /** 원장이 「이 학생 채점 끝」을 누른 적이 있나. 없으면 «아직 안 봄». */
  done: boolean;
  wrong: Set<string>;
};

const WIRES = [
  { key: "A", label: "A. 표 — 학생 × 문항" },
  { key: "B", label: "B. 학생 하나씩" },
  { key: "C", label: "C. 문항 하나씩" },
  { key: "D", label: "D. 번호 적기" },
] as const;
type WireKey = (typeof WIRES)[number]["key"];

const BOX = "border border-control bg-white";
const NOTE = "text-[11.5px] leading-relaxed text-text-2";

export function RetryWireClient({
  testDate,
  className,
  students,
  problems,
}: Props) {
  const [wire, setWire] = useState<WireKey>("A");
  const [marks, setMarks] = useState<Record<string, Marking>>({});
  const [taps, setTaps] = useState(0);

  const markOf = useCallback(
    (sid: string): Marking => marks[sid] ?? { done: false, wrong: new Set() },
    [marks],
  );

  const toggle = useCallback((sid: string, pid: string) => {
    setTaps((n) => n + 1);
    setMarks((prev) => {
      const cur = prev[sid] ?? { done: false, wrong: new Set<string>() };
      const wrong = new Set(cur.wrong);
      if (wrong.has(pid)) wrong.delete(pid);
      else wrong.add(pid);
      return { ...prev, [sid]: { ...cur, wrong } };
    });
  }, []);

  const setDone = useCallback((sid: string, done: boolean) => {
    setTaps((n) => n + 1);
    setMarks((prev) => {
      const cur = prev[sid] ?? { done: false, wrong: new Set<string>() };
      return { ...prev, [sid]: { ...cur, done } };
    });
  }, []);

  const progress = useMemo(() => {
    const done = students.filter((s) => markOf(s.id).done).length;
    const wrongTotal = students.reduce(
      (n, s) => n + markOf(s.id).wrong.size,
      0,
    );
    return { done, wrongTotal };
  }, [students, markOf]);

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-6 bg-canvas px-6 py-8 text-ink">
      <header className="flex flex-col gap-3 border-b-[3px] border-ink pb-4">
        <h1 className="text-[22px] font-black">
          오답 표시 화면 — Wire 4안 (D-07)
        </h1>
        <p className={NOTE}>
          실데이터입니다. <b>{className}</b> · {testDate} · 학생{" "}
          <b>{students.length}</b>명 × 문항 <b>{problems.length}</b>개 ={" "}
          <b>{students.length * problems.length}칸</b> — 공유 DB 에서 가장 큰
          확정 시험지입니다. 지어낸 픽스처로 그리면 「한 화면에 들어가나」라는
          물음 자체가 사라집니다.
        </p>
        <p className={NOTE}>
          🔴 네 안이 전부 답해야 하는 것: <b>세 상태</b>(아직 안 봄 / 하나도 안
          틀림 / 틀림)를 가르는가 · 반 전체가 몇 화면인가 · 멈췄다 이어할 수
          있나 · 잘못 찍은 것을 어떻게 무르나.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {WIRES.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setWire(w.key)}
              aria-pressed={wire === w.key}
              className={`cursor-pointer border px-3 py-1 text-[13px] ${
                wire === w.key
                  ? "border-ink bg-ink font-bold text-white"
                  : "border-control bg-white"
              }`}
            >
              {w.label}
            </button>
          ))}
          <span className="ml-auto text-[12.5px] tabular-nums text-text-2">
            채점 끝 {progress.done}/{students.length} · 표시한 오답{" "}
            {progress.wrongTotal}개 · <b>누른 횟수 {taps}</b>
          </span>
        </div>
      </header>

      {wire === "A" ? (
        <WireA
          students={students}
          problems={problems}
          markOf={markOf}
          toggle={toggle}
          setDone={setDone}
        />
      ) : null}
      {wire === "B" ? (
        <WireB
          students={students}
          problems={problems}
          markOf={markOf}
          toggle={toggle}
          setDone={setDone}
        />
      ) : null}
      {wire === "C" ? (
        <WireC
          students={students}
          problems={problems}
          markOf={markOf}
          toggle={toggle}
        />
      ) : null}
      {wire === "D" ? (
        <WireD
          students={students}
          problems={problems}
          markOf={markOf}
          setWrongByNumbers={(sid, ids) => {
            setTaps((n) => n + 1);
            setMarks((prev) => ({
              ...prev,
              [sid]: { done: true, wrong: new Set(ids) },
            }));
          }}
        />
      ) : null}
    </main>
  );
}

// ─────────────────────────────────────────────
// A. 표 — 학생 × 문항
// ─────────────────────────────────────────────

function WireA({
  students,
  problems,
  markOf,
  toggle,
  setDone,
}: {
  students: Student[];
  problems: Problem[];
  markOf: (id: string) => Marking;
  toggle: (s: string, p: string) => void;
  setDone: (s: string, d: boolean) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-black">A. 표 — 학생 × 문항</h2>
      <p className={NOTE}>
        반 전체가 <b>한 화면</b>. 틀린 칸만 누릅니다. 오른쪽 「끝」을 눌러야 그
        학생이 «채점됨»이 됩니다 — 안 누르면 «아직 안 봄»이라 만점으로 굳지
        않습니다.
      </p>
      <div className={`${BOX} overflow-x-auto`}>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-divider">
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-bold">
                학생
              </th>
              {problems.map((p) => (
                <th
                  key={p.id}
                  className="w-10 px-1 py-2 text-center font-bold tabular-nums"
                  title={`${p.code} · ${p.stem}`}
                >
                  {p.no}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-bold">상태</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const m = markOf(s.id);
              return (
                <tr
                  key={s.id}
                  className="border-b border-divider last:border-0"
                >
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium">
                    {s.name}
                  </td>
                  {problems.map((p) => {
                    const isWrong = m.wrong.has(p.id);
                    return (
                      <td key={p.id} className="p-0.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(s.id, p.id)}
                          aria-pressed={isWrong}
                          aria-label={`${s.name} ${p.no}번 ${isWrong ? "오답 해제" : "오답 표시"}`}
                          className={`h-8 w-8 cursor-pointer border text-[14px] font-bold ${
                            isWrong
                              ? "border-g-red-text bg-g-red-text text-white"
                              : m.done
                                ? "border-control bg-white text-text-2"
                                : "border-dashed border-control bg-canvas text-text-2"
                          }`}
                        >
                          {isWrong ? "✕" : m.done ? "○" : ""}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-center">
                    {/*
                      🔴 **버튼이 «무엇을 굳히는지» 누르기 전에 말한다.**
                         종전 라벨은 그냥 「끝」이라, 한 칸도 안 찍은 행에서 누르면
                         **만점이 조용히 굳었다.** codex·grok 이 둘 다 이것을 최대
                         결함으로 짚었다 — 「미채점과 만점이 섞인다」.
                         이제 `0개 끝` / `2개 끝` 이라 적어 무엇을 주장하는지 보인다.
                    */}
                    <button
                      type="button"
                      onClick={() => setDone(s.id, !m.done)}
                      aria-pressed={m.done}
                      className={`min-w-16 cursor-pointer border px-2 py-1 text-[12px] whitespace-nowrap ${
                        m.done
                          ? "border-ink bg-ink text-white"
                          : "border-control bg-white"
                      }`}
                    >
                      {m.done ? `${m.wrong.size}개 ✓` : `${m.wrong.size}개 끝`}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SaveBar students={students} markOf={markOf} />
      <p className={NOTE}>
        ⚠️ 문항이 20개를 넘으면 가로 스크롤이 생깁니다 — 지금 일일테스트 기본은
        8문항이라 안 생기지만, 확인테스트를 크게 내면 달라집니다.
      </p>
      <p className={NOTE}>
        ⚠️ **「전원 응시」·「전부 맞음」 같은 일괄 버튼은 두지 않습니다** —
        결석한 학생까지 한 번에 만점으로 굳힙니다(grok 지적). 한 명씩 눌러야 그
        주장이 원장님 것이 됩니다.
      </p>
    </section>
  );
}

/**
 * 🔴 **미채점 행이 남은 채로 저장하지 못하게 막는다 — 그리고 «누가» 남았는지 댄다.**
 *
 * 「N명 남음」만 적으면 원장이 명단을 다시 훑어야 한다. 이름을 대야 바로 간다.
 * 「몇 건 남았나」를 세면서 **무엇이** 남았는지 안 대는 것은 이 저장소가
 * 여러 번 낸 결함이다.
 */
function SaveBar({
  students,
  markOf,
}: {
  students: Student[];
  markOf: (id: string) => Marking;
}) {
  const pending = students.filter((s) => !markOf(s.id).done);
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-divider pt-3">
      <button
        type="button"
        disabled={pending.length > 0}
        className="min-h-11 cursor-pointer border border-ink bg-ink px-4 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:border-control disabled:bg-white disabled:text-text-2"
      >
        채점 결과 저장
      </button>
      <span className={NOTE}>
        {pending.length === 0
          ? `${students.length}명 모두 채점했습니다.`
          : `아직 안 본 학생: ${pending.map((s) => s.name).join(" · ")}`}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// B. 학생 하나씩
// ─────────────────────────────────────────────

function WireB({
  students,
  problems,
  markOf,
  toggle,
  setDone,
}: {
  students: Student[];
  problems: Problem[];
  markOf: (id: string) => Marking;
  toggle: (s: string, p: string) => void;
  setDone: (s: string, d: boolean) => void;
}) {
  const [at, setAt] = useState(0);
  const s = students[Math.min(at, students.length - 1)]!;
  const m = markOf(s.id);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-black">B. 학생 하나씩</h2>
      <p className={NOTE}>
        종이를 한 장씩 넘기는 순서와 같습니다. 번호가 크니까 잘못 누를 일이
        적고, 대신 반 전체를 보려면 <b>{students.length}화면</b>입니다.
      </p>
      <div className={`${BOX} flex flex-col gap-4 p-5`}>
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-black">{s.name}</span>
          <span className="text-[12.5px] tabular-nums text-text-2">
            {at + 1} / {students.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {problems.map((p) => {
            const isWrong = m.wrong.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(s.id, p.id)}
                aria-pressed={isWrong}
                className={`h-12 w-12 cursor-pointer border text-[17px] font-bold tabular-nums ${
                  isWrong
                    ? "border-g-red-text bg-g-red-text text-white"
                    : "border-control bg-white"
                }`}
              >
                {p.no}
              </button>
            );
          })}
        </div>
        <p className={NOTE}>
          누른 번호가 <b>틀린 것</b>입니다. 안 누른 것은 맞은 것으로 봅니다 —
          그래서 아래 「채점 끝」을 눌러야 저장됩니다.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={at === 0}
            onClick={() => setAt((n) => Math.max(0, n - 1))}
            className="min-h-11 cursor-pointer border border-control px-3 py-1 text-[13px] disabled:cursor-not-allowed disabled:text-text-2"
          >
            이전
          </button>
          <button
            type="button"
            onClick={() => {
              setDone(s.id, true);
              setAt((n) => Math.min(students.length - 1, n + 1));
            }}
            className="min-h-11 flex-1 cursor-pointer border border-ink bg-ink px-3 py-1 text-[13px] font-bold text-white"
          >
            채점 끝 · 다음 학생
          </button>
          <span className="text-[12.5px] text-text-2">
            {m.done ? `기록됨 (${m.wrong.size}개)` : "아직 안 봄"}
          </span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// C. 문항 하나씩
// ─────────────────────────────────────────────

function WireC({
  students,
  problems,
  markOf,
  toggle,
}: {
  students: Student[];
  problems: Problem[];
  markOf: (id: string) => Marking;
  toggle: (s: string, p: string) => void;
}) {
  const [at, setAt] = useState(0);
  const p = problems[Math.min(at, problems.length - 1)]!;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-black">C. 문항 하나씩</h2>
      <p className={NOTE}>
        「이 문제를 누가 틀렸나」로 훑습니다. 반 전체를 채점한 종이 뭉치를 한
        번에 넘기며 같은 번호만 보는 방식이라, 한 문항의 정답을 머리에 한 번만
        담으면 됩니다. 대신 <b>{problems.length}화면</b>이고,{" "}
        <b>「이 학생을 다 봤나」를 이 화면이 못 답합니다</b> — 세 번째 상태를
        만들 자리가 없습니다.
      </p>
      <div className={`${BOX} flex flex-col gap-4 p-5`}>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[17px] font-black">
            {p.no}번{" "}
            <span className="text-[12.5px] font-normal text-text-2">
              {p.difficulty} · {p.code}
            </span>
          </span>
          <span className="text-[12.5px] tabular-nums text-text-2">
            {at + 1} / {problems.length}
          </span>
        </div>
        <p className="text-[13px] text-text-2">{p.stem}…</p>
        <div className="flex flex-wrap gap-2">
          {students.map((s) => {
            const isWrong = markOf(s.id).wrong.has(p.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id, p.id)}
                aria-pressed={isWrong}
                className={`min-h-11 cursor-pointer border px-3 text-[14px] ${
                  isWrong
                    ? "border-g-red-text bg-g-red-text font-bold text-white"
                    : "border-control bg-white"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={at === 0}
            onClick={() => setAt((n) => Math.max(0, n - 1))}
            className="min-h-11 cursor-pointer border border-control px-3 py-1 text-[13px] disabled:cursor-not-allowed disabled:text-text-2"
          >
            이전 문항
          </button>
          <button
            type="button"
            onClick={() => setAt((n) => Math.min(problems.length - 1, n + 1))}
            className="min-h-11 flex-1 cursor-pointer border border-ink bg-ink px-3 py-1 text-[13px] font-bold text-white"
          >
            다음 문항
          </button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// D. 번호 적기
// ─────────────────────────────────────────────

function WireD({
  students,
  problems,
  markOf,
  setWrongByNumbers,
}: {
  students: Student[];
  problems: Problem[];
  markOf: (id: string) => Marking;
  setWrongByNumbers: (sid: string, ids: string[]) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const byNo = useMemo(
    () => new Map(problems.map((p) => [p.no, p.id])),
    [problems],
  );

  const parse = (text: string) => {
    const nums = text
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map(Number);
    const ok: string[] = [];
    const bad: number[] = [];
    for (const n of nums) {
      const id = byNo.get(n);
      if (id) ok.push(id);
      else bad.push(n);
    }
    return { ok, bad };
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-black">D. 번호 적기</h2>
      <p className={NOTE}>
        가장 적게 누릅니다 — 학생당 「3 5 7」처럼 치고 넘어갑니다. 대신{" "}
        <b>없는 번호를 쳐도 화면이 막아 줘야 하고</b>, 「하나도 안 틀림」을
        빈칸과 어떻게 가를지가 문제입니다(여기서는 빈칸으로 두고 「기록」을
        누르면 0개로 굳습니다).
      </p>
      <div className={`${BOX} flex flex-col`}>
        {students.map((s) => {
          const text = draft[s.id] ?? "";
          const { bad } = parse(text);
          const m = markOf(s.id);
          return (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-2.5 last:border-0"
            >
              <span className="w-16 shrink-0 text-[14px] font-medium">
                {s.name}
              </span>
              <input
                value={text}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [s.id]: e.target.value }))
                }
                inputMode="numeric"
                placeholder="틀린 번호 (예: 3 5 7)"
                aria-label={`${s.name} 틀린 번호`}
                className={`min-h-11 w-48 border px-2 text-[14px] tabular-nums ${
                  bad.length ? "border-g-red-text" : "border-control"
                }`}
              />
              <button
                type="button"
                onClick={() => setWrongByNumbers(s.id, parse(text).ok)}
                disabled={bad.length > 0}
                className="min-h-11 cursor-pointer border border-ink bg-ink px-3 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:border-control disabled:bg-white disabled:text-text-2"
              >
                기록
              </button>
              <span className="text-[12px] text-text-2">
                {bad.length
                  ? `${bad.join("·")}번은 이 시험지에 없습니다`
                  : m.done
                    ? `기록됨 (${m.wrong.size}개)`
                    : "아직 안 봄"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
