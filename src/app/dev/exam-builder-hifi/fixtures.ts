/**
 * 시험지 만들기 Hi-fi 픽스처 — **지어낸 예**다(실제 문항 · 계정 · 시험지가 아니다).
 * 중2 «일차부등식의 활용» 차시에서 있을 법한 문항을 손으로 적었다. 답은 모두 검산했다.
 * DB · API 를 읽지 않는다.
 */

export const LADDER = [
  "연산",
  "기본",
  "응용",
  "심화하",
  "심화중",
  "심화상",
] as const;
export type Tier = (typeof LADDER)[number];

export type Problem = {
  id: string;
  scope: string;
  tier: Tier;
  format: "객관식" | "단답형" | "서술형";
  origin: string;
  /** 같은 문항류 안의 번호(«2/4») — 없으면 다른 문항류. */
  family?: string;
  body: string;
  choices?: string[];
  /** 원문과 견준 «바뀐 수» — 사람이 읽는 줄(대조판 아래). */
  changes?: string;
};

/** 바꿀 문항 — 시험지의 07번. */
export const ORIGINAL: Problem = {
  id: "p07",
  scope: "일차부등식의 활용",
  tier: "응용",
  format: "객관식",
  origin: "자체 문항",
  family: "1/4",
  body: "한 개에 $800$원인 빵과 한 개에 $1200$원인 우유를 합하여 $15$개 사려고 한다. 전체 금액이 $15000$원 이하가 되게 하려면 우유는 최대 몇 개까지 살 수 있는가?",
  choices: ["$5$개", "$6$개", "$7$개", "$8$개", "$9$개"],
};

/** 첫 층 — 같은 차시 · 같은 문항류의 다른 변형. */
export const FAMILY: Problem[] = [
  {
    id: "f2",
    scope: "일차부등식의 활용",
    tier: "응용",
    format: "객관식",
    origin: "자체 문항",
    family: "2/4",
    body: "한 개에 $700$원인 사탕과 한 개에 $1000$원인 초콜릿을 합하여 $20$개 사려고 한다. 전체 금액이 $17000$원 이하가 되게 하려면 초콜릿은 최대 몇 개까지 살 수 있는가?",
    choices: ["$8$개", "$9$개", "$10$개", "$11$개", "$12$개"],
    changes: "800 → 700 · 1200 → 1000 · 15개 → 20개 · 15000 → 17000",
  },
  {
    id: "f3",
    scope: "일차부등식의 활용",
    tier: "응용",
    format: "객관식",
    origin: "자체 문항",
    family: "3/4",
    body: "한 권에 $1500$원인 공책과 한 권에 $2500$원인 수첩을 합하여 $12$권 사려고 한다. 전체 금액이 $24000$원 이하가 되게 하려면 수첩은 최대 몇 권까지 살 수 있는가?",
    choices: ["$4$권", "$5$권", "$6$권", "$7$권", "$8$권"],
    changes: "800 → 1500 · 1200 → 2500 · 15개 → 12권 · 15000 → 24000",
  },
  {
    id: "f4",
    scope: "일차부등식의 활용",
    tier: "응용",
    format: "단답형",
    origin: "자체 문항",
    family: "4/4",
    body: "한 송이에 $2000$원인 장미와 한 송이에 $3000$원인 백합을 합하여 $10$송이 사고, $1000$원짜리 포장지로 포장하려고 한다. 전체 금액이 $26000$원 이하가 되게 하려면 백합은 최대 몇 송이까지 살 수 있는지 구하시오.",
    changes: "형식 객관식 → 단답형 · 포장비 1000 이 붙음",
  },
];

