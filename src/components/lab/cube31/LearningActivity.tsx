"use client";

import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import type {
  CubeChoice,
  CubeOperation,
  CubeTask,
  CubeVisual,
} from "@/lib/lab/cube31/types";
import styles from "./LearningActivity.module.css";

type ActivityTask = Exclude<CubeTask, { kind: "regroup" }>;
type Callbacks = { onComplete: () => void; onAttempt?: () => void };
type Props = Callbacks & { task: ActivityTask };
type KindProps<K extends ActivityTask["kind"]> = Callbacks & {
  task: Extract<ActivityTask, { kind: K }>;
};

const sign = (operation: CubeOperation) => (operation === "add" ? "+" : "−");
const calculate = (a: number, b: number, operation: CubeOperation) =>
  operation === "add" ? a + b : a - b;
const placeNames = ["일의 자리", "십의 자리", "백의 자리", "천의 자리"];
const normal = (value: string) =>
  value.normalize("NFKC").replace(/\s/g, "").replace(/−/g, "-");
function matches(value: string, answer: string | number) {
  const actual = normal(value);
  const expected = normal(String(answer));
  if (!actual) return false;
  return /^-?\d+$/.test(actual) && /^-?\d+$/.test(expected)
    ? Number(actual) === Number(expected)
    : actual === expected;
}

function useCheck({ onComplete, onAttempt }: Callbacks) {
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState("");
  // Also guard synchronous repeat submissions before React paints disabled controls.
  const completed = useRef(false);
  function check(problems: string[], finish = true) {
    if (completed.current) return;
    if (problems.length) {
      setFeedback(`${problems.join(" ")} 고친 뒤 다시 확인해요.`);
      onAttempt?.();
    } else if (finish) {
      completed.current = true;
      setDone(true);
      setFeedback("모두 맞았어요!");
      onComplete();
    } else {
      setFeedback("수를 잘 만들었어요. 이제 계산해 보세요.");
    }
  }
  return { done, feedback, check };
}

function ActivityForm({
  children,
  state,
  onCheck,
  checkLabel = "확인하기",
}: {
  children: ReactNode;
  state: ReturnType<typeof useCheck>;
  onCheck: () => void;
  checkLabel?: string;
}) {
  const feedbackId = useId();
  return (
    <form
      className={styles.activity}
      onSubmit={(event) => {
        event.preventDefault();
        onCheck();
      }}
    >
      <fieldset className={styles.controls} disabled={state.done}>
        {children}
      </fieldset>
      <div className={styles.checkRow}>
        <button
          className={styles.primary}
          type="submit"
          disabled={state.done}
          aria-describedby={feedbackId}
        >
          {state.done ? "확인 완료" : checkLabel}
        </button>
        <p
          id={feedbackId}
          className={state.done ? styles.success : styles.feedback}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {state.feedback}
        </p>
      </div>
    </form>
  );
}

function AnswerInput({
  label,
  value,
  onChange,
  suffix,
  disabled = false,
  numeric = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  disabled?: boolean;
  numeric?: boolean;
}) {
  return (
    <label className={styles.answerLabel}>
      <span>{label}</span>
      <span className={styles.inputRow}>
        <input
          className={styles.answer}
          aria-label={suffix ? `${label} ${suffix}` : label}
          inputMode={numeric ? "numeric" : "text"}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
        {suffix ? <span>{suffix}</span> : null}
      </span>
    </label>
  );
}

