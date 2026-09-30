코드는 읽기만 하고, 저장소의 영어 생성·검증 경로와 한국 내신·LLM 문항 품질 연구를 같이 조사하겠습니다.생성·붙여넣기·원문 복원 경로와 관련 시험을 이어서 읽고, 한국 출제 원리·LLM 문항 품질 연구를 병렬로 검색합니다.핵심 논문·KICE 문서·저장소 생성 경로를 더 열어, 수치와 파일 단위 변경안이 근거에 붙도록 맞춥니다.근거 수치와 코드 위치를 맞춰 보고서를 정리합니다.# 조사 보고 — «오늘의 영어» 외부지문 내신 문항 품질 초고도화

읽기만 했다. 코드는 바꾸지 않았다. 확실하지 않은 수치·문서·내부 매뉴얼은 **확인 못 함**으로 적는다.

---

## 0. 지금 제품이 재는 것 / 안 재는 것

세 길(ChatGPT 붙여넣기 · `makeCloze` · DeepSeek)이 **같은 검증기** `validateEnglishDraft`를 지난다 (`src/lib/english/validate.ts`, `docs/planning/25-english-studio.md` §4.4).

| 지금 재는 것 | 안 재는 것 |
|---|---|
| 유형 enum, 객관식 보기 5개·중복 없음, 정답 `"1"`–`"5"`, 서술형/원문복원 보기 없음 | 정답이 유일한가 |
| `evidence`가 지문의 연속 인용 | 오답이 매력적인가 |
| 요청 문항 수·유형 집합·각 유형 ≥1 | 어법 오류가 진짜 하나인가 |
| `original`이면 지문 한 글자도 안 바뀜 | 삽입 자리가 유일한가 |
| JSON 파싱 실패 시 DeepSeek **한 번만** 재시도 (`generate.ts` + `withOneRetryOnParseFailure`) | 난이도(기본/표준/심화)가 실제로 갈리는가 |
| 검증 실패는 **재시도하지 않고** `ENGLISH_DRAFT_REJECTED` + 문항별 한 줄 | 지문 없이 찍히는가(guessability) |

프롬프트 v1 (`src/lib/ai/prompts/englishExam.ts`)도 검증기가 받는 모양 규칙만 적는다. 유형 안내는 한 줄이다. 주석이 이미 말한다: 프롬프트만으로는 AI가 지키지 않는다.

실물 표본(25 §11): `--mode original --count 2` 한 번, **12.8초**, 모양 검증 통과. 품질 표본은 이 한 건뿐이다.

---

## 1. 한국 내신·수능 영어 — 유형별 출제 원리와 «좋은 문항»

### 1.1 공개된 공식 문서가 말하는 것

평가원이 **문항작성자 내부 핸드북**(오답 설계 레시피·정답 유일성 점검표)을 공개했다는 기록은 **확인 못 함**. 공개물은 출제 방향·학습 방법 안내·시행요강·학업성취도 결과다.

**수능 영어의 성격** (평가원 *2026학년도 대학수학능력시험 학습 방법 안내*): 교육과정 성취기준 달성 + 대학 수학에 필요한 영어 사용 능력. 읽기는 «배경지식과 글의 단서를 활용해 의미를 이해하는 상호작용적 독해», 간접 쓰기는 요약·문단 구성.

- https://www.goebc.kr/upload/bbh-h/na/bbs_4418/2025/04/AE3E15DF-5218-ED1A-EB83-4596C5DCA18A.pdf

**2026 수능 출제 방향** (시험 당일 출제본부):

- 범위: 영어Ⅰ·영어Ⅱ, 다양한 소재.
- 어휘: 교육과정 **기본 어휘** + 사용 빈도 높은 어휘.
- 배열: 중심 내용·맥락 → 세부 정보 → 언어형식·어휘 → 빈칸 → 쓰기 → 복합.
- 유의: 인문·사회·자연·예술·문학 균형. 과도한 추상 표현 배제(EBS·출제본부 브리핑).
- 읽기 28문항: 맥락 추론 7(목적·심경·주장·빈칸 4) · 중심 내용 3(요지·주제·제목) · 함축 1 · 세부 4(도표·내용·실용) · 언어형식 1 · 어휘 1 · 간접쓰기 6(흐름·순서 2·삽입 2·요약) · 복합(1지문 2문항, 1지문 3문항).

근거:

- https://www.lecturernews.com/news/articleView.html?idxno=190667
- https://www.newscj.com/news/articleView.html?idxno=3339780
- https://edu.chosun.com/site/data/html_dir/2025/11/13/2025111380250.html

**2026 수능 채점 결과**: 영어 1등급(90점 이상) **3.11%**. 절대평가 도입(2018) 이후 최저. 평가원장은 의도보다 어려웠다고 밝혔다. 오승걸 원장: 빈칸·간접쓰기에서 정답률이 목표보다 낮았다. 목표 언급: 1등급 **6–10% 내외**.

- https://www.yna.co.kr/view/AKR20251204103651530
- https://biz.chosun.com/en/en-policy/2025/12/04/LDV643VBE5GRNH6IAYIBFVUTOY/

**2027 출제 개선** (교육부·평가원, 2026-03-31): 현장 교사 비율 약 **50%**, AI는 **난이도 예측·유사 문항 검토**에 쓴다. 지문 초안 AI 활용은 «검토» 단계. 2026 수능 영어에서 출제 중 문항 **42.2%(19/45)** 가 교체되어 난이도 조정이 밀렸다는 교육부 점검이 있다.

- https://biz.chosun.com/en/en-policy/2026/03/31/US6UWG5SVBETXBCUO52N76FRU4/
- https://koreajoongangdaily.joins.com/news/2026-02-14/national/socialAffairs/Govt-considers-AI-to-draft-future-CSAT-English-section-after-criticism-of-last-years-test-difficulty/2522663

평가원 AI 문항 생성 사업(약 31.5억) 보도는 있다. **2027 본시험 문항을 AI가 낸다는 확정은 확인 못 함.**

- https://m.search.daum.net/search?w=tot&q=%EC%88%98%EB%8A%A5%20%EC%98%81%EC%96%B4 (디지털데일리 헤드라인 인용)

**국가수준 학업성취도 영어** (평가원 2024 결과 분석): 영역=듣기·말하기·읽기·쓰기, 역량=의사소통·지식정보처리·공동체, 맥락=개인·사회. CBT 단순선택형은 **5지 1정답** 라디오버튼. 문항마다 성취기준·정답률·변별도를 공개한다. 예: 고등 영어 한 문항 정답률 62.76, 변별도 0.55.

- https://kice.re.kr/filedown8.do?fileNM=ORM202507406%20%EC%8B%9C%EA%B8%B0%EC%9E%90.pdf&filePath=/resrchBoard/2025/09/1758168517641_66686109149812234.pdf

