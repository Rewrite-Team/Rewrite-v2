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
