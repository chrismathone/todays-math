import type { ListeningReconstructionQuestion } from "./reconstruction";

type Item = Pick<
  ListeningReconstructionQuestion,
  "prompt" | "choices" | "correctChoiceOneBased" | "questionType"
>;
const answer = (item: Item) =>
  item.choices[item.correctChoiceOneBased - 1] ?? "";
const normalized = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, "");
const units = [
  { kind: "usd", pattern: /\$|\bdollars?\b|달러/, factor: 1 },
  { kind: "usd", pattern: /\bcents?\b|센트/, factor: 0.01 },
  { kind: "gbp", pattern: /£|파운드화/, factor: 1 },
  { kind: "eur", pattern: /€|\beuros?\b|유로/, factor: 1 },
  { kind: "krw", pattern: /\bwon\b|원(?:\s|$)/, factor: 1 },
  { kind: "seconds", pattern: /\bhours?\b|시간/, factor: 3600 },
  { kind: "seconds", pattern: /\b(?:minutes?|mins?)\b|분(?:\s|$)/, factor: 60 },
  { kind: "seconds", pattern: /\b(?:seconds?|secs?)\b|초(?:\s|$)/, factor: 1 },
  { kind: "days", pattern: /\bweeks?\b|주(?:일)?(?:\s|$)/, factor: 7 },
  { kind: "days", pattern: /\bdays?\b|일(?:\s|$)/, factor: 1 },
  { kind: "months", pattern: /\bmonths?\b|개월|달(?:\s|$)/, factor: 1 },
  { kind: "months", pattern: /\byears?\b|년(?:\s|$)/, factor: 12 },
  { kind: "grams", pattern: /\b(?:kilograms?|kg)\b|킬로그램/, factor: 1000 },
  { kind: "grams", pattern: /\b(?:grams?|g)\b|그램/, factor: 1 },
  {
    kind: "metres",
    pattern: /\b(?:kilometers?|kilometres?|km)\b|킬로미터/,
    factor: 1000,
  },
  {
    kind: "metres",
    pattern: /\b(?:centimeters?|centimetres?|cm)\b|센티미터/,
    factor: 0.01,
  },
  { kind: "metres", pattern: /\b(?:meters?|metres?)\b|미터/, factor: 1 },
];
const numberWords: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
function numericText(value: string) {
  return normalized(value)
    .replace(
      /\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[ -](?:one|two|three|four|five|six|seven|eight|nine)\b/g,
      (pair) => {
        const [tens, ones] = pair.split(/[ -]/);
        return String(numberWords[tens] + numberWords[ones]);
      },
    )
    .replace(
      /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/g,
      (word) => String(numberWords[word]),
    );
}
const numericValues = (value: string) =>
  [...numericText(value).matchAll(/\d+(?:\.\d+)?/g)].map((match) =>
    Number(match[0]),
  );
function quantity(correct: string, prompt: string) {
  const numbers = numericValues(correct);
  if (numbers.length !== 1) return null;
  const direct = units.find((unit) => unit.pattern.test(normalized(correct)));
  const unit =
    direct ?? units.find((unit) => unit.pattern.test(normalized(prompt)));
  return unit ? { kind: unit.kind, value: numbers[0] * unit.factor } : null;
}
function clock(value: string) {
  const text = normalized(value);
  const english = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)\b/.exec(
    text,
  );
  if (english) {
    const hour = Number(english[1]),
      minute = Number(english[2] || 0);
    if (hour >= 1 && hour <= 12 && minute <= 59)
      return (
        ((hour % 12) + (english[3].startsWith("p") ? 12 : 0)) * 60 + minute
      );
  }
  const korean =
    /(오전|오후)\s*(\d{1,2})\s*(?:시|:)(?:\s*(\d{1,2})\s*분?)?/.exec(text);
  if (korean) {
    const hour = Number(korean[2]),
      minute = Number(korean[3] || 0);
    if (hour >= 1 && hour <= 12 && minute <= 59)
      return ((hour % 12) + (korean[1] === "오후" ? 12 : 0)) * 60 + minute;
  }
  const twentyFour = /\b(\d{1,2}):(\d{2})\b/.exec(text);
  if (twentyFour && Number(twentyFour[1]) <= 23 && Number(twentyFour[2]) <= 59)
    return Number(twentyFour[1]) * 60 + Number(twentyFour[2]);
  return null;
}
const days = [
  /\bsunday\b|일요일/,
  /\bmonday\b|월요일/,
  /\btuesday\b|화요일/,
  /\bwednesday\b|수요일/,
  /\bthursday\b|목요일/,
  /\bfriday\b|금요일/,
  /\bsaturday\b|토요일/,
];
function weekday(value: string) {
  const index = days.findIndex((day) => day.test(normalized(value)));
  return index < 0 ? null : index;
}
const months = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
function calendarDate(value: string) {
  const text = normalized(value);
  const english = new RegExp(
    `\\b(${months.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`,
    "g",
  );
  const matches = [...text.matchAll(english)];
  if (matches.length === 1 && Number(matches[0][2]) <= 31)
    return `${months.indexOf(matches[0][1]) + 1}/${Number(matches[0][2])}`;
  const korean = [...text.matchAll(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)];
  if (
    korean.length === 1 &&
    Number(korean[0][1]) <= 12 &&
    Number(korean[0][2]) <= 31
  )
    return `${Number(korean[0][1])}/${Number(korean[0][2])}`;
  return null;
}
type Relation =
  "deadline" | "before" | "after" | "approximate" | "minimum" | "maximum";
