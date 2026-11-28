/* Self-test script for the mock: exercises the API the way our bundles do. Run: node figma/test/run.js figma/test/sample.js */
const N = (style) => ({ family: 'Noto Sans KR', style });
await Promise.all([N('Regular'), N('Bold')].map((f) => figma.loadFontAsync(f)));
const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });

// pages
let page = figma.root.children.find((p) => p.name === 'Sample') || figma.createPage();
page.name = 'Sample';
await figma.setCurrentPageAsync(page);

// text styles
const st = figma.createTextStyle(); st.name = 'Body 15'; st.fontName = N('Regular'); st.fontSize = 15; st.lineHeight = { unit: 'PIXELS', value: 24 };
const sb = figma.createTextStyle(); sb.name = 'Label 13 Bold'; sb.fontName = N('Bold'); sb.fontSize = 13; sb.lineHeight = { unit: 'PIXELS', value: 18 }; sb.letterSpacing = { unit: 'PERCENT', value: -1 };
const styles = await figma.getLocalTextStylesAsync();
const T = async (chars, s) => { const t = figma.createText(); await t.setTextStyleIdAsync(s.id); t.characters = chars; return t; };

// variables + bound paints
const col = figma.variables.createVariableCollection('Sample tokens');
col.renameMode(col.defaultModeId, 'Light');
const dark = col.addMode('Dark');
const primary = figma.variables.createVariable('color/primary', col, 'COLOR');
primary.setValueForMode(col.defaultModeId, hex('#24426f'));
primary.setValueForMode(dark, { r: 0.6, g: 0.7, b: 0.9, a: 1 });
primary.scopes = ['ALL_FILLS'];
const gap = figma.variables.createVariable('space/gap', col, 'FLOAT');
gap.setValueForMode(col.defaultModeId, 8);
const basePaint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
const bound = figma.variables.setBoundVariableForPaint(basePaint, 'color', primary);
if (basePaint.boundVariables) throw new Error('setBoundVariableForPaint mutated its input');
const effect = figma.createEffectStyle(); effect.name = 'Shadow/1';
effect.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 6, spread: 0, visible: true, blendMode: 'NORMAL' }];

// component with properties + variants
const makeBtn = async (variant) => {
  const c = figma.createComponent();
  c.name = `Variant=${variant}, Size=Small`;
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO';
  c.paddingLeft = c.paddingRight = 12; c.paddingTop = c.paddingBottom = 6; c.itemSpacing = 6; c.cornerRadius = 4;
  c.fills = variant === 'Primary' ? [bound] : [{ type: 'SOLID', color: hex('#ffffff'), opacity: 0.9 }];
  c.strokes = [{ type: 'SOLID', color: hex('#e1e5eb') }]; c.strokeWeight = 1; c.strokeAlign = 'INSIDE';
  await c.setEffectStyleIdAsync(effect.id);
  c.setBoundVariable('itemSpacing', gap);
  const icon = figma.createNodeFromSvg('<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 8h12"/><circle cx="8" cy="8" r="3"/></svg>');
  icon.name = 'icon'; c.appendChild(icon);
  const label = await T('Button', sb); label.name = 'label'; c.appendChild(label);
  return c;
};
const variants = [await makeBtn('Primary'), await makeBtn('Secondary')];
const board = figma.createFrame(); board.name = 'Board'; board.resize(800, 400);
const set = figma.combineAsVariants(variants, board);
set.name = 'Button';
set.layoutMode = 'VERTICAL'; set.itemSpacing = 8; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
const labelKey = set.addComponentProperty('Label', 'TEXT', 'Button');
const iconKey = set.addComponentProperty('Show icon', 'BOOLEAN', true);
for (const v of set.children) {
  v.findOne((n) => n.name === 'label').componentPropertyReferences = { characters: labelKey };
  v.findOne((n) => n.name === 'icon').componentPropertyReferences = { visible: iconKey };
}
const defs = set.componentPropertyDefinitions;
if (defs.Variant.variantOptions.join() !== 'Primary,Secondary') throw new Error('variant options wrong: ' + JSON.stringify(defs));

// standalone component with INSTANCE_SWAP
const dot = figma.createComponent(); dot.name = 'Dot'; dot.resize(8, 8);
const ring = figma.createComponent(); ring.name = 'Ring'; ring.resize(8, 8);
const row = figma.createComponent(); row.name = 'Row'; row.layoutMode = 'HORIZONTAL'; row.itemSpacing = 4;
const slot = dot.createInstance(); row.appendChild(slot);
const swapKey = row.addComponentProperty('Marker', 'INSTANCE_SWAP', dot.id);
slot.componentPropertyReferences = { mainComponent: swapKey };

// screen: auto layout FILL/HUG and instances
const screen = figma.createFrame(); screen.name = 'Screen';
screen.layoutMode = 'VERTICAL'; screen.resize(360, 200); screen.primaryAxisSizingMode = 'AUTO';
screen.paddingLeft = screen.paddingRight = 16; screen.itemSpacing = 12;
const title = await T('A long title that should wrap inside the screen', st);
screen.appendChild(title); title.layoutSizingHorizontal = 'FILL';
if (title.textAutoResize !== 'HEIGHT') throw new Error('FILL text should switch to HEIGHT, got ' + title.textAutoResize);
const toolbar = figma.createFrame(); toolbar.name = 'Toolbar'; toolbar.layoutMode = 'HORIZONTAL'; toolbar.itemSpacing = 8; toolbar.fills = [];
screen.appendChild(toolbar);
toolbar.layoutSizingHorizontal = 'FILL'; toolbar.layoutSizingVertical = 'HUG';
const b1 = set.defaultVariant.createInstance(); toolbar.appendChild(b1);
b1.setProperties({ Variant: 'Secondary', [labelKey]: 'Cancel', [iconKey]: false });
if (b1.mainComponent.name !== 'Variant=Secondary, Size=Small') throw new Error('variant swap failed: ' + b1.mainComponent.name);
if (b1.findOne((n) => n.name === 'label').characters !== 'Cancel') throw new Error('TEXT property not applied');
if (b1.findOne((n) => n.name === 'icon').visible !== false) throw new Error('BOOLEAN property not applied');
const b2 = set.defaultVariant.createInstance(); toolbar.appendChild(b2);
b2.layoutSizingHorizontal = 'FILL';
const r = row.createInstance(); screen.appendChild(r);
r.setProperties({ [swapKey]: ring.id });
if (r.children[0].mainComponent !== ring) throw new Error('INSTANCE_SWAP not applied');
const props = b1.componentProperties;
if (props[labelKey].value !== 'Cancel') throw new Error('componentProperties wrong');

// misc
const line = figma.createLine(); line.resize(100, 0); line.strokes = [{ type: 'SOLID', color: hex('#848e9d') }]; line.dashPattern = [4, 4];
const el = figma.createEllipse(); el.resize(20, 20); toolbar.appendChild(el); el.layoutPositioning = 'ABSOLUTE';
const copy = b2.clone(); copy.name = 'copy';
screen.findAllWithCriteria({ types: ['TEXT'] }).forEach((t) => (t.textAlignHorizontal = 'LEFT'));
const found = await figma.getNodeByIdAsync(screen.id);
if (found !== screen) throw new Error('getNodeByIdAsync failed');
const tmp = figma.createRectangle(); tmp.remove();
figma.viewport.scrollAndZoomIntoView([screen]);
figma.notify('done');
print(`screen ${screen.width}x${Math.round(screen.height)}, toolbar ${toolbar.width}x${toolbar.height}, title h ${title.height}`);
