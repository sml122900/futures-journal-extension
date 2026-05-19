# 트러블슈팅: Bitget API 필드명 불일치 → baseline 생성 불가

## 문제 상황
`recalculateBaseline` 실행 시 "유효 포지션 0개 → baseline 생성 불가" 반환.
Bitget API가 90개의 포지션을 정상 반환하는데도 전부 필터링됨.

## 시도한 것들
1. `recalculateBaseline` 직접 호출 스크립트 작성 → null 반환 확인
2. `debug-baseline.ts` 스크립트로 raw API 응답 필드명 출력
3. `baseline-calculator.ts` 코드와 실제 필드명 대조

## 최종 해결법

| 코드가 기대한 필드 | 실제 Bitget API 필드 | 해결 |
|---|---|---|
| `marginSize` / `initialMargin` | 없음 | `openTotalPos × openAvgPrice` 로 계산 |
| `openTime` / `cTime` (대문자) | `ctime` (소문자) | `p.ctime` 추가 |
| `closeTime` / `cTime` | `utime` (소문자) | `p.utime` 추가 |

```ts
// 수정 전
const size = parseFloat(String(p.marginSize ?? p.initialMargin ?? 0));
const closeTimeMs = parseInt(String(p.closeTime ?? p.cTime ?? 0));

// 수정 후
const bitgetNotional = p.openTotalPos && p.openAvgPrice
  ? parseFloat(String(p.openTotalPos)) * parseFloat(String(p.openAvgPrice))
  : 0;
const size = parseFloat(String(p.marginSize ?? p.initialMargin ?? bitgetNotional ?? 0));
const closeTimeMs = parseInt(String(p.utime ?? p.closeTime ?? p.cTime ?? 0));
```

## 이력서 소재 한 줄
외부 API 응답 스키마 불일치를 진단 스크립트로 추적해 baseline 생성 파이프라인 복구.
