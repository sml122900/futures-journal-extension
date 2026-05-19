# 기술 결정: 버튼 인터셉트 — document 전역 캡처 리스너

## Problem
비트겟은 React SPA. 버튼이 동적으로 렌더링되므로
`MutationObserver`로 DOM 변화를 감지 후 버튼마다 `addEventListener`를 붙이는 방식은
타이밍 문제가 발생하거나 이미 렌더된 버튼을 놓칠 수 있음.

또한 비트겟 `/asia/futures/` 경로처럼 URL 패턴이 다양해 페이지 진입 시점에 버튼이 없을 수 있음.

## Action
`document.addEventListener('click', handleEntryClick, true)` — 단 하나의 캡처 리스너.
클릭 이벤트가 document에서 먼저 잡히므로:
- `event.target.closest('button[role="buyer"], button[role="seller"]')` 로 판단
- MutationObserver, `fjAttached` 플래그 전부 제거
- 동기로 즉시 `preventDefault` + `stopImmediatePropagation` 후 비동기 처리 분리

```
handleEntryClick(event)  — 동기, 즉시 intercept
  └─ _handleAsync(button, orderInfo)  — async, baseline 체크 + 서버 호출
```

## Result
코드 단순화. 버튼 개수/타이밍 무관하게 모든 클릭 감지.
async 이후 `preventDefault`가 동작 안 하는 브라우저 버그도 함께 수정.

## 포기한 대안
- MutationObserver + 버튼별 addEventListener: 타이밍 경쟁 조건 존재
