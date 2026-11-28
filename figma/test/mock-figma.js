'use strict';
/*
 * mock-figma.js: a stand-in for the Figma Plugin API, for smoke-testing Scripter-style scripts in Node.
 * It is not a renderer. It keeps a node tree, validates arguments the way Figma does for the
 * mistakes we keep making, and does a rough auto-layout size pass so stats and warnings make sense.
 *
 *   const { createFigma } = require('./mock-figma');
 *   const { figma, ctx } = createFigma({ sourceFile, lineOffset: 2, print });
 *
 * Unknown method-like names on nodes / figma throw "mock: <name> not implemented".
 * Plain property sets of unknown names are stored as-is.
 */
const util = require('util');

class FigmaMockError extends Error {
  constructor(msg) { super(msg); this.name = 'FigmaError'; }
}
function fail(msg) { throw new FigmaMockError(msg); }

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const dc = (v) => {
  if (Array.isArray(v)) return v.map(dc);
  if (isObj(v) && !v._type) {
    const proto = Object.getPrototypeOf(v);
    if (proto === Object.prototype || proto === null) {
      const o = {};
      for (const k of Object.keys(v)) o[k] = dc(v[k]);
      return o;
    }
  }
  return v;
};
const deepFreeze = (v) => {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); for (const k of Object.keys(v)) deepFreeze(v[k]); }
  return v;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// names that look like API methods: a missing one throws instead of returning undefined
const METHOD_RE = /(Async$)|^(get|set|create|add|remove|find|load|import|export|insert|swap|detach|reset|rescale|resize|append|clone|delete|edit|list|combine|group|flatten|union|subtract|intersect|exclude|notify|close|show|scroll|save|query|apply|move|select|commit|trigger|outline|lock|unlock|on|off|once|encode|decode|base64|hex)([A-Z_0-9]|$)/;

function findDesc(obj, p) {
  for (let o = obj; o; o = Object.getPrototypeOf(o)) {
    const d = Object.getOwnPropertyDescriptor(o, p);
    if (d) return d;
  }
  return null;
}

const HANDLER = {
  get(t, p, r) {
    if (typeof p === 'symbol' || p[0] === '_') return Reflect.get(t, p, r);
    if (t._removed && p !== 'removed' && p !== 'id' && p !== 'type' && p !== 'toString') {
      fail(`The node with id "${t._id}" does not exist: it was removed (reading "${p}" on a removed node throws in Figma)`);
    }
    if (p in t) return Reflect.get(t, p, r);
    if (p === 'then' || p === 'toJSON') return undefined;
    if (METHOD_RE.test(p)) {
      return function notImplemented() { fail(`mock: ${t._label ? t._label() : 'object'}.${p}() not implemented`); };
    }
    return undefined;
  },
  set(t, p, v, r) {
    if (typeof p === 'symbol' || p[0] === '_') { t[p] = v; return true; }
    if (t._removed) fail(`The node with id "${t._id}" does not exist: it was removed (setting "${p}")`);
    const d = findDesc(t, p);
    if (d && (d.get || d.set)) {
      if (!d.set) fail(`Cannot set read-only property "${p}" on ${t._label ? t._label() : 'object'}${p === 'width' || p === 'height' ? ' (use resize(w, h))' : ''}`);
      d.set.call(r, v);
      return true;
    }
    t[p] = v;
    return true;
  },
};
const wrap = (obj) => new Proxy(obj, HANDLER);

const DEFAULT_FONTS = [
  ...['Thin', 'Light', 'DemiLight', 'Regular', 'Medium', 'Bold', 'Black'].map((s) => ['Noto Sans KR', s]),
  ['Roboto Mono', 'Regular'], ['Roboto Mono', 'Medium'],
  ['Inter', 'Regular'], ['Inter', 'Medium'], ['Inter', 'Semi Bold'], ['Inter', 'Bold'],
];

const PAINT_KEYS = {
  SOLID: ['type', 'color', 'opacity', 'visible', 'blendMode', 'boundVariables'],
  GRADIENT_LINEAR: ['type', 'gradientTransform', 'gradientStops', 'opacity', 'visible', 'blendMode'],
  IMAGE: ['type', 'scaleMode', 'imageHash', 'imageTransform', 'scalingFactor', 'rotation', 'filters', 'opacity', 'visible', 'blendMode'],
  VIDEO: ['type', 'scaleMode', 'videoHash', 'videoTransform', 'scalingFactor', 'rotation', 'filters', 'opacity', 'visible', 'blendMode'],
};
PAINT_KEYS.GRADIENT_RADIAL = PAINT_KEYS.GRADIENT_ANGULAR = PAINT_KEYS.GRADIENT_DIAMOND = PAINT_KEYS.GRADIENT_LINEAR;
const EFFECT_KEYS = {
  DROP_SHADOW: ['type', 'color', 'offset', 'radius', 'spread', 'visible', 'blendMode', 'showShadowBehindNode', 'boundVariables'],
  INNER_SHADOW: ['type', 'color', 'offset', 'radius', 'spread', 'visible', 'blendMode', 'boundVariables'],
  LAYER_BLUR: ['type', 'radius', 'visible', 'boundVariables', 'blurType', 'startRadius', 'startOffset', 'endOffset'],
  BACKGROUND_BLUR: ['type', 'radius', 'visible', 'boundVariables', 'blurType', 'startRadius', 'startOffset', 'endOffset'],
};
const VARIABLE_SCOPES = ['ALL_SCOPES', 'TEXT_CONTENT', 'CORNER_RADIUS', 'WIDTH_HEIGHT', 'GAP', 'ALL_FILLS', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL',
  'STROKE_COLOR', 'STROKE_FLOAT', 'EFFECT_FLOAT', 'EFFECT_COLOR', 'OPACITY', 'FONT_FAMILY', 'FONT_STYLE', 'FONT_WEIGHT', 'FONT_SIZE', 'LINE_HEIGHT',
  'LETTER_SPACING', 'PARAGRAPH_SPACING', 'PARAGRAPH_INDENT', 'FONT_VARIATIONS', 'TRANSFORM'];
const BINDABLE = {
  width: 'FLOAT', height: 'FLOAT', minWidth: 'FLOAT', maxWidth: 'FLOAT', minHeight: 'FLOAT', maxHeight: 'FLOAT',
  itemSpacing: 'FLOAT', counterAxisSpacing: 'FLOAT', paddingLeft: 'FLOAT', paddingRight: 'FLOAT', paddingTop: 'FLOAT', paddingBottom: 'FLOAT',
  topLeftRadius: 'FLOAT', topRightRadius: 'FLOAT', bottomLeftRadius: 'FLOAT', bottomRightRadius: 'FLOAT',
  strokeWeight: 'FLOAT', strokeTopWeight: 'FLOAT', strokeRightWeight: 'FLOAT', strokeBottomWeight: 'FLOAT', strokeLeftWeight: 'FLOAT',
  opacity: 'FLOAT', visible: 'BOOLEAN', characters: 'STRING', gridRowGap: 'FLOAT', gridColumnGap: 'FLOAT',
  fontSize: 'FLOAT', fontWeight: 'FLOAT', letterSpacing: 'FLOAT', lineHeight: 'FLOAT', paragraphSpacing: 'FLOAT', paragraphIndent: 'FLOAT',
  fontFamily: 'STRING', fontStyle: 'STRING',
};

function parseVariant(name) {
  if (typeof name !== 'string') return null;
  const out = {};
  for (const part of name.split(',')) {
    const kv = part.split('=');
    if (kv.length !== 2) return null;
    const k = kv[0].trim(), v = kv[1].trim();
    if (!k || !v) return null;
    out[k] = v;
  }
  return out;
}

