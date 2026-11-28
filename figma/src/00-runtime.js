/* 공용 도구: 모든 파일이 함께 쓰는 상수와 함수.
   - 색은 변수(Variables)로, 글자는 텍스트 스타일로만 칠한다. 화면 파일에서 hex 나 글자 크기를 직접 쓰지 않는다
   - 레이아웃은 오토 레이아웃(al)으로. 위치를 직접 정하는 건 겹쳐 띄우는 것(모달, 메뉴, 툴팁)뿐
   화면 파일이 쓰는 것: al, put, text, icon, inst, setNested, paint, stroke, radius, shadow, SCREENS (아래와 40-patterns.js) */

const SCREENS = [];   // 화면 파일이 SCREENS.push({ group, title, h?, build: async (frame) => {} }) 로 등록한다
const EXTRA_COMPONENTS = []; // 화면 파일이 자기만 쓰는 컴포넌트를 더할 때: EXTRA_COMPONENTS.push({ title, build: async (row) => { await makeOne(row, …) } })
const LIB = {};       // 컴포넌트 이름 → COMPONENT | COMPONENT_SET (30-components.js 가 채운다)
const TOKENS = {};    // 'text' → 색 변수, 'radius/md' → 숫자 변수
const STYLES = {};    // 'Body/15' → 텍스트 스타일
const EFFECTS = {};   // 'Menu' | 'Modal' → 그림자 스타일
const V1 = { prefix: 'v1', collection: 'Rewrite v1', page: 'Rewrite v1', oldPages: ['v1 Foundations', 'v1 Components', 'v1 Screens'] };

/* ---------- 색: 앱의 CSS 변수(prototype/css/styles.css)와 같은 값 ---------- */
const COLORS = {
  bg: '#ffffff', surface: '#ffffff', 'surface-2': '#f3f5f8', 'surface-3': '#e8ecf1',
  border: '#e1e5eb', 'border-strong': '#c8cfd9', 'field-border': '#848e9d',
  text: '#18202e', 'text-2': '#465164', 'text-3': '#5d6878', 'on-ink': '#ffffff', 'on-ink-2': '#d3d9e2',
  primary: '#24426f', 'primary-hover': '#182f53', 'primary-soft': '#e9eef6', 'primary-ink': '#1d3760',
  hl: '#ffeb66', 'hl-soft': '#fff8cf',
  success: '#1c7349', 'success-soft': '#e5f3eb', danger: '#bd2f28', 'danger-soft': '#fcebe9', warn: '#855600', 'warn-soft': '#fdf1db',
  'record-0': '#e8ecf1', 'record-1': '#c9d4e3', 'record-2': '#93a9c8', 'record-3': '#5a7aa6', 'record-4': '#24426f', // 잔디: 잉크색 한 가지, 연할수록 적게
};
const NUMBERS = { 'radius/sm': 6, 'radius/md': 8, 'radius/lg': 14, 'radius/tag': 4, 'radius/pill': 999 };
const rgb = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });

// 변수에 묶인 단색 칠 (변수가 아직 없으면 같은 색의 칠)
function paint(token, opacity) {
  const hex = COLORS[token]; if (!hex) throw new Error(`없는 색 토큰: ${token}`);
  const p = Object.assign({ type: 'SOLID', color: rgb(hex) }, opacity != null ? { opacity } : {});
  return TOKENS[token] ? figma.variables.setBoundVariableForPaint(p, 'color', TOKENS[token]) : p;
}
const fills = (token, opacity) => (token ? [paint(token, opacity)] : []);
// 테두리: sides 를 주면 그쪽만 ('top' | 'bottom' | 'left' | 'right' 의 배열)
function stroke(node, token, w = 1, sides) {
  node.strokes = [paint(token)];
  if (!sides) { node.strokeWeight = w; return node; }
  for (const s of ['Top', 'Bottom', 'Left', 'Right']) node[`stroke${s}Weight`] = sides.includes(s.toLowerCase()) ? w : 0;
  return node;
}
// 모서리: 숫자나 'radius/md' 같은 토큰
function radius(node, r) {
  if (typeof r === 'number') { node.cornerRadius = r; return node; }
  if (Array.isArray(r)) { [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius] = r; return node; }
  node.cornerRadius = NUMBERS[r];
  if (TOKENS[r]) for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) node.setBoundVariable(f, TOKENS[r]);
  return node;
}
const MARK_RADIUS = [2, 5, 3, 4]; // 형광펜 모서리 (--radius-mark)
// 그림자 스타일. Figma 는 비동기로만 붙일 수 있어서 기다릴 일을 PENDING 에 모으고, main 이 끝에서 한꺼번에 기다린다
const PENDING = [];
const shadow = (node, kind) => { PENDING.push(node.setEffectStyleIdAsync(EFFECTS[kind].id)); return node; };

