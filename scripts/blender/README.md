# Blender 도형 실험

개발 서버의 `/dev/blender`에서 4 × 3 × 2 cm 직육면체 전개도를 접고 돌려 볼 수 있다. 같은 치수의 기존 엔진 SVG, Blender 정지 렌더, 접기 애니메이션을 함께 비교한다. `/dev/blender/stack-cubes`에는 쌓기나무 12개를 돌리고 층별로 벌려 보는 예제가 있다. 두 샘플은 개발용 설명 화면이며, 일반 도형 생성 API는 아니다.

## 생성과 검증

Blender 5.2.1 LTS와 PATH의 Python으로 확인했다. 저장소 루트에서 실행한다.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/blender/build_cuboid_demo.py
node scripts/blender/verify_cuboid_demo.mjs
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/blender/build_stack_cubes.py
node scripts/blender/verify_stack_cubes.mjs
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/blender/export_cube_net_fold.py
npm run dev
```

개념 실험실(`/lab`)은 정육면체 전개도 `public/lab/blender/cube-net-lesson.blend`의 다섯 접힘 축을 하나의 `Fold` 클립으로 합쳐 `cube-net-fold.glb`로 내보낸다. 학생 화면은 그 GLB와 기존의 `cuboid-fold.glb`·`stack-cubes.glb`를 읽는다. 뒤의 둘은 `public/lab/models/`에 둔 **복사본**을 읽는다 — 관문이 누구에게나 여는 곳은 `/lab` 아래뿐이라서다(D-135 ⑼). 생성기를 다시 돌려 `public/dev/blender-assets/`의 원본이 바뀌면 거기에도 복사한다(`src/__tests__/unit/lab/labStaticAddresses.test.ts`가 바이트를 대조한다).

- `build_cuboid_demo.py`: 실제 Blender 면·회전축·키프레임 생성, GLB 내보내기, 정투영 PNG 렌더. 기존 `scripts/figure/render_spec.py`로 비교용 SVG를 생성한다.
- 펼친 Blender 면의 꼭짓점을 투영해 번호가 있는 인쇄용 SVG도 생성한다. 원래 엔진의 치수 SVG와 구분된 실험용 자산이다.
- Blender 안에서 91개 프레임의 면적과 회전축, 닫힌 입체의 꼭짓점 8개·모서리 12개를 검사한다.
- `verify_cuboid_demo.mjs`: 내보낸 GLB를 Three.js로 다시 읽어 0%, 50%, 100%의 실제 애니메이션, 6개 면, 닫힌 입체의 크기와 꼭짓점을 독립적으로 검사한다.
- `public/dev/blender-assets/manifest.json`: 치수, 맞은편 면, 애니메이션 길이, 생성 버전, 파일 크기와 해시.

Blender는 자산을 만드는 로컬 도구다. 브라우저는 미리 생성한 GLB를 읽는다. `@google/model-viewer`는 이 개발 페이지를 열 때만 클라이언트에서 불러오며, 운영 문제·인쇄·DB 경로에는 연결하지 않는다. 개발 페이지는 production에서 404를 반환한다. `public`에 들어 있는 실험 자산 자체는 정적 파일이다.

## 쌓기나무

`build_stack_cubes.py`의 높이 배열은 앞줄부터 `[[1,1,0],[2,3,1],[1,2,1]]`이다. 한 변 1cm 블록 12개이며 층별 개수는 8, 3, 1이다. 파란 화살표가 앞을 가리킨다. `Separate` 클립은 1초이며 위층으로 갈수록 6.5mm씩 더 벌려 아래에 가려진 블록을 보여 준다. 벌린 상태는 내부를 살펴보기 위한 설명 표현이다.

3D 모델은 1층 파랑, 2층 노랑, 3층 분홍으로 구분한다. 각 블록의 모서리에는 같은 색 계열의 진한 재질을 적용해 붙어 있는 블록도 하나씩 셀 수 있다. 모서리 폭은 0.25mm이며 블록의 한 변 길이와 정수 좌표 배치는 유지한다. 색과 모서리 폭은 생성기의 `LAYER_COLORS`, `EDGE_COLORS`, `BEVEL_WIDTH`에서 조정한다.

같은 정수 좌표를 기존 `stackCubes` 엔진에 넣어 위·앞·오른쪽·겨냥도 SVG를 생성한다. 앞에서 본 높이는 왼쪽부터 2, 3, 1, 오른쪽에서 본 높이는 앞에서 뒤 순서로 1, 3, 2이다. `verify_stack_cubes.mjs`는 내보낸 GLB의 실제 위치·한 변 길이·층 분리와 SVG의 숫자·칸 배치를 독립적으로 대조한다. GLB는 43,380 bytes이며, 생성 결과는 `public/dev/blender-assets/stack-cubes/`에 있다.

같은 네트워크에서는 `http://192.168.101.12:3000/dev/blender/stack-cubes`로 접속한다. `next.config.ts`의 `allowedDevOrigins`에 해당 IP를 허용해 Next 개발 리소스와 HMR 차단을 해제했다. 서버의 LAN 바인딩과 해당 주소에서 실제 3D 모델 로딩을 확인했다.

## 기존 엔진에 더할 가치

| 용도                                | 현재 확인한 상태                                                              | 판단                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| 전개도 접기·면의 대응 설명          | 동일 모델의 3초 접기 클립, 정지·되감기·회전, 번호 있는 정적 SVG 생성          | 즉시 활용할 수 있는 추가 가치                           |
| 기본 입체 문제의 치수·숨은 선·인쇄  | 기존 `cuboid`가 치수와 점선을 이미 표시. SVG 1,730 bytes, 전개도 2,425 bytes  | 기본 출력은 기존 엔진이 적합                            |
| 3D 모델과 인쇄 그림의 일치          | 같은 Blender 꼭짓점으로 정적 전개도 SVG 생성                                  | 두 표현을 함께 만드는 경로는 가능. 범용 어댑터는 미구현 |
| 복잡한 절단·교차·회전체·시점별 가림 | 기존 코드에 이미 정투영 `Camera`, 평면 교차, 절단 직육면체의 가림 계산이 존재 | Blender가 추가로 개선하는지는 복잡한 사례별 비교가 필요 |
| 평면 기하·함수·통계 그래프          | 기존 SVG 엔진의 주된 영역                                                     | 이번 실험으로 Blender 도입 이점은 확인되지 않음         |

실측 자산은 GLB 45,264 bytes, 정지 PNG 343,617 bytes, 번호 전개도 SVG 3,083 bytes다. 이는 뷰어 JavaScript를 제외한 자산 크기이며 전체 최초 로딩 비용을 뜻하지 않는다. Blender 렌더는 조명과 면의 가림을 표현하지만, 치수·수학 기호·숨은 모서리 점선을 자동으로 보장하지 않는다.

다음 확장 후보는 여러 방향에서 보는 절단 입체 한 종류다. 기존 엔진과 동일한 스펙으로 면·교차점·가림을 비교한 뒤, 효과가 입증되면 Blender가 구조를 만들고 기존 엔진이 치수와 라벨을 그리는 방식을 검토할 수 있다. Blender 메시의 근사값을 정답 계산의 근거로 사용해서는 안 된다.

관련 소스: `scripts/figure/elem_advanced.py`의 `_cuboid`, `_net_cuboid`, `_cut_cuboid`; `vendor/figure-engine/core/figure_solid.py`의 `Camera`, `plane_intersection`; 기존 규칙은 `docs/planning/09-figure-engine-guide.md`.
