// src/background/background.js

// ★ 이 줄이 SW 콘솔에 보이면 background.js가 정상 로드된 것
console.log('[FJ BG] background.js loaded at', new Date().toISOString());

const _API_BASE = 'https://futures-journal-virid.vercel.app';

chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log('[FJ BG] onInstalled reason:', reason);
  if (reason === 'install') {
    // chrome.tabs.create 는 "tabs" 권한 필요
    chrome.tabs.create({
      url: `${_API_BASE}/settings/extension`
    }).catch(e => console.warn('[FJ BG] tabs.create failed:', e.message));
  }
});

// ─── Keep-warm 알람 ────────────────────────────────────────────
// Vercel 서버리스 함수는 ~5분 비활성 시 cold start.
// 4분마다 ping → 서버 warm + MV3 service worker 재기동 트리거.

chrome.alarms.get('keepWarm', (alarm) => {
  if (!alarm) {
    chrome.alarms.create('keepWarm', { delayInMinutes: 1, periodInMinutes: 4 });
    console.log('[FJ BG] keepWarm alarm created');
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'keepWarm') return;
  const stored = await chrome.storage.local.get('fj_token');
  const token = stored['fj_token'];
  if (!token) return;
  // service worker에서 직접 fetch — CORS 무관
  fetch(`${_API_BASE}/api/emergency-check/baseline`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
  console.log('[FJ BG] keep-warm ping sent');
});

// ─── API Fetch 프록시 ─────────────────────────────────────────
// content script → sendMessage(API_FETCH) → 여기서 fetch → sendResponse
// Service worker의 fetch는 chrome-extension:// origin → CORS 우회

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'API_FETCH') return false;

  console.log('[FJ BG] ▶ API_FETCH received:', msg.method, msg.url);

  _doFetch(msg)
    .then(result => {
      console.log('[FJ BG] ✓ done:', msg.url, '→ status', result.status);
      sendResponse(result);
    })
    .catch(e => {
      console.error('[FJ BG] ✗ error:', e.name, e.message, '| url:', msg.url);
      sendResponse({ error: e.message || 'fetch failed' });
    });

  return true; // 비동기 sendResponse를 위해 채널 유지
});

async function _doFetch({ url, method = 'GET', headers = {}, body = null, timeoutMs = 5000 }) {
  console.log('[FJ BG] fetch →', method, url);
  console.log('[FJ BG] headers:', JSON.stringify(headers));

  const controller = new AbortController();
  const tid = setTimeout(() => {
    console.warn('[FJ BG] timeout!', url);
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ?? undefined,
      signal: controller.signal,
    });
    clearTimeout(tid);

    console.log('[FJ BG] response status:', res.status, '| ok:', res.ok);

    let data = null;
    try { data = await res.json(); } catch {
      console.warn('[FJ BG] JSON parse failed (non-JSON response)');
    }

    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(tid);
    console.error('[FJ BG] fetch threw:', e.name, e.message);
    if (e.name === 'AbortError') throw new Error('AbortError');
    throw e;
  }
}
