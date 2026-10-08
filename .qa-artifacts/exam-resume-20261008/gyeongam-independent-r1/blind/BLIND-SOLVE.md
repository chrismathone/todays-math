# Gyeongam 독립 원시 풀이 r1

solverId: `orca-codex-gyeongam-independent-blind-r1-20261008`. 다른 저자의 학생 입력만을 푼 독립 blind 기록이다. 최신 D:/todays-math/AGENTS.md를 읽었고 기존 Gyeongsan 저작·보고서·q15 제외를 보존했다.

읽은 새 시험 입력은 이 폴더의 SOLVE-BRIEF, student-problems, blind-manifest와 학생용 SVG9개이다. 부모 private/package, Gyeongam author 후보/답/해설/check/report, 원래 시험·답·해설은 읽지 않았다. 일반 공식2015 교육과정 증거의 대표값/산포/산점도 기준(9수05-06/07/08)은 별도 기존 공통 자료에서 확인했다. TypeSafe skill/live docs의 계산·규칙은 코드에 두고 모르는 판단은 분리하는 원칙을 재사용했으며 추론API는0이다.

전체18문항의 raw solve를 새로 작성했다. 객관식14개는 각5보기를 실제 조건과 비교했고 서술형4개는 선택지를 만들지 않았다. 상태 solved18/pending0은 학생 입력의 독립 원시 풀이 상태이며 최종 math/grade/full 승인 수가 아니다. 단원/family/원문 개념·난이도 보존/rights/native와 최종7표면 승인에는 후속 자료와 별도 검토가 필요하다. 최종 수학·학년·권리·전체 승인0, directUseAllowed false이다.

공급된9개 SVG를 학생표시와 같은70mm 또는55mm 폭의 PNG로 변환해 실제로 보았다. q01의 네 도수, q09의12개 점·50경계, q10/12의 각/변, q11의 입체 배치와 별도 실제 직각삼각형, q13의 두 호 점/수선/수직선 순서, q18의D내부/같은변/45도, q19의 음영ACBD와60도를 확인했다. SVG를 수정하거나 비공개 spec/좌표를 읽지 않았다. q09는 공개 눈금에서 읽은 점들과 SVG에 표시된 점·눈금 위치의 대응만 검사했다.

각 solve/qNN.json은 주어진 studentDigest, solverId, 답·Korean 풀이, 코드 계산/존재·유일성·단위·양수/보기·그림 증거와 새7표면 학년 예비 메모를 가진다. 원시 풀이에는 저자 답과의 비교가 없다. 미지수가 있는 자료의 유일성은 유한탐색과 구분하여 순위/기하/식의 증명을 썼다. 코드 표본은 증명의 보조로 표시했다.

서술형 answerParts는 exact 숫자 또는 근호의 구조화된 정확 값을 기록했다. q17은 실제 작품 개수를 복원해 평균9에 대한 편차를 계산했고, 부모10점 안의5점+5점은 합계에서 한 번만 센다. q18의22.5도는 실제 이등변삼각형의 내각으로 확인하고 tan은 실제BC/AB로 구했다. 반각/삼각비 변환 항등식은 쓰지 않았다. q19는 두 실제 직각삼각형과 사다리꼴 면적으로 양의 반지름을 정했다.

`raw-solve-bindings.json`은 학생 JSON/manifest/brief의 실제 파일SHA, opaque supplied packageDigest, 각 주어진 studentDigest, 공개 학생 기록 자체의 해시,9개 figure 원시SHA와 실제 본 PNG SHA,18개 raw solve 파일SHA/정규해시, 독립 계산 코드SHA를 연결한다. supplied studentDigest/packageDigest의 의미를 비공개 후보 정보로 재추정하지 않았다. 파일해시는 실제 공급 바이트와 대조했다. 이후 답이 공개되어도 이 원시 solve와 binding을 수정하지 않고 별도 검수 revision을 작성해야 한다.

로컬 학생 그림 확인은 native renderer/serializer 호환·A4페이지 배치·물리 종이 승인이나 원본 권리 승인을 주장하지 않는다. GS24/96점/18SVG·source15 사전 제외와 기존 모든 봉인 증거에는 변경이 없다. DB/설치/generate/paidAPI/push를 수행하지 않았다.
