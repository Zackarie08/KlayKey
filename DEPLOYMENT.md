# KlayKey deployment

Repository: https://github.com/Zackarie08/KlayKey
Branch: `main`
Live URL: pending successful deployment verification.

## Isolated Railway resources

The owner confirmed that the authorized workspace is **Sean Kurt P. Corpuz's Projects** and the existing project is **asset_management** (the dashboard names differ from the initial brief).

- Project: `4d423675-8173-4636-b28d-c8e3c7ce6516`
- Production environment: `7af68793-6923-4028-974d-af594a6cafdc`
- New app `klaykey-web`: `663ec9c3-2e94-4441-bbb7-85d54c03d517`
- New database `klaykey-mysql`: `a7298601-70b7-4cd7-819e-c561c7e00b7b`

The app serves the frontend, API, GLBs, embedded textures, original synthesized audio engine and Three.js modules on one HTTPS origin. MySQL uses a persistent volume at `/var/lib/mysql` and private networking. No public database TCP proxy is needed. No pre-existing service may be modified or used as a database. Do not use project-wide shared variables or accept unrelated staged changes. The protected service ID record is local and intentionally excluded from Git.

## Variables and startup

Configure only the new app: `NODE_ENV`, `APP_NAME`, `DATABASE_URL`, `SESSION_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE`, `TRUST_PROXY`, `SEED_ON_START`. `.env.example` describes local defaults without secrets. Generate a unique cryptographically random session secret. Use a Railway service reference from `DATABASE_URL` to the dedicated database's `MYSQL_URL`; do not paste credentials into code. `TRUST_PROXY=1` trusts the Railway reverse proxy. Production cookies are Secure, HTTP-only and SameSite=Lax. Sessions persist in MySQL for the configured lifetime and expired records are removed every 15 minutes and at startup.

`npm start` applies ordered migrations from `server/database/migrations`, tracked by filename and checksum in `schema_migrations`. A database advisory lock serializes concurrent startups. Guarded DDL permits retry after partial MySQL DDL failure. Never edit an already-applied migration; add a new numbered file. Seeds insert missing stable slugs/SKUs without resetting existing inventory, prices or customer records. Seeding creates no account. Startup stops if migration fails.

The existing schema stores addresses, image lists and compatibility in JSON columns; inventory is in products and custom build components in snapshots. Prices are exact integer centavos. These are deliberate equivalents of normalized auxiliary tables. Checkout uses row locks and immutable order snapshots.

## Releases and operation

Only connect `klaykey-web` to `Zackarie08/KlayKey`, branch `main`. Once connected, future pushes to main trigger a build using the repository Dockerfile and railway.json. Check the deployment reaches `SUCCESS`, then verify `/api/health` and `/api/health/ready`. Inspect logs only on the new app or new database. Never redeploy other services during troubleshooting.

The Docker image installs with `npm ci --omit=dev`, includes Three.js and all runtime model/configuration assets, runs as the Node user and contains no Blender installation or `.blend` files. Local development remains separate: follow START_HERE.md or double-click start-site.bat. Never run the local integration suite against the live database; it deliberately requires a development database ending in `_dev`.

To rename the visible brand, change `APP_NAME` on the new app and redeploy it. To rename the GitHub repository later, use that repository's Settings, update the local origin URL and explicitly reconnect only the new Railway app to the new owner/name. Renaming the repository does not rename the app or database.

## Verification and limits

Production deployment verification is pending. Local commerce and production-proxy tests pass. Password recovery, email, an admin dashboard and real payments remain outside scope. All payment choices are simulations; no card number, CVV, OTP or payment-provider password is collected. Contact messages persist in the application database. Configure a backup/retention policy before using this as a real store. No open-source license has been added. Existing assets are original generated models and synthesized sounds; installed dependencies carry their respective licenses.