/* ---------- 오토 레이아웃 ---------- */
// al('H' | 'V', { name, gap, pad, fill, stroke, sides, radius, w, h, main, cross, wrap, clip, minH, minW, opacity })
//   pad: 숫자 | [세로, 가로] | [위, 오른쪽, 아래, 왼쪽] · main/cross: 'start' | 'center' | 'end' | 'between'(main) | 'baseline'(cross)
//   w/h 를 주면 그 축은 고정, 안 주면 내용에 맞춘다(hug)
const ALIGN = { start: 'MIN', center: 'CENTER', end: 'MAX', between: 'SPACE_BETWEEN', baseline: 'BASELINE' };
function al(dir, o = {}) {
  const f = figma.createFrame();
  f.name = o.name || (dir === 'H' ? 'row' : 'stack'); f.layoutMode = dir === 'H' ? 'HORIZONTAL' : 'VERTICAL';
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.fills = fills(o.fill); f.clipsContent = !!o.clip;
  if (o.w != null || o.h != null) {
    f.resize(o.w != null ? o.w : 10, o.h != null ? o.h : 10);
    const wFixed = o.w != null; const hFixed = o.h != null;
    if (dir === 'H') { f.primaryAxisSizingMode = wFixed ? 'FIXED' : 'AUTO'; f.counterAxisSizingMode = hFixed ? 'FIXED' : 'AUTO'; }
    else { f.primaryAxisSizingMode = hFixed ? 'FIXED' : 'AUTO'; f.counterAxisSizingMode = wFixed ? 'FIXED' : 'AUTO'; }
  }
  if (o.gap != null) f.itemSpacing = o.gap;
  if (o.pad != null) {
    const p = typeof o.pad === 'number' ? [o.pad, o.pad, o.pad, o.pad] : o.pad.length === 2 ? [o.pad[0], o.pad[1], o.pad[0], o.pad[1]] : o.pad;
    [f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft] = p;
  }
  if (o.main) f.primaryAxisAlignItems = ALIGN[o.main];
  if (o.cross) f.counterAxisAlignItems = ALIGN[o.cross];
  if (o.wrap) f.layoutWrap = 'WRAP';
  if (o.stroke) stroke(f, o.stroke, o.strokeW || 1, o.sides);
  if (o.radius != null) radius(f, o.radius);
  if (o.minH) f.minHeight = o.minH; if (o.minW) f.minWidth = o.minW; if (o.maxW) f.maxWidth = o.maxW;
  if (o.opacity != null) f.opacity = o.opacity;
  return f;
}
// 부모에 넣고 크기 방식을 정한다. o: { fill: 가로 채우기, fillV: 세로 채우기, at: [x, y] 겹쳐 띄우기(부모가 오토 레이아웃이 아닐 때) }
function put(parent, child, o = {}) {
  parent.appendChild(child);
  if (o.fill) child.layoutSizingHorizontal = 'FILL';
  if (o.fillV) child.layoutSizingVertical = 'FILL';
  if (o.at) { child.x = o.at[0]; child.y = o.at[1]; }
  return child;
}
// 빈 칸: 가로로 늘어나는 빈 틀(spacer) 또는 정해진 크기의 틈(gap)
function spacer(parent) { const s = figma.createFrame(); s.name = 'spacer'; s.fills = []; s.resize(1, 1); parent.appendChild(s); s.layoutSizingHorizontal = 'FILL'; return s; }
function gap(parent, h, w = 1) { const s = figma.createFrame(); s.name = 'gap'; s.fills = []; s.resize(w, h); parent.appendChild(s); return s; }

/* ---------- 글자 ---------- */
// text('내용', 'Body/15', 'text', { wrap: 부모 폭에 맞춰 줄바꿈, w: 고정 폭, align: 'center'|'right', maxLines, underline, name })
// wrap 은 부모에 넣은 다음 정한다 → put 대신 tput 을 쓴다
async function text(chars, style, color = 'text', o = {}) {
  const st = STYLES[style]; if (!st) throw new Error(`없는 텍스트 스타일: ${style}`);
  const t = figma.createText(); await t.setTextStyleIdAsync(st.id);
  t.characters = String(chars); t.fills = fills(color); t.name = o.name || String(chars).slice(0, 24);
  if (o.align) t.textAlignHorizontal = { center: 'CENTER', right: 'RIGHT' }[o.align];
  if (o.underline) t.textDecoration = 'UNDERLINE';
  if (o.w) { t.resize(o.w, t.height); t.textAutoResize = 'HEIGHT'; }
  if (o.maxLines) { t.maxLines = o.maxLines; t.textTruncation = 'ENDING'; }
  return t;
}
// 글자를 부모에 넣는다. wrap: 부모 폭을 채우며 줄바꿈
async function tput(parent, chars, style, color, o = {}) {
  const t = await text(chars, style, color, o); parent.appendChild(t);
  if (o.wrap || o.fill) { t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; }
  if (o.maxLines) { t.maxLines = o.maxLines; t.textTruncation = 'ENDING'; }
  return t;
}