function Choices({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: CubeChoice[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className={styles.choices}>
      <legend>{label}</legend>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className={styles.choice}
          data-selected={value === choice.value}
        >
          <input
            type="radio"
            name={name}
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
          />
          <span>{choice.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

function Visual({ visual }: { visual: CubeVisual }) {
  switch (visual.type) {
    case "column":
      return (
        <div
          className={styles.column}
          aria-label={`${visual.a} ${sign(visual.operation)} ${visual.b} 세로셈`}
        >
          <div>{visual.a}</div>
          <div>
            <span>{sign(visual.operation)}</span>
            {visual.b}
          </div>
          <div className={styles.columnResult}>{visual.wrongResult ?? "?"}</div>
        </div>
      );
    case "bars": {
      // Unknown bars carry their mathematical value for layout data, never a printed answer.
      // Their length is deliberately schematic too: it cannot act as an answer ruler.
      const known = visual.values.filter(
        (_, index) => !/[?？□]/.test(visual.labels[index] ?? ""),
      );
      const maximum = Math.max(1, ...known);
      return (
        <div className={styles.bars} aria-label="수의 관계 그림">
          {visual.labels.map((label, index) => {
            const hidden = /[?？□]/.test(label);
            return (
              <div key={`${index}-${label}`} className={styles.barRow}>
                <span>{label}</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    data-unknown={hidden}
                    style={{
                      width: `${hidden ? 65 : Math.max(12, ((visual.values[index] ?? 0) / maximum) * 100)}%`,
                    }}
                  >
                    {hidden ? "?" : visual.values[index]}
                  </div>
                </div>
              </div>
            );
          })}
          <small>막대는 수의 관계를 나타내요.</small>
        </div>
      );
    }
    case "machine":
      return (
        <div className={styles.machine} aria-label="수 계산 기계">
          <span className={styles.machineNumber}>{visual.start}</span>
          {visual.operations.map((operation, index) => (
            <span className={styles.machineStep} key={`${index}-${operation}`}>
              {!/[←→]/.test(operation) ? (
                <span aria-hidden="true">→</span>
              ) : null}
              <strong>{operation}</strong>
            </span>
          ))}
          {!visual.operations.some((operation) => /[?？□]/.test(operation)) ? (
            <span className={styles.machineNumber}>→ ?</span>
          ) : null}
        </div>
      );
    case "equation":
      return (
        <div className={styles.equations}>
          {visual.lines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      );
  }
}

function QuestionActivity({ task, ...callbacks }: KindProps<"question">) {
  const state = useCheck(callbacks);
  const [choice, setChoice] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  function check() {
    const problems: string[] = [];
    if (task.choices?.length && choice !== task.correctChoice)
      problems.push(
        choice === null
          ? "보기를 골라 주세요."
          : "고른 보기를 다시 살펴보세요.",
      );
    task.fields?.forEach((field) => {
      if (!matches(values[field.id] ?? "", field.answer))
        problems.push(`${field.label} 칸을 다시 살펴보세요.`);
    });
    if (!task.choices?.length && !task.fields?.length)
      problems.push("아직 응답할 내용이 없어요.");
    state.check(problems);
  }
  return (
    <ActivityForm state={state} onCheck={check}>
      {task.visual ? <Visual visual={task.visual} /> : null}
      {task.choices?.length ? (
        <Choices
          label="알맞은 보기"
          choices={task.choices}
          value={choice}
          onChange={setChoice}
        />
      ) : null}
      <div className={styles.answers}>
        {task.fields?.map((field) => (
          <AnswerInput
            key={field.id}
            label={field.label}
            suffix={field.suffix}
            value={values[field.id] ?? ""}
            numeric={/^-?\d+$/.test(field.answer)}
            onChange={(value) =>
              setValues((previous) => ({ ...previous, [field.id]: value }))
            }
          />
        ))}
      </div>
    </ActivityForm>
  );
}

function EstimateOperand({
  value,
  answer,
  onChange,
  ordinal,
}: {
  value: number;
  answer: string;
  onChange: (value: string) => void;
  ordinal: string;
}) {
  const lower = Math.floor(value / 10) * 10;
  const min = Math.max(0, lower - 10);
  const max = lower + 20;
  const id = useId();
  const parsed = /^\d+$/.test(answer) ? Number(answer) : min;
  return (
    <div className={styles.estimateOperand}>
      <strong>
        {ordinal}: {value}
      </strong>
      <div className={styles.numberLine} aria-hidden="true">
        <span
          className={styles.originalMarker}
          style={{ left: `${((value - min) / (max - min)) * 100}%` }}
        >
          {value}
          <span>▼</span>
        </span>
        <div className={styles.ticks}>
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index}>{min + index * 10}</span>
          ))}
        </div>
      </div>
      <label className={styles.srOnly} htmlFor={id}>
        {ordinal} 가까운 십 고르기
      </label>
      <input
        id={id}
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={10}
        value={Math.max(min, Math.min(max, parsed))}
        aria-valuetext={
          answer ? `${answer}, 선택한 어림값` : "아직 고르지 않았어요"
        }
        onChange={(event) => onChange(event.target.value)}
      />
      <AnswerInput
        label={`${ordinal} 어림값`}
        value={answer}
        onChange={onChange}
      />
    </div>
  );
}

function EstimateActivity({ task, ...callbacks }: KindProps<"estimate">) {
  const state = useCheck(callbacks);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [answer, setAnswer] = useState("");
  function check() {
    const roundedA = Math.round(task.a / 10) * 10;
    const roundedB = Math.round(task.b / 10) * 10;
    const problems: string[] = [];
    if (!matches(a, roundedA))
      problems.push("첫째 수에서 가장 가까운 십을 찾아보세요.");
    if (!matches(b, roundedB))
      problems.push("둘째 수에서 가장 가까운 십을 찾아보세요.");
    if (!matches(answer, calculate(roundedA, roundedB, task.operation)))
      problems.push("어림한 두 수의 계산 결과를 살펴보세요.");
    state.check(problems);
  }
  return (
    <ActivityForm state={state} onCheck={check}>
      <p className={styles.help}>
        수직선의 손잡이를 움직이거나 칸에 써 보세요. 똑같이 가까우면 더 큰
        십으로 어림해요.
      </p>
      <div className={styles.estimateGrid}>
        <EstimateOperand
          value={task.a}
          answer={a}
          onChange={setA}
          ordinal="첫째 수"
        />
        <EstimateOperand
          value={task.b}
          answer={b}
          onChange={setB}
          ordinal="둘째 수"
        />
      </div>
      <div className={styles.equations}>
        {a || "?"} {sign(task.operation)} {b || "?"} ≈ ?
      </div>
      <AnswerInput
        label="어림한 계산 결과"
        value={answer}
        onChange={setAnswer}
      />
    </ActivityForm>
  );
}

/** Move one unique item. Occupied destinations swap; a bank item returns the old item to the bank. */
function placeItem(slots: (number | null)[], item: number, target: number) {
  const next = [...slots];
  const source = next.indexOf(item);
  if (source === target) return slots;
  if (source !== -1) next[source] = next[target];
  next[target] = item;
  return next;
}

function readDrag(event: DragEvent, validItems: number[]) {
  const data = event.dataTransfer.getData("text/plain");
  if (!/^\d+$/.test(data)) return null;
  const item = Number(data);
  return validItems.includes(item) ? item : null;
}

function CardsActivity({ task, ...callbacks }: KindProps<"cards">) {
  const state = useCheck(callbacks);
  const [slots, setSlots] = useState<(number | null)[]>(() =>
    task.digits.map(() => null),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);
  const [answer, setAnswer] = useState("");
  const digits = [...task.digits].sort((a, b) =>
    task.order === "largest" ? b - a : a - b,
  );
  if (task.order === "smallest" && digits[0] === 0) {
    const firstNonzero = digits.findIndex((digit) => digit > 0);
    if (firstNonzero > 0)
      [digits[0], digits[firstNonzero]] = [digits[firstNonzero], digits[0]];
  }
  const expected = Number(digits.join(""));
  const arranged = slots.every((slot) => slot !== null)
    ? Number(slots.map((slot) => task.digits[slot!]).join(""))
    : null;
  // Compatible with the initial type contract and the coordinator's optional operation extension.
  const operation: CubeOperation =
    (task as typeof task & { operation?: CubeOperation }).operation ?? "add";
  const correctOrder =
    arranged === expected && slots[0] !== null && task.digits[slots[0]] !== 0;
  function changeSlots(next: (number | null)[]) {
    if (state.done) return;
    setSlots(next);
    setVerified(false);
    setAnswer("");
    setSelected(null);
  }
  function put(item: number | null, target: number) {
    if (item === null || state.done) return;
    changeSlots(placeItem(slots, item, target));
  }
  function check() {
    if (!correctOrder) {
      state.check([
        arranged === null
          ? "각 자리에 카드를 하나씩 놓아 주세요."
          : `가장 ${task.order === "largest" ? "큰" : "작은"} 수가 되도록 자리 순서를 살펴보세요.`,
      ]);
      return;
    }
    if (!verified) {
      setVerified(true);
      state.check([], false);
      return;
    }
    state.check(
      matches(answer, calculate(expected, task.add, operation))
        ? []
        : ["만든 수로 계산한 답을 다시 살펴보세요."],
    );
  }
  const itemIds = task.digits.map((_, index) => index);
  return (
    <ActivityForm
      state={state}
      onCheck={check}
      checkLabel={verified ? "확인하기" : "수 만들기 확인"}
    >
      <p className={styles.help}>
        카드를 고르고 자리를 누르세요. 끌어 놓아도 돼요. 자리에 놓인 카드끼리는
        서로 바꿀 수 있어요.
      </p>
      <div className={styles.cardBank} aria-label="숫자 카드">
        {task.digits.map((digit, index) => (
          <button
            type="button"
            key={index}
            className={styles.digitCard}
            aria-label={`${digit} 카드${task.digits.indexOf(digit) !== index ? ` ${index + 1}` : ""}`}
            aria-pressed={selected === index}
            draggable={!state.done}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", String(index));
              setSelected(index);
            }}
            onClick={() => setSelected(selected === index ? null : index)}
          >
            {digit}
            <small>{slots.includes(index) ? "놓은 카드" : "카드"}</small>
          </button>
        ))}
      </div>
      <div
        className={styles.slots}
        style={{
          gridTemplateColumns: `repeat(${task.digits.length}, minmax(0, 1fr))`,
        }}
      >
        {slots.map((item, index) => {
          const place =
            placeNames[slots.length - index - 1] ??
            `${slots.length - index}번째 자리`;
          return (
            <button
              key={index}
              type="button"
              className={styles.slot}
              aria-label={`${place}: ${item === null ? "빈자리" : task.digits[item]}`}
              aria-pressed={item !== null && selected === item}
              draggable={item !== null && !state.done}
              onDragStart={(event) => {
                if (item !== null) {
                  event.dataTransfer.setData("text/plain", String(item));
                  setSelected(item);
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                put(readDrag(event, itemIds), index);
              }}
              onClick={() =>
                selected !== null ? put(selected, index) : setSelected(item)
              }
            >
              <span>{place}</span>
              <strong>{item === null ? "·" : task.digits[item]}</strong>
            </button>
          );
        })}
      </div>
      <div className={styles.toolRow}>
        <button
          type="button"
          className={styles.secondary}
          disabled={selected === null || !slots.includes(selected)}
          onClick={() =>
            changeSlots(slots.map((item) => (item === selected ? null : item)))
          }
        >
          선택 카드 빼기
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => changeSlots(task.digits.map(() => null))}
        >
          카드 다시 놓기
        </button>
      </div>
      {verified ? (
        <div className={styles.equations}>
          {arranged} {sign(operation)} {task.add} = ?
        </div>
      ) : (
        <p className={styles.help}>
          먼저 가장 {task.order === "largest" ? "큰" : "작은"} 수를 만들고
          확인해요.
        </p>
      )}
      <AnswerInput
        label="계산한 답"
        value={answer}
        onChange={setAnswer}
        disabled={!verified}
      />
    </ActivityForm>
  );
}

