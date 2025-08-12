const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Define path for your database file
const isPkg = typeof process.pkg !== 'undefined';
const dbPath = isPkg
  ? path.join(process.cwd(), 'db', 'cstar.db')
  : path.join(__dirname, '..', 'db', 'cstar.db');

// Ensure the folder exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new sqlite3.Database(dbPath);

// Create context and log tables
db.serialize(() => {
	db.run(`CREATE TABLE IF NOT EXISTS user_context (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		chat_id TEXT NOT NULL,
		role TEXT NOT NULL,
		message TEXT NOT NULL,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
	)`);

	db.run(`CREATE TABLE IF NOT EXISTS service_usage (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		start_time DATETIME,
		end_time DATETIME,
		txtCount INTEGER,
		gptCount INTEGER,
		imgCount INTEGER,
		vidCount INTEGER,
		wikiCount INTEGER,
		dalleCount INTEGER,
		menuCount INTEGER,
		infoCount INTEGER,
		boxCount INTEGER,
		pingCount INTEGER,
		invalidCount INTEGER
	)`);

	db.run(`CREATE INDEX IF NOT EXISTS idx_user_context_chat_time ON user_context (chat_id, timestamp DESC)`);
	
	db.run(`CREATE TABLE IF NOT EXISTS rate_limits (
	chat_id TEXT PRIMARY KEY,
	last_reset DATETIME DEFAULT CURRENT_TIMESTAMP,
	request_count INTEGER DEFAULT 0
)`);

});
