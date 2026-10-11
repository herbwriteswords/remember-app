/* RemEmber — memorization METHOD rules (Ember's method).
   Everything about first letters, scheduling and grading lives here.
   Change METHOD values (or the functions) to swap the method later. */
(function (g) {
  const METHOD = {
    // Review stages. intervalDays = days until next due after a counted recital.
    // advanceAfter = consecutive CLEAN recitals (counted at most once per day) needed to move up.
    stages: [
      { key: 'daily',   label: 'Daily',   intervalDays: 1,  advanceAfter: 3 },
      { key: 'every3',  label: 'Every 3 days', intervalDays: 3,  advanceAfter: 2 },
      { key: 'weekly',  label: 'Weekly',  intervalDays: 7,  advanceAfter: 2 },
      { key: 'monthly', label: 'Monthly', intervalDays: 30, advanceAfter: Infinity },
    ],
    missesToReset: 3,          // misses in a row that drop a verse back to daily
    missKeepsInterval: true,   // a single miss keeps the current interval
    countOncePerDay: true,     // only the first graded recital each day moves the schedule
    memorizedStage: 3,         // index of stage that counts as "memorized"...
    memorizedCleanRuns: 2,     // ...after this many clean runs in it (or arriving there via clean runs)
    oneNewVerseAtATime: true,  // queued verses wait until no verse is in the daily stage
    grading: {
      strict: true,            // every word must match exactly (after normalization)
      ignoreCase: true, ignorePunctuation: true, ignoreStutters: true,
      normalizeNumbers: true,  // "three" == "3"
      referenceBeforeAndAfter: true, // gentle note only; never fails a recital
    },
    hintCountsAsClean: false,  // a recital where a hint was used is practice, not a clean run
    firstLetters: { hyphenatedIsOneWord: true, digitsShown: true, keepCase: true, keepPunctuation: true },
  };

  // ---------- FIRST LETTERS ----------
  // "Not that I am speaking of being in need, for I have learned..." -> "N t I a s o b i n, f I h l, ..."
  function firstLetters(text) {
    return String(text).trim().split(/\s+/).map(tok => {
      const m = tok.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}][\p{L}\p{N}'’\-–]*[\p{L}\p{N}]|[\p{L}\p{N}])?(.*)$/u);
      if (!m || !m[2]) return tok; // pure punctuation token like "—"
      const word = m[2];
      let core;
      if (/^\p{N}/u.test(word) && METHOD.firstLetters.digitsShown) core = word.match(/^[\p{N}]+/u)[0];
      else core = word[0];
      if (!METHOD.firstLetters.keepCase) core = core.toLowerCase();
      // hyphenated words count as ONE word: "self-control" -> "s"
      return (METHOD.firstLetters.keepPunctuation ? m[1] : '') + core + (METHOD.firstLetters.keepPunctuation ? m[3] : '');
    }).join(' ');
  }

  // ---------- NORMALIZATION ----------
  const NUMS = {zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,hundred:100,thousand:1000,first:1,second:2,third:3};
  function words(text) {
    let t = String(text).replace(/[’‘]/g, "'").replace(/[\u2010-\u2015]/g, '-');
    // hyphenated word = one word: drop hyphens between letters
    t = t.replace(/(\p{L})-(?=\p{L})/gu, '$1');
    t = t.replace(/[^\p{L}\p{N}'\s]/gu, ' ').replace(/'/g, '');
    let w = t.toLowerCase().split(/\s+/).filter(Boolean);
    if (METHOD.grading.normalizeNumbers) w = w.map(x => (x in NUMS && !['first','second','third'].includes(x)) ? String(NUMS[x]) : x);
    return w;
  }
  function dropStutters(w) { return w.filter((x, i) => i === 0 || x !== w[i - 1]); }

  // Strip a spoken/typed reference ("Philippians 4:11", "Phil four eleven", "chapter 4 verse 11") from start/end.
  function refTokens(ref) {
    const r = words(String(ref).replace(/[:\-–]/g, ' '));
    const set = new Set(r.concat(['chapter','verse','verses','through','to','and','colon']));
    // common abbreviations
    const book = r.filter(x => !/^\d+$/.test(x)).join(' ');
    (ABBR[book] || []).forEach(a => set.add(a));
    return { set, book: r.filter(x => !/^\d+$/.test(x)) };
  }
  const ABBR = { philippians:['phil','php'], romans:['rom'], psalms:['ps','psalm','psa'], psalm:['ps','psalms'], john:['jn'], titus:['tit'], proverbs:['prov','pr'], isaiah:['isa'], matthew:['matt','mt'], ephesians:['eph'], galatians:['gal'], hebrews:['heb'], corinthians:['cor'] };
  function stripRef(w, ref, verseWords) {
    const { set, book } = refTokens(ref);
    const isRef = x => set.has(x) || /^\d+$/.test(x);
    const bookHit = x => book.includes(x) || (ABBR[book.join(' ')] || []).includes(x);
    let s = 0, hadStart = false, hadEnd = false;
    // only strip a leading run if it contains the book name (avoid eating verse words like "and")
    let i = 0; while (i < w.length && isRef(w[i]) && i < 8) i++;
    if (i > 0 && w.slice(0, i).some(bookHit) && w[0] !== verseWords[0]) { s = i; hadStart = true; }
    let e = w.length, j = w.length; while (j > s && isRef(w[j - 1]) && w.length - j < 8) j--;
    if (j < w.length && w.slice(j).some(bookHit)) { e = j; hadEnd = true; }
    return { words: w.slice(s, e), hadStart, hadEnd };
  }

  // ---------- GRADING (strict) ----------
  // Returns { clean, score, diff:[{type:'ok'|'wrong'|'missing'|'extra', expected, got}], refNote }
  function grade(attempt, verseText, reference) {
    let exp = words(verseText), got = words(attempt);
    if (METHOD.grading.ignoreStutters) { got = dropStutters(got); }
    const r = stripRef(got, reference || '', exp);
    got = r.words;
    const expC = METHOD.grading.ignoreStutters ? dropStutters(exp) : exp; // "holy, holy, holy" stays comparable
    // hyphenated word = one word, even if dictation splits it ("self control" == "self-control")
    const compounds = new Set((String(verseText).match(/\p{L}+(?:[-\u2010-\u2015]\p{L}+)+/gu) || []).map(x => words(x)[0]));
    if (compounds.size) { const m = []; for (let i = 0; i < got.length; i++) { const two = got[i] + (got[i + 1] || ''), three = two + (got[i + 2] || ''); if (compounds.has(three) && got[i + 2]) { m.push(three); i += 2; } else if (compounds.has(two) && got[i + 1]) { m.push(two); i++; } else m.push(got[i]); } got = m; }
    const diff = alignDiff(expC, got);
    const ok = diff.filter(d => d.type === 'ok').length;
    const clean = diff.every(d => d.type === 'ok');
    let refNote = null;
    if (METHOD.grading.referenceBeforeAndAfter && reference && !(r.hadStart && r.hadEnd)) {
      refNote = !r.hadStart && !r.hadEnd ? 'Try saying the reference before and after — it doesn’t affect your result.'
        : r.hadStart ? 'Nice start! Close with the reference too next time.' : 'Try opening with the reference too next time.';
    }
    return { clean, score: expC.length ? ok / expC.length : 0, diff, refNote };
  }
  // LCS-based word alignment; adjacent missing+extra pairs become "wrong".
  function alignDiff(a, b) {
    const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[i] === b[j]) { out.push({ type: 'ok', expected: a[i], got: b[j] }); i++; j++; }
      else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { out.push({ type: 'extra', got: b[j] }); j++; }
      else { out.push({ type: 'missing', expected: a[i] }); i++; }
    }
    // merge missing/extra neighbours into substitutions
    const res = [];
    for (let k = 0; k < out.length; k++) {
      const c = out[k], d = out[k + 1];
      if (d && ((c.type === 'missing' && d.type === 'extra') || (c.type === 'extra' && d.type === 'missing'))) {
        res.push({ type: 'wrong', expected: c.expected || d.expected, got: c.got || d.got }); k++;
      } else res.push(c);
    }
    return res;
  }

  // ---------- SCHEDULING ----------
  function addDays(dateStr, n) { const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  // Apply a recital result to a verse record (mutates & returns it). Skipped days are never misses.
  function applyResult(v, clean, today) {
    v.history = v.history || [];
    v.history.push({ date: today, clean });
    if (METHOD.countOncePerDay && v.lastCounted === today) {
      // A clean recital later the same day replaces an earlier miss; otherwise it's bonus practice.
      if (!(clean && v.lastCountedClean === false && v.dayStart)) return v;
      Object.assign(v, v.dayStart);
    } else v.dayStart = { stage: v.stage || 0, cleanStreak: v.cleanStreak || 0, missStreak: v.missStreak || 0, due: v.due };
    v.lastCounted = today; v.lastCountedClean = clean;
    const st = () => METHOD.stages[v.stage || 0];
    if (clean) {
      v.cleanStreak = (v.cleanStreak || 0) + 1; v.missStreak = 0;
      if (v.cleanStreak >= st().advanceAfter && v.stage < METHOD.stages.length - 1) { v.stage++; v.cleanStreak = 0; }
      v.due = addDays(today, st().intervalDays);
    } else {
      v.missStreak = (v.missStreak || 0) + 1; v.cleanStreak = 0;
      if (v.missStreak >= METHOD.missesToReset) { v.stage = 0; v.missStreak = 0; }
      // daily verses stay due today; reviews keep their current interval
      v.due = v.stage === 0 ? today : addDays(today, METHOD.missKeepsInterval ? st().intervalDays : 1);
    }
    v.status = statusOf(v);
    return v;
  }
  function statusOf(v) {
    if (v.status === 'queued') return 'queued';
    if ((v.stage || 0) === 0) return 'learning';
    if (v.stage >= METHOD.memorizedStage && (v.cleanStreak >= METHOD.memorizedCleanRuns || v.history?.slice(-1)[0]?.clean)) return 'memorized';
    return 'reviewing';
  }
  function mastery(v) { // 0..1 for display
    const S = METHOD.stages; const s = v.stage || 0;
    const within = Math.min(1, (v.cleanStreak || 0) / (isFinite(S[s].advanceAfter) ? S[s].advanceAfter : METHOD.memorizedCleanRuns));
    return Math.min(1, (s + within) / (S.length - 1 + 1));
  }

  g.Method = { METHOD, firstLetters, words, grade, alignDiff, applyResult, statusOf, mastery, addDays, ymd };
})(typeof window !== 'undefined' ? window : globalThis);
