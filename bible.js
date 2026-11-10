/* Bible text sources. ESV via api.esv.org and CSB via API.Bible (personal keys, stored only on device);
   public-domain translations via bible-api.com (CORS-enabled). */
(function (g) {
  const BOOKS = [["Genesis",50],["Exodus",40],["Leviticus",27],["Numbers",36],["Deuteronomy",34],["Joshua",24],["Judges",21],["Ruth",4],["1 Samuel",31],["2 Samuel",24],["1 Kings",22],["2 Kings",25],["1 Chronicles",29],["2 Chronicles",36],["Ezra",10],["Nehemiah",13],["Esther",10],["Job",42],["Psalms",150],["Proverbs",31],["Ecclesiastes",12],["Song of Solomon",8],["Isaiah",66],["Jeremiah",52],["Lamentations",5],["Ezekiel",48],["Daniel",12],["Hosea",14],["Joel",3],["Amos",9],["Obadiah",1],["Jonah",4],["Micah",7],["Nahum",3],["Habakkuk",3],["Zephaniah",3],["Haggai",2],["Zechariah",14],["Malachi",4],["Matthew",28],["Mark",16],["Luke",24],["John",21],["Acts",28],["Romans",16],["1 Corinthians",16],["2 Corinthians",13],["Galatians",6],["Ephesians",6],["Philippians",4],["Colossians",4],["1 Thessalonians",5],["2 Thessalonians",3],["1 Timothy",6],["2 Timothy",4],["Titus",3],["Philemon",1],["Hebrews",13],["James",5],["1 Peter",5],["2 Peter",3],["1 John",5],["2 John",1],["3 John",1],["Jude",1],["Revelation",22]];
  const TRANSLATIONS = [
    { id: 'esv', name: 'ESV', full: 'English Standard Version', needsKey: true },
    { id: 'csb', name: 'CSB', full: 'Christian Standard Bible', needsKey: true },
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
  const CSB_COPYRIGHT = 'Scripture quotations marked CSB have been taken from the Christian Standard Bible®, Copyright © 2017 by Holman Bible Publishers. Used by permission. Christian Standard Bible® and CSB® are federally registered trademarks of Holman Bible Publishers.';

  const ALIASES = { ps: 'Psalms', pss: 'Psalms', psa: 'Psalms', psalm: 'Psalms', psalms: 'Psalms', phil: 'Philippians', php: 'Philippians', pp: 'Philippians', rom: 'Romans', ro: 'Romans', jn: 'John', jhn: 'John', gen: 'Genesis', ge: 'Genesis', prov: 'Proverbs', pr: 'Proverbs', prv: 'Proverbs', isa: 'Isaiah', jer: 'Jeremiah', matt: 'Matthew', mat: 'Matthew', mt: 'Matthew', eph: 'Ephesians', gal: 'Galatians', heb: 'Hebrews', tit: 'Titus', rev: 'Revelation', col: 'Colossians', jas: 'James', jms: 'James', 'song of songs': 'Song of Solomon', song: 'Song of Solomon', sos: 'Song of Solomon', 'canticles': 'Song of Solomon', deut: 'Deuteronomy', dt: 'Deuteronomy', josh: 'Joshua', judg: 'Judges', mk: 'Mark', mrk: 'Mark', lk: 'Luke', luk: 'Luke', ex: 'Exodus', exod: 'Exodus', lev: 'Leviticus', num: 'Numbers', eccl: 'Ecclesiastes', ecc: 'Ecclesiastes', qoh: 'Ecclesiastes', lam: 'Lamentations', ezek: 'Ezekiel', dan: 'Daniel', hos: 'Hosea', obad: 'Obadiah', mic: 'Micah', nah: 'Nahum', hab: 'Habakkuk', zeph: 'Zephaniah', hag: 'Haggai', zech: 'Zechariah', mal: 'Malachi', neh: 'Nehemiah', esth: 'Esther', sam: 'Samuel', sa: 'Samuel', sm: 'Samuel', kgs: 'Kings', ki: 'Kings', kin: 'Kings', chr: 'Chronicles', chron: 'Chronicles', cor: 'Corinthians', co: 'Corinthians', thess: 'Thessalonians', th: 'Thessalonians', tim: 'Timothy', ti: 'Timothy', pet: 'Peter', pe: 'Peter', jo: 'John', philem: 'Philemon', phm: 'Philemon', act: 'Acts' };
  const NUMBERED = ['Samuel', 'Kings', 'Chronicles', 'Corinthians', 'Thessalonians', 'Timothy', 'Peter', 'John'];
  function findBook(s) {
    s = s.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ')
      .replace(/^(iii|ii|i|first|second|third|1st|2nd|3rd)\s+/, m => ({ 'iii ': '3 ', 'ii ': '2 ', 'i ': '1 ', 'first ': '1 ', 'second ': '2 ', 'third ': '3 ', '1st ': '1 ', '2nd ': '2 ', '3rd ': '3 ' })[m]);
    const al = s.replace(/^([123])\s*/, '$1 ');
    const num = al.match(/^([123]) (.*)$/);
    const base = num ? num[2] : al;
    for (const [b] of BOOKS) if (b.toLowerCase() === al) return b;
    if (ALIASES[base]) {
      const name = ALIASES[base];
      if (num && NUMBERED.includes(name)) { const f = num[1] + ' ' + name; if (BOOKS.some(b => b[0] === f)) return f; }
      if (!num && BOOKS.some(b => b[0] === name)) return name;
    }
    const hit = BOOKS.find(([b]) => b.toLowerCase().startsWith(al) && al.replace(/\d /, '').length >= 2);
    return hit ? hit[0] : null;
  }
  // Undo iOS smart punctuation & friends: look-alike colons/dashes, NBSP, zero-width chars, fullwidth digits.
  function normalizeRefInput(q) {
    return String(q || '').normalize('NFKC')            // fullwidth ：１２ -> :12
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')       // zero-width
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/[\u2236\uFE13\uFE55\uA789\u02D0\u0589\u05C3]/g, ':') // ratio sign, presentation colons, modifier colon…
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')     // hyphen/en/em dashes, minus
      .replace(/\s*([:\-,])\s*/g, '$1').replace(/(\d)\s*\.\s*(\d)/g, '$1:$2') // "4 . 12" / "4.12" -> 4:12
      .replace(/\s+/g, ' ').trim()
      .replace(/^(.*[a-z]\.?) (\d+) (\d+(?:-\d+)?)$/i, '$1 $2:$3'); // dictation: "Romans 8 28" -> Romans 8:28
  }
  // "Romans 8:28-30" -> {book, chapter, from, to, ref}
  function parseRef(q) {
    const t = normalizeRefInput(q);
    const m = t.match(/^([123]?\s?[a-z][a-z .]*?)\s?(\d+)(?::(\d+)(?:-(\d+))?)?$/i);
    if (!m) return null;
    const book = findBook(m[1]); if (!book) return null;
    const chapter = +m[2], from = m[3] ? +m[3] : null, to = m[4] ? +m[4] : from;
    const max = BOOKS.find(b => b[0] === book)[1]; if (chapter < 1 || chapter > max) return null;
    if (from === 0 || (from && to < from)) return null;
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
  function splitKeys(keys) {
    if (keys && typeof keys === 'object' && !Array.isArray(keys)) {
      return { esv: String(keys.esv || '').trim(), csb: String(keys.csb || keys.apiBible || '').trim() };
    }
    return { esv: String(keys || '').trim(), csb: '' };
  }

  // Official CSB text via API.Bible (user's personal key). Discover the Bible ID at runtime.
  const APIBIBLE = 'https://api.scripture.api.bible/v1';
  const USFM = { Genesis:'GEN', Exodus:'EXO', Leviticus:'LEV', Numbers:'NUM', Deuteronomy:'DEU', Joshua:'JOS', Judges:'JDG', Ruth:'RUT', '1 Samuel':'1SA', '2 Samuel':'2SA', '1 Kings':'1KI', '2 Kings':'2KI', '1 Chronicles':'1CH', '2 Chronicles':'2CH', Ezra:'EZR', Nehemiah:'NEH', Esther:'EST', Job:'JOB', Psalms:'PSA', Proverbs:'PRO', Ecclesiastes:'ECC', 'Song of Solomon':'SNG', Isaiah:'ISA', Jeremiah:'JER', Lamentations:'LAM', Ezekiel:'EZK', Daniel:'DAN', Hosea:'HOS', Joel:'JOL', Amos:'AMO', Obadiah:'OBA', Jonah:'JON', Micah:'MIC', Nahum:'NAM', Habakkuk:'HAB', Zephaniah:'ZEP', Haggai:'HAG', Zechariah:'ZEC', Malachi:'MAL', Matthew:'MAT', Mark:'MRK', Luke:'LUK', John:'JHN', Acts:'ACT', Romans:'ROM', '1 Corinthians':'1CO', '2 Corinthians':'2CO', Galatians:'GAL', Ephesians:'EPH', Philippians:'PHP', Colossians:'COL', '1 Thessalonians':'1TH', '2 Thessalonians':'2TH', '1 Timothy':'1TI', '2 Timothy':'2TI', Titus:'TIT', Philemon:'PHM', Hebrews:'HEB', James:'JAS', '1 Peter':'1PE', '2 Peter':'2PE', '1 John':'1JN', '2 John':'2JN', '3 John':'3JN', Jude:'JUD', Revelation:'REV' };
  function passageIdFromRef(ref) {
    const p = parseRef(qref(ref));
    if (!p) throw new Error(`Couldn’t read the reference “${ref}”.`);
    const b = USFM[p.book];
    if (!b) throw new Error(`No CSB book id for ${p.book}.`);
    if (!p.from) return `${b}.${p.chapter}`;
    if (!p.to || p.to === p.from) return `${b}.${p.chapter}.${p.from}`;
    return `${b}.${p.chapter}.${p.from}-${b}.${p.chapter}.${p.to}`;
  }
  async function apiBibleGet(path, key) {
    let r;
    try { r = await fetch(APIBIBLE + path, { headers: { 'api-key': key, Accept: 'application/json' }, cache: 'no-store' }); }
    catch (e) {
      if (!navigator.onLine) throw new Error('You’re offline — connect to load CSB text.');
      throw new Error('API.Bible didn’t answer. Check the connection and try again.');
    }
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) throw new Error('API.Bible rejected the API key (HTTP 401). Re-copy it from scripture.api.bible.');
    if (r.status === 403) throw new Error('API.Bible refused CSB (HTTP 403). In the API.Bible dashboard, open Plan → Edit Bible Licenses and add the Christian Standard Bible. The free Starter plan allows 3 copyrighted translations for non-commercial use.');
    if (r.status === 429) throw new Error('API.Bible rate limit reached (HTTP 429). Try again in a little while.');
    if (r.status === 404) throw new Error((j && (j.message || j.error)) ? String(j.message || j.error) : 'That passage wasn’t found in the CSB.');
    if (!r.ok) throw new Error((j && (j.message || j.error)) ? String(j.message || j.error) : `API.Bible error (HTTP ${r.status}).`);
    return j;
  }
  const CSBIDK = 'remember.csbbibleid';
  async function csbBibleId(key) {
    try {
      const c = JSON.parse(localStorage.getItem(CSBIDK) || 'null');
      if (c && c.id && c.t === key.slice(-8)) return c.id;
    } catch {}
    const j = await apiBibleGet('/bibles?language=eng', key);
    const list = Array.isArray(j.data) ? j.data : [];
    const hit = list.find(b => {
      const abbr = String(b.abbreviation || b.abbreviationLocal || '').toUpperCase();
      const name = String(b.name || b.nameLocal || '');
      if (/holman christian standard/i.test(name)) return false;
      return abbr === 'CSB' || /christian standard bible/i.test(name);
    });
    if (!hit) throw new Error('CSB isn’t enabled on this API.Bible key yet. In the API.Bible dashboard, open Plan → Edit Bible Licenses and add the Christian Standard Bible (the free Starter plan allows 3 copyrighted translations).');
    try { localStorage.setItem(CSBIDK, JSON.stringify({ id: hit.id, t: key.slice(-8) })); } catch {}
    return hit.id;
  }
  function cleanApiText(t) {
    return String(t || '').replace(/<[^>]*>/g, ' ').replace(/¶/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function versesFromApiText(raw, chapter) {
    const verses = [];
    String(raw || '').replace(/\[(\d+)\]\s*([^[]*)/g, (_, n, t) => { const text = cleanApiText(t); if (text) verses.push({ verse: +n, chapter, text }); });
    return verses;
  }
  async function csbGet(ref, key, withNums) {
    const id = await csbBibleId(key);
    const pid = passageIdFromRef(ref);
    const qs = new URLSearchParams({ 'content-type': 'text', 'include-notes': 'false', 'include-titles': 'false', 'include-chapter-numbers': 'false', 'include-verse-numbers': withNums ? 'true' : 'false' });
    const j = await apiBibleGet('/bibles/' + encodeURIComponent(id) + '/passages/' + encodeURIComponent(pid) + '?' + qs, key);
    const data = j.data || {};
    const text = cleanApiText(data.content);
    if (!text) throw new Error(`CSB found no passage for “${ref}”.`);
    const parsed = parseRef(qref(ref));
    return { data, text, verses: withNums && parsed ? versesFromApiText(data.content, parsed.chapter) : null };
  }

  // Returns {ref, text, verses:[{verse,text}]|null}
  async function fetchPassage(ref, translation, keys, opt = {}) {
    const k = splitKeys(keys);
    const key = translation + '|' + ref;
    const hit = !opt.noCache && cache()[key]; if (hit && hit.text) return hit;
    let out;
    if (translation === 'own') throw new Error('“My text” has no source — paste it.');
    if (translation === 'esv') {
      if (!k.esv) throw new Error('ESV needs your free personal API key (Settings → ESV API key), or paste the text yourself.');
      const j = await esvGet(qref(ref), k.esv);
      const text = j.passages.join(' ').replace(/\s+/g, ' ').replace(/\s*\(ESV\)\s*$/, '').trim();
      out = { ref, canonical: j.canonical, text, verses: null };
    } else if (translation === 'csb') {
      if (!k.csb) throw new Error('CSB needs your free API.Bible key (Settings → API.Bible key), or paste the text yourself.');
      const j = await csbGet(ref, k.csb, false);
      out = { ref, canonical: (j.data && j.data.reference) || ref, text: j.text, verses: null };
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
  async function fetchChapter(book, chapter, translation, keys) {
    const k = splitKeys(keys);
    if (translation === 'esv' && k.esv) {
      const ck = 'esvchap|' + book + ' ' + chapter, hit = cache()[ck]; if (hit) return hit;
      try {
        const j = await esvGet(`${book} ${chapter}`, k.esv, { 'include-verse-numbers': 'true', 'include-first-verse-numbers': 'true' });
        const raw = j.passages.join(' ').replace(/\s+/g, ' ').replace(/\s*\(ESV\)\s*$/, '');
        const verses = []; raw.replace(/\[(\d+)\]\s*([^\[]*)/g, (_, n, t) => { verses.push({ verse: +n, chapter, text: t.trim() }); });
        if (verses.length) { const out = { ref: `${book} ${chapter}`, text: raw, verses, previewTr: 'esv' }; putCache(ck, out); return out; }
      } catch (e) { const d = await fetchPassage(`${book} ${chapter}`, 'web'); return Object.assign({}, d, { previewTr: 'web', why: e.message.split('.')[0] }); }
    }
    if (translation === 'csb' && k.csb) {
      const ck = 'csbchap|' + book + ' ' + chapter, hit = cache()[ck]; if (hit) return hit;
      try {
        const j = await csbGet(`${book} ${chapter}`, k.csb, true);
        const verses = j.verses || [];
        if (verses.length) { const out = { ref: `${book} ${chapter}`, text: j.text, verses, previewTr: 'csb' }; putCache(ck, out); return out; }
      } catch (e) { const d = await fetchPassage(`${book} ${chapter}`, 'web'); return Object.assign({}, d, { previewTr: 'web', why: e.message.split('.')[0] }); }
    }
    const free = TRANSLATIONS.some(t => t.id === translation && !t.needsKey && t.id !== 'own');
    const t = free ? translation : 'web';
    const d = await fetchPassage(`${book} ${chapter}`, t);
    const why = translation === 'esv' ? 'no ESV key yet' : translation === 'csb' ? 'no CSB key yet' : '';
    return Object.assign({}, d, { previewTr: t, why });
  }
  g.Bible = { normalizeRefInput, BOOKS, TRANSLATIONS, ESV_COPYRIGHT, CSB_COPYRIGHT, parseRef, refString, fetchPassage, fetchChapter, findBook };
})(window);
