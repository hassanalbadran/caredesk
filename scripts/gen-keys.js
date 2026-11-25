'use strict';
// Run ONCE on your own machine:  node scripts/gen-keys.js
// - config/license-public.pem  -> committed, shipped inside the app (verifies licences)
// - secrets/license-private.pem -> NEVER commit; paste into the dashboard Script Property LICENSE_PRIVATE_KEY
const crypto = require('crypto'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
if (fs.existsSync(path.join(root, 'secrets/license-private.pem'))) { console.error('Keys already exist. Delete them manually if you really want new ones (old licences will stop working).'); process.exit(1); }
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 3072, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
fs.mkdirSync(path.join(root, 'config'), { recursive: true }); fs.mkdirSync(path.join(root, 'secrets'), { recursive: true });
fs.writeFileSync(path.join(root, 'config/license-public.pem'), publicKey); fs.writeFileSync(path.join(root, 'secrets/license-private.pem'), privateKey, { mode: 0o600 });
console.log('OK. Public key written to config/, private key to secrets/ (keep it secret).');
