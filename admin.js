const C = window.G7 || {};
const $ = s => document.querySelector(s);
const msg = t => $('#m').textContent = t || '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let TK = sessionStorage.g7t || '';
let ME = JSON.parse(sessionStorage.g7m || 'null');
const bye = () => { sessionStorage.clear(); location.reload(); };

async function fn(name, body) {
  if (!C.url) throw Error('Renseignez config.js (URL et clé anon).');
  const r = await fetch(C.url + '/functions/v1/' + name, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: C.key, Authorization: 'Bearer ' + C.key },
    body: JSON.stringify({ ...body, token: TK })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status == 401 && body.action != 'login') bye();
    throw Error(j.error || 'Erreur réseau ou serveur.');
  }
  return j;
}

const api = (action, data) => fn('admin', { action, data });
const run = async f => { try { msg('…'); await f(); } catch(e) { msg(e.message); } };

$('#go').onclick = () => run(async () => {
  const r = await fn('admin', { action: 'login', name: $('#nm').value, code: $('#cd').value });
  TK = r.token; ME = { name: r.name, role: r.role };
  sessionStorage.g7t = TK; sessionStorage.g7m = JSON.stringify(ME);
  boot();
});

$('#su').onclick = () => run(async () => {
  await fn('admin', { action: 'setup', name: $('#nm').value, code: $('#cd').value });
  msg('Propriétaire créé. Cliquez sur Entrer.');
});

$('#cd').onkeydown = e => { if (e.key == 'Enter') $('#go').click(); };

const TABS = [
  ['Tableau de bord', dash],
  ['Réservations', resv2],
  ['Calendrier', cal],
  ['Messages', msgs],
  ['Galeries', gal],
  ['Commandes', cmd],
  ['Médias', () => G7Medias.render({ fn, api, msg, run, esc, $, C, ME })],
  ['Contenu', cont, 1],
  ['Site', site, 1],
  ['Boutique', boutique, 1],
  ['Équipe', team, 1],
  ['Journal', jour, 1],
  ['Aide connexion', aide, 1],
  ['RGPD', rgpd, 1],
  ['Sauvegardes', sauv, 1],
  ['Sécurité', sec]
];

function boot() {
  $('#lo').hidden = true;
  $('#ap').hidden = false;
  msg();
  $('#me').textContent = ME.name + ' · ' + (ME.role == 'owner' ? 'propriétaire' : 'assistant');
  const T = TABS.filter(t => !t[2] || ME.role == 'owner');
  $('#tb').innerHTML = T.map((t, i) => '<button class="g" data-i="' + i + '">' + t[0] + '</button>').join('') + '<button class="g" id="lx">Déconnexion</button>';
  $('#tb').onclick = e => {
    const i = e.target.dataset.i;
    if (i != null) {
      [...$('#tb').children].forEach(b => b.classList.toggle('on', b.dataset.i == i));
      msg();
      run(() => T[i][1]());
    }
  };
  $('#lx').onclick = bye;
  run(dash);
}

// Aide à la connexion : code à usage unique, visible uniquement par le propriétaire
async function aide() {
  msg();
  $('#v').innerHTML = '<h2>Aide à la connexion</h2><div class="c"><p style="color:var(--mu)">Pour un client qui ne reçoit pas son code par e-mail. Vérifiez d\'abord son identité (par exemple par WhatsApp), générez un code, puis envoyez-le-lui vous-même. Le code est valable environ 1 heure, n\'est enregistré nulle part et chaque génération est inscrite au journal.</p><label for="ae">E-mail du client</label><input id="ae" type="email"><label for="aw">WhatsApp du client (facultatif, avec indicatif)</label><input id="aw" type="tel"><button id="ag">Générer le code</button><div id="ar"></div></div>';
  $('#ag').onclick = () => run(async () => {
    const email = $('#ae').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw Error('Adresse e-mail invalide.');
    const r = await api('assist_code', { email });
    const text = 'Votre code de connexion G7 Media : ' + r.code + ' (valable environ 1 heure, à ne partager avec personne).';
    const ph = $('#aw').value.replace(/\D/g, '');
    $('#ar').innerHTML = '<p style="font:700 2rem Georgia,serif;margin:1rem 0">' + esc(r.code) + '</p><button class="g" id="ac">Copier le message</button> ' + (ph ? '<a href="https://wa.me/' + ph + '?text=' + encodeURIComponent(text) + '" target="_blank" rel="noopener"><button class="g">Ouvrir WhatsApp</button></a>' : '');
    $('#ac').onclick = () => navigator.clipboard.writeText(text).then(() => msg('Message copié.'), () => msg('Copie impossible : recopiez le code à la main.'));
    msg('Code généré pour ' + email + '.');
  });
}

async function dash() {
  const d = await api('dashboard');
  msg();
  $('#v').innerHTML = '<h2>Tableau de bord</h2><div class="k"><div class="c"><b>' + d.nouveau + '</b>nouvelle(s) demande(s)</div><div class="c"><b>' + d.paiements + '</b>paiement(s) en attente</div><div class="c"><b>' + d.messages + '</b>message(s) non lu(s)</div></div>';
}