function RepairActivity({ task, ...callbacks }: KindProps<"repair">) {
  const state = useCheck(callbacks);
  const [place, setPlace] = useState<number | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const resultDigits = String(task.wrongResult).split("");
  function check() {
    const problems: string[] = [];
    if (place !== task.wrongPlace)
      problems.push(
        place === null
          ? "틀린 자리의 숫자를 골라 주세요."
          : "틀린 숫자의 자리를 다시 살펴보세요.",
      );
    if (reason !== task.reason)
      problems.push(
        reason === null
          ? "틀린 이유를 골라 주세요."
          : "고른 이유를 다시 살펴보세요.",
      );
    if (!matches(answer, calculate(task.a, task.b, task.operation)))
      problems.push("고친 답을 다시 살펴보세요.");
    state.check(problems);
  }
  return (
    <ActivityForm state={state} onCheck={check}>
      <div className={styles.repairColumn}>
        <div>{task.a}</div>
        <div>
          <span>{sign(task.operation)}</span>
          {task.b}
        </div>
        <div
          className={styles.wrongDigits}
          role="group"
          aria-label="틀린 계산 결과에서 자리 고르기"
        >
          {resultDigits.map((digit, index) => {
            const digitPlace = resultDigits.length - 1 - index;
            return (
              <button
                type="button"
                key={index}
                aria-label={`${placeNames[digitPlace] ?? `${digitPlace + 1}번째 자리`} ${digit}`}
                aria-pressed={place === digitPlace}
                onClick={() => setPlace(digitPlace)}
              >
                {digit}
              </button>
            );
          })}
        </div>
      </div>
      <Choices
        label="왜 틀렸을까요?"
        choices={task.reasons}
        value={reason}
        onChange={setReason}
      />
      <AnswerInput label="고친 답" value={answer} onChange={setAnswer} />
    </ActivityForm>
  );
}