function relations(value: string): Relation[] {
  const text = normalized(value),
    found: Relation[] = [];
  if (
    /\bby\s+(?:(?:this|next|the|no later than)\s+)?(?:\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday|noon|midnight|tomorrow|tonight|january|february|march|april|may|june|july|august|september|october|november|december|the end)|까지|늦어도/.test(
      text,
    )
  )
    found.push("deadline");
  if (/\bbefore\b|이전|전에|전까지|\d\s*분\s*전/.test(text))
    found.push("before");
  if (/\bafter\b|이후|후에|\d\s*분\s*후/.test(text)) found.push("after");
  if (
    /\b(?:about|approximately|around|roughly)\s+(?:[$£€]?\d|one|two|three|four|five|six|seven|eight|nine|ten|noon|midnight)|약\s*(?:오전|오후)?\s*\d|정도|쯤/.test(
      text,
    )
  )
    found.push("approximate");
  if (/\bat least\b|\bno less than\b|최소|적어도|이상/.test(text))
    found.push("minimum");
  if (/\bat most\b|\bno more than\b|최대|많아야|이하/.test(text))
    found.push("maximum");
  return found;
}

/** Detects known literal meaning changes. Empty warnings do not prove semantic equivalence. */
export function listeningStyleSemanticWarnings(
  previous: Item,
  candidate: Item,
): string[] {
  const oldAnswer = answer(previous),
    nextAnswer = answer(candidate),
    warnings: string[] = [];
  if (!oldAnswer || !nextAnswer) return ["missing_correct_choice"];
  const oldText = normalized(oldAnswer),
    nextText = normalized(nextAnswer);
  if (oldText === nextText) return warnings;
  const oldRelations = relations(oldAnswer);
  const nextRelations = relations(nextAnswer + " " + candidate.prompt);
  for (const relation of oldRelations)
    if (!nextRelations.includes(relation)) warnings.push(`dropped_${relation}`);
  if (oldRelations.includes("before") && nextRelations.includes("after"))
    warnings.push("before_changed_to_after");
  if (oldRelations.includes("after") && nextRelations.includes("before"))
    warnings.push("after_changed_to_before");
  const oldDay = weekday(oldAnswer),
    nextDay = weekday(nextAnswer);
  if (oldDay !== null && oldDay !== nextDay)
    warnings.push("weekday_changed_or_dropped");
  const oldDate = calendarDate(oldAnswer),
    nextDate = calendarDate(nextAnswer);
  if (oldDate !== null && oldDate !== nextDate)
    warnings.push("calendar_date_changed_or_dropped");
  const oldClock = clock(oldAnswer),
    nextClock = clock(nextAnswer);
  if (oldClock !== null && oldClock !== nextClock)
    warnings.push("clock_time_changed_or_dropped");
  const oldQuantity = quantity(oldAnswer, previous.prompt),
    nextQuantity = quantity(nextAnswer, candidate.prompt);
  if (
    oldDay !== null ||
    oldDate !== null ||
    oldClock !== null ||
    oldQuantity !== null
  ) {
    for (const relation of nextRelations) {
      if (
        !oldRelations.includes(relation) &&
        !(relation === "deadline" && oldRelations.includes("before"))
      )
        warnings.push(`added_${relation}`);
    }
  }
  if (oldQuantity && (!nextQuantity || oldQuantity.kind !== nextQuantity.kind))
    warnings.push("quantity_unit_changed_or_dropped");
  else if (
    oldQuantity &&
    nextQuantity &&
    Math.abs(oldQuantity.value - nextQuantity.value) > 1e-8
  )
    warnings.push("quantity_value_changed");
  if (
    !oldQuantity &&
    !nextQuantity &&
    oldClock === null &&
    nextClock === null &&
    oldDay === null &&
    nextDay === null &&
    oldDate === null &&
    nextDate === null
  ) {
    const oldNumbers = numericValues(oldAnswer),
      nextNumbers = numericValues(nextAnswer);
    if (
      oldNumbers.length &&
      JSON.stringify(oldNumbers) !== JSON.stringify(nextNumbers)
    )
      warnings.push("literal_numbers_changed_or_dropped");
  }
  return [...new Set(warnings)];
}
