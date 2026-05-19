# 이력서 소재 모음 (Chrome Extension)

## PAR 형식 (Problem → Action → Result)

| # | Problem | Action | Result |
|---|---------|--------|--------|
| 1 | Content script fetch가 CORS로 차단됨 (www.bitget.com origin) | Background service worker 프록시 패턴 도입 — `chrome.runtime.sendMessage` 경유 fetch | CORS 완전 우회, API 호출 일원화 |
| 2 | Bitget API 응답 필드명 불일치로 baseline 90개 포지션 전부 필터링 | 진단 스크립트로 raw 응답 필드명 추적, `openTotalPos×openAvgPrice` notional 계산으로 대체 | baseline 생성 성공, Emergency Brake 정상 작동 |
| 3 | avg 기준 발동 임계값이 현실과 동떨어짐 (큰 거래 1~2건이 평균 왜곡) | referenceSize를 median 우선으로 변경 | 발동 기준이 실제 매매 패턴과 일치 |
| 4 | async 이후 `preventDefault` 호출이 동작 안 하는 브라우저 버그 | 클릭 핸들러를 동기/비동기로 분리 (handleEntryClick → _handleAsync) | 모든 진입 버튼 인터셉트 정상화 |
| 5 | SPA 동적 렌더링으로 버튼별 이벤트 연결이 불안정 | MutationObserver 제거, `document.addEventListener('click', ..., true)` 단일 리스너로 통일 | 코드 단순화 + 타이밍 문제 해소 |

---

## 기술 키워드

- Chrome Extension MV3, Service Worker, Content Script, Message Passing
- CORS 우회 (background proxy 패턴)
- Bitget REST API (history-position)
- Prisma ORM, Vercel Serverless Functions
- 통계 기반 이상 감지 (median vs avg, sizeMultiplier)

---

## 수치 성과

- Bitget 거래 내역 90건으로 UserBaseline 생성
- 발동 임계값: median 966 USDT 기준 Level1≥1,449 / Level2≥1,932 / Level3≥4,830 USDT
- API 타임아웃: 1,000ms → 8,000ms (Vercel cold start 대응)
- warm-up ping으로 첫 호출 cold start 소비

---

## 인상적인 트러블슈팅

- **Bitget 필드명 불일치**: 90개 포지션이 있는데도 baseline이 0건이던 이유를 진단 스크립트로 추적. 외부 API 스키마를 가정하고 작성된 코드의 위험성 확인.
- **CORS background proxy**: 서버 CORS 설정을 완벽히 해도 content script 환경에서 차단되는 이유를 Chrome 보안 모델 레벨에서 이해하고 우회.
- **async/sync 분리**: 브라우저 이벤트 루프 특성상 async 함수 내 await 이후 `preventDefault`가 무효화되는 버그를 구조적으로 해결.
