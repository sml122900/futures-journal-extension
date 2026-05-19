# Phase Chrome — Emergency Brake 크롬 확장

> Futures Journal 크롬 확장. 비트겟 PC 거래창에서 진입 버튼 클릭 직전 강제 경고. Claude Code 자동 진행용 계획서.

---

## 중요 사전 안내

**이 작업은 별도 프로젝트입니다.**

- 기존 `futures-journal` 프로젝트와 분리
- 새 폴더 `futures-journal-extension` 생성
- 기존 메인 서버 API를 호출하는 클라이언트 역할

---

## 자동 진행 규칙

1. 아래 단계를 순서대로 진행
2. 각 단계 끝나면 빌드/패키징 확인
3. 각 단계 완료 시 변경/생성 파일 목록을 1~2줄로 요약
4. 단계 완료 시 진행 상태 표 업데이트

## 멈추고 사용자에게 물어봐야 하는 경우

- 비트겟 웹 UI에서 DOM 셀렉터를 찾을 수 없는 경우 (실제 페이지 확인 필요)
- 크롬 스토어 등록 직전 (개발자 계정 등록비 $5 결제 필요)
- 디자인 결정이 모호한 경우

---

## 기능 개요

크롬 확장은 비트겟 웹사이트의 진입 버튼 클릭 이벤트를 가로채서, 위험 감지 시 강제 경고 화면을 띄운다. 사용자가 미리 등록한 문장을 정확히 타이핑해야만 경고가 닫히고 진입이 진행된다.

### 타깃 시나리오

```
[사용자가 비트겟 거래창에서 평소 4배 사이즈 입력 후 "롱" 버튼 클릭]
       ↓
[크롬 확장이 클릭 이벤트 인터셉트]
       ↓
[메인 서버에 위험도 체크 요청]
       ↓
[Level 3 응답]
       ↓
[전체 화면 빨간 오버레이 + 강제 타이핑 화면]
       ↓
[60초 카운트다운 + 정확한 문장 타이핑]
       ↓
[타이핑 통과 시에만 원래 진입 버튼 클릭 진행]
```

---

## 진행 상태

| 단계 | 작업 | 상태 |
|------|------|------|
| C1 | 별도 프로젝트 생성 + 기본 구조 | ✅ 완료 |
| C2 | manifest.json + 권한 설정 | ✅ 완료 |
| C3 | Bitget 어댑터 (DOM 셀렉터) | ✅ 완료 (실제 DOM 확인 필요) |
| C4 | 진입 버튼 인터셉트 (content.js) | ✅ 완료 |
| C5 | 서버 API 호출 모듈 | ✅ 완료 |
| C6 | 오버레이 UI (Level 1, 2, 3) | ✅ 완료 |
| C7 | 강제 타이핑 검증 + 카운트다운 | ✅ 완료 |
| C8 | 팝업 (확장 아이콘 클릭 시) | ✅ 완료 |
| C9 | 메인 서버 API 추가 + 인증 | ✅ 완료 (마이그레이션 필요) |
| C10 | 패키징 + 크롬 스토어 등록 준비 | ✅ 완료 |

---

## C1. 별도 프로젝트 생성

### 1-1. 폴더 구조

```
futures-journal-extension/    (futures-journal과 같은 레벨)
├── manifest.json              크롬 확장 정보 + 권한
├── README.md                  설치 가이드
├── package.json               빌드 도구
├── src/
│   ├── content/
│   │   ├── content.js         메인 콘텐츠 스크립트
│   │   └── content.css        오버레이 스타일
│   ├── overlay/
│   │   ├── overlay.html       경고 화면 템플릿
│   │   ├── overlay.css        경고 화면 스타일
│   │   └── overlay.js         타이핑 검증 + 카운트다운
│   ├── adapters/
│   │   └── bitget.js          비트겟 DOM 어댑터
│   ├── core/
│   │   ├── api-client.js      서버 API 호출
│   │   ├── auth.js            인증 관리
│   │   └── config.js          상수 (API URL, 강제 문장 등)
│   ├── popup/
│   │   ├── popup.html         아이콘 클릭 시 팝업
│   │   ├── popup.css
│   │   └── popup.js
│   └── background/
│       └── background.js      Service Worker (필요 시)
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── _locales/
    └── ko/
        └── messages.json      한국어 메시지
```

