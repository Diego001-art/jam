/**
 * База бэкенда (SQLite, встроенный node:sqlite — без нативных зависимостей).
 * Здесь живёт всё приватное: сети, программы, ссылки, вознаграждение, клики, конверсии.
 * Персональных данных посетителей не храним: ни IP, ни user-agent.
 */
import { DatabaseSync } from "node:sqlite";

export type Db = DatabaseSync;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS networks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('direct','cpa')),
  website TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  notes TEXT
);
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  network_id TEXT NOT NULL REFERENCES networks(id),
  name TEXT NOT NULL,
  notes TEXT
);
-- id оффера совпадает с id в data/offers.json репозитория
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  program_id TEXT REFERENCES programs(id),
  tracking_url TEXT,           -- партнёрская ссылка; {click_id} подставляется при переходе
  fallback_url TEXT,           -- официальная страница продукта, если оффер отключён
  payout_type TEXT CHECK (payout_type IN ('cpa','revshare')),
  payout_amount REAL,
  payout_currency TEXT NOT NULL DEFAULT 'RUB',
  payout_conditions TEXT,
  status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('active','paused','archived')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS clicks (
  click_id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  source_path TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT
);
CREATE INDEX IF NOT EXISTS clicks_offer_ts ON clicks(offer_id, ts);
CREATE TABLE IF NOT EXISTS conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  click_id TEXT REFERENCES clicks(click_id),
  offer_id TEXT,
  network_id TEXT,
  external_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','paid')),
  amount REAL,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (network_id, external_id)
);
`;

export function openDb(file: string): Db {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}
