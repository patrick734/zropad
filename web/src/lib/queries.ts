import { getDb } from "./db";
import { GRADUATION, SUPPLY } from "./config";

/** Read-only queries the pages and API use. All amounts in native units (numbers). */

export type Coin = {
  address: string; market: string; creator: string; id: number; name: string; symbol: string; uri: string;
  creator_fee_bps: number; created_at: number; created_tx: string; graduated: number; graduated_at: number | null;
  price: number; mcap: number; raised: number; volume: number; trades: number; last_trade_at: number | null;
  image: string | null; description: string | null; website: string | null; twitter: string | null; telegram: string | null;
  progress: number; volume24h: number; change24h: number | null; holders: number;
  jackpot_pot: number | null; jackpot_deadline: number | null; jackpot_round: number | null; jackpot_last_buyer: string | null;
};

const COIN_SELECT = `
  SELECT c.*,
    CASE WHEN c.graduated = 1 THEN 1.0 ELSE MIN(1.0, c.raised / ${GRADUATION}) END AS progress,
    COALESCE((SELECT SUM(native) FROM trades t WHERE t.coin = c.address AND t.time > @since), 0) AS volume24h,
    (SELECT price FROM trades t WHERE t.coin = c.address AND t.time <= @since ORDER BY time DESC, log_index DESC LIMIT 1) AS price_then,
    (SELECT COUNT(*) FROM balances b WHERE b.coin = c.address AND b.holder <> c.market AND b.amount <> '0') AS holders,
    j.pot AS jackpot_pot, j.deadline AS jackpot_deadline, j.round AS jackpot_round, j.last_buyer AS jackpot_last_buyer
  FROM coins c LEFT JOIN jackpots j ON j.coin = c.address`;

type Row = Coin & { price_then: number | null };
const shape = (r: Row): Coin => {
  const { price_then, ...rest } = r;
  return { ...rest, change24h: price_then ? (r.price / price_then - 1) * 100 : null };
};

const now = () => Math.floor(Date.now() / 1000);

export type Sort = "trending" | "new" | "ignition" | "graduated" | "mcap" | "jackpot";

export function listCoins(sort: Sort = "trending", limit = 60, q = ""): Coin[] {
  const order: Record<Sort, string> = {
    trending: "volume24h DESC, last_trade_at DESC",
    new: "created_at DESC",
    ignition: "progress DESC, last_trade_at DESC",
    graduated: "graduated_at DESC",
    mcap: "mcap DESC",
    jackpot: "jackpot_pot DESC",
  };
  const where: string[] = [];
  if (sort === "ignition") where.push("c.graduated = 0");
  if (sort === "graduated") where.push("c.graduated = 1");
  if (q) where.push("(c.name LIKE @q OR c.symbol LIKE @q OR c.address = @qa)");
  const sql = `${COIN_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order[sort]} LIMIT @limit`;
  return (getDb().prepare(sql).all({ since: now() - 86400, limit, q: `%${q}%`, qa: q.toLowerCase() }) as Row[]).map(shape);
}

export function getCoin(address: string): Coin | null {
  const r = getDb().prepare(`${COIN_SELECT} WHERE c.address = @a`).get({ since: now() - 86400, a: address.toLowerCase() }) as Row | undefined;
  return r ? shape(r) : null;
}

/** The coin closest to graduating: the King of the Hill. */
export function kingOfTheHill(): Coin | null {
  return listCoins("ignition", 1)[0] ?? null;
}

export type Trade = { tx: string; coin: string; trader: string; is_buy: number; native: number; tokens: number; price: number; time: number; early: number; symbol?: string; name?: string; image?: string | null; sniper_tax: number };

export function coinTrades(address: string, limit = 100): Trade[] {
  return getDb().prepare("SELECT * FROM trades WHERE coin = ? ORDER BY time DESC, log_index DESC LIMIT ?").all(address.toLowerCase(), limit) as Trade[];
}

