/** Keeps the site's database in step with the chain: npm run indexer (reads .env / .env.local). */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const IDLE_MS = Number(process.env.INDEX_IDLE_MS ?? 1000);

async function main() {
  const { syncOnce } = await import("../src/lib/indexer");
  console.log("zropad indexer: starting");
  for (;;) {
    try {
      const behind = await syncOnce();
      if (behind > 0) continue;
    } catch (e) {
      console.error("sync failed:", (e as Error).message);
      await new Promise((r) => setTimeout(r, 3000));
    }
    await new Promise((r) => setTimeout(r, IDLE_MS));
  }
}
main();
