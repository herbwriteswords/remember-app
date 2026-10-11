/* RemEmber — app UI. Data lives in localStorage on this device only. */
(() => {
const M = window.Method, B = window.Bible;
const KEY = 'remember.state.v1', ESVKEY = 'remember.esvkey';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => M.ymd(new Date());
const FLAME = '<svg viewBox="0 0 24 24"><path fill="#52b9a4" d="M12 2.5c.9 2.9 4.6 4.6 4.6 9.1a4.6 4.6 0 0 1-9.2 0c0-2 .9-3.3 2-4.3.2 1.7 1.1 2.7 2.2 3.1-.7-2.5-.5-5.2.4-7.9Z"/><rect x="10.05" y="11.6" width="1.15" height="2.9" rx=".58" fill="#0a1614" transform="rotate(-14 10.6 13)"/><rect x="12.85" y="11.6" width="1.15" height="2.9" rx=".58" fill="#0a1614" transform="rotate(-14 13.4 13)"/></svg>';
const ICON = {
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
};

// ---------- STATE ----------
let S = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.verses) return s; } catch {}
  return { verses: [], settings: { translation: 'esv', reminder: '07:30', showStreak: true }, days: [] };
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
const cleanKey = k => String(k || '').replace(/^\s*(authorization:\s*)?token\s+/i, '').replace(/\s+/g, '').replace(/^["']|["']$/g, '');
const esvKey = () => cleanKey(localStorage.getItem(ESVKEY));
const uid = () => Math.random().toString(36).slice(2, 10);
function trName(id) { return (B.TRANSLATIONS.find(t => t.id === id) || {}).name || id.toUpperCase(); }

function addVerse(p) {
  const v = Object.assign({ id: uid(), stage: 0, cleanStreak: 0, missStreak: 0, history: [], added: today(), due: today(), status: 'queued', order: Date.now() + Math.random() }, p);
  v.passage = `${v.book} ${v.chapter}`;
  S.verses.push(v); promoteQueue(); save(); return v;
}
// One new verse at a time: when nothing is in the daily stage, the next queued verse becomes current.
function promoteQueue() {
  if (!M.METHOD.oneNewVerseAtATime) { S.verses.forEach(v => { if (v.status === 'queued') v.status = 'learning'; }); return; }
  if (S.verses.some(v => v.status === 'learning' && v.text)) return;
  const next = S.verses.filter(v => v.status === 'queued' && v.text && v.held !== today()).sort((a, b) => a.order - b.order)[0];
  if (next) { next.status = 'learning'; next.stage = 0; next.due = today(); }
}
const current = () => S.verses.filter(v => v.status === 'learning').sort((a, b) => a.order - b.order);
const dueReviews = () => S.verses.filter(v => (v.status === 'reviewing' || v.status === 'memorized') && v.text && v.due <= today()).sort((a, b) => a.due.localeCompare(b.due));
// Cumulative passage: earlier verses of the same passage that are already being learned/reviewed.
function passageMates(v) {
  return S.verses.filter(o => o.id !== v.id && o.passage === v.passage && o.status !== 'queued' && o.text && (o.to || o.from) < v.from).sort((a, b) => a.from - b.from);
}
function combo(v) {
  const mates = passageMates(v); if (!mates.length) return null;
  const all = [...mates, v];
  return { ids: all.map(x => x.id), ref: B.refString(v.book, v.chapter, all[0].from, v.to || v.from), text: all.map(x => x.text).join(' '), translation: v.translation, primary: v.id };
}
function markDay() { const d = today(); if (!S.days.includes(d)) { S.days.push(d); S.days = S.days.slice(-400); } }
function rhythm() { // consecutive days ending today or yesterday — never shames a gap
  let n = 0, d = new Date(); if (!S.days.includes(M.ymd(d))) d.setDate(d.getDate() - 1);
  while (S.days.includes(M.ymd(d))) { n++; d.setDate(d.getDate() - 1); } return n;
}

// ---------- UI SHELL ----------
let tab = 'today';
const view = $('#view');
function go(t) { tab = t; document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); flow = null; render(); window.scrollTo(0, 0); }
document.querySelectorAll('.tab').forEach(b => b.onclick = () => go(b.dataset.tab));
function render() {
  view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  if (flow) return renderFlow();
  ({ today: renderToday, practice: renderPractice, library: renderLibrary, settings: renderSettings })[tab]();
}
function toast(msg, undo) {
  const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button id="undo">Undo</button>' : ''}`; t.classList.toggle('act', !!undo); t.classList.add('show');
  if (undo) $('#undo').onclick = () => { t.classList.remove('show'); undo(); };
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), undo ? 5000 : 2600);
}
// Remove / requeue with undo. The next queued verse is promoted if the daily verse left.
function snapshot() { return JSON.stringify(S.verses); }
function restore(snap) { S.verses = JSON.parse(snap); save(); render(); toast('Restored'); }
function removeVerse(id) {
  const v = S.verses.find(x => x.id === id); if (!v) return; const snap = snapshot();
  S.verses = S.verses.filter(x => x.id !== id); promoteQueue(); save(); render();
  toast(`Removed ${v.ref}`, () => restore(snap));
}
function requeueVerse(id) {
  const v = S.verses.find(x => x.id === id); if (!v) return; const snap = snapshot();
  v.status = 'queued'; v.stage = 0; v.cleanStreak = 0; v.missStreak = 0;
  v.order = Math.max(...S.verses.map(x => x.order)) + 1; // back of the line
  v.held = today(); promoteQueue(); // it won't be re-promoted until tomorrow
  save(); render(); toast(`${v.ref} moved back to the queue`, () => restore(snap));
}
function confirmDaily(id) {
  const v = S.verses.find(x => x.id === id); if (!v) return;
  sheet(`<p class="ref" style="font-size:18px;margin:0 2px 4px">${esc(v.ref)}</p><p class="small muted" style="margin:0 2px 16px">What would you like to do with today’s verse?</p>
    <button class="btn block danger" id="cx-rm">Remove this verse</button><div style="height:10px"></div>
    <button class="btn block" id="cx-q">Move back to queue</button><div style="height:10px"></div>
    <button class="btn block ghost" id="cx-c">Cancel</button>`, s => {
    $('#cx-rm', s).onclick = () => { closeSheet(); removeVerse(id); };
    $('#cx-q', s).onclick = () => { closeSheet(); requeueVerse(id); };
    $('#cx-c', s).onclick = closeSheet;
  });
}
function sheet(html, onMount) {
  const w = $('#sheet-wrap'), s = $('#sheet'); $('#toast').classList.remove('show'); s.innerHTML = '<div class="grab"></div>' + html; w.hidden = false;
  $('#sheet-backdrop').onclick = closeSheet; onMount && onMount(s);
}
function closeSheet() { $('#sheet-wrap').hidden = true; $('#sheet').innerHTML = ''; }
const brand = () => `<div class="brand">${FLAME}<b>Rem<em>Ember</em></b></div>`;
function niceDate(d) { if (!d) return '—'; if (d <= today()) return 'Today'; if (d === M.addDays(today(), 1)) return 'Tomorrow'; return new Date(d + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

// ---------- TODAY ----------
function renderToday() {
  promoteQueue(); save();
  const cur = current(), due = dueReviews(), r = rhythm();
  const missingText = S.verses.filter(v => !v.text);
  let h = `<div class="topline">${brand()}${S.settings.showStreak && r > 1 ? `<span class="pill ember" title="Days practiced in a row">${FLAME.replace('<svg', '<svg width="14" height="14"')} ${r} days</span>` : ''}</div>
  <h1>${greeting()}, Herb.</h1><p class="muted">${cur.length || due.length ? 'Here’s what’s on the table today.' : S.verses.length ? 'You’re all caught up. Rest in it.' : 'Pick a verse to begin.'}</p>`;
  if (cur.length) {
    h += `<h2>Learning</h2>`;
    cur.forEach(v => {
      const st = M.METHOD.stages[0];
      h += `<div class="card hero"><div class="row between"><span class="ref">${esc(v.ref)}<span class="tr">${trName(v.translation)}</span></span><span class="row" style="gap:8px"><span class="status learning">Daily</span><button class="xbtn" data-x="${v.id}" aria-label="Remove or requeue ${esc(v.ref)}">✕</button></span></div>
      ${v.text ? `<p class="verse">${esc(v.text)}</p>` : `<p class="muted" style="margin-top:10px">Text needed — tap below to paste it or add your ESV key.</p>`}
      <div class="row between" style="margin-top:14px"><span class="small muted">${v.cleanStreak}/${st.advanceAfter} clean recitals in a row${v.lastCounted === today() ? ' · done for today ✓' : ''}</span></div>
      <div class="bar"><i style="width:${100 * v.cleanStreak / st.advanceAfter}%"></i></div>
      <div class="spacer"></div><button class="btn primary block" data-practice="${v.id}">${!v.text ? 'Add text' : v.lastCounted === today() ? 'Practice again' : 'Start today’s verse'}</button></div>`;
      const c = combo(v);
      if (c) h += `<div class="card"><div class="row between"><div><div class="ref">${esc(c.ref)}</div><div class="small muted">Recite the passage together, cumulatively</div></div><button class="btn sm" data-combo="${v.id}">Recite</button></div></div>`;
    });
  }
  if (due.length) {
    h += `<h2>Review · ${due.length}</h2><div class="list">` + due.map(v => `<div class="item" data-practice="${v.id}"><div class="grow"><div class="ref">${esc(v.ref)}</div><div class="meta">${M.METHOD.stages[v.stage].label} review</div></div><span class="chev">›</span></div>`).join('') + '</div>';
  }
  if (S.verses.some(v => v.text && v.status !== 'queued')) {
    h += `<div class="spacer"></div><button class="btn block" data-act="recall">📖 Recall a verse by reference</button>`;
  }
  if (missingText.length) h += `<div class="note">${missingText.length} saved verse${missingText.length > 1 ? 's need' : ' needs'} text. Open it in Library to paste it, or add your ESV key in Settings.</div>`;
  if (S.verses.length && !cur.length && !due.length) h += `<div class="spacer"></div><button class="btn primary block" data-act="add">${ICON.plus} Add a verse</button>`;
  if (!S.verses.length) h += `<div class="empty">${FLAME}<p>Your library is empty.</p><div class="spacer"></div><button class="btn primary" data-act="add">${ICON.plus} Add a verse</button></div>`;
  view.innerHTML = h; bind();
}
function bind() {
  view.querySelectorAll('[data-practice]').forEach(b => b.onclick = () => startPractice(b.dataset.practice));
  view.querySelectorAll('[data-combo]').forEach(b => b.onclick = () => startPractice(b.dataset.combo, { combo: true }));
  view.querySelectorAll('[data-x]').forEach(b => b.onclick = e => { e.stopPropagation(); confirmDaily(b.dataset.x); });
  view.querySelectorAll('[data-act]').forEach(b => b.onclick = () => ({ add: openAdd, recall: startRecall })[b.dataset.act]());
}

// ---------- PRACTICE TAB ----------
function renderPractice() {
  const cur = current(), due = dueReviews(), ready = S.verses.filter(v => v.text && v.status !== 'queued');
  let h = `${brand()}<h1>Practice</h1><p class="muted">Read, hide, recite. Hints whenever you need them.</p><h2>Start</h2><div class="list">`;
  const items = [];
  cur.forEach(v => items.push([`data-practice="${v.id}"`, 'Today’s verse', v.ref]));
  due.forEach(v => items.push([`data-practice="${v.id}"`, 'Review', v.ref]));
  items.push(['data-act="recall"', 'Recall by reference', 'Recite a verse from its reference alone']);
  h += items.map(([a, t, s]) => `<div class="item" ${a}><div class="grow"><div style="font-weight:600">${esc(t)}</div><div class="meta">${esc(s)}</div></div><span class="chev">›</span></div>`).join('') + '</div>';
  if (ready.length) h += `<h2>Any verse</h2><div class="list">` + ready.map(v => `<div class="item" data-practice="${v.id}"><div class="grow"><div class="ref">${esc(v.ref)}</div></div><span class="status ${v.status}">${v.status}</span></div>`).join('') + '</div>';
  view.innerHTML = h; bind();
}

// ---------- PRACTICE FLOW ----------
let flow = null; // {mode, v, ref, text, step, hint, reveal, warm, result, ...}
function startPractice(id, opt = {}) {
  const v = S.verses.find(x => x.id === id); if (!v) return;
  if (!v.text) { openVerse(v.id); return toast('Add this verse’s text first.'); }
  const c = opt.combo ? combo(v) : null;
  flow = { mode: c ? 'combo' : 'verse', id, ref: c ? c.ref : v.ref, text: c ? c.text : v.text, translation: v.translation, step: opt.skipRead ? 'recite' : 'read', warm: 0, hint: false, reveal: 0, title: opt.title };
  if (tab !== 'practice') { tab = 'practice'; document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === 'practice')); }
  render(); window.scrollTo(0, 0);
}
function stepBar(i) { return `<div class="steps">${[0, 1, 2].map(k => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`; }
function head(back = true) { return `<div class="row between">${back ? '<button class="btn ghost sm" id="x">✕ Close</button>' : '<span></span>'}<span class="small faint">${esc(flow.title || (flow.mode === 'combo' ? 'Passage review' : 'Practice'))}</span></div>`; }
function renderFlow() {
  const f = flow; let h = '';
  if (f.step === 'read') {
    const warmText = [esc(f.text), esc(M.firstLetters(f.text)), '<span class="hidden">— say it from memory —</span>'][f.warm];
    h = head() + stepBar(0) + `<div class="card hero"><div class="ref">${esc(f.ref)}<span class="tr">${trName(f.translation)}</span></div>
      <p class="verse big ${f.warm === 1 ? 'letters' : ''}" id="readtext">${warmText}</p></div>
      <p class="small muted" style="margin:6px 2px 16px">${['Read it slowly, out loud if you can. Reference, verse, reference.', 'Warm-up: first letters only. Say each word.', 'Warm-up: now from memory.'][f.warm]}</p>
      <div class="row"><button class="btn grow" id="repeat">${f.warm < 2 ? 'Repeat · ' + ['first letters', 'blank'][f.warm] : 'Read again'}</button><button class="btn primary grow" id="next">Next</button></div>`;
    view.innerHTML = h;
    $('#repeat').onclick = () => { f.warm = (f.warm + 1) % 3; render(); };
    $('#next').onclick = () => { f.step = 'recite'; render(); };
  } else if (f.step === 'recite') {
    const words = f.text.split(/\s+/), fl = M.firstLetters(f.text).split(' ');
    const hintText = f.reveal ? words.slice(0, f.reveal).map(esc).join(' ') + ' <span class="letters" style="color:var(--ember2);letter-spacing:.05em">' + esc(fl.slice(f.reveal).join(' ')) + '</span>' : esc(M.firstLetters(f.text));
    h = head() + stepBar(1) + `<div class="ref" style="margin:4px 2px 10px">${esc(f.ref)}</div>
      ${f.hint ? `<div class="card" id="hintbox"><div class="small muted" style="margin-bottom:4px">Hint</div><p class="verse" style="margin-top:4px">${hintText}</p></div>` : ''}
      <textarea id="ans" placeholder="Type it from memory, or tap the mic…" autocapitalize="sentences" spellcheck="false">${esc(f.answer || '')}</textarea>
      <div class="row wrap" style="margin:12px 0">
        <button class="btn sm" id="mic" ${SR ? '' : 'disabled title="Dictation isn’t available in this browser"'}>${ICON.mic} ${SR ? 'Dictate' : 'No dictation'}</button>
        <button class="btn sm" id="hint">${ICON.bulb} ${f.hint ? 'Hide hint' : 'Hint'}</button>
        ${f.hint ? `<button class="btn sm" id="reveal" ${f.reveal >= words.length ? 'disabled' : ''}>Reveal next word</button>` : ''}
      </div>
      ${SR ? '' : '<p class="small faint">Dictation isn’t supported here. On iPhone you can also use the keyboard’s 🎤 key.</p>'}
      <div class="spacer"></div><button class="btn primary block" id="check">Check</button>`;
    view.innerHTML = h;
    const ta = $('#ans'); ta.oninput = () => f.answer = ta.value;
    $('#hint').onclick = () => { f.hint = !f.hint; f.usedHint = f.usedHint || f.hint; render(); };
    $('#reveal') && ($('#reveal').onclick = () => { f.reveal++; f.usedHint = true; render(); });
    $('#mic').onclick = toggleMic;
    $('#check').onclick = () => { stopMic(); check(); };
  } else if (f.step === 'result') {
    const r = f.result;
    const toks = f.text.split(/\s+/).filter(t => M.words(t).length); let ti = 0;
    if (toks.length === r.diff.filter(d => d.expected).length) r.diff.forEach(d => { if (d.expected) d.expected = toks[ti++]; });
    const diff = r.diff.map(d => d.type === 'ok' ? `<span class="ok">${esc(d.expected)}</span>` : d.type === 'wrong' ? `<span class="wrong">${esc(d.expected)}</span><small>you: ${esc(d.got)}</small>` : d.type === 'missing' ? `<span class="missing">${esc(d.expected)}</span>` : `<span class="extra">${esc(d.got)}</span>`).join(' ');
    const n = r.diff.filter(d => d.type !== 'ok').length;
    h = head() + stepBar(2) + `<div class="card ${r.clean ? 'hero' : ''}"><div class="result-badge ${r.clean ? 'clean' : 'miss'}">${r.clean ? '✓ Clean' : 'Almost there'}</div>
      <p class="small muted" style="margin-top:4px">${r.clean ? (f.usedHint ? 'Every word matched — with a hint, so it counts as practice.' : 'Every word, exactly.') : `${n} word${n > 1 ? 's' : ''} to tighten up. Gold = missed, red = different word, grey = extra.`}</p>
      <div class="ref" style="margin-top:14px">${esc(f.ref)}</div><p class="diff">${diff}</p>
      ${r.refNote ? `<div class="note">${esc(r.refNote)}</div>` : ''}
      ${f.schedNote ? `<div class="note">${esc(f.schedNote)}</div>` : ''}</div>
      <div class="row" style="margin-top:14px"><button class="btn grow" id="again">Try again</button><button class="btn primary grow" id="done">Done</button></div>`;
    view.innerHTML = h;
    $('#again').onclick = () => { Object.assign(f, { step: 'recite', answer: '', hint: false, reveal: 0, usedHint: false }); render(); };
    $('#done').onclick = () => { const back = f.from || 'today'; flow = null; go(back); };
  }
  $('#x') && ($('#x').onclick = () => { stopMic(); flow = null; render(); });
}
function check() {
  const f = flow; const r = M.grade(f.answer || '', f.text, f.ref);
  f.result = r; f.step = 'result'; f.schedNote = '';
  const v = S.verses.find(x => x.id === f.id);
  const counted = r.clean && (f.usedHint && !M.METHOD.hintCountsAsClean) ? false : r.clean;
  if (v && f.answer && f.answer.trim()) {
    markDay();
    const isScheduled = v.status === 'learning' || v.due <= today();
    if (isScheduled && !(r.clean && f.usedHint && !M.METHOD.hintCountsAsClean)) {
      const before = v.stage, already = v.lastCounted === today(), replaced = already && counted && v.lastCountedClean === false;
      M.applyResult(v, counted, today());
      if (replaced) f.schedNote = `Clean today — that’s what counts. ${v.stage > before ? 'Moving up to ' + M.METHOD.stages[v.stage].label + '.' : 'Next: ' + niceDate(v.due) + '.'}`;
      else if (already) f.schedNote = 'Already counted today — this one is bonus practice.';
      else if (v.stage > before) f.schedNote = `Moving up: next review in ${M.METHOD.stages[v.stage].intervalDays} days (${M.METHOD.stages[v.stage].label}).`;
      else if (counted) f.schedNote = `Next: ${niceDate(v.due)}.`;
      else f.schedNote = v.stage === 0 ? 'No problem — it stays your verse for today. Try again whenever.' : `Same interval for now — next review ${niceDate(v.due)}.`;
      if (v.status !== 'learning') promoteQueue();
    } else { (v.history = v.history || []).push({ date: today(), clean: counted, extra: true }); f.schedNote = f.usedHint && r.clean ? 'Hints used, so this counted as practice. Try it once without hints to count it.' : 'Extra practice — doesn’t change the schedule.'; }
    save();
  }
  render(); window.scrollTo(0, 0);
}

