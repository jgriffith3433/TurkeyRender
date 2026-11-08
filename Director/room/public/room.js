// The Review Room page. Plain DOM, no build step.
const $ = (id) => document.getElementById(id);
const a = $('a'), b = $('b');
const S = {
  video: new URLSearchParams(location.search).get('video'), shown: null,
  renders: [], notes: [], base: '', scoreRev: null, song: null, shots: [],
  renderA: null, renderB: null, latestSeen: 0, filter: 'open', selected: null, draft: null, cards: new Map(), speed: 1,
};

const api = async (url, opts) => {
  const r = await fetch(url, opts);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? r.statusText);
  return j;
};
const q = () => (S.video ? `?video=${encodeURIComponent(S.video)}` : '');
const send = (url, method, body) => api(url + q(), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids.filter((k) => k != null));
  return e;
};
const fileUrl = (rel) => '/d/' + encodeURI(rel);
const noteFile = (rel) => fileUrl(`${S.base}/${rel}`);

// ---------- time ----------

const fps = () => S.renderA?.fps || 30;
const duration = () => a.duration || S.renderA?.duration || S.song?.duration || 1;
const frameOf = (t) => Math.floor(t * fps() + 1e-3);
const clockText = (t) => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};
function beatAt(t) {
  const x = S.song.beats;
  if (t <= x[0]) return (t - x[0]) / (x[1] - x[0]);
  let lo = 0, hi = x.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (x[mid] <= t) lo = mid; else hi = mid; }
  return lo + (t - x[lo]) / (x[lo + 1] - x[lo]);
}
function timeOfBeat(beat) {
  const x = S.song.beats, i = Math.max(0, Math.min(x.length - 2, Math.floor(beat)));
  return x[i] + (beat - i) * (x[i + 1] - x[i]);
}
function barBeat(t) {
  if (!S.song) return '';
  const n = beatAt(t) - S.song.phase, bar = Math.floor(n / S.song.meter) + 1;
  return `${bar}:${+(n - (bar - 1) * S.song.meter + 1).toFixed(2)}`;
}
const lastAt = (list, t) => { let hit = null; for (const x of list) { if (x.t <= t + 0.001) hit = x; else break; } return hit; };
const shotAt = (t) => lastAt(S.shots, t) ?? S.shots[0] ?? null;
const sectionAt = (t) => (S.song ? lastAt(S.song.sections, t) : null);
const sectionText = (s) => (!s ? '' : s.kind === 'section' ? s.name : `${s.name} ${s.kind}`);

// ---------- player ----------

function seek(t, exact = true) {
  const n = Math.max(0, Math.min(frameOf(duration()) - 1, frameOf(t)));
  // The middle of the frame, so rounding can never land on its neighbour.
  const at = exact ? (n + 0.5) / fps() : t;
  a.currentTime = at;
  if (S.renderB) b.currentTime = at;
  paint();
}
const step = (n) => { a.pause(); seek((frameOf(a.currentTime) + n) / fps()); };
const stepBeat = (n) => {
  a.pause();
  const now = beatAt(a.currentTime);
  seek(timeOfBeat(n > 0 ? Math.floor(now + 0.02) + 1 : Math.ceil(now - 0.1) - 1) + 1 / fps()); // the first frame on the beat
};
const toggle = () => (a.paused ? play() : a.pause());
function play(rate = 1) {
  S.speed = rate; a.playbackRate = rate; b.playbackRate = rate;
  a.play().catch(() => {});
}

function jumpShot(dir) {
  a.pause();
  const now = a.currentTime, list = S.shots;
  const i = list.indexOf(shotAt(now));
  const target = dir > 0 ? list[i + 1] : (now - list[i].t > 0.1 ? list[i] : list[i - 1]);
  if (target) seek(target.t + 0.001);
}

