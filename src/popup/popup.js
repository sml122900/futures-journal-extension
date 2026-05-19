// src/popup/popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const $loading    = document.getElementById('loading');
  const $notAuthed  = document.getElementById('not-authed');
  const $authed     = document.getElementById('authed');

  // 인증 상태 확인
  const token = await Auth.getToken();
  $loading.classList.add('hidden');

  if (!token) {
    showNotAuthed();
  } else {
    showAuthed(token);
  }
});

/* ─── 미인증 UI ─── */
function showNotAuthed() {
  document.getElementById('not-authed').classList.remove('hidden');

  document.getElementById('save-token').addEventListener('click', async () => {
    const input = document.getElementById('token-input');
    const errorEl = document.getElementById('token-error');
    const token = input.value.trim();

    if (!token) {
      showError(errorEl, '토큰을 입력하세요');
      return;
    }

    errorEl.classList.add('hidden');

    try {
      // 토큰 유효성 간단 검증: API 호출
      const res = await fetch(`${Config.API_BASE}/api/extension/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`${res.status}`);

      await Auth.setToken(token);
      window.location.reload();
    } catch (e) {
      showError(errorEl, `토큰이 올바르지 않습니다 (${e.message})`);
    }
  });
}

/* ─── 인증됨 UI ─── */
async function showAuthed(token) {
  const $authed = document.getElementById('authed');
  $authed.classList.remove('hidden');

  // 활성화 토글
  const enabledChk = document.getElementById('extension-enabled');
  enabledChk.checked = await Auth.isEnabled();
  enabledChk.addEventListener('change', () => Auth.setEnabled(enabledChk.checked));

  // 강제 문장
  const sentenceInput = document.getElementById('custom-sentence');
  sentenceInput.value = await Auth.getCustomSentence();

  document.getElementById('save-sentence').addEventListener('click', async () => {
    const sentence = sentenceInput.value.trim() || Config.DEFAULT_SENTENCE;
    await Auth.setCustomSentence(sentence);
    const savedMsg = document.getElementById('sentence-saved');
    savedMsg.classList.remove('hidden');
    setTimeout(() => savedMsg.classList.add('hidden'), 2000);
  });

  // 통계 로드
  loadStats(token);

  // 로그아웃
  document.getElementById('logout').addEventListener('click', async () => {
    await Auth.clear();
    window.location.reload();
  });
}

async function loadStats(token) {
  try {
    const res = await fetch(`${Config.API_BASE}/api/extension/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();

    const emailEl = document.getElementById('user-email');
    if (emailEl && data.email) emailEl.textContent = data.email;

    const countEl = document.getElementById('this-month-count');
    if (countEl && data.thisMonthCount !== undefined) countEl.textContent = `${data.thisMonthCount}회`;

    const lastEl = document.getElementById('last-triggered');
    if (lastEl && data.lastTriggeredAt) {
      lastEl.textContent = new Date(data.lastTriggeredAt).toLocaleDateString('ko-KR');
    }
  } catch (e) {
    console.warn('[FJ Popup] stats load failed', e);
  }
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}
