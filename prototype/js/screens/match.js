/* 자소서·면접 매칭 (BETA) — #/match */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  // 키워드별: 질문이 보고 싶어 하는 것 + STAR 중 강조할 부분
  const KW_GUIDE = {
    '협업': { want: '혼자가 아니라 팀 안에서 어떤 역할로 기여했는지', part: 'action', tip: '행동(A)에서 팀원과 무엇을 맞췄고, 내가 맡은 몫이 무엇이었는지 나눠서 말해 보세요.' },
    '문제해결': { want: '원인을 어떻게 찾았고 무엇으로 해결했는지', part: 'action', tip: '행동(A)에서 ‘원인 파악 → 해결책’ 순서를 분명히 하고, 결과(R)의 숫자로 마무리하세요.' },
    '커뮤니케이션': { want: '상대에 맞춰 설명하고 합의를 이끈 방식', part: 'action', tip: '행동(A)에서 누구에게, 어떤 방식으로 전달했는지 구체적으로 보여 주세요.' },
    '리더십': { want: '방향을 정하고 사람을 움직인 방식', part: 'task', tip: '과제(T)에서 내가 책임진 범위를 먼저 밝히고, 사람을 움직인 행동을 이어 주세요.' },
    '주도성': { want: '시키지 않았는데 먼저 시작한 순간', part: 'task', tip: '“누가 시키지 않았지만”이라는 출발점을 과제(T)에 분명히 넣어 보세요.' },
    '책임감': { want: '맡은 일을 끝까지 해낸 과정', part: 'task', tip: '과제(T)의 제약(시간·인원)을 강조하고, 끝까지 마무리한 결과를 보여 주세요.' },
    '분석력': { want: '데이터나 상황을 쪼개서 판단한 근거', part: 'action', tip: '행동(A)에서 무엇을 세어 보고 비교했는지, 판단 근거를 숫자로 보여 주세요.' },
    '학습능력': { want: '모르는 것을 얼마나 빠르게, 어떻게 익혔는지', part: 'action', tip: '행동(A)에 학습 방법과 걸린 시간을 넣고, 배운 것을 바로 적용한 결과로 이어 주세요.' },
    '고객지향': { want: '사용자의 불편을 어떻게 발견하고 반영했는지', part: 'situation', tip: '상황(S)에서 고객이 겪은 불편을 생생하게 묘사하고 시작하세요.' },
    '꼼꼼함': { want: '실수를 줄이기 위해 챙긴 디테일', part: 'action', tip: '행동(A)에서 확인·검토 과정을 구체적인 절차로 보여 주세요.' },
    '갈등조정': { want: '의견 차이를 어떻게 듣고 조율했는지', part: 'action', tip: '행동(A)에서 양쪽 입장을 어떻게 확인했고, 어떤 기준으로 합의했는지 강조하세요.' },
    '의사결정': { want: '선택지를 비교하고 결정한 기준', part: 'action', tip: '행동(A)에서 다른 선택지와 버린 이유까지 말하면 판단력이 드러나요.' },
    '끈기': { want: '어려움 앞에서 포기하지 않은 과정', part: 'situation', tip: '상황(S)의 어려움을 충분히 보여 준 뒤, 다시 시도한 행동을 이어 주세요.' },
    '창의성': { want: '기존과 다르게 시도한 방법', part: 'action', tip: '행동(A)에서 기존 방식과 무엇이 달랐는지 대비해서 말해 보세요.' },
  };
  const PART_LABEL = { situation: '상황(S)', task: '과제(T)', action: '행동(A)', result: '결과(R)' };
  const TRIGGERS = { '갈등': '갈등조정', '주도': '주도성', '실패': '끈기', '새로운 기술': '학습능력', '고객': '고객지향', '사용자': '고객지향', '개선': '문제해결' };

  // 받침에 따라 조사 고르기: josa('협업', '을', '를')
  function josa(word, a, b) {
    const ch = String(word).replace(/[’'"」)\s]+$/, '').slice(-1); const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return word + a;
    return word + (code % 28 ? a : b);
  }
  function trigger(text, kw) {
    const words = [];
    Object.keys(TRIGGERS).forEach((w) => { if (TRIGGERS[w] === kw && text.includes(w)) words.push(w); });
    (App.keywords.get(kw).hints || []).forEach((h) => { if (text.includes(h) && !words.includes(h)) words.push(h); });
    return words[0] || '';
  }
  function why(text, kw) {
    const w = trigger(text, kw); const g = KW_GUIDE[kw];
    const want = g ? g.want : App.keywords.get(kw).desc;
    return w ? `${josa('‘' + w + '’', '이라는', '라는')} 표현은 ${josa(want, '을', '를')} 보고 싶다는 신호예요.` : `질문 의도상 ${josa(want, '이', '가')} 함께 드러나면 좋아요.`;
  }
  function highlight(text, words) {
    let html = esc(text);
    words.filter(Boolean).forEach((w) => { const ew = esc(w); html = html.split(ew).join(`<mark class="mt-mark">${ew}</mark>`); });
    return html;
  }

  // 질문이 직접 가리키는 키워드(‘갈등’, ‘주도’ 등)를 먼저, 그다음 질문 키워드 순서
  function focusKw(matched, qKws, text) {
    const explicit = (k) => Object.keys(TRIGGERS).some((w) => TRIGGERS[w] === k && text.includes(w));
    const rank = (k) => (explicit(k) ? -10 : 0) + (qKws.indexOf(k) < 0 ? 99 : qKws.indexOf(k));
    return matched.slice().sort((a, b) => rank(a) - rank(b))[0];
  }
  function tipFor(exp, matched, qKws, text) {
    const kw = focusKw(matched, qKws, text); const g = KW_GUIDE[kw];
    const part = g ? g.part : 'action';
    const lines = [g ? g.tip : '행동(A)에서 내가 직접 한 일을 중심으로 말해 보세요.'];
    const quote = (exp.star && exp.star[part]) || '';
    const res = (exp.star && exp.star.result) || '';
    if (res && !/\d/.test(res)) lines.push('결과(R)에 숫자를 하나만 더해도 설득력이 확 올라가요.');
    const empty = ['situation', 'task', 'action', 'result'].filter((k) => !(exp.star && exp.star[k]));
    if (empty.length) lines.push(`${empty.map((k) => PART_LABEL[k]).join('·')} 칸이 비어 있어요. 먼저 채워 두면 좋아요.`);
    return { part, quote, lines };
  }

  function outline(exp, kws, mode) {
    const s = exp.star || {}; const job = App.store.state.user.targetJob || '희망 직무';
    const kwTxt = kws.length ? kws.map((k, i) => (i < kws.length - 1 ? josa('‘' + k + '’', '과', '와') : '‘' + k + '’')).join(' ') : '제 강점';
    const sit = [s.situation, s.task].filter(Boolean).join(' ');
    return [
      ['도입', mode === 'interview'
        ? `결론부터 말씀드리면, 「${exp.title}」 경험으로 ${josa(kwTxt, '을', '를')} 보여 드릴 수 있습니다.`
        : `저는 「${exp.title}」 경험을 통해 ${kwTxt} 역량을 키웠습니다.${exp.summary ? ' ' + exp.summary : ''}`],
      ['상황', sit || '(상황·과제를 채워 주세요)'],
      ['행동', s.action || '(내가 한 행동을 채워 주세요)'],
      ['결과', s.result || '(결과를 채워 주세요. 숫자가 있으면 더 좋아요)'],
      ['직무 연결', `${exp.insights ? exp.insights + ' ' : ''}이 경험에서 키운 ${josa(kwTxt, '을', '를')} ${josa(job, '으로서', '로서')} 팀의 문제를 해결하는 데 살리겠습니다.`],
    ];
  }

  /* ---------- 상태 ---------- */
  const ui = { mode: 'essay', text: '', result: null, loading: false, open: {} };

  function scoreTone(n) { return n >= 75 ? 'high' : n >= 50 ? 'mid' : 'low'; }

  function recCard(r, i, kws) {
    const e = r.exp; const t = tipFor(e, r.matched, kws, ui.result.text); const isOpen = !!ui.open[e.id];
    const others = e.keywords.filter((k) => !r.matched.includes(k));
    return `<div class="card mt-rec" data-tone-score="${scoreTone(r.score)}">
      <div class="mt-rec-top">
        <span class="mt-rank">${i + 1}</span>
        <div class="mt-rec-head">
          <div class="mt-rec-meta">${App.ui.statusTag(e.status)}<span>${esc(e.category)}</span><span>·</span><span>${App.ui.period(e.period)}</span></div>
          <div class="mt-rec-title">${esc(e.title)}</div>
        </div>
        <div class="mt-score"><b>${r.score}<small>%</small></b><span>적합도</span></div>
      </div>
      <div class="mt-scorebar"><span style="width:${r.score}%"></span></div>
      <div class="mt-rec-kws">${r.matched.map((k) => App.ui.keywordChip(k)).join('')}${others.map((k) => `<span class="mt-kw-dim">${App.ui.keywordChip(k)}</span>`).join('')}</div>
      <div class="mt-tip"><div class="mt-tip-h"><span class="ai-dot">R</span>이렇게 연결해 보세요 <span class="mt-part">${PART_LABEL[t.part]} 강조</span></div>
        ${t.quote ? `<blockquote class="mt-quote">${esc(t.quote)}</blockquote>` : ''}
        <ul>${t.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
      <div class="mt-rec-actions">
        <a class="btn btn-sm" href="#/card/${esc(e.id)}">카드 보기</a>
        <button class="btn btn-sm ${isOpen ? '' : 'btn-primary'}" data-mt-outline="${esc(e.id)}" aria-expanded="${isOpen}">${isOpen ? '개요 접기' : '이 경험으로 개요 만들기'}</button>
      </div>
      ${isOpen ? outlinePanel(e, r.matched.length ? r.matched : kws) : ''}
    </div>`;
  }
  function outlinePanel(e, kws) {
    const rows = outline(e, kws, ui.mode);
    return `<div class="mt-outline">
      <div class="mt-outline-h"><b>${ui.mode === 'interview' ? '답변 흐름' : '자소서 개요'}</b><span class="subtle">카드의 STAR로 조립했어요. 표현은 내 말로 다듬어 주세요.</span>
        <button class="btn btn-sm" data-mt-copy="${esc(e.id)}">⧉ 복사</button></div>
      <ol>${rows.map(([k, v]) => `<li><span class="mt-ol-k">${k}</span><span class="mt-ol-v">${esc(v)}</span></li>`).join('')}</ol>
    </div>`;
  }

  function resultView() {
    if (ui.loading) {
      return `<div class="card mt-loading"><span class="ai-dot">R</span><div><b>질문을 읽고 있어요</b><div class="subtle">숨은 키워드를 찾고, 내 경험 카드와 맞춰 보는 중…</div></div>
        <div class="mt-dots"><i></i><i></i><i></i></div></div>`;
    }
    const r = ui.result;
    if (!r) {
      return `<div class="mt-empty"><div class="mt-empty-ico">⇄</div><b>질문을 넣으면 맞는 경험을 찾아 드려요</b>
        <p class="subtle">위의 예시 질문을 눌러 바로 체험해 볼 수도 있어요.</p></div>`;
    }
    const recs = r.recommendations.slice(0, 4);
    const strong = recs.filter((x) => x.score >= 50);
    const counts = App.keywords.counts();
    const missingKws = r.keywords.filter((k) => !counts[k]);
    const weak = !strong.length || strong.length < 2 || missingKws.length;
    const fresh = ui.fresh; ui.fresh = false;
    return `<div class="mt-result ${fresh ? 'mt-fresh' : ''}">
      <div class="card card-pad mt-kws">
        <div class="section-title" style="margin-bottom:6px">이 질문에 숨은 키워드</div>
        <p class="subtle" style="margin-bottom:12px">${ui.mode === 'interview' ? '면접관' : '평가자'}는 이 질문으로 아래 역량을 확인하고 싶어 해요.</p>
        <div class="mt-kw-list">${r.keywords.map((k) => `<div class="mt-kw-row">${App.ui.keywordChip(k, { size: 'lg' })}<span>${esc(why(r.text, k))}</span></div>`).join('')}</div>
        <div class="mt-q-echo">“${highlight(r.text, r.keywords.map((k) => trigger(r.text, k)))}”</div>
      </div>
      <div class="section-title mt-rec-title-row">추천 경험 <span class="subtle">${recs.length}개 · 적합도 순</span></div>
      ${recs.length ? `<div class="mt-recs">${recs.map((x, i) => recCard(x, i, r.keywords)).join('')}</div>`
        : '<div class="card empty"><div class="big">∅</div>이 키워드와 연결된 경험 카드가 아직 없어요.</div>'}
      ${weak ? `<div class="mt-nudge"><div class="mt-nudge-ico">✦</div><div class="mt-nudge-body">
          <b>보완하면 좋은 경험이 있어요</b>
          <span>${missingKws.length ? `${missingKws.map((k) => '#' + esc(k)).join(' ')} 경험이 아직 없어요. ` : ''}${!strong.length ? '적합도 50% 이상인 경험이 없어요. ' : strong.length < 2 ? '든든한 후보가 하나뿐이에요. ' : ''}질문 몇 개로 숨은 경험을 같이 찾아봐요.</span></div>
        <a class="btn btn-primary btn-sm" href="#/discover">경험 발굴하기</a></div>` : ''}
    </div>`;
  }

  function render() {
    const samples = window.SEED.sampleQuestions || [];
    return `<div class="page mt">
      <div class="page-head">
        <div class="row"><h1>자소서·면접 매칭</h1><span class="mt-beta">BETA</span></div>
        <p>질문을 붙여 넣으면 숨은 역량 키워드를 찾고, 쌓아 둔 경험 카드 중 가장 잘 맞는 것을 골라 드려요.</p>
      </div>
      <div class="card mt-input">
        <div class="mt-tabs" role="tablist">
          <button role="tab" class="${ui.mode === 'essay' ? 'on' : ''}" data-mt-mode="essay" aria-selected="${ui.mode === 'essay'}">자소서 문항</button>
          <button role="tab" class="${ui.mode === 'interview' ? 'on' : ''}" data-mt-mode="interview" aria-selected="${ui.mode === 'interview'}">면접 질문</button>
        </div>
        <textarea class="textarea mt-ta" id="mt-ta" maxlength="600" placeholder="${ui.mode === 'interview' ? '예) 팀원과 의견이 달랐을 때 어떻게 해결했나요?' : '예) 팀 프로젝트에서 갈등을 해결한 경험을 구체적으로 서술해 주세요. (500자)'}">${esc(ui.text)}</textarea>
        <div class="mt-samples"><span class="subtle">예시</span>${samples.map((q, i) => `<button class="mt-sample" data-mt-sample="${i}">${esc(q)}</button>`).join('')}</div>
        <div class="mt-input-foot"><span class="subtle" id="mt-count">${ui.text.length}/600</span>
          <button class="btn btn-primary" data-mt="analyze" ${ui.loading ? 'disabled' : ''}>✦ 분석하기</button></div>
      </div>
      <div id="mt-result">${resultView()}</div>
    </div>`;
  }

  App.screens.match = {
    title: '자소서·면접 매칭',
    render(params) { if (params && params.q && params.q !== ui.text) { ui.text = params.q; ui.result = null; } return render(); },
    mount(root, params) {
      let alive = true;
      const drawResult = () => { const el = root.querySelector('#mt-result'); if (el) el.innerHTML = resultView(); };
      async function analyze() {
        const ta = root.querySelector('#mt-ta'); const text = (ta.value || '').trim();
        if (!text) { App.ui.toast('분석할 질문을 입력해 주세요'); ta.focus(); return; }
        ui.text = text; ui.loading = true; ui.open = {};
        const btn = root.querySelector('[data-mt=analyze]'); if (btn) btn.disabled = true;
        drawResult();
        await App.ai.think(900);
        if (!alive) return;
        const res = App.ai.analyzeQuestion(text);
        ui.result = Object.assign({ text }, res); ui.loading = false; ui.fresh = true;
        if (btn) btn.disabled = false;
        drawResult();
        const el = root.querySelector('#mt-result'); if (el && window.innerWidth < 900) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const onClick = async (ev) => {
        const m = ev.target.closest('[data-mt-mode]');
        if (m) { ui.text = root.querySelector('#mt-ta').value; ui.mode = m.getAttribute('data-mt-mode'); root.innerHTML = render(); return; }
        const s = ev.target.closest('[data-mt-sample]');
        if (s) { const q = window.SEED.sampleQuestions[+s.getAttribute('data-mt-sample')]; const ta = root.querySelector('#mt-ta'); ta.value = q; ui.text = q; root.querySelector('#mt-count').textContent = `${q.length}/600`; analyze(); return; }
        if (ev.target.closest('[data-mt=analyze]')) { analyze(); return; }
        const o = ev.target.closest('[data-mt-outline]');
        if (o) { const id = o.getAttribute('data-mt-outline'); ui.open[id] = !ui.open[id]; drawResult(); return; }
        const c = ev.target.closest('[data-mt-copy]');
        if (c) {
          const exp = App.store.get(c.getAttribute('data-mt-copy')); if (!exp || !ui.result) return;
          const rec = ui.result.recommendations.find((x) => x.exp.id === exp.id);
          const rows = outline(exp, rec && rec.matched.length ? rec.matched : ui.result.keywords, ui.mode);
          const txt = `[${ui.result.text}]\n\n` + rows.map(([k, v]) => `■ ${k}\n${v}`).join('\n\n');
          try { await navigator.clipboard.writeText(txt); App.ui.toast('개요를 복사했어요'); }
          catch (e) { App.ui.toast('복사하지 못했어요. 직접 선택해서 복사해 주세요'); }
        }
      };
      const onInput = (ev) => {
        if (ev.target.id !== 'mt-ta') return;
        ui.text = ev.target.value; const c = root.querySelector('#mt-count'); if (c) c.textContent = `${ev.target.value.length}/600`;
      };
      const onKey = (ev) => { if (ev.target.id === 'mt-ta' && ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) analyze(); };
      root.addEventListener('click', onClick);
      root.addEventListener('input', onInput);
      root.addEventListener('keydown', onKey);
      if (params && params.q && (!ui.result || ui.result.text !== params.q)) analyze();
      return () => { alive = false; root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('keydown', onKey); };
    },
  };
})(window.App);
