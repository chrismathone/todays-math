# 중등·고등 영어듣기 공식 공개자료 조사

조사일: 2026-10-03, Asia/Seoul. 우선순위는 EBS 중학, EBSi 고교 전국영어듣기능력평가, EBSi 수능·모의평가·학력평가다. 기계 판독용 결과는 [동일 날짜 JSON](public-sources-20261003.json)에 기록했다.

**확인한 출처 중 ‘오늘의 영어’로 음원·문서 원본을 재업로드하도록 명시 허용한 출처는 0개다. 모두 `공식링크제공`으로 분류한다.** 공개 다운로드 버튼과 주소는 확인했지만 대량 재호스팅 허락은 확인하지 못했다. 대안은 학년·시행연도·회차별 공식 페이지 링크 카탈로그이며, 실제 카탈로그는 리드가 생성하므로 여기서는 중복 생성하지 않는다.

## 확인 수준과 수행 범위

- 웹검색으로 공식 출처를 찾고, 공개 HTML·공식 정책·페이지가 사용하는 읽기 전용 목록 응답을 확인했다. 외부 HTML/JavaScript는 구조 분석용 데이터로만 읽었으며 실행하지 않았다.
- MP3·PDF·HWP·ZIP·PNG 파일은 다운로드하지 않았다. 파일 endpoint의 HEAD 요청, 재생, ZIP 해제, 브라우저 로그인, 학생계정 변경, 유료 API, DB 변경, 업로드·배포도 하지 않았다. 별도 에이전트·worktree를 만들지 않았다.
- JSON의 `resources=true`는 해당 자료의 제공 표시나 주소를 확인했다는 뜻이다. `false`는 이번 조사에서 미확인이며 부재 확정이 아니다. 전 연도 완전성, 다운로드 성공, 재업로드 권한과는 별개다.
- 샘플 주소는 공식 링크 또는 공개 페이지의 주소 조립 규칙에서 얻었다. HTTP 성공 여부·실제 파일 내용·무결성은 미검증이다. 로그인 검사가 있는 UI의 주소를 인증 우회용으로 사용하지 않는다.

## EBS 현행 약관과 재업로드 판단

