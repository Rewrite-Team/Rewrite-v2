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

/* ---------- 텍스트 스타일: 앱의 글자 크기 다섯 개(12·13.5·15·18·26)와 소개 문구 34 ---------- */
const TYPE = [
  // [이름, 크기, 줄 높이, 굵기, 설명]
  ['Display/34', 34, 46, 700, '로그인 소개 문구'],
  ['Heading/26', 26, 35, 700, '화면 제목 (h1). 한 화면에 하나'],
  ['Title/18', 18, 25, 700, '섹션 제목, 모달 제목, 펼친 카드 제목'],
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
    st.fontSize = size; st.lineHeight = { unit: 'PIXELS', value: lh }; st.letterSpacing = { unit: 'PERCENT', value: size >= 18 ? -1.5 : 0 }; st.description = desc;
    STYLES[name] = st;
  }
  if (FONT.mono) { const st = figma.createTextStyle(); st.name = `${V1.prefix}/Mono/12`; st.fontName = FONT.mono; st.fontSize = 12; st.lineHeight = { unit: 'PIXELS', value: 19.8 }; st.description = '근거 코드'; STYLES['Mono/12'] = st; }
  else STYLES['Mono/12'] = STYLES['Caption/12'];
  const shadowOf = (layers) => layers.map(([y, blur, a]) => ({ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a }, offset: { x: 0, y }, radius: blur, spread: 0, visible: true, blendMode: 'NORMAL' }));
  for (const [k, layers, desc] of [['Card', [[1, 2, 0.05]], '카드와 둥근 목록의 옅은 그림자'], ['Menu', [[2, 6, 0.04], [10, 28, 0.09]], '떠 있는 것: 메뉴, 툴팁, 알림, 이력서 종이'], ['Modal', [[4, 12, 0.06], [24, 64, 0.18]], '모달']]) {
    const e = figma.createEffectStyle(); e.name = `${V1.prefix}/Elevation/${k}`; e.effects = shadowOf(layers); e.description = desc; EFFECTS[k] = e;
  }
}

