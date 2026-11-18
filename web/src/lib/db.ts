import Database from "better-sqlite3";
import path from "node:path";

/** The site's own copy of the chain: coins, trades, holders, jackpots, metadata. SQLite, one file. */
const FILE = process.env.ZROPAD_DB ?? path.join(process.cwd(), "zropad.db");

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;
  db = new Database(FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS coins (
      address TEXT PRIMARY KEY, market TEXT NOT NULL UNIQUE, creator TEXT NOT NULL, id INTEGER NOT NULL,
      name TEXT NOT NULL, symbol TEXT NOT NULL, uri TEXT NOT NULL, creator_fee_bps INTEGER NOT NULL,
      created_block INTEGER NOT NULL, created_at INTEGER NOT NULL, created_tx TEXT NOT NULL,
      graduated INTEGER NOT NULL DEFAULT 0, graduated_at INTEGER,
      price REAL NOT NULL DEFAULT 0, mcap REAL NOT NULL DEFAULT 0, raised REAL NOT NULL DEFAULT 0,
      volume REAL NOT NULL DEFAULT 0, trades INTEGER NOT NULL DEFAULT 0, last_trade_at INTEGER,
      image TEXT, description TEXT, website TEXT, twitter TEXT, telegram TEXT
    );
    CREATE TABLE IF NOT EXISTS trades (
      tx TEXT NOT NULL, log_index INTEGER NOT NULL, coin TEXT NOT NULL, trader TEXT NOT NULL, is_buy INTEGER NOT NULL,
      native REAL NOT NULL, tokens REAL NOT NULL, protocol_fee REAL NOT NULL, creator_fee REAL NOT NULL, sniper_tax REAL NOT NULL,
      price REAL NOT NULL, block INTEGER NOT NULL, time INTEGER NOT NULL, early INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tx, log_index)
    );
    CREATE INDEX IF NOT EXISTS trades_coin_time ON trades (coin, time);
    CREATE INDEX IF NOT EXISTS trades_time ON trades (time);
    CREATE INDEX IF NOT EXISTS trades_trader ON trades (trader);
    CREATE TABLE IF NOT EXISTS balances (coin TEXT NOT NULL, holder TEXT NOT NULL, amount TEXT NOT NULL, PRIMARY KEY (coin, holder));
    CREATE TABLE IF NOT EXISTS jackpots (coin TEXT PRIMARY KEY, round INTEGER NOT NULL, pot REAL NOT NULL, deadline INTEGER NOT NULL, last_buyer TEXT);
    CREATE TABLE IF NOT EXISTS wins (tx TEXT NOT NULL, log_index INTEGER NOT NULL, coin TEXT NOT NULL, round INTEGER NOT NULL, winner TEXT NOT NULL, amount REAL NOT NULL, time INTEGER NOT NULL, PRIMARY KEY (tx, log_index));
    CREATE TABLE IF NOT EXISTS graduations (coin TEXT PRIMARY KEY, tx TEXT NOT NULL, time INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS meta (id TEXT PRIMARY KEY, json TEXT NOT NULL, image BLOB, mime TEXT, created_at INTEGER NOT NULL);
  `);
  // Added later: each coin's own graduation amount (its curve is fixed at launch).
  const cols = db.prepare("PRAGMA table_info(coins)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "graduation")) db.exec("ALTER TABLE coins ADD COLUMN graduation REAL");
  return db;
}

export const getState = (key: string) => (getDb().prepare("SELECT value FROM state WHERE key = ?").get(key) as { value: string } | undefined)?.value;
export const setState = (key: string, value: string) => getDb().prepare("INSERT INTO state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
