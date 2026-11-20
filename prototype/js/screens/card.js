/* 경험 카드 상세·편집 — #/card/:id (id = 'new' 이면 새 카드, ?edit=1 이면 편집 모드로 시작) */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  const STAR = [
    { key: 'situation', letter: 'S', label: '상황', hint: '언제, 어디서, 누구와 어떤 상황이었나요?' },
    { key: 'task', letter: 'T', label: '과제', hint: '내가 맡은 역할이나 해결해야 했던 목표는요?' },
    { key: 'action', letter: 'A', label: '행동', hint: '내가 직접 한 행동과 그렇게 판단한 이유는요?' },
    { key: 'result', letter: 'R', label: '결과', hint: '무엇이 달라졌나요? 숫자로 말할 수 있으면 더 좋아요.' },
  ];
  const STATUS_OPTS = [['draft', '작성중'], ['done', '완성']];
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
      period: { start: '', end: '' }, status: 'draft', projectId: params.project || null, sourceLogIds: [], role: '', summary: '',
      star: { situation: '', task: '', action: '', result: '' }, insights: '', keywords: kw, jobs: [], links: [], qa: [], completeness: 0,
    };
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));
  // 이 카드가 나온 프로젝트와, 근거로 고른 로그
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

  function ring(pct) {
    const r = 26, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    const tone = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--primary)' : 'var(--accent)';
    return `<div class="cd-ring" title="완성도 ${pct}%">
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <circle cx="32" cy="32" r="${r}" fill="none" stroke="#eeebe5" stroke-width="6"/>
        <circle cx="32" cy="32" r="${r}" fill="none" stroke="${tone}" stroke-width="6" stroke-linecap="round"
          stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 32 32)"/>
      </svg><div class="cd-ring-num"><b>${pct}</b><span>%</span></div></div>`;
  }

  function nextHint(e) {
    const missing = STAR.filter((s) => !(e.star[s.key] || '').trim()).map((s) => s.label);
    if (missing.length) return `${missing.join('·')}을(를) 채우면 완성도가 올라가요`;
    if (!/\d/.test(e.star.result || '')) return '결과에 숫자를 넣으면 설득력이 커져요';
    if (!e.insights) return '배운 점을 적으면 카드가 완성돼요';
    if (!e.keywords.length) return '역량 키워드를 1개 이상 붙여 주세요';
    return '면접에서 바로 꺼내 쓸 수 있는 카드예요';
  }

  /* ---------------- View ---------------- */
  function viewHTML(e) {
    const kwInfo = e.keywords.map((k) => App.keywords.get(k));
    const counts = App.keywords.counts();
    const gap = App.ai.gapQuestion(e);
    const sp = pitch(e);
    const secs = Math.max(5, Math.round(sp.length / 7));
    const qs = [];
    e.keywords.forEach((k) => (KW_QUESTIONS[k] || []).forEach((q, i) => qs.push({ k, q, i })));
    qs.sort((a, b) => a.i - b.i);
    const pickQs = qs.slice(0, 3);

    return `
    <div class="cd-head card">
      <div class="cd-head-main">
        <div class="cd-meta">${App.ui.statusTag(e.status)}<span class="cd-meta-cat">${esc(e.category)}</span><span class="cd-dot">·</span><span>${App.ui.period(e.period)}</span>
          ${projectOf(e) ? `<a class="cd-proj-badge" href="#/projects/${encodeURIComponent(e.projectId)}">▤ ${esc(projectOf(e).title.split(' — ')[0])}에서 나온 카드</a>` : ''}</div>
        <h1 class="cd-title">${esc(e.title || '제목 없는 경험')}</h1>
        ${e.role ? `<div class="cd-role"><span class="cd-role-lb">역할</span>${esc(e.role)}</div>` : ''}
        <p class="cd-summary ${e.summary ? '' : 'is-empty'}">${esc(e.summary || '아직 한 줄 요약이 없어요. 수정에서 추가하거나 질문에 답하면 채워져요.')}</p>
      </div>
      <div class="cd-head-side">
        ${ring(e.completeness)}
        <div class="cd-comp-text"><div class="cd-comp-lb">완성도</div><div class="cd-comp-hint">${esc(nextHint(e))}</div></div>
      </div>
      <div class="cd-head-actions">
        <a class="btn btn-sm cd-ai-talk" href="#/discover?exp=${encodeURIComponent(e.id)}"><span class="cd-ai-mini">AI</span> AI와 대화하며 다듬기</a>
        <button class="btn btn-sm" data-act="edit">✎ 직접 수정</button>
        <button class="btn btn-sm btn-ghost cd-del" data-act="delete">삭제</button>
      </div>
    </div>

    <div class="cd-layout">
      <div class="cd-main">
        <section class="card card-pad cd-sec">
          <div class="section-title">STAR 정리 <span class="subtle cd-sec-sub">AI 정리본 · 원문은 아래에 보존돼요</span></div>
          <div class="cd-star">
            ${STAR.map((s) => {
              const v = (e.star[s.key] || '').trim();
              return `<div class="cd-star-blk ${v ? '' : 'is-empty'}" data-stage="${s.key}">
                <div class="cd-star-lb"><span class="cd-star-letter">${s.letter}</span>${s.label}</div>
                ${v ? `<div class="cd-star-text">${esc(v)}</div>
                  <a class="cd-refine" href="#/discover?exp=${encodeURIComponent(e.id)}&stage=${s.key}">✦ AI와 다듬기</a>` : `
                  <div class="cd-star-empty"><div>아직 비어 있어요</div><div class="subtle">${esc(s.hint)}</div>
                  <a class="btn btn-sm cd-fill-btn" href="#/discover?exp=${encodeURIComponent(e.id)}&stage=${s.key}"><span class="cd-ai-mini">AI</span> AI 질문으로 채우기</a></div>`}
              </div>`;
            }).join('')}
          </div>
        </section>

        <section class="card card-pad cd-sec">
          <div class="section-title">배운 점 · 성장</div>
          ${e.insights ? `<p class="cd-insight">${esc(e.insights)}</p><a class="cd-refine" href="#/discover?exp=${encodeURIComponent(e.id)}&stage=insight">✦ AI와 다듬기</a>` : `<div class="cd-soft-empty">아직 비어 있어요. 이 경험 이후 달라진 점이 있다면 적어 보세요.
            <a class="cd-link" href="#/discover?exp=${encodeURIComponent(e.id)}&stage=insight">AI와 떠올려 보기 →</a></div>`}
        </section>

        <section class="card card-pad cd-sec">
          <div class="section-title">역량 키워드 <span class="more" data-act="edit">키워드 편집</span></div>
          ${kwInfo.length ? `<div class="cd-kw-list">${kwInfo.map((k) => `
            <a class="cd-kw-item" href="#/vault?kw=${encodeURIComponent(k.name)}" title="${esc(k.desc)}">
              ${App.ui.keywordChip(k.name, { size: 'lg' })}
              <span class="cd-kw-desc">${esc(k.desc)}</span>
              <span class="cd-kw-count">경험 ${counts[k.name] || 0}개 →</span>
            </a>`).join('')}</div>`
            : `<div class="cd-soft-empty">아직 키워드가 없어요. 수정에서 <b>AI 키워드 추천</b>을 눌러 보세요.</div>`}
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

        ${projectOf(e) ? (() => {
          const p = projectOf(e); const logs = sourceLogs(e);
          const siblings = App.store.cardsOf(p.id).filter((x) => x.id !== e.id);
          return `
        <section class="card card-pad cd-sec">
          <div class="section-title">근거 기록 <span class="subtle cd-sec-sub">${esc(p.title.split(' — ')[0])} 체크인 로그에서</span><a class="more" href="#/projects/${encodeURIComponent(p.id)}">프로젝트 타임라인 →</a></div>
          ${logs.length ? `<ol class="cd-timeline">${logs.map((l) => {
            const [lb, ico] = LOG_TYPES[l.type] || ['기록', '•'];
            return `<li class="cd-tl-item" data-type="${esc(l.type)}">
              <span class="cd-tl-dot">${ico}</span>
              <div class="cd-tl-body"><div class="cd-tl-top"><span class="cd-tl-type">${lb}</span><span class="subtle">${esc(l.date)}</span></div>
              <div class="cd-tl-text">${esc(l.text)}</div>
              ${(l.keywords || []).length ? `<div class="cd-tl-kws">${l.keywords.map((k) => App.ui.keywordChip(k)).join('')}</div>` : ''}</div></li>`;
          }).join('')}</ol>`
          : '<div class="cd-soft-empty">연결된 로그가 없어요. 프로젝트 타임라인에서 기록을 골라 카드를 만들면 여기에 근거로 남아요.</div>'}
          ${siblings.length ? `<div class="cd-siblings"><span class="subtle">같은 프로젝트의 다른 카드</span>${siblings.map((x) => `<a class="cd-sibling" href="#/card/${encodeURIComponent(x.id)}">${App.ui.statusTag(x.status)}<span>${esc(x.title)}</span></a>`).join('')}</div>` : ''}
        </section>`;
        })() : ''}

        <section class="card card-pad cd-sec">
          <div class="section-title">원문 기록 <span class="subtle cd-sec-sub">질문과 내 답변 그대로</span></div>
          ${e.qa.length ? `<div class="cd-qa">${e.qa.slice().reverse().map((x) => `
            <div class="cd-qa-item">
              <div class="cd-qa-q"><span class="ai-dot">R</span><div>${esc(x.q)}</div></div>
              <div class="cd-qa-a"><div class="cd-qa-bubble">${esc(x.a)}</div></div>
              <div class="cd-qa-date">${esc(x.date || '')}</div>
            </div>`).join('')}</div>`
            : `<div class="cd-soft-empty">아직 원문 기록이 없어요. AI 질문에 답하면 여기에 그대로 보관돼요.</div>`}
        </section>
      </div>

      <aside class="cd-side">
        <div class="card cd-coach">
          <div class="cd-coach-head"><span class="ai-dot">R</span><b>AI 코치</b></div>

          <div class="cd-coach-blk">
            <div class="cd-coach-lb">지금 채우면 좋은 부분</div>
            ${gap ? `<div class="cd-gap"><div class="cd-gap-q">“${esc(gap.text)}”</div>
              <a class="btn btn-primary btn-sm cd-gap-btn" href="#/discover?exp=${encodeURIComponent(e.id)}&stage=${esc(gap.stage)}">이 질문에 답하기</a></div>`
              : `<div class="cd-gap cd-gap-done">STAR가 모두 채워졌어요! 이제 면접에서 바로 쓸 수 있어요.</div>`}
          </div>

          <div class="cd-coach-blk">
            <div class="cd-coach-lb">이 경험으로 답할 수 있는 질문</div>
            ${pickQs.length ? `<ul class="cd-qs">${pickQs.map((x) => `<li><a href="#/match?q=${encodeURIComponent(x.q)}">${esc(x.q)}</a>${App.ui.keywordChip(x.k)}</li>`).join('')}</ul>`
              : '<div class="subtle">키워드를 추가하면 어울리는 질문을 찾아 드려요.</div>'}
          </div>

          ${(() => {
            const fits = App.store.activeApps().map((a) => ({ a, m: (a.competencies || []).filter((c) => e.keywords.includes(c.name)).map((c) => c.name) })).filter((x) => x.m.length);
            return `<div class="cd-coach-blk">
            <div class="cd-coach-lb">이 경험을 쓸 수 있는 지원 기업</div>
            ${fits.length ? `<ul class="cd-fits">${fits.map(({ a, m }) => `<li><a href="#/apply/${encodeURIComponent(a.id)}/competency"><b>${esc(a.company)}</b><span class="subtle"> · ${esc(a.job)}</span></a><div class="cd-fits-kws">${m.map((k) => App.ui.keywordChip(k)).join('')}</div></li>`).join('')}</ul>`
              : '<div class="subtle">이 경험의 역량을 요구하는 지원 기업이 아직 없어요.</div>'}
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
      <div class="cd-kw-current">${st.draft.keywords.length ? st.draft.keywords.map((k) => App.ui.keywordChip(k, { size: 'lg', removable: true })).join('') : '<span class="subtle">아직 키워드가 없어요. 아래에서 추가하거나 AI 추천을 받아 보세요.</span>'}</div>
      ${st.suggest && st.suggest.length ? `<div class="cd-sugg">
        <div class="cd-sugg-lb"><span class="cd-ai-mini">AI</span> 이런 역량이 보여요 · 눌러서 추가</div>
        <div class="cd-sugg-chips">${st.suggest.map((k) => `<button type="button" class="cd-sugg-chip" data-accept-kw="${esc(k)}">${App.ui.keywordChip(k, { ai: true, size: 'lg' })}<span class="cd-plus">＋</span></button>`).join('')}
        <button type="button" class="btn btn-sm btn-ghost" data-act="accept-all">모두 추가</button></div></div>` : ''}`;
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
          <div class="subtle">빈칸이 있어도 괜찮아요. 저장한 뒤 AI 질문으로 이어서 채울 수 있어요.</div></div>
        <div class="row"><button type="button" class="btn" data-act="cancel">취소</button><button type="button" class="btn btn-primary" data-act="save">저장</button></div>
      </div>

      <section class="card card-pad cd-sec">
        <div class="section-title">기본 정보</div>
        ${field('제목', `<input class="input" name="title" placeholder="예) 카페 아르바이트 — 주문 대기 줄 줄이기" value="${esc(d.title)}">`)}
        <div class="cd-form-grid">
          ${field('유형', `<select class="select" name="category">${window.SEED.categories.map((c) => `<option ${c === d.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`)}
          ${field('상태', `<select class="select" name="status">${STATUS_OPTS.map(([v, l]) => `<option value="${v}" ${v === d.status ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
          ${field('시작', `<input class="input" type="month" name="start" value="${esc(d.period.start)}">`)}
          ${field('종료', `<input class="input" type="month" name="end" value="${esc(d.period.end)}"><div class="cd-help">비워 두면 ‘진행중’으로 표시돼요</div>`)}
        </div>
        ${field('나온 프로젝트', `<select class="select" name="projectId"><option value="">없음 (단독 경험)</option>${App.store.projects().map((p) => `<option value="${esc(p.id)}" ${p.id === d.projectId ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select><div class="cd-help">프로젝트 하나에서 에피소드별로 카드를 여러 장 만들 수 있어요. 진행 중인 일을 기록하려면 <a class="cd-link" href="#/projects">프로젝트 트래커</a>에서 시작하세요.</div>`)}
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
        <div class="section-title">역량 키워드
          <button type="button" class="btn btn-sm cd-ai-btn" data-act="ai-kw"><span class="cd-ai-mini">AI</span> AI 키워드 추천</button></div>
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
      <div class="row cd-nf-actions"><a class="btn btn-primary" href="#/vault">경험 보관함으로 가기</a><a class="btn" href="#/card/new">새 경험 만들기</a></div></div>`;
  }

  function initialState(params) {
    const isNew = params.id === 'new';
    const exp = isNew ? blankExp(params) : App.store.get(params.id);
    if (!exp) return { notFound: true };
    const mode = isNew || params.edit === '1' ? 'edit' : 'view';
    return { id: isNew ? null : exp.id, mode, draft: clone(exp), suggest: [] };
  }

  function bodyHTML(st) {
    if (st.notFound) return notFoundHTML();
    if (st.mode === 'edit') return editHTML(st);
    return viewHTML(App.store.get(st.id));
  }

  App.screens.card = {
    title: (p) => (p && p.id === 'new' ? '새 경험 카드' : '경험 카드'),
    render(params) {
      const st = initialState(params);
      return `<div class="page cd-page" data-cd-root>${bodyHTML(st)}</div>`;
    },
    mount(screenEl, params) {
      const root = screenEl.querySelector('[data-cd-root]');
      let st = initialState(params);
      if (st.notFound) return null;
      let ddIndex = 0;

      function draw() { root.innerHTML = bodyHTML(st); window.scrollTo(0, 0); }
      function drawKw() { const el = root.querySelector('[data-kw-editor]'); if (el) el.innerHTML = kwEditorHTML(st); }

      function readForm() {
        const f = root.querySelector('.cd-form'); if (!f) return;
        const v = (n) => (f.elements[n] ? f.elements[n].value : '');
        const d = st.draft;
        d.title = v('title').trim(); d.category = v('category'); d.status = v('status');
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
        st.suggest = st.suggest.filter((k) => k !== name);
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

      async function aiSuggest(btn) {
        readForm();
        const d = st.draft;
        const text = [d.title, d.role, d.summary, d.insights, ...STAR.map((s) => d.star[s.key]), ...(d.qa || []).map((x) => x.a), ...sourceLogs(d).map((l) => l.text)].join(' ');
        if (!text.trim()) { App.ui.toast('먼저 STAR나 요약을 조금 적어 주세요. 그 내용을 보고 추천해 드려요.'); return; }
        btn.disabled = true; const prev = btn.innerHTML; btn.innerHTML = '<span class="cd-spin"></span> 분석 중…';
        await App.ai.think(650);
        btn.disabled = false; btn.innerHTML = prev;
        const found = App.ai.extractKeywords(text).filter((k) => !d.keywords.includes(k));
        st.suggest = found;
        drawKw();
        if (!found.length) App.ui.toast('지금 내용에서는 새로 추천할 키워드가 없어요');
      }

      function save() {
        readForm();
        const d = st.draft;
        if (!d.title) {
          const t = root.querySelector('[name=title]'); t.focus(); t.classList.add('cd-invalid');
          App.ui.toast('제목을 입력해 주세요'); return;
        }
        if (d.period.start && d.period.end && d.period.end < d.period.start) { App.ui.toast('종료 시점이 시작보다 빨라요'); return; }
        const patch = {
          title: d.title, category: d.category, status: d.status, period: d.period, projectId: d.projectId, sourceLogIds: d.sourceLogIds || [], role: d.role, summary: d.summary,
          star: d.star, insights: d.insights, keywords: d.keywords, jobs: d.jobs, links: d.links,
        };
        if (!st.id) {
          const created = App.store.create(patch);
          App.ui.toast('새 경험 카드를 만들었어요');
          App.navigate('#/card/' + created.id);
          return;
        }
        App.store.update(st.id, patch);
        App.ui.toast('저장했어요');
        st = { id: st.id, mode: 'view', draft: clone(App.store.get(st.id)), suggest: [] };
        if (location.hash.includes('edit=1')) history.replaceState(null, '', '#/card/' + st.id);
        draw();
      }

      function confirmDelete() {
        const e = App.store.get(st.id); if (!e) return;
        App.ui.modal({
          title: '이 경험 카드를 삭제할까요?',
          body: `<p><b>${esc(e.title)}</b></p><p style="margin-top:6px">STAR 정리와 원문 기록이 함께 삭제되고 되돌릴 수 없어요.${projectOf(e) ? ' 프로젝트의 체크인 로그는 그대로 남아요.' : ''}</p>`,
          confirmText: '삭제하기', danger: true,
          onConfirm() { App.store.remove(e.id); App.ui.toast('경험 카드를 삭제했어요'); App.navigate('#/vault'); },
        });
      }

      function onClick(ev) {
        const t = ev.target;
        const rm = t.closest('[data-remove-kw]');
        if (rm && st.mode === 'edit') { const k = rm.getAttribute('data-remove-kw'); st.draft.keywords = st.draft.keywords.filter((x) => x !== k); drawKw(); return; }
        const acc = t.closest('[data-accept-kw]');
        if (acc) { addKw(acc.getAttribute('data-accept-kw')); return; }
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
        if (act === 'edit') { st.mode = 'edit'; st.draft = clone(App.store.get(st.id)); st.suggest = []; draw(); }
        else if (act === 'cancel') {
          if (!st.id) { App.navigate('#/vault'); return; }
          st.mode = 'view'; if (location.hash.includes('edit=1')) history.replaceState(null, '', '#/card/' + st.id); draw();
        }
        else if (act === 'save') save();
        else if (act === 'delete') confirmDelete();
        else if (act === 'ai-kw') aiSuggest(a);
        else if (act === 'accept-all') { st.suggest.slice().forEach((k) => { if (!st.draft.keywords.includes(k)) st.draft.keywords.push(k); }); st.suggest = []; drawKw(); }
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
        root.removeEventListener('click', onClick); root.removeEventListener('input', onInput);
        root.removeEventListener('focusin', onFocusIn); root.removeEventListener('keydown', onKey);
      };
    },
  };
})(window.App);
