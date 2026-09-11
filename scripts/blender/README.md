# Blender 도형 실험

개발 서버의 `/dev/blender`에서 4 × 3 × 2 cm 직육면체 전개도를 접고 돌려 볼 수 있다. 같은 치수의 기존 엔진 SVG, Blender 정지 렌더, 접기 애니메이션을 함께 비교한다. 현재 샘플은 이 직육면체 하나이며, 일반 도형 생성 API는 아니다.

## 생성과 검증

Blender 5.2.1 LTS와 PATH의 Python으로 확인했다. 저장소 루트에서 실행한다.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/blender/build_cuboid_demo.py
node scripts/blender/verify_cuboid_demo.mjs
npm run dev
```

- `build_cuboid_demo.py`: 실제 Blender 면·회전축·키프레임 생성, GLB 내보내기, 정투영 PNG 렌더. 기존 `scripts/figure/render_spec.py`로 비교용 SVG를 생성한다.
- 펼친 Blender 면의 꼭짓점을 투영해 번호가 있는 인쇄용 SVG도 생성한다. 원래 엔진의 치수 SVG와 구분된 실험용 자산이다.
- Blender 안에서 91개 프레임의 면적과 회전축, 닫힌 입체의 꼭짓점 8개·모서리 12개를 검사한다.
- `verify_cuboid_demo.mjs`: 내보낸 GLB를 Three.js로 다시 읽어 0%, 50%, 100%의 실제 애니메이션, 6개 면, 닫힌 입체의 크기와 꼭짓점을 독립적으로 검사한다.
- `public/dev/blender-assets/manifest.json`: 치수, 맞은편 면, 애니메이션 길이, 생성 버전, 파일 크기와 해시.

Blender는 자산을 만드는 로컬 도구다. 브라우저는 미리 생성한 GLB를 읽는다. `@google/model-viewer`는 이 개발 페이지를 열 때만 클라이언트에서 불러오며, 운영 문제·인쇄·DB 경로에는 연결하지 않는다. 개발 페이지는 production에서 404를 반환한다. `public`에 들어 있는 실험 자산 자체는 정적 파일이다.

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
