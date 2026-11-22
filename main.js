// LunaSuite: AudioSuite-style rendering in LUNA. The selected span of each selected audio track
// is copied onto a temporary track that carries a chain of up to three plug-ins; you tweak and
// listen, and Render bounces that span through the chain and lays the result over the selection.
//
// The bounce writes a new file that starts at the start of the range, so the result clip maps
// that file from 0 ns over the range (a clip that maps nothing plays silence).

(() => {
  const $ = (id) => document.getElementById(id);
  const VERSION = '1.0.0';
  const KEY = 'com.fedetrillo.lunasuite.';
  const store = {
    get: (k) => { try { return JSON.parse(localStorage.getItem(KEY + k)); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* not fatal */ } },
  };
  const MAX_CHAIN = 3;
  // Tail lengths: note values as fractions of a whole note, then whole bars.
  const TAILS = [['0', 0], ['1/16', 1 / 16], ['1/8', 1 / 8], ['1/4', 1 / 4], ['1/2', 1 / 2], ['1', 1], ['2', 2], ['4', 4]];
  const BARS = ['1', '2', '4'];
  const MODS = [['n', 1], ['d', 1.5], ['t', 2 / 3]];
  const FADES = [0, 5, 10, 20];

  // ---- Texts ---------------------------------------------------------------------------------
  const I18N = {
    es: { _name: 'Español', sel: 'Selección', chain: 'Cadena de plugins', search: 'Buscar plugin…', add: 'Añadir', recent: 'Recientes', favs: 'Favoritos', all: 'Todos',
      noChain: 'Añade hasta 3 plugins de la lista (doble clic o «Añadir»).', preset: '(su preset)', tail: 'Cola', mod: 'Figura', dest: 'La cola', fade: 'Fundidos', keep: 'Guardar el original en una pista silenciada',
      modN: 'normal', modD: 'con puntillo', modT: 'tresillo', cover: 'tapa lo siguiente', track: 'en pista aparte', bars: 'comp.', none: 'sin',
      prep: '1 · Preparar y abrir plugins', listen: 'Escuchar', stop: 'Parar', render: '2 · Renderizar', cancel: 'Cancelar', dark: 'Oscuro', grey: 'Gris',
      noSel: 'Selecciona un trozo de una o varias pistas de audio en LUNA.', range: '{from} → {to} · {secs} s', tailIs: 'Cola: {secs} s', skipped: '{n} pista(s) con otro formato (mono/estéreo) se quedan fuera',
      preparing: 'Preparando…', ready: 'Ajusta los plugins y pulsa Renderizar. «Escuchar» suena en solo y en bucle.', rendering: 'Renderizando {i} de {n}…',
      done: 'Hecho: {n} pista(s). Cmd+Z en LUNA para deshacer.', failed: 'Error: {e}', cancelled: 'Cancelado', waiting: 'Esperando a LUNA…', noSession: 'Abre una sesión en LUNA.',
      copied: 'Informe copiado', original: 'original', tailName: 'cola' },
    en: { _name: 'English', sel: 'Selection', chain: 'Plug-in chain', search: 'Search plug-ins…', add: 'Add', recent: 'Recent', favs: 'Favorites', all: 'All',
      noChain: 'Add up to 3 plug-ins from the list (double-click or "Add").', preset: '(its preset)', tail: 'Tail', mod: 'Note', dest: 'The tail', fade: 'Fades', keep: 'Keep the original on a muted track',
      modN: 'straight', modD: 'dotted', modT: 'triplet', cover: 'covers what follows', track: 'on its own track', bars: 'bar', none: 'none',
      prep: '1 · Prepare and open plug-ins', listen: 'Listen', stop: 'Stop', render: '2 · Render', cancel: 'Cancel', dark: 'Dark', grey: 'Grey',
      noSel: 'Select a span on one or more audio tracks in LUNA.', range: '{from} → {to} · {secs} s', tailIs: 'Tail: {secs} s', skipped: '{n} track(s) in another format (mono/stereo) are left out',
      preparing: 'Preparing…', ready: 'Tweak the plug-ins and press Render. "Listen" plays it soloed, looped.', rendering: 'Rendering {i} of {n}…',
      done: 'Done: {n} track(s). Cmd+Z in LUNA to undo.', failed: 'Error: {e}', cancelled: 'Cancelled', waiting: 'Waiting for LUNA…', noSession: 'Open a session in LUNA.',
      copied: 'Report copied', original: 'original', tailName: 'tail' },
    ca: { _name: 'Català', sel: 'Selecció', chain: 'Cadena de plugins', search: 'Cercar plugin…', add: 'Afegir', recent: 'Recents', favs: 'Preferits', all: 'Tots',
      noChain: 'Afegeix fins a 3 plugins de la llista (doble clic o «Afegir»).', preset: '(el seu preset)', tail: 'Cua', mod: 'Figura', dest: 'La cua', fade: 'Fosos', keep: 'Desar l’original en una pista silenciada',
      modN: 'normal', modD: 'amb punt', modT: 'tresset', cover: 'tapa el que segueix', track: 'en pista a part', bars: 'comp.', none: 'sense',
      prep: '1 · Preparar i obrir plugins', listen: 'Escoltar', stop: 'Aturar', render: '2 · Renderitzar', cancel: 'Cancel·lar', dark: 'Fosc', grey: 'Gris',
      noSel: 'Selecciona un tros d’una o més pistes d’àudio a LUNA.', range: '{from} → {to} · {secs} s', tailIs: 'Cua: {secs} s', skipped: '{n} pista(es) amb un altre format (mono/estèreo) queden fora',
      preparing: 'Preparant…', ready: 'Ajusta els plugins i prem Renderitzar. «Escoltar» sona en solo i en bucle.', rendering: 'Renderitzant {i} de {n}…',
      done: 'Fet: {n} pista(es). Cmd+Z a LUNA per desfer.', failed: 'Error: {e}', cancelled: 'Cancel·lat', waiting: 'Esperant LUNA…', noSession: 'Obre una sessió a LUNA.',
      copied: 'Informe copiat', original: 'original', tailName: 'cua' },
    fr: { _name: 'Français', sel: 'Sélection', chain: 'Chaîne de plug-ins', search: 'Chercher un plug-in…', add: 'Ajouter', recent: 'Récents', favs: 'Favoris', all: 'Tous',
      noChain: 'Ajoutez jusqu’à 3 plug-ins de la liste (double-clic ou « Ajouter »).', preset: '(son preset)', tail: 'Queue', mod: 'Figure', dest: 'La queue', fade: 'Fondus', keep: 'Garder l’original sur une piste muette',
      modN: 'normale', modD: 'pointée', modT: 'triolet', cover: 'couvre la suite', track: 'sur sa propre piste', bars: 'mes.', none: 'aucune',
      prep: '1 · Préparer et ouvrir les plug-ins', listen: 'Écouter', stop: 'Arrêter', render: '2 · Rendre', cancel: 'Annuler', dark: 'Sombre', grey: 'Gris',
      noSel: 'Sélectionnez un passage sur une ou plusieurs pistes audio dans LUNA.', range: '{from} → {to} · {secs} s', tailIs: 'Queue : {secs} s', skipped: '{n} piste(s) dans un autre format (mono/stéréo) restent à l’écart',
      preparing: 'Préparation…', ready: 'Réglez les plug-ins et appuyez sur Rendre. « Écouter » joue en solo, en boucle.', rendering: 'Rendu {i} sur {n}…',
      done: 'Terminé : {n} piste(s). Cmd+Z dans LUNA pour annuler.', failed: 'Erreur : {e}', cancelled: 'Annulé', waiting: 'En attente de LUNA…', noSession: 'Ouvrez une session dans LUNA.',
      copied: 'Rapport copié', original: 'original', tailName: 'queue' },
    de: { _name: 'Deutsch', sel: 'Auswahl', chain: 'Plug-in-Kette', search: 'Plug-in suchen…', add: 'Hinzufügen', recent: 'Zuletzt', favs: 'Favoriten', all: 'Alle',
      noChain: 'Bis zu 3 Plug-ins aus der Liste hinzufügen (Doppelklick oder „Hinzufügen“).', preset: '(sein Preset)', tail: 'Fahne', mod: 'Notenwert', dest: 'Die Fahne', fade: 'Blenden', keep: 'Original auf einer stummen Spur behalten',
      modN: 'gerade', modD: 'punktiert', modT: 'Triole', cover: 'überdeckt das Folgende', track: 'auf eigener Spur', bars: 'Takt', none: 'keine',
      prep: '1 · Vorbereiten und Plug-ins öffnen', listen: 'Anhören', stop: 'Stopp', render: '2 · Rendern', cancel: 'Abbrechen', dark: 'Dunkel', grey: 'Grau',
      noSel: 'Wähle in LUNA einen Bereich auf einer oder mehreren Audiospuren.', range: '{from} → {to} · {secs} s', tailIs: 'Fahne: {secs} s', skipped: '{n} Spur(en) in anderem Format (mono/stereo) bleiben außen vor',
      preparing: 'Wird vorbereitet…', ready: 'Plug-ins einstellen und Rendern drücken. „Anhören“ spielt solo in Schleife.', rendering: 'Rendere {i} von {n}…',
      done: 'Fertig: {n} Spur(en). Cmd+Z in LUNA macht es rückgängig.', failed: 'Fehler: {e}', cancelled: 'Abgebrochen', waiting: 'Warte auf LUNA…', noSession: 'Öffne eine Session in LUNA.',
      copied: 'Bericht kopiert', original: 'Original', tailName: 'Fahne' },
    it: { _name: 'Italiano', sel: 'Selezione', chain: 'Catena di plug-in', search: 'Cerca plug-in…', add: 'Aggiungi', recent: 'Recenti', favs: 'Preferiti', all: 'Tutti',
      noChain: 'Aggiungi fino a 3 plug-in dall’elenco (doppio clic o «Aggiungi»).', preset: '(il suo preset)', tail: 'Coda', mod: 'Figura', dest: 'La coda', fade: 'Dissolvenze', keep: 'Conserva l’originale su una traccia muta',
      modN: 'normale', modD: 'puntata', modT: 'terzina', cover: 'copre ciò che segue', track: 'su traccia a parte', bars: 'batt.', none: 'nessuna',
      prep: '1 · Prepara e apri i plug-in', listen: 'Ascolta', stop: 'Stop', render: '2 · Renderizza', cancel: 'Annulla', dark: 'Scuro', grey: 'Grigio',
      noSel: 'Seleziona un tratto di una o più tracce audio in LUNA.', range: '{from} → {to} · {secs} s', tailIs: 'Coda: {secs} s', skipped: '{n} traccia/e in un altro formato (mono/stereo) restano fuori',
      preparing: 'Preparazione…', ready: 'Regola i plug-in e premi Renderizza. «Ascolta» suona in solo e in loop.', rendering: 'Rendering {i} di {n}…',
      done: 'Fatto: {n} traccia/e. Cmd+Z in LUNA per annullare.', failed: 'Errore: {e}', cancelled: 'Annullato', waiting: 'In attesa di LUNA…', noSession: 'Apri una sessione in LUNA.',
      copied: 'Rapporto copiato', original: 'originale', tailName: 'coda' },
    pt: { _name: 'Português', sel: 'Seleção', chain: 'Cadeia de plugins', search: 'Procurar plugin…', add: 'Adicionar', recent: 'Recentes', favs: 'Favoritos', all: 'Todos',
      noChain: 'Adiciona até 3 plugins da lista (duplo clique ou «Adicionar»).', preset: '(o seu preset)', tail: 'Cauda', mod: 'Figura', dest: 'A cauda', fade: 'Fades', keep: 'Guardar o original numa faixa silenciada',
      modN: 'normal', modD: 'pontuada', modT: 'tercina', cover: 'tapa o que vem a seguir', track: 'numa faixa à parte', bars: 'comp.', none: 'sem',
      prep: '1 · Preparar e abrir plugins', listen: 'Ouvir', stop: 'Parar', render: '2 · Renderizar', cancel: 'Cancelar', dark: 'Escuro', grey: 'Cinzento',
      noSel: 'Seleciona um trecho de uma ou mais faixas de áudio no LUNA.', range: '{from} → {to} · {secs} s', tailIs: 'Cauda: {secs} s', skipped: '{n} faixa(s) noutro formato (mono/estéreo) ficam de fora',
      preparing: 'A preparar…', ready: 'Ajusta os plugins e carrega em Renderizar. «Ouvir» toca em solo e em loop.', rendering: 'A renderizar {i} de {n}…',
      done: 'Feito: {n} faixa(s). Cmd+Z no LUNA para desfazer.', failed: 'Erro: {e}', cancelled: 'Cancelado', waiting: 'À espera do LUNA…', noSession: 'Abre uma sessão no LUNA.',
      copied: 'Relatório copiado', original: 'original', tailName: 'cauda' },
  };
  const LANGS = Object.keys(I18N);
  let lang = (() => {
    const saved = store.get('lang');
    if (saved && I18N[saved]) return saved;
    for (const l of navigator.languages ?? [navigator.language]) { const c = String(l || '').slice(0, 2).toLowerCase(); if (I18N[c]) return c; }
    return 'en';
  })();
  const t = (k, v = {}) => String(I18N[lang][k] ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (m, x) => (x in v ? String(v[x]) : m));

  let status = { key: null, vars: {}, kind: '' };
  let statusTimer = null;
  function say(key, vars = {}, kind = '', ms = 0) {
    status = { key, vars, kind };
    clearTimeout(statusTimer);
    if (ms) statusTimer = setTimeout(() => say(null), ms);
    $('status').textContent = key ? t(key, vars) : '';
    $('status').className = `status ${kind}`;
  }
  const log = [];
  const note = (what, extra = {}) => { log.push({ t: new Date().toISOString().slice(11, 23), what, ...extra }); if (log.length > 120) log.shift(); };
  const errText = (e) => String(e?.message || e);

  // ---- Settings --------------------------------------------------------------------------------
  const opts = { tail: '0', mod: 'n', dest: 'cover', fade: 5, keep: false, ...(store.get('opts') ?? {}) };
  const saveOpts = () => store.set('opts', opts);
  const chain = (store.get('chain') ?? []).slice(0, MAX_CHAIN);      // [{ pluginId, name, presetUid }]
  const saveChain = () => store.set('chain', chain);
  let recents = store.get('recents') ?? [];                           // [{ pluginId, name }]

  let theme = store.get('theme') === 'grey' ? 'grey' : 'dark';
  let repaint = () => {};
  let onOptions = () => {};
  const seg = (box, items, current, onPick) => {
    $(box).replaceChildren(...items.map(([v, label]) => {
      const b = document.createElement('button');
      b.textContent = label; b.classList.toggle('on', current === v);
      b.onclick = () => onPick(v);
      return b;
    }));
  };
  const pick = (k) => (v) => { opts[k] = v; saveOpts(); paintOptions(); onOptions(); };
  function paintOptions() {
    seg('tail', TAILS.map(([v]) => [v, v === '0' ? t('none') : BARS.includes(v) ? `${v} ${t('bars')}` : v]), opts.tail, pick('tail'));
    seg('mod', MODS.map(([v]) => [v, t(v === 'n' ? 'modN' : v === 'd' ? 'modD' : 'modT')]), opts.mod, pick('mod'));
    seg('dest', [['cover', t('cover')], ['track', t('track')]], opts.dest, pick('dest'));
    seg('fade', FADES.map((ms) => [ms, ms ? `${ms} ms` : t('none')]), opts.fade, pick('fade'));
    const noTail = opts.tail === '0';
    $('mod').style.opacity = noTail || BARS.includes(opts.tail) ? '.45' : '1';
    $('dest').style.opacity = noTail ? '.45' : '1';
    $('keep').checked = !!opts.keep;
  }
  function paintStatic() {
    document.documentElement.lang = lang;
    document.documentElement.dataset.theme = theme;
    $('ver').textContent = `v${VERSION}`;
    $('lang').replaceChildren(...LANGS.map((c) => Object.assign(document.createElement('option'), { value: c, textContent: I18N[c]._name })));
    $('lang').value = lang;
    for (const [id, name] of [['tDark', 'dark'], ['tGrey', 'grey']]) { $(id).classList.toggle('on', theme === name); $(id).title = t(name); $(id).setAttribute('aria-label', t(name)); }
    $('selLabel').textContent = t('sel'); $('chainLabel').textContent = t('chain');
    $('search').placeholder = t('search'); $('add').textContent = t('add');
    $('tailLabel').textContent = t('tail'); $('modLabel').textContent = t('mod'); $('destLabel').textContent = t('dest'); $('fadeLabel').textContent = t('fade');
    $('keepLabel').textContent = t('keep');
    $('prep').textContent = t('prep'); $('render').textContent = t('render'); $('cancel').textContent = t('cancel'); $('listen').textContent = t('listen');
    paintOptions();
    if (status.key) say(status.key, status.vars, status.kind);
  }
  $('lang').onchange = () => { lang = $('lang').value; store.set('lang', lang); paintStatic(); repaint(); };
  for (const b of [$('tDark'), $('tGrey')]) b.onclick = () => { theme = b.dataset.t; store.set('theme', theme); paintStatic(); };
  $('keep').onchange = () => { opts.keep = $('keep').checked; saveOpts(); };
  paintStatic();

  let luna;
  let built;

  async function build() {
    const s = luna.sessions.current();
    if (s === built) return;
    built = s;
    if (!s) { say('noSession'); return; }
    await s.ready();
    if (s !== built) return;
    await s.musical.ready();
    say(null);
    const tr = s.transport, tl = s.musical.timeline, ctx = s.context;
    const TPB = Luna.TICKS_PER_BEAT;
    const WHOLE = Luna.WHOLE_NOTE ?? 4 * TPB;
    let job = null;

    // ---- Lengths ----------------------------------------------------------------------------------------
    // The tail follows the tempo: a note value (optionally dotted or triplet) or whole bars of the
    // time signature where the selection ends.
    function tailTicks(E) {
      const f = TAILS.find(([v]) => v === opts.tail)?.[1] ?? 0;
      if (!f) return 0;
      if (BARS.includes(opts.tail)) {
        const bar = tl.barBeat(E).bar;
        const perBar = (tl.tickAtBar(bar + 1) - tl.tickAtBar(bar)) || WHOLE;
        return Math.round(f * perBar);
      }
      const mod = MODS.find(([v]) => v === opts.mod)?.[1] ?? 1;
      return Math.round(f * WHOLE * mod);
    }
    const msToTicks = (ms, at) => Math.max(1, tl.tickAtSeconds(tl.seconds(at) + ms / 1000) - at);
    const nsBetween = (a, b) => Math.round((tl.seconds(b) - tl.seconds(a)) * 1e9);

    // ---- The selection ---------------------------------------------------------------------------
    function selection() {
      const S = ctx.selectionStart.value, E = ctx.selectionStop.value;
      const tracks = (ctx.selectionTracks.value ?? []).map((id) => s.tracks.byId(id)).filter((x) => x && x.trackType?.value === 'audio');
      if (S === null || S === undefined || E === null || E === undefined || E <= S || !tracks.length) return null;
      const fmt = tracks[0].stemFormat?.value;
      return { S, E, tracks: tracks.filter((x) => x.stemFormat?.value === fmt), skipped: tracks.filter((x) => x.stemFormat?.value !== fmt).length };
    }
    function paintSel() {
      const box = $('sel');
      const sel = job ?? selection();
      if (!sel) { box.textContent = t('noSel'); $('prep').disabled = true; return; }
      const div = (text) => Object.assign(document.createElement('div'), { textContent: text });
      const lines = [
        Object.assign(document.createElement('b'), { textContent: sel.tracks.map((x) => x.name.value).join(', ') }),
        div(t('range', { from: tl.formatBarBeat(sel.S), to: tl.formatBarBeat(sel.E), secs: (tl.seconds(sel.E) - tl.seconds(sel.S)).toFixed(2) })),
      ];
      const tail = job ? job.tail : tailTicks(sel.E);
      if (tail) lines.push(div(t('tailIs', { secs: (tl.seconds(sel.E + tail) - tl.seconds(sel.E)).toFixed(2) })));
      if (sel.skipped) lines.push(div(t('skipped', { n: sel.skipped })));
      box.replaceChildren(...lines);
      $('prep').disabled = !!job || !chain.length;
    }
    onOptions = () => { if (job) { job.tail = tailTicks(job.E); } paintSel(); };

    // ---- Picking plug-ins ---------------------------------------------------------------------------
    let found = [], searchTimer = null;
    async function listPlugins() {
      const sel = selection();
      try {
        found = await luna.plugins.query({ search: $('search').value.trim() || undefined, insertType: 'effect_0', ...(sel ? { channelUid: sel.tracks[0].id, sessionUid: s.uid } : {}), limit: 400 });
      } catch (e) { note('plugins', { e: errText(e) }); found = []; }
      paintPicker();
    }
    function paintPicker() {
      const q = $('search').value.trim().toLowerCase();
      const ok = (r) => !q || `${r.name} ${r.manufacturer ?? ''}`.toLowerCase().includes(q);
      const opt = (r) => Object.assign(document.createElement('option'), { value: r.pluginId, textContent: r.manufacturer ? `${r.name} — ${r.manufacturer}` : r.name });
      const group = (label, rows) => { const g = document.createElement('optgroup'); g.label = label; g.append(...rows.map(opt)); return g; };
      const keep = $('plugins').value;
      const groups = [];
      const rec = recents.filter(ok).filter((r) => !found.length || found.some((f) => f.pluginId === r.pluginId));
      if (rec.length) groups.push(group(t('recent'), rec));
      const fav = found.filter((r) => r.favorite && ok(r));
      if (fav.length) groups.push(group(t('favs'), fav));
      groups.push(group(t('all'), found.filter(ok)));
      $('plugins').replaceChildren(...groups);
      if (keep) $('plugins').value = keep;
    }
    const nameOf = (id) => found.find((r) => r.pluginId === id)?.name ?? recents.find((r) => r.pluginId === id)?.name ?? id;
    function addPlugin() {
      const id = $('plugins').value;
      if (!id || chain.length >= MAX_CHAIN || job) return;
      chain.push({ pluginId: id, name: nameOf(id), presetUid: '' });
      recents = [{ pluginId: id, name: nameOf(id) }, ...recents.filter((r) => r.pluginId !== id)].slice(0, 8);
      store.set('recents', recents);
      saveChain(); paintChain(); paintPicker(); paintSel();
    }
    function paintChain() {
      const box = $('chain');
      $('add').disabled = !!job || chain.length >= MAX_CHAIN;
      if (!chain.length) { box.replaceChildren(Object.assign(document.createElement('div'), { className: 'empty', textContent: t('noChain') })); return; }
      box.replaceChildren(...chain.map((c, i) => {
        const row = document.createElement('div');
        row.className = 'link';
        row.innerHTML = '<span class="n"></span><span class="nm"></span><select></select><button>✕</button>';
        row.querySelector('.n').textContent = String(i + 1);
        row.querySelector('.nm').textContent = c.name; row.querySelector('.nm').title = c.name;
        const sel = row.querySelector('select');
        sel.append(Object.assign(document.createElement('option'), { value: '', textContent: t('preset') }));
        luna.presets.query({ pluginId: c.pluginId }).then((rows) => {
          sel.append(...rows.map((r) => Object.assign(document.createElement('option'), { value: r.uid, textContent: r.name })));
          sel.value = c.presetUid || '';
        }).catch(() => undefined);
        sel.disabled = !!job;
        sel.onchange = () => { c.presetUid = sel.value; saveChain(); };
        const x = row.querySelector('button'); x.disabled = !!job; x.setAttribute('aria-label', '✕');
        x.onclick = () => { chain.splice(i, 1); saveChain(); paintChain(); paintSel(); };
        return row;
      }));
    }
    repaint = () => { paintSel(); paintChain(); paintPicker(); $('listen').textContent = tr.playing.value && job ? t('stop') : t('listen'); };

    // ---- Tracks and copies -------------------------------------------------------------------------------
    async function copySpan(from, to, S, E) {
      const lane = s.playlistFor(from);
      await lane.clips.load();
      const over = lane.clips.items.filter((c) => c.clipType?.value !== 'midi' && c.stop.value > S && c.start.value < E);
      for (const c of over) {
        const copy = await s.insertClip({ trackUid: to.id, copyOf: c, startTick: c.start.value, stopTick: c.stop.value, layer: c.layer.value });
        const a = Math.max(c.start.value, S), b = Math.min(c.stop.value, E);
        if (a !== c.start.value || b !== c.stop.value) await copy.trim(a, b);
      }
      return over.length;
    }
    async function clearTrack(tk) {
      const lane = s.playlistFor(tk);
      await lane.clips.load();
      for (const c of [...lane.clips.items]) await c.delete().catch(() => undefined);
    }
    async function newTrack(name, like, muted = false) {
      const [tk] = await s.newTrack({ name, trackType: 'audio', stemFormat: like.stemFormat?.value ?? 'stereo' });
      await tk.loadStrip?.().catch(() => undefined);
      if (typeof like.color?.value === 'number') await tk.color?.set?.(like.color.value).catch(() => undefined);
      if (muted) {
        const m = tk.controls?.byId?.('mute') ? tk.controls.get('mute') : null;
        await m?.real?.set(true).catch(() => undefined);
      }
      return tk;
    }
    const soloOf = (ch) => (ch.controls?.byId?.('solo') ? ch.controls.get('solo') : null);

    // ---- 1 · Prepare -----------------------------------------------------------------------------------
    async function prepare() {
      const sel = selection();
      if (!sel || !chain.length || job) return;
      $('prep').disabled = true;
      say('preparing');
      try {
        const temp = await newTrack('LunaSuite', sel.tracks[0]);
        job = { ...sel, temp, tail: tailTicks(sel.E), loopWas: { looping: tr.looping.value, S: tr.loopStart?.value, E: tr.loopStop?.value }, soloed: false };
        const n = await copySpan(sel.tracks[0], temp, sel.S, sel.E);
        for (const [i, c] of chain.entries()) {
          await temp.effects.byId(`effect_${i}`).setPlugin(c.pluginId, c.presetUid ? { presetUid: c.presetUid } : {});
        }
        for (let i = chain.length - 1; i >= 0; i--) await temp.effects.byId(`effect_${i}`).openEditor().catch(() => undefined);
        note('prepared', { tracks: sel.tracks.map((x) => x.name.value), S: sel.S, E: sel.E, tail: job.tail, clips: n, chain });
        $('listen').disabled = false; $('render').disabled = false; $('cancel').disabled = false;
        say('ready');
        repaint();
      } catch (e) {
        note('prepare failed', { e: errText(e) });
        say('failed', { e: errText(e) }, 'bad', 8000);
        await cleanup();
      }
    }

    async function listen() {
      if (!job) return;
      try {
        const solo = soloOf(job.temp);
        if (!tr.playing.value) {
          await tr.setLoop(job.S, job.E + job.tail);
          if (!tr.looping.value) await tr.looping.set(true);
          if (solo && !solo.on) { await solo.real.set(true); job.soloed = true; }
          await tr.playStart.set(job.S);
          await tr.play();
        } else {
          await tr.stop();
          if (job.soloed && solo) { await solo.real.set(false); job.soloed = false; }
        }
      } catch (e) { note('listen', { e: errText(e) }); }
      repaint();
    }

    // ---- 2 · Render ------------------------------------------------------------------------------------
    async function render() {
      if (!job) return;
      $('render').disabled = true; $('listen').disabled = true; $('cancel').disabled = true;
      const j = job;
      let done = 0;
      try {
        if (tr.playing.value) await tr.stop();
        const solo = soloOf(j.temp);
        if (j.soloed && solo) { await solo.real.set(false); j.soloed = false; }
        const stop = j.E + j.tail;
        const lenAll = nsBetween(j.S, stop), lenMain = nsBetween(j.S, j.E);
        const fadeT = opts.fade ? msToTicks(opts.fade, j.S) : 0;
        const split = j.tail > 0 && opts.dest === 'track';
        for (const [i, orig] of j.tracks.entries()) {
          say('rendering', { i: i + 1, n: j.tracks.length });
          if (i > 0) { await clearTrack(j.temp); await copySpan(orig, j.temp, j.S, j.E); }
          const { render: r, fileUids } = await s.bounce({ channelUids: [j.temp.id], range: { startTick: j.S, stopTick: stop }, recordPoint: 'post_effects', name: `${orig.name.value} LunaSuite` });
          await r.done(300000).catch((e) => { if (!/removed/i.test(errText(e))) throw e; });
          const file = fileUids[0];
          if (opts.keep) {
            const keep = await newTrack(`${orig.name.value} · ${t('original')}`, orig, true);
            await copySpan(orig, keep, j.S, split ? j.E : stop);
          }
          // The processed span (and, unless it goes to its own track, the tail that covers what follows).
          const main = await s.insertClip({ trackUid: orig.id, sourceUid: file, startTick: j.S, stopTick: split ? j.E : stop, sourceStartNs: 0, sourceStopNs: split ? lenMain : lenAll, name: `${orig.name.value} · LunaSuite` });
          if (fadeT) {
            await main.setFadeIn(fadeT).catch(() => undefined);
            if (!split) await main.setFadeOut(fadeT).catch(() => undefined);
          }
          if (split) {
            const tailTk = await newTrack(`${orig.name.value} · ${t('tailName')}`, orig);
            const tc = await s.insertClip({ trackUid: tailTk.id, sourceUid: file, startTick: j.E, stopTick: stop, sourceStartNs: lenMain, sourceStopNs: lenAll, name: `${orig.name.value} · ${t('tailName')}` });
            if (fadeT) await tc.setFadeOut(fadeT).catch(() => undefined);
          }
          note('rendered', { track: orig.name.value, file, S: j.S, E: j.E, stop, split, samples: r.totalSamples?.value });
          done++;
        }
        say('done', { n: done }, 'ok', 6000);
      } catch (e) {
        note('render failed', { e: errText(e), done });
        say('failed', { e: errText(e) }, 'bad', 8000);
      }
      await cleanup();
    }

    async function cleanup() {
      const j = job; job = null;
      if (j) {
        try {
          if (tr.playing.value) await tr.stop();
          await s.deleteTracks([j.temp.id]).catch(() => undefined);
          if (typeof j.loopWas.S === 'number' && typeof j.loopWas.E === 'number' && j.loopWas.E > j.loopWas.S) await tr.setLoop(j.loopWas.S, j.loopWas.E).catch(() => undefined);
          if (tr.looping.value !== j.loopWas.looping) await tr.looping.set(!!j.loopWas.looping).catch(() => undefined);
        } catch { /* best effort */ }
      }
      $('listen').disabled = true; $('render').disabled = true; $('cancel').disabled = true;
      repaint();
    }

    $('search').oninput = () => { paintPicker(); clearTimeout(searchTimer); searchTimer = setTimeout(() => void listPlugins(), 300); };
    $('plugins').ondblclick = addPlugin;
    $('plugins').onkeydown = (ev) => { if (ev.key === 'Enter') addPlugin(); };
    $('add').onclick = addPlugin;
    $('prep').onclick = () => void prepare();
    $('listen').onclick = () => void listen();
    $('render').onclick = () => void render();
    $('cancel').onclick = async () => { await cleanup(); say('cancelled', {}, '', 3000); };
    // A report for support: Alt-click the version number.
    $('ver').onclick = async (ev) => {
      if (!ev.altKey) return;
      const text = JSON.stringify({ version: VERSION, opts, chain, job: job && { S: job.S, E: job.E, tail: job.tail, tracks: job.tracks.map((x) => x.name.value) }, log }, null, 2);
      try { await navigator.clipboard.writeText(text); say('copied', {}, 'ok', 3000); } catch { /* nothing to do */ }
    };
    for (const p of [ctx.selectionStart, ctx.selectionStop, ctx.selectionTracks]) p.onChange?.(() => { if (!job) paintSel(); });
    tr.playing.onChange?.(() => repaint());
    await listPlugins();
    repaint();
  }

  (async () => {
    for (;;) {
      try { luna = await Luna.connect(); break; }
      catch { say('waiting'); await new Promise((r) => setTimeout(r, 1500)); }
    }
    Luna.bindShortcuts(luna, { onError: () => undefined });
    await luna.sessions.ready();
    luna.sessions.focused.onChange(() => void build());
    await build();
  })();
})();
