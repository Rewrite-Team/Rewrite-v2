/* 지원 기업 상세 > 역량 맵 탭 — 기업별 요구 역량 · 대표 경험 · 30초 답변 · 면접 준비 체크리스트 */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const READY = 70;
  // 앱별로 선택한 역량 기억 (탭 재렌더 시 유지)
  const selected = {};

  /* ---------- 유틸 ---------- */
  // 마지막 한글 글자의 받침 유무로 조사 선택
  function josa(word, withBatchim, without) {
    const chars = String(word || '').match(/[가-힣]/g);
    if (!chars) return withBatchim + '(' + without + ')';
    const code = chars[chars.length - 1].charCodeAt(0) - 0xac00;
    return code % 28 ? withBatchim : without;
  }
  const stars = (w) => {
    const n = Math.max(1, Math.min(3, Number(w) || 1));
    return `<span class="ac-stars" aria-label="중요도 ${n}/3">${'★'.repeat(n)}<span class="ac-stars-off">${'★'.repeat(3 - n)}</span></span>`;
  };
  const shortTitle = (t) => String(t || '').split(' — ')[0];
  const STATE = {
    ready: { label: '준비됨', mark: '✓' },
    weak: { label: '보완 필요', mark: '!' },
    none: { label: '경험 없음', mark: '+' },
  };

  // 기업 요구 역량 + 준비도 결합
  function model(app) {
    const rd = App.ai.readiness(app);
    const reasons = {};
    (app.competencies || []).forEach((c) => { reasons[c.name] = c.reason || ''; });
    const comps = rd.competencies.map((c) => {
      const state = c.exp ? (c.exp.completeness >= READY ? 'ready' : 'weak') : 'none';
      return Object.assign({}, c, { reason: reasons[c.name] || '', state });
    }).sort((a, b) => (b.weight - a.weight));
    return { comps, rd };
  }
  // 해당 키워드 경험 목록 (고정된 경험이 키워드를 잃었더라도 함께 보여 줌)
  function expsFor(kw, pinnedId) {
    const list = App.store.list().filter((e) => e.keywords.includes(kw)).sort((a, b) => b.completeness - a.completeness);
    if (pinnedId && !list.some((e) => e.id === pinnedId)) { const p = App.store.get(pinnedId); if (p) list.unshift(p); }
    return list;
  }
  function pickSelected(app, comps) {
    const cur = selected[app.id];
    if (cur && comps.some((c) => c.name === cur)) return cur;
    const first = comps.find((c) => c.state !== 'ready') || comps[0];
    selected[app.id] = first ? first.name : null;
    return selected[app.id];
  }

  /* ---------- 렌더 ---------- */
  function render(app) {
    app = App.store.getApp(app.id) || app;
    const { comps } = model(app);
    if (!comps.length) {
      return `<div class="ac">
        <div class="card ac-empty">
          <div class="ac-empty-ico">✦</div>
          <b>아직 요구 역량이 없어요</b>
          <p class="subtle">개요 탭에서 채용공고를 붙여 넣거나 요구 역량을 직접 추가하면, 이 기업만을 위한 역량 맵을 만들어 드릴게요.</p>
          <a class="btn btn-primary" href="#/apply/${esc(app.id)}">개요 탭에서 요구 역량 추가하기</a>
        </div></div>`;
    }
    const sel = pickSelected(app, comps);
    const target = `${app.company} · ${app.job}`;
    return `<div class="ac">
      <p class="ac-intro">「${esc(target)}」${josa(app.job || app.company, '이', '가')} 원하는 역량이에요. 역량마다 대표 경험 하나씩만 준비하면 돼요.</p>
      ${checklist(comps, sel)}
      <div class="ac-layout">
        <div class="card ac-map-card">
          <div class="ac-map-head"><div class="section-title" style="margin:0">요구 역량 맵</div>
            <span class="ac-map-note">크기 = 공고에서의 중요도</span></div>
          ${map(comps, sel)}
          ${legend()}
          ${extras(app)}
        </div>
        <div class="ac-detail" data-ac-detail>${detail(app, comps.find((c) => c.name === sel))}</div>
      </div>
    </div>`;
  }

  function checklist(comps, sel) {
    const done = comps.filter((c) => c.state === 'ready').length;
    return `<div class="card ac-check">
      <div class="ac-check-head"><b>면접 준비 체크리스트</b>
        <span class="ac-check-score"><b>${done}/${comps.length}</b> 준비됨</span></div>
      <div class="ac-check-bar">${App.ui.progress(Math.round((done / comps.length) * 100))}</div>
      <div class="ac-check-items">${comps.map((c) => `<button type="button" class="ac-check-item is-${c.state} ${c.name === sel ? 'sel' : ''}" data-ac-kw="${esc(c.name)}">
        <span class="ac-mark">${STATE[c.state].mark}</span>
        <span class="ac-check-txt"><b>#${esc(c.name)}</b><span>${c.state === 'ready' ? esc(shortTitle(c.exp.title)) : c.state === 'weak' ? `보완 필요 · 완성도 ${c.exp.completeness}%` : '경험을 찾아봐요'}</span></span>
      </button>`).join('')}</div>
    </div>`;
  }

  function map(comps, sel) {
    return `<div class="ac-map">${comps.map((c) => `<button type="button" class="ac-tile w${Math.max(1, Math.min(3, c.weight || 1))} is-${c.state} ${c.name === sel ? 'sel' : ''}" data-ac-kw="${esc(c.name)}">
      <span class="ac-tile-top"><span class="ac-tile-name">${esc(c.name)}</span>${stars(c.weight)}</span>
      <span class="ac-tile-reason">${c.reason ? `“${esc(c.reason)}”` : '<span class="ac-muted">공고 속 근거 문장이 없어요</span>'}</span>
      <span class="ac-tile-foot"><span class="ac-pill is-${c.state}">${STATE[c.state].label}</span>
        <span class="ac-tile-exp">${c.exp ? esc(shortTitle(c.exp.title)) : '발굴하기 →'}</span></span>
    </button>`).join('')}</div>`;
  }

  function legend() {
    return `<div class="ac-legend">
      <span><i class="ac-dot is-ready"></i>준비됨 (완성도 ${READY}% 이상)</span>
      <span><i class="ac-dot is-weak"></i>보완 필요</span>
      <span><i class="ac-dot is-none"></i>경험 없음</span></div>`;
  }

  // 이 기업이 요구하진 않지만 내가 가진 강점
  function extras(app) {
    const req = (app.competencies || []).map((c) => c.name);
    const counts = App.keywords.counts();
    const rest = Object.keys(counts).filter((k) => !req.includes(k) && counts[k] > 0).sort((a, b) => counts[b] - counts[a]);
    if (!rest.length) return '';
    return `<div class="ac-extra">
      <div class="ac-extra-head"><b>내가 가진 다른 강점</b><span class="subtle">요구 역량은 아니지만, 자기소개나 “그 밖의 강점” 질문에서 꺼내 볼 수 있어요</span></div>
      <div class="ac-extra-list">${rest.map((k) => `<span class="ac-extra-chip" data-tone="${App.keywords.tone(k)}">#${esc(k)}<em>${counts[k]}</em></span>`).join('')}</div>
    </div>`;
  }

  function tailor(app, c, e) {
    const company = app.company || '이 기업';
    if (c.reason) {
      return `“「${esc(shortTitle(e.title))}」에서 익힌 방식은 ${esc(company)}${josa(company, '이', '가')} 말한 ‘${esc(c.reason)}’${josa(c.reason, '과', '와')} 맞닿아 있다고 생각해요.”라고 마무리해 보세요.`;
    }
    return `“이 경험으로 키운 ${esc(c.name)} 역량으로 ${esc(company)} ${esc(app.job || '')}에서도 기여하고 싶어요.”라고 마무리해 보세요.`;
  }

  function detail(app, c) {
    if (!c) return '';
    const meta = App.keywords.get(c.name);
    const pinnedId = (app.pins || {})[c.name] || null;
    const list = expsFor(c.name, pinnedId);
    const head = `<div class="ac-d-head">
      <div class="ac-d-title">${App.ui.keywordChip(c.name, { size: 'lg' })}${stars(c.weight)}<span class="ac-pill is-${c.state}">${STATE[c.state].label}</span></div>
      <p class="ac-d-desc">${esc(meta.desc)}</p>
      <div class="ac-why"><span class="ac-why-k">${esc(app.company || '이 기업')}${josa(app.company, '이', '가')} 원하는 이유</span>
        <span class="ac-why-v">${c.reason ? `“${esc(c.reason)}”` : '<span class="ac-muted">공고에서 근거 문장을 찾지 못했어요. 개요 탭에서 적어 둘 수 있어요.</span>'}</span></div>
    </div>`;

    if (!c.exp) {
      return `<div class="card card-pad">${head}
        <div class="ac-zero"><div class="ac-empty-ico">✦</div><b>아직 #${esc(c.name)} 경험이 없어요</b>
          <p class="subtle">떠오르지 않아도 괜찮아요. 질문 몇 개로 같이 찾아봐요.${meta.hints && meta.hints.length ? ` ‘${esc(meta.hints.slice(0, 3).join('·'))}’ 같은 순간이 있었는지 떠올려 보세요.` : ''}</p>
          <a class="btn btn-primary" href="#/discover?kw=${encodeURIComponent(c.name)}">✦ 이 역량이 드러난 경험 찾기</a></div></div>`;
    }

    const e = c.exp; const b = App.ai.starBrief(e);
    const parts = [
      ['상황', b.situation], ['행동', b.action], ['결과', b.result],
      ['한 마디', b.insight || `이 경험으로 ${c.name} 역량을 키웠어요.`],
    ];
    const answer = `<div class="ac-answer">
      <div class="ac-answer-head"><span class="ai-badge"><span class="ai-dot">R</span>30초 답변 카드</span>
        <span class="ac-rep-tag">${c.pinned ? '★ 대표 경험' : '✦ AI 추천 대표'}</span></div>
      <div class="ac-answer-title">${esc(e.title)}</div>
      <ol class="ac-steps">${parts.map(([k, v], i) => `<li><span class="ac-step-k">${i + 1}. ${k}</span>
        <span class="ac-step-v">${v ? esc(v) : '<span class="ac-muted">아직 비어 있어요</span>'}</span></li>`).join('')}</ol>
      <div class="ac-tailor"><span class="ac-tailor-k">이 기업에 맞춰 말하기</span><span>${tailor(app, c, e)}</span></div>
      <div class="ac-answer-foot"><a class="ac-link" href="#/card/${esc(e.id)}">카드에서 고치기 →</a></div>
      ${e.completeness < READY ? `<div class="ac-weak"><span>완성도 ${e.completeness}%예요. 비어 있는 부분을 채우면 답변이 훨씬 단단해져요.</span>
        <a class="ac-link" href="#/discover?exp=${encodeURIComponent(e.id)}">질문으로 채우기 →</a></div>` : ''}
    </div>`;

    const rows = list.map((x) => {
      const isRep = x.id === e.id;
      let actions;
      if (isRep && c.pinned) actions = `<span class="ac-rep-badge">★ 대표</span><button type="button" class="btn btn-ghost btn-sm" data-ac-unpin>고정 해제</button>`;
      else if (isRep) actions = `<span class="ac-rep-badge ai">✦ AI 추천 대표</span><button type="button" class="btn btn-sm" data-ac-pin="${esc(x.id)}">대표로 고정</button>`;
      else actions = `<button type="button" class="btn btn-sm" data-ac-pin="${esc(x.id)}">대표로 고정</button>`;
      return `<div class="ac-exp ${isRep ? 'rep' : ''}">
        <div class="ac-exp-main" data-href="#/card/${esc(x.id)}">
          <div class="ac-exp-top">${App.ui.statusTag(x.status)}<span>${esc(x.category)}</span></div>
          <div class="ac-exp-title">${esc(x.title)}</div>
          <div class="ac-exp-foot"><span>완성도 ${x.completeness}%</span>${App.ui.progress(x.completeness)}</div>
        </div>
        <div class="ac-exp-act">${actions}</div>
      </div>`;
    }).join('');

    return `<div class="card card-pad">${head}${answer}
      <div class="ac-list-head"><b>#${esc(c.name)} 경험 ${list.length}개</b><span class="subtle">이 기업용 대표 경험 하나만 기억하면 돼요</span></div>
      <div class="ac-list">${rows}</div>
    </div>`;
  }

  /* ---------- 탭 등록 ---------- */
  App.applyTabs = App.applyTabs || {};
  App.applyTabs.competency = {
    label: '역량 맵',
    render(app) { return render(app); },
    mount(el, app, ctx) {
      const appId = app.id;
      const redrawLocal = (scrollToDetail) => {
        const a = App.store.getApp(appId); if (!a) return;
        el.innerHTML = render(a);
        if (scrollToDetail && el.clientWidth <= 820) {
          const d = el.querySelector('[data-ac-detail]'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      // 고정/해제는 상단 준비도에도 영향 → 상세 페이지 전체 재렌더
      const refreshAll = () => {
        const y = window.scrollY;
        if (ctx && typeof ctx.refresh === 'function') ctx.refresh(); else redrawLocal();
        window.scrollTo(0, y);
      };
      const onClick = (ev) => {
        const kwEl = ev.target.closest('[data-ac-kw]');
        if (kwEl && el.contains(kwEl)) { selected[appId] = kwEl.getAttribute('data-ac-kw'); return redrawLocal(true); }
        const a = App.store.getApp(appId); if (!a) return;
        const kw = selected[appId]; if (!kw) return;
        const pin = ev.target.closest('[data-ac-pin]');
        if (pin) {
          App.store.setPin(appId, kw, pin.getAttribute('data-ac-pin'));
          App.ui.toast(`${a.company}용 #${kw} 대표 경험으로 고정했어요`);
          return refreshAll();
        }
        if (ev.target.closest('[data-ac-unpin]')) {
          App.store.setPin(appId, kw, null);
          App.ui.toast('고정을 해제했어요. AI 추천 대표로 돌아가요');
          return refreshAll();
        }
      };
      el.addEventListener('click', onClick);
      return () => el.removeEventListener('click', onClick);
    },
  };
})(window.App);
