/* Apuntan Alto — comportamiento. Todo se calcula en el navegador; no se envía ningún dato. */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var num1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function val(el, min, max, def) {
    var v = parseFloat(String(el.value).replace(',', '.'));
    if (!isFinite(v)) v = def;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  }
  function needed(x) { return x / (100 - x) * 100; }

  /* Preferencias de cookies (gestor de consentimiento de Google, si está activo) */
  $$('[data-cookie-prefs]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (window.googlefc && typeof window.googlefc.showRevocationMessage === 'function') {
        e.preventDefault();
        window.googlefc.showRevocationMessage();
      }
    });
  });

  /* Barra de progreso de lectura */
  var pg = $('.progreso');
  if (pg) {
    var busy = false;
    var upd = function () {
      var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      pg.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, h.scrollTop / max) : 0) + ')';
      busy = false;
    };
    window.addEventListener('scroll', function () { if (!busy) { busy = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* Índice con sección activa */
  var toc = $$('.toc a');
  if (toc.length && 'IntersectionObserver' in window) {
    var map = {};
    toc.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          toc.forEach(function (a) { a.removeAttribute('aria-current'); });
          var a = map[en.target.id];
          if (a) a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    $$('.prose > h2[id]').forEach(function (h) { io.observe(h); });
  }

  /* Perfil de ascenso (portada) */
  var perfil = $('#perfil');
  if (perfil) {
    var slider = $('#caida', perfil), texto = $('#perfil-texto', perfil), svg = $('#perfil-svg', perfil);
    var A = { x: 70, y: 60 }, C = { x: 930, y: 60 }, Bx = 470, base = 312;
    var yOf = function (x) { return 60 + (x / 100) * 230; };
    var cur = +slider.value;
    var el = {
      down: $('#p-baja', svg), up: $('#p-sube', svg), fill: $('#p-relleno', svg),
      b: $('#p-b', svg), tb: $('#p-tb', svg), tc: $('#p-tc', svg)
    };
    var draw = function (x) {
      var yB = yOf(x), n = needed(x);
      el.down.setAttribute('d', 'M' + A.x + ' ' + A.y + ' L' + Bx + ' ' + yB);
      el.up.setAttribute('d', 'M' + Bx + ' ' + yB + ' L' + C.x + ' ' + C.y);
      el.fill.setAttribute('d', 'M' + A.x + ' ' + A.y + ' L' + Bx + ' ' + yB + ' L' + C.x + ' ' + C.y + ' L' + C.x + ' ' + base + ' L' + A.x + ' ' + base + ' Z');
      el.b.setAttribute('cy', yB);
      el.tb.setAttribute('y', yB + 44);
      el.tb.textContent = 'Caída del ' + num1.format(x) + ' %';
      el.tc.textContent = 'Para volver: +' + num1.format(n) + ' %';
    };
    var say = function (x) {
      var n = needed(x);
      texto.innerHTML = 'Si una criptomoneda pierde el <strong>' + num1.format(x) + ' %</strong> de su valor, tiene que subir un <strong>' + num1.format(n) + ' %</strong> para volver al punto de partida.' +
        '<small>Las pérdidas y las ganancias no se compensan de forma simétrica. Por eso una caída pesa más de lo que parece.</small>';
      svg.setAttribute('aria-label', 'Gráfico: una caída del ' + num1.format(x) + ' % exige una subida del ' + num1.format(n) + ' % para recuperarse.');
    };
    var tween = function (to) {
      var from = cur, t0 = null, dur = reduce ? 1 : 260;
      var step = function (t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        cur = from + (to - from) * e;
        draw(cur);
        if (k < 1) requestAnimationFrame(step); else cur = to;
      };
      requestAnimationFrame(step);
    };
    draw(cur); say(cur);
    slider.addEventListener('input', function () { var x = +slider.value; say(x); tween(x); });
  }

  /* Herramienta A: caída y recuperación */
  var A1 = $('#calc-caida');
  if (A1) {
    var caidaN = $('#a-caida'), caidaR = $('#a-caida-r'), inv = $('#a-inv');
    var tbody = $('#a-tabla');
    [10, 20, 30, 40, 50, 60, 70, 80, 90].forEach(function (p) {
      var tr = document.createElement('tr');
      tr.dataset.p = p;
      tr.innerHTML = '<td>' + p + ' %</td><td>+' + num1.format(needed(p)) + ' %</td>';
      tbody.appendChild(tr);
    });
    var calcA = function (src) {
      var c = val(src === 'r' ? caidaR : caidaN, 1, 99, 50);
      if (src === 'r') caidaN.value = c; else caidaR.value = c;
      var i = val(inv, 0, 1e9, 0), n = needed(c), resto = i * (1 - c / 100);
      $('#a-sube').textContent = '+' + num1.format(n) + ' %';
      $('#a-valor').textContent = eur.format(resto);
      $('#a-perdida').textContent = eur.format(i - resto);
      $('#a-ganar').textContent = eur.format(i - resto);
      $('#a-frase').textContent = 'Con ' + eur.format(i) + ' invertidos, una caída del ' + num1.format(c) + ' % los deja en ' + eur.format(resto) + '. Para recuperar lo perdido, ese saldo debe subir un ' + num1.format(n) + ' %.';
      var best = null, bd = 1e9;
      $$('tr', tbody).forEach(function (tr) { tr.classList.remove('on'); var d = Math.abs(+tr.dataset.p - c); if (d < bd) { bd = d; best = tr; } });
      if (best) best.classList.add('on');
    };
    caidaN.addEventListener('input', function () { calcA('n'); });
    caidaR.addEventListener('input', function () { calcA('r'); });
    inv.addEventListener('input', function () { calcA('n'); });
    calcA('n');
  }

  /* Herramienta B: impacto en el patrimonio */
  var B1 = $('#calc-patrimonio');
  if (B1) {
    var pat = $('#b-pat'), pct = $('#b-pct'), cai = $('#b-caida');
    var calcB = function () {
      var p = val(pat, 0, 1e10, 0), q = val(pct, 0, 100, 0), c = val(cai, 1, 99, 50);
      var cripto = p * q / 100, perdida = cripto * c / 100, imp = p > 0 ? perdida / p * 100 : 0;
      $('#b-pct-v').textContent = num1.format(q) + ' %';
      $('#b-caida-v').textContent = num1.format(c) + ' %';
      $('#b-en-cripto').textContent = eur.format(cripto);
      $('#b-perdida').textContent = eur.format(perdida);
      $('#b-despues').textContent = eur.format(p - perdida);
      $('#b-imp').textContent = num1.format(imp) + ' %';
      $('#b-ok').style.width = (100 - imp) + '%';
      $('#b-per').style.width = imp + '%';
      $('#b-frase').textContent = 'Con este reparto, una caída del ' + num1.format(c) + ' % en tus criptomonedas supondría perder ' + num1.format(imp) + ' % de tu patrimonio total. Pregúntate si podrías asumirlo sin cambiar tus planes.';
    };
    [pat, pct, cai].forEach(function (e) { e.addEventListener('input', calcB); });
    calcB();
  }
})();
