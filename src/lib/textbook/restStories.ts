export type RestStoryId =
  "sharing" | "patterns" | "garden" | "map" | "balance" | "weather";

export type RestAgeBand = "elementary3-4" | "elementary5-6" | "middle1-3";

/** Whether a story suits an age band, and the curriculum fact the verdict rests on. */
export interface RestStoryFit {
  readonly suitable: boolean;
  readonly basis: string;
}

export interface RestStory {
  readonly id: RestStoryId;
  readonly title: string;
  readonly markdown: string;
  readonly reflectionQuestions: readonly string[];
  readonly imageId: RestStoryId;
  readonly imageSrc: string;
  /** Verdict per age band. A model reading against the curriculum; not yet an editor's approval. */
  readonly ageBands: Readonly<Record<RestAgeBand, RestStoryFit>>;
  /** The semester whose chapter first teaches the mathematics the story relies on. */
  readonly firstTaught: {
    readonly grade: string;
    readonly semester: 1 | 2;
    readonly chapter: string;
  };
}

/** Original fictional stories: the numerical claims come from the stated conditions, not the illustration. */
const stories: Omit<
  RestStory,
  "imageId" | "imageSrc" | "ageBands" | "firstTaught"
>[] = [
  {
    id: "sharing",
    title: "귤 바구니를 나누는 오후",
    markdown: `귤나무 그늘에서 민서와 지호는 친구들과 먹을 귤을 접시에 담았다. 이야기 속 바구니에는 귤이 열두 개 있었고, 함께 나눌 사람은 여섯 명이었다. 민서는 한 사람의 접시에 하나씩 놓는 일을 두 번 반복했다.

모두 두 개씩 받았고 바구니는 비었다. $12\\div6=2$라는 계산은 ‘열두 개를 여섯 사람에게 같은 개수로 나누면 한 사람당 두 개’라는 뜻이었다. 지호는 접시마다 두 개씩 있는 것을 보고 $6\\times2=12$로 처음 개수도 확인했다.

민서는 접시 두 개의 귤을 큰 접시 하나로 옮겨 네 개씩 세 묶음을 만들었다. 담는 그릇과 묶음 수가 달라져도 귤은 여전히 열두 개였다. 다만 귤 크기는 조금씩 달랐다. 같은 개수로 나눈 것과 정확히 같은 무게로 나눈 것은 다른 약속이었다. 친구들은 어떤 뜻으로 공평하게 나눌지 먼저 이야기한 뒤, 서로 고른 귤을 즐겁게 먹었다.`,
    reflectionQuestions: [
      "귤 열두 개를 세 사람에게 같은 개수로 나누면 한 사람은 몇 개를 받을까요? 전체 개수와 묶음 수를 함께 설명해 보세요.",
      "귤을 두 개씩 받았다는 사실만으로 같은 무게를 받았다고 말할 수 있을까요? 어떤 정보를 더 알아야 할까요?",
    ],
  },
  {
    id: "patterns",
    title: "풍경 아래에서 찾은 세 박자",
    markdown: `정자 처마의 풍경이 바람에 울렸다. 지아와 건우는 풍경에 매달 작은 종이 잎을 만들기로 했다. 이야기 속 두 친구는 초록, 노랑, 파랑의 순서로 종이 잎을 놓고, 이 세 색을 같은 순서로 계속 반복했다.

첫째, 넷째, 일곱째 잎은 초록이었다. 셋째, 여섯째, 아홉째 잎은 파랑이었다. 건우는 열두 장을 세 장씩 묶어 보았다. $12\\div3=4$이므로 같은 색 순서가 네 번 들어 있었다. 열두 번째 잎은 파랑이고, 다시 시작하는 열세 번째 잎은 초록이었다.

지아는 색마다 손뼉, 무릎 치기, 손뼉이라는 동작을 붙였다. 같은 소리가 두 번 들어가도 색의 순서가 사라진 것은 아니었다. 둘은 ‘무엇이 반복되는가’를 먼저 정해야 서로 같은 규칙을 이야기할 수 있다는 것을 알았다. 실제 바람이 풍경을 울리는 간격까지 정확히 세 박자로 반복되는 것은 아니었다. 친구들이 정한 색 규칙과 자연의 소리를 구별하며, 둘은 자기들만의 느긋한 리듬을 이어 갔다.`,
    reflectionQuestions: [
      "같은 색 순서로 계속 놓을 때 열네 번째 잎은 무슨 색일까요? 세 장씩 묶거나 순서대로 그려서 설명해 보세요.",
      "종이 잎 서른 장을 놓으면 각 색은 몇 장씩 필요할까요? 초록, 파랑, 노랑 순서로 바꾸면 무엇이 달라질까요?",
    ],
  },
  {
    id: "garden",
    title: "울타리와 흙의 서로 다른 계산",
    markdown: `다은과 하준은 학교 텃밭을 맡았다. 텃밭은 가로 $6\\,\\text{m}$, 세로 $4\\,\\text{m}$인 직사각형이었다. 둘은 가장자리에 울타리를 세우고, 안쪽에는 흙을 고르게 덮기로 했다.

하준은 네 변을 모두 더했다. $6+4+6+4=20$이므로 울타리는 $20\\,\\text{m}$가 필요했다. 다은은 한 변이 $1\\,\\text{m}$인 정사각형 칸을 떠올렸다. 한 줄에 여섯 칸, 그런 줄이 네 줄이니 넓이는 $6\\times4=24\\,\\text{m}^2$였다. 울타리의 길이와 흙을 덮을 넓이는 서로 다른 양이었다.

옆 반 텃밭은 가로 $7\\,\\text{m}$, 세로 $3\\,\\text{m}$였다. 둘레는 똑같이 $20\\,\\text{m}$였지만 넓이는 $21\\,\\text{m}^2$였다. 같은 길이의 울타리로도 안쪽 넓이는 달라졌다. 친구들은 계산하기 전에 ‘지금 구하려는 것은 가장자리인가, 안쪽인가?’를 먼저 묻기로 했다.`,
    reflectionQuestions: [
      "가로와 세로가 모두 $5\\,\\text{m}$인 텃밭의 둘레와 넓이를 구해 보세요. 두 텃밭과 비교하면 무엇이 보이나요?",
      "둘레의 단위가 m이고 넓이의 단위가 $\\text{m}^2$인 이유를 작은 정사각형 칸으로 설명해 보세요.",
    ],
  },
  {
    id: "map",
    title: "지도 위의 작은 걸음",
    markdown: `유나와 시우는 동네 산책 지도를 만들었다. 지도에서 $1\\,\\text{cm}$가 실제 거리 $100\\,\\text{m}$를 나타내도록 정했다. 집에서 도서관까지 곧은 길은 지도에서 $3\\,\\text{cm}$였으므로 실제 길이는 $300\\,\\text{m}$였다.

도서관에서 공원까지는 다른 곧은 길을 따라 지도에서 $2\\,\\text{cm}$였다. 집에서 도서관을 거쳐 공원까지 걸으면 실제로 $300+200=500\\,\\text{m}$를 가야 했다. 유나는 집과 공원을 곧게 잇는 선을 그었다. 시우가 말했다. “그 선은 실제로 걸을 수 있는 길인지도 확인해야 해.” 지도 위의 두 점 사이 거리와 길을 따라 걷는 거리는 언제나 같지는 않았다.

둘은 지도를 가로와 세로 모두 두 배로 확대했다. 같은 길이 지도에서 두 배로 길어졌지만 동네의 실제 거리가 늘어난 것은 아니었다. 확대된 지도에서는 이제 $1\\,\\text{cm}$가 $50\\,\\text{m}$를 나타냈다. 작은 그림을 읽을 때는 길이만 보지 말고, 그 길이가 무엇을 뜻하는지도 함께 보아야 했다.`,
    reflectionQuestions: [
      "원래 지도에서 실제 $400\\,\\text{m}$인 길은 몇 cm일까요? 두 배로 확대된 지도에서는 몇 cm일까요?",
      "지도에 곧게 그은 선을 실제 산책 경로로 사용할 수 있는지 확인하려면 어떤 정보가 더 필요할까요?",
    ],
  },
  {
    id: "balance",
    title: "저울이 알려 준 약속",
    markdown: `도현은 무게가 같은 구슬만 담긴 작은 주머니 두 개를 양팔저울의 왼쪽에 올렸다. 왼쪽에는 낱개 구슬 세 개도 있었다. 오른쪽에는 같은 구슬 열한 개가 놓여 있었다. 주머니 자체의 무게는 무시할 만큼 가볍다고 정했다. 저울은 수평이었다.

민주는 양쪽에서 낱개 구슬을 세 개씩 내려놓았다. 왼쪽에는 주머니 두 개, 오른쪽에는 구슬 여덟 개가 남았고 저울은 여전히 수평이었다. 두 주머니에 같은 개수의 구슬이 들어 있으니 한 주머니에는 네 개씩 들어 있었다. 처음 상태를 다시 확인하니 $4+4+3=11$이었다.

도현은 왼쪽에서만 구슬을 꺼내면 어떻게 되는지 물었다. 같은 변화가 양쪽에 일어나지 않으면 균형을 유지한다고 말할 수 없었다. 둘은 ‘같다’는 말을 단지 답 앞에 붙이는 기호가 아니라 두 양 사이의 약속으로 보게 되었다. 그 약속을 지키면 보이지 않는 주머니 속도 차근차근 알아낼 수 있었다.`,
    reflectionQuestions: [
      "같은 주머니 두 개와 구슬 다섯 개가 구슬 열세 개와 균형을 이룬다면, 한 주머니에는 몇 개가 들어 있을까요?",
      "두 주머니에 든 구슬 수가 서로 다르다면 한 주머니에 네 개씩 있다고 결론 낼 수 있을까요?",
    ],
  },
  {
    id: "weather",
    title: "평균만으로는 보이지 않는 날씨",
    markdown: `지훈 선생님은 날씨 관찰 모임에서 같은 시각에 잰 기온 기록을 보여 주었다. 첫 주의 나흘은 $18, 20, 22, 20\\,{}^\\circ\\text{C}$였다. 네 기온을 더한 $80$을 $4$로 나누니 평균은 $20\\,{}^\\circ\\text{C}$였다.

다음 기록도 나흘이었다. 기온은 $14, 20, 26, 20\\,{}^\\circ\\text{C}$였다. 합이 다시 $80$이므로 평균은 같았다. 하지만 두 번째 기록에서는 가장 높은 기온과 가장 낮은 기온의 차가 $26-14=12\\,{}^\\circ\\text{C}$였다. 첫 번째 기록의 차는 $22-18=4\\,{}^\\circ\\text{C}$였다. 평균이 같아도 하루하루의 변화는 달랐다.

서연은 기록을 보고 다음 날도 꼭 $20\\,{}^\\circ\\text{C}$일지 궁금해했다. 선생님은 평균은 지난 기록을 한 수로 정리한 값이며, 다음 날을 확정하는 약속은 아니라고 설명했다. 모임 친구들은 평균과 함께 각각의 기록, 관찰한 시각과 장소도 적었다. 숫자를 잘 읽는다는 것은 하나의 수가 보여 주는 것과 아직 보여 주지 못하는 것을 함께 살피는 일이었다.`,
    reflectionQuestions: [
      "$19, 20, 21, 20$의 평균과 가장 큰 값과 작은 값의 차를 구해 보세요. 앞의 두 기록과 무엇이 같고 다른가요?",
      "운동회 옷차림을 정할 때 평균 기온만 보면 충분할까요? 더 확인하고 싶은 정보를 말해 보세요.",
    ],
  },
];