// An original island map, clipped into nine interlocking pieces. No source-page artwork.
const MAP_ART = (
  <g>
    <rect width="300" height="300" fill="#cdebf2" />
    <path
      d="M-10 45 Q25 17 67 43 T128 32 L169 54 151 91 174 126 151 147 167 178 122 193 99 171 59 180 34 139 6 131Z"
      fill="#c7dc91"
      stroke="#58723c"
      strokeWidth="3"
    />
    <path
      d="M187 162 208 143 243 155 267 143 310 160 318 245 284 266 261 244 226 257 199 228 168 214Z"
      fill="#e4dba3"
      stroke="#817039"
      strokeWidth="3"
    />
    <path
      d="M-5 74 C60 51 78 134 119 111 S176 57 225 84 270 121 307 94"
      fill="none"
      stroke="#fff"
      strokeWidth="12"
    />
    <path
      d="M-5 74 C60 51 78 134 119 111 S176 57 225 84 270 121 307 94"
      fill="none"
      stroke="#3a8195"
      strokeWidth="3"
      strokeDasharray="6 5"
    />
    <path
      d="M42 35 53 17 64 35Z M66 40 79 18 93 40Z M116 64 129 44 143 64Z"
      fill="#658544"
    />
    <path
      d="M54 126 75 108 97 127V151H54Z"
      fill="#fbf5dc"
      stroke="#85593b"
      strokeWidth="3"
    />
    <path
      d="M50 126 75 106 101 126 M72 151V133H82V151"
      fill="none"
      stroke="#a24e35"
      strokeWidth="5"
    />
    <path
      d="M223 45 225 66 248 66Z"
      fill="#fff9e9"
      stroke="#526f82"
      strokeWidth="2"
    />
    <path d="M216 69H252L243 78H224Z" fill="#a95b37" />
    <path
      d="M199 188C225 175 246 212 268 194S296 185 310 204"
      fill="none"
      stroke="#469eb7"
      strokeWidth="9"
    />
    <path
      d="M214 186 237 198 M219 178 242 190"
      stroke="#825932"
      strokeWidth="4"
    />
    <path
      d="M29 232q12-12 24 0m7 18q12-12 24 0m32-22q12-12 24 0m35 39q12-12 24 0"
      fill="none"
      stroke="#4594ac"
      strokeWidth="3"
    />
    <g fill="#326d55">
      <circle cx="121" cy="154" r="10" />
      <circle cx="140" cy="159" r="8" />
      <circle cx="247" cy="226" r="9" />
      <circle cx="269" cy="220" r="10" />
    </g>
    <path d="m270 21 4 9 10 1-8 6 3 10-9-5-9 5 3-10-8-6 10-1Z" fill="#d88820" />
  </g>
);

