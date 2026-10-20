import React from "react";
import { createRoot } from "react-dom/client";
import { MathText, SolutionText } from "@/components/math/MathText";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import "katex/dist/katex.min.css";
import "./wire.css";

// Authored, mathematically checked fixtures. No bank/student/DB records.
export const answers = [
  "③",
  "12",
  "①",
  "$\\frac{7}{3}$",
  "⑤",
  "②",
  "$x=2$",
  "④",
  "36",
  "$\\frac{5}{8}$",
  "①",
  "24 cm²",
  "③",
  "$x=1,\\;3$",
  "⑤",
  "②",
  "가로 12 cm, 세로 8 cm",
  "④",
  "$2(a+b)$",
  "①",
  "48",
  "⑤",
  "$\\frac{11}{4}$",
  "③",
  "(1) 12 (2) 24 (3) 36 (4) 48 (5) 60",
];
const shortContent: Record<number, string> = {
  1: "한 변이 3인 정사각형의 둘레를 구하시오.",
  3: "7을 3으로 나눈 값을 분수로 나타내시오.",
  6: "방정식 x+3=5를 푸시오.",
  8: "6×6을 계산하시오.",
  9: "5를 8로 나눈 값을 분수로 나타내시오.",
  11: "밑변 8 cm, 높이 6 cm인 삼각형의 넓이를 구하시오.",
  13: "방정식 (x-1)(x-3)=0을 푸시오.",
  16: "둘레가 40 cm이고 가로가 세로보다 4 cm 긴 직사각형의 가로와 세로를 구하시오.",
  18: "가로 a, 세로 b인 직사각형의 둘레를 식으로 나타내시오.",
  20: "6×8을 계산하시오.",
  22: "11을 4로 나눈 값을 분수로 나타내시오.",
  24: "다음을 계산하시오. (1) 3×4 (2) 4×6 (3) 6×6 (4) 6×8 (5) 6×10",
};
function problem(i: number) {
  const k = i % 25,
    answer = answers[k];
  const choice = /^[①-⑤]$/.test(answer);
  const labels = ["①", "②", "③", "④", "⑤"];
  const content = choice
    ? "1+1의 값으로 옳은 것을 고르시오. " +
      labels
        .map((label, j) => `${label} ${label === answer ? 2 : j + 3}`)
        .join(" ")
    : shortContent[k];
  return {
    grade: "중1",
    content,
    answer,
    solution: `${content} 주어진 조건을 계산하면 정답은 ${answer}입니다.`,
  };
}
function Answer({ i }: { i: number }) {
  const p = problem(i);
  return <MathText text={fractionViewFor(p)(p.answer)} />;
}
const names = [
  "A · 10칸 번호/정답 띠",
  "B · 5열 가변 격자",
  "C · 객관식 띠 + 단답 목록",
  "D · 2열 채점 기록표",
];
const descriptions = [
  "번호와 정답을 위아래로 읽습니다. 긴 답은 해당 10문항 띠 바로 아래에 번호를 붙여 전문을 싣습니다.",
  "한 칸 한 답. 긴 답은 2칸 또는 한 행을 사용하며 뒤 번호는 다음 칸부터 이어집니다.",
  "객관식은 번호순 띠에, 나머지는 번호가 있는 넓은 줄에 모읍니다. 원래 문항 번호는 유지합니다.",
  "정답 옆 빈 칸에 맞음·틀림을 직접 표시합니다. 긴 답은 셀 높이를 늘려 모두 싣습니다.",
];
function Cell({ i, mark = false }: { i: number; mark?: boolean }) {
  return (
    <div
      className={
        "cell " +
        (answers[i % 25].length > 25
          ? "long"
          : answers[i % 25].length > 14
            ? "medium"
            : "")
      }
    >
      <b>{i + 1}</b>
      <span className="answer">
        <Answer i={i} />
      </span>
      {mark && <span className="mark" aria-label="채점 표시 빈 칸" />}
    </div>
  );
}
function Rows({ v, n }: { v: number; n: number }) {
  const ids = Array.from({ length: n }, (_, i) => i);
  if (v === 0)
    return (
      <>
        {Array.from({ length: Math.ceil(n / 10) }, (_, g) => {
          const group = ids.slice(g * 10, g * 10 + 10);
          const long = group.filter((i) => answers[i % 25].length > 10);
          return (
            <div className="unit" key={g}>
              <div className="ten">
                {group.map((i) => (
                  <div className="stripe" key={i}>
                    <b>{i + 1}</b>
                    <span>
                      {long.includes(i) ? "아래 참조" : <Answer i={i} />}
                    </span>
                  </div>
                ))}
              </div>
              {long.map((i) => (
                <Cell key={i} i={i} />
              ))}
            </div>
          );
        })}
      </>
    );
  if (v === 1) {
    const rows: number[][] = [];
    let row: number[] = [],
      used = 0;
    for (const i of ids) {
      const span =
        answers[i % 25].length > 25 ? 5 : answers[i % 25].length > 14 ? 2 : 1;
      if (used + span > 5) {
        rows.push(row);
        row = [];
        used = 0;
      }
      row.push(i);
      used += span;
    }
    if (row.length) rows.push(row);
    return (
      <>
        {rows.map((row) => (
          <div className="unit five" key={row[0]}>
            {row.map((i) => (
              <Cell key={i} i={i} />
            ))}
          </div>
        ))}
      </>
    );
  }
  if (v === 2) {
    const choices = ids.filter((i) => /^[①-⑤]$/.test(answers[i % 25]));
    const other = ids.filter((i) => !choices.includes(i));
    return (
      <>
        <div className="unit section-title">객관식</div>
        {Array.from({ length: Math.ceil(choices.length / 10) }, (_, g) => (
          <div className="unit ten choice" key={g}>
            {choices.slice(g * 10, g * 10 + 10).map((i) => (
              <Cell key={i} i={i} />
            ))}
          </div>
        ))}
        <div className="unit section-title">단답 · 식 · 여러 답</div>
        {other.map((i) => (
          <div className="unit" key={i}>
            <Cell key={i} i={i} />
          </div>
        ))}
      </>
    );
  }
  return (
    <>
      {Array.from({ length: Math.ceil(n / 2) }, (_, g) => (
        <div className="unit two" key={g}>
          {ids.slice(g * 2, g * 2 + 2).map((i) => (
            <Cell key={i} i={i} mark />
          ))}
        </div>
      ))}
    </>
  );
}
function Sample({ v, n }: { v: number; n: number }) {
  return (
    <section className="sample" data-v={v} data-n={n}>
      <h3>{n}문항</h3>
      <div className="pages">
        <article className="sheet">
          <header>
            <h2>수학 확인 학습 · 정답과 해설</h2>
            <p>
              빠른 채점표 <span>{n}문항</span>
            </p>
          </header>
          <div className="flow">
            <Rows v={v} n={n} />
            <div className="unit explanation">
              <h3>정답과 해설</h3>
              {[0, 1, 3].map((i) => {
                const p = problem(i);
                return (
                  <section key={i}>
                    <b>{i + 1}. </b>
                    <Answer i={i} />
                    <SolutionText text={fractionViewFor(p)(p.solution)} />
                  </section>
                );
              })}
              <p className="note">
                이하 같은 정답·해설 흐름으로 계속 — Wire에서는 앞 3개 해설만
                표시.
              </p>
            </div>
          </div>
          <footer />
        </article>
      </div>
    </section>
  );
}
function App() {
  return (
    <>
      <main>
        <h1>빠른 채점표 · 구조 4안</h1>
        <p>
          Wire · 선택 전 · A4 210 × 297 mm · 좌우 15 mm / 위아래 12 mm · 정답
          12px, 줄 높이 1.8 (현재 AnswerPage 기준)
        </p>
        <p>
          추천 B: 번호순을 유지하고 분수·긴 답을 같은 표 안에서 읽습니다. 실제
          MathText + fractionViewFor로 조판한 자체 제작 정답입니다. 50·100문항은
          같은 25개 답을 반복한 스트레스 표본입니다.
        </p>
        <nav>
          {names.map((name, v) => (
            <a key={v} href={"#v" + v}>
              {name}
            </a>
          ))}
        </nav>
        {names.map((name, v) => (
          <section key={v} className={"variant v" + v} id={"v" + v}>
            <h2>{name}</h2>
            <p>{descriptions[v]}</p>
            <Sample v={v} n={25} />
            <details open>
              <summary>50·100문항 / 긴 답 / 이어지는 채점표 확인</summary>
              <Sample v={v} n={50} />
              <Sample v={v} n={100} />
            </details>
          </section>
        ))}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
