/* 경험 카드 — #/card/:id
   머리 → 이력서 한 줄(직접 고치는 칸) → STAR → 회고(직접 쓰는 칸) → 쓰인 곳 · 근거. 나머지 내용은 AI 채팅으로만 고친다 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store;
  const STAR = [['situation', '상황'], ['task', '과제'], ['action', '행동'], ['result', '결과']];
  const chatAttrs = (e) => `data-chat data-chat-project="${esc(e.projectId)}" data-chat-card="${esc(e.id)}"`;
  const one = (t) => String(t || '').trim().replace(/\s+/g, ' ');

  function headHTML(e) {
    return `<header class="page-head cd-head"><div>
        <div class="cd-proj">${App.ui.projChip(e.projectId, { link: true })}</div>
        <h1>${esc(e.title)}</h1>
        <div class="meta cd-meta">${e.period && e.period.start ? `<span>${App.icon('calendar', 15)}${esc(App.ui.projectPeriod({ period: e.period, status: 'ongoing' }))}</span>` : ''}${e.role ? `<span>${esc(e.role)}</span>` : ''}${e.source === 'github' ? `<span>${App.icon('github', 15)}GitHub</span>` : ''}</div>
        ${e.keywords.length ? `<div class="cd-kws">${e.keywords.map((k) => App.ui.keywordChip(k)).join('')}</div>` : ''}</div>
      <div class="page-head-actions"><button type="button" class="btn btn-primary cd-fix" ${chatAttrs(e)}>${App.icon('chat', 16)}AI 채팅으로 고치기</button>
        <div class="menu"><button type="button" class="icon-btn" aria-haspopup="menu" aria-expanded="false" aria-label="경험 카드 메뉴">${App.icon('more')}</button>
          <div class="menu-list"><button type="button" class="is-danger" data-act="remove">${App.icon('trash', 16)}휴지통으로 옮기기</button></div></div></div>
    </header>`;
  }

  function lineHTML(e) {
    return `<section class="panel cd-line">
      <div class="cd-line-top"><label for="cd-line">이력서 한 줄</label><span class="subtle" data-saved="line" role="status"></span><span class="subtle cd-count"><span data-count>${one(e.resumeLine).length}</span>자</span></div>
      <textarea class="textarea" id="cd-line" rows="1" maxlength="200" aria-describedby="cd-line-h" placeholder="이 경험을 이력서에 적을 한 문장">${esc(e.resumeLine || '')}</textarea>
      <div class="cd-line-foot"><p class="subtle" id="cd-line-h">마스터 이력서에 이 문장이 그대로 들어가요.</p><button type="button" class="btn btn-ghost btn-sm" data-act="reset" ${e.resumeLineEdited ? '' : 'hidden'}>${App.icon('restore', 15)}AI 문장으로 되돌리기</button></div>
    </section>`;
  }

  function starHTML(e) {
    return `<section class="section" aria-label="STAR"><dl class="cd-star">${STAR.map(([key, label]) => {
      const text = (e.star || {})[key];
      return `<div><dt>${label}</dt><dd>${text ? esc(text) : `<span class="subtle">아직 비어 있어요.</span> <button type="button" class="link" ${chatAttrs(e)}>AI 채팅으로 채우기</button>`}</dd></div>`;
    }).join('')}</dl></section>`;
  }

  function retroHTML(e) {
    return `<section class="section"><div class="section-title cd-sec"><label for="cd-retro">회고</label><span class="subtle">직접 쓰는 칸</span><span class="subtle cd-saved" data-saved="retro" role="status"></span></div>
      <textarea class="textarea" id="cd-retro" rows="4" placeholder="다시 한다면 무엇을 다르게 할지, 무엇을 배웠는지 적어 보세요.">${esc(e.retrospect || '')}</textarea></section>`;
  }

  /* ---------- 쓰인 곳 ---------- */
  function usedHTML(e) {
    const rows = []; const add = (icon, href, title, sub) => rows.push(`<a class="list-row" href="${href}">${App.icon(icon)}<span class="list-row-main"><span class="list-row-title">${esc(title)}</span>${sub ? `<span class="list-row-sub">${esc(sub)}</span>` : ''}</span></a>`);
    if (S.resumeBullets().some((b) => b.source && b.source.expId === e.id)) add('resume', '#/resume', '마스터 이력서');
    S.apps().forEach((a) => {
      (a.essays || []).filter((q) => (q.expIds || []).includes(e.id)).forEach((q) => add('building', `#/apply/${encodeURIComponent(a.id)}/essay`, `${a.company} 자소서`, q.text));
      (a.interview || []).filter((q) => q.expId === e.id).forEach((q) => add('building', `#/apply/${encodeURIComponent(a.id)}/interview`, `${a.company} 면접`, q.text));
    });
    return rows.length ? `<section class="section"><h2 class="section-title">쓰인 곳</h2><div class="list cd-used">${rows.join('')}</div></section>` : '';
  }

  /* ---------- 근거 ---------- */
  function codeHTML(f, link) {
    const hl = new Set(f.hl || []); const start = f.start || 1;
    const lines = String(f.code || '').split('\n').map((t, i) => `<span class="cd-code-line${hl.has(start + i) ? ' is-hl' : ''}"><i>${start + i}</i>${esc(t) || ' '}</span>`).join('');
    const range = f.end && f.end !== start ? `${start}-${f.end}` : start;
    return `<div class="cd-code">${link(f.url, `${esc(f.path)}:${range}`, 'cd-code-path')}<pre tabindex="0" aria-label="${esc(f.path)}">${lines}</pre></div>`;
  }
  function evidenceHTML(e) {
    const ev = e.evidence || {}; const sample = !!(window.SEED.repoSamples || {})[String(ev.repo || '').toLowerCase()];
    // 예시 레포는 실제로 없는 주소라서 링크를 걸지 않는다
    const link = (url, html, cls) => (!sample && /^https:\/\//.test(url || '') ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${html}</a>` : `<span class="${cls}">${html}</span>`);
    const row = (url, tag, text, date) => link(url, `<b>${esc(tag)}</b><span>${esc(text)}</span><time>${esc(App.ui.date(date))}</time>`, 'cd-ev-row');
    const chats = (e.chatIds || []).map((id) => S.getChat(id)).filter(Boolean);
    const groups = [
      ['커밋', '개', (ev.commits || []).map((c) => row(c.url, String(c.sha || '').slice(0, 7), c.message, c.date))],
      ['PR', '개', (ev.prs || []).map((p) => row(p.url, '#' + p.number, p.title, p.date))],
      ['코드', '곳', (ev.files || []).map((f) => codeHTML(f, link))],
      ['채팅', '개', chats.map((c) => `<a class="cd-ev-row" href="#/chat/${encodeURIComponent(c.id)}">${App.icon('chat', 16)}<span>${esc(c.title)}</span><time>${App.ui.date(c.updatedAt)}</time></a>`)],
    ].filter(([, , items]) => items.length);
    if (!groups.length) return '';
    return `<section class="section"><details class="cd-ev"><summary>${App.icon('chevron-right', 18)}<h2>근거</h2><span class="meta">${groups.map(([l, u, i]) => `<span>${l} ${i.length}${u}</span>`).join('')}</span></summary>
      <div class="cd-ev-body">${ev.repo ? `<p class="meta"><span>${App.icon('github', 15)}${esc(ev.repo)}</span>${sample ? '<span class="tag">예시</span>' : ''}</p>` : ''}
        ${groups.map(([label, , items]) => `<div><h3 class="label">${label}</h3>${items.join('')}</div>`).join('')}</div></details></section>`;
  }

  function missingHTML(id) {
    const t = S.trash().find((x) => (x.data.experiences || []).some((e) => e.id === id));
    return `<div class="page"><div class="empty"><div class="empty-title">${t ? '휴지통에 있는 카드예요' : '지워진 카드예요'}</div>${t ? `<p>${t.type === 'project' ? `「${esc(t.title)}」 프로젝트와 함께 들어 있어요.` : `「${esc(t.title)}」`}</p><button type="button" class="btn btn-primary" data-restore="${esc(t.id)}">복원하기</button>` : '<a class="btn" href="#/vault?view=cards">전체 카드 보기</a>'}</div></div>`;
  }

  // 자동 저장: 다시 그리지 않으므로 포커스가 유지된다. 바뀐 게 없으면 저장하지 않는다
  function autosave(ta, label, read, write) {
    let timer = null; let last = read(ta.value);
    const flush = () => { if (!timer) return; clearTimeout(timer); timer = null; const v = read(ta.value); if (v === last) return; if (write(v)) { last = v; label.textContent = '저장했어요'; } };
    ta.addEventListener('input', () => { clearTimeout(timer); label.textContent = ''; timer = setTimeout(flush, 600); });
    ta.addEventListener('blur', flush);
    return { flush, set(v) { clearTimeout(timer); timer = null; ta.value = v; last = read(v); label.textContent = ''; } };
  }

  App.screens.card = {
    title: (params) => { const e = S.get(params.id); return e ? e.title : '경험 카드'; },
    crumb(params) {
      const e = S.get(params.id); const p = e && S.getProject(e.projectId);
      return [{ label: '경험 위키', href: '#/vault' }].concat(p ? [{ label: p.title, href: '#/vault/p/' + encodeURIComponent(p.id) }] : []);
    },
    render(params) {
      const e = S.get(params.id); if (!e) return missingHTML(params.id);
      return `<div class="page page-narrow">${headHTML(e)}${lineHTML(e)}${starHTML(e)}${retroHTML(e)}${usedHTML(e)}${evidenceHTML(e)}</div>`;
    },
    mount(root, params) {
      const e = S.get(params.id); const q = (s) => root.querySelector(s);
      root.onclick = (ev) => { const r = ev.target.closest('[data-restore]'); if (!r) return; const x = S.restore(r.dataset.restore); if (x) { App.rerender(); App.ui.toast(x.withProject ? `「${x.withProject}」 프로젝트도 함께 복원했어요` : '복원했어요'); } };
      if (!e) return () => { root.onclick = null; };
      const line = q('#cd-line'), reset = q('[data-act=reset]'), count = q('[data-count]');
      const fit = () => { line.style.height = 'auto'; line.style.height = line.scrollHeight + 2 + 'px'; count.textContent = one(line.value).length; };
      const sv = {
        line: autosave(line, q('[data-saved=line]'), one, (v) => { const x = S.setResumeLine(e.id, v); if (x) reset.hidden = false; return x; }),
        retro: autosave(q('#cd-retro'), q('[data-saved=retro]'), (v) => v.trim(), (v) => S.setRetrospect(e.id, v)),
      };
      const flush = () => { sv.line.flush(); sv.retro.flush(); };
      line.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); sv.line.flush(); } });
      line.addEventListener('input', () => { if (/\n/.test(line.value)) line.value = line.value.replace(/\s*\n\s*/g, ' '); fit(); });
      reset.onclick = () => {
        const cur = S.get(e.id); if (!cur) return; const before = cur.resumeLine;
        S.setResumeLine(cur.id, cur.aiLine || App.ai.resumeLine(cur)); cur.resumeLineEdited = false; S.touch();
        sv.line.set(cur.resumeLine); fit(); reset.hidden = true; line.focus();
        App.ui.toast('AI 문장으로 되돌렸어요', { action: '취소', onAction: () => { if (S.get(cur.id) !== cur) return; S.setResumeLine(cur.id, before); if (line.isConnected) { sv.line.set(before); fit(); reset.hidden = false; } } });
      };
      q('[data-act=remove]').onclick = () => { flush(); const to = '#/vault/p/' + encodeURIComponent(e.projectId); const t = S.remove(e.id); App.navigate(to); App.ui.trashed(t); };
      fit(); window.addEventListener('resize', fit); window.addEventListener('beforeunload', flush);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (line.isConnected) fit(); });
      return () => { flush(); root.onclick = null; window.removeEventListener('resize', fit); window.removeEventListener('beforeunload', flush); };
    },
  };
})(window.App);