const fit = (suitable: boolean, basis: string): RestStoryFit =>
  Object.freeze({ suitable, basis });

/**
 * The six stories read against the curriculum catalogue, one verdict per age band.
 * The text of a story is the same in every band: where a story relies on mathematics
 * a band has not met, it is withheld rather than rewritten, so no variant text exists.
 */
const suitability: Record<
  RestStoryId,
  Pick<RestStory, "ageBands" | "firstTaught">
> = {
  sharing: {
    firstTaught: { grade: "초3", semester: 1, chapter: "1-3 나눗셈" },
    ageBands: {
      "elementary3-4": fit(
        true,
        "같은 개수로 나누는 나눗셈식과 곱셈식 — 초3 1학기 나눗셈",
      ),
      "elementary5-6": fit(
        true,
        "나눗셈의 뜻과 ‘같은 개수’와 ‘같은 무게’의 구별 — 초3 내용의 복습",
      ),
      "middle1-3": fit(
        false,
        "계산과 생각 나누기 물음이 초3 나눗셈 수준이어서 중학생 독자에게는 낮다",
      ),
    },
  },
  patterns: {
    firstTaught: { grade: "초3", semester: 1, chapter: "1-3 나눗셈" },
    ageBands: {
      "elementary3-4": fit(
        true,
        "세 개씩 되풀이되는 규칙과 나눗셈식 — 초3 1학기 나눗셈, 초4 1학기 규칙 찾기",
      ),
      "elementary5-6": fit(
        true,
        "되풀이되는 규칙과 대응 — 초5 1학기 대응 관계",
      ),
      "middle1-3": fit(
        true,
        "나머지로 차례를 찾는 생각 — 중2 순환소수의 자리 찾기와 같은 구조",
      ),
    },
  },
  garden: {
    firstTaught: {
      grade: "초5",
      semester: 1,
      chapter: "1-6 다각형의 둘레와 넓이",
    },
    ageBands: {
      "elementary3-4": fit(
        false,
        "넓이와 제곱미터는 초5 1학기 다각형의 둘레와 넓이에서 처음 배운다",
      ),
      "elementary5-6": fit(
        true,
        "직사각형의 둘레와 넓이 — 초5 1학기 다각형의 둘레와 넓이",
      ),
      "middle1-3": fit(
        true,
        "둘레가 같아도 넓이가 다를 수 있다는 비교 — 초5 내용 위의 추론",
      ),
    },
  },
  map: {
    firstTaught: { grade: "초6", semester: 1, chapter: "1-4 비와 비율" },
    ageBands: {
      "elementary3-4": fit(
        false,
        "지도의 길이와 실제 거리의 비, 두 배 확대는 초6 1학기 비와 비율의 내용이다",
      ),
      "elementary5-6": fit(
        true,
        "지도 위 길이와 실제 거리의 비 — 초6 1학기 비와 비율",
      ),
      "middle1-3": fit(true, "축척과 확대 — 중2 도형의 닮음과 이어진다"),
    },
  },
  balance: {
    firstTaught: { grade: "초3", semester: 1, chapter: "1-1 덧셈과 뺄셈" },
    ageBands: {
      "elementary3-4": fit(
        true,
        "덧셈과 뺄셈, 같은 수 두 묶음만 쓴다 — 문자식이 없다",
      ),
      "elementary5-6": fit(
        true,
        "양쪽에서 같은 수를 덜어 내는 생각 — 식 없이 읽힌다",
      ),
      "middle1-3": fit(true, "등식의 성질 — 중1 1학기 방정식"),
    },
  },
  weather: {
    firstTaught: { grade: "초5", semester: 2, chapter: "2-6 평균과 가능성" },
    ageBands: {
      "elementary3-4": fit(
        false,
        "평균은 초5 2학기 평균과 가능성에서 처음 배운다",
      ),
      "elementary5-6": fit(true, "평균 구하기 — 초5 2학기 평균과 가능성"),
      "middle1-3": fit(
        true,
        "평균이 같아도 흩어진 정도가 다른 자료 — 중3 대푯값과 산포도",
      ),
    },
  },
};