### 1-2. 초기화

```bash
mkdir futures-journal-extension
cd futures-journal-extension

# 빌드 도구 선택 (옵션):
# A: Vanilla JS (빌드 도구 없음, 가장 간단)
# B: webpack + esbuild (모듈 시스템)
# C: Vite (현대적, HMR)

# 권장: A (Vanilla JS)
# 이유: 크롬 확장은 모듈 import가 약간 제한적이고, 단순함이 유지보수에 좋음

npm init -y
```

`package.json`:
```json
{
  "name": "futures-journal-extension",
  "version": "0.1.0",
  "description": "Futures Journal Emergency Brake Chrome Extension",
  "scripts": {
    "build": "node scripts/build.js",
    "watch": "node scripts/build.js --watch"
  }
}
```

빌드 스크립트는 단순 파일 복사 + manifest 생성 정도면 충분.

---

## C2. manifest.json + 권한

### 2-1. manifest.json

```json
{
  "manifest_version": 3,
  "name": "Futures Journal — Emergency Brake",
  "version": "0.1.0",
  "description": "비트겟 매매 시 뇌동매매를 막아주는 매매 코치",
  "default_locale": "ko",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.bitget.com/*",
    "https://futures-journal.vercel.app/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://www.bitget.com/futures/*"],
      "js": [
        "src/adapters/bitget.js",
        "src/core/config.js",
        "src/core/auth.js",
        "src/core/api-client.js",
        "src/content/content.js"
      ],
      "css": ["src/content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png"
    }
  },
  "web_accessible_resources": [
    {
      "resources": ["src/overlay/overlay.html"],
      "matches": ["https://www.bitget.com/*"]
    }
  ]
}
```

### 2-2. 권한 설명

| 권한 | 용도 |
|------|------|
| `storage` | 사용자 토큰, 설정 저장 |
| `activeTab` | 현재 탭 접근 |
| `https://www.bitget.com/*` | 비트겟 페이지에 스크립트 주입 |
| `https://futures-journal.vercel.app/*` | 메인 서버 API 호출 |

---

## C3. Bitget 어댑터

### 3-1. DOM 셀렉터 조사 필요

비트겟 거래창의 DOM 구조를 실제로 조사해야 함. 다음 요소 식별:

- 심볼 표시 영역
- 방향 토글 (Long / Short)
- 수량 입력 input
- 가격 입력 input (지정가 시)
- 레버리지 표시
- 진입 버튼

### 3-2. bitget.js 구조

```javascript
// src/adapters/bitget.js

const BitgetAdapter = {
  /**
   * 진입 버튼 찾기
   * 비트겟 클래스명은 자주 변경되므로 여러 셀렉터 fallback
   */
  findEntryButtons() {
    const selectors = [
      'button.order-submit',
      'button[data-action="place-order"]',
      'div.trade-action button',
      // 다른 fallback 셀렉터들
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) return Array.from(els);
    }
    return [];
  },

  /**
   * 현재 주문 정보 추출
   */
  extractOrderInfo(button) {
    try {
      return {
        symbol: this.getSymbol(),
        side: this.getSide(button),
        size: this.getSize(),
        leverage: this.getLeverage(),
        timestamp: Date.now()
      };
    } catch (e) {
      console.error('[FJ] extractOrderInfo failed', e);
      return null;
    }
  },

  getSymbol() {
    // URL 또는 DOM에서 추출
    const m = location.pathname.match(/\/futures\/usdt\/([A-Z]+)/);
    return m ? m[1] : null;
  },

  getSide(button) {
    // 버튼 텍스트 또는 클래스로 long/short 판단
    const text = button.textContent.toLowerCase();
    if (text.includes('long') || text.includes('롱') || text.includes('매수')) return 'long';
    if (text.includes('short') || text.includes('숏') || text.includes('매도')) return 'short';
    return null;
  },

  getSize() {
    // 수량 입력값 추출
    const input = document.querySelector('input[name="quantity"]') ||
                  document.querySelector('input.size-input');
    return input ? parseFloat(input.value) : null;
  },

  getLeverage() {
    // 레버리지 표시 영역
    const el = document.querySelector('.leverage-value');
    return el ? parseInt(el.textContent) : null;
  }
};
```

