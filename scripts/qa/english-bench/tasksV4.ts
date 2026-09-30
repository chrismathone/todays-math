/**
 * 오늘의 영어 모델 벤치 — v4(주제 · 내용 일치의 수렴 단서) 과제 열둘 (D-151 · 25 §12.8 · §12.9).
 *
 * 3자 합의의 재는 법: «개발에 쓰지 않은 새 지문 12개 이상 · 기존안(v3)과 두 판을 같은 조건으로 · 지문 단위로».
 * 🔴 지문은 **우리가 지은 글**이다(교재 · 출판사 · 모의고사 지문 아님 · 지어낸 통계 없음). 앞선 벤치(`tasks.ts`)의
 * 두 지문(창의성 · 수면)은 프롬프트 v2 · v3 를 고치며 계속 봤기 때문에 여기서는 쓰지 않는다.
 * 제작 방식은 제품의 주된 길인 «원문 유지». 유형은 재려는 둘(주제 · 내용 일치) 각 하나.
 */
import type { BenchTask } from "./tasks";

interface Source {
  id: string;
  label: string;
  grade: BenchTask["grade"];
  difficulty: BenchTask["request"]["difficulty"];
  passage: string;
}

const SOURCES: Source[] = [
  {
    id: "V01-trap-street",
    label: "지도 속 가짜 길 · 중3",
    grade: "중3",
    difficulty: "표준",
    passage:
      "Mapmakers once had a serious problem. Drawing an accurate map took years of measuring and walking, but copying a finished map took only a few days. To protect their work, some mapmakers added a small mistake on purpose. They drew a short street that did not exist or gave a real lane a false name. These details were too small to confuse travelers, so ordinary users never noticed them. However, if the same invented street appeared on another company's map, the original maker knew that the map had been copied. The false street worked like a hidden signature. Today digital maps are made in a different way, yet similar tricks are still used in dictionaries and databases. A harmless error, placed carefully, can prove who did the real work.",
  },
  {
    id: "V02-railway-time",
    label: "철도와 표준시 · 중3",
    grade: "중3",
    difficulty: "표준",
    passage:
      "Before railways, every town kept its own time. People set their clocks by the sun, so noon in one town came a few minutes earlier or later than noon in the next. This caused no trouble when travel was slow. A person on horseback hardly noticed the difference. Trains changed everything. A railway timetable that listed dozens of local times was confusing, and mistakes could even lead to accidents on shared tracks. Railway companies therefore began to use a single time along their lines. At first many citizens disliked this railway time because it did not match the sun above their town. Over the years, however, shops, schools, and governments accepted it. Standard time was not invented by scientists studying the sky. It grew out of the practical need to make trains run safely.",
  },
  {
    id: "V03-night-flowers",
    label: "밤에 피는 사막의 꽃 · 중3",
    grade: "중3",
    difficulty: "표준",
    passage:
      "Most flowers open in the morning, when bees and butterflies are active. In hot deserts, however, some plants wait until sunset to bloom. Opening at night helps them in two ways. First, the cool air keeps the flowers from losing too much water. Second, their main visitors are moths and bats, which fly after dark. Because colors are hard to see at night, these flowers are usually white or pale, and they give off a strong sweet smell that animals can follow from far away. Many of them last for only one night and close before the morning sun becomes strong. To a daytime visitor, the plant may look as if it never flowers at all. Its most important work is simply done while people are asleep.",
  },
  {
    id: "V04-crowd-guess",
    label: "군중의 추측 · 중3",
    grade: "중3",
    difficulty: "표준",
    passage:
      "At a country fair, visitors are sometimes asked to guess the weight of a large animal. Individual guesses are often far from the truth, yet the average of all the guesses can be surprisingly close. Some people guess too high and others too low, so their errors cancel each other out. This only works under one condition: each person must guess alone. When visitors hear earlier answers before writing their own, they tend to move toward those numbers. The guesses become more similar, but the average does not become more accurate. In fact, it often gets worse, because everyone now shares the same mistake. A crowd is wise when its members think independently. When they simply follow one another, a thousand voices carry little more information than one.",
  },
  {
    id: "V05-note-taking",
    label: "손 필기와 타자 · 고1",
    grade: "고1",
    difficulty: "표준",
    passage:
      "Students who take notes by hand often remember lectures better than those who type, and many people assume that the pen itself has some special power. Research suggests a less romantic explanation. Typing is fast enough to record a speaker's words almost exactly, so typists tend to copy without thinking. Writing by hand is slower, which forces the writer to choose what matters and to put it in shorter words. That act of selecting and rephrasing is what strengthens memory. In experiments, typists who were told to summarize in their own words narrowed the gap, while hand-writers who tried to copy every sentence lost much of their advantage. The lesson is not that keyboards should be banned from classrooms. It is that note-taking helps learning only when it requires the mind to process ideas rather than merely transport them.",
  },
  {
    id: "V06-donated-clothes",
    label: "기부한 옷의 여정 · 고1",
    grade: "고1",
    difficulty: "표준",
    passage:
      "Donating used clothes feels like a simple act of kindness, but the journey of a donated shirt is more complicated than most givers imagine. Only a small share of donated clothing is handed directly to people in need. Much of it is sorted, packed into large bundles, and sold to traders in other countries. There the clothes are cheap, and buyers welcome the low prices. Local tailors and small factories, however, cannot easily compete with goods that cost almost nothing to produce. In some regions, clothing workshops that once employed many people have closed. This does not mean that donation is harmful in itself. It means that generosity has economic effects far from the place where it begins, and that those who give should ask where their gifts actually go.",
  },
  {
    id: "V07-color-words",
    label: "색 이름과 필요 · 고1",
    grade: "고1",
    difficulty: "표준",
    passage:
      "Languages do not divide colors in the same way. Some have separate everyday words for light blue and dark blue, while others use one word for both blue and green. It is tempting to conclude that speakers of the second kind of language see fewer colors, but tests show that their eyes work just like everyone else's. The difference lies in what a community needs to talk about. A word becomes common when people must often distinguish one thing from another, such as ripe fruit from unripe fruit or one dyed cloth from another. Where such distinctions rarely matter, a single broad term is enough. As trade, technology, and fashion introduce new objects, new color words usually follow. Vocabulary, in other words, records the history of a people's practical concerns rather than the limits of their vision.",
  },
  {
    id: "V08-tree-placement",
    label: "가로수의 자리 · 고1",
    grade: "고1",
    difficulty: "표준",
    passage:
      "Cities plant trees to fight summer heat, and success is usually reported as a number: so many thousand trees in a year. Yet the cooling effect of a tree depends heavily on where it stands. A tree shading a wide asphalt road or the sunny wall of a building prevents those surfaces from storing heat during the day and releasing it at night. The same tree planted in the middle of a park that is already green adds comparatively little. Trees also cool the air by releasing water, but only if their roots receive enough of it; a thirsty tree in a small pit of dry soil does almost nothing. For these reasons, some city planners now map the hottest streets first and choose planting sites one by one. Counting trees is easy. Placing them where they matter is what changes the temperature.",
  },
  {
    id: "V09-boredom",
    label: "지루함이 하는 일 · 고2",
    grade: "고2",
    difficulty: "심화",
    passage:
      "Boredom is commonly treated as wasted time, something to be eliminated as quickly as possible. Psychologists who study it propose a different reading: boredom is a signal that the current activity no longer offers meaning or challenge, and it pushes the mind to search for something that does. In laboratory studies, participants who first completed a dull task later produced more varied ideas than those who had not, apparently because their attention had already begun to wander in search of stimulation. The benefit, however, is conditional. It appears when the wandering mind is left to its own resources. If the uncomfortable feeling is immediately relieved by a screen, the search ends before it has produced anything. What modern life removes, then, is not boredom itself but the interval in which boredom does its work. Protecting that interval may matter more than filling it.",
  },
  {
    id: "V10-placebo-cues",
    label: "위약과 기대 · 고2",
    grade: "고2",
    difficulty: "심화",
    passage:
      "A pill containing no active ingredient can still relieve symptoms, and the strength of this placebo effect is shaped by details that have nothing to do with chemistry. Patients tend to report greater relief from capsules than from tablets, from two pills than from one, and from a treatment that seems expensive than from one described as cheap. Such findings are sometimes cited as proof that patients are easily fooled. A more careful interpretation is that the body responds to expectations, and expectations are built from cues that usually are informative: in everyday experience, stronger medicine often does come in a more serious form. The effect therefore reveals not foolishness but the ordinary way in which people use available signs to predict what will happen to them. For doctors, the implication is uncomfortable yet practical. How a treatment is presented is part of the treatment.",
  },
  {
    id: "V11-city-birds",
    label: "떠나지 않는 도시의 새 · 고2",
    grade: "고2",
    difficulty: "심화",
    passage:
      "Migration is often described as an instinct fixed deep in a bird's nature, but the behavior of some city-dwelling populations suggests that it is closer to a calculation. Flying thousands of kilometers is dangerous and costly; birds undertake it because staying would be worse. In many cities, winter no longer imposes that penalty. Buildings and traffic keep the air slightly warmer, street lamps lengthen the hours in which food can be found, and people leave scraps or fill feeders. Under these conditions, certain birds that once left every autumn now remain all year, while members of the same species in the nearby countryside continue to migrate. Observers should be cautious about calling this an improvement. Birds that stay depend on resources that a single hard winter or a change in human habits could remove. A journey abandoned is not easily relearned.",
  },
  {
    id: "V12-free-shipping",
    label: "무료 배송의 문턱 · 고2",
    grade: "고2",
    difficulty: "심화",
    passage:
      "Online stores frequently promise free delivery on orders above a certain amount, and the policy is usually presented as a gift to the customer. Its real function is to change the size of the basket. A shopper whose purchases fall just below the line faces a choice between paying a delivery fee that buys nothing and adding one more item that at least can be used. Most choose the second option, even when the added item costs more than the fee they avoided. The store thus sells more per order, while the customer feels that money has been saved. Notably, the effect weakens when the threshold is set far above what people normally spend, since the goal then seems out of reach. The most profitable line is therefore not the highest one, but the one placed slightly beyond the typical order.",
  },
];

export const V4_TASKS: BenchTask[] = SOURCES.map((s) => ({
  id: s.id,
  label: s.label,
  grade: s.grade,
  request: {
    mode: "original",
    topic: "",
    passage: s.passage,
    difficulty: s.difficulty,
    count: 2,
    words: 150,
    types: ["주제", "내용 일치"],
  },
}));
