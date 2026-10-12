# Gyeongsan q22-r2 — independent-solve-then-review

이번1개 검수는 수학 통과, 학생7면 학년 통과, 원문 핵심/방법·새 구조·자연스러움·4점 배점 통과다.12검사항목 중11개 true, 정확한 Unit/live family 배정은 false/pending이라 **전체 report status는 pending**이다. `problemType`도 frozen null을 보존했다. 권리/custody/native/전체 적재 승인0이다. 이 scoped 검수 완료를 전체 추출/제작/원격저장/운영 승인으로 확대하지 않는다.

소유 원래 작업트리에서2026-10-12 실제 Get-Location/Git 상태/HEAD를 확인하고 `tool-ready-r3.json`을 새로 쓰고 되읽었다. 사용자 요청 세션ID는 `01a1177f-954e-7343-9cfb-e803c179ed85`이며 이 probe 자체가 프로세스의 세션ID를 독립 조회했다고 주장하지 않는다. 답 노출은 **raw383a5f7634ce3dc8979afd35cc9e058dc0d4c4fa의 바이트가 고정되고 Root가 해시 bind한 뒤에만** 이루어졌다. 제공17개 exposure 입력과 복사 solve를 모두 검증하고 원래 Git blob도 같음을 확인한 다음 새 저자 답/풀이를 읽었다. 그 전 새 저자 답/private facts/helper 테스트 목표 노출은 없다는 기존 기록을 유지한다. raw answer/code/proof/solution/학생 그림을 수정하지 않았다.

| 바인딩 | 현재 정확한 값 |
|---|---|
| candidate ID | exam-twin-gyeongsan-2025-2-mid-author-r2-q22 |
| studentDigest | b5461ade7464e5e10e30d83f391d25e53590ff1ba7b1e450cdb249510172e109 |
| candidateDigest | 5e17e4292dcb7a51f3c17faab9eb4afe014c085c30d50b799d8d49159c17f006 |
| assetDigest | 07cd7a6cec5b99919d1f136521416f05e7c372c5d95df7389e45dcfb8aa1fb50 |
| solveDigest | ea3c4166d87f758d41739406f73d329b7031c9c727b42423a3e0630c90d788d4 |
| raw solve SHA256 | c59e4b8e2d3a0d9751c4ddf753e7f7410f74f3f4becaea4bef6343c800547104 |
| 원래 raw code SHA256 | 242bd74e7f930c45d94830b327689a9f36783f27ac487565bae0be96c546385d |

새 저자 답은④, 원시 독립 답은 `④, $\cos\beta=\dfrac{SQ}{2}$`이다. 두 실제 답 문자열은 같지 않다. 새 `answer-equivalence-and-math.json`은 별도 목표 role cosBeta, 선택지 index4/마크④, 실제 분자SQ/반지름 분모2, 무차원 단위를 직접 비교하여 의미가 일치함을 증명한다. 문자열 정규화로 대수적 동치를 주장하거나 literal mismatch를 덮어쓰지 않았다. Root의 한 마크만 허용하는 comparator가 raw의 풀이값 접미사를 거부할 경우 이는 형식 제한이며, raw를 줄여 맞추지 않고 typed 증거를 별도로 사용해야 한다.

새 저자 풀이의 실제 두 문단을 읽었다. QS/UT가 OU에 수직이어서 평행이고, O-Q-T 순서로 QO와 TQ가 같은 방향의 반직선이 된다. QS와 TU도 같은 수직 방향이므로 ∠OQS=∠UTQ=β다. 작은 직각삼각형OSQ에서 β의 이웃변SQ/빗변OQ2를 코사인 정의로 읽는다. raw 독립 풀이는 두 직각삼각형의 각의 합으로 같은β를 확인하는 별도 경로이며 결과가 같다. 일반 여각/삼각비 관계식, 사인·코사인 법칙, 덧셈정리, 벡터, 미적분을 학생에게 요구하지 않는다. 저자 private facts는 지금 허용된 참고 자료지만 독립 계산 증거를 대체하지 않는다.