**고난도(«킬러») 문항의 실측** (Kim & 동료, *English Teaching* 80(3), 2025): 2018–2025 수능·6월·9월 모의 중 메가스터디 추정 고난도 **105문항**, 평균 정답률 **39.57%**. 1등급 비율 2018 **10.03%** → 2024 **4.71%**(논문이 인용한 집계). 어휘는 CEFR 프로파일로 봤다.

- https://files.eric.ed.gov/fulltext/EJ1485104.pdf

**빈칸 유형의 평가 요소** (학습 방법 안내): 주제문·주요 세부와 논리적 흐름을 보고 빈칸 표현을 추론. 성취기준 `[12영Ⅰ/Ⅱ03-03]`. 빈칸은 글의 핵심이 놓이는 자리에 둔다.

**어휘 상한** (2015 개정 영어과 교육과정): 기본 어휘 **3,000** 대표형. 초등 권장 `*`, 진로·전문 `**`. 과목별 상한 예: 중학 누계 1,250 내외, 공통 영어 1,800, 영어Ⅰ 2,000, 영어Ⅱ 2,500.

- http://textbook-miraen.cdn.x-cdn.com/textbook/newbook/curriculum/%EB%B3%84%EC%B1%8514_%EC%98%81%EC%96%B4%EA%B3%BC%20%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95.pdf
- 이문복·신동광 (2015), KBEWL 개발: https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002049360
- 2022 개정 기본어휘 개정 요지: Lee (2023), *Korean Journal of English Language and Linguistics* 23, 59–88. http://journal.kasell.or.kr/xml/35608/35608.pdf

### 1.2 내신 쪽 — 학교 성적 관리가 요구하는 «좋은 서술형»

시·도 학업성적관리 시행지침이 학교 내신의 강제 틀이다. 수능 매뉴얼보다 여기가 서술형 품질의 SSOT다.

공통으로 반복되는 조항:

- 국어·수학·영어·사회·과학은 학기 환산점의 **서술·논술형 20% 이상**(중학교 다수) 또는 정기시험 만점의 **30% 이상**(일부 고교 지침). 단답·완성형은 서술형으로 세지 않는다.
- 출제 전 **문항정보표(이원목적분류표)**.
- 서술형은 **채점 기준표 필수**: 모범 답안, 유사 답안, 부분 점수, 단계별 점수.
- 공동 채점(2인)을 원칙으로 하는 교육청이 있다.

근거 예:

- 영신중 학업성적관리규정: https://school.cbe.go.kr/yongshin-m/M01050503/
- 대전 모 중학교 규정 PDF: https://school.cbe.go.kr/files/2025/04/daeje-m/1cd77acb98c344139a7728f19bcb9b50/
- 경남교육청 고교 지침(서·논술형 30%): https://www.pen.go.kr/upload/dep07/na/bbs_2629/ntt_1164293/doc_dc66vf893=7fvf3=45vbd=92v0e=15bbvdd97vf056_v9335.pdf
- 경기도 2025 중·고 학업성적관리 시행지침 안내: https://www.goe.go.kr/goe/na/ntt/selectNttInfo.do?nttSn=1056465&mi=10961

제품의 서술형 필드(`answer` + `explanation`에 부분점수)는 이 틀과 맞다. 검증기는 채점 기준이 **비어 있지 않은지·요소가 쪼개져 있는지**는 안 본다.

### 1.3 변형문제 업계 관행 (쎈·마더텅·이투스·EBS 변형)

출판사별 **내부 출제 매뉴얼**은 확인 못 함. 공개되어 반복되는 패턴은 이것이다.

**한 지문 → 유형 격자.** EBS 수능특강/영어독해연습 지문을 요지·주제·일치·어법·어휘·빈칸·순서·삽입·요약·서술형으로 다시 낸다. 샘플:

- 수능특강 변형 묶음(요지·어법 괄호·빈칸이 같은 지문): https://files-scs.pstatic.net/2025/04/22/LjdAbh3hMk/2%EA%B0%95%20%EB%B3%80%ED%98%95%EB%AC%B8%EC%A0%9C_%EC%83%98%ED%94%8C%ED%8C%8C%EC%9D%BC.pdf
- 나눔영어 EBS 내신 변형 자료(어법선택·어법수정·문장삽입·빈칸어휘가 같은 원문): https://orbi.kr/download/united/62476226/1
- 블루티쳐 유형 파일 목록(빈칸·삽입·순서·어법·어휘·연결어·어순): https://wayne.tistory.com/1691

**상업 AI 변형기**도 같은 격자를 판다. PlanA AI: 객관식 21 + 서술형 18, «원본+5단계 변형». 품질 주장은 마케팅이다. 유형 목록은 업계 기대를 보여 준다.

- https://plana-ai.com/

**변형 원리(현장 자료에 반복되는 것):**

- 첫 문장·역접·지시어·끝 문장이 빈칸·주제·삽입의 자리.
- 어법은 «원문 유지 + 밑줄 다섯 중 하나만이 틀린 형태».
- 어휘는 밑줄 다섯 중 문맥상 쓰임이 틀린 하나(반의어·형태 유사).
- 삽입은 주어진 문장을 본문에서 빼고 ①–⑤ 자리를 둔다.
- 내용 일치는 한국어 보기, 숫자·고유명·극성(긍정/부정)을 뒤집어 오답을 만든다.

이투스·마더텅의 **공개 출제 가이드북**은 확인 못 함. 시중 교재 목차와 EBS 변형 PDF가 관행의 증거다.

### 1.4 유형별 «좋은 문항»과 매력적 오답

아래는 평가원 평가 요소 + Haladyna 지침 + 한국 변형 관행을 겹친 것이다. Haladyna, Downing & Rodriguez (2002) 31개 지침이 교실·대규모 선다형의 공통 기준이다.

- https://doi.org/10.1207/S15324818AME1503_5
- 요약: https://cpl.health.unm.edu/AssetListing/Writing-Questions-for-Learning-and-Assessment-JiTL-2573/Rules-for-Multiple-Choice-Items-Haladyna-et-al-2002-5943

