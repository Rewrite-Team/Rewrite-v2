/* 컴포넌트 라이브러리: 「Rewrite v1」 페이지의 기초 견본 오른쪽. 화면은 모두 이 컴포넌트의 인스턴스로 조립한다.
   이름 규칙: 영어 이름과 속성(Variant, Size, State, Label …), 설명은 한국어. 크기·색·여백은 앱의 CSS 와 같다 */

/* ---------- 만들기 도구 ---------- */
const FIELD = { TEXT: 'characters', BOOLEAN: 'visible', INSTANCE_SWAP: 'mainComponent' };
// 속성 연결: props = [{ name, type, default, node: 레이어 이름 }]
function bindProps(owner, props = []) {
  for (const p of props) {
    const def = p.type === 'INSTANCE_SWAP' ? LIB[`Icon/${p.default}`].id : p.default;
    const key = owner.addComponentProperty(p.name, p.type, def);
    const targets = owner.type === 'COMPONENT_SET' ? owner.children : [owner];
    const fits = (x) => (p.type === 'TEXT' ? x.type === 'TEXT' : p.type === 'INSTANCE_SWAP' ? x.type === 'INSTANCE' : true); // 같은 이름의 틀과 글자가 함께 있어도 맞는 것만
    const own = (x, root) => { for (let a = x.parent; a && a !== root; a = a.parent) if (a.type === 'INSTANCE') return false; return true; }; // 안쪽 인스턴스(Button 의 label 등)는 건드리지 않는다
    for (const v of targets) for (const n of v.findAll((x) => x.name === p.node && fits(x) && own(x, v))) n.componentPropertyReferences = Object.assign({}, n.componentPropertyReferences, { [FIELD[p.type]]: key });
  }
}
// 변형 세트: variants = [{ props: { Variant: 'Primary' }, build: async (component) => {} }]
async function makeSet(parent, name, variants, o = {}) {
  const comps = [];
  for (const v of variants) {
    const c = figma.createComponent(); c.name = Object.entries(v.props).map(([k, x]) => `${k}=${x}`).join(', '); c.fills = [];
    await v.build(c); parent.appendChild(c); comps.push(c);
  }
  const set = figma.combineAsVariants(comps, parent); set.name = name;
  set.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : 'VERTICAL'; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
  set.itemSpacing = 16; set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 20; set.fills = [];
  stroke(set, 'border-strong', 1); set.dashPattern = [6, 4]; radius(set, 'radius/md');
  bindProps(set, o.props); set.description = o.desc || ''; LIB[name] = set; return set;
}
async function makeOne(parent, name, build, o = {}) {
  const c = figma.createComponent(); c.name = name; c.fills = []; await build(c); parent.appendChild(c);
  bindProps(c, o.props); c.description = o.desc || ''; LIB[name] = c; return c;
}
// 컴포넌트 안을 오토 레이아웃으로 (al 과 같은 옵션)
function auto(c, dir, o = {}) {
  const tmp = al(dir, o);
  for (const k of ['layoutMode', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'itemSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'clipsContent', 'minHeight', 'minWidth']) c[k] = tmp[k];
  if (o.w != null || o.h != null) c.resize(o.w != null ? o.w : 10, o.h != null ? o.h : 10);
  if (o.w != null) { if (dir === 'H') c.primaryAxisSizingMode = 'FIXED'; else c.counterAxisSizingMode = 'FIXED'; } else if (dir === 'H') c.primaryAxisSizingMode = 'AUTO'; else c.counterAxisSizingMode = 'AUTO';
  if (o.h != null) { if (dir === 'H') c.counterAxisSizingMode = 'FIXED'; else c.primaryAxisSizingMode = 'FIXED'; } else if (dir === 'H') c.counterAxisSizingMode = 'AUTO'; else c.primaryAxisSizingMode = 'AUTO';
  c.fills = fills(o.fill); if (o.stroke) stroke(c, o.stroke, o.strokeW || 1, o.sides); if (o.radius != null) radius(c, o.radius); if (o.opacity != null) c.opacity = o.opacity;
  tmp.remove(); return c;
}
const named = (n, name) => { n.name = name; return n; };
const slotIcon = (name, size, color) => named(icon(name, size, color), 'icon');
// 안쪽 인스턴스를 부모(컴포넌트 안)에 넣고 밖에서 바꿀 수 있게 노출한다 (Figma 의 Expose nested instances). 화면에서는 setNested 로 바꾼다
//   노출은 컴포넌트 안에 들어간 다음에만 된다 → 넣은 뒤 정한다
const expose = (parent, node) => { parent.appendChild(node); try { node.isExposedInstance = true; } catch (e) { /* 노출을 못 하는 환경이면 이름으로 찾아 바꾼다 */ } return node; };
async function hlBox(child, padX = 4) { const b = al('H', { name: '형광펜', pad: [1, padX], fill: 'hl', radius: MARK_RADIUS }); b.appendChild(child); return b; }

/* ---------- 라이브러리 ---------- */
async function buildLibrary(pageNode) {
  const root = al('V', { name: 'Components', gap: 56, pad: 64, fill: 'surface' }); pageNode.appendChild(root);
  await tput(root, 'Rewrite v1 컴포넌트', 'Heading/24', 'text');
  const section = async (title, desc) => {
    const s = al('V', { name: title, gap: 16 }); root.appendChild(s);
    await tput(s, title, 'Title/17', 'text'); if (desc) await tput(s, desc, 'Small/13.5', 'text-3', { w: 1100 });
    const row = al('H', { name: 'items', gap: 32, wrap: true, w: 1800, cross: 'start' }); row.counterAxisSpacing = 32; s.appendChild(row); return row;
  };

  // 아이콘
  const iconsSec = al('V', { name: 'Icons', gap: 16 }); root.appendChild(iconsSec);
  await tput(iconsSec, '아이콘', 'Title/17', 'text');
  await buildIcons(iconsSec);

  /* ===== 기본 ===== */
  let s = await section('기본', '버튼은 한 화면에 주 버튼(Primary) 하나. 끈 버튼은 인스턴스의 투명도 45%');
  const BTN = { Small: { h: 32, pad: [3, 10], text: 'Small/13.5 Semibold', ghost: 'Small/13.5 Medium', icon: 16 }, Medium: { h: 38, pad: [6, 14], text: 'Body/15 Semibold', ghost: 'Body/15 Medium', icon: 16 }, Large: { h: 46, pad: [10, 20], text: 'Body/15 Semibold', ghost: 'Body/15 Medium', icon: 18 } };
  const TONE = { Primary: { fill: 'primary', stroke: 'primary', fg: 'on-ink' }, Secondary: { fill: 'surface', stroke: 'border-strong', fg: 'text' }, Ghost: { fill: null, stroke: null, fg: 'text-2' }, Danger: { fill: 'surface', stroke: 'danger', fg: 'danger' }, 'Ghost danger': { fill: null, stroke: null, fg: 'danger' } };
  await makeSet(s, 'Button', Object.keys(TONE).flatMap((v) => Object.keys(BTN).map((z) => ({ props: { Variant: v, Size: z }, build: async (c) => {
    const t = TONE[v]; const b = BTN[z];
    auto(c, 'H', { gap: 6, pad: b.pad, h: b.h, main: 'center', cross: 'center', fill: t.fill, stroke: t.stroke, radius: 'radius/sm' });
    const ic = slotIcon('plus', b.icon, t.fg); ic.visible = false; c.appendChild(ic);
    c.appendChild(named(await text('버튼', v.startsWith('Ghost') ? b.ghost : b.text, t.fg), 'label'));
  } }))), { dir: 'H', desc: '버튼. Variant: Primary(주 버튼) · Secondary · Ghost · Danger · Ghost danger(테두리 없는 지우는 일: 연결 해제, 탈퇴하기, 완전 삭제), Size: Small 32 · Medium 38 · Large 46', props: [{ name: 'Label', type: 'TEXT', default: '버튼', node: 'label' }, { name: 'Show icon', type: 'BOOLEAN', default: false, node: 'icon' }, { name: 'Icon', type: 'INSTANCE_SWAP', default: 'plus', node: 'icon' }] });
  await makeSet(s, 'Icon button', ['Medium', 'Small'].map((z) => ({ props: { Size: z }, build: async (c) => {
    const n = z === 'Medium' ? 36 : 32; auto(c, 'H', { w: n, h: n, main: 'center', cross: 'center', radius: 'radius/sm' }); c.appendChild(slotIcon('more', z === 'Medium' ? 20 : 18, 'text-2'));
  } })), { dir: 'H', desc: '아이콘만 있는 버튼 (메뉴 ⋯, 닫기, 보내기)', props: [{ name: 'Icon', type: 'INSTANCE_SWAP', default: 'more', node: 'icon' }] });
  const TAG = { Neutral: ['surface-3', 'text-2'], Ink: ['primary-soft', 'primary-ink'], Success: ['success-soft', 'success'], Warn: ['warn-soft', 'warn'], Danger: ['danger-soft', 'danger'] };
  await makeSet(s, 'Tag', Object.keys(TAG).map((k) => ({ props: { Tone: k }, build: async (c) => {
    auto(c, 'H', { pad: [1, 7], fill: TAG[k][0], radius: 'radius/tag', cross: 'center' }); c.appendChild(named(await text('태그', 'Caption/12 Semibold', TAG[k][1]), 'label'));
  } })), { dir: 'H', desc: '상태 태그. Ink: 진행중, Neutral: 예시, Success: 완료, Warn: 마감 임박', props: [{ name: 'Label', type: 'TEXT', default: '태그', node: 'label' }] });
  await makeOne(s, 'Avatar', async (c) => { auto(c, 'H', { w: 32, h: 32, main: 'center', cross: 'center', fill: 'primary', radius: 16 }); c.appendChild(named(await text('김', 'Small/13.5 Semibold', 'on-ink'), 'label')); }, { desc: '계정 첫 글자', props: [{ name: 'Initial', type: 'TEXT', default: '김', node: 'label' }] });
  await makeSet(s, 'Logo', ['Light', 'Ink'].map((k) => ({ props: { On: k }, build: async (c) => {
    auto(c, 'H', { gap: 10, cross: 'center' });
    const m = al('H', { name: 'mark', w: 26, h: 26, main: 'center', cross: 'center', fill: 'hl', radius: [3, 7, 4, 6] }); m.appendChild(await text('R', 'Mark/15 Heavy', 'text')); c.appendChild(m);
    c.appendChild(await text('Rewrite', 'Title/17', k === 'Ink' ? 'on-ink' : 'text'));
  } })), { dir: 'H', desc: '로고. On=Ink 는 잉크색 바탕(로그인 왼쪽) 위' });
  await makeOne(s, 'Divider', async (c) => { c.resize(240, 1); c.fills = [paint('border')]; }, { desc: '가로 구분선. 인스턴스에서 가로 채우기' });
  await makeOne(s, 'Spinner', async (c) => {
    c.resize(16, 16); c.clipsContent = false;
    const e = figma.createEllipse(); e.name = 'ring'; e.resize(16, 16); c.appendChild(e); e.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    try { e.fills = [paint('primary')]; e.arcData = { startingAngle: Math.PI / 4, endingAngle: (7 * Math.PI) / 4, innerRadius: 0.75 }; } // 앱의 .spinner: 2px 테두리, 오른쪽 1/4 비움
    catch (err) { e.fills = []; stroke(e, 'primary', 2); e.dashPattern = [18, 6]; }
  }, { desc: '불러오는 중 (앱에서는 돈다). 기본 16, 인스턴스는 spinner(크기) 로 늘리고 줄인다' });

  /* ===== 입력 ===== */
  s = await section('입력', '입력칸 높이 39, 테두리 field-border, 초점은 잉크색 테두리. 글이 없을 때는 안내 글(text-3)');
  const fieldBox = (c, state, o = {}) => auto(c, 'H', { gap: 8, pad: [0, 12, 0, o.left || 12], w: 320, h: o.h || 39, cross: 'center', fill: state === 'Disabled' ? 'surface-2' : 'surface', stroke: state === 'Focus' ? 'primary' : state === 'Error' ? 'danger' : 'field-border', strokeW: state === 'Focus' ? 2 : 1, radius: 'radius/sm' });
  await makeSet(s, 'Input', ['Placeholder', 'Value'].flatMap((ct) => ['Default', 'Focus', 'Error', 'Disabled'].map((st) => ({ props: { Content: ct, State: st }, build: async (c) => {
    fieldBox(c, st); const ic = slotIcon('search', 16, 'text-3'); ic.visible = false; c.appendChild(ic);
    const t = named(await text(ct === 'Value' ? '입력한 글' : '안내 글', 'Body/15', ct === 'Value' && st !== 'Disabled' ? 'text' : 'text-3'), 'value'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL';
    const tr = named(icon('eye', 18, 'text-2'), 'trailing'); tr.visible = false; c.appendChild(tr);
  } }))), { desc: '한 줄 입력칸. 인스턴스에서 가로 채우기. 앞 아이콘(검색), 뒤 아이콘(비밀번호 보기)', props: [{ name: 'Text', type: 'TEXT', default: '안내 글', node: 'value' }, { name: 'Show icon', type: 'BOOLEAN', default: false, node: 'icon' }, { name: 'Icon', type: 'INSTANCE_SWAP', default: 'search', node: 'icon' }, { name: 'Show trailing', type: 'BOOLEAN', default: false, node: 'trailing' }, { name: 'Trailing', type: 'INSTANCE_SWAP', default: 'eye', node: 'trailing' }] });
  await makeSet(s, 'Textarea', ['Placeholder', 'Value'].map((ct) => ({ props: { Content: ct }, build: async (c) => {
    auto(c, 'V', { pad: [10, 12], w: 320, fill: 'surface', stroke: 'field-border', radius: 'radius/sm' }); c.minHeight = 96;
    const t = named(await text(ct === 'Value' ? '여러 줄로 쓴 글' : '안내 글', 'Body/15', ct === 'Value' ? 'text' : 'text-3'), 'value'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT';
  } })), { dir: 'H', desc: '여러 줄 입력칸 (최소 높이 96)', props: [{ name: 'Text', type: 'TEXT', default: '안내 글', node: 'value' }] });
  await makeOne(s, 'Select', async (c) => {
    fieldBox(c, 'Default'); const t = named(await text('모든 프로젝트', 'Body/15', 'text'), 'value'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; c.appendChild(icon('chevron-down', 16, 'text-2'));
  }, { desc: '고르기 칸', props: [{ name: 'Text', type: 'TEXT', default: '모든 프로젝트', node: 'value' }] });
  await makeSet(s, 'Checkbox', ['Off', 'On'].map((k) => ({ props: { Checked: k }, build: async (c) => {
    auto(c, 'H', { w: 18, h: 18, main: 'center', cross: 'center', fill: k === 'On' ? 'primary' : 'surface', stroke: k === 'On' ? 'primary' : 'field-border', strokeW: 1.5, radius: 4 });
    if (k === 'On') c.appendChild(icon('check', 14, 'on-ink'));
  } })), { dir: 'H' });
  await makeSet(s, 'Radio', ['Off', 'On'].map((k) => ({ props: { Checked: k }, build: async (c) => {
    auto(c, 'H', { w: 18, h: 18, main: 'center', cross: 'center', fill: 'surface', stroke: k === 'On' ? 'primary' : 'field-border', strokeW: 1.5, radius: 9 });
    if (k === 'On') { const d = figma.createEllipse(); d.resize(8, 8); d.fills = [paint('primary')]; c.appendChild(d); }
  } })), { dir: 'H' });
  await makeSet(s, 'Switch', ['Off', 'On'].map((k) => ({ props: { On: k }, build: async (c) => {
    auto(c, 'H', { w: 38, h: 22, pad: 3, main: k === 'On' ? 'end' : 'start', cross: 'center', fill: k === 'On' ? 'primary' : 'field-border', radius: 11 });
    const d = figma.createEllipse(); d.resize(16, 16); d.fills = [paint('surface')]; c.appendChild(d);
  } })), { dir: 'H', desc: '켜고 끄기 (카드 바꾸기 전에 묻기)' });
  await makeSet(s, 'Segment', ['Off', 'On'].map((k) => ({ props: { Selected: k }, build: async (c) => {
    auto(c, 'H', { gap: 6, pad: [3, 14], cross: 'center', fill: k === 'On' ? 'surface' : null, radius: 'radius/sm' }); c.minHeight = 32;
    const ic = slotIcon('github', 16, k === 'On' ? 'text' : 'text-2'); ic.visible = false; c.appendChild(ic);
    c.appendChild(named(await text('보기', k === 'On' ? 'Small/13.5 Semibold' : 'Small/13.5 Medium', k === 'On' ? 'text' : 'text-2'), 'label'));
  } })), { dir: 'H', desc: '나란한 보기 고르기의 한 칸. 바깥 틀(회색, 안쪽 3)은 화면에서 segmented() 로 만든다', props: [{ name: 'Label', type: 'TEXT', default: '보기', node: 'label' }, { name: 'Show icon', type: 'BOOLEAN', default: false, node: 'icon' }, { name: 'Icon', type: 'INSTANCE_SWAP', default: 'github', node: 'icon' }] });

  /* ===== 탐색 ===== */
  s = await section('탐색', '왼쪽 메뉴. 고른 메뉴는 이름에 형광펜과 굵기');
  await makeSet(s, 'Nav item', ['Default', 'Active'].map((k) => ({ props: { State: k }, build: async (c) => {
    auto(c, 'H', { gap: 10, pad: [6, 10], w: 212, cross: 'center', radius: 'radius/sm' }); c.minHeight = 38;
    c.appendChild(slotIcon('home', 20, k === 'Active' ? 'text' : 'text-2'));
    const t = named(await text('메뉴', k === 'Active' ? 'Body/15 Semibold' : 'Body/15 Medium', k === 'Active' ? 'text' : 'text-2'), 'label');
    c.appendChild(k === 'Active' ? await hlBox(t, 5) : t); spacer(c); c.appendChild(named(await text('0', 'Small/13.5', 'text-3'), 'count'));
  } })), { desc: '왼쪽 메뉴 항목', props: [{ name: 'Label', type: 'TEXT', default: '메뉴', node: 'label' }, { name: 'Icon', type: 'INSTANCE_SWAP', default: 'home', node: 'icon' }, { name: 'Count', type: 'TEXT', default: '0', node: 'count' }, { name: 'Show count', type: 'BOOLEAN', default: false, node: 'count' }] });
  await makeOne(s, 'Project chip', async (c) => { auto(c, 'H', { gap: 5, cross: 'center' }); c.appendChild(icon('folder', 15, 'primary')); c.appendChild(named(await text('프로젝트', 'Small/13.5 Semibold', 'primary'), 'label')); }, { desc: '프로젝트 이름표 (잉크색)', props: [{ name: 'Label', type: 'TEXT', default: '프로젝트', node: 'label' }] });
  await makeSet(s, 'Keyword', ['Default', 'Selected'].map((k) => ({ props: { State: k }, build: async (c) => {
    auto(c, 'H', { pad: k === 'Selected' ? [0, 5] : 0, fill: k === 'Selected' ? 'hl' : null, radius: k === 'Selected' ? MARK_RADIUS : 0 });
    c.appendChild(named(await text('역량', k === 'Selected' ? 'Small/13.5 Semibold' : 'Small/13.5 Medium', k === 'Selected' ? 'text' : 'text-2'), 'label'));
  } })), { dir: 'H', desc: '역량 이름. Selected: 고른 역량(형광펜)', props: [{ name: 'Label', type: 'TEXT', default: '역량', node: 'label' }] });
  await makeSet(s, 'Keyword option', ['Off', 'On'].map((k) => ({ props: { Selected: k }, build: async (c) => {
    auto(c, 'H', { pad: [2, 10], h: 32, cross: 'center', fill: k === 'On' ? 'hl' : 'surface', stroke: k === 'On' ? 'hl' : 'border-strong', radius: 'radius/tag' });
    c.appendChild(named(await text('역량', k === 'On' ? 'Small/13.5 Semibold' : 'Small/13.5 Medium', k === 'On' ? 'text' : 'text-2'), 'label'));
  } })), { dir: 'H', desc: '역량 고르기 모달의 버튼', props: [{ name: 'Label', type: 'TEXT', default: '역량', node: 'label' }] });

  /* ===== 알림과 메뉴 ===== */
  s = await section('알림과 메뉴', '떠 있는 것만 그림자(Elevation/Menu)');
  await makeSet(s, 'Menu item', ['Default', 'Danger'].map((k) => ({ props: { Tone: k }, build: async (c) => {
    auto(c, 'H', { gap: 10, pad: [8, 12], w: 220, cross: 'center', radius: 'radius/sm' }); c.minHeight = 40;
    c.appendChild(slotIcon('edit', 16, k === 'Danger' ? 'danger' : 'text-3'));
    const t = named(await text('메뉴', 'Body/15 Medium', k === 'Danger' ? 'danger' : 'text'), 'label'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL';
  } })), { desc: '드롭다운 메뉴의 한 줄. Danger: 휴지통으로 옮기기 같은 지우는 일', props: [{ name: 'Label', type: 'TEXT', default: '메뉴', node: 'label' }, { name: 'Show icon', type: 'BOOLEAN', default: true, node: 'icon' }, { name: 'Icon', type: 'INSTANCE_SWAP', default: 'edit', node: 'icon' }] });
  await makeOne(s, 'Toast', async (c) => {
    auto(c, 'H', { gap: 16, pad: [12, 16], cross: 'center', fill: 'text', radius: 'radius/md' }); shadow(c, 'Menu'); c.maxWidth = 400;
    c.appendChild(named(await text('알림', 'Body/15', 'on-ink'), 'label')); c.appendChild(named(await text('되돌리기', 'Body/15 Semibold', 'hl'), 'action'));
  }, { desc: '아래 가운데에 잠깐 뜨는 알림. 지운 뒤에는 「되돌리기」', props: [{ name: 'Label', type: 'TEXT', default: '알림', node: 'label' }, { name: 'Action', type: 'TEXT', default: '되돌리기', node: 'action' }, { name: 'Show action', type: 'BOOLEAN', default: true, node: 'action' }] });
  await makeOne(s, 'Tooltip', async (c) => { auto(c, 'H', { pad: [4, 8], fill: 'surface', stroke: 'border-strong', radius: 'radius/sm' }); shadow(c, 'Menu'); c.appendChild(named(await text('설명', 'Caption/12', 'text'), 'label')); }, { props: [{ name: 'Label', type: 'TEXT', default: '설명', node: 'label' }] });
  const BAN = { Info: ['primary-soft', 'primary-ink', 'info'], Warn: ['warn-soft', 'warn', 'warning'], Danger: ['danger-soft', 'danger', 'warning'] };
  await makeSet(s, 'Banner', Object.keys(BAN).map((k) => ({ props: { Tone: k }, build: async (c) => {
    auto(c, 'H', { gap: 10, pad: [12, 16], w: 560, cross: 'center', fill: BAN[k][0], radius: 'radius/md' });
    c.appendChild(icon(ICON_PATHS[BAN[k][2]] ? BAN[k][2] : 'warning', 18, BAN[k][1]));
    const t = named(await text('안내', 'Body/15', BAN[k][1]), 'label'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT';
    expose(c, named(inst('Button', { Variant: 'Secondary', Size: 'Small', Label: '다시 시도' }), 'action')).visible = false;
  } })), { desc: '화면 안 알림. 인스턴스에서 가로 채우기. 오른쪽 단추(action, 다시 시도 등)는 Show action 으로 켜고 글은 banner() 가 바꾼다', props: [{ name: 'Label', type: 'TEXT', default: '안내', node: 'label' }, { name: 'Show action', type: 'BOOLEAN', default: false, node: 'action' }] });

  /* ===== AI 채팅 ===== */
  s = await section('AI 채팅', '대화방 목록, 말풍선, 카드 칩. AI 표시의 형광펜은 「AI가 더한 것」');
  await makeOne(s, 'Chat/AI mark', async (c) => { auto(c, 'H', { w: 24, h: 24, main: 'center', cross: 'center', fill: 'hl', radius: [3, 7, 4, 6] }); c.appendChild(await text('R', 'Mark/12 Heavy', 'text')); }, { desc: 'AI 답 앞의 표시' });
  await makeOne(s, 'Chat/My message', async (c) => {
    auto(c, 'H', { pad: [9, 14], w: 300, fill: 'primary-soft', radius: [12, 12, 3, 12] });
    const t = named(await text('내가 보낸 말', 'Body/15', 'text'), 'label'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT';
  }, { desc: '내 말풍선. 인스턴스 폭은 글에 맞춰 정한다(최대 520)', props: [{ name: 'Text', type: 'TEXT', default: '내가 보낸 말', node: 'label' }] });
  await makeOne(s, 'Chat/Card chip', async (c) => {
    auto(c, 'H', { gap: 8, pad: [6, 12], cross: 'center', fill: 'surface', stroke: 'border-strong', radius: 'radius/sm' });
    c.appendChild(icon('card', 16, 'text-3')); c.appendChild(named(await text('카드 제목', 'Small/13.5 Semibold', 'text'), 'title')); c.appendChild(named(await text('바뀐 칸', 'Small/13.5', 'text-3'), 'fields'));
  }, { desc: 'AI 답 위에 붙는 칩: 이 답에서 바꾼 카드와 칸. 누르면 오른쪽에서 그 카드를 펼친다', props: [{ name: 'Card', type: 'TEXT', default: '카드 제목', node: 'title' }, { name: 'Fields', type: 'TEXT', default: '바뀐 칸', node: 'fields' }] });
  await makeSet(s, 'Chat/Room row', ['Default', 'Active'].map((k) => ({ props: { State: k }, build: async (c) => {
    auto(c, 'H', { gap: 8, pad: [4, 10, 4, 28], w: 232, cross: 'center', radius: 'radius/sm' }); c.minHeight = 38;
    const t = named(await text('대화방 이름', k === 'Active' ? 'Small/13.5 Semibold' : 'Small/13.5', k === 'Active' ? 'text' : 'text-2'), 'label');
    if (k === 'Active') { c.appendChild(await hlBox(t, 5)); spacer(c); } else { c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; t.maxLines = 1; t.textTruncation = 'ENDING'; }
    c.appendChild(named(await text('11/18', 'Caption/12', 'text-3'), 'time'));
  } })), { desc: '대화방 목록의 한 줄. Active: 지금 연 방. 아직 말이 없는 「새 채팅」은 Show time 끔', props: [{ name: 'Name', type: 'TEXT', default: '대화방 이름', node: 'label' }, { name: 'Time', type: 'TEXT', default: '11/18', node: 'time' }, { name: 'Show time', type: 'BOOLEAN', default: true, node: 'time' }] });
  await makeSet(s, 'Chat/Daily row', ['Default', 'Active'].map((k) => ({ props: { State: k }, build: async (c) => {
    auto(c, 'H', { gap: 6, pad: [4, 14, 4, 28], w: 232, cross: 'center', radius: 'radius/sm' }); c.minHeight = 38;
    c.appendChild(icon('calendar', 15, 'text-3'));
    const t = await text('오늘의 질문', k === 'Active' ? 'Small/13.5 Semibold' : 'Small/13.5 Semibold', 'text'); c.appendChild(k === 'Active' ? await hlBox(t, 5) : t);
    spacer(c); const d = figma.createEllipse(); d.name = 'dot'; d.resize(7, 7); d.fills = [paint('primary')]; c.appendChild(d);
  } })), { desc: '프로젝트마다 맨 위에 고정된 「오늘의 질문」 방. 진행 중인 프로젝트에서 오늘 답하지 않았으면 점. 이름 바꾸기·지우기 없음', props: [{ name: 'Unanswered', type: 'BOOLEAN', default: true, node: 'dot' }] });
  await makeOne(s, 'Chat/Day divider', async (c) => {
    auto(c, 'H', { gap: 12, w: 600, cross: 'center', pad: [8, 0, 0, 0] });
    const l1 = figma.createRectangle(); l1.resize(10, 1); l1.fills = [paint('border')]; c.appendChild(l1); l1.layoutSizingHorizontal = 'FILL';
    c.appendChild(named(await text('오늘', 'Caption/12 Semibold', 'text-3'), 'label'));
    const l2 = figma.createRectangle(); l2.resize(10, 1); l2.fills = [paint('border')]; c.appendChild(l2); l2.layoutSizingHorizontal = 'FILL';
  }, { desc: '오늘의 질문 방의 날짜 줄', props: [{ name: 'Label', type: 'TEXT', default: '오늘', node: 'label' }] });
  await makeOne(s, 'Chat/Typing', async (c) => { auto(c, 'H', { gap: 4, h: 24, cross: 'center' }); for (const o of [0.3, 0.6, 1]) { const d = figma.createEllipse(); d.resize(6, 6); d.fills = [paint('text-3')]; d.opacity = o; c.appendChild(d); } }, { desc: 'AI 가 답을 쓰는 중' });

  /* ===== 경험 카드 ===== */
  s = await section('경험 카드', '카드는 테두리 카드(그림자 없음). 고른 카드와 펼친 카드는 잉크색 테두리');
  await makeOne(s, 'Card/Tile', async (c) => {
    auto(c, 'V', { gap: 6, pad: [12, 14], w: 320, fill: 'surface', stroke: 'border-strong', radius: 'radius/md' });
    const t = named(await text('카드 제목', 'Body/15 Semibold', 'text'), 'title'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT';
    const l = named(await text('이력서 한 줄', 'Small/13.5', 'text-2'), 'line'); c.appendChild(l); l.layoutSizingHorizontal = 'FILL'; l.textAutoResize = 'HEIGHT'; l.maxLines = 2; l.textTruncation = 'ENDING';
    c.appendChild(named(await text('역량', 'Caption/12', 'text-2'), 'keywords'));
  }, { desc: 'AI 채팅 오른쪽의 카드 한 장. 누르면 그 자리에서 펼쳐진다', props: [{ name: 'Title', type: 'TEXT', default: '카드 제목', node: 'title' }, { name: 'Resume line', type: 'TEXT', default: '이력서 한 줄', node: 'line' }, { name: 'Keywords', type: 'TEXT', default: '역량', node: 'keywords' }] });
  await makeOne(s, 'Card/Index', async (c) => {
    auto(c, 'V', { w: 363, fill: 'surface', stroke: 'border-strong', radius: 'radius/tag' });
    const top = al('H', { name: 'top', gap: 10, pad: [0, 18], cross: 'center', minH: 40, stroke: 'primary', sides: ['bottom'] }); c.appendChild(top); top.layoutSizingHorizontal = 'FILL';
    const chip = al('H', { name: 'project', gap: 5, cross: 'center' }); top.appendChild(chip); chip.appendChild(icon('folder', 15, 'primary')); chip.appendChild(named(await text('프로젝트', 'Small/13.5 Semibold', 'primary'), 'project'));
    spacer(top); top.appendChild(named(await text('2026.11', 'Small/13.5', 'text-3'), 'period'));
    const gh = al('H', { name: 'github', gap: 4, cross: 'center' }); top.appendChild(gh); gh.appendChild(icon('github', 15, 'text-3')); gh.appendChild(await text('GitHub', 'Small/13.5', 'text-3'));
    const body = al('V', { name: 'body', gap: 8, pad: [12, 18, 16, 18] }); c.appendChild(body); body.layoutSizingHorizontal = 'FILL';
    await tput(body, '경험 카드 제목', 'Card title/16', 'text', { wrap: true, name: 'title' });
    await tput(body, '이력서 한 줄', 'Small/13.5', 'text-2', { wrap: true, name: 'line' });
    const kws = al('H', { name: 'keywords', gap: 14, cross: 'center', wrap: true }); kws.counterAxisSpacing = 4; body.appendChild(kws); kws.layoutSizingHorizontal = 'FILL';
    for (const n of ['kw1', 'kw2', 'kw3']) expose(kws, named(inst('Keyword', { State: 'Default', Label: '역량' }), n));
  }, { desc: '경험 위키 › 전체 카드, 프로젝트의 카드. 위 줄은 프로젝트와 기간(잉크색 밑줄). 역량은 노출한 Keyword 인스턴스 kw1~kw3 (거른 역량은 State=Selected). 화면에서는 indexCard()', props: [{ name: 'Project', type: 'TEXT', default: '프로젝트', node: 'project' }, { name: 'Period', type: 'TEXT', default: '2026.11', node: 'period' }, { name: 'Show GitHub', type: 'BOOLEAN', default: false, node: 'github' }, { name: 'Title', type: 'TEXT', default: '경험 카드 제목', node: 'title' }, { name: 'Resume line', type: 'TEXT', default: '이력서 한 줄', node: 'line' }, { name: 'Show keyword 2', type: 'BOOLEAN', default: true, node: 'kw2' }, { name: 'Show keyword 3', type: 'BOOLEAN', default: true, node: 'kw3' }] });

  /* ===== 목록 ===== */
  s = await section('목록', '목록 줄: 높이 56 이상, 아래 테두리. 인스턴스에서 가로 채우기');
  await makeOne(s, 'List row', async (c) => {
    auto(c, 'H', { gap: 12, pad: [11, 8], w: 760, cross: 'center', stroke: 'border', sides: ['bottom'] }); c.minHeight = 56;
    c.appendChild(slotIcon('folder', 18, 'text-3'));
    const m = al('V', { name: 'main', gap: 1 }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
    await tput(m, '제목', 'Body/15 Semibold', 'text', { wrap: true, name: 'title' }); await tput(m, '설명', 'Small/13.5', 'text-3', { wrap: true, name: 'sub' });
    c.appendChild(named(await text('메타', 'Small/13.5', 'text-3'), 'meta'));
  }, { desc: '일반 목록 줄 (휴지통, 홈의 대화방 등)', props: [{ name: 'Title', type: 'TEXT', default: '제목', node: 'title' }, { name: 'Subtitle', type: 'TEXT', default: '설명', node: 'sub' }, { name: 'Show subtitle', type: 'BOOLEAN', default: true, node: 'sub' }, { name: 'Meta', type: 'TEXT', default: '메타', node: 'meta' }, { name: 'Show meta', type: 'BOOLEAN', default: true, node: 'meta' }, { name: 'Show icon', type: 'BOOLEAN', default: true, node: 'icon' }, { name: 'Icon', type: 'INSTANCE_SWAP', default: 'folder', node: 'icon' }] });
  await makeSet(s, 'Wiki/Project row', ['Ongoing', 'Done'].map((k) => ({ props: { State: k }, build: async (c) => {
    auto(c, 'H', { gap: 12, pad: [11, 8], w: 1120, cross: 'center', fill: 'surface', stroke: 'border', sides: ['bottom'] }); c.minHeight = 72;
    c.appendChild(icon('folder', 18, 'text-3'));
    const m = al('V', { name: 'main', gap: 2 }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
    const line = al('H', { name: 'name', gap: 8, cross: 'center' }); m.appendChild(line); line.appendChild(named(await text('프로젝트 이름', 'Body/15 Semibold', 'text'), 'name'));
    if (k === 'Ongoing') line.appendChild(inst('Tag', { Tone: 'Ink', Label: '진행중' }));
    const meta = al('H', { name: 'meta', gap: 14, cross: 'center' }); m.appendChild(meta);
    meta.appendChild(named(await text('2026.09부터', 'Small/13.5', 'text-3'), 'period')); meta.appendChild(named(await text('역할', 'Small/13.5', 'text-3'), 'role'));
    const repo = al('H', { name: 'repo', gap: 4, cross: 'center' }); meta.appendChild(repo); repo.appendChild(icon('github', 15, 'text-3')); repo.appendChild(named(await text('repo-name', 'Small/13.5', 'text-3'), 'repoName'));
    c.appendChild(named(await text('카드 0장', 'Small/13.5', 'text-3'), 'count'));
    const st = al('H', { name: 'state', gap: 4, w: 124, main: 'end', cross: 'center' }); c.appendChild(st);
    if (k === 'Ongoing') st.appendChild(inst('Button', { Variant: 'Secondary', Size: 'Small', Label: '프로젝트 완료', 'Show icon': true, Icon: 'check' }));
    else { st.appendChild(icon('check', 16, 'text-2')); st.appendChild(await text('완료', 'Small/13.5', 'text-2')); }
  } })), { desc: '경험 위키 › 프로젝트 목록의 한 줄', props: [{ name: 'Name', type: 'TEXT', default: '프로젝트 이름', node: 'name' }, { name: 'Period', type: 'TEXT', default: '2026.09부터', node: 'period' }, { name: 'Role', type: 'TEXT', default: '역할', node: 'role' }, { name: 'Repo', type: 'TEXT', default: 'repo-name', node: 'repoName' }, { name: 'Show repo', type: 'BOOLEAN', default: true, node: 'repo' }, { name: 'Cards', type: 'TEXT', default: '카드 0장', node: 'count' }] });
  await makeSet(s, 'Repo/Choice', ['Default', 'Selected', 'Disabled'].map((k) => ({ props: { State: k }, build: async (c) => {
    auto(c, 'H', { gap: 12, pad: [13, 16], w: 712, cross: 'center', fill: 'surface', stroke: k === 'Selected' ? 'primary' : 'border-strong', radius: 'radius/md', opacity: k === 'Disabled' ? 0.55 : 1 });
    c.appendChild(inst('Radio', { Checked: k === 'Selected' ? 'On' : 'Off' }));
    const m = al('V', { name: 'main', gap: 2 }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
    const name = named(await text('repo-name', 'Body/15 Semibold', 'text'), 'name'); m.appendChild(k === 'Selected' ? await hlBox(name) : name);
    await tput(m, '레포 설명', 'Small/13.5', 'text-2', { name: 'desc' });
    c.appendChild(named(await text('TypeScript    2026.11', 'Small/13.5', 'text-3'), 'meta'));
  } })), { desc: '「새 프로젝트」 › GitHub에서 가져오기의 레포 한 칸. Disabled: 다른 프로젝트에 연결된 레포', props: [{ name: 'Name', type: 'TEXT', default: 'repo-name', node: 'name' }, { name: 'Description', type: 'TEXT', default: '레포 설명', node: 'desc' }, { name: 'Meta', type: 'TEXT', default: 'TypeScript    2026.11', node: 'meta' }] });
  await makeSet(s, 'Repo/Draft', ['Off', 'On'].map((k) => ({ props: { Selected: k }, build: async (c) => {
    auto(c, 'H', { gap: 12, pad: [14, 16], w: 620, fill: 'surface', stroke: k === 'On' ? 'primary' : 'border-strong', strokeW: k === 'On' ? 1.5 : 1, radius: 'radius/md' });
    c.appendChild(inst('Checkbox', { Checked: k }));
    const m = al('V', { name: 'main', gap: 4 }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
    const t = named(await text('작업 제목', 'Body/15 Semibold', 'text'), 'title'); m.appendChild(k === 'On' ? await hlBox(t) : t);
    await tput(m, '이력서 한 줄', 'Small/13.5', 'text-2', { wrap: true, name: 'line' }); await tput(m, '역량', 'Small/13.5 Medium', 'text-2', { name: 'keywords' });
    const more = al('H', { name: 'more', gap: 8, cross: 'center', pad: [4, 0, 0, 0] }); m.appendChild(more);
    more.appendChild(icon('chevron-right', 14, 'text-3')); more.appendChild(await text('자세히 보기', 'Small/13.5 Medium', 'text-2')); more.appendChild(named(await text('커밋 3개  PR 1개  코드 2곳', 'Small/13.5', 'text-3'), 'evidence'));
  } })), { desc: '레포 분석에서 찾은 작업. 고른 것은 잉크 테두리와 제목 형광펜', props: [{ name: 'Title', type: 'TEXT', default: '작업 제목', node: 'title' }, { name: 'Resume line', type: 'TEXT', default: '이력서 한 줄', node: 'line' }, { name: 'Keywords', type: 'TEXT', default: '역량', node: 'keywords' }, { name: 'Evidence', type: 'TEXT', default: '커밋 3개  PR 1개  코드 2곳', node: 'evidence' }, { name: 'Show more', type: 'BOOLEAN', default: true, node: 'more' }] });
  await makeOne(s, 'Repo/Made card', async (c) => {
    auto(c, 'H', { gap: 12, pad: [10, 12], w: 620, cross: 'center', fill: 'surface', stroke: 'border', sides: ['bottom'] });
    c.appendChild(icon('card', 18, 'text-3'));
    const m = al('V', { name: 'main', gap: 4 }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
    await tput(m, '경험 카드 제목', 'Small/13.5 Semibold', 'text', { name: 'title' });
    const sub = al('H', { name: 'sub', gap: 10, cross: 'center' }); m.appendChild(sub); sub.appendChild(inst('Project chip', { Label: '모여봄' })); sub.appendChild(named(await text('비어 있는 칸: 결과', 'Small/13.5', 'text-3'), 'empty'));
    c.appendChild(inst('Button', { Variant: 'Secondary', Size: 'Small', Label: '카드 보기' }));
  }, { desc: '레포 분석으로 만든 카드 한 줄', props: [{ name: 'Title', type: 'TEXT', default: '경험 카드 제목', node: 'title' }, { name: 'Empty fields', type: 'TEXT', default: '비어 있는 칸: 결과', node: 'empty' }, { name: 'Show empty', type: 'BOOLEAN', default: true, node: 'empty' }] });

  /* ===== GitHub 분석과 근거 ===== */
  s = await section('GitHub 분석과 근거', '레포 분석 단계, 찾은 작업의 STAR, 카드의 근거(커밋 · PR · 코드). 근거 묶음은 화면에서 evidence() 로 그린다');
  await makeSet(s, 'Analysis/Step', ['Done', 'Current', 'Pending'].map((k) => ({ props: { State: k }, build: async (c) => {
    auto(c, 'H', { gap: 12, w: 560, cross: 'start' }); c.minHeight = 24;
    const holder = al('H', { name: 'mark', pad: [2, 0, 0, 0] }); c.appendChild(holder);
    if (k === 'Current') holder.appendChild(spinner(20)); // 앱의 .steps .is-now: 도는 원
    else {
      const m = al('H', { name: 'circle', w: 20, h: 20, main: 'center', cross: 'center', radius: 10, fill: k === 'Done' ? 'primary' : null, stroke: k === 'Done' ? 'primary' : 'border-strong', strokeW: 2 }); holder.appendChild(m);
      if (k === 'Done') m.appendChild(icon('check', 14, 'on-ink'));
    }
    const t = named(await text('단계', k === 'Current' ? 'Body/15 Semibold' : 'Body/15', { Done: 'text-2', Current: 'text', Pending: 'text-3' }[k]), 'label');
    c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT';
  } })), { desc: 'GitHub 레포 분석의 한 단계. Done: 잉크색 원과 체크, Current: 도는 원과 굵은 글, Pending: 빈 원. 인스턴스에서 가로 채우기', props: [{ name: 'Label', type: 'TEXT', default: '단계', node: 'label' }] });
  await makeSet(s, 'Repo/STAR row', ['Value', 'Empty'].map((k) => ({ props: { Content: k }, build: async (c) => {
    auto(c, 'H', { gap: 12, pad: [4, 0], w: 640, cross: 'start' });
    const dt = named(await text('상황', 'Small/13.5', 'text-3'), 'label'); c.appendChild(dt); dt.resize(44, dt.height); dt.textAutoResize = 'HEIGHT';
    const dd = named(await text(k === 'Empty' ? '비어 있어요. AI 채팅에서 채울 수 있어요.' : '내용', 'Small/13.5', k === 'Empty' ? 'text-3' : 'text'), 'value'); c.appendChild(dd); dd.layoutSizingHorizontal = 'FILL'; dd.textAutoResize = 'HEIGHT';
  } })), { desc: '레포 분석에서 찾은 작업의 상황 · 과제 · 행동 · 결과 한 줄 (자세히 보기). Empty: 「비어 있어요. AI 채팅에서 채울 수 있어요.」', props: [{ name: 'Label', type: 'TEXT', default: '상황', node: 'label' }, { name: 'Text', type: 'TEXT', default: '내용', node: 'value' }] });
  await makeOne(s, 'Evidence/Row', async (c) => {
    auto(c, 'H', { gap: 10, pad: [6, 0], w: 640, cross: 'start' });
    c.appendChild(named(await text('1c5b9e7', 'Small/13.5 Semibold', 'text-2'), 'id'));
    const m = named(await text('커밋 메시지', 'Small/13.5', 'text'), 'message'); c.appendChild(m); m.layoutSizingHorizontal = 'FILL'; m.textAutoResize = 'HEIGHT';
    c.appendChild(named(await text('10월 27일', 'Small/13.5', 'text-3'), 'date'));
  }, { desc: 'GitHub 근거의 커밋(sha 7자리) 또는 PR(#번호) 한 줄. 날짜는 M월 D일. 예시 레포는 링크가 없다. 인스턴스에서 가로 채우기', props: [{ name: 'Id', type: 'TEXT', default: '1c5b9e7', node: 'id' }, { name: 'Message', type: 'TEXT', default: '커밋 메시지', node: 'message' }, { name: 'Date', type: 'TEXT', default: '10월 27일', node: 'date' }] });
  await makeSet(s, 'Evidence/Code line', ['Off', 'On'].map((k) => ({ props: { Highlight: k }, build: async (c) => {
    auto(c, 'H', { gap: 12, pad: [0, 14, 0, 0], w: 640, fill: k === 'On' ? 'primary-soft' : null });
    c.appendChild(named(await text('1', 'Mono/12', 'text-3', { w: 32, align: 'right' }), 'number'));
    c.appendChild(named(await text('code', 'Mono/12', 'text'), 'code'));
  } })), { desc: '근거 코드 한 줄: 줄 번호(32, 오른쪽 맞춤) + 코드(고정폭, 줄바꿈 없음). Highlight=On: 근거가 되는 줄(잉크 연한 바탕). 인스턴스에서 가로 채우기', props: [{ name: 'Number', type: 'TEXT', default: '1', node: 'number' }, { name: 'Code', type: 'TEXT', default: 'code', node: 'code' }] });
  return root;
}
