/*
 * Consentimento de cookies (LGPD) do rodrigorochaads.com.br
 *
 * Modo basico: NENHUMA ferramenta de terceiros (Google Analytics, Meta Pixel,
 * Microsoft Clarity) e carregada antes do visitante aceitar. Sem aceite, nada
 * sai do navegador.
 *
 * Duas categorias, escolhidas em separado ou juntas:
 * - estatisticas: Google Analytics 4 + Microsoft Clarity
 * - anuncios:     Meta Pixel (e os sinais de anuncio do Google no GA4)
 *
 * A escolha fica em localStorage por 12 meses, com numero de versao. Se a
 * politica mudar de forma relevante, sobe CONSENT_VERSION e o aviso reaparece.
 * O botao "Preferencias de cookies" no rodape reabre o aviso a qualquer momento.
 */
(function () {
  'use strict';

  var CONSENT_VERSION = 2;
  var KEY = 'rr_consent';
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
  var GA4_ID = 'G-6JZ4C1X5NQ';
  var PIXEL_ID = '921979810687389';
  var CLARITY_ID = 'xxmuyafj16';
  var POLICY_URL = '/politica-de-privacidade.html';

  var carregado = { ga4: false, pixel: false, clarity: false };
  var banner = null;

  function lerEscolha() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || obj.v !== CONSENT_VERSION) return null;
      if (Date.now() - (obj.ts || 0) > MAX_AGE_MS) return null;
      return { estatisticas: !!obj.estatisticas, anuncios: !!obj.anuncios };
    } catch (e) {
      return null;
    }
  }

  function gravarEscolha(escolha) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        v: CONSENT_VERSION,
        estatisticas: !!escolha.estatisticas,
        anuncios: !!escolha.anuncios,
        ts: Date.now()
      }));
    } catch (e) {}
  }

  function sinal(b) { return b ? 'granted' : 'denied'; }

  function carregarGA4(escolha) {
    if (carregado.ga4) {
      window.gtag('consent', 'update', {
        ad_storage: sinal(escolha.anuncios),
        ad_user_data: sinal(escolha.anuncios),
        ad_personalization: sinal(escolha.anuncios)
      });
      return;
    }
    carregado.ga4 = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: sinal(escolha.anuncios),
      ad_user_data: sinal(escolha.anuncios),
      ad_personalization: sinal(escolha.anuncios)
    });
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
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

  function aplicar(escolha) {
    if (escolha.estatisticas) {
      carregarGA4(escolha);
      carregarClarity();
    }
    if (escolha.anuncios) carregarPixel();
  }

  var COOKIES = {
    estatisticas: /^(_ga|_gid|_gat|_clck|_clsk|CLID|ANONCHK|MUID|SM|MR)/,
    anuncios: /^(_fbp|_fbc|_gcl)/
  };

  // Apaga os cookies das categorias NAO permitidas. Roda ao retirar permissao e
  // em toda carga de pagina: o GA4 regrava _ga_* ao descarregar a pagina, e
  // quem visitou antes do aviso existir ainda carrega cookies antigos.
  function apagarCookiesNaoPermitidos(escolha) {
    var nomes = document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); });
    var dominios = ['', location.hostname, '.' + location.hostname.replace(/^www\./, '')];
    nomes.forEach(function (nome) {
      var bloqueado = Object.keys(COOKIES).some(function (cat) {
        return !(escolha && escolha[cat]) && COOKIES[cat].test(nome);
      });
      if (!bloqueado) return;
      dominios.forEach(function (d) {
        document.cookie = nome + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function registrarEscolha(escolha) {
    if (escolha.estatisticas && typeof window.gtag === 'function') {
      window.gtag('event', 'cookie_consent', {
        estatisticas: 'sim',
        anuncios: escolha.anuncios ? 'sim' : 'nao',
        versao_aviso: CONSENT_VERSION
      });
    }
  }

  function decidir(escolha) {
    var anterior = lerEscolha() || { estatisticas: false, anuncios: false };
    var reduziu = (anterior.estatisticas && !escolha.estatisticas) || (anterior.anuncios && !escolha.anuncios);
    var jaCarregouAlgo = carregado.ga4 || carregado.pixel || carregado.clarity;

    gravarEscolha(escolha);
    fechar();

    // Tirar permissao de algo que ja rodou nesta pagina so e garantido com reload.
    if (reduziu || (jaCarregouAlgo && !(escolha.estatisticas && escolha.anuncios))) {
      apagarCookiesNaoPermitidos(escolha);
      location.reload();
      return;
    }
    aplicar(escolha);
    registrarEscolha(escolha);
  }

  var CSS = [
    '.rr-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:60;box-sizing:border-box;',
    'background:#111110;border:1px solid rgba(201,168,76,.32);border-radius:12px;padding:14px 16px;',
    'box-shadow:0 12px 40px rgba(0,0,0,.65);font-family:Inter,system-ui,-apple-system,sans-serif;color:#F0EDE8;',
    'display:flex;flex-direction:column;gap:12px;opacity:0;transform:translateY(12px);',
    'visibility:hidden;pointer-events:none;',
    'transition:opacity .25s ease,transform .25s ease,visibility 0s linear .25s}',
    '.rr-consent.is-visible{opacity:1;transform:none;visibility:visible;pointer-events:auto;transition-delay:0s}',
    '.rr-consent-text{margin:0;font-size:13px;line-height:1.5;color:#C9C4BC}',
    '.rr-consent-text strong{color:#F0EDE8;font-weight:600}',
    '.rr-consent-text a{color:#C9A84C;text-decoration:underline;text-underline-offset:3px}',
    '.rr-consent-actions{display:flex;gap:10px;flex-wrap:wrap}',
    '.rr-consent-btn{flex:1;min-width:110px;height:40px;border-radius:8px;font:600 14px Inter,system-ui,sans-serif;',
    'cursor:pointer;letter-spacing:.01em;background:transparent;color:#F0EDE8;border:1px solid #C9A84C;transition:background .15s,color .15s}',
    '.rr-consent-btn:hover{background:#C9A84C;color:#0A0A0A}',
    '.rr-consent-btn:focus-visible{outline:2px solid #C9A84C;outline-offset:2px}',
    '.rr-consent-more{background:none;border:0;padding:0;margin:0;font:inherit;display:inline;',
    'color:#C9C4BC;text-decoration:underline;text-underline-offset:3px;cursor:pointer}',
    '.rr-consent-more:hover{color:#C9A84C}',
    '.rr-consent-cats{display:none;flex-direction:column;gap:10px;padding-top:4px;border-top:1px solid rgba(240,237,232,.12)}',
    '.rr-consent.is-open .rr-consent-cats{display:flex}',
    '.rr-consent.is-open .rr-consent-more,.rr-consent.is-open .rr-consent-sep{display:none}',
    '.rr-consent-cat{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:#C9C4BC;cursor:pointer}',
    '.rr-consent-cat input{margin:3px 0 0;width:16px;height:16px;flex:0 0 16px;accent-color:#C9A84C;cursor:pointer}',
    '.rr-consent-cat strong{color:#F0EDE8;font-weight:600}',
    '@media(min-width:769px){.rr-consent{left:24px;right:auto;bottom:24px;max-width:460px}',
    '.rr-consent-btn{flex:0 0 auto;padding:0 22px;min-width:0}}',
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
      '<p class="rr-consent-text"><strong>Cookies:</strong> uso pra medir o site e meus anúncios, com Google, Meta e Microsoft (inclusive fora do Brasil). ' +
      'Nada roda antes da sua escolha. <a href="' + POLICY_URL + '">Política de privacidade</a><span class="rr-consent-sep"> · </span>' +
      '<button type="button" class="rr-consent-more" data-rr-consent="more">Escolher por categoria</button></p>' +
      '<div class="rr-consent-cats">' +
      '<label class="rr-consent-cat"><input type="checkbox" data-rr-cat="estatisticas"><span><strong>Estatísticas</strong> (Google Analytics e Microsoft Clarity): quais páginas são lidas e como.</span></label>' +
      '<label class="rr-consent-cat"><input type="checkbox" data-rr-cat="anuncios"><span><strong>Anúncios</strong> (Meta Pixel e sinais de anúncio do Google): medir campanhas e mostrar meus anúncios a quem visitou o site.</span></label>' +
      '</div>' +
      '<div class="rr-consent-actions">' +
      '<button type="button" class="rr-consent-btn" data-rr-consent="deny">Recusar</button>' +
      '<button type="button" class="rr-consent-btn" data-rr-consent="grant">Aceitar</button>' +
      '<button type="button" class="rr-consent-btn" data-rr-consent="save" hidden>Salvar escolha</button>' +
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
    var atual = lerEscolha();
    banner.querySelectorAll('[data-rr-cat]').forEach(function (cb) {
      cb.checked = !!(atual && atual[cb.getAttribute('data-rr-cat')]);
    });
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

  function expandir() {
    banner.classList.add('is-open');
    banner.querySelector('[data-rr-consent="save"]').hidden = false;
    banner.querySelector('[data-rr-consent="grant"]').textContent = 'Aceitar todos';
    banner.querySelector('[data-rr-consent="deny"]').textContent = 'Recusar todos';
    medir();
  }

  function lerCheckboxes() {
    var e = { estatisticas: false, anuncios: false };
    banner.querySelectorAll('[data-rr-cat]').forEach(function (cb) {
      e[cb.getAttribute('data-rr-cat')] = cb.checked;
    });
    return e;
  }

  document.addEventListener('click', function (ev) {
    var alvo = ev.target.closest('[data-rr-consent]');
    if (!alvo) return;
    var acao = alvo.getAttribute('data-rr-consent');
    if (acao === 'grant') { ev.preventDefault(); decidir({ estatisticas: true, anuncios: true }); }
    else if (acao === 'deny') { ev.preventDefault(); decidir({ estatisticas: false, anuncios: false }); }
    else if (acao === 'save') { ev.preventDefault(); decidir(lerCheckboxes()); }
    else if (acao === 'more') { ev.preventDefault(); expandir(); }
    else if (acao === 'open') { ev.preventDefault(); abrir(); }
  });

  window.addEventListener('resize', medir);

  window.rrConsent = { abrir: abrir, status: lerEscolha };

  var escolha = lerEscolha();
  apagarCookiesNaoPermitidos(escolha);
  if (escolha) {
    aplicar(escolha);
  } else {
    setTimeout(abrir, 400);
  }
})();