// ---------- DICTATION ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
function toggleMic() { rec ? stopMic() : startMic(); }
function startMic() {
  if (!SR) return;
  try {
    rec = new SR(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true;
    const base = (flow.answer || '').trim();
    rec.onresult = e => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' '; flow.answer = (base ? base + ' ' : '') + t.trim(); const ta = $('#ans'); if (ta) ta.value = flow.answer; };
    rec.onerror = e => { toast(e.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Dictation stopped (' + e.error + ').'); stopMic(); };
    rec.onend = () => { rec = null; const b = $('#mic'); if (b) { b.classList.remove('rec'); b.innerHTML = ICON.mic + ' Dictate'; } };
    rec.start(); const b = $('#mic'); b.classList.add('rec'); b.innerHTML = ICON.mic + ' Listening… tap to stop';
  } catch (e) { rec = null; toast('Dictation isn’t available right now.'); }
}
function stopMic() { if (rec) { try { rec.stop(); } catch {} rec = null; } }

// ---------- RECALL DRILL ----------
function startRecall() {
  const pool = S.verses.filter(v => v.text && v.status !== 'queued');
  if (!pool.length) return toast('Save a verse first.');
  const due = pool.filter(v => v.due <= today()), v = (due.length ? due : pool)[Math.floor(Math.random() * (due.length || pool.length))];
  startPractice(v.id, { skipRead: true, title: `Recite ${v.ref}` });
}

// ---------- LIBRARY ----------
let libFilter = 'all';
function renderLibrary() {
  const vs = S.verses.slice().sort((a, b) => a.order - b.order);
  const counts = s => vs.filter(v => s === 'all' || v.status === s).length;
  const list = vs.filter(v => libFilter === 'all' || v.status === libFilter);
  let h = `<div class="topline">${brand()}<button class="btn sm primary" id="add">${ICON.plus} Add</button></div><h1>Library</h1><p class="muted">${vs.length} saved · ${counts('memorized')} memorized</p>
   <div class="seg" style="margin:18px 0 8px">${['all', 'learning', 'reviewing', 'memorized', 'queued'].map(s => `<button class="${libFilter === s ? 'on' : ''}" data-f="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div>`;
  h += list.length ? `<div class="list">` + list.map(v => `<div class="swipe" data-id="${v.id}"><button class="swipe-del" tabindex="-1">Delete</button><div class="item" data-open="${v.id}"><div class="grow"><div class="row between"><span class="ref">${esc(v.ref)}<span class="tr">${trName(v.translation)}</span></span><span class="status ${v.status}">${v.status}</span></div>
      <div class="meta" style="margin-top:3px">${!v.text ? 'Needs text' : v.status === 'queued' ? 'Up next after the current verse' : `${M.METHOD.stages[v.stage].label} · next ${niceDate(v.due)}`}</div><div class="bar"><i style="width:${Math.round(100 * M.mastery(v))}%"></i></div></div></div></div>`).join('') + '</div>'
    : `<div class="empty">${FLAME}<p>${vs.length ? 'Nothing here yet.' : 'No verses yet. You choose every one.'}</p></div>`;
  if (vs.some(v => v.translation === 'esv')) h += `<p class="copyright">${esc(B.ESV_COPYRIGHT)}</p>`;
  view.innerHTML = h;
  $('#add').onclick = openAdd;
  view.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { libFilter = b.dataset.f; render(); });
  view.querySelectorAll('.swipe').forEach(initSwipe);
}
// iOS-style swipe-left-to-delete (touch + mouse via Pointer Events). Vertical scroll stays native (touch-action: pan-y).
let openSwipe = null;
const DEL_W = 88;
function closeOpenSwipe(except) { if (openSwipe && openSwipe !== except) { setX(openSwipe, 0, true); openSwipe = null; } }
function setX(row, x, anim) { const it = row.querySelector('.item'); it.style.transition = anim ? 'transform 220ms cubic-bezier(.2,.8,.2,1)' : 'none'; it.style.transform = x ? `translateX(${x}px)` : ''; row.classList.toggle('open', x < 0); row._x = x; }
document.addEventListener('pointerdown', e => { if (openSwipe && !openSwipe.contains(e.target)) closeOpenSwipe(); }, true);
function initSwipe(row) {
  const it = row.querySelector('.item'), id = row.dataset.id; row._x = 0;
  let sx, sy, base, mode = null, moved = false, pid = null;
  it.addEventListener('pointerdown', e => { if (e.button > 0) return; sx = e.clientX; sy = e.clientY; base = row._x || 0; mode = null; moved = false; pid = e.pointerId; });
  it.addEventListener('pointermove', e => {
    if (pid !== e.pointerId || sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!mode) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; mode = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'; if (mode === 'h') { closeOpenSwipe(row); try { it.setPointerCapture(pid); } catch {} } }
    if (mode !== 'h') return;
    moved = true; e.preventDefault();
    let x = Math.min(0, base + dx); const full = -row.offsetWidth;
    if (x < -DEL_W) x = -DEL_W + (x + DEL_W) * .9; // follows finger past the button
    setX(row, Math.max(full, x), false);
    row.classList.toggle('full', x < -row.offsetWidth * .6);
  });
  const end = e => {
    if (pid !== e.pointerId) return; pid = null; sx = null;
    if (mode !== 'h') return;
    const x = row._x;
    if (x < -row.offsetWidth * .6) { setX(row, -row.offsetWidth, true); setTimeout(() => removeVerse(id), 200); openSwipe = null; }
    else if (x < -DEL_W / 2) { setX(row, -DEL_W, true); openSwipe = row; }
    else { setX(row, 0, true); if (openSwipe === row) openSwipe = null; }
    row.classList.remove('full');
  };
  it.addEventListener('pointerup', end); it.addEventListener('pointercancel', end);
  it.addEventListener('click', e => { if (moved) { moved = false; return; } if (row._x < 0) { setX(row, 0, true); openSwipe = null; return; } openVerse(id); });
  row.querySelector('.swipe-del').onclick = e => { e.stopPropagation(); openSwipe = null; row.style.height = row.offsetHeight + 'px'; row.classList.add('gone'); setTimeout(() => removeVerse(id), 180); };
}
function openVerse(id) {
  const v = S.verses.find(x => x.id === id); if (!v) return;
  sheet(`<div class="row between"><span class="ref" style="font-size:18px">${esc(v.ref)}<span class="tr">${trName(v.translation)}</span></span><span class="status ${v.status}">${v.status}</span></div>
    ${v.text ? `<p class="verse">${esc(v.text)}</p>` : `<p class="muted" style="margin-top:10px">Paste the text for this verse (${trName(v.translation)})${v.translation !== 'own' ? ', or load it again:' : ':'}</p>${v.translation !== 'own' ? '<button class="btn sm" id="refetch" style="margin-top:8px">Load text</button>' : ''}`}
    <label class="field"><span>${v.text ? 'Edit text' : 'Verse text'}</span><textarea id="vt" style="min-height:${v.text ? 90 : 140}px;font-size:16px">${esc(v.text)}</textarea></label>
    <p class="small muted">${v.text ? `Stage: ${M.METHOD.stages[v.stage].label} · next ${niceDate(v.due)} · mastery ${Math.round(100 * M.mastery(v))}% · ${v.history.length} recitals` : ''}</p>
    <div class="row" style="margin-top:16px"><button class="btn danger sm" id="rm">Remove</button><span class="grow"></span><button class="btn sm" id="sv">Save</button><button class="btn primary sm" id="pr" ${v.text ? '' : 'disabled'}>Practice</button></div>`, s => {
    const persist = () => { const t = $('#vt', s).value.trim().replace(/\s+/g, ' '); if (t !== v.text) { v.text = t; } promoteQueue(); save(); };
    $('#refetch', s) && ($('#refetch', s).onclick = async e => { e.target.textContent = 'Loading…'; try { v.text = (await B.fetchPassage(v.ref, v.translation, esvKey(), { noCache: true })).text; promoteQueue(); save(); openVerse(id); render(); } catch (err) { e.target.textContent = 'Load text'; toast(err.message); } });
    $('#sv', s).onclick = () => { persist(); closeSheet(); toast('Saved'); render(); };
    $('#pr', s).onclick = () => { persist(); closeSheet(); startPractice(id); };
    $('#rm', s).onclick = () => { closeSheet(); removeVerse(id); };
  });
}

// ---------- ADD VERSE ----------
let add = null;
function openAdd() {
  add = { mode: 'search', tr: S.settings.translation, book: null, chapter: null, sel: new Set(), chapterData: null, preview: null };
  renderAdd();
}
function trOptions(sel) { return B.TRANSLATIONS.map(t => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${t.name} — ${t.full}${t.needsKey && !esvKey() ? ' (needs key)' : ''}</option>`).join(''); }
function renderAdd() {
  const a = add;
  let h = `<div class="row between"><h1 style="font-size:24px">Add verses</h1><button class="btn ghost sm" id="cl">Close</button></div>
   <label class="field"><span>Translation</span><select id="tr">${trOptions(a.tr)}</select></label>
   ${a.tr === 'esv' && !esvKey() ? `<div class="note">ESV text needs your free personal API key from api.esv.org (Settings → ESV API key). Until then you can still save the reference and paste the text.</div>` : ''}
   ${a.tr === 'own' ? `<div class="note">Paste the text from any translation you own (NIV, NLT, CSB…). It stays on this device.</div>` : ''}
   <div class="seg" style="margin:14px 0">${[['search', 'Reference'], ['browse', 'Browse']].map(([k, l]) => `<button class="${a.mode === k ? 'on' : ''}" data-m="${k}">${l}</button>`).join('')}</div>`;
  if (a.mode === 'search') {
    h += `<form class="row" id="qform" action="#" autocomplete="off" novalidate><input type="search" id="q" name="q" placeholder="John 3:16 or Romans 8:28-30" value="${esc(a.q || '')}" inputmode="search" enterkeyhint="search" autocapitalize="words" autocorrect="off" spellcheck="false"><button class="btn" id="find" type="submit">Find</button></form></div><div id="pv"></div>`;
  } else if (!a.book) {
    h += `<div class="list" style="max-height:52vh;overflow:auto">` + B.BOOKS.map(([b, n]) => `<div class="item" data-b="${esc(b)}"><span class="grow">${esc(b)}</span><span class="meta">${n}</span><span class="chev">›</span></div>`).join('') + '</div>';
  } else if (!a.chapter) {
    const n = B.BOOKS.find(x => x[0] === a.book)[1];
    h += `<button class="btn ghost sm" id="bk">‹ Books</button><h2>${esc(a.book)} · chapter</h2><div class="grid">` + Array.from({ length: n }, (_, i) => `<button data-c="${i + 1}">${i + 1}</button>`).join('') + '</div>';
  } else {
    h += `<button class="btn ghost sm" id="bk">‹ ${esc(a.book)}</button><h2>${esc(a.book)} ${a.chapter} · tap verses</h2><div id="vl">${a.chapterErr && !a.chapterData ? `<p class="small" style="color:var(--bad)">${esc(a.chapterErr)}</p>` : a.chapterData ? a.chapterData.verses.map(v => `<div class="vpick ${a.sel.has(v.verse) ? 'on' : ''}" data-v="${v.verse}"><sup>${v.verse}</sup><span>${esc(v.text)}</span></div>`).join('') : '<p class="muted">Loading…</p>'}</div>
     ${a.chapterData && a.chapterData.previewTr && a.chapterData.previewTr !== a.tr ? `<p class="small faint">Preview shown in ${trName(a.chapterData.previewTr)}${a.chapterData.why ? ' (' + esc(a.chapterData.why) + ')' : ''}. Your verses are saved in ${trName(a.tr)}.</p>` : ''}`;
  }
  const selCount = a.mode === 'browse' ? a.sel.size : 0;
  h += a.mode === 'browse' && a.chapter ? `<div class="actionbar ${selCount ? 'show' : ''}" id="abar"><button class="btn ghost sm" id="clearsel">Clear</button><button class="btn primary grow" id="savesel">${addLabel()}</button></div>` : '<div class="sheet-end"></div>';
  sheet(h, s => {
    $('#cl', s).onclick = closeSheet;
    $('#tr', s).onchange = e => { a.tr = e.target.value; a.preview = null; const reload = a.chapter; if (reload) a.chapterData = null; renderAdd(); if (reload) loadChapter(); else if (a.q && a.mode === 'search' && B.parseRef(a.q)) doSearch(); };
    s.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { a.mode = b.dataset.m; renderAdd(); });
    if ($('#qform', s)) { $('#qform', s).addEventListener('submit', e => { e.preventDefault(); a.q = $('#q', s).value; doSearch(); }); if (a.preview) showPreview(); }
    s.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { a.book = b.dataset.b; renderAdd(); });
    s.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { a.chapter = +b.dataset.c; a.sel.clear(); a.chapterData = null; renderAdd(); loadChapter(); });
    $('#bk', s) && ($('#bk', s).onclick = () => { if (a.chapter) a.chapter = null; else a.book = null; renderAdd(); });
    const upd = () => { $('#abar', s).classList.toggle('show', a.sel.size > 0); $('#savesel', s).textContent = addLabel(); };
    s.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { const n = +b.dataset.v; a.sel.has(n) ? a.sel.delete(n) : a.sel.add(n); b.classList.toggle('on'); upd(); });
    $('#clearsel', s) && ($('#clearsel', s).onclick = () => { a.sel.clear(); s.querySelectorAll('.vpick.on').forEach(x => x.classList.remove('on')); upd(); });
    $('#savesel', s) && ($('#savesel', s).onclick = saveSelection);
  });
}
async function loadChapter() {
  const a = add, key = a.book + a.chapter + a.tr; a.chapterErr = '';
  try { const d = await B.fetchChapter(a.book, a.chapter, a.tr, esvKey()); if (add === a && key === a.book + a.chapter + a.tr) a.chapterData = d; }
  catch (e) { a.chapterErr = e.message; }
  if (add === a && a.chapter) renderAdd();
}
// Contiguous runs of selected verses become separate entries (e.g. 1-3 and 6).
function runs() { const v = [...add.sel].sort((x, y) => x - y), out = []; v.forEach(n => { const l = out[out.length - 1]; if (l && n === l[1] + 1) l[1] = n; else out.push([n, n]); }); return out; }
function addLabel() { const n = add.sel.size, r = runs(); return !n ? 'Add' : r.length === 1 ? `Add ${selRef().replace('–', '-')}` : `Add ${n} verses`; }
function selRef() { return runs().map(([x, y]) => B.refString(add.book, add.chapter, x, y)).join(', '); }
async function saveSelection() {
  const a = add; const rs = runs(); const btn = $('#savesel'); if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  let n = 0, failed = [];
  for (const [x, y] of rs) {
    const ref = B.refString(a.book, a.chapter, x, y);
    let text = '';
    const fromPreview = () => a.chapterData && a.chapterData.previewTr === a.tr ? a.chapterData.verses.filter(v => v.verse >= x && v.verse <= y).map(v => v.text).join(' ') : '';
    if (a.tr !== 'own') {
      if (a.tr === 'esv' && !esvKey()) failed.push(`${ref}: no ESV key yet`);
      else { try { text = (await B.fetchPassage(ref, a.tr, esvKey())).text; } catch (e) { text = fromPreview(); if (!text) failed.push(`${ref}: ${e.message}`); } }
    }
    addVerse({ ref, book: a.book, chapter: a.chapter, from: x, to: y, translation: a.tr, text }); n++;
  }
  closeSheet(); render();
  if (failed.length) toast(`Saved, but couldn’t load the text — ${failed[0]}. Open it in Library to paste or retry.`);
  else toast(a.tr === 'own' ? 'Saved — open it in Library to paste your text.' : `Saved ${n > 1 ? n + ' passages' : B.refString(a.book, a.chapter, rs[0][0], rs[0][1])}`);
}
function revealPreview() { requestAnimationFrame(() => { const el = $('#pv'); if (el && el.firstElementChild) el.firstElementChild.scrollIntoView({ block: 'start', behavior: 'smooth' }); }); }
async function doSearch() {
  const a = add, s = $('#sheet'), pv = $('#pv', s);
  const qi = $('#q', s); if (qi) qi.blur(); // dismiss the iOS keyboard so the result isn't hidden behind it
  const p = B.parseRef(a.q || '');
  if (p && !p.from) { a.mode = 'browse'; a.book = p.book; a.chapter = p.chapter; a.sel.clear(); a.chapterData = null; renderAdd(); loadChapter(); return; } // "Hebrews 11" -> browse that chapter
  if (!p) { a.preview = null; pv.innerHTML = `<div class="card errcard"><p style="color:var(--bad)">Couldn’t read that reference. Try “Romans 8:28”.</p><p class="small muted" style="margin-top:6px">You typed: “${esc(a.q || '')}”</p></div><div class="sheet-end"></div>`; revealPreview(); return; }
  const pr = a.preview = { p, text: '', err: '', tr: a.tr };
  if (a.tr === 'esv' && !esvKey()) pr.err = 'No ESV key yet — add it in Settings, or paste the text below.';
  else if (a.tr !== 'own') {
    pv.innerHTML = `<div class="card"><div class="ref">${esc(p.ref)}<span class="tr">${trName(a.tr)}</span></div><p class="muted loading" style="margin-top:10px">Loading ${trName(a.tr)} text…</p></div><div class="sheet-end"></div>`; revealPreview();
    try { const r = await B.fetchPassage(p.ref, a.tr, esvKey()); pr.text = r.text; } catch (e) { pr.err = e.message; }
  }
  if (add !== a || a.preview !== pr || !$('#pv')) return; // sheet changed while loading
  showPreview();
}
function showPreview() {
  const a = add, s = $('#sheet'), pv = $('#pv', s), { p, text, err } = a.preview; if (!pv) return;
  const needPaste = !text;
  pv.innerHTML = `<div class="card"><div class="ref">${esc(p.ref)}<span class="tr">${trName(a.tr)}</span></div>
   ${text ? `<p class="verse">${esc(text)}</p>` : `${err ? `<p class="small" style="color:var(--bad);margin-top:8px">${esc(err)}</p><button class="btn sm" id="retry" style="margin-top:8px">Retry</button>` : ''}<textarea id="paste" style="min-height:120px;font-size:16px;margin-top:10px" placeholder="Paste the verse text here (or leave blank and add it later)"></textarea>`}
   ${a.tr === 'esv' && text ? `<p class="copyright">${esc(B.ESV_COPYRIGHT)}</p>` : ''}</div>
   <div class="actionbar show"><button class="btn ghost sm" id="clearp">Clear</button><button class="btn primary grow" id="savep">Add ${esc(p.ref.replace('–', '-'))}</button></div>`;
  $('#retry', s) && ($('#retry', s).onclick = doSearch);
  revealPreview();
  $('#clearp', s).onclick = () => { a.preview = null; a.q = ''; pv.innerHTML = ''; const q = $('#q', s); q.value = ''; q.focus(); };
  $('#savep', s).onclick = () => {
    const t = needPaste ? $('#paste', s).value.trim().replace(/\s+/g, ' ') : text;
    addVerse({ ref: p.ref, book: p.book, chapter: p.chapter, from: p.from, to: p.to, translation: a.tr, text: t });
    closeSheet(); toast(`Saved ${p.ref}`); render();
  };
}

// ---------- SETTINGS ----------
function renderSettings() {
  const st = S.settings;
  view.innerHTML = `${brand()}<h1>Settings</h1>
  <h2>Bible</h2><div class="card">
   <label class="field" style="margin-top:0"><span>Default translation</span><select id="deftr">${trOptions(st.translation)}</select></label>
   <label class="field"><span>ESV API key</span><input type="password" id="esv" placeholder="Paste your personal key" value="${esc(esvKey())}" autocomplete="off"></label>
   <div class="row"><button class="btn sm" id="testkey">Test key</button><span class="small muted grow" id="testout"></span></div>
   <p class="small muted" style="margin-top:10px">Free for personal use at <b>api.esv.org</b> (create an account → API key). Stored only on this device; never uploaded or included in backups.</p>
   <p class="small muted" style="margin-top:8px">Built-in free texts: KJV, WEB, ASV, BBE, Darby, OEB (public domain, via bible-api.com). NIV and NLT have no free public API — use “Paste my own text”.</p>
  </div>
  <h2>Rhythm</h2><div class="card">
   <label class="field" style="margin-top:0"><span>Daily reminder time</span><input type="time" id="rem" value="${esc(st.reminder)}"></label>
   <p class="small muted">Honest note: a web app on iPhone can’t schedule local reminders by itself (iOS only allows push notifications from a server, and only after adding to Home Screen). So the reliable option is a repeating calendar alarm:</p>
   <div class="spacer"></div><button class="btn sm" id="ics">Add daily reminder to Calendar</button>
   <div class="row between" style="margin-top:16px"><span>Show “days in a row”</span><button class="switch" id="streak" role="switch" aria-checked="${st.showStreak}" aria-label="Show days in a row"><i></i></button></div>
  </div>
  <h2>Your verses</h2><div class="card">
   <button class="btn block" id="seed">Load my current verses</button>
   <p class="small muted" style="margin-top:8px">Romans 4:4–5 (3-day review), Philippians 4:11 (reviewing), 4:12 (current), then 4:13 and Titus 3:4–8 queued.</p>
  </div>
  <h2>Backup</h2><div class="card"><div class="row"><button class="btn grow" id="exp">Export JSON</button><button class="btn grow" id="imp">Import</button></div><input type="file" id="file" accept="application/json,.json" hidden>
   <div class="spacer"></div><button class="btn danger block" id="reset">Reset everything</button></div>
  <p class="copyright">${esc(B.ESV_COPYRIGHT)}</p><p class="copyright">RemEmber keeps everything on this device. Method rules: method.js.</p>`;
  $('#deftr').onchange = e => { st.translation = e.target.value; save(); toast('Default translation: ' + trName(st.translation)); };
  $('#esv').onchange = e => { const k = cleanKey(e.target.value); e.target.value = k; k ? localStorage.setItem(ESVKEY, k) : localStorage.removeItem(ESVKEY); toast(k ? 'ESV key saved on this device' : 'ESV key removed'); fillMissingESV(); };
  $('#testkey').onclick = async () => {
    const k = cleanKey($('#esv').value); if (k !== esvKey()) { k ? localStorage.setItem(ESVKEY, k) : localStorage.removeItem(ESVKEY); $('#esv').value = k; }
    const out = $('#testout'); if (!k) { out.textContent = 'Paste your key first.'; return; }
    out.textContent = 'Testing…'; out.style.color = '';
    try { const r = await B.fetchPassage('John 11:35', 'esv', k, { noCache: true }); out.textContent = `✓ Works: “${r.text}” (${r.ref})`; out.style.color = 'var(--ok)'; fillMissingESV(); }
    catch (e) { out.textContent = '✕ ' + e.message; out.style.color = 'var(--bad)'; }
  };
  $('#rem').onchange = e => { st.reminder = e.target.value; save(); };
  $('#ics').onclick = downloadICS;
  $('#streak').onclick = e => { st.showStreak = !st.showStreak; save(); e.currentTarget.setAttribute('aria-checked', st.showStreak); };
  $('#seed').onclick = seed;
  $('#exp').onclick = () => { const blob = new Blob([JSON.stringify({ app: 'RemEmber', version: 1, exported: new Date().toISOString(), state: S }, null, 2)], { type: 'application/json' }); dl(blob, `remember-backup-${today()}.json`); };
  $('#imp').onclick = () => $('#file').click();
  $('#file').onchange = async e => { try { const j = JSON.parse(await e.target.files[0].text()); const st2 = j.state || j; if (!Array.isArray(st2.verses)) throw 0; if (confirm(`Replace your library with ${st2.verses.length} verses from this backup?`)) { S = st2; save(); toast('Backup restored'); render(); } } catch { toast('That file isn’t a RemEmber backup.'); } };
  $('#reset').onclick = () => { if (confirm('Erase all verses and progress on this device?')) { S = load.call(null, localStorage.removeItem(KEY)); save(); toast('Reset'); render(); } };
}
function dl(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function downloadICS() {
  const [hh, mm] = S.settings.reminder.split(':'), d = today().replace(/-/g, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RemEmber//EN', 'BEGIN:VEVENT', 'UID:remember-daily@local', `DTSTART:${d}T${hh}${mm}00`, 'DURATION:PT10M', 'RRULE:FREQ=DAILY', 'SUMMARY:RemEmber — today’s verse', 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Time for your verse', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  dl(new Blob([ics], { type: 'text/calendar' }), 'remember-reminder.ics');
}
async function fillMissingESV() {
  if (!esvKey()) return; let n = 0;
  for (const v of S.verses.filter(v => !v.text && v.translation === 'esv')) { try { v.text = (await B.fetchPassage(v.ref, 'esv', esvKey())).text; n++; } catch (e) { toast(e.message); break; } }
  if (n) render();
  if (n) { promoteQueue(); save(); toast(`Fetched ESV text for ${n} verse${n > 1 ? 's' : ''}`); }
}
async function seed() {
  const has = r => S.verses.some(v => v.ref === r);
  const T0 = today(), base = Date.now();
  const items = [
    { ref: 'Romans 4:4–5', book: 'Romans', chapter: 4, from: 4, to: 5, status: 'reviewing', stage: 1, due: M.addDays(T0, 1) },
    { ref: 'Philippians 4:11', book: 'Philippians', chapter: 4, from: 11, to: 11, status: 'reviewing', stage: 1, due: T0 },
    { ref: 'Philippians 4:12', book: 'Philippians', chapter: 4, from: 12, to: 12, status: 'learning', stage: 0, due: T0 },
    { ref: 'Philippians 4:13', book: 'Philippians', chapter: 4, from: 13, to: 13, status: 'queued', stage: 0 },
    { ref: 'Titus 3:4–8', book: 'Titus', chapter: 3, from: 4, to: 8, status: 'queued', stage: 0 },
  ];
  let added = 0;
  items.forEach((it, i) => { if (!has(it.ref)) { addVerse(Object.assign({ translation: 'esv', text: '', order: base + i }, it)); added++; } });
  // addVerse may promote; keep the seeded statuses exact
  items.forEach(it => { const v = S.verses.find(x => x.ref === it.ref); if (v && v.status !== it.status && v.history.length === 0) { v.status = it.status; v.stage = it.stage; } });
  save(); toast(added ? `Loaded ${added} verses` : 'Already loaded');
  if (esvKey()) await fillMissingESV(); else toast('Add your ESV key (or paste text in Library) to fill in the words.');
  render();
}

// iOS keyboard: keep the bottom sheet above the keyboard and within the visible viewport.
if (window.visualViewport) {
  const vv = window.visualViewport, fit = () => {
    const kb = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
    document.documentElement.style.setProperty('--kb', kb + 'px');
    document.documentElement.style.setProperty('--vvh', vv.height + 'px');
  };
  vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); fit();
}
// ---------- BOOT ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => { r.update(); document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && r.update()); }).catch(e => console.warn('SW', e));
  let reloaded = false; const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded && !flow) { reloaded = true; location.reload(); } });
}
window.RemEmber = { get state() { return S; }, Method: M };
go('today');
})();