| 유형 | 측정 목표 | 좋은 문항 | 매력적 오답 | 자주 나오는 결함 |
|---|---|---|---|---|
| 주제·요지·제목 | 중심 내용 추론 | 지문 전체를 묶는 한 명제의 패러프레이즈. 보기는 같은 문법 층(모두 NP 또는 모두 절) | 너무 좁은 세부, 너무 넓은 일반론, 반대 주장, 지문 단어만 반복한 미끼 | 정답만 지문 단어를 반복(word repeats). 제목을 주제로 물어 보기가 섞임 |
| 내용 일치/불일치 | 세부 정보 | 한국어 보기 5. «일치» 또는 «불일치»를 발문에 고정. 정답 1개 | 숫자·주체·극성·조건(always/some)만 뒤집은 문장. 지문에 없는 그럴듯한 사실 | 보기 2개가 동시에 참. 지문 밖 상식으로 정답이 보임 |
| 어법(언어형식) | 정확한 형식 | 밑줄 5, **틀린 것 하나**. 오류는 교육과정 언어형식(수일치, 시제, 태, 관계사, 분사, 비교, 도치, 병렬) | 한국 학습자가 실제로 틀리는 자리. 나머지 넷은 원문과 동일하고 문법적으로 맞음 | 오류가 둘. 밑줄이 원문에 없음. «어색함»이지 오류가 아님. 어휘 문항과 혼동 |
| 어휘 | 문맥상 쓰임 | 밑줄 5, 문맥상 적절하지 않은 하나. 형태는 맞되 의미가 반대·과함 | 반의어, 형태 유사(economic/economical), 주제 관련 오용 | 제품 **유형 목록에 없음** |
| 빈칸 추론 | 논리 관계 | 빈칸은 주제문 또는 논지 전환 자리. 정답은 원문 핵심의 재진술 | 반의, 부분만 맞는 말, 지문 소재만 같고 관계가 다른 말, 빈칸 문장만 보면 되는 말 | 빈칸이 지엽. 정답이 원문 구절 복붙이라 독해가 아님. 오답이 문법 불일치 |
| 순서 | 담화 표지 | 지시어·접속·정관사 단서가 자리마다 갈림 | 인접 두 순서가 거의 가능해 보이는 배열 | 제품 **유형 목록에 없음** |
| 문장 삽입 | 응집 | 주어진 문장이 본문에서 빠짐. 자리 5개. 대명사·접속·정보 구조가 **한 자리만** 연다 | 앞뒤가 느슨한 인접 자리 | 주어진 문장이 본문에 남아 있음. 자리가 4개. 두 자리에 넣어도 글이 됨 |
| 요약 | 중심 내용 쓰기 | 요약문의 두 빈칸이 서로 다른 층(과정 vs 결과) | 세부 사실, 반대 요지 | 제품 **유형 목록에 없음** |
| 서술형 | 산출 | 채점 요소가 쪼개짐. 인정 답안이 여럿 | (오답 없음) 부분점수 기준이 채점 요소 | 모범만 있고 유사 답안이 없음. 단답을 서술형이라 부름 |
| 원문 복원 | 정확 재생 | 빈칸이 학습 가치가 있는 어휘 | — | 지금 규칙: 가장 긴 6글자+ 단어. 기능어·고유명도 뽑힘 |

Haladyna에서 이 제품에 바로 쓰는 지침: 정답 하나, 오답은 그럴듯하고 서로 독립, 보기 길이·문법 평행, 절대어(always/never) 남용 금지, 발문에 단서가 정답에만 반복되지 않기, «모두 맞다/모두 틀리다» 금지, 부정 발문은 표시.

수능 영어는 5지 1정답이므로 «3지선다면 충분하다»(Haladyna)는 한국 내신 관행과 충돌한다. **보기 수는 5로 유지**하는 것이 맞다.

제품 유형 집합(`ENGLISH_QUESTION_TYPES`)은 수능 읽기의 **부분집합**이다. 주제 안내에 «주제·제목·요지»를 한 유형으로 묶었다. 어휘·순서·요약·무관한 문장·함축은 없다. 내신 변형 격자 기준으로는 빠진 칸이 크다.

---

## 2. LLM으로 독해 객관식 품질을 높이는 연구 (2023–2026)

지어낸 논문은 없다. 초록·공식 페이지에서 확인한 수치만 적는다.

### 2.1 오답(distractor) 생성

**Alhazmi et al. (2024)** — *Distractor Generation in Multiple-Choice Tasks: A Survey*. EMNLP 2024. 방법·데이터·평가 지표를 정리한 서베이. 핵심: 오답 품질이 문항 품질을 가른다. BLEU/ROUGE 같은 MT 지표는 오답 평가에 부적합.

- https://arxiv.org/abs/2402.01512
- https://aclanthology.org/2024.emnlp-main.799/

**Raina, Liusie & Gales (2023)** — *Assessing Distractors in Multiple-Choice Tests*. Eval4NLP. 오답을 **틀림 / 그럴듯함 / 다양성** 세 축으로 자동 측정. 틀림=이진 MRC 분류, 그럴듯함=멀티클래스 MRC가 오답에 주는 확률 질량, 다양성=임베딩 중복.

- https://aclanthology.org/2023.eval4nlp-1.2/
- https://ar5iv.labs.arxiv.org/html/2311.04554

**Bitew et al. (ECML PKDD 2023 / 책 2025)** — ChatGPT에 문제은행에서 고른 in-context 예를 넣어 오답을 생성. 교사 평가에서 제시된 오답의 **평균 53%**가 «그대로 쓸 수 있는 고품질». zero-shot·고정 few-shot보다 나았다.

- https://link.springer.com/chapter/10.1007/978-3-031-74627-7_4

**DISTO (EDM 2024)** — 오답 전용 학습 평가 지표. 사람 평정과 상관이 높고, MT 지표가 매기는 모델 순위와 **다른** 순위를 낸다.

- https://zenodo.org/records/12729766

**Taslimipoor et al. (LREC-COLING 2024)** — 생성 후 판별기로 정답/오답을 가르고, 의미 군집에서 대표 오답만 고른다. 단어 단위·긴 구 단위 독해 오답 모두 이전 모델보다 나았다.

- https://aclanthology.org/2024.lrec-main.452.pdf

**LookAlike (BEA 2025)** — 수학 MCQ. LLM-as-judge 기준 오답 생성 **51.6%**, 오류 생성 **57.2%** (기존 SOTA 45.6% / 47.7%).

- https://aclanthology.org/2025.bea-1.23/

**AIED 2025** — *Systematic Control of Multiple-Choice Item Difficulty Through LLM-Based Distractor Generation*. 정답은 고정하고 오답의 어휘·형태·구문 복잡도만 바꿔 난이도를 조절. 학생 응답으로 IRT 모수를 추정해 «난이도가 실제로 움직였는지»를 확인했다. 수치 표는 유료 본문. **확인 못 함(상세 계수).**

- https://link.springer.com/chapter/10.1007/978-3-031-99261-2_14

**NLI 필터 (AIED 2024)** — 생성된 오답 중 정답과 함의·동의인 것을 NLI로 제거.

- https://link.springer.com/chapter/10.1007/978-3-031-64299-9_18

**개념 오개념을 오답에 넣는 프레임 (2025)** — 물리 개념 지도. 전문가 기준 전 항목 충족 **75.20%** vs 베이스라인 약 **37%**. 학생 추측 성공률 **28.05%** vs **37.10%**(오답이 더 속임).

