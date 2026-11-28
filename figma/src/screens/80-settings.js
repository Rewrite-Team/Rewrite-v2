/* 설정 (#/settings, prototype/js/screens/settings.js + css/screens/settings.css). 좁은 페이지
   화면: 설정 · 설정 / GitHub 연결 · 설정 / GitHub 연결 중 · 설정 / GitHub 연결 오류 · 설정 / 회원 탈퇴
   1차 범위라 회원 탈퇴 안내에 지원 기업·이력서는 넣지 않는다 (예시 계정 문구만) */
{
  /* ---------- 이 화면의 컴포넌트: 설정 한 줄 (이름 140 + 내용) ---------- */
  EXTRA_COMPONENTS.push({ title: '설정', build: async (row) => {
    await makeSet(row, 'Settings/Row', ['Value', 'Subtle', 'Field'].map((k) => ({ props: { Control: k }, build: async (c) => {
      auto(c, 'H', { gap: 16, pad: [12, 0], w: 760, cross: 'center', stroke: 'border', sides: ['bottom'] }); c.minHeight = 64;
      const lab = al('H', { name: 'label', w: 140 }); c.appendChild(lab); lab.appendChild(named(await text('이름', 'Body/15 Semibold', 'text'), 'set-label'));
      const ctl = al('H', { name: 'control', gap: 8, cross: 'center' }); c.appendChild(ctl); ctl.layoutSizingHorizontal = 'FILL';
      if (k === 'Field') {
        expose(ctl, named(inst('Input', { Content: 'Value', State: 'Default', Text: '입력한 글' }), 'input')).resize(360, 39);
        const save = named(btn('저장', 'Secondary', 'Small'), 'save'); disable(save); ctl.appendChild(save);
        return;
      }
      const val = al('H', { name: 'value', gap: 6, cross: 'center' }); ctl.appendChild(val); val.layoutSizingHorizontal = 'FILL';
      val.appendChild(named(await text('값', 'Body/15', k === 'Subtle' ? 'text-3' : 'text'), 'set-value'));
      const tag = inst('Tag', { Tone: 'Neutral', Label: '예시' }); tag.name = 'tag'; val.appendChild(tag);
      expose(ctl, named(btn('바꾸기', 'Secondary', 'Small'), 'action'));
      expose(ctl, named(btn('연결 해제', 'Ghost danger', 'Small'), 'danger')); // 앱의 btn-ghost btn-danger
    } })), { desc: '설정의 한 줄. Value: 값과 단추, Subtle: 비어 있는 값(연결하지 않았어요), Field: 입력칸과 저장(바꾸기 전에는 꺼짐). 단추 글과 입력칸은 노출한 안쪽 인스턴스(action, danger, input)에서 바꾼다', props: [
      { name: 'Label', type: 'TEXT', default: '이름', node: 'set-label' }, { name: 'Value', type: 'TEXT', default: '값', node: 'set-value' },
      { name: 'Show tag', type: 'BOOLEAN', default: false, node: 'tag' }, { name: 'Show action', type: 'BOOLEAN', default: true, node: 'action' }, { name: 'Show danger', type: 'BOOLEAN', default: false, node: 'danger' }] });
  } });

  const fieldRow = (label, value) => { const r = inst('Settings/Row', { Control: 'Field', Label: label }); setNested(r, 'input', { Text: value }); r.name = label; return r; };
  const valueRow = (label, value, o = {}) => {
    const r = inst('Settings/Row', { Control: o.subtle ? 'Subtle' : 'Value', Label: label, Value: value, 'Show tag': !!o.tag, 'Show action': !!o.action, 'Show danger': !!o.danger });
    if (o.action) setNested(r, 'action', { Label: o.action }); if (o.danger) setNested(r, 'danger', { Label: o.danger });
    r.name = label; return r;
  };
  const rows = async (col, title, list) => {
    await sectionTitle(col, title);
    const box = al('V', { name: `${title} 줄`, stroke: 'border', sides: ['top'] }); put(col, box, { fill: true });
    for (const r of list) put(box, r, { fill: true });
    gap(col, 40);
  };

  // 설정 화면. github: true 면 예시 계정의 GitHub 연결
  async function settings(frame, o = { github: true }) {
    const { screen, main } = shell(frame, 'None');
    const col = await page(main, { narrow: true, title: '설정' }); gap(col, 12);
    await rows(col, '프로필', [fieldRow('이름', '김준호'), fieldRow('목표 직무', '백엔드 개발자')]);
    await rows(col, 'GitHub 계정', [o.github
      ? valueRow('GitHub 주소', 'github.com/example', { tag: true, action: '바꾸기', danger: '연결 해제' })
      : valueRow('GitHub 주소', '연결하지 않았어요', { subtle: true, action: 'GitHub 연결' })]);
    await rows(col, '계정', [valueRow('이메일', 'junho@example.com', { action: '로그아웃' }), valueRow('회원 탈퇴', '계정과 모든 데이터를 지워요', { subtle: true, danger: '탈퇴하기' })]);
    fit(frame, screen);
  }

  // GitHub 연결 모달. state: 'idle' | 'busy' | 'error'
  async function connect(frame, state) {
    await settings(frame, { github: false });
    const ok = btn('불러오기', 'Primary', 'Medium'); if (state === 'busy') disable(ok);
    await modal(frame, { title: 'GitHub 연결', buttons: [btn('취소', 'Secondary', 'Medium'), ok], body: async (b) => {
      const input = state === 'busy' ? { Content: 'Value', State: 'Disabled', Text: 'github.com/octocat' } : { Content: 'Placeholder', State: state === 'error' ? 'Error' : 'Focus', Text: 'github.com/내아이디' };
      await field(b, Object.assign({ label: 'GitHub 주소', input }, state === 'error' ? { error: 'GitHub 주소를 적어 주세요.' } : {}));
      if (state === 'busy') {
        const busy = al('H', { name: '불러오는 중', gap: 8, cross: 'center', minH: 24 }); put(b, busy, { fill: true });
        busy.appendChild(spinner(18)); // 앱의 .spinner
        busy.appendChild(await text('조직 찾는 중', 'Small/13.5', 'text'));
      }
    } });
  }

  SCREENS.push({ group: '설정', title: '설정', build: async (frame) => { await settings(frame); } });
  SCREENS.push({ group: '설정', title: 'GitHub 연결', build: async (frame) => { await connect(frame, 'idle'); } });
  SCREENS.push({ group: '설정', title: 'GitHub 연결 중', build: async (frame) => { await connect(frame, 'busy'); } });
  SCREENS.push({ group: '설정', title: 'GitHub 연결 오류', build: async (frame) => { await connect(frame, 'error'); } });
  SCREENS.push({ group: '설정', title: '회원 탈퇴', build: async (frame) => {
    await settings(frame);
    await modal(frame, { title: '회원 탈퇴', buttons: [btn('취소', 'Secondary', 'Medium'), btn('탈퇴하기', 'Danger', 'Medium')], body: async (b) => {
      await modalText(b, '예시 계정이라 계정은 남고, 데이터만 처음 상태로 돌아가요. 되돌릴 수 없어요.');
    } });
  } });
}
