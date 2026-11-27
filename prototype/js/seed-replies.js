/* 예시 데이터: 「AI 답변 종류 모아 보기」 대화방 (모여봄).
   AI 채팅의 일반 글이 아닌 답변을 모두 한 방에서 볼 수 있게 한다. 종류 정리는 docs/chat-replies.md
   - touch: 카드를 바꾼 답 위의 카드 칩 (카드가 휴지통에 있거나 지워졌으면 누를 때 알려 준다)
   - link: GitHub로 이어 주는 단추
   - github: 레포 분석 (멈춤, 실패, 고르기, 새로 만들 것 없음, 만든 뒤). 연결 전 모습은 슬랙봇의 「AI 답변 종류: GitHub 연결 전」 방
   - confirm: 바꾸기 전에 묻기 (만들기 거절, 고치기 허용, 고치기 실패, 지우기 허용, 기다리는 중)
   휴지통 항목의 날짜는 오늘 기준으로 정한다 (30일이 지나 사라지지 않게) */
(function (SEED) {
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const card = (id) => SEED.experiences.find((e) => e.id === id);
  const pad = (n) => String(n).padStart(2, '0');
  const ago = (days, hm) => { const d = new Date(Date.now() - days * 86400000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`; };
  const day = '2026-11-21'; const at = (hm) => `${day} ${hm}`;

  // 휴지통에 있는 카드 (지우기를 허락한 뒤의 모습)
  const gone = {
    id: 'e_gone', projectId: 'p1', title: '모임 공지 푸시 알림 붙이기', period: { start: '2026-10', end: '2026-10' }, role: '백엔드', summary: '',
    star: { situation: '모임 공지를 올려도 참여자가 늦게 확인함.', task: '', action: 'FCM으로 공지 푸시 알림을 붙임.', result: '' },
    resumeLine: 'FCM 공지 푸시 알림 도입', retrospect: '', keywords: ['실행력'], source: 'chat', evidence: null, createdAt: '2026-10-30', updatedAt: '2026-10-30',
  };
  SEED.trash = (SEED.trash || []).concat([{ id: 't_seed_gone', type: 'card', title: gone.title, projectId: 'p1', deletedAt: ago(1, '21:40'), data: { experiences: [gone] } }]);

  // 고치기 제안의 앞뒤 모습
  const e10 = card('e10'); const e1 = card('e1');
  const plus = (e, field, add) => { const x = clone(e); x.star[field] = `${x.star[field]} ${add}`.trim(); return x; };
  const ok = plus(e10, 'result', '로그아웃하면 Redis에서 토큰을 바로 지워 다른 기기의 세션도 끊김.');
  const fail = plus(e1, 'action', '느린 쿼리는 주마다 슬로우 쿼리 로그로 점검함.');
  const wait = plus(e10, 'action', '재발급 요청이 몰릴 때를 대비해 사용자별로 1초에 한 번만 재발급하게 막음.');
  const nope = { id: 'e_nope', projectId: 'p1', title: '업로드 전에 모임 사진 압축하기', star: { situation: '', task: '', action: '모임 사진을 올리기 전에 브라우저에서 이미지를 압축함.', result: '' }, keywords: ['문제 해결력'], resumeLine: '업로드 전 이미지 압축으로 모임 사진 용량 절감', summary: '' };

  // 레포 분석 초안: 아직 카드로 만들지 않은 작업
  const used = new Set(SEED.experiences.flatMap((e) => [e.key, ...((e.evidence || {}).keys || [])]).filter(Boolean));
  const left = (SEED.repoDrafts.p1 || []).filter((d) => !used.has(d.key));
  const gh = (status, extra) => Object.assign({ status, step: 0, picked: [], drafts: [], madeIds: [], error: '' }, extra);

  let n = 0; const id = () => `m_kinds_${++n}`;
  const me = (hm, text, extra) => Object.assign({ id: id(), who: 'me', text, at: at(hm) }, extra);
  const ai = (hm, text, extra) => Object.assign({ id: id(), who: 'ai', text, at: at(hm) }, extra);
  const pending = (op, cardId, before, after, fields, ids, status, next) => ({ status, op, cardId, before: before && clone(before), after: after && clone(after), fields, ids, cmd: '', next });

  const msgs = [
    ai('20:00', '이 대화방은 AI 채팅의 답변 종류를 한곳에서 볼 수 있게 모아 둔 예시예요. 위에서부터 차례로 내려가며 보세요.'),
    // 1. 카드 칩 (touch): 카드를 바꾼 답 위에 붙는다
    me('20:01', '로그인 쪽 이야기 더 할게요. Refresh Token은 재발급할 때마다 새 토큰으로 바꿔서 한 번만 쓰이게 했어요.', { done: true, card: 'e10' }),
    ai('20:01', '그 결과 무엇이 달라졌나요? 숫자로 말할 수 있는 게 있을까요?', { card: 'e10', stage: 'result', touch: { card: 'e10', created: false, fields: ['action'] } }),
    ai('20:02', '나중에 휴지통으로 옮긴 카드를 바꿨던 답이에요. 칩은 똑같이 보이고, 누르면 휴지통에 있다고 알려 줘요.', { touch: { card: 'e_gone', title: gone.title, created: false, fields: ['action'] } }),
    ai('20:02', '나중에 완전히 지운 카드를 만들었던 답이에요. 누르면 지워진 카드라고 알려 줘요.', { touch: { card: 'e_purged', title: '모임 일정 투표 만들기', created: true, fields: ['situation'] } }),
    // 2. GitHub로 이어 주기 (link)
    me('20:03', '깃허브에서 찾아줘', { command: true }),
    ai('20:03', 'GitHub에서 찾은 작업은 이 프로젝트의 경험 카드로 만들어져요.', { kind: 'link', link: 'github' }),
    // 3. 레포 분석 (github)
    ai('20:05', '연결한 GitHub 레포를 읽고 있어요.', { kind: 'github', gh: gh('running') }), // 새로 고침으로 끊긴 분석 → 「멈췄어요」
    ai('20:06', '레포를 다 읽지 못했어요.', { kind: 'github', gh: gh('error', { error: 'GitHub 요청 한도를 넘었어요. 1시간 뒤에 다시 시도해 주세요.' }) }),
    ai('20:07', `커밋 87개와 PR 34개를 읽고 경험이 될 작업을 ${left.length}개 찾았어요. 카드로 만들 작업을 골라 주세요.`, { kind: 'github', gh: gh('ready', { drafts: clone(left), picked: left.slice(0, 1).map((d) => d.key) }) }),
    ai('20:08', '새로 카드로 만들 작업은 없어요. 이 레포에서 만든 경험 카드예요.', { kind: 'github', gh: gh('empty', { madeIds: ['g1', 'g2'] }) }),
    ai('20:09', '경험 카드 1장을 만들었어요.', { kind: 'github', gh: gh('done', { madeIds: ['g1'], drafts: clone(left) }) }),
    // 4. 바꾸기 전에 묻기 (confirm) — 「카드 바꾸기 전에 묻기」를 켰을 때
    me('20:10', '다른 이야기인데, 모임 사진을 올리기 전에 브라우저에서 이미지를 압축했어요.', { command: true }),
    ai('20:10', `새 경험 카드 「${nope.title}」를 만들까요?`, { kind: 'confirm', card: null, pending: pending('create', 'e_nope', null, nope, ['action'], [], 'no') }),
    ai('20:10', '카드는 그대로 두었어요. 다르게 담고 싶으면 다시 말씀해 주세요.'),
    me('20:11', '로그아웃하면 Redis에서 토큰을 바로 지워서 다른 기기의 세션도 끊겼어요.', { done: true, card: 'e10' }),
    ai('20:11', `「${e10.title}」 카드의 결과를 이렇게 바꿀까요?`, { kind: 'confirm', card: 'e10', pending: pending('update', 'e10', e10, ok, ['result'], [], 'ok') }),
    ai('20:11', '더 있었던 일이 있으면 이어서 적어 주세요.', { card: 'e10', touch: { card: 'e10', created: false, fields: ['result'] } }),
    me('20:12', '검색 API는 그 뒤로 슬로우 쿼리 로그를 주마다 점검했어요.', { command: true }),
    ai('20:12', `「${e1.title}」 카드의 행동을 이렇게 바꿀까요?`, { kind: 'confirm', card: 'e1', pending: pending('update', 'e1', e1, fail, ['action'], [], 'fail') }),
    ai('20:13', '그사이 카드가 바뀌어서 반영하지 않았어요. 다시 말씀해 주시면 지금 카드에 맞춰 담을게요.'),
    me('20:14', '이 카드 지워 줘', { command: true }),
    ai('20:14', `「${gone.title}」 카드를 휴지통으로 옮길까요? 30일 안에는 되돌릴 수 있어요.`, { kind: 'confirm', card: 'e_gone', pending: pending('delete', 'e_gone', gone, null, [], [], 'ok') }),
    ai('20:14', `「${gone.title}」 카드를 휴지통으로 옮겼어요. 대화방은 그대로 남아요.`, { trash: 't_seed_gone' }),
    // 4'. 아직 답을 기다리는 제안: 「반영하기」「항상 허용」「거절」을 눌러 볼 수 있다
    me('20:15', '재발급 요청이 몰릴 때를 대비해서 사용자별로 1초에 한 번만 재발급하게 막았어요.', { hold: true }),
  ];
  const waitMe = msgs[msgs.length - 1].id;
  msgs.push(ai('20:15', `「${e10.title}」 카드의 행동을 이렇게 바꿀까요?`, { kind: 'confirm', card: 'e10', pending: pending('update', 'e10', e10, wait, ['action'], [waitMe], 'wait', { text: '더 있었던 일이 있으면 이어서 적어 주세요.', stage: null, card: 'e10', touch: { card: 'e10', created: false, fields: ['action'] } }) }));

  SEED.chats.push({ id: 'c_kinds', projectId: 'p1', title: 'AI 답변 종류 모아 보기', focus: 'e10', createdAt: at('20:00'), updatedAt: '2026-11-28 09:00', msgs });

  // GitHub를 연결하지 않은 프로젝트(슬랙봇)에서만 보이는 모습: 연결 단추
  SEED.chats.push({ id: 'c_kinds_nogh', projectId: 'p2', title: 'AI 답변 종류: GitHub 연결 전', focus: null, createdAt: at('20:20'), updatedAt: '2026-11-28 08:59', msgs: [
    { id: 'm_kn_1', who: 'me', text: '깃허브에서 찾아줘', at: at('20:20'), command: true },
    { id: 'm_kn_2', who: 'ai', text: 'GitHub에서 찾은 작업은 이 프로젝트의 경험 카드로 만들어져요.', at: at('20:20'), kind: 'link', link: 'github' },
    { id: 'm_kn_3', who: 'ai', text: '이 프로젝트에 연결한 GitHub 레포가 아직 없어요. 연결하면 바로 찾아볼게요.', at: at('20:21'), kind: 'github', gh: gh('connect') },
  ] });
  // 이 방들은 예시 계정이 생긴 뒤에 더했다: 이미 저장된 예시 계정에도 한 번 넣는다 (core.js addLaterSeed)
  SEED.later = (SEED.later || []).concat([{ chat: 'c_kinds', trash: ['t_seed_gone'] }, { chat: 'c_kinds_nogh' }]);
})(window.SEED);
