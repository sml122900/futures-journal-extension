# 기술 결정: emergency-check API DB 쿼리 병렬화

## Problem
`POST /api/emergency-check` 응답이 3~4초 걸림.
분석 결과 DB 쿼리 4~7개가 순차 실행되고 있었음:

```
auth → body parse → setting → baseline → setting(중복) → restDeclaration → pastSessions → session.create
```

- `EmergencySetting`이 `route.ts`와 `detectEmergency()` 내부에서 중복 조회
- `restDeclaration`이 baseline 이후 별도 쿼리

## Action

`computeEmergency()` 순수 함수 추출:
- DB 쿼리 없음 — 미리 fetch된 데이터로 순수 계산
- `route.ts`에서 3배치로 병렬화:

```
Batch 1: [authenticateExtension + req.json()]         ← 헤더/body 독립
Batch 2: [setting + baseline + restDeclaration]        ← userId만 필요
계산:    computeEmergency(prefetched data)             ← 동기, DB 없음
Batch 3: [pastSessions + session.create]               ← level > 0일 때만
```

## Result
- 순차 4~7 라운드트립 → 2~3 병렬 배치로 단축
- EmergencySetting 중복 쿼리 완전 제거
- `detectEmergency`는 async 래퍼로 유지 (외부 단독 호출 시 사용)

## 포기한 대안
- 세션 생성 비동기 분리: sessionId를 응답에 포함해야 하므로 불가
- Redis 캐시: 오버엔지니어링, DB 쿼리 자체 최적화로 충분
