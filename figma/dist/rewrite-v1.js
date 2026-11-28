/* Rewrite v1 디자인 — 자동으로 만든 파일이에요. 고치려면 figma/src 를 고치고 `node figma/build.js` 를 다시 실행하세요.
   실행: Figma 데스크톱 앱에서 파일을 열고 Plugins → Scripter 에 이 파일 내용을 통째로 붙여 넣은 뒤 ▶.
   만드는 것: 「Rewrite v1」 페이지 하나에 기초(색, 글자), 컴포넌트, 화면. 다시 실행하면 그 페이지 안만 지우고 새로 그려요 (Starter 플랜의 페이지 3개 제한 안에서).
   빌드: 2026-11-28 09:03 */

const ICON_PATHS = {"home":"<path d=\"M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z\"/>","chat":"<path d=\"M5 5h14a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-7L7.5 20v-3.5H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z\"/><path d=\"M8 9.2h8M8 12.5h5\"/>","timeline":"<path d=\"M3.5 6.5h17M7 6.5v5.5a2.5 2.5 0 0 0 2.5 2.5H15M12 14.5v1.5a2.5 2.5 0 0 0 2.5 2.5h4\"/><circle cx=\"7\" cy=\"6.5\" r=\"1.6\"/><circle cx=\"16.5\" cy=\"14.5\" r=\"1.6\"/><circle cx=\"20\" cy=\"18.5\" r=\"1.4\"/>","wiki":"<path d=\"M12 6.5C10.3 5.4 7.6 5 4 5v13c3.6 0 6.3.4 8 1.5 1.7-1.1 4.4-1.5 8-1.5V5c-3.6 0-6.3.4-8 1.5z\"/><path d=\"M12 6.5v13\"/>","resume":"<path d=\"M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z\"/><circle cx=\"9.5\" cy=\"8.5\" r=\"1.6\"/><path d=\"M13.5 8.5H16M8 13h8M8 16.5h5\"/>","building":"<path d=\"M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M14 10h4a1 1 0 0 1 1 1v9M3 20h18\"/><path d=\"M8 8h3M8 12h3M8 16h3M16.5 14v2\"/>","settings":"<path d=\"M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9\"/><circle cx=\"15\" cy=\"7.5\" r=\"2\"/><circle cx=\"9\" cy=\"16.5\" r=\"2\"/>","trash":"<path d=\"M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12a1 1 0 0 0 1 1h7.4a1 1 0 0 0 1-1l.8-12M10.3 11v5M13.7 11v5\"/>","plus":"<path d=\"M12 5v14M5 12h14\"/>","search":"<circle cx=\"11\" cy=\"11\" r=\"6\"/><path d=\"m15.5 15.5 4.5 4.5\"/>","github":"<path d=\"M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22\"/>","link":"<path d=\"M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7L12 6.3\"/><path d=\"M14 10a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.1-1.1\"/>","unlink":"<path d=\"m13.5 17-1.7 1.7a4 4 0 0 1-5.7-5.7L7.5 11.5M10.5 7l1.7-1.7a4 4 0 0 1 5.7 5.7l-1.4 1.5\"/><path d=\"M4 8.5h2.5M8.5 4v2.5M20 15.5h-2.5M15.5 20v-2.5\"/>","external":"<path d=\"M13.5 4.5h6v6M19.5 4.5 11 13M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10\"/>","edit":"<path d=\"m4.5 19.5.8-3.8L16 5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8.3 18.7zM14 7l3 3\"/>","more":"<g fill=\"currentColor\" stroke=\"none\"><circle cx=\"5.5\" cy=\"12\" r=\"1.5\"/><circle cx=\"12\" cy=\"12\" r=\"1.5\"/><circle cx=\"18.5\" cy=\"12\" r=\"1.5\"/></g>","close":"<path d=\"m6 6 12 12M18 6 6 18\"/>","check":"<path d=\"m5 12.5 4.5 4.5L19 7\"/>","chevron-down":"<path d=\"m6 9.5 6 6 6-6\"/>","chevron-up":"<path d=\"m6 14.5 6-6 6 6\"/>","chevron-right":"<path d=\"m9.5 6 6 6-6 6\"/>","chevron-left":"<path d=\"m14.5 6-6 6 6 6\"/>","arrow-up":"<path d=\"M12 19V5M6 11l6-6 6 6\"/>","calendar":"<path d=\"M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10.5h16M8.5 3.5V7M15.5 3.5V7\"/>","sparkle":"<path d=\"M11 4.5c.7 4.2 2.3 5.8 6.5 6.5-4.2.7-5.8 2.3-6.5 6.5-.7-4.2-2.3-5.8-6.5-6.5 4.2-.7 5.8-2.3 6.5-6.5zM18.5 15.5v5M16 18h5\"/>","folder":"<path d=\"M4 18V6.5a1 1 0 0 1 1-1h4.2l2 2.5H19a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z\"/>","card":"<path d=\"M4.5 5h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z\"/><path d=\"M7 9.5h6M7 13h10M7 16h7\"/>","restore":"<path d=\"M8.5 13.5 4 9l4.5-4.5\"/><path d=\"M4 9h10a5.5 5.5 0 0 1 0 11H9\"/>","logout":"<path d=\"M10 4.5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12h-9\"/>","user":"<circle cx=\"12\" cy=\"8.5\" r=\"3.7\"/><path d=\"M4.8 20c.7-3.5 3.5-5.3 7.2-5.3s6.5 1.8 7.2 5.3\"/>","copy":"<path d=\"M9.5 8.5h9a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z\"/><path d=\"M15.5 8.5V5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9.5a1 1 0 0 0 1 1h3\"/>","print":"<path d=\"M7.5 9V4h9v5M7.5 16.5H5a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1h-2.5M7.5 14h9v6h-9z\"/>","send":"<path d=\"m4 11.5 16-7-6.5 16-3-6.5zM10.5 14 20 4.5\"/>","history":"<path d=\"M4.5 12A7.5 7.5 0 1 0 7 6.4L4.5 8.5M4.5 4.5v4h4M12 8v4.3l3 1.8\"/>","eye":"<path d=\"M3 12c2-4 5.2-6 9-6s7 2 9 6c-2 4-5.2 6-9 6s-7-2-9-6z\"/><circle cx=\"12\" cy=\"12\" r=\"2.7\"/>","lock":"<path d=\"M6.5 10.5h11a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14v2.5\"/>","file":"<path d=\"M6.5 3.5H14l4.5 4.5v11.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1zM13.5 3.8V8.5h4.7\"/>","refresh":"<path d=\"M19.5 11A7.6 7.6 0 0 0 5.8 8L4.5 9.5M4.5 4.8v4.7h4.7M4.5 13a7.6 7.6 0 0 0 13.7 3l1.3-1.5M19.5 19.2v-4.7h-4.7\"/>","menu":"<path d=\"M4 7h16M4 12h16M4 17h16\"/>","warning":"<path d=\"M12 4.5 21 19.5H3zM12 10v4.5\"/><circle cx=\"12\" cy=\"17\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>"};

/* ===== 00-runtime.js ===== */
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

/* ===== 10-foundations.js ===== */
/* 기초: 글꼴, 색 변수, 텍스트 스타일, 그림자 스타일, 페이지. 그리고 기초 견본(색과 글자)(색과 글자 견본)
   다시 실행하면 v1 로 시작하는 스타일과 「Rewrite v1」 변수 모음, v1 페이지 세 개를 지우고 새로 만든다 */

/* ---------- 글꼴: 이 컴퓨터에 Pretendard 가 있으면 Pretendard, 없으면 Noto Sans KR ---------- */
const FONT = { family: 'Noto Sans KR', weights: {}, mono: null };
async function pickFonts() {
  const all = await figma.listAvailableFontsAsync(); const has = (f, s) => all.some((x) => x.fontName.family === f && x.fontName.style === s);
  const pre = ['Pretendard', 'Pretendard Variable'].find((f) => has(f, 'Regular') && has(f, 'Bold'));
  if (pre) { FONT.family = pre; FONT.weights = { 400: 'Regular', 500: 'Medium', 600: has(pre, 'SemiBold') ? 'SemiBold' : 'Bold', 700: 'Bold', 800: has(pre, 'ExtraBold') ? 'ExtraBold' : 'Bold' }; }
  else { FONT.family = 'Noto Sans KR'; FONT.weights = { 400: 'Regular', 500: 'Medium', 600: 'Bold', 700: 'Bold', 800: 'Black' }; }
  FONT.mono = ['Roboto Mono', 'JetBrains Mono', 'Source Code Pro', 'IBM Plex Mono', 'Courier New'].map((f) => ({ family: f, style: 'Regular' })).find((f) => has(f.family, 'Regular'));
}

/* ---------- 텍스트 스타일: 앱의 글자 크기 다섯 개(12·13.5·15·17·24)와 소개 문구 34 ---------- */
const TYPE = [
  // [이름, 크기, 줄 높이, 굵기, 설명]
  ['Display/34', 34, 46, 700, '로그인 소개 문구'],
  ['Heading/24', 24, 32, 700, '화면 제목 (h1). 한 화면에 하나'],
  ['Title/17', 17, 24, 700, '섹션 제목, 모달 제목, 펼친 카드 제목'],
  ['Body/15', 15, 25.5, 400, '본문, 대화, 입력칸'],
  ['Body/15 Medium', 15, 22, 500, '메뉴 이름, 버튼(보조)'],
  ['Body/15 Semibold', 15, 22, 600, '목록 제목, 버튼, 카드 제목'],
  ['Small/13.5', 13.5, 20, 400, '보조 글, 메타 정보'],
  ['Small/13.5 Medium', 13.5, 20, 500, '작은 버튼, 칩, 역량'],
  ['Small/13.5 Semibold', 13.5, 20, 600, '라벨, 칸 이름, 강조한 작은 글'],
  ['Caption/12', 12, 16, 400, '시간, 이메일, 달'],
  ['Caption/12 Semibold', 12, 16, 600, '태그, 날짜 줄'],
  ['Mark/15 Heavy', 15, 15, 800, '로고의 R'],
  ['Mark/12 Heavy', 12, 12, 800, 'AI 표시의 R'],
  ['Card title/16', 16, 23, 700, '경험 위키 카드 제목'],
];
async function setupStyles() {
  for (const s of await figma.getLocalTextStylesAsync()) if (s.name.startsWith(`${V1.prefix}/`)) s.remove();
  for (const s of await figma.getLocalEffectStylesAsync()) if (s.name.startsWith(`${V1.prefix}/`)) s.remove();
  const fonts = [...new Set(Object.values(FONT.weights))].map((style) => ({ family: FONT.family, style }));
  await Promise.all(fonts.concat(FONT.mono ? [FONT.mono] : []).map((f) => figma.loadFontAsync(f)));
  for (const [name, size, lh, w, desc] of TYPE) {
    const st = figma.createTextStyle(); st.name = `${V1.prefix}/${name}`; st.fontName = { family: FONT.family, style: FONT.weights[w] };
    st.fontSize = size; st.lineHeight = { unit: 'PIXELS', value: lh }; st.letterSpacing = { unit: 'PERCENT', value: size >= 17 ? -1.5 : 0 }; st.description = desc;
    STYLES[name] = st;
  }
  if (FONT.mono) { const st = figma.createTextStyle(); st.name = `${V1.prefix}/Mono/12`; st.fontName = FONT.mono; st.fontSize = 12; st.lineHeight = { unit: 'PIXELS', value: 19.8 }; st.description = '근거 코드'; STYLES['Mono/12'] = st; }
  else STYLES['Mono/12'] = STYLES['Caption/12'];
  const shadowOf = (layers) => layers.map(([y, blur, a]) => ({ type: 'DROP_SHADOW', color: { r: 0.094, g: 0.125, b: 0.18, a }, offset: { x: 0, y }, radius: blur, spread: 0, visible: true, blendMode: 'NORMAL' }));
  for (const [k, layers, desc] of [['Menu', [[1, 2, 0.06], [6, 20, 0.1]], '떠 있는 것: 메뉴, 툴팁, 알림, 이력서 종이'], ['Modal', [[2, 6, 0.08], [20, 56, 0.2]], '모달']]) {
    const e = figma.createEffectStyle(); e.name = `${V1.prefix}/Elevation/${k}`; e.effects = shadowOf(layers); e.description = desc; EFFECTS[k] = e;
  }
}

/* ---------- 색·모서리 변수 ---------- */
async function setupVariables() {
  for (const c of await figma.variables.getLocalVariableCollectionsAsync()) if (c.name === V1.collection) c.remove();
  const col = figma.variables.createVariableCollection(V1.collection); col.renameMode(col.modes[0].modeId, 'Light'); const mode = col.modes[0].modeId;
  for (const [name, hex] of Object.entries(COLORS)) {
    const v = figma.variables.createVariable(`color/${name}`, col, 'COLOR'); v.setValueForMode(mode, rgb(hex));
    v.scopes = name.startsWith('text') || name.startsWith('on-ink') ? ['TEXT_FILL', 'STROKE_COLOR', 'SHAPE_FILL'] : ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR', 'TEXT_FILL'];
    TOKENS[name] = v;
  }
  for (const [name, n] of Object.entries(NUMBERS)) { const v = figma.variables.createVariable(name, col, 'FLOAT'); v.setValueForMode(mode, n); v.scopes = ['CORNER_RADIUS']; TOKENS[name] = v; }
}

/* ---------- 페이지: 새 v1 페이지 세 개를 만들고 옛 v1 페이지를 지운다 ---------- */
/* ---------- 페이지: 「Rewrite v1」 한 페이지에 기초, 컴포넌트, 화면을 모두 그린다 (Starter 플랜은 페이지가 3개까지) ----------
   있으면 그 페이지 안만 비우고 다시 그린다. 없으면 새로 만든다. 다른 페이지는 건드리지 않는다 */
async function resetPages() {
  const isOld = (p) => V1.oldPages.some((n) => p.name === n || p.name === `${n} (만드는 중)`); // 예전 버전이 만든 페이지 (자리를 비운다)
  let page = figma.root.children.find((p) => p.name === V1.page);
  if (!page) {
    const free = figma.root.children.find(isOld); // 예전 v1 페이지가 있으면 그 페이지를 이어 쓴다
    if (free) { free.name = V1.page; page = free; }
  }
  if (!page) {
    try { page = figma.createPage(); page.name = V1.page; }
    catch (e) { throw new Error(`「${V1.page}」 페이지를 만들 수 없어요 (${e.message}). 빈 페이지 하나의 이름을 「${V1.page}」로 바꾸고 다시 실행해 주세요. 그 페이지 안의 내용은 지워져요.`); }
  }
  await figma.setCurrentPageAsync(page);
  for (const p of figma.root.children.filter((p) => p !== page && isOld(p))) p.remove();
  for (const n of page.children.slice()) n.remove();
  return page;
}

/* ---------- 기초 견본: 색과 글자 (페이지 왼쪽 위) ---------- */
async function drawFoundations(pageNode) {
  const board = al('V', { name: 'Foundations', gap: 48, pad: 64, fill: 'surface' }); pageNode.appendChild(board);
  await tput(board, 'Rewrite v1 기초', 'Heading/24', 'text');
  await tput(board, '흰 종이, 블루블랙 잉크, 형광펜 하나. 노란 형광펜은 「내가 고른 것」과 「AI가 더한 것」에만 쓴다. 자세한 규칙은 docs/design-guide.md', 'Body/15', 'text-2', { w: 960 });
  // 색
  const colors = al('V', { name: '색', gap: 16 }); board.appendChild(colors);
  await tput(colors, '색 (변수: Rewrite v1 / color)', 'Title/17', 'text');
  const grid = al('H', { name: '견본', gap: 16, wrap: true, w: 1200 }); grid.counterAxisSpacing = 16; colors.appendChild(grid);
  for (const name of Object.keys(COLORS)) {
    const sw = al('V', { name, gap: 8, w: 132 }); grid.appendChild(sw);
    const chip = figma.createRectangle(); chip.name = 'chip'; chip.resize(132, 72); chip.fills = [paint(name)]; radius(chip, 'radius/md'); stroke(chip, 'border'); sw.appendChild(chip);
    await tput(sw, name, 'Small/13.5 Semibold', 'text'); await tput(sw, COLORS[name], 'Caption/12', 'text-3');
  }
  // 글자
  const type = al('V', { name: '글자', gap: 14 }); board.appendChild(type);
  await tput(type, `글자 (텍스트 스타일: v1/…, 글꼴 ${FONT.family})`, 'Title/17', 'text');
  for (const [name, size, lh, w, desc] of TYPE.concat([['Mono/12', 12, 19.8, 400, '근거 코드']])) {
    const row = al('H', { name, gap: 24, cross: 'center' }); type.appendChild(row);
    const label = al('V', { name: 'label', w: 240 }); row.appendChild(label);
    await tput(label, name, 'Small/13.5 Semibold', 'text'); await tput(label, `${size} / ${lh} / ${w}`, 'Caption/12', 'text-3');
    await tput(row, `편하게 말한 경험이 이력서 한 줄이 돼요. ${desc}`, name, 'text');
  }
  return board;
}

/* ===== 20-icons.js ===== */
/* 아이콘: 앱의 prototype/js/icons.js 와 같은 모양 (빌드할 때 ICON_PATHS 로 들어온다).
   Icon/<이름> 컴포넌트 24×24, 선 1.6, 색은 text-2 변수. 인스턴스에서 icon(name, size, color) 로 크기와 색을 바꾼다 */
async function buildIcons(parent) {
  const box = al('H', { name: 'Icons', gap: 20, wrap: true, w: 1400, pad: 24, fill: 'surface', stroke: 'border', radius: 'radius/md' }); box.counterAxisSpacing = 20; parent.appendChild(box);
  for (const [name, body] of Object.entries(ICON_PATHS)) {
    const c = figma.createComponent(); c.name = `Icon/${name}`; c.resize(24, 24); c.fills = []; c.clipsContent = false;
    const n = svgNode(body, 24, COLORS['text-2']);
    for (const v of n.findAll((x) => x.type === 'VECTOR')) { v.name = 'path'; if (v.strokes.length) v.strokes = [paint('text-2')]; if (v.fills.length) v.fills = [paint('text-2')]; c.appendChild(v); }
    n.remove(); c.description = `앱의 App.icon('${name}')`;
    const cell = al('V', { name, gap: 8, cross: 'center', w: 88 }); box.appendChild(cell); cell.appendChild(c);
    await tput(cell, name, 'Caption/12', 'text-3', { align: 'center' });
    LIB[c.name] = c;
  }
  return box;
}

/* ===== 30-components.js ===== */
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

/* ===== 40-patterns.js ===== */
/* 화면 패턴: 화면 파일이 조립에 쓰는 틀. 모두 컴포넌트 인스턴스와 토큰으로 만든다
   shell · page · titleBar · sectionTitle · segmented · field · btn · disable · spinner · banner · githubAccount · evidence · openDraft
   modal · menu · menuUnder · boxIn · toast · tooltip · empty · fit */

const W = 1920, H = 1080, SIDEBAR_W = 236; // 데스크톱 화면

/* ---------- 왼쪽 메뉴 컴포넌트 (Shell/Sidebar, Active 변형) ---------- */
const NAV = [['홈', 'home', 'Home'], ['AI 채팅', 'chat', 'Chat'], ['경험 위키', 'wiki', 'Wiki'], ['경험 타임라인', 'timeline', 'Timeline']];
async function buildShellComponents(parent) {
  const sec = al('V', { name: '화면 틀', gap: 16 }); parent.appendChild(sec);
  await tput(sec, '화면 틀', 'Title/17', 'text');
  await tput(sec, '왼쪽 메뉴(236). 1차 범위라 마스터 이력서와 지원 기업은 메뉴에 없다. 화면에서 세로 채우기', 'Small/13.5', 'text-3');
  const row = al('H', { name: 'items', gap: 32 }); sec.appendChild(row);
  await makeSet(row, 'Shell/Sidebar', ['Home', 'Chat', 'Wiki', 'Timeline', 'Trash', 'None'].map((act) => ({ props: { Active: act }, build: async (c) => {
    auto(c, 'V', { gap: 2, pad: [0, 12, 12, 12], w: SIDEBAR_W, h: H, fill: 'surface-2', stroke: 'border', sides: ['right'] });
    const brand = al('H', { name: 'brand', pad: [0, 8], h: 56, w: 212, cross: 'center' }); c.appendChild(brand); brand.appendChild(inst('Logo', { On: 'Light' }));
    gap(c, 8);
    for (const [label, ic, key] of NAV) c.appendChild(inst('Nav item', { State: act === key ? 'Active' : 'Default', Label: label, Icon: ic }));
    const grow = figma.createFrame(); grow.name = 'spacer'; grow.fills = []; c.appendChild(grow); grow.layoutSizingHorizontal = 'FILL'; grow.layoutSizingVertical = 'FILL';
    const foot = al('V', { name: 'foot', gap: 4, pad: [10, 0, 0, 0], stroke: 'border', sides: ['top'] }); c.appendChild(foot); foot.layoutSizingHorizontal = 'FILL';
    expose(foot, named(inst('Nav item', { State: act === 'Trash' ? 'Active' : 'Default', Label: '휴지통', Icon: 'trash', Count: '1', 'Show count': true }), 'trash'));
    const acct = al('H', { name: 'account', gap: 10, pad: [6, 8], cross: 'center', radius: 'radius/sm', minH: 48 }); foot.appendChild(acct); acct.layoutSizingHorizontal = 'FILL';
    expose(acct, named(inst('Avatar', { Initial: '김' }), 'avatar'));
    const who = al('V', { name: 'who' }); acct.appendChild(who); who.layoutSizingHorizontal = 'FILL';
    await tput(who, '김준호', 'Small/13.5 Semibold', 'text', { name: 'name' }); await tput(who, 'junho@example.com', 'Caption/12', 'text-3', { name: 'email' });
    acct.appendChild(icon('more', 18, 'text-3'));
  } })), { dir: 'H', desc: '왼쪽 메뉴. Active: 지금 화면의 메뉴 (설정 화면은 None). Name · Email 은 속성, 첫 글자(avatar)와 휴지통 개수(trash)는 노출한 안쪽 인스턴스에서 바꾼다 (화면에서는 shell 의 옵션)',
    props: [{ name: 'Name', type: 'TEXT', default: '김준호', node: 'name' }, { name: 'Email', type: 'TEXT', default: 'junho@example.com', node: 'email' }] });
}

/* ---------- 화면 틀: 왼쪽 메뉴 + 가운데 ---------- */
// active: 'Home' | 'Chat' | 'Wiki' | 'Timeline' | 'Trash' | 'None' → { screen, main, side }
// o: { name, email: 계정 (기본 예시 계정 김준호), trash: 휴지통 개수 (숫자, 0 이나 null 이면 숨김, 주지 않으면 1) }
function shell(frame, active, o = {}) {
  const screen = al('H', { name: '화면', w: W, fill: 'bg' }); screen.counterAxisAlignItems = 'MIN'; screen.minHeight = frame.height; frame.appendChild(screen); screen.x = 0; screen.y = 0;
  const side = inst('Shell/Sidebar', Object.assign({ Active: active }, o.name ? { Name: o.name } : {}, o.email ? { Email: o.email } : {})); screen.appendChild(side); side.layoutSizingVertical = 'FILL';
  if (o.name) setNested(side, 'avatar', { Initial: o.name[0] });
  if ('trash' in o) setNested(side, 'trash', o.trash ? { Count: o.trash, 'Show count': true } : { 'Show count': false });
  const main = al('V', { name: '가운데' }); screen.appendChild(main); main.layoutSizingHorizontal = 'FILL'; main.minHeight = frame.height; // 가운데는 내용 높이(최소 화면 높이), 왼쪽 메뉴가 그 높이를 따라간다
  return { screen, main, side };
}
// 다 그린 뒤 프레임 높이를 내용에 맞춘다 (화면보다 짧으면 1080)
function fit(frame, node) { frame.resize(frame.width, Math.max(H, Math.ceil(node.height))); return frame; }