/** 둘째 층 — 같은 차시의 다른 문항(난이도 · 범위 · 검색으로 찾는다). */
export const OTHERS: Problem[] = [
  {
    id: "o1",
    scope: "일차부등식의 활용",
    tier: "응용",
    format: "객관식",
    origin: "교과서 · 비상",
    body: "연속하는 세 자연수의 합이 $45$보다 작을 때, 이를 만족하는 세 자연수 중 가장 큰 수의 최댓값은?",
    choices: ["$13$", "$14$", "$15$", "$16$", "$17$"],
    changes: "다른 문항류 — 수의 활용",
  },
  {
    id: "o2",
    scope: "일차부등식의 활용",
    tier: "응용",
    format: "단답형",
    origin: "자체 문항",
    body: "현재 형의 예금액은 $50000$원, 동생의 예금액은 $30000$원이다. 다음 달부터 매달 형은 $2000$원씩, 동생은 $5000$원씩 예금할 때, 동생의 예금액이 형의 예금액보다 많아지는 것은 몇 개월 후부터인지 구하시오.",
    changes: "다른 문항류 — 예금",
  },
  {
    id: "o3",
    scope: "일차부등식의 활용",
    tier: "기본",
    format: "단답형",
    origin: "교과서 · 비상",
    body: "가로의 길이가 $8\\,\\text{cm}$인 직사각형의 둘레의 길이가 $30\\,\\text{cm}$ 이상이 되게 하려면 세로의 길이는 몇 $\\text{cm}$ 이상이어야 하는지 구하시오.",
    changes: "다른 문항류 — 도형",
  },
  {
    id: "o4",
    scope: "일차부등식의 활용",
    tier: "응용",
    format: "객관식",
    origin: "자체 문항",
    body: "등산을 하는데 올라갈 때는 시속 $2\\,\\text{km}$, 내려올 때는 같은 길을 시속 $3\\,\\text{km}$로 걸어서 $5$시간 이내에 돌아오려고 한다. 최대 몇 $\\text{km}$까지 올라갔다 올 수 있는가?",
    choices: [
      "$5\\,\\text{km}$",
      "$6\\,\\text{km}$",
      "$7\\,\\text{km}$",
      "$8\\,\\text{km}$",
      "$9\\,\\text{km}$",
    ],
    changes: "다른 문항류 — 거리 · 속력 · 시간",
  },
  {
    id: "o5",
    scope: "일차부등식의 활용",
    tier: "심화하",
    format: "서술형",
    origin: "자체 문항",
    body: "어느 박물관의 입장료는 한 사람에 $5000$원이고, $30$명 이상의 단체는 입장료의 $20\\%$를 할인해 준다. $30$명 미만의 단체가 $30$명의 단체 입장권을 사는 것이 유리하려면 몇 명 이상이어야 하는지 풀이 과정을 쓰시오.",
    changes: "다른 문항류 — 단체 할인",
  },
];

/** 둘째 층에서 «같은 문항류 있음»으로 뺀 수(D-111 — 다른 자리의 문항류). */
export const D111_EXCLUDED = 4;

/** 시험지의 앞뒤 문항 — 검토 칸에 깔리는 배경. */
export const SHEET: (Problem & { no: string })[] = [
  {
    no: "06",
    id: "p06",
    scope: "일차부등식의 풀이",
    tier: "기본",
    format: "단답형",
    origin: "자체 문항",
    body: "일차부등식 $3x-5 \\le 2x+1$의 해를 구하시오.",
  },
  { ...ORIGINAL, no: "07" },
  {
    no: "08",
    id: "p08",
    scope: "일차부등식의 활용",
    tier: "심화하",
    format: "서술형",
    origin: "자체 문항",
    body: "$x$에 대한 일차부등식 $\\dfrac{x-a}{3} > \\dfrac{x}{2}-1$의 해 중 가장 큰 정수가 $4$일 때, 상수 $a$의 값의 범위를 구하는 과정을 쓰시오.",
  },
];

/* ───────────── W4 범위 구성 ───────────── */

export type ScopeRow = {
  id: string;
  label: string;
  detail: string;
  /** 출제 가능(최근 출제를 빼기 전) */
  avail: number;
  /** 그 가운데 최근 14일 시험지에 든 문항 */
  recentHit: number;
  count: number;
  fixed: boolean;
};

