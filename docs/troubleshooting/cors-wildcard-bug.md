# 트러블슈팅: CORS 미들웨어 — 모든 origin에 와일드카드 반환

## 문제 상황
`src/middleware.ts`의 `resolveCorsOrigin()` 함수가
허용 목록에 없는 origin에도 `'*'`를 반환하고 있었음.
코드 의도와 실제 동작이 반대였음 ("그 외 알려진 안전한 origin" 주석이 달려 있었으나 차단이 아닌 허용).

## 최종 해결법

```ts
// 기존 (잘못됨)
function resolveCorsOrigin(origin: string | null): string {
  if (!origin) return '*';
  if (origin.startsWith('chrome-extension://')) return origin;
  if (origin === 'https://www.bitget.com') return origin;
  return '*';  // ← 미허용 origin도 전부 허용!
}

// 수정 (올바름)
function resolveCorsOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (origin.startsWith('chrome-extension://')) return origin;
  if (origin === 'https://www.bitget.com') return origin;
  return null; // 허용 목록 외 차단
}
```

`Access-Control-Allow-Origin` 헤더를 `null`일 때 아예 설정하지 않도록 `CORS_HEADERS` 함수도 수정.

## 이력서 소재 한 줄
화이트리스트 방식 CORS 검토 중 fallback이 차단이 아닌 와일드카드 허용으로 동작하던 버그 발견 및 수정.
