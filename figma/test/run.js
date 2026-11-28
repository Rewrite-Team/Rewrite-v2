#!/usr/bin/env node
'use strict';
/*
 * Smoke-test a Scripter-style Figma script against the mock in mock-figma.js.
 *   node figma/test/run.js [path-to-script] [--quiet] [--json]
 * Default script: figma/dist/rewrite-v1.js. Exit code 1 on error.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const util = require('util');
const { createFigma } = require('./mock-figma');

const AsyncFunction = (async () => {}).constructor;
const LINE_OFFSET = 2; // new AsyncFunction adds two header lines

function locate(stack, file, code) {
  const lines = code.split('\n');
  const frames = [];
  for (const l of String(stack || '').split('\n')) {
    const i = l.lastIndexOf(file + ':');
    if (i < 0) continue;
    const m = /:(\d+):(\d+)\)?\s*$/.exec(l.slice(i + file.length));
    if (!m) continue;
    const line = Number(m[1]) - LINE_OFFSET, col = Number(m[2]);
    const fn = (/^\s*at (?:async )?([^\s(]+) \(/.exec(l) || [])[1];
    frames.push({ line, col, fn: fn && fn !== 'eval' ? fn : '<top level>' });
  }
  const excerpt = (f) => {
    if (!f || !lines[f.line - 1]) return '';
    let src = lines[f.line - 1];
    let col = f.col;
    if (src.length > 160) { const start = Math.max(0, col - 80); src = (start ? '…' : '') + src.slice(start, start + 160); col = col - start + (start ? 1 : 0); }
    return `    ${f.line} | ${src}\n    ${' '.repeat(String(f.line).length)} | ${' '.repeat(Math.max(0, col - 1))}^`;
  };
  return { frames, excerpt: excerpt(frames[0]) };
}

function syntaxCheck(code, file) {
  try { new vm.Script(`(async function(figma, print){\n${code}\n})`, { filename: file, lineOffset: -1 }); return null; }
  catch (e) { return e; }
}

async function runCode(code, opts = {}) {
  const file = opts.file || '<inline>';
  const { figma, ctx } = createFigma({ sourceFile: file, lineOffset: LINE_OFFSET });
  const printed = [];
  const print = (...a) => {
    ctx.printed++;
    const s = a.map((x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3 }))).join(' ');
    printed.push(s);
    if (opts.echoPrint) process.stdout.write(`  print: ${s}\n`);
  };
  const result = { ok: false, error: null, location: null, stats: null, warnings: null, printed, ms: 0 };
  const t0 = Date.now();
  let fn;
  try { fn = new AsyncFunction('figma', 'print', `${code.replace(/^#!.*/, '')}\n//# sourceURL=${file}`); }
  catch (e) {
    const se = syntaxCheck(code, file);
    result.error = e;
    result.location = { frames: [], excerpt: se ? String(se.stack).split('\n').slice(0, 3).map((l) => '    ' + l).join('\n') : '' };
    result.stats = ctx.stats(); result.warnings = ctx.warnings;
    return result;
  }
  const rejections = [];
  const onRej = (e) => rejections.push(e);
  process.on('unhandledRejection', onRej);
  try {
    await fn(figma, print);
    for (let i = 0; i < 3; i++) await new Promise((r) => setImmediate(r));
    if (rejections.length) throw rejections[0];
    result.ok = true;
  } catch (e) {
    result.error = e;
    result.location = locate(e && e.stack, file, code);
  } finally {
    process.off('unhandledRejection', onRej);
  }
  result.ms = Date.now() - t0;
  try { ctx.finalChecks(); } catch (e) { ctx.warnings.push(`final checks failed: ${e.message}`); }
  result.stats = ctx.stats(); delete result.stats._all;
  result.warnings = ctx.warnings;
  return result;
}

function report(r, file) {
  const out = [];
  const s = r.stats;
  if (r.ok) out.push(`OK    ${file}  (${r.ms} ms)`);
  else {
    const e = r.error;
    out.push(`FAIL  ${file}`);
    out.push(`  ${e && e.name ? e.name : 'Error'}: ${e && e.message ? e.message : String(e)}`);
    if (r.location && r.location.frames && r.location.frames.length) {
      const f = r.location.frames[0];
      out.push(`  at line ${f.line}:${f.col} in ${f.fn}`);
    }
    if (r.location && r.location.excerpt) out.push(r.location.excerpt);
    if (r.location && r.location.frames && r.location.frames.length > 1) {
      out.push('  script stack:');
      for (const f of r.location.frames.slice(0, 8)) out.push(`    line ${f.line}:${f.col}  ${f.fn}`);
    }
    if (process.env.MOCK_STACK) out.push(String(e && e.stack));
  }
  if (s) {
    out.push(`  pages (${s.pages.length}): ${s.pages.join(', ')}  [current: ${s.currentPage}]`);
    out.push(`  nodes: ${s.totalNodes} (${s.nodesInsideInstances} inside instances)  ` + Object.entries(s.byType).filter(([t]) => t !== 'PAGE').sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', '));
    out.push(`  components: ${s.components}, component sets: ${s.componentSets}, instances: ${s.instances}`);
    out.push(`  styles: text ${s.textStyles}, paint ${s.paintStyles}, effect ${s.effectStyles};  variables: ${s.variables} in ${s.variableCollections} collection(s)`);
    out.push(`  fonts loaded: ${s.fontsLoaded.join(', ') || 'none'};  print() calls: ${r.printed.length}`);
  }
  const w = r.warnings || [];
  out.push(`  warnings (${w.length})${w.length ? ':' : ''}`);
  for (const x of w.slice(0, 200)) out.push(`    - ${x}`);
  if (w.length > 200) out.push(`    ... ${w.length - 200} more`);
  return out.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const quiet = args.includes('--quiet'), json = args.includes('--json');
  const fileArg = args.find((a) => !a.startsWith('--'));
  const file = path.resolve(fileArg || path.join(__dirname, '..', 'dist', 'rewrite-v1.js'));
  if (!fs.existsSync(file)) { console.error(`FAIL  ${file}: file not found${fileArg ? '' : ' (build it first: node figma/build.js)'}`); process.exit(1); }
  const code = fs.readFileSync(file, 'utf8');
  let finished = false;
  process.on('beforeExit', () => {
    if (!finished) { finished = true; console.error(`FAIL  ${file}\n  the script never finished: it awaited a promise that never settles`); process.exitCode = 1; }
  });
  const r = await runCode(code, { file, echoPrint: !quiet && !json });
  finished = true;
  if (json) console.log(JSON.stringify({ ok: r.ok, error: r.error ? String(r.error.message || r.error) : null, location: r.location && r.location.frames[0], stats: r.stats, warnings: r.warnings }, null, 2));
  else console.log(report(r, path.relative(process.cwd(), file) || file));
  process.exitCode = r.ok ? 0 : 1;
}

module.exports = { runCode, report };
if (require.main === module) main();
