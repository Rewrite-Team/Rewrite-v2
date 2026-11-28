#!/usr/bin/env node
'use strict';
/* Deliberate mistakes: each case must fail (or warn) with the expected message. Run: node figma/test/selftest.js */
const { runCode } = require('./run');

const F = "await figma.loadFontAsync({ family: 'Noto Sans KR', style: 'Regular' });\n";
const CASES = [
  ['FILL on a child of a non-auto-layout frame', /FILL can only be set on children of auto-layout frames/,
    "const f = figma.createFrame(); const r = figma.createRectangle(); f.appendChild(r); r.layoutSizingHorizontal = 'FILL';"],
  ['characters before the font is loaded', /Cannot write to node with unloaded font "Inter Regular"/,
    "const t = figma.createText(); t.characters = 'hi';"],
  ['setProperties with an unknown key', /Property "Nope" not found/,
    "const c = figma.createComponent(); c.addComponentProperty('Label', 'TEXT', 'x'); c.createInstance().setProperties({ Nope: 'y' });"],
  ['setProperties with a TEXT key missing its #id suffix', /Property "Label" not found.*did you mean/,
    "const c = figma.createComponent(); c.addComponentProperty('Label', 'TEXT', 'x'); c.createInstance().setProperties({ Label: 'y' });"],
  ['appendChild into an instance', /New parent is an instance or is inside of an instance/,
    "const c = figma.createComponent(); const i = c.createInstance(); i.appendChild(figma.createRectangle());"],
  ['appendChild into a frame inside an instance', /New parent is an instance or is inside of an instance/,
    "const c = figma.createComponent(); c.appendChild(figma.createFrame()); const i = c.createInstance(); i.children[0].appendChild(figma.createRectangle());"],
  ['"a" in a SOLID paint color', /unexpected key "a"/,
    "figma.createFrame().fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.5 } }];"],
  ['non-array fills', /must be an array of paints/,
    "figma.createFrame().fills = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };"],
  ['0..255 color', /expected a number in 0\.\.1/,
    "figma.createFrame().fills = [{ type: 'SOLID', color: { r: 255, g: 0, b: 0 } }];"],
  ['bare-number lineHeight', /bare number/,
    F + "const t = figma.createText(); t.fontName = { family: 'Noto Sans KR', style: 'Regular' }; t.lineHeight = 20;"],
  ['loading an unavailable font', /"Pretendard Regular" could not be loaded/,
    "await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' });"],
  ['setting figma.currentPage directly', /Setting figma.currentPage is not supported/,
    "figma.currentPage = figma.createPage();"],
  ['addComponentProperty on a variant', /Call addComponentProperty on the COMPONENT_SET/,
    "const a = figma.createComponent(); a.name = 'V=A'; const b = figma.createComponent(); b.name = 'V=B'; figma.combineAsVariants([a, b], figma.currentPage); a.addComponentProperty('L', 'TEXT', 'x');"],
  ['bad variant name in combineAsVariants', /must look like "Prop=Value"/,
    "const a = figma.createComponent(); a.name = 'Primary'; figma.combineAsVariants([a], figma.currentPage);"],
  ["'HUG' as primaryAxisSizingMode", /use 'AUTO'/,
    "const f = figma.createFrame(); f.layoutMode = 'VERTICAL'; f.primaryAxisSizingMode = 'HUG';"],
  ['HUG on a non-auto-layout frame', /HUG can only be set/,
    "figma.createFrame().layoutSizingVertical = 'HUG';"],
  ['assigning width', /read-only property "width"/,
    "figma.createFrame().width = 10;"],
  ['resize to 0', /Expected "width" to have value >= 0.01/,
    "figma.createFrame().resize(0, 10);"],
  ['API the mock lacks', /mock: figma.createAutoLayout\(\) not implemented/,
    "figma.createAutoLayout();"],
  ['using a removed node', /does not exist: it was removed/,
    "const r = figma.createRectangle(); r.remove(); r.name = 'x';"],
  ['createInstance on a component set', /use set.defaultVariant.createInstance/,
    "const a = figma.createComponent(); a.name = 'V=A'; figma.combineAsVariants([a], figma.currentPage).createInstance();"],
  ['unawaited loadFontAsync (warning)', { warn: /figma.loadFontAsync\(\.\.\.\) was never awaited \(line 1/ },
    "figma.loadFontAsync({ family: 'Inter', style: 'Regular' });"],
];

(async () => {
  let bad = 0;
  for (const [name, expect, code] of CASES) {
    const r = await runCode(code, { file: `selftest:${name.replace(/\W+/g, '-')}.js` });
    let ok, got;
    if (expect.warn) { got = r.warnings.join(' | ') || (r.error && r.error.message) || 'nothing'; ok = r.ok && r.warnings.some((w) => expect.warn.test(w)); }
    else { got = r.ok ? 'no error' : r.error.message; ok = !r.ok && expect.test(got); }
    if (!ok) bad++;
    console.log(`${ok ? 'caught ' : 'MISSED '} ${name}${ok ? '' : `\n         expected ${expect.warn || expect}\n         got: ${got}`}`);
  }
  console.log(`\n${CASES.length - bad}/${CASES.length} deliberate mistakes caught`);
  process.exitCode = bad ? 1 : 0;
})();