export const SCOPES: ScopeRow[] = [
  {
    id: "s1",
    label: "일차부등식의 해와 성질",
    detail: "중2-1 · 부등식",
    avail: 48,
    recentHit: 9,
    count: 5,
    fixed: false,
  },
  {
    id: "s2",
    label: "일차부등식의 풀이",
    detail: "중2-1 · 부등식",
    avail: 62,
    recentHit: 14,
    count: 8,
    fixed: true,
  },
  {
    id: "s3",
    label: "일차부등식의 활용",
    detail: "중2-1 · 부등식",
    avail: 13,
    recentHit: 8,
    count: 5,
    fixed: false,
  },
];

/**
 * 창을 열었을 때의 값 — **기본값이 아니다.** 원장님이 이 시험지에서 이미 정해 둔 조건이라는 예다.
 * 처음 여는 시험지는 총 문항 · 난이도가 모두 «지정 없음»이다(코드는 20 · 6/10/4 를 박지 않는다).
 */
export const START_LADDER: Record<Tier, number | null> = {
  연산: null,
  기본: 6,
  응용: 8,
  심화하: 4,
  심화중: 0,
  심화상: null,
};
export const START_TOTAL = 18;
export const TEST_DATE = "10/16";

export const RECENT_RULE =
  "시험 날짜 10/16 기준 최근 14일 안에 시험 날짜가 있는 내 시험지의 문항은 고르지 않습니다 — 일일테스트와 같은 규칙입니다.";

/* ───────────── W5 이름 붙인 출제 조건 ───────────── */

export type Saved = {
  id: string;
  name: string;
  lastUsed: string;
  /** 정렬용 — 클수록 최근 */
  order: number;
  source: string;
  total: string;
  ladder: string;
  recent: boolean;
  scopes: { label: string; count: number; fixed?: boolean }[];
  /** 지금 적용하면 생기는 일 — 미리 센 결과(적용할 때 다시 센다). */
  applyNote?: { dropped: string[]; short: string[] };
};

export const SAVED: Saved[] = [
  {
    id: "c1",
    name: "중2 확인 · 부등식 18",
    lastUsed: "10/14",
    order: 1014,
    source: "교과서 비상 · 자체 문항",
    total: "18문항",
    ladder: "기본 6 · 응용 8 · 심화하 4 · 심화중 0",
    recent: true,
    scopes: [
      { label: "일차부등식의 해와 성질", count: 5 },
      { label: "일차부등식의 풀이", count: 8, fixed: true },
      { label: "일차부등식의 활용", count: 5 },
    ],
  },
  {
    id: "c2",
    name: "일일 8문항 · 쉬운 쪽",
    lastUsed: "10/13",
    order: 1013,
    source: "출처 전부",
    total: "8문항",
    ladder: "연산 2 · 기본 6",
    recent: true,
    scopes: [{ label: "연립방정식의 풀이", count: 8 }],
    applyNote: {
      dropped: [],
      short: ["연립방정식의 풀이 — 최근 출제를 빼면 기본 5문항뿐(6 필요)"],
    },
  },
  {
    id: "c3",
    name: "단원 마무리 25",
    lastUsed: "9/30",
    order: 930,
    source: "교과서 비상",
    total: "25문항",
    ladder: "응용 15 · 심화하 10",
    recent: false,
    scopes: [
      { label: "유리수와 순환소수", count: 6 },
      { label: "단항식의 계산", count: 7 },
      { label: "다항식의 계산", count: 6 },
      { label: "식의 대입과 변형", count: 6 },
    ],
    applyNote: {
      dropped: ["식의 대입과 변형 — 지금 출제 가능 문항이 없음"],
      short: [],
    },
  },
  {
    id: "c4",
    name: "중1 문자와 식 보충",
    lastUsed: "9/12",
    order: 912,
    source: "자체 문항",
    total: "지정 없음(행의 합 12)",
    ladder: "난이도 지정 없음",
    recent: true,
    scopes: [
      { label: "문자의 사용과 식의 값", count: 6 },
      { label: "일차식의 계산", count: 6 },
    ],
  },
];

export const RESTORE_RULE =
  "조건만 가져옵니다 — 출처 · 범위 행(수 · 고정) · 총 문항 · 난이도 · 최근 출제 빼기. 문항은 [문항 구성]으로 새로 고르고, 지면 양식은 담지 않습니다.";