export const REST_STORIES: readonly RestStory[] = Object.freeze(
  stories.map((story) =>
    Object.freeze({
      ...story,
      reflectionQuestions: Object.freeze([...story.reflectionQuestions]),
      imageId: story.id,
      imageSrc: `/textbook/illustrations/${story.id}.png`,
      ageBands: Object.freeze(suitability[story.id].ageBands),
      firstTaught: Object.freeze(suitability[story.id].firstTaught),
    }),
  ),
);

export function getRestStory(id: string): RestStory | undefined {
  return REST_STORIES.find((story) => story.id === id);
}

const topicRules: readonly [RegExp, RestStoryId][] = [
  [/통계|자료|평균|확률|기온|날씨/, "weather"],
  [/방정식|등식|부등식|항의 계산|문자|대수|저울/, "balance"],
  [/규칙|수열|배열|함수|패턴/, "patterns"],
  [/넓이|둘레|면적|측정|텃밭/, "garden"],
  [/비례|비율|비와|축척|좌표|지도|닮음|도형|각도/, "map"],
  [/분수|나눗셈|나누|소수|곱셈|약수|배수|수와 연산/, "sharing"],
];
function fallbackIndex(grade: string, topic: string): number {
  let index = 0;
  for (const char of `${grade}|${topic}`)
    index = (index * 31 + char.charCodeAt(0)) % REST_STORIES.length;
  return index;
}