function loadRender(video, render) {
  const keep = a.currentTime, going = !a.paused;
  video.src = render.url;
  video.addEventListener('loadedmetadata', () => {
    video.currentTime = keep;
    if (video === a && going) play(S.speed);
    if (video === b && !a.paused) b.play().catch(() => {});
  }, { once: true });
}
function setA(render) {
  S.renderA = render;
  $('verA').value = render.file;
  $('capA').textContent = `A: ${render.label}`;
  $('tl').setAttribute('aria-valuemax', render.duration);
  loadRender(a, render);
  $('empty').hidden = true;
}
function setB(render) {
  S.renderB = render;
  $('figB').hidden = !render;
  $('capA').hidden = !render;
  if (render) { $('capB').textContent = `B: ${render.label}`; loadRender(b, render); }
  else { b.pause(); b.removeAttribute('src'); b.load(); }
}

function paint() {
  const t = a.currentTime || 0, shot = shotAt(t), sec = sectionAt(t);
  $('clock').textContent = `${clockText(t)}  frame ${frameOf(t)}`;
  const bb = barBeat(t);
  $('where').replaceChildren(el('b', { textContent: bb && `Bar ${bb}` }), `  ${sectionText(sec)}`, shot ? `  shot ${shot.index}: ` : '', shot ? el('b', { textContent: shot.name }) : '');
  $('head').style.left = `${(t / duration()) * 100}%`;
  $('tl').setAttribute('aria-valuenow', t.toFixed(2));
  $('tl').setAttribute('aria-valuetext', `${clockText(t)}, bar ${bb}`);
  if (S.nowShot !== shot) {
    S.shotEls?.get(S.nowShot)?.classList.remove('now');
    S.shotEls?.get(shot)?.classList.add('now');
    S.nowShot = shot;
  }
  followHead(t);
  $('play').textContent = a.paused ? 'Play' : 'Pause';
}

function followHead(t) {
  const box = $('tlScroll'), tl = $('tl');
  if (tl.offsetWidth <= box.clientWidth) return;
  const x = (t / duration()) * tl.offsetWidth;
  if (x < box.scrollLeft + 30 || x > box.scrollLeft + box.clientWidth - 30) box.scrollLeft = x - box.clientWidth / 3;
}

// B follows A. Small drift is left alone, because every correction is a visible stutter.
(function tick() {
  if (!a.paused) {
    paint();
    if (S.renderB && Math.abs(b.currentTime - a.currentTime) > 0.1) b.currentTime = a.currentTime;
  }
  requestAnimationFrame(tick);
})();
a.addEventListener('seeked', () => { paint(); recapture(); });
a.addEventListener('play', () => { paint(); if (S.renderB) b.play().catch(() => {}); });
a.addEventListener('pause', () => {
  paint();
  if (S.renderB) { b.pause(); b.currentTime = a.currentTime; }
});
a.addEventListener('ended', paint);

// ---------- timeline ----------

function buildTimeline() {
  const pct = (t) => `${(t / duration()) * 100}%`;
  const wide = $('tl').offsetWidth;
  const block = (t, end, text, title) => {
    // A label that can't fit is noise: it stays in the tooltip.
    const fits = ((end - t) / duration()) * wide >= 8 + text.length * 2.5 || text.length < 4;
    const d = el('div', { textContent: fits ? text : '', title });
    d.style.left = pct(t); d.style.width = `${((end - t) / duration()) * 100}%`;
    return d;
  };
  const { song, shots } = S;
  if (!song) return;
  $('rowSections').replaceChildren(...song.sections.map((s, i) => block(s.t, song.sections[i + 1]?.t ?? duration(), sectionText(s), `${sectionText(s)}, bar ${s.bar}`)));
  S.shotEls = new Map();
  $('rowShots').replaceChildren(...shots.map((s) => {
    const q = S.qa?.[s.index];
    const d = block(s.t, s.end, s.name, `Shot ${s.index}: ${s.name}\nbar ${s.at}, ${clockText(s.t)}, ${(s.end - s.t).toFixed(1)} s\n${s.act}${q ? `\nQA ${q.score} of 10${q.worst ? `: ${q.worst}` : ''}` : ''}`);
    if (q && !q.pass) d.classList.add('qa-fail');
    S.shotEls.set(s, d);
    return d;
  }));
  const zoom = +$('zoom').value, every = zoom >= 3 ? 1 : 4;
  $('rowBars').replaceChildren(...song.bars.filter((x) => (x.bar - 1) % every === 0).map((x, i, all) => block(x.t, all[i + 1]?.t ?? duration(), String(x.bar), `Bar ${x.bar}`)));
  S.nowShot = null;
  paintPins();
  paint();
}

