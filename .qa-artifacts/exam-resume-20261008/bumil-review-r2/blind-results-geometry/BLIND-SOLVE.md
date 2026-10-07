# 독립 블라인드 풀이 — geometry solver

2026-10-08 · solverId: `orca-codex-exam-twin-author-geometry-20261008`

대상: q01, q04, q05, q18. 다른 저자의 새 학생 문항만 독립 풀이했다. 저자 답·해설을 보기 전에 기록을 작성하고 커밋한다.

- 읽은 자료는 지정된 SOLVE-BRIEF.md, student-problems.json, 해당 문항의 학생용 SVG뿐이다. 부모 HTML·해설 PNG·render-review·package·private·저자 후보·저자 노트·원문 답/해설은 열지 않았다.
- 도형은 학생 SVG를 로컬 Chromium으로 렌더해 실제 확인하고 제공된 SHA-256과 대조했다. 외부 네트워크 요청은 차단했다. 본문 없는 임의 수치나 비공개 스펙은 사용하지 않았다.
- Python Fraction/Decimal로 계산을 실행했다. 각 solve JSON에 다섯 보기의 정오, 계산값, 존재·유일성·양의 길이/정의역·단위·그림 관찰을 남겼다. 각 studentDigest는 제공된 값을 그대로 연결했다.
- solved는 독립 수학 풀이 상태이며 출제 승인이나 전체 범위/난이도/metadata 승인이 아니다. q07은 풀이/작성/승인 대상에 포함하지 않았다. 기존 저자 산출물은 수정하지 않았다.

q04는 본문과 명시된 choice:1~5의 그래프 **6개 전부**를 확인했다. 보기 경로 대응도 검사했다. 개략도에서 부호만 읽었으며 특정 a,b 값은 주장하지 않았다.

| 문항 | 독립 답 | studentDigest | solve JSON SHA-256 |
| --- | --- | --- | --- |
| q01 | ③ | `540ba2b796fa20c6fe9b0a14562a0b6ac52e8bafef917928f6a995b9f18c81a0` | `55b78fd161aeb33ec0d1beb5aba0ec952728e6b6cb24622cc57e03b452a69d96` |
| q04 | ⑤ | `e594be5d73a48300b0f7ae14f07eb8d09e05c90999b8437e04a2a0497fc2e219` | `eff1594ba81938e7bf2ab75932fb9f91fb7f5e618c46c17988197f04b1262e90` |
| q05 | ④ | `8e74b40b3a420a33dd4cbff54fc95e8479fb59b096c8fc61d0dbf6e2b2cda962` | `847c7debcfbfd0d17ee8d947182ec0904eb23d7cfc6a7a52194ef502777ba881` |
| q18 | ③ | `7560f9f6c5dcf51efcb593ccc24873d941d6d7fb26339aada218c7eba6af98ac` | `775cd629fa36066e871b260cee7ce6e1184884d0a0384fc2174c216b6f14e910` |
