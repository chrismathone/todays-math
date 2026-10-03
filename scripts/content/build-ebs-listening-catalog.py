"""Collect public EBS listing metadata; never download/rehost exam contents.

Python standard library only. Run from the repository root. Responses are cached
in .qa-artifacts/listening-ebs; delete a selected cache file to refresh it.
"""
import html
import json
import re
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".qa-artifacts/listening-ebs"
OUT = ROOT / "docs/listening-samples"
STAMP = date.today().strftime("%Y%m%d")
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
TERMS = "https://sso.ebs.co.kr/policy/termsInfo"


def fetch(name, url, data=None):
    dest = CACHE / name
    if not dest.exists():
        req = Request(url, data=urlencode(data).encode() if data else None,
                      headers={"User-Agent": "Mozilla/5.0", "Referer": url})
        with urlopen(req, timeout=35) as response:
            body = response.read()
        dest.write_bytes(body)
    return dest.read_text(encoding="utf-8-sig")


def official_url(value, base="https://cbox.ebs.co.kr"):
    if not value or not value.strip():
        return None
    value = html.unescape(value.strip())
    if value.startswith("/"):
        value = base + value
    parsed = urlparse(value)
    host = parsed.hostname or ""
    if parsed.scheme not in ("http", "https") or not any(
        host == domain or host.endswith("." + domain)
        for domain in ("ebs.co.kr", "ebsi.co.kr")
    ):
        raise ValueError("Unexpected non-official resource URL")
    return value


def middle(grade):
    cls = str(22000009 + grade)
    page = "https://mid.ebs.co.kr/english/engGrade?clsfnSystId=" + cls
    records = []
    for start, end in ((2022, date.today().year), (2018, 2021), (2017, "")):
        obj = json.loads(fetch(f"middle{grade}-{start}-{end}.json",
            "https://mid.ebs.co.kr/assessment/english/innerGetDataList",
            {"clsfnSystId": cls, "startYear": start, "endYear": end}))
        for item in obj["list"]:
            assets = {key: official_url(item.get(field)) for key, field in (
                ("audio", "urlLstn"), ("questions", "urlQues"),
                ("answers", "urlCansw"), ("transcript", "urlScrpt"), ("bundle", "urlZip"))}
            if not any(assets.values()):
                continue
            year, rnd = int(item["year"]), int(re.search(r"\d+", item["round"])[0])
            records.append({"id": f"ebs-middle-{grade}-{year}-{rnd}",
                "school": "middle", "grade": grade, "year": year, "round": rnd,
                "provider": "EBS 중학", "sourceUrl": page, "assets": assets,
                "reuseStatus": "permission-required", "hosted": False})
    print(f"middle {grade}: {len(records)} listed rounds", flush=True)
    return records


def high(grade):
    # targetCd controls the returned grade, even if the filename says otherwise.
    target = {1: "PM02", 2: "PM03", 3: "PM01"}[grade]
    records = []
    for tab in (0, 1):
        page = f"https://www.ebsi.co.kr/ebs/pot/potg/EnglishListening0{grade}.ebs?targetCd={target}&seriesGrpNo={tab}"
        body = fetch(f"high-{grade}-tab-{tab}.html", page)
        if tab == 0:
            blocks = re.split(r'(20\d{2})년도 전국 영어듣기 능력평가', body)[1:]
            year_blocks = list(zip(blocks[0::2], blocks[1::2]))
        else:
            year_blocks = [(str(date.today().year), body)]
        for year, block in year_blocks:
            if tab == 0:
                rounds = re.findall(r'<dt>\s*([12])회\s*</dt>\s*<dd>(.*?)</dd>', block, re.S)
            else:
                # The current-year page has a different layout, but resource paths
                # explicitly identify year, round and grade.
                rounds = [(str(rnd), block) for rnd in (1, 2)]
            for rnd, section in rounds:
                assets = dict.fromkeys(("audio", "questions", "answers", "transcript", "bundle"))
                for anchor in re.findall(r'<a\b[^>]*>.*?</a>', section, re.I | re.S):
                    urls = re.findall(r'https?://[^\s\x22\x27<>]+?\.(?:mp3|pdf|zip|hwp)(?:\?[^\s\x22\x27<>]*)?', anchor, re.I)
                    label = html.unescape(re.sub(r'<[^>]+>', '', anchor))
                    for url in urls:
                        if tab == 1 and f"{year}_eng_0{rnd}_go{grade}" not in url:
                            continue
                        match = re.search(r'_go([123])', url)
                        if match and int(match[1]) != grade:
                            raise ValueError(f"EBSi returned wrong grade for {page}")
                        ext = urlparse(url).path.lower().rsplit('.', 1)[-1]
                        key = ("audio" if ext == "mp3" else "bundle" if ext == "zip"
                               else "transcript" if "대본" in label else "answers" if "정답" in label
                               else "questions" if "문제" in label else None)
                        if key:
                            assets[key] = official_url(url)
                if any(assets.values()):
                    records.append({"id": f"ebsi-high-{grade}-{year}-{rnd}",
                        "school": "high", "grade": grade, "year": int(year), "round": int(rnd),
                        "provider": "EBSi", "sourceUrl": page, "assets": assets,
                        "reuseStatus": "permission-required", "hosted": False})
    print(f"high {grade}: {len(records)} listed rounds", flush=True)
    return records


