/* TravelBuddy demo · todo simulado en el navegador (localStorage). */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
async function hash(t) { // Hash simple solo para la demo
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { return btoa(t); }
}

/* ---- Tema ---- */
const themeBtn = $('#themeBtn');
function paintTheme() { const d = document.documentElement.dataset.theme === 'dark'; themeBtn.setAttribute('aria-label', d ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'); }
themeBtn.onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.setItem('tb_theme', t); } catch (e) {} paintTheme(); };
paintTheme();

/* ---- Navegación landing / app ---- */
let user = null;
function showApp() { $('#landing').hidden = true; $('#app').hidden = false; user ? showDash() : ($('#auth').hidden = false, $('#dash').hidden = true); window.scrollTo(0, 0); }
$$('[data-open-app]').forEach(b => b.onclick = showApp);
$$('.top nav a, .logo').forEach(a => a.addEventListener('click', () => { $('#landing').hidden = false; $('#app').hidden = true; }));

/* ---- Registro / login ---- */
const users = () => store.get('tb_users', {});
const setErr = (f, n, m) => { const e = $(`[data-for=${n}]`, f); if (e) e.textContent = m || ''; };
$('#tabReg').onclick = () => tab(true); $('#tabLog').onclick = () => tab(false);
function tab(reg) {
  $('#tabReg').setAttribute('aria-selected', reg); $('#tabLog').setAttribute('aria-selected', !reg);
  $('#tabReg').tabIndex = reg ? 0 : -1; $('#tabLog').tabIndex = reg ? -1 : 0;
  $('#formReg').hidden = !reg; $('#formLog').hidden = reg;
}
$('#formReg').onsubmit = async e => {
  e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f)); let ok = true;
  const chk = (n, bad, m) => { setErr(f, n, bad ? m : ''); if (bad) ok = false; };
  chk('name', !d.name.trim(), 'Escribe tu nombre.');
  chk('email', !/^\S+@\S+\.\S+$/.test(d.email), 'Escribe un correo válido, como nombre@correo.com.');
  chk('pass', d.pass.length < 8, 'La contraseña necesita al menos 8 caracteres.');
  chk('pass2', d.pass !== d.pass2, 'Las contraseñas no coinciden.');
  if (ok && users()[d.email.toLowerCase()]) { setErr(f, 'email', 'Este correo ya tiene cuenta. Inicia sesión.'); ok = false; }
  if (!ok) { const first = $('.err:not(:empty)', f); first && first.previousElementSibling.querySelector('input').focus(); return; }
  const u = users(), key = d.email.toLowerCase();
  u[key] = { name: d.name.trim(), email: key, h: await hash(d.pass), tutorial: false, visited: [] };
  store.set('tb_users', u); store.set('tb_session', key); user = u[key]; showDash();
};
$('#formLog').onsubmit = async e => {
  e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f)), u = users()[d.email.toLowerCase()];
  if (!u || u.h !== await hash(d.pass)) return setErr(f, 'login', 'Correo o contraseña incorrectos. Revisa los datos o regístrate.');
  setErr(f, 'login', ''); store.set('tb_session', u.email); user = u; showDash();
};
const save = () => { const u = users(); u[user.email] = user; store.set('tb_users', u); };
$('#logout').onclick = () => { store.set('tb_session', null); user = null; $('#dash').hidden = true; $('#auth').hidden = false; };

/* ---- Panel principal ---- */
function showDash() {
  $('#auth').hidden = true; $('#dash').hidden = false; $('#hola').textContent = `Hola, ${user.name}`;
  $('#perfInfo').textContent = `${user.name} · ${user.email}`; renderSocial(); panel('guia');
  if (!user.tutorial) openTut();
}
$$('.menu button').forEach(b => b.onclick = () => panel(b.dataset.p));
function panel(p) { $$('.menu button').forEach(b => b.setAttribute('aria-selected', b.dataset.p === p)); $$('[data-panel]').forEach(x => x.hidden = x.dataset.panel !== p); }

