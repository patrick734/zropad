import { createPublicClient, formatEther, http, parseEventLogs, type Address, type Log } from "viem";
import { chain, RPC_URL, ZROPAD, SUPPLY, EARLY_BUYERS } from "./config";
import { coinAbi, hubAbi, marketAbi } from "./abi";
import { getDb, getState, setState } from "./db";

/**
 * Reads the chain into the site's database: launches, trades, graduations, holders and jackpots.
 * Call syncOnce() in a loop (scripts/indexer.ts does).
 */
export const client = createPublicClient({ chain, transport: http(RPC_URL, { batch: true, retryCount: 3 }) });

const RANGE = BigInt(process.env.INDEX_RANGE ?? 2000);
const SNIPER_WINDOW = 2;
const lower = (a: string) => a.toLowerCase();
const num = (v: bigint) => Number(formatEther(v));

type Parsed = Log & { eventName: string; args: Record<string, unknown> };

async function logsFor(addresses: Address[], abi: typeof hubAbi | typeof marketAbi | typeof coinAbi, fromBlock: bigint, toBlock: bigint) {
  const out: Parsed[] = [];
  for (let i = 0; i < addresses.length; i += 200) {
    const raw = await client.getLogs({ address: addresses.slice(i, i + 200), fromBlock, toBlock });
    out.push(...(parseEventLogs({ abi, logs: raw, strict: false }) as unknown as Parsed[]));
  }
  return out;
}

/** Fills in a coin's image, description and links from metadata uploaded through the site. */
function metaFor(uri: string) {
  const m = uri.match(/\/api\/meta\/([0-9a-f]{64})/);
  if (!m) return null;
  const row = getDb().prepare("SELECT json FROM meta WHERE id = ?").get(m[1]) as { json: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.json) as { image?: string; description?: string; website?: string; twitter?: string; telegram?: string };
  } catch {
    return null;
  }
}