function paintPins() {
  $('rowPins').replaceChildren(...S.notes.filter((n) => !isQa(n) || S.filter === 'qa').map((n) => {
    const p = el('button', {
      type: 'button', className: `pin s-${n.status.replace(' ', '-')}${n.id === S.selected ? ' selected' : ''}`,
      textContent: n.id.slice(1), title: `${n.id}, ${n.status}: ${n.text}`,
    });
    p.setAttribute('aria-label', `Note ${n.id.slice(1)}, ${n.status}, ${clockText(n.t)}: ${n.text}`);
    p.style.left = `${(n.t / duration()) * 100}%`;
    p.addEventListener('pointerdown', (e) => e.stopPropagation());
    p.addEventListener('click', (e) => { e.stopPropagation(); select(n, true); });
    return p;
  }));
}

function timeAtPointer(e) {
  const r = $('tl').getBoundingClientRect();
  return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration();
}
$('tl').addEventListener('pointerdown', (e) => {
  if (!S.renderA) return;
  const startX = e.clientX, wasPlaying = !a.paused;
  let moved = false;
  $('tl').setPointerCapture(e.pointerId);
  a.pause();
  seek(timeAtPointer(e));
  const move = (ev) => {
    if (Math.abs(ev.clientX - startX) > 4) moved = true;
    if (moved) seek(timeAtPointer(ev));
  };
  const up = () => {
    $('tl').removeEventListener('pointermove', move);
    $('tl').removeEventListener('pointerup', up);
    if (!moved) openDraft(wasPlaying);       // a click leaves a note
    else if (wasPlaying) play(S.speed);      // a drag only scrubs
  };
  $('tl').addEventListener('pointermove', move);
  $('tl').addEventListener('pointerup', up);
});

// ---------- the note box ----------

function capture() {
  const c = document.createElement('canvas');
  c.width = a.videoWidth; c.height = a.videoHeight;
  c.getContext('2d').drawImage(a, 0, 0);
  return c.toDataURL('image/png');
}

function fillDraft() {
  const d = S.draft;
  d.frame = frameOf(a.currentTime);
  d.t = d.frame / fps();
  d.shot = shotAt(d.t);
  $('draftAt').textContent = `${clockText(d.t)}, bar ${barBeat(d.t)}`;
  $('draftInfo').textContent = [`Frame ${d.frame}`, S.renderA.label, sectionText(sectionAt(d.t)), d.shot && `shot ${d.shot.index}: ${d.shot.name}`].filter(Boolean).join(', ');
  d.frameImage = capture();
  $('draftFrame').src = d.frameImage;
}

function recapture() { if (S.draft) fillDraft(); }

function openDraft(resume = !a.paused) {
  if (!S.renderA) return;
  if (S.draft) { recapture(); $('draftText').focus(); return; }
  a.pause();
  S.draft = { resume, images: [] };
  $('draftText').value = '';
  $('draftImages').replaceChildren();
  $('draft').hidden = false;
  if (!a.seeking) fillDraft();
  $('draftText').focus();
  $('draft').scrollIntoView({ block: 'nearest' });
}

function closeDraft() {
  const resume = S.draft?.resume;
  S.draft = null;
  $('draft').hidden = true;
  document.activeElement?.blur();
  if (resume) play(S.speed);
}

async function saveDraft() {
  const d = S.draft, text = $('draftText').value.trim();
  if (!d || !d.frameImage) return;
  const body = { t: d.t, frame: d.frame, text, frameImage: d.frameImage, images: d.images, render: S.renderA.file, version: S.renderA.version };
  closeDraft();
  try {
    const n = await send('/api/notes', 'POST', body);
    S.notes.push(n);
    if (S.filter === 'fixed' || S.filter === 'approved') S.filter = 'open';
    paintNotes();
  } catch (e) { say(`The note was not saved: ${e.message}`); }
}

function addPasted(dataUrl) {
  const d = S.draft;
  d.images.push(dataUrl);
  const wrap = el('span', {}, el('img', { src: dataUrl, alt: 'Pasted image' }));
  const drop = el('button', { type: 'button', textContent: 'Remove' });
  drop.addEventListener('click', () => { d.images.splice(d.images.indexOf(dataUrl), 1); wrap.remove(); });
  wrap.append(drop);
  $('draftImages').append(wrap);
}