/* ---------- 페이지: 폭 1200 가운데, 안쪽 40. narrow 면 읽고 쓰는 화면(내용 760) ---------- */
// page(main, o) → 내용 열(col). 머리는 위에서부터
//   crumb: '경험 위키' (위로 가기) · above: [노드] 제목 위 줄 (프로젝트 이름표) · title · titleExtra: [노드] 제목 옆
//   meta: [노드] 제목 아래 정보 줄 (사이 14) · sub: 설명 (최대 600) · below: [노드] 그 아래 줄마다 · actions: [노드] 오른쪽 단추 · after: 머리 아래 틈 (기본 28)
async function page(main, o = {}) {
  const pg = al('V', { name: '페이지', w: 1200, pad: [o.crumb ? 0 : 40, 40, 80, 40] }); put(main, pg); main.counterAxisAlignItems = 'CENTER';
  const col = al('V', { name: '내용', w: o.narrow ? 760 : 1120 }); pg.appendChild(col);
  if (o.crumb) {
    const c = al('H', { name: '위로', gap: 4, cross: 'center', minH: 46 }); col.appendChild(c);
    c.appendChild(icon('chevron-left', 16, 'text-2')); c.appendChild(await text(o.crumb, 'Small/13.5', 'text-2')); gap(col, 14);
  }
  if (o.title) {
    const head = al('H', { name: '머리', gap: 24, cross: 'start' }); put(col, head, { fill: true });
    const left = al('V', { name: '제목' }); put(head, left, { fill: true });
    const line = (name, nodes, gapX, pad) => { const r = al('H', { name, gap: gapX, cross: 'center', wrap: true, pad }); r.counterAxisSpacing = 4; put(left, r, { fill: true }); nodes.forEach((n) => r.appendChild(n)); return r; };
    if (o.above && o.above.length) line('제목 위', o.above, 8, [0, 0, 8, 0]);
    if (o.titleExtra && o.titleExtra.length) {
      const r = al('H', { name: '제목 줄', gap: 10, cross: 'center' }); put(left, r, { fill: true });
      await tput(r, o.title, 'Heading/24', 'text', { wrap: true, name: 'h1' }); o.titleExtra.forEach((n) => r.appendChild(n));
    } else await tput(left, o.title, 'Heading/24', 'text', { wrap: true, name: 'h1' });
    if (o.meta && o.meta.length) line('정보', o.meta, 14, [8, 0, 0, 0]);
    if (o.sub) { gap(left, 6); const t = await tput(left, o.sub, 'Body/15', 'text-2', { wrap: true, name: '설명' }); t.maxWidth = 600; } // 앱의 .page-head p (64ch)
    for (const n of o.below || []) { gap(left, 10); put(left, n, { fill: true }); }
    if (o.actions && o.actions.length) { const a = al('H', { name: '단추', gap: 8, cross: 'center' }); head.appendChild(a); o.actions.forEach((b) => a.appendChild(b)); }
    gap(col, o.after != null ? o.after : 28);
  }
  return col;
}
// 제목이 있는 상단바 (경험 타임라인처럼 화면을 꽉 쓰는 곳)
async function titleBar(main, title) {
  const bar = al('H', { name: '상단바', pad: [0, 40], h: 56, cross: 'center', fill: 'bg', stroke: 'border', sides: ['bottom'] }); put(main, bar, { fill: true });
  bar.appendChild(await text(title, 'Title/17', 'text')); return bar;
}
// 섹션 제목 (+ 오른쪽 링크)
async function sectionTitle(col, title, more, count) {
  const h = al('H', { name: title, gap: 8, cross: 'center', pad: [0, 0, 12, 0] }); put(col, h, { fill: true });
  h.appendChild(await text(title, 'Title/17', 'text')); if (count) h.appendChild(await text(count, 'Small/13.5', 'text-3'));
  if (more) { spacer(h); h.appendChild(await text(more, 'Small/13.5 Medium', 'text-2')); }
  return h;
}

/* ---------- 작은 조립 ---------- */
// btn('저장', 'Primary', 'Medium', 'check')
const btn = (label, variant = 'Secondary', size = 'Medium', ic) => inst('Button', Object.assign({ Variant: variant, Size: size, Label: label }, ic ? { 'Show icon': true, Icon: ic } : {}));
const disable = (node) => { node.opacity = 0.45; return node; }; // 꺼진 버튼
// 나란한 보기 고르기: segmented([{ label, icon }], 고른 순서)
function segmented(items, on = 0) {
  const s = al('H', { name: '보기 고르기', gap: 2, pad: 3, fill: 'surface-3', radius: 'radius/md' });
  items.forEach((it, i) => s.appendChild(inst('Segment', Object.assign({ Selected: i === on ? 'On' : 'Off', Label: it.label || it }, it.icon ? { 'Show icon': true, Icon: it.icon } : {}))));
  return s;
}
// 입력 칸 묶음: field(parent, { label, note, input: {Content, State, Text, ...} | textarea: {...} | select: '…', trailing: [노드], hint, error })
//   note: 라벨 뒤 옅은 글 「(선택)」 · trailing: 입력칸 오른쪽에 나란히 둘 것 (GitHub 주소 + 불러오기)
async function field(parent, o) {
  const f = al('V', { name: o.label || 'field', gap: 6 }); put(parent, f, { fill: true });
  if (o.label && o.note) { const l = al('H', { name: 'label', gap: 4, cross: 'center' }); f.appendChild(l); l.appendChild(await text(o.label, 'Small/13.5 Semibold', 'text')); l.appendChild(await text(o.note, 'Small/13.5', 'text-3')); }
  else if (o.label) await tput(f, o.label, 'Small/13.5 Semibold', 'text', { name: 'label' });
  const ctl = o.textarea ? inst('Textarea', o.textarea) : o.select ? inst('Select', { Text: o.select }) : inst('Input', Object.assign({ Content: 'Placeholder', State: o.error ? 'Error' : 'Default' }, o.input || {}));
  if (o.trailing && o.trailing.length) { const r = al('H', { name: '입력 줄', gap: 8, cross: 'center' }); put(f, r, { fill: true }); put(r, ctl, { fill: true }); o.trailing.forEach((n) => r.appendChild(n)); }
  else put(f, ctl, { fill: true });
  if (o.error) { const e = al('H', { name: 'error', gap: 5, cross: 'center' }); f.appendChild(e); e.appendChild(icon('warning', 15, 'danger')); e.appendChild(await text(o.error, 'Small/13.5 Medium', 'danger')); }
  else if (o.hint) await tput(f, o.hint, 'Small/13.5', 'text-3', { wrap: true });
  return f;
}
// 빈 화면: empty(parent, '제목', '설명', [버튼])
async function empty(parent, title, desc, buttons = []) {
  const e = al('V', { name: '빈 화면', gap: 4, pad: [56, 20], cross: 'center' }); put(parent, e, { fill: true });
  await tput(e, title, 'Title/17', 'text', { align: 'center' }); if (desc) await tput(e, desc, 'Body/15', 'text-2', { align: 'center' });
  if (buttons.length) { gap(e, 14); const r = al('H', { name: '단추', gap: 8 }); e.appendChild(r); buttons.forEach((b) => r.appendChild(b)); }
  return e;
}

// 불러오는 중: Spinner 인스턴스를 size 로 (앱의 .spinner 18, 경험 카드 머리 14, 분석 단계 20)
function spinner(size = 16) { const sp = inst('Spinner'); if (size !== 16) sp.resize(size, size); return sp; }
// 화면 안 알림: banner('Danger', '글', '다시 시도') → Banner 인스턴스 (부모에 넣어 가로 채우기)
function banner(tone, label, actionLabel) {
  const b = inst('Banner', { Tone: tone, Label: label, 'Show action': !!actionLabel });
  if (actionLabel) setNested(b, 'action', { Label: actionLabel });
  return b;
}
// GitHub 계정 줄 (레포 고르기 위): 아이콘 + 계정 + 예시 태그 … 계정 바꾸기
async function githubAccount(parent, login = 'example', o = {}) {
  const bar = al('H', { name: '계정', gap: 8, main: 'between', cross: 'center', pad: o.pad }); put(parent, bar, { fill: true });
  const who = al('H', { name: '계정 이름', gap: 8, cross: 'center' }); bar.appendChild(who);
  who.appendChild(icon('github', 16, 'text')); who.appendChild(await text(login, 'Body/15 Semibold', 'text'));
  if (o.sample !== false) who.appendChild(inst('Tag', { Tone: 'Neutral', Label: '예시' }));
  bar.appendChild(btn('계정 바꾸기', 'Ghost', 'Small'));
  return bar;
}

// 경험 카드 한 장 (Card/Index): indexCard({ project, period, github, title, line, keywords: [역량], match: 거른 역량 })
function indexCard(o) {
  const kws = o.keywords || [];
  const c = inst('Card/Index', { Project: o.project, Period: o.period, 'Show GitHub': !!o.github, Title: o.title, 'Resume line': o.line, 'Show keyword 2': kws.length > 1, 'Show keyword 3': kws.length > 2 });
  kws.slice(0, 3).forEach((k, i) => setNested(c, `kw${i + 1}`, { State: k === o.match ? 'Selected' : 'Default', Label: k }));
  if (!kws.length) c.findOne((n) => n.name === 'keywords').visible = false; // 역량을 아직 고르지 않은 카드
  c.name = o.title; return c;
}

/* ---------- GitHub 근거 (core.js evidence, .cd-ev-body) ---------- */
// 근거 수: ['커밋 3개', 'PR 1개', '코드 2곳'] (없는 것은 뺀다)
const evidenceCounts = (o) => [['커밋', '개', o.commits], ['PR', '개', o.prs], ['코드', '곳', o.code]].filter(([, , xs]) => xs && xs.length).map(([l, u, xs]) => `${l} ${xs.length}${u}`);
// await evidence(parent, { repo, sample, commits: [[sha, 메시지, 날짜]], prs: [[#번호, 제목, 날짜]], code: [{ path: '경로:줄', lines: [[번호, 코드]], hl: [번호] }] })
//   레포 줄(+ 예시 태그), 커밋 · PR · 코드 묶음. 비어 있는 묶음은 그리지 않는다
async function evidence(parent, o) {
  const ev = al('V', { name: '근거', gap: 20 }); put(parent, ev, { fill: true });
  const repo = al('H', { name: '레포', gap: 5, cross: 'center' }); ev.appendChild(repo);
  repo.appendChild(icon('github', 15, 'text-3')); repo.appendChild(await text(o.repo, 'Small/13.5', 'text-3'));
  if (o.sample) repo.appendChild(inst('Tag', { Tone: 'Neutral', Label: '예시' }));
  const group = async (label) => { const g = al('V', { name: label }); put(ev, g, { fill: true }); const h = al('H', { name: '이름', pad: [0, 0, 6, 0] }); g.appendChild(h); h.appendChild(await text(label, 'Small/13.5 Semibold', 'text')); return g; };
  const rows = (g, xs) => { for (const [id, msg, date] of xs) put(g, named(inst('Evidence/Row', { Id: id, Message: msg, Date: date }), id), { fill: true }); };
  if (o.commits && o.commits.length) rows(await group('커밋'), o.commits);
  if (o.prs && o.prs.length) rows(await group('PR'), o.prs);
  if (o.code && o.code.length) {
    const list = al('V', { name: '코드 블록', gap: 12 }); put(await group('코드'), list, { fill: true });
    for (const f of o.code) {
      const blk = al('V', { name: f.path.split('/').pop(), stroke: 'border', radius: 'radius/sm', clip: true }); put(list, blk, { fill: true });
      const ph = al('H', { name: '경로', pad: [7, 12], fill: 'surface-2', stroke: 'border', sides: ['bottom'] }); put(blk, ph, { fill: true });
      await tput(ph, f.path, 'Caption/12', 'text-2', { wrap: true });
      const pre = al('V', { name: '코드', pad: [8, 0] }); put(blk, pre, { fill: true });
      for (const [n, src] of f.lines) put(pre, named(inst('Evidence/Code line', { Highlight: (f.hl || []).includes(n) ? 'On' : 'Off', Number: String(n), Code: src || ' ' }), String(n)), { fill: true });
    }
  }
  return ev;
}
// 레포 분석에서 찾은 작업을 고르고 「자세히 보기」를 펼친 모습 (.rf-draft > details[open])
//   d: { title, line, keywords: '역량    역량', star: [[칸, 글]] (글이 비면 Empty), evidence: evidence() 옵션 }
async function openDraft(parent, d) {
  const box = al('V', { name: `${d.title} (자세히 보기 펼침)`, fill: 'surface', stroke: 'primary', strokeW: 1.5, radius: 'radius/md', clip: true }); put(parent, box, { fill: true });
  const v = inst('Repo/Draft', { Selected: 'On', Title: d.title, 'Resume line': d.line, Keywords: d.keywords, 'Show more': false });
  put(box, v, { fill: true }); v.strokes = []; v.paddingBottom = 6; // 바깥 틀이 테두리를 그린다
  const det = al('V', { name: '자세히 보기' }); put(box, det, { fill: true });
  const sum = al('H', { name: '열린 줄', gap: 6, pad: [8, 16, 10, 42], cross: 'center' }); put(det, sum, { fill: true });
  sum.appendChild(icon('chevron-down', 16, 'text')); sum.appendChild(await text('자세히 보기', 'Small/13.5 Semibold', 'text'));
  const counts = al('H', { name: '근거 수', gap: 14, cross: 'center', pad: [0, 0, 0, 8] }); sum.appendChild(counts);
  for (const c of evidenceCounts(d.evidence)) counts.appendChild(await text(c, 'Small/13.5', 'text-3'));
  const star = al('V', { name: 'STAR', pad: [0, 16, 0, 46] }); put(det, star, { fill: true });
  for (const [k, val] of d.star) put(star, named(inst('Repo/STAR row', val ? { Content: 'Value', Label: k, Text: val } : { Content: 'Empty', Label: k }), k), { fill: true });
  gap(det, 8);
  const evw = al('V', { name: '근거 칸', pad: [14, 16, 18, 46], stroke: 'border', sides: ['top'] }); put(det, evw, { fill: true });
  await evidence(evw, d.evidence);
  return box;
}

/* ---------- 겹쳐 띄우는 것 ---------- */
// 모달: 화면 위에 어둡게 깔고 가운데. o: { title, width: 480 | 760, body: async (b) => {}, buttons: [노드], close: 닫기 단추 }
async function modal(frame, o) {
  const dim = figma.createRectangle(); dim.name = '배경 어둡게'; dim.resize(frame.width, frame.height); dim.fills = [paint('text', 0.45)]; frame.appendChild(dim);
  const m = al('V', { name: o.title, w: o.width || 480, fill: 'surface', radius: 'radius/lg', clip: true }); shadow(m, 'Modal'); frame.appendChild(m);
  const head = al('H', { name: '머리', gap: 12, pad: [22, 24, 0, 24], cross: 'center' }); put(m, head, { fill: true });
  await tput(head, o.title, 'Title/17', 'text', { wrap: true }); if (o.close) head.appendChild(inst('Icon button', { Size: 'Small', Icon: 'close' }));
  const body = al('V', { name: '내용', gap: 18, pad: [10, 24, 24, 24] }); put(m, body, { fill: true });
  if (o.body) await o.body(body);
  if (o.buttons && o.buttons.length) { const foot = al('H', { name: '단추', gap: 8, pad: [14, 24], main: 'end', stroke: 'border', sides: ['top'] }); put(m, foot, { fill: true }); o.buttons.forEach((b) => foot.appendChild(b)); }
  m.x = Math.round((frame.width - m.width) / 2); m.y = Math.max(24, Math.round((Math.min(frame.height, H) - m.height) / 2));
  return m;
}
// 모달 안의 설명 글
const modalText = (body, chars) => tput(body, chars, 'Body/15', 'text-2', { wrap: true });
// 드롭다운 메뉴: menu(frame, [{ label, icon, danger } | '-'], [x, y], { w: 폭 (기본 232) })
function menu(frame, items, at, o = {}) {
  const m = al('V', { name: '메뉴', gap: 0, pad: 6, w: o.w || 232, fill: 'surface', stroke: 'border', radius: 'radius/md' }); shadow(m, 'Menu'); frame.appendChild(m);
  for (const it of items) {
    if (it === '-') { const d = inst('Divider'); put(m, d, { fill: true }); d.name = 'hr'; continue; }
    const r = inst('Menu item', Object.assign({ Tone: it.danger ? 'Danger' : 'Default', Label: it.label }, it.icon ? { Icon: it.icon } : { 'Show icon': false })); put(m, r, { fill: true });
  }
  m.x = at[0]; m.y = at[1]; return m;
}
// 노드가 화면 프레임 안 어디에 있는지 → { x, y, w, h }. 레이아웃이 아직 계산되지 않아 상자가 쓸모없으면(가짜 Figma) null
function boxIn(node, frame) {
  try {
    const b = node.absoluteBoundingBox; const f = frame.absoluteBoundingBox; if (!b || !f) return null;
    const x = b.x - f.x; const y = b.y - f.y;
    if (!(b.width > 0 && b.height > 0) || (x <= 0 && y <= 0) || x < 0 || y < 0 || x + b.width > frame.width) return null;
    return { x, y, w: b.width, h: b.height };
  } catch (e) { return null; }
}
// 노드 아래에 메뉴를 띄운다: menuUnder(frame, 단추, items, { w, align: 'end'(오른쪽 끝 맞춤, 기본) | 'start', up: 위로 열기, gap: 4, at: [x, y] | (menu) => [x, y] })
//   at: 자리를 계산할 수 없을 때 쓸 메뉴 자리
function menuUnder(frame, anchor, items, o = {}) {
  const m = menu(frame, items, [0, 0], { w: o.w }); const g = o.gap != null ? o.gap : 4;
  const b = boxIn(anchor, frame);
  if (b) { m.x = Math.round(o.align === 'start' ? b.x : b.x + b.w - m.width); m.y = Math.round(o.up ? b.y - m.height - g : b.y + b.h + g); }
  else { const at = typeof o.at === 'function' ? o.at(m) : o.at || [0, 0]; m.x = at[0]; m.y = at[1]; }
  return m;
}
// 알림: toast(frame, '알림', '되돌리기') → 아래 가운데
function toast(frame, label, action) {
  const t = inst('Toast', Object.assign({ Label: label }, action ? { Action: action } : { 'Show action': false })); frame.appendChild(t);
  t.x = Math.round((frame.width - t.width) / 2); t.y = Math.min(frame.height, H) - t.height - 24; return t;
}
function tooltip(frame, label, at) { const t = inst('Tooltip', { Label: label }); frame.appendChild(t); t.x = at[0]; t.y = at[1]; return t; }
// 형광펜 글자 (AI가 더한 것, 내가 고른 것)
async function marked(chars, style = 'Body/15', color = 'text') { const b = al('H', { name: '형광펜', pad: [1, 3], fill: 'hl', radius: MARK_RADIUS }); b.appendChild(await text(chars, style, color)); return b; }

/* ===== screens/10-auth.js ===== */
/* 로그인 · 회원가입(#/login, #/signup)과 시작하기(#/onboarding).
   앱: prototype/js/screens/auth.js, css/screens/auth.css, styles.css(.auth*), js/screens/onboarding.js, css/screens/onboarding.css,
       js/repo-flow.js(레포 고르기, css/screens/repo-flow.css), 예시 계정 js/seed-repos.js(SEED.github)
   컴포넌트: Auth/Resume paper(움직임이 끝난 이력서 한 장), Auth/Brand panel(로그인 왼쪽 잉크 판),
            Onboarding/Header(로고 + 로그아웃), Onboarding/Progress(Step 1 = 50%, Step 2 = 100%) */

