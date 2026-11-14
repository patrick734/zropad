import type { Metadata } from "next";
import Link from "next/link";
import { CHAIN_NAME, NATIVE } from "@/lib/config";
import { Contact, H, L, LegalPage, P } from "@/components/legal";

export const metadata: Metadata = { title: "Terms of Use" };

const N = "Zropad";
const TESTNET = /sepolia|testnet|anvil/i.test(CHAIN_NAME);

export default function Terms() {
  return (
    <LegalPage title="Terms of Use" other={{ href: "/privacy", label: "Privacy Policy" }}>
      <P>
        These terms cover your use of {N} (the website and its pages, the &ldquo;Site&rdquo;). By using the Site you agree to them. If you don&apos;t agree,
        don&apos;t use the Site.
      </P>

      <H>1. What {N} is</H>
      <P>
        {N} is a website that lets you use open smart contracts: launching coins, trading them on bonding curves and in their pools after graduation, staking
        $ZRPD, and taking part in each coin&apos;s countdown jackpot. The contracts run on the blockchain on their own; the Site is one way to reach them.
        {N} is community-built and is not affiliated with LayerZero Labs.
      </P>
      <P>
        {N} never holds your funds or your keys. Every transaction is signed by your wallet and sent to the blockchain. Once confirmed, a transaction can&apos;t
        be reversed by us or anyone else.
      </P>
      {TESTNET && <P>The Site currently runs on a test network ({CHAIN_NAME}). Test {NATIVE} and coins launched on a test network have no value.</P>}

      <H>2. Who can use it</H>
      <L
        items={[
          "You must be at least 18 years old and able to enter into a binding agreement.",
          "You must not be on a sanctions list, or in a country or region under comprehensive sanctions, or acting for someone who is.",
          "You are responsible for following the laws that apply to you, including any rules on trading digital assets and on taxes.",
        ]}
      />

      <H>3. Your wallet</H>
      <P>
        You control your wallet and its keys. We can&apos;t see, recover or reset them. Keep your keys safe: anyone with them can act as you.
      </P>

      <H>4. Coins and content made by users</H>
      <P>
        Anyone can launch a coin on {N}. Coins, names, tickers, images, descriptions and links are created by users, not by us. We don&apos;t issue, vet,
        endorse or guarantee any of them. A coin listed on the Site is not a recommendation.
      </P>
      <P>
        When you post anything, you confirm you have the right to post it and that it doesn&apos;t break the law or anyone&apos;s rights. You keep ownership of
        what you post, and you let us display it on the Site.
      </P>
      <P>
        Coin names and tickers are recorded on the blockchain, where they are public and permanent. We can hide coins, images and descriptions from the Site at
        our discretion, for example for impersonation, illegal content or abuse, but we can&apos;t remove anything from the blockchain.
      </P>

      <H>5. Fees</H>
      <P>
        Trades and launches pay the fees set in the contracts and described on <Link href="/docs" className="text-primary hover:underline">How it works</Link>:
        a launch fee, Zropad&apos;s 1% on every trade, any creator fee the coin&apos;s creator chose, the sniper tax on buys in the first 2 seconds after a
        launch, and network gas. Fees are taken by the contracts automatically when a transaction runs.
      </P>

      <H>6. Jackpots</H>
      <P>
        Each coin&apos;s jackpot is run by the contracts: the last qualifying buyer when the countdown ends is credited the prize, which they can claim. The
        countdown follows block times on the blockchain, which can differ slightly from the clock shown on the Site. We don&apos;t decide winners and can&apos;t
        change results.
      </P>

      <H>7. Things you must not do</H>
      <L
        items={[
          "Manipulate markets, including wash trading, spoofing, or coordinated schemes to mislead other traders.",
          "Impersonate any person, project or brand, or launch coins that pretend to be official tokens of someone else.",
          "Post illegal content, content that infringes others' rights, or content that sexualises minors.",
          "Use the Site for fraud, money laundering, sanctions evasion or any other illegal purpose.",
          "Attack, overload, scrape at harmful volume, or exploit bugs in the Site or its servers.",
        ]}
      />
      <P>We can limit or block access to the Site for anyone who breaks these terms.</P>

      <H>8. No advice</H>
      <P>
        Nothing on the Site is financial, investment, legal or tax advice. Prices, market caps, profits, points and other figures are calculated from on-chain
        data and may be delayed or wrong. Points are a record of activity on the Site and are not a promise of any token or reward. Your trading decisions are
        your own.
      </P>

      <H>9. The Site is provided as it is</H>
      <P>
        The Site and the contracts are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, express or implied, including
        fitness for a particular purpose and non-infringement. We don&apos;t promise the Site will always be available, error-free or secure, or that third-party
        services it relies on (the blockchain network, its nodes, wallets) will work as expected.
      </P>

      <H>10. Limits on our liability</H>
      <P>
        To the fullest extent the law allows, the people who build and run {N} are not liable for any indirect, incidental, special, consequential or punitive
        damages, or for lost profits, lost data, or the value of digital assets, arising from your use of the Site, the contracts, or third-party services. Where
        liability can&apos;t be excluded, it is limited to the greater of the fees you paid to {N} in the 12 months before the claim and 100 US dollars.
      </P>

      <H>11. Indemnity</H>
      <P>
        You agree to cover us against claims, losses and costs (including reasonable legal fees) caused by your breach of these terms, your content, or your
        misuse of the Site.
      </P>

      <H>12. Changes</H>
      <P>
        We may update these terms. The date at the top shows the latest version; continuing to use the Site after a change means you accept it. We may also
        change or stop any part of the Site at any time.
      </P>

      <H>13. Contact</H>
      <Contact />
    </LegalPage>
  );
}
