'use strict';
// Minimal ZIP writer/reader (deflate) with no dependencies. Reader is hardened against path traversal and zip bombs.
const zlib = require('zlib');
const MAX_TOTAL = 800 * 1024 * 1024;
function dosTime(d = new Date()) { return { t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), d: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }
function createZip(entries, when = new Date()) {
  const locals = [], centrals = []; let offset = 0; const { t, d } = dosTime(when);
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8'); const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8');
    const def = zlib.deflateRawSync(raw, { level: 6 }); const useDef = def.length < raw.length; const body = useDef ? def : raw; const crc = zlib.crc32(raw) >>> 0;
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(useDef ? 8 : 0, 8);
    lh.writeUInt16LE(t, 10); lh.writeUInt16LE(d, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    locals.push(lh, name, body);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(useDef ? 8 : 0, 10);
    ch.writeUInt16LE(t, 12); ch.writeUInt16LE(d, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += 30 + name.length + body.length;
  }
  const cd = Buffer.concat(centrals); const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
function readZip(buf) {
  let eocd = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip file');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); const out = []; let total = 0;
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt zip');
    const method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl); p += 46 + nl + el + cl;
    if (name.includes('..') || name.startsWith('/') || /^[a-zA-Z]:/.test(name) || name.includes('\\')) throw new Error('unsafe path in zip: ' + name);
    total += usize; if (total > MAX_TOTAL) throw new Error('zip too large');
    if (name.endsWith('/')) continue;
    const ln = buf.readUInt16LE(lo + 26), le = buf.readUInt16LE(lo + 28); const start = lo + 30 + ln + le; const body = buf.subarray(start, start + csize);
    const data = method === 8 ? zlib.inflateRawSync(body, { maxOutputLength: usize + 1 }) : body;
    if (data.length !== usize || (zlib.crc32(data) >>> 0) !== crc) throw new Error('zip checksum mismatch: ' + name);
    out.push({ name, data });
  }
  return out;
}
module.exports = { createZip, readZip };
