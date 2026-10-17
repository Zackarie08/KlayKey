# KlayKey deployment

Repository: https://github.com/Zackarie08/KlayKey
Branch: `main`
Live URL: https://klaykey-web-production.up.railway.app

## Isolated Railway resources

Deployment uses two dedicated services in the owner's confirmed Railway project and production environment: klaykey-web for the application and klaykey-mysql for its database. The operator's private deployment record identifies the exact resources.

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

Verified on 17 October 2026: both dedicated services reached terminal SUCCESS; the public HTTPS site, /api/health and /api/health/ready responded successfully. The initial release applied migration 001_store.sql and seeded 20 catalog products without creating customer accounts. Subsequent starts preserve existing inventory, prices and customer data.

Live smoke tests passed registration, duplicate-account handling, login/logout, secure session cookies, protected routes, CSRF rejection, catalog filtering, trusted cart pricing, saved builds, simulated checkout, order history and cross-customer build/order isolation. The deployed browser asset checks passed **273/273**, including keyboard interaction and synthesized audio state, with no captured console warnings or errors. All three GLBs loaded with the expected binary content type and validated with zero errors and warnings. Local checks passed 14 commerce/production tests and 9 asset tests. See VALIDATION.md for scope and limits.

Only the two new services were configured by this workflow. A final read-only listing matched all pre-existing service names and IDs; no operation changed their configuration, variables, domains or deployment. No unrelated project was changed. The dedicated MySQL service has no public TCP proxy.
Password recovery, email, an admin dashboard and real payments remain outside scope. All payment choices are simulations; no card number, CVV, OTP or payment-provider password is collected. Contact messages persist in the application database. Configure a backup/retention policy before using this as a real store. No open-source license has been added. Existing assets are original generated models and synthesized sounds; installed dependencies carry their respective licenses.