{ // 이 파일의 이름이 다른 화면 파일과 겹치지 않도록 한 스코프에 둔다

/* ---------- 로그인 왼쪽에 나오는 내용 (auth.js 의 SCENES, 움직임이 끝난 모습) ---------- */
const AUTH_SCENES = [
  { p: '모여봄', when: '2026.09부터', line: ['N+1 쿼리를 찾아 평균 응답 시간을 ', '1.8초에서 0.3초로', ' 단축'] },
  { p: '알고리즘 스터디', when: '2025.03 ~ 2025.12', line: ['난이도를 3단계로 나눠 10개월간 ', '평균 참여율 85%', ' 유지'] },
  { p: '카페 아르바이트', when: '2024.03 ~ 2025.02', line: ['메뉴별 주문 수를 집계해 대기 시간을 ', '절반 가까이', ' 단축'] },
];
const AUTH_PAPER_W = 720; // .au-paper 최대 폭 (안쪽 640)

// 이력서 종이의 회색 줄(.au-bars i): 폭 목록 → 세로로 쌓은 막대
function authBars(name, widths, cross = 'start') {
  const s = al('V', { name, gap: 8, cross });
  for (const w of widths) { const b = figma.createRectangle(); b.name = 'bar'; b.resize(w, 8); b.fills = fills('surface-3'); radius(b, 2); s.appendChild(b); }
  return s;
}

EXTRA_COMPONENTS.push({
  title: '로그인 · 시작하기',
  build: async (row) => {
    /* 이력서 한 장: 말한 문장이 이력서 문장으로 바뀌고 수치에 형광펜(AI가 더한 것)이 그어진 끝 모습 */
    await makeOne(row, 'Auth/Resume paper', async (c) => {
      auto(c, 'V', { pad: [36, 40, 60, 40], w: AUTH_PAPER_W, fill: 'surface', radius: [3, 3, 0, 0] });
      await c.setEffectStyleIdAsync(EFFECTS.Modal.id); // shadow() 는 동기 대입(effectStyleId)이라 dynamic-page 에서 막힌다
      const head = al('H', { name: '이름', gap: 24, pad: [0, 0, 16, 0], main: 'between', cross: 'end', stroke: 'text', strokeW: 2, sides: ['bottom'] }); put(c, head, { fill: true });
      const who = al('V', { name: '사람' }); head.appendChild(who);
      await tput(who, '김준호', 'Heading/24', 'text'); await tput(who, '백엔드 개발자', 'Small/13.5', 'text-2');
      const contact = authBars('연락처', [120, 86], 'end'); contact.paddingBottom = 4; head.appendChild(contact);

      const section = async (title) => { const s = al('V', { name: title, gap: 12, pad: [24, 0, 0, 0] }); put(c, s, { fill: true }); await tput(s, title, 'Small/13.5 Semibold', 'primary-ink'); return s; };
      const projects = await section('프로젝트');
      const slots = al('V', { name: '항목', gap: 16 }); put(projects, slots, { fill: true });
      for (const sc of AUTH_SCENES) {
        const slot = al('V', { name: sc.p, gap: 2 }); put(slots, slot, { fill: true });
        const sh = al('H', { name: '프로젝트', gap: 16, main: 'between', cross: 'center', minH: 24 }); put(slot, sh, { fill: true });
        sh.appendChild(await text(sc.p, 'Body/15 Semibold', 'text')); sh.appendChild(await text(sc.when, 'Caption/12', 'text-3'));
        const ln = al('H', { name: '이력서 문장', cross: 'center', pad: [0, 0, 0, 2], minH: 26 }); slot.appendChild(ln);
        const dot = figma.createEllipse(); dot.name = '점'; dot.resize(4, 4); dot.fills = fills('text-3'); ln.appendChild(dot); gap(ln, 1, 8);
        const [a, mark, b] = sc.line;
        ln.appendChild(await text(a, 'Body/15 Medium', 'text')); ln.appendChild(await marked(mark, 'Body/15 Semibold', 'text')); ln.appendChild(await text(b, 'Body/15 Medium', 'text'));
      }
      (await section('기술')).appendChild(authBars('막대', [410, 307]));
      (await section('학력')).appendChild(authBars('막대', [358, 512, 256]));
    }, { desc: '로그인 왼쪽의 이력서 한 장. 움직임(말한 문장 → 빨간 줄 → 이력서 문장 → 형광펜)이 끝난 모습. 판 안에서 세로 채우기' });

    /* 로그인 왼쪽 잉크 판: 로고 + 다시 보기, 소개 문구, 이력서 한 장 (아래는 판 밖으로 잘린다) */
    await makeOne(row, 'Auth/Brand panel', async (c) => {
      auto(c, 'V', { pad: [24, 24, 0, 56], w: W / 2, h: H, fill: 'primary-hover', clip: true });
      const top = al('H', { name: '위', h: 56, cross: 'center' }); put(c, top, { fill: true });
      top.appendChild(inst('Logo', { On: 'Ink' })); spacer(top);
      const replay = al('H', { name: '다시 보기', gap: 6, pad: [0, 10], h: 32, cross: 'center', radius: 'radius/sm' }); top.appendChild(replay);
      replay.appendChild(icon('refresh', 15, 'on-ink-2')); replay.appendChild(await text('다시 보기', 'Small/13.5 Medium', 'on-ink-2'));
      gap(c, 64);
      const pitch = al('V', { name: '소개 문구', gap: 12 }); c.appendChild(pitch);
      pitch.appendChild(await text('편하게 말한 경험이\n이력서 한 줄이 돼요', 'Display/34', 'on-ink', { name: '한 줄 약속' }));
      pitch.appendChild(await text('AI와 이야기하거나 GitHub를 연결하면 경험 카드로 정리하고, 이력서와 자소서까지 이어 써요.', 'Body/15', 'on-ink-2', { w: 440, name: '설명' }));
      gap(c, 48);
      const paper = inst('Auth/Resume paper'); put(c, paper, { fillV: true });
    }, { desc: '로그인 · 회원가입 왼쪽(960). 잉크색(primary-hover) 위에 로고(On=Ink), 다시 보기, 소개 문구, 이력서 한 장' });

    /* 시작하기 머리: 로고 + 로그아웃 */
    await makeOne(row, 'Onboarding/Header', async (c) => {
      auto(c, 'H', { pad: [0, 40], w: W, h: 56, main: 'between', cross: 'center', fill: 'bg' });
      c.appendChild(inst('Logo', { On: 'Light' })); c.appendChild(btn('로그아웃', 'Ghost', 'Small'));
    }, { desc: '시작하기 위쪽 줄 (.ob-head). 화면 폭 채우기' });

    /* 시작하기 진행 막대 (.progress, 폭 96) */
    await makeSet(row, 'Onboarding/Progress', ['1', '2'].map((k) => ({ props: { Step: k }, build: async (c) => {
      auto(c, 'H', { w: 96, h: 6, fill: 'surface-3', radius: 3, clip: true });
      const bar = figma.createRectangle(); bar.name = 'value'; bar.resize(k === '1' ? 48 : 96, 6); bar.fills = fills('primary'); radius(bar, 3); c.appendChild(bar);
    } })), { dir: 'H', desc: '시작하기 진행. Step 1 = 50% (목표 직무), Step 2 = 100% (첫 프로젝트)' });
  },
});

/* ---------- 로그인 · 회원가입 화면 ---------- */
// fields: [{ label, input, hint, error }] · kind: 'login' | 'signup'
async function authScreen(frame, kind, fields) {
  const signup = kind === 'signup';
  const screen = al('H', { name: '화면', w: W, h: H, fill: 'bg' }); put(frame, screen, { at: [0, 0] });
  screen.appendChild(inst('Auth/Brand panel'));
  const right = al('V', { name: '폼 자리', main: 'center', cross: 'center' }); put(screen, right, { fill: true, fillV: true });

  const form = al('V', { name: signup ? '회원가입 폼' : '로그인 폼', gap: 40, w: 408, pad: [48, 24] }); right.appendChild(form);
  const main = al('V', { name: '폼', gap: 24 }); put(form, main, { fill: true });
  await tput(main, signup ? '회원가입' : '로그인', 'Heading/24', 'text', { name: 'h1' });
  const list = al('V', { name: '입력칸', gap: 20 }); put(main, list, { fill: true });
  for (const f of fields) await field(list, f);

  const actions = al('V', { name: '단추', gap: 16 }); put(main, actions, { fill: true });
  const btns = al('V', { name: '버튼', gap: 8 }); put(actions, btns, { fill: true });
  put(btns, btn(signup ? '가입하기' : '로그인', 'Primary', 'Large'), { fill: true });
  put(btns, btn('예시 계정으로 둘러보기', 'Secondary', 'Large'), { fill: true });
  const alt = al('H', { name: '다른 쪽으로', gap: 4, main: 'center', cross: 'center' }); put(actions, alt, { fill: true });
  alt.appendChild(await text(signup ? '이미 계정이 있나요?' : '아직 계정이 없나요?', 'Small/13.5', 'text-2'));
  alt.appendChild(await text(signup ? '로그인' : '회원가입', 'Small/13.5 Medium', 'primary', { underline: true, name: 'link' }));

  await tput(form, '프로토타입이라 계정과 데이터는 이 브라우저에만 저장돼요. 다른 곳에서 쓰는 비밀번호는 쓰지 마세요.', 'Small/13.5', 'text-3', { wrap: true, name: '안내' });
  return screen;
}
const AUTH_PASSWORD = (o = {}) => Object.assign({ Content: 'Placeholder', Text: '', 'Show trailing': true, Trailing: 'eye' }, o);

SCREENS.push({
  group: '로그인', title: '로그인',
  build: async (frame) => {
    await authScreen(frame, 'login', [
      { label: '이메일', input: { State: 'Focus', Text: 'name@example.com' } },
      { label: '비밀번호', input: AUTH_PASSWORD() },
    ]);
  },
});

SCREENS.push({
  group: '로그인', title: '로그인 / 입력 오류',
  build: async (frame) => {
    // auth.js:47 — 틀린 비밀번호는 비밀번호 칸 아래에 알린다 (오류 칸에 초점)
    await authScreen(frame, 'login', [
      { label: '이메일', input: { Content: 'Value', Text: 'junho.kim@example.com' } },
      { label: '비밀번호', input: AUTH_PASSWORD({ Content: 'Value', Text: '••••••••' }), error: '이메일 또는 비밀번호가 맞지 않아요.' },
    ]);
  },
});

SCREENS.push({
  group: '로그인', title: '회원가입',
  build: async (frame) => {
    await authScreen(frame, 'signup', [
      { label: '이름', input: { State: 'Focus', Text: '이름 또는 닉네임' } },
      { label: '이메일', input: { Text: 'name@example.com' } },
      { label: '비밀번호', input: AUTH_PASSWORD(), hint: '8자 이상' },
    ]);
  },
});

/* ---------- 시작하기 (새 계정만) ---------- */
// 틀: 머리 + 가운데 560 칸(안쪽 528) → { body, content } · step: 1 | 2
async function onboarding(frame, step, title) {
  const screen = al('V', { name: '화면', w: W, fill: 'bg', cross: 'center' }); screen.minHeight = H; put(frame, screen, { at: [0, 0] });
  put(screen, inst('Onboarding/Header'), { fill: true });
  const body = al('V', { name: '가운데', gap: 24, w: 560, pad: [48, 16, 64, 16] }); screen.appendChild(body);
  const head = al('V', { name: '머리', gap: 28 }); put(body, head, { fill: true });
  head.appendChild(inst('Onboarding/Progress', { Step: String(step) }));
  await tput(head, title, 'Heading/24', 'text', { wrap: true, name: 'h1' });
  const content = al('V', { name: '내용', gap: 20 }); put(body, content, { fill: true });
  return { screen, body, content };
}
// 아래 단추 줄 (.ob-foot: 위 16 + 안쪽 12)
function onboardingFoot(body, buttons) {
  const foot = al('H', { name: '아래 단추', gap: 8, pad: [4, 0, 12, 0], cross: 'center', fill: 'bg' }); put(body, foot, { fill: true });
  return buttons(foot);
}
// 2단계: 보기 고르기 + 칸(.ob-pane, 최소 148) + 이전 · 나중에 하기 · 프로젝트 만들기
async function onboardingProject(frame, mode, pane, canCreate) {
  const { screen, body, content } = await onboarding(frame, 2, '첫 프로젝트를 만들어요');
  content.appendChild(segmented([{ label: 'GitHub에서 가져오기', icon: 'github' }, { label: '직접 만들기' }], mode === 'manual' ? 1 : 0));
  const p = al('V', { name: mode === 'manual' ? '직접 만들기' : '레포 고르기', minH: 148 }); put(content, p, { fill: true });
  await pane(p);
  onboardingFoot(body, (foot) => {
    foot.appendChild(btn('이전', 'Ghost', 'Medium')); spacer(foot);
    foot.appendChild(btn('나중에 하기', 'Ghost', 'Medium'));
    const ok = btn('프로젝트 만들기', 'Primary', 'Medium'); foot.appendChild(canCreate ? ok : disable(ok));
  });
  fit(frame, screen);
}

SCREENS.push({
  group: '시작하기', title: '1단계 목표 직무',
  build: async (frame) => {
    const { screen, body, content } = await onboarding(frame, 1, '어떤 일을 준비하고 있나요?');
    await field(content, { label: '목표 직무', note: '(선택)', input: { Content: 'Placeholder', State: 'Focus', Text: '예: 백엔드 개발자' } }); // 라벨 뒤 (선택)은 옅은 글 (.label .subtle)
    onboardingFoot(body, (foot) => put(foot, btn('다음', 'Primary', 'Large'), { fill: true }));
    fit(frame, screen);
  },
});

SCREENS.push({
  group: '시작하기', title: '2단계 GitHub에서 가져오기',
  build: async (frame) => {
    // repo-flow.js accountHTML: 계정 주소를 아직 안 불러온 상태. 레포를 고르기 전이라 프로젝트 만들기는 꺼져 있다
    await onboardingProject(frame, 'github', async (p) => {
      const form = al('V', { name: '계정 불러오기', gap: 12 }); put(p, form, { fill: true });
      await field(form, { label: 'GitHub 주소', input: { Content: 'Placeholder', State: 'Default', Text: 'github.com/내아이디' }, trailing: [btn('불러오기', 'Secondary', 'Medium')], hint: '내 레포와 소속 조직의 공개 레포를 한 번에 불러와요.' });
      const foot = al('H', { name: '계정 단추', gap: 4 }); form.appendChild(foot);
      foot.appendChild(btn('예시 계정으로 해 보기', 'Ghost', 'Small'));
    }, false);
  },
});

// 예시 계정(SEED.github, login example)의 레포를 최근에 올린 순서로. ym(pushedAt)
const AUTH_REPOS = [
  ['moyeobom-frontend', '「모여봄」 웹 프론트엔드', 'TypeScript', '2026.11'],
  ['moyeobom-backend', '동네 기반 소모임 매칭 서비스 「모여봄」 백엔드', 'Java', '2026.11'],
  ['budget-bot', '슬랙 메시지로 공동 생활비를 기록하는 봇', 'JavaScript', '2026.11'],
  ['dotfiles', '개발 환경 설정', 'Shell', '2026.08'],
  ['algorithm-notes', '알고리즘 스터디 풀이 모음', 'Java', '2025.12'],
  ['empty-classroom', '캡스톤 디자인: 빈 강의실 찾기와 예약 웹앱', 'Java', '2025.06'],
  ['lost-found-server', '24시간 해커톤: 분실물 찾기 서비스', 'Java', '2025.05'],
];

SCREENS.push({
  group: '시작하기', title: '2단계 GitHub 레포 고르기',
  build: async (frame) => {
    // repo-flow.js paint(): 계정 줄 + 검색 + 레포 목록. moyeobom-backend 를 골랐다.
    // 꺼진 줄은 다른 프로젝트에 연결된 레포의 모양을 보이려고 넣었다 (새 계정에는 보통 없다)
    await onboardingProject(frame, 'github', async (p) => {
      const picker = al('V', { name: '레포 고르기', gap: 12 }); put(p, picker, { fill: true });
      await githubAccount(picker);
      put(picker, inst('Input', { Content: 'Placeholder', Text: '레포 검색', 'Show icon': true, Icon: 'search' }), { fill: true });
      const list = al('V', { name: 'GitHub 레포', gap: 8 }); put(picker, list, { fill: true });
      for (const [name, desc, lang, ym] of AUTH_REPOS) {
        const state = name === 'moyeobom-backend' ? 'Selected' : name === 'empty-classroom' ? 'Disabled' : 'Default';
        const meta = state === 'Disabled' ? '「빈강의실」에 연결됨' : `${lang}    ${ym}`;
        const r = inst('Repo/Choice', { State: state, Name: name, Description: desc, Meta: meta }); r.name = name; put(list, r, { fill: true });
      }
    }, true);
  },
});

SCREENS.push({
  group: '시작하기', title: '2단계 직접 만들기',
  build: async (frame) => {
    // onboarding.js projectHTML: 직접 만들기를 고르면 이름 칸에 초점. 비어 있으면 누를 때 「프로젝트 이름을 적어 주세요.」
    await onboardingProject(frame, 'manual', async (p) => {
      await field(p, { label: '프로젝트 이름', input: { State: 'Focus', Text: '예: 교내 해커톤, 카페 아르바이트' } });
    }, true);
  },
});
}

