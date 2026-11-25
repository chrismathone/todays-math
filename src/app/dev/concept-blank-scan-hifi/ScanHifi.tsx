"use client";

import { useEffect, useRef, useState } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import { PaperText } from "@/components/concept-blank/paper/PaperParts";
import type { WireSample } from "../concept-blank-scan-wire/samples";
import { readingFields } from "../concept-blank-scan-wire/ReadAnswers";
import {
  HIFI_OPTIONS,
  HIFI_SCREENS,
  type HifiId,
  type HifiScreen,
} from "./options";
import { hifiPaperPages, HifiPaperStrip } from "./HifiPaper";
import s from "./scanHifi.module.css";

type Box = { x: number; y: number; width: number; height: number };
type Correction = { text: string; kind: "text" | "blank" | "review" };

function Photo({
  sample,
  page,
  marked = false,
}: {
  sample: WireSample;
  page: number;
  marked?: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(0.35);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [zoom, setZoom] = useState<number | null>(null);
  const fields = readingFields(sample);
  const start = fields.slice(0, page).flat().length;
  useEffect(() => {
    const root = frame.current,
      content = paper.current;
    if (!root || !content) return;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      setScale(root.clientWidth / ((210 * 96) / 25.4));
      const r = content
        .querySelector("[data-print-page]")
        ?.getBoundingClientRect();
      if (!r?.width) return;
      setBoxes(
        Array.from(
          content.querySelectorAll('[data-cb-item="term"] [data-cb-ruled]'),
        )
          .slice(0, 2)
          .map((el) => {
            const b = el.getBoundingClientRect();
            return {
              x: ((b.x - r.x) / r.width) * 100,
              y: ((b.y - r.y) / r.height) * 100,
              width: (b.width / r.width) * 100,
              height: (b.height / r.height) * 100,
            };
          }),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    void document.fonts.ready.then(measure);
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [page, sample]);
  return (
    <>
      <div className={marked ? s.photoWithNumbers : undefined}>
        <div className={s.photo} ref={frame}>
          <div
            ref={paper}
            className={s.photoPaper}
            style={{ transform: `scale(${scale})` }}
          >
            {hifiPaperPages(sample)[page]}
          </div>
          {marked &&
            boxes.map((box, i) => (
              <div
                className={s.answerOutline}
                key={i}
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                }}
              >
                <button
                  type="button"
                  ref={zoom === i ? opener : undefined}
                  aria-label={`확인 번호 ${start + i + 1} 확대`}
                  onClick={(e) => {
                    opener.current = e.currentTarget;
                    setZoom(i);
                  }}
                >
                  {start + i + 1}
                </button>
              </div>
            ))}
        </div>
      </div>
      {zoom !== null && (
        <PickerDialog
          title={`확인 번호 ${start + zoom + 1} · ${page + 1}쪽 문 ${fields[page][zoom].question}`}
          onClose={() => setZoom(null)}
          returnFocus={opener}
        >
          <div className={s.zoomPaper}>{hifiPaperPages(sample)[page]}</div>
          <button
            type="button"
            onClick={() => {
              const id = fields[page][zoom].id;
              setZoom(null);
              requestAnimationFrame(() =>
                document.getElementById(`hifi-${id}`)?.focus(),
              );
            }}
          >
            같은 번호에 입력하기
          </button>
        </PickerDialog>
      )}
    </>
  );
}

export function ScanHifi({
  samples,
  initialOption = "H1",
  initialScreen = "capture",
}: {
  samples: WireSample[];
  initialOption?: HifiId;
  initialScreen?: HifiScreen;
}) {
  const [option, setOption] = useState(initialOption);
  const [screen, setScreen] = useState<HifiScreen>(initialScreen);
  const [sampleIndex, setSampleIndex] = useState(1);
  const [page, setPage] = useState(0);
  const [captured, setCaptured] = useState([0]);
  const [teacher, setTeacher] = useState(false);
  const [student, setStudent] = useState("학생 가");
  const [picker, setPicker] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [aligned, setAligned] = useState(true);
  const [corrections, setCorrections] = useState<Record<string, Correction>>(
    {},
  );
  const [onlyReview, setOnlyReview] = useState(false);
  const [edited, setEdited] = useState<
    Record<string, { label: string; reason: string }>
  >({});
  const pickerButton = useRef<HTMLButtonElement>(null);
  const sample = samples[1],
    paperSample = samples[sampleIndex];
  const fields = readingFields(sample),
    allFields = fields.flat();
  const chosen = HIFI_OPTIONS.find((item) => item.id === option)!;
  const labels = ["○", "△", "×", "확인 필요"];
  const reasons = [
    "요구한 뜻을 모두 담았습니다.",
    "뜻의 일부를 더 설명해 주세요.",
    "질문에서 요구한 뜻을 확인할 수 없습니다.",
    "사진에 쓴 답을 확인해야 합니다.",
  ];
  const update = (id: string, value: Correction) =>
    setCorrections((old) => ({ ...old, [id]: value }));
  return (
    <main className={s.app} data-hifi={option}>
      <header className={s.reviewHead}>
        <div>
          <p>개념 백지 · 사진 채점</p>
          <h1>Hi-fi 비교</h1>
        </div>
        <span>구조 합의 후 시각안 · 저장하지 않음</span>
      </header>
      <nav className={s.options} aria-label="Hi-fi 선택">
        {HIFI_OPTIONS.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={option === item.id}
            onClick={() => setOption(item.id)}
          >
            {item.id} · {item.name}
          </button>
        ))}
      </nav>
      <aside className={s.choiceNote}>
        <b>{chosen.name}</b>
        <p>{chosen.difference}</p>
        <p>약점: {chosen.weakness}</p>
      </aside>
      <nav className={s.options} aria-label="비교 화면">
        {HIFI_SCREENS.map(([id, name]) => (
          <button
            type="button"
            key={id}
            aria-pressed={screen === id}
            onClick={() => setScreen(id)}
          >
            {name}
          </button>
        ))}
      </nav>
      <p className={s.meta}>
        실제 초5 은행 지면. 사진은 미작성 지면 대용이며 판독·판정은 상태
        예시입니다. 실제 AI·학생 기록을 사용하지 않습니다.
      </p>
      {screen === "paper" ? (
        <section className={s.paperSection}>
          <h2>P1 · 머리 옆 QR와 모서리 표식</h2>
          <label>
            고르기 표본
            <select
              value={sampleIndex}
              onChange={(e) => setSampleIndex(Number(e.target.value))}
            >
              {samples.map((item, i) => (
                <option key={item.id} value={i}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <HifiPaperStrip sample={paperSample} />
          <HifiPaperStrip sample={paperSample} part="key" />
          <p className={s.meta}>
            QR 20mm · 표식은 본문 밖. 코드와 쪽 나눔 유지. 크기와 인식은 최종
            인쇄 검증에서 확인합니다.
          </p>
        </section>
      ) : (
        <section
          className={`${s.surface} ${screen === "teacher" ? s.teacherSurface : s.phoneSurface}`}
        >
          <header className={s.screenHead}>
            <span>개념 백지</span>
            <h2>{HIFI_SCREENS.find(([id]) => id === screen)?.[1]}</h2>
            <p>{sample.selection.title}</p>
          </header>
          <div className={s.body}>
            {screen === "capture" && (
              <>
                <label className={s.previewControl}>
                  <input
                    type="checkbox"
                    checked={teacher}
                    onChange={(e) => setTeacher(e.target.checked)}
                  />
                  교사 대리 촬영 시안
                </label>
                <div className={s.owner}>
                  <div>
                    <b>{teacher ? student : "내 답안"}</b>
                    <p>
                      {teacher
                        ? "가상 명단 · 첫 촬영 전에 확인"
                        : "로그인한 학생의 답안으로 제출합니다."}
                    </p>
                  </div>
                  {teacher && (
                    <button
                      type="button"
                      ref={pickerButton}
                      onClick={() => setPicker(true)}
                    >
                      학생 고르기
                    </button>
                  )}
                </div>
                <div className={s.notice}>
                  채점 전에 찍어 주세요. 모서리와 QR까지 한 쪽 전체가 나오게
                  찍습니다.
                </div>
                <h3>
                  {fields.findIndex((_, i) => !captured.includes(i)) === -1
                    ? fields.length
                    : fields.findIndex((_, i) => !captured.includes(i)) +
                      1}{" "}
                  / {fields.length}쪽 촬영
                </h3>
                <div className={s.camera}>
                  <Photo
                    sample={sample}
                    page={
                      fields.findIndex((_, i) => !captured.includes(i)) === -1
                        ? fields.length - 1
                        : fields.findIndex((_, i) => !captured.includes(i))
                    }
                  />
                  <span>한 쪽 전체가 틀 안에 오도록 맞춰 주세요.</span>
                </div>
                <button
                  type="button"
                  className={s.primary}
                  onClick={() =>
                    setCaptured((old) =>
                      old.length < fields.length
                        ? [
                            ...old,
                            fields.findIndex((_, i) => !old.includes(i)),
                          ].sort((a, b) => a - b)
                        : old,
                    )
                  }
                >
                  사진 찍기 · 시연
                </button>
                <HifiPaperStrip sample={sample} captured={captured} />
                <details>
                  <summary>
                    찍은 쪽 확인 · {captured.length}/{fields.length}쪽
                  </summary>
                  {captured.map((i) => (
                    <div className={s.owner} key={i}>
                      <span>{i + 1}쪽 · 촬영됨</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCaptured((old) => old.filter((n) => n !== i))
                        }
                      >
                        다시 찍기
                      </button>
                    </div>
                  ))}
                </details>
                {captured.length < fields.length && (
                  <p role="status">
                    아직 찍지 않은 쪽:{" "}
                    {fields
                      .map((_, i) => i)
                      .filter((i) => !captured.includes(i))
                      .map((i) => `${i + 1}쪽`)
                      .join(", ")}
                  </p>
                )}
                <p className={s.meta}>
                  사진과 답은 글 읽기와 채점을 위해 외부 AI 서비스 Claude로
                  전송됩니다.
                </p>
                <button
                  type="button"
                  className={s.primary}
                  disabled={captured.length !== fields.length}
                  onClick={() => setScreen("check")}
                >
                  읽은 답 확인하기
                </button>
              </>
            )}
            {screen === "check" && (
              <>
                <p>
                  사진에 쓴 답과 같은지 확인해 주세요. 결과를 공개하기 전까지만
                  고칠 수 있습니다.
                </p>
                <div className={s.inline}>
                  <label>
                    확인할 쪽
                    <select
                      value={page}
                      onChange={(e) => setPage(Number(e.target.value))}
                    >
                      {fields.map((_, i) => (
                        <option value={i} key={i}>
                          {i + 1}쪽
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={aligned}
                      onChange={(e) => setAligned(e.target.checked)}
                    />
                    사진 맞춤 성공 시안
                  </label>
                </div>
                <Photo sample={sample} page={page} marked={aligned} />
                {!aligned && (
                  <p className={s.notice}>
                    사진의 위치를 맞추지 못했습니다. 번호 표시 없이 쪽과 문항을
                    확인하거나 다시 찍어 주세요.
                  </p>
                )}
                <label className={s.filter}>
                  <input
                    type="checkbox"
                    checked={showAll}
                    onChange={(e) => setShowAll(e.target.checked)}
                  />
                  전체 판독문 보기
                </label>
                {fields[page]
                  .filter((_, i) => showAll || i === 0)
                  .map((field) => {
                    const value = corrections[field.id],
                      number =
                        allFields.findIndex((item) => item.id === field.id) + 1;
                    return (
                      <section key={field.id} className={s.answerRow}>
                        <h3>
                          <span className={s.number}>{number}</span>확인 번호{" "}
                          {number} · {page + 1}쪽 문 {field.question}
                        </h3>
                        <PaperText text={field.prompt} />
                        <label>
                          사진에 쓴 답
                          <textarea
                            id={`hifi-${field.id}`}
                            rows={3}
                            value={value?.text ?? ""}
                            onChange={(e) =>
                              update(field.id, {
                                text: e.target.value,
                                kind: "text",
                              })
                            }
                          />
                        </label>
                        <div className={s.inputTools}>
                          {["분수 1/2", "각도 °", "좌표 ( , )"].map(
                            (label, i) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() =>
                                  update(field.id, {
                                    kind: "text",
                                    text: `${value?.text ?? ""}${["1/2", "°", "( , )"][i]}`,
                                  })
                                }
                              >
                                {label}
                              </button>
                            ),
                          )}
                        </div>
                        <div className={s.inputTools}>
                          <button
                            type="button"
                            aria-pressed={value?.kind === "blank"}
                            onClick={() =>
                              update(field.id, { text: "", kind: "blank" })
                            }
                          >
                            종이에도 비워 뒀어요
                          </button>
                          <button
                            type="button"
                            aria-pressed={value?.kind === "review"}
                            onClick={() =>
                              update(field.id, { text: "", kind: "review" })
                            }
                          >
                            지금 확인하기 어려워요
                          </button>
                        </div>
                        {value && (
                          <p className={s.meta}>
                            {value.kind === "review"
                              ? "확인 필요로 남깁니다."
                              : value.kind === "blank"
                                ? "직접 입력 · 빈 답으로 확인"
                                : "직접 입력"}
                          </p>
                        )}
                      </section>
                    );
                  })}
                <p className={s.meta}>
                  확인하기 어려운 칸은 남겨 두고 나머지 결과를 볼 수 있습니다.
                </p>
                <button
                  type="button"
                  className={s.primary}
                  onClick={() => setScreen("student")}
                >
                  답 확인을 마치고 채점하기
                </button>
              </>
            )}
            {(screen === "student" || screen === "teacher") && (
              <>
                <div className={s.resultTop}>
                  <b>
                    {screen === "teacher"
                      ? `${student} · 판정 대조`
                      : "답안별 결과"}
                  </b>
                  <span>결과 공개됨</span>
                </div>
                <p className={s.meta}>
                  문항별 상태 예시 · 종합 점수 없음. 학생 입력은 공개 전에
                  마감됐습니다.
                </p>
                <label className={s.filter}>
                  <input
                    type="checkbox"
                    checked={onlyReview}
                    onChange={(e) => setOnlyReview(e.target.checked)}
                  />
                  확인 필요만 보기
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setOnlyReview(false);
                    requestAnimationFrame(() =>
                      document
                        .querySelector('[data-hifi-review="true"]')
                        ?.scrollIntoView({
                          block: "center",
                          behavior: "instant",
                        }),
                    );
                  }}
                >
                  첫 확인 필요로 가기
                </button>
                <div
                  className={screen === "teacher" ? s.comparison : undefined}
                >
                  {screen === "teacher" && (
                    <aside className={s.original}>
                      <h3>원본 답안</h3>
                      <label>
                        쪽
                        <select
                          value={page}
                          onChange={(e) => setPage(Number(e.target.value))}
                        >
                          {fields.map((_, i) => (
                            <option key={i} value={i}>
                              {i + 1}쪽
                            </option>
                          ))}
                        </select>
                      </label>
                      <Photo sample={sample} page={page} marked={aligned} />
                    </aside>
                  )}
                  <div>
                    {(screen === "teacher" ? fields[page] : allFields).map(
                      (field) => {
                        const i = allFields.findIndex(
                          (item) => item.id === field.id,
                        );
                        const label = edited[field.id]?.label ?? labels[i % 4];
                        if (onlyReview && label !== "확인 필요") return null;
                        return (
                          <section
                            className={s.answerRow}
                            key={field.id}
                            data-hifi-review={label === "확인 필요"}
                          >
                            <div className={s.verdictHead}>
                              <b>
                                {field.page + 1}쪽 · 문 {field.question}
                              </b>
                              <span className={s.verdict} data-verdict={label}>
                                {label}
                              </span>
                            </div>
                            <PaperText text={field.prompt} />
                            <p>{edited[field.id]?.reason ?? reasons[i % 4]}</p>
                            {screen === "student" ? (
                              <details>
                                <summary>내 답안 보기</summary>
                                <p>
                                  {corrections[field.id]?.text ||
                                    "이 시안에는 학생의 실제 답이 없습니다."}
                                </p>
                                <Photo sample={sample} page={field.page} />
                              </details>
                            ) : (
                              <>
                                <dl className={s.evidence}>
                                  <dt>처음 읽은 글</dt>
                                  <dd>못 읽음 · 상태 시연</dd>
                                  <dt>직접 입력</dt>
                                  <dd>
                                    {corrections[field.id]?.text || "없음"}
                                  </dd>
                                  <dt>자동 판정</dt>
                                  <dd>
                                    {labels[i % 4]} · {reasons[i % 4]}
                                  </dd>
                                </dl>
                                <label>
                                  교사 판정
                                  <select
                                    aria-label={`문 ${field.question} 교사 판정`}
                                    value={label}
                                    onChange={(e) =>
                                      setEdited((old) => ({
                                        ...old,
                                        [field.id]: {
                                          label: e.target.value,
                                          reason: old[field.id]?.reason ?? "",
                                        },
                                      }))
                                    }
                                  >
                                    {labels.map((mark) => (
                                      <option key={mark}>{mark}</option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  수정 까닭
                                  <textarea
                                    value={edited[field.id]?.reason ?? ""}
                                    onChange={(e) =>
                                      setEdited((old) => ({
                                        ...old,
                                        [field.id]: {
                                          label,
                                          reason: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  disabled={!edited[field.id]?.reason.trim()}
                                  onClick={() =>
                                    setEdited((old) => ({
                                      ...old,
                                      [field.id]: {
                                        ...old[field.id],
                                        reason: old[field.id].reason.trim(),
                                      },
                                    }))
                                  }
                                >
                                  교사 수정 반영 · 시연
                                </button>
                              </>
                            )}
                          </section>
                        );
                      },
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}
      {picker && (
        <PickerDialog
          title="답안 주인 고르기"
          returnFocus={pickerButton}
          onClose={() => setPicker(false)}
          size="fit"
        >
          <div className={s.pickerBody}>
            {["학생 가", "학생 나", "학생 다"].map((name) => (
              <button
                type="button"
                key={name}
                onClick={() => {
                  setStudent(name);
                  setCaptured([]);
                  setPicker(false);
                }}
              >
                {name} · 가상 학생
              </button>
            ))}
          </div>
        </PickerDialog>
      )}
    </main>
  );
}