다섯 실제 식을 새 코드로 다시 계산했다. k=SQ/OS∈(0,1), ell=OT/OQ>1, w=√(1+k²)일 때 정답은k/w다.①OS/2와의 차(1−k)/w,②UT/2와의 차(ell−1)k/w,③2/SQ와의 차1/(kw),⑤OS/SQ와의 차(w−k²)/(kw)는 모두 전 구간에서 엄격히 양수다.④의 차만0이다. raw의 전 구간 존재 구성Q=(2/w,2k/w), S=(2/w,0), U=(2,0), T=(2,2k)도 그대로 유지된다. 모든 길이와 분모가 양수이고 O-Q-T/O-S-U 순서가 성립한다.α0은 퇴화/역수 미정의,α45에서는①과④가 같아질 수 있어 양끝 제외가 유일성에 실제로 필요하다. 요청한 식만 유일하며 수치 각/코사인 값/전체 도형은 여러 가지이다. cm/m는 입력에 없으므로 발명하지 않았다.

원문은 제공된 clean 질문 전용 crop과 JSON만 읽었다. A→O, B→S, C→Q, D→U, E→T의 호상 점/수선 발/사분원 끝점/수선 연장선 위 교점 대응을 직접 보았다. 원문 그림의 x/y/z 대응과 새 α/β 대응은 같은 실제 직각삼각형·평행선의 정의 읽기 핵심을 유지한다. 원문 정답/키/해설은 읽거나 계산 승인에 사용하지 않았다. 제공 원문 crop에서 별도의 circled key/해설/손글씨 답 주석을 보지 않았다. 이전 다른 시험 출처 감사의 부수 답 주석 노출 이력은 별도이며 이 판단에 쓰지 않았다. 원문 제공 digest392220...와 전체 canonical record digestacf02f...는 각 정의대로 보존하고, hash만으로 content equivalence나 source custody를 단정하지 않았다. source-context의740279...는 package 이전 authoredInput SHA이고 manifest가 현재 private5a4259...로 연결하며, 최종 바인딩은 현재 직접 다시 계산했다.

새 구조의 근거는 반지름/문자 교체만이 아니다. 원문은 x/y/z의 서로 다른 sin/tan/cos 완성 진술5개를 비교한다. 새 문항은 하나의 명시적 cosβ 목표에 다섯 선분 분수 후보를 경쟁시키고, 실제 점 순서·정의역을 명시하여 한 기호식을 복구한다. 비단위 반지름은 분모 확인을 요구한다. 이 목표/선택지 조직과 표현 변경을 인정했으며, 저자의 `inverse-target` 주장 자체는 독립적으로 성립했다고 보지 않았고 통과 근거로 삼지 않았다. 원래 그림의 물리적 수선/각 대응 핵심을 다른 평가로 버리지 않았다. 순수 수학에 story를 강제하지 않았고 실제 학교명은 내부에만 남았다. 실제 student/solution 문면에서 학교 이름이 등장하지 않는다.

학생7면—stem, choices, figuresAndTables, notation, answer, studentSolution, prerequisites—각각 passed와 구체적인 조항·방법·보기·선수 근거를 기록했다. [교육부2015 시행](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=60747&lev=0&m=040401&s=moe)은 중3를2020년부터, [교육부2022 시행](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=040401&s=moe)은 중3를2027년부터 적용한다. 두 직접 공식 페이지를2026-10-12 재확인했다. 실제2025 원문/이2015 학생 풀이의 적합성과2027+ 재출판을 분리한다.

공식2015 별책8 PDF SHA4bd2b84e...와2020-236 HWP SHA1cb1623f...를 검증하고 관련11개 문구를 다시 추출해 전체 조항과 PDF페이지를 대조했다.9수04-01/02/05/10은 물리37쪽/인쇄33쪽의 위치 관계·평행선 각·다각형 각·이등변 성질,9수04-17/18은 물리38쪽/인쇄34쪽의 정의/간단한 값·활용이다. 핵심9수04-17 HWP record4341/offset219120, 평행선9수04-02 record4252/offset215902다. ‘삼각비 사이의 관계는 다루지 않는다’ record4440/offset224820과0°–90°범위 record4444/offset224946은 물리39쪽/인쇄35쪽에서 확인했다. 같은 실제β의 정의를 읽는 평가여서 금지된 서로 다른 삼각비의 관계를 평가하지 않는다. 원과 비례, 복잡한 넓이/둘레 측정, 복잡한 형식 연역 제한도 검토했고 해당 필수 학생 절차가 없다. 기존 국소2022-2/2024-1 개정 근거가 별책8 변경을 제시하지 않음을 확인했다. 이 관련 수학 조항에 식별된 물질적 개정 불명은 없으며 전 정책 이력 완전성을 추가 승인 gate로 요구하지 않았다.

