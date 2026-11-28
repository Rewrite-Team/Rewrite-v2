/* 예시 데이터: 「오늘의 질문」 방의 지난 기록 (모여봄, 슬랙봇).
   홈의 잔디가 비어 보이지 않게, 오늘 기준으로 지난 몇 주 동안 띄엄띄엄 답한 모습을 만든다. 오늘은 비워 둔다 (오늘의 질문은 앱이 남긴다).
   다른 프로젝트의 오늘의 질문 방은 앱이 처음 열 때 만든다 (store.ensureDaily) */
(function (SEED) {
  const pad = (n) => String(n).padStart(2, '0');
  const dayAgo = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const PROMPTS = [
    '오늘 이 프로젝트에서 한 일 중 가장 기억에 남는 건 뭐였나요?',
    '최근에 가장 오래 고민한 문제는 뭐였나요? 어떻게 풀었는지도 들려주세요.',
    '최근에 팀원에게 설명하거나 설득한 일이 있었나요?',
    '처음 계획과 다르게 바뀐 게 있었다면 무엇이었고, 왜 바뀌었나요?',
    '숫자로 말할 수 있는 변화가 있었나요? 시간, 횟수, 비율 같은 것도 좋아요.',
    '새로 배워서 바로 써먹은 게 있나요?',
    '실수했던 일과, 그다음에 어떻게 했는지 들려주세요.',
    '누군가에게 도움을 받거나 준 일이 있었나요?',
  ];
  // 프로젝트마다: 지난 며칠 동안(span), 답한 날의 비율(rate), 카드, 답과 그 답이 담길 카드(cards 의 순서)
  const PLAN = {
    p1: { span: 84, rate: 0.62, cards: [['e1', '검색 API 응답 속도 개선 (N+1)'], ['e8', '프론트와 API 명세 먼저 합의하기'], ['e10', 'JWT + Refresh Token 인증 설계'], ['e11', '배포 후 업로드 500 에러와 배포 체크리스트']], answers: [
      ['검색 결과 정렬이 페이지마다 달라지는 버그를 찾았어요. 정렬 기준에 id를 하나 더 넣어서 고쳤어요.', 0],
      ['프론트 팀원한테 페이지네이션 응답 형식을 설명했어요. 무한 스크롤이라 커서 방식으로 바꾸자고 설득했어요.', 1],
      ['배포를 처음엔 손으로 했는데 GitHub Actions로 옮겼어요. 배포 시간이 10분에서 3분으로 줄었어요.', 3],
      ['모임 검색 API 응답이 0.8초에서 0.3초로 줄었어요.', 0],
      ['로그아웃할 때 Redis에 저장한 토큰을 바로 지우게 했어요.', 2],
      ['마이그레이션을 잘못 돌려서 테스트 DB를 날렸어요. 그 뒤로는 배포 체크리스트에 백업을 넣었어요.', 3],
      ['코드 리뷰에서 검색 쿼리의 트랜잭션 범위가 너무 넓다는 피드백을 받고 메서드를 나눴어요.', 0],
      ['응답 형식이 또 바뀌어서, 명세에 예시 응답까지 적어 두자고 제안했어요.', 1],
      ['로그인 실패 로그를 보다가 같은 IP에서 계속 시도하는 걸 발견해서 횟수 제한을 걸었어요.', 2],
      ['업로드 용량 제한을 설정 파일로 빼서 배포 환경마다 다르게 줄 수 있게 했어요.', 3],
    ] },
    p2: { span: 42, rate: 0.45, cards: [['e12', '쓰는 사람에 맞춰 슬랙 봇과 Postgres 고르기'], ['e16', '지출이 두 번씩 저장되던 문제 해결']], answers: [
      ['슬랙 명령어 이름을 같이 사는 친구들한테 물어보고 더 짧게 바꿨어요.', 0],
      ['지출 합계가 1원씩 틀리게 나오는 문제를 찾았는데 반올림 때문이었어요.', 1],
      ['PostgreSQL에 인덱스를 처음 걸어 봤어요. 월별 조회가 눈에 띄게 빨라졌어요.', 0],
      ['월말 정산 메시지를 표 형식으로 바꿨더니 다들 보기 편하다고 했어요.', 0],
      ['봇이 가끔 응답을 안 해서 보니 슬랙 3초 제한 때문이었어요.', 1],
    ] },
  };
  const rnd = (seed) => { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; };
  SEED.later = SEED.later || [];
  for (const [pid, plan] of Object.entries(PLAN)) {
    if (!SEED.projects.some((p) => p.id === pid)) continue;
    const r = rnd(pid === 'p1' ? 11 : 29); const msgs = []; let n = 0; let k = 0;
    for (let ago = plan.span; ago >= 1; ago--) {
      const day = dayAgo(ago); const near = ago <= 14 ? 0.15 : 0; // 최근일수록 조금 더 자주
      const asked = { id: `m_d_${pid}_${++n}`, who: 'ai', daily: day, card: null, stage: null, at: `${day} 09:00`, text: PROMPTS[(ago * 7 + pid.length) % PROMPTS.length] };
      msgs.push(asked);
      if (r() > plan.rate + near) continue; // 답하지 않은 날
      const times = r() < 0.3 ? 2 : 1;
      for (let t = 0; t < times; t++) {
        const [text, ci] = plan.answers[k % plan.answers.length]; const [cid, title] = plan.cards[ci]; k++;
        const hm = `${20 + t}:${pad(10 + Math.floor(r() * 40))}`;
        msgs.push({ id: `m_d_${pid}_${++n}`, who: 'me', text, at: `${day} ${hm}`, done: true, card: cid });
        msgs.push({ id: `m_d_${pid}_${++n}`, who: 'ai', at: `${day} ${hm}`, card: cid, touch: { card: cid, title, created: false, fields: ['action'] }, text: '더 있었던 일이 있으면 이어서 적어 주세요.' });
      }
    }
    const last = msgs[msgs.length - 1];
    SEED.chats.push({ id: `c_daily_${pid}`, projectId: pid, title: '오늘의 질문', daily: true, focus: null, createdAt: `${dayAgo(plan.span)} 09:00`, updatedAt: last.at, msgs });
    SEED.later.push({ chat: `c_daily_${pid}` });
  }
})(window.SEED);