### 3-3. 셀렉터 자동 보고 메커니즘

비트겟이 UI 변경 시 우리 확장이 깨질 수 있음. 셀렉터 실패를 자동 보고하는 메커니즘 추가:

```javascript
// 셀렉터 못 찾으면 서버로 에러 보고
if (entryButtons.length === 0) {
  ApiClient.reportSelectorFailure({
    page: location.href,
    timestamp: Date.now(),
    domSample: document.body.innerHTML.substring(0, 2000)
  });
}
```

서버 측에서 텔레그램 알림으로 받아서 신속 대응 가능.

---

## C4. 진입 버튼 인터셉트

### 4-1. content.js 핵심 로직

```javascript
// src/content/content.js

(function init() {
  console.log('[FJ Extension] init');

  // DOM 준비 후 셀렉터 탐색
  const observer = new MutationObserver(() => {
    attachInterceptor();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  attachInterceptor();
})();

function attachInterceptor() {
  const buttons = BitgetAdapter.findEntryButtons();
  if (buttons.length === 0) return;

  buttons.forEach(button => {
    if (button.dataset.fjAttached) return;  // 중복 방지
    button.dataset.fjAttached = 'true';

    button.addEventListener('click', handleEntryClick, true);  // capture phase
  });
}

async function handleEntryClick(event) {
  const button = event.currentTarget;
  const orderInfo = BitgetAdapter.extractOrderInfo(button);

  if (!orderInfo || !orderInfo.size) {
    // 정보 추출 실패 → 정상 진입 진행
    return;
  }

  // 인증 확인
  const isAuthed = await Auth.isAuthenticated();
  if (!isAuthed) {
    // 비로그인 → 정상 진입 진행, 단 팝업으로 안내
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  try {
    const decision = await ApiClient.checkEmergency(orderInfo);

    if (decision.level === 0) {
      // 위험 없음 → 원래 클릭 다시 트리거
      proceedWithEntry(button);
      return;
    }

    // 경고 화면 표시
    Overlay.show(decision, {
      onProceed: () => proceedWithEntry(button),
      onCancel: () => {
        // 그냥 닫기 (진입 안 함)
        ApiClient.recordCancellation(decision.sessionId);
      }
    });
  } catch (e) {
    console.error('[FJ] emergency check failed', e);
    // API 실패 시 안전을 위해 정상 진입 진행 (서비스 장애로 매매 막으면 안 됨)
    proceedWithEntry(button);
  }
}

function proceedWithEntry(button) {
  // 인터셉터 일시 해제 후 다시 클릭
  button.dataset.fjBypass = 'true';
  button.click();
  button.dataset.fjBypass = 'false';
}
```

### 4-2. Bypass 처리

`proceedWithEntry`에서 `fjBypass` 플래그 사용. 인터셉터는 이 플래그 확인 후 우회:

```javascript
function handleEntryClick(event) {
  if (event.currentTarget.dataset.fjBypass === 'true') {
    return;  // 우리가 호출한 클릭이므로 인터셉트 안 함
  }
  // ...
}
```

---

## C5. 서버 API 호출 모듈

### 5-1. api-client.js

