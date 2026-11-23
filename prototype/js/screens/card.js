/* 경험 카드 상세·편집 — #/card/:id (id = 'new' 이면 새 경험 카드, ?edit=1 이면 편집 모드로 시작)
   경험 카드 = 경험(끝낸 대화) 여러 개를 모아 면접·이력서·자소서에 쓰기 좋게 만든 것.
   담긴 경험(대화 원문) + 코드 근거 + 변경 기록(어떤 기록이 무엇을 바꿨는지)을 함께 보여 준다 */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  const STAR = [
    { key: 'situation', letter: 'S', label: '상황', hint: '언제, 어디서, 누구와 어떤 상황이었나요?' },
    { key: 'task', letter: 'T', label: '과제', hint: '내가 맡은 역할이나 해결해야 했던 목표는요?' },
    { key: 'action', letter: 'A', label: '행동', hint: '내가 직접 한 행동과 그렇게 판단한 이유는요?' },
    { key: 'result', letter: 'R', label: '결과', hint: '무엇이 달라졌나요? 숫자로 말할 수 있으면 더 좋아요.' },
  ];
  const LOG_TYPES = {
    decision: ['의사결정', '◆'], issue: ['이슈', '!'], collab: ['협업', '◎'], milestone: ['마일스톤', '★'], learning: ['배움', '✎'],
  };

  // 키워드별 자소서·면접 예시 질문
  const KW_QUESTIONS = {
    '협업': ['팀원과 함께 목표를 달성했던 경험을 말씀해 주세요.', '협업 과정에서 본인이 맡은 역할과 기여는 무엇이었나요?'],
    '문제해결': ['예상치 못한 문제를 해결한 경험을 구체적으로 서술해 주세요.', '문제의 원인을 어떻게 찾아냈는지 설명해 주세요.'],
    '커뮤니케이션': ['의견이 다른 사람을 설득해 본 경험이 있나요?', '복잡한 내용을 쉽게 설명해야 했던 순간을 말씀해 주세요.'],
    '리더십': ['팀을 이끌며 어려움을 극복한 경험을 말씀해 주세요.', '리더로서 내린 가장 어려운 결정은 무엇이었나요?'],
    '주도성': ['누가 시키지 않았지만 먼저 나서서 개선한 경험이 있나요?', '스스로 문제를 발견하고 해결을 주도한 경험을 서술해 주세요.'],
    '책임감': ['맡은 일을 끝까지 책임지고 완수한 경험을 말씀해 주세요.', '일정이 촉박한 상황에서 어떻게 마감을 지켰나요?'],
    '분석력': ['데이터를 근거로 판단을 내린 경험을 말씀해 주세요.', '상황을 분석해 우선순위를 정했던 경험이 있나요?'],
    '학습능력': ['새로운 기술을 빠르게 익혀 성과를 낸 경험이 있나요?', '낯선 분야를 공부할 때 본인만의 방법은 무엇인가요?'],
    '고객지향': ['고객(사용자) 관점에서 서비스를 개선한 경험을 작성해 주세요.', '고객의 불편을 발견하고 해결한 경험을 말씀해 주세요.'],
    '꼼꼼함': ['작은 실수를 미리 발견해 큰 문제를 막은 경험이 있나요?', '품질을 높이기 위해 본인이 챙긴 디테일은 무엇이었나요?'],
    '갈등조정': ['팀 내 갈등을 조율해 해결한 경험을 구체적으로 서술해 주세요.', '의견 충돌이 있을 때 어떻게 합의점을 찾았나요?'],
    '의사결정': ['여러 선택지 중 하나를 결정해야 했던 경험을 말씀해 주세요.', '그 결정을 내린 기준과 결과는 어땠나요?'],
    '끈기': ['포기하고 싶었지만 끝까지 해낸 경험이 있나요?', '실패했던 경험과 그로부터 배운 점을 말씀해 주세요.'],
    '창의성': ['기존과 다른 방식으로 문제를 해결한 경험을 말씀해 주세요.', '새로운 아이디어를 실제로 실행해 본 경험이 있나요?'],
  };

  function blankExp(params) {
    const kw = params.kw ? [params.kw] : [];
    return {
      id: null, title: '', category: (params.category && window.SEED.categories.includes(params.category)) ? params.category : '프로젝트',
      period: { start: '', end: '' }, projectId: params.project || null, sourceLogIds: [], role: '', summary: '',
      star: { situation: '', task: '', action: '', result: '' }, insights: '', keywords: kw, jobs: [], links: [], qa: [],
    };
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));
  // 이 경험이 속한 프로젝트와, 근거로 연결된 프로젝트 기록(로그)
  function projectOf(e) { return e.projectId ? App.store.getProject(e.projectId) : null; }
  function sourceLogs(e) {
    const p = projectOf(e); if (!p) return [];
    const ids = e.sourceLogIds || [];
    return p.logs.filter((l) => ids.includes(l.id)).sort((a, b) => a.date.localeCompare(b.date));
  }
  const endPunct = (s) => { s = (s || '').trim(); if (!s) return ''; return /[.!?。…)]$/.test(s) ? s : s + '.'; };

  function pitch(e) {
    const s = e.star || {};
    const parts = [];
    if (s.situation) parts.push(endPunct(s.situation));
    if (s.task) parts.push('그 안에서 저는 ' + endPunct(s.task));
    if (s.action) parts.push('이를 위해 ' + endPunct(s.action));
    if (s.result) parts.push('그 결과 ' + endPunct(s.result));
    if (e.insights) parts.push('이 경험으로 ' + endPunct(e.insights));
    return parts.join(' ');
  }

  /* ---------------- View ---------------- */
  const projShort = (p) => (p.title.match(/「[^」]+」/) || [p.title.split(' — ')[0]])[0];
  const fmtDate = (d) => String(d || '').replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, '$1.$2.$3');

  // 이 경험의 빈 곳 질문이 이미 오늘의 질문함에 있는지
  function gapQueued(e, gap) {
    return !!gap && App.store.state.inbox.some((q) => q.targetExpId === e.id && q.type === 'deepen' && q.status === 'pending' && (!q.stage || q.stage === gap.stage));
  }

  // 담긴 경험 → 그 원문이 나온 대화 (qa 의 threadId, 프로젝트 로그의 threadId, 아니면 이 카드로 정리된 대화 중 같은 말을 한 것)
  function threadOfSource(e, s, mine) {
    const W = App.wiki; if (!W.getThread) return null;
    const ok = (id) => (id && W.getThread(id) ? id : null);
    if (s.type !== 'code') {
      const qa = (e.qa || []).find((x) => x.threadId && x.a === s.text && (!s.q || x.q === s.q));
      if (qa && ok(qa.threadId)) return qa.threadId;
      if (s.type === 'checkin') { const p = projectOf(e); const l = p && (p.logs || []).find((x) => x.threadId && x.text === s.text); if (l && ok(l.threadId)) return l.threadId; }
      const txt = String(s.text || '').trim();
      const t = txt && mine.find((x) => (x.msgs || []).some((m) => m.who === 'me' && m.text.trim() === txt) || W.threadText(x).includes(txt));
      if (t) return t.id;
    }
    return null;
  }
  const chatHref = (id) => '#/ask/' + encodeURIComponent(id);

  // 담긴 경험: 이 카드에 모은 경험(대화) — 같은 대화에서 나온 답은 한 경험으로 묶는다. 코드 분석은 따로 근거로
  function expGroups(e) {
    const W = App.wiki;
    const mine = W.threadsFor ? W.threadsFor({ expId: e.id }) : [];
    const groups = []; const byKey = {};
    W.sourcesOf(e).filter((s) => s.type !== 'code').forEach((s, i) => {
      const tid = s.threadId && W.getThread && W.getThread(s.threadId) ? s.threadId : threadOfSource(e, s, mine);
      const key = tid || 'x' + i;
      if (!byKey[key]) { byKey[key] = { tid, type: s.type, date: s.date, logType: s.logType, href: s.href, pairs: [] }; groups.push(byKey[key]); }
      byKey[key].pairs.push({ q: s.q && s.q !== '(직접 기록)' ? s.q : '', text: s.text });
    });
    return groups;
  }
  function expsHTML(e) {
    const W = App.wiki;
    const groups = expGroups(e);
    if (!groups.length) return '<div class="cd-soft-empty">아직 담긴 경험이 없어요. [＋ 경험 더 담기]로 AI와 나눈 대화를 이 카드에 모아 보세요.</div>';
    return `<ol class="cd-srcs">${groups.map((g) => {
      const t = g.tid && W.getThread(g.tid);
      const top = `<div class="cd-src-top"><span class="cd-src-type">${esc((t && t.label) || W.SOURCE_LABEL[g.type] || '경험')}</span>
        ${g.type === 'checkin' && LOG_TYPES[g.logType] ? `<span class="wk-srcchip">${LOG_TYPES[g.logType][1]} ${LOG_TYPES[g.logType][0]}</span>` : ''}
        <span class="subtle">${esc(fmtDate(g.date))}</span>
        ${g.tid ? `<a class="cd-src-link" href="${esc(chatHref(g.tid))}">대화 보기 →</a>` : ''}
        ${g.href ? `<a class="cd-src-link" href="${esc(g.href)}">프로젝트에서 보기 →</a>` : ''}</div>`;
      const body = g.pairs.map((x) => `${x.q ? `<div class="cd-src-q"><span class="ai-dot">R</span><div>${esc(x.q)}</div></div>` : ''}<div class="cd-src-text">${esc(x.text)}</div>`).join('');
      return `<li class="cd-src" data-type="${esc(g.type === 'checkin' ? 'checkin' : 'answer')}"><span class="wk-src">${W.SOURCE_ICO[g.type] || '•'}</span><div class="cd-src-body">${top}${body}</div></li>`;
    }).join('')}</ol>`;
  }
  // 근거: 코드 분석에서 찾은 것
  function codeHTML(e) {
    const W = App.wiki;
    const list = W.sourcesOf(e).filter((s) => s.type === 'code' && s.finding);
    if (!list.length) return '';
    return `<div class="cd-evi-cap">근거 · 코드 분석</div><ol class="cd-srcs">${list.map((s) => {
      const f = s.finding; const ev = (f.evidence || [])[0];
      return `<li class="cd-src" data-type="code"><span class="wk-src">${W.SOURCE_ICO.code}</span><div class="cd-src-body">
        <div class="cd-src-top"><span class="cd-src-type">${esc(W.SOURCE_LABEL.code)}</span><span class="subtle">${esc(fmtDate(s.date))}</span>${s.href ? `<a class="cd-src-link" href="${esc(s.href)}">코드 분석 보기 →</a>` : ''}</div>
        <div class="cd-src-text"><b>${esc(f.title)}</b></div>
        <div class="cd-src-meta"><span class="wk-srcchip">${esc(f.category || '코드')}</span>
        ${ev ? `<a class="cd-src-path" href="${esc(ev.url || '#')}" target="_blank" rel="noopener"><code>${esc(ev.path)}:${esc(ev.start)}</code></a>` : ''}</div></div></li>`;
    }).join('')}</ol>`;
  }
  // 경험 더 담기: 아직 이 카드에 없는 경험 (같은 프로젝트 먼저, 최근 것부터)
  function pickable(e) {
    const inCard = new Set(expGroups(e).map((g) => g.tid).filter(Boolean));
    return App.wiki.experienceItems().filter((it) => !it.cardIds.includes(e.id) && !inCard.has(it.id))
      .sort((a, b) => ((b.projectId && b.projectId === e.projectId) - (a.projectId && a.projectId === e.projectId)) || String(b.date).localeCompare(String(a.date)));
  }

  // 변경 기록: 어떤 기록이 이 카드의 무엇을 바꿨는지
  function changeText(c) {
    const F = App.wiki.FIELD_LABEL;
    switch (c.kind) {
      case 'create': return '이 경험 카드를 만들었어요';
      case 'fill': return `<b>${esc(F[c.field] || c.field)}</b> 칸을 채웠어요<q>${esc(App.wiki.short(c.after, 70))}</q>`;
      case 'append': return `<b>${esc(F[c.field] || c.field)}</b>에 덧붙였어요<q>${esc(App.wiki.short(c.after, 70))}</q>`;
      case 'keyword': return `역량 ${(c.after || []).map((k) => App.ui.keywordChip(k)).join(' ')} 추가`;
      case 'evidence': return esc(c.text || '근거 연결');
      case 'link': { const p = App.store.getProject(c.projectId); return `${p ? esc(projShort(p)) : ''} 프로젝트에 연결`; }
      default: return '';
    }
  }
  function historyHTML(e) {
    const W = App.wiki;
    const list = W.entries({ expId: e.id });
    if (!list.length) return '<div class="cd-soft-empty">아직 변경 기록이 없어요. 경험이 이 카드에 담기면 무엇이 바뀌었는지 여기에 남아요.</div>';
    return `<ol class="cd-hist">${list.slice(0, 12).map((w, i) => {
      const mine = w.changes.filter((c) => c.expId === e.id).map(changeText).filter(Boolean);
      const src = w.source || {};
      return `<li class="cd-hist-item" data-wk-entry="${esc(w.id)}">
        <span class="wk-src" title="${esc(W.SOURCE_LABEL[src.type] || '')}">${W.SOURCE_ICO[src.type] || '•'}</span>
        <div class="cd-hist-body">
          <div class="cd-src-top"><span class="cd-src-type">${esc(W.SOURCE_LABEL[src.type] || '기록')}</span><span class="subtle">${esc(fmtDate(w.date))}${w.at ? ' ' + esc(w.at) : ''}</span>
            ${i === 0 && mine.length ? '<button type="button" class="btn btn-ghost btn-sm cd-hist-undo" data-wk-undo>되돌리기</button>' : ''}</div>
          ${src.text && src.type !== 'code' ? `<div class="cd-hist-src">“${esc(W.short(src.text, 60))}”</div>` : ''}
          ${mine.length ? `<ul class="wk-changes">${mine.map((t) => `<li class="wk-ch"><span class="wk-ico">✎</span><span>${t}</span></li>`).join('')}</ul>` : ''}
        </div></li>`;
    }).join('')}</ol>`;
  }

  function viewHTML(e) {
    const kwInfo = e.keywords.map((k) => App.keywords.get(k));
    const counts = App.keywords.counts();
    const gap = App.ai.gapQuestion(e);
    const queued = gapQueued(e, gap);
    const sp = pitch(e);
    const secs = Math.max(5, Math.round(sp.length / 7));
    const qs = [];
    e.keywords.forEach((k) => (KW_QUESTIONS[k] || []).forEach((q, i) => qs.push({ k, q, i })));
    qs.sort((a, b) => a.i - b.i);
    const pickQs = qs.slice(0, 3);
    const p = projectOf(e);
    const codeHits = (e.codeRefs || []).map((fid) => App.store.findFinding(fid)).filter(Boolean);
    const codeN = codeHits.length;
    const expN = expGroups(e).length;
    const askBtn = gap ? (queued
      ? '<span class="cd-asked">✓ 오늘의 질문에 있어요</span>'
      : '<button class="btn btn-sm" data-act="ask-gap">✉ 오늘의 질문으로 받기</button>') : '';

    return `
    <div class="cd-head card">
      <div class="cd-head-main">
        <div class="cd-meta"><span class="cd-meta-cat">${esc(e.category)}</span><span class="cd-dot">·</span><span>${App.ui.period(e.period)}</span></div>
        ${p || codeN || expN ? `<div class="cd-origin">
          ${p ? `<a class="cd-proj-badge" href="#/vault/p/${encodeURIComponent(p.id)}">▤ ${esc(projShort(p))} 프로젝트의 경험 카드</a>` : ''}
          ${codeN ? `<a class="wk-srcchip cd-code-chip" href="#/vault/p/${encodeURIComponent(codeHits[0].project.id)}?tab=code">⌥ 코드 근거 ${codeN}</a>` : ''}
          <span class="wk-srcchip">경험 ${expN}</span>
        </div>` : ''}
        <h1 class="cd-title">${esc(e.title || '제목 없는 경험 카드')}</h1>
        ${e.role ? `<div class="cd-role"><span class="cd-role-lb">역할</span>${esc(e.role)}</div>` : ''}
        <p class="cd-summary ${e.summary ? '' : 'is-empty'}">${esc(e.summary || '아직 한 줄 요약이 없어요. 질문에 답하면 AI가 채워요.')}</p>
      </div>
      <div class="cd-head-actions">
        <a class="btn btn-primary btn-sm" href="#/ask/new?mode=deep&exp=${encodeURIComponent(e.id)}">✦ 끝까지 정리하기</a>
        ${askBtn}
        <button class="btn btn-sm" data-act="edit">✎ 직접 수정</button>
        ${App.resumeKit ? (App.resumeKit.isCardIn(e.id)
          ? `<a class="cd-resume-in" href="#/resume" title="마스터 이력서에 이 카드에서 나온 한 줄이 있어요"><span class="cd-resume-check">✓</span>이력서에 담김 · 보기 →</a>`
          : `<button class="btn btn-sm cd-resume-btn" data-act="resume">☰ 이력서에 한 줄로 담기</button>`) : ''}
        <button class="btn btn-sm btn-ghost cd-del" data-act="delete">삭제</button>
      </div>
    </div>

    <div class="cd-layout">
      <div class="cd-main">
        <section class="card card-pad cd-sec">
          <div class="section-title">STAR 정리 <span class="subtle cd-sec-sub">AI 정리본 · 원문은 아래 담긴 경험에 그대로 있어요</span></div>
          <div class="cd-star">
            ${STAR.map((s) => {
              const v = (e.star[s.key] || '').trim();
              return `<div class="cd-star-blk ${v ? '' : 'is-empty'}" data-stage="${s.key}">
                <div class="cd-star-lb"><span class="cd-star-letter">${s.letter}</span>${s.label}</div>
                ${v ? `<div class="cd-star-text">${esc(v)}</div>` : `
                  <div class="cd-star-empty"><div>아직 비어 있어요</div><div class="subtle">${esc(s.hint)}</div></div>`}
              </div>`;
            }).join('')}
          </div>
        </section>

        <section class="card card-pad cd-sec">
          <div class="section-title">배운 점 · 성장</div>
          ${e.insights ? `<p class="cd-insight">${esc(e.insights)}</p>` : '<div class="cd-soft-empty">아직 비어 있어요. 이 경험 이후 달라진 점이 있다면 AI와 이어서 채워 보세요.</div>'}
        </section>

        <section class="card card-pad cd-sec">
          <div class="section-title">담긴 경험 <span class="subtle cd-sec-sub">이 카드에 모은 경험 ${expN}개</span><button type="button" class="btn btn-sm cd-add-exp" data-act="add-exp">＋ 경험 더 담기</button></div>
          ${expsHTML(e)}
          ${codeHTML(e)}
        </section>

        <section class="card card-pad cd-sec" data-cd-hist>
          <div class="section-title">변경 기록 <span class="subtle cd-sec-sub">어떤 기록이 이 카드를 바꿨는지</span></div>
          ${historyHTML(e)}
        </section>

        <section class="card card-pad cd-sec">
          <div class="section-title">역량 키워드 <span class="more" data-act="edit">키워드 편집</span></div>
          ${kwInfo.length ? `<div class="cd-kw-list">${kwInfo.map((k) => `
            <a class="cd-kw-item" href="#/vault?kw=${encodeURIComponent(k.name)}" title="${esc(k.desc)}">
              ${App.ui.keywordChip(k.name, { size: 'lg' })}
              <span class="cd-kw-desc">${esc(k.desc)}</span>
              <span class="cd-kw-count">카드 ${counts[k.name] || 0}개 →</span>
            </a>`).join('')}</div>`
            : `<div class="cd-soft-empty">아직 키워드가 없어요. <b>✎ 직접 수정</b>에서 붙여 보세요.</div>`}
        </section>

        <div class="grid-2 cd-sec">
          <section class="card card-pad">
            <div class="section-title">연관 직무</div>
            ${e.jobs.length ? `<div class="cd-pills">${e.jobs.map((j) => `<span class="cd-pill">💼 ${esc(j)}</span>`).join('')}</div>` : '<div class="subtle">아직 연결된 직무가 없어요.</div>'}
          </section>
          <section class="card card-pad">
            <div class="section-title">링크 · 결과물</div>
            ${e.links.length ? `<div class="cd-links">${e.links.map((l) => {
              const gh = /github\.com/i.test(l);
              const safe = /^https?:\/\//i.test(l) ? l : 'https://' + l;
              return `<a class="cd-link-row" href="${esc(safe)}" target="_blank" rel="noopener"><span class="cd-link-ico">${gh ? 'GH' : '↗'}</span><span class="cd-link-url">${esc(l.replace(/^https?:\/\//, ''))}</span></a>`;
            }).join('')}</div>` : '<div class="subtle">GitHub, 포트폴리오 같은 보조 근거를 연결해 둘 수 있어요.</div>'}
          </section>
        </div>

        ${p ? (() => {
          const siblings = App.store.cardsOf(p.id).filter((x) => x.id !== e.id);
          return siblings.length ? `<section class="card card-pad cd-sec">
            <div class="section-title">${esc(projShort(p))} 프로젝트의 다른 경험 카드</div>
            <div class="cd-siblings">${siblings.map((x) => `<a class="cd-sibling" href="#/card/${encodeURIComponent(x.id)}"><span>${esc(x.title)}</span></a>`).join('')}</div>
          </section>` : '';
        })() : ''}
      </div>

      <aside class="cd-side">
        <div class="card cd-coach">
          <div class="cd-coach-head"><span class="ai-dot">R</span><b>AI 코치</b></div>

          <div class="cd-coach-blk">
            <div class="cd-coach-lb">지금 채우면 좋은 부분</div>
            ${gap ? `<div class="cd-gap" data-cd-gap>
              <div class="cd-gap-pre"><div class="cd-gap-q">“${esc(gap.text)}”</div>
              <div class="cd-gap-acts"><button class="btn btn-sm btn-primary" data-act="talk-gap">바로 답하기</button>${askBtn}</div>
              <div class="subtle cd-gap-help">여기서 답하면 AI가 어느 칸에 어떻게 적을지 먼저 보여 드려요. 나중에 답하려면 오늘의 질문으로 받아 두세요.</div></div>
              <div class="cd-gap-talk" data-cd-gap-talk hidden><div class="cd-gap-talk-head"><span class="cd-coach-lb">AI와 대화하며 기록</span><button type="button" class="btn btn-ghost btn-sm" data-act="close-gap-talk" aria-label="닫기">✕</button></div><div data-cd-gap-slot></div></div></div>`
              : `<div class="cd-gap cd-gap-done">STAR가 모두 채워졌어요! 이제 면접에서 바로 쓸 수 있어요.</div>`}
          </div>

          <div class="cd-coach-blk">
            <div class="cd-coach-lb">이 카드로 답할 수 있는 질문</div>
            ${pickQs.length ? `<ul class="cd-qs">${pickQs.map((x) => `<li><a href="#/match?q=${encodeURIComponent(x.q)}">${esc(x.q)}</a>${App.ui.keywordChip(x.k)}</li>`).join('')}</ul>`
              : '<div class="subtle">키워드를 추가하면 어울리는 질문을 찾아 드려요.</div>'}
          </div>

          ${(() => {
            const fits = App.store.activeApps().map((a) => ({ a, m: (a.competencies || []).filter((c) => e.keywords.includes(c.name)).map((c) => c.name) })).filter((x) => x.m.length);
            return `<div class="cd-coach-blk">
            <div class="cd-coach-lb">이 카드를 쓸 수 있는 지원 기업</div>
            ${fits.length ? `<ul class="cd-fits">${fits.map(({ a, m }) => `<li><a href="#/apply/${encodeURIComponent(a.id)}/competency"><b>${esc(a.company)}</b><span class="subtle"> · ${esc(a.job)}</span></a><div class="cd-fits-kws">${m.map((k) => App.ui.keywordChip(k)).join('')}</div></li>`).join('')}</ul>`
              : '<div class="subtle">이 카드의 역량을 요구하는 지원 기업이 아직 없어요.</div>'}
          </div>`;
          })()}

          <div class="cd-coach-blk">
            <div class="cd-coach-lb">면접용 30초 요약 ${sp ? `<span class="cd-secs">약 ${secs}초</span>` : ''}</div>
            ${sp ? `<p class="cd-pitch">${esc(sp)}</p><button class="btn btn-sm cd-copy" data-act="copy">복사하기</button>`
              : '<div class="subtle">STAR를 채우면 30초 답변이 자동으로 만들어져요.</div>'}
          </div>
        </div>
      </aside>
    </div>`;
  }

  /* ---------------- Edit ---------------- */
  function kwEditorHTML(st) {
    return `
      <div class="cd-kw-current">${st.draft.keywords.length ? st.draft.keywords.map((k) => App.ui.keywordChip(k, { size: 'lg', removable: true })).join('') : '<span class="subtle">아직 키워드가 없어요. 아래에서 검색하거나 새로 입력해 추가해요.</span>'}</div>`;
  }

  function editHTML(st) {
    const d = st.draft;
    const isNew = !d.id;
    const field = (label, inner, extra = '') => `<div class="cd-field ${extra}"><label class="label">${label}</label>${inner}</div>`;
    const targetJob = App.store.state.user.targetJob;
    return `
    <form class="cd-form" autocomplete="off" onsubmit="return false">
      <div class="cd-edit-bar">
        <div><div class="cd-edit-title">${isNew ? '새 경험 카드' : '경험 카드 수정'}</div>
          <div class="subtle">빈칸이 있어도 괜찮아요. 적은 그대로 저장돼요.</div></div>
        <div class="row"><button type="button" class="btn" data-act="cancel">취소</button><button type="button" class="btn btn-primary" data-act="save">저장</button></div>
      </div>

      <section class="card card-pad cd-sec">
        <div class="section-title">기본 정보</div>
        ${field('제목', `<input class="input" name="title" placeholder="예) 카페 아르바이트 — 주문 대기 줄 줄이기" value="${esc(d.title)}">`)}
        <div class="cd-form-grid">
          ${field('유형', `<select class="select" name="category">${window.SEED.categories.map((c) => `<option ${c === d.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`)}
          ${field('시작', `<input class="input" type="month" name="start" value="${esc(d.period.start)}">`)}
          ${field('종료', `<input class="input" type="month" name="end" value="${esc(d.period.end)}"><div class="cd-help">비워 두면 ‘진행중’으로 표시돼요</div>`)}
        </div>
        ${field('프로젝트', `<select class="select" name="projectId"><option value="">없음 (프로젝트 밖 경험)</option>${App.store.projects().map((p) => `<option value="${esc(p.id)}" ${p.id === d.projectId ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select><div class="cd-help">한 프로젝트에 경험 페이지를 여러 개 둘 수 있어요. 진행 중인 일은 경험 위키의 <a class="cd-link" href="#/vault">프로젝트 페이지</a>에서 그 프로젝트 이야기를 모아 볼 수 있어요.</div>`)}
        ${field('역할', `<input class="input" name="role" placeholder="예) 백엔드 담당, 4인 팀" value="${esc(d.role)}">`)}
        ${field('한 줄 요약', `<input class="input" name="summary" placeholder="이 경험을 한 문장으로 소개한다면요?" value="${esc(d.summary)}">`)}
      </section>

      <section class="card card-pad cd-sec">
        <div class="section-title">STAR 정리</div>
        <div class="cd-star cd-star-edit">
          ${STAR.map((s) => `<div class="cd-star-blk">
            <label class="cd-star-lb" for="cd-star-${s.key}"><span class="cd-star-letter">${s.letter}</span>${s.label}</label>
            <textarea class="textarea" id="cd-star-${s.key}" name="star-${s.key}" placeholder="${esc(s.hint)}">${esc(d.star[s.key])}</textarea>
          </div>`).join('')}
        </div>
        ${field('배운 점 · 성장', `<textarea class="textarea" name="insights" placeholder="이 경험 이후 내가 다르게 하게 된 것은요?">${esc(d.insights)}</textarea>`, 'cd-mt')}
      </section>

      <section class="card card-pad cd-sec">
        <div class="section-title">역량 키워드</div>
        <div class="cd-kw-editor" data-kw-editor>${kwEditorHTML(st)}</div>
        <div class="cd-kw-add">
          <input class="input" data-kw-input placeholder="키워드 검색 또는 새로 입력 후 Enter (예: 협업)">
          <div class="cd-kw-dd" data-kw-dd hidden></div>
        </div>
      </section>

      <section class="card card-pad cd-sec">
        <div class="section-title">연관 직무 · 링크</div>
        ${field('연관 직무', `<input class="input" name="jobs" placeholder="쉼표로 구분해요 (예: 백엔드 개발자, 서비스 기획자)" value="${esc(d.jobs.join(', '))}">
          ${targetJob && !d.jobs.includes(targetJob) ? `<button type="button" class="cd-quick" data-add-job="${esc(targetJob)}">＋ 내 목표 직무 「${esc(targetJob)}」 추가</button>` : ''}`)}
        ${field('링크 (GitHub, 포트폴리오 등)', `<textarea class="textarea cd-ta-sm" name="links" placeholder="한 줄에 하나씩 입력해요&#10;https://github.com/...">${esc(d.links.join('\n'))}</textarea>`)}
      </section>

      <div class="cd-edit-foot">
        ${isNew ? '' : '<button type="button" class="btn btn-danger" data-act="delete">이 카드 삭제</button>'}
        <div class="row cd-edit-foot-r"><button type="button" class="btn" data-act="cancel">취소</button><button type="button" class="btn btn-primary btn-lg" data-act="save">저장하기</button></div>
      </div>
    </form>`;
  }

  function notFoundHTML() {
    return `<div class="card cd-notfound"><div class="big">🗂️</div><h2>경험 카드를 찾을 수 없어요</h2>
      <p class="muted">삭제되었거나 주소가 잘못된 것 같아요.</p>
      <div class="row cd-nf-actions"><a class="btn btn-primary" href="#/vault">경험 위키로 가기</a><button type="button" class="btn" data-capture>＋ 기록하기</button></div></div>`;
  }

  function initialState(params) {
    const isNew = params.id === 'new';
    const exp = isNew ? blankExp(params) : App.store.get(params.id);
    if (!exp) return { notFound: true };
    const mode = isNew || params.edit === '1' ? 'edit' : 'view';
    return { id: isNew ? null : exp.id, mode, draft: clone(exp) };
  }

  function bodyHTML(st) {
    if (st.notFound) return notFoundHTML();
    if (st.mode === 'edit') return editHTML(st);
    return viewHTML(App.store.get(st.id));
  }

  App.screens.card = {
    title: (p) => (p && p.id === 'new' ? '새 경험 카드' : '경험 카드'),
    // 경험 위키 › (프로젝트) › 경험 카드 — 프로젝트에 속한 카드면 그 프로젝트를 경로에 넣는다
    crumb(params) {
      const crumbs = [{ label: '경험 위키', href: '#/vault' }];
      const e = params && params.id && params.id !== 'new' ? App.store.get(params.id) : null;
      const pid = (e && e.projectId) || (params && params.id === 'new' && params.projectId);
      const p = pid && App.store.getProject(pid);
      if (p) crumbs.push({ label: projShort(p), href: '#/vault/p/' + encodeURIComponent(p.id) });
      return crumbs;
    },
    render(params) {
      const st = initialState(params);
      return `<div class="page cd-page" data-cd-root>${bodyHTML(st)}</div>`;
    },
    mount(screenEl, params) {
      const root = screenEl.querySelector('[data-cd-root]');
      let st = initialState(params);
      if (st.notFound) return null;
      let ddIndex = 0;
      if (st.mode === 'view') App.wiki.bindReport(root.querySelector('[data-cd-hist]'), () => { if (!App.store.get(st.id)) { App.navigate('#/vault'); return; } draw(true); });

      // AI 코치 "지금 채우면 좋은 부분" → 그 자리에서 기록 대화
      let gapTalk = null;
      function closeGapTalk() { if (gapTalk) gapTalk.destroy(); gapTalk = null; }
      function openGapTalk() {
        const e = App.store.get(st.id); const g = e && App.ai.gapQuestion(e); if (!g) return;
        const box = root.querySelector('[data-cd-gap]'); if (!box) return;
        closeGapTalk();
        box.querySelector('.cd-gap-pre').hidden = true;
        box.querySelector('[data-cd-gap-talk]').hidden = false;
        box.classList.add('is-talking');
        gapTalk = App.talk.mount(box.querySelector('[data-cd-gap-slot]'), {
          ask: { text: g.text, label: '지금 채우면 좋은 부분' },
          src: { type: 'answer', expId: e.id, stage: g.stage, question: g.text },
          thread: { source: 'coach' },
          onDone: (entry) => { setTimeout(() => { if (!gapTalk) return; closeGapTalk(); if (entry) App.ui.toast('이 카드에 반영했어요'); if (App.store.get(st.id)) draw(true); }, 1400); },
        });
      }

      function draw(keepScroll) {
        closeGapTalk();
        root.innerHTML = bodyHTML(st); if (!keepScroll) window.scrollTo(0, 0);
        if (st.mode === 'view') App.wiki.bindReport(root.querySelector('[data-cd-hist]'), () => { if (!App.store.get(st.id)) { App.navigate('#/vault'); return; } draw(true); });
      }
      function drawKw() { const el = root.querySelector('[data-kw-editor]'); if (el) el.innerHTML = kwEditorHTML(st); }

      function readForm() {
        const f = root.querySelector('.cd-form'); if (!f) return;
        const v = (n) => (f.elements[n] ? f.elements[n].value : '');
        const d = st.draft;
        d.title = v('title').trim(); d.category = v('category');
        d.period = { start: v('start'), end: v('end') };
        if (f.elements.projectId) { const pid = v('projectId') || null; if (pid !== d.projectId) d.sourceLogIds = []; d.projectId = pid; }
        d.role = v('role').trim(); d.summary = v('summary').trim(); d.insights = v('insights').trim();
        STAR.forEach((s) => { d.star[s.key] = v('star-' + s.key).trim(); });
        d.jobs = v('jobs').split(',').map((x) => x.trim()).filter(Boolean);
        d.links = v('links').split('\n').map((x) => x.trim()).filter(Boolean);
      }

      function addKw(name) {
        name = (name || '').replace(/^#/, '').trim();
        if (!name) return;
        if (st.draft.keywords.includes(name)) { App.ui.toast(`#${name}은(는) 이미 있어요`); return; }
        st.draft.keywords.push(name);
        drawKw();
      }

      function ddMatches(q) {
        q = q.replace(/^#/, '').trim();
        const all = App.keywords.all().filter((k) => !st.draft.keywords.includes(k.name));
        const list = q ? all.filter((k) => k.name.includes(q) || k.desc.includes(q)) : all;
        const exact = App.keywords.all().some((k) => k.name === q) || st.draft.keywords.includes(q);
        return { q, list, custom: q && !exact };
      }
      function drawDD() {
        const inp = root.querySelector('[data-kw-input]'), dd = root.querySelector('[data-kw-dd]');
        if (!inp || !dd) return;
        const { q, list, custom } = ddMatches(inp.value);
        const items = list.map((k) => ({ name: k.name, html: `${App.ui.keywordChip(k.name)}<span class="cd-dd-desc">${esc(k.desc)}</span>` }));
        if (custom) items.push({ name: q, html: `<span class="cd-dd-new">＋ 「${esc(q)}」 새 키워드로 추가</span>` });
        if (!items.length) { dd.innerHTML = '<div class="cd-dd-empty">추가할 키워드가 없어요</div>'; dd.hidden = false; return; }
        ddIndex = Math.min(ddIndex, items.length - 1);
        dd.innerHTML = items.map((it, i) => `<div class="cd-dd-item ${i === ddIndex ? 'is-active' : ''}" data-dd-kw="${esc(it.name)}" data-i="${i}">${it.html}</div>`).join('');
        dd.hidden = false;
      }
      function closeDD() { const dd = root.querySelector('[data-kw-dd]'); if (dd) dd.hidden = true; }

      function save() {
        readForm();
        const d = st.draft;
        if (!d.title) {
          const t = root.querySelector('[name=title]'); t.focus(); t.classList.add('cd-invalid');
          App.ui.toast('제목을 입력해 주세요'); return;
        }
        if (d.period.start && d.period.end && d.period.end < d.period.start) { App.ui.toast('종료 시점이 시작보다 빨라요'); return; }
        const patch = {
          title: d.title, category: d.category, period: d.period, projectId: d.projectId, sourceLogIds: d.sourceLogIds || [], role: d.role, summary: d.summary,
          star: d.star, insights: d.insights, keywords: d.keywords, jobs: d.jobs, links: d.links,
        };
        if (!st.id) {
          const created = App.store.create(patch);
          App.wiki.recordEdit('manual', created.id, null); // 변경 기록만 조용히 남긴다
          App.ui.toast('새 경험 카드를 위키에 추가했어요');
          App.navigate('#/card/' + created.id);
          return;
        }
        const before = clone(App.store.get(st.id));
        App.store.update(st.id, patch);
        App.wiki.recordEdit('manual', st.id, before); // 변경 기록만 조용히 남긴다 (AI 정리 없음)
        App.ui.toast('저장했어요');
        st = { id: st.id, mode: 'view', draft: clone(App.store.get(st.id)) };
        if (location.hash.includes('edit=1')) history.replaceState(null, '', '#/card/' + st.id);
        draw();
      }

      // 경험 더 담기 — 아직 이 카드에 없는 경험을 골라 담는다
      function openPicker() {
        const e = App.store.get(st.id); if (!e) return;
        const list = pickable(e);
        const projOf = (id) => { const p = id && App.store.getProject(id); return p ? App.store.projectName(p) : ''; };
        App.ui.modal({
          title: '경험 더 담기',
          body: list.length ? `<p class="subtle cd-pick-lead">AI와 나눈 대화 하나가 경험 하나예요. 이 카드에 담을 경험을 골라 주세요.${e.projectId ? ' 같은 프로젝트의 경험이 먼저 보여요.' : ''}</p>
            <ul class="cd-pick">${list.map((it) => `<li><label class="cd-pick-item">
              <input type="checkbox" value="${esc(it.id)}">
              <span class="cd-pick-main"><span class="cd-pick-t">${esc(App.wiki.short(it.text, 70))}</span>
              <span class="cd-pick-meta subtle">${esc(it.label || '대화')} · ${esc(fmtDate(it.date))}${projOf(it.projectId) ? ` · ▤ ${esc(projOf(it.projectId))}` : ''}${it.cardIds.length ? ` · 다른 카드 ${it.cardIds.length}개에 담김` : ''}</span></span>
            </label></li>`).join('')}</ul>`
            : '<p>담을 수 있는 경험이 없어요. 질문함에서 AI와 대화를 끝내면 경험이 생겨요.</p>',
          confirmText: list.length ? '이 카드에 담기' : '확인',
          onConfirm(mroot) {
            if (!list.length) return true;
            const ids = [...mroot.querySelectorAll('.cd-pick input:checked')].map((x) => x.value);
            if (!ids.length) { App.ui.toast('담을 경험을 골라 주세요'); return false; }
            ids.forEach((id) => App.wiki.addToCard(id, e.id));
            App.ui.toast(`경험 ${ids.length}개를 이 카드에 담았어요`);
            st.draft = clone(App.store.get(st.id)); draw(true);
            return true;
          },
        });
      }

      function confirmDelete() {
        const e = App.store.get(st.id); if (!e) return;
        App.ui.modal({
          title: '이 경험 카드를 삭제할까요?',
          body: `<p><b>${esc(e.title)}</b></p><p style="margin-top:6px">STAR 정리와 카드가 삭제되고 되돌릴 수 없어요. 담긴 경험(대화 원문)은 질문함에 그대로 남아요.${projectOf(e) ? ' 프로젝트 기록은 그대로 남아요.' : ''}</p>`,
          confirmText: '삭제하기', danger: true,
          onConfirm() { App.store.remove(e.id); App.ui.toast('경험 카드를 삭제했어요'); App.navigate('#/vault'); },
        });
      }

      function onClick(ev) {
        const t = ev.target;
        const rm = t.closest('[data-remove-kw]');
        if (rm && st.mode === 'edit') { const k = rm.getAttribute('data-remove-kw'); st.draft.keywords = st.draft.keywords.filter((x) => x !== k); drawKw(); return; }
        const ddi = t.closest('[data-dd-kw]');
        if (ddi) { addKw(ddi.getAttribute('data-dd-kw')); const inp = root.querySelector('[data-kw-input]'); inp.value = ''; ddIndex = 0; drawDD(); inp.focus(); return; }
        const job = t.closest('[data-add-job]');
        if (job) {
          const inp = root.querySelector('[name=jobs]'); const cur = inp.value.split(',').map((x) => x.trim()).filter(Boolean);
          cur.push(job.getAttribute('data-add-job')); inp.value = cur.join(', '); job.remove(); return;
        }
        if (!t.closest('.cd-kw-add')) closeDD();
        const a = t.closest('[data-act]'); if (!a) return;
        const act = a.getAttribute('data-act');
        if (act === 'edit') { st.mode = 'edit'; st.draft = clone(App.store.get(st.id)); draw(); }
        else if (act === 'cancel') {
          if (!st.id) { App.navigate('#/vault'); return; }
          st.mode = 'view'; if (location.hash.includes('edit=1')) history.replaceState(null, '', '#/card/' + st.id); draw();
        }
        else if (act === 'save') save();
        else if (act === 'delete') confirmDelete();
        else if (act === 'resume') { const e = App.store.get(st.id); if (e && App.resumeKit) App.resumeKit.openCardModal(e, () => draw()); }
        else if (act === 'add-exp') openPicker();
        else if (act === 'talk-gap') openGapTalk();
        else if (act === 'close-gap-talk') draw(true);
        else if (act === 'ask-gap') {
          const e = App.store.get(st.id); const g = e && App.ai.gapQuestion(e); if (!g) return;
          App.store.pushQuestion({ type: 'deepen', targetExpId: e.id, stage: g.stage, text: `${App.wiki.short(e.title, 30)} — ${g.text}`, hint: '답하면 이 경험 카드의 빈 칸이 채워져요.' });
          App.ui.toast('오늘의 질문으로 보냈어요');
          draw(true);
        }
        else if (act === 'copy') {
          const txt = root.querySelector('.cd-pitch').textContent;
          const done = () => App.ui.toast('30초 요약을 복사했어요');
          if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, done); else done();
        }
      }

      function onInput(ev) {
        if (ev.target.matches('[data-kw-input]')) { ddIndex = 0; drawDD(); }
        if (ev.target.classList.contains('cd-invalid')) ev.target.classList.remove('cd-invalid');
      }
      function onFocusIn(ev) { if (ev.target.matches('[data-kw-input]')) drawDD(); }
      function onKey(ev) {
        if (!ev.target.matches('[data-kw-input]')) return;
        const dd = root.querySelector('[data-kw-dd]');
        const items = dd ? dd.querySelectorAll('[data-dd-kw]') : [];
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
          ev.preventDefault(); if (!items.length) return;
          ddIndex = (ddIndex + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; drawDD();
          const act = dd.querySelector('.is-active'); if (act) act.scrollIntoView({ block: 'nearest' });
        } else if (ev.key === 'Enter') {
          if (ev.isComposing) return;
          ev.preventDefault();
          const v = ev.target.value.replace(/^#/, '').trim();
          const pick = items[ddIndex];
          if (v && pick) addKw(pick.getAttribute('data-dd-kw')); else if (v) addKw(v);
          ev.target.value = ''; ddIndex = 0; drawDD();
        } else if (ev.key === 'Escape') closeDD();
      }

      root.addEventListener('click', onClick);
      root.addEventListener('input', onInput);
      root.addEventListener('focusin', onFocusIn);
      root.addEventListener('keydown', onKey);
      return () => {
        closeGapTalk();
        root.removeEventListener('click', onClick); root.removeEventListener('input', onInput);
        root.removeEventListener('focusin', onFocusIn); root.removeEventListener('keydown', onKey);
      };
    },
  };
})(window.App);
