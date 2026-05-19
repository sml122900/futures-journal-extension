// src/core/api-client.js
// 모든 API fetch는 background service worker 경유 (CORS 우회)
// content script → chrome.runtime.sendMessage → background → fetch

const ApiClient = {

  // ─── 내부 헬퍼 ──────────────────────────────────────────────

  // Background에 fetch 위임 (응답 대기)
  _fetch(url, options = {}, timeoutMs = Config.API_TIMEOUT) {
    return new Promise((resolve, reject) => {
      // chrome.runtime이 없으면 extension context가 무효화된 것 (탭 재로드 필요)
      if (!chrome?.runtime?.sendMessage) {
        console.error('[FJ] chrome.runtime unavailable — reload the Bitget tab');
        return reject(new Error('extension-context-invalid'));
      }

      const msg = {
        type: 'API_FETCH',
        url,
        method:    options.method  || 'GET',
        headers:   options.headers || {},
        body:      options.body    || null,
        timeoutMs,
      };

      console.log('[FJ] → sendMessage:', msg.method, url);

      chrome.runtime.sendMessage(msg, (resp) => {
        const runtimeErr = chrome.runtime.lastError;
        console.log('[FJ] ← from BG:', resp, runtimeErr ? '| err: ' + runtimeErr.message : '');

        if (runtimeErr) {
          return reject(new Error(runtimeErr.message));
        }
        if (!resp) {
          return reject(new Error('No response from background'));
        }
        if (resp.error) {
          const e = new Error(resp.error);
          if (resp.error === 'AbortError') e.name = 'AbortError';
          return reject(e);
        }
        if (!resp.ok) {
          return reject(new Error(`API ${resp.status}`));
        }
        resolve(resp.data);
      });
    });
  },

  // Background에 fetch 위임 (응답 무시 — fire-and-forget)
  _send(url, options = {}) {
    chrome.runtime.sendMessage(
      {
        type: 'API_FETCH',
        url,
        method:    options.method  || 'GET',
        headers:   options.headers || {},
        body:      options.body    || null,
        timeoutMs: 10_000,
      },
      () => { void chrome.runtime.lastError; } // 응답 무시, 경고 억제
    );
  },

  async _bearerToken() {
    const token = await Auth.getToken();
    if (!token) throw new Error('not-authenticated');
    return `Bearer ${token}`;
  },

  // ─── 핵심 API ────────────────────────────────────────────────

  async checkEmergency(orderInfo) {
    const auth = await this._bearerToken();
    return this._fetch(
      `${Config.API_BASE}/api/emergency-check`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': auth },
        body:    JSON.stringify({ ...orderInfo, source: 'chrome-extension' }),
      },
      Config.EMERGENCY_TIMEOUT  // 8초 — Vercel cold start 대응
    );
  },

  // Vercel serverless cold start 방지용 warm-up (fire-and-forget)
  async warmUp() {
    const token = await Auth.getToken();
    if (!token) return;
    this._send(`${Config.API_BASE}/api/emergency-check/baseline`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log('[FJ] warm-up ping sent');
  },

  async fetchBaseline() {
    const auth = await this._bearerToken();
    return this._fetch(
      `${Config.API_BASE}/api/emergency-check/baseline`,
      { headers: { 'Authorization': auth } },
      5_000  // 초기 로드 여유 있게
    );
  },

  // ─── 기록 API (fire-and-forget) ──────────────────────────────

  async recordCancellation(sessionId) {
    const token = await Auth.getToken();
    if (!token) return;
    this._send(`${Config.API_BASE}/api/emergency/cancel/${sessionId}`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  async recordProceed(sessionId, typedSentence) {
    const token = await Auth.getToken();
    if (!token) return;
    this._send(`${Config.API_BASE}/api/emergency/proceed/${sessionId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ typedSentence }),
    });
  },

  async reportSelectorFailure(data) {
    this._send(`${Config.API_BASE}/api/extension/selector-failure`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
  },

  // ─── 팝업용 (popup.js에서 직접 fetch — 확장 context이므로 CORS 불필요) ──
  // popup.js는 fetch를 직접 호출하므로 이 메서드는 사용되지 않음
  async getUserStats() {
    const auth = await this._bearerToken();
    return this._fetch(
      `${Config.API_BASE}/api/extension/stats`,
      { headers: { 'Authorization': auth } }
    );
  },
};
