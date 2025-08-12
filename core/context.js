// === core/context.js ===
const db = require('../db/sqlite');
const config = require('../config');

function getContext(user, callback) {
  db.get('SELECT messages FROM context WHERE user = ?', [user], (err, row) => {
    if (err) return callback(err);
    let messages = row ? JSON.parse(row.messages) : [];
    callback(null, messages);
  });
}

function saveContext(user, messages, callback) {
  messages = messages.slice(-config.maxContextMessages);
  const json = JSON.stringify(messages);
  db.run(
    'INSERT INTO context (user, messages) VALUES (?, ?) ON CONFLICT(user) DO UPDATE SET messages = excluded.messages, last_updated = CURRENT_TIMESTAMP',
    [user, json],
    callback
  );
}

module.exports = { getContext, saveContext };
