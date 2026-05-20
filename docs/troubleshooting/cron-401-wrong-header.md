# 트러블슈팅: Cron 라우트 401 — 인증 헤더 불일치

## 문제 상황
`/api/cron/emergency-queue` (및 다른 4개 cron 라우트)가 Vercel에서 자동 실행 시 항상 401 반환.
수동 테스트(`curl -H "x-cron-secret: ..."`)는 성공함.

## 시도한 것들
1. CRON_SECRET 환경변수 존재 여부 확인 → 설정되어 있음
2. Vercel Functions Logs 확인 → 401이 인증 블록에서 발생

## 최종 해결법

**원인**: Vercel Cron은 `Authorization: Bearer <CRON_SECRET>` 형식으로 호출하지만
코드는 `x-cron-secret` 헤더를 읽고 있었음:

```ts
// 기존 (잘못됨)
const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) { ... }

// 수정 (올바름)
const auth = req.headers.get("authorization");
if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) { ... }
```

5개 라우트 전부 동일한 패턴이었으므로 일괄 수정.

## 이력서 소재 한 줄
Vercel Cron Job의 자동 인증 방식(Authorization Bearer)과 수동 헤더 방식 차이를 파악해 5개 cron 라우트 인증 일괄 수정.
