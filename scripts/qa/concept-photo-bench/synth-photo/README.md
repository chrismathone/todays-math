# 개념 백지 사진 위 첨삭 M2 합성 사진

초5 «합동» 두 소단원의 B·C·D·E 학생지를 실제 은행과 제품 PDF 렌더러로 발행한다.
합성 답은 M1의 `markup-cases.json`처럼 의미가 맞는 답, 근거를 빠뜨린 답, 오개념,
빈 답을 섞는다. 문항 ID와 칸의 종류를 기준으로 작성했고, 파일에 든 라벨은 작성자의
의도다. 예를 들어 ○× 선택과 까닭은 각각 라벨이 있다. 모델·공유 DB 없이 실행한다.

## 실행

저장소의 Node 의존성 설치와 Chromium/Chrome이 필요하다.
자동 탐색이 실패하면 `PDF_CHROMIUM_EXECUTABLE`에 실행 파일을 지정한다.
Python 가상 환경은 저장소 밖에 만들고 Pillow, NumPy, opencv-python-headless,
pypdfium2를 설치한다. 측정 당시 버전은 각각 11.3.0, 2.0.2, 5.1.0.95, 5.15.2다.

저장소 밖의 글꼴 폴더에 `Gaegu-Regular.ttf`, `NanumPenScript-Regular.ttf`,
`HiMelody-Regular.ttf`와 각 SIL OFL 문서를 내려받는다. 세 글꼴은 Google Fonts
소스의 `ofl/gaegu`, `ofl/nanumpenscript`, `ofl/himelody` 디렉터리에 있다.
비교 폴더에는 `paper-c.jpg`와 `paper-db.jpg`를 둔다. 해당 시안 자료가 현재
가지에 없으면 `phase/cb-scan-markup`의 별도 체크아웃에서
`docs/design/mockups/cb-scan-markup-20261126/`을 가리킨다.

```sh
CB_SYNTH_OUTPUT=/tmp/cb-synth-photo-20261127 CB_SYNTH_PYTHON=/tmp/cb-synth-photo-20261127/venv/bin/python node scripts/qa/concept-photo-bench/synth-photo/run.mjs /tmp/cb-synth-photo-20261127/fonts /path/to/cb-scan-markup-20261126
```

기본 산출 폴더는 `/tmp/cb-synth-photo-20261127`이다. 실행하면 같은 이름의 산출물을
덮어쓴다. 난수는 261127, 발행면 인덱스, 촬영 조건으로 초기화한다. 동일한 결과를
비교할 때는 은행·Chromium·Python 이미지 라이브러리·글꼴 버전을 맞춘다.
사진별 JSON에 글꼴 SHA-256과 은행 지문이 있다.

## 산출물

- `sources.json`과 `issued-*.pdf`에 실제 발행 지면과 배치가 있다. `blank-*.png`는
  대응하는 300dpi 빈 학생지다. `photos.json`은 이번 실행의 사진 목록이다.
- 사진별 JPEG와 같은 이름의 JSON에 지면 mm와 원본 사진 px 참값이 있다. 모서리
  표식 중심, QR 외곽과 데이터 영역의 네 점, 답 칸 모서리는 모두 대응점이다.
  네 점은 좌상→우상→우하→좌하 순서다. 상자는
  `[left, top, right, bottom]`이며 픽셀 모서리 기준의 연속 좌표다.
- `slots[].lines`는 위에서부터 물리 글줄 순서다. `ink`는 살아 있는 답의 잉크,
  `fullInk`는 취소선과 두 줄로 지운 글자까지 포함한 같은 줄 전체의 잉크 범위다.
  `erasures`는 지운 글과 유형(`strike`/`ghost`) 및 자체 상자를 기록한다.
  `strike`에는 연결된 글줄의 0부터 시작하는 인덱스가 있고, `ghost`에는 없다.
  `overrun`은 글줄의 `fullInk`가 칸을 넘었는지 표시한다. 참값은 글꼴 래스터의
  잉크를 원근과 휨에 따라 투영한 값이다. 흐림·노이즈·JPEG로 생긴 테두리는 포함하지
  않는다. H1 밑줄 시험에서 `ink`와 `fullInk` 중 어떤 것을 쓰는지 기록할 수 있다.
- 사진 좌표는 원통형 수평 압축 후 호모그래피로 구한다. `angle`은 종이 반폭의
  원통 각(라디안)이며, 0이면 평면이다. 그다음 변환이 `homography`다. 저장된
  제품 A4 JPEG를 재현할 때는 제품의 `warpScanPage`를 적용하고, 그쪽 좌표는 지면
  mm에 편 사진 크기 비율을 곱한다. 휘어진 지면에서는 단일 호모그래피의 오차가 남는다.
- `registration.json`에는 JPEG를 복호화해 제품 `registerScanPhoto`로 얻은 결과
  및 맞춘 사진의 모든 칸 모서리 오차가 있다. 참 변환의 역변환으로 px 오차를
  지면 mm에서 평가한다. QR 미검출·불일치는 제품 맞춤 함수 전에 `failed`로 세고,
  제품이 돌려준 `uncertain`은 별도로 센다. 둘 다 벤치의 관측값이다. 종합 중앙값과
  최댓값의 분모는 `matched`에서 나온 칸 모서리만이다.
- `compare-*.jpg` 네 장은 참조 이미지와 합성 사진을 전체와 확대 조각으로 비교한다.
  각 확대 조각의 명암도 백분위수는 `comparison-stats.json`에 있다. 조각마다 문항과
  확대율이 달라 명암도는 참고값이다. 참조 지면에는 작성된 답이 보이지 않는다.

이 도구가 주는 것은 줄의 잉크 범위, 답이 놓인 자리, 촬영 왜곡의 위치 참값이다.
실제 학생 필기의 줄바꿈 판독과 밑줄 오지목은 사람 참값을 단 실물 사진으로 측정한다.
