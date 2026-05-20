# 이력서 소재 모음 (Chrome Extension)

## PAR 형식 (Problem → Action → Result)

| # | Problem | Action | Result |
|---|---------|--------|--------|
| 1 | Content script fetch가 CORS로 차단됨 (www.bitget.com origin) | Background service worker 프록시 패턴 도입 — `chrome.runtime.sendMessage` 경유 fetch | CORS 완전 우회, API 호출 일원화 |
| 2 | Bitget API 응답 필드명 불일치로 baseline 90개 포지션 전부 필터링 | 진단 스크립트로 raw 응답 필드명 추적, `openTotalPos×openAvgPrice` notional 계산으로 대체 | baseline 생성 성공, Emergency Brake 정상 작동 |
| 3 | avg 기준 발동 임계값이 현실과 동떨어짐 (큰 거래 1~2건이 평균 왜곡) | referenceSize를 median 우선으로 변경 | 발동 기준이 실제 매매 패턴과 일치 |
| 4 | async 이후 `preventDefault` 호출이 동작 안 하는 브라우저 버그 | 클릭 핸들러를 동기/비동기로 분리 (handleEntryClick → _handleAsync) | 모든 진입 버튼 인터셉트 정상화 |
| 5 | 상태 기반 차단 트리거(시간대, 손실 등)는 클릭 시점 체크로 감지 불가 | background 5분 알람 + content 폴링으로 `/api/extension/blocking-status` 주기 조회, 차단 시 fixed 빨간 띠(banner.js) 표시 | 클릭 전에도 차단 상태 시각적 인지 가능 |
| 5 | SPA 동적 렌더링으로 버튼별 이벤트 연결이 불안정 | MutationObserver 제거, `document.addEventListener('click', ..., true)` 단일 리스너로 통일 | 코드 단순화 + 타이밍 문제 해소 |
| 6 | emergency-check API 응답 3~4초 (Vercel serverless) | DB 쿼리 순차 실행 구조 분석, `computeEmergency()` 순수 함수 추출 후 3배치 병렬화 (`Promise.all`) | 순차 4~7 쿼리 → 2~3 병렬 배치, EmergencySetting 중복 쿼리 제거 |
| 7 | Vercel Cron 5개 라우트 모두 401 반환 | Vercel이 `Authorization: Bearer`를 보내지만 코드가 `x-cron-secret` 헤더를 읽고 있던 불일치 발견 | 5개 라우트 인증 일괄 수정, cron 정상 실행 |
| 8 | CORS 미들웨어 화이트리스트가 실제로는 모든 origin 허용 | 코드 리뷰 중 `return '*'` fallback 발견, 허용 목록 외 origin은 헤더 미설정으로 수정 | 보안 강화, chrome-extension + bitget.com만 허용 |
| 9 | Android CoroutineScope 3곳에서 생명주기 밖 메모리 누수 | `lifecycleScope` / `SupervisorJob + CoroutineScope` 패턴으로 전환, `onDestroy`에서 cancel | Activity/Service 종료 시 코루틴 정상 취소 |

---

## 기술 키워드

- Chrome Extension MV3, Service Worker, Content Script, Message Passing
- CORS 우회 (background proxy 패턴)
- Bitget REST API (history-position)
- Prisma ORM, Vercel Serverless Functions
- 통계 기반 이상 감지 (median vs avg, sizeMultiplier)
- Promise.all 병렬 DB 쿼리 최적화
- Android Coroutine 생명주기 관리 (lifecycleScope, SupervisorJob)
- 3개 프로젝트(Next.js/Chrome Extension/Android) 동시 개발 및 코드 리뷰

---

## 수치 성과

- Bitget 거래 내역 90건으로 UserBaseline 생성
- 발동 임계값: median 966 USDT 기준 Level1≥1,449 / Level2≥1,932 / Level3≥4,830 USDT
- API 타임아웃: 1,000ms → 8,000ms (Vercel cold start 대응)
- warm-up ping으로 첫 호출 cold start 소비
- emergency-check DB 쿼리: 순차 4~7개 → 병렬 2~3배치 (3~4s → ~500ms 목표)
- baseline cold start: 타임아웃 5s → 12s + 4분 주기 keep-warm 알람

---

## 인상적인 트러블슈팅

- **Bitget 필드명 불일치**: 90개 포지션이 있는데도 baseline이 0건이던 이유를 진단 스크립트로 추적. 외부 API 스키마를 가정하고 작성된 코드의 위험성 확인.
- **CORS background proxy**: 서버 CORS 설정을 완벽히 해도 content script 환경에서 차단되는 이유를 Chrome 보안 모델 레벨에서 이해하고 우회.
- **async/sync 분리**: 브라우저 이벤트 루프 특성상 async 함수 내 await 이후 `preventDefault`가 무효화되는 버그를 구조적으로 해결.
- **Vercel Cron 인증 불일치**: 5개 cron 라우트 전부 Vercel이 보내는 `Authorization: Bearer` 헤더 대신 `x-cron-secret` 헤더를 읽고 있어 전부 401. 공식 문서 확인으로 발견.
- **CORS 화이트리스트 역설**: 보안을 위해 작성한 origin 검증 코드의 fallback이 실제로는 모든 origin을 허용하고 있었음. 코드 리뷰 중 발견.
- **DB 순차 쿼리 병렬화**: 순차 4~7개 쿼리를 `Promise.all` 3배치로 재구성, `computeEmergency()` 순수 함수 추출로 중복 쿼리 제거.
