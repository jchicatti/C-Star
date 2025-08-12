// core/database.js

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const config = require('../config');

const dbPath = path.join(__dirname, '..', 'db', config.sqlite.dbFileName);
if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    role TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

function saveMessage(userId, role, content) {
  const stmt = db.prepare('INSERT INTO messages (userId, role, content) VALUES (?, ?, ?)');
  stmt.run(userId, role, content);
  stmt.finalize();
}

function getRecentMessages(userId, limit = config.langContextLimit) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT role, content FROM messages WHERE userId = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows.reverse());
      }
    );
  });
}

module.exports = {
  saveMessage,
  getRecentMessages
};
