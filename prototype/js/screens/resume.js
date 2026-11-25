/* 마스터 이력서 — #/resume
   왼쪽에서 고치면 오른쪽 종이가 바로 바뀐다 (1100px 아래에서는 편집 | 미리보기 중 하나).
   프로젝트·경력·활동은 경험 위키의 프로젝트를 가져와 그 프로젝트의 경험 카드를 고른다. 문장은 언제나 카드의 「이력서 한 줄」 그대로이고,
   여기서 고치면 카드도 함께 바뀐다 (S.setResumeLine). 학력·교육과 수상·자격만 직접 쓴다. */
(function (App) {
  const S = App.store; const I = App.icon;
  const esc = (s) => App.ui.esc(s);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clean = (s) => String(s || '').trim().replace(/\s+/g, ' ');
  const meId = () => (App.auth.current() || {}).id;

  const SHEET = 794; // A4 너비 (96dpi)
  const SECTIONS = [['project', '프로젝트'], ['career', '경력'], ['activity', '활동'], ['education', '학력·교육'], ['award', '수상·자격']];
  const LABEL = Object.fromEntries(SECTIONS);
  const WIKI = new Set(['project', 'career', 'activity']); // 경험 위키에서 가져오는 섹션
  const ADD_LABEL = { education: '학력 추가', award: '수상·자격 추가' };
  const SKILL_GROUPS = ['언어', '프레임워크·라이브러리', 'DB·인프라', '도구·협업'];
  const PROFILE = [
    ['name', '이름', ''], ['headline', '한 줄 소개', '데이터로 병목을 찾는 백엔드 개발자'], ['email', '이메일', 'name@example.com'],
    ['phone', '연락처', '010-0000-0000'], ['github', 'GitHub', 'github.com/아이디'], ['blog', '블로그', 'velog.io/@아이디'], ['intro', '자기소개', '어떤 문제를 어떻게 푸는 사람인지 두세 문장으로'],
  ];
  const FIELDS = { // 항목의 칸 이름
    project: { title: '프로젝트 이름', org: '소속', role: '역할' }, career: { title: '이름', org: '회사', role: '역할' }, activity: { title: '활동 이름', org: '기관', role: '역할' },
    education: { title: '학교와 전공, 과정 이름', org: '학위나 상태', role: '학점' }, award: { title: '이름', org: '주최·발급 기관' },
  };
  const PLACEHOLDER = { education: { title: '○○대학교 컴퓨터공학과', org: '학사 졸업 예정', role: '학점 3.8 / 4.5' }, award: { title: 'SQLD', org: '한국데이터산업진흥원' } };

  let ui = null; // 이 화면의 상태. render 마다 새로 만든다
  let redraw = null; // 화면이 떠 있을 때만

  /* ---------------- 데이터 ---------------- */
  const ym = (s) => String(s || '').replace('-', '.');
  function fmtPeriod(p) {
    if (!p || (!p.start && !p.end)) return '';
    if (!p.start) return ym(p.end);
    return p.start === p.end ? ym(p.start) : `${ym(p.start)} – ${p.end ? ym(p.end) : '현재'}`;
  }
  const sorted = () => S.resume().entries.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const ofSection = (sec) => sorted().filter((e) => e.section === sec);
  const expIdOf = (b) => (b.source && b.source.type === 'card' ? b.source.expId : null);
  const inTrash = (kind, id) => S.trash().some((t) => (t.data[kind] || []).some((x) => x.id === id));
  // 연결한 프로젝트가 휴지통에 있거나 지워졌으면 이력서에서도 빠진다
  const gone = (e) => WIKI.has(e.section) && !!e.projectId && !S.getProject(e.projectId);
  const lineOf = (c) => (ui && ui.draft && ui.draft.expId === c.id ? clean(ui.draft.text) : c.resumeLine || '');

  // 항목에 보이는 줄: 담은 순서 → 아직 담지 않은 이 프로젝트의 카드. kind: card | manual | trash
  function rowsOf(e) {
    const cardRow = (c, b) => { const text = lineOf(c); const first = ui && ui.draft && ui.draft.expId === c.id && !c.resumeLine; return { kind: 'card', key: c.id, c, b, text, on: !!text && (!!first || !!(b && b.included)) }; };
    const rows = e.bullets.map((b) => {
      const x = expIdOf(b); if (!x) return { kind: 'manual', key: b.id, b, text: b.text, on: b.included && !!clean(b.text) };
      const c = S.get(x); if (c) return cardRow(c, b);
      return inTrash('experiences', x) ? { kind: 'trash', key: x, b, text: '', on: false } : null;
    }).filter(Boolean);
    if (e.projectId && WIKI.has(e.section)) App.ai.rankCards(S.cardsOf(e.projectId)).forEach((c) => { if (!rows.some((r) => r.key === c.id)) rows.push(cardRow(c, null)); });
    return rows;
  }
  // 지금 종이에 놓이는 내용
  function current() {
    const r = S.resume();
    const sections = SECTIONS.map(([key, label]) => ({
      key, label,
      items: ofSection(key).filter((e) => e.included && !gone(e)).map((e) => ({ e, lines: rowsOf(e).filter((x) => x.on) })).filter((x) => clean(x.e.title) || x.lines.length),
    })).filter((s) => s.items.length);
    return { profile: r.profile, skills: r.skills.filter((s) => s.included), sections };
  }
  const isBlank = () => { const c = current(); return !c.sections.length && !c.skills.length && !PROFILE.some(([k]) => !['name', 'email'].includes(k) && clean(c.profile[k])); };
  const cardItem = (c) => ({ text: c.resumeLine || '', included: false, source: { type: 'card', expId: c.id, projectId: c.projectId } });
  // 아직 담지 않은 카드도 (뺀 상태로) 줄로 만든다 — 순서를 기억하기 위해
  function ensureBullets(e) { const fresh = rowsOf(e).filter((r) => r.kind === 'card' && !r.b).map((r) => cardItem(r.c)); if (fresh.length) S.addResumeBullets(e.id, fresh); }
  const bulletBy = (e, key) => e.bullets.find((b) => expIdOf(b) === key || b.id === key);

  /* ---------------- 종이 ---------------- */
  const K = (key, text) => `<span data-k="${esc(key)}">${esc(text)}</span>`;
  const ghost = (text) => `<span class="rs-ghost">${esc(text)}</span>`;
  function paperHTML() {
    const c = current(); const pr = c.profile;
    const contact = [['이메일', 'email'], ['연락처', 'phone'], ['GitHub', 'github'], ['블로그', 'blog']].filter(([, k]) => clean(pr[k]));
    const sec = (label, body) => `<section class="rs-p-sec"><h3>${label}</h3><div class="rs-p-body">${body}</div></section>`;
    const entry = ({ e, lines }) => {
      const sub = [['org', e.org], ['role', e.role]].filter(([, v]) => clean(v)); const date = fmtPeriod(e.period);
      return `<div class="rs-p-entry"><div class="rs-p-row"><h4>${clean(e.title) ? K(`e.${e.id}.title`, e.title) : ghost('제목')}</h4>${date ? `<span class="rs-p-date">${K(`e.${e.id}.date`, date)}</span>` : ''}</div>
        ${sub.length ? `<div class="rs-p-sub">${sub.map(([k, v]) => K(`e.${e.id}.${k}`, v)).join('')}</div>` : ''}
        ${lines.length ? `<ul>${lines.map((l) => `<li>${K(`b.${l.key}`, l.text)}</li>`).join('')}</ul>` : ''}</div>`;
    };
    const skills = c.skills.length ? sec('기술', `<dl class="rs-p-skills">${SKILL_GROUPS.map((g) => {
      const l = c.skills.filter((s) => (SKILL_GROUPS.includes(s.group) ? s.group : SKILL_GROUPS[1]) === g);
      return l.length ? `<dt>${g}</dt><dd>${l.map((s) => K(`s.${s.id}`, s.name)).join(', ')}</dd>` : '';
    }).join('')}</dl>`) : '';
    return `<header class="rs-p-head">
        <div><h2>${clean(pr.name) ? K('p.name', pr.name) : ghost('이름')}</h2><p class="rs-p-headline">${clean(pr.headline) ? K('p.headline', pr.headline) : ghost('한 줄 소개')}</p></div>
        ${contact.length ? `<dl class="rs-p-contact">${contact.map(([l, k]) => `<dt>${l}</dt><dd>${K('p.' + k, pr[k])}</dd>`).join('')}</dl>` : ''}
      </header>
      ${clean(pr.intro) ? `<p class="rs-p-intro">${K('p.intro', pr.intro)}</p>` : ''}
      ${skills}
      ${c.sections.map((s) => sec(s.label, s.items.map(entry).join(''))).join('')}
      ${c.sections.length ? '' : `<div class="rs-ghosts">${sec('프로젝트', `<div class="rs-p-entry"><div class="rs-p-row"><h4>${ghost('경험 위키에서 가져온 프로젝트')}</h4></div><ul><li>${ghost('고른 경험 카드의 이력서 한 줄이 여기에 놓여요')}</li></ul></div>`)}</div>`}`;
  }
  function plainText() {
    const c = current(); const pr = c.profile; const L = [];
    const push = (...x) => L.push(...x.filter(Boolean));
    push(clean(pr.name), clean(pr.headline), [pr.email, pr.phone, pr.github, pr.blog].map(clean).filter(Boolean).join(' | '));
    if (clean(pr.intro)) L.push('', pr.intro.trim());
    if (c.skills.length) { L.push('', '[기술]'); SKILL_GROUPS.forEach((g) => { const l = c.skills.filter((s) => (SKILL_GROUPS.includes(s.group) ? s.group : SKILL_GROUPS[1]) === g); if (l.length) L.push(`${g}: ${l.map((s) => s.name).join(', ')}`); }); }
    c.sections.forEach((s) => {
      L.push('', `[${s.label}]`);
      s.items.forEach(({ e, lines }, i) => {
        const d = fmtPeriod(e.period); if (i && lines.length) L.push('');
        push(`${clean(e.title)}${d ? ` (${d})` : ''}`, [e.org, e.role].map(clean).filter(Boolean).join(' | '));
        lines.forEach((l) => L.push(`- ${l.text}`));
      });
    });
    return L.join('\n');
  }

  /* ---------------- 버전 ---------------- */
  // 저장할 때: 카드의 지금 문장을 굳힌다. 보이지 않는 줄(휴지통)은 뺀 것으로
  function saveVersion(name) {
    S.resume().entries.forEach((e) => e.bullets.forEach((b) => { const c = expIdOf(b) && S.get(expIdOf(b)); if (c && c.resumeLine) { b.text = c.resumeLine; delete b.edited; } }));
    const live = new Map(current().sections.flatMap((s) => s.items).map(({ e, lines }) => [e.id, new Set(lines.map((l) => l.key))]));
    const v = S.saveResumeVersion(clean(name));
    v.snapshot.entries.forEach((e) => { if (!live.has(e.id)) e.included = false; else e.bullets.forEach((b) => { b.included = live.get(e.id).has(expIdOf(b) || b.id); }); });
    S.touch(); return v;
  }
  function flat(snap) { // 저장한 버전에서 보이던 것만
    const entries = new Map(); const lines = new Map();
    (snap.entries || []).filter((e) => e.included).forEach((e) => { entries.set(e.id, e); e.bullets.filter((b) => b.included && clean(b.text)).forEach((b) => lines.set(expIdOf(b) || b.id, { text: clean(b.text), e })); });
    return { profile: snap.profile || {}, skills: (snap.skills || []).filter((s) => s.included).map((s) => s.name), entries, lines };
  }
  function flatNow() {
    const c = current(); const entries = new Map(); const lines = new Map();
    c.sections.forEach((s) => s.items.forEach((x) => { entries.set(x.e.id, x.e); x.lines.forEach((l) => lines.set(l.key, { text: clean(l.text), e: x.e })); }));
    return { profile: c.profile, skills: c.skills.map((s) => s.name), entries, lines };
  }
  // 저장한 버전 → 지금 [{ group, before, after }]
  function diff(v) {
    const a = flat(v.snapshot), b = flatNow(); const out = [];
    const add = (group, before, after) => { if (clean(before) !== clean(after)) out.push({ group, before: clean(before), after: clean(after) }); };
    const head = (e) => (e ? [e.title, e.org, e.role].map(clean).filter(Boolean).join(', ') + (fmtPeriod(e.period) ? ` (${fmtPeriod(e.period)})` : '') : '');
    PROFILE.forEach(([k, l]) => add(l, a.profile[k], b.profile[k]));
    b.skills.filter((n) => !a.skills.includes(n)).forEach((n) => add('기술', '', n)); a.skills.filter((n) => !b.skills.includes(n)).forEach((n) => add('기술', n, ''));
    SECTIONS.forEach(([key, label]) => {
      new Set([...a.entries.keys(), ...b.entries.keys()]).forEach((id) => {
        const x = a.entries.get(id), y = b.entries.get(id); if ((y || x).section !== key) return;
        add(label, head(x), head(y));
        new Set([...a.lines.keys(), ...b.lines.keys()]).forEach((lk) => {
          const p = a.lines.get(lk), q = b.lines.get(lk); if ((q || p).e.id !== id) return;
          add(clean((y || x).title) || label, p && p.text, q && q.text);
        });
      });
    });
    return out;
  }
  function saveVersionModal() {
    App.ui.modal({
      title: '버전 저장', confirmText: '저장',
      body: '<div class="field"><label class="label" for="rs-vn">버전 이름</label><input class="input" id="rs-vn" maxlength="40" placeholder="모아페이 지원용" autocomplete="off"></div>',
      onConfirm(m) { const v = saveVersion(m.querySelector('#rs-vn').value); App.ui.toast(`「${v.name}」 버전을 저장했어요`); if (redraw) redraw(); },
    });
  }
  function versionsModal() {
    const vs = S.resume().versions;
    App.ui.modal({
      title: '지난 버전', cancelText: '닫기', hideConfirm: true,
      body: vs.length ? `<ul class="list list-flush">${vs.map((v) => `<li class="list-row rs-v"><span class="list-row-main"><span class="list-row-title">${esc(v.name)}</span><span class="list-row-sub">${esc(App.ui.date(v.savedAt))}</span></span>
        <span class="list-row-actions"><button type="button" class="btn btn-ghost btn-sm" data-v="compare" data-id="${esc(v.id)}">비교</button><button type="button" class="btn btn-sm" data-v="restore" data-id="${esc(v.id)}">복원</button><button type="button" class="icon-btn" data-v="del" data-id="${esc(v.id)}" aria-label="${esc(v.name)} 지우기">${I('trash')}</button></span></li>`).join('')}</ul>`
        : '<div class="empty"><div class="empty-title">아직 저장한 버전이 없어요</div><button type="button" class="btn" data-v="save">버전 저장</button></div>',
      onOpen(root, close) {
        root.querySelector('.modal-body').onclick = (ev) => {
          const b = ev.target.closest('[data-v]'); if (!b) return; const act = b.dataset.v; if (act === 'save') return saveVersionModal();
          const v = vs.find((x) => x.id === b.dataset.id); if (!v) return;
          if (act === 'compare') compareModal(v);
          if (act === 'restore') { close(); restore(v); }
          if (act === 'del') { const i = S.resume().versions.indexOf(v); S.removeResumeVersion(v.id); versionsModal(); undoToast(`「${v.name}」 버전을 지웠어요`, () => { S.resume().versions.splice(i, 0, v); S.touch(); App.ui.closeModal(); }); if (redraw) redraw(); }
        };
      },
    });
  }
  function compareModal(v) {
    const list = diff(v); let last = '';
    App.ui.modal({
      title: `「${v.name}」 이후 바뀐 내용`, size: 'lg', cancelText: '닫기', confirmText: '이 버전으로 복원', hideConfirm: !list.length,
      body: list.length ? `<ul class="rs-diff">${list.map((d) => { const g = d.group === last ? '' : `<h3>${esc(d.group)}</h3>`; last = d.group; return `<li>${g}${d.before ? `<p><del>${esc(d.before)}</del></p>` : ''}${d.after ? `<p><ins>${esc(d.after)}</ins></p>` : ''}</li>`; }).join('')}</ul>` : '<div class="empty">지금 이력서와 똑같아요.</div>',
      onConfirm() { restore(v); },
    });
  }
  // 복원하기 전 이력서는 (저장한 적 없으면) 버전으로 남긴다
  function restore(v) {
    const prev = clone(S.resume());
    if (!S.resume().versions.some((x) => !diff(x).length)) saveVersion('복원 전 이력서');
    S.restoreResumeVersion(v.id);
    // 경험 카드의 이력서 한 줄도 그 버전의 문장으로 (이력서와 카드는 같은 문장을 쓴다)
    const lines = [];
    v.snapshot.entries.forEach((e) => { if (WIKI.has(e.section)) e.bullets.forEach((b) => { const c = expIdOf(b) && S.get(expIdOf(b)); if (!c || !b.text || c.resumeLine === b.text) return; lines.push({ id: c.id, line: c.resumeLine, edited: !!c.resumeLineEdited, ai: c.aiLine }); S.setResumeLine(c.id, b.text); }); });
    if (redraw) redraw();
    undoToast(`「${v.name}」 버전으로 복원했어요${lines.length ? `. 경험 카드 ${lines.length}장의 이력서 한 줄도 바뀌었어요` : ''}`, () => {
      Object.assign(S.resume(), prev);
      lines.forEach((x) => { const c = S.get(x.id); if (c) Object.assign(c, { resumeLine: x.line, resumeLineEdited: x.edited, aiLine: x.ai }); });
      S.touch();
    });
  }
  function undoToast(msg, fn) { const me = meId(); App.ui.toast(msg, { action: '되돌리기', onAction() { if (meId() !== me) return; fn(); if (redraw) redraw(); App.ui.toast('되돌렸어요'); } }); }

  /* ---------------- 경험 위키에서 가져오기 ---------------- */
  function importModal(sec) {
    const add = (ps) => {
      const ids = ps.filter((p) => p && !S.resume().entries.some((e) => e.projectId === p.id)).map((p) => {
        const e = S.addResumeEntry({ section: sec, title: p.title, period: clone(p.period || { start: '', end: '' }), role: p.role || '', projectId: p.id, order: Math.max(-1, ...S.resume().entries.map((x) => x.order || 0)) + 1 });
        ensureBullets(e); return e.id;
      });
      if (!ids.length || !ui) return; ui.open[sec] = true; ids.forEach((id) => { ui.entry[id] = true; });
      if (redraw) redraw({ reveal: ids[0] });
    };
    const used = new Set(S.resume().entries.map((e) => e.projectId).filter(Boolean));
    const list = S.projects().filter((p) => !used.has(p.id));
    const any = S.projects().length;
    App.ui.modal({
      title: '경험 위키에서 가져오기', size: 'lg', confirmText: '가져오기', hideConfirm: !list.length, cancelText: list.length ? '취소' : '닫기',
      body: list.length ? list.map((p) => { const n = S.cardsOf(p.id).length; return `<label class="choice"><input type="checkbox" value="${esc(p.id)}"><span class="choice-main"><span class="choice-title">${esc(p.title)}</span>
          <span class="choice-sub meta"><span>${esc(App.ui.period(p.period))}</span>${p.role ? `<span>${esc(p.role)}</span>` : ''}<span>경험 카드 ${n}개</span></span></span></label>`; }).join('')
        : `<div class="empty"><div class="empty-title">${any ? '모든 프로젝트가 이력서에 있어요' : '경험 위키에 프로젝트가 없어요'}</div><button type="button" class="btn btn-primary" data-new>${I('plus', 16)}새 프로젝트</button></div>`,
      onOpen(root) {
        const ok = root.querySelector('[data-m=ok]'); const nb = root.querySelector('[data-new]');
        if (nb) nb.onclick = () => App.repoFlow.openNewProject((p) => add([p]));
        if (ok) { ok.disabled = true; root.querySelector('.modal-body').onchange = () => { const n = root.querySelectorAll('.choice input:checked').length; ok.disabled = !n; ok.textContent = n ? `${n}개 가져오기` : '가져오기'; }; }
      },
      onConfirm(root) { add([...root.querySelectorAll('.choice input:checked')].map((x) => S.getProject(x.value))); },
    });
  }

  /* ---------------- 편집 ---------------- */
  const menu = (label, items) => `<div class="menu"><button type="button" class="icon-btn" aria-haspopup="menu" aria-expanded="false" aria-label="${esc(label)} 메뉴">${I('more')}</button><div class="menu-list">${items.join('')}</div></div>`;
  const item = (act, icon, label, attrs, cls) => `<button type="button" data-act="${act}" ${attrs} ${cls ? `class="${cls}"` : ''}>${icon}${label}</button>`;
  const UP = I('arrow-up', 16); const DOWN = `<span class="rs-flip">${UP}</span>`;
  const moves = (act, attrs, i, n) => [i > 0 ? item(act, UP, '위로', `${attrs} data-dir="-1"`) : '', i < n - 1 ? item(act, DOWN, '아래로', `${attrs} data-dir="1"`) : ''];

  function profileBody() {
    const pr = S.resume().profile;
    return `<div class="rs-grid">${PROFILE.map(([k, l, ph]) => `<div class="${['email', 'phone', 'github', 'blog'].includes(k) ? '' : 'rs-wide'}"><label class="label" for="rs-p-${k}">${l}</label>
      ${k === 'intro' ? `<textarea class="textarea" id="rs-p-${k}" data-pf="${k}" rows="4" placeholder="${esc(ph)}">${esc(pr[k])}</textarea>` : `<input class="input" id="rs-p-${k}" data-pf="${k}" value="${esc(pr[k])}" placeholder="${esc(ph)}" autocomplete="off">`}</div>`).join('')}</div>`;
  }
  function skillsBody() {
    const sk = S.resume().skills;
    return `${sk.length ? `<div class="rs-skills">${sk.map((s) => `<span class="chip rs-skill ${s.included ? 'is-in' : ''}"><button type="button" class="rs-skill-t" data-act="skill" data-id="${esc(s.id)}" data-fk="s.${esc(s.id)}" aria-pressed="${!!s.included}">${I(s.included ? 'check' : 'plus', 14)}<span>${esc(s.name)}</span></button><button type="button" class="chip-x" data-act="skill-del" data-id="${esc(s.id)}" aria-label="${esc(s.name)} 지우기">${I('close', 14)}</button></span>`).join('')}</div>` : ''}
      <div class="rs-inline"><input class="input" data-skill data-fk="skill-new" aria-label="기술 추가" placeholder="Kafka, React" maxlength="40" autocomplete="off"><button type="button" class="btn" data-act="skill-add">추가</button></div>`;
  }
  function formHTML(e) {
    const F = FIELDS[e.section]; const ph = PLACEHOLDER[e.section] || {}; const id = esc(e.id); const p = e.period || {};
    const f = (k, wide) => (F[k] ? `<div class="${wide ? 'rs-wide' : ''}"><label class="label" for="rs-${id}-${k}">${F[k]}</label><input class="input" id="rs-${id}-${k}" data-ef="${k}" data-id="${id}" value="${esc(e[k])}" placeholder="${esc(ph[k] || '')}" autocomplete="off"></div>` : '');
    const m = (k, label) => `<div><label class="label" for="rs-${id}-${k}">${label}</label><input class="input" type="month" id="rs-${id}-${k}" data-ef="${k}" data-id="${id}" value="${esc(p[k])}" placeholder="2026-03" max="2099-12"></div>`;
    return `<div class="rs-grid rs-form">${f('title', true)}${f('org')}${f('role')}${e.section === 'award' ? m('start', '취득한 달') : `${m('start', '시작')}${m('end', '끝 (비우면 현재)')}`}<p class="field-error rs-wide" data-perr="${id}" role="alert" hidden>${I('warning', 15)}끝나는 달이 시작보다 빨라요.</p></div>`;
  }
  function cardRowHTML(e, r, i, n) {
    const a = `data-e="${esc(e.id)}" data-key="${esc(r.key)}"`;
    if (r.kind === 'trash') return `<li class="rs-line is-gone">${App.ui.goneCard(r.key)}</li>`;
    const editing = r.kind === 'card' && ui.draft && ui.draft.expId === r.key; const id = `rs-b-${esc(e.id)}-${esc(r.key)}`;
    const title = r.kind === 'card' ? r.c.title : r.text;
    const body = r.kind !== 'card' ? '' : editing ? `<div class="rs-edit"><textarea class="textarea" data-draft rows="2" aria-label="이력서 한 줄" aria-describedby="${id}-h">${esc(ui.draft.text)}</textarea>
        <div class="rs-edit-foot"><span class="field-hint" id="${id}-h">경험 카드의 이력서 한 줄도 함께 바뀌어요</span><button type="button" class="btn btn-ghost btn-sm" data-act="draft-cancel">취소</button><button type="button" class="btn btn-sm" data-act="draft-save">완료</button></div></div>`
      : r.text ? `<button type="button" class="rs-line-text" data-act="edit" ${a} data-fk="t.${esc(r.key)}" aria-label="이력서 한 줄 고치기: ${esc(r.text)}">${esc(r.text)}${I('edit', 14)}</button>`
        : `<button type="button" class="link rs-line-new" data-act="edit" ${a} data-fk="t.${esc(r.key)}">이력서 한 줄 쓰기</button>`;
    return `<li class="rs-line ${r.on ? 'is-in' : ''}"><input type="checkbox" id="${id}" data-act="line" ${a} data-fk="c.${esc(r.key)}" ${r.on ? 'checked' : ''} ${r.text ? '' : 'disabled'}>
      <div class="rs-line-main"><label class="rs-line-title" for="${id}">${esc(title)}</label>${body}</div>
      ${menu(title, [...moves('line-move', a, i, n), r.kind === 'card' ? `${n > 1 ? '<hr>' : ''}<a href="#/card/${encodeURIComponent(r.key)}">${I('card', 16)}경험 카드 보기</a>` : item('line-del', I('close', 16), '빼기', a)])}</li>`;
  }
  function wikiBody(e) {
    const rows = rowsOf(e); const cards = rows.filter((r) => r.kind === 'card');
    return `<div class="rs-entry-bar">${App.ui.projChip(e.projectId, { link: true })}<button type="button" class="btn btn-ghost btn-sm" data-act="form" data-id="${esc(e.id)}" data-fk="f.${esc(e.id)}" aria-expanded="${!!ui.form[e.id]}">${I('edit', 15)}이름과 기간</button></div>
      ${ui.form[e.id] ? formHTML(e) : ''}
      ${rows.length ? `<ul class="rs-lines">${rows.map((r, i) => cardRowHTML(e, r, i, rows.length)).join('')}</ul>` : ''}
      ${cards.length ? '' : `<div class="rs-none"><span>아직 경험 카드가 없어요.</span><button type="button" class="btn btn-sm" data-chat data-chat-project="${esc(e.projectId)}">${I('chat', 16)}AI 채팅으로 만들기</button></div>`}`;
  }
  function manualBody(e) {
    return `${formHTML(e)}<div class="rs-manual">${e.bullets.map((b, i) => `<div class="rs-inline"><input class="input" data-line="${esc(b.id)}" data-e="${esc(e.id)}" data-fk="l.${esc(b.id)}" value="${esc(b.text)}" aria-label="내용 ${i + 1}" placeholder="주요 과목, 활동, 성과" autocomplete="off"><button type="button" class="icon-btn" data-act="line-del" data-e="${esc(e.id)}" data-key="${esc(b.id)}" aria-label="이 줄 지우기">${I('close', 16)}</button></div>`).join('')}
      <button type="button" class="btn btn-ghost btn-sm rs-add" data-act="line-add" data-id="${esc(e.id)}">${I('plus', 16)}내용 한 줄 추가</button></div>`;
  }
  function entryHTML(e, i, n) {
    const id = esc(e.id); const wiki = WIKI.has(e.section) && e.projectId; const off = gone(e); const open = !off && !!ui.entry[e.id];
    const title = clean(e.title) || (e.section === 'education' ? '새 학력' : e.section === 'award' ? '새 수상·자격' : '제목 없음');
    const rows = wiki && !off ? rowsOf(e).filter((r) => r.kind === 'card') : [];
    const meta = off ? [inTrash('projects', e.projectId) ? '휴지통에 있는 프로젝트' : '지워진 프로젝트']
      : [fmtPeriod(e.period), wiki ? (rows.length ? `경험 카드 ${rows.length}개 중 ${rows.filter((r) => r.on).length}개` : '경험 카드 없음') : clean(e.org)].filter(Boolean);
    return `<article class="rs-entry ${e.included && !off ? '' : 'is-off'}" data-entry="${id}">
      <div class="rs-entry-head"><input type="checkbox" data-act="entry-on" data-id="${id}" data-fk="o.${id}" ${e.included && !off ? 'checked' : ''} ${off ? 'disabled' : ''} aria-label="${esc(title)} 이력서에 넣기">
        <button type="button" class="rs-entry-t" data-act="entry" data-id="${id}" data-fk="e.${id}" aria-expanded="${open}" ${off ? 'disabled' : ''}><span class="rs-entry-name" data-title="${id}">${esc(title)}</span><span class="meta">${meta.map((x) => `<span>${esc(x)}</span>`).join('')}</span></button>
        ${off ? '' : `<span class="rs-chev" aria-hidden="true">${I('chevron-down', 16)}</span>`}
        ${menu(title, [...moves('entry-move', `data-id="${id}"`, i, n), item('entry-del', I(wiki ? 'close' : 'trash', 16), wiki ? '이력서에서 빼기' : '지우기', `data-id="${id}"`)])}</div>
      ${open ? `<div class="rs-entry-body">${wiki ? wikiBody(e) : manualBody(e)}</div>` : ''}</article>`;
  }
  function sectionHTML(key, label, count, body) {
    const open = !!ui.open[key];
    return `<section class="rs-sec"><h2 class="rs-sec-h"><button type="button" data-act="sec" data-sec="${key}" data-fk="sec.${key}" aria-expanded="${open}"><span>${label}</span>${count ? `<span class="count">${count}</span>` : ''}${I('chevron-down', 18)}</button></h2>${open ? `<div class="rs-sec-body">${body()}</div>` : ''}</section>`;
  }
  function editorHTML() {
    const blank = isBlank(); const inn = (l) => l.filter((x) => x.included).length;
    return `${sectionHTML('profile', '기본 정보', 0, profileBody)}${sectionHTML('skills', '기술', inn(S.resume().skills), skillsBody)}
      ${SECTIONS.map(([key, label]) => { const list = ofSection(key); return sectionHTML(key, label, list.filter((e) => e.included && !gone(e)).length, () => `${list.map((e, i) => entryHTML(e, i, list.length)).join('')}
        ${WIKI.has(key) ? `<button type="button" class="btn ${blank && key === 'project' ? 'btn-primary' : ''} rs-import" data-act="import" data-sec="${key}" data-fk="imp.${key}">${I('wiki', 16)}경험 위키에서 가져오기</button>` : `<button type="button" class="btn rs-import" data-act="entry-add" data-sec="${key}" data-fk="add.${key}">${I('plus', 16)}${ADD_LABEL[key]}</button>`}`); }).join('')}`;
  }
  const actionsHTML = () => {
    const n = S.resume().versions.length;
    return `<div class="menu"><button type="button" class="btn btn-ghost btn-sm" aria-haspopup="menu" aria-expanded="false" aria-label="버전">${I('history', 16)}<span class="hide-mobile">버전</span></button><div class="menu-list"><button type="button" data-top="save">${I('file', 16)}버전 저장</button><button type="button" data-top="versions">${I('history', 16)}지난 버전${n ? `<span class="count">${n}</span>` : ''}</button></div></div>
      <button type="button" class="btn btn-ghost btn-sm" data-top="copy" aria-label="텍스트 복사">${I('copy', 16)}<span class="hide-mobile">텍스트 복사</span></button>
      <button type="button" class="btn btn-sm ${isBlank() ? '' : 'btn-primary'}" data-top="print">${I('print', 16)}인쇄<span class="hide-mobile"> / PDF</span></button>`;
  };

  /* ---------------- 화면 ---------------- */
  function freshUI() {
    ui = { view: 'edit', open: { project: true }, entry: {}, form: {}, draft: null };
    if (isBlank()) ui.open.profile = true;
    return ui;
  }
  App.screens.resume = {
    title: '마스터 이력서',
    actions: () => actionsHTML(),
    render() {
      freshUI();
      const seg = (v, l) => `<button type="button" class="seg-btn ${ui.view === v ? 'is-on' : ''}" aria-pressed="${ui.view === v}" data-act="view" data-v="${v}">${l}</button>`;
      return `<div class="page rs-page" data-view="${ui.view}"><div class="rs-left"><header class="rs-top"><h1 class="page-title">마스터 이력서</h1><div class="seg">${seg('edit', '편집')}${seg('preview', '미리보기')}</div></header>
        <div class="rs-editor" data-editor>${editorHTML()}</div></div>
        <div class="rs-preview" data-preview tabindex="0" role="region" aria-label="이력서 미리보기"><div class="paper rs-paper" data-paper>${paperHTML()}</div></div></div>`;
    },
    mount(screenEl) {
      const page = screenEl.querySelector('.rs-page'); const editor = page.querySelector('[data-editor]');
      const preview = page.querySelector('[data-preview]'); const paper = page.querySelector('[data-paper]');
      const top = document.querySelector('.topbar-actions'); const me = meId();

      /* ----- 그리기 ----- */
      function paintPaper() {
        const read = () => new Map([...paper.querySelectorAll('[data-k]')].map((el) => [el.dataset.k, el.textContent]));
        const before = read(); paper.innerHTML = paperHTML();
        const hits = [...paper.querySelectorAll('[data-k]')].filter((el) => before.get(el.dataset.k) !== el.textContent);
        if (hits.length > 12) return; // 복원처럼 통째로 바뀐 때는 강조하지 않는다
        hits.forEach((el) => el.classList.add('rs-hit'));
        if (!hits.length || !preview.clientHeight || preview.scrollHeight <= preview.clientHeight) return;
        const box = preview.getBoundingClientRect(), r = hits[0].getBoundingClientRect();
        if (r.top < box.top + 8 || r.bottom > box.bottom - 8) preview.scrollTo({ top: preview.scrollTop + r.top - box.top - box.height / 3, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      function draw(o = {}) {
        const fk = o.focus || (document.activeElement && editor.contains(document.activeElement) ? document.activeElement.dataset.fk : '');
        editor.innerHTML = editorHTML(); if (top) top.innerHTML = actionsHTML(); paintPaper();
        if (o.reveal) { const el = editor.querySelector(`[data-entry="${CSS.escape(o.reveal)}"]`); if (el) { el.scrollIntoView({ block: 'center' }); const b = el.querySelector('.rs-lines input:not([disabled]), .rs-entry-t'); if (b) b.focus({ preventScroll: true }); } return; }
        const t = fk && (editor.querySelector(`[data-fk="${CSS.escape(fk)}"]`) || (o.sel && editor.querySelector(o.sel))); const el = t || (o.sel && editor.querySelector(o.sel));
        if (el) { el.focus({ preventScroll: !o.sel }); if (o.caret && el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); }
        if (o.caret) grow(el);
      }
      const grow = (ta) => { if (ta && ta.matches && ta.matches('[data-draft]')) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; } };
      redraw = (o) => draw(o);
      // 종이 크기: 넓으면 A4 한 장을 줄여서, 좁으면 화면 너비에 맞춰 흐르게
      const fit = () => { const w = preview.clientWidth - 2 * parseFloat(getComputedStyle(preview).paddingLeft); if (w <= 0) return; const flow = w < 480 || (w < 680 && window.innerWidth <= 1100); paper.classList.toggle('is-flow', flow); paper.style.setProperty('--zoom', flow ? 1 : Math.min(1, w / SHEET)); };
      const ro = new ResizeObserver(fit); ro.observe(preview); fit();

      /* ----- 이력서 한 줄 고치기 ----- */
      function commit() {
        const d = ui.draft; if (!d) return; ui.draft = null;
        const c = S.get(d.expId); const text = clean(d.text); if (!c || !text || meId() !== me) return;
        const first = !c.resumeLine; if (text !== c.resumeLine) S.setResumeLine(c.id, text);
        const e = S.resumeEntry(d.eid); if (first && e) setLine(e, c.id, true);
      }
      function setLine(e, key, on) {
        ensureBullets(e); const b = bulletBy(e, key); if (!b) return; const c = S.get(key);
        S.updateResumeBullet(e.id, b.id, Object.assign({ included: on }, c && c.resumeLine ? { text: c.resumeLine } : {}));
        if (on && !e.included) S.updateResumeEntry(e.id, { included: true });
      }
      const swap = (list, i, j) => { const l = list.slice(); [l[i], l[j]] = [l[j], l[i]]; return l; };
      function moveEntry(id, dir) {
        const all = sorted(); const same = all.filter((x) => x.section === S.resumeEntry(id).section); const i = same.findIndex((x) => x.id === id); if (!same[i + dir]) return;
        S.reorderResumeEntries(swap(all, all.indexOf(same[i]), all.indexOf(same[i + dir])).map((x) => x.id));
      }
      function moveLine(e, key, dir) {
        ensureBullets(e); const rows = rowsOf(e); const i = rows.findIndex((r) => r.key === key); if (!rows[i + dir]) return;
        const ids = e.bullets.map((b) => b.id); S.reorderResumeBullets(e.id, swap(ids, ids.indexOf(rows[i].b.id), ids.indexOf(rows[i + dir].b.id)));
      }
      function addSkills() {
        const inp = editor.querySelector('[data-skill]'); const names = inp.value.split(',').map(clean).filter(Boolean); if (!names.length) { inp.focus(); return; }
        names.forEach((name) => { const cur = S.resume().skills.find((s) => s.name.toLowerCase() === name.toLowerCase()); if (cur) S.updateSkill(cur.id, { included: true }); else S.addSkill({ name, group: S.skillGroup(name) }); });
        draw({ focus: 'skill-new' });
      }
      const putBack = (list, i, x) => { list.splice(i, 0, x); S.touch(); };

      function onClick(ev) {
        const a = ev.target.closest('[data-act]'); if (!a || a.matches('input')) return;
        const act = a.dataset.act; const { id, e: eid, key, sec } = a.dataset; const en = S.resumeEntry(id || eid);
        if (act === 'draft-cancel') { const k = ui.draft && ui.draft.expId; ui.draft = null; draw({ focus: 't.' + k }); return; }
        const was = ui.draft && ui.draft.expId; commit();
        switch (act) {
          case 'view': ui.view = a.dataset.v; page.dataset.view = ui.view; page.querySelectorAll('[data-act=view]').forEach((b) => { const on = b === a; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); }); if (was) draw(); window.scrollTo(0, 0); fit(); break;
          case 'draft-save': draw({ focus: 't.' + was }); break;
          case 'sec': ui.open[sec] = !ui.open[sec]; draw(); break;
          case 'import': importModal(sec); if (was) draw(); break;
          case 'entry': ui.entry[id] = !ui.entry[id]; draw(); break;
          case 'form': ui.form[id] = !ui.form[id]; draw(ui.form[id] ? { focus: '-', sel: `[data-ef=title][data-id="${CSS.escape(id)}"]` } : {}); break;
          case 'edit': { const c = S.get(key); if (!c) break; ui.draft = { expId: key, eid, text: c.resumeLine || '' }; draw({ focus: '-', sel: '[data-draft]', caret: true }); break; }
          case 'entry-add': { const e = S.addResumeEntry({ section: sec, order: Math.max(-1, ...S.resume().entries.map((x) => x.order || 0)) + 1 }); ui.entry[e.id] = true; draw({ focus: '-', sel: `[data-ef=title][data-id="${CSS.escape(e.id)}"]` }); break; }
          case 'entry-move': if (en) moveEntry(id, +a.dataset.dir); draw({ focus: 'e.' + id }); break;
          case 'entry-del': { if (!en) break; const i = S.resume().entries.indexOf(en); S.removeResumeEntry(id); draw(); undoToast(`「${clean(en.title) || LABEL[en.section]}」${en.projectId ? ' 이력서에서 뺐어요' : ' 지웠어요'}`, () => putBack(S.resume().entries, i, en)); break; }
          case 'line-move': if (en) moveLine(en, key, +a.dataset.dir); draw({ focus: 'c.' + key }); break;
          case 'line-add': { S.addResumeBullets(id, [{ text: '', source: { type: 'manual' } }]); const b = en.bullets[en.bullets.length - 1]; draw({ focus: 'l.' + b.id }); break; }
          case 'line-del': { const b = en && bulletBy(en, key); if (!b) break; const i = en.bullets.indexOf(b); S.removeResumeBullet(en.id, b.id); draw(); if (clean(b.text)) undoToast('한 줄을 지웠어요', () => putBack(en.bullets, i, b)); break; }
          case 'skill': { const s = S.resume().skills.find((x) => x.id === id); if (s) S.updateSkill(id, { included: !s.included }); draw(); break; }
          case 'skill-del': { const l = S.resume().skills; const i = l.findIndex((x) => x.id === id); const s = l[i]; if (!s) break; S.removeSkill(id); draw({ focus: 'skill-new' }); undoToast(`「${s.name}」 지웠어요`, () => putBack(S.resume().skills, i, s)); break; }
          case 'skill-add': addSkills(); break;
          default: break;
        }
      }
      function onChange(ev) {
        const t = ev.target; const act = t.dataset.act;
        if (act === 'entry-on') { commit(); S.updateResumeEntry(t.dataset.id, { included: t.checked }); draw(); }
        else if (act === 'line') { const on = t.checked; commit(); const e = S.resumeEntry(t.dataset.e); if (e) setLine(e, t.dataset.key, on); draw(); }
        else if (t.dataset.pf) S.updateResumeProfile({ [t.dataset.pf]: t.value.trim() });
      }
      // 글자를 칠 때는 편집 쪽을 다시 그리지 않는다
      function onInput(ev) {
        const t = ev.target; const d = t.dataset;
        if (d.pf) S.updateResumeProfile({ [d.pf]: t.value });
        else if (t.matches('[data-draft]')) { if (!ui.draft) return; ui.draft.text = t.value; grow(t); }
        else if (d.line) S.updateResumeBullet(d.e, d.line, { text: t.value });
        else if (d.ef) {
          const e = S.resumeEntry(d.id); if (!e) return; const v = t.value;
          if (d.ef === 'start' || d.ef === 'end') {
            const iso = v.replace(/[./]/, '-'); if (iso && !/^\d{4}-(0[1-9]|1[0-2])$/.test(iso)) return;
            const val = (k) => { const el = editor.querySelector(`[data-ef=${k}][data-id="${CSS.escape(d.id)}"]`); return el ? el.value.replace(/[./]/, '-') : ''; };
            const p = e.section === 'award' ? { start: iso, end: iso } : { start: val('start'), end: val('end') };
            const bad = !!(p.start && p.end && p.end < p.start); editor.querySelector(`[data-perr="${CSS.escape(d.id)}"]`).hidden = !bad; if (bad) return;
            S.updateResumeEntry(d.id, { period: p });
          } else {
            S.updateResumeEntry(d.id, { [d.ef]: v });
            if (d.ef === 'title') { const el = editor.querySelector(`[data-title="${CSS.escape(d.id)}"]`); if (el && clean(v)) el.textContent = clean(v); }
          }
        } else return;
        paintPaper();
      }
      function onKey(ev) {
        if (ev.isComposing) return; const t = ev.target;
        if (t.matches('[data-skill]') && ev.key === 'Enter') { ev.preventDefault(); addSkills(); }
        else if (t.matches('[data-line]') && ev.key === 'Enter') { ev.preventDefault(); const b = editor.querySelector(`[data-entry="${CSS.escape(t.dataset.e)}"] [data-act=line-add]`); if (b && clean(t.value)) b.click(); }
        else if (t.matches('[data-draft]') && (ev.key === 'Escape' || (ev.key === 'Enter' && !ev.shiftKey))) { ev.preventDefault(); const k = ui.draft && ui.draft.expId; if (ev.key === 'Escape') ui.draft = null; else commit(); draw({ focus: 't.' + k }); }
      }
      function onTop(ev) {
        const b = ev.target.closest('[data-top]'); if (!b) return; const open = !!ui.draft; commit(); if (open) draw();
        const act = b.dataset.top;
        if (act === 'save') saveVersionModal();
        if (act === 'versions') versionsModal();
        if (act === 'print') window.print();
        if (act === 'copy') { const done = (ok) => App.ui.toast(ok ? '이력서를 복사했어요' : '복사하지 못했어요'); if (navigator.clipboard) navigator.clipboard.writeText(plainText()).then(() => done(true), () => done(false)); else done(false); }
      }
      // PDF 파일 이름
      const title = document.title;
      const beforePrint = () => { const n = clean(S.resume().profile.name); document.title = n ? `${n} 이력서` : '이력서'; };
      const afterPrint = () => { document.title = title; };
      const onLeave = () => commit();

      page.addEventListener('click', onClick); page.addEventListener('change', onChange); page.addEventListener('input', onInput); page.addEventListener('keydown', onKey);
      if (top) top.addEventListener('click', onTop);
      window.addEventListener('beforeprint', beforePrint); window.addEventListener('afterprint', afterPrint); window.addEventListener('pagehide', onLeave);
      return () => {
        if (meId() === me) {
          commit();
          // 아무것도 적지 않은 새 항목은 남기지 않는다
          S.resume().entries.filter((e) => !WIKI.has(e.section) && !clean(e.title) && !clean(e.org) && !e.bullets.some((b) => clean(b.text))).forEach((e) => S.removeResumeEntry(e.id));
        }
        redraw = null; ui = null; ro.disconnect();
        window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', afterPrint); window.removeEventListener('pagehide', onLeave);
      };
    },
  };
})(window.App);