- https://arxiv.org/abs/2505.02850

한국 내신 독해에 바로 옮기면: 오답을 «아무 틀린 문장»이 아니라 **학습자 오류 유형**(극성 반전, 지시 대상 교체, 접속 관계 교체, 수능 어법 전형 오류)으로 생성하고, NLI/재풀이로 «우연히 맞는 오답»을 걸러야 한다.

### 2.2 풀어서 검증하기 (answerability · 유일 정답)

**Säuberli & Clematide (2024)** — *Automatic Generation and Evaluation of Reading Comprehension Test Items with Large Language Models*. READI @ LREC-COLING. 독일어 B1 지문. Llama 2와 GPT-4로 3지선다 생성.

핵심 지표 **text informativity** = (지문 보고 맞힌 비율, answerability) − (지문 없이 찍은 비율, guessability). 좋은 문항은 지문이 답을 알려 주고, 지문 없이는 못 찍는다.

사람 평가자 기준 text informativity (Table 1):

| 생성자 | 값 (사람 평가자) | 95% CI |
|---|---|---|
| 사람 문항 | **0.294** | [0.220, 0.367] |
| GPT-4 문항 | 0.259 | [0.193, 0.328] |
| Llama 2 문항 | 0.187 | [0.115, 0.262] |

관측: 사람 문항이 **찍기 가장 어려움**. GPT-4 문항이 **지문 보고 가장 잘 풀림**. Llama 2가 informativity 최저. 자동 평가에서 GPT-4 풀이자가 사람과 가장 비슷했다. 저자 후속 코멘트: 상관은 강하지 않아 **제로샷 LLM 파일럿만으로 교육 시험을 대체하면 안 된다**.

- https://arxiv.org/abs/2404.07720
- https://aclanthology.org/2024.readi-1.3
- PDF 수치: https://aclanthology.org/2024.readi-1.pdf

이 프로토콜이 이 제품에 가장 잘 맞는다. DeepSeek가 만든 5지선다를 **다른 모델이** (1) 지문 없이, (2) 지문 보고 풀게 하면 된다.

**ChatGPT 독해 MCQ vs 사람 문항 (System, 2024)**: 심리측정(2PL IRT, 오답 분석)과 전문가 판단에서 ChatGPT 문항이 사람 문항과 비교 가능. «잠재력 있다»이지 «동등하다»가 아니다.

- https://www.sciencedirect.com/science/article/abs/pii/S0346251X2400126X

**한국: LLM-CoT로 수능 함축 문항 생성** (김혜진·이희경, 2025). GPT-4o로 프로토타입, GPT-5로 최종. 조건 3개(Basic / Reasoning / Self-review)로 45문항, 평가원 기출 15문항과 비교. LLM 문항이 어휘 복잡도가 더 높고 구문 프로파일이 달랐다. **Basic이 기출과 가장 비슷**. Reasoning·Self-review는 추론 요구는 커지나 국소 단서에 더 의존. 결론: 어휘 난이도 제어 + 단서 배치 + 사람 검토 + self-review CoT를 같이 쓸 것. ANOVA 상세 수치·어떤 GPT-5 스냅샷인지는 유료 원문. **확인 못 함(계수).**

- https://scholar.kyobobook.co.kr/article/detail/4010071793833

### 2.3 Self-critique · 검증 에이전트

**Self-Refine (Madaan et al., 2023, NeurIPS)**. 같은 LLM이 생성 → 피드백 → 수정. 7개 과제에서 직접 생성 대비 평균 약 **+20%p**. 과제별 5–40%p. **수학 추론은 거의 안 오름**(GPT-4 92.9 → 93.1). «같은 모델의 자기 칭찬»으로는 논리 오류가 안 잡힌다는 한계가 논문 표에 드러난다.

- https://arxiv.org/abs/2303.17651

**Chain-of-Verification, CoVe (Dhuliawala et al., 2023/ACL Findings 2024)**. (1) 초안 (2) 검증 질문 계획 (3) **초안을 보지 않고** 검증 질문에 답함 (4) 수정. 핵심: 검증 답이 초안의 환각을 따라 쓰지 않게 **문맥을 분리**한다. 초록: Wikidata 목록 QA, 클로즈드북 MultiSpanQA, 장문 생성에서 환각 감소. 표 숫자는 HTML 추출에서 빠졌다. 이차 인용이 MultiSpanQA F1 **0.39 → 0.48**, 장문 FactScore **60.8 → 63.7**을 적는다. **원논문 표와 대조는 확인 못 함.**

- https://arxiv.org/abs/2309.11495
- https://arxiv.org/pdf/2309.11495

제품에의 함의: **생성 모델에게 «다시 생각해 봐»만 시키는 것은 부족하다.** 풀이 호출은 초안 JSON을 가리고, 지문+발문+보기만 줘야 한다.

**MCQsAgent (Expert Systems with Applications, 2026)**. 다층 에이전트(QA쌍 → 검증 → 오답 → 선정 → 최적화). 저자 보고: 사실 정확 **97.5%**, 오답 품질 **94.9%**, 단일 모델(GPT-5.2, Gemini 3 Pro 등)보다 높다고 한다. 도메인·표본·채점자 독립성은 초록만으로는 확인 못 함. 숫자는 저자 보고로만 인용.

- https://www.sciencedirect.com/science/article/abs/pii/S0957417426017896

### 2.4 LLM-as-judge · IWF 루브릭

**IWF의 원천**: Haladyna et al. (2002) 31지침 → 실무 루브릭은 보통 **15항 또는 19항**.

자주 쓰이는 19항 예 (SAQUET / EDM 계열): Ambiguous, Implausible distractors, None of the above, Longest option correct, Gratuitous information, True/false, Convergence cues, Logical cues, All of the above, Fill-in-the-blank, Absolute terms, Word repeats, Unfocused stem, Complex/K-type, More than one correct, Negative wording 등.

- 19항 정의 표: https://arxiv.org/html/2503.10533v1
- 사람 평가자 κ 예 (구현 스크립트 논문, 2023): Implausible κ=0.82, Longest option κ=0.83, None of the above κ=1.00. https://arxiv.org/pdf/2307.08161v1

**IWF가 IRT에 미치는 영향** (Laverghetta et al., arXiv 2503.10533): MCQ당 평균 **1.48**개 결함. «정답이 가장 긴 보기»는 문항을 **쉽게** 만들고 변별을 깎음 (γ̂=−0.370, β̂=−0.691). «정답이 둘»도 변별·난이도 모두 하락. «수렴 단서»·부정 발문은 난이도를 올린다(혼란).

- https://arxiv.org/html/2503.10533v1