document.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  if (!S.draft) openDraft();
  for (const f of files) {
    const r = new FileReader();
    r.onload = () => addPasted(r.result);
    r.readAsDataURL(f);
  }
});

$('draft').addEventListener('submit', (e) => { e.preventDefault(); saveDraft(); });
$('draftCancel').addEventListener('click', closeDraft);
$('draftText').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveDraft(); }
  if (e.key === 'Escape') closeDraft();
});

// ---------- the notes list ----------

// What the tools sent back: QA (tools/qa.mjs) and the 30 fps review (tools/review.mjs). Their own tab, not J's Open list.
const isQa = (n) => n.source === 'qa' || n.source === 'review';
const FILTERS = {
  open: (n) => !isQa(n) && ['new', 'in progress', 'needs J'].includes(n.status),
  qa: (n) => isQa(n) && ['new', 'in progress', 'needs J'].includes(n.status),
  fixed: (n) => n.status === 'fixed',
  approved: (n) => n.status === 'approved',
  all: () => true,
};
const STATUS_TEXT = { new: 'New', 'in progress': 'In progress', fixed: 'Fixed', 'needs J': 'Needs you', approved: 'Approved' };

function select(n, go) {
  S.selected = n.id;
  if (go) { a.pause(); seek(n.t); }
  for (const [id, c] of S.cards) c.el.classList.toggle('selected', id === n.id);
  paintPins();
}

async function patch(id, body) {
  try { await send(`/api/notes/${id}`, 'PATCH', body); await refresh(); }
  catch (e) { say(`That did not save: ${e.message}`); }
}

function replyBox(label, button, go) {
  const box = el('textarea', { rows: 2 });
  box.setAttribute('aria-label', label);
  const ok = el('button', { type: 'button', textContent: button, className: 'primary' });
  ok.addEventListener('click', () => go(box.value.trim()));
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ok.click(); } });
  return el('div', { className: 'row-buttons' }, box, ok);
}

function clipsOf(n) {
  if (!n.clip) return null;
  const vid = (rel, label) => {
    if (!rel) return null;
    const v = el('video', { src: fileUrl(rel), controls: true, preload: 'metadata', muted: label === 'Before' });
    return { v, fig: el('figure', {}, v, el('figcaption', { textContent: label })) };
  };
  const before = vid(n.clip.before, 'Before'), after = vid(n.clip.after, 'After');
  const both = el('button', { type: 'button', textContent: 'Play both' });
  both.addEventListener('click', () => {
    a.pause();
    for (const x of [before, after]) if (x) { x.v.currentTime = 0; x.v.play().catch(() => {}); }
  });
  return el('div', {}, el('div', { className: 'clips' }, before?.fig, after?.fig), before && after ? both : null);
}