const ST = ['nouveau', 'devis', 'acompte_attendu', 'confirme', 'termine', 'annule'];
const CAT = { mariage: 'Mariage', bapteme: 'Baptême et famille', portrait: 'Portrait', evenement: 'Événement', studio: 'Studio' };

async function resv() {
  const R = await api('list_reservations');
  msg();
  $('#v').innerHTML = '<button class="g" id="ex">Exporter en CSV</button><h2>' + R.length + ' demande(s)</h2>' + (R.length ? R.map(r => '<div class="c"><b>' + esc(r.clients?.name || r.clients?.email) + '</b> · ' + esc(CAT[r.category] || r.category || '') + ' · ' + esc(r.event_date || 'date libre') + '<br><a href="mailto:' + esc(r.clients?.email) + '">' + esc(r.clients?.email) + '</a>' + (r.clients?.phone ? ' · <a href="https://wa.me/' + esc(r.clients.phone.replace(/\D/g, '')) + '">' + esc(r.clients.phone) + '</a>' : '') + '<p>' + esc(r.message || '') + '</p><select data-s="' + r.id + '">' + ST.map(s => '<option ' + (s == r.status ? 'selected' : '') + '>' + s + '</option>').join('') + '</select>' + (ME.role == 'owner' ? ' <button class="g" data-d="' + r.id + '">Supprimer</button>' : '') + '</div>').join('') : '<p>Aucune demande pour le moment.</p>');
  $('#v').onchange = e => { if (e.target.dataset.s) run(async () => { await api('set_status', { id: +e.target.dataset.s, status: e.target.value }); msg('Statut enregistré.'); }); };
  $('#v').onclick = e => { const d = e.target.dataset.d; if (d && confirm('Supprimer cette demande ?')) run(async () => { await api('delete_reservation', { id: +d }); resv(); }); };
  $('#ex').onclick = () => { const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', c = ['date,nom,email,telephone,type,date_seance,statut,message', ...R.map(r => [r.created_at, r.clients?.name, r.clients?.email, r.clients?.phone, r.category, r.event_date, r.status, r.message].map(q).join(','))].join('\n'), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + c], { type: 'text/csv' })); a.download = 'reservations.csv'; a.click(); };
}

async function media() {
  $('#v').innerHTML = '<h2>Test d\'envoi depuis votre appareil</h2><div class="c"><p style="color:var(--mu)">Vérifie la chaîne d\'envoi sécurisée (lot 2 : import complet avec compression).</p><input id="fi" type="file" accept="image/webp,image/jpeg,image/png" multiple><button id="up">Envoyer</button><div id="ul"></div></div>';
  $('#up').onclick = () => run(async () => {
    const F = [...$('#fi').files]; if (!F.length) throw Error('Choisissez au moins une image.');
    const sb = window.supabase.createClient(C.url, C.key), r = await fn('sign-upload', { bucket: 'photos', folder: 'tests', files: F.map(f => ({ type: f.type, size: f.size })) }); let ok = 0;
    for (let i = 0; i < F.length; i++) { const { error } = await sb.storage.from(r.bucket).uploadToSignedUrl(r.files[i].path, r.files[i].token, F[i], { contentType: F[i].type }); $('#ul').insertAdjacentHTML('beforeend', '<p>' + esc(F[i].name) + ' : ' + (error ? 'échec (' + esc(error.message) + ')' : 'envoyé') + '</p>'); if (!error) ok++; }
    msg(ok + '/' + F.length + ' image(s) envoyée(s).');
  });
}

const FD = [['name', 'Nom du site'], ['slogan', 'Slogan'], ['heroTitle', 'Titre d\'accueil'], ['about', 'Texte À propos', 't'], ['whatsapp', 'WhatsApp avec indicatif (ex. 221761820406)'], ['wave','Numéro Wave pour les paiements'],['waveName','Nom du compte Wave (affiché au client)'], ['email', 'E-mail public'], ['instagram', 'Lien Instagram (https://…)'], ['banner', 'Bandeau d\'annonce (vide = masqué)'], ['bg', 'Couleur de fond', 'c'], ['ac', 'Couleur d\'accent', 'c'], ['font', 'Police des titres', 's']];

async function cont() {
  const a = await fetch(C.url + '/rest/v1/site_settings?key=eq.site&select=value', { headers: { apikey: C.key, Authorization: 'Bearer ' + C.key } }).then(r => r.json()), S = a[0]?.value || {}; msg();
  $('#v').innerHTML = '<h2>Contenu et design</h2><div class="c">' + FD.map(([k, l, t]) => { const v = esc(S[k] ?? (t == 'c' ? (k == 'bg' ? '#0A1530' : '#E5232E') : '')); return '<label for="f_' + k + '">' + l + '</label>' + (t == 't' ? '<textarea id="f_' + k + '" rows="4">' + v + '</textarea>' : t == 's' ? '<select id="f_' + k + '">' + ['Playfair Display', 'Cormorant Garamond', 'DM Serif Display'].map(f => '<option ' + (f == (S.font || 'Playfair Display') ? 'selected' : '') + '>' + f + '</option>').join('') + '</select>' : '<input id="f_' + k + '" type="' + (t == 'c' ? 'color' : 'text') + '" value="' + v + '">'); }).join('') + '<button id="sv">Enregistrer et publier</button></div>';
  $('#sv').onclick = () => run(async () => { const d = { ...S }; FD.forEach(([k]) => { const v = $('#f_' + k).value.trim(); if (v) d[k] = v; else delete d[k]; }); await api('save_settings', d); msg('Publié. Le site est à jour.'); });
}

async function team() {
  const L = await api('list_staff'); msg();
  $('#v').innerHTML = '<h2>Équipe</h2>' + L.map(s => '<div class="c">' + esc(s.name) + ' · ' + (s.role == 'owner' ? 'propriétaire' : 'assistant') + ' · ' + (s.active ? 'actif' : 'désactivé') + ' <button class="g" data-a="' + s.id + '" data-v="' + (s.active ? 0 : 1) + '">' + (s.active ? 'Désactiver' : 'Réactiver') + '</button></div>').join('') + '<h2>Ajouter un membre</h2><div class="c"><label for="sn">Nom</label><input id="sn"><label for="sr">Rôle</label><select id="sr"><option value="assistant">Assistant</option><option value="owner">Propriétaire</option></select><label for="sc">Code (12 caractères minimum)</label><input id="sc" type="password" autocomplete="new-password"><button id="sa">Créer</button></div>';
  $('#v').onclick = e => { const a = e.target.dataset.a; if (a) run(async () => { await api('set_staff_active', { id: a, active: e.target.dataset.v == '1' }); team(); }); };
  $('#sa').onclick = () => run(async () => { await api('create_staff', { name: $('#sn').value, role: $('#sr').value, code: $('#sc').value }); team(); });
}

async function jour() {
  const [A, L] = await Promise.all([api('audit'), api('login_log')]); msg(); const d = t => new Date(t).toLocaleString('fr-FR');
  $('#v').innerHTML = '<h2>Journal des actions</h2>' + (A.map(a => '<div class="c">' + d(a.at) + ' · ' + esc(a.action) + ' ' + esc(a.entity || '') + ' ' + esc(a.entity_id || '') + '</div>').join('') || '<p>Rien pour le moment.</p>') + '<h2>Connexions</h2>' + (L.map(l => '<div class="c">' + d(l.at) + ' · ' + (l.ok ? 'réussie' : 'refusée') + ' ' + esc(l.ip || '') + '</div>').join('') || '<p>Rien pour le moment.</p>');
}

function sec() {
  $('#v').innerHTML = '<h2>Sécurité</h2><div class="c"><label for="nc">Nouveau code (12 caractères minimum)</label><input id="nc" type="password" autocomplete="new-password"><button id="cc">Changer mon code</button>' + (ME.role == 'owner' ? ' <button class="g" id="la">Déconnecter toutes les sessions</button>' : '') + '</div>';
  $('#cc').onclick = () => run(async () => { await api('change_code', { code: $('#nc').value }); msg('Code changé. Reconnexion…'); setTimeout(bye, 1200); });
  if ($('#la')) $('#la').onclick = () => run(async () => { await api('logout_all'); bye(); });
}

if (TK && ME) boot();

let ST_T = 'packages';
const CF = {
  packages: { t: 'Formules', f: [['category', 'Catégorie (identifiant : mariage…)'], ['name_fr', 'Nom (FR)'], ['name_en', 'Nom (EN)'], ['details_fr', 'Détails (FR)', 't'], ['details_en', 'Détails (EN)', 't'], ['price_from', 'Prix à partir de (FCFA)', 'n'], ['position', 'Ordre (1, 2, 3…)', 'n'], ['active', 'Visible', 'b']] },
  testimonials: { t: 'Avis', f: [['author', 'Nom du client'], ['body', 'Avis', 't'], ['link', 'Lien (https://…, facultatif)'], ['position', 'Ordre', 'n'], ['published', 'Publié', 'b']] },
  menu_items: { t: 'Menu', f: [['label_fr', 'Libellé (FR)'], ['label_en', 'Libellé (EN)'], ['href', 'Lien (#tarifs, #/mariage, https://…)'], ['position', 'Ordre', 'n'], ['active', 'Visible', 'b']] },
  travel_fees: { t: 'Déplacement', f: [['zone', 'Zone (ex. Dakar centre)'], ['fee', 'Frais (FCFA)', 'n']] },
  announcements: { t: 'Annonces', f: [['text_fr', 'Texte (FR)'], ['text_en', 'Texte (EN)'], ['ends_at', 'Fin (date, facultatif)', 'd'], ['active', 'Active', 'b']] }
};

async function site() {
  const cf = CF[ST_T], rows = await api('content_list', { table: ST_T }); msg();
  const fm = r => cf.f.map(([k, l, t]) => { const v = r[k], id = ST_T + '_' + (r.id || 'n') + '_' + k; return t == 'b' ? '<label><input type="checkbox" data-k="' + k + '" style="width:auto" ' + (v === undefined || v ? 'checked' : '') + '> ' + l + '</label><br>' : '<label for="' + id + '">' + l + '</label>' + (t == 't' ? '<textarea id="' + id + '" data-k="' + k + '" rows="3">' + esc(v) + '</textarea>' : '<input id="' + id + '" data-k="' + k + '" data-t="' + (t || '') + '" type="' + (t == 'n' ? 'number' : t == 'd' ? 'date' : 'text') + '" value="' + esc(t == 'd' && v ? String(v).slice(0, 10) : v) + '">'); }).join('');
  $('#v').innerHTML = '<h2>Site</h2><nav>' + Object.keys(CF).map(k => '<button class="g ' + (k == ST_T ? 'on' : '') + '" data-tab="' + k + '">' + CF[k].t + '</button>').join('') + '</nav>' + rows.map(r => '<div class="c" data-r="' + r.id + '">' + fm(r) + '<button data-save>Enregistrer</button> <button class="g" data-del>Supprimer</button></div>').join('') + '<h2>Ajouter</h2><div class="c" data-r="">' + fm({}) + '<button data-save>Ajouter</button></div>';
  $('#v').onclick = e => {
    const d = e.target.dataset, b = e.target.closest('[data-r]'); if (d.tab) { ST_T = d.tab; run(site); }
    if (d.save != null) run(async () => { const row = {}; if (b.dataset.r) row.id = +b.dataset.r; b.querySelectorAll('[data-k]').forEach(i => { const k = i.dataset.k; row[k] = i.type == 'checkbox' ? i.checked : i.dataset.t == 'n' ? (i.value === '' ? null : +i.value) : i.dataset.t == 'd' ? (i.value ? i.value + 'T23:59:59Z' : null) : i.value; }); await api('content_save', { table: ST_T, row }); msg('Enregistré.'); site(); });
    if (d.del != null && confirm('Supprimer définitivement ?')) run(async () => { await api('content_delete', { table: ST_T, id: +b.dataset.r }); site(); });
  };
}

async function resv2() {
  const R = await api('list_reservations'), own = ME.role == 'owner'; msg(); const n = v => v ?? '';
  $('#v').innerHTML = '<button class="g" id="ex">Exporter en CSV</button><h2>' + R.length + ' demande(s)</h2>' + (R.map(r => { const c = r.clients || {}; return '<div class="c" data-r="' + r.id + '"><b>' + esc(c.name || c.email) + '</b> · ' + esc(CAT[r.category] || r.category || '') + ' · ' + esc(r.event_date || 'date libre') + ' ' + esc(r.slot || '') + '<br>' + esc(r.place || '') + '<br><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' + (c.phone ? ' · <a href="https://wa.me/' + esc(c.phone.replace(/\D/g, '')) + '">' + esc(c.phone) + '</a>' : '') + '<p>' + esc(r.message || '') + '</p>' + (r.client_photo_path ? '<button class="g" data-ph>Voir la photo</button> ' : '') + '<select data-k="status">' + ST.map(s => '<option ' + (s == r.status ? 'selected' : '') + '>' + s + '</option>').join('') + '</select>' + (own ? '<label>Devis (FCFA)</label><input data-k="quote" type="number" min="0" value="' + n(r.quote) + '"><label>Acompte (FCFA)</label><input data-k="deposit" type="number" min="0" value="' + n(r.deposit) + '"><label>Frais de déplacement (FCFA)</label><input data-k="travel_fee" type="number" min="0" value="' + n(r.travel_fee) + '">' : '') + ' <button data-save>Enregistrer</button> <button class="g" data-pdf>Fiche PDF</button>' + (own ? ' <button class="g" data-del>Supprimer</button>' : '') + '</div>'; }).join('') || '<p>Aucune demande pour le moment.</p>');
  $('#v').onclick = e => {
    const d = e.target.dataset, b = e.target.closest('[data-r]'), r = b && R.find(x => x.id == b.dataset.r);
    if (d.save != null) run(async () => { const v = { id: r.id }; b.querySelectorAll('[data-k]').forEach(i => v[i.dataset.k] = i.value); if (own) await api('res_update', v); else await api('set_status', { id: r.id, status: v.status }); msg('Enregistré.'); });
    if (d.pdf != null) pdf(r); if (d.ph != null) { const w = open('', '_blank'); run(async () => { const u = (await api('signed_url', { bucket: 'uploads', path: r.client_photo_path })).url; if (u && w) w.location = u; else { w && w.close(); throw Error('Photo introuvable.'); } }); }
    if (d.del != null && confirm('Supprimer cette demande ?')) run(async () => { await api('delete_reservation', { id: r.id }); resv2(); });
  };
  $('#ex').onclick = () => { const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', c = ['demande,nom,email,telephone,type,date,moment,lieu,statut,devis,acompte,deplacement,message', ...R.map(r => [r.created_at, r.clients?.name, r.clients?.email, r.clients?.phone, r.category, r.event_date, r.status, r.message].map(q).join(','))].join('\n'), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + c], { type: 'text/csv' })); a.download = 'reservations.csv'; a.click(); };
}

function pdf(r) {
  const c = r.clients || {}, w = open('', '_blank'); if (!w) return msg('Autorisez les fenêtres pop-up pour imprimer.'); const m = v => v ? Number(v).toLocaleString('fr-FR') + ' FCFA' : '—';
  w.document.write('<title>Demande ' + r.id + '</title><body style="font:16px/1.6 Georgia,serif;padding:2rem;max-width:700px"><h1>G7 Media : demande n°' + r.id + '</h1><p><b>' + esc(c.name || '') + '</b><br>' + esc(c.email || '') + ' ' + esc(c.phone || '') + '</p><p>' + esc(CAT[r.category] || r.category || '') + ' · ' + esc(r.event_date || 'date libre') + ' ' + esc(r.slot || '') + '<br>Lieu : ' + esc(r.place || '—') + '</p><p>' + esc(r.message || '') + '</p><p>Devis : ' + m(r.quote) + '<br>Acompte : ' + m(r.deposit) + '<br>Déplacement : ' + m(r.travel_fee) + '<br>Statut : ' + esc(r.status) + '</p><script>onload=()=>print()<\/script></body>'); w.document.close();
}

let CM = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

async function cal() {
  const y = CM.getFullYear(), m = CM.getMonth(), n = new Date(y, m + 1, 0).getDate(), p = x => String(x).padStart(2, '0'), f = y + '-' + p(m + 1) + '-01', t = y + '-' + p(m + 1) + '-' + p(n);
  const [A, R] = await Promise.all([api('avail_list', { from: f, to: t }), api('list_reservations')]); msg(); const st = d => A.find(a => a.day == d && a.slot == 'journée')?.status || 'libre', nb = d => R.filter(r => r.event_date == d && r.status != 'annule').length;
  const cells = Array((CM.getDay() + 6) % 7).fill('<div></div>'); for (let i = 1; i <= n; i++) { const d = y + '-' + p(m + 1) + '-' + p(i), s = st(d); cells.push('<button class="g" data-d="' + d + '" data-s="' + s + '" style="' + (s == 'bloque' ? 'background:#5a1a1a' : s == 'reserve' ? 'background:#7a4b00' : '') + '">' + i + '<br><small>' + (s == 'libre' ? 'libre' : s == 'bloque' ? 'bloqué' : 'réservé') + (nb(d) ? ' · ' + nb(d) + ' dem.' : '') + '</small></button>'); }
  $('#v').innerHTML = '<h2>Calendrier</h2><p style="color:var(--mu)">Touchez un jour pour passer de libre à réservé, puis bloqué. Un jour réservé ou bloqué n\'est plus proposé aux clients.</p><button class="g" id="pm">‹</button> <b>' + CM.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + '</b> <button class="g" id="nx">›</button><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:1rem">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => '<b>' + x + '</b>').join('') + cells.join('') + '</div>';
  $('#pm').onclick = () => { CM = new Date(y, m - 1, 1); run(cal); }; $('#nx').onclick = () => { CM = new Date(y, m + 1, 1); run(cal); };
  $('#v').onclick = e => { const d = e.target.closest('[data-d]'); if (d) run(async () => { const s = { libre: 'reserve', reserve: 'bloque', bloque: 'libre' }[d.dataset.s]; await api('avail_set', { day: d.dataset.d, slot: 'journée', status: s }); cal(); }); };
}

let CUR = null;

async function msgs() {
  const T = await api('msg_threads'); msg();
  $('#v').innerHTML = '<h2>Messages</h2>' + (T.map(t => '<div class="c" data-c="' + t.client_id + '" style="cursor:pointer"><b>' + esc(t.client?.name || t.client?.email) + '</b> ' + (t.unread ? '<span style="background:var(--ac);border-radius:99px;padding:0 .5rem">' + t.unread + '</span>' : '') + '<br><small style="color:var(--mu)">' + esc(t.last.body.slice(0, 80)) + '</small></div>').join('') || '<p>Aucun message pour le moment.</p>') + '<div id="th"></div>';
  $('#v').onclick = e => { const c = e.target.closest('[data-c]'); if (c) run(() => thread(c.dataset.c)); }; if (CUR) thread(CUR);
}

async function thread(id) {
  CUR = id; const M = await api('msg_list', { client_id: id });
  $('#th').innerHTML = '<h2>Conversation</h2><div class="c" style="max-height:340px;overflow:auto" id="tm">' + M.map(m => '<p style="text-align:' + (m.sender == 'staff' ? 'right' : 'left') + '"><span style="display:inline-block;background:' + (m.sender == 'staff' ? '#1b3a78' : '#0A1530') + ';border-radius:12px;padding:.4rem .8rem">' + esc(m.body) + '</span><br><small style="color:var(--mu)">' + new Date(m.created_at).toLocaleString('fr-FR') + '</small></p>').join('') + '</div><textarea id="tx" rows="3" placeholder="Votre réponse"></textarea><button id="ts">Envoyer</button>';
  $('#tm').scrollTop = 1e6; $('#ts').onclick = () => run(async () => { const b = $('#tx').value.trim(); if (!b) return; await api('msg_send', { client_id: id, body: b }); await thread(id); msg(); });
}

async function gal() {
  const [G, CL] = await Promise.all([api('gallery_list'), api('clients_list')]); msg();
  $('#v').innerHTML = '<h2>Galeries privées</h2>' + (G.map(g => '<div class="c"><b>' + esc(g.title) + '</b> · ' + esc(g.clients?.name || g.clients?.email) + ' · ' + (g.gallery_items?.[0]?.count ?? 0) + ' photo(s) <button class="g" data-o="' + g.id + '">Ouvrir</button>' + (ME.role == 'owner' ? ' <button class="g" data-x="' + g.id + '">Supprimer</button>' : '') + '</div>').join('') || '<p>Aucune galerie.</p>') + '<h2>Nouvelle galerie</h2><div class="c"><label for="gc">Client (il doit s\'être connecté une fois sur client.html)</label><select id="gc">' + CL.map(c => '<option value="' + c.id + '">' + esc(c.name || '') + ' ' + esc(c.email) + '</option>').join('') + '</select><label for="gt">Titre</label><input id="gt"><label for="ge">Disponible jusqu\'au (facultatif)</label><input id="ge" type="date"><label><input type="checkbox" id="gd" style="width:auto" checked> Téléchargement autorisé</label><br><button id="gn">Créer</button></div><div id="gdet"></div>';
  $('#gn').onclick = () => run(async () => { const r = await api('gallery_create', { client_id: $('#gc').value, title: $('#gt').value, expires_at: $('#ge').value ? $('#ge').value + 'T23:59:59Z' : null, downloadable: $('#gd').checked }); msg('Galerie créée.'); await gal(); gdet(r.id); });
  $('#v').onclick = e => { const d = e.target.dataset; if (d.o) run(() => gdet(d.o)); if (d.x && confirm('Supprimer cette galerie et ses photos ?')) run(async () => { await api('gallery_delete', { id: d.x }); gal(); }); };
}

async function gdet(id) {
  const D = await api('gallery_detail', { gallery_id: id }); msg(); const A = D.annotations;
  $('#gdet').innerHTML = '<h2>Photos de la galerie</h2><div class="c"><input id="gf" type="file" accept="image/jpeg,image/png,image/webp" multiple><p style="color:var(--mu)">Envoi en qualité d\'origine (25 Mo max chacune), avec miniature. Les HEIC d\'iPhone sont à exporter en JPEG.</p><button id="gu">Envoyer</button><div id="gp"></div></div><div class="k">' + D.items.map(i => { const a = A.filter(x => x.item_id == i.id); return '<div class="c"><img src="' + esc(i.url || '') + '" style="width:100%;border-radius:8px" alt="">' + a.map(x => '<p>' + (x.kind == 'favori' ? '♥ favori' : esc(x.body || x.kind)) + '</p>').join('') + '</div>'; }).join('') + '</div>'; $('#gdet').scrollIntoView();
  $('#gu').onclick = () => run(async () => {
    const F = [...$('#gf').files]; if (!F.length) throw Error('Choisissez des images.'); const sb = window.supabase.createClient(C.url, C.key); let ok = 0;
    for (const f of F) {
      const row = document.createElement('p'); $('#gp').append(row); try {
        row.textContent = f.name + ' : envoi…'; const b = await createImageBitmap(f, { imageOrientation: 'from-image' }), k = Math.min(1, 640 / Math.max(b.width, b.height)), c = document.createElement('canvas'); c.width = Math.round(b.width * k); c.height = Math.round(b.height * k); c.getContext('2d').drawImage(b, 0, 0, c.width, c.height); const th = await new Promise((o, x) => c.toBlob(y => y ? o(y) : x(Error('miniature impossible')), 'image/jpeg', .85));
        const s = await fn('sign-upload', { bucket: 'galleries', folder: id, files: [{ type: f.type, size: f.size }, { type: th.type, size: th.size }] }), [a, t] = s.files;
        for (const [p, bl] of [[a, f], [t, th]]) { const r = await sb.storage.from('galleries').uploadToSignedUrl(p.path, p.token, bl, { contentType: bl.type }); if (r.error) throw r.error; }
        await api('gallery_items_add', { gallery_id: id, items: [{ path: a.path, thumb_path: t.path }] }); row.textContent = f.name + ' : terminé ✓'; ok++;
      } catch (e) { row.textContent = f.name + ' : échec (' + e.message + ')'; }
    }
    msg(ok + '/' + F.length + ' photo(s) envoyée(s).'); gdet(id);
  });
}
const OSL = { en_attente: 'En attente', paye: 'Payée', prepare: 'En préparation', livre: 'Livrée', annule: 'Annulée' };
async function cmd() {
  const O = await api('orders_list'), own = ME.role == 'owner'; msg();
  $('#v').innerHTML = '<h2>Commandes (' + O.length + ')</h2>' + (O.map(o => {
    const c = o.clients || {}, p = (o.payments || [])[0] || {}, canPay = own && ['initie', 'en_attente', 'echec'].includes(p.status) && o.status != 'annule';
    return '<div class="c" data-o="' + o.id + '"><b>n°' + o.id + '</b> · ' + esc(c.name || c.email) + ' · ' + Number(o.total).toLocaleString('fr-FR') + ' FCFA · ' + esc(OSL[o.status] || o.status) + '<br>' + (o.items || []).map(i => esc(i.name + ' ' + i.label + ' × ' + i.qty)).join('<br>') + '<br>Adresse : ' + esc(o.address || '') + '<br>Paiement : <b>' + esc(p.status || '—') + '</b>' + (p.wave_ref ? ' · réf. ' + esc(p.wave_ref) : '') + '<br>' + (c.phone ? '<a href="https://wa.me/' + esc(c.phone.replace(/\D/g, '')) + '">' + esc(c.phone) + '</a> ' : '') + (p.proof_path ? '<button class="g" data-pr>Voir la preuve</button> ' : '') + (canPay ? '<button data-ok>Confirmer le paiement</button> <button class="g" data-rej>Refuser la preuve</button> ' : '') + '<select data-st><option value="">Changer le statut…</option><option value="prepare">En préparation</option><option value="livre">Livrée</option>' + (own ? '<option value="annule">Annulée</option>' : '') + '</select></div>';
  }).join('') || '<p>Aucune commande pour le moment.</p>');
  $('#v').onclick = e => {
    const b = e.target.closest('[data-o]'); if (!b) return; const o = O.find(x => x.id == b.dataset.o), d = e.target.dataset, p = (o.payments || [])[0] || {};
    if (d.pr != null) { const w = open('', '_blank'); run(async () => { const u = (await api('signed_url', { bucket: 'uploads', path: p.proof_path })).url; if (u && w) w.location = u; else { w && w.close(); throw Error('Preuve introuvable.'); } }); }
    if (d.ok != null && confirm('Confirmer que le paiement de ' + Number(o.total).toLocaleString('fr-FR') + ' FCFA est bien reçu ?')) run(async () => { await api('order_confirm_payment', { order_id: o.id }); cmd(); });
    if (d.rej != null && confirm('Refuser cette preuve de paiement ?')) run(async () => { await api('payment_reject', { order_id: o.id }); cmd(); });
  };
  $('#v').onchange = e => { if (e.target.dataset.st != null && e.target.value) { const o = e.target.closest('[data-o]').dataset.o; run(async () => { await api('order_set_status', { order_id: +o, status: e.target.value }); cmd(); }); } };
}
async function boutique() {
  const [P, V] = await Promise.all([api('content_list', { table: 'products' }), api('content_list', { table: 'product_variants' })]);
  const PH = await fetch(C.url + '/rest/v1/photos?select=id,category&order=id.desc&limit=200', { headers: { apikey: C.key, Authorization: 'Bearer ' + C.key } }).then(r => r.json()); msg();
  const fld = (k, l, v, t) => '<label>' + l + '</label><input data-k="' + k + '" data-t="' + (t || '') + '" type="' + (t == 'n' ? 'number' : 'text') + '" value="' + esc(v) + '">';
  const prod = p => '<div class="c" data-t0="products" data-r="' + (p.id || '') + '">' + fld('name', 'Nom du produit', p.name) + '<label>Description</label><textarea data-k="description" rows="2">' + esc(p.description || '') + '</textarea><label>Photo</label><select data-k="photo_id" data-t="n"><option value="">Aucune</option>' + (Array.isArray(PH) ? PH : []).map(x => '<option value="' + x.id + '" ' + (x.id == p.photo_id ? 'selected' : '') + '>Photo n°' + x.id + ' (' + esc(x.category || '') + ')</option>').join('') + '</select>' + fld('position', 'Ordre', p.position, 'n') + '<label><input type="checkbox" data-k="active" style="width:auto" ' + (p.active === undefined || p.active ? 'checked' : '') + '> Visible</label><br><button data-save>' + (p.id ? 'Enregistrer' : 'Créer le produit') + '</button>' + (p.id ? ' <button class="g" data-del>Supprimer</button>' : '') + '</div>';
  const vr = (v, pid) => '<div class="c" data-t0="product_variants" data-r="' + (v.id || '') + '" data-pid="' + pid + '" style="margin-left:1rem">' + fld('label', 'Format (ex. 20×30 cm)', v.label) + fld('price', 'Prix (FCFA)', v.price, 'n') + fld('stock', 'Stock (vide = illimité)', v.stock, 'n') + '<label><input type="checkbox" data-k="active" style="width:auto" ' + (v.active === undefined || v.active ? 'checked' : '') + '> Disponible</label><br><button data-save>' + (v.id ? 'Enregistrer' : 'Ajouter ce format') + '</button>' + (v.id ? ' <button class="g" data-del>Supprimer</button>' : '') + '</div>';
  $('#v').innerHTML = '<h2>Boutique de tirages</h2>' + P.map(p => prod(p) + V.filter(v => v.product_id == p.id).map(v => vr(v, p.id)).join('') + vr({}, p.id)).join('') + '<h2>Nouveau produit</h2>' + prod({});
  $('#v').onclick = e => {
    const b = e.target.closest('[data-t0]'); if (!b) return; const d = e.target.dataset, t0 = b.dataset.t0;
    if (d.save != null) run(async () => {
      const row = {}; if (b.dataset.r) row.id = +b.dataset.r; if (b.dataset.pid) row.product_id = +b.dataset.pid;
      b.querySelectorAll('[data-k]').forEach(i => { const k = i.dataset.k; row[k] = i.type == 'checkbox' ? i.checked : (i.dataset.t == 'n' ? (i.value === '' ? null : +i.value) : i.value); });
      await api('content_save', { table: t0, row }); msg('Enregistré.'); boutique();
    });
    if (d.del != null && confirm('Supprimer définitivement ?')) run(async () => { await api('content_delete', { table: t0, id: +b.dataset.r }); boutique(); });
  };
}

function saveJson(name, obj) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })); a.download = name; a.click(); }
async function rgpd() {
  const R = await api('gdpr_list'); msg();
  $('#v').innerHTML = '<h2>RGPD</h2><div class="c"><label for="ge2">E-mail du client</label><input id="ge2" type="email"><button class="g" data-x="s">Exporter ses données</button> <button data-x="a">Anonymiser ce client</button></div><h2>Demandes reçues</h2>' + (R.map(r => '<div class="c" data-r="' + r.id + '"><b>' + esc(r.kind) + '</b> · ' + esc(r.email || '') + ' · ' + new Date(r.created_at).toLocaleDateString('fr-FR') + ' · ' + esc(r.status) + '<br><button class="g" data-e>Exporter</button> ' + (r.kind == 'suppression' && r.status != 'traitee' ? '<button data-d>Anonymiser</button> ' : '') + (r.status != 'traitee' ? '<button class="g" data-ok>Marquer traitée</button>' : '') + '</div>').join('') || '<p>Aucune demande pour le moment.</p>') + '<p style="color:var(--mu)">L\'anonymisation efface messages, galeries, photos envoyées et coordonnées, mais conserve les montants des commandes et des paiements (obligations comptables). Les sauvegardes existantes gardent les anciennes données jusqu\'à leur renouvellement (30 jours).</p>';
  const ask = 'Anonymiser définitivement ce client ? Cette action est irréversible.';
  $('#v').onclick = e => {
    const d = e.target.dataset, b = e.target.closest('[data-r]'), r = b && R.find(x => x.id == b.dataset.r);
    if (d.x) { const email = $('#ge2').value.trim(); if (!email) return msg('Saisissez l\'e-mail du client.');
      if (d.x == 's') run(async () => { saveJson('donnees-client.json', await api('gdpr_export', { email })); msg('Export téléchargé.'); });
      else if (confirm(ask)) run(async () => { await api('gdpr_delete', { email }); msg('Client anonymisé.'); rgpd(); }); }
    if (r && d.e != null) run(async () => { saveJson('donnees-client-' + r.id + '.json', await api('gdpr_export', { client_id: r.client_id, email: r.email })); msg('Export téléchargé.'); });
    if (r && d.d != null && confirm(ask)) run(async () => { await api('gdpr_delete', { client_id: r.client_id, email: r.email, request_id: r.id }); msg('Client anonymisé.'); rgpd(); });
    if (r && d.ok != null) run(async () => { await api('gdpr_done', { id: r.id }); rgpd(); });
  };
}
async function sauv() {
  const L = await api('backups'); msg();
  $('#v').innerHTML = '<h2>Sauvegardes</h2><div class="c"><p style="color:var(--mu)">Une sauvegarde automatique est faite chaque nuit (les 30 dernières sont conservées). Télécharge-en une sur ton ordinateur ou ton Drive chaque semaine : c\'est ta copie en dehors de Supabase. Les codes d\'accès de l\'équipe n\'y figurent pas.</p><button id="bk">Lancer une sauvegarde maintenant</button> <button class="g" id="bl">Télécharger la dernière</button></div><h2>Historique</h2>' + (L.map(l => '<div class="c">' + new Date(l.at).toLocaleString('fr-FR') + ' · ' + (l.ok ? 'réussie · ' + esc(l.note || '') : '<b>échec</b> · ' + esc(l.note || '')) + '</div>').join('') || '<p>Aucune sauvegarde pour le moment.</p>');
  $('#bk').onclick = () => run(async () => { await api('backup_now'); msg('Sauvegarde faite.'); sauv(); });
  $('#bl').onclick = () => run(async () => { const r = await api('backup_download'); if (r.url) location.href = r.url; msg(); });
}
