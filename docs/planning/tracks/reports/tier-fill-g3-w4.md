# 초3 물결 4 — 남은 대단원의 심화중·심화상

**작성 2026-09-01 · 워크트리 `tier-fill-g3-w4` · 브랜치 `BIGSHOL/tier-fill-g3-w4`**
브리프 `tracks/briefs/elem-tier-fill.md` · 토대 `17-elem-backsolve-dossier.md`(§2.2 가 초3 적대 검토)
앞선 것 — 파일럿 `tier-fill-g3.md`(2-1) · 물결 2 `-w2.md`(2-2·2-4·2-6) ·
물결 3 `-w3.md`(1-1·1-4·1-5) + 그 적대 검토 `-w3-adversarial.md`

> 이 파일은 **그때그때** 적는다(창이 닫히면 채팅은 사라진다).

---

## 0. 착수 상태 (읽은 것 · 잰 것)

### 0.1 워크트리 준비 — 관문 전에 두 겹이 막고 있었다

```
· node_modules/.bin 이 통째로 없다  → npx tsx 가 「'tsx' 은(는) …아닙니다」로 죽는다
· .husky/_ 가 없다                  → git 이 훅을 **말없이 건너뛴다**(2026-08-19 교훈)
· prisma client 미생성              → 19파일이 「내 탓 아닌」 실패를 낸다
```

`npx prisma generate` 는 바로 됐고, `npm install` 은 **두 번 ENOTEMPTY 로 실패**했다
(`node_modules/next/dist/esm` 이 지워지지 않는다). 그 디렉터리를 지운 뒤 다시 돌렸다.