/* ---------- 색·모서리 변수 ---------- */
async function setupVariables() {
  for (const c of await figma.variables.getLocalVariableCollectionsAsync()) if (c.name === V1.collection) c.remove();
  const col = figma.variables.createVariableCollection(V1.collection); col.renameMode(col.modes[0].modeId, 'Light'); const mode = col.modes[0].modeId;
  // 1) 색 단계 변수 (color/orange/500 …)  2) 쓰임 변수는 단계를 가리키는 별칭 → 단계 값만 바꾸면 함께 바뀐다
  const scale = {};
  for (const [name, hex] of Object.entries(PALETTE)) {
    const v = figma.variables.createVariable(`color/${name}`, col, 'COLOR'); v.setValueForMode(mode, rgb(hex));
    v.scopes = ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR', 'TEXT_FILL']; scale[name] = v;
  }
  for (const [name, step] of Object.entries(ALIASES)) {
    const v = figma.variables.createVariable(`color/${name}`, col, 'COLOR'); v.setValueForMode(mode, figma.variables.createVariableAlias(scale[step]));
    v.scopes = name.startsWith('text') || name.startsWith('on-primary') ? ['TEXT_FILL', 'STROKE_COLOR', 'SHAPE_FILL'] : ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR', 'TEXT_FILL'];
    TOKENS[name] = v;
  }
  for (const [name, v] of Object.entries(scale)) TOKENS[name] = v; // 색 단계도 paint('orange/500') 로 칠할 수 있다
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

/* ---------- 색 단계 한 벌 ---------- */
// 대비(WCAG): 4.5 이상 AA, 7 이상 AAA
function contrast(a, b) {
  const lum = (h) => { const c = rgb(h); const f = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05);
}
async function drawScale(parent, key, title) {
  const card = al('V', { name: title, gap: 16, pad: 32, fill: 'surface', stroke: 'border', radius: 'radius/lg' }); parent.appendChild(card);
  await tput(card, title, 'Heading/26', 'text');
  for (const step of STEPS) {
    const token = `${key}/${step}`; const hex = PALETTE[token];
    const row = al('H', { name: `${key}-${step}`, gap: 16, cross: 'center' }); card.appendChild(row);
    const chip = al('V', { name: 'chip', gap: 4, pad: [8, 10], w: 160, h: 64, fill: token, stroke: 'border', radius: 'radius/sm' }); row.appendChild(chip);
    for (const [label, on] of [['검은 글자', '#000000'], ['흰 글자', '#ffffff']]) {
      const n = contrast(hex, on); const grade = n >= 7 ? ' AAA' : n >= 4.5 ? ' AA' : '';
      const badge = al('H', { name: label, pad: [1, 8], fill: 'surface', radius: 'radius/pill' }); chip.appendChild(badge);
      await tput(badge, `${label} ${n.toFixed(2)}${grade}`, 'Caption/12', 'text');
    }
    const info = al('V', { name: '값', w: 160 }); row.appendChild(info);
    await tput(info, `${key}-${step}`, 'Body/15 Semibold', 'text'); await tput(info, hex, 'Caption/12', 'text-3');
    const c = rgb(hex); await tput(info, `rgb(${[c.r, c.g, c.b].map((v) => Math.round(v * 255)).join(', ')})`, 'Caption/12', 'text-3');
  }
  return card;
}

/* ---------- 기초 견본: 색과 글자 (페이지 왼쪽 위) ---------- */
async function drawFoundations(pageNode) {
  const board = al('V', { name: 'Foundations', gap: 48, pad: 64, fill: 'surface' }); pageNode.appendChild(board);
  await tput(board, 'Rewrite v1 기초', 'Heading/26', 'text');
  await tput(board, '누구나 편하게 쓰는 서비스. 색은 흰색, 회색, 검정과 주황 하나(#FF8834)뿐이고 주황은 밝기만 조금씩 바꿔 쓴다. 모서리는 둥글게, 여백은 넉넉하게. 자세한 규칙은 docs/design-guide.md', 'Body/15', 'text-2', { w: 960 });
  // 색 단계: 단계마다 견본, 흰 글자와 검은 글자의 대비, 값
  const scales = al('H', { name: '색 단계', gap: 40, cross: 'start' }); board.appendChild(scales);
  for (const [key, title] of [['orange', 'Orange'], ['grey', 'Grey']]) await drawScale(scales, key, title);
  // 쓰임 토큰
  const colors = al('V', { name: '쓰임 색', gap: 16 }); board.appendChild(colors);
  await tput(colors, '쓰임 색 (화면은 이 변수를 쓴다. 아래 글은 가리키는 단계)', 'Title/18', 'text');
  const grid = al('H', { name: '견본', gap: 16, wrap: true, w: 1200 }); grid.counterAxisSpacing = 16; colors.appendChild(grid);
  for (const name of Object.keys(ALIASES)) {
    const sw = al('V', { name, gap: 8, w: 132 }); grid.appendChild(sw);
    const chip = figma.createRectangle(); chip.name = 'chip'; chip.resize(132, 72); chip.fills = [paint(name)]; radius(chip, 'radius/md'); stroke(chip, 'border'); sw.appendChild(chip);
    await tput(sw, name, 'Small/13.5 Semibold', 'text'); await tput(sw, ALIASES[name], 'Caption/12', 'text-3');
  }
  // 글자
  const type = al('V', { name: '글자', gap: 14 }); board.appendChild(type);
  await tput(type, `글자 (텍스트 스타일: v1/…, 글꼴 ${FONT.family})`, 'Title/18', 'text');
  for (const [name, size, lh, w, desc] of TYPE.concat([['Mono/12', 12, 19.8, 400, '근거 코드']])) {
    const row = al('H', { name, gap: 24, cross: 'center' }); type.appendChild(row);
    const label = al('V', { name: 'label', w: 240 }); row.appendChild(label);
    await tput(label, name, 'Small/13.5 Semibold', 'text'); await tput(label, `${size} / ${lh} / ${w}`, 'Caption/12', 'text-3');
    await tput(row, `편하게 말한 경험이 이력서 한 줄이 돼요. ${desc}`, name, 'text');
  }
  return board;
}
