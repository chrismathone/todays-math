# 학생 수학 효과음 출처

Kenney, Interface Sounds 1.0 (2020), CC0. 원본 License.txt가 개인·교육·상업 프로젝트 사용을 허용한다. 표시 의무는 없지만 출처를 보관한다.

- 공식 팩: https://kenney.nl/assets/interface-sounds
- 사용 조건: https://kenney.nl/support
- 제작자의 배포 페이지: https://opengameart.org/content/interface-sounds
- 받은 압축본: https://opengameart.org/sites/default/files/kenney_interfaceSounds.zip

압축본 SHA-256: `f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232`. LICENSE.txt SHA-256: `f7966c773bbed0eca6a9c75081c44a178b38eae112724dbb5fdfbd4192d118a9`.

정본은 src/lib/math-srs/learningSoundManifest.ts이고 시험이 배포 WAV 바이트/해시/형식을 대조한다. 전체 100개 대신 아래 3개만 배포한다. master gain은 선형 0.2다.

| 이벤트 | 배포 파일 | 원본 OGG | 길이 | WAV 바이트 | 피크 | RMS |
|---|---|---|---:|---:|---:|---:|
| correct | correct.wav | Audio/confirmation_003.ogg | 0.322018s | 28446 | 0.893280 | 0.173319 |
| soft | neutral.wav | Audio/pluck_002.ogg | 0.161655s | 14302 | 0.947998 | 0.081813 |
| complete | complete.wav | Audio/confirmation_002.ogg | 0.539002s | 47584 | 0.895752 | 0.180223 |

- correct: 원본 SHA-256 `3091bf0be0497f825769ee0733ca7bdc3bcd59bd6c6e8f2ba8f93d580ff38022`; WAV SHA-256 `118f13df116ac3ca83e19439ab8147edaceab497d6b16b8386580beb3038536d`.
- soft: 원본 SHA-256 `c977fe249ff42d1c93a552b33abc13a8399df3879fa510475426e5c4bbac1da9`; WAV SHA-256 `1ae14438ec3d8a40da78f0ff795b91754d32068faba052e89e6e0ef583905660`.
- complete: 원본 SHA-256 `33b17a9a9a2397c62b285c52c33a907fdffb476909c99e42dde603f6a7a8b12c`; WAV SHA-256 `236f790b5d90aa13476638d635e910866b8b10b5ced0e87afbad289f58dd6021`.

변환은 Chromium OfflineAudioContext.decodeAudioData로 원본 OGG를 44100Hz에서 풀고 첫 채널을 PCM16 mono RIFF/WAVE로 기록했다. 클리핑이 없는 후보만 골랐으며 음량 정규화/추가 합성/생성을 하지 않았다. 원본과 변환 스크립트·파형 분석은 Orca artifacts/design-package-review-20261004에 보관한다.

후보는 이름·길이·파형 수치로 골랐다. 사람이 직접 청취하지 않았으며 청취 검수와 iPhone/iPad 실기기 확인은 대기다. 기본 꺼짐이며 홈 설정의 미리 듣기에서 확인할 수 있다. 교체할 때 정본 해시/측정값과 이 문서를 함께 갱신한다.
