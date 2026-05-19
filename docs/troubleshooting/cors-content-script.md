# 트러블슈팅: Content Script CORS — Failed to fetch

## 문제 상황
크롬 확장 content script에서 `fetch(Config.API_BASE + '/api/...')` 호출 시
"Failed to fetch" 에러 반복.
서버에 CORS middleware를 추가해도 해결 안 됨.

## 시도한 것들
1. `next.config.ts`에 `headers()` CORS 설정 추가 → 효과 없음
2. `src/middleware.ts` 작성 (`chrome-extension://`, `www.bitget.com` origin 허용) → 여전히 실패
3. `host_permissions`에 서버 URL 추가 확인 → 이미 있음

## 최종 해결법
Content script의 fetch는 항상 탭의 origin(`www.bitget.com`)으로 나가며,
브라우저 보안 정책상 서버 응답을 차단하는 경우가 있음.

**Background service worker 경유** 로 해결:
- Background의 fetch는 `chrome-extension://[id]` origin 사용
- CORS 정책 적용 범위 밖
- `chrome.runtime.sendMessage` → background → `fetch` → `sendResponse`

```
Content script                Background SW
   sendMessage(API_FETCH) →   onMessage handler
                         ←    sendResponse({ ok, status, data })
```

`return true` 필수 (비동기 채널 유지).

## 이력서 소재 한 줄
Chrome Extension MV3 보안 모델의 origin 격리 특성을 파악해
background service worker 프록시 패턴으로 CORS를 구조적으로 우회.
