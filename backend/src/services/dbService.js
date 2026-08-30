const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;

async function initDB() {
  const SQL = await initSqlJs();
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/skylark.db');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS monday_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      access_token TEXT NOT NULL,
      token_type TEXT DEFAULT 'Bearer',
      scope TEXT,
      workspace_name TEXT,
      deals_board_id TEXT,
      work_orders_board_id TEXT,
      connected_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  saveDB();
  console.log('Database initialized');
}

function saveDB() {
  if (!db) return;
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/skylark.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function run(sql, params = []) {
  const d = getDB();
  d.run(sql, params);
  saveDB();
}

function get(sql, params = []) {
  const d = getDB();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const d = getDB();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

module.exports = { initDB, run, get, all, saveDB };
