// core/bot.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const config = require('../config/config');
const path = require('path');

const client = new Client({
    webVersionCache: {
        type: 'remote',
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${config.wwebVersion}.html`,
    },
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '..', config.authFolder)
    }),
    puppeteer: {
        executablePath: path.join(__dirname, '..', config.chromiumFolder, 'chrome.exe'),
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

module.exports = client;