**AI가 IWF를 더 만든다** (Frontiers in Computer Science, 2026): 생성 문항 152개에 19항 적용. Holm-Bonferroni를 통과한 4항 — Word repeats, Absolute terms, Logical cues, Longest option corrects. **Word repeats: AI 80.3% vs 교사 34.9%** (*p*<0.001). 자동화 편향: 교사가 AI 초안을 덜 고친다.

- https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2026.1831250/full

**인지 기능으로 IWF를 나눈 연구** (EDM 2026): cue-giving / confusion-inducing / structural. 혼란형만 응답 시간을 **14–29%** 늘림. 결함 개수 합산은 효과가 가려진다.

- https://educationaldatamining.org/edm2026/proceedings/2026.EDM.full-papers.122/index.html

**G-Eval (Liu et al., EMNLP 2023)**: 기준 → 모델이 평가 단계를 쓰고 → 양식 채점. GPT-4 요약 과제에서 사람과의 Spearman **0.514**. LLM 판정자는 **LLM이 쓴 글을 편애**하는 편향이 있다.

- https://arxiv.org/abs/2303.16634
- https://aclanthology.org/2023.emnlp-main.153/

**LLM-as-judge 합의** (Zheng et al., 2023, MT-Bench): GPT-4와 사람 합의 **80% 이상**, 사람–사람 합의와 같은 수준. MT-Bench S2(동점 제외)에서 GPT-4 쌍대 vs 사람 **85%**, 사람–사람 **81%**. 한계: 위치 편향, 장문 편향, **자기 강화(self-enhancement)**.

- https://arxiv.org/abs/2306.05685

제품 함의: 판정자는 **생성 모델과 다른 모델**이어야 한다. DeepSeek v4-pro가 만든 문항을 v4-pro가 채점하면 Zheng이 경고한 자기 강화다. ChatGPT 붙여넣기 경로에서는 DeepSeek가 오히려 **독립 풀이자**가 된다.

### 2.5 난이도 제어 (CEFR · 어휘 · Lexile · IRT)

**교육과정 기본 어휘**가 한국 공교육 난이도의 법정 자이다(§1.1). Lexile은 상용 척도라 이 제품에 기본 내장할 공개 구현은 확인 못 함.

**가독성**: Trott & Rivière (2024), GPT-4 Turbo 제로샷 가독성 추정이 사람 평정과 **r = 0.76**, GPT-4o mini **r = 0.74**, 전통 공식(Flesch-Kincaid 등)보다 높았다. 다만 구성 개념 «가독성» 자체에 한계를 적는다.

- https://arxiv.org/abs/2410.14028

**IRT**: 학생 응답이 없으면 문항 모수(a, b)를 못 박는다. 23-성취리포트 문서대로 `test_result`는 영어 세트가 아직 0행에 가깝다. 지금은 IRT 대신 (1) 언어적 난이도 프록시(어휘 등급, 구문 깊이, 오답 복잡도), (2) 풀이자 정답률·엔트로피, (3) IWF 표면 단서를 쓴다. AIED 2025 오답 복잡도 조절이 이 단계의 연구 근거다.

**CEFR 단어 프로파일**은 한국 고난도 수능 연구(§1.1 ERIC 논문)가 이미 썼다. 학원 내신 «기본/표준/심화»를 CEFR B1/B2/C1에 일대일 대응했다는 공식 매핑은 **확인 못 함**. 프롬프트 v1의 난이도 문장(«교과서 수준» / «한 번 추론» / «두 단계 추론»)은 조작적 정의가 아니다.

---

## 3. 유형별 결정적(비AI) 검증 — 할 수 있는 것

순수 함수로 가능. 서버·클라이언트 공통 (`validate.ts`와 같은 자리). ChatGPT 붙여넣기에도 **추가 비용 없이** 걸린다.

### 3.1 지금 있는 것 (유지)

- 보기 5, 공백 정규화 중복, 정답 번호, 열린 유형 보기 없음
- evidence ⊆ 정규화 지문
- count/types/original 지문 잠금

구멍: evidence가 «아무 연속 인용»이면 통과. 어법 근거가 틀린 밑줄과 무관해 도 통과.

### 3.2 유형별 추가 검사

**어법**

1. `prompt`에 원문자 ①–⑤가 각각 1회.
2. 보기 5개가 그 밑줄 표현과 같거나, 보기 문자열이 `"①"`–`"⑤"` 또는 밑줄 스팬.
3. 각 밑줄 문자열이 **문제용 지문**(prompt 안)에 존재.
4. 정답 밑줄만 `passage`의 대응 위치와 **다름**. 나머지 4 밑줄은 원문과 **같음**.
5. 원문에서 정답 스팬을 문제용 형태로 치환하면 prompt의 문제용 지문과 일치(공백 정규화).
6. 선택: LanguageTool/spaCy 없이, 원문 스팬 vs 정답 스팬의 최소 편집이 교육과정 오류 유형 목록(수일치, 시제, 태, 관계사, 분사, 병렬, 비교급, 전치사) 중 하나에 속하는지 — 휴리스틱. 완전 문법은 확인 못 함(결정적 파서가 한국 수능 어법을 100% 재지 못함).

실패 예: 밑줄 4개, 원문에 없는 구, 오류 2개, 정답 밑줄이 원문과 동일(«틀린 것»이 없음).

**문장 삽입**

1. prompt에 «주어진 문장» 블록 + ①–⑤ 자리 표시 5개.
2. 주어진 문장은 `passage`에 **없음**(빠져 있음).
3. 보기 5개는 `"①"`–`"⑤"` (또는 동등).
4. 정답 자리에 주어진 문장을 넣으면 정규화 `passage`와 일치.
5. **유일성**: 다른 네 자리에 넣으면 원문과 불일치.

`original` 모드에서 4번은 거의 기계적으로 가능하다. `new`/`variation`은 문제용 지문이 원문과 다를 수 있어, «문제용 지문 + 삽입 = 일관된 글»은 AI 판정이 남는다. 자리 개수·주어진 문장 부재는 모드와 무관하게 결정적.

**빈칸 추론**

1. prompt에 `________`(또는 계약이 정한 빈칸 표식) 1개.
2. 정답 보기 문자열이 **원문(`passage`)의 연속 부분문자열**(original 모드). 공백·구두점 정규화.
3. 다른 보기 4개는 그 자리에 원문과 불일치.
4. 보기가 모두 같은 구 길이 층(모두 NP / 모두 clause) — 휴리스틱.
5. 빈칸 문장만 독립 문장으로 성립하고 지문 없이도 답이 고르면 경고(guessability의 값싼 근사: 빈칸 문장에 정답 단어가 이미 있음).

**원문 복원** (`cloze.ts`)

이미 결정적이다. 추가하면 좋은 것:

- 정답이 지문에 1회 이상.
- 같은 문장에 빈칸 단어가 두 번이면 치환이 첫 번째만 바뀌는지 명시(지금 `replace`는 첫 1회).
- 정답을 교육과정 기본 어휘·내용어(명사/동사/형용사)로 제한. 지금 `pickWord`는 **가장 긴 6글자+ 알파벳**. `Students`가 `together`와 길이 8로 동점이면 앞 단어가 정답 — 학습 목표와 무관.

**주제**

- 보기 5개가 영어(Latin 문자 비율 임계).
- 보기 길이 비: 최장/최단 > 2.5이면 IWF «longest option» 경고.
- 정답만 지문 content word를 반복하고 오답은 반복이 0이면 word-repeats 경고.

**내용 일치**

- 보기 5개가 한글(한글 음절 비율).
- 발문에 «일치» 또는 «불일치»가 있고, 다섯 보기 중 정답 극성만 발문과 맞는지 — 완전 결정적은 아님. 숫자 토큰이 보기와 지문에서 어긋나면 «뒤집힌 숫자 오답» 후보로 표시(정보, 실패 아님).

**서술형**

- `explanation`에 점수 단위가 2개 이상(숫자+단위 또는 `·` 구분). 지금 표본은 `"협력(1점) · 어려운 일(1점) · 쉬워짐(1점)"`.
- `answer` 길이가 prompt 요구(우리말/영어)와 언어가 맞는지 스크립트 감지.

**원문 유지 모드**

이미 있다. 추가: 유니코드 정규화 NFC, 스마트 따옴표, 연속 공백. 지금 `normalizeEnglishText`는 `\s+`만 접는다. NBSP·풀폭 구두점은 **확인 못 함**(테스트가 ASCII 표본만 씀).

### 3.3 지문 단위 결정적 검사 (난이도 프록시)

| 자 | 용도 | 한계 |
|---|---|---|
| 단어 수 vs 요청 `words` ±20% | new/variation | original은 무시(이미) |
| 교육부 기본 어휘 3,000  overlapping % | «기본/표준/심화» 경고 | 목록 파일을 저장소에 넣어야 함. 라이선스·2022 vs 2015 판본 선택 필요 |
| Flesch-Kincaid / Dale-Chall | 영문 가독성 | 학술 영문 기준. 한국 중고 내신과 눈금이 다름 |
| 문장 평균 길이, 종속절 표지(that/which/although) 밀도 | 구문 복잡도 | 휴리스틱 |
| CEFR 단어 리스트(English Vocabulary Profile 등) | 국제 비교 | 상용/라이선스 **확인 못 함** |
| Lexile | — | 공개 API **확인 못 함** |

학업성취도·수능이 쓰는 공식 난이도 공식은 **확인 못 함**. 공개 값은 사후 정답률이다.

### 3.4 결정적으로 **못** 하는 것

- 주제 보기의 의미 유일성
- 오답의 «매력»(학생 오개념과의 정렬)
- 어법 «틀린 것»이 방언·스타일이 아니라 규범 오류인지(회색 지대)
- 삽입에서 수사적으로 두 자리가 모두 가능한 글
- 서술형 유사 답안의 교육적 타당성

이 칸은 풀이자·판정자·원장님 검토의 몫이다.

---

## 4. 파이프라인 설계 — 비용·지연을 넣은 우선순위

제약: DeepSeek v4-pro 1회 **40초–2분**(브리프). 영어 실측 1건은 **12.8초/2문항**. 라우트 `maxDuration = 300`. 검증 실패는 재시도하지 않음(의도). ChatGPT 경로는 사람 복붙. 추론 토큰이 `max_tokens`와 과금을 같이 쓴다 (`client.ts`).

### 4.1 과금 눈금 (2026-09 공식)

DeepSeek 공식 가격표 (1M 토큰, USD):

| | v4-pro 비피크 | v4-pro 피크 | flash 비피크 | flash 피크 |
|---|---|---|---|---|
| 입력 캐시 미스 | $0.66 | $1.32 | $0.15 | $0.30 |
| 출력 | $1.98 | $3.96 | $0.60 | $1.20 |

피크: 월–금 01:00–04:00 · 06:00–10:00 UTC. https://api-docs.deepseek.com/quick_start/pricing/

영어 1회 생성의 토큰 실측은 **확인 못 함**. 수학 변형에서 추론이 32k를 삼킨 전례가 있다(`client.ts` 주석). 보수적으로 생성 1회 = 입력 2–4k + 출력(추론 포함) 10–40k → 비피크 v4-pro **약 $0.02–$0.08/회** 수준. 지연이 돈보다 크다.

`deepseek-flash`(V4.1-Flash)는 같은 API, 사고 모드 on/off, 동시성 한도 2500 vs pro 500. **풀이·판정용으로 쓰는 근거가 있다.**

### 4.2 권하는 파이프라인

```
[생성] v4-pro 1회  (ChatGPT 경로는 사람)
    ↓
[A. 결정적 검사]  순수 함수, <50ms, 세 길 공통
    ↓ 하드 실패면 여기서 멈춤 (재시도 없음, 지금과 같음)
[B. 독립 풀이]  flash, thinking off, 지문+문항만, 초안 정답·해설 숨김
    · with-passage 1회
    · without-passage 1회 (guessability)
    ↓
[C. 판정 루브릭]  flash 또는 규칙+LLM 혼합 IWF 19항 중 자동화 가능한 것
    ↓
[D. 수정 0–1회]  결정적 실패가 아니고, 풀이자가 정답과 불일치하거나
                  guessability≥0.6이거나 IWF 하드 항목일 때만
                  수정 프롬프트 + 다시 A. D 실패면 초안+경고로 통과
```

저장은 지금처럼 항상 **«초안»**. 품질 경고는 편집 화면 문항 머리에 한 줄(기존 검증 실패 한 줄 패턴). 새 배지·색은 D-07. 기존 알림 줄 확장은 디자인 세션 없이 가능하다.

### 4.3 지연·비용 (대략, 직렬)

| 단계 | 모델 | 지연 | 추가 비용 | ChatGPT 경로 |
|---|---|---|---|---|
| 생성 | v4-pro / 사람 | 40s–2min / 사람 | 본 호출 | 사람 |
| A 결정적 | CPU | <0.1s | 0 | **붙여넣기 직후 브라우저** |
| B 풀이 ×2 | flash, think off | 5–20s 합 | 생성 대비 훨씬 낮음 | 선택 단추 «검수» — 서버 1호출 |
| C 판정 | flash 또는 규칙 | 3–15s | 낮음 | 같은 검수 호출에 실을 수 있음 |
| D 수정 1회 | v4-pro | +40s–2min | 생성과 비슷 | 검수 실패 시에만, 원장님 확인 후 |

