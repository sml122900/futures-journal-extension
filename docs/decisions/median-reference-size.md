# 기술 결정: Emergency 발동 기준 — avg 대신 median 사용

## Problem
`UserBaseline.avgPositionSize` = 13,032 USDT였으나
이는 큰 거래 1~2건이 평균을 끌어올린 것.
실제 대부분의 거래는 `medianPositionSize` = 966 USDT 수준.

avg 기준이면 Level 1 발동 기준 = 19,548 USDT — 실질적으로 발동이 거의 안 됨.

## Action
`detectEmergency`의 referenceSize 계산 변경:

```ts
// 이전
const referenceSize = Math.max(avg, median);

// 이후
const referenceSize = median > 0 ? median : avg * 0.3;
```

## Result
median 966 USDT 기준으로 발동 임계값이 실제 매매 패턴에 맞게 조정됨:
- Level 1: 1,449 USDT 이상
- Level 2: 1,932 USDT 이상
- Level 3: 4,830 USDT 이상

## 포기한 대안
- avg * 0.5: 임의적인 보정, 근거 약함
- 사용자가 직접 임계금액 설정: UI 복잡도 증가