function card(n) {
  const c = el('li', { className: `card s-${n.status.replace(' ', '-')}${n.id === S.selected ? ' selected' : ''}` });
  const goto = el('button', { type: 'button', className: 'goto', textContent: clockText(n.t) });
  goto.title = 'Go to this moment';
  goto.addEventListener('click', () => select(n, true));
  c.append(el('header', {}, goto, el('span', { textContent: `Bar ${n.at}` }), el('span', { className: 'tag', textContent: STATUS_TEXT[n.status] ?? n.status })));
  const from = n.source === 'unity' ? 'Unity mark' : n.source === 'qa' ? 'QA' : n.source === 'review' ? `30 fps review${n.reviewLabel ? ` of ${n.reviewLabel}` : ''}` : n.version ? `v${n.version}` : n.version === 0 ? 'previs' : '';
  c.append(el('p', { className: 'shotname', textContent: [n.shot?.name, from].filter(Boolean).join(', ') }));
  if (n.frameImage) {
    const img = el('img', { className: 'thumb', src: noteFile(n.frameImage), alt: `Frame at ${clockText(n.t)}`, loading: 'lazy' });
    img.addEventListener('click', () => select(n, true));
    c.append(img);
  }
  const body = el('p', { className: `body${n.text ? '' : ' none'}`, textContent: n.text || 'No words yet' });
  c.append(body);
  for (const rel of n.images ?? []) c.append(el('img', { className: 'thumb', src: noteFile(rel), alt: 'Image attached to this note', loading: 'lazy' }));

  const last = n.history?.at(-1);
  const running = ['queued', 'working'].includes(n.auto?.state);
  if (running) c.append(el('p', { className: 'said running', textContent: n.auto.step ?? 'Queued' }));
  if (n.status === 'needs J') {
    c.append(el('p', { className: 'said', textContent: n.auto?.state === 'left' ? `Still open: ${n.question ?? last?.text ?? ''}` : `Claude asks: ${n.question ?? last?.text ?? ''}` }));
    c.append(replyBox('Your answer', 'Answer', (reply) => patch(n.id, { status: 'new', reply })));
  } else if (last?.by === 'claude' && last.text) c.append(el('p', { className: 'said', textContent: last.text }));
  if (n.status === 'new' && last?.by === 'J' && last.text) c.append(el('p', { className: 'said', textContent: `You said: ${last.text}` }));

  if (n.auto?.change?.what && !running) c.append(el('p', { className: 'said', textContent: `Changed: ${n.auto.change.what}` }));
  if (n.auto?.qa?.score != null) c.append(el('p', { className: `said${n.auto.qa.pass ? '' : ' fails'}`, textContent: `QA ${n.auto.qa.score} of 10${n.auto.qa.pass ? '' : `, failed${n.auto.qa.worst ? `: ${n.auto.qa.worst}` : ''}`}` }));
  if (n.auto?.review) { const r = n.auto.review; c.append(el('p', { className: `said${r.a || r.error ? ' fails' : ''}`, textContent: r.error ? `30 fps review failed: ${r.error}` : `30 fps review: ${r.a ? `${r.a} A${r.worst ? `: ${r.worst}` : ''}` : 'no A faults'}, ${r.b} B, ${r.c} C` })); }
  const clips = clipsOf(n);
  if (clips) c.append(clips);

  const row = el('div', { className: 'row-buttons' });
  const button = (text, go) => { const x = el('button', { type: 'button', textContent: text }); x.addEventListener('click', go); row.append(x); return x; };
  if (n.status === 'fixed') {
    button('Approve', () => patch(n.id, { status: 'approved' })).className = 'primary';
    button('Reopen', () => {
      row.replaceChildren(replyBox("What's still wrong?", 'Reopen', (reply) => patch(n.id, { status: 'new', reply })));
      row.querySelector('textarea').focus();
    });
  }
  if (n.status === 'approved') button('Reopen', () => patch(n.id, { status: 'new' }));
  if (n.auto?.change && !running && n.status !== 'approved') button('Take the change out', () => patch(n.id, { undo: true }));
  if (n.status === 'new' && !running) {
    button('Edit', () => {
      const box = el('textarea', { rows: 3, value: n.text });
      box.setAttribute('aria-label', 'Edit this note');
      body.replaceWith(box);
      box.focus();
      row.replaceChildren();
      button('Save', () => patch(n.id, { text: box.value.trim() })).className = 'primary';
      button('Cancel', () => { S.cards.delete(n.id); paintNotes(); });
    });
    button('Remove', () => patch(n.id, { removed: true }));
  }
  if (row.childElementCount) c.append(row);
  return c;
}

function paintNotes() {
  for (const b2 of document.querySelectorAll('.tabs button')) {
    const f = b2.dataset.filter;
    b2.setAttribute('aria-pressed', String(f === S.filter));
    b2.querySelector('span').textContent = S.notes.filter(FILTERS[f]).length;
  }
  const shown = S.notes.filter(FILTERS[S.filter]).sort((x, y) => x.t - y.t);
  const list = $('notes');
  const next = new Map();
  for (const n of shown) {
    const json = JSON.stringify(n), had = S.cards.get(n.id);
    // Leave a card alone while J is typing in it or watching its clips.
    const busy = had && (had.el.contains(document.activeElement) && document.activeElement !== document.body || [...had.el.querySelectorAll('video')].some((v) => !v.paused));
    next.set(n.id, had && (had.json === json || busy) ? had : { json, el: card(n) });
  }
  S.cards = next;
  list.replaceChildren(...[...next.values()].map((c) => c.el));
  $('noNotes').hidden = shown.length > 0;
  $('noNotes').textContent = S.filter === 'open' ? 'No open notes. Click anywhere on the video to leave one.' : 'Nothing here yet.';
  paintPins();
}

