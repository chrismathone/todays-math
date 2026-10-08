# 경암 author-r1 학생용 독립 풀이

18개 부모 문항/19개 leaf, 객관식14개·서술형4개·95점이다. q15는 이 패킷에 없다. q17은 두 소문항 각5점, 부모10점이다.

이 폴더의 SOLVE-BRIEF.md, student-problems.json, figures/*.svg, previews/qNN.png만 읽는다. 다른 경로의 후보/답/저자 해설/qa HTML/author PNG/저자 검사/보고서/원문/옛 답/solution은 독립 풀이 커밋 전 읽지 않는다. SVG와 preview는 같은 새 학생 문제만 담고 있다.

주어진 studentDigest를 그대로 보존하고 다른 작성자가 중3/2015의 정당한 학생 방법으로 새 답·완전한 풀이·정확 계산·유일성·조건·단위·선택지·그림 증거를 기록한다. 각 질문 객체에서 studentDigest를 제외한 객체가 canonical studentPayload이고 digest는 candidatePack.mjs와 같은 JS canonical JSON SHA-256이다. Python 일반 object hash로 바꾸지 않는다. q17은 두 답과 과정을 모두 기록한다.

독립 풀이를 먼저 커밋하여 parent가 해시 고정한 후에만 새 저자 답 노출/리뷰를 허용한다. 이 패킷 자체는 승인·발행·적재 허가가 아니다.