/* ---------- 컴포넌트 인스턴스 ---------- */
// inst('Button', { Variant: 'Primary', Size: 'Medium', Label: '저장', Icon: 'check' })
//   VARIANT 속성은 이름 그대로, TEXT/BOOLEAN 은 이름(# 앞)으로, INSTANCE_SWAP 은 아이콘 이름이나 컴포넌트 이름으로
function inst(name, props = {}) {
  const c = LIB[name]; if (!c) throw new Error(`없는 컴포넌트: ${name}`);
  const defs = c.componentPropertyDefinitions;
  let target = c;
  if (c.type === 'COMPONENT_SET') {
    const want = Object.entries(props).filter(([k]) => defs[k] && defs[k].type === 'VARIANT');
    target = c.children.find((v) => want.every(([k, val]) => v.name.split(', ').includes(`${k}=${val}`))) || c.defaultVariant;
    if (!target) throw new Error(`${name}: 맞는 변형이 없어요 ${JSON.stringify(props)}`);
  }
  const i = target.createInstance(); const set = {};
  for (const [k, v] of Object.entries(props)) {
    if (defs[k] && defs[k].type === 'VARIANT') continue;
    const key = Object.keys(defs).find((d) => d.split('#')[0] === k); if (!key) throw new Error(`${name}: 없는 속성 ${k}`);
    if (defs[key].type === 'INSTANCE_SWAP') { const sw = LIB[`Icon/${v}`] || LIB[v]; if (!sw) throw new Error(`없는 아이콘/컴포넌트: ${v}`); set[key] = sw.id; }
    else set[key] = defs[key].type === 'BOOLEAN' ? !!v : String(v);
  }
  if (Object.keys(set).length) i.setProperties(set);
  return i;
}
// 인스턴스 안에 노출된 인스턴스(isExposedInstance)의 속성 바꾸기: setNested(banner, 'action', { Label: '다시 시도' })
//   inst() 와 같은 규칙. VARIANT 도 이름=값으로 바꿀 수 있다
function setNested(owner, layer, props) {
  const n = owner.findOne((x) => x.type === 'INSTANCE' && x.name === layer); if (!n) throw new Error(`${owner.name}: ${layer} 레이어가 없어요`);
  const defs = n.componentProperties; const set = {};
  for (const [k, v] of Object.entries(props)) {
    const key = Object.keys(defs).find((d) => d === k || d.split('#')[0] === k); if (!key) throw new Error(`${layer}: 없는 속성 ${k}`);
    const type = defs[key].type;
    if (type === 'INSTANCE_SWAP') { const sw = LIB[`Icon/${v}`] || LIB[v]; if (!sw) throw new Error(`없는 아이콘/컴포넌트: ${v}`); set[key] = sw.id; }
    else set[key] = type === 'BOOLEAN' ? !!v : String(v);
  }
  n.setProperties(set); return n;
}
// 아이콘: Icon/<이름> 인스턴스. 크기를 맞추고 선 색을 토큰으로 바꾼다
function icon(name, size = 20, color = 'text-2') {
  const i = inst(`Icon/${name}`); i.resize(size, size); recolor(i, color); return i;
}
// 아이콘(또는 아이콘이 든 인스턴스)의 선·채움 색을 바꾼다
function recolor(node, color) {
  for (const v of node.findAll((n) => n.type === 'VECTOR')) {
    if (v.strokes && v.strokes.length) v.strokes = [paint(color)];
    if (v.fills && v.fills.length) v.fills = [paint(color)];
  }
  return node;
}
// SVG 를 벡터로 (아이콘 컴포넌트를 만들 때만 쓴다)
function svgNode(body, size, hex = '#465164', sw = 1.6) {
  const n = figma.createNodeFromSvg(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${hex}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${body.replace(/currentColor/g, hex)}</svg>`);
  n.resize(size, size); return n;
}
