# 정식 온톨로지 적용 — 현재 스택·계약·실행 아키텍처 준비 조사

작성일: 2026-10-23. 기준 HEAD: `34742b2f02456930d911e60a69ee020ccee56d64` = 지시된 origin/main 기준. 시작 시 `git status --short`는 비어 있었다. 담당 범위는 이 보고서와 저장소 밖 `ontology-full-20261023/architecture/`뿐이다.

이 문서는 **구현 제안과 소스 조사**다. 정식 적용 완료 보고가 아니다. 목표는 전원천의 의미 모델·실제 추론·검증·다중 홉 근거·검토 승인·기존 action 실행·감사·결과 피드백까지다. 기존 v2 및 네 소단원의 읽기 전용 시범은 보존 대상이자 조사 근거이며 최종 범위가 아니다. 제품 편집, 의존성 설치, 공유 DB/API, 서버, 브라우저, build, push, 환경 파일 접근, 유료 모델 호출은 하지 않았다. 공식 문서와 공개 패키지 메타데이터만 네트워크로 읽었다.

## 1. 결론과 확정할 경계

권고안은 **RDF 1.1 named graph + OWL RL의 명시적 제한 프로파일 + 실제 SHACL + 기존 PostgreSQL의 원자적 action ledger**다. 정적 콘텐츠의 OWL 추론을 오프라인 컴파일하고, 앱은 검증된 동일 버전 아티팩트를 실제 RDF 질의 엔진으로 탐색한다. 요청별 학습 관측·제안은 서버에서 RDF로 투영하고 실제 SHACL Core 엔진으로 검증한다. OWL 추론, SHACL 검증, 기존 Zod 전송 계약, 권한·정책·CAS 코드를 각각 다른 것으로 이름 붙인다.

새 코드가 기존 정책의 선수를 확대하거나 FSRS·채점·숙달을 재판정하지 않는다. 수학 원천 전체를 노드로 등록하는 작업과 그 사이 관계를 교육적으로 검수하는 작업은 병행하되 서로 다른 분모로 보고한다. **원천 전체 등록 + 미검수 관계를 명시**하는 것은 가능하지만, 미검수 관계를 지어내어 100% 연결로 채우는 것은 금지한다.

아래 엔진 조합은 공식 문서와 배포 제약에 근거한 **선택 후보**다. 리드가 Claude 협의·전체 원천 조사와 합쳐 최종 확정한다. 설치 호환성, 전원천 성능, 실제 Vercel 빌드는 아직 증명하지 않았다. 그 검증이 실패해도 목표를 읽기 전용으로 바꾸지 않고 동등한 계약을 만족하는 backend로 교체한다.

## 2. 현재 구현에서 직접 확인한 사실

| 영역 | 실제 근거 | 의미와 남는 간격 |
| --- | --- | --- |
| 웹·계약·DB | `package-lock.json`: Next 16.3.8, React 19.2.8, Prisma/client 6.19.3, Zod 4.4.3. `schema.prisma`는 PostgreSQL | CLAUDE.md의 Next 15+ 설명보다 잠금 파일이 구체적이다. 현재 의존성에 RDF/OWL/SHACL 전용 엔진은 없다 |
| 의존성 가용성 | 이 워크트리에 `node_modules`가 없다. `node_modules/next/dist/docs/`도 없다 | 설치하지 않았다. 실제 설치 API와 Next 배포 구성을 구현 단계에서 해당 판 로컬 문서로 확인해야 한다. 제품 코드는 쓰지 않았다 |
| v2 조회 | `src/lib/math-insight/v2Routes.ts`, `v2Snapshot.ts`, `v2Validation.ts`, `v2Access.ts` | 관측·계획·후보를 구조화하고 모델 전후 권한·revision·맥락을 재조회한다. Zod/if 검증이며 OWL 또는 SHACL이 아니다 |
| 기존 모델 경계 | `config.ts`, `v2Routes.ts` | 명시한 vendor/model, 20초·출력700토큰·singleAttempt와 선택 전용 응답. 그래프 확장이나 실행 프로토콜은 없다 |
| 교육과정 그래프 | `math_graph_2022.json`, `math-prerequisite/graph.ts` | 단원100, topic356, prerequisite186, support2, contains356. `dataStatus`는 성취기준 전수 대조 미완료이며 prerequisite186의 `officialBasis`는 전부 `pedagogical_inference` |
| 검증된 시범 연결 | `math-prerequisite/mapping.ts`, `versions.ts` | 코스 네 소단원↔두 편집 단원의 부분 대응. `verified`는 이 대응을 확인했다는 뜻이며 공식 성취기준 검수나 모든 topic 선수 검증이 아니다 |
| 전학년의 서로 다른 체계 | `fading/prerequisites.ts`, `math-explorers/curriculumBridge.ts`, 각 PROVENANCE.md | 은행 개념·탐험 카드·코스 소단원·그래프 단원 이름 공간이 다르다. authored card links와 코스 시범을 함께 읽되 근거는 별개. 현재 일일 안내 depth1을 새 그래프 질의 depth와 혼동하지 않는다 |
| 전체 은행 평가 ID | `src/lib/concept-blank/bank/assessments/*.json` 정적 JSON 키 집계 | 14표, 총9,119키. 이 수는 평가표 키 모집단이며 모든 문제은행 행·교과서·강의·교육과정·학습사건의 합집합 수가 아니다 |
| 교과서 연결 | `textbookConceptCatalog.contract.ts`, `textbookConcept.contract.ts`, schema의 Textbook/Edition/Concept/Snapshot/Attempt 등 | selectable target은 동치나 선수 확정 관계가 아니다. 판·revision·snapshot·발행 상태를 살려야 한다 |
| 교사 action | `courseTeacherRoutes.ts`, `mathSrsCourse.contract.ts`, `courseAutomation.ts` | 기존 PUT는 progress:write, 반·학생·지점, `expectedRevision`, `setCoursePlan`, teacher writer를 쓴다. 진행 세션 중 시작 소단원 변경을 거절한다 |
| 저장 원자성 | `math-srs/serverStore.ts` | `changeSrsState`는 학생 revision CAS, `guardedSrsStateTable`은 쓰기 tx 안 권한 확인. 원래 함수를 흉내 낸 별도 JSON writer를 만들면 안 된다 |
| 감사의 간격 | 같은 teacher route의 저장 후 `recordAudit`; `audit.ts` | 감사는 저장 뒤 별도 호출이고 실패를 삼킨다. ontology 실행의 durable 성공 receipt로 쓸 수 없다 |
| 배포 형식 | `vercel.json`, `next.config.ts`, `scripts/deploy/build-next.mjs` | 지역 icn1, 기존 Python API 하나와 Node Next 앱. build는 Prisma generate·그림 준비·Next build. 파일 tracing과 메모리 제한 선례가 있다 |

정적 계수·원본 SHA-256은 외부 `architecture/local-source-receipt.json`에 남겼다. 공유 DB 현행 수, 배포 계정 plan, 실제 Node/Python 런타임 설정은 조사하지 않았으므로 알 수 없다고 둔다. 기존 PROVENANCE.md의 카드230·단원46 등 수치는 과거 도입 기준선이고 현재 전수 집계 대신 쓰지 않는다.

## 3. 표준과 실제 엔진 선택

### 3.1 표준 고정

