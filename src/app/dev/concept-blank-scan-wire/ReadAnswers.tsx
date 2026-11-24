"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import { PaperText } from "@/components/concept-blank/paper/PaperParts";
import { planSheet } from "@/components/concept-blank/paper/paginate";
import { termPrompt } from "@/lib/concept-blank/questions";
import { PAPER_OPTIONS, type ReadOption } from "./options";
import type { WireSample } from "./samples";
import { wirePaperPages } from "./WirePaper";
import s from "./scanWire.module.css";

export type ManualAnswers = Record<string, string>;
type Box = { x: number; y: number; width: number; height: number };
const circled = (n: number) => String.fromCharCode(0x2460 + n - 1);

/** 실제 쪽 나눔의 앞 두 서술 답 칸만 '못 읽음' 상태로 시연한다. AI 판독 결과가 아니다. */
export function readingFields(sample: WireSample) {
  return sample.sheets
    .flatMap((sheet) => planSheet(sheet).student)
    .map((page, pageIndex) =>
      page.form === "term"
        ? page.blocks
            .filter((block) => block.kind === "term")
            .slice(0, 2)
            .map((block, i) => ({
              id: `${sample.code}:${pageIndex}:${block.entry.id}`,
              page: pageIndex,
              index: i,
              question: block.n,
              prompt: termPrompt(block.entry),
            }))
        : [],
    );
}

/** 사진 대용으로 같은 지면을 표시한다. 좌표는 제품이 그린 문항의 답 칸에서 잰다. */
export function MarkedPhoto({
  sample,
  page,
  option,
  empty = false,
  onField,
}: {
  sample: WireSample;
  page: number;
  option: ReadOption;
  empty?: boolean;
  onField?: (index: number) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(0.4);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const fields = readingFields(sample);
  const start = option.continuous
    ? fields.slice(0, page).reduce((sum, rows) => sum + rows.length, 0)
    : 0;
  useEffect(() => {
    const outer = frame.current;
    const inner = paper.current;
    if (!outer || !inner) return;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      setScale(outer.clientWidth / ((210 * 96) / 25.4));
      const root = inner
        .querySelector("[data-print-page]")
        ?.getBoundingClientRect();
      if (!root?.width) return;
      const next = [
        ...inner.querySelectorAll('[data-cb-item="term"] [data-cb-ruled]'),
      ]
        .slice(0, 2)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            x: ((rect.x - root.x) / root.width) * 100,
            y: ((rect.y - root.y) / root.height) * 100,
            width: (rect.width / root.width) * 100,
            height: (rect.height / root.height) * 100,
          };
        });
      setBoxes((old) =>
        JSON.stringify(old) === JSON.stringify(next) ? old : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    void document.fonts.ready.then(measure);
    measure();
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [sample, page, option.id]);
  const node = wirePaperPages(sample, PAPER_OPTIONS[0])[page];
  const box = expanded === null ? undefined : boxes[expanded];
  return (
    <>
      <div
        className={s.photoFrame}
        ref={frame}
        data-mark-style={option.mark}
        data-badge-place={option.badge}
      >
        <div
          ref={paper}
          className={s.photoPaper}
          style={{ ["--cb-paper-scale" as string]: scale }}
        >
          {node}
        </div>
        {!empty
          ? boxes.map((b, i) => (
              <div
                key={i}
                className={s.answerMark}
                data-answer-mark={i}
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: `${b.width}%`,
                  height: `${b.height}%`,
                }}
              >
                <button
                  type="button"
                  aria-label={`${page + 1}쪽 ${circled(start + i + 1)} 답 칸${option.zoom ? " 확대" : " 입력으로 이동"}`}
                  onClick={(e) => {
                    opener.current = e.currentTarget;
                    if (option.zoom) setExpanded(i);
                    else onField?.(i);
                  }}
                >
                  {circled(start + i + 1)}
                </button>
              </div>
            ))
          : null}
      </div>
      <p className={s.meta}>
        사진 대용: 같은 쪽 나눔의 미작성 지면. 표시는 글자 획이 아닌 문항의 답
        칸입니다.
      </p>
      {box && expanded !== null ? (
        <PickerDialog
          title={`${page + 1}쪽 ${circled(start + expanded + 1)} · 답 칸 확대`}
          returnFocus={opener}
          onClose={() => setExpanded(null)}
          size="fit"
        >
          <div className={s.pickerBody}>
            <p>사진의 해당 답 칸 · 정지 지면으로 위치만 시연</p>
            <div
              className={s.cropScroll}
              tabIndex={0}
              role="region"
              aria-label="답 칸 원본 확대"
            >
              <div
                className={s.crop}
                style={{
                  width: `${(box.width * 794) / 100}px`,
                  height: `${(box.height * 1123) / 100}px`,
                }}
              >
                <div
                  className={s.cropPage}
                  style={{
                    left: `${(-box.x * 794) / 100}px`,
                    top: `${(-box.y * 1123) / 100}px`,
                    ["--cb-paper-scale" as string]: 1,
                  }}
                >
                  {node}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setExpanded(null);
                requestAnimationFrame(() => onField?.(expanded));
              }}
            >
              이 번호 입력 칸으로
            </button>
          </div>
        </PickerDialog>
      ) : null}
    </>
  );
}

function AnswerInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState("text");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const format = (a: string, b: string) =>
    mode === "fraction"
      ? `${a}/${b}`
      : mode === "coordinate"
        ? `(${a}, ${b})`
        : `${a}°`;
  return (
    <div className={s.answerInput}>
      <label>
        입력 방법
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setFirst("");
            setSecond("");
          }}
        >
          <option value="text">글 · 수식 그대로</option>
          <option value="fraction">분수 · 분자 / 분모</option>
          <option value="degree">각도 · 도(°)</option>
          <option value="coordinate">좌표 · (x, y)</option>
        </select>
      </label>
      {mode !== "text" ? (
        <div className={s.mathInput}>
          <label>
            {mode === "fraction"
              ? "분자"
              : mode === "coordinate"
                ? "x"
                : "각도"}
            <input
              inputMode="decimal"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            />
          </label>
          {mode !== "degree" ? (
            <label>
              {mode === "fraction" ? "분모" : "y"}
              <input
                inputMode="decimal"
                value={second}
                onChange={(e) => setSecond(e.target.value)}
              />
            </label>
          ) : (
            <span>°</span>
          )}
          <button
            type="button"
            disabled={!first.trim() || (mode !== "degree" && !second.trim())}
            onClick={() =>
              onChange([value, format(first, second)].filter(Boolean).join(" "))
            }
          >
            답에 넣기
          </button>
        </div>
      ) : null}
      <label htmlFor={id}>
        내가 쓴 답
        <textarea
          aria-label="내가 쓴 답"
          id={id}
          value={value}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          placeholder="사진에 쓴 답을 글로 옮겨 주세요"
        />
      </label>
      <p className={s.meta}>
        분수는 1/2, 각도는 60°, 좌표는 (2, 3)처럼 입력할 수 있습니다. 입력 꼴
        예시이며 이 문항의 정답이 아닙니다.
      </p>
      {value.trim() ? (
        <span className={s.tag}>직접 입력</span>
      ) : (
        <span className={s.meta}>미입력 · 원본 사진 유지</span>
      )}
    </div>
  );
}