for (const t of document.querySelectorAll('.tabs button')) t.addEventListener('click', () => { S.filter = t.dataset.filter; paintNotes(); });

// ---------- live state ----------

const say = (text) => { $('status').textContent = text; S.sayUntil = Date.now() + 6000; };
const span = (s) => { const m = Math.floor(s / 60); return m ? `${m} min ${s % 60} s` : `${s} s`; };

function paintStatus(st) {
  if (Date.now() < (S.sayUntil ?? 0)) return;
  const bits = [], item = (label, value) => bits.push([label, value]);
  item('Unity', st.unity);
  item('Building', st.building ? `${st.building.what} (${span(st.building.seconds)})` : 'nothing');
  item('Queue', st.waiting.length ? `${st.waiting.length} waiting, next: ${st.waiting[0]}` : 'empty');
  if (st.render) {
    const r = st.render;
    const done = r.frames ? `, ${Math.round((100 * r.frame) / r.frames)}%` : '';
    item('Rendering', `${r.file}${done}`);
    item('ETA', r.eta != null ? span(r.eta) : 'working it out');
  } else item('Rendering', 'nothing');
  item('Fixing', st.working.length ? st.working.join(', ') : 'nothing');
  const out = [];
  bits.forEach(([label, value], i) => out.push(i ? '  |  ' : '', `${label}: `, el('b', { textContent: value })));
  $('status').replaceChildren(...out);
}

function paintFinal(f) {
  $('final').hidden = !f?.capable;
  if (!f?.capable) return;
  const r = f.report, l = f.live;
  $('finalGo').disabled = !!l;
  if (l) $('finalLine').textContent = l.state === 'rendering' ? `Final render: shot ${l.done + 1} of ${l.of} (${l.shot}), ${l.reused} reused` : `Final render: ${l.state}`;
  else if (f.failed) $('finalLine').textContent = `The last final render stopped: ${f.failed.error.split('\n')[0]}`;
  else $('finalLine').textContent = r ? `Last final: ${r.rendered} rendered, ${r.reused} reused, ${r.minutes} min, join ${r.join?.clean ? 'clean' : 'NOT clean'}` : 'No final render yet';
  const key = JSON.stringify(r?.list ?? null);
  if (key !== S.finalKey) {
    S.finalKey = key;
    $('finalRows').replaceChildren(...(r?.list ?? []).map((x) => el('tr', { className: x.action }, el('td', { textContent: x.id }), el('td', { textContent: x.frames }), el('td', { textContent: x.action === 'rendered' ? `rendered, ${x.seconds} s` : 'reused' }), el('td', { textContent: x.why }))));
  }
}
$('finalGo').addEventListener('click', async (e) => {
  e.preventDefault(); e.stopPropagation();
  try { const r = await send('/api/final', 'POST', {}); say(r.started ? 'Final render starting: only the shots that changed will render.' : r.why); }
  catch (x) { say(`It did not start: ${x.message}`); }
});

function fillSelect(sel, renders, first) {
  const keep = sel.value;
  sel.replaceChildren(...first, ...renders.map((r, i) => {
    const when = new Date(r.mtime).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return el('option', { value: r.file, textContent: `${r.label}${i ? '' : ' (latest)'}, ${when}, ${r.height}p` });
  }));
  sel.value = keep;
}

// Nothing of the last video stays on screen: no picture, no sound, no comparison, no playhead.
function clearPlayer() {
  S.renderA = null;
  a.pause(); a.removeAttribute('src'); a.load();
  setB(null);
  if (S.draft) { S.draft.resume = false; closeDraft(); }
  S.cards.clear(); S.selected = null;
  S.song = null; S.shots = []; S.scoreRev = null;
  for (const row of ['rowSections', 'rowShots', 'rowBars']) $(row).replaceChildren();
  $('fresh').hidden = true;
}