교환 기본은 RDF 1.1 TriG/N-Quads와 IRI, typed literal이다. statement identity·출처·검수는 named graph와 명시적 assertion resource로 보존한다. named graph라는 문법 자체가 신뢰나 권한을 주지는 않는다. [W3C RDF 1.1 Concepts](https://www.w3.org/TR/rdf11-concepts/)

RDF 1.2 triple term이나 RDF-star의 `<< >>` subject 확장에 의존하지 않는다. 리드가 확인한 RDF 1.2 문서 상태·object-position 제한을 임의 확대하지 않는다. 후일 해당 표준과 모든 엔진의 같은 문법 지원을 확인하기 전에는 serializer/DB가 triple term을 조용히 손실하도록 허용하지 않는다. 이 설계의 RDF 1.1 assertion resource는 그 전환 없이 동작한다.

의미 프로파일 이름은 `tm-owlrl-1`로 한다. OWL 2 DL 전체 추론·완전한 세계지식·교육학적 타당성을 뜻하지 않는다. open world에서 “선수 관계를 모름”은 “선수가 없음”이 아니며, domain/range로 유도된 타입은 입력 검증·허가가 아니다. [W3C OWL 2 Profiles](https://www.w3.org/TR/owl2-profiles/)

SHACL은 RDF data graph에 대한 실제 shape graph 검증이다. 존재하지 않는 필수 출처·중복 판·금지된 상태는 닫힌 입력의 위반으로 잡고, 교육적 관계 미확인은 별도 coverage로 남긴다. 정상적인 미확인 노드까지 shape 실패로 몰아 전원천 등록에서 빼면 안 된다. [W3C SHACL](https://www.w3.org/TR/shacl/)

### 3.2 권고 엔진과 제한

| 역할 | 후보 및 공개 metadata pin | 지원·제약 | 배치 |
| --- | --- | --- | --- |
| RDF 모델·직렬화 | RDFLib `7.6.0` | RDF 처리 기반. 설치된 판과 모든 입력 문법의 수용 여부는 별도 시험 | 격리 Python compiler |
| OWL RL materialization | owlrl `7.6.2` | 실제 forward-chaining OWL RL 구현. 자체 if를 reasoner라고 하지 않는다. RL 밖 공리·엔진 오류는 거절. 완전한 DL·교육 검증·자동 proof 완성은 주장하지 않음 | 콘텐츠/관계 게시 전 offline |
| 전체 SHACL | pySHACL `0.40.1` | Core와 SPARQL 제약을 사용. JS·remote imports·Advanced Rules는 기본 미사용. shape 자체도 meta validation. 프로세스 오류/미지원은 nonconformant와 구분 | offline graph 및 전체 무결성 |
| RDF/JS store/parser | N3 `2.13.12` | 실제 quads parsing/store. reasoning 역할 아님 | Node server-only |
| SPARQL | `@comunica/query-sparql` `5.4.1` | RDF/JS dataset을 source로 질의. 임의 원격 source·SERVICE·model 생성 query 금지 | Node server-only |
| 요청별 SHACL | `rdf-validate-shacl` `0.6.5` | 실제 Core validator. **SHACL-SPARQL을 지원하지 않는다**. runtime shape set은 허용 Core subset만; 미지원 제약을 TS if로 바꿔 SHACL 통과로 보고하지 않음 | 권한 투영 snapshot·제안 검증 |

공개 dependency metadata상 pySHACL은 owlrl>=7.6.2,<8, RDFLib>=7.3,<8을 요구하고 owlrl은 RDFLib>=7.6을 요구하여 위 후보는 선언상 교집합이 있다. Python 기본은 3.12.x의 정확한 patch/container digest를 추후 검증해 고정한다. metadata의 선언상 호환은 실행 성공이 아니다. `latest`를 배포 때 다시 해석하지 않고 direct/transitive lock·패키지 해시·SBOM·license를 묶는다. 현재 확인 시점 영수증은 외부 `source-receipts.json`; 설치 lock은 아직 없다.

근거: [OWL-RL 공식 저장소](https://github.com/RDFLib/OWL-RL), [pySHACL 공식 저장소](https://github.com/RDFLib/pySHACL), [Node SHACL 지원 범위](https://raw.githubusercontent.com/zazuko/rdf-validate-shacl/master/packages/shacl/README.md), [Comunica Node 질의](https://comunica.dev/docs/query/getting_started/query_app/), [N3 문서](https://rdf.js.org/N3.js/). OWL-RL readthedocs의 오래된 5.2.2 페이지와 현재 저장소 요구 버전이 달라, 그 페이지의 Python/의존성 수치를 현재 pin으로 옮기지 않았다.

대안은 Jena 기반 독립 Java compiler/query service다. Jena에는 RDF 추론·rule engine·derivation API가 있지만 기본 OWL reasoner를 완전한 OWL 2 DL/RL 구현이라고 확대하면 안 된다. 채택 시 프로파일을 다시 명시하고 동일 conformance fixtures와 proof 계약을 통과시킨다. 현재 Vercel Next 함수에 JVM을 함께 넣는 안은 런타임 검증이 없고 권고하지 않는다. [Jena inference 및 제약](https://jena.apache.org/documentation/inference/)

### 3.3 실제 OWL 공리와 교육적 비약 금지

처음 허용할 OWL construct는 명시한 클래스의 `rdfs:subClassOf`, 승인된 predicate의 `rdfs:subPropertyOf`, domain/range 타입 추론, 검토된 inverse, 구조적 `partOf`의 transitivity다. 사용한 construct별 W3C rule ID와 expected entailments를 manifest에 쓴다. 나머지 RL construct도 엔진은 가질 수 있지만 모델에 나타나면 profile checker가 게시를 막는다. 이 제한을 “모든 RL을 지원하는 제품”이라고 보고하지 않는다.

`directPedagogicalPrerequisite`는 **transitive가 아니다**. A→B와 B→C는 검토 가능한 두 홉 경로이지 A가 C의 strict prerequisite라는 확정 사실이 아니다. `supports`, `covers`, 같은 단원 membership도 선수나 동치로 합성하지 않는다. `owl:sameAs`, inverse-functional identity, 이름/문자열 기반 merge는 초기 프로파일에서 금지한다. 반 전체·상위 단원 통과를 하위 concept 숙달로 전파하는 규칙도 없다. 공식 성취기준 연결은 해당 판의 실제 인용문과 사람이 검토한 assertion이 있어야 한다.

## 4. 계약 초안 — ID, 출처, 판, 검수

### 4.1 IRI와 entity

기본 예시 namespace는 `urn:tmath:`이며 서비스가 관리하는 HTTPS namespace로 바꾸더라도 stable alias registry를 먼저 고정한다. 학생·교사의 실제 식별자를 모델용 IRI에 넣지 않는다.

| 개체 | 안정 ID 예 | 판·내용의 구분 |
| --- | --- | --- |
| CurriculumEdition / Standard | `urn:tmath:curriculum:KR-MATH-2022`, `...:standard:{officialCode}` | 판·고시·page/span·source hash. 서로 다른 교육과정 판의 같은 코드도 별개 |
| GraphUnit / Topic | `...:graph-unit:E56-N03`, `...:graph-topic:E56-N03.t01` | 기존 ID 보존. 순서에서 생긴 topic ID가 재편되면 source identity registry로 분리·계보 유지 |
| CourseSection / SeedUnit | `...:course-section:5-1-5-3`, `...:seed-unit:{persistentId}` | 제목 변경은 새 ID가 아니다. 시드에 영구 key가 없으면 승인된 key registry를 발급하고 문자열을 identity로 계속 쓰지 않음 |
| ConceptEntry / ExplorerCard / FadingConcept | `...:bank-concept:{id}`, `...:explorer-card:{id}`, `...:fading-concept:{id}` | 원래 namespace가 다르면 구분. 서로 연결됐다고 record를 복사하지 않음 |
| Problem / ProblemRevision / GeneratorTemplate | `...:problem:{uuid}`, `...:problem:{uuid}:rev:{digest}`, `...:generator:{namespace}:{templateId}` | 씨앗·template판·content/answer/figure digest는 rendition identity. 같은 externalId라도 재생성이 다른 문제일 수 있음 |
| Textbook / Edition / Concept / Snapshot / Asset | `...:textbook:{uuid}:edition:{uuid}:concept:{uuid}` | 원 DB ID·edition revision·발행 artifact hash·immutable snapshot 분리 |
| LearningEvent / PlanRevision | `...:private:{opaqueSubject}:event:{opaqueEvent}` | server-only projection. revision·session token/content fingerprint·event time·retained source kind 보존 |
| Assertion / Decision / Derivation | `...:assertion:{uuid}`, `...:decision:{uuid}`, `...:proof:{digest}` | assertion revision은 불변. 검토 변경은 새 decision; 기존 graphVersion은 수정하지 않음 |

필수 class: `SourceArtifact`, `SourceRevision`, `ContentEntity`, 위 도메인 class들, `Assertion`, `Derivation`, `ValidationRun`, `GraphRelease`, `LearningObservation`, `ActionProposal`, `Approval`, `ActionExecution`, `AuditEvent`, `FeedbackObservation`.

필수 property: `sourceKey`, `sourceRevision`, `contentDigest`, `inCurriculumEdition`, `partOf`, `covers`, `hasContentRevision`, `observedIn`, `observationKind`, `retentionBound`, `directPedagogicalPrerequisite`, `supports`, `reviewState`, `reviewRevision`, `evidenceKind`, `graphVersion`, `shapeHash`, `ruleHash`, `engineLockHash`, `premise`, `ruleId`, `tenantScope`, `validAt`, `invalidatedAt`. 스칼라 값은 typed literal. 요구 타입 자체를 권한으로 해석하지 않는다.

### 4.2 assertion 단위 상태와 provenance

RDF triple은 서로 같은 subject/predicate/object라도 출처·범위·검토판별로 별도 Assertion으로 식별한다. RDF 1.1 `rdf:subject`, `rdf:predicate`, `rdf:object`로 진술을 기술하고, 승인된 assertion만 실 triple을 published graph에 materialize한다. reification resource를 만든 것만으로 해당 triple을 참으로 assert한 것은 아니다.

각 Assertion에는 source revision, 정확한 locator(JSON pointer/ID, page·span 등), source digest, evidence kind, 작성 주체, review state/revision, decision ID, 교육과정 판, 적용 scope가 필요하다. 출처 유형은 `official-source | observed | authored-inference | model-proposal | unknown`으로 나눈다. `approved`가 되더라도 evidence kind는 바뀌지 않는다. 기존 `pedagogical_inference`를 들여온 행은 authored-inference로 남으며 사람 승인 영수증이 없으면 draft다.

상태: `draft → validated → approved → published`; 거절은 `rejected`, 게시 종료는 `retired`. validated는 엔진 검증을 통과했다는 뜻이고, approved는 **특정 assertion revision에 대한 사람의 판단**이다. 게시 후 수정은 새로운 revision의 재검토와 새 GraphRelease를 요구한다. 한 그래프의 검토 완료 표시로 그 안의 모든 관계를 승인하지 않는다.

PROV-O의 `prov:Entity`, `prov:Activity`, `prov:Agent`, `prov:wasDerivedFrom`, `prov:wasGeneratedBy`, `prov:wasAssociatedWith`로 원천·compile/검토 활동을 연결하고, 앱 고유 rule/premise/version을 추가한다. PROV link가 있다는 것과 그 근거가 진짜·허가된 것이라는 판단은 별도다. [W3C PROV-O](https://www.w3.org/TR/prov-o/)

### 4.3 graphVersion과 아티팩트

`graphVersion = sha256(release-manifest의 규정된 canonical bytes)`로 정의한다. manifest에는 formatVersion, ontologyHash, assertedGraphHash, inferredGraphHash, reviewStateHash(대상 assertion/revision별 decision snapshot), shapeHash(runtimeCore/full 각각), ruleHash, sourceManifestHash, proofManifestHash, engineLockHash, mapperVersion, profile, compiler commit, validationReportHash, coverageReportHash가 들어간다. graphVersion 자신과 가변 생성시각은 hash 입력에서 제외한다. JSON key order·UTF-8·newline·IRI normalization 규칙을 고정한다. source manifest만 맞추고 RDF나 승인 상태를 교체하는 것도 hash mismatch다.

N-Quads는 stable skolem IRI를 쓴 assertion·콘텐츠를 lexicographic sort해 hash한다. blank-node label을 단순 sort한 뒤 semantic canonicalization이라고 부르지 않는다. shape list 등 blank node가 필요한 파일은 원본 bytes hash를 쓰고 동일 파일 복사로 재현하거나, 별도 표준 canonicalization 구현을 검증한 뒤 채택한다. 동일 의미를 가진 모든 직렬화가 같은 hash라는 주장은 하지 않는다.

published artifact 묶음은 `manifest.json`, `ontology.ttl`, `asserted.nq`, `inferred.nq`, `review-state.ndjson`, `runtime-core.ttl`, `full-shapes.ttl`, `proofs.ndjson`, `validation-report.ttl`, `coverage.json`, `engine-lock`이다. 한 파일이라도 hash mismatch면 load 실패. 앱 코드가 지원하는 adapter/shape/profile version과 맞지 않아도 실패한다. old snapshot은 해당 불변 release에 묶고, active release 변경 시 실행 제안은 stale로 바꾼다. adapter factory는 version마다 불변instance를 돌려주며 요청은 하나의 GraphIdentity에만 묶인다. 전역 store의 현재판을 in-place 교체하지 않고 version-keyed cache와 generation pointer를 분리해 동시요청의 판 혼합을 막는다.

## 5. 실제 shape와 rule 계약

다음은 **미실행 초안**이다. 실제 validator로 실행한 리포트가 아직 없으므로 이 문서만으로 SHACL을 구현했다고 보고하지 않는다.

```turtle
@prefix tm: <urn:tmath:vocab:> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

tm:AssertionShape a sh:NodeShape ;
  sh:targetClass tm:Assertion ;
  sh:property [ sh:path rdf:subject ; sh:minCount 1 ; sh:maxCount 1 ; sh:nodeKind sh:IRI ] ;
  sh:property [ sh:path rdf:predicate ; sh:minCount 1 ; sh:maxCount 1 ; sh:nodeKind sh:IRI ] ;
  sh:property [ sh:path rdf:object ; sh:minCount 1 ; sh:maxCount 1 ] ;
  sh:property [ sh:path tm:sourceRevision ; sh:minCount 1 ; sh:maxCount 1 ; sh:nodeKind sh:IRI ] ;
  sh:property [ sh:path tm:reviewState ; sh:minCount 1 ; sh:maxCount 1 ;
    sh:in (tm:Draft tm:Validated tm:Approved tm:Published tm:Rejected tm:Retired) ] ;
  sh:property [ sh:path tm:reviewRevision ; sh:minCount 1 ; sh:maxCount 1 ;
    sh:datatype xsd:integer ; sh:minInclusive 1 ] .

tm:PublishedAssertionShape a sh:NodeShape ;
  sh:targetClass tm:PublishedAssertion ; sh:node tm:AssertionShape ;
  sh:property [ sh:path tm:approval ; sh:minCount 1 ; sh:nodeKind sh:IRI ] ;
  sh:property [ sh:path tm:graphVersion ; sh:minCount 1 ; sh:maxCount 1 ] .
```

추가 Core shapes는 다음 필드를 요구한다. SourceRevision: digest·locator; Derivation: 결론 하나·premise 하나 이상·rule 하나·graphVersion 하나; 관측: 원record revision·retention/source종류; Proposal: action ID·argumentHash·evidencePacketHash·expectedRevision·expiry·tenant; Approval: proposal revision·argumentHash·previewHash·actor·time; Execution: approval·idempotency key·before/after revision·result digest. minCount만으로 참조 대상 source의 존재를 증명하지 못하므로 `sh:node`와 source membership/전체 manifest 검사를 함께 사용한다.

전체용 SHACL-SPARQL은 pySHACL에서 실행한다. `partOf+` 자기 도달, published assertion의 승인 대상revision 불일치, manifest에 없는 source 참조, 서로 다른 tenant의 statement 결합을 검출한다. runtime Core 파일에 `sh:sparql`이 섞이면 loader가 거절한다. snapshot의 같은 tenant 여부는 Core `sh:hasValue`를 서버가 대상scope에 묶는 방법을 fixture로 확인하고, 이것도 DB 인가의 대체물로 쓰지 않는다.

검증 리포트는 `conforms`, `focusNode`, `resultPath`, `sourceShape`, `sourceConstraintComponent`, `severity`, stable violation code, graph/shape/engine version, run ID, report digest, completeness를 가진다. timeout·예외·미지원·중도 중단은 `incomplete=true`인 검사 실패다. 위반0과 같게 취급하지 않는다. 모델/화면에는 private focusNode·원문이 직접 노출되지 않도록 투영한다.

실제 OWL 예는 `TextbookConcept rdfs:subClassOf ContentEntity`, `lesson partOf chapter; chapter partOf edition; partOf rdf:type owl:TransitiveProperty`다. owlrl이 실제로 낸 conclusion을 저장하고 W3C RL rule ID(예 `cax-sco`, `prp-trp`)를 고정한다. proof는 모든 premise를 원assertion까지 따라가는 증명 DAG를 가진다. 학습 관측에서 숙달을 만드는 rule은 없다.

closure API 호출만으로 앱에 필요한 proof가 완성되지 않는다. 선택한 profile의 각 conclusion에 대해 offline proof extractor가 rule과 premises를 재구성하고 독립checker가 같은 결론을 검산한다. closure에는 있지만 proof가 없는 추론은 진단용으로 보류하고 AI/제안 근거로 내지 않는다. extractor를 OWL engine의 대용품이라고 부르지 않는다. 구현이 불가능하거나 과도하면 derivation을 제공하는 다른 실제 engine으로 adapter를 교체한다.

## 6. 전원천 파이프라인과 앱 내 관계 게시

### 6.1 offline compile의 의미

offline은 **사용자 요청의 짧은 read/action transaction 밖에서 계산한다**는 뜻이다. 개발자가 수동으로 로컬 스크립트를 실행해야만 새 관계가 게시되는 구조로 끝내지 않는다. 같은 compiler package를 초기 원천 적재와 웹앱의 내구 publish job에서 재사용한다.

1. source owner가 grade/edition/namespace별 전체ID manifest를 낸다. repo source는 commit/path/digest, DB source는 승인된 consistent snapshot/read revision/추출receipt에 고정한다. 이번 task는 공유DB를 추출하지 않았다.
2. normalizer는 native ID·source order·판·본문/그림/답 digest를 보존해 RDF assertion으로 만든다. 같은 문자열을 sameAs나 선수 관계로 바꾸지 않는다.
3. draft dataset에서 source 존재·ID 유일성·shape·profile·cycle을 검사한다. 엔진 실패/부적합/미검을 분리한다. 기존 그래프의 교육적 추정과 공식 근거를 구분한다.
4. 원천 전체는 등록하되 교육관계는 assertion revision별 사람이 검토한다. 등록metadata 승인과 교육적 선수관계 승인은 별도decision이다. 승인되지 않은 관계는 candidate graph에 격리한다.
5. approved slice와 pinned ontology만 실제 owlrl에 전달한다. draft 포함 전체에서 closure를 만든 뒤 draft edge만 지우면 그로부터 유도된 결론이 남으므로 금지한다.
6. asserted와 closure 양쪽을 명시한 shape로 검증한다. domain/range 추론이 raw type 누락을 덮는 반례를 둔다. rejected/retired premise를 가진 conclusion은 게시하지 않는다.
7. hash manifest, 실제 ValidationReport, proof, competency 결과, coverage를 생성하고 독립 검증 후 불변release로 보관한다. 추가/취소는 전체 재계산을 기본으로 하며 증분 추론을 이미 지원한다고 주장하지 않는다.

원천 범위는 seed 전학년, graph 전단원, 일곱 학년 bank와14assessment표, explorer core/supplement, fading concept/groups, 지원하는 전체 generator/template, 문제은행의 실제 허용된 행과 source/figure, 교과서 전체edition/concept/problem snapshot/asset, 공식 교육과정 원전/판, 학습사건/계획의 각 소유영역이다. 학생 데이터는 global artifact에 넣지 않고 runtime 투영한다. 이용권한이 없는 원문은 복제하지 않고 ID/메타데이터와 이용불가 사유를 등록한다. 유한 generator family/template와 실제 생성문항 instance 분모를 분리하며 가능한 모든 씨앗을 전수실체로 세지 않는다.

### 6.2 새 관계 후보 → 승인 → 실제 엔진 → 게시 폐루프

새 관계 제안권 `ontology:author`, 교과 검토권 `ontology:review`, 게시권 `ontology:publish`, 학생 계획 변경권 `progress:write`는 별개의 capability다. 한 교사의 수업관리 권한만으로 global curriculum을 고칠 수 없고, tenant 관계 승인도 다른 지점에 퍼지지 않는다. global publisher는 기존 계정/관리정책에 맞춰 리드가 명시적으로 부여할 역할로 정한다. 자동 추정한 OWL 타입으로 어느 capability도 부여하지 않는다.

구체적 폐루프는 다음과 같다.

1. 앱에서 사람이 또는 모델이 허용된 subject/predicate/object/source ID를 선택해 `RelationProposal` draft를 만든다. 모델은 ontology 공리·자유query·shape를 생성해 게시하지 못한다. sourceSnapshot/args/evidence/review hash는 서버가 원데이터로 재구성해 묶으며 클라이언트가 보낸 hash 자기선언을 신뢰하지 않는다.
2. 서버는 Core shape를 즉시 검사하고, `validate-candidate` 내구job에서 실제 pySHACL 전체 검사를 실행한다. draft만으로 만든 결과에는 untrusted 표시를 붙이고 published query와 분리한다. shape 통과는 교육적 사실의 참을 뜻하지 않는다.
3. 사람이 원출처/정확한 span·관계종류·범위·counterexample를 보고 특정 assertion revision을 승인하거나 거절한다. 승인 상태와 `publish-requested` outbox/job을 같은 DB tx로 저장한다. 승인 직후 아직 active graph는 그대로이며 UI는 게시 대기를 표시한다.
4. dispatcher가 `ontology_compile_job`을 DB에서 lease한다. job은 inputManifestHash, approvedReviewStateHash, expectedActiveGeneration, profile/engineLockHash, scope, attempt/leaseGeneration, stage, failure receipt를 가진다. 프로세스 메모리 큐나 `after()`만으로 내구성을 주장하지 않는다.
5. private Python compiler가 기존 published base와 승인delta의 정확한 manifest를 받아 동일 package로 **실제 OWL materialization + SHACL + proof**를 실행한다. 원천은 immutable hash key에 고정하고 임의URL/remote ontology import/JS를 막는다. compile 자체는 모델 호출이나 학생계획 쓰기를 하지 않는다.
6. output은 같은 프로젝트/소유권 안의 private immutable artifact 저장소에 hash key로 먼저 업로드한다. Node 검증자는 바이트/hash·job/leaseGeneration·source/review 상태·actual engine receipt·proof/report를 대조한다. 부분업로드·미지원·timeout은 failed/retryable 상태로 남고 active graph는 바뀌지 않는다.
7. publisher의 활성화 tx는 현재 capability/branch, assertion 승인revision, base active generation, engine/shape 지원판을 다시 확인하고 release row＋active generation CAS＋publish audit＋job completed를 함께 commit한다. 그사이 다른 release/철회가 있으면 stale로 보류하고 임의로 합치지 않는다. 영향이 달라진 새preview는 재검토한다.
8. 캐시는 version-keyed이므로 새판을 in-place 덮지 않는다. active pointer만 새generation으로 바뀌고 새request가 새adapter를 연다. old snapshot/proposal은 재현용 이전판을 유지하되 실행은stale다. 중복callback/늦은lease 결과는 active를 다시 전환하지 못한다.

불변 artifact 업로드와 DB commit 사이에는 분산tx를 요구하지 않는다. 파일을 먼저 검증·저장하고 단일DB의 pointer를 공개점으로 삼는다. 중간의 orphan artifact는 나중에 job/reference를 확인해 정리한다. 게시 후 artifact를 덮거나 private source lease가 철회된 결과를 계속 캐시에서 허가하는 것은 금지한다.

### 6.3 scope별 dataset

| graph | 보관·사용 | 금지 |
| --- | --- | --- |
| global curriculum/content metadata | 권리 확인된 불변published artifact | 학생·교사·tenant 비밀, 사유 문제본문 혼입 |
| tenant private content | branch/user 소유의 판별artifact/DB projection | 같은 이름/교재ID라는 이유로 다른branch union |
| request learner evidence | 인가 후 readSrsState 등에서 최소RDF 투영, asOf/revision 고정 | global cache·공개파일·브라우저 전량배포·모델 실ID/원문/답 전송 |
| candidate/rejected | 검토용scope와 별도권한 | approved dataset으로 암묵union |

named graph FILTER만으로 인가했다고 하지 않는다. adapter에는 허용된 dataset만 주고, 파생결론의 가시scope는 **모든 premise의 허용scope 교집합**으로 제한한다. 원천권한이 좁아지면 파생결론도 좁아진다. 개인 기록은 과거전부가 아닐 수 있으므로 보존상한·summary-only·hint/self-check/retry·미완료를 유지한다.

### 6.4 닫힌 다중홉 query와 근거packet

API는 `competencyQuestionId + bound entity IDs + page cursor`를 받는다. query text는 코드 소유의 parameterized template이며 LLM 자유SPARQL을 받지 않는다. RDF term으로 변수를 묶고 문자열연결을 피한다. SERVICE/UPDATE/임의URL/import/unbounded federation은 거절한다. property path의 도달결과는 설명proof 자체가 아니므로 명시적 edge/assertion ID에서 별도path를 만든다. [W3C SPARQL 1.1](https://www.w3.org/TR/sparql11-query/)

매hop에서 predicate allowlist, published review, current source revision, scope, proof availability, 실제 shape결과로 invalid frontier를 잘라낸다. 금지노드를 거쳐 돌아오는 path도 무효다. global static 도달과 개인관측 결합은 다르게 취급한다. conclusion만 보여도 premise가 숨겨지면 그결론을 근거로 내지 않는다. 거절한 hidden node의 수·존재·prune 이유도 다른tenant에게 유출하지 않는다. noninterference fixture는 다른tenant 데이터만 바꿔도 응답/공개집계가 같아야 한다.

초기 자원예산 제안은 page최대100행, frontier최대500, 설명최대50assertion, deadline2초다. **미계측 운영예산**이며 교육policy가 아니다. 탐색을 depth1로 축소하지 않고 bounded continuation/visited set으로 계속한다. manifest 완전성과 탐색완료가 있을 때만 부재를 단정한다. 상한/중단은 truncated/unknown으로 표시하고 부정결론이나 action자격으로 바꾸지 않는다.

packet은 canonical fact ID, 제한된 코드소유 설명, source revision/locator, evidence/review kind, path/proof ID, GraphIdentity, snapshot revision/asOf/expiry, coverage/exclusions, validation report ID를 가진다. 모델은 packet의 ID만 고르고 최종문구와 수는 deterministic composer가 쓴다. ID membership 합격과 질문관련성·답변완전성 합격은 별도다.

## 7. AI·데이터 주권·모델 진위

모델 없이도 원천탐색·shape report·교사 검토·승인action은 사용할 수 있다. AI는 의도/근거선택·후보정렬·draft 설명을 보조하며 인가·OWL공리·shape·실행자격을 결정하지 않는다. raw question에도 개인정보가 있으므로 기존의 알려진 식별자마스크만으로 완전익명화를 주장하지 않는다. 승인된 투영schema의 field allowlist·byte상한·누출fixture를 통과한 packet만 보내며 원교재/학생기록 전송을 기본가정에 넣지 않는다.

프로젝트 TypeSafe skill의 live index와 function-calling/citation-check를 확인했다. Choice/Noul 등을 닫힌후보·개별근거 판단adapter로 쓸 수 있으나 이번조사에서 provider/SDK/모델을 도입하지 않았다. typed/probability 출력은 참이나 실행허가의 증거가 아니다. 확신값으로 사람승인을 생략하지 않고 held-out 평가로 threshold를 결정한다. [TypeSafe function calling](https://docs.typesafe.ai/cookbooks/function_calling), [citation check](https://docs.typesafe.ai/cookbooks/citation_check)

평가receipt는 requested provider/model, transport가 반환한 reported model, request ID, stop reason, usage, timeout/HTTP failure, prompt/schema/packet hash, parser/semantic verdict를 분리한다. 이 metadata로 내부모델 진위의 암호학적 증명을 주장하지 않는다. reported model이 없으면unknown, silent fallback은금지다. 실제협의·모델평가·합성fixture·사람검토는 별도기록이다. 이번task의 실제모델호출은0이며 실협의완료를 주장하지 않는다.

## 8. 사람 승인 후 기존 action 실행

### 8.1 action과 registry

첫 연결은 **`course.plan.set/v1` → 기존 PUT `/api/students/{id}/math-srs/course`와 공유하는 도메인처리**다. 임의FSRS 변경이나 새보충판정은 만들지 않는다. 인수는 기존 `coursePlanInputSchema`의 startSectionId, dailyQuestionCount(5/10/15/20), enabled, expectedRevision이다. 모델이 section/quota를 생성해 바로 쓰지 못한다. 기존값을 보존한 preview에서 교사가 필요한 변경을 선택하고 근거와 함께 확인한다. 근거부족한 변경을 AI추천으로 포장하지 않는다.

registry는 action ID/contractVersion, strict인수schema, capability, scope resolver, snapshot precondition, preview, conflict codes, transactional apply, audit redactor, result/feedback projector, compensation policy를 가진다. 모델이 준 URL/함수명/SQL을 실행하지 않는다. 새action은 등록과 독립허용/거절시험·운영승인을 거친다.

`setCoursePlan`은 plan/configuredAt, start변경시 learner.selectedSectionId를 쓴다. 진행session 중 start변경을 거절한다. 기존 teacher writer와 학습기록을 보존하고 FSRS memory를 임의수정하지 않는다. preview도 이 기존transition으로 계산하며 별도모사하지 않는다.

### 8.2 proposal·approval·execution·audit·feedback 계약

| 계약 | 필수내용 |
| --- | --- |
| ActionProposal | id/revision/state, 내부subject/scope, action/contractVersion, canonicalArgs/argumentHash, GraphIdentity, evidencePacketHash, source watermarks, expectedStudentRevision, authorization/context stamp, previewHash, createdAt/expiresAt, model receipt 또는human-origin |
| Approval | id, proposalId/revision/argumentHash/previewHash, 명시적human actor, scope, decision/time/expiry. 로그인과 과거일반허가를 이번제안승인으로 간주하지 않음 |
| ActionExecution | executionId, approvalId, action, idempotencyKey, request hash, before/after revision, durable status, canonical result digest/body, committedAt |
| AuditEvent | proposal/approval/execution/graph/packet 참조, actor/대상/scope, before/after diff, outcome/reason, sequence. 본문/키/답 제외 |
| FeedbackObservation | executionId, 결과source/time, 적용/시작거절/취소/후일관측 종류, revision. 효과·원인·숙달로 확대하지 않음 |

상태는 `draft → validated → pending-review → approved → executed`, 별도출구는 `rejected | expired | stale | execution-failed`다. 승인/실행이 별도request여도 매번freshness를 확인하고 승인받은 동일revision/인수만 쓴다. 한버튼 승인실행도 내부Approval/Execution entity는 구분한다. proposal의 subject/revision/hash는 서버가 재구성하며 client hash가 맞다는 이유로 임의packet/인수를 믿지 않는다.

### 8.3 기존service에 연결하는 원자적실행

1. 인가된snapshot/published graph에서 관측→근거후보를 만든다. 모델출력은draft에만 영향을 준다. source/shape/policy를 통과한preview를 보여준다.
2. 교사의 명시조작으로 proposal revision/인수hash/previewHash를 승인해Approval을 영속화한다. 인수변경은 재승인 대상이다.
3. execute에서 현재actor/session, account/menu, branch/class/enrollment, source lease, subject revision, active graph generation, shape/policy/source watermark를 재조회한다. v2 read stamp를 writer허가로 사용하지 않는다.
4. 기존PUT와 execute가 함께 부르는 작은 도메인service를 추출한다. `setCoursePlan`, `changeSrsState`와 `srsStateTableIn(tx)`, 기존ownership/teacher옵션을 재사용한다. 내부HTTP로 PUT를 호출하고 나중에 별도tx로ledger를 쓰지 않는다.
5. 같은PostgreSQL tx에서 proposal/approval을lock한다. 기존idempotency receipt는 현재scope를 재인가한 뒤 동일result로 재생한다. 같은key/다른request hash는409. 같은approval/다른key도 unique소비제약으로 중복적용을 막는다.
6. 같은tx에서 최신인가/context/source, active generation을 확인하고 expectedRevision으로state CAS, approval consumption, Execution receipt, 필수AuditEvent, feedback/outbox를 함께 쓴다. 하나라도실패하면전부rollback. CAS실패에 낡은승인을 새state위로 재적용하지 않는다.
7. commit후 응답상실도 재송신시 같은receipt가 된다. commit전중단은write0. 외부best-effort로그는outbox로 재송신할 수 있지만 성공의 근거는 같은tx의durable row다.

이것은 **요구되는 구현**이다. 현재 guardedSrsStateTable은 create/update마다 별도tx를 만들기 때문에 바깥proposal tx만 추가하면원자적이지 않다. state-store owner가 tx port를 추가하고 JSON저장의 단일진입점을 유지해야한다. 기존recordAudit 의미를 바꾸는 무관한전체route개편은 하지 않는다.

### 8.4 freshness 선형화점

같은tx라는 말만으로 읽은직후의permission/source변경을 막지못한다. account, branch menu, class/enrollment/managed grant generation, active release, proposal/approval, student state의lock/generation protocol에 해당변경writer도 참여해야한다. `assertClassWrite`는managed class에서FOR SHARE를 취하지만 nonmanaged는동일lock을 안쓴다. 현코드가 전source의원자적최신권한을이미보장한다고말하면안된다.

현재binding→class 순서와 충돌하지 않게 모든write/revocation의lock순서를 조사·고정한다. 모델/네트워크IO는짧은tx밖에서끝내되 기존강제refresh의미를약화하지않는다. refresh와tx내재검증의분리는전담owner의회귀대상이다. 모든revocation writer의협조를증명하기전execute를열지않는다. SERIALIZABLE만으로 외부서비스의즉각실효를알수없다.

lease/expiry는서버시계와여유시간으로실행직전에판정하고tx deadline을둔다. 보장범위는기존신뢰lease/generation계약의선형화점이다. asOf고정으로단순시각경과에변하는snapshot hash는stale비교에쓰지않는다. 날짜가action정책에영향을주면KST day key를명시precondition으로넣는다.

## 9. DB migration과 원자적 공개

semantic artifact생성만은migration없이가능하다. 하지만durable proposal→approval→execution→audit는새영속화가필요하며SRS JSON/app_setting에밀어넣고DB무변경이라고하지않는다.

| 새표안 | 핵심열·제약 |
| --- | --- |
| ontology_graph_release | graphVersion PK, manifest/shape/proof/review hashes, status, artifact locator, validation receipt |
| ontology_active_release | scope key PK, generation>=1, graphVersion FK, updated actor/time; generation CAS |
| ontology_assertion_review | assertionId+revision+decision, source snapshot/evidence kind/scope; 승인snapshot불변 |
| ontology_compile_job | job ID, input/review/engine hashes, scope, base generation, leaseGeneration/expiry, attempt/stage/result; 중복요청unique |
| ontology_proposal | subject/scope/action/args/revision/stamps/expiry/state |
| ontology_approval | proposal revision/args/preview/actor/scope/time; 변경불가승인identity |
| ontology_execution | unique approvalId, unique scope+idempotencyKey, request/result hash/body, before/after revision |
| ontology_audit_event | execution/publish/review 참조, actor/scope/outcome/diff, sequence |
| ontology_outbox | event ID, aggregate/version, stage/attempt/nextAttemptAt/processedAt; 재송신/재개 |

표는server-only로두고browser role에직접grant하지않는다. branch/user/subject복합scope, 상태CHECK, revision>=1, action/contract allowlist, FK/unique/index를DB owner가SQL로구체화한다. 삭제/익명화·최소감사잔존·retention기간은append-only와충돌하지않게운영판단을구체화한다. hash chain은보조수단이며DB관리자에대한완전한비변조증명이아니다.

이행순서:

1. additive SQL/권한SQL/readback/rollback SQL, dry-run schema diff, row수예측, reader/writer SHA를준비한다. 기존학습표alter/backfill을피하는안을기본으로한다.
2. 격리DB에서empty→upgrade, 현schema snapshot→upgrade, missing reader, duplicate/FK/CHECK, 실패rollback, CAS/receipt/응답소실을시험한다. 실제state+ledger를읽어대조한다.
3. SQL·수치·권한차이·backup/rollback까지준비한뒤리드가공유DB적용에필요한판단을원장님께제시한다. 이번task는공유DB변경없다.
4. DB먼저→writer off reader→정확SHA운영readback→writer순서다. 기존SRS JSON필드를추가하지않아기존reader floor를움직이지않는안을택하되새ledger writer를켜기전그ledger reader최저SHA를기록한다.
5. artifact전부를불변key에올리고checksum/shape/proof/coverage검증후active pointer를CAS한다. active바뀌면old process도새generation을확인하며해당artifact/adapter지원이없으면닫는다.
6. runtime/승인UI/권한/감사통합이합격해야writer를연다. 기존학생/v1/v2무헤더strict응답과AGENTS.md의모든reader floor를보존한다.
7. rollback은먼저writer중지→in-flight/receipt조정→ledger보존이다. 이미적용한학생계획을DB restore로되돌리지않고현재revision에대한새사람승인의보상action으로처리한다. 새write후파괴적down migration은금지다. graph되돌림도새generation으로감사한다.

## 10. 실제 배포 가능성과 내구 compiler

### 10.1 기존 배포 형식을 유지하는 우선 후보

Vercel 현행 문서의 표준 bundle 상한은 Node 250MB/Python 500MB, payload 4.5MB이며 Fluid의 Hobby 상한은 300초, Pro/Enterprise는 800초다. 현재 계정의 plan/설정은 확인하지 않았다. beta 대용량·연장시간을 성립 전제로 하지 않는다. [Vercel Functions limits](https://vercel.com/docs/functions/limitations)

현재 `api/mathgen-engine.py`와 `src/lib/mathgen-engine/transport.ts`를 직접 확인했다. 기존 Next와 root Python 함수가 한 배포에 함께 있으며 고정 endpoint, HMAC protocol/timestamp/body, 크기 제한, timeout, 고정 script 실행, loopback 개발 경로가 있다. 이 기존 기능은 건드리지 않고 **새 `api/ontology-engine.py` + `src/lib/ontology/transport.server.ts`**로 같은 배치 형식을 사용하는 것이 변경이 적은 우선 후보다. 기존 엔진의 operation 목록에 ontology를 끼워 넣지 않는다.

구체 파일 계약은 새 handler, `scripts/ontology/compiler/**`, compiler 전용 requirements/lock, 새 함수만의 `vercel.json.functions` include/exclude/maxDuration이다. Python 배포가 실제로 읽는 dependency manifest는 root `requirements.txt` 또는 지원하는 pyproject에 별도 compiler lock을 명시적으로 연결한다. 기존 handler가 dependency-free라는 사실과 새 dependency의 함수별 격리를 실제 bundle에서 확인한다. nested requirements 파일만 놓고 Vercel이 자동 설치한다고 가정하지 않는다. 기존 mathgen 함수 설정·파일·figure/hwpx vendor·Node transport는 변경하지 않고, 배포 trace와 재검증으로 공존을 확인한다. 공식 Python 런타임은 현재 3.12/3.13/3.14를 지원하며 선택한 정확 판의 호환성을 후속에서 측정한다. [Vercel Python runtime](https://vercel.com/docs/functions/runtimes/python)

이 endpoint는 네트워크 차원의 private service라고 부르지 않는다. 공개 접근점이더라도 application HMAC 인증으로 Node 서버만 호출하게 하며, 무서명·잘못된 서명·과거 timestamp·다른 배포 audience·재생 lease·다른 job body를 거절한다. 기존 `STUDIO_ENGINE_SECRET` 또는 `AUTH_SECRET`는 **이름과 코드 정책만** 확인했다. 값을 읽지 않았다. 기존 secret 재사용 여부는 operator 정책으로 정하고, 재사용 시에도 `ontology-engine-v1` domain separator와 별도 서명header를 사용해 기존 `mathgen-engine-v1` 서명이 유효해지지 않게 한다. 별도 secret을 택하면 `ONTOLOGY_ENGINE_SECRET` 같은 서버 전용 변수를 구체 설정안에 넣으며 기존 기본값을 덮지 않는다.

Node transport는 사용자 `Host`/request URL 대신 운영 설정 또는 현재 deployment의 신뢰 URL만 사용한다. redirect는 거절하고 배포보호 우회 credential은 기존 정책처럼 동일 deployment에만 보낸다. proxy 예외를 추가하더라도 ontology 함수 자체의 HMAC 검사는 반드시 남긴다. job ID, source/input hash, engine/profile, lease generation, expiry를 signed body에 묶고 실행 후 current lease/CAS를 Node에서 다시 확인한다.

전체 RDF를 한 request에 넣지 않는다. 정적 base는 검증된 package artifact 또는 private hash key에서 읽고, request는 approved delta/job/manifest hash만 보낸다. 외부 artifact가 필요하면 미리 정한 private origin과 object key만 서버가 해석하고 임의 URL, 파일 path, ontology import, SPARQL SERVICE를 허용하지 않는다. request/response는 4.5MB보다 낮은 상한을 정하며 압축을 쓰면 압축 전후 byte 상한과 gzip bomb 반례를 함께 검증한다. 결과 전체가 크면 immutable artifact에 저장하고 receipt/hash만 반환한다. 학생 기록과 범용 DB credential은 compiler에 주지 않는다.

대안으로 같은 프로젝트 Next와 private Python을 구성하는 **Vercel Services는 Beta**이며, private binding·동일 Git 배포를 제공한다. public rewrite가 없는 compiler만 외부에서 접근할 수 없고 binding 자체는 app 인증이 아니다. 전환한다면 `services.web.root="."`, compiler root/entrypoint, binding `ONTOLOGY_COMPILER_INTERNAL_URL`, web만 향하는 public catch-all을 검증한다. 기존 functions/build/Prisma/그림 준비/rewrites/headers/cron/icn1을 각 소유 service에 보존해야 하며 `/api` 전체를 compiler로 보내면 안 된다. 이 대안은 현재 확정하지 않았다. [Vercel Services](https://vercel.com/docs/services), [bindings](https://vercel.com/docs/services/bindings), [config reference](https://vercel.com/docs/services/config-reference)

### 10.2 내구 publish 실행 방법과 실패 복구

웹승인tx가job/outbox를만들고Node dispatcher가claim한다. 즉시dispatch는best-effort wakeup일뿐이며별도cron/scheduler가queued·expired lease를재개한다. cron호출도인증하고job수·tenant별동시성·시도상한을둔다. 기존daily-auto-test/log cron을덮지않고별도endpoint를추가한다. 운영plan의cron빈도와스케줄지연을실제확인해야한다.

compiler는한bounded attempt에서full OWL/SHACL compile을실행한다. state는DB job과immutable artifact에있고함수memory/response/로컬디스크에만남지않는다. 입력은작은manifest locator/hash로보내고bulk RDF는동일권한private storage에서읽어payload상한을피한다. 출력업로드도hash-bound이며Node callback/dispatcher가검증한뒤만activate한다. HTTPtimeout후동작이살아있을수있으므로leaseGeneration이중복/늦은commit을막는다. retry는같은pinned입력으로deterministic재계산하며동일결과는중복artifact를만들지않는다.

한full compile이기본함수상한에안들어가면단순chunking으로전역OWL/SHACL동치라고주장하지않는다. dependency-closed partition과최종전역검사를검증하거나아래전용worker대안으로옮긴다. 긴request를함수밖에서계속도는background process처럼취급하지않는다.

| 대안 | 장점·대가 | 채택기준 |
| --- | --- | --- |
| 같은project private Python Service(Beta) | Node/Python atomic Git배포·내부binding. 프로젝트routing전환과Beta검증필요, 요청/CPU/보관비용추가 | 현앱모든route·Python API·asset·build hook보존및full compile budget통과 |
| 기존 Vercel Python function + app-auth (우선 후보) | Services전환없이현배포형식유지. endpoint는private binding이아니라public접근점이므로엄격HMAC/nonce/audience/상한·proxy허용목록검증필수 | public surface추가를명시평가하고default deny와실제bypass거절확인 |
| 사유network의dedicated Python worker + 동일DB job | full compile시간/메모리자유도. 새운영host·deploy/patch/관측·지역/비용관리필요 | Vercel budget미달또는Beta불가, 동일ports/manifest/CAS/권한계약유지 |
| durable CI compile job | 앱의승인outbox가고정revision의자동job을dispatch, artifact/callback서명검증. queue delay·repo토큰·CI비용과callback보안추가 | 개발자수동실행이아니며web→실engine→active까지자동내구증거가있을때 |

어느대안도이task에서provision/호출/배포하지않았다. Services를확정하지않았으며권고backend가바뀌어도후속의폐루프완료요건은유지한다.

### 10.3 성능과 배포 검증

Next Node에는N3/Comunica/JS SHACL adapter만server-only로두고artifact는tracing대상또는같은프로젝트private store에서읽는다. Next16.3.8실API/ESM/bundle/tracing/cold memory는미검증이다. 전체교재의OWL폐쇄를매request또는Next build중공유DB추출로생성하지않는다. runtime은**이미실제로추론된OWL결과를소비**하며그자리에서OWL엔진이동작한다고부르지않는다. 새관계승인시에는앞절내구compiler가실제엔진을다시실행한다.

전원천과최대tenant합성자료로cold load/parse, Core shape, 3hop/깊은path/불달/높은fanout, proof전개, 모델후freshness, approval tx의p50/p95/p99·peak RSS·artifact/closure/proof bytes를측정한다. 아직수치가없다. 예산초과는truncated/비실행이며page/partition/전용service를평가한다. 현재v2의20초모델timeout은graph성능증거가아니다. 한Git SHA의Next/Python배포·preview/prodreadback·oldversion재생·privateendpoint거절까지리드가확인한다.

## 11. 수용 질문과 긍정/부정 반례

리드의외부`ACCEPTANCE.md`전체기능요구를반영했다. 다음기대값은구현결과에맞춰바꾸지않는다.

| CQ | 긍정fixture·기대값 | 부정fixture·기대값 |
| --- | --- | --- |
| CQ01 전체원천등록 | manifest전ID에entity/source revision, namespace별일치 | 1ID누락/중복/형오류거절. 미취득을0건으로세지않음 |
| CQ02 자료와판 | Concept→Section→Edition의partOf경로와원assertion/rule재현 | 같은이름다른판은별개. source없는복제는unknown |
| CQ03 실제OWL | subclass/partOf전이fixture의실owlrl entailment와proof일치 | 미실행/미지원공리/if모사만으로합격불가 |
| CQ04 OWA와위반 | 미확인선수는정상entity의unknown | 게시진술source/approval누락은SHACL위반; unknown을선수없음으로단정금지 |
| CQ05 타입으로인가세탁금지 | raw ID/소유권과명시인가통과 | domain으로Teacher타입이유도돼도인가거절. raw shape누락검출 |
| CQ06 다중홉근거 | 승인edge3본과전premise/source/rule/version | draft/rejected/별branch/source누락에서prune, 별유효path만반환 |
| CQ07 교육적비약금지 | A→B→C는2hop authored path | A strict-prerequisite C, 숙달전파, 관측에서원인진단은출력금지 |
| CQ08 draft격리 | 모든premise승인closure만조회 | draft기반결론을edge제거후잔존시키는구현거절 |
| CQ09 판재현 | 동일manifest두번compile→동일bytes/hash, 구판재생동일 | shape/source/engine/review/closure/proof교체거절, 전역store판혼합거절 |
| CQ10 근거부족/관련성 | 필요한승인facts가있으면정확ID선택 | summary-only/보존상한/무관한참인fact/중단은부족; JSON성공≠의미합격 |
| CQ11 승인action | 같은preview/인수승인→기존setCoursePlan효과→CAS/receipt/audit | 미승인/변조/다른학생/expiry/진행session/권한철회시write0 |
| CQ12 실행중freshness | 같은판/revision/context/권한으로commit | 모델대기/승인후/tx직전변경에409또는403, 자동재model/재승인0 |
| CQ13 중복/응답상실 | commit후상실→samekey동일result,state1/audit1 | samekey다른body409, 다른key같은approval두번apply금지 |
| CQ14 감사장애 | 모든ledger/event기록가능할때success | audit insert/CAS/commit직전kill로전부rollback; best-effort로그를receipt로사용금지 |
| CQ15 feedback | 적용계획과후일관측을출처별표시 | 인과효과/숙달/자동재승인으로확대금지 |
| CQ16 모델/데이터 | 합성packet·reportedmodel/usage/parse/의미평가분리 | 실ID/원문/키전송, 모델unknown을확정, silentfallback, 잘린출력성공금지 |
| CQ17 실제관계게시 | 모델candidate→실shape격리→사람승인→내구job→실OWL/SHACL→새판activate | 승인즉시trusted편입, 개발자수동local만, callback변조/늦은lease/부분upload거절 |
| CQ18 역할/tenant비간섭 | author/reviewer/publisher/planwriter각명시scope | progress:write만으로global게시, 다른tenant노드/간접집계/캐시존재누출거절 |

독립검증자는expected triples/violation codes/DB effects를먼저고정하고생성기가낸기대값을다시읽는것으로끝내지않는다. 같은명령/엔진에서정상fixture도통과해야한다. 시작실패/전부거절기를음성전부포착이라고세지않는다. 실제구현은계약→RED→GREEN→refactor TDD, Vitest maxWorkers3이하, build/운영검증은리드전용이다.

## 12. 파일 ownership DAG와 adapter 초안

아래는**후속작업의배타소유권제안**이며이번task는제품파일을편집하지않았다. 기존owner와합의후시작한다.

| node/owner | 파일경계안 | 입력→출력 |
| --- | --- | --- |
| A 계약 | src/contracts/ontology.contract.ts, ontologyAction.contract.ts, src/lib/ontology/ports.ts와계약tests | goal/CQ→고정DTO/ports/error/version |
| B 원천 | scripts/ontology/sources/**, src/lib/ontology/sourceRegistry.ts, data/ontology/sources/** | A/전모집단→stable IDs/RDF후보/coverage |
| C 엔진/의존성 | scripts/ontology/compiler/**, ontology/v1/{ontology,shapes,rules}/**, src/lib/ontology/{engine,query,validation,proof}/**, api/ontology-engine.py, compiler dependency lock (Services 선택 시 services/ontology-compiler/**) | A/B→실OWL/SHACL/proof/runtime/compilejob처리 |
| D action/저장 | src/lib/ontology/actions/**, serverStore.ts tx port, courseTeacherRoutes.ts 공통service, src/lib/math-srs/coursePlanService.ts, prisma/drafts/ontology-*.sql | A/현행효과→registry/preview/tx/ledger/audit |
| E 인가/API/publish | src/lib/ontology/{access,snapshot,orchestration,publish}/**, src/app/api/ontology/**, proxy/account route allowlist/coverage tests | A/C/D→scoped query/후보/검토/approve/execute/publish |
| F 화면 | 기존LearningInsightPanel주변또는선택된review panel와tests | A/E/design선택→source/proof/version/coverage·diff/승인·feedback |
| G 독립검증 | scripts/qa/ontology/**, 독립fixtures/통합tests | 고정CQ+B~F→반례/호환성/재현/누출/실DB동시성증거 |
| Lead | package/lock최종통합, next.config.ts, vercel.json/cron/deploy wiring, main/release | 전검증→단일build/fresh-fetch push/exact SHA운영 |

DAG는 `A→(B,C작은엔진fixture,D순수preview,E인가fixture)`; `B+C→compile freeze`; `D+E+compile→승인실행/관계게시통합`; `API freeze+design선택→F`; `전체→G→Lead`다. package/lock은C 또는Lead 한명만쓴다. classAccess/teacherGate같은공유파일은D/E가동시편집하지않고경계owner로변경요청을보낸다.

외부`architecture/adapter-contract-draft.ts`는실설치없이작성한미compile초안이다. GraphIdentity는ontology/asserted/closure/review/source/shape/rule/proof/engine hash를묶는다. StatementReview는진술별근거종류와검수판을보존한다. factory `loadPublished`는판별불변adapter를반환하며query/validate/explain은그판만사용한다. mutable전역현재graph는없다. ActionDefinition은preview와동일tx적용을분리하고CompileJob은승인에서새release까지내구진행을표현한다. query adapter에는raw SPARQL/URL/execute를노출하지않고private dataset은DTO로직렬화하지않는다.

## 13. 전원천 등록과 부분 관계 검수의 보고

지표는grade/namespace/curriculumEdition/source snapshot별로내고합계의중복규칙을선정한다.

| 지표 | 분모 | 분자/별도상태 |
| --- | --- | --- |
| 노드등록률 | exact manifest의고유stable ID | entity발급완료; excluded/unavailable source별도 |
| 원천연결률 | 등록entity/revision | source revision+locator+digest일치 |
| RDF/shape구조검사 | 등록assertion/revision | conformant/violation/engine-error/not-run |
| 후보관계검수율 | 실제등록candidate assertion | approved/rejected/pending; 후보집합의완전성보장은별개 |
| 관계대상커버리지 | 등록content/section/entity | 근거있는승인관계가하나이상있는대상; 0은unknown |
| 공식기준연결 | 대조대상entity와선언한해당기준집합 | edition/code/span대조완료·미검수·원전미취득 |
| proof커버리지 | 엔진의비자명conclusion | 모든허용premise/rule/version proof보유; 나머지보류 |
| action커버리지 | 승인한registry action종류 | preview→명시승인→실write→audit/readback까지완료 |
| 게시폐루프 | 관계제안/게시job | validated/승인/failed/stale/published, 실제engine receipt와active판연결 |

기존100단원/356topic등록, 교육적추정186개, 14표9,119키, 네소단원부분대응을하나의ontology완성률로합치지않는다. 모르는교육관계전체수를분모로100%를만들지않는다. 전원천inventory worker의최신manifest와이정적수치를대조하고차이는출처와함께남긴다.

## 14. 납품과 검증 한계

외부근거root는 `/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/architecture/`다. sources/에공식문서·공개metadata원자료, source-receipts.json에URL/시각/bytes/hash/실패, local-source-receipt.json에HEAD/소스hash/정적수치, adapter-contract-draft.ts에독립interface를보존했다. 과거user키원문을읽거나복사하지않았다.

현재확인한것은코드경계·표준/실engine후보·전기능계약·action원자성간격·관계게시폐루프의배포안이다. 실engine기동/표준conformance/실SHACL report/전체DB census/교과관계검수/성능/DB이행/새UI/실모델평가/통합build/deploy는하지않았다. 이준비조사를그완료로대체하지않는다.

리드가결정할다음항목은최종engine/profile/ports, 전체manifest, action tx와publish service의ownership이다. 공유DB/UI의선택은SQL/diff/성능/rollback의구체물이준비된마지막단계에묻는다. full목표를readonly/네소단원으로축소할필요는없다.
