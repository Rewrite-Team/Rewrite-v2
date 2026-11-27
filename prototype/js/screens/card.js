/* 경험 카드 — #/card/:id
   머리 → 이력서 한 줄 → STAR → 회고 → 쓰인 곳 · 근거. 제목·역량·STAR·이력서 한 줄·회고 모두 여기서 직접 고칠 수 있고, AI 채팅에서 말로 채울 수도 있다 (이 카드를 펼쳐 둔 새 채팅) */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store;
  const STAR = [['situation', '상황'], ['task', '과제'], ['action', '행동'], ['result', '결과']];
  const chatAttrs = (e) => `data-chat data-chat-card="${esc(e.id)}"`;
  const one = (t) => String(t || '').trim().replace(/\s+/g, ' ');

  function headHTML(e) {
    return `<header class="page-head cd-head"><div>
        <div class="cd-proj">${App.ui.projChip(e.projectId, { link: true })}</div>
        <h1>${esc(e.title)}</h1>
        <div class="meta cd-meta">${e.period && e.period.start ? `<span>${App.icon('calendar', 15)}${esc(App.ui.projectPeriod({ period: e.period, status: 'ongoing' }))}</span>` : ''}${e.role ? `<span>${esc(e.role)}</span>` : ''}${e.source === 'github' ? `<span>${App.icon('github', 15)}GitHub</span>` : ''}${e.source === 'manual' ? `<span>${App.icon('edit', 15)}직접 만든 카드</span>` : ''}</div>
        <div class="cd-kws">${e.keywords.map((k) => App.ui.keywordChip(k)).join('')}<button type="button" class="link cd-kw-edit" data-act="keywords">${e.keywords.length ? '역량 바꾸기' : '역량 고르기'}</button></div></div>
      <div class="page-head-actions"><button type="button" class="btn btn-primary cd-fix" ${chatAttrs(e)}>${App.icon('chat', 16)}AI 채팅으로 채우기</button>
        <div class="menu"><button type="button" class="icon-btn" aria-haspopup="menu" aria-expanded="false" aria-label="경험 카드 메뉴">${App.icon('more')}</button>
          <div class="menu-list"><button type="button" data-act="title">${App.icon('edit', 16)}제목 바꾸기</button><hr><button type="button" class="is-danger" data-act="remove">${App.icon('trash', 16)}휴지통으로 옮기기</button></div></div></div>
    </header>`;
  }

  function lineHTML(e) {
    return `<section class="panel cd-line" data-wr>
      <div class="cd-line-top"><label for="cd-line">이력서 한 줄</label><span class="subtle cd-count"><span data-count>${one(e.resumeLine).length}</span>자</span></div>
      <textarea class="textarea" id="cd-line" data-one rows="1" maxlength="200" aria-describedby="cd-line-h" placeholder="이 경험을 이력서에 적을 한 문장">${esc(e.resumeLine || '')}</textarea>
      ${App.ui.wrFoot(`<p class="subtle" id="cd-line-h">마스터 이력서에 이 문장이 그대로 들어가요.</p><button type="button" class="btn btn-ghost btn-sm" data-act="reset" ${e.resumeLineEdited && e.source !== 'manual' ? '' : 'hidden'}>${App.icon('restore', 15)}AI 문장으로 되돌리기</button>`)}
    </section>`;
  }

  // STAR 칸마다 직접 쓰는 칸. 비어 있으면 AI 채팅에서 채우는 길도 함께
  const STAR_PH = { situation: '언제, 어디서, 누구와 있었던 일인가요?', task: '맡은 역할이나 풀어야 했던 문제는 무엇이었나요?', action: '구체적으로 무엇을 했나요?', result: '무엇이 달라졌나요? 숫자가 있으면 좋아요.' };
  function starHTML(e) {
    return `<section class="section" aria-label="STAR"><dl class="cd-star">${STAR.map(([key, label]) => {
      const text = (e.star || {})[key] || '';
      return `<div data-wr><dt><label for="cd-${key}">${label}</label></dt><dd><textarea class="textarea cd-star-in" id="cd-${key}" data-star="${key}" rows="1" placeholder="${STAR_PH[key]}">${esc(text)}</textarea>
        ${App.ui.wrFoot(text ? '' : `<button type="button" class="link cd-star-chat" ${chatAttrs(e)}>AI 채팅에서 채우기</button>`)}</dd></div>`;
    }).join('')}</dl></section>`;
  }
  /* ---------- 제목 · 역량 ---------- */
  function titleModal(e) {
    App.ui.modal({
      title: '제목 바꾸기', confirmText: '저장',
      body: `<div class="field"><label class="label" for="cd-title">경험 카드 제목</label><input class="input" id="cd-title" maxlength="60" value="${esc(e.title)}" /><p class="field-error" id="cd-title-e" role="alert" hidden></p></div>`,
      onOpen(r) { r.querySelector('#cd-title').select(); },
      onConfirm(r) {
        const i = r.querySelector('#cd-title'); const v = i.value.trim();
        if (!v) { const x = r.querySelector('#cd-title-e'); x.innerHTML = App.icon('warning', 15) + '<span>제목을 적어 주세요.</span>'; x.hidden = false; i.setAttribute('aria-invalid', 'true'); i.focus(); return false; }
        if (S.get(e.id)) { S.edit(e.id, { title: v }); App.rerender(); App.ui.toast('제목을 바꿨어요'); } return true;
      },
    });
  }
  function keywordModal(e) {
    const on = new Set(e.keywords);
    App.ui.modal({
      title: '역량 고르기', confirmText: '저장',
      body: `<p class="muted cd-kw-help">이 경험에서 드러난 역량을 골라 주세요. 자소서와 면접 준비에서 이 역량으로 카드를 찾아요.</p>
        <div class="cd-kw-pick">${window.SEED.keywords.map((k) => `<button type="button" class="kw" data-kw-pick="${esc(k.name)}" aria-pressed="${on.has(k.name)}" title="${esc(k.desc)}">${esc(k.name)}</button>`).join('')}</div>`,
      onOpen(r) { r.querySelector('.cd-kw-pick').onclick = (ev) => { const b = ev.target.closest('[data-kw-pick]'); if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); }; },
      onConfirm(r) {
        const list = [...r.querySelectorAll('[data-kw-pick][aria-pressed="true"]')].map((b) => b.dataset.kwPick);
        if (S.get(e.id)) { S.edit(e.id, { keywords: list }); App.rerender(); App.ui.toast('역량을 저장했어요'); } return true;
      },
    });
  }

  function retroHTML(e) {
    return `<section class="section" data-wr><div class="section-title cd-sec"><label for="cd-retro">회고</label><span class="subtle">직접 쓰는 칸</span></div>
      <textarea class="textarea" id="cd-retro" rows="4" placeholder="다시 한다면 무엇을 다르게 할지, 무엇을 배웠는지 적어 보세요.">${esc(e.retrospect || '')}</textarea>${App.ui.wrFoot()}</section>`;
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
  function evidenceHTML(e) {
    const ev = App.ui.evidence(e.evidence); if (!ev) return '';
    return `<section class="section"><details class="cd-ev"><summary>${App.icon('chevron-right', 18)}<h2>근거</h2><span class="meta">${ev.counts}</span></summary><div class="cd-ev-body">${ev.body}</div></details></section>`;
  }

  function missingHTML(id) {
    const t = S.trash().find((x) => (x.data.experiences || []).some((e) => e.id === id));
    return `<div class="page"><div class="empty"><div class="empty-title">${t ? '휴지통에 있는 카드예요' : '지워진 카드예요'}</div>${t ? `<p>${t.type === 'project' ? `「${esc(t.title)}」 프로젝트와 함께 들어 있어요.` : `「${esc(t.title)}」`}</p><button type="button" class="btn btn-primary" data-restore="${esc(t.id)}">복원하기</button>` : '<a class="btn" href="#/vault?view=cards">전체 카드 보기</a>'}</div></div>`;
  }

  App.screens.card = {
    title: (params) => { const e = S.get(params.id); return e ? e.title : '경험 카드'; },
    crumb: () => [{ label: '경험 위키', href: '#/vault' }], // 프로젝트는 제목 위 이름이 링크다
    render(params) {
      const e = S.get(params.id); if (!e) return missingHTML(params.id);
      return `<div class="page page-narrow">${headHTML(e)}${lineHTML(e)}${starHTML(e)}${retroHTML(e)}${usedHTML(e)}${evidenceHTML(e)}</div>`;
    },
    mount(root, params) {
      const e = S.get(params.id); const q = (s) => root.querySelector(s);
      root.onclick = (ev) => { const r = ev.target.closest('[data-restore]'); if (!r) return; const x = S.restore(r.dataset.restore); if (x) { App.rerender(); App.ui.toast(x.withProject ? `「${x.withProject}」 프로젝트도 함께 복원했어요` : '복원했어요'); } };
      if (!e) return () => { root.onclick = null; };
      const line = q('#cd-line'), retro = q('#cd-retro'), reset = q('[data-act=reset]'), count = q('[data-count]'); const stars = [...root.querySelectorAll('[data-star]')];
      const grow = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; };
      const fit = () => { grow(line); stars.forEach(grow); count.textContent = one(line.value).length; };
      const setLine = (v) => { line.value = line.defaultValue = v; App.ui.wrSync(line); fit(); };
      const save = (t) => {
        if (t.value === t.defaultValue || !S.get(e.id)) return;
        if (t === line) { line.value = one(line.value); if (line.value !== line.defaultValue) { S.setResumeLine(e.id, line.value); reset.hidden = false; } fit(); }
        else if (t.dataset.star) { t.value = t.value.trim(); S.edit(e.id, { star: { [t.dataset.star]: t.value } }); grow(t); const c = t.closest('[data-wr]').querySelector('.cd-star-chat'); if (c) c.hidden = !!t.value; }
        else S.setRetrospect(e.id, t.value);
        App.ui.wrSaved(t);
      };
      const flush = () => { save(line); save(retro); stars.forEach(save); }; // 저장하지 않고 떠나도 쓴 글은 남긴다
      root.addEventListener('wr-save', (ev) => save(ev.target));
      stars.forEach((t) => t.addEventListener('input', () => grow(t)));
      line.addEventListener('input', () => { if (/\n/.test(line.value)) line.value = line.value.replace(/\s*\n\s*/g, ' '); fit(); });
      reset.onclick = () => {
        const cur = S.get(e.id); if (!cur) return; const before = cur.resumeLine;
        S.setResumeLine(cur.id, cur.aiLine || App.ai.resumeLine(cur)); cur.resumeLineEdited = false; S.touch();
        setLine(cur.resumeLine); reset.hidden = true; line.focus();
        App.ui.toast('AI 문장으로 되돌렸어요', { action: '취소', onAction: () => { if (S.get(cur.id) !== cur) return; S.setResumeLine(cur.id, before); if (line.isConnected) { setLine(before); reset.hidden = false; } } });
      };
      q('[data-act=title]').onclick = () => { flush(); titleModal(S.get(e.id)); };
      q('[data-act=keywords]').onclick = () => { flush(); keywordModal(S.get(e.id)); };
      q('[data-act=remove]').onclick = () => { flush(); const to = '#/vault/p/' + encodeURIComponent(e.projectId); const t = S.remove(e.id); App.navigate(to); App.ui.trashed(t); };
      fit(); window.addEventListener('resize', fit); window.addEventListener('beforeunload', flush);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (line.isConnected) fit(); });
      return () => { flush(); root.onclick = null; window.removeEventListener('resize', fit); window.removeEventListener('beforeunload', flush); };
    },
  };
})(window.App);
