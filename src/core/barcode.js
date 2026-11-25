'use strict';
// Code 128 (subset B) generator -> SVG. Patterns are bar/space widths; every symbol sums to 11 modules (stop = 13).
const P = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
function codes(text) {
  const out = [104]; let sum = 104;
  [...String(text)].forEach((ch, i) => { const c = ch.charCodeAt(0); if (c < 32 || c > 126) throw new Error('unsupported character'); const v = c - 32; out.push(v); sum += v * (i + 1); });
  out.push(sum % 103, 106); return out;
}
function modules(text) { // string of 1/0 modules
  let bits = ''; for (const c of codes(text)) { let bar = true; for (const w of P[c]) { bits += (bar ? '1' : '0').repeat(Number(w)); bar = !bar; } } return bits;
}
function svg(text, { height = 56, module: m = 2, quiet = 10, label = true, color = '#000' } = {}) {
  const bits = modules(text); const w = (bits.length + quiet * 2) * m; let x = quiet * m, rects = '';
  for (let i = 0; i < bits.length;) { let j = i; while (bits[j] === bits[i]) j++; if (bits[i] === '1') rects += `<rect x="${x}" y="0" width="${(j - i) * m}" height="${height}"/>`; x += (j - i) * m; i = j; }
  const esc = String(text).replace(/[<>&"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${height + (label ? 16 : 0)}" width="${w}" height="${height + (label ? 16 : 0)}" fill="${color}" shape-rendering="crispEdges">${rects}${label ? `<text x="${w / 2}" y="${height + 13}" font-family="monospace" font-size="12" text-anchor="middle" stroke="none">${esc}</text>` : ''}</svg>`;
}
module.exports = { svg, modules, codes, PATTERNS: P };
