// src/background/background.js

// ★ 이 줄이 SW 콘솔에 보이면 background.js가 정상 로드된 것
console.log('[FJ BG] background.js loaded at', new Date().toISOString());

chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log('[FJ BG] onInstalled reason:', reason);
  if (reason === 'install') {
    // chrome.tabs.create 는 "tabs" 권한 필요
    chrome.tabs.create({
      url: 'https://futures-journal-virid.vercel.app/settings/extension'
    }).catch(e => console.warn('[FJ BG] tabs.create failed:', e.message));
  }
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
