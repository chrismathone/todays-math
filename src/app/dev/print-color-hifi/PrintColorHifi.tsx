"use client";

import { useEffect, useRef, useState } from "react";
import { TEMPLATES } from "@/components/unified/print/settings";
import { A4_DIM } from "@/components/unified/print/tokens";
import { readablePaperColor } from "@/components/unified/print/readableColor";
import type { PrintTemplate } from "@/components/unified/print/types";
import { ColorPaper } from "./ColorPaper";
import {
  COLOR_CASES,
  CURRENT_FIELDS,
  displayValue,
  FIELDS,
  fieldLabels,
  INITIAL_META,
  OMIT_REASON,
  PLACEMENT,
  PROPOSED_FIELDS,
  VARIANTS,
  type VariantId,
} from "./fixtures";
import s from "./PrintColorHifi.module.css";

function Preview({
  template,
  variant,
  color,
  meta,
  gray = false,
  showDate,
  examType,
}: Parameters<typeof ColorPaper>[0] & { gray?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(240);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div className={s.previewWindow} ref={host} data-gray={gray || undefined}>
      <div
        className={s.paperScale}
        style={{ transform: `scale(${width / A4_DIM.width})` }}
      >
        <ColorPaper
          template={template}
          variant={variant}
          color={color}
          meta={meta}
          showDate={showDate}
          examType={examType}
        />
      </div>
    </div>
  );
}