export function holders(address: string, limit = 50) {
  const db = getDb();
  const market = (db.prepare("SELECT market FROM coins WHERE address = ?").get(address.toLowerCase()) as { market: string } | undefined)?.market;
  const rows = db.prepare("SELECT holder, amount FROM balances WHERE coin = ? AND amount <> '0'").all(address.toLowerCase()) as { holder: string; amount: string }[];
  return rows
    .map((r) => ({ holder: r.holder, amount: Number(BigInt(r.amount) / 10n ** 12n) / 1e6, isMarket: r.holder === market }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((h) => ({ ...h, share: h.amount / SUPPLY }));
}

/** Price candles from trades. */
export function candles(address: string, interval = 60) {
  const rows = getDb().prepare("SELECT price, native, time FROM trades WHERE coin = ? ORDER BY time, log_index").all(address.toLowerCase()) as { price: number; native: number; time: number }[];
  const out: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
  let prev: number | null = null;
  for (const r of rows) {
    const t = Math.floor(r.time / interval) * interval;
    const last = out[out.length - 1];
    if (last && last.time === t) {
      last.high = Math.max(last.high, r.price);
      last.low = Math.min(last.low, r.price);
      last.close = r.price;
      last.volume += r.native;
    } else {
      const open = prev ?? r.price;
      out.push({ time: t, open, high: Math.max(open, r.price), low: Math.min(open, r.price), close: r.price, volume: r.native });
    }
    prev = r.price;
  }
  return out;
}

/** The live feed: latest trades, launches, graduations and jackpot wins across Zropad. */
export function feed(limit = 40) {
  const db = getDb();
  const trades = db.prepare(`SELECT 'trade' AS kind, t.tx, t.coin, t.trader AS who, t.is_buy, t.native, t.tokens, t.time, t.early, c.symbol, c.name, c.image
    FROM trades t JOIN coins c ON c.address = t.coin ORDER BY t.time DESC, t.log_index DESC LIMIT ?`).all(limit);
  const launches = db.prepare(`SELECT 'launch' AS kind, created_tx AS tx, address AS coin, creator AS who, created_at AS time, symbol, name, image FROM coins ORDER BY created_at DESC LIMIT 10`).all();
  const grads = db.prepare(`SELECT 'graduated' AS kind, g.tx, g.coin, g.time, c.symbol, c.name, c.image, c.raised AS native FROM graduations g JOIN coins c ON c.address = g.coin ORDER BY g.time DESC LIMIT 10`).all();
  const wins = db.prepare(`SELECT 'jackpot' AS kind, w.tx, w.coin, w.winner AS who, w.amount AS native, w.time, c.symbol, c.name, c.image FROM wins w JOIN coins c ON c.address = w.coin ORDER BY w.time DESC LIMIT 10`).all();
  return ([...trades, ...launches, ...grads, ...wins] as { time: number }[]).sort((a, b) => b.time - a.time).slice(0, limit);
}

export function stats() {
  const db = getDb();
  const since = now() - 86400;
  const one = (sql: string, ...p: unknown[]) => Object.values(db.prepare(sql).get(...p) as object)[0] as number;
  return {
    coins: one("SELECT COUNT(*) FROM coins"),
    graduated: one("SELECT COUNT(*) FROM coins WHERE graduated = 1"),
    live: one("SELECT COUNT(*) FROM coins WHERE graduated = 0"),
    volume24h: one("SELECT COALESCE(SUM(native), 0) FROM trades WHERE time > ?", since),
    creatorFees: one("SELECT COALESCE(SUM(creator_fee), 0) FROM trades"),
    jackpotsPaid: one("SELECT COALESCE(SUM(amount), 0) FROM wins"),
    jackpotsLive: one("SELECT COALESCE(SUM(pot), 0) FROM jackpots"),
    traders: one("SELECT COUNT(DISTINCT trader) FROM trades"),
  };
}

/**
 * Pre-launch points: 1,000 per native bought, x2 for a coin's first 50 buyers, 50 per launch,
 * 500 to a creator when their coin graduates, 100 to each early buyer of a coin that graduates,
 * 200 per jackpot won.
 */
export function points(limit = 100) {
  return getDb().prepare(`
    WITH p AS (
      SELECT trader AS who, SUM((native - sniper_tax) * 1000 * (CASE WHEN early = 1 THEN 2 ELSE 1 END)) AS pts FROM trades WHERE is_buy = 1 GROUP BY trader
      UNION ALL SELECT creator, COUNT(*) * 50 FROM coins GROUP BY creator
      UNION ALL SELECT creator, COUNT(*) * 500 FROM coins WHERE graduated = 1 GROUP BY creator
      UNION ALL SELECT t.trader, COUNT(DISTINCT t.coin) * 100 FROM trades t JOIN coins c ON c.address = t.coin WHERE t.early = 1 AND c.graduated = 1 GROUP BY t.trader
      UNION ALL SELECT winner, COUNT(*) * 200 FROM wins GROUP BY winner
    )
    SELECT who, ROUND(SUM(pts)) AS points FROM p GROUP BY who ORDER BY points DESC LIMIT ?`).all(limit) as { who: string; points: number }[];
}

export function wallet(address: string) {
  const a = address.toLowerCase();
  const db = getDb();
  return {
    created: db.prepare(`${COIN_SELECT} WHERE c.creator = @a ORDER BY c.created_at DESC`).all({ since: now() - 86400, a }).map((r) => shape(r as Row)),
    holdings: db.prepare(`SELECT b.coin, b.amount, c.symbol, c.name, c.image, c.price FROM balances b JOIN coins c ON c.address = b.coin WHERE b.holder = ? AND b.amount <> '0'`).all(a)
      .map((r) => {
        const x = r as { coin: string; amount: string; symbol: string; name: string; image: string | null; price: number };
        const amount = Number(BigInt(x.amount) / 10n ** 12n) / 1e6;
        return { ...x, amount, value: amount * x.price };
      }),
    wins: db.prepare("SELECT w.*, c.symbol FROM wins w JOIN coins c ON c.address = w.coin WHERE w.winner = ? ORDER BY w.time DESC").all(a),
  };
}
