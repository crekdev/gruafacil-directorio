/* GrúaFácil · JavaScript del sitio (sin dependencias).
   1) Eventos de los botones Llamar  2) Buscador de comuna  3) Menú  4) Planes y formulario
   5) Carga de fuente Sen y de Google Tag Manager sin bloquear el render. */
(function () {
  'use strict';

  var dataLayer = (window.dataLayer = window.dataLayer || []);

  /* 1) Botones Llamar. Cada botón tiene como id el nombre de la empresa (en minúsculas y con guiones).
        Al hacer clic se envía un evento a dataLayer. En Google Tag Manager puedes usar un activador
        "Clic - Solo vínculos" con la variable Click ID, o el evento personalizado "click_llamar". */
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('.btn-call') : null;
    if (!btn) return;
    dataLayer.push({
      event: 'click_llamar',
      empresa_id: btn.id,
      empresa: btn.getAttribute('data-empresa') || '',
      comuna: btn.getAttribute('data-comuna') || '',
      posicion: Number(btn.getAttribute('data-posicion')) || 0,
      telefono: (btn.getAttribute('href') || '').replace('tel:', ''),
    });
  });

  /* 2) Buscador de comuna en el inicio */
  var select = document.getElementById('comuna-select');
  var go = document.getElementById('comuna-go');
  function irAComuna() {
    if (select && select.value) window.location.href = select.value;
    else if (select) select.focus();
  }
  if (select && go) {
    go.addEventListener('click', irAComuna);
    select.addEventListener('change', irAComuna);
  }

  /* 3) Menú móvil: se cierra al elegir un enlace */
  var toggle = document.getElementById('nav-toggle');
  if (toggle) {
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { toggle.checked = false; });
    });
  }

  /* 4) Precios: los botones de plan eligen el plan en el formulario y se lee ?plan= de la URL */
  var planSelect = document.getElementById('f-plan');
  function elegirPlan(plan) {
    if (!planSelect || !plan) return;
    for (var i = 0; i < planSelect.options.length; i++) {
      if (planSelect.options[i].value === plan) {
        planSelect.selectedIndex = i;
        break;
      }
    }
  }
  document.querySelectorAll('[data-plan]').forEach(function (el) {
    el.addEventListener('click', function () { elegirPlan(el.getAttribute('data-plan')); });
  });
  try {
    elegirPlan(new URLSearchParams(window.location.search).get('plan'));
  } catch (e) { /* navegador sin URLSearchParams */ }

  /* 5) Fuente Sen y Google Tag Manager, después de que la página cargó */
  function cargarFuente() {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Sen:wght@400;700;800&display=swap';
    document.head.appendChild(l);
  }
  function cargarGTM() {
    var id = document.body.getAttribute('data-gtm');
    if (!id || window.__gtmCargado) return;
    window.__gtmCargado = true;
    dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }
  function despuesDeCargar() {
    cargarFuente();
    var ejecutar = function () { cargarGTM(); };
    if ('requestIdleCallback' in window) window.requestIdleCallback(ejecutar, { timeout: 3000 });
    else setTimeout(ejecutar, 2000);
  }
  if (document.readyState === 'complete') despuesDeCargar();
  else window.addEventListener('load', despuesDeCargar);
})();
