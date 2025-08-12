// config.js
// Centralized configuration used across the bot

const path = require('path');
const isPkg = typeof process.pkg !== 'undefined';
const basePath = isPkg ? process.cwd() : __dirname;

module.exports = {
  // General config
  botName: 'C-Star',
  language: 'es',
  logLevel: 'info',
  messageRetentionDays: 14,
  
  // Path settings
  basePath,
  logsFolder: path.join(basePath, 'logs'),
  mediaFolder: path.join(basePath, 'media'),
  dbFolder: path.join(basePath, 'db'),
  logFileName: 'logfile.csv',
  authFolder: path.join(basePath, '.wwebjs_auth'),

  // OpenAI/remote model options
  modelType: 'openai', // or 'local', 'freegpt'
  openaiModel: 'gpt-3.5-turbo',
  maxTokens: 200,
  temperature: 0.7,

  // Local model config
  localModelURL: 'http://localhost:11434/api/generate',
  localModelName: 'llama3',

  // Free GPT fallback config (if used)
  useFreeGPT: false,

  // WhatsApp client options
  wwebVersion: '2.2407.3',
  executablePath: path.join(basePath, 'chrome-win', 'chrome.exe'),

  // Rate limit / abuse control
  maxMessagesPerUserPerDay: 50,
  contextLengthPerUser: 3,

  // DB
  dbPath: path.join(basePath, 'db', 'cstar.db'),
  cmdDelimiter: '!',
  ollamaCmd: 'test',
  mediaFolderName : 'media',
  qrImageName : 'qr.png',
  logsFolderName : 'logs'
};
