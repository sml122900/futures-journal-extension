// src/content/banner.js
// 차단 상태일 때 페이지 상단에 표시되는 빨간 띠

const Banner = (() => {
  const BANNER_ID = 'fj-block-banner';
  const DISMISSED_KEY = 'fj_banner_dismissed_at';
  const DISMISS_TTL = 5 * 60_000; // 5분 후 다시 표시

  function _getEl() { return document.getElementById(BANNER_ID); }

  function _isDismissed() {
    try {
      const at = parseInt(sessionStorage.getItem(DISMISSED_KEY) ?? '0', 10);
      return at > 0 && Date.now() - at < DISMISS_TTL;
    } catch { return false; }
  }

  function _buildText(reasons) {
    if (!reasons || reasons.length === 0) return '⚠️ 매매 차단 조건이 활성화되어 있습니다';
    if (reasons.length === 1) return `⚠️ ${reasons[0]}`;
    return `⚠️ ${reasons.length}가지 차단 조건 활성 — ${reasons.slice(0, 2).join(' | ')}${reasons.length > 2 ? ' ...' : ''}`;
  }

  return {
    show(reasons) {
      if (_isDismissed()) return;
      let el = _getEl();
      if (!el) {
        el = document.createElement('div');
        el.id = BANNER_ID;
        el.style.cssText = [
          'position:fixed', 'top:0', 'left:0', 'width:100%', 'z-index:999999',
          'background:#dc2626', 'color:#fff', 'font-size:14px', 'font-weight:600',
          'padding:10px 48px 10px 16px', 'text-align:center', 'line-height:1.4',
          'box-shadow:0 2px 8px rgba(0,0,0,0.3)', 'font-family:-apple-system,sans-serif',
        ].join(';');

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = [
          'position:absolute', 'right:14px', 'top:50%', 'transform:translateY(-50%)',
          'background:none', 'border:none', 'color:#fff', 'font-size:16px',
          'cursor:pointer', 'padding:4px 6px', 'line-height:1',
        ].join(';');
        closeBtn.addEventListener('click', () => Banner.hide());
        el.appendChild(closeBtn);
        document.body.prepend(el);
      }

      // 텍스트 노드만 교체 (닫기 버튼 보존)
      el.childNodes.forEach(n => { if (n.nodeType === 3) n.remove(); });
      el.insertBefore(document.createTextNode(_buildText(reasons)), el.firstChild);
      el.style.display = 'block';

      // 페이지 콘텐츠 밀어내기
      document.body.style.paddingTop = (parseInt(document.body.style.paddingTop || '0') + el.offsetHeight) + 'px';
    },

    hide() {
      const el = _getEl();
      if (!el) return;
      try { sessionStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /**/ }
      document.body.style.paddingTop = '0px';
      el.style.display = 'none';
    },

    update(reasons) {
      const el = _getEl();
      if (!el || el.style.display === 'none') {
        this.show(reasons);
        return;
      }
      el.childNodes.forEach(n => { if (n.nodeType === 3) n.remove(); });
      el.insertBefore(document.createTextNode(_buildText(reasons)), el.firstChild);
    },

    clear() {
      const el = _getEl();
      if (el) el.style.display = 'none';
      document.body.style.paddingTop = '0px';
    },
  };
})();
