/* 역량 맵 / 면접 준비 — #/competency */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  // 직무별 핵심 역량 키워드
  const JOB_KEYWORDS = {
    '백엔드 개발자': ['문제해결', '협업', '학습능력', '분석력', '의사결정'],
    '프론트엔드 개발자': ['협업', '고객지향', '문제해결', '커뮤니케이션', '꼼꼼함'],
    '서비스 기획자': ['고객지향', '분석력', '커뮤니케이션', '의사결정', '주도성'],
    '데이터 분석가': ['분석력', '문제해결', '커뮤니케이션', '꼼꼼함', '학습능력'],
    '마케터': ['고객지향', '창의성', '분석력', '커뮤니케이션', '주도성'],
    '디자이너': ['고객지향', '창의성', '커뮤니케이션', '협업', '꼼꼼함'],
  };
  const DEFAULT_KWS = ['문제해결', '협업', '커뮤니케이션', '책임감', '주도성'];
  const jobKeywords = (job) => JOB_KEYWORDS[job] || DEFAULT_KWS;
  const READY = 70;

  /* ---------- 대표 경험 핀 (localStorage, 실패 시 메모리) ---------- */
  const PIN_KEY = 'rewrite-cp-pins';
  let memPins = null;
  function readPins() {
    if (memPins) return memPins;
    try { memPins = JSON.parse(localStorage.getItem(PIN_KEY) || '{}') || {}; } catch (e) { memPins = {}; }
    return memPins;
  }
  function writePins(p) { memPins = p; try { localStorage.setItem(PIN_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ } }

  const expsFor = (kw) => App.store.list().filter((e) => e.keywords.includes(kw)).sort((a, b) => b.completeness - a.completeness);
  // 대표 경험: 직접 고른 것 → 없으면 완성도 가장 높은 것(AI 추천)
  function repFor(kw) {
    const list = expsFor(kw); const pinId = readPins()[kw];
    const pinned = pinId && list.find((e) => e.id === pinId);
    if (pinned) return { exp: pinned, pinned: true };
    return list[0] ? { exp: list[0], pinned: false } : null;
  }

  /* ---------- 30초 답변 ---------- */
  const firstSentences = (t, max) => {
    const s = String(t || '').trim(); if (!s) return '';
    const parts = s.split(/(?<=[.!?。])\s+/);
    let out = parts[0];
    for (let i = 1; i < parts.length && (out + ' ' + parts[i]).length <= max; i++) out += ' ' + parts[i];
    return out.length > max + 30 ? out.slice(0, max) + '…' : out;
  };
  function cue(t) {
    const s = String(t || '').trim(); if (!s) return '';
    const nums = s.match(/[\d.]+\s?(s|초|%|명|개월|주|배|분)?\s?→\s?[\d.]+\s?(s|초|%|명|개월|주|배|분)?|[\d.]+\s?(%|명|개월|주|배|초|분|s)/g) || [];
    const head = s.split(/[,.，。→]/)[0].trim();
    const short = head.length > 20 ? head.slice(0, 20) + '…' : head;
    return [short].concat(nums.slice(0, 2).filter((n) => !short.includes(n))).join(' · ');
  }
  function answerParts(e, kw, job) {
    const st = e.star || {};
    const sit = [st.situation, st.task].filter(Boolean).join(' ');
    return [
      { k: '상황', v: firstSentences(sit, 70), cue: cue(st.situation || st.task) },
      { k: '행동', v: firstSentences(st.action, 90), cue: cue(st.action) },
      { k: '결과', v: firstSentences(st.result, 70), cue: cue(st.result) },
      { k: '한 마디', v: e.insights ? firstSentences(e.insights, 60) : `이 경험으로 ${job}에게 필요한 ${kw} 역량을 키웠어요.`, cue: e.insights ? cue(e.insights) : `${kw} → ${job}` },
    ];
  }

  /* ---------- 화면 상태 ---------- */
  const ui = { job: null, filter: 'all', selected: null, memorize: false };

  function render() {
    const user = App.store.state.user;
    const job = ui.job || user.targetJob || '백엔드 개발자';
    const core = jobKeywords(job);
    const counts = App.keywords.counts();
    if (!ui.selected) ui.selected = core.find((k) => counts[k]) || core[0];
    const jobs = Object.keys(JOB_KEYWORDS); if (!jobs.includes(job)) jobs.unshift(job);
    return `<div class="page cp">
      <div class="page-head cp-head">
        <div><h1>역량 맵</h1><p>면접 전엔 키워드별 경험 하나씩만 기억하세요. 나머지는 Rewrite가 정리해 둘게요.</p></div>
        <label class="cp-job"><span>목표 직무</span>
          <select class="select" id="cp-job">${jobs.map((j) => `<option ${j === job ? 'selected' : ''}>${esc(j)}</option>`).join('')}</select></label>
      </div>
      ${checklist(core, job)}
      <div class="cp-layout">
        <div class="card cp-map-card">
          <div class="cp-map-head"><div class="section-title" style="margin:0">내 키워드 지도</div>
            <div class="cp-seg" role="tablist">
              <button class="${ui.filter === 'all' ? 'on' : ''}" data-cp-filter="all" role="tab">전체</button>
              <button class="${ui.filter === 'core' ? 'on' : ''}" data-cp-filter="core" role="tab">${esc(job)} 핵심</button></div></div>
          ${bubbleMap(core, counts)}
          <div class="cp-legend"><span><i class="cp-lg-core"></i>${esc(job)} 핵심 역량</span><span><i class="cp-lg-zero"></i>아직 경험이 없어요</span><span class="subtle">크기 = 연결된 경험 수</span></div>
        </div>
        <div class="cp-detail" id="cp-detail">${detail(ui.selected, core, job)}</div>
      </div>
    </div>`;
  }

  function checklist(core, job) {
    const items = core.map((k) => {
      const r = repFor(k); const ok = r && r.exp.completeness >= READY;
      return { k, ok, r };
    });
    const done = items.filter((x) => x.ok).length;
    return `<div class="card cp-check">
      <div class="cp-check-head"><div><b>면접 준비 체크리스트</b><span class="subtle"> · ${esc(job)} 핵심 역량 ${core.length}개</span></div>
        <div class="cp-check-score"><b>${done}</b>/${core.length} 준비됐어요</div></div>
      <div class="cp-check-bar">${App.ui.progress(Math.round((done / core.length) * 100))}</div>
      <div class="cp-check-items">${items.map(({ k, ok, r }) => `<button class="cp-check-item ${ok ? 'ok' : r ? 'mid' : 'none'} ${ui.selected === k ? 'sel' : ''}" data-cp-kw="${esc(k)}">
        <span class="cp-check-mark">${ok ? '✓' : r ? '!' : '+'}</span>
        <span class="cp-check-txt"><b>#${esc(k)}</b><span>${ok ? esc(r.exp.title) : r ? `보완 필요 · 완성도 ${r.exp.completeness}%` : '경험을 찾아봐요'}</span></span></button>`).join('')}</div>
    </div>`;
  }

  function bubbleMap(core, counts) {
    let kws = App.keywords.all().map((k) => k.name);
    Object.keys(counts).forEach((k) => { if (!kws.includes(k)) kws.push(k); });
    if (ui.filter === 'core') kws = kws.filter((k) => core.includes(k));
    // 핵심 → 경험 많은 순
    kws.sort((a, b) => (core.includes(b) - core.includes(a)) || ((counts[b] || 0) - (counts[a] || 0)));
    const max = Math.max(1, ...kws.map((k) => counts[k] || 0));
    return `<div class="cp-map">${kws.map((k) => {
      const n = counts[k] || 0; const size = n ? Math.min(124, 66 + n * 14) : 62;
      const cls = ['cp-bubble', n ? '' : 'zero', core.includes(k) ? 'core' : '', ui.selected === k ? 'sel' : ''].join(' ');
      return `<button class="${cls}" data-tone="${App.keywords.tone(k)}" data-cp-kw="${esc(k)}" style="--cp-size:${size}px;--cp-int:${n ? (0.45 + 0.55 * (n / max)).toFixed(2) : 0}">
        <span class="cp-b-name">${esc(k)}</span><span class="cp-b-n">${n ? `경험 ${n}` : '발굴하기'}</span></button>`;
    }).join('')}</div>`;
  }

  function detail(kw, core, job) {
    const meta = App.keywords.get(kw); const list = expsFor(kw); const rep = repFor(kw);
    const isCore = core.includes(kw);
    const head = `<div class="cp-d-head">
      <div class="row" style="flex-wrap:wrap">${App.ui.keywordChip(kw, { size: 'lg' })}${isCore ? `<span class="cp-core-tag">${esc(job)} 핵심</span>` : ''}</div>
      <p class="cp-d-desc">${esc(meta.desc)}</p></div>`;
    if (!list.length) {
      return `<div class="card card-pad">${head}
        <div class="cp-zero"><div class="cp-zero-ico">✦</div><b>아직 #${esc(kw)} 경험이 없어요</b>
          <p class="subtle">떠오르지 않아도 괜찮아요. 질문 몇 개로 같이 찾아봐요.${meta.hints && meta.hints.length ? ` ‘${esc(meta.hints.slice(0, 3).join('·'))}’ 같은 순간이 있었는지 떠올려 보세요.` : ''}</p>
          <a class="btn btn-primary" href="#/discover">✦ 발굴하기</a></div></div>`;
    }
    const e = rep.exp; const parts = answerParts(e, kw, job);
    const totalChars = parts.reduce((s, p) => s + p.v.length, 0);
    const secs = Math.max(15, Math.round(totalChars / 6.5));
    const weak = e.completeness < READY;
    return `<div class="card card-pad">${head}
      <div class="cp-answer ${ui.memorize ? 'memo' : ''}">
        <div class="cp-answer-head">
          <div><span class="ai-badge"><span class="ai-dot">R</span>30초 답변 카드</span>
            <div class="cp-answer-title">${esc(e.title)}</div></div>
          <label class="cp-toggle"><input type="checkbox" id="cp-memo" ${ui.memorize ? 'checked' : ''} /><span class="cp-toggle-track"><span></span></span>암기 모드</label>
        </div>
        <ol class="cp-steps">${parts.map((p, i) => `<li><span class="cp-step-k">${i + 1}. ${p.k}</span>
          <span class="cp-step-v">${p.v ? esc(p.v) : '<span class="subtle">아직 비어 있어요</span>'}</span>
          <span class="cp-step-cue">${p.cue ? '• ' + esc(p.cue) : '• (비어 있음)'}</span></li>`).join('')}</ol>
        <div class="cp-answer-foot"><span>${ui.memorize ? '단서만 보고 소리 내어 말해 보세요' : `말하면 약 ${secs}초`}</span>
          <a class="cp-link" href="#/card/${esc(e.id)}">카드에서 고치기 →</a></div>
        ${weak ? `<div class="cp-weak">완성도 ${e.completeness}%예요. 비어 있는 부분을 채우면 답변이 훨씬 단단해져요. <a class="cp-link" href="#/discover">질문으로 채우기</a></div>` : ''}
      </div>
      <div class="cp-list-head"><b>#${esc(kw)} 경험 ${list.length}개</b><span class="subtle">대표 경험 하나만 기억하면 돼요</span></div>
      <div class="cp-list">${list.map((x) => {
        const isRep = rep.exp.id === x.id;
        return `<div class="cp-exp ${isRep ? 'rep' : ''}">
          <div class="cp-exp-main" data-href="#/card/${esc(x.id)}">
            <div class="cp-exp-top">${App.ui.statusTag(x.status)}<span>${esc(x.category)}</span></div>
            <div class="cp-exp-title">${esc(x.title)}</div>
            <div class="cp-exp-foot"><span>완성도 ${x.completeness}%</span>${App.ui.progress(x.completeness)}</div>
          </div>
          ${isRep ? `<span class="cp-rep-badge">${rep.pinned ? '★ 대표 경험' : '✦ AI 추천 대표'}</span>${rep.pinned ? `<button class="btn btn-ghost btn-sm" data-cp-unpin="${esc(kw)}">해제</button>` : `<button class="btn btn-sm" data-cp-pin="${esc(x.id)}">고정</button>`}`
            : `<button class="btn btn-sm" data-cp-pin="${esc(x.id)}">대표로</button>`}
        </div>`;
      }).join('')}</div>
    </div>`;
  }

  App.screens.competency = {
    title: '역량 맵',
    render() { return render(); },
    mount(root) {
      const redraw = (scrollToDetail) => {
        const y = window.scrollY; root.innerHTML = render(); window.scrollTo(0, y);
        if (scrollToDetail && window.innerWidth < 1000) { const d = root.querySelector('#cp-detail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      };
      const onClick = (ev) => {
        const kwEl = ev.target.closest('[data-cp-kw]');
        if (kwEl) { ui.selected = kwEl.getAttribute('data-cp-kw'); ui.memorize = false; return redraw(true); }
        const f = ev.target.closest('[data-cp-filter]');
        if (f) { ui.filter = f.getAttribute('data-cp-filter'); return redraw(); }
        const pin = ev.target.closest('[data-cp-pin]');
        if (pin) {
          const p = Object.assign({}, readPins()); p[ui.selected] = pin.getAttribute('data-cp-pin'); writePins(p);
          App.ui.toast(`#${ui.selected} 대표 경험으로 고정했어요`); return redraw();
        }
        const un = ev.target.closest('[data-cp-unpin]');
        if (un) { const p = Object.assign({}, readPins()); delete p[un.getAttribute('data-cp-unpin')]; writePins(p); App.ui.toast('고정을 해제했어요'); return redraw(); }
      };
      const onChange = (ev) => {
        if (ev.target.id === 'cp-job') { ui.job = ev.target.value; ui.selected = null; redraw(); }
        if (ev.target.id === 'cp-memo') { ui.memorize = ev.target.checked; redraw(); }
      };
      root.addEventListener('click', onClick);
      root.addEventListener('change', onChange);
      return () => { root.removeEventListener('click', onClick); root.removeEventListener('change', onChange); };
    },
  };
})(window.App);