/**
 * Topic matching and fallback are deterministic; no generated claim or remote judgment is needed.
 * This one-chapter choice knows neither the reader's age nor the rest of the book, so the same
 * story can repeat. A whole book is planned with {@link planRestStories}.
 */
export function chooseRestStory(input: {
  grade: string;
  chapter: string;
  section: string;
}): RestStory {
  const topic = `${input.chapter} ${input.section}`;
  const matched = topicRules.find(([pattern]) => pattern.test(topic));
  if (matched) return getRestStory(matched[1])!;
  return REST_STORIES[fallbackIndex(input.grade, topic)];
}

const GRADE_ORDER = ["초3", "초4", "초5", "초6", "중1", "중2", "중3"];

export function restAgeBand(grade: string): RestAgeBand | undefined {
  if (grade === "초3" || grade === "초4") return "elementary3-4";
  if (grade === "초5" || grade === "초6") return "elementary5-6";
  if (grade === "중1" || grade === "중2" || grade === "중3") return "middle1-3";
  return undefined;
}

export type RestShortageReason =
  /** The grade is outside 초3–중3. */
  | "unsupported-grade"
  /** No story suits this age band or semester at all. */
  | "no-suitable-story"
  /** Every suitable story is already used earlier in this book. */
  | "all-suitable-stories-used";