function piecePath(index: number) {
  const row = Math.floor(index / 3),
    col = index % 3;
  const x = col * 100,
    y = row * 100;
  // Shared boundaries use opposite traversal, retaining exactly matching tabs and sockets.
  function edge(sx: number, sy: number, dx: number, dy: number, bulge: number) {
    const point = (along: number, depth: number) =>
      `${sx + (dx * along) / 100 - (dy * depth) / 100},${sy + (dy * along) / 100 + (dx * depth) / 100}`;
    return bulge === 0
      ? `L${point(100, 0)}`
      : `L${point(38, 0)} C${point(32, bulge)} ${point(37, bulge * 2)} ${point(50, bulge * 2)} C${point(63, bulge * 2)} ${point(68, bulge)} ${point(62, 0)} L${point(100, 0)}`;
  }
  const horizontal = (r: number, c: number) => ((r + c) % 2 ? 8 : -8);
  const vertical = (r: number, c: number) => ((r + c) % 2 ? -8 : 8);
  return `M${x},${y}${edge(x, y, 100, 0, row === 0 ? 0 : horizontal(row, col))}${edge(x + 100, y, 0, 100, col === 2 ? 0 : vertical(row, col + 1))}${edge(x + 100, y + 100, -100, 0, row === 2 ? 0 : -horizontal(row + 1, col))}${edge(x, y + 100, 0, -100, col === 0 ? 0 : -vertical(row, col))}Z`;
}
const PIECE_PATHS = Array.from({ length: 9 }, (_, index) => piecePath(index));
const MISSING = [1, 2, 3, 5, 7];
const PIECES = [
  { cell: 5, name: "A", description: "바다와 섬, 강이 있는 조각" },
  { cell: 1, name: "B", description: "산과 굽은 길이 있는 조각" },
  { cell: 7, name: "C", description: "물결과 모래섬이 있는 조각" },
  { cell: 2, name: "D", description: "배와 별, 길이 있는 조각" },
  { cell: 3, name: "E", description: "집과 초록 섬이 있는 조각" },
];