export function ReadAnswers({
  sample,
  option,
  manual,
  onManual,
  onResult,
}: {
  sample: WireSample;
  option: ReadOption;
  manual: ManualAnswers;
  onManual: Dispatch<SetStateAction<ManualAnswers>>;
  onResult: () => void;
}) {
  const [page, setPage] = useState(0);
  const [empty, setEmpty] = useState(false);
  const fields = readingFields(sample);
  const total = fields.flat().length;
  const remaining = empty
    ? 0
    : fields.flat().filter((f) => !manual[f.id]?.trim()).length;
  const start = option.continuous
    ? fields.slice(0, page).reduce((sum, rows) => sum + rows.length, 0)
    : 0;
  const focus = (i: number) =>
    document.getElementById(`answer-${page}-${i}`)?.focus();
  return (
    <>
      <div className={s.controls}>
        <label>
          못 읽은 칸
          <select
            aria-label="못 읽은 칸"
            value={empty ? "zero" : "some"}
            onChange={(e) => setEmpty(e.target.value === "zero")}
          >
            <option value="some">쪽마다 두 칸 · 상태 예시</option>
            <option value="zero">0개</option>
          </select>
        </label>
        <p>
          {option.after
            ? "○ · △ · × 공개 뒤에도 답을 고치는 안"
            : "○ · △ · × 공개 전 답을 확인하는 안"}
        </p>
      </div>
      <section className={s.phone} data-wire-phone="">
        <header className={s.phoneHead}>
          <b>읽은 답 확인</b>
          <span>
            {empty ? "못 읽은 칸 없음" : `${total}칸 중 ${remaining}칸 미입력`}
          </span>
        </header>
        <div className={s.phoneBody}>
          <p>
            사진의 번호를 확인하고 아래 같은 번호에 <b>사진에 쓴 답</b>을 옮겨
            주세요.
          </p>
          <label>
            확인할 쪽
            <select
              value={page}
              onChange={(e) => setPage(Number(e.target.value))}
            >
              {fields.map((rows, i) => (
                <option key={i} value={i}>
                  {i + 1}/{fields.length}쪽 · 못 읽은 칸{" "}
                  {empty ? 0 : rows.length}개
                </option>
              ))}
            </select>
          </label>
          <MarkedPhoto
            sample={sample}
            page={page}
            option={option}
            empty={empty}
            onField={focus}
          />
          {empty ? (
            <div className={s.notice} role="status">
              <h3>못 읽은 답 칸이 없습니다</h3>
              <p>
                {option.after
                  ? "결과를 확인한 뒤에도 읽은 답을 고칠 수 있습니다."
                  : "추가 입력 없이 결과를 확인할 수 있습니다."}
              </p>
            </div>
          ) : (
            <div className={s.numberedInputs}>
              {fields[page].map((field, i) => (
                <section className={s.answerField} key={field.id}>
                  <h3>
                    {circled(start + i + 1)} · {page + 1}쪽 문 {field.question}
                  </h3>
                  <div className={s.prompt}>
                    <PaperText text={field.prompt} />
                  </div>
                  <AnswerInput
                    id={`answer-${page}-${i}`}
                    value={manual[field.id] ?? ""}
                    onChange={(value) =>
                      onManual((old) => ({ ...old, [field.id]: value }))
                    }
                  />
                </section>
              ))}
            </div>
          )}
          <p className={s.notice}>
            {option.after
              ? "직접 입력한 답은 다시 채점할 대상으로 표시합니다. 수정 전 사진과 판정은 교사가 대조할 수 있습니다."
              : "읽은 답 확인을 마친 뒤 ○ · △ · ×를 공개합니다. 사진은 교사가 대조할 수 있도록 함께 남깁니다."}
          </p>
          {remaining > 0 ? (
            <p role="status">
              입력하지 않은 {remaining}칸이 있습니다. 쪽을 바꿔 나머지 번호를
              확인해 주세요.
            </p>
          ) : null}
          <button
            type="button"
            className={s.primary}
            disabled={remaining > 0}
            onClick={onResult}
          >
            {option.after
              ? "수정 답의 결과 상태 보기"
              : "답 확인 후 결과 상태 보기"}
          </button>
        </div>
      </section>
      <aside className={s.designNote}>
        표시 위치는 제품의 실제 답 칸 DOM에서 잽니다. 운영에서는 인쇄 당시 문항
        위치를 사진에 맞춰 얹는 전제이며, 사진 원근 보정·판독·채점은 시연하지
        않습니다.
      </aside>
    </>
  );
}