/* ---- Tutorial (se muestra solo la primera vez) ---- */
const STEPS = [
  ['Guías de viaje', 'Te llevamos por el aeropuerto, hasta tu hotel y por la ciudad. Antes de salir, marca tu lista de requisitos.'],
  ['Tu vuelo', 'En Asistencia, escribe tu número de vuelo (prueba TB1234) y verás terminal, puerta, avión y estado.'],
  ['Itinerario con o sin IA', 'Genera un plan con la IA o añade tus propias actividades a mano.'],
  ['Seguimiento familiar', 'Tu familia ve en qué fase estás: facturación, seguridad, embarque o en vuelo. Ideal para menores y abuelos.'],
  ['Logros y mapa', 'Cada país que visites rellena tu mapa y desbloquea logros en Social.']
];
const tut = $('#tut'); let ti = 0;
function openTut() { ti = 0; drawTut(); if (!tut.open) tut.showModal(); }
function drawTut() {
  $('#tutT').textContent = STEPS[ti][0]; $('#tutP').textContent = STEPS[ti][1];
  $('#tutProg').textContent = `Paso ${ti + 1} de ${STEPS.length}`;
  $('#tutPrev').disabled = ti === 0; $('#tutNext').textContent = ti === STEPS.length - 1 ? 'Empezar' : 'Siguiente';
}
function seen() { if (user) { user.tutorial = true; save(); } }
function endTut() { if (tut.open) tut.close(); seen(); }
$('#tutNext').onclick = () => ti < STEPS.length - 1 ? (ti++, drawTut()) : endTut();
$('#tutPrev').onclick = () => { ti--; drawTut(); };
$('#tutSkip').onclick = endTut; tut.addEventListener('cancel', seen); // Esc cierra el diálogo
$('#tutAgain').onclick = openTut;

/* ---- Vuelo de demo ---- */
const STAGES = ['Facturación', 'Control de seguridad', 'Embarque', 'En vuelo', 'Aterrizaje'];
const FAMILY = ['Ya está en el aeropuerto y facturando.', 'Está pasando el control de seguridad.', 'Está embarcando. Puerta abierta.', 'Está en el aire. Todo en orden.', 'Ha aterrizado sano y salvo.'];
let timer, cur, stage;
$('#flightForm').onsubmit = e => {
  e.preventDefault(); const code = $('#flightNo').value.replace(/\s/g, '').toUpperCase(), f = FLIGHTS[code]; clearInterval(timer);
  if (!f) { $('#flightOut').hidden = true; $('#flightErr').textContent = `No encontramos el vuelo "${$('#flightNo').value}". Prueba con ${Object.keys(FLIGHTS).join(' o ')}.`; return; }
  $('#flightErr').textContent = ''; cur = f; stage = f.stage; $('#flightOut').hidden = false;
  $('#ficha').innerHTML = [['Vuelo', code], ['Aerolínea', f.airline], ['Origen', f.from], ['Destino', f.to], ['Salida', f.dep], ['Llegada', f.arr], ['Terminal', f.terminal], ['Puerta', f.gate], ['Avión', f.plane], ['Estado', f.status]].map(([k, v]) => `<div><b>${k}</b>${v}</div>`).join('');
  $('#itin').innerHTML = ''; drawTimeline();
  timer = setInterval(() => { if (stage < STAGES.length - 1) { stage++; drawTimeline(); } else { clearInterval(timer); visit(f.country); } }, 4000);
};
function drawTimeline() {
  $('#timeline').innerHTML = STAGES.map((s, i) => `<li class="${i < stage ? 'done' : i === stage ? 'now' : ''}">${s}</li>`).join('');
  $('#family').textContent = `Mensaje para tu familia: ${FAMILY[stage]}`;
}
$('#aiBtn').onclick = () => { const c = cur.to.split(' ')[0]; ['Dejar la maleta en el hotel', `Paseo por el centro de ${c}`, 'Cena de bienvenida con cocina local'].forEach(addItin); };
$('#itinForm').onsubmit = e => { e.preventDefault(); const v = $('#itinIn').value.trim(); if (v) addItin(v); $('#itinIn').value = ''; };
function addItin(t) { const li = document.createElement('li'); li.textContent = t; $('#itin').append(li); }

/* ---- Social: logros y mapa ---- */
const COUNTRIES = ['España', 'Francia', 'Portugal', 'Italia', 'Japón', 'México', 'Marruecos', 'Canadá'];
function visit(c) { if (user && !user.visited.includes(c)) { user.visited.push(c); save(); renderSocial(); } }
function renderSocial() {
  $('#myMap').innerHTML = COUNTRIES.map(c => `<li class="${user.visited.includes(c) ? 'on' : ''}">${c}</li>`).join('');
  const n = user.visited.length;
  $('#ach').innerHTML = [['Cuenta creada', true], ['Primer despegue: completa un seguimiento de vuelo', n >= 1], ['Doble destino: visita 2 países', n >= 2]].map(([t, ok]) => `<li>${ok ? '🏅' : '🔒'} ${t}</li>`).join('');
}

/* ---- Arranque: recuperar sesión ---- */
const s = store.get('tb_session', null); if (s && users()[s]) user = users()[s];
