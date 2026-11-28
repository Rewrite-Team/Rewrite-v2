/* 실행: 기초 → 컴포넌트 → 화면. 화면은 그룹마다 한 줄로 놓는다.
   한 화면이 실패해도 나머지는 그린다 (실패한 화면에는 빨간 글로 까닭을 남기고, 끝에 모아서 알려 준다) */
const GROUP_ORDER = ['로그인', '시작하기', '홈', 'AI 채팅', '경험 위키', '프로젝트', '경험 카드', '경험 타임라인', '설정', '휴지통'];

async function main() {
  const started = Date.now();
  await pickFonts();
  const pages = await resetPages();
  await setupVariables();
  await setupStyles();
  await drawFoundations(pages.found);
  const lib = await buildLibrary(pages.comp);
  await buildShellComponents(lib);
  for (const x of EXTRA_COMPONENTS) { // 화면 파일이 더한 컴포넌트
    const sec = al('V', { name: x.title, gap: 16 }); lib.appendChild(sec); await tput(sec, x.title, 'Title/17', 'text');
    const row = al('H', { name: 'items', gap: 32, wrap: true, w: 1800, cross: 'start' }); row.counterAxisSpacing = 32; sec.appendChild(row); await x.build(row);
  }

  // 화면
  const groups = [...new Set(SCREENS.map((s) => s.group))].sort((a, b) => (GROUP_ORDER.indexOf(a) + 1 || 99) - (GROUP_ORDER.indexOf(b) + 1 || 99));
  const failed = []; let y = 0; let count = 0;
  for (const g of groups) {
    const label = await text(g, 'Heading/24', 'text'); pages.screens.appendChild(label); label.x = 0; label.y = y; y += 80;
    let x = 0; let rowH = 0;
    for (const s of SCREENS.filter((x) => x.group === g)) {
      const f = figma.createFrame(); f.name = `${g} / ${s.title}`; f.resize(s.w || W, s.h || H); f.fills = fills('bg'); f.clipsContent = true;
      pages.screens.appendChild(f); f.x = x; f.y = y;
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
  await figma.setCurrentPageAsync(pages.screens);
  figma.viewport.scrollAndZoomIntoView(pages.screens.children);
  const msg = `Rewrite v1: 컴포넌트 ${Object.keys(LIB).length}개, 화면 ${count}개를 그렸어요 (${Math.round((Date.now() - started) / 1000)}초, 글꼴 ${FONT.family}).`;
  if (typeof print === 'function') print(failed.length ? `${msg}\n실패 ${failed.length}개:\n${failed.join('\n')}` : msg);
  if (failed.length) throw new Error(`화면 ${failed.length}개를 그리지 못했어요:\n${failed.join('\n')}`);
}
await main();
