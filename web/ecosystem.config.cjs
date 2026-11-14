/**
 * pm2 settings for the website and the indexer:
 *
 *   pm2 start ecosystem.config.cjs && pm2 save
 *
 * pm2 starts node itself (not through npm), so stop and restart reach the processes.
 * Both read .env.local. The site listens on 127.0.0.1:3100, behind Caddy for HTTPS.
 */
module.exports = {
  apps: [
    {
      name: "zropad-web",
      cwd: __dirname,
      script: "node",
      args: "node_modules/next/dist/bin/next start -p 3100 -H 127.0.0.1",
      interpreter: "none",
      env: { NODE_ENV: "production" },
      max_memory_restart: "1G",
      restart_delay: 3000,
      autorestart: true,
    },
    {
      name: "zropad-indexer",
      cwd: __dirname,
      script: "node",
      args: "--import tsx scripts/indexer.ts",
      interpreter: "none",
      restart_delay: 3000,
      autorestart: true,
    },
  ],
};
