"use client";

import { useState, type ReactNode } from "react";

import Icon from "@/components/unified/WorkspaceIcon";
import s from "@/components/unified/PrivateLibrary.module.css";
import w from "@/components/unified/Workroom.module.css";

import h from "./PublishHifi.module.css";

/**
 * 월말평가 M1 «반에 내기» Hi-fi 4안 — Wire B(내 시험지 보관함에서) 위에서. 원장님 «B안, 나머지는 추천대로»(2026-10-17).
 * 바탕은 지금의 «내 시험지» 표(`PrivateLibrary.module.css`)와 작업실 창(`Workroom.module.css` `.dialog`) 그대로다.
 * 안끼리 다른 것은 **낸 기록이 보이는 자리**와 **반에 내기 단추의 모양**뿐이고, 창의 속 · 문구는 네 안이 같다.
 * 지어낸 작은 픽스처다. 아무것도 저장 · 호출하지 않는다.
 */

type Issued = {
  cls: string;
  date: string;
  graded: number;
  students: number;
  absent: number;
};
type Row = {
  title: string;
  kind: string;
  tag?: string;
  count: number;
  updated: string;
  issued: Issued[];
};

const ROWS: Row[] = [
  {
    title: "중2 10월 월말평가",
    kind: "시험지",
    tag: "월말TEST",
    count: 25,
    updated: "2026. 10. 28. 오후 9:12",
    issued: [
      { cls: "중2 A반", date: "10/30", graded: 12, students: 12, absent: 0 },
      { cls: "중2 B반", date: "10/30", graded: 4, students: 9, absent: 1 },
    ],
  },
  {
    title: "중1 9월 단원평가 — 정수와 유리수",
    kind: "시험지",
    count: 20,
    updated: "2026. 9. 25. 오후 4:40",
    issued: [
      { cls: "중1 A반", date: "9/27", graded: 10, students: 10, absent: 0 },
    ],
  },
  {
    title: "중3 이차방정식 숙제",
    kind: "시험지",
    count: 16,
    updated: "2026. 10. 20. 오전 11:02",
    issued: [],
  },
];

const summary = (issued: Issued[]) => {
  if (!issued.length) return "낸 적 없음";
  const graded = issued.reduce((n, i) => n + i.graded, 0);
  const total = issued.reduce((n, i) => n + i.students, 0);
  return `${issued.length}개 반 · ${issued[0]!.date} · 채점 ${graded}/${total}명`;
};
const left = (i: Issued) => i.students - i.graded;

/* ───────────── 공통 — 반에 내기 창 ───────────── */

type DialogState = "idle" | "saving" | "done" | "failed";
const DIALOG_STATES: { key: DialogState; label: string }[] = [
  { key: "idle", label: "고르는 중" },
  { key: "saving", label: "내는 중" },
  { key: "done", label: "냈음" },
  { key: "failed", label: "내지 못함" },
];

