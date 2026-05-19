// src/adapters/bitget.js
// Bitget 거래창 DOM 어댑터
// 실제 DOM 확인 완료 (2026-05-19):
//   롱: <button role="buyer"><span data-testid="FutureTradeOpenBuyButton">
//   숏: <button role="seller"><span data-testid="FutureTradeOpenSellButton">

const BitgetAdapter = {
  // ─── 1순위: data-testid (가장 안정적 — 테스트 속성은 쉽게 바뀌지 않음)
  TESTID_SELECTORS: [
    'span[data-testid="FutureTradeOpenBuyButton"]',
    'span[data-testid="FutureTradeOpenSellButton"]',
  ],

  // ─── 2순위: role 속성
  ROLE_SELECTORS: [
    'button[role="buyer"]',
    'button[role="seller"]',
  ],

  // ─── 3순위: 기존 fallback (Bitget UI 변경 대응)
  FALLBACK_SELECTORS: [
    'button[class*="order-submit"]',
    'button[class*="submit-btn"]',
    'button[class*="place-order"]',
    'button[class*="trade-btn"]',
    'button[class*="openPosition"]',
    'button[data-action="place-order"]',
    '.trade-action button[type="button"]',
    '.order-form button[type="button"]',
    '[class*="tradePanel"] button[class*="btn"]',
    '[class*="placeOrder"] button',
  ],

  // 확인된 실제 DOM (2026-05-20):
  //   <input data-testid="FutureTradeLimitOrderAmountInput" name="op-amount" value="30">
  SIZE_INPUT_SELECTORS: [
    // 1순위: data-testid 정확 일치 (지정가 / 시장가)
    'input[data-testid="FutureTradeLimitOrderAmountInput"]',
    'input[data-testid="FutureTradeMarketOrderAmountInput"]',
    // 1순위 보완: testid에 "OrderAmountInput" 포함하는 모든 input (부분 일치는 JS로)
    // 2순위: name 속성 (비교적 안정적)
    'input[name="op-amount"]',
    // 3순위: class 기반
    'input.bit-input-filled',
    'input.bit-input',
    // 4순위: 기존 fallback
    'input[name="quantity"]',
    'input[class*="size-input"]',
    'input[class*="amount-input"]',
    'input[class*="quantity"]',
    '[class*="orderSize"] input',
    '[class*="order-size"] input',
  ],

  LEVERAGE_SELECTORS: [
    '[class*="leverage-value"]',
    '[class*="leverageValue"]',
    '[class*="leverage"] span',
    'button[class*="leverage"]',
  ],

  // ─── 버튼 탐색 ─────────────────────────────────────────────

  findEntryButtons() {
    // 1순위: data-testid span → 부모 button으로 올라감
    const byTestId = this._findByTestId();
    if (byTestId.length > 0) return byTestId;

    // 2순위: role 속성
    const byRole = this._findByRole();
    if (byRole.length > 0) return byRole;

    // 3순위: 텍스트 기반 fallback
    return this._findByFallback();
  },

  _findByTestId() {
    const buttons = [];
    for (const sel of this.TESTID_SELECTORS) {
      try {
        const spans = document.querySelectorAll(sel);
        for (const span of spans) {
          const btn = span.closest('button');
          if (btn && !buttons.includes(btn)) buttons.push(btn);
        }
      } catch (e) { /* invalid selector */ }
    }
    return buttons;
  },

  _findByRole() {
    const buttons = [];
    for (const sel of this.ROLE_SELECTORS) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (!buttons.includes(el)) buttons.push(el);
        }
      } catch (e) { /* invalid selector */ }
    }
    return buttons;
  },

  _findByFallback() {
    for (const sel of this.FALLBACK_SELECTORS) {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length === 0) continue;
        const entryBtns = Array.from(els).filter(el => this._isEntryButton(el));
        if (entryBtns.length > 0) return entryBtns;
      } catch (e) { /* invalid selector */ }
    }
    return [];
  },

  _isEntryButton(el) {
    const text = el.textContent.toLowerCase();
    return (
      text.includes('long') || text.includes('short') ||
      text.includes('롱') || text.includes('숏') ||
      text.includes('매수') || text.includes('매도') ||
      text.includes('buy') || text.includes('sell') ||
      text.includes('open')
    );
  },

  // ─── 주문 정보 추출 ────────────────────────────────────────

  extractOrderInfo(button) {
    try {
      return {
        symbol:    this.getSymbol(),
        side:      this.getSide(button),
        size:      this.getSize(),
        leverage:  this.getLeverage(),
        timestamp: Date.now()
      };
    } catch (e) {
      console.error('[FJ] extractOrderInfo failed', e);
      return null;
    }
  },

  getSymbol() {
    const patterns = [
      /\/futures\/usdt\/([A-Z0-9]+)/i,
      /\/futures\/([A-Z0-9]+)_/i,
      /symbol=([A-Z0-9]+)/i,
    ];
    for (const p of patterns) {
      const m = location.href.match(p);
      if (m) return m[1].toUpperCase().replace('USDT', '') + '/USDT';
    }
    const el = document.querySelector(
      '[class*="symbolName"], [class*="coin-name"], [class*="currencyName"]'
    );
    return el ? el.textContent.trim() : 'UNKNOWN';
  },

  getSide(button) {
    // 1순위: role 속성 (확인된 실제 DOM)
    const role = button.getAttribute('role');
    if (role === 'buyer')  return 'long';
    if (role === 'seller') return 'short';

    // 2순위: 자식 span의 data-testid
    const span = button.querySelector('[data-testid]');
    if (span) {
      const testId = span.getAttribute('data-testid') || '';
      if (testId.includes('Buy'))  return 'long';
      if (testId.includes('Sell')) return 'short';
    }

    // 3순위: 텍스트/클래스 fallback
    const text = (button.textContent || '').toLowerCase();
    const cls  = (button.className  || '').toLowerCase();
    const combined = text + ' ' + cls;
    if (combined.includes('long')  || combined.includes('롱')  ||
        combined.includes('매수') || combined.includes('buy'))  return 'long';
    if (combined.includes('short') || combined.includes('숏')  ||
        combined.includes('매도') || combined.includes('sell')) return 'short';

    // 4순위: 배경색 (green=long, red=short)
    const bg = window.getComputedStyle(button).backgroundColor || '';
    if (bg.includes('0, 200') || bg.includes('34, 197')) return 'long';
    if (bg.includes('239, 68') || bg.includes('200, 0')) return 'short';

    return null;
  },

  getSize() {
    // 1순위: data-testid 부분 일치 (Limit / Market / 기타 주문 유형 대응)
    const byTestId = document.querySelector('input[data-testid*="OrderAmountInput"]');
    if (byTestId && byTestId.value) {
      const val = parseFloat(byTestId.value);
      if (!isNaN(val) && val > 0) {
        console.log('[FJ] getSize via testid:', byTestId.dataset.testid, '=', val);
        return val;
      }
    }

    // 2순위 이하: 목록 순서대로 시도
    for (const sel of this.SIZE_INPUT_SELECTORS) {
      const input = document.querySelector(sel);
      if (input && input.value) {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
          console.log('[FJ] getSize via selector:', sel, '=', val);
          return val;
        }
      }
    }

    console.warn('[FJ] getSize: no input found');
    return null;
  },

  getLeverage() {
    for (const sel of this.LEVERAGE_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) {
        const m = el.textContent.match(/(\d+)/);
        if (m) return parseInt(m[1]);
      }
    }
    return null;
  },

  collectDomSample() {
    const candidates = [
      '.trade-panel', '.order-form', '[class*="tradePanel"]', '[class*="orderForm"]', 'form'
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return el.innerHTML.substring(0, 3000);
    }
    return document.body.innerHTML.substring(0, 3000);
  }
};
