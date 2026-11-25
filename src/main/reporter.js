'use strict';
// Error / tamper reports to the developer's server. Offline-safe queue on disk; no patient data is ever included
// (only code, English name, plain description, solved flag, account name, app version, count).
const fs = require('fs');
function create(file, { version = '' } = {}) {
  let q = []; try { q = JSON.parse(fs.readFileSync(file, 'utf8')); if (!Array.isArray(q)) q = []; } catch { q = []; }
  const save = () => { try { fs.writeFileSync(file, JSON.stringify(q.slice(-200))); } catch { /* ignore */ } };
  const day = (t) => new Date(t).toISOString().slice(0, 10);
  return {
    add({ code, name, desc, solved = false, account = '', count = 1 }) {
      const now = Date.now(); const key = code + '|' + day(now) + '|' + (solved ? 1 : 0);
      const ex = q.find((x) => x.key === key && !x.sent); if (ex) ex.count += count; else q.push({ key, code, name: String(name || '').slice(0, 60), desc: String(desc || '').slice(0, 300), solved: !!solved, account: String(account || '').slice(0, 60), version, count, ts: now });
      save();
    },
    pending: () => q.filter((x) => !x.sent).length,
    async flush(send) { // send(entry) -> truthy on success
      for (const e of q.filter((x) => !x.sent)) { try { if (await send(e)) e.sent = true; else break; } catch { break; } }
      q = q.filter((x) => !x.sent); save();
    }
  };
}
module.exports = { create };