function createFigma(opts = {}) {
  const MIXED = Symbol('figma.mixed');
  const FONTS = DEFAULT_FONTS.concat(opts.extraFonts || []);
  const fontKey = (f) => `${f.family}\u0000${f.style}`;
  const AVAILABLE = new Set(FONTS.map(([family, style]) => fontKey({ family, style })));

  const ctx = {
    seq: 2, keySeq: 1, styleSeq: 1,
    nodes: new Map(), styles: new Map(), collections: new Map(), variables: new Map(),
    loadedFonts: new Set(), warnings: [], pending: [], notifications: [], printed: 0,
    sourceFile: opts.sourceFile || null, lineOffset: opts.lineOffset || 0,
    mixed: MIXED, currentPage: null, root: null, closed: false,
  };
  ctx.nextId = () => `1:${ctx.seq++}`;

  const fmt = (v) => {
    if (typeof v === 'string') return JSON.stringify(v);
    if (v === MIXED) return 'figma.mixed';
    if (v && v._type) return v._label();
    return util.inspect(v, { depth: 3, breakLength: Infinity });
  };

  /* ---------- source locations for warnings ---------- */
  function userLoc(stack) {
    if (!ctx.sourceFile || !stack) return '';
    for (const line of String(stack).split('\n')) {
      const i = line.lastIndexOf(ctx.sourceFile + ':');
      if (i < 0) continue;
      const m = /:(\d+):(\d+)\)?\s*$/.exec(line.slice(i + ctx.sourceFile.length));
      if (m) return `line ${Number(m[1]) - ctx.lineOffset}:${m[2]}`;
    }
    return '';
  }
  ctx.userLoc = userLoc;
  function warn(msg) {
    const loc = userLoc(new Error().stack);
    ctx.warnings.push(loc ? `${msg} (${loc})` : msg);
  }
  ctx.warn = warn;

  /* ---------- promises: track which ones were never awaited ---------- */
  class TrackedPromise extends Promise {
    static get [Symbol.species]() { return Promise; }
    then(a, b) { this._used = true; return super.then(a, b); }
  }
  function track(label, fn) {
    const loc = userLoc(new Error().stack);
    const p = (async () => { await null; return fn(); })();
    const tp = new TrackedPromise((res, rej) => p.then(res, rej));
    ctx.pending.push({ tp, label, loc });
    return tp;
  }

  /* ---------- validators ---------- */
  const num = (v, what, o = {}) => {
    if (v === null && o.nullable) return null;
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${what}: expected a finite number, got ${fmt(v)}`);
    if (o.min != null && v < o.min) fail(`${what}: expected a value >= ${o.min}, got ${v}`);
    if (o.max != null && v > o.max) fail(`${what}: expected a value <= ${o.max}, got ${v}`);
    return v;
  };
  const oneOf = (v, list, what, hint = '') => {
    if (!list.includes(v)) fail(`${what}: expected one of ${list.map((x) => `'${x}'`).join(' | ')}, got ${fmt(v)}${hint}`);
    return v;
  };
  const bool = (v, what) => { if (typeof v !== 'boolean') fail(`${what}: expected a boolean, got ${fmt(v)}`); return v; };
  const str = (v, what) => { if (typeof v !== 'string') fail(`${what}: expected a string, got ${fmt(v)}`); return v; };

  function checkColor(c, at, mode) {
    if (!isObj(c)) fail(`${at}: expected a color object { r, g, b${mode === 'rgb' ? '' : ', a'} }, got ${fmt(c)}`);
    for (const k of Object.keys(c)) {
      if (k === 'a' && mode === 'rgb') fail(`${at}: unexpected key "a". A SOLID paint color is { r, g, b } only; put alpha in the paint's "opacity"`);
      if (!['r', 'g', 'b', 'a'].includes(k)) fail(`${at}: unexpected key "${k}" in color`);
    }
    for (const k of mode === 'rgb' ? ['r', 'g', 'b'] : ['r', 'g', 'b', 'a']) {
      if (!(k in c)) {
        if (k === 'a' && mode === 'rgbOptA') continue;
        fail(`${at}: missing "${k}" in color${k === 'a' ? ' (this color needs alpha: { r, g, b, a })' : ''}`);
      }
      const v = c[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) fail(`${at}.${k}: expected a number in 0..1, got ${fmt(v)}${v > 1 ? ' (colors are 0..1, not 0..255)' : ''}`);
    }
  }
  function checkAlias(a, at, type) {
    if (!isObj(a) || a.type !== 'VARIABLE_ALIAS' || typeof a.id !== 'string') fail(`${at}: expected { type: 'VARIABLE_ALIAS', id }, got ${fmt(a)}`);
    const v = ctx.variables.get(a.id);
    if (!v) fail(`${at}: variable "${a.id}" does not exist`);
    if (type && v._p.resolvedType !== type) fail(`${at}: variable "${v._p.name}" is ${v._p.resolvedType}, expected ${type}`);
  }
  function checkPaints(v, what) {
    if (v === MIXED) fail(`${what}: cannot assign figma.mixed`);
    if (!Array.isArray(v)) fail(`${what}: must be an array of paints, e.g. [{ type: 'SOLID', color: { r, g, b } }], got ${fmt(v)}`);
    return v.map((p, i) => {
      const at = `${what}[${i}]`;
      if (!isObj(p)) fail(`${at}: expected a paint object, got ${fmt(p)}`);
      const keys = PAINT_KEYS[p.type];
      if (!keys) fail(`${at}.type: unknown paint type ${fmt(p.type)}`);
      for (const k of Object.keys(p)) if (!keys.includes(k)) fail(`${at}: unexpected key "${k}" on a ${p.type} paint`);
      if (p.type === 'SOLID') checkColor(p.color, `${at}.color`, 'rgb');
      if (p.type.startsWith('GRADIENT_')) {
        if (!Array.isArray(p.gradientStops) || !p.gradientStops.length) fail(`${at}.gradientStops: expected a non-empty array`);
        p.gradientStops.forEach((s, j) => { num(s.position, `${at}.gradientStops[${j}].position`, { min: 0, max: 1 }); checkColor(s.color, `${at}.gradientStops[${j}].color`, 'rgba'); });
        const t = p.gradientTransform;
        if (!Array.isArray(t) || t.length !== 2 || !t.every((r) => Array.isArray(r) && r.length === 3 && r.every((x) => Number.isFinite(x)))) fail(`${at}.gradientTransform: expected a 2x3 matrix [[a,b,c],[d,e,f]]`);
      }
      if (p.type === 'IMAGE' && typeof p.imageHash !== 'string' && p.imageHash !== null) fail(`${at}.imageHash: expected a string`);
      if ('opacity' in p) num(p.opacity, `${at}.opacity`, { min: 0, max: 1 });
      if ('visible' in p) bool(p.visible, `${at}.visible`);
      if ('boundVariables' in p) {
        if (!isObj(p.boundVariables)) fail(`${at}.boundVariables: expected an object`);
        for (const [k, a] of Object.entries(p.boundVariables)) {
          if (k !== 'color') fail(`${at}.boundVariables: only "color" can be bound on a paint, got "${k}"`);
          checkAlias(a, `${at}.boundVariables.color`, 'COLOR');
        }
      }
      return dc(p);
    });
  }
  function checkEffects(v, what) {
    if (!Array.isArray(v)) fail(`${what}: must be an array of effects, got ${fmt(v)}`);
    return v.map((e, i) => {
      const at = `${what}[${i}]`;
      if (!isObj(e)) fail(`${at}: expected an effect object, got ${fmt(e)}`);
      const keys = EFFECT_KEYS[e.type];
      if (!keys) fail(`${at}.type: unknown effect type ${fmt(e.type)}`);
      for (const k of Object.keys(e)) if (!keys.includes(k)) fail(`${at}: unexpected key "${k}" on a ${e.type} effect`);
      num(e.radius, `${at}.radius`, { min: 0 });
      if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
        checkColor(e.color, `${at}.color`, 'rgba');
        if (!isObj(e.offset)) fail(`${at}.offset: expected { x, y }, got ${fmt(e.offset)}`);
        num(e.offset.x, `${at}.offset.x`); num(e.offset.y, `${at}.offset.y`);
        if ('spread' in e) num(e.spread, `${at}.spread`);
        if (!('blendMode' in e)) warn(`${at}: shadow without blendMode (Figma may reject it; add blendMode: 'NORMAL')`);
      }
      if ('visible' in e) bool(e.visible, `${at}.visible`);
      else warn(`${at}: effect without "visible" (add visible: true)`);
      return dc(e);
    });
  }
  function checkFont(f, what) {
    if (f === MIXED) fail(`${what}: got figma.mixed (the text uses several fonts; use getRangeFontName or getStyledTextSegments)`);
    if (!isObj(f) || typeof f.family !== 'string' || typeof f.style !== 'string') fail(`${what}: expected { family, style }, got ${fmt(f)}`);
    for (const k of Object.keys(f)) if (k !== 'family' && k !== 'style') fail(`${what}: unexpected key "${k}" in fontName`);
    return { family: f.family, style: f.style };
  }
  function checkLineHeight(v, what) {
    if (typeof v === 'number') fail(`${what}: must be an object like { unit: 'PIXELS', value: ${v} } or { unit: 'AUTO' }, got the bare number ${v}`);
    if (!isObj(v)) fail(`${what}: expected { unit, value }, got ${fmt(v)}`);
    oneOf(v.unit, ['PIXELS', 'PERCENT', 'AUTO'], `${what}.unit`);
    if (v.unit === 'AUTO') return { unit: 'AUTO' };
    return { unit: v.unit, value: num(v.value, `${what}.value`, { min: 0 }) };
  }
  function checkLetterSpacing(v, what) {
    if (typeof v === 'number') fail(`${what}: must be an object like { unit: 'PIXELS', value: ${v} }, got the bare number ${v}`);
    if (!isObj(v)) fail(`${what}: expected { unit, value }, got ${fmt(v)}`);
    oneOf(v.unit, ['PIXELS', 'PERCENT'], `${what}.unit`);
    return { unit: v.unit, value: num(v.value, `${what}.value`) };
  }
  const isLoaded = (f) => ctx.loadedFonts.has(fontKey(f));
  const requireFont = (f, kind = 'node') => {
    if (!isLoaded(f)) fail(`Cannot write to ${kind} with unloaded font "${f.family} ${f.style}". Call await figma.loadFontAsync({ family: "${f.family}", style: "${f.style}" }) first`);
  };
  const dyn = (bad, good) => fail(`Cannot call ${bad} with documentAccess: dynamic-page. Use ${good} instead`);

  /* ---------- nodes ---------- */
  const DEFAULT_NAMES = { FRAME: 'Frame', COMPONENT: 'Component', COMPONENT_SET: 'Component Set', INSTANCE: 'Instance', TEXT: 'Text', RECTANGLE: 'Rectangle', ELLIPSE: 'Ellipse', VECTOR: 'Vector', LINE: 'Line', GROUP: 'Group', PAGE: 'Page', POLYGON: 'Polygon', STAR: 'Star', DOCUMENT: 'Document' };
  const WHITE = () => [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  const GRAY = () => [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
  const BLACK = () => [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

  function markRemoved(n) {
    n._removed = true;
    ctx.nodes.delete(n._id);
    for (const k of n._kids || []) markRemoved(k);
  }
  const componentAncestor = (n) => { for (let a = n; a; a = a._parent) if (a._type === 'COMPONENT' || a._type === 'COMPONENT_SET') return a; return null; };
  const ownerOf = (comp) => (comp._parent && comp._parent._type === 'COMPONENT_SET' ? comp._parent : comp);

  class BaseNode {
    constructor(type, defaults = {}) {
      this._type = type;
      this._id = type === 'DOCUMENT' ? '0:0' : type === 'PAGE' ? `0:${ctx.seq++}` : ctx.nextId();
      this._parent = null; this._removed = false; this._inInstance = false; this._kids = null;
      this._p = Object.assign({
        name: DEFAULT_NAMES[type] || type, visible: true, locked: false, opacity: 1, x: 0, y: 0, w: 100, h: 100, rotation: 0,
        layoutAlign: 'INHERIT', layoutGrow: 0, layoutPositioning: 'AUTO', minWidth: null, maxWidth: null, minHeight: null, maxHeight: null,
        constraints: { horizontal: 'MIN', vertical: 'MIN' }, blendMode: 'PASS_THROUGH', isMask: false,
      }, defaults);
      this._bound = {}; this._plugin = {}; this._shared = {}; this._cpr = null;
      const proxy = wrap(this);
      ctx.nodes.set(this._id, proxy);
      return proxy;
    }
    _label() { return `${this._type} "${this._p.name}" (${this._id})`; }
    toString() { return `[${this._type} "${this._p && this._p.name}" ${this._id}]`; }
    [util.inspect.custom]() { return this.toString(); }
    _isAL() { return false; }

    get id() { return this._id; }
    get type() { return this._type; }
    get parent() { return this._parent; }
    get removed() { return this._removed; }
    get name() { return this._p.name; }
    set name(v) { this._p.name = str(v, `name on ${this._label()}`); }
    get visible() { return this._p.visible; }
    set visible(v) { this._p.visible = bool(v, `visible on ${this._label()}`); }
    get locked() { return this._p.locked; }
    set locked(v) { this._p.locked = bool(v, `locked on ${this._label()}`); }
    get opacity() { return this._p.opacity; }
    set opacity(v) { this._p.opacity = num(v, `opacity on ${this._label()}`, { min: 0, max: 1 }); }
    get x() { return this._p.x; }
    set x(v) { this._p.x = num(v, `x on ${this._label()}`); }
    get y() { return this._p.y; }
    set y(v) { this._p.y = num(v, `y on ${this._label()}`); }
    get rotation() { return this._p.rotation; }
    set rotation(v) { this._p.rotation = num(v, `rotation on ${this._label()}`); }
    get blendMode() { return this._p.blendMode; }
    set blendMode(v) { this._p.blendMode = str(v, 'blendMode'); }
    get isMask() { return this._p.isMask; }
    set isMask(v) { this._p.isMask = bool(v, 'isMask'); }
    get width() { return this._size(true); }
    get height() { return this._size(false); }
    get absoluteBoundingBox() {
      let x = 0, y = 0;
      for (let a = this; a && a._type !== 'PAGE'; a = a._parent) { x += a._p.x; y += a._p.y; }
      return { x, y, width: this.width, height: this.height };
    }
    get absoluteRenderBounds() { return this.absoluteBoundingBox; }
    get absoluteTransform() { const b = this.absoluteBoundingBox; return [[1, 0, b.x], [0, 1, b.y]]; }
    get relativeTransform() { return [[1, 0, this._p.x], [0, 1, this._p.y]]; }
    set relativeTransform(m) {
      if (!Array.isArray(m) || m.length !== 2) fail('relativeTransform: expected a 2x3 matrix');
      this._p.x = num(m[0][2], 'relativeTransform[0][2]'); this._p.y = num(m[1][2], 'relativeTransform[1][2]');
    }
    get constraints() { return dc(this._p.constraints); }
    set constraints(v) {
      if (!isObj(v)) fail(`constraints: expected { horizontal, vertical }, got ${fmt(v)}`);
      const L = ['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE'];
      this._p.constraints = { horizontal: oneOf(v.horizontal, L, 'constraints.horizontal'), vertical: oneOf(v.vertical, L, 'constraints.vertical') };
    }

    /* layout-child properties */
    get layoutAlign() { return this._p.layoutAlign; }
    set layoutAlign(v) { this._p.layoutAlign = oneOf(v, ['MIN', 'CENTER', 'MAX', 'STRETCH', 'INHERIT'], `layoutAlign on ${this._label()}`); }
    get layoutGrow() { return this._p.layoutGrow; }
    set layoutGrow(v) { this._p.layoutGrow = num(v, `layoutGrow on ${this._label()}`, { min: 0, max: 1 }); }
    get layoutPositioning() { return this._p.layoutPositioning; }
    set layoutPositioning(v) {
      oneOf(v, ['AUTO', 'ABSOLUTE'], `layoutPositioning on ${this._label()}`);
      if (v === 'ABSOLUTE' && !(this._parent && this._parent._isAL())) fail(`layoutPositioning = 'ABSOLUTE' can only be set on children of auto-layout frames (${this._label()})`);
      this._p.layoutPositioning = v;
    }
    get minWidth() { return this._p.minWidth; }
    set minWidth(v) { this._p.minWidth = num(v, 'minWidth', { nullable: true, min: 0 }); }
    get maxWidth() { return this._p.maxWidth; }
    set maxWidth(v) { this._p.maxWidth = num(v, 'maxWidth', { nullable: true, min: 0 }); }
    get minHeight() { return this._p.minHeight; }
    set minHeight(v) { this._p.minHeight = num(v, 'minHeight', { nullable: true, min: 0 }); }
    get maxHeight() { return this._p.maxHeight; }
    set maxHeight(v) { this._p.maxHeight = num(v, 'maxHeight', { nullable: true, min: 0 }); }
    get layoutSizingHorizontal() { return this._sizing(true); }
    set layoutSizingHorizontal(v) { this._setSizing(true, v); }
    get layoutSizingVertical() { return this._sizing(false); }
    set layoutSizingVertical(v) { this._setSizing(false, v); }

    _inFlow() { return !!(this._parent && this._parent._isAL() && this._p.layoutPositioning !== 'ABSOLUTE'); }
    _sizing(horiz) {
      if (this._inFlow()) {
        const primH = this._parent._p.layoutMode === 'HORIZONTAL';
        if (horiz === primH ? this._p.layoutGrow > 0 : this._p.layoutAlign === 'STRETCH') return 'FILL';
      }
      return this._ownSizing(horiz);
    }
    _ownSizing() { return 'FIXED'; }
    _setOwnAxis() {}
    _clearFill(horiz) {
      if (!this._inFlow()) return;
      const primH = this._parent._p.layoutMode === 'HORIZONTAL';
      if (horiz === primH) this._p.layoutGrow = 0; else if (this._p.layoutAlign === 'STRETCH') this._p.layoutAlign = 'INHERIT';
    }
    _setSizing(horiz, v) {
      const what = `layoutSizing${horiz ? 'Horizontal' : 'Vertical'} on ${this._label()}`;
      oneOf(v, ['FIXED', 'HUG', 'FILL'], what);
      const key = horiz ? 'w' : 'h';
      if (v === 'FILL') {
        if (!this._inFlow()) fail(`FILL can only be set on children of auto-layout frames (${what}; parent is ${this._parent ? this._parent._label() + (this._parent._isAL && this._parent._isAL() ? '' : ' with layoutMode NONE') : 'none'})`);
        const primH = this._parent._p.layoutMode === 'HORIZONTAL';
        if (horiz === primH) this._p.layoutGrow = 1; else this._p.layoutAlign = 'STRETCH';
        this._afterFill(horiz);
        return;
      }
      if (v === 'HUG') {
        if (this._isAL()) { this._clearFill(horiz); this._setOwnAxis(horiz, 'AUTO'); return; }
        if (this._type === 'TEXT' && this._inFlow()) { this._clearFill(horiz); this._textHug(horiz); return; }
        fail(`HUG can only be set on auto-layout frames or on TEXT children of auto-layout frames (${what})`);
      }
      const cur = this._size(horiz);
      this._clearFill(horiz);
      if (this._isAL()) this._setOwnAxis(horiz, 'FIXED');
      if (this._type === 'TEXT') this._textFixed(horiz);
      this._p[key] = cur;
    }
    _afterFill() {}
    _hug(horiz) { return this._p[horiz ? 'w' : 'h']; }
    _size(horiz) {
      const s = this._sizing(horiz);
      let v = this._p[horiz ? 'w' : 'h'];
      if (s === 'FILL') { const f = this._parent._fillSize(this, horiz); if (f != null) v = f; }
      else if (s === 'HUG') v = this._hug(horiz);
      const mn = this._p[horiz ? 'minWidth' : 'minHeight'], mx = this._p[horiz ? 'maxWidth' : 'maxHeight'];
      if (mx != null) v = Math.min(v, mx);
      if (mn != null) v = Math.max(v, mn);
      return v;
    }
    _checkResize(w, h) {
      num(w, `resize width on ${this._label()}`); num(h, `resize height on ${this._label()}`);
      if (w < 0.01) fail(`in resize: Expected "width" to have value >= 0.01, got ${w} (${this._label()})`);
      if (h < 0.01 && !(this._type === 'LINE' && h === 0)) fail(`in resize: Expected "height" to have value >= 0.01, got ${h} (${this._label()})`);
    }
    resize(w, h) {
      this._checkResize(w, h);
      for (const horiz of [true, false]) {
        this._clearFill(horiz);
        if (this._isAL()) this._setOwnAxis(horiz, 'FIXED');
      }
      this._p.w = w; this._p.h = h;
    }
    resizeWithoutConstraints(w, h) { this.resize(w, h); }
    rescale(s) { num(s, 'rescale', { min: 0.01 }); this._p.w *= s; this._p.h *= s; }

    /* plugin data */
    setPluginData(k, v) { this._plugin[str(k, 'setPluginData key')] = str(v, 'setPluginData value'); }
    getPluginData(k) { return this._plugin[k] || ''; }
    getPluginDataKeys() { return Object.keys(this._plugin); }
    setSharedPluginData(ns, k, v) { str(ns, 'namespace'); this._shared[`${ns}.${str(k, 'key')}`] = str(v, 'value'); }
    getSharedPluginData(ns, k) { return this._shared[`${ns}.${k}`] || ''; }
    getSharedPluginDataKeys(ns) { return Object.keys(this._shared).filter((k) => k.startsWith(ns + '.')).map((k) => k.slice(ns.length + 1)); }
    setRelaunchData() {}
    getRelaunchData() { return {}; }

    /* variables */
    get boundVariables() {
      const out = dc(this._bound);
      for (const f of ['fills', 'strokes']) {
        const list = (this._p[f] || []).map((p) => p.boundVariables && p.boundVariables.color).filter(Boolean);
        if (list.length) out[f] = dc(list);
      }
      return out;
    }
    setBoundVariable(field, variable) {
      str(field, 'setBoundVariable field');
      if (field === 'fills' || field === 'strokes' || field === 'effects') fail(`setBoundVariable("${field}") is not supported: build the paint with figma.variables.setBoundVariableForPaint(paint, 'color', variable) and assign node.${field} = [paint]`);
      if (field === 'cornerRadius') {
        warn(`setBoundVariable('cornerRadius') on ${this._label()}: bind topLeftRadius/topRightRadius/bottomLeftRadius/bottomRightRadius individually`);
        for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) this.setBoundVariable(c, variable);
        return;
      }
      const type = BINDABLE[field];
      if (!type) fail(`setBoundVariable: "${field}" is not a bindable field (bindable: ${Object.keys(BINDABLE).join(', ')})`);
      if (variable === null || variable === undefined) { delete this._bound[field]; return; }
      if (!variable || !variable._isVariable) fail(`setBoundVariable("${field}"): expected a Variable object (await figma.variables.getVariableByIdAsync(id)), got ${fmt(variable)}`);
      if (variable._removed) fail(`setBoundVariable("${field}"): variable "${variable._p.name}" was removed`);
      if (variable._p.resolvedType !== type) fail(`setBoundVariable("${field}"): needs a ${type} variable, "${variable._p.name}" is ${variable._p.resolvedType}`);
      this._bound[field] = { type: 'VARIABLE_ALIAS', id: variable._id };
      const val = variable._resolve();
      if (field === 'width') this._p.w = val;
      else if (field === 'height') this._p.h = val;
      else if (field === 'characters' && this._type === 'TEXT') this._p.characters = val;
      else if (field in this._p) this._p[field] = val;
    }

    /* component property references */
    get componentPropertyReferences() { return this._cpr ? dc(this._cpr) : null; }
    set componentPropertyReferences(v) {
      if (v === null) { this._cpr = null; return; }
      if (!isObj(v)) fail(`componentPropertyReferences: expected an object like { characters: key }, got ${fmt(v)}`);
      const need = { characters: 'TEXT', visible: 'BOOLEAN', mainComponent: 'INSTANCE_SWAP' };
      for (const k of Object.keys(v)) if (!need[k]) fail(`componentPropertyReferences: unknown field "${k}" (allowed: characters, visible, mainComponent)`);
      if (v.characters && this._type !== 'TEXT') warn(`componentPropertyReferences.characters on non-TEXT ${this._label()}`);
      if (v.mainComponent && this._type !== 'INSTANCE') warn(`componentPropertyReferences.mainComponent on non-INSTANCE ${this._label()}`);
      if (this._inInstance) warn(`componentPropertyReferences set on ${this._label()} which is inside an instance (set it on the main component's layer)`);
      const comp = componentAncestor(this._parent);
      if (!comp) warn(`componentPropertyReferences set on ${this._label()} which is not inside a COMPONENT (append it to the component first)`);
      else {
        const owner = comp._type === 'COMPONENT' ? ownerOf(comp) : comp;
        const defs = owner._allDefs();
        for (const [field, key] of Object.entries(v)) {
          const d = defs[key];
          if (!d) warn(`componentPropertyReferences.${field} = ${fmt(key)} on ${this._label()}: no such property on ${owner._label()} (has: ${Object.keys(defs).join(', ') || 'none'})`);
          else if (d.type !== need[field]) warn(`componentPropertyReferences.${field} = ${fmt(key)} is a ${d.type} property, expected ${need[field]}`);
        }
      }
      this._cpr = dc(v);
    }

    /* tree */
    remove() {
      if (this._type === 'DOCUMENT') fail('Cannot remove the document');
      if (this._inInstance) fail(`Cannot remove ${this._label()}: it is inside an instance (hide it with visible = false or a BOOLEAN property instead)`);
      const p = this._parent;
      if (p) { const i = p._kids.indexOf(this); if (i >= 0) p._kids.splice(i, 1); }
      this._parent = null;
      markRemoved(this);
    }
    _cloneRaw(inInst) {
      const C = this.constructor;
      const n = new C(this._type);
      n._p = dc(this._p); n._bound = dc(this._bound); n._plugin = dc(this._plugin); n._shared = dc(this._shared); n._cpr = dc(this._cpr);
      for (const k of Object.keys(this)) if (k[0] !== '_') n[k] = this[k];
      n._inInstance = inInst;
      if (this._ranges) n._ranges = dc(this._ranges);
      if (this._defs) n._defs = dc(this._defs);
      if (this._type === 'INSTANCE') { n._main = this._main; n._propValues = dc(this._propValues); n._snap = dc(this._snap); }
      if (this._kids) {
        const childIn = inInst || this._type === 'INSTANCE';
        n._kids = this._kids.map((k) => { const c = k._cloneRaw(childIn); c._parent = n; return c; });
      }
      return n;
    }
    clone() {
      if (this._type === 'PAGE' || this._type === 'DOCUMENT') fail(`mock: ${this._type}.clone() not implemented`);
      const n = this._cloneRaw(false);
      const p = this._parent;
      if (p && !p._inInstance && p._type !== 'INSTANCE') { p._kids.splice(p._kids.indexOf(this) + 1, 0, n); n._parent = p; }
      else ctx.currentPage.appendChild(n);
      return n;
    }
  }

  /* children-holding methods, mixed into FRAME-likes, GROUP, PAGE, DOCUMENT */
  const Container = {
    get children() { return this._kids.slice(); },
    appendChild(c) { this._canAdopt(c, 'appendChild'); this._insertAt(this._kids.length, c); },
    insertChild(i, c) {
      num(i, 'insertChild index');
      if (!Number.isInteger(i) || i < 0 || i > this._kids.length) fail(`insertChild: index ${i} out of range 0..${this._kids.length} on ${this._label()}`);
      this._canAdopt(c, 'insertChild'); this._insertAt(i, c);
    },
    _insertAt(i, c) {
      const old = c._parent;
      if (old) { const j = old._kids.indexOf(c); if (j >= 0) { old._kids.splice(j, 1); if (old === this && j < i) i--; } }
      this._kids.splice(i, 0, c);
      c._parent = this;
    },
    _canAdopt(c, op) {
      if (!c || typeof c !== 'object' || !c._type) fail(`${op}: expected a node, got ${fmt(c)}`);
      if (c._removed) fail(`${op}: the node with id "${c._id}" was removed`);
      if (this._type === 'DOCUMENT') { if (c._type !== 'PAGE') fail(`${op}: only PAGE nodes can be children of figma.root, got ${c._label()}`); return; }
      if (c._type === 'PAGE' || c._type === 'DOCUMENT') fail(`${op}: cannot put ${c._label()} inside ${this._label()}`);
      if (this._type === 'INSTANCE' || this._inInstance) fail(`Cannot move node. New parent is an instance or is inside of an instance (${op} ${c._label()} into ${this._label()})`);
      if (c._inInstance) fail(`Cannot move node. ${c._label()} is inside of an instance`);
      for (let a = this; a; a = a._parent) if (a === c) fail(`Cannot move node. New parent ${this._label()} is the node itself or one of its descendants`);
      if (this._type === 'COMPONENT_SET' && c._type !== 'COMPONENT') fail(`${op}: a COMPONENT_SET can only contain COMPONENT nodes, got ${c._label()}`);
      const hasComp = (n) => n._type === 'COMPONENT' || n._type === 'COMPONENT_SET' || (n._type !== 'INSTANCE' && (n._kids || []).some(hasComp));
      if (this._type === 'COMPONENT_SET') {
        if (componentAncestor(this._parent) || (c._kids || []).some(hasComp)) fail('Cannot move node. A component cannot contain another component or component set');
      } else if (componentAncestor(this) && hasComp(c)) {
        fail(`Cannot move node. ${c._label()} is or contains a component, and ${this._label()} is inside a component`);
      }
    },
    _walk(fn) { for (const k of this._kids) { if (fn(k) === false) return false; if (k._kids && k._walk(fn) === false) return false; } return true; },
    findAll(cb) {
      if (cb !== undefined && typeof cb !== 'function') fail('findAll: expected a callback function');
      const out = []; this._walk((n) => { if (!cb || cb(n)) out.push(n); }); return out;
    },
    findOne(cb) {
      if (typeof cb !== 'function') fail('findOne: expected a callback function');
      let hit = null; this._walk((n) => { if (cb(n)) { hit = n; return false; } return true; }); return hit;
    },
    findChildren(cb) { if (cb !== undefined && typeof cb !== 'function') fail('findChildren: expected a callback'); return this._kids.filter((n) => !cb || cb(n)); },
    findChild(cb) { if (typeof cb !== 'function') fail('findChild: expected a callback'); return this._kids.find((n) => cb(n)) || null; },
    findAllWithCriteria(c) {
      if (!isObj(c)) fail('findAllWithCriteria: expected { types: [...] }');
      if (c.types !== undefined && !Array.isArray(c.types)) fail('findAllWithCriteria: types must be an array');
      return this.findAll((n) => !c.types || c.types.includes(n._type));
    },
  };
  const mix = (Cls, obj) => { for (const k of Object.keys(Object.getOwnPropertyDescriptors(obj))) Object.defineProperty(Cls.prototype, k, Object.getOwnPropertyDescriptor(obj, k)); };

  class GeomNode extends BaseNode {
    constructor(type, defaults = {}) {
      super(type, Object.assign({
        fills: type === 'TEXT' ? BLACK() : ['RECTANGLE', 'ELLIPSE', 'VECTOR', 'POLYGON', 'STAR'].includes(type) ? GRAY() : [],
        strokes: type === 'LINE' ? BLACK() : [], effects: [], sw: { t: 1, r: 1, b: 1, l: 1 }, strokeAlign: type === 'LINE' || type === 'VECTOR' ? 'CENTER' : 'INSIDE',
        strokeCap: 'NONE', strokeJoin: 'MITER', dashPattern: [], radii: { tl: 0, tr: 0, br: 0, bl: 0 }, cornerSmoothing: 0,
        fillStyleId: '', strokeStyleId: '', effectStyleId: '', h: type === 'LINE' ? 0 : 100,
      }, defaults));
    }
    get fills() { return deepFreeze(dc(this._p.fills)); }
    set fills(v) { this._p.fills = checkPaints(v, `fills on ${this._label()}`); this._p.fillStyleId = ''; }
    get strokes() { return deepFreeze(dc(this._p.strokes)); }
    set strokes(v) { this._p.strokes = checkPaints(v, `strokes on ${this._label()}`); this._p.strokeStyleId = ''; }
    get effects() { return deepFreeze(dc(this._p.effects)); }
    set effects(v) { this._p.effects = checkEffects(v, `effects on ${this._label()}`); this._p.effectStyleId = ''; }
    get strokeWeight() { const s = this._p.sw; return s.t === s.r && s.r === s.b && s.b === s.l ? s.t : MIXED; }
    set strokeWeight(v) { num(v, `strokeWeight on ${this._label()}`, { min: 0 }); this._p.sw = { t: v, r: v, b: v, l: v }; }
    get strokeTopWeight() { return this._p.sw.t; }
    set strokeTopWeight(v) { this._p.sw.t = num(v, 'strokeTopWeight', { min: 0 }); }
    get strokeRightWeight() { return this._p.sw.r; }
    set strokeRightWeight(v) { this._p.sw.r = num(v, 'strokeRightWeight', { min: 0 }); }
    get strokeBottomWeight() { return this._p.sw.b; }
    set strokeBottomWeight(v) { this._p.sw.b = num(v, 'strokeBottomWeight', { min: 0 }); }
    get strokeLeftWeight() { return this._p.sw.l; }
    set strokeLeftWeight(v) { this._p.sw.l = num(v, 'strokeLeftWeight', { min: 0 }); }
    get strokeAlign() { return this._p.strokeAlign; }
    set strokeAlign(v) { this._p.strokeAlign = oneOf(v, ['INSIDE', 'OUTSIDE', 'CENTER'], `strokeAlign on ${this._label()}`); }
    get strokeCap() { return this._p.strokeCap; }
    set strokeCap(v) { this._p.strokeCap = oneOf(v, ['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL', 'DIAMOND_FILLED', 'TRIANGLE_FILLED', 'CIRCLE_FILLED'], 'strokeCap'); }
    get strokeJoin() { return this._p.strokeJoin; }
    set strokeJoin(v) { this._p.strokeJoin = oneOf(v, ['MITER', 'BEVEL', 'ROUND'], 'strokeJoin'); }
    get dashPattern() { return this._p.dashPattern.slice(); }
    set dashPattern(v) {
      if (!Array.isArray(v)) fail(`dashPattern: expected an array of numbers, got ${fmt(v)}`);
      this._p.dashPattern = v.map((x, i) => num(x, `dashPattern[${i}]`, { min: 0 }));
    }
    get cornerRadius() { const r = this._p.radii; return r.tl === r.tr && r.tr === r.br && r.br === r.bl ? r.tl : MIXED; }
    set cornerRadius(v) { num(v, `cornerRadius on ${this._label()}`, { min: 0 }); this._p.radii = { tl: v, tr: v, br: v, bl: v }; }
    get topLeftRadius() { return this._p.radii.tl; }
    set topLeftRadius(v) { this._p.radii.tl = num(v, 'topLeftRadius', { min: 0 }); }
    get topRightRadius() { return this._p.radii.tr; }
    set topRightRadius(v) { this._p.radii.tr = num(v, 'topRightRadius', { min: 0 }); }
    get bottomRightRadius() { return this._p.radii.br; }
    set bottomRightRadius(v) { this._p.radii.br = num(v, 'bottomRightRadius', { min: 0 }); }
    get bottomLeftRadius() { return this._p.radii.bl; }
    set bottomLeftRadius(v) { this._p.radii.bl = num(v, 'bottomLeftRadius', { min: 0 }); }
    get cornerSmoothing() { return this._p.cornerSmoothing; }
    set cornerSmoothing(v) { this._p.cornerSmoothing = num(v, 'cornerSmoothing', { min: 0, max: 1 }); }
    get fillStyleId() { return this._p.fillStyleId; }
    set fillStyleId(v) { dyn('setting node.fillStyleId', 'await node.setFillStyleIdAsync(id)'); }
    get strokeStyleId() { return this._p.strokeStyleId; }
    set strokeStyleId(v) { dyn('setting node.strokeStyleId', 'await node.setStrokeStyleIdAsync(id)'); }
    get effectStyleId() { return this._p.effectStyleId; }
    set effectStyleId(v) { dyn('setting node.effectStyleId', 'await node.setEffectStyleIdAsync(id)'); }
    _styleOf(id, type, op) {
      const s = ctx.styles.get(id);
      if (!s || s._type !== type) fail(`${op}: no local ${type} style with id ${fmt(id)}${id && id._type === undefined && isObj(id) ? ' (pass style.id, not the style)' : ''}`);
      return s;
    }
    setFillStyleIdAsync(id) { return track('node.setFillStyleIdAsync', () => { if (id === '') { this._p.fillStyleId = ''; return; } const s = this._styleOf(id, 'PAINT', 'setFillStyleIdAsync'); this._p.fills = dc(s._p.paints); this._p.fillStyleId = id; }); }
    setStrokeStyleIdAsync(id) { return track('node.setStrokeStyleIdAsync', () => { if (id === '') { this._p.strokeStyleId = ''; return; } const s = this._styleOf(id, 'PAINT', 'setStrokeStyleIdAsync'); this._p.strokes = dc(s._p.paints); this._p.strokeStyleId = id; }); }
    setEffectStyleIdAsync(id) { return track('node.setEffectStyleIdAsync', () => { if (id === '') { this._p.effectStyleId = ''; return; } const s = this._styleOf(id, 'EFFECT', 'setEffectStyleIdAsync'); this._p.effects = dc(s._p.effects); this._p.effectStyleId = id; }); }
  }

  class FrameNode extends GeomNode {
    constructor(type = 'FRAME', defaults = {}) {
      super(type, Object.assign({
        fills: type === 'FRAME' || type === 'COMPONENT' ? WHITE() : [],
        layoutMode: 'NONE', primaryAxisSizingMode: 'AUTO', counterAxisSizingMode: 'FIXED', primaryAxisAlignItems: 'MIN', counterAxisAlignItems: 'MIN',
        counterAxisAlignContent: 'AUTO', itemSpacing: 0, counterAxisSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
        layoutWrap: 'NO_WRAP', clipsContent: true, itemReverseZIndex: false, strokesIncludedInLayout: false, layoutGrids: [], guides: [],
      }, defaults));
      this._kids = [];
    }
    _isAL() { return this._p.layoutMode === 'HORIZONTAL' || this._p.layoutMode === 'VERTICAL'; }
    get layoutMode() { return this._p.layoutMode; }
    set layoutMode(v) { this._p.layoutMode = oneOf(v, ['NONE', 'HORIZONTAL', 'VERTICAL', 'GRID'], `layoutMode on ${this._label()}`); }
    get primaryAxisSizingMode() { return this._p.primaryAxisSizingMode; }
    set primaryAxisSizingMode(v) { this._setAxisMode('primaryAxisSizingMode', v); }
    get counterAxisSizingMode() { return this._p.counterAxisSizingMode; }
    set counterAxisSizingMode(v) { this._setAxisMode('counterAxisSizingMode', v); }
    _setAxisMode(prop, v) {
      oneOf(v, ['FIXED', 'AUTO'], `${prop} on ${this._label()}`, v === 'HUG' ? " ('HUG' is only for layoutSizingHorizontal/Vertical; use 'AUTO')" : '');
      if (v === 'FIXED' && this._isAL()) {
        const horiz = (prop === 'primaryAxisSizingMode') === (this._p.layoutMode === 'HORIZONTAL');
        this._p[horiz ? 'w' : 'h'] = this._size(horiz);
      }
      this._p[prop] = v;
    }
    _setOwnAxis(horiz, mode) {
      if (!this._isAL()) return;
      const primH = this._p.layoutMode === 'HORIZONTAL';
      this._p[horiz === primH ? 'primaryAxisSizingMode' : 'counterAxisSizingMode'] = mode;
    }
    _ownSizing(horiz) {
      if (!this._isAL()) return 'FIXED';
      const primH = this._p.layoutMode === 'HORIZONTAL';
      return this._p[horiz === primH ? 'primaryAxisSizingMode' : 'counterAxisSizingMode'] === 'AUTO' ? 'HUG' : 'FIXED';
    }
    _afterFill(horiz) { if (this._isAL()) this._setOwnAxis(horiz, 'FIXED'); }
    _flow() { return this._kids.filter((k) => k._p.visible && k._p.layoutPositioning !== 'ABSOLUTE'); }
    _gaps(n) { return this._p.primaryAxisAlignItems === 'SPACE_BETWEEN' ? 0 : this._p.itemSpacing * Math.max(0, n - 1); }
    _pad(horiz) { return horiz ? this._p.paddingLeft + this._p.paddingRight : this._p.paddingTop + this._p.paddingBottom; }
    _hug(horiz) {
      if (!this._isAL()) return this._p[horiz ? 'w' : 'h'];
      const primH = this._p.layoutMode === 'HORIZONTAL', flow = this._flow();
      if (horiz === primH) return flow.reduce((s, k) => s + k._size(horiz), 0) + this._gaps(flow.length) + this._pad(horiz);
      return flow.reduce((m, k) => Math.max(m, k._size(horiz)), 0) + this._pad(horiz);
    }
    _fillSize(child, horiz) {
      if (!this._isAL() || this._sizing(horiz) === 'HUG') return null;
      const inner = this._size(horiz) - this._pad(horiz);
      if (horiz !== (this._p.layoutMode === 'HORIZONTAL')) return Math.max(0, inner);
      const flow = this._flow();
      let fixed = 0, nFill = 0;
      for (const k of flow) { if (k._sizing(horiz) === 'FILL') nFill++; else fixed += k._size(horiz); }
      return Math.max(0, (inner - fixed - this._gaps(flow.length)) / Math.max(1, nFill));
    }
    get primaryAxisAlignItems() { return this._p.primaryAxisAlignItems; }
    set primaryAxisAlignItems(v) { this._p.primaryAxisAlignItems = oneOf(v, ['MIN', 'MAX', 'CENTER', 'SPACE_BETWEEN'], `primaryAxisAlignItems on ${this._label()}`); }
    get counterAxisAlignItems() { return this._p.counterAxisAlignItems; }
    set counterAxisAlignItems(v) { this._p.counterAxisAlignItems = oneOf(v, ['MIN', 'MAX', 'CENTER', 'BASELINE'], `counterAxisAlignItems on ${this._label()}`, v === 'STRETCH' ? ' (to stretch children set child.layoutSizingHorizontal/Vertical = "FILL")' : ''); }
    get counterAxisAlignContent() { return this._p.counterAxisAlignContent; }
    set counterAxisAlignContent(v) { this._p.counterAxisAlignContent = oneOf(v, ['AUTO', 'SPACE_BETWEEN'], 'counterAxisAlignContent'); }
    get itemSpacing() { return this._p.itemSpacing; }
    set itemSpacing(v) { this._p.itemSpacing = num(v, `itemSpacing on ${this._label()}`); }
    get counterAxisSpacing() { return this._p.counterAxisSpacing; }
    set counterAxisSpacing(v) { this._p.counterAxisSpacing = num(v, 'counterAxisSpacing', { nullable: true }); }
    get paddingLeft() { return this._p.paddingLeft; }
    set paddingLeft(v) { this._p.paddingLeft = num(v, `paddingLeft on ${this._label()}`, { min: 0 }); }
    get paddingRight() { return this._p.paddingRight; }
    set paddingRight(v) { this._p.paddingRight = num(v, `paddingRight on ${this._label()}`, { min: 0 }); }
    get paddingTop() { return this._p.paddingTop; }
    set paddingTop(v) { this._p.paddingTop = num(v, `paddingTop on ${this._label()}`, { min: 0 }); }
    get paddingBottom() { return this._p.paddingBottom; }
    set paddingBottom(v) { this._p.paddingBottom = num(v, `paddingBottom on ${this._label()}`, { min: 0 }); }
    get horizontalPadding() { return this._p.paddingLeft; }
    set horizontalPadding(v) { this.paddingLeft = v; this.paddingRight = v; }
    get verticalPadding() { return this._p.paddingTop; }
    set verticalPadding(v) { this.paddingTop = v; this.paddingBottom = v; }
    get layoutWrap() { return this._p.layoutWrap; }
    set layoutWrap(v) {
      oneOf(v, ['NO_WRAP', 'WRAP'], 'layoutWrap');
      if (v === 'WRAP' && this._p.layoutMode !== 'HORIZONTAL') warn(`layoutWrap = 'WRAP' on ${this._label()} whose layoutMode is ${this._p.layoutMode} (wrap only works with HORIZONTAL)`);
      this._p.layoutWrap = v;
    }
    get clipsContent() { return this._p.clipsContent; }
    set clipsContent(v) { this._p.clipsContent = bool(v, `clipsContent on ${this._label()}`); }
    get itemReverseZIndex() { return this._p.itemReverseZIndex; }
    set itemReverseZIndex(v) { this._p.itemReverseZIndex = bool(v, 'itemReverseZIndex'); }
    get strokesIncludedInLayout() { return this._p.strokesIncludedInLayout; }
    set strokesIncludedInLayout(v) { this._p.strokesIncludedInLayout = bool(v, 'strokesIncludedInLayout'); }
    get layoutGrids() { return dc(this._p.layoutGrids); }
    set layoutGrids(v) { if (!Array.isArray(v)) fail('layoutGrids: expected an array'); this._p.layoutGrids = dc(v); }
  }
  mix(FrameNode, Container);

  /* component properties shared by COMPONENT and COMPONENT_SET */
  function addProp(owner, name, type, defaultValue, options) {
    str(name, 'addComponentProperty name');
    oneOf(type, ['TEXT', 'BOOLEAN', 'INSTANCE_SWAP', 'VARIANT'], 'addComponentProperty type');
    if (type === 'TEXT' && typeof defaultValue !== 'string') fail(`addComponentProperty("${name}", 'TEXT'): default value must be a string, got ${fmt(defaultValue)}`);
    if (type === 'BOOLEAN' && typeof defaultValue !== 'boolean') fail(`addComponentProperty("${name}", 'BOOLEAN'): default value must be a boolean, got ${fmt(defaultValue)}`);
    if (type === 'INSTANCE_SWAP') {
      const c = ctx.nodes.get(defaultValue);
      if (!c || c._type !== 'COMPONENT') fail(`addComponentProperty("${name}", 'INSTANCE_SWAP'): default value must be the id of an existing COMPONENT, got ${fmt(defaultValue)}`);
    }
    const def = { type, defaultValue };
    if (options !== undefined) {
      if (!isObj(options)) fail('addComponentProperty options: expected { preferredValues }');
      if (options.preferredValues) {
        if (type !== 'INSTANCE_SWAP') fail('addComponentProperty: preferredValues is only for INSTANCE_SWAP');
        if (!Array.isArray(options.preferredValues)) fail('preferredValues: expected an array of { type, key }');
        options.preferredValues.forEach((pv, i) => { if (!isObj(pv) || !['COMPONENT', 'COMPONENT_SET'].includes(pv.type) || typeof pv.key !== 'string') fail(`preferredValues[${i}]: expected { type: 'COMPONENT' | 'COMPONENT_SET', key: component.key }`); });
        def.preferredValues = dc(options.preferredValues);
      }
    }
    const all = owner._allDefs();
    if (Object.keys(all).some((k) => k.split('#')[0] === name)) warn(`addComponentProperty: ${owner._label()} already has a property named "${name}"`);
    const key = `${name}#${ctx.keySeq++}:0`;
    owner._defs[key] = def;
    return key;
  }
  function renameRefs(root, from, to) {
    const visit = (n) => { if (n._cpr) for (const f of Object.keys(n._cpr)) if (n._cpr[f] === from) { if (to) n._cpr[f] = to; else delete n._cpr[f]; } for (const k of n._kids || []) if (k._type !== 'INSTANCE' || true) visit(k); };
    visit(root);
  }
  function editProp(owner, key, nv) {
    const d = owner._defs[key];
    if (!d) fail(`editComponentProperty: property "${key}" not found on ${owner._label()}`);
    if (!isObj(nv)) fail('editComponentProperty: expected { name?, defaultValue?, preferredValues? }');
    if ('defaultValue' in nv) d.defaultValue = nv.defaultValue;
    if ('preferredValues' in nv) d.preferredValues = dc(nv.preferredValues);
    if (nv.name && nv.name !== key.split('#')[0]) {
      const nk = `${nv.name}#${key.split('#')[1]}`;
      delete owner._defs[key]; owner._defs[nk] = d; renameRefs(owner, key, nk);
      return nk;
    }
    return key;
  }

  class ComponentNode extends FrameNode {
    constructor() { super('COMPONENT'); this._defs = {}; this._key = Math.random().toString(16).slice(2, 14); this._p.description = ''; }
    get key() { return this._key; }
    get remote() { return false; }
    get description() { return this._p.description; }
    set description(v) { this._p.description = str(v, 'description'); }
    _inSet() { return !!(this._parent && this._parent._type === 'COMPONENT_SET'); }
    _allDefs() { return this._defs; }
    get componentPropertyDefinitions() {
      if (this._inSet()) fail(`Can only get component property definitions of a component set or non-variant component: ${this._label()} is a variant inside ${this._parent._label()}; read the set's componentPropertyDefinitions`);
      return dc(this._defs);
    }
    get variantProperties() { return this._inSet() ? parseVariant(this._p.name) : null; }
    addComponentProperty(name, type, defaultValue, options) {
      if (this._inSet()) fail(`Cannot add a component property to ${this._label()}: it is a variant inside ${this._parent._label()}. Call addComponentProperty on the COMPONENT_SET instead`);
      if (type === 'VARIANT') fail(`addComponentProperty("${name}", 'VARIANT'): VARIANT properties can only be added to a COMPONENT_SET (use figma.combineAsVariants)`);
      return addProp(this, name, type, defaultValue, options);
    }
    editComponentProperty(key, nv) { if (this._inSet()) fail('editComponentProperty: call it on the COMPONENT_SET'); return editProp(this, key, nv); }
    deleteComponentProperty(key) {
      if (this._inSet()) fail('deleteComponentProperty: call it on the COMPONENT_SET');
      if (!this._defs[key]) fail(`deleteComponentProperty: property "${key}" not found`);
      delete this._defs[key]; renameRefs(this, key, null);
    }
    createInstance() {
      const inst = new InstanceNode();
      inst._main = this;
      inst._build(true);
      ctx.currentPage.appendChild(inst);
      return inst;
    }
    getInstancesAsync() { return track('component.getInstancesAsync', () => [...ctx.nodes.values()].filter((n) => n._type === 'INSTANCE' && n._main === this)); }
  }

  class ComponentSetNode extends FrameNode {
    constructor() { super('COMPONENT_SET'); this._defs = {}; this._key = Math.random().toString(16).slice(2, 14); this._p.description = ''; }
    get key() { return this._key; }
    get description() { return this._p.description; }
    set description(v) { this._p.description = str(v, 'description'); }
    _variantDefs() {
      const defs = {};
      for (const c of this._kids) {
        const v = parseVariant(c._p.name) || {};
        for (const [k, val] of Object.entries(v)) {
          if (!defs[k]) defs[k] = { type: 'VARIANT', defaultValue: val, variantOptions: [] };
          if (!defs[k].variantOptions.includes(val)) defs[k].variantOptions.push(val);
        }
      }
      return defs;
    }
    _allDefs() { return Object.assign(this._variantDefs(), this._defs); }
    get componentPropertyDefinitions() { return dc(this._allDefs()); }
    get variantGroupProperties() { const o = {}; for (const [k, d] of Object.entries(this._variantDefs())) o[k] = { values: d.variantOptions.slice() }; return o; }
    get defaultVariant() { return this._kids[0] || null; }
    addComponentProperty(name, type, defaultValue, options) {
      if (type === 'VARIANT') {
        str(name, 'addComponentProperty name'); str(defaultValue, `addComponentProperty("${name}", 'VARIANT') default`);
        if (this._variantDefs()[name]) fail(`addComponentProperty: variant property "${name}" already exists`);
        for (const c of this._kids) c._p.name = `${c._p.name}, ${name}=${defaultValue}`;
        return name;
      }
      return addProp(this, name, type, defaultValue, options);
    }
    editComponentProperty(key, nv) {
      const vd = this._variantDefs()[key];
      if (vd) {
        if (nv.name && nv.name !== key) for (const c of this._kids) { const v = parseVariant(c._p.name); c._p.name = Object.entries(v).map(([k, x]) => `${k === key ? nv.name : k}=${x}`).join(', '); }
        return nv.name || key;
      }
      return editProp(this, key, nv);
    }
    deleteComponentProperty(key) {
      if (this._variantDefs()[key]) fail('mock: deleting VARIANT properties not implemented');
      if (!this._defs[key]) fail(`deleteComponentProperty: property "${key}" not found`);
      delete this._defs[key]; renameRefs(this, key, null);
    }
    createInstance() { fail(`createInstance() does not exist on COMPONENT_SET ${this._label()}: use set.defaultVariant.createInstance() or pick a variant from set.children`); }
  }

  const KEEP_ON_SWAP = ['x', 'y', 'layoutGrow', 'layoutAlign', 'layoutPositioning', 'constraints'];
  class InstanceNode extends FrameNode {
    constructor() { super('INSTANCE'); this._main = null; this._propValues = {}; this._snap = {}; }
    get mainComponent() { return this._main; }
    set mainComponent(c) { this.swapComponent(c); }
    getMainComponentAsync() { return track('instance.getMainComponentAsync', () => this._main); }
    _build(initial) {
      const m = this._main, owner = ownerOf(m);
      const np = dc(m._p);
      np.name = owner._p.name;
      if (initial) Object.assign(np, { x: 0, y: 0, layoutGrow: 0, layoutAlign: 'INHERIT', layoutPositioning: 'AUTO' });
      else {
        const old = this._p, snap = this._snap;
        for (const k of Object.keys(old)) if (KEEP_ON_SWAP.includes(k) || !same(old[k], snap[k])) np[k] = old[k];
      }
      this._snap = dc(m._p); this._snap.name = owner._p.name;
      this._p = np;
      for (const k of this._kids) markRemoved(k);
      this._kids = m._kids.map((k) => { const c = k._cloneRaw(true); c._parent = this; return c; });
      this._applyProps();
    }
    _applyProps() {
      const pv = this._propValues;
      const visit = (n) => {
        for (const k of n._kids || []) {
          const r = k._cpr;
          if (r) {
            if (r.characters && r.characters in pv && k._type === 'TEXT') { k._p.characters = String(pv[r.characters]); k._ranges = []; }
            if (r.visible && r.visible in pv) k._p.visible = !!pv[r.visible];
            if (r.mainComponent && r.mainComponent in pv && k._type === 'INSTANCE') {
              const c = ctx.nodes.get(pv[r.mainComponent]);
              if (c && c !== k._main) { k._main = c; k._build(false); }
            }
          }
          if (k._type !== 'INSTANCE') visit(k);
        }
      };
      visit(this);
    }
    get componentProperties() {
      const owner = ownerOf(this._main), defs = owner._allDefs(), vv = parseVariant(this._main._p.name) || {};
      const out = {};
      for (const [k, d] of Object.entries(defs)) out[k] = { type: d.type, value: d.type === 'VARIANT' ? vv[k] : k in this._propValues ? this._propValues[k] : d.defaultValue };
      return out;
    }
    setProperties(obj) {
      if (!isObj(obj)) fail(`setProperties: expected an object, got ${fmt(obj)}`);
      const owner = ownerOf(this._main), defs = owner._allDefs();
      const variantChanges = {};
      for (const [k, v] of Object.entries(obj)) {
        const d = defs[k];
        if (!d) {
          const near = Object.keys(defs).filter((x) => x.split('#')[0] === k.split('#')[0]);
          fail(`Property "${k}" not found on ${owner._label()}${near.length ? ` (did you mean ${near.map((x) => `"${x}"`).join(', ')}?)` : ''}. Available: ${Object.keys(defs).map((x) => `"${x}"`).join(', ') || 'none'}`);
        }
        if (d.type === 'VARIANT') {
          if (typeof v !== 'string' || !d.variantOptions.includes(v)) fail(`setProperties: invalid value ${fmt(v)} for variant property "${k}" (options: ${d.variantOptions.join(', ')})`);
          variantChanges[k] = v;
        } else if (d.type === 'TEXT') { if (typeof v !== 'string') fail(`setProperties: TEXT property "${k}" needs a string, got ${fmt(v)}`); }
        else if (d.type === 'BOOLEAN') { if (typeof v !== 'boolean') fail(`setProperties: BOOLEAN property "${k}" needs true/false, got ${fmt(v)}`); }
        else if (d.type === 'INSTANCE_SWAP') {
          const c = ctx.nodes.get(v);
          if (!c || c._type !== 'COMPONENT') fail(`setProperties: INSTANCE_SWAP property "${k}" needs the id of an existing COMPONENT, got ${fmt(v)}`);
        }
      }
      for (const [k, v] of Object.entries(obj)) if (defs[k].type !== 'VARIANT') this._propValues[k] = v;
      if (Object.keys(variantChanges).length) {
        const want = Object.assign({}, parseVariant(this._main._p.name) || {}, variantChanges);
        const match = owner._kids.find((c) => { const v = parseVariant(c._p.name) || {}; return Object.keys(want).every((k) => v[k] === want[k]); });
        if (!match) fail(`setProperties: no variant in ${owner._label()} matches ${fmt(want)}`);
        if (match !== this._main) { this._main = match; this._build(false); return; }
      }
      this._applyProps();
    }
    swapComponent(c) {
      if (!c || c._type !== 'COMPONENT') fail(`swapComponent: expected a COMPONENT, got ${fmt(c)}${c && c._type === 'COMPONENT_SET' ? ' (pick a variant from set.children)' : ''}`);
      this._main = c; this._build(false);
    }
    resetOverrides() { this._propValues = {}; this._snap = {}; this._build(true); }
    detachInstance() {
      const f = new FrameNode('FRAME');
      f._p = dc(this._p);
      f._kids = this._kids;
      const unmark = (n) => { n._inInstance = false; if (n._type !== 'INSTANCE') for (const k of n._kids || []) unmark(k); };
      for (const k of f._kids) { k._parent = f; unmark(k); }
      this._kids = [];
      const p = this._parent;
      if (p) { p._kids[p._kids.indexOf(this)] = f; f._parent = p; }
      this._parent = null; markRemoved(this);
      return f;
    }
  }

  class TextNode extends GeomNode {
    constructor() {
      super('TEXT', {
        characters: '', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 12, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PERCENT', value: 0 },
        textAutoResize: 'WIDTH_AND_HEIGHT', textAlignHorizontal: 'LEFT', textAlignVertical: 'TOP', textDecoration: 'NONE', textCase: 'ORIGINAL',
        paragraphSpacing: 0, paragraphIndent: 0, maxLines: null, textTruncation: 'DISABLED', textStyleId: '', hyperlink: null, w: 0, h: 14,
      });
      this._ranges = [];
    }
    _fonts() { return [this._p.fontName, ...this._ranges.map((r) => r.fontName)]; }
    _needFonts() { for (const f of this._fonts()) requireFont(f); }
    _edit(prop, v) { this._needFonts(); this._p[prop] = v; this._p.textStyleId = ''; }
    get characters() { return this._p.characters; }
    set characters(v) {
      str(v, `characters on ${this._label()}`);
      this._needFonts();
      this._p.characters = v; this._ranges = [];
    }
    get fontName() { return this._ranges.some((r) => !same(r.fontName, this._p.fontName)) ? MIXED : dc(this._p.fontName); }
    set fontName(v) { const f = checkFont(v, `fontName on ${this._label()}`); requireFont(f); this._p.fontName = f; this._ranges = []; this._p.textStyleId = ''; }
    get fontSize() { return this._p.fontSize; }
    set fontSize(v) { this._edit('fontSize', num(v, `fontSize on ${this._label()}`, { min: 1 })); }
    get fontWeight() { const s = this._p.fontName.style; const W = { Thin: 100, ExtraLight: 200, Light: 300, DemiLight: 350, Regular: 400, Medium: 500, 'Semi Bold': 600, SemiBold: 600, Bold: 700, ExtraBold: 800, Black: 900 }; return W[s] || 400; }
    get lineHeight() { return dc(this._p.lineHeight); }
    set lineHeight(v) { this._edit('lineHeight', checkLineHeight(v, `lineHeight on ${this._label()}`)); }
    get letterSpacing() { return dc(this._p.letterSpacing); }
    set letterSpacing(v) { this._edit('letterSpacing', checkLetterSpacing(v, `letterSpacing on ${this._label()}`)); }
    get textCase() { return this._p.textCase; }
    set textCase(v) { this._edit('textCase', oneOf(v, ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE', 'SMALL_CAPS', 'SMALL_CAPS_FORCED'], 'textCase')); }
    get textDecoration() { return this._p.textDecoration; }
    set textDecoration(v) { this._edit('textDecoration', oneOf(v, ['NONE', 'UNDERLINE', 'STRIKETHROUGH'], 'textDecoration')); }
    get paragraphSpacing() { return this._p.paragraphSpacing; }
    set paragraphSpacing(v) { this._edit('paragraphSpacing', num(v, 'paragraphSpacing', { min: 0 })); }
    get paragraphIndent() { return this._p.paragraphIndent; }
    set paragraphIndent(v) { this._edit('paragraphIndent', num(v, 'paragraphIndent', { min: 0 })); }
    get textAutoResize() { return this._p.textAutoResize; }
    set textAutoResize(v) {
      oneOf(v, ['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT', 'TRUNCATE'], `textAutoResize on ${this._label()}`);
      if (this._p.characters) this._needFonts();
      if (v === 'HEIGHT' && this._p.textAutoResize === 'WIDTH_AND_HEIGHT') this._p.w = this._hug(true);
      this._p.textAutoResize = v;
    }
    get textAlignHorizontal() { return this._p.textAlignHorizontal; }
    set textAlignHorizontal(v) { this._p.textAlignHorizontal = oneOf(v, ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'], 'textAlignHorizontal'); }
    get textAlignVertical() { return this._p.textAlignVertical; }
    set textAlignVertical(v) { this._p.textAlignVertical = oneOf(v, ['TOP', 'CENTER', 'BOTTOM'], 'textAlignVertical'); }
    get maxLines() { return this._p.maxLines; }
    set maxLines(v) { num(v, 'maxLines', { nullable: true, min: 1 }); if (v !== null && !Number.isInteger(v)) fail('maxLines: expected an integer'); this._p.maxLines = v; }
    get textTruncation() { return this._p.textTruncation; }
    set textTruncation(v) { this._p.textTruncation = oneOf(v, ['DISABLED', 'ENDING'], 'textTruncation'); }
    get hyperlink() { return this._p.hyperlink; }
    set hyperlink(v) { this._p.hyperlink = dc(v); }
    get hasMissingFont() { return false; }
    get autoRename() { return this._p.autoRename !== false; }
    set autoRename(v) { this._p.autoRename = bool(v, 'autoRename'); }
    get textStyleId() { return this._p.textStyleId; }
    set textStyleId(v) { dyn('setting node.textStyleId', 'await node.setTextStyleIdAsync(id)'); }
    setTextStyleIdAsync(id) {
      return track('text.setTextStyleIdAsync', () => {
        if (id === '') { this._p.textStyleId = ''; return; }
        const s = ctx.styles.get(id);
        if (!s || s._type !== 'TEXT') fail(`setTextStyleIdAsync: no local text style with id ${fmt(id)}${isObj(id) ? ' (pass style.id, not the style object)' : ''}`);
        for (const k of ['fontName', 'fontSize', 'lineHeight', 'letterSpacing', 'textCase', 'textDecoration', 'paragraphSpacing', 'paragraphIndent']) this._p[k] = dc(s._p[k]);
        this._ranges = [];
        this._p.textStyleId = id;
      });
    }
    _range(s, e, op) {
      num(s, `${op} start`); num(e, `${op} end`);
      if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e > this._p.characters.length || s >= e) fail(`${op}: invalid range ${s}..${e} for text of length ${this._p.characters.length}`);
    }
    setRangeFontName(s, e, f) { this._range(s, e, 'setRangeFontName'); const fn = checkFont(f, 'setRangeFontName'); requireFont(fn); this._ranges.push({ s, e, fontName: fn }); }
    setRangeFontSize(s, e, v) { this._range(s, e, 'setRangeFontSize'); num(v, 'setRangeFontSize', { min: 1 }); this._needFonts(); }
    setRangeLineHeight(s, e, v) { this._range(s, e, 'setRangeLineHeight'); checkLineHeight(v, 'setRangeLineHeight'); this._needFonts(); }
    setRangeLetterSpacing(s, e, v) { this._range(s, e, 'setRangeLetterSpacing'); checkLetterSpacing(v, 'setRangeLetterSpacing'); this._needFonts(); }
    setRangeTextDecoration(s, e, v) { this._range(s, e, 'setRangeTextDecoration'); oneOf(v, ['NONE', 'UNDERLINE', 'STRIKETHROUGH'], 'setRangeTextDecoration'); this._needFonts(); }
    setRangeTextCase(s, e, v) { this._range(s, e, 'setRangeTextCase'); this._needFonts(); }
    setRangeFills(s, e, v) { this._range(s, e, 'setRangeFills'); checkPaints(v, 'setRangeFills'); }
    setRangeHyperlink(s, e, v) { this._range(s, e, 'setRangeHyperlink'); }
    setRangeTextStyleIdAsync(s, e, id) { return track('text.setRangeTextStyleIdAsync', () => { this._range(s, e, 'setRangeTextStyleIdAsync'); const st = ctx.styles.get(id); if (!st || st._type !== 'TEXT') fail(`setRangeTextStyleIdAsync: no local text style with id ${fmt(id)}`); this._ranges.push({ s, e, fontName: dc(st._p.fontName) }); }); }
    getRangeFontName(s, e) { this._range(s, e, 'getRangeFontName'); const fs = [this._p.fontName, ...this._ranges.filter((r) => r.s < e && r.e > s).map((r) => r.fontName)]; return fs.every((f) => same(f, fs[0])) ? dc(fs[0]) : MIXED; }
    getRangeFontSize() { return this._p.fontSize; }
    getRangeFills() { return this.fills; }
    getRangeLineHeight() { return this.lineHeight; }
    getRangeTextStyleId() { return this._p.textStyleId; }
    insertCharacters(i, chars) { str(chars, 'insertCharacters'); this._needFonts(); const c = this._p.characters; if (i < 0 || i > c.length) fail('insertCharacters: index out of range'); this._p.characters = c.slice(0, i) + chars + c.slice(i); }
    deleteCharacters(s, e) { this._range(s, e, 'deleteCharacters'); this._needFonts(); const c = this._p.characters; this._p.characters = c.slice(0, s) + c.slice(e); }
    getStyledTextSegments(fields, start = 0, end = this._p.characters.length) {
      if (!Array.isArray(fields)) fail('getStyledTextSegments: expected an array of field names');
      const seg = { characters: this._p.characters.slice(start, end), start, end };
      for (const f of fields) seg[f] = f === 'fontName' ? dc(this._p.fontName) : f in this._p ? dc(this._p[f]) : (f === 'fills' ? this.fills : undefined);
      return [seg];
    }
    /* sizing */
    _ownSizing(horiz) {
      const a = this._p.textAutoResize;
      if (horiz) return a === 'WIDTH_AND_HEIGHT' ? 'HUG' : 'FIXED';
      return a === 'WIDTH_AND_HEIGHT' || a === 'HEIGHT' ? 'HUG' : 'FIXED';
    }
    _textHug(horiz) {
      if (horiz) this._p.textAutoResize = 'WIDTH_AND_HEIGHT';
      else if (this._p.textAutoResize !== 'WIDTH_AND_HEIGHT') this._p.textAutoResize = 'HEIGHT';
    }
    _textFixed(horiz) {
      const a = this._p.textAutoResize;
      if (horiz && a === 'WIDTH_AND_HEIGHT') { this._p.w = this._hug(true); this._p.textAutoResize = 'HEIGHT'; }
      if (!horiz && (a === 'HEIGHT' || a === 'WIDTH_AND_HEIGHT')) { this._p.w = this._size(true); this._p.textAutoResize = 'NONE'; }
    }
    _afterFill(horiz) { if (horiz && this._p.textAutoResize === 'WIDTH_AND_HEIGHT') this._p.textAutoResize = 'HEIGHT'; }
    _lh() { const lh = this._p.lineHeight, fs = this._p.fontSize; return lh.unit === 'PIXELS' ? lh.value : lh.unit === 'PERCENT' ? (fs * lh.value) / 100 : fs * 1.3; }
    _lineW(line) {
      const fs = this._p.fontSize, ls = this._p.letterSpacing;
      const extra = ls.unit === 'PIXELS' ? ls.value : (fs * ls.value) / 100;
      let w = 0;
      for (const ch of line) { const c = ch.codePointAt(0); w += (c >= 0x1100 ? fs * 0.95 : ch === ' ' ? fs * 0.28 : fs * 0.55) + extra; }
      return w;
    }
    _hug(horiz) {
      const lines = this._p.characters.split('\n');
      if (horiz) return Math.max(0, ...lines.map((l) => this._lineW(l)));
      const width = this._size(true);
      let n = 0;
      for (const l of lines) n += width > 0 && this._p.textAutoResize !== 'WIDTH_AND_HEIGHT' ? Math.max(1, Math.ceil(this._lineW(l) / width - 1e-9)) : 1;
      if (this._p.maxLines != null) n = Math.min(n, this._p.maxLines);
      return n * this._lh();
    }
    resize(w, h) {
      this._checkResize(w, h);
      if (this._p.textAutoResize === 'WIDTH_AND_HEIGHT') this._p.textAutoResize = 'NONE';
      super.resize(w, h);
    }
  }

  class GroupNode extends BaseNode {
    constructor() { super('GROUP', { effects: [] }); this._kids = []; }
    _bounds() {
      if (!this._kids.length) return { x: 0, y: 0, w: 0, h: 0 };
      const xs = this._kids.map((k) => k._p.x), ys = this._kids.map((k) => k._p.y);
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, w: Math.max(...this._kids.map((k) => k._p.x + k.width)) - x, h: Math.max(...this._kids.map((k) => k._p.y + k.height)) - y };
    }
    _size(horiz) { const b = this._bounds(); return horiz ? b.w : b.h; }
    get effects() { return deepFreeze(dc(this._p.effects)); }
    set effects(v) { this._p.effects = checkEffects(v, `effects on ${this._label()}`); }
    resize() { fail('mock: GROUP.resize() not implemented (resize the children instead)'); }
  }
  mix(GroupNode, Container);

  class PageNode extends BaseNode {
    constructor() { super('PAGE', { backgrounds: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }], selection: [] }); this._kids = []; this._p.name = `Page ${[...ctx.nodes.values()].filter((n) => n._type === 'PAGE').length + 1}`; }
    get selection() { return this._p.selection.filter((n) => !n._removed); }
    set selection(v) {
      if (!Array.isArray(v)) fail(`selection: expected an array of nodes, got ${fmt(v)}`);
      v.forEach((n, i) => { if (!n || !n._type) fail(`selection[${i}]: expected a node`); });
      this._p.selection = v.slice();
    }
    get backgrounds() { return deepFreeze(dc(this._p.backgrounds)); }
    set backgrounds(v) { this._p.backgrounds = checkPaints(v, 'page.backgrounds'); }
    get flowStartingPoints() { return []; }
    loadAsync() { return track('page.loadAsync', () => undefined); }
    resize() { fail('A PAGE cannot be resized'); }
    remove() {
      const pages = ctx.root._kids;
      if (pages.length <= 1) fail('Cannot remove the last page of the document');
      if (ctx.currentPage === this) { warn(`Removed the current page ${this._label()}; switching to another page`); ctx.currentPage = pages.find((p) => p !== this); }
      pages.splice(pages.indexOf(this), 1); this._parent = null; markRemoved(this);
    }
  }
  mix(PageNode, Container);

  class DocumentNode extends BaseNode {
    constructor() { super('DOCUMENT', { name: 'Mock document' }); this._kids = []; }
  }
  mix(DocumentNode, Container);

  /* ---------- styles ---------- */
  class StyleBase {
    constructor(type, defaults) {
      this._type = type; this._id = `S:${(ctx.styleSeq++).toString(16).padStart(40, '0')},${ctx.seq++}:0`; this._removed = false;
      this._p = Object.assign({ name: `${type[0]}${type.slice(1).toLowerCase()} style`, description: '' }, defaults);
      this._key = Math.random().toString(16).slice(2, 14);
      const proxy = wrap(this);
      ctx.styles.set(this._id, proxy);
      return proxy;
    }
    _label() { return `${this._type} style "${this._p.name}" (${this._id})`; }
    toString() { return `[${this._type} style "${this._p.name}"]`; }
    [util.inspect.custom]() { return this.toString(); }
    get id() { return this._id; }
    get type() { return this._type; }
    get key() { return this._key; }
    get removed() { return this._removed; }
    get remote() { return false; }
    get name() { return this._p.name; }
    set name(v) { this._p.name = str(v, 'style name'); }
    get description() { return this._p.description; }
    set description(v) { this._p.description = str(v, 'style description'); }
    remove() { ctx.styles.delete(this._id); this._removed = true; }
    getStyleConsumersAsync() { return track('style.getStyleConsumersAsync', () => []); }
  }
  class TextStyle extends StyleBase {
    constructor() {
      super('TEXT', { fontName: { family: 'Inter', style: 'Regular' }, fontSize: 12, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PERCENT', value: 0 }, textCase: 'ORIGINAL', textDecoration: 'NONE', paragraphSpacing: 0, paragraphIndent: 0 });
    }
    _need() { requireFont(this._p.fontName, 'style'); }
    get fontName() { return dc(this._p.fontName); }
    set fontName(v) { const f = checkFont(v, `fontName on ${this._label()}`); requireFont(f, 'style'); this._p.fontName = f; }
    get fontSize() { return this._p.fontSize; }
    set fontSize(v) { num(v, `fontSize on ${this._label()}`, { min: 1 }); this._need(); this._p.fontSize = v; }
    get lineHeight() { return dc(this._p.lineHeight); }
    set lineHeight(v) { const lh = checkLineHeight(v, `lineHeight on ${this._label()}`); this._need(); this._p.lineHeight = lh; }
    get letterSpacing() { return dc(this._p.letterSpacing); }
    set letterSpacing(v) { const ls = checkLetterSpacing(v, `letterSpacing on ${this._label()}`); this._need(); this._p.letterSpacing = ls; }
    get textCase() { return this._p.textCase; }
    set textCase(v) { this._need(); this._p.textCase = oneOf(v, ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE', 'SMALL_CAPS', 'SMALL_CAPS_FORCED'], 'textCase'); }
    get textDecoration() { return this._p.textDecoration; }
    set textDecoration(v) { this._need(); this._p.textDecoration = oneOf(v, ['NONE', 'UNDERLINE', 'STRIKETHROUGH'], 'textDecoration'); }
    get paragraphSpacing() { return this._p.paragraphSpacing; }
    set paragraphSpacing(v) { this._need(); this._p.paragraphSpacing = num(v, 'paragraphSpacing', { min: 0 }); }
    get paragraphIndent() { return this._p.paragraphIndent; }
    set paragraphIndent(v) { this._need(); this._p.paragraphIndent = num(v, 'paragraphIndent', { min: 0 }); }
  }
  class PaintStyle extends StyleBase {
    constructor() { super('PAINT', { paints: [] }); }
    get paints() { return deepFreeze(dc(this._p.paints)); }
    set paints(v) { this._p.paints = checkPaints(v, `paints on ${this._label()}`); }
  }
  class EffectStyle extends StyleBase {
    constructor() { super('EFFECT', { effects: [] }); }
    get effects() { return deepFreeze(dc(this._p.effects)); }
    set effects(v) { this._p.effects = checkEffects(v, `effects on ${this._label()}`); }
  }

  /* ---------- variables ---------- */
  const VAR_TYPES = ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'];
  class VariableCollection {
    constructor(name) {
      this._id = `VariableCollectionId:${ctx.seq++}:0`; this._removed = false; this._isCollection = true;
      const m = `${ctx.seq++}:0`;
      this._p = { name, modes: [{ modeId: m, name: 'Mode 1' }], defaultModeId: m, hiddenFromPublishing: false };
      this._key = Math.random().toString(16).slice(2, 14);
      const proxy = wrap(this);
      ctx.collections.set(this._id, proxy);
      return proxy;
    }
    _label() { return `variable collection "${this._p.name}"`; }
    toString() { return `[VariableCollection "${this._p.name}"]`; }
    [util.inspect.custom]() { return this.toString(); }
    get id() { return this._id; }
    get key() { return this._key; }
    get removed() { return this._removed; }
    get remote() { return false; }
    get name() { return this._p.name; }
    set name(v) { this._p.name = str(v, 'collection name'); }
    get modes() { return dc(this._p.modes); }
    get defaultModeId() { return this._p.defaultModeId; }
    get hiddenFromPublishing() { return this._p.hiddenFromPublishing; }
    set hiddenFromPublishing(v) { this._p.hiddenFromPublishing = bool(v, 'hiddenFromPublishing'); }
    get variableIds() { return [...ctx.variables.values()].filter((v) => v._p.variableCollectionId === this._id).map((v) => v._id); }
    _mode(id, op) { const m = this._p.modes.find((x) => x.modeId === id); if (!m) fail(`${op}: mode "${id}" is not in ${this._label()} (modes: ${this._p.modes.map((x) => `${x.name}=${x.modeId}`).join(', ')})`); return m; }
    renameMode(id, name) { this._mode(id, 'renameMode').name = str(name, 'renameMode name'); }
    addMode(name) {
      str(name, 'addMode name');
      const m = `${ctx.seq++}:0`;
      this._p.modes.push({ modeId: m, name });
      for (const id of this.variableIds) { const v = ctx.variables.get(id); v._p.valuesByMode[m] = dc(v._p.valuesByMode[this._p.defaultModeId]); }
      return m;
    }
    removeMode(id) {
      this._mode(id, 'removeMode');
      if (this._p.modes.length === 1) fail('removeMode: a collection needs at least one mode');
      this._p.modes = this._p.modes.filter((x) => x.modeId !== id);
      if (this._p.defaultModeId === id) this._p.defaultModeId = this._p.modes[0].modeId;
    }
    remove() {
      for (const id of this.variableIds) ctx.variables.get(id).remove();
      ctx.collections.delete(this._id); this._removed = true;
    }
  }
  class Variable {
    constructor(name, col, type) {
      this._id = `VariableID:${ctx.seq++}:0`; this._removed = false; this._isVariable = true;
      const init = { COLOR: { r: 0, g: 0, b: 0, a: 1 }, FLOAT: 0, STRING: '', BOOLEAN: false }[type];
      const vbm = {};
      for (const m of col._p.modes) vbm[m.modeId] = dc(init);
      this._p = { name, resolvedType: type, variableCollectionId: col._id, valuesByMode: vbm, scopes: ['ALL_SCOPES'], description: '', hiddenFromPublishing: false, codeSyntax: {} };
      this._key = Math.random().toString(16).slice(2, 14);
      const proxy = wrap(this);
      ctx.variables.set(this._id, proxy);
      return proxy;
    }
    _label() { return `variable "${this._p.name}" (${this._p.resolvedType})`; }
    toString() { return `[Variable "${this._p.name}" ${this._p.resolvedType}]`; }
    [util.inspect.custom]() { return this.toString(); }
    _col() { return ctx.collections.get(this._p.variableCollectionId); }
    _resolve(modeId, depth = 0) {
      const col = this._col();
      const v = this._p.valuesByMode[modeId || (col && col._p.defaultModeId)];
      if (isObj(v) && v.type === 'VARIABLE_ALIAS') {
        const t = ctx.variables.get(v.id);
        if (!t || depth > 10) return undefined;
        return t._resolve(undefined, depth + 1);
      }
      return v;
    }
    get id() { return this._id; }
    get key() { return this._key; }
    get removed() { return this._removed; }
    get remote() { return false; }
    get name() { return this._p.name; }
    set name(v) {
      str(v, 'variable name');
      if (v !== this._p.name && [...ctx.variables.values()].some((x) => x !== this && x._p.variableCollectionId === this._p.variableCollectionId && x._p.name === v)) fail(`A variable named "${v}" already exists in this collection`);
      this._p.name = v;
    }
    get resolvedType() { return this._p.resolvedType; }
    get variableCollectionId() { return this._p.variableCollectionId; }
    getVariableCollectionAsync() { return track('variable.getVariableCollectionAsync', () => this._col()); }
    get valuesByMode() { return dc(this._p.valuesByMode); }
    get description() { return this._p.description; }
    set description(v) { this._p.description = str(v, 'variable description'); }
    get hiddenFromPublishing() { return this._p.hiddenFromPublishing; }
    set hiddenFromPublishing(v) { this._p.hiddenFromPublishing = bool(v, 'hiddenFromPublishing'); }
    get scopes() { return this._p.scopes.slice(); }
    set scopes(v) {
      if (!Array.isArray(v)) fail(`scopes on ${this._label()}: expected an array, got ${fmt(v)}`);
      v.forEach((s, i) => oneOf(s, VARIABLE_SCOPES, `scopes[${i}] on ${this._label()}`));
      this._p.scopes = v.slice();
    }
    get codeSyntax() { return dc(this._p.codeSyntax); }
    setVariableCodeSyntax(platform, value) { oneOf(platform, ['WEB', 'ANDROID', 'iOS'], 'setVariableCodeSyntax platform'); this._p.codeSyntax[platform] = str(value, 'setVariableCodeSyntax value'); }
    removeVariableCodeSyntax(platform) { delete this._p.codeSyntax[platform]; }
    setValueForMode(modeId, value) {
      const col = this._col();
      if (!col) fail(`setValueForMode on ${this._label()}: its collection was removed`);
      col._mode(modeId, `setValueForMode on ${this._label()}`);
      const at = `setValueForMode(${fmt(modeId)}) on ${this._label()}`;
      if (isObj(value) && value.type === 'VARIABLE_ALIAS') {
        checkAlias(value, at, this._p.resolvedType);
        if (value.id === this._id) fail(`${at}: a variable cannot alias itself`);
      } else if (this._p.resolvedType === 'COLOR') checkColor(value, at, 'rgbOptA');
      else if (this._p.resolvedType === 'FLOAT') num(value, at);
      else if (this._p.resolvedType === 'STRING') str(value, at);
      else bool(value, at);
      this._p.valuesByMode[modeId] = dc(value);
    }
    resolveForConsumer() { return { value: this._resolve(), resolvedType: this._p.resolvedType }; }
    remove() { ctx.variables.delete(this._id); this._removed = true; }
  }

  const variables = wrap({
    _label() { return 'figma.variables'; },
    getLocalVariableCollectionsAsync() { return track('figma.variables.getLocalVariableCollectionsAsync', () => [...ctx.collections.values()]); },
    getLocalVariablesAsync(type) {
      return track('figma.variables.getLocalVariablesAsync', () => {
        if (type !== undefined) oneOf(type, VAR_TYPES, 'getLocalVariablesAsync type');
        return [...ctx.variables.values()].filter((v) => !type || v._p.resolvedType === type);
      });
    },
    getVariableByIdAsync(id) { return track('figma.variables.getVariableByIdAsync', () => ctx.variables.get(id) || null); },
    getVariableCollectionByIdAsync(id) { return track('figma.variables.getVariableCollectionByIdAsync', () => ctx.collections.get(id) || null); },
    getLocalVariableCollections() { dyn('figma.variables.getLocalVariableCollections', 'getLocalVariableCollectionsAsync'); },
    getLocalVariables() { dyn('figma.variables.getLocalVariables', 'getLocalVariablesAsync'); },
    getVariableById() { dyn('figma.variables.getVariableById', 'getVariableByIdAsync'); },
    getVariableCollectionById() { dyn('figma.variables.getVariableCollectionById', 'getVariableCollectionByIdAsync'); },
    createVariableCollection(name) {
      str(name, 'createVariableCollection name');
      if ([...ctx.collections.values()].some((c) => c._p.name === name)) warn(`createVariableCollection: a collection named "${name}" already exists`);
      return new VariableCollection(name);
    },
    createVariable(name, col, type) {
      str(name, 'createVariable name');
      if (typeof col === 'string') { warn('createVariable(name, collectionId, type): passing a collection id is deprecated; pass the collection object'); col = ctx.collections.get(col); }
      if (!col || !col._isCollection) fail(`createVariable("${name}"): second argument must be a VariableCollection, got ${fmt(col)}`);
      if (col._removed) fail(`createVariable("${name}"): collection was removed`);
      oneOf(type, VAR_TYPES, `createVariable("${name}") type`);
      if ([...ctx.variables.values()].some((v) => v._p.variableCollectionId === col._id && v._p.name === name)) fail(`createVariable: a variable named "${name}" already exists in ${col._label()}`);
      return new Variable(name, col, type);
    },
    createVariableAlias(v) { if (!v || !v._isVariable) fail('createVariableAlias: expected a Variable'); return { type: 'VARIABLE_ALIAS', id: v._id }; },
    createVariableAliasByIdAsync(id) { return track('figma.variables.createVariableAliasByIdAsync', () => { if (!ctx.variables.get(id)) fail(`createVariableAliasByIdAsync: no variable "${id}"`); return { type: 'VARIABLE_ALIAS', id }; }); },
    setBoundVariableForPaint(paint, field, v) {
      const [p] = checkPaints([paint], 'setBoundVariableForPaint paint');
      if (p.type !== 'SOLID') fail('setBoundVariableForPaint: only SOLID paints can bind a color variable');
      if (field !== 'color') fail(`setBoundVariableForPaint: field must be 'color', got ${fmt(field)}`);
      const out = dc(p);
      if (v === null) { delete out.boundVariables; return out; }
      if (!v || !v._isVariable) fail(`setBoundVariableForPaint: expected a Variable object, got ${fmt(v)}`);
      if (v._p.resolvedType !== 'COLOR') fail(`setBoundVariableForPaint: ${v._label()} is not a COLOR variable`);
      const c = v._resolve();
      if (isObj(c)) out.color = { r: c.r, g: c.g, b: c.b };
      out.boundVariables = { color: { type: 'VARIABLE_ALIAS', id: v._id } };
      return out;
    },
    setBoundVariableForEffect(effect, field, v) {
      const [e] = checkEffects([effect], 'setBoundVariableForEffect effect');
      oneOf(field, ['color', 'radius', 'spread', 'offsetX', 'offsetY'], 'setBoundVariableForEffect field');
      if (!v || !v._isVariable) fail('setBoundVariableForEffect: expected a Variable');
      if ((field === 'color') !== (v._p.resolvedType === 'COLOR')) fail(`setBoundVariableForEffect: ${v._label()} does not fit field "${field}"`);
      const out = dc(e); out.boundVariables = Object.assign({}, out.boundVariables, { [field]: { type: 'VARIABLE_ALIAS', id: v._id } });
      return out;
    },
  });

  /* ---------- figma ---------- */
  const root = new DocumentNode();
  ctx.root = root;
  const firstPage = new PageNode();
  firstPage._p.name = 'Page 1';
  root.appendChild(firstPage);
  ctx.currentPage = firstPage;

  const adopt = (n) => { ctx.currentPage.appendChild(n); return n; };
  const clientStore = new Map();

  const hexToRgb = (h) => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(h).trim());
    if (!m) fail(`figma.util.rgb: mock only parses hex colors, got ${fmt(h)}`);
    let s = m[1]; if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    const o = { r: parseInt(s.slice(0, 2), 16) / 255, g: parseInt(s.slice(2, 4), 16) / 255, b: parseInt(s.slice(4, 6), 16) / 255 };
    if (s.length === 8) o.a = parseInt(s.slice(6, 8), 16) / 255;
    return o;
  };

  const figmaTarget = {
    _label() { return 'figma'; },
    get mixed() { return MIXED; },
    get root() { return root; },
    get currentPage() { return ctx.currentPage; },
    set currentPage(v) { fail('Setting figma.currentPage is not supported. Use await figma.setCurrentPageAsync(page)'); },
    editorType: 'figma', mode: 'default', apiVersion: '1.0.0', fileKey: 'mock', command: '', pluginId: 'mock',
    setCurrentPageAsync(page) {
      return track('figma.setCurrentPageAsync', () => {
        if (!page || page._type !== 'PAGE') fail(`setCurrentPageAsync: expected a PAGE node, got ${fmt(page)}`);
        if (page._removed) fail('setCurrentPageAsync: page was removed');
        ctx.currentPage = page;
      });
    },
    loadAllPagesAsync() { return track('figma.loadAllPagesAsync', () => undefined); },
    createFrame() { return adopt(new FrameNode('FRAME')); },
    createComponent() { return adopt(new ComponentNode()); },
    createText() { return adopt(new TextNode()); },
    createRectangle() { return adopt(new GeomNode('RECTANGLE')); },
    createEllipse() { return adopt(new GeomNode('ELLIPSE')); },
    createLine() { return adopt(new GeomNode('LINE')); },
    createVector() { return adopt(new GeomNode('VECTOR')); },
    createPolygon() { return adopt(new GeomNode('POLYGON')); },
    createStar() { return adopt(new GeomNode('STAR')); },
    createPage() { const p = new PageNode(); root.appendChild(p); return p; },
    createNodeFromSvg(svg) {
      str(svg, 'createNodeFromSvg');
      const m = /<svg\b([^>]*)>/i.exec(svg);
      if (!m) fail('createNodeFromSvg: Failed to parse SVG (no <svg> root element)');
      if (!/<\/svg>\s*$/i.test(svg.trim()) && !/\/>\s*$/.test(m[0])) fail('createNodeFromSvg: Failed to parse SVG (missing </svg>)');
      const attr = (n) => { const r = new RegExp(`\\b${n}\\s*=\\s*["']([^"']*)["']`, 'i').exec(m[1]); return r ? r[1] : null; };
      let w = parseFloat(attr('width')), h = parseFloat(attr('height'));
      if (!attr('width') || !attr('height')) {
        warn('createNodeFromSvg: <svg> has no width/height attributes; Figma falls back to the viewBox or 100x100');
        const vb = (attr('viewBox') || '').split(/[\s,]+/).map(Number);
        if (vb.length === 4 && vb.every(Number.isFinite)) { w = w || vb[2]; h = h || vb[3]; }
      }
      if (!Number.isFinite(w) || w <= 0) w = 100;
      if (!Number.isFinite(h) || h <= 0) h = 100;
      const f = new FrameNode('FRAME');
      f._p.name = 'svg'; f._p.fills = []; f._p.w = w; f._p.h = h; f._p.clipsContent = false;
      const shapes = svg.match(/<(path|circle|rect|line|polygon|polyline|ellipse)\b/gi) || [];
      if (!shapes.length) warn('createNodeFromSvg: the SVG has no drawable elements');
      for (const s of shapes) {
        const v = new GeomNode('VECTOR');
        v._p.name = 'Vector'; v._p.w = w; v._p.h = h; v._p.svgTag = s.slice(1).toLowerCase();
        f._kids.push(v); v._parent = f;
      }
      return adopt(f);
    },
    combineAsVariants(nodes, parent, index) {
      if (!Array.isArray(nodes) || !nodes.length) fail('combineAsVariants: expected a non-empty array of COMPONENT nodes');
      nodes.forEach((n, i) => {
        if (!n || n._type !== 'COMPONENT') fail(`combineAsVariants: nodes[${i}] must be a COMPONENT, got ${fmt(n)}`);
        if (!parseVariant(n._p.name)) fail(`combineAsVariants: variant name ${fmt(n._p.name)} must look like "Prop=Value" or "Prop=Value, Prop2=Value2"`);
      });
      if (!parent || !parent._kids) fail(`combineAsVariants: second argument must be a parent node (e.g. figma.currentPage), got ${fmt(parent)}`);
      const sig = (n) => Object.keys(parseVariant(n._p.name)).sort().join(',');
      if (nodes.some((n) => sig(n) !== sig(nodes[0]))) warn(`combineAsVariants: variants have different property names (${[...new Set(nodes.map(sig))].join(' | ')})`);
      const combos = nodes.map((n) => JSON.stringify(Object.entries(parseVariant(n._p.name)).sort()));
      if (new Set(combos).size !== combos.length) warn('combineAsVariants: two or more variants have the same property values');
      const set = new ComponentSetNode();
      set._p.name = nodes[0]._p.name.split(',')[0].split('=')[0].trim();
      for (const n of nodes) { Object.assign(set._defs, n._defs); n._defs = {}; }
      if (index !== undefined) parent.insertChild(index, set); else parent.appendChild(set);
      for (const n of nodes) set.appendChild(n);
      set._p.w = Math.max(1, ...nodes.map((n) => n._p.x + n.width));
      set._p.h = Math.max(1, ...nodes.map((n) => n._p.y + n.height));
      return set;
    },
    group(nodes, parent, index) {
      if (!Array.isArray(nodes) || !nodes.length) fail('figma.group: expected a non-empty array of nodes');
      if (!parent || !parent._kids) fail('figma.group: second argument must be a parent node');
      const g = new GroupNode();
      if (index !== undefined) parent.insertChild(index, g); else parent.appendChild(g);
      for (const n of nodes) g.appendChild(n);
      return g;
    },
    listAvailableFontsAsync() { return track('figma.listAvailableFontsAsync', () => FONTS.map(([family, style]) => ({ fontName: { family, style } }))); },
    loadFontAsync(f) {
      return track('figma.loadFontAsync', () => {
        const fn = checkFont(f, 'loadFontAsync');
        if (!AVAILABLE.has(fontKey(fn))) fail(`The font "${fn.family} ${fn.style}" could not be loaded: it is not available (see figma.listAvailableFontsAsync())`);
        ctx.loadedFonts.add(fontKey(fn));
      });
    },
    getLocalTextStylesAsync() { return track('figma.getLocalTextStylesAsync', () => [...ctx.styles.values()].filter((s) => s._type === 'TEXT')); },
    getLocalPaintStylesAsync() { return track('figma.getLocalPaintStylesAsync', () => [...ctx.styles.values()].filter((s) => s._type === 'PAINT')); },
    getLocalEffectStylesAsync() { return track('figma.getLocalEffectStylesAsync', () => [...ctx.styles.values()].filter((s) => s._type === 'EFFECT')); },
    getLocalTextStyles() { dyn('figma.getLocalTextStyles', 'figma.getLocalTextStylesAsync'); },
    getLocalPaintStyles() { dyn('figma.getLocalPaintStyles', 'figma.getLocalPaintStylesAsync'); },
    getLocalEffectStyles() { dyn('figma.getLocalEffectStyles', 'figma.getLocalEffectStylesAsync'); },
    createTextStyle() { return new TextStyle(); },
    createPaintStyle() { return new PaintStyle(); },
    createEffectStyle() { return new EffectStyle(); },
    getStyleByIdAsync(id) { return track('figma.getStyleByIdAsync', () => ctx.styles.get(id) || null); },
    getStyleById() { dyn('figma.getStyleById', 'figma.getStyleByIdAsync'); },
    getNodeByIdAsync(id) { return track('figma.getNodeByIdAsync', () => ctx.nodes.get(id) || null); },
    getNodeById() { dyn('figma.getNodeById', 'figma.getNodeByIdAsync'); },
    variables,
    viewport: wrap({
      _label() { return 'figma.viewport'; },
      center: { x: 0, y: 0 }, zoom: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      scrollAndZoomIntoView(nodes) {
        if (!Array.isArray(nodes)) fail(`scrollAndZoomIntoView: expected an array of nodes, got ${fmt(nodes)}`);
        nodes.forEach((n, i) => { if (!n || !n._type) fail(`scrollAndZoomIntoView: [${i}] is not a node`); if (n._removed) fail(`scrollAndZoomIntoView: [${i}] was removed`); });
      },
    }),
    util: wrap({
      _label() { return 'figma.util'; },
      rgb(c) { const o = hexToRgb(c); delete o.a; return o; },
      rgba(c) { const o = hexToRgb(c); if (o.a === undefined) o.a = 1; return o; },
      solidPaint(c, over = {}) { const o = typeof c === 'string' ? hexToRgb(c) : dc(c); const p = { type: 'SOLID', color: { r: o.r, g: o.g, b: o.b } }; if (o.a !== undefined && o.a !== 1) p.opacity = o.a; return Object.assign(p, over); },
    }),
    clientStorage: wrap({
      _label() { return 'figma.clientStorage'; },
      getAsync(k) { return track('clientStorage.getAsync', () => dc(clientStore.get(k))); },
      setAsync(k, v) { return track('clientStorage.setAsync', () => { clientStore.set(k, dc(v)); }); },
      deleteAsync(k) { return track('clientStorage.deleteAsync', () => { clientStore.delete(k); }); },
      keysAsync() { return track('clientStorage.keysAsync', () => [...clientStore.keys()]); },
    }),
    notify(msg) { ctx.notifications.push(String(msg)); return { cancel() {} }; },
    closePlugin() { ctx.closed = true; },
  };
  const figma = wrap(figmaTarget);

  /* ---------- report helpers ---------- */
  ctx.stats = () => {
    const byType = {}; let inInstances = 0;
    const all = [];
    const walk = (n) => { for (const k of n._kids || []) { all.push(k); byType[k._type] = (byType[k._type] || 0) + 1; if (k._inInstance) inInstances++; walk(k); } };
    walk(root);
    const styles = [...ctx.styles.values()];
    return {
      pages: root._kids.map((p) => p._p.name),
      currentPage: ctx.currentPage._p.name,
      totalNodes: all.length - (byType.PAGE || 0),
      nodesInsideInstances: inInstances,
      byType,
      components: byType.COMPONENT || 0, componentSets: byType.COMPONENT_SET || 0, instances: byType.INSTANCE || 0,
      textStyles: styles.filter((s) => s._type === 'TEXT').length,
      paintStyles: styles.filter((s) => s._type === 'PAINT').length,
      effectStyles: styles.filter((s) => s._type === 'EFFECT').length,
      variables: ctx.variables.size, variableCollections: ctx.collections.size,
      fontsLoaded: [...ctx.loadedFonts].map((k) => k.replace('\u0000', ' ')),
      notifications: ctx.notifications.slice(),
      _all: all,
    };
  };
  ctx.finalChecks = () => {
    for (const p of ctx.pending) if (!p.tp._used) ctx.warnings.push(`${p.label}(...) was never awaited${p.loc ? ` (${p.loc})` : ''}`);
    const { _all } = ctx.stats();
    let emptyText = 0;
    for (const n of _all) {
      if (n._type === 'INSTANCE' && n._main && n._main._removed && !n._inInstance) ctx.warnings.push(`${n._label()}: its main component was removed`);
      if (n._type === 'COMPONENT_SET' && !n._kids.length) ctx.warnings.push(`${n._label()} is empty`);
      if (n._type === 'TEXT' && !n._p.characters && !n._inInstance) emptyText++;
      if (n._isAL && n._isAL()) {
        for (const horiz of [true, false]) {
          const flow = n._flow();
          if (n._sizing(horiz) === 'HUG' && flow.length && flow.every((k) => k._sizing(horiz) === 'FILL')) ctx.warnings.push(`${n._label()} hugs ${horiz ? 'width' : 'height'} but every child is FILL on that axis (it will collapse)`);
        }
      }
      if ((n._type === 'COMPONENT' && !(n._parent && n._parent._type === 'COMPONENT_SET')) || n._type === 'COMPONENT_SET') {
        const used = new Set();
        const visit = (x) => { for (const k of x._kids || []) { if (k._cpr) Object.values(k._cpr).forEach((v) => used.add(v)); if (k._type !== 'INSTANCE' || true) visit(k); } };
        visit(n);
        for (const [key, d] of Object.entries(n._defs)) if (d.type !== 'VARIANT' && !used.has(key)) ctx.warnings.push(`${n._label()}: property "${key}" is not referenced by any layer (componentPropertyReferences)`);
      }
    }
    if (emptyText) ctx.warnings.push(`${emptyText} TEXT node(s) have empty characters`);
  };

  return { figma, ctx, FigmaMockError };
}

module.exports = { createFigma, FigmaMockError, parseVariant };
