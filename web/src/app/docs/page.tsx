import { GRADUATION, NATIVE } from "@/lib/config";

export const metadata = { title: "How it works · Zropad" };

const SECTIONS: [string, string[]][] = [
  ["Launching", [
    "Pick a name, ticker, image and your creator fee, then launch. One transaction creates the coin, its market, and your first buy if you want one.",
    "Every coin has 1,000,000,000 supply, all in its market from the start. No presale, no team allocation, no mint after launch.",
    "Your first buy happens in the launch transaction itself, before anyone else can buy, and isn't charged the sniper tax.",
  ]],
  ["The bonding curve", [
    `800M coins are sold on a curve: the price rises with every buy and falls with every sell.`,
    `When ${GRADUATION} ${NATIVE} has been raised, the coin graduates. The remaining 200M coins and everything raised go into a pool that opens at the curve's final price.`,
    "The pool's liquidity is locked for good. There are no LP tokens and no function to withdraw it, so nobody, including Zropad, can pull it.",
  ]],
  ["Fees", [
    "Every buy and sell pays 1% to Zropad, plus the creator fee the creator chose at launch: anything from 0% to 50%. It's fixed for good and shown before every trade.",
    `Creator fees are paid in ${NATIVE} and can be claimed any time from "My coins & rewards".`,
    "Zropad's 1% is split: 50% to the treasury, 30% to $ZRPD stakers, 20% to the coin's jackpot.",
  ]],
  ["Sniper tax", [
    "For the first 2 seconds after a launch, buys pay a 99% tax. Bots that buy in the launch block get almost nothing; the tax goes into the coin's jackpot for real traders.",
  ]],
  ["Countdown jackpot", [
    "Every coin has a jackpot with a countdown. It starts at 1 hour.",
    `Each buy of 0.005 ${NATIVE} or more makes you the last buyer and adds 30 seconds, up to 24 hours on the clock.`,
    "When the countdown hits zero, the last buyer wins 90% of the pot. 10% seeds the next round, and a new countdown starts.",
    "The pot grows from 20% of Zropad's fee on every trade, plus all sniper tax.",
  ]],
  ["King of the Hill", ["The live coin closest to graduating sits on the throne at the top of the home page until another coin passes it."]],
  ["Early buyers & points", [
    "The first 50 different wallets to buy a coin after the sniper window are its early buyers, marked EARLY in the trades list.",
    "Early buyers earn double points on those buys, and 100 bonus points if the coin graduates. See the Points page for everything that earns points.",
  ]],
  ["$ZRPD", ["Stake $ZRPD to earn 30% of Zropad's trading fee, paid in " + NATIVE + " on every trade. No lockup."]],
];

export default function Docs() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <h1 className="text-2xl font-semibold">How Zropad works</h1>
      {SECTIONS.map(([title, body]) => (
        <section key={title} className="panel p-4">
          <h2 className="mb-2 font-semibold text-primary">{title}</h2>
          <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-muted-foreground marker:text-primary/60">
            {body.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="pt-2 text-center text-xs text-muted-foreground">Community-built on Zero. Not affiliated with LayerZero Labs.</p>
    </div>
  );
}
