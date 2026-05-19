// src/core/config.js

const Config = {
  API_BASE: 'https://futures-journal-virid.vercel.app',

  DEFAULT_SENTENCE: '원칙을 지켜야 살아남는다',

  COUNTDOWN_SECONDS: {
    1: 10,
    2: 30,
    3: 60
  },

  // 일반 API 타임아웃 (ms)
  API_TIMEOUT: 5000,

  // emergency-check 전용 타임아웃 — Vercel cold start 고려
  EMERGENCY_TIMEOUT: 8000,

  // 베이스라인 캐시 유효 시간 (ms)
  BASELINE_TTL: 3600_000, // 1시간

  STORAGE_KEYS: {
    TOKEN: 'fj_token',
    ENABLED: 'fj_enabled',
    CUSTOM_SENTENCE: 'fj_sentence',
    BASELINE: 'fj_baseline',  // UserBaseline 로컬 캐시
  }
};
