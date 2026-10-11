/* Bible text sources. ESV via api.esv.org (personal key, stored only on device);
   public-domain translations via bible-api.com (CORS-enabled). */
(function (g) {
  const BOOKS = [["Genesis",50],["Exodus",40],["Leviticus",27],["Numbers",36],["Deuteronomy",34],["Joshua",24],["Judges",21],["Ruth",4],["1 Samuel",31],["2 Samuel",24],["1 Kings",22],["2 Kings",25],["1 Chronicles",29],["2 Chronicles",36],["Ezra",10],["Nehemiah",13],["Esther",10],["Job",42],["Psalms",150],["Proverbs",31],["Ecclesiastes",12],["Song of Solomon",8],["Isaiah",66],["Jeremiah",52],["Lamentations",5],["Ezekiel",48],["Daniel",12],["Hosea",14],["Joel",3],["Amos",9],["Obadiah",1],["Jonah",4],["Micah",7],["Nahum",3],["Habakkuk",3],["Zephaniah",3],["Haggai",2],["Zechariah",14],["Malachi",4],["Matthew",28],["Mark",16],["Luke",24],["John",21],["Acts",28],["Romans",16],["1 Corinthians",16],["2 Corinthians",13],["Galatians",6],["Ephesians",6],["Philippians",4],["Colossians",4],["1 Thessalonians",5],["2 Thessalonians",3],["1 Timothy",6],["2 Timothy",4],["Titus",3],["Philemon",1],["Hebrews",13],["James",5],["1 Peter",5],["2 Peter",3],["1 John",5],["2 John",1],["3 John",1],["Jude",1],["Revelation",22]];
  const TRANSLATIONS = [
    { id: 'esv', name: 'ESV', full: 'English Standard Version', needsKey: true },
    { id: 'kjv', name: 'KJV', full: 'King James Version' },
    { id: 'web', name: 'WEB', full: 'World English Bible' },
    { id: 'webbe', name: 'WEBBE', full: 'World English Bible, British Ed.' },
    { id: 'asv', name: 'ASV', full: 'American Standard Version (1901)' },
    { id: 'bbe', name: 'BBE', full: 'Bible in Basic English' },
    { id: 'darby', name: 'Darby', full: 'Darby Translation' },
    { id: 'oeb-us', name: 'OEB', full: 'Open English Bible (US)' },
    { id: 'own', name: 'My text', full: 'Paste my own text (any translation)' },
  ];
  const ESV_COPYRIGHT = 'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.';

  const ALIASES = { ps: 'Psalms', psalm: 'Psalms', psa: 'Psalms', phil: 'Philippians', php: 'Philippians', rom: 'Romans', jn: 'John', gen: 'Genesis', prov: 'Proverbs', isa: 'Isaiah', matt: 'Matthew', mt: 'Matthew', eph: 'Ephesians', gal: 'Galatians', heb: 'Hebrews', tit: 'Titus', rev: 'Revelation', col: 'Colossians', jas: 'James', song: 'Song of Solomon', deut: 'Deuteronomy', josh: 'Joshua', mk: 'Mark', lk: 'Luke', ex: 'Exodus' };
  function findBook(s) {
    s = s.trim().toLowerCase().replace(/\.$/, '').replace(/^(i{1,3})\s/, m => ({ 'i ': '1 ', 'ii ': '2 ', 'iii ': '3 ' })[m]);
    const al = s.replace(/^(\d)\s*/, '$1 ');
    const num = al.match(/^(\d) (.*)$/);
    const base = num ? num[2] : al;
    for (const [b] of BOOKS) if (b.toLowerCase() === al) return b;
    const full = ALIASES[base] ? (num ? num[1] + ' ' + ALIASES[base] : ALIASES[base]) : null;
    if (full && BOOKS.some(b => b[0] === full)) return full;
    const hit = BOOKS.find(([b]) => b.toLowerCase().startsWith(al) && al.length >= 2);
    return hit ? hit[0] : null;
  }
  // "Romans 8:28-30" -> {book, chapter, from, to, ref}
  function parseRef(q) {
    const m = String(q).trim().match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
    if (!m) return null;
    const book = findBook(m[1]); if (!book) return null;
    const chapter = +m[2], from = m[3] ? +m[3] : null, to = m[4] ? +m[4] : from;
    const max = BOOKS.find(b => b[0] === book)[1]; if (chapter < 1 || chapter > max) return null;
    if (from && to < from) return null;
    return { book, chapter, from, to, ref: refString(book, chapter, from, to) };
  }
  function refString(book, ch, a, b) { return a ? `${book} ${ch}:${a}${b && b !== a ? '–' + b : ''}` : `${book} ${ch}`; }

  function cleanPD(t) {
    return t.replace(/<[^>]*>/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const CK = 'remember.textcache.v1';
  function cache() { try { return JSON.parse(localStorage.getItem(CK) || '{}'); } catch { return {}; } }
  function putCache(k, v) { const c = cache(); c[k] = v; try { localStorage.setItem(CK, JSON.stringify(c)); } catch {} }

  // ESV request (official API). Note: ESV's *error* replies (401/403/429) carry no CORS headers,
  // so in a browser they surface as a network failure — we explain that instead of hiding it.
  const ESV_URL = 'https://api.esv.org/v3/passage/text/';
  async function esvGet(q, key, extra = {}) {
    const p = new URLSearchParams(Object.assign({ q, 'include-passage-references': 'false', 'include-verse-numbers': 'false', 'include-first-verse-numbers': 'false', 'include-footnotes': 'false', 'include-footnote-body': 'false', 'include-headings': 'false', 'include-short-copyright': 'false', 'include-copyright': 'false', 'include-passage-horizontal-lines': 'false', 'include-heading-horizontal-lines': 'false', 'include-selahs': 'true', 'indent-paragraphs': '0', 'indent-poetry': 'false', 'indent-poetry-lines': '0', 'indent-declares': '0', 'indent-psalm-doxology': '0', 'line-length': '0' }, extra));
    let r;
    try { r = await fetch(ESV_URL + '?' + p, { headers: { Authorization: 'Token ' + key }, cache: 'no-store' }); }
    catch (e) {
      if (!navigator.onLine) throw new Error('You’re offline — connect to load ESV text.');
      throw new Error('ESV didn’t answer the request. Most often this means the API key was rejected (ESV’s error replies are hidden from web apps). Re-copy the key from api.esv.org → My API Applications and tap Test key.');
    }
    if (r.status === 401 || r.status === 403) throw new Error(`ESV rejected the API key (HTTP ${r.status}). Re-copy it from api.esv.org.`);
    if (r.status === 429) throw new Error('ESV rate limit reached (HTTP 429). Try again in a little while.');
    if (!r.ok) throw new Error(`ESV API error (HTTP ${r.status}).`);
    const j = await r.json();
    if (!j.passages || !j.passages.length || !j.passages.join('').trim()) throw new Error(`ESV found no passage for “${q}”.`);
    return j;
  }
  const qref = ref => String(ref).replace(/[–—]/g, '-');
  // Returns {ref, text, verses:[{verse,text}]|null}
  async function fetchPassage(ref, translation, esvKey, opt = {}) {
    const key = translation + '|' + ref;
    const hit = !opt.noCache && cache()[key]; if (hit && hit.text) return hit;
    let out;
    if (translation === 'own') throw new Error('“My text” has no source — paste it.');
    if (translation === 'esv') {
      if (!esvKey) throw new Error('ESV needs your free personal API key (Settings → ESV API key), or paste the text yourself.');
      const j = await esvGet(qref(ref), esvKey);
      const text = j.passages.join(' ').replace(/\s+/g, ' ').replace(/\s*\(ESV\)\s*$/, '').trim();
      out = { ref, canonical: j.canonical, text, verses: null };
    } else {
      let r;
      try { r = await fetch('https://bible-api.com/' + encodeURIComponent(qref(ref)) + '?translation=' + translation); }
      catch { throw new Error(navigator.onLine ? 'Couldn’t reach bible-api.com — try again.' : 'You’re offline — connect to load the text.'); }
      if (r.status === 429) throw new Error('Too many requests to bible-api.com (HTTP 429). Wait a minute and retry.');
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) throw new Error(j.error === 'not found' ? `${ref} wasn’t found in this translation.` : `Couldn’t load the verse (HTTP ${r.status}).`);
      const verses = j.verses.map(v => ({ verse: v.verse, chapter: v.chapter, text: cleanPD(v.text) }));
      out = { ref, text: verses.map(v => v.text).join(' '), verses };
    }
    putCache(key, out);
    return out;
  }
  // Chapter listing for browsing, in the selected translation when possible.
  async function fetchChapter(book, chapter, translation, esvKey) {
    if (translation === 'esv' && esvKey) {
      const ck = 'esvchap|' + book + ' ' + chapter, hit = cache()[ck]; if (hit) return hit;
      try {
        const j = await esvGet(`${book} ${chapter}`, esvKey, { 'include-verse-numbers': 'true', 'include-first-verse-numbers': 'true' });
        const raw = j.passages.join(' ').replace(/\s+/g, ' ').replace(/\s*\(ESV\)\s*$/, '');
        const verses = []; raw.replace(/\[(\d+)\]\s*([^\[]*)/g, (_, n, t) => { verses.push({ verse: +n, chapter, text: t.trim() }); });
        if (verses.length) { const out = { ref: `${book} ${chapter}`, text: raw, verses, previewTr: 'esv' }; putCache(ck, out); return out; }
      } catch (e) { const d = await fetchPassage(`${book} ${chapter}`, 'web'); return Object.assign({}, d, { previewTr: 'web', why: e.message.split('.')[0] }); }
    }
    const free = TRANSLATIONS.some(t => t.id === translation && !t.needsKey && t.id !== 'own');
    const t = free ? translation : 'web';
    const d = await fetchPassage(`${book} ${chapter}`, t);
    return Object.assign({}, d, { previewTr: t, why: translation === 'esv' ? 'no ESV key yet' : '' });
  }
  g.Bible = { BOOKS, TRANSLATIONS, ESV_COPYRIGHT, parseRef, refString, fetchPassage, fetchChapter, findBook };
})(window);
