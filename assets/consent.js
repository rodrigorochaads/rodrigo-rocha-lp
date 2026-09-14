/*
 * Consentimento de cookies (LGPD) do rodrigorochaads.com.br
 *
 * Como funciona:
 * - Cada pagina define o gtag com consent 'denied' por padrao (Consent Mode v2)
 *   ANTES de carregar o gtag.js. Sem aceite, o GA4 so manda ping sem cookie,
 *   que o Google usa pra modelar o trafego nao consentido.
 * - Meta Pixel e Microsoft Clarity so sao carregados depois do aceite.
 * - A escolha fica em localStorage por 12 meses. Depois disso, pergunta de novo.
 * - O link "Preferencias de cookies" no rodape reabre o aviso a qualquer momento.
 */
(function () {
  'use strict';

  var KEY = 'rr_consent';
  var KEY_TS = 'rr_consent_ts';
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
  var PIXEL_ID = '921979810687389';
  var CLARITY_ID = 'xxmuyafj16';
  var POLICY_URL = '/politica-de-privacidade.html';

  var carregado = { pixel: false, clarity: false };
  var banner = null;

  function lerEscolha() {
    try {
      var status = localStorage.getItem(KEY);
      var ts = parseInt(localStorage.getItem(KEY_TS), 10) || 0;
      if (status !== 'granted' && status !== 'denied') return null;
      if (Date.now() - ts > MAX_AGE_MS) return null;
      return status;
    } catch (e) {
      return null;
    }
  }

  function gravarEscolha(status) {
    try {
      localStorage.setItem(KEY, status);
      localStorage.setItem(KEY_TS, String(Date.now()));
    } catch (e) {}
  }

  function atualizarGoogle(status) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
      ad_storage: status,
      ad_user_data: status,
      ad_personalization: status,
      analytics_storage: status
    });
  }

  function carregarPixel() {
    if (carregado.pixel) return;
    carregado.pixel = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function carregarClarity() {
    if (carregado.clarity) return;
    carregado.clarity = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }

  function apagarCookiesDeRastreio() {
    var nomes = document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); });
    var dominios = ['', location.hostname, '.' + location.hostname.replace(/^www\./, '')];
    nomes.forEach(function (nome) {
      if (!/^(_ga|_gid|_gat|_gcl|_fbp|_fbc|_clck|_clsk|CLID|ANONCHK|MUID|SM)/.test(nome)) return;
      dominios.forEach(function (d) {
        document.cookie = nome + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function aceitar() {
    var anterior = lerEscolha();
    gravarEscolha('granted');
    atualizarGoogle('granted');
    carregarPixel();
    carregarClarity();
    registrarEscolha('aceitar');
    fechar();
    if (anterior === 'denied') location.reload();
  }

  function recusar() {
    var anterior = lerEscolha();
    gravarEscolha('denied');
    atualizarGoogle('denied');
    registrarEscolha('recusar');
    fechar();
    // Se algo ja tinha carregado nesta pagina, so o reload garante que pare.
    if (anterior === 'granted' || carregado.pixel || carregado.clarity) {
      apagarCookiesDeRastreio();
      location.reload();
    }
  }

  function registrarEscolha(escolha) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'cookie_consent', { escolha: escolha });
    }
  }

  var CSS = [
    '.rr-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:60;box-sizing:border-box;',
    'background:#111110;border:1px solid rgba(201,168,76,.32);border-radius:12px;padding:18px 20px;',
    'box-shadow:0 12px 40px rgba(0,0,0,.65);font-family:Inter,system-ui,-apple-system,sans-serif;color:#F0EDE8;',
    'display:flex;flex-direction:column;gap:14px;opacity:0;transform:translateY(12px);',
    'visibility:hidden;pointer-events:none;',
    'transition:opacity .25s ease,transform .25s ease,visibility 0s linear .25s}',
    '.rr-consent.is-visible{opacity:1;transform:none;visibility:visible;pointer-events:auto;transition-delay:0s}',
    '.rr-consent-text{margin:0;font-size:14px;line-height:1.55;color:#C9C4BC}',
    '.rr-consent-text strong{color:#F0EDE8;font-weight:600}',
    '.rr-consent-text a{color:#C9A84C;text-decoration:underline;text-underline-offset:3px}',
    '.rr-consent-actions{display:flex;gap:10px}',
    '.rr-consent-btn{flex:1;height:44px;border-radius:8px;font:600 14px Inter,system-ui,sans-serif;cursor:pointer;letter-spacing:.01em}',
    '.rr-consent-btn--primary{background:#C9A84C;color:#0A0A0A;border:1px solid #C9A84C}',
    '.rr-consent-btn--primary:hover{background:#D9BC6A;border-color:#D9BC6A}',
    '.rr-consent-btn--ghost{background:transparent;color:#F0EDE8;border:1px solid rgba(240,237,232,.28)}',
    '.rr-consent-btn--ghost:hover{border-color:rgba(240,237,232,.6)}',
    '.rr-consent-btn:focus-visible{outline:2px solid #C9A84C;outline-offset:2px}',
    '@media(min-width:769px){.rr-consent{left:24px;right:auto;bottom:24px;max-width:440px}',
    '.rr-consent-btn{flex:0 0 auto;padding:0 22px}}',
    'html.rr-consent-open .sticky-cta{bottom:calc(var(--rr-consent-h,0px) + 28px)}',
    '@media(prefers-reduced-motion:reduce){.rr-consent{transition:none}}',
    '.rr-consent-link{background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;',
    'text-decoration:underline;text-underline-offset:3px;cursor:pointer}',
    '.rr-consent-link:hover{color:#C9A84C}',
    '.rr-consent-link:focus-visible{outline:2px solid #C9A84C;outline-offset:2px}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  function montar() {
    if (banner) return banner;
    banner = document.createElement('div');
    banner.className = 'rr-consent';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.innerHTML =
      '<p class="rr-consent-text"><strong>Este site usa cookies.</strong> Servem pra eu entender como o site é usado e medir os meus anúncios. Você decide. ' +
      '<a href="' + POLICY_URL + '">Política de privacidade</a></p>' +
      '<div class="rr-consent-actions">' +
      '<button type="button" class="rr-consent-btn rr-consent-btn--ghost" data-rr-consent="deny">Recusar</button>' +
      '<button type="button" class="rr-consent-btn rr-consent-btn--primary" data-rr-consent="grant">Aceitar</button>' +
      '</div>';
    document.body.appendChild(banner);
    return banner;
  }

  function medir() {
    if (!banner) return;
    document.documentElement.style.setProperty('--rr-consent-h', banner.getBoundingClientRect().height + 'px');
  }

  function abrir() {
    montar();
    document.documentElement.classList.add('rr-consent-open');
    requestAnimationFrame(function () {
      banner.classList.add('is-visible');
      medir();
    });
  }

  function fechar() {
    if (!banner) return;
    banner.classList.remove('is-visible');
    document.documentElement.classList.remove('rr-consent-open');
  }

  document.addEventListener('click', function (ev) {
    var alvo = ev.target.closest('[data-rr-consent]');
    if (!alvo) return;
    var acao = alvo.getAttribute('data-rr-consent');
    if (acao === 'grant') { ev.preventDefault(); aceitar(); }
    else if (acao === 'deny') { ev.preventDefault(); recusar(); }
    else if (acao === 'open') { ev.preventDefault(); abrir(); }
  });

  window.addEventListener('resize', medir);

  window.rrConsent = { abrir: abrir, aceitar: aceitar, recusar: recusar, status: lerEscolha };

  var escolha = lerEscolha();
  if (escolha === 'granted') {
    atualizarGoogle('granted');
    carregarPixel();
    carregarClarity();
  } else if (escolha === null) {
    setTimeout(abrir, 400);
  }
})();
