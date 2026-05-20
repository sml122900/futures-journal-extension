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

// ─── blocking-status 폴링 알람 (5분) ─────────────────────────

chrome.alarms.get('blockingStatus', (alarm) => {
  if (!alarm) {
    chrome.alarms.create('blockingStatus', { delayInMinutes: 1, periodInMinutes: 5 });
    console.log('[FJ BG] blockingStatus alarm created');
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'keepWarm') {
    const stored = await chrome.storage.local.get('fj_token');
    const token = stored['fj_token'];
    if (!token) return;
    fetch(`${_API_BASE}/api/emergency-check/baseline`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    return;
  }

  if (alarm.name === 'blockingStatus') {
    const stored = await chrome.storage.local.get('fj_token');
    const token = stored['fj_token'];
    if (!token) return;

    try {
      const res = await fetch(`${_API_BASE}/api/extension/blocking-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // 활성 비트겟 탭에 차단 상태 전달
      const tabs = await chrome.tabs.query({ url: '*://www.bitget.com/futures/*' });
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'BLOCKING_STATUS_UPDATE',
          isBlocking: data.isBlocking,
          reasons: data.reasons ?? [],
        }).catch(() => {});
      }
    } catch { /**/ }
  }
});

// ─── API Fetch 프록시 ─────────────────────────────────────────
// content script → sendMessage(API_FETCH) → 여기서 fetch → sendResponse
// Service worker의 fetch는 chrome-extension:// origin → CORS 우회

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'API_FETCH') return false;

  _doFetch(msg)
    .then(sendResponse)
    .catch(e => {
      console.error('[FJ BG] fetch error:', e.name, e.message, '| url:', msg.url);
      sendResponse({ error: e.message || 'fetch failed' });
    });

  return true; // 비동기 sendResponse를 위해 채널 유지
});

async function _doFetch({ url, method = 'GET', headers = {}, body = null, timeoutMs = 5000 }) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ?? undefined,
      signal: controller.signal,
    });
    clearTimeout(tid);

    let data = null;
    try { data = await res.json(); } catch {
      console.warn('[FJ BG] non-JSON response from', url);
    }

    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(tid);
    if (e.name === 'AbortError') throw new Error('AbortError');
    throw e;
  }
}
