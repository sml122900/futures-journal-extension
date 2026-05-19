# 기술 결정: CORS 우회 — Background Service Worker 프록시

## Problem
Content script에서 `fetch()`로 메인 서버를 호출하면 브라우저가 CORS 오류로 차단.
Content script의 fetch는 현재 탭 origin(`www.bitget.com`)으로 나가기 때문에
서버에서 `Access-Control-Allow-Origin: https://www.bitget.com`을 설정해도
Vercel 특성상 불안정하게 적용됨.

## Action
모든 API fetch를 background service worker 경유로 변경.
- Content script → `chrome.runtime.sendMessage({ type: 'API_FETCH', url, headers, body })`
- Background → `fetch(url)` (origin이 `chrome-extension://[id]`)
- Background → `sendResponse({ ok, status, data })`

`return true`로 비동기 채널 유지 필수.

## Result
CORS 완전 우회. Content script는 fetch 코드를 직접 갖지 않음.
API 호출이 하나의 채널(background)로 집중되어 토큰 관리, 타임아웃, 에러 처리가 일원화됨.

## 포기한 대안
- 서버 CORS 헤더 추가: `middleware.ts` 작성했지만 content script 환경에서 불안정
- fetch를 직접 호출: 원점 문제 반복