실제 seed의 중1 평행선/삼각형 내각, 중2 이등변삼각형, 중3 삼각비의 뜻/값 선수 기록을 페이지/라인/파일 SHA로 묶었다. 새 저자 풀이의 모든 필수 단계와 보기를 확인하는 간단한45°구성이 이 범위에 든다. 개발자 계산의 SymPy/좌표/매개변수/피타고라스 모델은 학생에게 요구하는 상위 procedure/notation이 아니다.

새 raw spec에서 호 반지름, 사분원 끝점, 두 직각, O-Q-T 일직선/순서, β의 Q/T 대응 등10개를 코드로 점검했다. 한 실제 예시인 α40°/β50°는 제시된 추가 수치로 취급하지 않았다. 기존 strict FigureSpec v2/typeset/sanitize 엔진으로 따로 재렌더링했고 치수 누락0, 제공SVG와 SHA63dc539b...까지 같았다. 제공 원문 이미지, 실제70mm 학생PNG, 새 전체 author solutionPNG, 재렌더SVG뷰를 모두 view_image로 보았다. 새 화면의 O/Q/S/T/U,α/β와 직각 기호, 보기분수, 두 문단 풀이가 읽히며 overflow0이다. 독립 standalone 그림 PNG의 넓은 흰 viewport는 실제 SVG폭을 늘린 것이 아니며, embedded SVG폭은 약69.999mm로 측정했다. 픽셀/그림40°에서 답을 추정하지 않았다. native reader/물리 프린터 완전 일치는 주장하지 않는다.

원문 crop/JSON4점과 새4점을 한 번씩 대조했다. 실제 목표는 중심이 아닌 같은 각의 도형 대응→이웃변/빗변 선택→비단위 반지름 정규화이다. 이 작은 응용 조합에 저자의응용 제안은 타당하다고 판단했으나 실측 학생 난이도나 registry label로 증명하지 않았다.

**정확한 Unit/family는 구체적으로 pending**이다. 제공 bank는2026-10-08 13:00:16.891043UTC r3의 역사적22Units/302families이며2026-10-12 현재DB가 아니다. frozen candidate는 r2의04:53 timestamp를 가지고 Unit/family 둘 다null이다. 역사적 Unit 값UUID3b9f9110-2b31-4ed7-a44f-f5d2e8a1f4e7와 family `mid:3-2|삼각비|12` live_count20을 직접 확인했다. source m3Trig 실제12 규칙은 반지름1, 수치각25–65, 주어진반올림BH/OH/AT를 그 중심각의 단일비/두비합 수치값으로 읽는다. 이 새 반지름2·미정각·T각에서 Q각으로 대응·기호식 반환 전체 갈래는 없다. 같은 제목/그림/개념이라는 이유로 그 family를 배정하지 않았다. 가장 가까운 값 Unit 추천과 정의 중심의뜻 가능성을 구별하고 frozen null을 수정하지 않았다. Root가 정확한 목표Unit과 whole-purpose live family/rule 대응을 증명하거나 별도의 새family 결정을 해야 재개할 수 있다. 이 hold를 수학/학년 실패 또는 생성기 역산 helper 하나의 부재와 혼동하지 않는다.

TypeSafe 프로젝트 skill과 live [confidence](https://docs.typesafe.ai/confidence)/[citation check](https://docs.typesafe.ai/cookbooks/citation_check)를 읽고 직접 조항 match와 전체 문면의 적용 판단을 구별했다. 좁은 dimension별 결과/미확인을 보존했으며 probability를 승인으로 쓰지 않았다. 모델/추론/유료API0, DB읽기/쓰기0, 설치/Prisma generate/운영 적용0이다. GF15 blind worker/Root/원본/N/공유 의존성 파일은 수정하지 않았다.

검수 전 baseline656개 기존 소유파일과17개 frozen input을 보존한다. raw123,GG52,GF167,새 q22 raw20 및 checkpoint940c의 실제 Git blob을 대조한다. 새 검수 디렉터리만 커밋하고 최신 ownedremote/main fetch·보존통합 뒤 검사를 재실행해 소유 feature만 fast-forward push한다. 원격 저장은 이1개 scoped 검수의 체크포인트이며 full/loading0은 유지한다.