def main():
    jobs = [(fn, grade) for fn in (middle, high) for grade in (1, 2, 3)]
    with ThreadPoolExecutor(max_workers=3) as pool:
        groups = list(pool.map(lambda pair: pair[0](pair[1]), jobs))
    records = [item for group in groups for item in group]
    if len({r["id"] for r in records}) != len(records):
        raise ValueError("Duplicate year/grade/round")
    records.sort(key=lambda r: (-r["year"], r["school"] != "middle", r["grade"], r["round"]))
    summary = {"rounds": len(records), "bySchool": dict(Counter(r["school"] for r in records)),
               "assets": {key: sum(bool(r["assets"][key]) for r in records) for key in records[0]["assets"]}}
    catalog = {"schemaVersion": 1, "checkedAt": date.today().isoformat(), "summary": summary,
        "scope": "EBS 중학 및 EBSi 전국 영어듣기능력평가 공식 목록에 공개된 회차. EBS 전체 교재·모의고사 목록은 아님.",
        "rights": {"status": "permission-required", "termsUrl": TERMS,
            "termsEffectiveDate": "2026-04-22", "articles": ["12(2)", "21(2)"],
            "decision": "원본 재업로드·가공·서비스 내 스트리밍 허용 미확인. 공식 페이지/파일 링크만 수록."},
        "verification": "공식 목록에서 URL을 추출함. 모든 파일의 접근·재생·내용 일치 검수를 완료한 것은 아님.",
        "records": records}
    (OUT / f"ebs-catalog-{STAMP}.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding="utf-8")
    rows = []
    labels = {"audio": "듣기 MP3", "questions": "문제지", "answers": "정답", "transcript": "대본", "bundle": "묶음 ZIP"}
    for r in records:
        school = "중" if r["school"] == "middle" else "고"
        links = ' '.join(f'<a href="{html.escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">{labels[key]}</a>' for key, url in r["assets"].items() if url)
        rows.append(f'<tr data-grade="{school}{r["grade"]}" data-year="{r["year"]}"><td>{school}{r["grade"]}</td><td>{r["year"]}년 {r["round"]}회</td><td class="links">{links}</td><td><a href="{html.escape(r["sourceUrl"], quote=True)}" target="_blank" rel="noopener noreferrer">{r["provider"]} 원문</a></td></tr>')
    years = ''.join(f'<option>{year}</option>' for year in sorted({r['year'] for r in records}, reverse=True))
    page = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EBS 영어듣기 공식 자료 목록</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f4f6fa;color:#182d49;font:15px/1.7 system-ui,sans-serif}main{max-width:1080px;margin:auto;padding:32px 18px}h1{font-size:25px;margin:0 0 8px}p{margin:8px 0 16px;color:#51627c}a{color:#254eb8;text-underline-offset:3px}a:hover{color:#102e77}section{background:white;border:1px solid #d5deed;border-radius:10px;padding:18px;margin:18px 0}.filters{display:flex;flex-wrap:wrap;gap:20px;align-items:center}select{font:inherit;padding:7px 12px;border:1px solid #becbe1;border-radius:6px;background:white}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:12px 9px;border-bottom:1px solid #e3e8f1;vertical-align:top}th{background:#edf2fa}.links a{display:inline-block;margin-right:14px}.table-wrap{overflow-x:auto}footer{font-size:13px;color:#596a81}[hidden]{display:none!important}@media(max-width:560px){main{padding:22px 12px}section{padding:12px}th,td{padding:10px 5px}h1{font-size:22px}.links a{margin:0 9px 5px 0}td:first-child{white-space:nowrap}}</style>
<main><h1>EBS 영어듣기 공식 자료 목록</h1><p>__COUNT__회 · 중1~3 / 고1~3 · __DATE__ 확인</p>
<section><strong>필요한 회차를 골라 EBS에서 열어보세요.</strong><p>공식 공개 목록에서 모은 음원·문제지·정답·대본 링크입니다. 오래된 회차에는 음원만 있을 수 있습니다. EBS 전체 교재·모의고사를 포함한 목록은 아닙니다.</p><p>원본 파일은 오늘의 영어에 재업로드하지 않았습니다. <a href="https://sso.ebs.co.kr/policy/termsInfo" target="_blank" rel="noopener noreferrer">EBS 현행 약관</a>의 이용 범위와 별도 허락을 확인한 뒤 서비스에 넣을 수 있습니다.</p></section>
<section class="filters"><label>학년 <select id="grade"><option value="">전체 학년</option><option>중1</option><option>중2</option><option>중3</option><option>고1</option><option>고2</option><option>고3</option></select></label><label>연도 <select id="year"><option value="">전체 연도</option>__YEARS__</select></label><span id="count" aria-live="polite">__COUNT__회 표시</span></section>
<div class="table-wrap"><table><thead><tr><th>학년</th><th>회차</th><th>공식 자료</th><th>출처</th></tr></thead><tbody>__ROWS__</tbody></table></div>
<footer><p>각 파일 링크는 공식 목록에 표시된 주소입니다. 링크 변경이나 접속 제한이 있으면 오른쪽 원문에서 확인하세요. 원본 내용·음질 검수와 재배포 허락은 별도입니다.</p></footer></main>
<script>const grade=document.querySelector('#grade'),year=document.querySelector('#year'),rows=[...document.querySelectorAll('tbody tr')];function filter(){let n=0;for(const row of rows){row.hidden=!!((grade.value&&grade.value!==row.dataset.grade)||(year.value&&year.value!==row.dataset.year));if(!row.hidden)n++;}document.querySelector('#count').textContent=n+'회 표시';}grade.addEventListener('change',filter);year.addEventListener('change',filter);</script></html>'''
    page = page.replace('__COUNT__', str(len(records))).replace('__DATE__', date.today().isoformat()).replace('__YEARS__', years).replace('__ROWS__', '\n'.join(rows))
    (OUT / f"ebs-catalog-{STAMP}.html").write_text(page, encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
