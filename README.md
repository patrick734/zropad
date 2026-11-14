# Zropad

The launchpad for Zero. Launch a coin in one transaction, trade it on a bonding curve, and it
graduates into a pool with its liquidity locked for good. Creators set their own fee; everyone
plays the countdown jackpot.


## How it works

| | |
|---|---|
| Supply | 1,000,000,000 per coin, minted once to its market. No owner, no mint, no blacklist, no tax in the token. |
| Launch | One transaction: the coin, its market, and (optionally) the creator's first buy. Launch fee 0.0005. |
| Curve | Constant product with virtual reserves. 800M coins sell on the curve; it graduates at about 4.2 native raised. |
| Graduation | The native raised and the other 200M coins become a pool at the same price. No LP tokens, no way to remove liquidity. |
| Protocol fee | 1% of every buy and sell: 0.5% treasury, 0.3% $ZRPD stakers, 0.2% the coin's jackpot. |
| Creator fee | Chosen at launch, 0 to 50% of every trade, fixed for good, paid in the native coin. |
| Sniper tax | 99% for the first 2 seconds after launch; the extra goes to the coin's jackpot. The creator's launch buy is exempt. |
| Jackpot | Each coin has a pot and a countdown (1 hour to start). Every buy of 0.005+ makes you the last buyer and adds 30 s (max 24 h). When it hits zero, the last buyer wins 90%; 10% seeds the next round. |
| Selling | No approval needed: the market takes the coins from your own balance. |
| $ZRPD | 1,000,000,000. Stake it to earn 0.3% of all trading volume, in the native coin. |

## Contracts (`contracts/`)

| | |
|---|---|
| `Zropad.sol` | The hub: launches, fee routing, jackpots, claims. |
| `ZropadMarket.sol` | One per coin: the curve, then the locked pool. |
| `ZropadToken.sol` | The coin (ERC-20). |
| `ZRPD.sol`, `ZropadStaking.sol` | The platform token and its staking. |

```bash
cd contracts
npm install
forge test
```

Deploy (any EVM chain; Base Sepolia until Zero opens):

```bash
OWNER=0x... TREASURY=0x... forge script script/Deploy.s.sol --rpc-url <rpc> --account <keystore> --broadcast
```

## Site (`web/`)

Next.js app plus an indexer that reads the chain into SQLite.

```bash
cd web
npm install
cp .env.example .env.local
npm run build && npm start
npm run indexer
```

Set the chain and contract addresses in `.env.local` (`NEXT_PUBLIC_*` values are built into the site, so rebuild after changing them). Run `npm start` and `npm run indexer` side by side, e.g. with pm2.