function MapPiece({ cell, id }: { cell: number; id: string }) {
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={PIECE_PATHS[cell]} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{MAP_ART}</g>
      <path
        d={PIECE_PATHS[cell]}
        fill="none"
        stroke="#38556a"
        strokeWidth="1.6"
      />
    </g>
  );
}

function PuzzleActivity(callbacks: KindProps<"puzzle">) {
  const state = useCheck(callbacks);
  const [slots, setSlots] = useState<(number | null)[]>(() =>
    MISSING.map(() => null),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const prefix = useId().replace(/:/g, "");
  function put(item: number | null, target: number) {
    if (state.done || item === null) return;
    setSlots((previous) => placeItem(previous, item, target));
    setSelected(null);
  }
  function remove() {
    if (state.done) return;
    setSlots((previous) =>
      previous.map((item) => (item === selected ? null : item)),
    );
    setSelected(null);
  }
  function check() {
    const empty = slots.filter((item) => item === null).length;
    const wrong = slots.flatMap((item, index) =>
      item !== null && PIECES[item].cell !== MISSING[index] ? [index + 1] : [],
    );
    state.check(
      empty
        ? [`빈자리 ${empty}곳에 조각을 놓아 주세요.`]
        : wrong.length
          ? [`${wrong.join(", ")}번 자리의 윤곽과 이어지는 그림을 살펴보세요.`]
          : [],
    );
  }
  return (
    <ActivityForm state={state} onCheck={check}>
      <p className={styles.help}>
        조각을 고른 뒤 빈자리를 누르거나 끌어 놓으세요. 놓인 조각도 골라
        바꾸거나 되돌릴 수 있어요.
      </p>
      <div className={styles.puzzleBoard}>
        <svg
          viewBox="-3 -3 306 306"
          className={styles.map}
          role="img"
          aria-label="길과 해안선이 이어지는 아홉 조각 섬 지도. 다섯 자리가 비어 있어요."
        >
          {PIECE_PATHS.map((path, cell) => {
            const target = MISSING.indexOf(cell);
            if (target === -1)
              return (
                <MapPiece
                  key={cell}
                  cell={cell}
                  id={`${prefix}-fixed-${cell}`}
                />
              );
            const item = slots[target];
            return (
              <g key={cell}>
                <path
                  d={path}
                  fill="#f3f7fa"
                  stroke="#60778a"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
                {item !== null ? (
                  <g
                    transform={`translate(${((cell % 3) - (PIECES[item].cell % 3)) * 100} ${(Math.floor(cell / 3) - Math.floor(PIECES[item].cell / 3)) * 100})`}
                  >
                    <MapPiece
                      cell={PIECES[item].cell}
                      id={`${prefix}-placed-${target}`}
                    />
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>
        {MISSING.map((cell, target) => {
          const item = slots[target];
          return (
            <button
              type="button"
              key={cell}
              className={styles.puzzleTarget}
              style={{
                left: `${((cell % 3) * 100) / 3 + 4}%`,
                top: `${(Math.floor(cell / 3) * 100) / 3 + 4}%`,
              }}
              aria-label={`${target + 1}번 자리${item === null ? ": 빈자리" : `: ${PIECES[item].name} 조각`}`}
              aria-pressed={item !== null && selected === item}
              draggable={item !== null && !state.done}
              onDragStart={(event) => {
                if (item !== null) {
                  event.dataTransfer.setData("text/plain", String(item));
                  setSelected(item);
                }
              }}
              onClick={() =>
                selected !== null ? put(selected, target) : setSelected(item)
              }
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                put(readDrag(event, [0, 1, 2, 3, 4]), target);
              }}
            >
              <span>
                {target + 1}
                {item === null ? "" : ` · ${PIECES[item].name}`}
              </span>
            </button>
          );
        })}
      </div>
      <div className={styles.pieceBank} aria-label="지도 조각">
        {PIECES.map((piece, index) => (
          <button
            type="button"
            key={piece.name}
            className={styles.puzzlePiece}
            aria-label={`${piece.name} 조각: ${piece.description}`}
            aria-pressed={selected === index}
            draggable={!state.done}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", String(index));
              setSelected(index);
            }}
            onClick={() => setSelected(selected === index ? null : index)}
          >
            <svg
              viewBox={`${(piece.cell % 3) * 100 - 19} ${Math.floor(piece.cell / 3) * 100 - 19} 138 138`}
              aria-hidden="true"
            >
              <MapPiece cell={piece.cell} id={`${prefix}-bank-${index}`} />
            </svg>
            <span>
              {piece.name}{" "}
              <small>{slots.includes(index) ? "놓음" : "조각"}</small>
            </span>
          </button>
        ))}
      </div>
      <p className={styles.selection} role="status">
        {selected === null
          ? "모양과 그림의 연결을 함께 살펴보세요."
          : `${PIECES[selected].name} 조각 선택. 놓을 자리를 누르세요.`}
      </p>
      <div className={styles.toolRow}>
        <button
          type="button"
          className={styles.secondary}
          disabled={selected === null || !slots.includes(selected)}
          onClick={remove}
        >
          선택 조각 되돌리기
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            if (!state.done) {
              setSlots(MISSING.map(() => null));
              setSelected(null);
            }
          }}
        >
          조각 다시 놓기
        </button>
      </div>
    </ActivityForm>
  );
}

export default function LearningActivity({ task, ...callbacks }: Props) {
  switch (task.kind) {
    case "question":
      return <QuestionActivity task={task} {...callbacks} />;
    case "estimate":
      return <EstimateActivity task={task} {...callbacks} />;
    case "cards":
      return <CardsActivity task={task} {...callbacks} />;
    case "repair":
      return <RepairActivity task={task} {...callbacks} />;
    case "puzzle":
      return <PuzzleActivity task={task} {...callbacks} />;
  }
}