근거는 [EBS 현행 이용약관](https://sso.ebs.co.kr/policy/termsInfo)이다. 공식 원문 HTML에서 **2026-04-22 적용**, 종전 2024-08-20 약관 대체를 직접 확인했다. 20121217 옛 약관을 근거로 삼지 않았다.

| 조항 | 확인 내용과 적용 한계 |
| --- | --- |
| 제12조 제2항 | 사전 동의 없는 영리행위, 위법한 자료 배포·게재를 제한한다. 이것만으로 모든 비영리 사용을 허용한다고 해석하지 않는다. |
| 제12조 제4항 제1호 | 사전 승낙 없는 복제·변경·출판 및 타인 제공을 제한한다. |
| 제21조 제2항 | 정보의 임의 가공·판매와 게재 자료의 상업적 사용·제3자 이용을 제한한다. |

이 약관과 각 자료의 공개 제공 화면을 함께 보아 EBS 출처는 `restricted`로 분류했다. EBS 또는 출제기관의 별도 이용허락은 확인하지 못했다. 공식 사이트 안에서의 무료 열람·개별 다운로드 안내를 외부 서비스 재업로드 허락으로 확대하지 않는다.

## 출처별 요약

| 공식 출처 | 대상 | 확인한 연도 범위 | 음원 / 문제 / 대본 / 정답 | 재이용 판단 |
| --- | --- | --- | --- | --- |
| [EBS 중학](https://mid.ebs.co.kr/english) | 중1·2·3 | 2006–2026 시행연도 목록 | 2018–2026 네 종류; 2006–2017 음원만 | restricted → 공식링크제공 |
| [EBSi 전국영어듣기능력평가](https://www.ebsi.co.kr/ebs/pot/potg/EnglishListening03.ebs?targetCd=PM01&seriesGrpNo=1) | 고1·2·3 | 고3 2016–2026; 고1·2는 2026 확인 | 고3 표본 네 종류 | restricted → 공식링크제공 |
| [EBSi 기출문제](https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs) | 고1·2·3/N수 | 필터 2006–2026; 실제 목록은 2026 고1·3 표본 | 네 종류; UI 로그인 검사 | restricted → 공식링크제공 |
| [제주교육청 영어듣기](https://www.jje.go.kr/board/list.jje?boardId=BBS_0000588&menuCd=DOM_000000104001011003&paging=ok&startPage=1) | 중1·2·3, 고1·2·3 | 2014–2026 게시 범위; 중간 전수검증 없음 | 2026 표본 네 종류; 오래된 게시글은 다름 | unclear → 공식링크제공 |
| [평가원 수능](https://www.suneung.re.kr/boardCnts/list.do?boardID=1500234&m=0403&s=suneung) | 고3/N수 | 2005–2026학년도 표본/목록; 필터는 2027까지 | 2026 표본 네 종류, 음원 ZIP | restricted → 공식링크제공 |
| [평가원 모의평가](https://www.suneung.re.kr/boardCnts/list.do?boardID=1500236&m=0403&s=suneung) | 고3/N수 | 2003–2027학년도 필터와 양 끝 표본 | 네 종류; ZIP 또는 MP3 | restricted → 공식링크제공 |
| [서울교육청 학력평가자료실](https://www.sen.go.kr/user/bbs/BD_selectBbsList.do?q_bbsSn=1036) | 고1·2·3 | 미확인 | 직접 첨부 확인 실패; EBSi 안내 확인 | restricted, 검색 색인 근거 → 공식링크제공 |

‘전국영어듣기능력평가’와 ‘전국연합학력평가 영어 영역’, ‘평가원 수능·모의평가’는 서로 다른 시험이다. 수능의 학년도와 EBSi의 시행연도도 구분해야 한다.

## EBS 중학

공식 진입점은 [영어듣기능력평가](https://mid.ebs.co.kr/english), 리드가 확인한 중3 경로는 [중3 페이지](https://mid.ebs.co.kr/english/grade?clsfnSystId=22000012)다. 공개 목록에서 학년마다 42행을 확인했다. 2006–2017은 음원 주소만 있고, 2018–2026은 문제·대본·정답 주소도 있다. 파일 자체의 검증 결과는 아니다.

재현 방법:

1. 공식 페이지에서 학년과 하단 목록 구간을 선택한다. 학년 값 `clsfnSystId`는 중1 `22000010`, 중2 `22000011`, 중3 `22000012`다.
2. 공개 페이지가 사용하는 [목록 endpoint](https://mid.ebs.co.kr/assessment/english/innerGetDataList)에 폼 POST로 `clsfnSystId`, `startYear`, `endYear`를 전달한다. 실제 확인한 세 구간은 `2022/2026`, `2018/2021`, `2017/빈 문자열`이다. 마지막 구간 응답은 2006–2017이다.
3. `list`의 `year`, `round`, `urlLstn`, `urlQues`, `urlScrpt`, `urlCansw`, `urlZip`을 읽는다. 문서 상대경로 앞에는 공개 페이지의 다운로드 처리와 동일하게 `https://cbox.ebs.co.kr`를 붙인다. 음원 절대주소는 그대로 둔다.

2026 제2회 중1 표본: [MP3 주소](https://midwstr.ebs.co.kr/ebsvod/lang/2026/40053535/mp3/20260901_110000_80cef02e_mp3.mp3), [문제 PDF 주소](https://cbox.ebs.co.kr/portal/assessment/2026/9/1/asmtFile_43983937813586958.pdf). 대본·정답 주소는 JSON에 있다. 문서 다운로드 버튼과 음원 재생 주소를 확인했으며, MP3 별도 저장 허락이나 파일 응답은 검증하지 않았다.

수집 시 연도 필드가 숫자/문자열로 혼재함에 유의한다. 음원 호스트도 연도별로 다르다. 목록의 조회수 갱신 함수를 실행하거나 파일명·호스트를 추측하지 않는다.

## EBSi 고교 전국영어듣기능력평가

최신 공식 페이지는 [고1](https://www.ebsi.co.kr/ebs/pot/potg/EnglishListening01.ebs?targetCd=PM02&seriesGrpNo=1), [고2](https://www.ebsi.co.kr/ebs/pot/potg/EnglishListening02.ebs?targetCd=PM03&seriesGrpNo=1), [고3](https://www.ebsi.co.kr/ebs/pot/potg/EnglishListening03.ebs?targetCd=PM01&seriesGrpNo=1)이다. 고3의 [과거 기출 탭](https://www.ebsi.co.kr/ebs/pot/potg/EnglishListening03.ebs?seriesGrpNo=0&targetCd=PM01)에서 2016–2025 파일 주소를 확인했다. 고1·고2는 이번에 2026 학년 표시와 문제 링크만 확인했으므로 과거 범위를 동일하다고 확정하지 않는다.

`seriesGrpNo=1`은 최신 회차, `0`은 과거 연도별 섹션이다. 음원은 `popUp('…mp3')`, 문서는 일반 `href`에 있다. 고3 최신 표본의 해당 처리에는 로그인 검사가 보이지 않았다. **경로의 01/02만 바꾸고 `targetCd=PM01`을 유지하면 고3 자료가 반환됐다.** 학년 값은 고1 `PM02`, 고2 `PM03`, 고3 `PM01`이며, 실제 학년 표시와 파일의 `go1/go2/go3`를 함께 확인해야 한다.

2026 제2회 고3 표본: [MP3 주소](https://wdown.ebsi.co.kr/engexam/2026/2026_eng_02_go3/2026_eng_02_go3_mp3_9KU1UC3W.mp3), [문제 PDF 주소](https://wdown.ebsi.co.kr/engexam/2026/2026_eng_02_go3/2026_eng_02_go3_question_Z61ZW467.pdf). 대본·정답은 JSON에 있다. 공식 페이지는 문제 다운로드와 반복 듣기를 안내하지만 제3자 재호스팅 허락은 확인되지 않았다.

## EBSi 수능·모의평가·전국연합학력평가

[공식 기출문제 목록](https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs)의 학년 값 `targetCd`는 고1 `D100`, 고2 `D200`, 고3 `D300`이다. 필터는 시행연도 2006–2026을 표시한다. 직접 확인한 결과는 2026 고1 3·6·9월 3행, 고3 3·5·6·7·9월 5행이다. 연도 필터의 존재만으로 전 기간 파일 완전성을 주장하지 않는다.

[공식 이용안내](https://www.ebsi.co.kr/ebs/pot/poth/RetrieveHelpBgnGud.ebs)는 시험 후 문답지·MP3 다운로드를 설명한다. 다만 기출문제 페이지의 `goDownLoadP/R/D/J/H`는 `loginCheck()` 뒤에서 실행된다. 비로그인으로 목록은 확인했지만 다운로드·로그인·인증 우회는 하지 않았다.

공개 HTML에 확인되는 [목록 endpoint](https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperListAjax.ajax)에 다음 폼 POST로 고1 3개 행을 재현했다.

```text
targetCd=D100
yearList=2026
monthList=03,06,09
arOrd=3
subjIdList=17014
sort=recent
currentPage=1
```

과목 코드는 학년별 공개 폼의 `sFormPartEng` 값에서 읽는다. 관측값은 고1 `17014`, 고3 `80003`이다. 고3 코드를 고1에 적용한 요청은 0건이었으므로 이를 ‘자료 없음’으로 오판하면 안 된다. 월은 폼과 같은 두 자리 값을 사용한다. 한 자리 월만의 영향은 따로 검증하지 않았다. 페이지 처리는 `pagingForm`의 `currentPage`와 `goPage(page)` 구조를 확인했으며 다음 페이지 호출 자체는 시험하지 않았다.

2026 9월 고1 인천 학평 표본: [MP3 주소](https://wdown.ebsi.co.kr/W61001/01exam/20260902/go1/eng_1_mp3_CT9947G3.mp3), [문제 PDF 주소](https://wdown.ebsi.co.kr/W61001/01exam/20260902/go1/eng_1_mun_CCFO6C49.pdf). 대본 PDF·정답 PNG 주소는 JSON에 있다. 이 주소는 버튼 인수와 공식 URL 조립 규칙에서 얻었으며 로그인 없는 파일 접근이 허용된다는 증거가 아니다.

## 교육청과 평가원 보완 출처

### 제주특별자치도교육청

[공식 목록](https://www.jje.go.kr/board/list.jje?boardId=BBS_0000588&menuCd=DOM_000000104001011003&paging=ok&startPage=1)은 161건, 10건씩 17페이지였다. `startPage`가 페이지 번호이며 상세는 `dataSid`, 첨부는 `fileSid`로 구분한다. 목록 첨부 아이콘만 읽으면 파일 일부를 누락하므로 상세의 전체 다운로드 링크를 읽어야 한다.

[2026 제2회 중1](https://www.jje.go.kr/board/view.jje?boardId=BBS_0000588&menuCd=DOM_000000104001011003&dataSid=1480141)과 [고1](https://www.jje.go.kr/board/view.jje?boardId=BBS_0000588&menuCd=DOM_000000104001011003&dataSid=1480145)은 MP3·문제·대본·정답 PDF를 첨부한다. [가장 오래된 2014 제1회 중3](https://www.jje.go.kr/board/view.jje?boardId=BBS_0000588&menuCd=DOM_000000104001011003&dataSid=950651)은 HWP 3종만 확인했다. 전 기간 모든 학년·회차의 존재를 확인한 것은 아니다.

[저작권정책](https://www.jje.go.kr/index.jje?menuCd=DOM_000000108004001000)은 공공누리 표시와 유형별 조건 확인, 제3자 권리 자료의 별도 허락을 요구한다. 위 표본 게시글에서 공공누리 표시나 평가 첨부의 별도 재배포 허락을 찾지 못했다. 일반 정책의 공공누리 설명을 개별 첨부에 자동 적용하지 않고 `unclear`로 둔다.

### 한국교육과정평가원

[수능 목록](https://www.suneung.re.kr/boardCnts/list.do?boardID=1500234&m=0403&s=suneung)과 [모의평가 목록](https://www.suneung.re.kr/boardCnts/list.do?boardID=1500236&m=0403&s=suneung)의 공개 HTML 상단에 평가원 허락 없는 복제·배포·출판·전자출판 금지가 있다. 웹 도구가 추출한 텍스트에서 이 고지가 누락되어 원문 HTML로 확인했다. 음원에 대한 별도 허락도 확인하지 못했다.

목록은 10행 단위 `page`로 이동한다. 수능은 `boardID=1500234`, `C01=학년도`, `C02=영역`이며, 모의평가는 `boardID=1500236`, `C01=학년도`, `C02=월`, `C03=영역`이다. `영어`와 구 `외국어`를 모두 고려한다. 상세 `goView` 인수의 `boardSeq`, 첨부 `fn_fileDown` 인수의 `fileSeq`로 링크를 식별한다. 다운로드 규칙은 `/boardCnts/fileDown.do?fileSeq={관측값}`이다.

- 수능: 2026학년도 영어 `boardSeq=5093799`에 PDF 3종·듣기 ZIP을 확인했다. [2005 외국어 필터](https://www.suneung.re.kr/boardCnts/list.do?boardID=1500234&m=0403&s=suneung&C01=2005&C02=%EC%99%B8%EA%B5%AD%EC%96%B4)는 문제·정답 PDF와 듣기 ZIP만 보인다. 2027 필터가 존재해도 2027학년도 수능 게시를 확인한 것은 아니다.
- 모의평가: 2027학년도 9월 영어 `boardSeq=5096541`에 PDF 3종·듣기 ZIP을 확인했다. [2003 예비 외국어 필터](https://www.suneung.re.kr/boardCnts/list.do?boardID=1500236&m=0403&s=suneung&C01=2003&C03=%EC%99%B8%EA%B5%AD%EC%96%B4)는 PDF 3종과 직접 MP3 첨부가 있다.
- [2004학년도 이전 수능 목록](https://www.suneung.re.kr/boardCnts/list.do?boardID=1500235&m=0403&s=suneung)은 1994–2004 필터를 제공한다. 1994 2차 외국어는 문제·답안 PDF만 확인했으며 음원·대본 제공 여부는 미확인이다.

현대 수능 표본의 직접 주소와 파일 종류는 JSON에 있다. 상세 URL 일부는 웹 도구에서 열리지 않았지만 공개 목록 행·첨부 인수는 직접 확인했다. ZIP 내부 형식을 MP3로 확정하지 않았다.

### 서울특별시교육청

[학력평가자료실](https://www.sen.go.kr/user/bbs/BD_selectBbsList.do?q_bbsSn=1036)의 공식 검색 색인에서 EBSi 기출문제 안내와 무단 복제·배포 제한을 확인했다. 색인에는 1564건/157페이지와 학교·연도·학년·월·구분·파일 열이 표시된다. 직접 요청은 HTTP 400으로 실패했으므로 실제 연도 범위, 개별 첨부, 페이지 인수는 미확인이다. 이 수치를 현재 실시간 건수로 취급하지 않는다.

## 리드에게 전달할 적용 범위

1. 우선 EBS 공식 페이지를 학년·연도·회차로 정리한 링크 카탈로그를 사용한다. 이 문서의 샘플 파일 주소는 조사 근거이며 원본 업로드 승인 목록이 아니다.
2. 시험 식별에는 학교급·학년·시험종류·시행연도·학년도·월/회차·출제기관을 분리한다. EBS와 교육청에 중복 게시된 동일 시험을 합칠 때 출처별 근거는 보존한다.
3. `restricted` 또는 `unclear` 자료는 명시적인 별도 허락 없이 원본 재호스팅 대상으로 전환하지 않는다. 파일 다운로드 수행 여부는 리드가 판단한다.
4. 과거 자료 누락, 정정 파일, 실제 파일 응답, 개별 파일의 권리 조건은 이 조사로 검증되지 않았다. 내부 목록 endpoint는 구조 관측 결과이며 안정성이 보장된 공식 API 명세는 아니다.

변경 범위는 본 문서와 JSON 두 파일뿐이다. 공유 데이터·서비스·DB에는 변경을 적용하지 않았으며 병합은 리드가 수행한다.