```javascript
// src/core/api-client.js

const ApiClient = {
  async checkEmergency(orderInfo) {
    const token = await Auth.getToken();
    const response = await fetch(`${Config.API_BASE}/api/emergency-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...orderInfo,
        source: 'chrome-extension'
      })
    });

    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  },

  async recordCancellation(sessionId) {
    const token = await Auth.getToken();
    await fetch(`${Config.API_BASE}/api/emergency/cancel/${sessionId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  async recordProceed(sessionId, typedSentence) {
    const token = await Auth.getToken();
    await fetch(`${Config.API_BASE}/api/emergency/proceed/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ typedSentence })
    });
  },

  async reportSelectorFailure(data) {
    // 셀렉터 실패 보고 (에러 처리는 silent)
    try {
      await fetch(`${Config.API_BASE}/api/extension/selector-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {}
  }
};
```

### 5-2. config.js

```javascript
const Config = {
  API_BASE: 'https://futures-journal.vercel.app',
  // 개발 시: 'http://localhost:3000'

  DEFAULT_SENTENCE: '원칙을 지켜야 살아남는다',

  COUNTDOWN_SECONDS: {
    1: 10,
    2: 30,
    3: 60
  }
};
```

### 5-3. auth.js

```javascript
const Auth = {
  TOKEN_KEY: 'fj_token',

  async getToken() {
    const data = await chrome.storage.local.get(this.TOKEN_KEY);
    return data[this.TOKEN_KEY];
  },

  async setToken(token) {
    await chrome.storage.local.set({ [this.TOKEN_KEY]: token });
  },

  async clear() {
    await chrome.storage.local.remove(this.TOKEN_KEY);
  },

  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  }
};
```

---

## C6. 오버레이 UI (Level 1, 2, 3)

### 6-1. overlay.html (또는 동적 생성)

```html
<div id="fj-overlay" class="fj-overlay hidden">
  <div class="fj-modal" data-level="3">
    <div class="fj-header">
      <span class="fj-emoji">🚨</span>
      <h1>매매 중단 권고</h1>
      <span class="fj-emoji">🚨</span>
    </div>

    <div class="fj-triggers">
      <h3>다음 조건이 동시 감지됐습니다:</h3>
      <ul id="fj-trigger-list"></ul>
    </div>

    <div class="fj-context">
      <h3>당신의 과거 데이터:</h3>
      <p id="fj-past-pattern"></p>
    </div>

    <div class="fj-warning">
      <p>진행 시 잃을 것:</p>
      <ul id="fj-loss-list"></ul>
    </div>

    <div class="fj-typing-section">
      <p>계속하려면 아래 문장을 정확히 타이핑하세요:</p>
      <p class="fj-sentence" id="fj-sentence">원칙을 지켜야 살아남는다</p>
      <input type="text" id="fj-typing-input" placeholder="여기에 타이핑..." disabled />
      <div class="fj-typing-feedback" id="fj-typing-feedback"></div>
    </div>

    <div class="fj-countdown">
      <span id="fj-countdown-display">01:00</span>
      <p>카운트다운 종료 후 타이핑 가능</p>
    </div>

    <div class="fj-actions">
      <button id="fj-cancel" class="fj-btn fj-btn-cancel">
        취소하고 차트 다시 보기
      </button>
      <button id="fj-proceed" class="fj-btn fj-btn-proceed" disabled>
        완전히 진행하기
      </button>
    </div>
  </div>
</div>
```

### 6-2. Level별 차이

| Level | 카운트다운 | 타이핑 필수 | 디자인 강도 |
|-------|----------|-------------|-----------|
| 1 | 10초 | 선택 (확인 버튼만으로 가능) | 가벼운 노란 박스 |
| 2 | 30초 | 필수 | 주황 박스 + 큰 경고 |
| 3 | 60초 | 필수 | 빨간 풀스크린 오버레이 |

### 6-3. CSS 핵심

```css
/* src/content/content.css */

.fj-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 999999;  /* 비트겟보다 위 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.fj-overlay.hidden { display: none; }

.fj-modal[data-level="3"] {
  border: 3px solid #c00000;
  background: #fff;
  color: #c00000;
  padding: 32px;
  max-width: 600px;
  border-radius: 8px;
  animation: fjShake 0.5s;
}

@keyframes fjShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.fj-sentence {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  padding: 16px;
  background: #f5f5f5;
  border: 2px dashed #c00000;
}

#fj-typing-input {
  width: 100%;
  font-size: 18px;
  padding: 12px;
  margin-top: 8px;
}

#fj-typing-input.fj-match {
  border-color: #2ea043;
  background: #e6ffec;
}

#fj-typing-input.fj-mismatch {
  border-color: #c00000;
  background: #ffeef0;
}

.fj-countdown {
  text-align: center;
  font-size: 32px;
  font-weight: bold;
  color: #c00000;
}

.fj-btn-proceed:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
```

다크모드 호환:
```css
@media (prefers-color-scheme: dark) {
  .fj-modal[data-level="3"] {
    background: #1a1a1a;
    color: #ff6b6b;
  }
}
```

---

## C7. 강제 타이핑 검증 + 카운트다운

### 7-1. overlay.js 핵심

```javascript
// src/overlay/overlay.js

const Overlay = {
  current: null,

  show(decision, callbacks) {
    if (this.current) return;  // 중복 방지

    const overlay = this.createOverlay(decision);
    document.body.appendChild(overlay);
    this.current = { overlay, decision, callbacks };

    this.populateContent(decision);
    this.startCountdown(decision.countdownSeconds || 60);
    this.attachEventHandlers();
  },

  hide() {
    if (!this.current) return;
    this.current.overlay.remove();
    this.current = null;
  },

  startCountdown(seconds) {
    const display = document.getElementById('fj-countdown-display');
    const input = document.getElementById('fj-typing-input');
    let remaining = seconds;

    const tick = () => {
      const m = Math.floor(remaining / 60).toString().padStart(2, '0');
      const s = (remaining % 60).toString().padStart(2, '0');
      display.textContent = `${m}:${s}`;
      remaining--;
      if (remaining < 0) {
        clearInterval(this.countdownTimer);
        input.disabled = false;
        input.focus();
        display.textContent = '⌨️ 타이핑 가능';
      }
    };

    tick();
    this.countdownTimer = setInterval(tick, 1000);
  },

  attachEventHandlers() {
    const input = document.getElementById('fj-typing-input');
    const proceedBtn = document.getElementById('fj-proceed');
    const cancelBtn = document.getElementById('fj-cancel');
    const targetSentence = this.current.decision.forceSentence;

    input.addEventListener('input', (e) => {
      const typed = e.target.value;
      const match = typed === targetSentence;

      input.classList.toggle('fj-match', match);
      input.classList.toggle('fj-mismatch', !match && typed.length > 0);
      proceedBtn.disabled = !match;

      const feedback = document.getElementById('fj-typing-feedback');
      if (match) {
        feedback.textContent = '✓ 정확히 타이핑하셨습니다';
      } else if (typed.length > 0) {
        const diff = this.findFirstDiff(typed, targetSentence);
        feedback.textContent = `✗ ${diff + 1}번째 글자가 다릅니다`;
      } else {
        feedback.textContent = '';
      }
    });

    proceedBtn.addEventListener('click', async () => {
      await ApiClient.recordProceed(
        this.current.decision.sessionId,
        input.value
      );
      const onProceed = this.current.callbacks.onProceed;
      this.hide();
      onProceed();
    });

    cancelBtn.addEventListener('click', async () => {
      await ApiClient.recordCancellation(this.current.decision.sessionId);
      const onCancel = this.current.callbacks.onCancel;
      this.hide();
      onCancel();
    });
  },

  findFirstDiff(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return i;
    }
    return Math.min(a.length, b.length);
  }
};
```

### 7-2. 키보드 차단 (Level 3)

Level 3에서는 사용자가 ESC 키나 다른 단축키로 우회 못 하도록:

```javascript
function blockKeyboard(e) {
  if (e.key === 'Escape' || e.key === 'F5') {
    e.preventDefault();
    e.stopPropagation();
  }
}

// show 시 활성화
if (decision.level === 3) {
  document.addEventListener('keydown', blockKeyboard, true);
}

// hide 시 해제
document.removeEventListener('keydown', blockKeyboard, true);
```

---

## C8. 팝업 (확장 아이콘 클릭)

### 8-1. popup.html

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup">
    <h2>Futures Journal</h2>
    <p class="subtitle">Emergency Brake 확장</p>

    <div id="auth-section">
      <!-- 로그인 안됨 -->
      <div id="not-authed" class="hidden">
        <p>먼저 Futures Journal에 로그인 후 토큰을 등록하세요.</p>
        <button id="open-site">사이트 열기 →</button>
      </div>

      <!-- 로그인 됨 -->
      <div id="authed" class="hidden">
        <p>✅ 연결됨</p>
        <p class="email" id="user-email"></p>

        <hr>

        <div class="setting">
          <label>
            <input type="checkbox" id="extension-enabled" checked>
            확장 활성화
          </label>
        </div>

        <div class="setting">
          <label>강제 문장:</label>
          <textarea id="custom-sentence" maxlength="100"></textarea>
          <button id="save-sentence">저장</button>
        </div>

        <hr>

        <div class="stats">
          <p>이번 달 발동: <span id="this-month-count">-</span>회</p>
          <p>마지막 발동: <span id="last-triggered">-</span></p>
        </div>

        <button id="logout">로그아웃</button>
      </div>
    </div>

    <footer>
      <a href="https://futures-journal.vercel.app" target="_blank">대시보드 열기</a>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### 8-2. 토큰 등록 흐름

사용자가 메인 사이트에서 확장 토큰을 발급받아 팝업에 붙여넣는 방식.

```
1. 사용자가 메인 사이트의 /settings/extension 접속
2. "확장 토큰 발급" 클릭 → 32자 랜덤 토큰 표시
3. 사용자가 토큰 복사
4. 크롬 확장 팝업 → "토큰 붙여넣기" 입력
5. 확장이 chrome.storage.local에 저장
6. 이후 API 호출 시 이 토큰 사용
```

서버 측에 ExtensionToken 모델 + 토큰 검증 로직 필요 (C9에서 처리).

---

## C9. 메인 서버 API 추가

### 9-1. ExtensionToken 모델 (futures-journal 메인 프로젝트)

```prisma
model ExtensionToken {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token      String   @unique
  name       String?                              // "MacBook Pro" 같은 디바이스 이름
  lastUsedAt DateTime?
  createdAt  DateTime @default(now())
  revokedAt  DateTime?

  @@index([token])
}
```

### 9-2. API 라우트 (메인 프로젝트)

```typescript
// src/app/api/extension/token/route.ts
// POST: 새 토큰 발급
// GET: 내 토큰 목록
// DELETE: 토큰 폐기

// src/app/api/emergency-check/route.ts
// POST: 위험도 체크 (Bearer 토큰 또는 세션 둘 다 허용)

// src/app/api/emergency/cancel/[sessionId]/route.ts
// POST: 사용자가 진입 취소

// src/app/api/emergency/proceed/[sessionId]/route.ts
// POST: 사용자가 강제 진행 (타이핑 통과)

// src/app/api/extension/selector-failure/route.ts
// POST: 셀렉터 실패 보고 (인증 없음, 텔레그램 알림)
```

### 9-3. 인증 미들웨어 확장

세션 + Bearer 토큰 둘 다 지원:

```typescript
export async function authenticate(request: NextRequest): Promise<User | null> {
  // 1. Bearer 토큰 우선
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const record = await prisma.extensionToken.findUnique({
      where: { token },
      include: { user: true }
    });
    if (record && !record.revokedAt) {
      // 마지막 사용 시각 업데이트 (비동기)
      prisma.extensionToken.update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() }
      }).catch(() => {});
      return record.user;
    }
  }

  // 2. 세션 fallback
  const session = await auth();
  if (session?.user) {
    return await prisma.user.findUnique({ where: { id: session.user.id } });
  }

  return null;
}
```

### 9-4. CORS 설정

크롬 확장에서 메인 서버로 fetch 가능하도록:

```typescript
// 미들웨어 또는 라우트별로 CORS 헤더 추가
const allowedOrigins = [
  'chrome-extension://YOUR_EXTENSION_ID',
  'https://futures-journal.vercel.app'
];

// 또는 manifest.json에 host_permissions만으로 충분
```

---

## C10. 패키징 + 크롬 스토어

### 10-1. 패키징

```bash
# 빌드 (필요 시)
npm run build

# zip 압축
zip -r futures-journal-extension.zip . -x "node_modules/*" "*.git*" "scripts/*"
```

### 10-2. 개발자 모드 설치 (베타용)

```
1. chrome://extensions/ 접속
2. 우측 상단 "개발자 모드" 켜기
3. "압축해제된 확장 프로그램 로드" 클릭
4. futures-journal-extension 폴더 선택
5. 확장 활성화 확인
```

### 10-3. 크롬 스토어 등록 (정식 출시)

```
1. https://chrome.google.com/webstore/devconsole 가입
2. 개발자 등록비 $5 결제
3. "새 항목" → zip 파일 업로드
4. 스토어 페이지 작성:
   - 이름, 설명, 카테고리
   - 스크린샷 4~5장
   - 프라이버시 정책 URL
5. 심사 제출 (1~2주 소요)
```

⚠️ 멈추고 사용자에게 물어봐야 함: 개발자 등록비 결제 시점, 스토어 페이지 텍스트 검토.

### 10-4. 자동 업데이트

manifest의 `version` 변경 + 재업로드만으로 자동 업데이트됨. 사용자는 별도 작업 불필요.

---

## 작업 후 점검

모든 단계 완료 후:

1. 개발자 모드로 설치 가능한 zip 파일 생성
2. 비트겟 페이지에서 실제 작동 테스트:
   - 작은 사이즈 진입 시 Level 0 (경고 없음)
   - 큰 사이즈 진입 시 Level 1/2/3 표시
   - 타이핑 검증 작동
3. 변경/생성 파일 목록 보고
4. 진행 상태 표 업데이트

### 통합 테스트 시나리오

```
1. futures-journal 메인 사이트 로그인
2. /settings/extension에서 확장 토큰 발급
3. 크롬 확장 팝업에 토큰 등록
4. 비트겟 페이지에서 진입 시도
5. Emergency 발동 → 경고 화면
6. 강제 타이핑 → 진입 진행 또는 취소
7. 메인 사이트의 Emergency 통계에 기록 확인
```

---

## 주의사항 및 한계

### 기술적 한계

- 비트겟 UI 변경 시 어댑터 업데이트 필요 (분기 1회 정도)
- 시크릿 모드에서는 확장 비활성화 (사용자가 자동 우회 가능)
- 사용자가 확장 비활성화하면 작동 안 함
- 모바일 비트겟 앱은 커버 불가 (별도 안드로이드 앱 필요)

### 정책적 한계

- 크롬 스토어 심사에서 거부 가능성 (거래소 관련 확장 까다로움)
- 비트겟이 정책으로 막을 가능성은 낮음 (read-only 권한이므로)
- "투자 조언 아님" 면책 필수

### 디자인 원칙

- 사용자의 정상 매매를 절대 방해하지 않음 (Level 0이면 통과)
- API 실패 시 안전을 위해 정상 진입 진행
- 사용자가 일시 비활성화 가능 (단, 사유 기록)

---

## 작업 순서 권장

```
C1 (프로젝트 생성)
  → 폴더 구조 확인
C2 (manifest.json)
  → 개발자 모드 로드 가능한지 확인
C3 (Bitget 어댑터)
  → 비트겟 페이지 실제 DOM 확인 후 셀렉터 작성
C4 (인터셉트)
  → 작은 사이즈 매매로 인터셉트 작동 확인
C5 (API 클라이언트)
  → localhost:3000 메인 서버와 통신
C6 (오버레이 UI)
  → Level 1, 2, 3 디자인
C7 (타이핑 + 카운트다운)
  → 검증 로직 완성
C8 (팝업)
  → 토큰 등록 UI
C9 (메인 서버 확장)
  → ExtensionToken 모델 + API
C10 (패키징)
  → zip 생성 + 베타 배포
```

---

## 메인 프로젝트와의 통합

이 확장은 별도 프로젝트이지만 메인 `futures-journal`에 다음이 추가되어야 함:

```
futures-journal/  (메인)
├── prisma/schema.prisma           → ExtensionToken 모델 추가
├── src/app/api/extension/         → 토큰 발급 API
├── src/app/api/emergency-check/   → 위험도 체크 (확장에서 호출)
├── src/app/api/emergency/         → cancel, proceed API
└── src/app/settings/extension/    → 토큰 발급 페이지 UI
```

이 메인 프로젝트 작업도 C9 단계에 포함되어 있음.

---

**이 PHASE_CHROME.md를 읽고 자동 진행해줘.**
