/* 기초: 글꼴, 색 변수, 텍스트 스타일, 그림자 스타일, 페이지. 그리고 「v1 Foundations」 페이지(색과 글자 견본)
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
async function resetPages() {
  const old = figma.root.children.filter((p) => Object.values(V1.pages).includes(p.name));
  const made = {};
  for (const [k, name] of Object.entries(V1.pages)) { const p = figma.createPage(); p.name = `${name} (만드는 중)`; made[k] = p; }
  await figma.setCurrentPageAsync(made.found); // 지우려는 페이지에 머물러 있지 않게
  old.forEach((p) => p.remove());
  for (const [k, name] of Object.entries(V1.pages)) made[k].name = name;
  return made;
}

/* ---------- 「v1 Foundations」: 색 견본과 글자 견본 ---------- */
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