function PublishDialog({ state }: { state: DialogState }) {
  const row = ROWS[0]!;
  return (
    <div
      className={`${w.dialog} ${h.staticDialog}`}
      role="group"
      aria-label="반에 내기 창"
    >
      <div className={w.dialogHeading}>
        <div>
          <span>내 시험지</span>
          <h2>반에 내기</h2>
        </div>
      </div>
      <p className={h.sheetLine}>
        <b>{row.title}</b> · {row.count}문항 · 총점 100점
      </p>
      {state === "done" ? (
        <div className={h.doneBox} role="status">
          <p>
            <b>중2 A반 · 중2 B반</b>에 냈습니다. 반마다 채점표가 생겼습니다.
          </p>
          <div className={h.doneLinks}>
            <button type="button" className={w.outlineButton}>
              중2 A반 채점하기
            </button>
            <button type="button" className={w.outlineButton}>
              중2 B반 채점하기
            </button>
          </div>
        </div>
      ) : (
        <div className={h.fields}>
          <label className={h.field}>
            시험 종류
            <select defaultValue="월말평가" disabled={state === "saving"}>
              <option>월말평가</option>
              <option>단원평가</option>
              <option>내신 대비</option>
              <option>기타</option>
            </select>
          </label>
          <label className={h.field}>
            시험일
            <input
              type="date"
              defaultValue="2026-10-30"
              disabled={state === "saving"}
            />
          </label>
          <fieldset className={h.classes} disabled={state === "saving"}>
            <legend>반</legend>
            {[
              ["중2 A반", 12, true],
              ["중2 B반", 9, true],
              ["중3 A반", 11, false],
            ].map(([name, n, on]) => (
              <label key={String(name)}>
                <input type="checkbox" defaultChecked={Boolean(on)} />
                {name} · {n}명
              </label>
            ))}
          </fieldset>
          <p className={h.note}>
            낸 시험지는 고칠 수 없습니다. 고치려면 작업실에서 고친 뒤 다시
            냅니다. 채점을 시작하기 전에는 낸 시험을 지울 수 있습니다.
          </p>
          {state === "failed" ? (
            <p className={w.modalError} role="alert">
              내지 못했습니다. 다시 시도해 주세요.
            </p>
          ) : null}
        </div>
      )}
      <div className={w.dialogActions}>
        {state === "done" ? (
          <button type="button" className={w.primaryButton}>
            닫기
          </button>
        ) : (
          <>
            <button
              type="button"
              className={w.outlineButton}
              disabled={state === "saving"}
            >
              취소
            </button>
            <button
              type="button"
              className={w.primaryButton}
              disabled={state === "saving"}
            >
              {state === "saving" ? "내는 중" : "2개 반에 내기"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────── 공통 — 표의 틀(지금 «내 시험지» 그대로) ───────────── */

function Table({
  extraHead,
  renderRow,
  above,
}: {
  extraHead?: string;
  renderRow: (row: Row, index: number) => ReactNode;
  above?: ReactNode;
}) {
  return (
    <main className={`${s.library} ${h.library}`}>
      {above}
      <p className={s.resultCount}>
        <strong>{ROWS.length}</strong>개 자료
      </p>
      <div className={s.board}>
        <table className={s.table} aria-label="저장한 자료 목록">
          <thead>
            <tr>
              <th scope="col" className={s.numberCell}>
                번호
              </th>
              <th scope="col" className={s.kindCell}>
                종류
              </th>
              <th scope="col" className={s.titleCell}>
                제목
              </th>
              <th scope="col" className={s.countCell}>
                문항
              </th>
              {extraHead ? (
                <th scope="col" className={h.issuedCell}>
                  {extraHead}
                </th>
              ) : (
                <th scope="col" className={s.updatedCell}>
                  수정
                </th>
              )}
              <th scope="col" className={`${s.actionsCell} ${h.wideActions}`}>
                작업
              </th>
            </tr>
          </thead>
          <tbody>{ROWS.map(renderRow)}</tbody>
        </table>
      </div>
    </main>
  );
}

function KindCell({ row, extra }: { row: Row; extra?: ReactNode }) {
  return (
    <td className={s.kindCell}>
      <span className={h.kindStack}>
        <span className={s.kindBadge} data-kind="draft">
          {row.kind}
        </span>
        {row.tag ? <span className={h.tag}>{row.tag}</span> : null}
        {extra}
      </span>
    </td>
  );
}

function IconActions({ row, publish }: { row: Row; publish?: ReactNode }) {
  return (
    <div className={s.actions}>
      {publish}
      <button type="button" aria-label={`${row.title} 정보`} title="정보">
        <Icon name="info" />
      </button>
      <button
        type="button"
        aria-label={`${row.title} 수정`}
        title="수정 · 출력 설정 열기"
      >
        <Icon name="edit" />
      </button>
      <button type="button" aria-label={`${row.title} 삭제`} title="삭제">
        <Icon name="trash" />
      </button>
    </div>
  );
}

function IssuedTable({ issued }: { issued: Issued[] }) {
  return (
    <table className={h.issuedTable} aria-label="낸 기록">
      <thead>
        <tr>
          <th scope="col">반</th>
          <th scope="col">시험일</th>
          <th scope="col">채점</th>
          <th scope="col">결시</th>
          <th scope="col" />
        </tr>
      </thead>
      <tbody>
        {issued.map((i) => (
          <tr key={i.cls}>
            <th scope="row">{i.cls}</th>
            <td>{i.date}</td>
            <td>
              {i.graded}/{i.students}명
              {left(i) ? (
                <span className={h.leftBadge}>남음 {left(i)}</span>
              ) : null}
            </td>
            <td>{i.absent}명</td>
            <td className={h.right}>
              <button type="button" className={h.gradeButton}>
                채점하기
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ───────────── 네 안 ───────────── */

/** H1 — 작업 칸에 아이콘 하나, 제목 아래 «낸 기록» 한 줄(진행 단계 줄과 같은 자리 · 같은 모양). */
function H1() {
  const [open, setOpen] = useState(0);
  return (
    <Table
      renderRow={(row, index) => (
        <FragmentRows key={row.title}>
          <tr>
            <td className={s.numberCell}>{index + 1}</td>
            <KindCell row={row} />
            <td className={s.titleCell}>
              <button type="button" className={s.titleButton}>
                {row.title}
              </button>
              <div className={s.progressLine}>
                <span>{summary(row.issued)}</span>
                {row.issued.length ? (
                  <button
                    type="button"
                    aria-expanded={open === index}
                    onClick={() => setOpen(open === index ? -1 : index)}
                  >
                    {open === index ? "낸 기록 접기" : "낸 기록 보기"}
                  </button>
                ) : null}
              </div>
            </td>
            <td className={s.countCell}>{row.count}</td>
            <td className={s.updatedCell}>{row.updated}</td>
            <td className={`${s.actionsCell} ${h.wideActions}`}>
              <IconActions
                row={row}
                publish={
                  <button
                    type="button"
                    aria-label={`${row.title} 반에 내기`}
                    title="반에 내기"
                  >
                    <Icon name="class" />
                  </button>
                }
              />
            </td>
          </tr>
          {open === index && row.issued.length ? (
            <tr className={h.expandRow}>
              <td />
              <td colSpan={5}>
                <IssuedTable issued={row.issued} />
              </td>
            </tr>
          ) : null}
        </FragmentRows>
      )}
    />
  );
}

/** H2 — Wire B 그대로: «낸 기록» 칸(수정일 자리) + 글자 단추 «반에 내기». */
function H2() {
  const [open, setOpen] = useState(0);
  return (
    <Table
      extraHead="낸 기록"
      renderRow={(row, index) => (
        <FragmentRows key={row.title}>
          <tr>
            <td className={s.numberCell}>{index + 1}</td>
            <KindCell row={row} />
            <td className={s.titleCell}>
              <button type="button" className={s.titleButton}>
                {row.title}
              </button>
              <small>수정 {row.updated}</small>
            </td>
            <td className={s.countCell}>{row.count}</td>
            <td className={h.issuedCell}>
              {row.issued.length ? (
                <button
                  type="button"
                  className={h.issuedToggle}
                  aria-expanded={open === index}
                  onClick={() => setOpen(open === index ? -1 : index)}
                >
                  {row.issued.length}개 반 · {row.issued[0]!.date}
                  <Icon name="down" size={14} />
                </button>
              ) : (
                <span className={h.muted}>—</span>
              )}
            </td>
            <td className={`${s.actionsCell} ${h.wideActions}`}>
              <IconActions
                row={row}
                publish={
                  <button type="button" className={h.textButton}>
                    반에 내기
                  </button>
                }
              />
            </td>
          </tr>
          {open === index && row.issued.length ? (
            <tr className={h.expandRow}>
              <td />
              <td colSpan={5}>
                <IssuedTable issued={row.issued} />
              </td>
            </tr>
          ) : null}
        </FragmentRows>
      )}
    />
  );
}

/** H3 — 표 위에 «채점이 남은 시험» 띠. 줄에는 종류 딱지 옆 «2개 반에 냄» 딱지와 글자 단추. */
function H3() {
  const pending = ROWS.flatMap((row) =>
    row.issued.filter((i) => left(i) > 0).map((i) => ({ row, i })),
  );
  return (
    <Table
      above={
        <section className={h.strip} aria-label="채점이 남은 시험">
          <header>
            <strong>채점이 남은 시험</strong>
            <span>{pending.length}건</span>
          </header>
          <ul>
            {pending.map(({ row, i }) => (
              <li key={`${row.title}-${i.cls}`}>
                <span>
                  <b>{row.title}</b> · {i.cls} · {i.date}
                </span>
                <span className={h.leftBadge}>남음 {left(i)}명</span>
                <button type="button" className={h.gradeButton}>
                  채점하기
                </button>
              </li>
            ))}
          </ul>
        </section>
      }
      renderRow={(row, index) => (
        <tr key={row.title}>
          <td className={s.numberCell}>{index + 1}</td>
          <KindCell
            row={row}
            extra={
              row.issued.length ? (
                <span className={h.issuedBadge}>
                  {row.issued.length}개 반에 냄
                </span>
              ) : null
            }
          />
          <td className={s.titleCell}>
            <button type="button" className={s.titleButton}>
              {row.title}
            </button>
          </td>
          <td className={s.countCell}>{row.count}</td>
          <td className={s.updatedCell}>{row.updated}</td>
          <td className={`${s.actionsCell} ${h.wideActions}`}>
            <IconActions
              row={row}
              publish={
                <button type="button" className={h.textButton}>
                  반에 내기
                </button>
              }
            />
          </td>
        </tr>
      )}
    />
  );
}

/** H4 — 줄을 펼치면 반마다 카드(채점 진행 막대 · 결시 · 채점하기). 아이콘 단추. */
function H4() {
  const [open, setOpen] = useState(0);
  return (
    <Table
      renderRow={(row, index) => (
        <FragmentRows key={row.title}>
          <tr>
            <td className={s.numberCell}>{index + 1}</td>
            <KindCell row={row} />
            <td className={s.titleCell}>
              <button type="button" className={s.titleButton}>
                {row.title}
              </button>
              {row.issued.length ? (
                <div className={s.progressLine}>
                  <button
                    type="button"
                    aria-expanded={open === index}
                    onClick={() => setOpen(open === index ? -1 : index)}
                  >
                    {row.issued.length}개 반에 냄
                    <Icon
                      name={open === index ? "down" : "chevron"}
                      size={14}
                    />
                  </button>
                </div>
              ) : null}
            </td>
            <td className={s.countCell}>{row.count}</td>
            <td className={s.updatedCell}>{row.updated}</td>
            <td className={`${s.actionsCell} ${h.wideActions}`}>
              <IconActions
                row={row}
                publish={
                  <button
                    type="button"
                    aria-label={`${row.title} 반에 내기`}
                    title="반에 내기"
                  >
                    <Icon name="class" />
                  </button>
                }
              />
            </td>
          </tr>
          {open === index && row.issued.length ? (
            <tr className={h.expandRow}>
              <td />
              <td colSpan={5}>
                <ul className={h.cards}>
                  {row.issued.map((i) => (
                    <li key={i.cls} className={h.card}>
                      <header>
                        <strong>{i.cls}</strong>
                        <span>{i.date}</span>
                      </header>
                      <p>
                        채점 {i.graded}/{i.students}명 · 결시 {i.absent}명
                      </p>
                      <div className={h.bar} aria-hidden="true">
                        <span
                          style={{ width: `${(i.graded / i.students) * 100}%` }}
                        />
                      </div>
                      <button type="button" className={h.gradeButton}>
                        채점하기
                      </button>
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ) : null}
        </FragmentRows>
      )}
    />
  );
}

function FragmentRows({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const OPTIONS = [
  {
    id: "H1",
    title: "조용한 한 줄",
    body: "작업 칸에 아이콘 하나(반에 내기). 제목 아래 진행 단계 줄 자리에 «2개 반 · 10/30 · 채점 16/21명»과 «낸 기록 보기».",
    View: H1,
  },
  {
    id: "H2",
    title: "낸 기록 칸",
    body: "Wire B 그대로 — 수정일 자리에 «낸 기록» 칸(펼치기). 작업 칸에 글자 단추 «반에 내기». 수정일은 제목 아래로.",
    View: H2,
  },
  {
    id: "H3",
    title: "채점이 남은 시험 띠 (Claude 추천)",
    body: "표 위에 채점이 남은 시험을 모은 띠 — 채점하러 온 날 바로 들어간다. 줄에는 «2개 반에 냄» 딱지와 글자 단추.",
    View: H3,
  },
  {
    id: "H4",
    title: "반마다 카드",
    body: "줄을 펼치면 반마다 카드(채점 진행 막대 · 결시 · 채점하기). 단추는 아이콘.",
    View: H4,
  },
] as const;

export function PublishHifi() {
  const [dialog, setDialog] = useState<DialogState>("idle");
  return (
    <div className={h.root}>
      <header className={h.heading}>
        <p className={h.kicker}>월말평가 M1 · 반에 내기 · Wire B</p>
        <h1>내 시험지에서 반에 내기 · Hi-fi 4안</h1>
        <p>
          바탕은 지금의 «내 시험지» 표와 작업실 창입니다. 안끼리 다른 것은 낸
          기록이 보이는 자리와 «반에 내기» 단추의 모양이고, 창의 속과 문구는 네
          안이 같습니다. 아무것도 저장하지 않습니다.
        </p>
        <nav className={h.nav} aria-label="시안 이동">
          <a href="#dialog">공통 창</a>
          {OPTIONS.map((o) => (
            <a key={o.id} href={`#${o.id}`}>
              {o.id} {o.title}
            </a>
          ))}
          <a href="/dev/exam-publish-wire#b">Wire B 보기</a>
        </nav>
      </header>

      <section id="dialog" className={h.option}>
        <header className={h.optionHead}>
          <div>
            <h2>공통 · 반에 내기 창</h2>
            <p>작업실의 확인 창과 같은 틀입니다. 네 안이 같은 창을 씁니다.</p>
          </div>
          <label className={h.statePicker}>
            상태 표본
            <select
              value={dialog}
              onChange={(e) => setDialog(e.target.value as DialogState)}
            >
              {DIALOG_STATES.map((st) => (
                <option key={st.key} value={st.key}>
                  {st.label}
                </option>
              ))}
            </select>
          </label>
        </header>
        <PublishDialog state={dialog} />
      </section>

      {OPTIONS.map(({ id, title, body, View }) => (
        <section key={id} id={id} className={h.option}>
          <header className={h.optionHead}>
            <div>
              <h2>
                {id} · {title}
              </h2>
              <p>{body}</p>
            </div>
          </header>
          <View />
        </section>
      ))}
    </div>
  );
}
