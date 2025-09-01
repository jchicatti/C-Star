const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');

const basePath = process.cwd();

process.on('unhandledRejection', (r) => {
  console.error('unhandledRejection:', r);
});

console.log('creando cliente…');
const client = new Client({
  puppeteer: {
    headless: false, // para ver qué pasa
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
    ],
  },
  // quita webVersionCache mientras depuras
  authStrategy: new LocalAuth({ dataPath: path.join(basePath, '.wwebjs_auth') }),
  takeoverOnConflict: true,
  restartOnAuthFail: true,
});

client.on('loading_screen', (percent, msg) => {
  console.log('loading_screen:', percent, msg);
});
client.on('qr', () => console.log('[qr] escanea el código en la ventana'));
client.on('authenticated', () => console.log('[authenticated] ok'));
client.on('auth_failure', (m) => console.error('[auth_failure]', m));
client.on('remote_session_saved', () => console.log('[remote_session_saved]'));
client.on('disconnected', (reason) => console.log('[disconnected]', reason));
client.on('change_state', (state) => console.log('[change_state]', state));
client.on('ready', () => console.log('[ready] client is ready!'));
client.on('message', (msg) => console.log('[message] de', msg.from, 'texto:', msg.body));

console.log('inicializando…');
client.initialize().catch(err => console.error('client.initialize() error:', err));