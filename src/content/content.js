// src/content/content.js

// 동기 주입 확인 로그 — async 실패와 무관하게 항상 출력됨
console.log('[FJ Extension] script loaded on', location.href);

// ─── BaselineCache ────────────────────────────────────────────

const BaselineCache = {
  _mem: null,

  async get() {
    if (this._mem) return this._mem;
    const stored = await chrome.storage.local.get(Config.STORAGE_KEYS.BASELINE);
    const cached = stored[Config.STORAGE_KEYS.BASELINE];
    if (cached && Date.now() - cached.cachedAt < Config.BASELINE_TTL) {
      this._mem = cached;
      return cached;
    }
    return null;
  },

  async refresh() {
    try {
      const data = await ApiClient.fetchBaseline();
      const entry = { ...data, cachedAt: Date.now() };
      await chrome.storage.local.set({ [Config.STORAGE_KEYS.BASELINE]: entry });
      this._mem = entry;
      console.log('[FJ] Baseline cached — avgSize:', entry.avgPositionSize, 'l1:', entry.level1Threshold);
      return entry;
    } catch (e) {
      if (e.message !== 'not-authenticated') {
        console.warn('[FJ] Baseline refresh failed:', e.message,
          '| 인터셉트는 정상 작동 (서버 호출 경로로 폴백)');
      }
      return this._mem;
    }
  },

  async getOrFetch() {
    const cached = await this.get();
    if (cached) return cached;
    return this.refresh();
  }
};

// ─── 로컬 사전 체크 ───────────────────────────────────────────

function localPreCheck(orderInfo, baseline) {
  if (!baseline || !baseline.avgPositionSize || baseline.avgPositionSize <= 0) {
    return 'check';
  }
  if (baseline.enabled === false) return 'pass';

  // 서버(emergency-detector)와 동일한 로직: median 우선, 없으면 avg * 0.3
  const refSize = baseline.medianPositionSize > 0
    ? baseline.medianPositionSize
    : baseline.avgPositionSize * 0.3;
  if (refSize <= 0) return 'check';

  const sizeMultiplier = orderInfo.size / refSize;
  const l1 = baseline.level1Threshold ?? 1.5;
  return sizeMultiplier < l1 ? 'pass' : 'check';
}

// ─── 초기화 ──────────────────────────────────────────────────

(async function init() {
  console.log('[FJ Extension] init on', location.href);

  document.addEventListener('click', handleEntryClick, true);

  const isAuthed = await Auth.isAuthenticated();
  if (isAuthed) {
    BaselineCache.getOrFetch();
    setInterval(() => BaselineCache.refresh(), Config.BASELINE_TTL);
    ApiClient.warmUp();
  } else {
    console.warn('[FJ] not authenticated — visit the popup to register token');
  }

  checkSelectorHealth();
})();

// ─── 클릭 핸들러 ─────────────────────────────────────────────
// document 캡처 단계에서 실행 → 모든 클릭을 먼저 받음.
// closest()로 entry 버튼인지 판단 후 아니면 즉시 return (비트겟 UI 방해 없음).

function handleEntryClick(event) {
  // bypass 플래그: proceedWithEntry가 호출한 합성 클릭은 통과
  if (event.target.closest?.('button')?.dataset?.fjBypass === 'true') return;

  // ① 1순위: role 속성 (확인된 실제 비트겟 DOM)
  let button = event.target.closest('button[role="buyer"], button[role="seller"]');

  // ② 2순위: data-testid span → 부모 button
  if (!button) {
    const span = event.target.closest(
      '[data-testid="FutureTradeOpenBuyButton"], [data-testid="FutureTradeOpenSellButton"]'
    );
    if (span) button = span.closest('button');
  }

  // ③ 3순위: 가장 가까운 button이 텍스트/클래스로 진입 버튼인지 확인
  if (!button) {
    const nearest = event.target.closest('button');
    if (nearest && BitgetAdapter._isEntryButton(nearest)) button = nearest;
  }

  if (!button) return; // 진입 버튼 아님 → 즉시 반환

  const orderInfo = BitgetAdapter.extractOrderInfo(button);
  if (!orderInfo || !orderInfo.size) {
    console.warn('[FJ] size not detected — passing through');
    return; // 사이즈 미감지 → 정상 진입 (안전 우선)
  }

  // 즉시 동기 인터셉트 (await 이전에 반드시 실행)
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  _handleAsync(button, orderInfo).catch(e => {
    console.error('[FJ] handleAsync error', e);
    proceedWithEntry(button);
  });
}

async function _handleAsync(button, orderInfo) {
  const [isEnabled, isAuthed] = await Promise.all([
    Auth.isEnabled(),
    Auth.isAuthenticated()
  ]);

  if (!isEnabled || !isAuthed) {
    proceedWithEntry(button);
    return;
  }

  const baseline = await BaselineCache.get();
  if (localPreCheck(orderInfo, baseline) === 'pass') {
    proceedWithEntry(button);
    return;
  }

  try {
    const decision = await ApiClient.checkEmergency(orderInfo);
    if (!decision || decision.level === 0) {
      proceedWithEntry(button);
      return;
    }
    Overlay.show(decision, {
      onProceed: () => proceedWithEntry(button),
      onCancel: () => console.log('[FJ] User cancelled entry')
    });
  } catch (e) {
    const reason = e.name === 'AbortError' ? 'timeout' : e.message;
    console.warn('[FJ] Emergency check failed, proceeding:', reason);
    proceedWithEntry(button);
  }
}

function proceedWithEntry(button) {
  button.dataset.fjBypass = 'true';
  button.click();
  requestAnimationFrame(() => { button.dataset.fjBypass = 'false'; });
}

// ─── 셀렉터 헬스 체크 ────────────────────────────────────────

function checkSelectorHealth() {
  setTimeout(() => {
    if (!location.href.includes('/futures/')) return;
    const buttons = BitgetAdapter.findEntryButtons();
    if (buttons.length === 0) {
      console.warn('[FJ] No entry buttons found at 10s mark — reporting to server');
      ApiClient.reportSelectorFailure({
        page: location.href,
        timestamp: Date.now(),
        domSample: BitgetAdapter.collectDomSample()
      });
    } else {
      console.log(`[FJ] Health check OK — ${buttons.length} entry button(s) found`);
    }
  }, 10000);
}