export interface RestPlan {
  readonly band: RestAgeBand | undefined;
  /** One entry per chapter, in book order. `story` is null where the page is left out. */
  readonly assignments: readonly {
    readonly chapter: string;
    readonly story: RestStory | null;
    readonly shortage?: RestShortageReason;
  }[];
  /** How many requested rest pages could not be filled, and why. Never zero by omission. */
  readonly shortageCount: number;
  readonly shortages: readonly {
    readonly chapter: string;
    readonly reason: RestShortageReason;
  }[];
  /** Stories that suit this book, used or not. */
  readonly suitableStoryIds: readonly RestStoryId[];
}

/**
 * Rest stories for one book: a story suits the book's age band, relies on nothing taught
 * after the book's semester, and appears at most once. A chapter whose topic matches a
 * story gets that story first; the remaining chapters are then served in book order.
 * When suitable stories run out the chapter gets no story and the plan says how many are
 * missing — it never repeats or substitutes.
 */
export function planRestStories(input: {
  grade: string;
  /** Omit to judge the book as of the end of that grade. */
  semester?: 1 | 2;
  /** Units or chapters in book order; several units of one chapter count once. */
  units: readonly { chapter: string; section?: string }[];
}): RestPlan {
  const band = restAgeBand(input.grade);
  const chapters = input.units.filter(
    (unit, index) =>
      input.units.findIndex((other) => other.chapter === unit.chapter) ===
      index,
  );
  const now =
    GRADE_ORDER.indexOf(input.grade) * 2 + ((input.semester ?? 2) - 1);
  const suitable = band
    ? REST_STORIES.filter(
        (story) =>
          story.ageBands[band].suitable &&
          GRADE_ORDER.indexOf(story.firstTaught.grade) * 2 +
            (story.firstTaught.semester - 1) <=
            now,
      )
    : [];
  const topicOf = (unit: (typeof chapters)[number]) =>
    `${unit.chapter} ${unit.section ?? ""}`;
  const chosen = new Map<string, RestStory>();
  const used = new Set<RestStoryId>();
  const take = (chapter: string, story: RestStory | undefined) => {
    if (!story || used.has(story.id) || !suitable.includes(story)) return;
    chosen.set(chapter, story);
    used.add(story.id);
  };
  for (const unit of chapters) {
    const matched = topicRules.find(([pattern]) =>
      pattern.test(topicOf(unit)),
    )?.[1];
    take(
      unit.chapter,
      REST_STORIES.find((story) => story.id === matched),
    );
  }
  for (const unit of chapters) {
    if (chosen.has(unit.chapter)) continue;
    const start = fallbackIndex(input.grade, topicOf(unit));
    take(
      unit.chapter,
      REST_STORIES.map(
        (_, offset) => REST_STORIES[(start + offset) % REST_STORIES.length],
      ).find((story) => suitable.includes(story) && !used.has(story.id)),
    );
  }
  const assignments = chapters.map((unit) => {
    const story = chosen.get(unit.chapter);
    if (story) return { chapter: unit.chapter, story };
    const shortage: RestShortageReason = !band
      ? "unsupported-grade"
      : suitable.length
        ? "all-suitable-stories-used"
        : "no-suitable-story";
    return { chapter: unit.chapter, story: null, shortage };
  });
  const shortages = assignments.flatMap((entry) =>
    entry.shortage ? [{ chapter: entry.chapter, reason: entry.shortage }] : [],
  );
  return {
    band,
    assignments,
    shortageCount: shortages.length,
    shortages,
    suitableStoryIds: suitable.map((story) => story.id),
  };
}

export function restStoryMarkdown(story: RestStory): string {
  return `${story.markdown}\n\n### 생각 나누기\n\n${story.reflectionQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")}`;
}