/* ===== screens/20-home.js ===== */
/* 홈 (#/home, prototype/js/screens/home.js + css/screens/home.css). 좁은 페이지(내용 760)
   화면: 홈 · 홈 / 처음 · 홈 / 계정 메뉴 · 홈 / 잔디 툴팁
   1차 범위라 「마감이 가까운 지원 기업」은 그리지 않는다 */
{
  // 잔디: 2025-11-23(일) ~ 2026-11-28(토, 오늘) 371일. 숫자는 하루 기록 수의 진하기 0~4 (앱의 예시 계정과 같은 값)
  const LEVELS = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000110110010021120221100002201210101001010011010321230232121422240222222242442141212120';
  const GRASS_START = [2025, 10, 23];
  const CELL = 10, CGAP = 2;
  // 12개 역량과 그 역량이 담긴 예시 계정의 카드 수 (data.js + seed-repos.js 로 센 값)
  const SKILLS = [['문제 해결력', 8], ['분석적 사고', 4], ['창의력', 0], ['기획력', 4], ['커뮤니케이션', 6], ['의사결정 능력', 5], ['리더십', 3], ['추진력', 4], ['실행력', 8], ['도전정신', 2], ['학습능력', 2], ['협업능력', 3]];
  const RECENT = [['AI 답변 종류 모아 보기', '모여봄'], ['AI 답변 종류: GitHub 연결 전', '슬랙봇'], ['배포 후 업로드 500 에러와 배포 체크리스트', '모여봄']];

  // SVG 로 만든 그림의 색을 같은 값의 색 변수로 바꿔 묶는다
  const hexOf = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  const tokenOf = (c) => Object.keys(COLORS).find((k) => COLORS[k] === hexOf(c));
  const bindSvg = (node) => {
    const re = (ps) => ps.map((p) => { if (p.type !== 'SOLID') return p; const t = tokenOf(p.color); return t ? paint(t, p.opacity) : p; });
    for (const v of node.findAll(() => true)) { if (v.fills && v.fills.length) v.fills = re(v.fills); if (v.strokes && v.strokes.length) v.strokes = re(v.strokes); }
    return node;
  };

  /* ---------- 이 화면의 컴포넌트: 이어서 대화하기 한 줄 ---------- */
  EXTRA_COMPONENTS.push({ title: '홈', build: async (row) => {
    await makeOne(row, 'Home/Chat row', async (c) => {
      auto(c, 'H', { gap: 12, pad: [11, 8], w: 760, cross: 'center', stroke: 'border', sides: ['bottom'] }); c.minHeight = 56;
      const t = named(await text('대화방 이름', 'Body/15 Semibold', 'text'), 'hc-title'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.maxLines = 1; t.textTruncation = 'ENDING';
      const chip = al('H', { name: 'project', gap: 5, cross: 'center' }); c.appendChild(chip);
      chip.appendChild(icon('folder', 15, 'primary')); chip.appendChild(named(await text('프로젝트', 'Small/13.5 Semibold', 'primary'), 'hc-project'));
    }, { desc: '홈 › 이어서 대화하기의 한 줄: 대화방 이름과 프로젝트. 누르면 그 대화방으로', props: [{ name: 'Title', type: 'TEXT', default: '대화방 이름', node: 'hc-title' }, { name: 'Project', type: 'TEXT', default: '프로젝트', node: 'hc-project' }] });
  } });

  /* ---------- 블록 ---------- */
  const cellRect = (level, name) => { const r = figma.createRectangle(); r.name = name; r.resize(CELL, CELL); r.cornerRadius = 2; r.fills = [paint(`record-${level}`)]; return r; };

  // 꾸준히 기록하기 → 11월 27일 칸을 돌려준다 (툴팁 자리)
  async function recordBlock(col) {
    await sectionTitle(col, '꾸준히 기록하기');
    const rc = al('V', { name: '꾸준히 기록하기', gap: 16, pad: 20, fill: 'surface-2', radius: 'radius/md' }); put(col, rc, { fill: true });
    const top = al('H', { name: '연속 기록', gap: 16, cross: 'center' }); put(rc, top, { fill: true });
    const st = al('H', { name: '연속', gap: 4, cross: 'baseline' }); top.appendChild(st);
    st.appendChild(await text('20일', 'Title/17', 'text')); st.appendChild(await text('연속 기록하고 있어요', 'Body/15', 'text'));
    spacer(top); top.appendChild(await text('최근 1년 동안 61일 기록했어요', 'Small/13.5', 'text-3'));

    // 잔디: 왼쪽 요일 열 + (달 줄, 주마다 한 열)
    const fig = al('H', { name: '잔디', gap: 6 }); rc.appendChild(fig);
    const days = al('V', { name: '요일', gap: CGAP, w: 22 }); fig.appendChild(days); gap(days, 16 + 4 - CGAP);
    for (let r = 0; r < 7; r++) {
      const slot = figma.createFrame(); slot.name = `요일 ${r}`; slot.fills = []; slot.clipsContent = false; slot.resize(22, CELL); days.appendChild(slot);
      const lab = { 1: '월', 3: '수', 5: '금' }[r]; if (lab) { const t = await text(lab, 'Caption/12', 'text-3'); slot.appendChild(t); t.x = 0; t.y = -3; }
    }
    const right = al('V', { name: '달과 칸', gap: 4 }); fig.appendChild(right);
    const months = al('H', { name: '달', gap: CGAP }); right.appendChild(months);
    const grid = al('H', { name: '칸', gap: CGAP }); right.appendChild(grid);
    const weeks = Math.ceil(LEVELS.length / 7); let lastMonth = -1; let hover = null;
    for (let w = 0; w < weeks; w++) {
      const slot = figma.createFrame(); slot.name = `${w + 1}주`; slot.fills = []; slot.clipsContent = false; slot.resize(CELL, 16); months.appendChild(slot);
      const wk = al('V', { name: `${w + 1}주`, gap: CGAP }); grid.appendChild(wk);
      for (let r = 0; r < 7; r++) {
        const i = w * 7 + r; const d = new Date(GRASS_START[0], GRASS_START[1], GRASS_START[2] + i);
        if (i >= LEVELS.length) { const e = figma.createFrame(); e.name = '빈 칸'; e.fills = []; e.resize(CELL, CELL); wk.appendChild(e); continue; }
        const cell = cellRect(Number(LEVELS[i]), `${d.getMonth() + 1}/${d.getDate()}`); wk.appendChild(cell);
        if (i === LEVELS.length - 1) { cell.name = '오늘'; stroke(cell, 'text-2', 1.5); cell.strokeAlign = 'OUTSIDE'; }
        if (d.getMonth() === 10 && d.getDate() === 27 && d.getFullYear() === 2026) hover = cell;
        if (r === 0 && d.getMonth() !== lastMonth && d.getDate() <= 7) { slot.appendChild(await text(`${d.getMonth() + 1}월`, 'Caption/12', 'text-3')); lastMonth = d.getMonth(); }
      }
    }
    // 아래: 범례와 오늘의 질문
    const foot = al('H', { name: '아래', gap: 16, cross: 'center' }); put(rc, foot, { fill: true });
    const legend = al('H', { name: '범례', gap: 6, cross: 'center' }); foot.appendChild(legend);
    legend.appendChild(await text('적게', 'Caption/12', 'text-3'));
    const shades = al('H', { name: '진하기', gap: 5, cross: 'center' }); legend.appendChild(shades); for (let l = 0; l <= 4; l++) shades.appendChild(cellRect(l, `진하기 ${l}`));
    legend.appendChild(await text('많이', 'Caption/12', 'text-3'));
    spacer(foot);
    const cta = al('H', { name: '오늘의 질문', gap: 12, cross: 'center' }); foot.appendChild(cta);
    cta.appendChild(await text('오늘 기록하면 21일째예요.', 'Small/13.5', 'text-2')); cta.appendChild(btn('오늘의 질문 답하기', 'Secondary', 'Small', 'calendar'));
    return hover;
  }

  // 내 역량: 레이더 (그림은 SVG, 이름과 카드 수는 글자)
  async function skillsBlock(col) {
    await sectionTitle(col, '내 역량', '경험 타임라인');
    const sk = al('V', { name: '내 역량', gap: 12, pad: 20, fill: 'surface-2', radius: 'radius/md', cross: 'center' }); put(col, sk, { fill: true });
    const W0 = 600, H0 = 452, CX = 300, CY = 226, R = 150, N = SKILLS.length, TOPV = 8, RINGS = 4;
    const at = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / N; return [CX + Math.cos(a) * R * v, CY + Math.sin(a) * R * v]; };
    const poly = (fn) => SKILLS.map((k, i) => at(i, fn(k)).map((x) => x.toFixed(1)).join(',')).join(' ');
    const C = COLORS;
    let s = `<svg width="${W0}" height="${H0}" viewBox="0 0 ${W0} ${H0}" xmlns="http://www.w3.org/2000/svg" fill="none">`;
    for (let j = 1; j <= RINGS; j++) s += `<polygon points="${poly(() => j / RINGS)}" stroke="${j === RINGS ? C['border-strong'] : C.border}" stroke-width="1" ${j === RINGS ? '' : 'stroke-dasharray="3 4"'}/>`;
    SKILLS.forEach((k, i) => { const [x, y] = at(i, 1); s += `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${C.border}" stroke-width="1"/>`; });
    s += `<polygon points="${poly((k) => k[1] / TOPV)}" fill="${C.primary}" fill-opacity="0.12" stroke="${C.primary}" stroke-width="2" stroke-linejoin="round"/>`;
    SKILLS.forEach((k, i) => { const [x, y] = at(i, k[1] / TOPV); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${C.primary}" stroke="${C.surface}" stroke-width="2"/>`; });
    s += '</svg>';
    const fig = figma.createFrame(); fig.name = '레이더'; fig.fills = []; fig.clipsContent = false; fig.resize(W0, H0); sk.appendChild(fig);
    const chart = bindSvg(figma.createNodeFromSvg(s)); chart.name = '그림'; fig.appendChild(chart); chart.x = 0; chart.y = 0;
    for (const [i, [name, n]] of SKILLS.entries()) {
      const [x, y] = at(i, 1.1); const dx = x - CX; const side = Math.abs(dx) < 8 ? (y < CY ? 'top' : 'bottom') : dx > 0 ? 'start' : 'end';
      const lb = al('V', { name, pad: [2, 4], cross: side === 'start' ? 'start' : side === 'end' ? 'end' : 'center' }); fig.appendChild(lb);
      lb.appendChild(await text(name, 'Small/13.5 Semibold', 'text')); lb.appendChild(await text(`${n}장`, n ? 'Small/13.5 Semibold' : 'Small/13.5 Medium', n ? 'text-2' : 'text-3'));
      lb.x = Math.round(side === 'start' ? x : side === 'end' ? x - lb.width : x - lb.width / 2); lb.y = Math.round(side === 'top' ? y - lb.height : side === 'bottom' ? y : y - lb.height / 2);
    }
    const none = SKILLS.filter((k) => !k[1]).map((k) => k[0]).join(', ');
    await tput(sk, `역량마다 그 역량이 담긴 경험 카드 수예요. 이름을 누르면 그 카드들을 볼 수 있어요. 아직 카드가 없는 역량: ${none}`, 'Small/13.5', 'text-3', { wrap: true });
  }

  async function chatsBlock(col) {
    await sectionTitle(col, '이어서 대화하기', '전체 보기');
    const list = al('V', { name: '대화방', stroke: 'border', sides: ['top'] }); put(col, list, { fill: true });
    for (const [t, p] of RECENT) { const r = inst('Home/Chat row', { Title: t, Project: p }); r.name = t; put(list, r, { fill: true }); }
  }

  // 홈 전체 → { screen, hover(11월 27일 칸) }
  async function home(frame) {
    const { screen, main } = shell(frame, 'Home');
    const col = await page(main, { narrow: true, title: '홈', actions: [btn('AI 채팅 시작', 'Primary', 'Medium', 'chat')] });
    const hover = await recordBlock(col); gap(col, 40);
    await skillsBlock(col); gap(col, 40);
    await chatsBlock(col);
    fit(frame, screen);
    return { screen, hover };
  }

  SCREENS.push({ group: '홈', title: '홈', build: async (frame) => { await home(frame); } });

  SCREENS.push({ group: '홈', title: '처음', build: async (frame) => {
    const { screen, main } = shell(frame, 'Home', { trash: 0 });
    const col = await page(main, { narrow: true });
    const e = al('V', { name: '빈 화면', gap: 4, pad: [96, 20, 40, 20], cross: 'center' }); put(col, e, { fill: true });
    await tput(e, '첫 프로젝트를 만들어 보세요', 'Heading/24', 'text', { align: 'center' });
    await tput(e, '팀 과제, 동아리, 아르바이트도 프로젝트예요.', 'Body/15', 'text-2', { align: 'center' });
    gap(e, 14); e.appendChild(btn('새 프로젝트', 'Primary', 'Large', 'plus'));
    fit(frame, screen);
  } });

  SCREENS.push({ group: '홈', title: '계정 메뉴', build: async (frame) => {
    const { screen } = await home(frame);
    const acct = screen.findOne((n) => n.name === 'account'); acct.fills = fills('surface-3'); // 누른 계정 줄
    const m = menuUnder(frame, acct, [{ label: '설정', icon: 'settings' }, { label: '로그아웃', icon: 'logout' }],
      { w: SIDEBAR_W - 24, align: 'start', up: true, gap: 6, at: (mm) => [12, frame.height - 12 - 58 - 6 - mm.height] }); // 계정 줄 위로 연다
    m.name = '계정 메뉴';
  } });

  SCREENS.push({ group: '홈', title: '잔디 툴팁', build: async (frame) => {
    const { hover } = await home(frame);
    const t = tooltip(frame, '11월 27일 기록 2개', [0, 0]);
    const b = boxIn(hover, frame) || { x: 1202, y: 283, w: 10 }; // 계산할 수 없을 때: 마지막 주 금요일 칸 (내용 열 518 + 안쪽 20 + 요일 28 + 53주)
    t.x = Math.round(b.x + b.w / 2 - t.width / 2); t.y = Math.round(b.y - t.height - 6);
  } });
}

/* ===== screens/30-chat.js ===== */
/* AI 채팅 (#/chat, #/chat/:room, #/chat/new?…): 대화방 목록(프로젝트마다 맨 위에 「오늘의 질문」), 대화방, 오른쪽 경험 카드.
   앱: prototype/js/screens/chat.js, js/chat.js, js/repo-flow.js (css/screens/chat.css)
   내용: 예시 계정 김준호 (prototype/js/data.js, seed-replies.js 「AI 답변 종류 모아 보기」, seed-daily.js, seed-repos.js). 오늘은 2026년 11월 28일
   틀(1920): 왼쪽 메뉴 236 + 대화방 목록 252 + 대화방 1072 + 경험 카드 360. 프로젝트가 없는 화면은 경험 카드 없이 대화방이 넓어진다 */

(() => { // 이 파일의 이름이 다른 화면 파일과 겹치지 않도록 한 스코프에 둔다

/* ---------- 예시 계정 데이터 ---------- */
const KW_GAP = '    '; // 역량 사이 (앱의 칩 사이 틈)
const TREE_W = 252, PANEL_W = 360, COL_W = 760;
// 대화방 목록: 진행 중인 프로젝트 먼저. 프로젝트마다 5개(오늘의 질문 포함)까지 보이고 나머지는 「N개 더 보기」
const MOYEOBOM_ROOMS = [['AI 답변 종류 모아 보기', '09:00'], ['배포 후 업로드 500 에러와 배포 체크리스트', '11/19'], ['GitHub에서 찾은 경험', '11/18'], ['JWT + Refresh Token 인증 설계', '11/18']];
const TREE = [
  { name: '모여봄', gh: true, ongoing: true, rooms: MOYEOBOM_ROOMS, more: 2 },
  { name: '슬랙봇', gh: false, ongoing: true, rooms: [['AI 답변 종류: GitHub 연결 전', '08:59'], ['지출이 두 번씩 저장되던 문제 해결', '11/6'], ['쓰는 사람에 맞춰 슬랙 봇과 Postgres 고르기', '11/4']] },
  { name: '빈강의실', gh: true, rooms: [['GitHub에서 찾은 경험', '11/14'], ['사용자 테스트로 예약 동선 고치기', '11/13'], ['빈강의실 개발 이야기', '11/12']] },
  { name: '카페 아르바이트', rooms: [['주문 대기 줄 줄이기', '11/11']] },
  { name: '편의점 야간 아르바이트', rooms: [['재고 실수 줄이기', '11/17']] },
  { name: '알고리즘 스터디', rooms: [['흐지부지되던 스터디 참여율 되살리기', '11/17'], ['발표 순서 교체 규칙으로 빈자리 줄이기', '10/27']] },
  { name: '데이터베이스 팀과제', rooms: [['연락 끊긴 팀원과 역할 재분배', '11/15']] },
  { name: '교내 해커톤', rooms: [['24시간 해커톤에서 MVP 범위 줄이기', '11/16'], ['발표 중 데모가 멈출 때를 대비한 녹화본 준비', '11/3']] },
];
// 모여봄의 경험 카드 (새 카드가 위로: g2, g1, e11, e10, e8, e1). star: [상황, 과제, 행동, 결과]
const JWT_RESULT = '팀이 같은 기준으로 인증 방식을 합의했고, 탈취된 Refresh Token은 한 번만 쓰일 수 있게 막음.';
const JWT_LOGOUT = '로그아웃하면 Redis에서 토큰을 바로 지워 다른 기기의 세션도 끊김.';
const JWT_ACTION = '모바일 앱 확장 가능성을 기준으로 세션과 JWT의 장단점을 표로 비교해 공유하고, JWT + Refresh Token으로 결정함. 토큰 탈취 걱정에는 Refresh Token을 Redis에 사용자별로 저장하고 재발급할 때마다 새 토큰으로 바꾸는 방식으로 답함.';
const CARDS = {
  g2: { title: '모임 정원 초과 참여를 비관적 락으로 방지', line: '동시 참여 시 정원 초과를 비관적 락(대기 3초 제한)으로 막고 동시 참여 테스트로 검증', kws: ['문제 해결력', '실행력'] },
  g1: { title: 'Redis 캐시로 인기 모임 목록 조회 개선', line: '인기 모임 목록에 Redis 캐시(TTL 5분)를 적용해 메인 화면 진입 시 반복되는 DB 조회 개선', kws: ['문제 해결력', '의사결정 능력'],
    star: ['홈 화면에 들어올 때마다 인기 모임 목록을 DB에서 다시 조회하고 있었음.', '「인기 모임 목록 캐시 적용」(PR #42) 작업을 맡음.', '인기 모임 조회에 @Cacheable을 적용해 지역 코드별로 Redis에 캐시하고 TTL을 5분으로 설정함. 모임이 새로 생기거나 마감되면 @CacheEvict로 해당 지역 캐시를 비우게 함.', ''] },
  e11: { title: '배포 후 업로드 500 에러와 배포 체크리스트', line: '배포 후 발생한 업로드 500 에러의 원인(파일 크기 제한 누락)을 찾고 배포 체크리스트 도입', kws: ['문제 해결력', '실행력'] },
  e10: { title: 'JWT + Refresh Token 인증 설계', line: '모바일 확장을 고려해 JWT + Refresh Token 인증 구조를 설계하고, 세션 방식과의 장단점을 팀에 공유', kws: ['의사결정 능력', '커뮤니케이션', '실행력'],
    star: ['「모여봄」 인증 방식을 정해야 했는데 팀원마다 세션과 JWT 의견이 갈림.', '인증 담당으로 팀이 납득할 수 있는 근거를 갖고 방식을 정해야 했음.', JWT_ACTION, `${JWT_RESULT} ${JWT_LOGOUT}`] },
  e8: { title: '프론트와 API 명세 먼저 합의하기', line: '구현 전 Swagger 명세를 프론트와 먼저 합의하는 규칙을 제안해 응답 형식 변경으로 인한 재작업 감소', kws: ['협업능력', '추진력', '커뮤니케이션'] },
  e1: { title: '검색 API 응답 속도 개선 (N+1)', line: '모임 검색 API의 N+1 쿼리를 fetch join과 복합 인덱스로 해결해 평균 응답 시간 1.8s → 0.3s 단축', kws: ['문제 해결력', '분석적 사고', '학습능력'] },
};
const MOYEOBOM_CARDS = ['g2', 'g1', 'e11', 'e10', 'e8', 'e1'];
const STAR = ['상황', '과제', '행동', '결과'];
const STEPS = ['레포 정보 불러오는 중', '커밋·PR 읽는 중', '파일 구조 살펴보는 중', '코드 읽는 중', '경험 카드로 정리하는 중']; // github.js STEPS
const DEPLOY = [[14, '    steps:'], [15, '      - uses: actions/checkout@v4'], [16, '      - uses: actions/setup-java@v4'], [17, '        with:'], [18, '          distribution: temurin'], [19, "          java-version: '17'"], [20, '      - name: Test'], [21, '        run: ./gradlew test'], [22, '      - name: Build & push image'], [23, '        run: |'], [24, '          docker build -t ${{ secrets.DOCKER_REPO }}/moyeobom:${{ github.sha }} .'], [25, '          docker push ${{ secrets.DOCKER_REPO }}/moyeobom:${{ github.sha }}'], [26, '      - name: Deploy to EC2'], [27, '        uses: appleboy/ssh-action@v1'], [28, '        with:'], [29, '          host: ${{ secrets.EC2_HOST }}'], [30, '          script: cd ~/moyeobom && IMAGE_TAG=${{ github.sha }} docker compose up -d']];
const COMPOSE = [[1, 'services:'], [2, '  app:'], [3, '    image: ${DOCKER_REPO}/moyeobom:${IMAGE_TAG}'], [4, '    ports: ["8080:8080"]'], [5, '    env_file: .env'], [6, '    depends_on: [mysql, redis]'], [7, '  mysql:'], [8, '    image: mysql:8.0'], [9, '    volumes: ["mysql-data:/var/lib/mysql"]'], [10, '  redis:'], [11, '    image: redis:7-alpine']];
const PH = { room: '이야기를 이어서 적어 주세요', daily: '오늘의 질문에 답해 주세요. 한 줄이어도 괜찮아요', guide: '예: 검색 API가 느려서 고쳤어요', connect: '한 줄이어도 괜찮아요' };

/* ---------- 이 화면 파일의 컴포넌트 ---------- */
EXTRA_COMPONENTS.push({
  title: 'AI 채팅: 묻기, 레포 분석, 펼친 카드',
  build: async (row) => {
    // 묻기 상자의 한 칸: 칸 이름, 원래 글, 더한 글(기다리는 중에는 형광펜)
    await makeSet(row, 'Chat/Diff row', ['Wait', 'Closed'].map((k) => ({ props: { Tone: k }, build: async (c) => {
      const wait = k === 'Wait';
      auto(c, 'V', { gap: 2, w: 600 });
      c.appendChild(named(await text('행동', 'Small/13.5 Semibold', 'text-3'), 'field'));
      const b = named(await text('원래 글', 'Body/15', wait ? 'text' : 'text-2'), 'before'); c.appendChild(b); b.layoutSizingHorizontal = 'FILL'; b.textAutoResize = 'HEIGHT';
      const a = al('H', Object.assign({ name: 'added' }, wait ? { pad: [1, 3], fill: 'hl', radius: MARK_RADIUS } : {})); c.appendChild(a); a.layoutSizingHorizontal = 'FILL';
      const t = named(await text('더한 글', 'Body/15', wait ? 'text' : 'text-2'), 'addedText'); a.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT';
    } })), { dir: 'H', desc: '카드를 바꾸기 전에 묻는 상자의 한 칸. Wait: 더한 글에 형광펜. Closed(답한 뒤): 흐린 글, 형광펜 없음', props: [
      { name: 'Field', type: 'TEXT', default: '행동', node: 'field' }, { name: 'Before', type: 'TEXT', default: '원래 글', node: 'before' }, { name: 'Show before', type: 'BOOLEAN', default: true, node: 'before' },
      { name: 'Added', type: 'TEXT', default: '더한 글', node: 'addedText' }, { name: 'Show added', type: 'BOOLEAN', default: true, node: 'added' }] });

    // 묻기 상자: 바뀔 칸(최대 4) + 단추 또는 결과. 칸은 노출한 안쪽 「row 1」… 인스턴스를 setNested 로 채운다
    const DONE = { Ok: ['check', '허용했어요'], No: ['close', '거절했어요'], Fail: ['warning', '반영하지 못했어요'] };
    await makeSet(row, 'Chat/Confirm', ['Wait', 'Ok', 'No', 'Fail'].map((k) => ({ props: { State: k }, build: async (c) => {
      const wait = k === 'Wait';
      auto(c, 'V', { gap: 12, pad: [14, 16], w: 640, fill: wait ? 'surface' : null, stroke: 'border-strong', radius: 'radius/md' });
      if (!wait) c.dashPattern = [4, 4];
      const rows = al('V', { name: 'rows', gap: 10 }); c.appendChild(rows); rows.layoutSizingHorizontal = 'FILL';
      for (let n = 1; n <= 4; n++) { const r = expose(rows, named(inst('Chat/Diff row', { Tone: wait ? 'Wait' : 'Closed' }), `row ${n}`)); r.layoutSizingHorizontal = 'FILL'; }
      if (wait) {
        const f = al('H', { name: 'actions', gap: 8, wrap: true }); c.appendChild(f);
        const yes = btn('반영하기', 'Primary', 'Small', 'check'); yes.name = 'allow'; f.appendChild(yes);
        f.appendChild(btn('항상 허용', 'Secondary', 'Small')); f.appendChild(btn('거절', 'Ghost', 'Small'));
      } else {
        const st = al('H', { name: 'status', gap: 6, cross: 'center' }); c.appendChild(st);
        st.appendChild(icon(DONE[k][0], 15, 'text-3')); st.appendChild(await text(DONE[k][1], 'Small/13.5', 'text-3'));
      }
    } })), { desc: '카드를 바꾸기 전에 묻는 답. Wait: 흰 바탕 + 반영하기·항상 허용·거절 (새 카드는 안의 allow 단추를 「만들기」로). 답한 뒤(Ok·No·Fail)는 점선 테두리와 결과 한 줄', props: [
      { name: 'Show row 2', type: 'BOOLEAN', default: true, node: 'row 2' }, { name: 'Show row 3', type: 'BOOLEAN', default: false, node: 'row 3' }, { name: 'Show row 4', type: 'BOOLEAN', default: false, node: 'row 4' }] });

    // 오른쪽 펼친 카드의 한 칸
    await makeSet(row, 'Chat/Card field', ['Default', 'Changed', 'Blank', 'Keywords'].map((k) => ({ props: { State: k }, build: async (c) => {
      auto(c, 'V', { gap: 4, pad: [12, 8], w: 304, fill: k === 'Changed' ? 'hl-soft' : null, stroke: 'border-strong', sides: ['top'] });
      c.appendChild(named(await text('상황', 'Small/13.5 Semibold', 'text-3'), 'label'));
      if (k === 'Blank') {
        const b = al('H', { name: 'blank', pad: [6, 12], fill: 'surface-2', stroke: 'border-strong', radius: 'radius/sm' }); b.dashPattern = [4, 3]; c.appendChild(b); b.layoutSizingHorizontal = 'FILL';
        b.appendChild(await text('아직 비어 있어요', 'Small/13.5', 'text-3')); return;
      }
      const kw = k === 'Keywords';
      const v = named(await text('내용', kw ? 'Small/13.5 Medium' : 'Body/15', kw ? 'text-2' : 'text'), 'value'); c.appendChild(v); v.layoutSizingHorizontal = 'FILL'; v.textAutoResize = 'HEIGHT';
      if (k === 'Changed') {
        const m = al('H', { name: 'added', pad: [1, 3], fill: 'hl', radius: MARK_RADIUS }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
        const t = named(await text('더한 글', 'Body/15', 'text'), 'addedText'); m.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT';
      }
    } })), { desc: 'AI 채팅 오른쪽 펼친 카드의 한 칸(상황·과제·행동·결과·역량·이력서 한 줄). Changed: AI가 방금 바꾼 칸(연한 형광펜 바탕, 더한 글은 형광펜). Blank: 아직 비어 있어요', props: [
      { name: 'Label', type: 'TEXT', default: '상황', node: 'label' }, { name: 'Value', type: 'TEXT', default: '내용', node: 'value' },
      { name: 'Added', type: 'TEXT', default: '더한 글', node: 'addedText' }] });

    // 경험 카드 머리의 상태
    await makeSet(row, 'Chat/Panel status', ['Typing', 'Wait', 'Revert'].map((k) => ({ props: { State: k }, build: async (c) => {
      auto(c, 'H', { gap: 6, cross: 'center' });
      if (k === 'Revert') { c.appendChild(btn('되돌리기', 'Ghost', 'Small', 'restore')); return; }
      if (k === 'Typing') c.appendChild(spinner(14)); // 앱의 .chat-card-st .spinner
      else c.appendChild(icon('lock', 15, 'text-2'));
      c.appendChild(await text(k === 'Typing' ? '담는 중' : '허락을 기다려요', 'Small/13.5', 'text-2'));
    } })), { dir: 'H', desc: '오른쪽 경험 카드 머리의 상태. Typing: 담는 중, Wait: 허락을 기다려요, Revert: 방금 담은 것 되돌리기' });

    // 새 채팅 › 프로젝트 고르기의 한 줄
    await makeOne(row, 'Chat/Project choice', async (c) => {
      auto(c, 'H', { gap: 12, pad: [11, 8], w: 464, cross: 'center', stroke: 'border', sides: ['bottom'] }); c.minHeight = 56;
      c.appendChild(icon('folder', 18, 'text-3'));
      const t = named(await text('프로젝트', 'Body/15 Semibold', 'text'), 'name'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL';
      c.appendChild(named(icon('github', 16, 'text-3'), 'github'));
    }, { desc: '「새 채팅」에서 프로젝트 고르기. 레포를 연결한 프로젝트는 GitHub 표시', props: [{ name: 'Name', type: 'TEXT', default: '프로젝트', node: 'name' }, { name: 'Show GitHub', type: 'BOOLEAN', default: false, node: 'github' }] });
  },
});

/* ---------- 작은 도구 ---------- */
// 내 말풍선 폭: 글 길이에 맞추되 최대 520 (한글 15, 빈칸 4, 영숫자 8.5)
function bubbleW(s) {
  let w = 0; for (const ch of s) w += /[가-힣]/.test(ch) ? 15 : ch === ' ' ? 4 : 8.5;
  return Math.min(520, Math.ceil(w) + 30);
}
const kwText = (kws) => kws.join(KW_GAP);

/* ---------- 왼쪽: 대화방 목록 ---------- */
// o: { active: { project, room } (room: 이름 | 'daily' | 'new'), rooms: { 프로젝트: { rooms, more } }, hover: 프로젝트, projects: 목록 바꾸기, noChats }
async function chatTree(parent, o = {}) {
  const list = o.projects || TREE; const act = o.active || {};
  const t = al('V', { name: '대화방 목록', w: TREE_W, fill: 'surface', clip: true }); put(parent, t, { fillV: true });
  const head = al('H', { name: '단추', gap: 8, pad: [16, 16, 12, 16] }); put(t, head, { fill: true });
  if (list.length) { put(head, btn('새 채팅', 'Primary', 'Medium', 'plus'), { fill: true }); put(head, btn('새 프로젝트', 'Secondary', 'Medium'), { fill: true }); }
  else put(head, btn('새 프로젝트', 'Primary', 'Medium', 'plus'), { fill: true });
  const nav = al('V', { name: '프로젝트별 채팅', gap: 12, pad: [4, 10, 24, 10] }); put(t, nav, { fill: true });
  if (!list.length) { const p = al('V', { name: '프로젝트 없음', pad: [8, 8] }); put(nav, p, { fill: true }); await tput(p, '프로젝트를 만들면 바로 이야기를 시작할 수 있어요.', 'Small/13.5', 'text-3', { wrap: true }); return t; }
  for (const p of list) {
    const over = (o.rooms || {})[p.name] || {}; const rooms = over.rooms || p.rooms; const more = 'more' in over ? over.more : p.more;
    const pj = al('V', { name: p.name }); put(nav, pj, { fill: true });
    const hover = o.hover === p.name;
    const pr = al('H', { name: '프로젝트 이름', gap: 6, pad: [4, 6], cross: 'center', minH: 38, radius: 'radius/sm', fill: hover ? 'surface-2' : null }); put(pj, pr, { fill: true });
    pr.appendChild(icon('chevron-down', 16, 'text-3')); pr.appendChild(await text(p.name, 'Small/13.5 Semibold', 'text'));
    if (p.gh) pr.appendChild(named(icon('github', 14, 'text-3'), 'GitHub 연결됨'));
    if (hover) { spacer(pr); pr.appendChild(inst('Icon button', { Size: 'Small', Icon: 'plus' })); const m = inst('Icon button', { Size: 'Small', Icon: 'more' }); m.name = '프로젝트 메뉴'; m.fills = fills('surface-3'); pr.appendChild(m); }
    const here = act.project === p.name;
    if (here && act.room === 'new') put(pj, inst('Chat/Room row', { State: 'Active', Name: '새 채팅', 'Show time': false }), { fill: true });
    if (o.noChats) { const n = al('H', { name: '대화방 없음', pad: [6, 0, 6, 28] }); put(pj, n, { fill: true }); n.appendChild(await text('아직 대화방이 없어요', 'Small/13.5', 'text-3')); continue; }
    const d = inst('Chat/Daily row', { State: here && act.room === 'daily' ? 'Active' : 'Default', Unanswered: !!p.ongoing }); put(pj, d, { fill: true });
    for (const [name, when] of rooms) put(pj, inst('Chat/Room row', { State: here && act.room === name ? 'Active' : 'Default', Name: name, Time: when }), { fill: true });
    if (more) { const m = al('H', { name: '더 보기', pad: [6, 0, 6, 28] }); put(pj, m, { fill: true }); m.appendChild(await text(`${more}개 더 보기`, 'Small/13.5', 'text-3')); }
  }
  return t;
}

/* ---------- 오른쪽: 이 프로젝트의 경험 카드 ---------- */
// o: { cards: [id], open: id, changed: { 칸: 더한 글 }, before: { 칸: 원래 글 }, status: 'Typing' | 'Wait' | 'Revert' }
async function cardPanel(parent, o = {}) {
  const ids = o.cards || MOYEOBOM_CARDS;
  const p = al('V', { name: '경험 카드', w: PANEL_W, fill: 'surface-2', clip: true }); put(parent, p, { fillV: true });
  const top = al('H', { name: '머리', gap: 8, pad: [8, 20], cross: 'center', minH: 57, stroke: 'border', sides: ['bottom'] }); put(p, top, { fill: true });
  const h2 = al('H', { name: '제목', gap: 8, cross: 'center' }); put(top, h2, { fill: true });
  h2.appendChild(await text('경험 카드', 'Body/15 Semibold', 'text')); if (ids.length) h2.appendChild(await text(`${ids.length}장`, 'Small/13.5 Medium', 'text-3'));
  if (o.status) top.appendChild(inst('Chat/Panel status', { State: o.status }));
  const body = al('V', { name: '카드 목록', gap: 8, pad: 20 }); put(p, body, { fill: true });
  if (!ids.length) {
    const e = al('V', { name: '빈 목록', gap: 4, pad: [16, 0] }); put(body, e, { fill: true });
    await tput(e, '이야기를 들려주면 AI가 이 프로젝트의 경험 카드를 만들어요.', 'Body/15', 'text-2', { wrap: true });
    await tput(e, '어느 카드에 담을지는 AI가 골라요.', 'Small/13.5', 'text-3', { wrap: true }); return p;
  }
  if (!o.open) await tput(body, '카드를 누르면 자세히 볼 수 있어요.', 'Small/13.5', 'text-3', { name: '안내' });
  for (const id of ids) {
    const c = CARDS[id];
    if (id === o.open) await openCard(body, c, o.changed, o.before);
    else { const tile = inst('Card/Tile', { Title: c.title, 'Resume line': c.line, Keywords: kwText(c.kws) }); tile.name = c.title; put(body, tile, { fill: true }); }
  }
  return p;
}
// 목록의 제자리에서 펼친 카드. changed: 방금 바뀐 칸 → 더한 글 (before 에 원래 글)
async function openCard(list, c, changed = {}, before = {}) {
  const det = al('V', { name: `펼친 카드: ${c.title}`, gap: 8, pad: [16, 8, 14, 8], fill: 'surface', stroke: 'primary', radius: 'radius/md' }); put(list, det, { fill: true });
  const head = al('H', { name: '머리 (누르면 접힘)', gap: 8, pad: [0, 8], cross: 'start' }); put(det, head, { fill: true });
  await tput(head, c.title, 'Title/17', 'text', { wrap: true }); head.appendChild(icon('chevron-up', 16, 'text-3'));
  const fs = al('V', { name: '칸', pad: [4, 0, 0, 0] }); put(det, fs, { fill: true });
  const row = (props) => { const f = inst('Chat/Card field', props); f.name = props.Label; put(fs, f, { fill: true }); };
  STAR.forEach((label, i) => {
    const add = changed[label];
    if (add) row({ State: 'Changed', Label: label, Value: before[label] || '', Added: add });
    else if (c.star[i]) row({ State: 'Default', Label: label, Value: c.star[i] });
    else row({ State: 'Blank', Label: label });
  });
  row({ State: 'Keywords', Label: '역량', Value: kwText(c.kws) });
  row({ State: 'Default', Label: '이력서 한 줄', Value: c.line });
  const foot = al('H', { name: '아래', pad: [4, 8, 0, 8] }); put(det, foot, { fill: true });
  put(foot, btn('경험 카드 열기', 'Secondary', 'Medium', 'card'), { fill: true });
  return det;
}

/* ---------- 가운데: 대화방 ---------- */
async function roomHead(room, o) {
  const h = al('H', { name: '머리', gap: 10, pad: [8, 20, 8, 28], cross: 'center', minH: 57, stroke: 'border', sides: ['bottom'] }); put(room, h, { fill: true });
  if (o.project) h.appendChild(inst('Project chip', { Label: o.project }));
  h.appendChild(await text(o.title, 'Body/15 Semibold', 'text', { name: '제목 (h1)' })); spacer(h);
  if (o.menu) { const m = inst('Icon button', { Size: 'Medium', Icon: 'more' }); m.name = '대화방 메뉴'; if (o.menuOpen) m.fills = fills('surface-3'); h.appendChild(m); }
  return h;
}
// 머리 + 대화 열. grow: 대화 길이만큼 늘어난다, 아니면 화면 높이에서 잘리고 align(end: 최근 대화가 보이게, start: 위부터)
async function roomBody(room, o) {
  await roomHead(room, o);
  const body = al('V', { name: '대화', cross: 'center', main: o.grow ? 'start' : (o.align || 'end'), clip: !o.grow }); put(room, body, { fill: true, fillV: !o.grow });
  const col = al('V', { name: '대화 열', w: COL_W, gap: 20, pad: [28, 28, 24, 28] }); body.appendChild(col);
  return col;
}
// 대화를 차례로 쌓는다
function talk(col) {
  return {
    async me(s, w) {
      const r = al('H', { name: '내 말', main: 'end' }); put(col, r, { fill: true });
      const b = inst('Chat/My message', { Text: s }); r.appendChild(b); b.layoutSizingHorizontal = 'FIXED'; b.resize(w || bubbleW(s), b.height); return r;
    },
    // o: { name, chip: [카드, 바뀐 칸], then: async (box) => {} 글 아래에 붙는 것 }
    async ai(s, o = {}) {
      const r = al('H', { name: o.name || 'AI 답', gap: 12 }); put(col, r, { fill: true });
      r.appendChild(inst('Chat/AI mark'));
      const box = al('V', { name: '내용', gap: 12 }); put(r, box, { fill: true });
      if (o.chip) box.appendChild(inst('Chat/Card chip', { Card: o.chip[0], Fields: o.chip[1] }));
      if (s) await tput(box, s, 'Body/15', 'text', { wrap: true, name: '글' });
      if (o.then) await o.then(box);
      return box;
    },
    day(label) { const d = inst('Chat/Day divider', { Label: label }); d.name = `날짜: ${label}`; put(col, d, { fill: true }); },
    typing() { const r = al('H', { name: 'AI 답 쓰는 중', gap: 12 }); put(col, r, { fill: true }); r.appendChild(inst('Chat/AI mark')); r.appendChild(inst('Chat/Typing')); },
  };
}
// 입력: 빠른 단추(GitHub, 카드 바꾸기 전에 묻기) + 입력칸. o: { quick: false, connect: GitHub 연결 전, permOn }
async function composer(room, ph, o = {}) {
  const foot = al('V', { name: '입력', cross: 'center', fill: 'surface', stroke: 'border', sides: ['top'] }); put(room, foot, { fill: true });
  const form = al('V', { name: '입력 폼', w: COL_W, gap: 4, pad: [8, 28, 20, 28] }); foot.appendChild(form);
  if (o.quick !== false) {
    const q = al('H', { name: '빠른 단추', cross: 'center' }); put(form, q, { fill: true });
    q.appendChild(btn(o.connect ? 'GitHub 연결' : 'GitHub에서 찾기', 'Ghost', 'Small', 'github')); spacer(q);
    const perm = al('H', { name: '카드 바꾸기 전에 묻기', gap: 8, pad: [0, 10], cross: 'center' }); q.appendChild(perm);
    perm.appendChild(inst('Switch', { On: o.permOn ? 'On' : 'Off' })); perm.appendChild(await text('카드 바꾸기 전에 묻기', 'Small/13.5 Medium', 'text-2'));
  }
  const input = al('H', { name: '입력칸', gap: 8, pad: [5, 6, 5, 14], cross: 'center', fill: 'surface', stroke: 'field-border', radius: 'radius/sm', minH: 48 }); put(form, input, { fill: true });
  await tput(input, ph, 'Body/15', 'text-3', { wrap: true, name: '안내 글' });
  const send = inst('Icon button', { Size: 'Medium', Icon: 'send' }); send.name = '보내기'; recolor(send, 'primary'); disable(send); input.appendChild(send);
  return foot;
}

/* ---------- 대화 안의 GitHub (G3, G4) ---------- */
const ghButton = (label) => btn(label, 'Secondary', 'Medium', 'github');
const ghError = (box, msg) => put(box, named(banner('Danger', msg, '다시 시도'), '실패 알림'), { fill: true }); // 앱의 .banner-danger + 다시 시도
async function madeList(box, rows) {
  const l = al('V', { name: '만든 카드', stroke: 'border', sides: ['top'] }); put(box, l, { fill: true });
  for (const [title, miss] of rows) {
    const r = inst('Repo/Made card', Object.assign({ Title: title, 'Show empty': !!miss }, miss ? { 'Empty fields': `비어 있는 칸: ${miss}` } : {})); r.name = title; put(l, r, { fill: true });
  }
}
async function analysisSteps(box, at, current) {
  const pn = al('V', { name: '분석 중', gap: 16, pad: 20, fill: 'surface-2', radius: 'radius/md' }); put(box, pn, { fill: true });
  const repo = al('H', { name: '레포', gap: 8, cross: 'center' }); put(pn, repo, { fill: true });
  repo.appendChild(icon('github', 16, 'text')); repo.appendChild(await text('moyeobom-backend', 'Body/15 Semibold', 'text'));
  const n = await text('1 / 2', 'Small/13.5', 'text-3', { name: '레포 순서 (연결한 레포가 둘 이상일 때)' }); n.visible = false; repo.appendChild(n);
  const st = al('V', { name: '단계', gap: 12 }); put(pn, st, { fill: true });
  STEPS.forEach((s, k) => put(st, inst('Analysis/Step', { State: k < at ? 'Done' : k === at ? 'Current' : 'Pending', Label: k === at && current ? current : s }), { fill: true }));
}
// 찾은 작업 고르기: 첫 작업은 「자세히 보기」를 펼친 모습 (seed-repos.js gh_actions)
const GH_ACTIONS = { title: 'GitHub Actions 배포 자동화', line: 'main에 병합되면 테스트, 이미지 빌드, 서버 배포가 이어지도록 GitHub Actions와 Docker Compose 구성', keywords: kwText(['실행력', '추진력']),
  star: [['상황', '백엔드·MySQL·Redis를 서버에 함께 올려야 했음.'], ['과제', '「배포 자동화」(PR #52) 작업을 맡음.'], ['행동', 'GitHub Actions에서 테스트 → Docker 이미지 빌드·푸시 → EC2의 compose 재시작이 이어지게 하고, 앱·MySQL·Redis를 docker-compose.yml로 정의함.'], ['결과', '']],
  evidence: { repo: 'moyeobom-team/moyeobom-backend', sample: true,
    commits: [['1c5b9e7', 'ci: 테스트·이미지 빌드 워크플로 추가', '10월 27일'], ['e64a0d2', 'ci: EC2 배포 단계 추가', '10월 28일'], ['97f3c58', 'chore: docker-compose에 redis 추가', '10월 28일']],
    prs: [['#52', '배포 자동화 (GitHub Actions + Docker Compose)', '10월 28일']],
    code: [{ path: '.github/workflows/deploy.yml:14-30', lines: DEPLOY, hl: [14, 21, 27] }, { path: 'docker-compose.yml:1-11', lines: COMPOSE, hl: [1] }] } };
async function draftList(box) {
  const list = al('V', { name: '찾은 작업', gap: 12 }); put(box, list, { fill: true });
  await openDraft(list, GH_ACTIONS);
  const d2 = inst('Repo/Draft', { Selected: 'Off', Title: 'Testcontainers로 검색·참여 통합 테스트 구성', 'Resume line': '운영과 같은 MySQL 컨테이너에서 검색·참여 API를 검증하는 통합 테스트 제작', Keywords: '실행력', Evidence: '커밋 2개  PR 1개  코드 1곳' });
  put(list, d2, { fill: true });
  const foot = al('H', { name: '고르기 단추', cross: 'center' }); put(box, foot, { fill: true });
  foot.appendChild(btn('모두 고르기', 'Ghost', 'Small')); spacer(foot); foot.appendChild(btn('경험 카드 1장 만들기', 'Primary', 'Medium'));
}
// 묻기 상자. rows: [[칸, 원래 글, 더한 글]]
async function confirmBox(box, state, rows) {
  const wait = state === 'Wait';
  const cf = inst('Chat/Confirm', { State: state, 'Show row 2': rows.length >= 2, 'Show row 3': rows.length >= 3, 'Show row 4': rows.length >= 4 }); cf.name = '바뀔 내용'; put(box, cf, { fill: true });
  rows.forEach(([field, before, added], i) => {
    const full = [before, added].filter(Boolean).join(' '); // 답한 뒤에는 바뀐 모습만 흐리게
    setNested(cf, `row ${i + 1}`, wait ? { Field: field, Before: before || ' ', 'Show before': !!before, Added: added || ' ', 'Show added': !!added } : { Field: field, Before: full, 'Show before': true, 'Show added': false });
  });
  return cf;
}

/* ---------- 화면 틀 ---------- */
// o: { tree, panel: cardPanel 옵션 | null, grow, room: async (room) => {} }
async function chatScreen(frame, o) {
  const { screen, main } = shell(frame, 'Chat');
  // 화면 높이(1080)에 맞춘 틀. grow 면 대화방이 늘어나는 만큼 틀도 늘어난다
  const app = al('H', o.grow ? { name: 'AI 채팅', minH: H } : { name: 'AI 채팅', h: H }); put(main, app, { fill: true });
  await chatTree(app, o.tree);
  const room = al('V', { name: '대화방', fill: 'surface', stroke: 'border', sides: o.panel ? ['left', 'right'] : ['left'] }); put(app, room, { fill: true, fillV: !o.grow });
  if (o.panel) await cardPanel(app, o.panel);
  await o.room(room);
  if (o.grow) screen.minHeight = Math.max(H, Math.ceil(room.height));
  fit(frame, screen);
  return { screen, room };
}

/* ---------- 방 내용 ---------- */
// 「AI 답변 종류 모아 보기」 (seed-replies.js c_kinds): 메시지 26개
async function kindsRoom(room, grow) {
  const col = await roomBody(room, { project: '모여봄', title: 'AI 답변 종류 모아 보기', menu: true, grow, align: 'start' });
  const c = talk(col);
  // 1. 카드 칩
  await c.ai('이 대화방은 AI 채팅의 답변 종류를 한곳에서 볼 수 있게 모아 둔 예시예요. 위에서부터 차례로 내려가며 보세요.');
  await c.me('로그인 쪽 이야기 더 할게요. Refresh Token은 재발급할 때마다 새 토큰으로 바꿔서 한 번만 쓰이게 했어요.', 520);
  await c.ai('그 결과 무엇이 달라졌나요? 숫자로 말할 수 있는 게 있을까요?', { name: 'AI 답: 카드 칩', chip: [CARDS.e10.title, '행동'] });
  await c.ai('나중에 휴지통으로 옮긴 카드를 바꿨던 답이에요. 칩은 똑같이 보이고, 누르면 휴지통에 있다고 알려 줘요.', { name: 'AI 답: 카드 칩 (휴지통 카드)', chip: ['모임 공지 푸시 알림 붙이기', '행동'] });
  await c.ai('나중에 완전히 지운 카드를 만들었던 답이에요. 누르면 지워진 카드라고 알려 줘요.', { name: 'AI 답: 카드 칩 (지워진 카드)', chip: ['모임 일정 투표 만들기', '상황'] });
  // 2. GitHub로 이어 주기
  await c.me('깃허브에서 찾아줘', 160);
  await c.ai('GitHub에서 찾은 작업은 이 프로젝트의 경험 카드로 만들어져요.', { name: 'AI 답: GitHub로 이어 주기', then: async (b) => b.appendChild(ghButton('GitHub에서 찾기')) });
  // 3. 레포 분석
  await c.ai('GitHub 레포를 읽다가 멈췄어요.', { name: 'AI 답: 레포 분석 (멈춤)', then: async (b) => b.appendChild(btn('다시 시도', 'Secondary', 'Small')) });
  await c.ai('레포를 다 읽지 못했어요.', { name: 'AI 답: 레포 분석 (실패)', then: (b) => ghError(b, 'GitHub 요청 한도를 넘었어요. 1시간 뒤에 다시 시도해 주세요.') });
  await c.ai('커밋 87개와 PR 34개를 읽고 경험이 될 작업을 2개 찾았어요. 카드로 만들 작업을 골라 주세요.', { name: 'AI 답: 레포 분석 (고르기)', then: draftList });
  await c.ai('새로 카드로 만들 작업은 없어요. 이 레포에서 만든 경험 카드예요.', { name: 'AI 답: 레포 분석 (새로 만들 것 없음)', then: (b) => madeList(b, [[CARDS.g1.title, '결과'], [CARDS.g2.title, '']]) });
  await c.ai('경험 카드 1장을 만들었어요.', { name: 'AI 답: 레포 분석 (만든 뒤)', then: async (b) => { await madeList(b, [[CARDS.g1.title, '결과']]); b.appendChild(btn('남은 작업 2개 보기', 'Ghost', 'Small')); } });
  // 4. 바꾸기 전에 묻기
  await c.me('다른 이야기인데, 모임 사진을 올리기 전에 브라우저에서 이미지를 압축했어요.', 520);
  await c.ai('새 경험 카드 「업로드 전에 모임 사진 압축하기」를 만들까요?', { name: 'AI 답: 묻기 (만들기, 거절함)', then: (b) => confirmBox(b, 'No', [['제목', '', '업로드 전에 모임 사진 압축하기'], ['행동', '', '모임 사진을 올리기 전에 브라우저에서 이미지를 압축함.'], ['역량', '', '문제 해결력'], ['이력서 한 줄', '', '업로드 전 이미지 압축으로 모임 사진 용량 절감']]) });
  await c.ai('카드는 그대로 두었어요. 다르게 담고 싶으면 다시 말씀해 주세요.');
  await c.me('로그아웃하면 Redis에서 토큰을 바로 지워서 다른 기기의 세션도 끊겼어요.', 484);
  await c.ai(`「${CARDS.e10.title}」 카드의 결과를 이렇게 바꿀까요?`, { name: 'AI 답: 묻기 (고치기, 허용함)', then: (b) => confirmBox(b, 'Ok', [['결과', JWT_RESULT, JWT_LOGOUT]]) });
  await c.ai('더 있었던 일이 있으면 이어서 적어 주세요.', { name: 'AI 답: 카드 칩', chip: [CARDS.e10.title, '결과'] });
  await c.me('검색 API는 그 뒤로 슬로우 쿼리 로그를 주마다 점검했어요.', 420);
  await c.ai(`「${CARDS.e1.title}」 카드의 행동을 이렇게 바꿀까요?`, { name: 'AI 답: 묻기 (고치기, 반영 못 함)', then: (b) => confirmBox(b, 'Fail', [['행동', '감으로 고치지 않고 쿼리 로그부터 확인해 N+1 문제를 발견함. fetch join으로 쿼리를 묶고, 검색 조건으로 가장 많이 쓰는 지역·카테고리 컬럼에 인덱스를 추가한 뒤 EXPLAIN으로 풀 스캔이 사라진 것을 확인함. 페이징과 함께 쓸 때 생긴 경고는 컬렉션 조회만 batch size로 따로 처리함.', '느린 쿼리는 주마다 슬로우 쿼리 로그로 점검함.']]) });
  await c.ai('그사이 카드가 바뀌어서 반영하지 않았어요. 다시 말씀해 주시면 지금 카드에 맞춰 담을게요.');
  await c.me('이 카드 지워 줘', 140);
  await c.ai('「모임 공지 푸시 알림 붙이기」 카드를 휴지통으로 옮길까요? 30일 안에는 되돌릴 수 있어요.', { name: 'AI 답: 묻기 (지우기, 답한 뒤)' }); // 지우기는 답한 뒤 단추가 사라지고, 이어지는 답이 결과를 말한다
  await c.ai('「모임 공지 푸시 알림 붙이기」 카드를 휴지통으로 옮겼어요. 대화방은 그대로 남아요.');
  await c.me('재발급 요청이 몰릴 때를 대비해서 사용자별로 1초에 한 번만 재발급하게 막았어요.', 520);
  await c.ai(`「${CARDS.e10.title}」 카드의 행동을 이렇게 바꿀까요?`, { name: 'AI 답: 묻기 (고치기, 기다리는 중)', then: (b) => confirmBox(b, 'Wait', [['행동', JWT_ACTION, '재발급 요청이 몰릴 때를 대비해 사용자별로 1초에 한 번만 재발급하게 막음.']]) });
  await composer(room, PH.room, { permOn: true }); // 기다리는 제안이 있으니 묻기가 켜져 있다
}
const KINDS = { tree: { active: { project: '모여봄', room: 'AI 답변 종류 모아 보기' } }, panel: { open: 'e10', status: 'Wait' } };

// 「JWT + Refresh Token 인증 설계」 방에서 이야기를 이어 가는 중 (data.js c_e10 + 방금 결과를 더한 답)
const JWT_TREE = { active: { project: '모여봄', room: CARDS.e10.title }, rooms: { 모여봄: { rooms: [[CARDS.e10.title, '21:12'], ['AI 답변 종류 모아 보기', '09:00'], ['배포 후 업로드 500 에러와 배포 체크리스트', '11/19'], ['GitHub에서 찾은 경험', '11/18']] } } };
const JWT_CHANGED = { changed: { 결과: JWT_LOGOUT }, before: { 결과: JWT_RESULT } };
async function jwtRoom(room, o = {}) {
  const col = await roomBody(room, { project: '모여봄', title: CARDS.e10.title, menu: true, menuOpen: o.menuOpen });
  const c = talk(col);
  await c.ai('코드에서 「JWT + Spring Security 인증 구현」을 찾았어요. 왜 이렇게 만들게 됐나요?');
  await c.me('나중에 모바일 앱도 붙일 생각이라 세션보다 JWT가 낫다고 봤어요. 다만 팀원들이 토큰이 털리면 어떡하냐고 걱정해서 Refresh Token을 같이 두기로 했어요.', 520);
  await c.ai('Refresh Token은 어디에 두고, 탈취는 어떻게 막았어요?');
  await c.me('Redis에 사용자별로 저장하고, 재발급할 때마다 새 토큰으로 바꿔서 털린 토큰은 한 번만 쓸 수 있게 했어요.', 520);
  await c.ai('지금까지 이야기를 경험 카드로 정리했어요.');
  await c.me('로그아웃하면 Redis에서 토큰을 바로 지워서 다른 기기의 세션도 끊겼어요.', 484);
  await c.ai('더 있었던 일이 있으면 이어서 적어 주세요.', { name: 'AI 답: 카드 칩', chip: [CARDS.e10.title, '결과'] });
  if (o.typing) { await c.me('재발급 요청이 몰릴 때를 대비해서 사용자별로 1초에 한 번만 재발급하게 막았어요.', 520); c.typing(); }
  await composer(room, PH.room, { permOn: o.permOn });
}
const jwtScreen = (frame, o = {}) => chatScreen(frame, { tree: JWT_TREE, panel: Object.assign({ open: 'e10', status: o.typing ? 'Typing' : 'Revert' }, JWT_CHANGED), room: (r) => jwtRoom(r, o) });

// 새 채팅 안내 (AI 의 말이 아니라 대화에 남지 않는다)
async function guide(col, title, paras) {
  const g = al('V', { name: '안내', gap: 8, w: 576 }); col.appendChild(g);
  await tput(g, title, 'Title/17', 'text', { wrap: true, name: '제목 (h2)' });
  const ps = al('V', { name: '글', gap: 6 }); put(g, ps, { fill: true });
  for (const p of paras) await tput(ps, p, 'Body/15', 'text-2', { wrap: true });
}
// 가운데를 비운 화면 (빈 화면, 없는 방)
async function emptyRoom(room, title, desc, buttons) {
  const b = al('V', { name: '빈 화면', main: 'center', cross: 'center' }); put(room, b, { fill: true, fillV: true });
  await empty(b, title, desc, buttons);
}

/* ---------- 화면 ---------- */
const G = 'AI 채팅';

// 1. 답변 종류 모아 보기: 높이는 대화 길이에 맞춘다
SCREENS.push({ group: G, title: 'AI 답변 종류 모아 보기', build: async (frame) => {
  await chatScreen(frame, Object.assign({ grow: true, room: (r) => kindsRoom(r, true) }, KINDS));
} });

// 2. 오늘의 질문 (모여봄): 날짜 줄로 나뉜 지난 질문과 답, 아직 답하지 않은 오늘 질문. 오른쪽에는 그 질문이 묻는 카드
SCREENS.push({ group: G, title: '오늘의 질문', build: async (frame) => {
  await chatScreen(frame, { tree: { active: { project: '모여봄', room: 'daily' } }, panel: { open: 'g1' }, room: async (room) => {
    const col = await roomBody(room, { project: '모여봄', title: '오늘의 질문', menu: false }); // 오늘의 질문 방은 이름 바꾸기·지우기 메뉴가 없다
    const c = talk(col);
    c.day('11월 26일');
    await c.ai('최근에 팀원에게 설명하거나 설득한 일이 있었나요?');
    await c.me('프론트 팀원한테 페이지네이션 응답 형식을 설명했어요. 무한 스크롤이라 커서 방식으로 바꾸자고 설득했어요.', 520);
    await c.ai('더 있었던 일이 있으면 이어서 적어 주세요.', { chip: [CARDS.e8.title, '행동'] });
    c.day('11월 27일');
    await c.ai('최근에 가장 오래 고민한 문제는 뭐였나요? 어떻게 풀었는지도 들려주세요.');
    await c.me('코드 리뷰에서 검색 쿼리의 트랜잭션 범위가 너무 넓다는 피드백을 받고 메서드를 나눴어요.', 520);
    await c.ai('더 있었던 일이 있으면 이어서 적어 주세요.', { chip: [CARDS.e1.title, '행동'] });
    c.day('오늘');
    await c.ai(`「${CARDS.g1.title}」 카드의 결과가 아직 비어 있어요. 그 결과 무엇이 달라졌나요? 숫자로 말할 수 있는 게 있을까요?`, { name: 'AI 답: 오늘의 질문 (아직 답하지 않음)' });
    await composer(room, PH.daily);
  } });
} });

// 3. 대화방: AI 가 답을 쓰는 중, 오른쪽은 방금 바뀐 카드(바뀐 칸 연한 형광펜, 더한 글 형광펜)와 「담는 중」
SCREENS.push({ group: G, title: '대화방', build: async (frame) => { await jwtScreen(frame, { typing: true }); } });

// 4. 새 채팅
SCREENS.push({ group: G, title: '새 채팅 / 프로젝트 고르기', build: async (frame) => {
  await chatScreen(frame, { tree: {}, panel: null, room: async (room) => {
    await roomHead(room, { title: '새 채팅' });
    const body = al('V', { name: '대화', cross: 'center' }); put(room, body, { fill: true, fillV: true });
    const pick = al('V', { name: '프로젝트 고르기', gap: 16, pad: [40, 28], w: 520 }); body.appendChild(pick);
    await tput(pick, '어떤 프로젝트 이야기인가요?', 'Title/17', 'text', { name: '제목 (h2)' });
    const list = al('V', { name: '프로젝트', stroke: 'border', sides: ['top'] }); put(pick, list, { fill: true });
    for (const p of TREE) { const r = inst('Chat/Project choice', { Name: p.name, 'Show GitHub': !!p.gh }); r.name = p.name; put(list, r, { fill: true }); }
    pick.appendChild(btn('새 프로젝트', 'Secondary', 'Medium', 'plus'));
  } });
} });
SCREENS.push({ group: G, title: '새 채팅 / 프로젝트 없음', build: async (frame) => {
  await chatScreen(frame, { tree: { projects: [] }, panel: null, room: async (room) => {
    await roomHead(room, { title: '새 채팅' });
    const body = al('V', { name: '대화', cross: 'center' }); put(room, body, { fill: true, fillV: true });
    const pick = al('V', { name: '프로젝트 고르기', gap: 16, pad: [40, 28], w: 520 }); body.appendChild(pick);
    await tput(pick, '먼저 프로젝트를 만들어 주세요', 'Title/17', 'text', { name: '제목 (h2)' });
    await tput(pick, '팀 과제, 동아리, 아르바이트도 프로젝트예요.', 'Body/15', 'text-2');
    pick.appendChild(btn('새 프로젝트', 'Primary', 'Medium', 'plus'));
  } });
} });
SCREENS.push({ group: G, title: '새 채팅 / 안내', build: async (frame) => {
  await chatScreen(frame, { tree: { active: { project: '모여봄', room: 'new' } }, panel: {}, room: async (room) => {
    const col = await roomBody(room, { project: '모여봄', title: '새 채팅', align: 'start' });
    await guide(col, '있었던 일을 적어 주세요', ['한 줄이어도 괜찮아요. AI가 이 프로젝트의 알맞은 경험 카드를 골라 채우고, 빠진 내용은 물어봐요.', '아래 「GitHub에서 찾기」를 누르면 커밋과 PR에서도 경험을 찾을 수 있어요.']);
    await composer(room, PH.guide);
  } });
} });
SCREENS.push({ group: G, title: '새 채팅 / 카드를 펼쳐 두고', build: async (frame) => {
  await chatScreen(frame, { tree: { active: { project: '모여봄', room: 'new' } }, panel: { open: 'g1' }, room: async (room) => {
    const col = await roomBody(room, { project: '모여봄', title: '새 채팅', align: 'start' });
    await guide(col, `「${CARDS.g1.title}」 카드에 담을 이야기를 적어 주세요`, ['결과는 아직 비어 있어요. 그 결과 무엇이 달라졌나요? 숫자로 말할 수 있는 게 있을까요?', '다른 카드 이야기를 해도 괜찮아요. AI가 알맞은 카드에 담아요.']);
    await composer(room, PH.guide);
  } });
} });
SCREENS.push({ group: G, title: '새 채팅 / GitHub 연결 전', build: async (frame) => { // #/chat/new?github=1, 레포가 없는 슬랙봇. 오른쪽 카드 없음
  await chatScreen(frame, { tree: { active: { project: '슬랙봇', room: 'new' } }, panel: null, room: async (room) => {
    const col = await roomBody(room, { project: '슬랙봇', title: '새 채팅', align: 'start' });
    await talk(col).ai('이 프로젝트에 연결한 GitHub 레포가 아직 없어요. 연결하면 바로 찾아볼게요.', { name: 'AI 답: GitHub 연결', then: async (b) => b.appendChild(ghButton('GitHub 연결')) });
    await composer(room, PH.connect, { quick: false });
  } });
} });

// 5. GitHub 분석 중 (G3): 새로 만든 「GitHub에서 찾은 경험」 방
SCREENS.push({ group: G, title: 'GitHub 분석 중', build: async (frame) => {
  const tree = { active: { project: '모여봄', room: 'GitHub에서 찾은 경험' }, rooms: { 모여봄: { rooms: [['GitHub에서 찾은 경험', '21:30'], ['AI 답변 종류 모아 보기', '09:00'], ['배포 후 업로드 500 에러와 배포 체크리스트', '11/19'], ['GitHub에서 찾은 경험', '11/18']], more: 3 } } };
  await chatScreen(frame, { tree, panel: {}, room: async (room) => {
    const col = await roomBody(room, { project: '모여봄', title: 'GitHub에서 찾은 경험', menu: true, align: 'start' });
    await talk(col).ai('연결한 GitHub 레포를 읽고 있어요.', { name: 'AI 답: 레포 분석 (읽는 중)', then: (b) => analysisSteps(b, 3, '코드 읽는 중 (3/8)') });
    await composer(room, PH.room);
  } });
} });

// 6. 띄우는 것
SCREENS.push({ group: G, title: '대화방 메뉴', build: async (frame) => {
  const { screen } = await jwtScreen(frame, { menuOpen: true });
  menuUnder(frame, screen.findOne((n) => n.name === '대화방 메뉴'), [{ label: '이름 바꾸기', icon: 'edit' }, '-', { label: '휴지통으로 옮기기', icon: 'trash', danger: true }], { at: [1308, 52] });
} });
SCREENS.push({ group: G, title: '프로젝트 메뉴', build: async (frame) => {
  const { screen } = await chatScreen(frame, { tree: Object.assign({ hover: '모여봄' }, JWT_TREE), panel: Object.assign({ open: 'e10', status: 'Revert' }, JWT_CHANGED), room: (r) => jwtRoom(r) });
  menuUnder(frame, screen.findOne((n) => n.name === '프로젝트 메뉴'), [{ label: '프로젝트 열기', icon: 'folder' }, { label: 'GitHub에서 찾기', icon: 'github' }, '-', { label: '휴지통으로 옮기기', icon: 'trash', danger: true }], { align: 'start', at: [446, 110] });
} });
SCREENS.push({ group: G, title: '이름 바꾸기', build: async (frame) => {
  await jwtScreen(frame);
  await modal(frame, { title: '이름 바꾸기', body: async (b) => { await field(b, { label: '대화방 이름', input: { Content: 'Value', State: 'Focus', Text: CARDS.e10.title } }); }, buttons: [btn('취소', 'Secondary'), btn('저장', 'Primary')] });
} });
SCREENS.push({ group: G, title: '프로젝트를 휴지통으로', build: async (frame) => {
  await jwtScreen(frame);
  await modal(frame, { title: '「모여봄」 프로젝트를 휴지통으로 옮길까요?', body: (b) => modalText(b, '대화방 7개와 경험 카드 6장도 함께 옮겨져요. 30일 안에는 되돌릴 수 있어요.'), buttons: [btn('취소', 'Secondary'), btn('휴지통으로 옮기기', 'Danger')] });
} });
SCREENS.push({ group: G, title: '휴지통으로 옮긴 카드 알림', build: async (frame) => { // 휴지통에 있는 카드의 칩을 눌렀을 때
  await chatScreen(frame, Object.assign({ room: (r) => kindsRoom(r, false) }, KINDS));
  toast(frame, '휴지통으로 옮긴 카드예요', '휴지통 보기');
} });
SCREENS.push({ group: G, title: '카드 바꾸기 전에 묻기 켬', build: async (frame) => {
  await jwtScreen(frame, { permOn: true });
  toast(frame, '이제 카드를 바꾸기 전에 물어볼게요');
} });

// 7. 빈 화면
SCREENS.push({ group: G, title: '대화방 없음', build: async (frame) => {
  await chatScreen(frame, { tree: { projects: [{ name: '교내 해커톤', rooms: [] }], noChats: true }, panel: null, room: (r) => emptyRoom(r, '아직 채팅이 없어요', '있었던 일을 한 줄만 적어도 이야기가 시작돼요.') });
} });
SCREENS.push({ group: G, title: '없는 대화방', build: async (frame) => {
  await chatScreen(frame, { tree: {}, panel: null, room: (r) => emptyRoom(r, '휴지통에 있거나 지워진 대화방이에요', '', [btn('휴지통 보기', 'Secondary')]) });
} });
SCREENS.push({ group: G, title: '프로젝트 없음', build: async (frame) => {
  await chatScreen(frame, { tree: { projects: [] }, panel: null, room: (r) => emptyRoom(r, '첫 프로젝트를 만들어 주세요', 'GitHub 레포에서 가져오거나 직접 만들 수 있어요.') });
} });

})();

/* ===== screens/40-wiki.js ===== */
/* 경험 위키 (#/vault): 프로젝트 목록, 전체 카드, 새 프로젝트 모달(G1 레포 고르기, G2), 프로젝트 완료 알림.
   앱: prototype/js/screens/vault.js, js/repo-flow.js (css/screens/vault.css, repo-flow.css)
   내용: 예시 계정 김준호 (prototype/js/data.js, seed-repos.js) */

(() => { // 이 파일의 이름이 다른 화면 파일과 겹치지 않도록 한 스코프에 둔다

/* ---------- 예시 계정 데이터 ---------- */
// [이름, 진행중, 기간, 역할, 레포, 카드 수]. 진행중 먼저, 끝난 것은 최근에 끝난 순 (vault.js projectsView)
const WIKI_PROJECTS = [
  ['모여봄', true, '2026.09부터', '백엔드 (Spring Boot), 4인 팀', 'moyeobom-backend', 6],
  ['슬랙봇', true, '2026.10부터', '1인 개발 (Node.js, PostgreSQL)', '', 2],
  ['알고리즘 스터디', false, '2025.03 ~ 2025.12', '스터디장, 6명', '', 2],
  ['데이터베이스 팀과제', false, '2025.09 ~ 2025.12', '팀원 (ERD 설계), 4인 팀', '', 1],
  ['빈강의실', false, '2025.03 ~ 2025.06', '백엔드 + 팀장, 3인 팀', 'empty-classroom', 5],
  ['교내 해커톤', false, '2025.05', '백엔드 + 발표, 3인 팀', '', 2],
  ['카페 아르바이트', false, '2024.03 ~ 2025.02', '바리스타 (주말 오픈조)', '', 1],
  ['편의점 야간 아르바이트', false, '2023.07 ~ 2023.12', '야간 근무자', '', 1],
];
// [제목, 프로젝트, 기간, GitHub 으로 만든 카드, 역량, 이력서 한 줄]
const WIKI_CARDS = [
  ['배포 후 업로드 500 에러와 배포 체크리스트', '모여봄', '2026.11', false, '문제 해결력,실행력', '배포 후 발생한 업로드 500 에러의 원인(파일 크기 제한 누락)을 찾고 배포 체크리스트 도입'],
  ['프론트와 API 명세 먼저 합의하기', '모여봄', '2026.10 ~ 2026.11', false, '협업능력,추진력,커뮤니케이션', '구현 전 Swagger 명세를 프론트와 먼저 합의하는 규칙을 제안해 응답 형식 변경으로 인한 재작업 감소'],
  ['JWT + Refresh Token 인증 설계', '모여봄', '2026.09', false, '의사결정 능력,커뮤니케이션,실행력', '모바일 확장을 고려해 JWT + Refresh Token 인증 구조를 설계하고, 세션 방식과의 장단점을 팀에 공유'],
  ['Redis 캐시로 인기 모임 목록 조회 개선', '모여봄', '2026.10', true, '문제 해결력,의사결정 능력', '인기 모임 목록에 Redis 캐시(TTL 5분)를 적용해 메인 화면 진입 시 반복되는 DB 조회 개선'],
  ['모임 정원 초과 참여를 비관적 락으로 방지', '모여봄', '2026.10', true, '문제 해결력,실행력', '동시 참여 시 정원 초과를 비관적 락(대기 3초 제한)으로 막고 동시 참여 테스트로 검증'],
  ['흐지부지되던 스터디 참여율 되살리기', '알고리즘 스터디', '2025.03 ~ 2025.12', false, '리더십,커뮤니케이션,도전정신', '그만두려던 이유를 직접 묻고 난이도를 3단계로 나눠 10개월간 평균 참여율 85% 유지, 6명 중 4명 코딩테스트 통과'],
  ['재고 실수 줄이기', '편의점 야간 아르바이트', '2023.07 ~ 2023.12', false, '실행력,추진력', '재고 누락 원인을 찾아 품목별 검수표를 만들어 한 달 만에 누락을 거의 해소, 다른 야간 근무자까지 사용'],
  ['24시간 해커톤에서 MVP 범위 줄이기', '교내 해커톤', '2025.05', false, '의사결정 능력,협업능력,커뮤니케이션', '24시간 안에 분실물 찾기 서비스 MVP 완성 (백엔드·발표 담당)'],
  ['연락 끊긴 팀원과 역할 재분배', '데이터베이스 팀과제', '2025.09 ~ 2025.12', false, '커뮤니케이션,실행력,협업능력', '팀원 연락 두절 상황에서 남은 작업을 재분배하고, ERD 설계에 쿼리 작성까지 맡아 마감 내 과제 제출'],
  ['빈 강의실 검색 쿼리와 복합 인덱스', '빈강의실', '2025.04', true, '분석적 사고,문제 해결력', '강의실별 반복 조회를 not exists 단일 쿼리로 통합하고 예약 테이블에 복합 인덱스 추가'],
  ['사용자 테스트로 예약 동선 고치기', '빈강의실', '2025.05 ~ 2025.06', false, '기획력', '실사용자 5명 테스트 피드백을 반영해 예약 취소 버튼 동선 개선'],
  ['중복 예약 버그 해결', '빈강의실', '2025.04 ~ 2025.06', false, '문제 해결력,실행력,분석적 사고', 'DB 유니크 제약과 낙관적 락으로 동시 예약 충돌을 막아 시범 운영 2주간 예약 120건 중 중복 0건'],
  ['주문 대기 줄 줄이기', '카페 아르바이트', '2024.03 ~ 2025.02', false, '기획력,분석적 사고,추진력', '일주일간 메뉴별 주문 수를 집계해 피크 전 사전 준비와 역할 고정을 제안, 체감 대기 시간을 절반 가까이 단축'],
  ['PDF 시간표 파싱으로 강의실 데이터 만들기', '빈강의실', '2025.03 ~ 2025.04', false, '문제 해결력,의사결정 능력,실행력', '시간표 API가 없는 문제를 PDF 시간표 파서로 해결해 학기마다 재사용 가능한 강의실 데이터 구축'],
  ['지출이 두 번씩 저장되던 문제 해결', '슬랙봇', '2026.11', false, '문제 해결력,도전정신,학습능력', '요청 로그로 지출 중복 저장의 원인(슬랙 3초 재시도)을 찾고 선응답·이벤트 id 중복 체크로 재발 방지'],
  ['일정이 밀렸을 때 기능 범위 조율', '빈강의실', '2025.04', false, '커뮤니케이션,리더십', '일정이 밀린 팀원의 가능한 작업량부터 확인하고 범위를 「검색·예약·취소」 3개로 조율, 역할 재분배'],
  ['검색 API 응답 속도 개선 (N+1)', '모여봄', '2026.10', false, '문제 해결력,분석적 사고,학습능력', '모임 검색 API의 N+1 쿼리를 fetch join과 복합 인덱스로 해결해 평균 응답 시간 1.8s → 0.3s 단축'],
  ['쓰는 사람에 맞춰 슬랙 봇과 Postgres 고르기', '슬랙봇', '2026.10 ~ 2026.11', false, '의사결정 능력,기획력', '사용자 요청에 맞춰 웹 대신 슬랙 봇으로 전환하고, 동시 입력을 고려해 SQLite 대신 PostgreSQL 선택'],
  ['발표 중 데모가 멈출 때를 대비한 녹화본 준비', '교내 해커톤', '2025.05', false, '실행력,기획력', '발표 중 데모 중단에 대비해 전체 흐름을 담은 화면 녹화본 사전 제작'],
  ['발표 순서 교체 규칙으로 빈자리 줄이기', '알고리즘 스터디', '2025.06', false, '리더십,추진력', '발표자 불참으로 끊기던 스터디에 다음 순서와 발표를 바꾸는 규칙 도입'],
];
// [이름, 설명, 언어와 달 | 연결된 프로젝트, 다른 프로젝트에 연결됨]. 최근에 올린 순 (repo-flow.js repos)
const WIKI_REPOS = [
  ['moyeobom-frontend', '「모여봄」 웹 프론트엔드', 'TypeScript    2026.11', false],
  ['moyeobom-backend', '동네 기반 소모임 매칭 서비스 「모여봄」 백엔드', '「모여봄」에 연결됨', true],
  ['budget-bot', '슬랙 메시지로 공동 생활비를 기록하는 봇', 'JavaScript    2026.11', false],
  ['dotfiles', '개발 환경 설정', 'Shell    2026.08', false],
  ['algorithm-notes', '알고리즘 스터디 풀이 모음', 'Java    2025.12', false],
  ['empty-classroom', '캡스톤 디자인: 빈 강의실 찾기와 예약 웹앱', '「빈강의실」에 연결됨', true],
  ['lost-found-server', '24시간 해커톤: 분실물 찾기 서비스', 'Java    2025.05', false],
];

/* ---------- 조립 도우미 ---------- */
// 경험 위키 화면 머리 + 보기 고르기. o: { view: 0 프로젝트 | 1 전체 카드, empty: 프로젝트가 없음(단추와 보기 고르기 숨김) }
async function wikiPage(frame, o = {}) {
  const { screen, main } = shell(frame, 'Wiki');
  const col = await page(main, { title: '경험 위키', actions: o.empty ? [] : [btn('새 프로젝트', 'Primary', 'Medium', 'plus')], after: 20 }); // 앱의 .vt-head 아래 20
  if (!o.empty) { col.appendChild(segmented(['프로젝트', '전체 카드'], o.view || 0)); gap(col, 20); }
  return { screen, col };
}

// 프로젝트 목록. done: 방금 완료한 프로젝트 이름 (진행중에서 빠져 끝난 것 맨 앞으로)
function projectList(col, done) {
  let rows = WIKI_PROJECTS.map((p) => p.slice());
  if (done) {
    const p = rows.find((r) => r[0] === done); p[1] = false; p[2] = `${p[2].replace('부터', '')} ~ 2026.11`; // 끝난 달이 비어 있으면 이번 달
    rows = rows.filter((r) => r[1]).concat([p], rows.filter((r) => !r[1] && r !== p));
  }
  const list = al('V', { name: '프로젝트 목록', stroke: 'border', sides: ['top'] }); put(col, list, { fill: true });
  for (const [name, ongoing, period, role, repo, n] of rows) {
    const r = inst('Wiki/Project row', Object.assign({ State: ongoing ? 'Ongoing' : 'Done', Name: name, Period: period, Role: role, 'Show repo': !!repo, Cards: `카드 ${n}장` }, repo ? { Repo: repo } : {}));
    r.name = name; put(list, r, { fill: true });
  }
  return list;
}
async function projectsScreen(frame, o = {}) {
  const { screen, col } = await wikiPage(frame, { view: 0 });
  projectList(col, o.done);
  fit(frame, screen); return screen;
}

// 전체 카드의 조건 줄: 검색 (채우기) + 프로젝트 200 + 역량 170 (vault.css .vt-filter)
function cardFilter(col, o = {}) {
  const row = al('H', { name: '조건', gap: 8, cross: 'center' }); put(col, row, { fill: true });
  const q = inst('Input', { Content: o.q ? 'Value' : 'Placeholder', Text: o.q || '카드 검색', 'Show icon': true, Icon: 'search' }); q.name = '카드 검색'; put(row, q, { fill: true });
  const p = inst('Select', { Text: o.project || '모든 프로젝트' }); p.name = '프로젝트'; row.appendChild(p); p.resize(200, p.height);
  const k = inst('Select', { Text: o.kw || '모든 역량' }); k.name = '역량'; row.appendChild(k); k.resize(170, k.height);
  gap(col, 20);
  return row;
}
// 카드 격자: 3칸, 카드 사이 16, 한 줄의 카드는 높이를 맞춘다. make(카드 데이터) → 인스턴스
function cardGrid(col, cards, make) {
  const grid = al('V', { name: '카드', gap: 16 }); put(col, grid, { fill: true });
  for (let i = 0; i < cards.length; i += 3) {
    const row = al('H', { name: `줄 ${i / 3 + 1}`, gap: 16 }); put(grid, row, { fill: true });
    const made = cards.slice(i, i + 3).map((c) => { const card = make(c); card.name = c[0]; put(row, card, { fill: true }); return card; });
    for (let k = row.children.length; k < 3; k++) { const e = al('V', { name: '빈 칸' }); put(row, e, { fill: true }); }
    // 줄 높이를 가장 긴 카드에 고정하고 카드는 세로 채우기 (모두 FILL 인 hug 줄은 접혀 버린다)
    const tallest = Math.ceil(Math.max(...made.map((c) => c.height)));
    row.layoutSizingVertical = 'FIXED'; row.resize(row.width, tallest); row.layoutSizingHorizontal = 'FILL';
    made.forEach((c) => { c.layoutSizingVertical = 'FILL'; });
  }
  return grid;
}
// 카드 한 장. match: 거른 역량 (그 역량에 형광펜)
const wikiCard = ([title, project, period, github, kws, line], match) => indexCard({ project, period, github, title, line, keywords: kws.split(','), match });

/* ---------- 새 프로젝트 모달 (G2) 과 레포 고르기 (G1) ---------- */
// 레포 고르기 본문. o: { state: 'list' | 'account', picked: 고른 레포 이름 }
async function repoPicker(parent, o = {}) {
  const pane = al('V', { name: o.state === 'account' ? '레포 고르기 (계정 주소)' : '레포 고르기 (레포 목록)', minH: 132 }); put(parent, pane, { fill: true });
  if (o.state === 'account') {
    await field(pane, { label: 'GitHub 주소', input: { Content: 'Placeholder', State: 'Focus', Text: 'github.com/내아이디' }, trailing: [btn('불러오기')], hint: '내 레포와 소속 조직의 공개 레포를 한 번에 불러와요.' });
    gap(pane, 12);
    const foot = al('H', { name: '아래 단추', gap: 4 }); pane.appendChild(foot);
    foot.appendChild(btn('예시 계정으로 해 보기', 'Ghost', 'Small'));
    return pane;
  }
  await githubAccount(pane);
  gap(pane, 8);
  const q = inst('Input', { Content: 'Placeholder', Text: '레포 검색', 'Show icon': true, Icon: 'search' }); q.name = '레포 검색'; put(pane, q, { fill: true });
  gap(pane, 12);
  const list = al('V', { name: '레포', gap: 8 }); put(pane, list, { fill: true });
  for (const [name, desc, meta, linked] of WIKI_REPOS) {
    const r = inst('Repo/Choice', { State: linked ? 'Disabled' : name === o.picked ? 'Selected' : 'Default', Name: name, Description: desc, Meta: meta });
    r.name = name; put(list, r, { fill: true });
  }
  return pane;
}
// 직접 만들기 본문
async function manualPane(parent) {
  const pane = al('V', { name: '직접 만들기', gap: 18, minH: 132 }); put(parent, pane, { fill: true });
  await field(pane, { label: '프로젝트 이름', input: { Content: 'Placeholder', State: 'Focus', Text: '예: 교내 해커톤, 카페 아르바이트' }, hint: '팀 과제, 동아리, 아르바이트도 프로젝트예요.' });
  await field(pane, { label: '맡은 역할 (선택)', input: { Content: 'Placeholder', Text: ' ' } });
  return pane;
}
// 새 프로젝트 모달. o: { mode: 0 GitHub | 1 직접, ready: 프로젝트 만들기를 누를 수 있음, pane: async (body) => {} }
async function newProjectModal(frame, o) {
  const ok = btn('프로젝트 만들기', 'Primary'); if (!o.ready) disable(ok);
  return modal(frame, {
    title: '새 프로젝트', width: 760,
    body: async (b) => {
      const seg = segmented([{ label: 'GitHub에서 가져오기', icon: 'github' }, { label: '직접 만들기' }], o.mode || 0); seg.name = '만드는 방법'; b.appendChild(seg);
      await o.pane(b);
    },
    buttons: [btn('취소'), ok],
  });
}
// 모달은 1080 화면 가운데에 띄운다
async function underProjects(frame) { await projectsScreen(frame); frame.resize(frame.width, H); }
async function underEmpty(frame) { const { screen, col } = await wikiPage(frame, { empty: true }); await noProjects(col); fit(frame, screen); }
const noProjects = (col) => empty(col, '아직 프로젝트가 없어요', '팀 과제, 동아리, 아르바이트도 프로젝트가 돼요.', [btn('새 프로젝트', 'Primary', 'Medium', 'plus')]);

/* ---------- 화면 ---------- */
SCREENS.push({
  group: '경험 위키', title: '프로젝트',
  build: async (frame) => { await projectsScreen(frame); },
});

SCREENS.push({
  group: '경험 위키', title: '전체 카드',
  build: async (frame) => {
    const { screen, col } = await wikiPage(frame, { view: 1 });
    cardFilter(col);
    cardGrid(col, WIKI_CARDS, (c) => wikiCard(c));
    fit(frame, screen);
  },
});

SCREENS.push({
  group: '경험 위키', title: '전체 카드 / 역량으로 거르기',
  build: async (frame) => {
    const kw = '리더십';
    const { screen, col } = await wikiPage(frame, { view: 1 });
    cardFilter(col, { kw });
    cardGrid(col, WIKI_CARDS.filter((c) => c[4].split(',').includes(kw)), (c) => wikiCard(c, kw));
    fit(frame, screen);
  },
});

SCREENS.push({
  group: '경험 위키', title: '전체 카드 / 결과 없음',
  build: async (frame) => {
    // 교내 해커톤 카드에는 리더십이 없다
    const { screen, col } = await wikiPage(frame, { view: 1 });
    cardFilter(col, { project: '교내 해커톤', kw: '리더십' });
    await empty(col, '조건에 맞는 경험 카드가 없어요', null, [btn('조건 지우기'), btn('AI 채팅으로 만들기', 'Secondary', 'Medium', 'chat')]);
    fit(frame, screen);
  },
});

SCREENS.push({
  group: '경험 위키', title: '프로젝트 / 처음',
  build: async (frame) => { await underEmpty(frame); },
});

SCREENS.push({
  group: '경험 위키', title: '새 프로젝트 / GitHub에서 가져오기',
  build: async (frame) => {
    await underProjects(frame);
    await newProjectModal(frame, { mode: 0, pane: (b) => repoPicker(b, { state: 'list' }) });
  },
});

SCREENS.push({
  group: '경험 위키', title: '새 프로젝트 / 레포를 고른 뒤',
  build: async (frame) => {
    await underProjects(frame);
    await newProjectModal(frame, { mode: 0, ready: true, pane: (b) => repoPicker(b, { state: 'list', picked: 'budget-bot' }) });
  },
});

SCREENS.push({
  group: '경험 위키', title: '새 프로젝트 / GitHub 계정 불러오기',
  build: async (frame) => {
    // GitHub 계정이 아직 없는 새 계정: 경험 위키의 빈 화면에서 연다
    await underEmpty(frame);
    await newProjectModal(frame, { mode: 0, pane: (b) => repoPicker(b, { state: 'account' }) });
  },
});

SCREENS.push({
  group: '경험 위키', title: '새 프로젝트 / 직접 만들기',
  build: async (frame) => {
    await underProjects(frame);
    await newProjectModal(frame, { mode: 1, pane: (b) => manualPane(b) });
  },
});

SCREENS.push({
  group: '경험 위키', title: '프로젝트 완료 알림',
  build: async (frame) => {
    // 「모여봄」의 프로젝트 완료를 누른 뒤: 끝난 프로젝트 맨 앞으로 옮겨지고 알림이 뜬다
    await projectsScreen(frame, { done: '모여봄' });
    toast(frame, '「모여봄」 프로젝트를 완료했어요', '되돌리기');
  },
});
})();

/* ===== screens/50-project.js ===== */
/* 프로젝트(#/vault/p/:id)와 GitHub로 경험 카드 만들기(#/vault/p/:id/github).
   앱: prototype/js/screens/projects.js, css/screens/projects.css(.pj-*, .pg-*), js/screens/project-github.js,
       js/repo-flow.js(레포 고르기 · 분석 단계 · 초안, css/screens/repo-flow.css), js/github.js(단계·오류 문구),
       예시 데이터 js/data.js, js/seed-repos.js (moyeobom-team/moyeobom-backend: 커밋 87개, PR 34개, 초안 8개 중 6개는 이미 카드)
   이 파일의 컴포넌트: Project/Repo row. 공용: Analysis/Step, Repo/Draft, Repo/STAR row, Evidence/* (evidence(), openDraft()), Banner(banner()) */

{ // 이 파일의 이름이 다른 화면 파일과 겹치지 않도록 한 스코프에 둔다

/* ---------- 예시 데이터 ---------- */
// 카드: [제목, 기간, GitHub에서 만든 카드, 역량, 이력서 한 줄]
const PJ_CARDS = {
  모여봄: [
    ['배포 후 업로드 500 에러와 배포 체크리스트', '2026.11', false, ['문제 해결력', '실행력'], '배포 후 발생한 업로드 500 에러의 원인(파일 크기 제한 누락)을 찾고 배포 체크리스트 도입'],
    ['프론트와 API 명세 먼저 합의하기', '2026.10 ~ 2026.11', false, ['협업능력', '추진력', '커뮤니케이션'], '구현 전 Swagger 명세를 프론트와 먼저 합의하는 규칙을 제안해 응답 형식 변경으로 인한 재작업 감소'],
    ['JWT + Refresh Token 인증 설계', '2026.09', false, ['의사결정 능력', '커뮤니케이션', '실행력'], '모바일 확장을 고려해 JWT + Refresh Token 인증 구조를 설계하고, 세션 방식과의 장단점을 팀에 공유'],
    ['Redis 캐시로 인기 모임 목록 조회 개선', '2026.10', true, ['문제 해결력', '의사결정 능력'], '인기 모임 목록에 Redis 캐시(TTL 5분)를 적용해 메인 화면 진입 시 반복되는 DB 조회 개선'],
    ['모임 정원 초과 참여를 비관적 락으로 방지', '2026.10', true, ['문제 해결력', '실행력'], '동시 참여 시 정원 초과를 비관적 락(대기 3초 제한)으로 막고 동시 참여 테스트로 검증'],
    ['검색 API 응답 속도 개선 (N+1)', '2026.10', false, ['문제 해결력', '분석적 사고', '학습능력'], '모임 검색 API의 N+1 쿼리를 fetch join과 복합 인덱스로 해결해 평균 응답 시간 1.8s → 0.3s 단축'],
  ],
  빈강의실: [
    ['빈 강의실 검색 쿼리와 복합 인덱스', '2025.04', true, ['분석적 사고', '문제 해결력'], '강의실별 반복 조회를 not exists 단일 쿼리로 통합하고 예약 테이블에 복합 인덱스 추가'],
    ['사용자 테스트로 예약 동선 고치기', '2025.05 ~ 2025.06', false, ['기획력'], '실사용자 5명 테스트 피드백을 반영해 예약 취소 버튼 동선 개선'],
    ['중복 예약 버그 해결', '2025.04 ~ 2025.06', false, ['문제 해결력', '실행력', '분석적 사고'], 'DB 유니크 제약과 낙관적 락으로 동시 예약 충돌을 막아 시범 운영 2주간 예약 120건 중 중복 0건'],
    ['PDF 시간표 파싱으로 강의실 데이터 만들기', '2025.03 ~ 2025.04', false, ['문제 해결력', '의사결정 능력', '실행력'], '시간표 API가 없는 문제를 PDF 시간표 파서로 해결해 학기마다 재사용 가능한 강의실 데이터 구축'],
    ['일정이 밀렸을 때 기능 범위 조율', '2025.04', false, ['커뮤니케이션', '리더십'], '일정이 밀린 팀원의 가능한 작업량부터 확인하고 범위를 「검색·예약·취소」 3개로 조율, 역할 재분배'],
  ],
  슬랙봇: [
    ['지출이 두 번씩 저장되던 문제 해결', '2026.11', false, ['문제 해결력', '도전정신', '학습능력'], '요청 로그로 지출 중복 저장의 원인(슬랙 3초 재시도)을 찾고 선응답·이벤트 id 중복 체크로 재발 방지'],
    ['쓰는 사람에 맞춰 슬랙 봇과 Postgres 고르기', '2026.10 ~ 2026.11', false, ['의사결정 능력', '기획력'], '사용자 요청에 맞춰 웹 대신 슬랙 봇으로 전환하고, 동시 입력을 고려해 SQLite 대신 PostgreSQL 선택'],
  ],
};
const PJ_MOYEOBOM_REPO = { name: 'moyeobom-team/moyeobom-backend', sample: true, at: '11월 18일 분석' };
const PJ = {
  모여봄: { title: '모여봄', status: 'ongoing', period: '2026.09부터', role: '백엔드 (Spring Boot), 4인 팀', summary: '부트캠프 최종 프로젝트로 4인 팀(프론트 2, 백엔드 2)이 8주간 동네 기반 소모임 매칭 서비스를 개발 중.', repos: [PJ_MOYEOBOM_REPO], cards: PJ_CARDS.모여봄 },
  빈강의실: { title: '빈강의실', status: 'done', period: '2025.03 ~ 2025.06', role: '백엔드 + 팀장, 3인 팀', summary: '학과 캡스톤으로 3인 팀이 빈 강의실을 찾아 예약하는 웹앱을 만들어 학과 공식 서비스로 시범 운영했다.', repos: [{ name: 'cse-capstone/empty-classroom', sample: true, at: '11월 14일 분석' }], cards: PJ_CARDS.빈강의실 },
  슬랙봇: { title: '슬랙봇', status: 'ongoing', period: '2026.10부터', role: '1인 개발 (Node.js, PostgreSQL)', summary: '친구들과 공동 생활비를 관리하려고, 슬랙 메시지로 지출을 기록하고 주간 리포트를 받는 봇을 만들고 있다.', repos: [], cards: PJ_CARDS.슬랙봇 },
  // 새 계정에서 「직접 만들기」로 만든 프로젝트 (기간·소개 없음)
  새프로젝트: { title: '카페 아르바이트', status: 'ongoing', period: '', role: '바리스타 (주말 오픈조)', summary: '', repos: [], cards: [] },
  // 새 계정에서 「GitHub에서 가져오기」로 만든 프로젝트: 이름은 레포 이름, 소개는 레포 설명
  레포만: { title: 'budget-bot', status: 'ongoing', period: '', role: '', summary: '슬랙 메시지로 공동 생활비를 기록하는 봇', repos: [{ name: 'example/budget-bot', sample: true, at: '' }], cards: [] },
};

// 고르기 화면의 초안 (seed-repos.js 의 gh_actions, spring_test)
const PJ_DRAFTS = [
  { title: 'GitHub Actions 배포 자동화', line: 'main에 병합되면 테스트, 이미지 빌드, 서버 배포가 이어지도록 GitHub Actions와 Docker Compose 구성', kws: ['실행력', '추진력'], counts: ['커밋 3개', 'PR 1개', '코드 2곳'],
    star: [['상황', '백엔드·MySQL·Redis를 서버에 함께 올려야 했음.'], ['과제', '「배포 자동화」(PR #52) 작업을 맡음.'], ['행동', 'GitHub Actions에서 테스트 → Docker 이미지 빌드·푸시 → EC2의 compose 재시작이 이어지게 하고, 앱·MySQL·Redis를 docker-compose.yml로 정의함.'], ['결과', '']],
    commits: [['1c5b9e7', 'ci: 테스트·이미지 빌드 워크플로 추가', '10월 27일'], ['e64a0d2', 'ci: EC2 배포 단계 추가', '10월 28일'], ['97f3c58', 'chore: docker-compose에 redis 추가', '10월 28일']],
    prs: [['#52', '배포 자동화 (GitHub Actions + Docker Compose)', '10월 28일']],
    files: [
      ['.github/workflows/deploy.yml:14-30', 14, ['    steps:', '      - uses: actions/checkout@v4', '      - uses: actions/setup-java@v4', '        with:', '          distribution: temurin', "          java-version: '17'", '      - name: Test', '        run: ./gradlew test', '      - name: Build & push image', '        run: |', '          docker build -t ${{ secrets.DOCKER_REPO }}/moyeobom:${{ github.sha }} .', '          docker push ${{ secrets.DOCKER_REPO }}/moyeobom:${{ github.sha }}', '      - name: Deploy to EC2', '        uses: appleboy/ssh-action@v1', '        with:', '          host: ${{ secrets.EC2_HOST }}', '          script: cd ~/moyeobom && IMAGE_TAG=${{ github.sha }} docker compose up -d'], [14, 21, 27]],
      ['docker-compose.yml:1-11', 1, ['services:', '  app:', '    image: ${DOCKER_REPO}/moyeobom:${IMAGE_TAG}', '    ports: ["8080:8080"]', '    env_file: .env', '    depends_on: [mysql, redis]', '  mysql:', '    image: mysql:8.0', '    volumes: ["mysql-data:/var/lib/mysql"]', '  redis:', '    image: redis:7-alpine'], [1]],
    ] },
  { title: 'Testcontainers로 검색·참여 통합 테스트 구성', line: '운영과 같은 MySQL 컨테이너에서 검색·참여 API를 검증하는 통합 테스트 제작', kws: ['실행력'], counts: ['커밋 2개', 'PR 1개', '코드 1곳'] },
];
// 이미 카드로 만든 경험 (초안 순서: jpa_fetch_join, spring_cache, jwt_security, pessimistic_lock, api_docs, pr-63)
const PJ_MADE = ['검색 API 응답 속도 개선 (N+1)', 'Redis 캐시로 인기 모임 목록 조회 개선', 'JWT + Refresh Token 인증 설계', '모임 정원 초과 참여를 비관적 락으로 방지', '프론트와 API 명세 먼저 합의하기', '배포 후 업로드 500 에러와 배포 체크리스트'];
const PJ_STEPS = ['레포 정보 불러오는 중', '커밋·PR 읽는 중', '파일 구조 살펴보는 중', '코드 읽는 중', '경험 카드로 정리하는 중']; // github.js STEPS
// 레포 고르기 (최근에 올린 순). [이름, 설명, 메타, 상태]
const PJ_REPOS = [
  ['moyeobom-frontend', '「모여봄」 웹 프론트엔드', 'TypeScript    2026.11', 'Selected'],
  ['moyeobom-backend', '동네 기반 소모임 매칭 서비스 「모여봄」 백엔드', '이 프로젝트에 연결됨', 'Disabled'],
  ['budget-bot', '슬랙 메시지로 공동 생활비를 기록하는 봇', 'JavaScript    2026.11', 'Default'],
  ['dotfiles', '개발 환경 설정', 'Shell    2026.08', 'Default'],
  ['algorithm-notes', '알고리즘 스터디 풀이 모음', 'Java    2025.12', 'Default'],
  ['empty-classroom', '캡스톤 디자인: 빈 강의실 찾기와 예약 웹앱', '「빈강의실」에 연결됨', 'Disabled'],
  ['lost-found-server', '24시간 해커톤: 분실물 찾기 서비스', 'Java    2025.05', 'Default'],
];
const PJ_KW_GAP = '    '; // 역량 사이 (앱의 .exp-card-kws gap 14px)

/* ---------- 컴포넌트 ---------- */
EXTRA_COMPONENTS.push({
  title: '프로젝트',
  build: async (row) => {
    // 프로젝트 화면 GitHub 패널의 레포 한 줄 (.pj-repo)
    await makeOne(row, 'Project/Repo row', async (c) => {
      auto(c, 'H', { gap: 12, w: 1080, cross: 'center' }); c.minHeight = 40;
      c.appendChild(icon('github', 20, 'text-2'));
      const m = al('H', { name: 'main', gap: 12, cross: 'center' }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
      m.appendChild(named(await text('owner/repo', 'Body/15 Semibold', 'text'), 'repoName'));
      m.appendChild(named(inst('Tag', { Tone: 'Neutral', Label: '예시' }), 'sampleTag'));
      m.appendChild(named(await text('11월 18일 분석', 'Small/13.5', 'text-3'), 'analyzedAt'));
      c.appendChild(named(inst('Icon button', { Size: 'Medium', Icon: 'more' }), '레포 메뉴'));
    }, { desc: '프로젝트 › GitHub 패널의 연결한 레포. 예시 레포는 링크 대신 글자 + 예시 태그. 분석: 「M월 D일 분석」 또는 「아직 분석하지 않았어요」. ⋯ 메뉴는 「연결 해제」', props: [{ name: 'Name', type: 'TEXT', default: 'owner/repo', node: 'repoName' }, { name: 'Show sample', type: 'BOOLEAN', default: true, node: 'sampleTag' }, { name: 'Analyzed', type: 'TEXT', default: '11월 18일 분석', node: 'analyzedAt' }] });
  },
});

/* ---------- 조립 도구 ---------- */
// 프로젝트 머리: h1, 상태 · 기간 · 역할, 소개 + 완료/다시 진행 + ⋯ → { col, more }
async function pjHead(main, p) {
  const meta = [inst('Tag', p.status === 'done' ? { Tone: 'Success', Label: '완료' } : { Tone: 'Ink', Label: '진행중' })];
  if (p.period) { const per = al('H', { name: '기간', gap: 5, cross: 'center' }); per.appendChild(icon('calendar', 15, 'text-3')); per.appendChild(await text(p.period, 'Small/13.5', 'text-3')); meta.push(per); }
  if (p.role) meta.push(await text(p.role, 'Small/13.5', 'text-3', { name: '역할' }));
  const more = named(inst('Icon button', { Size: 'Medium', Icon: 'more' }), '프로젝트 메뉴');
  const done = p.status === 'done' ? btn('다시 진행하기', 'Ghost', 'Medium', 'restore') : btn('프로젝트 완료', 'Secondary', 'Medium', 'check');
  const col = await page(main, { crumb: '경험 위키', title: p.title, meta, sub: p.summary, actions: [done, more] });
  return { col, more };
}

// GitHub 패널 (.panel.pj-gh). primary: 레포는 있고 카드가 없을 때 「GitHub로 경험 카드 만들기」가 주 버튼
async function pjGithub(col, p, primary) {
  const panel = al('V', { name: 'GitHub', fill: 'surface-2', radius: 'radius/md', pad: 20 }); put(col, panel, { fill: true });
  const rows = [];
  if (!p.repos.length) {
    const off = al('H', { name: '연결 전', gap: 12, cross: 'center' }); put(panel, off, { fill: true });
    off.appendChild(icon('github', 20, 'text-2'));
    await tput(off, 'GitHub를 연결하면 커밋과 PR에서 경험을 찾아 줘요.', 'Body/15', 'text-2', { wrap: true });
    off.appendChild(btn('GitHub 연결', 'Secondary', 'Medium'));
    return { panel, rows };
  }
  panel.paddingTop = 14; // .pj-repos { margin: -6px 0 12px }
  const list = al('V', { name: '레포', gap: 4 }); put(panel, list, { fill: true });
  for (const r of p.repos) {
    const row = inst('Project/Repo row', { Name: r.name, 'Show sample': r.sample, Analyzed: r.at || '아직 분석하지 않았어요' });
    put(list, row, { fill: true }); rows.push(row);
  }
  gap(panel, 12);
  const acts = al('H', { name: '단추', gap: 8, cross: 'center' }); panel.appendChild(acts);
  acts.appendChild(btn('GitHub로 경험 카드 만들기', primary ? 'Primary' : 'Secondary', 'Medium', 'github'));
  acts.appendChild(btn('레포 추가', 'Ghost', 'Medium', 'plus'));
  return { panel, rows };
}

// 카드 3열 (.grid minmax(300px, 1fr), 사이 16)
function pjGrid(parent, cards, project) {
  const grid = al('V', { name: '카드', gap: 16 }); put(parent, grid, { fill: true });
  for (let i = 0; i < cards.length; i += 3) {
    const line = al('H', { name: `줄 ${i / 3 + 1}`, gap: 16, cross: 'start' }); put(grid, line, { fill: true });
    for (let k = i; k < i + 3; k++) {
      if (k >= cards.length) { const f = figma.createFrame(); f.name = '빈 칸'; f.fills = []; f.resize(10, 1); put(line, f, { fill: true }); continue; }
      const [title, period, gh, kws, resume] = cards[k];
      put(line, indexCard({ project, period, github: gh, title, line: resume, keywords: kws }), { fill: true });
    }
  }
  return grid;
}
const pjMakeBtns = (primary) => [btn('AI 채팅으로 만들기', primary ? 'Primary' : 'Secondary', 'Medium', 'chat'), btn('직접 만들기', 'Ghost', 'Medium', 'edit')];

// 경험 카드 섹션 (.section, 위 40)
async function pjCards(col, p, primary) {
  gap(col, 40);
  const sec = al('V', { name: '경험 카드' }); put(col, sec, { fill: true });
  const h = al('H', { name: '섹션 머리', gap: 16, main: 'between', cross: 'center', pad: [0, 0, 12, 0] }); put(sec, h, { fill: true });
  const t = al('H', { name: '제목', gap: 8, cross: 'center' }); h.appendChild(t);
  t.appendChild(await text('경험 카드', 'Title/17', 'text'));
  if (p.cards.length) {
    t.appendChild(await text(String(p.cards.length), 'Small/13.5', 'text-3', { name: '개수' }));
    const b = al('H', { name: '만들기', gap: 8, cross: 'center' }); h.appendChild(b); pjMakeBtns(primary).forEach((x) => b.appendChild(x));
    pjGrid(sec, p.cards, p.title);
  } else {
    const desc = `${p.repos.length ? '연결한 GitHub에서 여러 장을 한 번에 만들거나, AI와 이야기하며 한 장씩 만들 수 있어요.' : 'AI와 이야기하면 첫 카드가 만들어져요. GitHub를 연결하면 여러 장을 한 번에 만들 수도 있어요.'} AI 없이 직접 써도 돼요.`;
    const e = await empty(sec, '아직 경험 카드가 없어요', desc, pjMakeBtns(primary)); e.paddingTop = 28;
  }
  return sec;
}

// 프로젝트 화면 전체 → { screen, more, rows }
async function pjProjectPage(frame, p) {
  const { screen, main } = shell(frame, 'Wiki');
  const ghFirst = p.repos.length > 0 && !p.cards.length; // 주 버튼은 하나만
  const { col, more } = await pjHead(main, p);
  const { rows } = await pjGithub(col, p, ghFirst);
  await pjCards(col, p, !ghFirst);
  fit(frame, screen);
  return { screen, more, rows };
}

/* ---------- GitHub로 경험 카드 만들기 (좁은 페이지) ---------- */
// o: { counts: 커밋·PR 수를 읽은 뒤, sample: 예시 태그, refresh: 다시 분석하기 단추 }
async function pjGhPage(frame, o = {}) {
  const { screen, main } = shell(frame, 'Wiki');
  const meta = [inst('Project chip', { Label: o.project || '모여봄' })];
  if (o.counts) meta.push(await text(o.counts, 'Small/13.5', 'text-3'));
  if (o.sample) meta.push(inst('Tag', { Tone: 'Neutral', Label: '예시' }));
  const actions = o.refresh ? [named(inst('Icon button', { Size: 'Medium', Icon: 'refresh' }), '다시 분석하기')] : [];
  const col = await page(main, { narrow: true, crumb: '경험 위키', title: 'GitHub로 경험 카드 만들기', meta, actions });
  const body = al('V', { name: '본문' }); put(col, body, { fill: true });
  return { screen, col: body };
}
const PJ_READ = '커밋 87개, PR 34개를 읽었어요';

// 찾은 작업 → openDraft() 옵션
const pjDraft = (d) => ({ title: d.title, line: d.line, keywords: d.kws.join(PJ_KW_GAP), star: d.star, evidence: {
  repo: PJ_MOYEOBOM_REPO.name, sample: PJ_MOYEOBOM_REPO.sample, commits: d.commits, prs: d.prs,
  code: d.files.map(([path, start, lines, hl]) => ({ path, lines: lines.map((src, i) => [start + i, src]), hl })) } });
// 「이미 카드로 만든 경험 N개」 (details.pg-made)
async function pjMadeList(parent, count, titles) {
  const open = !!titles;
  const sec = al('V', { name: '이미 카드로 만든 경험', pad: [28, 0, 0, 0] }); put(parent, sec, { fill: true });
  const sum = al('H', { name: '접는 줄', gap: 4, cross: 'center', minH: 36 }); sec.appendChild(sum);
  sum.appendChild(icon(open ? 'chevron-down' : 'chevron-right', 16, 'text-2'));
  sum.appendChild(await text(`이미 카드로 만든 경험 ${count}개`, 'Body/15', 'text-2'));
  if (open) {
    gap(sec, 4);
    const list = al('V', { name: '목록', stroke: 'border', sides: ['top'] }); put(sec, list, { fill: true });
    for (const t of titles) put(list, named(inst('List row', { Title: t, 'Show subtitle': false, 'Show meta': false, Icon: 'card' }), t), { fill: true });
  }
  return sec;
}

/* ---------- 화면 ---------- */
const PJ_GROUP = '프로젝트';
const PJ_MENU_AT = [1406, 101]; // 1920 화면에서 머리 ⋯ 아래 메뉴 자리 (자리를 계산할 수 없을 때)

SCREENS.push({
  group: PJ_GROUP, title: '모여봄',
  build: async (frame) => { await pjProjectPage(frame, PJ.모여봄); },
});
SCREENS.push({
  group: PJ_GROUP, title: '빈강의실 (완료)',
  build: async (frame) => { await pjProjectPage(frame, PJ.빈강의실); },
});
SCREENS.push({
  group: PJ_GROUP, title: '슬랙봇 (GitHub 연결 전)',
  build: async (frame) => { await pjProjectPage(frame, PJ.슬랙봇); },
});
SCREENS.push({
  group: PJ_GROUP, title: '새 프로젝트 (빈 상태)',
  build: async (frame) => { await pjProjectPage(frame, PJ.새프로젝트); },
});
SCREENS.push({
  group: PJ_GROUP, title: '레포만 연결 (카드 없음)',
  build: async (frame) => { await pjProjectPage(frame, PJ.레포만); },
});
SCREENS.push({
  group: PJ_GROUP, title: '프로젝트 메뉴',
  build: async (frame) => {
    const { more } = await pjProjectPage(frame, PJ.모여봄);
    menuUnder(frame, more, [{ label: '수정', icon: 'edit' }, { label: '휴지통으로 옮기기', icon: 'trash', danger: true }], { at: PJ_MENU_AT });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: '레포 메뉴',
  build: async (frame) => {
    const { rows } = await pjProjectPage(frame, PJ.모여봄);
    const repoMore = rows[0].findOne((n) => n.name === '레포 메뉴');
    menuUnder(frame, repoMore, [{ label: '연결 해제', icon: 'unlink' }], { at: [1386, 261] });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: '프로젝트 수정',
  build: async (frame) => {
    const p = PJ.빈강의실; await pjProjectPage(frame, p);
    await modal(frame, {
      title: '프로젝트 수정',
      body: async (b) => {
        b.paddingTop = 16;
        await field(b, { label: '프로젝트 이름', input: { Content: 'Value', State: 'Focus', Text: p.title } });
        await field(b, { label: '맡은 역할', input: { Content: 'Value', Text: p.role } });
        await field(b, { label: '상태', select: '완료' });
        const months = al('H', { name: '달', gap: 12, cross: 'start' }); put(b, months, { fill: true });
        await field(months, { label: '시작한 달', input: { Content: 'Value', Text: '2025년 03월', 'Show trailing': true, Trailing: 'calendar' } });
        await field(months, { label: '끝난 달', input: { Content: 'Value', Text: '2025년 06월', 'Show trailing': true, Trailing: 'calendar' } });
      },
      buttons: [btn('취소', 'Secondary'), btn('저장', 'Primary')],
    });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: '프로젝트를 휴지통으로',
  build: async (frame) => {
    await pjProjectPage(frame, PJ.모여봄);
    await modal(frame, {
      title: '프로젝트를 휴지통으로 옮길까요?',
      body: async (b) => { await modalText(b, '「모여봄」 안의 경험 카드 6장, 대화방 7개도 함께 옮겨요. 30일 안에 되돌릴 수 있어요.'); },
      buttons: [btn('취소', 'Secondary'), btn('휴지통으로 옮기기', 'Danger')],
    });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: '경험 카드 직접 만들기',
  build: async (frame) => {
    await pjProjectPage(frame, PJ.모여봄);
    await modal(frame, {
      title: '경험 카드 직접 만들기',
      body: async (b) => { await field(b, { label: '제목', input: { Content: 'Placeholder', State: 'Focus', Text: '예: 검색 API 응답 속도 개선' }, hint: '만든 뒤 카드에서 상황·과제·행동·결과와 역량을 직접 써요.' }); },
      buttons: [btn('취소', 'Secondary'), btn('만들기', 'Primary')],
    });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: 'GitHub 연결',
  build: async (frame) => {
    await pjProjectPage(frame, PJ.모여봄);
    await modal(frame, {
      title: '「모여봄」에 GitHub 연결', width: 760,
      body: async (b) => {
        b.itemSpacing = 0; b.paddingTop = 18;
        await githubAccount(b, 'example', { pad: [0, 0, 8, 0] });
        put(b, inst('Input', { Content: 'Placeholder', Text: '레포 검색', 'Show icon': true, Icon: 'search' }), { fill: true });
        gap(b, 12);
        const list = al('V', { name: '레포 목록', gap: 8 }); put(b, list, { fill: true });
        for (const [name, desc, meta, state] of PJ_REPOS) put(list, named(inst('Repo/Choice', { State: state, Name: name, Description: desc, Meta: meta }), name), { fill: true });
      },
      buttons: [btn('취소', 'Secondary'), btn('연결하기', 'Primary')],
    });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: '연결 해제 알림',
  build: async (frame) => {
    await pjProjectPage(frame, Object.assign({}, PJ.모여봄, { repos: [] })); // 해제한 뒤: GitHub 연결 전 패널
    toast(frame, 'moyeobom-backend 연결을 해제했어요', '되돌리기');
  },
});

SCREENS.push({
  group: PJ_GROUP, title: 'GitHub로 경험 카드 만들기 / 분석 중',
  build: async (frame) => {
    const { screen, col } = await pjGhPage(frame); // 분석 중에는 읽은 수와 예시 태그가 아직 없다
    const run = al('V', { name: '분석 중', gap: 20 }); put(col, run, { fill: true });
    const repo = al('H', { name: '레포', gap: 5, cross: 'center' }); run.appendChild(repo);
    repo.appendChild(icon('github', 15, 'text-3')); repo.appendChild(await text('moyeobom-backend', 'Small/13.5', 'text-3')); // 레포가 하나면 (i/n) 없이
    const steps = al('V', { name: '단계', gap: 12 }); put(run, steps, { fill: true });
    PJ_STEPS.forEach((t, k) => put(steps, inst('Analysis/Step', { State: k < 3 ? 'Done' : k === 3 ? 'Current' : 'Pending', Label: k === 3 ? `${t} (12/24)` : t }), { fill: true }));
    fit(frame, screen);
  },
});
SCREENS.push({
  group: PJ_GROUP, title: 'GitHub로 경험 카드 만들기 / 고르기',
  build: async (frame) => {
    const { screen, col } = await pjGhPage(frame, { counts: PJ_READ, sample: true, refresh: true });
    const drafts = al('V', { name: '찾은 경험', gap: 12 }); put(col, drafts, { fill: true });
    await openDraft(drafts, pjDraft(PJ_DRAFTS[0]));
    const d2 = PJ_DRAFTS[1];
    put(drafts, named(inst('Repo/Draft', { Selected: 'Off', Title: d2.title, 'Resume line': d2.line, Keywords: d2.kws.join(PJ_KW_GAP), Evidence: d2.counts.join('  ') }), d2.title), { fill: true });
    await pjMadeList(col, PJ_MADE.length, PJ_MADE);
    gap(col, 24);
    const bar = al('H', { name: '아래 줄 (화면에 붙음)', gap: 12, main: 'between', cross: 'center', pad: [12, 0], fill: 'bg', stroke: 'border', sides: ['top'] }); put(col, bar, { fill: true });
    const all = al('H', { name: '모두 고르기', gap: 10, cross: 'center', minH: 39 }); bar.appendChild(all);
    all.appendChild(inst('Checkbox', { Checked: 'Off' })); all.appendChild(await text('모두 고르기', 'Body/15', 'text'));
    bar.appendChild(btn('경험 카드 1장 만들기', 'Primary', 'Medium'));
    fit(frame, screen);
  },
});
SCREENS.push({
  group: PJ_GROUP, title: 'GitHub로 경험 카드 만들기 / 새로 만들 것 없음',
  build: async (frame) => {
    const { screen, col } = await pjGhPage(frame, { counts: PJ_READ, sample: true, refresh: true });
    await empty(col, '새로 만들 경험이 없어요', '찾은 경험은 모두 카드로 만들었어요.', [btn('AI 채팅으로 만들기', 'Primary', 'Medium', 'chat')]);
    await pjMadeList(col, 8);
    fit(frame, screen);
  },
});
SCREENS.push({
  group: PJ_GROUP, title: 'GitHub로 경험 카드 만들기 / 레포 없음',
  build: async (frame) => {
    const { screen, col } = await pjGhPage(frame, { project: '슬랙봇' });
    await empty(col, '연결한 레포가 없어요', 'GitHub를 연결하면 커밋과 PR에서 경험을 찾아 줘요.', [btn('GitHub 연결', 'Primary', 'Medium')]);
    fit(frame, screen);
  },
});
SCREENS.push({
  group: PJ_GROUP, title: 'GitHub로 경험 카드 만들기 / 오류',
  build: async (frame) => {
    const { screen, col } = await pjGhPage(frame); // 오류가 있으면 다시 분석하기 단추 없이
    const banners = al('V', { name: '알림', gap: 8, pad: [0, 0, 20, 0] }); put(col, banners, { fill: true });
    put(banners, banner('Danger', 'moyeobom-backend: GitHub API 호출 한도에 걸렸어요. 로그인 없이 쓰면 1시간에 60회까지만 부를 수 있어요. 21:40 이후에 다시 시도해 주세요.', '다시 시도'), { fill: true });
    const e = al('V', { name: '빈 화면', pad: [42, 20, 56, 20], cross: 'center' }); put(col, e, { fill: true }); // 오류만 있을 때: 제목 없이 단추만 (.empty)
    e.appendChild(btn('AI 채팅으로 만들기', 'Secondary', 'Medium', 'chat'));
    fit(frame, screen);
  },
});
}

/* ===== screens/60-card.js ===== */
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
// 꺼진 저장 버튼 (.wr-foot .btn[disabled]: 회색 바탕, 테두리, text-3)
async function cdSaveOff() {
  const b = al('H', { name: '저장 (꺼짐)', pad: [3, 10], h: 32, main: 'center', cross: 'center', fill: 'surface-2', stroke: 'border', radius: 'radius/sm' });
  b.appendChild(await text('저장', 'Small/13.5 Semibold', 'text-3')); return b;
}
// 「AI 채팅에서 채우기」 같은 글 링크 (.link)
const cdLink = (label, name) => text(label, 'Small/13.5 Medium', 'primary', { underline: true, name: name || label });

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
      const dt = al('H', { name: '칸 이름', w: 72, pad: [8, 0, 0, 0] }); c.appendChild(dt);
      dt.appendChild(named(await text('상황', 'Small/13.5 Semibold', 'text-3'), 'star-label'));
      const dd = al('V', { name: '칸', gap: 4 }); put(c, dd, { fill: true });
      const box = al('V', { name: '입력칸', pad: [5, 10], radius: 'radius/sm',
        fill: k === 'Editing' || k === 'Saved' ? 'surface' : null,
        stroke: k === 'Editing' ? 'primary' : k === 'Saved' ? 'border-strong' : null, strokeW: k === 'Editing' ? 2 : 1 });
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
  const p = al('V', { name: '이력서 한 줄', pad: 20, fill: 'surface-2', radius: 'radius/md' }); put(col, p, { fill: true });
  const top = al('H', { name: '머리', gap: 10, cross: 'center' }); put(p, top, { fill: true });
  top.appendChild(await text('이력서 한 줄', 'Title/17', 'text')); spacer(top);
  top.appendChild(await text(`${d.line.length}자`, 'Small/13.5', 'text-3', { name: '글자 수' }));
  gap(p, 8);
  const box = al('V', { name: '입력칸', pad: [10, 12], fill: 'surface', stroke: 'field-border', radius: 'radius/sm' }); put(p, box, { fill: true });
  await tput(box, d.line || '이 경험을 이력서에 적을 한 문장', 'Body/15 Semibold', d.line ? 'text' : 'text-3', { wrap: true });
  gap(p, 8);
  put(p, inst('Card/Write footer', { State: 'Idle', 'Show hint': true, Hint: CD_LINE_HINT }), { fill: true });
  return p;
}

// STAR: 칸마다 Card/STAR row. states: { result: 'Editing', task: 'Saved' } (없으면 글이 있으면 Idle, 없으면 Empty)
async function cdStar(col, d, states = {}) {
  const s = al('V', { name: 'STAR', stroke: 'border', sides: ['top'] }); put(col, s, { fill: true });
  for (const [key, label] of CD_STAR) {
    const v = (states[key] && states[key].text) || d.star[key];
    const state = (states[key] && states[key].state) || (v ? 'Idle' : 'Empty');
    const r = inst('Card/STAR row', { State: state, Label: label, Text: v || CD_STAR_PH[key] }); r.name = label; put(s, r, { fill: true });
  }
  return s;
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
  sum.appendChild(await text('근거', 'Title/17', 'text'));
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

/* ===== screens/70-timeline.js ===== */
/* 경험 타임라인 (#/timeline, prototype/js/screens/timeline.js + css/screens/timeline.css)
   왼쪽에서 오른쪽으로 시간. 프로젝트는 가지(잉크 선), 카드는 그 달에서 갈라져 나온 잔가지.
   화면: 경험 타임라인 · 경험 타임라인 / 역량으로 거르기 · 경험 타임라인 / 처음
   그림은 앱의 SVG 좌표(G, 달 폭 MW)를 그대로 따른다. 선과 점은 토큰 색, 이름은 텍스트 스타일 */
{
  const G = { left: 28, right: 300, top: 52, head: 30, row: 30, gap: 30, minMW: 16, maxMW: 64 };
  const NOW = 2026 * 12 + 10; // 2026년 11월
  const ym = (s) => { const [y, m] = s.split('-').map(Number); return y * 12 + m - 1; };
  // 예시 계정의 프로젝트와 카드 (data.js + seed-repos.js). 시작한 순서대로
  const PROJECTS = [
    { name: '편의점 야간 아르바이트', start: '2023-07', end: '2023-12', cards: [['2023-07', '재고 실수 줄이기', ['실행력', '추진력']]] },
    { name: '카페 아르바이트', start: '2024-03', end: '2025-02', cards: [['2024-03', '주문 대기 줄 줄이기', ['기획력', '분석적 사고', '추진력']]] },
    { name: '빈강의실', start: '2025-03', end: '2025-06', cards: [
      ['2025-03', 'PDF 시간표 파싱으로 강의실 데이터 만들기', ['문제 해결력', '의사결정 능력', '실행력']],
      ['2025-04', '중복 예약 버그 해결', ['문제 해결력', '실행력', '분석적 사고']],
      ['2025-04', '일정이 밀렸을 때 기능 범위 조율', ['커뮤니케이션', '리더십']],
      ['2025-04', '빈 강의실 검색 쿼리와 복합 인덱스', ['분석적 사고', '문제 해결력']],
      ['2025-05', '사용자 테스트로 예약 동선 고치기', ['기획력']]] },
    { name: '알고리즘 스터디', start: '2025-03', end: '2025-12', cards: [
      ['2025-03', '흐지부지되던 스터디 참여율 되살리기', ['리더십', '커뮤니케이션', '도전정신']],
      ['2025-06', '발표 순서 교체 규칙으로 빈자리 줄이기', ['리더십', '추진력']]] },
    { name: '교내 해커톤', start: '2025-05', end: '2025-05', cards: [
      ['2025-05', '24시간 해커톤에서 MVP 범위 줄이기', ['의사결정 능력', '협업능력', '커뮤니케이션']],
      ['2025-05', '발표 중 데모가 멈출 때를 대비한 녹화본 준비', ['실행력', '기획력']]] },
    { name: '데이터베이스 팀과제', start: '2025-09', end: '2025-12', cards: [['2025-09', '연락 끊긴 팀원과 역할 재분배', ['커뮤니케이션', '실행력', '협업능력']]] },
    { name: '모여봄', start: '2026-09', ongoing: true, cards: [
      ['2026-09', 'JWT + Refresh Token 인증 설계', ['의사결정 능력', '커뮤니케이션', '실행력']],
      ['2026-10', '검색 API 응답 속도 개선 (N+1)', ['문제 해결력', '분석적 사고', '학습능력']],
      ['2026-10', '프론트와 API 명세 먼저 합의하기', ['협업능력', '추진력', '커뮤니케이션']],
      ['2026-10', 'Redis 캐시로 인기 모임 목록 조회 개선', ['문제 해결력', '의사결정 능력']],
      ['2026-10', '모임 정원 초과 참여를 비관적 락으로 방지', ['문제 해결력', '실행력']],
      ['2026-11', '배포 후 업로드 500 에러와 배포 체크리스트', ['문제 해결력', '실행력']]] },
    { name: '슬랙봇', start: '2026-10', ongoing: true, cards: [
      ['2026-10', '쓰는 사람에 맞춰 슬랙 봇과 Postgres 고르기', ['의사결정 능력', '기획력']],
      ['2026-11', '지출이 두 번씩 저장되던 문제 해결', ['문제 해결력', '도전정신', '학습능력']]] },
  ];
  const OPEN = new Set(['모여봄', '빈강의실']); // 펼친 프로젝트 (나머지는 접어 둔 모습)
  const short = (t) => (t.length > 26 ? `${t.slice(0, 25)}…` : t);

  /* ---------- 이 화면의 컴포넌트 ---------- */
  EXTRA_COMPONENTS.push({ title: '경험 타임라인', build: async (row) => {
    // 카드 잔가지 끝: 굽은 가지 + 점 + 이름. 인스턴스를 (카드 달의 x - 0.75, 줄 가운데 - 12)에 놓고, 가지 위쪽(줄기)은 화면에서 선으로 잇는다
    await makeSet(row, 'Timeline/Twig', ['Default', 'Hit', 'Dim'].map((k) => ({ props: { State: k }, build: async (c) => {
      auto(c, 'H', { h: 24, cross: 'center', opacity: k === 'Dim' ? 0.28 : 1 });
      const hold = figma.createFrame(); hold.name = 'elbow'; hold.fills = []; hold.clipsContent = false; hold.resize(10, 24); c.appendChild(hold);
      const el = figma.createFrame(); el.name = 'twig'; el.fills = []; el.resize(10, 12.75); stroke(el, k === 'Hit' ? 'primary' : 'field-border', 1.5, ['left', 'bottom']); el.bottomLeftRadius = 9; hold.appendChild(el); el.x = 0; el.y = 0;
      const pill = al('H', { name: 'card', gap: 6, pad: [0, 6, 0, 4], h: 24, cross: 'center', fill: k === 'Hit' ? 'hl' : null, radius: 'radius/tag' }); c.appendChild(pill);
      const dot = figma.createEllipse(); dot.name = 'dot'; dot.resize(10, 10); dot.fills = [paint('surface')]; stroke(dot, 'primary', 2); pill.appendChild(dot);
      pill.appendChild(named(await text('카드 이름', k === 'Hit' ? 'Small/13.5 Semibold' : 'Small/13.5 Medium', k === 'Hit' ? 'text' : 'text-2'), 'tw-name'));
    } })), { dir: 'H', desc: '타임라인의 카드 한 장. Hit: 고른 역량이 담긴 카드(형광펜), Dim: 고른 역량이 없는 카드', props: [{ name: 'Name', type: 'TEXT', default: '카드 이름', node: 'tw-name' }] });
    // 프로젝트 이름과 접기 단추. 인스턴스를 (시작 x - 8, 가지 y - 28)에 놓는다
    await makeSet(row, 'Timeline/Project', ['Open', 'Folded'].map((k) => ({ props: { Fold: k }, build: async (c) => {
      auto(c, 'H', { gap: 3, cross: 'center' });
      const b = al('H', { name: 'fold', w: 20, h: 22, main: 'center', cross: 'center', radius: 'radius/tag' }); c.appendChild(b);
      b.appendChild(icon(k === 'Open' ? 'chevron-down' : 'chevron-right', 14, 'text-3'));
      c.appendChild(named(await text('프로젝트', 'Small/13.5 Semibold', 'text'), 'tp-name'));
    } })), { dir: 'H', desc: '타임라인의 프로젝트 이름(누르면 프로젝트로)과 왼쪽 접기 단추. Folded: 카드를 접어 둔 모습', props: [{ name: 'Name', type: 'TEXT', default: '프로젝트', node: 'tp-name' }] });
  } });

  /* ---------- 그리기 ---------- */
  const rect = (parent, name, x, y, w, h, color, o = {}) => {
    const r = figma.createRectangle(); r.name = name; r.resize(Math.max(0.01, w), Math.max(0.01, h)); r.fills = [paint(color)]; if (o.radius) r.cornerRadius = o.radius; if (o.opacity != null) r.opacity = o.opacity;
    parent.appendChild(r); r.x = x; r.y = y; return r;
  };
  const dotAt = (parent, name, cx, cy, r, color, o = {}) => {
    const d = figma.createEllipse(); d.name = name; d.resize(r * 2, r * 2); d.fills = [paint(color)]; if (o.stroke) { stroke(d, o.stroke, o.sw || 2); d.strokeAlign = 'OUTSIDE'; }
    parent.appendChild(d); d.x = cx - r; d.y = cy - r; return d;
  };
  const place = async (parent, chars, style, color, x, y, o = {}) => { const t = await text(chars, style, color, o); parent.appendChild(t); t.x = x; t.y = y; return t; };

  // 캔버스(무대) 하나: { canvas, cards: { 카드 이름: 인스턴스 } }
  async function canvasOf(main, kw) {
    const width = 1684 - 16;
    const first = Math.min(...PROJECTS.map((p) => ym(p.start))) - 1; const last = NOW + 1; const months = last - first + 1;
    const MW = Math.max(G.minMW, Math.min(G.maxMW, (width - G.left - G.right) / months));
    const x = (m) => G.left + (m - first) * MW + MW / 2;
    // 높이 먼저
    let H = G.top; for (const p of PROJECTS) H += G.head + (OPEN.has(p.name) ? G.row * p.cards.length : 0) + G.gap; H += 8;
    const cv = figma.createFrame(); cv.name = '타임라인'; cv.fills = []; cv.clipsContent = true; cv.resize(1684, H); put(main, cv);
    const axis = figma.createFrame(); axis.name = '눈금'; axis.fills = []; axis.clipsContent = false; axis.resize(width, H); cv.appendChild(axis);
    for (let m = first; m <= last; m++) {
      if (!(m % 12 === 0 || m === first)) continue;
      const gx = x(m) - MW / 2; rect(axis, `${Math.floor(m / 12)}년 눈금`, gx, G.top - 22, 1, H - (G.top - 22), 'border');
      await place(axis, `${Math.floor(m / 12)}년`, 'Caption/12 Semibold', 'text-3', gx + 6, G.top - 28 - 12);
    }
    const nx = x(NOW);
    const now = figma.createFrame(); now.name = '지금 선'; now.fills = []; now.resize(1, H - (G.top - 22)); stroke(now, 'border-strong', 1, ['left']); now.dashPattern = [3, 4]; axis.appendChild(now); now.x = nx; now.y = G.top - 22;
    await place(axis, '지금', 'Caption/12 Semibold', 'text-2', nx - 20, G.top - 28 - 12, { w: 40, align: 'center' });

    const cards = {}; let y = G.top;
    for (const p of PROJECTS) {
      y += G.head; const ly = y; const xs = x(ym(p.start)); const end = p.ongoing ? NOW : ym(p.end); const xe = x(end) + (p.ongoing ? MW / 2 : 0);
      const open = OPEN.has(p.name);
      const g = figma.createFrame(); g.name = p.name; g.fills = []; g.clipsContent = false; g.resize(width, 1); cv.appendChild(g); g.x = 0; g.y = 0;
      // 가지
      rect(g, '가지', xs, ly - 1.25, Math.max(2.5, xe - xs), 2.5, 'primary', { radius: 1.25 });
      if (p.ongoing) {
        const tail = al('H', { name: '진행 중', gap: 5, cross: 'center', opacity: 0.6 }); g.appendChild(tail); tail.x = xe + 4; tail.y = ly - 1.25;
        for (let i = 0; i < Math.floor(MW / 7); i++) { const d = figma.createRectangle(); d.name = 'dash'; d.resize(2, 2.5); d.cornerRadius = 1.25; d.fills = [paint('primary')]; tail.appendChild(d); }
      } else dotAt(g, '끝', xe, ly, 3.5, 'primary');
      const hits = kw ? p.cards.filter((c) => c[2].includes(kw)) : [];
      if (!open) {
        for (const c of p.cards) { const hit = kw && c[2].includes(kw); dotAt(g, `갈래: ${c[1]}`, x(ym(c[0])), ly, hit ? 4.5 : 3, hit ? 'hl' : 'primary', hit ? { stroke: 'primary', sw: 1.5 } : {}); }
        await place(g, `카드 ${p.cards.length}장${hits.length ? `, 그중 「${kw}」 ${hits.length}장` : ''}`, 'Caption/12', 'text-3', xe + (p.ongoing ? MW : 0) + 12, ly - 8);
        y = ly + G.gap;
      } else {
        p.cards.forEach((c, k) => {
          const cy = ly + G.row * (k + 1); const cx = x(ym(c[0])); const hit = !kw || c[2].includes(kw);
          const state = kw ? (hit ? 'Hit' : 'Dim') : 'Default';
          rect(g, '줄기', cx - 0.75, ly, 1.5, cy - 12 - ly, state === 'Hit' ? 'primary' : 'field-border', { opacity: state === 'Dim' ? 0.28 : 1 });
          const tw = inst('Timeline/Twig', { State: state, Name: short(c[1]) }); tw.name = c[1]; g.appendChild(tw); tw.x = cx - 0.75; tw.y = cy - 12;
          cards[c[1]] = { node: tw, card: c, project: p.name };
        });
        for (const c of p.cards) dotAt(g, '갈래', x(ym(c[0])), ly, 2.5, 'primary');
        y = ly + G.row * p.cards.length + G.gap;
      }
      dotAt(g, '시작', xs, ly, 5, 'primary', { stroke: 'surface', sw: 2 });
      const head = inst('Timeline/Project', { Fold: open ? 'Open' : 'Folded', Name: p.name }); head.name = `${p.name} 이름`; g.appendChild(head); head.x = xs - 8; head.y = ly - 28;
    }
    return { canvas: cv, cards };
  }

  async function toolbar(main, kw) {
    const bar = al('H', { name: '도구', gap: 12, pad: [16, 40, 8, 40], cross: 'center' }); put(main, bar, { fill: true });
    const sel = inst('Select', { Text: kw || '모든 역량' }); sel.resize(160, sel.height); bar.appendChild(sel);
    if (kw) bar.appendChild(await text(`「${kw}」 역량이 담긴 카드 3장`, 'Small/13.5', 'text-2'));
    bar.appendChild(btn('모두 펴기', 'Ghost', 'Small'));
    spacer(bar); bar.appendChild(btn('다시 보기', 'Ghost', 'Small', 'restore'));
  }

  async function timeline(frame, kw) {
    const { screen, main } = shell(frame, 'Timeline');
    await titleBar(main, '경험 타임라인');
    await toolbar(main, kw);
    const r = await canvasOf(main, kw);
    fit(frame, screen);
    return r;
  }

  SCREENS.push({ group: '경험 타임라인', title: '경험 타임라인', build: async (frame) => { await timeline(frame, ''); } });

  SCREENS.push({ group: '경험 타임라인', title: '역량으로 거르기', build: async (frame) => {
    const { cards } = await timeline(frame, '리더십');
    // 카드에 올렸을 때: 제목, 프로젝트, 달, 역량 (고른 역량은 형광펜)
    const c = cards['일정이 밀렸을 때 기능 범위 조율'];
    const tip = al('V', { name: '카드 툴팁', gap: 2, pad: [10, 12], fill: 'surface', stroke: 'border-strong', radius: 'radius/sm', maxW: 280 }); shadow(tip, 'Menu'); frame.appendChild(tip);
    await tput(tip, c.card[1], 'Small/13.5 Semibold', 'text'); await tput(tip, c.project, 'Small/13.5', 'text-2');
    const [yy, mm] = c.card[0].split('-').map(Number); await tput(tip, `${yy}년 ${mm}월`, 'Small/13.5', 'text-2');
    const kws = al('H', { name: '역량', gap: 12, pad: [4, 0, 0, 0], wrap: true, cross: 'center' }); kws.counterAxisSpacing = 2; tip.appendChild(kws);
    for (const k of c.card[2]) kws.appendChild(inst('Keyword', { State: k === '리더십' ? 'Selected' : 'Default', Label: k }));
    const dot = c.node.findOne((n) => n.name === 'dot');
    const b = boxIn(dot, frame) || { x: SIDEBAR_W + c.node.x + 6, y: 56 + 56 + c.node.y + 7, h: 10 }; // 계산할 수 없을 때: 왼쪽 메뉴 + 잔가지 자리, 상단바 · 도구 줄 아래
    tip.x = Math.round(b.x - 8); tip.y = Math.round(b.y + b.h + 10);
  } });

  SCREENS.push({ group: '경험 타임라인', title: '처음', build: async (frame) => {
    const { screen, main } = shell(frame, 'Timeline', { trash: 0 });
    await titleBar(main, '경험 타임라인');
    const col = await page(main, {});
    await empty(col, '아직 경험 카드가 없어요', 'AI와 이야기하면 카드가 만들어지고, 여기에서 시간에 따라 뻗어 나가는 모습을 볼 수 있어요.', [btn('AI 채팅 시작', 'Primary', 'Medium', 'chat')]);
    fit(frame, screen);
  } });
}

/* ===== screens/80-settings.js ===== */
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

/* ===== screens/85-trash.js ===== */
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
      auto(c, 'H', { gap: 12, pad: [11, 8], w: 760, cross: 'center', stroke: 'border', sides: ['bottom'] }); c.minHeight = 56;
      c.appendChild(named(icon('card', 20, 'text-3'), 'type-icon'));
      const m = al('V', { name: 'main', gap: 4 }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
      await tput(m, '항목 이름', 'Body/15 Semibold', 'text', { wrap: true, name: 'tr-title' });
      const sub = al('H', { name: 'sub', gap: 12, cross: 'center', wrap: true }); sub.counterAxisSpacing = 4; put(m, sub, { fill: true });
      sub.appendChild(named(await text('경험 카드', 'Small/13.5', 'text-3'), 'tr-type'));
      const chip = al('H', { name: 'tr-chip', gap: 5, cross: 'center' }); sub.appendChild(chip);
      chip.appendChild(icon('folder', 14, 'primary')); chip.appendChild(named(await text('프로젝트', 'Small/13.5 Semibold', 'primary'), 'tr-project'));
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
    if (items.length) { const list = al('V', { name: '휴지통 항목', stroke: 'border', sides: ['top'] }); put(col, list, { fill: true }); for (const t of items) put(list, rowOf(t), { fill: true }); }
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

/* ===== 90-main.js ===== */
/* 실행: 기초 → 컴포넌트 → 화면. 화면은 그룹마다 한 줄로 놓는다.
   한 화면이 실패해도 나머지는 그린다 (실패한 화면에는 빨간 글로 까닭을 남기고, 끝에 모아서 알려 준다) */
const GROUP_ORDER = ['로그인', '시작하기', '홈', 'AI 채팅', '경험 위키', '프로젝트', '경험 카드', '경험 타임라인', '설정', '휴지통'];

async function main() {
  const started = Date.now();
  await pickFonts();
  const page = await resetPages();
  await setupVariables();
  await setupStyles();
  const found = await drawFoundations(page); found.x = 0; found.y = 0;
  const lib = await buildLibrary(page); lib.x = found.width + 400; lib.y = 0; // 기초 오른쪽에 컴포넌트
  await buildShellComponents(lib);
  for (const x of EXTRA_COMPONENTS) { // 화면 파일이 더한 컴포넌트
    const sec = al('V', { name: x.title, gap: 16 }); lib.appendChild(sec); await tput(sec, x.title, 'Title/17', 'text');
    const row = al('H', { name: 'items', gap: 32, wrap: true, w: 1800, cross: 'start' }); row.counterAxisSpacing = 32; sec.appendChild(row); await x.build(row);
  }

  // 화면
  const groups = [...new Set(SCREENS.map((s) => s.group))].sort((a, b) => (GROUP_ORDER.indexOf(a) + 1 || 99) - (GROUP_ORDER.indexOf(b) + 1 || 99));
  const failed = []; let count = 0;
  let y = Math.ceil(Math.max(found.height, lib.height)) + 800; // 화면은 그 아래 (그룹마다 한 줄)
  const top = await text('화면', 'Display/34', 'text'); page.appendChild(top); top.x = 0; top.y = y; y += 120;
  for (const g of groups) {
    const label = await text(g, 'Heading/24', 'text'); page.appendChild(label); label.x = 0; label.y = y; y += 80;
    let x = 0; let rowH = 0;
    for (const s of SCREENS.filter((x) => x.group === g)) {
      const f = figma.createFrame(); f.name = `${g} / ${s.title}`; f.resize(s.w || W, s.h || H); f.fills = fills('bg'); f.clipsContent = true;
      page.appendChild(f); f.x = x; f.y = y;
      try { await s.build(f); count++; }
      catch (e) {
        failed.push(`${f.name}: ${e.message}`);
        const t = await text(`그리다가 멈췄어요: ${e.message}`, 'Body/15 Semibold', 'danger', { w: 1200 }); f.appendChild(t); t.x = 40; t.y = 40;
      }
      x += f.width + 160; rowH = Math.max(rowH, f.height);
    }
    y += rowH + 320;
  }
  await Promise.all(PENDING);
  figma.viewport.scrollAndZoomIntoView(page.children);
  const msg = `Rewrite v1: 컴포넌트 ${Object.keys(LIB).length}개, 화면 ${count}개를 그렸어요 (${Math.round((Date.now() - started) / 1000)}초, 글꼴 ${FONT.family}).`;
  if (typeof print === 'function') print(failed.length ? `${msg}\n실패 ${failed.length}개:\n${failed.join('\n')}` : msg);
  if (failed.length) throw new Error(`화면 ${failed.length}개를 그리지 못했어요:\n${failed.join('\n')}`);
}
await main();
