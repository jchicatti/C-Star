const fs = require('fs');
const path = require('path');

// Paths
const secretsPath = path.join(__dirname, '../configs/secrets.js');
const downloadsPath = path.join(__dirname, '../media');
const logsPath = path.join(__dirname, '../logs');

// Step 1: Check if secrets.js and logfile.csv exists
if (!fs.existsSync(secretsPath)) {
  console.error(`
❌ Missing required file: secrets.js

To fix this:
1. Copy the provided template:
   cp secrets.template.js secrets.js
2. Open secrets.js and add your API keys.

This file is required to run the bot. Do not commit it to Git.
`);
  process.exit(1);
}

// Step 1.2: Check if secrets.js and logfile.csv exists
if (!fs.existsSync(secretsPath)) {
  console.error(`
❌ Missing required file: secrets.js

To fix this:
1. Copy the provided template:
   cp secrets.template.js secrets.js
2. Open secrets.js and add your API keys.

This file is required to run the bot. Do not commit it to Git.
`);
  process.exit(1);
}

// Step 2: Validate required fields in secrets.js
const secrets = require(secretsPath);
const requiredFields = ['openaiApiKey', 'bingSearchApiKey', 'authorizedIDs', 'listenerIDs', 'inboxAddress'];

const missingFields = requiredFields.filter(key => !secrets[key]);
if (missingFields.length > 0) {
  console.error(`
❌secrets.js is missing the following keys:
${missingFields.map(k => `- ${k}`).join('\n')}

Please open secrets.js and fill in these values.
`);
  process.exit(1);
}

// Step 3: Check required folders
const folders = [downloadsPath, logsPath];
folders.forEach(folder => {
  if (!fs.existsSync(folder)) {
    console.warn(`⚠️  Folder not found: ${folder}. Creating it now.`);
    fs.mkdirSync(folder, { recursive: true });
  }
});

console.log('✅ Environment setup validated. Ready to go!');
