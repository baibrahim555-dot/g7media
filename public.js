(function () {
  const C = window.G7 || {};
  const $ = function (s) { return document.querySelector(s); };
  const esc = function (s) { return String(s ?? '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]); }); };
  const safe = function (u) { return /^(https:\/\/|assets\/|\.\/|#)/.test(u || '') ? u : ''; };

  const L = {
    fr: {
      d_mariage: 'Du oui a la derniere danse, sans rien manquer.',
      d_bapteme: 'Les premieres fois et les grandes reunions de famille.',
      d_portrait: 'Un regard, une presence, votre image.',
      d_evenement: 'Conferences, anniversaires, ceremonies : tout le deroule.',
      d_studio: 'Lumiere maitrisee pour portraits, produits et books.',
      nav: ['Seances', 'Tarifs', 'Avis', 'A propos', 'Contact'],
      cta: 'Reserver une seance',
      q: 'Que souhaitez-vous immortaliser ?',
      from: 'A partir de',
      req: 'Tarif sur demande',
      gal: 'Galerie',
      pr: 'Tarifs',
      av: 'Ils nous ont fait confiance',
      ab: 'A propos',
      ct: 'Parlons de votre projet',
      back: 'Retour',
      adm: 'Acces admin',
      book: 'Reserver cette seance',
      slogan: 'Je photographie les moments qui comptent.',
      ab0: 'Photographe generaliste, je couvre vos mariages, baptemes, portraits, evenements et seances studio avec le meme soin du detail.',
      wa: 'Ecrire sur WhatsApp',
      mail: 'Ecrire par e-mail',
      msg: 'Bonjour, je souhaite une seance ',
      off: 'Contenu momentanement indisponible. Ecrivez-nous sur WhatsApp.'
    },
    en: {
      d_mariage: 'From the vows to the last dance, nothing missed.',
      d_bapteme: 'First moments and big family gatherings.',
      d_portrait: 'A look, a presence, your image.',
      d_evenement: 'Conferences, birthdays, ceremonies: the whole day.',
      d_studio: 'Controlled light for portraits, products and portfolios.',
      nav: ['Sessions', 'Pricing', 'Reviews', 'About', 'Contact'],
      cta: 'Book a session',
      q: 'What would you like to capture?',
      from: 'From',
      req: 'Price on request',
      gal: 'Gallery',
      pr: 'Pricing',
      av: 'They trusted us',
      ab: 'About',
      ct: "Let's talk about your project",
      back: 'Back',
      adm: 'Admin access',
      book: 'Book this session',
      slogan: 'I photograph the moments that matter.',
      ab0: 'A general photographer covering weddings, christenings, portraits, events and studio sessions with the same eye for detail.',
      wa: 'Message on WhatsApp',
      mail: 'Email us',
      msg: 'Hello, I would like a session: ',
      off: 'Content temporarily unavailable. Message us on WhatsApp.'
    }
  };

  let lg = 'fr';
  try { lg = localStorage.g7l || ((navigator.language || '').startsWith('en') ? 'en' : 'fr'); } catch (e) {}

  let S = {}, K = [], P = [], PK = [], TM = [], MN = [], AN = null, off = false, LB = [], li = 0, st;
  const H = { apikey: C.key, Authorization: 'Bearer ' + C.key };
  const get = function (p) { return fetch(C.url + '/rest/v1/' + p, { headers: H }).then(function (r) { if (!r.ok) throw 0; return r.json(); }); };
  const url = function (p) { return C.url + '/storage/v1/object/public/photos/' + p; };
  const money = function (n) { return Number(n).toLocaleString(lg === 'fr' ? 'fr-FR' : 'en-US') + ' ' + (C.currency || 'FCFA'); };
  const wa = function () { return (S.whatsapp || C.wa || '').replace(/\D/g, ''); };
  const tr = function (o, k) { return (lg === 'en' && o[k + '_en']) || o[k + '_fr'] || ''; };
  const nm = function () { return S.name || C.brand || 'G7 Media'; };
  const t = function () { return L[lg]; };
  const intro = function (c) { return tr(c, 'intro') || t()['d_' + c.slug] || ''; };
  const imgs = function (s) { return P.filter(function (p) { return p.category === s; }); };
  const lines = function (x) { return (x || '').split('\n').map(function (y) { return y.trim(); }).filter(Boolean); };
  const price = function (c) { return c.price_from ? t().from + ' ' + money(c.price_from) : t().req; };
  const desc = function (d) { let m = $('meta[name=description]'); if (m) m.content = d; };
  const img = function (p, k) { return '<img loading="lazy" src="' + esc(url(p.thumb_path || p.path)) + '" data-full="' + esc(url(p.path)) + '" alt="' + esc(tr(p, 'alt') || (k || '') + ' | ' + nm()) + '"' + (p.width && p.height ? ' width="' + p.width + '" height="' + p.height + '"' : '') + '>'; };

  function render() {
    const x = t(), r = document.documentElement.style;
    document.documentElement.lang = lg;
    if (S.bg) r.setProperty('--bg', S.bg);
    if (S.ac) r.setProperty('--ac', S.ac);
    if (S.font) {
      r.setProperty('--ft', "'" + S.font + "',Georgia,serif");
      $('#ft').href = 'https://fonts.googleapis.com/css2?family=' + S.font.replace(/ /g, '+') + ':wght@500;700&family=Inter:wght@400;600&display=swap';
    }

    const bn = AN ? tr(AN, 'text') : S.banner || '';
    $('#bn').hidden = !(bn || off);
    $('#bn').textContent = off ? x.off : bn;

    const nav = MN.length ? MN.map(function (m) { return '<a href="' + esc(safe(m.href) || '#') + '">' + esc(tr(m, 'label')) + '</a>'; }).join('') : ['seances', 'tarifs', 'avis', 'apropos', 'contact'].map(function (h, i) { return '<a href="#' + h + '">' + x.nav[i] + '</a>'; }).join('');
    const btnClient = '<a href="client.html" class="btn-client" style="background:var(--ac);color:#fff!important;padding:.4rem 1.1rem;border-radius:999px;font-weight:600;font-size:.9rem;text-decoration:none;display:inline-block;margin-left:.4rem;">' + (lg === 'fr' ? 'Mon Espace Client' : 'Client Area') + '</a>';

    $('#nv').innerHTML = nav + btnClient + '<button id="lg" aria-label="Langue">' + (lg === 'fr' ? 'EN' : 'FR') + '</button>';
    $('#lg').onclick = function () {
      lg = lg === 'fr' ? 'en' : 'fr';
      try { localStorage.g7l = lg; } catch (e) {}
      render();
      route();
    };

    $('#h1').textContent = S.heroTitle || S.slogan || x.slogan;
    $('#hp').textContent = nm();
    $('#hc').textContent = x.cta;
    $('#hc').href = 'client.html';

    let hi = lines(S.heroImages).map(safe).filter(Boolean);
    hi = hi.concat(P.filter(function (p) { return p.featured; }).map(function (p) { return url(p.path); }));
    if (!hi.length) hi = K.map(function (c) { return imgs(c.slug)[0]; }).filter(Boolean).map(function (p) { return url(p.path); });

    $('#sls').innerHTML = hi.slice(0, 6).map(function (u, i) { return '<div class="sl' + (i ? '' : ' on') + '" data-bg="' + esc(u) + '"></div>'; }).join('');
    $('#q').textContent = x.q;
    $('#tg').textContent = x.gal;
    $('#tp').textContent = x.pr;
    $('#ta').textContent = x.av;
    $('#tb').textContent = x.ab;
    $('#tc').textContent = x.ct;

    $('#cards').innerHTML = K.map(function (c, i) {
      const p = imgs(c.slug).find(function (q) { return q.featured; }) || imgs(c.slug)[0];
      return '<a class="cd" href="#/' + esc(c.slug) + '" ' + (p ? 'data-bg="' + esc(url(i ? p.thumb_path || p.path : p.path)) + '"' : '') + '><h3>' + esc(tr(c, 'name')) + '</h3><small>' + price(c) + '</small></a>';
    }).join('');

    $('#galerie').style.display = P.length ? '' : 'none';
    $('#mas').innerHTML = P.map(function (p) { return img(p, catName(p.category)); }).join('');

    $('#pr').innerHTML = K.map(function (c) {
      const a = PK.filter(function (k) { return k.category === c.slug; });
      return a.length ? a.map(function (k) { return '<div><b>' + esc(tr(k, 'name')) + '</b><span>' + esc(tr(k, 'details')) + '</span><em>' + price(k) + '</em></div>'; }).join('') : '<div><b>' + esc(tr(c, 'name')) + '</b><span>' + esc(intro(c)) + '</span><em>' + price(c) + '</em></div>';
    }).join('');

    $('#avis').style.display = TM.length ? '' : 'none';
    $('#tm').innerHTML = TM.map(function (m) {
      return '<blockquote>' + esc(m.body) + '<cite>' + (m.link && /^https:\/\//.test(m.link) ? '<a href="' + esc(m.link) + '" rel="noopener">' + esc(m.author) + '</a>' : esc(m.author)) + '</cite></blockquote>';
    }).join('');

    $('#ab').textContent = S.about || x.ab0;
    $('#ct').innerHTML = '<a class="btn" href="client.html">' + (lg === 'fr' ? 'Reserver en ligne' : 'Book online') + '</a><a class="btn o" href="https://wa.me/' + wa() + '" target="_blank" rel="noopener">' + x.wa + '</a>' + (S.email ? '<a class="btn o" href="mailto:' + esc(S.email) + '">' + x.mail + '</a>' : '');
    $('#wa').href = 'https://wa.me/' + wa();
    $('#cp').textContent = '© ' + new Date().getFullYear() + ' ' + nm();

    if ($('#ad')) { $('#ad').textContent = x.adm; }

    $('#so').innerHTML = (S.instagram && /^https:\/\//.test(S.instagram) ? '<a href="' + esc(S.instagram) + '" rel="noopener" style="margin:0">Instagram</a> ' : '') + (S.email ? '<a href="mailto:' + esc(S.email) + '" style="margin:0">' + esc(S.email) + '</a>' : '');
    document.querySelectorAll('[data-bg]').forEach(function (e) {
      if (!e.classList.contains('sl') || e.classList.contains('on')) e.style.backgroundImage = "url('" + e.dataset.bg + "')";
    });
    slide();
  }

  const catName = function (s) { const c = K.find(function (x) { return x.slug === s; }); return c ? tr(c, 'name') : ''; };

  function slide() {
    clearInterval(st);
    const s = Array.from(document.querySelectorAll('.sl'));
    if (s.length < 2 || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    let i = 0;
    st = setInterval(function () {
      s[i].classList.remove('on');
      i = (i + 1) % s.length;
      const n = s[i];
      if (!n.style.backgroundImage) n.style.backgroundImage = "url('" + n.dataset.bg + "')";
      n.classList.add('on');
    }, 6000);
  }

  function route() {
    const m = location.hash.match(/^#\/([a-z0-9-]+)/), v = $('#vue'), c = m && K.find(function (k) { return k.slug === m[1]; });
    if (!c) {
      v.style.display = 'none';
      document.title = nm() + ' | ' + t().q;
      desc(t().ab0);
      return;
    }
    const n = tr(c, 'name'), a = PK.filter(function (k) { return k.category === c.slug; });
    document.title = n + ' | ' + nm();
    desc(intro(c));
    v.style.display = 'block';
    v.firstElementChild.innerHTML = '<a class="back" href="#seances">‹ ' + t().back + '</a><h1 style="font-size:clamp(2rem,5vw,3.2rem);margin-bottom:.6rem">' + esc(n) + '</h1><p style="color:var(--mu);margin-bottom:1rem">' + esc(intro(c)) + '</p><p style="margin-bottom:1.5rem"><b>' + price(c) + '</b></p>' + (a.length ? '<div class="pr" style="margin-bottom:2rem">' + a.map(function (k) { return '<div><b>' + esc(tr(k, 'name')) + '</b><span>' + esc(tr(k, 'details')) + '</span><em>' + price(k) + '</em></div>'; }).join('') + '</div>' : '') + '<div class="mas">' + imgs(c.slug).map(function (p) { return img(p, n); }).join('') + '</div><p style="margin-top:1.5rem"><a class="btn" href="client.html?cat=' + esc(c.slug) + '">' + t().book + '</a> <a class="btn o" href="https://wa.me/' + wa() + '?text=' + encodeURIComponent(t().msg + n) + '" target="_blank" rel="noopener">WhatsApp</a></p>';
    scrollTo(0, v.offsetTop);
  }

  const show = function () { $('#li').src = LB[li]; $('#lb').hidden = false; };

  document.addEventListener('click', function (e) {
    const i = e.target.closest('.mas img');
    if (!i) return;
    const all = Array.from(i.closest('.mas').querySelectorAll('img'));
    LB = all.map(function (x) { return x.dataset.full; });
    li = all.indexOf(i);
    show();
  });

  $('#lx').onclick = function () { $('#lb').hidden = true; };
  $('#lp').onclick = function () { li = (li - 1 + LB.length) % LB.length; show(); };
  $('#ln').onclick = function () { li = (li + 1) % LB.length; show(); };
  $('#lb').onclick = function (e) { if (e.target.id === 'lb') $('#lb').hidden = true; };

  addEventListener('keydown', function (e) {
    if ($('#lb').hidden) return;
    if (e.key === 'Escape') $('#lb').hidden = true;
    if (e.key === 'ArrowLeft') $('#lp').click();
    if (e.key === 'ArrowRight') $('#ln').click();
  });

  addEventListener('hashchange', route);

  (async function () {
    render();
    route();
    if (!C.url) { off = true; render(); return; }
    try {
      const res = await Promise.all([
        get('site_settings?key=eq.site&select=value'),
        get('categories?select=*&order=position'),
        get('photos?select=id,category,path,thumb_path,alt_fr,alt_en,featured,width,height&order=position,id'),
        get('packages?select=*&order=position,id'),
        get('testimonials?select=*&order=position,id'),
        get('menu_items?select=*&order=position,id'),
        get('announcements?select=*&order=id.desc&limit=1')
      ]);
      S = res[0][0]?.value || {};
      K = res[1];
      P = res[2];
      PK = res[3];
      TM = res[4];
      MN = res[5];
      AN = res[6][0] || null;
      render();
      route();
      const j = document.createElement('script');
      j.type = 'application/ld+json';
      j.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Photographer', name: nm(), url: C.site || location.href, telephone: '+' + wa(), sameAs: S.instagram ? [S.instagram] : [] });
      document.head.append(j);
    } catch (x) {
      off = true;
      render();
    }
  })();
})();