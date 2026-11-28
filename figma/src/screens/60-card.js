/* 경험 카드 (#/card/:id, prototype/js/screens/card.js + css/screens/card.css)
   머리 → 이력서 한 줄 → STAR → 회고 → 근거. 1차 범위라 「쓰인 곳」은 그리지 않는다.
   이 파일의 컴포넌트: Card/Write footer (직접 쓰는 칸의 저장 줄), Card/STAR row. 근거는 공용 evidence() */

{ // 이 파일의 이름이 다른 화면 파일과 겹치지 않도록 한 스코프에 둔다

/* ---------- 내용: 앱의 예시 데이터 그대로 ---------- */
// e1 (data.js, 이력서 한 줄은 seed-lines.js, 근거는 seed-repos.js 의 moyeobom 'jpa_fetch_join')
const CD_J = 'src/main/java/com/moyeobom';
const CD_E1 = {
  project: '모여봄', title: '검색 API 응답 속도 개선 (N+1)', period: '2026.10', role: '백엔드 (검색 API 담당)', source: 'chat',
  keywords: ['문제 해결력', '분석적 사고', '학습능력'],
  line: '모임 검색 API의 N+1 쿼리를 fetch join과 복합 인덱스로 해결해 평균 응답 시간 1.8s → 0.3s 단축',
  star: {
    situation: '4인 팀 프로젝트 「모여봄」에서 프론트 팀원이 모임 검색 화면이 버벅인다고 알려 줌. 검색 한 번에 1.8초가 걸렸음.',
    task: '검색 API 담당으로서 원인을 찾고 응답 속도를 개선해야 했음.',
    action: '감으로 고치지 않고 쿼리 로그부터 확인해 N+1 문제를 발견함. fetch join으로 쿼리를 묶고, 검색 조건으로 가장 많이 쓰는 지역·카테고리 컬럼에 인덱스를 추가한 뒤 EXPLAIN으로 풀 스캔이 사라진 것을 확인함. 페이징과 함께 쓸 때 생긴 경고는 컬렉션 조회만 batch size로 따로 처리함.',
    result: '검색 API 평균 응답시간 1.8s → 0.3s.',
  },
  retro: '다음에 성능 문제를 만나면 바로 고치려 들지 말고 쿼리 로그부터 볼 것. 페이징 경고는 나중에 다시 공부하기.',
  evidence: {
    repo: 'moyeobom-team/moyeobom-backend', sample: true,
    commits: [['a1f4c2e', 'fix: 모임 검색 N+1을 fetch join으로 해결', '10월 2일'], ['7be09d1', 'perf: 지역·카테고리·시작일 복합 인덱스 추가', '10월 2일'], ['5c3a8f0', 'fix: 컬렉션 조회는 batch size로 분리', '10월 3일']],
    prs: [['#31', '검색 API N+1 문제 해결 및 인덱스 추가', '10월 3일']],
    files: [
      { path: `${CD_J}/meeting/repository/MeetingRepository.java`, start: 18, hl: [19, 20], code: [
        '    @Query("select distinct m from Meeting m " +',
        '           "join fetch m.host h " +',
        '           "join fetch m.region r " +',
        '           "where r.code = :regionCode " +',
        '           "and m.category = :category " +',
        '           "and m.status = \'RECRUITING\' " +',
        '           "order by m.startAt asc")',
        '    List<Meeting> searchWithHostAndRegion(@Param("regionCode") String regionCode,',
        '                                          @Param("category") MeetingCategory category);',
      ] },
      { path: `${CD_J}/meeting/domain/Meeting.java`, start: 14, hl: [16], code: [
        '@Entity',
        '@Table(name = "meeting", indexes = {',
        '        @Index(name = "idx_meeting_region_category_start", columnList = "region_id, category, start_at")',
        '})',
        'public class Meeting extends BaseTimeEntity {',
      ] },
    ],
  },
};
// 직접 만든 카드: 모여봄(p1)에서 「직접 만들기」로 제목만 적어 만든 빈 카드. 기간·역할은 프로젝트 것을 그대로 받는다 (core.js create)
const CD_MANUAL = {
  project: '모여봄', title: '모임 신고 기능 만들기', period: '2026.09부터', role: '백엔드 (Spring Boot), 4인 팀', source: 'manual',
  keywords: [], line: '', star: { situation: '', task: '', action: '', result: '' }, retro: '', evidence: null,
};
// 휴지통에 있는 카드 (seed-replies.js 의 t_seed_gone, type: 'card')
const CD_TRASHED_TITLE = '모임 공지 푸시 알림 붙이기';

const CD_STAR = [['situation', '상황'], ['task', '과제'], ['action', '행동'], ['result', '결과']];
const CD_STAR_PH = { situation: '언제, 어디서, 누구와 있었던 일인가요?', task: '맡은 역할이나 풀어야 했던 문제는 무엇이었나요?', action: '구체적으로 무엇을 했나요?', result: '무엇이 달라졌나요? 숫자가 있으면 좋아요.' };
const CD_LINE_HINT = '마스터 이력서에 이 문장이 그대로 들어가요.';
const CD_KEYWORDS = ['문제 해결력', '분석적 사고', '창의력', '기획력', '커뮤니케이션', '의사결정 능력', '리더십', '추진력', '실행력', '도전정신', '학습능력', '협업능력']; // data.js 의 12개 역량
const CD_W = 760; // 좁은 페이지의 내용 폭

/* ---------- 컴포넌트 ---------- */
// 꺼진 저장 버튼 (.wr-foot .btn[disabled]: 회색 알약, 테두리, text-3)
async function cdSaveOff() {
  const b = al('H', { name: '저장 (꺼짐)', pad: [3, 13], h: 32, main: 'center', cross: 'center', fill: 'surface-2', stroke: 'border', radius: 'radius/pill' });
  b.appendChild(await text('저장', 'Small/13.5 Semibold', 'text-3')); return b;
}
// 「AI 채팅에서 채우기」 같은 글 링크 (.link)
const cdLink = (label, name) => text(label, 'Small/13.5 Medium', 'primary-ink', { underline: true, name: name || label });

EXTRA_COMPONENTS.push({
  title: '경험 카드',
  build: async (row) => {
    // 직접 쓰는 칸의 저장 줄 (core.js wrFoot): 왼쪽 안내 글, 오른쪽 상태와 단추
    await makeSet(row, 'Card/Write footer', ['Idle', 'Dirty', 'Saved'].map((k) => ({ props: { State: k }, build: async (c) => {
      auto(c, 'H', { gap: 8, w: 640, cross: 'center' }); c.minHeight = 32;
      const hint = named(await text(CD_LINE_HINT, 'Small/13.5', 'text-3'), 'foot-hint'); c.appendChild(hint); hint.visible = false;
      spacer(c);
      if (k === 'Saved') c.appendChild(await text('저장했어요', 'Small/13.5', 'text-3', { name: '상태' }));
      if (k === 'Dirty') { c.appendChild(btn('취소', 'Ghost', 'Small')); c.appendChild(btn('저장', 'Primary', 'Small')); }
      else c.appendChild(await cdSaveOff());
    } })), { desc: '직접 쓰는 칸 아래 저장 줄. Idle: 고치기 전(저장 꺼짐), Dirty: 고치는 중(취소, 저장), Saved: 저장한 뒤. 인스턴스에서 가로 채우기', props: [{ name: 'Hint', type: 'TEXT', default: CD_LINE_HINT, node: 'foot-hint' }, { name: 'Show hint', type: 'BOOLEAN', default: false, node: 'foot-hint' }] });

    // STAR 한 줄: 칸 이름(72) + 테두리 없는 입력칸. 고칠 때만 테두리와 저장 줄
    await makeSet(row, 'Card/STAR row', ['Idle', 'Empty', 'Editing', 'Saved'].map((k) => ({ props: { State: k }, build: async (c) => {
      auto(c, 'H', { gap: 6, pad: [12, 0, 18, 0], w: CD_W, stroke: 'border', sides: ['bottom'] });
      const dt = al('H', { name: '칸 이름', w: 72, pad: [7, 0, 0, 0] }); c.appendChild(dt);
      const pill = al('H', { name: '알약', pad: [2, 12], fill: 'primary-soft', radius: 'radius/pill' }); dt.appendChild(pill);
      pill.appendChild(named(await text('상황', 'Small/13.5 Semibold', 'primary-deep'), 'star-label'));
      const dd = al('V', { name: '칸', gap: 4 }); put(c, dd, { fill: true });
      const box = al('V', { name: '입력칸', pad: [5, 10], radius: 'radius/sm',
        fill: k === 'Editing' || k === 'Saved' ? 'surface' : null,
        stroke: k === 'Editing' ? 'primary-strong' : k === 'Saved' ? 'border-strong' : null, strokeW: k === 'Editing' ? 2 : 1 });
      put(dd, box, { fill: true });
      await tput(box, k === 'Empty' ? CD_STAR_PH.situation : '칸에 쓴 글', 'Body/15', k === 'Empty' ? 'text-3' : 'text', { wrap: true, name: 'star-text' });
      if (k === 'Empty') { const f = al('H', { name: '저장 줄', cross: 'center', minH: 32 }); put(dd, f, { fill: true }); f.appendChild(await cdLink('AI 채팅에서 채우기')); }
      if (k === 'Editing' || k === 'Saved') put(dd, inst('Card/Write footer', { State: k === 'Editing' ? 'Dirty' : 'Saved' }), { fill: true });
    } })), { desc: '경험 카드의 STAR 한 줄. Idle: 읽을 때(테두리 없음), Empty: 비어 있음(안내 글 + AI 채팅에서 채우기), Editing: 고치는 중(초점 테두리 + 취소·저장), Saved: 저장한 뒤(저장했어요). 인스턴스에서 가로 채우기', props: [{ name: 'Label', type: 'TEXT', default: '상황', node: 'star-label' }, { name: 'Text', type: 'TEXT', default: '칸에 쓴 글', node: 'star-text' }] });
  },
});

/* ---------- 조립 ---------- */
// 아이콘 + 글 (.meta 의 한 칸)
async function cdMetaItem(ic, label) {
  const m = al('H', { name: label, gap: 5, cross: 'center' });
  m.appendChild(icon(ic, 15, 'text-3')); m.appendChild(await text(label, 'Small/13.5', 'text-3')); return m;
}

// 머리: 프로젝트, 제목, 기간·역할·출처, 역량 / AI 채팅으로 채우기, 카드 메뉴 → { col, more }
async function cdHead(main, d) {
  const meta = [];
  if (d.period) meta.push(await cdMetaItem('calendar', d.period));
  if (d.role) meta.push(await text(d.role, 'Small/13.5', 'text-3'));
  if (d.source === 'github') meta.push(await cdMetaItem('github', 'GitHub'));
  if (d.source === 'manual') meta.push(await cdMetaItem('edit', '직접 만든 카드'));
  const kws = al('H', { name: '역량', gap: 14, cross: 'center', wrap: true }); kws.counterAxisSpacing = 4;
  for (const k of d.keywords) kws.appendChild(inst('Keyword', { State: 'Default', Label: k }));
  const edit = al('H', { name: '역량 바꾸기', pad: [0, 0, 0, d.keywords.length ? 4 : 0] }); kws.appendChild(edit);
  edit.appendChild(await cdLink(d.keywords.length ? '역량 바꾸기' : '역량 고르기'));
  const more = named(inst('Icon button', { Size: 'Medium', Icon: 'more' }), '경험 카드 메뉴');
  const col = await page(main, { narrow: true, crumb: '경험 위키', above: [inst('Project chip', { Label: d.project })], title: d.title, meta, below: [kws],
    actions: [btn('AI 채팅으로 채우기', 'Primary', 'Medium', 'chat'), more], after: 24 });
  return { col, more };
}

// 이력서 한 줄 (회색 판 .panel): 머리(이름, N자), 한 줄 입력칸, 저장 줄
async function cdLinePanel(col, d) {
  const p = al('V', { name: '이력서 한 줄', pad: [22, 24], fill: 'primary-soft', radius: 'radius/lg' }); put(col, p, { fill: true });
  const top = al('H', { name: '머리', gap: 10, cross: 'center' }); put(p, top, { fill: true });
  top.appendChild(await text('이력서 한 줄', 'Title/18', 'text')); spacer(top);
  top.appendChild(await text(`${d.line.length}자`, 'Small/13.5', 'text-3', { name: '글자 수' }));
  gap(p, 8);
  const box = al('V', { name: '입력칸', pad: [12, 14], fill: 'surface', stroke: 'border-strong', radius: 'radius/sm' }); put(p, box, { fill: true });
  await tput(box, d.line || '이 경험을 이력서에 적을 한 문장', 'Body/15 Semibold', d.line ? 'text' : 'text-3', { wrap: true });
  gap(p, 8);
  put(p, inst('Card/Write footer', { State: 'Idle', 'Show hint': true, Hint: CD_LINE_HINT }), { fill: true });
  return p;
}

// STAR: 칸마다 Card/STAR row. states: { result: 'Editing', task: 'Saved' } (없으면 글이 있으면 Idle, 없으면 Empty)
async function cdStar(col, d, states = {}) {
  const s = al('V', { name: 'STAR' }); put(col, s, { fill: true });
  for (const [key, label] of CD_STAR) {
    const v = (states[key] && states[key].text) || d.star[key];
    const state = (states[key] && states[key].state) || (v ? 'Idle' : 'Empty');
    const r = inst('Card/STAR row', { State: state, Label: label, Text: v || CD_STAR_PH[key] }); r.name = label; put(s, r, { fill: true });
  }
  return lastRow(s);
}

// 회고: 직접 쓰는 칸
async function cdRetro(col, d) {
  const s = al('V', { name: '회고' }); put(col, s, { fill: true });
  await sectionTitle(s, '회고', null, '직접 쓰는 칸');
  put(s, inst('Textarea', d.retro ? { Content: 'Value', Text: d.retro } : { Content: 'Placeholder', Text: '다시 한다면 무엇을 다르게 할지, 무엇을 배웠는지 적어 보세요.' }), { fill: true });
  gap(s, 8);
  put(s, inst('Card/Write footer', { State: 'Idle' }), { fill: true });
  return s;
}

// 근거 (<details>): 닫힘은 머리만, 펼침은 공용 evidence() (레포 줄 + 커밋 + PR + 코드)
const cdRange = (f) => { const end = f.start + f.code.length - 1; return `${f.path}:${end !== f.start ? `${f.start}-${end}` : f.start}`; };
async function cdEvidence(col, ev, open) {
  const s = al('V', { name: open ? '근거 (펼침)' : '근거 (닫힘)' }); put(col, s, { fill: true });
  const sum = al('H', { name: '근거 머리', gap: 8, cross: 'center', minH: 44 }); put(s, sum, { fill: true });
  sum.appendChild(icon(open ? 'chevron-down' : 'chevron-right', 18, 'text-3'));
  sum.appendChild(await text('근거', 'Title/18', 'text'));
  const opts = { repo: ev.repo, sample: ev.sample, commits: ev.commits, prs: ev.prs, code: ev.files.map((f) => ({ path: cdRange(f), lines: f.code.map((src, i) => [f.start + i, src]), hl: f.hl })) };
  const counts = al('H', { name: '개수', gap: 14, cross: 'center', pad: [0, 0, 0, 4] }); sum.appendChild(counts);
  for (const c of evidenceCounts(opts)) counts.appendChild(await text(c, 'Small/13.5', 'text-3'));
  if (!open) return s;
  const body = al('V', { name: '근거 내용', pad: [8, 0, 0, 0] }); put(s, body, { fill: true });
  await evidence(body, opts);
  return s;
}

// 경험 카드 화면 한 장. o: { star: { key: { state, text } }, evidenceOpen }
async function cdScreen(frame, d, o = {}) {
  const { screen, main } = shell(frame, 'Wiki');
  const { col, more } = await cdHead(main, d);
  await cdLinePanel(col, d); gap(col, 40);
  await cdStar(col, d, o.star); gap(col, 40);
  await cdRetro(col, d);
  if (d.evidence) { gap(col, 40); await cdEvidence(col, d.evidence, o.evidenceOpen); }
  fit(frame, screen);
  return { screen, col, more };
}

// 카드 메뉴 자리를 계산할 수 없을 때: 내용 열 오른쪽 끝, 머리 단추(38) 아래. 화면 폭 1920, 왼쪽 메뉴 236, 페이지 1200 가운데, 안쪽 40
const CD_COL_X = SIDEBAR_W + Math.round((W - SIDEBAR_W - 1200) / 2) + 40;
const CD_MENU_AT = [CD_COL_X + CD_W - 232, 46 + 14 + 38 + 4];

/* ---------- 화면 ---------- */
SCREENS.push({
  group: '경험 카드', title: '검색 API 응답 속도 개선 (N+1)',
  build: async (frame) => { await cdScreen(frame, CD_E1); },
});

SCREENS.push({
  group: '경험 카드', title: '근거 펼침',
  build: async (frame) => { await cdScreen(frame, CD_E1, { evidenceOpen: true }); },
});

SCREENS.push({
  group: '경험 카드', title: '직접 만든 카드',
  build: async (frame) => { await cdScreen(frame, CD_MANUAL); },
});

SCREENS.push({
  group: '경험 카드', title: '칸을 고치는 중',
  build: async (frame) => {
    await cdScreen(frame, CD_E1, { star: {
      task: { state: 'Saved' },
      result: { state: 'Editing', text: `${CD_E1.star.result} 프론트 팀원이 검색 화면이 더 이상 버벅이지 않는다고 알려 줌.` },
    } });
  },
});

SCREENS.push({
  group: '경험 카드', title: '카드 메뉴',
  build: async (frame) => {
    const { more } = await cdScreen(frame, CD_E1);
    menuUnder(frame, more, [{ label: '제목 바꾸기', icon: 'edit' }, '-', { label: '휴지통으로 옮기기', icon: 'trash', danger: true }], { at: CD_MENU_AT });
  },
});

SCREENS.push({
  group: '경험 카드', title: '제목 바꾸기',
  build: async (frame) => {
    await cdScreen(frame, CD_E1);
    await modal(frame, {
      title: '제목 바꾸기',
      body: async (b) => { await field(b, { label: '경험 카드 제목', input: { Content: 'Value', State: 'Focus', Text: CD_E1.title } }); },
      buttons: [btn('취소', 'Secondary'), btn('저장', 'Primary')],
    });
  },
});

SCREENS.push({
  group: '경험 카드', title: '역량 고르기',
  build: async (frame) => {
    await cdScreen(frame, CD_E1);
    await modal(frame, {
      title: '역량 고르기',
      body: async (b) => {
        await modalText(b, '이 경험에서 드러난 역량을 골라 주세요. 자소서와 면접 준비에서 이 역량으로 카드를 찾아요.');
        const pick = al('H', { name: '역량 고르기', gap: 8, wrap: true }); pick.counterAxisSpacing = 8; put(b, pick, { fill: true });
        for (const k of CD_KEYWORDS) pick.appendChild(inst('Keyword option', { Selected: CD_E1.keywords.includes(k) ? 'On' : 'Off', Label: k }));
      },
      buttons: [btn('취소', 'Secondary'), btn('저장', 'Primary')],
    });
  },
});

SCREENS.push({
  group: '경험 카드', title: '휴지통에 있는 카드',
  build: async (frame) => {
    const { screen, main } = shell(frame, 'Wiki');
    const col = await page(main, { crumb: '경험 위키' });
    await empty(col, '휴지통에 있는 카드예요', `「${CD_TRASHED_TITLE}」`, [btn('복원하기', 'Primary')]);
    fit(frame, screen);
  },
});

SCREENS.push({
  group: '경험 카드', title: '역량 저장 알림',
  build: async (frame) => {
    await cdScreen(frame, CD_E1);
    toast(frame, '역량을 저장했어요');
  },
});
}
