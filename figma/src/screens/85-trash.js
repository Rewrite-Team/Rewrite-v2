/* 휴지통 (#/trash, prototype/js/screens/trash.js + css/screens/trash.css). 좁은 페이지
   화면: 휴지통 · 휴지통 / 비어 있음 · 휴지통 / 완전히 삭제할까요? · 휴지통 / 휴지통을 비울까요? · 휴지통 / 복원 알림
   예시 계정의 휴지통은 카드 한 장이지만, 종류마다 모습을 보이려고 프로젝트와 채팅도 넣었다. 1차 범위라 지원 기업 항목은 없다 */
{
  const ITEMS = [
    { icon: 'card', title: '모임 공지 푸시 알림 붙이기', type: '경험 카드', project: '모여봄', days: 29 },
    { icon: 'chat', title: '빈강의실 개발 이야기', type: '채팅', project: '빈강의실', days: 17 },
    { icon: 'folder', title: '데이터베이스 팀과제', type: '프로젝트', inside: '경험 카드 1개, 채팅 1개 포함', days: 8 },
  ];

  /* ---------- 이 화면의 컴포넌트: 휴지통 한 줄 ---------- */
  EXTRA_COMPONENTS.push({ title: '휴지통', build: async (row) => {
    await makeOne(row, 'Trash/Row', async (c) => {
      auto(c, 'H', { gap: 12, pad: [14, 0], w: 760, cross: 'center', stroke: 'border', sides: ['bottom'] }); c.minHeight = 56;
      const dot = al('H', { name: '아이콘 자리', w: 38, h: 38, main: 'center', cross: 'center', fill: 'surface-2', radius: 'radius/pill' }); c.appendChild(dot); dot.appendChild(named(icon('card', 20, 'text-3'), 'type-icon'));
      const m = al('V', { name: 'main', gap: 4 }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
      await tput(m, '항목 이름', 'Body/15 Semibold', 'text', { wrap: true, name: 'tr-title' });
      const sub = al('H', { name: 'sub', gap: 12, cross: 'center', wrap: true }); sub.counterAxisSpacing = 4; put(m, sub, { fill: true });
      sub.appendChild(named(await text('경험 카드', 'Small/13.5', 'text-3'), 'tr-type'));
      const chip = al('H', { name: 'tr-chip', gap: 5, cross: 'center' }); sub.appendChild(chip);
      chip.appendChild(icon('folder', 14, 'primary-ink')); chip.appendChild(named(await text('프로젝트', 'Small/13.5 Semibold', 'primary-ink'), 'tr-project'));
      sub.appendChild(named(await text('경험 카드 1개 포함', 'Small/13.5', 'text-3'), 'tr-inside'));
      sub.appendChild(named(await text('29일 뒤 삭제', 'Small/13.5', 'text-3'), 'tr-days'));
      const acts = al('H', { name: 'actions', gap: 4, cross: 'center' }); c.appendChild(acts);
      acts.appendChild(named(btn('복원', 'Secondary', 'Small'), 'restore'));
      acts.appendChild(named(btn('완전 삭제', 'Ghost danger', 'Small'), 'purge'));
    }, { desc: '휴지통의 한 줄: 종류 아이콘, 이름, 종류와 프로젝트와 남은 날. 복원, 완전 삭제', props: [
      { name: 'Icon', type: 'INSTANCE_SWAP', default: 'card', node: 'type-icon' }, { name: 'Title', type: 'TEXT', default: '항목 이름', node: 'tr-title' },
      { name: 'Type', type: 'TEXT', default: '경험 카드', node: 'tr-type' }, { name: 'Project', type: 'TEXT', default: '프로젝트', node: 'tr-project' },
      { name: 'Show project', type: 'BOOLEAN', default: true, node: 'tr-chip' }, { name: 'Inside', type: 'TEXT', default: '경험 카드 1개 포함', node: 'tr-inside' },
      { name: 'Show inside', type: 'BOOLEAN', default: false, node: 'tr-inside' }, { name: 'Days', type: 'TEXT', default: '29일 뒤 삭제', node: 'tr-days' }] });
  } });

  const rowOf = (t) => {
    const r = inst('Trash/Row', Object.assign({ Icon: t.icon, Title: t.title, Type: t.type, Days: `${t.days}일 뒤 삭제`, 'Show project': !!t.project, 'Show inside': !!t.inside },
      t.project ? { Project: t.project } : {}, t.inside ? { Inside: t.inside } : {}));
    r.name = t.title; return r;
  };
  async function trash(frame, items) {
    const { screen, main } = shell(frame, 'Trash', { trash: items.length });
    const col = await page(main, items.length
      ? { narrow: true, title: '휴지통', sub: '30일이 지나면 완전히 삭제돼요.', actions: [btn('휴지통 비우기', 'Danger', 'Medium')] }
      : { narrow: true, title: '휴지통' });
    if (items.length) { const list = listBox(col, '휴지통 항목', [4, 20]); for (const t of items) put(list, rowOf(t), { fill: true }); lastRow(list); }
    else await empty(col, '휴지통이 비어 있어요', '버린 항목은 30일 동안 여기에 있어요.');
    fit(frame, screen);
  }

  SCREENS.push({ group: '휴지통', title: '휴지통', build: async (frame) => { await trash(frame, ITEMS); } });
  SCREENS.push({ group: '휴지통', title: '비어 있음', build: async (frame) => { await trash(frame, []); } });
  SCREENS.push({ group: '휴지통', title: '완전히 삭제할까요?', build: async (frame) => {
    await trash(frame, ITEMS);
    await modal(frame, { title: '완전히 삭제할까요?', buttons: [btn('취소', 'Secondary', 'Medium'), btn('완전 삭제', 'Danger', 'Medium')], body: async (b) => {
      const body = al('V', { name: '설명', gap: 8 }); put(b, body, { fill: true });
      await modalText(body, '프로젝트 「데이터베이스 팀과제」'); await modalText(body, '경험 카드 1개, 채팅 1개도 함께 지워져요.'); await modalText(body, '되돌릴 수 없어요.');
    } });
  } });
  SCREENS.push({ group: '휴지통', title: '휴지통을 비울까요?', build: async (frame) => {
    await trash(frame, ITEMS);
    await modal(frame, { title: '휴지통을 비울까요?', buttons: [btn('취소', 'Secondary', 'Medium'), btn('비우기', 'Danger', 'Medium')], body: async (b) => { await modalText(b, `${ITEMS.length}개 항목을 되돌릴 수 없어요.`); } });
  } });
  SCREENS.push({ group: '휴지통', title: '복원 알림', build: async (frame) => {
    await trash(frame, ITEMS.slice(1)); // 카드를 복원한 뒤
    toast(frame, '복원했어요', '보기');
  } });
}
