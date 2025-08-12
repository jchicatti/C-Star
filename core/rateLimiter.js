// === core/rateLimiter.js ===
const db = require('../db/sqlite');
const config = require('../config');

function checkRateLimit(user, callback) {
  const since = Date.now() - config.rateLimitPeriodMs;
  db.all(
    `SELECT COUNT(*) as count FROM logs WHERE user = ? AND timestamp > datetime(?, 'unixepoch')`,
    [user, Math.floor(since / 1000)],
    (err, rows) => {
      if (err) return callback(err);
      const count = rows[0].count;
      callback(null, count < config.maxMessagesPerPeriod);
    }
  );
}

module.exports = { checkRateLimit };