async function refresh() {
  let s;
  const asked = S.video;
  try { s = await api('/api/state' + q()); }
  catch { $('status').textContent = 'The room server is not answering.'; return; }
  if (S.video !== asked) return; // The video changed while this was on its way.
  const changed = s.video !== S.shown;
  if (changed) { clearPlayer(); S.shown = s.video; }
  S.video = s.video; S.base = s.base; S.notes = s.notes; S.renders = s.renders; S.qa = s.qa;
  if (s.status) paintStatus(s.status);
  paintFinal(s.final);
  fillSelect($('verA'), s.renders, []);
  fillSelect($('verB'), s.renders, [el('option', { value: '', textContent: 'Nothing' })]);
  if (s.videos.length > 1) {
    $('videoPick').hidden = false;
    $('video').replaceChildren(...s.videos.map((v) => el('option', { value: v, textContent: v })));
    $('video').value = s.video;
  }
  $('empty').hidden = s.renders.length > 0;
  const newest = s.renders[0];
  if (newest) {
    if (!S.renderA) { setA(newest); S.latestSeen = newest.version; }
    $('verA').value = S.renderA.file;
    $('verB').value = S.renderB?.file ?? '';
    if (newest.version > S.latestSeen && S.renderA.file !== newest.file) {
      $('freshText').textContent = `${newest.label} just finished.`;
      $('fresh').hidden = false;
    }
  }
  if (s.scoreRev !== S.scoreRev || changed) {
    S.scoreRev = s.scoreRev;
    const score = await api('/api/score' + q());
    if (S.video !== s.video) return;
    S.song = score.song; S.shots = score.shots;
    buildTimeline();
  }
  paintNotes();
}

$('freshGo').addEventListener('click', () => {
  S.latestSeen = S.renders[0].version;
  $('fresh').hidden = true;
  setA(S.renders[0]);
});
$('verA').addEventListener('change', (e) => { setA(S.renders.find((r) => r.file === e.target.value)); e.target.blur(); });
$('verB').addEventListener('change', (e) => { setB(S.renders.find((r) => r.file === e.target.value) ?? null); e.target.blur(); });
$('video').addEventListener('change', (e) => {
  S.video = e.target.value;
  history.replaceState(null, '', `?video=${encodeURIComponent(S.video)}`); // A reload stays on this video.
  e.target.blur();
  refresh();
});
$('zoom').addEventListener('change', (e) => { $('tl').style.width = `${e.target.value * 100}%`; buildTimeline(); e.target.blur(); });

// ---------- buttons and keys ----------

const click = (id, go) => $(id).addEventListener('click', (e) => { go(); if (e.detail) e.currentTarget.blur(); });
click('play', toggle);
click('back', () => step(-1));
click('fwd', () => step(1));
click('note', () => openDraft());
click('mute', () => { a.muted = !a.muted; $('mute').textContent = a.muted ? 'Unmute' : 'Mute'; });
a.addEventListener('click', () => openDraft());
b.addEventListener('click', () => openDraft());
a.addEventListener('loadedmetadata', () => { buildTimeline(); });

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t.matches?.('textarea, input, select') || e.ctrlKey || e.metaKey || e.altKey) return;
  const shift = e.shiftKey;
  const keys = {
    ' ': toggle, ArrowLeft: () => (shift ? stepBeat(-1) : step(-1)), ArrowRight: () => (shift ? stepBeat(1) : step(1)),
    n: () => openDraft(), N: () => openDraft(), '[': () => jumpShot(-1), ']': () => jumpShot(1),
    j: () => { a.pause(); seek(a.currentTime - 2); }, J: () => { a.pause(); seek(a.currentTime - 2); },
    k: () => a.pause(), K: () => a.pause(),
    l: () => play(!a.paused && S.speed === 1 ? 2 : 1), L: () => play(!a.paused && S.speed === 1 ? 2 : 1),
    Home: () => seek(0), End: () => seek(duration() - 0.05),
  };
  if (e.key === ' ' && t.matches?.('button')) return;
  const go = keys[e.key];
  if (go) { e.preventDefault(); go(); }
});

refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 2000);
addEventListener('resize', () => { clearTimeout(S.resizing); S.resizing = setTimeout(buildTimeline, 200); });