300초 한도: A+B+C는 직렬로도 여유. D까지 켜면 **검수 전용 라우트**로 나누는 편이 안전하다. 생성 라우트에 D를 붙이면 2분 생성이 겹쳐 타임아웃 위험이 있다.

**같은 모델 self-refine는 1순위로 두지 않는다.** Self-Refine의 수학 표와 Zheng의 self-enhancement, CoVe의 «초안을 가려라»가 같은 방향을 가리킨다.

### 4.4 우선순위 (ROI)

1. **A 유형별 결정적 검사** — 비용 0, ChatGPT 경로에 즉시, 어법·삽입·빈칸의 구조 결함을 기계가 잡음. 지금 검증기가 놓치는 양의 대부분.
2. **프롬프트 v2 유형 레시피** — 생성 품질의 입구. 검증기와 **같은 문장**을 규칙에 넣는다(지금 v1 철학).
3. **B 독립 풀이(유일 정답)** — «정답이 유일인가»의 실측. flash, 정답 숨김. Säuberli 프로토콜.
4. **IWF 표면 규칙** (longest option, absolute terms, word repeats, NOTA/AOTA, 보기 문법 불일치) — 거의 공짜. AI 문항의 실제 다발 결함(Frontiers 2026).
5. **서술형 채점 기준 뼈대 검사** — 내신 지침 강제.
6. **C 판정 루브릭** — B 다음에. 오답 매력·주제 유일성.
7. **D 수정 1회** — 실패 문항만. 생성 라우트와 분리.
8. **어휘 등급·가독성 경고** — 난이도 라벨의 눈금. 하드 페일은 나중에.
9. **원문 복원 단어 선정 개선** — 품질과 별개인 학습 적합성.
10. **IRT·학생 응답** — 데이터가 쌓인 다음 판 (25 §10, 23번 문서).

### 4.5 ChatGPT 붙여넣기 경로에 적용

`parseChatgptResult` → `validateEnglishDraft` 뒤에 **A를 같은 함수에 넣으면** 붙여넣기 실패 한 줄이 유형 결함을 바로 보여 준다. 추가 API 없음.

B/C는 `POST /api/english/review`(가칭) — 초안 JSON + 지문. 키는 서버만. 화면 문구: «생성 시 소재·지문을 AI 서버로 보냅니다.»와 같은 결의 한 줄. 원장님이 단추를 누를 때만.

ChatGPT가 이미 틀린 어법 문항을 내면 A가 막으므로, 비싼 재생성 없이 «어느 밑줄이 원문과 안 맞는지»를 한 줄로 돌려줄 수 있다.

---

## 5. 이 저장소 변경안 상위 10

울타리(25 §6): 품질 코드는 `src/lib/english/**`. `src/lib/ai/prompts/`는 영어 모듈을 import하지 않는다. 시험은 `vi.mock("openai")`. TDD: `englishValidate.test.ts`가 자연스러운 RED 자리.

| # | 우선 | 어디 | 무엇 | 기대 | 위험 |
|---|---|---|---|---|---|
| 1 | P0 | `src/lib/english/validate.ts` `questionIssues` + 유형 분기. 시험 `englishValidate.test.ts` | **유형별 결정적 검사**(§3.2). 실패는 기존 `EnglishDraftIssue` 한 줄. 세 길·저장 PUT이 자동으로 받음 | 어법·삽입·빈칸의 구조 사고(밑줄 4개, 자리 3개, 빈칸 없는 빈칸)를 생성 직후·붙여넣기 직후 차단. 비용 0 | 휴리스틱이 정상 수능 표기를 오탐. **처음엔 하드 페일을 구조 항목만**(자리 개수, 밑줄 존재, original 빈칸=원문)으로 두고 의미 항목은 `warning` 배열 — 계약 확장 필요 |
| 2 | P0 | `src/lib/ai/prompts/englishExam.ts` `ENGLISH_TYPE_GUIDE` · `ENGLISH_EXAM_RULES`, 버전 **v2**. `chatgpt.ts`는 여기를 가져가므로 한 벌 | 유형마다 오답 설계·유일 정답·문제용 지문 규칙을 **검증기와 같은 문장**으로. 난이도 라벨을 조작적으로(«기본: 지문 한 문장에 답이 있음 / 심화: 두 문장 이상 합성») | 생성 입구 품질. 한국 CoT 연구가 Basic 프롬프트가 기출에 더 가깝다고 함 — 과한 Reasoning 프롬프트는 국소 단서 문항을 늘릴 수 있음 | 프롬프트만 바꾸고 검증기를 안 바꾸면 또 안 지킴(파일 머리 주석의 교훈). v2와 #1을 **같은 작업**으로 |
| 3 | P1 | `src/contracts/english.contract.ts` `englishQuestionSchema` | 선택 필드: `warnings[]`, 또는 유형별 구조(`underlines[5]`, `blankSpan`, `insertionSentence`, `slots`). 지금은 구조가 `prompt` 문자열에 묻힘 | 결정적 검사가 정규식 파싱에 의존하지 않음. 인쇄·편집도 이득 | jsonb 하위호환. 옛 세트는 필드 없음 → optional. 화면 편집기가 새 칸을 알아야 함(shell). **한 트랙이 계약+validate+prompt+UI를 같이 쥐면** 25 §8 «파일 중복 금지»와 충돌 — 계약은 리드, validate는 base 자리, prompt는 ai, 화면은 shell. **순서는 계약 → validate → prompt → UI** |
| 4 | P1 | `src/lib/english/generate.ts` 옆 순수 `reviewEnglishDraft` + 라우트 분리. 모델은 `deepseek-flash`, thinking off | **독립 풀이**: 메시지에 `answer`/`explanation`/`evidence`를 넣지 않음. 출력은 번호만. original 모드 유일성 = 풀이자 번호 == 작성 정답. guessability = 지문 없이 맞힘 | «정답이 유일하지 않음»(풀이자가 다른 번호) «지문 없이 찍힘»을 처음으로 측정. Säuberli. ChatGPT 초안은 모델 가족이 달라 자기 강화가 줄어듦 | flash가 한국 내신 독해를 사람만큼 못 풀면 거짓 경보. 1.0 일치는 요구하지 말고, **불일치+자기 확신**만 하드. `maxDuration` — 생성 라우트에 붙이지 말 것. 실호출 시험 금지, 픽스처로 RED |
| 5 | P1 | `validate.ts` IWF 표면 + 선택 `src/lib/english/iwf.ts` | longest option(문자 수 비), absolute terms 목록, word repeats(정답만 발문 lemma 공유), `all of the above`/`none of the above` 한글·영어, 보기 문법 첫 단어 불일치 | Frontiers 2026이 AI 문항에서 실제로 치솟은 결함. 공짜 | 수능 주제 보기는 원래 길이가 다름. 임계는 경고. 한국어 보기에는 word-repeat 규칙이 약함 |
| 6 | P1 | `validate.ts` 서술형 분기 | `explanation`에 부분점수 요소 ≥2, `answer` 비어 있지 않음(이미), 언어 스크립트 | 학업성적관리 채점기준표의 최소 뼈대 | 좋은 한 줄 기준을 오탐할 수 있음. 요소 수 검사만 |
| 7 | P2 | `englishExam.ts` + 선택 few-shot 1문항/유형을 프롬프트에. 픽스처는 자작 지문(지금 시험과 같음) | 어법 1예(원문 vs 문제용 지문 vs 보기), 삽입 1예, 빈칸 1예. Bitew 53% 교훈: **좋은 예가 오답을  Mil어 준다** | 유형 준수율 | 토큰·지연 증가. v4-pro 추론이 예를 베낌. 예 지문은 출판물 금지 |
| 8 | P2 | `src/app/api/english/generate/route.ts`와 **별도** `review` 또는 generate의 opt-in `review: true` | 수정 1회: 풀이 불일치 문항만 «이  constrains를 지켜 해당 문항만 다시». 전체 세트 재생성 금지 | 부분 실패를 사람이 고치기 전에 한 번 회수 | 300초, 요금 2배, 수정이 다른 문항을 깨뜨림 → 수정 후 **A를 전체 재실행**. 실패하면 경고 초안 반환(지금 REJECTED로 전부 버리는 것보다 편집 가능) |
| 9 | P2 | `src/lib/english/cloze.ts` `pickWord` | 기본 어휘 목록 ∩ 내용어, 문장당 1, 고유명·기능어 제외. 목록 파일은 `src/lib/english/data/` | 원문 복원이 «긴 단어 찾기»가 아니라 학습 단어 재생 | 목록 저작권·2022/2015 판. 짧은 지문에서 문항 수가 줄어 `CLOZE_COUNTS` 실패가 늘 수 있음 — 실패 문구에 «학습 단어 부족» |
| 10 | P3 | `src/lib/english/readability.ts` + 생성 응답 `meta` 또는 문항 `warnings` | 기본 어휘 커버리지, 단어 수 vs `words`, FKGL. 난이도 라벨과 불일치하면 경고 | «심화»인데 어휘가 초등 권장만 있는 세트 탐지 | 하드 페일 금지. Lexile·공식 CEFR 매핑 없음. 화면 숫자 배지는 D-07 |

