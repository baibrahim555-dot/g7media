(() => {
  const I = Object.assign({ max: 2400, thumb: 640, quality: 0.92, format: 'image/jpeg' }, (window.G7 && window.G7.images) || {});
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pub = (C, p) => C.url + '/storage/v1/object/public/photos/' + p;
  let sb;

  async function retry(f, n) {
    n = n || 3;
    for (let i = 0; i < n; i++) {
      try { return await f(); }
      catch (e) {
        if (i >= n - 1) throw e;
        await sleep(800 * (i + 1));
      }
    }
  }

  async function pool(a, n, f) {
    let i = 0;
    const workers = Array.from({ length: Math.min(n, a.length) }, async () => {
      while (i < a.length) {
        const k = i++;
        await f(a[k], k);
      }
    });
    await Promise.all(workers);
  }

  async function prep(file, wm) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const draw = m => {
      const k = Math.min(1, m / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k);
      c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return c;
    };

    const big = draw(I.max);
    if (wm) {
      const x = big.getContext('2d');
      const s = Math.max(22, Math.round(big.width / 22));
      x.font = 'bold ' + s + 'px sans-serif';
      x.textAlign = 'right';
      x.fillStyle = 'rgba(255,255,255,0.75)';
      x.shadowColor = 'rgba(0,0,0,0.8)';
      x.shadowBlur = 6;
      x.fillText(wm, big.width - (s * 0.8), big.height - (s * 0.8));
    }

    const blob = c => new Promise((ok, ko) => c.toBlob(b => b ? ok(b) : ko(Error('conversion impossible')), I.format, I.quality));
    const exif = window.exifr ? await exifr.parse(file, ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'DateTimeOriginal']).catch(() => null) : null;
    return { main: await blob(big), thumb: await blob(draw(I.thumb)), w: big.width, h: big.height, exif: exif };
  }

  window.G7Medias = {
    async render(H) {
      const fn = H.fn, api = H.api, msg = H.msg, run = H.run, esc = H.esc, $ = H.$, C = H.C, ME = H.ME;
      const own = ME.role == 'owner';
      sb = sb || window.supabase.createClient(C.url, C.key);

      if (!document.getElementById('g2')) {
        document.head.insertAdjacentHTML('beforeend', '<style id="g2">.g2{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.8rem}.g2 img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;margin-bottom:.5rem}#dz.on{outline:2px dashed #4DA3F2}</style>');
      }

      let cats = await api('categories_list');
      let P = await api('photos_list');
      msg();

      const up = (f, b) => sb.storage.from('photos').uploadToSignedUrl(f.path, f.token, b, { contentType: b.type }).then(r => { if (r.error) throw r.error; });

      $('#v').innerHTML = '<h2>Importer des photos</h2><div class="c" id="dz"><label for="mc">Catégorie</label><select id="mc">' + cats.filter(c => c.active).map(c => '<option value="' + c.slug + '">' + esc(c.name_fr) + '</option>').join('') + '</select><br><br><label><input type="checkbox" id="mw" style="width:auto" checked> Ajouter un filigrane</label><input id="mt" value="G7 Media" placeholder="Texte du filigrane" aria-label="Texte du filigrane"><input id="mf" type="file" accept="image/jpeg,image/png,image/webp" multiple><p style="color:var(--mu)">Vos photos sont traitées en qualité JPEG haute définition avant l\'envoi. Si le filigrane est coché, il sera gravé directement en bas à droite de la photo.</p><div id="mp"></div></div><h2 id="mh"></h2><div id="mg" class="g2"></div>' + (own ? '<h2>Catégories et prix</h2><div id="mk"></div>' : '');

      const grid = () => {
        $('#mh').textContent = 'Photos (' + P.length + ')';
        $('#mg').innerHTML = P.map((p, i) => '<div class="c" data-id="' + p.id + '"><img loading="lazy" src="' + esc(pub(C, p.thumb_path || p.path)) + '" alt="' + esc(p.alt_fr) + '"><select data-f="category">' + cats.map(c => '<option value="' + c.slug + '" ' + (c.slug == p.category ? 'selected' : '') + '>' + esc(c.name_fr) + '</option>').join('') + '</select><input data-f="alt_fr" placeholder="Texte alternatif" value="' + esc(p.alt_fr) + '"><label><input type="checkbox" data-f="published" style="width:auto" ' + (p.published ? 'checked' : '') + '> Publiée</label> <label><input type="checkbox" data-f="featured" style="width:auto" ' + (p.featured ? 'checked' : '') + '> À la une</label><br><button class="g" data-m="-1" ' + (i ? '' : 'disabled') + ' aria-label="Monter">↑</button> <button class="g" data-m="1" ' + (i < P.length - 1 ? '' : 'disabled') + ' aria-label="Descendre">↓</button>' + (own ? ' <button class="g" data-x>Supprimer</button>' : '') + '</div>').join('') || '<p>Aucune photo pour le moment.</p>';
      };

      const go = async files => {
        files = [...files].filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
        if (!files.length) return msg('Aucune image reconnue.');

        const cat = $('#mc').value;
        const wm = $('#mw').checked ? ($('#mt').value.trim() || 'G7 Media') : '';
        const box = $('#mp');
        const rows = files.map(f => {
          const d = document.createElement('p');
          d.textContent = f.name + ' : en attente';
          box.append(d);
          return d;
        });
        let ok = 0;

        await pool(files, 3, async (f, i) => {
          const set = t => rows[i].textContent = f.name + ' : ' + t;
          try {
            if (f.size > 40 * 1048576) throw Error('fichier trop lourd (40 Mo maximum)');
            set('préparation…');
            const r = await prep(f, wm).catch(() => { throw Error('format non lu (HEIC d\'iPhone ? exportez en JPEG)'); });
            set('envoi…');
            const s = await retry(() => fn('sign-upload', { bucket: 'photos', folder: cat, files: [{ type: r.main.type, size: r.main.size }, { type: r.thumb.type, size: r.thumb.size }] }));
            const a = s.files[0];
            const b = s.files[1];
            await retry(() => up(a, r.main));
            await retry(() => up(b, r.thumb));
            await retry(() => api('photos_add', [{ category: cat, path: a.path, thumb_path: b.path, exif: r.exif, width: r.w, height: r.h, watermark: !!wm }]));
            set('terminé ✓');
            ok++;
          } catch (e) {
            set('échec : ' + e.message);
          }
        });

        msg(ok + '/' + files.length + ' photo(s) importée(s).');
        P = await api('photos_list');
        grid();
      };

      $('#mf').onchange = e => { go(e.target.files); e.target.value = ''; };
      const dz = $('#dz');
      dz.ondragover = e => { e.preventDefault(); dz.classList.add('on'); };
      dz.ondragleave = () => dz.classList.remove('on');
      dz.ondrop = e => { e.preventDefault(); dz.classList.remove('on'); go(e.dataTransfer.files); };

      $('#mg').onchange = e => {
        const t = e.target;
        const id = +t.closest('[data-id]').dataset.id;
        const f = t.dataset.f;
        if (f) run(async () => {
          const v = t.type == 'checkbox' ? t.checked : t.value;
          await api('photos_update', { id: id, fields: { [f]: v } });
          P.find(p => p.id == id)[f] = v;
          msg('Enregistré.');
        });
      };

      $('#mg').onclick = e => {
        const c = e.target.closest('[data-id]');
        if (!c) return;
        const id = +c.dataset.id;
        if (e.target.dataset.m) run(async () => {
          const i = P.findIndex(p => p.id == id);
          const j = i + (+e.target.dataset.m);
          const temp = P[i]; P[i] = P[j]; P[j] = temp;
          await api('photos_reorder', { ids: P.map(p => p.id) });
          grid();
          msg('Ordre enregistré.');
        });
        if (e.target.dataset.x != null && confirm('Supprimer cette photo définitivement ?')) run(async () => {
          await api('photos_delete', { ids: [id] });
          P = P.filter(p => p.id != id);
          grid();
          msg('Photo supprimée.');
        });
      };

      if (own) {
        $('#mk').innerHTML = cats.map(c => '<div class="c" data-s="' + esc(c.slug) + '"><b>' + esc(c.slug) + '</b><input data-k="name_fr" value="' + esc(c.name_fr) + '" aria-label="Nom en français"><input data-k="name_en" value="' + esc(c.name_en) + '" aria-label="Nom en anglais"><input data-k="price_from" type="number" min="0" placeholder="Prix à partir de (FCFA)" value="' + (c.price_from ?? '') + '"><label><input type="checkbox" data-k="active" style="width:auto" ' + (c.active ? 'checked' : '') + '> Visible</label> <button data-save>Enregistrer</button></div>').join('');
        $('#mk').onclick = e => {
          if (e.target.dataset.save == null) return;
          const b = e.target.closest('[data-s]');
          const d = { slug: b.dataset.s, position: cats.findIndex(c => c.slug == b.dataset.s) + 1 };
          b.querySelectorAll('[data-k]').forEach(i => d[i.dataset.k] = i.type == 'checkbox' ? i.checked : i.value);
          run(async () => {
            await api('category_save', d);
            msg('Catégorie enregistrée.');
          });
        };
      }

      grid();
    }
  };
})();