export function PrintColorHifi() {
  const [template, setTemplate] = useState<PrintTemplate>("yuhyung");
  const [variant, setVariant] = useState<VariantId>("C1");
  const [color, setColor] = useState<string>(COLOR_CASES[0].value);
  const [gray, setGray] = useState(false);
  const [meta, setMeta] = useState({ ...INITIAL_META });
  const [panel, setPanel] = useState<"disable" | "hide">("disable");
  const [showDate, setShowDate] = useState(true);
  const [examType, setExamType] = useState("일일TEST");
  const detail = useRef<HTMLElement>(null);
  const proposed = PROPOSED_FIELDS[template];
  const selectedTemplate = TEMPLATES.find(({ value }) => value === template)!;
  const selectedVariant = VARIANTS.find(({ id }) => id === variant)!;
  const omitted = FIELDS.map(([key]) => key).filter(
    (key) => !proposed.includes(key),
  );
  return (
    <main className={s.root}>
      <div className={s.content}>
        <header className={s.heading}>
          <p className={s.kicker}>시험지 양식 · 비교 시안</p>
          <h1>정보 구성과 지면 색상</h1>
          <p>
            C1~C4는 제안 구성, C5는 이전 양식입니다. 문항 4개는 모두 같습니다.
            시안의 입력은 이 화면에서만 유지됩니다.
          </p>
          <nav className={s.jumpLinks} aria-label="시안 영역">
            <a href="#field-map">정보 구성표</a>
            <a href="#panel-preview">입력 패널 2안</a>
            <a href="#color-comparison">색상 5안 비교</a>
          </nav>
        </header>
        <section
          className={s.composition}
          id="field-map"
          aria-labelledby="map-title"
        >
          <h2 id="map-title">템플릿별 정보 구성</h2>
          <p>
            이전에는 여섯 양식 모두 기본 정보 9개를 실었습니다. 제안에서는 양식
            성격에 따라 항목을 덜어 내고, 워크북에 유형·전략 자리를 둡니다.
          </p>
          <div
            className={s.tableScroll}
            role="region"
            aria-label="이전과 제안 정보 구성표"
            tabIndex={0}
          >
            <table className={s.compositionTable}>
              <thead>
                <tr>
                  <th>양식</th>
                  <th>이전 실제 구성</th>
                  <th>C1~C4 제안 구성</th>
                  <th>제안 배치</th>
                </tr>
              </thead>
              <tbody>
                {TEMPLATES.map(({ value, label }) => (
                  <tr key={value} data-active={template === value || undefined}>
                    <th scope="row">{label}</th>
                    <td>{fieldLabels(CURRENT_FIELDS[value])}</td>
                    <td>시험 종류 · {fieldLabels(PROPOSED_FIELDS[value])}</td>
                    <td>{PLACEMENT[value]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={s.small}>
            이전 시험 종류는 관리용 태그였습니다. 새 시안 C1~C4는 모든 양식에
            시험 종류를 표시하며 «없음»이면 생략합니다. 시험일은 날짜 표시가
            켜진 경우에만 출력됩니다. 미입력 항목의 기본값·대체값은 감사
            보고서에 기록했습니다.
          </p>
        </section>
        <section className={s.controls} aria-labelledby="template-title">
          <h2 id="template-title">양식 선택</h2>
          <div className={s.buttons} role="group" aria-label="비교할 템플릿">
            {TEMPLATES.map(({ value, label, hint }) => (
              <button
                type="button"
                key={value}
                aria-label={`${label} · ${hint}`}
                aria-pressed={template === value}
                onClick={() => setTemplate(value)}
              >
                {label}
                <small>{hint}</small>
              </button>
            ))}
          </div>
        </section>
        <div className={s.editorAndSheet}>
          <section
            className={s.panel}
            id="panel-preview"
            aria-labelledby="panel-title"
          >
            <h2 id="panel-title">입력 패널 2안</h2>
            <div className={s.buttons} role="group" aria-label="입력 패널 방식">
              <button
                type="button"
                aria-pressed={panel === "disable"}
                onClick={() => setPanel("disable")}
              >
                P1 · 미사용 칸 비활성
              </button>
              <button
                type="button"
                aria-pressed={panel === "hide"}
                onClick={() => setPanel("hide")}
              >
                P2 · 쓰는 칸만 표시
              </button>
            </div>
            <p>
              {selectedTemplate.label} · C1~C4 제안 기준. 양식을 바꿔도 입력값은
              유지됩니다.
            </p>
            <label className={s.inputField}>
              시험 종류
              <select
                aria-label="시험 종류"
                value={examType}
                onChange={(event) => setExamType(event.target.value)}
              >
                {[
                  "없음",
                  "일일TEST",
                  "주간TEST",
                  "단원TEST",
                  "숙제",
                  "복습",
                  "오답",
                  "입학TEST",
                  "내신대비",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <small>모든 제안 양식에 표시합니다. «없음»이면 생략합니다.</small>
            </label>
            <div className={s.inputs}>
              {FIELDS.filter(
                ([key]) => panel === "disable" || proposed.includes(key),
              ).map(([key, label]) => {
                const prints = proposed.includes(key);
                const helpId = `field-help-${key}`;
                return (
                  <label
                    key={key}
                    className={s.inputField}
                    data-omitted={!prints || undefined}
                  >
                    <span>
                      {label}
                      {!prints && (
                        <small id={helpId}>
                          이 양식에는 찍히지 않음 · {OMIT_REASON[template]}
                        </small>
                      )}
                    </span>
                    {key === "conceptNote" ||
                    key === "patternStrategy" ||
                    key === "todayGoal" ? (
                      <textarea
                        disabled={!prints}
                        rows={3}
                        value={String(meta[key] ?? "")}
                        aria-describedby={!prints ? helpId : undefined}
                        onChange={(event) =>
                          setMeta({ ...meta, [key]: event.target.value })
                        }
                      />
                    ) : (
                      <input
                        disabled={!prints}
                        type={
                          key === "totalScore"
                            ? "number"
                            : key === "examDate"
                              ? "date"
                              : "text"
                        }
                        min={key === "totalScore" ? 0 : undefined}
                        value={meta[key] ?? ""}
                        aria-describedby={!prints ? helpId : undefined}
                        onChange={(event) =>
                          setMeta({
                            ...meta,
                            [key]:
                              key === "totalScore"
                                ? event.target.value === ""
                                  ? undefined
                                  : Number(event.target.value)
                                : event.target.value,
                          })
                        }
                      />
                    )}
                  </label>
                );
              })}
            </div>
            {panel === "hide" && (
              <p className={s.omittedList}>
                이 양식에서 생략: {fieldLabels(omitted)}
              </p>
            )}
            <label className={s.checkbox}>
              <input
                type="checkbox"
                checked={showDate}
                disabled={!proposed.includes("examDate")}
                onChange={(event) => setShowDate(event.target.checked)}
              />
              날짜 표시
              {!proposed.includes("examDate") && (
                <small>현재 양식의 제안 구성에서는 생략</small>
              )}
            </label>
            <p className={s.small}>
              C5는 이전 제품 구성을 사용하므로 이 패널의 미출력 표시와 다를 수
              있습니다.
            </p>
          </section>
          <section
            className={s.detail}
            ref={detail}
            aria-labelledby="detail-title"
          >
            <h2 id="detail-title">
              {selectedTemplate.label} · {selectedVariant.id}{" "}
              {selectedVariant.name}
            </h2>
            <div className={s.buttons} role="group" aria-label="크게 볼 색상안">
              {VARIANTS.map(({ id }) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={id === variant}
                  onClick={() => setVariant(id)}
                >
                  {id}
                </button>
              ))}
            </div>
            <div className={s.detailOptions}>
              <label className={s.selectLabel}>
                강조 색상
                <select
                  aria-label="강조 색상"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                >
                  {COLOR_CASES.map((item) => (
                    <option value={item.value} key={item.value}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.checkbox}>
                <input
                  type="checkbox"
                  checked={gray}
                  onChange={(event) => setGray(event.target.checked)}
                />
                회색조로 보기
              </label>
            </div>
            <p>{selectedVariant.detail}</p>
            <p className={s.small}>
              A4 210 × 297mm · 화면 폭에 맞춰 축소 ·{" "}
              {variant === "C5" ? "이전 정보 구성" : "제안 정보 구성"}
            </p>
            <Preview
              template={template}
              variant={variant}
              color={color}
              meta={meta}
              gray={gray}
              showDate={showDate}
              examType={examType}
            />
            <div className={s.contrast} aria-label="정보 글자 대비 예시">
              <span className={s.colorSwatch} style={{ background: color }} />
              선택색 {color}
              <span style={{ color: readablePaperColor(color) }}>
                정보 글자 {readablePaperColor(color)}
              </span>
            </div>
            <p className={s.small}>
              흰 종이·옅은 면 위 정보 글자는 readableColor 규칙을 따릅니다.
              회색조는 화면 변환 예시이며 실물 프린터 검수는 대기입니다.
            </p>
          </section>
        </div>
        <section
          id="color-comparison"
          className={s.comparisons}
          aria-labelledby="comparison-title"
        >
          <h2 id="comparison-title">
            {selectedTemplate.label} · 색상 5안 비교
          </h2>
          <p>
            각 안의 남색·사이언·주황과 현재 선택색의 회색조 한 장을 비교합니다.
            지면 아래 단추로 크게 볼 수 있습니다.
          </p>
          {VARIANTS.map((item) => (
            <section
              key={item.id}
              className={s.variantRow}
              aria-labelledby={`variant-${item.id}`}
            >
              <h3 id={`variant-${item.id}`}>
                {item.id} · {item.name}
              </h3>
              <p>{item.detail}</p>
              <div className={s.comparisonGrid}>
                {[
                  ...COLOR_CASES.map((sample) => ({ ...sample, gray: false })),
                  {
                    name: `회색조 · ${COLOR_CASES.find((sample) => sample.value === color)?.name}`,
                    value: color,
                    gray: true,
                  },
                ].map((sample) => (
                  <figure
                    key={`${sample.value}-${sample.gray}`}
                    className={s.sample}
                  >
                    <figcaption>
                      {sample.name} ·{" "}
                      {item.id === "C5" ? "이전 구성" : "제안 구성"}
                    </figcaption>
                    <Preview
                      template={template}
                      variant={item.id}
                      color={sample.value}
                      meta={meta}
                      gray={sample.gray}
                      showDate={showDate}
                      examType={examType}
                    />
                    <button
                      type="button"
                      aria-label={`${item.id} ${sample.name} 지면 크게 보기`}
                      onClick={() => {
                        setVariant(item.id);
                        setColor(sample.value);
                        setGray(sample.gray);
                        detail.current?.scrollIntoView({
                          block: "start",
                          behavior: "instant",
                        });
                      }}
                    >
                      지면 크게 보기
                    </button>
                  </figure>
                ))}
              </div>
            </section>
          ))}
        </section>
        <p className={s.finalNote}>
          자체 작성 예시 문항·기관명입니다. 확정 C2·P1은 제품에 적용했습니다.
          이 비교 화면의 입력은 저장하지 않습니다.
        </p>
        <span className={s.srOnly}>
          예시 제목: {displayValue(meta, "title")}
        </span>
      </div>
    </main>
  );
}