**하지 말 것 (이번 판)**

- 생성 실패를 v4-pro로 조용히 재시도(이미 금지, 유지).
- 같은 v4-pro에게 자기 채점만 시키고 끝.
- 유형 enum에 어휘·순서·요약을 **품질 작업과 동시에** 넣기 — 계약·인쇄·화면·프롬프트가 같이 열린다. 다음 판, 원장님 유형 확정 후.
- 문제은행 `Problem`에 영어 문항 적재(25 울타리).
- IRT 대시보드 — 응답 데이터가 없다.

**시험**

- `englishValidate.test.ts`에 어법(오류 2개, 밑줄 원문 없음), 삽입(자리 4, 주어진 문장이 본문에 잔존), 빈칸(정답이 원문에 없음), original 잠금은 이미 있음.
- `englishGenerate.test.ts`는 mock이 잘못된 어법 JSON을 내면 `EnglishDraftRejectedError.issues`에 유형 문구가 있는지.
- `englishChatgpt.test.ts` 붙여넣기 표본에 구조 결함.
- 울타리 시험은 `src/lib/english` 새 파일이 import 방향을 지키는지만 보면 됨.
- 실호출 품질 표본은 main에서 리드가 유형당 1세트(교훈 2026-09-20). 워크트리 `.env` 없음.

**화면**

검토·편집은 이미 문항마다 유형·보기·정답·근거를 보여 준다. 품질 한 줄은 검증 실패와 같은 자리에 넣으면 D-07 시안이 필요 없다. «품질 점수 85» 같은 종합 숫자는 23번 문서의 «단일 지수 만들지 마라»와 같은 함정이다. 문항별 경고 코드가 낫다.

---

## 6. 저장소 코드와 연구 사이의 짧은 대응

| 연구/출제 기준 | 지금 코드 | 다음 한 걸음 |
|---|---|---|
| Haladyna 정답 하나·오답 매력 | 보기 중복만 | #1 + #4 + #5 |
| 수능 어법 = 밑줄 5, 오류 1 | 안내 한 줄 | #1 어법 분기 + #2 |
| 삽입 = 빠진 문장 + 자리 5 + 유일 | 안내 한 줄 | #1 삽입 재구성 |
| 빈칸 = 핵심 자리 + 원문 정답 | original 지문 잠금만 | 빈칸 스팬 ⊆ passage |
| 서술형 채점기준표 | explanation 자유 텍스트 | #6 |
| Säuberli guessability | 없음 | #4 지문 없이 풀기 |
| CoVe 문맥 분리 | 생성 1회 | 풀이 프롬프트에 정답 숨김 |
| Self-enhancement | 같은 모델뿐 | 풀이=flash, 생성=pro 또는 ChatGPT |
| IWF word repeats 80% | 없음 | #5 |
| 교육부 어휘 | 난이도 형용사 3개 | #10 + #9 |
| 내신 변형 격자 | 유형 7개, 어휘·순서·요약 없음 | 다음 판 유형 확장 |

---

## 7. 확인 못 함

- 평가원 **문항작성 내부 매뉴얼**(오답 설계 체크리스트) 공개본.
- 마더텅·이투스·쎈영어의 **내부 출제 가이드** 원문.
- CoVe 논문 Table의 MultiSpanQA F1·FactScore 원숫자(이차 인용만 있음).
- 김혜진·이희경 (2025) ANOVA 계수, 사용 GPT-5 스냅샷.
- AIED 2025 오답 난이도 조절의 IRT a, b 추정값.
- MCQsAgent 97.5%/94.9%의 독립 재현.
- 기본/표준/심화 ↔ CEFR 공식 매핑.
- Lexile 공개 API.
- 영어 생성 1회당 실제 입출력 토큰(수학 변형 주석만 있음).
- LanguageTool이 수능 어법 «틀린 하나»를 안정적으로 재는지.
- 2027 수능 본문항 AI 출제 여부(난이도 검토·지문 초안 «검토»까지만 확인).

---

**한 줄.** 지금 검증기는 답안지 형식 검사다. 품질의 대부분은 **어법·삽입·빈칸을 문자열로 재구성하는 결정적 검사**로 열리고, 그다음이 **정답을 숨긴 싼 모델의 재풀이**다. 같은 DeepSeek에게 자기 반성만 시키는 단계는 나중이다.
