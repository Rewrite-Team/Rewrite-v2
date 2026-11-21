/* 지원 기업 상세 — 자소서 탭 (.ae-*)
   기업(+직무)마다 자소서 문항을 관리하고, 문항별로 숨은 역량 → 경험 추천(기업 요구 역량 가산) → 연결 → 개요까지. */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  /* ---------- 문항 해석 가이드 (구 #/match 로직 재사용) ---------- */
  const KW_GUIDE = {
    '협업': { want: '혼자가 아니라 팀 안에서 어떤 역할로 기여했는지', part: 'action', tip: '행동(A)에서 팀원과 무엇을 맞췄고, 내가 맡은 몫이 무엇이었는지 나눠서 써 보세요.' },
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
    '의사결정': { want: '선택지를 비교하고 결정한 기준', part: 'action', tip: '행동(A)에서 다른 선택지와 버린 이유까지 쓰면 판단력이 드러나요.' },
    '끈기': { want: '어려움 앞에서 포기하지 않은 과정', part: 'situation', tip: '상황(S)의 어려움을 충분히 보여 준 뒤, 다시 시도한 행동을 이어 주세요.' },
    '창의성': { want: '기존과 다르게 시도한 방법', part: 'action', tip: '행동(A)에서 기존 방식과 무엇이 달랐는지 대비해서 써 보세요.' },
  };
  const PART_LABEL = { situation: '상황(S)', task: '과제(T)', action: '행동(A)', result: '결과(R)' };
  const TRIGGERS = { '갈등': '갈등조정', '주도': '주도성', '실패': '끈기', '새로운 기술': '학습능력', '고객': '고객지향', '사용자': '고객지향', '개선': '문제해결', '지원 동기': '주도성', '목표': '주도성' };

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
    return w ? `${josa('‘' + w + '’', '이라는', '라는')} 표현은 ${josa(want, '을', '를')} 보고 싶다는 신호예요.` : `문항 의도상 ${josa(want, '이', '가')} 함께 드러나면 좋아요.`;
  }
  function highlight(text, words) {
    let html = esc(text);
    words.filter(Boolean).forEach((w) => { const ew = esc(w); html = html.split(ew).join(`<mark class="ae-mark">${ew}</mark>`); });
    return html;
  }
  function kwList(kws) {
    return kws.map((k, i) => (i < kws.length - 1 ? josa('‘' + k + '’', '과', '와') : '‘' + k + '’')).join(' ');
  }

  /* ---------- 기업 맥락 ---------- */
  const compNames = (app) => (app.competencies || []).map((c) => c.name);
  const compOf = (app, name) => (app.competencies || []).find((c) => c.name === name) || null;
  const expOf = (id) => (id ? App.store.get(id) : null);

  // 저장된 문항 키워드 기준 추천 (core analyzeQuestion 과 같은 점수식, 기업 요구 역량 가산)
  function recommend(q, app) {
    const kws = q.keywords || []; const focus = compNames(app);
    return App.store.state.experiences.map((e) => {
      const hit = e.keywords.filter((k) => kws.includes(k)).length;
      const fhit = e.keywords.filter((k) => focus.includes(k) && !kws.includes(k)).length;
      const score = Math.min(98, Math.round(hit * 30 + fhit * 6 + e.completeness * 0.35 + (e.status === 'done' ? 6 : 0)));
      const companyKws = e.keywords.filter((k) => focus.includes(k));
      return { exp: e, score, matched: e.keywords.filter((k) => kws.includes(k)), companyKws };
    }).filter((r) => r.matched.length).sort((a, b) => b.score - a.score);
  }

  // 같은 경험이 여러 문항에 쓰였는지: { expId: [문항 번호...] }
  function usage(app) {
    const m = {};
    (app.essays || []).forEach((q, i) => { if (q.expId && expOf(q.expId)) (m[q.expId] = m[q.expId] || []).push(i + 1); });
    return m;
  }

  function tipFor(exp, matched, q) {
    const kws = q.keywords || []; const text = q.text;
    const explicit = (k) => Object.keys(TRIGGERS).some((w) => TRIGGERS[w] === k && text.includes(w));
    const rank = (k) => (explicit(k) ? -10 : 0) + (kws.indexOf(k) < 0 ? 99 : kws.indexOf(k));
    const kw = matched.slice().sort((a, b) => rank(a) - rank(b))[0]; const g = KW_GUIDE[kw];
    const part = g ? g.part : 'action';
    const lines = [g ? g.tip : '행동(A)에서 내가 직접 한 일을 중심으로 써 보세요.'];
    const st = exp.star || {};
    if (st.result && !/\d/.test(st.result)) lines.push('결과(R)에 숫자를 하나만 더해도 설득력이 확 올라가요.');
    const empty = ['situation', 'task', 'action', 'result'].filter((k) => !st[k]);
    if (empty.length) lines.push(`${empty.map((k) => PART_LABEL[k]).join('·')} 칸이 비어 있어요. 경험 페이지에서 먼저 채워 두면 좋아요.`);
    return { part, quote: st[part] || '', lines };
  }

  // 개요: 도입 / 상황 / 행동 / 결과 / 직무 연결 (기업·직무·요구 역량 이유 반영)
  function outline(exp, q, app) {
    const b = App.ai.starBrief(exp);
    const qk = q.keywords || [];
    const used = qk.filter((k) => exp.keywords.includes(k));
    const kws = used.length ? used : qk.length ? qk : exp.keywords.slice(0, 2);
    const kwTxt = kws.length ? kwList(kws) : '제 강점';
    // 기업이 원하는 역량 중 이 문항·경험과 닿는 것 (가중치 순)
    const comps = (app.competencies || []).filter((c) => kws.includes(c.name) || exp.keywords.includes(c.name))
      .sort((x, y) => y.weight - x.weight).slice(0, 2);
    const job = (app.job || App.store.state.user.targetJob || '지원 직무').replace(/\s*\(.*?\)\s*/g, '').trim() || '지원 직무';
    let link;
    if (comps.length) {
      const reasons = comps.filter((c) => c.reason).map((c) => `‘${c.reason}’`);
      const names = kwList(comps.map((c) => c.name));
      link = reasons.length
        ? `${app.company} ${job} 직무에는 ${josa(reasons.join(', '), '이', '가')} 중요하다고 생각합니다. 이 경험에서 키운 ${josa(names, '을', '를')} 바탕으로 ${app.company}에서도 같은 방식으로 기여하겠습니다.`
        : `이 경험에서 키운 ${josa(names, '을', '를')} ${app.company} ${josa(job, '으로서', '로서')} 살리겠습니다.`;
    } else {
      link = `이 경험에서 키운 ${josa(kwTxt, '을', '를')} ${app.company} ${josa(job, '으로서', '로서')} 팀의 문제를 해결하는 데 살리겠습니다.`;
    }
    return [
      ['도입', `저는 「${exp.title}」 경험을 통해 ${kwTxt} 역량을 키웠습니다.`],
      ['상황', b.situation || '(경험의 상황·과제를 채워 주세요)'],
      ['행동', b.action || '(내가 한 행동을 채워 주세요)'],
      ['결과', b.result || '(결과를 채워 주세요. 숫자가 있으면 더 좋아요)'],
      ['직무 연결', (b.insight ? b.insight + ' ' : '') + link],
    ];
  }

  /* ---------- 모듈 상태 (탭 전환·refresh 사이에 유지) ---------- */
  const ui = { appId: null, open: {}, adding: false, draft: '', draftLimit: '800', editing: null, busy: false, fresh: null };
  function syncApp(app) {
    if (ui.appId !== app.id) Object.assign(ui, { appId: app.id, open: {}, adding: false, draft: '', draftLimit: '800', editing: null, busy: false, fresh: null });
  }

  function scoreTone(n) { return n >= 75 ? 'high' : n >= 50 ? 'mid' : 'low'; }

  function kwChips(q, app) {
    const req = compNames(app);
    if (!(q.keywords || []).length) return '<span class="subtle">키워드 분석 전이에요</span>';
    return q.keywords.map((k) => req.includes(k)
      ? `<span class="ae-kw-req" title="${esc(app.company)}의 요구 역량">${App.ui.keywordChip(k)}<i aria-label="요구 역량">★</i></span>`
      : App.ui.keywordChip(k)).join('');
  }

  function linkedRow(q, use) {
    const e = expOf(q.expId);
    if (!e) {
      return `<div class="ae-link ae-link-empty"><span class="ae-link-ico">＋</span><span>경험을 연결하세요</span>
        <span class="subtle ae-link-hint">${ui.open[q.id] ? '아래 추천에서 골라 주세요' : 'AI 추천을 열어 골라 보세요'}</span></div>`;
    }
    const others = (use[e.id] || []).length > 1;
    return `<div class="ae-link ${others ? 'is-dup' : ''}">
      <span class="ae-link-ico ok">✓</span>
      <div class="ae-link-body">
        <a class="ae-link-title" href="#/card/${esc(e.id)}">${esc(e.title)}</a>
        <div class="ae-link-meta"><span>완성도 ${e.completeness}%</span>${App.ui.progress(e.completeness)}</div>
      </div>
      <button class="btn btn-sm btn-ghost" data-ae-unlink="${esc(q.id)}">연결 해제</button>
    </div>`;
  }

  function hiddenPanel(q, app) {
    const kws = q.keywords || [];
    if (!kws.length) return '';
    return `<div class="ae-sec">
      <div class="ae-sec-h"><span class="ai-dot">R</span><b>이 문항에 숨은 역량</b></div>
      <div class="ae-why-list">${kws.map((k) => {
        const c = compOf(app, k);
        return `<div class="ae-why">${App.ui.keywordChip(k, { size: 'lg' })}<div>
          <span>${esc(why(q.text, k))}</span>
          ${c ? `<span class="ae-why-co">★ ${esc(app.company)}도 원하는 역량이에요${c.reason ? ` — ‘${esc(c.reason)}’` : ''}</span>` : ''}
        </div></div>`;
      }).join('')}</div>
      <div class="ae-echo">“${highlight(q.text, kws.map((k) => trigger(q.text, k)))}”</div>
    </div>`;
  }

  function recCard(r, i, q, app, use) {
    const e = r.exp; const linked = q.expId === e.id; const t = tipFor(e, r.matched, q);
    const others = e.keywords.filter((k) => !r.matched.includes(k));
    const coKw = r.companyKws.filter((k) => !r.matched.includes(k));
    const coAll = r.companyKws;
    const usedIn = (use[e.id] || []).filter((n) => app.essays[n - 1] && app.essays[n - 1].id !== q.id);
    return `<div class="ae-rec ${linked ? 'is-linked' : ''}" data-score="${scoreTone(r.score)}">
      <div class="ae-rec-top">
        <span class="ae-rank">${i + 1}</span>
        <div class="ae-rec-head">
          <div class="ae-rec-meta">${App.ui.statusTag(e.status)}<span>${esc(e.category)}</span>${usedIn.length ? `<span class="ae-used">${usedIn.join('·')}번 문항에 사용 중</span>` : ''}</div>
          <div class="ae-rec-title">${esc(e.title)}</div>
        </div>
        <div class="ae-score"><b>${r.score}<small>%</small></b><span>적합도</span></div>
      </div>
      <div class="ae-scorebar"><span style="width:${r.score}%"></span></div>
      <div class="ae-rec-kws">${r.matched.map((k) => App.ui.keywordChip(k)).join('')}${others.map((k) => `<span class="ae-kw-dim">${App.ui.keywordChip(k)}</span>`).join('')}</div>
      ${coAll.length ? `<div class="ae-co-note">★ ${coKw.length ? `이 기업이 원하는 ${esc(josa(coKw.map((k) => '#' + k).join(' '), '과도', '와도'))} 맞아요` : `이 기업이 원하는 ${coAll.map((k) => '#' + esc(k)).join(' ')} 역량이 담겨 있어요`}</div>` : ''}
      <details class="ae-tip"><summary><span>이렇게 연결해 보세요</span><span class="ae-part">${PART_LABEL[t.part]} 강조</span></summary>
        ${t.quote ? `<blockquote class="ae-quote">${esc(t.quote)}</blockquote>` : ''}
        <ul>${t.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details>
      <div class="ae-rec-actions">
        <a class="btn btn-sm btn-ghost" href="#/card/${esc(e.id)}">경험 페이지 보기</a>
        ${linked ? '<span class="ae-linked-tag">✓ 이 문항에 연결됨</span>'
          : `<button class="btn btn-sm btn-primary" data-ae-use="${esc(q.id)}" data-exp="${esc(e.id)}">이 경험으로 쓰기</button>`}
      </div>
    </div>`;
  }

  function recsPanel(q, app, use) {
    const all = recommend(q, app);
    let recs = all.slice(0, 3);
    const li = all.findIndex((r) => r.exp.id === q.expId);
    if (li >= 3) recs = recs.concat(all[li]);
    const best = all.length ? all[0].score : 0;
    const kw = (q.keywords || [])[0] || compNames(app)[0] || '';
    const nudge = best < 50 ? `<div class="ae-nudge"><span class="ae-nudge-ico">✦</span><div class="ae-nudge-body">
        <b>${all.length ? '딱 맞는 경험이 아직 부족해요' : '이 역량을 보여 줄 경험이 아직 없어요'}</b>
        <span>${all.length ? '적합도 50% 이상인 경험이 없어요. ' : ''}${kw ? `#${esc(kw)} 경험을 ` : '경험을 '}질문 몇 개로 같이 찾아봐요.</span></div>
        <a class="btn btn-sm btn-primary" href="#/ask/new?mode=deep${kw ? '&kw=' + encodeURIComponent(kw) : ''}">✦ 경험 정리하기</a></div>` : '';
    return `<div class="ae-sec">
      <div class="ae-sec-h"><b>추천 경험</b><span class="subtle">${all.length ? `${recs.length}개 · 적합도 순 · ${esc(app.company)} 요구 역량 반영` : ''}</span></div>
      ${recs.length ? `<div class="ae-recs">${recs.map((r, i) => recCard(r, all.indexOf(r), q, app, use)).join('')}</div>` : ''}
      ${nudge}
    </div>`;
  }

  function outlinePanel(q, app) {
    const e = expOf(q.expId); if (!e) return '';
    const rows = outline(e, q, app);
    const len = rows.reduce((n, r) => n + r[1].length, 0);
    return `<div class="ae-sec ae-outline">
      <div class="ae-sec-h"><b>자소서 개요</b><span class="subtle">${esc(e.title.split(' — ')[0])} · 경험의 STAR로 조립했어요</span>
        <button class="btn btn-sm" data-ae-copy="${esc(q.id)}">⧉ 복사</button></div>
      <ol>${rows.map(([k, v]) => `<li><span class="ae-ol-k">${k}</span><span class="ae-ol-v">${esc(v)}</span></li>`).join('')}</ol>
      ${q.limit ? `<div class="ae-len subtle">개요 약 ${len}자 · 제한 ${q.limit}자 — 행동과 결과에 살을 붙여 ${Math.round(q.limit * 0.9)}자 안팎으로 맞춰 보세요. 표현은 내 말로 다듬어 주세요.</div>` : ''}
    </div>`;
  }

  function editForm(q) {
    return `<div class="ae-form" data-ae-form="edit">
      <label class="label" for="ae-edit-text">문항</label>
      <textarea class="textarea" id="ae-edit-text" maxlength="500">${esc(q.text)}</textarea>
      <div class="ae-form-row">
        <label class="ae-limit"><span class="label">글자 수 제한</span><input class="input" id="ae-edit-limit" type="number" min="0" step="50" inputmode="numeric" value="${esc(q.limit || '')}" placeholder="없음"></label>
        <div class="ae-form-btns"><button class="btn btn-sm" data-ae="edit-cancel">취소</button><button class="btn btn-sm btn-primary" data-ae-save="${esc(q.id)}">저장</button></div>
      </div>
    </div>`;
  }

  function qCard(q, i, app, use) {
    const open = !!ui.open[q.id]; const editing = ui.editing === q.id;
    const dup = q.expId && (use[q.expId] || []).length > 1;
    const fresh = ui.fresh === q.id;
    return `<article class="card ae-q ${open ? 'is-open' : ''} ${q.expId && expOf(q.expId) ? 'is-done' : ''} ${fresh ? 'ae-fresh' : ''}" data-q="${esc(q.id)}">
      <div class="ae-q-top">
        <span class="ae-num">${i + 1}</span>
        <div class="ae-q-main">
          ${editing ? editForm(q) : `<div class="ae-q-text">${esc(q.text)}</div>
          <div class="ae-q-meta"><span class="ae-limit-tag">${q.limit ? `${Number(q.limit).toLocaleString()}자 이내` : '글자 수 제한 없음'}</span>${kwChips(q, app)}</div>`}
        </div>
        ${editing ? '' : `<div class="ae-q-tools">
          <button class="ae-icon-btn" data-ae-edit="${esc(q.id)}" title="문항 수정" aria-label="문항 수정">✎</button>
          <button class="ae-icon-btn" data-ae-del="${esc(q.id)}" title="문항 삭제" aria-label="문항 삭제">🗑</button>
        </div>`}
      </div>
      ${linkedRow(q, use)}
      ${dup ? `<div class="ae-dup">${use[q.expId].join('·')}번 문항에 같은 경험을 연결했어요</div>` : ''}
      <button class="ae-toggle" data-ae-toggle="${esc(q.id)}" aria-expanded="${open}">
        <span class="ai-dot">R</span>${open ? 'AI 분석 접기' : (q.expId && expOf(q.expId) ? 'AI 분석 · 개요 보기' : 'AI 추천 경험 보기')}<span class="ae-chev">${open ? '▴' : '▾'}</span></button>
      ${open ? `<div class="ae-panel">
        ${hiddenPanel(q, app)}
        ${recsPanel(q, app, use)}
        ${outlinePanel(q, app)}
        <div class="ae-sec ae-memo">
          <label class="ae-sec-h" for="ae-note-${esc(q.id)}"><b>메모</b><span class="subtle ae-saved" data-ae-saved="${esc(q.id)}"></span></label>
          <textarea class="textarea" id="ae-note-${esc(q.id)}" data-ae-note="${esc(q.id)}" placeholder="강조할 수치, 넣고 싶은 표현 등을 적어 두세요">${esc(q.note || '')}</textarea>
        </div>
      </div>` : ''}
    </article>`;
  }

  function sampleChips(mode) {
    return (window.SEED.sampleQuestions || []).map((s, i) => `<button class="ae-sample" data-ae-sample="${i}" data-mode="${mode}" title="${esc(s)}">＋ ${esc(s)}</button>`).join('');
  }

  function addForm() {
    if (!ui.adding) return '';
    return `<div class="card ae-form ae-add" data-ae-form="add">
      <label class="label" for="ae-add-text">새 문항</label>
      <textarea class="textarea" id="ae-add-text" maxlength="500" placeholder="예) 팀 프로젝트에서 갈등을 해결한 경험을 작성해 주세요.">${esc(ui.draft)}</textarea>
      <div class="ae-samples"><span class="subtle">예시</span>${sampleChips('fill')}</div>
      <div class="ae-form-row">
        <label class="ae-limit"><span class="label">글자 수 제한</span><input class="input" id="ae-add-limit" type="number" min="0" step="50" inputmode="numeric" value="${esc(ui.draftLimit)}" placeholder="없음"></label>
        <div class="ae-form-btns"><button class="btn btn-sm" data-ae="add-cancel">취소</button>
          <button class="btn btn-sm btn-primary" data-ae="add-save" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '숨은 역량 찾는 중…' : '✦ 추가하고 분석하기'}</button></div>
      </div>
    </div>`;
  }

  function render(app) {
    app = App.store.getApp(app.id) || app; syncApp(app);
    const qs = app.essays || []; const use = usage(app);
    const done = qs.filter((q) => q.expId && expOf(q.expId)).length;
    const pct = qs.length ? Math.round(done / qs.length * 100) : 0;
    const dups = Object.keys(use).filter((id) => use[id].length > 1);
    const head = `<div class="ae-head">
      <div class="ae-head-txt">
        <h2>${esc(app.company)} 자소서 <span>문항 ${qs.length}개 · 경험 연결 ${done}/${qs.length}</span></h2>
        ${qs.length ? `<div class="ae-head-prog">${App.ui.progress(pct)}</div>` : ''}
      </div>
      ${ui.adding ? '' : '<button class="btn btn-primary btn-sm" data-ae="add-open">＋ 문항 추가</button>'}
    </div>`;
    const warn = dups.length ? `<div class="ae-warn"><span>!</span><div>${dups.map((id) => {
      const e = expOf(id); return `<div><b>${esc(e.title.split(' — ')[0])}</b> 경험이 ${use[id].join('·')}번 문항에 함께 쓰였어요.</div>`;
    }).join('')}<div class="subtle">같은 경험이 두 문항에 쓰였어요. 다른 경험도 고려해 보세요.</div></div></div>` : '';
    const body = qs.length
      ? `<div class="ae-list">${qs.map((q, i) => qCard(q, i, app, use)).join('')}</div>`
      : (ui.adding ? '' : `<div class="card ae-empty">
          <div class="ae-empty-ico">✎</div>
          <b>${esc(app.company)} 자소서 문항을 넣어 주세요</b>
          <p class="subtle">문항마다 숨은 역량을 찾고, ${esc(josa(app.company, '이', '가'))} 원하는 역량까지 고려해서<br>쌓아 둔 경험 중 가장 잘 맞는 것을 골라 드려요.</p>
          <div class="ae-samples ae-samples-wrap">${sampleChips('add')}</div>
          <button class="btn btn-primary" data-ae="add-open">＋ 직접 입력하기</button>
        </div>`);
    return `<div class="ae">${head}${addForm()}${warn}${body}</div>`;
  }

  App.applyTabs = App.applyTabs || {};
  App.applyTabs.essay = {
    label: '자소서',
    render,
    mount(el, app, ctx) {
      const appId = app.id; let alive = true;
      const cur = () => App.store.getApp(appId);
      const redraw = () => { const a = cur(); if (a) el.innerHTML = render(a); };
      const refresh = () => { if (ctx && typeof ctx.refresh === 'function') ctx.refresh(); else redraw(); };
      const focusTop = (sel) => { const t = el.querySelector(sel); if (t) { t.focus(); } };

      async function addQuestion(text, limit) {
        const a = cur(); if (!a || ui.busy) return;
        text = String(text || '').trim();
        if (!text) { App.ui.toast('문항을 입력해 주세요'); focusTop('#ae-add-text'); return; }
        ui.busy = true; if (ui.adding) redraw();
        await App.ai.think(650);
        if (!alive) { ui.busy = false; return; }
        const res = App.ai.analyzeQuestion(text, { focus: compNames(a) });
        const lim = parseInt(limit, 10);
        const it = App.store.addAppItem(appId, 'essays', { text, limit: lim > 0 ? lim : null, keywords: res.keywords, expId: null, note: '' });
        Object.assign(ui, { busy: false, adding: false, draft: '', draftLimit: '800', fresh: it ? it.id : null });
        if (it) ui.open[it.id] = true;
        App.ui.toast(`숨은 역량을 찾았어요: ${res.keywords.map((k) => '#' + k).join(' ')}`);
        refresh();
        setTimeout(() => {
          ui.fresh = null;
          const card = it && el.querySelector(`[data-q="${it.id}"]`);
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 30);
      }

      function saveNote(id, value) {
        const a = cur(); const q = a && a.essays.find((x) => x.id === id); if (!q) return;
        if ((q.note || '') === value) return;
        App.store.updateAppItem(appId, 'essays', id, { note: value });
        const s = el.querySelector(`[data-ae-saved="${id}"]`); if (s) { s.textContent = '저장했어요'; setTimeout(() => { if (s.isConnected) s.textContent = ''; }, 1800); }
      }

      const onClick = async (ev) => {
        const t = ev.target;
        const act = t.closest('[data-ae]'); const a = cur(); if (!a) return;
        if (act) {
          const k = act.getAttribute('data-ae');
          if (k === 'add-open') { ui.adding = true; redraw(); focusTop('#ae-add-text'); return; }
          if (k === 'add-cancel') { Object.assign(ui, { adding: false, draft: '', draftLimit: '800' }); redraw(); return; }
          if (k === 'add-save') { addQuestion(el.querySelector('#ae-add-text').value, el.querySelector('#ae-add-limit').value); return; }
          if (k === 'edit-cancel') { ui.editing = null; redraw(); return; }
        }
        const s = t.closest('[data-ae-sample]');
        if (s) {
          const text = window.SEED.sampleQuestions[+s.getAttribute('data-ae-sample')];
          if (s.getAttribute('data-mode') === 'fill') {
            const ta = el.querySelector('#ae-add-text'); if (ta) { ta.value = text; ui.draft = text; ta.focus(); }
          } else addQuestion(text, 800);
          return;
        }
        const tg = t.closest('[data-ae-toggle]');
        if (tg) { const id = tg.getAttribute('data-ae-toggle'); ui.open[id] = !ui.open[id]; redraw(); return; }
        const use = t.closest('[data-ae-use]');
        if (use) {
          const qid = use.getAttribute('data-ae-use'); const eid = use.getAttribute('data-exp');
          App.store.updateAppItem(appId, 'essays', qid, { expId: eid });
          const n = usage(cur())[eid] || [];
          App.ui.toast(n.length > 1 ? '연결했어요. 다른 문항에도 쓰인 경험이에요' : '이 경험으로 연결했어요. 아래 개요를 확인해 보세요');
          refresh();
          setTimeout(() => { const o = el.querySelector(`[data-q="${qid}"] .ae-outline`); if (o) o.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 30);
          return;
        }
        const un = t.closest('[data-ae-unlink]');
        if (un) { App.store.updateAppItem(appId, 'essays', un.getAttribute('data-ae-unlink'), { expId: null }); App.ui.toast('연결을 해제했어요'); refresh(); return; }
        const ed = t.closest('[data-ae-edit]');
        if (ed) { ui.editing = ed.getAttribute('data-ae-edit'); redraw(); focusTop('#ae-edit-text'); return; }
        const sv = t.closest('[data-ae-save]');
        if (sv) {
          const id = sv.getAttribute('data-ae-save'); const q = a.essays.find((x) => x.id === id); if (!q) return;
          const text = el.querySelector('#ae-edit-text').value.trim(); const lim = parseInt(el.querySelector('#ae-edit-limit').value, 10);
          if (!text) { App.ui.toast('문항을 입력해 주세요'); return; }
          const patch = { text, limit: lim > 0 ? lim : null };
          if (text !== q.text) patch.keywords = App.ai.analyzeQuestion(text, { focus: compNames(a) }).keywords;
          App.store.updateAppItem(appId, 'essays', id, patch); ui.editing = null;
          App.ui.toast(patch.keywords ? '문항을 수정하고 숨은 역량을 다시 찾았어요' : '문항을 수정했어요');
          redraw(); return;
        }
        const del = t.closest('[data-ae-del]');
        if (del) {
          const id = del.getAttribute('data-ae-del'); const idx = a.essays.findIndex((x) => x.id === id); if (idx < 0) return;
          App.ui.modal({
            title: `${idx + 1}번 문항을 삭제할까요?`,
            body: `<p class="ae-modal-q">${esc(a.essays[idx].text)}</p><p class="subtle">연결한 경험과 메모도 함께 지워져요. 경험 자체는 경험 위키에 그대로 남아요.</p>`,
            confirmText: '삭제', danger: true,
            onConfirm: () => { App.store.removeAppItem(appId, 'essays', id); delete ui.open[id]; App.ui.toast('문항을 삭제했어요'); refresh(); },
          });
          return;
        }
        const cp = t.closest('[data-ae-copy]');
        if (cp) {
          const q = a.essays.find((x) => x.id === cp.getAttribute('data-ae-copy')); const e = q && expOf(q.expId); if (!e) return;
          const rows = outline(e, q, a);
          const txt = `[${a.company} · ${q.text}${q.limit ? ` (${q.limit}자)` : ''}]\n\n` + rows.map(([k, v]) => `■ ${k}\n${v}`).join('\n\n');
          try { await navigator.clipboard.writeText(txt); App.ui.toast('개요를 복사했어요'); }
          catch (err) { App.ui.toast('복사하지 못했어요. 직접 선택해서 복사해 주세요'); }
        }
      };
      const onInput = (ev) => {
        if (ev.target.id === 'ae-add-text') ui.draft = ev.target.value;
        else if (ev.target.id === 'ae-add-limit') ui.draftLimit = ev.target.value;
      };
      const onBlur = (ev) => { const n = ev.target.getAttribute && ev.target.getAttribute('data-ae-note'); if (n) saveNote(n, ev.target.value); };
      const onKey = (ev) => {
        if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
          if (ev.target.id === 'ae-add-text' || ev.target.id === 'ae-add-limit') { ev.preventDefault(); addQuestion(el.querySelector('#ae-add-text').value, el.querySelector('#ae-add-limit').value); }
          else if (ev.target.id === 'ae-edit-text' || ev.target.id === 'ae-edit-limit') { const b = el.querySelector('[data-ae-save]'); if (b) b.click(); }
        } else if (ev.key === 'Escape') {
          if (ui.editing && ev.target.closest('[data-ae-form="edit"]')) { ui.editing = null; redraw(); }
          else if (ui.adding && ev.target.closest('[data-ae-form="add"]')) { ui.adding = false; redraw(); }
        }
      };
      el.addEventListener('click', onClick);
      el.addEventListener('input', onInput);
      el.addEventListener('focusout', onBlur);
      el.addEventListener('keydown', onKey);
      return () => {
        alive = false; ui.busy = false;
        // 떠나기 전 작성 중이던 메모 저장
        el.querySelectorAll('[data-ae-note]').forEach((ta) => saveNote(ta.getAttribute('data-ae-note'), ta.value));
        el.removeEventListener('click', onClick); el.removeEventListener('input', onInput);
        el.removeEventListener('focusout', onBlur); el.removeEventListener('keydown', onKey);
      };
    },
  };
})(window.App);