/** Processes the next range of blocks. Returns how far behind the chain head it still is. */
export async function syncOnce(): Promise<number> {
  if (!ZROPAD) throw new Error("NEXT_PUBLIC_ZROPAD isn't set");
  const db = getDb();
  const head = await client.getBlockNumber();
  const last = getState("block");
  const from = last ? BigInt(last) + 1n : BigInt(process.env.START_BLOCK ?? 0);
  if (from > head) return 0;
  const to = from + RANGE - 1n < head ? from + RANGE - 1n : head;

  // 1. Launches (and jackpot events) from the hub, so this range's new markets are known.
  const hubLogs = await logsFor([ZROPAD], hubAbi, from, to);
  const times = new Map<bigint, number>();
  const timeOf = async (b: bigint) => {
    if (!times.has(b)) times.set(b, Number((await client.getBlock({ blockNumber: b })).timestamp));
    return times.get(b)!;
  };
  const insertCoin = db.prepare(`INSERT OR IGNORE INTO coins (address, market, creator, id, name, symbol, uri, creator_fee_bps, created_block, created_at, created_tx, image, description, website, twitter, telegram)
    VALUES (@address, @market, @creator, @id, @name, @symbol, @uri, @fee, @block, @time, @tx, @image, @description, @website, @twitter, @telegram)`);
  for (const l of hubLogs.filter((l) => l.eventName === "Launched")) {
    const a = l.args as { coin: Address; market: Address; creator: Address; id: bigint; name: string; symbol: string; uri: string; creatorFeeBps: number };
    const meta = metaFor(a.uri);
    insertCoin.run({
      address: lower(a.coin), market: lower(a.market), creator: lower(a.creator), id: Number(a.id), name: a.name, symbol: a.symbol, uri: a.uri,
      fee: Number(a.creatorFeeBps), block: Number(l.blockNumber), time: await timeOf(l.blockNumber!), tx: l.transactionHash,
      image: meta?.image ?? null, description: meta?.description ?? null, website: meta?.website ?? null, twitter: meta?.twitter ?? null, telegram: meta?.telegram ?? null,
    });
  }

  // 2. Trades and graduations from every market, and transfers of every coin.
  const coins = db.prepare("SELECT address, market, created_at FROM coins").all() as { address: string; market: string; created_at: number }[];
  const coinOfMarket = new Map(coins.map((c) => [c.market, c]));
  const marketLogs = coins.length ? await logsFor(coins.map((c) => c.market as Address), marketAbi, from, to) : [];
  const transferLogs = coins.length ? (await logsFor(coins.map((c) => c.address as Address), coinAbi, from, to)).filter((l) => l.eventName === "Transfer") : [];
  for (const l of [...marketLogs, ...hubLogs]) if (l.blockNumber != null) await timeOf(l.blockNumber);

  const touched = new Set<string>();
  const insertTrade = db.prepare(`INSERT OR IGNORE INTO trades (tx, log_index, coin, trader, is_buy, native, tokens, protocol_fee, creator_fee, sniper_tax, price, block, time, early)
    VALUES (@tx, @li, @coin, @trader, @buy, @native, @tokens, @pf, @cf, @st, @price, @block, @time, @early)`);
  const earlyCount = db.prepare("SELECT COUNT(*) AS n, SUM(trader = ?) AS mine FROM trades WHERE coin = ? AND early = 1");
  const bumpCoin = db.prepare("UPDATE coins SET price = ?, mcap = ?, volume = volume + ?, trades = trades + 1, last_trade_at = ? WHERE address = ?");
  const balance = db.prepare("SELECT amount FROM balances WHERE coin = ? AND holder = ?");
  const setBalance = db.prepare("INSERT INTO balances (coin, holder, amount) VALUES (?, ?, ?) ON CONFLICT(coin, holder) DO UPDATE SET amount = excluded.amount");
  const insertWin = db.prepare("INSERT OR IGNORE INTO wins (tx, log_index, coin, round, winner, amount, time) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const graduate = db.prepare("UPDATE coins SET graduated = 1, graduated_at = ? WHERE address = ?");
  const insertGrad = db.prepare("INSERT OR IGNORE INTO graduations (coin, tx, time) VALUES (?, ?, ?)");

  const ordered = [...marketLogs, ...transferLogs, ...hubLogs].sort((a, b) =>
    a.blockNumber === b.blockNumber ? (a.logIndex ?? 0) - (b.logIndex ?? 0) : Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n)),
  );
  db.transaction(() => {
    for (const l of ordered) {
      const time = times.get(l.blockNumber!) ?? 0;
      const where = lower(l.address);
      if (l.eventName === "Trade") {
        const coin = coinOfMarket.get(where);
        if (!coin) continue;
        const a = l.args as { trader: Address; isBuy: boolean; nativeAmount: bigint; tokenAmount: bigint; protocolFee: bigint; creatorFee: bigint; sniperTax: bigint; priceNative: bigint; priceToken: bigint };
        const price = a.priceToken > 0n ? Number((a.priceNative * 10n ** 18n) / a.priceToken) / 1e18 : 0;
        const trader = lower(a.trader);
        // The first EARLY_BUYERS different wallets to buy after the sniper window are early buyers.
        let early = 0;
        if (a.isBuy && time >= coin.created_at + SNIPER_WINDOW) {
          const c = earlyCount.get(trader, coin.address) as { n: number; mine: number | null };
          if (!c.mine && c.n < EARLY_BUYERS) early = 1;
        }
        const r = insertTrade.run({
          tx: l.transactionHash, li: l.logIndex, coin: coin.address, trader, buy: a.isBuy ? 1 : 0, native: num(a.nativeAmount), tokens: num(a.tokenAmount),
          pf: num(a.protocolFee), cf: num(a.creatorFee), st: num(a.sniperTax), price, block: Number(l.blockNumber), time, early,
        });
        if (r.changes) bumpCoin.run(price, price * SUPPLY, num(a.nativeAmount), time, coin.address);
        touched.add(coin.address);
      } else if (l.eventName === "Graduated") {
        const coin = coinOfMarket.get(where);
        if (!coin) continue;
        graduate.run(time, coin.address);
        insertGrad.run(coin.address, l.transactionHash, time);
        touched.add(coin.address);
      } else if (l.eventName === "Transfer") {
        const a = l.args as { from: Address; to: Address; value: bigint };
        for (const [holder, delta] of [[lower(a.from), -a.value], [lower(a.to), a.value]] as const) {
          if (holder === "0x0000000000000000000000000000000000000000") continue;
          const cur = BigInt((balance.get(where, holder) as { amount: string } | undefined)?.amount ?? "0");
          setBalance.run(where, holder, (cur + delta).toString());
        }
      } else if (l.eventName === "JackpotWon") {
        const a = l.args as { coin: Address; round: number; winner: Address; amount: bigint };
        insertWin.run(l.transactionHash, l.logIndex, lower(a.coin), Number(a.round), lower(a.winner), num(a.amount), time);
        touched.add(lower(a.coin));
      } else if (l.eventName === "JackpotBuy") {
        touched.add(lower((l.args as { coin: Address }).coin));
      }
    }
  })();

  // 3. Live state for the coins that moved: progress and the jackpot.
  const setRaised = db.prepare("UPDATE coins SET raised = ?, graduated = ? WHERE address = ?");
  const setJackpot = db.prepare(`INSERT INTO jackpots (coin, round, pot, deadline, last_buyer) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(coin) DO UPDATE SET round = excluded.round, pot = excluded.pot, deadline = excluded.deadline, last_buyer = excluded.last_buyer`);
  for (const coin of touched) {
    const market = coins.find((c) => c.address === coin)?.market as Address | undefined;
    if (!market) continue;
    const [graduated, realNative, reserveNative, jackpot] = await Promise.all([
      client.readContract({ address: market, abi: marketAbi, functionName: "graduated" }),
      client.readContract({ address: market, abi: marketAbi, functionName: "realNative" }),
      client.readContract({ address: market, abi: marketAbi, functionName: "reserveNative" }),
      client.readContract({ address: ZROPAD, abi: hubAbi, functionName: "jackpotOf", args: [coin as Address] }),
    ]);
    setRaised.run(num(graduated ? reserveNative : realNative), graduated ? 1 : 0, coin);
    const [pot, deadline, round, lastBuyer] = jackpot as readonly [bigint, bigint, bigint, Address, boolean];
    setJackpot.run(coin, Number(round), num(pot), Number(deadline), lastBuyer === "0x0000000000000000000000000000000000000000" ? null : lower(lastBuyer));
  }
  // Jackpots that started with a launch but haven't been touched yet.
  for (const l of hubLogs.filter((l) => l.eventName === "Launched")) {
    const coin = lower((l.args as { coin: Address }).coin);
    if (touched.has(coin)) continue;
    const [pot, deadline, round] = (await client.readContract({ address: ZROPAD, abi: hubAbi, functionName: "jackpotOf", args: [coin as Address] })) as readonly [bigint, bigint, bigint, Address, boolean];
    setJackpot.run(coin, Number(round), num(pot), Number(deadline), null);
  }

  setState("block", to.toString());
  return Number(head - to);
}
