import type { Metadata } from "next";
import { Contact, H, L, LegalPage, P } from "@/components/legal";

export const metadata: Metadata = { title: "Privacy Policy" };

const N = "Elypad";

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" other={{ href: "/terms", label: "Terms of Use" }}>
      <P>
        This policy explains what information {N} handles and why. In short: there are no {N} accounts, no advertising, and no tracking cookies. Most of what
        the Site shows is public blockchain data.
      </P>

      <H>1. Public blockchain data</H>
      <P>
        When you use {N}, your wallet address and what it does (launches, trades, transfers, stakes, jackpot wins and claims) are recorded on the blockchain.
        That data is public and permanent, and anyone can read it. The Site keeps a copy of it in its database so pages load quickly.
      </P>

      <H>2. What you upload</H>
      <P>
        When you launch a coin, the image, description and links you add are stored on the Site&apos;s server so the coin can show them, and are public. We
        can hide them from the Site, for example for abuse or illegal content.
      </P>

      <H>3. Connecting a wallet</H>
      <P>
        You connect with your own wallet app. The Site sees your wallet address and the transactions you ask your wallet to sign. Your wallet app handles them
        under its own privacy policy. We never see your keys.
      </P>

      <H>4. Stored in your browser</H>
      <P>The Site keeps a few things in your browser&apos;s local storage, on your device only:</P>
      <L
        items={[
          "Settings and preferences: sidebar width, table or grid view, and whether sounds are on.",
          "Whether you've seen the welcome screen.",
          "Your wallet connection, so you stay connected between visits.",
        ]}
      />
      <P>Clearing your browser&apos;s site data removes all of it.</P>

      <H>5. Server logs</H>
      <P>
        Like any website, the Site&apos;s server receives your IP address, browser type and the pages you request, and keeps short-lived logs to run the Site,
        stop abuse and fix problems. The Site uses your IP address in memory to rate-limit uploads.
      </P>

      <H>6. Services we use</H>
      <L
        items={[
          "Our server host: runs the Site and its database, a copy of public blockchain data.",
          "The blockchain network's public nodes: the Site and your wallet read from and send transactions to them.",
          "Your wallet app: it handles the transactions you sign, under its own privacy policy.",
          "WalletConnect, if you choose it to connect a mobile wallet.",
        ]}
      />
      <P>We don&apos;t sell your information or share it for advertising.</P>

      <H>7. Your choices</H>
      <L
        items={[
          "You can browse the Site without connecting a wallet.",
          "You can clear your browser storage at any time.",
          "You can ask us to hide a coin's image or description you uploaded. On-chain records stay on the blockchain.",
          "Depending on where you live, you may have rights to access or delete personal information we hold. We hold almost none beyond public blockchain data and what you chose to upload.",
        ]}
      />

      <H>8. Age</H>
      <P>The Site is for people 18 and over. We don&apos;t knowingly collect information from anyone younger.</P>

      <H>9. Changes</H>
      <P>We may update this policy. The date at the top shows the latest version.</P>

      <H>10. Contact</H>
      <Contact />
    </LegalPage>
  );
}
