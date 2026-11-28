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
