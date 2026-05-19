// src/overlay/overlay.js
// 경고 오버레이 — DOM 동적 생성 방식 (MV3 호환)

const Overlay = {
  current: null,
  countdownTimer: null,
  _blockKeyboard: null,

  show(decision, callbacks) {
    if (this.current) return;

    const overlay = this._createOverlay(decision);
    document.body.appendChild(overlay);
    this.current = { overlay, decision, callbacks };

    this._populateContent(decision);
    this._startCountdown(decision.countdownSeconds ?? Config.COUNTDOWN_SECONDS[decision.level] ?? 60, decision.level);
    this._attachEventHandlers(decision);

    if (decision.level === 3) {
      this._blockKeyboard = (e) => {
        if (e.key === 'Escape' || e.key === 'F5') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      document.addEventListener('keydown', this._blockKeyboard, true);
    }
  },

  hide() {
    if (!this.current) return;
    clearInterval(this.countdownTimer);
    this.countdownTimer = null;
    if (this._blockKeyboard) {
      document.removeEventListener('keydown', this._blockKeyboard, true);
      this._blockKeyboard = null;
    }
    this.current.overlay.remove();
    this.current = null;
  },

  _createOverlay(decision) {
    const level = decision.level || 1;
    const overlay = document.createElement('div');
    overlay.id = 'fj-overlay';
    overlay.className = `fj-overlay fj-level-${level}`;

    const levelConfig = {
      1: { emoji: '⚠️', title: '주의 — 과매수 구간', bgClass: 'fj-modal--yellow' },
      2: { emoji: '🔶', title: '경고 — 위험 신호 감지', bgClass: 'fj-modal--orange' },
      3: { emoji: '🚨', title: '매매 중단 권고', bgClass: 'fj-modal--red' },
    };
    const cfg = levelConfig[level] || levelConfig[3];

    const needsTyping = level >= 2;
    const countdownSec = Config.COUNTDOWN_SECONDS[level] ?? 60;

    overlay.innerHTML = `
      <div class="fj-modal ${cfg.bgClass}" data-level="${level}">
        <div class="fj-header">
          <span class="fj-emoji">${cfg.emoji}</span>
          <h1 class="fj-title">${cfg.title}</h1>
          <span class="fj-emoji">${cfg.emoji}</span>
        </div>

        <div class="fj-triggers" id="fj-triggers">
          <h3>감지된 조건:</h3>
          <ul id="fj-trigger-list"></ul>
        </div>

        <div class="fj-context" id="fj-context" style="display:none">
          <h3>과거 패턴:</h3>
          <p id="fj-past-pattern"></p>
        </div>

        <div class="fj-countdown">
          <span id="fj-countdown-display">${String(Math.floor(countdownSec / 60)).padStart(2,'0')}:${String(countdownSec % 60).padStart(2,'0')}</span>
          <p class="fj-countdown-label" id="fj-countdown-label">카운트다운 종료 후 ${needsTyping ? '타이핑 가능' : '진행 가능'}</p>
        </div>

        ${needsTyping ? `
        <div class="fj-typing-section" id="fj-typing-section">
          <p>계속하려면 아래 문장을 정확히 타이핑하세요:</p>
          <p class="fj-sentence" id="fj-sentence">로딩 중...</p>
          <input type="text" id="fj-typing-input" placeholder="여기에 타이핑..." disabled autocomplete="off" spellcheck="false" />
          <div class="fj-typing-feedback" id="fj-typing-feedback"></div>
        </div>
        ` : ''}

        <div class="fj-actions">
          <button id="fj-cancel" class="fj-btn fj-btn-cancel">취소하고 차트 다시 보기</button>
          <button id="fj-proceed" class="fj-btn fj-btn-proceed" disabled>완전히 진행하기</button>
        </div>
      </div>
    `;

    return overlay;
  },

  _populateContent(decision) {
    const triggerList = document.getElementById('fj-trigger-list');
    if (triggerList && decision.triggers && decision.triggers.length > 0) {
      triggerList.innerHTML = decision.triggers
        .map(t => `<li>${t}</li>`).join('');
    } else if (triggerList) {
      triggerList.innerHTML = '<li>위험 조건 감지됨</li>';
    }

    if (decision.pastPattern) {
      const ctxEl = document.getElementById('fj-context');
      const ppEl = document.getElementById('fj-past-pattern');
      if (ctxEl) ctxEl.style.display = '';
      if (ppEl) ppEl.textContent = decision.pastPattern;
    }

    const sentenceEl = document.getElementById('fj-sentence');
    if (sentenceEl) {
      const sentence = decision.forceSentence || Config.DEFAULT_SENTENCE;
      sentenceEl.textContent = sentence;
      this.current.targetSentence = sentence;
    }
  },

  _startCountdown(seconds, level) {
    const display = document.getElementById('fj-countdown-display');
    const label = document.getElementById('fj-countdown-label');
    const input = document.getElementById('fj-typing-input');
    const proceedBtn = document.getElementById('fj-proceed');
    let remaining = seconds;

    const fmt = (s) => {
      const m = Math.floor(s / 60).toString().padStart(2, '0');
      const sec = (s % 60).toString().padStart(2, '0');
      return `${m}:${sec}`;
    };

    const tick = () => {
      if (display) display.textContent = fmt(remaining);
      if (remaining <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        if (level === 1) {
          // Level 1: 타이핑 없이 바로 진행 버튼 활성화
          if (proceedBtn) proceedBtn.disabled = false;
          if (label) label.textContent = '진행 또는 취소를 선택하세요';
        } else {
          // Level 2, 3: 타이핑 활성화
          if (input) {
            input.disabled = false;
            input.focus();
          }
          if (label) label.textContent = '⌨️ 타이핑하세요';
        }
      }
      remaining--;
    };

    tick();
    this.countdownTimer = setInterval(tick, 1000);
  },

  _attachEventHandlers(decision) {
    const input = document.getElementById('fj-typing-input');
    const proceedBtn = document.getElementById('fj-proceed');
    const cancelBtn = document.getElementById('fj-cancel');

    if (input) {
      input.addEventListener('input', (e) => {
        const typed = e.target.value;
        const target = this.current.targetSentence || Config.DEFAULT_SENTENCE;
        const match = typed === target;

        input.classList.toggle('fj-match', match);
        input.classList.toggle('fj-mismatch', !match && typed.length > 0);
        if (proceedBtn) proceedBtn.disabled = !match;

        const feedback = document.getElementById('fj-typing-feedback');
        if (feedback) {
          if (match) {
            feedback.textContent = '✓ 정확히 타이핑하셨습니다';
            feedback.className = 'fj-typing-feedback fj-feedback-ok';
          } else if (typed.length > 0) {
            const diffIdx = this._findFirstDiff(typed, target);
            feedback.textContent = `✗ ${diffIdx + 1}번째 글자가 다릅니다`;
            feedback.className = 'fj-typing-feedback fj-feedback-err';
          } else {
            feedback.textContent = '';
            feedback.className = 'fj-typing-feedback';
          }
        }
      });
    }

    if (proceedBtn) {
      proceedBtn.addEventListener('click', async () => {
        const typed = input ? input.value : '';
        if (this.current?.decision?.sessionId) {
          await ApiClient.recordProceed(this.current.decision.sessionId, typed);
        }
        const cb = this.current?.callbacks?.onProceed;
        this.hide();
        if (cb) cb();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', async () => {
        if (this.current?.decision?.sessionId) {
          await ApiClient.recordCancellation(this.current.decision.sessionId);
        }
        const cb = this.current?.callbacks?.onCancel;
        this.hide();
        if (cb) cb();
      });
    }
  },

  _findFirstDiff(a, b) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) return i;
    }
    return len;
  }
};
